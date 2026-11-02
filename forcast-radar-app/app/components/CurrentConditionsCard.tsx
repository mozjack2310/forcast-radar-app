"use client";

import React, { useEffect, useState } from "react";
import { ForRadTelemetry } from "../../lib/types";
import { useWeatherStore } from "../../store/useWeatherStore";
import { formatTelemetryForDisplay } from "../../lib/telemetryMath";

interface CurrentConditionsCardProps {
  initialData?: ForRadTelemetry | Record<string, any> | null;
  data?: ForRadTelemetry | Record<string, any> | null;
}

const isValidPayload = (
  obj: unknown
): obj is ForRadTelemetry | Record<string, any> => {
  if (!obj || typeof obj !== "object") return false;
  const target = "telemetry" in obj ? (obj as Record<string, any>).telemetry : obj;
  if (!target || typeof target !== "object") return false;
  return (
    target.temperature !== undefined ||
    target.temp !== undefined ||
    target.wind_speed !== undefined ||
    target.humidity !== undefined
  );
};

export default function CurrentConditionsCard({
  initialData,
  data,
}: CurrentConditionsCardProps) {
  const unit = useWeatherStore((state) => state.unit);

  // 1. Stale-While-Revalidate: Seed initial state from SSR props (instant paint)
  const [telemetry, setTelemetry] = useState<
    ForRadTelemetry | Record<string, any> | null
  >(() => {
    if (isValidPayload(initialData)) return initialData;
    if (isValidPayload(data)) return data;
    return null;
  });

  // Sync if parent SSR props change
  useEffect(() => {
    const candidate = initialData ?? data;
    if (isValidPayload(candidate)) {
      setTelemetry(candidate);
    }
  }, [initialData, data]);

  // 2. Silent Client Revalidation: Poll same-origin BFF route every 60s
  useEffect(() => {
    let isMounted = true;

    const revalidateTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (res.ok) {
          const freshJson = await res.json();
          if (isMounted && isValidPayload(freshJson)) {
            setTelemetry(freshJson);
          }
        }
      } catch {
        // Stale-While-Revalidate: Silently retain existing state on network hiccup
      }
    };

    // Revalidate after initial mount if seeded data was empty
    if (!telemetry) {
      revalidateTelemetry();
    }

    const intervalId = setInterval(revalidateTelemetry, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [telemetry]);

  // Format through canonical pure math engine
  const metrics = formatTelemetryForDisplay(telemetry, unit);

  const rawObj: Record<string, any> =
    (telemetry && typeof telemetry === "object" && "telemetry" in telemetry
      ? (telemetry as Record<string, any>).telemetry
      : telemetry) || {};
  const iconUrl = rawObj.icon_url ?? rawObj.iconUrl ?? null;

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Current Conditions
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`h-2 w-2 rounded-full ${
                metrics.isFallbackSource
                  ? "bg-amber-400"
                  : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              {metrics.sourceLabel}
            </span>
          </div>
        </div>

        {/* Fluid Weather Icon */}
        <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center p-2 shadow-sm">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={metrics.conditionText}
              className="w-full h-auto rounded-lg object-contain"
            />
          ) : (
            <span className="text-xl" role="img" aria-label="Weather condition">
              ☁️
            </span>
          )}
        </div>
      </div>

      {/* Primary Temperature Row */}
      <div className="my-5 flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
            {metrics.displayTemp}
          </span>
          <span className="text-xl font-bold text-slate-500 dark:text-slate-400">
            {metrics.tempUnitLabel}
          </span>
          <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {metrics.feelsLikeType}: {metrics.displayFeelsLike}
          </span>
        </div>
        <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400">
          {metrics.conditionText}
        </span>
      </div>

      {/* 2x2 Telemetry Sub-Grid */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
        {/* Wind */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3.5 transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Wind
          </span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {metrics.displayWind}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.displayGusts}
          </div>
        </div>

        {/* Humidity & Dewpoint */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3.5 transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Humidity
          </span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {metrics.displayHumidity}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dewpoint {metrics.displayDewpoint}
          </div>
        </div>

        {/* Barometric Pressure */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3.5 transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Pressure
          </span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {metrics.displayPressure}{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {metrics.pressureUnitLabel}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cloud Base {metrics.displayCloudBase}
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 rounded-xl p-3.5 transition-colors">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
            Visibility
          </span>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {metrics.displayVisibility}{" "}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {metrics.visibilityUnitLabel}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Aviation {metrics.displayWindKnots}
          </div>
        </div>
      </div>
    </div>
  );
}
