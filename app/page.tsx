"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import BottomNav from "./components/BottomNav"

export default function Home() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (splash) {
    return (
      <main className="min-h-screen bg-[#152644] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/lebaron-logo-transparent.png"
            alt="LeBaron Hills Country Club"
            width={280}
            height={140}
            priority
          />
          <div className="flex gap-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-[#c9a84c]"></div>
            <div className="w-2 h-2 rounded-full bg-[#c9a84c] opacity-40"></div>
            <div className="w-2 h-2 rounded-full bg-[#c9a84c] opacity-20"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-white/50 text-lg">☰</div>
          <div className="text-white/30 text-xs tracking-widest uppercase">LeBaron Hills CC</div>
          <div className="w-8 h-8 rounded-full bg-[#c9a84c] flex items-center justify-center text-[#0a1628] text-xs font-bold">JS</div>
        </div>

        <div className="bg-white/8 border border-white/10 rounded-2xl p-4" style={{background: 'rgba(255,255,255,0.07)'}}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-white text-xl font-bold">Jack Sullivan</div>
              <div className="text-white/40 text-xs mt-0.5">Member · LeBaron Hills CC</div>
            </div>
            <div className="bg-[#c9a84c]/15 border border-[#c9a84c]/30 rounded-xl px-3 py-2 text-center">
              <div className="text-[#c9a84c] text-xl font-bold leading-none">8.4</div>
              <div className="text-[#c9a84c]/60 text-xs mt-0.5 uppercase tracking-wide">HCP</div>
            </div>
          </div>
          <div className="border-t border-white/8 mt-3 pt-3 flex justify-around" style={{borderColor: 'rgba(255,255,255,0.08)'}}>
            {[
              { val: "24", key: "Rounds" },
              { val: "79.2", key: "Avg Score" },
              { val: "76", key: "Best" },
            ].map((s) => (
              <div key={s.key} className="text-center">
                <div className="text-white text-base font-semibold">{s.val}</div>
                <div className="text-white/35 text-xs mt-0.5">{s.key}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Last Round</p>
          <div className="bg-white rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#152644] mb-3">LeBaron Hills CC · Jun 12 · White Tees</p>
            <div className="flex gap-1 mb-2">
              {[
                { score: 5, type: "bogey" },
                { score: 2, type: "birdie" },
                { score: 5, type: "par" },
                { score: 6, type: "double" },
                { score: 4, type: "par" },
                { score: 2, type: "birdie" },
                { score: 3, type: "eagle" },
                { score: 5, type: "par" },
                { score: 5, type: "bogey" },
              ].map((h, i) => (
                <div key={i} className={`flex-1 text-center text-xs font-bold py-1 rounded
                  ${h.type === "eagle" ? "bg-[#152644] text-[#c9a84c]" : ""}
                  ${h.type === "birdie" ? "bg-green-100 text-green-700" : ""}
                  ${h.type === "par" ? "bg-gray-100 text-gray-500" : ""}
                  ${h.type === "bogey" ? "bg-orange-50 text-orange-600" : ""}
                  ${h.type === "double" ? "bg-red-50 text-red-600" : ""}
                `}>
                  {h.score}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">82 gross · Net 74</span>
              <span className="font-semibold text-[#152644]">+10</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Upcoming</p>
          <div className="bg-[#152644] rounded-2xl p-4 relative overflow-hidden">
            <p className="text-white/40 text-xs uppercase tracking-widest">Club Tournament</p>
            <p className="text-white text-lg font-bold mt-1">Member-Guest Classic</p>
            <p className="text-white/40 text-xs mt-1">June 14–16 · Stroke + Stableford</p>
            <button className="mt-3 bg-[#c9a84c] text-[#0a1628] text-xs font-bold px-4 py-2 rounded-full">
              View Leaderboard →
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Club Feed</p>
          <div className="space-y-3">
            {[
              { initials: "TR", name: "Tom R.", action: "shot a 76 — best round of the season", time: "2h ago", bg: "bg-blue-100", text: "text-blue-700" },
              { initials: "MK", name: "Mike K.", action: "eagled hole 14 🦅", time: "Yesterday", bg: "bg-green-100", text: "text-green-700" },
              { initials: "SP", name: "Sara P.", action: "dropped to 12.1 handicap — new low!", time: "2 days ago", bg: "bg-orange-100", text: "text-orange-700" },
            ].map((item) => (
              <div key={item.name} className="flex gap-3 items-start bg-white rounded-xl p-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.bg} ${item.text}`}>
                  {item.initials}
                </div>
                <div>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{item.name}</span> {item.action}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}