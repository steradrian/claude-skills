#!/usr/bin/env bash
# Context-cost budget. `claude plugin details` reports the always-on token cost
# a plugin adds to EVERY session — the descriptions of every skill and agent,
# whether or not any of them is used. That number is invisible unless measured,
# and it is the easiest thing to regress: one verbose description at a time.
#
# Baseline is recorded in bench/baseline.json. The check fails when the cost
# rises above the budget, and tells you to re-baseline when it drops.
#
# Usage: bench/budget.sh [--update]   (--update rewrites the baseline)

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE="bench/baseline.json"

measure() {
  local out
  out=$(claude plugin details "$1" 2>&1) || return 1
  printf '%s' "$out" | sed -nE 's/.*Always-on:[[:space:]]*~?([0-9,]+) tok.*/\1/p' | tr -d ','
}

CORE=$(measure core@adrian)
if [ -z "${CORE:-}" ]; then
  echo "budget: SKIP (plugin not installed; run 'claude plugin install core@adrian')"
  exit 0
fi

if [ "${1:-}" = "--update" ]; then
  python3 - "$CORE" <<'PY'
import json, sys, datetime, pathlib
p = pathlib.Path('bench/baseline.json')
d = json.loads(p.read_text()) if p.exists() else {}
d['core_always_on_tokens'] = int(sys.argv[1])
d['recorded'] = datetime.date.today().isoformat()
d.setdefault('budget_always_on_tokens', 8500)
p.write_text(json.dumps(d, indent=2) + '\n')
print(f"baseline updated: {d['core_always_on_tokens']} tok")
PY
  exit 0
fi

[ -f "$BASE" ] || { echo "budget: no baseline; run bench/budget.sh --update"; exit 1; }

python3 - "$CORE" <<'PY'
import json, sys
cur = int(sys.argv[1])
d = json.load(open('bench/baseline.json'))
base, budget = d['core_always_on_tokens'], d['budget_always_on_tokens']
delta = cur - base
print(f"always-on: {cur} tok  (baseline {base}, budget {budget}, delta {delta:+d})")
if cur > budget:
    print(f"budget: FAIL — {cur - budget} tok over budget")
    sys.exit(1)
if delta > 250:
    print(f"budget: FAIL — grew {delta} tok since the baseline; trim a description or re-baseline deliberately")
    sys.exit(1)
if delta < -250:
    print("budget: PASS (improved — run bench/budget.sh --update to lock it in)")
else:
    print("budget: PASS")
PY
