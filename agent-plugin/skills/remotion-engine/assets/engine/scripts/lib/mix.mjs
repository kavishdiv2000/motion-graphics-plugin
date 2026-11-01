// Audio mixer: music bed + event-driven SFX -> mastered stereo WAV at the target loudness.
import { readFileSync } from 'node:fs';
import { renderSfx } from './sfx.mjs';
import { makeBed, shapeBed } from './music.mjs';
import { dbToGain, integratedLufs, truePeakDb, limit, readWav, gainToDb } from './dsp.mjs';
import { rand } from '../../src/lib/prng.js';
import { resolveKit, planKitHits, stopDownEnvelope, bedPowerOf } from './kits.mjs';

// Relative level of each event family against audio.sfx.gain_db. Words and typing must sit far
// under the hero hits or the mix turns into a machine gun.
export const DEFAULT_EVENT_GAINS = {
  scene_in: 0, label_in: -4, word_in: -9, decode_start: -6, decode_land: 0, decode_land_minor: -8,
  type_char: -11, type_done: -5, count_tick: -9, count_land: -1, strike: -4, fade_in: -6,
  logo_in: 0, exit: -8, transition: -5, manual: 0,
};
const DEFAULT_SPACING = { word_in: 3, type_char: 2, count_tick: 3, label_in: 4 };

/** Map timeline cues to concrete SFX hits. */
export function resolveHits(spec, cues) {
  const sfx = spec.audio.sfx || {};
  const map = sfx.map || {};
  const gains = { ...DEFAULT_EVENT_GAINS, ...(sfx.gains || {}) };
  const spacing = { ...DEFAULT_SPACING, ...(sfx.min_spacing_frames || {}) };
  const last = {};
  const hits = [];
  for (const c of cues) {
    let key = c.type;
    if (c.type === 'decode_land' && !c.hero) key = 'decode_land_minor';
    const id = c.type === 'manual' ? c.id : map[key] ?? (key === 'decode_land_minor' ? map.decode_land_minor : undefined);
    if (!id) continue;
    if (spacing[key] && last[key] !== undefined && c.frame - last[key] < spacing[key]) continue;
    last[key] = c.frame;
    const humanise = key === 'word_in' || key === 'type_char' || key === 'count_tick' ? (rand('h', c.frame, key) - 0.5) * 3 : 0;
    hits.push({ id, frame: c.frame, event: key, scene: c.scene, gainDb: (sfx.gain_db ?? -9) + (gains[key] ?? 0) + (c.gain_db || 0) + humanise, duck: key === 'decode_land' || key === 'count_land' || key === 'logo_in' });
  }
  return hits;
}

/**
 * Build the final mix.
 * @returns {{channels: Float32Array[], report: object, hits: object[]}}
 */
export function buildMix(spec, cues, { musicFileResolver } = {}) {
  const sr = spec.audio.sample_rate || 48000;
  const fps = spec.meta.fps;
  const n = Math.round((spec.meta.durationInFrames / fps) * sr);
  const L = new Float32Array(n), R = new Float32Array(n);
  const music = spec.audio.music || {};

  // 1. music bed
  let bed = null;
  if (music.source === 'file' && music.file) {
    const w = readWav(readFileSync(musicFileResolver ? musicFileResolver(music.file) : music.file));
    if (w.sr !== sr) throw new Error(`Music file is ${w.sr} Hz; convert to ${sr} Hz`);
    bed = w.channels.map((c) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = c[i % c.length]; return o; });
  } else if (music.source !== 'none') {
    // kit mixes: no drum layers unless asked (music.percussion: true); classic keeps each preset's own drums
    const kitMode = spec.audio.sfx?.kit && spec.audio.sfx.kit !== 'classic';
    bed = makeBed({ sr, durationS: n / sr, bpm: spec.meta.bpm, key: music.key || 'A', scale: music.scale || 'minor', preset: music.preset || 'signal_drone', sections: music.energy || [], seed: 1, percussion: music.percussion ?? !kitMode });
  }
  const sfxCfg = spec.audio.sfx || {};
  if (sfxCfg.kit && sfxCfg.kit !== 'classic') return kitMix(spec, sfxCfg.kit === 'none' ? [] : cues, { sr, fps, n, L, R, bed, music });
  const hits = resolveHits(spec, cues);
  if (bed) {
    shapeBed(bed, sr, { gainDb: music.gain_db ?? -17, fadeIn: music.fade_in_s ?? 0.8, fadeOut: music.fade_out_s ?? 2.5 });
    // ducking envelope under hero hits
    const duck = new Float32Array(n).fill(1);
    const depth = dbToGain(-(music.duck_db ?? 4));
    for (const h of hits.filter((x) => x.duck)) {
      const s = Math.round((h.frame / fps) * sr), a = Math.round(0.01 * sr), r = Math.round(0.45 * sr);
      for (let i = 0; i < a + r; i++) {
        const j = s - a + i;
        if (j < 0 || j >= n) continue;
        const g = i < a ? 1 - (1 - depth) * (i / a) : depth + (1 - depth) * ((i - a) / r);
        duck[j] = Math.min(duck[j], g);
      }
    }
    for (let i = 0; i < n; i++) { L[i] += bed[0][i] * duck[i]; R[i] += bed[1][i] * duck[i]; }
  }

  // 2. SFX hits
  for (const h of hits) {
    const [sl, sr2] = renderSfx(h.id, sr);
    const off = Math.round((h.frame / fps) * sr);
    const g = dbToGain(h.gainDb);
    for (let i = 0; i < sl.length; i++) {
      const j = off + i;
      if (j < 0 || j >= n) break;
      L[j] += sl[i] * g;
      R[j] += sr2[i] * g;
    }
  }

  return master(spec, sr, n, L, R, hits, {});
}

/** Kit mode (earshot-derived): roles placed by measured sync points, levelled against the bed, music stop-downs. */
function kitMix(spec, cues, { sr, fps, n, L, R, bed, music }) {
  const sfx = spec.audio.sfx;
  const kit = resolveKit(sfx);
  let bedPower = null, bedFallback = null;
  if (bed) {
    shapeBed(bed, sr, { gainDb: music.gain_db ?? -17, fadeIn: music.fade_in_s ?? 0.1, fadeOut: music.fade_out_s ?? 0.6 });
    const bp = bedPowerOf(bed, sr);
    bedPower = bp.power; bedFallback = bp.median;
  }
  const plan = planKitHits(kit, cues, { sr, fps, bedPower, bedFallback, music, trimDb: sfx.trim_db || 0, levelMode: sfx.level || 'auto' });
  let stopDowns = [];
  if (bed) {
    const sd = music.stop_down ?? 'auto';
    const cfg = sd === 'off' || sd === false ? null : typeof sd === 'object' ? { ...(kit.mix.stop_down ? kitStopDown(kit.mix.stop_down) : {}), ...sd }
      : kit.mix.stop_down ? kitStopDown(kit.mix.stop_down) : null;
    let env = null;
    if (cfg) { const r = stopDownEnvelope(n, sr, plan.hits, cfg); env = r.env; stopDowns = r.at; }
    for (let i = 0; i < n; i++) { const g = env ? env[i] : 1; L[i] += bed[0][i] * g; R[i] += bed[1][i] * g; }
  }
  for (const h of plan.hits) {
    const [tl, tr] = h._take.channels;
    const g = dbToGain(h.gain_db);
    let off = Math.round(h.start_s * sr), from = 0;
    if (off < 0) { from = -off; off = 0; }
    const fadeIn = from ? Math.round(0.002 * sr) : 0;
    for (let i = from; i < tl.length; i++) {
      const j = off + i - from;
      if (j >= n) break;
      const f = fadeIn && i - from < fadeIn ? (i - from) / fadeIn : 1;
      L[j] += tl[i] * g * f;
      R[j] += tr[i] * g * f;
    }
  }
  // placement is exact to one sample; a sound whose lead-in would start before 0 s is trimmed (its sync point still lands)
  const hits = plan.hits.map(({ _take, ...h }) => ({ ...h, ...(h.start_s < 0 ? { trimmed_head_ms: +(-h.start_s * 1000).toFixed(1) } : {}) }));
  const durS = n / sr;
  const accents = hits.filter((h) => ['hit', 'drop', 'whoosh.long', 'riser', 'swell', 'suck', 'whoosh.short', 'land'].includes(h.role)).length;
  const firstSfx = hits.length ? Math.max(0, Math.min(...hits.map((h) => h.start_s))) : null;
  return master(spec, sr, n, L, R, hits, {
    kit: kit.name, key_shift_semitones: plan.keyShift, level_mode: bed ? (sfx.level === 'level' ? 'level' : 'bed') : 'level',
    roles: Object.fromEntries(Object.entries(hits.reduce((a, h) => ((a[h.role] = (a[h.role] || 0) + 1), a), {}))),
    accents_per_10s: +((accents / durS) * 10).toFixed(2), hits_per_10s: +((hits.length / durS) * 10).toFixed(2),
    first_sound_s: bed ? 0 : firstSfx, stop_downs: stopDowns, thinned: plan.dropped.length, stacked: plan.stacked,
    late_sync: hits.filter((h) => h.sync_s < 0).length,
  });
}
const mid = (v) => (Array.isArray(v) ? (v[0] + v[1]) / 2 : v);
function kitStopDown(sd) { return { roles: sd.before || ['hit', 'drop', 'whoosh.long', 'swell'], depth_db: mid(sd.depth_db ?? 9), length_s: mid(sd.length_s ?? 0.4) }; }

function master(spec, sr, n, L, R, hits, extra) {
  // 3. master: loudness normalise, then true-peak limit
  const target = spec.audio.master?.lufs_target ?? -14;
  // AAC encoding overshoots inter-sample peaks by ~0.5-1 dB: kit mixes keep that much extra headroom by default
  const ceiling = (spec.audio.master?.true_peak_db ?? -1) - (spec.audio.master?.codec_headroom_db ?? (extra.kit ? 0.5 : 0));
  const pre = integratedLufs([L, R], sr);
  const g = dbToGain(Math.min(24, target - pre));
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  limit([L, R], sr, ceiling - 0.3);
  // second pass: the limiter shaves a little loudness off; correct once more and re-limit
  const mid = integratedLufs([L, R], sr);
  if (Math.abs(target - mid) > 0.2) {
    const g2 = dbToGain(target - mid);
    for (let i = 0; i < n; i++) { L[i] *= g2; R[i] *= g2; }
    limit([L, R], sr, ceiling - 0.3);
  }
  // a short fade at the very end avoids a click on the last sample
  const fo = Math.round(0.02 * sr);
  for (let i = 0; i < fo; i++) { L[n - 1 - i] *= i / fo; R[n - 1 - i] *= i / fo; }
  const post = integratedLufs([L, R], sr);
  const tp = truePeakDb([L, R]);
  return {
    channels: [L, R],
    hits,
    report: { sample_rate: sr, duration_s: +(n / sr).toFixed(3), lufs_pre_master: +pre.toFixed(2), lufs_integrated: +post.toFixed(2), true_peak_dbtp: +tp.toFixed(2), target_lufs: target, hits: hits.length, makeup_gain_db: +gainToDb(g).toFixed(2), ...extra },
  };
}
