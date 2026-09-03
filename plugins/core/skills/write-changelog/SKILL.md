---
name: write-changelog
description: Write a CHANGELOG.md entry for the current changes, filtering to user-facing items. Use when asked to "update the changelog" or "write a changelog entry".
---

Write a changelog entry for the current changes.

Follows [Keep a Changelog](https://keepachangelog.com/) format.

---

## Step 1: Read Context

"The current changes" means everything since this branch left the base, and
`git diff HEAD` is **empty once the work is committed** — it only shows uncommitted
changes. Read both ranges:

```bash
BASE=$(git merge-base origin/main HEAD)   # substitute the real base branch when it isn't main

# Committed work on this branch
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
git log $BASE..HEAD --oneline

# Still uncommitted
git diff HEAD --stat
git diff HEAD
```

Run them in **parallel tool calls**. If `origin/main` doesn't exist, use the branch's
upstream, else the first of `origin/develop` / `origin/master` that does.

## Step 2: Delegate to Agent

Summarize the diff into user-facing vs internal changes, then **spawn a `core:changelog-writer` agent** with:
- The list of user-facing changes
- Note: the agent will read `CHANGELOG.md` itself to match existing structure

## Step 3: Confirm

Report:
- The entries added (quote them)
- Any changes skipped because they were not user-facing (with brief reason)
