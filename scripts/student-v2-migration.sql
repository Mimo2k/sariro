-- ════════════════════════════════════════════════════════════════
-- SARIRO — Student Dashboard v2 migration
-- ════════════════════════════════════════════════════════════════
-- Adds:
-- 1. lesson_progress table — track which lessons a student has completed
-- 2. materials_url column on cohorts — link to recordings/slides/repo
-- 3. RLS policies for both
--
-- Additive only. Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. lesson_progress table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  enrollment_id   UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  module_num      TEXT NOT NULL,
  lesson_name     TEXT NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, enrollment_id, module_num, lesson_name)
);

COMMENT ON TABLE public.lesson_progress IS 'Tracks which lessons a student has marked as complete. Used for progress bars + checklists.';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any (idempotent)
DROP POLICY IF EXISTS lesson_progress_select_own ON public.lesson_progress;
DROP POLICY IF EXISTS lesson_progress_insert_own ON public.lesson_progress;
DROP POLICY IF EXISTS lesson_progress_delete_own ON public.lesson_progress;

-- Students can see their own progress. Teachers can see progress for students in their cohorts. Admins see all.
CREATE POLICY lesson_progress_select_own
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin','super_admin')
    OR user_id = auth.uid()
    OR enrollment_id IN (
      SELECT e.id FROM public.enrollments e
      WHERE e.cohort_id IN (
        SELECT cohort_id FROM public.bookings WHERE teacher_id = auth.uid()
      )
    )
  );

-- Students can insert their own progress (mark lessons done)
CREATE POLICY lesson_progress_insert_own
  ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can delete their own progress (unmark lessons)
CREATE POLICY lesson_progress_delete_own
  ON public.lesson_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- 2. materials_url column on cohorts
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS materials_url TEXT;
COMMENT ON COLUMN public.cohorts.materials_url IS 'Link to course materials (Google Drive folder with recordings, slides, code repo). Set by admin when cohort activates.';

-- ────────────────────────────────────────────────────────────────
-- 3. Verify
-- ────────────────────────────────────────────────────────────────
SELECT 'lesson_progress table' AS check, COUNT(*) FROM information_schema.tables WHERE table_name = 'lesson_progress'
UNION ALL
SELECT 'materials_url column', COUNT(*) FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'materials_url';
-- Should return: lesson_progress table | 1, materials_url column | 1
