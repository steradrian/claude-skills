# Step 3 — Bug & logic review (changed files only)

**Async & promises:**
- Missing `await` on async calls — return value silently ignored
- Unhandled promise rejections — no `.catch()` or try/catch wrapper
- Sequential `await` on independent calls — use `Promise.all()`
- **`Promise.all` partial failure**: all results lost if any rejects — use `Promise.allSettled` when partial success is valid
- Race conditions — async state updates that may resolve out of order
- **`useEffect` fetch without cleanup**: needs `AbortController` or boolean `ignore` flag — without it, a fast re-render causes a stale response to overwrite a fresh one
- **`fetch()` doesn't reject on 4xx/5xx** — only on network failure. CDN/load balancer error pages may return HTML instead of JSON, so `response.json()` throws an unhelpful parse error. Check `response.ok` AND wrap `.json()` in try/catch or check `Content-Type` before parsing.
- **Fire-and-forget in event handlers**: `async` calls in `onClick`/`onSubmit` without try/catch — unhandled rejections crash silently
- **Missing cancellation check in catch blocks**: When an async function inside a `useEffect` has a cancellation flag (`ctrl.cancelled`, `ignore`, `aborted`), verify that the `catch` block checks it before executing side effects (`setState`, `scheduleRetry`, error logging). Without this check, if the effect cleans up while an async operation is in-flight and that operation then throws, the catch block runs after cleanup — scheduling orphaned timers, setting stale state, or logging spurious errors. Every early-return cancellation check in the try body must have a corresponding check in the catch body.
- **AbortController reuse after abort**: once `.abort()` is called, the signal stays aborted forever — new requests with the same controller are silently aborted immediately. Each request needs a fresh instance.
- **`fetch()` without timeout**: any `fetch()` in server-side code, build scripts, API routes, Server Actions, or SSR/SSG without an `AbortController` timeout can hang indefinitely if the upstream is unresponsive. This blocks the entire process — no error thrown, no fallback triggered, no timeout. **Detection:** `fetch()` calls in non-browser contexts (anything outside React components) that don't pass a `signal` option. Especially critical when the fetch is the sole path to a fallback/catch block — a hang means the fallback never fires. **Fix:** Create an `AbortController`, set a `setTimeout` to call `controller.abort()` (3-10s for APIs, longer for large payloads), pass `controller.signal` to fetch, and `clearTimeout` in a `finally` block. Also applies to any HTTP client (`axios`, `got`, `undici`) without a configured timeout.
- **Single-page paginated API fetch**: a function calling any paginated API with fixed `limit=N` without looping through pages silently omits results beyond N. **Detection:** `fetch()` with `limit=`/`page_size=`/`per_page=` returning only the first page's `data.docs`/`data.data`/`data.items`/`results` without checking `hasNextPage`/`nextCursor`/`totalPages`/`next_page`. Common response shapes: `{ docs, hasNextPage }` (Payload), `{ data, pagination: { next_page } }`, `{ items, nextToken }` (AWS), `{ results, next }` (DRF). A high `limit=1000` is not a fix — it just raises the truncation threshold.

**Unit & dimension mismatches** (runtime-silent, high-yield — verify units wherever values cross function boundaries):
- **Time**: ms vs seconds — e.g., `setTimeout(fn, delaySeconds)` where value is ms; `new Date(ts * 1000)` where `ts` is already ms
- **Size**: bytes vs KB vs MB — e.g., `if (fileSize > MAX_UPLOAD_MB)` where `fileSize` is bytes
- **Currency**: integer cents vs decimal dollars, float dollars stored where integer cents required
- **Percentage vs fraction**: `0.05` vs `5` for 5% — verify consuming function's expected range
- **Angles**: degrees passed to `Math.sin()`/`Math.cos()` (expect radians)
- **Coordinates/dimensions**: mixing `px` with viewport units; CSS logical vs physical properties

**Null & undefined safety:**
- Values that can be `null`/`undefined` accessed without guards; missing optional chaining (`?.`); missing default values on destructured props/params
- Array methods (`.map`, `.filter`, `.find`) on potentially-undefined arrays; `Map.get()`, `Array.find()`, `Object.keys()[index]` without null check
- `JSON.parse()` on external input without Zod/runtime validation (returns `any`)
- **Unvalidated API response shape**: code accesses `response.data`, `data.docs`, `data.items`, etc. after `await res.json()` without verifying the field is the expected type. `data.data || []` looks safe but passes through objects, strings, numbers — only `Array.isArray()` guarantees an array. Dangerous when the result feeds into `.map()`/`.filter()`/`.reduce()` which throw on non-arrays, or `.length` checks that work on strings too. **Detection:** any `res.json()` followed by property access + `|| []`/`|| {}`/`?? []` fallback without a type guard (`Array.isArray`, `typeof`, Zod schema). Also applies to GraphQL responses, SDK return values, and any external data where the shape is assumed but not verified. **Fix:** Use `Array.isArray(data.field) ? data.field : []` for arrays; use Zod/type guards for complex shapes.
- **Raw search params used without normalization**: Next.js `searchParams` values are `string | string[] | undefined`. Code using the raw value in `Number()`, template literals, or comparisons without normalizing first produces silent bugs: `Number(["2","3"])` is `NaN`, `` `?page=${undefined}` `` is `"?page=undefined"`, and `Number("abc") > 1` is `false`. **Detection:** any `searchParams.X` or `options.page` used directly in arithmetic, URL construction, or conditionals without first parsing to a validated type. **Fix:** Normalize once at the top: extract first element if array, parse to integer, validate with `Number.isFinite()`, and use the normalized value everywhere.
- **Empty-string-as-fallback**: `foo?.id ?? ''` passes null check but produces broken downstream values (empty URLs, query params, asset paths) — guard with `if (!id)` before use
- **Parsed JSON numerics**: after `JSON.parse()`, numeric fields may be strings, `null`, or absent. `Number(undefined)` returns `NaN`, silently corrupting downstream output. Always convert with `Number(value)` and guard with `Number.isFinite(result)`.
- **Silent undefined-to-string coercion**: `` `${foo?.bar}/api/path` `` produces `"undefined/api/path"` — no crash, no type error, just garbage strings causing silent failures. For every template literal interpolating an optional value, verify the value is guaranteed to exist in that branch. Pay special attention to conditional branches: if `isAuthenticated` gates the branch, check whether every value used inside (host, token, etc.) is actually guaranteed.
- **Eager evaluation before branch guard**: `const x = nullable!.prop` computed unconditionally before an `if`/`else` that only uses `x` in one branch — the assertion throws when the other branch is taken. Move computation into the branch that uses it.

**Shared mutable state & references:**
- `Object.assign`/spread into shared/default object — mutation leaks across calls; arrays/objects passed by reference and mutated without cloning; module-level mutable variables modified across requests/renders
- `useState` initializer referencing an external mutable object; `Array.push()`/`.splice()` on module-scoped arrays
- **Stale store value in async flows**: Inside async callbacks (event handlers, timeouts, promises), hook-based selectors (`useStore(selector)` in Zustand, `useSelector` in Redux, `useAtom` in Jotai, `useContext`) capture the render-time value — stale by callback execution. Use `store.getState()` (Zustand), `store.getState()` (Redux), or a ref for async reads. Conversely, don't use `getState()` in render paths where reactivity is needed. Applies to any external store, not just Zustand.

**Control flow & logic:**
- Off-by-one errors in loops, slices, pagination
- **Wrong nullish default in arithmetic**: `(value ?? 0) + 1` where the domain is 1-indexed — the default should be `1`, not `0`. Common in pagination (`?page=` defaults to page 1, not 0), retry counts, and any 1-based offset. **Detection:** `?? 0` or `|| 0` used as a fallback before arithmetic on a value whose absent/default state is 1, not 0. Also check `?? 1` where 0-indexed is intended. Verify the fallback matches the domain's base index.
- **Threshold operator semantics**: `>` vs `>=` on named boundary constants — one includes the boundary, the other excludes it
- Conditions always true/false (dead branches); early returns skipping required cleanup/state resets/logging
- Incorrect operator precedence in `&&`/`||`/`??` combinations
- **`||` vs `??` falsy-value trap**: `value || default` treats `0`, `false`, `''` as falsy — use `??` when `0`/`false` are valid inputs. Scan every `||` defaulting a numeric/boolean param. Example: `initialCount || 4` silently ignores `initialCount = 0`.
- **Truthy guard on numeric/string values**: `if (value)`, ternaries, and `&&` also treat `0`/`""`/`NaN` as falsy. Use `value != null` checks when zero/empty-string is valid input. Example: `minBet && minBetCents ? <CryptoValue /> : '—'` hides a valid $0 min bet.
- Switch/if chains missing case or default handler; division without zero-divisor guard
- Edge cases: empty arrays, null inputs, zero values, negative numbers — are all handled?
- **Coupled independent boolean flags**: an object or conditional that ties two logically independent flags together. Example: `{ index: !noIndex, follow: !noIndex }` forces `follow` to mirror `index`, but indexing and link-following are independent SEO concerns (a page can be noindex but still followed). **Detection:** conditional branches or object literals where changing one input (e.g., `noIndex`) silently changes an unrelated output (e.g., `follow`). Common in metadata construction, permission objects, feature flags. **Fix:** Derive each flag from its own dedicated input.
- **Multi-user data without user filtering**: lists that can contain records for multiple users — verify filtered by current user's ID before computing totals/progress. Cross-check: if one sibling component filters by userId and another doesn't, the unfiltered one is likely a bug.
- **Floating-point equality**: `===` on calculated floats — use tolerance comparison or integer arithmetic for currency
- **Deduplication with wrong identity key**: verify the `Set`/dedup key is truly unique per entity. Common bug: deduplicating by child record ID when intent is one entry per parent entity — duplicates slip through if multiple children belong to the same parent.
- **Derived state broken by clamping/capping**: boolean derived from a clamped value (e.g., `isExpanded = width >= 800`) where the setter caps the value (e.g., `Math.min(800, maxW)`) — the threshold may never be reached. **Simulate the full cycle:** setter caps value → re-render → derived boolean evaluates → next callback reads boolean → does it enter the correct branch? If the cap prevents the threshold, the toggle is stuck. **Fix:** Use explicit boolean state instead of deriving from the clamped value.
- **Parameter nesting/wrapping mismatch**: Function A wraps args before calling Function B: `fnB(arg1, { options })` — Function B accesses `options?.options?.page` expecting a specific nesting depth. If a caller of Function A already wraps the options object, nesting becomes too deep (or too shallow if a wrapper is removed). **Detection:** trace the full call chain for any parameter using nested property access (`options?.options?.X`, `config?.config?.Y`) — verify each intermediate caller produces exactly the expected nesting depth. Common shape: utility wraps `{ options }` then passes to a function that destructures `options.options.field`.

**Error handling:**
- `try/catch` swallowing errors silently (empty catch or `console.log` only); `throw "string"` instead of `throw new Error()`; `catch (error)` accessing `.message` without narrowing (`error` is `unknown` in strict mode)
- Error boundaries missing around async or third-party React components; API errors not surfaced to user; cleanup not running on error path (locks, loaders, subscriptions left open)
- **`.catch(() => null)` error-to-null flattening**: conflates "not found" with transient failures. When caller treats `null` as "not found" (e.g., `notFound()`), transient errors produce 404 pages. Critical in Next.js `generateMetadata` and server components where `notFound()` is cached by the CDN — a transient API blip becomes a persistent 404. Also dangerous in ISR revalidation handlers and API routes where `null` signals "no data" to the client. **Fix:** Return `null` only for clear 404 signals, rethrow everything else.
- **Console-only error handling in production**: `catch` blocks calling only `console.warn`/`console.error` without the project's error tracking service (Sentry `captureException`, etc.)
- **Optimistic update without rollback**: UI state updated before async confirms — error path must revert to previous state
- **Retry error logging reports stale context**: after 401 → refresh → retry, verify the error log reports the **retry's** status, not the original request's. Common: outer `response.status` (401) logged even when retry returned 403. **Fix:** Capture retry status separately; include `originalStatus` and `wasRetry` in error extras. Catch blocks wrapping retry logic must not silently swallow errors.
- **Server action error-as-return ignored by caller**: Server Actions returning `{ success: false, message }` instead of throwing — callers unconditionally calling `toast.success(result.message)` show green notifications on failure; `catch` block becomes dead code. **Fix:** Check `result.success` before choosing toast type.
- **Silent data loss via error-swallowing fetch functions**: fetch function catches error and returns `[]`/`{}`/`null` as fallback — caller uses it without knowing the fetch failed. Dangerous in **any** context where the empty result is treated as "no data exists" rather than "fetch broke": build scripts/generators (incomplete sitemaps, static JSON, configs), SSR/SSG server components (page renders with missing sections, cached by CDN as correct), API route handlers (client gets 200 OK with empty data instead of error status), ISR revalidation (stale data served indefinitely), cache warming/prefetch (cache stays empty, every user hits cold path), cron jobs/background workers (scheduled task silently does nothing). **Detection:** `catch` blocks returning empty collections in functions whose return value feeds into file writes, page rendering, cache population, or client responses. **Fix:** Rethrow or propagate the error so the failure is visible; if graceful degradation is intended, use a well-defined fallback (e.g., hardcoded default list) AND log the error to error tracking, not just console.

**URL & encoding:**
- **URL construction without encoding**: template literal URLs interpolating user/API-derived values without `encodeURIComponent()`. Slugs with special characters (`café`, `rock & roll`, `C++`) break URLs silently. **Detection:** any `` `/${slug}` `` or `` `?q=${query}` `` where the value comes from user input, CMS, or API. **Fix:** `encodeURIComponent()` for path segments and query values; `new URL()` constructor for full URLs.
- **Regex without anchors on validation**: `/\d+/.test("abc123def")` returns `true`. Email, phone, URL, slug validators without `^...$` anchors accept garbage with a valid substring embedded. **Detection:** `.test()` or `.match()` on user input without `^` and `$`. **Fix:** Always anchor validation regexes: `/^\d+$/`.

**Serialization & data integrity:**
- **`JSON.stringify` lossy serialization**: `undefined` values in objects are silently dropped, `Date` becomes ISO string, `Map`/`Set`/`BigInt` become `{}` or throw. Dangerous in cache keys (two different inputs produce same key), logging (missing fields), API payloads (dropped fields), and `structuredClone` alternatives. **Detection:** `JSON.stringify` on objects containing `Date`, `Map`, `Set`, `BigInt`, `undefined`, `Infinity`, `NaN`, or circular references. **Fix:** Custom replacer, `superjson`, or explicit serialization.
- **`Array.sort()` mutates in place**: `const sorted = arr.sort()` mutates the original array AND returns a reference to it. Sorting props, state, or shared arrays corrupts the source. **Detection:** `.sort()` on any array that isn't freshly created in the same scope. **Fix:** `[...arr].sort()` or `arr.toSorted()` (ES2023+).
- **Locale-dependent `String` methods**: `'STRASSE'.toLowerCase()` produces different results in Turkish locale (`ı` vs `i`). `toLocaleLowerCase()` vs `toLowerCase()` matters for comparisons, slug generation, and case-insensitive matching. **Detection:** `.toLowerCase()`/`.toUpperCase()` used in comparisons or slug/URL generation. Safe in most cases but flag when the code handles international user input.

**Security:**
- User input in SQL/shell/`eval` without sanitization; XSS via `dangerouslySetInnerHTML` or unescaped HTML interpolation
- Secrets/tokens/PII logged or in error messages; auth checks missing or bypassable on new routes; insecure direct object references — missing ownership validation
- Hardcoded credentials (patterns: `sk-`, `ghp_`, `AKIA`, `Bearer `, `password =`, `secret =`); `http://` URLs in production
- **ReDoS**: nested quantifiers (`(a+)+`, `([a-z]*)*`) on user-controlled input; **`new RegExp(userInput)`** without `escape-string-regexp`
- **Path traversal**: user-supplied paths in `path.join()` without verifying resolved path stays within base directory
- **Environment-dependent code leaking across environments**: `robots: 'noindex'` or `Disallow: /` in staging config deployed to production. `process.env.NODE_ENV` checks that assume only `'production'` and `'development'` exist but miss `'staging'`/`'test'`/`'preview'`. **Detection:** any robots/indexing/crawl directive, analytics ID, API key, or feature flag that differs per environment without env-var gating. **Fix:** Always gate on explicit env vars, never on `NODE_ENV` alone.
- **Stale auth token in reconnecting/long-lived clients**: `getToken`/auth callbacks in WebSockets (Centrifuge, Socket.IO, Ably), SSE clients, polling loops, MQTT, or any reconnecting transport reading a stale closure instead of fetching a fresh token — reconnects after token expiry silently fail or use revoked credentials. Verify `getToken` always calls the refresh function, not a captured variable. Also applies to long-lived HTTP clients with auth interceptors that cache tokens in closure scope.

**TypeScript:**
- `as any` or `as unknown as X` hiding real type errors. For double-casts: grep how the same value is typed elsewhere — if 3+ call sites use no cast, the double-cast is hiding a real mismatch.
- **Cross-module double-casting**: `foo as unknown as OtherType` across a boundary — fix the prop type or create a shared interface
- **`any` in array callbacks**: `(item: any)` in `.map()`/`.filter()`/`.flatMap()`/`.reduce()` when a named type exists — silently disables all type checking inside the callback body. Check the array's declared type and use it.
- **`any` in interface/type properties**: `prop?: any` when a proper type exists — grep what the value is passed to and use that type
- **Unnecessary `?.` on required params** — either the type is wrong or the `?.` is noise. **Post-guard `?.`**: after a null guard (`if (!data) return`), TypeScript has narrowed to non-null — `?.` is dead noise obscuring the nullability contract.
- `@ts-ignore` without `@ts-expect-error` + justification; non-null assertions (`!`) where value can be null
- **Insufficient range guard before union narrowing**: `rank <= 3` then `rank as 1 | 2 | 3` allows 0 and negatives. Verify guard covers full valid range.
- **Missing type imports**: `React.ReactNode` etc. without `import type { ReactNode }` — compile error without global React types
- Return types missing on exported functions; types widened to `object`/`{}` instead of interface; switch on union missing exhaustive check; state modeled with parallel booleans instead of discriminated union
- `.filter(Boolean)` without type predicate — use `.filter((x): x is NonNullable<T> => x != null)`; unconstrained generics that should use `extends`
- **Nullable-to-non-nullable param mismatch**: `fn(param: string)` called with `string | null`. Even if a runtime guard (e.g., React Query `enabled`) prevents null execution, the type contract is wrong and breaks if the guard is removed. **Fix:** Accept nullable type + add internal guard. Check hook signatures vs call sites, especially with derived/optional state.

**Breaking changes & regressions:**
- Removed/renamed exports — grep all importers; changed function signatures — verify all callers; changed types/interfaces — check all referencing files
- Removed CSS classes/DOM attributes relied on by tests or other components; changed API response shapes; changed shared component props without updating consumers

**Code duplication & reinvention:**
- New helper reimplementing something in `src/utils/`/`src/hooks/`/`src/lib/` — grep first; local copy of shared code when a shared one exists; copy-paste with subtle difference — likely a bug in one
- **Inline logic duplicated across components**: When the diff introduces inline logic (URL construction, data transformation, formatting, fallback computation), grep the codebase for the same pattern. If 3+ call sites implement the same multi-step logic inline (e.g., splitting a string, conditionally building a URL, computing a derived value), flag for extraction into a shared utility. **Detection:** look for identical sequences of operations: same `split('/')` + conditional + template literal, same `Math.round` + formatting, same error-recovery fallback chain. Even if each instance "works," divergence over time is inevitable — one site gets a bug fix, the others don't. **Severity:** 🟡 if any existing instance lacks a safety check that another has (inconsistent behavior across the app), 🔵 if all instances are identical (pure maintainability).

**Date & time:**
- **Timezone-unaware comparisons**: `new Date(str) > new Date(str)` without explicit timezone — depends on locale. Use UTC or `date-fns` with timezone.
- **`new Date()` in render** — server/client mismatch → hydration error. **At module scope** — evaluated once at import → stale on long-lived servers; non-deterministic in test fixtures.
- **DST arithmetic**: `+24*60*60*1000` fails during DST transitions — use `date-fns addDays()`
- **0-indexed month trap**: `new Date(year, month + 1, 0)` — off-by-one produces wrong month
- **Unguarded Date methods**: `new Date('garbage').toISOString()` throws `RangeError`. When Date comes from user input/API, validate with `!Number.isNaN(date.getTime())` before calling any Date method.

**Resource lifecycle management** (flag any without corresponding cleanup):
- `addEventListener` without `removeEventListener`; `setInterval`/`setTimeout` without `clearInterval`/`clearTimeout`; observers (`Intersection`/`Resize`/`Mutation`) without `.disconnect()`; `WebSocket`/`EventSource` without `.close()`
- Expensive clients created per-request instead of shared singleton — connection pool exhaustion. Applies to DB clients (Prisma, Drizzle, Knex), cache clients (Redis, Memcached), search clients (Elasticsearch, Algolia), cloud SDK clients (S3, SQS), and any client that maintains a connection pool or requires initialization handshake.
- `AbortController` created but `.abort()` never called on error/unmount path
- **`removeEventListener` with different reference**: `.bind()`, arrow functions, inline wrappers create new references — `removeEventListener` silently no-ops. Store bound function in variable/ref and pass same reference to both add and remove.

**Effect self-retriggering & cleanup interactions** (high-severity, invisible in line-by-line review — requires runtime state simulation):

**Detection:** For every `useEffect`, check if the body (or called functions) can modify a value in its own dep array. If yes, trace what happens when cleanup runs between re-triggers.

- **Retry counter reset in cleanup**: effect with `retryTrigger` dep runs cleanup before each retry. If cleanup resets `retryCountRef.current = 0`, max-retry limit is never reached and backoff resets. **Fix:** Only reset on success, never in cleanup.
- **General pattern**: Any ref acting as a **circuit breaker/accumulator across effect cycles** (retry counts, backoff delays, attempt timestamps) must NOT be reset in cleanup — cleanup runs on every dep change, not just unmount.
- **How to spot**: `useRef` values (1) incremented in effect body, (2) checked against threshold, AND (3) reset in cleanup → threshold is defeated.
- **State-triggered re-runs**: effect calling `setState(prev => prev + 1)` on a dep tears down and re-runs. Audit cleanup to verify it only resets state that SHOULD restart, not state that should persist across cycles.
- **Timeout not re-armed after retry**: effect starts a stuck-state timeout, user triggers retry resetting the flag but not changing deps — effect won't re-run, no new timeout scheduled. **Fix:** Include timeout state in deps so resetting it re-arms the timer.
