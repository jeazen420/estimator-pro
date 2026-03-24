"use client"

/**
 * /app/estimator/[[...id]]/page.tsx
 * ──────────────────────────────────────────────────────────────────
 * Estimator Pro — kalkulátor oldal.
 *
 * Két mód:
 *   /estimator          → új, üres kalkulátor
 *   /estimator/[id]     → meglévő projekt betöltése Supabase-ből
 *
 * A Dashboard "Megnyitás" gombja ide navigál az id-vel.
 * A Dashboard "Új árajánlat" gombja ide navigál id nélkül.
 * ──────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Project, LineItem } from "@/types"

// ── Default empty project factory ────────────────────────────────
function emptyProject(): Omit<Project, "id" | "createdAt"> {
  return {
    name: "Új projekt",
    address: "",
    markupPct: 20,
    vatPct: 27,
    currency: "HUF",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "draft",
    client: {
      id: "",
      name: "",
      address: "",
      email: "",
    },
    items: [],
  }
}

// ── Row from Supabase → Project type ─────────────────────────────
function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    markupPct: Number(row.markup_pct),
    vatPct: Number(row.vat_pct),
    currency: row.currency,
    validUntil: row.valid_until ?? "",
    status: row.status,
    notes: row.notes ?? undefined,
    stripeInvoiceId: row.stripe_invoice_id ?? undefined,
    createdAt: row.created_at,
    client: {
      id: row.client?.id ?? "",
      name: row.client?.name ?? "",
      taxNumber: row.client?.tax_number ?? undefined,
      address: row.client?.address ?? "",
      email: row.client?.email ?? "",
      phone: row.client?.phone ?? undefined,
      contactPerson: row.client?.contact_person ?? undefined,
      stripeCustomerId: row.client?.stripe_customer_id ?? undefined,
    },
    items: (row.items ?? []).map((li: any): LineItem => ({
      id: li.id,
      category: li.category,
      name: li.name,
      unit: li.unit,
      quantity: Number(li.quantity),
      matPrice: Number(li.mat_price),
      laborPrice: Number(li.labor_price),
    })),
  }
}

// ── Component ─────────────────────────────────────────────────────
export default function EstimatorPage() {
  const params = useParams()
  const router = useRouter()

  // params.id is either undefined (new) or a string array ["<uuid>"]
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [notFound, setNotFound] = useState(false)

  // ── Load existing project ─────────────────────────────────────
  useEffect(() => {
    if (!projectId) {
      // New project — build an empty one with a temp id
      setProject({
        ...emptyProject(),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      })
      return
    }

    async function load() {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          client:clients(*),
          items:line_items(* order by sort_order)
        `)
        .eq("id", projectId)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProject(rowToProject(data))
      setLoading(false)
    }

    load()
  }, [projectId])

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#09090b",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", color: "#71717a",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: "#fbbf24",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
            <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
            <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
            <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
          </svg>
        </div>
        <span style={{ fontSize: 13 }}>Projekt betöltése…</span>
        <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap')"}</style>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{
        minHeight: "100vh", background: "#09090b",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", flexDirection: "column", gap: 16,
      }}>
        <p style={{ color: "#f87171", fontSize: 15 }}>A projekt nem található.</p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "8px 16px", borderRadius: 8, background: "#27272a",
            color: "#d4d4d8", border: "1px solid #3f3f46", cursor: "pointer",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ← Vissza a dashboardra
        </button>
        <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap')"}</style>
      </div>
    )
  }

  if (!project) return null

  /**
   * Here you render the actual EstimatorPro calculator UI,
   * passing `project` as initial state.
   *
   * In your Lovable project, replace this placeholder with the
   * full <EstimatorProApp> component from EstimatorPro.jsx,
   * extended to accept an `initialProject` prop.
   *
   * Example:
   *   import EstimatorProApp from "@/components/EstimatorPro"
   *   return <EstimatorProApp initialProject={project} onSave={handleSave} />
   */
  return (
    <EstimatorProShell
      project={project}
      onBack={() => router.push("/dashboard")}
      onSave={(updated) => {
        setProject(updated)
        // After saving, update URL to the real project id
        if (!projectId) router.replace(`/estimator/${updated.id}`)
      }}
    />
  )
}

// ── Thin shell: back button + estimator canvas ────────────────────
// Replace the inner <div> with your actual EstimatorPro component.
function EstimatorProShell({
  project,
  onBack,
  onSave,
}: {
  project: Project
  onBack: () => void
  onSave: (p: Project) => void
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Back nav */}
      <div style={{
        background: "#18181b", borderBottom: "1px solid #27272a",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8,
            background: "none", border: "1px solid #3f3f46",
            color: "#a1a1aa", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8 2L3 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </button>
        <span style={{ color: "#3f3f46", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{project.name}</span>
        <span style={{
          marginLeft: "auto", fontSize: 11, padding: "2px 8px",
          borderRadius: 999, background: "#27272a", color: "#71717a",
        }}>
          {project.id.slice(0, 8)}…
        </span>
      </div>

      {/*
        ┌─────────────────────────────────────────────────────────┐
        │  Replace this comment with:                              │
        │  import EstimatorProApp from "@/components/EstimatorPro"│
        │  <EstimatorProApp initialProject={project} />            │
        └─────────────────────────────────────────────────────────┘
      */}
      <div style={{
        maxWidth: 600, margin: "40px auto", padding: "0 16px",
        color: "#71717a", fontSize: 13, textAlign: "center", lineHeight: 1.8,
      }}>
        <p>
          Ez a wrapper betöltötte a <strong style={{ color: "#f4f4f5" }}>{project.name}</strong> projektet
          ({project.items.length} tétel, {project.client.name || "ügyfél nélkül"}).
        </p>
        <p style={{ marginTop: 8 }}>
          A valódi kalkulátor UI-t importáld ide:
          <br />
          <code style={{ color: "#fbbf24", fontSize: 12 }}>
            {"<EstimatorProApp initialProject={project} />"}
          </code>
        </p>
      </div>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap')"}</style>
    </div>
  )
}
