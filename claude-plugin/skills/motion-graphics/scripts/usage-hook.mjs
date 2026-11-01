#!/usr/bin/env node
// Token-usage hook. Hosts call it after each agent turn with their hook JSON on stdin:
//   Claude Code (shipped in the Claude plugin's hooks/hooks.json):  node "${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/scripts/usage-hook.mjs" claude-code
//   any client, by hand:  node <this file> claude-code|codex|cursor  < hook.json
// It finds <workspace>/.motion-graphics/ from the hook's cwd and does nothing when there is none, so it is safe in
// every project. It never prints and always exits 0. Logic: remotion-engine/assets/engine/scripts/lib/usage.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
try {
  const U = await import(pathToFileURL(join(here, '..', '..', 'remotion-engine', 'assets', 'engine', 'scripts', 'lib', 'usage.mjs')).href);
  const r = U.runHook(process.argv[2] || 'claude-code', U.readStdinJson());
  if (process.env.MG_USAGE_DEBUG) console.error(JSON.stringify(r));
} catch (e) {
  if (process.env.MG_USAGE_DEBUG) console.error(e);
}
process.exit(0);
