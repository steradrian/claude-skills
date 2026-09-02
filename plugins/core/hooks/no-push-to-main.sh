#!/bin/bash
# PreToolUse hook — BLOCK any `git push` that targets main / master.
# Exits 2 (= "abort tool call") with an explanation. Allows everything
# else (feature-branch pushes, bare `git push` from a non-main branch).
#
# Two cases blocked:
#   1. EXPLICIT — command string contains both `git push` and any of
#      `main` / `master` (e.g. `git push origin main`, `git push -u
#      origin main:main`). Case-insensitive match.
#   2. IMPLICIT — bare `git push` (or `git push origin`) when the
#      current branch is main / master. Check via `git symbolic-ref
#      --short HEAD` from the harness's cwd.
#
# To push to main, the user does it themselves in their terminal —
# this guard intentionally has no Claude-side bypass.

set -u

CMD=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c \
  'import sys,json; d=json.load(sys.stdin); print(d.get("command",""))' \
  2>/dev/null)

# Quick exit: not a git push at all. Anchor to start-of-command or
# a shell separator so `echo "git push ..."` doesn't get caught as
# a false positive.
if ! echo "$CMD" | grep -qE '(^|;|&&|\|\||\|)[[:space:]]*git[[:space:]]+push\b'; then
  exit 0
fi

# Skip if push has --dry-run anywhere — safe by definition.
if echo "$CMD" | grep -qE '\-\-dry-run\b'; then
  exit 0
fi

# Case 1 — explicit main/master target. Match either as a separate
# word or as the right-hand side of `branch:main` / `HEAD:main`.
# Tolerates surrounding flags / refspecs.
if echo "$CMD" | grep -qiE '(^|;|&&|\|\||\|)[[:space:]]*git[[:space:]]+push[^|;&]*(\b(main|master)\b|:[[:space:]]*(main|master)\b)'; then
  cat >&2 <<EOF
[no-push-to-main] BLOCKED: this command would push to main/master.
  command: $CMD
  Pushes to main are reserved for the user. If you want this push,
  run it yourself in your terminal — Claude is not allowed to do it.
EOF
  exit 2
fi

# Case 2 — implicit push (no branch arg) from a main/master HEAD.
# Patterns: `git push`, `git push origin`, `git push -u origin`.
if echo "$CMD" | grep -qE '(^|;|&&|\|\||\|)[[:space:]]*git[[:space:]]+push([[:space:]]+-u)?([[:space:]]+origin)?[[:space:]]*(;|&|\|\||$)'; then
  CURRENT=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
  if [ "$CURRENT" = "main" ] || [ "$CURRENT" = "master" ]; then
    cat >&2 <<EOF
[no-push-to-main] BLOCKED: bare 'git push' from branch '$CURRENT'.
  command: $CMD
  Pushes to main are reserved for the user. Switch off main first
  (or push from an explicit feature branch) — Claude is not allowed
  to push directly to main / master.
EOF
    exit 2
  fi
fi

exit 0
