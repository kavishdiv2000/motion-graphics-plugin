---
name: design-md
description: Create, extract, validate or edit DESIGN.md, the static motion-design system (brand, colours, typography roles, textures, motion timing, audio palette, formats, export) that every motion-graphics video obeys. Use when setting up the motion-graphics pipeline for a brand, when the user uploads or asks for a design.md, or wants to derive a motion style from a website, brand guide or reference video.
license: MIT
metadata:
  version: "1.1.0"
  schema: motion-design/1.0
---

# DESIGN.md — the static motion system

DESIGN.md is a contract between a brand and a renderer. YAML front matter holds machine tokens
(the compiler reads only these); the markdown body explains intent for models making judgement
calls the tokens don't cover. It is set **once per brand** and changes rarely, so take the time
to get it right.

Files in this skill:
- `references/DESIGN.template.md`: every parameter, valid defaults, `# ASK:` / `# DERIVE:` markers
- `references/DESIGN.example.md`: "Signal Ops", the complete system reverse-engineered from the reference reel + Brass Hands
- `references/parameters.md`: reference table of every field, its type, effect and safe range
- `references/extraction-guide.md`: how to derive a DESIGN.md from a reference video or website

## Three ways to produce it

Where it lives: **workspace mode** → `.motion-graphics/DESIGN.md` (one per workspace; never inside the plugin; start from
`node .motion-graphics/mg.mjs design new --template` or `--example`). **Chat mode** → a complete file in the conversation.

### A. The user supplied one
Workspace mode: save it as `.motion-graphics/DESIGN.md`, run `node .motion-graphics/mg.mjs design validate`, fix any
errors (unknown colour tokens, missing roles), and summarise the system back in 3 lines.

### B. Interview (no reference available)
Ask in this order, **at most 4 questions per turn**, always offering a recommended default. Use
multiple-choice UI if the platform has it.

| Turn | Ask | Maps to |
|---|---|---|
| 1 | Brand name · website/CTA URL · main platform · logo file | `brand.*`, `canvas.default_format`, `.motion-graphics/assets/logo.svg` |
| 2 | Colours (hex or "pull from site") · light or dark · text alignment | `colors.*`, `layout.anchor` |
| 3 | Fonts (and licence) · motion personality · surface feel | `typography.families`, `motion.easing/timing`, `texture.*` |
| 4 | Sound mode · music mood + tempo · anything the brand must never do | `audio.*`, `motion.forbidden` |

Then DERIVE everything else (see the presets below), write the prose body, and show a summary card:
palette swatches as hex, the three fonts, the personality in one sentence, scene length, music preset/BPM.
Then preview it and **show the contact sheet**. A design isn't approved until it has been seen:
`node .motion-graphics/mg.mjs session new "design preview" --example` (the reference reel's copy on *your* design), then
`node .motion-graphics/mg.mjs stills <that session>` and open `build/contact-vertical.png`.
**Chat mode:** no preview is possible. Output the complete DESIGN.md in one code block, describe the look in 3 lines,
and ask for approval (see motion-graphics/references/chat-mode.md).

### C. Extract from a reference (website, brand guide, video)
Follow `references/extraction-guide.md`. Record where each value came from in a comment.
Commercial fonts → nearest OFL substitute plus `substitute_for:`. Never copy a third party's
logo or a client's mark into the design.

## Presets for DERIVE fields

**Motion personality → easing + timing**
| Personality | enter easing | word_stagger | word_in | decode_scramble | default scene s | transition |
|---|---|---|---|---|---|---|
| precise / mechanical (tech, ops) | [0.16,1,0.3,1] | 3 | 6 | 5 | 4.4 | glitch_cut |
| smooth / premium (luxury, finance) | [0.33,1,0.68,1] | 4 | 10 | n/a: set `motion.reveal_defaults: {headline: words, lines: words}` | 4.8 | dim_cut |
| punchy / energetic (consumer, sport) | [0.22,1,0.36,1] | 2 | 5 | 4 | 3.2 | flash_cut (≤ 1 per 3 s) |
| calm / editorial (healthcare, B2B advisory) | [0.45,0,0.2,1] | 5 | 12 | n/a: `reveal_defaults` → words/fade | 5.6 | dim_cut |

**Surface feel → texture**
| Feel | grid | scanlines | grain | vignette | flicker | chromatic aberration |
|---|---|---|---|---|---|---|
| clean | off | off | 0.02 | 0.25 | off | 0 |
| tech / CRT | on 38/4 | on 3 px 0.16 | 0.07 | 0.6 | 0.035 | label 2.5, glitch 9 |
| film | off | off | 0.09 | 0.55 | 0.015 | 0 |
| paper (light bg) | off | off | 0.05, multiply | 0.15 | off | 0 |

**Colour derivation**
- `background_alt` = background moved 4–6 % toward `text_primary`.
- `text_secondary` = text_primary at ~72 % luminance; `text_muted` at ~42 %.
- `label` = the most saturated accent. Rotation = [primary accent, primary accent, secondary accent].
- Check every text role against the background at ≥ 4.5:1 (the build warns otherwise).
- Light themes: swap glow off (`glow: false` on roles, accent_opacity 0.25) — glow on light grounds looks like a smudge.

**Font pairing rules**
- Display face carries the brand. Use one display face, one text face and optionally one mono face. Never more than three.
- Extended/wide display → `fit: fill`, uppercase, hero ≤ 14 chars. Condensed display → hero ≤ 18 chars.
- Body: a neutral grotesk (Inter, Manrope, IBM Plex Sans). Mono: JetBrains Mono, IBM Plex Mono, Space Mono.
- Brand font files (any licensed .woff2/.ttf/.otf): `node .motion-graphics/mg.mjs font add <file> "<Family>" <weight>`, then set
  `typography.families.<display|body|mono>: { family: <Family>, file: assets/fonts/<file>, weights: [<weight>] }`.

## Validation checklist (before saving)
- [ ] every `color:` in roles names a key in `colors`
- [ ] the label, setup, headline, tail, line and cta roles exist (stat and item if those templates are used)
- [ ] `canvas.default_format` exists in `canvas.formats` and `canvas.safe_area`
- [ ] every `audio.sfx.map` value is an id from the sound-design library (or null)
- [ ] `mg design validate` passes and a preview session's contact sheet has been looked at (workspace mode)

## Editing later
Changing DESIGN.md changes **every future video**. Replace it with `mg design new --force` (a timestamped backup is kept) or edit in place; bump `version`, add a line to the body
("v1.1 — accent orange warmed to #FF6A1A") and re-render one reference job to compare.
