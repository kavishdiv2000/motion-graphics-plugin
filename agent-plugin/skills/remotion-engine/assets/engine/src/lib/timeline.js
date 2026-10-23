// Scene timeline: turns a resolved scene + motion tokens into exact frame numbers for every
// element, word and character, plus a list of audio cue events.
// Pure, deterministic, framework-free: imported by React components AND by Node scripts,
// so picture and sound can never drift apart.

import { TEMPLATES, SLOT_DEFAULTS, ROLE_REVEAL } from './templates.js';
import { rand } from './prng.js';

export const DEFAULT_MOTION = {
  scene_lead_in_frames: 3, // empty frames at the head of a scene (lets the cut breathe)
  label_in_frames: 8, // glitch-in duration of the label
  label_overlap_frames: 4, // next element may start this many frames before the label finishes
  gap_frames: 3, // gap between consecutive elements
  headline_gap_frames: 3, // extra gap before the hero element (anticipation)
  word_stagger_frames: 3,
  word_in_frames: 6,
  decode_char_stagger_frames: 1.2,
  decode_scramble_frames: 5,
  decode_jitter_frames: 2,
  decode_glyph_hold_frames: 2, // how long one random glyph stays before swapping
  type_char_frames: 1,
  count_frames: 26,
  fade_frames: 12,
  strike_frames: 10,
  exit_frames: 10, // dim/flicker-out at the scene tail
  min_hold_frames: 24, // minimum still time after the last reveal
  reading_wpm: 260,
};

function words(text) {
  return String(text).trim().split(/\s+/).filter(Boolean);
}
function chars(text) {
  return Array.from(String(text));
}

/** Natural (uncompressed) duration of a reveal, in frames. */
function revealDuration(reveal, text, m) {
  switch (reveal) {
    case 'glitch':
      return m.label_in_frames;
    case 'words':
      return Math.max(0, words(text).length - 1) * m.word_stagger_frames + m.word_in_frames;
    case 'decode':
      return Math.ceil(Math.max(0, chars(text).length - 1) * m.decode_char_stagger_frames) + m.decode_scramble_frames + m.decode_jitter_frames;
    case 'type':
      return chars(text).length * m.type_char_frames + 2;
    case 'count':
      return m.count_frames;
    case 'fade':
      return m.fade_frames;
    case 'strike':
      return Math.max(0, words(text).length - 1) * m.word_stagger_frames + m.word_in_frames + m.strike_frames;
    default:
      return m.fade_frames;
  }
}

/** Flatten a scene's slots into an ordered element list. */
export function sceneElements(scene) {
  const tpl = TEMPLATES[scene.template];
  if (!tpl) throw new Error(`Unknown template "${scene.template}" in scene ${scene.id}`);
  const out = [];
  for (const slot of tpl.slots) {
    const v = scene.slots?.[slot];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    const reveal = scene.reveal?.[slot] ?? SLOT_DEFAULTS[slot].reveal;
    const role = SLOT_DEFAULTS[slot].role;
    if (slot === 'parts') {
      v.forEach((p, i) => {
        const part = typeof p === 'string' ? { role: 'setup', text: p } : p;
        const r = part.role || 'setup';
        out.push({ slot, index: i, last: i === v.length - 1, text: String(part.text ?? ''), reveal: part.reveal || ROLE_REVEAL[r] || 'words', role: r, accent: !!part.accent, hero: r === 'headline' });
      });
    } else if (Array.isArray(v)) {
      v.forEach((text, i) => out.push({ slot, index: i, last: i === v.length - 1, text: String(text), reveal, role }));
    } else if (slot === 'logo') {
      out.push({ slot, index: 0, last: true, text: '', reveal, role, src: v === true ? null : String(v) });
    } else {
      out.push({ slot, index: 0, last: true, text: String(v), reveal, role });
    }
  }
  return out;
}

export function wordCount(scene) {
  return sceneElements(scene).reduce((n, e) => n + words(e.text).length, 0);
}

/**
 * Build the timeline.
 * @returns {{elements: object[], events: object[], exitStart: number, lastRevealEnd: number, compression: number, overflow: boolean}}
 */
export function buildTimeline(scene, motionTokens, fps) {
  const m = { ...DEFAULT_MOTION, ...(motionTokens || {}) };
  const duration = scene.durationInFrames;
  const exitStart = duration - m.exit_frames;
  const els = sceneElements(scene);

  // 1. natural schedule
  let cursor = m.scene_lead_in_frames;
  els.forEach((el, i) => {
    const prev = els[i - 1];
    let start = cursor;
    if (prev) {
      start = prev.reveal === 'glitch' ? prev._end - m.label_overlap_frames : prev._end + m.gap_frames;
      if (el.slot === 'headline' || el.slot === 'after' || el.slot === 'value' || el.hero) start += m.headline_gap_frames;
      if (el.slot === prev.slot && (el.slot === 'lines' || el.slot === 'items')) start = prev._end + Math.round(m.gap_frames * 1.6);
    }
    if (scene.timing?.[el.slot]?.delay_frames) start += scene.timing[el.slot].delay_frames;
    el._start = start;
    el._dur = revealDuration(el.reveal, el.text, m);
    el._end = start + el._dur;
    cursor = el._end;
  });

  // 2. reading-time hold and compression
  const readingFrames = Math.ceil((wordCount(scene) / m.reading_wpm) * 60 * fps);
  // The reveal itself is read as it happens; after it, hold long enough that the whole frame
  // has been on screen for ~80% of its reading time, and never less than min_hold_frames.
  const hold = Math.max(m.min_hold_frames, Math.round(readingFrames * 0.8) - (cursor - m.scene_lead_in_frames));
  const budget = exitStart - hold - m.scene_lead_in_frames;
  const natural = cursor - m.scene_lead_in_frames;
  let k = 1;
  if (natural > budget && natural > 0) k = Math.max(0.35, budget / natural);
  const overflow = natural * k > budget + 0.5;

  const S = (f) => Math.round(m.scene_lead_in_frames + (f - m.scene_lead_in_frames) * k);
  const D = (d) => Math.max(1, Math.round(d * k));

  const events = [{ type: 'scene_in', frame: 0 }];
  const elements = els.map((el) => {
    const start = S(el._start);
    const dur = D(el._dur);
    const e = { slot: el.slot, index: el.index, last: el.last, text: el.text, reveal: el.reveal, role: el.role, src: el.src, accent: el.accent, hero: el.hero, start, end: start + dur };
    const key = `${scene.id}|${el.slot}|${el.index}`;
    if (el.reveal === 'words' || el.reveal === 'strike') {
      const ws = words(el.text);
      const st = m.word_stagger_frames * k;
      e.words = ws.map((w, i) => ({ text: w, in: Math.round(start + i * st) }));
      e.wordIn = D(m.word_in_frames);
      e.words.forEach((w) => events.push({ type: 'word_in', frame: w.in, slot: el.slot }));
      if (el.reveal === 'strike') {
        e.strikeStart = e.end - D(m.strike_frames);
        events.push({ type: 'strike', frame: e.strikeStart, slot: el.slot });
      }
    } else if (el.reveal === 'decode') {
      const cs = chars(el.text);
      e.chars = cs.map((ch, i) => {
        const cStart = Math.round(start + i * m.decode_char_stagger_frames * k);
        const jitter = Math.floor(rand(key, i, 'j') * (m.decode_jitter_frames + 1));
        return { ch, start: cStart, resolve: cStart + D(m.decode_scramble_frames) + jitter };
      });
      e.glyphHold = m.decode_glyph_hold_frames;
      e.land = e.chars.reduce((a, c) => Math.max(a, c.resolve), start);
      e.end = Math.max(e.end, e.land);
      events.push({ type: 'decode_start', frame: start, slot: el.slot, chars: cs.length });
      events.push({ type: 'decode_land', frame: e.land, slot: el.slot, hero: el.slot === 'headline' || el.slot === 'after' || !!el.hero || (el.slot === 'lines' && el.last) });
    } else if (el.reveal === 'type') {
      const cs = chars(el.text);
      const per = m.type_char_frames * k;
      e.typeChars = cs.length;
      e.typePer = per;
      cs.forEach((ch, i) => {
        if (ch !== ' ') events.push({ type: 'type_char', frame: Math.round(start + i * per), slot: el.slot });
      });
      events.push({ type: 'type_done', frame: e.end, slot: el.slot });
    } else if (el.reveal === 'count') {
      for (let f = start; f < e.end; f += 3) events.push({ type: 'count_tick', frame: f, slot: el.slot });
      events.push({ type: 'count_land', frame: e.end, slot: el.slot });
    } else if (el.reveal === 'glitch') {
      events.push({ type: 'label_in', frame: start, slot: el.slot });
    } else {
      events.push({ type: el.slot === 'logo' ? 'logo_in' : 'fade_in', frame: start, slot: el.slot });
    }
    return e;
  });

  const lastRevealEnd = elements.reduce((a, e) => Math.max(a, e.end), 0);
  events.push({ type: 'exit', frame: exitStart });
  events.sort((a, b) => a.frame - b.frame);
  return { elements, events, exitStart, lastRevealEnd, compression: k, overflow, readingFrames, holdFrames: exitStart - lastRevealEnd };
}
