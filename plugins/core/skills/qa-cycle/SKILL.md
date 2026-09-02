---
name: qa-cycle
description: >
  Thin orchestrator that sequences /edge-bash → /bug-bash → /review with
  explicit human-triage gates between phases. Use for a full
  find-bugs → fix-bugs → review pass on a feature, surface area, or PR.
  Each phase produces an artifact (BugIndex, BugBash report, review
  report). User decides what to fix, what to defer, and whether 🔴
  review findings ship now. Triggered by `/qa-cycle <feature or surface>`
  or natural language: "full QA pass on X", "find + fix + review
  everything in this PR", "end-to-end QA cycle".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, Skill, AskUserQuestion, mcp__playwright__*, mcp__claude-in-chrome__*
---

# QA Cycle

Sequences the three existing QA skills with explicit gates between
them. **Not a replacement** for any of them — it's a guided pipeline.
You can still invoke `/edge-bash`, `/bug-bash`, `/review` directly when
you only want one phase.

The cycle is:

```
/edge-bash       →  Gate 1: triage      →  /bug-bash       →  Gate 2: confirm fixes  →  /review       →  Gate 3: act on findings
(find bugs)         (fix? defer?            (fix each bug)     (verify scope)             (review diff)    (🔴 must-fix vs ship)
                     not-a-bug?)
```

## When to use

- After completing a non-trivial feature, before commit.
- Before opening a PR on a meaningful surface area.
- When a surface has been changed in several places and you want one
  pass that finds → fixes → reviews everything.

## When NOT to use

- Single bug → `/repro-bug` then manual fix.
- Just want to find bugs (no fix this round) → `/edge-bash` directly.
- Just fixing a known bug list → `/bug-bash` directly.
- Just reviewing a PR → `/review` directly.

## Strict invariants

1. **Three gates, no skipping.** Each phase ends with a human-triage
   decision. Auto mode does NOT bypass these — they are the reason
   the cycle exists. (Auto mode minimizes interruptions for routine
   decisions; triage decisions are not routine.)
2. **Each phase's artifact persists.** `BugIndex-*.md`,
   `BugBash-*.md`, and the review report all stay on disk so the
   audit trail survives the cycle.
3. **Halt the loop on ambiguity.** If a phase produces zero output
   (edge-bash finds nothing, bug-bash has nothing to fix, review
   finds no issues), continue to the next phase with a clear note —
   don't terminate the whole cycle.
4. **Don't commit autonomously.** Per global CLAUDE.md, only the
   user commits. End the cycle with a summary and a suggested
   `/cz-commit` if everything passed.

## Required prerequisites

Verify the three sub-skills are installed:

```bash
test -f ${CLAUDE_PLUGIN_ROOT}/skills/edge-bash/SKILL.md && echo "edge-bash: OK" || echo "edge-bash: MISSING"
test -f ${CLAUDE_PLUGIN_ROOT}/skills/bug-bash/SKILL.md  && echo "bug-bash: OK"  || echo "bug-bash: MISSING"
test -f ${CLAUDE_PLUGIN_ROOT}/skills/review/SKILL.md    && echo "review: OK"    || echo "review: MISSING"
```

If any are missing, **stop immediately** and tell the user which.

Also verify Playwright MCP is loaded (edge-bash + bug-bash both drive
a browser). If missing, halt and ask the user to load it.

## Step 0 — Frame the cycle

Echo to the user:

```
QA cycle plan
=============
Target: <feature / surface / PR>
Phases:
  1. /edge-bash   — produce BugIndex of edge-case findings
  2. GATE 1       — triage which to fix
  3. /bug-bash    — per-bug repro → fix → re-verify loop
  4. GATE 2       — confirm fix scope
  5. /review      — parallel pre-PR code review on cumulative diff
  6. GATE 3       — act on findings (🔴 must-fix vs ship as-is)

Estimated time: 30-90 min depending on bug count.
Estimated paid-API calls (LLM-backed features only): <count>
```

Wait for "go" before starting. If the user says skip a phase ("just
edge-bash + review, skip bug-bash"), honor it — but record the skip
in the cycle log so the artifact set is complete.

## Step 1 — Phase 1: /edge-bash

Invoke the `edge-bash` skill via the `Skill` tool with the target
description as args. The skill produces
`docs/bugs/BugIndex-<YYYY-MM-DD>.md` and prints a summary.

When edge-bash exits, capture:
- Path to the BugIndex
- Count of findings by severity (🔴 / 🟡 / 📋)
- Whether discovery hit zero or hit the phase budget

If zero findings: print "Edge-bash found nothing. Skipping
bug-bash." and jump to Step 5.

## Step 2 — GATE 1: triage

Show the BugIndex summary to the user (count by severity + one-line
per bug). Ask:

```
Triage decisions for <N> findings:

| ID | Severity | Title | Decision? |

Options per bug: FIX / DEFER / NOT-A-BUG / NEED-DESIGN
```

Use `AskUserQuestion` for structured input. Wait for triage.

Then write `docs/bugs/Triage-<ts>.md` recording:
- Bugs selected for FIX (input to /bug-bash)
- Bugs DEFERRED with reason
- Bugs marked NOT-A-BUG with rationale
- Bugs needing DESIGN (escalate to user — these halt the cycle and
  hand off to `/build-arch` or product discussion)

If NEED-DESIGN bugs exist, halt the cycle and surface them. Don't
proceed silently.

## Step 3 — Phase 2: /bug-bash

Invoke the `bug-bash` skill via the `Skill` tool with the FIX-list
from Gate 1 as args. The skill runs its per-bug loop end-to-end
(per the user's `feedback_bug_bash_autonomy` memory: no per-fix
approval).

When bug-bash exits, capture:
- Final results table (FIXED / CNR / BLOCKED counts)
- Path to `docs/bugs/BugBash-<ts>.md`
- List of files modified

If any BLOCKED bugs remain: surface them — they may need
`/debug-investigate` or design discussion before the cycle can
proceed to review. Ask the user whether to continue to review on
the partial fixes or halt.

## Step 4 — GATE 2: confirm fix scope

Print the fix summary:

```
Bug-bash results
================
Fixed:    <N>
CNR:      <N>  (could not reproduce)
Blocked:  <N>  (escalated)

Files modified:
  - path/a.ts
  - path/b.tsx
  ...

Cumulative diff size: <lines added / removed>
```

Ask the user via `AskUserQuestion`:

```
Continue to /review on this diff?  CONTINUE / HALT / SKIP-REVIEW
```

- CONTINUE: proceed to Step 5.
- HALT: stop the cycle (user wants to inspect the diff manually).
- SKIP-REVIEW: jump to Step 6 with a note that review was skipped.

## Step 5 — Phase 3: /review

Invoke the `review` skill via the `Skill` tool. Pass the merge base
explicitly if the cycle started from a non-default branch.

`/review` produces a parallel-batch review report with findings
by severity (🔴 / 🟡 / 🔵). Capture:
- The full report
- 🔴 count, 🟡 count, 🔵 count
- Whether linter passed inside the review

## Step 6 — GATE 3: act on review findings

Print the review summary. Ask via `AskUserQuestion`:

```
Review findings:
  🔴 <N> blocking
  🟡 <N> should-fix
  🔵 <N> nice-to-have

Next?  FIX-RED-NOW / FIX-ALL-NOW / SHIP-AS-IS / DEFER-TO-PR-COMMENTS
```

- FIX-RED-NOW: invoke `/fix-after-review` on 🔴 only.
- FIX-ALL-NOW: invoke `/fix-after-review` on 🔴 + 🟡.
- SHIP-AS-IS: end the cycle, suggest `/cz-commit`.
- DEFER-TO-PR-COMMENTS: end the cycle, suggest `/cz-commit` + open
  PR — review findings become PR comments the user addresses post-
  open.

## Step 7 — Cycle hand-off

Print the final summary:

```
QA cycle complete — <ts>
========================
Target: <feature / surface>

Phase 1 (edge-bash):  found <N> bugs → BugIndex: <path>
Triage:               fix=<N>, defer=<N>, not-a-bug=<N>
Phase 2 (bug-bash):   fixed=<N>, CNR=<N>, blocked=<N>
                      BugBash: <path>
Phase 3 (review):     🔴=<N>, 🟡=<N>, 🔵=<N>
Post-review action:   <FIX-RED-NOW / FIX-ALL-NOW / SHIP-AS-IS / DEFER>

Files modified (cumulative diff):
  - ...

Next steps:
  - Suggested: `/cz-commit` to commit the cycle's work
  - If BLOCKED bugs remain: `/debug-investigate <bug>`
  - If 🔴 review findings deferred: open a follow-up ticket
```

Do NOT run `git commit`. Do NOT close the browser if Playwright is
still mid-flight (the user might want to keep poking).

## Edge cases

- **edge-bash finds zero bugs** → skip bug-bash + gate 1, proceed
  straight to review on the existing diff (if any). Useful for
  "regression sanity" runs.
- **bug-bash blocks on every bug** (rare) → halt at Gate 2, surface
  to the user, suggest `/debug-investigate` per blocked bug.
- **review has no findings** → end the cycle clean, suggest
  `/cz-commit`.
- **User wants to re-run a phase** (e.g., "run edge-bash again after
  the fixes") → the cycle is single-shot per invocation; ask the
  user to re-invoke `/qa-cycle` or `/edge-bash` separately. Don't
  loop internally.
- **Paid-API budget concern** → before each phase, print the
  estimated paid-API call count and ask the user to ack. Don't burn
  budget silently.
- **Long-running phase** (>30 min) → keep working; the host gets
  notifications as background work completes. Don't sleep-poll.

## Why this exists

`/edge-bash`, `/bug-bash`, `/review` are each excellent at their
phase but each has a triage decision the user must make. Without an
orchestrator, the user has to remember the sequence, run each
manually, and stitch the artifacts together. With this skill the
cycle runs end-to-end but pauses at the gates that genuinely need
input — no auto-commit, no silently-shipped findings.

For a pure feature-build cycle (write code, not find bugs), use
`/build` or `/build-arch` instead.
