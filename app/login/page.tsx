'use client'
import { useState } from 'react'
import { signInWithEmail } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const { error } = await signInWithEmail(email)
    if (!error) setSent(true) // show confirmation message
    setLoading(false)
  }

  // Confirmation screen after email is sent
  if (sent) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#152644' }}>
      <div className="text-center text-white p-8">
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="opacity-70">We sent a link to {email}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#152644' }}>
      <div className="bg-white rounded-2xl p-8 w-80 shadow-xl">

        {/* Branding */}
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#152644' }}>
          Clubhouse
        </h1>
        <p className="text-sm text-gray-500 mb-6">LeBaron Hills CC</p>

        {/* Email input */}
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-3 mb-4 text-sm outline-none"
          style={{ borderColor: '#152644' }}
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          className="w-full py-3 rounded-lg text-white font-semibold"
          style={{ backgroundColor: '#c9a84c' }}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>

      </div>
    </div>
  )
}