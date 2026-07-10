import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Razorpay Webhook Handler
 *
 * Razorpay sends a POST request here when a payment event occurs
 * (payment.captured, payment.failed, etc.).
 *
 * Configure in Razorpay dashboard:
 *   Webhook URL: https://yourdomain.com/api/razorpay/webhook
 *   Events: payment.captured, payment.failed
 *   Secret: set RAZORPAY_WEBHOOK_SECRET in your .env
 *
 * Flow:
 * 1. Razorpay sends event with signature in X-Razorpay-Signature header
 * 2. We verify the signature using RAZORPAY_WEBHOOK_SECRET
 * 3. If valid, we look up the matching purchase_intent by user_id + track + level
 *    (passed via custom notes field when payment was created)
 * 4. We mark the purchase_intent as 'confirmed' and create the enrollment
 *
 * NOTE: Razorpay Payment Pages (links) don't send webhooks by default —
 * they require Razorpay Standard (API-based) for full webhook support.
 * For Payment Pages, the admin manually confirms enrollments in the
 * admin dashboard (which is already wired up).
 *
 * This handler is here for when you upgrade to Razorpay Standard API.
 */

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Service-role Supabase client (bypasses RLS for server-side writes)
// Only created if env vars are present
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  // 1. Read raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // 2. Verify signature (only if secret is configured)
  if (RAZORPAY_WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[razorpay-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification');
  }

  // 3. Parse the event
  let event: RazorpayEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event;
  const payment = event.payload?.payment?.entity;

  if (!payment) {
    return NextResponse.json({ error: 'No payment entity' }, { status: 400 });
  }

  // 4. Get admin supabase client
  const adminSupabase = getAdminSupabase();
  if (!adminSupabase) {
    console.warn('[razorpay-webhook] Supabase service role not configured');
    return NextResponse.json({ received: true, note: 'supabase not configured' });
  }

  // 5. Extract user_id + track + level from payment notes
  // (These must be set when creating the Razorpay order — see Razorpay Standard API docs)
  const notes = payment.notes || {};
  const userId = notes.user_id;
  const track = notes.track;
  const level = notes.level;
  const ratio = notes.ratio || '1:4';

  if (!userId || !track || !level) {
    console.warn('[razorpay-webhook] Missing notes — cannot match enrollment', { notes });
    return NextResponse.json({ received: true, note: 'missing notes' });
  }

  // 6. Handle the event
  try {
    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      // Find the pending purchase intent
      const { data: intent, error: findErr } = await adminSupabase
        .from('purchase_intents')
        .select('*')
        .eq('user_id', userId)
        .eq('track', track)
        .eq('level', level)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr || !intent) {
        console.warn('[razorpay-webhook] No matching pending intent', { userId, track, level });
        return NextResponse.json({ received: true, note: 'no matching intent' });
      }

      // Find or create a gathering cohort
      const { data: cohort } = await adminSupabase
        .from('cohorts')
        .select('id')
        .eq('track', track)
        .eq('level', level)
        .eq('ratio', ratio)
        .eq('status', 'gathering')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let cohortId = cohort?.id;

      if (!cohortId) {
        // Create a new gathering cohort
        const { data: newCohort, error: newCohortErr } = await adminSupabase
          .from('cohorts')
          .insert({
            track, level, ratio,
            max_capacity: ratio === '1:1' ? 1 : 4,
            status: 'gathering',
          })
          .select('id')
          .single();
        if (newCohortErr) throw newCohortErr;
        cohortId = newCohort?.id;
      }

      if (!cohortId) {
        throw new Error('Failed to find or create cohort');
      }

      // Create the enrollment
      const { error: enrollErr } = await adminSupabase
        .from('enrollments')
        .insert({
          user_id: userId,
          track, level, ratio,
          status: 'active',
          cohort_id: cohortId,
          started_at: new Date().toISOString(),
        });

      if (enrollErr) throw enrollErr;

      // Mark the purchase intent as confirmed
      const { error: piErr } = await adminSupabase
        .from('purchase_intents')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', intent.id);

      if (piErr) throw piErr;

      // Log to audit
      await adminSupabase.from('admin_audit_logs').insert({
        admin_id: userId, // system-generated, use the user's own ID
        action: 'webhook_enrollment_confirmed',
        target_type: 'enrollment',
        metadata: {
          payment_id: payment.id,
          track, level, ratio,
          amount: payment.amount,
          cohort_id: cohortId,
        },
      });

      console.log('[razorpay-webhook] Enrollment confirmed for', { userId, track, level });
    } else if (eventType === 'payment.failed') {
      // Mark the purchase intent as expired
      await adminSupabase
        .from('purchase_intents')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('track', track)
        .eq('level', level)
        .eq('status', 'pending');

      console.log('[razorpay-webhook] Payment failed for', { userId, track, level });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[razorpay-webhook] Error processing event:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Razorpay event types
interface RazorpayEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        notes?: Record<string, string>;
      };
    };
  };
}

// GET handler for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'razorpay',
    configured: !!RAZORPAY_WEBHOOK_SECRET,
    note: RAZORPAY_WEBHOOK_SECRET
      ? 'Webhook secret configured. POST events from Razorpay to this URL.'
      : 'RAZORPAY_WEBHOOK_SECRET not set. Set it in .env to enable signature verification.',
  });
}
