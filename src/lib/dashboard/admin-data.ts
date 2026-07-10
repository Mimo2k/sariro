/**
 * SARIRO — Admin Dashboard data layer
 * 
 * All Supabase queries for the admin dashboard.
 * RLS policies ensure only admin/super_admin can read these.
 * 
 * NOTE: supabase client is created INSIDE each function (not at module level)
 * to avoid SSR issues — createBrowserClient must run in the browser only.
 */

import { createClient } from '@/lib/supabase/client';

export interface AdminStats {
  totalUsers: number;
  totalEnrollments: number;
  pendingPurchaseIntents: number;
  activeCohorts: number;
  totalCohorts: number;
  revenue: number;
}

export interface PurchaseIntentRow {
  id: string;
  user_id: string;
  track: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  ratio: '1:1' | '1:4';
  razorpay_link: string | null;
  status: 'pending' | 'confirmed' | 'expired';
  created_at: string;
  confirmed_at: string | null;
  student_name: string | null;
  student_email: string | null;
}

export interface CohortRow {
  id: string;
  track: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  ratio: '1:1' | '1:4';
  status: 'gathering' | 'ready' | 'active' | 'completed';
  max_capacity: number;
  google_meet_url: string | null;
  created_at: string;
  activated_at: string | null;
  completed_at: string | null;
  student_count: number;
}

/* ───── Stats ───── */
export async function fetchAdminStats(): Promise<AdminStats> {
  const stats: AdminStats = {
    totalUsers: 0,
    totalEnrollments: 0,
    pendingPurchaseIntents: 0,
    activeCohorts: 0,
    totalCohorts: 0,
    revenue: 0,
  };

  try {
    const supabase = createClient();
    const [usersRes, enrollmentsRes, piRes, cohortsRes, activeCohortsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      supabase.from('purchase_intents').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('cohorts').select('id', { count: 'exact', head: true }),
      supabase.from('cohorts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    stats.totalUsers = usersRes.count ?? 0;
    stats.totalEnrollments = enrollmentsRes.count ?? 0;
    stats.pendingPurchaseIntents = piRes.count ?? 0;
    stats.totalCohorts = cohortsRes.count ?? 0;
    stats.activeCohorts = activeCohortsRes.count ?? 0;
  } catch (err) {
    console.warn('[admin] stats fetch error:', err);
  }

  return stats;
}

/* ───── Pending purchase intents (enrollment approval queue) ───── */
export async function fetchPendingPurchaseIntents(): Promise<PurchaseIntentRow[]> {
  try {
    const supabase = createClient();
    const { data: intents, error } = await supabase
      .from('purchase_intents')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!intents || intents.length === 0) return [];

    const userIds = [...new Set(intents.map(i => i.user_id))];
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profileErr) throw profileErr;

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return intents.map(i => ({
      id: i.id,
      user_id: i.user_id,
      track: i.track,
      level: i.level,
      ratio: i.ratio,
      razorpay_link: i.razorpay_link,
      status: i.status,
      created_at: i.created_at,
      confirmed_at: i.confirmed_at,
      student_name: profileMap.get(i.user_id)?.full_name ?? null,
      student_email: profileMap.get(i.user_id)?.email ?? null,
    }));
  } catch (err) {
    console.warn('[admin] fetchPendingPurchaseIntents error:', err);
    return [];
  }
}

/* ───── Cohorts (with student count) ───── */
export async function fetchCohorts(statusFilter?: string): Promise<CohortRow[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('cohorts').select('*').order('created_at', { ascending: false });
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data: cohorts, error } = await query;
    if (error) throw error;
    if (!cohorts || cohorts.length === 0) return [];

    const cohortIds = cohorts.map(c => c.id);
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('cohort_id')
      .in('cohort_id', cohortIds)
      .not('status', 'eq', 'dropped');

    if (enrollErr) throw enrollErr;

    const countMap = new Map<string, number>();
    (enrollments || []).forEach(e => {
      if (e.cohort_id) {
        countMap.set(e.cohort_id, (countMap.get(e.cohort_id) ?? 0) + 1);
      }
    });

    return cohorts.map(c => ({
      id: c.id,
      track: c.track,
      level: c.level,
      ratio: c.ratio,
      status: c.status,
      max_capacity: c.max_capacity,
      google_meet_url: c.google_meet_url,
      created_at: c.created_at,
      activated_at: c.activated_at,
      completed_at: c.completed_at,
      student_count: countMap.get(c.id) ?? 0,
    }));
  } catch (err) {
    console.warn('[admin] fetchCohorts error:', err);
    return [];
  }
}

/* ───── Find a matching gathering cohort for an intent ───── */
export async function findGatheringCohort(
  track: string,
  level: string,
  ratio: string
): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cohorts')
      .select('id, max_capacity')
      .eq('track', track)
      .eq('level', level)
      .eq('ratio', ratio)
      .eq('status', 'gathering')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.warn('[admin] findGatheringCohort error:', err);
    return null;
  }
}

/* ───── Create a new gathering cohort ───── */
export async function createCohort(params: {
  track: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  ratio: '1:1' | '1:4';
  max_capacity: number;
}): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cohorts')
      .insert({
        track: params.track,
        level: params.level,
        ratio: params.ratio,
        max_capacity: params.max_capacity,
        status: 'gathering',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    console.warn('[admin] createCohort error:', err);
    return null;
  }
}

/* ───── Confirm a purchase intent → create enrollment ───── */
export async function confirmPurchaseIntent(intent: PurchaseIntentRow): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    // 1. Find or create a gathering cohort
    let cohortId = await findGatheringCohort(intent.track, intent.level, intent.ratio);
    if (!cohortId) {
      cohortId = await createCohort({
        track: intent.track,
        level: intent.level,
        ratio: intent.ratio,
        max_capacity: intent.ratio === '1:1' ? 1 : 4,
      });
    }
    if (!cohortId) {
      return { success: false, error: 'Failed to find or create cohort' };
    }

    // 2. Create the enrollment
    const { error: enrollErr } = await supabase
      .from('enrollments')
      .insert({
        user_id: intent.user_id,
        track: intent.track,
        level: intent.level,
        ratio: intent.ratio,
        status: 'active',
        cohort_id: cohortId,
        started_at: new Date().toISOString(),
      });

    if (enrollErr) throw enrollErr;

    // 3. Mark the purchase intent as confirmed
    const { error: piErr } = await supabase
      .from('purchase_intents')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', intent.id);

    if (piErr) throw piErr;

    // 4. Create a notification for the student
    await supabase.from('notifications').insert({
      user_id: intent.user_id,
      type: 'enrollment_confirmed',
      title: 'Enrollment confirmed!',
      message: `Your enrollment in ${intent.track} (${intent.level}, ${intent.ratio}) has been confirmed. Check your dashboard for course details.`,
      link: '/dashboard/student',
      is_read: false,
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[admin] confirmPurchaseIntent error:', err);
    return { success: false, error: msg };
  }
}

/* ───── Reject a purchase intent ───── */
export async function rejectPurchaseIntent(intentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('purchase_intents')
      .update({ status: 'expired' })
      .eq('id', intentId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Cohort state machine transitions ───── */
export async function transitionCohortStatus(
  cohortId: string,
  newStatus: 'gathering' | 'ready' | 'active' | 'completed',
  googleMeetUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const update: Record<string, string | null> = { status: newStatus };
    if (newStatus === 'active') {
      update.activated_at = new Date().toISOString();
      if (googleMeetUrl) update.google_meet_url = googleMeetUrl;
    }
    if (newStatus === 'completed') {
      update.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('cohorts')
      .update(update)
      .eq('id', cohortId);

    if (error) throw error;

    // If activating, notify all enrolled students
    if (newStatus === 'active') {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('cohort_id', cohortId)
        .neq('status', 'dropped');

      if (enrollments && enrollments.length > 0) {
        const notifs = enrollments.map(e => ({
          user_id: e.user_id,
          type: 'course_activated',
          title: 'Your course is now active!',
          message: 'Your cohort has been activated. Check your schedule for upcoming sessions and Google Meet links.',
          link: '/dashboard/student',
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifs);
      }
    }

    // If completing, notify all enrolled students
    if (newStatus === 'completed') {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('cohort_id', cohortId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const notifs = enrollments.map(e => ({
          user_id: e.user_id,
          type: 'course_completed',
          title: 'Course completed! 🎉',
          message: 'Congratulations! You\'ve completed your course. Check your dashboard for your certificate.',
          link: '/dashboard/student',
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifs);
      }
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Fetch all teachers (for assignment dropdown) ───── */
export interface TeacherRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export async function fetchTeachers(): Promise<TeacherRow[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or('role.eq.teacher,is_teacher.eq.true')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return (data || []) as TeacherRow[];
  } catch (err) {
    console.warn('[admin] fetchTeachers error:', err);
    return [];
  }
}

/* ───── Fetch bookings for a cohort (to see assigned teachers) ───── */
export interface CohortBookingRow {
  id: string;
  teacher_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  teacher_name: string | null;
  teacher_email: string | null;
}

export async function fetchCohortBookings(cohortId: string): Promise<CohortBookingRow[]> {
  try {
    const supabase = createClient();
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('cohort_id', cohortId)
      .order('slot_start', { ascending: true });

    if (error) throw error;
    if (!bookings || bookings.length === 0) return [];

    const teacherIds = [...new Set(bookings.map(b => b.teacher_id).filter(Boolean))] as string[];
    let teacherMap = new Map<string, { full_name: string | null; email: string | null }>();

    if (teacherIds.length > 0) {
      const { data: teachers, error: tErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', teacherIds);

      if (!tErr && teachers) {
        teacherMap = new Map(teachers.map(t => [t.id, { full_name: t.full_name, email: t.email }]));
      }
    }

    return bookings.map(b => ({
      id: b.id,
      teacher_id: b.teacher_id,
      slot_start: b.slot_start,
      slot_end: b.slot_end,
      status: b.status,
      teacher_name: teacherMap.get(b.teacher_id)?.full_name ?? null,
      teacher_email: teacherMap.get(b.teacher_id)?.email ?? null,
    }));
  } catch (err) {
    console.warn('[admin] fetchCohortBookings error:', err);
    return [];
  }
}

/* ───── Assign a teacher to a cohort (creates a booking) ───── */
export async function assignTeacherToCohort(params: {
  cohortId: string;
  teacherId: string;
  slotStart: string;
  slotEnd: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Fetch the cohort's meet URL to copy to the booking
    const { data: cohort } = await supabase
      .from('cohorts')
      .select('google_meet_url')
      .eq('id', params.cohortId)
      .maybeSingle();

    const { error } = await supabase
      .from('bookings')
      .insert({
        cohort_id: params.cohortId,
        teacher_id: params.teacherId,
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

/* ───── Remove a booking (unassign teacher from session) ───── */
export async function deleteBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ════════════════════════════════════════════════════════════════
   v2 functions — user management, cohort roster, manual enrollment,
   revenue, CSV export
   ════════════════════════════════════════════════════════════════ */

/* ───── User management ───── */
export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_student: boolean;
  is_teacher: boolean;
  is_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
  enrollment_count: number;
}

export async function fetchUsers(search?: string, roleFilter?: string): Promise<UserRow[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (roleFilter && roleFilter !== 'all') {
      if (roleFilter === 'student') query = query.eq('is_student', true);
      else if (roleFilter === 'teacher') query = query.eq('is_teacher', true);
      else if (roleFilter === 'admin') query = query.eq('is_admin', true);
      else if (roleFilter === 'super_admin') query = query.eq('is_super_admin', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Fetch enrollment counts
    const userIds = data.map(u => u.id);
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .in('user_id', userIds)
      .neq('status', 'dropped');

    const countMap = new Map<string, number>();
    (enrollments || []).forEach(e => {
      countMap.set(e.user_id, (countMap.get(e.user_id) ?? 0) + 1);
    });

    return data.map(u => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      is_student: u.is_student,
      is_teacher: u.is_teacher,
      is_admin: u.is_admin,
      is_super_admin: u.is_super_admin,
      created_at: u.created_at,
      enrollment_count: countMap.get(u.id) ?? 0,
    }));
  } catch (err) {
    console.warn('[admin-v2] fetchUsers error:', err);
    return [];
  }
}

/* ───── Change user role ───── */
export async function updateUserRole(
  userId: string,
  newRole: 'student' | 'teacher' | 'admin' | 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const update: Record<string, boolean | string | null> = {
      role: newRole,
      is_student: newRole === 'student',
      is_teacher: newRole === 'teacher',
      is_admin: newRole === 'admin',
      is_super_admin: newRole === 'super_admin',
    };

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Cohort roster (students in a specific cohort) ───── */
export interface CohortStudentRow {
  enrollment_id: string;
  user_id: string;
  student_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  level: string;
  ratio: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

export async function fetchCohortStudents(cohortId: string): Promise<CohortStudentRow[]> {
  try {
    const supabase = createClient();
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!enrollments || enrollments.length === 0) return [];

    const userIds = [...new Set(enrollments.map(e => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return enrollments.map(e => ({
      enrollment_id: e.id,
      user_id: e.user_id,
      student_name: profileMap.get(e.user_id)?.full_name ?? null,
      student_email: profileMap.get(e.user_id)?.email ?? null,
      student_phone: profileMap.get(e.user_id)?.phone ?? null,
      level: e.level,
      ratio: e.ratio,
      status: e.status,
      started_at: e.started_at,
      completed_at: e.completed_at,
    }));
  } catch (err) {
    console.warn('[admin-v2] fetchCohortStudents error:', err);
    return [];
  }
}

/* ───── Manual enrollment (admin bypasses payment) ───── */
export async function manualEnrollStudent(params: {
  userId: string;
  track: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  ratio: '1:1' | '1:4';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Find or create a gathering cohort
    let cohortId = await findGatheringCohort(params.track, params.level, params.ratio);
    if (!cohortId) {
      cohortId = await createCohort({
        track: params.track,
        level: params.level,
        ratio: params.ratio,
        max_capacity: params.ratio === '1:1' ? 1 : 4,
      });
    }
    if (!cohortId) return { success: false, error: 'Failed to find or create cohort' };

    // Create the enrollment directly
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: params.userId,
        track: params.track,
        level: params.level,
        ratio: params.ratio,
        status: 'active',
        cohort_id: cohortId,
        started_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/* ───── Revenue stats (from confirmed purchase intents) ───── */
export interface RevenueStats {
  totalRevenue: number;
  confirmedCount: number;
  pendingCount: number;
  byTier: { tier: string; count: number; revenue: number }[];
}

export async function fetchRevenueStats(): Promise<RevenueStats> {
  try {
    const supabase = createClient();

    // Fetch all confirmed + pending purchase intents
    const { data: intents, error } = await supabase
      .from('purchase_intents')
      .select('status, level, ratio')
      .in('status', ['confirmed', 'pending']);

    if (error) throw error;

    // Pricing (from app_settings or fallback to hardcoded)
    const prices: Record<string, number> = {
      beginner: 199,
      intermediate: 299,
      advanced: 699,
    };
    const premiumAddon = 100;

    let totalRevenue = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    const tierMap = new Map<string, { count: number; revenue: number }>();

    (intents || []).forEach(i => {
      const basePrice = prices[i.level] ?? 199;
      const finalPrice = i.ratio === '1:1' ? basePrice + premiumAddon : basePrice;

      if (i.status === 'confirmed') {
        totalRevenue += finalPrice;
        confirmedCount++;
      } else {
        pendingCount++;
      }

      const tierKey = `${i.level} ${i.ratio}`;
      const existing = tierMap.get(tierKey) ?? { count: 0, revenue: 0 };
      existing.count++;
      if (i.status === 'confirmed') existing.revenue += finalPrice;
      tierMap.set(tierKey, existing);
    });

    const byTier = Array.from(tierMap.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      revenue: data.revenue,
    }));

    return { totalRevenue, confirmedCount, pendingCount, byTier };
  } catch (err) {
    console.warn('[admin-v2] fetchRevenueStats error:', err);
    return { totalRevenue: 0, confirmedCount: 0, pendingCount: 0, byTier: [] };
  }
}

/* ───── CSV export helpers ───── */
function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportUsersCSV(): Promise<void> {
  const users = await fetchUsers();
  const rows: string[][] = [
    ['Name', 'Email', 'Phone', 'Role', 'Enrollments', 'Joined'],
    ...users.map(u => [
      u.full_name || '',
      u.email || '',
      u.phone || '',
      u.role || 'student',
      String(u.enrollment_count),
      new Date(u.created_at).toLocaleDateString(),
    ]),
  ];
  downloadCSV('sariro-users.csv', rows);
}

export async function exportEnrollmentsCSV(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const userIds = [...new Set((enrollments || []).map(e => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const rows: string[][] = [
      ['Student', 'Email', 'Track', 'Level', 'Ratio', 'Status', 'Started', 'Completed'],
      ...(enrollments || []).map(e => [
        profileMap.get(e.user_id)?.full_name || '',
        profileMap.get(e.user_id)?.email || '',
        e.track,
        e.level,
        e.ratio,
        e.status,
        e.started_at ? new Date(e.started_at).toLocaleDateString() : '',
        e.completed_at ? new Date(e.completed_at).toLocaleDateString() : '',
      ]),
    ];
    downloadCSV('sariro-enrollments.csv', rows);
  } catch (err) {
    console.warn('[admin-v2] exportEnrollmentsCSV error:', err);
  }
}

export async function exportRevenueCSV(): Promise<void> {
  const stats = await fetchRevenueStats();
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Total Revenue ($)', String(stats.totalRevenue)],
    ['Confirmed Payments', String(stats.confirmedCount)],
    ['Pending Payments', String(stats.pendingCount)],
    [],
    ['Tier', 'Count', 'Revenue ($)'],
    ...stats.byTier.map(t => [t.tier, String(t.count), String(t.revenue)]),
  ];
  downloadCSV('sariro-revenue.csv', rows);
}
