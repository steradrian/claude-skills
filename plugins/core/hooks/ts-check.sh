#!/bin/bash
# PostToolUse hook — surface TypeScript errors after file edits.
#
# Fires only when:
#   1. The edited file is a .ts or .tsx file
#   2. A tsconfig.json exists in the project root
#
# Produces zero output when there are no errors (no context pollution).
# Uses --incremental to avoid cold-starting the compiler on every edit.

FILE=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c \
  'import sys,json; d=json.load(sys.stdin); print(d.get("file_path",""))' \
  2>/dev/null)

case "$FILE" in
  *.ts|*.tsx)
    if [ -f tsconfig.json ]; then
      TSC="node_modules/.bin/tsc"
      [ -f "$TSC" ] || TSC="npx --no-install tsc"
      (timeout 10 $TSC --noEmit --incremental 2>&1 || true) | grep "error TS" | head -10
    fi
    ;;
esac
