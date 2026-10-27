# Scheduled & unattended production

The Claude plugin's `batch-videos` skill processes the workspace's inbox and queued sessions without asking questions.
It follows the motion-graphics skill's "Unattended" rules: it never invents content or brand decisions, applies only
mechanical copy fixes, and marks anything uncertain `needs-human`.

## Inputs
```
<workspace>/.motion-graphics/
  DESIGN.md                         required (brand decisions are never guessed)
  inbox/
    2026-10-21-leverage-hook-a.md   a CONTENT.md (any file name)
    leverage-hook-b/                CONTENT.md  [CHOREOGRAPHY.md]  [formats.txt → "vertical,square"]
    _ingested/                      processed items (moved here by `mg inbox`)
  sessions/<id>/                    `mg inbox` turns each item into a session with status "queued"
```
Feed the inbox from anywhere: a content-calendar export, an n8n/Make/Zapier flow, a teammate, or another agent.
Statuses: `queued → validated → rendered → done`, or `failed` / `needs-human` (see `session.json.history` for why).

## Option A: Claude scheduled task
Create a scheduled task in the Claude app (or ask Claude to "schedule the motion-graphics batch every weekday at 7am")
with the prompt `/motion-graphics:batch-videos --limit 3`, in an environment where the plugin is installed and the project
folder is available. Each run starts fresh, reads `.motion-graphics/`, and reports one line per session.

## Option B: cron / Task Scheduler with headless Claude Code
```bash
cd /path/to/project && claude -p "/motion-graphics:batch-videos --limit 3" \
  --allowedTools "Bash(node .motion-graphics/mg.mjs *),Bash(node *init-workspace.mjs*),Read,Write,Edit,Glob,Grep"
```
Windows Task Scheduler: Program `claude`, Arguments `-p "/motion-graphics:batch-videos --limit 3" --allowedTools "Bash(node .motion-graphics/mg.mjs *),Read,Write,Edit,Glob,Grep"`,
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
        with: { node-version: 20 }
      - run: npm i -g @anthropic-ai/claude-code
      - run: claude -p "/motion-graphics:batch-videos --limit 3" --plugin-dir ./claude-plugin --allowedTools "Bash(node *),Read,Write,Edit,Glob,Grep"
        env: { ANTHROPIC_API_KEY: "${{ secrets.ANTHROPIC_API_KEY }}" }
      - uses: actions/upload-artifact@v4
        with: { name: videos, path: ".motion-graphics/sessions/*/output/*" }
```
(The first run installs the engine into `.motion-graphics/.engine`. Cache that folder between runs to save about a minute.)

## Without a model at all
If CONTENT.md and CHOREOGRAPHY.md are final, no model is needed:
```bash
node .motion-graphics/mg.mjs inbox
node .motion-graphics/mg.mjs session list --status queued
node .motion-graphics/mg.mjs make <session> --formats vertical,square
```
Use this for re-renders after a DESIGN change too.

## Safety rails
- No auto-publishing: outputs land in `sessions/<id>/output/` for a human to post.
- `claim.source` errors are never "fixed" automatically.
- Each run is capped by `--limit` and by the skill's loop limits (2 validation fixes, 1 render fix per session).
