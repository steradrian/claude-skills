#!/bin/bash
# Stop hook — append a session summary to a daily log for continuity across sessions.
# Claude reads <config dir>/sessions/YYYY-MM-DD.log at session start to catch up on context.
# Honors CLAUDE_CONFIG_DIR so separate personal/work configs keep separate logs.

LOG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/sessions"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

{
  echo "=== Session ended: $(date '+%H:%M:%S') | pwd: $(pwd) ==="

  if git rev-parse --git-dir &>/dev/null 2>&1; then
    BRANCH=$(git branch --show-current 2>/dev/null)
    echo "Branch: $BRANCH"

    CHANGED=$(git status --short 2>/dev/null)
    if [ -n "$CHANGED" ]; then
      echo "Uncommitted changes:"
      echo "$CHANGED" | head -20
    else
      echo "Working tree clean."
    fi

    echo "Recent commits:"
    git log --oneline -5 2>/dev/null
  fi

  echo ""
} >> "$LOG_FILE"

# macOS notification — fires when Claude finishes a task and hands back control
PROJECT=$(basename "$(pwd)")
osascript -e "display notification \"Ready in $PROJECT\" with title \"Claude Code\" sound name \"Submarine\"" 2>/dev/null || true
