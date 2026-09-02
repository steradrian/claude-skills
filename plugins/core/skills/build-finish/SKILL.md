---
name: build-finish
description: Run the post-implementation quality and documentation phases on the current working state. Use after a /build was interrupted, a plan was implemented manually, or existing changes need the review, test and ticket pass.
---

Complete the post-implementation phases for the current working state. Use this after implementation is done — whether because `/build` was interrupted, a plan was implemented manually, or you need to run the quality + documentation pass on existing changes.

All four phases run sequentially without stopping for approval. Do not pause between phases.

---

## Phase 1: Tests (Sonnet Agent)

**Mandatory. Delegate to a test-writer agent (runs at sonnet).**

Spawn a test-writer agent with:
- **Task**: Write and validate tests for the current implementation
- **Files to test**: identify the recently changed files from `git diff HEAD --stat`
- **Existing test patterns**: paths to related test files in this module
- **Requirements**: happy path → error scenarios → edge cases. Mutation sanity check required (break implementation, verify tests catch it, revert).

Wait for the agent to complete and report results. If any tests fail or the mutation check reveals gaps, fix in main context.

**When tests pass, proceed immediately to Phase 2. Do not stop.**

---

## Phase 2: Self-Review

**Execute now. Mandatory. Non-interactive.**

Re-read your own changes as if reviewing a PR:

- 🔴 Bugs, type safety holes, unhandled error states, missing accessibility
- 🟡 Convention violations, missing coverage, things that should be constants
- 🟢 Non-blocking suggestions
- 💬 Decisions worth noting in the PR

Present findings. 🔴 issues must be fixed before proceeding — fix them, then continue. 🟡 issues: flag for developer decision. 🟢 and 💬: include in the PR description.

**When self-review is complete (and any 🔴 issues are fixed), proceed immediately to Phase 3. Do not stop.**

---

## Phase 3: Documentation (Parallel Agents)

After self-review is complete, prepare a **context summary** for the documentation agents:
1. Run `git diff HEAD` and `git log -5 --oneline`
2. Summarize: files changed, what was built, user-facing vs internal changes
3. Collect self-review findings (🟡/🟢/💬 items, any 🔴 fixes applied)

Then **spawn three named agents in parallel in a single message:**

- **pr-writer** (haiku): Pass the context summary + self-review findings. Save to `docs/pr/PR-<ISO-timestamp>-<kebab-slug>.md`
- **changelog-writer** (haiku): Pass the user-facing changes from the summary.
- **ticket-writer** (sonnet): Pass the full context summary, self-review findings. Save to `docs/tickets/Ticket-<ISO-timestamp>-<kebab-slug>.md`

Wait for all three agents to complete, then proceed to the completion summary.

---

## Completion Summary

Report:
- Files created/modified (with paths)
- Test results (count passed, mutation check outcome)
- Self-review findings and any 🔴 fixes applied
- Follow-up items (🟡 and 🟢 from self-review)
- Paths to generated PR doc and ticket doc
