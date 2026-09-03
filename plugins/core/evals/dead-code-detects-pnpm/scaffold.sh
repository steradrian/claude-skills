#!/usr/bin/env bash
# pnpm-lock.yaml is committed; an untracked package-lock.json is left lying around
# as a decoy, so the case exercises the documented tie-break ("prefer the lockfile
# committed to git over an untracked leftover").
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../fixtures/dead-code-pnpm" && pwd)"
GIT=(git -c user.name=Eval -c user.email=eval@example.com -c init.defaultBranch=main -c commit.gpgsign=false)

cp -R "$SRC/." .

"${GIT[@]}" init -q .
"${GIT[@]}" add -A
"${GIT[@]}" commit -q -m "chore: menu-lib with knip configured"

printf '%s\n' '{ "name": "menu-lib", "lockfileVersion": 3, "packages": {} }' > package-lock.json
