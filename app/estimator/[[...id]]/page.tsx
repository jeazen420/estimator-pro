"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Project } from "@/types"

function emptyProject(): Project {
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36),
    name: "Új projekt", address: "", markupPct: 20, vatPct: 27,
    currency: "HUF",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "draft", createdAt: new Date().toISOString(),
    client: { id: "", name: "", address: "", email: "" },
    items: [],
  }
}

export default function EstimatorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id as string | undefined

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!projectId) { setProject(emptyProject()); return }
    async function load() {
      const { data, error } = await supabase
        .from("projects")
        .select("*, client:clients(*), items:line_items(*)")
        .eq("id", projectId)
        .single()
      if (error || !data) { setNotFound(true); setLoading(false); return }
      const row = data as any
      setProject({
        id: row.id, name: row.name, address: row.address ?? "",
        markupPct: Number(row.markup_pct), vatPct: Number(row.vat_pct),
        currency: row.currency, validUntil: row.valid_until ?? "",
        status: row.status, notes: row.notes ?? undefined, createdAt: row.created_at,
        client: {
          id: row.client?.id ?? "", name: row.client?.name ?? "",
          address: row.client?.address ?? "", email: row.client?.email ?? "",
          phone: row.client?.phone ?? undefined,
          taxNumber: row.client?.tax_number ?? undefined,
        },
        items: (row.items ?? []).map((li: any) => ({
          id: li.id, category: li.category, name: li.name, unit: li.unit,
          quantity: Number(li.quantity), matPrice: Number(li.mat_price),
          laborPrice: Number(li.labor_price),
        })),
      })
      setLoading(false)
    }
    load()
  }, [projectId])

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5" },
    nav: { background: "#18181b", borderBottom: "1px solid #27272a", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 },
    back: { display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "none", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    center: { minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" },
  }

  if (loading) return <div style={S.center}><span style={{ color: "#71717a", fontSize: 13 }}>Betöltés…</span></div>
  if (notFound) return (
    <div style={S.center}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: 16 }}>A projekt nem található.</p>
        <button onClick={() => router.push("/dashboard")} style={S.back}>← Vissza</button>
      </div>
    </div>
  )
  if (!project) return null

  return (
    <div style={S.page}>
      <div style={S.nav}>
        <button onClick={() => router.push("/dashboard")} style={S.back}>← Dashboard</button>
        <span style={{ color: "#3f3f46", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 13, color: "#f4f4f5", fontWeight: 500 }}>{project.name}</span>
      </div>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px", color: "#71717a", fontSize: 13, textAlign: "center", lineHeight: 1.8 }}>
        <p>Projekt betöltve: <strong style={{ color: "#f4f4f5" }}>{project.name}</strong></p>
        <p style={{ marginTop: 8 }}>({project.items.length} tétel)</p>
        <p style={{ marginTop: 16, fontSize: 12, color: "#52525b" }}>Ide jön az EstimatorPro kalkulátor komponens.</p>
      </div>
    </div>
  )
}
