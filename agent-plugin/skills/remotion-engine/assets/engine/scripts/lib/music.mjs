// Procedural music beds. Deterministic, tempo-locked to the choreography, energy-shaped per scene.
// Presets:
//   signal_drone  — sub drone + filtered saw pad + muted KS-pluck arpeggio (8ths) + faint ticks. (The demo bed.)
//   pulse_minimal — tight 16th square-bass pulse + ticks + kick on energy peaks. Tech/product launches.
//   warm_keys     — soft triangle pad chords + sparse plucks. Human, calm, B2B services.
//   dark_tension  — low drone + heartbeat pulse + per-scene noise swells. Problem/agitate hooks.
import { osc, noise, envExp, lp, hp, bp, pluck, echo, mixInto, buf, mtof, drive, dbToGain } from './dsp.mjs';
import { hash, mulberry32 } from '../../src/lib/prng.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10] };
// Progressions as scale degrees (0-based). minor: i–VI–III–VII ; major: I–V–vi–IV
const PROG = { minor: [0, 5, 2, 6], major: [0, 4, 5, 3], dorian: [0, 3, 0, 6], phrygian: [0, 1, 0, 6] };

const PRESETS = {
  signal_drone: { drone: 1, pad: 0.55, arp: 0.55, arpDiv: 2, tick: 0.18, kick: 0.0, bass: 0, heart: 0, swell: 0 },
  pulse_minimal: { drone: 0.5, pad: 0.2, arp: 0.25, arpDiv: 4, tick: 0.3, kick: 0.55, bass: 0.55, heart: 0, swell: 0 },
  warm_keys: { drone: 0.4, pad: 0.9, arp: 0.35, arpDiv: 1, tick: 0, kick: 0, bass: 0, heart: 0, swell: 0 },
  dark_tension: { drone: 1, pad: 0.35, arp: 0.15, arpDiv: 1, tick: 0.1, kick: 0, bass: 0, heart: 0.7, swell: 0.4 },
};
export const MUSIC_PRESETS = Object.keys(PRESETS);

/**
 * @param {object} o
 * @param {number} o.sr  sample rate
 * @param {number} o.durationS
 * @param {number} o.bpm
 * @param {string} o.key  e.g. "A"
 * @param {string} o.scale minor|major|dorian|phrygian
 * @param {string} o.preset
 * @param {{startS:number,endS:number,energy:number}[]} o.sections energy 0..1 per scene
 * @returns {[Float32Array, Float32Array]}
 */
export function makeBed({ sr, durationS, bpm = 100, key = 'A', scale = 'minor', preset = 'signal_drone', sections = [], seed = 1 }) {
  const P = PRESETS[preset] || PRESETS.signal_drone;
  const sc = SCALES[scale] || SCALES.minor;
  const prog = PROG[scale] || PROG.minor;
  const root = 33 + (NOTE[key] ?? 9) - 9; // A1 = 33 when key = A
  const beat = 60 / bpm;
  const bar = beat * 4;
  const L = buf(sr, durationS), R = buf(sr, durationS);
  const energyAt = (t) => {
    const s = sections.find((x) => t >= x.startS && t < x.endS);
    return s ? s.energy : sections.length ? sections[sections.length - 1].energy : 0.7;
  };
  const chordAt = (t) => prog[Math.floor(t / (bar * 2)) % prog.length];
  const degree = (d, oct = 0) => root + 12 * oct + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const add = (sig, t, gain, pan = 0) => {
    const off = Math.round(t * sr);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * 1.414, gr = Math.sin(((pan + 1) * Math.PI) / 4) * 1.414;
    mixInto(L, sig, off, gain * gl);
    mixInto(R, sig, off, gain * gr);
  };

  // 1. Drone: sub sine on the chord root, re-voiced every 2 bars with long crossfades
  if (P.drone) {
    for (let t0 = 0; t0 < durationS; t0 += bar * 2) {
      const len = Math.min(bar * 2 + 1.5, durationS - t0 + 0.5);
      const f = mtof(degree(chordAt(t0)));
      const s = osc(sr, len, 'sine', f);
      const s2 = osc(sr, len, 'sine', f * 2);
      for (let i = 0; i < s.length; i++) {
        const tt = i / sr, a = Math.min(1, tt / 0.75), r = Math.min(1, (len - tt) / 0.75);
        s[i] = (s[i] * 0.8 + s2[i] * 0.2) * a * r;
      }
      add(drive(s, 1.3), t0, 0.24 * P.drone);
    }
  }
  // 2. Pad: detuned saws through a slowly breathing low-pass
  if (P.pad) {
    for (let t0 = 0; t0 < durationS; t0 += bar * 2) {
      const len = Math.min(bar * 2 + 1.5, durationS - t0 + 0.5);
      const d = chordAt(t0);
      const notes = [degree(d, 1), degree(d + 2, 1), degree(d + 4, 1)];
      const pad = buf(sr, len);
      notes.forEach((m, k) => {
        const a = osc(sr, len, preset === 'warm_keys' ? 'tri' : 'saw', mtof(m) * 1.003);
        const b = osc(sr, len, preset === 'warm_keys' ? 'tri' : 'saw', mtof(m) * 0.997, { phase: 0.3 * k });
        for (let i = 0; i < pad.length; i++) pad[i] += (a[i] + b[i]) * 0.5;
      });
      const f = lp(pad, sr, (t) => 380 + 260 * Math.sin((2 * Math.PI * (t0 + t)) / (bar * 4)), 0.8);
      for (let i = 0; i < f.length; i++) {
        const tt = i / sr, a = Math.min(1, tt / 1.0), r = Math.min(1, (len - tt) / 1.0);
        f[i] *= a * r * (0.5 + 0.5 * energyAt(t0 + tt));
      }
      add(f, t0, 0.07 * P.pad);
    }
  }
  // 3. Arp: Karplus-Strong plucks on chord tones (the demo's mid-range sequence)
  if (P.arp) {
    const step = beat / P.arpDiv;
    const pattern = [0, 2, 4, 7, 4, 2, 0, 4];
    let n = 0;
    for (let t = 0; t < durationS - 0.1; t += step, n++) {
      const e = energyAt(t);
      if (e < 0.3) continue;
      const r = mulberry32(hash('arp', seed, n))();
      if (e < 0.55 && n % 2) continue; // thinner at low energy
      const d = chordAt(t) + pattern[n % pattern.length];
      const m = degree(d, 2) + (r < 0.12 ? 12 : 0);
      const p = lp(pluck(sr, 0.7, mtof(m), { damping: 0.994, brightness: 0.55, seed: hash('pk', n) }), sr, 1400 + 2200 * e);
      add(p, t, 0.15 * P.arp * (0.6 + 0.5 * e) * (n % 4 === 0 ? 1.2 : 0.85), n % 2 ? 0.35 : -0.35);
    }
  }
  // 4. Bass pulse (16ths, sidechained feel)
  if (P.bass) {
    const step = beat / 4;
    let n = 0;
    for (let t = 0; t < durationS; t += step, n++) {
      if (energyAt(t) < 0.45) continue;
      const m = degree(chordAt(t), 1);
      const s = lp(envExp(osc(sr, step * 0.95, 'square', mtof(m)), sr, 0.002, step * 0.35), sr, 700);
      add(s, t, 0.09 * P.bass * (n % 4 === 0 ? 0.6 : 1));
    }
  }
  // 5. Ticks (hat-like, 16ths), only when energy is high
  if (P.tick) {
    const step = beat / 4;
    let n = 0;
    for (let t = 0; t < durationS; t += step, n++) {
      const e = energyAt(t);
      if (e < 0.6) continue;
      const g = n % 4 === 2 ? 1 : n % 2 ? 0.35 : 0.6;
      const s = envExp(hp(noise(sr, 0.05, hash('hat', n)), sr, 7500), sr, 0.0005, 0.012);
      add(s, t, 0.05 * P.tick * g * e, n % 2 ? 0.4 : -0.4);
    }
  }
  // 6. Kick on beats at energy peaks
  if (P.kick) {
    for (let t = 0, n = 0; t < durationS; t += beat, n++) {
      if (energyAt(t) < 0.75) continue;
      const s = drive(envExp(osc(sr, 0.35, 'sine', (tt) => 50 + 120 * Math.exp(-tt * 38)), sr, 0.001, 0.08), 2);
      add(s, t, 0.22 * P.kick);
    }
  }
  // 7. Heartbeat (dark_tension)
  if (P.heart) {
    for (let t = 0; t < durationS; t += beat * 2) {
      const s = lp(envExp(osc(sr, 0.3, 'sine', (tt) => 48 + 30 * Math.exp(-tt * 25)), sr, 0.002, 0.08), sr, 200);
      add(s, t, 0.3 * P.heart);
      add(s, t + beat * 0.32, 0.18 * P.heart);
    }
  }
  // 8. Noise swells into each section boundary
  if (P.swell) {
    for (const s of sections) {
      const len = Math.min(1.2, s.endS - s.startS);
      const sig = bp(noise(sr, len, hash('sw', s.startS)), sr, (t, p) => 300 * Math.pow(15, p), 1.2);
      for (let i = 0; i < sig.length; i++) sig[i] *= (i / sig.length) ** 2;
      add(sig, s.endS - len, 0.05 * P.swell);
    }
  }
  // gentle bus glue
  return [drive(L, 1.15), drive(R, 1.15)];
}

/** Apply fades (seconds) and a static gain in dB, in place. */
export function shapeBed([L, R], sr, { gainDb = -17, fadeIn = 0.8, fadeOut = 2.5 }) {
  const g = dbToGain(gainDb), n = L.length, fi = fadeIn * sr, fo = fadeOut * sr;
  for (let i = 0; i < n; i++) {
    let k = g;
    if (i < fi) k *= i / fi;
    if (i > n - fo) k *= Math.max(0, (n - i) / fo);
    L[i] *= k; R[i] *= k;
  }
  return [L, R];
}
