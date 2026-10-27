---
name: content-md
description: Collect, normalise and validate CONTENT.md, the per-video copy for the motion-graphics pipeline (audience, core message, beats with on-screen text, claims, CTA, post copy). Use when the user uploads content, pastes a script/post/notes to turn into a motion-graphics video, or when content is missing and must be requested.
license: MIT
metadata:
  version: "1.1.0"
  schema: motion-content/1.0
---

# CONTENT.md — what the video says

Template: `references/CONTENT.template.md`. Full example (the reference reel's copy): `references/CONTENT.example.md`.
Copy rules: `references/copywriting.md`.

## Intake: three cases
1. **A CONTENT.md was uploaded.** Write it to the session (`.motion-graphics/sessions/<id>/CONTENT.md`; in chat mode keep it in the conversation) and check the beats (see the checklist below).
2. **Free text was given** (a LinkedIn post, notes, a voice-memo transcript, a blog intro). Normalise it (next section),
   write the file, and **show the beats as a table** (label · setup · HEADLINE · tail) for approval.
3. **Nothing was given.** Ask for it, and show this mini-example so they know the shape:

   > Paste your message as plain text or bullet points, e.g.
   > *"Most founders think they need more hours. They need leverage. Agents can do in minutes what eats 8 hours a day.
   > Systemize the routine, delegate the execution, own the vision. CTA: damnfineagents.com"*
   > Or answer: who it's for · the one thing they should believe after watching · what they should do at the end.

   When unattended, never invent content: skip the job and log `missing CONTENT.md`.

## Normalising free text into beats
1. Write the **core message** in one sentence. If you can't, ask the user which point matters most.
2. Split the text into ideas, one per beat. Aim for (target seconds ÷ 4.4) beats, plus an endcard.
3. For each idea find the **hero word**: the single word that carries the meaning (noun or verb, ≤ 14 characters, ideally ≤ 10).
   Everything before it becomes the `setup` (≤ 44 characters). Anything needed after it becomes the `tail`.
   *"Agents multiply the value of your judgment"* → setup *"They multiply the value of your"* / headline **JUDGMENT.**
4. Give each beat a `label`, a one-word role tag such as DIAGNOSIS, PROOF, STEP 1 or WARNING (≤ 22 characters).
5. Choose the beat shape: a number → `value`; 2–4 commands → `lines`; features → `items`; "not X but Y" → `before`/`after`;
   alternating emphasis → `parts`.
6. Keep the user's voice and claims. Tighten, don't embellish. If you change meaning, flag it.
7. Put the CTA in the last beat (`cta:`) and in front-matter `cta`. Write the post copy (social-distribution skill).

## Copy constraints (enforced by the build)
| Slot | Max chars (default design) | Notes |
|---|---|---|
| label | 24 | uppercase role tag |
| setup / tail | 44 | ≤ 2 lines; sentence case |
| headline | 14 | one line; uppercase; end sentences with "." |
| line (stack) | 26 | imperative, parallel grammar |
| item (list) | 32 | |
| value (stat) | 7 | "8", "3.5X", "$40K", "92%" |
| cta | 34 | "VERB // destination" |

Characters must exist in the brand fonts (the build warns `font.glyph`). Avoid → … “ ” emoji.

## Claims
List every factual claim in front matter `claims:`. `type: statistic` requires `source:`, or the build fails.
Testimonials need a named person and permission. Guarantees need legal approval. Rhetorical exaggeration
("8 hours a day") must read as rhetoric, not data.

## Checklist
- [ ] one idea per beat; every beat has a hero
- [ ] beat ids are unique (b01, b02, …) and match the choreography
- [ ] every slot is within its limit; no hero over 14 characters
- [ ] a CTA is present; claims are listed and sourced
- [ ] post copy is drafted
