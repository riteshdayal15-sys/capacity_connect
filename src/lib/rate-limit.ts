interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Evict stale entries periodically to prevent memory growth
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    });
  }, 60000);
  if (timer.unref) {
    timer.unref();
  }
}

/**
 * Standard in-memory sliding window rate limiter.
 * @param key Unique identifier (e.g. user ID or IP address)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: Math.max(0, entry.resetAt - now) };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetInMs: Math.max(0, entry.resetAt - now) };
}
