# Step 6 — React / Next.js (changed files only)

**React patterns:**
- **Hooks correctness**: exhaustive `useEffect` deps, stale closures capturing outdated values, missing cleanup (event listeners, subscriptions, timers)
- **Stale closures**: `setInterval`/`addEventListener`/`setTimeout` callback with `deps: []` or inside async flow captures state at creation time — sees initial/stale value forever. Fix: functional updater `setState(prev => ...)` or add dep with proper cleanup. Especially dangerous with `deps: []` effects.
- **Derived state**: `useState` + `useEffect` to compute a derivable value — only flag if not set from multiple sources. See `useEffect anti-patterns` below for full taxonomy.
- **Unnecessary re-renders**: inline object/array literals or new function refs in JSX props — only flag on expensive components (`React.memo`, list items, components re-rendering on parent state)
- **Missing loading/error states**: data-fetching hooks exposing `isLoading`/`error` with no UI handling at call site
- **State after unmount**: async callbacks calling `setState` after component may have unmounted — use mounted-ref guard or `AbortController`
- **Debounced/throttled function recreated each render**: `useMemo`/`useCallback` wrapping `debounce(fn)` with `fn` in deps — recreated each render, timer resets. Create debounced function once (stable ref) and update inner callback via ref.
- **React Query `invalidateQueries` during in-flight refetch**: stale response can land after invalidation. Use `cancelQueries` before `invalidateQueries` when freshness is critical.
- **Divergent disabled guards**: same handler reachable from button click + keyboard Enter + form submit must share exact same disabled conditions. Extract to single `const isDisabled = ...`.
- **Non-unique React keys in `.map()`**: `key={entry.rank}` or any non-unique field causes DOM node reuse bugs. Audit every `.map()`: "can two items have the same key?" If yes, it's a bug.
- **Effect self-retriggering feedback loops**: when effect body can change its own deps, simulate the full cycle including cleanup. See [checks-bugs-logic.md](checks-bugs-logic.md) "Effect self-retriggering" for detailed detection method.
- **Derived-state toggle bugs**: boolean derived from state + callback that sets state via clamping — simulate two consecutive interactions to verify the toggle can actually flip. See [checks-bugs-logic.md](checks-bugs-logic.md) "Derived state broken by clamping" for detection method.

**useEffect anti-patterns** (not bugs, but unnecessary complexity/re-renders — severity 🟡):
- **Derived state via effect**: compute inline or `useMemo` instead
- **Reset all state on prop change**: use `key` prop to force remount instead of effect + multiple `setState`
- **Adjust some state on prop change**: compute adjusted value during render with conditional
- **Event-driven logic in effect**: notifications/navigation/toasts triggered by state change — move to the event handler
- **POST/mutation triggered by state**: network write via effect — call mutation directly in handler
- **Effect chains**: multiple effects cascading state updates — consolidate into single handler or reducer
- **App initialization in effect**: one-time setup runs twice in Strict Mode — use module-scope flag
- **Notify parent via effect**: calling parent callback (`onChange`, `onSelect`) in effect — call directly in event handler
- **Pass data to parent via effect**: lift state to parent instead
- **External store subscription via effect**: manual subscribe + `useState` sync — use `useSyncExternalStore`
- **Initialize state from props via effect**: `useEffect(() => setState(prop), [prop])` when `useState(prop)` suffices

**React 19 — breaking changes:**
- `ReactDOM.render()` → `createRoot().render()`; `ReactDOM.hydrate()` → `hydrateRoot()`
- String refs, Legacy Context API (`contextTypes`/`getChildContext`), `ReactDOM.findDOMNode()` — all removed
- `useFormState` → renamed to `useActionState`; flag all `useFormState` usages
- **Ref callback implicit return**: arrow refs returning a value — React 19 treats non-`undefined` return as cleanup function
- **`use(promise)` misuse**: unstable promise ref (created inline) → infinite re-render loop. Must be stable (ref or `useMemo`).
- **Suspense fallback timing**: React 19 commits fallbacks immediately without waiting for siblings
- **`useEffect` cleanup enforcement**: returning non-function values now throws in dev

**Next.js 15 specifics:**
- **`use client` too high**: entire page client-rendered when only a small island needs it — use `<ClientWrapper><ServerComponent /></ClientWrapper>`
- **Uncached `fetch()`**: Next.js 15 doesn't cache by default — flag code assuming caching without `cache: 'force-cache'` or `next: { revalidate: N }`
- **Async dynamic APIs**: `cookies()`, `headers()`, `params`, `searchParams` return Promises — must be `await`ed
- **Suspense boundaries**: async components or `lazy()` without `<Suspense>` fallback; top-level `await` blocking the shell
- **Removed prefetch breaks `useSuspenseQuery`**: when a diff removes a prefetch call, trace the component tree inside `<HydrationBoundary>` for `useSuspenseQuery` depending on that query key. If no `<Suspense>` boundary exists between page and hook, suspension bubbles to layout → full-page loading flash. Either restore prefetch or wrap consumer in `<Suspense>`.
- **Server Components calling own API routes**: unnecessary hop — call function directly; use Server Actions for Client Component mutations
- **Middleware without `matcher`**: runs every route, +60-70ms latency
- **Missing `error.tsx`**: every route folder should have an error boundary
- **`'use server'` missing**: omitting the directive silently makes Server Actions client-side
- **Server → Client serialization**: no functions, class instances, `Date`, `Map`, `Set`, or `undefined` object values across the boundary
- **`React.cache` wrapper bypass**: all call sites in the same request lifecycle (page + generateMetadata + layout) must use the cached wrapper — not the unwrapped function. Grep for direct calls to the wrapped function.

**Cache invalidation:**
- Server Actions mutating data must call `revalidatePath`/`revalidateTag` — without it, stale data forever
- `revalidatePath('/', 'layout')` invalidates everything — prefer targeted `revalidateTag`
- `fetch()` backing mutable data should set `next: { tags: ['my-tag'] }` for precise invalidation
- **Cache tag mismatch**: `fetch()` uses `next: { tags: ['posts'] }` but Server Action calls `revalidateTag('post')` (singular). No error thrown — data stays stale forever. **Detection:** grep all `revalidateTag`/`revalidatePath` calls and cross-reference with `next: { tags: [...] }` in fetch calls. Mismatched strings are silent bugs.

**SEO & metadata integrity:**
- **Deleted route still in sitemap/redirects/middleware**: removing a page route without updating sitemap generator, redirect rules, `middleware.ts` matchers, or structured data. Results in 404s from sitemap, broken redirects, or middleware running on non-existent routes. **Detection:** for every deleted `page.tsx`, grep sitemap generator, redirect config, and middleware matchers.
- **`generateMetadata` inconsistent return shapes**: some code paths return `{ robots: string }`, others `{ robots: object }`. Both valid in Next.js but can cause unexpected merge behavior in wrapper utilities like `generateMetadataWithCanonical`. Standardize on one format within the same function.
- **Metadata doesn't match rendered content**: `generateMetadata` returns title/description from one data source (CMS), but the page component renders from another (API). When sources diverge, Google sees metadata/content mismatch. **Detection:** compare data sources used in `generateMetadata` vs the page component's data fetching.
- **Structured data (JSON-LD) stale after data model change**: component renders structured data referencing a field that was renamed or removed. JSON-LD outputs `undefined` for the field — no crash, but invalid schema that fails Google Rich Results validation. **Detection:** any `structuredData` or `JSON-LD` referencing fields from a changed type/interface.

**Concurrency & double-submission:**
- Async mutations without `isPending`/`isSubmitting` guard — duplicate requests on rapid clicks
- Non-idempotent operations retried without idempotency key — duplicate side effects
- Parallel `useTransition` calls on overlapping state — later may overwrite earlier resolved result

**Image optimization:**
- Above-fold hero images missing `priority`; `<Image fill>` without `sizes` (downloads up to 9x too large); missing `width`/`height` on non-fill (CLS); >1-2 `priority` images per page (bandwidth competition)

**Font optimization:**
- Font instances inside components/`useEffect` — must be module level; missing `subsets`; duplicate instances across files; missing `display: 'swap'`

**Internationalization (i18n):**
- **Hardcoded user-facing strings**: all visible text must use `useTranslation()` from `@/app/i18n/client` — labels, buttons, headings, placeholders, errors, toasts, tooltips. Also utility functions returning display strings.
- Fallback strings: `|| 'Fallback'` so UI doesn't break on missing key; no string concatenation for translated sentences — use interpolation keys
- `aria-label`, `title`, `placeholder`, `alt` must also be translated; new user-facing text → verify translation keys exist
- **Locale-aware metadata URLs**: `generateMetadata()` building `alternates.canonical`/`openGraph.url` must include locale prefix. Without it, non-default locale pages are treated as duplicates. Also verify `alternates.languages` has one entry per supported locale.

**Hydration errors:**
- `new Date()` in render without `suppressHydrationWarning`; `typeof window !== 'undefined'` branching in render; `Math.random()` in render
- Invalid nesting: `<div>` in `<p>`, `<a>` in `<a>`, `<button>` in `<button>`; direct `window`/`localStorage`/`navigator` access outside `useEffect`
