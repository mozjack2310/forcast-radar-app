"use client";

import { useUnits } from "../context/UnitContext";

export default function UnitToggle() {
  const { system, toggleSystem } = useUnits();

  return (
    <div className="flex items-center bg-gray-900 rounded-full p-1 border border-gray-800 shadow-inner w-max">
      <button
        onClick={() => system !== "imperial" && toggleSystem()}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
          system === "imperial"
            ? "bg-[#00c4f5] text-black shadow-[0_0_10px_rgba(0,196,245,0.4)]"
            : "text-gray-400 hover:text-white"
        }`}
      >
        IMP
      </button>
      <button
        onClick={() => system !== "metric" && toggleSystem()}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
          system === "metric"
            ? "bg-[#00c4f5] text-black shadow-[0_0_10px_rgba(0,196,245,0.4)]"
            : "text-gray-400 hover:text-white"
        }`}
      >
        MET
      </button>
    </div>
  );
}
