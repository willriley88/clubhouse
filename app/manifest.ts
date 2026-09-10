import type { MetadataRoute } from 'next'
import { getClubConfig } from '@/lib/club-config'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getClubConfig()
  return {
    name: config.club_name,
    short_name: config.club_name,
    description: `${config.club_name} Member App`,
    theme_color: config.primary_color,
    background_color: config.primary_color,
    display: 'standalone',
    start_url: '/',
    scope: '/',
    icons: [
      {
        src: config.logo_path,
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
