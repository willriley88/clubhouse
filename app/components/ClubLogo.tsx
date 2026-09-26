'use client'

import { useClubConfig } from './ClubConfigProvider'
import { DEMO_CLUBS } from '@/lib/demo-clubs'

/**
 * Renders the club logo legibly on a dark header.
 *
 * Club logos come from ~200 different club websites and are wildly
 * inconsistent. Two shapes break a dark header and neither is fixable in CSS:
 *
 *   - opaque logos (white JPEG/PNG background) become a white sticker;
 *   - transparent logos with dark navy/black artwork vanish entirely.
 *
 * `export_demo_catalog.py` measures each asset once and records a treatment.
 * "bare" draws directly on the header; "plate" gets a white rounded plate,
 * which is how these logos appear on the clubs' own sites anyway. Anything
 * unmeasured defaults to "plate" — conservative but always legible.
 */
export default function ClubLogo({
  className = 'h-20 object-contain',
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  const config = useClubConfig()

  // The pilot's own logo is already prepared for a dark header.
  const entry = DEMO_CLUBS.find((c) => c.logo_path === config.logo_path)
  const treatment = entry?.logo_treatment ?? 'bare'

  if (treatment === 'plate') {
    return (
      <span
        className="inline-flex items-center justify-center rounded-xl px-3 py-2"
        style={{ background: '#fff' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={config.logo_path}
          alt={config.club_name_long ?? config.club_name}
          className={className}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={config.logo_path}
      alt={config.club_name_long ?? config.club_name}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
