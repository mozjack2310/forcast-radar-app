"use client";

import React, { useEffect, useState } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export interface ForRadTelemetry {
  timestamp: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  wind_gusts: number;
  weather_code: number;
  visibility: number;
  uv_index: number;
  source: string;
  icon_url?: string;
  condition_text?: string;
}

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
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/telemetry/current",
        );
        if (!response.ok) throw new Error("Telemetry API unreachable");
        const data = await response.json();
        setTelemetry(data);
        setError(null);
      } catch (err: any) {
        console.error("Fetch failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Strict empty array ensures this only mounts once
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- DYNAMIC MATH CONVERSIONS ---
  // Safely handle missing NWS telemetry
  // Safely extract the value first to keep the code clean
  const tempValue = telemetry?.temperature;

  // Bulletproof type checking
  // 0. TEMPERATURE (Celsius to Fahrenheit)
  const displayTemp =
    typeof tempValue === "number" && !isNaN(tempValue)
      ? isImp
        ? Math.round(tempValue)
        : Math.round((tempValue - 32) * (5 / 9))
      : "--";
  const tempLabel = isImp ? "°F" : "°C";

  // 1. FEELS LIKE (Celsius to Fahrenheit)
  const feelslikeValue = telemetry?.feels_like;

  const displayFeelsLike =
    typeof feelslikeValue === "number" && !isNaN(feelslikeValue)
      ? isImp
        ? Math.round(feelslikeValue)
        : Math.round((feelslikeValue - 32) * (5 / 9))
      : "--";

  // 2. WIND SPEED (km/h to mph)
  const windspeedValue = telemetry?.wind_speed;

  const displayWind =
    typeof windspeedValue === "number" && !isNaN(windspeedValue)
      ? isImp
        ? Math.round(windspeedValue)
        : Math.round(windspeedValue * 1.60934)
      : "--";
  const windLabel = isImp ? "mph" : "km/h";

  // 3. WIND GUSTS (km/h to mph)
  const windgustsValue = telemetry?.wind_gusts;

  const displayWindGusts =
    typeof windgustsValue === "number" && !isNaN(windgustsValue)
      ? isImp
        ? Math.round(windgustsValue)
        : Math.round(windgustsValue * 1.60934)
      : "--";

  // 4. VISIBILITY (Meters to Miles / Kilometers)
  const visibilityValue = telemetry?.visibility;
  const displayVisibility =
    typeof visibilityValue === "number" && !isNaN(visibilityValue)
      ? isImp
        ? visibilityValue.toFixed(1) // Imperial: Miles
        : (visibilityValue * 1.60934).toFixed(1) // Metric: Kilometers
      : "--";

  const visLabel = isImp ? "mi" : "km";

  // 5. BAROMETRIC PRESSURE (Pascals to inHg / hPa)
  // Double-check if your FastAPI schema names this 'pressure' or 'barometric_pressure'
  const pressureValue = telemetry?.pressure;
  const displayPressure =
    typeof pressureValue === "number" && !isNaN(pressureValue)
      ? isImp
        ? pressureValue.toFixed(2) // Imperial: e.g., 30.06 inHg
        : (pressureValue * 33.8639).toFixed(1) // Metric: e.g., 1018.0 hPa
      : "--";

  const pressureLabel = isImp ? "inHg" : "hPa";

  // Dewpoint Math
  const tempC = telemetry ? (telemetry.temperature - 32) * (5 / 9) : 0;
  const dewpointC = telemetry ? tempC - (100 - telemetry.humidity) / 5 : 0;
  const displayDewpoint = isImp
    ? Math.round(dewpointC * (9 / 5) + 32)
    : Math.round(dewpointC);

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
            {telemetry?.source} LIVE
          </div>
        </div>

        {/* NWS Icon & Text Container */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-14 h-14 bg-slate-800/80 rounded-xl border border-slate-700/50 flex items-center justify-center shadow-inner overflow-hidden">
            {telemetry?.icon_url ? (
              <img
                src={telemetry.icon_url}
                alt={telemetry.condition_text || "Weather Conditions"}
                title={telemetry.condition_text || "Weather Conditions"}
                className="w-full h-full object-contain scale-150 drop-shadow-md cursor-help"
                loading="lazy"
                style={{
                  filter: "drop-shadow(0 0 2px rgba(0, 196, 245, 0.7))",
                }}
              />
            ) : (
              <span className="text-2xl text-slate-500">☁️</span>
            )}
          </div>

          {/* Constrained Condition Text */}
          <span
            className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider text-center w-16 truncate"
            title={telemetry?.condition_text}
          >
            {telemetry?.condition_text || "---"}
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
            {telemetry?.humidity}{" "}
            <span className="text-sm text-slate-500 font-normal">%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Dewpoint ~{displayDewpoint}°
          </div>
        </div>

        {/* Pressure */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Pressure
          </div>
          <div className="text-lg font-bold text-slate-200">
            {displayPressure}{" "}
            <span className="text-sm text-slate-500 font-normal">
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
            {displayVisibility}{" "}
            <span className="text-sm text-slate-500 font-normal">
              {visLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
