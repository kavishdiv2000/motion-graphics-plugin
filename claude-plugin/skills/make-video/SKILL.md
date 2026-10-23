---
name: make-video
description: Make a motion-graphics video end to end (interview if inputs are missing → validate → contact-sheet review → render → QA → deliver with post copy). Invoke as /motion-graphics:make-video, optionally with a job id and paths to an uploaded CONTENT.md / CHOREOGRAPHY.md.
argument-hint: "[job-id] [CONTENT.md] [CHOREOGRAPHY.md] [--formats vertical,square]"
---

# /motion-graphics:make-video

Arguments: `$ARGUMENTS`

Run the full pipeline defined in the **motion-graphics** skill
(`${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/SKILL.md`). Read it now and follow steps 0–9 exactly.
The engine template lives at `${CLAUDE_PLUGIN_ROOT}/skills/remotion-engine/assets/engine`.

Claude Code specifics:
1. **Task list**: create one with these items: workspace · design · content · choreography · validate · stills review ·
   render · QA · deliver. Tick them off as you go. The user may be away.
2. **Questions**: use the AskUserQuestion tool for the interviews (≤ 4 questions per call, recommended option first).
   If the user said "just make it" or the session is unattended, follow the "Unattended" rules in the motion-graphics skill.
3. **Arguments**: a `.md` argument whose name contains "content" goes to `jobs/<id>/CONTENT.md`; one containing
   "choreo" goes to `jobs/<id>/CHOREOGRAPHY.md`; "design" goes to `brand/DESIGN.md` (ask before replacing an existing DESIGN.md).
   No job id → derive a kebab-case id from the title.
4. **Look at the contact sheet** with the Read tool after every `npm run stills` and after `npm run qa`. Describe what you see
   in one or two lines before deciding the next step.
5. **Independent review**: after the render, delegate to the `motion-graphics:motion-qa-critic` agent with only the contact-sheet
   path, `brand/DESIGN.md` and `jobs/<id>/CONTENT.md`. Apply its fixes if it scores < 18/22 (at most 2 render loops).
6. **Deliver**: send the MP4(s) and the contact sheet to the user (SendUserFile if available), followed by the creative
   summary, QA verdict and post copy.
