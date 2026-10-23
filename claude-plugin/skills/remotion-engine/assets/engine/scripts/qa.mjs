#!/usr/bin/env node
// Automated QA on a rendered MP4 + the job's spec. Writes jobs/<id>/qa.<format>.json and prints a verdict.
//   node scripts/qa.mjs jobs/<id> [--format vertical] [--file path.mp4]
// Checks: container/codec/size/fps/duration vs spec · audio present · integrated loudness & true peak
// (ffmpeg loudnorm analysis) · file size budget · then renders the contact sheet for the visual review.
// The VISUAL critique is done by the agent looking at contact-<format>.png with the motion-qa rubric.
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, ensureSpec, ffmpeg, ffprobe, opt, positional } from './lib/remotion.mjs';

const args = process.argv.slice(2);
const jobArg = positional(args, ['--format', '--file']);
if (!jobArg) { console.error('usage: node scripts/qa.mjs jobs/<id> [--format vertical] [--file out.mp4]'); process.exit(2); }
const { jobDir, spec } = ensureSpec(jobArg, opt(args, 'format'));
const file = opt(args, 'file') || join(jobDir, 'out', `${spec.meta.id}-${spec.meta.format}.mp4`);
if (!existsSync(file)) { console.error(`✖ ${file} not found — run: node scripts/render.mjs ${jobArg}`); process.exit(2); }

const checks = [];
const check = (name, ok, detail, level = 'error') => checks.push({ name, ok, level: ok ? 'pass' : level, detail });

// 1. stream info
const probe = ffprobe(['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
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

// 2. loudness (loudnorm analysis pass, available in Remotion's bundled ffmpeg)
if (a) {
  const ln = ffmpeg(['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { capture: true });
  const j = ln.out.match(/\{[\s\S]*"input_i"[\s\S]*?\}/);
  if (j) {
    const L = JSON.parse(j[0]);
    const target = spec.audio.master?.lufs_target ?? -14;
    const tp = spec.audio.master?.true_peak_db ?? -1;
    check('audio.loudness', Math.abs(Number(L.input_i) - target) <= 1, `${L.input_i} LUFS (target ${target} ±1)`, 'warn');
    check('audio.true_peak', Number(L.input_tp) <= tp + 0.5, `${L.input_tp} dBTP (ceiling ${tp})`, 'warn');
  } else check('audio.loudness', false, 'could not parse loudnorm output', 'warn');
}

// 3. size budget (most platforms cap ~250 MB+, but small files upload and process faster)
const mb = statSync(file).size / 1e6;
check('file.size', mb < 200, `${mb.toFixed(1)} MB`, 'warn');

// 4. contact sheet for visual review
const st = spawnSync(process.execPath, [join(ROOT, 'scripts/stills.mjs'), jobArg, '--format', spec.meta.format], { cwd: ROOT, encoding: 'utf8' });
const sheet = join(jobDir, `contact-${spec.meta.format}.png`);
check('contact_sheet', st.status === 0 && existsSync(sheet), st.status === 0 ? relative(ROOT, sheet) : (st.stderr || '').slice(-300), 'warn');

const failed = checks.filter((c) => c.level === 'error');
const warned = checks.filter((c) => c.level === 'warn');
const verdict = failed.length ? 'FAIL' : warned.length ? 'PASS_WITH_WARNINGS' : 'PASS';
const out = { verdict, file: relative(ROOT, file), checks, next: 'Open the contact sheet and score it with the motion-qa rubric before delivering.' };
writeFileSync(join(jobDir, `qa.${spec.meta.format}.json`), JSON.stringify(out, null, 2));
for (const c of checks) console.log(`${c.level === 'pass' ? '✔' : c.level === 'warn' ? '▲' : '✖'} ${c.name}: ${c.detail}`);
console.log(`\n${verdict} → ${relative(ROOT, join(jobDir, `qa.${spec.meta.format}.json`))}`);
process.exit(failed.length ? 1 : 0);
