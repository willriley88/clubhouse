import BottomNav from "../components/BottomNav"

export default function Scorecard() {
  const holes = [
    { hole: 1, par: 4, yds: 424, score: null },
    { hole: 2, par: 4, yds: 415, score: null },
    { hole: 3, par: 5, yds: 543, score: null },
    { hole: 4, par: 3, yds: 183, score: null },
    { hole: 5, par: 4, yds: 380, score: null },
    { hole: 6, par: 4, yds: 438, score: null },
    { hole: 7, par: 4, yds: 412, score: null },
    { hole: 8, par: 3, yds: 178, score: null },
    { hole: 9, par: 5, yds: 521, score: null },
  ]

  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Round in Progress</p>
        <h1 className="text-white text-2xl font-bold">LeBaron Hills CC</h1>
        <p className="text-white/40 text-xs mt-1">White Tees · Par 72 · 6,392 yds</p>
        <div className="flex gap-4 mt-3">
          {[{ val: "—", key: "Score" }, { val: "—", key: "To Par" }, { val: "0", key: "Holes" }].map(s => (
            <div key={s.key} className="text-center">
              <div className="text-white text-xl font-bold">{s.val}</div>
              <div className="text-white/40 text-xs">{s.key}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {["Hole", "Par", "Yds", "Score"].map(h => (
            <div key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">{h}</div>
          ))}
        </div>
        {holes.map((h, i) => (
          <div key={h.hole} className={`grid grid-cols-4 px-4 py-3 items-center ${i < holes.length - 1 ? "border-b border-gray-100" : ""}`}>
            <div className="text-sm font-bold text-[#152644] text-center">{h.hole}</div>
            <div className="text-sm text-gray-500 text-center">{h.par}</div>
            <div className="text-sm text-gray-400 text-center">{h.yds}</div>
            <div className="flex justify-center">
              <div className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
                —
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </main>
  )
}