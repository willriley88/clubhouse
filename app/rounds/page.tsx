'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type RoundRow = {
  id: string
  played_at: string
  courses: { name: string }[] | null  // Supabase returns FK joins as arrays
}

type ScoreRow = {
  round_id: string
  strokes: number
  holes: { par: number }[] | null  // Supabase returns FK joins as arrays
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
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function scoreToPar(gross: number, parTotal: number): string {
  const diff = gross - parTotal
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}

function scoreToParColor(_gross: number, _parTotal: number): string {
  return '#152644'
}

export default function RoundsPage() {
  const router = useRouter()
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsGuest(true)
        setLoading(false)
        return
      }

      // Fetch all rounds with course name
      const { data: roundData } = await supabase
        .from('rounds')
        .select('id, played_at, courses(name)')
        .eq('profile_id', user.id)
        .order('played_at', { ascending: false })

      const roundRows = (roundData ?? []) as RoundRow[]

      if (roundRows.length === 0) {
        setLoading(false)
        return
      }

      // Fetch all scores for these rounds in one query — avoids N+1
      const roundIds = roundRows.map(r => r.id)
      const { data: scoreData } = await supabase
        .from('scores')
        .select('round_id, strokes, holes(par)')
        .in('round_id', roundIds)

      const scoreRows = (scoreData ?? []) as ScoreRow[]

      // Group scores by round_id
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

      setRounds(summaries)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <main className="min-h-screen pb-24" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-5" style={{ background: '#152644' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 mb-4"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-sm">Home</span>
        </button>
        <h1 className="text-white text-2xl font-bold">Round History</h1>
        {!loading && !isGuest && (
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {rounds.length} round{rounds.length !== 1 ? 's' : ''} played
          </p>
        )}
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading...</div>
        )}

        {/* Guest — no rounds available */}
        {!loading && isGuest && (
          <div className="bg-white rounded-2xl px-4 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>Sign in to view your rounds</p>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
              Round history is saved to your member account
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#152644', color: '#c9a84c' }}
            >
              Sign In
            </button>
          </div>
        )}

        {/* No rounds yet */}
        {!loading && !isGuest && rounds.length === 0 && (
          <div className="bg-white rounded-2xl px-4 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No rounds recorded yet</p>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
              Complete a round on the scorecard to see it here
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

        {/* Round cards */}
        {rounds.map(r => {
          const hasScore  = r.gross > 0 && r.par_total > 0
          const isPartial = r.holes_played > 0 && r.holes_played < 18

          return (
            <button key={r.id} onClick={() => router.push(`/rounds/${r.id}`)}
              className="w-full bg-white rounded-2xl shadow-sm overflow-hidden text-left">
              <div className="px-4 py-4 flex items-center gap-4">

                {/* Gross score box */}
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

                {/* Course + date */}
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

                {/* Score vs par */}
                {hasScore && (
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-lg font-bold"
                      style={{ color: scoreToParColor(r.gross, r.par_total) }}
                    >
                      {scoreToPar(r.gross, r.par_total)}
                    </span>
                    <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>
                      vs Par
                    </p>
                  </div>
                )}

              </div>
            </button>
          )
        })}

      </div>

      <BottomNav />
    </main>
  )
}
