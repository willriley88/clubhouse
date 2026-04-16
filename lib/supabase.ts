import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient syncs the auth session to cookies automatically on every
// auth state change (signIn, signOut, token refresh). No extra configuration is
// needed for persistence — after verifyOtp() succeeds the session cookie is set
// and survives page reloads indefinitely until the user signs out.
//
// Use only in client components ('use client'). Server components use lib/supabase-server.ts.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
