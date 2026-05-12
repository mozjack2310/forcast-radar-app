"use client";

import { NWSObservationResponse, OpenMeteoCurrentResponse } from "@/lib/types";
import { useUnits } from "../context/UnitContext";

interface Props {
  nws: NWSObservationResponse["properties"];
  meteo: OpenMeteoCurrentResponse["current"];
}

export default function CurrentConditionsCard({ nws, meteo }: Props) {
  // 1. Hook into the global context
  const { system } = useUnits();
  const isImp = system === "imperial";

  // 2. Unpack and Convert Data
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

  // 3. Dynamic Math based on Context State

  // NWS Temp is natively Celsius
  const tempRaw = nws.temperature?.value;
  const tempVal = isImp
    ? tempRaw
      ? Math.round((tempRaw * 9) / 5 + 32)
      : "--"
    : Math.round(tempRaw || 0);
  const tempUnit = isImp ? "F" : "C";

  // NWS Wind is natively km/h
  const windRaw = nws.windSpeed?.value;
  const windVal = isImp
    ? windRaw !== null
      ? Math.round(windRaw / 1.60934)
      : "--"
    : Math.round(windRaw || 0);
  const windUnit = isImp ? "mph" : "km/h";

  // NWS Pressure is natively Pascals
  const pressRaw = nws.barometricPressure?.value;
  const pressVal = isImp
    ? pressRaw
      ? (pressRaw * 0.0002953).toFixed(2)
      : "--"
    : pressRaw
      ? (pressRaw / 100).toFixed(1)
      : "--"; // Convert Pa to hPa for Metric
  const pressUnit = isImp ? "inHg" : "hPa";

  // Visibility (NWS provides Meters natively)
  const visRaw = nws.visibility?.value;
  // Imperial: Meters to Miles (/ 1609.34) | Metric: Meters to Kilometers (/ 1000)
  const visVal = isImp
    ? visRaw
      ? (visRaw / 1609.34).toFixed(1)
      : "--"
    : visRaw
      ? (visRaw / 1000).toFixed(1)
      : "--";
  const visUnit = isImp ? "mi" : "km";

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
        <div className="flex justify-between items-baseline mb-2 gap-2">
          <span className="text-6xl font-bold text-white">{tempVal}°</span>
          <span className="text-xl text-gray-400">{tempUnit}</span>
          <div>
            <img
              src={nws.icon}
              className="w-20 h-20 rounded-full bg-white/10 p-2 shadow-lg object-contain"
              alt="Current Weather"
            />{" "}
          </div>
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
            {windVal} {windUnit} {windDir}
          </p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">
            Pressure
          </p>
          <p className="text-gray-200">
            {pressVal} {pressUnit}
          </p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">
            Visibility
          </p>
          <p className="text-gray-200">
            {visVal} {visUnit}
          </p>
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
