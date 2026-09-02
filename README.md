# claude-skills

Claude Code plugin marketplace. `core` holds the portable engineering tooling that every project and every config dir consumes; `website-audit` is the standalone audit suite. Committed here so local sessions and cloud sessions load the same commit.

## Install locally

```bash
claude plugin marketplace add steradrian/claude-skills
claude plugin install core@adrian
claude plugin install website-audit@adrian   # optional
```

Everything is namespaced: `/core:build`, `/core:review`, `/core:edge-bash`; agents show as `core:pr-reviewer`. The audit suite is `/website-audit:audit-deep` and `/website-audit:audit-scan`.

## What `core` ships

- Skills: `build` (`--arch`, `--max`, `--finish`, `--pr`, `--changelog`), `review`, `panel-review`, `edge-bash`, `bug-bash`, `manual-test` (`--matrix`), `repro-bug`, `explore`, `fix-after-review`, `fix-pr-thread`, `resolve-pr-comments`, `create-ticket`, `create-pr`, `write-changelog`, `test-writer`, `debug-investigate`, `architect`, `api-contract`, `dead-code`, `lighthouse-audit(-light)`, `spec-from-prototype`, `design-to-code`, `setup-claude`, plus pattern references (Next.js App Router, TanStack Query, RHF + Zod, Tailwind, composition, error boundaries, Framer Motion, React best practices, web design).
- Agents: reviewers (`pr-reviewer`, `fix-reviewer`, `blast-radius-reviewer`, `perf-reviewer`, `security-auditor`, `accessibility-auditor`, `dependency-auditor`, `design-token-auditor`, `i18n-auditor`, `seo-auditor`), decision-makers (`product-manager`, `ui-designer`, `ux-designer`, `api-designer`, `refactor-planner`, `bug-investigator`), critics, writers (`test-writer`, `e2e-writer`, `typescript-fixer`, `api-hook-generator`, `zod-schema-generator`, `ui-component-builder`, `motion-designer`, `copywriter`, `documentation-writer`, `ticket-writer`, `pr-writer`, `changelog-writer`, `bug-bash-reporter`).
- Hooks (stdin JSON contract): `no-push-to-main` (blocks pushes to main/master), `bash-safety` (destructive commands become a permission prompt), `ts-check` and `test-on-edit` (background after TypeScript edits, wake Claude only on failure), `session-start` (repo state + today's log), `session-end` (log), `notify-stop` (macOS notification).
- References: `references/browser-playbook.md`, `references/design-rules.md`.

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
