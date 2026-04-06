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
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel (auto-deploy from GitHub `willriley88/clubhouse`)
- **Language**: TypeScript (strict mode)

---

## Brand
- **Navy**: `#152644`
- **Gold**: `#c9a84c`
- **Font**: Playfair Display italic for headings, Inter for body
- **Logo**: `/public/lebaron-logo-transparent.png`

---

## Project Structure
```
app/
  page.tsx              # Home — member card, mini scorecard, club feed
  layout.tsx            # Root layout (NO BottomNav here — causes splash screen bug)
  scorecard/page.tsx    # Full 18-hole scorecard with live scoring
  tournament/page.tsx   # Tournament leaderboard (stroke + stableford)
  club/page.tsx         # Club tab — tee sheet, feed, quick links
  gps/page.tsx          # GPS tab — hole distances (placeholder map)
  login/page.tsx        # Magic link login page
  auth/callback/route.ts # Supabase auth callback handler
  components/
    BottomNav.tsx       # 5-tab nav — must be imported per-page, NOT in layout.tsx

lib/
  supabase.ts           # Supabase client
  auth.ts               # signInWithEmail helper

middleware.ts           # Currently passes all requests through (auth not enforced yet)
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

### Supabase
- Client is initialized in `lib/supabase.ts`
- Auth uses magic links only — no password flow
- Row Level Security (RLS) must be considered for all new tables
- Guest users get localStorage persistence via `clubhouse_guest` key

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
- `name` text
- `city` text
- `state` text
- `slope` integer (LeBaron: 136)
- `rating` numeric (LeBaron: 73.4)

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
- `format` text (e.g. `'stroke'` or `'stroke|diff:2.3'`)

**scores**
- `id` uuid
- `round_id` uuid
- `hole_id` uuid
- `strokes` integer
- `putts` integer (nullable)

### Handicap Calculation
WHS differential formula:
```
differential = ((gross_score - course_rating) × 113) / slope
```
LeBaron values: rating `73.4`, slope `136`

### Seeded Data
LeBaron Hills CC is seeded with all 18 holes — real yardages, par, HCP index.
`COURSE_ID` constant used in scorecard: look it up from Supabase if not hardcoded.

---

## Current State (as of April 2026)

### What's Built & Working
- Home screen with member card (editable name + handicap), mini scorecard, club feed
- Scorecard: full 18-hole entry, frozen label columns, bottom sheet score input, score shapes (circle = birdie, double circle = eagle, square = bogey, etc.), FIR/GIR tracking, multi-player support up to 4, round saving to Supabase
- Tournament leaderboard: stroke + stableford tabs, expandable per-player scorecards, color-coded scores
- Club tab: tee sheet (static), feed (static), quick links grid
- GPS tab: placeholder with hardcoded distances
- Login page: magic link flow with confirmation screen
- Auth callback route
- Splash screen (sessionStorage — shows once per session)
- Deployed on Vercel with env vars set

### What's Static / Not Yet Integrated
- Tee sheet data (hardcoded in club/page.tsx — needs Supabase table)
- Club feed posts (hardcoded — needs Supabase table)
- Tournament leaderboard (hardcoded — needs Supabase table)
- GPS distances (hardcoded — needs real GPS + course map)
- Round history page (`/rounds` linked but not built)

### Known Issues
- Middleware is a passthrough — auth not actually enforced on `/club`
- `COURSE_ID` is hardcoded as a constant in scorecard — should be dynamic
- Dual-boot EFI issue on dev machine (unrelated to app)

---

## Immediate Priorities (in order)
1. Supabase integration for tee sheet, club feed, tournament data
2. Round history page (`/rounds`)
3. GPS tab with real hole data from Supabase
4. Auth enforcement on club routes
5. Demo polish for Tom Rooney at LeBaron Hills

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
- When adding new Supabase tables, include RLS policy suggestions
- Always run type-safe queries — use `.select()` with explicit columns
- When in doubt about Next.js 16 App Router patterns, check `node_modules/next/dist/docs/`
- Prefer server components for data fetching, client components only when interactivity is needed
- Keep inline comments concise — explain the "why" not the "what"
