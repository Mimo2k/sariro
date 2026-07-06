import { Suspense } from 'react';
import { SignInClient } from './sign-in-client';

function SignInSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}>
      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 animate-pulse">
          <div className="h-14 w-14 bg-slate-200 rounded-2xl mx-auto mb-4" />
          <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SignInClient />
    </Suspense>
  );
}
