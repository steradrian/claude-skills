---
name: panel-review
description: Adversarial pre-PR review — a panel of specialist agents run in parallel over the current diff with no dedup and no skepticism filter, so every finding reaches the human to triage.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash, Agent, AskUserQuestion
---

# Panel Review

The `/core:review` skill filters aggressively (two-gate, skepticism pass,
deduplication, architectural-coherence merge). Great when you want
high-precision blocking findings before merge.

This skill is the opposite. It runs a **panel of specialists**
in parallel — security, performance, accessibility, types, data
flow, blast radius, root cause, adversarial — with NO
deduplication or filtering between them. Every plausible finding
surfaces. The human triages.

Use when you want maximum recall on a high-stakes change. Skip for
trivial diffs (use `/core:review` or just spot-check).

## When to use

- High-stakes PR you want to stress-test from many angles
- Refactor touching shared utilities, type contracts, or migration paths
- Plugin / library code that other parts of the codebase depend on
- After a "vibe-coded" feature where you want a panel to challenge assumptions
- Before merging anything customer-facing under time pressure

## When NOT to use

- Trivial diffs (<100 LOC). Use `/core:review`.
- Pure documentation / typo / dependency-bump PRs.
- When you only want one angle (a11y / security / perf). Invoke the specific auditor directly.

## Strict invariants

1. **No filtering between agents.** Each agent's full report passes through to the moderator. The moderator only DEDUPES (same file:line by multiple agents) and sorts — it does not discard.
2. **Diff-scoped reads only.** No agent reads the full codebase. Every agent receives the shared bundle the orchestrator built and grep-traces from there.
3. **Token-cost discipline.** All six levers below are non-optional. Bypassing any of them is how this skill becomes a budget hole.
4. **Human triages, not the panel.** Severity comes from the agents; the decision to fix / defer / ship comes from the user.

## The panel

All agents are plugin agents, invoked as `core:<name>`; their definitions live at `${CLAUDE_PLUGIN_ROOT}/agents/<name>.md`.

| Agent | Role on the panel | Gating |
|---|---|---|
| `core:security-auditor` | auth, injection, secrets, server boundary | always |
| `core:pr-reviewer` | general correctness plus the adversarial "what would break this" pass | always |
| `core:fix-reviewer` | root-cause vs symptom: does the change fix the cause or paper over it | always |
| `core:blast-radius-reviewer` | cross-file tracing, callers, schema drift | always |
| `core:perf-reviewer` | rendering, bundle, waterfalls | `.tsx`/`.jsx`/`.css` |
| `core:accessibility-auditor` | WCAG checklist | `.tsx`/`.jsx`/`.css` |
| `core:design-token-auditor` | token usage, arbitrary values | `.tsx`/`.jsx`/`.css` |
| `core:dependency-auditor` | new or changed deps | `package.json` deps changed |
| `core:i18n-auditor` | hardcoded strings, locale files | locale files / new strings |
| `core:seo-auditor` | meta, structured data, sitemap, robots | `<meta>` / structured data / sitemap / `robots.txt` |
| `core:bug-investigator` | escalation only (Step 5) | on request |

## Token-cost levers (all six are mandatory)

### Lever 1 — Diff-scoped reads
Each agent receives only:
- The diff (`git diff $MERGE_BASE...HEAD`)
- Full content of changed files
- Full content of the top 5-10 callers of any changed export (orchestrator pre-grep)
- Project CLAUDE.md (root + any subdirectory of changed files)
- Commit messages (`git log $MERGE_BASE...HEAD --oneline`)

NO `find /` calls. NO repo-wide reads. Agents grep within the bundle.

### Lever 2 — Shared prompt-cached bundle
The orchestrator builds the bundle ONCE and writes it as a single text block. Every agent invocation prepends the same bundle, so the prompt cache hits across all parallel calls. Cache TTL: 1h. This is the single biggest cost saver (~9-10× reduction vs naive).

To make caching work:
- Bundle content goes at the START of each agent's prompt (verbatim, same bytes)
- Agent-specific instructions come AFTER the bundle
- Don't dynamic-inject branch names or timestamps inside the cached prefix

### Lever 3 — No model escalation
Each agent's model is set in its own definition file. Do not pass a `model` override to any panel agent, and never escalate the whole panel to the largest available model. That is the #1 way to burn money.

### Lever 4 — Specialist gating
Skip agents whose domain isn't in the diff. Decision table from changed-file patterns:

| Pattern in diff | Run these agents |
|---|---|
| any `.ts`/`.tsx`/`.js` | security-auditor, pr-reviewer, fix-reviewer, blast-radius-reviewer |
| `.tsx`/`.jsx`/`.css` | + accessibility-auditor, design-token-auditor, perf-reviewer |
| new `package.json` deps | + dependency-auditor |
| locale files / new strings | + i18n-auditor |
| `<meta>` / structured data / sitemap / `robots.txt` | + seo-auditor |
| migration / schema files | + blast-radius-reviewer gets a special "schema-drift" prompt |
| Server Components / Server Actions | + security-auditor gets "server-boundary" prompt |

Always run: security-auditor, pr-reviewer, fix-reviewer, blast-radius-reviewer. Everything else is gated.

### Lever 5 — Diff-size threshold
- Diff < 100 LOC → recommend `/core:review` instead, panel is overkill
- 100-500 LOC → full panel
- 500-2000 LOC → full panel, but increase per-agent finding cap to 10
- > 2000 LOC → split by domain (e.g. UI files panel + backend files panel), warn user about cost

### Lever 6 — Output budget per agent
Each agent is instructed to cap output at:
- 5-7 findings (10 for large diffs)
- ~300 tokens per finding (concrete, no essays)
- A "no concerns" section listing what was checked and cleared

## Required prerequisites

```bash
# Specialist agents installed (invoked as core:<name>)
for a in security-auditor pr-reviewer fix-reviewer blast-radius-reviewer \
         perf-reviewer accessibility-auditor design-token-auditor \
         dependency-auditor i18n-auditor seo-auditor bug-investigator; do
  test -f "${CLAUDE_PLUGIN_ROOT}/agents/$a.md" && echo "$a: OK" || echo "$a: MISSING"
done

# Clean git state
git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null || echo "no upstream"
```

If any agent is missing, fall back to whatever's present and tell the user which is absent.

## Step 0 — Frame the panel

Echo to the user:

```
Panel review plan
=================
Diff:          <branch> → <base>  (<N> files, +<add> -<rem> LOC)
Total agents:  <count>             (gated by file types)

Active panel:
  - core:security-auditor        always
  - core:pr-reviewer             always
  - core:fix-reviewer            always
  - core:blast-radius-reviewer   always
  - <gated agents>               based on file types

Skipped (no relevant files):
  - <agent>: <reason>

Estimated cost: $<x.xx>  (cached-bundle math: see Lever 2)
Diff size: <threshold tier>
```

If diff < 100 LOC, suggest `/core:review` and ask whether to proceed anyway.

Wait for "go" or ack.

## Step 1 — Build the shared bundle

Construct ONE bundle, used by every agent:

1. `BUNDLE_HEADER` — branch, base, commit list (`git log --oneline`), file stat (`git diff --stat`)
2. `DIFF` — full `git diff $MERGE_BASE...HEAD`
3. `CHANGED_FILES` — full content of every file in the diff
4. `CALLERS` — for every exported symbol changed/added/removed in the diff, grep up to 5 caller files and include their full content
5. `PROJECT_RULES` — root CLAUDE.md + any subdirectory CLAUDE.md relevant to changed paths

Write this bundle as a single text variable in your prompt. Same bytes across all agents (cache stability).

## Step 2 — Dispatch agents in parallel

In ONE message, spawn all gated agents with `Agent` tool calls. Each call:
- `subagent_type`: the specific agent with the plugin prefix (e.g. `core:security-auditor`)
- `description`: `"Panel: <agent name>"`
- no `model` override (Lever 3)
- `run_in_background`: `true`
- `prompt`: BUNDLE + agent-specific framing (see per-agent prompt templates below). Each brief is self-contained: the agent sees nothing from this conversation except what is in the prompt.

DO NOT poll. The system notifies when each finishes. Continue with other prep while waiting.

### Per-agent prompt template

```
<BUNDLE goes here verbatim — same bytes across all agents>

---

You are <agent role>. Your job here is <agent-specific scope>.

Reference the BUNDLE above. Do NOT read files outside the BUNDLE.
Output up to <N> findings using the format your agent definition specifies.

Constraints:
- Diff-scoped only. No repo-wide reads.
- Specific file:line per finding.
- No filtering for plausibility — surface every concrete concern.
- Output budget: ~300 tokens per finding, ~<N> findings max.
```

Agent-specific framing for the two merged roles:
- `core:pr-reviewer`: "Run your normal review, then a second adversarial pass: assume the change is wrong and try to construct the input, timing or state that breaks it."
- `core:fix-reviewer`: "Treat the diff as a fix under review: for each behavioral change, state the root cause it addresses and whether the change fixes that cause or only the symptom."

## Step 3 — Aggregate (don't filter)

When all agents have completed:

1. Concatenate every agent's report verbatim under its own H2 heading.
2. Build a deduplication index: map of `<file>:<line>` → list of agents that flagged it. Merge duplicates into one finding with all the agents' framings listed.
3. **Do NOT discard** any finding. Reorder by severity (🔴 first), then by file path.
4. Compute the total finding count per severity.

## Step 4 — Present to user

Single markdown report:

```
# Panel review: <branch> → <base>

## Tally
- 🔴 <N>  critical / blocking
- 🟡 <N>  warning / should-fix
- 🔵 <N>  info / nice-to-have
- 🟢 <N>  no-concern listings (combined from agents)

## By agent
- core:security-auditor: <count> findings → see §Security
- core:pr-reviewer: <count> findings → see §General + adversarial
- core:fix-reviewer: <count> findings → see §Root cause
- core:blast-radius-reviewer: <count> findings → see §Blast radius
- <other gated agents>: ...

## All findings (deduped by file:line)

### 🔴 1. src/api/x.ts:42 — <one-line summary>
Flagged by: core:security-auditor, core:pr-reviewer
<security framing>
<adversarial framing>
Suggested fix: <if any agent proposed one>

### 🔴 2. src/lib/y.ts:18 — ...
...

## Per-agent full reports

### §Security (core:security-auditor)
<verbatim>

### §General + adversarial (core:pr-reviewer)
<verbatim>

### §Root cause (core:fix-reviewer)
<verbatim>

### §Blast radius (core:blast-radius-reviewer)
<verbatim>
```

## Step 5 — Triage gate

Ask the user via `AskUserQuestion`:

```
Triage:
  FIX-RED-NOW       — invoke /core:fix-after-review on 🔴 only
  FIX-ALL-NOW       — 🔴 + 🟡
  ESCALATE-RED      — spawn core:bug-investigator per 🔴 to trace deeper
  DEFER-TO-PR       — open PR with this report as a checklist; address in PR comments
  DISMISS           — read it, take notes, no action
```

- ESCALATE-RED dispatches `core:bug-investigator` as a follow-up agent per 🔴 finding with the bundle + specific finding context. Use sparingly (each invocation is another bundle pass — but cached, so cheap).

## Step 6 — Hand-off

End with:

```
Panel review complete.

Saved report: docs/panel-reviews/PanelReview-<ts>-<branch>.md

Next steps:
  - <based on triage choice>
  - commit when ready (the user decides what and when)
```

Save the full report to `docs/panel-reviews/PanelReview-<ts>-<branch>.md` (create dir if needed) so future runs / PRs can reference it.

## Edge cases

- **One panel agent fails** → continue, note "agent X failed: <error>" in the output. Don't halt the panel.
- **Bundle exceeds context window** (very large diff) → split into UI-files panel + backend-files panel, two separate runs.
- **No findings at all** → "Panel found nothing across <N> agents. This is rare; verify the diff actually changed runtime behavior."
- **User wants to re-run after fixing 🔴** → invoke `/core:panel-review` again; the new diff scopes naturally.
- **Cost concern mid-run** → if estimated cost exceeds $5, ask the user to confirm before dispatching the panel.

## Why this exists

`/core:review` produces high-precision findings via a two-gate filter and inter-batch dedup with skepticism. That's exactly right for "ship-or-block" PR gating.

`/core:panel-review` is the opposite — high recall, every concrete concern visible, human filters. That's what bugbot-style review buys you. Use both: `/core:panel-review` first (find everything), then `/core:review` (verify-and-block before merge). The two are complementary, not redundant.
