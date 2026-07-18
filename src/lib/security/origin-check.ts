import { NextRequest } from 'next/server';

/**
 * SARIRO — CSRF origin check
 *
 * Used by auth-gated POST/PUT/DELETE endpoints to verify the request
 * originated from the same site. Without this, a malicious site could
 * trigger fetch() calls on a logged-in user's behalf (the browser
 * attaches the auth cookie automatically via SameSite=Lax).
 *
 * How it works:
 *   1. Reads the `Origin` header (set automatically by browsers on
 *      cross-origin POST/PUT/DELETE). If absent, falls back to
 *      `Referer`.
 *   2. Compares the origin host to the expected site host (from
 *      NEXT_PUBLIC_SITE_URL → VERCEL_URL → request host).
 *   3. If they match → request is same-origin → allowed.
 *   4. If they don't match → 403 Forbidden.
 *
 * Why not a CSRF token?
 *   - SameSite=Lax cookies (Supabase default) already block most CSRF
 *     on top-level navigations. The remaining attack surface is
 *     cross-origin fetch() from a malicious site — origin checking
 *     closes that completely.
 *   - Token-based CSRF would require server-side state or signed
 *     tokens, doubling the complexity for no extra security.
 *
 * Why allow SameSite=None requests at all?
 *   - We DON'T. The cookie is SameSite=Lax, so cross-site requests
 *     don't carry it. This check is defense-in-depth: even if a cookie
 *     misconfig happens, the origin check still blocks the call.
 *
 * Webhooks are EXEMPT — they use signature verification instead.
 */

interface OriginCheckResult {
  ok: boolean;
  reason?: string;
  expected?: string;
  received?: string;
}

function getHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Returns the expected host for this deployment.
 * Order: NEXT_PUBLIC_SITE_URL → VERCEL_URL → request's Host header.
 */
function getExpectedHost(req: NextRequest): string | null {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const h = getHost(process.env.NEXT_PUBLIC_SITE_URL);
    if (h) return h;
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  // Fall back to the request's Host header (works in dev + most proxies).
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return hostHeader ?? null;
}

/**
 * Returns true if the request is same-origin (safe to proceed).
 * Returns false if cross-origin (CSRF suspected).
 *
 * For non-browser requests (curl, Postman, server-to-server) that omit
 * both Origin and Referer headers, we ALLOW the request — those callers
 * don't carry cookies anyway, so they can't CSRF. Real browsers always
 * set at least one of these headers on cross-origin requests.
 */
export function isSameOrigin(req: NextRequest): OriginCheckResult {
  const expected = getExpectedHost(req);
  if (!expected) {
    // Can't determine expected host — fail open (rare, only in misconfigured dev).
    return { ok: true, reason: 'no_expected_host' };
  }

  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');

  // No Origin AND no Referer → likely a non-browser request (curl, server).
  // These don't carry cookies, so they can't CSRF. Allow.
  if (!originHeader && !refererHeader) {
    return { ok: true, reason: 'no_origin_or_referer_non_browser' };
  }

  // Prefer Origin (more reliable, set on all cross-origin fetches).
  if (originHeader) {
    const received = getHost(originHeader);
    if (!received) {
      return { ok: false, reason: 'malformed_origin', expected, received: originHeader };
    }
    if (received === expected) {
      return { ok: true };
    }
    return { ok: false, reason: 'origin_mismatch', expected, received };
  }

  // Fall back to Referer.
  if (refererHeader) {
    const received = getHost(refererHeader);
    if (!received) {
      return { ok: false, reason: 'malformed_referer', expected, received: refererHeader };
    }
    if (received === expected) {
      return { ok: true };
    }
    return { ok: false, reason: 'referer_mismatch', expected, received };
  }

  // Shouldn't reach here (we'd have returned above), but defensive.
  return { ok: false, reason: 'unknown' };
}

/**
 * Helper — call this at the top of any auth-gated POST/PUT/DELETE.
 * Returns a 403 NextResponse if the origin check fails, or null if
 * the request is allowed.
 *
 * Usage:
 *   const csrfFail = assertSameOrigin(req);
 *   if (csrfFail) return csrfFail;
 */
export function assertSameOrigin(req: NextRequest): Response | null {
  const check = isSameOrigin(req);
  if (check.ok) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'cross_origin_blocked',
      reason: check.reason,
      expected: check.expected,
      received: check.received,
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
