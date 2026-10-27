---
name: motion-qa
description: Quality-assure motion-graphics renders — automated technical checks (codec, size, fps, duration, pixel format, loudness, true peak) plus a scored visual critique of contact sheets with a professional motion-director rubric and a fix loop that maps every problem to a change in DESIGN/CHOREOGRAPHY/CONTENT. Use after building stills or rendering a video, before delivering, or when asked to review/critique a motion-graphics video.
license: MIT
metadata:
  version: "1.1.0"
---

# Motion QA

Quality comes from looking. Two layers: **machine checks** (objective, scripted) and **director's eye**
(you, looking at frames). Never deliver without both.

## 1. Machine checks
```bash
node .motion-graphics/mg.mjs validate <id>   # copy, fit, timing, contrast, claims, platform limits (errors block)
node .motion-graphics/mg.mjs stills <id>     # build/contact-<fmt>.png: mid-reveal + landed frame per scene
node .motion-graphics/mg.mjs qa <id>         # after render: codec h264, size, fps, yuv420p, duration, audio, -14 LUFS ±1, ≤ -1 dBTP
```
`qa.<fmt>.json` → `verdict: PASS | PASS_WITH_WARNINGS | FAIL`. FAIL blocks delivery.

## 2. The director's pass: open the contact sheet and score it
Open `.motion-graphics/sessions/<id>/build/contact-<fmt>.png` (and full-size stills with `stills <id> --separate` when something looks off).
Chat mode has no renders: the review gate is the user's approval of the beat table and scene table.
Each tile is labelled `NN-mid` (mid-reveal) or `NN-land` (landed + 6 f). Score 0–2 per criterion:

| # | Criterion | 2 = pro | 0 = fail |
|---|---|---|---|
| 1 | **Hook** | scene 1 hero landed ≤ 1.5 s and readable at thumbnail size | late, small or ambiguous |
| 2 | **Hierarchy** | one obvious hero per landed frame; tag < setup < hero (~3:1) | two things compete |
| 3 | **Legibility** | every word readable at 300 px wide; ≥ 4.5:1 contrast | thin, small or low-contrast copy |
| 4 | **Layout** | inside the safe area; consistent left edge; no orphans; fill lines span the column | cramped edges, ragged starts |
| 5 | **Accent discipline** | ≤ 1 accent per scene; it marks the turn/payoff | colour everywhere or on the wrong word |
| 6 | **Rhythm** | no dead air > 3 s; template variety; a pattern break mid-video | monotone, same template ×3 |
| 7 | **Brand fidelity** | colours, fonts and texture match DESIGN.md; nothing in `forbidden` | off-palette, stray styles |
| 8 | **Copy** | each hero carries the argument; no typos; claims sourced | vague heroes, typos, unsourced stats |
| 9 | **Mid-reveal look** | scrambles/word-ins look intentional and clean | glitches unreadable for too long, layout jumps |
| 10 | **Ending** | CTA clear, held ≥ 2 s, logo correct | no CTA, rushed end |
| 11 | **Sound** (listen if you can; otherwise read `cues.<fmt>.json` + loudness) | hits on lands, no machine-gun ticks, -14 LUFS | silent lands, clutter, clipping |

**Total /22.** ≥ 18 deliver · 14–17 fix the lowest items then deliver · < 14 rethink the choreography.
Write the result as: score table → top 3 problems (using motion-craft critique vocabulary) → the exact fixes.

## 3. Fix map: symptom → change (edit markdown first, code last)
| Symptom | Change |
|---|---|
| hero too small / tiny fill line | shorter headline (fill grows as chars drop), or `title` template |
| hero lands late in scene 1 | cut setup words; or `sequence` with the hero first |
| two heroes compete | demote one to `setup`/`line`; split the scene |
| frame feels empty | that's often right; if not, `block_offset_y` −0.04, or add a `tail` |
| dead air | shorten `duration_s` by a beat, or add a `tail` reveal |
| reading collision (exit starts too soon) | +1 beat duration (`timing.hold` warning) |
| accent on the wrong word | `emphasis: none` or move `accent: true` to the right part |
| scramble looks noisy for too long | DESIGN `decode_scramble_frames` −1, `decode_char_stagger_frames` −0.2 |
| everything feels slow | pacing → urgent (scene −0.6 s), stagger −1 f |
| machine-gun ticks | DESIGN `audio.sfx.map.word_in: null` or raise `min_spacing_frames.word_in` |
| lands feel weak | `decode_land: impact_punch` / +2 dB via `audio.sfx.gains.decode_land` |
| loudness off | `audio.music.gain_db` ±2; the master normalises, but a bed that's too loud masks the SFX |

## 4. Loop limits
Up to 3 still loops and 2 render loops. If you're still below 18/22 after that, report the remaining issues honestly
and ask the user (or mark `needs-human` when unattended). Don't loop forever.

## 5. Independent review
For important deliveries use a separate reviewer that hasn't seen your reasoning (in Claude Code: the
`motion-qa-critic` agent). Give it the contact sheet path, DESIGN.md and CONTENT.md, nothing else.
