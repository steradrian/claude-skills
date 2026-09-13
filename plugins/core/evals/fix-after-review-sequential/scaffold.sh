#!/usr/bin/env bash
# Materialise the two-bug project into the run's working directory.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../fixtures/fix-review-repo" && pwd)"
cp -R "$SRC/." .
