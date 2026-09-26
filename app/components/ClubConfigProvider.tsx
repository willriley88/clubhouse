'use client'
import { createContext, useContext } from 'react'
import type { ClubConfig } from '@/lib/club-config'
import type { ClubTheme } from '@/lib/theme'

type ClubContextValue = { config: ClubConfig; theme: ClubTheme }

const ClubContext = createContext<ClubContextValue | null>(null)

export function ClubConfigProvider({
  config,
  theme,
  children,
}: {
  config: ClubConfig
  theme: ClubTheme
  children: React.ReactNode
}) {
  return (
    <ClubContext.Provider value={{ config, theme }}>
      {children}
    </ClubContext.Provider>
  )
}

export function useClubConfig(): ClubConfig {
  const ctx = useContext(ClubContext)
  if (!ctx) {
    throw new Error('useClubConfig must be used inside a <ClubConfigProvider>')
  }
  return ctx.config
}

/**
 * Derived, contrast-checked color tokens for the current club.
 *
 * Prefer the CSS variables (var(--club-primary) etc.) for plain styling —
 * they apply on first paint with no JS. Use this hook only where a color has
 * to be computed in JS, e.g. an inline `stroke` on an SVG icon.
 */
export function useClubTheme(): ClubTheme {
  const ctx = useContext(ClubContext)
  if (!ctx) {
    throw new Error('useClubTheme must be used inside a <ClubConfigProvider>')
  }
  return ctx.theme
}
