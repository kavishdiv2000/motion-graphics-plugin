---
name: choreography-md
description: Write or validate CHOREOGRAPHY.md, the per-video scene plan for the motion-graphics pipeline (narrative arc, scene order, template per beat, durations, emphasis/accent, transitions, music energy). Use when a user uploads a choreography, asks to storyboard or structure a motion-graphics video, or when one must be derived from CONTENT.md.
license: MIT
metadata:
  version: "1.1.0"
  schema: motion-choreography/1.0
---

# CHOREOGRAPHY.md — how the video flows

The choreography decides **order, rhythm and emphasis**. It is where retention is won or lost.
It never contains copy (CONTENT.md) or styling (DESIGN.md). Template: `references/CHOREOGRAPHY.template.md`.
A complete example that recreates the reference reel: `references/CHOREOGRAPHY.example.md`. Arcs: `references/arcs.md`.

## Interview (only when no choreography was supplied)
Ask what you can't derive, in one turn, offering defaults:
1. **Format**: vertical 9:16 (default) · portrait 4:5 · square 1:1 · horizontal 16:9
2. **Length**: 15 s · 20–35 s (default ~30) · 45–60 s
3. **Goal**: awareness (default) · engagement · lead_gen · conversion · retention
4. **Pace**: urgent · steady (default) · contemplative

Everything else you derive, and you explain the result in `## Arc`.

## Deriving a choreography: the algorithm
1. **Count ideas.** One beat in CONTENT.md is one scene. If a beat holds two ideas, split it. If the scene count × the
   pace's seconds-per-scene is far from the target length, merge or split beats, or adjust the pace. Never pad.
2. **Choose the arc** from `references/arcs.md` by goal. Label each scene with its role (hook, problem, turn, proof,
   principle, protocol, CTA…).
3. **Pick a template per beat** using this table, then break pattern so no template runs 3 times in a row:
   | Beat shape | Template |
   |---|---|
   | setup → one hero word | `statement` |
   | one oversized word, no setup (hook / chapter) | `title` |
   | alternating body and display lines, or hero first | `sequence` |
   | 2–4 imperative lines (steps, rules, a manifesto) | `stack` |
   | a number is the point | `stat` |
   | 2–5 features or steps | `list` |
   | old belief → new belief | `compare` |
   | brand close + CTA | `endcard` (always last) |
4. **Durations.** Start from the pace (urgent 3.0–3.6 s, steady 4.0–4.8 s, contemplative 5.0–6.5 s), then adjust by words:
   `duration_s ≈ 1.2 + 0.28 × words on screen` (minimum 2.4 s), and add +0.6 s for `stack`/`list`/`sequence` and +1.5 s for
   the endcard. Scenes snap to whole beats of the BPM (100 BPM = 0.6 s). Hook ≤ 3.6 s.
5. **Emphasis.** At most one accent per scene. Accent the **turn** (the scene that contradicts the hook) and the **payoff**.
   Leave the hook white: a negation is not the answer. Two consecutive accented scenes should use different accents or
   the second one should be none. Endcard: `none` (the CTA role already carries colour).
6. **Transitions.** Use the DESIGN default throughout. Use `dim_cut` into the endcard, and `hard_cut` for rapid-fire lists.
   `flash_cut` no more than once every 3 s (photosensitivity).
7. **Energy curve** (0–1 per scene): start 0.5–0.6, climb to 0.85–0.95 at the payoff/protocol, dip to ~0.7 for the endcard.
   This layers the music (arp density, ticks, kick).
8. **Write `## Arc`**: the argument in one line, why this arc, where the turn and payoff are, and the retention plan.
9. **Show** the scene table to the user (or log it when unattended), then validate (`node .motion-graphics/mg.mjs validate <session>`; in chat mode run the manual checklist in motion-graphics/references/chat-mode.md).

## Retention rules (non-negotiable)
- Hero of scene 1 visible and landed by **1.5 s**. The first frame already shows the tag (no black lead-in).
- New visual information at least every **2.5 s**, whether a reveal, a cut or an accent.
- Pattern break around **40–60 %** of the runtime (a `title` or `sequence` that opens on the hero, or a template change).
- The CTA appears only after the payoff. One CTA. Hold the endcard ≥ 2 s.
- Loop-friendly videos (`loop_friendly: true`): the last frame should visually echo the first (same tag position, same hero size).

## Scene block reference
```yaml
id: s03                       # unique
beat: b03                     # CONTENT.md beat id
template: sequence            # statement|title|stack|stat|list|compare|sequence|endcard
duration_s: 5.0               # or: beats: 8
emphasis: accent_orange       # none|auto|<colour token>
transition_out: glitch_cut    # glitch_cut|hard_cut|dim_cut|flash_cut
reveal: { headline: words }   # optional per-slot reveal override: glitch|words|decode|type|count|fade|strike
timing: { headline: { delay_frames: 6 } }   # optional: hold back a slot (drama)
sfx: [{ id: riser_noise, at_s: 2.2, gain_db: -4 }]   # optional extra sounds (ids from sound-design)
notes: "Payoff. MINUTES. must land on a beat."
```

## Validation you do before running the build
- [ ] every `beat` exists in CONTENT.md, and every beat is used (or deliberately cut)
- [ ] the template's required slots are present in the beat (statement/title/endcard: headline · stack: lines · stat: value · list: items · compare: before+after · sequence: parts)
- [ ] the total ≈ target (±15 %); each scene is between DESIGN `min_duration_s` and `max_duration_s`
- [ ] accents: ≤ 1 per scene, and they mark the turn and the payoff
- [ ] the last scene is an `endcard`
