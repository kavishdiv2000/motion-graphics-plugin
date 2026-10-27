---
# ============================================================================
# DESIGN.md TEMPLATE — motion-design/1.0
# The STATIC configuration of the motion-graphics agent: set once per brand,
# obeyed by every video. Valid YAML with neutral defaults so it works as-is.
#
# HOW AGENTS USE THIS FILE
#   • Every field has a default. Fields marked  # ASK:  are the questions to put to
#     the user during setup (design-md skill → "Interview"). Ask in the listed order,
#     at most 4 questions per turn, offering the default as the recommended option.
#   • Fields marked  # DERIVE:  are computed from other answers or from a brand URL /
#     reference video — do not ask the user about them.
#   • Colour values are hex strings. Sizes are px at a 1080 px reference (scaled
#     automatically for other sizes). Times are frames at canvas.fps unless named _s.
#   • Lives at <workspace>/.motion-graphics/DESIGN.md (never inside the plugin). After filling: node .motion-graphics/mg.mjs design validate
# ============================================================================
schema: motion-design/1.0
id: my-brand                          # DERIVE: kebab-case of brand.name
name: My Brand Motion System          # DERIVE: "<brand> Motion System" or a named style
version: 1.0.0
updated: 2026-01-01                   # DERIVE: today
description: >                        # DERIVE: one sentence on the look, written after the interview
  Clean kinetic typography on a dark field with one accent colour.

brand:
  name: My Brand                      # ASK: What is the brand / company name as it should appear on screen?
  tagline: null                       # ASK (optional): Tagline or positioning line?
  voice: [clear, confident]           # ASK: 3-5 adjectives for the voice (e.g. terse, warm, playful, technical, irreverent)
  handle: null                        # ASK (optional): Main social handle?
  url: null                           # ASK: Website / CTA destination?
  logo:
    primary: assets/logo.svg          # ASK: Upload your logo (SVG preferred, or PNG with transparency) — saved to .motion-graphics/assets/
    mono: null                        # optional single-colour version for busy backgrounds
    wordmark_fallback: MY BRAND       # DERIVE: brand.name uppercased; used when no logo file exists
    min_height_px: 96
    clearspace_ratio: 0.5
  legal:
    disclaimer: null                  # ASK (regulated industries only): Any disclaimer that must appear?
    trademark_notes: Never use third-party logos without written permission.

canvas:
  default_format: vertical            # ASK: Main platform? → tiktok/reels/shorts = vertical · feed = portrait · linkedin/x = square · youtube/web = horizontal
  fps: 30                             # 30 for social. 24 = filmic/slower feel. 60 only for UI/gaming smoothness (2x render time)
  formats:
    vertical:   { width: 1080, height: 1920, aspect: "9:16", platforms: [tiktok, reels, shorts, stories] }
    portrait:   { width: 1080, height: 1350, aspect: "4:5",  platforms: [instagram_feed, linkedin_feed, facebook_feed] }
    square:     { width: 1080, height: 1080, aspect: "1:1",  platforms: [linkedin_feed, x, facebook_feed] }
    horizontal: { width: 1920, height: 1080, aspect: "16:9", platforms: [youtube, linkedin_video, x, web] }
  safe_area:                          # fractions kept free of platform UI (captions, buttons, progress bars)
    vertical:   { top: 0.12, bottom: 0.22, left: 0.074, right: 0.07 }
    portrait:   { top: 0.06, bottom: 0.08, left: 0.074, right: 0.074 }
    square:     { top: 0.07, bottom: 0.07, left: 0.074, right: 0.074 }
    horizontal: { top: 0.08, bottom: 0.10, left: 0.06,  right: 0.06 }

layout:
  anchor: left                        # ASK: Text alignment — left (editorial, technical) or center (announcement, playful)?
  vertical_align: center              # top | center | bottom
  text_max_width: 0.86                # fraction of canvas width the text column may use
  block_offset_y: -0.02               # nudge the whole block up (negative) or down
  stack_gap_em: 0.18
  unit: min_side_over_1080
  type_scale: 1.0
  per_format:
    horizontal: { text_max_width: 0.62, type_scale: 1.3 }
    square:     { text_max_width: 0.86, type_scale: 0.92 }
    portrait:   { text_max_width: 0.86, type_scale: 0.96 }

colors:                               # ASK: Brand colours? (hex, or "pull them from <url>") — need a background, a text colour and 1-3 accents
  background:      "#0E0E0E"          # DERIVE: darkest brand neutral (dark themes) or lightest (light themes)
  background_alt:  "#161616"          # DERIVE: background shifted 4-6% toward text colour (used for the radial lift)
  grid_line:       "#000000"
  text_primary:    "#F2F2F2"          # hero / headline colour
  text_secondary:  "#B8B8B8"          # setup and tail copy
  text_muted:      "#6A6A6A"          # pending words, scramble glyphs
  accent_red:      "#FF3B30"          # rename freely, e.g. accent_brand — choreography references these names
  accent_orange:   "#FF8A00"
  accent_blue:     "#2F6BFF"
  accent_yellow:   "#FFC400"
  steel:           "#A0A6AA"
  label:           "#FF3B30"          # DERIVE: usually the primary accent
  glow:            "#FFFFFF"
  rules:
    accent_budget_per_scene: 1
    accent_rotation: [accent_red, accent_orange]
    min_contrast_ratio: 4.5           # validator warns below this (WCAG AA)

typography:                           # ASK: Brand fonts? If commercial, do you hold a licence for video use? Otherwise we pick the closest free (OFL) match.
  families:
    display:                          # hero words. Wide/extended = technical; condensed = urgent; serif = editorial; rounded = friendly
      family: Michroma
      package: "@fontsource/michroma"
      weights: [400]
    body:
      family: Inter
      package: "@fontsource/inter"
      weights: [400, 500, 600]
    mono:
      family: JetBrains Mono
      package: "@fontsource/jetbrains-mono"
      weights: [400, 700]
  roles:                              # fit: fill (line spans the column exactly) | shrink | wrap
    label:    { family: mono,    size_px: 22,  weight: 700, tracking_em: 0.32, case: upper, color: label,          fit: shrink, min_scale: 0.7, max_chars: 24, format: "[ {nn} // {text} ]" }
    setup:    { family: body,    size_px: 54,  weight: 500, tracking_em: -0.01, case: as_written, color: text_secondary, fit: wrap, max_lines: 2, line_height: 1.12, max_chars: 44 }
    headline: { family: display, size_px: 170, weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 84, line_height: 1.0, max_chars: 14, glow: true }
    tail:     { family: body,    size_px: 50,  weight: 500, tracking_em: -0.01, case: as_written, color: text_secondary, fit: wrap, max_lines: 2, line_height: 1.12, max_chars: 44 }
    line:     { family: display, size_px: 92,  weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 38, line_height: 1.05, max_chars: 26 }
    item:     { family: mono,    size_px: 40,  weight: 400, tracking_em: 0.02, case: as_written, color: text_primary, fit: shrink, min_scale: 0.7, line_height: 1.3, max_chars: 32, marker: "▸" }
    stat:     { family: display, size_px: 240, weight: 400, tracking_em: 0.0,  case: upper, color: text_primary,   fit: fill, min_px: 120, line_height: 0.95, max_chars: 7, glow: true }
    cta:      { family: mono,    size_px: 30,  weight: 700, tracking_em: 0.16, case: upper, color: accent_orange,  fit: shrink, min_scale: 0.7, max_chars: 34, format: "[ {text} ]" }

texture:                              # ASK: Surface feel? → clean (all off) · tech/CRT (grid+scanlines+grain) · film (grain+vignette) · paper (grain, light bg)
  grid:        { enabled: false, cell_px: 38, line_px: 4, color: grid_line, opacity: 0.5 }
  scanlines:   { enabled: false, spacing_px: 3, thickness_px: 1, opacity: 0.14 }
  vignette:    { enabled: true, strength: 0.45, roundness: 0.9 }
  grain:       { enabled: true, amount: 0.05, fps: 15 }
  flicker:     { enabled: false, amplitude: 0.03 }
  glow:        { headline_blur_px: 14, headline_opacity: 0.35, accent_blur_px: 20, accent_opacity: 0.55 }
  chromatic_aberration: { label_px: 0, glitch_px: 6 }
  noise_seed: 1

motion:                               # ASK: Motion personality? → precise/mechanical · smooth/premium · punchy/energetic · calm/editorial
  personality: Precise and confident. Things arrive fast and settle; nothing bounces.
  easing:
    enter:    [0.16, 1, 0.3, 1]       # expo-out (precise). smooth: [0.33,1,0.68,1] · punchy: [0.22,1,0.36,1]
    exit:     [0.7, 0, 0.84, 0]
    standard: [0.65, 0, 0.35, 1]
  timing:                             # frames @ canvas.fps — see motion-craft skill for presets per personality
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
  scramble_charset: "!<>-_\\/[]{}=+*^?#%&$@01"
  word_in: { blur_px: 8, rise_px: 10, pending_color: text_muted }
  scene:
    default_duration_s: 4.0
    min_duration_s: 2.4
    max_duration_s: 7.0
    transition: hard_cut              # glitch_cut | hard_cut | dim_cut | flash_cut
    transition_frames: 6
  camera: { drift_scale: 0.02, shake_on_land_px: 0 }
  rhythm: { snap_scene_to_beat: true, land_on_beat: true }
  forbidden: [bounce, elastic, spin, 3d_flip, emoji, gradient_text]   # ASK (optional): Anything the brand must never do?

audio:                                # ASK: Sound? → music + SFX (default) · SFX only · music only · silent (captions-first platforms)
  sample_rate: 48000
  music:
    source: synth                     # synth | file | none   (file = your licensed track, 16-bit WAV 48 kHz in .motion-graphics/assets/audio/)
    file: null
    preset: pulse_minimal             # ASK: Music mood? signal_drone (dark/tech) · pulse_minimal (product/launch) · warm_keys (human/calm) · dark_tension (problem/urgency)
    bpm: 100                          # 80-95 calm · 96-110 confident · 112-128 energetic
    key: A
    scale: minor                      # minor | major | dorian | phrygian
    gain_db: -17
    fade_in_s: 0.8
    fade_out_s: 2.5
    duck_db: 4
  sfx:
    gain_db: -9
    min_spacing_frames: { word_in: 3, type_char: 2, count_tick: 3 }
    map:                              # event -> SFX id (sound-design skill has all 50 ids). null = silent
      scene_in: null
      label_in: tick_hi
      word_in: key_soft
      decode_start: data_chirp
      decode_land: impact_punch
      decode_land_minor: tick_hi
      type_char: key_click
      type_done: confirm_blip
      count_tick: counter_tick
      count_land: impact_punch
      strike: swipe_air
      logo_in: stinger_logo
      exit: null
      transition: whoosh_short
  master: { lufs_target: -14, true_peak_db: -1.0 }
  voiceover: { enabled: false, provider: null }

endcard:
  show_logo: true
  cta_default: LEARN MORE             # DERIVE: from brand.url, e.g. "VISIT // mybrand.com"
  hold_s: 2.0

export:
  container: mp4
  video_codec: h264
  crf: 18
  pixel_format: yuv420p
  audio_codec: aac
  audio_bitrate: 320k
  thumbnail_frame: hero
  max_duration_s: { tiktok: 60, reels: 90, shorts: 60, stories: 15, linkedin_feed: 90, x: 140, youtube: 180 }

accessibility:
  min_text_px: 26
  max_flashes_per_second: 3
  captions: burned_in_by_design
---

# <Brand> — motion design system
<!-- The agent writes these sections after the interview. Keep each short and specific:
     they are read by models that must make judgement calls the tokens don't cover. -->

## 1. Overview
What the films feel like in one paragraph. What to use the system for and what not to.

## 2. Composition
Anchor, hierarchy per scene, how much negative space, what may break the grid.

## 3. Colour
Meaning of each accent; the accent budget; light/dark rules.

## 4. Typography
Display/body/mono roles, case, punctuation habits, maximum lengths, fit rules.

## 5. Texture
Which layers are on and why.

## 6. Motion language
Table of element → reveal → feel. Easing words. Scene length. Exit behaviour.

## 7. Sound
Bed mood, BPM, SFX punctuation rules, loudness.

## 8. Do / Don't
Bullet lists.

## 9. Agent notes
Rules for edge cases: overflow → rewrite copy; unsure → no accent; logos only from files.
