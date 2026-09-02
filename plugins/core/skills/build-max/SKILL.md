---
name: build-max
description: Execute the complete feature development workflow with maximum rigor (extra review, verification and QA phases). Use for high-risk or large features.
argument-hint: <feature description>
---

Execute the complete feature development workflow with maximum rigor for: $ARGUMENTS

Two sequential gates before a single line of code is written:
1. **Gate 1 (instructional)** — Architecture document reviewed and approved by the developer
2. **Gate 2 (mechanical)** — Native plan mode: Claude physically cannot write files until the implementation plan is approved

Use for: large or risky features, architectural changes affecting multiple systems, or anything where getting the design wrong is expensive to undo.

---

## Phase 1: Investigation

Before any design or code, run these as **parallel tool calls in a single message** — they are independent:

- Grep for existing implementations of similar functionality
- Read types/interfaces related to this domain
- Read test files for related features — understand expected behavior
- Glob/grep for reusable design system components or utilities

Report findings concisely: what exists, what's relevant, what's missing, which files will change.

---

## Phase 2: Architecture Document

Based on the investigation, produce a comprehensive design document:

- **Component breakdown** — each new/modified piece with its single responsibility
- **Data flow** — source → transforms → destination
- **API contracts** — full request/response types for anything new
- **State management** — where state lives, what triggers updates
- **File structure** — exact paths for each new/modified file
- **Edge cases** — at least 3 non-obvious scenarios and how they're handled
- **Testing strategy** — what behavioral contracts need tests
- **Risks & decisions** — anything that could go wrong or needs a developer decision before building

### ⛔ GATE 1 — Architecture Approval

Stop here. Present the architecture document. Do NOT proceed until the developer explicitly approves.

Wait for: "approved", "looks good", "proceed", or similar confirmation.
If changes are requested, update the design and present again.

---

## Phase 3: Implementation Plan (Gate 2 — Mechanical)

After Gate 1 approval, call the `EnterPlanMode` tool.

In plan mode, produce a detailed implementation plan grounded in the approved architecture:

- **Build order** — which files to create/modify and in what sequence, and why that order
- **Per-file plan** — what each file will export, its interface, how it connects to others
- **Specific implementation decisions** — which patterns, utilities, and hooks to use
- **Test plan** — which behaviors need coverage and how each will be tested

You cannot call Edit, Write, or any file modification tool while in plan mode. This gate is enforced mechanically. The user approves before a single line of code is written.

When approved, ExitPlanMode is called and you proceed to Phase 4.

---

## Phase 4: Implementation

After both gates are cleared:

1. Implement according to the approved architecture and implementation plan
2. The TS hook will surface compilation errors automatically — self-correct as they appear
3. If you discover something during implementation that materially changes either the architecture or the plan, stop and report it before continuing

**Parallel implementation:** When the approved plan identifies 2+ independent pieces (no type/import dependencies between them, each >30 lines), implement them via parallel agents. Include in each agent's prompt:
- **Task**: what to build (1-2 sentences)
- **Plan context**: the relevant section of the approved architecture + implementation plan
- **Files to read**: paths the agent needs for pattern matching and types
- **Constraints**: naming conventions, existing patterns to follow, types to consume/produce
- **Output**: what file(s) to create and where

When pieces are small (<30 lines each) or interdependent, implement sequentially in main context.

Do not deviate from either approved document without flagging it explicitly.

**When implementation is complete, proceed immediately to Phase 5. No approval required. Do not stop, do not summarize, do not ask — just continue.**

---

## Phase 5: Tests (Sonnet Agent)

**Mandatory. Delegate to a test-writer agent (runs at sonnet).**

Spawn a test-writer agent with:
- **Task**: Write and validate tests for the implementation just built
- **Files to test**: list the implementation files created/modified in Phase 4
- **Existing test patterns**: paths to related test files in this module
- **Behavioral contract**: the key behaviors from both the approved architecture and implementation plan that need coverage
- **Requirements**: happy path → error scenarios → edge cases. Mutation sanity check required (break implementation, verify tests catch it, revert).

Wait for the agent to complete and report results. If any tests fail or the mutation check reveals gaps, fix in main context.

**When tests pass, proceed immediately to Phase 6. Do not stop.**

---

## Phase 6: Self-Review

**This phase is mandatory and non-interactive. Execute it now without pausing.**

Re-read your own changes as if reviewing a PR:

- 🔴 Bugs, type safety holes, unhandled error states, missing accessibility
- 🟡 Convention violations, missing coverage, things that should be constants
- 🟢 Non-blocking suggestions
- 💬 Decisions worth noting in the PR

Present findings. 🔴 issues must be fixed before proceeding — fix them, then continue. 🟡 issues: flag for developer decision.

**When self-review is complete (and any 🔴 issues are fixed), proceed immediately to Phase 6.5. Do not stop.**

---

## Phase 6.5: Manual Verification (Conditional)

Decide whether to drive the change in a real browser before writing documentation.

### Decision

**Run** if the diff includes any of:
- New page, route, form, modal, admin UI surface
- Plugin integration, async/background flow, locale/i18n behavior
- New collection or global, or significant change to an existing one
- Auth/permission boundary changes

**Skip** if the diff is:
- Pure utility, type-only, or backend logic with no UI surface
- Refactor with no behavior change
- Test files, build config, or tooling-only

**Borderline?** Print: `Manual verification — run? (UI surfaces: <list>)`. Wait one beat for "go" / "skip". Default to run when in doubt — `/build-max` is high-stakes by definition.

If skipping: print `Manual verification skipped — <reason>`. Continue to Phase 7 immediately.

### When running

Drive Playwright MCP **directly in the host context**. Do NOT dispatch an executor subagent (per user feedback — host stays in the driver's seat for browser work).

1. **Prereqs**: Playwright MCP loaded; dev server reachable; login works. Halt if any fail.
2. **Micro-matrix** (not the full `/manual-test` index — feature-scope, not branch-scope): 3-5 rows covering the new surface, focused on the behavior this change introduces. For each row: ID, setup, action, expected, evidence filename.
3. **Drive**: login → baseline screenshot → ref-based clicks per matrix → halt on first FAIL.
4. **Assert**: DOM matches expected; no new console errors (filter third-party by source URL); no new 4xx/5xx network responses.
5. **Evidence**: save to `tests/manual/screenshots/build-<ISO-timestamp>/`. Screenshot per row.
6. **Halt rule**: on FAIL, capture full evidence (steps, console verbatim, network excerpt, screenshot) and stop the matrix.

### Outputs to Phase 7

- **All pass**: one-line note for the PR doc — `Manual verified: <count> rows, all PASS. Evidence: <path>`.
- **Any fail**: full failure detail + 1-2 sentence root-cause hypothesis. The PR doc gets a "Manual verification" section flagging this as a blocker; the ticket records the evidence path. Ask the user: **continue to docs as-is, fix and re-verify, or revert?**

---

## Phase 7: Documentation (Parallel Agents)

After self-review is complete, prepare a **context summary** for the documentation agents:
1. Run `git diff HEAD` and `git log -5 --oneline`
2. Summarize: files changed, what was built, user-facing vs internal changes
3. Collect self-review findings (🟡/🟢/💬 items, any 🔴 fixes applied)
4. Note any deviations from the Phase 2 architecture and Phase 3 implementation plan

Then **spawn three named agents in parallel in a single message:**

- **pr-writer** (haiku): Pass the context summary + self-review findings. Save to `docs/pr/PR-<ISO-timestamp>-<kebab-slug>.md`
- **changelog-writer** (haiku): Pass the user-facing changes from the summary.
- **ticket-writer** (sonnet): Pass the full context summary, architecture (Gate 1) + plan (Gate 2) deviations, self-review findings. Save to `docs/tickets/Ticket-<ISO-timestamp>-<kebab-slug>.md`

Wait for all three agents to complete, then proceed to the completion summary.

---

## Completion Summary

Report:
- Files created/modified (with paths)
- Deviations from the approved architecture (Phase 2) and why
- Deviations from the approved implementation plan (Phase 3) and why
- Follow-up items from self-review
- Paths to generated PR doc and ticket doc
