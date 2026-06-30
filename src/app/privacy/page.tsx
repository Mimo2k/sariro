import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import BrandLayout from '@/components/brand/brand-layout';
import { BRAND } from '@/lib/sariro-data';

export const metadata = {
  title: 'Privacy Policy — Sariro',
  description: 'How Sariro collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <BrandLayout>
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-40" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 mb-6 transition-colors"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <ShieldCheck className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div>
              <span
                className="block text-xs font-bold uppercase tracking-[0.18em] text-violet-600 mb-1"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                Legal
              </span>
              <h1
                className="text-3xl sm:text-4xl font-extrabold text-slate-900"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                Privacy Policy
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-10" style={{ fontFamily: 'var(--font-grotesk)' }}>
            Last updated: June 30, 2026
          </p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                1. What We Collect
              </h2>
              <p className="text-sm sm:text-base mb-3">When you enroll in a Sariro cohort, we collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li><strong>Account info:</strong> email, full name, phone number, password (hashed)</li>
                <li><strong>OAuth data:</strong> profile photo, verified email (from Google/GitHub)</li>
                <li><strong>Payment info:</strong> processed by Razorpay — we never see or store your card details</li>
                <li><strong>Cohort activity:</strong> attendance, project submissions, mentor feedback</li>
                <li><strong>Chat history:</strong> messages you send to the Sariro assistant (stored encrypted)</li>
                <li><strong>Usage analytics:</strong> pages visited, feature usage — anonymized</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                2. How We Use Your Data
              </h2>
              <p className="text-sm sm:text-base mb-3">We use your data to:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li>Run your cohort — attendance, feedback, certificates</li>
                <li>Notify you about cohort starts, schedule changes, and important updates</li>
                <li>Improve our courses, FAQ knowledge base, and AI assistant</li>
                <li>Detect and prevent fraud, abuse, and academic dishonesty</li>
                <li>Comply with legal obligations (tax records, etc.)</li>
              </ul>
              <p className="text-sm sm:text-base mt-3">
                We <strong>never</strong> sell your data to third parties. We <strong>never</strong> share your contact info with marketing partners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                3. Cookies & Tracking
              </h2>
              <p className="text-sm sm:text-base">
                We use essential cookies to keep you logged in and remember your preferences. We use optional analytics cookies (only with your consent — see the cookie banner) to understand which pages are most useful. We do not use cookies for cross-site advertising tracking. You can manage cookies anytime via the banner or your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                4. Data Sharing
              </h2>
              <p className="text-sm sm:text-base mb-3">We share data only with these trusted processors (all under strict data processing agreements):</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li><strong>Supabase</strong> — authentication and database hosting</li>
                <li><strong>Razorpay</strong> — payment processing (PCI-DSS compliant)</li>
                <li><strong>Google</strong> — Google One Tap sign-in (only if you choose it)</li>
                <li><strong>GitHub</strong> — GitHub OAuth sign-in (only if you choose it)</li>
                <li><strong>Resend</strong> — transactional email delivery</li>
              </ul>
              <p className="text-sm sm:text-base mt-3">
                We never share your data with any other third party without your explicit consent. Law enforcement requests are honored only when legally compelled, and we'll notify you unless prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                5. Your Rights (GDPR / CCPA)
              </h2>
              <p className="text-sm sm:text-base mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
                <li><strong>Access</strong> — request a copy of all data we hold about you</li>
                <li><strong>Correct</strong> — fix inaccurate personal data</li>
                <li><strong>Delete</strong> — request erasure of your data ("right to be forgotten")</li>
                <li><strong>Export</strong> — receive your data in a portable JSON format</li>
                <li><strong>Object</strong> — opt out of certain processing activities</li>
                <li><strong>Withdraw consent</strong> — for any processing based on your consent</li>
              </ul>
              <p className="text-sm sm:text-base mt-3">
                To exercise any of these rights, email <a href={`mailto:${BRAND.email}`} className="text-blue-600 font-bold underline">{BRAND.email}</a> with the subject "Data request." We respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                6. Data Retention
              </h2>
              <p className="text-sm sm:text-base">
                We retain your account data for as long as your account is active. If you delete your account, we erase your personal data within 30 days, except where we're legally required to retain it (e.g., tax records for 7 years). Anonymized analytics data may be retained indefinitely.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                7. Security
              </h2>
              <p className="text-sm sm:text-base">
                We use industry-standard security: TLS encryption in transit, AES-256 at rest, row-level security on all database tables, and regular security audits. Payment data never touches our servers — it goes directly to Razorpay's PCI-DSS-compliant infrastructure. Despite our best efforts, no system is 100% secure; if a breach occurs, we'll notify affected users within 72 hours per GDPR Article 34.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                8. Children's Privacy
              </h2>
              <p className="text-sm sm:text-base">
                Sariro cohorts are open to students aged 14+. For students aged 14–17, we require parental consent at enrollment. We do not knowingly collect data from children under 14. School partnership programs for younger learners are governed by separate contracts that comply with COPPA, FERPA, and applicable local laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                9. Changes to This Policy
              </h2>
              <p className="text-sm sm:text-base">
                We may update this Privacy Policy from time to time. Material changes will be communicated by email to enrolled students at least 14 days before taking effect. The "Last updated" date at the top reflects the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                10. Contact
              </h2>
              <p className="text-sm sm:text-base">
                Privacy questions? Email <a href={`mailto:${BRAND.email}`} className="text-blue-600 font-bold underline">{BRAND.email}</a> or write to us at {BRAND.location}. We reply within 24 hours, Monday through Friday.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500">
            <Link href="/terms" className="hover:text-slate-900 underline">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-slate-900 underline">Refund Policy</Link>
            <Link href="/contact" className="hover:text-slate-900 underline">Contact</Link>
          </div>
        </div>
      </section>
    </BrandLayout>
  );
}
