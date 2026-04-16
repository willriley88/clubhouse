-- ============================================================
-- Member Chat Messages
-- Supersedes the messages table in 20260407_chat_gin.sql.
-- No club_id — single-club for now; add it when multi-tenant routing is needed.
-- ============================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references auth.users(id) on delete cascade,
  author_name     text not null,
  author_initials text not null,
  message         text not null,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;

-- Authenticated users can read and post; no anonymous access to chat
create policy "Authenticated read messages" on messages for select
  using (auth.role() = 'authenticated');
create policy "Authenticated insert messages" on messages for insert
  with check (auth.uid() = profile_id);

-- Enable Realtime so channel.on('postgres_changes') works
alter publication supabase_realtime add table messages;
