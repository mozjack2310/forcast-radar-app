export function formatForecastWind(windStr: string | null, isMetric: boolean) {
  // If there's no string, or the metric toggle is off, pass it through untouched
  if (!windStr || !isMetric) return windStr;

  // NWS sometimes returns "Calm" instead of a speed. Let that pass through.
  if (!windStr.includes("mph")) return windStr;

  // The Regex: \d+ looks for any sequence of digits (1 or more)
  // The 'g' flag means "global", so it will catch both numbers in a "10 to 15" string
  const numberRegex = /\d+/g;

  // Run the string replacement
  let convertedStr = windStr.replace(numberRegex, (match) => {
    const mph = parseInt(match, 10);
    // Multiply by 1.60934 to get km/h, and round to a clean integer
    const kmh = Math.round(mph * 1.60934);
    return kmh.toString();
  });

  // Finally, swap the unit label at the end of the string
  return convertedStr.replace("mph", "km/h");
}
