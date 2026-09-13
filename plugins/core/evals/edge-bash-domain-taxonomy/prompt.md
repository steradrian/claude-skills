---
name: edge-bash-domain-taxonomy
description: core:edge-bash must derive a threat-model taxonomy for the feature, not a generic tier matrix.
tags: [edge-bash, qa, taxonomy]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Write, Glob, Grep, Bash, Skill, Agent, TodoWrite]
expected_outcome: >
  A QA strategist subagent is spawned and returns 6-12 categories named after this
  feature's actual failure modes (supplier column drift, currency rounding, availability
  windows across DST, partial reindex, concurrent re-imports), each with concrete
  scenarios. No Tier A/B/C, no "boundary inputs", no "happy path".
---

/core:edge-bash the supplier menu import pipeline described below.

An operator uploads a supplier CSV or XLSX. A background worker parses it, maps supplier columns onto our menu schema, writes menu items in the venue's locales (ro/en/hu), stores prices per currency (RON/EUR), attaches per-item availability windows in the venue's local timezone, and finally enqueues a search reindex job. Re-importing the same supplier file upserts by supplier SKU. Operators can edit items in the admin while an import is running.

There are no browser tools in this run and no app to drive. Produce and keep the strategist's taxonomy anyway, per the no-browser rule, and be explicit that no scenario was executed.
