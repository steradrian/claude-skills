---
name: explore-report-only
description: core:explore writes its findings to a file and touches no source — discovery only, no fixes.
tags: [explore, discovery-only, artifact]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - TodoWrite
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_console_messages
expected_outcome: >
  A report lands at docs/explore/Explore-<timestamp>-<slug>.md listing the findings
  from the Settings page, and the app's source under src/ is left exactly as it was.
---

The app is already running at http://localhost:4173 — the dev server is up, no need to start one or ask for the port.

/core:explore the Settings page at http://localhost:4173/settings --findings 5

The source for that page is in `src/settings/` if you need to understand what you're seeing.
