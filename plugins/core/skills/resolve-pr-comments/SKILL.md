---
name: resolve-pr-comments
description: >
  Process every open review comment on a GitHub PR end-to-end: fetch all
  unresolved threads, fix each at the source via the fix-after-review skill
  (parallelizing across files via superpowers), commit the whole round as a
  single commit, reply to each thread in caveman style, then resolve the
  threads. Triggered by `/resolve-pr-comments <FULL_PR_URL>` or natural-
  language phrases like "resolve all PR comments on https://github.com/...",
  "fix and resolve the review comments on PR #1694",
  "address every comment on this PR", "go through the bot review comments
  and resolve them". REQUIRES a full PR URL or a PR number plus the current
  repo's origin — derive org/repo/number from the URL, never assume.
---

# Resolve PR comments

End-to-end loop: worktree → fetch → fix → commit (once) → reply → resolve → summary → cleanup.

## Strict invariants

These rules exist because skipping any one of them produces silent data loss or wrong-PR commits:

1. **Always derive `<host>`, `<org>`, `<repo>`, `<pr_number>` from the URL the user provided.** Never default to the current repo or branch. If only a PR number is given AND the user's `pwd` is inside a git repo, you may use that repo's origin — confirm by reading `git remote get-url origin` first.
2. **All file edits, git operations, and verification commands run inside the worktree.** Never modify files in the caller's working directory.
3. **One commit per round.** Never commit mid-round. Apply every fix, run `tsc`/lint/tests once at the end, then commit.
4. **Never resolve a thread before its reply is confirmed posted.**
5. **Never reply before the fix commit is confirmed pushed (or at least committed locally if the user is offline).**
6. **Skip — don't guess** — when a comment is ambiguous, asks for a product decision, or proposes a refactor wider than the PR's scope. Flag in the summary.
7. **Auto-push is allowed in this flow.** This skill is the explicit exception to any project- or user-level rule that requires manual `git push`. Replies cite a `<SHA>` that reviewers must be able to fetch — leaving the commit unpushed breaks the contract of Steps 4–6. Push without prompting; halt only if push itself fails (protected branch, no upstream, network).

## Required prerequisites

Before doing anything, load these skills so their context is available:

1. `superpowers:dispatching-parallel-agents` — for parallel fix execution across independent files (only used when ≥3 paths have unresolved threads).
2. `caveman` — for the reply text style (full level).
3. `fix-pr-thread` — the per-thread fix protocol. Replaces the older `fix-after-review` for this flow specifically; bulletproofs against same-file races, orchestrator rollback, and scope-widening.

**How to load a skill:**
- First try invoking via the `Skill` tool (works when the skill appears in the system-reminder available-skills list).
- If NOT in the system-reminder list, check if it exists as a file: `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md`. If the file exists, **Read it directly** — this is equivalent to loading it via `Skill`.
- Only declare a skill "missing" if it is absent from BOTH the system-reminder list AND the filesystem.

Do not stop the flow just because a skill isn't in the system-reminder list — always check the filesystem first.

## Step 0 — Worktree setup

All work runs in an isolated git worktree. Two entry paths:

- **Common path** — invoked by `/pull-request` after PR open. Worktree already
  exists at `.worktrees/pr-<N>` and this session is already cd'd into it.
  Steps 0a–0c just verify and proceed.
- **Direct invocation** — user runs `/resolve-pr-comments <URL>` standalone
  (no preceding `/pull-request`). Worktree may not exist; this step creates it.

### 0a — Resolve the PR branch

```bash
BRANCH=$(gh pr view <PR_URL> --json headRefName --jq .headRefName)
```

If this fails (not authenticated, wrong URL), abort with a clear error.

### 0b — Locate or create the worktree

Worktree path: `<MAIN_ROOT>/.worktrees/pr-<PR_NUMBER>`. `MAIN_ROOT` must be the
absolute path of the main checkout — this works regardless of whether the
current session is sitting in the main checkout or already in the worktree.

```bash
# First entry of `git worktree list --porcelain` is ALWAYS the main checkout
# with an absolute path. Reliable from any worktree.
MAIN_ROOT=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
WORKTREE_PATH="$MAIN_ROOT/.worktrees/pr-${PR_NUMBER}"

# Reuse if it already exists
if git worktree list --porcelain | awk '/^worktree /{print $2}' | grep -qFx "$WORKTREE_PATH"; then
  echo "Reusing existing worktree at $WORKTREE_PATH"
else
  # Direct-invocation path: ensure .worktrees/ is git-ignored, then create
  cd "$MAIN_ROOT"
  mkdir -p .worktrees
  git check-ignore -q .worktrees || (echo '.worktrees/' >> .gitignore && git add .gitignore && git commit -m "chore: ignore .worktrees/")
  git fetch origin "$BRANCH"
  git worktree add "$WORKTREE_PATH" "$BRANCH"
fi
```

If `git worktree add` fails with `'<branch>' is already used by worktree at <path>`:
the user's main checkout is on the PR branch. Print:

```
Branch <BRANCH> is held by your main checkout at <path>.
Switch your main checkout to a different branch, then re-run.
(Or use /pull-request which handles this automatically.)
```

Halt this round, but do NOT exit the loop — schedule the next `ScheduleWakeup`
so a future round can succeed once the user switches.

### 0c — Move into the worktree

```bash
cd "$WORKTREE_PATH"
```

All subsequent steps run from this directory.

### 0d — Install dependencies (first time only)

```bash
[ -d node_modules ] || pnpm install   # or detected PM
```

Subsequent rounds: `node_modules` is already present, skip.

### 0e — Worktree dirty check

```bash
git status --short
```

If anything tracked is staged or modified (i.e. uncommitted work from a
previous interrupted round): stop. Tell the user. Do NOT proceed — the round
commit would silently include unrelated changes.

### 0f — Acquire concurrency lock

A second `/resolve-pr-comments` invocation (manual + `ScheduleWakeup` firing,
two manual triggers, etc.) on the same worktree would race on edits and
produce duplicate commits. Take an atomic lock on the per-worktree git dir
before doing anything else.

```bash
GITDIR=$(git rev-parse --git-dir)
LOCKDIR="$GITDIR/resolve-pr.lock"
STALE_AFTER=1800  # 30 minutes — bigger than any sane round

# Reap stale lock from a crashed prior round
if [ -d "$LOCKDIR" ]; then
  LOCK_MTIME=$(stat -f %m "$LOCKDIR" 2>/dev/null || stat -c %Y "$LOCKDIR" 2>/dev/null || echo 0)
  AGE=$(( $(date +%s) - LOCK_MTIME ))
  if [ "$AGE" -ge "$STALE_AFTER" ]; then
    echo "Stale lock (${AGE}s old). Reaping."
    rm -rf "$LOCKDIR"
  fi
fi

# Atomic acquire: mkdir is the only POSIX op guaranteed atomic across NFS, macOS, Linux
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  echo "Another /resolve-pr-comments round in progress. Skipping this firing."
  exit 0   # Soft-skip — next ScheduleWakeup retries
fi
date +%s > "$LOCKDIR/started"
```

The lock is **released** at:
- End of Step 7 (successful summary print)
- All halt paths: dirty worktree, verification failure, push failure, "Nothing to do" exit

Release helper (call before every `exit`):

```bash
release_lock() { rm -rf "$LOCKDIR"; }
```

If the round crashes mid-flow without releasing, the stale-reap above clears the lock at the next firing 30 min later.

**Why mkdir, not flock**: macOS does not ship `flock(1)`. `mkdir` is atomic on every filesystem we care about. Symlinks are also atomic but harder to clean.

## Step 1 — Parse the PR URL

Accept either:
- Full URL: `https://github.com/<org>/<repo>/pull/<n>`
- Bare number `#<n>` or `<n>` ONLY if the user is inside the matching repo (verify via `git remote get-url origin`).

Extract: `host`, `org`, `repo`, `pr_number`. Use these literally in every API call below — don't pass `--repo` flags that resolve to the current dir's origin.

```bash
# example parse
URL="$1"
ORG=$(echo "$URL" | sed -nE 's#https?://[^/]+/([^/]+)/[^/]+/pull/.*#\1#p')
REPO=$(echo "$URL" | sed -nE 's#https?://[^/]+/[^/]+/([^/]+)/pull/.*#\1#p')
PR=$(echo "$URL" | sed -nE 's#.*/pull/([0-9]+).*#\1#p')
```

If any field is empty, abort with a clear error.

## Step 2 — Fetch open unresolved review comments

Use the GraphQL `reviewThreads` query (REST `/comments` doesn't expose `isResolved`):

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 100) {
            nodes {
              databaseId
              body
              author { login }
              diffHunk
            }
          }
        }
      }
    }
  }
}' -f owner=$ORG -f repo=$REPO -F pr=$PR
```

Filter to `isResolved == false`. Skip `isOutdated == true` — they refer to code that no longer exists, flag them in the summary.

Group filtered threads by `path`. Within a path, order by `line`. This grouping decides parallelism: different paths can be fixed in parallel; same path must be sequential.

If zero unresolved threads remain: print "Nothing to do" and exit.

## Step 3 — Fix each thread

For each thread, gather:
- File path, line, **full thread (all comments, not just the first)**, diff hunk
- The thread ID (needed for resolution in Step 6)
- The first comment's `databaseId` (needed for the reply in Step 5)

The GraphQL query in Step 2 already requests `comments(first: 100)` (GitHub's per-page maximum on connections) so the full thread is available — pass it through to the fix protocol.

### 3a — Group by path

Group threads by `path`. Within a path, sort threads by `line` ascending.
**This grouping is the bedrock invariant: same-file threads always go to
ONE worker, never split across parallel agents.** Two agents must never
edit the same file.

### 3b — Run `fix-pr-thread`

Invoke the `fix-pr-thread` skill with input `{ path, threads }` per group.
Read `${CLAUDE_PLUGIN_ROOT}/skills/fix-pr-thread/SKILL.md` for the protocol.

**Execution mode:** delegate the inline-vs-parallel decision to
`superpowers:dispatching-parallel-agents` (loaded as a prerequisite). It
applies its own threshold based on independence and shared state. Whatever
it decides, the bedrock invariant holds: **one path group is a single unit
of work — never split across agents**.

Each invocation returns a per-thread result list:

```json
[
  { "threadId": "...", "status": "fixed" | "skipped" | "dismissed", "reason"?: "...", "filesChanged"?: ["..."] }
]
```

Three statuses, three downstream actions in Step 5/6:
- **fixed** → reply "Fixed in <SHA>. ..." → resolve
- **skipped** → reply with a specific caveman reason (out-of-scope, product decision, pre-existing, accepted nit, etc.) → **resolve** (do not leave open)
- **dismissed** → reply "Dismissed. ..." → resolve

### 3c — Verify

After all groups complete, aggregate results and run verification ONCE in
the worktree. Verification commands are **detected from the project**, not
hardcoded.

#### Detection (run once on the first round, cache result for later rounds in the same loop)

**Step 1 — Package manager** (from lockfile in worktree root):

| Lockfile | Package manager |
|---|---|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lockb` | `bun` |
| `package-lock.json` | `npm` |

If no lockfile or no `package.json`: this isn't a Node project. Run no
checks and proceed (caller may extend for non-Node stacks; out of scope
here).

**Step 2 — Pick verification scripts** from `package.json.scripts`. For each
of the three checks below, pick the first script name that exists:

| Check | Script names to try (in order) | If none found |
|---|---|---|
| Typecheck | `type-check`, `typecheck`, `tsc` | `<PM> exec tsc --noEmit` (only if `tsconfig.json` present) |
| Lint | `lint`, `lint:check`, `biome:check`, `eslint` | skip |
| Test | `test`, `test:unit`, `test:run` | skip |

Use `jq -r '.scripts."<name>"' package.json` to check existence.

**Step 3 — Read CLAUDE.md** if present at worktree root. If it documents
specific verification commands (e.g. "always run `pnpm verify` before
PR"), prefer those over the detected ones. CLAUDE.md is the source of
truth when it speaks.

#### Run

Sequential, fail-fast:

```bash
cd $WORKTREE_PATH && \
  $PM run $TYPECHECK_SCRIPT && \
  ([ -n "$LINT_SCRIPT" ]  && $PM run $LINT_SCRIPT  || true) && \
  ([ -n "$TEST_SCRIPT" ]  && $PM run $TEST_SCRIPT  || true)
```

If any check fails: **halt**. Do NOT commit, do NOT reply, do NOT resolve.
Print the failing check and the file:line. Leave the worktree intact.
Fire the verification-failure notification (see § Notifications). **Release the lock** (`rm -rf "$LOCKDIR"`) before exiting — otherwise the next firing skips for 30 min.

#### Runtime smoke check (tiered by blast radius)

`tsc` is not enough. Bundlers (Turbopack, webpack, Vite) statically resolve dynamic `import('...')` calls at build time, fail on missing optional peers, on broken module-resolution config, on circular SSR boundaries — none of which `tsc --noEmit` catches. A round that mutates dependencies, build config, or runtime code MUST be exercised at the level its failure mode lives at.

Pick the highest tier that any file in `results.filesChanged` triggers. Run that tier's check **after** tsc/lint/tests pass.

| Tier | When (any file in results.filesChanged matches) | Check |
|---|---|---|
| **0 — none** | Only `*.md`, `src/migrations/*`, `*.sql`, `.gitignore`, CI configs, `docs/**` | Skip — tsc covered it |
| **1 — build** | `package.json`, lockfile, `next.config.*`, `vite.config.*`, `tsconfig.json`, `*.d.ts` at root, anything that affects module resolution | `pnpm build` (or detected build script). Must succeed. |
| **2 — runtime** | Any file under `src/app/**`, `src/components/**`, `src/lib/**`, server routes, middleware, payload config, anything that runs at request time | Tier 1 + dev-server smoke test (below) |

**Tier 2 dev-server smoke test:**

1. Start the dev server in the background. Capture the port.
2. Wait for it to become ready (poll `http://localhost:<port>/` until 200, max 60s).
3. Open the affected page(s) via `mcp__claude-in-chrome__navigate`. For each page:
   - `mcp__claude-in-chrome__read_console_messages` — filter to `error` / `warning`. Flag any new entries that didn't exist on `main`.
   - If the change touches a specific user flow (auth, checkout, form submit), exercise that flow via `mcp__claude-in-chrome__find` + `mcp__claude-in-chrome__form_input`. Verify the network response (`mcp__claude-in-chrome__read_network_requests`) returns 2xx.
4. Kill the dev server before the commit step. Do NOT leave it running across rounds — the next round's verification would race with it.

Which pages count as "affected"? Use the file path:
- `src/app/(frontend)/foo/page.tsx` → smoke `/foo`
- `src/app/(payload)/admin/**` → smoke `/admin`
- `src/payload.config.ts` or any collection / global → smoke both `/admin` and one `/` page that uses Payload
- Shared component (`src/components/**`) → smoke any page that imports it (find via grep)

If the page renders without console errors and the flow you exercised works, verification passes.

If verification fails: same halt rules as above — do NOT commit, kill dev server, fire verification-failure notification, release lock. Surface what broke (console error / failed network call / page crash) in the halt message.

**Why tiered, not always run browser:** Round-2 of PR #29 broke `next build` by removing a dep that cms-plugins dynamic-imports — `tsc --noEmit` was green. A SQL migration fix or a docs typo doesn't need a browser; a `package.json` mutation absolutely does.

## Step 4 — Single commit

Stage only the files the agents actually changed. Avoid `git add -A`.

### Determine round number

Each invocation of `/resolve-pr-comments` is a separate **round**. The commit subject includes the round number so the PR's commit history reads as a clear sequence (`round 1`, `round 2`, …).

Read + increment a counter file inside the per-worktree git dir. This survives `git rebase`, `commit --amend`, branch resets, and force-pushes — the counter is not part of the commit graph, so no git operation can perturb it. It is reset only when the worktree is removed (which happens once on "Nothing to do" — at which point starting fresh from `round 1` is correct).

```bash
GITDIR=$(git rev-parse --git-dir)
ROUND_FILE="$GITDIR/resolve-pr-round"
ROUND=$(( $(cat "$ROUND_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$ROUND" > "$ROUND_FILE"
```

`$GITDIR` for a linked worktree is `<MAIN>/.git/worktrees/pr-<N>`, so the counter is naturally scoped per-PR-worktree. Do NOT use `git log --grep` — it breaks on squash, on branch reset, and on any history rewrite. The state file is the source of truth.

### Commit message (Commitizen format)

```
fix: PR review fixes (round <ROUND>) — #<PR_NUMBER>

- <path>:<line> — <what changed>; <why / root cause>
- <path>:<line> — <what changed>; <why / root cause>
- ...
```

**Body is required and must be useful to a reader scanning the PR's commit history without opening each thread.** One bullet per fixed thread, in the order fixes were applied. Each bullet has two halves separated by `;`:

1. **What changed** — terse caveman: identifiers/file paths verbatim, no articles.
2. **Why** — root cause or contract being honored. This is the part that turns the commit from a checklist into a record.

Wrap body lines at ~72 chars (commitlint enforces 100). For multi-line bullets, indent continuation lines with 2 spaces:

```
- stats-accordion.tsx — collapsed content gets inert + aria-hidden +
  pointer-events-none; aria-controls links button to panel; tab focus
  no longer enters hidden subtree
- stats-body.tsx:74 — fallback={<></>} not null; CustomErrorBoundary's
  `fallback || <FallbackError />` short-circuits null to FallbackError
```

For `dismissed` / `skipped` threads — do NOT include them in the commit body (no code changed). They appear only in the Step 7 summary.

Hard rules:
- Subject must match the regex `^fix: PR review fixes \(round [0-9]+\) — #[0-9]+$` — the round-counting grep above relies on it.
- Body bullets stay caveman-full: drop articles, fragments OK, identifiers verbatim. Same convention as the `pull-request` skill.
- No marketing prose. No "Co-Authored-By: Claude". No "Generated with Claude Code" footer.

Push the commit:

```bash
git push
```

If push fails (no upstream, protected branch, etc.), stop. Do not proceed to reply/resolve until the commit is on the remote — otherwise reviewers will see "fixed" replies pointing at a commit they can't see. Fire the push-failure notification (see § Notifications). **Release the lock** (`rm -rf "$LOCKDIR"`) before exiting.

Capture the commit SHA.

## Step 5 — Reply per thread (caveman-full)

For each `fixed` thread, post a reply via REST `/repos/<org>/<repo>/pulls/<n>/comments` with `in_reply_to=<comment_databaseId>`.

Reply body in **caveman-full**:
- Drop articles, filler, hedging.
- Fragments OK, short synonyms.
- Pattern: `Fixed in <SHA>. <what changed>. <why>.`
- Identifiers/error strings/file paths verbatim.
- 1–2 sentences max. NO emoji branding, no "Generated with Claude" footer.

Examples:

```
Fixed in 0c52e4203. Same `Boolean(...)` gate applied to common `BonusDetailItem`. Same root: missing `games` attribute → `enabled: undefined` → TanStack v5 runs query.
```

```
Fixed in adffe7ab2. Chevron extracted to `RowChevron` sibling, no longer inside `<Link>`. `<a>` cannot contain `<button>` per HTML spec.
```

For each `skipped` thread, post a short caveman reply that explains *why* this isn't being fixed in this PR. Keep it specific — generic "Out of scope" alone is lazy when the thread asks something concrete.

Pattern: `<verdict>. <one-line reason or follow-up>.`

Examples — pick whichever fits the thread:

```
Out of scope. Refactor of shared `useTournamentsState` hook touches every consumer.
```
```
Needs product decision on copy. Tracking as follow-up.
```
```
Pre-existing on develop, not introduced here. Will land via separate cleanup PR.
```
```
Acknowledged — perf nit. Subsequent navigations cache the request, accepting on cold load.
```

Hard rules:
- Stay terse (1–2 sentences).
- Identifiers/file paths verbatim.
- Do NOT solicit a human decision ("let me know if…", "open if you want…") — the thread will be **resolved** in Step 6.
- Do NOT default to "Out of scope" when a more accurate reason is one beat away.

For each `dismissed` thread, post a reply citing the verifying evidence (still caveman):

```
Dismissed. <reason from fix-pr-thread>. <verifying file:line>.
```

Example: `Dismissed. ApiResponseError exposes both .statusCode and .status; e.statusCode is correct (api.ts:23, 31).`

Confirm each REST call returns 201 before proceeding to resolve that thread.

## Step 6 — Resolve threads

For each thread that was BOTH fixed AND replied successfully, call:

```bash
gh api graphql -f query='
mutation($id: ID!) {
  resolveReviewThread(input: {threadId: $id}) {
    thread { id isResolved }
  }
}' -f id="<threadId>"
```

For `skipped` threads: also resolve. Never leave a thread open for a human — the caveman "Out of scope" reply is the record. If the deferred item matters, the reviewer will reopen or file a follow-up issue.

## Step 7 — Summary

Print exactly:

```
PR: <URL>
Threads found (unresolved): <N>
Fixed & resolved: <N>
Dismissed (false positive — replied + resolved, no commit): <N>
  - <path>:<line> — <reason>
Out-of-scope (replied + resolved, no commit): <N>
  - <path>:<line> — <reason>
Outdated (auto-skipped): <N>
Commit: <SHA or "none">
```

Nothing else. No marketing footer.

After printing, **release the lock**:

```bash
rm -rf "$LOCKDIR"
```

This is the normal-completion release. Halt paths (Step 0e dirty worktree, Step 3c verify failure, Step 4 push failure) and the "Nothing to do" exit must each release the lock too.

## Notifications

The user may be working on another branch in another session. Loop progress
and halts must surface via OS notifications, not just terminal output. The
loop runs every 15 min by default — silent terminal output is invisible.

**Per-round completion is NOT notified** — too noisy. Only fire on:

| Event | When | Notification body |
|---|---|---|
| **Loop completion (success)** | "Nothing to do" exits the loop, or all threads outdated | `PR #<N>: all threads resolved` |
| **Verification failure (halt)** | Step 3c fails | `PR #<N>: <check-name> failed in worktree` |
| **Push failure (halt)** | Step 4 push rejected | `PR #<N>: push failed — see terminal` |

### Cross-platform helper

Always run via this idiom (macOS first, Linux fallback, silent if neither):

```bash
notify() {
  local title="Claude Code"
  local body="$1"
  osascript -e "display notification \"$body\" with title \"$title\"" 2>/dev/null \
    || notify-send "$title" "$body" 2>/dev/null \
    || true
}

# usage:
notify "PR #1701: all threads resolved"
```

Silent on Windows / headless environments — never block the flow.

## Edge cases

- **No unresolved threads — but only after TWO consecutive quiet rounds:** Cursor Bugbot regularly lands new findings 8–15 min after the latest commit, so a single "Nothing to do" tick is inconclusive. The first time threads drop to zero unresolved: print the summary noting "no unresolved this round" and `ScheduleWakeup` once more at the normal cadence. ONLY exit the loop (print "Nothing to do", fire loop-completion notification, remove the worktree) when TWO consecutive rounds both find zero unresolved threads. This wastes one extra round per PR but reliably catches late-arriving comments. (No explicit lock release needed on worktree removal — the worktree's `.git/` is gone with it.)
- **All threads outdated:** print summary noting all were outdated, fire loop-completion notification, remove the worktree, exit without committing.
- **Verification fails after fixes:** halt before commit. Print which check failed and the file:line. Fire the verification-failure notification. Release lock (`rm -rf "$LOCKDIR"`). Do NOT push, reply, resolve, or remove the worktree — leave it for the user to inspect.
- **Push fails (protected branch, no upstream):** halt before reply/resolve. Fire the push-failure notification. Release lock. Tell the user; await direction. Leave the worktree intact.
- **Worktree dirty before start (Step 0e):** stop and ask. Don't bury unrelated changes in the round commit. Release lock.
- **Lock already held (Step 0f):** another round is in progress. Soft-skip — `exit 0` without releasing the lock (the holder owns it). Next `ScheduleWakeup` retries. Stale locks (>30 min old) are auto-reaped at lock acquisition.
- **HEAD on `main`/`develop` in worktree:** stop. Never commit/push to those. Release lock.
- **`.worktrees/` not git-ignored:** add `.worktrees/` to `.gitignore` and commit it before creating the worktree.
- **Comment is the user's own (not a bot, not a teammate):** still process it the same way — author identity doesn't change the protocol.
- **Multiple bot comments saying the same thing on the same line:** treat as one fix; reply on each thread but the fix only happens once.
- **Loop use case (ScheduleWakeup):** worktree persists between rounds — reuse it (Step 0c detects it). The round counter (`$GITDIR/resolve-pr-round`) and lock dir live inside the worktree's git dir, so they too persist across rounds and disappear with the worktree. Only remove after "Nothing to do".

## Example invocation flow

```
User: /resolve-pr-comments https://github.com/acme/webapp/pull/1701
```

**Round 1 (first call):**
0. Branch → `fix/wallet-bonus-error`. Create `.worktrees/pr-1701`, fetch branch, `pnpm install`.
1. Parse → `org=acme`, `repo=webapp`, `pr=1701`.
2. Fetch threads → 5 unresolved (cursor ×2, claude ×2, coderabbit ×1).
3. Group by path → 3 paths. Dispatch 3 parallel agents (working inside `.worktrees/pr-1701`).
4. All agents return `fixed` except coderabbit's `aria-expanded` → skipped.
5. Run `pnpm tsc --noEmit && pnpm biome check && pnpm vitest run` inside worktree — green.
6. Stage, commit, push from worktree.
7. Reply, resolve. Print summary.
8. ScheduleWakeup 15 min (delaySeconds: 900) — Bugbot review latency runs 8–15 min on real commits, so shorter waits silently miss its second-pass findings. Do NOT undercut this with prompt-cache heuristics; the cache miss is cheaper than another empty round..

**Round 2 (ScheduleWakeup fires):**
0. `.worktrees/pr-1701` already exists → reuse. Skip `pnpm install`.
2. Fetch threads → 2 new unresolved.
... fix, commit, push, reply, resolve, schedule next round.

**Final round:**
2. Fetch threads → 0 unresolved.
→ "Nothing to do." Remove worktree: `git worktree remove --force .worktrees/pr-1701`. Exit.
