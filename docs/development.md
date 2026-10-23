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
2. Work on the engine inside a dev copy: `cd agent-plugin/skills/remotion-engine/assets/engine && npm install`. Then
   `npm run build -- jobs/demo && npm run stills -- jobs/demo` and **look** at the sheet. Generated files are git-ignored and
   excluded from sync.
3. `node scripts/sync-plugins.mjs`, then `node scripts/validate-plugins.mjs`, then `claude plugin validate ./claude-plugin --strict`.
4. Bump the versions in `agent-plugin/plugin.json`, `claude-plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`,
   and add a CHANGELOG entry.

## Engine extension points
| Want | Touch |
|---|---|
| new scene template | `src/lib/templates.js` (+ `Scene.tsx` only for non-stack layouts); document in choreography-md and content-md |
| new reveal | `timeline.js` (duration + events), `components/Reveals.tsx`, `Scene.tsx` switch, SFX event name |
| new texture layer | `components/Texture.tsx` + DESIGN `texture.*` + parameters.md |
| new SFX | `scripts/lib/sfx.mjs` entry → `npm run sfx -- --only id` → `node scripts/sfx-docs.mjs …/sfx-catalogue.md` |
| new music preset | `scripts/lib/music.mjs → PRESETS` + sound-design table |
| new validation rule | `scripts/lib/compile.mjs` (issue code, message, **fix** text) |
| new font | `npm i @fontsource/x`, import in `src/fonts.ts`, `npm run metrics` |

Rules: keep the determinism contract (remotion-engine skill); every validation issue must say how to fix it;
every new capability gets documented in the skill a model would read at that step.

## Upgrading Remotion
`npx remotion upgrade` in the dev engine → re-pin exact versions (≥ 2 weeks old) → render `jobs/demo` and compare the
contact sheet with `docs/samples/contact-vertical.png` → run QA → sync.

## CI suggestion
```yaml
- run: node scripts/sync-plugins.mjs --check
- run: node scripts/validate-plugins.mjs
- run: cd agent-plugin/skills/remotion-engine/assets/engine && npm ci && npm run build -- jobs/demo --validate-only
```
