---
name: create-pr
description: Generate a comprehensive PR description from the current diff and log and open the PR with it — title task-first, body from the repo's template, nothing written into the repo. Use when asked to "create a PR", "write the PR description" or "draft a pull request".
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
- The repo's `.github/pull_request_template.md` when there is one — the body follows it
- Save path: a file in the session scratchpad (never under the repo — the PR body is the record, not a `docs/pr/` copy)

## Step 4: Title and open

The title puts the task first: **`TASK-<number> <type>(<scope>): <summary>`**, where `<number>` is the Trello card's number, read from the branch name (`<type>/TASK-<number>-<slug>`) or from the card the user names. No card → no prefix, and say so. Then:

```bash
gh pr create --title "TASK-<number> <type>(<scope>): <summary>" --body-file <scratchpad file>
```

Present the title and body to the user with the PR link. If a card is known, attach the PR to it (`trello.sh attach`) and move it to review.
