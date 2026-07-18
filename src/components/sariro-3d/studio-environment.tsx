'use client';

/**
 * SARIRO — Procedural studio lighting environment
 *
 * Replaces the old `<Environment preset="city" />` (which fetched a
 * 1.5MB HDR file from raw.githubusercontent.com) with an in-memory
 * cube map built from Lightformer rectangles.
 *
 * Why this exists:
 *   - The MeshDistortMaterial on the orb has metalness=0.7-0.8 and
 *     roughness=0.1-0.15. Without an environment map, metallic
 *     surfaces render almost BLACK because there's nothing to reflect.
 *   - Direct lights alone can't fix this — they only create specular
 *     highlights, not the full-sphere reflection a metallic surface
 *     needs.
 *   - The procedural Lightformer setup gives the metal something to
 *     reflect (a soft white key + blue/violet accent rim) without any
 *     network fetch. Looks as good as the HDR, zero external deps.
 *
 * The rig mimics a 3-point studio lighting setup:
 *   1. Key light — large soft white from top-front
 *   2. Fill — blue accent from camera-left
 *   3. Rim — violet accent from camera-right
 *   4. Bottom bounce — subtle dark fill from below (grounds the orb)
 *
 * `frames={1}` renders the env map ONCE and caches it (no per-frame
 * cost). `resolution={256}` is plenty for reflections on a single orb.
 *
 * Drop this inside a `<Suspense>` block alongside your scene contents.
 */

import { Environment, Lightformer } from '@react-three/drei';

export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Key light — soft white from top-front */}
      <Lightformer
        intensity={3}
        position={[0, 5, 5]}
        scale={[10, 5, 1]}
        color="white"
        form="rect"
      />
      {/* Fill — blue accent from camera-left */}
      <Lightformer
        intensity={2}
        position={[-5, 2, 5]}
        scale={[5, 5, 1]}
        color="#60A5FA"
        form="rect"
      />
      {/* Rim — violet accent from camera-right */}
      <Lightformer
        intensity={2}
        position={[5, 2, 3]}
        scale={[5, 5, 1]}
        color="#A78BFA"
        form="rect"
      />
      {/* Top hairlight — small bright spot from directly above */}
      <Lightformer
        intensity={2.5}
        position={[0, 8, 0]}
        scale={[3, 3, 1]}
        color="white"
        form="circle"
      />
      {/* Bottom bounce — subtle dark fill from below (grounds the orb) */}
      <Lightformer
        intensity={0.6}
        position={[0, -5, 0]}
        scale={[10, 5, 1]}
        color="#1E293B"
        form="rect"
      />
    </Environment>
  );
}
