#!/bin/bash
# PreToolUse(Bash) — turn destructive commands into a permission prompt.
# Emits hookSpecificOutput.permissionDecision = "ask" so the user confirms,
# even in auto mode. Never blocks outright; never prints to stdout otherwise.

set -u
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
read_hook_input
CMD=$(hook_field '.tool_input.command')
[ -n "$CMD" ] || exit 0

PATTERNS=(
  'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f'
  'rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f'
  'git[[:space:]]+checkout[[:space:]]+--[[:space:]]'
  'git[[:space:]]+restore[[:space:]]+(--worktree|-W|\.)'
  'git[[:space:]]+branch[[:space:]]+-D'
  'git[[:space:]]+push.*--force(-with-lease)?'
  'git[[:space:]]+push.*[[:space:]]-f\b'
  'DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)'
  'TRUNCATE[[:space:]]+TABLE'
  'prisma[[:space:]]+(migrate[[:space:]]+reset|db[[:space:]]+push[[:space:]]+--force-reset)'
  'supabase[[:space:]]+db[[:space:]]+reset'
  'docker[[:space:]]+(system|volume)[[:space:]]+prune'
  'chmod[[:space:]]+-R[[:space:]]+777'
)

for pattern in "${PATTERNS[@]}"; do
  if printf '%s' "$CMD" | grep -qiE "$pattern"; then
    reason="Destructive pattern '$pattern' in: $CMD"
    if command -v jq >/dev/null 2>&1; then
      jq -cn --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
    else
      printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}\n' \
        "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
    fi
    exit 0
  fi
done
exit 0
