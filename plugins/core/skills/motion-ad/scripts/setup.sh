#!/usr/bin/env bash
# Idempotent: creates the motion-ad virtualenv and installs the render dependencies into it.
# ffmpeg is a system dependency (macOS: brew install ffmpeg).
set -euo pipefail
VENV="${MOTION_AD_VENV:-$HOME/.local/share/motion-ad/venv}"
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet playwright pillow
"$VENV/bin/python" -m playwright install chromium
echo "motion-ad venv ready: $VENV"
