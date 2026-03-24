/**
 * POST /api/stripe/create-invoice
 *
 * Transforms an Estimator Pro Project into a Stripe Invoice.
 *
 * Flow:
 *  1. Upsert Stripe Customer from project.client
 *  2. Create InvoiceItems (one per LineItem — net amount, tax handled via TaxRate)
 *  3. Create the Invoice in draft state
 *  4. Finalise → returns hosted invoice URL + PDF URL
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_TAX_RATE_ID   ← create a 27% TaxRate once in Stripe Dashboard and paste the ID here
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { calculateProject } from '@/lib/calculator'
import { Project } from '@/types'

// ── Stripe client (singleton pattern safe in serverless) ──────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

// ── Helper: convert HUF to Stripe amount (integer, smallest currency unit) ───
// Stripe treats HUF as zero-decimal currency — amounts are in whole forints.
const toStripeAmount = (huf: number): number => Math.round(huf)

// ── Helper: ensure a Stripe Customer exists for the client ───────────────────
async function upsertStripeCustomer(
  client: Project['client']
): Promise<string> {
  // If we already stored a Stripe customer ID in the DB, reuse it
  if (client.stripeCustomerId) {
    // Optionally sync name/email changes
    await stripe.customers.update(client.stripeCustomerId, {
      name: client.name,
      email: client.email,
      address: { line1: client.address, country: 'HU' },
      metadata: {
        tax_number: client.taxNumber ?? '',
        contact_person: client.contactPerson ?? '',
      },
    })
    return client.stripeCustomerId
  }

  // Otherwise create a new customer
  const customer = await stripe.customers.create({
    name: client.name,
    email: client.email,
    phone: client.phone ?? undefined,
    address: { line1: client.address, country: 'HU' },
    metadata: {
      estimator_client_id: client.id,
      tax_number: client.taxNumber ?? '',
    },
  })

  return customer.id
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const project: Project = await req.json()

    // 1. Calculate totals (applies markup; tax handled by Stripe TaxRate)
    const { items } = calculateProject(project)

    // 2. Upsert customer
    const customerId = await upsertStripeCustomer(project.client)

    // 3. Create one InvoiceItem per line item
    //    We pass the NET price to Stripe and let the TaxRate add VAT automatically.
    const invoiceItemPromises = items.map((item) =>
      stripe.invoiceItems.create({
        customer: customerId,
        currency: project.currency.toLowerCase(), // 'huf' | 'eur'
        amount: toStripeAmount(item.netPrice),
        description: `${item.category} – ${item.name} (${item.quantity} ${item.unit})`,
        metadata: {
          category: item.category,
          quantity: String(item.quantity),
          unit: item.unit,
          mat_unit_price: String(item.matPrice),
          labor_unit_price: String(item.laborPrice),
          markup_pct: String(project.markupPct),
        },
      })
    )
    await Promise.all(invoiceItemPromises)

    // 4. Create the invoice (draft)
    const dueDate = new Date(project.validUntil)
    const invoice = await stripe.invoices.create({
      customer: customerId,
      currency: project.currency.toLowerCase(),
      collection_method: 'send_invoice',
      days_until_due: Math.max(
        1,
        Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)
      ),
      // Attach the pre-created 27% TaxRate to all items
      default_tax_rates: [process.env.STRIPE_TAX_RATE_ID!],
      description: `${project.name} – ${project.address}`,
      footer: project.notes ?? undefined,
      metadata: {
        estimator_project_id: project.id,
        markup_pct: String(project.markupPct),
        vat_pct: String(project.vatPct),
      },
      // Optional: custom fields shown on the Stripe-hosted invoice
      custom_fields: [
        { name: 'Projekt helyszíne', value: project.address.slice(0, 30) },
        { name: 'Érvényes', value: project.validUntil },
      ],
    })

    // 5. Finalise the invoice (locks it, makes PDF available)
    const finalised = await stripe.invoices.finalizeInvoice(invoice.id, {
      auto_advance: false, // don't auto-charge; this is an estimate
    })

    return NextResponse.json({
      invoiceId: finalised.id,
      invoiceNumber: finalised.number,
      hostedUrl: finalised.hosted_invoice_url,
      pdfUrl: finalised.invoice_pdf,
      amountDue: finalised.amount_due,
      status: finalised.status,
      customerId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[stripe/create-invoice]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
