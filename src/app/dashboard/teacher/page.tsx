'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Calendar, Clock, Users, Video, Loader2, AlertCircle,
  CheckCircle2, XCircle, UserX, ChevronRight, GraduationCap, Sparkles,
  Plus, Edit3, Save, StickyNote, X,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchTeacherStats, fetchTeacherBookings, fetchTeacherStudents, updateBookingStatus,
  fetchSessionStudents, markAttendance, saveSessionNote,
  rescheduleBooking, createBooking, fetchTeacherCohorts,
  type TeacherStats, type TeacherBookingRow, type TeacherStudentRow,
  type SessionStudentRow, type TeacherCohortRow,
} from '@/lib/dashboard/teacher-data';
import { getTrackName } from '@/lib/dashboard/upsell-engine';

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
    if (timezone) opts.timeZone = timezone;
    return date.toLocaleString('en-US', opts);
  } catch {
    return iso;
  }
}

function formatDuration(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const minutes = Math.round((end - start) / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  } catch {
    return '';
  }
}

const BOOKING_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Cancelled' },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', label: 'No-show' },
};

const ENROLLMENT_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  completed: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Completed' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  dropped: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dropped' },
};

/* ───── Stat card ───── */
function StatCard({ icon: Icon, color, value, label, loading }: {
  icon: React.ComponentType<{ className?: string }>;
  color: string; value: string | number; label: string; loading?: boolean;
}) {
  return (
    <div className="card-3d p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-extrabold text-slate-900">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

/* ───── Booking card (schedule) ───── */
function BookingCard({
  booking, timezone, onStatusChange, onManage, onReschedule,
}: {
  booking: TeacherBookingRow;
  timezone: string | null;
  onStatusChange: (id: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no_show') => Promise<void>;
  onManage: (booking: TeacherBookingRow) => void;
  onReschedule: (booking: TeacherBookingRow) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const meetUrl = booking.google_meet_url || booking.cohort_meet_url;
  const status = BOOKING_STATUS[booking.status] || BOOKING_STATUS.scheduled;
  const isPast = new Date(booking.slot_start) < new Date();
  const trackName = getTrackName(booking.cohort_track);

  const handleStatus = async (newStatus: 'completed' | 'no_show' | 'cancelled') => {
    setProcessing(true);
    await onStatusChange(booking.id, newStatus);
    setProcessing(false);
  };

  return (
    <div className="card-3d p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-600 mb-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
            {levelDisplay(booking.cohort_level)} · {booking.cohort_ratio} · {formatDuration(booking.slot_start, booking.slot_end)}
          </div>
          <h4 className="font-extrabold text-slate-900 text-base leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {trackName}
          </h4>
          <div className="text-xs text-slate-500 mt-0.5">
            {formatSessionTime(booking.slot_start, timezone)}
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${status.bg} ${status.text}`}>
          {status.label.toUpperCase()}
        </span>
      </div>

      {/* Meet link + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {meetUrl && (
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors min-h-[40px]"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <Video className="w-4 h-4" /> Join Meet
          </a>
        )}

        {/* Manage students (attendance + notes) — for any session */}
        <button
          onClick={() => onManage(booking)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors min-h-[40px]"
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          <Users className="w-3.5 h-3.5" /> Students
        </button>

        {/* Reschedule — for scheduled sessions */}
        {booking.status === 'scheduled' && (
          <button
            onClick={() => onReschedule(booking)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors min-h-[40px]"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <Edit3 className="w-3.5 h-3.5" /> Reschedule
          </button>
        )}

        {/* Action buttons — only show for past scheduled sessions */}
        {booking.status === 'scheduled' && isPast && (
          <>
            <button
              onClick={() => handleStatus('completed')}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 min-h-[40px]"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Complete
            </button>
            <button
              onClick={() => handleStatus('no_show')}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold disabled:opacity-50 min-h-[40px]"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              <UserX className="w-3.5 h-3.5" /> No-show
            </button>
          </>
        )}

        {/* Cancel button — for upcoming scheduled sessions */}
        {booking.status === 'scheduled' && !isPast && (
          <button
            onClick={() => handleStatus('cancelled')}
            disabled={processing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold disabled:opacity-50 min-h-[40px]"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ───── Student card ───── */
function StudentCard({ student }: { student: TeacherStudentRow }) {
  const status = ENROLLMENT_STATUS[student.status] || ENROLLMENT_STATUS.active;
  const trackName = getTrackName(student.track);
  const displayName = student.student_name || student.student_email || 'Unknown student';

  return (
    <div className="card-3d p-5">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0"
          style={{ fontFamily: 'var(--font-jakarta)' }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {displayName}
          </h4>
          {student.student_email && student.student_name && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{student.student_email}</div>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${status.bg} ${status.text}`}>
          {status.label.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-400 mb-0.5">Track</div>
          <div className="font-bold text-slate-700 truncate">{trackName}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Level</div>
          <div className="font-bold text-slate-700">{levelDisplay(student.level)} · {student.ratio}</div>
        </div>
      </div>
    </div>
  );
}

/* ───── Session details modal (per-student attendance + notes) ───── */
function SessionDetailsModal({
  booking, onClose, onChanged, onToast,
}: {
  booking: TeacherBookingRow | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [students, setStudents] = useState<SessionStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const s = await fetchSessionStudents(booking.id);
      if (cancelled) return;
      setStudents(s);
      const notesMap: Record<string, string> = {};
      s.forEach(st => { if (st.note) notesMap[st.user_id] = st.note; });
      setNotes(notesMap);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [booking]);

  if (!booking) return null;

  const trackName = getTrackName(booking.cohort_track);

  const handleAttendance = async (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const result = await markAttendance(booking.id, studentId, status);
    if (result.success) {
      setStudents(prev => prev.map(s =>
        s.user_id === studentId ? { ...s, attendance_status: status } : s
      ));
      onToast({ type: 'success', message: 'Attendance marked' });
    } else {
      onToast({ type: 'error', message: result.error || 'Failed' });
    }
  };

  const handleSaveNote = async (studentId: string) => {
    setSavingNote(studentId);
    const result = await saveSessionNote(booking.id, studentId, notes[studentId] || '');
    setSavingNote(null);
    if (result.success) {
      onToast({ type: 'success', message: 'Note saved' });
    } else {
      onToast({ type: 'error', message: result.error || 'Failed' });
    }
  };

  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  Session details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {trackName} · {formatSessionTime(booking.slot_start, null)}
                </p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>
              ) : students.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No students enrolled in this cohort yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map(s => (
                    <div key={s.user_id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: 'var(--font-jakarta)' }}>
                            {s.student_name || s.student_email || 'Unknown student'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Progress: {s.lessons_completed} / {s.total_lessons} lessons
                            {s.total_lessons > 0 && (
                              <span className="ml-1">({Math.round((s.lessons_completed / s.total_lessons) * 100)}%)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attendance buttons */}
                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        {(['present', 'late', 'absent', 'excused'] as const).map(st => {
                          const isActive = s.attendance_status === st;
                          const colors = {
                            present: 'bg-green-600 text-white',
                            late: 'bg-amber-500 text-white',
                            absent: 'bg-red-500 text-white',
                            excused: 'bg-slate-500 text-white',
                          };
                          return (
                            <button
                              key={st}
                              onClick={() => handleAttendance(s.user_id, st)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                                isActive ? colors[st] : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              style={{ fontFamily: 'var(--font-grotesk)' }}
                            >
                              {st.charAt(0).toUpperCase() + st.slice(1)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                          <StickyNote className="w-3 h-3 inline mr-1" />Session note
                        </label>
                        <div className="flex gap-2">
                          <textarea
                            value={notes[s.user_id] || ''}
                            onChange={(e) => setNotes(prev => ({ ...prev, [s.user_id]: e.target.value }))}
                            placeholder="How did the student do? What should they work on?"
                            rows={2}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                            style={{ fontFamily: 'var(--font-inter)' }}
                          />
                          <button
                            onClick={() => handleSaveNote(s.user_id)}
                            disabled={savingNote === s.user_id}
                            className="shrink-0 w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50"
                            aria-label="Save note"
                          >
                            {savingNote === s.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Reschedule modal ───── */
function RescheduleModal({
  booking, timezone, onClose, onChanged, onToast,
}: {
  booking: TeacherBookingRow | null;
  timezone: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('16:00');
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    // Pre-fill with current values (deferred to satisfy react-hooks/set-state-in-effect)
    const start = new Date(booking.slot_start);
    const end = new Date(booking.slot_end);
    Promise.resolve().then(() => {
      setSlotDate(start.toISOString().split('T')[0]);
      setSlotTime(start.toTimeString().slice(0, 5));
      setDuration(Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
    });
  }, [booking]);

  if (!booking) return null;

  const handleReschedule = async () => {
    if (!slotDate || !slotTime) {
      setError('Please pick a date and time.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const startIso = new Date(`${slotDate}T${slotTime}:00`).toISOString();
    const endMs = new Date(startIso).getTime() + duration * 60 * 1000;
    const endIso = new Date(endMs).toISOString();

    const result = await rescheduleBooking(booking.id, startIso, endIso);
    setSubmitting(false);

    if (result.success) {
      onToast({ type: 'success', message: 'Session rescheduled' });
      await onChanged();
      onClose();
    } else {
      setError(result.error || 'Failed to reschedule');
    }
  };

  return (
    <AnimatePresence>
      {booking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  Reschedule session
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {getTrackName(booking.cohort_track)}
                </p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    New date
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    New time
                  </label>
                  <input
                    type="time"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 120, 180].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`h-10 rounded-lg text-xs font-bold border-2 transition-colors ${
                        duration === d ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      style={{ fontFamily: 'var(--font-grotesk)' }}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
              )}

              <button
                onClick={handleReschedule}
                disabled={submitting}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                Reschedule
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Add session modal ───── */
function AddSessionModal({
  open, onClose, onChanged, onToast,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [cohorts, setCohorts] = useState<TeacherCohortRow[]>([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('16:00');
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const c = await fetchTeacherCohorts();
      setCohorts(c);
      if (c.length > 0 && !selectedCohort) setSelectedCohort(c[0].id);
      setLoading(false);
    };
    load();
  }, [open, selectedCohort]);

  const handleAdd = async () => {
    if (!selectedCohort || !slotDate || !slotTime) {
      setError('Please pick a cohort, date, and time.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const startIso = new Date(`${slotDate}T${slotTime}:00`).toISOString();
    const endMs = new Date(startIso).getTime() + duration * 60 * 1000;
    const endIso = new Date(endMs).toISOString();

    const result = await createBooking({
      cohortId: selectedCohort,
      slotStart: startIso,
      slotEnd: endIso,
    });
    setSubmitting(false);

    if (result.success) {
      onToast({ type: 'success', message: 'Session added' });
      await onChanged();
      onClose();
    } else {
      setError(result.error || 'Failed to add session');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                Add new session
              </h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto" /></div>
            ) : cohorts.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                You need to be assigned to a cohort first. Ask an admin to assign you.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Course
                  </label>
                  <select
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>
                        {getTrackName(c.track)} · {levelDisplay(c.level)} · {c.ratio}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                      Start time
                    </label>
                    <input
                      type="time"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[60, 90, 120, 180].map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`h-10 rounded-lg text-xs font-bold border-2 transition-colors ${
                          duration === d ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                        style={{ fontFamily: 'var(--font-grotesk)' }}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={submitting}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add session
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Main page ───── */
function TeacherDashboardInner() {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || 'Teacher';
  const userTimezone = profile?.timezone || null;

  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bookings, setBookings] = useState<TeacherBookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [students, setStudents] = useState<TeacherStudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manageBooking, setManageBooking] = useState<TeacherBookingRow | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<TeacherBookingRow | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);

  const loadAll = useCallback(async () => {
    const [s, b, st] = await Promise.all([
      fetchTeacherStats(),
      fetchTeacherBookings(bookingFilter),
      fetchTeacherStudents(),
    ]);
    setStats(s);
    setStatsLoading(false);
    setBookings(b);
    setBookingsLoading(false);
    setStudents(st);
    setStudentsLoading(false);
  }, [bookingFilter]);

  useEffect(() => {
    Promise.resolve().then(() => loadAll());
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusChange = async (
    bookingId: string,
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  ) => {
    const result = await updateBookingStatus(bookingId, status);
    if (result.success) {
      setToast({ type: 'success', message: `Session marked as ${status.replace('_', '-')}` });
      await loadAll();
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to update session' });
    }
  };

  return (
    <section className="relative pt-6 sm:pt-10 pb-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-green-600" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-green-600" style={{ fontFamily: 'var(--font-grotesk)' }}>
              Teacher Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            Welcome, {displayName.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-600 mt-1.5 text-sm">
            Your schedule, students, and session history at a glance.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <StatCard icon={Calendar} color="bg-green-100 text-green-600" value={stats?.classesThisWeek ?? 0} label="Classes this week" loading={statsLoading} />
          <StatCard icon={Users} color="bg-blue-100 text-blue-600" value={stats?.activeStudents ?? 0} label="Active students" loading={statsLoading} />
          <StatCard icon={Clock} color="bg-violet-100 text-violet-600" value={`${stats?.hoursTaught ?? 0}h`} label="Hours taught" loading={statsLoading} />
        </div>

        {/* Schedule */}
        <div className="mb-10" id="schedule">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <Calendar className="w-5 h-5 text-green-600" />
              My Schedule
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddSession(true)}
                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[36px]"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add session
              </button>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
                {(['upcoming', 'past', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setBookingFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      bookingFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              </div>
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="card-3d p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                {bookingFilter === 'upcoming' ? 'No upcoming sessions' : bookingFilter === 'past' ? 'No past sessions yet' : 'No sessions scheduled'}
              </h3>
              <p className="text-sm text-slate-500">
                When the admin assigns you to an active cohort and creates bookings, your class times will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  timezone={userTimezone}
                  onStatusChange={handleStatusChange}
                  onManage={(booking) => setManageBooking(booking)}
                  onReschedule={(booking) => setRescheduleBooking(booking)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Students */}
        <div className="mb-10" id="students">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
            <Users className="w-5 h-5 text-blue-600" />
            My Students
            {students.length > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                {students.length}
              </span>
            )}
          </h2>
          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="card-3d p-8 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                No students assigned yet
              </h3>
              <p className="text-sm text-slate-500">
                Students will appear here once you're assigned to a cohort with active enrollments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(s => (
                <StudentCard key={s.enrollment_id} student={s} />
              ))}
            </div>
          )}
        </div>

        {/* Help card */}
        <div>
          <div className="card-3d p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  Teaching tips
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Use the same Google Meet link for all sessions in a cohort. Mark sessions as "Complete" right after they end so your hours-taught stat stays accurate.
                </p>
                <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  Update your timezone in settings <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SessionDetailsModal
        booking={manageBooking}
        onClose={() => setManageBooking(null)}
        onChanged={loadAll}
        onToast={setToast}
      />
      <RescheduleModal
        booking={rescheduleBooking}
        timezone={userTimezone}
        onClose={() => setRescheduleBooking(null)}
        onChanged={loadAll}
        onToast={setToast}
      />
      <AddSessionModal
        open={showAddSession}
        onClose={() => setShowAddSession(false)}
        onChanged={loadAll}
        onToast={setToast}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function TeacherDashboard() {
  return (
    <DashboardLayout>
      <TeacherDashboardInner />
    </DashboardLayout>
  );
}
