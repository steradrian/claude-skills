---
name: audit-deep
description: Full multi-specialist website audit — English technical report + Romanian client report
argument-hint: <url> [vertical] [city]
---

Run a full audit of $ARGUMENTS using the website-audit skill in **deep mode**.

Run preflight. Scope — vertical, city, target queries, decline vs never-ranked, sells online.
Ask only what you cannot infer from the site.

Dispatch all nine specialists in two waves as the skill describes, passing Wave 1 findings paths
into every Wave 2 prompt. Synthesize, dedupe the known overlaps, then produce the full deliverable
set under the audit output root:

1. `audit-<brand>-en.md` — full English technical report
2. `raport-<brand>-ro.md` — friendly Romanian client report, no jargon, max 8 problems
3. `fix-list-<brand>.md`
4. `outreach-<brand>-ro.md`
5. `findings/` appendix

Finish by printing the output root path and a two-line summary of the bottom line.
