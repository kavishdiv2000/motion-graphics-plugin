---
name: remotion-engine
description: Set up, run, debug and extend the bundled Remotion render engine that the motion-graphics plugin installs into a workspace (.motion-graphics/.engine) to turn DESIGN.md + a session's CHOREOGRAPHY.md + CONTENT.md into a validated spec, synthesised audio and an MP4. Use for installing/repairing the engine, the mg CLI (build/stills/render/qa/make), render errors, custom fonts and assets, adding new scene templates or reveals, and performance tuning.
license: MIT
metadata:
  version: "1.1.0"
  remotion: "4.0.531"
---

# Remotion engine

`assets/engine/` is a complete, tested Remotion 4 project. It is **source only**: the plugin never runs it in place.
`motion-graphics/scripts/init-workspace.mjs` copies it into the user's workspace as `.motion-graphics/.engine/`,
installs dependencies, and creates the folder system (`motion-graphics/references/workspace.md`). Everything is then
driven through one CLI:

```bash
node .motion-graphics/mg.mjs <command>      # launcher → .motion-graphics/.engine/scripts/mg.mjs
```
Why Remotion, and what the alternatives are: `references/renderer-decision.md`.

## Commands (see `mg help`)
| Command | Output (inside `.motion-graphics/`) |
|---|---|
| `status` · `doctor` | sessions table · environment checks |
| `design new [--template\|--example]` · `design validate` | `DESIGN.md` |
| `session new "<title>" [--chat-ref] [--client] [--from <ref>] [--example]` | `sessions/<id>/` with session.json, CONTENT.md, CHOREOGRAPHY.md, build/, output/ |
| `validate <id> [--format f]` | `build/report.<f>.md` |
| `build <id> [--format f] [--no-audio] [--strict]` | `build/spec.<f>.json`, `build/cues.<f>.json`, `build/mix.<f>.wav` |
| `stills <id> [--frames 30,90] [--cols n] [--separate]` | `build/contact-<f>.png` (+ `build/stills/<f>/`) |
| `render <id> [--format f] [--preview] [--frames a-b]` | `output/<id>-<f>.mp4` (preview → `build/preview-<f>.mp4`) — h264, yuv420p BT.709, AAC 320k |
| `qa <id> [--format f]` | `build/qa.<f>.json` |
| `make <id> [--formats a,b] [--preview] [--skip-qa]` | everything above + `output/thumb-<f>.png` + `output/POST.md` |
| `studio <id>` | Remotion Studio on the session |
| `inbox` | queued sessions from `inbox/` |
| `sfx` · `font add <file> "<Family>" <w>` | `assets/sfx-library/` · `assets/fonts/` + `metrics.json` |
Exit codes: 0 ok · 1 validation/QA failure (read the message) · 2 usage/IO · 3 not initialised / engine not installed.

## Architecture
```
.motion-graphics/DESIGN.md ───────────┐
sessions/<id>/CHOREOGRAPHY.md ────────┼─ scripts/lib/md.mjs (front matter + ```yaml records)
sessions/<id>/CONTENT.md ─────────────┘            │
                         scripts/lib/compile.mjs ── validate (copy length, glyph fit, timing, contrast, claims, platform limits)
                                   │  uses src/lib/{templates,timeline,layout}.js  ← shared with the renderer
              build/spec.<fmt>.json + cues ── scripts/lib/mix.mjs (music.mjs bed + sfx.mjs hits → LUFS master) → build/mix.<fmt>.wav
                                   │
         .engine/.stage/<id>/ (assets + mixes) ── publicDir ─ src/Root.tsx → Video → Scene (+ Reveals, Texture) → output/*.mp4
```
- `scripts/mg.mjs` = CLI and folder management · `scripts/lib/workspace.mjs` = paths, sessions, stage · `scripts/lib/pipeline.mjs` = build/stills/render/qa/post.
- `src/lib/timeline.js` is pure JS used by both the React components and the audio builder: every word-in, decode-land
  and cut has one frame number, so sound can't drift from picture.
- Remotion copies its public dir into each bundle, so renders use a small per-session **stage** (`.engine/.stage/<id>/`
  = copy of `.motion-graphics/assets/` + the session's mixes), never the workspace itself.
- Asset paths in DESIGN.md (`assets/logo.svg`, `assets/fonts/X.woff2`, `assets/audio/bed.wav`) are relative to `.motion-graphics/`.

## Determinism contract (for any code you add)
1. The frame is the only clock: `useFrame()` (from `src/lib/frame.ts`), never `Date`, `performance`, CSS animations or transitions.
2. Randomness only via `rand(...keys)` / `mulberry32(hash(...))` from `src/lib/prng.js`, keyed by scene id + element + frame.
3. Fonts are bundled (`@fontsource/*` in `src/fonts.ts`) or come from `assets/fonts` via `design.fontFaces`; `Video.tsx` blocks until loaded.
4. Sizes come from the spec (`design.width/height`, `unit`), never `window` or `useVideoConfig()` inside scenes.
5. No copy, colours or timings hard-coded in components — they come from the spec.

## Where to change things
| Change | Where |
|---|---|
| a brand's look, sound, formats | `.motion-graphics/DESIGN.md` (no code) |
| a brand font / logo / music bed / custom SFX | `.motion-graphics/assets/…` (no code) |
| a new template, reveal, texture, validation rule, SFX recipe or music preset | the **plugin source** `remotion-engine/assets/engine/`, then re-run `init-workspace.mjs` in each workspace (it upgrades `.engine` when the version changes). Never patch `.engine/` directly: it gets replaced on upgrade. |

## Adding a template (when the 8 built-ins can't express an idea)
1. `src/lib/templates.js`: add `{ description, slots, required, accentSlot }`. Reuse slot names when possible.
   New slot? Add it to `SLOT_DEFAULTS` and to `BEAT_SLOTS`/`SLOT_ROLE` in `scripts/lib/compile.mjs`.
2. A vertical stack of text needs no renderer change (`Scene.tsx` is generic). For a special layout (chart, split, image)
   branch in `Scene.tsx` on `scene.template` and keep using the element timeline (`tl.elements`).
3. New reveal type: duration rule in `timeline.js → revealDuration`, events in `buildTimeline`, a component in
   `components/Reveals.tsx`, an SFX event name (document it in design-md/parameters.md).
4. Bump the engine `version` in package.json, test in a scratch workspace (`init-workspace.mjs` → `mg demo` → a session
   using the template → `mg stills` → look at mid and land frames).
5. Document it in choreography-md (template table) and content-md (slots).

## Performance
- Rendering ≈ 3–6× real time on a laptop. Use `mg stills` for look-checks and `mg make <id> --preview` for review cuts.
- Heavy: grain (SVG turbulence) and blur. Lower `texture.grain.fps` or disable grain if slow.
- Concurrency: `.engine/remotion.config.ts` → `Config.setConcurrency(n)` (Studio only; renders use Remotion's default).
- Volume: Remotion Lambda / Cloud Run with the same composition.

## Troubleshooting
| Symptom | Cause → fix |
|---|---|
| `exit 3: no .motion-graphics/` | run `init-workspace.mjs` with the workspace root |
| `engine dependencies not installed` | `cd .motion-graphics/.engine && npm ci` (needs network) or re-run the bootstrap |
| first render hangs on "Downloading Chrome" | offline/proxy → `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome` (Chromium ≥ 120 or chrome-headless-shell) |
| `Format "x" not defined` | add it to `canvas.formats` and `canvas.safe_area` in DESIGN.md |
| text in the wrong font | `family` must equal the font's name; custom files need `mg font add` + `file:` in DESIGN |
| `font.glyph` warning | the character isn't in the font → replace it |
| `brand.logo` info | logo file missing at `.motion-graphics/<path>` → add it or keep the wordmark |
| blank contact sheet | a component used `useCurrentFrame()` instead of `useFrame()` |
| huge `.engine` in OneDrive/Dropbox | set `MOTION_GRAPHICS_ENGINE_DIR` outside the synced folder and re-run the bootstrap |
| Windows: `npx` not found | run from a shell where Node is on PATH (PowerShell / Windows Terminal) |
| licence question | Remotion is free for individuals and companies of ≤ 3 people; larger companies need a company licence |
