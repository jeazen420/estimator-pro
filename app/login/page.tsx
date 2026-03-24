"use client"

/**
 * /app/login/page.tsx
 * ──────────────────────────────────────────────────────────────────
 * Estimator Pro — Login / Sign-up page.
 *
 * Uses Supabase email+password auth.
 * After successful login, reads the ?next= param and redirects
 * back to the originally requested page (or /dashboard).
 * ──────────────────────────────────────────────────────────────────
 */

import { useState, FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Mode = "login" | "signup"

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const nextPath     = searchParams.get("next") ?? "/dashboard"

  const [mode, setMode]         = useState<Mode>("login")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [name, setName]         = useState("")   // signup only
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === "login") {
        // ── Sign in ────────────────────────────────────────────
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInErr) throw signInErr
        router.push(nextPath)

      } else {
        // ── Sign up ────────────────────────────────────────────
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },     // stored in auth.users.raw_user_meta_data
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        })
        if (signUpErr) throw signUpErr

        if (data.session) {
          // Email confirmation disabled in Supabase settings → direct login
          router.push(nextPath)
        } else {
          // Email confirmation required
          setSuccess(
            "Megerősítő e-mail elküldve! Kérjük, ellenőrizd a postaládádat."
          )
        }
      }
    } catch (err: any) {
      const MSG: Record<string, string> = {
        "Invalid login credentials":
          "Hibás e-mail cím vagy jelszó.",
        "User already registered":
          "Ez az e-mail cím már regisztrált.",
        "Password should be at least 6 characters":
          "A jelszónak legalább 6 karakter hosszúnak kell lennie.",
        "Email rate limit exceeded":
          "Túl sok kísérlet. Próbáld újra néhány perc múlva.",
      }
      setError(MSG[err.message] ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
              <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
            </svg>
          </div>
          <div>
            <div style={styles.brandName}>ESTIMATOR PRO</div>
            <div style={styles.brandSub}>Kivitelezői árajánlat-kezelő</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            onClick={() => { setMode("login"); setError(null) }}
          >
            Bejelentkezés
          </button>
          <button
            style={{ ...styles.tab, ...(mode === "signup" ? styles.tabActive : {}) }}
            onClick={() => { setMode("signup"); setError(null) }}
          >
            Regisztráció
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {mode === "signup" && (
            <div style={styles.field}>
              <label style={styles.label}>Vállalkozás neve</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. Nagy Építő Kft."
                required
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
                onBlur={(e)  => (e.target.style.borderColor = "#3f3f46")}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>E-mail cím</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pelda@email.hu"
              required
              autoComplete="email"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
              onBlur={(e)  => (e.target.style.borderColor = "#3f3f46")}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="legalább 6 karakter"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
              onBlur={(e)  => (e.target.style.borderColor = "#3f3f46")}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.2"/>
                <path d="M7 4v4M7 10v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div style={styles.successBox}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#34d399" strokeWidth="1.2"/>
                <path d="M4 7l2 2 4-4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnDisabled : {}),
            }}
          >
            {loading ? (
              <>
                <svg style={styles.spin} width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2a6 6 0 100 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Folyamatban…
              </>
            ) : mode === "login" ? (
              "Bejelentkezés"
            ) : (
              "Fiók létrehozása"
            )}
          </button>
        </form>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes ep-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Inline styles (no Tailwind dependency for this isolated page) ──
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#09090b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'DM Sans', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 16,
    padding: "32px 28px",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logo: {
    width: 40, height: 40,
    borderRadius: 10,
    background: "#fbbf24",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontSize: 12, fontWeight: 700,
    letterSpacing: ".18em", color: "#fbbf24",
  },
  brandSub: { fontSize: 11, color: "#71717a", marginTop: 2 },
  tabs: {
    display: "flex",
    background: "#09090b",
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
    gap: 3,
  },
  tab: {
    flex: 1, padding: "7px 0",
    borderRadius: 8,
    background: "none", border: "none",
    fontSize: 13, fontWeight: 500,
    color: "#71717a", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all .15s",
  },
  tabActive: {
    background: "#27272a",
    color: "#f4f4f5",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#a1a1aa", fontWeight: 500 },
  input: {
    background: "#09090b",
    border: "1px solid #3f3f46",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14, color: "#f4f4f5",
    outline: "none",
    transition: "border-color .15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#450a0a33",
    border: "1px solid #f8717133",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 12, color: "#f87171",
  },
  successBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#064e3b33",
    border: "1px solid #34d39933",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 12, color: "#34d399",
  },
  submitBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 4,
    padding: "12px",
    borderRadius: 10,
    background: "#fbbf24",
    color: "#1c1917",
    fontSize: 14, fontWeight: 700,
    border: "none", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "background .15s",
  },
  submitBtnDisabled: {
    background: "#78350f",
    color: "#92400e",
    cursor: "not-allowed",
  },
  spin: { animation: "ep-spin .8s linear infinite" },
}
