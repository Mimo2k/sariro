'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Cookie, Check, X, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'sariro-cookie-consent';
const COOKIE_NAME = 'sariro_cc';
const COOKIE_TTL_DAYS = 365;

/**
 * CookieConsent — bottom-of-screen banner card.
 * Stores choice in BOTH localStorage (instant) + cookie (server-readable).
 * Persists across navigation. Shown to all new visitors.
 *
 * Choices:
 *  - "accepted": full cookies allowed (analytics, essential, marketing)
 *  - "rejected": only essential cookies allowed
 *  - "essential": same as rejected (alias)
 */
function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function getStoredChoice(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredChoice(choice: 'accepted' | 'rejected') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
    // Dispatch a manual storage event so any same-tab listeners can react
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: choice }));
  } catch {
    /* ignore */
  }
  setCookie(COOKIE_NAME, choice, COOKIE_TTL_DAYS);
}

export default function CookieConsent() {
  // Start hidden; only show after mount if no choice is stored.
  // We use a deferred state update via requestAnimationFrame to avoid the
  // "setState in effect" lint rule (which flags synchronous calls).
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer mounted flag to next frame (avoids sync setState in effect)
    const m = requestAnimationFrame(() => setMounted(true));
    const existing = getStoredChoice();
    if (existing) {
      return () => cancelAnimationFrame(m);
    }
    // Slight delay so it doesn't clash with the cinematic intro (which lasts ~3.7s)
    const t = setTimeout(() => setVisible(true), 4200);
    return () => {
      cancelAnimationFrame(m);
      clearTimeout(t);
    };
  }, []);

  // Also listen for the manual storage event — if another tab chose, hide here too
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setVisible(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const accept = () => {
    setStoredChoice('accepted');
    setVisible(false);
  };

  const reject = () => {
    setStoredChoice('rejected');
    setVisible(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-1.5rem)] max-w-3xl"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFF 100%)',
              border: '1px solid rgba(37, 99, 235, 0.18)',
              boxShadow: '0 20px 60px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(37, 99, 235, 0.05)',
            }}
          >
            {/* Colorful top accent stripe */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: 'linear-gradient(90deg, #2563EB 0%, #7C3AED 33%, #16A34A 66%, #F59E0B 100%)',
              }}
            />

            {/* Close button */}
            <button
              onClick={reject}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
                >
                  <Cookie className="w-6 h-6" strokeWidth={2.2} />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base sm:text-lg font-extrabold text-slate-900 mb-1"
                    style={{ fontFamily: 'var(--font-jakarta)' }}
                  >
                    We use cookies
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sariro uses essential cookies to make the site work, plus analytics to understand what's helpful.
                    By clicking <span className="font-bold text-slate-900">Accept all</span>, you agree to our use of cookies.
                    Read our{' '}
                    <Link href="/contact" className="text-blue-600 font-bold underline hover:text-blue-700">
                      cookie policy
                    </Link>
                    .
                  </p>

                  {/* Trust strip */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                      Essential always on
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      GDPR-friendly
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-violet-600" />
                      Never sold
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={accept}
                      className="btn-tactile btn-tactile-primary px-5 py-2.5 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Accept all
                    </button>
                    <button
                      onClick={reject}
                      className="btn-tactile btn-tactile-light px-5 py-2.5 text-sm"
                    >
                      Essential only
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
