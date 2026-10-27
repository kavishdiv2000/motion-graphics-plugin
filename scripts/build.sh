#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Build installable packages of both plugins into ./build — no marketplace publishing needed.
#
#   ./scripts/build.sh            sync + validate + package
#   ./scripts/build.sh --smoke    …and smoke-test: bootstrap a throw-away workspace from the built
#                                 agent plugin and validate the demo session (needs network for npm, ~30 s)
#   ./scripts/build.sh --no-sync  package the plugins exactly as they are (skip scripts/sync-plugins.mjs)
#
# Output
#   build/
#   ├─ agent-plugin/motion-graphics/        Agent Plugins 1.0 directory  (Cursor, Copilot, VS Code, Kiro, Codex, Claude Code)
#   ├─ claude-plugin/motion-graphics/       Claude Code plugin directory (.claude-plugin/plugin.json + agents + Claude-only skills)
#   ├─ .claude-plugin/marketplace.json      local Claude Code marketplace  → ./claude-plugin/motion-graphics
#   ├─ .agents/plugins/marketplace.json     local Codex/ChatGPT marketplace → ./agent-plugin/motion-graphics
#   ├─ dist/motion-graphics-agent-plugin-<v>.zip    plugin.json at the zip root
#   ├─ dist/motion-graphics-claude-plugin-<v>.zip   .claude-plugin/plugin.json at the zip root (Claude app "Upload a plugin", claude --plugin-dir x.zip)
#   ├─ dist/SHA256SUMS
#   └─ INSTALL.md                           per-client install commands with this machine's absolute paths
#
# Requirements: bash, node ≥ 18, tar; for zips one of: zip | bsdtar (macOS tar, Windows tar.exe) | python3.
# Works on macOS, Linux and Windows (Git Bash / WSL).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
SMOKE=0; SYNC=1
for a in "$@"; do
  case "$a" in
    --smoke) SMOKE=1 ;;
    --no-sync) SYNC=0 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

say()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m▲ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node not found (install Node 20+ from nodejs.org)"
command -v tar  >/dev/null || die "tar not found"

NAME="$(node -p "require('$ROOT/agent-plugin/plugin.json').name")"
VERSION="$(node -p "require('$ROOT/agent-plugin/plugin.json').version")"
CVERSION="$(node -p "require('$ROOT/claude-plugin/.claude-plugin/plugin.json').version")"
[ "$VERSION" = "$CVERSION" ] || die "version mismatch: agent-plugin $VERSION vs claude-plugin $CVERSION (bump both)"

# Generated / heavy paths that never belong in a package
EXCLUDES=(--exclude=node_modules --exclude=.stage --exclude=sfx-library --exclude=.motion-graphics --exclude=.DS_Store --exclude='*.log')

copy_tree() { # copy_tree <src-dir> <dst-dir>   (contents of src → dst, minus EXCLUDES)
  mkdir -p "$2"
  (cd "$1" && tar -cf - "${EXCLUDES[@]}" .) | (cd "$2" && tar -xf -)
}

find_bsdtar() {
  for t in bsdtar tar /c/Windows/System32/tar.exe /mnt/c/Windows/System32/tar.exe; do
    if command -v "$t" >/dev/null 2>&1 && "$t" --version 2>/dev/null | grep -qi bsdtar; then echo "$t"; return 0; fi
  done
  return 1
}

make_zip() { # make_zip <src-dir> <out.zip>   (zip the CONTENTS of src-dir, dotfiles included)
  local src="$1" out="$2"
  rm -f "$out"
  if command -v zip >/dev/null 2>&1; then
    (cd "$src" && zip -qrX "$out" .)
  elif BSDTAR="$(find_bsdtar)"; then
    (cd "$src" && "$BSDTAR" -a -cf "$out" .)
  elif PY="$(command -v python3 || command -v python || true)" && [ -n "$PY" ]; then
    "$PY" - "$src" "$out" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, src).replace(os.sep, '/'))
PY
  else
    die "no zip tool found: install zip, or python3 (Windows: run from Git Bash so C:\\Windows\\System32\\tar.exe is used)"
  fi
}

zip_has() { # zip_has <zip> <entry>
  node -e '
    const b = require("fs").readFileSync(process.argv[1]); const want = process.argv[2];
    // scan central directory file names (signature 0x02014b50)
    let found = false;
    for (let i = 0; i < b.length - 46; i++) if (b.readUInt32LE(i) === 0x02014b50) {
      const n = b.readUInt16LE(i + 28); const name = b.toString("utf8", i + 46, i + 46 + n).replace(/^\.\//, "");
      if (name === want) { found = true; break; }
    }
    process.exit(found ? 0 : 1);' "$1" "$2"
}

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

# ── 1. sync + validate the sources ───────────────────────────────────────────
if [ "$SYNC" = 1 ]; then say "sync shared skills (agent-plugin → claude-plugin)"; node "$ROOT/scripts/sync-plugins.mjs"; fi
node "$ROOT/scripts/sync-plugins.mjs" --check >/dev/null || die "plugins out of sync — run without --no-sync"

# ── 2. stage plugin directories named after the plugin ──────────────────────
# Clients that ignore manifests name a local plugin after its folder (e.g. Claude Code --plugin-dir), so the folder is "$NAME".
say "stage $NAME $VERSION into build/"
rm -rf "$BUILD"
AP="$BUILD/agent-plugin/$NAME"; CP="$BUILD/claude-plugin/$NAME"
copy_tree "$ROOT/agent-plugin"  "$AP"
copy_tree "$ROOT/claude-plugin" "$CP"
[ -f "$AP/plugin.json" ] || die "staged agent plugin has no plugin.json"
[ -f "$CP/.claude-plugin/plugin.json" ] || die "staged claude plugin has no .claude-plugin/plugin.json"
if find "$AP" "$CP" -name node_modules -o -name .stage | grep -q .; then die "generated folders leaked into the build"; fi

say "validate staged packages"
AGENT_PLUGIN_DIR="$AP" CLAUDE_PLUGIN_DIR="$CP" node "$ROOT/scripts/validate-plugins.mjs"

# ── 3. local marketplaces (install by name without publishing anything) ─────
mkdir -p "$BUILD/.claude-plugin" "$BUILD/.agents/plugins"
DESC="$(node -p "require('$AP/plugin.json').description.split('.')[0]")"
AUTHOR="$(node -p "require('$AP/plugin.json').author?.name || 'unknown'")"
cat > "$BUILD/.claude-plugin/marketplace.json" <<JSON
{
  "name": "$NAME-local",
  "owner": { "name": "$AUTHOR" },
  "metadata": { "description": "Local build of $NAME $VERSION (not published)" },
  "plugins": [
    { "name": "$NAME", "source": "./claude-plugin/$NAME", "version": "$VERSION", "description": "$DESC" }
  ]
}
JSON
cat > "$BUILD/.agents/plugins/marketplace.json" <<JSON
{
  "name": "$NAME-local",
  "plugins": [
    {
      "name": "$NAME",
      "source": { "source": "local", "path": "./agent-plugin/$NAME" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
JSON

# ── 4. zip archives ─────────────────────────────────────────────────────────
say "zip archives"
mkdir -p "$BUILD/dist"
AZ="$BUILD/dist/$NAME-agent-plugin-$VERSION.zip"; CZ="$BUILD/dist/$NAME-claude-plugin-$VERSION.zip"
make_zip "$AP" "$AZ"
make_zip "$CP" "$CZ"
zip_has "$AZ" "plugin.json" || die "$AZ: plugin.json is not at the zip root"
zip_has "$CZ" ".claude-plugin/plugin.json" || die "$CZ: .claude-plugin/plugin.json is not at the zip root"
(cd "$BUILD/dist" && sha256 ./*.zip > SHA256SUMS)
ok "$(basename "$AZ") ($(du -h "$AZ" | cut -f1))"
ok "$(basename "$CZ") ($(du -h "$CZ" | cut -f1))"

# ── 5. optional client-side validation ──────────────────────────────────────
if command -v claude >/dev/null 2>&1 && claude plugin validate --help >/dev/null 2>&1; then
  say "claude plugin validate"
  claude plugin validate "$CP" --strict >/dev/null && ok "claude-plugin directory" || die "claude plugin validate failed for $CP"
  claude plugin validate "$BUILD" >/dev/null && ok "local marketplace (build/.claude-plugin/marketplace.json)" || die "marketplace validation failed"
else
  warn "Claude Code CLI with 'plugin validate' not found — skipped (install Claude Code to add this check)"
fi

# ── 6. optional smoke test ──────────────────────────────────────────────────
if [ "$SMOKE" = 1 ]; then
  say "smoke test: bootstrap a workspace from the BUILT agent plugin"
  WS="$BUILD/.smoke-workspace"; rm -rf "$WS"; mkdir -p "$WS"
  node "$AP/skills/motion-graphics/scripts/init-workspace.mjs" "$WS"
  node "$WS/.motion-graphics/mg.mjs" demo
  node "$WS/.motion-graphics/mg.mjs" validate demo >/dev/null && ok "demo session validates in a fresh workspace"
  [ -z "$(find "$AP" -name node_modules -o -name .motion-graphics | head -1)" ] || die "the smoke test wrote into the plugin folder"
  rm -rf "$WS"
fi

# ── 7. INSTALL.md with this machine's paths ─────────────────────────────────
NATIVE() { # print a path the way the user's shell/tools expect it
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi
}
cat > "$BUILD/INSTALL.md" <<MD
# Install $NAME $VERSION locally (no marketplace publishing)

Built $(date -u +%Y-%m-%dT%H:%MZ). Paths below are absolute for this machine.

| Package | Path |
|---|---|
| Agent Plugins 1.0 directory | \`$(NATIVE "$AP")\` |
| Claude Code plugin directory | \`$(NATIVE "$CP")\` |
| Agent plugin zip | \`$(NATIVE "$AZ")\` |
| Claude plugin zip | \`$(NATIVE "$CZ")\` |
| Local marketplace root (Claude Code + Codex) | \`$(NATIVE "$BUILD")\` |

## Claude Code
- One session: \`claude --plugin-dir "$(NATIVE "$CP")"\` (or the zip: \`claude --plugin-dir "$(NATIVE "$CZ")"\`)
- Every session, no marketplace: \`./scripts/install-local.sh claude\` (copies to ~/.claude/skills/$NAME), then \`/reload-plugins\`
- Via the local marketplace: \`/plugin marketplace add "$(NATIVE "$BUILD")"\` then \`/plugin install $NAME@$NAME-local\`
- Portable variant instead: \`claude --plugin-dir "$(NATIVE "$AP")"\` (skills only, no Claude agents/commands)

## Claude app (claude.ai / desktop)
Settings → Plugins → Upload a plugin → \`$(NATIVE "$CZ")\`

## Cursor
\`./scripts/install-local.sh cursor\` (copies to ~/.cursor/plugins/local/$NAME), then **Developer: Reload Window**.

## Codex / ChatGPT desktop
\`codex plugin marketplace add "$(NATIVE "$BUILD")"\` → install "$NAME" from the plugin list → restart the app.

## GitHub Copilot · VS Code · Kiro · other Agent Plugins clients
Install from folder: \`$(NATIVE "$AP")\` (or the agent plugin zip where a client accepts archives).
MD

ok "build complete → $(NATIVE "$BUILD")"
echo "   next: cat build/INSTALL.md   ·   ./scripts/install-local.sh cursor|claude"
