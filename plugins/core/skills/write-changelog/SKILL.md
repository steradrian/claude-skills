---
name: write-changelog
description: Write a CHANGELOG.md entry for the current changes, filtering to user-facing items. Use when asked to "update the changelog" or "write a changelog entry".
---

Write a changelog entry for the current changes.

Follows [Keep a Changelog](https://keepachangelog.com/) format.

---

## Step 1: Read Context

Run these in **parallel tool calls**:

```bash
git diff HEAD --stat
git diff HEAD
git log -5 --oneline
```

## Step 2: Delegate to Agent

Summarize the diff into user-facing vs internal changes, then **spawn a changelog-writer agent** (runs at haiku) with:
- The list of user-facing changes
- Note: the agent will read `CHANGELOG.md` itself to match existing structure

## Step 3: Confirm

Report:
- The entries added (quote them)
- Any changes skipped because they were not user-facing (with brief reason)
