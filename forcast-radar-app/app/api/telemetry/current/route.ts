// app/api/telemetry/route.ts
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter"; // Adjust path based on your folder depth

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";

    // DEV MODE: Set to 300 so React Strict Mode doesn't lock you out!
    const rateLimit = await checkRateLimit(ip, 300, 60);

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} on /api/telemetry/current`);
      return NextResponse.json(
        { error: "Rate limit exceeded for telemetry." },
        { status: 429 },
      );
    }

    // Call the internal Docker network name for your FastAPI container
    // Make sure 'forrad-alerts' matches your docker-compose.yml service name
    // Using the Docker internal DNS variable you mapped in docker-compose
    const baseUrl =
      process.env.INTERNAL_ALERTS_API_URL || "http://forrad-alerts:8000";
    const targetUrl = `${baseUrl}/api/v1/telemetry/current`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Upstream service failure: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Telemetry Bridge Error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with telemetry daemon." },
      { status: 502 },
    );
  }
}
