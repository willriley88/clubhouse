import { createSupabaseServerClient } from './supabase-server'

const COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'

export type ClubConfig = {
  course_id: string
  club_name: string
  primary_color: string
  secondary_color: string
  logo_path: string
  location: string
}

// Hard-coded fallback so pages work before the migration runs or if DB is unreachable
export const DEFAULT_CONFIG: ClubConfig = {
  course_id:       COURSE_ID_FALLBACK,
  club_name:       'LeBaron Hills CC',
  primary_color:   '#152644',
  secondary_color: '#c9a84c',
  logo_path:       '/lebaron-logo-transparent-gold.png',
  location:        'Lakeville, MA',
}

// Server-side fetch — call from server components / generateMetadata only.
// Pass courseId to support future multi-club deployments; omit to use LeBaron default.
export async function getClubConfig(courseId?: string): Promise<ClubConfig> {
  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from('club_config')
      .select('course_id, club_name, primary_color, secondary_color, logo_path, location')
      .eq('course_id', courseId ?? COURSE_ID_FALLBACK)
      .single()
    return data ?? DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}
