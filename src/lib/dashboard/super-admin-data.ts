/**
 * SARIRO — Super-Admin Dashboard data layer
 *
 * Includes everything from admin-data.ts + audit log queries.
 */

import { createClient } from '@/lib/supabase/client';
import {
  fetchAdminStats, fetchPendingPurchaseIntents, fetchCohorts,
  confirmPurchaseIntent, rejectPurchaseIntent, transitionCohortStatus, createCohort,
  updateCohortMeetUrl, updateCohortMaterialsUrl,
} from '@/lib/dashboard/admin-data';

export {
  fetchAdminStats, fetchPendingPurchaseIntents, fetchCohorts,
  confirmPurchaseIntent, rejectPurchaseIntent, transitionCohortStatus, createCohort,
  updateCohortMeetUrl, updateCohortMaterialsUrl,
};

export interface AuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // joined from profiles
  admin_name: string | null;
  admin_email: string | null;
}

/* ───── Audit logs (with admin profile join) ───── */
export async function fetchAuditLogs(actionFilter?: string, limit = 50): Promise<AuditLogRow[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }

    const { data: logs, error } = await query;
    if (error) throw error;
    if (!logs || logs.length === 0) return [];

    // Fetch admin profiles
    const adminIds = [...new Set(logs.map(l => l.admin_id).filter(Boolean))] as string[];
    let adminMap = new Map<string, { full_name: string | null; email: string | null }>();

    if (adminIds.length > 0) {
      const { data: admins, error: adminErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds);

      if (!adminErr && admins) {
        adminMap = new Map(admins.map(a => [a.id, { full_name: a.full_name, email: a.email }]));
      }
    }

    return logs.map(l => ({
      id: l.id,
      admin_id: l.admin_id,
      action: l.action,
      target_type: l.target_type,
      target_id: l.target_id,
      metadata: l.metadata,
      created_at: l.created_at,
      admin_name: adminMap.get(l.admin_id)?.full_name ?? null,
      admin_email: adminMap.get(l.admin_id)?.email ?? null,
    }));
  } catch (err) {
    console.warn('[super-admin] fetchAuditLogs error:', err);
    return [];
  }
}

/* ───── Distinct audit log actions (for filter dropdown) ───── */
export async function fetchAuditActions(): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('action')
      .order('action', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return [...new Set(data.map(l => l.action))];
  } catch (err) {
    console.warn('[super-admin] fetchAuditActions error:', err);
    return [];
  }
}
