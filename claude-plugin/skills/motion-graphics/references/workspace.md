# .motion-graphics/ — workspace folder system (motion-graphics-workspace/1.0)

Created by `scripts/init-workspace.mjs` (bootstrap) and managed by the CLI `node .motion-graphics/mg.mjs`.
The plugin never writes into its own folder; everything below lives in the user's workspace.

```
<workspace>/.motion-graphics/
├─ config.json            { schema, created, engine_version, engine_dir, default_formats }
├─ README.md              explains the folder to humans
├─ .gitignore             ignores .engine/, sessions/*/build/, assets/sfx-library/, output MP4s
├─ mg.mjs                 launcher (managed; do not edit)
├─ .engine/               render engine copy + node_modules (managed; reinstall any time with the bootstrap)
├─ DESIGN.md              static brand motion system — ONE per workspace
├─ DESIGN.<timestamp>.md  automatic backups when DESIGN.md is replaced with --force
├─ assets/
│  ├─ logo.svg            referenced by DESIGN brand.logo.primary: assets/logo.svg
│  ├─ fonts/              custom font files + metrics.json  (mg font add …)
│  ├─ audio/              licensed music beds (16-bit 48 kHz WAV) → DESIGN audio.music.file: assets/audio/bed.wav
│  ├─ sfx/                custom sounds <id>.wav usable as a kit role's sound, in scene sfx, or in the classic map
│  └─ sfx-library/        audition copy of the 50 built-in SFX (mg sfx; git-ignored)
├─ inbox/                 drop CONTENT.md files (or folders with CONTENT.md [+ CHOREOGRAPHY.md] [+ formats.txt]) → mg inbox
│  └─ _ingested/          processed inbox items (renamed <session-id>--<name>)
└─ sessions/
   └─ 20261023-1317-agents-leverage/        <yyyymmdd-hhmm-slug>  (or --id <custom>)
      ├─ session.json      see schema below
      ├─ CONTENT.md        per-video copy
      ├─ CHOREOGRAPHY.md   per-video scene plan
      ├─ build/            spec.<fmt>.json · report.<fmt>.md · cues.<fmt>.json · mix.<fmt>.wav · contact-<fmt>.png
      │                    · qa.<fmt>.json · preview-<fmt>.mp4 · stills/<fmt>/ — all regenerable
      ├─ output/           <id>-<fmt>.mp4 · thumb-<fmt>.png · POST.md   ← what the user receives
      ├─ usage.json        tokens spent on this video (totals, by model, by client, by chat) — written by the usage hook
      └─ usage.log.jsonl   one line per recorded turn
├─ usage/                 workspace.json + workspace.log.jsonl: motion-graphics work not tied to one video (design setup)
└─ .state/                hook bookkeeping: transcript offsets, last touched session, usage-errors.log (git-ignored)
```

## Session = one video
- A new video always gets a new session folder. Edits, re-renders and extra formats of the same video reuse it.
- One conversation can create several sessions. `session.json.chat.ref` records which conversation made it, so
  `mg session list --chat-ref <id>` finds "the video we were working on".
- Variants are separate sessions created with `--from <session>` so each keeps its own output.

## session.json (motion-graphics-session/1.0)
```json
{
  "schema": "motion-graphics-session/1.0",
  "id": "20261023-1317-agents-leverage",
  "title": "Agents are leverage",
  "status": "draft | queued | validated | rendered | done | failed | needs-human",
  "created": "…", "updated": "…",
  "chat": { "client": "claude-code", "ref": "<conversation/session id>" },
  "design": null,                       // null = .motion-graphics/DESIGN.md · "example" = bundled Signal Ops (demo only)
  "formats": ["vertical"],              // formats built so far
  "requested_formats": ["vertical","square"],   // from inbox formats.txt (used by make when --formats is omitted)
  "outputs": [".motion-graphics/sessions/…/output/…-vertical.mp4"],
  "qa": { "vertical": "PASS" },
  "history": [{ "at": "…", "event": "created from templates" }, { "at": "…", "event": "qa vertical: PASS" }]
}
```
The CLI maintains it; agents may set `status` / `title` with `mg session set <id> status=needs-human`.

## CLI reference (`node .motion-graphics/mg.mjs …`)
| Command | Does |
|---|---|
| `help` · `status` · `doctor` | usage · design + sessions table · environment checks |
| `init` | (re)create folders, launcher, config, .gitignore (the bootstrap calls it) |
| `design new [--template\|--example] [--force]` · `design validate` · `design path` | create / check the static DESIGN.md |
| `session new "<title>" [--id] [--status queued] [--client] [--chat-ref] [--from <ref>] [--example]` | create a session folder |
| `session list [--chat-ref] [--status]` · `session show <ref>` · `session set <ref> key=value…` | manage sessions |
| `inbox` | turn inbox drops into `queued` sessions |
| `validate <ref> [--format f]` | validation only |
| `build <ref> [--format f] [--no-audio] [--strict]` | validate + spec + audio mix |
| `stills <ref> [--format f] [--frames 30,90] [--cols n] [--separate]` | contact sheet (look at it) |
| `render <ref> [--format f] [--preview] [--frames a-b]` | MP4 (`--preview` = half-res into build/) |
| `qa <ref> [--format f]` | probe, loudness, contact sheet → build/qa.<fmt>.json |
| `make <ref> [--formats a,b] [--preview] [--skip-qa]` | build → render → QA → thumbnail → output/POST.md |
| `studio <ref>` | Remotion Studio preview of the session |
| `demo` | session `demo-signal-ops` from the bundled example (uses the example design if none exists) |
| `sfx` · `font add <file> "<Family>" <weight>` | SFX audition library · register a custom font |
| `usage [<ref>\|--all] [--json]` | token table per session (+ workspace) |
| `usage add <ref> --input N --output N [--cache-read N] [--cache-write N] [--model m] [--client c] [--note …]` | log tokens by hand (clients without hooks) |
| `usage hooks install codex\|cursor\|claude` | add the recording hook to the project's `.codex/hooks.json` · `.cursor/hooks.json` · `.claude/settings.json` |
| `usage hook <claude-code\|codex\|cursor>` | what the hooks run (reads hook JSON on stdin; silent; always exit 0) |
`<ref>` = full id, a unique part of it, `latest`, or a path. Exit codes: 0 ok · 1 validation/QA failure · 2 usage · 3 not initialised.

## Token usage ledger (motion-graphics-usage/1.0)
`usage.log.jsonl` rows: `{ at, run, client, chat, model, input, cache_write, cache_read, output, reasoning, requests, total, source }`
(`input` = uncached input; `output` includes reasoning; `total = input + cache_write + cache_read + output`). `usage.json` is
recomputed from the log after every write. Attribution replays the turn: a line mentioning exactly one session id makes it
current; each model call counts toward the current session; earlier calls go to the session this chat last worked on, else
to `usage/` when the turn touched motion-graphics, else nowhere. The Claude plugin records automatically; other clients
need `usage hooks install <client>` (ask the user first: it edits their project config outside `.motion-graphics/`) or `usage add`.

## Environment variables
| Var | Effect |
|---|---|
| `MOTION_GRAPHICS_ENGINE_DIR` | install/use the engine outside the workspace (e.g. outside OneDrive); recorded in config.json |
| `MOTION_GRAPHICS_WORKSPACE` | force the workspace root (otherwise the launcher's parent folder) |
| `REMOTION_BROWSER_EXECUTABLE` | use an installed Chrome/Chromium instead of Remotion's download |
