"use client";

import React from "react";
import { ForRadForecastPeriod } from "../../lib/types";
import { useWeatherStore } from "../../store/useWeatherStore";
import {
  fahrenheitToCelsius,
  formatForecastWindString,
} from "../../lib/telemetryMath";

interface ForecastCardProps {
  period: ForRadForecastPeriod;
}

export default function ForecastCard({ period }: ForecastCardProps) {
  const unit = useWeatherStore((state) => state.unit);
  const isImp = unit === "imperial";

  const rawTempF = period.temperature;
  const displayTemp = isImp
    ? Math.round(rawTempF)
    : Math.round(fahrenheitToCelsius(rawTempF));
  const tempUnit = isImp ? "°F" : "°C";

  const displayWindSpeed = formatForecastWindString(period.windSpeed, unit);

  const rawPop =
    typeof period.probabilityOfPrecipitation === "number"
      ? period.probabilityOfPrecipitation
      : period.probabilityOfPrecipitation?.value ?? 0;
  const popValue = rawPop ?? 0;

  return (
    <div className="relative flex flex-col justify-between h-full p-5 overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg transform-gpu will-change-transform hover:scale-[1.02] hover:shadow-xl transition-[colors,transform,shadow] duration-300">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {period.name}
            </h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`text-3xl font-black tracking-tight ${
                  period.isDaytime
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-cyan-600 dark:text-cyan-400"
                }`}
              >
                {displayTemp}
                {tempUnit}
              </span>
            </div>
          </div>

          {period.icon && (
            <div className="w-[26%] min-w-[44px] max-w-[64px] shrink-0">
              <img
                src={period.icon}
                alt={period.shortForecast}
                className="w-full h-auto rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 object-contain border border-slate-200 dark:border-slate-700/60"
              />
            </div>
          )}
        </div>

        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
          {period.shortForecast}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>WIND: {displayWindSpeed}</span>
          <span>{period.windDirection}</span>
        </div>

        {popValue > 0 && (
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full"
              style={{ width: `${Math.min(100, popValue)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
