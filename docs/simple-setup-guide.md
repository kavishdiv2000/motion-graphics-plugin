
## Build both plugins

Run these from the repo root. On Windows, use **Git Bash**.
```bash
cd ~/OneDrive/Documents/GitHub/motion-graphics-plugin
bash scripts/build.sh            # sync + validate + package both into build/
bash scripts/build.sh --smoke    # same, plus test the built plugin in a throwaway project (needs internet for npm)
```
Re-run it after every change; `build/` is regenerated each time. `build/INSTALL.md` lists the same commands with your full paths.

## Claude Code
```bash
# one session only
claude --plugin-dir build/claude-plugin/motion-graphics
# or from the zip
claude --plugin-dir build/dist/motion-graphics-claude-plugin-1.1.0.zip

# every session, no marketplace (copies to ~/.claude/skills/motion-graphics)
bash scripts/install-local.sh claude
#   then, inside a running session:  /reload-plugins

# or through the local marketplace (inside Claude Code)
/plugin marketplace add ./build
/plugin install motion-graphics@motion-graphics-local

# check / remove
claude plugin list
bash scripts/install-local.sh uninstall claude
```
PowerShell alternative to the installer:
```powershell
Copy-Item -Recurse -Force build\claude-plugin\motion-graphics "$env:USERPROFILE\.claude\skills\motion-graphics"
```

## Claude desktop (and claude.ai)
There's no command for this; it's done in the app.
1. Settings → Plugins: remove the old **motion-graphics v1.0.0**.
2. **Upload a plugin** → pick `build\dist\motion-graphics-claude-plugin-1.1.0.zip` → Upload.

## Cursor
```bash
bash scripts/install-local.sh cursor        # copies to ~/.cursor/plugins/local/motion-graphics
bash scripts/install-local.sh uninstall cursor
```
PowerShell alternative:
```powershell
Copy-Item -Recurse -Force build\agent-plugin\motion-graphics "$env:USERPROFILE\.cursor\plugins\local\motion-graphics"
```
Then in Cursor: Ctrl+Shift+P → **Developer: Reload Window**.

## Codex (CLI and the ChatGPT desktop app)
```bash
codex plugin marketplace add ./build        # registers the local marketplace in build/
codex plugin marketplace list               # check it's there
```
Then install **motion-graphics** from the plugin list in Codex or the ChatGPT desktop app, and restart it. Some Codex CLI versions also accept `codex plugins install ./build/agent-plugin/motion-graphics`. When you rebuild, run `codex plugin marketplace upgrade` and restart.

## GitHub Copilot, VS Code and Kiro
I haven't verified exact commands for these. They support the Agent Plugins format, and installing is done in each tool's UI:
- **Plugin support:** use the client's "install plugin from folder" option and point it at `build/agent-plugin/motion-graphics`.
- **Skills only:** if the client supports skills but not plugins, copy the skills into the project:
  ```powershell
  Copy-Item -Recurse build\agent-plugin\motion-graphics\skills\* .agents\skills\
  ```
  Use the skills folder the client's docs specify if it's different.

## Test in any of them
Open a project folder and ask: **"Set up motion graphics here and run the demo."** You should get a `.motion-graphics/` folder in that project and a contact sheet at `.motion-graphics/sessions/demo-signal-ops/build/contact-vertical.png`.

The same test without any agent:
```bash
node build/agent-plugin/motion-graphics/skills/motion-graphics/scripts/init-workspace.mjs /path/to/project
node /path/to/project/.motion-graphics/mg.mjs demo
```