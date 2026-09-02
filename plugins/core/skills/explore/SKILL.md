---
name: explore
description: >
  Time-boxed exploratory testing of a feature, page, or flow.
  Curious-user mode — looks for bugs, UX smells, dead-ends. The host
  drives Playwright MCP directly. No fixed matrix, no specific bug to
  reproduce — just kick the tires. Triggered by `/explore <area>` or
  natural language: "explore this feature", "be a curious user in X",
  "kick the tires on Y", "look for bugs in the editor".
disable-model-invocation: true
allowed-tools: Read, Bash, Glob, Grep, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Explore

Open-ended browser exploration. The point is what you find when nobody
told you what to look for: empty states nobody designed, error messages
nobody worded, layouts that break at one specific size, focus you lose
on re-render, the second click that does nothing.

Different from `/manual-test` (matrix-driven, branch-aware) and
`/repro-bug` (specific known bug). Use this when "test it" is too vague
and a curious user is the right tool.

## When to use

- Just finished building a feature; want a curious-user pass before merge.
- Before a demo, sanity-check the path you'll click through.
- A teammate says "something feels off in X" — go find what.
- After a dependency / plugin upgrade, before declaring it safe.

## When NOT to use

- You have specific tests in mind → write them as a matrix and use
  `/smoke-test` or `/manual-test`.
- You have a specific bug → `/repro-bug`.
- You want fast feedback only → `/smoke-test` is faster (fixed matrix).

## Strict invariants

1. **Time-box every run.** Default 10 minutes OR 10 distinct findings,
   whichever first. Exploration without a budget is rabbit-holing.
2. **Drive Playwright in the host context.** No executor subagent.
3. **Capture findings as you go**, not at the end. One screenshot + 1-line
   note per finding. End-of-run summarization loses detail.
4. **Don't propose fixes.** This is a discovery skill — fixing belongs
   in `/build` or `/debug-investigate` after the report is read.
5. **Don't modify production data or call paid APIs in a loop.**

## Required prerequisites

1. **Playwright MCP loaded.**
2. **Dev server reachable.**
3. **Login works.** (Most exploration targets are behind auth.)
4. **Area to explore** is named — collection slug, page route, flow
   name. If the user said "explore everything", push back: too broad,
   pick one.

## Step 1 — Frame the exploration

Restate in 2-3 lines:
- **Area**: `<page / collection / flow>`.
- **Lens**: golden path, edge cases, accessibility, performance, or
  "anything off". Default: "anything off".
- **Time budget**: `<minutes or finding count>`.

Ask **one** focused question if the area is genuinely ambiguous. Don't
ask for permission to start — just frame and go.

## Step 2 — Drive the exploration

Open browser, log in, navigate to the area. Then act curious. Try the
things a careful user would and the things a careless user would:

**Inputs to try**
- Empty submission.
- Very long string (1000+ chars).
- Special characters (emoji, RTL, zero-width, quotes, backslashes).
- Whitespace-only.
- Numbers in text fields, text in number fields.
- Same value submitted twice (idempotency).

**Navigation patterns**
- Browser back button mid-flow.
- Refresh on a draft / unsaved state.
- Two tabs editing the same doc.
- Locale switch mid-edit.
- Click a stale link after the underlying doc moved.
- Open a modal, then click outside; reopen — is state retained?

**Visual / interaction**
- Resize to mobile viewport (375px). Anything broken?
- Toggle dark mode if available.
- Tab through every focusable element on the page. Focus visible? Order
  sensible?
- Hover everything; check for missing tooltips on icons.

**Async / state**
- After a successful save, what happens to the form? Stays open? Resets?
  Disabled?
- Network throttle (if Playwright supports it for the route): slow → does
  the UI handle the lag, or does it look broken?
- Trigger an error path and a success path back to back — does state leak?

## Step 3 — Capture findings

For every finding (bug, smell, question), record:

```
[<severity>] <one-line title>
- Where: <URL or step>
- What: <what you saw>
- Expected (your read): <what you thought should happen>
- Evidence: <screenshot path>
```

Severities:
- 🔴 **Bug** — broken behavior, console error, 5xx, data loss, broken layout.
- 🟡 **UX smell** — works, but confusing, inconsistent, or rough (missing
  empty state, no loading indicator, awkward error message).
- 💬 **Question** — not obviously a bug, but unclear or worth asking
  the designer / PM about.

If you've hit your time / count budget, **stop**. Don't keep clicking
just because there might be more.

## Step 4 — Write the findings report

Write to `docs/explore/Explore-<YYYYMMDD-HHmm>-<area-slug>.md`. Group
findings by severity. Top of file = exec summary in 3 lines:

```markdown
# Explore: <area>

**When:** <ISO timestamp>
**Lens:** <e.g., "anything off">
**Budget:** <10 min / 10 findings>
**Scope:** <area covered>

## Summary
<3 lines max — what the area is doing well, what's the worst issue,
overall vibe>

## 🔴 Bugs (N)
<one block per finding, format from Step 3>

## 🟡 UX smells (N)
<one block per finding>

## 💬 Questions (N)
<one block per finding>

## Coverage notes
<what you didn't get to and why — time, blocked by another bug, out of scope>
```

## Step 5 — Hand-off

Print:
- Path to the report.
- Top 3 findings (severity + title) inline so they're visible without
  opening the file.
- Budget status: `<n>/<budget> findings` or `<n> minutes used`.

Ask: **"Open `/repro-bug` on any of these, file as-is, or move on?"**

Don't close the browser unless the user says so.

## Edge cases

- **Area has no UI to explore (pure backend)** → wrong skill. Route to
  `/debug-investigate` or unit tests.
- **Login broken** → halt at prereqs. Different bug.
- **Found a single critical bug 30 seconds in** → finish capturing
  evidence on it, then ask the user whether to keep exploring or pivot
  to `/repro-bug`. Don't auto-pivot.
- **Findings list grows past 15** → stop and report. The signal is
  saturated; more findings don't help triage.
