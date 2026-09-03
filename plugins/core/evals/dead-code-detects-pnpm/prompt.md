---
name: dead-code-detects-pnpm
description: core:dead-code resolves the package manager from the committed lockfile instead of reaching for npm.
tags: [dead-code, package-manager, detection]
runs: 3
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Edit, Glob, Grep, Bash, Skill, TodoWrite]
expected_outcome: >
  The lockfile is inspected, knip is invoked through pnpm, and no npm / yarn / bun
  command is run — even though an untracked package-lock.json sits in the same
  directory.
---

Find the dead code in this project.

There is no network access and no `node_modules`, so the tool invocation will fail — that is expected. Report what you ran and what it returned; do not try to install anything.
