import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient syncs the session to cookies automatically, which means
// middleware.ts can validate the JWT on every request. Use only in client components.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
