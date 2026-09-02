# Steps 9–12 — Tests, Linter, Database, Configuration

## Step 9 — Tests (changed test files + missing coverage)

**Coverage:** Is there test coverage for changed logic? New behavior with no test is a flag. Do existing tests still cover changed code paths? Edge cases tested: empty input, null, error path, zero, boundary values?

**Test hygiene:**
- **Mock cleanup**: `vi.stubGlobal()` without `vi.unstubAllGlobals()` in `afterEach` — leaked globals contaminate other tests
- **Spy restoration**: `vi.spyOn()`/`vi.fn()` not cleared — use `vi.restoreAllMocks()` in `afterEach` or `restoreMocks: true` in config
- **Timer cleanup**: `vi.useFakeTimers()` without `vi.useRealTimers()` in `afterEach`
- **Shared mutable state**: mutable variable shared across `it()` blocks without `beforeEach` reset
- **Async assertions**: `expect()` inside `.then()`/callbacks without `await` — test passes even if assertion never runs

## Step 10 — Linter

Run the project's linter on changed files only:

1. Detect package manager from lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb`/`bun.lock` → bun, `package-lock.json` → npm); `<pm>` below is the detected one
2. Read `package.json` scripts to find lint command
3. Detect linter: `biome.json`/`biome.jsonc` → Biome; `.eslintrc*`/`eslint.config.*` → ESLint; both → run both
4. Run on changed files only:
   ```bash
   <pm> exec biome check --no-errors-on-unmatched <changed files>
   <pm> exec eslint <changed files>
   ```
5. Report results. Clean exit → `✅ No issues`

## Step 11 — Database & ORM (only if diff touches DB layer)

Only run if diff touches Prisma/Drizzle schemas, query files, repositories, or Server Actions hitting the DB.

**Query safety:**
- **N+1 queries**: DB query inside a loop — batch with `findMany` + `IN` or nested `include`
- **Unbounded queries**: `findMany()`/`SELECT *` without `take`/`limit` — every list query needs a page size cap
- **Missing `select`**: Prisma `findMany` without `select` fetches all columns including sensitive fields
- **Missing index**: new `where`/`orderBy` on unindexed columns
- **`findFirst` without `orderBy`**: non-unique field → non-deterministic result

**Transaction safety:**
- Multi-step mutations without `prisma.$transaction()` — partial failure leaves inconsistent data
- Slow operations (external API, file I/O) inside transaction holding locks — move I/O outside
- Manual `BEGIN`/`COMMIT` without `ROLLBACK` on error path

**Schema changes:**
- **Destructive migration**: column dropped/renamed, or non-null added without default — locks table on large datasets. Use nullable → backfill → NOT NULL.
- Missing migration file for schema change; Postgres `ALTER TYPE` for enums is non-transactional

## Step 12 — Environment variables & configuration

Run when diff touches `package.json`, `next.config.ts`, `tsconfig.json`, `middleware.ts`, `.env*`, or CI/CD configs.

**Environment variables:**
- **Unvalidated `process.env`**: bare access without startup validation (`@t3-oss/env-nextjs`, Zod) — missing vars produce silent `undefined` at runtime
- **Secret in `NEXT_PUBLIC_`**: API keys, DB URLs, internal tokens — inlined into client bundle
- **Non-public env var used in client code**: `process.env.API_KEY` (no `NEXT_PUBLIC_` prefix) in a Client Component or code imported by one — `undefined` at runtime, no build error. **Detection:** any `process.env.X` where `X` doesn't start with `NEXT_PUBLIC_` used in files with `'use client'` or imported by client components. **Fix:** Add `NEXT_PUBLIC_` prefix if safe to expose, or move to Server Component/API route.
- Missing `.env.example` entry for new `process.env.MY_VAR`; `process.env` in component body causes SSR/client mismatch
- **Multi-instance assumptions**: code assumes single server instance (in-memory cache, file locks, module-level state) but runs in multi-pod/serverless. **Detection:** module-level `Map`/`Set`/`WeakMap` used as cache without external backing (Redis); `fs.writeFile` for shared state; global counters/rate limiters. Works locally, breaks in production with multiple pods.

**`next.config.ts`:**
- Security headers weakened (CSP, X-Frame-Options, etc.) — flag any removal
- `ignoreBuildErrors: true`/`ignoreDuringBuilds: true` — must not reach main
- `images.remotePatterns` with `hostname: '*'` — proxies arbitrary external images
- New `experimental` flags without justification comment

**`tsconfig.json`:**
- `strict: false` or partial disable (`strictNullChecks`, `strictFunctionTypes` off) — type safety regression
- `paths` alias without `next.config.ts` counterpart — fails at runtime

**Dependencies (`package.json`):**
- New production dep: check maintenance, downloads, CVEs. Flag >2yr stale or <100 weekly downloads.
- Dev dependency in `dependencies`; duplicate functionality already in dep tree
- Hard-pinned versions without comment; floating range on historically-breaking packages
- Lockfile not updated after `package.json` change
