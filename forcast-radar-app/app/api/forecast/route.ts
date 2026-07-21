import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

// Strict validation: Must be a number, must be within Earth's boundaries
const isValidCoordinate = (val: string | null, isLat: boolean): boolean => {
  if (!val) return false;
  const num = Number(val);
  if (isNaN(num)) return false;

  return isLat ? num >= -90 && num <= 90 : num >= -180 && num <= 180;
};

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await checkRateLimit(ip, 20, 60);

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} on /api/forecast`);
      return NextResponse.json(
        { error: "Too many forecast requests. Please wait a moment." },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    // 1. STRICT INPUT VALIDATION (The Bouncer)
    if (!isValidCoordinate(lat, true) || !isValidCoordinate(lon, false)) {
      return NextResponse.json(
        { error: "Invalid or missing coordinates provided." },
        { status: 400 }, // Actual HTTP 400 Bad Request
      );
    }

    const baseUrl = process.env.INTERNAL_NOMADS_DAEMON_URL;
    if (!baseUrl) {
      console.error(
        "CRITICAL: Missing INTERNAL_NOMADS_DAEMON_URL in environment.",
      );
      return NextResponse.json(
        { error: "Internal Gateway Configuration Error" },
        { status: 500 },
      );
    }

    // 2. SAFE URL CONSTRUCTION
    // Using the URL object ensures proper encoding and prevents parameter pollution
    const targetUrl = new URL(`${baseUrl}/api/forecast`);
    targetUrl.searchParams.append("lat", lat as string); // Safe to cast because of validation
    targetUrl.searchParams.append("lon", lon as string);

    const res = await fetch(targetUrl.toString(), { cache: "no-store" });

    if (!res.ok) {
      // Log the actual backend status for debugging, but don't expose it to the client
      console.error(`Backend daemon responded with status: ${res.status}`);
      throw new Error("Upstream service failure");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Forecast Bridge Error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with telemetry daemon." },
      { status: 502 }, // 502 Bad Gateway is the correct code for a proxy failure
    );
  }
}
