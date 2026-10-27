#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Install the locally built plugin into a client's local plugin folder — no marketplace.
# Run ./scripts/build.sh first.
#
#   ./scripts/install-local.sh cursor      → ~/.cursor/plugins/local/<name>        (Agent Plugins 1.0 build)
#   ./scripts/install-local.sh claude      → ~/.claude/skills/<name>               (Claude Code plugin build; loads every session)
#   ./scripts/install-local.sh all
#   ./scripts/install-local.sh uninstall cursor|claude|all
#
# Copies (never symlinks: Cursor ignores symlinks that point outside its local folder).
# Re-running replaces the previous copy. Windows: run from Git Bash; ~ is your user profile.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
[ -d "$BUILD" ] || { echo "✖ no build/ — run ./scripts/build.sh first" >&2; exit 1; }
NAME="$(node -p "require('$BUILD/agent-plugin/' + require('fs').readdirSync('$BUILD/agent-plugin')[0] + '/plugin.json').name")"
HOME_DIR="${USERPROFILE:-$HOME}"; HOME_DIR="$(command -v cygpath >/dev/null 2>&1 && cygpath -u "$HOME_DIR" || echo "$HOME_DIR")"

CURSOR_DST="$HOME_DIR/.cursor/plugins/local/$NAME"
CLAUDE_DST="$HOME_DIR/.claude/skills/$NAME"

copy() { rm -rf "$2"; mkdir -p "$2"; (cd "$1" && tar -cf - .) | (cd "$2" && tar -xf -); }

install_cursor() {
  copy "$BUILD/agent-plugin/$NAME" "$CURSOR_DST"
  echo "✔ Cursor: $CURSOR_DST"
  echo "  → in Cursor run 'Developer: Reload Window'. Enterprise teams: an admin must allow local plugin imports."
}
install_claude() {
  copy "$BUILD/claude-plugin/$NAME" "$CLAUDE_DST"
  echo "✔ Claude Code: $CLAUDE_DST  (loads as $NAME@skills-dir in every session)"
  echo "  → in a running session: /reload-plugins   ·   check: claude plugin list"
}
uninstall() {
  case "$1" in
    cursor) rm -rf "$CURSOR_DST" && echo "✔ removed $CURSOR_DST" ;;
    claude) rm -rf "$CLAUDE_DST" && echo "✔ removed $CLAUDE_DST" ;;
    all) uninstall cursor; uninstall claude ;;
    *) echo "usage: $0 uninstall cursor|claude|all" >&2; exit 2 ;;
  esac
}

case "${1:-}" in
  cursor) install_cursor ;;
  claude) install_claude ;;
  all) install_cursor; install_claude ;;
  uninstall) uninstall "${2:-}" ;;
  *) sed -n '2,13p' "$0"; exit 2 ;;
esac
