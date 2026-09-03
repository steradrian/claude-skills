#!/usr/bin/env bash
# Put the app's source in the working directory. The page itself is served by the
# Playwright stand-ins in evals/mocks/playwright/, not by a real dev server.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../fixtures/explore-app" && pwd)"
cp -R "$SRC/." .
