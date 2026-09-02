#!/bin/bash
# Stop — macOS notification when Claude hands control back. No-op elsewhere.
command -v osascript >/dev/null 2>&1 || exit 0
PROJECT=$(basename "$(pwd)")
osascript -e "display notification \"Ready in $PROJECT\" with title \"Claude Code\" sound name \"Submarine\"" >/dev/null 2>&1 || true
exit 0
