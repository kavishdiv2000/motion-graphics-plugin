// DESIGN.md + CHOREOGRAPHY.md + CONTENT.md  ->  spec.json (+ validation issues + audio cues)
// The spec is the ONLY thing the renderer reads. Every decision is resolved here, so a render is
// a pure function of the spec.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATES, TEMPLATE_NAMES } from '../../src/lib/templates.js';
import { buildTimeline, sceneElements, DEFAULT_MOTION } from '../../src/lib/timeline.js';
import { unitFor, resolveSize, contentBox, contrast } from '../../src/lib/layout.js';

const BUILTIN_METRICS = JSON.parse(readFileSync(new URL('../../src/lib/font-metrics.json', import.meta.url), 'utf8'));
/** Built-in metrics + the workspace's custom font metrics (.motion-graphics/assets/fonts/metrics.json, written by `mg font add`). */
function loadMetrics(baseDir) {
  const f = baseDir && join(baseDir, 'assets', 'fonts', 'metrics.json');
  return f && existsSync(f) ? { ...BUILTIN_METRICS, ...JSON.parse(readFileSync(f, 'utf8')) } : BUILTIN_METRICS;
}
import { allSfxIds } from './sfx.mjs';

const BEAT_SLOTS = ['label', 'setup', 'headline', 'tail', 'lines', 'items', 'value', 'before', 'after', 'cta', 'logo', 'parts', 'prefix', 'suffix'];
const SLOT_ROLE = { label: 'label', setup: 'setup', headline: 'headline', tail: 'tail', lines: 'line', items: 'item', value: 'stat', before: 'setup', after: 'headline', cta: 'cta' };
const FAMILY_FALLBACK = { display: 'sans-serif', body: 'sans-serif', mono: 'monospace' };

function issue(list, level, code, message, where = {}, fix = null) {
  list.push({ level, code, message, ...where, fix });
}

function resolveColor(design, token, issues, where) {
  if (!token) return null;
  if (/^#[0-9a-f]{6}$/i.test(token)) return token.toUpperCase();
  const c = design.colors?.[token];
  if (!c) { issue(issues, 'error', 'color.unknown', `Unknown colour token "${token}"`, where, `Use one of: ${Object.keys(design.colors || {}).filter((k) => k !== 'rules').join(', ')}`); return '#FF00FF'; }
  return String(c).toUpperCase();
}

function applyCase(text, kase) {
  if (kase === 'upper') return String(text).toUpperCase();
  if (kase === 'lower') return String(text).toLowerCase();
  return String(text);
}

/** Resolve DESIGN.md tokens for one output format. */
// `baseDir` = the .motion-graphics/ folder: every asset path in DESIGN.md (logo, fonts, music) is relative to it.
export function resolveDesign(design, formatName, issues, baseDir) {
  const METRICS = loadMetrics(baseDir);
  const fmt = design.canvas?.formats?.[formatName];
  if (!fmt) throw new Error(`Format "${formatName}" not defined in DESIGN.md canvas.formats (have: ${Object.keys(design.canvas?.formats || {}).join(', ')})`);
  const colors = {};
  for (const [k, v] of Object.entries(design.colors || {})) if (k !== 'rules') colors[k] = String(v).toUpperCase();
  const fams = design.typography?.families || {};
  const roles = {};
  for (const [name, r] of Object.entries(design.typography?.roles || {})) {
    const fam = fams[r.family] || {};
    const famName = fam.family || r.family;
    const met = METRICS[`${famName}|${r.weight || 400}`] || METRICS[`${famName}|400`];
    if (!met) issue(issues, 'warn', 'font.metrics', `No glyph metrics for ${famName} ${r.weight || 400} — fitting falls back to avg_char_width_em`, { where: `typography.roles.${name}` }, 'Register the font: node .motion-graphics/mg.mjs font add <file> "<Family>" <weight>');
    roles[name] = {
      ...r,
      family_name: famName,
      fontFamily: `"${famName}", ${FAMILY_FALLBACK[r.family] || 'sans-serif'}`,
      avg_char_width_em: met?.avg_upper_em ?? fam.avg_char_width_em ?? 0.6,
      advances: met?.advances || null,
      color: resolveColor(design, r.color, issues, { where: `typography.roles.${name}` }),
      line_height: r.line_height ?? 1.1,
      tracking_em: r.tracking_em ?? 0,
    };
  }
  const logoPath = design.brand?.logo?.primary;
  const logoExists = logoPath && baseDir && existsSync(join(baseDir, logoPath));
  if (logoPath && !logoExists) issue(issues, 'info', 'brand.logo', `Logo ${logoPath} not found in .motion-graphics/ — the end card uses the wordmark "${design.brand?.logo?.wordmark_fallback || design.brand?.name}"`, {}, 'Put the logo at .motion-graphics/' + logoPath);
  // custom font files shipped with the workspace (typography.families.<x>.file: assets/fonts/X.woff2)
  const fontFaces = [];
  for (const [key, fam] of Object.entries(fams)) {
    if (!fam.file) continue;
    if (!baseDir || !existsSync(join(baseDir, fam.file))) { issue(issues, 'error', 'font.file', `typography.families.${key}.file "${fam.file}" not found in .motion-graphics/`); continue; }
    for (const w of fam.weights || [400]) fontFaces.push({ family: fam.family, weight: w, src: fam.file });
  }
  const mt = design.motion || {};
  return {
    id: design.id,
    name: design.name,
    format: formatName,
    width: fmt.width,
    height: fmt.height,
    fps: design.canvas?.fps || 30,
    safe_area: design.canvas?.safe_area?.[formatName] || { top: 0.08, bottom: 0.1, left: 0.07, right: 0.07 },
    layout: (() => {
      const { per_format, ...base } = design.layout || {};
      return { anchor: 'left', vertical_align: 'center', text_max_width: 0.84, block_offset_y: 0, stack_gap_em: 0.18, type_scale: 1, ...base, ...(per_format?.[formatName] || {}) };
    })(),
    brand: { name: design.brand?.name, url: design.brand?.url, wordmark: design.brand?.logo?.wordmark_fallback || design.brand?.name, logo: logoExists ? logoPath : null },
    colors,
    roles,
    fontFaces,
    texture: design.texture || {},
    motion: {
      timing: { ...DEFAULT_MOTION, ...(mt.timing || {}) },
      easing: mt.easing || { enter: [0.16, 1, 0.3, 1], exit: [0.7, 0, 0.84, 0], standard: [0.65, 0, 0.35, 1] },
      scramble_charset: mt.scramble_charset || '!<>-_\\/[]{}=+*^?#',
      word_in: { blur_px: 8, rise_px: 10, ...(mt.word_in || {}), pending_color: resolveColor(design, mt.word_in?.pending_color || 'text_muted', issues, { where: 'motion.word_in' }) },
      scene: { default_duration_s: 4.4, min_duration_s: 2.4, max_duration_s: 7, transition: 'glitch_cut', transition_frames: 6, ...(mt.scene || {}) },
      camera: { drift_scale: 0.02, shake_on_land_px: 0, ...(mt.camera || {}) },
      rhythm: { snap_scene_to_beat: true, land_on_beat: false, ...(mt.rhythm || {}) },
    },
    accessibility: design.accessibility || {},
    export: design.export || {},
  };
}

/**
 * Compile.
 * @returns {{spec: object, issues: object[], cues: object[]}}
 */
export function compile({ design, choreo, content, baseDir, formatOverride, jobId }) {
  const issues = [];
  const D = design.frontmatter;
  const C = choreo.frontmatter;
  const T = content.frontmatter;
  if (!D.schema?.startsWith('motion-design/')) issue(issues, 'warn', 'schema.design', 'DESIGN.md front matter has no `schema: motion-design/1.x`');
  if (!C.schema?.startsWith('motion-choreography/')) issue(issues, 'warn', 'schema.choreo', 'CHOREOGRAPHY.md front matter has no `schema: motion-choreography/1.x`');
  if (!T.schema?.startsWith('motion-content/')) issue(issues, 'warn', 'schema.content', 'CONTENT.md front matter has no `schema: motion-content/1.x`');

  const formatName = formatOverride || C.format || D.canvas?.default_format || 'vertical';
  const R = resolveDesign(D, formatName, issues, baseDir);
  const fps = R.fps;
  const bpm = C.music?.bpm ?? D.audio?.music?.bpm ?? 100;
  const beatFrames = (fps * 60) / bpm;
  const unit = unitFor(R.width, R.height) * (R.layout.type_scale || 1);
  const box = contentBox(R, R.width, R.height);

  // ---- colour contrast
  const bg = R.colors.background;
  const minCR = D.colors?.rules?.min_contrast_ratio ?? 4.5;
  for (const [name, role] of Object.entries(R.roles)) {
    if (!role.color || !bg) continue;
    const cr = contrast(role.color, bg);
    if (cr < minCR) issue(issues, 'warn', 'a11y.contrast', `Role "${name}" colour ${role.color} on ${bg} has contrast ${cr.toFixed(2)} (< ${minCR})`, { where: `typography.roles.${name}` });
  }

  // ---- beats
  const beats = new Map(content.records.map((b) => [b.id, b]));
  const usedBeats = new Set();
  const scenesIn = choreo.records;
  if (!scenesIn.length) issue(issues, 'error', 'choreo.empty', 'CHOREOGRAPHY.md has no scene blocks (```yaml with an `id`)');

  const rotation = D.colors?.rules?.accent_rotation || ['accent_red'];
  let rot = 0;
  let from = 0;
  const scenes = [];
  scenesIn.forEach((s, idx) => {
    const where = { scene: s.id };
    const template = s.template || 'statement';
    if (!TEMPLATES[template]) { issue(issues, 'error', 'scene.template', `Unknown template "${template}"`, where, `Use one of: ${TEMPLATE_NAMES.join(', ')}`); return; }
    const beat = beats.get(String(s.beat ?? s.id));
    if (!beat) { issue(issues, 'error', 'scene.beat', `Beat "${s.beat}" not found in CONTENT.md`, where, 'Add a ```yaml block with that id to CONTENT.md, or fix the `beat:` reference'); return; }
    usedBeats.add(beat.id);

    // duration
    let frames;
    if (s.beats) frames = Math.round(s.beats * beatFrames);
    else frames = Math.round((s.duration_s ?? R.motion.scene.default_duration_s) * fps);
    if (R.motion.rhythm.snap_scene_to_beat) frames = Math.max(1, Math.round(frames / beatFrames)) * Math.round(beatFrames * 1000) / 1000;
    frames = Math.round(frames);
    const minF = Math.round(R.motion.scene.min_duration_s * fps), maxF = Math.round(R.motion.scene.max_duration_s * fps);
    if (frames < minF) { issue(issues, 'warn', 'scene.short', `Scene is ${(frames / fps).toFixed(2)} s, below min ${R.motion.scene.min_duration_s} s — clamped`, where); frames = minF; }
    if (frames > maxF && template !== 'endcard') issue(issues, 'warn', 'scene.long', `Scene is ${(frames / fps).toFixed(2)} s, above max ${R.motion.scene.max_duration_s} s`, where, 'Split the beat into two scenes');

    // slots (case + formats applied)
    const slots = {};
    for (const k of BEAT_SLOTS) if (beat[k] !== undefined && beat[k] !== null) slots[k] = beat[k];
    const num = String(idx + 1).padStart(2, '0');
    if (slots.label) {
      const fmt = R.roles.label?.format || '{text}';
      const txt = applyCase(slots.label, R.roles.label?.case);
      slots.label = C.label_numbering === false ? fmt.replace('{nn} // ', '').replace('{text}', txt) : fmt.replace('{nn}', num).replace('{text}', txt);
    }
    if (slots.cta) slots.cta = (R.roles.cta?.format || '{text}').replace('{text}', applyCase(slots.cta, R.roles.cta?.case));
    for (const k of ['setup', 'headline', 'tail', 'before', 'after']) if (typeof slots[k] === 'string') slots[k] = applyCase(slots[k], R.roles[SLOT_ROLE[k]]?.case);
    if (Array.isArray(slots.lines)) slots.lines = slots.lines.map((l) => applyCase(l, R.roles.line?.case));
    if (slots.value !== undefined) slots.value = applyCase(String(slots.value), R.roles.stat?.case);
    if (Array.isArray(slots.parts)) slots.parts = slots.parts.map((p) => (typeof p === 'string' ? { role: 'setup', text: p } : { ...p, text: applyCase(p.text, R.roles[p.role || 'setup']?.case) }));
    for (const req of TEMPLATES[template].required) if (slots[req] === undefined) issue(issues, 'error', 'slot.missing', `Template "${template}" requires slot "${req}" (beat ${beat.id})`, where);

    // emphasis -> accent
    let accent = null;
    const emph = s.emphasis ?? C.emphasis_default ?? 'auto';
    const hasMark = Array.isArray(slots.parts) && slots.parts.some((p) => p.accent);
    if (emph && emph !== 'none') {
      const token = emph === 'auto' ? (hasMark || beat.turn ? rotation[rot++ % rotation.length] : null) : emph;
      if (token) accent = { color: resolveColor(D, token, issues, where), token, target: TEMPLATES[template].accentSlot };
    }

    const scene = {
      id: s.id, index: idx, number: num, title: s._heading || s.id, template, beat: beat.id,
      from, durationInFrames: frames, slots, reveal: { ...(D.motion?.reveal_defaults || {}), ...(s.reveal || {}) }, timing: s.timing || {},
      accent, transitionOut: s.transition_out || R.motion.scene.transition, notes: s.notes || null,
    };
    scenes.push(scene);
    from += frames;
  });
  scenes.forEach((sc, i) => { sc.transitionIn = i === 0 ? 'open' : scenes[i - 1].transitionOut; });

  for (const b of beats.keys()) if (!usedBeats.has(b)) issue(issues, 'warn', 'beat.unused', `Beat "${b}" in CONTENT.md is not used by any scene`);

  // ---- per-element checks (length, fit, timing)
  const durationInFrames = from;
  for (const sc of scenes) {
    const where = { scene: sc.id };
    const els = sceneElements(sc);
    for (const el of els) {
      if (el.slot === 'logo') continue;
      const roleName = el.slot === 'parts' ? el.role : SLOT_ROLE[el.slot];
      const role = R.roles[roleName];
      if (!role) continue;
      const nChars = Array.from(el.text).length;
      if (role.max_chars && nChars > role.max_chars) issue(issues, roleName === 'headline' || roleName === 'stat' ? 'error' : 'warn', 'copy.length', `${el.slot}${el.slot === 'parts' || Array.isArray(sc.slots[el.slot]) ? `[${el.index}]` : ''} "${el.text}" is ${nChars} chars (max ${role.max_chars} for role ${roleName})`, where, 'Rewrite shorter — never shrink type to make bad copy fit');
      if (role.advances) {
        const missing = [...new Set(Array.from(el.text).filter((ch) => ch !== ' ' && role.advances[ch] === undefined))];
        if (missing.length) issue(issues, 'warn', 'font.glyph', `"${missing.join('')}" not in ${role.family_name} — will render in a fallback font`, where, 'Replace the character (e.g. → with //, curly quotes with straight ones) or add a font subset that has it');
      }
      const sizeMul = sc.template === 'title' && roleName === 'headline' ? TEMPLATES.title.headlineScale : 1;
      const r = resolveSize(el.text, role, unit, box.width, sizeMul);
      const fit = role.fit || (role.min_scale ? 'shrink' : 'wrap');
      if (!r.ok && fit === 'fill') issue(issues, 'error', 'copy.fit', `"${el.text}" would need ${(r.fontSize / unit).toFixed(0)}px to fit the column (min ${role.min_px}px for role ${roleName})`, where, 'Shorten the line or split it across two scenes');
      else if (!r.ok && fit === 'shrink') issue(issues, 'error', 'copy.fit', `"${el.text}" needs ${(r.scale * 100).toFixed(0)}% scale to fit (min ${(role.min_scale * 100).toFixed(0)}%)`, where, `Shorten to ~${Math.floor(nChars * r.scale / role.min_scale)} chars`);
      else if (!r.ok) issue(issues, 'warn', 'copy.wrap', `"${el.text}" wraps to ~${r.lines} lines`, where, `Keep ${roleName} copy to ${role.max_lines ?? 2} lines`);
    }
    const tl = buildTimeline(sc, R.motion.timing, fps);
    sc._hold = tl.holdFrames;
    if (tl.overflow) issue(issues, 'error', 'timing.overflow', `Reveals do not fit in ${(sc.durationInFrames / fps).toFixed(2)} s even at max compression`, where, 'Increase duration_s or cut copy');
    else if (tl.compression < 0.8) issue(issues, 'warn', 'timing.compressed', `Reveals compressed to ${(tl.compression * 100).toFixed(0)}% speed to fit`, where, `Raise duration_s to ~${((sc.durationInFrames / fps) / tl.compression).toFixed(1)}`);
    if (tl.holdFrames < Math.round(0.6 * fps)) issue(issues, 'warn', 'timing.hold', `Only ${(tl.holdFrames / fps).toFixed(2)} s of stillness before exit`, where, 'Viewers need ≥0.6 s to read the landed frame');
    if (sc.index === 0) {
      const hero = tl.elements.find((e) => e.reveal === 'decode' || e.slot === 'headline');
      if (hero && hero.end > 1.5 * fps) issue(issues, 'warn', 'hook.slow', `Hook hero lands at ${(hero.end / fps).toFixed(2)} s (target ≤ 1.5 s)`, where, 'Shorten the setup or start with the hero');
    }
  }

  // ---- whole-video checks
  const total = durationInFrames / fps;
  if (C.target_duration_s && Math.abs(total - C.target_duration_s) / C.target_duration_s > 0.15) issue(issues, 'warn', 'video.duration', `Total ${total.toFixed(1)} s vs target ${C.target_duration_s} s (>15% off)`);
  const maxes = D.export?.max_duration_s || {};
  for (const p of T.platforms || []) if (maxes[p] && total > maxes[p]) issue(issues, 'error', 'platform.duration', `${total.toFixed(1)} s exceeds ${p} max ${maxes[p]} s`);
  if (scenes.length && scenes[scenes.length - 1].template !== 'endcard') issue(issues, 'warn', 'structure.endcard', 'Last scene is not an endcard — the video has no branded close or CTA');
  for (const c of T.claims || []) if (c.type === 'statistic' && !c.source) issue(issues, 'error', 'claim.source', `Statistic "${c.text}" has no source`, {}, 'Add `source:` or mark it rhetorical');
  const flashes = scenes.filter((s) => s.transitionOut === 'flash_cut').length;
  if (flashes / Math.max(1, total) > (D.accessibility?.max_flashes_per_second ?? 3)) issue(issues, 'error', 'a11y.flash', 'Too many flash transitions per second');

  // ---- sfx map sanity
  const map = D.audio?.sfx?.map || {};
  const SFX_IDS = allSfxIds();
  for (const [ev, id] of Object.entries(map)) if (id && !SFX_IDS.includes(id)) issue(issues, 'error', 'sfx.unknown', `audio.sfx.map.${ev} = "${id}" is not in the SFX library`);

  // ---- global audio cues (scene-relative events -> absolute frames)
  const cues = [];
  scenes.forEach((sc, i) => {
    const tl = buildTimeline(sc, R.motion.timing, fps);
    for (const e of tl.events) cues.push({ ...e, frame: sc.from + e.frame, scene: sc.id });
    if (i > 0 && ['glitch_cut', 'flash_cut'].includes(sc.transitionIn)) cues.push({ type: 'transition', frame: sc.from, scene: sc.id });
  });
  // extra sounds requested by choreography scene blocks (`sfx: [{id, at_s, gain_db}]`)
  scenesIn.forEach((s) => {
    const sc = scenes.find((x) => x.id === s.id);
    if (sc && Array.isArray(s.sfx)) for (const x of s.sfx) {
      if (!SFX_IDS.includes(x.id)) issue(issues, 'error', 'sfx.unknown', `Scene sfx "${x.id}" not in library`, { scene: s.id });
      cues.push({ type: 'manual', id: x.id, frame: sc.from + Math.round((x.at_s || 0) * fps), gain_db: x.gain_db || 0, scene: s.id });
    }
  });
  cues.sort((a, b) => a.frame - b.frame);

  const energy = C.music?.energy_curve || [];
  const spec = {
    schema: 'motion-spec/1.0',
    meta: {
      id: jobId || C.id || 'video', title: C.title || T.id || 'Untitled', objective: C.objective || T.objective || null,
      format: formatName, width: R.width, height: R.height, fps, durationInFrames, durationS: +(durationInFrames / fps).toFixed(3), bpm,
      cta: T.cta || null, platforms: T.platforms || [],
    },
    design: R,
    scenes: scenes.map(({ _hold, ...s }) => s),
    audio: {
      src: null,
      music: { ...(D.audio?.music || {}), ...Object.fromEntries(Object.entries(C.music || {}).filter(([, v]) => v !== null && v !== undefined)), energy: scenes.map((s, i) => ({ startS: s.from / fps, endS: (s.from + s.durationInFrames) / fps, energy: energy[i] ?? 0.7 })) },
      sfx: D.audio?.sfx || {},
      master: D.audio?.master || { lufs_target: -14, true_peak_db: -1 },
      sample_rate: D.audio?.sample_rate || 48000,
    },
  };
  return { spec, issues, cues };
}

export function formatIssues(issues) {
  if (!issues.length) return 'No issues. ✔';
  const icon = { error: '✖', warn: '▲', info: '·' };
  return issues
    .map((i) => `${icon[i.level]} [${i.level}] ${i.scene ? `${i.scene} ` : ''}${i.code}: ${i.message}${i.fix ? `\n    fix → ${i.fix}` : ''}`)
    .join('\n');
}
