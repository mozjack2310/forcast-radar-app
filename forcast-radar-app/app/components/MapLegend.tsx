import { useState } from "react";

export default function MapLegend() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-xl overflow-hidden transition-all duration-200 ease-in-out select-none"
      onPointerDown={(e) => e.stopPropagation()} // Prevents map drag when interacting with the legend
    >
      {/* Header / Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-slate-800/50 flex justify-between items-center gap-6 border-b border-slate-700/40 text-left text-xs font-black uppercase tracking-wider text-slate-200 hover:bg-slate-800/80 transition-colors"
      >
        <span>📊 Map Legend</span>
        <span className="text-slate-400 font-mono text-[10px]">
          {isOpen ? "HIDE ▲" : "SHOW ▼"}
        </span>
      </button>

      {/* Legend Content */}
      <div
        className={`transition-all duration-300 ${isOpen ? "max-h-[400px] p-4" : "max-h-0 overflow-hidden"}`}
      >
        <div className="flex flex-col gap-4 w-48 md:w-56">
          {/* Section 1: Threat Vectors */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
              Threat Vectors
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
                <span className="w-4 h-3 bg-red-600/30 border border-red-500 rounded-sm"></span>
                <span>Severe Warning</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
                <span className="w-4 h-3 bg-orange-500/30 border border-orange-400 rounded-sm"></span>
                <span>Weather Statement</span>
              </div>
            </div>
          </div>

          {/* Section 2: Radar Intensity (dBZ) */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1">
              Radar Reflectivity
            </h4>
            <div className="flex flex-col gap-1">
              {/* dBZ Color Gradient Bar */}
              <div
                className="w-full h-2.5 rounded-sm shadow-inner"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #22c55e, #facc15, #ef4444, #9333ea)",
                }}
              ></div>
              {/* dBZ Scale Labels */}
              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 px-0.5 mt-0.5">
                <span>Light</span>
                <span>Mod</span>
                <span>Heavy</span>
                <span>Hail</span>
              </div>
            </div>

            {/* Context Metrics */}
            <div className="mt-3 bg-slate-950/40 border border-slate-800/60 rounded-md p-2 text-[10px] font-medium text-slate-400 leading-normal">
              📡{" "}
              <span className="font-semibold text-slate-300">
                Base Reflectivity:
              </span>{" "}
              Updates dynamically via live NEXRAD streaming data nodes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
