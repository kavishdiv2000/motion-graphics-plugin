// The production pipeline, operating on a session folder inside .motion-graphics/sessions/<id>/.
//   build  : DESIGN.md + CHOREOGRAPHY.md + CONTENT.md → validate → build/spec.<fmt>.json + build/mix.<fmt>.wav
//   stills : contact sheet of the composition (mid-reveal + landed frame per scene) → build/contact-<fmt>.png
//   render : MP4 → output/<id>-<fmt>.mp4   (previews → build/preview-<fmt>.mp4)
//   qa     : probe + loudness + contact sheet → build/qa.<fmt>.json
//   post   : output/POST.md (files, post copy, QA verdict) + output/thumb-<fmt>.png
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { readMd } from './md.mjs';
import { compile, formatIssues } from './compile.mjs';
import { buildMix } from './mix.mjs';
import { wavBuffer } from './dsp.mjs';
import { setCustomSfxDir } from './sfx.mjs';
import { buildTimeline } from '../../src/lib/timeline.js';
import { ENGINE_ROOT, designFor, prepareStage, writeSession, readSession, rel } from './workspace.mjs';

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const chromiumOptions = { gl: 'angle' };
const mtime = (f) => (existsSync(f) ? statSync(f).mtimeMs : 0);

function guessFormat(sp) {
  if (!existsSync(sp.choreo)) return 'vertical';
  const m = readFileSync(sp.choreo, 'utf8').match(/^format:\s*([a-z]+)/m);
  return m ? m[1] : 'vertical';
}

function requireInputs(p, sp) {
  const design = designFor(p, sp);
  const missing = [];
  if (!existsSync(design)) missing.push(`DESIGN.md (${rel(p, design)}) — create it with the design-md skill: node .motion-graphics/mg.mjs design new`);
  if (!existsSync(sp.content)) missing.push(`CONTENT.md (${rel(p, sp.content)})`);
  if (!existsSync(sp.choreo)) missing.push(`CHOREOGRAPHY.md (${rel(p, sp.choreo)})`);
  if (missing.length) throw new Error(`Missing input(s):\n  - ${missing.join('\n  - ')}`);
  return design;
}

/** Validate + spec + audio for one format. */
export async function buildSession(p, sp, { format, validateOnly = false, noAudio = false, strict = false } = {}) {
  const designPath = requireInputs(p, sp);
  setCustomSfxDir(join(p.assets, 'sfx'));
  const { spec, issues, cues } = compile({
    design: readMd(designPath), choreo: readMd(sp.choreo), content: readMd(sp.content),
    baseDir: p.mg, formatOverride: format || null, jobId: sp.id,
  });
  const fmt = spec.meta.format;
  spec.meta.session = sp.id;
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  mkdirSync(sp.build, { recursive: true });
  const report = [
    `# Build report — ${spec.meta.title} (${sp.id}, ${fmt})`, '',
    `- design: ${rel(p, designPath)}`,
    `- ${spec.meta.width}×${spec.meta.height} @ ${spec.meta.fps} fps · ${spec.meta.durationS} s · ${spec.scenes.length} scenes · ${spec.meta.bpm} BPM`,
    `- errors: ${errors.length} · warnings: ${warns.length}`, '',
    '## Scenes', '| # | id | template | start s | dur s | accent | transition in |', '|---|---|---|---|---|---|---|',
    ...spec.scenes.map((s) => `| ${s.number} | ${s.id} | ${s.template} | ${(s.from / spec.meta.fps).toFixed(2)} | ${(s.durationInFrames / spec.meta.fps).toFixed(2)} | ${s.accent?.token || '—'} | ${s.transitionIn} |`),
    '', '## Issues', '```', formatIssues(issues), '```',
  ].join('\n');
  writeFileSync(join(sp.build, `report.${fmt}.md`), report);
  console.log(formatIssues(issues));
  if (errors.length || (strict && warns.length)) {
    writeSession(sp, { status: 'draft', last_error: `${errors.length} validation error(s) (${fmt})` }, `build ${fmt}: ${errors.length} errors`);
    console.error(`\n✖ ${errors.length} error(s)${strict ? `, ${warns.length} warning(s) [strict]` : ''}. Fix the markdown and rebuild. Report: ${rel(p, join(sp.build, `report.${fmt}.md`))}`);
    return { ok: false, spec, issues };
  }
  if (validateOnly) { console.log('\n✔ valid'); return { ok: true, spec, issues }; }
  if (!noAudio) {
    const t0 = Date.now();
    const { channels, report: ar, hits } = buildMix(spec, cues, { musicFileResolver: (f) => join(p.mg, f) });
    writeFileSync(join(sp.build, `mix.${fmt}.wav`), wavBuffer(channels, ar.sample_rate));
    spec.audio.src = `audio/mix.${fmt}.wav`;
    spec.audio.report = ar;
    writeFileSync(join(sp.build, `cues.${fmt}.json`), JSON.stringify(hits, null, 1));
    console.log(`\n♪ audio: ${hits.length} SFX hits · ${ar.lufs_integrated} LUFS · ${ar.true_peak_dbtp} dBTP · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  const specPath = join(sp.build, `spec.${fmt}.json`);
  writeFileSync(specPath, JSON.stringify(spec, null, 1));
  writeFileSync(join(ENGINE_ROOT, 'src', 'studio-spec.json'), JSON.stringify(spec)); // `mg studio` previews the last build
  const cur = readSession(sp);
  writeSession(sp, { status: ['rendered', 'done'].includes(cur.status) ? cur.status : 'validated', formats: [...new Set([...(cur.formats || []), fmt])], last_error: null }, `build ${fmt}: ok (${warns.length} warnings)`);
  console.log(`✔ spec → ${rel(p, specPath)}  (${spec.meta.durationS} s, ${spec.meta.durationInFrames} frames)`);
  return { ok: true, spec, issues, specPath };
}

/** Load the spec for a format, rebuilding when any input is newer. */
export async function ensureSpec(p, sp, format) {
  const fmt = format || guessFormat(sp);
  const specPath = join(sp.build, `spec.${fmt}.json`);
  const newest = Math.max(mtime(sp.content), mtime(sp.choreo), mtime(designFor(p, sp)));
  if (!existsSync(specPath) || mtime(specPath) < newest || !existsSync(join(sp.build, `mix.${fmt}.wav`))) {
    const r = await buildSession(p, sp, { format: fmt });
    if (!r.ok) throw new Error('Build failed — fix the issues above first.');
  }
  return JSON.parse(readFileSync(specPath, 'utf8'));
}

async function bundleFor(p, sp) {
  const publicDir = prepareStage(p, sp);
  return bundle({ entryPoint: join(ENGINE_ROOT, 'src/index.ts'), publicDir, onProgress: () => {} });
}

function defaultShots(spec) {
  const shots = [];
  for (const s of spec.scenes) {
    const tl = buildTimeline(s, spec.design.motion.timing, spec.meta.fps);
    const hero = tl.elements.find((e) => e.reveal === 'decode') || tl.elements[tl.elements.length - 1];
    if (hero) shots.push({ frame: s.from + Math.round((hero.start + hero.end) / 2), label: `${s.number}-mid` });
    shots.push({ frame: s.from + Math.min(s.durationInFrames - 1, tl.lastRevealEnd + 6), label: `${s.number}-land` });
  }
  return shots;
}

/** Contact sheet (always) + optional full-size stills. */
export async function stillsSession(p, sp, { format, frames, cols, separate = false, scale = 0.5, serveUrl } = {}) {
  const spec = await ensureSpec(p, sp, format);
  const fmt = spec.meta.format;
  const shots = frames ? String(frames).split(',').map((f) => ({ frame: Number(f), label: `f${f}` })) : defaultShots(spec);
  serveUrl = serveUrl || (await bundleFor(p, sp));
  if (separate) {
    const dir = join(sp.build, 'stills', fmt);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const composition = await selectComposition({ serveUrl, id: 'Main', inputProps: spec, browserExecutable });
    for (const sh of shots) await renderStill({ composition, serveUrl, output: join(dir, `${sh.label}.png`), frame: sh.frame, inputProps: spec, scale, browserExecutable, chromiumOptions });
    console.log(`✔ ${shots.length} stills → ${rel(p, dir)}`);
  }
  const props = { spec, shots, cols: Math.min(shots.length, Number(cols || (spec.meta.width > spec.meta.height ? 3 : 7))) };
  const sheet = await selectComposition({ serveUrl, id: 'ContactSheet', inputProps: props, browserExecutable });
  const out = join(sp.build, `contact-${fmt}.png`);
  await renderStill({ composition: sheet, serveUrl, output: out, frame: 0, inputProps: props, browserExecutable, chromiumOptions });
  console.log(`✔ contact sheet → ${rel(p, out)}  (${shots.map((s) => `${s.label}@${s.frame}`).join(', ')})`);
  return { sheet: out, shots, serveUrl };
}

/** Render the MP4. */
export async function renderSession(p, sp, { format, scale = 1, frames, out, serveUrl } = {}) {
  const spec = await ensureSpec(p, sp, format);
  const fmt = spec.meta.format;
  const ex = spec.design.export || {};
  const preview = Number(scale) !== 1 || !!frames;
  out = out || (preview ? join(sp.build, `preview-${fmt}.mp4`) : join(sp.output, `${sp.id}-${fmt}.mp4`));
  mkdirSync(join(out, '..'), { recursive: true });
  const t0 = Date.now();
  serveUrl = serveUrl || (await bundleFor(p, sp));
  const composition = await selectComposition({ serveUrl, id: 'Main', inputProps: spec, browserExecutable });
  console.log(`▶ rendering ${spec.meta.title} · ${composition.width}×${composition.height} @${composition.fps} · ${composition.durationInFrames} frames${preview ? ' (preview)' : ''}`);
  let last = -1;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out, inputProps: spec,
    crf: ex.crf ?? 18, pixelFormat: ex.pixel_format || 'yuv420p',
    colorSpace: 'bt709', // TV-range BT.709 → yuv420p (not full-range yuvj420p), what social platforms expect
    audioCodec: 'aac', audioBitrate: ex.audio_bitrate || '320k',
    scale: Number(scale), frameRange: frames ? String(frames).split('-').map(Number) : null,
    browserExecutable, chromiumOptions,
    onProgress: ({ progress }) => {
      const q = Math.floor(progress * 10);
      if (q !== last) { last = q; process.stdout.write(`${q * 10}% `); }
    },
  });
  console.log(`\n✔ ${rel(p, out)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (!preview) {
    const cur = readSession(sp);
    const outputs = [...new Set([...(cur.outputs || []), rel(p, out)])];
    writeSession(sp, { status: 'rendered', outputs }, `render ${fmt}: ${basename(out)}`);
  }
  return { out, serveUrl, spec };
}

/** Thumbnail = landed frame of scene 1 (the hook). */
export async function thumbnailSession(p, sp, { format, serveUrl } = {}) {
  const spec = await ensureSpec(p, sp, format);
  const s0 = spec.scenes[0];
  const tl = buildTimeline(s0, spec.design.motion.timing, spec.meta.fps);
  serveUrl = serveUrl || (await bundleFor(p, sp));
  const composition = await selectComposition({ serveUrl, id: 'Main', inputProps: spec, browserExecutable });
  const out = join(sp.output, `thumb-${spec.meta.format}.png`);
  mkdirSync(sp.output, { recursive: true });
  await renderStill({ composition, serveUrl, output: out, frame: Math.min(s0.durationInFrames - 1, tl.lastRevealEnd + 6), inputProps: spec, browserExecutable, chromiumOptions });
  return out;
}

const remotionTool = (tool, args) => {
  const r = spawnSync('npx', ['--no-install', 'remotion', tool, ...args], { cwd: ENGINE_ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

/** Technical QA of a rendered file + fresh contact sheet. */
export async function qaSession(p, sp, { format, file, serveUrl } = {}) {
  const spec = await ensureSpec(p, sp, format);
  const fmt = spec.meta.format;
  file = file || join(sp.output, `${sp.id}-${fmt}.mp4`);
  if (!existsSync(file)) throw new Error(`${rel(p, file)} not found — render first: node .motion-graphics/mg.mjs render ${sp.id}${format ? ` --format ${format}` : ''}`);
  const checks = [];
  const check = (name, ok, detail, level = 'error') => checks.push({ name, ok, level: ok ? 'pass' : level, detail });
  const probe = remotionTool('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
  let info = {};
  try { info = JSON.parse(probe.out.slice(probe.out.indexOf('{'))); } catch { check('ffprobe', false, probe.out.slice(-300)); }
  const v = (info.streams || []).find((s) => s.codec_type === 'video') || {};
  const a = (info.streams || []).find((s) => s.codec_type === 'audio');
  const [fn, fd] = String(v.r_frame_rate || '0/1').split('/').map(Number);
  const dur = Number(info.format?.duration || v.duration || 0);
  check('video.codec', v.codec_name === 'h264', `codec ${v.codec_name}`);
  check('video.size', v.width === spec.meta.width && v.height === spec.meta.height, `${v.width}×${v.height} (spec ${spec.meta.width}×${spec.meta.height})`);
  check('video.fps', Math.abs(fn / fd - spec.meta.fps) < 0.01, `${(fn / fd).toFixed(2)} fps`);
  check('video.pix_fmt', v.pix_fmt === 'yuv420p', `pix_fmt ${v.pix_fmt} (yuv420p required by most social platforms)`);
  check('video.duration', Math.abs(dur - spec.meta.durationS) < 0.1, `${dur.toFixed(2)} s (spec ${spec.meta.durationS} s)`);
  check('audio.present', !!a, a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : 'no audio stream', spec.audio?.src ? 'error' : 'warn');
  if (a) {
    const ln = remotionTool('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
    const j = ln.out.match(/\{[\s\S]*"input_i"[\s\S]*?\}/);
    if (j) {
      const L = JSON.parse(j[0]);
      const target = spec.audio.master?.lufs_target ?? -14;
      const tp = spec.audio.master?.true_peak_db ?? -1;
      check('audio.loudness', Math.abs(Number(L.input_i) - target) <= 1, `${L.input_i} LUFS (target ${target} ±1)`, 'warn');
      check('audio.true_peak', Number(L.input_tp) <= tp + 0.5, `${L.input_tp} dBTP (ceiling ${tp})`, 'warn');
    } else check('audio.loudness', false, 'could not parse loudnorm output', 'warn');
  }
  const mb = statSync(file).size / 1e6;
  check('file.size', mb < 200, `${mb.toFixed(1)} MB`, 'warn');
  let sheet = null;
  try { ({ sheet } = await stillsSession(p, sp, { format: fmt, serveUrl })); check('contact_sheet', true, rel(p, sheet)); } catch (e) { check('contact_sheet', false, e.message.slice(0, 300), 'warn'); }
  const failed = checks.filter((c) => c.level === 'error');
  const warned = checks.filter((c) => c.level === 'warn');
  const verdict = failed.length ? 'FAIL' : warned.length ? 'PASS_WITH_WARNINGS' : 'PASS';
  const res = { verdict, file: rel(p, file), checks, contact_sheet: sheet && rel(p, sheet), next: 'Open the contact sheet and score it with the motion-qa rubric before delivering.' };
  writeFileSync(join(sp.build, `qa.${fmt}.json`), JSON.stringify(res, null, 2));
  for (const c of checks) console.log(`${c.level === 'pass' ? '✔' : c.level === 'warn' ? '▲' : '✖'} ${c.name}: ${c.detail}`);
  console.log(`\n${verdict} → ${rel(p, join(sp.build, `qa.${fmt}.json`))}`);
  writeSession(sp, { status: failed.length ? 'failed' : 'done', qa: { ...(readSession(sp).qa || {}), [fmt]: verdict } }, `qa ${fmt}: ${verdict}`);
  return res;
}

/** output/POST.md: what was delivered + post copy pulled from CONTENT.md. */
export function writePost(p, sp) {
  const s = readSession(sp);
  const content = existsSync(sp.content) ? readMd(sp.content) : { frontmatter: {}, sections: {} };
  const T = content.frontmatter;
  const post = (content.sections['post copy'] || '').trim() || '_No post copy in CONTENT.md — draft it with the social-distribution skill._';
  const files = (s.outputs || []).map((f) => `- \`${f}\``).join('\n') || '- (none yet)';
  const qa = Object.entries(s.qa || {}).map(([f, v]) => `${f}: ${v}`).join(' · ') || 'not run';
  const md = `# ${s.title || sp.id}\n\nSession \`${sp.id}\` · ${new Date().toISOString().slice(0, 10)} · QA: ${qa}\n\n## Files\n${files}\n\n## CTA\n${T.cta?.text || '—'}${T.cta?.url ? ` → ${T.cta.url}` : ''}\n\n## Post copy\n${post}\n\n## Platforms\n${(T.platforms || []).join(', ') || '—'}\n`;
  mkdirSync(sp.output, { recursive: true });
  writeFileSync(join(sp.output, 'POST.md'), md);
  return join(sp.output, 'POST.md');
}
