import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// NOTE: The OTP flow (signInWithOtp + verifyOtp) completes entirely client-side
// and does NOT redirect through this callback. After verifyOtp() the session is
// written directly to cookies by createBrowserClient in lib/supabase.ts, and the
// login page redirects to / itself.
//
// This route is kept for backwards compatibility only — any magic-link emails that
// were sent before the OTP migration will still land here and exchange their code
// for a session. It can be removed once those links have expired (1 hour TTL).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Prefer the canonical site URL so the redirect lands on the Vercel deployment
  // (or custom domain) rather than whatever origin the request arrived from,
  // which could be localhost in proxied or dev tunnel scenarios.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin
  return NextResponse.redirect(`${siteUrl}/`)
}
