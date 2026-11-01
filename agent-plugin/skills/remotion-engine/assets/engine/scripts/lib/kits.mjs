// Sound kits: one sound per ROLE, placed by its measured sync point and levelled against the music bed.
//
// Ported from earshot's kit system (https://github.com/Leonxlnx/earshot, MIT). The sounds are earshot's, pre-rendered
// into ../../sfx-pack/ by scripts/build-sfx-pack.py (development tool; users need no Python). What makes it accurate:
//   align    each take is placed by a measured point, not by its file start: onset (first point within 30 dB of the
//            1 ms envelope's max), peak (loudest 5 ms: whooshes peak ON the cut) or end (risers end on the hit)
//   offset   where that point sits against the picture event, measured on professional launch films: taps / knocks /
//            clicks lead the frame (-11..-60 ms), pop-in thumps and whoosh / swell peaks land after it (+30..+42 ms)
//   bed_db   the effect's loudest 50 ms sits this far over the music's median level in the second before the cue
//            (3-10 dB), so effects stay audible over loud music and never jump out of quiet music
//   gaps     a run (typing, ticks, pops) keeps at least min_gap_ms between sounds (66-159 ms)
//   takes    every event takes the next take of its role, so no two consecutive keys are the same sample
//   pitch    tonal roles (bell, text) are tuned into the music's key (pentatonic) by resampling one take
//   stop-down the music steps down 0.3-0.5 s BEFORE a hit and comes back ON it, instead of ducking after every effect
// Zero third-party imports.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav } from './dsp.mjs';
import { renderSfx, allSfxIds } from './sfx.mjs';
import { hash } from '../../src/lib/prng.js';

export const PACK_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../sfx-pack');
export const KIT_NAMES = ['studio', 'launch', 'calm', 'crisp', 'minimal'];
export const ROLES = ['tick', 'tick.crisp', 'tock', 'hit', 'land', 'land.light', 'pop', 'whoosh.short', 'whoosh.long', 'suck',
  'riser', 'swell', 'drop', 'key', 'key.space', 'key.return', 'click', 'click.confirm', 'snap', 'bell', 'text'];
// one accent at a time: two of these within 3 frames double up, so the lower-priority one is removed. Lead-ins that END
// on the hit (riser, suck) are not accents: riser → stop-down → impact is the reveal gesture.
const DESIGNED = ['hit', 'drop', 'whoosh.long', 'swell'];
const STACK_PRIORITY = ['hit', 'drop', 'swell', 'whoosh.long'];
const DEFAULT_ALIGN = { 'whoosh.short': 'peak', 'whoosh.long': 'peak', suck: 'end', riser: 'end', swell: 'end' };

/** Which role sounds each timeline event (DESIGN audio.sfx.events overrides; null = silent). */
export const EVENT_ROLES = {
  scene_in: null,
  label_in: 'tick',            // a label / glitch line appears
  word_in: null,               // per-word sounds are clutter: the text role sounds once when the line resolves
  words_done: 'text',          // a word-by-word line has fully resolved
  decode_start: 'tick.crisp',
  decode_land: 'hit',          // hero headline lands (the film's accents)
  decode_land_minor: 'land.light',
  type_char: 'key',
  type_space: 'key.space',
  type_done: 'click.confirm',
  count_tick: 'tick',
  count_land: 'land',
  strike: 'whoosh.short',
  fade_in: 'pop',
  logo_in: 'hit',              // the lockup: one clean hit (the stop-down before it does the lead-in)
  exit: null,
  transition: 'whoosh.short',  // glitch / flash cuts: the whoosh PEAKS on the cut
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(n) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(n).trim());
  if (!m) throw new Error(`bad note "${n}" (use e.g. E5, F#4, Bb3)`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const keyPc = (k) => (NOTE[String(k)[0].toUpperCase()] + (String(k)[1] === '#' ? 1 : String(k)[1] === 'b' ? -1 : 0) + 12) % 12;

/** Semitones that move the kits' C-major-pentatonic notes into the music's key (minor modes: their relative major). */
export function keyShift(key, scale) {
  if (!key) return 0;
  const root = (keyPc(key) + (/minor|dorian|phrygian|aeolian/i.test(scale || '') ? 3 : 0)) % 12;
  return root > 5 ? root - 12 : root;
}

// ───────────────────────────────────────────── pack + kits
let PACK = null;
export function pack() {
  if (!PACK) PACK = existsSync(join(PACK_DIR, 'pack.json')) ? JSON.parse(readFileSync(join(PACK_DIR, 'pack.json'), 'utf8')) : { sounds: {}, takes: {} };
  return PACK;
}
const KITS = {};
export function loadKit(name) {
  if (!KIT_NAMES.includes(name)) throw new Error(`unknown sound kit "${name}" (studio | launch | calm | crisp | minimal | none | classic)`);
  if (!KITS[name]) KITS[name] = JSON.parse(readFileSync(join(PACK_DIR, 'kits', `${name}.json`), 'utf8'));
  return KITS[name];
}
/** Placement / level keys measured on professional launch films (the launch kit) apply to every kit's roles by default. */
function roleDefaults() {
  const L = loadKit('launch').roles;
  return Object.fromEntries(ROLES.map((r) => [r, Object.fromEntries(['bed_db', 'offset_ms', 'min_gap_ms'].filter((k) => L[r]?.[k] !== undefined).map((k) => [k, L[r][k]]))]));
}
export const packSoundIds = () => Object.keys(pack().sounds);
export const knownSoundIds = () => [...packSoundIds(), ...allSfxIds()];

/**
 * The effective kit: preset roles ← DESIGN audio.sfx.roles overrides (a role: null silences it; { sound: <id> }
 * swaps the voice: a pack id like cut_hit/kick, a built-in synth id like impact_punch, or a custom .wav id).
 */
export function resolveKit(sfx = {}) {
  const base = sfx.kit === 'none' ? { name: 'none', mix: {}, roles: {} } : loadKit(sfx.kit);
  const defs = roleDefaults();
  const roles = {};
  for (const r of ROLES) {
    const k = base.roles[r];
    const o = sfx.roles && r in sfx.roles ? sfx.roles[r] : undefined;
    if (o === null || (o === undefined && !k)) { roles[r] = null; continue; }
    const merged = { align: DEFAULT_ALIGN[r] || 'onset', ...defs[r], ...(k || {}), ...(o || {}) };
    if (o?.sound && o.sound !== k?.sound) { delete merged.takes; merged.swapped = true; } // a swapped voice uses all takes of the new sound
    roles[r] = merged;
  }
  return { name: base.name, mix: base.mix || {}, roles, events: { ...EVENT_ROLES, ...(sfx.events || {}) } };
}

// ───────────────────────────────────────────── measuring (earshot's definitions)
const K_SOS = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621]]; // ITU-R BS.1770 K-weighting at 48 kHz
function kweight(x) {
  let y = Float64Array.from(x);
  for (const [b0, b1, b2, a1, a2] of K_SOS) {
    const o = new Float64Array(y.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < y.length; i++) { const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; }
    y = o;
  }
  return y;
}
/** K-weighted power per sample summed over both channels (as they play). */
export function kpower([L, R]) {
  const a = kweight(L), b = R === L ? a : kweight(R);
  const p = new Float64Array(a.length);
  for (let i = 0; i < p.length; i++) p[i] = a[i] * a[i] + b[i] * b[i];
  return p;
}
const lufs = (p) => -0.691 + 10 * Math.log10(p + 1e-24);
/** onset / peak / end (s), sample peak (dBFS) and loudest-50 ms K-weighted level (LUFS) of a take. */
export function measureTake([L, R], sr = 48000) {
  const n = L.length;
  const m = new Float64Array(n);
  let pk = 0;
  for (let i = 0; i < n; i++) { m[i] = (L[i] + R[i]) / 2; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  const c = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) c[i + 1] = c[i] + m[i] * m[i];
  const env = (win, hop) => { const e = [], s = []; for (let st = 0; st <= Math.max(0, n - win); st += hop) { s.push(st); e.push(Math.sqrt(Math.max(0, (c[Math.min(st + win, n)] - c[st]) / win))); } return [e, s]; };
  const [e1, s1] = env(Math.max(1, sr / 1000 | 0), Math.max(1, sr / 4000 | 0));
  const max1 = Math.max(...e1);
  const on = s1[e1.findIndex((v) => v >= max1 * 10 ** (-30 / 20))] || 0;
  const w5 = Math.max(1, sr / 200 | 0);
  const [e5, s5] = env(w5, Math.max(1, sr / 1000 | 0));
  let ip = 0; for (let i = 1; i < e5.length; i++) if (e5[i] > e5[ip]) ip = i;
  let last = ip; for (let i = e5.length - 1; i >= 0; i--) if (e5[i] >= e5[ip] * 10 ** (-50 / 20)) { last = i; break; }
  const p = kpower([L, R]);
  const win = Math.round(0.05 * sr);
  const pc = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pc[i + 1] = pc[i] + p[i];
  let best = n < win ? pc[n] / win : 0;
  for (let i = win; i <= n; i++) best = Math.max(best, (pc[i] - pc[i - win]) / win);
  return { onset_s: on / sr, peak_s: (s5[ip] + w5 / 2) / sr, end_s: Math.min(n, s5[last] + w5) / sr, dur_s: n / sr, peak_db: 20 * Math.log10(pk + 1e-12), l50_lufs: lufs(best) };
}

/** The music's level before t (s): median of its 50 ms K-weighted levels over the preceding second; null = no bed there. */
export function bedLevelAt(bedPower, sr, t) {
  const win = Math.round(0.05 * sr), b = Math.max(0, Math.round((t - 1) * sr)), e = Math.max(0, Math.round(t * sr));
  const k = Math.floor((e - b) / win);
  if (k < 1) return null;
  const v = [];
  for (let j = 0; j < k; j++) { let s = 0; for (let i = b + j * win; i < b + (j + 1) * win; i++) s += bedPower[i]; v.push(s / win); }
  v.sort((x, y) => x - y);
  const med = k % 2 ? v[(k - 1) / 2] : (v[k / 2 - 1] + v[k / 2]) / 2;
  const lv = lufs(med);
  return lv < -60 ? null : lv;
}
const overBed = (bedDb) => 10 * Math.log10(10 ** (bedDb / 10) - 1); // take alone, so that take + bed = bed + bed_db

// ───────────────────────────────────────────── takes
const TAKE_CACHE = new Map();
function loadPackTake(file) {
  if (!TAKE_CACHE.has(file)) {
    const w = readWav(readFileSync(join(PACK_DIR, file)));
    const meta = pack().takes[file];
    TAKE_CACHE.set(file, { channels: w.channels, sr: w.sr, ...meta, file });
  }
  return TAKE_CACHE.get(file);
}
function loadSynthTake(id, sr) {
  const key = `synth:${id}@${sr}`;
  if (!TAKE_CACHE.has(key)) { const ch = renderSfx(id, sr); TAKE_CACHE.set(key, { channels: ch, sr, ...measureTake(ch, sr), file: `synth:${id}`, pitch: null }); }
  return TAKE_CACHE.get(key);
}
/** All takes for a role (pack takes, a pack sound's takes, or one built-in / custom sound measured on the fly). */
export function roleTakes(role, sr) {
  if (role.takes?.length) return role.takes.map(loadPackTake);
  const ps = pack().sounds[role.sound];
  if (ps) return ps.takes.map(loadPackTake);
  return [loadSynthTake(role.sound, sr)];
}

/** Resample a take by `semis` semitones (cubic Hermite); returns a new take with re-measured sync points. */
export function pitchTake(t, semis) {
  if (!semis) return t;
  const r = 2 ** (semis / 12);
  const n = Math.floor((t.channels[0].length - 1) / r);
  const chans = t.channels.map((x) => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const pos = i * r, k = Math.floor(pos), f = pos - k;
      const y0 = x[Math.max(0, k - 1)], y1 = x[k], y2 = x[Math.min(x.length - 1, k + 1)], y3 = x[Math.min(x.length - 1, k + 2)];
      const c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
      o[i] = ((c3 * f + c2) * f + c1) * f + y1;
    }
    return o;
  });
  const shared = t.channels[0] === t.channels[1];
  const ch = shared ? [chans[0], chans[0]] : chans;
  return { ...t, channels: ch, ...measureTake(ch, t.sr), file: `${t.file}@${semis > 0 ? '+' : ''}${semis}st` };
}

// ───────────────────────────────────────────── planning
/**
 * Turn timeline cues into placed hits.
 * @param ctx { sr, fps, bedPower (Float64Array|null), bedFallback (LUFS|null), music: {key, scale}, trimDb, levelMode }
 */
export function planKitHits(kit, cues, ctx) {
  const { sr, fps } = ctx;
  const shift = keyShift(ctx.music?.key, ctx.music?.scale);
  const counters = {}, lastAt = {}, perScene = {};
  const hits = [], dropped = [];
  for (const c of cues) {
    let ev = c.type;
    if (ev === 'decode_land' && !c.hero) ev = 'decode_land_minor';
    const roleName = ev === 'manual' ? c.role : kit.events[ev];
    let role = roleName ? kit.roles[roleName] : null;
    if (ev === 'manual' && !roleName && c.id) role = { sound: c.id, align: 'onset', bed_db: 6, offset_ms: 0, level_db: -6 };
    if (!role) continue;
    const name = roleName || `sound:${c.id}`;
    const cueS = c.frame / fps + (c.offset_s || 0);
    if (role.min_gap_ms && lastAt[name] !== undefined && (cueS - lastAt[name]) * 1000 < role.min_gap_ms - 0.5) { dropped.push({ role: name, cue_s: cueS, reason: `closer than ${role.min_gap_ms} ms to the last ${name}` }); continue; }
    lastAt[name] = cueS;
    const takes = roleTakes(role, sr);
    const n = counters[name] = (counters[name] ?? hash('take', name) % 997) + 1;
    let take = takes[n % takes.length];
    // tonal roles: step through the role's notes (C-major pentatonic), moved into the music's key
    let note = null;
    if (role.pitches?.length && take.pitch) {
      const k = perScene[`${c.scene}|${name}`] = (perScene[`${c.scene}|${name}`] ?? -1) + 1;
      note = c.note || role.pitches[(k + (hash('notes', c.scene || '') % role.pitches.length)) % role.pitches.length];
      let semis = noteToMidi(note) + (c.note ? 0 : shift) - noteToMidi(take.pitch);
      if (role.swapped && !c.note) { while (semis > 6) semis -= 12; while (semis < -6) semis += 12; } // another voice: same notes, its own octave
      take = pitchTake(take, semis);
    }
    const align = role.align || 'onset';
    const syncIn = align === 'peak' ? take.peak_s : align === 'end' ? take.end_s : take.onset_s;
    const human = name === 'key' || name === 'key.space' ? ((hash('j', c.frame, name) % 7) - 3) / 1000 : 0; // ±3 ms
    const targetS = cueS + (role.offset_ms || 0) / 1000 + human;
    const startS = targetS - syncIn;
    let bed = null, mode = 'level', gainDb;
    if (ctx.bedPower && ctx.levelMode !== 'level' && role.bed_db !== undefined) {
      // the bed right before the cue; never treated as more than 12 dB under the track's typical level, so an accent
      // in a fade-in or a breakdown still reads (earshot: no bed at all → level_db; here the music exists, so median)
      bed = bedLevelAt(ctx.bedPower, sr, Math.max(0, cueS)) ?? ctx.bedFallback;
      if (bed !== null && ctx.bedFallback !== null) bed = Math.max(bed, ctx.bedFallback - 12);
      if (bed !== null) { mode = 'bed'; gainDb = Math.min(bed + overBed(role.bed_db) - take.l50_lufs, -1 - take.peak_db); }
    }
    if (mode === 'level') gainDb = (role.level_db ?? -6);
    const vary = name === 'key' || name === 'tick' || name === 'pop' ? ((hash('g', c.frame, name) % 11) - 5) / 5 : 0; // ±1 dB on runs
    gainDb += (ctx.trimDb || 0) + (c.gain_db || 0) + vary;
    hits.push({ event: ev, role: name, sound: role.sound, take: take.file, note, scene: c.scene, frame: c.frame, cue_s: +cueS.toFixed(4),
      align, offset_ms: role.offset_ms || 0, start_s: +startS.toFixed(4), sync_s: +(startS + syncIn).toFixed(4), gain_db: +gainDb.toFixed(2),
      mode, bed_lufs: bed === null ? null : +bed.toFixed(2), _take: take });
  }
  // one designed gesture at a time: within 3 frames keep the highest-priority one
  const stacked = [];
  const designed = hits.filter((h) => DESIGNED.includes(h.role)).sort((a, b) => a.cue_s - b.cue_s);
  for (let i = 1; i < designed.length; i++) {
    const a = designed[i - 1], b = designed[i];
    if (b._gone || a._gone) continue;
    if ((b.cue_s - a.cue_s) * fps <= 3) {
      const loser = STACK_PRIORITY.indexOf(a.role) <= STACK_PRIORITY.indexOf(b.role) ? b : a;
      loser._gone = true;
      stacked.push({ kept: (loser === a ? b : a).role, dropped: loser.role, at_s: loser.cue_s });
    }
  }
  return { hits: hits.filter((h) => !h._gone), dropped, stacked, keyShift: shift };
}

/** Music gain envelope: steps down before designed hits and comes back on them. */
export function stopDownEnvelope(n, sr, hits, { roles = ['hit', 'drop', 'whoosh.long', 'swell'], depth_db = 9, length_s = 0.4 } = {}) {
  const env = new Float32Array(n).fill(1);
  const depth = 10 ** (-depth_db / 20);
  const count = [];
  for (const h of hits) {
    if (!roles.includes(h.role)) continue;
    const t1 = Math.round(h.sync_s * sr), t0 = Math.round((h.sync_s - length_s) * sr);
    const down = Math.round(0.06 * sr), up = Math.round(0.025 * sr);
    for (let i = Math.max(0, t0); i < Math.min(n, t1 + up); i++) {
      let g;
      if (i < t0 + down) g = 1 - (1 - depth) * ((i - t0) / down);
      else if (i < t1 - Math.round(0.005 * sr)) g = depth;
      else g = depth + (1 - depth) * Math.min(1, (i - (t1 - Math.round(0.005 * sr))) / up);
      env[i] = Math.min(env[i], g);
    }
    count.push(+h.sync_s.toFixed(3));
  }
  return { env, at: count };
}

/** Stereo-sum K-weighted power of the bed (for bedLevelAt) and its overall median 50 ms level (fallback). */
export function bedPowerOf([L, R], sr) {
  const p = kpower([L, R]);
  const win = Math.round(0.05 * sr), v = [];
  for (let s = 0; s + win <= p.length; s += win) { let a = 0; for (let i = s; i < s + win; i++) a += p[i]; v.push(a / win); }
  v.sort((a, b) => a - b);
  const loud = v.filter((x) => lufs(x) > -60);
  return { power: p, median: loud.length ? lufs(loud[Math.floor(loud.length / 2)]) : null };
}
