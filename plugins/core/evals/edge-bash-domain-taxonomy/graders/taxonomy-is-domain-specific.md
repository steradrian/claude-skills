---
type: llm
focus: last_message
weight: 3
---

Judge the edge-case taxonomy. This is the failure mode the skill exists to prevent,
so grade it strictly.

FAIL immediately if the taxonomy is generic. A category is generic when it would
read identically for a payments form, a video player, or a spreadsheet importer.
Any of these, used as a category name, is an automatic FAIL:

- "Tier A / Tier B / Tier C", "P0 / P1 / P2", "Critical / Major / Minor" used as
  the categories themselves rather than as severities inside them
- "Boundary inputs", "boundary values", "edge cases"
- "Happy path", "golden path", "smoke tests"
- "Error handling", "validation", "negative testing", "input sanitisation"
- "Performance", "security", "accessibility" with no feature-specific framing
- "Concurrency" on its own, with no named contended resource

PASS only if all of the following hold:

1. There are between 6 and 12 categories.
2. Each category names a mechanism that can break in *this* feature — the supplier
   menu import. Categories of the right shape look like: supplier column drift
   between two uploads of the same feed, XLSX type coercion turning SKUs into
   numbers, currency rounding and RON/EUR conversion drift, availability windows
   crossing a DST boundary in the venue timezone, locale rows written for ro but
   missing for hu, upsert collisions when two supplier SKUs normalise to one,
   reindex enqueued before the write transaction commits, an operator editing an
   item mid-import, worker restart losing an in-flight batch.
3. Each category carries a one-line rationale saying what breaks there.
4. Each category carries concrete scenarios (roughly 3-5), written as things a
   tester would actually do to this pipeline, with specific data — not restatements
   of the category.

Also FAIL if the response claims any scenario was executed, driven, or screenshotted:
this run has no browser and no running app.
