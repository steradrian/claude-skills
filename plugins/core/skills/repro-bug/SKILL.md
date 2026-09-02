---
name: repro-bug
description: >
  Reproduce a single reported bug locally in the browser, capture
  evidence, and write a paste-ready bug ticket. The orchestrator drives
  Playwright MCP directly. Triggered by "reproduce this bug", "see if you
  can repro X", "is this still broken in the current build", "turn this
  report into a ticket".
argument-hint: <bug description, report excerpt, or URL>
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Repro bug

Single-bug reproduction loop. The orchestrator drives the browser,
captures evidence, and produces a bug ticket that pastes straight into a
GitHub issue.

**No-browser mode:** if Playwright / Chrome tools are not available (cloud
session), stop before Step 2. You may still parse the report (Step 1) and
read the suspected code, but the outcome is `NOT ATTEMPTED`, not "could
not reproduce". Report which static checks ran. Never claim a screenshot
was taken.

**Preflight: follow `${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`.**

## When to use

- A user / customer / colleague reported a bug. Confirm it exists locally
  before opening a ticket or starting a fix.
- A previously closed bug needs re-verification ("is it really fixed?").
- A vague report needs to become a concrete, paste-ready ticket with
  steps + evidence.

## When NOT to use

- A list of bugs to fix → `/core:bug-bash`.
- Testing a branch / PR end to end → `/core:manual-test`.
- Purely server-side bug with no UI surface → `/core:debug-investigate`
  and write the ticket from the trace.

## Strict invariants

1. **Reproduce in the browser, not the API.** The point is confirming the
   user's experience.
2. **Capture evidence at the moment of failure** — screenshot + console
   errors + 4xx/5xx network. Words alone are unauditable.
3. **If it doesn't reproduce, say so and stop.** Don't chase variations
   forever; ask the user for missing context.
4. **The orchestrator drives in-context** per the playbook.
5. **Don't propose a fix here.** Mixing repro and fix breaks the audit
   trail. Spawn `core:bug-investigator` if root cause is needed.
6. **Don't modify production data or call paid APIs in a loop.** Run the
   minimum to prove the bug exists.

## Required prerequisites

Playbook preflight passed (tools, dev server port confirmed, login). If
login itself fails, halt — that's a different bug.

## Step 1 — Parse the report

Extract:

- **Feature** — which page / route / flow?
- **Expected** — what should happen?
- **Actual** — what happens instead?
- **Steps so far** — anything the reporter already tried?
- **Environment hints** — browser, viewport, locale, auth state, role?

Echo your understanding back in 3-4 lines. If anything critical is
missing (no clear repro path, ambiguous feature), ask **one focused
question** before driving. Don't guess.

## Step 2 — Drive the browser (in-context)

Playbook sections 2-6, plus:

1. Walk the reported steps exactly, ref-based, waiting on real signals.
2. At the moment the bug should surface:
   - Screenshot: `bug-<slug>-actual.png`.
   - Console errors (filtered to project code).
   - Failed network requests (4xx/5xx).
3. Try **one** sensible variation if the first attempt didn't surface it
   (different locale, viewport, refresh between steps). Then stop —
   don't grind.

## Step 3 — Decide the outcome

**Reproduced**: bug appeared as reported → Step 4.

**Could not reproduce**: write a "could not reproduce" note —
- What you tried (numbered, actual steps).
- Which variation you attempted.
- What you'd need to try again (env, role, timing, exact data).
Halt. No ticket — there's no confirmed bug.

**Reproduced differently from report**: bug exists, but symptoms or
steps differ. Note the discrepancy in the ticket.

## Step 4 — Write the bug ticket

Write to `docs/bugs/Bug-<YYYYMMDD-HHmm>-<kebab-slug>.md`, paste-ready
for a GitHub issue (no machine-only markup):

```markdown
# <one-line title — what's broken, in user terms>

## Summary
<1-2 sentences. What's broken, who hits it, why it matters.>

## Steps to reproduce
1. <numbered, exact, copy-pastable>
2. ...

## Expected
<what should happen>

## Actual
<what happens instead>

## Environment
- Branch: <git branch> @ <git short SHA>
- URL: <where it happened>
- Browser: Playwright Chromium <version>
- Viewport / locale / role / state: <if relevant>

## Evidence
- Screenshot: `<path>`
- Console errors:
  ```
  <verbatim>
  ```
- Failed network requests:
  - `POST /api/foo` → 500 (excerpt: `<body>`)

## Suspected scope
<file:line if obvious from the console stack; otherwise "unknown — needs
core:bug-investigator">

## Notes
<discrepancy from report, intermittency, related behaviors>
```

## Step 5 — Hand-off

Print:
- Path to the bug ticket.
- One-line decision prompt: **"File this as-is, or spawn
  `core:bug-investigator` for root cause first?"**

Do NOT close the browser — the user may want to inspect the failure
state.

## Edge cases

- **Multi-step bug** → record each intermediate state as it happens;
  don't compress to a single end-state screenshot.
- **Intermittent bug** → run the path up to 3 times; report the success
  rate in the ticket.
- **Console-only bug (no UI symptom)** → still a bug. Capture console +
  network; note "no visible UI symptom" under Actual.
- **Bug needs data not in the current DB** → create it via the UI as
  part of the repro.
- **Bug is in an upstream package** → name the package under Suspected
  scope; the ticket still goes in `docs/bugs/`.
