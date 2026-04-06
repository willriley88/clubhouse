# Clubhouse — AI Agent Context

## What This App Is
A golf PWA called **Clubhouse** with a two-tier product model:
- **General tier**: 18Birdies-style app — GPS, scorecard, handicap tracking, public courses
- **Club tier**: B2B PWA sold to private country clubs as yearly licenses — member login, tee sheet, social feed, tournaments, chat, GIN (Guest in Need)

**Pilot club**: LeBaron Hills CC, Lakeville MA  
**Key stakeholder**: Tom Rooney (head pro)  
**Primary competitor**: Gallus Golf — sells to managers not members, generic templates, no real backend integration  
**Clubhouse's edge**: Member-first experience, real Supabase integration, polished UI

---

## Stack
- **Framework**: Next.js 16 (App Router) with React 19
- **Database + Auth**: Supabase (magic link auth only, no passwords)
- **Auth SSR**: `@supabase/ssr` — used in middleware and auth callback for cookie-based sessions
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel (auto-deploy from GitHub `willriley88/clubhouse`)
- **Language**: TypeScript (strict mode)

---

## Brand
- **Navy**: `#152644`
- **Gold**: `#c9a84c`
- **Font**: Playfair Display italic for headings, Inter for body
- **Logo**: `/public/lebaron-logo-transparent-gold.png`

---

## Project Structure
```
app/
  page.tsx              # Home — member card, mini scorecard, club feed
  layout.tsx            # Root layout (NO BottomNav here — causes splash screen bug)
  scorecard/page.tsx    # Full 18-hole scorecard with live scoring
  tournament/page.tsx   # Tournament leaderboard — live tabs (stroke + stableford)
  club/page.tsx         # Club tab — tee sheet + feed from Supabase, quick links
  gps/page.tsx          # GPS tab — real hole data, prev/next nav, tee selector
  rounds/page.tsx       # Round history — all saved rounds for logged-in user
  login/page.tsx        # Magic link login page
  auth/callback/route.ts # Supabase auth callback — sets cookie-based session via @supabase/ssr
  components/
    BottomNav.tsx       # 5-tab nav — must be imported per-page, NOT in layout.tsx

lib/
  supabase.ts           # Browser Supabase client (used in client components)
  auth.ts               # signInWithEmail helper

supabase/migrations/
  20260406_club_feed_tee_sheet.sql   # feed_posts + tee_sheet tables, RLS, seed data
  20260406_tournaments.sql           # tournaments + tournament_entries + tournament_scores, seed

middleware.ts           # Auth enforcement: /club and /rounds redirect to /login if unauthenticated
```

---

## Critical Rules

### BottomNav
**Never put BottomNav in layout.tsx.** It must be imported individually in each page. 
The splash screen only shows on first visit (sessionStorage). If BottomNav is in layout.tsx it renders during the splash screen.

### TypeScript
- Always type `reduce` accumulators explicitly: `reduce((a: number, v) => ...)`
- React Fragment keys: `<React.Fragment key={...}>` not `<> </>`
- Avoid `any` where possible — use proper types
- Supabase FK joins are returned as **arrays**, not single objects: `holes: { par: number }[]` not `holes: { par: number }`. Access with `holes?.[0]?.par`

### Supabase
- Browser client in `lib/supabase.ts` — use in client components (`'use client'`)
- For middleware / server routes use `createServerClient` from `@supabase/ssr` with a cookies adapter
- Auth uses magic links only — no password flow
- Row Level Security (RLS) must be considered for all new tables
- Guest users get localStorage persistence via `clubhouse_guest` key
- Migrations live in `supabase/migrations/` — run them manually in the Supabase dashboard SQL editor

### Styling
- Use inline `style={{}}` for brand colors (`#152644`, `#c9a84c`) — Tailwind purges arbitrary values inconsistently
- Tailwind for layout, spacing, and generic utilities
- Rounded cards: `rounded-2xl`, consistent `px-4` gutters

---

## Supabase Schema

### Tables (current)

**profiles**
- `id` uuid (references auth.users)
- `full_name` text
- `handicap` numeric
- `created_at` timestamptz

**courses**
- `id` uuid
- `name` text — LeBaron Hills CC
- `city` text — Lakeville
- `state` text — MA
- `slope` integer — 136
- `rating` numeric — 73.4

**holes**
- `id` uuid
- `course_id` uuid
- `hole_number` integer (1–18)
- `par` integer
- `hcp_index` integer
- `yardage_blue` integer
- `yardage_white` integer
- `yardage_green` integer
- `yardage_gold` integer

**rounds**
- `id` uuid
- `profile_id` uuid
- `course_id` uuid
- `played_at` timestamptz
- `format` text (`'stroke'` or `'stroke|diff:2.3'`)

**scores**
- `id` uuid
- `round_id` uuid
- `hole_id` uuid (FK → holes)
- `strokes` integer
- `putts` integer (nullable)

**feed_posts**
- `id` uuid
- `author_name` text
- `author_initials` text
- `post_type` text — `'admin'` | `'member'`
- `content` text
- `created_at` timestamptz

**tee_sheet**
- `id` uuid
- `tee_date` date
- `tee_time` text — display string e.g. `"7:00 AM"`
- `tee_order` integer — sort order within a day
- `players` text — comma-separated member names
- `max_players` integer (default 4)

**tournaments**
- `id` uuid
- `name` text
- `subtitle` text
- `status` text — `'live'` | `'finished'` | `'upcoming'`
- `course_par` integer (default 72)
- `created_at` timestamptz

**tournament_entries**
- `id` uuid
- `tournament_id` uuid (FK → tournaments)
- `player_name` text
- `player_initials` text
- `handicap_index` numeric

**tournament_scores**
- `id` uuid
- `entry_id` uuid (FK → tournament_entries)
- `hole_number` integer (1–18)
- `strokes` integer

### Constants
- `COURSE_ID = 'b0000000-0000-0000-0000-000000000001'` — hardcoded in `scorecard/page.tsx` and `gps/page.tsx`

### Handicap / Stableford Calculation
WHS differential:
```
differential = ((gross_score - course_rating) × 113) / slope
```
Playing handicap (used for stableford in tournament page):
```
playing_handicap = round(handicap_index × 113 / slope)
```
LeBaron values: rating `73.4`, slope `136`

Stableford points per hole:
```
extra_strokes = hcp_index <= playing_handicap ? 1 : 0
points = max(0, 2 + par - (gross_strokes - extra_strokes))
```

---

## Current State (as of April 2026)

### What's Built & Real (Supabase-backed)
- **Home**: member card (editable name + handicap), mini scorecard showing real last round, club feed (static placeholder posts on home — real data on /club)
- **Scorecard**: full 18-hole entry, score shapes, FIR/GIR, multi-player, round saving to Supabase
- **Round history** (`/rounds`): all rounds for logged-in user, gross + score vs par per card
- **Tournament** (`/tournament`): live leaderboard from `tournaments` + `tournament_entries` + `tournament_scores`; stroke and stableford tabs both functional
- **Club** (`/club`): tee sheet and feed from Supabase (`tee_sheet`, `feed_posts` tables); async server component
- **GPS** (`/gps`): real hole data from `holes` table — prev/next navigation, tee selector (Blue/White/Green/Gold), live par/yardage/HCP display
- **Auth enforcement**: middleware redirects unauthenticated users to `/login` for `/club` and `/rounds`
- **Auth callback**: uses `@supabase/ssr` to write session to cookies (required for middleware to see the session)

### What's Still Static / Not Integrated
- Course map on GPS (placeholder green card — needs real GPS + hole layout imagery)
- Club feed on home page (`FEED_POSTS` array in `page.tsx` — points to `/club` which is real)
- Tournament "Today" tab shows same as Overall (needs per-day round data)
- Tee sheet booking (display only — no write flow)
- `COURSE_ID` hardcoded in scorecard and GPS — should come from user's club profile

### Known Issues
- `COURSE_ID` is hardcoded as a constant — should be dynamic
- Client-side `lib/supabase.ts` uses standard `createClient` (localStorage sessions); session refresh won't update the middleware cookie automatically. Full fix: migrate to `createBrowserClient` from `@supabase/ssr`
- Dual-boot EFI issue on dev machine (unrelated to app)

---

## Immediate Priorities (in order)
1. Demo polish for Tom Rooney at LeBaron Hills (May 2026)
2. Migrate `lib/supabase.ts` to `createBrowserClient` from `@supabase/ssr` for full cookie/session consistency
3. Round history page polish — handicap trend graph, best round highlight
4. Tee sheet write flow — let members book/join a tee time
5. Club feed post submission — let members and admins post

## Longer-Term
- Beta test with bag room staff
- Fork into general public app (18Birdies-style)
- Expand to other clubs (Norton CC identified as another Gallus customer)

---

## Dev Environment
- **OS**: Pop!_OS (dual-boot with Windows 11)
- **Hardware**: Ryzen 7 7800X3D, RTX 3090
- **IDE**: VS Code with Continue.dev (Deepseek Coder V2 via Ollama for autocomplete)
- **Project path**: `~/clubhouse`
- **GitHub**: `willriley88/clubhouse`
- **Local AI**: Ollama + `deepseek-coder-v2`

## Commands
```bash
npm run dev    # local dev server at localhost:3000
npm run build  # production build (run before pushing to catch errors)
npm run lint   # eslint check
```

---

## Agent Behavior Notes
- When modifying existing pages, preserve the existing color scheme and BottomNav import pattern
- When adding new Supabase tables, add them to `supabase/migrations/` and document them in this file
- Always run type-safe queries — use `.select()` with explicit columns
- FK joins from Supabase return arrays — use `data?.[0]?.field`, not `data?.field`
- Prefer server components for data fetching, client components only when interactivity is needed
- Keep inline comments concise — explain the "why" not the "what"
- Run `npm run build` before committing — TypeScript errors block Vercel deploys
