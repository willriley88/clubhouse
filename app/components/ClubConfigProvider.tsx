'use client'
import { createContext, useContext } from 'react'
import type { ClubConfig } from '@/lib/club-config'

const ClubConfigContext = createContext<ClubConfig | null>(null)

export function ClubConfigProvider({
  config,
  children,
}: {
  config: ClubConfig
  children: React.ReactNode
}) {
  return (
    <ClubConfigContext.Provider value={config}>
      {children}
    </ClubConfigContext.Provider>
  )
}

export function useClubConfig(): ClubConfig {
  const config = useContext(ClubConfigContext)
  if (!config) {
    throw new Error('useClubConfig must be used inside a <ClubConfigProvider>')
  }
  return config
}
