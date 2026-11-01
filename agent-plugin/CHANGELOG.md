# Changelog

## 1.4.0 — 2026-10-31
- **Drum-free sound.** The synth music beds no longer play their drum layers (16th hat ticks, the kick, the heartbeat)
  in kit mode; `audio.music.percussion: true` brings them back (classic mode keeps them, unchanged).
- **All kits are drum-free**: every kick, low thump, sub drop and stutter riser was measured (low-frequency share of the
  attack) and replaced with a clean equivalent: launch's hit is a dry marimba note, its drop is off, crisp's hit a wooden
  bar, minimal's a celesta, taps became knocks and pops, `thock` space bars a laptop key. Every shipped take keeps < 30 %
  of its attack energy under 150 Hz.
- **New default kit `studio`**: a clean professional set: real CC0 recordings fitted as code (mechanical keys, a
  plastic click, a bamboo touch, a soft swish, a switch flip), rounded tonal pops, a warm struck tine for hero lands
  tuned into the music key, air risers, breath swells; gentle stop-downs (~6 dB, 0.3 s) only before big transitions.
- Kit definitions now live in `scripts/sfx-kits/*.json` (earshot kit format) and are rendered by `build-sfx-pack.py`.

## 1.3.0 — 2026-10-28
- **Sound kits (default for new designs)**: `audio.sfx.kit: launch | calm | crisp | minimal | none` — one line instead of
  an event → sound map. 51 sounds / 141 audited takes from [earshot](https://github.com/Leonxlnx/earshot) (MIT; designed
  in code or fitted from CC0 recordings), pre-rendered into `remotion-engine/assets/engine/sfx-pack/` (pure Node at runtime).
- **Accurate placement**: every take lands by its measured onset / peak / end plus per-role offsets measured on
  professional launch films (taps lead −11…−60 ms, whoosh / swell peaks +37…+42 ms after the cut, risers peak into hits).
- **Levels over the music**: effects sit 3–10 dB over the music's level in the second before them; minimum gaps in runs;
  take rotation; ±1 dB / ±3 ms humanising; text and bell notes tuned into the music's key.
- **Music stop-down** before hits (launch kit) instead of ducking after them; one accent at a time (riser → impact kept).
- New events `words_done` (one tuned note per resolved line) and `type_space`; scene extras accept `role:` and `note:`;
  `audio.sfx.roles` / `audio.sfx.events` overrides; `mg sfx kits`, `mg sfx --kit <name>` audition.
- QA: first sound ≤ 0.5 s, accents per 10 s, stacked accents, sync; kit masters keep 0.5 dB codec headroom so the AAC
  file stays ≤ −1 dBTP.
- `kit: classic` keeps the 50-sound synth library and renders byte-identically to 1.2 (the Signal Ops example uses it).
- Dev: `scripts/build-sfx-pack.py` regenerates the pack from earshot; `kit-docs.mjs` writes `sound-design/references/kits.md`.

## 1.2.0 — 2026-10-27
- **Token usage per video**: `sessions/<id>/usage.json` + `usage.log.jsonl` (input, cache write/read, output, reasoning, total;
  by model, client and chat) and `usage/workspace.json` for work not tied to one video.
- Sources: Claude Code transcripts (exact, subagents included), Codex rollouts (exact), Cursor `afterAgentResponse` (best effort),
  manual `mg usage add` for clients that expose nothing (Copilot, chat UIs).
- New CLI: `mg usage [<ref>|--all] [--json]`, `mg usage add`, `mg usage hooks install codex|cursor|claude`, `mg usage hook <client>`.
- Per-call attribution: each model call is counted toward the session it was working on; chats that switch videos are split.
- Build: works under Git Bash on Windows; `build/agent-plugin` and `build/claude-plugin` are installable folders for VS Code / Copilot.

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
