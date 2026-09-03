# Benchmark

Run `bench/run.sh` before and after every change. Green means no regression on
what is measurable today.

## Why this exists

The 2026-09 audit scored this marketplace "8/10" from five subagents told to
"rate out of 10, be strict". No rubric, no baseline, five different bars. It
was an impression that the files read well.

That impression missed the number that mattered. `claude plugin details`
reports the plugin adds **8,362 always-on tokens to every session** — the
descriptions of 36 skills and 32 agents, loaded whether or not any is used.
The same audit celebrated cutting CLAUDE.md from 11.6K to 2.2K tokens while
the plugin quietly put 8.4K back.

A number you do not measure is a number you regress.

## The rubric

| Dimension | Metric | Measured by | Status |
|---|---|---|---|
| Structural correctness | conformance checks passing | `bench/conformance.sh` | automated |
| Guard behaviour | hook cases passing | `bench/hooks.sh` | automated |
| Context cost | always-on tokens vs budget | `bench/budget.sh` | automated |
| Behavioural quality | eval cases scored with/without the plugin | `claude plugin eval` | **blocked: early access** |
| Real usage | which skills fire, how often, success rate | `/skill-doctor` or OTLP | **not wired up** |
| Capability coverage | stated gaps built | manual | see the gap list below |

The first three run in CI. The last three are the honest gap, and the reason
this setup is not finished.

## What each check catches

**conformance.sh** — the sweeps that were run by hand during the audit, so the
same class of defect cannot come back silently: frontmatter that drifts from
the directory name, `argument-hint` without `$ARGUMENTS` (and the reverse), a
`core:` reference to a component that was deleted, unprefixed slash
invocations, dangling `${CLAUDE_PLUGIN_ROOT}` paths, machine-specific or
employer-specific strings, read-only agents that only say so in their tool
list, hooks.json pointing at a missing script, and two components claiming the
same quoted trigger phrase. `claude plugin validate` catches none of these — it
checks manifest structure only.

**hooks.sh** — 36 push-guard cases and 23 bash-safety cases against real
temporary repos on `main` and on a feature branch. Every blocking case is a
regression test for a bypass that once worked. The guard exited 0 for every
input for an unknown length of time because it read `$CLAUDE_TOOL_INPUT`, which
the harness stopped setting; nothing noticed. This file is what would have
noticed.

**budget.sh** — reads the always-on cost from `claude plugin details` and
compares it to `bench/baseline.json`. Fails when the cost exceeds the budget or
grows more than 250 tokens since the baseline. Re-baseline deliberately with
`bench/budget.sh --update`, never as a reflex.

## Not measured yet

**Behavioural evals.** `claude plugin eval` runs graded cases against a plugin
with a no-plugin baseline arm, so it reports whether the plugin actually
improved the outcome rather than whether the prose reads well. Cases live in
`evals/<case>/prompt.md` plus `graders/*.md`, with graders of type `regex`,
`tool_used`, `tool_order`, `file_exists`, `llm` and `baseline`. It is in early
access and prints "currently in early access" for this account. Cases are
written and waiting under `evals/`; they run the day it is enabled.

**Real usage.** Two routes, neither wired up:

- `/skill-doctor` (early access) reports per-skill token cost, 7-day
  invocations and never-invoked warnings.
- OpenTelemetry is available now. `CLAUDE_CODE_ENABLE_TELEMETRY=1` with an OTLP
  endpoint emits `claude_code.cost.usage`, `claude_code.token.usage` and
  `claude_code.tool_result` carrying a `skill.name` attribute, so a local
  collector answers "which of these 36 skills has fired in the last month, and
  did it succeed". Until one of these runs, the honest answer to "is this skill
  worth its tokens" is that nobody knows.

## Capability gaps

Named in the audit, not built: `pr-from-card` (the Trello entry point that
motivated the whole migration), `upgrade-deps`, `ds-sync`, `a11y-audit`,
`i18n-audit`, `perf-budget`, `visual-regression`, and a `ds-drift-auditor`
agent to enforce the design-system rule that currently has no enforcer.
