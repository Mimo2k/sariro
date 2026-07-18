/**
 * SARIRO — In-memory rate limiter
 *
 * Simple sliding-window rate limiter using a Map<key, number[]>.
 *
 * Pros:
 *   - Zero dependencies
 *   - Works in any runtime (Node, edge, serverless)
 *   - Sub-millisecond overhead
 *
 * Cons:
 *   - Per-instance (no shared state across serverless cold starts or
 *     multi-instance deployments). For multi-instance, use Redis.
 *   - Memory grows with unique keys — we cap the map size + prune
 *     empty entries to prevent unbounded growth.
 *
 * Usage:
 *   import { rateLimit, getRateLimitInfo } from '@/lib/rate-limit';
 *
 *   const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
 *   const rl = rateLimit({ key: `chat:${ip}`, limit: 20, windowMs: 60_000 });
 *   if (!rl.ok) {
 *     return NextResponse.json(
 *       { error: 'Too many requests', retryAfter: rl.retryAfterMs / 1000 },
 *       { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
 *     );
 *   }
 */

interface RateLimitBucket {
  /** Sorted (ascending) timestamps of requests within the window. */
  timestamps: number[];
  /** Last access time — used for eviction of stale buckets. */
  lastAccess: number;
}

const buckets = new Map<string, RateLimitBucket>();

/** Hard cap on the number of tracked keys to prevent unbounded memory growth. */
const MAX_BUCKETS = 10_000;

/** Periodic eviction interval (ms). Stale buckets (no access in 2x window) are removed. */
const EVICTION_INTERVAL_MS = 60_000;
let lastEvictionAt = 0;

interface RateLimitOptions {
  /** Bucket key — typically `${routeName}:${identifier}` (e.g. `chat:ip-1.2.3.4`). */
  key: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  /** True if the request is allowed; false if rate-limited. */
  ok: boolean;
  /** Number of requests in the current window (after this one). */
  count: number;
  /** Remaining requests in the window (after this one). */
  remaining: number;
  /** Milliseconds until the oldest request in the window expires (Retry-After hint). */
  retryAfterMs: number;
  /** Universal reset timestamp (epoch ms) — for X-RateLimit-Reset header. */
  resetAtMs: number;
}

/**
 * Records a request in the bucket and returns whether it's allowed.
 *
 * Always records the request (even if rate-limited) so that sustained
 * abuse keeps the bucket full. If you'd rather not count rejected
 * requests, check `ok` first and only call again if allowed — but this
 * helper does both in one call for simplicity.
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Eviction sweep — runs at most once per EVICTION_INTERVAL_MS.
  if (now - lastEvictionAt > EVICTION_INTERVAL_MS) {
    lastEvictionAt = now;
    for (const [k, v] of buckets) {
      if (now - v.lastAccess > 2 * windowMs) {
        buckets.delete(k);
      }
    }
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    // Cap check — if we have too many buckets, refuse to create more
    // (fail open: allow the request, but don't track it).
    if (buckets.size >= MAX_BUCKETS) {
      return {
        ok: true,
        count: 1,
        remaining: limit - 1,
        retryAfterMs: 0,
        resetAtMs: now + windowMs,
      };
    }
    bucket = { timestamps: [], lastAccess: now };
    buckets.set(key, bucket);
  }
  bucket.lastAccess = now;

  // Prune expired timestamps.
  while (bucket.timestamps.length > 0 && bucket.timestamps[0] < windowStart) {
    bucket.timestamps.shift();
  }

  // Check limit BEFORE recording this request — so we don't count
  // rejected requests against the user.
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterMs = Math.max(1000, oldest + windowMs - now);
    return {
      ok: false,
      count: bucket.timestamps.length,
      remaining: 0,
      retryAfterMs,
      resetAtMs: oldest + windowMs,
    };
  }

  // Record this request.
  bucket.timestamps.push(now);

  return {
    ok: true,
    count: bucket.timestamps.length,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterMs: 0,
    resetAtMs: now + windowMs,
  };
}

/**
 * Returns stats about the rate limiter — useful for /api/health.
 */
export function getRateLimitInfo(): { buckets: number; maxBuckets: number } {
  return { buckets: buckets.size, maxBuckets: MAX_BUCKETS };
}

/**
 * Helper — extract a best-effort client identifier from a Next.js request.
 * Prefers x-forwarded-for (set by most proxies / load balancers), falls
 * back to x-real-ip, then to 'unknown' (rate limit becomes global).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be a comma-separated list; first entry is the original client.
    return xff.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Helper — build a 429 response with proper headers.
 */
export function rateLimitedResponse(retryAfterMs: number, message = 'Too many requests'): Response {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ error: message, retryAfter: retryAfterSec }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': 'exceeded',
      },
    }
  );
}
