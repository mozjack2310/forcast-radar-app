import React from "react";
import UnitToggle from "./components/UnitToggle";
import ForecastCard from "./components/ForecastCard";
import MapWrapper from "./components/MapWrapper";
import CurrentConditionsCard from "./components/CurrentConditionsCard";
import DebugConsole from "./components/DebugConsole";
import AlertSidebar from "./components/AlertSidebar";
import DebugAlertButton from "./components/DebugAlertButton";
import AlertToast from "./components/AlertToast";
import {
  NWSForecastPeriod,
  NWSObservationResponse,
  OpenMeteoCurrentResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// We define the latitude and longitude for Birmingham, AL, which will be used to fetch both the forecast and the radar data. The station ID is also set for fetching current conditions from the NWS API.
const LAT = 33.5186;
const LON = -86.8104;

const STATION_ID = "KBHM"; // Birmingham, AL station for current conditions

async function getWeatherData() {
  try {
    const headers = { "User-Agent": "(forcast-radar-app, bjgarner@uab.edu)" };

    // 1. Get Grid Points (Cached for 24 hours)
    const pointRes = await fetch(
      `https://api.weather.gov/points/${LAT},${LON}`,
      {
        headers,
        next: { revalidate: 86400 },
      },
    );
    if (!pointRes.ok) throw new Error(`Gridpoint Error: ${pointRes.status}`);
    const pointData = await pointRes.json();

    // 2. Get 7-Day Forecast (Cached for 1 hour)
    const forecastRes = await fetch(pointData.properties.forecast, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!forecastRes.ok)
      throw new Error(`Forecast Error: ${forecastRes.status}`);
    const forecastData = await forecastRes.json();

    // 3. Get Current Observations (Cached for 5 mins)
    const obsRes = await fetch(
      `https://api.weather.gov/stations/${STATION_ID}/observations/latest`,
      {
        headers,
        next: { revalidate: 300 },
      },
    );
    if (!obsRes.ok) throw new Error(`Observation Error: ${obsRes.status}`);
    const obsData = await obsRes.json();

    // 4. Get Open-Meteo Fallback Data (Cached for 5 mins)
    let currentMeteoData = null;
    try {
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,uv_index,apparent_temperature,is_day,surface_pressure&temperature_unit=fahrenheit&wind_speed_unit=mph`,
        { next: { revalidate: 300 } },
      );

      if (meteoRes.ok) {
        const meteoJson = await meteoRes.json();
        currentMeteoData = meteoJson.current;
      }
    } catch (meteoError) {
      console.warn("Open-Meteo is offline, sticking strictly to NWS data.");
    }

    // Return the exact raw JSON shape your React components demand
    return {
      forecast: forecastData.properties.periods,
      currentNWS: obsData.properties,
      currentMeteo: currentMeteoData, // <-- Secondary sensor online!
    };
  } catch (error) {
    console.error("NWS Web Fetch Failed:", error);
    return { forecast: null, currentNWS: null, currentMeteo: null };
  }
}

export default async function Home() {
  // 1. Await the data without destructuring it yet
  const weatherData = await getWeatherData();

  // 2. Safely extract, defaulting to null if the proxy failed
  const forecast = weatherData?.forecast || null;
  const currentNWS = weatherData?.currentNWS || null;
  const currentMeteo = weatherData?.currentMeteo || null;

  return (
    <main className="min-h-screen bg-[#000000] p-8 max-w-7xl mx-auto relative">
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
      {/* 2. The Conditional Layout Swap */}
      <div className="flex flex-col gap-8">
        {/* --- 1. Current Conditions Failsafe --- */}
        <div>
          {currentNWS && currentMeteo ? (
            <CurrentConditionsCard />
          ) : (
            // The Offline UI State
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/50">
              <span className="text-yellow-500 font-mono text-xl font-bold mb-2">
                ⚠ SYSTEM AWAITING DATA
              </span>
              <span className="text-gray-400 font-mono text-sm">
                Proxy initializing or waiting out API rate limit...
              </span>
            </div>
          )}
        </div>
        {/* The Live Radar (Right Two-Thirds) */}
        <div className="flex flex-col h-full mb-8">
          {/* This calls the wrapper, which safely loads the map */}
          <MapWrapper />
        </div>
      </div>
      {/* The Forecast Cards Grid */}
      {/* --- 2. The 7-Day Forecast Failsafe --- */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 w-full">
        {forecast ? (
          // If we have data, map it
          forecast.map((period: NWSForecastPeriod) => (
            <ForecastCard key={period.number} period={period} />
          ))
        ) : (
          // The Offline UI State
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-xl bg-gray-900/50">
            <span className="text-yellow-500 font-mono text-lg font-bold">
              ⚠ FORECAST MODEL OFFLINE
            </span>
          </div>
        )}
      </div>
      {/* 3. The Debug Console */}
      <DebugConsole data={{ currentMeteo, currentNWS, forecast }} />

      {/* 4. The Alert Sidebar */}
      <AlertSidebar />

      {/* 5. The Debug Alert Button */}
      <DebugAlertButton />

      {/* 6. The Alert Toast */}
      <AlertToast />
    </main>
  );
}
