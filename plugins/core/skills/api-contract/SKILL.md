---
name: api-contract
description: Generate a complete typed API pipeline (types, client, hooks, schemas) for a described endpoint or feature. Use when asked for "api contract", "typed API pipeline" or to wire a new endpoint end to end.
argument-hint: <endpoint or feature description>
---

Generate a complete typed API pipeline for: $ARGUMENTS

## Phase 1: Read the Spec and Context

Find and read the API specification (OpenAPI file, GraphQL schema, or endpoint docs from $ARGUMENTS).

Also check:
- Existing similar API client patterns in this codebase (how are other endpoints structured?)
- How React Query hooks are currently organized and named
- Zod schemas that already exist for related types
- The base HTTP client or fetcher utility being used

Don't create new patterns if existing ones work. Match the codebase's conventions.

## Phase 2: Generate the Full Pipeline

Produce all of the following, in order:

### 1. TypeScript Types (`types.ts`)
- Request params/body type
- Successful response type
- Error response type (if the API returns structured errors)
- Derived utility types if useful (e.g., list item type extracted from list response)
- No `any`. Use `unknown` for genuinely dynamic fields, with a comment explaining why.

### 2. API Client Function (`api.ts`)
- Typed function wrapping the HTTP call
- Uses the project's existing fetcher/base client — don't introduce a new HTTP dependency
- Proper error typing: distinguish network errors from API errors
- No hardcoded base URLs or auth tokens — use existing config/env pattern

### 3. React Query Hook (`use[Resource].ts`)
- Cache key as a typed constant or factory function (stable, namespaced, invalidation-friendly)
- `staleTime` appropriate to the data's volatility (documents > user data > prices)
- Error and loading states explicitly typed in the return
- Optimistic update pattern for mutations where applicable
- `select` option if the component needs a transformed shape

### 4. Zod Schema (`schema.ts`)
- Runtime validation schema matching the TypeScript response type
- Use `.catch()` with sensible defaults for optional/nullable fields
- Export both the schema and the inferred TypeScript type from it

### 5. Mock Data (`__mocks__/[resource].ts`)
- Factory function: `buildMock[Resource](overrides?: Partial<Resource>): Resource`
- One default (happy path with realistic values)
- One edge case variant (empty arrays, null optionals, max-length strings)

## Phase 3: Validate

Run TypeScript compilation on the generated files:
```bash
npx tsc --noEmit
```

Verify:
- Types align between the API function and the hook
- Zod schema inference matches the TypeScript type (no silent mismatches)
- No compilation errors in the generated pipeline

Fix any issues before reporting done.

## Phase 4: Output Summary

List every file created/modified with its path and a one-line description of what it contains.

Provide a usage example showing exactly how a component would import and use the hook.
