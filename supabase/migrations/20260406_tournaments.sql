-- ============================================================
-- Tournaments
-- ============================================================
create table if not exists tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subtitle   text not null default '',
  status     text not null default 'live',  -- 'live' | 'finished' | 'upcoming'
  course_par integer not null default 72,
  created_at timestamptz not null default now()
);

alter table tournaments enable row level security;
create policy "Public read tournaments" on tournaments for select using (true);

-- ============================================================
-- Tournament Entries (one per player per tournament)
-- ============================================================
create table if not exists tournament_entries (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references tournaments(id) on delete cascade,
  player_name     text not null,
  player_initials text not null,
  handicap_index  numeric not null default 0
);

alter table tournament_entries enable row level security;
create policy "Public read tournament_entries" on tournament_entries for select using (true);

-- ============================================================
-- Tournament Scores (one row per player per hole)
-- ============================================================
create table if not exists tournament_scores (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references tournament_entries(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  strokes     integer not null check (strokes > 0)
);

alter table tournament_scores enable row level security;
create policy "Public read tournament_scores" on tournament_scores for select using (true);

-- ============================================================
-- Seed: Spring Member-Guest 2026
-- LeBaron Hills CC  Rating 73.4  Slope 136  Par 72
-- Hole pars: 4,4,5,3,4,4,4,3,5 | 5,3,4,3,4,5,4,4,4
-- HCP index:  1,7,11,17,3,13,5,15,9 | 2,16,6,18,10,4,12,14,8
-- ============================================================
do $$
declare
  t_id   uuid;
  e1_id  uuid; e2_id uuid; e3_id uuid;
  e4_id  uuid; e5_id uuid; e6_id uuid;
begin

  insert into tournaments (name, subtitle, status, course_par)
  values ('Spring Member-Guest 2026', 'LeBaron Hills CC · June 14–16 · Day 2 of 3 · 38 Teams', 'live', 72)
  returning id into t_id;

  -- Player 1: Dave R.  HCP 4.2  — strong round, -9 net
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'Dave R.', 'DR', 4.2) returning id into e1_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e1_id,1,4),(e1_id,2,3),(e1_id,3,5),(e1_id,4,3),(e1_id,5,4),
    (e1_id,6,3),(e1_id,7,4),(e1_id,8,3),(e1_id,9,4),
    (e1_id,10,4),(e1_id,11,3),(e1_id,12,3),(e1_id,13,3),(e1_id,14,4),
    (e1_id,15,4),(e1_id,16,4),(e1_id,17,3),(e1_id,18,4);

  -- Player 2: Jim M.  HCP 6.8  — solid, -6 net
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'Jim M.', 'JM', 6.8) returning id into e2_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e2_id,1,4),(e2_id,2,4),(e2_id,3,5),(e2_id,4,3),(e2_id,5,4),
    (e2_id,6,3),(e2_id,7,4),(e2_id,8,3),(e2_id,9,4),
    (e2_id,10,5),(e2_id,11,3),(e2_id,12,4),(e2_id,13,3),(e2_id,14,4),
    (e2_id,15,5),(e2_id,16,4),(e2_id,17,3),(e2_id,18,4);

  -- Player 3: Tom S.  HCP 9.1  — -4 net
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'Tom S.', 'TS', 9.1) returning id into e3_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e3_id,1,5),(e3_id,2,4),(e3_id,3,5),(e3_id,4,3),(e3_id,5,4),
    (e3_id,6,4),(e3_id,7,4),(e3_id,8,3),(e3_id,9,5),
    (e3_id,10,5),(e3_id,11,3),(e3_id,12,4),(e3_id,13,3),(e3_id,14,4),
    (e3_id,15,5),(e3_id,16,4),(e3_id,17,4),(e3_id,18,4);

  -- Player 4: Jack S.  HCP 8.4  — -2 net, only 9 holes (in progress)
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'Jack S.', 'JS', 8.4) returning id into e4_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e4_id,1,4),(e4_id,2,4),(e4_id,3,4),(e4_id,4,3),(e4_id,5,4),
    (e4_id,6,4),(e4_id,7,3),(e4_id,8,3),(e4_id,9,5);

  -- Player 5: C. Rivera  HCP 7.5  — even par net
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'C. Rivera', 'CR', 7.5) returning id into e5_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e5_id,1,4),(e5_id,2,4),(e5_id,3,5),(e5_id,4,4),(e5_id,5,4),
    (e5_id,6,4),(e5_id,7,4),(e5_id,8,3),(e5_id,9,5),
    (e5_id,10,5),(e5_id,11,3),(e5_id,12,4),(e5_id,13,3),(e5_id,14,5),
    (e5_id,15,5),(e5_id,16,4),(e5_id,17,4),(e5_id,18,4);

  -- Player 6: B. Walsh  HCP 12.0  — +2 net
  insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
  values (t_id, 'B. Walsh', 'BW', 12.0) returning id into e6_id;
  insert into tournament_scores (entry_id, hole_number, strokes) values
    (e6_id,1,5),(e6_id,2,4),(e6_id,3,6),(e6_id,4,4),(e6_id,5,5),
    (e6_id,6,4),(e6_id,7,4),(e6_id,8,3),(e6_id,9,5),
    (e6_id,10,5),(e6_id,11,4),(e6_id,12,4),(e6_id,13,3),(e6_id,14,5),
    (e6_id,15,5),(e6_id,16,4),(e6_id,17,4),(e6_id,18,4);

end $$;
