#!/usr/bin/env bash
# Materialise the scratch Node project into the run's working directory.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../fixtures/build-scratch" && pwd)"
cp -R "$SRC/." .
