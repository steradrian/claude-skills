#!/usr/bin/env bash
# The benchmark. Run before and after any change to the marketplace; a green
# run means no regression on anything that is currently measurable.
#
#   bench/run.sh            full run
#   bench/run.sh --quiet    scorecard only
#
# Coverage today, honestly:
#   MEASURED   static conformance, hook behaviour, always-on context cost
#   NOT YET    whether a skill produces good work (needs `claude plugin eval`,
#              early access), and which skills actually get used (needs
#              /skill-doctor or OTLP telemetry — see bench/README.md)

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ARG="${1:-}"
RC=0

hr() { printf '\n== %s ==\n' "$1"; }

hr "conformance"
bench/conformance.sh $ARG; c=$?; [ $c -ne 0 ] && RC=1

hr "hooks"
bench/hooks.sh $ARG; h=$?; [ $h -ne 0 ] && RC=1

hr "context budget"
bench/budget.sh; b=$?; [ $b -ne 0 ] && RC=1

hr "validate"
claude plugin validate . >/dev/null 2>&1 && echo "ok    marketplace validates" || { echo "FAIL  marketplace validate"; RC=1; }

hr "scorecard"
status() { [ "$1" -eq 0 ] && echo PASS || echo FAIL; }
printf '  %-22s %s\n' "conformance" "$(status $c)"
printf '  %-22s %s\n' "hook behaviour" "$(status $h)"
printf '  %-22s %s\n' "context budget" "$(status $b)"
printf '  %-22s %s\n' "behavioural evals" "NOT MEASURED (plugin eval is early access)"
printf '  %-22s %s\n' "usage in practice" "NOT MEASURED (see bench/README.md)"
printf '\n'
[ $RC -eq 0 ] && echo "BENCHMARK: PASS" || echo "BENCHMARK: FAIL"
exit $RC
