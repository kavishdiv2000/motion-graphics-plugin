// Workspace + session model. The plugin never writes inside itself: every user file lives in
//   <workspace>/.motion-graphics/
//     DESIGN.md            static brand motion system (one per workspace)
//     assets/              logo, fonts/, audio/ (licensed beds), sfx/ (custom sounds)
//     sessions/<id>/       one folder per video session: session.json, CONTENT.md, CHOREOGRAPHY.md, build/, output/
//     inbox/               drop CONTENT.md files here; `mg inbox` turns each into a queued session
//     mg.mjs               launcher → .engine/scripts/mg.mjs
//     .engine/             managed copy of the render engine + node_modules (git-ignored)
//     config.json, README.md, .gitignore
// Zero third-party imports here: `mg init` must work before `npm install`.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, cpSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname, basename, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MG_DIRNAME = '.motion-graphics';
export const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SESSION_STATUSES = ['draft', 'queued', 'validated', 'rendered', 'done', 'failed', 'needs-human'];

/** Find the workspace root: --workspace / MOTION_GRAPHICS_WORKSPACE, else walk up from cwd looking for .motion-graphics/. */
export function findWorkspace(explicit) {
  if (explicit) return resolve(explicit);
  if (process.env.MOTION_GRAPHICS_WORKSPACE) return resolve(process.env.MOTION_GRAPHICS_WORKSPACE);
  let d = process.cwd();
  for (;;) {
    if (existsSync(join(d, MG_DIRNAME, 'config.json'))) return d;
    const up = dirname(d);
    if (up === d) return process.cwd();
    d = up;
  }
}

export function wsPaths(workspace) {
  const mg = join(workspace, MG_DIRNAME);
  return {
    workspace, mg,
    design: join(mg, 'DESIGN.md'),
    assets: join(mg, 'assets'),
    sessions: join(mg, 'sessions'),
    inbox: join(mg, 'inbox'),
    config: join(mg, 'config.json'),
    launcher: join(mg, 'mg.mjs'),
    engine: join(mg, '.engine'),
  };
}

export const isInitialised = (p) => existsSync(p.config);

export function slugify(s, max = 40) {
  return String(s || 'video').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, max).replace(/-$/, '') || 'video';
}

/** Session ids sort chronologically: 20261023-1317-agents-leverage */
export function newSessionId(title, now = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${z(now.getMonth() + 1)}${z(now.getDate())}-${z(now.getHours())}${z(now.getMinutes())}-${slugify(title)}`;
}

export function sessionPaths(p, id) {
  const dir = join(p.sessions, id);
  return { id, dir, meta: join(dir, 'session.json'), content: join(dir, 'CONTENT.md'), choreo: join(dir, 'CHOREOGRAPHY.md'), build: join(dir, 'build'), output: join(dir, 'output') };
}

export function listSessions(p) {
  if (!existsSync(p.sessions)) return [];
  return readdirSync(p.sessions)
    .filter((d) => !d.startsWith('.') && statSync(join(p.sessions, d)).isDirectory())
    .sort()
    .map((id) => ({ ...sessionPaths(p, id), data: readSession(sessionPaths(p, id)) }));
}

/** Resolve a session reference: exact id, "latest", a unique substring of the id, or a path to the folder. */
export function resolveSession(p, ref) {
  const all = listSessions(p);
  if (!ref || ref === 'latest') {
    if (!all.length) throw new Error('No sessions yet. Create one: node .motion-graphics/mg.mjs session new "<title>"');
    return all.sort((a, b) => (a.data.updated || '').localeCompare(b.data.updated || ''))[all.length - 1];
  }
  const asPath = isAbsolute(ref) ? ref : resolve(process.cwd(), ref);
  if (existsSync(join(asPath, 'session.json'))) return { ...sessionPaths({ sessions: dirname(asPath) }, basename(asPath)), data: readSession(sessionPaths({ sessions: dirname(asPath) }, basename(asPath))) };
  const exact = all.find((s) => s.id === ref);
  if (exact) return exact;
  const hits = all.filter((s) => s.id.includes(ref));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) throw new Error(`"${ref}" matches ${hits.length} sessions: ${hits.map((h) => h.id).join(', ')}`);
  throw new Error(`No session matches "${ref}". List them: node .motion-graphics/mg.mjs session list`);
}

export function readSession(sp) {
  try { return JSON.parse(readFileSync(sp.meta, 'utf8')); } catch { return { id: sp.id, status: 'draft', history: [] }; }
}

export function writeSession(sp, patch, event) {
  const cur = readSession(sp);
  const now = new Date().toISOString();
  const next = { ...cur, ...patch, updated: now };
  next.history = [...(cur.history || []), ...(event ? [{ at: now, event }] : [])].slice(-200);
  mkdirSync(sp.dir, { recursive: true });
  writeFileSync(sp.meta, JSON.stringify(next, null, 2) + '\n');
  return next;
}

export function readConfig(p) {
  try { return JSON.parse(readFileSync(p.config, 'utf8')); } catch { return {}; }
}

/** Which DESIGN.md a session uses: its own override (e.g. the bundled example for the demo) or the workspace one. */
export function designFor(p, session) {
  const o = (session?.data || (session?.meta ? readSession(session) : {})).design;
  if (o === 'example') return join(ENGINE_ROOT, 'templates', 'examples', 'DESIGN.example.md');
  if (o) return isAbsolute(o) ? o : join(p.mg, o);
  return p.design;
}

/**
 * Remotion serves files from a "public" directory and copies it into every bundle, so we never point it at the
 * workspace (it would copy every rendered video). Instead each session gets a small stage inside the engine:
 *   .engine/.stage/<session>/assets/…            copy of .motion-graphics/assets (minus generated libraries)
 *   .engine/.stage/<session>/audio/mix.<fmt>.wav  every built mix of the session
 */
export function prepareStage(p, sp) {
  const stage = join(ENGINE_ROOT, '.stage', sp.id);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(join(stage, 'audio'), { recursive: true });
  if (existsSync(p.assets)) cpSync(p.assets, join(stage, 'assets'), { recursive: true, filter: (src) => !/[\\/]sfx-library([\\/]|$)/.test(src) });
  if (existsSync(sp.build)) for (const f of readdirSync(sp.build).filter((x) => /^mix\.[a-z]+\.wav$/.test(x))) copyFileSync(join(sp.build, f), join(stage, 'audio', f));
  return stage;
}

export const rel = (p, f) => relative(p.workspace, f) || '.';
