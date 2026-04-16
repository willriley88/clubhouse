-- ============================================================
-- GIN — Guest in Need requests
-- Supersedes gin_requests in 20260407_chat_gin.sql.
-- Simplified: no club_id (single-club), no filled_by column.
-- ============================================================
create table if not exists gin_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references auth.users(id) on delete cascade,
  author_name  text not null,
  tee_time     text not null,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  is_filled    boolean not null default false
);

alter table gin_requests enable row level security;

-- Authenticated users can read and post
create policy "Authenticated read gin_requests" on gin_requests for select
  using (auth.role() = 'authenticated');
create policy "Authenticated insert gin_requests" on gin_requests for insert
  with check (auth.uid() = profile_id);

-- Only the owner can mark their own request as filled
create policy "Owner update gin_requests" on gin_requests for update
  using (auth.uid() = profile_id);
