-- Fix hole 10 GPS coordinates at LeBaron Hills CC.
--
-- BUG: 20260412_holes_gps_coords.sql set hole 10's front/center/back to hole 1's
-- values (0.4-1.0 m apart on all three points — a copy-paste when the coords were
-- hand-recorded in Google Earth). Hole 10 is a 490-yard par 5 whose green sits
-- ~110 m northwest of hole 1's green, so the GPS page was showing a member
-- yardage to the WRONG GREEN on hole 10, off by about 120 yards.
--
-- Detected 2026-09-27 by cross-validating all 18 hand-recorded greens against
-- OpenStreetMap `golf=green` polygons for the course. The other 17 holes agreed
-- to a median of 2.4 m (max 8.8 m), which is inside hand-placement error; hole 10
-- was the lone 111 m outlier. The same duplicate exists in app/gps/page.tsx's
-- HOLES constant and is fixed in that file too.
--
-- Values below are derived from the OSM green polygon (34 vertices), projected
-- onto the tee->green approach bearing of 322 deg: front = nearest vertex to the
-- tee, back = farthest, center = polygon centroid. Resulting green depth 33 yd,
-- consistent with the 28-40 yd range measured across the other 17 greens.

do $$
declare
  cid uuid;
begin
  select id into cid from courses where name = 'LeBaron Hills CC';
  if cid is null then return; end if;

  update holes
     set front_lat  = 41.868556, front_lng  = -70.970856,
         center_lat = 41.868697, center_lng = -70.970952,
         back_lat   = 41.868804, back_lng   = -70.971023
   where course_id = cid
     and hole_number = 10;
end;
$$;
