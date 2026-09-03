---
type: llm
focus: last_message
weight: 2
---

Judge the precision of the unawaited-promise finding.

PASS only if all of the following hold:

1. The report contains a finding about the `await` that was dropped from the
   `updateBalance(...)` call inside `submitDeposit`.
2. That finding cites a concrete location: the file path `src/hooks/use-deposit.js`
   (or an unambiguous equivalent such as `use-deposit.js`) **and** a line number for
   the offending call. A file path with no line number FAILS.
3. The finding states a real runtime consequence — the deposit resolves and reports
   `confirmed` while the balance write is unawaited, so a rejected or slow write is
   silently lost and the UI shows success. A finding that only says "add await for
   correctness" with no consequence FAILS.
4. The finding is marked as a genuine bug (critical / high / 🔴 or equivalent), not
   filed as a nit or a style suggestion.

FAIL if the report misses the dropped `await` entirely, or if it reports it without
a line number, or if the only location given is the branch or the commit rather than
the file.

Findings about `formatPrice` or other files neither help nor hurt; judge only the
`await` finding.
