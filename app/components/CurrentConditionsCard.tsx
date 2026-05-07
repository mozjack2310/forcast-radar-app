// app/components/CurrentConditionsCard.tsx

import { NWSObservationResponse, OpenMeteoCurrentResponse } from "@/lib/types";

interface Props {
  nws: NWSObservationResponse["properties"];
  meteo: OpenMeteoCurrentResponse["current"];
}

// 1. Math Helpers for Unit Conversion
const toFahrenheit = (c: number | null) =>
  c ? Math.round((c * 9) / 5 + 32) : "--";
const toMph = (kmh: number | null) =>
  kmh !== null ? Math.round(kmh / 1.60934) : "--";
const toInHg = (pa: number | null) => (pa ? (pa * 0.0002953).toFixed(2) : "--");
const toMiles = (m: number | null) => (m ? (m / 1609.34).toFixed(1) : "--");

export default function CurrentConditionsCard({ nws, meteo }: Props) {
  // 2. Unpack and Convert Data
  const tempF = toFahrenheit(nws.temperature?.value);
  const windSpeed = toMph(nws.windSpeed?.value);
  const pressure = toInHg(nws.barometricPressure?.value);
  const visibility = toMiles(nws.visibility?.value);
  const toCardinal = (deg: number | null) => {
    if (deg === null) return "";
    // Divide the 360 degrees into 16 slices (22.5 degrees each)
    const val = Math.round(deg / 22.5);
    const arr = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    return arr[val % 16];
  };

  // Fallback for wind direction if it's perfectly calm
  const windDir = toCardinal(nws.windDirection?.value);

  return (
    <div className="flex flex-col h-full border border-[#00c4f5] rounded-xl p-6 bg-[#0b141a]/80 backdrop-blur-md shadow-lg relative overflow-hidden">
      {/* <div className="flex flex-col h-full border border-[#00c4f5] rounded-xl p-6 bg-[#0b141a] shadow-lg relative overflow-hidden skeleton-glass"> */}
      {/* Subtle glowing accent strip at the top */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00c4f5] to-transparent opacity-50"></div>

      {/* Header with "Heartbeat" API Indicator */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-[#00c4f5] font-bold text-xl uppercase tracking-wider">
            Live Conditions
          </h2>
          <p className="text-gray-400 text-xs mt-1 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            KBHM ASOS + HRRR Model
          </p>
        </div>
      </div>

      {/* Primary Metric: Temperature */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-bold text-white">{tempF}°</span>
          <span className="text-xl text-gray-400">F</span>
        </div>
        <p className="text-gray-300 text-lg capitalize">
          {nws.textDescription || "Stable"}
        </p>
      </div>

      {/* Hybrid Data Grid (Bottom aligns automatically) */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        {/* NWS Ground Truth (White/Gray Text) */}
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">Wind</p>
          <p className="text-gray-200">
            {windSpeed} mph {windDir}
          </p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">
            Pressure
          </p>
          <p className="text-gray-200">{pressure} inHg</p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">
            Visibility
          </p>
          <p className="text-gray-200">{visibility} mi</p>
        </div>

        {/* Open-Meteo Environmental Context (Cyan Text) */}
        <div className="border-t border-gray-800 pt-3">
          <p className="text-[#00c4f5] opacity-70 text-xs font-semibold uppercase">
            Cloud Cover
          </p>
          <p className="text-[#00c4f5] font-medium">{meteo.cloud_cover}%</p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-[#00c4f5] opacity-70 text-xs font-semibold uppercase">
            UV Index
          </p>
          <p className="text-[#00c4f5] font-medium">{meteo.uv_index}</p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-[#00c4f5] opacity-70 text-xs font-semibold uppercase">
            Precip/Hr
          </p>
          <p className="text-[#00c4f5] font-medium">{meteo.precipitation} mm</p>
        </div>
      </div>
    </div>
  );
}
