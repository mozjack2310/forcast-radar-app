import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    // Dynamically pull the NOMADS Daemon URL from .env
    const baseUrl = process.env.INTERNAL_WEATHER_PROXY_URL;
    const targetUrl = `${baseUrl}/api/matrix;`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) throw new Error(`Daemon responded with status: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Matrix Bridge Error:", error);
    return NextResponse.json({
      error: "Failed to load Matrix Data",
      status: 500,
    });
  }
}
