'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, ArrowRight } from 'lucide-react';
import SignInButtons from '@/components/auth/sign-in-buttons';
import { useAuth } from '@/components/auth/auth-provider';
import { BRAND } from '@/lib/sariro-data';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const next = searchParams.get('next') || '/';

  // Redirect to next page if already signed in
  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, router, next]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-extrabold text-xl text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
              {BRAND.name}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold" style={{ fontFamily: 'var(--font-grotesk)' }}>
              AI Education
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="mb-6 text-center">
            <h1
              className="text-2xl font-extrabold text-slate-900 mb-2"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              Welcome back.
            </h1>
            <p className="text-sm text-slate-500">
              Sign in to continue to your Sariro dashboard.
            </p>
          </div>

          <SignInButtons mode="signin" redirectTo={next} />

          <div className="mt-6 text-center text-sm text-slate-500">
            New to Sariro?{' '}
            <Link
              href={`/auth/sign-up${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              Create an account
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 leading-relaxed">
          By signing in you agree to our{' '}
          <Link href="/contact" className="underline hover:text-slate-600">privacy policy</Link>.
          We never sell your data.
        </p>
      </div>
    </div>
  );
}
