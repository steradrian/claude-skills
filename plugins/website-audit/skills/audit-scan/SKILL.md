---
name: audit-scan
description: Fast qualification scan of a prospect website (3 specialists)
argument-hint: <url> [vertical] [city]
---

Run a qualification scan of $ARGUMENTS using the website-audit skill in **scan mode**.

Run preflight first. Dispatch only `audit-technical-seo`, `audit-serp-analyst` and
`audit-compliance-ro` at surface depth — enough to answer whether this site is broken enough to be
worth a full audit.

Produce a one-page verdict in English:

- Overall score out of 10 with a one-line justification
- The three most exploitable findings, each verifiable by the owner in under a minute, each tagged
  measured or inferred
- A go / no-go recommendation on running the deep audit
- If go: the single finding to lead the Romanian outreach email with, and why

Do not produce the full deliverable set in scan mode.
