---
name: batch-videos
description: Unattended batch production for schedules and automation — renders every pending job in motion-studio/queue/ (each a folder with CONTENT.md and optional CHOREOGRAPHY.md) using the static DESIGN.md, with no questions asked, and writes a run log. Invoke as /motion-graphics:batch-videos or from a scheduled task / `claude -p`.
argument-hint: "[--formats vertical,square] [--limit N] [--queue path]"
---

# /motion-graphics:batch-videos (unattended)

Options: `$ARGUMENTS` (defaults: formats = DESIGN default, limit = 5, queue = `motion-studio/queue`)

**Never ask the user anything in this skill.** Decide, log the decision, continue. Read the "Unattended / scheduled runs"
section of `${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/SKILL.md` first; it overrides interactive behaviour.

## Queue contract
```
motion-studio/queue/
  2026-10-20-agents-leverage/      ← one folder per video (name = job id)
    CONTENT.md                      ← required
    CHOREOGRAPHY.md                 ← optional (derived when missing)
    formats.txt                     ← optional, e.g. "vertical,square"
  _done/  _failed/  _needs-human/   ← created by this skill
  LOG.md                            ← appended by this skill
```

## Procedure
1. Workspace: `motion-studio/` must exist with `brand/DESIGN.md`. If DESIGN.md is missing or is still the shipped example
   while the queue items reference another brand → write `LOG.md: BLOCKED — no brand DESIGN.md` and stop.
2. `cd motion-studio && npm install --no-audit --no-fund` (fast when already installed).
3. For each queue folder in name order (max `--limit`):
   1. Copy it to `jobs/<name>/`.
   2. No CHOREOGRAPHY.md → derive it with the choreography-md algorithm and DESIGN defaults (pace steady, target = beats × 4.4 s).
   3. `npm run build -- jobs/<name>`. On errors, apply **only** mechanical fixes: shorten copy that breaks length/fit limits
      (keep the meaning; log the before → after), lengthen scenes for timing errors. Up to 2 attempts. If it still fails,
      or the error is `claim.source`, move the folder to `_needs-human/` with the report and continue.
   4. `npm run stills -- jobs/<name>`, then read the contact sheet and score it with the motion-qa rubric. Below 14/22 → `_needs-human/`.
   5. `npm run make -- jobs/<name> --formats <formats>` (render + QA). QA FAIL → one fix attempt, then `_failed/`.
   6. Success → move the queue folder to `_done/` and append to `LOG.md`:
      `| date | job | formats | duration | QA verdict | rubric score | fixes applied | output paths |`
4. Finish with a summary line per job. If SendUserMessage/PushNotification exists, send the summary.

## Scheduling it
- **Claude Code scheduled task / routine**: prompt = `/motion-graphics:batch-videos --limit 3`, in a session that has this plugin
  and the project folder.
- **Cron / CI** (headless): `claude -p "/motion-graphics:batch-videos --limit 3" --permission-mode acceptEdits`
  from the project root (allow `Bash(npm run *)` in `.claude/settings.json` permissions).
- **GitHub Actions**: run the same command on `schedule:` with Node 20+, `npm ci` cached and Chrome cached;
  upload `motion-studio/jobs/*/out/*.mp4` as artifacts. Publishing stays manual.
