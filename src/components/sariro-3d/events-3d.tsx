'use client';

import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { Calendar, MapPin, ArrowRight, Sparkles, Clock, Trophy, Mic, Users } from 'lucide-react';
import { EVENTS } from '@/lib/sariro-data';
import { SplitText3D, MagneticButton } from './scroll-effects';

const ACCENT_MAP: Record<string, { text: string; bg: string; soft: string; border: string; glow: string; gradient: string }> = {
  blue:   { text: 'text-blue-400',   bg: 'bg-blue-600',   soft: 'bg-blue-500/15',   border: 'border-blue-400/30',   glow: 'rgba(37, 99, 235, 0.5)',   gradient: 'from-blue-600 to-blue-800' },
  green:  { text: 'text-green-400',  bg: 'bg-green-600',  soft: 'bg-green-500/15',  border: 'border-green-400/30',  glow: 'rgba(22, 163, 74, 0.5)',  gradient: 'from-green-600 to-green-800' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-600', soft: 'bg-violet-500/15', border: 'border-violet-400/30', glow: 'rgba(124, 58, 237, 0.5)', gradient: 'from-violet-600 to-violet-800' },
};

const TYPE_ICONS: Record<string, typeof Trophy> = {
  Cohort: Users,
  Hackathon: Trophy,
  Webinar: Mic,
};

/* ---------- Animated Event Card (mobile + desktop) ---------- */
function AnimatedEventCard({
  event,
  index,
}: {
  event: typeof EVENTS[number];
  index: number;
}) {
  const a = ACCENT_MAP[event.accent] ?? ACCENT_MAP.blue;
  const TypeIcon = TYPE_ICONS[event.type] ?? Sparkles;
  const cardRef = useRef<HTMLDivElement>(null);

  // Individual card scroll progress for parallax
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={cardRef}
      style={{ y, scale, opacity }}
      initial={{ opacity: 0, y: 80, rotateX: -15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: false, margin: '-80px' }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
      className="relative"
    >
      <div
        className="relative glass-dark rounded-3xl p-6 sm:p-8 border border-white/10 overflow-hidden group"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glow accent — animated pulse */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: a.glow }}
        />

        {/* Number badge — top right */}
        <div className="absolute top-4 right-4 text-5xl font-extrabold opacity-10 select-none" style={{ fontFamily: 'var(--font-jakarta)', color: a.glow }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="relative" style={{ transform: 'translateZ(20px)' }}>
          {/* Type icon + badge */}
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: index * 0.3 }}
              className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center shadow-lg`}
              style={{ boxShadow: `0 8px 20px -5px ${a.glow}` }}
            >
              <TypeIcon className="w-5 h-5 text-white" strokeWidth={2.4} />
            </motion.div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${a.soft} ${a.text} border ${a.border}`} style={{ fontFamily: 'var(--font-grotesk)' }}>
              {event.type}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {event.title}
          </h3>
          <p className="text-sm text-slate-300 mb-5 leading-relaxed">{event.description}</p>

          {/* Meta with icons */}
          <div className="space-y-2 mb-5 pt-4 border-t border-white/10">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              {event.date}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              {event.location} · {event.format}
            </motion.div>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-extrabold text-white" style={{ fontFamily: 'var(--font-jakarta)' }}>
              {event.price}
            </span>
            <MagneticButton
              strength={0.2}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${a.gradient} shadow-lg cursor-pointer`}
            >
              Reserve
              <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Desktop Horizontal Card ---------- */
function DesktopEventCard({
  event,
  index,
  count,
  progress,
}: {
  event: typeof EVENTS[number];
  index: number;
  count: number;
  progress: MotionValue<number>;
}) {
  const a = ACCENT_MAP[event.accent] ?? ACCENT_MAP.blue;
  const TypeIcon = TYPE_ICONS[event.type] ?? Sparkles;
  const cardStart = index / count;
  const cardEnd = (index + 1) / count;
  const mid = (cardStart + cardEnd) / 2;

  const rotateY = useTransform(progress, [cardStart, mid, cardEnd], [15, 0, -15]);
  const scale = useTransform(progress, [cardStart, mid, cardEnd], [0.85, 1, 0.85]);
  const opacity = useTransform(progress, [cardStart, mid, cardEnd], [0.4, 1, 0.4]);

  return (
    <motion.div
      style={{ rotateY, scale, opacity, transformStyle: 'preserve-3d', perspective: 1200 }}
      className="flex-shrink-0 w-[80vw] sm:w-[55vw] lg:w-[40vw] max-w-2xl"
    >
      <div className="relative glass-dark rounded-3xl p-8 sm:p-12 border border-white/10 overflow-hidden h-full">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: a.glow }}
        />
        <div className="absolute -top-4 -right-2 text-[10rem] font-extrabold leading-none opacity-10 select-none pointer-events-none" style={{ fontFamily: 'var(--font-jakarta)', color: a.glow }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="relative" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: index * 0.3 }}
              className={`w-12 h-12 rounded-xl ${a.bg} flex items-center justify-center shadow-lg`}
              style={{ boxShadow: `0 10px 25px -5px ${a.glow}` }}
            >
              <TypeIcon className="w-6 h-6 text-white" strokeWidth={2.4} />
            </motion.div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${a.soft} ${a.text} border ${a.border}`} style={{ fontFamily: 'var(--font-grotesk)' }}>
              {event.type}
            </span>
            <span className="text-sm font-bold text-slate-300 ml-auto">{event.price}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {event.title}
          </h3>
          <p className="text-base text-slate-300 mb-6 leading-relaxed">{event.description}</p>
          <div className="space-y-2.5 mb-6 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
              {event.date}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
              {event.location} · {event.format}
            </div>
          </div>
          <MagneticButton
            strength={0.2}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${a.gradient} shadow-lg w-full justify-center cursor-pointer`}
          >
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white" />
            Reserve spot
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </MagneticButton>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Progress Dot ---------- */
function EventProgressDot({ index, count, progress }: { index: number; count: number; progress: MotionValue<number> }) {
  const sliceStart = index / count;
  const sliceEnd = (index + 1) / count;
  const mid = (sliceStart + sliceEnd) / 2;
  const scale = useTransform(progress, [sliceStart, mid, sliceEnd], [0.5, 1.3, 0.5]);
  const opacity = useTransform(progress, [sliceStart, mid, sliceEnd], [0.3, 1, 0.3]);
  return <motion.div style={{ scale, opacity }} className="w-2.5 h-2.5 rounded-full bg-white" />;
}

export default function Events3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: headerProgress } = useScroll({ target: headerRef, offset: ['start end', 'end start'] });
  const headerY = useTransform(headerProgress, [0, 1], [40, -40]);

  // Desktop horizontal scroll
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.8, restDelta: 0.0005 });
  const x = useTransform(smoothProgress, [0, 1], ['5%', '-75%']);
  const count = EVENTS.length;

  return (
    <section id="events" data-chapter="events" data-chapter-label="Events" className="relative bg-slate-950/95 text-white">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-violet-950" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
      </div>

      {/* Header */}
      <div ref={headerRef} className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-8">
        <motion.div style={{ y: headerY }} className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 block" style={{ fontFamily: 'var(--font-grotesk)' }}>
            — Upcoming events —
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            <SplitText3D text="Show up. Build something." highlight="Build" highlightClassName="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent" />
            <br />
            <SplitText3D text="Meet your people." highlight="people." highlightClassName="bg-gradient-to-r from-violet-400 to-green-400 bg-clip-text text-transparent" delay={0.3} />
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-300">
            Cohorts, hackathons, and live workshops. Every event is designed to leave you with something real.
          </p>
        </motion.div>
      </div>

      {/* DESKTOP: Horizontal scroll carousel (lg+) */}
      <div ref={sectionRef} className="relative hidden lg:block" style={{ height: '300vh' }}>
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <motion.div style={{ x }} className="flex gap-6 lg:gap-10 px-[5vw] items-center will-change-transform">
            {EVENTS.map((event, i) => (
              <DesktopEventCard key={event.id} event={event} index={i} count={count} progress={smoothProgress} />
            ))}
            {/* End card */}
            <div className="flex-shrink-0 w-[40vw] max-w-2xl">
              <div className="glass-dark rounded-3xl p-10 border border-white/10 text-center">
                <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-extrabold text-white mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>That's all for now.</h3>
                <p className="text-slate-300 mb-6 text-sm">New cohorts and events added every month.</p>
                <MagneticButton strength={0.2} as="a" href="/contact" className="btn-tactile btn-tactile-primary px-6 py-3.5 text-sm w-full justify-center">
                  <Clock className="w-4 h-4" /> Notify me
                </MagneticButton>
              </div>
            </div>
          </motion.div>
          {/* Progress dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            {[...EVENTS, null].map((_, i) => <EventProgressDot key={i} index={i} count={count + 1} progress={smoothProgress} />)}
          </div>
        </div>
      </div>

      {/* MOBILE/TABLET: Dramatic staggered vertical grid with scroll parallax */}
      <div className="lg:hidden relative px-5 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {EVENTS.map((event, i) => (
            <AnimatedEventCard key={event.id} event={event} index={i} />
          ))}
        </div>

        {/* Mobile end CTA */}
        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: -15 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 glass-dark rounded-3xl p-6 border border-white/10 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-3"
          >
            <Sparkles className="w-8 h-8 text-blue-400" />
          </motion.div>
          <h3 className="text-lg font-extrabold text-white mb-2" style={{ fontFamily: 'var(--font-jakarta)' }}>
            More coming soon
          </h3>
          <p className="text-sm text-slate-300 mb-4">New cohorts added monthly. Get notified.</p>
          <a href="/contact" className="btn-tactile btn-tactile-primary px-5 py-3 text-sm w-full justify-center inline-flex">
            <Clock className="w-4 h-4" /> Notify me
          </a>
        </motion.div>
      </div>
    </section>
  );
}
