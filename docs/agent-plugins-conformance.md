# Agent Plugins 1.0 conformance review — `agent-plugin/`

Reviewed against <https://agent-plugins.org/specification> (v1.0.0). The automated checks are in `scripts/validate-plugins.mjs`
and run on every `./scripts/build.sh`.

## Layout (§4.2 standard layout vs ours)
```
spec example                         agent-plugin/ (built as build/agent-plugin/motion-graphics/)
my-plugin/                           motion-graphics/
├── plugin.json                      ├── plugin.json                    ✔ manifest at the root
├── skills/                          ├── skills/                        ✔ 9 skills, one level deep
│   └── summarize/                   │   ├── motion-graphics/
│       ├── SKILL.md                 │   │   ├── SKILL.md
│       ├── scripts/                 │   │   ├── scripts/init-workspace.mjs
│       └── references/              │   │   └── references/{workspace,chat-mode}.md
│                                    │   ├── remotion-engine/{SKILL.md, references/, assets/engine/}
│                                    │   └── design-md, content-md, choreography-md, motion-craft,
│                                    │       sound-design, motion-qa, social-distribution
├── mcp.json                         │   (none: the plugin needs no MCP server, and a missing location is not an error, §6.2)
├── com.example.client/              │   (none: no client-specific files; Claude-only parts live in claude-plugin/)
├── LICENSE                          ├── LICENSE                        ✔ MIT
└── CHANGELOG.md                     ├── CHANGELOG.md                   ✔
                                     └── README.md                      · extra file: allowed, ignored by clients
```

## Requirement checklist
| § | Requirement | Status |
|---|---|---|
| 4.1 | `plugin.json` at the plugin root | ✔ |
| 4.1 | all paths and links resolve inside the plugin root | ✔ 70 files, 0 links (checked by the validator) |
| 5.2 | `$schema` = `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` | ✔ |
| 5.2 | only `$schema, name, version, description, author, homepage, repository, license, keywords, extensions` | ✔ (no unknown fields) |
| 5.3/5.5 | `name` 1–64 chars, `[a-z0-9.-]`, alphanumeric ends, no `--`/`..` | ✔ `motion-graphics` |
| 5.4 | `author` only `name`/`email`/`url` | ✔ |
| 5.4/10.2 | `version` SemVer | ✔ `1.1.0` |
| 5.4 | `license` SPDX | ✔ `MIT` |
| 6.2 | missing `mcp.json` is not an error | ✔ |
| 7.1 | skills conform to the Agent Skills spec (`name` = folder name, lowercase-hyphen, description ≤ 1024 chars, optional `license`/`metadata` string map; `scripts/`, `references/`, `assets/` subfolders) | ✔ validator checks name/description/length; bodies < 500 lines |
| 7.1 | clients don't search deeper than `skills/<name>/SKILL.md` | ✔ no nested skills (the engine's templates are plain `.md`, not `SKILL.md`) |
| 7.2.1 | no inline MCP config in `plugin.json` | ✔ |
| 8 | client-specific files only under a reverse-domain namespace directory | ✔ none present; `.claude-plugin/` and `agents/` exist only in `claude-plugin/` |
| 9 | no secrets in the package | ✔ |

## Design notes (portable behaviour)
- **No writes into the plugin.** §9.1 gives clients a `PLUGIN_DATA` directory for dependencies, but only stdio MCP servers
  receive it, and skills have no portable way to read it. The engine therefore installs into the user's workspace
  (`.motion-graphics/.engine`), which every client with a shell can reach. The plugin folder stays read-only, so clients can
  cache, verify or replace it during updates.
- **Locating bundled files without `PLUGIN_ROOT`.** Skills reference their own files relative to the SKILL.md folder and list
  known install paths per client (Cursor `~/.cursor/plugins/local/…`, Claude Code `~/.claude/skills/…` / plugin cache,
  Codex `~/.codex/plugins/cache/…`), with a `find` fallback.
- **Client-specific text inside portable skills.** `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SESSION_ID}` appear only as labelled
  Claude Code hints. Other clients follow the generic instruction next to them.
- **Packaging.** The spec defines a *directory* as the package unit and no archive format. `build/dist/*.zip` is a
  convenience for clients that accept archives (Claude Code `--plugin-dir x.zip`, the Claude app upload screen). The zip
  holds the plugin directory's contents with `plugin.json` at its root.

## Client behaviour observed (Claude Code 2.1.311)
| Loaded with `--plugin-dir` | Claude Code shows |
|---|---|
| `build/claude-plugin/motion-graphics/` | `motion-graphics@inline`, version 1.1.0 (reads `.claude-plugin/plugin.json`) |
| `build/agent-plugin/motion-graphics/` | `motion-graphics@inline`, version "unknown": Claude Code ignores the root `plugin.json` and names the plugin after the folder, so the build names the folder after the plugin |
| `dist/motion-graphics-claude-plugin-1.1.0.zip` | `motion-graphics@inline`, version 1.1.0 |
| `dist/motion-graphics-agent-plugin-1.1.0.zip` | named after the zip file. Use the Claude zip or folder for Claude Code |
