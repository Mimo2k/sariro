'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { EVENTS } from '@/lib/sariro-data';
import { SplitText3D, MagneticButton } from './scroll-effects';

const ACCENT_MAP: Record<string, { text: string; bg: string; soft: string; border: string; glow: string }> = {
  blue:   { text: 'text-blue-400',   bg: 'bg-blue-600',   soft: 'bg-blue-500/15',   border: 'border-blue-400/30',   glow: 'rgba(37, 99, 235, 0.5)' },
  green:  { text: 'text-green-400',  bg: 'bg-green-600',  soft: 'bg-green-500/15',  border: 'border-green-400/30',  glow: 'rgba(22, 163, 74, 0.5)' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-600', soft: 'bg-violet-500/15', border: 'border-violet-400/30', glow: 'rgba(124, 58, 237, 0.5)' },
};

/* ===============================================================
   EVENTS 3D — Arrow + Swipe navigation (NO pinned scroll)
   - 3 event cards cross-fade based on activeIndex
   - Left/right arrow buttons + clickable dots + mobile swipe
   - 5-second auto-play with pause on hover
=============================================================== */

export default function Events3D() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = EVENTS.length;

  const goNext = () => setActiveIdx((i) => (i + 1) % count);
  const goPrev = () => setActiveIdx((i) => (i - 1 + count) % count);

  // Auto-play every 5s, pause on hover
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(t);
  }, [paused, count]);

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const active = EVENTS[activeIdx];
  const a = ACCENT_MAP[active.accent] ?? ACCENT_MAP.blue;

  return (
    <section
      id="events"
      data-chapter="events"
      data-chapter-label="Events"
      className="relative bg-slate-950/95 text-white overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-violet-950" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.4) 0%, transparent 50%)'
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)'
        }} />
      </div>

      {/* Header */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-12">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 block" style={{ fontFamily: 'var(--font-grotesk)' }}>
            — Upcoming events —
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
            <SplitText3D text="Show up. Build something." highlight="Build" highlightClassName="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent" />
            <br />
            <SplitText3D text="Meet your people." highlight="people." highlightClassName="bg-gradient-to-r from-violet-400 to-green-400 bg-clip-text text-transparent" delay={0.3} />
          </h2>
          <p className="mt-5 text-lg text-slate-300">
            Cohorts, hackathons, and live workshops. Use the arrows or swipe to step through each one — every event is designed to leave you with something real.
          </p>
        </div>
      </div>

      {/* Card stage — single screen, no pinning */}
      <div className="relative pb-24">
        <div className="relative max-w-5xl mx-auto px-4" style={{ minHeight: '420px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 px-4"
            >
              <div
                className="relative glass-dark rounded-3xl p-8 sm:p-12 border border-white/10 overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Glow */}
                <div
                  className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none"
                  style={{ background: a.glow }}
                />

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Left: meta */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${a.soft} ${a.text} border ${a.border}`} style={{ fontFamily: 'var(--font-grotesk)' }}>
                        {active.type}
                      </span>
                      <span className="text-xs font-bold text-slate-300">{active.price}</span>
                    </div>

                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: 'var(--font-jakarta)' }}>
                      {active.title}
                    </h3>
                    <p className="text-base text-slate-300 mb-6 leading-relaxed">{active.description}</p>

                    <div className="space-y-2.5 mb-7">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        {active.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-green-400" />
                        {active.location} · {active.format}
                      </div>
                    </div>

                    <MagneticButton
                      strength={0.2}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    >
                      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${a.bg}`} />
                      Reserve spot
                      <ArrowRight className="w-4 h-4" />
                    </MagneticButton>
                  </div>

                  {/* Right: big number + ghost icon */}
                  <div className="relative h-48 md:h-64 flex items-center justify-center">
                    <div
                      className="absolute text-[14rem] sm:text-[18rem] font-extrabold leading-none opacity-10 select-none"
                      style={{ fontFamily: 'var(--font-jakarta)', color: a.glow }}
                    >
                      {String(activeIdx + 1).padStart(2, '0')}
                    </div>
                    <div
                      className={`relative w-24 h-24 rounded-3xl ${a.bg} flex items-center justify-center shadow-2xl`}
                      style={{ boxShadow: `0 25px 60px -20px ${a.glow}` }}
                    >
                      <Sparkles className="w-12 h-12 text-white" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow buttons */}
        <button
          onClick={goPrev}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
          aria-label="Previous event"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
          aria-label="Next event"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Progress dots (clickable) */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {EVENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full transition-all cursor-pointer"
              style={{
                width: i === activeIdx ? 32 : 8,
                height: 8,
                background: i === activeIdx ? '#2563EB' : 'rgba(255,255,255,0.3)',
              }}
              aria-label={`Go to event ${i + 1}`}
            />
          ))}
        </div>

        {/* Event counter (top-right) */}
        <div className="absolute top-4 right-6 text-right z-20 pointer-events-none">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block" style={{ fontFamily: 'var(--font-grotesk)' }}>
            Event
          </span>
          <span className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-jakarta)' }}>
            0{activeIdx + 1}
            <span className="text-slate-500 text-base"> / 0{count}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
