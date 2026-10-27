import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await checkRateLimit(ip, 15, 60); // Alerts check less frequently, restrict to 15/min

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} on /api/alerts`);
      return NextResponse.json(
        { error: "Rate limit exceeded for active alerts." },
        { status: 429 },
      );
    }
    // Dynamically pull the Proxy URL from .env
    const baseUrl =
      process.env.INTERNAL_ALERTS_API_URL || "http://forrad_alerts_api:8000";
    const targetUrl = `${baseUrl}/api/v1/alerts/active`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) throw new Error(`Proxy responded with status: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Alerts Bridge Error:", error);
    return NextResponse.json({
      error: "Failed to load active alerts",
      status: 500,
    });
  }
}
