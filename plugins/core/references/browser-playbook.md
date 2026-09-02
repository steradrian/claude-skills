# Browser playbook

Shared preflight + drive loop for every skill that drives a real browser
(`/core:manual-test`, `/core:edge-bash`, `/core:repro-bug`, `/core:explore`,
`/core:bug-bash`). Skills reference this file instead of restating it;
skill-specific deltas (halt rules, evidence directory, cleanup) stay in the
skill.

Reminder of the recorded preference: **the user tests the UI, not the
agent.** This playbook is for deliberate QA passes the user asked for, not
for verifying every edit.

## 0. Tool availability (no-browser mode)

- Check the tool list for `mcp__playwright__*`. If absent, halt and ask
  the user to restart Claude Code — MCP tools register at session start
  and cannot be loaded mid-session. Do NOT silently fall back to
  `mcp__claude-in-chrome__*`; only use it if the user says so.
- If neither Playwright nor Chrome tools are available (cloud session,
  restricted sandbox), **stop before the drive loop.** Run whatever static
  checks apply (`tsc`, lint, unit tests, reading the diff) and report
  exactly which checks ran. Never describe a browser step as done and
  never claim a screenshot was taken.

## 1. Dev server

- **Ask which port first.** Never assume `:3000`. If the user doesn't
  know, read the dev script in `package.json` and `next.config.*`
  (`basePath`, custom port), then confirm with `curl -sf
  http://localhost:<port>/<basePath>` → 200.
- If nothing is listening, start the project's dev script (pnpm) and
  grep its output for the actual port. Remember the pid — you only kill
  what you started.
- The orchestrator drives the browser in-context. If a run is long
  enough that you dispatch an executor subagent, each dispatch gets **5-7
  tests max** — executor subagents truncate around ~73K tokens / ~9 min —
  and screenshots are the evidence, not a JSON results blob.

## 2. Browser setup

1. `mcp__playwright__browser_install` if the browser is missing.
2. `mcp__playwright__browser_resize` → 1440×900 (375 wide for mobile
   checks when a skill asks for them).

## 3. Login

- Credentials come from env or the user. Never invent them.
- Navigate to the login route, fill, submit. Verify the post-login URL is
  the expected route. If login fails, **halt** — that is a different bug
  than the one you came for.
- Take the baseline: `mcp__playwright__browser_snapshot`, then
  `mcp__playwright__browser_take_screenshot` → `00-logged-in.png`.

## 4. Interaction rules

- `mcp__playwright__browser_snapshot` before acting to anchor refs.
- **Ref-based clicks / typing only** — never coordinates; they break
  across viewports.
- Wait with `mcp__playwright__browser_wait_for` on a real signal (text
  appears, network idle), never a fixed sleep. Async work (background
  jobs, on-save side effects): poll for the work-product, max 30s.
- Set up state through the UI the way a user would. **Never seed via
  the DB** — the act of creating is part of what's under test.
- Don't touch production data. Paid third-party APIs: one sample per
  feature, log every call.

## 5. Assertions (every step)

- **DOM**: snapshot, find the expected text / element.
- **Console**: `mcp__playwright__browser_console_messages` filtered to
  errors. Any new error since the last step is a FAIL even if the UI
  looks right. Filter out third-party scripts (analytics, ad SDKs) by
  source URL — only project-code errors fail.
- **Network**: `mcp__playwright__browser_network_requests` filtered to
  4xx/5xx. Any unexpected error response is a FAIL.

## 6. Evidence

- `mcp__playwright__browser_take_screenshot` at **every assertion, pass
  and fail**. Screenshots are the proof; words are unauditable.
- Default directory: `tests/manual/screenshots/<YYYYMMDD-HHmm>/`.
  Filename: `<id>-<pass|fail>.png`. Skills may override the directory.
- Never delete screenshots — they are the audit trail.
- Capture console errors verbatim and failed requests as
  `<method> <url> → <status>` with a body excerpt.

## 7. Halting

- **First blocker** (login broken, dev server crash, DB unreachable):
  stop, surface, don't retry into it.
- **First FAIL**: the skill decides — matrix skills halt and ask;
  discovery skills record and continue. Follow the skill.
- If a 401 appears mid-session on an authenticated route, capture cookie
  state in the report before anything else.

## 8. Cleanup

- Kill the dev server only if you started it.
- `mcp__playwright__browser_close` unless the skill says to leave the
  browser open for the user to inspect the failure state.
- Leave reports and screenshots in place.
