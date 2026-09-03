---
name: create-pr
description: Generate a comprehensive PR description from the current diff and log, saved under docs/pr/. Use when asked to "create a PR", "write the PR description" or "draft a pull request".
---

Generate a comprehensive PR description. If the user's context is too vague, ask clarifying questions before generating.

## Step 1: Gather Context

A PR spans everything since the branch left the base, and `git diff HEAD` alone is
**empty once the work is committed** — it only shows uncommitted changes. So read both
ranges:

```bash
BASE=$(git merge-base origin/main HEAD)   # substitute the real base branch when it isn't main

# Committed work on this branch — the substance of the PR
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
git log $BASE..HEAD --oneline

# Anything still uncommitted in the working tree
git diff HEAD --stat
git diff HEAD
```

Run them in **parallel tool calls**. The branch's committed range is the PR; mention
uncommitted changes only to flag that they are not in it yet. If `origin/main` doesn't
exist, use the branch's upstream, else the first of `origin/develop` / `origin/master`
that does.

## Step 2: Fill Gaps

Ask only about things the diff doesn't make obvious:
- What is the purpose of this PR? (bug fix / feature / refactor / perf)
- How should reviewers test this?
- Any risks or breaking changes?

Do not ask about things the diff already answers.

## Step 3: Delegate to Agent

Summarize the diff into a structured context:
- Files changed and what each change does
- User-facing vs internal changes
- Any risks or breaking changes mentioned by the user

Then **spawn a `core:pr-writer` agent** with:
- The context summary
- Save path: `docs/pr/PR-<ISO-timestamp>-<kebab-slug>.md` (create `docs/pr/` if needed)

Present the generated PR description to the user.
