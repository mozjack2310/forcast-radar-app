import React from "react";
import ForecastCard from "./components/ForecastCard";
import MapWrapper from "./components/MapWrapper"; // Import the new wrapper
import { NWSPeriod } from "./types";

const LAT = 33.5186;
const LON = -86.8104;

async function getWeatherData() {
  const pointRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`, {
    headers: { "User-Agent": "(forcast-radar-app, contact@yourdomain.com)" },
    next: { revalidate: 3600 },
  });

  if (!pointRes.ok) throw new Error("Failed to fetch grid point");
  const pointData = await pointRes.json();

  const forecastUrl = pointData.properties.forecast;
  const forecastRes = await fetch(forecastUrl, {
    headers: { "User-Agent": "(forcast-radar-app, contact@yourdomain.com)" },
    next: { revalidate: 900 },
  });

  if (!forecastRes.ok) throw new Error("Failed to fetch forecast");
  return forecastRes.json();
}

export default async function Home() {
  const weather = await getWeatherData();
  const periods = weather.properties.periods;

  return (
    <main className="min-h-screen bg-[#000000] p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-[#d4ba98]">
        Birmingham Forecast & Radar
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {periods.slice(0, 4).map((period: NWSPeriod) => (
          <ForecastCard key={period.number} period={period} />
        ))}
      </div>

      {/* Drop the wrapper right here */}
      <MapWrapper />
    </main>
  );
}
