import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // If this is the Matrix hardware calling, scrub the caching headers!
  if (request.nextUrl.pathname.startsWith("/api/matrix")) {
    response.headers.delete("x-nextjs-cache");
    response.headers.delete("x-middleware-cache");
    response.headers.delete("x-invoke-path");
  }

  return response;
}

// Only run this interceptor on the API routes to save server CPU
export const config = {
  matcher: "/api/:path*",
};
