import { ForRadTelemetry } from "./types";

export type UnitSystem = "imperial" | "metric";

export interface FormattedTelemetry {
  displayTemp: string;
  tempUnitLabel: "°F" | "°C";
  displayFeelsLike: string;
  feelsLikeType: "Heat Index" | "Wind Chill" | "Apparent";
  displayWind: string;
  displayWindKnots: string;
  displayGusts: string;
  displayHumidity: string;
  displayDewpoint: string;
  displayCloudBase: string;
  displayPressure: string;
  pressureUnitLabel: "inHg" | "hPa";
  displayVisibility: string;
  visibilityUnitLabel: "mi" | "km";
  conditionText: string;
  sourceLabel: string;
  isFallbackSource: boolean;
}

const COMPASS_SECTORS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

// ============================================================================
// 1. PHYSICAL DOMAIN GUARDS & SAFE NUMERIC EXTRACTORS
// ============================================================================

export function extractNumeric(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (
    typeof input === "object" &&
    input !== null &&
    "value" in input &&
    typeof (input as { value: unknown }).value === "number" &&
    Number.isFinite((input as { value: number }).value)
  ) {
    return (input as { value: number }).value;
  }
  return null;
}

export function guardTemperatureF(tempF: number | null): number | null {
  if (tempF === null || !Number.isFinite(tempF)) return null;
  // Physical Earth surface plausibility guard (-130°F to +150°F)
  return tempF >= -130 && tempF <= 150 ? tempF : null;
}

export function normalizePressureToInHg(rawPressure: number | null): number | null {
  if (rawPressure === null || !Number.isFinite(rawPressure) || rawPressure <= 0) {
    return null;
  }
  if (rawPressure > 10000) {
    // Raw Pascals (Pa) -> inHg
    return rawPressure / 3386.389;
  }
  if (rawPressure > 100) {
    // Hectopascals (hPa / mb) -> inHg
    return rawPressure / 33.86389;
  }
  // Plausibility check for inHg (24.00 to 33.00 inHg)
  return rawPressure >= 24 && rawPressure <= 33 ? rawPressure : null;
}

export function normalizeVisibilityToMiles(rawVisibility: number | null): number | null {
  if (rawVisibility === null || !Number.isFinite(rawVisibility) || rawVisibility < 0) {
    return null;
  }
  if (rawVisibility > 100) {
    // Raw Meters (m) -> Statute Miles (mi)
    return rawVisibility / 1609.344;
  }
  return rawVisibility;
}

// ============================================================================
// 2. PURE UNIT PROJECTIONS (IMPERIAL <-> METRIC / AVIATION)
// ============================================================================

export function fahrenheitToCelsius(tempF: number): number {
  return ((tempF - 32) * 5) / 9;
}

export function celsiusToFahrenheit(tempC: number): number {
  return (tempC * 9) / 5 + 32;
}

export function mphToKmh(mph: number): number {
  return mph * 1.609344;
}

export function mphToKnots(mph: number): number {
  return mph * 0.868976;
}

export function degreesToCompass(degrees: number | null): string {
  if (degrees === null || !Number.isFinite(degrees)) {
    return "";
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_SECTORS[index];
}

// ============================================================================
// 3. SURFACE PSYCHROMETRICS & DERIVED INDICES (NWS / WMO STANDARDS)
// ============================================================================

/**
 * Magnus-Tetens Dewpoint Equation (Sonntag 1990 constants).
 * Computes accurate dewpoint (°F) from ambient temperature (°F) and RH (%).
 */
export function calculateMagnusDewpointF(
  tempF: number,
  humidityPercent: number
): number {
  const tempC = fahrenheitToCelsius(tempF);
  const clampedRh = Math.min(100, Math.max(1, humidityPercent));
  const a = 17.625;
  const b = 243.04;
  const alpha = Math.log(clampedRh / 100) + (a * tempC) / (b + tempC);
  const dewC = (b * alpha) / (a - alpha);
  return celsiusToFahrenheit(dewC);
}

export function resolveDewpointFahrenheit(
  tempF: number | null,
  humidityPercent: number | null,
  rawDewpoint: number | null
): number | null {
  if (rawDewpoint !== null && rawDewpoint > -60 && rawDewpoint <= 110) {
    if (
      tempF !== null &&
      humidityPercent !== null &&
      humidityPercent >= 50 &&
      tempF - rawDewpoint > 45
    ) {
      return calculateMagnusDewpointF(tempF, humidityPercent);
    }
    return rawDewpoint;
  }
  if (tempF === null || humidityPercent === null || humidityPercent <= 0) {
    return null;
  }
  return calculateMagnusDewpointF(tempF, humidityPercent);
}

/**
 * Official NWS Rothfusz Heat Index Equation (valid for T >= 80°F, RH >= 40%).
 */
export function calculateHeatIndexF(tempF: number, humidityPercent: number): number {
  const T = tempF;
  const R = Math.min(100, Math.max(0, humidityPercent));

  // Steadman simple approximation first (NWS standard pre-check)
  const simpleHI = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if ((simpleHI + T) / 2 < 80) {
    return simpleHI;
  }

  // Full Rothfusz regression
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Low-humidity adjustment
  if (R < 13 && T >= 80 && T <= 112) {
    hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }
  // High-humidity adjustment
  if (R > 85 && T >= 80 && T <= 87) {
    hi += ((R - 85) / 10) * ((87 - T) / 5);
  }
  return hi;
}

/**
 * Official North American JAG/TI NWS Wind Chill Equation (valid for T <= 50°F, V > 3 mph).
 */
export function calculateWindChillF(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph <= 3) {
    return tempF;
  }
  const vPow = Math.pow(windMph, 0.16);
  return 35.74 + 0.6215 * tempF - 35.75 * vPow + 0.4275 * tempF * vPow;
}

/**
 * Resolves Apparent Temperature ("Feels Like") and classifies the active regime.
 */
export function resolveApparentTemperatureF(
  tempF: number | null,
  humidityPercent: number | null,
  windMph: number | null,
  rawFeelsLikeF: number | null
): { valueF: number | null; regime: "Heat Index" | "Wind Chill" | "Apparent" } {
  if (tempF === null) {
    return { valueF: null, regime: "Apparent" };
  }
  if (tempF >= 80 && humidityPercent !== null) {
    const hi =
      rawFeelsLikeF !== null && rawFeelsLikeF > tempF
        ? rawFeelsLikeF
        : calculateHeatIndexF(tempF, humidityPercent);
    return { valueF: hi, regime: "Heat Index" };
  }
  if (tempF <= 50 && windMph !== null && windMph > 3) {
    const wc =
      rawFeelsLikeF !== null && rawFeelsLikeF < tempF
        ? rawFeelsLikeF
        : calculateWindChillF(tempF, windMph);
    return { valueF: wc, regime: "Wind Chill" };
  }
  return { valueF: rawFeelsLikeF ?? tempF, regime: "Apparent" };
}

/**
 * Espy Lifting Condensation Level (LCL) Equation.
 * Estimates convective cloud base altitude in feet AGL from surface T (°F) and Td (°F).
 */
export function calculateCloudBaseFeetAGL(
  tempF: number | null,
  dewpointF: number | null
): number | null {
  if (tempF === null || dewpointF === null) {
    return null;
  }
  const spreadF = Math.max(0, tempF - dewpointF);
  return Math.round((spreadF / 4.4) * 1000);
}

// ============================================================================
// 4. UNIFIED DISPLAY FORMATTER
// ============================================================================

export function formatTelemetryForDisplay(
  rawInput: ForRadTelemetry | Record<string, any> | null | undefined,
  unit: UnitSystem
): FormattedTelemetry {
  const isImp = unit === "imperial";
  const payload: Record<string, any> =
    (rawInput && typeof rawInput === "object" && "telemetry" in rawInput
      ? (rawInput as Record<string, any>).telemetry
      : rawInput) || {};

  const tempF = guardTemperatureF(
    extractNumeric(payload.temperature ?? payload.temp ?? payload.temperature_f)
  );
  const rawFeelsLikeF = guardTemperatureF(
    extractNumeric(payload.feels_like ?? payload.feelsLike)
  );
  const windMph = extractNumeric(payload.wind_speed ?? payload.windSpeed);
  const windDirDeg = extractNumeric(payload.wind_direction ?? payload.windDirection);
  const gustsMph = extractNumeric(payload.wind_gusts ?? payload.windGusts);
  const humidity = extractNumeric(
    payload.humidity ?? payload.relative_humidity ?? payload.relativeHumidity
  );
  const rawDewpoint = extractNumeric(payload.dewpoint ?? payload.dew_point);
  const rawPressure = extractNumeric(payload.pressure ?? payload.barometricPressure);
  const rawVisibility = extractNumeric(payload.visibility);

  const dewpointF = resolveDewpointFahrenheit(tempF, humidity, rawDewpoint);
  const apparent = resolveApparentTemperatureF(
    tempF,
    humidity,
    windMph,
    rawFeelsLikeF
  );
  const cloudBaseFt = calculateCloudBaseFeetAGL(tempF, dewpointF);
  const pressureInHg = normalizePressureToInHg(rawPressure);
  const visibilityMi = normalizeVisibilityToMiles(rawVisibility);

  const displayTemp =
    tempF !== null
      ? `${isImp ? Math.round(tempF) : Math.round(fahrenheitToCelsius(tempF))}`
      : "--";

  const displayFeelsLike =
    apparent.valueF !== null
      ? `${isImp ? Math.round(apparent.valueF) : Math.round(fahrenheitToCelsius(apparent.valueF))}°${isImp ? "F" : "C"}`
      : "--";

  let displayWind = "--";
  let displayWindKnots = "-- kts";
  if (windMph !== null) {
    const roundedMph = Math.round(windMph);
    displayWindKnots = `${Math.round(mphToKnots(windMph))} kts`;
    if (roundedMph === 0) {
      displayWind = "Calm";
    } else {
      const speedVal = isImp ? roundedMph : Math.round(mphToKmh(windMph));
      const speedUnit = isImp ? "mph" : "km/h";
      const compass = degreesToCompass(windDirDeg);
      displayWind = compass
        ? `${compass} ${speedVal} ${speedUnit}`
        : `${speedVal} ${speedUnit}`;
    }
  }

  let displayGusts = "Calm";
  if (gustsMph !== null && Math.round(gustsMph) > 0) {
    const gustVal = isImp ? Math.round(gustsMph) : Math.round(mphToKmh(gustsMph));
    displayGusts = `Gusts to ${gustVal} ${isImp ? "mph" : "km/h"}`;
  }

  const displayHumidity = humidity !== null ? `${Math.round(humidity)}%` : "--%";

  const displayDewpoint =
    dewpointF !== null
      ? `${isImp ? Math.round(dewpointF) : Math.round(fahrenheitToCelsius(dewpointF))}°${isImp ? "F" : "C"}`
      : "--";

  const displayCloudBase =
    cloudBaseFt !== null
      ? isImp
        ? `${cloudBaseFt.toLocaleString()} ft AGL`
        : `${Math.round(cloudBaseFt * 0.3048).toLocaleString()} m AGL`
      : "--";

  const displayPressure =
    pressureInHg !== null
      ? isImp
        ? pressureInHg.toFixed(2)
        : (pressureInHg * 33.86389).toFixed(1)
      : "--";

  const displayVisibility =
    visibilityMi !== null
      ? isImp
        ? visibilityMi.toFixed(1)
        : (visibilityMi * 1.609344).toFixed(1)
      : "--";

  const conditionText =
    typeof (payload.condition_text ?? payload.conditionText) === "string" &&
    (payload.condition_text ?? payload.conditionText).trim() !== ""
      ? (payload.condition_text ?? payload.conditionText).trim()
      : "Conditions Normal";

  const sourceLabel =
    typeof payload.source === "string" && payload.source.trim() !== ""
      ? payload.source.trim()
      : "NWS LIVE (KBHM)";

  const isFallbackSource =
    sourceLabel.toLowerCase().includes("meteo") ||
    sourceLabel.toLowerCase().includes("fallback");

  return {
    displayTemp,
    tempUnitLabel: isImp ? "°F" : "°C",
    displayFeelsLike,
    feelsLikeType: apparent.regime,
    displayWind,
    displayWindKnots,
    displayGusts,
    displayHumidity,
    displayDewpoint,
    displayCloudBase,
    displayPressure,
    pressureUnitLabel: isImp ? "inHg" : "hPa",
    displayVisibility,
    visibilityUnitLabel: isImp ? "mi" : "km",
    conditionText,
    sourceLabel,
    isFallbackSource,
  };
}


/**
 * Converts NWS forecast wind strings (e.g. "5 to 10 mph" or "15 mph")
 * to km/h when unit === "metric".
 */
export function formatForecastWindString(
  windSpeedStr: string | null | undefined,
  unit: UnitSystem
): string {
  if (!windSpeedStr) return "--";
  if (unit === "imperial") return windSpeedStr;
  return windSpeedStr
    .replace(/(\d+(?:\.\d+)?)\s*(?:to|-)?\s*(\d+(?:\.\d+)?)?\s*mph/gi, (_, n1, n2) => {
      const k1 = Math.round( parseFloat(n1) * 1.609344 );
      if (n2 !== undefined) {
        const k2 = Math.round( parseFloat(n2) * 1.609344 );
        return `${k1} to ${k2} km/h`;
      }
      return `${k1} km/h`;
    });
}
