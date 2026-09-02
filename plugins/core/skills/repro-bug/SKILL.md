---
name: repro-bug
description: >
  Reproduce a single reported bug locally in the browser, capture evidence,
  and write a paste-ready bug ticket. The host drives Playwright MCP
  directly — no executor subagent. Triggered by `/repro-bug <description
  or URL>` or natural language: "reproduce this bug", "see if you can
  repro X", "is this still broken in the current build".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Repro bug

Single-bug reproduction loop. The host (Opus) drives the browser directly,
captures evidence, and produces a bug ticket the developer can paste into
GitHub Issues / Linear. No executor subagent dispatch — the host stays in
the driver's seat for browser work (per user feedback).

## When to use

- A user / customer / colleague reported a bug. You need to confirm it
  exists locally before opening a ticket or starting a fix.
- A previously closed bug needs re-verification ("is it really fixed?").
- A vague report needs to be turned into a concrete, paste-ready ticket
  with steps + evidence.

## When NOT to use

- You have a list of bugs to fix → `/bug-bash`.
- You're testing a branch / PR end-to-end → `/manual-test`.
- The bug is purely server-side with no UI surface → `/debug-investigate`
  and write the ticket manually from the trace.

## Strict invariants

1. **Reproduce in the browser, not the API.** The point is confirming
   the user's experience.
2. **Capture evidence at the moment of failure** — screenshot + console
   errors + 4xx/5xx network. Words alone are unauditable.
3. **If it doesn't reproduce, say so and stop.** Don't chase variations
   forever; ask the user for missing context.
4. **Drive Playwright MCP in the host context.** Do NOT dispatch an
   executor subagent.
5. **Don't propose a fix in this skill.** Mixing repro and fix breaks
   the audit trail. Spawn `bug-investigator` if root-cause is needed.
6. **Don't modify production data or call paid APIs in a loop.** Run
   the minimum to prove the bug exists.

## Required prerequisites

1. **Playwright MCP loaded.** If `mcp__playwright__*` tools aren't in
   the session, halt and ask the user to restart Claude Code.
2. **Dev server reachable.** `curl -sf http://localhost:<port>/<basePath>`
   returns 200. If not, start it via the project's dev script.
3. **Login works.** Halt if login fails — that's a different bug.

## Step 1 — Parse the report

Extract from the user's input:

- **Feature** — which page / collection / flow does this touch?
- **Expected** — what should happen?
- **Actual** — what happens instead?
- **Steps so far** — anything the reporter already tried?
- **Environment hints** — browser, locale, draft vs published, role?

Echo your understanding back in 3-4 lines. If anything critical is
missing (no clear repro path, ambiguous feature), ask **one focused
question** before driving the browser. Don't guess.

## Step 2 — Drive the browser (in-context)

Drive Playwright MCP directly:

1. `mcp__playwright__browser_resize` → 1440×900.
2. Navigate to login. Authenticate. Verify post-login URL.
3. `mcp__playwright__browser_snapshot` — baseline reference.
4. Walk the reported steps. Use **ref-based clicks** (from the snapshot),
   not coordinates.
5. Wait on **real signals** (`mcp__playwright__browser_wait_for` on text
   or network idle), not fixed sleeps.
6. At the moment the bug should surface:
   - Screenshot: `bug-<slug>-actual.png`.
   - Capture `mcp__playwright__browser_console_messages` filtered to errors.
   - Capture `mcp__playwright__browser_network_requests` filtered to 4xx/5xx.
7. Try **one** sensible variation if the first attempt didn't surface it
   (different locale, different draft state, refresh between steps).
   Then stop — don't grind.

## Step 3 — Decide the outcome

**Reproduced**: bug appeared as reported → continue to Step 4.

**Could not reproduce**: walked the steps, bug did not surface. Write a
"could not reproduce" report:
- What you tried (numbered, actual steps).
- What variations you attempted.
- What additional info you'd need to try again (env, role, timing,
  exact data).
Halt. Do NOT write a bug ticket — there's no confirmed bug.

**Reproduced differently from report**: bug exists, but the symptoms or
steps differ. Note the discrepancy in the ticket.

## Step 4 — Write the bug ticket

Write to `docs/bugs/Bug-<YYYYMMDD-HHmm>-<kebab-slug>.md`. Format paste-
ready for GitHub Issues / Linear (no machine-only markup):

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
- Locale / role / state: <if relevant>

## Evidence
- Screenshot: `<path>`
- Console errors:
  ```
  <verbatim>
  ```
- Failed network requests:
  - `POST /api/foo` → 500 (excerpt: `<body>`)

## Suspected scope
<file:line if obvious from console stack; otherwise "unknown — needs
bug-investigator">

## Notes
<anything else: discrepancy from report, intermittency, related behaviors>
```

## Step 5 — Hand-off

Print:
- Path to the bug ticket.
- One-line decision prompt: **"File this as-is, or want me to spawn
  `bug-investigator` for root cause first?"**

Do NOT close the browser — the user may want to inspect the failure state.

## Edge cases

- **Multi-step bug** → record each intermediate state as it happens;
  don't compress to a single end-state screenshot.
- **Intermittent bug** → run the path up to 3 times; report the success
  rate explicitly in the ticket.
- **Console-only bug (no UI symptom)** → still a bug. Capture console +
  network; note "no visible UI symptom" in Actual.
- **Bug requires test data not in current DB** → create the data via
  the UI as part of repro (the act of creating IS part of the repro).
- **Bug is in a third-party plugin / upstream package** → suspected-scope
  field should name the package; ticket goes in `docs/bugs/` regardless.
