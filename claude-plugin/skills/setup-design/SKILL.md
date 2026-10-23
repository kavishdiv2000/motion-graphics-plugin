---
name: setup-design
description: Create or replace the brand's static DESIGN.md for the motion-graphics pipeline — by interview, from a website, from a brand guide, or from a reference video — and preview it on the demo job. Invoke as /motion-graphics:setup-design [url-or-file].
argument-hint: "[brand website URL | reference video | existing DESIGN.md]"
---

# /motion-graphics:setup-design

Source given: `$ARGUMENTS`

1. Make sure the workspace exists (motion-graphics skill, step 0). The engine is at
   `${CLAUDE_PLUGIN_ROOT}/skills/remotion-engine/assets/engine`.
2. Follow the **design-md** skill (`${CLAUDE_PLUGIN_ROOT}/skills/design-md/SKILL.md`):
   - a `.md` file → path A (adopt + validate)
   - a URL → path C (website extraction; use a browser tool if available, otherwise WebFetch for copy and ask for colours/fonts)
   - a video file → path C (reference video extraction; the guide has the ffmpeg/python commands)
   - nothing → path B (interview with AskUserQuestion, ≤ 4 questions per call)
3. If `brand/DESIGN.md` already exists and is not the shipped example ("Signal Ops"), show a diff summary and ask before overwriting.
   Keep the old one as `brand/DESIGN.<old-version>.md`.
4. Build the demo job with the new design and the matching format, render the contact sheet, **look at it**,
   and show it to the user together with a summary card (palette, fonts, motion personality, scene length, music preset/BPM).
5. Iterate until the user approves. Then bump `version`/`updated`, and note any `substitute_for` fonts that need licensing.
