---
name: build-tested-utility
description: core:build adds a pure utility plus a colocated test, runs the project's own gate, and pastes the real output.
tags: [build, gate, evidence]
runs: 3
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill, Agent, TodoWrite]
expected_outcome: >
  The build skill fires, src/format-duration.js and src/format-duration.test.js
  exist, npm run typecheck and npm run test were actually executed via Bash, and
  the closing report quotes their real stdout instead of asserting success.
---

The working directory is a dependency-free Node scratch project. It has no utilities yet.

/core:build add a pure `formatDuration(ms)` helper in `src/format-duration.js` that renders a millisecond count as `"3m 07s"` (minutes, then zero-padded seconds), and a colocated `src/format-duration.test.js` covering zero, a sub-minute value, and a multi-minute value.

Constraints for this environment:

- Interactive plan-mode approval is unavailable in this run. Treat the implementation plan as already approved and implement it directly. Every other phase — tests, the quality gate, the final report — runs as normal.
- There is no network access. Do not install anything. The test must use Node's built-in `node:test` and `node:assert`.
- Use the project's own scripts: `npm run typecheck` and `npm run test`.
