import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { rand } from '../lib/prng.js';
import { useFrame } from '../lib/frame';
import { unitFor } from '../lib/layout.js';

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};
export { hexA };

/** Base colour + CRT grid. Static per video (cheap). */
export const Background: React.FC<{ design: any }> = ({ design }) => {
  const { width, height } = design;
  const u = unitFor(width, height);
  const g = design.texture.grid || {};
  const cell = (g.cell_px || 38) * u;
  const line = (g.line_px || 4) * u;
  const lc = hexA(design.colors[g.color] || g.color || '#000000', g.opacity ?? 0.5);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 40% 45%, ${design.colors.background_alt || design.colors.background} 0%, ${design.colors.background} 70%)`,
      }}
    >
      {g.enabled !== false && (
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(to right, ${lc} 0 ${line}px, transparent ${line}px), linear-gradient(to bottom, ${lc} 0 ${line}px, transparent ${line}px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${(-line / 2).toFixed(2)}px ${(-line / 2).toFixed(2)}px`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** Scanlines, vignette, grain and flicker — drawn over everything. Deterministic per frame. */
export const Overlays: React.FC<{ design: any }> = ({ design }) => {
  const frame = useFrame();
  const { width, height, fps } = design;
  const u = unitFor(width, height);
  const t = design.texture;
  const sl = t.scanlines || {};
  const vg = t.vignette || {};
  const gr = t.grain || {};
  const fl = t.flicker || {};
  const grainFrame = Math.floor(frame / Math.max(1, Math.round(fps / (gr.fps || 15))));
  const seed = Math.floor(rand(t.noise_seed || 1, grainFrame) * 1000);
  const flick = fl.enabled === false ? 0 : (rand('flicker', frame) - 0.5) * 2 * (fl.amplitude || 0.03);
  const spacing = Math.max(2, (sl.spacing_px || 3) * u);
  const thick = Math.max(1, (sl.thickness_px || 1) * u);
  const grainSvg = useMemo(
    () =>
      `url("data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(width / 2)}' height='${Math.round(height / 2)}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.2 -0.25'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
      )}")`,
    [seed, width, height]
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {sl.enabled !== false && (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,${sl.opacity ?? 0.15}) 0 ${thick}px, transparent ${thick}px ${spacing}px)`,
          }}
        />
      )}
      {gr.enabled !== false && (
        <AbsoluteFill style={{ backgroundImage: grainSvg, backgroundSize: '100% 100%', opacity: gr.amount ?? 0.06, mixBlendMode: 'screen' }} />
      )}
      {vg.enabled !== false && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(${(vg.roundness ?? 0.9) * 100}% ${(vg.roundness ?? 0.9) * 75}% at 50% 50%, transparent 35%, rgba(0,0,0,${vg.strength ?? 0.6}) 100%)`,
          }}
        />
      )}
      {flick !== 0 && <AbsoluteFill style={{ backgroundColor: flick > 0 ? `rgba(255,255,255,${flick * 0.4})` : `rgba(0,0,0,${-flick})` }} />}
    </AbsoluteFill>
  );
};

/** Transition-in effects at the head of a scene (glitch bands / flash). */
export const TransitionIn: React.FC<{ kind: string; design: any; seedKey: string }> = ({ kind, design, seedKey }) => {
  const frame = useFrame();
  const { width, height } = design;
  const n = design.motion.scene.transition_frames || 6;
  if (frame >= n || kind === 'hard_cut' || kind === 'open' || kind === 'dim_cut') return null;
  if (kind === 'flash_cut') {
    return <AbsoluteFill style={{ backgroundColor: `rgba(255,255,255,${0.55 * (1 - frame / 2)})`, opacity: frame < 2 ? 1 : 0 }} />;
  }
  const p = 1 - frame / n;
  const bands = Array.from({ length: 5 }, (_, i) => {
    const r = (k: string) => rand(seedKey, frame, i, k);
    return {
      top: r('y') * height,
      h: (0.01 + r('h') * 0.05) * height,
      x: (r('x') - 0.5) * 0.12 * width * p,
      c: i % 2 ? 'rgba(255,30,40,0.22)' : 'rgba(30,80,255,0.22)',
    };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {bands.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.x, top: b.top, width: width, height: b.h, backgroundColor: b.c, opacity: p }} />
      ))}
    </AbsoluteFill>
  );
};
