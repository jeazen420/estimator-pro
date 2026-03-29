"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, saveProject } from "@/lib/supabase"
import { Project } from "@/types"

// ── Catalog ──────────────────────────────────────────────────────
const CATALOG = [
  { id: 1,  category: "Festés",          name: "Festés – 1 réteg",               unit: "m²", matPrice: 700,    laborPrice: 1400  },
  { id: 2,  category: "Festés",          name: "Festés – 2 réteg + glettelés",   unit: "m²", matPrice: 1100,   laborPrice: 2800  },
  { id: 3,  category: "Gipszkarton",     name: "GK fal szerelés",                unit: "m²", matPrice: 1800,   laborPrice: 3200  },
  { id: 4,  category: "Gipszkarton",     name: "GK álmennyezet",                 unit: "m²", matPrice: 2000,   laborPrice: 4000  },
  { id: 5,  category: "Burkolás",        name: "Laminált padló fektetés",         unit: "m²", matPrice: 5500,   laborPrice: 2200  },
  { id: 6,  category: "Burkolás",        name: "Falicsempe rakás",               unit: "m²", matPrice: 5000,   laborPrice: 5500  },
  { id: 7,  category: "Burkolás",        name: "Padlóburkolat ragasztás",        unit: "m²", matPrice: 3800,   laborPrice: 4500  },
  { id: 8,  category: "Villanyszerelés", name: "Falon belüli kábel",             unit: "fm", matPrice: 650,    laborPrice: 1200  },
  { id: 9,  category: "Villanyszerelés", name: "Aljzat / kapcsoló bef.",         unit: "db", matPrice: 4000,   laborPrice: 4000  },
  { id: 10, category: "Vízszerelés",     name: "Cső fektetés",                   unit: "fm", matPrice: 2000,   laborPrice: 3500  },
  { id: 11, category: "Vízszerelés",     name: "Mosdó beszerelés",              unit: "db", matPrice: 35000,  laborPrice: 12000 },
  { id: 12, category: "Vakolás",         name: "Gépi vakolat",                   unit: "m²", matPrice: 1100,   laborPrice: 2000  },
  { id: 13, category: "Vakolás",         name: "Hőszigetelő rendszer",           unit: "m²", matPrice: 5500,   laborPrice: 4500  },
  { id: 14, category: "Ács",             name: "Szarufa csere",                  unit: "fm", matPrice: 3500,   laborPrice: 5500  },
  { id: 15, category: "Klíma",           name: "Split klíma telepítés",          unit: "db", matPrice: 160000, laborPrice: 35000 },
  { id: 16, category: "Bontás",          name: "Falburkolat bontás",             unit: "m²", matPrice: 200,    laborPrice: 1200  },
  { id: 17, category: "Bontás",          name: "Padló bontás",                   unit: "m²", matPrice: 100,    laborPrice: 1000  },
  { id: 18, category: "Szigetelés",      name: "Tetőszigetelés",                 unit: "m²", matPrice: 3500,   laborPrice: 3000  },
  { id: 19, category: "Ajtó / Ablak",    name: "Beltéri ajtó csere",             unit: "db", matPrice: 45000,  laborPrice: 15000 },
  { id: 20, category: "Ajtó / Ablak",    name: "Ablak beépítés",                 unit: "db", matPrice: 80000,  laborPrice: 20000 },
]

const CAT_COLORS: Record<string, string> = {
  Festés: "#F59E0B", Gipszkarton: "#60A5FA", Burkolás: "#34D399",
  Villanyszerelés: "#A78BFA", Vízszerelés: "#38BDF8", Vakolás: "#FB923C",
  Ács: "#86EFAC", Klíma: "#F472B6", Bontás: "#F87171",
  Szigetelés: "#6EE7B7", "Ajtó / Ablak": "#FCD34D",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n)
const VAT = 0.27

interface Item {
  uid: string; category: string; name: string; unit: string
  qty: number; matPrice: number; laborPrice: number
}

interface CustomItemForm {
  category: string; name: string; unit: string; matPrice: number; laborPrice: number
}

function makeUid() { return Math.random().toString(36).slice(2) }

function emptyProject(): Project {
  return {
    id: crypto.randomUUID(), name: "Új projekt", address: "",
    markupPct: 20, vatPct: 27, currency: "HUF",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: "draft", createdAt: new Date().toISOString(),
    client: { id: "", name: "", address: "", email: "", phone: "" }, items: [],
    notes: "",
  }
}

// ── PDF Generator (jsPDF via npm package) ─────────────────────────
async function generatePDF(
  project: any, items: Item[], markup: number,
  contractorName: string, contractorEmail: string,
  contractorPhone: string, contractorTax: string, contractorAddress: string,
  notes: string
): Promise<string> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  const totals = items.reduce((a, it) => {
    const net = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    return { net: a.net + net, vat: a.vat + net * VAT, gross: a.gross + net * (1 + VAT) }
  }, { net: 0, vat: 0, gross: 0 })

  const toAscii = (s: string) => s
    .replace(/á/g,"a").replace(/Á/g,"A").replace(/é/g,"e").replace(/É/g,"E")
    .replace(/í/g,"i").replace(/Í/g,"I").replace(/ó/g,"o").replace(/Ó/g,"O")
    .replace(/ö/g,"o").replace(/Ö/g,"O").replace(/ő/g,"o").replace(/Ő/g,"O")
    .replace(/ú/g,"u").replace(/Ú/g,"U").replace(/ü/g,"u").replace(/Ü/g,"U")
    .replace(/ű/g,"u").replace(/Ű/g,"U")

  const W = 210
  // Amber header bar
  doc.setFillColor(251, 191, 36)
  doc.rect(0, 0, W, 22, "F")
  doc.setTextColor(28, 25, 23)
  doc.setFontSize(16); doc.setFont("helvetica", "bold")
  doc.text("ARAJANLAT", 14, 14)
  doc.setFontSize(9); doc.setFont("helvetica", "normal")
  doc.text(`Kelt: ${new Date().toLocaleDateString("hu-HU")}`, W - 14, 9, { align: "right" })
  doc.text(`Ervenyes: ${project.validUntil}`, W - 14, 15, { align: "right" })

  // Sub-header: parties
  doc.setTextColor(0, 0, 0)
  doc.setFillColor(245, 245, 245)
  doc.rect(0, 22, W, 40, "F")

  doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal")
  doc.text("VALLALKOZO", 14, 30)
  doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(10)
  doc.text(toAscii(contractorName), 14, 37)
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
  if (contractorAddress) doc.text(toAscii(contractorAddress), 14, 43)
  if (contractorTax)     doc.text(`Adoszam: ${contractorTax}`, 14, 48)
  if (contractorPhone)   doc.text(`Tel: ${contractorPhone}`, 14, 53)
  if (contractorEmail)   doc.text(contractorEmail, 14, 58)

  doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal")
  doc.text("MEGRENDELO", W / 2 + 5, 30)
  doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(10)
  doc.text(toAscii(project.client.name || "—"), W / 2 + 5, 37)
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
  if (project.client.address) doc.text(toAscii(project.client.address), W / 2 + 5, 43)
  if (project.client.email)   doc.text(project.client.email, W / 2 + 5, 48)
  if ((project.client as any).phone) doc.text((project.client as any).phone, W / 2 + 5, 53)

  // Project name
  doc.setFillColor(28, 25, 23)
  doc.rect(0, 62, W, 10, "F")
  doc.setTextColor(251, 191, 36); doc.setFont("helvetica", "bold"); doc.setFontSize(9)
  doc.text(toAscii(`PROJEKT: ${project.name}`), 14, 69)
  if (project.address) doc.text(toAscii(`Helyszin: ${project.address}`), W - 14, 69, { align: "right" })

  // Table header
  let y = 82
  doc.setFillColor(30, 30, 30); doc.rect(14, y - 6, W - 28, 8, "F")
  doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "bold")
  doc.text("Tetel", 16, y)
  doc.text("Kat.", 105, y)
  doc.text("Egys", 130, y)
  doc.text("Menny.", 145, y)
  doc.text("Netto", 163, y)
  doc.text("Brutto", 182, y)

  doc.setTextColor(0, 0, 0)
  items.forEach((it, i) => {
    y += 9
    if (y > 260) { doc.addPage(); y = 20 }
    if (i % 2 === 1) { doc.setFillColor(248, 248, 248); doc.rect(14, y - 6, W - 28, 9, "F") }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(20, 20, 20)
    const net   = (it.matPrice + it.laborPrice) * it.qty * (1 + markup / 100)
    const gross = net * (1 + VAT)
    doc.text(toAscii(it.name).slice(0, 38), 16, y)
    doc.text(toAscii(it.category).slice(0, 14), 105, y)
    doc.text(it.unit, 130, y)
    doc.text(String(it.qty), 148, y, { align: "right" })
    doc.text(fmt(net), 175, y, { align: "right" })
    doc.text(fmt(gross), W - 15, y, { align: "right" })
  })

  // Totals box
  y += 14
  doc.setDrawColor(220, 220, 220); doc.line(14, y - 6, W - 14, y - 6)
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80)
  doc.text("Netto osszesen:", 120, y); doc.text(fmt(totals.net), W - 15, y, { align: "right" })
  y += 7
  doc.text("AFA (27%):", 120, y); doc.text(fmt(totals.vat), W - 15, y, { align: "right" })
  y += 7
  doc.setFillColor(251, 191, 36); doc.rect(14, y - 6, W - 28, 10, "F")
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(28, 25, 23)
  doc.text("FIZETENDO OSSZEG:", 16, y + 1)
  doc.text(fmt(totals.gross), W - 15, y + 1, { align: "right" })

  // Notes
  if (notes) {
    y += 18
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
    doc.text("MEGJEGYZES:", 14, y)
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(40, 40, 40)
    const lines = doc.splitTextToSize(toAscii(notes), W - 28)
    doc.text(lines, 14, y + 6)
  }

  // Footer
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(160, 160, 160)
  doc.text("Keszult: Estimator Pro  |  Az arajanlat a megallapodas alapjat kepezi, jogi koteloereje nincs.", 14, 287)

  const base64 = doc.output("datauristring")
  doc.save(`arajanlat-${toAscii(project.name).replace(/\s+/g, "-")}.pdf`)
  return base64
}

// ── Main Component ────────────────────────────────────────────────
export default function EstimatorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id as string | undefined

  const [project, setProject] = useState<any>(emptyProject())
  const [items, setItems] = useState<Item[]>([])
  const [markup, setMarkup] = useState(20)
  const [notes, setNotes] = useState("")
  const [dropOpen, setDropOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pdfState, setPdfState] = useState<"idle" | "generating" | "done">("idle")
  const [emailState, setEmailState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [saving, setSaving] = useState(false)
  const [contractor, setContractor] = useState({ name: "", email: "", phone: "", tax_number: "", address: "" })
  const [lastPdfBase64, setLastPdfBase64] = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [customForm, setCustomForm] = useState<CustomItemForm>({
    category: "Egyéb", name: "", unit: "m²", matPrice: 0, laborPrice: 0
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load session + project
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }

      const { data: c } = await supabase
        .from("contractors").select("*").eq("user_id", session.user.id).single()
      if (c) setContractor({ name: c.name ?? "", email: c.email ?? "", phone: c.phone ?? "", tax_number: c.tax_number ?? "", address: c.address ?? "" })

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
        status: row.status, createdAt: row.created_at, notes: row.notes ?? "",
        client: { id: row.client?.id ?? "", name: row.client?.name ?? "", address: row.client?.address ?? "", email: row.client?.email ?? "", phone: row.client?.phone ?? "" },
        items: [],
      })
      setMarkup(Number(row.markup_pct))
      setNotes(row.notes ?? "")
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
  const totals = items.reduce((a, it) => {
    const c = calc(it)
    return { net: a.net + c.net, vat: a.vat + c.vat, gross: a.gross + c.gross }
  }, { net: 0, vat: 0, gross: 0 })

  const addItem = (cat: typeof CATALOG[0]) => {
    setItems(prev => [...prev, { uid: makeUid(), category: cat.category, name: cat.name, unit: cat.unit, qty: 1, matPrice: cat.matPrice, laborPrice: cat.laborPrice }])
    setDropOpen(false); setSearch("")
  }

  const addCustomItem = () => {
    if (!customForm.name) return
    setItems(prev => [...prev, { uid: makeUid(), ...customForm }])
    setCustomOpen(false)
    setCustomForm({ category: "Egyéb", name: "", unit: "m²", matPrice: 0, laborPrice: 0 })
  }

  const handleSave = async () => {
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert("Nem vagy bejelentkezve!"); return }
      const proj = {
        ...project, markupPct: markup, notes,
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
      const base64 = await generatePDF(
        project, items, markup,
        contractor.name, contractor.email, contractor.phone, contractor.tax_number, contractor.address,
        notes
      )
      setLastPdfBase64(base64)
      setPdfState("done")
      setTimeout(() => setPdfState("idle"), 4000)
    } catch (e) {
      console.error(e)
      alert("PDF generálási hiba!")
      setPdfState("idle")
    }
  }

  const handleEmail = async () => {
    if (!project.client.email) { alert("Add meg az ügyfél email címét!"); return }
    if (items.length === 0) { alert("Adj hozzá legalább egy tételt!"); return }
    setEmailState("sending")
    try {
      // Generate PDF first if not done yet
      let pdfB64 = lastPdfBase64
      if (!pdfB64) {
        pdfB64 = await generatePDF(
          project, items, markup,
          contractor.name, contractor.email, contractor.phone, contractor.tax_number, contractor.address,
          notes
        )
        setLastPdfBase64(pdfB64)
      }

      // Strip the data URI prefix for the API
      const pdfContent = pdfB64?.replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, "")
        .replace(/^data:application\/pdf;base64,/, "") ?? ""

      const htmlBody = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <div style="background:#fbbf24;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;color:#1c1917">Árajánlat – ${project.name}</h2>
          </div>
          <div style="background:#f5f5f5;padding:24px;border-radius:0 0 8px 8px">
            <p>Kedves <strong>${project.client.name}</strong>!</p>
            <p>Csatolva megtalálja az Ön részére elkészített árajánlatot.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;color:#666">Projekt:</td><td style="padding:8px;font-weight:bold">${project.name}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;color:#666">Helyszín:</td><td style="padding:8px">${project.address || "—"}</td></tr>
              <tr><td style="padding:8px;color:#666">Bruttó összeg:</td><td style="padding:8px;font-weight:bold;color:#1c1917;font-size:18px">${fmt(totals.gross)}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;color:#666">Érvényes:</td><td style="padding:8px">${project.validUntil}</td></tr>
            </table>
            ${notes ? `<p style="color:#666;font-size:13px">Megjegyzés: ${notes}</p>` : ""}
            <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
            <p style="margin:0;color:#999;font-size:12px">Üdvözlettel,<br/><strong>${contractor.name}</strong>${contractor.phone ? ` | ${contractor.phone}` : ""}</p>
          </div>
        </div>
      `

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: project.client.email,
          subject: `Árajánlat – ${project.name}`,
          html: htmlBody,
          pdfBase64: pdfContent,
          fileName: `arajanlat-${project.name.replace(/\s+/g, "-")}.pdf`,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEmailState("done")
      setTimeout(() => setEmailState("idle"), 4000)
    } catch (e: any) {
      console.error(e)
      setEmailState("error")
      setTimeout(() => setEmailState("idle"), 4000)
    }
  }

  const filtered = search
    ? CATALOG.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    : CATALOG
  const grouped = CATALOG.reduce((a: Record<string, typeof CATALOG>, c) => {
    (a[c.category] = a[c.category] || []).push(c); return a
  }, {})

  // ── Styles ────────────────────────────────────────────────────
  const S = {
    page:       { minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5", paddingBottom: 240 } as React.CSSProperties,
    header:     { background: "#18181b", borderBottom: "1px solid #27272a", position: "sticky" as const, top: 0, zIndex: 40 },
    hInner:     { maxWidth: 640, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
    backBtn:    { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
    content:    { maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" },
    card:       { background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: "16px", marginBottom: 12 },
    label:      { fontSize: 11, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 6, display: "block" },
    input:      { width: "100%", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f4f4f5", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const },
    row2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    row3:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
    addBtn:     { width: "100%", border: "2px dashed #3f3f46", background: "none", borderRadius: 14, padding: 16, color: "#52525b", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", marginBottom: 10 },
    bottom:     { position: "fixed" as const, bottom: 0, left: 0, right: 0, zIndex: 50 },
    bInner:     { maxWidth: 640, margin: "0 auto", background: "#18181b", borderTop: "1px solid #27272a", padding: "12px 16px 20px", boxShadow: "0 -20px 40px #09090bcc" },
    tGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 },
    tBox:       { background: "#09090b", borderRadius: 12, padding: "10px 12px", textAlign: "center" as const },
    tLabel:     { fontSize: 10, color: "#52525b", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 3 },
    tVal:       { fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: "#d4d4d8" },
    overlay:    { position: "fixed" as const, inset: 0, background: "#000000bb", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    modal:      { background: "#18181b", border: "1px solid #27272a", borderRadius: 18, padding: 20, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" as const },
  }

  const btnSave = { flex: 1, borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 13, border: "1px solid #3f3f46", background: saving ? "#27272a" : "#27272a", color: saving ? "#52525b" : "#d4d4d8", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" } as React.CSSProperties

  const btnPDF = {
    flex: 2, borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 13, border: "none",
    background: pdfState === "done" ? "#22c55e" : pdfState === "generating" ? "#fbbf2488" : items.length === 0 ? "#27272a" : "#fbbf24",
    color: pdfState === "done" ? "#fff" : pdfState === "generating" ? "#78350f" : items.length === 0 ? "#52525b" : "#1c1917",
    cursor: items.length === 0 ? "not-allowed" : "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
  } as React.CSSProperties

  const btnEmail = {
    flex: 1, borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 13, border: "none",
    background: emailState === "done" ? "#22c55e" : emailState === "error" ? "#ef4444" : emailState === "sending" ? "#3b82f688" : "#3b82f6",
    color: "#fff", cursor: emailState === "sending" ? "not-allowed" : "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
  } as React.CSSProperties

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.hInner}>
          <button onClick={() => router.push("/dashboard")} style={S.backBtn}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 2L3 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", color: "#fbbf24" }}>ESTIMATOR PRO</span>
          </div>
        </div>
      </div>

      <div style={S.content}>

        {/* Project Info */}
        <div style={S.card}>
          <span style={S.label}>Projekt neve</span>
          <input style={{ ...S.input, marginBottom: 12 }} value={project.name}
            onChange={e => setProject((p: any) => ({ ...p, name: e.target.value }))} placeholder="pl. Lakásfelújítás – Bp. IV. ker." />
          <div style={S.row2}>
            <div>
              <span style={S.label}>Helyszín</span>
              <input style={S.input} value={project.address}
                onChange={e => setProject((p: any) => ({ ...p, address: e.target.value }))} placeholder="Cím" />
            </div>
            <div>
              <span style={S.label}>Érvényes</span>
              <input type="date" style={S.input} value={project.validUntil}
                onChange={e => setProject((p: any) => ({ ...p, validUntil: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={S.card}>
          <span style={S.label}>Ügyfél adatai</span>
          <input style={{ ...S.input, marginBottom: 10 }} value={project.client.name}
            onChange={e => setProject((p: any) => ({ ...p, client: { ...p.client, name: e.target.value } }))} placeholder="Ügyfél neve *" />
          <div style={S.row2}>
            <input style={S.input} value={project.client.email}
              onChange={e => setProject((p: any) => ({ ...p, client: { ...p.client, email: e.target.value } }))} placeholder="Email *" type="email" />
            <input style={S.input} value={(project.client as any).phone ?? ""}
              onChange={e => setProject((p: any) => ({ ...p, client: { ...p.client, phone: e.target.value } }))} placeholder="Telefon" />
          </div>
          <input style={{ ...S.input, marginTop: 10 }} value={project.client.address}
            onChange={e => setProject((p: any) => ({ ...p, client: { ...p.client, address: e.target.value } }))} placeholder="Ügyfél címe" />
        </div>

        {/* Markup slider */}
        <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#71717a", minWidth: 90 }}>Árrés: <span style={{ color: "#fbbf24", fontWeight: 700 }}>{markup}%</span></span>
          <input type="range" min={0} max={60} step={1} value={markup}
            onChange={e => setMarkup(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#fbbf24" }} />
        </div>

        {/* Items */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={S.label}>Tételek ({items.length})</span>
          </div>

          {items.map(it => {
            const c = calc(it)
            const color = CAT_COLORS[it.category] ?? "#a1a1aa"
            return (
              <div key={it.uid} style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#e4e4e7" }}>{it.name}</span>
                  <button onClick={() => setItems(p => p.filter(x => x.uid !== it.uid))}
                    style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: 4, fontSize: 14 }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" min={0.1} step={0.1} value={it.qty}
                    onChange={e => setItems(p => p.map(x => x.uid === it.uid ? { ...x, qty: Number(e.target.value) } : x))}
                    style={{ ...S.input, width: 70, padding: "6px 10px", fontSize: 13 }} />
                  <span style={{ fontSize: 12, color: "#71717a" }}>{it.unit}</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ textAlign: "right" as const }}>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{fmt(c.net)} nettó</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>{fmt(c.gross)}</div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Catalog dropdown */}
          <div ref={dropRef} style={{ position: "relative" as const }}>
            <button onClick={() => setDropOpen(p => !p)} style={S.addBtn}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Tétel hozzáadása katalógusból
            </button>
            {dropOpen && (
              <div style={{ position: "absolute" as const, bottom: "100%", left: 0, right: 0, background: "#1c1c1e", border: "1px solid #3f3f46", borderRadius: 14, marginBottom: 4, maxHeight: 320, overflowY: "auto" as const, zIndex: 20 }}>
                <div style={{ padding: "10px 12px", position: "sticky" as const, top: 0, background: "#1c1c1e", borderBottom: "1px solid #3f3f46" }}>
                  <input autoFocus style={{ ...S.input, padding: "8px 12px", fontSize: 13 }} placeholder="Keresés…" value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
                {(search ? filtered : Object.keys(grouped)).map(key => (
                  search
                    ? <button key={(key as any).id} onClick={() => addItem(key as any)}
                        style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 16px", background: "none", border: "none", color: "#d4d4d8", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        <span style={{ color: CAT_COLORS[(key as any).category] ?? "#a1a1aa", marginRight: 6, fontSize: 10 }}>●</span>
                        {(key as any).name}
                      </button>
                    : <div key={key}>
                        <div style={{ padding: "8px 16px 4px", fontSize: 10, color: "#52525b", textTransform: "uppercase" as const, letterSpacing: ".1em" }}>{key}</div>
                        {(grouped as any)[key].map((item: any) => (
                          <button key={item.id} onClick={() => addItem(item)}
                            style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 16px", background: "none", border: "none", color: "#d4d4d8", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            <span style={{ color: CAT_COLORS[item.category] ?? "#a1a1aa", marginRight: 6, fontSize: 10 }}>●</span>
                            {item.name}
                            <span style={{ color: "#52525b", fontSize: 11, marginLeft: 8 }}>{fmt(item.matPrice + item.laborPrice)}/{item.unit}</span>
                          </button>
                        ))}
                      </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setCustomOpen(true)}
            style={{ ...S.addBtn, borderColor: "#7c3aed55", color: "#a78bfa", marginBottom: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Egyéni tétel hozzáadása
          </button>
        </div>

        {/* Notes */}
        <div style={S.card}>
          <span style={S.label}>Megjegyzések</span>
          <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" as const }} value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Pl. fizetési feltételek, anyag pontosítás, különleges feltételek…" />
        </div>

      </div>

      {/* Custom Item Modal */}
      {customOpen && (
        <div style={S.overlay} onClick={() => setCustomOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#f4f4f5" }}>Egyéni tétel</h3>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              <input style={S.input} placeholder="Tétel neve *" value={customForm.name}
                onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))} />
              <div style={S.row2}>
                <input style={S.input} placeholder="Kategória" value={customForm.category}
                  onChange={e => setCustomForm(f => ({ ...f, category: e.target.value }))} />
                <input style={S.input} placeholder="Egység (m², db…)" value={customForm.unit}
                  onChange={e => setCustomForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div style={S.row2}>
                <div>
                  <span style={S.label}>Anyagdíj (Ft)</span>
                  <input type="number" style={S.input} value={customForm.matPrice}
                    onChange={e => setCustomForm(f => ({ ...f, matPrice: Number(e.target.value) }))} />
                </div>
                <div>
                  <span style={S.label}>Munkadíj (Ft)</span>
                  <input type="number" style={S.input} value={customForm.laborPrice}
                    onChange={e => setCustomForm(f => ({ ...f, laborPrice: Number(e.target.value) }))} />
                </div>
              </div>
              {customForm.name && (
                <div style={{ background: "#09090b", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#71717a" }}>
                  Egységár (nettó, árrés nélkül): <span style={{ color: "#fbbf24" }}>{fmt(customForm.matPrice + customForm.laborPrice)}/{customForm.unit}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setCustomOpen(false)}
                  style={{ flex: 1, padding: 12, borderRadius: 12, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", cursor: "pointer", fontFamily: "inherit" }}>
                  Mégse
                </button>
                <button onClick={addCustomItem} disabled={!customForm.name}
                  style={{ flex: 2, padding: 12, borderRadius: 12, background: !customForm.name ? "#27272a" : "#7c3aed", border: "none", color: "#fff", cursor: !customForm.name ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                  Hozzáadás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div style={S.bottom}>
        <div style={S.bInner}>
          <div style={S.tGrid}>
            <div style={S.tBox}>
              <div style={S.tLabel}>Nettó</div>
              <div style={S.tVal}>{fmt(totals.net)}</div>
            </div>
            <div style={S.tBox}>
              <div style={S.tLabel}>ÁFA 27%</div>
              <div style={S.tVal}>{fmt(totals.vat)}</div>
            </div>
            <div style={{ ...S.tBox, background: "#1c1208", border: "1px solid #fbbf2444" }}>
              <div style={{ ...S.tLabel, color: "#fbbf24" }}>Bruttó</div>
              <div style={{ ...S.tVal, color: "#fbbf24", fontSize: 14 }}>{fmt(totals.gross)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving || items.length === 0} style={btnSave}>
              {saving ? "Mentés…" : "💾 Mentés"}
            </button>
            <button onClick={handlePDF} disabled={pdfState === "generating" || items.length === 0} style={btnPDF}>
              {pdfState === "generating" ? "⏳ Generálás…" : pdfState === "done" ? "✅ Letöltve!" : "📄 PDF"}
            </button>
            <button onClick={handleEmail} disabled={emailState === "sending"} style={btnEmail}>
              {emailState === "sending" ? "⏳" : emailState === "done" ? "✅" : emailState === "error" ? "❌" : "✉️"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
