# DESIGN.md parameter reference (motion-design/1.0)

Units: px values are authored at a **1080 px reference** and multiplied by `min(width,height)/1080 × layout.type_scale`.
Frames are at `canvas.fps`. Colours are `#RRGGBB`. "Read by" = which part of the engine consumes the field.

## Identity
| Field | Type | Default | Effect / guidance | Read by |
|---|---|---|---|---|
| `schema` | string | motion-design/1.0 | version of this contract | compiler |
| `id`, `name`, `version`, `updated`, `description` | string | — | identification; bump `version` on any change | report |
| `brand.name` | string | — | wordmark fallback, post copy | endcard |
| `brand.voice` | string[] | — | copy tone for content-md normalisation | agent |
| `brand.url`, `brand.handle` | string | null | CTA defaults, post copy | agent |
| `brand.logo.primary` | path relative to `.motion-graphics/` | assets/logo.svg | rendered on endcards if the file exists | endcard |
| `brand.logo.wordmark_fallback` | string | brand name | text logo when no file | endcard |
| `brand.logo.min_height_px`, `clearspace_ratio` | number | 96, 0.5 | logo size / spacing | endcard |
| `brand.legal.disclaimer` | string | null | add a `tail` or a final card if present | agent |

## Canvas & layout
| Field | Type | Default | Effect | Read by |
|---|---|---|---|---|
| `canvas.default_format` | vertical\|portrait\|square\|horizontal | vertical | used when choreography omits `format` | compiler |
| `canvas.fps` | 24\|25\|30\|60 | 30 | all timing tokens are frames at this rate | everything |
| `canvas.formats.<f>` | {width,height,aspect,platforms} | 1080×1920 … | output size per format | compiler |
| `canvas.safe_area.<f>` | {top,bottom,left,right} fractions | see template | keeps copy clear of platform UI (TikTok/Reels right rail + caption area) | layout |
| `layout.anchor` | left\|center | left | text alignment and push-in origin | scene |
| `layout.vertical_align` | top\|center\|bottom | center | where the final block sits in the safe area | scene |
| `layout.text_max_width` | 0–1 | 0.86 | text column width (fraction of canvas) — `fill` lines span exactly this | layout |
| `layout.block_offset_y` | −0.2–0.2 | −0.02 | nudge the block (fraction of height) | scene |
| `layout.stack_gap_em` | number | 0.18 | gap between elements as a fraction of the element size | scene |
| `layout.type_scale` | number | 1 | global type multiplier | layout |
| `layout.per_format.<f>` | object | — | any layout field overridden for one format | compiler |

## Colour
| Field | Default | Guidance |
|---|---|---|
| `colors.background`, `background_alt` | dark neutral | base and the radial lift behind the text |
| `colors.text_primary/secondary/muted` | — | hero / setup+tail / pending+scramble |
| `colors.accent_*` | — | any names; choreography `emphasis:` references them |
| `colors.label`, `glow`, `grid_line` | — | tag colour, glow tint, grid lines |
| `colors.rules.accent_budget_per_scene` | 1 | agent rule (one accented element per scene) |
| `colors.rules.accent_rotation` | [..] | colours used by `emphasis: auto` |
| `colors.rules.min_contrast_ratio` | 4.5 | validator warning threshold |

## Typography
`typography.families.{display,body,mono}`: `family` (CSS family name, must match the font's name), `package`
(npm @fontsource package), `weights`, `substitute_for` (note when replacing a commercial face).

`typography.roles.<role>`: one per text role. Roles used by templates: `label, setup, headline, tail, line, item, stat, cta`.
| Key | Meaning |
|---|---|
| `family` | display \| body \| mono |
| `size_px` | size at 1080 ref. For `fit: fill` this is the **maximum** |
| `weight` | numeric weight (must be bundled) |
| `tracking_em` | letter-spacing in em |
| `case` | upper \| lower \| as_written (applied by the compiler, before fitting) |
| `color` | colour token |
| `fit` | `fill`: line scaled to span the column exactly (min `min_px`) · `shrink`: scale down only (floor `min_scale`) · `wrap`: may wrap to `max_lines` |
| `min_px`, `min_scale`, `max_lines` | fit limits. Breaking them = validation **error** (rewrite the copy) |
| `line_height` | unitless |
| `max_chars` | copy length limit (error for headline/stat, warning otherwise) |
| `glow` | true = soft bloom on landed text |
| `format` | label: `"[ {nn} // {text} ]"`, cta: `"[ {text} ]"` |
| `marker` | list bullet glyph (item role) |

## Texture (all deterministic)
| Field | Default | Notes |
|---|---|---|
| `grid` {enabled, cell_px, line_px, color, opacity} | 38/4 | CSS gradients; free to render |
| `scanlines` {enabled, spacing_px, thickness_px, opacity} | 3/1/0.16 | drawn over everything |
| `vignette` {enabled, strength, roundness} | 0.6 | |
| `grain` {enabled, amount, fps} | 0.07 @15 fps | SVG turbulence seeded by frame |
| `flicker` {enabled, amplitude} | 0.035 | global brightness wobble — keep < 0.05 (photosensitivity) |
| `glow` {headline_blur_px, headline_opacity, accent_blur_px, accent_opacity} | 16/0.55/22/0.7 | |
| `chromatic_aberration` {label_px, glitch_px} | 2.5 / 9 | RGB split on tags and glitches |
| `noise_seed` | 1337 | change to get a different (still deterministic) grain |

## Motion
| Field | Default | Notes |
|---|---|---|
| `motion.personality` | — | one sentence the agent uses to judge new ideas |
| `motion.easing.{enter,exit,standard}` | cubic-bezier arrays | no overshoot values > 1 in y unless the brand allows bounce |
| `motion.timing.*` | see template | every reveal duration; see motion-craft for presets |
| `motion.reveal_defaults` | {slot: reveal} | — | brand-wide reveal per slot, e.g. `{headline: words}` for brands that never scramble; scenes can still override |
| `motion.scramble_charset` | `!<>-_\/[]{}…` | glyphs shown while decoding |
| `motion.word_in` {blur_px, rise_px, pending_color} | 8/10/text_muted | word reveal feel |
| `motion.scene.{default,min,max}_duration_s` | 4.4/2.4/7 | validator bounds |
| `motion.scene.transition` | glitch_cut | default `transition_out` |
| `motion.scene.transition_frames` | 6 | length of transition-in effects |
| `motion.camera.drift_scale` | 0.025 | slow push-in per scene (0 = locked off) |
| `motion.camera.shake_on_land_px` | 0 | tiny shake when the hero lands |
| `motion.rhythm.snap_scene_to_beat` | true | scene lengths rounded to whole beats of the BPM |
| `motion.forbidden` | [] | agent rule list |

## Audio
| Field | Default | Notes |
|---|---|---|
| `audio.sample_rate` | 48000 | |
| `audio.music.source` | synth | synth \| file (16-bit WAV in .motion-graphics/assets/audio/) \| none |
| `audio.music.preset` | signal_drone | signal_drone \| pulse_minimal \| warm_keys \| dark_tension |
| `audio.music.bpm`, `key`, `scale` | 100, A, minor | tempo also drives scene beat-snapping |
| `audio.music.gain_db`, `fade_in_s`, `fade_out_s`, `duck_db` | −17, 0.8, 2.5, 4 | bed level and ducking under hero hits |
| `audio.sfx.gain_db` | −9 | base SFX level (per-event offsets in the engine) |
| `audio.sfx.min_spacing_frames` | {word_in:3,…} | throttles rapid events |
| `audio.sfx.map.<event>` | ids | events: scene_in, label_in, word_in, decode_start, decode_land, decode_land_minor, type_char, type_done, count_tick, count_land, strike, logo_in, exit, transition |
| `audio.sfx.gains.<event>` | — | optional dB offsets per event |
| `audio.master.lufs_target`, `true_peak_db` | −14, −1 | platform loudness targets |

## Endcard, export, accessibility
| Field | Default | Notes |
|---|---|---|
| `endcard.show_logo`, `cta_default`, `hold_s` | true, —, 2 | |
| `export.crf` | 18 | 16 = archival, 20–23 = smaller files |
| `export.pixel_format` | yuv420p | required by most platforms |
| `export.audio_bitrate` | 320k | |
| `export.max_duration_s.<platform>` | — | validator **error** when exceeded |
| `accessibility.min_text_px` | 26 | agent rule |
| `accessibility.max_flashes_per_second` | 3 | WCAG 2.3.1 photosensitivity |
