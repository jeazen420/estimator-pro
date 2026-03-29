"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase, getProjects } from "@/lib/supabase"

interface ProjectRow {
  project_id: string; name: string; status: string; currency: string
  created_at: string; valid_until: string | null; client_name: string
  item_count: number; total_net: number; total_vat: number; total_gross: number
}

const fmt = (n: number) => new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n ?? 0)
const fmtD = (s: string) => new Date(s).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })

const STATUS: Record<string, { l: string; c: string; bg: string }> = {
  draft:    { l: "Vázlat",     c: "#a1a1aa", bg: "#27272a" },
  sent:     { l: "Elküldve",   c: "#60a5fa", bg: "#1e3a5f" },
  accepted: { l: "Elfogadva",  c: "#34d399", bg: "#064e3b" },
  rejected: { l: "Törölt",     c: "#f87171", bg: "#450a0a" },
}

const STATUS_NEXT: Record<string, string> = {
  draft: "sent", sent: "accepted", accepted: "draft",
}

const STATUS_NEXT_LABEL: Record<string, string> = {
  draft: "→ Elküldve", sent: "→ Elfogadva", accepted: "→ Visszaállít",
}

const PALETTE = ["#7c3aed","#0f766e","#b45309","#0369a1","#be185d","#15803d","#c2410c","#1d4ed8"]
function strColor(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return PALETTE[h % PALETTE.length] }

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [contractorName, setContractorName] = useState("Dashboard")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [sortKey, setSortKey] = useState("created_at")
  const [sortAsc, setSortAsc] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const { data: contractor } = await supabase.from("contractors").select("name").eq("user_id", session.user.id).single()
      if (contractor) setContractorName(contractor.name)
      const p = await getProjects()
      setProjects((p ?? []) as ProjectRow[])
      setLoading(false)
    }
    load()
  }, [router])

  const visible = useMemo(() => {
    let list = [...projects].filter(p => p.status !== "rejected")
    if (filter !== "all") list = list.filter(p => p.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q))
    }
    list.sort((a: any, b: any) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === "string") va = va.toLowerCase()
      if (typeof vb === "string") vb = vb.toLowerCase()
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return list
  }, [projects, filter, search, sortKey, sortAsc])

  const stats = useMemo(() => ({
    total: projects.filter(p => p.status !== "rejected").length,
    accepted: projects.filter(p => p.status === "accepted").length,
    sent: projects.filter(p => p.status === "sent").length,
    gross: projects.filter(p => p.status !== "rejected").reduce((s, p) => s + (p.total_gross ?? 0), 0),
  }), [projects])

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törölni szeretnéd?")) return
    setDeletingId(id)
    await supabase.from("projects").update({ status: "rejected" }).eq("id", id)
    setProjects(prev => prev.map(p => p.project_id === id ? { ...p, status: "rejected" } : p))
    setDeletingId(null)
  }

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const nextStatus = STATUS_NEXT[currentStatus]
    if (!nextStatus) return
    await supabase.from("projects").update({ status: nextStatus }).eq("id", id)
    setProjects(prev => prev.map(p => p.project_id === id ? { ...p, status: nextStatus } : p))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#71717a" }}>
      Betöltés…
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "#18181b", borderBottom: "1px solid #27272a", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".18em", color: "#fbbf24" }}>ESTIMATOR PRO</div>
              <div style={{ fontSize: 11, color: "#71717a" }}>{contractorName}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => router.push("/estimator")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 15px", borderRadius: 10, background: "#fbbf24", color: "#1c1917", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              + Új árajánlat
            </button>
            <button onClick={() => router.push("/profile")} style={{ padding: "8px 14px", borderRadius: 10, background: "#27272a", color: "#a1a1aa", fontSize: 13, border: "1px solid #3f3f46", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Profil
            </button>
            <button onClick={handleLogout} style={{ padding: "8px 14px", borderRadius: 10, background: "#27272a", color: "#a1a1aa", fontSize: 13, border: "1px solid #3f3f46", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Kilépés
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Összes projekt", val: stats.total + " db", accent: "#71717a" },
            { label: "Elküldve", val: stats.sent + " db", accent: "#60a5fa" },
            { label: "Elfogadva", val: stats.accepted + " db", accent: "#34d399" },
            { label: "Össz. forgalom", val: fmt(stats.gross), accent: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ background: "#18181b", border: "1px solid #27272a", borderTop: `2px solid ${s.accent}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: s.accent }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés…" style={{ flex: 1, minWidth: 200, maxWidth: 300, background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif" }}/>
          <div style={{ display: "flex", gap: 6 }}>
            {["all","draft","sent","accepted"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, border: `1px solid ${filter === f ? "#fbbf24" : "#3f3f46"}`, background: filter === f ? "#fbbf2422" : "none", color: filter === f ? "#fbbf24" : "#71717a", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {{ all: "Mind", draft: "Vázlat", sent: "Elküldve", accepted: "Elfogadva" }[f]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: "#52525b" }}>Rendez:</span>
            {[["created_at","Dátum"],["total_gross","Összeg"],["client_name","Ügyfél"]].map(([k,l]) => (
              <button key={k} onClick={() => toggleSort(k)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, border: `1px solid ${sortKey === k ? "#52525b" : "#27272a"}`, background: "none", color: sortKey === k ? "#d4d4d8" : "#71717a", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {visible.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 24px", textAlign: "center" }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none"><rect x="8" y="8" width="36" height="36" rx="8" stroke="#3f3f46" strokeWidth="1.5" strokeDasharray="5 4"/><path d="M26 18v16M18 26h16" stroke="#52525b" strokeWidth="2" strokeLinecap="round"/></svg>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#52525b" }}>Még nincs árajánlat</p>
            <button onClick={() => router.push("/estimator")} style={{ marginTop: 8, padding: "10px 20px", borderRadius: 10, background: "#fbbf24", color: "#1c1917", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              + Új árajánlat
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {visible.map((p) => {
              const st = STATUS[p.status] ?? STATUS.draft
              const av = strColor(p.client_name || "?")
              return (
                <div key={p.project_id} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: 18 }}>
                  {/* Top */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(p.client_name || "?").slice(0,1).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{p.client_name || "Ismeretlen ügyfél"}</div>
                        <div style={{ fontSize: 11, color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{p.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStatusChange(p.project_id, p.status)}
                      style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 999, color: st.c, background: st.bg, border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}
                      title={STATUS_NEXT_LABEL[p.status]}
                    >
                      {st.l}
                    </button>
                  </div>

                  <div style={{ height: 1, background: "#27272a", marginBottom: 14 }}/>

                  {/* Metrics */}
                  <div style={{ display: "flex", marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Bruttó összeg</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 500, color: "#fbbf24" }}>{fmt(p.total_gross)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Nettó</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#a1a1aa" }}>{fmt(p.total_net)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Tételek</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#a1a1aa" }}>{p.item_count} db</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{fmtD(p.created_at)}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleDelete(p.project_id)} disabled={deletingId === p.project_id} title="Törlés" style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "1px solid #27272a", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M4.5 3.5V2h5v1.5M5 6v4M9 6v4M3 3.5l.8 8h6.4l.8-8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button onClick={() => router.push(`/estimator/${p.project_id}`)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, background: "#27272a", color: "#d4d4d8", fontSize: 12, fontWeight: 500, border: "1px solid #3f3f46", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        Megnyitás →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
