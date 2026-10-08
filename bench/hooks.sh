#!/usr/bin/env bash
# Behavioural tests for the core plugin's hooks. Each case feeds the hook the
# stdin payload Claude Code sends and asserts on the exit code (2 = block,
# 0 = allow) or on the JSON it emits.
#
# Usage: bench/hooks.sh [--quiet]

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
H="$ROOT/plugins/core/hooks"
QUIET=0; [ "${1:-}" = "--quiet" ] && QUIET=1
PASS=0; FAIL=0
say() { [ "$QUIET" = 1 ] || printf '%s\n' "$*"; }

payload() { printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")"; }

# safety <label> <command> <ask|allow>
safety() {
  local out
  out=$(payload "$2" | bash "$H/bash-safety.sh" 2>/dev/null)
  local got=allow; [ -n "$out" ] && got=ask
  if [ "$got" = "$3" ]; then PASS=$((PASS+1)); say "  ok   [$got] $1"
  else FAIL=$((FAIL+1)); printf '  FAIL [%s want %s] %s\n' "$got" "$3" "$1"; fi
}

# Policy (deliberate, 2026-09-03): prompt only for the unrecoverable, or for
# damage outside the working tree. Everyday git hygiene and rebuildable
# artifacts do NOT prompt — they are recoverable from the remote or a
# reinstall, and prompting on them turned auto mode into a clicking exercise.
# Auto mode's own classifier still sees every one of these.
say "bash-safety — must prompt"
safety "rm -rf /"           'rm -rf /'                            ask
safety "rm -rf home"        'rm -rf ~/projects'                   ask
safety "rm -rf \$HOME"      'rm -rf $HOME/x'                      ask
safety "rm -rf parent"      'rm -rf ../..'                        ask
safety "push --force"       'git push origin x --force'           ask
safety "force-with-lease"   'git push --force-with-lease origin x' ask
safety "reflog expire"      'git reflog expire --all'             ask
safety "filter-repo"        'git filter-repo --path x'            ask
safety "update-ref -d"      'git update-ref -d refs/heads/x'      ask
safety "kubectl delete"     'kubectl delete pod x'                ask
safety "terraform destroy"  'terraform destroy'                   ask
safety "supabase db reset"  'supabase db reset'                   ask
safety "prisma reset"       'prisma migrate reset'                ask
safety "docker volume prune" 'docker volume prune'                ask
safety "drop database"      'psql -c "DROP DATABASE app"'         ask
safety "drop table"         'psql -c "drop table users"'          ask
safety "chmod -R 777"       'chmod -R 777 /'                      ask
safety "append to zshrc"    'echo export X=1 >> ~/.zshrc'         ask

say "bash-safety — must stay silent (everyday work)"
safety "rm rebuildable dir"  'rm -rf node_modules'                allow
safety "rm build output"     'rm -rf .next'                       allow
safety "rm -rf variable"     'rm -rf $TARGET'                     allow
safety "rm temp file"        'rm -f /tmp/x.log'                   allow
safety "rm single file"      'rm scratch.txt'                     allow
safety "discard one file"    'git checkout -- src/a.ts'           allow
safety "restore worktree"    'git restore .'                      allow
safety "reset --hard"        'git reset --hard origin/main'       allow
safety "clean -fd"           'git clean -fd'                      allow
safety "stash drop"          'git stash drop'                     allow
safety "branch -D"           'git branch -D feature/x'            allow
safety "safe branch delete"  'git branch -d feature/x'            allow
safety "find -delete local"  'find . -name "*.log" -delete'       allow
safety "docker image prune"  'docker image prune'                 allow
safety "grep -rf"            'grep -rf patterns.txt src/'         allow
safety "quoted rm in echo"   'echo "rm -rf /" >> notes.md'        allow
safety "restore --staged"    'git restore --staged src/a.ts'      allow
safety "checkout -b"         'git checkout -b feat/x'             allow
safety "plain ls"            'ls -la'                             allow
safety "install"             'pnpm install'                       allow

say "post-edit hooks skip non-TypeScript"
for hook in ts-check test-on-edit; do
  for f in notes.md types.d.ts; do
    printf '{"tool_input":{"file_path":"/tmp/%s"}}' "$f" | bash "$H/$hook.sh" >/dev/null 2>&1
    rc=$?
    if [ "$rc" = 0 ]; then PASS=$((PASS+1)); say "  ok   [$rc] $hook skips $f"
    else FAIL=$((FAIL+1)); printf '  FAIL [%s want 0] %s on %s\n' "$rc" "$hook" "$f"; fi
  done
done

say ""
printf 'hooks: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
