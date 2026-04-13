'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'
import { supabase } from '@/lib/supabase'

// ── Course Data ──────────────────────────────────────────────────────────────
const HOLES = [
  { h: 1,  par: 4, hcp: 11 },
  { h: 2,  par: 4, hcp: 3  },
  { h: 3,  par: 5, hcp: 9  },
  { h: 4,  par: 3, hcp: 15 },
  { h: 5,  par: 4, hcp: 13 },
  { h: 6,  par: 4, hcp: 1  },
  { h: 7,  par: 4, hcp: 5  },
  { h: 8,  par: 3, hcp: 17 },
  { h: 9,  par: 5, hcp: 7  },
  { h: 10, par: 5, hcp: 18 },
  { h: 11, par: 3, hcp: 16 },
  { h: 12, par: 4, hcp: 12 },
  { h: 13, par: 3, hcp: 14 },
  { h: 14, par: 4, hcp: 2  },
  { h: 15, par: 5, hcp: 8  },
  { h: 16, par: 4, hcp: 6  },
  { h: 17, par: 4, hcp: 4  },
  { h: 18, par: 4, hcp: 10 },
]

const TEE_DATA: Record<string, { label: string; rating: number; slope: number; yds: number[]; frontYds: number; backYds: number }> = {
  blue:  { label: 'Blue',  rating: 73.4, slope: 136, frontYds: 3415, backYds: 3388, yds: [424,415,543,183,380,438,353,168,511,491,184,339,210,413,552,412,389,398] },
  white: { label: 'White', rating: 71.2, slope: 130, frontYds: 3221, backYds: 3171, yds: [400,393,509,174,349,412,327,164,493,470,147,330,193,386,507,391,370,377] },
  green: { label: 'Green', rating: 69.8, slope: 124, frontYds: 3131, backYds: 3010, yds: [374,381,509,174,349,382,302,164,496,470,147,330,163,351,481,347,370,351] },
  gold:  { label: 'Gold',  rating: 68.1, slope: 118, frontYds: 3011, backYds: 2886, yds: [374,381,469,161,334,382,302,154,454,432,121,313,163,351,481,347,327,351] },
}

const COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'
const AVATAR_COLORS = ['#152644', '#c9a84c', '#2d6a4f', '#7b2d8b']

type Player = { id: number; name: string; handicap: number | null; avatarColor: string; isUser: boolean }

// Score vs par → CSS classes for bubble
const BUBBLE: Record<string, string> = {
  eagle:  'rounded-full outline outline-2 outline-offset-1 outline-slate-800 border-2 border-slate-800 text-slate-800',
  birdie: 'rounded-full border-2 border-slate-800 text-slate-800',
  par:    'text-slate-800',
  bogey:  'rounded-sm border border-slate-800 text-slate-800',
  double: 'rounded-sm outline outline-2 outline-offset-1 outline-slate-800 border border-slate-800 text-slate-800',
  triple: 'rounded-sm outline outline-2 outline-offset-1 outline-slate-800 border border-slate-800 text-slate-800',
}

// Score grid button outline shapes
const GRID_SHAPE: Record<string, string> = {
  eagle:  'outline outline-[2.5px] outline-offset-[-3px] outline-amber-400',
  birdie: '!rounded-full',
  par:    '',
  bogey:  'border-2 border-amber-400',
  double: 'border-[3px] border-double border-slate-400',
  triple: 'border-2 border-red-400',
}

function scoreClass(score: number, par: number) {
  const d = score - par
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0)  return 'par'
  if (d === 1)  return 'bogey'
  if (d === 2)  return 'double'
  return 'triple'
}

export default function ScorecardPage() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'Guest', handicap: null, avatarColor: AVATAR_COLORS[0], isUser: true }
  ])
  const [scores, setScores] = useState<(number|null)[][]>([Array(18).fill(null)])
  const [putts,  setPutts]  = useState<(number|null)[][]>([Array(18).fill(null)])
  const [tee,    setTee]    = useState('blue')

  // Sheet state
  const [sheetOpen,     setSheetOpen]     = useState(false)
  const [sheetHole,     setSheetHole]     = useState(0)
  const [sheetPlayer,   setSheetPlayer]   = useState(0)
  const [selScore,      setSelScore]      = useState<number|null>(null)
  const [selPutt,       setSelPutt]       = useState<number|null>(null)

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false)
  const [editName,    setEditName]    = useState('Guest')
  const [editHcp,     setEditHcp]     = useState('')

  //FIR/GIR 
  const [selFairway, setSelFairway] = useState<'hit'|'miss'|null>(null)
  const [selGir,     setSelGir]     = useState<'hit'|'miss'|null>(null)

  // Misc
  const [courseId,        setCourseId]        = useState(COURSE_ID_FALLBACK)
  const [saving,          setSaving]          = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [roundActive,     setRoundActive]     = useState(false)
  const [showShare,       setShowShare]       = useState(false)
  const [shareGross,      setShareGross]      = useState(0)
  const [shareDiff,       setShareDiff]       = useState(0)
  const [copied,          setCopied]          = useState(false)

  // Load user + profile + course ID on mount
  useEffect(() => {
    // Resolve course_id via club_config — works for any club without hardcoding
    // the course name; falls back to COURSE_ID_FALLBACK if DB unreachable
    supabase.from('club_config').select('course_id').limit(1).single()
      .then(({ data: c }) => { if (c?.course_id) setCourseId(c.course_id) })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'You'
        setEditName(name)
        setPlayers([{ id: 0, name, handicap: null, avatarColor: AVATAR_COLORS[0], isUser: true }])
        supabase.from('profiles').select('full_name,handicap').eq('id', data.user.id).single()
          .then(({ data: p }) => {
            if (p) {
              setEditName(p.full_name || name)
              setEditHcp(p.handicap?.toString() || '')
              setPlayers(prev => prev.map((pl, i) => i === 0 ? { ...pl, name: p.full_name || name, handicap: p.handicap } : pl))
            }
          })
      } else {
        // Guest — restore from localStorage
        try {
          const g = JSON.parse(localStorage.getItem('clubhouse_guest') || '{}')
          if (g.name) {
            setEditName(g.name)
            setEditHcp(g.handicap?.toString() || '')
            setPlayers([{ id: 0, name: g.name, handicap: g.handicap || null, avatarColor: AVATAR_COLORS[0], isUser: true }])
          }
        } catch {}
      }
    })
  }, [])

  // Detect round active
  useEffect(() => {
    if (scores[0].some(s => s !== null)) setRoundActive(true)
  }, [scores])

  const teeData = TEE_DATA[tee]
  const filled  = scores[0].filter(s => s !== null).length
  const total0  = scores[0].reduce((a: number, v) => a + (v ?? 0), 0)
  const parSoFar = HOLES.slice(0, filled).reduce((a, h) => a + h.par, 0)
  const toPar   = filled > 0 ? total0 - parSoFar : null

  function sub(pIdx: number, start: number, end: number) {
    return scores[pIdx]?.slice(start, end).reduce((a: number, v) => a + (v ?? 0), 0) ?? 0
  }
  function anyFilled(pIdx: number, start: number, end: number) {
    return scores[pIdx]?.slice(start, end).some(v => v !== null) ?? false
  }

  function addPlayer() {
    if (players.length >= 4) return
    const idx = players.length
    setPlayers(p => [...p, { id: idx, name: `Guest ${idx + 1}`, handicap: null, avatarColor: AVATAR_COLORS[idx], isUser: false }])
    setScores(s => [...s, Array(18).fill(null)])
    setPutts(p => [...p, Array(18).fill(null)])
  }

  function openSheet(holeIdx: number, playerIdx: number) {
    setSheetHole(holeIdx)
    setSheetPlayer(playerIdx)
    setSelScore(scores[playerIdx]?.[holeIdx] ?? null)
    setSelPutt(putts[playerIdx]?.[holeIdx] ?? null)
    setSelFairway(null)
    setSelGir(null)
    setSheetOpen(true)
  }

  function commitSheet(hIdx: number, pIdx: number, sc: number|null, pt: number|null) {
    if (sc === null) return
    setScores(prev => { const n = prev.map(r => [...r]); n[pIdx][hIdx] = sc; return n })
    setPutts(prev => { const n = prev.map(r => [...r]); n[pIdx][hIdx] = pt; return n })
  }

  function closeSheet() {
    commitSheet(sheetHole, sheetPlayer, selScore, selPutt)
    setSheetOpen(false)
  }

  function nextHole() {
    commitSheet(sheetHole, sheetPlayer, selScore, selPutt)
    if (sheetHole < 17) {
      const next = sheetHole + 1
      setSheetHole(next)
      setSelScore(scores[sheetPlayer]?.[next] ?? null)
      setSelPutt(putts[sheetPlayer]?.[next] ?? null)
      setSelFairway(null)
      setSelGir(null)
    } else {
      setSheetOpen(false)
    }
  }

  function prevHole() {
    commitSheet(sheetHole, sheetPlayer, selScore, selPutt)
    if (sheetHole > 0) {
      const prev = sheetHole - 1
      setSheetHole(prev)
      setSelScore(scores[sheetPlayer]?.[prev] ?? null)
      setSelPutt(putts[sheetPlayer]?.[prev] ?? null)
      setSelFairway(null)
      setSelGir(null)
    } else {
      setSheetOpen(false)
    }
  }

  async function finishRound() {
    if (!user) { setShowLoginPrompt(true); return }
    setSaving(true)
    const { data: round, error } = await supabase
      .from('rounds').insert({ profile_id: user.id, course_id: courseId, format: 'stroke' })
      .select().single()
    if (error || !round) { setSaving(false); return }

    const { data: holeRows } = await supabase
      .from('holes').select('id,hole_number').eq('course_id', courseId).order('hole_number')

    if (holeRows) {
      await supabase.from('scores').insert(
        holeRows.map((h, i) => ({ round_id: round.id, hole_id: h.id, strokes: scores[0][i] ?? 0, putts: putts[0][i] ?? null }))
      )
    }
    const diff = ((total0 - teeData.rating) * 113) / teeData.slope
    // Use new dedicated columns (score_format + differential) introduced in
    // 20260410_schema_cleanup.sql. Keep the legacy format string for backwards
    // compat with any code that still reads it.
    await supabase.from('rounds').update({
      score_format: 'stroke',
      differential: parseFloat(diff.toFixed(1)),
      format: `stroke|diff:${diff.toFixed(1)}`,
    }).eq('id', round.id)
    setSaving(false)
    setShareGross(total0)
    setShareDiff(diff)
    setShowShare(true)
  }

  async function saveProfile() {
    const hcp = editHcp ? parseFloat(editHcp) : null
    setPlayers(p => p.map((pl, i) => i === 0 ? { ...pl, name: editName, handicap: hcp } : pl))
    if (user) {
      await supabase.from('profiles').update({ full_name: editName, handicap: hcp }).eq('id', user.id)
    } else {
      localStorage.setItem('clubhouse_guest', JSON.stringify({ name: editName, handicap: hcp }))
    }
    setProfileOpen(false)
  }

  const par = HOLES[sheetHole]?.par ?? 4

  return (
    <main className="min-h-screen pb-[max(240px,env(safe-area-inset-bottom))]" style={{ background: '#f1f5f9' }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 px-4 pt-[max(48px,env(safe-area-inset-top))] pb-3" style={{ background: '#152644' }}>
        <div className="flex justify-between items-start mb-1">
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {roundActive ? 'Round in Progress' : 'LeBaron Hills CC'}
            </p>
            <h1 className="text-xl font-bold text-white">LeBaron Hills CC</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {teeData.label} Tees · Par 72 · {teeData.yds.reduce((a,v)=>a+v,0).toLocaleString()} yds · {teeData.rating}/{teeData.slope}
            </p>
          </div>
          <button onClick={() => router.push('/rounds')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
            History →
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          {[
            { val: filled > 0 ? total0 : '—', lbl: 'Score' },
            { val: toPar !== null ? (toPar > 0 ? `+${toPar}` : toPar === 0 ? 'E' : toPar) : '—', lbl: 'To Par' },
            { val: `${filled}/18`, lbl: 'Holes' },
          ].map(s => (
            <div key={s.lbl} className="text-center">
              <div className="text-lg font-bold text-white">{s.val}</div>
              <div className="text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.lbl}</div>
            </div>
          ))}
          <div className="relative">
            <select value={tee} onChange={e => setTee(e.target.value)}
              className="w-auto text-xs font-semibold pl-3 pr-7 py-1.5 rounded-xl border-none outline-none appearance-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
              <option value="blue" style={{ background: 'white', color: '#1e293b' }}>Blue</option>
              <option value="white" style={{ background: 'white', color: '#1e293b' }}>White</option>
              <option value="green" style={{ background: 'white', color: '#1e293b' }}>Green</option>
              <option value="gold" style={{ background: 'white', color: '#1e293b' }}>Gold</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-[10px]">▾</span>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="px-3 pt-3">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 44 }} />{/* Hole */}
              <col style={{ width: 36 }} />{/* Par */}
              <col style={{ width: 50 }} />{/* Yds */}
              {players.map((_, i) => <col key={i} style={{ width: 72 }} />)}
              {players.length < 4 && <col style={{ width: 52 }} />}
            </colgroup>

            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th className="text-left pl-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Hole</th>
                <th className="text-center py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Par</th>
                <th className="text-center py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Yds</th>
                {players.map((player, i) => (
                  <th key={i} className="text-center py-1.5 relative">
                       {/* X to remove non-user players */}
                      {!player.isUser && (
                        <button
                          onClick={() => {
                            setPlayers(p => p.filter((_, pi) => pi !== i))
                            setScores(s => s.filter((_, si) => si !== i))
                            setPutts(p => p.filter((_, pi) => pi !== i))
                           }}
                          className="absolute top-0 right-1 text-slate-400 text-xs leading-none"
                         >×</button>
                       )}
                       <button onClick={() => player.isUser && setProfileOpen(true)}
                          className="flex flex-col items-center gap-0.5 w-full">
                         <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto"
                          style={{ background: player.avatarColor }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{player.name.split(' ')[0]}</span>
                         {player.isUser && <span className="text-[9px] font-medium text-blue-400">edit</span>}
                       </button>
                     </th>
                    ))}
                {players.length < 4 && (
                  <th className="text-center py-1.5">
                    <button onClick={addPlayer} className="flex flex-col items-center gap-0.5 w-full">
                      <div className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center text-lg font-light mx-auto"
                        style={{ borderColor: '#c9a84c', color: '#c9a84c' }}>+</div>
                      <span className="text-[9px] font-semibold" style={{ color: '#c9a84c' }}>Add</span>
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {HOLES.map((hole, i) => (
                <React.Fragment key={hole.h}>
                    {i === 9 && (
                    <tr key="out" style={{ background: '#f0f4f8', borderTop: '1px solid #dde3ea', borderBottom: '1px solid #dde3ea' }}>
                      <td className="pl-2.5 py-2 text-xs font-bold" style={{ color: '#152644' }}>Out</td>
                      <td className="text-center text-xs font-bold" style={{ color: '#152644' }}>36</td>
                      <td className="text-center text-xs text-slate-400">{teeData.frontYds.toLocaleString()}</td>
                      {players.map((_, pIdx) => (
                        <td key={pIdx} className="text-center text-xs font-bold" style={{ color: '#152644' }}>
                          {anyFilled(pIdx, 0, 9) ? sub(pIdx, 0, 9) : '—'}
                        </td>
                      ))}
                      {players.length < 4 && <td />}
                    </tr>
                  )}

                  <tr key={hole.h} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid #f8fafc' }}>
                    <td className="pl-2.5 py-2.5">
                      <div className="text-sm font-bold" style={{ color: '#152644' }}>{hole.h}</div>
                      <div className="text-[10px] text-slate-400">H{hole.hcp}</div>
                    </td>
                    <td className="text-center text-sm font-semibold text-slate-600">{hole.par}</td>
                    <td className="text-center text-xs text-slate-400">{teeData.yds[i]}</td>
                    {players.map((_, pIdx) => {
                      const s = scores[pIdx]?.[i] ?? null
                      const cls = s !== null ? scoreClass(s, hole.par) : null
                      return (
                        <td key={pIdx} className="text-center py-2">
                          <button onClick={() => openSheet(i, pIdx)}
                            className={`w-8 h-8 inline-flex items-center justify-center text-sm font-semibold transition-transform active:scale-90
                              ${cls ? BUBBLE[cls] : 'rounded-full border border-dashed border-slate-300 text-slate-300'}`}>
                            {s ?? '—'}
                          </button>
                        </td>
                      )
                    })}
                    {players.length < 4 && <td />}
                  </tr>
                </React.Fragment>
              ))}

              {/* IN subtotal */}
              <tr style={{ background: '#f0f4f8', borderTop: '1px solid #dde3ea', borderBottom: '1px solid #dde3ea' }}>
                <td className="pl-2.5 py-2 text-xs font-bold" style={{ color: '#152644' }}>In</td>
                <td className="text-center text-xs font-bold" style={{ color: '#152644' }}>36</td>
                <td className="text-center text-xs text-slate-400">{teeData.backYds.toLocaleString()}</td>
                {players.map((_, pIdx) => (
                  <td key={pIdx} className="text-center text-xs font-bold" style={{ color: '#152644' }}>
                    {anyFilled(pIdx, 9, 18) ? sub(pIdx, 9, 18) : '—'}
                  </td>
                ))}
                {players.length < 4 && <td />}
              </tr>

              {/* TOTAL */}
              <tr style={{ background: '#152644' }}>
                <td className="pl-2.5 py-2.5 text-xs font-bold" style={{ color: '#c9a84c' }}>Tot</td>
                <td className="text-center text-xs font-bold" style={{ color: '#c9a84c' }}>72</td>
                <td />
                {players.map((_, pIdx) => {
                  const t = scores[pIdx]?.reduce((a: number, v) => a + (v ?? 0), 0) ?? 0
                  const f = scores[pIdx]?.filter(v => v !== null).length ?? 0
                  return (
                    <td key={pIdx} className="text-center text-sm font-bold" style={{ color: '#c9a84c' }}>
                      {f > 0 ? t : '—'}
                    </td>
                  )
                })}
                {players.length < 4 && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-2 pb-20 z-30">
        <button onClick={finishRound} disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base mb-1"
          style={{ background: '#c9a84c' }}>
          {saving ? 'Saving...' : 'Finish Round'}
        </button>
        {roundActive && (
          <button
            onClick={() => { setScores([Array(18).fill(null)]); setRoundActive(false) }}
            className="w-full py-1 text-xs font-medium text-red-400">
            Delete Round
          </button>
        )}
      </div>

   {/* ── SCORE INPUT SHEET ── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ zIndex: 100, background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) closeSheet() }}>
          <div className="bg-white w-full rounded-t-3xl px-4 pt-4 pb-6 flex flex-col gap-3">

            {/* Header: ‹ Hole X · Par Y › — arrows navigate prev/next without closing */}
            <div className="flex items-center justify-between">
              <button onClick={prevHole}
                className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90"
                style={{ background: '#f1f5f9' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <span className="text-base font-bold" style={{ color: '#152644' }}>
                Hole {sheetHole + 1} · Par {par}
              </span>
              <button onClick={nextHole}
                className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90"
                style={{ background: '#f1f5f9' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Score grid: 3×2, stroke numbers with score-type shapes, no text labels */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { diff: -2, shapeClass: 'rounded-full outline outline-[2.5px] outline-offset-[3px] border-2' },
                { diff: -1, shapeClass: 'rounded-full border-2' },
                { diff:  0, shapeClass: '' },
                { diff:  1, shapeClass: 'rounded-sm border-2' },
                { diff:  2, shapeClass: 'rounded-sm outline outline-[2.5px] outline-offset-[3px] border-2' },
                { diff:  3, shapeClass: 'rounded-sm outline outline-[2.5px] outline-offset-[3px] border-2 border-dashed' },
              ] as { diff: number; shapeClass: string }[]).map(({ diff, shapeClass }) => {
                const v = par + diff
                if (v < 1) return null
                const isSelected = selScore === v
                return (
                  <button key={diff} onClick={() => setSelScore(v)}
                    className="py-4 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                    style={{ background: isSelected ? '#152644' : '#f1f5f9' }}>
                    <span
                      className={`w-9 h-9 flex items-center justify-center text-lg font-bold ${shapeClass}`}
                      style={{
                        color:        isSelected ? '#c9a84c' : '#152644',
                        outlineColor: isSelected ? '#c9a84c' : '#152644',
                        borderColor:  isSelected ? '#c9a84c' : '#152644',
                      }}>
                      {v}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Putts — pill buttons */}
            <div className="flex gap-1.5">
              {([0, 1, 2, 3, '≥4'] as (number | string)[]).map((v, i) => {
                const val = i === 4 ? 4 : Number(v)
                const isSel = selPutt === val
                return (
                  <button key={i} onClick={() => setSelPutt(isSel ? null : val)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                    style={{ background: isSel ? '#152644' : '#f1f5f9', color: isSel ? 'white' : '#152644' }}>
                    {v}
                  </button>
                )
              })}
            </div>

            {/* Fairway + GIR — hide Fairway on par 3s */}
            <div className={`flex gap-3 ${par === 3 ? 'justify-center' : ''}`}>
              {par !== 3 && (
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>Fairway</p>
                  <div className="flex gap-1.5">
                    {([{ label: '✓', val: 'hit' as const }, { label: '✕', val: 'miss' as const }]).map(opt => (
                      <button key={opt.val}
                        onClick={() => setSelFairway(selFairway === opt.val ? null : opt.val)}
                        className="flex-1 py-2.5 rounded-xl text-base font-bold"
                        style={{
                          background: selFairway === opt.val ? (opt.val === 'hit' ? '#152644' : '#fee2e2') : '#f1f5f9',
                          color: selFairway === opt.val ? (opt.val === 'hit' ? 'white' : '#ef4444') : '#94a3b8',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={par === 3 ? 'w-1/2' : 'flex-1'}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#94a3b8' }}>GIR</p>
                <div className="flex gap-1.5">
                  {([{ label: '✓', val: 'hit' as const }, { label: '✕', val: 'miss' as const }]).map(opt => (
                    <button key={opt.val}
                      onClick={() => setSelGir(selGir === opt.val ? null : opt.val)}
                      className="flex-1 py-2.5 rounded-xl text-base font-bold"
                      style={{
                        background: selGir === opt.val ? (opt.val === 'hit' ? '#152644' : '#fee2e2') : '#f1f5f9',
                        color: selGir === opt.val ? (opt.val === 'hit' ? 'white' : '#ef4444') : '#94a3b8',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Finish Hole → commits score and advances to next hole */}
            <button onClick={nextHole}
              className="w-full py-4 rounded-2xl font-bold text-base"
              style={{ background: '#152644', color: '#c9a84c' }}>
              Finish Hole →
            </button>

          </div>
        </div>
      )}
      {/* ── EDIT PROFILE MODAL ── */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setProfileOpen(false) }}>
          <div className="bg-white w-full max-w-sm rounded-3xl px-5 pt-6 pb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#152644' }}>Edit Profile</h2>
              <button onClick={() => setProfileOpen(false)} className="text-slate-400 text-2xl leading-none">×</button>
            </div>

            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: '#152644' }}>
                {editName.charAt(0).toUpperCase()}
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm mb-4 outline-none"
              style={{ borderColor: '#dde3ea' }} placeholder="Your name" />

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Handicap Index</label>
            <input value={editHcp} onChange={e => setEditHcp(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm mb-4 outline-none"
              style={{ borderColor: '#dde3ea' }} placeholder="e.g. 12.4" type="number" step="0.1" />

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Preferred Tees</label>
            <select value={tee} onChange={e => setTee(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm mb-6 outline-none appearance-none"
              style={{ borderColor: '#dde3ea' }}>
              {Object.entries(TEE_DATA).map(([k, v]) => (
                <option key={k} value={k}>{v.label} Tees</option>
              ))}
            </select>

            <button onClick={saveProfile}
              className="w-full py-4 rounded-2xl text-white font-bold text-base mb-3"
              style={{ background: '#c9a84c' }}>
              {user ? 'Save Profile' : 'Save as Guest'}
            </button>

            {!user && (
              <button onClick={() => { setProfileOpen(false); router.push('/login') }}
                className="w-full py-3 text-sm font-semibold text-center" style={{ color: '#152644' }}>
                Log in to sync your profile →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SHARE SHEET ── */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-center mb-1" style={{ color: '#152644' }}>Round Complete</h2>
            <p className="text-center text-sm text-slate-400 mb-6">Nice round — here&apos;s your summary</p>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: '#152644' }}>{shareGross}</div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Gross</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: '#c9a84c' }}>
                  {shareDiff >= 0 ? `+${shareDiff.toFixed(1)}` : shareDiff.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Differential</div>
              </div>
            </div>
            <button
              onClick={async () => {
                const vspar = shareGross - 72
                const label = vspar === 0 ? 'E' : vspar > 0 ? `+${vspar}` : String(vspar)
                const text = `Shot ${shareGross} (${label}) at LeBaron Hills CC via Clubhouse \uD83C\uDFC7`
                if (navigator.share) {
                  try { await navigator.share({ text }) } catch {}
                } else {
                  await navigator.clipboard.writeText(text)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
              }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base mb-3"
              style={{ background: '#152644' }}
            >
              {copied ? 'Copied!' : 'Share Score'}
            </button>
            <button onClick={() => { setShowShare(false); router.push('/') }}
              className="w-full py-3 text-sm font-semibold text-center" style={{ color: '#152644' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── LOGIN PROMPT ── */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-xl font-bold mb-2" style={{ color: '#152644' }}>Save Your Round</h2>
            <p className="text-sm text-slate-500 mb-5">Log in to save your scorecard and track your handicap over time.</p>
            <button onClick={() => router.push('/login')}
              className="w-full py-3.5 rounded-2xl text-white font-bold mb-2"
              style={{ background: '#c9a84c' }}>Log In</button>
            <button onClick={() => setShowLoginPrompt(false)}
              className="w-full py-2.5 text-sm text-slate-400">Continue without saving</button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
