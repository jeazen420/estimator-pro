/**
 * hooks/useInvoiceFlow.ts
 * -----------------------
 * Orchestrates the full "Save → Stripe → PDF" flow from the UI.
 *
 * Usage in your EstimatorPro page:
 *
 *   const { submit, state, pdfUrl, invoiceUrl } = useInvoiceFlow()
 *
 *   <button onClick={() => submit(project, contractor)}>
 *     {state === 'idle' ? 'Árajánlat véglegesítése' : state}
 *   </button>
 */

import { useState } from 'react'
import { Project, Contractor } from '../types'
import { saveProject, updateProjectStatus, getCurrentContractor } from '../lib/supabase'

type FlowState =
  | 'idle'
  | 'saving'        // writing to Supabase
  | 'stripe'        // creating Stripe invoice
  | 'pdf'           // generating PDF
  | 'done'
  | 'error'

interface FlowResult {
  projectId: string
  invoiceUrl: string | null
  pdfUrl: string | null
  invoiceNumber: string | null
}

export function useInvoiceFlow() {
  const [state, setState] = useState<FlowState>('idle')
  const [result, setResult] = useState<FlowResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (project: Project, contractor: Contractor) => {
    setState('idle')
    setError(null)
    setResult(null)

    try {
      // ── 1. Persist to Supabase ─────────────────────────────────────
      setState('saving')
      const contractorRow = await getCurrentContractor()
      if (!contractorRow) throw new Error('Nem vagy bejelentkezve.')

      const projectId = project.id
        ? project.id
        : await saveProject(project, contractorRow.id)

      // ── 2. Create Stripe Invoice ───────────────────────────────────
      setState('stripe')
      const stripeRes = await fetch('/api/stripe/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, id: projectId }),
      })

      if (!stripeRes.ok) {
        const { error: msg } = await stripeRes.json()
        throw new Error(`Stripe hiba: ${msg}`)
      }

      const stripeData = await stripeRes.json()

      // Update project with Stripe IDs
      await updateProjectStatus(projectId, {
        status: 'sent',
        stripeInvoiceId: stripeData.invoiceId,
        stripeInvoiceUrl: stripeData.hostedUrl,
        stripePdfUrl: stripeData.pdfUrl,
      })

      // ── 3. Generate custom PDF ─────────────────────────────────────
      setState('pdf')
      const pdfRes = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { ...project, id: projectId },
          contractor,
          invoiceNumber: stripeData.invoiceNumber,
        }),
      })

      let pdfObjectUrl: string | null = null
      if (pdfRes.ok) {
        const blob = await pdfRes.blob()
        pdfObjectUrl = URL.createObjectURL(blob)
      }

      // ── 4. Done ───────────────────────────────────────────────────
      setState('done')
      setResult({
        projectId,
        invoiceUrl: stripeData.hostedUrl,
        pdfUrl: pdfObjectUrl,
        invoiceNumber: stripeData.invoiceNumber,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ismeretlen hiba'
      setError(msg)
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    setError(null)
  }

  const stateLabel: Record<FlowState, string> = {
    idle: 'Árajánlat véglegesítése',
    saving: 'Mentés…',
    stripe: 'Számla létrehozása…',
    pdf: 'PDF generálás…',
    done: 'Kész! ✓',
    error: 'Hiba történt',
  }

  return { submit, state, stateLabel: stateLabel[state], result, error, reset }
}
