---
name: fix-pr-thread
description: >
  Per-thread fix protocol for GitHub PR review comments. Bulletproof companion
  to resolve-pr-comments. Reads the full file and the full thread (all
  comments, not just the first), decides fix/skip/dismiss, applies a minimal
  scope-bounded edit, returns a structured result. Same-file threads are
  processed sequentially by ONE agent; different files run in parallel ONLY
  at scale (≥3 paths). No orchestrator phase, no "fix all occurrences," no
  external doc lookup, no background dispatch by default. Designed to eliminate
  the failure modes listed under "Failure mode coverage" below. Internal —
  invoked by resolve-pr-comments, not typed by the user.
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Fix PR Thread

Per-thread fix protocol for PR review comments. Used by `resolve-pr-comments`
in Step 3 (Fix each thread).

This skill is **internal** — it is invoked by `resolve-pr-comments` with a
structured input, not directly by the user. It does not commit, push, reply,
or resolve threads. Those steps belong to the caller.

## ⚠️ If you're reading this because the user typed `/core:fix-pr-thread` directly

The user almost certainly meant `/core:resolve-pr-comments` — the outer skill that
owns the FULL flow (fetch threads → fix per path → verify → commit → push →
reply → resolve → wait → re-check). Routing to the outer skill is correct.

If you proceed anyway (because the user explicitly insists, or you've already
taken on the caller role and editing/committing has happened), you MUST
execute the caller's responsibilities in full. **The most-skipped step, and
the one that breaks PR correctness more than any other, is the post-push
re-check.** Read the next section before doing anything destructive.

## 🛑 Caller's responsibilities — DO NOT SKIP

The inner-skill protocol below covers steps 1-3 (read → decide → edit). The
caller (`resolve-pr-comments`, or whoever is acting in its place) owns
steps 4 onwards. Skipping any of these — especially the re-check loop —
produces replies that lie about the state of the PR.

After applying fixes for every thread on every path:

**4. Verify.** Run `tsc --noEmit` and `lint` (and `tests` if affected).
   Pre-existing errors in unrelated files are fine; new errors from your
   edits halt the round. Fix or revert before committing.

**5. Commit + push.** One commit per round. Push to the PR's branch before
   replying — the reply body cites the commit SHA, which must exist on the
   remote.

**6. Reply + resolve each thread** with a one-line justification matching
   the status (`fixed` / `skipped` / `dismissed`). Cite the commit SHA on
   `fixed` replies.

**7. Schedule the next round: `/loop 15m /core:resolve-pr-comments <PR_URL>`**
   (skip if this round was itself a `/loop` firing). Review bots regularly
   land new findings 8–15 min after a commit. Shorter waits silently miss
   the second-pass review. This is not optional — it's the verification
   gate that makes the fix-and-reply-and-resolve dance honest.

**8. On the next firing, RE-FETCH unresolved threads.** Treat the PR as if
   you're approaching it fresh:
   - If new unresolved threads exist → start a new round (back to step 1).
     A fix you applied in round N may have introduced the round-(N+1)
     finding. This is normal and expected.
   - If zero unresolved threads → this is a "quiet round." Let the loop
     fire once more at the same 15-min cadence to confirm.

**9. Exit only after TWO CONSECUTIVE QUIET ROUNDS.** A single zero-thread
   tick is inconclusive — bot review is async and the second pass
   often arrives within the same 15-min window. Two consecutive quiet
   rounds means the bot has had two passes to flag follow-ups and stayed
   silent. Only then is the PR genuinely clean; tell the user to stop the loop.

If you commit + push + reply + resolve and then declare the PR done without
this re-check loop, you are **misleading the user about the state of the
PR**. Bots come back with follow-ups on roughly 1 in 3 commits — a later
round regularly catches a hole introduced by an earlier round's fix.

## Input contract

A list of threads, all on the **same file path**. The caller groups by path
before invocation so this skill never sees two threads on different files in
one call.

```json
{
  "path": "src/foo.ts",
  "threads": [
    {
      "threadId": "PRRT_kwDOKm7Idc59kXGX",
      "line": 42,
      "comments": [
        {"author": "coderabbit", "body": "..."},
        {"author": "RickyPiP",  "body": "..."}
      ],
      "diffHunk": "..."
    }
  ]
}
```

Threads are pre-sorted by `line` ascending so edits at the top of the file
happen before edits below.

## Output contract

```json
[
  {
    "threadId": "PRRT_kwDOKm7Idc59kXGX",
    "status": "fixed" | "skipped" | "dismissed",
    "reason": "<one-line justification, REQUIRED for skipped/dismissed>",
    "filesChanged": ["src/foo.ts"]
  }
]
```

Three statuses, three meanings:

- **fixed** — bug confirmed, minimal edit applied. `filesChanged` lists files touched (always exactly one: the input `path`).
- **skipped** — bug may be valid, but addressing it is out of thread scope (refactor, product decision, parallel file). No edit. Caller posts a short "Out of scope for this PR." reply and **resolves** the thread. Threads are never left open.
- **dismissed** — bug NOT valid (false positive, stale, based on misread). No edit. Caller posts a dismissal reply and resolves the thread.

`reason` is mandatory for `skipped` and `dismissed`. The caller uses it
verbatim in the reply body.

## Protocol

For each thread on the path, in input order:

### 1. Read the full file

Read the entire file at `path`. Many comments reference behavior dependent
on imports, types, sibling functions, or the module's overall shape. Reading
only the line region misses this.

### 2. Read the full thread

For every comment in `comments[]`, read the body — not just the first.
The user may have already:
- Acknowledged the bug as out-of-scope ("not in this PR")
- Pointed to a follow-up file or issue
- Accepted a partial fix that addresses only some occurrences
- Disputed the bot's claim

Prior replies change the right action. Process them.

### 3. Decide: fix / skip / dismiss

Decision tree, in order:

#### Dismiss when

- The flagged property/method/import exists despite the reviewer's claim it doesn't (verify by reading the source).
- The flagged behavior already works as the reviewer wants (verify by tracing the code path).
- The reviewer's reasoning relies on a stale code path (the file has moved on since the comment).
- The user already replied "this is intentional / out-of-scope / by design" and the bot's follow-up doesn't refute it.

If dismissed: `reason` cites the verifying line numbers.

#### Skip when

- The fix requires editing a file outside `path`. (Skip — the caller cannot batch cross-file edits in one thread's scope. A separate thread should flag the other file.)
- The bug needs a product or UX decision the codebase can't answer alone (e.g. "should this empty state copy be X or Y?").
- The fix is a refactor wider than the immediate issue (e.g. "consolidate these two parallel files," "thread aria state through 4 components").
- The fix adds a new feature (e.g. "support keyboard navigation here").
- You are unsure between fix and skip → **skip**. The reviewer can re-flag if needed; widening the diff on a guess is worse than skipping.

If skipped: `reason` names what makes it out-of-scope.

#### Fix when

All of:
- Bug confirmed by reading the actual code.
- Fix is minimal (≤20 lines is a reasonable ceiling; bigger means refactor → skip).
- Fix is fully contained within `path`.
- No product/UX decision needed.

### 4. Apply the fix (only if status === "fixed")

**Scope rules — MUST NOT violate:**

| Rule | Reason |
|---|---|
| Edit ONLY the file at `path` | Cross-file edits = skip |
| Edit ONLY what the reviewer flagged | No grep-and-fix-similar-elsewhere; reviewer would have flagged those if they wanted them |
| Match surrounding code style | Diff stays minimal and reviewable |
| Add a comment ONLY if the fix is non-obvious | Default no comment |
| Do NOT rename, reorder imports, refactor adjacent code, or add tests | Out of thread scope |

Use the Edit tool. The Edit tool re-verifies `old_string` against the
current file state on each call, so multiple edits to the same file are
safe within this skill's sequential per-path execution.

### 5. Move to the next thread on the same path

Sequential within a path. The next thread reads the file fresh — its read
sees the prior edit. No state-passing between threads is needed; the
filesystem is the source of truth.

### 6. Return the structured result

One entry per input thread, in input order. After this point, the caller
runs verification (`tsc`/lint/tests), commits, pushes, replies, resolves.
This skill does NONE of that.

## Cross-path parallelism (caller's concern)

The caller (`resolve-pr-comments`) decides inline vs parallel: fewer than 3
path groups run inline and sequentially; 3 or more get one foreground agent
per path, each with a self-contained brief. Whatever the decision, this
invariant holds:

**Two agents NEVER edit the same file.** Same-file threads are always grouped
into one agent's input. This is the single most important invariant — the
unit of parallelism (path) equals the unit of edit safety (file).

## Anti-patterns — DO NOT DO

- ❌ One agent per thread (race condition on same-file threads — that's why we group by path)
- ❌ Orchestrator phase that re-edits files after the per-thread fixes complete (post-hoc rollback breaks the caller's "fixed" reporting)
- ❌ Grep for similar patterns and fix all occurrences (silently widens scope; reviewer didn't ask)
- ❌ Edit files outside the thread's `path` to make a fix work (skip instead)
- ❌ Background dispatch (silent stuck agents have no recovery)
- ❌ Downgrade the agent's model for "simple" bugs (misclassification → silent wrong fix; no tier classification, every thread gets the same agent)
- ❌ External documentation lookups (brittle dependency, rarely needed for code that's already in front of you)
- ❌ Ask the user mid-fix (skip and report; the caller surfaces the question)
- ❌ Commit, push, reply, or resolve threads (those are the caller's steps; this skill only edits)

## Examples

### Example 1 — fix

**Input thread:** `src/modules/gaming/games/hooks/filters.ts:71`

> "fetchGamesById's catch block has no return — TanStack v5 throws 'Query data cannot be undefined.'"

**Process:**
1. Read full `filters.ts`. Confirm: catch block at lines 63-69, no return statement.
2. Read full thread. One comment, no user reply.
3. Decision: fix. Bug confirmed, fix is local, ≤3 lines.
4. Edit catch block to add `return [];`.

**Output:**
```json
{
  "threadId": "PRRT_xxx",
  "status": "fixed",
  "filesChanged": ["src/modules/gaming/games/hooks/filters.ts"]
}
```

### Example 2 — skip

**Input thread:** `src/layouts/sidebar/components/new-sidebar-link/link-wrapper.tsx:77`

> "Add aria-expanded and aria-controls to RoleButtonRow."

**Process:**
1. Read full file. Confirm: `RoleButtonRow` is interactive but lacks expanded-state ARIA.
2. Read full thread. User has already replied: "Out of scope for this PR — tracking as follow-up."
3. Decision: skip. User has already declared scope.

**Output:**
```json
{
  "threadId": "PRRT_xxx",
  "status": "skipped",
  "reason": "User declared out-of-scope; tracking as follow-up"
}
```

### Example 3 — dismiss

**Input thread:** `src/modules/gaming/games/hooks/filters.ts:41`

> "e.statusCode is wrong; ApiResponseError exposes .status, not .statusCode."

**Process:**
1. Read full `filters.ts` and `src/utils/api.ts`.
2. Confirm in `api.ts`: line 23 is `public readonly statusCode: number` (constructor parameter property), line 31 is `get status(): number { return this.statusCode; }`. Both are valid.
3. Decision: dismiss. Reviewer's claim is verifiably wrong.

**Output:**
```json
{
  "threadId": "PRRT_xxx",
  "status": "dismissed",
  "reason": "ApiResponseError exposes both .statusCode (api.ts:23) and .status (compat getter, api.ts:31); e.statusCode is correct"
}
```

## Failure mode coverage

Each known failure mode of the old parallel-per-bug fixer (the pattern `fix-after-review` used before it adopted this protocol), addressed:

| Failure mode | `fix-pr-thread` mitigation |
|---|---|
| Same-file parallel writes (bug-level dispatch) | Group by path; same-file threads → one agent → sequential |
| Orchestrator rolls back after agent reports fixed | No orchestrator phase. Agent edits are final. |
| "Fix all occurrences" widens diff | Explicit prohibition; edit only what was flagged |
| Stale-read race within an agent | Edit tool re-verifies `old_string` per call (built-in) |
| Background mode hides stuck agents | Foreground only |
| Model mismatch (cheaper model silently wrong) | One agent definition for everything; no tier classification |
| DISMISSED unspecified | First-class status: `fixed` / `skipped` / `dismissed` |
| Only first comment fetched | Caller fetches `comments(first: 100)` (GitHub's per-page max); protocol reads all |
| External doc lookups as a brittle dependency | No external lookups |

## Integration with `resolve-pr-comments`

`resolve-pr-comments` Step 3 invokes this skill as follows:

```
Group threads by path. For each path:
  Read fix-pr-thread/SKILL.md
  Apply protocol with input { path, threads: [...] }
  Collect results

Aggregate per-thread results across paths.
After all paths complete:
  Run verification (tsc, lint, tests)
  Stage files from results.filesChanged
  Commit, push, reply, resolve (per resolve-pr-comments Steps 4-6)
```

The caller never asks this skill to commit, reply, or resolve. Status
mapping at the caller:

- `fixed`   → reply "Fixed in <SHA>. ..." then resolve
- `skipped` → reply with a specific terse reason (out-of-scope, product decision, pre-existing, accepted nit, etc.) → resolve
- `dismissed` → reply "Dismissed. ..." then resolve
