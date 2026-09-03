---
name: bug-bash
description: >
  Multi-bug fix orchestrator. Takes a list of bugs (file path or inline)
  and runs repro → root-cause → fix → review → re-verify per bug, end to
  end. Handles upstream-package fixes via local link. The orchestrator
  drives the browser; spawns `core:bug-investigator` for code-side root
  cause, `core:fix-reviewer` as the gate on every fix, and documentation
  agents at the end. Triggered by "work through this bug list", "fix and
  verify these N bugs", "run the bug bash on docs/bugs/list.md".
argument-hint: <bug list path or inline list>
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Bug bash

**Bug list: $ARGUMENTS** (a path to a markdown list, or the list inline).

Per-bug loop: reproduce in the browser, root-cause, propose fix, apply,
review, re-verify, document. Repeat for the whole list. The orchestrator
is the coordinator AND the browser driver. Subagent dispatch is reserved
for `core:bug-investigator` (code-side research), `core:fix-reviewer`
(the gate), and the final documentation agents.

The audit trail is the point: every bug ends the run with
before-evidence, root cause, the diff, and after-evidence. Future-you can
read one file and know exactly what was wrong, what changed, and that
it's fixed.

**No browser tools available (cloud session)?** Follow the no-browser rule in
`${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`: static checks only, say so,
never claim a screenshot. Here the drive loop is the browser half of the per-bug loop
— **Step 1a (reproduce) and Step 1f (re-verify) are skipped**; Step 1b (root cause),
1c (propose), 1d (apply), 1d.5 (`core:fix-reviewer`) and 1e (rebuild upstream) still
run from the bug descriptions, as do Steps 2-4. Every bug then ends the run as
`UNVERIFIED`, never `FIXED`, and never as `CNR` — nothing was attempted in a browser.

**Preflight: follow `${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`.**

## When to use

- 2+ bugs to work through with verified-fixed status per bug.
- A surfaced batch from `/core:manual-test`, `/core:explore`,
  `/core:edge-bash`, or a user-reported list.
- Upstream-package bugs (a workspace package or linked library) that need
  fix → rebuild → re-verify loops.

## When NOT to use

- Single bug → `/core:repro-bug`, then `core:bug-investigator`, then a
  manual fix is faster.
- Feature work → `/core:build` (or `/core:build --arch`).
- Bugs whose fix is non-trivial design work → `/core:build --arch` first,
  come back to `/core:bug-bash` for verification only.

## Strict invariants

1. **One bug at a time.** Don't interleave fixes across bugs — the audit
   trail collapses if you do.
2. **Verify before claiming fixed.** A bug is `FIXED` only after
   re-running the same repro AND passing `core:fix-reviewer`. Tests
   passing isn't enough; the original symptom must be gone in the
   browser AND the fix must survive scenario analysis.
3. **The orchestrator drives the browser in-context** per the playbook.
4. **Run `core:fix-reviewer` after every fix, before re-verify.** A cold
   second reader catches patch-vs-fix conflation the implementer misses.
   See Step 1d.5.
5. **Don't stop for per-fix approval (autonomy mode).** The user wants
   `/core:bug-bash` to run end to end without halting at each fix
   proposal. Apply fixes as soon as `core:bug-investigator` returns. Only
   halt at: hard blockers, `core:fix-reviewer` 🔴 after 2 retries,
   re-verify failing twice, or end of run.
6. **Don't commit autonomously.** End the run with a summary of changes;
   the user asks for the commit.
7. **Cost guard.** Don't loop on paid third-party APIs. One sample per
   repro and per re-verify, max.

## Required prerequisites

1. Playbook preflight passed (tools, dev server port confirmed, login).
2. **Bug list parsed.** Markdown file path or inline list. Each bug needs
   at minimum title + brief description. Repro hints help but aren't
   required.
3. **Upstream link strategy decided** (only if any bug fixes a separate
   package):
   - `pnpm link` between repos.
   - `file:../<pkg>` in package.json.
   - Workspace (already a monorepo).
   - Publish-and-bump (slowest; only if local link is impossible).
   Ask once at the start, remember for the run.

## Step 0 — Frame the run

Echo back:

```
Bug bash plan
=============
Bugs: <count>
Source: <path or "inline">
Upstream link strategy: <pnpm link / file: / workspace / publish / n-a>
Estimated paid-API calls: <count> (one per repro + one per re-verify)

Proposed order:
  1. <bug-1 title>
  2. <bug-2 title>
  ...

Bugs flagged for collapse (likely same root cause):
  - <bug-1> + <bug-5> — both about <area>; will investigate together.

Bugs flagged as not-bugs (feature gaps, design questions):
  - <bug-N> — looks like a feature request. Skip from this run?
```

Wait for "go" or edits.

## Step 1 — Per-bug loop

For each bug in the approved order:

### 1a. Reproduce

Drive the bug's steps (same procedure as `/core:repro-bug` Step 2,
playbook sections 4-6). Capture:
- `before/<bug-id>-actual.png`
- Console errors (verbatim).
- Failed network requests.

If **could not reproduce**: mark `CNR`, note what you tried, continue to
the next bug. Don't grind — flag for the user at the end.

### 1b. Root-cause (delegated)

Spawn `core:bug-investigator` with:
- The bug description.
- The captured evidence (screenshot paths, verbatim console + network).
- The relevant source paths (the upstream package's local checkout if
  applicable).
- Constraint: **don't propose a fix unless the cause is unambiguous.**
  Return root cause + 1-3 suggested fix scopes.

If it returns "unclear" or "multiple possible causes", surface to the
user — don't pick blind.

### 1c. Propose fix

```
Bug <id>: <title>
Root cause: <1-2 sentences from core:bug-investigator>
Proposed fix: <file:line> — <one-line scope>
Blast radius: <other call sites / tests affected>
```

Per invariant 5, apply immediately; the proposal is for the audit trail.

### 1d. Apply fix

Edit the file(s), then run the static gate and **paste its output** — a hook firing in
the background is not evidence. Detect `<pm>` per
`${CLAUDE_PLUGIN_ROOT}/references/package-manager.md`, then run, in order:

```bash
<pm> run typecheck && <pm> run lint && <pm> exec vitest run
```

Use the project's actual script names (first existing among `typecheck` / `type-check`
/ `tsc`, and `lint` / `lint:check` / `biome:check`; fall back to `<pm> exec tsc
--noEmit` when no typecheck script exists, and skip a check the project doesn't have).
Any failure: fix it and re-run the whole gate before proceeding — don't accumulate
broken state. Pre-existing failures in files this bug didn't touch are reported, not
fixed.

### 1d.5 Review the fix (`core:fix-reviewer`) — the gate

Before rebuild + re-verify, spawn `core:fix-reviewer` to second-read the
fix as a senior engineer who didn't write it. It constructs adversarial
"what if" scenarios the implementer probably didn't trace, walks the diff
against each, and returns a verdict.

Pass:
- The bug description (Step 1a evidence summary).
- The root cause from `core:bug-investigator`.
- The diff (`git diff` in the upstream package, or the in-place edits).
- The source paths the fix touches plus one level of callers.

Verdicts:

- 🟢 **OK** → continue to 1e.
- 🟡 **CONCERN** → log in the running narrative, continue to 1e. Concerns
  surface in the final report.
- 🔴 **BLOCKING** → loop back to 1c / 1d. Max **2 review-blocked retries**
  per bug; then mark `BLOCKED` and surface with the reviewer's findings.
  The user decides: ship as-is, accept as known issue, or escalate.

**Why this exists:** the implementer is committed to their solution after
an hour of debugging. A cold reviewer catches the patch-vs-fix
conflation, the unhandled adjacent input, the same-bug-different-door
risk — earlier than rebuild + re-verify alone.

**When to skip:** never pre-filter at the skill level. The reviewer
skips its scenario step on trivial diffs and returns 🟢 fast.

### 1e. Rebuild upstream (if applicable)

```
<pm> --filter <pkg> build       # or per project conventions
```

`<pm>` is the detected package manager
(`${CLAUDE_PLUGIN_ROOT}/references/package-manager.md`) — filter syntax varies, so use
the project's own build command when it has one.

Wait for build success. Then re-link (`<pm> link`, when the manager supports it) or
`<pm> install` in the consuming repo (`file:` dep). Restart the dev server (kill the
pid you started, restart) — Next.js often caches the old package code.

### 1f. Re-verify

Same browser steps as 1a (reuse the snapshot refs). Capture
`after/<bug-id>-fixed.png`. Assert the bug does NOT surface — same
evidence checks (no console error, no failed network).

- **Pass**: mark `FIXED`. Next bug.
- **Fail**: loop back to 1b, max **2 retries**. Then mark `BLOCKED` and
  surface before continuing.

## Step 2 — End-of-run aggregation

When every bug is FIXED, CNR, BLOCKED, or INVALID, print:

```
Bug bash results — <YYYYMMDD-HHmm>

| ID | Title | Status | Fix file | Notes |
|---|---|---|---|---|
| 1 | list filters reset on back navigation | FIXED | src/modules/places/hooks/use-place-filters.ts:42 | - |
| 2 | sheet scroll-lock leaks after dismiss | CNR | - | only reported on a slow network; could not force the race locally |
| 3 | pagination skips page 2 after refresh | BLOCKED | - | 2 retries failed; root cause uncertain |
```

## Step 3 — Documentation (parallel agents)

Prepare a per-bug context summary (repro evidence path, root cause, fix
diff, re-verify evidence path). Spawn three agents in parallel:

- **`core:bug-bash-reporter`**: full audit trail →
  `docs/bugs/BugBash-<ts>.md`.
- **`core:pr-writer`**: user-facing summary →
  `docs/pr/PR-<ts>-bug-bash-<n>-bugs.md`.
- **`core:changelog-writer`**: user-facing fixes only; skip internal
  cleanup.

Wait for all three.

## Step 4 — Hand-off

Print:
- Final results table.
- Paths to: bug-bash report, PR doc, changelog entries.
- `BLOCKED` and `CNR` bugs that need user attention.
- Suggested next step:
  - 100% FIXED → "Say the word and I'll commit the fix bundle."
  - Any BLOCKED → "Want me to escalate <bug> via
    `/core:debug-investigate`?"
  - Any CNR → "Want to update the bug list with what you'd need to
    repro?"

Do NOT close the browser. Do NOT run `git commit`.

## Edge cases

- **Two bugs share a root cause** → fix once, verify both. Note the
  collapse in the report.
- **A "bug" is intended behavior** → mark `INVALID`, explain, skip the
  fix. Don't argue with the report — surface the discrepancy.
- **Fixing bug N breaks bug M** → halt, surface immediately. The user
  decides whether to revert N or keep N+M as a chain.
- **Upstream rebuild takes >2 minutes** → `run_in_background: true`,
  keep planning; don't sleep-poll.
- **Bug requires a feature change, not a fix** → flag at Step 0
  ("not-bugs"); don't proceed here. Spawn `core:product-manager` if
  scoping is needed.
- **Test data must be created via UI** → create it as part of repro.
  Don't seed via DB.
- **Paid-API budget exceeded mid-run** → halt, report spend, ask.
