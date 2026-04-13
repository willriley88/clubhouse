'use client'
import { useState, useEffect, useCallback } from 'react'
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
}

type GPSState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'active'; lat: number; lng: number; accuracy: number }

export default function GPSPage() {
  const [selectedHole, setSelectedHole] = useState(1)
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
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ status: 'error', message: 'GPS not supported on this device' })
      return
    }
    setGps({ status: 'loading' })
    const id = navigator.geolocation.watchPosition(
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
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
    setWatchId(id)
  }, [])

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

          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color: '#152644' }}>{selectedHole}</div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>Hole</div>
          </div>

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
            </button>
          ))}
        </div>
      </div>

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
                  <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>yds</div>
                </div>
              ))}
            </div>

            {/* Accuracy pill */}
            <div className="flex justify-center">
              <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }}/>
                <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                  GPS · ±{gps.accuracy}m
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
