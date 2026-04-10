'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../../components/BottomNav'

type ScoreDetail = {
  hole_number: number
  par: number
  strokes: number
  putts: number | null
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Color coding for score vs par
function cellBg(strokes: number, par: number): string {
  const d = strokes - par
  if (d <= -1) return '#c9a84c'   // birdie+ — gold
  if (d === 0) return '#15803d'   // par — green
  if (d === 1) return '#ef4444'   // bogey — red
  return '#991b1b'                // double+ — dark red
}

function cellText(strokes: number, par: number): string {
  const d = strokes - par
  if (d <= -1 || d === 0) return 'white'
  return 'white'
}

export default function RoundDetailPage() {
  const router  = useRouter()
  const params  = useParams<{ id: string }>()
  const roundId = params.id

  const [scores,    setScores]    = useState<ScoreDetail[]>([])
  const [playedAt,  setPlayedAt]  = useState<string>('')
  const [courseName, setCourseName] = useState('LeBaron Hills CC')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('session check:', session)

      // Fetch round metadata
      const { data: round } = await supabase
        .from('rounds')
        .select('played_at, courses(name)')
        .eq('id', roundId)
        .single()

      if (round) {
        setPlayedAt(round.played_at)
        const c = round.courses as unknown as { name: string }[] | null
        if (c?.[0]?.name) setCourseName(c[0].name)
      }

      // Split into two queries — inline holes join triggers RLS on the holes
      // table even though direct queries work fine (PostgREST nested selects
      // run under the requesting user's policy context, not public read).

      // Step 1: fetch scores for this round
      const { data: scoreRows, error: scoresError } = await supabase
        .from('scores')
        .select('strokes, putts, hole_id')
        .eq('round_id', roundId)

      console.log('scores:', scoreRows, scoresError)

      if (!scoreRows || scoreRows.length === 0) {
        setLoading(false)
        return
      }

      // Step 2: fetch hole data for those hole_ids separately
      const holeIds = scoreRows.map((s: any) => s.hole_id)
      const { data: holeRows, error: holesError } = await supabase
        .from('holes')
        .select('id, hole_number, par, hcp_index')
        .in('id', holeIds)

      console.log('holes:', holeRows, holesError)

      // Step 3: join in JS using a Map for O(1) lookup
      const holeMap = new Map(holeRows?.map((h: any) => [h.id, h]) ?? [])
      const details: ScoreDetail[] = scoreRows
        .map((s: any) => {
          const h = holeMap.get(s.hole_id)
          return {
            hole_number: h?.hole_number ?? 0,
            par:         h?.par ?? 4,
            strokes:     s.strokes,
            putts:       s.putts ?? null,
          }
        })
        .filter((s: ScoreDetail) => s.hole_number > 0)
        .sort((a: ScoreDetail, b: ScoreDetail) => a.hole_number - b.hole_number)

      setScores(details)

      setLoading(false)
    }
    load()
  }, [roundId])

  const gross     = scores.reduce((a: number, s) => a + s.strokes, 0)
  const parTotal  = scores.reduce((a: number, s) => a + s.par, 0)
  const toPar     = gross - parTotal
  const toParStr  = toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : String(toPar)

  const front9    = scores.slice(0, 9)
  const back9     = scores.slice(9, 18)
  const frontGross = front9.reduce((a: number, s) => a + s.strokes, 0)
  const backGross  = back9.reduce((a: number, s) => a + s.strokes, 0)
  const frontPar   = front9.reduce((a: number, s) => a + s.par, 0)
  const backPar    = back9.reduce((a: number, s) => a + s.par, 0)

  // Summary stats
  const birdies  = scores.filter(s => s.strokes - s.par <= -1).length
  const pars     = scores.filter(s => s.strokes - s.par === 0).length
  const bogeys   = scores.filter(s => s.strokes - s.par === 1).length
  const doubles  = scores.filter(s => s.strokes - s.par >= 2).length
  const totalPutts = scores.reduce((a: number, s) => a + (s.putts ?? 0), 0)
  const puttCount  = scores.filter(s => s.putts !== null).length

  return (
    <main className="min-h-screen pb-24" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-5" style={{ background: '#152644' }}>
        <button
          onClick={() => router.push('/rounds')}
          className="flex items-center gap-1 mb-4"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <span className="text-sm">History</span>
        </button>
        <h1 className="text-white text-xl font-bold">{courseName}</h1>
        {playedAt && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(playedAt)}</p>
        )}
        {!loading && scores.length > 0 && (
          <div className="flex gap-6 mt-3">
            <div>
              <div className="text-2xl font-bold text-white">{gross}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Gross</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: toPar < 0 ? '#c9a84c' : toPar === 0 ? '#4ade80' : '#f87171' }}>{toParStr}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>To Par</div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading...</div>
      )}

      {!loading && scores.length > 0 && (
        <>
          {/* Scorecard table — horizontally scrollable */}
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: '100%' }}>
                <colgroup>
                  <col style={{ width: 52 }}/>
                  {scores.slice(0, 9).map((_, i) => <col key={i} style={{ width: 36 }}/>)}
                  <col style={{ width: 40 }}/>
                  {scores.slice(9).map((_, i) => <col key={i} style={{ width: 36 }}/>)}
                  <col style={{ width: 40 }}/>
                </colgroup>

                {/* Header row: Hole numbers */}
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th className="text-left pl-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Hole</th>
                    {front9.map(s => (
                      <th key={s.hole_number} className="text-center py-2 text-xs font-bold" style={{ color: '#152644' }}>
                        {s.hole_number}
                      </th>
                    ))}
                    <th className="text-center py-2 text-[10px] font-bold uppercase text-slate-400">Out</th>
                    {back9.map(s => (
                      <th key={s.hole_number} className="text-center py-2 text-xs font-bold" style={{ color: '#152644' }}>
                        {s.hole_number}
                      </th>
                    ))}
                    {back9.length > 0 && (
                      <th className="text-center py-2 text-[10px] font-bold uppercase text-slate-400">In</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {/* Par row */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="pl-3 py-2 text-[10px] font-semibold text-slate-400 uppercase">Par</td>
                    {front9.map(s => (
                      <td key={s.hole_number} className="text-center text-xs py-2 text-slate-500">{s.par}</td>
                    ))}
                    <td className="text-center text-xs py-2 font-bold text-slate-500">{frontPar}</td>
                    {back9.map(s => (
                      <td key={s.hole_number} className="text-center text-xs py-2 text-slate-500">{s.par}</td>
                    ))}
                    {back9.length > 0 && (
                      <td className="text-center text-xs py-2 font-bold text-slate-500">{backPar}</td>
                    )}
                  </tr>

                  {/* Score row */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="pl-3 py-2 text-[10px] font-semibold text-slate-400 uppercase">Score</td>
                    {front9.map(s => (
                      <td key={s.hole_number} className="text-center py-1.5">
                        <span className="text-xs font-bold" style={{ color: '#152644' }}>{s.strokes}</span>
                      </td>
                    ))}
                    <td className="text-center text-xs py-1.5 font-bold" style={{ color: '#152644' }}>{frontGross}</td>
                    {back9.map(s => (
                      <td key={s.hole_number} className="text-center py-1.5">
                        <span className="text-xs font-bold" style={{ color: '#152644' }}>{s.strokes}</span>
                      </td>
                    ))}
                    {back9.length > 0 && (
                      <td className="text-center text-xs py-1.5 font-bold" style={{ color: '#152644' }}>{backGross}</td>
                    )}
                  </tr>

                  {/* vs Par color row */}
                  <tr>
                    <td className="pl-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">+/−</td>
                    {front9.map(s => {
                      const d = s.strokes - s.par
                      const str = d === 0 ? 'E' : d > 0 ? `+${d}` : String(d)
                      return (
                        <td key={s.hole_number} className="text-center py-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold"
                            style={{ background: cellBg(s.strokes, s.par), color: cellText(s.strokes, s.par) }}>
                            {str}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-center py-1.5">
                      <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: frontGross - frontPar < 0 ? '#c9a84c' : frontGross - frontPar === 0 ? '#15803d' : '#ef4444',
                          color: 'white',
                        }}>
                        {frontGross - frontPar === 0 ? 'E' : frontGross - frontPar > 0 ? `+${frontGross - frontPar}` : frontGross - frontPar}
                      </span>
                    </td>
                    {back9.map(s => {
                      const d = s.strokes - s.par
                      const str = d === 0 ? 'E' : d > 0 ? `+${d}` : String(d)
                      return (
                        <td key={s.hole_number} className="text-center py-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold"
                            style={{ background: cellBg(s.strokes, s.par), color: cellText(s.strokes, s.par) }}>
                            {str}
                          </span>
                        </td>
                      )
                    })}
                    {back9.length > 0 && (
                      <td className="text-center py-1.5">
                        <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            background: backGross - backPar < 0 ? '#c9a84c' : backGross - backPar === 0 ? '#15803d' : '#ef4444',
                            color: 'white',
                          }}>
                          {backGross - backPar === 0 ? 'E' : backGross - backPar > 0 ? `+${backGross - backPar}` : backGross - backPar}
                        </span>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Round Summary</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Birdies', val: birdies,  color: '#c9a84c' },
                { label: 'Pars',    val: pars,     color: '#15803d' },
                { label: 'Bogeys',  val: bogeys,   color: '#ef4444' },
                { label: 'Doubles+', val: doubles, color: '#991b1b' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: '#f8fafc' }}>
                  <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.val}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            {puttCount > 0 && (
              <div className="mt-3 rounded-xl p-3 text-center" style={{ background: '#f8fafc' }}>
                <div className="text-xl font-bold" style={{ color: '#152644' }}>{totalPutts}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total Putts</div>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && scores.length === 0 && (
        <div className="mx-4 mt-8 bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-semibold mb-2" style={{ color: '#152644' }}>No hole data recorded</p>
          <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
            Score data could not be loaded for this round.
          </p>
          <button
            onClick={() => router.push('/rounds')}
            className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: '#152644', color: '#c9a84c' }}>
            ← Back to History
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
