/**
 * SARIRO — Notifications data layer
 *
 * Fetch, mark as read, create notifications.
 * Used by the bell icon dropdown in DashboardLayout.
 */

import { createClient } from '@/lib/supabase/client';

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/* ───── Fetch notifications for current user ───── */
export async function fetchNotifications(unreadOnly = false): Promise<NotificationRow[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationRow[];
  } catch (err) {
    console.warn('[notifications] fetch error:', err);
    return [];
  }
}

/* ───── Count unread notifications ───── */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.warn('[notifications] count error:', err);
    return 0;
  }
}

/* ───── Mark a single notification as read ───── */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.warn('[notifications] markAsRead error:', err);
  }
}

/* ───── Mark all as read ───── */
export async function markAllAsRead(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
  } catch (err) {
    console.warn('[notifications] markAllAsRead error:', err);
  }
}

/* ───── Create a notification (used by admin actions) ───── */
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
    });
  } catch (err) {
    console.warn('[notifications] create error:', err);
  }
}

/* ───── Format relative time (e.g. "2h ago", "just now") ───── */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ───── Get icon name for notification type ───── */
export function getNotificationIcon(type: string): string {
  const map: Record<string, string> = {
    enrollment_confirmed: 'check',
    enrollment_rejected: 'x',
    session_scheduled: 'calendar',
    session_cancelled: 'x',
    session_rescheduled: 'edit',
    course_completed: 'award',
    course_activated: 'zap',
    payment_received: 'dollar',
    general: 'bell',
  };
  return map[type] || 'bell';
}
