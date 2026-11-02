import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const envBase =
    process.env.INTERNAL_ALERTS_API_URL || process.env.FASTAPI_INTERNAL_URL;

  // Ordered candidate list for container bridge and local host resolution
  const candidateUrls = [
    envBase ? `${envBase.replace(/\/$/, "")}/api/v1/telemetry/current` : null,
    "http://forrad-alerts:8000/api/v1/telemetry/current",
    "http://forrad_alerts_api:8000/api/v1/telemetry/current",
    "http://127.0.0.1:8000/api/v1/telemetry/current",
  ].filter(Boolean) as string[];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }
    } catch {
      // Try next candidate URL in bridge network
      continue;
    }
  }

  return NextResponse.json(
    {
      error: "Upstream telemetry service unreachable on port 8000",
      status: "degraded",
    },
    {
      status: 502,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}
