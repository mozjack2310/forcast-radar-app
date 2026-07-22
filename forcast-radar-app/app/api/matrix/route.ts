export const dynamic = "force-dynamic";
export const runtime = "edge"; // This is will run the V8 runtime, not Node.js

// 1. The Smart Dictionary sits outside the GET function
const condition_map: Record<string, string> = {
  "Partly Cloudy": "P. Cldy",
  "Chance Showers And Thunderstorms": "Chc TStorm",
  "Mostly Cloudy": "M. Cldy",
  "Rain and Snow": "Rain/Snw",
  Thunderstorms: "T-Storms",
  "Slight Chance": "Sl Chc",
  "Areas Of": "",
  "Partly Sunny": "P. Snny",
  Light: "Lgt",
  Chance: "Chc",
  Slight: "Slgt",
  Heavy: "Hvy",
  Patchy: "Ptchy",
  Showers: "Shwrs",
  Drizzle: "Drzzl",
  Flurries: "Flur",
  Sunny: "Sun",
  Clear: "Clr",
  Breezy: "Brzy",
  Freezing: "Frz",
};

function degreesToCompass(d: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const ix = Math.floor((d + 11.25) / 22.5) % 16;
  return dirs[ix];
}

export async function GET(request: Request) {
  try {
    // Connect to your Docker Python backend
    const baseUrl =
      process.env.INTERNAL_ALERTS_API_URL || "http://forrad_alerts_api:8000";
    const targetUrl = `${baseUrl}/api/v1/telemetry/current`;

    const res = await fetch(targetUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Daemon status: ${res.status}`);

    const fullTelemetry = await res.json();

    // 2. Grab the raw text
    let rawText = fullTelemetry.conditionText || "Unknown";

    // 3. THIS is the TypeScript version of your shorten_forecast function!
    for (const [longPhrase, shortPhrase] of Object.entries(condition_map)) {
      rawText = rawText.replace(new RegExp(longPhrase, "gi"), shortPhrase);
    }

    // 4. NEW: Format the Wind String (e.g., "SSW 15 mph")
    // Remember Pydantic converted these to camelCase for us!
    const windSpeed = Math.round(fullTelemetry.windSpeed);
    let windString = "Calm"; // Default fallback

    if (windSpeed > 0 && fullTelemetry.windDirection !== undefined) {
      const compassDir = degreesToCompass(fullTelemetry.windDirection);
      windString = `${compassDir} ${windSpeed} mph`;
    }

    // 5. Build the tiny payload for the hardware
    const matrixPayload = {
      t: Math.round((fullTelemetry.temperature * 9) / 5 + 32),
      c: rawText,
      qc: 1,
      wnd: windString,
    };

    // FIX: Calculate exact byte length to prevent Next.js Chunked Encoding
    // This stops the MatrixPortal ESP32 chip from crashing!
    const jsonString = JSON.stringify(matrixPayload);
    const byteLength = new TextEncoder().encode(jsonString).length.toString();

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": byteLength,
        Connection: "close", // Ensure the connection is closed after the response
      },
    });
  } catch (error) {
    console.error("Matrix Bridge Error:", error);

    // The final bare-metal conversion!
    return new Response(JSON.stringify({ err: "Offline" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        Connection: "close",
      },
    });
  }
}
