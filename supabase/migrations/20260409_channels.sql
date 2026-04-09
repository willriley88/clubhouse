-- ============================================================
-- Channels — add channel column to messages table
-- Run after 20260409_chat.sql
-- ============================================================
alter table messages add column if not exists channel text not null default 'general';

create index if not exists messages_channel_idx on messages(channel);
