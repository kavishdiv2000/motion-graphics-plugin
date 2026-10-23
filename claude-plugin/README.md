# motion-graphics — Claude Code plugin

`claude --plugin-dir ./claude-plugin`, or install through the repository marketplace (see the root README).

- `/motion-graphics:make-video [job-id] [CONTENT.md] [CHOREOGRAPHY.md]`: the full pipeline, interactive
- `/motion-graphics:setup-design [url | video | DESIGN.md]`: the brand's static DESIGN.md
- `/motion-graphics:batch-videos [--limit N] [--formats …]`: unattended queue processing for scheduled tasks, `claude -p` and CI
- agents: `motion-graphics:choreographer` (story/pacing), `motion-graphics:motion-qa-critic` (independent review)
- skills: motion-graphics, design-md, content-md, choreography-md, motion-craft, remotion-engine, sound-design, motion-qa, social-distribution

Shared skills are mirrored from `../agent-plugin/skills` by `scripts/sync-plugins.mjs`; edit them there.
