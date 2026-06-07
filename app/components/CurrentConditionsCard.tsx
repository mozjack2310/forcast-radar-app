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
  const tempRaw = nws?.temperature?.value;

  const tempVal = isImp
    ? tempRaw != null // <-- The magic fix: explicitly check for null/undefined, allowing 0
      ? Math.round((tempRaw * 9) / 5 + 32)
      : "--"
    : tempRaw != null
      ? Math.round(tempRaw)
      : "--";

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

  // 1. Extract the QC Flag (Default to 'V' if the API omits it during perfect weather)
  const tempQC = nws?.temperature?.qualityControl || "V";

  // 2. The Translation Dictionary
  const qcStatus = {
    V: {
      isValid: true,
      icon: "bg-green-500",
      pulse: "animate-pulse",
      label: "KBHM ASOS (Live & Valid)",
    },
    S: {
      isValid: false,
      icon: "bg-yellow-500",
      pulse: "",
      label: "Open-Meteo Fallback (NWS Sensor Suspect)",
    },
    Z: {
      isValid: false,
      icon: "bg-red-500",
      pulse: "",
      label: "Open-Meteo Fallback (NWS Sensor Rejected)",
    },
    X: {
      isValid: false,
      icon: "bg-red-500",
      pulse: "",
      label: "Open-Meteo Fallback (NWS Sensor Offline)",
    },
  };

  // 3. Evaluate current state (Fallback to 'X' logic if an unknown code appears)
  const health = qcStatus[tempQC as keyof typeof qcStatus] || qcStatus["X"];

  // 4. The Final Output Variables
  // If NWS is healthy, use NWS. If not, instantly swap to Open-Meteo.
  // Extract the raw NWS Celsius value and convert to Fahrenheit: (C * 9/5) + 32
  const rawNwsC = nws?.temperature?.value;
  const nwsTempF = meteo?.temperature_2m;

  // The Final Fallback (Assuming your Open-Meteo URL is returning Fahrenheit)
  let displayTemp: number | string = "--";

  if (health.isValid && rawNwsC != null) {
    // If NWS is healthy, convert its native Celsius based on the toggle
    displayTemp = isImp
      ? Math.round((rawNwsC * 9) / 5 + 32)
      : Math.round(rawNwsC);
  } else if (nwsTempF != null) {
    // If NWS fails, use Meteo and convert its native Fahrenheit based on the toggle
    displayTemp = isImp
      ? Math.round(nwsTempF)
      : Math.round(((nwsTempF - 32) * 5) / 9);
  }

  const isFallback = nwsTempF == null; // or rawNwsC == null, depending on your exact variable names above

  return (
    <div className="relative flex flex-col h-full p-6 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-900/80 dark:backdrop-blur-md border border-gray-200 dark:border-slate-800 shadow-lg transition-colors duration-300">
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
            <span
              className={`w-2 h-2 rounded-full ${isFallback ? "bg-yellow-400" : "bg-green-500 animate-pulse"}`}
            ></span>
            {isFallback
              ? "OPEN-METEO FALLBACK ACTIVE"
              : "KBHM ASOS + HRRR MODEL"}
          </p>
        </div>
      </div>

      {/* Primary Metric: Temperature */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2 gap-2">
          <div className="text-6xl font-extrabold text-gray-900 dark:text-white tracking-tighter">
            {displayTemp !== "--" ? `${displayTemp}°` : "N/A"}
          </div>
          <span className="text-xl text-gray-950 dark:text-white">
            {tempUnit}
          </span>
          <div className="w-[20%] min-w-[48px] max-w-[96px] shrink-0">
            <img
              src={nws.icon}
              className={
                "w-16 h-16 rounded-xl object-contain flex-shrink-0 border-2 ${theme.border} bg-slate-800 dark:bg-white/10 p-1 shadow-sm"
              }
              alt="Current Weather"
            />{" "}
          </div>
        </div>
        <p className="text-gray-500 text-lg capitalize">
          {nws.textDescription || "Stable"}
        </p>
      </div>

      {/* Hybrid Data Grid (Bottom aligns automatically) */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        {/* NWS Ground Truth (White/Gray Text) */}
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
            Wind
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            {windVal} {windUnit} {windDir}
          </p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
            Pressure
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            {pressVal} {pressUnit}
          </p>
        </div>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-500 text-xs font-semibold uppercase">
            Visibility
          </p>
          <p className="text-gray-500 dark:text-gray-400">
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
          <p className="text-[#00c4f5] font-medium">
            {isImp
              ? (meteo.precipitation / 25.4).toFixed(2) + " in"
              : meteo.precipitation + " mm"}
          </p>
        </div>
      </div>
    </div>
  );
}
