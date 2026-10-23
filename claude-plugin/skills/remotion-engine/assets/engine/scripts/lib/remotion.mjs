// Thin wrapper around @remotion/bundler + @remotion/renderer shared by render/stills scripts.
import { bundle } from '@remotion/bundler';
import { selectComposition } from '@remotion/renderer';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Optional override, e.g. a system Chrome / Playwright headless_shell. Unset = Remotion downloads its own. */
export const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

export async function makeBundle() {
  return bundle({ entryPoint: join(ROOT, 'src/index.ts'), publicDir: join(ROOT, 'public'), onProgress: () => {} });
}

export async function getComposition(serveUrl, spec, id = 'Main') {
  return selectComposition({ serveUrl, id, inputProps: spec, browserExecutable });
}

/** Resolve job dir + spec path, rebuilding when the markdown is newer than the spec. */
export function ensureSpec(jobArg, format) {
  const jobDir = resolve(ROOT, jobArg);
  const fmtGuess = format || guessFormat(jobDir);
  const specPath = join(jobDir, `spec.${fmtGuess}.json`);
  const mdNewest = Math.max(
    ...readdirSync(jobDir).filter((f) => f.endsWith('.md') && !f.startsWith('report')).map((f) => statSync(join(jobDir, f)).mtimeMs),
    statSync(join(ROOT, 'brand/DESIGN.md')).mtimeMs
  );
  if (!existsSync(specPath) || statSync(specPath).mtimeMs < mdNewest) {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/build.mjs'), jobArg, ...(format ? ['--format', format] : [])], { stdio: 'inherit', cwd: ROOT });
    if (r.status !== 0) process.exit(r.status || 1);
  }
  const p = existsSync(specPath) ? specPath : join(jobDir, readdirSync(jobDir).find((f) => /^spec\..+\.json$/.test(f)));
  return { jobDir, specPath: p, spec: JSON.parse(readFileSync(p, 'utf8')) };
}

function guessFormat(jobDir) {
  const ch = readdirSync(jobDir).find((f) => f.toLowerCase() === 'choreography.md');
  if (!ch) return 'vertical';
  const m = readFileSync(join(jobDir, ch), 'utf8').match(/^format:\s*([a-z]+)/m);
  return m ? m[1] : 'vertical';
}

/** Run Remotion's bundled ffmpeg/ffprobe (no system install needed). */
export function ffmpeg(args, { capture = false } = {}) {
  const r = spawnSync('npx', ['--no-install', 'remotion', 'ffmpeg', ...args], { cwd: ROOT, encoding: 'utf8', stdio: capture ? 'pipe' : ['ignore', 'ignore', 'pipe'], shell: process.platform === 'win32' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
export function ffprobe(args) {
  const r = spawnSync('npx', ['--no-install', 'remotion', 'ffprobe', ...args], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

export const opt = (args, n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
export const positional = (args, valueOpts) => args.find((a, i) => !a.startsWith('--') && !valueOpts.includes(args[i - 1]));
