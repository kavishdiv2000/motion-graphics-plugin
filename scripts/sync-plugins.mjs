#!/usr/bin/env node
// Keep the two plugins in lock-step. Single source of truth = agent-plugin/skills/.
//   node scripts/sync-plugins.mjs          copy shared skills → claude-plugin, refresh engine templates/examples, regen SFX catalogue
//   node scripts/sync-plugins.mjs --check  exit 1 if claude-plugin's shared skills differ from agent-plugin (use in CI)
//
// Claude-only skills (make-video, setup-design, batch-videos) and agents/ live only in claude-plugin and are never touched.
import { cpSync, rmSync, existsSync, readdirSync, statSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'agent-plugin/skills');
const DST = join(ROOT, 'claude-plugin/skills');
const ENGINE = join(SRC, 'remotion-engine/assets/engine');
const CLAUDE_ONLY = new Set(['make-video', 'setup-design', 'batch-videos']);
// generated / heavy paths never shipped in a plugin
const EXCLUDE = [/node_modules/, /[\\/]out[\\/]/, /[\\/]stills[\\/]/, /contact-[a-z]+\.png$/, /[\\/]public[\\/]jobs/, /[\\/]public[\\/]sfx[\\/][^\\/]+\.(wav|md)$/, /[\\/]jobs[\\/](?!demo(?:[\\/]|$))[^\\/]+/, /(spec|report|cues|qa)\.[a-z]+\.(json|md)$/, /\.remotion/];
const keep = (p) => !EXCLUDE.some((rx) => rx.test(p));

function listFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (!keep(p)) continue;
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

if (process.argv.includes('--check')) {
  let diff = 0;
  for (const skill of readdirSync(SRC)) {
    for (const f of listFiles(join(SRC, skill))) {
      const twin = join(DST, relative(SRC, f));
      if (!existsSync(twin) || !readFileSync(f).equals(readFileSync(twin))) { console.log(`≠ ${relative(ROOT, twin)}`); diff++; }
    }
  }
  console.log(diff ? `✖ ${diff} file(s) out of sync — run: node scripts/sync-plugins.mjs` : '✔ plugins in sync');
  process.exit(diff ? 1 : 0);
}

// 1. refresh engine templates + examples from the skill references (the references are canonical)
const refs = (s, f) => join(SRC, s, 'references', f);
mkdirSync(join(ENGINE, 'templates'), { recursive: true });
copyFileSync(refs('design-md', 'DESIGN.template.md'), join(ENGINE, 'templates/DESIGN.template.md'));
copyFileSync(refs('choreography-md', 'CHOREOGRAPHY.template.md'), join(ENGINE, 'templates/CHOREOGRAPHY.template.md'));
copyFileSync(refs('content-md', 'CONTENT.template.md'), join(ENGINE, 'templates/CONTENT.template.md'));
copyFileSync(refs('design-md', 'DESIGN.example.md'), join(ENGINE, 'brand/DESIGN.md'));
mkdirSync(join(ENGINE, 'jobs/demo'), { recursive: true });
copyFileSync(refs('choreography-md', 'CHOREOGRAPHY.example.md'), join(ENGINE, 'jobs/demo/CHOREOGRAPHY.md'));
copyFileSync(refs('content-md', 'CONTENT.example.md'), join(ENGINE, 'jobs/demo/CONTENT.md'));

// 2. regenerate the SFX catalogue from code (needs no npm install: sfx code is dependency-free)
spawnSync(process.execPath, [join(ENGINE, 'scripts/sfx-docs.mjs'), join(SRC, 'sound-design/references/sfx-catalogue.md')], { stdio: 'inherit' });

// 3. mirror shared skills into the Claude plugin
for (const skill of readdirSync(SRC)) {
  if (CLAUDE_ONLY.has(skill)) continue;
  const to = join(DST, skill);
  rmSync(to, { recursive: true, force: true });
  cpSync(join(SRC, skill), to, { recursive: true, filter: keep });
}
console.log(`✔ synced ${readdirSync(SRC).length} shared skills → claude-plugin/skills (+ ${[...CLAUDE_ONLY].join(', ')} kept)`);
