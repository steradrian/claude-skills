---
type: regex
target: last_message
pattern: '^[\s>*\-|#]*(\*\*)?Tier\s*[ABC]\b'
flags: 'im'
match: not_contains
---

No category is presented as "Tier A / Tier B / Tier C". Matched only at the start
of a line (heading, list item, or table cell) so that prose explaining *why* the
taxonomy is not a tier matrix does not trip the grader.
