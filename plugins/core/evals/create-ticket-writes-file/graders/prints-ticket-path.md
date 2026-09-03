---
type: regex
target: last_message
pattern: 'docs/tickets/Ticket-[^\s`)]+\.md'
match: contains
---

The closing message hands back the path, so the caller can open it without hunting.
