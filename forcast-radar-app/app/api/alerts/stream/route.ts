import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const internalBaseUrl =
    process.env.INTERNAL_ALERTS_API_URL ||
    process.env.FASTAPI_INTERNAL_URL ||
    "http://forrad-alerts:5000";
  const upstreamUrl = `${internalBaseUrl}/api/v1/alerts/stream`;

  const abortController = new AbortController();

  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: abortController.signal,
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response(
        `event: error\ndata: {"error": "Upstream SSE unavailable (${upstreamResponse.status})"}\n\n`,
        {
          status: 502,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        }
      );
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      `event: error\ndata: {"error": "BFF SSE stream interrupted"}\n\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      }
    );
  }
}
