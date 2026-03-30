import BottomNav from "../components/BottomNav"

export default function Tournament() {
  const players = [
    { pos: 1, initials: "DR", name: "Dave R.", hcp: "4.2", score: "-9", thru: "F+18", bg: "bg-green-100", text: "text-green-700" },
    { pos: 2, initials: "JM", name: "Jim M.", hcp: "6.8", score: "-6", thru: "F+18", bg: "bg-orange-100", text: "text-orange-700" },
    { pos: 3, initials: "TS", name: "Tom S.", hcp: "9.1", score: "-4", thru: "F+18", bg: "bg-gray-100", text: "text-gray-600" },
    { pos: 4, initials: "JS", name: "Jack S. (you)", hcp: "8.4", score: "-2", thru: "9", bg: "bg-blue-100", text: "text-blue-700", you: true },
    { pos: 5, initials: "CR", name: "C. Rivera", hcp: "7.5", score: "E", thru: "F+18", bg: "bg-gray-100", text: "text-gray-600" },
    { pos: 6, initials: "BW", name: "B. Walsh", hcp: "12.0", score: "+2", thru: "F+18", bg: "bg-gray-100", text: "text-gray-600" },
    { pos: 7, initials: "PL", name: "P. Lee", hcp: "10.5", score: "+3", thru: "F+18", bg: "bg-gray-100", text: "text-gray-600" },
    { pos: 8, initials: "MK", name: "M. Kim", hcp: "14.2", score: "+5", thru: "F+18", bg: "bg-gray-100", text: "text-gray-600" },
  ]

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">LeBaron Hills CC</p>
        <h1 className="text-white text-2xl font-bold">Member-Guest Classic</h1>
        <p className="text-white/40 text-xs mt-1">June 14–16 · Day 2 of 3 · 67 Players</p>
        <div className="inline-flex items-center gap-1.5 bg-[#c9a84c]/15 border border-[#c9a84c]/30 rounded-full px-3 py-1 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]"></div>
          <span className="text-[#c9a84c] text-xs font-semibold">Live</span>
        </div>
        <div className="flex gap-1 mt-3 bg-white/5 rounded-lg p-1">
          {["Overall", "Today", "Stableford"].map((t, i) => (
            <button key={t} className={`flex-1 text-xs py-1.5 rounded-md font-medium ${i === 0 ? "bg-white/15 text-white" : "text-white/40"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
        {players.map((p, i) => (
          <div key={p.pos} className={`flex items-center gap-3 px-4 py-3 ${i < players.length - 1 ? "border-b border-gray-100" : ""} ${p.you ? "bg-blue-50" : ""}`}>
            <div className={`text-sm font-bold w-5 text-center ${p.pos === 1 ? "text-[#c9a84c]" : p.pos === 2 ? "text-gray-400" : p.pos === 3 ? "text-amber-700" : "text-gray-300"}`}>
              {p.pos}
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.bg} ${p.text}`}>
              {p.initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#152644]">{p.name}</p>
              <p className="text-xs text-gray-400">HCP {p.hcp}</p>
            </div>
            <div className="text-right">
              <p className={`text-base font-bold ${p.score.startsWith("-") ? "text-green-600" : p.score === "E" ? "text-[#152644]" : "text-red-500"}`}>
                {p.score}
              </p>
              <p className="text-xs text-gray-400">{p.thru}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}