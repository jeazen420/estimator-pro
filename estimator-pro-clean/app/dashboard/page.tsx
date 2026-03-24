"use client"

/**
 * /app/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────
 * Estimator Pro — Dashboard
 *
 * Loads the `project_totals` view from Supabase and renders a
 * card-based project list in the same industrial dark aesthetic
 * as the main estimator UI.
 *
 * Depends on:
 *   lib/supabase.ts   (getProjects, getCurrentContractor)
 *   types/index.ts
 *
 * Route: /dashboard
 * Auth guard: redirects to /login if no session.
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase, getProjects, getCurrentContractor } from "@/lib/supabase"

// ── Types coming from project_totals view ────────────────────────
interface ProjectRow {
  project_id: string
  name: string
  status: "draft" | "sent" | "accepted" | "rejected"
  currency: string
  markup_pct: number
  vat_pct: number
  valid_until: string | null
  created_at: string
  client_name: string
  item_count: number
  total_net: number
  total_vat: number
  total_gross: number
}

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (n: number, currency = "HUF") =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n ?? 0)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const STATUS_META: Record<
  ProjectRow["status"],
  { label: string; color: string; bg: string }
> = {
  draft:    { label: "Vázlat",      color: "#a1a1aa", bg: "#27272a" },
  sent:     { label: "Elküldve",    color: "#60a5fa", bg: "#1e3a5f" },
  accepted: { label: "Elfogadva",   color: "#34d399", bg: "#064e3b" },
  rejected: { label: "Elutasítva", color: "#f87171", bg: "#450a0a" },
}

type SortKey = "created_at" | "total_gross" | "client_name" | "status"
type Filter  = "all" | ProjectRow["status"]

// ── Component ────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects]         = useState<ProjectRow[]>([])
  const [contractor, setContractor]     = useState<{ name: string } | null>(null)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [filter, setFilter]             = useState<Filter>("all")
  const [sortKey, setSortKey]           = useState<SortKey>("created_at")
  const [sortAsc, setSortAsc]           = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }

      const [contractorData, projectData] = await Promise.all([
        getCurrentContractor(),
        getProjects(),
      ])
      setContractor(contractorData)
      setProjects((projectData ?? []) as ProjectRow[])
      setLoading(false)
    }
    load()
  }, [router])

  // ── Filtered + sorted list ────────────────────────────────────
  const visible = useMemo(() => {
    let list = [...projects]

    // Status filter
    if (filter !== "all") list = list.filter((p) => p.status === filter)

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      let va: any = a[sortKey]
      let vb: any = b[sortKey]
      if (typeof va === "string") va = va.toLowerCase()
      if (typeof vb === "string") vb = vb.toLowerCase()
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    return list
  }, [projects, filter, search, sortKey, sortAsc])

  // ── Summary stats ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    projects.length,
    accepted: projects.filter((p) => p.status === "accepted").length,
    sent:     projects.filter((p) => p.status === "sent").length,
    gross:    projects.reduce((s, p) => s + (p.total_gross ?? 0), 0),
  }), [projects])

  // ── Sort toggle ───────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  // ── Delete (soft: status → rejected) ─────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törölni szeretnéd ezt a projektet?")) return
    setDeletingId(id)
    await supabase
      .from("projects")
      .update({ status: "rejected" })
      .eq("id", id)
    setProjects((prev) =>
      prev.map((p) => p.project_id === id ? { ...p, status: "rejected" } : p)
    )
    setDeletingId(null)
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />

  return (
    <div className="ep-dash">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="ep-header">
        <div className="ep-header-inner">
          <div className="ep-brand">
            <div className="ep-logo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
                <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
              </svg>
            </div>
            <div>
              <div className="ep-brand-name">ESTIMATOR PRO</div>
              <div className="ep-brand-sub">{contractor?.name ?? "Dashboard"}</div>
            </div>
          </div>
          <button
            className="ep-btn-primary"
            onClick={() => router.push("/estimator")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Új árajánlat
          </button>
        </div>
      </header>

      <div className="ep-content">

        {/* ── STAT CARDS ─────────────────────────────────── */}
        <div className="ep-stats">
          <StatCard label="Összes projekt" value={stats.total} suffix="db" accent="#71717a"/>
          <StatCard label="Elküldve" value={stats.sent} suffix="db" accent="#60a5fa"/>
          <StatCard label="Elfogadva" value={stats.accepted} suffix="db" accent="#34d399"/>
          <StatCard label="Össz. forgalom" value={fmt(stats.gross)} accent="#fbbf24" large/>
        </div>

        {/* ── CONTROLS ───────────────────────────────────── */}
        <div className="ep-controls">
          {/* Search */}
          <div className="ep-search-wrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ep-search-icon">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="ep-search"
              placeholder="Projekt vagy ügyfél neve…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter pills */}
          <div className="ep-pills">
            {(["all", "draft", "sent", "accepted", "rejected"] as Filter[]).map((f) => (
              <button
                key={f}
                className={`ep-pill ${filter === f ? "ep-pill-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Mind" : STATUS_META[f as ProjectRow["status"]].label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ep-sort">
            <span className="ep-sort-label">Rendez:</span>
            {(
              [
                ["created_at",  "Dátum"],
                ["total_gross", "Összeg"],
                ["client_name", "Ügyfél"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                className={`ep-sort-btn ${sortKey === key ? "ep-sort-active" : ""}`}
                onClick={() => toggleSort(key)}
              >
                {label}
                {sortKey === key && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 3 }}>
                    <path
                      d={sortAsc ? "M2 7l3-4 3 4" : "M2 3l3 4 3-4"}
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── PROJECT GRID ───────────────────────────────── */}
        {visible.length === 0 ? (
          <EmptyState hasProjects={projects.length > 0} onNew={() => router.push("/estimator")}/>
        ) : (
          <div className="ep-grid">
            {visible.map((p, i) => (
              <ProjectCard
                key={p.project_id}
                project={p}
                index={i}
                onOpen={() => router.push(`/estimator/${p.project_id}`)}
                onDelete={() => handleDelete(p.project_id)}
                isDeleting={deletingId === p.project_id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── GLOBAL STYLES ──────────────────────────────────────── */}
      <style>{STYLES}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({
  label, value, suffix, accent, large,
}: {
  label: string; value: string | number; suffix?: string; accent: string; large?: boolean
}) {
  return (
    <div className="ep-stat" style={{ borderTopColor: accent }}>
      <div className="ep-stat-label">{label}</div>
      <div className="ep-stat-value" style={{ color: accent }}>
        {value}{suffix && <span className="ep-stat-suffix"> {suffix}</span>}
      </div>
    </div>
  )
}

function ProjectCard({
  project: p, index, onOpen, onDelete, isDeleting,
}: {
  project: ProjectRow
  index: number
  onOpen: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const st = STATUS_META[p.status]
  const [hover, setHover] = useState(false)

  return (
    <div
      className="ep-card"
      style={{ animationDelay: `${index * 40}ms` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Top bar */}
      <div className="ep-card-top">
        <div className="ep-card-client">
          <div className="ep-card-avatar" style={{ background: stringToColor(p.client_name) }}>
            {p.client_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="ep-card-client-name">{p.client_name}</div>
            <div className="ep-card-project-name">{p.name}</div>
          </div>
        </div>
        <span
          className="ep-badge"
          style={{ color: st.color, background: st.bg }}
        >
          {st.label}
        </span>
      </div>

      {/* Divider */}
      <div className="ep-card-divider" />

      {/* Metrics row */}
      <div className="ep-card-metrics">
        <div className="ep-metric">
          <div className="ep-metric-label">Bruttó összeg</div>
          <div className="ep-metric-value ep-metric-primary">
            {fmt(p.total_gross, p.currency)}
          </div>
        </div>
        <div className="ep-metric ep-metric-right">
          <div className="ep-metric-label">Nettó</div>
          <div className="ep-metric-value">{fmt(p.total_net, p.currency)}</div>
        </div>
        <div className="ep-metric ep-metric-right">
          <div className="ep-metric-label">Tételek</div>
          <div className="ep-metric-value">{p.item_count} db</div>
        </div>
      </div>

      {/* Footer */}
      <div className="ep-card-footer">
        <div className="ep-card-date">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="2" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1"/>
            <path d="M1 5h10" stroke="currentColor" strokeWidth="1"/>
            <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          {fmtDate(p.created_at)}
          {p.valid_until && (
            <span className="ep-valid">· Érvényes: {fmtDate(p.valid_until)}</span>
          )}
        </div>
        <div className="ep-card-actions">
          <button
            className="ep-btn-ghost"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            disabled={isDeleting}
            title="Törlés"
          >
            {isDeleting ? (
              <svg className="ep-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1a6 6 0 100 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5h6.4L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <button className="ep-btn-open" onClick={onOpen}>
            Megnyitás
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hover accent line */}
      <div className="ep-card-accent" style={{ opacity: hover ? 1 : 0 }} />
    </div>
  )
}

function EmptyState({
  hasProjects, onNew,
}: { hasProjects: boolean; onNew: () => void }) {
  return (
    <div className="ep-empty">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect x="8" y="8" width="40" height="40" rx="10" stroke="#3f3f46" strokeWidth="1.5" strokeDasharray="6 4"/>
        <path d="M28 20v16M20 28h16" stroke="#52525b" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p className="ep-empty-title">
        {hasProjects ? "Nincs találat a szűrőre" : "Még nincs árajánlat"}
      </p>
      <p className="ep-empty-sub">
        {hasProjects
          ? "Próbálj más keresési feltételt."
          : "Hozd létre az első projektedet az alábbi gombbal."}
      </p>
      {!hasProjects && (
        <button className="ep-btn-primary" onClick={onNew}>
          Új árajánlat létrehozása
        </button>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="ep-loading">
      <div className="ep-logo ep-logo-lg">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
          <rect x="9" y="2" width="5" height="5" fill="#1c1917" rx="1"/>
          <rect x="2" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
          <rect x="9" y="9" width="5" height="5" fill="#1c1917" rx="1"/>
        </svg>
      </div>
      <div className="ep-loading-bar"><div className="ep-loading-fill"/></div>
      <style>{STYLES}</style>
    </div>
  )
}

// ── Utility: deterministic color from string ──────────────────────
function stringToColor(str: string): string {
  const PALETTE = [
    "#7c3aed","#0f766e","#b45309","#0369a1",
    "#be185d","#15803d","#c2410c","#1d4ed8",
  ]
  let hash = 0
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return PALETTE[hash % PALETTE.length]
}

// ── Styles ────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ep-dash {
    min-height: 100vh;
    background: #09090b;
    font-family: 'DM Sans', sans-serif;
    color: #f4f4f5;
  }

  /* ── Header ── */
  .ep-header {
    background: #18181b;
    border-bottom: 1px solid #27272a;
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .ep-header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ep-brand { display: flex; align-items: center; gap: 10px; }
  .ep-logo {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: #fbbf24;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ep-logo-lg { width: 56px; height: 56px; border-radius: 14px; }
  .ep-logo-lg svg { width: 28px; height: 28px; }
  .ep-brand-name { font-size: 11px; font-weight: 700; letter-spacing: .18em; color: #fbbf24; }
  .ep-brand-sub { font-size: 11px; color: #71717a; margin-top: 1px; }

  /* ── Content ── */
  .ep-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 24px 60px;
  }

  /* ── Stat cards ── */
  .ep-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 28px;
  }
  .ep-stat {
    background: #18181b;
    border: 1px solid #27272a;
    border-top-width: 2px;
    border-radius: 12px;
    padding: 16px 18px;
  }
  .ep-stat-label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .ep-stat-value { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; }
  .ep-stat-suffix { font-size: 13px; font-weight: 400; }

  /* ── Controls ── */
  .ep-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .ep-search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 320px;
  }
  .ep-search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: #52525b;
    pointer-events: none;
  }
  .ep-search {
    width: 100%;
    background: #18181b;
    border: 1px solid #3f3f46;
    border-radius: 10px;
    padding: 8px 12px 8px 34px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: #f4f4f5;
    outline: none;
    transition: border-color .15s;
  }
  .ep-search::placeholder { color: #52525b; }
  .ep-search:focus { border-color: #fbbf24; }

  .ep-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .ep-pill {
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    border: 1px solid #3f3f46;
    background: none;
    color: #71717a;
    cursor: pointer;
    transition: all .15s;
  }
  .ep-pill:hover { border-color: #71717a; color: #a1a1aa; }
  .ep-pill-active { background: #fbbf2422; border-color: #fbbf24; color: #fbbf24; }

  .ep-sort { display: flex; align-items: center; gap: 6px; margin-left: auto; }
  .ep-sort-label { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; }
  .ep-sort-btn {
    display: flex; align-items: center;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    background: none;
    border: 1px solid #27272a;
    color: #71717a;
    cursor: pointer;
    transition: all .15s;
    white-space: nowrap;
  }
  .ep-sort-btn:hover { border-color: #3f3f46; color: #a1a1aa; }
  .ep-sort-active { border-color: #52525b; color: #d4d4d8; }

  /* ── Grid ── */
  .ep-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 14px;
  }

  /* ── Card ── */
  .ep-card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 14px;
    padding: 18px;
    position: relative;
    overflow: hidden;
    cursor: default;
    animation: ep-fadein .35s ease both;
    transition: border-color .2s, transform .2s;
  }
  .ep-card:hover {
    border-color: #3f3f46;
    transform: translateY(-2px);
  }
  @keyframes ep-fadein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }

  .ep-card-accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: #fbbf24;
    transition: opacity .2s;
  }

  .ep-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  .ep-card-client { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ep-card-avatar {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 700; color: #fff;
    flex-shrink: 0;
    opacity: .85;
  }
  .ep-card-client-name {
    font-size: 14px; font-weight: 500; color: #f4f4f5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 180px;
  }
  .ep-card-project-name {
    font-size: 11px; color: #71717a; margin-top: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 180px;
  }

  .ep-badge {
    font-size: 11px; font-weight: 500;
    padding: 3px 9px;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .ep-card-divider { height: 1px; background: #27272a; margin: 0 0 14px; }

  .ep-card-metrics {
    display: flex;
    gap: 0;
    margin-bottom: 14px;
  }
  .ep-metric { flex: 1; }
  .ep-metric-right { text-align: right; }
  .ep-metric-label { font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
  .ep-metric-value { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #a1a1aa; }
  .ep-metric-primary { font-size: 16px; color: #fbbf24; }

  .ep-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ep-card-date {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; color: #52525b;
  }
  .ep-valid { color: #3f3f46; }
  .ep-card-actions { display: flex; align-items: center; gap: 6px; }

  /* ── Buttons ── */
  .ep-btn-primary {
    display: flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 10px;
    background: #fbbf24;
    color: #1c1917;
    font-weight: 700; font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    border: none; cursor: pointer;
    transition: background .15s, transform .1s;
  }
  .ep-btn-primary:hover { background: #fcd34d; }
  .ep-btn-primary:active { transform: scale(.97); }

  .ep-btn-open {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 14px;
    border-radius: 8px;
    background: #27272a;
    color: #d4d4d8;
    font-size: 12px; font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    border: 1px solid #3f3f46;
    cursor: pointer;
    transition: all .15s;
  }
  .ep-btn-open:hover { background: #3f3f46; color: #fbbf24; border-color: #52525b; }

  .ep-btn-ghost {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: none;
    border: 1px solid #27272a;
    color: #52525b;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
  }
  .ep-btn-ghost:hover { background: #450a0a22; color: #f87171; border-color: #f8717133; }
  .ep-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Empty ── */
  .ep-empty {
    display: flex; flex-direction: column; align-items: center;
    gap: 12px;
    padding: 80px 24px;
    text-align: center;
  }
  .ep-empty-title { font-size: 16px; font-weight: 500; color: #52525b; }
  .ep-empty-sub { font-size: 13px; color: #3f3f46; max-width: 300px; line-height: 1.6; }

  /* ── Loading ── */
  .ep-loading {
    min-height: 100vh;
    background: #09090b;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 20px;
    font-family: 'DM Sans', sans-serif;
  }
  .ep-loading-bar {
    width: 160px; height: 2px;
    background: #27272a;
    border-radius: 999px;
    overflow: hidden;
  }
  .ep-loading-fill {
    height: 100%;
    background: #fbbf24;
    border-radius: 999px;
    animation: ep-load 1.4s ease-in-out infinite;
  }
  @keyframes ep-load {
    0%   { width: 0%;   margin-left: 0;    }
    50%  { width: 60%;  margin-left: 20%;  }
    100% { width: 0%;   margin-left: 100%; }
  }

  /* ── Spinner ── */
  .ep-spin { animation: ep-spin .8s linear infinite; }
  @keyframes ep-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .ep-header-inner, .ep-content { padding-left: 16px; padding-right: 16px; }
    .ep-grid { grid-template-columns: 1fr; }
    .ep-stats { grid-template-columns: 1fr 1fr; }
    .ep-sort { margin-left: 0; }
    .ep-controls { flex-direction: column; align-items: stretch; }
    .ep-search-wrap { max-width: 100%; }
  }
`
