---
name: bug-bash
description: >
  Multi-bug fix orchestrator. Takes a list of bugs (file path or inline)
  and runs repro → root-cause → fix → re-verify per bug, end to end.
  Handles upstream-package fixes via local link. The host drives the
  browser directly; spawns `bug-investigator` for code-side root cause
  and documentation agents at the end. Triggered by `/bug-bash <list-or-
  path>` or natural language: "work through this bug list", "fix and
  verify these N bugs", "run the bug bash on docs/bugs/list.md".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Bug bash

Per-bug loop: reproduce in the browser, root-cause, propose fix, apply,
re-verify, document. Repeat for the whole list. The host (Opus) is the
coordinator AND the browser driver — no executor subagent for browser
work. Subagent dispatch is reserved for `bug-investigator` (code-side
research) and the final documentation agents.

The audit trail is the point: every bug ends the run with before-evidence,
root cause, the diff, and after-evidence. Future-you can read one file
and know exactly what was wrong, what changed, and that it's fixed.

## When to use

- 2+ bugs to work through with verified-fixed status per bug.
- A surfaced batch of bugs from `/manual-test`, `/explore`, or a
  user-reported list (like demo prep findings).
- Plugin / upstream-package bugs that need fix → rebuild → re-verify
  loops.

## When NOT to use

- Single bug → `/repro-bug` then `bug-investigator` then manual fix is
  faster.
- Feature work → `/build` (or `/build-arch`).
- Bugs whose fix is non-trivial design work → break out to `/build-arch`
  first, come back to `/bug-bash` for verification only.

## Strict invariants

1. **One bug at a time.** Don't interleave fixes across bugs — the
   audit trail collapses if you do.
2. **Verify before claiming fixed.** A bug is "fixed" only after
   re-running the same repro AND passing `fix-reviewer`. Tests
   passing isn't enough; the original symptom must be gone in the
   browser AND the fix must survive scenario analysis.
3. **Drive Playwright in the host context.** No executor subagent.
4. **Run `fix-reviewer` after every fix, before reverify.** A cold
   second-reader catches patch-vs-fix conflation that the implementer
   misses. See Step 1d.5.
5. **Don't stop for per-fix approval (autonomy mode).** The user has
   stated they want `/bug-bash` to run end-to-end without halting at
   each fix proposal. Apply fixes immediately after `bug-investigator`
   returns. Only halt at: hard blockers, `fix-reviewer` 🔴 after 2
   retries, re-verify failing twice, or end of run.
6. **Don't commit autonomously.** Per global CLAUDE.md, only the user
   runs `git commit`. End the run with a summary of changes; the user
   commits via `/cz-commit`.
7. **Cost guard.** Don't loop on paid third-party APIs (translation,
   LLM, etc.). One sample per repro and per re-verify, max.

## Required prerequisites

1. **Playwright MCP loaded.**
2. **Dev server reachable.** Will be started if not.
3. **Login works.**
4. **Bug list parsed.** Either a markdown file path or inline list. Each
   bug needs at minimum: title + brief description. Repro hints
   improve the run but aren't strictly required (you'll figure them
   out).
5. **Upstream link strategy decided** (only if any bug fixes a separate
   package). Options:
   - `pnpm link` between repos.
   - `file:../<pkg>` in package.json (local file dep).
   - Workspace (already a monorepo).
   - Publish-and-bump (slowest; only if local link impossible).
   Ask the user once at the start of the run, remember for the duration.

## Step 0 — Frame the run

Echo back to the user:

```
Bug bash plan
=============
Bugs: <count>
Source: <path or "inline">
Upstream link strategy: <pnpm link / file: / workspace / publish>
Estimated paid-API calls: <count> (one per repro + one per re-verify)

Proposed order:
  1. <bug-1 title>
  2. <bug-2 title>
  ...

Bugs flagged for collapse (likely same root cause):
  - <bug-1> + <bug-5> — both about <area>; will investigate together.

Bugs flagged as not-bugs (feature gaps, design questions):
  - <bug-N> — looks like a feature request, not a bug. Skip from this run?
```

Wait for "go" or edits. Don't start until confirmed.

## Step 1 — Per-bug loop

For each bug in the approved order:

### 1a. Reproduce

Drive Playwright MCP through the bug's steps (same procedure as
`/repro-bug` Step 2). Capture:
- `before/<bug-id>-actual.png`
- Console errors (verbatim).
- Failed network requests.

If **could not reproduce**: mark `CNR`, write a brief note (what you
tried), continue to next bug. Don't grind — flag for the user at the end.

### 1b. Root-cause (delegated)

Spawn `bug-investigator` with:
- The bug description.
- The captured evidence (paths to screenshot, verbatim console + network).
- The relevant source paths (the upstream package source, if applicable
  — give the agent the local checkout path).
- Constraint: **don't propose a fix unless the cause is unambiguous.**
  Return root cause + 1-3 suggested fix scopes.

Wait for the agent. If `bug-investigator` returns "unclear" or
"multiple possible causes", surface to the user — don't pick blind.

### 1c. Propose fix

Format:
```
Bug <id>: <title>
Root cause: <1-2 sentences from bug-investigator>
Proposed fix: <file:line> — <one-line scope>
Blast radius: <other call sites / tests affected>
```

Wait for **"approved"** unless trivial (one-line, obvious correctness).

### 1d. Apply fix

Edit the file(s). Let the TS hook run. If the hook reports errors,
fix them before proceeding — don't accumulate broken state.

### 1d.5 Review the fix (`fix-reviewer`)

Before rebuild + reverify, spawn `fix-reviewer` (sonnet) to second-read
the fix as a senior engineer who didn't write it. The reviewer
constructs adversarial "what if" scenarios the implementer probably
didn't trace through, walks the diff against each, and returns a
verdict.

Pass:
- The bug description (Step 1a evidence summary).
- The root cause from `bug-investigator` (Step 1b output).
- The diff (`git diff` in the upstream package, or the in-place edits
  if no commit yet).
- The relevant source paths the fix touches and one level of callers
  (so the reviewer can assess blast radius).

The reviewer returns one of:

- 🟢 **OK** → continue to 1e.
- 🟡 **CONCERN** → log the concerns in the running narrative, continue
  to 1e. Concerns surface in the final bug-bash report.
- 🔴 **BLOCKING** → loop back to 1c (propose a refined fix) or 1d
  (revise edits in place). Max **2 review-blocked retries** per bug;
  after that, mark `BLOCKED` and surface to the user with the
  reviewer's findings. The user decides whether to ship as-is, accept
  the blocker as a known issue, or escalate.

**Why this exists:** the implementer is committed to their solution
after debugging it for an hour. A cold reviewer catches the patch-vs-
fix conflation, the unhandled adjacent input, the same-bug-different-
door risk. In practice this catches more re-emergences than rebuild +
reverify alone, and earlier (saves a rebuild cycle when 🔴).

**When to skip:** trivial one-line fixes (typo, comment, import-only)
where scenario analysis is overkill. The reviewer itself will skip its
scenario step on trivial diffs and return 🟢 fast. Don't pre-filter at
the skill level — let the reviewer decide.

### 1e. Rebuild upstream (if applicable)

If the fix is in an upstream package, run the package's build:
```
pnpm --filter <pkg> build       # or per project conventions
```

Wait for build success. Then either:
- Re-link via `pnpm link` (if not already linked), OR
- `pnpm install` in the consuming repo (if `file:` dep).

Restart the dev server (kill the existing pid, restart) — Next.js often
caches the old plugin code.

### 1f. Re-verify

Same browser steps as Step 1a (reuse the snapshot refs). Capture
`after/<bug-id>-fixed.png`. Assert the bug does NOT surface — same
evidence checks (no console error, no failed network).

- **Pass**: mark `FIXED`. Continue to next bug.
- **Fail**: loop back to 1b, max **2 retries**. After that, mark
  `BLOCKED` and surface to the user before continuing.

## Step 2 — End-of-run aggregation

When all bugs are processed (FIXED, CNR, or BLOCKED):

Print a summary table:
```
Bug bash results — <YYYYMMDD-HHmm>

| ID | Title | Status | Fix file | Notes |
|---|---|---|---|---|
| 1 | rich-text deletion not propagated | FIXED | cms-plugins/src/diff.ts:42 | - |
| 2 | schedule-publish drafts gate | CNR | - | needs Payload version 3.x state, ours is 4.x |
| 3 | nested JSON arrays untranslated | BLOCKED | - | 2 retries failed; root cause uncertain |
```

## Step 3 — Documentation (parallel agents)

Prepare a context summary (per-bug repro evidence path, root cause, fix
diff, re-verify evidence path). Then spawn three agents in parallel:

- **bug-bash-reporter** (sonnet): Pass the per-bug context. Save to
  `docs/bugs/BugBash-<ts>.md` — full audit trail.
- **pr-writer** (haiku): Pass the user-facing summary. Save to
  `docs/pr/PR-<ts>-bug-bash-<n>-bugs.md`.
- **changelog-writer** (haiku): Pass user-facing fixes only. Skip
  internal cleanup.

Wait for all three.

## Step 4 — Hand-off

Print:
- Final results table.
- Paths to: bug-bash report, PR doc, changelog entries.
- List of `BLOCKED` and `CNR` bugs that need user attention.
- Suggested next step:
  - If 100% FIXED → "Run `/cz-commit` to commit the fix bundle."
  - If any BLOCKED → "Want me to escalate <bug> via `/debug-investigate`?"
  - If any CNR → "Want to update the bug list with what you'd need to repro?"

Do NOT close the browser. Do NOT run `git commit`.

## Edge cases

- **Two bugs share a root cause** → fix once, verify both. Note the
  collapse in the bug-bash report.
- **A "bug" turns out to be intended behavior** → mark `INVALID`, write
  a note explaining; skip the fix step. Don't argue with the report —
  surface the discrepancy to the user.
- **Fixing bug N breaks bug M (regression introduced)** → halt the run,
  surface immediately. Don't try to fix M from inside the same loop —
  user decides whether to revert N or keep N+M as a chain.
- **Upstream rebuild takes >2 minutes** → run it with
  `run_in_background: true` and continue planning the next steps;
  don't sleep-poll.
- **Bug requires a feature change, not a fix** → flag at Step 0
  ("not-bugs"); don't proceed in this skill. Spawn `product-manager` if
  scoping is needed.
- **Test data needs to be created via UI** → create as part of repro
  (the act of creating IS part of the repro). Don't seed via DB.
- **Paid-API call budget exceeded mid-run** → halt, report spend so
  far, ask the user whether to continue. Don't silently keep going.
