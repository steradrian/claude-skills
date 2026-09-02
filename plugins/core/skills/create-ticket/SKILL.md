---
name: create-ticket
description: Generate a comprehensive engineering ticket documenting a task, saved under docs/tickets/. Use when asked to "create a ticket", "write up this work" or after a significant change.
argument-hint: [task description or context]
---

Generate a comprehensive engineering ticket. $ARGUMENTS

This is primarily an **end-of-work documentation artifact** — written after the code is built, with full context of what was actually implemented. If there's no code yet, it becomes a planning ticket.

---

## Step 1: Read Context

Run these in **parallel tool calls**:

```bash
git log -10 --oneline
git diff HEAD --stat
git diff HEAD
```

Determine mode:
- **Has a diff** → End-of-work mode (document what was actually built)
- **No diff** → Planning mode (describe what will be built)

---

## Step 2: Fill Gaps

Ask only what you cannot determine from the code and git history:
- What is the title / name for this ticket?
- Were there any significant deviations from the original plan?
- Any known follow-ups or tech debt introduced?

---

## Step 3: Delegate to Agent

**End-of-work mode:** Summarize the diff, then **spawn a ticket-writer agent** (runs at sonnet) with:
- Summary of what was built
- Plan deviations (if any)
- Known follow-ups
- Save path: `docs/tickets/Ticket-<ISO-timestamp>-<kebab-slug>.md` (create `docs/tickets/` if needed)

**Planning mode:** Run in main context (no agent) — planning tickets need interactive back-and-forth.

---

## File Structure (End-of-Work Mode)

Use this when a diff exists — document what was built.

```
# {Ticket Title}

## What & Why
1-2 paragraphs. What problem was solved, why it matters, who it affects.

## What Was Built
Concrete summary of the implementation — components, hooks, APIs, types created or modified.
Write in past tense. Reference actual file paths from the diff.

## Files Changed
- `path/to/file.ts` — what changed and why

## How It Works
Key technical decisions and their rationale. What non-obvious choices were made?
This is the section a new developer reads to understand the intent behind the code.

## Deviations & Discoveries
Things that changed from the original plan or were discovered mid-implementation:
- Edge case that required extra handling
- Existing code that changed the approach
- Scope that expanded or contracted

## Known Follow-ups
Tech debt introduced, improvements deferred, or next steps:
- [ ] follow-up item
(leave empty if none)

## Testing
How this was tested. What test cases cover it. Any gaps.

## Success Criteria
How to verify this works correctly in production.

## Risk Assessment
- **High**: risk → mitigation
- **Medium**: risk → mitigation
- **Low**: risk → mitigation

## Dependencies
External libs added, internal systems touched, other teams involved.

## Notes
Anything else worth capturing — design decisions, rejected alternatives, context that doesn't fit elsewhere.
```

---

## File Structure (Planning Mode)

Use this when there is no diff yet — planning what will be built.

```
# {Ticket Title}

## Description
1-2 paragraph summary with context and motivation.

## Objectives
- 3-5 measurable bullet points

## Scope

### In scope
- ...

### Out of scope
- ...

## Technical Approach
Proposed implementation strategy. This will evolve — update after building.

## File Structure
\`\`\`
affected files as a directory tree
\`\`\`

## Implementation Phases
- **Phase 1**: ...
- **Phase 2**: ...

## Testing Strategy
Unit / integration / E2E / manual as applicable.

## Success Criteria
Measurable outcomes.

## Risk Assessment
- **High**: risk → mitigation
- **Medium**: risk → mitigation
- **Low**: risk → mitigation

## Dependencies
External libs, internal systems, other teams.

## Notes
Design decisions, open questions, future considerations.
```

---

Rules:
- Never make up file names or technical details — use only what's in the diff and git history
- In end-of-work mode, write in past tense — document what happened, not what will happen
- Always include success criteria and risk assessment
- Use `inline code` for file paths and commands
- If scope changed mid-implementation, document it in Deviations — don't pretend the plan was always what was built
