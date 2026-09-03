---
type: tool_order
before:
  tool: Edit
after:
  tool: Bash
  input_match: "typecheck"
weight: 2
---

The first verification run comes *after* the first edit — the skill fixed, then
checked. A run that typechecks once at the very end (after both edits) still passes
this grader; `verify-per-finding` is what rules that out.
