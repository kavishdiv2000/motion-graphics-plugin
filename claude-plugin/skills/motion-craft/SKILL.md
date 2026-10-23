---
name: motion-craft
description: Motion-design craft knowledge for kinetic typography and social motion graphics — timing in frames, easing curves, hierarchy, reveal choice, rhythm and beat-sync, transitions, colour emphasis, retention mechanics, and how to judge a frame like a motion director. Use when making creative decisions in the motion-graphics pipeline, choosing timings or reveals, designing a new template, or critiquing a render.
license: MIT
metadata:
  version: "1.0.0"
---

# Motion craft: think like a motion director

Read this before making creative decisions. These are the judgement rules that separate
professional motion graphics from "text that moves". Deeper tables: `references/timing-and-easing.md`,
`references/kinetic-type.md`.

## 1. The five questions for every scene
1. **What is the one thing the viewer must read?** That's the hero. Everything else is support.
2. **Where does the eye land first, second, third?** Tag → setup → hero → tail. Size, contrast and timing must agree on that order.
3. **When does the hero land, and on what?** On a beat, after a small anticipation gap (3–6 frames of nothing).
4. **How long is it still?** A landed frame needs 0.6–1.0 s of stillness, or it was never read.
5. **What changes next, and why?** Every cut has a reason: a new idea, a turn, a payoff.

## 2. Time is measured in frames
At 30 fps: 1 frame = 33 ms. Perceptual anchors:
| Frames @30 | Feels | Use for |
|---|---|---|
| 1–2 | instant / glitch | flashes, hard flicker, glyph swaps |
| 3–4 | snap | word stagger, micro moves |
| 6–8 | quick but seen | word in, tag glitch, small moves |
| 10–15 | deliberate | large moves, fades, exits |
| 18–24 | slow, cinematic | camera moves, luxury fades |
| 30+ | a beat of attention | holds |

Rules: stagger < duration (overlapping motion reads as one gesture). Exits are faster than entrances
(~70 %). Nothing important moves while the viewer is reading it.

## 3. Easing: physics carries the emotion
- **Expo-out `[0.16,1,0.3,1]`**: arrives fast, settles long. Precise, technical, confident. *The default.*
- **Quint/cubic-out `[0.22,1,0.36,1]`**: punchy, energetic.
- **Sine in-out `[0.37,0,0.63,1]`**: calm, premium, editorial.
- **Expo-in `[0.7,0,0.84,0]`**: exits only. Accelerating away feels like leaving.
- **Linear**: only for continuous things (camera drift, counters near the end, scroll, progress bars).
- **Overshoot / bounce**: only if the brand is playful *and* DESIGN.md allows it. It reads as cheap for B2B.

## 4. Choosing a reveal
| Reveal | Meaning it carries | Best for | Avoid when |
|---|---|---|---|
| decode (scramble → lock) | signal resolving, tech, discovery | hero words, technical brands | calm/premium brands; long phrases (> 14 chars) |
| words (fade + blur + rise) | a thought forming, a voice | setups, tails, any body copy | single words (use decode or fade) |
| type (typewriter + caret) | a system writing, a terminal, a list | items, CTAs, code-like strings | long sentences (too slow) |
| count (0 → N) | growth, magnitude | stats | numbers without meaning or source |
| strike | rejection, an old belief | `before` in compare | positive copy |
| glitch | a channel opening, a tag | labels, chapter markers | body copy (illegible) |
| fade | neutrality | logos, disclaimers | heroes (no energy) |

One family of reveals per brand. Mixing scramble, bounce and wipe in one video reads as amateur.

## 5. Hierarchy is ratio
- Hero : setup size ≈ **3 : 1** (demo: 170 px : 54 px). Below 2 : 1 the hierarchy collapses; above 4 : 1 the setup is unreadable on phones.
- Tag ≈ 0.4 × setup. Tags are read last: they are a chapter marker, not content.
- Colour contrast tracks importance: hero = brightest, setup ≈ 72 % luminance, pending/muted ≈ 42 %.
- **Fill-to-column** (every display line spans the same width) gives a slab-like, justified authority. Use it for wide display faces.
- Left-anchored layouts read as editorial and technical. Centred ones read as announcements. Never centre multi-line body copy.

## 6. Colour emphasis: an accent is a sentence-level decision
- **One accent per scene, at most.** If everything is red, nothing is.
- Accent marks **the turn** (the line that contradicts the hook) and **the payoff** (the line that resolves it).
- The hook is usually white: it's the question, not the answer.
- Warm accents (red/orange) advance and alarm. Cool accents (blue) recede and reassure.
- An accent gets more glow than white. Glow is light, and light means importance.

## 7. Rhythm: picture and sound share one clock
- Pick a BPM (100 is confident and unhurried, 120 is energetic). 1 beat at 100 BPM and 30 fps = 18 frames.
- Scene lengths are whole beats (the engine snaps them). Hero lands on, or within 3 frames of, a beat.
- Every visible event has a sound, scaled to its importance: words are a soft tick (−18 dB relative), decodes are chatter,
  a landed hero is a sub thump plus a music duck, a cut is a static burst. Silence is also a choice: drop the SFX
  for one scene to make the next hit harder.
- The music energy follows the argument: sparse at the hook, densest at the payoff, a breath before the CTA.

## 8. Transitions
- A cut is a sentence break. A **glitch cut** (6 f bands + RGB split) suits tech brands. A **dim cut** is a paragraph
  break and the right way into the endcard. A **flash cut** is an exclamation: at most one per 3 s.
- The exit starts while the viewer is done reading (≥ 0.6 s after the land) and lasts 10–12 frames.
- Camera drift (2–3 % push per scene) keeps holds alive without stealing attention. Never drift during a reveal *and* shake.

## 9. Retention mechanics (social)
- **0–1.5 s**: the hero of the hook is landed. No logo intro, no black frames, no "Hi guys".
- **Every 2–3 s**: a new reveal or a cut. Dead air of more than 3 s loses the swipe.
- **40–60 %**: a pattern break (template change, hero-first scene, colour, a silent beat).
- **The end**: the CTA after the payoff, held ≥ 2 s; then loop or end on the brand.
- On-screen text is the captions. Design it so the video works muted (85 % of feed views start muted).

## 10. What makes it look generic (and the fix)
| Generic | Professional |
|---|---|
| everything fades in at the same speed | different reveals by role, staggered, eased |
| centred text, same size | left column, 3:1 hierarchy, fill-to-width heroes |
| a colour on every scene | one accent, reserved for the turn and the payoff |
| stock "whoosh" on every cut | event-mapped SFX at -9 dB with ducking, plus a bed at the BPM |
| motion during reading | motion → stillness → motion |
| random scene lengths | beat-snapped lengths, hero on the beat |
| emoji, gradients, drop shadows | texture (grain, scanlines, glow) that belongs to the brand |

## 11. The critique vocabulary (use it in QA notes)
*Hierarchy collapse* (two things compete) · *dead air* (nothing changes for > 3 s) · *reading collision*
(motion while reading) · *orphan* (one word on line 2) · *accent inflation* (too many accents) · *mushy timing*
(stagger ≈ duration) · *late hook* (hero > 1.5 s) · *soft landing* (no sound or glow when the hero locks) ·
*cramped edge* (text in the safe-area margin) · *pattern fatigue* (same template ×3).
