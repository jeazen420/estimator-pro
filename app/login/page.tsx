"use client"

import { useState, FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/dashboard"

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null); setLoading(true)
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        router.push(nextPath)
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
        })
        if (err) throw err
        if (data.session) router.push(nextPath)
        else setSuccess("Megerősítő e-mail elküldve! Kérjük, ellenőrizd a postaládádat.")
      }
    } catch (err: any) {
      const MSGS: Record<string, string> = {
        "Invalid login credentials": "Hibás e-mail cím vagy jelszó.",
        "User already registered": "Ez az e-mail cím már regisztrált.",
      }
      setError(MSGS[err.message] ?? err.message)
    } finally { setLoading(false) }
  }

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'DM Sans', sans-serif" },
    card: { width: "100%", maxWidth: 400, background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: "32px 28px" },
    logoWrap: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
    logo: { width: 40, height: 40, borderRadius: 10, background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    brandName: { fontSize: 12, fontWeight: 700, letterSpacing: ".18em", color: "#fbbf24" },
    brandSub: { fontSize: 11, color: "#71717a", marginTop: 2 },
    tabs: { display: "flex", background: "#09090b", borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 },
    tab: { flex: 1, padding: "7px 0", borderRadius: 8, background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#71717a", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
    tabActive: { background: "#27272a", color: "#f4f4f5" },
    form: { display: "flex", flexDirection: "column", gap: 16 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, color: "#a1a1aa", fontWeight: 500 },
    input: { background: "#09090b", border: "1px solid #3f3f46", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#f4f4f5", outline: "none", fontFamily: "'DM Sans', sans-serif" },
    errorBox: { display: "flex", alignItems: "center", gap: 8, background: "#450a0a33", border: "1px solid #f8717133", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#f87171" },
    successBox: { display: "flex", alignItems: "center", gap: 8, background: "#064e3b33", border: "1px solid #34d39933", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#34d399" },
    btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4, padding: "12px", borderRadius: 10, background: "#fbbf24", color: "#1c1917", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logoWrap}>
          <div style={S.logo}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
            </svg>
          </div>
          <div>
            <div style={S.brandName}>ESTIMATOR PRO</div>
            <div style={S.brandSub}>Kivitelezői árajánlat-kezelő</div>
          </div>
        </div>

        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(mode === "login" ? S.tabActive : {}) }} onClick={() => { setMode("login"); setError(null) }}>Bejelentkezés</button>
          <button style={{ ...S.tab, ...(mode === "signup" ? S.tabActive : {}) }} onClick={() => { setMode("signup"); setError(null) }}>Regisztráció</button>
        </div>

        <form onSubmit={handleSubmit} style={S.form}>
          {mode === "signup" && (
            <div style={S.field}>
              <label style={S.label}>Vállalkozás neve</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="pl. Nagy Építő Kft." required style={S.input}/>
            </div>
          )}
          <div style={S.field}>
            <label style={S.label}>E-mail cím</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pelda@email.hu" required style={S.input}/>
          </div>
          <div style={S.field}>
            <label style={S.label}>Jelszó</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="legalább 6 karakter" required minLength={6} style={S.input}/>
          </div>
          {error && <div style={S.errorBox}>{error}</div>}
          {success && <div style={S.successBox}>{success}</div>}
          <button type="submit" disabled={loading} style={S.btn}>
            {loading ? "Folyamatban…" : mode === "login" ? "Bejelentkezés" : "Fiók létrehozása"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#09090b" }}/>}>
      <LoginForm />
    </Suspense>
  )
}
