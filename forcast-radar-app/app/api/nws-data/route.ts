import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("http://weather-proxy:5000/nws-data", {

      cache: "no-store",
      
    });

    if (!res.ok) throw new Error(`Proxy responded with status: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch NWS data:", error);
    return NextResponse.json(
      { error: "Failed to load NWS telemetry" },
      { status: 500 },
    );
  }
}
