# Decision: timeline-driven audio — sound kits (earshot) by default, procedural synthesis as classic

## 1.4: drum-free, and a professional default kit (`studio`)
Listening to 1.3 renders, the user heard unwanted drums. Two causes, both confirmed by measurement: the synth beds'
drum layers (16th hat ticks above energy 0.6, a kick in pulse_minimal, a heartbeat in dark_tension) and kick-like kit
members (earshot's `cut_hit/punch` hero hit and `cut_hit/kick` drop, `pro_pop_in` thumps, finger taps on wood).
Fix: beds play without drums in kit mode (`music.percussion: true` restores them), every kit member whose attack
(first 120 ms after onset) has > 30 % of its energy under 150 Hz was replaced by a clean equivalent or switched off, and
a new curated default `studio` uses real CC0 recordings, tonal pops and a key-tuned struck tine for hero lands. Kit
definitions live in `scripts/sfx-kits/` (earshot kit format) and every shipped take is re-measured after each build.

## 1.3: sound kits from earshot
The 1.0–1.2 engine placed every sound file's **start** on its cue frame at a fixed level and ducked the music after hero
hits. Measured against professional launch films that is inaccurate in three ways: a whoosh's loudest moment arrived
~0.1–0.2 s late, effects ignored how loud the music was at that moment, and the music ducked *after* hits instead of
making room *before* them. [earshot](https://github.com/Leonxlnx/earshot) (MIT) measured those rules and ships sounds
built for them, so 1.3 ports its kit system:

| | Classic (≤ 1.2) | Kits (1.3) |
|---|---|---|
| sounds | 50 Node synth recipes | 43 earshot sounds, 127 audited takes in 5 drum-free kits (designed in code, or CC0 recordings fitted as code), 16-bit WAV in `engine/sfx-pack/` (~10 MB) |
| placement | file start on the frame | measured onset / peak / end (earshot's definitions; JS port matches earshot to < 1 ms) + per-role offsets (−60…+42 ms) |
| level | fixed dB per event | loudest 50 ms set `bed_db` (3–10 dB) over the music's median level in the second before the cue |
| runs | frame throttles | per-role minimum gaps (66–159 ms), take rotation, ±1 dB / ±3 ms humanising |
| tonal | fixed pitch | text / bell notes tuned into the music's key |
| music | ducked after hero hits | stop-down: −9 dB for 0.4 s before hits, back on the hit |
| QA | loudness, true peak | + first sound ≤ 0.5 s, accents per 10 s, stacked accents, true peak after AAC |

Why pre-rendered WAVs rather than earshot itself: earshot is Python + PyTorch (1.1 GB of models for its listening
tools). Its sound bank renders with numpy / scipy only, so `scripts/build-sfx-pack.py` renders the four kit presets once
with earshot's own renderer and audit; users and agents need only Node. Rejected: porting earshot's recipes to JS (large,
fragile), requiring earshot at runtime (breaks the Node-only install), FLAC + ffmpeg decode (halves the size, adds a
moving part). Classic mode is kept byte-identical for existing designs and the Signal Ops example.

Not adopted (yet): earshot's listening / critique models (an optional QA step if earshot is installed is a natural next
step), its per-film `fit` of real recordings, and its `real-sound` licensed-recording workflow.

# Classic: procedural audio, timeline-driven

## Options considered
| Option | Determinism | Cost | Quality | Sync | Licensing | Verdict |
|---|---|---|---|---|---|---|
| **Procedural synthesis in Node (chosen)** | ✔ exact | free | good; "designed", not "produced" | ✔ frame-exact from the shared timeline | none (our code) | default |
| Licensed SFX/music libraries (Splice, Soundly, Epidemic, Artlist) | ✔ files | subscription | excellent | needs a mapping layer (supported via `.motion-graphics/assets/sfx/`, `music.source: file`) | per-licence terms | optional upgrade |
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
