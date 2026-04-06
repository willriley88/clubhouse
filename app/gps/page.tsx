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

// Approximate LeBaron Hills CC green coordinates (Lakeville MA ~41.83°N, 70.96°W)
// front = closer to tee; back = far edge. User can refine these with a GPS walk.
const GREEN_COORDS: Record<number, { front: [number, number]; center: [number, number]; back: [number, number] }> = {
   1: { front: [41.8318, -70.9593], center: [41.8322, -70.9590], back: [41.8326, -70.9587] },
   2: { front: [41.8338, -70.9573], center: [41.8342, -70.9570], back: [41.8346, -70.9567] },
   3: { front: [41.8358, -70.9563], center: [41.8362, -70.9560], back: [41.8366, -70.9557] },
   4: { front: [41.8373, -70.9548], center: [41.8377, -70.9545], back: [41.8381, -70.9542] },
   5: { front: [41.8383, -70.9533], center: [41.8387, -70.9530], back: [41.8391, -70.9527] },
   6: { front: [41.8388, -70.9513], center: [41.8392, -70.9510], back: [41.8396, -70.9507] },
   7: { front: [41.8378, -70.9493], center: [41.8382, -70.9490], back: [41.8386, -70.9487] },
   8: { front: [41.8368, -70.9478], center: [41.8372, -70.9475], back: [41.8376, -70.9472] },
   9: { front: [41.8353, -70.9463], center: [41.8357, -70.9460], back: [41.8361, -70.9457] },
  10: { front: [41.8338, -70.9473], center: [41.8342, -70.9470], back: [41.8346, -70.9467] },
  11: { front: [41.8323, -70.9483], center: [41.8327, -70.9480], back: [41.8331, -70.9477] },
  12: { front: [41.8308, -70.9493], center: [41.8312, -70.9490], back: [41.8316, -70.9487] },
  13: { front: [41.8293, -70.9503], center: [41.8297, -70.9500], back: [41.8301, -70.9497] },
  14: { front: [41.8278, -70.9513], center: [41.8282, -70.9510], back: [41.8286, -70.9507] },
  15: { front: [41.8268, -70.9533], center: [41.8272, -70.9530], back: [41.8276, -70.9527] },
  16: { front: [41.8273, -70.9553], center: [41.8277, -70.9550], back: [41.8281, -70.9547] },
  17: { front: [41.8283, -70.9573], center: [41.8287, -70.9570], back: [41.8291, -70.9567] },
  18: { front: [41.8293, -70.9588], center: [41.8297, -70.9585], back: [41.8301, -70.9582] },
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
  const watchIdRef = useRef<number | null>(null)

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

      {/* Course map + distance overlay */}
      <div className="mx-4 mt-4 bg-[#2d5a27] rounded-2xl overflow-hidden" style={{ height: '220px', position: 'relative' }}>
        {/* GPS status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur rounded-full px-3 py-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: gpsStatus === 'active' ? '#4ade80' : gpsStatus === 'acquiring' ? '#facc15' : '#f87171',
            }}
          />
          <span className="text-white text-xs">
            {gpsStatus === 'active' ? 'GPS Active' : gpsStatus === 'acquiring' ? 'Locating…' : 'GPS Unavailable'}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 text-xs uppercase tracking-widest">Course Map</div>
        </div>

        {/* Front / Center / Back distances to green */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          {([
            { label: 'Front',  target: coords.front  },
            { label: 'Center', target: coords.center },
            { label: 'Back',   target: coords.back   },
          ] as { label: string; target: [number, number] }[]).map(d => (
            <div key={d.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center">
              <div className="text-white text-xl font-bold">{distLabel(d.target)}</div>
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
