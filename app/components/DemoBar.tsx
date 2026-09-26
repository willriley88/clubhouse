'use client'

import { useState, useMemo } from 'react'
import { DEMO_CLUBS, type DemoClub } from '@/lib/demo-clubs'

/**
 * Demo mode indicator + club switcher.
 *
 * Renders ONLY when a `?club=` slug is active, so a real member at a paying
 * club never sees it. Two jobs:
 *
 *  1. Make it unmistakable to Will (and honest to the prospect) that the
 *     branding is a preview, not a deployed app. A demo that silently looks
 *     like a live product invites a question he cannot answer well.
 *  2. Switch clubs in one tap during a meeting, without editing a URL by hand
 *     in front of someone.
 *
 * Collapsed by default to a small pill so it never obscures the UI being sold.
 */
export default function DemoBar({ slug, clubName }: { slug: string; clubName: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { nearby, others } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (c: DemoClub) =>
      !q ||
      c.club_name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase() === q
    const hits = DEMO_CLUBS.filter(match)
    return {
      nearby: hits.filter((c) => c.radius_rank !== null),
      others: hits.filter((c) => c.radius_rank === null),
    }
  }, [query])

  function go(target: string) {
    // Full navigation so the proxy re-runs and re-pins the cookie.
    window.location.href = `${window.location.pathname}?club=${target}`
  }

  function exitDemo() {
    window.location.href = `${window.location.pathname}?club=`
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Demo mode — switch club"
        className="fixed z-[60] left-3 bottom-[calc(72px+env(safe-area-inset-bottom))] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg"
        style={{
          background: 'rgba(15,23,42,0.88)',
          color: '#fff',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ color: '#fbbf24' }}>●</span> Demo · {clubName}
      </button>
    )
  }

  const Row = ({ c }: { c: DemoClub }) => (
    <button
      key={c.slug}
      onClick={() => go(c.slug)}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl"
      style={{ background: c.slug === slug ? 'rgba(255,255,255,0.10)' : 'transparent' }}
    >
      <span
        className="w-8 h-8 rounded-lg flex-shrink-0 border"
        style={{
          background: c.primary_color,
          borderColor: c.secondary_color ?? 'rgba(255,255,255,0.25)',
        }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-white truncate">
          {c.club_name}
        </span>
        <span className="block text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {c.location} · {c.club_type}
        </span>
      </span>
      {c.slug === slug && (
        <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>
          ACTIVE
        </span>
      )}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(10px)' }}
    >
      <div className="px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            Demo mode
          </p>
          <p className="text-sm font-bold text-white">
            {DEMO_CLUBS.length} clubs available
          </p>
        </div>
        <button
          onClick={exitDemo}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        >
          Exit demo
        </button>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          ✕
        </button>
      </div>

      <div className="px-4 pb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search club, town, or state…"
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-8">
        {nearby.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest"
               style={{ color: 'rgba(255,255,255,0.35)' }}>
              Near Mansfield, MA
            </p>
            {nearby.map((c) => <Row key={c.slug} c={c} />)}
          </>
        )}
        {others.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest"
               style={{ color: 'rgba(255,255,255,0.35)' }}>
              All clubs
            </p>
            {others.map((c) => <Row key={c.slug} c={c} />)}
          </>
        )}
        {nearby.length === 0 && others.length === 0 && (
          <p className="px-4 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            No clubs match “{query}”.
          </p>
        )}
      </div>
    </div>
  )
}
