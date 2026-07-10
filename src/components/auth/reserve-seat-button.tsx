'use client';

import { useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { LoginGateModal } from '@/components/auth/login-gate-modal';

interface ReserveSeatButtonProps {
  /** Track ID (e.g. "web", "app", "saas") */
  track: string;
  /** Level with capital first letter: "Beginner" | "Intermediate" | "Advanced" */
  level: string;
  /** "1:4" or "1:1" */
  ratio: '1:4' | '1:1';
  /** Pre-computed Razorpay URL */
  paymentLink: string;
  /** Course display name for the modal context */
  courseName: string;
  /** Background color for the button (matches tier accent) */
  accentColor: string;
  /** Optional className override */
  className?: string;
}

/**
 * ReserveSeatButton
 *
 * Replaces the old `<a href={paymentLink}>` pattern.
 *
 * Flow:
 * 1. User clicks "Reserve your seat"
 * 2. If NOT logged in → show LoginGateModal ("You'll need an account...")
 * 3. If logged in → create a `purchase_intent` row in Supabase
 *    (so admin sees this student in their approval queue after payment)
 * 4. Open Razorpay payment link in new tab
 *
 * Why purchase_intent BEFORE Razorpay:
 *   - If student pays but never comes back (closes tab), admin still has a record
 *   - If student pays and Razorpay webhook fires later, we match by user_id + track + level
 *   - If student abandons at Razorpay, admin sees an expired intent (no harm)
 */
export function ReserveSeatButton({
  track, level, ratio, paymentLink, courseName, accentColor, className,
}: ReserveSeatButtonProps) {
  const { user } = useAuth();
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);

    // Step 1: Login gate
    if (!user) {
      setShowLoginGate(true);
      return;
    }

    // Step 2: Create purchase_intent in Supabase
    setProcessing(true);
    try {
      const supabase = createClient();
      const { error: piError } = await supabase.from('purchase_intents').insert({
        user_id: user.id,
        track,
        level,
        ratio,
        razorpay_link: paymentLink,
        status: 'pending',
      });

      if (piError) {
        // Don't block the user — they still need to pay.
        // Log it, but proceed to Razorpay. Admin can reconcile manually.
        console.warn('[reserve-seat] purchase_intent insert failed:', piError.message);
      }
    } catch (err) {
      console.warn('[reserve-seat] exception creating intent:', err);
      // Non-blocking — still redirect to Razorpay
    } finally {
      setProcessing(false);
    }

    // Step 3: Open Razorpay with return URL to our success page
    // Razorpay keeps the user on their page after payment, but our success page
    // is reachable via "Back to merchant" button + we link to it from the
    // purchase intent confirmation email (if/when email is wired).
    // For now, open Razorpay in same window so the back button returns here.
    const successUrl = `${window.location.origin}/payment-success?track=${encodeURIComponent(track)}&level=${encodeURIComponent(level)}&ratio=${encodeURIComponent(ratio)}`;
    // Append return_url if Razorpay supports it on payment pages
    const finalLink = paymentLink.includes('?')
      ? `${paymentLink}&return_url=${encodeURIComponent(successUrl)}`
      : `${paymentLink}?return_url=${encodeURIComponent(successUrl)}`;
    window.location.href = finalLink;
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={processing}
        className={className ?? 'btn-tactile btn-tactile-primary w-full px-6 py-4 text-base'}
        style={{ background: accentColor }}
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ShieldCheck className="w-5 h-5" />
        )}
        Reserve your seat
        <ArrowRight className="w-5 h-5" />
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-2 text-center">{error}</p>
      )}

      <LoginGateModal
        open={showLoginGate}
        onClose={() => setShowLoginGate(false)}
        nextPath={typeof window !== 'undefined' ? window.location.pathname : '/'}
        courseName={courseName}
      />
    </>
  );
}
