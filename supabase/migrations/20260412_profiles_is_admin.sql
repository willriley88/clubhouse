-- Add is_admin flag to profiles. Defaults false.
-- Set manually in Supabase dashboard for club admins (e.g. Tom Rooney).
alter table profiles add column if not exists is_admin boolean not null default false;
