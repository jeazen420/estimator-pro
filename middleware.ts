/**
 * middleware.ts  (project root — next to package.json)
 * ──────────────────────────────────────────────────────────────────
 * Supabase session guard for Estimator Pro.
 *
 * How it works:
 *   1. Every request goes through this middleware first.
 *   2. It refreshes the Supabase session cookie (keeps tokens fresh).
 *   3. If the user is NOT logged in and tries to reach a protected
 *      route → redirect to /login with the original URL as `next=`
 *      so we can send them back after successful login.
 *   4. If the user IS logged in and visits /login or /signup
 *      → redirect straight to /dashboard.
 *
 * Protected routes: everything under /dashboard and /estimator.
 * Public  routes:   /login, /signup, /auth/callback, and all _next
 *                   static assets.
 *
 * Dependencies:
 *   npm install @supabase/ssr
 *   (replaces the older @supabase/auth-helpers-nextjs)
 * ──────────────────────────────────────────────────────────────────
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

// ── Routes ────────────────────────────────────────────────────────
const PROTECTED_PREFIXES = ["/dashboard", "/estimator"]
const AUTH_ROUTES        = ["/login", "/signup"]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((p) => pathname.startsWith(p))
}

// ── Middleware ────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Pass through Next.js internals and static files immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||   // Supabase OAuth callback
    pathname.includes(".")                // static assets (.png, .svg …)
  ) {
    return NextResponse.next()
  }

  // ── Build a mutable response we can attach cookies to ─────────
  let response = NextResponse.next({ request })

  // ── Create a Supabase client that can read/write cookies ───────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set on both the request (so the route handler sees it)
          // and the response (so the browser saves it).
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // ── Refresh session (extends expiry, populates cookies) ────────
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isLoggedIn = Boolean(session?.user)

  // ── Guard: protected route, no session → /login ───────────────
  if (isProtected(pathname) && !isLoggedIn) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    // Remember where they were going so we can redirect back after login
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Guard: already logged in, visiting /login or /signup ──────
  if (isAuthRoute(pathname) && isLoggedIn) {
    const redirectUrl = request.nextUrl.clone()
    // Honour ?next= param if it exists, otherwise go to dashboard
    const next = searchParams.get("next")
    redirectUrl.pathname =
      next && isProtected(next) ? next : "/dashboard"
    redirectUrl.searchParams.delete("next")
    return NextResponse.redirect(redirectUrl)
  }

  // ── Root redirect ──────────────────────────────────────────────
  if (pathname === "/") {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = isLoggedIn ? "/dashboard" : "/login"
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

// ── Matcher: which paths run through middleware ───────────────────
// Exclude _next static, image optimisation, and public files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
