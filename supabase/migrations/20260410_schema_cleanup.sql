-- Schema cleanup: updated_at columns, better rounds format columns,
-- performance indexes, soft-delete for feed_posts, multi-tenant stub.

-- ── Timestamps ────────────────────────────────────────────────────────────────

alter table profiles add column if not exists updated_at timestamptz default now();
alter table rounds   add column if not exists updated_at timestamptz default now();

-- ── Rounds: replace encoded format string with proper columns ─────────────────
-- Old: format = 'stroke|diff:2.3'
-- New: score_format = 'stroke', differential = 2.3

alter table rounds add column if not exists score_format  text    default 'stroke';
alter table rounds add column if not exists differential  numeric;

-- Backfill differential from existing format strings like 'stroke|diff:2.3'
update rounds
set
  score_format  = 'stroke',
  differential  = case
    when format like '%diff:%'
    then cast(split_part(format, 'diff:', 2) as numeric)
    else null
  end
where format is not null;

-- ── Performance indexes ───────────────────────────────────────────────────────

create index if not exists idx_scores_round_id           on scores(round_id);
create index if not exists idx_scores_hole_id            on scores(hole_id);
create index if not exists idx_messages_channel          on messages(channel);
create index if not exists idx_rounds_profile_id         on rounds(profile_id);
create index if not exists idx_tournament_scores_entry_id on tournament_scores(entry_id);

-- ── Soft delete for feed_posts ────────────────────────────────────────────────

alter table feed_posts add column if not exists deleted_at timestamptz;

-- ── Multi-tenant stub: club_id on profiles ────────────────────────────────────
-- References courses(id) so each member can be scoped to a club.
-- Nullable for now; will be backfilled when second club is onboarded.

alter table profiles add column if not exists club_id uuid references courses(id);

-- ── Not-null constraints where data integrity requires it ─────────────────────

alter table scores alter column strokes     set not null;
alter table holes  alter column hole_number set not null;
alter table holes  alter column par         set not null;
