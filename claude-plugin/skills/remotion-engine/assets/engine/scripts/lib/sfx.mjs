// Procedural SFX library — 50 deterministic, royalty-free sounds synthesised from code.
// Each entry documents WHAT it is, WHEN to use it, and HOW it is built (the recipe is the code).
// Render the whole library to WAV files with:  node .motion-graphics/mg.mjs sfx   (→ .motion-graphics/assets/sfx-library/)
import {
  osc, fm, noise, envExp, envADSR, fade, applyCurve, biquad, lp, hp, bp, drive, bitcrush, chop, pluck,
  echo, reverb, sum, scale, normalize, reverse, mtof, buf, mixInto, widen,
} from './dsp.mjs';
import { hash } from '../../src/lib/prng.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav } from './dsp.mjs';

// Custom/licensed sounds: 16-bit 48 kHz WAVs in .motion-graphics/assets/sfx/<id>.wav are usable as <id> like any built-in.
// The CLI points this at the workspace with setCustomSfxDir().
let CUSTOM_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'custom-sfx');
export function setCustomSfxDir(dir) { CUSTOM_DIR = dir; }
export function customSfxIds() {
  return existsSync(CUSTOM_DIR) ? readdirSync(CUSTOM_DIR).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4)) : [];
}
export function allSfxIds() {
  return [...Object.keys(SFX), ...customSfxIds()];
}

const S = (id) => hash('sfx', id); // stable seed per sound

/** helper: short noise transient through a band-pass */
function transient(sr, dur, f, q, tau, seed, color = 'white') {
  return envExp(bp(noise(sr, dur, seed, color), sr, f, q), sr, 0.0005, tau);
}
/** helper: pitched blip with exponential pitch glide */
function blip(sr, dur, f0, f1, tau, type = 'sine') {
  return envExp(osc(sr, dur, type, (t, p) => f0 * Math.pow(f1 / f0, p)), sr, 0.001, tau);
}

export const SFX = {
  // ───────────── UI / CLICKS ─────────────
  click_soft: { cat: 'ui', desc: 'Soft rounded click', use: 'Gentle UI confirmations, low-stakes reveals',
    make: (sr) => normalize(sum(sr, 0.08, [transient(sr, 0.08, 2400, 1.2, 0.006, S('click_soft')), 0.7], [blip(sr, 0.08, 1800, 900, 0.008), 0.4]), -3) },
  click_hard: { cat: 'ui', desc: 'Sharp plastic click', use: 'Emphatic UI taps, button presses on hero CTAs',
    make: (sr) => normalize(sum(sr, 0.06, [transient(sr, 0.06, 4200, 2.5, 0.004, S('click_hard')), 1], [blip(sr, 0.06, 3200, 2500, 0.003, 'square'), 0.25]), -1) },
  key_soft: { cat: 'ui', desc: 'Quiet laptop key tap', use: 'Under word-by-word reveals (word_in). Keep -6 dB under clicks',
    make: (sr) => normalize(sum(sr, 0.07, [transient(sr, 0.07, 3000, 1.6, 0.005, S('key_soft')), 0.8], [transient(sr, 0.07, 700, 2, 0.01, S('key_soft2'), 'pink'), 0.5]), -6) },
  key_click: { cat: 'ui', desc: 'Mechanical keyboard switch (click + bottom-out)', use: 'Typewriter reveals (type_char)',
    make: (sr) => normalize(sum(sr, 0.09, [transient(sr, 0.09, 5200, 3, 0.003, S('key_click')), 0.9], [transient(sr, 0.09, 1200, 1.5, 0.012, S('key_click2'), 'pink'), 0.6, 0.012]), -3) },
  tick_hi: { cat: 'ui', desc: 'High metallic tick', use: 'Minor decode lands, list markers, small accents',
    make: (sr) => normalize(sum(sr, 0.05, [blip(sr, 0.05, 6200, 5800, 0.004), 0.6], [transient(sr, 0.05, 8000, 4, 0.002, S('tick_hi')), 0.5]), -4) },
  tick_lo: { cat: 'ui', desc: 'Low wooden tick', use: 'Clock-like rhythm, metronomic beat markers',
    make: (sr) => normalize(sum(sr, 0.08, [blip(sr, 0.08, 900, 700, 0.012), 0.8], [transient(sr, 0.08, 1500, 3, 0.004, S('tick_lo')), 0.4]), -3) },
  double_tick: { cat: 'ui', desc: 'Two quick ticks (ti-tick)', use: 'Toggling states, "locked" moments',
    make: (sr) => { const t = SFX.tick_hi.make(sr); return normalize(sum(sr, 0.12, [t, 1], [t, 0.7, 0.055]), -3); } },
  toggle_on: { cat: 'ui', desc: 'Switch flick with upward chirp', use: 'Feature on, value appears, checkmarks',
    make: (sr) => normalize(sum(sr, 0.12, [SFX.click_hard.make(sr), 0.7], [blip(sr, 0.1, 900, 1800, 0.03), 0.4, 0.01]), -3) },
  toggle_off: { cat: 'ui', desc: 'Switch flick with downward chirp', use: 'Feature off, strike-through, removal',
    make: (sr) => normalize(sum(sr, 0.12, [SFX.click_hard.make(sr), 0.7], [blip(sr, 0.1, 1800, 800, 0.03), 0.4, 0.01]), -3) },
  relay_click: { cat: 'ui', desc: 'Electro-mechanical relay clack', use: 'System engaging, scene switch in industrial themes',
    make: (sr) => { const a = transient(sr, 0.12, 2200, 0.9, 0.006, S('relay'), 'pink'); const b = transient(sr, 0.12, 3600, 2, 0.004, S('relay2')); return normalize(sum(sr, 0.14, [a, 1], [b, 0.6, 0.018], [blip(sr, 0.1, 120, 90, 0.02), 0.5]), -2); } },
  mouse_click: { cat: 'ui', desc: 'Mouse button down+up pair', use: 'Cursor demos, UI walkthroughs',
    make: (sr) => { const d = transient(sr, 0.05, 3400, 2, 0.003, S('mouse')); return normalize(sum(sr, 0.14, [d, 1], [d, 0.5, 0.08]), -3); } },
  tap_wood: { cat: 'ui', desc: 'Knuckle on wood', use: 'Organic/warm brands, list items',
    make: (sr) => normalize(sum(sr, 0.15, [envExp(osc(sr, 0.15, 'sine', 420), sr, 0.001, 0.03), 0.8], [envExp(osc(sr, 0.15, 'sine', 1130), sr, 0.001, 0.012), 0.4], [transient(sr, 0.15, 2000, 1, 0.003, S('tap')), 0.4]), -3) },

  // ───────────── DATA / DIGITAL ─────────────
  blip_up: { cat: 'data', desc: 'Rising square blip', use: 'Positive change, numbers going up',
    make: (sr) => normalize(lp(blip(sr, 0.12, 600, 1400, 0.05, 'square'), sr, 5000), -4) },
  blip_down: { cat: 'data', desc: 'Falling square blip', use: 'Negative change, closing, dismissal',
    make: (sr) => normalize(lp(blip(sr, 0.12, 1400, 600, 0.05, 'square'), sr, 5000), -4) },
  confirm_blip: { cat: 'data', desc: 'Two-note ascending confirmation (fifth)', use: 'type_done, CTA complete, success',
    make: (sr) => { const a = envExp(osc(sr, 0.2, 'tri', mtof(81)), sr, 0.002, 0.05); const b = envExp(osc(sr, 0.25, 'tri', mtof(88)), sr, 0.002, 0.08); return normalize(sum(sr, 0.32, [a, 0.8], [b, 0.8, 0.07]), -4); } },
  error_buzz: { cat: 'data', desc: 'Low detuned buzz', use: 'Wrong / problem beats ("most people do X")',
    make: (sr) => normalize(lp(envADSR(sum(sr, 0.3, [osc(sr, 0.3, 'square', 110), 0.5], [osc(sr, 0.3, 'square', 116.5), 0.5]), sr, 0.005, 0.05, 0.7, 0.08), sr, 1800), -4) },
  data_chirp: { cat: 'data', desc: 'Fast random-pitch chirp burst', use: 'Data loading, AI "thinking"',
    make: (sr) => { const out = buf(sr, 0.25); const r = (i) => (hash('chirp', i) % 1000) / 1000; for (let k = 0; k < 10; k++) mixInto(out, envExp(osc(sr, 0.03, 'square', 1200 + r(k) * 2800), sr, 0.0005, 0.008), Math.round(k * 0.022 * sr), 0.5); return normalize(lp(out, sr, 7000), -5); } },
  scramble_chatter: { cat: 'data', desc: 'Granular digital chatter (~0.35 s)', use: 'Under decode/scramble reveals (decode_start). Signature sound of the demo',
    make: (sr) => { const dur = 0.36, out = buf(sr, dur); for (let k = 0; k < 18; k++) { const r = (hash('chat', k) % 1000) / 1000; mixInto(out, envExp(bp(osc(sr, 0.025, 'square', 900 + r * 3500), sr, 2500 + r * 3000, 3), sr, 0.0003, 0.006), Math.round((k / 18) * dur * sr), 0.6 + 0.4 * r); } mixInto(out, envExp(hp(noise(sr, dur, S('chatn')), sr, 6000), sr, 0.002, 0.08), 0, 0.15); return normalize(applyCurve(out, (p) => 1 - 0.5 * p), -5); } },
  counter_tick: { cat: 'data', desc: 'Tiny high tick for counters', use: 'count_tick during numeric count-ups (throttled to 1 per 3 frames)',
    make: (sr) => normalize(envExp(osc(sr, 0.03, 'sine', 4200), sr, 0.0003, 0.004), -9) },
  modem_burst: { cat: 'data', desc: 'Short FSK modem squeal', use: 'Connection established, retro-tech themes',
    make: (sr) => { const r = (t) => (hash('fsk', Math.floor(t * 120)) & 1 ? 1200 : 2200); return normalize(bp(envADSR(osc(sr, 0.4, 'square', (t) => r(t)), sr, 0.005, 0.05, 0.6, 0.1), sr, 1700, 0.8), -6); } },
  sonar_ping: { cat: 'data', desc: 'Sine ping with long echo', use: 'Discovery, "found it", location reveals',
    make: (sr) => normalize(echo(envExp(osc(sr, 0.5, 'sine', 1320), sr, 0.002, 0.12), sr, 0.18, 0.45, 0.45, 1.2), -4) },
  telemetry_pings: { cat: 'data', desc: 'Three soft telemetry beeps', use: 'Status updates, dashboards',
    make: (sr) => { const b = envExp(osc(sr, 0.08, 'sine', 2093), sr, 0.002, 0.02); return normalize(sum(sr, 0.5, [b, 1], [b, 0.7, 0.14], [b, 0.5, 0.28]), -6); } },

  // ───────────── GLITCH / SIGNAL ─────────────
  glitch_tick: { cat: 'glitch', desc: 'Tiny bit-crushed digital tick', use: 'label_in (tag glitch-in). The demo\'s high transient on every tag',
    make: (sr) => normalize(bitcrush(sum(sr, 0.07, [transient(sr, 0.07, 5500, 1.5, 0.006, S('gt')), 1], [blip(sr, 0.07, 2600, 4000, 0.01, 'square'), 0.35]), sr, 5, 11000), -4) },
  glitch_stutter: { cat: 'glitch', desc: 'Chopped stutter of noise + tone', use: 'Error states, rapid-fire edits',
    make: (sr) => normalize(chop(bitcrush(sum(sr, 0.3, [noise(sr, 0.3, S('gs')), 0.4], [osc(sr, 0.3, 'square', 340), 0.3]), sr, 6, 9000), sr, 28, 0.5, S('gs2')), -5) },
  static_burst: { cat: 'glitch', desc: 'Short TV static burst', use: 'Scene transitions (glitch_cut)',
    make: (sr) => normalize(envADSR(bp(noise(sr, 0.18, S('static')), sr, 3500, 0.4), sr, 0.003, 0.04, 0.5, 0.06), -6) },
  rgb_tear: { cat: 'glitch', desc: 'Tearing digital rip with pitch drop', use: 'Heavy glitch transitions, before/after reveals',
    make: (sr) => normalize(bitcrush(envADSR(sum(sr, 0.25, [osc(sr, 0.25, 'saw', (t, p) => 1800 * Math.pow(0.15, p)), 0.6], [noise(sr, 0.25, S('tear')), 0.3]), sr, 0.002, 0.05, 0.6, 0.08), sr, 4, 6000), -4) },
  crt_on: { cat: 'glitch', desc: 'CRT power-on thunk + rising whine', use: 'Video open, first frame',
    make: (sr) => normalize(sum(sr, 0.8, [envExp(osc(sr, 0.4, 'sine', (t, p) => 80 * Math.pow(0.6, p)), sr, 0.002, 0.08), 0.9], [envADSR(osc(sr, 0.8, 'sine', (t, p) => 9000 + 6700 * p), sr, 0.05, 0.2, 0.15, 0.3), 0.06], [transient(sr, 0.3, 2000, 0.6, 0.02, S('crton'), 'pink'), 0.5]), -3) },
  crt_off: { cat: 'glitch', desc: 'CRT collapse — falling zap', use: 'Video end, hard outros',
    make: (sr) => normalize(sum(sr, 0.5, [envExp(osc(sr, 0.5, 'sine', (t, p) => 2400 * Math.pow(0.02, p)), sr, 0.001, 0.12), 0.7], [envExp(bp(noise(sr, 0.5, S('crtoff')), sr, 1800, 0.7), sr, 0.001, 0.05), 0.4]), -3) },
  signal_drop: { cat: 'glitch', desc: 'Short low-passed dropout', use: 'Scene exit dims (exit). Keep subtle',
    make: (sr) => normalize(envExp(lp(noise(sr, 0.22, S('drop'), 'pink'), sr, (t, p) => 4000 * Math.pow(0.05, p)), sr, 0.002, 0.07), -10) },
  digital_zap: { cat: 'glitch', desc: 'FM zap', use: 'Energy hits, power-ups',
    make: (sr) => normalize(envExp(fm(sr, 0.25, (t, p) => 1400 * Math.pow(0.2, p), 2.01, (t, p) => 8 * (1 - p)), sr, 0.001, 0.06), -3) },

  // ───────────── TRANSITIONS ─────────────
  whoosh_short: { cat: 'transition', desc: 'Fast air whoosh (0.35 s)', use: 'Slides, pushes, quick cuts',
    make: (sr) => normalize(applyCurve(bp(noise(sr, 0.35, S('ws'), 'pink'), sr, (t, p) => 400 + 3200 * Math.sin(Math.PI * p), 1.2), (p) => Math.sin(Math.PI * p) ** 2), -3) },
  whoosh_long: { cat: 'transition', desc: 'Slow wide whoosh (0.9 s)', use: 'Big scene changes, camera moves',
    make: (sr) => { const m = applyCurve(bp(noise(sr, 0.9, S('wl'), 'pink'), sr, (t, p) => 250 + 2500 * Math.sin(Math.PI * p), 0.9), (p) => Math.sin(Math.PI * p) ** 2); return widen(normalize(m, -3), sr, 11); } },
  swipe_air: { cat: 'transition', desc: 'Very short swipe', use: 'Strike-throughs, swipes, item removals',
    make: (sr) => normalize(applyCurve(hp(noise(sr, 0.16, S('sw')), sr, (t, p) => 1500 + 5000 * p), (p) => Math.sin(Math.PI * p)), -5) },
  reverse_swell: { cat: 'transition', desc: 'Reversed reverb swell', use: '0.6 s BEFORE a hero lands (place with negative offset)',
    make: (sr) => normalize(reverse(reverb(envExp(osc(sr, 0.2, 'tri', mtof(57)), sr, 0.001, 0.05), sr, 0.85, 0.3, 0.9, 0.6)), -4) },
  riser_noise: { cat: 'transition', desc: '2 s filtered noise riser', use: 'Build into the reveal / drop',
    make: (sr) => normalize(applyCurve(bp(noise(sr, 2, S('rn')), sr, (t, p) => 300 * Math.pow(30, p), 1.4), (p) => p ** 2), -3) },
  riser_tonal: { cat: 'transition', desc: '2 s pitch riser (saw, filtered)', use: 'Tension before CTA / big stat',
    make: (sr) => normalize(applyCurve(lp(sum(sr, 2, [osc(sr, 2, 'saw', (t, p) => 110 * Math.pow(4, p)), 0.5], [osc(sr, 2, 'saw', (t, p) => 111.5 * Math.pow(4, p)), 0.5]), sr, (t, p) => 400 + 5000 * p), (p) => p ** 1.5), -4) },
  downlifter: { cat: 'transition', desc: '1.2 s falling noise + tone', use: 'After a drop, release of tension, outro',
    make: (sr) => normalize(applyCurve(sum(sr, 1.2, [lp(noise(sr, 1.2, S('dl')), sr, (t, p) => 6000 * Math.pow(0.03, p)), 0.6], [osc(sr, 1.2, 'sine', (t, p) => 400 * Math.pow(0.15, p)), 0.4]), (p) => (1 - p) ** 1.5), -3) },

  // ───────────── IMPACTS ─────────────
  impact_sub: { cat: 'impact', desc: 'Sub-bass thump (pitch-dropping sine + click)', use: 'Hero decode_land. Felt more than heard — the demo\'s low hits',
    make: (sr) => normalize(sum(sr, 0.7, [drive(envExp(osc(sr, 0.7, 'sine', (t) => 45 + 70 * Math.exp(-t * 28)), sr, 0.001, 0.22), 1.6), 1], [transient(sr, 0.05, 1800, 0.8, 0.004, S('isub')), 0.25]), -1) },
  impact_punch: { cat: 'impact', desc: 'Punchy kick-style hit', use: 'Stat lands, list completes, beat-synced emphasis',
    make: (sr) => normalize(sum(sr, 0.4, [drive(envExp(osc(sr, 0.4, 'sine', (t) => 55 + 160 * Math.exp(-t * 40)), sr, 0.001, 0.09), 2.5), 1], [transient(sr, 0.04, 3000, 1, 0.006, S('punch')), 0.35]), -1) },
  boom_cinematic: { cat: 'impact', desc: 'Big trailer boom with reverb tail', use: 'Once per video max: title or reveal',
    make: (sr) => { const core = sum(sr, 1.6, [drive(envExp(osc(sr, 1.6, 'sine', (t) => 32 + 60 * Math.exp(-t * 10)), sr, 0.002, 0.6), 1.8), 1], [envExp(lp(noise(sr, 1.6, S('boom'), 'brown'), sr, 300), sr, 0.002, 0.4), 0.6]); return widen(normalize(reverb(core, sr, 0.9, 0.5, 0.25, 1.5), -1), sr, 9); } },
  thud_soft: { cat: 'impact', desc: 'Muffled soft thud', use: 'Subtle lands for secondary lines',
    make: (sr) => normalize(lp(envExp(osc(sr, 0.3, 'sine', (t) => 70 + 50 * Math.exp(-t * 30)), sr, 0.002, 0.07), sr, 400), -3) },
  hit_metallic: { cat: 'impact', desc: 'Inharmonic metal hit', use: 'Industrial brands, "locked/sealed" moments',
    make: (sr) => { const parts = [1, 2.76, 5.4, 8.93].map((r, i) => [envExp(osc(sr, 1.2, 'sine', 220 * r), sr, 0.001, 0.4 / (i + 1)), 1 / (i + 1)]); return normalize(sum(sr, 1.2, ...parts, [transient(sr, 0.05, 5000, 1, 0.004, S('metal')), 0.6]), -2); } },
  slam_gate: { cat: 'impact', desc: 'Gated reverb slam', use: 'Final word of the video, logo slam',
    make: (sr) => { const r = reverb(sum(sr, 0.15, [SFX.impact_punch.make(sr), 1], [transient(sr, 0.15, 1500, 0.5, 0.03, S('slam'), 'pink'), 0.8]), sr, 0.95, 0.2, 0.6, 0.6); return normalize(applyCurve(r, (p) => (p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) * 20))), -1); } },

  // ───────────── MUSICAL / BRAND ─────────────
  chime_confirm: { cat: 'musical', desc: 'Bright two-note FM chime', use: 'Positive outcomes, success states',
    make: (sr) => { const n = (m) => envExp(fm(sr, 1, mtof(m), 3.5, (t) => 2 * Math.exp(-t * 6)), sr, 0.002, 0.35); return normalize(reverb(sum(sr, 1.2, [n(84), 0.6], [n(91), 0.6, 0.09]), sr, 0.6, 0.4, 0.25, 0.8), -4); } },
  pluck_accent: { cat: 'musical', desc: 'Single KS pluck (A4) with echo', use: 'Musical accent on a key word; matches the demo bed',
    make: (sr) => normalize(echo(lp(pluck(sr, 0.6, mtof(69), { seed: S('pl') }), sr, 3500), sr, 0.3, 0.3, 0.3, 0.8), -4) },
  bell_soft: { cat: 'musical', desc: 'Soft glassy bell', use: 'Calm reveals, end cards for gentle brands',
    make: (sr) => normalize(reverb(envExp(fm(sr, 1.5, mtof(76), 1.4, (t) => 3 * Math.exp(-t * 4)), sr, 0.003, 0.5), sr, 0.7, 0.4, 0.3, 1), -4) },
  stinger_logo: { cat: 'musical', desc: 'Sub hit + minor chord pluck + shimmer', use: 'logo_in on the end card — the sonic logo',
    make: (sr) => { const ch = [57, 60, 64, 69].map((m, i) => [lp(pluck(sr, 1.6, mtof(m), { seed: S('st' + i), damping: 0.998 }), sr, 4000), 0.35, i * 0.018]); const body = sum(sr, 1.8, [SFX.impact_sub.make(sr), 0.8], ...ch, [envADSR(hp(noise(sr, 1.6, S('shim')), sr, 8000), sr, 0.2, 0.3, 0.3, 0.8), 0.05]); return widen(normalize(reverb(body, sr, 0.8, 0.4, 0.3, 1.5), -1), sr, 10); } },

  // ───────────── BEDS / TEXTURE (loopable) ─────────────
  room_tone: { cat: 'texture', desc: '4 s low room tone (loopable)', use: 'Under silent intros so the mix never drops to digital zero',
    make: (sr) => normalize(fade(lp(noise(sr, 4, S('room'), 'brown'), sr, 500), sr, 0.2, 0.2), -18) },
  tape_hiss: { cat: 'texture', desc: '4 s tape hiss (loopable)', use: 'Analogue/retro grade layer',
    make: (sr) => normalize(fade(bp(noise(sr, 4, S('hiss'), 'pink'), sr, 6000, 0.5), sr, 0.2, 0.2), -24) },
  crt_hum: { cat: 'texture', desc: '4 s CRT/mains hum + 15.7 kHz whine', use: 'The CRT grid look; keep at -30 dB',
    make: (sr) => normalize(fade(sum(sr, 4, [osc(sr, 4, 'sine', 50), 0.6], [osc(sr, 4, 'sine', 100), 0.3], [osc(sr, 4, 'sine', 150), 0.15], [osc(sr, 4, 'sine', 15734), 0.02]), sr, 0.2, 0.2), -24) },
};

export const SFX_IDS = Object.keys(SFX);

const cache = new Map();
/** Render (and memoise) one sound as stereo [L, R]. */
export function renderSfx(id, sr) {
  const key = `${id}@${sr}`;
  if (cache.has(key)) return cache.get(key);
  const def = SFX[id];
  let out;
  if (def) out = def.make(sr);
  else if (existsSync(join(CUSTOM_DIR, `${id}.wav`))) {
    const w = readWav(readFileSync(join(CUSTOM_DIR, `${id}.wav`)));
    if (w.sr !== sr) throw new Error(`${id}.wav (custom SFX) is ${w.sr} Hz; convert to ${sr} Hz`);
    out = w.channels;
  } else throw new Error(`Unknown SFX id "${id}". Known: ${allSfxIds().join(', ')}`);
  if (!Array.isArray(out)) out = [out, out];
  out = out.map((c) => fade(Float32Array.from(c), sr, 0.0005, 0.005));
  cache.set(key, out);
  return out;
}
