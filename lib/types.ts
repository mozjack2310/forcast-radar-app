// types.ts (NWS Edition)
export interface NWSResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string; // ISO String
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;    // Note: NWS sends "5 mph" as a string
  windDirection: string;
  shortForecast: string;
  icon: string;
}