# ts-check.sh and test-on-edit.sh are not wired up, on purpose

Both scripts work. Neither is in `hooks.json`, and that is deliberate.

Wired to `PostToolUse` on `Edit|Write|MultiEdit` they fire on **every** file
edit, and measured on a real Next.js project that costs:

| script | per edit |
|---|---|
| `ts-check.sh` (project typecheck) | ~12.5s |
| `test-on-edit.sh` (vitest module graph) | ~28.1s |

That is ~40 seconds of node processes per edit, in the background, for the
whole session. `asyncRewake` keeps it off the critical path but not off the
machine. During a multi-file change it is a constant drag.

The checks are also redundant. A husky `pre-commit` running `lint-staged` and
`tsc --noEmit` catches the same errors before anything leaves the machine, CI
runs the full gate on every pull request, and `/core:build` runs an explicit
typecheck, lint and test gate and pastes the output before it reports done.
Paying 40s per edit to learn the same thing earlier is a bad trade.

## If you want them anyway

Add this block back to `hooks.json` and reinstall the plugin:

```json
"PostToolUse": [
  {
    "matcher": "Edit|Write|MultiEdit",
    "hooks": [
      { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/ts-check.sh", "asyncRewake": true, "timeout": 180 },
      { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/test-on-edit.sh", "asyncRewake": true, "timeout": 180 }
    ]
  }
],
```

Cheaper variants worth considering first:

- Move them to `Stop` so they run once per turn instead of once per edit.
- Add an `"if": "Edit(src/**/*.ts)"` filter so they skip docs, config and tests.
- Drop `test-on-edit` and keep only `ts-check`; it is a third of the cost and
  catches most of what matters.
