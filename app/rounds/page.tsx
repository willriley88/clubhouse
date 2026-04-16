'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../lib/supabase'

type LocalRound = {
  id: string
  played_at: string
  course_name: string
  gross: number
  par_total: number
  holes_played: number
  hole_scores: { hole_number: number; par: number; strokes: number; putts: number | null }[]
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

export default function RoundsPage() {
  const router = useRouter()
  const [rounds, setRounds] = useState<LocalRound[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        // Fetch rounds from Supabase with nested scores and holes for par/stroke data
        const { data, error } = await supabase
          .from('rounds')
          .select(`
            id, played_at,
            courses(name),
            scores(strokes, putts, holes(hole_number, par))
          `)
          .eq('profile_id', user.id)
          .order('played_at', { ascending: false })

        if (!error && data) {
          const mapped: LocalRound[] = data.map((r) => {
            // courses is many-to-one — single object
            const coursesRaw = r.courses as unknown
            const courseName =
              coursesRaw && !Array.isArray(coursesRaw)
                ? (coursesRaw as { name: string }).name
                : Array.isArray(coursesRaw) && coursesRaw.length > 0
                ? (coursesRaw[0] as { name: string }).name
                : 'LeBaron Hills CC'

            const scoresArr = Array.isArray(r.scores) ? r.scores : []
            const holeScores = scoresArr.map((s) => {
              // holes is many-to-one — single object; guard with Array.isArray for safety
              const h = Array.isArray(s.holes) ? s.holes[0] : s.holes
              return {
                hole_number: (h as { hole_number: number } | null)?.hole_number ?? 0,
                par: (h as { par: number } | null)?.par ?? 0,
                strokes: s.strokes ?? 0,
                putts: s.putts ?? null,
              }
            })

            const gross = holeScores.reduce((a: number, v) => a + v.strokes, 0)
            const par_total = holeScores.reduce((a: number, v) => a + v.par, 0)

            return {
              id: r.id,
              played_at: r.played_at,
              course_name: courseName,
              gross,
              par_total,
              holes_played: holeScores.length,
              hole_scores: holeScores,
            }
          })
          setRounds(mapped)
        }
      } else {
        // Not logged in — fall back to localStorage
        try {
          const raw = localStorage.getItem('clubhouse_rounds')
          setRounds(raw ? JSON.parse(raw) : [])
        } catch {
          setRounds([])
        }
      }

      setLoaded(true)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this round?')) return

    if (isLoggedIn) {
      // Delete scores first (FK constraint), then the round
      await supabase.from('scores').delete().eq('round_id', id)
      await supabase.from('rounds').delete().eq('id', id)
    } else {
      const updated = rounds.filter(r => r.id !== id)
      localStorage.setItem('clubhouse_rounds', JSON.stringify(updated))
    }

    setRounds(prev => prev.filter(r => r.id !== id))
  }

  return (
    <main className="min-h-screen pb-[max(96px,env(safe-area-inset-bottom))]" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-[max(48px,env(safe-area-inset-top))] pb-5" style={{ background: '#152644' }}>
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
        {loaded && (
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {rounds.length} round{rounds.length !== 1 ? 's' : ''} played
          </p>
        )}
      </div>

      <div className="px-4 pt-4 space-y-3">

        {!loaded && (
          <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading...</div>
        )}

        {loaded && rounds.length === 0 && (
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

        {rounds.map(r => {
          const hasScore  = r.gross > 0 && r.par_total > 0
          const isPartial = r.holes_played > 0 && r.holes_played < 18

          return (
            <div key={r.id} className="w-full bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-4 flex items-center gap-4">

                <button
                  onClick={() => router.push(`/rounds/${r.id}`)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
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
                </button>

                {/* Score vs par */}
                {hasScore && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-bold" style={{ color: '#152644' }}>
                      {scoreToPar(r.gross, r.par_total)}
                    </span>
                    <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>
                      vs Par
                    </p>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg"
                  style={{ color: '#cbd5e1' }}
                  aria-label="Delete round"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>

              </div>
            </div>
          )
        })}

      </div>

      <BottomNav />
    </main>
  )
}
