# Timing & easing tables

All values in frames at 30 fps (multiply by 0.8 for 24 fps, by 2 for 60 fps).

## motion.timing presets by personality
| token | precise (Signal Ops) | punchy | smooth / premium | calm / editorial |
|---|---|---|---|---|
| scene_lead_in_frames | 3 | 2 | 6 | 8 |
| label_in_frames | 8 | 6 | 12 | 14 |
| label_overlap_frames | 4 | 3 | 4 | 4 |
| gap_frames | 3 | 2 | 6 | 8 |
| headline_gap_frames | 3 | 2 | 8 | 10 |
| word_stagger_frames | 3 | 2 | 4 | 5 |
| word_in_frames | 6 | 5 | 10 | 12 |
| decode_char_stagger_frames | 1.2 | 1.0 | — | — |
| decode_scramble_frames | 5 | 4 | — | — |
| decode_jitter_frames | 2 | 2 | — | — |
| type_char_frames | 1 | 1 | 2 | 2 |
| count_frames | 26 | 20 | 36 | 40 |
| fade_frames | 12 | 8 | 18 | 20 |
| exit_frames | 12 | 8 | 16 | 18 |
| min_hold_frames | 24 | 18 | 30 | 36 |
| reading_wpm | 260 | 280 | 220 | 200 |
| scene default s | 4.4 | 3.2 | 4.8 | 5.6 |
| enter easing | [0.16,1,0.3,1] | [0.22,1,0.36,1] | [0.33,1,0.68,1] | [0.45,0,0.2,1] |
| reveal_defaults | — | — | {headline: words, lines: words} | {headline: fade, lines: words} |

## How the engine schedules a scene (src/lib/timeline.js)
```
lead_in → label (glitch) ─overlap→ setup (words) ─gap→ ··headline_gap·· headline (decode) ─gap→ tail (words)
… hold (≥ min_hold, ≥ 80 % of reading time) … exit (exit_frames) | cut
```
If the reveals don't fit `duration − exit − hold`, every start and duration is compressed by a factor k
(minimum 0.35). The build warns below k = 0.8 and errors when even k = 0.35 overflows. The fix is a longer scene or fewer words.

## Reading time
`reading frames = words / reading_wpm × 60 × fps`. 10 words at 260 wpm is 69 frames (2.3 s).
The hold after the last reveal must cover what the reveal hasn't: `hold ≥ max(min_hold, 0.8 × reading − reveal span)`.

## Easing cheat sheet (cubic-bezier)
| Name | Bezier | Character |
|---|---|---|
| expo-out | 0.16, 1, 0.3, 1 | precise arrival, long settle |
| quint-out | 0.22, 1, 0.36, 1 | punchy |
| cubic-out | 0.33, 1, 0.68, 1 | smooth |
| sine-in-out | 0.37, 0, 0.63, 1 | calm |
| expo-in | 0.7, 0, 0.84, 0 | exits |
| "editorial" | 0.45, 0, 0.2, 1 | slow start, gentle land |
| back-out (playful only) | 0.34, 1.56, 0.64, 1 | overshoot ~10 % |

## Beat maths
`beat_frames = fps × 60 / BPM` → 100 BPM @30 = 18 f · 110 = 16.4 · 120 = 15 · 90 = 20.
Scene lengths snap to whole beats. To land a hero on a beat, add `timing: { headline: { delay_frames: n } }`
where `n = beat_frames − (land mod beat_frames)` (read `land` from `cues.<fmt>.json`, event `decode_land`).
