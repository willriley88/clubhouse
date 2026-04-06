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

// Deterministic avatar color from initials — admin gets brand colors
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

export default function Club() {
  const router = useRouter()
  const [feed, setFeed]         = useState<FeedPost[]>([])
  const [teeSheet, setTeeSheet] = useState<TeeSlot[]>([])
  const [user, setUser]         = useState<any>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null) // slot being joined

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    // Fetch data and current user in parallel
    Promise.all([
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
    ]).then(([{ data: postRows }, { data: slotRows }, { data: authData }]) => {
      setFeed(postRows ?? [])
      setTeeSheet(slotRows ?? [])
      setUser(authData.user)
    })
  }, [])

  async function handleJoin(slot: TeeSlot) {
    if (!user) {
      router.push('/login')
      return
    }

    // Prevent double-joining the same slot
    const playerList = slot.players ? slot.players.split(',').map(p => p.trim()).filter(Boolean) : []
    const openSpots  = slot.max_players - playerList.length
    if (openSpots <= 0) return

    setJoiningId(slot.id)

    // Get display name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const name = profile?.full_name || user.email?.split('@')[0] || 'Member'

    // Guard: don't add if already in this slot
    if (playerList.some(p => p.toLowerCase() === name.toLowerCase())) {
      setJoiningId(null)
      return
    }

    const newPlayers = playerList.length > 0 ? `${slot.players}, ${name}` : name

    const { error } = await supabase
      .from('tee_sheet')
      .update({ players: newPlayers })
      .eq('id', slot.id)

    if (!error) {
      // Optimistic update
      setTeeSheet(prev =>
        prev.map(s => s.id === slot.id ? { ...s, players: newPlayers } : s)
      )
    }

    setJoiningId(null)
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Members Only</p>
        <h1 className="text-white text-2xl font-bold">LeBaron Hills CC</h1>
        <p className="text-white/40 text-xs mt-1">Lakeville, MA · Par 72 · 6,803 yds</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Tee Times', icon: '🕐', sub: 'Book online' },
            { label: 'Online Ordering', icon: '🍽️', sub: 'Sunset Grille' },
            { label: 'Member Statements', icon: '📄', sub: 'View billing' },
            { label: 'Staff Info', icon: '👤', sub: 'Contact staff' },
          ].map(item => (
            <button key={item.label} className="bg-white rounded-2xl p-4 text-left">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-[#152644]">{item.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
            </button>
          ))}
        </div>

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
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < teeSheet.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="text-sm font-bold text-[#152644] w-20">{slot.tee_time}</div>
                    <div className="flex-1 text-xs text-gray-500">
                      {playerList.length > 0 ? playerList.join(', ') : 'Open'}
                    </div>
                    {isFull ? (
                      <div className="text-xs text-gray-300">Full</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-600">{openSpots} open</span>
                        <button
                          onClick={() => handleJoin(slot)}
                          disabled={isJoining}
                          className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: '#152644', color: '#c9a84c', opacity: isJoining ? 0.5 : 1 }}
                        >
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Club Feed</p>
          <div className="space-y-2">
            {feed.length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-6 text-center text-sm text-gray-400">No posts yet</div>
            ) : (
              feed.map(post => {
                const { bg, color } = avatarStyle(post.post_type, post.author_initials)
                const displayInitial = post.post_type === 'admin' ? 'A' : post.author_initials
                return (
                  <div key={post.id} className="bg-white rounded-2xl p-4 flex gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: bg, color }}
                    >
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
