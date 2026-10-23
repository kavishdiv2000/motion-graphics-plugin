#!/usr/bin/env node
// Render a job to MP4.
//   node scripts/render.mjs jobs/<id> [--format vertical] [--scale 0.5] [--frames 0-120] [--out path.mp4]
// --scale 0.5 renders a fast low-res preview; final deliverables use the default 1.
import { renderMedia } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, makeBundle, getComposition, ensureSpec, browserExecutable, opt, positional } from './lib/remotion.mjs';

const args = process.argv.slice(2);
const jobArg = positional(args, ['--format', '--scale', '--frames', '--out']);
if (!jobArg) { console.error('usage: node scripts/render.mjs jobs/<id> [--format vertical] [--scale 0.5] [--frames a-b] [--out file.mp4]'); process.exit(2); }
const { jobDir, spec } = ensureSpec(jobArg, opt(args, 'format'));
const scale = Number(opt(args, 'scale', 1));
const frames = opt(args, 'frames');
const ex = spec.design.export || {};
const suffix = scale !== 1 ? `-preview${Math.round(scale * 100)}` : '';
const out = opt(args, 'out') || join(jobDir, 'out', `${spec.meta.id}-${spec.meta.format}${suffix}.mp4`);
mkdirSync(join(out, '..'), { recursive: true });

const t0 = Date.now();
console.log(`▶ bundling…`);
const serveUrl = await makeBundle();
const composition = await getComposition(serveUrl, spec);
console.log(`▶ rendering ${spec.meta.title} · ${composition.width}×${composition.height} @${composition.fps} · ${composition.durationInFrames} frames${scale !== 1 ? ` · scale ${scale}` : ''}`);
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: out,
  inputProps: spec,
  crf: ex.crf ?? 18,
  pixelFormat: ex.pixel_format || 'yuv420p',
  colorSpace: 'bt709', // TV-range BT.709 → yuv420p (not full-range yuvj420p), what social platforms expect
  audioCodec: 'aac',
  audioBitrate: ex.audio_bitrate || '320k',
  scale,
  frameRange: frames ? frames.split('-').map(Number) : null,
  browserExecutable,
  chromiumOptions: { gl: 'angle' },
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 20);
    if (p !== last) { last = p; process.stdout.write(`\r  [${'█'.repeat(p)}${' '.repeat(20 - p)}] ${Math.round(progress * 100)}%`); }
  },
});
console.log(`\n✔ ${relative(ROOT, out)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
