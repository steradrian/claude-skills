---
type: fixed
tools:
  - browser_navigate
  - browser_snapshot
  - browser_take_screenshot
  - browser_click
  - browser_console_messages
---

Stand-in for the Playwright MCP server, used by the `explore-report-only` case so
that exploratory browsing is reproducible and needs no dev server.

It serves a deliberately rough Settings page: an unlabelled input, an empty state
with no copy, a save button that stays disabled after a valid edit, and a console
warning about a controlled/uncontrolled input flip. Those are the findings an
exploratory pass should come back with.

Cases that must run *without* a browser — `manual-test-no-browser` — simply do not
list these tools in `allowed_tools`. If a stand-in ever leaks into that case's tool
list, run it with `--mocks off`.
