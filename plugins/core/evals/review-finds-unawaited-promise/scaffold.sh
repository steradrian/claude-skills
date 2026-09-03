#!/usr/bin/env bash
# Build a git repo whose feature branch carries exactly one real bug:
# submitDeposit() drops the await on updateBalance(), so the UI reports
# "confirmed" while the balance write is fire-and-forget.
set -euo pipefail

FIXTURES="$(cd "$(dirname "$0")/../fixtures/review-repo" && pwd)"
GIT=(git -c user.name=Eval -c user.email=eval@example.com -c init.defaultBranch=main -c commit.gpgsign=false)

cp -R "$FIXTURES/base/." .

"${GIT[@]}" init -q .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "feat(deposit): credit balance then write the audit row"

# Pin an origin/main ref so the skill's MERGE_BASE resolution finds a base branch
# without needing a real remote.
"${GIT[@]}" update-ref refs/remotes/origin/main HEAD

"${GIT[@]}" checkout -q -b feature/deposit-receipt
cp -R "$FIXTURES/head/." .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "feat(deposit): show the formatted amount on the receipt"
