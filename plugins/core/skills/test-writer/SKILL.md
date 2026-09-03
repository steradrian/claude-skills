---
name: test-writer
description: Entry point for test coverage — dispatches the `core:test-writer` agent for a component, hook, utility or module, then runs the tests and pastes the output. Use when asked to "write tests for", "add test coverage", "cover this with tests" or "test this hook".
argument-hint: <target to test>
---

Write comprehensive tests for: $ARGUMENTS

This skill is the entry point; the `core:test-writer` agent does the writing. The skill's own job is to scope the target, dispatch the agent, then prove the result by running the tests here and pasting the output.

**Package manager:** detect it per `${CLAUDE_PLUGIN_ROOT}/references/package-manager.md` and use it for every command below; `<pm>` stands for the detected one.

## Step 1: Identify Target

Determine which files need tests:
- If `$ARGUMENTS` specifies a file, use that
- Otherwise, check `git diff HEAD --stat` for recently changed files

Read the implementation file(s) and identify the behavioral contract — what does this code promise to do?

## Step 2: Dispatch `core:test-writer`

Spawn a `core:test-writer` agent with a self-contained brief:
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

Wait for the agent to finish and read its report.

## Step 3: Run the tests

Do not take the agent's word for it. Run the new/changed test files yourself:

```bash
<pm> exec vitest run <test file paths>
```

Paste the output (full output when anything fails; the summary lines when green). If anything fails, fix it in the main context and re-run until green.

## Step 4: Report

- Test files created/modified (paths)
- Total new tests added
- Pasted vitest result
- Mutation check outcomes from the agent, and any behaviors that needed additional tests afterwards
