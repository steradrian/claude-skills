#!/bin/bash
# SessionStart — print repo state and the day's session log. stdout from a
# SessionStart hook is added to Claude's context, so keep it short.

set -u
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[session-start] $(git status -sb 2>/dev/null | head -1)"
  DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
  [ "$DIRTY" != "0" ] && echo "[session-start] $DIRTY uncommitted paths (git status --short for the list)"
fi

LOG_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sessions/$(date +%Y-%m-%d).log"
if [ -f "$LOG_FILE" ]; then
  echo "[session-start] earlier today (from $LOG_FILE):"
  tail -12 "$LOG_FILE"
fi
exit 0
