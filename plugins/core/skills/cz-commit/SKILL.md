---
name: cz-commit
description: Generate a Commitizen-format commit message from the staged changes and create the commit. Use when asked to "commit", "cz commit" or "write a commit message".
---

Generate a Commitizen-format commit message from your current context and create the commit.

## Step 1: Derive commit fields from context

Using what you already know about the changes made in this session:

- **type** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`
- **scope** — the affected module/component/page (kebab-case, omit if changes span too many areas)
- **subject** — imperative mood, lowercase, no period, ≤72 chars
- **body** — what changed and why; wrap at 72 chars; omit if subject is self-explanatory
- **breaking change** — add `BREAKING CHANGE: <description>` footer if any public API/contract changed
- **issue refs** — add `Closes #<n>` or `Refs #<n>` footer if a ticket number is known

Type guide:
- `feat`: new user-visible feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting, whitespace — no logic change
- `refactor`: code change that neither fixes a bug nor adds a feature
- `perf`: performance improvement
- `test`: adding or updating tests
- `build`: changes to build system, tooling, config, or external dependencies
- `ci`: CI/CD configuration
- `revert`: reverts a previous commit (subject: `revert: <original subject>`, body: `This reverts commit <hash>`)

## Step 2: Inspect staged changes

Run `git diff --cached --stat` to confirm exactly what is staged. Do not add or unstage anything — commit only what the user has already staged.

If nothing is staged, stop and tell the user: "Nothing staged. Stage your changes with `git add` first, then run /cz-commit."

## Step 3: Commit staged changes only

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

<footer>
EOF
)"
```

Run `git log --oneline -1` after to confirm. If a pre-commit hook rejects the commit, fix the reported issues and create a **new** commit — never `--amend`. Never run `git push`.
