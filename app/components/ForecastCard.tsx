"use client";

import { NWSForecastPeriod } from "@/lib/types";
import { useUnits } from "../context/UnitContext";
import React from "react";

interface ForecastCardProps {
  period: NWSForecastPeriod;
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

function getWeatherTheme(forecast: string) {
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
    <div
      className={`flex flex-col border p-6 rounded-lg shadow-lg text-gray-200 transition-colors duration-300 ${theme.bg} ${theme.border}`}
    >
      {/* Changed items-center to items-start so the title doesn't awkwardly float */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <h2 className={`text-xl font-semibold ${theme.title} mt-1`}>
          {period.name}
        </h2>

        {/* Swapped rounded-full for rounded-xl, and bumped size to w-24 h-24 */}
        <img
          src={period.icon}
          alt={period.shortForecast}
          className={`w-16 h-16 xl:w-24 xl:h-24 flext-shrink-0 rounded-xl border-2 ${theme.border} object-contain bg-black/20`}
        />
      </div>

      <div className="my-2">
        <span className={`text-4xl font-bold ${theme.temp}`}>
          {displayTemp}°{displayUnit}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-md font-medium text-white">{period.shortForecast}</p>
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-gray-300">Wind:</span>{" "}
          {period.windDirection} at {period.windSpeed}
        </p>

        {period.probabilityOfPrecipitation.value !== null && (
          <div className="mt-4">
            {/* Label and Exact Percentage */}
            <div className="flex justify-between text-sm text-gray-300 mb-1.5">
              <span className="font-semibold text-gray-200">Precipitation</span>
              <span
                className="font-bold drop-shadow-md"
                style={{
                  color: getPrecipColor(
                    period.probabilityOfPrecipitation.value,
                  ),
                }}
              >
                {period.probabilityOfPrecipitation.value}%
              </span>
            </div>

            {/* The Bar Background (Dark track) */}
            <div className="w-full h-1.5 bg-gray-800/80 rounded-full overflow-hidden">
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
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Forced text-gray-200 for much higher contrast against the dark background */}
      <p className="text-sm text-gray-200 mt-4 leading-relaxed border-t border-gray-800 pt-4">
        {period.detailedForecast}
      </p>
    </div>
  );
}
