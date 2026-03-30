// In-memory rate limiter (per-server instance)
// For production with multiple instances, use Redis instead

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number; // max requests per window
  windowMs: number;    // time window in milliseconds
}

export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes per IP
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  // API: 100 requests per minute per user
  api: { maxRequests: 100, windowMs: 60 * 1000 },
  // Create: 30 creates per minute per user
  create: { maxRequests: 30, windowMs: 60 * 1000 },
  // Export: 5 exports per 10 minutes
  export: { maxRequests: 5, windowMs: 10 * 60 * 1000 },
} as const;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
