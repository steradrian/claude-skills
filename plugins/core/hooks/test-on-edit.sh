#!/bin/bash
# PostToolUse(Edit|Write|MultiEdit) — run the tests related to an edited
# .ts/.tsx file. Runs in the background (asyncRewake): silent when there are
# no related tests or they pass; exit 2 with the failure summary wakes Claude.

set -u
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
read_hook_input
FILE=$(hook_field '.tool_input.file_path')
case "$FILE" in *.ts|*.tsx) ;; *) exit 0 ;; esac

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0
[ -f node_modules/.bin/vitest ] || exit 0

# `vitest related` resolves importers of the edited file, so editing a
# component runs its tests and editing a test runs that test. Exits 0 when
# nothing is related.
OUT=$($(pkg_exec) vitest related "$FILE" --run --reporter=dot --passWithNoTests 2>&1)
STATUS=$?
[ $STATUS -eq 0 ] && exit 0

{
  echo "[test-on-edit] Tests related to $FILE failed:"
  printf '%s\n' "$OUT" | grep -vE '^\s*$' | tail -25
} >&2
exit 2
