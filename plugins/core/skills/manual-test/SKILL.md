---
name: manual-test
description: >
  Senior manual-tester driving a real browser end-to-end against the
  local dev environment for the current branch / PR. Indexes every
  feature in the change-set, builds a tiered test matrix
  (golden / coverage / edge), then drives Playwright MCP through it —
  clicking, typing, watching console + network, taking screenshots as
  evidence. The host (Opus) drives the browser directly; no executor
  subagent. Designed for changes whose failure modes are invisible to
  `tsc`, unit tests, and `next build`: third-party plugin integrations,
  admin UIs, multi-step user flows, real-time / async behavior. Triggered
  by `/manual-test [PR_URL or "current branch"]` or natural language
  like "manually test this PR end-to-end", "be my QA agent", "test every
  flow in the browser".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Manual test

End-to-end manual QA for the current branch or PR. The host (Opus)
indexes the change-set, builds a tiered matrix, then drives Playwright
MCP through it in-context — capturing screenshots, console output, and
network failures as evidence. No executor subagent dispatch (per user
feedback: host stays in the driver's seat for browser work; subagent
dispatch hurts visibility and feels like the assistant is stuck).

## When to use

- The change touches admin UIs, plugin integrations, async workflows, or
  third-party SDKs whose failure modes don't surface in `tsc` / unit
  tests.
- A code review bot validated only the static read of the diff (e.g.
  `/resolve-pr-comments`); the runtime contract still needs to be
  exercised.
- You're about to merge and want a human-quality sign-off pass without
  blocking on a human.

## When NOT to use

- Pure refactors with full unit/integration test coverage. Run those
  instead.
- Build / typecheck / lint failures. Fix those before exercising
  runtime.
- Pipeline-only changes (CI YAML, migrations without runtime surface).
- Single bug to reproduce → `/repro-bug`.
- Non-PR-scoped sanity check → `/smoke-test`.
- Open-ended exploration → `/explore`.
- Multi-bug fix loop → `/bug-bash`.

## Strict invariants

1. **Drive the actual UI**, not the API. The point is to catch what the
   API alone won't: layout breakage, modal z-index, focus loss on
   re-render, wrong state after navigation, console errors only
   triggered by interaction, network calls fired with wrong payloads
   from the form.
2. **Test every feature listed in the index**, not a sample. Senior
   testers don't shortcut coverage.
3. **Treat console errors and 4xx/5xx network responses as test
   failures**, even if the UI "looks fine". Capture and surface them in
   the report.
4. **Take a screenshot at every assertion** — pass and fail.
   Screenshots are the proof; words alone are unauditable.
5. **Never invent test data via the DB**. If a test needs a doc, create
   it through the UI — the act of creating IS part of what we're
   testing.
6. **Halt on the first blocker** (login broken, dev server crashes, DB
   unreachable). Don't paper over with retries — surface and stop.
7. **Halt on the first FAIL**. Capture evidence, stop the matrix, ask
   the user whether to continue, fix, or call it.
8. **Drive Playwright MCP in the host context.** Do NOT dispatch an
   executor subagent.
9. **Cost guardrails**: do not modify production data; do not call
   paid third-party APIs in a loop. One sample per feature unless the
   matrix explicitly says otherwise.

## Required prerequisites

1. **Playwright MCP loaded.** If `mcp__playwright__*` tools aren't in
   the available tool list, halt and ask the user to restart Claude
   Code (MCP tools register at session start, can't be loaded
   mid-session). Do NOT silently fall back to `mcp__claude-in-chrome__*`.
2. **Dev server reachable.** `curl -sf http://localhost:<port>/<basePath>`
   returns 200. If not, start it via the project's dev script.
3. **Login works.** Test credentials in env or supplied by user. Halt
   if login fails.
4. **basePath / dev port** read from the project config (e.g.
   `next.config.*`) — don't assume `:3000`.

## Step 1 — Index the change-set

Read every commit unique to the branch (or PR if given a URL). For each
commit, list:
- Collections / globals / routes / fields touched.
- Plugin integrations involved.
- New endpoints or hooks.
- UI surface (admin, frontend, both).

Output: a flat index of features. Aim for one row per discrete feature
or fix, not one per commit. Show to the user — they may add or trim.

## Step 2 — Build the test matrix

Three tiers — execute in order. **Do NOT skip Tier B for time**;
that's where regressions live.

| Tier | Scope | Stop here only if |
|---|---|---|
| **A — golden path** | One representative test per major feature | Every Tier A test passes AND user explicitly says "skip B/C" |
| **B — coverage** | Every collection × every operation, every global, every route, every excluded-field rule | Always run unless user opts out |
| **C — edge cases** | Empty / null / very-long / special-char inputs, permission boundaries, concurrent ops, modal z-index, mobile viewport, locale switching | Run on changes touching UIs and forms |

For each test, define **before running**:
- **ID**: `A1`, `A2`, ..., `B1`, ..., `C1`, ... (stable identifier).
- **Setup**: what state must exist (e.g. "a draft Post in EN").
- **Action**: exact UI steps.
- **Expected**: what the user should see + what should NOT appear in
  console / network.
- **Evidence**: screenshot filename pattern `<id>-<pass|fail>.png`.

Show the matrix as a markdown table. **Wait for "go"** before driving.

## Step 3 — Drive the matrix (in-context)

Drive Playwright MCP directly. No subagent.

### Setup
1. `mcp__playwright__browser_install` if needed.
2. `mcp__playwright__browser_resize` to 1440×900.
3. Navigate to login URL. Fill credentials. Submit.
4. Verify post-login URL == admin landing URL. Halt if mismatch.
5. Screenshot baseline as `00-logged-in.png` in
   `tests/manual/screenshots/<YYYYMMDD-HHmm>/`.

### Per-test loop
For each row in matrix order (A1 → A2 → ... → B1 → ... → C1 → ...):
1. Print "Running <ID>: <intent>" (one line).
2. Set up state via UI (navigate, click, type — same way a human would).
3. `mcp__playwright__browser_snapshot` to anchor refs.
4. Perform action via REF-BASED clicks (not coordinates — coordinates
   break across viewports).
5. Wait via `mcp__playwright__browser_wait_for` on a real signal (text,
   network idle), NOT a fixed sleep.
6. Assert:
   - **DOM**: snapshot — find expected text/element.
   - **Console**: `mcp__playwright__browser_console_messages` filtered
     to errors. Any new error since last test = FAIL even if UI looks
     right. Filter out errors from third-party scripts (analytics, ad
     SDK) by source URL — only fail on errors from project code.
   - **Network**: `mcp__playwright__browser_network_requests` filtered
     to 4xx/5xx. Any unexpected error response = FAIL.
   - **Async ops** (e.g. on-publish translations): poll until the
     work-product appears, max 30s.
7. Screenshot evidence as `<tier>-<num>-<id>-<pass|fail>.png`.
8. Record result.
9. **If FAIL: HALT.** Do not continue. Capture full evidence and move
   to Step 4.

### Senior-tester mindset (apply throughout)
- Look for what's **missing**, not just what's broken (empty states,
  loading states, the path you don't take).
- Notice cosmetic regressions — alignment, focus rings, dark-mode
  contrast, icon truncation. These are bugs.
- Run the same flow twice when feasible to catch state-leak bugs (the
  second translation reusing cached locale state from the first).
- Click around the change, not just on it — the new field's context
  (the page it lives on, the form it submits, the validation it
  triggers) is part of the change.
- Test boundaries: first user, 1000th item, last item on a paginated
  list, the empty list.
- Exercise undo/redo, back-button, refresh. State that survives these
  is state the user trusts.

## Step 4 — Write the report

Write to `manual-test-report-<branch>-<YYYYMMDD-HHmm>.md`. Include:

- **Summary line**: `<passed>/<total> passed, <failed> failed,
  <skipped> skipped`.
- **Per-tier table** with PASS/FAIL/SKIP per row.
- **Failure details** (one section per failed test):
  - What was being tested.
  - Reproduction steps (numbered, paste-able).
  - Console errors (verbatim).
  - Failed network requests (method, URL, status, body excerpt).
  - Screenshot path.
  - Suspected root cause (1-2 sentences). Cross-reference the diff
    via `git log -p` if the cause isn't obvious.
- **Coverage gaps** — anything in the index NOT covered, with reason.
- **Spend** — count of paid-API calls.

Print the path. Do NOT delete screenshots — they are the audit trail.

If the matrix halted on a FAIL, ask **one focused question**: "continue
the matrix, fix the bug first, or call it?" Then act.

## Step 5 — Cleanup

1. Kill dev server (use the pid you started; if a pre-existing server,
   leave it).
2. Close Playwright browser via `mcp__playwright__browser_close`.
3. Leave the report + screenshots in place.

If running inside a worktree, do NOT remove the worktree — leave the
report committable.

## Edge cases

- **Playwright MCP not loaded** → halt at Step 0. Don't fall back.
- **Dev server bound to an unexpected port** → grep the dev output for
  the actual port; don't assume.
- **Project basePath** (e.g. `basePath: '/blog'`) → read `next.config.*`
  first, use correct URLs.
- **CSRF / authenticated routes** → Playwright keeps cookies across
  navigations within the same context. If a test fails with 401
  mid-session, capture cookie state in the report.
- **Async background jobs** → poll for completion with a real signal
  (DB row, status field on the doc), not fixed sleep.
- **Paid LLM / API in test path** → log every call, enforce
  one-sample-per-feature.
- **Console error from a third-party script** → filter by source URL,
  only fail on project-code errors.
- **User asks for "thorough" but is paying for the LLM** → propose
  Tier A only first, get approval for B/C with a cost estimate.
- **PR diff is empty / nothing to test** → say so, don't manufacture a
  matrix.

## Notes

- Runs **alongside** `/resolve-pr-comments`, not in series.
  `resolve-pr-comments` validates static review feedback;
  `manual-test` validates runtime behavior the bots can't see.
- Output report is intended to live in the PR description or as a PR
  comment. Format with that in mind.
- If the test surfaces a real bug, do NOT fix it inside this skill —
  surface it and let the user decide whether to fix in this PR or a
  follow-up. Mixing test-with-fix breaks the audit trail. For a
  multi-bug fix loop, escalate to `/bug-bash`.
