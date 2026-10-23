// Minimal, dependency-free DSP toolkit for procedural sound design.
// Everything is deterministic: noise comes from a seeded PRNG, never Math.random().
import { mulberry32 } from '../../src/lib/prng.js';

export const SR_DEFAULT = 48000;
export const TAU = Math.PI * 2;
export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(1e-12, g));
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function buf(sr, seconds) {
  return new Float32Array(Math.max(1, Math.round(sr * seconds)));
}

/** Resolve a number-or-function parameter at time t (seconds) and progress p (0..1). */
const val = (v, t, p) => (typeof v === 'function' ? v(t, p) : v);

/** Oscillator. type: sine|saw|square|tri. freq may be a function (t,p)=>Hz. */
export function osc(sr, seconds, type, freq, { phase = 0, pw = 0.5 } = {}) {
  const out = buf(sr, seconds);
  let ph = phase;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = val(freq, t, i / n);
    ph += f / sr;
    ph -= Math.floor(ph);
    let s;
    switch (type) {
      case 'saw': s = 2 * ph - 1; break;
      case 'square': s = ph < pw ? 1 : -1; break;
      case 'tri': s = 1 - 4 * Math.abs(ph - 0.5); break;
      default: s = Math.sin(TAU * ph);
    }
    out[i] = s;
  }
  return out;
}

/** FM pair: carrier modulated by modulator (ratio, index may be functions). */
export function fm(sr, seconds, freq, ratio, index) {
  const out = buf(sr, seconds);
  let pc = 0, pm = 0;
  const n = out.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr, p = i / n;
    const f = val(freq, t, p);
    pm += (f * val(ratio, t, p)) / sr;
    const mod = Math.sin(TAU * pm) * val(index, t, p);
    pc += f / sr;
    out[i] = Math.sin(TAU * pc + mod);
  }
  return out;
}

export function noise(sr, seconds, seed = 1, color = 'white') {
  const r = mulberry32(seed);
  const out = buf(sr, seconds);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, brown = 0;
  for (let i = 0; i < out.length; i++) {
    const w = r() * 2 - 1;
    if (color === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else if (color === 'brown') {
      brown = (brown + 0.02 * w) / 1.02;
      out[i] = brown * 3.5;
    } else out[i] = w;
  }
  return out;
}

/** Envelopes ---------------------------------------------------------------- */
export function envExp(x, sr, attack, decayTau, { hold = 0 } = {}) {
  for (let i = 0; i < x.length; i++) {
    const t = i / sr;
    let g;
    if (t < attack) g = attack > 0 ? t / attack : 1;
    else if (t < attack + hold) g = 1;
    else g = Math.exp(-(t - attack - hold) / decayTau);
    x[i] *= g;
  }
  return x;
}
export function envADSR(x, sr, a, d, s, r) {
  const n = x.length, rel = Math.round(r * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let g = t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : s;
    if (i > n - rel) g *= (n - i) / rel;
    x[i] *= g;
  }
  return x;
}
/** Linear fades in seconds. */
export function fade(x, sr, fin = 0.002, fout = 0.01) {
  const a = Math.round(fin * sr), b = Math.round(fout * sr), n = x.length;
  for (let i = 0; i < a && i < n; i++) x[i] *= i / a;
  for (let i = 0; i < b && i < n; i++) x[n - 1 - i] *= i / b;
  return x;
}
export function applyCurve(x, fn) {
  const n = x.length;
  for (let i = 0; i < n; i++) x[i] *= fn(i / n);
  return x;
}

/** Biquad (RBJ cookbook). type: lp|hp|bp|peak|lowshelf|highshelf. freq may be a function (t,p). */
export function biquad(x, sr, type, freq, q = 0.707, gainDb = 0) {
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0, b1, b2, a1, a2;
  const n = x.length;
  const compute = (f) => {
    f = clamp(f, 10, sr * 0.49);
    const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let B0, B1, B2, A0, A1, A2;
    switch (type) {
      case 'hp': B0 = (1 + cw) / 2; B1 = -(1 + cw); B2 = (1 + cw) / 2; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
      case 'bp': B0 = al; B1 = 0; B2 = -al; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
      case 'peak': B0 = 1 + al * A; B1 = -2 * cw; B2 = 1 - al * A; A0 = 1 + al / A; A1 = -2 * cw; A2 = 1 - al / A; break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * al;
        B0 = A * (A + 1 - (A - 1) * cw + s); B1 = 2 * A * (A - 1 - (A + 1) * cw); B2 = A * (A + 1 - (A - 1) * cw - s);
        A0 = A + 1 + (A - 1) * cw + s; A1 = -2 * (A - 1 + (A + 1) * cw); A2 = A + 1 + (A - 1) * cw - s; break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * al;
        B0 = A * (A + 1 + (A - 1) * cw + s); B1 = -2 * A * (A - 1 + (A + 1) * cw); B2 = A * (A + 1 + (A - 1) * cw - s);
        A0 = A + 1 - (A - 1) * cw + s; A1 = 2 * (A - 1 - (A + 1) * cw); A2 = A + 1 - (A - 1) * cw - s; break;
      }
      default: B0 = (1 - cw) / 2; B1 = 1 - cw; B2 = (1 - cw) / 2; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al;
    }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0;
  };
  const dynamic = typeof freq === 'function';
  if (!dynamic) compute(freq);
  for (let i = 0; i < n; i++) {
    if (dynamic && (i & 31) === 0) compute(freq(i / sr, i / n));
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}
export const lp = (x, sr, f, q) => biquad(x, sr, 'lp', f, q);
export const hp = (x, sr, f, q) => biquad(x, sr, 'hp', f, q);
export const bp = (x, sr, f, q) => biquad(x, sr, 'bp', f, q);

/** Waveshaping and degradation ------------------------------------------------- */
export function drive(x, amount = 2) {
  const norm = Math.tanh(amount);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * amount) / norm;
  return x;
}
export function bitcrush(x, sr, bits = 6, holdHz = 8000) {
  const step = Math.max(1, Math.round(sr / holdHz)), q = Math.pow(2, bits - 1);
  let h = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % step === 0) h = Math.round(x[i] * q) / q;
    x[i] = h;
  }
  return x;
}
/** Gate a signal into rhythmic chops (stutter). rate in Hz, duty 0..1. */
export function chop(x, sr, rate, duty = 0.5, seed = 0) {
  const r = mulberry32(seed || 7);
  let next = 0, on = true;
  const period = sr / rate;
  for (let i = 0; i < x.length; i++) {
    if (i >= next) { on = seed ? r() < duty + 0.2 : !on; next = i + period * (on ? duty : 1 - duty) * (seed ? 0.5 + r() : 1); }
    if (!on) x[i] = 0;
  }
  return x;
}

/** Karplus–Strong plucked string. */
export function pluck(sr, seconds, freq, { damping = 0.996, brightness = 0.5, seed = 3 } = {}) {
  const out = buf(sr, seconds);
  const N = Math.max(2, Math.round(sr / freq));
  const r = mulberry32(seed);
  const line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = r() * 2 - 1;
  let prev = 0;
  for (let i = 0; i < out.length; i++) {
    const j = i % N;
    const s = line[j];
    const filtered = damping * (brightness * s + (1 - brightness) * prev);
    prev = s;
    line[j] = filtered;
    out[i] = s;
  }
  return out;
}

/** Feedback delay (echo). */
export function echo(x, sr, time = 0.12, feedback = 0.35, mix = 0.3, tail = 0.6) {
  const d = Math.max(1, Math.round(time * sr));
  const n = x.length + Math.round(tail * sr);
  const out = new Float32Array(n);
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dry = i < x.length ? x[i] : 0;
    const delayed = i >= d ? line[i - d] : 0;
    line[i] = dry + delayed * feedback;
    out[i] = dry + delayed * mix;
  }
  return out;
}

/** Schroeder/Freeverb-style mono reverb. size 0..1, mix 0..1, tail seconds appended. */
export function reverb(x, sr, size = 0.6, damp = 0.4, mix = 0.25, tail = 1.2) {
  const n = x.length + Math.round(tail * sr);
  const input = new Float32Array(n);
  input.set(x);
  const scale = sr / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491].map((l) => Math.round(l * scale));
  const fb = 0.7 + 0.28 * size;
  const wet = new Float32Array(n);
  for (const L of combs) {
    const line = new Float32Array(L);
    let idx = 0, store = 0;
    for (let i = 0; i < n; i++) {
      const y = line[idx];
      store = y * (1 - damp) + store * damp;
      line[idx] = input[i] + store * fb;
      idx = (idx + 1) % L;
      wet[i] += y / combs.length;
    }
  }
  for (const L of [556, 441, 341].map((l) => Math.round(l * scale))) {
    const line = new Float32Array(L);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const bufout = line[idx];
      const y = -wet[i] + bufout;
      line[idx] = wet[i] + bufout * 0.5;
      idx = (idx + 1) % L;
      wet[i] = y;
    }
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = input[i] * (1 - mix) + wet[i] * mix * 2.2;
  return out;
}

/** Combine helpers ---------------------------------------------------------------- */
export function mixInto(dst, src, offsetSamples = 0, gain = 1) {
  for (let i = 0; i < src.length; i++) {
    const j = i + offsetSamples;
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain;
  }
  return dst;
}
export function sum(sr, seconds, ...layers) {
  const out = buf(sr, seconds);
  for (const [sig, gain = 1, offset = 0] of layers) mixInto(out, sig, Math.round(offset * sr), gain);
  return out;
}
export function scale(x, g) {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}
export function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}
export function normalize(x, targetDb = -1) {
  const p = peak(x);
  if (p > 0) scale(x, dbToGain(targetDb) / p);
  return x;
}
export function reverse(x) {
  return Float32Array.from(x).reverse();
}

/** Stereo helpers: returns [L, R]. Haas widening by a few ms on one side. */
export function widen(x, sr, ms = 8, pan = 0) {
  const d = Math.round((ms / 1000) * sr);
  const L = new Float32Array(x.length + d), R = new Float32Array(x.length + d);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < x.length; i++) { L[i] += x[i] * gl * 1.414; R[i + d] += x[i] * gr * 1.414; }
  return [L, R];
}
export function panMono(x, pan = 0) {
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * 1.414, gr = Math.sin(((pan + 1) * Math.PI) / 4) * 1.414;
  return [Float32Array.from(x, (v) => v * gl), Float32Array.from(x, (v) => v * gr)];
}

/** Loudness (ITU-R BS.1770-4 integrated, K-weighted, gated). Input: array of channels. */
export function integratedLufs(channels, sr) {
  const kw = channels.map((c) => biquad(biquad(c, sr, 'highshelf', 1681.97, 0.7072, 3.999), sr, 'hp', 38.13, 0.5003));
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const zs = [];
  for (let s = 0; s + block <= kw[0].length; s += hop) {
    let z = 0;
    for (const c of kw) { let acc = 0; for (let i = s; i < s + block; i++) acc += c[i] * c[i]; z += acc / block; }
    zs.push(z);
  }
  const L = (z) => -0.691 + 10 * Math.log10(Math.max(z, 1e-12));
  const abs = zs.filter((z) => L(z) > -70);
  if (!abs.length) return -70;
  const meanAbs = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = abs.filter((z) => L(z) > L(meanAbs) - 10);
  return L(rel.reduce((a, b) => a + b, 0) / rel.length);
}

/** 4x-oversampled (linear) true-peak estimate in dBTP. */
export function truePeakDb(channels) {
  let p = 0;
  for (const c of channels) for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    for (let k = 0; k < 4; k++) p = Math.max(p, Math.abs(a + ((b - a) * k) / 4));
  }
  return gainToDb(p);
}

/** Look-ahead brickwall limiter on stereo channels (in place). */
export function limit(channels, sr, ceilingDb = -1, lookaheadMs = 5, releaseMs = 80) {
  const ceil = dbToGain(ceilingDb), la = Math.round((lookaheadMs / 1000) * sr);
  const n = channels[0].length;
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const c of channels) p = Math.max(p, Math.abs(c[i]));
    need[i] = p > ceil ? ceil / p : 1;
  }
  const rel = Math.exp(-1 / ((releaseMs / 1000) * sr));
  let g = 1;
  const gain = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let target = 1;
    for (let k = 0; k <= la && i + k < n; k += 4) target = Math.min(target, need[i + k]);
    g = target < g ? target : target + (g - target) * rel;
    gain[i] = g;
  }
  for (const c of channels) for (let i = 0; i < n; i++) c[i] *= gain[i];
  return channels;
}

/** Write 16-bit PCM WAV (stereo or mono). Returns a Buffer. */
export function wavBuffer(channels, sr) {
  const nch = channels.length, n = channels[0].length;
  const data = Buffer.alloc(n * nch * 2);
  let o = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) {
    const v = clamp(channels[c][i], -1, 1);
    data.writeInt16LE(Math.round(v < 0 ? v * 32768 : v * 32767), o);
    o += 2;
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(nch, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * nch * 2, 28); h.writeUInt16LE(nch * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Read a 16-bit PCM WAV into Float32 channels (for user-supplied beds). */
export function readWav(buffer) {
  let p = 12, fmt = null, data = null;
  while (p < buffer.length - 8) {
    const id = buffer.toString('ascii', p, p + 4), size = buffer.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: buffer.readUInt16LE(p + 10), sr: buffer.readUInt32LE(p + 12), bits: buffer.readUInt16LE(p + 22) };
    if (id === 'data') data = buffer.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error('Only 16-bit PCM WAV is supported for music.file — convert with: npx remotion ffmpeg -i in.mp3 -ar 48000 -ac 2 -sample_fmt s16 bed.wav');
  const n = data.length / 2 / fmt.ch;
  const chans = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) chans[c][i] = data.readInt16LE((i * fmt.ch + c) * 2) / 32768;
  return { sr: fmt.sr, channels: chans.length === 1 ? [chans[0], chans[0]] : chans.slice(0, 2) };
}
