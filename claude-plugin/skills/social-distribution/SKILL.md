---
name: social-distribution
description: Platform specs, aspect-ratio variants, captions/post copy, thumbnails and funnel-objective mapping for motion-graphics videos on TikTok, Instagram Reels/Stories/Feed, YouTube Shorts/long-form, LinkedIn and X. Use when deciding formats and lengths for a motion-graphics video, writing the caption/first comment/hashtags, choosing CTAs by funnel stage, or packaging deliverables for publishing.
license: MIT
metadata:
  version: "1.0.0"
---

# Social distribution

The video is one asset in a funnel. Decide the objective first; it changes the arc, the CTA and the format.

## 1. Objective → creative decisions
| Objective | Arc (choreography-md/arcs.md) | CTA type | Measure |
|---|---|---|---|
| awareness | case file, myth/truth, one word | follow / visit | 3 s hold rate, avg watch %, reach |
| engagement | listicle, hot take, before/after | comment / save / share | comments, saves, shares per view |
| lead_gen | problem → mechanism → offer | comment KEYWORD / DM / download | keyword comments, opt-ins |
| conversion | PAS, feature → benefit → proof | book / buy / start trial | CTR, conversions, CPA |
| retention | changelog, tip of the week | use feature / reply | feature adoption, replies |
Rule: one objective, one CTA. A video that asks for a follow *and* a click gets neither.

## 2. Platform specs (render with `--formats`)
| Platform | Format | Size | Length sweet spot (max) | Safe area notes |
|---|---|---|---|---|
| TikTok | vertical 9:16 | 1080×1920 | 15–35 s (60 s in this pipeline) | right rail ~10 %, bottom 20 % caption |
| Instagram Reels | vertical | 1080×1920 | 15–30 s (90 s) | profile-grid and feed previews crop the centre — keep the hero in the middle band |
| Instagram/Facebook Stories | vertical | 1080×1920 | ≤ 15 s per card | top 12 % profile bar |
| Instagram/Facebook/LinkedIn feed | portrait 4:5 | 1080×1350 | 15–45 s | |
| YouTube Shorts | vertical | 1080×1920 | 20–45 s (60 s) | bottom 20 % title |
| LinkedIn video | square 1:1 or 4:5 | 1080×1080 | 30–60 s (90 s) | captions on by default in feed: design for muted |
| X | square or 16:9 | 1080×1080 / 1920×1080 | 15–45 s (140 s) | |
| YouTube / web | horizontal 16:9 | 1920×1080 | any | |
Codec for all: H.264 high, yuv420p, 30 fps, AAC 48 kHz, −14 LUFS (the engine's defaults).

## 3. Post copy (write it into CONTENT.md `## Post copy`)
- **Caption**: line 1 restates the hook in other words (it shows before "more"). Then 1–2 lines of value. Then the CTA.
  LinkedIn: 3–6 short lines with a line break between ideas. TikTok/Reels: ≤ 150 characters plus keywords for search.
- **First comment**: the lead-gen keyword mechanic or the link (on LinkedIn, links in the post reduce reach).
- **Hashtags**: 3–5 specific ones; skip generic mega-tags.
- **Accessibility**: the on-screen text already works as captions. Add alt text where the platform supports it.
- No claims in the caption that aren't on screen or sourced.

## 4. Thumbnail / cover
Use the landed frame of scene 1 or of the payoff scene (`npm run stills -- jobs/<id> --separate`, pick the `NN-land.png`).
It must be readable at 150 px wide; if it isn't, shorten the hero.

## 5. Deliverable package
```
jobs/<id>/out/<id>-vertical.mp4      (+ -square, -portrait, -horizontal as requested)
jobs/<id>/contact-vertical.png       (review sheet)
jobs/<id>/qa.vertical.json           (QA verdict)
jobs/<id>/CONTENT.md → Post copy     (caption, first comment, hashtags)
```
Never auto-publish. A human posts, because every video makes a claim on the brand's behalf.

## 6. Variant strategy (when asked for "more versions")
Vary the **hook** (scene 1 content + template), not the whole video: 3 hooks × the same body is the cheapest valid
A/B test. Then vary the length (15 s cut: hook, turn, payoff, endcard). Then the format.
