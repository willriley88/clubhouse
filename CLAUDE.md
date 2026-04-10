# Clubhouse — AI Agent Context

## What This App Is
A golf PWA called **Clubhouse** with a two-tier product model:
- **General tier**: 18Birdies-style app — GPS, scorecard, handicap tracking, public courses
- **Club tier**: B2B PWA sold to private country clubs as yearly licenses — member login, tee sheet, social feed, tournaments, channels/chat

**Pilot club**: LeBaron Hills CC, Lakeville MA  
**Key stakeholder**: Tom Rooney (head pro)  
**Primary competitor**: Gallus Golf — sells to managers not members, generic templates, no real backend integration  
**Clubhouse's edge**: Member-first experience, real Supabase integration, polished UI

---

## Stack
- **Framework**: Next.js 16 (App Router) with React 19
- **Database + Auth**: Supabase (OTP email code auth — no passwords, no magic links)
- **Auth SSR**: `@supabase/ssr` — `createBrowserClient` in `lib/supabase.ts`, `createServerClient` in middleware + auth callback
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel (auto-deploy from GitHub `willriley88/clubhouse`); `NEXT_PUBLIC_SITE_URL` built from Vercel's auto-set `VERCEL_URL` in `next.config.ts` — override in Vercel env vars for custom domains
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
  tournament/page.tsx   # Events page — Calendar / Club Events / Tournaments tabs
  club/page.tsx         # Club tab — quick links, tee sheet (Join), unified channel feed with pill switcher
  gps/page.tsx          # GPS tab — real hole data, prev/next nav, tee selector
  rounds/page.tsx       # Round history — all saved rounds for logged-in user
  profile/page.tsx      # Member profile — handicap, round count, last 5 rounds
  login/page.tsx        # OTP login — step 1: email + Send Code; step 2: 6-digit code + Verify
  auth/callback/route.ts # Legacy magic-link callback (kept for backwards compat, not used by OTP flow)
  components/
    BottomNav.tsx       # 5-tab nav — must be imported per-page, NOT in layout.tsx

lib/
  supabase.ts           # createBrowserClient — use in client components only
  supabase-server.ts    # createClient factory — use in server components
  auth.ts               # signInWithEmail helper
  club-config.ts        # getClubConfig(courseId?) — server-side ClubConfig fetch

public/
  manifest.json         # PWA manifest (name, theme, icon)

supabase/migrations/
  20260406_club_feed_tee_sheet.sql   # feed_posts + tee_sheet tables, RLS, seed
  20260406_tournaments.sql           # tournaments + entries + scores, seed
  20260406_demo_refresh.sql          # Run before demo: reseeds tee sheet to today,
                                     # fixes tournament scores + adds players
  20260409_club_config.sql           # club_config table (course_id FK), LeBaron seed
  20260409_chat.sql                  # messages table (realtime, authenticated-only)
  20260409_channels.sql              # adds channel column to messages table
  20260409_events.sql                # events table (member/hosting/tournament), RLS, LeBaron seed

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
- Auth uses OTP email codes — `signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: undefined } })` sends 6-digit code (`emailRedirectTo: undefined` is required — a defined value causes Supabase to send a magic link instead); `verifyOtp({ email, token, type: 'email' })` completes login client-side; no callback redirect needed
- Session persistence is automatic via `createBrowserClient` cookie sync — users stay logged in across page loads
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

**club_config** — `id`, `course_id` uuid (FK→courses, unique), `club_name` text, `primary_color`, `secondary_color`, `logo_path`, `location`

**messages** — `id`, `profile_id` uuid (FK→auth.users), `author_name`, `author_initials`, `message` text, `channel` text (default `'general'`), `created_at`; realtime-enabled; authenticated read/insert; indexed on `channel`

**events** — `id`, `title`, `type` (`'member'`|`'hosting'`|`'tournament'`), `start_date` date, `end_date` date (nullable), `start_time` text (nullable), `description` text, `location` text (nullable), `external_link` text (nullable), `format` text (nullable), `field_size` integer (nullable), `created_at`; public read, authenticated insert

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
- **Events** (`/tournament`): three-tab Events page — Calendar (monthly grid, gold dot for event days, today navy circle, tap day → detail sheet), Club Events (member + hosting events with date badge + expandable rows), Tournaments (tournament-type events with status badge + expandable detail); all data from `events` table
- **Club** (`/club`): 2×2 quick links (Tee Times → CPS Golf booking, Menu → `window.open('/lebaron-menu.pdf', '_blank')` + phone button `tel:5089235712`, Member Statements → Prophet billing, Staff Info → lebaronhills.com/about-us); tee sheet with **Join button** (writes player name to Supabase, optimistic update); **unified channel feed** with horizontal pill switcher (Announcements / Men's League / Women's League / Tournament); active pill navy+gold, inactive gray; messages from `messages` table filtered by channel slug; Supabase Realtime subscription per active tab; optimistic send with dedup; all channels open to all authenticated members (no read-only restrictions)
- **GPS** (`/gps`): real hole data from `holes`, prev/next nav, tee selector; **real GPS positioning** with `watchPosition`, Haversine formula, front/center/back yard distances; GPS status badge (green/yellow/red); `GREEN_COORDS` hardcoded (centered 41.8387°N, 70.9762°W — refine with on-course GPS walk)
- **Auth enforcement**: middleware blocks `/club` + `/rounds` for unauthenticated users
- **PWA**: manifest.json + apple-touch-icon — installable on iOS/Android home screen
- **Score sharing**: after round saves, shows share bottom sheet with gross + differential; Web Share API with clipboard copy fallback; text: "Shot 78 (+6) at LeBaron Hills CC via Clubhouse 🏌️"
- **Handicap sparkline**: profile page shows inline SVG gold trend line for last 5 rounds (oldest-left, newest-right); labels ↓ Improving / ↑ Rising / — Steady
- **Club tab badge**: gold dot on Club icon in BottomNav when there are unread feed posts; tracks last visit via `clubhouse_last_club_visit` in localStorage; clears on /club visit
- **Club config** (`lib/club-config.ts`): `getClubConfig(courseId?)` server helper + `ClubConfig` type; `club_config` table uses `course_id` FK; `app/layout.tsx` uses `generateMetadata()` to pull club name + brand color from DB

### GPS Notes
`GREEN_COORDS` in `app/gps/page.tsx` holds approximate lat/lng for all 18 greens (front/center/back). Centered around 41.8387°N, 70.9762°W. To get real accuracy, walk each green with a phone and record `watchPosition` output, then update the constant.

### What's Still Static / Not Integrated
- Course map on GPS (placeholder green background — no visual hole map yet)
- Tournament leaderboard removed — `/tournament` is now the Events page; leaderboard data still in `tournaments`/`tournament_entries`/`tournament_scores` tables but no longer surfaced in UI
- Tee sheet doesn't prevent double-booking across multiple sessions (no server-side guard)
- Multi-club: `club_config` table + `getClubConfig()` helper are in place; pages still use hardcoded LeBaron values — future work is wiring each page to the config

### Known Issues
- Dual-boot EFI issue on dev machine (unrelated to app)

---

## Before Any Demo — Run These Migrations
In Supabase dashboard → SQL Editor, run in order:
1. `20260406_club_feed_tee_sheet.sql` — feed_posts + tee_sheet tables, seed
2. `20260406_tournaments.sql` — tournament tables, seed Spring Member-Guest 2026
3. `20260409_club_config.sql` — club_config table (course_id FK), seeded with LeBaron values
4. `20260409_chat.sql` — messages table (realtime, authenticated-only)
5. `20260409_channels.sql` — adds `channel` column + index to messages
6. `20260409_events.sql` — events table + LeBaron seed data
7. **`20260406_demo_refresh.sql`** — run EVERY TIME before demo: reseeds tee sheet with today's date, fixes tournament scores, adds O'Brien + Connelly entries

> Note: `20260407_club_config.sql` and `20260407_chat_gin.sql` are superseded by the 20260409 files — skip them.

---

## Immediate Priorities
1. Refine `GREEN_COORDS` in `app/gps/page.tsx` with real on-course GPS coordinates
2. Tee sheet double-booking guard (server-side check before update)
3. Wire remaining pages to `getClubConfig()` (replaces hardcoded LeBaron strings)
4. Copy `~/lebaron-menu-4/9.pdf` → `public/lebaron-menu.pdf` so Menu quick link works
5. Add real event data to `events` table (staff can insert via Supabase dashboard or future admin UI)

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
