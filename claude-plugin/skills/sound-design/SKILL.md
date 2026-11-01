---
name: sound-design
description: Sound design for motion graphics — drum-free sound kits (studio, launch, calm, crisp, minimal) of designed and CC0-fitted effects placed by measured sync points and levelled against the music, music-bed presets, mapping animation events to sound roles, stop-downs, risers into reveals, loudness mastering (-14 LUFS), the 50-sound classic synth library, recreating a reference video's audio, and adding licensed or AI-generated sounds. Use when choosing, mixing or debugging audio for a motion-graphics video.
license: MIT
metadata:
  version: "1.4.0"
---

# Sound design for motion graphics

Sound is half of perceived quality. Audio here is **driven by the same timeline as the picture** (`src/lib/timeline.js`
events → `scripts/lib/mix.mjs`), deterministic, and needs no network or licence at render time.

Two ways to sound a video (DESIGN.md `audio.sfx.kit`):

| Mode | What | When |
|---|---|---|
| **Kit** (`studio` · `launch` · `calm` · `crisp` · `minimal`) — default `studio` | one sound per **role** (hit, whoosh, key, tick, text…) from a pack of 43 sounds / 127 takes made by [earshot](https://github.com/Leonxlnx/earshot) (designed in code, plus CC0 recordings fitted as code), each placed by its **measured** sync point and levelled **over the music** | every new design |
| `classic` | the 50 synthesised sounds of `references/sfx-catalogue.md`, mapped event → sound id at fixed levels | the bundled Signal Ops example (it recreates the reference reel); designs written before 1.3 |
| `none` | no effects (music only, or silence with `music.source: none`) | captions-first platforms |

References: `references/kits.md` (every kit, role, sound and number; generated) · `references/sfx-catalogue.md` (classic
synth sounds) · `references/recreate-reference-audio.md` (reverse-engineering a reference video's audio).

## 1. Choose a kit (ask: "What should it sound like?")
**Every kit is drum-free**: no kicks, low thumps, sub drops or noise hats (each short sound keeps < 30 % of its energy
under 150 Hz), and the synth music beds play without their drum layers unless `audio.music.percussion: true`.

| Kit | Character | Music |
|---|---|---|
| `studio` | **the professional default**: real CC0 recordings (keys, clicks, a bamboo touch, a soft swish), rounded tonal pops, a warm struck tine for hero lands tuned into the key, air risers and breath swells; gentle music stop-downs only before big transitions | yes |
| `launch` | soft, short, mid-register touches over a music bed; music steps down before hits (modern SaaS / AI launch films) | yes (default) |
| `calm` | soft natural touches, one tuned kalimba voice for text and bells, gentle air for moves | yes (warm_keys) |
| `crisp` | tight UI ticks and clicks, fast air, one clean gated hit, a short tuned sub drop (dev tools, product) | yes (pulse_minimal) |
| `minimal` | airy digital ticks, sub swells, sub-led hit (effects-led films) | none |
Audition before choosing: `node .motion-graphics/mg.mjs sfx --kit <name>` → `assets/sfx-library/kit-<name>.wav`
(every role in order). List: `mg sfx kits`.

## 2. Events → roles
The timeline fires events; the kit decides which role sounds them (full table in `references/kits.md`):
hero `decode_land` → **hit** (studio: a tuned tine) · minor decode → **land.light** · `label_in` / `count_tick` → **tick** · `decode_start` → **tick.crisp**
· a words line resolves (`words_done`) → **text** (ONE tuned note per line, not per word) · `type_char` → **key** (6 takes,
±3 ms humanised), `type_space` → **key.space**, `type_done` → **click.confirm** · `count_land` → **land** · `fade_in` → **pop**
· glitch/flash cut → **whoosh.short** (peak on the cut) · `logo_in` → **hit** · `word_in`, `scene_in`, `exit` → silent.
Change it in DESIGN.md: `audio.sfx.events: { word_in: tick, count_land: hit }` (null = silent);
swap a voice: `audio.sfx.roles: { hit: { sound: cut_hit/kick }, text: null }` (a pack id, a classic synth id, or a custom `.wav` id).

## 3. What the engine does for you (don't redo it by hand)
- **Placement by measured sync point.** Each take carries its onset (attack), peak (loudest 5 ms) and end, measured with
  earshot's definitions. Taps / knocks / clicks are placed on their attack and **lead** the frame (−11 to −60 ms);
  pop-in thumps, whoosh and swell **peaks** land just after the cut (+30 to +42 ms); risers peak into the hit (−23 ms).
- **Levels over the music.** With music, each effect's loudest 50 ms sits `bed_db` (3–10 dB) over the music's median
  level in the second before it — audible over loud passages, never jumping out of quiet ones. Without music, fixed role levels.
- **Runs.** Rapid repeats keep a minimum gap (ticks 66 ms, keys 87 ms, pops 114 ms); closer ones are skipped.
  Consecutive events cycle through different takes (no machine-gun repeats) with ±1 dB variation.
- **Tuning.** Tonal roles (text, bell) are pitched into the music's key (C-major pentatonic moved to the key's major / relative major).
- **Stop-down, not ducking**: launch steps the music down ~9 dB for 0.4 s before a hit / whoosh.long / swell; studio only
  ~6 dB for 0.3 s before big transitions (whoosh.long, swell). The music comes back **on** the moment. `audio.music.stop_down: off | { depth_db, length_s }`.
- **One accent at a time.** Two of hit / drop / swell / whoosh.long within 3 frames: the lower-priority one is removed
  (a riser ending on a hit is a lead-in, not a stack, and is kept).
- **Mastering.** −14 LUFS integrated, ≤ −1 dBTP *after AAC encoding* (0.5 dB codec headroom on kit mixes).

## 4. What professional launch films do (earshot's measured playbook, 7 reference films)
1. **Music leads**: music under (nearly) the whole film. **Start at once**: first sound within 0.04–0.48 s, no silent cold open.
2. **Accents with priority**: the reveal, the logo, the key UI action, section changes. **Not a hit on every cut**:
   dense music covers small motion. Music-led films: about **3–13 designed accents per 10 s**.
3. **Riser → stop-down → impact** for the big reveal, once or twice per film: `sfx: [{ role: riser, at_s: <hero time> }]`
   in that scene of CHOREOGRAPHY.md (`at_s` = when it should land; the engine starts it early enough).
4. **Land the ending**: the end card sits at body level; short fade (median 0.27 s); the logo hit rings out. No dead air.
5. **UI foley**: one click per on-screen click on the press frame; typing from multiple takes, slightly irregular.
6. **Web master**: about −14 LUFS, true peak ≤ −1 dBTP on the delivered file.
7. **Real recordings and produced music beat synthesis.** The kits cover the effects; the synth music beds are the
   weakest link of a premium film: for hero work set `music.source: file` with a licensed track (see §7).
`mg qa` checks first sound, accent density, stacking and loudness / true peak on every render.

## 5. Scene extras (CHOREOGRAPHY.md)
```yaml
sfx: [{ role: riser, at_s: 3.03 }, { role: bell, at_s: 1.2, note: E5 }, { role: swell, at_s: 0 }, { id: impact_punch, at_s: 2.0, gain_db: -3 }]
```
`role` uses the kit's voice and placement; `id` plays a specific sound (pack id, synth id or custom `.wav`). `note`
pitches tonal roles. `at_s` is seconds from the scene start to the landing point.

## 6. Music beds (`audio.music.preset`, synthesised)
| Preset | Layers | BPM | Mood / use |
|---|---|---|---|
| `signal_drone` | sub drone, breathing saw pad, Karplus-Strong arp on chord tones (+ 16th hat ticks when `percussion: true`) | 95–105 | dark, technical |
| `pulse_minimal` | 16th square bass pulse, light pad, sparse arp (+ ticks and a kick at energy peaks with `percussion: true`) | 110–124 | product launches, SaaS |
| `warm_keys` | soft triangle pad chords, sparse plucks, no percussion | 80–96 | human, calm, services |
| `dark_tension` | low drone, noise swells into each cut (+ heartbeat pulse with `percussion: true`) | 80–95 | problem/agitate hooks |
Chords per scale: minor i–VI–III–VII, major I–V–vi–IV, every 2 bars. Scene energy (`music.energy_curve`) thins or
thickens the arp, ticks (> 0.6) and kick (> 0.75). Licensed track: `music.source: file`, a 16-bit 48 kHz WAV in
`.motion-graphics/assets/audio/`, `file: assets/audio/<name>.wav` (loops if shorter); kits level against it the same way.

## 7. Licensed, AI or recorded sounds
Save a sound once as `.motion-graphics/assets/sfx/<id>.wav` (16-bit, 48 kHz) and use `<id>` as a role's `sound`
(its sync points are measured automatically) or in a scene `sfx`. Never call a generation API at render time.
Licences for ads: only CC0, Public Domain Mark or CC BY (credit it in POST.md); never NC, ND, SA or Sampling+ — syncing a
recording to video legally counts as an adaptation. Record source and licence in `.motion-graphics/assets/sfx/LICENSES.md`.

## 8. Classic mode (`kit: classic`)
The 50 synthesised sounds (`references/sfx-catalogue.md`), mapped in DESIGN.md `audio.sfx.map` (event → id, null = silent),
at `audio.sfx.gain_db` (−9) plus per-event offsets; throttled by `min_spacing_frames`; music ducked `duck_db` under hero
hits. Files start on the cue frame (no sync-point placement). Signal Ops defaults: label_in `glitch_tick`, word_in
`key_soft`, decode_start `scramble_chatter`, decode_land `impact_sub`, minor `tick_hi`, type `key_click`/`confirm_blip`,
count `counter_tick`/`impact_punch`, strike `swipe_air`, logo `stinger_logo`, exit `signal_drop`, transition `static_burst`.
Synthesis families (to design new ones): clicks/ticks = 2–6 ms band-passed noise + optional pitched blip; data = square
blips with pitch glides; glitch = bit-crush + gating; transitions = swept band-pass noise, risers with rising cutoff;
impacts = a sine with a fast pitch drop + click; musical = FM bells and Karplus-Strong plucks. Add one in
`scripts/lib/sfx.mjs` (seeded noise only, peak −1 to −6 dB) and regenerate the catalogue (`node scripts/sync-plugins.mjs`).

## 9. Silence and restraint
Platforms autoplay muted: the video must work silent; sound is the reward for unmuting. Leave a breath (a stop-down or
a scene without accents) before the payoff. More sounds is not better.
