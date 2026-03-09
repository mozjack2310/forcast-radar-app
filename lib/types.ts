export interface NWSPeriod {
  number: number;
  name: string; // e.g., "This Afternoon", "Tonight"
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string; // "F" or "C"
  temperatureTrend: string | null;
  probabilityOfPrecipitation: {
    unitCode: string;
    value: number | null;
  };
  windSpeed: string; // e.g., "10 to 15 mph"
  windDirection: string; // e.g., "NW"
  icon: string; // URL to the NWS weather icon
  shortForecast: string; // e.g., "Mostly Sunny"
  detailedForecast: string;
}

export interface NWSForecastResponse {
  properties: {
    updated: string;
    generatedAt: string;
    periods: NWSPeriod[];
  };
}
