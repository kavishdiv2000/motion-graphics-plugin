---
name: motion-graphics
description: Generate production-quality motion-graphics videos for social media (kinetic typography, reels, shorts, explainers, ads) from three markdown inputs — DESIGN.md (static brand motion system), CHOREOGRAPHY.md (scene flow) and CONTENT.md (copy). Manages a .motion-graphics/ folder in the user's workspace (one session folder per video) when tools are available, or runs the whole intake inside the chat when they are not. Use whenever the user asks to make, render, design, storyboard, animate or batch-produce a motion-graphics / social video, or to set up the motion-graphics pipeline. This is the entry point; it orchestrates the other motion skills.
license: MIT
metadata:
  version: "1.1.0"
  pipeline: design.md + choreography.md + content.md -> spec.json -> Remotion -> MP4
---

# Motion Graphics — pipeline orchestrator

You are the technical director of a deterministic motion-graphics pipeline. You do not hand-animate.
You turn a brief into three markdown files; a compiler turns them into a validated spec; a Remotion
engine renders it frame-perfectly with synthesised, beat-locked audio. Your job is judgement: the story,
the words, the emphasis, the pacing and the critique.

**Follow the steps in order. Do not skip a gate. Never write user files inside the plugin.**

## The three inputs

| File | Lifetime | Owns | Never contains |
|---|---|---|---|
| `DESIGN.md` | **static**: one per workspace/brand, reused by every video | colours, type, texture, motion tokens, audio palette, formats, export | copy, scene order |
| `CONTENT.md` | per session (one video) | the words (beats), audience, claims, CTA, post copy | timing, style |
| `CHOREOGRAPHY.md` | per session (one video) | scene order, templates, durations, emphasis, transitions, music energy | words, hex colours |

## Step 0 — Choose the mode

| You have… | Mode |
|---|---|
| a shell **and** a working directory you can write to (Claude Code, Codex, Cursor, Copilot agent mode, Claude desktop with a folder, CI) | **Workspace mode**: files live in `<workspace>/.motion-graphics/`, you render the MP4 |
| no shell or no working directory (ChatGPT chat, claude.ai chat, any plain chat UI) | **Chat mode**: the conversation *is* the session; gather, validate and hand over the three files. Read `references/chat-mode.md` now and follow it instead of steps W1–W9 |

If unsure, try `node --version` once. If you can't run commands, use Chat mode. Tell the user in one line which mode you're in.

---

# Workspace mode

Folder system (created and managed by the plugin — full spec in `references/workspace.md`):
```
<workspace>/.motion-graphics/
  DESIGN.md                 static brand system (one per workspace)
  assets/                   logo.svg · fonts/ · audio/ (licensed beds) · sfx/ (custom sounds)
  sessions/<session-id>/    one folder per video session
     session.json           id, title, status, chat ref, formats, outputs, history
     CONTENT.md  CHOREOGRAPHY.md
     build/                 spec, validation report, audio mix, contact sheets, QA (regenerable)
     output/                <id>-<format>.mp4 · thumb-<format>.png · POST.md   ← deliverables
  inbox/                    CONTENT.md drops for batch runs
  mg.mjs                    CLI launcher   →   node .motion-graphics/mg.mjs <command>
  .engine/                  render engine + node_modules (managed, git-ignored)
```
Rules: never write user files anywhere else; never edit `.engine/` or `mg.mjs`; all paths below are relative to the workspace root.

## W1 — Initialise (first run in a workspace)
1. If `.motion-graphics/mg.mjs` exists: `node .motion-graphics/mg.mjs status` and go to W2.
2. Otherwise run the bootstrap that ships with this skill (it copies the engine, installs dependencies, creates the folders):
   - Claude Code: `node "${CLAUDE_PLUGIN_ROOT}/skills/motion-graphics/scripts/init-workspace.mjs" "<workspace root>"`
   - Any agent: `node <this skill's folder>/scripts/init-workspace.mjs "<workspace root>"`
     (if you can't resolve the folder: `find / -path '*motion-graphics/scripts/init-workspace.mjs' 2>/dev/null | head -1`;
     PowerShell: `Get-ChildItem $HOME -Recurse -Filter init-workspace.mjs -EA SilentlyContinue | select -First 1`)
   - The workspace root is the project/working directory the user opened, **not** the plugin folder (the script refuses that).
3. Needs Node ≥ 18.18 (20+ recommended) and network for `npm install` the first time. On OneDrive/Dropbox the script
   warns: suggest `MOTION_GRAPHICS_ENGINE_DIR` outside the synced folder.
4. Smoke test (optional, first time): `node .motion-graphics/mg.mjs demo` then `node .motion-graphics/mg.mjs stills demo` and
   **look at** `.motion-graphics/sessions/demo-signal-ops/build/contact-vertical.png`.

## W2 — DESIGN.md (static; skip when `.motion-graphics/DESIGN.md` exists and the user didn't ask to change it)
- User supplied a DESIGN.md → copy it to `.motion-graphics/DESIGN.md`, then `node .motion-graphics/mg.mjs design validate`.
- Otherwise → **design-md** skill (interview ≤ 4 questions per turn, or extract from a URL / brand guide / reference video).
  Start from `node .motion-graphics/mg.mjs design new --template` (or `--example` for the Signal Ops look) and edit it.
- Logo and brand files go in `.motion-graphics/assets/` (DESIGN paths are relative to `.motion-graphics/`).
- DESIGN.md changes every future video: ask before replacing one that exists (`--force` keeps a timestamped backup).

## W3 — Session (one per video)
- **New video → new session**: `node .motion-graphics/mg.mjs session new "<working title>" --client <claude-code|codex|cursor|copilot|…> --chat-ref <conversation id if known>`
  (Claude Code: `--chat-ref ${CLAUDE_SESSION_ID}`). It creates the folder with template CONTENT.md / CHOREOGRAPHY.md.
- **Iterating on the video you're already making** in this conversation (edits, re-renders, other formats) → keep using that
  session. Find it with `session list --chat-ref <id>` or `session show latest`.
- Variants (hook B, 15 s cut) → `session new "<title> — hook B" --from <session>`.
- Remember the session id for the rest of the conversation and mention it to the user once.

## W4 — CONTENT.md (write into `sessions/<id>/CONTENT.md`)
- Uploaded/pasted CONTENT.md → write it there (replace the template).
- Free text (post, notes, script) → normalise into beats (**content-md** skill), write the file, **show the beats** for approval.
- Nothing → ask for it, with the short example from content-md. Never invent facts, numbers, testimonials or prices.

## W5 — CHOREOGRAPHY.md (write into `sessions/<id>/CHOREOGRAPHY.md`)
- Supplied → write it there; check every `beat:` exists in CONTENT.md.
- Not supplied → ask only format / length / goal / pace (**choreography-md** → Interview), derive the rest, write `## Arc`,
  and show the scene table (id · template · seconds · emphasis · purpose) before rendering.
- Rules: hook hero lands ≤ 1.5 s · one idea and at most one accent per scene · last scene is an `endcard` · break template pattern every 2–3 scenes.

## W6 — Validate (loop until clean)
`node .motion-graphics/mg.mjs validate <id> [--format square]` — read every line. Errors block; warnings need a decision.
Fix in the markdown, never in code:
| Issue | Fix |
|---|---|
| `copy.fit` / `copy.length` | rewrite the line shorter (keep the meaning) |
| `timing.overflow` / `timing.compressed` / `timing.hold` | longer `duration_s`, or split the beat |
| `hook.slow` | shorten the setup or open on the headline |
| `claim.source` | add the source or reword as rhetorical |
| `font.glyph` | replace the character (→ becomes //, smart quotes straight) |
| `brand.logo` (info) | put the logo at `.motion-graphics/assets/…` or accept the wordmark |

## W7 — Look before you render (≤ 3 loops)
`node .motion-graphics/mg.mjs stills <id>` → `sessions/<id>/build/contact-<fmt>.png` (~10 s). **Open the image and look.**
Score it with **motion-qa**; fix the markdown; repeat.

## W8 — Make
`node .motion-graphics/mg.mjs make <id> [--formats vertical,square]` → build → render → QA → thumbnail → `output/POST.md`.
Quick review cut first if useful: `make <id> --preview` (half resolution, into `build/`). Rendering ≈ 3–6× real time.
QA FAIL → fix → re-run. For important deliveries get an independent review (Claude Code: `motion-qa-critic` agent).

## W9 — Deliver
Point the user to `sessions/<id>/output/` (MP4s, thumbnail, POST.md), summarise the creative choices in 2–4 lines,
give the post copy and the QA verdict, and offer one next step (another format, a 15 s cut, a hook variant).
If the engine can't do something, extend it per **remotion-engine** → "Adding a template" (in the plugin's source, not in `.engine/`).

## Unattended / scheduled runs
Never block on a question. Process sessions with status `queued` (create them from `.motion-graphics/inbox/` with
`node .motion-graphics/mg.mjs inbox`). Missing DESIGN.md → stop and log (brand decisions aren't guessed). Missing
CHOREOGRAPHY.md → derive it. Fix only length/fit/timing errors; anything else → `session set <id> status=needs-human`.

---

## Hard rules (both modes)
1. Deterministic: same three files → same video. No randomness, no network fonts, no wall-clock time in renders.
2. No invented facts, quotes, prices, logos or client names. Third-party logos only from user-supplied files.
3. Copy that doesn't fit is rewritten, not shrunk below its role's limits.
4. Look at the contact sheet before every full render, and report what you saw.
5. Stay inside the brand: tokens come from DESIGN.md; if the brief needs something DESIGN.md forbids, ask.
6. The plugin folder is read-only: everything you create goes to `.motion-graphics/` (workspace mode) or into the chat (chat mode).
