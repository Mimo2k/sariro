'use client';

import { motion } from 'framer-motion';

/* ===============================================================
   StatPills — Floating pill-shaped stat badges arranged around
   a portrait (top, left, right, bottom).

   Replaces the old RotatingCube3D in the Mimo section.
   Matches the reference design: white rounded pills with a
   bold colored number on top and a gray uppercase label below.

   Layout (desktop / tablet — pills float around the portrait):
     ┌───────[ TOP ]───────┐
     │                      │
   [LEFT]    PORTRAIT   [RIGHT]
     │                      │
     └──────[ BOTTOM ]──────┘

   Layout (mobile — pills stack in a 2-col grid below portrait):
     ┌───────────────────┐
     │      PORTRAIT     │
     └───────────────────┘
     [PILL]  [PILL]
     [PILL]  [PILL]
=============================================================== */

export interface PillStat {
  /** Display value, e.g. "12+", "5,000+", "36", "7" */
  value: string;
  /** Short label, e.g. "Years teaching" */
  label: string;
  /** Hex accent color for the number, e.g. "#F59E0B" */
  color: string;
}

export interface StatPillsProps {
  /** Exactly 4 stats recommended (top, left, right, bottom). */
  stats: PillStat[];
  /**
   * Size variant.
   * - `sm` for tight spaces (home page portrait card)
   * - `md` for standard use (about page portrait)
   */
  size?: 'sm' | 'md';
  /** Optional className for the wrapper. */
  className?: string;
}

const SIZE_CFG = {
  sm: {
    pill: 'px-3 py-1.5 min-w-[88px]',
    value: 'text-base',
    label: 'text-[8px] tracking-[0.15em]',
  },
  md: {
    pill: 'px-4 py-2 min-w-[116px]',
    value: 'text-xl',
    label: 'text-[9px] tracking-[0.18em]',
  },
} as const;

/* Position classes for the 4 pill slots — desktop only.
   Each pill is centered on the portrait's edge: half inside, half outside. */
const DESKTOP_POSITIONS = [
  // TOP — centered horizontally, sits on the top edge
  'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  // LEFT — centered vertically, sits on the left edge
  'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
  // RIGHT — centered vertically, sits on the right edge
  'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
  // BOTTOM — centered horizontally, sits on the bottom edge
  'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
] as const;

export function StatPills({
  stats,
  size = 'md',
  className = '',
}: StatPillsProps) {
  const cfg = SIZE_CFG[size];

  return (
    <>
      {/* ============================================================
          DESKTOP / TABLET (sm and up) — floating pills around portrait
         ============================================================ */}
      <div
        className={`hidden sm:block pointer-events-none ${className}`}
        aria-hidden
      >
        {stats.slice(0, 4).map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`absolute z-30 ${DESKTOP_POSITIONS[i % 4]}`}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              delay: 0.25 + i * 0.12,
              type: 'spring',
              stiffness: 220,
              damping: 18,
            }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
              className={`
                ${cfg.pill}
                pointer-events-auto
                bg-white/95 backdrop-blur-md
                rounded-full shadow-xl
                border border-slate-100
                flex flex-col items-center justify-center
                gpu-layer
              `}
              style={{
                boxShadow:
                  '0 8px 24px -6px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255,255,255,0.6) inset',
              }}
            >
              <div
                className={`${cfg.value} font-extrabold leading-none`}
                style={{ color: stat.color, fontFamily: 'var(--font-jakarta)' }}
              >
                {stat.value}
              </div>
              <div
                className={`${cfg.label} font-bold uppercase text-slate-500 mt-1 text-center leading-tight`}
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                {stat.label}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* ============================================================
          MOBILE (below sm) — pills in a 2-col grid below the portrait
          to avoid overlap on small screens.
         ============================================================ */}
      <div
        className={`sm:hidden grid grid-cols-2 gap-2 mt-4 ${className}`}
      >
        {stats.slice(0, 4).map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className={`
              ${cfg.pill}
              bg-white rounded-2xl shadow-lg
              border border-slate-100
              flex flex-col items-center justify-center
              py-3
            `}
          >
            <div
              className={`${cfg.value} font-extrabold leading-none`}
              style={{ color: stat.color, fontFamily: 'var(--font-jakarta)' }}
            >
              {stat.value}
            </div>
            <div
              className={`${cfg.label} font-bold uppercase text-slate-500 mt-1 text-center leading-tight`}
              style={{ fontFamily: 'var(--font-grotesk)' }}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
