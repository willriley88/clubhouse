-- ============================================================
-- Club Config (v2) — supersedes 20260407_club_config.sql
-- Column renamed club_id → course_id for clarity.
-- If 20260407 was already applied, run the ALTER below instead.
-- ============================================================
create table if not exists club_config (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references courses(id) on delete cascade,
  club_name       text not null,
  primary_color   text not null default '#152644',
  secondary_color text not null default '#c9a84c',
  logo_path       text not null default '',
  location        text not null default '',
  unique (course_id)
);

alter table club_config enable row level security;

-- Idempotent: only add policy if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'club_config' and policyname = 'Public read club_config'
  ) then
    create policy "Public read club_config" on club_config for select using (true);
  end if;
end $$;

-- Seed LeBaron Hills CC (idempotent)
insert into club_config (course_id, club_name, primary_color, secondary_color, logo_path, location)
select id, 'LeBaron Hills CC', '#152644', '#c9a84c', '/lebaron-logo-transparent-gold.png', 'Lakeville, MA'
from courses
where name = 'LeBaron Hills CC'
limit 1
on conflict (course_id) do nothing;
