---
name: make-video
description: Make a motion-graphics video end to end in this workspace — sets up .motion-graphics/ if needed, opens a session folder for the video, gathers or derives CONTENT.md and CHOREOGRAPHY.md, validates, reviews a contact sheet, renders, QAs and delivers into the session's output/ folder. Invoke as /motion-graphics:make-video, optionally with a title and paths to an uploaded CONTENT.md / CHOREOGRAPHY.md.
argument-hint: "[title] [CONTENT.md] [CHOREOGRAPHY.md] [--formats vertical,square]"
---

# /motion-graphics:make-video

Arguments: `$ARGUMENTS`

Run the pipeline in the **motion-graphics** skill (`${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/SKILL.md`): read it now and
follow **Workspace mode** W1–W9. Folder spec: `${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/references/workspace.md`.

Claude Code specifics:
1. **Workspace root** = `${CLAUDE_PROJECT_DIR}` (the project you were opened in). If `.motion-graphics/mg.mjs` is missing:
   `node "${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/scripts/init-workspace.mjs" "${CLAUDE_PROJECT_DIR}"`.
   Never create user files inside `${CLAUDE_PLUGIN_ROOT}`.
2. **Session**: check for one already started in this conversation:
   `node .motion-graphics/mg.mjs session list --chat-ref ${CLAUDE_SESSION_ID}`.
   - Same video (edit, re-render, more formats) → reuse it.
   - New video → `node .motion-graphics/mg.mjs session new "<title>" --client claude-code --chat-ref ${CLAUDE_SESSION_ID}`.
3. **Arguments**: a `.md` whose name contains "content" → write it to `sessions/<id>/CONTENT.md`; "choreo" → `sessions/<id>/CHOREOGRAPHY.md`;
   "design" → `.motion-graphics/DESIGN.md` (ask before replacing an existing one; use `design new --force` semantics: keep a backup).
4. **Task list**: workspace · design · session · content · choreography · validate · contact-sheet review · make · deliver.
5. **Questions**: use AskUserQuestion (≤ 4 per call, recommended option first). If the user said "just make it" or nobody is
   there, follow the "Unattended" rules of the motion-graphics skill.
6. **Look**: Read `sessions/<id>/build/contact-<fmt>.png` after every `stills` and after `make`; describe what you see in 1–2 lines.
7. **Independent review** after the render: delegate to `motion-graphics:motion-qa-critic` with only the contact-sheet path,
   `.motion-graphics/DESIGN.md` and `sessions/<id>/CONTENT.md`. Apply its fixes if it scores < 18/22 (max 2 render loops).
8. **Deliver**: send `output/<id>-<fmt>.mp4` and `output/thumb-<fmt>.png` (SendUserFile if available), then the creative summary,
   QA verdict and the post copy from `output/POST.md`, and the session path.
