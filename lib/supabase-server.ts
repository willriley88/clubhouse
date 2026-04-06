import { createClient } from '@supabase/supabase-js'

// Plain server-side client for server components. Reads public data with the anon key.
// Does not handle cookie-based sessions — that's auth/callback/route.ts + middleware.ts.
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
