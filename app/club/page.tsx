'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type TeeSlot = {
  id: string
  tee_date: string
  tee_time: string
  tee_order: number
  players: string
  max_players: number
}

type Message = {
  id: string
  profile_id: string
  author_name: string
  author_initials: string
  message: string
  channel: string
  created_at: string
}

const CHANNEL_TABS = [
  { label: 'Announcements',  slug: 'announcements',     adminOnly: true  },
  { label: "Men's League",   slug: 'mens-league',        adminOnly: false },
  { label: "Women's League", slug: 'womens-league',      adminOnly: false },
  { label: 'Tournament',     slug: 'member-guest-2026',  adminOnly: false },
]

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarBg(initials: string): string {
  const palette = ['#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe']
  return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length]
}

function avatarColor(initials: string): string {
  const palette = ['#1d4ed8', '#15803d', '#854d0e', '#9d174d', '#5b21b6']
  return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length]
}

export default function Club() {
  const router = useRouter()
  const [teeSheet,      setTeeSheet]      = useState<TeeSlot[]>([])
  const [user,          setUser]          = useState<any>(null)
  const [joiningId,     setJoiningId]     = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState('announcements')
  const [messages,      setMessages]      = useState<Message[]>([])
  const [messageText,   setMessageText]   = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingMsgs,   setLoadingMsgs]   = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initial load: tee sheet + auth user
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    async function load() {
      const [{ data: slotRows }, { data: authData }] = await Promise.all([
        supabase
          .from('tee_sheet')
          .select('id, tee_date, tee_time, tee_order, players, max_players')
          .eq('tee_date', today)
          .order('tee_order'),
        supabase.auth.getUser(),
      ])
      setTeeSheet(slotRows ?? [])
      setUser(authData.user)
    }
    load()
  }, [])

  // Load messages whenever the active channel changes
  useEffect(() => {
    setLoadingMsgs(true)
    setMessages([])
    supabase
      .from('messages')
      .select('id, profile_id, author_name, author_initials, message, channel, created_at')
      .eq('channel', activeChannel)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        setLoadingMsgs(false)
      })
  }, [activeChannel])

  // Realtime subscription — recreated whenever activeChannel changes
  useEffect(() => {
    const ch = supabase
      .channel(`club-feed:${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
        payload => {
          setMessages(prev => {
            // Dedup: skip if already present from optimistic insert
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [activeChannel])

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  async function handleSend() {
    if (!messageText.trim() || sending || !user) return
    setSending(true)
    const text = messageText.trim()
    setMessageText('')

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name     = profile?.full_name || user.email?.split('@')[0] || 'Member'
    const initials = getInitials(name)

    // Optimistic insert with temp ID
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId, profile_id: user.id,
      author_name: name, author_initials: initials,
      message: text, channel: activeChannel,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('messages')
      .insert({ profile_id: user.id, author_name: name, author_initials: initials, message: text, channel: activeChannel })
      .select('id, profile_id, author_name, author_initials, message, channel, created_at')
      .single()

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setSending(false)
  }

  const activeTab = CHANNEL_TABS.find(t => t.slug === activeChannel)!
  const readOnly  = activeTab.adminOnly

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

          <button
            onClick={() => window.open('https://lebaronhills.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23.999722222222225', '_blank')}
            className="bg-white rounded-2xl p-4 text-left"
          >
            <div className="text-2xl mb-2">🕐</div>
            <div className="text-sm font-semibold text-[#152644]">Tee Times</div>
            <div className="text-xs text-gray-400 mt-0.5">Book online</div>
          </button>

          {/* Menu — main area opens PDF, phone icon calls the club */}
          <div className="bg-white rounded-2xl p-4 relative">
            <button
              onClick={() => window.open('/lebaron-menu.pdf', '_blank')}
              className="w-full text-left"
            >
              <div className="text-2xl mb-2">🍽️</div>
              <div className="text-sm font-semibold text-[#152644]">Menu</div>
              <div className="text-xs text-gray-400 mt-0.5">Sunset Grille</div>
            </button>
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

          <button
            onClick={() => window.open('https://secure.east.prophetservices.com/LebaronHillsBilling/', '_blank')}
            className="bg-white rounded-2xl p-4 text-left"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm font-semibold text-[#152644]">Member Statements</div>
            <div className="text-xs text-gray-400 mt-0.5">View billing</div>
          </button>

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

        {/* ── UNIFIED FEED ── */}
        <div>
          {/* Horizontal pill switcher */}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {CHANNEL_TABS.map(tab => (
              <button
                key={tab.slug}
                onClick={() => { setActiveChannel(tab.slug); setMessageText('') }}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: activeChannel === tab.slug ? '#152644' : '#f1f5f9',
                  color:      activeChannel === tab.slug ? '#c9a84c' : '#64748b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Messages list + post input, all inside one card */}
          <div className="bg-white rounded-2xl overflow-hidden">

            <div className="overflow-y-auto max-h-80 px-4 py-3 space-y-3">
              {loadingMsgs ? (
                <p className="text-center text-sm text-gray-400 py-4">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No messages yet</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: avatarBg(msg.author_initials), color: avatarColor(msg.author_initials) }}
                    >
                      {msg.author_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-[#152644]">{msg.author_name}</span>
                        <span className="text-[10px] text-gray-400">{relativeTime(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 break-words">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — hidden for read-only channels */}
            {readOnly ? (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-center text-gray-400">Admin only · read-only channel</p>
              </div>
            ) : user ? (
              <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: '#152644' }}
                >
                  {(user.email?.charAt(0) ?? 'M').toUpperCase()}
                </div>
                <input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Message…"
                  maxLength={500}
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: '#1e293b' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                  style={{ background: messageText.trim() && !sending ? '#152644' : '#e2e8f0' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={messageText.trim() && !sending ? '#c9a84c' : '#94a3b8'}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-center text-gray-400">
                  <button onClick={() => router.push('/login')} className="underline">Sign in</button> to post
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
