#!/bin/bash
# SessionStart(startup|resume) — print repo state and the day's session log.
# stdout from a SessionStart hook is added to Claude's context, so keep it short.

set -u
if git rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH=$(git branch --show-current 2>/dev/null)
  AHEAD=$(git status -sb 2>/dev/null | head -1 | sed -nE 's/.*\[(.*)\].*/\1/p')
  DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
  echo "[session-start] branch ${BRANCH:-detached}${AHEAD:+ ($AHEAD)}, $DIRTY uncommitted path(s)"
fi

LOG_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/session-logs/$(date +%Y-%m-%d).log"
if [ -f "$LOG_FILE" ]; then
  echo "[session-start] earlier today:"
  tail -12 "$LOG_FILE"
fi
exit 0
