import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Dynamically pull the Proxy URL from .env
    const baseUrl = process.env.INTERNAL_WEATHER_PROXY_URL;
    const targetUrl = `${baseUrl}/api/alerts`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) throw new Error(`Proxy responded with status: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Alerts Bridge Error:", error);
    return NextResponse.json({
      error: "Failed to load telemetry",
      status: 500,
    });
  }
}
