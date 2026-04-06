'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LS_CLUB_KEY = 'clubhouse_last_club_visit'
const LS_CHAT_KEY = 'clubhouse_last_chat_visit'

const NAV_ITEMS = [
  {
    label: 'GPS',
    path: '/gps',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/>
        <path d="M6 3v18M18 3v18M6 9h12v6H6z"/>
      </svg>
    ),
  },
  {
    label: 'Chat',
    path: '/chat',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    label: 'Club',
    path: '/club',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#c9a84c' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>
    ),
  },
]

// Paths that have unread badges, keyed to their localStorage timestamp key and data source
const BADGE_SOURCES: Record<string, { lsKey: string; table: string }> = {
  '/club': { lsKey: LS_CLUB_KEY, table: 'feed_posts' },
  '/chat': { lsKey: LS_CHAT_KEY, table: 'messages'   },
}

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  // Set of paths with an unread badge active
  const [unread, setUnread] = useState<Set<string>>(new Set())

  // On mount: check latest row in each badge-tracked table vs localStorage timestamp
  useEffect(() => {
    async function checkBadges() {
      const results = await Promise.all(
        Object.entries(BADGE_SOURCES).map(async ([path, { lsKey, table }]) => {
          const { data } = await supabase
            .from(table)
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (!data) return [path, false] as const
          const lastVisit = localStorage.getItem(lsKey)
          const hasNew = !lastVisit || new Date(data.created_at) > new Date(lastVisit)
          return [path, hasNew] as const
        })
      )
      const newUnread = new Set(results.filter(([, v]) => v).map(([p]) => p))
      setUnread(newUnread)
    }
    checkBadges()
  }, [])

  // When user lands on a badge-tracked page, record visit timestamp and clear badge
  useEffect(() => {
    const source = BADGE_SOURCES[pathname]
    if (source) {
      localStorage.setItem(source.lsKey, new Date().toISOString())
      setUnread(prev => { const next = new Set(prev); next.delete(pathname); return next })
    }
  }, [pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: 'white', borderColor: '#f1f5f9' }}>
      <div className="flex items-stretch">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
          const showBadge = unread.has(item.path) && !active
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
