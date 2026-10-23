#!/usr/bin/env node
// Extract per-glyph advance widths (in em) from the bundled font files into src/lib/font-metrics.json.
// The compiler embeds these tables into spec.json so text fitting is EXACT and identical in Node
// (validation) and in the browser (render) — no DOM measuring, no guesswork.
//
// Usage: node scripts/font-metrics.mjs                      (scans @fontsource packages in package.json)
//        node scripts/font-metrics.mjs public/fonts/My.woff2 "My Family" 700   (add a custom font)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/lib/font-metrics.json');
const db = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const CHARS = Array.from(' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~’‘“”–—…→←↑↓▸▌▒░•·×€£¥%');

function measure(file, family, weight) {
  const font = fontkit.create(readFileSync(file));
  const upm = font.unitsPerEm;
  const adv = {};
  let sum = 0, n = 0;
  for (const ch of CHARS) {
    const g = font.glyphForCodePoint(ch.codePointAt(0));
    if (!g || g.id === 0) continue;
    adv[ch] = +(g.advanceWidth / upm).toFixed(4);
    if (/[A-Z]/.test(ch)) { sum += adv[ch]; n++; }
  }
  db[`${family}|${weight}`] = { family, weight: Number(weight), source: file.replace(ROOT + '/', ''), avg_upper_em: +(sum / n).toFixed(4), advances: adv };
  console.log(`✔ ${family} ${weight}: ${Object.keys(adv).length} glyphs, avg uppercase ${(sum / n).toFixed(3)} em`);
}

const [file, family, weight] = process.argv.slice(2);
if (file) measure(resolve(file), family, weight || 400);
else {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const dep of Object.keys(pkg.dependencies || {}).filter((d) => d.startsWith('@fontsource/'))) {
    const dir = join(ROOT, 'node_modules', dep, 'files');
    const meta = JSON.parse(readFileSync(join(ROOT, 'node_modules', dep, 'metadata.json'), 'utf8'));
    for (const f of readdirSync(dir).filter((x) => /-latin-\d+-normal\.woff$/.test(x))) {
      const w = f.match(/-latin-(\d+)-normal/)[1];
      measure(join(dir, f), meta.family, w);
    }
  }
}
writeFileSync(OUT, JSON.stringify(db));
console.log(`→ ${OUT}`);
