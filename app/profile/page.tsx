'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type Profile = {
  full_name: string | null
  handicap: number | null
}

type RoundRow = {
  id: string
  played_at: string
  courses: { name: string }[] | null
}

type ScoreRow = {
  round_id: string
  strokes: number
  holes: { par: number }[] | null
}

type RoundSummary = {
  id: string
  played_at: string
  course_name: string
  gross: number
  par_total: number
  holes_played: number
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function scoreToPar(gross: number, parTotal: number): string {
  const diff = gross - parTotal
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}

function scoreToParColor(gross: number, parTotal: number): string {
  const diff = gross - parTotal
  if (diff < 0) return '#c9a84c'
  if (diff === 0) return '#15803d'
  return '#475569'
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile,         setProfile]         = useState<Profile | null>(null)
  const [rounds,          setRounds]          = useState<RoundSummary[]>([])
  const [allRounds,       setAllRounds]       = useState<RoundSummary[]>([])
  const [roundCount,      setRoundCount]      = useState(0)
  const [displayName,     setDisplayName]     = useState('')
  const [loading,         setLoading]         = useState(true)
  const [userId,          setUserId]          = useState<string>('')
  const [editingHandicap, setEditingHandicap] = useState(false)
  const [handicapInput,   setHandicapInput]   = useState('')
  const [savingHandicap,  setSavingHandicap]  = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Profile, round count, and recent rounds all in parallel
      const [{ data: profileData }, { count }, { data: roundData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, handicap')
          .eq('id', user.id)
          .single(),
        supabase
          .from('rounds')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', user.id),
        supabase
          .from('rounds')
          .select('id, played_at, courses(name)')
          .eq('profile_id', user.id)
          .order('played_at', { ascending: false })
          .limit(20),
      ])

      setProfile(profileData)
      setRoundCount(count ?? 0)
      setUserId(user.id)
      setDisplayName(profileData?.full_name || user.email?.split('@')[0] || 'Member')
      setHandicapInput(profileData?.handicap?.toString() ?? '')

      const roundRows = (roundData ?? []) as RoundRow[]
      if (roundRows.length === 0) { setLoading(false); return }

      // Fetch scores for all rounds (up to 20) in one query — used for display + WHS calc
      const roundIds = roundRows.map(r => r.id)
      const { data: scoreData } = await supabase
        .from('scores')
        .select('round_id, strokes, holes(par)')
        .in('round_id', roundIds)

      const scoreRows = (scoreData ?? []) as ScoreRow[]

      const byRound = new Map<string, ScoreRow[]>()
      for (const s of scoreRows) {
        const arr = byRound.get(s.round_id) ?? []
        arr.push(s)
        byRound.set(s.round_id, arr)
      }

      const summaries: RoundSummary[] = roundRows.map(r => {
        const scores = byRound.get(r.id) ?? []
        const gross     = scores.reduce((a: number, s) => a + s.strokes, 0)
        const par_total = scores.reduce((a: number, s) => a + (s.holes?.[0]?.par ?? 0), 0)
        return {
          id:           r.id,
          played_at:    r.played_at,
          course_name:  r.courses?.[0]?.name ?? 'LeBaron Hills CC',
          gross,
          par_total,
          holes_played: scores.length,
        }
      })

      setAllRounds(summaries)
      setRounds(summaries.slice(0, 5))

      // Auto-calculate WHS handicap if ≥6 complete rounds available
      const rc = count ?? 0
      if (rc >= 6) {
        const complete = summaries.filter(r => r.holes_played === 18 && r.gross > 0 && r.par_total > 0)
        if (complete.length >= 6) {
          const diffs = complete.map(r => ((r.gross - 73.4) * 113) / 136).sort((a, b) => a - b)
          const lowest6 = diffs.slice(0, 6)
          const avg = lowest6.reduce((a: number, v) => a + v, 0) / 6
          const hcp = Math.round(avg * 0.96 * 10) / 10
          // Update Supabase + local state silently
          supabase.from('profiles').update({ handicap: hcp }).eq('id', user.id)
          setProfile(prev => prev ? { ...prev, handicap: hcp } : { full_name: profileData?.full_name ?? null, handicap: hcp })
        }
      }

      setLoading(false)
    }

    load()
  }, [router])

  const bestRound = rounds.length > 0
    ? rounds.reduce((best, r) => r.gross > 0 && r.gross < best.gross ? r : best, rounds[0])
    : null

  async function saveManualHandicap() {
    const val = parseFloat(handicapInput)
    if (isNaN(val) || !userId) return
    setSavingHandicap(true)
    await supabase.from('profiles').update({ handicap: val }).eq('id', userId)
    setProfile(prev => prev ? { ...prev, handicap: val } : null)
    setEditingHandicap(false)
    setSavingHandicap(false)
  }

  async function recalcHandicap() {
    const complete = allRounds.filter(r => r.holes_played === 18 && r.gross > 0 && r.par_total > 0)
    if (complete.length < 6 || !userId) return
    const diffs = complete.map(r => ((r.gross - 73.4) * 113) / 136).sort((a, b) => a - b)
    const lowest6 = diffs.slice(0, 6)
    const avg = lowest6.reduce((a: number, v) => a + v, 0) / 6
    const hcp = Math.round(avg * 0.96 * 10) / 10
    await supabase.from('profiles').update({ handicap: hcp }).eq('id', userId)
    setProfile(prev => prev ? { ...prev, handicap: hcp } : null)
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ background: '#152644' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 mb-5"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-sm">Home</span>
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: '#c9a84c', color: '#152644' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
              {displayName}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Member · LeBaron Hills Country Club
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-5">
          <div>
            <div className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              {profile?.handicap ?? '—'}
            </div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Handicap
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {roundCount}
            </div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Rounds
            </div>
          </div>
          {bestRound && bestRound.gross > 0 && (
            <div>
              <div className="text-2xl font-bold text-white">{bestRound.gross}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Best
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Handicap trend sparkline — shown when ≥2 completed rounds exist */}
        {!loading && rounds.filter(r => r.gross > 0 && r.par_total > 0).length >= 2 && (() => {
          // Reverse to chronological order (oldest left), compute WHS differentials
          const completed = rounds.filter(r => r.gross > 0 && r.par_total > 0).slice().reverse()
          const diffs = completed.map(r => ((r.gross - 73.4) * 113) / 136)
          const min = Math.min(...diffs)
          const max = Math.max(...diffs)
          const range = max - min || 1
          const W = 200, H = 40, PAD = 6
          const x = (i: number) => PAD + (i / (diffs.length - 1)) * (W - PAD * 2)
          const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
          const points = diffs.map((v, i) => `${x(i)},${y(v)}`).join(' ')
          const area = `M${x(0)},${H} ` + diffs.map((v, i) => `L${x(i)},${y(v)}`).join(' ') + ` L${x(diffs.length-1)},${H} Z`
          const trend = diffs[diffs.length - 1] - diffs[0]
          const trendLabel = trend < -0.5 ? '↓ Improving' : trend > 0.5 ? '↑ Rising' : '— Steady'
          const trendColor = trend < -0.5 ? '#4ade80' : trend > 0.5 ? '#f87171' : '#94a3b8'
          return (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>
                  Handicap Trend
                </p>
                <span className="text-xs font-semibold" style={{ color: trendColor }}>{trendLabel}</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 40 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Gradient fill under the line */}
                <path d={area} fill="url(#sparkGrad)" />
                {/* The line itself */}
                <polyline points={points} fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* Dots at each data point */}
                {diffs.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#c9a84c" />
                ))}
              </svg>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: '#94a3b8' }}>{diffs[0].toFixed(1)}</span>
                <span className="text-[9px]" style={{ color: '#94a3b8' }}>{diffs[diffs.length-1].toFixed(1)}</span>
              </div>
            </div>
          )
        })()}

        {/* Handicap card — tiered based on round count */}
        {!loading && (() => {
          const rc = roundCount

          // Tier 1: fewer than 3 rounds — manual entry
          if (rc < 3) return (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>Handicap Index</p>
              {editingHandicap ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="number" step="0.1" placeholder="e.g. 12.4"
                    value={handicapInput}
                    onChange={e => setHandicapInput(e.target.value)}
                    className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ borderColor: '#152644', color: '#152644' }}
                    autoFocus
                  />
                  <button onClick={saveManualHandicap} disabled={savingHandicap}
                    className="px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: '#152644', color: '#c9a84c' }}>
                    {savingHandicap ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingHandicap(false)} className="text-slate-400 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color: profile?.handicap != null ? '#c9a84c' : '#94a3b8', fontFamily: 'Georgia, serif' }}>
                    {profile?.handicap ?? '—'}
                  </span>
                  <button onClick={() => setEditingHandicap(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: '#f1f5f9', color: '#152644' }}>
                    Enter Index
                  </button>
                </div>
              )}
              <p className="text-[10px] mt-2" style={{ color: '#94a3b8' }}>
                {3 - rc} more round{3 - rc !== 1 ? 's' : ''} needed to show handicap status
              </p>
            </div>
          )

          // Tier 2: 3–5 rounds — show entered value, note calc requires 6
          if (rc < 6) return (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Handicap Index</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold" style={{ color: profile?.handicap != null ? '#c9a84c' : '#94a3b8', fontFamily: 'Georgia, serif' }}>
                  {profile?.handicap ?? '—'}
                </span>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>
                Calculation requires 6 rounds · {6 - rc} to go
              </p>
            </div>
          )

          // Tier 3: ≥6 rounds — WHS auto-calculated
          return (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Handicap Index</p>
                <button onClick={recalcHandicap}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#f1f5f9', color: '#152644' }}>
                  Recalculate
                </button>
              </div>
              <span className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                {profile?.handicap ?? '—'}
              </span>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                WHS · lowest 6 of {rc} differentials × 0.96
              </p>
            </div>
          )
        })()}

        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Recent Rounds
        </p>

        {loading && (
          <div className="text-center py-10 text-sm" style={{ color: '#94a3b8' }}>Loading...</div>
        )}

        {!loading && rounds.length === 0 && (
          <div className="bg-white rounded-2xl px-4 py-10 text-center shadow-sm">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No rounds yet</p>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
              Complete a round on the scorecard to see your history
            </p>
            <button
              onClick={() => router.push('/scorecard')}
              className="px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#152644', color: '#c9a84c' }}
            >
              Start a Round
            </button>
          </div>
        )}

        {rounds.map(r => {
          const hasScore  = r.gross > 0 && r.par_total > 0
          const isPartial = r.holes_played > 0 && r.holes_played < 18
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-4 flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <span className="text-2xl font-bold leading-none" style={{ color: '#152644' }}>
                    {r.gross || '—'}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>
                    Gross
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#152644' }}>
                    {r.course_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {formatDate(r.played_at)}
                  </p>
                  {isPartial && (
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#f59e0b' }}>
                      {r.holes_played} holes
                    </p>
                  )}
                </div>
                {hasScore && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold" style={{ color: scoreToParColor(r.gross, r.par_total) }}>
                      {scoreToPar(r.gross, r.par_total)}
                    </span>
                    <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>
                      vs Par
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {!loading && rounds.length > 0 && (
          <button
            onClick={() => router.push('/rounds')}
            className="w-full py-3 text-sm font-semibold rounded-2xl"
            style={{ background: 'white', color: '#152644' }}
          >
            View All Rounds →
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
