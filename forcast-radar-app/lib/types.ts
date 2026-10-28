// ==============================================================================
// FORRAD CANONICAL DATA CONTRACTS & TYPE REGISTRY
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Primitive Threat Enums & Values
// ------------------------------------------------------------------------------
export type ThreatSeverity =
  | "Extreme"
  | "Severe"
  | "Moderate"
  | "Minor"
  | "Unknown"
  | string;

export type AlertUrgency =
  | "Immediate"
  | "Expected"
  | "Future"
  | "Past"
  | "Unknown"
  | string;

// ------------------------------------------------------------------------------
// 2. Canonical Domain Models (Mirrors FastAPI forrad_schemas.py)
// ------------------------------------------------------------------------------
export interface ForRadAlert {
  alert_id: string;
  event_type: string;
  severity_level: ThreatSeverity;
  urgency: AlertUrgency;
  headline?: string | null;
  description: string;
  instruction?: string | null;
  active_areas: string[];
  start_time: string;
  end_time: string;
  has_polygon: boolean;
  polygon_coordinates: any[] | null;
}

export interface ForRadTelemetry {
  timestamp?: string;
  station_id?: string | null;
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  dewpoint?: number | null;
  pressure: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gusts?: number | null;
  weather_code?: number;
  visibility?: number | null;
  uv_index?: number | null;
  icon_url?: string | null;
  condition_text?: string | null;
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
  temperatureTrend?: string | null;
  probabilityOfPrecipitation?: number | { unitCode?: string; value: number | null } | null;
  windSpeed: string;
  windDirection: string;
  icon?: string | null;
  shortForecast: string;
  detailedForecast: string;
}

// ------------------------------------------------------------------------------
// 3. Upstream NWS API Contracts (Consumed by page.tsx & CurrentConditionsCard)
// ------------------------------------------------------------------------------
export interface NWSValueWithUnit<T = number> {
  unitCode?: string;
  value: T | null;
  qualityControl?: string | null;
}

export interface NWSObservationProperties {
  "@id"?: string;
  "@type"?: string;
  elevation?: NWSValueWithUnit<number>;
  station?: string;
  timestamp: string;
  rawMessage?: string;
  textDescription?: string;
  icon?: string | null;
  presentWeather?: Array<{
    intensity?: string | null;
    modifier?: string | null;
    weather?: string | null;
    rawString?: string;
  }>;
  temperature: NWSValueWithUnit<number>;
  dewpoint?: NWSValueWithUnit<number>;
  windDirection?: NWSValueWithUnit<number>;
  windSpeed?: NWSValueWithUnit<number>;
  windGust?: NWSValueWithUnit<number>;
  barometricPressure?: NWSValueWithUnit<number>;
  seaLevelPressure?: NWSValueWithUnit<number>;
  visibility?: NWSValueWithUnit<number>;
  maxTemperatureLast24Hours?: NWSValueWithUnit<number>;
  minTemperatureLast24Hours?: NWSValueWithUnit<number>;
  precipitationLastHour?: NWSValueWithUnit<number>;
  precipitationLast3Hours?: NWSValueWithUnit<number>;
  precipitationLast6Hours?: NWSValueWithUnit<number>;
  relativeHumidity?: NWSValueWithUnit<number>;
  windChill?: NWSValueWithUnit<number>;
  heatIndex?: NWSValueWithUnit<number>;
  [key: string]: any;
}

export interface NWSObservationResponse {
  "@context"?: any;
  id?: string;
  type?: string;
  geometry?: any;
  properties: NWSObservationProperties;
}

export interface ProbabilityOfPrecipitation {
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
  probabilityOfPrecipitation?: ProbabilityOfPrecipitation | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NWSForecastResponse {
  type?: string;
  geometry?: Record<string, unknown>;
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
// 4. Upstream Open-Meteo Contracts (Consumed by page.tsx & Fallbacks)
// ------------------------------------------------------------------------------
export interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  generationtime_ms?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  current_units?: Record<string, string>;
  current?: {
    time: string;
    interval?: number;
    temperature_2m?: number | null;
    relative_humidity_2m?: number | null;
    apparent_temperature?: number | null;
    is_day?: number | null;
    precipitation?: number | null;
    weather_code?: number | null;
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    wind_gusts_10m?: number | null;
    uv_index?: number | null;
    [key: string]: any;
  };
  hourly_units?: Record<string, string>;
  hourly?: Record<string, any>;
  daily_units?: Record<string, string>;
  daily?: Record<string, any>;
}
