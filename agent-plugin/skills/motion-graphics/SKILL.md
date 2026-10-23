---
name: motion-graphics
description: Generate production-quality motion-graphics videos for social media (kinetic typography, reels, shorts, explainers, ads) from three markdown inputs — DESIGN.md (static brand motion system), CHOREOGRAPHY.md (scene flow) and CONTENT.md (copy). Use whenever the user asks to make, render, design, storyboard, animate or batch-produce a motion-graphics / social video, or to set up the motion-graphics pipeline. This is the entry point; it orchestrates the other motion skills.
license: MIT
metadata:
  version: "1.0.0"
  pipeline: design.md + choreography.md + content.md -> spec.json -> Remotion -> MP4
---

# Motion Graphics — pipeline orchestrator

You are the technical director of a deterministic motion-graphics pipeline. You do not
hand-animate. You turn a brief into three markdown files, a compiler turns those into a
validated `spec.json`, and a Remotion engine renders it frame-perfectly with synthesised,
beat-locked audio. Your job is judgement: the story, the words, the emphasis, the pacing,
and the critique. The engine's job is pixels and samples.

**Follow the steps in order. Do not skip a gate. Do not write animation code unless step 8
says so.** Each step names the skill to read for detail; read it when you reach the step.

```
0 workspace → 1 DESIGN.md → 2 CONTENT.md → 3 CHOREOGRAPHY.md → 4 validate ⟲ → 5 stills + critique ⟲
→ 6 render → 7 QA ⟲ → 8 (only if needed) extend engine → 9 deliver + post copy
```

## Three inputs, three lifetimes

| File | Lifetime | Owns | Never contains |
|---|---|---|---|
| `motion-studio/brand/DESIGN.md` | **static**: set once per brand | colours, type, texture, motion tokens, audio palette, formats, export | copy, scene order |
| `motion-studio/jobs/<id>/CHOREOGRAPHY.md` | per video | scene order, templates, durations, emphasis, transitions, music energy | words, colours as hex |
| `motion-studio/jobs/<id>/CONTENT.md` | per video | the words (beats), audience, claims, CTA, post copy | timing, style |

Separation is what makes the system reusable: one DESIGN.md drives hundreds of videos; a
CONTENT.md can be re-choreographed for a 15 s ad and a 45 s explainer without rewriting copy.

---

## Step 0 — Workspace (once per project)

1. Look for `motion-studio/package.json` in the current project. If it exists, `cd motion-studio` and go to step 1.
2. Otherwise copy the engine template out of this plugin:
   - Claude Code: `cp -r "${CLAUDE_PLUGIN_ROOT}/skills/remotion-engine/assets/engine" ./motion-studio`
     (Windows PowerShell: `Copy-Item -Recurse "<engine path>" .\motion-studio`)
   - Any agent: the engine is at `../remotion-engine/assets/engine` relative to this SKILL.md's folder.
     If you cannot resolve that path, find it: `find / -path '*remotion-engine/assets/engine/package.json' 2>/dev/null | head -1`
     (PowerShell: `Get-ChildItem -Path $HOME -Recurse -Filter package.json -ErrorAction SilentlyContinue | ? FullName -like '*remotion-engine*assets*engine*' | select -First 1`).
3. `cd motion-studio && npm install` (Node ≥ 18.18). If the project is inside OneDrive/Dropbox, warn the user that syncing
   `node_modules` is slow and suggest excluding it or placing `motion-studio/` outside the synced folder. First render downloads a headless Chrome (~100 MB) unless
   `REMOTION_BROWSER_EXECUTABLE` points to an existing Chrome/Chromium.
4. Smoke test: `npm run build -- jobs/demo && npm run stills -- jobs/demo`, then **open `jobs/demo/contact-vertical.png`**.
   If you can see the frames, the toolchain works. Details and troubleshooting: **remotion-engine** skill.

## Step 1 — DESIGN.md (static; skip if `brand/DESIGN.md` already belongs to this brand)

- If the user supplied a DESIGN.md, copy it to `brand/DESIGN.md` and validate (step 4). Do not re-interview.
- If not: run the interview in the **design-md** skill (≤ 4 questions per turn, defaults offered),
  or extract from a reference (brand URL / reference video) with its extraction guide.
- The repo ships `brand/DESIGN.md` = the "Signal Ops" example (dark CRT grid, decoded type). Never ship a
  client video on the example design without the user saying so.
- Logo files go in `public/brand/` and are referenced from `brand.logo.primary`.

## Step 2 — CONTENT.md (dynamic)

- If the user uploaded/pasted a CONTENT.md: copy to `jobs/<id>/CONTENT.md`.
- If they gave free text (a post, notes, a script): normalise it into beats yourself (**content-md** skill →
  "Normalising free text"), then **show the beats** and ask for approval or edits.
- If nothing: ask for it. Give them the short example from the content-md skill so they know the shape.
  Never invent factual claims, numbers, testimonials or prices. A statistic needs a source.
- Create the job: `npm run new -- <job-id>` (kebab-case), then write the files.

## Step 3 — CHOREOGRAPHY.md (dynamic)

- If supplied: copy it to `jobs/<id>/CHOREOGRAPHY.md` and check every `beat:` exists in CONTENT.md.
- If not: ask only what you can't derive (format, length, goal, pace — **choreography-md** skill → "Interview"),
  then derive the arc, template per beat, durations, emphasis and energy curve yourself, and write the
  `## Arc` rationale. Show the scene table (id · template · seconds · emphasis · one-line purpose) before rendering.

Decision rules you must apply (full detail in choreography-md and motion-craft):
- Hero of scene 1 lands **≤ 1.5 s**. Total length within ±15 % of target.
- **One idea per scene, one accent per scene, at most.** Accent marks the turn or the payoff, not decoration.
- Last scene is an `endcard` with the CTA. Hold ≥ 2 s on the final frame.
- Alternate templates to break pattern every 2–3 scenes (statement → sequence → stack → statement…).

## Step 4 — Validate (loop until clean)

```bash
npm run build -- jobs/<id>            # validate + spec.json + audio mix
npm run build -- jobs/<id> --format square   # other aspect ratios from the same files
```
Read every line of the report. **Errors block. Warnings need a decision.** Typical fixes:
| Issue | Fix — in the markdown, never in code |
|---|---|
| `copy.fit` / `copy.length` | rewrite the line shorter (keep the meaning; prefer a stronger word) |
| `timing.overflow` / `timing.compressed` | raise `duration_s`, or move a part into its own scene |
| `timing.hold` | +0.4–0.8 s duration, or cut a word |
| `hook.slow` | shorten the setup, or open on the headline |
| `claim.source` | add the source or reword as rhetorical |
| `font.glyph` | replace the character (→ becomes //, smart quotes become straight) |

## Step 5 — Look before you render (loop ≤ 3 times)

`npm run stills -- jobs/<id>` renders mid-reveal and landed frames for every scene into
`jobs/<id>/contact-<format>.png` in ~10 s. **Open the image and look at it.** Score it with the
**motion-qa** rubric. Fix problems in the markdown, rebuild, re-look. This loop is where quality comes from —
cheap stills instead of expensive renders.

## Step 6 — Render

`npm run render -- jobs/<id>` (add `--scale 0.5` for a quick preview). About 3–6 s of wall-clock time per second
of video on a laptop. Output: `jobs/<id>/out/<id>-<format>.mp4`. For several aspect ratios:
`npm run make -- jobs/<id> --formats vertical,square`.

## Step 7 — QA

`npm run qa -- jobs/<id>` checks the codec, size, fps, duration, pixel format, loudness (-14 LUFS ±1) and
true peak, and rebuilds the contact sheet. Do the visual pass with the **motion-qa** rubric. FAIL → fix → re-render.
If a separate reviewer agent is available (Claude Code: `motion-qa-critic`), use it. Fresh eyes catch more.

## Step 8 — Extending the engine (only when the templates cannot express the idea)

First try: a different template, `sequence` parts, reveal overrides, timing delays, a choreography change.
If still impossible, follow **remotion-engine** → "Adding a template" (determinism contract, registry entry,
validator limits, a contact-sheet check). Never hard-code copy, colours or timings in components.

## Step 9 — Deliver

Give the user: the MP4 path(s); a 2–4 line summary of the creative choices (arc, accent logic, sound);
the post copy (caption, first comment, hashtags) from CONTENT.md or drafted with the **social-distribution**
skill; and the QA verdict. Offer one concrete next step (e.g. "cut a 15 s version for Stories").

---

## Unattended / scheduled runs

When nobody can answer questions (a schedule, a batch, CI): never block on a question.
- Missing DESIGN.md → stop with a clear message (design is a brand decision; never guess it).
- Missing CHOREOGRAPHY.md → derive one from CONTENT.md with the defaults in choreography-md.
- Missing CONTENT.md → skip that job and log it.
- Fix validation errors by rewriting copy **only** for length/fit; anything else → mark the job `needs-human`.
- Always produce: the MP4, `report.<fmt>.md`, `qa.<fmt>.json`, the contact sheet, and a one-line log entry.

## Hard rules
1. Deterministic: same three files → same MP4. No `Math.random`, no network fonts, no wall-clock time.
2. No invented facts, quotes, prices, logos or client names. Third-party logos only from user-supplied files.
3. Copy that doesn't fit is rewritten, not shrunk below its role's limits.
4. Look at the contact sheet before every full render. Report what you saw.
5. Stay inside the brand: tokens come from DESIGN.md; if the brief needs something DESIGN.md forbids, ask.
