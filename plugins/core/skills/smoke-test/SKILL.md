---
name: smoke-test
description: >
  Run a curated, version-controlled set of critical-path tests against
  the local dev environment. The matrix lives in the repo at
  `tests/manual/smoke.md` so it's stable across runs — same checks every
  time. Use after big changes, dependency bumps, plugin upgrades, or
  before merging to verify no critical regressions. Triggered by
  `/smoke-test` or "smoke test the app", "run the critical path checks",
  "is anything obviously broken".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Smoke test

Same critical-path checks every run. The host (Opus) drives Playwright MCP
directly. The matrix is checked into the repo so it evolves with the
codebase and is reviewable in PRs — not generated ad-hoc per run.

## When to use

- After a dependency bump (especially Payload, Next.js, plugins).
- After a large merge from another branch.
- Before opening a PR on a high-risk change.
- As a daily sanity check on `main`.

## When NOT to use

- Verifying a specific feature on a branch → `/manual-test` (diff-aware).
- Reproducing a specific bug → `/repro-bug`.
- Open-ended exploration → `/explore`.

## Strict invariants

1. **Run the matrix as-checked-in.** Don't add or skip rows ad-hoc — if
   the matrix is wrong, edit the file (and commit), don't drift the run.
2. **Halt on first failure.** Smoke tests are fast-feedback. Don't
   continue past a critical-path break.
3. **Drive Playwright in the host context.** No executor subagent.
4. **Treat console errors and 4xx/5xx network responses as failures**
   even if the UI looks fine.
5. **Screenshot every assertion** (pass or fail).
6. **Don't modify production data or hit paid third-party APIs in a
   loop.** One sample per test.

## Required prerequisites

1. **Playwright MCP loaded.**
2. **Matrix file exists** at `tests/manual/smoke.md` (or a path the user
   names). If missing, halt and offer to **scaffold** it (Step 0 below).
3. **Dev server reachable** at the project's dev URL.
4. **Login works** with test credentials.

## Step 0 — Scaffold the matrix (only if missing)

If `tests/manual/smoke.md` doesn't exist, halt the run and offer to
scaffold from current admin routes / collections / globals. Default
template:

```markdown
# Smoke matrix

| ID | Intent | Setup | Action | Expected | Evidence |
|---|---|---|---|---|---|
| S1 | Login works | none | Visit /admin/login, submit valid creds | Lands on admin dashboard, no console errors | `S1.png` |
| S2 | Each collection lists | logged in | Visit each /admin/collections/<slug> | Table renders, pagination works, no 5xx | `S2-<slug>.png` |
| S3 | Create-draft-publish round-trip | logged in | Create a doc in <pivotal collection>, save draft, publish | Doc visible on frontend route | `S3.png` |
| S4 | Each global page loads | logged in | Visit each /admin/globals/<slug> | Form renders, fields populated | `S4-<slug>.png` |
| S5 | Frontend critical pages render | logged out | Visit /, /<key-route> | 200 OK, no console errors, no broken images | `S5-<route>.png` |
```

Ask the user to review / commit before running. Don't auto-commit.

## Step 1 — Read the matrix

Parse `tests/manual/smoke.md`. If the table is malformed, halt with the
exact line number that failed to parse. Don't guess intent.

## Step 2 — Drive the matrix

For each row, in order:

1. Print `Running <ID>: <intent>` (one line).
2. Set up state via UI (navigate, click, type — same way a human would).
3. `mcp__playwright__browser_snapshot` to anchor refs.
4. Perform action via ref-based clicks.
5. Wait via `mcp__playwright__browser_wait_for` on a real signal.
6. Assert:
   - DOM matches Expected.
   - No new console errors (filter out third-party scripts by source URL).
   - No new 4xx/5xx network responses.
7. Screenshot evidence as `<id>-<pass|fail>.png` in
   `tests/manual/screenshots/<YYYYMMDD-HHmm>/`.
8. Record result.
9. **If FAIL: halt.** Do not continue to the next row.

## Step 3 — Report

Print a results table:

```
Smoke results — <YYYYMMDD-HHmm>

| ID | Status | Notes |
|---|---|---|
| S1 | PASS  | -    |
| S2 | PASS  | -    |
| S3 | FAIL  | Publish hangs — POST /api/posts/123 → 500 |
| S4 | SKIP  | (halted on S3 fail) |

Evidence: tests/manual/screenshots/<YYYYMMDD-HHmm>/
```

If any FAIL: print the failed row's full evidence (console errors verbatim,
network failure body excerpt). Do NOT close the browser — the user may
want to inspect. Do NOT propose a fix from this skill.

## Step 4 — Cleanup decision

Ask the user: **"Close browser and dev server? (y / leave open / continue
with /repro-bug on the failure)"**

## Edge cases

- **Matrix references a collection / route that no longer exists** →
  fail that row with `STALE_MATRIX`, surface in report. Smoke matrix
  drifts; the report is how you know to update it.
- **Login flow itself broke** → halt at Step 1 prereq, not in the matrix.
  That's a higher-level signal than any individual row.
- **Smoke matrix is too long** (>15 rows) → flag it. Smoke = fast
  feedback. Move long-tail checks into `/manual-test` or per-feature
  specs.
- **Concurrent smoke run** (two terminals) → don't try to handle. The
  matrix assumes a clean session. Tell the user to serialize.
