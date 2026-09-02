---
name: lighthouse-audit-light
description: >
  Fast static code analysis for web performance issues — no Lighthouse run needed. Reads a page's component tree and checks for CLS, LCP, TBT, and bundle issues. Use when the user wants a quick performance check, says "quick audit", "check performance of <page>", "perf check", or invokes /lighthouse-audit-light <page-name>. Does NOT replace the full /lighthouse-audit skill for comprehensive scoring.
---

# Lighthouse Audit Light

Fast, read-only performance analysis. Crawls a page's component tree and checks for common performance anti-patterns — no builds, no Lighthouse, no branches.

**Usage:** `/lighthouse-audit-light <page-name>`

---

## Step 0: Resolve page path

The argument is a human-friendly page name. Resolve it to actual files.

### Resolve the page

`homepage`, `home` or `/` map to the root `page.tsx` of the app directory (under any locale segment such as `[lang]` or `[locale]` and any route group). For anything else, search by route name:

```bash
find app src/app -name "page.tsx" -path "*<argument>*" 2>/dev/null
```

Prefer the match whose path segments equal the route (e.g. `/promotions` → `.../promotions/page.tsx`) over deeper partial matches. If several candidates remain, show them and ask. If no match, tell the user and list available pages.

### Collect layout chain

Every page inherits layouts. Collect all layouts from root to page:

1. The root `layout.tsx` of the app directory
2. The locale-segment `layout.tsx`, if the app has one (`[lang]`, `[locale]`)
3. The route-group `layout.tsx` the page sits under, if any (`(default)`, `(marketing)`, ...)
4. Any nested `layout.tsx` closer to the page

Read all of these — they inject scripts, fonts, providers, and navbars that affect performance.

---

## Step 1: Crawl component tree

Starting from the page file + its layout chain, build a file list to analyze.

### Process

1. Read each file (page + layouts)
2. Extract all local imports (paths starting with `@/`, `~/`, `../`, `./`)
3. Recursively follow imports up to **4 levels deep** from the page
4. Skip: `node_modules`, test files, type-only imports, CSS/SCSS files
5. Cap at **80 files** max to keep analysis fast

### Output

Print a brief summary:

```
Crawled <N> files from page "<page-name>" + <M> layouts
Entry: src/app/[locale]/(default)/page.tsx
```

---

## Step 2: Static analysis checks

Run every check below against all crawled files. For `next.config` checks, read `next.config.ts` or `next.config.js` from the project root.

Read `references/fix-patterns.md` for the concrete fix code to include in findings.

### Image checks

**Check 1: Raw `<img>` instead of `next/image`** `[safe]` — affects LCP
- Search for: `<img ` in JSX (not inside comments)
- Exclude: SVGs used inline, tiny icons (< 24px)
- Fix: Replace with `<Image>` from `next/image` with `width`, `height`, and appropriate `loading`

**Check 2: Images missing explicit `width`/`height`** `[safe]` — affects CLS
- Search for: `<img` or `<Image` without both `width` and `height` props
- Note: `next/image` requires these, but raw `<img>` often misses them
- Also check: CSS `aspect-ratio` as a valid alternative
- Fix: Add explicit `width` and `height` attributes

**Check 3: Images missing `loading` attribute** `[safe]` — affects LCP
- Search for: `<img` without `loading="lazy"` or `loading="eager"`
- Note: `next/image` defaults to `loading="lazy"` so only flag raw `<img>`
- Fix: Add `loading="lazy"` to below-fold images, `loading="eager"` to above-fold hero

**Check 4: Hero image missing `fetchpriority`/`priority`** `[safe]` — affects LCP
- Search for: The first large image in the page component (hero section)
- Check if it has `fetchpriority="high"` (raw img) or `priority` prop (next/image)
- Fix: Add `fetchpriority="high"` or `priority` to the above-fold hero image

### Script & font checks

**Check 5: Render-blocking `<script>`** `[safe]` — affects TBT/FCP
- Search for: `<script src=` without `defer`, `async`, or `type="module"`
- Exclude: inline scripts, JSON-LD (`type="application/ld+json"`)
- Fix: Add `defer` attribute

**Check 6: Raw `<script>` instead of `next/script`** `[safe]` — affects TBT
- Search for: `<script` tags in components that should use `next/script`
- Fix: Replace with `<Script>` from `next/script` with `strategy="afterInteractive"` or `"lazyOnload"`

**Check 7: Google Fonts via `<link>` instead of `next/font`** `[safe]` — affects CLS/FCP
- Search for: `<link` with `fonts.googleapis.com` or `fonts.gstatic.com`
- Fix: Replace with `next/font/google` import

**Check 8: Missing `font-display: swap`** `[safe]` — affects CLS
- Search for: `@font-face` declarations without `font-display: swap` (or `optional`)
- Fix: Add `font-display: swap`

### Bundle & import checks

**Check 9: Barrel imports not in `optimizePackageImports`** `[verify]` — affects Bundle
- Read `next.config.ts` → `experimental.optimizePackageImports`
- Search crawled files for imports from known large libraries: `lucide-react`, `@heroicons/react`, `@radix-ui/*`, `react-icons`, `lodash`, `date-fns`, `@phosphor-icons/*`, `@tabler/icons-react`
- Flag any library that is imported in the component tree but NOT listed in `optimizePackageImports`
- Fix: Add the library to the `optimizePackageImports` array

**Check 10: Heavy components imported statically** `[verify]` — affects TBT
- Search for: Static imports of known heavy libraries: chart libraries (`recharts`, `chart.js`, `@nivo`), editors (`@tiptap`, `monaco-editor`, `react-quill`), maps (`@react-google-maps`, `mapbox-gl`, `leaflet`), PDF (`react-pdf`, `@react-pdf`), video players
- Fix: Use `next/dynamic` with `{ ssr: false }` or `React.lazy`

### CLS checks

**Check 11: Ads/embeds without reserved space** `[safe]` — affects CLS
- Search for: `<iframe`, ad containers, embed wrappers without `min-height`, `height`, or `aspect-ratio` in their styles or classes
- Fix: Add `min-height` matching the expected content height

**Check 12: Dynamic content without skeleton/placeholder** `[verify]` — affects CLS
- Search for: Conditional rendering patterns like `{isLoading ? null : <Content />}` or `{data && <Content />}` where the content has significant height
- Fix: Add skeleton/placeholder in the loading state

### Best practices

**Check 13: `target="_blank"` without `rel="noopener"`** `[safe]` — Best Practice
- Search for: `target="_blank"` or `target={'_blank'}` without `rel="noopener"` nearby
- Note: Modern browsers handle this, but Lighthouse still flags it
- Fix: Add `rel="noopener noreferrer"`

### Next.js config checks

Read `next.config.ts` (or `next.config.js`) and check for:

**Check 14: Missing `compiler.removeConsole`** `[safe]` — affects Bundle
- Look for `compiler: { removeConsole: ... }` in the config
- Fix: Add `compiler: { removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false }`

**Check 15: Missing `images.formats`** `[safe]` — affects LCP
- Check if `images.formats` includes AVIF
- Fix: Set `images: { formats: ['image/avif', 'image/webp'] }`

### Code pattern checks

**Check 16: Sequential awaits that could be parallelized** `[verify]` — affects TTFB
- Search for: Multiple `await` statements in sequence where the calls are independent
- Pattern: `const a = await fetchA(); const b = await fetchB();`
- Fix: `const [a, b] = await Promise.all([fetchA(), fetchB()]);`

**Check 17: Large `'use client'` components** `[review]` — affects TBT
- Search for: Files with `'use client'` at the top that import many sub-components or are over ~200 lines
- These push more JavaScript to the client bundle than necessary
- Fix: Extract the interactive parts into small client components, keep the rest as server components

---

## Step 3: Report

Output the findings in this format:

```
## Performance Audit (Light) — <page-name>

Scanned <N> files | Found <X> issues (<S> safe, <V> verify, <R> review)

### CRITICAL — CLS Risk
- [ ] `[safe]` **<file>:<line>** — <issue>
  Affects: CLS | Fix: <one-line fix description>

### CRITICAL — LCP Risk
- [ ] `[safe]` **<file>:<line>** — <issue>
  Affects: LCP | Fix: <one-line fix description>

### HIGH — Bundle Size
- [ ] `[verify]` **<file>:<line>** — <issue>
  Affects: TBT | Fix: <one-line fix description>

### MEDIUM — Client & Rendering
- [ ] `[verify]` **<file>:<line>** — <issue>
  Affects: <metric> | Fix: <one-line fix description>

### LOW — Best Practices
- [ ] `[safe]` **<file>:<line>** — <issue>
  Fix: <one-line fix description>

### Config Optimizations
- [ ] `[safe]` **next.config.ts** — <missing optimization>
  Fix: <what to add>
```

If no issues found in a category, omit that section.

If zero issues found overall:
> "No performance issues detected in the component tree for this page. For a comprehensive score with real browser metrics, run the full `/lighthouse-audit`."

### Severity mapping

| Severity | What goes here |
|---|---|
| CRITICAL | CLS-causing issues (missing dimensions, no loading attrs), LCP blockers (no fetchpriority, render-blocking scripts) |
| HIGH | Bundle issues (barrel imports, heavy static imports), missing config optimizations |
| MEDIUM | Code patterns (sequential awaits, large client components), dynamic content without skeletons |
| LOW | Best practices (noopener, font-display) |

---

## Step 4: Fix offer

After the report, ask:

> **"Found <X> issues. Want me to apply fixes? I'll start with the <S> safe fixes, then verify-level fixes with a build check."**

If yes:

1. Apply all `[safe]` fixes
2. Run `pnpm run build 2>&1 | tail -30` to verify
3. If build passes, apply `[verify]` fixes one at a time with build checks
4. Skip `[review]` fixes — describe them but don't auto-apply
5. Do NOT create branches or commits — the user decides when to commit

If the user says "just the report" or "no fixes", stop after Step 3.
