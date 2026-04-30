-- Extends club_config with universal link columns and a nav_links jsonb column.
-- Schema rule: well-known universal links get dedicated columns so queries are
-- typed and indexable; variable per-club marketing nav lives in nav_links jsonb.
ALTER TABLE club_config
  ADD COLUMN IF NOT EXISTS tee_sheet_url  text,
  ADD COLUMN IF NOT EXISTS billing_url    text,
  ADD COLUMN IF NOT EXISTS staff_info_url text,
  ADD COLUMN IF NOT EXISTS website_url    text,
  ADD COLUMN IF NOT EXISTS menu_pdf_path  text,
  ADD COLUMN IF NOT EXISTS nav_links      jsonb DEFAULT '[]'::jsonb;

-- Seed LeBaron Hills CC with known values
UPDATE club_config
SET
  tee_sheet_url  = 'https://www.cpsgolf.com/cps-golf/pub/teesheet/index.html',
  billing_url    = 'https://prophetsystems.com',
  staff_info_url = 'https://www.lebaronhills.com/about-us',
  website_url    = 'https://www.lebaronhills.com',
  menu_pdf_path  = '/lebaron-menu.pdf',
  nav_links      = '[]'::jsonb
WHERE course_id = 'b0000000-0000-0000-0000-000000000001';
