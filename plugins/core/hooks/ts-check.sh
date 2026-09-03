#!/bin/bash
# PostToolUse(Edit|Write|MultiEdit) — typecheck after a .ts/.tsx edit.
# Runs in the background (asyncRewake in hooks.json): silent on success,
# exit 2 with the first errors on stderr wakes Claude with them.
# Debounced (latest edit wins) and serialized per project so concurrent
# runs never race on tsbuildinfo. Skips non-TypeScript files and projects
# without a tsconfig.

set -u
source "${BASH_SOURCE[0]%/*}/lib.sh" || exit 0
read_hook_input
FILE=$(hook_field '.tool_input.file_path')
case "$FILE" in *.ts|*.tsx) ;; *) exit 0 ;; esac

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0
[ -f tsconfig.json ] || exit 0

STATE=$(hook_state_dir "$ROOT")
debounce_and_lock "$STATE" ts-check 2 || exit 0

# Prefer the project's own typecheck script so flags match CI.
if [ -f package.json ] && grep -q '"typecheck"' package.json; then
  RUN="$(pkg_run) typecheck"
else
  RUN="$(pkg_exec) tsc --noEmit --pretty false"
fi

OUT=$($RUN 2>&1); STATUS=$?
ERRORS=$(printf '%s\n' "$OUT" | grep -E 'error TS[0-9]+' | head -12)

if [ -n "$ERRORS" ]; then
  {
    echo "[ts-check] TypeScript errors after editing $FILE:"
    printf '%s\n' "$ERRORS"
    echo "Fix these before continuing."
  } >&2
  exit 2
fi
if [ "$STATUS" -ne 0 ]; then
  {
    echo "[ts-check] '$RUN' exited $STATUS without TypeScript errors (tooling problem, not a type error):"
    printf '%s\n' "$OUT" | tail -8
  } >&2
  exit 2
fi
exit 0
