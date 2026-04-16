-- ============================================================
-- Club Config — one row per club, drives multi-tenant theming
-- ============================================================
create table if not exists club_config (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references courses(id) on delete cascade,
  club_name       text not null,
  primary_color   text not null default '#152644',
  secondary_color text not null default '#c9a84c',
  logo_path       text not null default '',
  location        text not null default '',
  unique (club_id)
);

alter table club_config enable row level security;
create policy "Public read club_config" on club_config for select using (true);

-- Seed LeBaron Hills CC with current brand values
insert into club_config (club_id, club_name, primary_color, secondary_color, logo_path, location)
select id, 'LeBaron Hills CC', '#152644', '#c9a84c', '/lebaron-logo-transparent-gold.png', 'Lakeville, MA'
from courses
where name = 'LeBaron Hills CC'
limit 1;
