"use client";

import React, { useEffect, useState } from "react";
// Adjust this import path if your store is located elsewhere
import { useWeatherStore } from "../../store/useWeatherStore";

// We update the interface to allow either raw numbers (from a strict FastAPI Pydantic model)
// OR objects with a 'value' property (from a raw NWS JSON pass-through)
type MetricValue = number | { value: number | null } | null | undefined;

export interface ForRadTelemetry {
  timestamp?: string;
  temperature?: MetricValue;
  feelsLike?: MetricValue; // Note: NWS usually calls this apparentTemperature
  humidity?: MetricValue; // NWS uses relativeHumidity
  pressure?: MetricValue; // NWS uses barometricPressure
  windSpeed?: MetricValue;
  windDirection?: MetricValue;
  windGusts?: MetricValue;
  visibility?: MetricValue;
  source?: string;
  icon?: string; // NWS uses 'icon' for the URL
  textDescription?: string; // NWS uses 'textDescription'
}

// A robust helper function to extract the number whether it's nested or flat
const extractValue = (dataPoint: MetricValue): number | null => {
  if (dataPoint === null || dataPoint === undefined) return null;
  if (typeof dataPoint === "number") return dataPoint;
  if (
    typeof dataPoint === "object" &&
    dataPoint !== null &&
    "value" in dataPoint
  ) {
    return typeof dataPoint.value === "number" ? dataPoint.value : null;
  }
  return null;
};

export default function CurrentConditionsCard() {
  const [telemetry, setTelemetry] = useState<ForRadTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand Global Store
  const unit = useWeatherStore((state: any) => state.unit);
  const isImp = unit === "imperial";

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        // SECURITY FIX: Call the Next.js Bouncer route (relative path),
        // NOT the backend hardware directly.
        // Make sure you have an app/api/telemetry/current/route.ts set up to proxy this!
        const response = await fetch("/api/telemetry/current");
        if (!response.ok) throw new Error("Telemetry API unreachable");

        const data = await response.json();

        // Handle deeply nested Redis payloads (e.g., if FastAPI passes the whole cache object)
        let payload = data;
        if (data.currentNWS) {
          payload = data.currentNWS.properties
            ? data.currentNWS.properties
            : data.currentNWS;
        } else if (data.properties) {
          payload = data.properties;
        }

        setTelemetry(payload);
        setError(null);
      } catch (err: any) {
        console.error("Fetch failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- DYNAMIC MATH CONVERSIONS ---

  // 0. TEMPERATURE (Raw: Celsius)
  const rawTemp = extractValue(telemetry?.temperature);
  const displayTemp =
    rawTemp !== null
      ? isImp
        ? Math.round((rawTemp * 9) / 5 + 32)
        : Math.round(rawTemp)
      : "--";
  const tempLabel = isImp ? "°F" : "°C";

  // 1. FEELS LIKE (Raw: Celsius) - Fallback to normal temp if NWS doesn't provide it
  const rawFeelsLike = extractValue(telemetry?.feelsLike) ?? rawTemp;
  const displayFeelsLike =
    rawFeelsLike !== null
      ? isImp
        ? Math.round((rawFeelsLike * 9) / 5 + 32)
        : Math.round(rawFeelsLike)
      : "--";

  // 2. WIND SPEED (Raw: km/h)
  const rawWind = extractValue(telemetry?.windSpeed);
  const displayWind =
    rawWind !== null
      ? isImp
        ? Math.round(rawWind * 0.621371)
        : Math.round(rawWind)
      : "--";
  const windLabel = isImp ? "mph" : "km/h";

  // 3. WIND GUSTS (Raw: km/h)
  const rawGusts = extractValue(telemetry?.windGusts);
  const displayWindGusts =
    rawGusts !== null
      ? isImp
        ? Math.round(rawGusts * 0.621371)
        : Math.round(rawGusts)
      : "--";

  // 4. VISIBILITY (Raw: Meters)
  const rawVis = extractValue(telemetry?.visibility);
  const displayVisibility =
    rawVis !== null
      ? isImp
        ? (rawVis / 1609.34).toFixed(1)
        : (rawVis / 1000).toFixed(1)
      : "--";
  const visLabel = isImp ? "mi" : "km";

  // 5. BAROMETRIC PRESSURE (Raw: Pascals)
  const rawPressure = extractValue(telemetry?.pressure);
  const displayPressure =
    rawPressure !== null
      ? isImp
        ? (rawPressure / 3386.39).toFixed(2)
        : (rawPressure / 100).toFixed(1)
      : "--";
  const pressureLabel = isImp ? "inHg" : "hPa";

  // 6. HUMIDITY (Raw: Percent)
  const rawHumidity = extractValue(telemetry?.humidity);
  const displayHumidity = rawHumidity !== null ? Math.round(rawHumidity) : "--";

  // 7. DEWPOINT (Approximation if NWS doesn't provide it directly, but NWS usually does)
  // We'll calculate it safely just in case using simple Magnus formula approximation
  let displayDewpoint: string | number = "--";
  if (rawTemp !== null && rawHumidity !== null) {
    const dewC = rawTemp - (100 - rawHumidity) / 5;
    displayDewpoint = isImp
      ? Math.round((dewC * 9) / 5 + 32)
      : Math.round(dewC);
  }

  // --- RENDERING ---

  if (loading) {
    return (
      <div className="w-full max-w-md h-64 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-6 shadow-xl">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl text-slate-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold">Current Conditions</h2>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {telemetry?.source || "NWS LIVE"}
          </div>
        </div>

        {/* NWS Icon & Text Container */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-14 h-14 bg-slate-800/80 rounded-xl border border-slate-700/50 flex items-center justify-center shadow-inner overflow-hidden">
            {telemetry?.icon ? (
              <img
                src={telemetry.icon}
                alt={telemetry?.textDescription || "Weather Conditions"}
                title={telemetry?.textDescription || "Weather Conditions"}
                className="w-full h-full object-contain scale-150 drop-shadow-md cursor-pointer"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl text-slate-500">☁️</span>
            )}
          </div>
          <span
            className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider text-center w-16 truncate"
            title={telemetry?.textDescription}
          >
            {telemetry?.textDescription || "--"}
          </span>
        </div>
      </div>

      {/* Temperature */}
      <div className="flex items-baseline gap-2 mb-8">
        <span className="text-6xl font-black tracking-tighter">
          {displayTemp}
        </span>
        <span className="text-2xl text-slate-400 font-semibold">
          {tempLabel}
        </span>
        <span className="ml-2 text-sm text-slate-500 font-medium">
          Feels like {displayFeelsLike}
          {tempLabel}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wind */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Wind
          </div>
          <div className="text-lg font-bold text-slate-200">
            {displayWind}{" "}
            <span className="text-sm text-slate-500 font-normal">
              {windLabel}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Gusts to {displayWindGusts} {windLabel}
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Humidity
          </div>
          <div className="text-lg font-bold text-slate-200">
            {displayHumidity}
            <span className="text-sm text-slate-500 font-normal">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Dewpoint ~ {displayDewpoint}
            {tempLabel}
          </div>
        </div>

        {/* Pressure */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Pressure
          </div>
          <div className="text-lg font-bold text-slate-200">
            {displayPressure}
            <span className="text-sm text-slate-500 font-normal ml-1">
              {pressureLabel}
            </span>
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Visibility
          </div>
          <div className="text-lg font-bold text-slate-200">
            {displayVisibility}
            <span className="text-sm text-slate-500 font-normal ml-1">
              {visLabel}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800/50">
          Error mapping data: {error}
        </div>
      )}
    </div>
  );
}
