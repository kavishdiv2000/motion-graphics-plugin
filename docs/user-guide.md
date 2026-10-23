# User guide

## 0. One-time setup
1. Install Node 20+ (nodejs.org). Windows: use PowerShell or Windows Terminal.
2. Install a plugin (see the root README): Claude Code → `claude-plugin`; Codex/Cursor/Copilot → `agent-plugin`.
3. Open your project folder and ask: **"Set up the motion graphics studio."** The agent copies the engine to
   `motion-studio/`, runs `npm install`, renders the demo contact sheet and shows it to you.

## 1. Set your brand once (DESIGN.md)
Ask: **"Set up our motion design"** (Claude Code: `/motion-graphics:setup-design https://yoursite.com`).
Give it any of: your website, a brand guide, a reference video you like, or just answer the questions
(4 short rounds: identity, colours, type and motion, sound). It writes `motion-studio/brand/DESIGN.md`, renders the
demo in your style, and iterates until you approve. Put your logo in `motion-studio/public/brand/logo.svg`.

Tip: the shipped example ("Signal Ops") is the style of the reference reel. Use it to try things out, then replace it with your own.

## 2. Make a video
Say what you want and give the words in any form:
> Make a 25-second reel for founders from this post: "…". CTA: book a call at damnfineagents.com/call

What happens:
1. Your text becomes **beats** (one idea each, with a hero word). You approve or edit them.
2. The agent proposes a **scene plan** (template, seconds, accent, purpose). You approve or edit it.
3. It validates, renders a **contact sheet** (all scenes, mid and landed), critiques it, and fixes issues.
4. It renders the MP4 and runs QA (codec, length, loudness).
5. You get the video, the contact sheet and the caption, first comment and hashtags.

Already have files? Drop `CONTENT.md` (and optionally `CHOREOGRAPHY.md`) in the chat or folder and say "render this".
Templates: `agent-plugin/skills/*/references/*.template.md`.

## 3. Formats and variants
- "Also give me square and 16:9." → `npm run make -- jobs/<id> --formats vertical,square,horizontal`
- "Make three hook variants." → three jobs that differ only in scene 1.
- "Cut a 15-second version." → a new job with fewer scenes and the urgent pace.

## 4. Editing after a render
Talk in creative terms; the agent maps your request to the markdown:
| You say | It changes |
|---|---|
| "Make the third scene hit harder." | emphasis colour, `decode_land` sound, hold time |
| "Slower, more premium." | pace → contemplative; DESIGN motion preset (asks first, since DESIGN affects every video) |
| "LEVERAGE should be orange." | scene `emphasis: accent_orange` |
| "Too many clicks." | `audio.sfx.map.word_in: null` (brand-wide, so it asks) or a per-video override |
| "Shorter." | merges or cuts beats; pace → urgent |

## 5. Batch / scheduled production (Claude plugin)
Put folders with a `CONTENT.md` into `motion-studio/queue/` and run `/motion-graphics:batch-videos`, or schedule it.
See [scheduling.md](scheduling.md).

## 6. Where things are
`motion-studio/jobs/<id>/out/*.mp4` videos · `contact-*.png` review sheets · `report.*.md` validation · `qa.*.json` QA ·
`brand/DESIGN.md` your brand · `public/brand/` logos · `public/sfx/custom/` your own sounds.
