import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/club']

/** Cookie that pins the demo club across navigation. */
const DEMO_COOKIE = 'clubhouse_demo_club'
const DEMO_PARAM = 'club'

/**
 * Slug shape is constrained here rather than trusted: the value is read back by
 * the layout and used to look up a static catalog entry, so restricting it to
 * the generated `<state>-<name_key>` form keeps anything else from reaching
 * that lookup.
 */
const SLUG_RE = /^[a-z]{2}-[a-z0-9-]{1,64}$/

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  // ── Demo branding ───────────────────────────────────────────────────────
  // `?club=ma-norton-cc` pins that club's branding for the rest of the
  // session. `?club=` (empty) clears it and returns to the real club. The
  // cookie is what makes a demo survive tapping through the bottom nav.
  if (request.nextUrl.searchParams.has(DEMO_PARAM)) {
    const raw = request.nextUrl.searchParams.get(DEMO_PARAM)?.trim().toLowerCase() ?? ''
    if (raw === '') {
      response.cookies.delete(DEMO_COOKIE)
    } else if (SLUG_RE.test(raw)) {
      response.cookies.set(DEMO_COOKIE, raw, {
        path: '/',
        sameSite: 'lax',
        httpOnly: false, // the picker UI reads it to show the active club
        maxAge: 60 * 60 * 8, // one working day; a demo should not be permanent
      })
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        // Propagate any cookie refreshes to the outgoing response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getUser() validates the JWT — don't use getSession() which trusts the cookie blindly
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(p => request.nextUrl.pathname.startsWith(p))
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // Runs on every page route so the demo cookie can be set from any entry
  // point, not just /club. Static assets and API routes are excluded.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|demo-clubs|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|pdf)$).*)'],
}
