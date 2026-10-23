#!/usr/bin/env node
// Validate both plugins without any client installed.
//   node scripts/validate-plugins.mjs
// agent-plugin  → Agent Plugins 1.0.0 manifest rules + Agent Skills SKILL.md rules
// claude-plugin → .claude-plugin/plugin.json basics + the same skill rules + agent frontmatter
// (For Claude Code also run: claude plugin validate ./claude-plugin --strict)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;
const err = (m) => { console.log(`✖ ${m}`); errors++; };
const ok = (m) => console.log(`✔ ${m}`);

const NAME_PLUGIN = /^(?=.{1,64}$)[a-z0-9](?:[a-z0-9]|[.-](?=[a-z0-9]))*$/; // no --, no .., alnum ends
const NAME_SKILL = /^(?=.{1,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

function frontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

function checkSkills(dir, label, { claude = false } = {}) {
  for (const s of readdirSync(dir)) {
    const p = join(dir, s);
    if (!statSync(p).isDirectory()) continue;
    const f = join(p, 'SKILL.md');
    if (!existsSync(f)) { err(`${label}/${s}: no SKILL.md`); continue; }
    const fm = frontmatter(f);
    if (!fm) { err(`${label}/${s}: missing front matter`); continue; }
    if (!fm.name || !NAME_SKILL.test(fm.name)) err(`${label}/${s}: invalid name "${fm.name}"`);
    if (fm.name !== s) err(`${label}/${s}: name "${fm.name}" must match its directory`);
    if (!fm.description || fm.description.length > 1024) err(`${label}/${s}: description missing or > 1024 chars (${fm.description?.length})`);
    const lines = readFileSync(f, 'utf8').split('\n').length;
    if (lines > 500) err(`${label}/${s}: SKILL.md is ${lines} lines (keep < 500; move detail to references/)`);
    if (!claude && /\$ARGUMENTS/.test(readFileSync(f, 'utf8'))) err(`${label}/${s}: $ARGUMENTS is Claude-specific`);
  }
  ok(`${label}: ${readdirSync(dir).length} skills checked`);
}

// ── agent-plugin
const ap = join(ROOT, 'agent-plugin');
const allowed = new Set(['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']);
const man = JSON.parse(readFileSync(join(ap, 'plugin.json'), 'utf8'));
if (man.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') err('agent-plugin: $schema must be the 1.0.0 URL');
if (!NAME_PLUGIN.test(man.name || '')) err(`agent-plugin: invalid name "${man.name}"`);
for (const k of Object.keys(man)) if (!allowed.has(k)) err(`agent-plugin: unknown top-level field "${k}"`);
if (man.author) for (const k of Object.keys(man.author)) if (!['name', 'email', 'url'].includes(k)) err(`agent-plugin: author.${k} not allowed`);
if (man.keywords && !man.keywords.every((k) => typeof k === 'string')) err('agent-plugin: keywords must be strings');
if (existsSync(join(ap, '.claude-plugin')) || existsSync(join(ap, 'agents'))) err('agent-plugin: must not contain client-specific dirs (.claude-plugin, agents)');
ok('agent-plugin: manifest');
checkSkills(join(ap, 'skills'), 'agent-plugin/skills');

// ── claude-plugin
const cp = join(ROOT, 'claude-plugin');
const cman = JSON.parse(readFileSync(join(cp, '.claude-plugin/plugin.json'), 'utf8'));
if (!cman.name || /\s/.test(cman.name)) err('claude-plugin: name required, no spaces');
if (readdirSync(join(cp, '.claude-plugin')).some((f) => f !== 'plugin.json' && f !== 'marketplace.json')) err('claude-plugin: only plugin.json belongs in .claude-plugin/');
ok('claude-plugin: manifest');
checkSkills(join(cp, 'skills'), 'claude-plugin/skills', { claude: true });
for (const a of readdirSync(join(cp, 'agents'))) {
  const fm = frontmatter(join(cp, 'agents', a));
  if (!fm?.name || !fm?.description) err(`claude-plugin/agents/${a}: name and description required`);
  if (fm?.name?.includes(':')) err(`claude-plugin/agents/${a}: name must not contain ':'`);
  for (const bad of ['hooks', 'mcpServers', 'permissionMode']) if (fm && bad in fm) err(`claude-plugin/agents/${a}: "${bad}" is ignored for plugin agents`);
}
ok(`claude-plugin: ${readdirSync(join(cp, 'agents')).length} agents checked`);

console.log(errors ? `\n✖ ${errors} problem(s)` : '\n✔ both plugins valid');
process.exit(errors ? 1 : 0);
