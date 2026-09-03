---
type: tool_used
tool: Bash
input_match: '\b(npm|yarn|bun)\s+(run|exec|ls|install|add|dlx|x)\b'
max: 0
weight: 2
---

No `npm` / `yarn` / `bun` command was executed. `\bnpm\b` does not match inside
`pnpm` — there is no word boundary between `p` and `n` — so this grader fires only on
a genuinely wrong runner, which is exactly what the decoy `package-lock.json` is
there to tempt.
