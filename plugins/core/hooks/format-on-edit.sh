#!/bin/bash
# PostToolUse hook — run Prettier on edited files to maintain consistent formatting.
# Only fires if Prettier is installed in the project. Produces zero output on success.

FILE=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c \
  'import sys,json; d=json.load(sys.stdin); print(d.get("file_path",""))' \
  2>/dev/null)

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json)
    if [ -f "node_modules/.bin/prettier" ]; then
      timeout 5 node_modules/.bin/prettier --write "$FILE" 2>/dev/null
    fi
    ;;
esac
