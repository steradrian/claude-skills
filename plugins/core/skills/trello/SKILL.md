---
name: trello
description: Read and tidy the project's Trello board — list cards, move them between lists, comment, archive. Use when asked about "the Trello board", "the cards", "clear the board", "move the card".
---

The board is reachable through one script; do not hand-write Trello API calls:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/pr-from-card/scripts/trello.sh <cmd>
```

Run it with no arguments to see the commands (`check`, `board`, `cards [list]`, `get`, `create`, `label`, `assign`, `checklist`, `tick`, `move`, `comment`, `attach`, `archive`). It needs `TRELLO_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD` in the environment; `check` tells you which are missing, and then the answer is that the board is not reachable from this session. When the request names another board by URL (`trello.com/b/<shortLink>/...`), prefix the call with `TRELLO_BOARD=<shortLink>`.

Rules:

- New cards get labels that exist on the board (`board` lists them): the area (`Front End`, `Backend`) plus the kind (`Bug`, `Feature`, `Enhancement`). Acceptance criteria go in as a checklist, not only as prose.
- "Clear" or "clean up" the board means **archive**, never delete; the script cannot delete. Default scope is the `Done` list. Archiving `Ready`, `In progress` or `In review` cards throws away work in flight, so do that only when the request names that list explicitly.
- Before archiving or moving more than one card, print the list you are about to act on (short link + name), then act. Never ask for confirmation; the printed list is the record.
- To turn a card into a PR, use `/core:pr-from-card <card url>`; this skill does not implement anything.
- Report with short links and names, one line per card touched.
