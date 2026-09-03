---
type: tool_used
tool: Bash
input_match: "npm (run |exec )?(test|typecheck)|node --test"
min: 1
---

A real verification command was executed through Bash — the gate ran, it was not
described. Matches the project's own `npm run test` / `npm run typecheck` scripts
or a direct `node --test` invocation.
