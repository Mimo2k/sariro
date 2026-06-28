'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, ReactNode } from 'react';
import { CountUp } from './effects-kit';

/* ===============================================================
   FLOATING STATS CLUSTER — A radial cluster of stat cards that
   float around a central element with scroll-driven parallax.
   Used by: About page (founder portrait).
=============================================================== */

export type ClusterStat = {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  accent: string;
  icon?: ReactNode;
};

export function FloatingStatsCluster({
  stats,
  className = '',
  size = 460,
}: {
  stats: ClusterStat[];
  className?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const rotate = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const floatY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  // Place stats on a circle, evenly spaced.
  const radius = size * 0.42;

  return (
    <div
      ref={ref}
      className={`relative pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Rotating ring backdrop */}
      <motion.div
        style={{ rotate, width: size, height: size }}
        className="absolute inset-0"
      >
        <div
          className="absolute inset-6 rounded-full border border-dashed"
          style={{ borderColor: 'rgba(245, 158, 11, 0.25)' }}
        />
        <div
          className="absolute inset-16 rounded-full border"
          style={{ borderColor: 'rgba(37, 99, 235, 0.15)' }}
        />
      </motion.div>

      {/* Floating stat chips */}
      {stats.map((stat, i) => {
        const angle = (i / stats.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={stat.label}
            style={{
              x,
              y,
              floatY,
            }}
            className="absolute top-1/2 left-1/2"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
              duration: 0.6,
              delay: i * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
              style={{ x: '-50%', y: '-50%' }}
              className="glass-panel rounded-2xl px-3.5 py-2.5 shadow-lg min-w-[120px] text-center"
            >
              <div
                className="text-xl font-extrabold leading-none"
                style={{ color: stat.accent, fontFamily: 'var(--font-jakarta)' }}
              >
                <CountUp value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <div
                className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                style={{ fontFamily: 'var(--font-grotesk)' }}
              >
                {stat.label}
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default FloatingStatsCluster;
