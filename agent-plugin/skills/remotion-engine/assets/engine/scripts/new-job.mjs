#!/usr/bin/env node
// Scaffold a new job folder from the templates.
//   node scripts/new-job.mjs <job-id> [--from jobs/<existing>]   → jobs/<job-id>/CHOREOGRAPHY.md + CONTENT.md
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [id, flag, from] = process.argv.slice(2);
if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error('usage: node scripts/new-job.mjs <job-id (kebab-case)> [--from jobs/<existing>]'); process.exit(2); }
const dir = join(ROOT, 'jobs', id);
if (existsSync(dir)) { console.error(`✖ jobs/${id} already exists`); process.exit(2); }
mkdirSync(dir, { recursive: true });
for (const f of ['CHOREOGRAPHY', 'CONTENT']) {
  const src = flag === '--from' && from ? join(ROOT, from, `${f}.md`) : join(ROOT, 'templates', `${f}.template.md`);
  copyFileSync(src, join(dir, `${f}.md`));
  const p = join(dir, `${f}.md`);
  writeFileSync(p, readFileSync(p, 'utf8').replace(/^id: .*$/m, `id: ${id}`));
}
if (!existsSync(join(ROOT, 'brand/DESIGN.md'))) console.log('▲ brand/DESIGN.md is missing — create it first (design-md skill).');
console.log(`✔ jobs/${id}/CHOREOGRAPHY.md + CONTENT.md created. Fill them, then: node scripts/make.mjs jobs/${id}`);
