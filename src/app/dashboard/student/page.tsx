'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, Calendar, ArrowRight, Sparkles, Rocket,
  TrendingUp, Video, Loader2, AlertCircle, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle2, Circle, Download,
  FolderOpen, Trash2, X, Award, Users, CalendarPlus,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth/auth-provider';
import { TRACKS } from '@/lib/sariro-data';
import { createClient } from '@/lib/supabase/client';
import {
  getUpsellRecommendation,
  getTrackName,
  type UpsellRecommendation,
} from '@/lib/dashboard/upsell-engine';
import {
  fetchLessonProgress, markLessonComplete, unmarkLesson,
  calculateProgress, getCourseSyllabus, dropCourse, fetchCohortMaterials,
  type LessonProgressRow,
} from '@/lib/dashboard/student-data';

/* ───── Types ───── */
interface Enrollment {
  id: string;
  track: string;
  level: string;
  ratio: string;
  status: string;
  cohort_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_shown_at: string | null;
}

interface Booking {
  id: string;
  cohort_id: string;
  teacher_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  google_meet_url: string | null;
}

interface Cohort {
  id: string;
  track: string;
  level: string;
  ratio: string;
  status: string;
  google_meet_url: string | null;
}

/* ───── Helpers ───── */
function levelDisplay(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatSessionTime(iso: string, timezone: string | null): string {
  try {
    const date = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    };
    if (timezone) {
      opts.timeZone = timezone;
    }
    return date.toLocaleString('en-US', opts);
  } catch {
    return iso;
  }
}

/* ───── Empty state for new students ───── */
function EmptyCoursesState() {
  return (
    <div className="card-3d p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-900 mb-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
        No courses yet
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
        Buy your first course to start your journey. Browse the catalog and reserve your seat — cohorts form weekly.
      </p>
      <Link href="/courses" className="btn-tactile btn-tactile-primary px-6 py-3 text-sm inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Browse courses
      </Link>
    </div>
  );
}

/* ───── Course card v2 (progress + lessons + materials + drop + cert) ───── */
function CourseCard({ enrollment, onChanged }: {
  enrollment: Enrollment;
  onChanged: () => Promise<void>;
}) {
  const trackName = getTrackName(enrollment.track);
  const isActive = enrollment.status === 'active';
  const isCompleted = enrollment.status === 'completed';
  const isDropped = enrollment.status === 'dropped';

  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState<LessonProgressRow[]>([]);
  const [materialsUrl, setMaterialsUrl] = useState<string | null>(null);
  const [showDropModal, setShowDropModal] = useState(false);
  const [dropping, setDropping] = useState(false);

  // Fetch progress + materials when card mounts or when expanded
  useEffect(() => {
    const loadData = async () => {
      const [p, m] = await Promise.all([
        fetchLessonProgress(enrollment.id),
        fetchCohortMaterials(enrollment.cohort_id),
      ]);
      setProgress(p);
      setMaterialsUrl(m);
    };
    loadData();
  }, [enrollment.id, enrollment.cohort_id]);

  const syllabus = getCourseSyllabus(enrollment.track, enrollment.level);
  const courseProgress = calculateProgress(enrollment.track, enrollment.level, progress);

  const handleToggleLesson = async (moduleNum: string, lessonName: string) => {
    const isDone = progress.some(
      p => p.module_num === moduleNum && p.lesson_name === lessonName
    );

    if (isDone) {
      // Unmark
      await unmarkLesson(enrollment.id, moduleNum, lessonName);
      setProgress(prev => prev.filter(
        p => !(p.module_num === moduleNum && p.lesson_name === lessonName)
      ));
    } else {
      // Mark complete
      await markLessonComplete(enrollment.id, moduleNum, lessonName);
      setProgress(prev => [...prev, {
        id: `${moduleNum}-${lessonName}`,
        module_num: moduleNum,
        lesson_name: lessonName,
        completed_at: new Date().toISOString(),
      }]);
    }
  };

  const handleDrop = async () => {
    setDropping(true);
    const result = await dropCourse(enrollment.id);
    setDropping(false);
    setShowDropModal(false);
    if (result.success) {
      await onChanged();
    }
  };

  return (
    <div className="card-3d p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 mb-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
            {levelDisplay(enrollment.level)} · {enrollment.ratio}
          </div>
          <h4 className="font-extrabold text-slate-900 text-base leading-tight truncate" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {trackName}
          </h4>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
          isActive ? 'bg-green-100 text-green-700'
          : isCompleted ? 'bg-violet-100 text-violet-700'
          : isDropped ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
        }`}>
          {enrollment.status.toUpperCase()}
        </span>
      </div>

      {/* Dates */}
      {enrollment.started_at && (
        <div className="text-xs text-slate-500 mb-2">
          Started {new Date(enrollment.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}
      {isCompleted && enrollment.completed_at && (
        <div className="text-xs text-violet-600 font-bold mb-2">
          Completed {new Date(enrollment.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* Progress bar (only for active or completed) */}
      {(isActive || isCompleted) && courseProgress.totalLessons > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-700" style={{ fontFamily: 'var(--font-grotesk)' }}>
              Progress
            </span>
            <span className="text-slate-500">
              {courseProgress.completedLessons} / {courseProgress.totalLessons} lessons · {courseProgress.percentage}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${courseProgress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                isCompleted ? 'bg-violet-500' : 'bg-gradient-to-r from-blue-500 to-violet-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/course-path/${enrollment.track}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          View course details <ChevronRight className="w-3 h-3" />
        </Link>

        {/* Expand lessons (only if syllabus exists and course is active/completed) */}
        {(isActive || isCompleted) && syllabus.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Lessons
          </button>
        )}

        {/* Materials link */}
        {materialsUrl && (
          <a
            href={materialsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <FolderOpen className="w-3 h-3" /> Materials
          </a>
        )}

        {/* Certificate (only for completed) */}
        {isCompleted && (
          <Link
            href={`/certificate/${enrollment.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <Award className="w-3 h-3" /> Certificate
          </Link>
        )}

        {/* Drop course (only for active) */}
        {isActive && (
          <button
            onClick={() => setShowDropModal(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 ml-auto"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <Trash2 className="w-3 h-3" /> Drop
          </button>
        )}
      </div>

      {/* Expandable lesson checklist */}
      {expanded && syllabus.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-slate-100 space-y-3"
        >
          {syllabus.map(mod => (
            <div key={mod.num}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-extrabold">
                  {mod.num}
                </span>
                <span className="text-xs font-bold text-slate-700">{mod.name}</span>
              </div>
              <div className="ml-8 space-y-1">
                {mod.lessons.map((lesson, li) => {
                  const isDone = progress.some(
                    p => p.module_num === mod.num && p.lesson_name === lesson
                  );
                  return (
                    <button
                      key={li}
                      onClick={() => handleToggleLesson(mod.num, lesson)}
                      className="flex items-start gap-2 w-full text-left text-xs text-slate-600 hover:text-slate-900 py-1"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span className={isDone ? 'line-through text-slate-400' : ''}>
                        {lesson}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Drop confirmation modal */}
      {showDropModal && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !dropping && setShowDropModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                Drop this course?
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              You'll lose access to the schedule and materials. This can't be undone. You'll need to re-enroll to continue.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDrop}
                disabled={dropping}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                {dropping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Drop course
              </button>
              <button
                onClick={() => !dropping && setShowDropModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Schedule card ───── */
function ScheduleCard({ booking, cohort, timezone }: { booking: Booking; cohort?: Cohort; timezone: string | null }) {
  const meetUrl = booking.google_meet_url || cohort?.google_meet_url;
  const trackName = cohort ? getTrackName(cohort.track) : 'Your session';

  const handleAddToCalendar = () => {
    const start = new Date(booking.slot_start);
    const end = new Date(booking.slot_end);
    const toICS = (d: Date) =>
      d.getUTCFullYear().toString() +
      String(d.getUTCMonth() + 1).padStart(2, '0') +
      String(d.getUTCDate()).padStart(2, '0') + 'T' +
      String(d.getUTCHours()).padStart(2, '0') +
      String(d.getUTCMinutes()).padStart(2, '0') +
      String(d.getUTCSeconds()).padStart(2, '0') + 'Z';

    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sariro//Schedule//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@sariro.com`,
      `DTSTAMP:${toICS(new Date())}`,
      `DTSTART:${toICS(start)}`, `DTEND:${toICS(end)}`,
      `SUMMARY:${trackName} — Sariro Session`,
      `DESCRIPTION:Sariro live session. Join via Google Meet: ${meetUrl || 'Link available in dashboard'}`,
      meetUrl ? `LOCATION:${meetUrl}` : '',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sariro-session.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-3d p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 mb-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
            {booking.status === 'scheduled' ? 'Upcoming' : booking.status.toUpperCase()}
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {trackName}
          </h4>
        </div>
        <Clock className="w-5 h-5 text-slate-400 shrink-0" />
      </div>
      <div className="text-sm text-slate-700 mb-3">
        {formatSessionTime(booking.slot_start, timezone)}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {meetUrl && (
          <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors min-h-[40px]" style={{ fontFamily: 'var(--font-grotesk)' }}>
            <Video className="w-4 h-4" /> Join Meet
          </a>
        )}
        <button onClick={handleAddToCalendar} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors min-h-[40px]" style={{ fontFamily: 'var(--font-grotesk)' }}>
          <CalendarPlus className="w-4 h-4" /> Add to Calendar
        </button>
      </div>
    </div>
  );
}

/* ───── Recommended next card (persistent on dashboard) ───── */
function RecommendedNextCard({ rec, completedTrackName, completedLevel }: {
  rec: UpsellRecommendation;
  completedTrackName: string;
  completedLevel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-3xl p-6 sm:p-7 text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #0F172A 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80" style={{ fontFamily: 'var(--font-grotesk)' }}>
            Recommended next step
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
          {levelDisplay(rec.next_level)} {rec.next_track_name}
        </h3>
        <p className="text-sm text-white/85 mb-5 max-w-lg">
          You finished {completedTrackName} — {completedLevel}. {rec.body.split('. ').slice(0, 2).join('. ')}.
        </p>
        <Link
          href={`/course-path/${rec.next_track_id}`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-white/95 transition-colors min-h-[44px]"
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          Continue to {levelDisplay(rec.next_level)} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ───── Main page ───── */
function StudentDashboardInner() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cohorts, setCohorts] = useState<Record<string, Cohort>>({});
  const [classmates, setClassmates] = useState<Array<{ name: string | null; email: string | null; track: string; level: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<{
    rec: UpsellRecommendation;
    completedTrackName: string;
    completedLevel: string;
  } | null>(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];
  const userTimezone = profile?.timezone || null;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch user's enrollments
        const { data: enrollmentsData, error: enrollmentsErr } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (enrollmentsErr) throw enrollmentsErr;
        if (cancelled) return;

        const enrollmentList = (enrollmentsData || []) as Enrollment[];
        setEnrollments(enrollmentList);

        // 2. Fetch cohort IDs from active enrollments
        const cohortIds = enrollmentList
          .map(e => e.cohort_id)
          .filter((id): id is string => id !== null);

        let cohortMap: Record<string, Cohort> = {};
        if (cohortIds.length > 0) {
          const { data: cohortData, error: cohortErr } = await supabase
            .from('cohorts')
            .select('*')
            .in('id', cohortIds);
          if (cohortErr) throw cohortErr;
          if (cancelled) return;
          cohortMap = (cohortData || []).reduce((acc, c) => {
            acc[c.id] = c as Cohort;
            return acc;
          }, {} as Record<string, Cohort>);
          setCohorts(cohortMap);
        }

        // 2b. Fetch classmates (other students in same cohorts)
        if (cohortIds.length > 0) {
          const { data: classmateEnrollments } = await supabase
            .from('enrollments')
            .select('user_id, track, level')
            .in('cohort_id', cohortIds)
            .neq('status', 'dropped')
            .neq('user_id', user.id);

          if (classmateEnrollments && classmateEnrollments.length > 0) {
            const classmateIds = [...new Set(classmateEnrollments.map(e => e.user_id))];
            const { data: classmateProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', classmateIds);
            const profileMap = new Map((classmateProfiles || []).map(p => [p.id, p]));
            const classmatesList = classmateEnrollments.map(e => ({
              name: profileMap.get(e.user_id)?.full_name ?? null,
              email: profileMap.get(e.user_id)?.email ?? null,
              track: e.track,
              level: e.level,
            }));
            if (!cancelled) setClassmates(classmatesList);
          }
        }

        // 3. Fetch upcoming bookings for those cohorts
        if (cohortIds.length > 0) {
          const now = new Date().toISOString();
          const { data: bookingData, error: bookingErr } = await supabase
            .from('bookings')
            .select('*')
            .in('cohort_id', cohortIds)
            .gte('slot_start', now)
            .order('slot_start', { ascending: true })
            .limit(5);
          if (bookingErr) throw bookingErr;
          if (cancelled) return;
          setBookings((bookingData || []) as Booking[]);
        }

        // 4. Find a completed enrollment to build the "Recommended next" card
        // (popup will handle the FIRST unshown one; this card handles the most
        // recent completed one regardless of shown status — gives a persistent
        // recommendation even after the popup is dismissed)
        const completed = enrollmentList.find(e => e.status === 'completed');
        if (completed) {
          const enrollmentForRec = {
            id: completed.id,
            track: completed.track,
            level: completed.level as 'beginner' | 'intermediate' | 'advanced',
            track_name: getTrackName(completed.track),
          };
          const rec = getUpsellRecommendation(enrollmentForRec, firstName);
          if (!cancelled) {
            setRecommendation({
              rec,
              completedTrackName: enrollmentForRec.track_name,
              completedLevel: levelDisplay(completed.level),
            });
          }
        }
      } catch (err: unknown) {
        console.warn('[student-dashboard] load error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load your dashboard';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [user, supabase, firstName]);

  return (
    <section className="relative pt-6 sm:pt-10 pb-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Welcome header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600" style={{ fontFamily: 'var(--font-grotesk)' }}>
              Student Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            Hey {firstName}! 👋
          </h1>
          <p className="text-slate-600 mt-1.5 text-sm sm:text-base">
            Welcome back. Here's your learning journey at a glance.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="card-3d p-6 border-l-4 border-red-400">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Couldn't load your dashboard</h3>
                <p className="text-sm text-slate-600">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-3 text-xs font-bold text-blue-600">
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Recommended next (only if user has completed a course) */}
            {recommendation && (
              <div className="mb-8">
                <RecommendedNextCard
                  rec={recommendation.rec}
                  completedTrackName={recommendation.completedTrackName}
                  completedLevel={recommendation.completedLevel}
                />
              </div>
            )}

            {/* My Courses */}
            <div className="mb-10">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                <BookOpen className="w-5 h-5 text-blue-600" /> My Courses
              </h2>
              {enrollments.length === 0 ? (
                <EmptyCoursesState />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrollments.map((e) => (
                    <CourseCard key={e.id} enrollment={e} onChanged={loadAll} />
                  ))}
                </div>
              )}
            </div>

            {/* My Schedule */}
            <div className="mb-10" id="schedule">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                <Calendar className="w-5 h-5 text-blue-600" /> Upcoming Sessions
              </h2>
              {bookings.length === 0 ? (
                <div className="card-3d p-6 text-center">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    No sessions scheduled yet. Once your cohort is activated, your class times will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookings.map((b) => (
                    <ScheduleCard
                      key={b.id}
                      booking={b}
                      cohort={b.cohort_id ? cohorts[b.cohort_id] : undefined}
                      timezone={userTimezone}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Classmates */}
            {classmates.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  <Users className="w-5 h-5 text-violet-600" /> Your Classmates
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700">
                    {classmates.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classmates.slice(0, 9).map((c, i) => {
                    const displayName = c.name || c.email || 'Unknown';
                    return (
                      <div key={i} className="card-3d p-4 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0"
                          style={{ fontFamily: 'var(--font-jakarta)' }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {getTrackName(c.track)} · {levelDisplay(c.level)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Browse all tracks (always shown for discoverability) */}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                <TrendingUp className="w-5 h-5 text-blue-600" /> Explore Tracks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TRACKS.map((track) => (
                  <Link
                    key={track.id}
                    href={`/course-path/${track.id}`}
                    className="card-3d p-4 hover:shadow-lg transition-shadow group"
                  >
                    <h4 className="font-bold text-slate-900 text-sm mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                      {track.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{track.tagline}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600">
                      Beginner → Advanced <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  return (
    <DashboardLayout>
      <StudentDashboardInner />
    </DashboardLayout>
  );
}
