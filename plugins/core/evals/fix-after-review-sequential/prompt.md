---
name: fix-after-review-sequential
description: core:fix-after-review applies two findings one at a time, verifying after each rather than batching the edits.
tags: [fix-after-review, sequencing, verification]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Edit, Write, Bash, Glob, Grep, Skill, TodoWrite]
expected_outcome: >
  Both files are edited, `npm run typecheck` is executed at least twice (once after
  each fix), and the closing table reports a per-finding status with the verification
  result for each.
---

Here is the review of the working tree:

```
## Review: draft-editor

1. 🔴 [logic]  src/parse-range.js:9   → loop condition `i <= end` on a documented half-open range — expandRange(1, 4) returns [1,2,3,4] instead of [1,2,3], so every caller reads one row too many
2. 🔴 [async]  src/save-draft.js:14   → persist() is called without await — saveDraft() resolves `{ saved: true }` while the write is still in flight, so a rejected write is reported to the editor as saved
```

/core:fix-after-review 1,2

No network access; nothing is installed. The project's verification script is `npm run typecheck`.
