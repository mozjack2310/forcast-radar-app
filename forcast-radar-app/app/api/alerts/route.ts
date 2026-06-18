import { NextResponse } from "next/server";

export async function GET() {
  try {
    // The Next.js server is INSIDE the container network,
    // so it can resolve the proxy's internal Docker DNS name
    const res = await fetch("http://localhost:5000/api/alerts", {
      // Weather data changes constantly; tell Next.js not to cache this statically
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Proxy responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch from weather proxy:", error);
    return NextResponse.json(
      { error: "Failed to load alert telemetry" },
      { status: 500 },
    );
  }
}
