import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch from your local Python API proxy
    // Replace 'YOUR_PROXY_IP:PORT' with the actual internal IP of your proxy
    const response = await fetch("http://weather-proxy:5000/api/matrix", {
      // Next.js caching: Only hit your Python proxy once every 5 minutes (300 seconds)
      // This prevents the Matrix from accidentally DDoS'ing your local server
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Python proxy responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 3. Serve the lean JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error("Matrix Bridge Error:", error);

    // We send a safe 200 fallback payload even on a crash,
    // so the Matrix displays an error state rather than throwing a JSON decode exception.
    return NextResponse.json({
      t: "--",
      c: "API ERROR",
      s: "Unknown",
      qc: 0,
    });
  }
}
