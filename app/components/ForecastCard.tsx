import React from "react";
import { NWSPeriod } from "../types";

interface ForecastCardProps {
  period: NWSPeriod;
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
      border: "border-gray-500",
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
  const theme = getWeatherTheme(period.shortForecast);

  return (
    <div
      className={`flex flex-col border p-6 rounded-lg shadow-lg text-gray-200 transition-colors duration-300 ${theme.bg} ${theme.border}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-semibold ${theme.title}`}>
          {period.name}
        </h2>
        {/* The comment is now safely OUTSIDE the image tag! */}
        <img
          src={period.icon}
          alt={period.shortForecast}
          className={`w-12 h-12 rounded-full border ${theme.border}`}
        />
      </div>

      <div className="my-2">
        <span className={`text-4xl font-bold ${theme.temp}`}>
          {period.temperature}°{period.temperatureUnit}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-md font-medium text-white">{period.shortForecast}</p>
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-gray-300">Wind:</span>{" "}
          {period.windDirection} at {period.windSpeed}
        </p>

        {period.probabilityOfPrecipitation.value !== null && (
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-300">Precipitation:</span>{" "}
            {period.probabilityOfPrecipitation.value}%
          </p>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-4 leading-relaxed border-t border-gray-800 pt-4">
        {period.detailedForecast}
      </p>
    </div>
  );
}
