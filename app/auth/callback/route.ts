import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This route runs when the user clicks the magic link in their email
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code') // supabase sends a code in the URL

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.exchangeCodeForSession(code)
    // swaps the one-time code for a real session cookie
  }

  return NextResponse.redirect(`${origin}/`) // send them home
}