---
name: explore
description: >
  Time-boxed exploratory testing of a feature, page, or flow. Curious-user
  mode — looks for bugs, UX smells, dead ends. No fixed matrix, no specific
  bug to reproduce — just kick the tires. Triggered by "explore this
  feature", "be a curious user in X", "kick the tires on Y", "look for
  bugs in the editor".
argument-hint: <page, route, or flow to explore> [--minutes N | --findings N]
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Explore

**Target to explore: $ARGUMENTS** (also carries any `--minutes N` / `--findings N`
budget — parse it out of the same string).

Open-ended browser exploration. The point is what you find when nobody
told you what to look for: empty states nobody designed, error messages
nobody worded, layouts that break at one specific size, focus lost on
re-render, the second click that does nothing.

Different from `/core:manual-test` (matrix-driven, branch-aware) and
`/core:repro-bug` (specific known bug). Use this when "test it" is too
vague and a curious user is the right tool.

**No browser tools available (cloud session)?** Follow the no-browser rule in
`${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`: static checks only, say so,
never claim a screenshot. Here the drive loop is Step 2 — and there is no static
substitute for exploration, so say that too rather than substituting a code read.

**Preflight: follow `${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`.**

## When to use

- Just finished building a feature; the user wants a curious-user pass
  before merge.
- Before a demo, sanity-check the path you'll click through.
- A teammate says "something feels off in X" — go find what.
- After a dependency upgrade, before declaring it safe.

## When NOT to use

- You have specific tests in mind → write them as a matrix and run
  `/core:manual-test --matrix <path>`.
- You have a specific bug → `/core:repro-bug`.
- You want fast, repeatable feedback → `/core:manual-test --matrix` is
  faster (fixed matrix).

## Strict invariants

1. **Time-box every run.** Default 10 minutes OR 10 distinct findings,
   whichever first. Exploration without a budget is rabbit-holing.
2. **The orchestrator drives in-context** per the playbook.
3. **Capture findings as you go**, not at the end. One screenshot + one
   line per finding. End-of-run summarization loses detail.
4. **Don't propose fixes.** Discovery only — fixing belongs in
   `/core:build` or `/core:debug-investigate` after the report is read.
5. **Don't modify production data or call paid APIs in a loop.**

## Required prerequisites

1. Playbook preflight passed (tools, dev server port confirmed, login —
   most targets are behind auth).
2. **Area is named** — route, page, or flow. If the user said "explore
   everything", push back: too broad, pick one.

## Step 1 — Frame the exploration

Restate in 2-3 lines:
- **Area**: `<page / route / flow>`.
- **Lens**: golden path, edge cases, accessibility, performance, or
  "anything off". Default: "anything off".
- **Budget**: `<minutes or finding count>`.

Ask **one** focused question if the area is genuinely ambiguous. Don't
ask permission to start — frame and go.

## Step 2 — Drive the exploration

Open the browser, log in, navigate to the area. Then act curious — the
things a careful user would try and the things a careless one would:

**Inputs**
- Empty submission.
- Very long string (1000+ chars).
- Special characters (emoji, RTL, zero-width, quotes, backslashes).
- Whitespace-only.
- Numbers in text fields, text in number fields.
- Same value submitted twice (idempotency).

**Navigation**
- Browser back mid-flow.
- Refresh on an unsaved state.
- Two tabs editing the same record.
- Locale switch mid-edit.
- A stale link after the underlying item was deleted or moved.
- Open a sheet / drawer / dialog, dismiss, reopen — is state retained?

**Visual / interaction**
- Resize to mobile (375px). Anything broken?
- Toggle dark mode if available.
- Tab through every focusable element. Focus visible? Order sensible?
- Hover everything; missing tooltips on icon-only controls?

**Async / state**
- After a successful save, what happens to the form? Stays open? Resets?
  Disabled?
- Slow network (if you can throttle the route): does the UI handle lag,
  or does it look broken?
- Trigger an error path and a success path back to back — does state
  leak?

## Step 3 — Capture findings

For every finding (bug, smell, question):

```
[<severity>] <one-line title>
- Where: <URL or step>
- What: <what you saw>
- Expected (your read): <what you thought should happen>
- Evidence: <screenshot path>
```

Severities:
- 🔴 **Bug** — broken behavior, console error, 5xx, data loss, broken
  layout.
- 🟡 **UX smell** — works, but confusing, inconsistent, or rough
  (missing empty state, no loading indicator, awkward error copy).
- 💬 **Question** — not obviously a bug, but unclear or worth asking the
  designer / PM.

When you hit the budget, **stop**. Don't keep clicking because there
might be more.

## Step 4 — Write the findings report

Write to `docs/explore/Explore-<YYYYMMDD-HHmm>-<area-slug>.md`, grouped
by severity, exec summary at the top:

```markdown
# Explore: <area>

**When:** <ISO timestamp>
**Lens:** <e.g. "anything off">
**Budget:** <10 min / 10 findings>
**Scope:** <area covered>

## Summary
<3 lines max — what the area does well, the worst issue, overall vibe>

## 🔴 Bugs (N)
<one block per finding, Step 3 format>

## 🟡 UX smells (N)
<one block per finding>

## 💬 Questions (N)
<one block per finding>

## Coverage notes
<what you didn't get to and why — time, blocked by another bug, out of
scope>
```

## Step 5 — Hand-off

Print:
- Path to the report.
- Top 3 findings (severity + title) inline.
- Budget status: `<n>/<budget> findings` or `<n> minutes used`.

Ask: **"Open `/core:repro-bug` on any of these, file as-is, or move
on?"**

Don't close the browser unless the user says so.

## Edge cases

- **Area has no UI (pure backend)** → wrong skill. Route to
  `/core:debug-investigate` or unit tests.
- **Login broken** → halt at preflight. Different bug.
- **Critical bug 30 seconds in** → finish capturing evidence, then ask
  whether to keep exploring or pivot to `/core:repro-bug`. Don't
  auto-pivot.
- **Findings past 15** → stop and report. Signal is saturated; more
  findings don't help triage.
