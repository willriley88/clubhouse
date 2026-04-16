-- ============================================================
-- Club Feed Posts
-- ============================================================
create table if not exists feed_posts (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  author_initials text not null,
  post_type    text not null default 'member', -- 'admin' | 'member'
  content      text not null,
  created_at   timestamptz not null default now()
);

alter table feed_posts enable row level security;

-- Anyone (including anonymous) can read posts
create policy "Public read feed_posts"
  on feed_posts for select
  using (true);

-- Only authenticated users can post
create policy "Authenticated insert feed_posts"
  on feed_posts for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Tee Sheet
-- ============================================================
create table if not exists tee_sheet (
  id          uuid primary key default gen_random_uuid(),
  tee_date    date not null default current_date,
  tee_time    text not null,          -- display string, e.g. "7:00 AM"
  tee_order   integer not null,       -- sort order within a day
  players     text not null default '',  -- comma-separated member names
  max_players integer not null default 4
);

alter table tee_sheet enable row level security;

-- Anyone can read tee sheet
create policy "Public read tee_sheet"
  on tee_sheet for select
  using (true);

-- Only authenticated users can modify tee times
create policy "Authenticated insert tee_sheet"
  on tee_sheet for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update tee_sheet"
  on tee_sheet for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- Seed: Feed Posts
-- ============================================================
insert into feed_posts (author_name, author_initials, post_type, content, created_at) values
  ('Tom R.',     'TR',    'member', 'Course is in great shape today — greens rolling fast after the morning roll.',  now() - interval '1 hour'),
  ('Club Admin', 'A',     'admin',  'Pro shop sale this weekend: 20% off all apparel. Stop in and see us!',           now() - interval '3 hours'),
  ('Mike K.',    'MK',    'member', 'Anyone up for a game Saturday morning? Need a 4th.',                             now() - interval '1 day'),
  ('Club Admin', 'A',     'admin',  'Reminder: Club Championship sign-ups close April 15. See Tom in the pro shop.', now() - interval '2 days'),
  ('Sarah L.',   'SL',    'member', 'Shot my best round ever yesterday — 82 from the whites!',                        now() - interval '3 days');

-- ============================================================
-- Seed: Tee Sheet (today's date)
-- ============================================================
insert into tee_sheet (tee_date, tee_time, tee_order, players, max_players) values
  (current_date, '7:00 AM',  1, 'Sullivan, O''Brien, Monroe, Ricci', 4),
  (current_date, '7:12 AM',  2, 'Walsh, Mahoney',                    4),
  (current_date, '7:24 AM',  3, '',                                  4),
  (current_date, '7:36 AM',  4, 'Kim, Torres, Connelly',             4),
  (current_date, '7:48 AM',  5, 'Thompson, Lee, Burke, Grant',       4),
  (current_date, '8:00 AM',  6, 'Flynn, Brady',                      4),
  (current_date, '8:12 AM',  7, '',                                  4),
  (current_date, '8:24 AM',  8, 'Peters, Donovan, Walsh',            4);
