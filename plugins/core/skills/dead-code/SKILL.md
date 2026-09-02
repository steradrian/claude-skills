---
name: dead-code
description: Run knip to find and safely remove dead code, unused exports, and unused dependencies
allowed-tools: Read, Edit, Glob, Grep, Bash
---

# Dead Code Cleanup

Activates when the user says "clean up dead code", "find unused code", or "run knip".

## Workflow

### Step 1 — Run knip

```bash
yarn knip 2>&1
```

If `knip` is not configured, check `package.json` for the script name (may be `dead-code`, `unused`, etc.). If no dead code tool exists, inform the user and suggest adding knip.

### Step 2 — Categorize findings

Group knip output into:

1. **Unused dependencies** — packages in `package.json` that are never imported
2. **Unused devDependencies** — dev packages never referenced in scripts, configs, or tests
3. **Unused exports** — named exports that are never imported anywhere
4. **Unused files** — files with no importers
5. **Unused types** — type exports never referenced

### Step 3 — Verify before removing

For each finding, verify it's truly unused:

- **Dependencies**: grep for the package name in all files (including configs, scripts, and dynamic imports). Some packages are used via CLI scripts, PostCSS plugins, Tailwind plugins, or Biome/ESLint plugins — these won't show as JS imports.
- **Exports**: grep for the export name. Check if it's re-exported through barrel files or used in test files.
- **Files**: check if the file is referenced in configs (`next.config.ts`, `tsconfig.json` paths, route configs).
- **Types**: check if the type is used in `.d.ts` files or in generic constraints.

Mark each finding as:
- **SAFE** — confirmed unused, safe to remove
- **SKIP** — used indirectly (config, CLI, plugin), leave it
- **VERIFY** — unclear, ask the user

### Step 4 — Present findings

Show a summary table:

```
## Dead Code Report

### Safe to remove
| Category | Item | Last imported |
|----------|------|---------------|
| dependency | lodash | never |
| export | formatLegacy | src/utils/format.ts |
| file | src/components/OldBanner.tsx | no importers |

### Skipped (used indirectly)
| Item | Reason |
|------|--------|
| autoprefixer | PostCSS plugin in postcss.config.js |

### Needs verification
| Item | Why |
|------|-----|
| src/utils/helpers.ts:generateId | Only used in test files |
```

### Step 4b — Check for orphaned @types/* packages

After identifying dependencies to remove, scan devDependencies for any `@types/*` package whose corresponding runtime package is being removed or is already absent from dependencies. These are easy to miss because knip may not flag them.

```bash
# For each @types/<pkg> in devDependencies, check if <pkg> exists in dependencies
# If not, it's orphaned and should be added to the SAFE removal list
```

### Step 5 — Apply removals

Only after user approval:
- Remove unused dependencies: `yarn remove <package>`
- Remove orphaned `@types/*` packages alongside their runtime counterparts
- Remove unused exports: delete the export statement (keep the function if used internally)
- Remove unused files: delete the file
- Run `npx tsc --noEmit` after removals to verify nothing broke
- Run `npx vitest run` to confirm tests still pass

### Constraints

- Never remove a dependency without verifying it's not used in configs
- Never remove a file without checking dynamic imports (`import()`)
- Never remove exports from `index.ts` barrel files without checking all consumers
- Always run typecheck + tests after removals
- Present findings before acting — never auto-delete
