import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await checkRateLimit(ip, 20, 60);

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} on /api/nws-data`);
      return NextResponse.json(
        { error: "Rate limit exceeded for NWS data." },
        { status: 429 },
      );
    }
    // Dynamically pull the Proxy URL from .env
    const baseUrl = process.env.INTERNAL_WEATHER_PROXY_URL;
    const targetUrl = `${baseUrl}/nws-data`;

    const res = await fetch(targetUrl, { cache: "no-store" });

    if (!res.ok) throw new Error(`Proxy responded with status: ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("NWS Data Bridge Error:", error);
    return NextResponse.json({ error: "Failed to load NWS data", status: 500 });
  }
}
