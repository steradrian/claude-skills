#!/usr/bin/env bash
# A branch with a real change-set to index, and deliberately no browser anywhere.
set -euo pipefail

FIXTURES="$(cd "$(dirname "$0")/../fixtures/review-repo" && pwd)"
GIT=(git -c user.name=Eval -c user.email=eval@example.com -c init.defaultBranch=main -c commit.gpgsign=false)

cp -R "$FIXTURES/base/." .

"${GIT[@]}" init -q .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "feat(deposit): credit balance then write the audit row"
"${GIT[@]}" update-ref refs/remotes/origin/main HEAD

"${GIT[@]}" checkout -q -b feature/deposit-receipt
cp -R "$FIXTURES/head/." .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "feat(deposit): show the formatted amount on the receipt"
