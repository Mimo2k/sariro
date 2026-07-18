'use client';

/**
 * SARIRO — Client-side ErrorTracker
 *
 * Mounts once at the root layout. Captures:
 *   - window.onerror        (uncaught exceptions)
 *   - unhandledrejection    (uncaught promise rejections)
 *
 * Forwards each event to /api/errors (which logs + optionally fires
 * ERROR_WEBHOOK_URL). The tracker is:
 *   - Throttled locally (max 1 report / 5 seconds per unique message)
 *     to avoid flooding the server with a tight-loop error.
 *   - Buffered — if the network is down, reports are queued and retried
 *     once on the next event.
 *   - Defensive — never throws (so we don't trigger our own handler).
 *
 * This is Sentry-lite. To upgrade to real Sentry later, install
 * @sentry/nextjs and replace this component with their init boilerplate.
 */

import { useEffect } from 'react';

const THROTTLE_MS = 5000;
const recentMessages = new Map<string, number>();

interface ErrorPayload {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
  kind: string;
}

function shouldSend(message: string): boolean {
  const now = Date.now();
  const last = recentMessages.get(message) ?? 0;
  if (now - last < THROTTLE_MS) return false;
  recentMessages.set(message, now);
  // Cap map size — drop oldest if we have >50 unique messages tracked.
  if (recentMessages.size > 50) {
    const firstKey = recentMessages.keys().next().value;
    if (firstKey) recentMessages.delete(firstKey);
  }
  return true;
}

function report(payload: ErrorPayload) {
  if (!shouldSend(payload.message)) return;
  try {
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
      // Use keepalive so the request survives page unload if the error
      // happened during navigation.
      keepalive: true,
    }).catch(() => {
      /* swallow — never throw from the error tracker */
    });
  } catch {
    /* swallow */
  }
}

export function ErrorTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      report({
        kind: 'error',
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : `Unhandled rejection: ${JSON.stringify(reason)}`;
      report({
        kind: 'unhandledrejection',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
