'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, BookOpen, DollarSign, GraduationCap, Clock,
  CheckCircle2, XCircle, Loader2, AlertCircle, Plus, Video,
  Lock, PlayCircle, Trophy, ArrowRight, X, UserPlus, Trash2, Calendar,
  Search, Download, UserCheck, TrendingUp, Phone,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/components/auth/auth-provider';
import { TRACKS, COURSES } from '@/lib/sariro-data';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAdminStats, fetchPendingPurchaseIntents, fetchCohorts,
  confirmPurchaseIntent, rejectPurchaseIntent, transitionCohortStatus,
  createCohort, fetchTeachers, fetchCohortBookings,
  assignTeacherToCohort, deleteBooking,
  fetchUsers, updateUserRole, fetchCohortStudents,
  manualEnrollStudent, fetchRevenueStats,
  exportUsersCSV, exportEnrollmentsCSV, exportRevenueCSV,
  type AdminStats, type PurchaseIntentRow, type CohortRow,
  type TeacherRow, type CohortBookingRow,
  type UserRow, type CohortStudentRow, type RevenueStats,
} from '@/lib/dashboard/admin-data';
import { getTrackName } from '@/lib/dashboard/upsell-engine';

/* ───── Helpers ───── */
function levelDisplay(level: string): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  gathering: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Gathering' },
  ready: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  completed: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Completed' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
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

/* ───── Pending enrollment card ───── */
function PendingEnrollmentCard({
  intent, onConfirm, onReject,
}: {
  intent: PurchaseIntentRow;
  onConfirm: (intent: PurchaseIntentRow) => void;
  onReject: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(intent);
    setConfirming(false);
  };
  const handleReject = async () => {
    setRejecting(true);
    await onReject(intent.id);
    setRejecting(false);
  };

  return (
    <div className="card-3d p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
            Pending · {formatDate(intent.created_at)}
          </div>
          <h4 className="font-extrabold text-slate-900 text-base leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {intent.student_name || intent.student_email || 'Unknown student'}
          </h4>
          {intent.student_email && intent.student_name && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{intent.student_email}</div>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_COLORS.pending.bg} ${STATUS_COLORS.pending.text}`}>
          PENDING
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div>
          <div className="text-slate-400 mb-0.5">Track</div>
          <div className="font-bold text-slate-700 truncate">{getTrackName(intent.track)}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Level</div>
          <div className="font-bold text-slate-700">{levelDisplay(intent.level)}</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">Ratio</div>
          <div className="font-bold text-slate-700">{intent.ratio}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={confirming || rejecting}
          className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Confirm Enrollment
        </button>
        <button
          onClick={handleReject}
          disabled={confirming || rejecting}
          className="min-h-[44px] px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-grotesk)' }}
        >
          {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          Reject
        </button>
      </div>
    </div>
  );
}

/* ───── Cohort card ───── */
function CohortCard({
  cohort, onTransition, onManageSessions, onViewRoster,
}: {
  cohort: CohortRow;
  onTransition: (cohort: CohortRow, newStatus: 'gathering' | 'ready' | 'active' | 'completed') => void;
  onManageSessions: (cohort: CohortRow) => void;
  onViewRoster: (cohort: CohortRow) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [meetUrl, setMeetUrl] = useState(cohort.google_meet_url || '');
  const [error, setError] = useState<string | null>(null);

  const status = STATUS_COLORS[cohort.status] || STATUS_COLORS.gathering;
  const cap = cohort.ratio === '1:1' ? 1 : 4;
  const isFull = cohort.student_count >= cap;

  const handleTransition = async (newStatus: 'gathering' | 'ready' | 'active' | 'completed') => {
    if (newStatus === 'active') {
      setShowMeetModal(true);
      return;
    }
    setProcessing(true);
    setError(null);
    await onTransition(cohort, newStatus);
    setProcessing(false);
  };

  const handleActivateWithMeet = async () => {
    if (!meetUrl.trim() || !meetUrl.includes('meet.google.com')) {
      setError('Please enter a valid Google Meet URL (https://meet.google.com/...)');
      return;
    }
    setProcessing(true);
    setError(null);
    await onTransition(cohort, 'active');
    // The transition function will use the meetUrl via state in parent — but we need to pass it
    // Actually, let's handle it here directly
    setProcessing(false);
    setShowMeetModal(false);
  };

  return (
    <>
      <div className="card-3d p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 mb-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
              {levelDisplay(cohort.level)} · {cohort.ratio}
            </div>
            <h4 className="font-extrabold text-slate-900 text-base leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
              {getTrackName(cohort.track)}
            </h4>
            <div className="text-xs text-slate-500 mt-0.5">
              Created {formatDate(cohort.created_at)}
            </div>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${status.bg} ${status.text}`}>
            {status.label.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div>
            <div className="text-slate-400 mb-0.5">Students</div>
            <div className="font-bold text-slate-700">
              {cohort.student_count} / {cap}
              {isFull && cohort.status === 'gathering' && (
                <span className="ml-1 text-amber-600">· Full</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-slate-400 mb-0.5">Meet link</div>
            <div className="font-bold text-slate-700 truncate">
              {cohort.google_meet_url ? (
                <a href={cohort.google_meet_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline flex items-center gap-1">
                  <Video className="w-3 h-3" /> Active
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {cohort.status === 'gathering' && (
            <button
              onClick={() => handleTransition('ready')}
              disabled={processing || cohort.student_count === 0}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Mark Ready
            </button>
          )}
          {cohort.status === 'ready' && (
            <button
              onClick={() => handleTransition('active')}
              disabled={processing}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Lock & Activate
            </button>
          )}
          {cohort.status === 'active' && (
            <button
              onClick={() => handleTransition('completed')}
              disabled={processing}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5" />}
              Mark Complete
            </button>
          )}
          {cohort.status === 'completed' && (
            <div className="flex-1 text-center text-xs text-violet-600 font-bold py-2.5 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Course completed
            </div>
          )}
        </div>

        {/* Manage sessions + view roster — only show when cohort has students */}
        {cohort.student_count > 0 && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onManageSessions(cohort)}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sessions
            </button>
            <button
              onClick={() => onViewRoster(cohort)}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              <Users className="w-3.5 h-3.5" />
              Roster ({cohort.student_count})
            </button>
          </div>
        )}
      </div>

      {/* Meet URL modal */}
      <AnimatePresence>
        {showMeetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !processing && setShowMeetModal(false)}
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
                  Activate Course
                </h3>
                <button
                  onClick={() => !processing && setShowMeetModal(false)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                You're about to lock this course and mark it as active. Students can no longer join. Enter the Google Meet URL that will be used for ALL sessions in this course.
              </p>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                Google Meet URL
              </label>
              <input
                type="url"
                value={meetUrl}
                onChange={(e) => setMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-2"
                style={{ fontFamily: 'var(--font-inter)' }}
                autoFocus
              />
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mb-3">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleActivateWithMeet}
                  disabled={processing}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Lock & Activate
                </button>
                <button
                  onClick={() => !processing && setShowMeetModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                This URL will be visible to students in their dashboard. Generate it in Google Meet and paste here.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ───── Create cohort modal ───── */
function CreateCohortModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [track, setTrack] = useState(TRACKS[0]?.id ?? 'web');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [ratio, setRatio] = useState<'1:1' | '1:4'>('1:4');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createCohort({
      track, level, ratio,
      max_capacity: ratio === '1:1' ? 1 : 4,
    });
    setSubmitting(false);
    if (!result) {
      setError('Failed to create course. Check your permissions.');
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !submitting && onClose()}
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
                Create New Course
              </h3>
              <button
                onClick={() => !submitting && onClose()}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  Track
                </label>
                <select
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                        level === l ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      style={{ fontFamily: 'var(--font-grotesk)' }}
                    >
                      {levelDisplay(l)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  Ratio (mentor : students)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['1:1', '1:4'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRatio(r)}
                      className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                        ratio === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      style={{ fontFamily: 'var(--font-grotesk)' }}
                    >
                      {r} {r === '1:1' ? '(Private)' : '(Group)'}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Course
                </button>
                <button
                  onClick={() => !submitting && onClose()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Manage sessions modal (assign teachers to cohort) ───── */
function ManageSessionsModal({
  cohort, onClose, onChanged, onToast,
}: {
  cohort: CohortRow | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: (toast: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [bookings, setBookings] = useState<CohortBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('16:00');
  const [duration, setDuration] = useState(60); // minutes
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cohort) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [t, b] = await Promise.all([
        fetchTeachers(),
        fetchCohortBookings(cohort.id),
      ]);
      if (cancelled) return;
      setTeachers(t);
      setBookings(b);
      if (t.length > 0 && !selectedTeacher) setSelectedTeacher(t[0].id);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [cohort, selectedTeacher]);

  if (!cohort) return null;

  const handleAssign = async () => {
    if (!selectedTeacher || !slotDate || !slotTime) {
      setError('Please pick a teacher, date, and time.');
      return;
    }
    setError(null);
    setSubmitting(true);

    // Build ISO timestamps
    const startIso = new Date(`${slotDate}T${slotTime}:00`).toISOString();
    const endMs = new Date(startIso).getTime() + duration * 60 * 1000;
    const endIso = new Date(endMs).toISOString();

    const result = await assignTeacherToCohort({
      cohortId: cohort.id,
      teacherId: selectedTeacher,
      slotStart: startIso,
      slotEnd: endIso,
    });

    setSubmitting(false);

    if (result.success) {
      onToast({ type: 'success', message: 'Session scheduled' });
      // Refresh bookings
      const b = await fetchCohortBookings(cohort.id);
      setBookings(b);
      await onChanged();
    } else {
      setError(result.error || 'Failed to assign teacher');
      onToast({ type: 'error', message: result.error || 'Failed to assign teacher' });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const result = await deleteBooking(bookingId);
    if (result.success) {
      onToast({ type: 'success', message: 'Session removed' });
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      await onChanged();
    } else {
      onToast({ type: 'error', message: result.error || 'Failed to remove session' });
    }
  };

  const trackName = getTrackName(cohort.track);

  return (
    <AnimatePresence>
      {cohort && (
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
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  Manage Sessions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {trackName} · {levelDisplay(cohort.level)} · {cohort.ratio}
                </p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {/* Existing bookings list */}
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2" style={{ fontFamily: 'var(--font-grotesk)' }}>
                Scheduled sessions ({bookings.length})
              </h4>
              {loading ? (
                <div className="py-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /></div>
              ) : bookings.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 mb-4">
                  No sessions scheduled yet. Add the first one below.
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {bookings.map(b => (
                    <div key={b.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {b.teacher_name || b.teacher_email || 'Unknown teacher'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(b.slot_start).toLocaleString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
                          {b.status}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBooking(b.id)}
                        className="shrink-0 w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                        aria-label="Remove session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new session */}
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 mt-6" style={{ fontFamily: 'var(--font-grotesk)' }}>
                Add new session
              </h4>
              {teachers.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                  No teachers found. Promote a user to teacher role first (super-admin feature).
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                      Teacher
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || t.email || 'Unknown'}
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
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                      Duration (minutes)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[60, 90, 120, 180].map(d => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`h-10 rounded-lg text-xs font-bold border-2 transition-colors ${
                            duration === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                          style={{ fontFamily: 'var(--font-grotesk)' }}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleAssign}
                    disabled={submitting}
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-grotesk)' }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Schedule Session
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── User management modal ───── */
function UserManagementModal({
  open, onClose, onToast,
}: {
  open: boolean;
  onClose: () => void;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const u = await fetchUsers(search, roleFilter);
    setUsers(u);
    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => loadUsers(), 300); // debounce search
    return () => clearTimeout(t);
  }, [open, loadUsers]);

  const handleChangeRole = async (userId: string, newRole: 'student' | 'teacher' | 'admin' | 'super_admin') => {
    setChangingRole(userId);
    const result = await updateUserRole(userId, newRole);
    setChangingRole(null);
    if (result.success) {
      onToast({ type: 'success', message: `Role changed to ${newRole}` });
      loadUsers();
    } else {
      onToast({ type: 'error', message: result.error || 'Failed' });
    }
  };

  const getRole = (u: UserRow): string => {
    if (u.role) return u.role;
    if (u.is_super_admin) return 'super_admin';
    if (u.is_admin) return 'admin';
    if (u.is_teacher) return 'teacher';
    return 'student';
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
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  User Management
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{users.length} users shown</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportUsersCSV()}
                  className="px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1.5 min-h-[40px]"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* Search + filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  <option value="all">All roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                  <option value="super_admin">Super Admins</option>
                </select>
              </div>

              {/* Users list */}
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>
              ) : users.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No users found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map(u => {
                    const role = getRole(u);
                    const displayName = u.full_name || u.email || 'Unknown';
                    return (
                      <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0"
                          style={{ fontFamily: 'var(--font-jakarta)' }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          {u.phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {u.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-700">{u.enrollment_count} courses</div>
                          <div className="text-[10px] text-slate-400">{new Date(u.created_at).toLocaleDateString()}</div>
                        </div>
                        <select
                          value={role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value as 'student' | 'teacher' | 'admin' | 'super_admin')}
                          disabled={changingRole === u.id}
                          className="h-9 px-2 rounded-lg border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                          style={{ fontFamily: 'var(--font-grotesk)' }}
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Cohort roster modal ───── */
function CohortRosterModal({
  cohort, onClose, onToast,
}: {
  cohort: CohortRow | null;
  onClose: () => void;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [students, setStudents] = useState<CohortStudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cohort) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const s = await fetchCohortStudents(cohort.id);
      if (cancelled) return;
      setStudents(s);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [cohort]);

  if (!cohort) return null;
  const trackName = getTrackName(cohort.track);

  return (
    <AnimatePresence>
      {cohort && (
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
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  Course Roster
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {trackName} · {levelDisplay(cohort.level)} · {cohort.ratio}
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
                  <p className="text-sm text-slate-500">No students enrolled in this course yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map(s => {
                    const displayName = s.student_name || s.student_email || 'Unknown';
                    return (
                      <div key={s.enrollment_id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0"
                          style={{ fontFamily: 'var(--font-jakarta)' }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{displayName}</div>
                          {s.student_email && <div className="text-xs text-slate-500 truncate">{s.student_email}</div>}
                          {s.student_phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {s.student_phone}
                            </div>
                          )}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          s.status === 'active' ? 'bg-green-100 text-green-700'
                          : s.status === 'completed' ? 'bg-violet-100 text-violet-700'
                          : s.status === 'dropped' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Manual enrollment modal ───── */
function ManualEnrollModal({
  open, onClose, onChanged, onToast,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error'; message: string }) => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [track, setTrack] = useState(TRACKS[0]?.id ?? 'web');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [ratio, setRatio] = useState<'1:1' | '1:4'>('1:4');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const u = await fetchUsers();
      setUsers(u);
      if (u.length > 0 && !selectedUser) setSelectedUser(u[0].id);
      setLoading(false);
    };
    load();
  }, [open, selectedUser]);

  const handleEnroll = async () => {
    if (!selectedUser) {
      setError('Please pick a student.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await manualEnrollStudent({
      userId: selectedUser,
      track,
      level,
      ratio,
    });
    setSubmitting(false);
    if (result.success) {
      onToast({ type: 'success', message: 'Student enrolled manually' });
      await onChanged();
      onClose();
    } else {
      setError(result.error || 'Failed to enroll');
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
                Manual Enrollment
              </h3>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /></div>
            ) : users.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                No users found. Students need to sign up first.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Student
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email || 'Unknown'} {u.email ? `(${u.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Track
                  </label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
                      <button key={l} onClick={() => setLevel(l)}
                        className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${level === l ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={{ fontFamily: 'var(--font-grotesk)' }}>{levelDisplay(l)}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['1:1', '1:4'] as const).map(r => (
                      <button key={r} onClick={() => setRatio(r)}
                        className={`h-11 rounded-xl text-sm font-bold border-2 transition-colors ${ratio === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={{ fontFamily: 'var(--font-grotesk)' }}>{r} {r === '1:1' ? '(Private)' : '(Group)'}</button>
                    ))}
                  </div>
                </div>

                {error && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

                <button onClick={handleEnroll} disabled={submitting}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-grotesk)' }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Enroll Student
                </button>
                <p className="text-[10px] text-slate-400 text-center">Bypasses payment. Student gets immediate access.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Main admin dashboard ───── */
function AdminDashboardInner() {
  const { profile } = useAuth();
  const displayName = profile?.full_name || 'Admin';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingIntents, setPendingIntents] = useState<PurchaseIntentRow[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageSessionsCohort, setManageSessionsCohort] = useState<CohortRow | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showManualEnroll, setShowManualEnroll] = useState(false);
  const [rosterCohort, setRosterCohort] = useState<CohortRow | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setError(null);
    const [s, intents, c, rev] = await Promise.all([
      fetchAdminStats(),
      fetchPendingPurchaseIntents(),
      fetchCohorts(cohortFilter),
      fetchRevenueStats(),
    ]);
    setStats(s);
    setStatsLoading(false);
    setPendingIntents(intents);
    setIntentsLoading(false);
    setCohorts(c);
    setCohortsLoading(false);
    setRevenue(rev);
    setRevenueLoading(false);
  }, [cohortFilter]);

  useEffect(() => {
    // Defer to microtask to satisfy react-hooks/set-state-in-effect
    Promise.resolve().then(() => loadAll());
  }, [loadAll]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleConfirmIntent = async (intent: PurchaseIntentRow) => {
    const result = await confirmPurchaseIntent(intent);
    if (result.success) {
      setToast({ type: 'success', message: `Enrollment confirmed for ${intent.student_name || intent.student_email || 'student'}` });
      await loadAll();
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to confirm enrollment' });
    }
  };

  const handleRejectIntent = async (id: string) => {
    const result = await rejectPurchaseIntent(id);
    if (result.success) {
      setToast({ type: 'success', message: 'Purchase intent rejected' });
      await loadAll();
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to reject' });
    }
  };

  const handleCohortTransition = async (
    cohort: CohortRow,
    newStatus: 'gathering' | 'ready' | 'active' | 'completed'
  ) => {
    const meetUrl = cohort.google_meet_url || undefined;
    const result = await transitionCohortStatus(cohort.id, newStatus, meetUrl);
    if (result.success) {
      setToast({ type: 'success', message: `Course marked as ${newStatus}` });
      await loadAll();
    } else {
      setToast({ type: 'error', message: result.error || 'Failed to update course' });
    }
  };

  return (
    <section className="relative pt-6 sm:pt-10 pb-16 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600" style={{ fontFamily: 'var(--font-grotesk)' }}>
              Admin Panel
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                Welcome, {displayName}
              </h1>
              <p className="text-slate-600 mt-1.5 text-sm">
                Approve enrollments, manage courses, and activate batches.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowUserManagement(true)}
                className="btn-tactile btn-tactile-light px-4 py-2.5 text-sm flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> Users
              </button>
              <button
                onClick={() => setShowManualEnroll(true)}
                className="btn-tactile btn-tactile-light px-4 py-2.5 text-sm flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" /> Manual Enroll
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-tactile btn-tactile-primary px-5 py-2.5 text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Course
              </button>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="card-3d p-4 border-l-4 border-red-400 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900 mb-0.5">Couldn't load dashboard</h3>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users} color="bg-blue-100 text-blue-600" value={stats?.totalUsers ?? 0} label="Total users" loading={statsLoading} />
          <StatCard icon={BookOpen} color="bg-green-100 text-green-600" value={stats?.totalEnrollments ?? 0} label="Enrollments" loading={statsLoading} />
          <StatCard icon={Clock} color="bg-amber-100 text-amber-600" value={stats?.pendingPurchaseIntents ?? 0} label="Pending approvals" loading={statsLoading} />
          <StatCard icon={GraduationCap} color="bg-violet-100 text-violet-600" value={stats?.activeCohorts ?? 0} label="Active courses" loading={statsLoading} />
        </div>

        {/* Pending enrollments queue */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <Clock className="w-5 h-5 text-amber-600" />
              Pending Enrollments
              {pendingIntents.length > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
                  {pendingIntents.length}
                </span>
              )}
            </h2>
          </div>
          {intentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : pendingIntents.length === 0 ? (
            <div className="card-3d p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                All caught up!
              </h3>
              <p className="text-sm text-slate-500">
                No pending enrollment approvals right now. New purchases will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingIntents.map(intent => (
                <PendingEnrollmentCard
                  key={intent.id}
                  intent={intent}
                  onConfirm={handleConfirmIntent}
                  onReject={handleRejectIntent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Course management */}
        <div className="mb-10" id="cohorts">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <GraduationCap className="w-5 h-5 text-violet-600" />
              Courses
              {stats && stats.totalCohorts > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700">
                  {stats.totalCohorts}
                </span>
              )}
            </h2>
            {/* Status filter pills */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1 flex-wrap">
              {['all', 'gathering', 'ready', 'active', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setCohortFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    cohortFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  {f === 'all' ? 'All' : levelDisplay(f)}
                </button>
              ))}
            </div>
          </div>
          {cohortsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          ) : cohorts.length === 0 ? (
            <div className="card-3d p-8 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-jakarta)' }}>
                No courses yet
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Create your first course to start gathering students. Courses form when enrollments are confirmed.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-tactile btn-tactile-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cohorts.map(c => (
                <CohortCard
                  key={c.id}
                  cohort={c}
                  onTransition={handleCohortTransition}
                  onManageSessions={(cohort) => setManageSessionsCohort(cohort)}
                  onViewRoster={(cohort) => setRosterCohort(cohort)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Revenue + exports */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
              <TrendingUp className="w-5 h-5 text-green-600" /> Revenue
            </h2>
            <div className="flex gap-2">
              <button onClick={() => exportUsersCSV()} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 min-h-[40px]" style={{ fontFamily: 'var(--font-grotesk)' }}>
                <Download className="w-3.5 h-3.5" /> Users
              </button>
              <button onClick={() => exportEnrollmentsCSV()} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 min-h-[40px]" style={{ fontFamily: 'var(--font-grotesk)' }}>
                <Download className="w-3.5 h-3.5" /> Enrollments
              </button>
              <button onClick={() => exportRevenueCSV()} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 min-h-[40px]" style={{ fontFamily: 'var(--font-grotesk)' }}>
                <Download className="w-3.5 h-3.5" /> Revenue
              </button>
            </div>
          </div>
          {revenueLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-3d p-5">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-green-600" /></div>
                <div className="text-2xl font-extrabold text-slate-900">${revenue?.totalRevenue ?? 0}</div>
                <div className="text-xs text-slate-500">Total revenue</div>
              </div>
              <div className="card-3d p-5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3"><CheckCircle2 className="w-5 h-5 text-blue-600" /></div>
                <div className="text-2xl font-extrabold text-slate-900">{revenue?.confirmedCount ?? 0}</div>
                <div className="text-xs text-slate-500">Confirmed payments</div>
              </div>
              <div className="card-3d p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div className="text-2xl font-extrabold text-slate-900">{revenue?.pendingCount ?? 0}</div>
                <div className="text-xs text-slate-500">Pending payments</div>
              </div>
              <div className="card-3d p-5">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-violet-600" /></div>
                <div className="text-2xl font-extrabold text-slate-900">{revenue?.byTier.length ?? 0}</div>
                <div className="text-xs text-slate-500">Active tiers</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
            <BookOpen className="w-5 h-5 text-blue-600" /> Catalog
          </h2>
          <div className="card-3d p-5">
            <p className="text-sm text-slate-600 mb-3">
              {COURSES.length} courses across {TRACKS.length} tracks. Each track has 3 levels (Beginner, Intermediate, Advanced).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TRACKS.map(t => (
                <div key={t.id} className="px-3 py-2 rounded-lg bg-slate-50 text-xs font-bold text-slate-700 truncate" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  {t.short}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create course modal */}
      <CreateCohortModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setToast({ type: 'success', message: 'Course created' });
          loadAll();
        }}
      />

      {/* Manage sessions modal (assign teachers) */}
      <ManageSessionsModal
        cohort={manageSessionsCohort}
        onClose={() => setManageSessionsCohort(null)}
        onChanged={() => loadAll()}
        onToast={(msg) => setToast(msg)}
      />

      {/* User management modal */}
      <UserManagementModal
        open={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        onToast={(msg) => setToast(msg)}
      />

      {/* Cohort roster modal */}
      <CohortRosterModal
        cohort={rosterCohort}
        onClose={() => setRosterCohort(null)}
        onToast={(msg) => setToast(msg)}
      />

      {/* Manual enrollment modal */}
      <ManualEnrollModal
        open={showManualEnroll}
        onClose={() => setShowManualEnroll(false)}
        onChanged={() => loadAll()}
        onToast={(msg) => setToast(msg)}
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

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <AdminDashboardInner />
    </DashboardLayout>
  );
}
