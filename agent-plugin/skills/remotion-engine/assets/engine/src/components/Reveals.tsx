import React from 'react';
import { Easing, interpolate, Img, staticFile } from 'remotion';
import { rand } from '../lib/prng.js';
import { hexA } from './Texture';

// Every reveal is a pure function of (frame, element timeline, style). No state, no Math.random.

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ez = (b: number[]) => Easing.bezier(b[0], b[1], b[2], b[3]);

export type RevealProps = {
  el: any; // element from buildTimeline()
  frame: number; // scene-local frame
  style: React.CSSProperties & { color: string };
  design: any;
  glow?: { blur: number; opacity: number } | null;
  unit: number;
};

export const glowShadow = (color: string, glow: RevealProps['glow'], k = 1) =>
  glow && k > 0 ? `0 0 ${glow.blur * 0.5}px ${hexA(color, glow.opacity * k)}, 0 0 ${glow.blur * 1.6}px ${hexA(color, glow.opacity * 0.55 * k)}` : 'none';

/** [ 03 // OBSERVATION ] — RGB-split collapse + on/off flicker. */
export const GlitchIn: React.FC<RevealProps> = ({ el, frame, style, design, unit }) => {
  const f = frame - el.start;
  if (f < 0) return <span style={{ ...style, visibility: 'hidden' }}>{el.text}</span>;
  const n = Math.max(1, el.end - el.start);
  const ca = design.texture.chromatic_aberration || {};
  const off = interpolate(f, [0, n], [(ca.glitch_px ?? 9) * unit, (ca.label_px ?? 2.5) * unit], { ...clamp, easing: ez(design.motion.easing.enter) });
  const on = f >= n || rand(el.text, f, 'on') > 0.3;
  const jitter = f < n ? (rand(el.text, f, 'x') - 0.5) * 6 * unit : 0;
  return (
    <span
      style={{
        ...style,
        display: 'inline-block',
        opacity: on ? 1 : 0.15,
        transform: `translateX(${jitter}px)`,
        textShadow: `${-off}px 0 rgba(255,20,60,0.75), ${off}px 0 rgba(20,90,255,0.75)`,
      }}
    >
      {el.text}
    </span>
  );
};

/** Word-by-word: each word appears muted + blurred and settles to its final colour. */
export const WordsIn: React.FC<RevealProps & { strike?: boolean; strikeColor?: string }> = ({ el, frame, style, design, unit, glow, strike, strikeColor }) => {
  const wi = design.motion.word_in;
  const enter = ez(design.motion.easing.enter);
  const strikeP = strike && el.strikeStart !== undefined ? interpolate(frame, [el.strikeStart, el.end], [0, 1], { ...clamp, easing: enter }) : 0;
  return (
    <span style={{ ...style, position: 'relative', display: 'inline' }}>
      {el.words.map((w: any, i: number) => {
        const f = frame - w.in;
        const p = interpolate(f, [0, el.wordIn], [0, 1], { ...clamp, easing: enter });
        const op = interpolate(f, [0, el.wordIn * 0.45], [0, 1], clamp);
        const col = p >= 1 ? style.color : mixHex(wi.pending_color, style.color, p);
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: 'inline-block',
                opacity: f < 0 ? 0 : op,
                color: strikeP > 0 ? mixHex(style.color, wi.pending_color, strikeP * 0.7) : col,
                filter: p < 1 ? `blur(${(1 - p) * wi.blur_px * unit}px)` : undefined,
                transform: `translateY(${(1 - p) * wi.rise_px * unit}px)`,
                textShadow: glowShadow(style.color, glow, p),
              }}
            >
              {w.text}
            </span>
            {i < el.words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
      {strike && strikeP > 0 && (
        <span
          style={{
            position: 'absolute', left: 0, top: '54%', height: Math.max(2, 4 * unit), width: `${strikeP * 100}%`,
            backgroundColor: strikeColor || style.color, boxShadow: `0 0 ${8 * unit}px ${hexA(strikeColor || style.color, 0.8)}`,
          }}
        />
      )}
    </span>
  );
};

/** Decode: every character scrambles through random glyphs, then locks with a brief flash. */
export const DecodeIn: React.FC<RevealProps> = ({ el, frame, style, design, glow }) => {
  const charset = Array.from(design.motion.scramble_charset as string);
  const muted = design.motion.word_in.pending_color;
  const landed = frame >= el.land;
  const glowK = interpolate(frame, [el.land, el.land + 8], [0, 1], clamp);
  return (
    <span style={{ ...style, display: 'inline-block', whiteSpace: 'pre', textShadow: landed ? glowShadow(style.color, glow, glowK) : 'none' }}>
      {el.chars.map((c: any, i: number) => {
        if (c.ch === ' ') return <span key={i}> </span>;
        const resolved = frame >= c.resolve;
        const started = frame >= c.start;
        const slot = Math.floor((frame - c.start) / (el.glyphHold || 2));
        const g = charset[Math.floor(rand(el.text, i, slot) * charset.length)];
        const flash = resolved && frame - c.resolve < 2;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ visibility: resolved ? 'visible' : 'hidden', color: flash ? '#FFFFFF' : style.color }}>{c.ch}</span>
            {started && !resolved && (
              <span style={{ position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', color: rand(el.text, i, slot, 'c') > 0.75 ? style.color : muted, opacity: 0.9 }}>{g}</span>
            )}
          </span>
        );
      })}
    </span>
  );
};

/** Typewriter with a block caret. */
export const TypeIn: React.FC<RevealProps> = ({ el, frame, style, glow }) => {
  const f = frame - el.start;
  const chars = Array.from(el.text as string);
  const shown = f < 0 ? 0 : Math.min(chars.length, Math.floor(f / Math.max(0.0001, el.typePer)) + 1);
  const caretOn = f >= 0 && (shown < chars.length || (f - el.typeChars * el.typePer < 24 && Math.floor(f / 8) % 2 === 0));
  return (
    <span style={{ ...style, whiteSpace: 'pre', textShadow: glowShadow(style.color, glow, 0.6) }}>
      <span>{chars.slice(0, shown).join('')}</span>
      <span style={{ visibility: 'hidden' }}>{chars.slice(shown).join('')}</span>
      {caretOn && <span style={{ position: 'relative', marginLeft: '-0.55em', opacity: 0.9 }}>▌</span>}
    </span>
  );
};

/** Count-up for stats. Parses prefix / number / suffix, keeps decimals and separators. */
export const CountIn: React.FC<RevealProps> = ({ el, frame, style, design, glow }) => {
  const m = String(el.text).match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
  if (!m) return <span style={style}>{el.text}</span>;
  const [, pre, num, suf] = m;
  const target = parseFloat(num.replace(/,/g, ''));
  const decimals = (num.split('.')[1] || '').length;
  const p = interpolate(frame, [el.start, el.end], [0, 1], { ...clamp, easing: ez(design.motion.easing.enter) });
  const v = target * p;
  const txt = v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: num.includes(',') });
  const vis = frame >= el.start;
  return (
    <span style={{ ...style, opacity: vis ? 1 : 0, whiteSpace: 'pre', textShadow: glowShadow(style.color, glow, p) }}>
      {pre}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{txt}</span>
      {suf}
    </span>
  );
};

/** Plain fade (logos, misc). */
export const FadeIn: React.FC<RevealProps & { children?: React.ReactNode }> = ({ el, frame, style, design, unit, children }) => {
  const p = interpolate(frame, [el.start, el.end], [0, 1], { ...clamp, easing: ez(design.motion.easing.enter) });
  return <div style={{ ...style, opacity: p, filter: p < 1 ? `blur(${(1 - p) * 10 * unit}px)` : undefined }}>{children ?? el.text}</div>;
};

export const Logo: React.FC<{ design: any; height: number }> = ({ design, height }) =>
  design.brand.logo ? (
    <Img src={staticFile(design.brand.logo)} style={{ height, width: 'auto', display: 'block' }} />
  ) : (
    <span style={{ fontFamily: design.roles.headline.fontFamily, fontSize: height * 0.8, color: design.colors.text_primary, letterSpacing: '0.04em', lineHeight: 1 }}>
      {design.brand.wordmark}
    </span>
  );

/** Linear mix of two hex colours. */
export function mixHex(a: string, b: string, t: number) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(1 + i, 3 + i), 16));
  const pb = [0, 2, 4].map((i) => parseInt(b.slice(1 + i, 3 + i), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
