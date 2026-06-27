'use client';

import { motion, useScroll, useTransform, useSpring, MotionValue, useInView, animate } from 'framer-motion';
import { useRef, useEffect, ReactNode, useState } from 'react';

/* ===============================================================
   CONSISTENT MOTION SYSTEM
   Ensures EVERY page has the same animation DNA:
   - Same easing curves
   - Same timing
   - Same reveal patterns
   - Same parallax depths
   - Same hover behaviors

   This is what makes the site feel like ONE brand, not 8 separate pages.
=============================================================== */

// Shared easing — the "Sariro curve". Premium, slow-out, fast-in.
export const SARIRO_EASE = [0.22, 1, 0.36, 1] as const;

// Shared durations
export const SARIRO_DURATION = {
  fast: 0.4,
  normal: 0.6,
  slow: 0.8,
  hero: 1.0,
} as const;

/* ---------- ConsistentReveal — the STANDARD entrance for all content ---------- */
// Every section intro, every card, every text block uses this.
// Ensures uniform reveal timing across all pages.
export function ConsistentReveal({
  children,
  delay = 0,
  y = 40,
  className = '',
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: SARIRO_DURATION.normal, delay, ease: SARIRO_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- ConsistentStagger — the STANDARD grid stagger ---------- */
// All card grids use this. Same stagger timing everywhere.
export function ConsistentStagger({
  children,
  className = '',
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ConsistentStaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: SARIRO_DURATION.normal, ease: SARIRO_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- ConsistentHeading — the STANDARD heading reveal ---------- */
// All h2/h3 headings use SplitText with the SAME timing.
export function ConsistentHeading({
  text,
  highlight,
  highlightClassName = 'gradient-text',
  className = '',
  delay = 0,
  as: Tag = 'h2',
}: {
  text: string;
  highlight?: string;
  highlightClassName?: string;
  className?: string;
  delay?: number;
  as?: 'h2' | 'h3' | 'h4';
}) {
  const words = text.split(' ');
  const hl = highlight?.split(' ') ?? [];

  return (
    <Tag className={className} style={{ perspective: '800px' }}>
      {words.map((word, i) => {
        const isHl = hl.includes(word);
        return (
          <span key={i} className="inline-block overflow-hidden align-bottom">
            <motion.span
              initial={{ opacity: 0, y: 30, rotateX: -45 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: SARIRO_DURATION.normal,
                delay: delay + i * 0.05,
                ease: SARIRO_EASE,
              }}
              className={`inline-block ${isHl ? highlightClassName : ''}`}
              style={{ transformOrigin: '50% 100%', transformStyle: 'preserve-3d' }}
            >
              {word}{i < words.length - 1 ? '\u00A0' : ''}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}

/* ---------- ConsistentParallax — the STANDARD parallax for backgrounds ---------- */
// All decorative orbs/shapes use this. Same depth ratio everywhere.
export function ConsistentParallax({
  children,
  speed = 0.3,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // Smooth the parallax for premium feel
  const smoothY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const y = useTransform(smoothY, [0, 1], [speed * 120, -speed * 120]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ---------- ConsistentTiltCard — the STANDARD hover tilt ---------- */
// All cards use this. Same maxTilt, same glare intensity.
export function ConsistentTiltCard({
  children,
  className = '',
  maxTilt = 6,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${px * maxTilt}deg) rotateX(${-py * maxTilt}deg) translateZ(6px)`;
    const g = el.querySelector('[data-glare]') as HTMLElement | null;
    if (g) g.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.2), transparent 50%)`;
  };
  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    const g = el.querySelector('[data-glare]') as HTMLElement | null;
    if (g) g.style.background = 'transparent';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
      <div data-glare className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: 'transparent' }} />
    </div>
  );
}

/* ---------- ConsistentMagnetic — the STANDARD magnetic button ---------- */
export function ConsistentMagnetic({
  children,
  className = '',
  strength = 0.2,
  onClick,
  as = 'button',
  href,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  as?: 'button' | 'a';
  href?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };
  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0px, 0px)';
  };

  const shared = {
    ref: ref as any,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    className: `transition-transform duration-300 ease-out will-change-transform ${className}`,
    style: { display: 'inline-flex' },
  };

  if (as === 'a') return <a {...shared} href={href} onClick={onClick}>{children}</a>;
  return <button {...shared} onClick={onClick}>{children}</button>;
}

/* ---------- ConsistentCountUp — the STANDARD number animation ---------- */
export function ConsistentCountUp({
  value,
  suffix = '',
  prefix = '',
  className = '',
  duration = 1.8,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: SARIRO_EASE,
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return controls.stop;
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
