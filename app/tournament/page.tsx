'use client'
import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type ClubEvent = {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string | null
  start_time: string | null
  description: string
  location: string | null
  external_link: string | null
  format: string | null
  field_size: number | null
  created_at: string
}

type Tab = 'calendar' | 'events' | 'tournaments' | 'leaderboard'

type LeaderboardEntry = {
  rank: number
  playerName: string
  gross: number
  toPar: number
  playedAt: string
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Parse YYYY-MM-DD without timezone shift
function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

function formatDateShort(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr)
  return `${MONTHS_SHORT[month - 1]} ${day}, ${year}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay() // 0 = Sunday
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// String-compare works for ISO dates (zero-padded YMD)
function eventsOnDate(events: ClubEvent[], dateStr: string): ClubEvent[] {
  return events.filter(e => {
    if (e.start_date > dateStr) return false
    const endDate = e.end_date ?? e.start_date
    return endDate >= dateStr
  })
}

function eventStatus(e: ClubEvent): 'upcoming' | 'live' | 'finished' {
  const today = new Date().toISOString().split('T')[0]
  const end = e.end_date ?? e.start_date
  if (end < today) return 'finished'
  if (e.start_date > today) return 'upcoming'
  return 'live'
}

function TypeBadge({ type }: { type: string }) {
  if (type === 'member')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#c9a84c', color: '#152644' }}>Members</span>
  if (type === 'hosting')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-200 text-gray-600">Private</span>
  if (type === 'tournament')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#152644', color: '#c9a84c' }}>Tournament</span>
  return null
}

function StatusBadge({ status }: { status: 'upcoming' | 'live' | 'finished' }) {
  if (status === 'live')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>Live</span>
  if (status === 'finished')
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Finished</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#152644' }}>Upcoming</span>
}

function ChevronRight({ rotated }: { rotated: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: rotated ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6"/>
    </svg>
  )
}

export default function Events() {
  const [tab,         setTab]         = useState<Tab>('calendar')
  const [events,      setEvents]      = useState<ClubEvent[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingLb,   setLoadingLb]   = useState(false)

  // Calendar: current view month/year
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  // Selected calendar date (for bottom sheet)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, type, start_date, end_date, start_time, description, location, external_link, format, field_size, created_at')
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setEvents((data as ClubEvent[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Fetch leaderboard when that tab is first opened
  async function loadLeaderboard() {
    if (leaderboard.length > 0) return // already loaded
    setLoadingLb(true)
    // Fetch 2026 rounds with profile name and scores
    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, played_at, profiles(full_name), scores(strokes, holes(par))')
      .gte('played_at', '2026-01-01')
      .lte('played_at', '2026-12-31')
      .order('played_at', { ascending: false })
      .limit(200)

    if (!rounds) { setLoadingLb(false); return }

    const entries: LeaderboardEntry[] = rounds
      .map((r: any) => {
        const name: string = r.profiles?.full_name || r.profiles?.[0]?.full_name || 'Member'
        const scoreRows: any[] = r.scores ?? []
        const gross = scoreRows.reduce((a: number, s: any) => a + (s.strokes ?? 0), 0)
        // sum par — holes is many-to-one object per score row
        const parTotal = scoreRows.reduce((a: number, s: any) => {
          const h = Array.isArray(s.holes) ? s.holes[0] : s.holes
          return a + (h?.par ?? 4)
        }, 0)
        return { playerName: name, gross, toPar: gross - parTotal, playedAt: r.played_at }
      })
      .filter(e => e.gross > 0)
      // rank by lowest gross
      .sort((a, b) => a.gross - b.gross)
      .slice(0, 20)
      .map((e, i) => ({ ...e, rank: i + 1 }))

    setLeaderboard(entries)
    setLoadingLb(false)
  }

  // Reset selected date when month changes
  function goToPrevMonth() {
    setSelectedDate(null)
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function goToNextMonth() {
    setSelectedDate(null)
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Clear expanded item when switching tabs; trigger leaderboard load on demand
  function switchTab(t: Tab) {
    setTab(t)
    setExpandedId(null)
    if (t === 'leaderboard') loadLeaderboard()
  }

  const today = new Date().toISOString().split('T')[0]

  // Build calendar cell array: null = empty leading/trailing cell
  const firstDay  = firstDayOfMonth(viewYear, viewMonth)
  const numDays   = daysInMonth(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const clubEvents       = events.filter(e => e.type === 'member' || e.type === 'hosting')
  const tournamentEvents = events.filter(e => e.type === 'tournament')
  const selectedEvents   = selectedDate ? eventsOnDate(events, selectedDate) : []

  return (
    <main className="min-h-screen bg-gray-100 pb-24">

      {/* ── HEADER ── */}
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">LeBaron Hills CC</p>
        <h1 className="text-white text-2xl font-bold">Events</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── PILL SWITCHER ── */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {([
            ['calendar',    'Calendar'],
            ['events',      'Club Events'],
            ['tournaments', 'Tournaments'],
            ['leaderboard', 'Leaderboard'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className="flex-shrink-0 py-2 px-3 rounded-full text-xs font-semibold"
              style={{
                background: tab === t ? '#152644' : '#f1f5f9',
                color:      tab === t ? '#c9a84c' : '#64748b',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CALENDAR TAB ── */}
        {tab === 'calendar' && (
          <>
            <div className="bg-white rounded-2xl overflow-hidden">

              {/* Month nav header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <button onClick={goToPrevMonth} className="p-1 -ml-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <span className="text-sm font-bold" style={{ color: '#152644' }}>
                  {MONTHS_LONG[viewMonth]} {viewYear}
                </span>
                <button onClick={goToNextMonth} className="p-1 -mr-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-2 pt-2 pb-0">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-gray-400 pb-1">{d}</div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 px-2 pb-3">
                {cells.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} className="h-10" />

                  const dateStr   = toDateStr(viewYear, viewMonth, day)
                  const isToday   = dateStr === today
                  const isSelected = dateStr === selectedDate
                  const dayEvents = eventsOnDate(events, dateStr)
                  const hasEvents = dayEvents.length > 0

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (!hasEvents) return
                        setSelectedDate(isSelected ? null : dateStr)
                      }}
                      className="flex flex-col items-center justify-start py-0.5"
                    >
                      <div
                        className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium"
                        style={{
                          background: isToday   ? '#152644' :
                                      isSelected ? '#e2e8f0' : 'transparent',
                          color: isToday ? 'white' : '#1e293b',
                          fontWeight: isToday || hasEvents ? 700 : 400,
                        }}
                      >
                        {day}
                      </div>
                      {/* Gold dot under days with events; invisible spacer otherwise so rows stay aligned */}
                      <div
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{ background: hasEvents ? '#c9a84c' : 'transparent' }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Events detail sheet for selected date */}
            {selectedDate && selectedEvents.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {/* Parse manually to avoid UTC-to-local shift */}
                    {(() => {
                      const { year, month, day } = parseDateParts(selectedDate)
                      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric',
                      })
                    })()}
                  </p>
                </div>
                {selectedEvents.map((e, i) => (
                  <div key={e.id}
                    className={`px-4 py-3 ${i < selectedEvents.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold flex-1" style={{ color: '#152644' }}>{e.title}</p>
                      <TypeBadge type={e.type} />
                    </div>
                    {e.start_time && (
                      <p className="text-xs text-gray-500">
                        {e.start_time}{e.location ? ` · ${e.location}` : ''}
                      </p>
                    )}
                    {e.description && <p className="text-xs text-gray-500 mt-1">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CLUB EVENTS TAB ── */}
        {tab === 'events' && (
          <div className="bg-white rounded-2xl overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : clubEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No events scheduled</div>
            ) : (
              clubEvents.map((e, i) => {
                const isExpanded = expandedId === e.id
                const isLast     = i === clubEvents.length - 1
                const { month: mo, day } = parseDateParts(e.start_date)

                return (
                  <Fragment key={e.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${!isExpanded && !isLast ? 'border-b border-gray-100' : ''}`}
                    >
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                        style={{ background: '#152644' }}>
                        <span className="text-[9px] font-bold uppercase leading-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {MONTHS_SHORT[mo - 1]}
                        </span>
                        <span className="text-lg font-bold leading-tight" style={{ color: '#c9a84c' }}>{day}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate flex-1" style={{ color: '#152644' }}>{e.title}</p>
                          <TypeBadge type={e.type} />
                        </div>
                        <p className="text-xs text-gray-400 truncate">{e.description}</p>
                      </div>
                      <ChevronRight rotated={isExpanded} />
                    </button>

                    {isExpanded && (
                      <div className={`px-4 py-3 bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                        <p className="text-sm text-gray-700">{e.description}</p>
                        {e.start_time && (
                          <p className="text-xs text-gray-500 mt-2">🕐 {e.start_time}</p>
                        )}
                        {e.location && (
                          <p className="text-xs text-gray-500 mt-0.5">📍 {e.location}</p>
                        )}
                        {e.end_date && e.end_date !== e.start_date && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDateShort(e.start_date)} – {formatDateShort(e.end_date)}
                          </p>
                        )}
                        {e.format && (
                          <p className="text-xs text-gray-500 mt-0.5">Format: {e.format}</p>
                        )}
                        {e.external_link && (
                          <button
                            onClick={() => window.open(e.external_link!, '_blank')}
                            className="mt-2.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ background: '#152644', color: '#c9a84c' }}
                          >
                            Learn More →
                          </button>
                        )}
                      </div>
                    )}
                  </Fragment>
                )
              })
            )}
          </div>
        )}

        {/* ── TOURNAMENTS TAB ── */}
        {tab === 'tournaments' && (
          <div className="bg-white rounded-2xl overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
            ) : tournamentEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No tournaments scheduled</div>
            ) : (
              tournamentEvents.map((e, i) => {
                const isExpanded = expandedId === e.id
                const isLast     = i === tournamentEvents.length - 1
                const status     = eventStatus(e)

                const dateDisplay = e.end_date && e.end_date !== e.start_date
                  ? `${formatDateShort(e.start_date)} – ${formatDateShort(e.end_date)}`
                  : formatDateShort(e.start_date)

                return (
                  <Fragment key={e.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${!isExpanded && !isLast ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: '#152644' }}>{e.title}</p>
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-xs text-gray-400">{dateDisplay}</p>
                        {e.format && <p className="text-xs text-gray-400">{e.format}</p>}
                      </div>
                      <ChevronRight rotated={isExpanded} />
                    </button>

                    {isExpanded && (
                      <div className={`px-4 py-3 bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                        <p className="text-sm text-gray-700">{e.description}</p>
                        {e.format && (
                          <p className="text-xs text-gray-500 mt-2">Format: {e.format}</p>
                        )}
                        {e.field_size && (
                          <p className="text-xs text-gray-500 mt-0.5">Field size: {e.field_size} players</p>
                        )}
                        {e.location && (
                          <p className="text-xs text-gray-500 mt-0.5">📍 {e.location}</p>
                        )}
                        {e.start_time && (
                          <p className="text-xs text-gray-500 mt-0.5">🕐 {e.start_time}</p>
                        )}
                        {e.external_link && (
                          <button
                            onClick={() => window.open(e.external_link!, '_blank')}
                            className="mt-2.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ background: '#152644', color: '#c9a84c' }}
                          >
                            Register →
                          </button>
                        )}
                      </div>
                    )}
                  </Fragment>
                )
              })
            )}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === 'leaderboard' && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
              Season Leaderboard · LeBaron Hills CC
            </p>
            <div className="bg-white rounded-2xl overflow-hidden">
              {loadingLb ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
              ) : leaderboard.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No rounds recorded for 2026 yet</div>
              ) : (
                <>
                  {/* Column header */}
                  <div className="grid px-4 py-2 border-b border-gray-100"
                    style={{ gridTemplateColumns: '32px 1fr 48px 48px 56px' }}>
                    <span className="text-[10px] font-bold uppercase text-gray-400">#</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400">Player</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400 text-center">Gross</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400 text-center">+/−</span>
                    <span className="text-[10px] font-bold uppercase text-gray-400 text-right">Date</span>
                  </div>

                  {leaderboard.map((entry, i) => {
                    const toParStr = entry.toPar === 0 ? 'E' : entry.toPar > 0 ? `+${entry.toPar}` : String(entry.toPar)
                    // gold = under par, green = even, slate = over
                    const toParColor = entry.toPar < 0 ? '#c9a84c' : entry.toPar === 0 ? '#15803d' : '#64748b'
                    const { month, day } = parseDateParts(entry.playedAt)
                    const dateStr = `${MONTHS_SHORT[month - 1]} ${day}`
                    const isLast = i === leaderboard.length - 1

                    return (
                      <div key={i}
                        className={`grid items-center px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
                        style={{ gridTemplateColumns: '32px 1fr 48px 48px 56px' }}>
                        <span className="text-sm font-bold" style={{ color: i === 0 ? '#c9a84c' : '#94a3b8' }}>{entry.rank}</span>
                        <span className="text-sm font-semibold truncate" style={{ color: '#152644' }}>{entry.playerName}</span>
                        <span className="text-sm font-bold text-center" style={{ color: '#152644' }}>{entry.gross}</span>
                        <span className="text-sm font-bold text-center" style={{ color: toParColor }}>{toParStr}</span>
                        <span className="text-xs text-right" style={{ color: '#94a3b8' }}>{dateStr}</span>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </main>
  )
}
