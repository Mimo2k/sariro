'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Component, useRef, useState, useEffect, Suspense, type ReactNode } from 'react';
import * as THREE from 'three';
import { BookOpen, Hammer, Rocket, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudioEnvironment } from '@/components/sariro-3d/studio-environment';

/* ───── Canvas error boundary ───── */
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[OryzoSection] 3D scene crashed — falling back to gradient only:', error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ===============================================================
   ORYZO SECTION — Floating Book on light background
   - 3D open book floats + gently rotates behind text
   - 4 text chapters cross-fade based on activeIndex
   - Left/right arrow buttons + clickable dots + mobile swipe
   - 5-second auto-play with pause on hover
   - Light/cream background (not dark)
=============================================================== */

/* ---------- 3D Floating Book ---------- */
const CHAPTER_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B'];

function FloatingBook({ activeIdx, count }: { activeIdx: number; count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const pageTurnRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gentle floating
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      // Slow rotation — just slight sway, not full spin
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
    // Glow pulse
    if (glowRef.current) {
      const pulse = 2 + Math.sin(state.clock.elapsedTime * 2) * 0.8;
      glowRef.current.intensity = pulse;
    }
  });

  const activeColor = CHAPTER_COLORS[activeIdx % CHAPTER_COLORS.length];

  return (
    <group ref={groupRef} rotation={[-0.3, 0, 0]} position={[0, 0.8, 0]}>
      {/* ── Left page block (thick, angled into V) ── */}
      <group position={[-0.7, 0, 0]} rotation={[0, 0.25, 0]}>
        {/* Page stack — thick box so it has visible depth */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.08, 1.5]} />
          <meshStandardMaterial color="#FFFAF0" roughness={0.9} metalness={0} />
        </mesh>
        {/* Glowing text lines on top of left page */}
        {[...Array(6)].map((_, i) => (
          <mesh key={`l-${i}`} position={[-0.1, 0.045, -0.5 + i * 0.18]}>
            <planeGeometry args={[0.7, 0.03]} />
            <meshBasicMaterial color={activeColor} transparent opacity={0.3 + (i / 6) * 0.4} />
          </mesh>
        ))}
      </group>

      {/* ── Right page block (thick, angled into V) ── */}
      <group position={[0.7, 0, 0]} rotation={[0, -0.25, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.08, 1.5]} />
          <meshStandardMaterial color="#FFFAF0" roughness={0.9} metalness={0} />
        </mesh>
        {/* Glowing text lines on top of right page */}
        {[...Array(6)].map((_, i) => (
          <mesh key={`r-${i}`} position={[0.1, 0.045, -0.5 + i * 0.18]}>
            <planeGeometry args={[0.7, 0.03]} />
            <meshBasicMaterial color={activeColor} transparent opacity={0.3 + (i / 6) * 0.4} />
          </mesh>
        ))}
      </group>

      {/* ── Spine (center connector — dark, slightly raised) ── */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.15, 0.12, 1.5]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* ── Book cover underneath (visible as dark base) ── */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.6, 0.06, 1.6]} />
        <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* ── Bookmark ribbon (hanging from right page) ── */}
      <mesh position={[0.4, -0.2, 0.6]}>
        <boxGeometry args={[0.15, 0.5, 0.02]} />
        <meshStandardMaterial color={activeColor} emissive={activeColor} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>

      {/* ── Glow from the book center ── */}
      <pointLight ref={glowRef} position={[0, 0.3, 0.5]} color={activeColor} intensity={2.5} distance={5} />

      {/* ── Warm key light from above ── */}
      <pointLight position={[0, 2, 1]} color="#FFFAF0" intensity={0.8} distance={6} />
      <pointLight position={[-2, 0, 2]} color="#FFFAF0" intensity={0.4} distance={4} />
    </group>
  );
}

/* ---------- Text chapter data ---------- */
const TEXT_BLOCKS = [
  { num: '01', title: 'Curiosity', body: 'You start with a question. Why does ChatGPT work? How does a self-driving car see? We meet you there — at the edge of wonder.', icon: BookOpen, color: '#2563EB' },
  { num: '02', title: 'Foundations', body: 'No copy-paste tutorials. We build the mental models — systems thinking, problem decomposition, abstraction. The thinking behind the typing.', icon: Hammer, color: '#7C3AED' },
  { num: '03', title: 'Build', body: 'Real projects. Real feedback. Real failures. You ship 3 portfolio artifacts you can show employers, clients, and yourself.', icon: Rocket, color: '#16A34A' },
  { num: '04', title: 'Belong', body: 'You join 5,000+ builders across 65 countries. You don\'t just learn — you become part of a movement that\'s shaping the future.', icon: Users, color: '#F59E0B' },
];

export default function OryzoSection({ id = 'oryzo' }: { id?: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = TEXT_BLOCKS.length;

  const goNext = () => setActiveIdx((i) => (i + 1) % count);
  const goPrev = () => setActiveIdx((i) => (i - 1 + count) % count);

  // Auto-play every 5s, pause on hover
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i) % count);
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

  const active = TEXT_BLOCKS[activeIdx];
  const Icon = active.icon;

  return (
    <section
      id={id}
      data-chapter="oryzo"
      data-chapter-label="Journey"
      className="relative bg-amber-50 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Light background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-blue-50" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 50%)'
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)'
        }} />
      </div>

      {/* 3D Canvas — floating book behind text */}
      <div className="absolute inset-0">
        <CanvasErrorBoundary>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 1.5, 4.5], fov: 50 }}
            gl={{ antialias: true, alpha: true, depth: false, powerPreference: 'high-performance' }}
            style={{ background: 'transparent' }}
            performance={{ min: 0.5 }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 5]} intensity={1} />
            <directionalLight position={[-3, 2, -3]} intensity={0.3} color="#7C3AED" />
            <Suspense fallback={null}>
              <FloatingBook activeIdx={activeIdx} count={count} />
              {/* Warm golden sparkles rising from the book */}
              <Sparkles count={30} scale={[4, 4, 4]} size={3} speed={0.4} opacity={0.6} color="#F59E0B" position={[0, 1, 0]} />
              <Sparkles count={15} scale={[3, 3, 3]} size={2} speed={0.3} opacity={0.4} color="#2563EB" position={[0, 0.5, 0]} />
              <StudioEnvironment />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      {/* Content — single screen height, no pinning */}
      <div className="relative h-screen flex flex-col items-center justify-center px-4">
        {/* Top label */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center z-10 pointer-events-none">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600" style={{ fontFamily: 'var(--font-grotesk)' }}>
            — How Sariro works —
          </span>
        </div>

        {/* 3D book is visible in the upper 60% of the screen.
            Text card sits at the bottom 40%, so both are visible. */}

        {/* Active chapter text (cross-fade) — frosted glass card at bottom */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center rounded-3xl backdrop-blur-md text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                padding: '1.5rem 2rem',
              }}
            >
              {/* Number + Icon */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span
                  className="text-4xl sm:text-5xl font-extrabold leading-none opacity-20"
                  style={{ fontFamily: 'var(--font-jakarta)', color: active.color }}
                >
                  {active.num}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${active.color}, ${active.color}99)`, boxShadow: `0 8px 24px -8px ${active.color}` }}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.4} />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3" style={{ fontFamily: 'var(--font-jakarta)' }}>
                {active.title}
              </h3>

              {/* Body */}
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-md mx-auto font-medium">
                {active.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow buttons (left + right) — dark on light */}
        <button
          onClick={goPrev}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white text-slate-700 border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 hover:shadow-xl transition-all cursor-pointer"
          aria-label="Previous chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goNext}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white text-slate-700 border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 hover:shadow-xl transition-all cursor-pointer"
          aria-label="Next chapter"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Progress dots (clickable) */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          {TEXT_BLOCKS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full transition-all cursor-pointer"
              style={{
                width: i === activeIdx ? 32 : 8,
                height: 8,
                background: i === activeIdx ? '#2563EB' : 'rgba(0,0,0,0.15)',
              }}
              aria-label={`Go to chapter ${i + 1}`}
            />
          ))}
        </div>

        {/* Chapter counter (top-right) */}
        <div className="absolute top-20 right-8 text-right z-20 pointer-events-none">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block" style={{ fontFamily: 'var(--font-grotesk)' }}>
            Chapter
          </span>
          <span className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            0{activeIdx + 1}
            <span className="text-slate-400 text-base"> / 0{count}</span>
          </span>
        </div>
      </div>
    </section>
  );
}