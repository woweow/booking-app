import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

function createRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function createLimiter(
  windowSize: number,
  windowUnit: "ms" | "s" | "m" | "h" | "d",
  maxRequests: number,
  prefix: string
): Ratelimit | null {
  const redis = createRedis();
  if (!redis) return null;

  const window = `${windowSize} ${windowUnit}` as Parameters<typeof Ratelimit.slidingWindow>[1];
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix: `ratelimit:${prefix}`,
    analytics: true,
  });
}

export const loginRateLimiter = createLimiter(15, "m", 5, "login");
export const registrationRateLimiter = createLimiter(60, "m", 3, "register");
export const passwordResetRateLimiter = createLimiter(60, "m", 3, "password-reset");
export const apiRateLimiter = createLimiter(1, "m", 100, "api");
export const paymentRateLimiter = createLimiter(60, "m", 10, "payment");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) {
    console.warn("Rate limiting not configured (missing Redis credentials)");
    return null;
  }

  try {
    const { success, reset } = await limiter.limit(identifier);

    if (!success) {
      const retryAfterMs = reset - Date.now();
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", retryAfter: retryAfterSeconds },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        }
      );
    }

    return null;
  } catch (error) {
    // Fail-open: if Redis is unavailable, allow the request
    console.error("Rate limiting error:", error);
    return null;
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "127.0.0.1";
}
