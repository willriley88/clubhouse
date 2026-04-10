'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

const COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'

type Tee = 'blue' | 'white' | 'green' | 'gold'
type GpsStatus = 'acquiring' | 'active' | 'unavailable'

type HoleData = {
  hole_number: number
  par: number
  hcp_index: number
  yardage_blue: number
  yardage_white: number
  yardage_green: number
  yardage_gold: number
}

// Approximate LeBaron Hills CC green coordinates (Lakeville MA, centered ~41.8387°N, 70.9762°W)
// front = closer to tee; back = far edge. Refine with an on-course GPS walk.
const GREEN_COORDS: Record<number, { front: [number, number]; center: [number, number]; back: [number, number] }> = {
   1: { front: [41.8402, -70.9742], center: [41.8406, -70.9739], back: [41.8410, -70.9736] },
   2: { front: [41.8418, -70.9722], center: [41.8422, -70.9719], back: [41.8426, -70.9716] },
   3: { front: [41.8438, -70.9712], center: [41.8442, -70.9709], back: [41.8446, -70.9706] },
   4: { front: [41.8452, -70.9697], center: [41.8456, -70.9694], back: [41.8460, -70.9691] },
   5: { front: [41.8442, -70.9677], center: [41.8446, -70.9674], back: [41.8450, -70.9671] },
   6: { front: [41.8428, -70.9659], center: [41.8432, -70.9656], back: [41.8436, -70.9653] },
   7: { front: [41.8412, -70.9641], center: [41.8416, -70.9638], back: [41.8420, -70.9635] },
   8: { front: [41.8396, -70.9626], center: [41.8400, -70.9623], back: [41.8404, -70.9620] },
   9: { front: [41.8376, -70.9638], center: [41.8380, -70.9635], back: [41.8384, -70.9632] },
  10: { front: [41.8356, -70.9658], center: [41.8360, -70.9655], back: [41.8364, -70.9652] },
  11: { front: [41.8340, -70.9676], center: [41.8344, -70.9673], back: [41.8348, -70.9670] },
  12: { front: [41.8328, -70.9695], center: [41.8332, -70.9692], back: [41.8336, -70.9689] },
  13: { front: [41.8320, -70.9715], center: [41.8324, -70.9712], back: [41.8328, -70.9709] },
  14: { front: [41.8330, -70.9738], center: [41.8334, -70.9735], back: [41.8338, -70.9732] },
  15: { front: [41.8347, -70.9758], center: [41.8351, -70.9755], back: [41.8355, -70.9752] },
  16: { front: [41.8364, -70.9774], center: [41.8368, -70.9771], back: [41.8372, -70.9768] },
  17: { front: [41.8378, -70.9779], center: [41.8382, -70.9776], back: [41.8386, -70.9773] },
  18: { front: [41.8390, -70.9769], center: [41.8394, -70.9766], back: [41.8398, -70.9763] },
}

function haversineYards(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(meters * 1.09361)
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
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('acquiring')
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const watchIdRef   = useRef<number | null>(null)
  const touchStartX  = useRef<number>(0)

  useEffect(() => {
    async function load() {
      const { data: course } = await supabase
        .from('courses').select('id').eq('name', 'LeBaron Hills CC').single()
      const id = course?.id ?? COURSE_ID_FALLBACK

      const { data } = await supabase
        .from('holes')
        .select('hole_number, par, hcp_index, yardage_blue, yardage_white, yardage_green, yardage_gold')
        .eq('course_id', id)
        .order('hole_number')
      if (data) setHoles(data)
      setLoading(false)
    }
    load()

    // Start GPS watch
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude])
        setGpsStatus('active')
      },
      () => setGpsStatus('unavailable'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const hole = holes.find(h => h.hole_number === currentHole)
  const yardage = hole ? hole[`yardage_${selectedTee}` as keyof HoleData] as number : 0
  const coords = GREEN_COORDS[currentHole]

  // Compute distances to front/center/back of green
  function distLabel(target: [number, number]): string {
    if (gpsStatus === 'acquiring') return '…'
    if (gpsStatus === 'unavailable' || !userPos) return '—'
    return String(haversineYards(userPos[0], userPos[1], target[0], target[1]))
  }

  function prev() { setCurrentHole(n => Math.max(1, n - 1)) }
  function next() { setCurrentHole(n => Math.min(18, n + 1)) }

  return (
    <main className="min-h-screen bg-gray-100 pb-24"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx < -50) next()
        else if (dx > 50) prev()
      }}>
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

      {/* Hole diagram + distance overlay */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ height: '220px', position: 'relative', background: '#1a3520' }}>

        {/* Abstract SVG hole diagram */}
        <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
          {/* Rough */}
          <rect width="100" height="200" fill="#1a3520"/>
          {/* Fairway — tapered from wide at tee to narrow at green */}
          <path d="M 35 185 Q 28 140 30 85 Q 32 45 38 22 L 62 22 Q 68 45 70 85 Q 72 140 65 185 Z" fill="#2d6627"/>
          {/* Tee box */}
          <rect x="42" y="178" width="16" height="8" rx="2" fill="rgba(255,255,255,0.65)"/>
          {/* Green */}
          <ellipse cx="50" cy="26" rx="15" ry="12" fill="#3a8f2e"/>
          <ellipse cx="50" cy="26" rx="15" ry="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          {/* Flagstick */}
          <line x1="50" y1="26" x2="50" y2="11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5"/>
          {/* Flag */}
          <polygon points="50,11 59,15 50,19" fill="#c9a84c"/>
          {/* Direction arrow in fairway */}
          <path d="M 50 120 L 46 130 L 50 126 L 54 130 Z" fill="rgba(255,255,255,0.3)"/>
        </svg>

        {/* GPS status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: gpsStatus === 'active' ? '#4ade80' : gpsStatus === 'acquiring' ? '#facc15' : '#f87171',
            }}
          />
          <span className="text-white text-xs">
            {gpsStatus === 'active' ? 'GPS Active' : gpsStatus === 'acquiring' ? 'Locating…' : 'GPS Off'}
          </span>
        </div>

        {/* Front / Center / Back distances to green */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          {([
            { label: 'Front',  target: coords.front  },
            { label: 'Center', target: coords.center },
            { label: 'Back',   target: coords.back   },
          ] as { label: string; target: [number, number] }[]).map(d => (
            <div key={d.label} className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
              <div className="text-white text-xl font-bold">{distLabel(d.target)}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{d.label}</div>
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
