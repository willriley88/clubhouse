import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"
import { resolveClubConfig } from "@/lib/club-config"
import { buildTheme, themeCssVars } from "@/lib/theme"
import { ClubConfigProvider } from "./components/ClubConfigProvider"
import DemoBar from "./components/DemoBar"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

/** Set by proxy.ts from `?club=<slug>`. See lib/demo-clubs.ts. */
const DEMO_COOKIE = 'clubhouse_demo_club'

async function currentClub() {
  const store = await cookies()
  return resolveClubConfig(store.get(DEMO_COOKIE)?.value)
}

// themeColor must live in viewport export, not metadata — Next.js 15+ warns
// if themeColor is placed in generateMetadata.
export async function generateViewport(): Promise<Viewport> {
  const { config } = await currentClub()
  const theme = buildTheme(config.primary_color, config.secondary_color)
  // viewportFit:'cover' is required for env(safe-area-inset-*) to work on iPhone.
  // Using the *derived* primary (not the raw DB value) keeps the iOS status bar
  // matched to the header even when the scraped brand color was too light.
  return {
    themeColor: theme.primary,
    viewportFit: 'cover',
    width: 'device-width',
    initialScale: 1,
    // Members use this one-handed on a course in bright sun; let them zoom.
    maximumScale: 5,
  }
}

// generateMetadata is async so layout can pull club branding from DB.
// Pages that need ClubConfig server-side should call getClubConfig() directly.
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await currentClub()
  const name = config.club_name_long ?? config.club_name
  return {
    title: {
      default: `${config.club_name} · Member App`,
      template: `%s · ${config.club_name}`,
    },
    description: `Tee times, GPS yardages, live scoring, events and club news for members of ${name}.`,
    manifest: "/manifest.webmanifest",
    applicationName: config.club_name,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: config.club_name,
    },
    formatDetection: { telephone: false },
    openGraph: {
      title: `${config.club_name} Member App`,
      description: `The member app for ${name}.`,
      type: "website",
    },
    // A member app is private by nature; keep it out of search results.
    robots: { index: false, follow: false },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { config, isDemo, demoSlug } = await currentClub()
  const theme = buildTheme(config.primary_color, config.secondary_color)

  // Applied as inline custom properties on <html> so every component —
  // server or client — reads the same values on first paint. No flash of
  // pilot-club colors, no hydration mismatch.
  const cssVars = themeCssVars(theme) as React.CSSProperties

  return (
    <html lang="en" style={cssVars}>
      <head>
        <link rel="apple-touch-icon" href={config.logo_path} />
      </head>
      <body className={geist.className}>
        <ClubConfigProvider config={config} theme={theme}>
          {children}
          {isDemo && <DemoBar slug={demoSlug!} clubName={config.club_name} />}
        </ClubConfigProvider>
      </body>
    </html>
  )
}
