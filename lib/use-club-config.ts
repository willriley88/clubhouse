'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { type ClubConfig, DEFAULT_CONFIG } from './club-config'

const COURSE_ID_FALLBACK = 'b0000000-0000-0000-0000-000000000001'

// Client-side hook — mirrors getClubConfig() for use in 'use client' components.
// Starts with DEFAULT_CONFIG synchronously so pages render without a loading state.
export function useClubConfig(courseId?: string): ClubConfig {
  const [config, setConfig] = useState<ClubConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    supabase
      .from('club_config')
      .select('course_id, club_name, primary_color, secondary_color, logo_path, location')
      .eq('course_id', courseId ?? COURSE_ID_FALLBACK)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data)
      })
  }, [courseId])

  return config
}
