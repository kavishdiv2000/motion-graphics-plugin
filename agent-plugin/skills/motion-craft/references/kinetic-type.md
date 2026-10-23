# Kinetic typography patterns

The reveal vocabulary the engine implements, and patterns to compose from it.

## The demo grammar ("Signal Ops")
```
[ 01 // DIAGNOSIS ]          ← mono tag, red, glitch-in (RGB split collapses over 8 f)
You don't need more          ← Inter 54 px grey, words in at a 3 f stagger, pending-grey → grey
HOURS.                       ← Michroma, fill-to-column, decoded char by char, glow on lock
```
- The tag numbers the argument: the viewer feels progress (01 → 07).
- The setup is deliberately incomplete; the hero completes the sentence.
- The hero is uppercase with a full stop, which makes it a verdict.
- The exit dims to ~15 % with a flicker; the next scene opens with glitch bands on an empty grid and its tag.

## Composition patterns (all expressible with templates)
| Pattern | Template + settings | Effect |
|---|---|---|
| Verdict | statement, emphasis none/accent | the workhorse |
| Hero-first | sequence with parts[0].role = headline | pattern break; re-hook mid-video |
| Escalation | sequence: setup → line (small display) → setup → headline | builds to a payoff (demo s03) |
| Manifesto | stack of 3 lines, last accented | memorable takeaway (demo s06) |
| Reframe | compare: before struck through, after decoded in accent | belief change |
| Proof | stat: count-up hero with setup and tail | credibility |
| Checklist | list of 3–5 typed items with markers | saveable value |
| Chapter | title: one oversized word | section break, hooks |
| Signature | endcard: logo → label → setup → hero → typed CTA | brand close |

## Legibility on phones
- Minimum on-screen size of about 26 px at 1080 width for anything that must be read (tags are decorative at 22 px).
- Max ~7 words visible at once outside stacks and lists.
- Contrast ≥ 4.5 : 1 for setup copy; heroes are always high contrast.
- Keep everything inside the safe area: TikTok/Reels put UI on the right 10 % and the bottom 20 %.

## When to go beyond templates
If an idea needs imagery (product UI, a chart, a diagram), that's a new template: see remotion-engine →
"Adding a template". Keep the same reveal grammar so it feels native.
