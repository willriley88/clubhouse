-- ============================================================
-- Events — club calendar (member events, outside bookings, tournaments)
-- ============================================================
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          text not null,           -- 'member' | 'hosting' | 'tournament'
  start_date    date not null,
  end_date      date,                    -- null for single-day events
  start_time    text,                    -- display string e.g. "8:00 AM Shotgun"
  description   text not null default '',
  location      text,
  external_link text,
  format        text,                    -- tournaments only: "Stroke Play, 18 holes"
  field_size    integer,                 -- tournaments only: max players
  created_at    timestamptz not null default now()
);

alter table events enable row level security;

-- Any visitor can read events (public calendar)
create policy "Public read events" on events for select using (true);
-- Authenticated users can insert (staff/admin posting via app)
create policy "Authenticated insert events" on events for insert
  with check (auth.role() = 'authenticated');

-- ── SEED ─────────────────────────────────────────────────────

-- Member events
insert into events (title, type, start_date, end_date, start_time, description, location, format, field_size) values
(
  'Men''s League Opener',
  'member',
  '2026-05-03',
  null,
  '8:00 AM Shotgun',
  'Kick off the Men''s League season with a 9-hole scramble. All skill levels welcome. Sign up at the pro shop.',
  'LeBaron Hills CC',
  'Scramble, 9 holes',
  60
),
(
  'Ladies Invitational',
  'member',
  '2026-07-12',
  null,
  '9:00 AM Shotgun',
  'Annual Ladies Invitational — invite a guest and enjoy a day of golf, lunch, and prizes. Registration opens June 1.',
  'LeBaron Hills CC',
  'Best Ball, 18 holes',
  72
),
(
  'Club Championship',
  'member',
  '2026-06-14',
  '2026-06-15',
  '7:30 AM first tee',
  'LeBaron Hills Club Championship. 36-hole stroke play over two days. Gross and net divisions. Entry fee $40.',
  'LeBaron Hills CC',
  'Stroke Play, 36 holes',
  80
);

-- Hosting / outside events
insert into events (title, type, start_date, end_date, start_time, description, location) values
(
  'Corporate Outing — Bridgewater Savings',
  'hosting',
  '2026-04-21',
  null,
  '7:00 AM Shotgun',
  'Course closed to members for private corporate outing. Driving range available until 7:00 AM.',
  'LeBaron Hills CC'
),
(
  'Middleboro Youth Fundraiser',
  'hosting',
  '2026-06-03',
  null,
  '10:00 AM Shotgun',
  'Annual school fundraiser golf tournament. Course closed to members from 9:00 AM – 5:00 PM.',
  'LeBaron Hills CC'
);

-- Tournaments
insert into events (title, type, start_date, end_date, start_time, description, location, format, field_size) values
(
  'Spring Member-Guest',
  'tournament',
  '2026-04-05',
  '2026-04-06',
  '8:00 AM Shotgun',
  'Annual Spring Member-Guest tournament. Members pair with a guest for two rounds of golf plus dinner Saturday evening.',
  'LeBaron Hills CC',
  'Modified Stableford, 18 holes',
  64
),
(
  'Club Championship',
  'tournament',
  '2026-06-14',
  '2026-06-15',
  '7:30 AM first tee',
  'LeBaron Hills Club Championship. 36-hole stroke play over two days. Gross and net divisions. Entry fee $40.',
  'LeBaron Hills CC',
  'Stroke Play, 36 holes',
  80
);
