---
name: create-pr
description: Generate a comprehensive PR description from the current diff and log, saved under docs/pr/. Use when asked to "create a PR", "write the PR description" or "draft a pull request".
---

Generate a comprehensive PR description. If the user's context is too vague, ask clarifying questions before generating.

## Step 1: Gather Context

Run these in **parallel tool calls** to understand what changed:

```bash
git diff HEAD --stat
git log -5 --oneline
git diff HEAD
```

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
