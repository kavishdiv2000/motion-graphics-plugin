#!/usr/bin/env node
// Render the full procedural SFX library to WAV + an index, and a 1-file audition reel.
//   node scripts/sfx-library.mjs [--only id1,id2] [--sr 48000]
// Output (--out, default via mg: .motion-graphics/assets/sfx-library/): <id>.wav, _reel.wav (every sound, 0.6 s apart), INDEX.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX, SFX_IDS, renderSfx } from './lib/sfx.mjs';
import { wavBuffer, peak, gainToDb } from './lib/dsp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const sr = Number(opt('sr', 48000));
const ids = opt('only') ? opt('only').split(',') : SFX_IDS;
const dir = resolve(opt('out', join(ROOT, 'sfx-library')));
mkdirSync(dir, { recursive: true });

const rows = [];
const reel = [];
for (const id of ids) {
  const [L, R] = renderSfx(id, sr);
  writeFileSync(join(dir, `${id}.wav`), wavBuffer([L, R], sr));
  rows.push(`| \`${id}\` | ${SFX[id].cat} | ${(L.length / sr).toFixed(2)} s | ${gainToDb(Math.max(peak(L), peak(R))).toFixed(1)} dB | ${SFX[id].desc} | ${SFX[id].use} |`);
  reel.push([L, R]);
  process.stdout.write('.');
}
const gap = Math.round(0.6 * sr);
const total = reel.reduce((a, [L]) => a + L.length + gap, 0);
const RL = new Float32Array(total), RR = new Float32Array(total);
let o = 0;
for (const [L, R] of reel) { RL.set(L, o); RR.set(R, o); o += L.length + gap; }
writeFileSync(join(dir, '_reel.wav'), wavBuffer([RL, RR], sr));
writeFileSync(
  join(dir, 'INDEX.md'),
  `# SFX library (${ids.length} sounds, ${sr} Hz, procedurally generated, royalty-free)\n\n| id | category | length | peak | what | use it for |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\nAudition every sound in order: \`_reel.wav\` (0.6 s gaps, same order as this table).\n`
);
console.log(`\n✔ ${ids.length} sounds → ${dir}  (audition _reel.wav, catalogue INDEX.md)`);
