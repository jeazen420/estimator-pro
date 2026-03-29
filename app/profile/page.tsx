"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface ContractorProfile {
  id: string
  name: string
  tax_number: string
  address: string
  email: string
  phone: string
  bank_account: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      const { data } = await supabase.from("contractors").select("*").eq("user_id", session.user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from("contractors").update({
      name: profile.name,
      tax_number: profile.tax_number,
      address: profile.address,
      email: profile.email,
      phone: profile.phone,
      bank_account: profile.bank_account,
    }).eq("id", profile.id)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else alert("Hiba a mentésnél!")
  }

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#09090b", fontFamily: "'DM Sans', sans-serif", color: "#f4f4f5" },
    header: { background: "#18181b", borderBottom: "1px solid #27272a", position: "sticky" as const, top: 0, zIndex: 40 },
    headerInner: { maxWidth: 640, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    content: { maxWidth: 640, margin: "0 auto", padding: "24px 20px" },
    card: { background: "#18181b", border: "1px solid #27272a", borderRadius: 14, padding: 20, marginBottom: 16 },
    title: { fontSize: 12, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase" as const, letterSpacing: ".1em", marginBottom: 16 },
    field: { marginBottom: 14 },
    label: { fontSize: 11, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 6, display: "block" },
    input: { width: "100%", background: "#09090b", border: "1px solid #3f3f46", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" as const },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "#27272a", border: "1px solid #3f3f46", color: "#a1a1aa", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    saveBtn: { padding: "11px 24px", borderRadius: 10, background: saved ? "#22c55e" : "#fbbf24", color: saved ? "#fff" : "#1c1917", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#71717a" }}>Betöltés…</div>

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <button onClick={() => router.push("/dashboard")} style={S.backBtn}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 2L3 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/><rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/><rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", color: "#fbbf24" }}>ESTIMATOR PRO</span>
          </div>
        </div>
      </div>

      <div style={S.content}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "#f4f4f5" }}>Vállalkozói profil</h1>

        {profile && (
          <>
            <div style={S.card}>
              <div style={S.title}>Alapadatok</div>
              <div style={S.field}>
                <label style={S.label}>Vállalkozás neve</label>
                <input value={profile.name} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} style={S.input} placeholder="Nagy Építő Kft."/>
              </div>
              <div style={S.row2}>
                <div style={S.field}>
                  <label style={S.label}>Adószám</label>
                  <input value={profile.tax_number || ""} onChange={e => setProfile(p => p ? { ...p, tax_number: e.target.value } : p)} style={S.input} placeholder="12345678-1-01"/>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Telefon</label>
                  <input value={profile.phone || ""} onChange={e => setProfile(p => p ? { ...p, phone: e.target.value } : p)} style={S.input} placeholder="+36 30 123 4567"/>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>E-mail</label>
                <input type="email" value={profile.email || ""} onChange={e => setProfile(p => p ? { ...p, email: e.target.value } : p)} style={S.input} placeholder="info@vallalkozas.hu"/>
              </div>
              <div style={S.field}>
                <label style={S.label}>Cím</label>
                <input value={profile.address || ""} onChange={e => setProfile(p => p ? { ...p, address: e.target.value } : p)} style={S.input} placeholder="1234 Budapest, Fő utca 1."/>
              </div>
              <div style={S.field}>
                <label style={S.label}>Bankszámlaszám</label>
                <input value={profile.bank_account || ""} onChange={e => setProfile(p => p ? { ...p, bank_account: e.target.value } : p)} style={S.input} placeholder="12345678-12345678-12345678"/>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSave} disabled={saving} style={S.saveBtn}>
                {saving ? "Mentés…" : saved ? "✓ Mentve!" : "Mentés"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
