import React from "react";
import UnitToggle from "./components/UnitToggle";
import ForecastCard from "./components/ForecastCard";
import MapWrapper from "./components/MapWrapper";
import AlertBanner from "./components/AlertBanner";
import CurrentConditionsCard from "./components/CurrentConditionsCard";
import DebugConsole from "./components/DebugConsole";
import {
  NWSForecastPeriod,
  NWSObservationResponse,
  OpenMeteoCurrentResponse,
} from "@/lib/types";

// We define the latitude and longitude for Birmingham, AL, which will be used to fetch both the forecast and the radar data. The station ID is also set for fetching current conditions from the NWS API.
const LAT = 33.5186;
const LON = -86.8104;

const STATION_ID = "KBHM"; // Birmingham, AL station for current conditions

async function getWeatherData() {
  await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate network delay
  const pointRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`, {
    headers: { "User-Agent": "(forcast-radar-app, bjgarner@uab.edu)" },
    next: { revalidate: 3600 },
  });

  if (!pointRes.ok) throw new Error("Failed to fetch grid point");
  const pointData = await pointRes.json();

  const forecastUrl = pointData.properties.forecast;
  const forecastRes = await fetch(forecastUrl, {
    headers: { "User-Agent": "(forcast-radar-app, bjgarner@uab.edu)" },
    next: { revalidate: 900 },
  });

  const forecastData = await forecastRes.json();

  // 2. NEW: Current Observations Fetch (NWS KBHM)
  const obsRes = await fetch(
    `https://api.weather.gov/stations/${STATION_ID}/observations/latest`,
    {
      headers: { "User-Agent": "(forcast-radar-app, bjgarner@uab.edu)" },
      next: { revalidate: 300 }, // Revalidate every 5 mins
    },
  );
  const observationData: NWSObservationResponse = await obsRes.json();

  // 3. NEW: Environmental Context Fetch (Open-Meteo)
  // Requesting cloud_cover, uv_index, and precipitation
  const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&temperature_unit=fahrenheit&current=temperature_2m,cloud_cover,uv_index,precipitation`;
  const meteoRes = await fetch(meteoUrl, {
    next: { revalidate: 300 },
  });
  const meteoData: OpenMeteoCurrentResponse = await meteoRes.json();

  return {
    forecast: forecastData.properties.periods,
    currentNWS: observationData.properties,
    currentMeteo: meteoData.current,
  };
}

export default async function Home() {
  const { forecast, currentNWS, currentMeteo } = await getWeatherData();

  return (
    <main className="min-h-screen bg-[#000000] p-8 max-w-7xl mx-auto relative">
      {/* 1. The Springboard Toast Notification */}
      <AlertBanner />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        {/* The Main Gradient Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00c4f5] to-blue-600 drop-shadow-sm tracking-tight">
          Birmingham Forecast & Radar
        </h1>

        {/* The Live Telemetry Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-sm w-fit">
          <span className="w-2 h-2 rounded-full bg-[#00c4f5] animate-pulse"></span>
          <span className="text-[#00c4f5] text-xs font-mono tracking-widest uppercase font-semibold">
            Live Telemetry
          </span>
        </div>

        {/* Drop the visual toggle right here! */}
        <UnitToggle />
      </div>

      {/* 2. The Conditional Layout Swap

      {/* --- STANDARD MODE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full mt-6">
        {/* Hybrid Now Card (Left Third) */}
        <div className="flex flex-col h-full">
          <CurrentConditionsCard nws={currentNWS} meteo={currentMeteo} />
        </div>
        {/* The Live Radar (Right Two-Thirds) */}
        <div className="flex flex-col h-full">
          {/* This calls the wrapper, which safely loads the map */}
          <MapWrapper />
        </div>
      </div>

      {/* The Forecast Cards Grid */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {forecast.map((period: NWSForecastPeriod) => (
          <ForecastCard key={period.number} period={period} />
        ))}
      </div>
      {/* 3. The Debug Console */}
      <DebugConsole data={{ currentMeteo, currentNWS, forecast }} />
    </main>
  );
}
