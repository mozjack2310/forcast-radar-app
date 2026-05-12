import React from "react";
import UnitToggle from "./components/UnitToggle";
import ForecastCard from "./components/ForecastCard";
import MapWrapper from "./components/MapWrapper"; // Import the new wrapper
import CurrentConditionsCard from "./components/CurrentConditionsCard";
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
  const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=cloud_cover,uv_index,precipitation`;
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

  //MOCK SEVERE WEATHER TOGGLE
  // Change this to a string like "Tornado Warning" to test Severe Weather Mode!
  // Fetch real-time alerts from the Flask Proxy
  let activeAlert: string | null = null;
  try {
    // Polling your RHEL Flask API (Revalidates every 15 seconds)
    const alertRes = await fetch("http://192.168.1.101:5000/api/alerts", {
      next: { revalidate: 15 },
    });

    if (alertRes.ok) {
      const alertData = await alertRes.json();
      activeAlert = alertData.alert;
    }
  } catch (error) {
    console.error("Alert fetch failed. Assuming clear skies.", error);
  }

  return (
    <main className="min-h-screen bg-[#000000] p-8 max-w-7xl mx-auto relative">
      {/* 1. The Springboard Toast Notification */}
      {activeAlert && (
        <div className="fixed top-0 left-0 w-full bg-red-600/90 backdrop-blur-md text-white p-4 z-50 flex justify-center items-center shadow-2xl border-b border-red-400">
          <span className="font-bold text-lg animate-pulse uppercase tracking-wider">
            ⚠️ {activeAlert} in effect for your area
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-[#d4ba98]">
          Birmingham Forecast & Radar
        </h1>

        {/* Drop the visual toggle right here! */}
        <UnitToggle />
      </div>

      {/* 2. The Conditional Layout Swap */}
      {activeAlert ? (
        /* --- SEVERE WEATHER MODE --- */
        <div className="flex flex-col gap-6 mb-8 mt-4">
          {/* Radar expands to 100% width, gets taller, and gets a warning border */}
          <div className="w-full h-[600px] border-2 border-red-600 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <MapWrapper />
          </div>
        </div>
      ) : (
        /* --- STANDARD MODE --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Hybrid Now Card (Left Third) */}
          <div className="lg:col-span-1 h-full">
            <CurrentConditionsCard nws={currentNWS} meteo={currentMeteo} />
          </div>
          {/* The Live Radar (Right Two-Thirds) */}
          <div className="lg:col-span-2 relative z-0">
            {/* This calls the wrapper, which safely loads the map */}
            <MapWrapper />
          </div>
        </div>
      )}

      {/* The Forecast Cards Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {forecast.slice(0, 4).map((period: NWSForecastPeriod) => (
          <ForecastCard key={period.number} period={period} />
        ))}
      </div>
    </main>
  );
}
