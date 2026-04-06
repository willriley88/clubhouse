import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { getClubConfig } from "@/lib/club-config"

const geist = Geist({ subsets: ["latin"] })

// generateMetadata is async so layout can pull club branding from DB.
// Pages that need ClubConfig server-side should call getClubConfig() directly.
export async function generateMetadata(): Promise<Metadata> {
  const config = await getClubConfig()
  return {
    title: config.club_name,
    description: `${config.club_name} Member App`,
    manifest: "/manifest.json",
    themeColor: config.primary_color,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: config.club_name,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/lebaron-logo-transparent-gold.png" />
      </head>
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}
