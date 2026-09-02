#!/bin/bash
# PostToolUse hook — run co-located test file after editing a .ts/.tsx file.
# Only fires if a test file exists alongside the edited file or in __tests__/.
# Produces zero output when no test file is found (no context pollution).

FILE=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c \
  'import sys,json; d=json.load(sys.stdin); print(d.get("file_path",""))' \
  2>/dev/null)

case "$FILE" in
  *.ts|*.tsx)
    BASENAME=$(basename "$FILE")
    BASENAME="${BASENAME%.tsx}"
    BASENAME="${BASENAME%.ts}"
    DIR=$(dirname "$FILE")

    TEST=""
    for CANDIDATE in \
      "${DIR}/${BASENAME}.test.ts" \
      "${DIR}/${BASENAME}.test.tsx" \
      "${DIR}/__tests__/${BASENAME}.test.ts" \
      "${DIR}/__tests__/${BASENAME}.test.tsx" \
      "${DIR}/${BASENAME}.spec.ts" \
      "${DIR}/${BASENAME}.spec.tsx"
    do
      if [ -f "$CANDIDATE" ]; then
        TEST="$CANDIDATE"
        break
      fi
    done

    if [ -n "$TEST" ]; then
      VITEST="node_modules/.bin/vitest"
      [ -f "$VITEST" ] || VITEST="npx --no-install vitest"
      (timeout 10 $VITEST run "$TEST" --reporter=dot 2>&1 || true) | tail -8
    fi
    ;;
esac
