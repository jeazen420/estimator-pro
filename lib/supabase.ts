import { createClient } from '@supabase/supabase-js'
import { Project, LineItem, Contractor } from '../types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
    )
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
    )

export async function getCurrentContractor(): Promise<(Contractor & { id: string }) | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('contractors').select('*').eq('user_id', user.id).single()
  return data
}

export async function getProjects() {
  const { data, error } = await supabase.from('project_totals').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*), items:line_items(*)')
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data
}

export async function saveProject(project: Omit<Project, 'id' | 'createdAt'>, contractorId: string): Promise<string> {
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .upsert({
      contractor_id: contractorId,
      name: project.client.name,
      tax_number: project.client.taxNumber ?? null,
      address: project.client.address,
      email: project.client.email,
      phone: project.client.phone ?? null,
      contact_person: project.client.contactPerson ?? null,
      stripe_customer_id: project.client.stripeCustomerId ?? null,
    }, { onConflict: 'id' })
    .select('id').single()
  if (clientErr) throw clientErr

  const { data: saved, error: projErr } = await supabase
    .from('projects')
    .insert({
      contractor_id: contractorId,
      client_id: client.id,
      name: project.name,
      address: project.address,
      status: project.status,
      markup_pct: project.markupPct,
      vat_pct: project.vatPct,
      currency: project.currency,
      valid_until: project.validUntil,
      notes: project.notes ?? null,
    })
    .select('id').single()
  if (projErr) throw projErr

  const lineItems = project.items.map((item, idx) => ({
    project_id: saved.id,
    category: item.category,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    mat_price: item.matPrice,
    labor_price: item.laborPrice,
    sort_order: idx,
  }))
  const { error: itemsErr } = await supabase.from('line_items').insert(lineItems)
  if (itemsErr) throw itemsErr
  return saved.id
}

export async function updateProjectStatus(projectId: string, patch: {
  status?: Project['status'], stripeInvoiceId?: string, stripeInvoiceUrl?: string, stripePdfUrl?: string
}) {
  const { error } = await supabase.from('projects').update({
    status: patch.status,
    stripe_invoice_id: patch.stripeInvoiceId,
    stripe_invoice_url: patch.stripeInvoiceUrl,
    stripe_pdf_url: patch.stripePdfUrl,
  }).eq('id', projectId)
  if (error) throw error
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from('projects').update({ status: 'rejected' }).eq('id', projectId)
  if (error) throw error
}

export async function getCatalog(contractorId: string) {
  const { data, error } = await supabase
    .from('material_catalog')
    .select('*')
    .or(`contractor_id.is.null,contractor_id.eq.${contractorId}`)
    .order('category').order('name')
  if (error) throw error
  return data
}

export async function addCustomCatalogItem(contractorId: string, item: Omit<LineItem, 'id' | 'quantity'>) {
  const { error } = await supabase.from('material_catalog').insert({
    contractor_id: contractorId,
    category: item.category,
    name: item.name,
    unit: item.unit,
    base_mat_price: item.matPrice,
    base_labor_price: item.laborPrice,
  })
  if (error) throw error
}
