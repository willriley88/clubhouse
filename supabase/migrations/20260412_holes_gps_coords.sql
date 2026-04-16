-- Add GPS coordinate columns to holes table for in-app distance calculations.
-- All values are decimal degrees (WGS84). Nullable so existing clubs without
-- coordinates still work — GPS page shows a "no GPS data" state when null.

alter table holes add column if not exists front_lat  double precision;
alter table holes add column if not exists front_lng  double precision;
alter table holes add column if not exists center_lat double precision;
alter table holes add column if not exists center_lng double precision;
alter table holes add column if not exists back_lat   double precision;
alter table holes add column if not exists back_lng   double precision;

-- ── Seed LeBaron Hills CC coordinates ────────────────────────────────────────
-- Real Google Earth coordinates recorded April 2026. Accuracy verified.
-- Uses hole_number + course JOIN so the UUID doesn't need to be hardcoded.

do $$
declare
  cid uuid;
begin
  select id into cid from courses where name = 'LeBaron Hills CC';
  if cid is null then return; end if;

  update holes set front_lat=41.867697,front_lng=-70.971383,center_lat=41.867797,center_lng=-70.971508,back_lat=41.867936,back_lng=-70.971600 where course_id=cid and hole_number=1;
  update holes set front_lat=41.864986,front_lng=-70.970867,center_lat=41.864839,center_lng=-70.970825,back_lat=41.864706,back_lng=-70.970792 where course_id=cid and hole_number=2;
  update holes set front_lat=41.864836,front_lng=-70.976917,center_lat=41.864853,center_lng=-70.977097,back_lat=41.864842,back_lng=-70.977286 where course_id=cid and hole_number=3;
  update holes set front_lat=41.864075,front_lng=-70.977450,center_lat=41.863950,center_lng=-70.977344,back_lat=41.863822,back_lng=-70.977278 where course_id=cid and hole_number=4;
  update holes set front_lat=41.864783,front_lng=-70.974394,center_lat=41.864786,center_lng=-70.974219,back_lat=41.864764,back_lng=-70.974050 where course_id=cid and hole_number=5;
  update holes set front_lat=41.864553,front_lng=-70.970222,center_lat=41.864586,center_lng=-70.970028,back_lat=41.864642,back_lng=-70.969875 where course_id=cid and hole_number=6;
  update holes set front_lat=41.862283,front_lng=-70.973144,center_lat=41.862183,center_lng=-70.973283,back_lat=41.862072,back_lng=-70.973439 where course_id=cid and hole_number=7;
  update holes set front_lat=41.862056,front_lng=-70.971875,center_lat=41.862122,center_lng=-70.971731,back_lat=41.862189,back_lng=-70.971600 where course_id=cid and hole_number=8;
  update holes set front_lat=41.864964,front_lng=-70.967597,center_lat=41.865125,center_lng=-70.967528,back_lat=41.865319,back_lng=-70.967367 where course_id=cid and hole_number=9;
  update holes set front_lat=41.867694,front_lng=-70.971386,center_lat=41.867794,center_lng=-70.971517,back_lat=41.867933,back_lng=-70.971589 where course_id=cid and hole_number=10;
  update holes set front_lat=41.869186,front_lng=-70.971058,center_lat=41.869261,center_lng=-70.971031,back_lat=41.869356,back_lng=-70.970978 where course_id=cid and hole_number=11;
  update holes set front_lat=41.870008,front_lng=-70.974719,center_lat=41.870022,center_lng=-70.974864,back_lat=41.870050,back_lng=-70.975039 where course_id=cid and hole_number=12;
  update holes set front_lat=41.868889,front_lng=-70.974828,center_lat=41.868783,center_lng=-70.974731,back_lat=41.868678,back_lng=-70.974653 where course_id=cid and hole_number=13;
  update holes set front_lat=41.865967,front_lng=-70.973314,center_lat=41.865831,center_lng=-70.973233,back_lat=41.865708,back_lng=-70.973169 where course_id=cid and hole_number=14;
  update holes set front_lat=41.869525,front_lng=-70.971594,center_lat=41.869653,center_lng=-70.971486,back_lat=41.869775,back_lng=-70.971381 where course_id=cid and hole_number=15;
  update holes set front_lat=41.872186,front_lng=-70.971897,center_lat=41.872286,center_lng=-70.971886,back_lat=41.872406,back_lng=-70.971867 where course_id=cid and hole_number=16;
  update holes set front_lat=41.870061,front_lng=-70.969208,center_lat=41.869914,center_lng=-70.969214,back_lat=41.869828,back_lng=-70.969161 where course_id=cid and hole_number=17;
  update holes set front_lat=41.865953,front_lng=-70.967200,center_lat=41.865853,center_lng=-70.967044,back_lat=41.865739,back_lng=-70.966900 where course_id=cid and hole_number=18;
end;
$$;
