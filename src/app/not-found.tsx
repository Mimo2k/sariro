'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Home, BookOpen, Compass, Plane, Sparkles } from 'lucide-react';
import BrandLayout from '@/components/brand/brand-layout';
import {
  Reveal,
  MagneticButton,
  ParallaxOrb,
} from '@/components/brand/effects-kit';

/* Quick links to all main routes */
const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/courses', label: 'Courses' },
  { href: '/schools', label: 'Schools' },
  { href: '/events', label: 'Events' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/story', label: 'Story' },
  { href: '/faq', label: 'FAQ' },
  { href: '/resources', label: 'Resources' },
  { href: '/contact', label: 'Contact' },
];

export default function NotFound() {
  return (
    <BrandLayout>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-32 pb-20">
        {/* Background layers */}
        <div className="absolute inset-0 mesh-bg opacity-60" />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <ParallaxOrb color="rgba(124, 58, 237, 0.12)" size={480} speed={120} position="top-10 -left-20" />
        <ParallaxOrb color="rgba(6, 182, 212, 0.10)" size={400} speed={-100} position="bottom-10 -right-20" />
        <ParallaxOrb color="rgba(245, 158, 11, 0.10)" size={360} speed={80} position="top-1/3 right-1/4" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Giant 404 with glow */}
          <Reveal>
            <div className="relative inline-block">
              <div
                className="absolute inset-0 blur-3xl opacity-50 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 50%, #F59E0B 100%)' }}
                aria-hidden
              />
              <h1
                className="relative text-[8rem] sm:text-[12rem] lg:text-[16rem] font-extrabold leading-none tracking-tight bg-clip-text text-transparent"
                style={{
                  fontFamily: 'var(--font-jakarta)',
                  backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 50%, #F59E0B 100%)',
                }}
              >
                404
              </h1>
            </div>
          </Reveal>

          {/* Animated airplane emoji */}
          <Reveal delay={0.1}>
            <motion.div
              animate={{
                x: [0, 20, -20, 0],
                y: [0, -8, 4, 0],
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-5xl sm:text-6xl mb-6"
              aria-hidden
            >
              ✈️
            </motion.div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={0.15}>
            <h2
              className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              This page <span className="gradient-text">flew away.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto mb-10">
              The page you&rsquo;re looking for doesn&rsquo;t exist &mdash; but your future in AI
              still does. Pick a path below and let&rsquo;s get you back to building.
            </p>
          </Reveal>

          {/* Primary CTAs */}
          <Reveal delay={0.25}>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <MagneticButton
                as="a"
                href="/"
                strength={0.25}
                className="btn-tactile btn-tactile-primary px-6 py-3.5"
              >
                <Home className="w-4 h-4" />
                Back to home
              </MagneticButton>
              <MagneticButton
                as="a"
                href="/courses"
                strength={0.25}
                className="btn-tactile btn-tactile-light px-6 py-3.5"
              >
                <BookOpen className="w-4 h-4" />
                Browse courses
                <ArrowRight className="w-4 h-4" />
              </MagneticButton>
            </div>
          </Reveal>

          {/* Quick links to all main routes */}
          <Reveal delay={0.3}>
            <div className="glass-panel rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Compass className="w-4 h-4 text-slate-500" />
                <span
                  className="text-xs font-bold uppercase tracking-wider text-slate-500"
                  style={{ fontFamily: 'var(--font-grotesk)' }}
                >
                  Or jump straight to
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    style={{ fontFamily: 'var(--font-grotesk)' }}
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Subtle hint */}
          <Reveal delay={0.4}>
            <p className="mt-8 text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span style={{ fontFamily: 'var(--font-grotesk)' }}>
                Still lost? Email us &mdash; we&rsquo;ll point you in the right direction.
              </span>
            </p>
          </Reveal>
        </div>
      </section>
    </BrandLayout>
  );
}
