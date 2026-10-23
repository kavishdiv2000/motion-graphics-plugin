---
name: sound-design
description: Sound design for motion graphics — the 50-sound procedural SFX library (clicks, ticks, keys, glitches, whooshes, risers, impacts, stingers, room tones), music-bed presets, mapping animation events to sounds, beat-sync, ducking, loudness mastering (-14 LUFS), recreating a reference video's audio, and adding licensed or AI-generated sounds. Use when choosing, generating, mixing or debugging audio for a motion-graphics video.
license: MIT
metadata:
  version: "1.0.0"
---

# Sound design for motion graphics

Sound is half of perceived quality. In this pipeline audio is **synthesised from code** and
**driven by the same timeline as the picture** (`src/lib/timeline.js` events → `scripts/lib/mix.mjs`),
so every word, decode, land and cut has a sound on the exact frame, and the result is deterministic and royalty-free.

- Full catalogue with the synthesis code of every sound: `references/sfx-catalogue.md`
- Reverse-engineering a reference video's audio (worked on the demo reel): `references/recreate-reference-audio.md`
- Audition: `npm run sfx` → `public/sfx/_reel.wav` and `public/sfx/INDEX.md`

## 1. The layers of a social motion-graphics mix
| Layer | Level (relative) | Role |
|---|---|---|
| Music bed | −17 dB, ducked −4 dB under hero hits | tempo, mood, glue |
| Hero hits (decode_land, count_land, logo) | 0 dB | "it landed": the felt punctuation |
| Reveal textures (decode_start chatter, transitions) | −5 to −6 dB | motion you can hear |
| Micro events (word_in, type_char, count_tick) | −9 to −11 dB, ±1.5 dB humanised, throttled | life and detail; must never become a machine gun |
| Room tone / hiss (optional) | −30 dB | avoids digital silence |
Master: integrated **−14 LUFS**, true peak **≤ −1 dBTP** (YouTube/Spotify/TikTok-friendly normalisation).

## 2. Event → sound map (set in DESIGN.md `audio.sfx.map`)
| Event | Fires when | Signal Ops default | Alternatives |
|---|---|---|---|
| `label_in` | the tag glitches in | `glitch_tick` | tick_hi, relay_click, blip_up |
| `word_in` | each word of a setup/tail appears | `key_soft` | click_soft, tap_wood, null for calm brands |
| `decode_start` | a hero starts scrambling | `scramble_chatter` | data_chirp, modem_burst |
| `decode_land` (hero) | the hero locks | `impact_sub` | impact_punch, thud_soft, hit_metallic, boom_cinematic (once per video) |
| `decode_land_minor` | a non-hero decode locks | `tick_hi` | double_tick |
| `type_char` / `type_done` | typewriter char / finished | `key_click` / `confirm_blip` | mouse_click / chime_confirm |
| `count_tick` / `count_land` | counter steps / final number | `counter_tick` / `impact_punch` | blip_up / slam_gate |
| `strike` | strike-through draws | `swipe_air` | toggle_off, error_buzz |
| `logo_in` | endcard logo | `stinger_logo` | bell_soft, slam_gate |
| `exit` | scene starts dimming | `signal_drop` | null, downlifter |
| `transition` | glitch/flash cut | `static_burst` | rgb_tear, whoosh_short, crt_off |
Extra one-off sounds per scene: `sfx: [{ id: riser_noise, at_s: 2.0, gain_db: -4 }]` in CHOREOGRAPHY.md.
For a riser into a hero, start it `riser length` seconds before the land (risers are 2.0 s).

## 3. How each family is synthesised (to design new sounds)
All recipes combine a few primitives from `scripts/lib/dsp.mjs`: oscillators (sine/saw/square/tri, FM), seeded noise
(white/pink/brown), biquad filters (static or swept), exponential/ADSR envelopes, waveshaping (`drive`), bit-crushing,
gating (`chop`), Karplus-Strong `pluck`, `echo` and `reverb`.

- **Clicks and ticks (12)**: a 2–6 ms band-passed noise burst (2–8 kHz, Q 1–4) for the "contact", plus an optional
  pitched blip (800–6000 Hz, 3–10 ms decay) for the "material". Higher band and shorter decay sound harder and smaller.
  Lower band, pink noise and longer decay sound softer and woodier. Mechanical keys: a sharp high click, then a duller
  "bottom-out" 10–15 ms later.
- **Data / digital (10)**: square-wave blips with exponential pitch glides (up = positive, down = negative); chirp bursts
  are 8–20 tiny seeded random-pitch blips; FSK modem = a square wave switching between 1200 and 2200 Hz.
- **Glitch / signal (8)**: noise and tones through a `bitcrush` (4–6 bits, 6–11 kHz sample-hold) and `chop` (gating at
  20–40 Hz); CRT on = a low thunk plus a rising 15 kHz whine; signal drop = noise through a low-pass sweeping down.
- **Transitions (7)**: pink noise through a band-pass whose centre sweeps (whoosh), amplitude shaped by sin²;
  risers = noise or detuned saws with exponentially rising cutoff/pitch and amplitude p²; reverse swell = a reverb tail played backwards.
- **Impacts (6)**: a sine with a fast pitch drop (e.g. 115 → 45 Hz in 40 ms), slightly driven, plus a click transient for
  definition. Cinematic = add brown noise low-passed at 300 Hz plus a long reverb. Metallic = inharmonic partials (×1, 2.76, 5.4, 8.93).
  Gated slam = a punch plus a reverb tail cut off after ~35 %.
- **Musical / brand (4)**: FM bells/chimes (ratio 1.4–3.5, decaying index), Karplus-Strong plucks in the bed's key,
  and the logo stinger = a sub hit plus a minor-chord pluck strum (18 ms apart), a noise shimmer and reverb.
- **Beds / texture (3)**: brown-noise room tone (LP 500 Hz), pink-noise tape hiss (BP 6 kHz), CRT hum (50/100/150 Hz + 15.7 kHz).

To add a sound: add an entry to `SFX` in `scripts/lib/sfx.mjs` (`cat, desc, use, make: (sr) => Float32Array | [L,R]`),
use only seeded noise, normalise the peak (−1 to −6 dB), `npm run sfx -- --only my_id`, listen, then regenerate the
catalogue: `node scripts/sfx-docs.mjs <skill>/references/sfx-catalogue.md`.

## 4. Music beds (`audio.music.preset`)
| Preset | Layers | BPM | Mood / use |
|---|---|---|---|
| `signal_drone` | sub drone (root, 2nd harmonic), breathing saw pad, Karplus-Strong arp on chord tones (8ths), 16th ticks at high energy | 95–105 | dark, technical, thought leadership (**the demo**) |
| `pulse_minimal` | 16th square bass pulse, light pad, sparse arp, ticks, kick at energy peaks | 110–124 | product launches, SaaS, announcements |
| `warm_keys` | soft triangle pad chords, sparse plucks, no percussion | 80–96 | human, calm, services, healthcare |
| `dark_tension` | low drone, heartbeat pulse, noise swells into each cut | 80–95 | problem/agitate hooks, warnings |
Chord progression per scale: minor i–VI–III–VII, major I–V–vi–IV, every 2 bars. **Energy** per scene (choreography
`music.energy_curve`) thins or thickens the arp and enables ticks (> 0.6) and the kick (> 0.75).
Licensed track instead: `music.source: file` with a 16-bit 48 kHz WAV in `public/audio/` (loops if shorter).

## 5. Mixing rules
1. One hero hit per scene. If two land within 300 ms, keep the bigger one.
2. Duck the bed −3 to −6 dB under hero hits (10 ms attack, 450 ms release); the engine does this automatically.
3. Throttle repeats: word_in ≥ 3 frames apart, type_char ≥ 2, count_tick ≥ 3. Humanise ±1.5 dB.
4. Low end belongs to one thing at a time: the sub hit *or* the drone. Ducking clears room for the hit; if you add a licensed bed, high-pass it around 40 Hz.
5. Leave the final 2 s for the stinger tail and the music fade-out.
6. Deliver at 48 kHz, AAC 320 kbps, −14 LUFS, ≤ −1 dBTP. `npm run qa` verifies this.

## 6. Silence and restraint
Platforms autoplay muted, so the video must work silent. The sound is the reward for unmuting, not a crutch.
Calm brands: set `word_in: null`, use `thud_soft` for lands, `warm_keys` bed. Leave one scene without SFX before
the payoff to make the payoff hit harder.

## 7. AI and licensed sounds (optional)
Generate or buy a sound **once**, save it as `public/sfx/custom/<id>.wav` (16-bit, 48 kHz), and reference `<id>` like a
built-in. Never call a generation API at render time. Record the source and licence in `public/sfx/custom/LICENSES.md`.
