#!/usr/bin/env node
// One command, whole pipeline: build (validate + audio) → stills → render → QA, for one or more formats.
//   node scripts/make.mjs jobs/<id> [--formats vertical,square] [--preview] [--skip-qa]
// --preview renders at 50% scale for a fast review cut (QA is skipped for previews).
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, opt, positional } from './lib/remotion.mjs';

const args = process.argv.slice(2);
const jobArg = positional(args, ['--formats']);
if (!jobArg) { console.error('usage: node scripts/make.mjs jobs/<id> [--formats vertical,square] [--preview] [--skip-qa]'); process.exit(2); }
const formats = (opt(args, 'formats') || '').split(',').filter(Boolean);
const preview = args.includes('--preview');
const run = (script, extra) => {
  console.log(`\n━━ ${script} ${extra.join(' ')}`);
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', script), jobArg, ...extra], { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) { console.error(`✖ ${script} failed (exit ${r.status}). Stop, read the message above, fix the markdown or code, re-run.`); process.exit(r.status || 1); }
};
for (const f of formats.length ? formats : [null]) {
  const fx = f ? ['--format', f] : [];
  run('build.mjs', fx);
  run('render.mjs', [...fx, ...(preview ? ['--scale', '0.5'] : [])]);
  if (!preview && !args.includes('--skip-qa')) run('qa.mjs', fx);
}
console.log('\n✔ done');
