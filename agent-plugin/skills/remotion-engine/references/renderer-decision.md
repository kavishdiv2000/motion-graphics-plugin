# Renderer decision: Remotion (with documented alternatives)

## Requirements
1. **Deterministic**: the same input gives the same pixels and samples (debuggable, cacheable, reviewable).
2. **Code-native**: an LLM writes and edits it, so it must be a mainstream language with lots of training data.
3. **Typography-grade**: real font shaping, kerning, letter-spacing, CSS filters (blur, glow), blend modes.
4. **Headless, scriptable rendering** from a CLI or Node API, so it can run on schedules and in CI.
5. **Audio**: frame-accurate sync and muxing.
6. **Multi-aspect** from one source; resolution-independent.
7. **Previewable**: a human can scrub the timeline.

## Options compared
| Option | Determinism | LLM fluency | Typography | Headless | Audio | Preview | Licence | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Remotion 4** (React → Chromium frames → FFmpeg) | ✔ frame-pure `useCurrentFrame` | ✔✔ React/TS, huge corpus | ✔✔ full CSS + web fonts | ✔ CLI + Node API, Lambda | ✔ `<Audio>`, mixing | ✔ Studio | free ≤ 3 employees, paid company licence above | **Chosen** |
| Motion Canvas (TS generators → canvas) | ✔ | ◐ niche API | ◐ canvas text, manual layout | ◐ editor-centric render | ◐ | ✔ editor | MIT | good for explainers, weaker for type-heavy, automated work |
| Revideo (Motion Canvas fork, headless) | ✔ | ◐ niche | ◐ | ✔ | ✔ | ✔ | MIT | viable MIT alternative; smaller ecosystem |
| HTML/CSS + Playwright frame capture + FFmpeg (DIY) | ✔ if you virtualise time | ✔✔ | ✔✔ | ✔ | DIY | DIY | all MIT/BSD | **fallback** when Remotion licensing is a blocker; you rebuild what Remotion gives free |
| Manim (Python) | ✔ | ◐ | ◐ LaTeX-centric | ✔ | ◐ | ◐ | MIT | maths explainers only |
| After Effects + ExtendScript / nexrender | ✔ | ✘ ExtendScript rare | ✔✔ | ◐ needs AE licence + Windows/mac | ✔ | ✔ | Adobe licence | legacy studios only |
| Lottie / Rive | ✔ | ◐ JSON is hard to author | ◐ | ◐ needs a renderer | ✘ | ✔ | MIT/ prop. | delivery formats, not production pipelines |
| FFmpeg drawtext only | ✔ | ✔ | ✘ crude | ✔ | ✔ | ✘ | LGPL | captions, not motion design |
| AI video models (Veo, Sora, Runway…) | ✘ | n/a | ✘ text is unreliable | ✔ API | ◐ | ✘ | per-second pricing | B-roll and texture plates only; never for brand typography |

## Why Remotion wins for this pipeline
- `frame → pixels` is a pure function, which is exactly the determinism contract we need for QA loops and caching.
- React/TypeScript is the code models write best, so Sonnet/GPT-class models can extend templates safely.
- Chromium's text engine gives professional typography (kerning, tracking, `font-feature-settings`, blur/glow) for free.
- One composition renders any size via `calculateMetadata`, so a single spec yields 9:16, 4:5, 1:1 and 16:9.
- The Node API (`@remotion/renderer`) gives programmatic stills, which powers the cheap "look before render" loop.
- It scales out with Remotion Lambda when volume demands it.

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Company licence cost (> 3 employees) | budget it, or switch to the DIY fallback below (the spec, timeline, audio and validator are renderer-agnostic) |
| Chromium download on first run | `REMOTION_BROWSER_EXECUTABLE` to reuse an installed Chrome |
| Render speed (~3–6× real time) | stills loop, `--scale 0.5` previews, concurrency, Lambda |
| Version drift | exact pins in package.json (`4.0.531`); upgrade deliberately with `npx remotion upgrade` and re-run the demo job |

## DIY fallback outline (MIT-only stack)
The renderer-agnostic parts (`scripts/lib/*`, `src/lib/{timeline,layout,templates,prng}.js`) stay. Replace React with:
1. a static HTML page whose script exposes `window.renderFrame(n)`, drawing the scene for frame `n` from spec.json
   (port `Scene.tsx` to vanilla DOM; the logic is the same pure functions);
2. Playwright: for each frame, call `renderFrame(n)` and `page.screenshot()` into PNGs (or pipe raw frames);
3. `ffmpeg -framerate 30 -i %05d.png -i mix.wav -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 320k out.mp4`.
This takes about a day of engineering; Remotion makes that unnecessary unless the licence is a blocker.

## Audio stack decision
- **Procedural synthesis in Node (chosen)**: zero dependencies, deterministic, royalty-free, beat-locked to the timeline,
  and sounds are versioned as code. The trade-off is that it's less "produced" than a top library, which the presets mitigate.
- **Licensed SFX libraries** (Soundly, Splice, Epidemic Sound, Artlist): richer and fast, but licence per use and they
  need a file-mapping layer. Supported: drop WAVs in `.motion-graphics/assets/sfx/` and use their file names as ids (see the sound-design skill).
- **AI SFX** (e.g. ElevenLabs Sound Effects, Stable Audio): fine for one-off hero sounds. Generate once, save as WAV,
  version it. Never generate at render time (that breaks determinism and costs per render).
- **AI music** (e.g. Suno/Udio/Stable Audio): check commercial terms; render once to a WAV bed and use `music.source: file`.
