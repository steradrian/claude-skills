---
name: build
description: Execute the complete feature development workflow (investigate, plan, implement, test, gate, review, verify, document) for a described feature or fix. Use when asked to "build", "implement", "ship" or "finish" something end to end. Flags select the architecture pass (--arch), maximum rigor (--max) or the post-implementation phases only (--finish).
argument-hint: "[--arch] [--max] [--finish] [--pr] [--changelog] <feature description>"
disable-model-invocation: true
---

Execute the complete feature development workflow for: $ARGUMENTS

Uses **native plan mode** as the approval gate — Claude physically cannot write any implementation code until you approve the plan. Default workflow for anything non-trivial.

## Flags

Parse leading flags out of `$ARGUMENTS`; everything after them is the feature description.

| Flag | Effect |
|---|---|
| `--arch` | Insert Phase 2a: a full architecture document, approved by the developer before plan mode. Use when the structure is not obvious. |
| `--max` | Implies `--arch`. Two sequential gates (architecture, then a detailed implementation plan in plan mode), 🟡 review findings must be resolved not just flagged, borderline manual verification runs without asking. Use for large, risky or cross-cutting changes. |
| `--finish` | Skip Phases 1-3. Run Phases 4-6 on the current working state (`git diff HEAD`). Use after an interrupted run, a manually implemented plan, or existing changes that need the test, gate, review and ticket pass. |
| `--pr` | Phase 6 also writes a PR description via `core:pr-writer`. |
| `--changelog` | Phase 6 also writes a changelog entry via `core:changelog-writer`. |

**Package manager:** detect it once at the start per `${CLAUDE_PLUGIN_ROOT}/references/package-manager.md` and use it for every command below; `<pm>` stands for the detected one.

---

## Phase 1: Investigation

Skipped with `--finish`.

Before any design, planning or code, run these as **parallel tool calls in a single message** — they are independent:

- Grep for existing implementations of similar functionality
- Read types/interfaces related to this domain
- Read test files for related features — understand expected behavior
- Glob/grep for reusable design system components or utilities

Report findings concisely: what exists, what's relevant, what's missing, which files will change.

---

## Phase 2a: Architecture Document (`--arch`, `--max` only)

Skipped without `--arch`/`--max`, and with `--finish`.

Based on the investigation, produce a comprehensive design document. This bullet list
is the **design outline** — Phase 2b refers back to it rather than repeating it:

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

## Phase 2b: Plan Mode (Gate — Mechanical)

Skipped with `--finish`.

Call the `EnterPlanMode` tool now.

**Default (no `--arch`):** in plan mode, produce a full implementation plan — an
**Approach** section (how you'll solve this, based on the investigation findings)
followed by the design outline from Phase 2a, minus "Risks & decisions": component
breakdown, data flow, API contracts, state management, file structure, edge cases,
testing strategy.

**`--arch`:** the architecture document already covers that outline and is approved.
Do NOT restate it. The plan is the **Approach** section plus anything the architecture
left open, and it cites the architecture doc for the rest.

**`--max`:** the plan is grounded in the approved architecture and goes one level deeper:

- **Build order** — which files to create/modify and in what sequence, and why that order
- **Per-file plan** — what each file will export, its interface, how it connects to others
- **Specific implementation decisions** — which patterns, utilities and hooks to use
- **Test plan** — which behaviors need coverage and how each will be tested

You cannot call Edit, Write, or any file modification tool while in plan mode. This is enforced mechanically — not by convention. The user reviews and approves (or iterates on) the plan before any code is written.

When the user approves the plan, ExitPlanMode is called and you proceed to Phase 3.

---

## Phase 3: Implementation

Skipped with `--finish`.

After plan mode exits:

1. Implement according to the approved plan (and architecture, if any)
2. The TS hook will surface compilation errors automatically — self-correct as they appear
3. If you discover something during implementation that materially changes the plan or the architecture, stop and report it before continuing

**Parallel implementation:** When the approved plan identifies 2+ independent pieces (no type/import dependencies between them, each >30 lines), implement them via parallel subagents. Include in each agent's prompt:
- **Task**: what to build (1-2 sentences)
- **Plan context**: the relevant section of the approved plan
- **Files to read**: paths the agent needs for pattern matching and types
- **Constraints**: naming conventions, existing patterns to follow, types to consume/produce
- **Output**: what file(s) to create and where

When pieces are small (<30 lines each) or interdependent, implement sequentially in main context.

Do not deviate from the approved plan without flagging it.

**When implementation is complete, proceed immediately to Phase 4. No approval required. Do not stop, do not summarize, do not ask — just continue.**

---

## Phase 4: Tests

**Mandatory. Delegate to `core:test-writer`.**

Spawn a `core:test-writer` agent with:
- **Task**: Write and validate tests for the implementation just built
- **Files to test**: the implementation files created/modified in Phase 3 (with `--finish`: the changed files from `git diff HEAD --stat`)
- **Existing test patterns**: paths to related test files in this module
- **Behavioral contract**: the key behaviors from the approved plan and architecture that need coverage (with `--finish`: derive them from the diff and any plan already in context)
- **Requirements**: happy path → error scenarios → edge cases. Mutation sanity check required (break implementation, verify tests catch it, revert).

Wait for the agent to complete and report results. If any tests fail or the mutation check reveals gaps, fix in main context.

**When tests pass, proceed immediately to Phase 5. Do not stop.**

---

## Phase 5: Quality Gate

**Mandatory and non-interactive. Execute it now without pausing.** Self-approval is not a gate — the gate is the tool output plus an independent reviewer.

### 5a — Static gate

Run these in order with the detected package manager. Paste the output of each into the conversation (last ~20 lines when green, the full failure when red):

1. **Typecheck** — first existing script among `typecheck`, `type-check`, `tsc`; else `<pm> exec tsc --noEmit`
2. **Lint** — first existing script among `lint`, `lint:check`, `biome:check`, `eslint`; skip if none
3. **Tests** — `<pm> exec vitest run` (or the `test` script if it wraps vitest)
4. **Build** — the `build` script

Any failure: fix it, then re-run the whole gate from step 1. Do not proceed while any step is red. Pre-existing failures in files you did not touch are reported, not fixed.

### 5b — Review

Invoke `/core:review` on the diff. It resolves the merge base, batches the changed files, dispatches a `core:pr-reviewer` per batch in parallel and merges the findings — which is what a multi-file diff needs.

Only when the diff is **under 100 lines** (`git diff HEAD --shortstat`), skip the batching and dispatch a single `core:pr-reviewer` agent directly on the diff (`git diff HEAD`, or the merge-base diff when the work spans commits) with the branch context and the list of changed files.

Either way: do not review your own diff in main context.

Handle its findings:
- 🔴 — fix, then re-run 5a. Repeat until no 🔴 remains.
- 🟡 — fix when the change is local to the diff; otherwise flag for developer decision. With `--max`, every 🟡 is fixed or explicitly declined with a reason.
- 🔵 / 💬 — carry into the ticket (and the PR description when `--pr`).

**When the gate is green and no 🔴 remains, proceed immediately to Phase 5.5. Do not stop.**

---

## Phase 5.5: Manual Verification (Conditional)

Decide whether to drive the change in a real browser before writing documentation.

### No-browser mode

First check whether a browser tool is available in this session (a Playwright MCP or Chrome tool). If none is (cloud session, restricted toolset): skip this phase, print `Manual verification skipped — no browser tool available in this session`, state it explicitly in the completion summary and the ticket, and rely on the Phase 5 static gate.

### Decision

**Run** if the diff includes any of:
- New route or page
- Form, drawer, sheet, modal or other interactive surface
- i18n change (new keys, locale-dependent rendering)
- Auth boundary change (login, permissions, protected routes)
- Data-fetching change (queries, mutations, server actions, route handlers, caching)

**Skip** if the diff is:
- Pure utility, type-only, or server logic with no UI surface
- Refactor with no behavior change
- Test files, build config, or tooling-only

**Borderline?** Print: `Manual verification — run? (UI surfaces: <list>)`. Ask **once**. If the user does not answer within this turn, run it — UI regressions are the whole reason this phase exists. Never ask twice, and never stall the phase waiting for an answer. With `--max`, do not ask at all: run.

If skipping: print `Manual verification skipped — <reason>`. Continue to Phase 6 immediately.

### When running

Follow `${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md` for the mechanics: Playwright preflight, dev server, login, ref-based clicks, halt on first failure, a screenshot for every assertion. Drive the browser **directly in the host context** — do not dispatch a subagent for browser work.

1. **Micro-matrix** (feature-scope, not branch-scope): 3-5 rows covering the new surface, focused on the behavior this change introduces. For each row: ID, setup, action, expected, evidence filename.
2. **Assert** per row: DOM matches expected; no new console errors (filter third-party by source URL); no new 4xx/5xx network responses.
3. **Evidence**: save to `tests/manual/screenshots/build-<ISO-timestamp>/`. Screenshot per row, pass or fail.
4. **Halt rule**: on FAIL, capture full evidence (steps, console verbatim, network excerpt, screenshot) and stop the matrix.

### Outputs to Phase 6

- **All pass**: one-line note — `Manual verified: <count> rows, all PASS. Evidence: <path>`.
- **Any fail**: full failure detail (steps, console, network, screenshot path) + 1-2 sentence root-cause hypothesis. The ticket records the evidence path and flags the failure as a blocker (so does the PR description when `--pr`). Ask the user: **continue to docs as-is, fix and re-verify, or revert?**

---

## Phase 6: Documentation

Prepare a **context summary** for the documentation agents:
1. Run `git diff HEAD` and `git log -5 --oneline`
2. Summarize: files changed, what was built, user-facing vs internal changes
3. Collect Phase 5 findings (🟡/🔵/💬 items, any 🔴 fixes applied) and the Phase 5.5 outcome
4. Note any deviations from the approved plan and architecture

Then spawn the documentation agents **in parallel in a single message**:

- **`core:ticket-writer`** — always. Pass the full context summary, deviations, review findings, manual-verification outcome. Save to `docs/tickets/Ticket-<ISO-timestamp>-<kebab-slug>.md`
- **`core:pr-writer`** — only with `--pr` or when the user asks. Pass the context summary + review findings. Save to `docs/pr/PR-<ISO-timestamp>-<kebab-slug>.md`
- **`core:changelog-writer`** — only with `--changelog` or when the user asks. Pass the user-facing changes from the summary.

Wait for all spawned agents to complete, then proceed to the completion summary.

---

## Completion Summary

Report:
- Flags in effect
- Files created/modified (with paths)
- Any deviations from the approved plan / architecture (and why)
- Static gate result (one line per command) and `core:pr-reviewer` outcome
- Manual verification outcome — including an explicit "skipped: no browser tool" line when that applied
- Follow-up items from review
- Paths to the ticket (and PR doc / changelog entry when generated)
