---
type: regex
target: trace
pattern: 'pnpm\s+(exec|run|dlx)\s'
match: contains
weight: 3
---

The knip invocation went through `pnpm`, which is what the committed `pnpm-lock.yaml`
dictates. Matched on the trace rather than the closing message because the command is
what matters, not how it is summarised afterwards.
