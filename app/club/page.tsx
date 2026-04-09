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

type GinRequest = {
  id: string
  profile_id: string
  tee_time: string
  note: string
  author_name: string
  is_filled: boolean
  created_at: string
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
  const [feed,        setFeed]        = useState<FeedPost[]>([])
  const [teeSheet,    setTeeSheet]    = useState<TeeSlot[]>([])
  const [ginRequests, setGinRequests] = useState<GinRequest[]>([])
  const [user,        setUser]        = useState<any>(null)
  const [joiningId,   setJoiningId]   = useState<string | null>(null)
  const [postText,    setPostText]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // GIN sheet state
  const [ginSheetOpen, setGinSheetOpen] = useState(false)
  const [ginTeeTime,   setGinTeeTime]   = useState('')
  const [ginNote,      setGinNote]      = useState('')
  const [ginPosting,   setGinPosting]   = useState(false)
  const [fillingId,    setFillingId]    = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    async function load() {
      // Fetch all data + auth in parallel
      const [{ data: postRows }, { data: slotRows }, { data: authData }, { data: ginRows }] =
        await Promise.all([
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
          supabase
            .from('gin_requests')
            .select('id, profile_id, tee_time, note, author_name, is_filled, created_at')
            .eq('is_filled', false)              // only show unfilled requests
            .order('created_at', { ascending: false })
            .limit(10),
        ])

      setFeed(postRows ?? [])
      setTeeSheet(slotRows ?? [])
      setUser(authData.user)
      setGinRequests((ginRows ?? []) as GinRequest[])
    }
    load()
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
      setJoiningId(null)
      return
    }

    const newPlayers = playerList.length > 0 ? `${slot.players}, ${name}` : name
    const { error } = await supabase
      .from('tee_sheet').update({ players: newPlayers }).eq('id', slot.id)
    if (!error) {
      setTeeSheet(prev => prev.map(s => s.id === slot.id ? { ...s, players: newPlayers } : s))
    }
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
    if (!error && data) {
      setFeed(prev => [data as FeedPost, ...prev])
      setPostText('')
    }
    setSubmitting(false)
  }

  async function handleGinPost() {
    if (!ginTeeTime.trim() || ginPosting || !user) return
    setGinPosting(true)
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name = profile?.full_name || user.email?.split('@')[0] || 'Member'

    const { data, error } = await supabase
      .from('gin_requests')
      .insert({
        profile_id:  user.id,
        tee_time:    ginTeeTime.trim(),
        note:        ginNote.trim(),
        author_name: name,
      })
      .select('id, profile_id, tee_time, note, author_name, is_filled, created_at')
      .single()

    if (!error && data) {
      setGinRequests(prev => [data as GinRequest, ...prev])
      setGinTeeTime('')
      setGinNote('')
      setGinSheetOpen(false)
    }
    setGinPosting(false)
  }

  async function handleFillGin(req: GinRequest) {
    if (!user || fillingId) return
    setFillingId(req.id)

    const { error } = await supabase
      .from('gin_requests')
      .update({ is_filled: true })
      .eq('id', req.id)

    if (!error) {
      // Remove from list — is_filled=true requests are not shown
      setGinRequests(prev => prev.filter(r => r.id !== req.id))
    }
    setFillingId(null)
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Members Only</p>
        <h1 className="text-white text-2xl font-bold">LeBaron Hills CC</h1>
        <p className="text-white/40 text-xs mt-1">Lakeville, MA · Par 72 · 6,803 yds</p>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── GIN BANNER ── */}
        <button
          onClick={() => user ? setGinSheetOpen(true) : router.push('/login')}
          className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
          style={{ background: '#c9a84c' }}
        >
          <span className="text-2xl">🤝</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#152644' }}>Need a playing partner?</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(21,38,68,0.65)' }}>Post a GIN — Guest in Need</p>
          </div>
          <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#152644" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* ── ACTIVE GIN REQUESTS ── */}
        {ginRequests.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Open Requests</p>
            <div className="space-y-2">
              {ginRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#152644', color: '#c9a84c' }}
                  >
                    {getInitials(req.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#152644]">{req.author_name}</p>
                    <p className="text-xs text-gray-500">
                      {req.tee_time}{req.note ? ` · ${req.note}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{relativeTime(req.created_at)}</p>
                  </div>
                  {/* Don't show "I'll join" to the original poster */}
                  {user && req.profile_id !== user.id && (
                    <button
                      onClick={() => handleFillGin(req)}
                      disabled={fillingId === req.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
                      style={{
                        background: fillingId === req.id ? '#e2e8f0' : '#c9a84c',
                        color:      fillingId === req.id ? '#94a3b8' : '#152644',
                      }}
                    >
                      {fillingId === req.id ? '…' : "I'll join"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Tee Times',         icon: '🕐', sub: 'Book online'    },
            { label: 'Online Ordering',   icon: '🍽️', sub: 'Sunset Grille'  },
            { label: 'Member Statements', icon: '📄', sub: 'View billing'    },
            { label: 'Staff Info',        icon: '👤', sub: 'Contact staff'   },
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

          {user ? (
            <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: '#152644' }}
              >
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
              <button
                onClick={handlePost}
                disabled={!postText.trim() || submitting}
                className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{
                  background: postText.trim() && !submitting ? '#152644' : '#e2e8f0',
                  color:      postText.trim() && !submitting ? '#c9a84c' : '#94a3b8',
                }}
              >
                {submitting ? '…' : 'Post'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-center py-2 mb-2" style={{ color: '#94a3b8' }}>Sign in to post</p>
          )}

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

      {/* ── GIN POST SHEET ── */}
      {ginSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setGinSheetOpen(false) }}
        >
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <h2 className="text-xl font-bold mb-1" style={{ color: '#152644' }}>Post a GIN</h2>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>
              Let members know you need a playing partner
            </p>

            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: '#475569' }}>
              Tee Time *
            </label>
            <input
              value={ginTeeTime}
              onChange={e => setGinTeeTime(e.target.value)}
              placeholder="e.g. 7:30 AM Saturday"
              maxLength={50}
              className="w-full text-sm px-4 py-3 rounded-xl mb-4 outline-none"
              style={{ background: '#f1f5f9', color: '#1e293b' }}
            />

            <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: '#475569' }}>
              Note (optional)
            </label>
            <input
              value={ginNote}
              onChange={e => setGinNote(e.target.value)}
              placeholder="e.g. Casual round, any handicap"
              maxLength={120}
              className="w-full text-sm px-4 py-3 rounded-xl mb-5 outline-none"
              style={{ background: '#f1f5f9', color: '#1e293b' }}
            />

            <button
              onClick={handleGinPost}
              disabled={!ginTeeTime.trim() || ginPosting}
              className="w-full py-4 rounded-2xl text-sm font-bold mb-3"
              style={{
                background: ginTeeTime.trim() && !ginPosting ? '#c9a84c' : '#e2e8f0',
                color:      ginTeeTime.trim() && !ginPosting ? '#152644' : '#94a3b8',
              }}
            >
              {ginPosting ? 'Posting…' : 'Post Request'}
            </button>
            <button
              onClick={() => setGinSheetOpen(false)}
              className="w-full py-2.5 text-sm text-center"
              style={{ color: '#94a3b8' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
