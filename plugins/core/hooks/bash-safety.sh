#!/bin/bash
# PreToolUse hook — surface a warning when a Bash command contains destructive patterns.
# Does NOT block execution (exit 0). Outputs to stdout so Claude sees it in context
# and can confirm with the user or reconsider before proceeding.

CMD=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c \
  'import sys,json; d=json.load(sys.stdin); print(d.get("command",""))' \
  2>/dev/null)

PATTERNS=(
  "rm -rf"
  "git reset --hard"
  "git clean -f"
  "git checkout -- "
  "git branch -D"
  "DROP TABLE"
  "DROP DATABASE"
  "truncate table"
)

for PATTERN in "${PATTERNS[@]}"; do
  if echo "$CMD" | grep -qi "$PATTERN"; then
    echo "[safety] Destructive pattern detected: '$PATTERN' — confirm this is intentional."
    break
  fi
done
