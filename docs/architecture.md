# Architecture

## Pipeline
```
                      ┌──────────── creative judgement (the model, guided by skills) ────────────┐
brief / post / notes ─► CONTENT.md ──► CHOREOGRAPHY.md ──┐                                     │
brand / site / video ─► DESIGN.md (once) ────────────────┤                                     │
                                                         ▼                                     │
                       ┌──────────── deterministic system (the engine) ───────────┐            │
                       │ md.mjs parse → compile.mjs resolve + VALIDATE ── errors ─┼──► fix markdown
                       │        │ spec.json                                       │            │
                       │        ├─► timeline.js (frame of every word/char/cut) ◄──┼─ shared ─┐ │
                       │        ├─► mix.mjs: music.mjs bed + sfx.mjs hits → LUFS → mix.wav │ │
                       │        └─► Remotion: Video → Scene → Reveals/Texture ◄────────────┘ │
                       │              ├─ ContactSheet still (cheap look) ───────────────────► LOOK + rubric ⟲
                       │              └─ renderMedia → MP4 → qa.mjs (probe, loudness) ─────► LOOK + rubric ⟲
                       └──────────────────────────────────────────────────────────┘
                                                         ▼
                                       MP4 per format + contact sheet + post copy
```

## Why this split
| Concern | Owner | Reason |
|---|---|---|
| story, hero words, accent choice, pacing intent | model (skills) | needs judgement |
| layout maths, text fitting, timing, SFX placement, loudness | engine | must be exact and repeatable; models are bad at this |
| catching mistakes | both | the validator (objective) plus contact-sheet critique (subjective) |

A model never writes animation code for a normal video. It writes about 60–120 lines of markdown. That's why
mid-tier models succeed: the space of possible outputs is small, and every output is checked.

## Agent roles (single agent by default, multi-agent when it pays)
| Role | In the agent plugin | In the Claude plugin |
|---|---|---|
| Creative director / orchestrator | `motion-graphics` skill | `/make-video` → `motion-graphics` skill |
| Brand / visual-system designer | `design-md` skill | `/setup-design` |
| Scriptwriter | `content-md` skill + `copywriting.md` | same |
| Storyboard / choreographer | `choreography-md` skill | `choreographer` subagent (optional) |
| Motion designer knowledge | `motion-craft` skill | same |
| Animation engineer / renderer | `remotion-engine` skill + engine | same |
| Audio designer | `sound-design` skill + engine | same |
| QA | `motion-qa` skill | `motion-qa-critic` subagent (independent review) |
| Distribution | `social-distribution` skill | same |
| Producer (batch) | — | `/batch-videos` (unattended) |

Multi-agent is used only where independence adds value (QA review), or where parallel work does (variants and batches).
Everything else is one agent following one procedure, which is cheaper and keeps the context coherent.

## Determinism contract
Same DESIGN + CHOREOGRAPHY + CONTENT → byte-identical spec and audio, and visually identical frames:
seeded PRNG only, bundled fonts, the frame as the only clock, sizes taken from the spec, exact glyph metrics, pinned dependency versions.

## Files
```
motion-studio/                       (copied from …/remotion-engine/assets/engine)
├─ brand/DESIGN.md                   static brand system
├─ jobs/<id>/CHOREOGRAPHY.md|CONTENT.md   inputs
│   ├─ spec.<fmt>.json  report.<fmt>.md  cues.<fmt>.json  qa.<fmt>.json  contact-<fmt>.png
│   └─ out/<id>-<fmt>.mp4
├─ queue/                            batch inbox (Claude plugin)
├─ public/brand · public/audio · public/sfx/custom   brand assets, licensed beds, custom SFX
├─ src/lib/{templates,timeline,layout,prng}.js       shared pure logic
├─ src/{Root,Video,ContactSheet}.tsx, scenes/Scene.tsx, components/{Reveals,Texture}.tsx
└─ scripts/{build,stills,render,qa,make,new-job,sfx-library,font-metrics,sfx-docs}.mjs + lib/
```

## Two plugins, one source
`agent-plugin/skills/` is canonical. `scripts/sync-plugins.mjs` mirrors it into `claude-plugin/skills/` (excluding
generated files) and refreshes the engine's templates from the skill references. The Claude plugin adds: entry-point
skills with arguments (`make-video`, `setup-design`, `batch-videos`), subagents, and `${CLAUDE_PLUGIN_ROOT}` paths.
The agent plugin stays within the portable subset of the spec (skills only; no client-specific directories).
