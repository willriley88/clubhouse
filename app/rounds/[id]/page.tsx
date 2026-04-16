'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '../../components/BottomNav'

type HoleScore = {
  hole_number: number
  par: number
  strokes: number
  putts: number | null
}

type LocalRound = {
  id: string
  played_at: string
  course_name: string
  gross: number
  par_total: number
  holes_played: number
  hole_scores: HoleScore[]
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function RoundDetailPage() {
  const router  = useRouter()
  const params  = useParams<{ id: string }>()
  const roundId = params.id

  const [round,   setRound]   = useState<LocalRound | null>(null)
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('clubhouse_rounds')
      const rounds: LocalRound[] = raw ? JSON.parse(raw) : []
      setRound(rounds.find(r => r.id === roundId) ?? null)
    } catch {
      setRound(null)
    }
    setLoaded(true)
  }, [roundId])

  const scores = round?.hole_scores ?? []
  const gross      = scores.reduce((a: number, s) => a + s.strokes, 0)
  const parTotal   = scores.reduce((a: number, s) => a + s.par, 0)
  const toPar      = gross - parTotal
  const toParStr   = toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : String(toPar)

  const front9     = scores.slice(0, 9)
  const back9      = scores.slice(9, 18)
  const frontGross = front9.reduce((a: number, s) => a + s.strokes, 0)
  const backGross  = back9.reduce((a: number, s) => a + s.strokes, 0)
  const frontPar   = front9.reduce((a: number, s) => a + s.par, 0)
  const backPar    = back9.reduce((a: number, s) => a + s.par, 0)

  const birdies    = scores.filter(s => s.strokes - s.par <= -1).length
  const pars       = scores.filter(s => s.strokes - s.par === 0).length
  const bogeys     = scores.filter(s => s.strokes - s.par === 1).length
  const doubles    = scores.filter(s => s.strokes - s.par >= 2).length
  const totalPutts = scores.reduce((a: number, s) => a + (s.putts ?? 0), 0)
  const puttCount  = scores.filter(s => s.putts !== null).length

  return (
    <main className="min-h-screen pb-[max(96px,env(safe-area-inset-bottom))]" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-[max(48px,env(safe-area-inset-top))] pb-5" style={{ background: '#152644' }}>
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
        <h1 className="text-white text-xl font-bold">{round?.course_name ?? 'Round Detail'}</h1>
        {round?.played_at && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatDate(round.played_at)}</p>
        )}
        {loaded && scores.length > 0 && (
          <div className="flex gap-6 mt-3">
            <div>
              <div className="text-2xl font-bold text-white">{gross}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Gross</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{toParStr}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>To Par</div>
            </div>
          </div>
        )}
      </div>

      {!loaded && (
        <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>Loading...</div>
      )}

      {loaded && scores.length > 0 && (
        <>
          {/* Scorecard table — horizontally scrollable */}
          <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="border-collapse" style={{ minWidth: '100%' }}>
                <colgroup>
                  <col style={{ width: 52 }}/>
                  {front9.map((_, i) => <col key={i} style={{ width: 36 }}/>)}
                  <col style={{ width: 40 }}/>
                  {back9.map((_, i) => <col key={i} style={{ width: 36 }}/>)}
                  {back9.length > 0 && <col style={{ width: 40 }}/>}
                </colgroup>

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

                  {/* vs Par row */}
                  <tr>
                    <td className="pl-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase">+/−</td>
                    {front9.map(s => {
                      const d = s.strokes - s.par
                      const str = d === 0 ? 'E' : d > 0 ? `+${d}` : String(d)
                      return (
                        <td key={s.hole_number} className="text-center py-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold"
                            style={{ background: '#f8fafc', color: '#152644' }}>
                            {str}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-center py-1.5">
                      <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: '#f8fafc', color: '#152644' }}>
                        {frontGross - frontPar === 0 ? 'E' : frontGross - frontPar > 0 ? `+${frontGross - frontPar}` : frontGross - frontPar}
                      </span>
                    </td>
                    {back9.map(s => {
                      const d = s.strokes - s.par
                      const str = d === 0 ? 'E' : d > 0 ? `+${d}` : String(d)
                      return (
                        <td key={s.hole_number} className="text-center py-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold"
                            style={{ background: '#f8fafc', color: '#152644' }}>
                            {str}
                          </span>
                        </td>
                      )
                    })}
                    {back9.length > 0 && (
                      <td className="text-center py-1.5">
                        <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: '#f8fafc', color: '#152644' }}>
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
                { label: 'Birdies',  val: birdies },
                { label: 'Pars',     val: pars    },
                { label: 'Bogeys',   val: bogeys  },
                { label: 'Doubles+', val: doubles },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: '#f8fafc' }}>
                  <div className="text-xl font-bold" style={{ color: '#152644' }}>{stat.val}</div>
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

      {loaded && !round && (
        <div className="mx-4 mt-8 bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-semibold mb-2" style={{ color: '#152644' }}>Round not found</p>
          <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
            This round may have been deleted or saved on another device.
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
