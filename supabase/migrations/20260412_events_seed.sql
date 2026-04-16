-- Seed real LeBaron Hills CC event data.
-- Clears placeholder rows inserted during initial schema creation.

delete from events;

insert into events (title, type, start_date, description) values
  ('Cinco De Mayo Tournament presented by SCBA', 'tournament', '2025-05-19', 'Annual club tournament presented by SCBA'),
  ('8th Annual The S.E.A.L. Foundation Golf Tournament', 'hosting', '2026-06-08', 'Charity tournament benefiting The S.E.A.L. Foundation'),
  ('Mass Amateur Qualifying', 'hosting', '2025-06-18', 'USGA Mass Amateur Qualifying event hosted at LeBaron Hills CC'),
  ('Mass Golf Member Day', 'member', '2025-07-23', 'Stableford format member day event'),
  ('NEPGA Junior Tour', 'hosting', '2026-07-28', 'NEPGA Junior Tour event hosted at LeBaron Hills CC'),
  ('Mass Golf Father Daughter Modified Scotch', 'hosting', '2026-08-19', 'Mass Golf Father Daughter event in Modified Scotch format');
