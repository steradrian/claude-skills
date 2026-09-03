#!/bin/bash
# PreToolUse(Bash) — block any `git push` that would land on main / master.
# Exit 2 aborts the tool call and shows stderr to Claude. Everything else exits 0.
#
# Token-based, not a regex over the raw string, so it handles:
#   explicit targets   git push origin main | -u origin HEAD:main | origin +main |
#                      origin refs/heads/main | origin main:refs/heads/main | origin :main
#   implicit targets   git push | git push origin | git push origin HEAD  (when HEAD is main)
#   wrappers           VAR=x git push … | command git push … | /usr/bin/git push … |
#                      $(which git) push … | sh -c "git push origin main" | eval '…' |
#                      git -C <dir> push … (branch check runs in <dir>) | chained a && b
#   allowed            --dry-run, any named non-main branch (main-fix, feature/x),
#                      and `git push …` merely quoted inside a non-shell command (echo, grep)
# There is deliberately no Claude-side bypass; the user pushes main themselves.

set -u
# Shell-native dirname: this guard must not depend on coreutils being on PATH.
source "${BASH_SOURCE[0]%/*}/lib.sh" || {
  echo "[no-push-to-main] cannot load lib.sh; refusing to let the command through unchecked." >&2
  exit 2
}
read_hook_input
require_parser_or_block no-push-to-main
CMD=$(hook_field '.tool_input.command')
[ -n "$CMD" ] || exit 0
printf '%s' "$CMD" | grep -q 'push' || exit 0

block() {
  cat >&2 <<EOF
[no-push-to-main] BLOCKED: $1
  command: $CMD
  Pushes to main/master are reserved for the user. Push a feature branch and open a PR, or ask the user to run it.
EOF
  exit 2
}

# Strip wrappers that do not change what runs. Returns the bare command.
unwrap() {
  printf '%s' "$1" | sed -E '
    s/^[[:space:]]+//
    s/^([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)+//
    s/^(command|exec|sudo|nohup|time|env)[[:space:]]+//
    s/^([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)+//
    s/^\$\((which|command -v)[[:space:]]+git\)/git/
    s/^`(which|command -v)[[:space:]]+git`/git/
    s#^[^[:space:]]*/git([[:space:]])#git\1#
  '
}

# A shell invoker runs its argument as code: sh -c "...", bash -lc '...', eval '...'.
# Anything else (echo, grep, printf) does not, so a quoted `git push` there is text.
unquote_shell_arg() {
  printf '%s' "$1" | sed -E '
    s/^(sh|bash|zsh|dash|ksh)[[:space:]]+-[A-Za-z]*c[[:space:]]+//
    s/^eval[[:space:]]+//
    s/^["'"'"'`]//
    s/["'"'"'`][[:space:]]*$//
  '
}

check_one() {
  local part; part=$(unwrap "$1")

  case "$part" in
    sh\ -*c\ *|bash\ -*c\ *|zsh\ -*c\ *|dash\ -*c\ *|ksh\ -*c\ *|eval\ *)
      # Re-enter on the code the shell would run; it may itself be chained.
      local inner; inner=$(unquote_shell_arg "$part")
      local sub
      # shellcheck disable=SC2001
      printf '%s\n' "$inner" | tr ';&|\n' '\n\n\n\n' | while IFS= read -r sub; do
        check_one "$sub" || exit $?
      done
      return $?
      ;;
  esac

  printf '%s' "$part" | grep -qE '^git([[:space:]]+-(C|c)[[:space:]]+[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)' || return 0

  # Pull out -C <dir> for the implicit-branch check, then drop everything up to `push`.
  local cdir args dry=0 remote="" t r dst dir current
  cdir=$(printf '%s' "$part" | sed -nE 's/^git.*-C[[:space:]]+([^[:space:]]+).*[[:space:]]push([[:space:]]|$).*/\1/p')
  args=$(printf '%s' "$part" | sed -E 's/^git.*[[:space:]]push([[:space:]]+|$)//; s/["'"'"'`)]//g')

  local -a refspecs=()
  set -f                     # no globbing while we word-split
  for t in $args; do
    case "$t" in
      --dry-run|-n) dry=1 ;;
      -*) ;;                 # other flags (-u, --force, --set-upstream=…)
      *) if [ -z "$remote" ]; then remote="$t"; else refspecs+=("$t"); fi ;;
    esac
  done
  set +f
  [ "$dry" = 1 ] && return 0

  if [ "${#refspecs[@]}" -eq 0 ] || { [ "${#refspecs[@]}" -eq 1 ] && [ "${refspecs[0]}" = "HEAD" ]; }; then
    dir="${cdir:-.}"
    dir="${dir/#\~/$HOME}"
    current=$(git -C "$dir" symbolic-ref --short HEAD 2>/dev/null || echo "")
    case "$current" in
      main|master) block "'$part' from branch '$current' would push to $current" ;;
    esac
    return 0
  fi

  for r in "${refspecs[@]}"; do
    r="${r#+}"
    dst="${r##*:}"                                           # right side of src:dst
    [ "$r" != "${r%:*}" ] && [ -z "$dst" ] && dst="${r%:*}"  # `:main` deletes main
    dst="${dst#refs/heads/}"
    case "$dst" in
      main|master) block "refspec '$r' targets $dst" ;;
    esac
  done
  return 0
}

printf '%s\n' "$CMD" | tr ';&|\n' '\n\n\n\n' | while IFS= read -r part; do
  check_one "$part" || exit $?
done
exit $?
