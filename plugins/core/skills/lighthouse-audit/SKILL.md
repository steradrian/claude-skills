---
name: lighthouse-audit
description: >
  Run a full Lighthouse audit on a local dev page, generate a structured improvement plan, apply fixes to the code, then re-audit and compare scores. Use this skill whenever the user wants to audit a page for performance, accessibility, SEO, or best practices; wants to improve Lighthouse scores; mentions LCP, CLS, TBT, FCP, or Core Web Vitals; asks for a performance or accessibility report; or says anything like "run lighthouse", "audit this page", "improve my scores", "check my web vitals", or "performance audit". Trigger even for partial requests like "can you check the performance of my page?" — the user doesn't have to say "lighthouse" explicitly.
---

# Lighthouse Audit Skill

A complete end-to-end workflow: branch → audit → plan → fix → re-audit → compare.

---

## Step 0: Gather context (ask all at once)

Ask the user for these in a **single message** before doing anything:

1. **Base branch** — which branch to branch from (e.g. `main`, `develop`)
2. **Page path** — the route to audit (e.g. `/my-page`, `/products`, `/`)
3. **Device preset** — `mobile` or `desktop`
4. **Fix scope** — should you apply fixes automatically, or just produce the plan?

Do not proceed until you have all four answers.

> **Production build is mandatory.** Dev servers include HMR scripts, unminified bundles, source maps, and extra logging that inflate TBT and page weight by 20–50 points. This skill always builds and serves a production build before auditing.

### Build and serve production

Detect the package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm). Then:

```bash
# Build production bundle
<pm> run build

# Start production server in the background
<pm> run start &
PROD_PID=$!

# Wait for the server to be ready (port 3000 by default)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200" && break
  sleep 1
done
```

The audit URL is `http://localhost:3000<page-path>`. If the project uses a custom port, detect it from `package.json` scripts or `next.config`.

> **Important:** The production server must stay running until all audits are complete (including the post-fix re-audit in Step 5). Kill it only at the very end or when rebuilding after fixes.

After all audits are complete, clean up:

```bash
kill $PROD_PID 2>/dev/null
```

---

## Step 1: Branch

```bash
git fetch origin
git checkout <base-branch>
git pull origin <base-branch>
git checkout -b fix/lighthouse-<kebab-page-name>
```

`<kebab-page-name>` is derived from the URL path (e.g. `/products/detail` → `products-detail`). If the path is `/` or empty, use `home`.

Confirm the branch name to the user before continuing.

---

## Step 2: Pre-fix audit

### 2a. Check production server is reachable

```bash
curl -s -o /dev/null -w "%{http_code}" <URL>
```

If the response is not `200`, the production build or server may have failed. Check the build output for errors. Do not proceed with the audit until the server responds.

### 2b. Network diagnostics

Run these before Lighthouse to get raw load metrics independent of browser simulation.

**Full page load time + HTML size:**
```bash
curl -s -o /tmp/page.html -w "\n--- TIMINGS ---\nTotal time:       %{time_total}s\nDNS lookup:       %{time_namedlookup}s\nTCP connect:      %{time_connect}s\nTTFB:             %{time_starttransfer}s\nRedirects:        %{time_redirect}s\nHTTP status:      %{http_code}\nDownload size:    %{size_download} bytes\n" <URL>
```

**HTML document size (uncompressed vs gzip):**
```bash
wc -c < /tmp/page.html
gzip -c /tmp/page.html | wc -c
```

**Check if gzip/brotli compression is enabled on the server:**
```bash
curl -sI -H "Accept-Encoding: gzip, br" <URL> | grep -i "content-encoding"
```

**Count total resources referenced in HTML** (scripts, stylesheets, images):
```bash
grep -oE 'src="[^"]+"' /tmp/page.html | wc -l
grep -oE 'href="[^"]+\.css[^"]*"' /tmp/page.html | wc -l
grep -oE '<script' /tmp/page.html | wc -l
```

Print a diagnostics summary before running Lighthouse:

| Check | Value | Status |
|---|---|---|
| TTFB | Xs | ✅ ≤ 0.8s / ⚠️ 0.8–1.8s / ❌ > 1.8s |
| Total load time | Xs | |
| HTML size (uncompressed) | X KB | ✅ < 100KB / ⚠️ 100–500KB / ❌ > 500KB |
| HTML size (gzip) | X KB | |
| Compression enabled | Yes/No | ❌ if No |
| `<script>` tags | N | ⚠️ if > 10 |
| Stylesheet `<link>` tags | N | ⚠️ if > 5 |

> **HTML size guidance**: A well-optimised page should have an uncompressed HTML document under 100KB. Over 500KB usually indicates server-side rendered data being inlined (large JSON blobs, un-paginated lists, etc.).

> **TTFB guidance**: Under 800ms is good (per Google CWV). Over 1.8s is poor and typically points to slow server-side rendering, database queries, or no caching.

### 2c. Ensure Lighthouse is available

```bash
npx --yes lighthouse --version
```

Check the version. If it is **≥ 13.0.0**, the JSON audit keys use the new insights format — see the key mapping table in Step 2e before parsing.

### 2d. Run the audit (3 runs, median)

Lighthouse scores vary by 5–10 points between runs due to CPU scheduling, JS nondeterminism, and simulated throttling variance. Run **3 times** and use the median to get a reliable baseline.

Run each using the same fixed flags — output **both JSON and HTML** in one pass:

```bash
npx lighthouse <URL> \
  --output=json --output=html \
  --output-path=./lighthouse-before-run1 \
  --preset=<device-preset> \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --quiet

# repeat with run2, run3
```

This produces `lighthouse-before-run1.report.json`, `lighthouse-before-run1.report.html`, etc. Note: when using multiple `--output` formats, Lighthouse strips the extension from `--output-path` and appends `.report.<format>` automatically.

**Pick the median run** — the run whose Performance score is closest to the middle of the three:

```bash
node -e "
const fs = require('fs');
const runs = [1,2,3].map(n => {
  const lhr = JSON.parse(fs.readFileSync(\`lighthouse-before-run\${n}.report.json\`, 'utf8'));
  return { n, score: lhr.categories.performance.score * 100 };
});
runs.sort((a,b) => a.score - b.score);
const median = runs[1];
console.log('Median run:', median.n, '— Score:', median.score.toFixed(1));
fs.copyFileSync(\`lighthouse-before-run\${median.n}.report.json\`, 'lighthouse-before.json');
fs.copyFileSync(\`lighthouse-before-run\${median.n}.report.html\`, 'lighthouse-before.html');
"
```

Tell the user which run was selected as median and what the three scores were, so they can see the variance. Delete the non-median run files to keep the repo clean.

> **Device preset**: use `--preset=desktop` or `--form-factor=mobile` flags. See `references/lighthouse-flags.md` for exact flags per device.

Commit:

```bash
git add lighthouse-before.json lighthouse-before.html
git commit -m "chore: add pre-fix Lighthouse audit (before, median of 3 runs)"
```

### 2e. Lighthouse version — audit key mapping

The JSON structure changed significantly between Lighthouse 12 and 13. Before parsing `lighthouse-before.json`, check the version and use the correct audit keys:

```bash
node -e "
const lhr = JSON.parse(require('fs').readFileSync('lighthouse-before.json','utf8'));
console.log('Lighthouse version:', lhr.lighthouseVersion);
"
```

| If version is… | Use these audit keys |
|---|---|
| **< 12** | Legacy keys (e.g. `render-blocking-resources`, `third-party-summary`, `layout-shifts`) |
| **12.x** | Both old and new keys may coexist during transition |
| **≥ 13** | New insight keys (e.g. `render-blocking-insight`, `third-parties-insight`, `cls-culprits-insight`) |

**Critical renames in Lighthouse 13** (old → new):

| Old key | New key |
|---|---|
| `render-blocking-resources` | `render-blocking-insight` |
| `third-party-summary` | `third-parties-insight` |
| `layout-shifts` | `cls-culprits-insight` |
| `modern-image-formats` + `uses-optimized-images` + `uses-responsive-images` | `image-delivery-insight` (merged) |
| `prioritize-lcp-image` + `lcp-lazy-loaded` | `lcp-discovery-insight` (merged) |
| `largest-contentful-paint-element` | `lcp-phases-insight` |
| `critical-request-chains` + `uses-rel-preconnect` | `network-dependency-tree-insight` (merged) |
| `server-response-time` + `redirects` + `uses-text-compression` | `document-latency-insight` (merged) |
| `uses-long-cache-ttl` | `use-cache-insight` |
| `dom-size` | `dom-size-insight` |
| `duplicated-javascript` | `duplicated-javascript-insight` |
| `font-display` | `font-display-insight` |
| `legacy-javascript` | `legacy-javascript-insight` |
| `uses-http2` | `modern-http-insight` |

> **Note:** Metric audit keys (used for scoring) are **unchanged** across all versions: `first-contentful-paint`, `largest-contentful-paint`, `total-blocking-time`, `cumulative-layout-shift`, `speed-index`, `interactive`.

> **PWA category removed in Lighthouse 12+.** Do not attempt to parse `lhr.categories.pwa`.

### 2f. Extract scores

Parse `lighthouse-before.json` and print a summary table:

| Category | Score |
|---|---|
| Performance | 0–100 |
| Accessibility | 0–100 |
| Best Practices | 0–100 |
| SEO | 0–100 |

Also extract and display the key Performance diagnostics:

| Metric | Value |
|---|---|
| First Contentful Paint (FCP) | Xs |
| Largest Contentful Paint (LCP) | Xs |
| Total Blocking Time (TBT) | Xms |
| Cumulative Layout Shift (CLS) | X |
| Speed Index | Xs |
| Time to Interactive (TTI) | Xs |

> ⚠️ **INP is not measured by Lighthouse.** Interaction to Next Paint replaced First Input Delay as a Core Web Vital in March 2024. Lighthouse uses TBT as a lab proxy — it captures main-thread blocking during load, but **cannot measure actual interaction responsiveness** (event handler execution time, post-interaction rendering). A page with zero TBT can still have poor INP.
>
> To measure INP locally: open DevTools console, paste:
> ```js
> const script = document.createElement('script');
> script.src = 'https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js';
> document.head.appendChild(script);
> script.onload = () => webVitals.onINP(console.log, { reportAllChanges: true });
> ```
> Then interact with the page (click buttons, open menus, type in inputs). Each interaction logs its INP value. Target: **≤ 200ms**. See `references/fix-patterns.md` for INP-specific fixes.

### 2g. Third-party script impact (A/B audit)

Third-party scripts (analytics, chat widgets, tag managers, ad scripts) can tank performance scores by 10–20 points and are outside the developer's control. Before generating the fix plan, run a second audit with all third-party requests blocked to isolate first-party vs. third-party impact.

First, extract the third-party domains from the audit JSON:

```bash
node -e "
const lhr = JSON.parse(require('fs').readFileSync('lighthouse-before.json','utf8'));
const key = lhr.lighthouseVersion >= '13' ? 'third-parties-insight' : 'third-party-summary';
const audit = lhr.audits[key];
if (!audit || !audit.details || !audit.details.items) { console.log('No third-party data'); process.exit(); }
audit.details.items.forEach(item => {
  const entity = item.entity?.text || item.entity || 'unknown';
  const blocking = item.blockingTime || 0;
  const size = item.transferSize || 0;
  console.log(\`\${entity}: \${(size/1024).toFixed(1)}KB, \${Math.round(blocking)}ms blocking\`);
});
"
```

Then run a blocked audit (single run is sufficient for comparison purposes):

```bash
npx lighthouse <URL> \
  --output=json --output=html \
  --output-path=./lighthouse-before-no3p \
  --preset=<device-preset> \
  --only-categories=performance \
  --blocked-url-patterns="*google-analytics.com*" "*googletagmanager.com*" "*facebook.net*" "*hotjar.com*" "*doubleclick.net*" "*segment.com*" "*intercom.io*" "*crisp.chat*" \
  --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
  --quiet
```

Add any additional third-party domains found in the previous step to `--blocked-url-patterns`.

Compare the Performance scores:

```bash
node -e "
const with3p = JSON.parse(require('fs').readFileSync('lighthouse-before.json','utf8'));
const without3p = JSON.parse(require('fs').readFileSync('lighthouse-before-no3p.report.json','utf8'));
const diff = (without3p.categories.performance.score - with3p.categories.performance.score) * 100;
console.log('With 3rd parties:   ', Math.round(with3p.categories.performance.score * 100));
console.log('Without 3rd parties:', Math.round(without3p.categories.performance.score * 100));
console.log('3rd party cost:     ', diff > 0 ? '+' + diff.toFixed(1) : diff.toFixed(1), 'points');
"
```

Report the third-party cost to the user. If the score difference is **≥ 5 points**, call it out explicitly in the fix plan under a dedicated "Third-party scripts" section. The fix recommendations in `references/fix-patterns.md` cover facade patterns and loading strategies.

### 2h. Bundle analysis (Next.js projects only)

Skip this step if the project does not use Next.js.

Bundle analysis surfaces which specific packages and routes are bloating the bundle — information Lighthouse cannot provide.

**1. Parse `next build` output for oversized routes:**

```bash
<pm> run build 2>&1 | tee /tmp/next-build-output.txt
```

```bash
node -e "
const fs = require('fs');
const output = fs.readFileSync('/tmp/next-build-output.txt', 'utf8');
const routeLines = output.split('\n').filter(l => /\d+(\.\d+)?\s*kB/.test(l));
const oversized = routeLines.filter(l => {
  const match = l.match(/(\d+(?:\.\d+)?)\s*kB/);
  return match && parseFloat(match[1]) > 130;
});
if (oversized.length) {
  console.log('⚠️  Routes exceeding 130KB JS budget:');
  oversized.forEach(l => console.log('  ', l.trim()));
} else {
  console.log('✅ All routes under 130KB JS budget');
}
"
```

**2. Check for unused dependencies (lightweight — defer to `/core:dead-code` skill for full analysis):**

```bash
<pm> exec knip --include dependencies 2>&1 | head -50
```

If knip is not installed, skip this sub-step.

**3. Bundle analyzer (informational):**

If `@next/bundle-analyzer` is configured in the project's `next.config`, note:

> Run `ANALYZE=true next build` to generate an interactive treemap. Open the HTML files in `.next/analyze/` to visually identify the largest packages.

Report a bundle analysis summary:

| Check | Result | Status |
|---|---|---|
| Routes > 130KB JS | list or "none" | ✅/⚠️ |
| Unused dependencies | list or "none" | ✅/⚠️ |
| Bundle analyzer available | Yes/No | informational |

Include oversized routes and unused deps in the fix plan (Step 3).

---

Read `lighthouse-before.json`. Focus on audit items with `score < 0.9` and `details.type` that has actionable data (opportunities, diagnostics, table).

Also incorporate findings from Step 2h (oversized routes, unused deps) if applicable.

Group findings into a structured plan. For each issue:

- **What**: human-readable problem description
- **Why it matters**: which metric(s) it affects (LCP, TBT, CLS, etc.)
- **Estimated gain**: use `metricSavings.LCP` / `metricSavings.FCP` from the audit item (Lighthouse 13+), or `details.overallSavingsMs` (Lighthouse ≤ 12)
- **Impact category**: which priority tier it falls into (see below)
- **Effort**: Low / Medium / High
- **Safety level**: `[safe]`, `[verify]`, or `[review]` (see below)
- **How to fix**: concrete, code-level instruction

See `references/fix-patterns.md` for common fix patterns by category.

### Impact priority (from Vercel Engineering research)

Order fixes by impact category, then by effort within each category:

1. **CRITICAL — Async waterfalls**: sequential fetches, render-blocking chains, unparallelized promises
2. **CRITICAL — Bundle size**: oversized routes (>130KB), unused deps, barrel imports, unoptimized packages
3. **HIGH — Server performance**: slow TTFB, missing caching, unoptimized SSR
4. **MEDIUM — Client & rendering**: redundant requests, unnecessary re-renders, layout thrashing
5. **LOW — Micro-optimizations**: edge cases, minor improvements

### Safety classification

Tag every fix in the plan:

| Label | Meaning | Examples |
|---|---|---|
| `[safe]` | Auto-apply with high confidence; no behavioral change | `next/image`, `next/font`, `next/script` for 3P, `optimizePackageImports`, `compiler.removeConsole`, `loading.tsx` / Suspense, image `width`/`height`, `fetchpriority="high"` |
| `[verify]` | Apply then build-check; could change behavior | Dynamic imports (`next/dynamic`), removing unused `'use client'`, library replacements, code splitting, removing unused CSS |
| `[review]` | Needs human review before applying | SSR→ISR migration, RSC architectural changes, data fetching strategy changes, caching policy changes |

### next.config.js optimization check (Next.js only)

Before finalizing the plan, read the project's `next.config.js` or `next.config.ts` and check for these safe optimizations. Add any missing ones to the plan:

| Optimization | Check for | Savings |
|---|---|---|
| `optimizePackageImports` | Should include all icon/UI libraries used (lucide-react, @heroicons, @radix-ui/*, etc.) | 50–200KB |
| `compiler.removeConsole` | Should be `true` or `{ exclude: ['error', 'warn'] }` for production | 5–50KB |
| `images.formats` | Should include `['image/avif', 'image/webp']` | 60–80% image size reduction |
| `compress` | Should be `true` (default, but verify not disabled) | varies |
| `experimental.inlineCss` | Consider `true` for CSS render-blocking elimination | FCP improvement |

See `references/fix-patterns.md` § "Next.js Config Catalog" for details.

### Output format

Print the plan in this structure:

```
## Lighthouse Fix Plan — <URL>

### CRITICAL — Async Waterfalls
- [ ] `[safe]` <fix title> — affects <metric> — est. +Xms
  How: <concrete instruction>

### CRITICAL — Bundle Size
- [ ] `[verify]` <fix title> — affects <metric> — est. -XKB
  How: <concrete instruction>

### HIGH — Server Performance
- [ ] `[safe]` <fix title> — affects <metric>
  How: <concrete instruction>

### MEDIUM — Client & Rendering
- [ ] `[verify]` <fix title> — affects <metric>
  How: <concrete instruction>

### Accessibility
- [ ] `[safe]` <fix title>
  How: <concrete instruction>

### SEO
- [ ] `[safe]` <fix title>
  How: <concrete instruction>

### Third-party scripts (if cost ≥ 5 points)
- [ ] <script name> — X KB, Xms blocking — cost: ~X score points
  How: <facade / defer / remove / move to Web Worker>

### next.config.js optimizations (Next.js only)
- [ ] `[safe]` <optimization> — est. savings
  How: <concrete instruction>
```

After printing the plan, ask: **"Should I go ahead and apply these fixes? I'll apply safe fixes first, then verify-level fixes with a build check between batches."**

If fix scope was already set to "just the plan", stop here and remind the user they can re-run the skill anytime to apply fixes.

---

## Step 4: Apply fixes (batch by safety level)

Read `references/fix-patterns.md` before applying fixes — it contains proven patterns for common issues.

Apply fixes in three batches, running a quick verification build between each. This catches regressions early and measures incremental impact.

### Batch 1: Safe fixes (`[safe]` label)

Work through all `[safe]` fixes across all impact categories. For each fix:
1. Identify the affected file(s)
2. Apply the change
3. Briefly describe what was changed and why

After all safe fixes are applied, run a build check:

```bash
<pm> run build 2>&1 | tail -30
```

If the build fails, identify which fix caused it and revert that specific change. Commit the successful safe fixes:

```bash
git add -A && git commit -m "fix: lighthouse safe fixes — <summary>"
```

### Batch 2: Verify fixes (`[verify]` label)

Apply `[verify]` fixes one at a time (or in small related groups). After each:

```bash
<pm> run build 2>&1 | tail -30
```

If the build succeeds, keep the change. If it fails or causes a regression, revert and note it in the remaining issues section.

```bash
git add -A && git commit -m "fix: lighthouse verify-level fixes — <summary>"
```

### Batch 3: Review fixes (`[review]` label)

For `[review]` fixes, **describe** the proposed change but **do not auto-apply**. Present the change to the user:

> "This fix requires architectural changes. Here's what I'd change: [description]. Should I proceed?"

Only apply after explicit user approval.

```bash
git add -A && git commit -m "fix: lighthouse architectural fixes — <summary>"
```

---

## Step 5: Post-fix audit

### Rebuild and restart production server

The fixes changed source code, so the production build is stale. Rebuild and restart:

```bash
# Kill the old production server
kill $PROD_PID 2>/dev/null

# Rebuild
<pm> run build

# Restart production server
<pm> run start &
PROD_PID=$!

# Wait for ready
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200" && break
  sleep 1
done
```

### Re-audit

Re-run the **network diagnostics** (Step 2b) first — save the results mentally for comparison.

Then repeat the same **3-run median process** from Step 2d, using `lighthouse-after-run1/2/3` as filenames. Copy the median to `lighthouse-after.json` and `lighthouse-after.html`.

```bash
git add lighthouse-after.json lighthouse-after.html
git commit -m "chore: add post-fix Lighthouse audit (after, median of 3 runs)"
```

---

## Step 6: Delta report

Parse both JSON files and produce the comparison report:

### Score delta

| Category | Before | After | Δ |
|---|---|---|---|
| Performance | X | X | **+X** 🟢 / **-X** 🔴 |
| Accessibility | X | X | Δ |
| Best Practices | X | X | Δ |
| SEO | X | X | Δ |

### Key metric delta

| Metric | Before | After | Δ | Target |
|---|---|---|---|---|
| LCP | Xs | Xs | Δ | ≤ 2.5s |
| TBT | Xms | Xms | Δ | ≤ 200ms |
| CLS | X | X | Δ | ≤ 0.1 |
| FCP | Xs | Xs | Δ | ≤ 1.8s |
| Speed Index | Xs | Xs | Δ | ≤ 3.4s |

### Targets

Use these thresholds (Google Core Web Vitals):

| Metric | Good | Needs Improvement |
|---|---|---|
| LCP | ≤ 2.5s | 2.5–4.0s |
| TBT | ≤ 200ms | 200–600ms |
| CLS | ≤ 0.1 | 0.1–0.25 |
| FCP | ≤ 1.8s | 1.8–3.0s |
| Speed Index | ≤ 3.4s | 3.4–5.8s |

Mark each metric as ✅ Good, ⚠️ Needs Work, or ❌ Poor in the after column.

### Network diagnostics delta

| Check | Before | After | Δ | Target |
|---|---|---|---|---|
| TTFB | Xs | Xs | Δ | ≤ 0.8s |
| Total load time | Xs | Xs | Δ | |
| HTML size (uncompressed) | X KB | X KB | Δ | ≤ 100KB |
| HTML size (gzip) | X KB | X KB | Δ | |
| Compression enabled | Yes/No | Yes/No | — | Must be Yes |
| `<script>` tags | N | N | Δ | ≤ 10 |
| Stylesheet `<link>` tags | N | N | Δ | ≤ 5 |

Flag any regressions in this table (after > before) with ⚠️.

### Remaining issues

List any issues from the plan that were **not** resolved and explain why (e.g. architectural constraint, out of scope, needs backend change).

---

## Step 7: Offer iteration loop

If any Performance score is still below 90, or any Core Web Vital is still in "Needs Improvement" or "Poor":

> "There are still improvements available. Would you like me to run another round of fixes targeting the remaining issues?"

If yes, return to Step 3 using `lighthouse-after.json` as the new baseline. Re-name subsequent files `lighthouse-after-2.json`, etc. The production server from Step 5 is still running — no need to restart unless new fixes are applied.

When the user is satisfied or no more improvements are possible, clean up the production server:

```bash
kill $PROD_PID 2>/dev/null
```

---

## Error handling

| Situation | Action |
|---|---|
| Build fails | Show the build error output; do not start the production server or proceed with audit |
| Production server not responding | Check build output for errors; retry `<pm> run start` once; if still failing, report to user |
| Lighthouse times out | Retry once with `--max-wait-for-load=60000`, then report failure |
| No audit items found below threshold | Tell user the page is already in great shape; show scores |
| Git branch already exists | Ask user if they want to reset it or use a different name |
| Chrome not found | Tell user to install Chrome/Chromium; provide install command for their OS |
| Port 3000 already in use | Detect with `lsof -i :3000`; ask user to free the port or use a different one |

---

## Reference files

- `references/lighthouse-flags.md` — exact CLI flags for mobile vs desktop, throttling options
- `references/fix-patterns.md` — proven code-level fix patterns for common Lighthouse issues
