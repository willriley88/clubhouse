'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../../../components/BottomNav'

type Message = {
  id: string
  profile_id: string
  author_name: string
  author_initials: string
  message: string
  channel: string
  created_at: string
}

const CHANNEL_META: Record<string, { name: string; icon: string; adminOnly: boolean }> = {
  'announcements':     { name: 'Club Announcements', icon: '📢', adminOnly: true },
  'mens-league':       { name: "Men's League",        icon: '🏌️', adminOnly: false },
  'womens-league':     { name: "Women's League",      icon: '👩', adminOnly: false },
  'member-guest-2026': { name: 'Member-Guest 2026',   icon: '🏆', adminOnly: false },
}

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

function avatarBg(initials: string): string {
  const palette = ['#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe']
  return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length]
}
function avatarColor(initials: string): string {
  const palette = ['#1d4ed8', '#15803d', '#854d0e', '#9d174d', '#5b21b6']
  return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function ChannelPage() {
  const { slug }  = useParams<{ slug: string }>()
  const router    = useRouter()
  const meta      = CHANNEL_META[slug] ?? { name: slug, icon: '💬', adminOnly: false }

  const [messages,  setMessages]  = useState<Message[]>([])
  const [user,      setUser]      = useState<any>(null)
  const [inputText, setInputText] = useState('')
  const [sending,   setSending]   = useState(false)
  const [loading,   setLoading]   = useState(true)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Auth guard + initial load
  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)

      const { data } = await supabase
        .from('messages')
        .select('id, profile_id, author_name, author_initials, message, channel, created_at')
        .eq('channel', slug)
        .order('created_at', { ascending: true })
        .limit(50)

      setMessages((data as Message[]) ?? [])
      setLoading(false)

      // Mark this channel as read
      localStorage.setItem(`clubhouse_channel_${slug}`, new Date().toISOString())
    }
    init()
  }, [slug, router])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription — separate effect so it can clean up independently
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${slug}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${slug}` },
        payload => {
          setMessages(prev => {
            // Deduplicate: if we already have this ID (from optimistic insert), skip
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
          // Update read timestamp in real-time so we don't get a stale unread dot
          localStorage.setItem(`clubhouse_channel_${slug}`, new Date().toISOString())
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [slug])

  async function handleSend() {
    if (!inputText.trim() || sending || !user) return
    setSending(true)
    const text = inputText.trim()
    setInputText('')

    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name     = profile?.full_name || user.email?.split('@')[0] || 'Member'
    const initials = getInitials(name)

    // Optimistic insert
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId, profile_id: user.id,
      author_name: name, author_initials: initials,
      message: text, channel: slug,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('messages')
      .insert({ profile_id: user.id, author_name: name, author_initials: initials, message: text, channel: slug })
      .select('id, profile_id, author_name, author_initials, message, channel, created_at')
      .single()

    if (!error && data) {
      // Swap temp row for real DB row
      setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
    } else {
      // Remove optimistic row on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const readOnly = meta.adminOnly

  return (
    <div className="flex flex-col h-screen bg-gray-100">

      {/* ── HEADER ── */}
      <div className="bg-[#152644] px-4 pt-12 pb-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push('/club')} className="flex items-center justify-center -ml-1 mr-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-xl">{meta.icon}</span>
        <h1 className="text-white text-lg font-bold flex-1">{meta.name}</h1>
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {loading ? (
          <div className="text-center text-sm text-gray-400 mt-8">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 mt-8">No messages yet. Be the first to post!</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
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
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT — pinned above BottomNav ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3" style={{ paddingBottom: 'calc(0.75rem + 72px)' }}>
        <div className="flex items-center gap-3">
          {user && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: '#152644' }}
            >
              {(user.email?.charAt(0) ?? 'M').toUpperCase()}
            </div>
          )}
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={readOnly ? 'Admin only' : 'Message…'}
            disabled={readOnly}
            maxLength={500}
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: readOnly ? '#94a3b8' : '#1e293b' }}
          />
          {!readOnly && (
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{
                background: inputText.trim() && !sending ? '#152644' : '#e2e8f0',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={inputText.trim() && !sending ? '#c9a84c' : '#94a3b8'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
