'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState('')
  const [step,    setStep]    = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSendCode() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    // Normalize email before sending — write trimmed value back to state so
    // verifyOtp uses the exact same string (mobile autocomplete can append spaces)
    const trimmedEmail = email.trim()
    setEmail(trimmedEmail)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        // emailRedirectTo must be undefined to send a 6-digit OTP code;
        // a defined redirect URL causes Supabase to send a magic link instead
        emailRedirectTo: undefined,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setStep(2)
    }
    setLoading(false)
  }

  async function handleVerify() {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    // Log exactly what's being sent so we can diagnose any mismatch server-side
    console.log('verifyOtp attempt:', { email, token: code.trim() })
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) {
      // Show the exact Supabase error message for diagnostics
      setError(error.message)
      setLoading(false)
    } else {
      // Session is now written to cookies by createBrowserClient; redirect home
      router.push('/')
    }
  }

  function handleBack() {
    // Fall back to home if there's no browser history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative"
      style={{ backgroundColor: '#152644' }}>

      {/* Back arrow — shown when redirected here from a protected route */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-4 flex items-center gap-1.5"
        aria-label="Go back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <div className="bg-white rounded-2xl p-8 w-80 shadow-xl">

        {/* Branding */}
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#152644' }}>Clubhouse</h1>
        <p className="text-sm text-gray-500 mb-6">LeBaron Hills CC</p>

        {step === 1 ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Enter your email — we&apos;ll send a 6-digit code.
            </p>

            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendCode() }}
              className="w-full border rounded-lg px-4 py-3 mb-4 text-sm outline-none"
              style={{ borderColor: '#152644', color: '#152644' }}
            />

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <button
              onClick={handleSendCode}
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-lg font-semibold"
              style={{
                backgroundColor: '#c9a84c',
                color: '#152644',
                opacity: loading || !email.trim() ? 0.6 : 1,
              }}
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-0.5">Code sent to</p>
            <p className="text-sm font-semibold mb-4" style={{ color: '#152644' }}>{email}</p>

            {/* Numeric-only input, centered with wide tracking for 6-digit readability */}
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
              className="w-full border rounded-lg px-4 py-3 mb-4 text-sm outline-none text-center font-mono tracking-widest"
              style={{ borderColor: '#152644' }}
              autoFocus
            />

            {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-lg font-semibold mb-3"
              style={{
                backgroundColor: '#c9a84c',
                color: '#152644',
                opacity: loading || code.length !== 6 ? 0.6 : 1,
              }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            {/* Back clears step 2 state and returns to email entry */}
            <button
              onClick={() => { setStep(1); setCode(''); setError(null) }}
              className="w-full text-xs text-center text-gray-400"
            >
              ← Back
            </button>
          </>
        )}

      </div>
    </div>
  )
}
