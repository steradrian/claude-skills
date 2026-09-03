---
type: regex
target: trace
pattern: 'pnpm-lock\.yaml'
match: contains
---

The lockfile was actually looked at — listed, read, or checked against
`git ls-files`. This separates detection from a lucky guess: a run that reaches for
`pnpm` out of habit without ever inspecting the project would pass
`runs-through-pnpm` but fail here.
