# Decision: procedural audio, timeline-driven

## Options considered
| Option | Determinism | Cost | Quality | Sync | Licensing | Verdict |
|---|---|---|---|---|---|---|
| **Procedural synthesis in Node (chosen)** | ✔ exact | free | good; "designed", not "produced" | ✔ frame-exact from the shared timeline | none (our code) | default |
| Licensed SFX/music libraries (Splice, Soundly, Epidemic, Artlist) | ✔ files | subscription | excellent | needs a mapping layer (supported via `public/sfx/custom/`, `music.source: file`) | per-licence terms | optional upgrade |
| AI SFX (ElevenLabs Sound Effects, Stable Audio…) | ✘ per call (✔ if cached) | per generation | varies | same as files | check terms | generate **once**, save as WAV |
| AI music (Suno, Udio, Stable Audio) | ✘ per call | per generation | good | tempo must be set/measured | check commercial terms | render once → `music.source: file` |
| Remotion `<Audio>` per event | ✔ | free | same as the files used | ✔ | — | used only for the final mixed track (simpler, one mastering stage) |

## How it works
1. `src/lib/timeline.js` emits events per scene (`label_in`, `word_in`, `decode_start`, `decode_land`, `type_char`,
   `count_tick`, `strike`, `logo_in`, `exit`) plus `transition` at cuts. Those are the same frame numbers the renderer animates.
2. `mix.mjs → resolveHits` maps events to sounds through `DESIGN.md audio.sfx.map`, applies per-event gains, throttles rapid
   repeats, humanises micro-events by ±1.5 dB, and flags hero hits for ducking.
3. `music.mjs → makeBed` synthesises a bed at the video's BPM/key with layers switched by the per-scene energy curve.
4. Mix → integrated loudness (ITU-R BS.1770-4, K-weighted, gated) → gain to −14 LUFS → look-ahead limiter at −1.3 dBFS
   → second loudness pass → 16-bit 48 kHz WAV → muxed by Remotion as AAC 320k.

## Reproducing the reference reel's audio
Measured 100 BPM (onsets every 0.60 s), a sub/drone floor, a 500–1200 Hz plucked sequence, high glitch transients on every
reveal, and low hits on hero lands, all at ≈ −14 LUFS. These map to `signal_drone` @100 BPM with `glitch_tick` /
`key_soft` / `scramble_chatter` / `impact_sub` / `static_burst`. Method and code: `sound-design/references/recreate-reference-audio.md`.

## Limits and upgrades
- The synth is intentionally simple (no sample playback, no sophisticated reverb). If a brand needs a "produced" sound,
  keep the event map and swap in licensed WAVs with the same ids; the timeline sync still holds.
- Voice-over is not built in (`audio.voiceover.enabled` is reserved). Add it as a file layer and duck the bed under it;
  timing beats would then need to follow the VO, which is a different choreography mode.
