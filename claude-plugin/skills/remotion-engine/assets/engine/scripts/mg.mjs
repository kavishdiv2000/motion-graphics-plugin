#!/usr/bin/env node
// mg — the motion-graphics workspace CLI. Agents call it through the workspace launcher:
//     node .motion-graphics/mg.mjs <command> [args]
// It creates and manages <workspace>/.motion-graphics/ (see scripts/lib/workspace.mjs for the layout).
// Exit codes: 0 ok · 1 validation/QA failure · 2 usage/IO error · 3 workspace not initialised / engine not installed
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join, basename, resolve, extname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  MG_DIRNAME, ENGINE_ROOT, SESSION_STATUSES, findWorkspace, wsPaths, isInitialised, newSessionId, sessionPaths,
  listSessions, resolveSession as resolveSessionRaw, readSession, writeSession, readConfig, slugify, rel,
} from './lib/workspace.mjs';
import { touchSession } from './lib/usage.mjs';

const argv = process.argv.slice(2);
const VALUE_OPTS = new Set(['--workspace', '--format', '--formats', '--frames', '--cols', '--scale', '--id', '--status', '--chat-ref', '--client', '--from', '--title', '--limit', '--design',
  '--kit', '--input', '--output', '--cache-read', '--cache-write', '--reasoning', '--model', '--note']);
const opts = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { if (VALUE_OPTS.has(a)) opts[a.slice(2)] = argv[++i]; else opts[a.slice(2)] = true; }
  else pos.push(a);
}
const [cmd, sub, ...rest] = pos;
const p = wsPaths(findWorkspace(opts.workspace));
const ENGINE_VERSION = JSON.parse(readFileSync(join(ENGINE_ROOT, 'package.json'), 'utf8')).version;
const T = (f) => join(ENGINE_ROOT, 'templates', f);
const die = (msg, code = 2) => { console.error(`✖ ${msg}`); process.exit(code); };
// every command that works on a session marks it as "last touched" (token-usage fallback attribution)
const resolveSession = (ws, ref) => { const s = resolveSessionRaw(ws, ref); if (cmd !== 'usage') touchSession(ws.mg, s.id); return s; };

const HELP = `mg — motion-graphics workspace CLI (engine ${ENGINE_VERSION})
usage: node ${MG_DIRNAME}/mg.mjs <command>

workspace
  init                              create/repair ${MG_DIRNAME}/ (folders, config, launcher, .gitignore)
  status                            design state + sessions table
  doctor                            check Node, engine install, Chrome, design, disk layout
design
  design new [--example|--template] [--force]   write ${MG_DIRNAME}/DESIGN.md (then edit it with the design-md skill)
  design validate                   validate DESIGN.md against the bundled example content
  design path                       print the DESIGN.md path
sessions  (one folder per video: ${MG_DIRNAME}/sessions/<id>/)
  session new "<title>" [--id x] [--status draft|queued] [--chat-ref ref] [--client name] [--from <session>] [--example]
  session list [--chat-ref ref] [--status s]
  session show <ref>                <ref> = id | unique part of an id | latest | path
  session set <ref> status=<s> [title=…]
  inbox                             turn ${MG_DIRNAME}/inbox/*.md (or inbox/<folder>/) into queued sessions
pipeline  (all take <ref>; default format = the choreography's)
  validate <ref> [--format f]
  build <ref> [--format f] [--no-audio] [--strict]
  stills <ref> [--format f] [--frames 30,90] [--cols 7] [--separate]
  render <ref> [--format f] [--preview] [--frames a-b]
  qa <ref> [--format f]
  make <ref> [--formats vertical,square] [--preview] [--skip-qa]     build → render → qa → thumbnail → POST.md
  studio <ref> [--format f]         open Remotion Studio on the session
token usage  (sessions/<id>/usage.json — recorded automatically by the Claude Code plugin hook)
  usage [<ref>|--all] [--json]      tokens consumed per video session (+ workspace-level work)
  usage add <ref> --input N --output N [--cache-read N] [--cache-write N] [--model m] [--client c] [--note "…"]
  usage hooks install codex|cursor|claude   add the recording hook to this project's .codex/ · .cursor/ · .claude/ config
  usage hook <claude-code|codex|cursor>     (called by hooks: reads the hook JSON on stdin, prints nothing)
extras
  demo                              create a demo session (reference reel, bundled example design) and validate it
  sfx                               render the 50-sound synth SFX library → ${MG_DIRNAME}/assets/sfx-library/
  sfx kits | sfx --kit <name>       list the sound kits (calm|crisp|minimal|launch) | audition one → assets/sfx-library/kit-<name>.wav
  font add <file> "<Family>" <weight>   add a custom font to ${MG_DIRNAME}/assets/fonts/ + exact metrics
`;

// ───────────────────────────────── workspace files
const LAUNCHER = `#!/usr/bin/env node
// Managed by the motion-graphics plugin — do not edit. Usage: node ${MG_DIRNAME}/mg.mjs <command>   (help: node ${MG_DIRNAME}/mg.mjs help)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
let cfg = {};
try { cfg = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8')); } catch {}
const engine = process.env.MOTION_GRAPHICS_ENGINE_DIR || (cfg.engine_dir ? resolve(here, cfg.engine_dir) : join(here, '.engine'));
const cli = join(engine, 'scripts', 'mg.mjs');
if (!existsSync(cli)) { console.error('✖ motion-graphics engine missing at ' + engine + ' — re-run the plugin setup (init-workspace).'); process.exit(3); }
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2), '--workspace', dirname(here)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
`;
const GITIGNORE = `# managed by the motion-graphics plugin
.engine/
.state/
sessions/*/build/
assets/sfx-library/
# videos are large: remove the next line if you want to commit them
sessions/*/output/*.mp4
`;
const README = `# .motion-graphics

Managed by the **motion-graphics** plugin. Everything the plugin creates for this workspace lives here.

| Path | What | Lifetime |
|---|---|---|
| \`DESIGN.md\` | the brand's motion design system (colours, type, motion, sound, formats) | static: set once, reused by every video |
| \`assets/\` | \`logo.svg\`, \`fonts/\`, \`audio/\` (licensed music beds), \`sfx/\` (custom sounds) | static |
| \`sessions/<id>/\` | one folder per video session | per video |
| \`sessions/<id>/CONTENT.md\` | what the video says (beats, CTA, post copy) | per video |
| \`sessions/<id>/CHOREOGRAPHY.md\` | how it flows (scenes, templates, timing, emphasis) | per video |
| \`sessions/<id>/build/\` | spec, validation report, audio mix, contact sheets, QA (regenerable) | scratch |
| \`sessions/<id>/output/\` | final MP4s, thumbnail, POST.md (caption + files + QA) | deliverables |
| \`sessions/<id>/usage.json\` | LLM tokens spent on this video (by model, client, chat) + \`usage.log.jsonl\` per turn | per video |
| \`usage/\` | tokens spent on motion-graphics work not tied to one video (e.g. DESIGN.md setup) | log |
| \`inbox/\` | drop CONTENT.md files here for unattended batch runs | queue |
| \`mg.mjs\` | CLI launcher: \`node .motion-graphics/mg.mjs help\` | managed |
| \`.engine/\` | render engine + node_modules (git-ignored, reinstallable) | managed |
| \`.state/\` | hook bookkeeping (transcript offsets, last session) | managed |
`;

function cmdInit() {
  for (const d of [p.mg, p.assets, join(p.assets, 'fonts'), join(p.assets, 'audio'), join(p.assets, 'sfx'), p.sessions, p.inbox]) mkdirSync(d, { recursive: true });
  writeFileSync(p.launcher, LAUNCHER);
  if (!existsSync(join(p.mg, '.gitignore'))) writeFileSync(join(p.mg, '.gitignore'), GITIGNORE);
  else if (!/^\.state\/$/m.test(readFileSync(join(p.mg, '.gitignore'), 'utf8'))) writeFileSync(join(p.mg, '.gitignore'), readFileSync(join(p.mg, '.gitignore'), 'utf8').replace(/\n?$/, '\n.state/\n'));
  writeFileSync(join(p.mg, 'README.md'), README);
  const cfg = readConfig(p);
  writeFileSync(p.config, JSON.stringify({
    schema: 'motion-graphics-workspace/1.0', created: cfg.created || new Date().toISOString(), engine_version: ENGINE_VERSION,
    engine_dir: ENGINE_ROOT.startsWith(p.mg) ? relative(p.mg, ENGINE_ROOT) : ENGINE_ROOT,
    default_formats: cfg.default_formats || null, ...Object.fromEntries(Object.entries(cfg).filter(([k]) => !['schema', 'created', 'engine_version', 'engine_dir'].includes(k))),
  }, null, 2) + '\n');
  console.log(`✔ ${rel(p, p.mg)}/ ready (engine ${ENGINE_VERSION})`);
  console.log(existsSync(p.design) ? `✔ DESIGN.md present` : `▲ no DESIGN.md yet — create it (design-md skill), or start from: node ${MG_DIRNAME}/mg.mjs design new --template`);
}

function requireInit() {
  if (!isInitialised(p)) die(`no ${MG_DIRNAME}/ in ${p.workspace}. Run the plugin's init-workspace script (or: node <engine>/scripts/mg.mjs init --workspace <dir>).`, 3);
}

function frontmatterTitle(file) {
  try { return (readFileSync(file, 'utf8').match(/^title:\s*(.+)$/m) || [])[1]?.replace(/#.*$/, '').trim(); } catch { return null; }
}

function cmdStatus() {
  requireInit();
  const dv = existsSync(p.design) ? (readFileSync(p.design, 'utf8').match(/^(name|version):\s*(.+)$/gm) || []).join(' · ') : 'missing';
  console.log(`workspace  ${p.workspace}\nDESIGN.md  ${dv}\nengine     ${ENGINE_VERSION}${existsSync(join(ENGINE_ROOT, 'node_modules')) ? '' : ' (NOT INSTALLED — run npm install in .engine)'}\n`);
  const all = listSessions(p);
  if (!all.length) return console.log(`no sessions yet — node ${MG_DIRNAME}/mg.mjs session new "<title>"`);
  console.log('| session | status | title | formats | outputs |\n|---|---|---|---|---|');
  for (const s of all) console.log(`| ${s.id} | ${s.data.status} | ${s.data.title || ''} | ${(s.data.formats || []).join(',')} | ${(s.data.outputs || []).length} |`);
}

function stampId(file, id, title) {
  let t = readFileSync(file, 'utf8').replace(/^id: .*$/m, `id: ${id}`);
  if (title) t = t.replace(/^title: .*$/m, `title: ${title}`);
  writeFileSync(file, t);
}

function cmdSessionNew(title, { example = false } = {}) {
  requireInit();
  title = title || opts.title || (example ? 'Demo — agents are leverage' : 'Untitled video');
  const id = opts.id ? slugify(opts.id, 80) : newSessionId(title);
  const sp = sessionPaths(p, id);
  if (existsSync(sp.dir)) die(`session ${id} already exists`);
  mkdirSync(sp.build, { recursive: true });
  mkdirSync(sp.output, { recursive: true });
  if (opts.from) {
    const src = resolveSession(p, opts.from);
    copyFileSync(src.content, sp.content);
    copyFileSync(src.choreo, sp.choreo);
  } else {
    copyFileSync(T(example ? 'examples/CONTENT.example.md' : 'CONTENT.template.md'), sp.content);
    copyFileSync(T(example ? 'examples/CHOREOGRAPHY.example.md' : 'CHOREOGRAPHY.template.md'), sp.choreo);
  }
  stampId(sp.content, id);
  stampId(sp.choreo, id, example ? null : title);
  const status = opts.status && SESSION_STATUSES.includes(opts.status) ? opts.status : 'draft';
  writeSession(sp, {
    schema: 'motion-graphics-session/1.0', id, title, status, created: new Date().toISOString(),
    chat: { client: opts.client || null, ref: opts['chat-ref'] || null },
    design: example && !existsSync(p.design) ? 'example' : null, formats: [], outputs: [],
  }, `created${opts.from ? ` from ${opts.from}` : example ? ' (demo)' : ' from templates'}`);
  touchSession(p.mg, id);
  console.log(`✔ session ${id}\n  ${rel(p, sp.dir)}/\n    CONTENT.md        ${opts.from ? 'copied' : example ? 'example' : 'template — replace with the real copy'}\n    CHOREOGRAPHY.md   ${opts.from ? 'copied' : example ? 'example' : 'template — replace with the scene plan'}\n    build/  output/`);
  return sp;
}

function cmdSessionList() {
  requireInit();
  let all = listSessions(p);
  if (opts['chat-ref']) all = all.filter((s) => s.data.chat?.ref === opts['chat-ref']);
  if (opts.status) all = all.filter((s) => s.data.status === opts.status);
  if (!all.length) return console.log('(no sessions)');
  for (const s of all) console.log(`${s.id}  [${s.data.status}]  ${s.data.title || ''}${s.data.chat?.ref ? `  chat:${s.data.chat.ref}` : ''}`);
}

function cmdSessionShow(ref) {
  requireInit();
  const s = resolveSession(p, ref);
  const ls = (d) => (existsSync(d) ? readdirSync(d).filter((f) => !statSync(join(d, f)).isDirectory()) : []);
  const { id, title, status, created, updated, chat, formats, outputs, qa, design, history, ...restData } = s.data;
  let usage;
  try { const u = JSON.parse(readFileSync(join(s.dir, 'usage.json'), 'utf8')); usage = { total: u.totals.total, input: u.totals.input, output: u.totals.output, cache_read: u.totals.cache_read, cache_write: u.totals.cache_write, turns: u.turns, models: Object.keys(u.by_model) }; } catch {}
  console.log(JSON.stringify({ id, title, status, path: rel(p, s.dir), created, updated, chat, formats, outputs, qa, design, ...(usage ? { usage } : {}), ...restData, history, files: { inputs: ['CONTENT.md', 'CHOREOGRAPHY.md'].filter((f) => existsSync(join(s.dir, f))), build: ls(s.build), output: ls(s.output) } }, null, 2));
}

function cmdSessionSet(ref, pairs) {
  requireInit();
  const s = resolveSession(p, ref);
  const patch = Object.fromEntries(pairs.map((kv) => kv.split('=')));
  if (patch.status && !SESSION_STATUSES.includes(patch.status)) die(`status must be one of ${SESSION_STATUSES.join(', ')}`);
  writeSession(s, patch, `set ${pairs.join(' ')}`);
  console.log(`✔ ${s.id} ${pairs.join(' ')}`);
}

function cmdInbox() {
  requireInit();
  const items = existsSync(p.inbox) ? readdirSync(p.inbox).filter((f) => !f.startsWith('.') && !f.startsWith('_')) : [];
  if (!items.length) return console.log('inbox empty');
  mkdirSync(join(p.inbox, '_ingested'), { recursive: true });
  for (const it of items) {
    const src = join(p.inbox, it);
    const isDir = statSync(src).isDirectory();
    const content = isDir ? join(src, 'CONTENT.md') : extname(it).toLowerCase() === '.md' ? src : null;
    if (!content || !existsSync(content)) { console.log(`▲ skip ${it} (needs a .md file or a folder with CONTENT.md)`); continue; }
    const title = frontmatterTitle(content) || basename(it, '.md').replace(/[-_]/g, ' ');
    opts.status = 'queued';
    const sp = cmdSessionNew(title);
    copyFileSync(content, sp.content);
    const choreo = isDir && join(src, 'CHOREOGRAPHY.md');
    if (choreo && existsSync(choreo)) copyFileSync(choreo, sp.choreo);
    else writeSession(sp, { needs_choreography: true }, 'no CHOREOGRAPHY.md in inbox item — derive one');
    if (isDir && existsSync(join(src, 'formats.txt'))) writeSession(sp, { requested_formats: readFileSync(join(src, 'formats.txt'), 'utf8').trim().split(/[\s,]+/).filter(Boolean) });
    renameSync(src, join(p.inbox, '_ingested', `${sp.id}--${it}`));
  }
}

function cmdDesignNew() {
  requireInit();
  if (existsSync(p.design) && !opts.force) die(`${rel(p, p.design)} already exists (use --force to replace; the old file is kept as DESIGN.<timestamp>.md)`);
  if (existsSync(p.design)) renameSync(p.design, join(p.mg, `DESIGN.${Date.now()}.md`));
  copyFileSync(T(opts.example ? 'examples/DESIGN.example.md' : 'DESIGN.template.md'), p.design);
  console.log(`✔ ${rel(p, p.design)} written from the ${opts.example ? 'Signal Ops example' : 'template'} — now fill it (design-md skill), then: node ${MG_DIRNAME}/mg.mjs design validate`);
}

async function cmdDesignValidate() {
  requireInit();
  if (!existsSync(p.design)) die('no DESIGN.md yet');
  // validate the design by compiling the bundled example content against it (design-only checks)
  const { readMd } = await import('./lib/md.mjs');
  const { compile, formatIssues } = await import('./lib/compile.mjs');
  const { issues } = compile({ design: readMd(p.design), choreo: readMd(T('examples/CHOREOGRAPHY.example.md')), content: readMd(T('examples/CONTENT.example.md')), baseDir: p.mg, formatOverride: opts.format || null, jobId: 'design-check' });
  const designIssues = issues.filter((i) => !i.scene && !/^(copy|timing|hook|beat|video|structure|claim|platform)\./.test(i.code));
  console.log(formatIssues(designIssues));
  process.exit(designIssues.some((i) => i.level === 'error') ? 1 : 0);
}

async function cmdFontAdd(file, family, weight = '400') {
  requireInit();
  if (!file || !family) die('usage: font add <file.woff2|ttf|otf> "<Family>" <weight>');
  const dst = join(p.assets, 'fonts', basename(file));
  mkdirSync(join(p.assets, 'fonts'), { recursive: true });
  copyFileSync(resolve(file), dst);
  const r = spawnSync(process.execPath, [join(ENGINE_ROOT, 'scripts', 'font-metrics.mjs'), dst, family, weight, '--out', join(p.assets, 'fonts', 'metrics.json')], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  console.log(`✔ font registered. In DESIGN.md set typography.families.<display|body|mono>: { family: ${family}, file: assets/fonts/${basename(file)}, weights: [${weight}] }`);
}

async function pipeline(fn, ref, extra = {}) {
  requireInit();
  if (!existsSync(join(ENGINE_ROOT, 'node_modules'))) die(`engine dependencies not installed: cd ${rel(p, ENGINE_ROOT)} && npm install`, 3);
  const P = await import('./lib/pipeline.mjs');
  const sp = resolveSession(p, ref);
  return P[fn](p, sp, { format: opts.format, ...extra });
}

async function cmdMake(ref) {
  requireInit();
  const P = await import('./lib/pipeline.mjs');
  const sp = resolveSession(p, ref);
  const data = readSession(sp);
  const formats = (opts.formats || '').split(',').filter(Boolean);
  const list = formats.length ? formats : data.requested_formats?.length ? data.requested_formats : readConfig(p).default_formats || [null];
  let failed = false;
  for (const f of list) {
    const b = await P.buildSession(p, sp, { format: f });
    if (!b.ok) { failed = true; break; }
    const { serveUrl } = await P.renderSession(p, sp, { format: f, scale: opts.preview ? 0.5 : 1 });
    if (opts.preview) continue;
    if (!opts['skip-qa']) { const q = await P.qaSession(p, sp, { format: f, serveUrl }); if (q.verdict === 'FAIL') failed = true; }
    await P.thumbnailSession(p, sp, { format: f, serveUrl });
  }
  if (!opts.preview) console.log(`✔ ${rel(p, P.writePost(p, sp))}`);
  process.exit(failed ? 1 : 0);
}

async function cmdDemo() {
  requireInit();
  opts.id = opts.id || 'demo-signal-ops';
  const existing = listSessions(p).find((s) => s.id === opts.id);
  const sp = existing || cmdSessionNew(null, { example: true });
  if (!existsSync(join(ENGINE_ROOT, 'node_modules'))) return console.log('▲ engine not installed yet — demo session created but not validated');
  const P = await import('./lib/pipeline.mjs');
  const r = await P.buildSession(p, sp, { validateOnly: true });
  console.log(r.ok ? `\nnext: node ${MG_DIRNAME}/mg.mjs stills ${sp.id}   (then look at sessions/${sp.id}/build/contact-vertical.png)` : '');
}

function cmdDoctor() {
  const ok = (b, m, fix) => console.log(`${b ? '✔' : '✖'} ${m}${!b && fix ? `\n    fix → ${fix}` : ''}`);
  const [maj, min] = process.versions.node.split('.').map(Number);
  ok(maj > 18 || (maj === 18 && min >= 18), `Node ${process.versions.node} (need ≥ 18.18, 20+ recommended)`, 'install Node 20+ from nodejs.org');
  ok(isInitialised(p), `${MG_DIRNAME}/ initialised in ${p.workspace}`, 'run the plugin init-workspace script');
  ok(existsSync(join(ENGINE_ROOT, 'node_modules', 'remotion')), `engine installed at ${rel(p, ENGINE_ROOT)}`, `cd ${rel(p, ENGINE_ROOT)} && npm install`);
  ok(existsSync(p.design), 'DESIGN.md present', 'design-md skill → interview, or: mg design new --template');
  ok(!!process.env.REMOTION_BROWSER_EXECUTABLE || true, process.env.REMOTION_BROWSER_EXECUTABLE ? `browser: ${process.env.REMOTION_BROWSER_EXECUTABLE}` : 'browser: Remotion downloads chrome-headless-shell on first render (~100 MB, needs network)');
  if (/onedrive|dropbox|icloud/i.test(p.workspace)) console.log('▲ workspace is inside a synced folder (OneDrive/Dropbox/iCloud): exclude .motion-graphics/.engine from sync, or set MOTION_GRAPHICS_ENGINE_DIR to a folder outside it');
}

// ───────────────────────────────── sound kits
async function cmdKits(name) {
  const K = await import('./lib/kits.mjs');
  const { wavBuffer } = await import('./lib/dsp.mjs');
  if (!name) {
    for (const k of K.KIT_NAMES) {
      const kit = K.loadKit(k);
      console.log(`${k.padEnd(8)} ${kit.note.split('.')[0]}.`);
    }
    return console.log(`\naudition: node ${MG_DIRNAME}/mg.mjs sfx --kit <name>   ·   use: DESIGN.md audio.sfx.kit: <name>`);
  }
  const kit = K.resolveKit({ kit: name });
  const sr = 48000, gap = Math.round(0.3 * sr), roleGap = Math.round(0.8 * sr);
  const parts = [];
  console.log(`| role | sound | takes | align | offset ms | over bed dB |\n|---|---|--:|---|--:|--:|`);
  for (const [r, role] of Object.entries(kit.roles)) {
    if (!role) continue;
    const takes = K.roleTakes(role, sr);
    console.log(`| ${r} | ${role.sound} | ${takes.length} | ${role.align} | ${role.offset_ms ?? 0} | ${role.bed_db ?? '—'} |`);
    for (const t of takes) { parts.push(t.channels); parts.push(gap); }
    parts.push(roleGap);
  }
  const n = parts.reduce((a, x) => a + (typeof x === 'number' ? x : x[0].length), 0);
  const L = new Float32Array(n), R = new Float32Array(n);
  let o = 0;
  for (const x of parts) { if (typeof x === 'number') { o += x; continue; } L.set(x[0], o); R.set(x[1], o); o += x[0].length; }
  const out = join(p.assets, 'sfx-library', `kit-${name}.wav`);
  mkdirSync(join(p.assets, 'sfx-library'), { recursive: true });
  writeFileSync(out, wavBuffer([L, R], sr));
  console.log(`\n✔ ${rel(p, out)}  (every role in order, each take once)`);
}

// ───────────────────────────────── token usage
async function cmdUsage(subcmd, args) {
  const U = await import('./lib/usage.mjs');
  if (subcmd === 'hook') { U.runHook(args[0], U.readStdinJson()); return process.exit(0); } // silent, never fails the host
  requireInit();
  if (subcmd === 'add') {
    const s = resolveSession(p, args[0]);
    const n = (k) => Math.max(0, Number(opts[k] || 0));
    const row = { client: opts.client || 'manual', chat: opts['chat-ref'] || null, model: opts.model || 'unknown', input: n('input'), cache_write: n('cache-write'), cache_read: n('cache-read'), output: n('output'), reasoning: n('reasoning'), requests: 1, source: 'manual', ...(opts.note ? { note: opts.note } : {}) };
    if (!U.totalOf(row)) die('give at least --input or --output');
    const sum = U.record(p.mg, s.id, row);
    return console.log(`✔ ${s.id}: +${U.fmtN(U.totalOf(row))} tokens (session total ${U.fmtN(sum.totals.total)})`);
  }
  if (subcmd === 'hooks') return cmdUsageHooks(args[0] === 'install' ? args[1] : args[0]);
  // report
  const rows = [];
  const want = subcmd && subcmd !== 'show' ? subcmd : args[0];
  const list = want && !opts.all ? [resolveSession(p, want)] : listSessions(p);
  for (const s of list) if (existsSync(join(s.dir, 'usage.log.jsonl'))) rows.push([s.id, U.summarise(p.mg, s.id)]);
  if ((!want || opts.all) && existsSync(join(p.mg, 'usage', 'workspace.log.jsonl'))) rows.push(['(workspace: design & setup)', U.summarise(p.mg, null)]);
  if (opts.json) return console.log(JSON.stringify(Object.fromEntries(rows), null, 2));
  if (!rows.length) return console.log(`no token usage recorded yet.\n  Claude Code: recorded automatically by the plugin hook.  Codex / Cursor: node ${MG_DIRNAME}/mg.mjs usage hooks install codex|cursor\n  Anything else: node ${MG_DIRNAME}/mg.mjs usage add <session> --input N --output N`);
  console.log(U.usageTable(rows));
  if (rows.length > 1) {
    const all = rows.reduce((a, [, s]) => a + s.totals.total, 0);
    console.log(`\nall: ${U.fmtN(all)} tokens`);
  }
}

function cmdUsageHooks(client) {
  const cmdline = (c) => `node ${MG_DIRNAME}/mg.mjs usage hook ${c}`;
  const merge = (file, mutate) => {
    let j = {};
    if (existsSync(file)) { try { j = JSON.parse(readFileSync(file, 'utf8')); } catch { die(`${rel(p, file)} is not valid JSON — fix it first`); } }
    const before = JSON.stringify(j);
    mutate(j);
    if (JSON.stringify(j) === before) return console.log(`✔ ${rel(p, file)} already has the usage hook`);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
    console.log(`✔ usage hook added to ${rel(p, file)}`);
  };
  const has = (arr, c) => JSON.stringify(arr || []).includes(c);
  if (client === 'codex') {
    const c = cmdline('codex');
    merge(join(p.workspace, '.codex', 'hooks.json'), (j) => {
      j.hooks ||= {};
      if (!has(j.hooks.Stop, c)) (j.hooks.Stop ||= []).push({ hooks: [{ type: 'command', command: c, timeout: 30 }] });
    });
    return console.log('  Codex reads project hooks from .codex/hooks.json (enable hooks in your Codex config if your version requires it); restart Codex.');
  }
  if (client === 'cursor') {
    const c = cmdline('cursor');
    merge(join(p.workspace, '.cursor', 'hooks.json'), (j) => {
      j.version ||= 1; j.hooks ||= {};
      if (!has(j.hooks.afterAgentResponse, c)) (j.hooks.afterAgentResponse ||= []).push({ command: c });
    });
    return console.log('  Cursor: Developer: Reload Window. Counts are best effort (Cursor does not document its token fields).');
  }
  if (client === 'claude') {
    const c = cmdline('claude-code');
    merge(join(p.workspace, '.claude', 'settings.json'), (j) => {
      j.hooks ||= {};
      for (const ev of ['Stop', 'SessionEnd']) if (!has(j.hooks[ev], c)) (j.hooks[ev] ||= []).push({ hooks: [{ type: 'command', command: c, timeout: 30 }] });
    });
    return console.log('  Only needed when the portable agent-plugin is loaded into Claude Code: the Claude plugin already records usage on its own.');
  }
  die('usage hooks install codex|cursor|claude');
}

async function main() {
  switch (cmd) {
    case undefined: case 'help': case '--help': return console.log(HELP);
    case 'init': return cmdInit();
    case 'status': return cmdStatus();
    case 'doctor': return cmdDoctor();
    case 'design':
      if (sub === 'new') return cmdDesignNew();
      if (sub === 'validate') return cmdDesignValidate();
      if (sub === 'path') return console.log(p.design);
      return die('design new|validate|path');
    case 'session':
      if (sub === 'new') return cmdSessionNew(rest.join(' ') || opts.title, { example: !!opts.example });
      if (sub === 'list') return cmdSessionList();
      if (sub === 'show') return cmdSessionShow(rest[0]);
      if (sub === 'set') return cmdSessionSet(rest[0], rest.slice(1));
      return die('session new|list|show|set');
    case 'inbox': return cmdInbox();
    case 'validate': { const r = await pipeline('buildSession', sub, { validateOnly: true }); return process.exit(r.ok ? 0 : 1); }
    case 'build': { const r = await pipeline('buildSession', sub, { noAudio: !!opts['no-audio'], strict: !!opts.strict }); return process.exit(r.ok ? 0 : 1); }
    case 'stills': return pipeline('stillsSession', sub, { frames: opts.frames, cols: opts.cols, separate: !!opts.separate, scale: opts.scale ? Number(opts.scale) : 0.5 });
    case 'render': return pipeline('renderSession', sub, { scale: opts.preview ? 0.5 : opts.scale ? Number(opts.scale) : 1, frames: opts.frames });
    case 'qa': { const r = await pipeline('qaSession', sub); return process.exit(r.verdict === 'FAIL' ? 1 : 0); }
    case 'make': return cmdMake(sub);
    case 'demo': return cmdDemo();
    case 'usage': return cmdUsage(sub, rest);
    case 'font': if (sub === 'add') return cmdFontAdd(...rest); return die('font add <file> "<Family>" <weight>');
    case 'sfx': {
      requireInit();
      if (sub === 'kits' || opts.kit) return cmdKits(opts.kit);
      const out = join(p.assets, 'sfx-library');
      const r = spawnSync(process.execPath, [join(ENGINE_ROOT, 'scripts', 'sfx-library.mjs'), '--out', out], { stdio: 'inherit' });
      return process.exit(r.status ?? 1);
    }
    case 'studio': {
      requireInit();
      const P = await import('./lib/pipeline.mjs');
      const { prepareStage } = await import('./lib/workspace.mjs');
      const sp = resolveSession(p, sub);
      await P.ensureSpec(p, sp, opts.format);
      const stage = prepareStage(p, sp);
      const r = spawnSync('npx', ['--no-install', 'remotion', 'studio', 'src/index.ts', '--public-dir', stage], { cwd: ENGINE_ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
      return process.exit(r.status ?? 0);
    }
    default: return die(`unknown command "${cmd}"\n\n${HELP}`);
  }
}

main().catch((e) => die(e.message));
