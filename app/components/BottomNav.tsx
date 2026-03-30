"use client"
import { useRouter, usePathname } from "next/navigation"

export default function BottomNav() {
  const router = useRouter()
  const path = usePathname()

  const tabs = [
    { id: "scorecard", label: "Scorecard", icon: "📋", href: "/scorecard" },
    { id: "gps", label: "GPS", icon: "📍", href: "/gps" },
    { id: "home", label: "Home", icon: "🏠", href: "/" },
    { id: "tournament", label: "Tournament", icon: "🏆", href: "/tournament" },
    { id: "club", label: "Club", icon: "⛳", href: "/club" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex pb-4 pt-2 z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={`flex-1 flex flex-col items-center gap-1 text-xs font-medium ${
            path === tab.href ? "text-[#152644]" : "text-gray-400"
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}