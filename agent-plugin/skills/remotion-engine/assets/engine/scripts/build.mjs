#!/usr/bin/env node
// Build a job: parse the three markdown files, validate, write spec.json, synthesise + master audio.
//
// Usage:
//   node scripts/build.mjs jobs/<job-id> [--design brand/DESIGN.md] [--format vertical|portrait|square|horizontal]
//                                        [--validate-only] [--no-audio] [--strict]
// Exit codes: 0 ok · 1 validation errors · 2 usage / IO error
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMd } from './lib/md.mjs';
import { compile, formatIssues } from './lib/compile.mjs';
import { buildMix } from './lib/mix.mjs';
import { wavBuffer } from './lib/dsp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const VALUE_OPTS = ['--design', '--format'];
const jobArg = args.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.includes(args[i - 1]));
if (!jobArg) {
  console.error('usage: node scripts/build.mjs jobs/<job-id> [--design brand/DESIGN.md] [--format vertical] [--validate-only] [--no-audio] [--strict]');
  process.exit(2);
}
const jobDir = resolve(ROOT, jobArg);
const jobId = basename(jobDir);
const findFile = (dir, name) => {
  const hit = existsSync(dir) && readdirSync(dir).find((f) => f.toLowerCase() === name.toLowerCase());
  return hit ? join(dir, hit) : null;
};
const designPath = resolve(ROOT, opt('design', 'brand/DESIGN.md'));
const choreoPath = findFile(jobDir, 'CHOREOGRAPHY.md');
const contentPath = findFile(jobDir, 'CONTENT.md');
for (const [label, p] of [['DESIGN.md', designPath], ['CHOREOGRAPHY.md', choreoPath], ['CONTENT.md', contentPath]]) {
  if (!p || !existsSync(p)) { console.error(`✖ missing ${label} (looked in ${label === 'DESIGN.md' ? designPath : jobDir})`); process.exit(2); }
}

let result;
try {
  result = compile({
    design: readMd(designPath), choreo: readMd(choreoPath), content: readMd(contentPath),
    publicDir: join(ROOT, 'public'), formatOverride: opt('format', null), jobId,
  });
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(2);
}
const { spec, issues, cues } = result;
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');
const fmt = spec.meta.format;

const report = [
  `# Build report — ${spec.meta.title} (${jobId}, ${fmt})`,
  '',
  `- ${spec.meta.width}×${spec.meta.height} @ ${spec.meta.fps} fps · ${spec.meta.durationS} s · ${spec.scenes.length} scenes · ${spec.meta.bpm} BPM`,
  `- errors: ${errors.length} · warnings: ${warns.length}`,
  '',
  '## Scenes',
  '| # | id | template | start s | dur s | accent | transition in |',
  '|---|---|---|---|---|---|---|',
  ...spec.scenes.map((s) => `| ${s.number} | ${s.id} | ${s.template} | ${(s.from / spec.meta.fps).toFixed(2)} | ${(s.durationInFrames / spec.meta.fps).toFixed(2)} | ${s.accent?.token || '—'} | ${s.transitionIn} |`),
  '',
  '## Issues',
  '```',
  formatIssues(issues),
  '```',
].join('\n');
mkdirSync(jobDir, { recursive: true });
writeFileSync(join(jobDir, `report.${fmt}.md`), report);
console.log(formatIssues(issues));

if (errors.length || (flag('strict') && warns.length)) {
  console.error(`\n✖ ${errors.length} error(s)${flag('strict') ? `, ${warns.length} warning(s) [strict]` : ''}. Fix the markdown and rebuild. Report: ${join(jobArg, `report.${fmt}.md`)}`);
  process.exit(1);
}
if (flag('validate-only')) { console.log('\n✔ valid'); process.exit(0); }

if (!flag('no-audio')) {
  const t0 = Date.now();
  const { channels, report: ar, hits } = buildMix(spec, cues, { musicFileResolver: (f) => resolve(ROOT, 'public', f) });
  const rel = `jobs/${jobId}/mix.${fmt}.wav`;
  const abs = join(ROOT, 'public', rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, wavBuffer(channels, ar.sample_rate));
  spec.audio.src = rel;
  spec.audio.report = ar;
  writeFileSync(join(jobDir, `cues.${fmt}.json`), JSON.stringify(hits, null, 1));
  console.log(`\n♪ audio: ${hits.length} SFX hits · ${ar.lufs_integrated} LUFS · ${ar.true_peak_dbtp} dBTP · ${((Date.now() - t0) / 1000).toFixed(1)} s → public/${rel}`);
}
writeFileSync(join(jobDir, `spec.${fmt}.json`), JSON.stringify(spec, null, 1));
// keep the Studio preview pointed at the most recent build
writeFileSync(join(ROOT, 'src', 'studio-spec.json'), JSON.stringify(spec));
console.log(`✔ spec → ${jobArg}/spec.${fmt}.json  (${spec.meta.durationS} s, ${spec.meta.durationInFrames} frames)`);
