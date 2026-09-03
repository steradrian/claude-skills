---
type: regex
target: last_message
pattern: '(missing|dropped|absent|omitted|forgotten|no|un-?)\s*await|await[^.\n]{0,60}(missing|dropped|omitted|removed)|not\s+awaited|fire-and-forget'
flags: 'i'
match: contains
weight: 2
---

The report identifies the defect as an unawaited promise. Any of the natural
phrasings count ("missing await", "await was dropped", "not awaited",
"fire-and-forget"), but a report that mentions `updateBalance` only in passing —
say, as a style note — will not match.
