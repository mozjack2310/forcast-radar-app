// ==============================================================================
// FORRAD UNIFIED DATA CONTRACTS & TYPE REGISTRY
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. SPRINT 1 & 2: BACKEND FASTAPI & SSE CONTRACTS (forrad_schemas.py)
// ------------------------------------------------------------------------------
export type ThreatSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
export type AlertUrgency = "Immediate" | "Expected" | "Future" | "Past" | "Unknown";

export interface ForRadAlert {
  alert_id: string;
  event_type: string;
  severity_level: ThreatSeverity;
  urgency: AlertUrgency;
  headline: string | null;
  description: string;
  instruction: string | null;
  active_areas: string[];
  start_time: string;
  end_time: string;
  has_polygon: boolean;
  polygon_coordinates: number[][][] | number[][][][] | null;
}

export interface ForRadTelemetry {
  timestamp: string;
  temperature: number;
  feels_like: number;
  wind_speed: number;
  wind_direction: number;
  humidity?: number;
  pressure?: number;
  source: string;
}

export interface ForRadForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  detailedForecast: string;
  icon?: string;
}

// ------------------------------------------------------------------------------
// 2. NWS FORECAST CONTRACTS (Consumed by ForecastCard.tsx & page.tsx)
// ------------------------------------------------------------------------------
export interface NWSQuantitativeValue {
  unitCode?: string;
  value: number | null;
}

export interface NWSForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend?: string | null;
  probabilityOfPrecipitation?: NWSQuantitativeValue | null;
  dewpoint?: NWSQuantitativeValue | null;
  relativeHumidity?: NWSQuantitativeValue | null;
  windSpeed: string;
  windDirection: string;
  icon?: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NWSForecastResponse {
  properties: {
    updated?: string;
    units?: string;
    forecastGenerator?: string;
    generatedAt?: string;
    updateTime?: string;
    validTimes?: string;
    elevation?: {
      unitCode?: string;
      value?: number | null;
    };
    periods: NWSForecastPeriod[];
  };
}

// ------------------------------------------------------------------------------
// 3. NWS OBSERVATION & TELEMETRY CONTRACTS (Consumed by page.tsx & CurrentConditionsCard)
// ------------------------------------------------------------------------------
export interface NWSObservationValue {
  unitCode?: string;
  value: number | null;
  qualityControl?: string;
}

export interface NWSObservationProperties {
  timestamp?: string;
  textDescription?: string;
  icon?: string | null;
  presentWeather?: Array<{
    intensity?: string | null;
    modifier?: string | null;
    weather?: string | null;
    rawString?: string;
  }>;
  temperature: NWSObservationValue;
  dewpoint?: NWSObservationValue;
  windDirection?: NWSObservationValue;
  windSpeed?: NWSObservationValue;
  windGust?: NWSObservationValue;
  barometricPressure?: NWSObservationValue;
  seaLevelPressure?: NWSObservationValue;
  visibility?: NWSObservationValue;
  maxTemperatureLast24Hours?: NWSObservationValue;
  minTemperatureLast24Hours?: NWSObservationValue;
  precipitationLastHour?: NWSObservationValue;
  precipitationLast3Hours?: NWSObservationValue;
  precipitationLast6Hours?: NWSObservationValue;
  relativeHumidity?: NWSObservationValue;
  windChill?: NWSObservationValue;
  heatIndex?: NWSObservationValue;
}

export interface NWSObservationResponse {
  id?: string;
  type?: string;
  geometry?: {
    type: string;
    coordinates: number[];
  } | null;
  properties: NWSObservationProperties;
}

// ------------------------------------------------------------------------------
// 4. OPEN-METEO TELEMETRY CONTRACTS (Consumed by page.tsx & Fallbacks)
// ------------------------------------------------------------------------------
export interface OpenMeteoCurrentUnits {
  time?: string;
  interval?: string;
  temperature_2m?: string;
  wind_speed_10m?: string;
  wind_direction_10m?: string;
  apparent_temperature?: string;
  uv_index?: string;
  relative_humidity_2m?: string;
  precipitation?: string;
  weather_code?: string;
}

export interface OpenMeteoCurrentData {
  time?: string;
  interval?: number;
  temperature_2m?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  apparent_temperature?: number;
  uv_index?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  weather_code?: number;
}

export interface OpenMeteoCurrentResponse {
  latitude?: number;
  longitude?: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  current_units?: OpenMeteoCurrentUnits;
  current?: OpenMeteoCurrentData;
  hourly_units?: Record<string, string>;
  hourly?: Record<string, Array<number | string>>;
}
