#!/bin/bash
# Shared helpers for the core plugin hooks. Hooks receive one JSON object on
# stdin (session_id, cwd, hook_event_name, tool_name, tool_input, ...).
# Source this file, then call read_hook_input once and use the getters.

HOOK_INPUT=""

read_hook_input() {
  HOOK_INPUT=$(cat)
}

# hook_field <jq-path>  e.g. hook_field '.tool_input.command'
hook_field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$HOOK_INPUT" | jq -r "$1 // empty" 2>/dev/null
  else
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
' "$1" 2>/dev/null
  fi
}

# Detect the package runner for the current project from its lockfile.
pkg_exec() {
  if [ -f pnpm-lock.yaml ]; then echo "pnpm exec"
  elif [ -f yarn.lock ]; then echo "yarn"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bunx"
  else echo "npx --no-install"
  fi
}
