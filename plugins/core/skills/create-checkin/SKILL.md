---
name: create-checkin
description: Generate a daily check-in report from the day's work, grouped by project. Use when asked for a "check-in", "daily report" or "what did I do today".
---

Generate a daily check-in report. If the context is too vague, ask what the developer worked on (including which projects and ticket numbers) and whether there were any blockers.

## Step 1: Gather Context

Run in **parallel tool calls**:

```bash
git log --oneline --since="yesterday" --all
git diff HEAD --stat
```

Use the git history + any user-provided context to understand what was accomplished.

## Step 2: Delegate to Agent

**Spawn a general-purpose agent at haiku** with:
- Task: Generate a daily check-in report
- Context: the git log output + any user-provided details
- Format: use the exact template below
- Save path: `docs/daily-checkin/Check-in-<ISO-timestamp>.md` (create dir if needed)

## Template

```markdown
# Daily Check-in — <date>

## What did you work on today?

### <Project Name>
- **[status]** <task description> (<ticket ref if known>)
- **[status]** <task description>

### <Another Project> (if applicable)
- **[status]** <task description>

## Okay, any obstacles?

<obstacles or "None">
```

Status values: `completed`, `in progress`, `blocked`, `reviewing`

## Rules
- Use the exact section headings: "What did you work on today?" and "Okay, any obstacles?"
- Group tasks by project, then list each task with its status
- Write in plain language — focus on outcomes and user value, not implementation details
- Translate technical work: "delivered automated translation support" not "implemented the Lexical serializer and provider interface"
- Keep each bullet to one line — concise
- Always include the obstacles section even if "None"
