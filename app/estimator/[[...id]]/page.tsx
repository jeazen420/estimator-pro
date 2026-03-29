"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, saveProject } from "@/lib/supabase"
import { Project, LineItem } from "@/types"

// ── Catalog ──────────────────────────────────────────────────────
const CATALOG = [
  { id: 1, category: "Festés", name: "Festés – 1 réteg", unit: "m²", matPrice: 700, laborPrice: 1400 },
  { id: 2, category: "Festés", name: "Festés – 2 réteg + glettelés", unit: "m²", matPrice: 1100, laborPrice: 2800 },
  { id: 3, category: "Gipszkarton", name: "GK fal szerelés", unit: "m²", matPrice: 1800, laborPrice: 3200 },
  { id: 4, category: "Gipszkarton", name: "GK álmennyezet", unit: "m²", matPrice: 2000, laborPrice: 4000 },
  { id: 5, category: "Burkolás", name: "Laminált padló fektetés", unit: "m²", matPrice: 5500, laborPrice: 2200 },
  { id: 6, category: "Burkolás", name: "Falicsempe rakás", unit: "m²", matPrice: 5000, laborPrice: 5500 },
  { id: 7, category: "Burkolás", name: "Padlóburkolat ragasztás", unit: "m²", matPrice: 3800, laborPrice: 4500 },
  { id: 8, category: "Villanyszerelés", name: "Falon belüli kábel", unit: "fm", matPrice: 650, laborPrice: 1200 },
  { id: 9, category: "Villanyszerelés", name: "Aljzat / kapcsoló bef.", unit: "db", matPrice: 4000, laborPrice: 4000 },
  { id: 10, category: "Vízszerelés", name: "Cső fektetés", unit: "fm", matPrice: 2000, laborPrice: 3500 },
  { id: 11, category: "Vízszerelés", name: "Mosdó beszerelés", unit: "db", matPrice: 35000, laborPrice: 12000 },
  { id: 12, category: "Vakolás", name: "Gépi vakolat", unit: "m²", matPrice: 1100, laborPrice: 2000 },
  { id: 13, category: "Vakolás", name: "Hőszigetelő rendszer", unit: "m²", matPrice: 5500, laborPrice: 4500 },
  { id: 14, category: "Ács", name: "Szarufa csere", unit: "fm", matPrice: 3500, laborPrice: 5500 },
  { id: 15, category: "Klíma", name: "Split klíma telepítés", unit: "db", matPrice: 160000, laborPrice: 35000 },
]

const CAT_COLORS: Record<string, string> = {
  Festés: "#F59E0B", Gipszkarton: "#60A5FA", Burkolás: "#34D399",
  Villanyszerelés: "#A78BFA", Vízszerelés: "#38BDF8", Vakolás: "#FB923C",
  Ács: "#86EFAC", Klíma: "#F472B6",
}

const fmt = (n: number) => new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n)
const VAT = 0.27

interface Item { uid: string; category: string; name: string; unit: string; qty: number; matPrice: number; laborPrice: number }

function makeUid() { return Math.random().toString(36).slice(2) }

function emptyProject(): Project {
  return {
    id: crypto.randomUUID(), name: "Új projekt", address: "",
    markupPct: 20, vatPct: 27, currency: "HUF",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "draft", createdAt: new Date().toISOString(),
    client: { id: "", name: "", address: "", email: "" }, items: [],
  }
}

// ── PDF Generator (jsPDF via CDN) ─────────────────────────────────
async function generatePDF(project: Project, items: Item[], markup: number, contractorName: string) {
  // @ts-ignore
  const { jsPDF } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
  const doc = new jsPDF()
  const totals = items.reduce((a, it) => {
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    return { net: a.net + net, vat: a.vat + net * VAT, gross: a.gross + net * (1 + VAT) }
  }, { net: 0, vat: 0, gross: 0 })

  // Header
  doc.setFontSize(20); doc.setFont("helvetica", "bold")
  doc.text("ARAJANLAT", 105, 20, { align: "center" })
  doc.setFontSize(10); doc.setFont("helvetica", "normal")
  doc.text(`Kelt: ${new Date().toLocaleDateString("hu-HU")}`, 105, 28, { align: "center" })

  // Parties
  doc.setFontSize(11); doc.setFont("helvetica", "bold")
  doc.text("Vallalkozo:", 14, 42)
  doc.setFont("helvetica", "normal"); doc.setFontSize(10)
  doc.text(contractorName, 14, 50)

  doc.setFontSize(11); doc.setFont("helvetica", "bold")
  doc.text("Megrendelo:", 110, 42)
  doc.setFont("helvetica", "normal"); doc.setFontSize(10)
  doc.text(project.client.name || "—", 110, 50)
  doc.text(project.client.address || "—", 110, 56)

  // Project info
  doc.setFontSize(11); doc.setFont("helvetica", "bold")
  doc.text(`Projekt: ${project.name}`, 14, 68)
  doc.text(`Helyszin: ${project.address || "—"}`, 14, 75)

  // Table header
  let y = 88
  doc.setFillColor(30, 30, 30); doc.rect(14, y - 6, 182, 8, "F")
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "bold")
  doc.text("Tetel megnevezese", 16, y)
  doc.text("Egys.", 120, y)
  doc.text("Menny.", 138, y)
  doc.text("Netto", 158, y)
  doc.text("Brutto", 178, y)
  doc.setTextColor(0, 0, 0)

  // Table rows
  items.forEach((it, i) => {
    y += 10
    if (i % 2 === 1) { doc.setFillColor(245, 245, 245); doc.rect(14, y - 6, 182, 9, "F") }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9)
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    const gross = net * (1 + VAT)
    doc.text(it.name.slice(0, 35), 16, y)
    doc.text(it.unit, 120, y)
    doc.text(String(it.qty), 138, y)
    doc.text(fmt(net), 152, y, { align: "right" })
    doc.text(fmt(gross), 190, y, { align: "right" })
    if (y > 260) { doc.addPage(); y = 20 }
  })

  // Totals
  y += 14
  doc.setDrawColor(200, 200, 200); doc.line(14, y - 4, 196, y - 4)
  doc.setFontSize(10); doc.setFont("helvetica", "normal")
  doc.text("Netto osszesen:", 130, y); doc.text(fmt(totals.net), 190, y, { align: "right" })
  y += 7
  doc.text("AFA (27%):", 130, y); doc.text(fmt(totals.vat), 190, y, { align: "right" })
  y += 7
  doc.setFont("helvetica", "bold"); doc.setFontSize(12)
  doc.setFillColor(251, 191, 36); doc.rect(125, y - 7, 71, 10, "F")
  doc.text("FIZETENDO:", 130, y); doc.text(fmt(totals.gross), 190, y, { align: "right" })

  // Footer
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120)
  doc.text(`Ervenyes: ${project.validUntil}`, 14, 285)
  doc.text("Keszult: Estimator Pro", 105, 285, { align: "center" })

  doc.save(`arajanlat-${project.name.replace(/\s/g, "-")}.pdf`)
}

// ── Main Component ────────────────────────────────────────────────
export default function EstimatorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id as string | undefined

  const [project, setProject] = useState<Project>(emptyProject())
  const [items, setItems] = useState<Item[]>([])
  const [markup, setMarkup] = useState(20)
  const [dropOpen, setDropOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pdfState, setPdfState] = useState<"idle" | "generating" | "done">("idle")
  const [saving, setSaving] = useState(false)
  const [contractorName, setContractorName] = useState("Vállalkozás")
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load project if editing
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }

      // Get contractor name
      const { data: contractor } = await supabase
        .from("contractors").select("name").eq("user_id", session.user.id).single()
      if (contractor) setContractorName(contractor.name)

      if (!projectId) return

      const { data, error } = await supabase
        .from("projects")
        .select("*, client:clients(*), items:line_items(*)")
        .eq("id", projectId).single()
      if (error || !data) return
      const row = data as any
      setProject({
        id: row.id, name: row.name, address: row.address ?? "",
        markupPct: Number(row.markup_pct), vatPct: Number(row.vat_pct),
        currency: row.currency, validUntil: row.valid_until ?? "",
        status: row.status, createdAt: row.created_at,
        client: { id: row.client?.id ?? "", name: row.client?.name ?? "", address: row.client?.address ?? "", email: row.client?.email ?? "" },
        items: [],
      })
      setMarkup(Number(row.markup_pct))
      setItems((row.items ?? []).map((li: any) => ({
        uid: li.id, category: li.category, name: li.name, unit: li.unit,
        qty: Number(li.quantity), matPrice: Number(li.mat_price), laborPrice: Number(li.labor_price),
      })))
    }
    init()
  }, [projectId, router])

  const calc = (it: Item) => {
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    return { net, vat: net * VAT, gross: net * (1 + VAT) }
  }
  const totals = items.reduce((a, it) => { const c = calc(it); return { net: a.net + c.net, vat: a.vat + c.vat, gross: a.gross + c.gross } }, { net: 0, vat: 0, gross: 0 })

  const addItem = (cat: typeof CATALOG[0]) => {
    setItems(prev => [...prev, { uid: makeUid(), category: cat.category, name: cat.name, unit: cat.unit, qty: 1, matPrice: cat.matPrice, laborPrice: cat.laborPrice }])
    setDropOpen(false); setSearch("")
  }

  const handleSave = async () => {
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert("Nem vagy bejelentkezve!"); return }
      const proj: Omit<Project, 'id' | 'createdAt'> = {
        ...project, markupPct: markup,
        items: items.map(it => ({ id: it.uid, category: it.category, name: it.name, unit: it.unit, quantity: it.qty, matPrice: it.matPrice, laborPrice: it.laborPrice }))
      }
      await saveProject(proj, session.user.id)
      router.push("/dashboard")
    } catch (e: any) {
      alert("Hiba a mentésnél: " + (e?.message ?? "ismeretlen hiba"))
    } finally { setSaving(false) }
  }

  const handlePDF = async () => {
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setPdfState("generating")
    try {
      await generatePDF(project, items, markup, contractorName)
      setPdfState("done")
      setTimeout(() => setPdfState("idle"), 3000)
    } catch (e) {
      alert("PDF hiba!")
      setPdfState("idle")
    }
  }

  const filtered = CATALOG.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
  const grouped = CATALOG.reduce((a: Record<string, typeof CATALOG>, c) => { (a[c.category] = a[c.category] || []).push(c); return a }, {})

  // ── Styles ────────────────────────────────────────────────────
  const S = {
    page: { minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5", paddingBottom: 220 } as React.CSSProperties,
    header: { background: "#18181b", borderBottom: "1px solid #27272a", position: "sticky" as const, top: 0, zIndex: 40 },
    headerInner: { maxWidth: 640, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    content: { maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" },
    card: { background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: "16px", marginBottom: 12 },
    label: { fontSize: 11, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 6, display: "block" },
    input: { width: "100%", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    addBtn: { width: "100%", border: "2px dashed #3f3f46", background: "none", borderRadius: 14, padding: 16, color: "#52525b", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", marginBottom: 10 },
    bottom: { position: "fixed" as const, bottom: 0, left: 0, right: 0, zIndex: 50 },
    bottomInner: { maxWidth: 640, margin: "0 auto", background: "#18181b", borderTop: "1px solid #27272a", padding: "12px 16px 20px", boxShadow: "0 -20px 40px #09090bcc" },
    totalGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 },
    totalBox: { background: "#09090b", borderRadius: 12, padding: "10px 12px", textAlign: "center" as const },
    totalLabel: { fontSize: 10, color: "#52525b", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 3 },
    totalVal: { fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: "#d4d4d8" },
    btnRow: { display: "flex", gap: 8 },
    saveBtn: (disabled: boolean) => ({ flex: 1, borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13, border: "1px solid #3f3f46", background: disabled ? "#27272a" : "#27272a", color: disabled ? "#52525b" : "#d4d4d8", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties),
    pdfBtn: (state: string, disabled: boolean) => ({ flex: 2, borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13, border: "none", background: state === "done" ? "#22c55e" : state === "generating" ? "#fbbf2488" : disabled ? "#27272a" : "#fbbf24", color: state === "done" ? "#fff" : state === "generating" ? "#78350f" : disabled ? "#52525b" : "#1c1917", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties),
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <button onClick={() => router.push("/dashboard")} style={S.backBtn}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 2L3 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", color: "#fbbf24" }}>ESTIMATOR PRO</span>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* Project Info */}
        <div style={S.card}>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Projekt neve</label>
            <input value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} placeholder="pl. Konyha felújítás" style={S.input}/>
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Helyszín</label>
              <input value={project.address} onChange={e => setProject(p => ({ ...p, address: e.target.value }))} placeholder="pl. Budapest, Fő u. 1." style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Érvényes (dátum)</label>
              <input type="date" value={project.validUntil} onChange={e => setProject(p => ({ ...p, validUntil: e.target.value }))} style={S.input}/>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div style={S.card}>
          <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: ".1em" }}>Ügyfél adatai</div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Ügyfél neve</label>
            <input value={project.client.name} onChange={e => setProject(p => ({ ...p, client: { ...p.client, name: e.target.value } }))} placeholder="pl. Kovács Péter" style={S.input}/>
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>E-mail</label>
              <input type="email" value={project.client.email} onChange={e => setProject(p => ({ ...p, client: { ...p.client, email: e.target.value } }))} placeholder="kovacs@email.hu" style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Cím</label>
              <input value={project.client.address} onChange={e => setProject(p => ({ ...p, client: { ...p.client, address: e.target.value } }))} placeholder="Budapest, Kossuth u. 5." style={S.input}/>
            </div>
          </div>
        </div>

        {/* Markup */}
        <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#71717a", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Árrés (Markup)</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
            <input type="range" min={0} max={50} value={markup} onChange={e => setMarkup(Number(e.target.value))} style={{ flex: 1, maxWidth: 140, accentColor: "#fbbf24" }}/>
            <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 15, fontFamily: "'DM Mono', monospace", width: 40, textAlign: "right" }}>{markup}%</span>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 10, color: "#52525b" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4"/><path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <p style={{ fontSize: 13 }}>Még nincs tétel — adj hozzá a katalógusból!</p>
          </div>
        )}

        {items.map((it, idx) => {
          const c = calc(it)
          const col = CAT_COLORS[it.category] || "#94a3b8"
          return (
            <div key={it.uid} style={{ background: "#18181b", border: "1px solid #27272a", borderLeft: `3px solid ${col}`, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 500, background: col + "22", color: col }}>{it.category}</span>
                    <span style={{ color: "#52525b", fontSize: 11 }}>#{String(idx + 1).padStart(2, "0")}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#f4f4f5" }}>{it.name}</p>
                </div>
                <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div style={{ padding: "0 14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ color: "#71717a", fontSize: 11, marginBottom: 5 }}>Mennyiség ({it.unit})</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: Math.max(0, x.qty - 1) } : x))} style={{ width: 32, height: 32, borderRadius: 8, background: "#27272a", border: "none", color: "#a1a1aa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <input type="number" value={it.qty} min={0} onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))} style={{ flex: 1, background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, textAlign: "center", fontSize: 14, padding: "6px 4px", color: "#f4f4f5", outline: "none", fontFamily: "'DM Mono', monospace" }}/>
                    <button onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x))} style={{ width: 32, height: 32, borderRadius: 8, background: "#27272a", border: "none", color: "#a1a1aa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#71717a", fontSize: 11, marginBottom: 2 }}>Bruttó összeg</div>
                  <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 16, fontFamily: "'DM Mono', monospace" }}>{fmt(c.gross)}</div>
                  <div style={{ color: "#52525b", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{fmt(c.net)} + ÁFA</div>
                </div>
              </div>
              <div style={{ padding: "0 14px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ background: "#09090b", borderRadius: 8, padding: "7px 10px" }}>
                  <div style={{ color: "#52525b", fontSize: 11 }}>Anyag / {it.unit}</div>
                  <div style={{ color: "#d4d4d8", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{fmt(it.matPrice)}</div>
                </div>
                <div style={{ background: "#09090b", borderRadius: 8, padding: "7px 10px" }}>
                  <div style={{ color: "#52525b", fontSize: 11 }}>Munka / {it.unit}</div>
                  <div style={{ color: "#d4d4d8", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{fmt(it.laborPrice)}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add item dropdown */}
        <div ref={dropRef} style={{ position: "relative", marginBottom: 10 }}>
          <button onClick={() => setDropOpen(v => !v)} style={S.addBtn}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Tétel hozzáadása a katalógusból
          </button>
          {dropOpen && (
            <div style={{ position: "absolute", zIndex: 50, top: "100%", marginTop: 6, left: 0, right: 0, background: "#18181b", border: "1px solid #3f3f46", borderRadius: 14, boxShadow: "0 20px 40px #00000066", overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #27272a" }}>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés a katalógusban…" style={{ width: "100%", background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}/>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {search ? filtered.map(c => (
                  <button key={c.id} onClick={() => addItem(c)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "#e4e4e7", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif" }}>
                    <div><span style={{ fontSize: 11, marginRight: 6, color: CAT_COLORS[c.category] }}>{c.category}</span>{c.name}</div>
                    <span style={{ color: "#52525b", fontSize: 11 }}>{c.unit}</span>
                  </button>
                )) : Object.entries(grouped).map(([cat, cats]) => (
                  <div key={cat}>
                    <div style={{ padding: "5px 14px 3px", fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: ".1em", background: (CAT_COLORS[cat] || "#94a3b8") + "15" }}>{cat}</div>
                    {cats.map(c => (
                      <button key={c.id} onClick={() => addItem(c)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "#e4e4e7", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif" }}>
                        <span>{c.name}</span><span style={{ color: "#52525b", fontSize: 11 }}>{c.unit}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div style={S.bottom}>
        <div style={S.bottomInner}>
          <div style={S.totalGrid}>
            <div style={S.totalBox}>
              <div style={S.totalLabel}>Nettó</div>
              <div style={S.totalVal}>{fmt(totals.net)}</div>
            </div>
            <div style={S.totalBox}>
              <div style={S.totalLabel}>ÁFA 27%</div>
              <div style={S.totalVal}>{fmt(totals.vat)}</div>
            </div>
            <div style={{ ...S.totalBox, background: "#fbbf2411", border: "1px solid #fbbf2433" }}>
              <div style={{ ...S.totalLabel, color: "#f59e0b" }}>Bruttó</div>
              <div style={{ ...S.totalVal, color: "#fbbf24", fontSize: 14 }}>{fmt(totals.gross)}</div>
            </div>
          </div>
          <div style={S.btnRow}>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 16px", borderRadius: 12, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              ← Vissza
            </button>
            <button onClick={handleSave} disabled={saving || items.length === 0} style={S.saveBtn(saving || items.length === 0)}>
              {saving ? "Mentés…" : "💾 Mentés"}
            </button>
            <button onClick={handlePDF} disabled={pdfState !== "idle" || items.length === 0} style={S.pdfBtn(pdfState, items.length === 0)}>
              {pdfState === "generating" ? "Generálás…" : pdfState === "done" ? "✓ Letöltve!" : "📄 PDF letöltés"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
