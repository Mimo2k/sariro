/**
 * SARIRO — Student Dashboard v2 data layer
 *
 * Functions for:
 * - Lesson progress tracking (mark/unmark lessons as complete)
 * - Course progress calculation (X / Y lessons done)
 * - Drop course
 * - Fetch cohort materials URL
 * - Generate certificate data
 */

import { createClient } from '@/lib/supabase/client';
import { COURSES, TRACKS } from '@/lib/sariro-data';

export interface LessonProgressRow {
  id: string;
  module_num: string;
  lesson_name: string;
  completed_at: string;
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
}

export interface CertificateData {
  studentName: string;
  trackName: string;
  level: string;
  completedAt: string;
  enrollmentId: string;
}

/* ───── Fetch all lesson progress for an enrollment ───── */
export async function fetchLessonProgress(enrollmentId: string): Promise<LessonProgressRow[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('id, module_num, lesson_name, completed_at')
      .eq('enrollment_id', enrollmentId)
      .order('completed_at', { ascending: true });

    if (error) throw error;
    return (data || []) as LessonProgressRow[];
  } catch (err) {
    console.warn('[student-v2] fetchLessonProgress error:', err);
    return [];
  }
}

/* ───── Mark a lesson as complete (insert if not exists) ───── */
export async function markLessonComplete(
  enrollmentId: string,
  moduleNum: string,
  lessonName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        enrollment_id: enrollmentId,
        module_num: moduleNum,
        lesson_name: lessonName,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,enrollment_id,module_num,lesson_name',
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Unmark a lesson (remove from progress) ───── */
export async function unmarkLesson(
  enrollmentId: string,
  moduleNum: string,
  lessonName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('enrollment_id', enrollmentId)
      .eq('module_num', moduleNum)
      .eq('lesson_name', lessonName);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Calculate course progress ───── */
export function calculateProgress(
  track: string,
  level: string,
  completedLessons: LessonProgressRow[]
): CourseProgress {
  // Find the course in sariro-data to get total lesson count
  const course = COURSES.find(c => c.trackId === track && c.level === level);
  const totalLessons = course?.lessons ?? 0;

  return {
    totalLessons,
    completedLessons: completedLessons.length,
    percentage: totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0,
  };
}

/* ───── Get syllabus for a course (module + lesson names) ───── */
export function getCourseSyllabus(track: string, level: string): Array<{
  num: string;
  name: string;
  project: string;
  lessons: string[];
}> {
  const course = COURSES.find(c => c.trackId === track && c.level === level);
  if (!course || !('syllabus' in course)) return [];
  return course.syllabus as Array<{ num: string; name: string; project: string; lessons: string[] }>;
}

/* ───── Drop a course (set status to 'dropped') ───── */
export async function dropCourse(enrollmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('id', enrollmentId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Fetch cohort materials URL ───── */
export async function fetchCohortMaterials(cohortId: string | null): Promise<string | null> {
  if (!cohortId) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cohorts')
      .select('materials_url')
      .eq('id', cohortId)
      .maybeSingle();

    if (error) throw error;
    return data?.materials_url ?? null;
  } catch (err) {
    console.warn('[student-v2] fetchCohortMaterials error:', err);
    return null;
  }
}

/* ───── Fetch certificate data (for completed enrollments) ───── */
export async function fetchCertificateData(enrollmentId: string): Promise<CertificateData | null> {
  try {
    const supabase = createClient();

    // Fetch the enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (enrollErr) throw enrollErr;
    if (!enrollment || enrollment.status !== 'completed') return null;

    // Fetch the student's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', enrollment.user_id)
      .maybeSingle();

    const track = TRACKS.find(t => t.id === enrollment.track);
    const trackName = track?.name ?? enrollment.track;

    return {
      studentName: profile?.full_name || 'Student',
      trackName,
      level: enrollment.level,
      completedAt: enrollment.completed_at,
      enrollmentId: enrollment.id,
    };
  } catch (err) {
    console.warn('[student-v2] fetchCertificateData error:', err);
    return null;
  }
}
