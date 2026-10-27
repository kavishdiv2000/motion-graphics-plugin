---
# ============================================================================
# CONTENT.md TEMPLATE — motion-content/1.0
# DYNAMIC: one per video, saved at .motion-graphics/sessions/<id>/CONTENT.md (or kept in the chat in chat mode).
# WHAT we say. The user may supply this file, paste
# free text, or answer questions; the agent always normalises it into beats.
#   # ASK: question for the user if the field is missing
# ============================================================================
schema: motion-content/1.0
id: my-video                          # set automatically to the session id by `mg session new`
campaign: null                        # ASK (optional): Campaign / series name?
audience: null                        # ASK: Who is this for? (role + situation, e.g. "agency owners stuck doing delivery")
pain: null                            # ASK: What problem or tension do they feel?
promise: null                         # ASK: What do you want them to believe after watching?
objective: awareness                  # awareness · engagement · lead_gen · conversion · retention
platforms: [reels, tiktok]
language: en-GB
tone: null                            # default = DESIGN brand.voice
cta:
  text: null                          # ASK: What should they do at the end? (on-screen, ≤ 34 chars, e.g. "BOOK A CALL // site.com")
  url: null
  type: visit                         # visit | follow | comment_keyword | book_call | download
claims:                               # every factual claim shown on screen
  - text: null
    type: rhetorical                  # rhetorical | statistic | testimonial | guarantee
    source: null                      # REQUIRED for statistic — the build fails without it
---

# Content: <title>

## Raw content
<!-- Optional. Paste notes, a post, a script or bullet points here. The agent turns this
     into beats below and shows the user the result before rendering. Delete when done. -->

## Core message
<!-- One to three sentences. If you can't say it in one breath, the video will be muddy. -->

## Beats
<!-- One ```yaml block per idea, in story order. Slots by template:
     statement : label, setup, headline, tail
     title     : label, headline, tail
     stack     : label, lines: [..2-4 short lines..]
     stat      : label, setup, value ("8", "3.5x", "$40k", "92%"), tail
     list      : label, setup, items: [..2-5 items..]
     compare   : label, before, after, tail
     sequence  : label, parts: [{role: setup|line|headline|tail, text, accent?}]
     endcard   : logo: true, label, setup, headline, tail, cta
   Character limits (default DESIGN): label 24 · setup 44 · headline 14 · tail 44 · line 26 · item 32 · cta 34 -->

```yaml
id: b01
label: THE PROBLEM
setup: Most teams don't need more
headline: TOOLS.
```

```yaml
id: b02
label: WHY
setup: They need fewer
headline: HANDOFFS.
tail: Every handoff leaks time.
```

```yaml
id: b03
label: REFRAME
before: Hire another coordinator
after: AUTOMATE IT.
```

```yaml
id: b04
label: PROOF
setup: Teams that automate handoffs ship
value: 3x
tail: more per sprint.
```

```yaml
id: b05
label: NEXT STEP
logo: true
setup: Start with one
headline: WORKFLOW.
cta: BOOK A CALL // mybrand.com
```

## Post copy
**Caption:**
**First comment:**
**Hashtags:**
