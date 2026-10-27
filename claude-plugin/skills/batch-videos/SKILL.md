---
name: batch-videos
description: Unattended batch production for schedules and automation — ingests .motion-graphics/inbox/ into queued sessions and renders every queued session with the workspace's static DESIGN.md, asking no questions, then reports. Invoke as /motion-graphics:batch-videos or from a scheduled task / `claude -p`.
argument-hint: "[--formats vertical,square] [--limit N]"
---

# /motion-graphics:batch-videos (unattended)

Options: `$ARGUMENTS` (defaults: formats = each session's `requested_formats`, else DESIGN default; limit = 5)

**Never ask the user anything here.** Decide, log the decision, continue. The "Unattended / scheduled runs" rules in
`${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/SKILL.md` override interactive behaviour.

## Inputs (all inside the workspace)
```
.motion-graphics/inbox/
  leverage-hook-a.md                 ← a CONTENT.md (any file name)
  leverage-hook-b/                   ← or a folder: CONTENT.md [+ CHOREOGRAPHY.md] [+ formats.txt "vertical,square"]
.motion-graphics/sessions/<id>/      ← sessions with status "queued" (created by `mg inbox` or `mg session new … --status queued`)
```
External tools (n8n, Make, Zapier, a content calendar, CI) only need to drop files into `inbox/`.

## Procedure
1. Workspace root = `${CLAUDE_PROJECT_DIR}`. If `.motion-graphics/` is missing, run
   `node "${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/scripts/init-workspace.mjs" "${CLAUDE_PROJECT_DIR}"`.
2. If `.motion-graphics/DESIGN.md` is missing → report `BLOCKED: no DESIGN.md` and stop (brand decisions are never guessed).
3. `node .motion-graphics/mg.mjs inbox`, then `node .motion-graphics/mg.mjs session list --status queued`.
4. For each queued session (oldest first, up to `--limit`):
   1. `session.json.needs_choreography` or the CHOREOGRAPHY.md is still the template → derive one with the choreography-md
      algorithm and DESIGN defaults (pace steady, target = beats × 4.4 s). You may delegate to `motion-graphics:choreographer`.
   2. `mg validate <id>`. On errors apply **only** mechanical fixes: shorten copy that breaks length/fit (keep the meaning;
      log before → after in the report) or lengthen scenes for timing errors. Max 2 attempts. Still failing, or `claim.source`
      → `mg session set <id> status=needs-human` and continue.
   3. `mg stills <id>` → read the contact sheet → score with the motion-qa rubric. Below 14/22 → `status=needs-human`.
   4. `mg make <id> [--formats …]`. QA FAIL → one fix attempt → else the CLI leaves `status=failed`.
5. Summary: one line per session `id · status · formats · duration · QA · rubric score · output/` path, plus the needs-human
   reasons. Send it with SendUserMessage / PushNotification if available.

## Scheduling it
- **Claude scheduled task**: prompt `/motion-graphics:batch-videos --limit 3` in an environment that has this plugin and the project folder.
- **Cron / Task Scheduler / CI**: `claude -p "/motion-graphics:batch-videos --limit 3" --allowedTools "Bash(node .motion-graphics/mg.mjs *),Bash(node *init-workspace.mjs*),Read,Write,Edit,Glob,Grep"` from the project root.
- Outputs stay in `.motion-graphics/sessions/<id>/output/`; publishing stays manual.
