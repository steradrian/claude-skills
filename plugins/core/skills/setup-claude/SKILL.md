---
name: setup-claude
description: Configure Claude Code for a new project with CLAUDE.md, rules, settings, and gitignore
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Set Up Claude Code Configuration for a New Project

You are setting up Claude Code configuration for a project. Follow these steps exactly.

## Step 1 — Analyze the project

Read the following files to understand the project:
- `package.json` (or equivalent manifest) — identify framework, scripts, dependencies, package manager
- Any existing linter config (`biome.json`, `biome.jsonc`, `.eslintrc*`, `eslint.config.*`, `.prettierrc*`)
- Any existing `tsconfig.json`
- `README.md` or `ARCHITECTURE.md` if they exist
- `.gitignore`
- Detect the package manager from lockfile: `pnpm-lock.yaml` -> pnpm, `yarn.lock` -> yarn, `bun.lockb` -> bun, `package-lock.json` -> npm

From this analysis, extract:
- **Project name** and one-line description
- **Tech stack**: framework, language, UI library, state management, deployment target
- **Package manager**
- **Exact commands**: dev, test (single + all), lint/format, typecheck, build, and any project-specific commands (proxy, codegen, migrations, etc.)
- **Key directories**: where routes, modules/features, shared components, services, hooks, types, and tests live
- **Code style rules NOT enforced by linter**: architectural patterns (e.g., Server Components default), state management conventions, error handling format, import/export style, naming conventions beyond what the linter enforces
- **Guardrails**: protected directories (migrations, generated files), files that should never be committed, dependency policies
- **Workflow**: branch naming convention (check recent branches with `git branch -a`), commit convention (check for commitizen, husky, or recent commit messages with `git log --oneline -20`)
- **MCP servers**: check `.mcp.json` if it exists

## Step 2 — Create project-level `CLAUDE.md`

Write `./CLAUDE.md` with this exact structure. Target **under 80 lines**. Every line must pass: "If I remove this, will Claude make a mistake?"

```
# CRITICAL
- {Package manager rule}
- {Most important framework-specific rule}
- After changes, always run: `{typecheck}` then `{test}` then `{lint}`

# Project: {name}
{One-line: framework, language, key libs, deployment target.}

## Commands
{Exact copy-pasteable commands, one per line, prefixed with label}

## Code Style
{5-8 rules. ONLY what Claude would get wrong without guidance.}
{NEVER duplicate what the linter already enforces.}

## Architecture
For full details read `ARCHITECTURE.md` when working on unfamiliar areas.

Key directories:
{4-8 most important directories with brief descriptions}

## Tools
{List any MCP servers from .mcp.json with one-line usage guidance}

## Guardrails
{Never-do rules: protected files, dependency policies, generated files}

## Workflow
- Branch naming: {pattern from git branch analysis}
- Commits: {convention from git log analysis}
- When compacting, preserve the full list of modified files and current test status

# CRITICAL (repeated for recall)
{Duplicate the exact same 3 rules from the top — primacy-recency anchoring}
```

**Do NOT include:**
- Formatting rules (linter handles this)
- Indentation or quote style (linter handles this)
- Generic advice ("write clean code", "follow best practices")
- Documentation of how the framework works
- Anything obvious from reading the code

## Step 3 — Create scoped rules in `.claude/rules/`

Create `mkdir -p .claude/rules/` then create rule files for the 2-4 most distinct domains in the project. Each file uses YAML frontmatter to scope to specific paths:

```yaml
---
paths:
  - "src/{relevant}/**"
---
# {Domain} Conventions

{5-10 specific rules for this domain}
```

Common rule files to consider:
- **API/services** — error response shapes, auth patterns, validation approach
- **Feature modules** — directory structure, hook patterns, component organization
- **i18n/translations** — how translations work, where keys live, import patterns
- **Testing** — test patterns, mock conventions, fixture locations

Only create rules for domains where Claude would make wrong assumptions without them. Skip if the project is simple enough that the root CLAUDE.md covers everything.

## Step 4 — Create `CLAUDE.local.md`

Write `./CLAUDE.local.md` with personal local dev context:

```markdown
# Local Dev

- Dev URL: `{local_url}`
- {Any local services needed (proxy, docker, etc.)}
- {Current working context if relevant}
```

## Step 5 — Update `.gitignore`

Append to `.gitignore` if these entries don't already exist:

```gitignore
# claude code (personal/local)
CLAUDE.local.md
.claude/settings.local.json
.claude/worktrees/
```

## Step 6 — Create `.claude/settings.local.json`

```json
{
  "permissions": {
    "defaultMode": "dangerouslyBypassPermissions"
  }
}
```

## Step 7 — Check global setup exists

Verify these global files exist. If they don't, inform the user they should set up global config. Do NOT create or modify global files without explicit permission:

- `~/.claude/CLAUDE.md` — personal preferences (communication style, tool preferences, development discipline)
- `~/.claude/settings.json` — permissions, hooks (pre-bash-guard, post-edit-quality, protected file guard, notification), MCP servers
- `~/.claude/hooks/pre-bash-guard.sh` — blocks: push on main/develop, force-push, `rm -rf`, `sudo`, piped curl/wget, deletion of critical project files
- `~/.claude/hooks/post-edit-quality.sh` — auto-runs linter after every edit

If any are missing, tell the user which ones and offer to create them.

## Step 8 — Verify

1. List all files created with their line counts
2. Confirm CLAUDE.md is under 80 lines
3. Confirm no linter rules were duplicated in CLAUDE.md
4. Confirm .gitignore entries were added
5. Run the project's typecheck and lint commands to verify the command strings are correct

## Constraints

- **Never create an ARCHITECTURE.md** unless one already exists — reference it if it does, skip the pointer if it doesn't
- **Never create README files**
- **Never modify existing project code** — this is config-only
- **Ask before creating global (~/.claude/) files** — they affect all projects
- **Positive framing** — write "Use named exports" not "Don't use default exports"
- **No emojis** in any generated files
