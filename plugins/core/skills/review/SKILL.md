---
name: review
description: Comprehensive pre-PR code review with parallel batch agents. Triggers on "review this PR", "review my changes", "code review", "review my PR", "check my implementation", "PR review". Dispatches to pr-reviewer agents per file batch, then merges all findings into a unified report.
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Agent, Bash
---

# Pre-PR Code Review

> **ISOLATION & PARALLELIZATION REQUIREMENT — READ THIS FIRST:**
> This review MUST run in clean-slate subagents. Session history, prior fixes, and previous review runs must never influence the output. Each invocation must see only the current git diff.
>
> **Parallel dispatch strategy (based on diff size):**
> 1. Run `git diff $MERGE_BASE...HEAD --name-only` to get the changed file list. Count the files.
> 2. **≤ 12 changed files:** Split into **3 agents** (divide files roughly equally, ~4 files each). Keep related files together — e.g., a component + its types + its hook should go to the same agent.
> 3. **> 12 changed files:** Split into **1 agent per 3 files** (e.g., 30 files → 10 agents). Same grouping rule: keep related files in the same batch.
> 4. Spawn all batch agents **as background tasks** in a single message (multiple Agent tool calls). For each Agent call, set:
>    - `name`: `"review-batch-1"`, `"review-batch-2"`, etc.
>    - `subagent_type`: `"pr-reviewer"` — routes each batch to the specialized review agent
>    - `run_in_background`: `true` — this is what makes them run concurrently
>    - `description`: `"Review batch N (<file count> files)"`
>    Each batch agent receives:
>    - The relevant reference file contents (see **Reference files** below) — read and inline them in the prompt
>    - **Branch context**: branch name and commit messages (`git log $MERGE_BASE...HEAD --oneline`) so the agent understands intent behind the changes
>    - A preamble: `You are reviewing ONLY the following files from the diff. Read their full contents and the diff hunks for each. Ignore all other changed files.\n\nFiles assigned to you:\n- file1.tsx\n- file2.ts\n- ...`
>    - Instruct each agent to also run the linter on its own file batch.
>    Note: pr-reviewer has its own review dimensions, two-gate filter, and multi-pass logic built in. Do NOT re-embed the full review instructions — just provide files, diff context, reference files, and branch context.
> 5. **Wait for all background agents to complete.** You will be automatically notified as each finishes — do NOT poll or sleep. Do NOT proceed until all batch agents have returned their results.
> 6. After all batch agents complete, spawn **one final general-purpose Agent** (foreground, `run_in_background: false`) named `"review-merge"` as the **merge agent**. Pass it all batch results concatenated and instruct it to:
>    - Deduplicate findings (same file:line reported by overlapping batches)
>    - **Verify each finding (chain-of-verification):** For every finding, trace the concrete execution path that triggers it. State the preconditions. If you cannot construct a realistic trigger scenario, discard the finding — it is speculative.
>    - **Skepticism pass:** For each surviving finding, ask: "If I remove this from the report, would the PR actually be worse off?" Discard any finding where the answer is "no" or "uncertain."
>    - Renumber findings sequentially
>    - Run the **architectural coherence pass (Step 4)** across ALL findings — this is the only step that requires cross-file holistic view and cannot be parallelized
>    - Produce the final unified report in the output format specified below
> 7. Return the merge agent's output verbatim to the user.
>
> NEVER use SendMessage to continue a prior review agent — always call Agent fresh. NEVER execute review steps yourself in the current conversation.

---

## Reference files — load based on file types in each batch

**Always include:** [checks-bugs-logic.md](checks-bugs-logic.md) — applies to all code changes (Step 3)

**If batch contains `.tsx`/`.jsx` files:** Also include [checks-react-nextjs.md](checks-react-nextjs.md) (Step 6)

**If batch contains `.tsx`/`.jsx`/`.css`/`.module.css` files:** Also include [checks-frontend.md](checks-frontend.md) (Steps 5, 7, 8)

**If batch contains test files, config files (`package.json`, `next.config.*`, `tsconfig.*`, `biome.*`, `.env*`), schema files, or `.github/` files:** Also include [checks-infra.md](checks-infra.md) (Steps 9–12)

Read each relevant reference file and include its full contents in the batch agent prompt.

---

## Review instructions

> **Identity:** Pre-merge code review. Invoke before creating a PR. Do NOT invoke for: draft PRs, documentation-only changes, or when the user just wants a quick check on a single file (use normal conversation for that).
> **Quality Gate:** Every finding must reference a specific file:line. An unfired finding is better than a false positive. If unsure, investigate further before reporting.

You are a senior engineer performing a thorough pre-merge review. Your goal is to catch every real issue before it reaches production. Be aggressive about investigating suspicious patterns, but apply the two-gate filter before reporting anything.

---

## Reasoning discipline — two gates every finding must pass

For each potential issue, run this internal check before surfacing it. Both gates must pass or the finding is discarded.

**Gate 1 — Confidence (is this actually a bug?)**
Internally answer all three:
1. What exactly is the issue and what is the concrete runtime impact?
2. Have I verified this is not an established intentional pattern elsewhere in the codebase?
3. Have I read the full file and surrounding context, not just the diff hunk?

If any answer is uncertain, investigate further — grep callers, read the type definition, check the test. Only surface when all three are confirmed.

**Gate 2 — Actionability (would a developer actually change code based on this?)**
Ask: "If I posted this comment on a PR, would the author know exactly what to fix and why it matters?" Vague warnings ("consider adding error handling"), theoretical concerns with no realistic trigger path, and style preferences with no runtime consequence all fail this gate and must be discarded.

**Multi-perspective scanning:**
Run the review in three explicit passes before writing output:
- Pass 1 — **Security & data integrity**: auth, injection, secrets, mutations, data loss
- Pass 2 — **Correctness & logic**: unit mismatches, control flow, nullability, async ordering
- Pass 3 — **Resilience & edge cases**: error paths, cleanup, concurrency, empty/zero/boundary inputs

Issues found in only one pass that feel uncertain should be held back — only surface when you can confirm them independently.

---

## Step 1 — Resolve the diff

1. **Load project rules.** Check for `CLAUDE.md` files (root and any subdirectory relevant to changed files) and read them fully. Any project-specific conventions, forbidden patterns, or required patterns defined there take precedence over the generic checks below.
2. Detect the upstream branch:
   ```bash
   BRANCH=$(git rev-parse --abbrev-ref HEAD)
   BASE=$(git rev-parse --abbrev-ref "$BRANCH@{upstream}" 2>/dev/null | sed 's|^origin/||')
   if [ -z "$BASE" ]; then
     for candidate in develop main master; do
       if git rev-parse --verify "origin/$candidate" &>/dev/null; then
         BASE="$candidate"; break
       fi
     done
   fi
   MERGE_BASE=$(git merge-base "origin/$BASE" HEAD)
   ```
3. Run `git diff $MERGE_BASE...HEAD` — full diff
4. Run `git diff $MERGE_BASE...HEAD --name-only` — file list
5. Run `git diff $MERGE_BASE...HEAD --stat` — summary
6. **Read full files, not just hunks.** For every changed file, read the complete file content. Diff-only review produces false positives and misses bugs that only appear in full context.
7. **Flag changed config/infra files.** Note any changes to `package.json`, `next.config.ts`, `tsconfig.json`, `middleware.ts`, `.env*`, `biome.json`, `vitest.config.ts`, or `.github/workflows/`. These receive dedicated checks in [checks-infra.md](checks-infra.md).
8. **Deletion impact audit.** For every **deleted** file in the diff, grep the entire codebase for references: imports, dynamic imports, sitemap entries, redirect/rewrite rules, middleware matchers, config references, test files, scripts, and documentation. A deleted file with live references is a 🔴 finding. Also check: does the deleted file provide functionality (robots.txt, error boundary, middleware, layout) that has no replacement?

---

## Step 2 — Investigate before judging

**Before flagging anything**, read surrounding code, trace the pattern across the codebase, and understand full intent. Do NOT flag if:

- The pattern is used consistently throughout the project (grep first)
- The fix requires refactoring code outside this branch
- It exists intentionally (barrel imports with `optimizePackageImports`, `any` at external API boundaries, deliberate `!` assertions with explanatory comments)
- It is a style preference with no runtime consequence
- Biome already enforces it (`useSortedClasses`, formatting, import ordering)

**Cross-file tracing (required for any changed export/signature):**
- Changed or removed export → grep all importers
- Changed function signature → verify all callers
- Changed type/interface → check all referencing files
- Changed component props → check all consumers

**Data flow tracing (required for any value crossing function boundaries):**
For every value that originates from an external source (URL/search params, API response, env var, CMS data, user input) and is used in the diff, trace its full journey from origin to final consumption. At each step ask:
- What is the type/shape at this point? (string? array? number? undefined?)
- Is it validated/normalized before use, or passed raw?
- Does any intermediate function wrap, unwrap, or transform it? Does the next function expect that transformation?
- What is the final output? (URL string, HTML attribute, meta tag, file content, cache key)
If the value passes through 3+ functions without validation, that's a high-risk path — verify the shape at the consumption point matches what the origin actually produces.

**Implicit contract verification:**
When a function returns a default/fallback value on error (`[]`, `null`, `{}`, `0`, `false`), trace every caller and check: can the caller distinguish "real empty/zero/false" from "error occurred, got fallback"? If not — the caller silently treats errors as valid data. This is especially dangerous when the return value feeds into:
- File writes (incomplete artifacts)
- Page rendering (missing sections cached by CDN)
- Client responses (200 OK with empty data)
- Cache population (empty cache served to all users)
- Conditional logic (`if (result.length === 0)` means both "no items" and "fetch broke")

**External API uncertainty protocol:**
When a finding depends on the behavior of an external API (Stripe, third-party SDKs, browser APIs), do not assert constraints that cannot be verified from the code in context. Surface uncertainty explicitly: "Verify with [API] docs that X is permitted here — if not, this would cause Y." Never invent API constraints from training knowledge.

**Codebase convention check:**
For every pattern in the diff, grep how the same thing is done elsewhere. Deviation from the project's established convention is a valid finding — flag the inconsistency and reference the established pattern.

**Negative examples — these look like bugs but are NOT (do not flag):**
- `as any` on a third-party SDK response where the SDK's types are wrong — grep first; if 3+ call sites do the same cast, it's an established workaround
- `// eslint-disable-next-line` or `// biome-ignore` with a justification comment — the developer already considered and accepted the tradeoff
- `useState` + `useEffect` that syncs with an external source (WebSocket, broadcast channel, URL params) — this is NOT derived state; it has a side-effect source
- Empty `catch {}` in a `finally`-style cleanup where the error is genuinely irrelevant (e.g., aborting an already-aborted controller)

---

## Step 3 — Bug & logic review

Apply all checks from [checks-bugs-logic.md](checks-bugs-logic.md) to changed files.

---

## Step 3.5 — Failure mode analysis

For every external dependency touched or introduced by the diff (API call, DB query, cache read, file read, third-party SDK call), systematically answer these four questions:

1. **Slow/hanging**: What happens if this call takes 30+ seconds? Is there a timeout? If not, does the process block indefinitely?
2. **Down/error**: What happens on network failure or 5xx? Does the error propagate, or is it swallowed? If swallowed, what does the caller receive?
3. **Empty/missing**: What happens if the response is valid but empty (`[]`, `{}`, `null`, `""`)? Does the caller treat empty as "no data" or "error"? Can it distinguish the two?
4. **Wrong shape**: What happens if the response has an unexpected structure (field renamed, type changed, extra nesting, array instead of object)? Is the shape validated before use?

If the answer to any question is "nothing visible — the code silently continues with bad data," that's a finding. The severity depends on what happens downstream (corrupted artifact = 🔴, wrong UI = 🟡, logged and handled = 🔵).

This step catches the class of bugs where individual functions work correctly in isolation but the **contract between them** is broken under non-happy-path conditions.

---

## Step 4 — Architectural coherence (holistic pass)

This is the step automated tools cannot perform. After reading all changed files, step back and evaluate the overall approach — not individual lines.

Ask:
- **Is the right tool being used?** Client state where server state suffices? New context where prop drilling is cleaner? New abstraction that duplicates an existing one?
- **Is state being duplicated?** Does this PR copy server response into `useState` that never diverges from the server source of truth?
- **Is the data flow coherent?** Does data flow in one direction, or does this PR introduce circular dependencies, bidirectional sync, or ambiguous ownership?
- **Is the component boundary correct?** Server Component demoted to Client Component unnecessarily? Business logic leaking into the presentation layer?
- **Does this approach scale?** Will it work correctly with 10x the data, 10x concurrent users, or when called from a new entrypoint?

- **Are shared constants the single source of truth?** When a constant controls filtering/exclusion in one context (e.g., `EXCLUDED_CATEGORIES` for breadcrumbs/structured data), grep for parallel exclusion lists in other contexts (sitemap generation, robots.txt, API filters). If the same items are excluded in multiple places via separate lists, flag the divergence — the constant should be the single source of truth, or at minimum both lists must stay in sync. A mismatch means URLs appear in structured data but not in the sitemap (or vice versa), harming SEO.

- **Aggressive prefiltering drops valid consumer data**: When data passes through an intermediate filter before reaching a consumer component, verify the filter doesn't remove entries the consumer legitimately needs. Common pattern: filtering a list to match only "active" or "visible" parent records, which silently drops historical/completed child records needed for a "finished" or "history" tab. The filter should either be removed (let the consumer decide) or broadened to include all cases the consumer handles.
- **Data mapping omits fields consumed by downstream logic**: When a function maps one type to another (e.g., `Achievement -> ChallengeCardData`), verify ALL fields used by downstream components are populated — not just the visually rendered ones. Downstream components may use unmapped fields for status computation, progress calculation, or conditional rendering. Trace each field the consumer reads and confirm the mapper provides it. Missing fields silently fall back to `undefined`/`0` via `??` defaults, producing wrong but non-crashing behavior.

- **Output artifact validation**: If the diff touches code that generates artifacts (sitemap XML, robots.txt, structured data/JSON-LD, static JSON files, RSS feeds, OpenGraph meta tags, canonical URLs, cache entries, email templates), verify the artifact is correct:
  - URLs are well-formed (no `undefined`, `NaN`, double slashes, missing protocol)
  - No stale references to deleted/renamed routes or content
  - Size/count within platform limits (sitemap: 50MB / 50,000 URLs; meta description: ~160 chars)
  - Format matches spec (valid XML, valid JSON-LD, correct robots.txt syntax)
  - Content matches what's rendered on the page (title in metadata = title in `<h1>`; canonical URL = actual page URL)

Only flag architectural concerns when you can articulate a concrete failure scenario or a specific better pattern. Do not flag on vague "feels wrong" intuition alone.

---

## Steps 5–8 — Frontend checks

Apply checks from [checks-frontend.md](checks-frontend.md) (accessibility, Tailwind, performance) to changed `.tsx`/`.jsx`/`.css` files.

---

## Step 6 — React / Next.js

Apply all checks from [checks-react-nextjs.md](checks-react-nextjs.md) to changed files.

---

## Steps 9–12 — Infrastructure checks

Apply checks from [checks-infra.md](checks-infra.md) (tests, linter, DB/ORM, env/config) to relevant changed files.

---

## Output Format

Present all findings in a single markdown report. Before writing output, apply the final filter: discard any finding that fails Gate 1 (confidence) or Gate 2 (actionability) from the Reasoning Discipline section above.

Severity levels (with calibration examples):
- 🔴 **Critical** — bug, security vulnerability, data loss, or incorrect behavior with a concrete trigger. Must fix before merge.
  _Example: missing `await` on a balance update — 🔴 because the UI shows success while the write is silently dropped, causing real data loss._
- 🟡 **Warning** — performance regression, missing type safety, potential runtime error under realistic conditions. Should fix.
  _Example: `<Image fill>` without `sizes` — 🟡 because it downloads up to 9x more data than needed, but the page still renders correctly._
- 🔵 **Info** — missing test coverage, minor improvement, best practice with measurable benefit. Nice to have.
  _Example: no test for a new error path — 🔵 because the code works, but the rollback logic is unverified and could regress silently._

Format each finding as:
```
N. 🔴/🟡/🔵 [category]  file:line  → description (concrete runtime impact in this specific context)
```

Example output:
```
## Review: feature/my-branch → origin/develop
### Files changed: 5 files (+120, -30)

1. 🔴 [security]   src/api/auth/route.ts:42            → user input concatenated directly into SQL — SQL injection, no sanitization present
2. 🔴 [async]      src/hooks/useDeposit.ts:18           → missing await on updateBalance() — balance update silently ignored, UI shows success on failure
3. 🟡 [null]       src/utils/formatPrice.ts:31          → prices.map() on value that is undefined when API returns an empty cart — crashes on empty state
4. 🔵 [tests]      src/hooks/useDeposit.ts              → no test for the error path added on line 24 — the rollback logic is untested

### Linter
✅ No issues

### Architectural notes
No fundamental approach concerns in this PR.
```

If no issues are found:
```
## Review: feature/my-branch → origin/develop
✅ No issues found across X changed files.
```

Only surface findings with concrete runtime impact. No style preferences, no theoretical concerns, no findings that fail the actionability gate.
