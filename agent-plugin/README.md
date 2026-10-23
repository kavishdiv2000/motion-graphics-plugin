# motion-graphics — Agent Plugin (Agent Plugins 1.0)

Portable package for Codex/ChatGPT, Cursor, GitHub Copilot, VS Code, Kiro and any Agent-Skills client.
Skills only (no client-specific components), per https://agent-plugins.org/specification.

| Skill | Role |
|---|---|
| `motion-graphics` | **entry point**: orchestrates the 10-step pipeline |
| `design-md` | create/extract/validate the static brand DESIGN.md |
| `content-md` | collect and normalise the per-video copy |
| `choreography-md` | derive/validate the per-video scene plan |
| `motion-craft` | motion-director knowledge: timing, easing, hierarchy, rhythm, retention |
| `remotion-engine` | the bundled Remotion engine (`assets/engine`) and how to run/extend it |
| `sound-design` | 50 procedural SFX, music beds, mixing, loudness |
| `motion-qa` | technical checks + 22-point visual rubric + fix map |
| `social-distribution` | platform specs, post copy, funnel mapping |

Start by asking your agent: *"Make a motion-graphics reel from this text: …"*. Install steps: see the repository README.
