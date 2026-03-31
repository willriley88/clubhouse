import BottomNav from "../components/BottomNav"

export default function GPS() {
  return (
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-[#152644] px-4 pt-12 pb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Now Playing</p>
        <h1 className="text-white text-2xl font-bold">Hole 7</h1>
        <p className="text-white/40 text-xs mt-1">Par 4 · 412 yards · HCP 5</p>
      </div>

      <div className="mx-4 mt-4 bg-[#2d5a27] rounded-2xl overflow-hidden" style={{height: '220px', position: 'relative'}}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 text-xs uppercase tracking-widest">Course Map</div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          {[{ label: "Back", val: "187" }, { label: "Center", val: "212" }, { label: "Front", val: "198" }].map(d => (
            <div key={d.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center">
              <div className="text-white text-xl font-bold">{d.val}</div>
              <div className="text-white/60 text-xs">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 bg-white rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hole Layout</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Tee to Green", val: "412 yds" },
            { label: "Par", val: "4" },
            { label: "Handicap", val: "5" },
            { label: "Wind", val: "SW 8mph" },
            { label: "Elevation", val: "+12 ft" },
            { label: "Green Size", val: "Medium" },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-bold text-[#152644]">{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    <BottomNav />
  </main>
  )
}