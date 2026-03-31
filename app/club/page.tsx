import BottomNav from "../components/BottomNav"

export default function Club() {
  const teeSheet = [
    { time: "7:00 AM", players: "Sullivan, Ricci, Monroe, Chen", open: false },
    { time: "7:12 AM", players: "Walsh, Peters", open: true, spots: 2 },
    { time: "7:24 AM", players: "", open: true, spots: 4 },
    { time: "7:36 AM", players: "Kim, Torres, Adams", open: true, spots: 1 },
    { time: "7:48 AM", players: "Thompson, Lee, Burke, Grant", open: false },
  ]

  const feed = [
    { initials: "TR", name: "Tom R.", msg: "Course is in great shape today, greens rolling fast", time: "1h ago", bg: "bg-blue-100", text: "text-blue-700" },
    { initials: "Admin", name: "Club Admin", msg: "Pro shop sale this weekend — 20% off all apparel", time: "3h ago", bg: "bg-[#152644]", text: "text-[#c9a84c]" },
    { initials: "MK", name: "Mike K.", msg: "Anyone up for a game Saturday morning?", time: "Yesterday", bg: "bg-green-100", text: "text-green-700" },
  ]

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Members Only</p>
        <h1 className="text-white text-2xl font-bold">LeBaron Hills CC</h1>
        <p className="text-white/40 text-xs mt-1">Lakeville, MA · Par 72 · 6,803 yds</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Tee Times", icon: "🕐", sub: "Book online" },
            { label: "Online Ordering", icon: "🍽️", sub: "Sunset Grille" },
            { label: "Member Statements", icon: "📄", sub: "View billing" },
            { label: "Staff Info", icon: "👤", sub: "Contact staff" },
          ].map(item => (
            <button key={item.label} className="bg-white rounded-2xl p-4 text-left">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-[#152644]">{item.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Today's Tee Sheet</p>
          <div className="bg-white rounded-2xl overflow-hidden">
            {teeSheet.map((slot, i) => (
              <div key={slot.time} className={`flex items-center gap-3 px-4 py-3 ${i < teeSheet.length - 1 ? "border-b border-gray-100" : ""}`}>
                <div className="text-sm font-bold text-[#152644] w-20">{slot.time}</div>
                <div className="flex-1 text-xs text-gray-500">{slot.players || "Open"}</div>
                {slot.open ? (
                  <div className="text-xs font-semibold text-green-600">{slot.spots} open</div>
                ) : (
                  <div className="text-xs text-gray-300">Full</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Club Feed</p>
          <div className="space-y-2">
            {feed.map(item => (
              <div key={item.name} className="bg-white rounded-2xl p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.bg} ${item.text}`}>
                  {item.initials.length > 2 ? "A" : item.initials}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#152644]">{item.name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.msg}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav/>
    </main>
  )
}