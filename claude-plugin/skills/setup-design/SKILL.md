---
name: setup-design
description: Create or replace the workspace's static .motion-graphics/DESIGN.md for the motion-graphics pipeline — by interview, from a website, from a brand guide, or from a reference video — and preview it on a design-preview session. Invoke as /motion-graphics:setup-design [url-or-file].
argument-hint: "[brand website URL | reference video | existing DESIGN.md]"
---

# /motion-graphics:setup-design

Source given: `$ARGUMENTS`

1. Make sure `.motion-graphics/` exists in `${CLAUDE_PROJECT_DIR}` (otherwise run
   `node "${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/scripts/init-workspace.mjs" "${CLAUDE_PROJECT_DIR}"`).
2. Follow the **design-md** skill (`${CLAUDE_PLUGIN_ROOT}/skills/design-md/SKILL.md`):
   - a `.md` file → path A (adopt: copy to `.motion-graphics/DESIGN.md`, then `mg design validate`)
   - a URL → path C (website extraction; use a browser tool if available, otherwise WebFetch for copy and ask for colours/fonts)
   - a video file → path C (reference video extraction with the guide's ffmpeg/python commands)
   - nothing → path B (interview with AskUserQuestion, ≤ 4 questions per call)
   Start the file with `node .motion-graphics/mg.mjs design new --template` (or `--example`), then edit it.
3. If `.motion-graphics/DESIGN.md` already exists, summarise how the new one differs and ask before replacing it.
   Use `design new --force`, which keeps `DESIGN.<timestamp>.md`.
4. Logo, font and music files go in `.motion-graphics/assets/` (fonts: `mg font add <file> "<Family>" <weight>`).
5. Preview: `node .motion-graphics/mg.mjs session new "design preview" --example --client claude-code --chat-ref ${CLAUDE_SESSION_ID}`,
   then `mg stills <that session>`. Read the contact sheet, then show it with a summary card (palette, fonts, motion personality,
   scene length, music preset and BPM).
6. Iterate until the user approves, then bump `version` and `updated`. Note any `substitute_for` fonts that need licensing.
