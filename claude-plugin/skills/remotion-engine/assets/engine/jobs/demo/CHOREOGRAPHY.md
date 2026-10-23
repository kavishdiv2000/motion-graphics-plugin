---
# CHOREOGRAPHY.md — DYNAMIC, one per video. Defines the flow: scenes, order,
# templates, timing, emphasis and transitions. Copy lives in CONTENT.md and is
# linked by `beat` ids. Visual style comes from DESIGN.md and is NOT repeated here.
schema: motion-choreography/1.0
id: agents-leverage-manifesto
title: Agents are leverage
content: CONTENT.md                 # which content file this choreography consumes
format: vertical                     # vertical | portrait | square | horizontal (overrides DESIGN default)
target_duration_s: 35
objective: awareness                 # awareness | engagement | lead_gen | conversion | retention
narrative_arc: diagnosis-correction-observation-consequence-principle-protocol-directive
pacing: steady                       # urgent (3.0-3.6 s/scene) | steady (4.0-4.8) | contemplative (5.0-6.5)
label_numbering: true                # renders tags as [ 01 // DIAGNOSIS ]
emphasis_default: auto               # auto | none — auto applies DESIGN accent_rotation to turning-point beats
music:
  preset: signal_drone
  bpm: 100
  energy_curve: [0.5, 0.6, 0.7, 0.75, 0.85, 0.9, 0.7]   # one value per scene, 0-1, drives bed layering
loop_friendly: false                 # true = last frame visually matches first for seamless loops
---

# Choreography: Agents are leverage

## Arc
A seven-beat argument structured as a terminal "case file". It opens with a provocative negation
(the hook), corrects it, proves it with a time contrast, names the cost, states the principle, gives
a three-line protocol, then closes on an identity-level directive with the brand.

Retention plan: the hero word of scene 01 lands in under 1.1 s, and every scene ends on a full stop,
which makes the next tag feel like a new chapter. The single red accent in 02 is the turn, orange in
03/06 is the payoff, and the closing word is white so the logo carries the last colour.

## Scenes

### 01 · Hook — Diagnosis
```yaml
id: s01
beat: b01
template: statement
duration_s: 4.6
emphasis: none                       # white hero: a negation, not the answer
transition_out: glitch_cut
notes: Hero must land by frame 33. No accent; we are setting up the turn.
```

### 02 · Turn — Correction
```yaml
id: s02
beat: b02
template: statement
duration_s: 4.2
emphasis: accent_red                 # the turn of the argument
transition_out: glitch_cut
```

### 03 · Proof — Observation
```yaml
id: s03
beat: b03
template: sequence                   # setup / line / setup / HERO
duration_s: 5.0
emphasis: accent_orange              # applies to the part marked accent: true, else the last headline part
transition_out: glitch_cut
```

### 04 · Cost — Consequence
```yaml
id: s04
beat: b04
template: statement
duration_s: 4.6
emphasis: none
transition_out: glitch_cut
```

### 05 · Principle
```yaml
id: s05
beat: b05
template: sequence
duration_s: 5.8
emphasis: accent_red
transition_out: glitch_cut
notes: Opens on the hero (AGENTS) instead of a setup line — breaks the pattern to re-hook at ~50% watch time.
```

### 06 · Protocol
```yaml
id: s06
beat: b06
template: stack
duration_s: 4.8
emphasis: accent_orange              # last line only
transition_out: glitch_cut
```

### 07 · Directive — End card
```yaml
id: s07
beat: b07
template: endcard
duration_s: 6.2
emphasis: none
transition_out: dim_cut
notes: Logo first, then the line. CTA types in last. Hold ≥ 2 s on the final frame.
```
