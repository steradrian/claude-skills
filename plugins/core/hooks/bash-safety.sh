#!/bin/bash
# PreToolUse(Bash) — turn destructive commands into a permission prompt.
# Emits hookSpecificOutput.permissionDecision = "ask" so the user confirms,
# even in auto mode. Never blocks outright; silent otherwise.
# Patterns are anchored at command position (start, after ; & | or sudo), so
# `echo "git reset --hard"` and `grep -rf` do not trigger. Git patterns are
# case-sensitive (`git branch -d` is the safe delete; `-D` is not).

set -u
source "${BASH_SOURCE[0]%/*}/lib.sh" || {
  echo "[bash-safety] cannot load lib.sh; refusing to let the command through unchecked." >&2
  exit 2
}
read_hook_input
require_parser_or_block bash-safety
CMD=$(hook_field '.tool_input.command')
[ -n "$CMD" ] || exit 0

AT='(^|[;&|][[:space:]]*|\$\([[:space:]]*|sudo[[:space:]]+|command[[:space:]]+)'

# name|regex (regex is matched after the AT anchor)
PATTERNS=(
  'rm -r/-f|rm[[:space:]]+(-[a-zA-Z]*[rRf][a-zA-Z]*[[:space:]]+)+'
  'find -delete|find[[:space:]].*[[:space:]]-delete'
  'git reset --hard|git[[:space:]]+reset[[:space:]]+--hard'
  'git clean -f|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f'
  'git checkout -- <path>|git[[:space:]]+checkout[[:space:]]+--[[:space:]]'
  'git restore --worktree|git[[:space:]]+restore[[:space:]]+(--worktree|-W|--staged[[:space:]]+--worktree|\.)'
  'git branch -D|git[[:space:]]+branch[[:space:]]+(-D|--delete[[:space:]]+--force|-[a-zA-Z]*D)'
  'git stash drop/clear|git[[:space:]]+stash[[:space:]]+(drop|clear)'
  'git reflog expire|git[[:space:]]+reflog[[:space:]]+expire'
  'git update-ref -d|git[[:space:]]+update-ref[[:space:]]+-d'
  'git push --force|git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+(--force(-with-lease)?|-f)([[:space:]]|$)'
  'git push --force|git[[:space:]]+push[[:space:]]+(--force(-with-lease)?|-f)'
  'prisma reset|prisma[[:space:]]+(migrate[[:space:]]+reset|db[[:space:]]+push[[:space:]]+--force-reset)'
  'supabase db reset|supabase[[:space:]]+db[[:space:]]+reset'
  'docker prune|docker[[:space:]]+(system|volume|image|container)[[:space:]]+prune'
  'kubectl delete|kubectl[[:space:]]+delete'
  'terraform destroy|terraform[[:space:]]+destroy'
  'chmod -R 777|chmod[[:space:]]+-R[[:space:]]+777'
)
SQL_PATTERNS=(
  'DROP TABLE/DATABASE|DROP[[:space:]]+(TABLE|DATABASE|SCHEMA)'
  'TRUNCATE|TRUNCATE[[:space:]]+TABLE'
)

emit_ask() {
  local reason="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -cn --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  else
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}\n' \
      "$(printf '%s' "$reason" | sed 's/"/\\"/g')"
  fi
  exit 0
}

for entry in "${PATTERNS[@]}"; do
  name="${entry%%|*}"; re="${entry#*|}"
  printf '%s' "$CMD" | grep -qE "${AT}${re}" && emit_ask "Destructive command ($name): $CMD"
done
for entry in "${SQL_PATTERNS[@]}"; do
  name="${entry%%|*}"; re="${entry#*|}"
  # SQL is case-insensitive and usually inside a quoted string, so no anchor.
  printf '%s' "$CMD" | grep -qiE "$re" && emit_ask "Destructive SQL ($name): $CMD"
done
exit 0
