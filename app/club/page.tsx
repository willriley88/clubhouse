'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type FeedPost = {
  id: string
  author_name: string
  author_initials: string
  post_type: string
  content: string
  created_at: string
}

type TeeSlot = {
  id: string
  tee_date: string
  tee_time: string
  tee_order: number
  players: string
  max_players: number
}

const CHANNELS = [
  { slug: 'announcements',     name: 'Club Announcements', icon: '📢' },
  { slug: 'mens-league',       name: "Men's League",        icon: '🏌️' },
  { slug: 'womens-league',     name: "Women's League",      icon: '👩' },
  { slug: 'member-guest-2026', name: 'Member-Guest 2026',   icon: '🏆' },
]

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function avatarStyle(postType: string, initials: string): { bg: string; color: string } {
  if (postType === 'admin') return { bg: '#152644', color: '#c9a84c' }
  const palette = [
    { bg: '#dbeafe', color: '#1d4ed8' },
    { bg: '#dcfce7', color: '#15803d' },
    { bg: '#fef9c3', color: '#854d0e' },
    { bg: '#fce7f3', color: '#9d174d' },
  ]
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length
  return palette[idx]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Club() {
  const router = useRouter()
  const [feed,           setFeed]           = useState<FeedPost[]>([])
  const [teeSheet,       setTeeSheet]       = useState<TeeSlot[]>([])
  const [user,           setUser]           = useState<any>(null)
  const [joiningId,      setJoiningId]      = useState<string | null>(null)
  const [postText,       setPostText]       = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  // Set of channel slugs that have messages newer than last visit
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set())

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    async function load() {
      const [{ data: postRows }, { data: slotRows }, { data: authData }] = await Promise.all([
        supabase
          .from('feed_posts')
          .select('id, author_name, author_initials, post_type, content, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('tee_sheet')
          .select('id, tee_date, tee_time, tee_order, players, max_players')
          .eq('tee_date', today)
          .order('tee_order'),
        supabase.auth.getUser(),
      ])

      setFeed(postRows ?? [])
      setTeeSheet(slotRows ?? [])
      setUser(authData.user)
    }

    async function checkChannelUnread() {
      // Fetch latest message timestamp per channel, compare vs localStorage
      const results = await Promise.all(
        CHANNELS.map(async ({ slug }) => {
          const { data } = await supabase
            .from('messages')
            .select('created_at')
            .eq('channel', slug)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          if (!data) return [slug, false] as const
          const lastVisit = localStorage.getItem(`clubhouse_channel_${slug}`)
          const hasNew = !lastVisit || new Date(data.created_at) > new Date(lastVisit)
          return [slug, hasNew] as const
        })
      )
      setUnreadChannels(new Set(results.filter(([, v]) => v).map(([s]) => s)))
    }

    load()
    checkChannelUnread()
  }, [])

  async function handleJoin(slot: TeeSlot) {
    if (!user) { router.push('/login'); return }
    const playerList = slot.players ? slot.players.split(',').map(p => p.trim()).filter(Boolean) : []
    if (slot.max_players - playerList.length <= 0) return
    setJoiningId(slot.id)
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name = profile?.full_name || user.email?.split('@')[0] || 'Member'
    if (playerList.some(p => p.toLowerCase() === name.toLowerCase())) {
      setJoiningId(null); return
    }
    const newPlayers = playerList.length > 0 ? `${slot.players}, ${name}` : name
    const { error } = await supabase.from('tee_sheet').update({ players: newPlayers }).eq('id', slot.id)
    if (!error) setTeeSheet(prev => prev.map(s => s.id === slot.id ? { ...s, players: newPlayers } : s))
    setJoiningId(null)
  }

  async function handlePost() {
    if (!postText.trim() || submitting || !user) return
    setSubmitting(true)
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name     = profile?.full_name || user.email?.split('@')[0] || 'Member'
    const initials = getInitials(name)
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({ author_name: name, author_initials: initials, post_type: 'member', content: postText.trim() })
      .select('id, author_name, author_initials, post_type, content, created_at')
      .single()
    if (!error && data) { setFeed(prev => [data as FeedPost, ...prev]); setPostText('') }
    setSubmitting(false)
  }

  // Admin posts float to top, then member posts by created_at desc
  const sortedFeed = [...feed].sort((a, b) => {
    if (a.post_type === 'admin' && b.post_type !== 'admin') return -1
    if (a.post_type !== 'admin' && b.post_type === 'admin') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <main className="min-h-screen bg-gray-100 pb-24">

      {/* ── HEADER ── */}
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Members Only</p>
        <h1 className="text-white text-2xl font-bold">LeBaron Hills CC</h1>
        <p className="text-white/40 text-xs mt-1">Lakeville, MA · Par 72 · 6,803 yds</p>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── QUICK LINKS ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Tee Times */}
          <button
            onClick={() => window.open('https://lebaronhills.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23.999722222222225', '_blank')}
            className="bg-white rounded-2xl p-4 text-left"
          >
            <div className="text-2xl mb-2">🕐</div>
            <div className="text-sm font-semibold text-[#152644]">Tee Times</div>
            <div className="text-xs text-gray-400 mt-0.5">Book online</div>
          </button>

          {/* Menu — main area opens PDF, phone icon button calls the club */}
          <div className="bg-white rounded-2xl p-4 relative">
            <button
              onClick={() => window.open('/lebaron-menu.pdf', '_blank')}
              className="w-full text-left"
            >
              <div className="text-2xl mb-2">🍽️</div>
              <div className="text-sm font-semibold text-[#152644]">Menu</div>
              <div className="text-xs text-gray-400 mt-0.5">Sunset Grille</div>
            </button>
            {/* Phone button — positioned bottom-right inside the card */}
            <button
              onClick={e => { e.stopPropagation(); window.location.href = 'tel:5089235712' }}
              className="absolute bottom-3 right-3 flex items-center justify-center"
              aria-label="Call the club"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
          </div>

          {/* Member Statements */}
          <button
            onClick={() => window.open('https://secure.east.prophetservices.com/LebaronHillsBilling/', '_blank')}
            className="bg-white rounded-2xl p-4 text-left"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-semibold text-[#152644]">Member Statements</div>
            <div className="text-xs text-gray-400 mt-0.5">View billing</div>
          </button>

          {/* Staff Info */}
          <button
            onClick={() => window.open('https://www.lebaronhills.com/about-us', '_blank')}
            className="bg-white rounded-2xl p-4 text-left"
          >
            <div className="text-2xl mb-2">👤</div>
            <div className="text-sm font-semibold text-[#152644]">Staff Info</div>
            <div className="text-xs text-gray-400 mt-0.5">Contact staff</div>
          </button>

        </div>

        {/* ── TEE SHEET ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Today&apos;s Tee Sheet</p>
          <div className="bg-white rounded-2xl overflow-hidden">
            {teeSheet.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No tee times available today</div>
            ) : (
              teeSheet.map((slot, i) => {
                const playerList = slot.players ? slot.players.split(',').map(p => p.trim()).filter(Boolean) : []
                const openSpots  = slot.max_players - playerList.length
                const isFull     = openSpots <= 0
                const isJoining  = joiningId === slot.id
                return (
                  <div key={slot.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < teeSheet.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="text-sm font-bold text-[#152644] w-20">{slot.tee_time}</div>
                    <div className="flex-1 text-xs text-gray-500">
                      {playerList.length > 0 ? playerList.join(', ') : 'Open'}
                    </div>
                    {isFull ? (
                      <div className="text-xs text-gray-300">Full</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-600">{openSpots} open</span>
                        <button onClick={() => handleJoin(slot)} disabled={isJoining}
                          className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: '#152644', color: '#c9a84c', opacity: isJoining ? 0.5 : 1 }}>
                          {isJoining ? '…' : 'Join'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── CHANNELS ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Channels</p>
          <div className="bg-white rounded-2xl overflow-hidden">
            {CHANNELS.map((ch, i) => (
              <button
                key={ch.slug}
                onClick={() => router.push(`/club/channel/${ch.slug}`)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i < CHANNELS.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="text-xl w-7 text-center flex-shrink-0">{ch.icon}</span>
                <span className="flex-1 text-sm font-semibold text-[#152644]">{ch.name}</span>
                {/* Unread dot — shown when there are messages newer than last visit */}
                {unreadChannels.has(ch.slug) && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#c9a84c' }} />
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* ── CLUB FEED ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Club Feed</p>

          {user ? (
            <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: '#152644' }}>
                {(user.email?.charAt(0) ?? 'M').toUpperCase()}
              </div>
              <input
                value={postText}
                onChange={e => setPostText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost() } }}
                placeholder="Share something with the club…"
                maxLength={280}
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: '#1e293b' }}
              />
              <button onClick={handlePost} disabled={!postText.trim() || submitting}
                className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{
                  background: postText.trim() && !submitting ? '#152644' : '#e2e8f0',
                  color:      postText.trim() && !submitting ? '#c9a84c' : '#94a3b8',
                }}>
                {submitting ? '…' : 'Post'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-center py-2 mb-2" style={{ color: '#94a3b8' }}>Sign in to post</p>
          )}

          <div className="space-y-2">
            {sortedFeed.length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-6 text-center text-sm text-gray-400">No posts yet</div>
            ) : (
              sortedFeed.map(post => {
                const { bg, color } = avatarStyle(post.post_type, post.author_initials)
                const displayInitial = post.post_type === 'admin' ? 'A' : post.author_initials
                const isAdmin = post.post_type === 'admin'
                return (
                  <div key={post.id}
                    className="bg-white rounded-2xl p-4 flex gap-3 overflow-hidden"
                    // Gold left border for admin posts
                    style={isAdmin ? { borderLeft: '4px solid #c9a84c' } : undefined}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: bg, color }}>
                      {displayInitial}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#152644]">{post.author_name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{post.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{relativeTime(post.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
