import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { calculateProject } from '@/lib/calculator'
import { Project } from '@/types'

<<<<<<< HEAD
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20', typescript: true })
=======
// ── Stripe client (singleton pattern safe in serverless) ──────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})
>>>>>>> fc5d00013d0fd9117aa9539f710b2dd33b33033a

async function upsertCustomer(client: Project['client']): Promise<string> {
  if (client.stripeCustomerId) {
    await stripe.customers.update(client.stripeCustomerId, { name: client.name, email: client.email })
    return client.stripeCustomerId
  }
  const c = await stripe.customers.create({ name: client.name, email: client.email, address: { line1: client.address, country: 'HU' } })
  return c.id
}

export async function POST(req: NextRequest) {
  try {
    const project: Project = await req.json()
    const { items } = calculateProject(project)
    const customerId = await upsertCustomer(project.client)
    await Promise.all(items.map(item => stripe.invoiceItems.create({ customer: customerId, currency: project.currency.toLowerCase(), amount: Math.round(item.netPrice), description: `${item.category} – ${item.name} (${item.quantity} ${item.unit})` })))
    const dueDate = new Date(project.validUntil)
    const invoice = await stripe.invoices.create({ customer: customerId, currency: project.currency.toLowerCase(), collection_method: 'send_invoice', days_until_due: Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)), default_tax_rates: process.env.STRIPE_TAX_RATE_ID ? [process.env.STRIPE_TAX_RATE_ID] : [], description: project.name, metadata: { project_id: project.id } })
    const finalised = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false })
    return NextResponse.json({ invoiceId: finalised.id, invoiceNumber: finalised.number, hostedUrl: finalised.hosted_invoice_url, pdfUrl: finalised.invoice_pdf, customerId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
