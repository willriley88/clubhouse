import { supabase } from './supabase'

// Send a magic link to the user's email
export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
      // after clicking the link, user lands here
    }
  })
  return { error }
}

// Sign out and clear the session
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get the current logged-in user (null if not logged in)
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}