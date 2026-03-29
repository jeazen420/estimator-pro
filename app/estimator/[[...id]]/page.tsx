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
  Ács: "#86EFAC", Klíma: "#F472B6", Egyéni: "#e879f9",
}

const fmt = (n: number) => new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n)
const VAT = 0.27

function huStr(s: string) {
  return (s || "")
    .replace(/á/g, "a").replace(/Á/g, "A").replace(/é/g, "e").replace(/É/g, "E")
    .replace(/í/g, "i").replace(/Í/g, "I").replace(/ó/g, "o").replace(/Ó/g, "O")
    .replace(/ö/g, "o").replace(/Ö/g, "O").replace(/ő/g, "o").replace(/Ő/g, "O")
    .replace(/ú/g, "u").replace(/Ú/g, "U").replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ű/g, "u").replace(/Ű/g, "U")
}

interface Item { uid: string; category: string; name: string; unit: string; qty: number; matPrice: number; laborPrice: number }
function makeUid() { return Math.random().toString(36).slice(2) }

function emptyProject(): Project {
  return {
    id: crypto.randomUUID(), name: "Új projekt", address: "",
    markupPct: 20, vatPct: 27, currency: "HUF",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "draft", createdAt: new Date().toISOString(),
    client: { id: "", name: "", address: "", email: "", phone: "" }, items: [],
  }
}

async function generatePDF(project: Project, items: Item[], markup: number, contractorName: string, notes: string): Promise<string> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  const totals = items.reduce((a, it) => {
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    return { net: a.net + net, vat: a.vat + net * VAT, gross: a.gross + net * (1 + VAT) }
  }, { net: 0, vat: 0, gross: 0 })

  doc.setFontSize(22); doc.setFont("helvetica", "bold")
  doc.text("ARAJANLAT", 105, 22, { align: "center" })
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100)
  doc.text(`Kelt: ${new Date().toLocaleDateString("hu-HU")}`, 105, 30, { align: "center" })
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(251, 191, 36); doc.setLineWidth(1); doc.line(14, 34, 196, 34)

  doc.setFontSize(8); doc.setTextColor(150, 150, 150)
  doc.text("VALLALKOZO", 14, 44); doc.text("MEGRENDELO", 110, 44)
  doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold")
  doc.text(huStr(contractorName), 14, 52)
  doc.text(huStr(project.client.name) || "—", 110, 52)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
  doc.text(huStr(project.client.address) || "—", 110, 59)
  doc.text(huStr(project.client.email) || "", 110, 65)
  if ((project.client as any).phone) doc.text(huStr((project.client as any).phone), 110, 71)
  doc.setTextColor(0, 0, 0)

  doc.setFillColor(245, 245, 245); doc.rect(14, 76, 182, 14, "F")
  doc.setFontSize(10); doc.setFont("helvetica", "bold")
  doc.text(`Projekt: ${huStr(project.name)}`, 18, 83)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
  doc.text(`Helyszin: ${huStr(project.address) || "—"}`, 18, 88)
  doc.setTextColor(0, 0, 0)

  let y = 102
  doc.setFillColor(24, 24, 27); doc.rect(14, y - 6, 182, 9, "F")
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold")
  doc.text("TETEL", 16, y); doc.text("EGYS.", 118, y); doc.text("MENNY.", 136, y)
  doc.text("NETTO", 158, y, { align: "right" }); doc.text("BRUTTO", 193, y, { align: "right" })
  doc.setTextColor(0, 0, 0)

  items.forEach((it, i) => {
    y += 10
    if (y > 260) { doc.addPage(); y = 20 }
    if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y - 6, 182, 9, "F") }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9)
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    const gross = net * (1 + VAT)
    doc.text(huStr(it.name).slice(0, 38), 16, y)
    doc.text(it.unit, 118, y); doc.text(String(it.qty), 136, y)
    doc.text(fmt(net), 158, y, { align: "right" }); doc.text(fmt(gross), 193, y, { align: "right" })
  })

  y += 12
  doc.setDrawColor(200, 200, 200); doc.line(14, y - 4, 196, y - 4)
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80)
  doc.text("Netto osszesen:", 130, y); doc.text(fmt(totals.net), 193, y, { align: "right" })
  y += 7; doc.text("AFA (27%):", 130, y); doc.text(fmt(totals.vat), 193, y, { align: "right" })
  y += 8
  doc.setFillColor(251, 191, 36); doc.rect(126, y - 7, 70, 10, "F")
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(28, 25, 23)
  doc.text("FIZETENDO:", 130, y); doc.text(fmt(totals.gross), 193, y, { align: "right" })
  doc.setTextColor(0, 0, 0)

  if (notes) {
    y += 14
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("Megjegyzesek:", 14, y)
    y += 6; doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80)
    const lines = doc.splitTextToSize(huStr(notes), 170)
    doc.text(lines, 14, y)
  }

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150)
  doc.text(`Ervenyes: ${project.validUntil}`, 14, 285)
  doc.text("Estimator Pro", 105, 285, { align: "center" })

  return doc.output("datauristring")
}

export default function EstimatorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id as string | undefined

  const [project, setProject] = useState<Project>(emptyProject())
  const [items, setItems] = useState<Item[]>([])
  const [markup, setMarkup] = useState(20)
  const [notes, setNotes] = useState("")
  const [dropOpen, setDropOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [customItem, setCustomItem] = useState({ name: "", unit: "m²", matPrice: "", laborPrice: "" })
  const [showCustom, setShowCustom] = useState(false)
  const [pdfState, setPdfState] = useState<"idle"|"generating"|"done">("idle")
  const [emailState, setEmailState] = useState<"idle"|"sending"|"done"|"error">("idle")
  const [saving, setSaving] = useState(false)
  const [contractorName, setContractorName] = useState("")
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const { data: c } = await supabase.from("contractors").select("name").eq("user_id", session.user.id).single()
      if (c) setContractorName(c.name)
      if (!projectId) return
      const { data, error } = await supabase.from("projects").select("*, client:clients(*), items:line_items(*)").eq("id", projectId).single()
      if (error || !data) return
      const row = data as any
      setProject({ id: row.id, name: row.name, address: row.address ?? "", markupPct: Number(row.markup_pct), vatPct: Number(row.vat_pct), currency: row.currency, validUntil: row.valid_until ?? "", status: row.status, createdAt: row.created_at, notes: row.notes ?? "", client: { id: row.client?.id ?? "", name: row.client?.name ?? "", address: row.client?.address ?? "", email: row.client?.email ?? "", phone: row.client?.phone ?? "" }, items: [] })
      setMarkup(Number(row.markup_pct))
      setNotes(row.notes ?? "")
      setItems((row.items ?? []).map((li: any) => ({ uid: li.id, category: li.category, name: li.name, unit: li.unit, qty: Number(li.quantity), matPrice: Number(li.mat_price), laborPrice: Number(li.labor_price) })))
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

  const addCustomItem = () => {
    if (!customItem.name) return
    setItems(prev => [...prev, { uid: makeUid(), category: "Egyéni", name: customItem.name, unit: customItem.unit, qty: 1, matPrice: Number(customItem.matPrice) || 0, laborPrice: Number(customItem.laborPrice) || 0 }])
    setCustomItem({ name: "", unit: "m²", matPrice: "", laborPrice: "" })
    setShowCustom(false)
  }

  const handleSave = async () => {
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert("Nem vagy bejelentkezve!"); return }
      const proj: Omit<Project, 'id' | 'createdAt'> = { ...project, markupPct: markup, notes, items: items.map(it => ({ id: it.uid, category: it.category, name: it.name, unit: it.unit, quantity: it.qty, matPrice: it.matPrice, laborPrice: it.laborPrice })) }
      await saveProject(proj, session.user.id)
      router.push("/dashboard")
    } catch (e: any) { alert("Hiba: " + (e?.message ?? "ismeretlen")) }
    finally { setSaving(false) }
  }

  const handlePDF = async (download = true) => {
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return null }
    setPdfState("generating")
    try {
      const dataUri = await generatePDF(project, items, markup, contractorName, notes)
      if (download) {
        const link = document.createElement("a")
        link.href = dataUri
        link.download = `arajanlat-${huStr(project.name).replace(/\s/g, "-")}.pdf`
        link.click()
        setPdfState("done"); setTimeout(() => setPdfState("idle"), 3000)
      } else {
        setPdfState("idle")
      }
      return dataUri
    } catch (e) { alert("PDF hiba!"); setPdfState("idle"); return null }
  }

  const handleEmail = async () => {
    if (!project.client.email) { alert("Add meg az ügyfél e-mail címét!"); return }
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setEmailState("sending")
    try {
      const dataUri = await generatePDF(project, items, markup, contractorName, notes)
      if (!dataUri) { setEmailState("error"); return }
      const base64 = dataUri.split(",")[1]
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: project.client.email,
          subject: `Árajánlat - ${project.name}`,
          html: `<h2>Tisztelt ${project.client.name || "Ügyfelünk"}!</h2><p>Mellékletben megtalálja az ajánlatunkat a következő munkára: <strong>${project.name}</strong>.</p><p>Bruttó összeg: <strong>${fmt(totals.gross)}</strong></p><p>Érvényes: ${project.validUntil}</p><br/><p>Üdvözlettel,<br/>${contractorName}</p>`,
          pdfBase64: base64,
          fileName: `arajanlat-${huStr(project.name)}.pdf`,
        }),
      })
      const data = await res.json()
      if (data.success) { setEmailState("done"); setTimeout(() => setEmailState("idle"), 3000) }
      else { alert("Email hiba: " + (data.error || "ismeretlen")); setEmailState("error"); setTimeout(() => setEmailState("idle"), 3000) }
    } catch (e) { setEmailState("error"); setTimeout(() => setEmailState("idle"), 3000) }
  }

  const filtered = CATALOG.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
  const grouped = CATALOG.reduce((a: Record<string, typeof CATALOG>, c) => { (a[c.category] = a[c.category] || []).push(c); return a }, {})

  const S = {
    page: { minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5", paddingBottom: 240 } as React.CSSProperties,
    header: { background: "#18181b", borderBottom: "1px solid #27272a", position: "sticky" as const, top: 0, zIndex: 40 },
    content: { maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" },
    card: { background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: 16, marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: 11, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 5, display: "block" },
    input: { width: "100%", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties,
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
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
              <input value={project.address} onChange={e => setProject(p => ({ ...p, address: e.target.value }))} placeholder="Budapest, Fő u. 1." style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Érvényes</label>
              <input type="date" value={project.validUntil} onChange={e => setProject(p => ({ ...p, validUntil: e.target.value }))} style={S.input}/>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14 }}>Ügyfél adatai</div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Ügyfél neve</label>
            <input value={project.client.name} onChange={e => setProject(p => ({ ...p, client: { ...p.client, name: e.target.value } }))} placeholder="Kovács Péter" style={S.input}/>
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>E-mail</label>
              <input type="email" value={project.client.email} onChange={e => setProject(p => ({ ...p, client: { ...p.client, email: e.target.value } }))} placeholder="kovacs@email.hu" style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Telefon</label>
              <input value={(project.client as any).phone || ""} onChange={e => setProject(p => ({ ...p, client: { ...p.client, phone: e.target.value } }))} placeholder="+36 30 123 4567" style={S.input}/>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={S.label}>Cím</label>
            <input value={project.client.address} onChange={e => setProject(p => ({ ...p, client: { ...p.client, address: e.target.value } }))} placeholder="Budapest, Kossuth u. 5." style={S.input}/>
          </div>
        </div>

        {/* Markup */}
        <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#71717a", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Árrés</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
            <input type="range" min={0} max={50} value={markup} onChange={e => setMarkup(Number(e.target.value))} style={{ flex: 1, maxWidth: 140, accentColor: "#fbbf24" }}/>
            <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 15, fontFamily: "'DM Mono', monospace", width: 40, textAlign: "right" }}>{markup}%</span>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 10, color: "#52525b" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4"/><path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <p style={{ fontSize: 13 }}>Adj hozzá tételeket a katalógusból!</p>
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
                    <button onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: Math.max(0, x.qty - 1) } : x))} style={{ width: 36, height: 36, borderRadius: 8, background: "#27272a", border: "none", color: "#a1a1aa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <input type="number" value={it.qty} min={0} onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: parseFloat(e.target.value) || 0 } : x))} style={{ flex: 1, background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, textAlign: "center", fontSize: 14, padding: "8px 4px", color: "#f4f4f5", outline: "none", fontFamily: "'DM Mono', monospace" }}/>
                    <button onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x))} style={{ width: 36, height: 36, borderRadius: 8, background: "#27272a", border: "none", color: "#a1a1aa", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
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

        {/* Add item */}
        <div ref={dropRef} style={{ position: "relative", marginBottom: 10 }}>
          <button onClick={() => { setDropOpen(v => !v); setShowCustom(false) }} style={{ width: "100%", border: "2px dashed #3f3f46", background: "none", borderRadius: 14, padding: 16, color: "#52525b", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Tétel hozzáadása a katalógusból
          </button>
          {dropOpen && (
            <div style={{ position: "absolute", zIndex: 50, top: "100%", marginTop: 6, left: 0, right: 0, background: "#18181b", border: "1px solid #3f3f46", borderRadius: 14, boxShadow: "0 20px 40px #00000066", overflow: "hidden" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #27272a" }}>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés…" style={{ width: "100%", background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const }}/>
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

        {/* Custom item */}
        <button onClick={() => { setShowCustom(v => !v); setDropOpen(false) }} style={{ width: "100%", border: "2px dashed #4f3f46", background: "none", borderRadius: 14, padding: 14, color: "#e879f9", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Egyéni tétel hozzáadása
        </button>
        {showCustom && (
          <div style={{ background: "#18181b", border: "1px solid #4f3f46", borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#e879f9", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Egyéni tétel</div>
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>Tétel neve</label>
              <input value={customItem.name} onChange={e => setCustomItem(p => ({ ...p, name: e.target.value }))} placeholder="pl. Speciális munka" style={S.input}/>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Egység</label>
                <select value={customItem.unit} onChange={e => setCustomItem(p => ({ ...p, unit: e.target.value }))} style={{ ...S.input, cursor: "pointer" }}>
                  {["m²","fm","db","óra","m³","kg"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Anyag ára (Ft/egység)</label>
                <input type="number" value={customItem.matPrice} onChange={e => setCustomItem(p => ({ ...p, matPrice: e.target.value }))} placeholder="0" style={S.input}/>
              </div>
            </div>
            <div style={{ marginTop: 10, marginBottom: 12 }}>
              <label style={S.label}>Munkadíj (Ft/egység)</label>
              <input type="number" value={customItem.laborPrice} onChange={e => setCustomItem(p => ({ ...p, laborPrice: e.target.value }))} placeholder="0" style={S.input}/>
            </div>
            <button onClick={addCustomItem} style={{ width: "100%", padding: "11px", borderRadius: 10, background: "#e879f9", color: "#1a001a", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Hozzáadás
            </button>
          </div>
        )}

        {/* Notes */}
        <div style={S.card}>
          <label style={S.label}>Megjegyzések</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="pl. Az ár nem tartalmazza az állványzat költségét. Fizetési határidő: 15 nap." rows={3} style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }}/>
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#18181b", borderTop: "1px solid #27272a", padding: "12px 16px 20px", boxShadow: "0 -20px 40px #09090bcc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Nettó", val: fmt(totals.net), color: "#d4d4d8" },
              { label: "ÁFA 27%", val: fmt(totals.vat), color: "#d4d4d8" },
              { label: "Bruttó", val: fmt(totals.gross), color: "#fbbf24", highlight: true },
            ].map(s => (
              <div key={s.label} style={{ background: s.highlight ? "#fbbf2411" : "#09090b", border: s.highlight ? "1px solid #fbbf2433" : "none", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: s.highlight ? "#f59e0b" : "#52525b", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: s.highlight ? 14 : 12, fontWeight: 500, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 8 }}>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 14px", borderRadius: 12, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>←</button>
            <button onClick={handleSave} disabled={saving || items.length === 0} style={{ borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13, border: "1px solid #3f3f46", background: "#27272a", color: items.length === 0 ? "#52525b" : "#d4d4d8", cursor: items.length === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? "Mentés…" : "💾 Mentés"}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button onClick={() => handlePDF(true)} disabled={pdfState !== "idle" || items.length === 0} style={{ borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 12, border: "none", background: pdfState === "done" ? "#22c55e" : items.length === 0 ? "#27272a" : "#fbbf24", color: pdfState === "done" ? "#fff" : items.length === 0 ? "#52525b" : "#1c1917", cursor: items.length === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {pdfState === "generating" ? "…" : pdfState === "done" ? "✓" : "📄 PDF"}
              </button>
              <button onClick={handleEmail} disabled={emailState !== "idle" || items.length === 0} style={{ borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 12, border: "none", background: emailState === "done" ? "#22c55e" : emailState === "error" ? "#f87171" : items.length === 0 ? "#27272a" : "#3b82f6", color: items.length === 0 ? "#52525b" : "#fff", cursor: items.length === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {emailState === "sending" ? "…" : emailState === "done" ? "✓ Elküldve" : emailState === "error" ? "Hiba" : "📧 Email"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
