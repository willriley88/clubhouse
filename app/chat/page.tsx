'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

type Message = {
  id: string
  profile_id: string
  message: string
  author_name: string
  author_initials: string
  created_at: string
}

// Deterministic avatar color from initials
const PALETTE = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#854d0e' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#f3e8ff', color: '#7e22ce' },
  { bg: '#ffedd5', color: '#c2410c' },
]
function avatarStyle(initials: string) {
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  return PALETTE[code % PALETTE.length]
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function Chat() {
  const router = useRouter()
  const [user,        setUser]        = useState<any>(null)
  const [messages,    setMessages]    = useState<Message[]>([])
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      // Auth guard
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)

      // Load last 50 messages
      const { data } = await supabase
        .from('messages')
        .select('id, profile_id, message, author_name, author_initials, created_at')
        .order('created_at', { ascending: true })
        .limit(50)
      setMessages((data ?? []) as Message[])
      setLoading(false)

      // Realtime subscription — no club_id filter, single-club for now
      const channel = supabase
        .channel('club-chat')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          payload => {
            setMessages(prev => {
              // Deduplicate — optimistic insert may already have this id
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as Message]
            })
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [router])

  // Auto-scroll to latest message whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || sending || !user) return
    setSending(true)
    const text = input.trim()
    setInput('')

    // Get display name
    const { data: profile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    const name     = profile?.full_name || user.email?.split('@')[0] || 'Member'
    const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    // Optimistic insert so the message appears instantly
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId, profile_id: user.id,
      message: text, author_name: name, author_initials: initials,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const { data: inserted } = await supabase
      .from('messages')
      .insert({ profile_id: user.id, message: text, author_name: name, author_initials: initials })
      .select('id, profile_id, message, author_name, author_initials, created_at')
      .single()

    if (inserted) {
      // Swap temp entry for real DB row (realtime may also deliver it — deduped above)
      setMessages(prev => prev.map(m => m.id === tempId ? inserted as Message : m))
    }
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <main className="flex flex-col min-h-screen pb-16" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-4" style={{ background: '#152644' }}>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">LeBaron Hills CC</p>
        <h1 className="text-white text-2xl font-bold">Member Chat</h1>
        <p className="text-white/40 text-xs mt-1">Members only · real-time</p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
        {loading && (
          <p className="text-center text-sm text-slate-400 py-10">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>No messages yet</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Be the first to say something</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.profile_id === user?.id
          const { bg, color } = avatarStyle(msg.author_initials)
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar — only show for others */}
              {!isMe && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: bg, color }}
                >
                  {msg.author_initials}
                </div>
              )}
              <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-[10px] font-semibold px-1" style={{ color: '#94a3b8' }}>
                    {msg.author_name}
                  </span>
                )}
                <div
                  className="px-3 py-2 rounded-2xl text-sm leading-snug"
                  style={{
                    background:  isMe ? '#152644' : 'white',
                    color:       isMe ? 'white' : '#1e293b',
                    borderRadius: isMe
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                  }}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] px-1" style={{ color: '#cbd5e1' }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        {/* Anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — sits above BottomNav */}
      <div
        className="fixed bottom-16 left-0 right-0 px-4 py-3 border-t"
        style={{ background: 'white', borderColor: '#f1f5f9' }}
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the club…"
            maxLength={500}
            className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none"
            style={{ background: '#f1f5f9', color: '#1e293b' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: input.trim() && !sending ? '#152644' : '#e2e8f0',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={input.trim() && !sending ? '#c9a84c' : '#94a3b8'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/>
              <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
