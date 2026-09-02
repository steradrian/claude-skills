---
name: fix-after-review
description: Fix review findings in parallel using isolated background agents per bug
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Agent, Bash
---

# Fix After Review

> **ISOLATION & PARALLELIZATION REQUIREMENT — READ THIS FIRST:**
> This skill uses **background subagents** for true parallel execution, followed by a foreground orchestrator. Each Fix Agent runs as a background task in isolation with only its own bug context. The Orchestrator only starts after all Fix Agents complete.
>
> **Key parameter:** Every Fix Agent MUST be spawned with `run_in_background: true` on the Agent tool call. This is what makes them execute concurrently instead of sequentially.
>
> ```
> User: /fix-after-review 1,2,6
>          |
>          v
>   [PARSE & DISPATCH]
>   Extract bugs 1, 2, 6 from review context
>          |
>     +----+----+  (all spawned with run_in_background: true)
>     v         v         v
> [fix-bug-1] [fix-bug-2] [fix-bug-6]
>   (background) (background) (background)
>     |              |              |
>     +==============+==============+
>          (wait for all notifications)
>                    |
>                    v
>          [ORCHESTRATOR AGENT]
>          (foreground — run_in_background: false)
>                    |
>                    v
>          Final unified output
> ```

---

## Phase 1 — Parse & Dispatch

Parse `$ARGUMENTS` as a comma-separated list of bug indices (e.g. `1,2,6`).

Search the current conversation context for the review output. Each bug entry follows this format:
```
N. 🔴/🟡/🔵 [category]  file:line  → description
```

For each requested index, extract the full bug entry and build a structured task object:
```
{
  index: <number>,
  severity: "🔴"|"🟡"|"🔵",
  type: <tag>,           // e.g. "bug", "seo/empty-h1", "retina"
  file: <path>,
  line: <number or range>,
  description: <full text>
}
```

If a requested index does not exist in the review output, warn the user and skip it.

Spawn one independent Fix Agent per bug using the Agent tool. Each Fix Agent gets **only its own task object** — no shared context with other Fix Agents. For each Agent call, set:
- `name`: `"fix-bug-1"`, `"fix-bug-2"`, etc. (matching the bug index)
- `run_in_background`: `true` — this is what makes them execute concurrently
- `description`: `"Fix bug #N (<category>)"`

Spawn all Fix Agents in a single message (multiple Agent tool calls). **Wait for all background agents to complete** — you will be automatically notified as each finishes. Do NOT poll or sleep. Do NOT proceed to Phase 3 until all Fix Agents have returned.

---

## Phase 2 — Fix Agent (runs once per bug, in parallel)

Each Fix Agent is a `general-purpose` Agent that receives the following instructions along with its task object. The agent **must follow this exact investigation loop before writing any code**:

### Step 1 — Understand the site

Read the file referenced in the bug (`file:line`). Understand the surrounding logic, imports, and component role. Read at least 50 lines of context around the referenced line.

### Step 2 — Resolve library documentation via Context7

Before investigating the bug, identify all libraries, frameworks, or APIs involved in the affected code (e.g. Next.js, React, a specific UI library, a metadata API). For each one:

1. Call `mcp__context7__resolve-library-id` with the library name to get its Context7 library ID
2. Call `mcp__context7__query-docs` with that ID, using a `query` scoped to the bug (e.g. `"openGraph metadata"`, `"heading hierarchy"`, `"image srcset breakpoints"`)
3. Use the returned docs as the authoritative reference for:
   - What the correct behavior should be according to the library/framework
   - What APIs or props are available to implement the fix
   - Whether the pattern used in the buggy code is deprecated or misused

Context7 must be consulted **before** searching the codebase, so the investigation is grounded in current official documentation rather than guessing from existing app patterns alone. If Context7 returns no relevant docs for a given library, proceed without it and note this in the output.

### Step 3 — Search for similar patterns

Grep the codebase for:
- The same function/component/pattern mentioned in the bug
- Similar constructs that may have the same problem (e.g. if `openGraph.url` is hardcoded in `events/page.tsx`, search all `page.tsx` files for `openGraph.url`)
- Any existing correct implementation of the same thing elsewhere in the app (use it as the reference pattern)

Cross-reference what you find against the Context7 docs retrieved in Step 2. If the app's existing "correct" pattern contradicts the official docs, flag this in the output — do not silently adopt a wrong app-wide pattern.

### Step 4 — Confirm or dismiss the bug

Based on actual file contents and Context7 documentation, answer:
- Is the bug reproducible as described? (yes / no / partially)
- Does official documentation confirm this is incorrect behavior?
- Are there other occurrences of the same issue? List them with file+line.
- Is there an existing correct pattern in the codebase to model the fix after?

If the bug is **not confirmed**: output a `DISMISSED` verdict with reasoning. Do not produce a fix.

### Step 5 — Write the fix

Only if confirmed. The fix must:
- Match the code style of the surrounding file exactly (spacing, quotes, import order, naming conventions)
- Align with the official API/pattern from Context7 docs when relevant
- Model itself after the existing correct pattern found in Step 3 when one exists and is consistent with docs
- Be minimal — change only what is necessary to fix the bug
- Fix **all occurrences** found in Step 3, not only the one cited in the review
- Include a brief comment only if the fix is non-obvious

**Apply the fix using the Edit tool.** Do not just report the diff — actually make the change.

### Step 6 — Output format per Fix Agent

Return your results in this exact format:

```
## Fix Agent — Bug #<index>

**Verdict:** CONFIRMED | DISMISSED | PARTIALLY CONFIRMED
**Occurrences found:** <list of file:line beyond the original, or "none">
**Reference pattern used:** <file:line of the existing correct implementation, or "n/a">
**Context7 sources consulted:** <library name + topic queried, or "n/a">

### Reasoning
<2-4 sentences explaining what was verified, what the docs say, and why the fix is correct>

### Changes made
- `<file>` — <one-line description of change>
```

---

## Phase 3 — Orchestrator Agent

After **all** background Fix Agents have completed (you will receive a notification for each), spawn one final `general-purpose` Agent named `"orchestrator"` in the **foreground** (`run_in_background: false`). Pass it all Fix Agent outputs concatenated. The Orchestrator must:

### Conflict detection
- Do any two fixes touch the same file? If yes, verify they are compatible. If there are merge conflicts or contradictions, resolve them by editing the files to produce the correct combined result.
- Do any two fixes introduce contradictory patterns (e.g. one adds a guard with `??`, another uses `||` for the same type of null-check)?
- Does any fix undo or regress an assumption made by another fix?

### Consistency check
- Are all fixes using the same code style? Flag deviations and fix them.
- If multiple bugs share the same root cause (e.g. bugs 2 and 3 are both about missing null guards), note this.
- If two Fix Agents consulted Context7 for the same library but used different patterns, flag the discrepancy and standardize.

### Scope check
- Did any Fix Agent over-engineer the fix (changed more than needed)? If so, revert the excess.
- Did any Fix Agent under-fix (only patched the cited line, missed other occurrences it found)? If so, fix the remaining occurrences.

### Dismissed bugs
- For each `DISMISSED` bug, include a one-line explanation in the summary so the user understands why no code was produced.

### Orchestrator output format

Return the final report in this exact format:

```
## Orchestrator Review

### Summary
| Bug # | Verdict     | Files Changed | Context7 Used | Notes                  |
|-------|-------------|---------------|---------------|------------------------|
| 1     | CONFIRMED   | 1             | Next.js       |                        |
| 2     | CONFIRMED   | 2             | React         | Same root as bug 3     |
| 6     | DISMISSED   | —             | —             | Dead code already gone |

### Conflicts & Merges
<List any conflicts found and how they were resolved, or "None detected">

### Consistency Notes
<Any style or pattern inconsistencies across fixes and how they were resolved, or "All consistent">

### All Changes
<Ordered list of all files changed, grouped by file, with one-line description per change>
```

---

## Behavior Rules

- **Never write a fix before completing Steps 1-4.** Speculation without codebase evidence or documentation is not allowed.
- **Context7 is mandatory for any bug touching a named library or framework.** Skipping it is only acceptable if the library returns no results — which must be noted explicitly.
- **Never fix what was not requested.** If the investigation reveals an unrelated bug, note it as a comment in the Orchestrator output under "Additional observations" — do not fix it.
- **Dismissed bugs are not failures.** A dismissed verdict is a valid and useful output.
- **The Orchestrator has final authority.** If a Fix Agent's change conflicts with another, the Orchestrator resolves it and its version is the one that stays in the code.
- **Parallel is the default.** Fix Agents do not wait for each other. The Orchestrator only starts when all Fix Agents have completed.
- **Actually apply fixes.** Fix Agents must use the Edit tool to make changes — do not just report diffs.
