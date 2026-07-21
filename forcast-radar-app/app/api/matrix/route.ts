import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await checkRateLimit(ip, 30, 60); // Allow 30 requests per minute

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} on /api/matrix`);
      return NextResponse.json(
        {
          error: "Too many requests to matrix telemetry. Please wait a moment.",
        },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    // Dynamically pull the NOMADS Daemon URL from .env
    const baseUrl =
      process.env.INTERNAL_ALERTS_API_URL || "http://forrad_alerts_api:8000";
    const targetUrl = `${baseUrl}/api/v1/telemetry/current`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) throw new Error(`Daemon responded with status: ${res.status}`);
    const fullTelemetry = await res.json();

    // 2. THE FUNNEL: Build a brutally lean, flat object for CircuitPython memory limits
    const matrixPayload = {
      t: Math.round((fullTelemetry.temperature * 9) / 5 + 32), // Just the integer/float
      w: fullTelemetry.weatherCode, // To trigger specific LED icons
      // Optional: Add a simple boolean flag if you want the matrix to flash red during severe weather!
      // a: fullTelemetry.active_alerts > 0 ? 1 : 0
    };

    return NextResponse.json(matrixPayload);
  } catch (error) {
    console.error("Matrix Bridge Error:", error);
    // Keep the error payload tiny too!
    return NextResponse.json({ err: "Offline" }, { status: 500 });
  }
}
