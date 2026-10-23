# Scheduled & unattended production

The Claude plugin's `batch-videos` skill processes a queue without asking questions. It follows the motion-graphics skill's
"Unattended" rules: it never invents content or brand decisions, applies only mechanical copy fixes, and moves anything
uncertain to `_needs-human/`.

## Queue layout
```
motion-studio/queue/
  2026-10-21-leverage-hook-a/   CONTENT.md  [CHOREOGRAPHY.md]  [formats.txt]
  2026-10-21-leverage-hook-b/   CONTENT.md
  _done/ _failed/ _needs-human/ LOG.md
```
Feed it from anywhere: a content calendar export, an n8n/Make/Zapier flow that writes folders, or a teammate.

## Option A: Claude scheduled task
Create a scheduled task in the Claude app (or ask Claude to "schedule the motion-graphics batch every weekday at 7am")
with the prompt `/motion-graphics:batch-videos --limit 3`, in an environment where the plugin is installed and the project
folder (with `motion-studio/`) is available. Each run starts fresh, reads the queue and writes `LOG.md`.

## Option B: cron / Task Scheduler with headless Claude Code
```bash
cd /path/to/project && claude -p "/motion-graphics:batch-videos --limit 3" \
  --allowedTools "Bash(npm run *),Bash(npm install*),Read,Write,Edit,Glob,Grep"
```
Windows Task Scheduler: Program `claude`, Arguments `-p "/motion-graphics:batch-videos --limit 3" --allowedTools "Bash(npm run *),Read,Write,Edit,Glob,Grep"`,
Start in: your project folder.

## Option C: GitHub Actions
```yaml
on: { schedule: [{ cron: "0 6 * * 1-5" }], workflow_dispatch: {} }
jobs:
  videos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: motion-studio/package-lock.json }
      - run: npm i -g @anthropic-ai/claude-code
      - run: claude -p "/motion-graphics:batch-videos --limit 3" --plugin-dir ./claude-plugin --allowedTools "Bash(npm *),Read,Write,Edit,Glob,Grep"
        env: { ANTHROPIC_API_KEY: "${{ secrets.ANTHROPIC_API_KEY }}" }
      - uses: actions/upload-artifact@v4
        with: { name: videos, path: "motion-studio/jobs/*/out/*.mp4" }
```

## Without a model at all
If CONTENT.md and CHOREOGRAPHY.md are already final, no model is needed:
`cd motion-studio && npm run make -- jobs/<id> --formats vertical,square`. Use this for re-renders after a DESIGN change.

## Safety rails
- No auto-publishing: outputs land in `out/` for a human to post.
- `claim.source` errors are never "fixed" automatically.
- Each run is capped by `--limit` and by the skill's loop limits (2 build fixes, 1 render fix per job).
