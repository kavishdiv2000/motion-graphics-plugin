# Changelog

## 1.1.0 — 2026-10-23
- **Workspace folder system**: everything the plugin creates now lives in `<workspace>/.motion-graphics/` — static `DESIGN.md`,
  `assets/`, one `sessions/<id>/` folder per video (session.json, CONTENT.md, CHOREOGRAPHY.md, build/, output/), `inbox/`.
  The plugin folder is never written to.
- New bootstrap `skills/motion-graphics/scripts/init-workspace.mjs` (installs the engine into `.motion-graphics/.engine`, idempotent, upgrades on version change).
- New CLI `node .motion-graphics/mg.mjs` (init, status, doctor, design, session, inbox, validate, build, stills, render, qa, make, studio, demo, sfx, font add).
- `make` now writes `output/<id>-<fmt>.mp4`, `output/thumb-<fmt>.png` and `output/POST.md`; sessions track status, chat ref, outputs and history.
- **Chat mode** for interfaces without a shell/workspace (ChatGPT, claude.ai chat): gather, approve and hand over the three files in the conversation.
- Workspace assets: logo, licensed music, custom SFX and custom brand fonts (`mg font add`, exact metrics) from `.motion-graphics/assets/`.
- Removed `motion-studio/`, `jobs/` and the per-script npm commands.

## 1.0.0 — 2026-10-19
- Skills: motion-graphics (orchestrator), design-md, choreography-md, content-md, motion-craft, remotion-engine, sound-design, motion-qa, social-distribution.
- Engine (remotion-engine/assets/engine): Remotion 4.0.531, 8 scene templates, 7 reveal types, deterministic textures, exact glyph-metric text fitting, 50 procedural SFX, 4 music-bed presets, LUFS mastering, contact-sheet QA, multi-format output.
- Example design "Signal Ops" reverse-engineered from the reference reel + Brass Hands; example choreography/content recreating the reel.
