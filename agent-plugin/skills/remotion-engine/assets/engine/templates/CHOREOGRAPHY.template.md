---
# ============================================================================
# CHOREOGRAPHY.md TEMPLATE — motion-choreography/1.0
# DYNAMIC: one per video, saved at .motion-graphics/sessions/<id>/CHOREOGRAPHY.md (or kept in the chat in chat mode).
# HOW the story flows: scene order, templates, durations,
# emphasis, transitions, music energy. NO copy here (that is CONTENT.md) and NO
# visual style here (that is DESIGN.md).
#   # ASK:    question for the user when no choreography was supplied
#   # DERIVE: the agent decides from CONTENT.md + objective (explain choices in "Arc")
# ============================================================================
schema: motion-choreography/1.0
id: my-video                          # set automatically to the session id by `mg session new`
title: My video                       # ASK: Working title?
content: CONTENT.md
format: vertical                      # ASK: Format? vertical 9:16 · portrait 4:5 · square 1:1 · horizontal 16:9 (default = DESIGN canvas.default_format)
target_duration_s: 21                 # ASK: Length? 15 (stories/ads) · 20-35 (reels/tiktok sweet spot) · 45-60 (explainers)
objective: awareness                  # ASK: Goal? awareness · engagement · lead_gen · conversion · retention
narrative_arc: hook-problem-reframe-proof-cta   # DERIVE: pick from choreography-md skill → "Arc library"
pacing: steady                        # ASK: Pace? urgent (3.0-3.6 s/scene) · steady (4.0-4.8) · contemplative (5.0-6.5)
label_numbering: true                 # [ 01 // LABEL ] numbering — good for argument/listicle structures
emphasis_default: auto                # auto | none
music:
  preset: null                        # null = DESIGN default. Override per video if the mood differs
  bpm: null                           # null = DESIGN default
  energy_curve: [0.5, 0.6, 0.7, 0.8, 0.7]   # DERIVE: one value 0-1 per scene; rise toward the payoff, dip before the CTA
loop_friendly: false
---

# Choreography: <title>

## Arc
<!-- DERIVE: 3-6 sentences. The argument in one line, why this arc, where the turn is,
     where the payoff is, and the retention plan (hook timing, pattern breaks). -->

## Scenes
<!-- One "### NN · Role — Name" heading + one ```yaml block per scene, in order.
     Fields:
       id            unique scene id (s01, s02 …)
       beat          id of the beat in CONTENT.md that supplies the words
       template      statement | title | stack | stat | list | compare | sequence | endcard
       duration_s    seconds (snapped to the music beat) — or `beats: 8` for an exact number of beats
       emphasis      none | auto | <colour token from DESIGN.md, e.g. accent_red>
       transition_out glitch_cut | hard_cut | dim_cut | flash_cut   (default = DESIGN motion.scene.transition)
       reveal        optional per-slot override, e.g. { headline: words, setup: fade }
       timing        optional per-slot delays, e.g. { headline: { delay_frames: 6 } }
       sfx           optional extra sounds: [{ id: riser_noise, at_s: 0.2, gain_db: -3 }]
       notes         direction for humans / QA -->

### 01 · Hook
```yaml
id: s01
beat: b01
template: statement
duration_s: 3.6
emphasis: none
transition_out: hard_cut
notes: Hero must land before 1.5 s.
```

### 02 · Problem
```yaml
id: s02
beat: b02
template: statement
duration_s: 4.0
emphasis: auto
```

### 03 · Reframe
```yaml
id: s03
beat: b03
template: compare
duration_s: 4.4
emphasis: accent_red
```

### 04 · Proof
```yaml
id: s04
beat: b04
template: stat
duration_s: 4.0
emphasis: accent_orange
```

### 05 · CTA
```yaml
id: s05
beat: b05
template: endcard
duration_s: 5.0
transition_out: dim_cut
```
