"use client";

import { NWSForecastPeriod, NWSForecastResponse } from "@/lib/types";
import { useUnits } from "../context/UnitContext";
import React from "react";
import { formatForecastWind } from "@/lib/utils";

interface ForecastCardProps {
  period: NWSForecastResponse["properties"]["periods"][number];
}

// This function maps the precipitation chance to a specific color, creating a gradient effect that intensifies as the chance increases. The thresholds are designed to provide a clear visual distinction between different levels of precipitation risk, making it easier for users to quickly assess the forecast at a glance.
// function getPrecipColor(chance: number | null) {
//   if (!chance || chance === 0) return "#d6d3d1"; // Neutral Sand (0%)
//   if (chance < 30) return "#86efac"; // Light Mint Green (1-29%)
//   if (chance < 70) return "#22c55e"; // Vibrant Green (30-69%)
//   return "#14532d"; // Deep Forest Green (70%+)
// }

// This acts as your color scale for the precipitation bar, giving a visual cue that intensifies as the chance increases. You can adjust the thresholds and colors to better fit your design preferences.

function getPrecipColor(chance: number | null) {
  if (!chance || chance === 0) return "#d6d3d1"; // 0%: Neutral Sand (Stone-300)
  if (chance < 10) return "#dcfce7"; // 1-9%: Extremely faint green (Green-100)
  if (chance < 20) return "#bbf7d0"; // 10-19%: Pale mint (Green-200)
  if (chance < 30) return "#86efac"; // 20-29%: Light green (Green-300)
  if (chance < 40) return "#4ade80"; // 30-39%: Bright green (Green-400)
  if (chance < 50) return "#22c55e"; // 40-49%: Solid standard green (Green-500)
  if (chance < 60) return "#16a34a"; // 50-59%: Deepening green (Green-600)
  if (chance < 70) return "#15803d"; // 60-69%: Forest green (Green-700)
  if (chance < 80) return "#166534"; // 70-79%: Dark forest (Green-800)
  if (chance < 90) return "#14532d"; // 80-89%: Very dark green (Green-900)
  return "#06b6d4"; // 90-100%: Almost black-green (Green-950)
}

function getWeatherTheme(forecast: string | undefined | null) {
  // If the API drops the string, fail gracefully to the default dark theme
  if (!forecast) {
    return {
      bg: "bg-[#0b1014]",
      border: "border-gray-800",
      title: "text-[#00c4f5]",
      temp: "text-[#21e2d2]",
    };
  }

  const lower = forecast.toLowerCase();

  if (
    lower.includes("rain") ||
    lower.includes("shower") ||
    lower.includes("storm") ||
    lower.includes("thunder")
  ) {
    return {
      bg: "bg-[#0b141a]",
      border: "border-[#00c4f5]",
      title: "text-[#00c4f5]",
      temp: "text-[#66d9ef]",
    };
  }

  if (lower.includes("sun") || lower.includes("clear")) {
    return {
      bg: "bg-[#1a150b]",
      border: "border-[#ffd866]",
      title: "text-[#ffd866]",
      temp: "text-[#fd971f]",
    };
  }

  if (lower.includes("cloud") || lower.includes("overcast")) {
    return {
      bg: "bg-[#141618]",
      border: "border-slate-200",
      title: "text-gray-300",
      temp: "text-gray-400",
    };
  }

  return {
    bg: "bg-[#0b1014]",
    border: "border-gray-800",
    title: "text-[#00c4f5]",
    temp: "text-[#21e2d2]",
  };
}

export default function ForecastCard({ period }: ForecastCardProps) {
  const { system } = useUnits();
  const isImp = system === "imperial";

  // NWS Forecast gives Fahrenheit by default.
  const tempF = period.temperature;
  const displayTemp = isImp ? tempF : Math.round((tempF - 32) * (5 / 9));
  const displayUnit = isImp ? "F" : "C";

  const theme = getWeatherTheme(period.shortForecast);

  return (
    <div className="relative flex flex-col h-full p-6 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-900/80 dark:backdrop-blur-md border border-gray-200 dark:border-slate-800 shadow-lg transition-colors duration-300">
      {/* The Cyber-Glow Top Edge */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00c4f5] to-transparent dark:opacity-100 transition-opacity duration-300" />

      {/* --- TOP HALF (Flex Grow takes up the slack if text is missing) --- */}
      <div className="flex flex-col flex-grow">
        {/* Header, Temp & Icon */}
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex flex-col">
            <h2 className={`text-xl font-semibold ${theme.title} tracking-wide`}>
              {period.name}
            </h2>
            <div className="mt-2">
              <span className={`text-4xl font-bold ${theme.temp} dark:text-white`}>
                {displayTemp}°{displayUnit}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <img
              src={period.icon}
              alt={period.shortForecast}
              className={`w-16 h-16 flex-shrink-0 rounded-xl ${theme.border} border object-contain text-gray-300 bg-slate-800 dark:bg-white/10 p-1 shadow-sm`}
            />
          </div>
        </div>

        {/* Short Forecast */}
        <div className="mt-2 space-y-2">
          <p className="text-md font-medium text-gray-700 dark:text-gray-200 mb-4">
            {period.shortForecast}
          </p>

          {/* Wind Info */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Wind: {period.windDirection} at {formatForecastWind(period.windSpeed, !isImp)}
            </p>
          </div>
        </div>

        {/* Precipitation Bar */}
        {period.probabilityOfPrecipitation?.value !== null && period.probabilityOfPrecipitation?.value !== undefined && (
          <div className="w-full mt-4">
            {/* Label and Exact Percentage */}
            <div className="flex justify-between text-sm text-gray-300 mb-1.5">
              <span className="font-semibold text-gray-500 dark:text-gray-300">
                Precipitation
              </span>
              <span
                className="font-bold drop-shadow-md"
                style={{
                  color: getPrecipColor(period.probabilityOfPrecipitation.value),
                }}
              >
                {period.probabilityOfPrecipitation.value}%
              </span>
            </div>

            {/* The Bar Background (Dark track) */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden">
              {/* The Dynamic Fill */}
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${period.probabilityOfPrecipitation.value}%`,
                  backgroundColor: getPrecipColor(
                    period.probabilityOfPrecipitation.value,
                  ),
                  boxShadow: `0 0 10px ${getPrecipColor(period.probabilityOfPrecipitation.value)}`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM HALF (Locked to the bottom by the top half's flex-grow) --- */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800 flex-shrink-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {period.detailedForecast}
        </p>
      </div>
    </div>
  );
}
