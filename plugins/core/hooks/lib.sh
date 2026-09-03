#!/bin/bash
# Shared helpers for the core plugin hooks. Hooks receive one JSON object on
# stdin (session_id, cwd, hook_event_name, tool_name, tool_input, ...).
# Source this file, then call read_hook_input once and use the getters.

HOOK_INPUT=""
HOOK_PARSER=""

read_hook_input() {
  HOOK_INPUT=$(cat)
  if command -v jq >/dev/null 2>&1; then HOOK_PARSER=jq
  elif command -v python3 >/dev/null 2>&1; then HOOK_PARSER=python3
  else HOOK_PARSER=""
  fi
}

# Guards must never fail open silently. Call from PreToolUse hooks after
# read_hook_input: exits 2 with an explanation when no JSON parser exists.
require_parser_or_block() {
  [ -n "$HOOK_PARSER" ] && return 0
  echo "[$1] neither jq nor python3 is available, so this guard cannot inspect the command. Install jq or python3, or run the command yourself." >&2
  exit 2
}

# hook_field <jq-path>  e.g. hook_field '.tool_input.command'
hook_field() {
  case "$HOOK_PARSER" in
    jq) printf '%s' "$HOOK_INPUT" | jq -r "$1 // empty" 2>/dev/null ;;
    python3)
      printf '%s' "$HOOK_INPUT" | python3 -c '
import sys, json
path = sys.argv[1].strip(".").split(".")
try:
    d = json.load(sys.stdin)
    for p in path:
        d = d.get(p, "") if isinstance(d, dict) else ""
    print(d if isinstance(d, str) else "")
except Exception:
    print("")
' "$1" 2>/dev/null ;;
    *) printf '' ;;
  esac
}

# Detect the package runner for the current project from its lockfile.
pkg_exec() {
  if [ -f pnpm-lock.yaml ]; then echo "pnpm exec"
  elif [ -f yarn.lock ]; then echo "yarn"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bunx"
  else echo "npx --no-install"
  fi
}

pkg_run() {
  if [ -f pnpm-lock.yaml ]; then echo "pnpm run"
  elif [ -f yarn.lock ]; then echo "yarn run"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bun run"
  else echo "npm run"
  fi
}

# Per-project scratch dir for locks and debounce stamps.
hook_state_dir() {
  local key
  key=$(printf '%s' "$1" | cksum | cut -d' ' -f1)
  local dir="${TMPDIR:-/tmp}/claude-core-hooks/$key"
  mkdir -p "$dir"
  echo "$dir"
}

# debounce_and_lock <state-dir> <name> <settle-seconds>
# Latest edit wins: a newer invocation of the same hook supersedes this one.
# Then serialize on a mkdir lock so two runs never race on build caches.
# Returns 1 when superseded (caller exits 0 quietly).
debounce_and_lock() {
  local dir="$1" name="$2" settle="${3:-2}"
  local stamp="$dir/$name.latest" lock="$dir/$name.lock"
  echo "$$" > "$stamp"
  sleep "$settle"
  [ "$(cat "$stamp" 2>/dev/null)" = "$$" ] || return 1
  local waited=0
  while ! mkdir "$lock" 2>/dev/null; do
    # Reap a lock older than 5 minutes (crashed run).
    if [ -d "$lock" ] && [ "$(( $(date +%s) - $(stat -f %m "$lock" 2>/dev/null || stat -c %Y "$lock" 2>/dev/null || echo 0) ))" -gt 300 ]; then
      rm -rf "$lock"; continue
    fi
    sleep 1; waited=$((waited + 1))
    [ "$(cat "$stamp" 2>/dev/null)" = "$$" ] || return 1
    [ "$waited" -gt 170 ] && return 1
  done
  HOOK_LOCK="$lock"
  trap 'rm -rf "$HOOK_LOCK"' EXIT
  return 0
}
