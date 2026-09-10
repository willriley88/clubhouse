-- ============================================================
-- Club Config extensions — external links, course metadata, nav links
-- Adds the columns multi-club deployment needs so pages can stop
-- hardcoding LeBaron strings/URLs/PDF paths.
-- Idempotent: safe to re-run.
-- ============================================================

alter table club_config
  add column if not exists club_name_long  text,
  add column if not exists phone           text,
  add column if not exists website_url     text,
  add column if not exists tee_sheet_url   text,
  add column if not exists billing_url     text,
  add column if not exists staff_info_url  text,
  add column if not exists menu_pdf_path   text,
  add column if not exists course_par      integer,
  add column if not exists course_yardage  text,
  add column if not exists nav_links       jsonb not null default '[]'::jsonb;

-- Backfill LeBaron Hills CC with real values
update club_config
set
  club_name_long  = 'LeBaron Hills Country Club',
  phone           = '5089235712',
  website_url     = 'https://www.lebaronhills.com',
  tee_sheet_url   = 'https://lebaronhills.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23.999722222222225',
  billing_url     = 'https://secure.east.prophetservices.com/LebaronHillsBilling/',
  staff_info_url  = 'https://www.lebaronhills.com/about-us',
  menu_pdf_path   = '/lebaron-menu.pdf',
  course_par      = 72,
  course_yardage  = '6,803 yds',
  nav_links       = '[
    {"label":"Membership Info","href":"https://www.lebaronhills.com/membership"},
    {"label":"Golf Amenities","href":"https://www.lebaronhills.com/golf/golf-amenities"},
    {"label":"Golf Outings","href":"https://www.lebaronhills.com/golf/golf-outings"},
    {"label":"Course Layout","href":"https://www.lebaronhills.com/golf/course-layout"},
    {"label":"Course Gallery","href":"https://www.lebaronhills.com/golf/course-gallery"},
    {"label":"Golf Personnel","href":"https://www.lebaronhills.com/golf/golf-personnel"},
    {"label":"Contact Info","href":"https://www.lebaronhills.com/contact"}
  ]'::jsonb
where club_name = 'LeBaron Hills CC';
