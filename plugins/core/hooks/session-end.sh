#!/bin/bash
# SessionEnd — append a short summary to the day's log for continuity.
# The SessionStart hook reads this file back. Honors CLAUDE_CONFIG_DIR so
# separate personal/work configs keep separate logs.

set -u
LOG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sessions"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

{
  echo "=== Session ended $(date '+%H:%M:%S') | $(pwd) ==="
  if git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Branch: $(git branch --show-current 2>/dev/null)"
    CHANGED=$(git status --short 2>/dev/null)
    if [ -n "$CHANGED" ]; then
      echo "Uncommitted:"; printf '%s\n' "$CHANGED" | head -20
    else
      echo "Working tree clean."
    fi
    echo "Recent commits:"; git log --oneline -5 2>/dev/null
  fi
  echo
} >> "$LOG_FILE"
exit 0
