"use client";

import React from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function UnitToggle() {
  const unit = useWeatherStore((state: any) => state.unit);
  const toggleUnit = useWeatherStore((state: any) => state.toggleUnit);

  return (
    <div className="flex items-center bg-gray-900 rounded-full p-1 border border-gray-800 shadow-inner w-max">
      <button
        // Only toggle if it's currently metric and we want imperial
        onClick={() => unit !== "imperial" && toggleUnit()}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
          unit === "imperial"
            ? "bg-[#00c4f5] text-black shadow-[0_0_10px_rgba(0,196,245,0.4)]"
            : "text-gray-400 hover:text-white"
        }`}
      >
        IMP
      </button>

      <button
        // Only toggle if it's currently imperial and we want metric
        onClick={() => unit !== "metric" && toggleUnit()}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
          unit === "metric"
            ? "bg-[#00c4f5] text-black shadow-[0_0_10px_rgba(0,196,245,0.4)]"
            : "text-gray-400 hover:text-white"
        }`}
      >
        MET
      </button>
    </div>
  );
}
