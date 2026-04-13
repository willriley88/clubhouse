'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LS_CLUB_KEY = 'clubhouse_last_club_visit'

const NAV_ITEMS = [
  {
    label: 'GPS',
    path: '/gps',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
        <circle cx="12" cy="12" r="9" strokeOpacity="0.3"/>
      </svg>
    ),
  },
  {
    label: 'Scorecard',
    path: '/scorecard',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <line x1="9" y1="7" x2="15" y2="7"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
        <line x1="9" y1="15" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    label: 'Home',
    path: '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    label: 'Events',
    path: '/tournament',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: 'Club',
    path: '/club',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const [hasUnread, setHasUnread] = useState(false)

  // On mount: compare latest feed post timestamp against last club visit
  useEffect(() => {
    async function checkUnread() {
      const { data } = await supabase
        .from('feed_posts')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!data) return
      const lastVisit = localStorage.getItem(LS_CLUB_KEY)
      setHasUnread(!lastVisit || new Date(data.created_at) > new Date(lastVisit))
    }
    checkUnread()
  }, [])

  // When user lands on /club, record visit timestamp and clear badge
  useEffect(() => {
    if (pathname === '/club') {
      localStorage.setItem(LS_CLUB_KEY, new Date().toISOString())
      setHasUnread(false)
    }
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'white', borderColor: '#f1f5f9' }}>
      <div className="flex items-stretch">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const showBadge = item.path === '/club' && hasUnread && !active
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex-1 flex flex-col items-center justify-center py-2 pb-5 gap-0.5"
            >
              <span className="relative">
                {item.icon(active)}
                {showBadge && (
                  <span
                    className="absolute top-0 right-0 w-2 h-2 rounded-full"
                    style={{ background: '#c9a84c', transform: 'translate(25%, -25%)' }}
                  />
                )}
              </span>
              <span className="text-[10px] font-medium"
                style={{ color: active ? '#c9a84c' : '#94a3b8' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
