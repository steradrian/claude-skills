---
name: review-finds-unawaited-promise
description: core:review must name the dropped await in submitDeposit and cite it by file and line.
tags: [review, correctness, precision]
runs: 3
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Bash, Glob, Grep, Skill, Agent, TodoWrite]
expected_outcome: >
  The unified review report contains a finding that names the missing await on
  updateBalance() in src/hooks/use-deposit.js, cited with a line number, and
  describes the real consequence (the deposit reports confirmed while the balance
  write is unawaited).
---

I'm on branch `feature/deposit-receipt`, one commit ahead of `origin/main`. Review my changes before I open the PR.

There is no network access and no dependencies are installed, so skip anything that needs an install; read the code and the diff directly.
