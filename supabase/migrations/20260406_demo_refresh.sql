-- ============================================================
-- Demo data refresh — run this before any demo to ensure:
--   • Tee sheet shows times for today's date
--   • Tournament players all have 18 holes of realistic scores
--   • Tournament subtitle and date match today
-- ============================================================

-- ── Tee Sheet ─────────────────────────────────────────────
-- Re-seed with today's date and realistic New England member names
delete from tee_sheet;

insert into tee_sheet (tee_date, tee_time, tee_order, players, max_players) values
  (current_date, '7:00 AM',  1, 'Sullivan, O''Brien, Monroe, Ricci',  4),
  (current_date, '7:12 AM',  2, 'Walsh, Mahoney',                     4),
  (current_date, '7:24 AM',  3, '',                                   4),
  (current_date, '7:36 AM',  4, 'Kim, Torres, Connelly',              4),
  (current_date, '7:48 AM',  5, 'Thompson, Lee, Burke, Grant',        4),
  (current_date, '8:00 AM',  6, 'Flynn, Brady',                       4),
  (current_date, '8:12 AM',  7, '',                                   4),
  (current_date, '8:24 AM',  8, 'Peters, Donovan, Walsh',             4);

-- ── Tournament ────────────────────────────────────────────
-- Fix subtitle to reflect today's date (April 5–6, 2026 puts us on Day 2)
update tournaments
  set subtitle = 'LeBaron Hills CC · April 5–6, 2026 · Day 2 of 2 · 24 Players'
  where name = 'Spring Member-Guest 2026';

-- Give Jack S. a complete 18-hole round (was only 9 holes, broke the net calc)
do $$
declare
  e_id uuid;
begin
  select id into e_id
    from tournament_entries
    where player_name = 'Jack S.'
    limit 1;

  if e_id is not null then
    delete from tournament_scores where entry_id = e_id;
    -- HCP 8.4 → playing hcp 7 → gross 73 → net 66 → net_vs_par -6
    insert into tournament_scores (entry_id, hole_number, strokes) values
      (e_id, 1,4),(e_id, 2,4),(e_id, 3,5),(e_id, 4,3),(e_id, 5,4),
      (e_id, 6,4),(e_id, 7,4),(e_id, 8,3),(e_id, 9,5),
      (e_id,10,5),(e_id,11,3),(e_id,12,4),(e_id,13,3),(e_id,14,5),
      (e_id,15,5),(e_id,16,4),(e_id,17,4),(e_id,18,4);
  end if;
end $$;

-- Add two more players so the leaderboard looks full for 24-player event
do $$
declare
  t_id uuid;
  e7   uuid;
  e8   uuid;
begin
  select id into t_id from tournaments where name = 'Spring Member-Guest 2026' limit 1;

  -- Only insert if not already present (idempotent re-run)
  if not exists (select 1 from tournament_entries where tournament_id = t_id and player_name = 'P. O''Brien') then
    -- P. O'Brien HCP 5.1 → phcp 4 → gross 69 → net 65 → net_vs_par -7
    insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
      values (t_id, 'P. O''Brien', 'PO', 5.1) returning id into e7;
    insert into tournament_scores (entry_id, hole_number, strokes) values
      (e7, 1,4),(e7, 2,4),(e7, 3,5),(e7, 4,3),(e7, 5,4),
      (e7, 6,3),(e7, 7,4),(e7, 8,3),(e7, 9,4),
      (e7,10,5),(e7,11,3),(e7,12,4),(e7,13,3),(e7,14,4),
      (e7,15,5),(e7,16,4),(e7,17,3),(e7,18,4);
  end if;

  if not exists (select 1 from tournament_entries where tournament_id = t_id and player_name = 'M. Connelly') then
    -- M. Connelly HCP 11.3 → phcp 9 → gross 80 → net 71 → net_vs_par -1
    insert into tournament_entries (tournament_id, player_name, player_initials, handicap_index)
      values (t_id, 'M. Connelly', 'MC', 11.3) returning id into e8;
    insert into tournament_scores (entry_id, hole_number, strokes) values
      (e8, 1,5),(e8, 2,5),(e8, 3,6),(e8, 4,3),(e8, 5,5),
      (e8, 6,4),(e8, 7,4),(e8, 8,3),(e8, 9,5),
      (e8,10,5),(e8,11,4),(e8,12,4),(e8,13,3),(e8,14,5),
      (e8,15,6),(e8,16,5),(e8,17,4),(e8,18,4);
  end if;
end $$;
