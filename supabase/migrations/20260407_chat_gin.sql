-- ============================================================
-- Member Chat Messages
-- ============================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references auth.users(id) on delete cascade,
  club_id         uuid not null references courses(id),
  message         text not null,
  author_name     text not null,
  author_initials text not null,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;
create policy "Public read messages"   on messages for select using (true);
create policy "Authenticated insert messages" on messages for insert
  with check (auth.uid() = profile_id);

-- Enable realtime for live chat
alter publication supabase_realtime add table messages;

-- ============================================================
-- GIN — Guest in Need requests
-- ============================================================
create table if not exists gin_requests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references auth.users(id) on delete cascade,
  club_id         uuid not null references courses(id),
  tee_time        text not null,
  note            text not null default '',
  author_name     text not null,
  is_filled       boolean not null default false,
  filled_by       text,            -- display name of the member who joined
  created_at      timestamptz not null default now()
);

alter table gin_requests enable row level security;
create policy "Public read gin_requests"         on gin_requests for select using (true);
create policy "Authenticated insert gin_requests" on gin_requests for insert
  with check (auth.uid() = profile_id);
create policy "Authenticated update gin_requests" on gin_requests for update
  using (auth.role() = 'authenticated');
