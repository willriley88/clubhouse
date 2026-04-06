'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

const COURSE_ID = 'b0000000-0000-0000-0000-000000000001'

type Tee = 'blue' | 'white' | 'green' | 'gold'

type HoleData = {
  hole_number: number
  par: number
  hcp_index: number
  yardage_blue: number
  yardage_white: number
  yardage_green: number
  yardage_gold: number
}

const TEE_LABELS: Record<Tee, string> = {
  blue: 'Blue', white: 'White', green: 'Green', gold: 'Gold',
}
const TEE_COLORS: Record<Tee, string> = {
  blue: '#1d4ed8', white: '#475569', green: '#15803d', gold: '#c9a84c',
}

export default function GPS() {
  const [holes, setHoles] = useState<HoleData[]>([])
  const [currentHole, setCurrentHole] = useState(1)
  const [selectedTee, setSelectedTee] = useState<Tee>('blue')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('holes')
      .select('hole_number, par, hcp_index, yardage_blue, yardage_white, yardage_green, yardage_gold')
      .eq('course_id', COURSE_ID)
      .order('hole_number')
      .then(({ data }) => {
        if (data) setHoles(data)
        setLoading(false)
      })
  }, [])

  const hole = holes.find(h => h.hole_number === currentHole)
  const yardage = hole ? hole[`yardage_${selectedTee}` as keyof HoleData] as number : 0

  function prev() { setCurrentHole(n => Math.max(1, n - 1)) }
  function next() { setCurrentHole(n => Math.min(18, n + 1)) }

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Now Playing</p>

        {/* Hole number row with prev/next */}
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={currentHole === 1}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: currentHole === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={currentHole === 1 ? 'rgba(255,255,255,0.2)' : 'white'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <h1 className="text-white text-2xl font-bold">
            {loading ? 'Loading…' : `Hole ${currentHole}`}
          </h1>

          <button
            onClick={next}
            disabled={currentHole === 18}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: currentHole === 18 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={currentHole === 18 ? 'rgba(255,255,255,0.2)' : 'white'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <p className="text-white/40 text-xs mt-1 text-center">
          {hole
            ? `Par ${hole.par} · ${yardage} yds · HCP ${hole.hcp_index}`
            : loading ? '' : 'No data'}
        </p>

        {/* Tee selector */}
        <div className="flex gap-1 mt-3 bg-white/5 rounded-lg p-1">
          {(['blue', 'white', 'green', 'gold'] as Tee[]).map(tee => (
            <button
              key={tee}
              onClick={() => setSelectedTee(tee)}
              className="flex-1 text-xs py-1.5 rounded-md font-medium"
              style={{
                background: selectedTee === tee ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: selectedTee === tee ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              {TEE_LABELS[tee]}
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder course map */}
      <div className="mx-4 mt-4 bg-[#2d5a27] rounded-2xl overflow-hidden" style={{ height: '220px', position: 'relative' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 text-xs uppercase tracking-widest">Course Map</div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          {[{ label: 'Back', val: '—' }, { label: 'Center', val: '—' }, { label: 'Front', val: '—' }].map(d => (
            <div key={d.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center">
              <div className="text-white text-xl font-bold">{d.val}</div>
              <div className="text-white/60 text-xs">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hole stats */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hole Layout</p>
        <div className="grid grid-cols-3 gap-3">
          {hole ? (
            <>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-[#152644]">{yardage} yds</div>
                <div className="text-xs text-gray-400 mt-0.5">Tee to Green</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-[#152644]">{hole.par}</div>
                <div className="text-xs text-gray-400 mt-0.5">Par</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-sm font-bold text-[#152644]">{hole.hcp_index}</div>
                <div className="text-xs text-gray-400 mt-0.5">Handicap</div>
              </div>
              {/* Other tee yardages */}
              {(['blue','white','green','gold'] as Tee[])
                .filter(t => t !== selectedTee)
                .map(tee => (
                  <div key={tee} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-sm font-bold" style={{ color: TEE_COLORS[tee] }}>
                      {hole[`yardage_${tee}` as keyof HoleData] as number} yds
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{TEE_LABELS[tee]} Tees</div>
                  </div>
                ))
              }
            </>
          ) : (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center animate-pulse">
                <div className="h-4 bg-gray-200 rounded mx-auto w-10 mb-1" />
                <div className="h-3 bg-gray-100 rounded mx-auto w-14" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hole progress dots */}
      <div className="mx-4 mt-4 flex justify-center gap-1.5">
        {Array.from({ length: 18 }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentHole(i + 1)}
            className="rounded-full transition-all"
            style={{
              width: i + 1 === currentHole ? 20 : 6,
              height: 6,
              background: i + 1 === currentHole ? '#152644' : '#cbd5e1',
            }}
          />
        ))}
      </div>

      <BottomNav />
    </main>
  )
}
