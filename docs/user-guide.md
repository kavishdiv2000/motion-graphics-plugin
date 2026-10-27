# User guide

## Two ways the plugin works
| Where you use it | Mode | What you get |
|---|---|---|
| An agent with a shell and a folder: Claude Code, Codex, Cursor, Copilot agent mode, Claude desktop with a folder | **Workspace mode** | the plugin manages `.motion-graphics/` in your project and renders the MP4s |
| A plain chat: ChatGPT, claude.ai chat | **Chat mode** | design, content and choreography are settled in the chat; you get the three finished files and render instructions |

## 0. One-time setup (workspace mode)
1. Install Node 20+ (nodejs.org). Windows: use PowerShell or Windows Terminal.
2. Install a plugin (root README): Claude Code → `claude-plugin`; Codex/Cursor/Copilot → `agent-plugin`.
3. Open your project folder and say **"Set up motion graphics here."** The agent runs the plugin's setup script, which creates
   `.motion-graphics/` (folders, CLI launcher, config), installs the render engine into `.motion-graphics/.engine/`, and
   can render a demo contact sheet to prove it works.

If your project is in OneDrive/Dropbox, keep the ~300 MB engine out of sync: exclude `.motion-graphics/.engine`, or set
`MOTION_GRAPHICS_ENGINE_DIR` to a folder outside the synced area before setup.

## 1. Set your brand once (`.motion-graphics/DESIGN.md`)
Say **"Set up our motion design"** (Claude Code: `/motion-graphics:setup-design https://yoursite.com`).
Give it your website, a brand guide, a reference video you like, or just answer the questions (4 short rounds: identity,
colours, type and motion, sound). It writes `.motion-graphics/DESIGN.md`, previews it on a "design preview" session and
iterates until you approve.
- Logo → `.motion-graphics/assets/logo.svg` · licensed music → `assets/audio/` · custom sounds → `assets/sfx/`
- Brand fonts: `node .motion-graphics/mg.mjs font add MyFont-Bold.woff2 "MyFont" 700`
- Replacing DESIGN.md keeps a timestamped backup (`DESIGN.<time>.md`).

## 2. Make a video
Say what you want and give the words in any form:
> Make a 25-second reel for founders from this post: "…". CTA: book a call at damnfineagents.com/call

What happens:
1. A **session folder** is created for this video: `.motion-graphics/sessions/20261023-1317-<title>/`.
2. Your text becomes **beats** (one idea each, with a hero word) in the session's `CONTENT.md`. You approve or edit them.
3. A **scene plan** (template, seconds, accent, purpose) goes into `CHOREOGRAPHY.md`. You approve or edit it.
4. The agent validates, renders a **contact sheet** (`build/contact-vertical.png`), critiques it and fixes issues.
5. It renders and runs QA, and puts the deliverables in `output/`: `<id>-vertical.mp4`, `thumb-vertical.png`, and `POST.md`
   (caption, first comment, hashtags, QA verdict).

Already have files? Give it `CONTENT.md` (and optionally `CHOREOGRAPHY.md`) and say "render this". They're copied into a
new session folder. Templates: `agent-plugin/skills/*/references/*.template.md`.

## 3. Formats, variants, iterations
- "Also give me square and 16:9." → same session, more files in `output/`.
- "Make three hook variants." → three sessions created with `--from`, differing only in scene 1.
- "Make the third scene hit harder." → same session: the markdown is edited and the video re-rendered.
- A new video in the same chat → a new session folder. The agent tracks which sessions belong to the conversation.

## 4. Editing after a render
Talk in creative terms; the agent maps your request to the markdown:
| You say | It changes |
|---|---|
| "Make the third scene hit harder." | the session's emphasis colour, `decode_land` sound, hold time |
| "Slower, more premium." | pace → contemplative; DESIGN motion preset (asks first: DESIGN affects every video) |
| "LEVERAGE should be orange." | scene `emphasis: accent_orange` |
| "Too many clicks." | `audio.sfx.map.word_in: null` (brand-wide, so it asks) |
| "Shorter." | merges or cuts beats; pace → urgent |

## 5. Chat mode (ChatGPT, claude.ai chat)
The agent keeps a small session header in the chat (DESIGN / CONTENT / CHOREOGRAPHY: not set → draft → locked), interviews
you, shows the beat table and scene table for approval, checks everything against a manual validation checklist, and
gives you the three complete files plus the post copy. To render them later in a workspace:
```
node .motion-graphics/mg.mjs session new "<title>"      → save CONTENT.md + CHOREOGRAPHY.md into that session folder
node .motion-graphics/mg.mjs make <session-id>          (DESIGN.md goes in .motion-graphics/ once)
```

## 6. Batch / scheduled production (Claude plugin)
Drop `CONTENT.md` files (or folders with CONTENT.md + optional CHOREOGRAPHY.md + `formats.txt`) into `.motion-graphics/inbox/`
and run `/motion-graphics:batch-videos`, or schedule it. See [scheduling.md](scheduling.md).

## 7. Handy commands
```
node .motion-graphics/mg.mjs status            design + all sessions
node .motion-graphics/mg.mjs session show latest
node .motion-graphics/mg.mjs make <session> --formats vertical,square
node .motion-graphics/mg.mjs doctor            environment check
node .motion-graphics/mg.mjs help
```
