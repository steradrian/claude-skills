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

# The bar for a pattern here is: unrecoverable, or destroys something outside
# the working tree. Everyday git hygiene is NOT on this list — `rm -rf
# node_modules`, `git checkout -- file`, `git stash drop`, `git branch -D`,
# `git clean -fd` and `git reset --hard` are all normal, all recoverable from
# the remote or a reinstall, and prompting on them turns auto mode into a
# clicking exercise. Auto mode's own classifier still sees every one of them.
#
# name|regex (matched after the AT anchor)
PATTERNS=(
  # rm -rf aimed outside the project: /, ~, $HOME, a parent, or a bare glob.
  'rm -rf outside the project|rm[[:space:]]+(-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+)+(-[a-zA-Z]+[[:space:]]+)*(/[[:space:]]*$|/[a-z]|~|\$HOME|\.\./|\*)'
  'rm -rf $VAR (unresolvable target)|rm[[:space:]]+-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+.*\$\{?[A-Za-z_]'
  # History rewrites and ref deletion: not recoverable from a normal clone.
  'git reflog expire|git[[:space:]]+reflog[[:space:]]+expire'
  'git update-ref -d|git[[:space:]]+update-ref[[:space:]]+-d'
  'git filter-branch/filter-repo|git[[:space:]]+filter-(branch|repo)'
  'git push --force|git[[:space:]]+push([[:space:]]+[^[:space:]]+)*[[:space:]]+(--force(-with-lease)?|-f)([[:space:]]|$)'
  'git push --force|git[[:space:]]+push[[:space:]]+(--force(-with-lease)?|-f)'
  # Data stores: destroys state no reinstall brings back.
  'prisma reset|prisma[[:space:]]+(migrate[[:space:]]+reset|db[[:space:]]+push[[:space:]]+--force-reset)'
  'supabase db reset|supabase[[:space:]]+db[[:space:]]+reset'
  'docker volume prune|docker[[:space:]]+(system|volume)[[:space:]]+prune'
  # Infrastructure.
  'kubectl delete|kubectl[[:space:]]+delete'
  'terraform destroy|terraform[[:space:]]+destroy'
  'chmod -R 777|chmod[[:space:]]+-R[[:space:]]+777'
)
# Matched anywhere in the command, not at a command boundary: a redirect or a
# quoted SQL statement never sits at the start of a simple command.
UNANCHORED_PATTERNS=(
  'DROP DATABASE/SCHEMA|DROP[[:space:]]+(DATABASE|SCHEMA)'
  'DROP TABLE|DROP[[:space:]]+TABLE'
  'TRUNCATE|TRUNCATE[[:space:]]+TABLE'
  'writes to a shell rc or credentials file|>>?[[:space:]]*(~|\$HOME)/\.(zshrc|bashrc|zprofile|profile|npmrc|netrc|ssh/)'
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
for entry in "${UNANCHORED_PATTERNS[@]}"; do
  name="${entry%%|*}"; re="${entry#*|}"
  printf '%s' "$CMD" | grep -qiE "$re" && emit_ask "Destructive command ($name): $CMD"
done
exit 0
