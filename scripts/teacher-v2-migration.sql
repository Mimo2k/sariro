-- ════════════════════════════════════════════════════════════════
-- SARIRO — Teacher Dashboard v2 migration
-- ════════════════════════════════════════════════════════════════
-- Adds:
-- 1. session_notes table — teacher notes per student per session
-- 2. session_attendance table — per-student attendance (present/absent/late)
-- 3. RLS policies for both
--
-- Additive only. Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. session_notes table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL,
  teacher_id      UUID NOT NULL,
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, student_id)
);

COMMENT ON TABLE public.session_notes IS 'Teacher notes per student per session. One note per student per session.';

CREATE INDEX IF NOT EXISTS idx_session_notes_booking ON public.session_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_student ON public.session_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_teacher ON public.session_notes(teacher_id);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_notes_select_own ON public.session_notes;
CREATE POLICY session_notes_select_own
  ON public.session_notes FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR teacher_id = auth.uid()
    OR student_id = auth.uid()
  );

DROP POLICY IF EXISTS session_notes_teacher_write ON public.session_notes;
CREATE POLICY session_notes_teacher_write
  ON public.session_notes FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR teacher_id = auth.uid()
  )
  WITH CHECK (
    public.current_user_role() IN ('admin','super_admin')
    OR teacher_id = auth.uid()
  );

-- ────────────────────────────────────────────────────────────────
-- 2. session_attendance table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'present',
  marked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by       UUID,
  UNIQUE(booking_id, student_id),
  CONSTRAINT chk_attendance_status CHECK (status IN ('present','absent','late','excused'))
);

COMMENT ON TABLE public.session_attendance IS 'Per-student attendance for each session. One row per student per booking.';

CREATE INDEX IF NOT EXISTS idx_attendance_booking ON public.session_attendance(booking_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.session_attendance(student_id);

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_select_own ON public.session_attendance;
CREATE POLICY attendance_select_own
  ON public.session_attendance FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR student_id = auth.uid()
    OR booking_id IN (SELECT id FROM public.bookings WHERE teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS attendance_teacher_write ON public.session_attendance;
CREATE POLICY attendance_teacher_write
  ON public.session_attendance FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR booking_id IN (SELECT id FROM public.bookings WHERE teacher_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() IN ('admin','super_admin')
    OR booking_id IN (SELECT id FROM public.bookings WHERE teacher_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────
-- 3. Verify
-- ────────────────────────────────────────────────────────────────
SELECT 'session_notes table' AS check_name, COUNT(*) AS exists FROM information_schema.tables WHERE table_name = 'session_notes'
UNION ALL
SELECT 'session_attendance table', COUNT(*) FROM information_schema.tables WHERE table_name = 'session_attendance';
-- Should return: session_notes table | 1, session_attendance table | 1
