# Chat mode — no workspace, no shell

Used in ChatGPT, claude.ai chat or any interface where you cannot run commands or write to a working directory.
**The conversation is the session.** You produce the same three files the engine needs and settle every decision with
the user inside the chat, so they can render later (or hand the files to a workspace agent) with zero rework.

## 1. Open with a session header
Post once at the start and update it whenever something is locked:
```
SESSION  <working title>  ·  mode: chat
DESIGN.md        ☐ not set | ◐ draft | ☑ locked (vX)
CONTENT.md       ☐ | ◐ | ☑  (n beats)
CHOREOGRAPHY.md  ☐ | ◐ | ☑  (n scenes, ~s)
```
Nothing is "locked" until the user approves it.

## 2. DESIGN.md (static)
- If the user pastes or uploads a DESIGN.md → use it as-is and summarise it in 3 lines. Tell them to keep it: it is reused by every video.
- Otherwise run the **design-md** interview (≤ 4 questions per message, defaults offered) or extract from a URL/brand
  description they give. If you can browse, follow `design-md/references/extraction-guide.md` → "From a website".
- Output the **complete** file in one ```markdown code block, starting from `design-md/references/DESIGN.template.md`
  (or the Signal Ops example), with every front-matter field filled. Never output a partial DESIGN.md.

## 3. CONTENT.md (this video)
- Uploaded or pasted → use it. Free text → normalise into beats (content-md) and show the beat table for approval.
- Nothing → ask for the message, with the short example from content-md.
- Then output the complete CONTENT.md in one code block.

## 4. CHOREOGRAPHY.md (this video)
- Ask only format / length / goal / pace, derive the rest (choreography-md), show the scene table, then output the
  complete CHOREOGRAPHY.md in one code block.

## 5. Manual validation (the compiler isn't available, so do its job)
Check and report each line as ✔/✖ before declaring the files final:
- [ ] every `beat:` in CHOREOGRAPHY exists in CONTENT; every CONTENT beat is used
- [ ] template required slots present (statement/title/endcard: headline · stack: lines · stat: value · list: items · compare: before+after · sequence: parts)
- [ ] lengths: label ≤ 24 · setup/tail ≤ 44 · headline ≤ 14 · line ≤ 26 · item ≤ 32 · value ≤ 7 · cta ≤ 34 (or the DESIGN role `max_chars`)
- [ ] scene durations within DESIGN `min/max_duration_s`; total within ±15 % of target; ≥ 1.2 + 0.28 s per word on screen
- [ ] hook hero lands early (scene 1 setup ≤ 5 words, or hero first)
- [ ] ≤ 1 accent per scene; accents only on the turn/payoff; emphasis tokens exist in DESIGN `colors`
- [ ] last scene is an `endcard` with a CTA
- [ ] no characters outside basic Latin + `▸ //` in on-screen copy (no →, smart quotes, emoji)
- [ ] every `statistic` claim has a `source`
- [ ] every `audio.sfx.map` id exists in the sound-design catalogue
- [ ] YAML is valid: front matter between `---` lines, one ```yaml block per scene/beat, each with `id:`

## 6. Hand-over
When all three are locked:
1. Provide them as downloadable files if the interface supports it (named exactly `DESIGN.md`, `CONTENT.md`,
   `CHOREOGRAPHY.md`); otherwise the three code blocks are the deliverable.
2. Give the post copy (caption, first comment, hashtags) from CONTENT.md.
3. Give the render instructions:
   ```
   In a workspace with the motion-graphics plugin (Claude Code, Codex, Cursor…):
     1. say "set up motion graphics here" (creates .motion-graphics/)
     2. save DESIGN.md as .motion-graphics/DESIGN.md (once per brand)
     3. node .motion-graphics/mg.mjs session new "<title>"
     4. save CONTENT.md + CHOREOGRAPHY.md into that session folder, then:
        node .motion-graphics/mg.mjs make <session-id> --formats vertical
   ```
4. If the chat has a code sandbox with Node ≥ 18 **and** npm network access, you may run Workspace mode inside it (a
   temporary workspace) and attach the MP4 — say that the sandbox is temporary. Otherwise do not pretend to render.

## Never in chat mode
- Don't describe a video as rendered when it wasn't.
- Don't skip the approval of beats and scene table: there is no contact sheet, so the human review is the gate.
- Don't spread a file over several messages. Always output whole files, so the latest code block is the source of truth.
