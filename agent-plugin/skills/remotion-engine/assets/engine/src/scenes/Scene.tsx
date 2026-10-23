import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, Easing } from 'remotion';
import { buildTimeline } from '../lib/timeline.js';
import { TEMPLATES } from '../lib/templates.js';
import { unitFor, contentBox, resolveSize } from '../lib/layout.js';
import { rand } from '../lib/prng.js';
import { useFrame } from '../lib/frame';
import { TransitionIn } from '../components/Texture';
import { GlitchIn, WordsIn, DecodeIn, TypeIn, CountIn, FadeIn, Logo } from '../components/Reveals';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Is this element the scene's accented element? */
function isAccent(el: any, scene: any, all: any[]) {
  if (!scene.accent) return false;
  const t = scene.accent.target as string;
  if (t === 'lines:last') return el.slot === 'lines' && el.last;
  if (t === 'parts:accent') {
    const marked = all.some((e) => e.slot === 'parts' && e.accent);
    if (marked) return el.slot === 'parts' && el.accent;
    const heads = all.filter((e) => e.slot === 'parts' && e.role === 'headline');
    return heads.length > 0 && el === heads[heads.length - 1];
  }
  if (t === 'items:marker') return false; // handled by the marker
  return el.slot === t;
}

/** Generic scene renderer: every template is a left/centre-anchored vertical stack whose final
 * layout exists from frame 0 — only visibility animates, so nothing reflows when copy lands. */
export const Scene: React.FC<{ scene: any; spec: any }> = ({ scene, spec }) => {
  const frame = useFrame();
  const design = spec.design;
  // Dimensions come from the spec, not useVideoConfig(), so a scene can also render inside the contact sheet.
  const { width, height, fps } = design;
  const unit = unitFor(width, height) * (design.layout.type_scale || 1);
  const box = contentBox(design, width, height);
  const tl = useMemo(() => buildTimeline(scene, design.motion.timing, fps), [scene, design, fps]);
  const tpl = TEMPLATES[scene.template];
  const enter = Easing.bezier(...(design.motion.easing.enter as [number, number, number, number]));

  // exit
  const exitP = interpolate(frame, [tl.exitStart, scene.durationInFrames - 1], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  let exitOpacity = 1;
  if (scene.transitionOut === 'dim_cut') exitOpacity = 1 - exitP;
  else if (scene.transitionOut === 'glitch_cut' || scene.transitionOut === 'flash_cut') {
    exitOpacity = 1 - 0.85 * exitP;
    if (exitP > 0 && rand(scene.id, frame, 'exit') < 0.35) exitOpacity *= 0.35;
  }
  // camera drift (slow push) + optional land shake
  const drift = 1 + (design.motion.camera.drift_scale || 0) * interpolate(frame, [0, scene.durationInFrames], [0, 1], clamp);
  const heroLand = tl.elements.find((e: any) => e.reveal === 'decode' && (e.slot === 'headline' || e.hero))?.land;
  const shakeAmt = design.motion.camera.shake_on_land_px || 0;
  const shake = shakeAmt && heroLand !== undefined && frame >= heroLand && frame < heroLand + 6 ? (rand(scene.id, frame, 'sh') - 0.5) * 2 * shakeAmt * unit * (1 - (frame - heroLand) / 6) : 0;

  const glowCfg = design.texture.glow || {};
  const anchor = design.layout.anchor === 'center' ? 'center' : 'flex-start';

  const nodes = tl.elements.map((el: any, i: number) => {
    const roleName = el.slot === 'logo' ? 'headline' : el.role;
    const role = design.roles[roleName] || design.roles.setup;
    const accent = isAccent(el, scene, tl.elements);
    const sizeMul = scene.template === 'title' && el.slot === 'headline' ? tpl.headlineScale || 1.35 : 1;
    const base = role.size_px * unit * sizeMul;
    const { fontSize } = resolveSize(el.text, role, unit, box.width, sizeMul);
    const color = accent ? scene.accent.color : role.color;
    const glow = role.glow || accent
      ? { blur: (accent ? glowCfg.accent_blur_px ?? 22 : glowCfg.headline_blur_px ?? 16) * unit, opacity: accent ? glowCfg.accent_opacity ?? 0.7 : glowCfg.headline_opacity ?? 0.5 }
      : null;
    const style = {
      fontFamily: role.fontFamily,
      fontSize,
      fontWeight: role.weight || 400,
      letterSpacing: `${role.tracking_em || 0}em`,
      lineHeight: role.line_height || 1.1,
      color,
    } as React.CSSProperties & { color: string };
    const prev = tl.elements[i - 1];
    let marginTop = 0;
    if (prev) {
      if (prev.slot === 'logo') marginTop = 44 * unit;
      else if (prev.slot === 'label') marginTop = 22 * unit;
      else if (el.slot === prev.slot && (el.slot === 'items' || el.slot === 'lines')) marginTop = base * 0.12;
      else marginTop = Math.max(6 * unit, base * (design.layout.stack_gap_em ?? 0.18) * 0.6);
    }
    const props = { el, frame, style, design, glow, unit };
    let node: React.ReactNode;
    if (el.slot === 'logo') {
      node = (
        <FadeIn {...props} style={{ ...style }}>
          <Logo design={design} height={(design.brand.logo ? 110 : 96) * unit} />
        </FadeIn>
      );
    } else if (el.reveal === 'glitch') node = <GlitchIn {...props} />;
    else if (el.reveal === 'decode') node = <DecodeIn {...props} />;
    else if (el.reveal === 'type') node = <TypeIn {...props} />;
    else if (el.reveal === 'count') node = <CountIn {...props} />;
    else if (el.reveal === 'fade') node = <FadeIn {...props} />;
    else if (el.reveal === 'strike') node = <WordsIn {...props} strike strikeColor={scene.accent?.color || design.colors.accent_red} />;
    else node = <WordsIn {...props} />;

    if (el.slot === 'items') {
      const markerOn = frame >= el.start;
      const markerColor = scene.accent?.target === 'items:marker' ? scene.accent.color : design.colors.label || role.color;
      node = (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: `${0.6}em`, fontSize: style.fontSize, fontFamily: style.fontFamily }}>
          <span style={{ color: markerColor, opacity: markerOn ? 1 : 0 }}>{role.marker || '▸'}</span>
          {node}
        </span>
      );
    }
    return (
      <div key={`${el.slot}-${el.index}`} style={{ marginTop, maxWidth: box.width, textAlign: design.layout.anchor === 'center' ? 'center' : 'left' }}>
        {node}
      </div>
    );
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <div
          style={{
            position: 'absolute',
            left: box.left,
            top: box.top + height * (design.layout.block_offset_y || 0),
            width: box.width,
            height: box.height,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: design.layout.vertical_align === 'top' ? 'flex-start' : design.layout.vertical_align === 'bottom' ? 'flex-end' : 'center',
            alignItems: anchor,
            transform: `translate(${shake}px, 0) scale(${drift})`,
            transformOrigin: design.layout.anchor === 'center' ? '50% 50%' : '0% 50%',
          }}
        >
          {nodes}
        </div>
      </AbsoluteFill>
      <TransitionIn kind={scene.transitionIn} design={design} seedKey={scene.id} />
    </AbsoluteFill>
  );
};
