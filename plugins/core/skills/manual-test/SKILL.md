---
name: manual-test
description: >
  Senior manual-tester driving a real browser end-to-end against the local
  dev environment for the current branch / PR. Indexes every feature in the
  change-set, builds a tiered test matrix (golden / coverage / edge), then
  drives Playwright MCP through it — clicking, typing, watching console +
  network, screenshotting every assertion. `--matrix <path>` runs a
  pre-written, version-controlled matrix instead of generating one — the
  repeatable smoke pass. Designed for changes whose failure modes are invisible to
  `tsc`, unit tests and `next build`: multi-step user flows, third-party
  integrations, async behavior. Triggered by "manually test this PR
  end-to-end", "be my QA agent", "test every flow in the browser", "smoke
  test the app", "is anything obviously broken".
argument-hint: '[PR_URL | "current branch"] [--matrix <path>]'
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Manual test

**Target: $ARGUMENTS** (empty → the current branch).

End-to-end manual QA for the current branch or PR. The orchestrator indexes
the change-set, builds a tiered matrix, then drives Playwright MCP through
it in-context — capturing screenshots, console output and network failures
as evidence.

**No browser tools available (cloud session)?** Follow the no-browser rule in
`${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`: static checks only, say so,
never claim a screenshot. Here the drive loop is Step 3 — Steps 1-2 still run.

**Preflight: follow `${CLAUDE_PLUGIN_ROOT}/references/browser-playbook.md`.**

## Modes

| Invocation | Behaviour |
|---|---|
| `/core:manual-test [PR_URL \| "current branch"]` | Diff-aware. Index the change-set, generate a tiered matrix, drive it. |
| `/core:manual-test --matrix <path>` | Fixed matrix. Skip Steps 1-2, parse the file, run it as checked in. Use after dependency bumps, big merges, or as a sanity check on `main`. |

## When to use

- The change touches multi-step user flows, third-party SDKs, async
  workflows or anything whose failure modes don't surface in `tsc` / unit
  tests.
- A review bot validated only the static read of the diff (e.g.
  `/core:resolve-pr-comments`); the runtime contract still needs exercising.
- You're about to merge and want a sign-off pass the user explicitly asked
  for (they test the UI themselves for routine edits).
- `--matrix`: same critical-path checks every run, reviewable in PRs.

## When NOT to use

- Pure refactors with full unit/integration coverage. Run those instead.
- Build / typecheck / lint failures. Fix those first.
- Pipeline-only changes (CI YAML, migrations without runtime surface).
- Single bug to reproduce → `/core:repro-bug`.
- Open-ended exploration → `/core:explore`.
- Iterative edge-case hunting → `/core:edge-bash`.
- Multi-bug fix loop → `/core:bug-bash`.

## Strict invariants

1. **Drive the actual UI**, not the API. The point is what the API alone
   won't catch: layout breakage, sheet/drawer z-index, focus loss on
   re-render, wrong state after navigation, console errors only triggered
   by interaction, wrong request bodies fired from the form.
2. **Test every feature in the index**, not a sample.
3. **Console errors and 4xx/5xx are failures** even if the UI looks fine.
4. **Screenshot every assertion** — pass and fail.
5. **Never seed data via the DB.** Create it through the UI.
6. **Halt on the first blocker** and **halt on the first FAIL** — capture
   evidence, stop the matrix, ask the user whether to continue, fix, or
   call it.
7. **The orchestrator drives in-context.** If a run is long enough to
   dispatch an executor subagent, cap each dispatch at 5-7 tests —
   executors truncate around ~73K tokens — and treat screenshots as the
   evidence, not a JSON result blob.
8. **Cost guardrails**: no production data; no paid third-party APIs in a
   loop. One sample per feature unless the matrix says otherwise.
9. `--matrix`: **run the matrix as checked in.** Don't add or skip rows
   ad hoc — if the matrix is wrong, edit the file, don't drift the run.

## Step 1 — Index the change-set (skip in `--matrix` mode)

Read every commit unique to the branch (or the PR if given a URL). For
each commit list:
- Routes touched — build a route inventory from `app/**/page.tsx` or
  `src/app/**/page.tsx` (plus layouts, `loading.tsx`, `error.tsx`).
- Modules / components / hooks changed (`src/modules/**`, `src/components/**`).
- Third-party integrations involved.
- New endpoints, server actions, or data-fetching hooks.
- UI surface: which screens, which interactive surfaces (form, drawer,
  sheet, filter, pagination, dialog).

Output a flat index — one row per discrete feature or fix, not per commit.
Show it to the user; they may add or trim.

## Step 2 — Build the test matrix (skip in `--matrix` mode)

Three tiers, executed in order. **Do NOT skip Tier B for time** — that's
where regressions live.

| Tier | Scope | Stop here only if |
|---|---|---|
| **A — golden path** | One representative test per major feature | Every Tier A test passes AND the user says "skip B/C" |
| **B — coverage** | Every route × every interactive surface (form, drawer, sheet, filter, pagination), every changed route, every conditional-rendering rule | Always run unless the user opts out |
| **C — edge cases** | Empty / null / very-long / special-char inputs, permission boundaries, concurrent ops, sheet/drawer z-index, mobile viewport, locale switching | Run on changes touching UI and forms |

For each test, define **before running**:
- **ID**: `A1`, `A2`, …, `B1`, …, `C1`, … (stable).
- **Setup**: required state (e.g. "logged in, one saved item in the list").
- **Action**: exact UI steps.
- **Expected**: what the user sees + what must NOT appear in console /
  network.
- **Evidence**: `<id>-<pass|fail>.png`.

Show the matrix as a markdown table. **Wait for "go"** before driving.

## Step 2b — `--matrix` mode: read the file

Parse the matrix at the given path (convention: `tests/manual/smoke.md`).
Expected columns: `ID | Intent | Setup | Action | Expected | Evidence`. If
the table is malformed, halt with the exact line number. Don't guess
intent.

If the file is missing, halt and offer to scaffold it. Generic example
(adapt to the project's real routes; never auto-commit it):

```markdown
# Smoke matrix

| ID | Intent | Setup | Action | Expected | Evidence |
|---|---|---|---|---|---|
| S1 | Home renders | logged out | Visit `/` | 200, hero + nav visible, no console errors, no broken images | `S1.png` |
| S2 | List page loads | logged out | Visit `/<list-route>`, page through results | Cards render, pagination works, no 5xx | `S2.png` |
| S3 | Detail page loads | from S2 | Click first card | Detail renders, back nav returns to same list position | `S3.png` |
| S4 | Drawer / sheet opens | on S3 | Open the primary sheet/drawer, dismiss it | Opens above content, focus trapped, dismisses cleanly, no scroll lock leak | `S4.png` |
| S5 | Login works | logged out | Visit login, submit valid creds | Lands on the expected post-login route, no console errors | `S5.png` |
| S6 | Form submit round-trip | logged in | Fill the key form, submit | Success state shown, request 2xx, data visible on reload | `S6.png` |
```

Matrix hygiene:
- A row referencing a route that no longer exists → fail it as
  `STALE_MATRIX` and surface it in the report.
- More than ~15 rows → flag it. A fixed matrix is fast feedback; long-tail
  checks belong in the diff-aware mode or per-feature specs.

## Step 3 — Drive the matrix (in-context)

Playbook sections 2-6 apply. Screenshots go to
`tests/manual/screenshots/<YYYYMMDD-HHmm>/`.

For each row in order (A1 → … → B1 → … → C1 → …, or S1 → … in matrix
mode):
1. Print `Running <ID>: <intent>` (one line).
2. Set up state via the UI.
3. Snapshot, act via refs, wait on a real signal.
4. Assert DOM / console / network per the playbook. Async work: poll for
   the work-product, max 30s.
5. Screenshot `<tier>-<num>-<id>-<pass|fail>.png`.
6. Record the result.
7. **If FAIL: HALT.** Capture full evidence and go to Step 4.

### Senior-tester mindset
- Look for what's **missing**, not just what's broken: empty states,
  loading states, the path you don't take.
- Cosmetic regressions are bugs: alignment, focus rings, dark-mode
  contrast, icon truncation.
- Run the same flow twice when feasible to catch state-leak bugs.
- Click around the change, not just on it — the page a new field lives on,
  the form it submits, the validation it triggers.
- Boundaries: first item, last item on a paginated list, the empty list.
- Undo/redo, back button, refresh. State that survives these is state the
  user trusts.

## Step 4 — Write the report

Diff-aware mode: `manual-test-report-<branch>-<YYYYMMDD-HHmm>.md`.
Matrix mode: print the results table inline.

- **Summary line**: `<passed>/<total> passed, <failed> failed, <skipped>
  skipped`.
- **Per-tier / per-row table** with PASS / FAIL / SKIP / STALE_MATRIX.
- **Failure details**, one section per failed test: what was tested,
  numbered repro steps, console errors verbatim, failed requests
  (method, URL, status, body excerpt), screenshot path, suspected root
  cause in 1-2 sentences (cross-reference `git log -p` if unclear).
- **Coverage gaps** — anything in the index not covered, with reason.
- **Spend** — count of paid-API calls.

```
Results — <YYYYMMDD-HHmm>

| ID | Status | Notes |
|---|---|---|
| S1 | PASS | - |
| S3 | FAIL | Detail never loads — GET /api/items/123 → 500 |
| S4 | SKIP | (halted on S3) |

Evidence: tests/manual/screenshots/<YYYYMMDD-HHmm>/
```

If the matrix halted on a FAIL, ask **one focused question**: "continue
the matrix, fix the bug first, or call it?" Then act. Do NOT propose a
fix from inside this skill.

## Step 5 — Cleanup

Playbook section 8. In matrix mode, ask before closing: **"Close browser
and dev server? (y / leave open / continue with `/core:repro-bug` on the
failure)"**. If running inside a worktree, leave it — the report should be
committable.

## Edge cases

- **Browser tools not loaded** → no-browser mode, see top. Don't fall back
  silently.
- **Unexpected dev port / basePath** → playbook section 1; never assume.
- **401 mid-session** → capture cookie state in the report.
- **Async background jobs** → poll on a real signal, not fixed sleep.
- **Paid LLM / API in the test path** → log every call, one sample per
  feature. If the user asks for "thorough" but is paying, propose Tier A
  first with a cost estimate for B/C.
- **Console error from a third-party script** → filter by source URL.
- **PR diff is empty** → say so; don't manufacture a matrix.
- **Concurrent runs** (two terminals) → not supported; tell the user to
  serialize.

## Notes

- Runs **alongside** `/core:resolve-pr-comments`, not in series — that
  skill validates static review feedback; this one validates runtime
  behavior bots can't see.
- The report is meant to live in the PR description or a PR comment.
- If the run surfaces a real bug, do NOT fix it here — surface it and let
  the user decide (this PR or a follow-up). For a multi-bug fix loop,
  escalate to `/core:bug-bash`.
