'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { GraduationCap } from 'lucide-react';

/* ===============================================================
   NEURAL MORPH INTRO 3D — 10/10 WOAH factor
   - TRUE 3D particle field (camera flies through it)
   - Particles form a 3D neural network
   - Data pulses travel along 3D connections
   - Network collapses into center
   - Light burst → logo appears
   - "SARIRO" types out letter by letter with glow
   - Tagline reveals
   - Hard cut to hero
   - NO SOUND (visual-only, AI brand aesthetic)
   - Mobile-optimized (fewer particles, smaller canvas)
=============================================================== */

type Phase = 'field' | 'network' | 'collapse' | 'logo' | 'type' | 'done';

// Deterministic seeded value (no hydration mismatch)
function seededValue(i: number, min: number, max: number): number {
  const x = Math.sin(i * 9999 + 1234) * 10000;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

/* ---------- 3D Particle Field + Neural Network ---------- */
function ParticleField({
  phase,
  isMobile,
}: {
  phase: Phase;
  isMobile: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const particleCount = isMobile ? 80 : 200;
  const nodeCount = isMobile ? 12 : 20;

  // Generate particle starting positions (scattered in 3D space)
  const { startPositions, networkPositions, edges } = useMemo(() => {
    const starts: [number, number, number][] = [];
    for (let i = 0; i < particleCount; i++) {
      starts.push([
        (seededValue(i, -1, 1)) * 8,
        (seededValue(i + 1000, -1, 1)) * 8,
        (seededValue(i + 2000, -1, 1)) * 8,
      ]);
    }

    // Network node positions (sphere formation)
    const network: [number, number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2;
      network.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }

    // Connect nearby nodes
    const edgeList: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = network[i][0] - network[j][0];
        const dy = network[i][1] - network[j][1];
        const dz = network[i][2] - network[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 2.5) edgeList.push([i, j]);
      }
    }

    return { startPositions: starts, networkPositions: network, edges: edgeList };
  }, [particleCount, nodeCount]);

  // Particle mesh refs for animation
  const particleRefs = useRef<THREE.Mesh[]>([]);
  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const lineRefs = useRef<THREE.LineSegments>(null);
  const pulseRefs = useRef<THREE.Mesh[]>([]);
  const burstRef = useRef<THREE.Mesh>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Track mouse for reactive particles
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera;

    // Camera dolly — flies through field, then pulls back
    const camPos = cam.position;
    if (phase === 'field') {
      camPos.z = THREE.MathUtils.lerp(camPos.z, 3, delta * 0.5);
      // Subtle camera parallax based on mouse
      camPos.x = THREE.MathUtils.lerp(camPos.x, mouseRef.current.x * 0.5, delta * 2);
      camPos.y = THREE.MathUtils.lerp(camPos.y, mouseRef.current.y * 0.3, delta * 2);
    } else if (phase === 'network') {
      camPos.z = THREE.MathUtils.lerp(camPos.z, 5, delta * 0.8);
      camPos.y = THREE.MathUtils.lerp(camPos.y, 0.5, delta * 0.5);
      // Slow orbit during network phase
      camPos.x = Math.sin(t * 0.2) * 0.8;
    } else if (phase === 'collapse' || phase === 'logo') {
      camPos.z = THREE.MathUtils.lerp(camPos.z, 4, delta * 1);
      camPos.x = THREE.MathUtils.lerp(camPos.x, 0, delta * 2);
      camPos.y = THREE.MathUtils.lerp(camPos.y, 0, delta * 2);
    }
    cam.lookAt(0, 0, 0);

    // Group rotation during network phase for dynamism
    if (groupRef.current && phase === 'network') {
      groupRef.current.rotation.y += delta * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }

    // Animate particles — fly from start to network positions, then collapse to center
    particleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const target = networkPositions[i % nodeCount];
      if (phase === 'field') {
        // Drift around start position
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, startPositions[i][0], delta * 0.5);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, startPositions[i][1], delta * 0.5);
        mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, startPositions[i][2], delta * 0.5);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.6, delta * 2);
      } else if (phase === 'network') {
        // Move to network positions
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, target[0], delta * 1.5);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, target[1], delta * 1.5);
        mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, target[2], delta * 1.5);
      } else {
        // Collapse to center
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, 0, delta * 3);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, 0, delta * 3);
        mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, 0, delta * 3);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, delta * 3);
      }
    });

    // Animate nodes — appear during network phase, pulse, then fade
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (phase === 'network') {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1, delta * 2);
        const pulse = 1 + Math.sin(t * 2 + i * 0.3) * 0.2;
        mesh.scale.setScalar(pulse);
        mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + i * 0.3) * 0.3;
      } else if (phase === 'collapse') {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, delta * 3);
      } else {
        mat.opacity = 0;
      }
    });

    // Animate connection lines
    if (lineRefs.current) {
      const mat = lineRefs.current.material as THREE.LineBasicMaterial;
      if (phase === 'network') {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.4, delta * 2);
      } else {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, delta * 3);
      }
    }

    // Animate data pulses along edges
    pulseRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (phase === 'network') {
        const edge = edges[i % edges.length];
        if (edge) {
          const progress = ((t * 0.5 + i * 0.15) % 1);
          const a = networkPositions[edge[0]];
          const b = networkPositions[edge[1]];
          mesh.position.set(
            a[0] + (b[0] - a[0]) * progress,
            a[1] + (b[1] - a[1]) * progress,
            a[2] + (b[2] - a[2]) * progress,
          );
          mat.opacity = Math.sin(progress * Math.PI);
        }
      } else {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, delta * 3);
      }
    });

    // Light burst during logo phase
    if (burstRef.current) {
      const mat = burstRef.current.material as THREE.MeshBasicMaterial;
      if (phase === 'logo') {
        burstRef.current.scale.setScalar(THREE.MathUtils.lerp(burstRef.current.scale.x, 8, delta * 4));
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, delta * 2);
      } else {
        mat.opacity = 0;
        burstRef.current.scale.setScalar(0.1);
      }
    }
  });

  // Build line geometry
  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    edges.forEach(([from, to]) => {
      const a = networkPositions[from];
      const b = networkPositions[to];
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [edges, networkPositions]);

  // RESTRICTED PALETTE — 3 brand colors only (Apple/Stripe style)
  const colors = ['#2563EB', '#7C3AED', '#FFFFFF'];

  return (
    <group ref={groupRef}>
      {/* Particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(el) => { if (el) particleRefs.current[i] = el; }}
          position={startPositions[i]}
        >
          <sphereGeometry args={[0.03 + seededValue(i + 500, 0, 0.03), 8, 8]} />
          <meshBasicMaterial
            color={colors[i % colors.length]}
            transparent
            opacity={0}
          />
        </mesh>
      ))}

      {/* Network nodes — premium 3D spheres with depth */}
      {networkPositions.map((pos, i) => (
        <mesh
          key={`n-${i}`}
          ref={(el) => { if (el) nodeRefs.current[i] = el; }}
          position={pos}
        >
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial
            color={colors[i % colors.length]}
            emissive={colors[i % colors.length]}
            emissiveIntensity={0.6}
            transparent
            opacity={0}
            metalness={0.8}
            roughness={0.15}
          />
        </mesh>
      ))}

      {/* Connection lines */}
      <lineSegments ref={lineRefs} geometry={lineGeometry}>
        <lineBasicMaterial color="#2563EB" transparent opacity={0} />
      </lineSegments>

      {/* Data pulses */}
      {edges.slice(0, isMobile ? 5 : 10).map((_, i) => (
        <mesh
          key={`pulse-${i}`}
          ref={(el) => { if (el) pulseRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} />
        </mesh>
      ))}

      {/* Light burst (appears at logo phase) */}
      <mesh ref={burstRef} scale={0.1}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0} />
      </mesh>

      {/* Premium lighting — key light from top-left (Apple-style) */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFFFFF" />
      <pointLight position={[0, 0, 4]} color="#2563EB" intensity={3} distance={12} />
      <pointLight position={[-4, 2, 2]} color="#7C3AED" intensity={1.5} distance={10} />
      <pointLight position={[4, -2, -2]} color="#2563EB" intensity={1} distance={10} />
    </group>
  );
}

/* ---------- Typography Component (types out SARIRO) ---------- */
function TypingLogo({ visible, isMobile }: { visible: boolean; isMobile: boolean }) {
  const letters = 'SARIRO'.split('');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
    >
      {/* Logo box with glow */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-6"
      >
        {/* Pulsing glow */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl blur-2xl"
          style={{ background: 'radial-gradient(circle, #2563EB, transparent 70%)' }}
        />
        <div
          className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-2xl`}
        >
          <GraduationCap className={isMobile ? 'w-8 h-8' : 'w-12 h-12'} color="white" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* SARIRO typing out */}
      <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'} mb-3`}>
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20, rotateX: -90 }}
            animate={visible ? { opacity: 1, y: 0, rotateX: 0 } : {}}
            transition={{
              duration: 0.4,
              delay: i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`inline-block font-extrabold text-white tracking-tight ${isMobile ? 'text-3xl' : 'text-6xl'}`}
            style={{
              fontFamily: 'var(--font-jakarta)',
              textShadow: '0 0 20px rgba(37, 99, 235, 0.8), 0 0 40px rgba(124, 58, 237, 0.6)',
              transformOrigin: '50% 100%',
              transformStyle: 'preserve-3d',
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className={`font-bold uppercase tracking-[0.3em] text-blue-400 ${isMobile ? 'text-[10px]' : 'text-sm'}`}
        style={{ fontFamily: 'var(--font-grotesk)' }}
      >
        AI Education
      </motion.div>

      {/* Full tagline — appears last */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 0.6 : 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className={`mt-4 text-slate-400 text-center max-w-xs ${isMobile ? 'text-[10px] px-6' : 'text-sm'}`}
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        Teaching the future. We teach thinking, not just coding.
      </motion.p>
    </motion.div>
  );
}

/* ---------- Main Component ---------- */
export default function CinematicIntro() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>('field');
  const [skipVisible, setSkipVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seen = sessionStorage.getItem('sariro-intro-seen');
    if (seen) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const mobileCheck = window.innerWidth < 768;
    const showFrame = requestAnimationFrame(() => {
      setIsMobile(mobileCheck);
      setShow(true);
    });

    // Skip button after 1s
    const skipTimer = setTimeout(() => setSkipVisible(true), 1000);

    // Phase timeline (4.5s total — slightly longer for drama)
    const t1 = setTimeout(() => setPhase('network'), 1200);   // 1.2s: network forms
    const t2 = setTimeout(() => setPhase('collapse'), 2800);  // 2.8s: collapse
    const t3 = setTimeout(() => setPhase('logo'), 3100);      // 3.1s: light burst
    const t4 = setTimeout(() => setPhase('type'), 3400);      // 3.4s: typography
    const t5 = setTimeout(() => {                             // 4.5s: done
      setPhase('done');
      sessionStorage.setItem('sariro-intro-seen', '1');
    }, 4500);
    const t6 = setTimeout(() => setShow(false), 4600);

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(skipTimer);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
    };
  }, []);

  const skip = useCallback(() => {
    setShow(false);
    if (typeof window !== 'undefined') sessionStorage.setItem('sariro-intro-seen', '1');
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden"
        >
          {/* Animated gradient background — shifts color per phase */}
          <motion.div
            animate={{
              background: phase === 'field'
                ? 'radial-gradient(circle at center, #0B1120 0%, #000 100%)'
                : phase === 'network'
                ? 'radial-gradient(circle at center, #1E1B4B 0%, #0B1120 70%)'
                : 'radial-gradient(circle at center, #1E3A8A 0%, #0B1120 70%)'
            }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
          />

          {/* 3D Canvas — particle field + neural network */}
          <div className="absolute inset-0">
            <Canvas
              dpr={[1, isMobile ? 1.2 : 2]}
              camera={{ position: [0, 0, 8], fov: 60 }}
              gl={{ antialias: true, alpha: true, depth: false, powerPreference: 'high-performance' }}
              style={{ background: 'transparent' }}
              performance={{ min: 0.5 }}
            >
              <ParticleField phase={phase} isMobile={isMobile} />
            </Canvas>
          </div>

          {/* Typography overlay (logo phase onwards) */}
          <TypingLogo visible={phase === 'logo' || phase === 'type'} isMobile={isMobile} />

          {/* Progress bar — thicker with glow (visible per feedback) */}
          <div className={`absolute ${isMobile ? 'bottom-14' : 'bottom-20'} left-1/2 -translate-x-1/2 ${isMobile ? 'w-32' : 'w-56'} z-20`}>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 4.5, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 origin-left rounded-full"
                style={{ boxShadow: '0 0 8px rgba(37, 99, 235, 0.8)' }}
              />
            </div>
          </div>

          {/* Skip button — premium style (rounded rect, white on dark blue, top-right per Stripe/Apple) */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: skipVisible ? 1 : 0, y: skipVisible ? 0 : -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={skip}
            className="absolute top-6 right-6 sm:top-8 sm:right-8 px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 z-20 shadow-lg shadow-blue-500/40"
            style={{ minHeight: '44px', minWidth: '44px', fontFamily: 'var(--font-grotesk)' }}
            aria-label="Skip intro"
          >
            Skip
            <span className="text-[9px] opacity-70">↗</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
