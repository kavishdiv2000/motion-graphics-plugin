---
# ============================================================================
# DESIGN.md — STATIC motion-design system for the motion-graphics agent.
# Machine-readable tokens live in this YAML front matter. The prose below the
# front matter explains intent so an agent can make judgment calls the tokens
# do not cover. Set once per brand; every video the agent makes obeys it.
# Example: "Signal Ops", reverse-engineered from the demo reel
# (demo-1.mp4) and the Brass Hands visual language (brasshands.com).
# ============================================================================
schema: motion-design/1.0
id: signal-ops
name: Signal Ops
version: 1.0.0
updated: 2026-10-19
description: >
  Terminal-grade kinetic typography on a dark CRT grid. Copy is revealed like a
  decoded transmission: a bracketed mono tag, a calm sans setup line, then one
  wide, glowing display word that resolves out of scrambled glyphs.

brand:
  name: Damn Fine Agents            # replace with your brand
  tagline: Design for the new industrial age of work
  voice: [terse, declarative, confident, field-operations, no hype words]
  handle: "@damnfineagents"
  url: damnfineagents.com
  logo:
    primary: assets/logo.svg         # relative to .motion-graphics/
    mono: assets/logo-mono.svg
    wordmark_fallback: DFA           # rendered in the display face when no logo file exists
    min_height_px: 96
    clearspace_ratio: 0.5            # x logo height
  legal:
    disclaimer: null
    trademark_notes: Never use client or third-party logos without written permission.

canvas:
  default_format: vertical
  fps: 30
  formats:
    vertical:   { width: 1080, height: 1920, aspect: "9:16", platforms: [tiktok, reels, shorts, stories] }
    portrait:   { width: 1080, height: 1350, aspect: "4:5",  platforms: [instagram_feed, linkedin_feed, facebook_feed] }
    square:     { width: 1080, height: 1080, aspect: "1:1",  platforms: [linkedin_feed, x, facebook_feed] }
    horizontal: { width: 1920, height: 1080, aspect: "16:9", platforms: [youtube, linkedin_video, x, web] }
  safe_area:                         # fractions of the canvas kept clear of platform UI
    vertical:   { top: 0.12, bottom: 0.22, left: 0.074, right: 0.07 }
    portrait:   { top: 0.06, bottom: 0.08, left: 0.074, right: 0.074 }
    square:     { top: 0.07, bottom: 0.07, left: 0.074, right: 0.074 }
    horizontal: { top: 0.08, bottom: 0.10, left: 0.06,  right: 0.06 }

layout:
  anchor: left                       # left | center
  vertical_align: center             # top | center | bottom — the FINAL block is centred; elements never reflow
  text_max_width: 0.86               # fraction of canvas width
  block_offset_y: -0.02              # nudge the block (fraction of height); negative = up
  stack_gap_em: 0.18                 # gap between consecutive text elements, in headline em
  unit: min_side_over_1080           # every px value below is authored at 1080 and scaled by min(width,height)/1080
  type_scale: 1.0                    # extra multiplier on all type sizes
  per_format:                        # overrides merged on top of the values above for one format
    horizontal: { text_max_width: 0.62, type_scale: 1.3, block_offset_y: 0 }
    square:     { text_max_width: 0.86, type_scale: 0.92 }
    portrait:   { text_max_width: 0.86, type_scale: 0.96 }

colors:
  background:      "#0B0B07"         # olive-black CRT base
  background_alt:  "#121210"
  grid_line:       "#000000"
  text_primary:    "#E8E8E4"         # headline silver-white
  text_secondary:  "#B4B4AE"         # setup / tail copy
  text_muted:      "#6E6E68"         # pending words, scrambled glyphs
  accent_red:      "#F82820"         # primary accent — signal / correction
  accent_orange:   "#FF6A1A"         # secondary accent — payoff / speed (Brass Hands orange family #FF6200)
  accent_blue:     "#2450F8"         # tertiary — rare, cool counterpoint
  accent_yellow:   "#F8C21C"         # tertiary — rare, warm counterpoint
  steel:           "#ADB3B7"         # Brass Hands steel, UI chrome and dividers
  label:           "#F82820"         # bracket tags
  glow:            "#FFFFFF"
  rules:
    accent_budget_per_scene: 1       # at most one accented element per scene
    accent_rotation: [accent_red, accent_red, accent_orange]   # default order when choreography says `emphasis: auto`
    min_contrast_ratio: 4.5          # text vs background (WCAG AA), checked by the validator

typography:
  families:
    display:
      family: Michroma
      package: "@fontsource/michroma"
      weights: [400]
      substitute_for: Artific Bold (Brass Hands, commercial) — swap in when licensed
    body:
      family: Inter
      package: "@fontsource/inter"
      weights: [400, 500, 600]
    mono:
      family: JetBrains Mono
      package: "@fontsource/jetbrains-mono"
      weights: [400, 700]
      substitute_for: Construct Mono (Brass Hands, commercial)
  roles:                             # px at the 1080 reference unit. fit: fill | shrink | wrap
    # fill   = the line is scaled to span the full text column exactly (capped at size_px, floored at min_px).
    #          This is the demo's signature: every display line is the same width, like a justified slab.
    # shrink = size_px unless it overflows, then scaled down (floor min_scale).
    # wrap   = body copy; may wrap to max_lines.
    label:    { family: mono,    size_px: 22,  weight: 700, tracking_em: 0.32, case: upper, color: label,          fit: shrink, min_scale: 0.7, max_chars: 24, format: "[ {nn} // {text} ]" }
    setup:    { family: body,    size_px: 54,  weight: 500, tracking_em: -0.01, case: as_written, color: text_secondary, fit: wrap, max_lines: 2, line_height: 1.12, max_chars: 44 }
    headline: { family: display, size_px: 170, weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 84, line_height: 1.0, max_chars: 14, glow: true }
    tail:     { family: body,    size_px: 50,  weight: 500, tracking_em: -0.01, case: as_written, color: text_secondary, fit: wrap, max_lines: 2, line_height: 1.12, max_chars: 44 }
    line:     { family: display, size_px: 92,  weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 38, line_height: 1.05, max_chars: 26 }
    item:     { family: mono,    size_px: 40,  weight: 400, tracking_em: 0.02, case: as_written, color: text_primary, fit: shrink, min_scale: 0.7, line_height: 1.3, max_chars: 32, marker: "▸" }
    stat:     { family: display, size_px: 240, weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 120, line_height: 0.95, max_chars: 7, glow: true }
    cta:      { family: mono,    size_px: 30,  weight: 700, tracking_em: 0.16, case: upper, color: accent_orange,  fit: shrink, min_scale: 0.7, max_chars: 34, format: "[ {text} ]" }

texture:
  grid:        { enabled: true, cell_px: 38, line_px: 4, color: grid_line, opacity: 0.55 }
  scanlines:   { enabled: true, spacing_px: 3, thickness_px: 1, opacity: 0.16 }
  vignette:    { enabled: true, strength: 0.62, roundness: 0.9 }
  grain:       { enabled: true, amount: 0.07, fps: 15 }            # deterministic, seeded per frame
  flicker:     { enabled: true, amplitude: 0.035 }                 # global brightness wobble
  glow:        { headline_blur_px: 16, headline_opacity: 0.55, accent_blur_px: 22, accent_opacity: 0.7 }
  chromatic_aberration: { label_px: 2.5, glitch_px: 9 }            # RGB split on tags and during glitches
  noise_seed: 1337

motion:
  personality: Decoded transmission. Mechanical precision, zero bounce. Things switch on; they do not float in.
  easing:                                                         # cubic-bezier control points
    enter:    [0.16, 1, 0.3, 1]      # expo-out: fast arrival, long settle
    exit:     [0.7, 0, 0.84, 0]      # expo-in
    standard: [0.65, 0, 0.35, 1]
  timing:                                                         # frames at canvas.fps
    scene_lead_in_frames: 3
    label_in_frames: 8
    label_overlap_frames: 4
    gap_frames: 3
    headline_gap_frames: 3
    word_stagger_frames: 3
    word_in_frames: 6
    decode_char_stagger_frames: 1.2
    decode_scramble_frames: 5
    decode_jitter_frames: 2
    decode_glyph_hold_frames: 2
    type_char_frames: 1
    count_frames: 26
    fade_frames: 12
    strike_frames: 10
    exit_frames: 12
    min_hold_frames: 24
    reading_wpm: 260
  scramble_charset: "!<>-_\\/[]{}=+*^?#%&$@01▒░"
  word_in: { blur_px: 8, rise_px: 10, pending_color: text_muted }
  scene:
    default_duration_s: 4.4
    min_duration_s: 2.4
    max_duration_s: 7.0
    transition: glitch_cut           # glitch_cut | hard_cut | dim_cut | flash_cut
    transition_frames: 6
  camera:
    drift_scale: 0.025               # slow push-in across each scene
    shake_on_land_px: 0              # 0 = disabled for this brand
  rhythm:
    snap_scene_to_beat: true         # scene lengths rounded to whole beats of audio.music.bpm
    land_on_beat: true               # hero decode_land is nudged to the nearest beat when within 3 frames
  forbidden: [bounce, elastic, spin, 3d_flip, emoji, gradient_text, drop_shadow_offset, stock_footage, lens_flare]

audio:
  sample_rate: 48000
  music:
    source: synth                    # synth | file | none
    file: null                       # e.g. assets/audio/bed.wav when source: file
    preset: signal_drone             # signal_drone | pulse_minimal | warm_keys | dark_tension
    bpm: 100
    key: A
    scale: minor
    gain_db: -17
    fade_in_s: 0.8
    fade_out_s: 2.5
    duck_db: 4                       # music dip under hero SFX
  sfx:
    gain_db: -9
    min_spacing_frames: { word_in: 3, type_char: 2, count_tick: 3 }
    map:                             # timeline event -> sound id (see sound-design skill library)
      scene_in: null
      label_in: glitch_tick
      word_in: key_soft
      decode_start: scramble_chatter
      decode_land: impact_sub
      decode_land_minor: tick_hi
      type_char: key_click
      type_done: confirm_blip
      count_tick: counter_tick
      count_land: impact_punch
      strike: swipe_air
      logo_in: stinger_logo
      exit: signal_drop
      transition: static_burst
  master:
    lufs_target: -14
    true_peak_db: -1.0
  voiceover:
    enabled: false
    provider: null

endcard:
  show_logo: true
  cta_default: ENGAGE // damnfineagents.com
  hold_s: 2.0                        # extra still time after CTA lands

export:
  container: mp4
  video_codec: h264
  crf: 18
  pixel_format: yuv420p
  audio_codec: aac
  audio_bitrate: 320k
  thumbnail_frame: hero               # hero | first | <frame number>
  max_duration_s: { tiktok: 60, reels: 90, shorts: 60, stories: 15, linkedin_feed: 90, x: 140, youtube: 180 }

accessibility:
  min_text_px: 26                    # at 1080 reference
  max_flashes_per_second: 3          # photosensitivity guard for glitch/flicker
  captions: burned_in_by_design      # every spoken idea is already on screen
---

# Signal Ops — motion design system

## 1. Overview
Signal Ops makes short, high-contrast typographic films that feel like a field
terminal decoding a message. One idea per scene. The viewer always knows
where to look: a small red tag, a calm grey setup line, then one wide, bright
word that *locks in*. Nothing floats, bounces or spins. Everything switches on.

Use it for: thought-leadership hooks, manifesto reels, product principles,
offer announcements, carousel-to-video conversions.
Avoid it for: tutorials with UI capture, testimonials with faces, playful consumer brands.

## 2. Composition
- **Left-anchored column**, left margin 7.4 % of width, block vertically centred
  inside the platform safe area. Elements are laid out in their final positions from
  frame 0 and only their visibility animates, so nothing reflows when a word lands.
- **Hierarchy per scene (top → bottom):** tag (20 px mono, red) → setup (46 px Inter, grey)
  → HERO (118 px Michroma, white or accent, glowing) → tail (44 px Inter, grey).
- The hero is the only element allowed to exceed 60 % of the canvas width.
- Negative space is the brand. Never fill the lower half "because it is empty".

## 3. Colour
- Base is an olive-black (#0B0B07), never pure #000; the slight warmth reads as a CRT phosphor.
- White hero words are the default. **One accent per scene, maximum.** Red marks a correction
  or a turn in the argument, orange marks the payoff or speed, and blue and yellow are reserved for
  rare counterpoints.
- Accents glow. Neutrals barely glow.

## 4. Typography
- Display: a wide, geometric, extended face (Michroma, standing in for Artific). Uppercase only.
  Always finish with punctuation when it is a sentence end ("HOURS.", "THINK.").
- Body: Inter Medium, sentence case, tight tracking. Body copy is a *setup* for the hero, not content in
  its own right: aim for 2–6 words.
- Mono tags: `[ 03 // OBSERVATION ]`. Wide tracking, bold, red, with a 2.5 px RGB split.
- Hero words of 12 characters or fewer stay on one line. Longer ones are scaled down to fit (to no less than 0.55×),
  and past that the copy must be rewritten, not wrapped.

## 5. Texture
Grid (38 px cells, 4 px dark lines), 3 px scanlines, a heavy vignette, animated grain at 15 fps, and a faint
global flicker. Textures sit *under* the type except the scanlines, which sit over everything
so the hero glow looks like light on glass.

## 6. Motion language
| Element | Reveal | Feel |
|---|---|---|
| Tag | glitch (RGB split collapses, 8 f) | a channel opening |
| Setup | word-by-word, 3 f stagger, blur 8→0, rise 10 px | someone typing a thought |
| Hero | decode: each char scrambles 7 f then locks | the signal resolving |
| Tail | words, same as setup | a quiet afterthought |
| Exit | 10 f dim + flicker, then a glitch cut | the channel closing |

- Easing: expo-out on entry and expo-in on exit. No overshoot, ever.
- Each scene is about 4.4 s (11 beats at 100 BPM, rounded to the beat).
- The hero lands on a beat. Sound and picture share one timeline.
- Slow push-in of 2.5 % across every scene keeps static frames alive.

## 7. Sound
A sub-heavy drone with a muted, plucked minor arpeggio at 100 BPM, kept low (-17 dB). The SFX are the
punctuation: soft key ticks under words, a scramble chatter under decodes, a sub thump when the hero lands,
and a static burst on the cut. The master is normalised to -14 LUFS with a -1 dBTP ceiling.

## 8. Do / Don't
**Do:** one idea per scene · end hero words with a full stop · keep the hero on one line · let the hold breathe
(at least 0.8 s of stillness after the last reveal) · reuse tags as a numbered argument (DIAGNOSIS → CORRECTION → …).
**Don't:** emoji · gradients on text · stock footage · more than one accent colour per scene · centred
paragraphs · exclamation marks · flashing more than 3 times per second.

## 9. Agent notes
- If content does not fit a template's character limits, **rewrite the copy** (and say so) rather than shrinking type.
- When unsure about emphasis, use white. Accent only the word that carries the argument's turn.
- Client or partner logos are never generated or traced; use the files in `.motion-graphics/assets/` or the wordmark fallback.
