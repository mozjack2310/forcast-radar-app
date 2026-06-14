// lib/types.ts

// -----------------------------------------
// NWS Forecast
// -----------------------------------------

// This represents the structure of the precipitation probability object
export interface ProbabilityOfPrecipitation {
  unitCode: string;
  value: number | null;
}

// This is the core dictionary for a single forecast period (e.g., "Tonight" or "Thursday")
export interface NWSForecastPeriod {
  number: number;
  name: string; // e.g., "Tonight", "Thursday"
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number; // e.g., 60
  temperatureUnit: string; // e.g., "F"
  temperatureTrend: string | null;
  probabilityOfPrecipitation: ProbabilityOfPrecipitation;
  windSpeed: string; // e.g., "0 to 5 mph"
  windDirection: string; // e.g., "NW"
  icon: string; // URL to the NWS weather icon
  shortForecast: string; // e.g., "Showers And Thunderstorms"
  detailedForecast: string; // The long-form text description
}

// This represents the top-level response from the /forecast endpoint
export interface NWSForecastResponse {
  type: string;
  geometry: object;
  properties: {
    updated: string;
    units: string;
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    elevation: {
      unitCode: string;
      value: number;
    };
    periods: NWSForecastPeriod[];
  };
}

// -----------------------------------------
// NWS Current Observation (KBHM Station)
// -----------------------------------------
export interface NWSValueUnit {
  value: number | null;
  unitCode: string; // e.g., "wmoUnit:degC", "wmoUnit:km_h-1"
  qualityControl: string | null; // e.g., "V", "S", "Z", "X"
}

export interface NWSObservationResponse {
  properties: {
    textDescription: string; // e.g., "Light Rain"
    icon: string;
    temperature: NWSValueUnit; // Celsius by default in the API!
    dewpoint: NWSValueUnit;
    windDirection: NWSValueUnit;
    windSpeed: NWSValueUnit; // km/h by default
    windGust: NWSValueUnit;
    barometricPressure: NWSValueUnit; // Pascals
    visibility: NWSValueUnit; // Meters
    relativeHumidity: NWSValueUnit; // Percent
  };
}

// -----------------------------------------
// Open-Meteo Current Conditions
// -----------------------------------------
export interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m: number; // We won't use this, but it's in the payload
    cloud_cover: number; // Percent (0-100)
    uv_index: number; // Standard index
    is_day: number; // 1 for day, 0 for night
    precipitation: number; // mm
    wind_speed_10m: number; // mph
    wind_direction_10m: number; // Degrees
    apparent_temperature: number; // Feels-like in Fahrenheit
    visibility: number; // Miles
  };
}
