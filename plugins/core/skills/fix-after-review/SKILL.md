---
name: fix-after-review
description: Apply selected findings from a local review report (/core:review, /core:panel-review, or a pasted review) one at a time, each with a minimal scope-bounded fix and its relevant test. Use when asked to "fix findings 1,2,6", "apply the review fixes", "fix the red items" or "address the review findings".
argument-hint: <finding indices, e.g. 1,2,6>
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Fix After Review

Local counterpart of `fix-pr-thread`: the same read → decide → minimal-edit protocol, but the input is a review report already in this conversation instead of GitHub threads. Everything runs sequentially in the main context. No subagents, no orchestrator pass, no external doc lookups, no fix-all-occurrences.

**Package manager rule:** detect from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb`/`bun.lock` → bun, `package-lock.json` → npm) and use it for every command below.

## 1. Parse the request

Parse `$ARGUMENTS` as a comma-separated list of finding indices (e.g. `1,2,6`). Find the most recent review in the conversation; entries look like:

```
N. 🔴/🟡/🔵 [category]  file:line  → description
```

- An index that does not exist in the review → warn and skip it.
- No indices given → ask which findings to apply. This is the only question this skill asks; after that it does not stop until the report.

Group the selected findings by file, sort by line ascending, process files in order and findings within a file top-down.

## 2. Per finding

### Read the full file
Read the entire file, not just the region around the line. Imports, types and sibling functions change what the right fix is.

### Read the finding in context
Include the reviewer's description and anything the user said about it afterwards ("skip 3", "2 is intentional"). Prior discussion changes the right action.

### Decide: fix / skip / dismiss

**Dismiss** when the finding is verifiably wrong: the flagged symbol exists, the behavior already works, the reasoning relies on a stale code path. Cite the verifying line numbers.

**Skip** when addressing it is out of scope: the fix needs edits in another file, a product/UX decision, a refactor wider than the immediate issue, or a new feature. When unsure between fix and skip → skip. Name what makes it out of scope.

**Fix** only when all hold: confirmed by reading the code, minimal (≤20 lines, otherwise it is a refactor → skip), contained in the one file, no product decision needed.

### Apply (status `fixed` only)

| Rule | Reason |
|---|---|
| Edit only the flagged file | Cross-file edits = skip |
| Edit only what the reviewer flagged | No grep-and-fix-similar-elsewhere; note other occurrences in the report instead |
| Match surrounding code style | Diff stays minimal and reviewable |
| Comment only if the fix is non-obvious | Default no comment |
| No renames, import reordering, adjacent refactors, new tests | Out of finding scope |

Use the Edit tool. The next finding on the same file reads the file fresh; the filesystem is the source of truth.

### Run the relevant test
- If a test file exists for the flagged module (`<name>.test.*` / `<name>.spec.*` next to it or under `__tests__/`): `<pm> exec vitest run <test path>`.
- Otherwise typecheck the file's project: first existing script among `typecheck`, `type-check`, `tsc`, else `<pm> exec tsc --noEmit`.

Paste the output (last ~15 lines when green, the full failure when red). A red result caused by your edit: revert the edit, mark the finding `skipped` with the failure as the reason. A pre-existing red result unrelated to your edit: note it, keep the fix.

## 3. After all findings

Run lint once on the changed files (first existing script among `lint`, `lint:check`, `biome:check`, `eslint`; skip if none) and paste the output. Fix lint errors your edits introduced; leave pre-existing ones.

## 4. Report

```
## Fix after review

| # | Status | File | Test | Note |
|---|--------|------|------|------|
| 1 | fixed | src/x.ts | vitest ✅ (3 passed) | |
| 2 | skipped | src/y.tsx | — | needs copy decision |
| 6 | dismissed | src/z.ts | — | `.status` exists (z.ts:31) |

Other occurrences noticed (not fixed): <file:line — pattern>, or "none"
Lint: ✅ / ❌ <summary>
```

Do not commit. The user decides when and what to commit.

## Anti-patterns — do not do

- One subagent per finding (same-file races) or any parallel dispatch
- A second "orchestrator" pass that re-edits files after fixes are applied
- Grep for similar patterns and fix all occurrences
- Edit a second file to make a fix work (skip instead)
- External documentation lookups; the code in front of you is the source of truth
- Ask the user mid-fix (skip and report)
- Commit, push or open a PR
