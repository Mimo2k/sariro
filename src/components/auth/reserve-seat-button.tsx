'use client';

/**
 * SARIRO — ReserveSeatButton
 *
 * Thin wrapper around RazorpayCheckoutButton that preserves the existing
 * import surface (`ReserveSeatButton`) used by /checkout, /course-path/[id],
 * and other entry points.
 *
 * The actual Razorpay Standard API flow lives in razorpay-checkout.tsx.
 * This file is kept so we don't have to touch every consumer.
 */

import { RazorpayCheckoutButton } from '@/components/auth/razorpay-checkout';

interface ReserveSeatButtonProps {
  track: string;
  level: string;
  ratio: '1:4' | '1:1';
  paymentLink: string;
  courseName: string;
  accentColor: string;
  className?: string;
}

export function ReserveSeatButton(props: ReserveSeatButtonProps) {
  return <RazorpayCheckoutButton {...props} />;
}
