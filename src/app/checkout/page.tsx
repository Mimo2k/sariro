import { Suspense } from 'react';
import { CheckoutClient } from './checkout-client';
import BrandLayout from '@/components/brand/brand-layout';

function CheckoutSkeleton() {
  return (
    <BrandLayout>
      <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16 overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 bg-slate-200 rounded w-32 mb-6 animate-pulse" />
          <div className="rounded-3xl p-8 bg-slate-200 mb-8 h-48 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="card-3d p-6 h-40 bg-slate-200 rounded-2xl animate-pulse" />
              <div className="card-3d p-6 h-40 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
            <div className="lg:col-span-2">
              <div className="card-3d p-6 h-80 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </BrandLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutClient />
    </Suspense>
  );
}
