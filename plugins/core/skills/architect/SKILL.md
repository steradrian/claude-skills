---
name: architect
description: Investigate the codebase thoroughly, then design an architecture for a feature or change. Use when asked to "architect", "design the architecture for" or plan a structural change before building.
argument-hint: <feature or change to architect>
---

Investigate the codebase thoroughly, then design an architecture for: $ARGUMENTS

## Phase 1: Investigation (complete before any design work)

1. Grep for existing implementations of similar functionality
2. Read test files for related features to understand expected behavior
3. Check types/interfaces related to this domain
4. Identify the files and modules that will be affected
5. Check for existing patterns that this feature should follow

Do not skip this phase. The architecture document is only as good as the investigation behind it.

## Phase 2: Architecture Document

Produce a design document with the following sections:

### Feature Overview
What this does, who uses it, why it exists.

### Component Breakdown
List each new or modified component/module with its single responsibility. One responsibility per item.

### Data Flow
Describe how data moves: source → transforms → destination. Use a text diagram if it clarifies the flow.

### API Contracts
For any new endpoints or interfaces, define the full request/response types. No `any`.

### State Management
Where does state live? What triggers updates? What caches what? What doesn't need to be in state?

### File Structure
```
new/or/modified/
  files/
    listed/
      here.ts    ← what lives here
```

### Dependencies on Existing Code
List specific files/functions/types you'll import or modify. Be precise — this is the integration surface.

### Edge Cases & Error Scenarios
At least 3 non-obvious edge cases and how they're handled. If you can't name 3, keep investigating.

### Testing Strategy
What tests are needed? Integration or unit? What behavioral contract is being verified?

### Risks & Alternatives
Flag any risks in this approach. If there's a meaningfully different alternative, describe it with honest pros/cons.

## Phase 3: Await Approval

Present the architecture document. Do NOT write any implementation code until the developer approves the design.

After approval, summarize the execution plan (files to create/modify, in what order) and then begin implementation.
