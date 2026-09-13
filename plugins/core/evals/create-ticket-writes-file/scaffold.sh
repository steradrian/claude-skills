#!/usr/bin/env bash
# Commit the base tree, then leave the receipt-formatting change uncommitted so
# `git diff HEAD` has something for the ticket to document.
set -euo pipefail

FIXTURES="$(cd "$(dirname "$0")/../fixtures/review-repo" && pwd)"
GIT=(git -c user.name=Eval -c user.email=eval@example.com -c init.defaultBranch=main -c commit.gpgsign=false)

cp -R "$FIXTURES/base/." .

"${GIT[@]}" init -q .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "feat(deposit): credit balance then write the audit row"
"${GIT[@]}" update-ref refs/remotes/origin/main HEAD

cp -R "$FIXTURES/head/." .
