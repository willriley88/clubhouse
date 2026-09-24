-- ============================================================
-- Club Config — course rating + slope for WHS handicap math
-- course_rating/course_slope: the club's default tee, used where no
-- tee is known (profile handicap calc + sparkline).
-- tee_ratings: per-tee {rating, slope} keyed by tee id, used by the
-- scorecard so differentials match the tee actually played.
-- Idempotent: safe to re-run.
-- ============================================================

alter table club_config
  add column if not exists course_rating numeric,
  add column if not exists course_slope  integer,
  add column if not exists tee_ratings   jsonb not null default '{}'::jsonb;

-- Backfill LeBaron Hills CC (Blue tees are the default)
update club_config
set
  course_rating = 73.4,
  course_slope  = 136,
  tee_ratings   = '{
    "blue":  {"rating": 73.4, "slope": 136},
    "white": {"rating": 71.2, "slope": 130},
    "green": {"rating": 69.8, "slope": 124},
    "gold":  {"rating": 68.1, "slope": 118}
  }'::jsonb
-- Match on club_name: older DBs still have the pre-rename club_id column
where club_name = 'LeBaron Hills CC';
