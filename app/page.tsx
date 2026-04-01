'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from './components/BottomNav'
import { supabase } from '@/lib/supabase'

// Placeholder club feed posts
const FEED_POSTS = [
  { id: 1, initials: 'TR', name: 'Tom R.', text: 'Shot a 76 — best round of the season', time: '2h ago' },
  { id: 2, initials: 'MK', name: 'Mike K.', text: 'Anyone up for a round Saturday morning? Need a 4th', time: '4h ago' },
  { id: 3, initials: 'JS', name: 'Jack S.', text: 'Greens are rolling fast today, highly recommend', time: '6h ago' },
]

type Round = {
  id: string
  played_at: string
  format: string
  scores: { strokes: number; holes: { par: number } }[]
}

export default function HomePage() {
  const router = useRouter()
  const [user,         setUser]         = useState<any>(null)
  const [profile,      setProfile]      = useState<any>(null)
  const [lastRound,    setLastRound]    = useState<Round | null>(null)
  const [loadingRound, setLoadingRound] = useState(true)

  // Edit name state
  const [editingName, setEditingName] = useState(false)
  const [editName,    setEditName]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)

        // Load profile
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, handicap')
          .eq('id', data.user.id)
          .single()
        if (p) {
          setProfile(p)
          setEditName(p.full_name || data.user.email?.split('@')[0] || 'Member')
        }

        // Load last round with scores
        const { data: rounds } = await supabase
          .from('rounds')
          .select('id, played_at, format')
          .eq('profile_id', data.user.id)
          .order('played_at', { ascending: false })
          .limit(1)

        if (rounds && rounds.length > 0) {
          const round = rounds[0]
          const { data: scores } = await supabase
            .from('scores')
            .select('strokes, holes(par)')
            .eq('round_id', round.id)
            .order('holes(hole_number)')
          setLastRound({ ...round, scores: (scores || []) as any })
        }
      } else {
        // Guest
        try {
          const g = JSON.parse(localStorage.getItem('clubhouse_guest') || '{}')
          setEditName(g.name || 'Guest')
          setProfile({ full_name: g.name || 'Guest', handicap: g.handicap || null })
        } catch {}
      }
      setLoadingRound(false)
    })
  }, [])

  async function saveName() {
    setProfile((p: any) => ({ ...p, full_name: editName }))
    setEditingName(false)
    if (user) {
      await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id)
    } else {
      const g = JSON.parse(localStorage.getItem('clubhouse_guest') || '{}')
      localStorage.setItem('clubhouse_guest', JSON.stringify({ ...g, name: editName }))
    }
  }

  // Score color for last round bubbles
  function scoreColor(strokes: number, par: number) {
    const d = strokes - par
    if (d <= -2) return '#f59e0b'  // eagle
    if (d === -1) return '#ef4444' // birdie
    if (d === 0)  return '#e2e8f0' // par
    if (d === 1)  return '#334155' // bogey
    return '#94a3b8'               // double+
  }
  function scoreTextColor(strokes: number, par: number) {
    const d = strokes - par
    if (d === 0) return '#475569'
    return 'white'
  }

  const displayName = profile?.full_name || editName || 'Guest'
  const handicap    = profile?.handicap

  // Last round total + net
  const lastGross = lastRound?.scores.reduce((a, s) => a + s.strokes, 0) ?? 0
  const lastPar = lastRound?.scores.reduce((a, s) => a + ((s.holes as any)?.par || 0), 0) || 72

  return (
    <main className="min-h-screen pb-24" style={{ background: '#f1f5f9' }}>

      {/* ── HEADER ── */}
      <div className="px-4 pt-12 pb-5" style={{ background: '#152644' }}>
        <div className="flex justify-between items-center mb-4">
          {/* Hamburger */}
          <button className="flex flex-col gap-1.5">
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
          </button>

          {/* Club name — Playfair italic */}
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            LeBaron Hills
          </h1>

          {/* Avatar */}
          <button
            onClick={() => user ? router.push('/profile') : router.push('/login')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2"
            style={{ background: '#c9a84c', borderColor: '#c9a84c', color: '#152644' }}>
            {displayName.charAt(0).toUpperCase()}
          </button>
        </div>

        {/* Member card */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {/* Name row with edit pencil */}
          <div className="flex items-center gap-2 mb-0.5">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  autoFocus
                  className="bg-transparent border-b border-white/40 text-white text-xl font-bold outline-none flex-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
                <button onClick={saveName} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>Save</button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  {displayName}
                </h2>
                <button onClick={() => setEditingName(true)}>
                  {/* Pencil icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Member · LeBaron Hills Country Club
          </p>

          {/* Stats row */}
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                {handicap !== null && handicap !== undefined ? handicap : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Handicap Index
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {lastRound ? lastRound.scores.length : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Rounds</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {lastRound && lastGross > 0 ? lastGross : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Last</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── LAST ROUND ── only show if user has rounds */}
        {!loadingRound && lastRound && lastRound.scores.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Last Round</p>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                LeBaron Hills CC · {new Date(lastRound.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {
                  lastRound.scores.length <= 9 ? 'Front 9' : 'Full 18'
                }
              </p>

              {/* Score bubbles */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {lastRound.scores.map((s, i) => (
                  <div key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: scoreColor(s.strokes, (s.holes as any)?.par ?? 4), color: scoreTextColor(s.strokes, (s.holes as any)?.par ?? 4) }}>
                    {s.strokes}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{lastGross} gross</p>
                <button onClick={() => router.push('/rounds')}
                  className="text-xs font-semibold" style={{ color: '#c9a84c' }}>
                  View History →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EVENTS ── placeholder card */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Events</p>
          <div className="rounded-2xl p-4 shadow-sm relative overflow-hidden" style={{ background: '#152644' }}>
            {/* Decorative circle */}
            <div className="absolute right-4 top-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#c9a84c' }} />
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Member-Guest Classic
            </p>
            <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              June 14 – 16, 2025
            </h3>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Stroke Play · Stableford · 67 Players
            </p>
            <button
              onClick={() => router.push('/tournament')}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#c9a84c', color: '#152644' }}>
              View Leaderboard →
            </button>
          </div>
        </div>

        {/* ── CLUB FEED ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Club Feed</p>
          <div className="space-y-2">
            {FEED_POSTS.map(post => (
              <div key={post.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: '#152644' }}>
                  {post.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{post.name}</span> {post.text}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{post.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav />
    </main>
  )
}
