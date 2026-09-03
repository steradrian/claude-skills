#!/usr/bin/env bash
# Static conformance checks for the marketplace. Every check that fails prints
# FAIL lines and contributes to a non-zero exit. These are the sweeps that were
# run by hand during the 2026-09 audit; running them here stops the same class
# of defect coming back.
#
# Usage: bench/conformance.sh [--quiet]

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
QUIET=0; [ "${1:-}" = "--quiet" ] && QUIET=1
FAILURES=0
say() { [ "$QUIET" = 1 ] || printf '%s\n' "$*"; }
fail() { printf 'FAIL  %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
pass() { say "ok    $*"; }

PLUGINS=(plugins/core plugins/website-audit)

# 1. Manifests parse and the marketplace validates.
for f in .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json plugins/*/hooks/hooks.json; do
  [ -e "$f" ] || continue
  python3 -m json.tool "$f" >/dev/null 2>&1 || fail "invalid JSON: $f"
done
[ $FAILURES -eq 0 ] && pass "manifests parse"

# 2. Every plugin listed in the marketplace exists on disk, and vice versa.
listed=$(python3 -c "
import json;d=json.load(open('.claude-plugin/marketplace.json'))
print('\n'.join(p['source'].lstrip('./') for p in d['plugins']))")
for p in $listed; do
  [ -f "$p/.claude-plugin/plugin.json" ] || fail "marketplace lists $p but it has no plugin.json"
done
for p in "${PLUGINS[@]}"; do
  printf '%s\n' "$listed" | grep -qx "$p" || fail "$p exists but is not listed in marketplace.json"
done
pass "marketplace and plugin dirs agree"

# 3. Skill frontmatter: name matches dir, description present, argument-hint
#    iff the body uses $ARGUMENTS.
for p in "${PLUGINS[@]}"; do
  for d in "$p"/skills/*/; do
    [ -d "$d" ] || continue
    n=$(basename "$d"); f="$d/SKILL.md"
    [ -f "$f" ] || { fail "$d has no SKILL.md"; continue; }
    head -1 "$f" | grep -q '^---' || { fail "$n: no frontmatter"; continue; }
    fm=$(sed -n '2,/^---/p' "$f")
    grep -q "^name: $n\$" <<<"$fm" || fail "$n: frontmatter name does not match directory"
    grep -q '^description:' <<<"$fm" || fail "$n: no description"
    if grep -q '\$ARGUMENTS' "$f"; then
      grep -q '^argument-hint:' <<<"$fm" || fail "$n: uses \$ARGUMENTS with no argument-hint"
    else
      grep -q '^argument-hint:' <<<"$fm" && fail "$n: declares argument-hint but never reads \$ARGUMENTS"
    fi
  done
done
pass "skill frontmatter"

# 4. Agent frontmatter: name, description, model and an explicit tool list.
for p in "${PLUGINS[@]}"; do
  for f in "$p"/agents/*.md; do
    [ -f "$f" ] || continue
    fm=$(sed -n '2,/^---/p' "$f"); a=$(basename "$f" .md)
    for k in name description model tools; do
      grep -q "^$k:" <<<"$fm" || fail "agent $a: missing $k"
    done
  done
done
pass "agent frontmatter"

# 5. Read-only agents must say so in prose, not only in their tool list.
for f in plugins/core/agents/*.md; do
  fm=$(sed -n '2,/^---/p' "$f")
  tools=$(grep '^tools:' <<<"$fm")
  case "$tools" in *Edit*|*Write*) continue ;; esac
  grep -qi 'read-only' "$f" || fail "agent $(basename "$f" .md): no Edit/Write but no read-only statement"
done
pass "read-only agents declare it"

# 6. Every core: reference resolves to a real skill or agent.
refs=$(grep -rhoE '(^|[^a-zA-Z/])(/?)core:[a-z0-9-]+' plugins --include='*.md' \
       | grep -oE 'core:[a-z0-9-]+' | sed 's/core://' | sort -u)
for r in $refs; do
  [ -d "plugins/core/skills/$r" ] || [ -f "plugins/core/agents/$r.md" ] \
    || fail "reference core:$r resolves to nothing"
done
pass "core: references resolve"

# 7. No unprefixed slash invocations of plugin skills.
bad=$(grep -rnE '(^|[^:/a-z`\-])/(build|review|edge-bash|bug-bash|manual-test|repro-bug|explore|panel-review|fix-after-review|fix-pr-thread|resolve-pr-comments|create-pr|debug-investigate|architect|dead-code|lighthouse-audit|spec-from-prototype|write-changelog|design-to-code|api-contract)\b' \
      plugins --include='*.md' || true)
[ -n "$bad" ] && { printf '%s\n' "$bad" | head -5; fail "unprefixed slash invocations (see above)"; }
[ -z "$bad" ] && pass "no unprefixed slash invocations"

# 8. Every ${CLAUDE_PLUGIN_ROOT}/… path exists in some plugin.
for r in $(grep -rhoE '\$\{CLAUDE_PLUGIN_ROOT\}/[A-Za-z0-9_./-]+' plugins --include='*.md' | sort -u); do
  rel="${r#\$\{CLAUDE_PLUGIN_ROOT\}/}"; found=0
  for p in "${PLUGINS[@]}"; do [ -e "$p/$rel" ] && found=1; done
  [ "$found" = 0 ] && fail "dangling plugin-root path: $r"
done
pass "plugin-root paths resolve"

# 9. No machine-specific paths, no employer references, no removed components.
leak=$(grep -rn -iE '/Users/[a-z]+|purposeinplay|wildcasino|TASKS-[0-9]' plugins README.md \
       --include='*.md' --include='*.json' --include='*.sh' | grep -v 'setup-claude' || true)
[ -n "$leak" ] && { printf '%s\n' "$leak" | head -5; fail "machine-specific or employer references"; }
[ -z "$leak" ] && pass "no machine-specific or employer references"

dead=$(grep -rnE '\b(build-arch|build-max|build-finish|smoke-test|qa-cycle|create-checkin|cz-commit|storybook-writer|performance-auditor|root-cause-reviewer|devil-advocate|qa-strategist|ScheduleWakeup)\b' \
       plugins README.md --include='*.md' --include='*.json' \
       | grep -vE 'build --(arch|max|finish)|manual-test --matrix|as the QA strategist' || true)
[ -n "$dead" ] && { printf '%s\n' "$dead" | head -5; fail "references to removed components"; }
[ -z "$dead" ] && pass "no references to removed components"

# 10. Hook scripts are syntactically valid and executable.
for s in plugins/core/hooks/*.sh; do
  bash -n "$s" 2>/dev/null || fail "hook syntax error: $s"
  [ -x "$s" ] || fail "hook not executable: $s"
done
pass "hook scripts valid"

# 11. Every hook command referenced in hooks.json exists.
for cmd in $(python3 -c "
import json,re
d=json.load(open('plugins/core/hooks/hooks.json'))
for ev in d['hooks'].values():
    for m in ev:
        for h in m['hooks']:
            print(h['command'].split()[-1])"); do
  p="${cmd/\$\{CLAUDE_PLUGIN_ROOT\}/plugins/core}"
  [ -f "$p" ] || fail "hooks.json points at missing script: $cmd"
done
pass "hooks.json scripts exist"

# 12. Trigger-phrase collisions: two components claiming the same quoted phrase.
python3 - <<'PY'
import re, glob, collections, sys
phrases = collections.defaultdict(list)
for f in glob.glob('plugins/*/skills/*/SKILL.md') + glob.glob('plugins/*/agents/*.md'):
    txt = open(f, encoding='utf-8').read()
    m = re.search(r'^---\n(.*?)\n---', txt, re.S)
    if not m: continue
    d = re.search(r'^description:(.*?)(?=\n[a-z-]+:|\Z)', m.group(1), re.S | re.M)
    if not d: continue
    for q in re.findall(r'"([^"]{8,60})"', d.group(1)):
        phrases[q.lower().strip()].append(f)
bad = {p: fs for p, fs in phrases.items() if len(set(fs)) > 1}
for p, fs in sorted(bad.items()):
    print(f'FAIL  trigger phrase "{p}" claimed by: {", ".join(sorted(set(fs)))}')
sys.exit(1 if bad else 0)
PY
[ $? -ne 0 ] && FAILURES=$((FAILURES + 1)) || pass "no trigger-phrase collisions"

say ""
if [ "$FAILURES" -eq 0 ]; then
  say "conformance: PASS"
  exit 0
fi
printf 'conformance: %d FAILURE(S)\n' "$FAILURES"
exit 1
