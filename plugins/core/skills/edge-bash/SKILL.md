---
name: edge-bash
description: >
  Iterative edge-case-first manual testing. Before driving anything,
  spawn a `qa-strategist` agent to produce a DOMAIN-SPECIFIC edge-case
  taxonomy for the feature (threat model, not generic Tier A/B/C).
  Run scenarios in phases, append findings to a `BugIndex-*.md` with
  severity + repro + root cause + suggested fix path, then check
  "diminishing returns" — if the last phase found new bugs AND the
  strategist can name fresh categories inspired by those findings,
  add another phase. Stop when the bug discovery rate hits zero AND
  no new categories suggest themselves. Hand the bug index off to
  `/build` for the fix pass. Triggered by `/edge-bash <feature or PR>`
  or natural language: "stress-test the edges of this feature", "find
  every way this can break", "iterative QA", "be a paranoid senior
  tester".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, mcp__playwright__*, mcp__claude-in-chrome__*
---

# Edge bash

Iterative edge-case-first manual QA. Spawn a strategist for the
domain-specific edge-case taxonomy, run phases until the bug
discovery rate goes to zero, and produce a structured bug index the
`/build` flow can act on.

Built from a session that ran 82 scenarios across 8 phases on the
ai-translate plugin, surfaced 28 bugs, and shipped a coordinated fix
bundle. The pattern that made it work: domain-specific categories +
iterative expansion based on findings + a structured bug index.

## When to use

- A feature with non-trivial failure modes that `/manual-test`'s
  Tier A/B/C matrix would under-cover: external API integrations,
  async / queue / concurrency, schema-flexible content (Lexical,
  JSON, blocks), locale-specific behavior, security-adjacent
  surfaces.
- You want a structured bug index produced as the artifact, ready to
  hand to `/build` for the fix pass.
- You're willing to spend more than one pass on QA. This skill runs
  until bugs stop appearing — not after one matrix.

## When NOT to use

- Tier-A sanity check after a small refactor → `/manual-test`.
- Single bug repro → `/repro-bug`.
- You already have the bug list, want fixes only → `/bug-bash`.
- Pure-backend logic with full unit coverage → run vitest.
- Cost-bounded feature (LLM, paid API in the path) where you can't
  afford >10 scenarios → still run, but set a hard cost cap at
  Phase 0.

## Strict invariants

1. **Domain-specific taxonomy, not Tier A/B/C.** The strategist must
   produce categories tailored to the feature's actual failure
   modes. "Schema drift", "async queue restart", "concurrent two-tab
   writes" beat "edge cases / boundaries".
2. **Iterate until diminishing returns.** A phase ending with `0
   bugs + 0 new category candidates` is the stop signal. Anything
   else triggers another phase.
3. **Bug index is the contract.** Every finding goes in with: ID,
   severity (🔴/🟡/📋), title, repro steps, root cause hypothesis,
   source files most likely involved, suggested fix path. This is
   what makes the fix phase tractable.
4. **Don't fix inside this skill.** Surface, index, move on. Fixing
   mid-discovery breaks the audit trail and biases later phases
   toward the fixed area. Escalate to `/build` (or `/bug-bash` if
   the list is small) at the end.
5. **Drive Playwright in the host context.** Same constraint as
   `/manual-test` — host stays in the driver's seat.
6. **Cost guard.** Paid LLM / API in the test path → enforce
   per-phase budget surfaced at Phase 0; ask before exceeding.
7. **Phase budget cap.** Default max 10 phases. Most features should
   converge in 3-5. If you're at phase 8 still finding bugs, the
   feature is fundamentally broken — stop and tell the user instead
   of grinding.

## Required prerequisites

Same as `/manual-test`:
1. Playwright MCP loaded.
2. Dev server reachable on the right port + basePath.
3. Login works.
4. **Plus**: a target feature scope. Ask if the user just said
   "test the branch" — generic scopes produce generic taxonomies.

## Step 0 — Frame the run

Echo a short pre-flight to the user:

```
Edge bash plan
==============
Feature scope: <one sentence>
Estimated paid-API calls per phase: <count>
Estimated total cost: <USD if known>
Phase budget: 10 (typical convergence: 3-5)
Bug index will be written to: docs/bugs/BugIndex-<YYYYMMDD>.md
Stop signal: phase with 0 new bugs AND 0 new category candidates.
```

Wait for "go" or edits.

## Step 1 — Strategist defines edge-case taxonomy

Spawn `qa-strategist` (general-purpose at sonnet) with:

- **Task**: produce a domain-specific edge-case taxonomy for this
  feature. Categories, not test cases yet.
- **Context**: feature description, source files (key ones the host
  reads first), prior bug reports if any.
- **Required output**: 6-12 categories. Each category gets a name,
  a one-line "what can break here" rationale, and 3-5 concrete
  scenarios that probe it. NOT generic — say "schema drift between
  source and target locale rows" instead of "boundary inputs".
- **Format**: markdown table of `{ category, rationale, scenarios }`.

Show the table to the user before any test runs. They can add or
trim categories. Wait for "go".

### Example categories the strategist might produce for an ai-translate plugin

| Category | Rationale | Scenarios |
|---|---|---|
| Schema drift | Source content changes shape between publishes; target locale rows freeze on old shape | reorder fields, delete array rows, change JSON top-level keys, embed new block types |
| Async queue restart | Pending translations live in process memory; restart drops them | kill dev mid-translation, deploy mid-translation, two translates back-to-back |
| LLM safety / output | Model refuses, echoes, hallucinates, or returns invalid select values | prompt injection, schema.org constants, color codes, very short strings, very long strings |
| Locale-specific drafts | Per-locale draft state diverges from published | manual DE draft + EN publish, restore old version |
| Concurrent writes | Two admins / tabs / API calls hit the same doc | two-tab publish, parallel translate requests, race against schedule cron |
| Access / cost | Who can spend LLM tokens; how does cost get bounded | non-admin translate, bulk threshold, per-user rate limit |

The strategist's categories should reflect the ACTUAL feature, not
this list. The point is the structure: domain-specific, with
explicit "what can break" rationales.

## Step 2 — Per-phase scenario expansion

For each phase:

1. **Pick scenarios for this phase.** Phase 1 starts with the
   strategist's initial scenarios. Phase N>1 pulls from the
   "fresh categories" produced by phase N-1's findings (see Step 4).
2. **Each scenario gets**:
   - ID (`S1`, `S2`, ... across the whole run, never reset).
   - Setup (state required).
   - Action (UI steps OR API call).
   - Expected (positive + negative signals: DOM, console, network).
   - Evidence path (`tests/manual/screenshots/edge-bash-<ts>/<id>.png`).
3. **Drive in-context** — same playbook as `/manual-test`.

## Step 3 — Append findings to the bug index

Open `docs/bugs/BugIndex-<YYYYMMDD>.md` (create if missing — see
template below). For each test that surfaces a bug:

```markdown
### BUG-<N> <severity-emoji> <one-line title>

- **Where**: <source files, line numbers if known>
- **Repro**: numbered steps that reproduce against the live dev env
- **Expected**: what the user / contract expects
- **Actual**: what actually happens (verbatim error, screenshot ref,
  network response excerpt)
- **Hypothesis**: 1-2 sentence root-cause guess
- **Source files most likely involved**: paths to the files a fix
  agent should open first
- **Suggested fix path**: 1-3 sentence sketch — what to change
- **Severity**: 🔴 release blocker / 🟡 medium / 📋 low or info
- **Status**: open / fixed / deferred / not-a-bug
```

Severity rubric:
- 🔴 silent data loss; security; broken core flow
- 🟡 wrong result with workaround; cost surprise; UX trap
- 📋 documentation; minor visual; not-a-bug

## Step 4 — Diminishing-returns check

At the end of each phase, ask:

1. **Did this phase find any bugs?**
2. **Can I name ≥3 fresh edge-case categories inspired by what we
   just learned?** (E.g. if Phase 1 surfaced a schema-drift bug,
   Phase 2 should add "deeply nested JSON", "version restore",
   "locale-specific drafts" — same root-cause family, expanded
   surface.)

| Phase result | Action |
|---|---|
| ≥1 bug found AND ≥3 fresh categories | Run another phase. Phase 0 strategist may be re-spawned with the latest findings to brainstorm fresh categories. |
| 0 bugs found AND ≥3 fresh categories | Run one more phase (covers the "we got lucky this round" case). Stop if next phase also finds 0 bugs. |
| Any bugs found AND <3 fresh categories | Stop. The remaining surface is implementation detail, not new bug-classes. |
| 0 bugs found AND <3 fresh categories | Stop. Bug discovery rate is zero. |
| Phase count == 10 | Stop regardless. Flag the feature as unstable to the user. |

Print the phase summary:

```
Phase <N> done
Scenarios: <count>
Bugs found: <count> (cumulative <count>)
Fresh categories generated: <list of names>
Next: <continue | stop>
```

## Step 5 — Hand-off

When the loop terminates:

1. **Finalize the bug index**:
   - Add a "Final Bug Summary for Fix Planning" section with severity-
     ranked tables.
   - Identify root-cause families (e.g. BUG-10/22/24 all schema-drift)
     so the fix agent can collapse them into one investigation.
   - List source files most likely involved across all bugs — the fix
     phase reads these first.

2. **Print a summary table** to the user:

   ```
   Edge bash results — <ts>

   Phases run: <N>
   Scenarios: <count>
   Bugs found: <total>
     🔴 <count> release blockers
     🟡 <count> medium
     📋 <count> low / info
   Convergence reason: <"no bugs in last phase" | "no fresh categories" | "phase budget hit">

   Bug index: docs/bugs/BugIndex-<YYYYMMDD>.md
   Evidence: tests/manual/screenshots/edge-bash-<ts>/
   ```

3. **Suggest next step** based on findings:
   - All 🔴 + most 🟡 → `/build "fix the bugs in <bug-index-path>"`.
     Build flow can read the bug index and produce a coordinated fix
     PR.
   - Few bugs, single root cause → `/bug-bash <bug-index-path>` for a
     tighter per-bug loop.
   - Many 🟡 with no 🔴 → ship as-is, file follow-up tickets.
   - Lots of 🔴 + design-shaped → `/build-arch` to redesign first.

Do NOT spawn the fix flow automatically. The user decides scope.

## Bug-index template (write at Phase 1, append per phase)

```markdown
# Bug Index — <feature> (<YYYY-MM-DD>)

Live list of bugs surfaced during the `/edge-bash` run. Updated per
phase. See "Final Bug Summary" at the bottom once the run completes.

**Severity scale:**
- 🔴 HIGH — silent data loss, security, broken core flow
- 🟡 MEDIUM — wrong result with workaround, cost surprise, UX trap
- 📋 LOW / INFO — documentation, minor visual, not-a-bug

---

## Phase 1 — <category 1, category 2, ...>

### BUG-1 🔴 <title>
- **Where**: ...
- **Repro**: ...
- **Expected / Actual**: ...
- **Hypothesis**: ...
- **Source files**: ...
- **Suggested fix path**: ...

### BUG-2 🟡 <title>
...

---

## Phase 2 — <fresh categories inspired by phase 1 findings>

### BUG-N ...

---

## Final Bug Summary for Fix Planning

(filled at termination)

### By severity

| Bug | Title | Severity | Status |
|---|---|---|---|
| 1 | ... | 🔴 | open |
| ... |

### Root-cause families

- **<Family name>** (BUG-X, Y, Z): one-sentence hypothesis. Likely
  one coordinated fix.

### Suggested fix order

1. Family A (4 bugs, 1 fix)
2. ...

### Source files most likely involved

- `path/to/file.ts` — BUG-X, Y
- ...
```

## Strategist agent — prompt template

Use this when spawning the `qa-strategist` agent at Step 1 or
between phases.

```
You are a senior QA strategist. The host wants a domain-specific
edge-case taxonomy for this feature.

Feature: <name + 1-2 sentence description>
Source files: <relevant paths>
Prior findings (if mid-run): <list of bugs found so far>

Produce 6-12 categories. Each:
- Domain-specific name (e.g. "schema drift", "async queue restart").
  NOT generic ("boundary inputs", "error handling").
- One-line rationale: what can break here.
- 3-5 concrete scenarios that probe it.

NO generic Tier A/B/C taxonomy. The categories should reflect this
feature's actual threat model.

Output format: markdown table { category | rationale | scenarios }.

If you're a re-spawn mid-run (prior findings present), focus on
fresh categories — same root-cause family as the findings, expanded
surface. Don't repeat earlier categories unless their surface is
clearly untapped.
```

## Edge cases

- **Strategist returns generic Tier A/B/C** → reject, re-prompt with
  the prior bug list as evidence of what domain-specific looks like.
- **Phase 1 finds zero bugs** → either the feature is solid or the
  strategist undershot. Spawn a paranoid second strategist with the
  prompt "be more adversarial — what would you exploit if you wanted
  this to break in prod?" If round 2 also returns zero, declare
  done.
- **Real LLM cost in the test path** → state the budget at Phase 0,
  pause for approval before any phase that would exceed it.
- **Bugs that block further testing** (login broken, dev server
  crashes) → halt the run, surface the blocker, do not silently
  retry.
- **Fix proposed mid-run** → defer to the end. Note in the bug
  index and move on. Mixing test-with-fix breaks the audit trail
  and biases the rest of the phases.

## Notes

- **Cost-aware mode**: if the feature pings paid APIs, set a per-
  phase cost cap at Phase 0 (e.g. "$5 max per phase"). Surface
  estimated cost before each phase via the strategist; pause for
  approval if over.
- **The bug index file is the artifact.** Even if the user wants
  to discuss findings interactively, the markdown file is what
  survives. Write to it incrementally per phase — don't batch.
- **Stop sooner, not later.** A phase with low yield is permission
  to terminate. The skill's value is the structure + escalation
  path, not running 100 scenarios for completeness theater.
