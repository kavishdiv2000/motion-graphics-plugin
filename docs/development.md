# Development guide

## Repository layout
```
motion-graphics-plugin/
├─ agent-plugin/                 Agent Plugins 1.0 (canonical source of shared skills + engine)
│  ├─ plugin.json  CHANGELOG.md
│  └─ skills/<name>/SKILL.md (+ references/, assets/)
├─ claude-plugin/                Claude Code plugin (generated mirror + Claude-only parts)
│  ├─ .claude-plugin/plugin.json
│  ├─ skills/  (mirrored shared skills + make-video, setup-design, batch-videos)
│  └─ agents/  (choreographer, motion-qa-critic)
├─ .claude-plugin/marketplace.json   Claude Code marketplace → ./claude-plugin
├─ .agents/plugins/marketplace.json  Codex/ChatGPT repo marketplace → ./agent-plugin
├─ scripts/sync-plugins.mjs  scripts/validate-plugins.mjs
└─ docs/
```

## Workflow
1. Edit shared skills or the engine in `agent-plugin/skills/…` only.
2. Test engine changes in a scratch workspace, never inside the plugin:
   `node agent-plugin/skills/motion-graphics/scripts/init-workspace.mjs /tmp/mg-test --force-engine`, then
   `node /tmp/mg-test/.motion-graphics/mg.mjs demo && node /tmp/mg-test/.motion-graphics/mg.mjs stills demo` and **look** at the
   sheet. Bump the engine `version` in package.json so existing workspaces upgrade on their next setup run.
3. `node scripts/sync-plugins.mjs`, then `node scripts/validate-plugins.mjs`, then `claude plugin validate ./claude-plugin --strict`.
4. Bump the versions in `agent-plugin/plugin.json`, `claude-plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`,
   and add a CHANGELOG entry.

## Engine extension points
| Want | Touch |
|---|---|
| new scene template | `src/lib/templates.js` (+ `Scene.tsx` only for non-stack layouts); document in choreography-md and content-md |
| new reveal | `timeline.js` (duration + events), `components/Reveals.tsx`, `Scene.tsx` switch, SFX event name |
| new texture layer | `components/Texture.tsx` + DESIGN `texture.*` + parameters.md |
| new SFX | `scripts/lib/sfx.mjs` entry → `node scripts/sfx-library.mjs --only id --out /tmp/sfx` → `node scripts/sync-plugins.mjs` (regenerates the catalogue) |
| new music preset | `scripts/lib/music.mjs → PRESETS` + sound-design table |
| new validation rule | `scripts/lib/compile.mjs` (issue code, message, **fix** text) |
| new bundled font | `npm i @fontsource/x` in the engine source, import in `src/fonts.ts`, `node scripts/font-metrics.mjs` (brand fonts per workspace: `mg font add`) |

Rules: keep the determinism contract (remotion-engine skill); every validation issue must say how to fix it;
every new capability gets documented in the skill a model would read at that step.

## Upgrading Remotion
`npx remotion upgrade` in the dev engine → re-pin exact versions (≥ 2 weeks old) → render the demo session in a scratch workspace and compare the
contact sheet with `docs/samples/contact-vertical.png` → run QA → sync.

## CI suggestion
```yaml
- run: node scripts/sync-plugins.mjs --check
- run: node scripts/validate-plugins.mjs
- run: node agent-plugin/skills/motion-graphics/scripts/init-workspace.mjs ./ci-ws && node ci-ws/.motion-graphics/mg.mjs demo
```
