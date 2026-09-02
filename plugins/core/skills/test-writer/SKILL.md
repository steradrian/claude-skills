---
name: test-writer
description: Write comprehensive unit or integration tests for a component, hook, utility or module. Use when asked to "write tests for" or "add test coverage".
argument-hint: <target to test>
---

Write comprehensive tests for: $ARGUMENTS

If no specific file or function is provided, analyze the most recently edited file.

## Step 1: Identify Target

Determine which files need tests:
- If `$ARGUMENTS` specifies a file, use that
- Otherwise, check `git diff HEAD --stat` for recently changed files

Read the implementation file(s) and identify the behavioral contract — what does this code promise to do?

## Step 2: Delegate to Agent

**Spawn a test-writer agent** (runs at sonnet) with:
- **Task**: Write and validate tests for the specified file(s)
- **Files to test**: the implementation file paths
- **Existing test patterns**: paths to related test files in this module (grep for `*.test.*` or `*.spec.*` nearby)
- **Behavioral contract**: the key behaviors you identified in Step 1
- **Requirements**:
  - Organize by behavior: happy path → error scenarios → edge cases
  - Test names describe behavior, not function names
  - Mock at adapter layer, not library layer
  - One behavior per test
  - Mutation sanity check required (break implementation, verify tests catch it, revert)

## Step 3: Report

Present the agent's results:
- Total new tests added
- Mutation check outcomes
- Any behaviors that needed additional tests after mutation check
