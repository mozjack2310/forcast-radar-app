import { NextResponse } from "next/server";
import { createClient } from "redis";

export async function GET() {
  try {
    // Construct the Redis connection URL using your .env variables
    const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_IP}:6379`;

    const client = createClient({ url: redisUrl });

    // Handle connection errors gracefully
    client.on("error", (err) => console.error("Redis Client Error", err));

    await client.connect();

    // Fetch the raw JSON strings from your cache
    const meteoData = await client.get("open_meteo_bridge_data");
    const nwsData = await client.get("nws_current_forecast");
    const activeAlert = await client.get("active_alert");

    await client.disconnect();

    // Unpack the strings back into JSON objects and return them
    return NextResponse.json({
      status: "success",
      cache: {
        open_meteo: meteoData ? JSON.parse(meteoData) : null,
        nws_forecast: nwsData ? JSON.parse(nwsData) : null,
        active_alert: activeAlert !== "None" ? activeAlert : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug Route Error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to connect to Redis cache" },
      { status: 500 },
    );
  }
}
