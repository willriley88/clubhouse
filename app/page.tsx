'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from './components/BottomNav'
import { supabase } from '@/lib/supabase'

type FeedPost = {
  id: string
  author_initials: string
  author_name: string
  content: string
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

type Round = {
  id: string
  played_at: string
  format: string
  scores: { strokes: number; holes: { par: number; hole_number: number }[] }[]
}

export default function HomePage() {
  const router = useRouter()
  const [user,         setUser]         = useState<any>(null)
  const [profile,      setProfile]      = useState<any>(null)
  const [lastRound,    setLastRound]    = useState<Round | null>(null)
  const [roundCount,   setRoundCount]   = useState<number | null>(null)
  const [loadingRound, setLoadingRound] = useState(true)
  const [feedPosts,    setFeedPosts]    = useState<FeedPost[]>([])
  const [mounted,      setMounted]      = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)

  // Edit name state
  const [editingName, setEditingName] = useState(false)
  const [editName,    setEditName]    = useState('')

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user)

        // Load profile
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, handicap')
          .eq('id', data.user.id)
          .single()
        if (p) {
          setProfile(p)
          setEditName(p.full_name || data.user.email?.split('@')[0] || 'Member')
        }

        // Load last round + total round count in parallel
        const [{ data: rounds }, { count: rCount }] = await Promise.all([
          supabase
            .from('rounds')
            .select('id, played_at, format')
            .eq('profile_id', data.user.id)
            .order('played_at', { ascending: false })
            .limit(1),
          supabase
            .from('rounds')
            .select('id', { count: 'exact' })
            .eq('profile_id', data.user.id),
        ])
        setRoundCount(rCount ?? 0)

        if (rounds && rounds.length > 0) {
          const round = rounds[0]
          const { data: scores } = await supabase
            .from('scores')
            .select('strokes, holes(par, hole_number)')
            .eq('round_id', round.id)
          // sort by hole_number so positional access is correct
          const sorted = (scores || []).slice().sort(
            (a: any, b: any) => (a.holes?.[0]?.hole_number ?? 0) - (b.holes?.[0]?.hole_number ?? 0)
          )
          setLastRound({ ...round, scores: sorted as any })
        }
      } else {
        // Guest
        try {
          const g = JSON.parse(localStorage.getItem('clubhouse_guest') || '{}')
          setEditName(g.name || 'Guest')
          setProfile({ full_name: g.name || 'Guest', handicap: g.handicap || null })
        } catch {}
      }
      // Fetch 3 most recent club feed posts regardless of auth state
      const { data: posts } = await supabase
        .from('feed_posts')
        .select('id, author_initials, author_name, content, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
      setFeedPosts(posts ?? [])

      setLoadingRound(false)
    })
  }, [])

  async function saveName() {
    setProfile((p: any) => ({ ...p, full_name: editName }))
    setEditingName(false)
    if (user) {
      await supabase.from('profiles').update({ full_name: editName }).eq('id', user.id)
    } else {
      const g = JSON.parse(localStorage.getItem('clubhouse_guest') || '{}')
      localStorage.setItem('clubhouse_guest', JSON.stringify({ ...g, name: editName }))
    }
  }


  const displayName = profile?.full_name || editName || 'Guest'
  const handicap    = profile?.handicap

  // Last round total + net
  const lastGross = lastRound?.scores.reduce((a, s) => a + s.strokes, 0) ?? 0
  const lastPar = lastRound?.scores.reduce((a: number, s) => a + (s.holes?.[0]?.par ?? 0), 0) || 72

  return (
    <main className="min-h-screen pb-24" style={{ background: '#f1f5f9' }}>

      {/* ── HEADER ── */}
      <div className="px-4 pt-2 pb-5" style={{ background: '#152644' }}>
        <div className="flex justify-between items-center mb-4">
          {/* Hamburger — opens slide-in drawer */}
          <button onClick={() => setDrawerOpen(true)} className="flex flex-col gap-1.5 p-1">
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
            <span className="block w-5 h-0.5 bg-white/60 rounded" />
          </button>

          {/* Club name — Playfair italic */}
          <img src="/lebaron-logo-transparent-gold.png" alt="LeBaron Hills" className="h-40 object-contain" />          {/* Avatar */}
          <button
            onClick={() => user ? router.push('/profile') : router.push('/login')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2"
            style={{ background: '#c9a84c', borderColor: '#c9a84c', color: '#152644' }}>
            {displayName.charAt(0).toUpperCase()}
          </button>
        </div>

        {/* Member card */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {/* Name row with edit pencil */}
          <div className="flex items-center gap-2 mb-0.5">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  autoFocus
                  className="bg-transparent border-b border-white/40 text-white text-xl font-bold outline-none flex-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
                <button onClick={saveName} className="text-xs font-semibold" style={{ color: '#c9a84c' }}>Save</button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                  {displayName}
                </h2>
                <button onClick={() => setEditingName(true)}>
                  {/* Pencil icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Member · LeBaron Hills Country Club
          </p>

          {/* Stats row */}
          <div className="flex items-end gap-6">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                {handicap !== null && handicap !== undefined ? handicap : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Handicap Index
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {roundCount !== null ? roundCount : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Rounds</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {lastRound && lastGross > 0 ? lastGross : '—'}
              </div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Last</div>
            </div>
            {user && (
              <div className="flex-1 text-right">
                <button
                  onClick={() => router.push('/profile')}
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Profile →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

       {/* ── SCORECARD CARD ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
            {lastRound ? 'Last Round' : 'Scorecard'}
          </p>
          <button
            onClick={() => router.push(lastRound ? '/rounds' : '/scorecard')}
            className="w-full bg-white rounded-2xl shadow-sm overflow-hidden text-left">

            {/* Card header */}
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-700">LeBaron Hills CC</p>
                <p className="text-xs text-slate-400">
                  {lastRound
                    ? new Date(lastRound.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Blue Tees · Par 72'}
                </p>
              </div>
              {lastRound && (
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: '#152644' }}>{lastGross}</div>
                  <div className="text-xs text-slate-400">Gross</div>
                </div>
              )}
            </div>

            {/* Column headers */}
            <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '28px repeat(9, 1fr) 28px repeat(9, 1fr) 36px' }}>
              <div className="py-1.5 text-[9px] font-bold text-slate-400 text-center" />
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="py-1.5 text-[9px] font-bold text-center" style={{ color: '#152644' }}>{i + 1}</div>
              ))}
              <div className="py-1.5 text-[9px] font-bold text-center bg-slate-50" style={{ color: '#152644' }}>Out</div>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i + 9} className="py-1.5 text-[9px] font-bold text-center" style={{ color: '#152644' }}>{i + 10}</div>
              ))}
              <div className="py-1.5 text-[9px] font-bold text-center bg-slate-50" style={{ color: '#152644' }}>Tot</div>
            </div>

            {/* Par row */}
            {(() => {
              const pars = [4,4,5,3,4,4,4,3,5,5,3,4,3,4,5,4,4,4]
              const front = pars.slice(0,9).reduce((a,v)=>a+v,0)
              const total = pars.reduce((a,v)=>a+v,0)
              return (
                <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: '28px repeat(9, 1fr) 28px repeat(9, 1fr) 36px' }}>
                  <div className="py-1.5 text-[9px] text-slate-400 text-center">Par</div>
                  {pars.slice(0,9).map((p, i) => (
                    <div key={i} className="py-1.5 text-[9px] text-center text-slate-500">{p}</div>
                  ))}
                  <div className="py-1.5 text-[9px] text-center font-bold bg-slate-50 text-slate-600">{front}</div>
                  {pars.slice(9).map((p, i) => (
                    <div key={i+9} className="py-1.5 text-[9px] text-center text-slate-500">{p}</div>
                  ))}
                  <div className="py-1.5 text-[9px] text-center font-bold bg-slate-50 text-slate-600">{total}</div>
                </div>
              )
            })()}

            {/* Score row */}
            {(() => {
              const pars = [4,4,5,3,4,4,4,3,5,5,3,4,3,4,5,4,4,4]
              const allScores = Array.from({ length: 18 }, (_, i) => lastRound?.scores[i]?.strokes ?? null)
              const frontTotal = allScores.slice(0,9).reduce((a: number,v)=>a+(v??0),0)
              const grandTotal = allScores.reduce((a: number,v)=>a+(v??0),0)
              const anyFront = allScores.slice(0,9).some(v=>v!==null)
              const anyAll   = allScores.some(v=>v!==null)

              function ScoreCell({ strokes, par }: { strokes: number|null, par: number }) {
                if (strokes === null) return <span className="text-[9px] text-slate-300">—</span>
                const diff = strokes - par
                return (
                  <span className={`w-5 h-5 flex items-center justify-center text-[9px] font-bold
                    ${diff <= -1 ? 'rounded-full border border-slate-800' :
                      diff === 1  ? 'rounded-sm border border-slate-800' :
                      diff >= 2   ? 'rounded-sm border-2 border-double border-slate-800' : ''}`}
                    style={{ color: '#152644' }}>
                    {strokes}
                  </span>
                )
              }

              return (
                  <div className="grid" style={{ gridTemplateColumns: '28px repeat(9, 1fr) 28px repeat(9, 1fr) 36px' }}>
                    <div className="py-2 text-[9px] text-slate-400 text-center">Scr</div>
                    {allScores.slice(0,9).map((s, i) => (
                      <div key={i} className="py-2 flex items-center justify-center">
                        <ScoreCell strokes={s} par={pars[i]} />
                      </div>
                    ))}
                    <div className="py-2 text-[9px] font-bold text-center bg-slate-50" style={{ color: '#152644' }}>
                      {anyFront ? frontTotal : '—'}
                    </div>
                    {allScores.slice(9).map((s, i) => (
                      <div key={i+9} className="py-2 flex items-center justify-center">
                        <ScoreCell strokes={s} par={pars[i+9]} />
                      </div>
                    ))}
                    <div className="py-2 text-[9px] font-bold text-center bg-slate-50" style={{ color: '#152644' }}>
                      {anyAll ? grandTotal : '—'}
                    </div>
                  </div>
                )
              })()}

          </button>
        </div>

        {/* ── EVENTS ── placeholder card */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Events</p>
          <div className="rounded-2xl p-4 shadow-sm relative overflow-hidden" style={{ background: '#152644' }}>
            {/* Decorative circle */}
            <div className="absolute right-4 top-4 w-16 h-16 rounded-full opacity-10" style={{ background: '#c9a84c' }} />
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Member-Guest Classic
            </p>
            <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              June 14 – 16, 2025
            </h3>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Stroke Play · Stableford · 67 Players
            </p>
            <button
              onClick={() => router.push('/tournament')}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: '#c9a84c', color: '#152644' }}>
              View Leaderboard →
            </button>
          </div>
        </div>

        {/* ── CLUB FEED ── */}
        {/* mounted guard prevents SSR/client HTML mismatch on feedPosts.length check */}
        {mounted && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Club Feed</p>
            <div className="space-y-2">
              {feedPosts.length === 0 ? (
                <div className="bg-white rounded-2xl px-4 py-8 text-center shadow-sm">
                  <p className="text-sm font-semibold mb-1" style={{ color: '#152644' }}>Nothing posted yet</p>
                  <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
                    Club updates and member posts will appear here
                  </p>
                  <button
                    onClick={() => router.push('/club')}
                    className="px-5 py-2 rounded-xl text-sm font-bold"
                    style={{ background: '#152644', color: '#c9a84c' }}
                  >
                    Go to Club →
                  </button>
                </div>
              ) : feedPosts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: '#152644' }}>
                    {post.author_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{post.author_name}</span> {post.content}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{relativeTime(post.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ── DRAWER ── */}

      {/* Backdrop — tap outside to close */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{
          width: 280,
          background: '#152644',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-12 pb-4">
          <img src="/lebaron-logo-transparent-gold.png" alt="LeBaron Hills" className="h-20 object-contain" />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />

        {/* Auth section — Login if guest, Sign Out if member */}
        <div className="py-2">
          {!user ? (
            <button
              onClick={() => { setDrawerOpen(false); router.push('/login') }}
              className="w-full text-left px-5 py-3.5 text-sm font-semibold"
              style={{ color: '#c9a84c' }}
            >
              Membership Login
            </button>
          ) : (
            <button
              onClick={async () => {
                setDrawerOpen(false)
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="w-full text-left px-5 py-3.5 text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />

        {/* Club & course links — always visible */}
        <nav className="py-2">
          {[
            { label: 'Membership Info',  href: 'https://www.lebaronhills.com/membership'          },
            { label: 'Golf Amenities',   href: 'https://www.lebaronhills.com/golf/golf-amenities'  },
            { label: 'Golf Outings',     href: 'https://www.lebaronhills.com/golf/golf-outings'    },
            { label: 'Course Layout',    href: 'https://www.lebaronhills.com/golf/course-layout'   },
            { label: 'Course Gallery',   href: 'https://www.lebaronhills.com/golf/course-gallery'  },
            { label: 'Golf Personnel',   href: 'https://www.lebaronhills.com/golf/golf-personnel'  },
            { label: 'Contact Info',     href: 'https://www.lebaronhills.com/contact'               },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => { setDrawerOpen(false); window.open(item.href, '_blank') }}
              className="w-full text-left px-5 py-3 text-sm font-medium"
              style={{ color: '#c9a84c' }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Divider + member-only links */}
        {user && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0 20px' }} />
            <nav className="py-2">
              {[
                { label: 'Profile',        href: '/profile' },
                { label: 'Round History',  href: '/rounds'  },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setDrawerOpen(false); router.push(item.href) }}
                  className="w-full text-left px-5 py-3 text-sm font-medium"
                  style={{ color: '#c9a84c' }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>

    <BottomNav />
  </main>
  )
}
