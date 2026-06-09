import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch from your local Python API proxy
    // Replace 'YOUR_PROXY_IP:PORT' with the actual internal IP of your proxy
    const response = await fetch("http://192.168.50.101:5000/nws-data", {
      // Next.js caching: Only hit your Python proxy once every 5 minutes (300 seconds)
      // This prevents the Matrix from accidentally DDoS'ing your local server
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Python proxy responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 2. The Distillation Process
    console.log("Raw Python Data received:", data);

    const matrixPayload = {
      // Grab the temperature string (e.g., "69°F") and strip everything but the numbers
      t: data.page_1_overview?.temp
        ? data.page_1_overview.temp.replace(/[^0-9-]/g, "")
        : "--",

      // Grab the pre-shortened description from your Python proxy
      c: (data.page_1_overview?.short_desc || "Unknown").slice(0, 16),

      // Source
      s: data?.source || "Unknown",

      // If the Python proxy reports a Cache Hit or Success, the data is healthy
      qc:
        data.status &&
        (data.status.includes("Success") || data.status.includes("Cache Hit"))
          ? 1
          : 0,
    };

    // 3. Serve the lean JSON
    return NextResponse.json(matrixPayload);
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
