# SFX catalogue — 50 procedural sounds

Generated from `scripts/lib/sfx.mjs` by `scripts/sfx-docs.mjs` — the recipe shown for each sound IS the code that synthesises it
(helpers: `transient(sr,dur,bandHz,Q,decayTau,seed,color)` = band-passed noise burst with exponential decay;
`blip(sr,dur,f0,f1,tau,wave)` = oscillator gliding f0→f1 with exponential decay; all other functions are in `scripts/lib/dsp.mjs`).
Audition them all: `npm run sfx` → `public/sfx/_reel.wav`.

## UI / clicks (12)

| id | sound | use it for |
|---|---|---|
| `click_soft` | Soft rounded click | Gentle UI confirmations, low-stakes reveals |
| `click_hard` | Sharp plastic click | Emphatic UI taps, button presses on hero CTAs |
| `key_soft` | Quiet laptop key tap | Under word-by-word reveals (word_in). Keep -6 dB under clicks |
| `key_click` | Mechanical keyboard switch (click + bottom-out) | Typewriter reveals (type_char) |
| `tick_hi` | High metallic tick | Minor decode lands, list markers, small accents |
| `tick_lo` | Low wooden tick | Clock-like rhythm, metronomic beat markers |
| `double_tick` | Two quick ticks (ti-tick) | Toggling states, "locked" moments |
| `toggle_on` | Switch flick with upward chirp | Feature on, value appears, checkmarks |
| `toggle_off` | Switch flick with downward chirp | Feature off, strike-through, removal |
| `relay_click` | Electro-mechanical relay clack | System engaging, scene switch in industrial themes |
| `mouse_click` | Mouse button down+up pair | Cursor demos, UI walkthroughs |
| `tap_wood` | Knuckle on wood | Organic/warm brands, list items |

<details><summary><code>click_soft</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.08, [transient(sr, 0.08, 2400, 1.2, 0.006, S('click_soft')), 0.7], [blip(sr, 0.08, 1800, 900, 0.008), 0.4]), -3)
```
</details>

<details><summary><code>click_hard</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.06, [transient(sr, 0.06, 4200, 2.5, 0.004, S('click_hard')), 1], [blip(sr, 0.06, 3200, 2500, 0.003, 'square'), 0.25]), -1)
```
</details>

<details><summary><code>key_soft</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.07, [transient(sr, 0.07, 3000, 1.6, 0.005, S('key_soft')), 0.8], [transient(sr, 0.07, 700, 2, 0.01, S('key_soft2'), 'pink'), 0.5]), -6)
```
</details>

<details><summary><code>key_click</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.09, [transient(sr, 0.09, 5200, 3, 0.003, S('key_click')), 0.9], [transient(sr, 0.09, 1200, 1.5, 0.012, S('key_click2'), 'pink'), 0.6, 0.012]), -3)
```
</details>

<details><summary><code>tick_hi</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.05, [blip(sr, 0.05, 6200, 5800, 0.004), 0.6], [transient(sr, 0.05, 8000, 4, 0.002, S('tick_hi')), 0.5]), -4)
```
</details>

<details><summary><code>tick_lo</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.08, [blip(sr, 0.08, 900, 700, 0.012), 0.8], [transient(sr, 0.08, 1500, 3, 0.004, S('tick_lo')), 0.4]), -3)
```
</details>

<details><summary><code>double_tick</code> recipe</summary>

```js
(sr) => { const t = SFX.tick_hi.make(sr);
  return normalize(sum(sr, 0.12, [t, 1], [t, 0.7, 0.055]), -3);
  }
```
</details>

<details><summary><code>toggle_on</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.12, [SFX.click_hard.make(sr), 0.7], [blip(sr, 0.1, 900, 1800, 0.03), 0.4, 0.01]), -3)
```
</details>

<details><summary><code>toggle_off</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.12, [SFX.click_hard.make(sr), 0.7], [blip(sr, 0.1, 1800, 800, 0.03), 0.4, 0.01]), -3)
```
</details>

<details><summary><code>relay_click</code> recipe</summary>

```js
(sr) => { const a = transient(sr, 0.12, 2200, 0.9, 0.006, S('relay'), 'pink');
  const b = transient(sr, 0.12, 3600, 2, 0.004, S('relay2'));
  return normalize(sum(sr, 0.14, [a, 1], [b, 0.6, 0.018], [blip(sr, 0.1, 120, 90, 0.02), 0.5]), -2);
  }
```
</details>

<details><summary><code>mouse_click</code> recipe</summary>

```js
(sr) => { const d = transient(sr, 0.05, 3400, 2, 0.003, S('mouse'));
  return normalize(sum(sr, 0.14, [d, 1], [d, 0.5, 0.08]), -3);
  }
```
</details>

<details><summary><code>tap_wood</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.15, [envExp(osc(sr, 0.15, 'sine', 420), sr, 0.001, 0.03), 0.8], [envExp(osc(sr, 0.15, 'sine', 1130), sr, 0.001, 0.012), 0.4], [transient(sr, 0.15, 2000, 1, 0.003, S('tap')), 0.4]), -3)
```
</details>

## Data / digital (10)

| id | sound | use it for |
|---|---|---|
| `blip_up` | Rising square blip | Positive change, numbers going up |
| `blip_down` | Falling square blip | Negative change, closing, dismissal |
| `confirm_blip` | Two-note ascending confirmation (fifth) | type_done, CTA complete, success |
| `error_buzz` | Low detuned buzz | Wrong / problem beats ("most people do X") |
| `data_chirp` | Fast random-pitch chirp burst | Data loading, AI "thinking" |
| `scramble_chatter` | Granular digital chatter (~0.35 s) | Under decode/scramble reveals (decode_start). Signature sound of the demo |
| `counter_tick` | Tiny high tick for counters | count_tick during numeric count-ups (throttled to 1 per 3 frames) |
| `modem_burst` | Short FSK modem squeal | Connection established, retro-tech themes |
| `sonar_ping` | Sine ping with long echo | Discovery, "found it", location reveals |
| `telemetry_pings` | Three soft telemetry beeps | Status updates, dashboards |

<details><summary><code>blip_up</code> recipe</summary>

```js
(sr) => normalize(lp(blip(sr, 0.12, 600, 1400, 0.05, 'square'), sr, 5000), -4)
```
</details>

<details><summary><code>blip_down</code> recipe</summary>

```js
(sr) => normalize(lp(blip(sr, 0.12, 1400, 600, 0.05, 'square'), sr, 5000), -4)
```
</details>

<details><summary><code>confirm_blip</code> recipe</summary>

```js
(sr) => { const a = envExp(osc(sr, 0.2, 'tri', mtof(81)), sr, 0.002, 0.05);
  const b = envExp(osc(sr, 0.25, 'tri', mtof(88)), sr, 0.002, 0.08);
  return normalize(sum(sr, 0.32, [a, 0.8], [b, 0.8, 0.07]), -4);
  }
```
</details>

<details><summary><code>error_buzz</code> recipe</summary>

```js
(sr) => normalize(lp(envADSR(sum(sr, 0.3, [osc(sr, 0.3, 'square', 110), 0.5], [osc(sr, 0.3, 'square', 116.5), 0.5]), sr, 0.005, 0.05, 0.7, 0.08), sr, 1800), -4)
```
</details>

<details><summary><code>data_chirp</code> recipe</summary>

```js
(sr) => { const out = buf(sr, 0.25);
  const r = (i) => (hash('chirp', i) % 1000) / 1000;
  for (let k = 0;
  k < 10;
  k++) mixInto(out, envExp(osc(sr, 0.03, 'square', 1200 + r(k) * 2800), sr, 0.0005, 0.008), Math.round(k * 0.022 * sr), 0.5);
  return normalize(lp(out, sr, 7000), -5);
  }
```
</details>

<details><summary><code>scramble_chatter</code> recipe</summary>

```js
(sr) => { const dur = 0.36, out = buf(sr, dur);
  for (let k = 0;
  k < 18;
  k++) { const r = (hash('chat', k) % 1000) / 1000;
  mixInto(out, envExp(bp(osc(sr, 0.025, 'square', 900 + r * 3500), sr, 2500 + r * 3000, 3), sr, 0.0003, 0.006), Math.round((k / 18) * dur * sr), 0.6 + 0.4 * r);
  } mixInto(out, envExp(hp(noise(sr, dur, S('chatn')), sr, 6000), sr, 0.002, 0.08), 0, 0.15);
  return normalize(applyCurve(out, (p) => 1 - 0.5 * p), -5);
  }
```
</details>

<details><summary><code>counter_tick</code> recipe</summary>

```js
(sr) => normalize(envExp(osc(sr, 0.03, 'sine', 4200), sr, 0.0003, 0.004), -9)
```
</details>

<details><summary><code>modem_burst</code> recipe</summary>

```js
(sr) => { const r = (t) => (hash('fsk', Math.floor(t * 120)) & 1 ? 1200 : 2200);
  return normalize(bp(envADSR(osc(sr, 0.4, 'square', (t) => r(t)), sr, 0.005, 0.05, 0.6, 0.1), sr, 1700, 0.8), -6);
  }
```
</details>

<details><summary><code>sonar_ping</code> recipe</summary>

```js
(sr) => normalize(echo(envExp(osc(sr, 0.5, 'sine', 1320), sr, 0.002, 0.12), sr, 0.18, 0.45, 0.45, 1.2), -4)
```
</details>

<details><summary><code>telemetry_pings</code> recipe</summary>

```js
(sr) => { const b = envExp(osc(sr, 0.08, 'sine', 2093), sr, 0.002, 0.02);
  return normalize(sum(sr, 0.5, [b, 1], [b, 0.7, 0.14], [b, 0.5, 0.28]), -6);
  }
```
</details>

## Glitch / signal (8)

| id | sound | use it for |
|---|---|---|
| `glitch_tick` | Tiny bit-crushed digital tick | label_in (tag glitch-in). The demo's high transient on every tag |
| `glitch_stutter` | Chopped stutter of noise + tone | Error states, rapid-fire edits |
| `static_burst` | Short TV static burst | Scene transitions (glitch_cut) |
| `rgb_tear` | Tearing digital rip with pitch drop | Heavy glitch transitions, before/after reveals |
| `crt_on` | CRT power-on thunk + rising whine | Video open, first frame |
| `crt_off` | CRT collapse — falling zap | Video end, hard outros |
| `signal_drop` | Short low-passed dropout | Scene exit dims (exit). Keep subtle |
| `digital_zap` | FM zap | Energy hits, power-ups |

<details><summary><code>glitch_tick</code> recipe</summary>

```js
(sr) => normalize(bitcrush(sum(sr, 0.07, [transient(sr, 0.07, 5500, 1.5, 0.006, S('gt')), 1], [blip(sr, 0.07, 2600, 4000, 0.01, 'square'), 0.35]), sr, 5, 11000), -4)
```
</details>

<details><summary><code>glitch_stutter</code> recipe</summary>

```js
(sr) => normalize(chop(bitcrush(sum(sr, 0.3, [noise(sr, 0.3, S('gs')), 0.4], [osc(sr, 0.3, 'square', 340), 0.3]), sr, 6, 9000), sr, 28, 0.5, S('gs2')), -5)
```
</details>

<details><summary><code>static_burst</code> recipe</summary>

```js
(sr) => normalize(envADSR(bp(noise(sr, 0.18, S('static')), sr, 3500, 0.4), sr, 0.003, 0.04, 0.5, 0.06), -6)
```
</details>

<details><summary><code>rgb_tear</code> recipe</summary>

```js
(sr) => normalize(bitcrush(envADSR(sum(sr, 0.25, [osc(sr, 0.25, 'saw', (t, p) => 1800 * Math.pow(0.15, p)), 0.6], [noise(sr, 0.25, S('tear')), 0.3]), sr, 0.002, 0.05, 0.6, 0.08), sr, 4, 6000), -4)
```
</details>

<details><summary><code>crt_on</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.8, [envExp(osc(sr, 0.4, 'sine', (t, p) => 80 * Math.pow(0.6, p)), sr, 0.002, 0.08), 0.9], [envADSR(osc(sr, 0.8, 'sine', (t, p) => 9000 + 6700 * p), sr, 0.05, 0.2, 0.15, 0.3), 0.06], [transient(sr, 0.3, 2000, 0.6, 0.02, S('crton'), 'pink'), 0.5]), -3)
```
</details>

<details><summary><code>crt_off</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.5, [envExp(osc(sr, 0.5, 'sine', (t, p) => 2400 * Math.pow(0.02, p)), sr, 0.001, 0.12), 0.7], [envExp(bp(noise(sr, 0.5, S('crtoff')), sr, 1800, 0.7), sr, 0.001, 0.05), 0.4]), -3)
```
</details>

<details><summary><code>signal_drop</code> recipe</summary>

```js
(sr) => normalize(envExp(lp(noise(sr, 0.22, S('drop'), 'pink'), sr, (t, p) => 4000 * Math.pow(0.05, p)), sr, 0.002, 0.07), -10)
```
</details>

<details><summary><code>digital_zap</code> recipe</summary>

```js
(sr) => normalize(envExp(fm(sr, 0.25, (t, p) => 1400 * Math.pow(0.2, p), 2.01, (t, p) => 8 * (1 - p)), sr, 0.001, 0.06), -3)
```
</details>

## Transitions (7)

| id | sound | use it for |
|---|---|---|
| `whoosh_short` | Fast air whoosh (0.35 s) | Slides, pushes, quick cuts |
| `whoosh_long` | Slow wide whoosh (0.9 s) | Big scene changes, camera moves |
| `swipe_air` | Very short swipe | Strike-throughs, swipes, item removals |
| `reverse_swell` | Reversed reverb swell | 0.6 s BEFORE a hero lands (place with negative offset) |
| `riser_noise` | 2 s filtered noise riser | Build into the reveal / drop |
| `riser_tonal` | 2 s pitch riser (saw, filtered) | Tension before CTA / big stat |
| `downlifter` | 1.2 s falling noise + tone | After a drop, release of tension, outro |

<details><summary><code>whoosh_short</code> recipe</summary>

```js
(sr) => normalize(applyCurve(bp(noise(sr, 0.35, S('ws'), 'pink'), sr, (t, p) => 400 + 3200 * Math.sin(Math.PI * p), 1.2), (p) => Math.sin(Math.PI * p) ** 2), -3)
```
</details>

<details><summary><code>whoosh_long</code> recipe</summary>

```js
(sr) => { const m = applyCurve(bp(noise(sr, 0.9, S('wl'), 'pink'), sr, (t, p) => 250 + 2500 * Math.sin(Math.PI * p), 0.9), (p) => Math.sin(Math.PI * p) ** 2);
  return widen(normalize(m, -3), sr, 11);
  }
```
</details>

<details><summary><code>swipe_air</code> recipe</summary>

```js
(sr) => normalize(applyCurve(hp(noise(sr, 0.16, S('sw')), sr, (t, p) => 1500 + 5000 * p), (p) => Math.sin(Math.PI * p)), -5)
```
</details>

<details><summary><code>reverse_swell</code> recipe</summary>

```js
(sr) => normalize(reverse(reverb(envExp(osc(sr, 0.2, 'tri', mtof(57)), sr, 0.001, 0.05), sr, 0.85, 0.3, 0.9, 0.6)), -4)
```
</details>

<details><summary><code>riser_noise</code> recipe</summary>

```js
(sr) => normalize(applyCurve(bp(noise(sr, 2, S('rn')), sr, (t, p) => 300 * Math.pow(30, p), 1.4), (p) => p ** 2), -3)
```
</details>

<details><summary><code>riser_tonal</code> recipe</summary>

```js
(sr) => normalize(applyCurve(lp(sum(sr, 2, [osc(sr, 2, 'saw', (t, p) => 110 * Math.pow(4, p)), 0.5], [osc(sr, 2, 'saw', (t, p) => 111.5 * Math.pow(4, p)), 0.5]), sr, (t, p) => 400 + 5000 * p), (p) => p ** 1.5), -4)
```
</details>

<details><summary><code>downlifter</code> recipe</summary>

```js
(sr) => normalize(applyCurve(sum(sr, 1.2, [lp(noise(sr, 1.2, S('dl')), sr, (t, p) => 6000 * Math.pow(0.03, p)), 0.6], [osc(sr, 1.2, 'sine', (t, p) => 400 * Math.pow(0.15, p)), 0.4]), (p) => (1 - p) ** 1.5), -3)
```
</details>

## Impacts (6)

| id | sound | use it for |
|---|---|---|
| `impact_sub` | Sub-bass thump (pitch-dropping sine + click) | Hero decode_land. Felt more than heard — the demo's low hits |
| `impact_punch` | Punchy kick-style hit | Stat lands, list completes, beat-synced emphasis |
| `boom_cinematic` | Big trailer boom with reverb tail | Once per video max: title or reveal |
| `thud_soft` | Muffled soft thud | Subtle lands for secondary lines |
| `hit_metallic` | Inharmonic metal hit | Industrial brands, "locked/sealed" moments |
| `slam_gate` | Gated reverb slam | Final word of the video, logo slam |

<details><summary><code>impact_sub</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.7, [drive(envExp(osc(sr, 0.7, 'sine', (t) => 45 + 70 * Math.exp(-t * 28)), sr, 0.001, 0.22), 1.6), 1], [transient(sr, 0.05, 1800, 0.8, 0.004, S('isub')), 0.25]), -1)
```
</details>

<details><summary><code>impact_punch</code> recipe</summary>

```js
(sr) => normalize(sum(sr, 0.4, [drive(envExp(osc(sr, 0.4, 'sine', (t) => 55 + 160 * Math.exp(-t * 40)), sr, 0.001, 0.09), 2.5), 1], [transient(sr, 0.04, 3000, 1, 0.006, S('punch')), 0.35]), -1)
```
</details>

<details><summary><code>boom_cinematic</code> recipe</summary>

```js
(sr) => { const core = sum(sr, 1.6, [drive(envExp(osc(sr, 1.6, 'sine', (t) => 32 + 60 * Math.exp(-t * 10)), sr, 0.002, 0.6), 1.8), 1], [envExp(lp(noise(sr, 1.6, S('boom'), 'brown'), sr, 300), sr, 0.002, 0.4), 0.6]);
  return widen(normalize(reverb(core, sr, 0.9, 0.5, 0.25, 1.5), -1), sr, 9);
  }
```
</details>

<details><summary><code>thud_soft</code> recipe</summary>

```js
(sr) => normalize(lp(envExp(osc(sr, 0.3, 'sine', (t) => 70 + 50 * Math.exp(-t * 30)), sr, 0.002, 0.07), sr, 400), -3)
```
</details>

<details><summary><code>hit_metallic</code> recipe</summary>

```js
(sr) => { const parts = [1, 2.76, 5.4, 8.93].map((r, i) => [envExp(osc(sr, 1.2, 'sine', 220 * r), sr, 0.001, 0.4 / (i + 1)), 1 / (i + 1)]);
  return normalize(sum(sr, 1.2, ...parts, [transient(sr, 0.05, 5000, 1, 0.004, S('metal')), 0.6]), -2);
  }
```
</details>

<details><summary><code>slam_gate</code> recipe</summary>

```js
(sr) => { const r = reverb(sum(sr, 0.15, [SFX.impact_punch.make(sr), 1], [transient(sr, 0.15, 1500, 0.5, 0.03, S('slam'), 'pink'), 0.8]), sr, 0.95, 0.2, 0.6, 0.6);
  return normalize(applyCurve(r, (p) => (p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) * 20))), -1);
  }
```
</details>

## Musical / brand (4)

| id | sound | use it for |
|---|---|---|
| `chime_confirm` | Bright two-note FM chime | Positive outcomes, success states |
| `pluck_accent` | Single KS pluck (A4) with echo | Musical accent on a key word; matches the demo bed |
| `bell_soft` | Soft glassy bell | Calm reveals, end cards for gentle brands |
| `stinger_logo` | Sub hit + minor chord pluck + shimmer | logo_in on the end card — the sonic logo |

<details><summary><code>chime_confirm</code> recipe</summary>

```js
(sr) => { const n = (m) => envExp(fm(sr, 1, mtof(m), 3.5, (t) => 2 * Math.exp(-t * 6)), sr, 0.002, 0.35);
  return normalize(reverb(sum(sr, 1.2, [n(84), 0.6], [n(91), 0.6, 0.09]), sr, 0.6, 0.4, 0.25, 0.8), -4);
  }
```
</details>

<details><summary><code>pluck_accent</code> recipe</summary>

```js
(sr) => normalize(echo(lp(pluck(sr, 0.6, mtof(69), { seed: S('pl') }), sr, 3500), sr, 0.3, 0.3, 0.3, 0.8), -4)
```
</details>

<details><summary><code>bell_soft</code> recipe</summary>

```js
(sr) => normalize(reverb(envExp(fm(sr, 1.5, mtof(76), 1.4, (t) => 3 * Math.exp(-t * 4)), sr, 0.003, 0.5), sr, 0.7, 0.4, 0.3, 1), -4)
```
</details>

<details><summary><code>stinger_logo</code> recipe</summary>

```js
(sr) => { const ch = [57, 60, 64, 69].map((m, i) => [lp(pluck(sr, 1.6, mtof(m), { seed: S('st' + i), damping: 0.998 }), sr, 4000), 0.35, i * 0.018]);
  const body = sum(sr, 1.8, [SFX.impact_sub.make(sr), 0.8], ...ch, [envADSR(hp(noise(sr, 1.6, S('shim')), sr, 8000), sr, 0.2, 0.3, 0.3, 0.8), 0.05]);
  return widen(normalize(reverb(body, sr, 0.8, 0.4, 0.3, 1.5), -1), sr, 10);
  }
```
</details>

## Beds / texture (loopable) (3)

| id | sound | use it for |
|---|---|---|
| `room_tone` | 4 s low room tone (loopable) | Under silent intros so the mix never drops to digital zero |
| `tape_hiss` | 4 s tape hiss (loopable) | Analogue/retro grade layer |
| `crt_hum` | 4 s CRT/mains hum + 15.7 kHz whine | The CRT grid look; keep at -30 dB |

<details><summary><code>room_tone</code> recipe</summary>

```js
(sr) => normalize(fade(lp(noise(sr, 4, S('room'), 'brown'), sr, 500), sr, 0.2, 0.2), -18)
```
</details>

<details><summary><code>tape_hiss</code> recipe</summary>

```js
(sr) => normalize(fade(bp(noise(sr, 4, S('hiss'), 'pink'), sr, 6000, 0.5), sr, 0.2, 0.2), -24)
```
</details>

<details><summary><code>crt_hum</code> recipe</summary>

```js
(sr) => normalize(fade(sum(sr, 4, [osc(sr, 4, 'sine', 50), 0.6], [osc(sr, 4, 'sine', 100), 0.3], [osc(sr, 4, 'sine', 150), 0.15], [osc(sr, 4, 'sine', 15734), 0.02]), sr, 0.2, 0.2), -24)
```
</details>
