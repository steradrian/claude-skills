# claude-skills

Claude Code plugin marketplace. One plugin, `core`, holding the portable engineering tooling that every project and every config dir consumes. Committed here so local sessions and cloud sessions load the same commit.

## Install locally

```bash
claude plugin marketplace add steradrian/claude-skills
claude plugin install core@adrian
```

Everything is namespaced: `/core:build`, `/core:code-review`, agents show as `core:pr-reviewer`.

## Enable in a repo (so cloud sessions get it)

Commit this to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "adrian": { "source": { "source": "github", "repo": "steradrian/claude-skills" } }
  },
  "enabledPlugins": { "core@adrian": true }
}
```

## Update

```bash
claude plugin marketplace update adrian
claude plugin update core@adrian
```

## Layout

```
.claude-plugin/marketplace.json
plugins/core/
  .claude-plugin/plugin.json
  skills/<name>/SKILL.md      slash commands and reference skills
  agents/<name>.md            specialist subagents
  hooks/hooks.json + *.sh     push guard, bash safety, post-edit checks, session log
```

Work-only tooling (Notion ticket flows, employer content) intentionally lives outside this repo.
