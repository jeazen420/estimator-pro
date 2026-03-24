import { useState } from 'react'
import { Project, Contractor } from '../types'
import { saveProject, updateProjectStatus, getCurrentContractor } from '../lib/supabase'

type FlowState = 'idle' | 'saving' | 'stripe' | 'pdf' | 'done' | 'error'

export function useInvoiceFlow() {
  const [state, setState] = useState<FlowState>('idle')
  const [result, setResult] = useState<{ projectId: string; invoiceUrl: string | null; pdfUrl: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (project: Project, contractor: Contractor) => {
    setState('saving'); setError(null); setResult(null)
    try {
      const contractorRow = await getCurrentContractor()
      if (!contractorRow) throw new Error('Nem vagy bejelentkezve.')
      const projectId = project.id || await saveProject(project, contractorRow.id)
      setState('stripe')
      const stripeRes = await fetch('/api/stripe/create-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...project, id: projectId }) })
      if (!stripeRes.ok) { const { error: msg } = await stripeRes.json(); throw new Error(`Stripe hiba: ${msg}`) }
      const stripeData = await stripeRes.json()
      await updateProjectStatus(projectId, { status: 'sent', stripeInvoiceId: stripeData.invoiceId, stripeInvoiceUrl: stripeData.hostedUrl, stripePdfUrl: stripeData.pdfUrl })
      setState('pdf')
      const pdfRes = await fetch('/api/pdf/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: { ...project, id: projectId }, contractor, invoiceNumber: stripeData.invoiceNumber }) })
      let pdfObjectUrl = null
      if (pdfRes.ok) { const blob = await pdfRes.blob(); pdfObjectUrl = URL.createObjectURL(blob) }
      setState('done')
      setResult({ projectId, invoiceUrl: stripeData.hostedUrl, pdfUrl: pdfObjectUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba')
      setState('error')
    }
  }

  const reset = () => { setState('idle'); setResult(null); setError(null) }
  const labels: Record<FlowState, string> = { idle: 'Véglegesítés', saving: 'Mentés…', stripe: 'Számla…', pdf: 'PDF…', done: 'Kész! ✓', error: 'Hiba' }

  return { submit, state, stateLabel: labels[state], result, error, reset }
}
