'use client'
import { useState, useEffect, useCallback } from 'react'
<<<<<<< HEAD
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

// Haversine formula — returns distance in yards between two lat/lng points
function distanceYards(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const meters = R * c
  return Math.round(meters * 1.09361) // convert to yards
}

type HoleCoords = {
  hole_number: number
  front_lat:   number | null
  front_lng:   number | null
  center_lat:  number | null
  center_lng:  number | null
  back_lat:    number | null
  back_lng:    number | null
=======
import BottomNav from '../components/BottomNav'

const HOLES = [
  { hole: 1, front: { lat: 41.867697, lng: -70.971383 }, center: { lat: 41.867797, lng: -70.971508 }, back: { lat: 41.867936, lng: -70.971600 } },
  { hole: 2, front: { lat: 41.864986, lng: -70.970867 }, center: { lat: 41.864839, lng: -70.970825 }, back: { lat: 41.864706, lng: -70.970792 } },
  { hole: 3, front: { lat: 41.864836, lng: -70.976917 }, center: { lat: 41.864853, lng: -70.977097 }, back: { lat: 41.864842, lng: -70.977286 } },
  { hole: 4, front: { lat: 41.864075, lng: -70.977450 }, center: { lat: 41.863950, lng: -70.977344 }, back: { lat: 41.863822, lng: -70.977278 } },
  { hole: 5, front: { lat: 41.864783, lng: -70.974394 }, center: { lat: 41.864786, lng: -70.974219 }, back: { lat: 41.864764, lng: -70.974050 } },
  { hole: 6, front: { lat: 41.864553, lng: -70.970222 }, center: { lat: 41.864586, lng: -70.970028 }, back: { lat: 41.864642, lng: -70.969875 } },
  { hole: 7, front: { lat: 41.862283, lng: -70.973144 }, center: { lat: 41.862183, lng: -70.973283 }, back: { lat: 41.862072, lng: -70.973439 } },
  { hole: 8, front: { lat: 41.862056, lng: -70.971875 }, center: { lat: 41.862122, lng: -70.971731 }, back: { lat: 41.862189, lng: -70.971600 } },
  { hole: 9, front: { lat: 41.864964, lng: -70.967597 }, center: { lat: 41.865125, lng: -70.967528 }, back: { lat: 41.865319, lng: -70.967367 } },
  { hole: 10, front: { lat: 41.867694, lng: -70.971386 }, center: { lat: 41.867794, lng: -70.971517 }, back: { lat: 41.867933, lng: -70.971589 } },
  { hole: 11, front: { lat: 41.869186, lng: -70.971058 }, center: { lat: 41.869261, lng: -70.971031 }, back: { lat: 41.869356, lng: -70.970978 } },
  { hole: 12, front: { lat: 41.870008, lng: -70.974719 }, center: { lat: 41.870022, lng: -70.974864 }, back: { lat: 41.870050, lng: -70.975039 } },
  { hole: 13, front: { lat: 41.868889, lng: -70.974828 }, center: { lat: 41.868783, lng: -70.974731 }, back: { lat: 41.868678, lng: -70.974653 } },
  { hole: 14, front: { lat: 41.865967, lng: -70.973314 }, center: { lat: 41.865831, lng: -70.973233 }, back: { lat: 41.865708, lng: -70.973169 } },
  { hole: 15, front: { lat: 41.869525, lng: -70.971594 }, center: { lat: 41.869653, lng: -70.971486 }, back: { lat: 41.869775, lng: -70.971381 } },
  { hole: 16, front: { lat: 41.872186, lng: -70.971897 }, center: { lat: 41.872286, lng: -70.971886 }, back: { lat: 41.872406, lng: -70.971867 } },
  { hole: 17, front: { lat: 41.870061, lng: -70.969208 }, center: { lat: 41.869914, lng: -70.969214 }, back: { lat: 41.869828, lng: -70.969161 } },
  { hole: 18, front: { lat: 41.865953, lng: -70.967200 }, center: { lat: 41.865853, lng: -70.967044 }, back: { lat: 41.865739, lng: -70.966900 } },
]

function distanceYards(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 1.09361)
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
}

type GPSState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'active'; lat: number; lng: number; accuracy: number }

export default function GPSPage() {
  const [selectedHole, setSelectedHole] = useState(1)
<<<<<<< HEAD
  const [holes, setHoles] = useState<HoleCoords[]>([])
  const [loadingHoles, setLoadingHoles] = useState(true)
  const [gps, setGps] = useState<GPSState>({ status: 'idle' })
  const [watchId, setWatchId] = useState<number | null>(null)

  // Fetch GPS coordinates from DB — course resolved via club_config so this
  // works for any club without hardcoding the course name or ID
  useEffect(() => {
    async function loadHoles() {
      const { data: config } = await supabase
        .from('club_config')
        .select('course_id')
        .limit(1)
        .single()

      if (!config?.course_id) { setLoadingHoles(false); return }

      const { data } = await supabase
        .from('holes')
        .select('hole_number, front_lat, front_lng, center_lat, center_lng, back_lat, back_lng')
        .eq('course_id', config.course_id)
        .order('hole_number')

      setHoles((data as HoleCoords[]) ?? [])
      setLoadingHoles(false)
    }
    loadHoles()
  }, [])

  const hole = holes.find(h => h.hole_number === selectedHole)
  const hasCoords = !!(hole?.center_lat && hole?.center_lng)

  // Start GPS watch
=======
  const [gps, setGps] = useState<GPSState>({ status: 'idle' })
  const [watchId, setWatchId] = useState<number | null>(null)

  const hole = HOLES[selectedHole - 1]

>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ status: 'error', message: 'GPS not supported on this device' })
      return
    }
    setGps({ status: 'loading' })
    const id = navigator.geolocation.watchPosition(
<<<<<<< HEAD
      (pos) => {
        setGps({
          status: 'active',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        })
      },
      (err) => {
        setGps({ status: 'error', message: err.message })
      },
=======
      (pos) => setGps({ status: 'active', lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      (err) => setGps({ status: 'error', message: err.message }),
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
    setWatchId(id)
  }, [])

<<<<<<< HEAD
  // Stop watch on unmount
  useEffect(() => {
    startGPS()
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute distances — only when GPS active and hole has coordinates in DB
  const toFront  = (gps.status === 'active' && hole?.front_lat  && hole?.front_lng)
    ? distanceYards(gps.lat, gps.lng, hole.front_lat,  hole.front_lng)  : null
  const toCenter = (gps.status === 'active' && hole?.center_lat && hole?.center_lng)
    ? distanceYards(gps.lat, gps.lng, hole.center_lat, hole.center_lng) : null
  const toBack   = (gps.status === 'active' && hole?.back_lat   && hole?.back_lng)
    ? distanceYards(gps.lat, gps.lng, hole.back_lat,   hole.back_lng)   : null

  const prevHole = () => setSelectedHole(h => Math.max(1, h - 1))
  const nextHole = () => setSelectedHole(h => Math.min(18, h + 1))

  // Use loaded holes length for dots, fall back to 18 while loading
  const holeCount = holes.length > 0 ? holes.length : 18

  return (
    <main className="min-h-screen pb-[max(96px,env(safe-area-inset-bottom))] flex flex-col" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <div className="px-4 pt-[max(48px,env(safe-area-inset-top))] pb-6" style={{ background: '#152644' }}>
        <h1 className="text-white text-2xl font-bold">GPS</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          LeBaron Hills CC
        </p>
      </div>

      {/* Hole selector */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={prevHole}
            disabled={selectedHole === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity"
            style={{ background: '#f1f5f9', opacity: selectedHole === 1 ? 0.3 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

=======
  useEffect(() => {
    startGPS()
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toFront  = gps.status === 'active' ? distanceYards(gps.lat, gps.lng, hole.front.lat,  hole.front.lng)  : null
  const toCenter = gps.status === 'active' ? distanceYards(gps.lat, gps.lng, hole.center.lat, hole.center.lng) : null
  const toBack   = gps.status === 'active' ? distanceYards(gps.lat, gps.lng, hole.back.lat,   hole.back.lng)   : null

  const prevHole = () => setSelectedHole(h => Math.max(1, h - 1))
  const nextHole = () => setSelectedHole(h => Math.min(18, h + 1))

  return (
    <main className="min-h-screen pb-24 flex flex-col" style={{ background: '#f1f5f9' }}>
      <div className="px-4 pt-12 pb-6" style={{ background: '#152644' }}>
        <h1 className="text-white text-2xl font-bold">GPS</h1>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>LeBaron Hills CC</p>
      </div>

      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={prevHole} disabled={selectedHole === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#f1f5f9', opacity: selectedHole === 1 ? 0.3 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color: '#152644' }}>{selectedHole}</div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>Hole</div>
          </div>
<<<<<<< HEAD

          <button
            onClick={nextHole}
            disabled={selectedHole === holeCount}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity"
            style={{ background: '#f1f5f9', opacity: selectedHole === holeCount ? 0.3 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Hole quick-select dots */}
        <div className="px-4 pb-4 flex gap-1.5 flex-wrap justify-center">
          {Array.from({ length: holeCount }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setSelectedHole(n)}
              className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: selectedHole === n ? '#152644' : '#f1f5f9',
                color: selectedHole === n ? '#c9a84c' : '#94a3b8',
              }}
            >
              {n}
=======
          <button onClick={nextHole} disabled={selectedHole === 18}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#f1f5f9', opacity: selectedHole === 18 ? 0.3 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        <div className="px-4 pb-4 flex gap-1.5 flex-wrap justify-center">
          {HOLES.map(h => (
            <button key={h.hole} onClick={() => setSelectedHole(h.hole)}
              className="w-7 h-7 rounded-lg text-[11px] font-bold"
              style={{ background: selectedHole === h.hole ? '#152644' : '#f1f5f9', color: selectedHole === h.hole ? '#c9a84c' : '#94a3b8' }}>
              {h.hole}
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
            </button>
          ))}
        </div>
      </div>

<<<<<<< HEAD
      {/* Distance cards */}
      <div className="mx-4 mt-4">
        {(loadingHoles || gps.status === 'loading') && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin"
              style={{ borderColor: '#152644', borderTopColor: 'transparent' }}/>
            <p className="text-sm font-medium" style={{ color: '#152644' }}>
              {loadingHoles ? 'Loading hole data…' : 'Acquiring GPS signal…'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              {loadingHoles ? '' : 'Make sure location is enabled'}
            </p>
          </div>
        )}

        {!loadingHoles && gps.status === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>GPS unavailable</p>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>{gps.message}</p>
            <button
              onClick={startGPS}
              className="px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#152644', color: '#c9a84c' }}
            >
              Try Again
            </button>
          </div>
        )}

        {!loadingHoles && gps.status === 'idle' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <button
              onClick={startGPS}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: '#152644', color: '#c9a84c' }}
            >
              Start GPS
            </button>
          </div>
        )}

        {!loadingHoles && !hasCoords && gps.status === 'active' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No GPS data for this hole</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Run the holes GPS migration to add coordinates</p>
          </div>
        )}

        {!loadingHoles && hasCoords && gps.status === 'active' && (
          <>
            {/* Main center distance — big and prominent */}
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center mb-3"
              style={{ border: '2px solid #152644' }}>
              <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
                Center
              </div>
              <div className="text-6xl font-bold leading-none" style={{ color: '#152644' }}>
                {toCenter ?? '—'}
              </div>
              <div className="text-sm mt-1 font-medium" style={{ color: '#94a3b8' }}>yards</div>
            </div>

            {/* Front / Back row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: 'Front', val: toFront },
                { label: 'Back',  val: toBack  },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
                    {label}
                  </div>
                  <div className="text-3xl font-bold" style={{ color: '#152644' }}>{val ?? '—'}</div>
=======
      <div className="mx-4 mt-4">
        {gps.status === 'loading' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-10 h-10 rounded-full border-2 mx-auto mb-3 animate-spin" style={{ borderColor: '#152644', borderTopColor: 'transparent' }}/>
            <p className="text-sm font-medium" style={{ color: '#152644' }}>Acquiring GPS signal…</p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Make sure location is enabled</p>
          </div>
        )}
        {gps.status === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>GPS unavailable</p>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>{gps.message}</p>
            <button onClick={startGPS} className="px-5 py-2 rounded-xl text-sm font-bold" style={{ background: '#152644', color: '#c9a84c' }}>Try Again</button>
          </div>
        )}
        {gps.status === 'idle' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <button onClick={startGPS} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ background: '#152644', color: '#c9a84c' }}>Start GPS</button>
          </div>
        )}
        {gps.status === 'active' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center mb-3" style={{ border: '2px solid #152644' }}>
              <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Center</div>
              <div className="text-6xl font-bold leading-none" style={{ color: '#152644' }}>{toCenter}</div>
              <div className="text-sm mt-1 font-medium" style={{ color: '#94a3b8' }}>yards</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[{ label: 'Front', val: toFront }, { label: 'Back', val: toBack }].map(({ label, val }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>{label}</div>
                  <div className="text-3xl font-bold" style={{ color: '#152644' }}>{val}</div>
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
                  <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>yds</div>
                </div>
              ))}
            </div>
<<<<<<< HEAD

            {/* Accuracy pill */}
            <div className="flex justify-center">
              <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }}/>
                <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                  GPS · ±{gps.accuracy}m
                </span>
=======
            <div className="flex justify-center">
              <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: '#f1f5f9' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: gps.accuracy <= 5 ? '#22c55e' : gps.accuracy <= 15 ? '#f59e0b' : '#ef4444' }}/>
                <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>±{gps.accuracy}m accuracy</span>
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
              </div>
            </div>
          </>
        )}
      </div>
<<<<<<< HEAD

=======
>>>>>>> f774866 (restore GPS page with real LeBaron Hills coordinates)
      <BottomNav />
    </main>
  )
}
