# SFX library (50 sounds, 48000 Hz, procedurally generated, royalty-free)

| id | category | length | peak | what | use it for |
|---|---|---|---|---|---|
| `click_soft` | ui | 0.08 s | -3.0 dB | Soft rounded click | Gentle UI confirmations, low-stakes reveals |
| `click_hard` | ui | 0.06 s | -1.0 dB | Sharp plastic click | Emphatic UI taps, button presses on hero CTAs |
| `key_soft` | ui | 0.07 s | -6.0 dB | Quiet laptop key tap | Under word-by-word reveals (word_in). Keep -6 dB under clicks |
| `key_click` | ui | 0.09 s | -3.0 dB | Mechanical keyboard switch (click + bottom-out) | Typewriter reveals (type_char) |
| `tick_hi` | ui | 0.05 s | -4.0 dB | High metallic tick | Minor decode lands, list markers, small accents |
| `tick_lo` | ui | 0.08 s | -3.0 dB | Low wooden tick | Clock-like rhythm, metronomic beat markers |
| `double_tick` | ui | 0.12 s | -3.0 dB | Two quick ticks (ti-tick) | Toggling states, "locked" moments |
| `toggle_on` | ui | 0.12 s | -3.0 dB | Switch flick with upward chirp | Feature on, value appears, checkmarks |
| `toggle_off` | ui | 0.12 s | -3.0 dB | Switch flick with downward chirp | Feature off, strike-through, removal |
| `relay_click` | ui | 0.14 s | -2.0 dB | Electro-mechanical relay clack | System engaging, scene switch in industrial themes |
| `mouse_click` | ui | 0.14 s | -3.0 dB | Mouse button down+up pair | Cursor demos, UI walkthroughs |
| `tap_wood` | ui | 0.15 s | -3.0 dB | Knuckle on wood | Organic/warm brands, list items |
| `blip_up` | data | 0.12 s | -4.0 dB | Rising square blip | Positive change, numbers going up |
| `blip_down` | data | 0.12 s | -4.0 dB | Falling square blip | Negative change, closing, dismissal |
| `confirm_blip` | data | 0.32 s | -4.0 dB | Two-note ascending confirmation (fifth) | type_done, CTA complete, success |
| `error_buzz` | data | 0.30 s | -4.0 dB | Low detuned buzz | Wrong / problem beats ("most people do X") |
| `data_chirp` | data | 0.25 s | -5.0 dB | Fast random-pitch chirp burst | Data loading, AI "thinking" |
| `scramble_chatter` | data | 0.36 s | -5.0 dB | Granular digital chatter (~0.35 s) | Under decode/scramble reveals (decode_start). Signature sound of the demo |
| `counter_tick` | data | 0.03 s | -9.4 dB | Tiny high tick for counters | count_tick during numeric count-ups (throttled to 1 per 3 frames) |
| `modem_burst` | data | 0.40 s | -6.0 dB | Short FSK modem squeal | Connection established, retro-tech themes |
| `sonar_ping` | data | 1.70 s | -4.0 dB | Sine ping with long echo | Discovery, "found it", location reveals |
| `telemetry_pings` | data | 0.50 s | -6.0 dB | Three soft telemetry beeps | Status updates, dashboards |
| `glitch_tick` | glitch | 0.07 s | -4.0 dB | Tiny bit-crushed digital tick | label_in (tag glitch-in). The demo's high transient on every tag |
| `glitch_stutter` | glitch | 0.30 s | -5.0 dB | Chopped stutter of noise + tone | Error states, rapid-fire edits |
| `static_burst` | glitch | 0.18 s | -6.0 dB | Short TV static burst | Scene transitions (glitch_cut) |
| `rgb_tear` | glitch | 0.25 s | -4.0 dB | Tearing digital rip with pitch drop | Heavy glitch transitions, before/after reveals |
| `crt_on` | glitch | 0.80 s | -3.0 dB | CRT power-on thunk + rising whine | Video open, first frame |
| `crt_off` | glitch | 0.50 s | -3.0 dB | CRT collapse — falling zap | Video end, hard outros |
| `signal_drop` | glitch | 0.22 s | -10.0 dB | Short low-passed dropout | Scene exit dims (exit). Keep subtle |
| `digital_zap` | glitch | 0.25 s | -3.0 dB | FM zap | Energy hits, power-ups |
| `whoosh_short` | transition | 0.35 s | -3.0 dB | Fast air whoosh (0.35 s) | Slides, pushes, quick cuts |
| `whoosh_long` | transition | 0.91 s | -3.0 dB | Slow wide whoosh (0.9 s) | Big scene changes, camera moves |
| `swipe_air` | transition | 0.16 s | -5.0 dB | Very short swipe | Strike-throughs, swipes, item removals |
| `reverse_swell` | transition | 0.80 s | -4.0 dB | Reversed reverb swell | 0.6 s BEFORE a hero lands (place with negative offset) |
| `riser_noise` | transition | 2.00 s | -3.0 dB | 2 s filtered noise riser | Build into the reveal / drop |
| `riser_tonal` | transition | 2.00 s | -4.0 dB | 2 s pitch riser (saw, filtered) | Tension before CTA / big stat |
| `downlifter` | transition | 1.20 s | -3.0 dB | 1.2 s falling noise + tone | After a drop, release of tension, outro |
| `impact_sub` | impact | 0.70 s | -1.0 dB | Sub-bass thump (pitch-dropping sine + click) | Hero decode_land. Felt more than heard — the demo's low hits |
| `impact_punch` | impact | 0.40 s | -1.0 dB | Punchy kick-style hit | Stat lands, list completes, beat-synced emphasis |
| `boom_cinematic` | impact | 3.11 s | -1.0 dB | Big trailer boom with reverb tail | Once per video max: title or reveal |
| `thud_soft` | impact | 0.30 s | -3.0 dB | Muffled soft thud | Subtle lands for secondary lines |
| `hit_metallic` | impact | 1.20 s | -2.0 dB | Inharmonic metal hit | Industrial brands, "locked/sealed" moments |
| `slam_gate` | impact | 0.75 s | -1.0 dB | Gated reverb slam | Final word of the video, logo slam |
| `chime_confirm` | musical | 2.00 s | -4.0 dB | Bright two-note FM chime | Positive outcomes, success states |
| `pluck_accent` | musical | 1.40 s | -4.3 dB | Single KS pluck (A4) with echo | Musical accent on a key word; matches the demo bed |
| `bell_soft` | musical | 2.50 s | -4.0 dB | Soft glassy bell | Calm reveals, end cards for gentle brands |
| `stinger_logo` | musical | 3.31 s | -1.0 dB | Sub hit + minor chord pluck + shimmer | logo_in on the end card — the sonic logo |
| `room_tone` | texture | 4.00 s | -18.0 dB | 4 s low room tone (loopable) | Under silent intros so the mix never drops to digital zero |
| `tape_hiss` | texture | 4.00 s | -24.0 dB | 4 s tape hiss (loopable) | Analogue/retro grade layer |
| `crt_hum` | texture | 4.00 s | -24.0 dB | 4 s CRT/mains hum + 15.7 kHz whine | The CRT grid look; keep at -30 dB |

Audition every sound in order: `_reel.wav` (0.6 s gaps, same order as this table).
