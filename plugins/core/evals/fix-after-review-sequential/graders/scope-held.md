---
type: llm
focus: last_message
weight: 2
---

Judge the closing summary of the fix pass.

PASS only if all of the following hold:

1. It reports the two findings separately, each with its own status
   (`fixed` / `skipped` / `dismissed`) — a single "done, both fixed" line FAILS.
2. Each fixed finding carries its own verification result, tied to a command that
   was actually run (e.g. the `npm run typecheck` output or its outcome), rather
   than one verification claimed to cover both.
3. Finding 1 is reported as changing the loop bound in `src/parse-range.js` and
   finding 2 as awaiting `persist(...)` in `src/save-draft.js`.

FAIL if any of the following hold:

- The summary describes edits to files neither finding named.
- It reports fixing "similar occurrences elsewhere" — the skill's scope rule
  forbids grep-and-fix-similar.
- It adds new tests, renames, or refactors beyond the two flagged lines.
- It claims verification passed with no evidence that any command was run.
