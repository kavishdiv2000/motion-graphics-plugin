#!/usr/bin/env node
// Bootstrap the motion-graphics folder system in a workspace. Dependency-free; safe to re-run (idempotent).
//
//   node <plugin>/skills/motion-graphics/scripts/init-workspace.mjs [workspace-dir] [--no-install] [--force-engine]
//
// Creates <workspace>/.motion-graphics/ (DESIGN.md home, assets/, sessions/, inbox/, launcher mg.mjs),
// installs the render engine into .motion-graphics/.engine (or MOTION_GRAPHICS_ENGINE_DIR), runs npm install,
// and never writes anything inside the plugin itself.
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const workspace = resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const mg = join(workspace, '.motion-graphics');
const engineSrc = resolve(here, '../../remotion-engine/assets/engine');
const engineDst = process.env.MOTION_GRAPHICS_ENGINE_DIR ? resolve(process.env.MOTION_GRAPHICS_ENGINE_DIR) : join(mg, '.engine');

if (!existsSync(join(engineSrc, 'package.json'))) {
  console.error(`✖ engine source not found at ${engineSrc} (is the plugin complete?)`);
  process.exit(2);
}
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 18 || (maj === 18 && min < 18)) {
  console.error(`✖ Node ${process.versions.node} is too old — install Node 20+ (nodejs.org) and re-run.`);
  process.exit(2);
}
if (resolve(workspace).startsWith(resolve(here, '../../..'))) {
  console.error('✖ refusing to initialise inside the plugin folder — pass the user workspace path.');
  process.exit(2);
}

// 1. copy (or upgrade) the engine — keep node_modules when the lockfile is unchanged
const digest = (f) => (existsSync(f) ? createHash('sha1').update(readFileSync(f)).digest('hex') : null);
const srcVersion = JSON.parse(readFileSync(join(engineSrc, 'package.json'), 'utf8')).version;
const marker = join(engineDst, '.engine-source.json');
const installed = existsSync(marker) ? JSON.parse(readFileSync(marker, 'utf8')) : null;
const srcLock = digest(join(engineSrc, 'package-lock.json'));
const needCopy = flag('force-engine') || !installed || installed.version !== srcVersion || installed.lock !== srcLock || !existsSync(join(engineDst, 'scripts', 'mg.mjs'));
if (needCopy) {
  mkdirSync(engineDst, { recursive: true });
  const keepModules = installed && installed.lock === srcLock && existsSync(join(engineDst, 'node_modules'));
  for (const e of readdirSync(engineDst)) if (!(keepModules && e === 'node_modules')) rmSync(join(engineDst, e), { recursive: true, force: true });
  cpSync(engineSrc, engineDst, { recursive: true, filter: (s) => !/[\\/](node_modules|\.stage|sfx-library)([\\/]|$)/.test(s) });
  writeFileSync(marker, JSON.stringify({ version: srcVersion, lock: srcLock, copied: new Date().toISOString(), from: engineSrc }, null, 2));
  console.log(`✔ engine ${srcVersion} → ${engineDst}${installed ? ` (was ${installed.version})` : ''}`);
} else console.log(`✔ engine ${srcVersion} already in place`);

// 2. dependencies
if (!flag('no-install') && !existsSync(join(engineDst, 'node_modules', 'remotion'))) {
  console.log('… npm install (first time ~1 min, ~300 MB)');
  const npm = spawnSync('npm', [existsSync(join(engineDst, 'package-lock.json')) ? 'ci' : 'install', '--no-audit', '--no-fund'], { cwd: engineDst, stdio: 'inherit', shell: process.platform === 'win32' });
  if (npm.status !== 0) {
    console.error('✖ npm install failed (offline? proxy?). The folder system is still created; re-run this script when online.');
  }
}

// 3. folder system, launcher, config (single source of truth: the engine CLI)
const r = spawnSync(process.execPath, [join(engineDst, 'scripts', 'mg.mjs'), 'init', '--workspace', workspace], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
if (/onedrive|dropbox|icloud/i.test(workspace) && !process.env.MOTION_GRAPHICS_ENGINE_DIR) {
  console.log('▲ This workspace is in a synced folder. Exclude .motion-graphics/.engine from sync (≈300 MB), or re-run with MOTION_GRAPHICS_ENGINE_DIR=<folder outside the sync>.');
}
console.log(`\nnext:\n  node .motion-graphics/mg.mjs status\n  node .motion-graphics/mg.mjs demo        (smoke test with the bundled example)`);
