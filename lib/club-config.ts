import { createSupabaseServerClient } from './supabase-server'

const COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'

export type NavLink = { label: string; href: string }
export type TeeRating = { rating: number; slope: number }

export type ClubConfig = {
  course_id: string
  club_name: string
  club_name_long: string | null
  primary_color: string
  secondary_color: string
  logo_path: string
  location: string
  phone: string | null
  website_url: string | null
  tee_sheet_url: string | null
  billing_url: string | null
  staff_info_url: string | null
  menu_pdf_path: string | null
  course_par: number | null
  course_yardage: string | null
  // Default-tee rating/slope for WHS math when the tee played is unknown
  course_rating: number
  course_slope: number
  tee_ratings: Record<string, TeeRating>
  nav_links: NavLink[]
}

// Hard-coded fallback so pages work before the migration runs or if DB is unreachable
export const DEFAULT_CONFIG: ClubConfig = {
  course_id:       COURSE_ID_FALLBACK,
  club_name:       'LeBaron Hills CC',
  club_name_long:  'LeBaron Hills Country Club',
  primary_color:   '#152644',
  secondary_color: '#c9a84c',
  logo_path:       '/lebaron-logo-transparent-gold.png',
  location:        'Lakeville, MA',
  phone:           '5089235712',
  website_url:     'https://www.lebaronhills.com',
  tee_sheet_url:   'https://lebaronhills.cps.golf/onlineresweb/search-teetime?TeeOffTimeMin=0&TeeOffTimeMax=23.999722222222225',
  billing_url:     'https://secure.east.prophetservices.com/LebaronHillsBilling/',
  staff_info_url:  'https://www.lebaronhills.com/about-us',
  menu_pdf_path:   '/lebaron-menu.pdf',
  course_par:      72,
  course_yardage:  '6,803 yds',
  course_rating:   73.4,
  course_slope:    136,
  tee_ratings: {
    blue:  { rating: 73.4, slope: 136 },
    white: { rating: 71.2, slope: 130 },
    green: { rating: 69.8, slope: 124 },
    gold:  { rating: 68.1, slope: 118 },
  },
  nav_links: [
    { label: 'Membership Info', href: 'https://www.lebaronhills.com/membership' },
    { label: 'Golf Amenities',  href: 'https://www.lebaronhills.com/golf/golf-amenities' },
    { label: 'Golf Outings',    href: 'https://www.lebaronhills.com/golf/golf-outings' },
    { label: 'Course Layout',   href: 'https://www.lebaronhills.com/golf/course-layout' },
    { label: 'Course Gallery',  href: 'https://www.lebaronhills.com/golf/course-gallery' },
    { label: 'Golf Personnel',  href: 'https://www.lebaronhills.com/golf/golf-personnel' },
    { label: 'Contact Info',    href: 'https://www.lebaronhills.com/contact' },
  ],
}

const SELECT_COLUMNS =
  'course_id, club_name, club_name_long, primary_color, secondary_color, logo_path, location, ' +
  'phone, website_url, tee_sheet_url, billing_url, staff_info_url, menu_pdf_path, ' +
  'course_par, course_yardage, course_rating, course_slope, tee_ratings, nav_links'

// Server-side fetch — call from server components / generateMetadata only.
// Pass courseId to support future multi-club deployments; omit to use LeBaron default.
export async function getClubConfig(courseId?: string): Promise<ClubConfig> {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('club_config')
      .select(SELECT_COLUMNS)
      .eq('course_id', courseId ?? COURSE_ID_FALLBACK)
      .single()
    if (!data) return DEFAULT_CONFIG
    // jsonb → typed array; treat missing/invalid as empty.
    const row = data as unknown as ClubConfig & { nav_links: unknown; tee_ratings: unknown; course_rating: unknown }
    const navLinks: NavLink[] = Array.isArray(row.nav_links) ? (row.nav_links as NavLink[]) : []
    const teeRatings = row.tee_ratings && typeof row.tee_ratings === 'object' && !Array.isArray(row.tee_ratings)
      ? (row.tee_ratings as Record<string, TeeRating>)
      : {}
    // numeric columns come back as strings from PostgREST; nulls (pre-migration rows) fall back to defaults
    return {
      ...row,
      nav_links:     navLinks,
      tee_ratings:   teeRatings,
      course_rating: row.course_rating != null ? Number(row.course_rating) : DEFAULT_CONFIG.course_rating,
      course_slope:  row.course_slope  != null ? Number(row.course_slope)  : DEFAULT_CONFIG.course_slope,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}
