import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Clubhouse",
  description: "LeBaron Hills CC Member App",
  manifest: "/manifest.json",
  themeColor: "#152644",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clubhouse",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Apple touch icon for iOS home screen */}
        <link rel="apple-touch-icon" href="/lebaron-logo-transparent-gold.png" />
      </head>
      <body className={geist.className}>
        {children}
      </body>
    </html>
  )
}