'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, Download, ArrowLeft, Loader2, AlertCircle, GraduationCap, ShieldCheck } from 'lucide-react';
import BrandLayout from '@/components/brand/brand-layout';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchCertificateData, type CertificateData } from '@/lib/dashboard/student-data';
import { BRAND } from '@/lib/sariro-data';

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const enrollmentId = params.id as string;

  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/auth/sign-in?next=/certificate/${enrollmentId}`);
      return;
    }
    const load = async () => {
      const data = await fetchCertificateData(enrollmentId);
      if (!data) {
        setError('Certificate not available. This enrollment may not be completed yet.');
        setLoading(false);
        return;
      }
      setCertData(data);
      setLoading(false);
    };
    load();
  }, [authLoading, user, enrollmentId, router]);

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <BrandLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </BrandLayout>
    );
  }

  if (error || !certData) {
    return (
      <BrandLayout>
        <section className="relative pt-32 sm:pt-40 pb-20 overflow-hidden">
          <div className="relative max-w-xl mx-auto px-4 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
              {error || 'Certificate not found'}
            </h1>
            <p className="text-slate-600 mb-6">
              Certificates are only available for completed courses. Ask your admin to mark your course as complete.
            </p>
            <Link href="/dashboard/student" className="btn-tactile btn-tactile-primary px-6 py-3 text-sm inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
          </div>
        </section>
      </BrandLayout>
    );
  }

  const completedDate = new Date(certData.completedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <BrandLayout>
      <section className="relative pt-28 sm:pt-36 pb-20 overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">

          {/* Back link (hidden on print) */}
          <div className="print:hidden mb-6">
            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
            </Link>
          </div>

          {/* Certificate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-900"
            style={{ aspectRatio: '1.414 / 1' }}
          >
            {/* Decorative border pattern */}
            <div
              className="absolute inset-2 rounded-2xl border-2 border-blue-200"
              style={{ pointerEvents: 'none' }}
            />

            {/* Inner content */}
            <div className="relative h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center">
              {/* Top decoration */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <div className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                    {BRAND.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    AI & Technology Education
                  </div>
                </div>
              </div>

              {/* "Certificate of Completion" */}
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2" style={{ fontFamily: 'var(--font-grotesk)' }}>
                Certificate of Completion
              </div>

              {/* Student name */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                {certData.studentName}
              </h1>

              {/* Description */}
              <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-6">
                has successfully completed all modules, lessons, and projects for the
              </p>

              {/* Course name */}
              <div className="mb-6">
                <div className="text-xl font-extrabold text-blue-600" style={{ fontFamily: 'var(--font-jakarta)' }}>
                  {certData.trackName}
                </div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1" style={{ fontFamily: 'var(--font-grotesk)' }}>
                  {certData.level} Level
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between w-full max-w-md mt-auto pt-6 border-t border-slate-100">
                <div className="text-left">
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="text-sm font-bold text-slate-900" style={{ fontFamily: 'var(--font-grotesk)' }}>
                    {completedDate}
                  </div>
                </div>
                <div className="text-center">
                  <Award className="w-8 h-8 text-violet-600 mx-auto mb-1" />
                  <div className="text-[10px] text-slate-500">Verified</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Issued by</div>
                  <div className="text-sm font-bold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
                    {BRAND.founder}
                  </div>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="text-[9px] text-slate-400 mt-4 font-mono">
                ID: {certData.enrollmentId.slice(0, 8)}-{Date.now().toString(36).toUpperCase()}
              </div>
            </div>
          </motion.div>

          {/* Action buttons (hidden on print) */}
          <div className="print:hidden mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handlePrint}
              className="btn-tactile btn-tactile-primary px-6 py-3 text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <Link
              href="/dashboard/student"
              className="btn-tactile btn-tactile-light px-6 py-3 text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
          </div>

          {/* Print instructions */}
          <p className="print:hidden text-center text-xs text-slate-500 mt-4">
            Click "Download PDF" and choose "Save as PDF" in the print dialog.
          </p>
        </div>
      </section>
    </BrandLayout>
  );
}
