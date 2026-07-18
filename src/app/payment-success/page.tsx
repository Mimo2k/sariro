'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Calendar, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import BrandLayout from '@/components/brand/brand-layout';

const TRACK_NAMES: Record<string, string> = {
  'web-dev': 'Web Development',
  'ai-fundamentals': 'AI Fundamentals',
  'mobile-dev': 'Mobile Development',
  'data-science': 'Data Science',
  'ai-engineering': 'AI Engineering',
};

function trackLabel(trackId: string): string {
  return TRACK_NAMES[trackId] ?? trackId.charAt(0).toUpperCase() + trackId.slice(1);
}

function levelLabel(level: string): string {
  if (!level) return '';
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

function PaymentSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackId = searchParams.get('track') || '';
  const level = searchParams.get('level') || '';
  const ratio = searchParams.get('ratio') || '1:4';
  const auto = searchParams.get('auto') === '1';

  // Auto-redirect to the student dashboard after a short delay so the
  // user has time to read the confirmation. Only auto-redirect for the
  // Standard API flow (auto=1). Manual confirmation flow stays put so
  // the user doesn't get bounced to an empty dashboard.
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => {
      router.push('/dashboard/student');
    }, 6000);
    return () => clearTimeout(t);
  }, [auto, router]);

  return (
    <BrandLayout>
      <section className="relative pt-32 sm:pt-40 pb-20 overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600" strokeWidth={2.5} />
            </motion.div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {auto ? 'You’re all set! 🎉' : 'Payment successful!'}
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {auto
                ? 'Your payment is verified and your enrollment is confirmed. Your course is live in your dashboard right now.'
                : 'Your seat is reserved. Our team will confirm your enrollment shortly — you\'ll see your course in your dashboard within 24 hours.'}
            </p>

            {trackId && (
              <div className="card-3d p-6 mb-8 text-left">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  Your enrollment
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Track</div>
                      <div className="font-bold text-slate-900">{trackLabel(trackId)}</div>
                    </div>
                  </div>
                  {level && (
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500">Level</div>
                        <div className="font-bold text-slate-900">{levelLabel(level)}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Batch type</div>
                      <div className="font-bold text-slate-900">{ratio}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card-3d p-6 mb-8 text-left">
              <h3
                className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                What happens next?
              </h3>
              <ol className="space-y-3">
                {(auto
                  ? [
                      { step: '1', text: 'Your enrollment is confirmed instantly — no waiting.' },
                      { step: '2', text: 'You’ve been assigned to a cohort that’s gathering now.' },
                      { step: '3', text: 'Your dashboard shows your course + schedule as soon as the cohort activates.' },
                      { step: '4', text: 'Classes start on the scheduled date — you’ll get a notification.' },
                    ]
                  : [
                      { step: '1', text: 'Admin reviews your payment (usually within 24 hours)' },
                      { step: '2', text: 'You get assigned to a course batch' },
                      { step: '3', text: 'Your dashboard shows the course + Google Meet link' },
                      { step: '4', text: 'Classes start on the scheduled date' },
                    ]
                ).map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {item.step}
                    </span>
                    <span className="text-sm text-slate-700">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {auto && (
              <div className="mb-8 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Taking you to your dashboard in a few seconds…</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/student"
                className="btn-tactile btn-tactile-primary px-6 py-3 text-sm flex items-center justify-center gap-2"
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/courses" className="btn-tactile btn-tactile-light px-6 py-3 text-sm">
                Browse more courses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </BrandLayout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessInner />
    </Suspense>
  );
}
