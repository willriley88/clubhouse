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
- **Auth SSR**: `@supabase/ssr` — `createBrowserClient` in `lib/supabase.ts`, `createServerClient` in middleware + auth callback
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel (auto-deploy from GitHub `willriley88/clubhouse`)
- **Language**: TypeScript (strict mode)
- **PWA**: `public/manifest.json` linked via Next.js Metadata API — installable on iOS/Android

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
  page.tsx              # Home — member card, mini scorecard, real club feed
  layout.tsx            # Root layout (NO BottomNav — splash screen bug); PWA metadata
  scorecard/page.tsx    # Full 18-hole scorecard with live scoring
  tournament/page.tsx   # Tournament leaderboard — stroke + stableford tabs
  club/page.tsx         # Club tab — tee sheet (Join button), feed (post submission)
  gps/page.tsx          # GPS tab — real hole data, prev/next nav, tee selector
  rounds/page.tsx       # Round history — all saved rounds for logged-in user
  profile/page.tsx      # Member profile — handicap, round count, last 5 rounds
  login/page.tsx        # Magic link login page
  auth/callback/route.ts # Supabase auth callback — sets cookie-based session
  components/
    BottomNav.tsx       # 5-tab nav — must be imported per-page, NOT in layout.tsx

lib/
  supabase.ts           # createBrowserClient — use in client components only
  supabase-server.ts    # createClient factory — use in server components
  auth.ts               # signInWithEmail helper

public/
  manifest.json         # PWA manifest (name, theme, icon)

supabase/migrations/
  20260406_club_feed_tee_sheet.sql   # feed_posts + tee_sheet tables, RLS, seed
  20260406_tournaments.sql           # tournaments + entries + scores, seed
  20260406_demo_refresh.sql          # Run before demo: reseeds tee sheet to today,
                                     # fixes tournament scores + adds players

middleware.ts           # Auth: /club and /rounds redirect to /login if unauthenticated
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
- Supabase FK joins return **arrays**: `holes: { par: number }[]`. Access with `holes?.[0]?.par`

### Supabase
- `lib/supabase.ts` uses `createBrowserClient` — client components (`'use client'`) only
- `lib/supabase-server.ts` uses plain `createClient` — server components only
- Middleware and auth callback use `createServerClient` from `@supabase/ssr` with cookies adapter
- Auth uses magic links only — no password flow
- RLS required on all new tables
- Guest users: localStorage persistence via `clubhouse_guest` key
- Migrations in `supabase/migrations/` — run manually in Supabase SQL editor

### Styling
- Use inline `style={{}}` for brand colors (`#152644`, `#c9a84c`) — Tailwind purges arbitrary values
- Tailwind for layout, spacing, and generic utilities
- Rounded cards: `rounded-2xl`, consistent `px-4` gutters

---

## Supabase Schema

### Tables (current)

**profiles** — `id` uuid (→ auth.users), `full_name` text, `handicap` numeric, `created_at`

**courses** — `id` uuid, `name` text, `city`, `state`, `slope` integer (136), `rating` numeric (73.4)

**holes** — `id`, `course_id`, `hole_number` 1–18, `par`, `hcp_index`, `yardage_blue/white/green/gold`

**rounds** — `id`, `profile_id`, `course_id`, `played_at`, `format` (`'stroke'` or `'stroke|diff:2.3'`)

**scores** — `id`, `round_id`, `hole_id` (FK→holes), `strokes`, `putts` (nullable)

**feed_posts** — `id`, `author_name`, `author_initials`, `post_type` (`'admin'`|`'member'`), `content`, `created_at`

**tee_sheet** — `id`, `tee_date` date, `tee_time` text, `tee_order` integer, `players` text (comma-sep), `max_players` integer

**tournaments** — `id`, `name`, `subtitle`, `status` (`'live'`|`'finished'`|`'upcoming'`), `course_par`, `created_at`

**tournament_entries** — `id`, `tournament_id`, `player_name`, `player_initials`, `handicap_index` numeric

**tournament_scores** — `id`, `entry_id`, `hole_number` 1–18, `strokes`

### Constants
- `COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'` — used as fallback in scorecard and GPS if Supabase lookup fails; actual ID is fetched dynamically from `courses` where `name = 'LeBaron Hills CC'`

### Handicap / Stableford Calculation
```
WHS differential  = ((gross - rating) × 113) / slope
playing_handicap  = round(handicap_index × 113 / slope)   -- used in tournament page
stableford_points = max(0, 2 + par - (gross - extra_strokes))
  where extra_strokes = hcp_index <= playing_handicap ? 1 : 0
```
LeBaron values: rating `73.4`, slope `136`

---

## Current State (as of April 2026 — demo-ready)

### What's Built & Real (Supabase-backed)
- **Home** (`/`): member card (editable name/handicap), real last round mini scorecard, real club feed from `feed_posts`
- **Scorecard** (`/scorecard`): 18-hole entry, score shapes, FIR/GIR, multi-player, saves to Supabase; COURSE_ID fetched dynamically
- **Round history** (`/rounds`): all rounds for logged-in user, gross + score vs par
- **Profile** (`/profile`): handicap, round count, best gross, last 5 rounds; links from member card avatar
- **Tournament** (`/tournament`): live leaderboard from Supabase; stroke + stableford tabs; proper WHS handicap calc
- **Club** (`/club`): tee sheet with **Join button** (writes player name to Supabase, optimistic update); feed with **post submission** (members can post, inserts into feed_posts); COURSE_ID dynamic
- **GPS** (`/gps`): real hole data from `holes`, prev/next nav, tee selector (Blue/White/Green/Gold)
- **Auth enforcement**: middleware blocks `/club` + `/rounds` for unauthenticated users
- **PWA**: manifest.json + apple-touch-icon — installable on iOS/Android home screen

### What's Still Static / Not Integrated
- Course map on GPS (placeholder green card — needs real GPS positioning)
- Tournament "Today" tab = same as Overall (needs per-day round data)
- Tee sheet doesn't prevent double-booking across multiple sessions (no server-side guard)
- `COURSE_ID` fallback still hardcoded — fine until multi-club support is needed

### Known Issues
- Dual-boot EFI issue on dev machine (unrelated to app)

---

## Before Any Demo — Run These Migrations
In Supabase dashboard → SQL Editor, run in order:
1. `20260406_club_feed_tee_sheet.sql` — creates tables, seeds feed + tee sheet
2. `20260406_tournaments.sql` — creates tournament tables, seeds Spring Member-Guest 2026
3. **`20260406_demo_refresh.sql`** — run this EVERY TIME before demo: reseeds tee sheet with today's date, fixes tournament scores, adds O'Brien + Connelly entries

---

## Immediate Priorities
1. GPS real positioning (hole distances from GPS coordinates)
2. Tournament "Today" tab with per-day scores
3. Tee sheet double-booking guard (server-side check before update)
4. Multi-club support — dynamic club selection instead of hardcoded LeBaron

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
npm run build  # production build (run before pushing — TypeScript errors block Vercel)
npm run lint   # eslint check
```

---

## Agent Behavior Notes
- Preserve existing color scheme and BottomNav import pattern on all pages
- New Supabase tables → migration file in `supabase/migrations/` + update this file
- FK joins from Supabase return arrays — use `data?.[0]?.field`, not `data?.field`
- Prefer server components for data fetching; client components only when interactivity needed
- Inline comments only — explain the "why", not the "what"
- Run `npm run build` before every commit
