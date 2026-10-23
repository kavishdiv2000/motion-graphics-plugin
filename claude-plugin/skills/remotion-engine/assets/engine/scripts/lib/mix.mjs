// Audio mixer: music bed + event-driven SFX -> mastered stereo WAV at the target loudness.
import { readFileSync } from 'node:fs';
import { renderSfx } from './sfx.mjs';
import { makeBed, shapeBed } from './music.mjs';
import { dbToGain, integratedLufs, truePeakDb, limit, readWav, gainToDb } from './dsp.mjs';
import { rand } from '../../src/lib/prng.js';

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
    bed = makeBed({ sr, durationS: n / sr, bpm: spec.meta.bpm, key: music.key || 'A', scale: music.scale || 'minor', preset: music.preset || 'signal_drone', sections: music.energy || [], seed: 1 });
  }
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

  // 3. master: loudness normalise, then true-peak limit
  const target = spec.audio.master?.lufs_target ?? -14;
  const ceiling = spec.audio.master?.true_peak_db ?? -1;
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
    report: { sample_rate: sr, duration_s: +(n / sr).toFixed(3), lufs_pre_master: +pre.toFixed(2), lufs_integrated: +post.toFixed(2), true_peak_dbtp: +tp.toFixed(2), target_lufs: target, hits: hits.length, makeup_gain_db: +gainToDb(g).toFixed(2) },
  };
}
