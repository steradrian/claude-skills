#!/bin/bash
# PostToolUse(Edit|Write|MultiEdit) — typecheck after a .ts/.tsx edit.
# Runs in the background (asyncRewake in hooks.json): silent on success,
# exit 2 with the first errors on stderr wakes Claude with them.
# Skips when the file is not TypeScript or the project has no tsconfig.

set -u
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
read_hook_input
FILE=$(hook_field '.tool_input.file_path')
case "$FILE" in *.ts|*.tsx) ;; *) exit 0 ;; esac

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0
[ -f tsconfig.json ] || exit 0

# Prefer the project's own typecheck script so flags match CI.
if [ -f package.json ] && grep -q '"typecheck"' package.json; then
  RUN="$(pkg_exec | sed 's/ exec$/ run/; s/^npx --no-install$/npm run/; s/^bunx$/bun run/') typecheck"
else
  RUN="$(pkg_exec) tsc --noEmit --pretty false"
fi

OUT=$($RUN 2>&1)
ERRORS=$(printf '%s\n' "$OUT" | grep -E 'error TS[0-9]+' | head -12)
[ -z "$ERRORS" ] && exit 0

{
  echo "[ts-check] TypeScript errors after editing $FILE:"
  printf '%s\n' "$ERRORS"
  echo "Fix these before continuing."
} >&2
exit 2
