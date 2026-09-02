---
name: code-review
description: Perform a thorough code review of the current changes, a PR, or named files. Use when asked to "review", "code review" or "check my implementation".
argument-hint: [PR number, files, or scope]
---

Perform a thorough code review. $ARGUMENTS

## Setup

If a branch or commit is specified in $ARGUMENTS, use `git diff $ARGUMENTS`. Otherwise run `git diff HEAD` to get current changes.

1. Read the full diff
2. Read the project's CLAUDE.md to understand conventions
3. For each significantly changed file, read the surrounding context — not just the diff lines

## Review Criteria

Evaluate each change against:

### Type Safety
- Any `any` escapes?
- Unsafe assertions (`as T`) without a comment explaining why?
- Missing error types — is the error just `unknown` or `catch (e)` without narrowing?

### Error Handling
- All async operations handled?
- Errors propagated to the right level?
- Error states surfaced to the user where applicable?

### Test Coverage
- New behavior covered by tests?
- Tests testing behavior, not implementation?
- Would existing tests catch a regression in this code?

### Code Quality
- Dead code or unused imports?
- Naming that requires a comment to understand?
- Functions with more than one reason to change?
- Magic strings/numbers that should be constants?
- Console.logs or debug artifacts?

### Imports & Architecture
- Barrel exports used correctly?
- No circular dependency risk introduced?
- No cross-feature imports that should live in shared?

### Performance Red Flags
- N+1 data fetching patterns?
- Missing memoization in genuinely hot paths (not premature optimization)?
- Waterfall requests that could be parallelized?

### Security Basics
- User input reaching HTML unsanitized?
- Sensitive data in logs, error messages, or URL parameters?

### Accessibility (UI changes only)
- Semantic HTML used?
- ARIA where native semantics aren't sufficient?
- Keyboard navigability preserved?

## Output Format

### 🔴 Must Fix
Issues that block merge: bugs, type safety holes, security issues, broken tests. For each: cite the file/line, explain WHY it's a problem, not just that it is.

### 🟡 Should Fix
Convention violations, missing error handling, coverage gaps. Strong recommendation but not a blocker.

### 🟢 Suggestion
Non-blocking improvements — naming, minor refactors, test additions for edge cases.

### 💬 Questions
Decisions that aren't clear from the code. Ask, don't assume.

---

Rules:
- Never fabricate issues. Only flag what you can see in the code.
- Be specific: cite file name and the relevant code.
- If the diff is clean, say so explicitly — don't manufacture feedback.
