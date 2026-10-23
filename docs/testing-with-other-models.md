# Testing with other models

Goal: show that a non-Opus model, following these skills, produces videos as good as Opus does.

## Protocol
1. **Same inputs for every model.** Use `jobs/demo` (the full reference reel) and two fresh briefs:
   - *Free-text brief*: "Make a 20 s reel from: 'Most agencies lose 30% of margin to handoffs. Automate the handoffs, not the people. Book an audit: example.com/audit'" (note: the 30% statistic has no source, and a good run flags it).
   - *Structured brief*: a CONTENT.md with 6 beats and no choreography.
2. **Same plugin and same design**: `brand/DESIGN.md` = Signal Ops; fresh `motion-studio/` per model.
3. **Run unattended or with scripted answers** (format vertical, 20 s, awareness, steady) so the runs are comparable.
4. **Collect** for each run: the CONTENT.md and CHOREOGRAPHY.md written, `report.md`, the contact sheet, the MP4, `qa.json`,
   the number of tool calls, and the tokens used.

## Scoring
| Metric | How |
|---|---|
| Pipeline completion | reached a QA PASS without human help? (yes/no) |
| Validation discipline | the build errors it hit and fixed in markdown (not code) |
| Visual quality | motion-qa rubric /22, scored by a blind reviewer (human or `motion-qa-critic` on a different model) |
| Copy quality | do the heroes alone tell the argument? (0–2) · claims handled? (0–2) |
| Efficiency | tool calls, tokens, wall-clock |
Run each model 3 times per brief, because variance matters as much as the mean.

## What to expect and where models fail
- **Common failures without the skills**: writing animation code from scratch, centred text, an accent on every scene,
  random timings, no sound sync, no look-before-render. The skills and validator remove these by construction.
- **Residual weak spots in smaller models**: choosing the hero word (copywriting.md rules help), honest critique of their own
  contact sheet (use the independent critic), and the restraint to leave the hook white.
- If a model writes React instead of markdown, it skipped the orchestrator. Make sure `motion-graphics/SKILL.md` is loaded first.

## Minimal context pack for models without plugin support
Paste in this order: the README section "The three inputs: full reference", `motion-graphics/SKILL.md`,
`motion-craft/SKILL.md`, then the per-step skill when the model reaches that step. Paste the command output and the
contact-sheet image back as the model requests them.
