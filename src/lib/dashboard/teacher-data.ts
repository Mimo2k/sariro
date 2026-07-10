/**
 * SARIRO — Teacher Dashboard data layer
 *
 * All Supabase queries for the teacher dashboard.
 * RLS policies ensure teachers only see bookings/cohorts assigned to them.
 *
 * supabase client is created INSIDE each function (not at module level)
 * to avoid SSR issues.
 */

import { createClient } from '@/lib/supabase/client';

export interface TeacherStats {
  classesThisWeek: number;
  activeStudents: number;
  hoursTaught: number; // sum of completed bookings duration in hours
}

export interface TeacherBookingRow {
  id: string;
  cohort_id: string;
  teacher_id: string;
  slot_start: string;
  slot_end: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  google_meet_url: string | null;
  // joined cohort info
  cohort_track: string;
  cohort_level: string;
  cohort_ratio: string;
  cohort_status: string;
  cohort_meet_url: string | null;
}

export interface TeacherStudentRow {
  enrollment_id: string;
  user_id: string;
  student_name: string | null;
  student_email: string | null;
  track: string;
  level: string;
  ratio: string;
  status: string;
  cohort_id: string | null;
  created_at: string;
}

/* ───── Get teacher's cohort IDs ───── */
export async function fetchTeacherCohortIds(): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bookings')
      .select('cohort_id')
      .eq('teacher_id', (await supabase.auth.getUser()).data.user?.id ?? '');

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // distinct cohort IDs
    return [...new Set(data.map(b => b.cohort_id).filter((id): id is string => !!id))];
  } catch (err) {
    console.warn('[teacher] fetchTeacherCohortIds error:', err);
    return [];
  }
}

/* ───── Stats ───── */
export async function fetchTeacherStats(): Promise<TeacherStats> {
  const stats: TeacherStats = {
    classesThisWeek: 0,
    activeStudents: 0,
    hoursTaught: 0,
  };

  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return stats;

    // Calculate week boundaries (Monday to Sunday)
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    // Classes this week (bookings where slot_start is in this week)
    const { count: weekCount, error: weekErr } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', userId)
      .gte('slot_start', monday.toISOString())
      .lt('slot_start', sunday.toISOString());

    if (weekErr) throw weekErr;
    stats.classesThisWeek = weekCount ?? 0;

    // Hours taught = sum of completed booking durations
    const { data: completed, error: completedErr } = await supabase
      .from('bookings')
      .select('slot_start, slot_end')
      .eq('teacher_id', userId)
      .eq('status', 'completed');

    if (completedErr) throw completedErr;
    if (completed && completed.length > 0) {
      const totalMs = completed.reduce((sum, b) => {
        const start = new Date(b.slot_start).getTime();
        const end = new Date(b.slot_end).getTime();
        return sum + Math.max(0, end - start);
      }, 0);
      stats.hoursTaught = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal
    }

    // Active students = count of distinct users in teacher's cohorts (active enrollments only)
    const cohortIds = await fetchTeacherCohortIds();
    if (cohortIds.length > 0) {
      const { count: studentCount, error: studentErr } = await supabase
        .from('enrollments')
        .select('user_id', { count: 'exact', head: true })
        .in('cohort_id', cohortIds)
        .eq('status', 'active');

      if (studentErr) throw studentErr;
      stats.activeStudents = studentCount ?? 0;
    }
  } catch (err) {
    console.warn('[teacher] stats fetch error:', err);
  }

  return stats;
}

/* ───── Bookings (schedule) ───── */
export async function fetchTeacherBookings(filter: 'upcoming' | 'past' | 'all' = 'upcoming'): Promise<TeacherBookingRow[]> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return [];

    const now = new Date().toISOString();
    let query = supabase
      .from('bookings')
      .select(`
        *,
        cohort:cohorts(*)
      `)
      .eq('teacher_id', userId)
      .order('slot_start', { ascending: filter === 'past' ? false : true });

    if (filter === 'upcoming') {
      query = query.gte('slot_start', now);
    } else if (filter === 'past') {
      query = query.lt('slot_start', now);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data.map(b => {
      const cohort = b.cohort as Record<string, unknown> | null;
      return {
        id: b.id,
        cohort_id: b.cohort_id,
        teacher_id: b.teacher_id,
        slot_start: b.slot_start,
        slot_end: b.slot_end,
        status: b.status,
        google_meet_url: b.google_meet_url,
        cohort_track: (cohort?.track as string) ?? '',
        cohort_level: (cohort?.level as string) ?? '',
        cohort_ratio: (cohort?.ratio as string) ?? '',
        cohort_status: (cohort?.status as string) ?? '',
        cohort_meet_url: (cohort?.google_meet_url as string) ?? null,
      };
    });
  } catch (err) {
    console.warn('[teacher] fetchTeacherBookings error:', err);
    return [];
  }
}

/* ───── Students (across all assigned cohorts) ───── */
export async function fetchTeacherStudents(): Promise<TeacherStudentRow[]> {
  try {
    const supabase = createClient();
    const cohortIds = await fetchTeacherCohortIds();
    if (cohortIds.length === 0) return [];

    // Fetch enrollments for teacher's cohorts
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .in('cohort_id', cohortIds)
      .neq('status', 'dropped')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!enrollments || enrollments.length === 0) return [];

    // Fetch profiles for those students
    const userIds = [...new Set(enrollments.map(e => e.user_id))];
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profileErr) throw profileErr;
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return enrollments.map(e => ({
      enrollment_id: e.id,
      user_id: e.user_id,
      student_name: profileMap.get(e.user_id)?.full_name ?? null,
      student_email: profileMap.get(e.user_id)?.email ?? null,
      track: e.track,
      level: e.level,
      ratio: e.ratio,
      status: e.status,
      cohort_id: e.cohort_id,
      created_at: e.created_at,
    }));
  } catch (err) {
    console.warn('[teacher] fetchTeacherStudents error:', err);
    return [];
  }
}

/* ───── Update booking status (mark complete / no-show / cancel) ───── */
export async function updateBookingStatus(
  bookingId: string,
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ════════════════════════════════════════════════════════════════
   v2 functions — per-student attendance, session notes,
   reschedule, add booking, student progress
   ════════════════════════════════════════════════════════════════ */

export interface SessionStudentRow {
  user_id: string;
  student_name: string | null;
  student_email: string | null;
  attendance_status: 'present' | 'absent' | 'late' | 'excused' | null;
  note: string | null;
  lessons_completed: number;
  total_lessons: number;
}

/* ───── Fetch students for a specific session (booking) ───── */
export async function fetchSessionStudents(bookingId: string): Promise<SessionStudentRow[]> {
  try {
    const supabase = createClient();

    // 1. Get the booking to find the cohort
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('cohort_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;
    if (!booking?.cohort_id) return [];

    // 2. Get all enrollments for that cohort
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('user_id, track, level')
      .eq('cohort_id', booking.cohort_id)
      .neq('status', 'dropped');

    if (enrollErr) throw enrollErr;
    if (!enrollments || enrollments.length === 0) return [];

    // 3. Fetch student profiles
    const userIds = enrollments.map(e => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // 4. Fetch attendance for this booking
    const { data: attendance } = await supabase
      .from('session_attendance')
      .select('student_id, status')
      .eq('booking_id', bookingId);

    const attendanceMap = new Map((attendance || []).map(a => [a.student_id, a.status]));

    // 5. Fetch notes for this booking
    const { data: notes } = await supabase
      .from('session_notes')
      .select('student_id, note')
      .eq('booking_id', bookingId);

    const notesMap = new Map((notes || []).map(n => [n.student_id, n.note]));

    // 6. Fetch lesson progress counts per student
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('user_id')
      .in('user_id', userIds);

    const progressCountMap = new Map<string, number>();
    (progress || []).forEach(p => {
      progressCountMap.set(p.user_id, (progressCountMap.get(p.user_id) ?? 0) + 1);
    });

    // 7. Get total lessons from COURSES
    const { COURSES } = await import('@/lib/sariro-data');

    return enrollments.map(e => {
      const profile = profileMap.get(e.user_id);
      const course = COURSES.find(c => c.trackId === e.track && c.level === e.level);
      return {
        user_id: e.user_id,
        student_name: profile?.full_name ?? null,
        student_email: profile?.email ?? null,
        attendance_status: (attendanceMap.get(e.user_id) as SessionStudentRow['attendance_status']) ?? null,
        note: notesMap.get(e.user_id) ?? null,
        lessons_completed: progressCountMap.get(e.user_id) ?? 0,
        total_lessons: course?.lessons ?? 0,
      };
    });
  } catch (err) {
    console.warn('[teacher-v2] fetchSessionStudents error:', err);
    return [];
  }
}

/* ───── Mark per-student attendance ───── */
export async function markAttendance(
  bookingId: string,
  studentId: string,
  status: 'present' | 'absent' | 'late' | 'excused'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('session_attendance')
      .upsert({
        booking_id: bookingId,
        student_id: studentId,
        status,
        marked_at: new Date().toISOString(),
        marked_by: userId,
      }, { onConflict: 'booking_id,student_id' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Save session note for a student ───── */
export async function saveSessionNote(
  bookingId: string,
  studentId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('session_notes')
      .upsert({
        booking_id: bookingId,
        student_id: studentId,
        teacher_id: userId,
        note,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'booking_id,student_id' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Reschedule a booking (change slot_start + slot_end) ───── */
export async function rescheduleBooking(
  bookingId: string,
  newSlotStart: string,
  newSlotEnd: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('bookings')
      .update({
        slot_start: newSlotStart,
        slot_end: newSlotEnd,
      })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Add a new booking (teacher creates extra session) ───── */
export async function createBooking(params: {
  cohortId: string;
  slotStart: string;
  slotEnd: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    // Get the cohort's meet URL
    const { data: cohort } = await supabase
      .from('cohorts')
      .select('google_meet_url')
      .eq('id', params.cohortId)
      .maybeSingle();

    const { error } = await supabase
      .from('bookings')
      .insert({
        cohort_id: params.cohortId,
        teacher_id: userId,
        slot_start: params.slotStart,
        slot_end: params.slotEnd,
        status: 'scheduled',
        google_meet_url: cohort?.google_meet_url || null,
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Fetch teacher's cohorts (for "add booking" dropdown) ───── */
export interface TeacherCohortRow {
  id: string;
  track: string;
  level: string;
  ratio: string;
  status: string;
}

export async function fetchTeacherCohorts(): Promise<TeacherCohortRow[]> {
  try {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return [];

    // Get distinct cohort IDs from teacher's bookings
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('cohort_id')
      .eq('teacher_id', userId);

    if (bErr) throw bErr;
    if (!bookings || bookings.length === 0) return [];

    const cohortIds = [...new Set(bookings.map(b => b.cohort_id).filter(Boolean))] as string[];
    if (cohortIds.length === 0) return [];

    const { data: cohorts, error: cErr } = await supabase
      .from('cohorts')
      .select('*')
      .in('id', cohortIds)
      .order('created_at', { ascending: false });

    if (cErr) throw cErr;
    return (cohorts || []) as TeacherCohortRow[];
  } catch (err) {
    console.warn('[teacher-v2] fetchTeacherCohorts error:', err);
    return [];
  }
}
