'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

// LeBaron Hills hole pars and HCP indices (matches seeded holes table)
const HOLE_PARS:    number[] = [4,4,5,3,4,4,4,3,5, 5,3,4,3,4,5,4,4,4]
const HOLE_HCP_IDX: number[] = [1,7,11,17,3,13,5,15,9, 2,16,6,18,10,4,12,14,8]
const COURSE_PAR = 72

type Tournament = {
  id: string
  name: string
  subtitle: string
  status: string
}

type Entry = {
  id: string
  player_name: string
  player_initials: string
  handicap_index: number
}

type HoleScore = {
  entry_id: string
  hole_number: number
  strokes: number
}

type PlayerRow = {
  entry: Entry
  gross: number
  net_vs_par: number     // net score vs par (negative = under)
  stableford: number     // total stableford points
  holes_played: number
}

// Playing handicap = round(handicap_index × 113 / slope), slope 136 for LeBaron
function playingHandicap(idx: number): number {
  return Math.round(idx * 113 / 136)
}

// Stableford points for one hole: max(0, 2 + par - net_strokes)
// Net strokes = gross - 1 if hole hcp_index <= playing_handicap, else gross
function stablefordPoints(gross: number, par: number, hcpIdx: number, playingHcp: number): number {
  const extraStrokes = hcpIdx <= playingHcp ? 1 : 0
  return Math.max(0, 2 + par - (gross - extraStrokes))
}

function scoreToPar(net_vs_par: number): string {
  if (net_vs_par === 0) return 'E'
  return net_vs_par > 0 ? `+${net_vs_par}` : String(net_vs_par)
}

function positionColor(pos: number): string {
  if (pos === 1) return '#c9a84c'
  if (pos === 2) return '#94a3b8'
  if (pos === 3) return '#b45309'
  return '#d1d5db'
}

// Deterministic avatar colors from initials
const AVATAR_PALETTE = [
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#fef9c3', color: '#854d0e' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#ffedd5', color: '#c2410c' },
]
function avatarStyle(initials: string) {
  return AVATAR_PALETTE[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_PALETTE.length]
}

type Tab = 'overall' | 'today' | 'stableford'

export default function Tournament() {
  const [tab, setTab] = useState<Tab>('overall')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch most recent tournament
      const { data: tData } = await supabase
        .from('tournaments')
        .select('id, name, subtitle, status')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!tData) { setLoading(false); return }
      setTournament(tData)

      // Fetch entries
      const { data: eData } = await supabase
        .from('tournament_entries')
        .select('id, player_name, player_initials, handicap_index')
        .eq('tournament_id', tData.id)

      const entries: Entry[] = eData ?? []
      if (entries.length === 0) { setLoading(false); return }

      // Fetch all scores in one query
      const entryIds = entries.map(e => e.id)
      const { data: sData } = await supabase
        .from('tournament_scores')
        .select('entry_id, hole_number, strokes')
        .in('entry_id', entryIds)

      const scores: HoleScore[] = sData ?? []

      // Compute per-player summary
      const computed: PlayerRow[] = entries.map(entry => {
        const entryScores = scores
          .filter(s => s.entry_id === entry.id)
          .sort((a, b) => a.hole_number - b.hole_number)

        const phcp = playingHandicap(entry.handicap_index)
        let gross = 0
        let stableford = 0

        for (const s of entryScores) {
          const holeIdx = s.hole_number - 1
          const par = HOLE_PARS[holeIdx]
          const hcpIdx = HOLE_HCP_IDX[holeIdx]
          gross += s.strokes
          stableford += stablefordPoints(s.strokes, par, hcpIdx, phcp)
        }

        const net = gross - phcp
        const net_vs_par = net - COURSE_PAR

        return {
          entry,
          gross,
          net_vs_par,
          stableford,
          holes_played: entryScores.length,
        }
      })

      setRows(computed)
      setLoading(false)
    }

    load()
  }, [])

  // Sort order depends on tab
  const sorted = [...rows].sort((a, b) => {
    if (tab === 'stableford') return b.stableford - a.stableford
    return a.net_vs_par - b.net_vs_par
  })

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">LeBaron Hills CC</p>
        <h1 className="text-white text-2xl font-bold">
          {tournament?.name ?? 'Tournament'}
        </h1>
        <p className="text-white/40 text-xs mt-1">
          {tournament?.subtitle ?? ''}
        </p>
        {tournament?.status === 'live' && (
          <div className="inline-flex items-center gap-1.5 bg-[#c9a84c]/15 border border-[#c9a84c]/30 rounded-full px-3 py-1 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
            <span className="text-[#c9a84c] text-xs font-semibold">Live</span>
          </div>
        )}
        <div className="flex gap-1 mt-3 bg-white/5 rounded-lg p-1">
          {(['overall', 'today', 'stableford'] as Tab[]).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 text-xs py-1.5 rounded-md font-medium capitalize"
              style={{
                background: tab === t ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              {t === 'overall' ? 'Overall' : t === 'today' ? 'Today' : 'Stableford'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : !tournament ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No tournament active</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              Check back when a tournament is scheduled at LeBaron Hills CC
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No players entered yet</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              The leaderboard will appear once scores are submitted
            </p>
          </div>
        ) : (
          sorted.map((row, i) => {
            const pos = i + 1
            const { bg, color } = avatarStyle(row.entry.player_initials)
            const thru = row.holes_played === 18 ? 'F+18' : String(row.holes_played)
            const scoreDisplay = tab === 'stableford'
              ? String(row.stableford)
              : scoreToPar(row.net_vs_par)
            const scoreColor = tab === 'stableford'
              ? '#152644'
              : row.net_vs_par < 0 ? '#16a34a' : row.net_vs_par === 0 ? '#152644' : '#ef4444'

            return (
              <div
                key={row.entry.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < sorted.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="text-sm font-bold w-5 text-center" style={{ color: positionColor(pos) }}>
                  {pos}
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: bg, color }}
                >
                  {row.entry.player_initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#152644]">{row.entry.player_name}</p>
                  <p className="text-xs text-gray-400">HCP {row.entry.handicap_index}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold" style={{ color: scoreColor }}>
                    {scoreDisplay}
                  </p>
                  <p className="text-xs text-gray-400">{thru}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
      <BottomNav />
    </main>
  )
}
