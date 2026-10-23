#!/usr/bin/env node
// Render QA stills straight from the composition (no full render needed) + a contact sheet.
//   node scripts/stills.mjs jobs/<id> [--format vertical] [--frames 30,90,140] [--cols 7] [--separate [--scale 0.5]]
// Default frames per scene: mid-decode (to check the scramble look) and the landed hold frame.
// Output: jobs/<id>/contact-<format>.png (always) and stills/<format>/*.png (--separate). LOOK at the sheet.
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, makeBundle, getComposition, ensureSpec, browserExecutable, opt, positional } from './lib/remotion.mjs';
import { buildTimeline } from '../src/lib/timeline.js';

const args = process.argv.slice(2);
const jobArg = positional(args, ['--format', '--frames', '--scale', '--cols']);
if (!jobArg) { console.error('usage: node scripts/stills.mjs jobs/<id> [--format vertical] [--frames a,b,c] [--scale 0.5]'); process.exit(2); }
const { jobDir, spec } = ensureSpec(jobArg, opt(args, 'format'));
const scale = Number(opt(args, 'scale', 0.5));
const dir = join(jobDir, 'stills', spec.meta.format);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

let shots = [];
if (opt(args, 'frames')) shots = opt(args, 'frames').split(',').map((f) => ({ frame: Number(f), label: `f${f}` }));
else for (const s of spec.scenes) {
  const tl = buildTimeline(s, spec.design.motion.timing, spec.meta.fps);
  const hero = tl.elements.find((e) => e.reveal === 'decode') || tl.elements[tl.elements.length - 1];
  if (hero) shots.push({ frame: s.from + Math.round((hero.start + hero.end) / 2), label: `${s.number}-mid` });
  shots.push({ frame: s.from + Math.min(s.durationInFrames - 1, tl.lastRevealEnd + 6), label: `${s.number}-land` });
}

const serveUrl = await makeBundle();
const separate = args.includes('--separate');
if (separate) {
  const composition = await getComposition(serveUrl, spec);
  for (const sh of shots) {
    const file = join(dir, `${sh.label}.png`);
    await renderStill({ composition, serveUrl, output: file, frame: sh.frame, inputProps: spec, scale, browserExecutable, chromiumOptions: { gl: 'angle' } });
    process.stdout.write('.');
  }
  console.log(`\n✔ ${shots.length} full-size stills → ${relative(ROOT, dir)}`);
}
const sheetProps = { spec, shots, cols: Number(opt(args, 'cols', spec.meta.width > spec.meta.height ? 3 : 7)) };
const sheet = await selectComposition({ serveUrl, id: 'ContactSheet', inputProps: sheetProps, browserExecutable });
const out = join(jobDir, `contact-${spec.meta.format}.png`);
await renderStill({ composition: sheet, serveUrl, output: out, frame: 0, inputProps: sheetProps, browserExecutable, chromiumOptions: { gl: 'angle' } });
console.log(`✔ contact sheet → ${relative(ROOT, out)}  (${shots.map((s) => `${s.label}@${s.frame}`).join(', ')})`);
