#!/usr/bin/env bash
# Behavioural tests for the core plugin's hooks. Each case feeds the hook the
# stdin payload Claude Code sends and asserts on the exit code (2 = block,
# 0 = allow) or on the JSON it emits.
#
# The push guard is the one that matters: it exited 0 for every input for an
# unknown length of time because it read an env var the harness stopped
# setting. Every case below is a regression test for a real bypass.
#
# Usage: bench/hooks.sh [--quiet]

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
H="$ROOT/plugins/core/hooks"
QUIET=0; [ "${1:-}" = "--quiet" ] && QUIET=1
PASS=0; FAIL=0
say() { [ "$QUIET" = 1 ] || printf '%s\n' "$*"; }

# Two throwaway repos so branch-dependent cases are deterministic.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for name in on-main on-feature; do
  git init -q "$TMP/$name"; cd "$TMP/$name"
  git config user.email t@t; git config user.name t
  git commit -q --allow-empty -m init
  git branch -M main
  [ "$name" = on-feature ] && git checkout -q -b feature/x
done
MAIN="$TMP/on-main"; FEAT="$TMP/on-feature"

payload() { printf '{"tool_name":"Bash","tool_input":{"command":%s}}' "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")"; }

# push <cwd> <command> <expected-exit>
push() {
  local out rc
  out=$( (cd "$2" && payload "$3" | bash "$H/no-push-to-main.sh") 2>&1 ); rc=$?
  if [ "$rc" = "$4" ]; then PASS=$((PASS+1)); say "  ok   [$rc] $1"
  else FAIL=$((FAIL+1)); printf '  FAIL [%s want %s] %s\n' "$rc" "$4" "$1"; fi
}

say "no-push-to-main — must block (exit 2)"
push "explicit main"            "$FEAT" 'git push origin main' 2
push "explicit master"          "$FEAT" 'git push origin master' 2
push "HEAD:main refspec"        "$FEAT" 'git push -u origin HEAD:main' 2
push "refs/heads/main"          "$FEAT" 'git push origin refs/heads/main' 2
push "force-prefixed +main"     "$FEAT" 'git push origin +main' 2
push "src:dst to main"          "$FEAT" 'git push origin main:refs/heads/main' 2
push "delete main"              "$FEAT" 'git push origin :main' 2
push "chained cd then push"     "$FEAT" "cd $MAIN && git push" 2
push "git -C other repo"        "$FEAT" "git -C $MAIN push" 2
push "sh -c wrapper"            "$FEAT" 'sh -c "git push origin main"' 2
push "bash -lc with chain"      "$FEAT" 'bash -lc "cd /x && git push origin main"' 2
push "eval wrapper"             "$FEAT" "eval 'git push origin main'" 2
push "command builtin"          "$FEAT" 'command git push origin main' 2
push "absolute git path"        "$FEAT" '/usr/bin/git push origin main' 2
push "\$(which git)"            "$FEAT" '$(which git) push origin main' 2
push "env assignment prefix"    "$FEAT" 'GIT_DIR=/tmp/x git push origin main' 2
push "sudo + env prefix"        "$FEAT" 'FOO=1 sudo git push origin main' 2
push "--all broadcasts"         "$FEAT" 'git push origin --all' 2
push "--mirror broadcasts"      "$FEAT" 'git push --mirror origin' 2
push "variable refspec"         "$FEAT" 'BR=main; git push origin $BR' 2
push "bare push on main"        "$MAIN" 'git push' 2
push "push origin on main"      "$MAIN" 'git push origin' 2
push "push origin HEAD on main" "$MAIN" 'git push origin HEAD' 2
push "-u origin on main"        "$MAIN" 'git push -u origin' 2

say "no-push-to-main — must allow (exit 0)"
push "feature branch"           "$FEAT" 'git push origin feature/x' 0
push "branch named main-fix"    "$FEAT" 'git push origin main-fix' 0
push "dry-run to main"          "$FEAT" 'git push origin main --dry-run' 0
push "-n to main"               "$FEAT" 'git push -n origin main' 0
push "bare push off main"       "$FEAT" 'git push' 0
push "HEAD off main"            "$FEAT" 'git push origin HEAD' 0
push "HEAD:feature refspec"     "$FEAT" 'git push origin HEAD:feature/y' 0
push "quoted in echo"           "$FEAT" 'echo "git push origin main"' 0
push "quoted in grep"           "$FEAT" 'grep -r "git push origin main" docs/' 0
push "cd to own repo"           "$FEAT" "cd $FEAT && git push" 0
push "unrelated git command"    "$FEAT" 'git log main' 0
push "unrelated command"        "$FEAT" 'ls -la' 0

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
safety "rm -rf variable"    'rm -rf $TARGET'                      ask
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

say "guards fail closed"
# A PATH with no jq and no python3 must block, not wave the command through:
# that silent-allow is exactly how the guard failed before. /bin/bash and the
# shell builtins are still reachable; only the JSON parsers are missing.
NOBIN=$(mktemp -d)
for b in git sed grep tr cat dirname mktemp; do
  src=$(command -v "$b" 2>/dev/null) && ln -sf "$src" "$NOBIN/$b"
done
out=$( (cd "$FEAT" && payload 'git push origin main' | PATH="$NOBIN" /bin/bash "$H/no-push-to-main.sh") 2>&1 ); rc=$?
rm -rf "$NOBIN"
if [ "$rc" = 2 ]; then PASS=$((PASS+1)); say "  ok   [2] no jq/python3 -> blocks"
else FAIL=$((FAIL+1)); printf '  FAIL [%s want 2] no jq/python3 :: %s\n' "$rc" "$(printf '%s' "$out" | head -1)"; fi

out=$( (cd "$FEAT" && payload 'git push origin main' | LIBSH_BREAK=1 /bin/bash -c '
  d=$(mktemp -d); cp "$1" "$d/"; /bin/bash "$d/$(basename "$1")"' _ "$H/no-push-to-main.sh") 2>&1 ); rc=$?
if [ "$rc" = 2 ]; then PASS=$((PASS+1)); say "  ok   [2] lib.sh unloadable -> blocks"
else FAIL=$((FAIL+1)); printf '  FAIL [%s want 2] lib.sh unloadable\n' "$rc"; fi

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
