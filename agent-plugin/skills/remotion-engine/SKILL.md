---
name: remotion-engine
description: Set up, run, debug and extend the bundled Remotion render engine (motion-studio) that turns DESIGN.md + CHOREOGRAPHY.md + CONTENT.md into a validated spec.json, synthesised audio and an MP4. Use for installing the engine, the build/stills/render/qa commands, render errors, custom fonts, adding new scene templates or reveals, and performance tuning.
license: MIT
metadata:
  version: "1.0.0"
  remotion: "4.0.531"
---

# Remotion engine (motion-studio)

`assets/engine/` is a complete, tested Remotion 4 project. Copy it into the user's project as
`motion-studio/` (see the motion-graphics skill, step 0), then use only the npm scripts below.
Why Remotion and what the alternatives are: `references/renderer-decision.md`.

## Commands
| Command | Does | Output |
|---|---|---|
| `npm run new -- <id>` | scaffold `jobs/<id>/` from the templates | CHOREOGRAPHY.md, CONTENT.md |
| `npm run build -- jobs/<id> [--format f] [--validate-only] [--no-audio] [--strict]` | parse → validate → spec → audio mix | `spec.<f>.json`, `report.<f>.md`, `cues.<f>.json`, `public/jobs/<id>/mix.<f>.wav` |
| `npm run stills -- jobs/<id> [--frames 30,90] [--cols 7] [--separate]` | QA frames from the composition (~10 s) | `contact-<f>.png` |
| `npm run render -- jobs/<id> [--format f] [--scale 0.5] [--frames a-b]` | the MP4 (h264, yuv420p BT.709, AAC 320k) | `jobs/<id>/out/<id>-<f>.mp4` |
| `npm run qa -- jobs/<id>` | probe + loudness + contact sheet | `qa.<f>.json` |
| `npm run make -- jobs/<id> [--formats vertical,square] [--preview]` | build → render → qa | all of the above |
| `npm run sfx` | render all 50 SFX + audition reel | `public/sfx/*.wav`, `INDEX.md` |
| `npm run metrics [file family weight]` | glyph advance tables for exact text fitting | `src/lib/font-metrics.json` |
| `npm run studio` | Remotion Studio preview of the last build | browser UI |

Exit codes: 0 ok · 1 validation/QA failure (read the message) · 2 usage/IO error.

## Architecture
```
brand/DESIGN.md ─┐
jobs/<id>/CHOREOGRAPHY.md ─┼─ scripts/lib/md.mjs (front matter + ```yaml records)
jobs/<id>/CONTENT.md ─┘            │
                         scripts/lib/compile.mjs ── validate (copy length, glyph fit, timing, contrast, claims, platform limits)
                                   │  uses src/lib/{templates,timeline,layout}.js  ← shared with the renderer
                     spec.<fmt>.json + cues ─── scripts/lib/mix.mjs (music.mjs bed + sfx.mjs hits → LUFS master) → mix.wav
                                   │
                    src/Root.tsx → Video.tsx → Scene.tsx (+ Reveals, Texture) → renderMedia → MP4
```
**The key design decision:** `src/lib/timeline.js` is pure JS imported by both the React components *and* the
Node audio builder. Every word-in, decode-land and cut has one frame number, so sound can't drift from picture.
`src/lib/layout.js` + `font-metrics.json` likewise make text fitting identical in validation and render.

## Determinism contract (for any code you add)
1. The frame is the only clock: `useFrame()` (from `src/lib/frame.ts`), never `Date`, `performance`, CSS animations or transitions.
2. Randomness only via `rand(...keys)` / `mulberry32(hash(...))` from `src/lib/prng.js`. Key it by scene id + element + frame.
3. Fonts are bundled (`@fontsource/*` imported in `src/fonts.ts`); `Video.tsx` blocks rendering until they're loaded.
4. Sizes come from the spec (`design.width/height`, `unit`), never `window` or `useVideoConfig()` inside scenes (the contact sheet renders scenes at other sizes).
5. No copy, colours or timings hard-coded in components. They come from the spec.

## Adding a template (when the 8 built-ins can't express an idea)
1. `src/lib/templates.js`: add `{ description, slots, required, accentSlot }`. Reuse existing slot names when you can.
   New slot? Add it to `SLOT_DEFAULTS` (default reveal + role) and to `BEAT_SLOTS`/`SLOT_ROLE` in `scripts/lib/compile.mjs`.
2. If it's a vertical stack of text, **you're done**: `Scene.tsx` renders any template generically. For a special layout
   (a chart, a two-column split, an image), branch in `Scene.tsx` on `scene.template` and keep using the element timeline
   (`tl.elements`) for all timing.
3. New reveal type? Add a duration rule in `timeline.js → revealDuration`, events in `buildTimeline`, a component in
   `components/Reveals.tsx`, and an SFX mapping key (document it in design-md/parameters.md).
4. Add a scene using it to a test job, then run `npm run build` and `npm run stills`, and **look** at both mid and land frames.
5. Document it in choreography-md (template table) and content-md (slots).

## Custom / commercial fonts
1. Put `MyFont-Bold.woff2` in `public/fonts/`.
2. Add to `src/fonts.ts`:
   ```ts
   import { staticFile } from 'remotion';
   const f = new FontFace('MyFont', `url(${staticFile('fonts/MyFont-Bold.woff2')})`, { weight: '700' });
   document.fonts.add(f); f.load();
   ```
3. `npm run metrics -- public/fonts/MyFont-Bold.woff2 "MyFont" 700`
4. Set `typography.families.display.family: MyFont` in DESIGN.md. Check the licence covers video/broadcast use.

## Brand assets
Logo → `public/brand/logo.svg` (referenced by `brand.logo.primary`). Licensed music → `public/audio/bed.wav`
(16-bit, 48 kHz; convert with `npx remotion ffmpeg -i in.mp3 -ar 48000 -ac 2 -sample_fmt s16 public/audio/bed.wav`)
and set `audio.music.source: file`, `file: audio/bed.wav`.

## Performance
- Rendering costs about 3–6× real time on a laptop. Use `--scale 0.5` for previews and `npm run stills` for look-checks.
- Heavy: grain (SVG turbulence) and blur filters. If renders are slow, lower `texture.grain.fps` or disable grain for previews.
- `remotion.config.ts` → `Config.setConcurrency(n)` to use more cores.
- For volume, use Remotion Lambda/Cloud Run (same composition; see remotion.dev/docs/lambda).

## Troubleshooting
| Symptom | Cause → fix |
|---|---|
| First render hangs on "Downloading Chrome" | offline/proxy → set `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome` (any Chromium ≥ 120 or chrome-headless-shell) |
| `Format "x" not defined` | add it to `canvas.formats` and `canvas.safe_area` in DESIGN.md |
| Text in the wrong font | family name ≠ the font's internal name; check `src/fonts.ts`, rerun `npm run metrics` |
| `font.glyph` warning | the character isn't in the font subset → replace it |
| Blank contact sheet | a component used `useCurrentFrame()` instead of `useFrame()` |
| Audio too quiet/loud on a platform | QA loudness ±1 LU of −14; adjust `audio.music.gain_db` (bed) or `audio.sfx.gain_db` |
| Output `yuvj420p` | keep `colorSpace: 'bt709'` in `scripts/render.mjs` |
| Windows: `npx` not found from scripts | run from the Node.js command prompt / PowerShell with Node on PATH |
| Licence question | Remotion is free for individuals and companies with ≤ 3 employees; larger companies need a Remotion company licence |
