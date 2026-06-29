'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ===============================================================
   GoogleOneTap — loads Google Identity Services script and renders
   the One Tap popup. On success, exchanges the ID token with
   Supabase to log the user in.
=============================================================== */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
          cancel: () => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
}

interface GooglePromptNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
  getDismissedReason(): string;
  getMomentType(): number;
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  locale?: string;
}

let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-identity-script');
    if (existing) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface GoogleOneTapProps {
  /** Show the One Tap popup automatically on mount. Default: false. */
  autoPrompt?: boolean;
  /** Render the Google button inside this container. */
  showButton?: boolean;
  /** Text on the Google button. */
  buttonText?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  /** Called when login succeeds. */
  onSuccess?: () => void;
  /** Called when login fails. */
  onError?: (err: string) => void;
}

export default function GoogleOneTap({
  autoPrompt = false,
  showButton = true,
  buttonText = 'continue_with',
  onSuccess,
  onError,
}: GoogleOneTapProps) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || clientId === 'PUT_YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.warn('[GoogleOneTap] NEXT_PUBLIC_GOOGLE_CLIENT_ID not set — skipping');
      // Use a microtask to defer the setState (avoids "set-state-in-effect" lint)
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    const supabase = createClient();

    const handleCredential = async (response: { credential: string }) => {
      try {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        });
        if (error) {
          console.error('[GoogleOneTap] Supabase sign-in error:', error.message);
          onError?.(error.message);
          return;
        }
        onSuccess?.();
      } catch (err) {
        console.error('[GoogleOneTap] exception:', err);
        onError?.(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    loadGoogleScript()
      .then(() => {
        if (!window.google) {
          console.error('[GoogleOneTap] Google Identity script loaded but window.google missing');
          setLoading(false);
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: false,
          context: buttonText === 'signup_with' ? 'signup' : 'signin',
          itp_support: true,
        });

        // Render the button if requested
        if (showButton && buttonContainerRef.current) {
          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: buttonText,
            shape: 'rectangular',
            width: 320,
          });
        }

        // Show the One Tap popup automatically if requested
        if (autoPrompt) {
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              // Reason: 'browser_not_supported' | 'missing_client_id' | 'invalid_request' | 'opt_out_or_no_session'
              console.log('[GoogleOneTap] Not displayed:', notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
              console.log('[GoogleOneTap] Skipped:', notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
              console.log('[GoogleOneTap] Dismissed:', notification.getDismissedReason());
            }
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('[GoogleOneTap] script load failed:', err);
        setLoading(false);
      });

    return () => {
      // Cleanup — cancel any pending One Tap prompt
      if (window.google) {
        try {
          window.google.accounts.id.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [clientId, autoPrompt, showButton, buttonText, onSuccess, onError]);

  if (!clientId || clientId === 'PUT_YOUR_GOOGLE_CLIENT_ID_HERE') {
    return null;
  }

  return (
    <>
      {loading && (
        <div className="text-xs text-slate-400 animate-pulse">Loading Google…</div>
      )}
      <div ref={buttonContainerRef} className={showButton ? '' : 'hidden'} />
    </>
  );
}
