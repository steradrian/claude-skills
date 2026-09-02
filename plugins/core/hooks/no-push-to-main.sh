#!/bin/bash
# PreToolUse(Bash) — block any `git push` that would land on main / master.
# Exit 2 aborts the tool call and shows stderr to Claude. Everything else exits 0.
#
# Blocked:
#   1. Explicit target: `git push origin main`, `git push -u origin main:main`,
#      `git push origin HEAD:main`.
#   2. Implicit target while HEAD is main/master: bare `git push`,
#      `git push origin`, `git push -u origin`, `git push origin HEAD`.
# `git -C <dir> push` and chained commands are handled. `--dry-run` is allowed.
# There is deliberately no Claude-side bypass; the user pushes main themselves.

set -u
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
read_hook_input
CMD=$(hook_field '.tool_input.command')
[ -n "$CMD" ] || exit 0

# Split on shell separators and inspect each simple command.
printf '%s\n' "$CMD" | tr ';&|' '\n\n\n' | while IFS= read -r part; do
  # Normalise: strip leading whitespace, drop `git -C <dir>` / `git -c k=v` prefixes.
  part=$(printf '%s' "$part" | sed -E 's/^[[:space:]]+//; s/^git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+|-c[[:space:]]+[^[:space:]]+[[:space:]]+)+/git /')
  printf '%s' "$part" | grep -qE '^git[[:space:]]+push\b' || continue
  printf '%s' "$part" | grep -qE -- '--dry-run\b' && continue

  # Case 1: explicit main/master anywhere after `push` (as a word or as a refspec target).
  if printf '%s' "$part" | grep -qiE '^git[[:space:]]+push.*(\b(main|master)\b|:[[:space:]]*(main|master)\b)'; then
    cat >&2 <<EOF
[no-push-to-main] BLOCKED: this command would push to main/master.
  command: $part
  Pushes to main are reserved for the user. Ask them to run it, or push a feature branch and open a PR.
EOF
    exit 2
  fi

  # Case 2: no branch named, so the target is the current branch.
  # Strip flags and the remote; if nothing or only HEAD remains, it is implicit.
  rest=$(printf '%s' "$part" | sed -E 's/^git[[:space:]]+push//; s/[[:space:]]+-[-[:alnum:]=]+//g; s/^[[:space:]]+//; s/^[[:alnum:]_.-]+//; s/^[[:space:]]+//')
  if [ -z "$rest" ] || [ "$rest" = "HEAD" ]; then
    current=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
    if [ "$current" = "main" ] || [ "$current" = "master" ]; then
      cat >&2 <<EOF
[no-push-to-main] BLOCKED: '$part' from branch '$current' would push to $current.
  Switch to a feature branch first and open a PR. Claude may not push main/master.
EOF
      exit 2
    fi
  fi
done
# `while` runs in a subshell; propagate its exit code.
exit $?
