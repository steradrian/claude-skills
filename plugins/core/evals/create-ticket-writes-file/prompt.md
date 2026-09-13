---
name: create-ticket-writes-file
description: core:create-ticket lands a real file at docs/tickets/Ticket-*.md rather than printing a ticket into the chat.
tags: [create-ticket, artifact]
runs: 3
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Write, Bash, Glob, Grep, Skill, Agent, TodoWrite]
expected_outcome: >
  A file matching docs/tickets/Ticket-*.md exists in the working directory when the
  run ends, and its path is printed in the closing message.
---

I've just added the formatted receipt amount to the deposit flow — the change is sitting uncommitted in the working tree. Write it up as an engineering ticket.

No network access; nothing is installed. Read the diff with git.
