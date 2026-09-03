# Package manager rule

Shared by every skill in this plugin that runs a script or a binary. Skills
reference this file instead of restating the table.

## Detect from the lockfile

Look in the project root (or the worktree root, when a skill works inside one)
and take the **first** match:

| Lockfile | Package manager (`<pm>`) |
|---|---|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lockb` or `bun.lock` | `bun` |
| `package-lock.json` | `npm` |

If several lockfiles are present, prefer the one committed to git (`git ls-files`)
over an untracked leftover. If none is present and there is no `package.json`,
this is not a Node project — skip the Node checks rather than guessing.

## Use it

- Run a script: `<pm> run <script>`
- Run a binary from `node_modules`: `<pm> exec <bin>` (e.g. `<pm> exec tsc --noEmit`,
  `<pm> exec vitest run`)
- Install: `<pm> install`

Before running a script, confirm it exists in `package.json.scripts`; a script name
that is conventional in one project is absent in another.

**Never hardcode a package manager.** `pnpm`, `npm`, `yarn` and `bun` must not appear
as literal commands in skill output — resolve `<pm>` from the lockfile every time.
If a project's `CLAUDE.md` names specific commands, those win over the detected ones.
