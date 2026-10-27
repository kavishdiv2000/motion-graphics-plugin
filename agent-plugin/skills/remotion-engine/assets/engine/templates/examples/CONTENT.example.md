---
# CONTENT.md — DYNAMIC, one per video. WHAT we say. The words, the claim, the audience
# and the call to action. Choreography decides HOW and WHEN; DESIGN decides the LOOK.
schema: motion-content/1.0
id: agents-leverage-manifesto
campaign: DFA — Q4 awareness
audience: Founders and operators of 5-50 person teams who are busy but not leveraged
pain: Days disappear into execution work that an agent could do
promise: Agents multiply the value of your judgment
objective: awareness
platforms: [reels, tiktok, shorts, linkedin_feed]
language: en-GB
tone: terse, declarative, confident
cta:
  text: ENGAGE // damnfineagents.com
  url: https://damnfineagents.com
  type: visit                        # visit | follow | comment_keyword | book_call | download
claims:
  - text: Most people spend 8 hours a day on work an agent could do in minutes
    type: rhetorical                 # rhetorical | statistic | testimonial | guarantee
    source: null                     # REQUIRED when type is statistic
---

# Content: Agents are leverage

## Core message
You don't need more hours. You need leverage. Agents don't replace your thinking;
they multiply the value of your judgment. Become the architect of your own workflow.

## Beats
Each beat is one idea. Keep within the character limits from DESIGN.md:
label ≤ 22, setup ≤ 40, headline ≤ 14, tail ≤ 44, line ≤ 26.

```yaml
id: b01
label: DIAGNOSIS
setup: You don't need more
headline: HOURS.
```

```yaml
id: b02
label: CORRECTION
setup: You need
headline: LEVERAGE.
```

```yaml
id: b03
label: OBSERVATION
parts:
  - { role: setup,    text: Most people spend }
  - { role: line,     text: 8 HOURS A DAY }
  - { role: setup,    text: on work an agent could do in }
  - { role: headline, text: MINUTES., accent: true }
```

```yaml
id: b04
label: CONSEQUENCE
setup: Then wonder why they can't
headline: THINK.
tail: about what matters.
```

```yaml
id: b05
label: PRINCIPLE
parts:
  - { role: headline, text: AGENTS }
  - { role: setup,    text: "don't replace your thinking." }
  - { role: setup,    text: They multiply the value of your }
  - { role: headline, text: JUDGMENT., accent: true }
```

```yaml
id: b06
label: PROTOCOL
lines:
  - SYSTEMIZE THE ROUTINE.
  - DELEGATE THE EXECUTION.
  - OWN THE VISION.
```

```yaml
id: b07
label: DIRECTIVE
logo: true
setup: Become the
headline: ARCHITECT
tail: of your own workflow.
cta: ENGAGE // damnfineagents.com
```

## Post copy
**Caption:** You don't need more hours. You need leverage. Agents multiply the value of your judgment — become the architect of your own workflow.
**First comment:** Comment "ARCHITECT" and we'll send you the 3-step delegation map.
**Hashtags:** #AIagents #founders #productivity #automation
