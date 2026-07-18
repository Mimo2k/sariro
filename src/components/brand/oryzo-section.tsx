'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Component, useRef, useState, useEffect, Suspense, type ReactNode } from 'react';
import * as THREE from 'three';
import { Brain, Hammer, Rocket, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudioEnvironment } from '@/components/sariro-3d/studio-environment';

/* ───── Canvas error boundary ─────
   If WebGL fails (driver issue, context loss, HDR fetch failure, etc.),
   swallow the error and render null. The gradient background behind
   the canvas still shows, so the page never crashes — it just loses
   the 3D effect. */
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
   ORYZO SECTION — Arrow + Swipe navigation (NO pinned scroll)
   - 3D AICore canvas stays fixed behind
   - 4 text chapters cross-fade based on activeIndex
   - Left/right arrow buttons + clickable dots + mobile swipe
   - 5-second auto-play with pause on hover
=============================================================== */

/* ---------- 3D AI Core: camera orbits based on active chapter ---------- */
function AICore({ activeIdx, count }: { activeIdx: number; count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const nodesRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // Target rotation = activeIdx / count * 2π (full 360° spread across chapters)
    const targetY = (activeIdx / count) * Math.PI * 2;
    const targetX = (activeIdx / count) * 0.4;

    if (groupRef.current) {
      // Smooth lerp toward target
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
    }

    // Inner core breathes
    if (innerRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
      innerRef.current.scale.setScalar(pulse);
    }

    // Wireframe shell rotates opposite for parallax depth
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.3;
      wireRef.current.rotation.z += delta * 0.1;
    }

    // Orbiting rings
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.5;
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 3;
      ring2Ref.current.rotation.z -= delta * 0.3;
    }

    // Node cluster rotates
    if (nodesRef.current) {
      nodesRef.current.rotation.y += delta * 0.4;
      nodesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  // Orbiting data nodes
  const nodePositions = (() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 2.5;
      arr.push([Math.cos(angle) * r, Math.sin(angle * 2) * 0.5, Math.sin(angle) * r]);
    }
    return arr;
  })();

  return (
    <group ref={groupRef}>
      {/* Inner glowing core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 4]} />
        <MeshDistortMaterial color="#2563EB" speed={2} distort={0.3} roughness={0.1} metalness={0.8} emissive="#2563EB" emissiveIntensity={0.4} />
      </mesh>

      {/* Wireframe outer shell */}
      <mesh ref={wireRef} scale={1.6}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshBasicMaterial color="#7C3AED" wireframe transparent opacity={0.35} />
      </mesh>

      {/* Orbiting rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.025, 8, 80]} />
        <meshBasicMaterial color="#16A34A" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.3, 0.02, 8, 80]} />
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.4} />
      </mesh>

      {/* Orbiting data nodes */}
      <group ref={nodesRef}>
        {nodePositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#2563EB' : '#7C3AED'}
              emissive={i % 2 === 0 ? '#2563EB' : '#7C3AED'}
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}
      </group>

      <pointLight color="#2563EB" intensity={3} distance={6} />
      <pointLight position={[3, 2, 3]} color="#7C3AED" intensity={1.5} distance={8} />
    </group>
  );
}

/* ---------- Text chapter data ---------- */
const TEXT_BLOCKS = [
  { num: '01', title: 'Curiosity', body: 'You start with a question. Why does ChatGPT work? How does a self-driving car see? We meet you there — at the edge of wonder.', icon: Brain, color: '#2563EB' },
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

  const active = TEXT_BLOCKS[activeIdx];
  const Icon = active.icon;

  return (
    <section
      id={id}
      data-chapter="oryzo"
      data-chapter-label="Journey"
      className="relative bg-slate-950 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-violet-950/50" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(37, 99, 235, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(124, 58, 237, 0.4) 0%, transparent 50%)'
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)'
        }} />
      </div>

      {/* 3D Canvas — fixed behind text. Wrapped in error boundary so
          any WebGL failure (driver crash, HDR fetch error, context loss)
          doesn't crash the whole page — the gradient bg still shows. */}
      <div className="absolute inset-0">
        <CanvasErrorBoundary>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 5.5], fov: 55 }}
            gl={{ antialias: true, alpha: true, depth: false, powerPreference: 'high-performance' }}
            style={{ background: 'transparent' }}
            performance={{ min: 0.5 }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#7C3AED" />
            <pointLight position={[0, 0, 3]} intensity={0.6} color="#2563EB" />
            <pointLight position={[3, -2, 2]} intensity={0.4} color="#7C3AED" />
            <Suspense fallback={null}>
              <AICore activeIdx={activeIdx} count={count} />
              <Sparkles count={40} scale={10} size={2} speed={0.3} opacity={0.5} color="#2563EB" />
              <Sparkles count={20} scale={8} size={3} speed={0.2} opacity={0.3} color="#7C3AED" />
              <StudioEnvironment />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      </div>

      {/* Content — single screen height, no pinning */}
      <div className="relative h-screen flex flex-col items-center justify-center px-4">
        {/* Top label */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center z-10 pointer-events-none">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400" style={{ fontFamily: 'var(--font-grotesk)' }}>
            — The Sariro Journey —
          </span>
        </div>

        {/* Active chapter text (cross-fade) — fixed height container so layout doesn't collapse during transition */}
        <div className="relative z-10 w-full max-w-2xl text-center" style={{ height: '340px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {/* Number + Icon */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span
                  className="text-6xl sm:text-7xl font-extrabold leading-none opacity-25"
                  style={{ fontFamily: 'var(--font-jakarta)', color: active.color }}
                >
                  {active.num}
                </span>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${active.color}, ${active.color}99)`, boxShadow: `0 20px 50px -20px ${active.color}` }}
                >
                  <Icon className="w-7 h-7 text-white" strokeWidth={2.4} />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>
                {active.title}
              </h3>

              {/* Body */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg mx-auto px-4">
                {active.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow buttons (left + right) */}
        <button
          onClick={goPrev}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
          aria-label="Previous chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={goNext}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
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
                background: i === activeIdx ? '#2563EB' : 'rgba(255,255,255,0.3)',
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
          <span className="text-2xl font-extrabold text-white" style={{ fontFamily: 'var(--font-jakarta)' }}>
            0{activeIdx + 1}
            <span className="text-slate-500 text-base"> / 0{count}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
