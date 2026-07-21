import { createClient } from "redis";

// Define the structure of our token bucket algorithm response
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

// Keep a cached client outside the function scope so we don't open
// a new Redis connection on every single API request.
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://redis-cache:6379";
    redisClient = createClient({ url: redisUrl });

    redisClient.on("error", (err) =>
      console.error("Rate Limiter Redis Error:", err),
    );
    await redisClient.connect();
  }
  return redisClient;
}

/**
 * Token Bucket Rate Limiter
 * @param identifier Usually the IP address of the requester
 * @param limit Maximum requests allowed in the time window
 * @param windowInSeconds How long until the bucket resets
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowInSeconds: number = 60,
): Promise<RateLimitResult> {
  try {
    const client = await getRedisClient();
    const key = `rate_limit:${identifier}`;

    // Increment the counter for this IP address
    const currentCount = await client.incr(key);

    // If this is the first request, set the expiration timer (the "window")
    if (currentCount === 1) {
      await client.expire(key, windowInSeconds);
    }

    return {
      success: currentCount <= limit,
      limit: limit,
      remaining: Math.max(0, limit - currentCount),
    };
  } catch (error) {
    console.error(
      "Rate limiting failed, failing open to prevent outage:",
      error,
    );
    // If Redis crashes, we "fail open" (allow the request) so the app doesn't break
    return { success: true, limit, remaining: 1 };
  }
}
