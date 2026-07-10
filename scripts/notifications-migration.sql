-- ════════════════════════════════════════════════════════════════
-- SARIRO — Notifications system migration
-- ════════════════════════════════════════════════════════════════
-- Creates:
-- 1. notifications table — per-user notifications
-- 2. RLS policies (students see own, admins see all)
-- 3. Indexes for fast lookups
--
-- Additive only. Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_notif_type CHECK (type IN (
    'enrollment_confirmed',
    'enrollment_rejected',
    'session_scheduled',
    'session_cancelled',
    'session_rescheduled',
    'course_completed',
    'course_activated',
    'payment_received',
    'general'
  ))
);

COMMENT ON TABLE public.notifications IS 'Per-user notifications. Created by system events (enrollment confirmed, session scheduled, etc.) or manually by admins.';

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin','super_admin')
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_admin_delete ON public.notifications;
CREATE POLICY notifications_admin_delete
  ON public.notifications FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('admin','super_admin'));

-- Verify
SELECT 'notifications table' AS check_name, COUNT(*) AS exists FROM information_schema.tables WHERE table_name = 'notifications';
-- Should return: notifications table | 1
