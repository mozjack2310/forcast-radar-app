import assert from "node:assert/strict";
import {
  calculateCloudBaseFeetAGL,
  calculateHeatIndexF,
  calculateMagnusDewpointF,
  calculateWindChillF,
  formatForecastWindString,
  formatTelemetryForDisplay,
  guardTemperatureF,
} from "../lib/telemetryMath";
import { ForRadTelemetry } from "../lib/types";

// 1. Exact Birmingham Imperial Payload (59°F / 15°C @ 67% RH, 30.25 inHg, 10.0 mi)
const bhmImperialPayload: ForRadTelemetry = {
  timestamp: "2026-10-29T02:05:00Z",
  station_id: "KBHM",
  temperature: 59.0,
  feels_like: 59.0,
  humidity: 67.0,
  dewpoint: 48.2,
  pressure: 30.25,
  wind_speed: 0.0,
  wind_direction: 0,
  wind_gusts: 0.0,
  weather_code: 0,
  visibility: 10.0,
  uv_index: 0,
  icon_url: null,
  condition_text: "Clear",
  source: "NWS",
};

const impResult = formatTelemetryForDisplay(bhmImperialPayload, "imperial");
assert.equal(impResult.displayTemp, "59");
assert.equal(impResult.displayDewpoint, "48°F");
assert.equal(impResult.displayPressure, "30.25");
assert.equal(impResult.displayVisibility, "10.0");
assert.equal(impResult.displayWind, "Calm");

const metResult = formatTelemetryForDisplay(bhmImperialPayload, "metric");
assert.equal(metResult.displayTemp, "15");
assert.equal(metResult.displayDewpoint, "9°C");
assert.equal(metResult.displayPressure, "1024.4");
assert.equal(metResult.displayVisibility, "16.1");

// 2. Psychrometric Regime Tests (NOAA Rothfusz Heat Index & JAG/TI Wind Chill)
// Exact Rothfusz polynomial for 92°F @ 65% RH = 108.26°F -> 108°F
const summerHeatIndex = calculateHeatIndexF(92, 65);
assert.equal(
  Math.round(summerHeatIndex),
  108,
  "92°F @ 65% RH produces 108.26°F (108°F rounded) per NOAA Rothfusz regression"
);

const winterWindChill = calculateWindChillF(25, 20);
assert.equal(
  Math.round(winterWindChill),
  11,
  "25°F @ 20 mph wind produces 11°F Wind Chill"
);

// 3. Espy LCL Cloud Base Altitude Test
const cloudBase = calculateCloudBaseFeetAGL(70, 59); // 11°F spread -> 2,500 ft AGL
assert.equal(cloudBase, 2500);

// 4. Forecast Wind String Metric Projection Test
assert.equal(formatForecastWindString("5 to 10 mph", "metric"), "8 to 16 km/h");
assert.equal(formatForecastWindString("15 mph", "metric"), "24 km/h");
assert.equal(formatForecastWindString("5 to 10 mph", "imperial"), "5 to 10 mph");

// 5. Physical Plausibility Guard Test (Reject 9999°F sensor glitch & 0% RH log safety)
assert.equal(guardTemperatureF(9999), null);
assert.equal(calculateMagnusDewpointF(70, 0) < 0, true);

console.log("✅ All telemetry math, psychrometric indices, wind projections & domain guards passed!");
