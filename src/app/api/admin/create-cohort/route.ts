import { NextRequest, NextResponse } from 'next/server';
import { createServerClientHelper, createServiceClient } from '@/lib/supabase/server';

/**
 * SARIRO — POST /api/admin/create-cohort
 *
 * Body: { track, level, ratio, max_capacity? }
 *
 * Creates a new 'gathering' cohort. Uses the service-role client to
 * bypass RLS (the browser client can't INSERT into cohorts because
 * the RLS policy for INSERT might not correctly check admin role, or
 * the policy might be missing entirely).
 *
 * Auth: must be signed in as admin or super_admin.
 *
 * Level normalization: accepts both 'beginner' and 'Beginner' forms,
 * normalizes to capitalized ('Beginner') to match the rest of the
 * system (findGatheringCohort, confirmPurchaseIntent, etc. all use
 * capitalized levels).
 */

export const runtime = 'nodejs';

function normalizeLevel(level: string): string {
  if (!level) return 'Beginner';
  const lower = level.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export async function POST(req: NextRequest) {
  // ── Auth gate ───────────────────────────────────────────────────────
  let adminUser: { id: string } | null = null;
  try {
    const supaServer = await createServerClientHelper();
    const { data: { user } } = await supaServer.auth.getUser();
    adminUser = user;
  } catch {
    /* not signed in */
  }
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  // ── Verify admin role ───────────────────────────────────────────────
  let isAdmin = false;
  try {
    const supaServer = await createServerClientHelper();
    const { data: profile } = await supaServer
      .from('profiles')
      .select('role, is_admin, is_super_admin')
      .eq('id', adminUser.id)
      .maybeSingle();
    if (profile) {
      isAdmin = profile.role === 'admin' || profile.is_admin ||
                profile.role === 'super_admin' || profile.is_super_admin;
    }
  } catch (err) {
    console.warn('[create-cohort] profile lookup error:', err);
  }
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────────────────
  let body: { track?: string; level?: string; ratio?: string; max_capacity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const track = (body.track || '').trim();
  const level = normalizeLevel(body.level || 'beginner');
  const ratio = body.ratio === '1:1' ? '1:1' : '1:4';
  const maxCapacity = body.max_capacity ?? (ratio === '1:1' ? 1 : 4);

  if (!track) {
    return NextResponse.json({ ok: false, error: 'missing_track' }, { status: 400 });
  }

  // ── Service-role client (bypasses RLS) ──────────────────────────────
  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    console.error('[create-cohort] service client unavailable:', err);
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 500 });
  }

  // ── Insert the cohort ───────────────────────────────────────────────
  const { data, error } = await serviceClient
    .from('cohorts')
    .insert({
      track,
      level,
      ratio,
      max_capacity: maxCapacity,
      status: 'gathering',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[create-cohort] insert error:', error.message);
    return NextResponse.json(
      { ok: false, error: 'insert_failed', message: error.message },
      { status: 500 }
    );
  }

  // ── Best-effort audit log ───────────────────────────────────────────
  try {
    await serviceClient.from('admin_audit_logs').insert({
      admin_id: adminUser.id,
      action: 'create_cohort',
      target_type: 'cohort',
      target_id: data?.id,
      metadata: { track, level, ratio, max_capacity: maxCapacity },
    });
  } catch (err) {
    console.warn('[create-cohort] audit log failed:', err);
  }

  return NextResponse.json({
    ok: true,
    cohortId: data?.id,
  });
}

export async function GET() {
  return NextResponse.json({
    name: 'Sariro Create Cohort',
    description: 'Admin/super-admin creates a new gathering cohort.',
  });
}