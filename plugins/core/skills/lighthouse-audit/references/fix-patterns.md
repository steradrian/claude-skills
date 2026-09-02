# Lighthouse Fix Patterns

Common issues and their proven code-level solutions. Grouped by category.

## Safety Classification

Each fix pattern is tagged with a safety level:

- `[safe]` — Auto-apply with high confidence. No behavioral change.
- `[verify]` — Apply then run `next build` to verify. Could change behavior.
- `[review]` — Requires human review. Architectural or behavioral change.

---

## INP — Interaction to Next Paint

INP replaced FID as a Core Web Vital in March 2024. It measures the full latency of all interactions (clicks, taps, key presses) and reports the worst one. Target: **≤ 200ms**. Lighthouse cannot measure INP — TBT is only a proxy for input delay, not full interaction latency.

INP has three phases to optimise:
1. **Input delay** — main thread is busy when the user interacts
2. **Processing duration** — event handler execution time
3. **Presentation delay** — rendering/painting after the handler completes

### Break up long tasks with `scheduler.yield()` (best approach) `[verify]`

```js
async function handleClick() {
  // Critical: immediate visual feedback first
  setLoadingState(true);

  // Yield to let the browser paint the feedback
  await scheduler.yield(); // Chromium only; falls back to setTimeout(0)

  // Deferrable work after yield
  await processData();
  setLoadingState(false);
}

// Polyfill for non-Chromium browsers
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));
```

### Avoid layout thrashing in event handlers

```js
// BAD — reads and writes DOM in alternation (forces synchronous layout)
elements.forEach(el => {
  const height = el.offsetHeight; // read (forces layout)
  el.style.height = height + 10 + 'px'; // write
});

// GOOD — batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // all reads first
elements.forEach((el, i) => el.style.height = heights[i] + 10 + 'px'); // all writes
```

### Move heavy computation to a Web Worker `[review]`

```js
// main.js
const worker = new Worker('./heavy.worker.js');
button.addEventListener('click', () => {
  worker.postMessage({ data: largeDataset });
});
worker.onmessage = (e) => updateUI(e.data);

// heavy.worker.js
self.onmessage = (e) => {
  const result = processHeavyData(e.data.data); // runs off main thread
  self.postMessage(result);
};
```

### Defer non-critical work after interaction

```js
button.addEventListener('click', async () => {
  // Critical: update UI immediately
  updateUI();

  // Non-critical: log analytics after browser has painted
  requestIdleCallback(() => {
    logAnalyticsEvent('button_clicked');
  });
});
```

### Use CSS `contain` to isolate rendering scope

```css
/* Prevents a component's layout/paint from affecting the whole page */
.card {
  contain: layout paint;
}

/* For components that don't affect outside layout */
.modal {
  contain: strict;
}
```

### Reduce DOM size (affects presentation delay)

Large DOMs (>1,400 nodes) increase rendering time after every interaction. Check with:
```js
document.querySelectorAll('*').length
```
Virtualise long lists with `react-window` or `react-virtual` instead of rendering all items.

### Use event delegation on large lists

```js
// BAD — one handler per item (thousands of listeners)
items.forEach(item => item.addEventListener('click', handler));

// GOOD — one handler on the parent
list.addEventListener('click', (e) => {
  const item = e.target.closest('[data-item]');
  if (item) handler(item);
});
```

---



**Preload LCP image** `[safe]`
```html
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
```

**Add fetchpriority to LCP `<img>`** `[safe]`
```html
<img src="/hero.webp" fetchpriority="high" alt="..." />
```

**Convert images to WebP/AVIF**
```bash
# Using sharp (Node)
const sharp = require('sharp');
sharp('input.jpg').webp({ quality: 80 }).toFile('output.webp');
```

**Add explicit width/height to images (prevents CLS too)** `[safe]`
```html
<img src="..." width="800" height="600" alt="..." />
```

**Lazy-load below-the-fold images** `[safe]`
```html
<img src="..." loading="lazy" alt="..." />
```

---

### TBT — Total Blocking Time (relates to long tasks)

**Code-split with dynamic import** `[verify]`
```js
// Before
import HeavyComponent from './HeavyComponent';

// After
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

**Defer non-critical scripts** `[safe]`
```html
<script src="analytics.js" defer></script>
```

**Move third-party scripts to be async**
```html
<script src="https://cdn.third-party.com/lib.js" async></script>
```

**Break up long tasks with scheduler**
```js
async function longTask(items) {
  for (const item of items) {
    process(item);
    await new Promise(resolve => setTimeout(resolve, 0)); // yield to main thread
  }
}
```

**Use web workers for heavy computation**
```js
const worker = new Worker('./heavy-computation.worker.js');
worker.postMessage({ data });
worker.onmessage = (e) => updateUI(e.data);
```

---

### CLS — Cumulative Layout Shift

**Reserve space for ads / embeds**
```css
.ad-container {
  min-height: 250px; /* matches ad unit height */
}
```

**Font display swap** `[safe]`
```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap; /* or optional */
}
```

**Preconnect to font origins**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

**Skeleton screens for dynamic content** `[verify]`
```jsx
{isLoading ? <Skeleton height={200} /> : <RealComponent />}
```

---

### Render-blocking resources

**Inline critical CSS** `[verify]`
```html
<style>
  /* critical above-the-fold styles only */
  body { margin: 0; font-family: sans-serif; }
</style>
<link rel="stylesheet" href="/main.css" media="print" onload="this.media='all'" />
```

**Preload critical fonts**
```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
```

---

### Unused JavaScript / CSS

**Remove unused CSS with PurgeCSS (Tailwind)**
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
}
```

**Tree-shake by using named imports** `[verify]`
```js
// Before (imports entire library)
import _ from 'lodash';

// After (tree-shakeable)
import debounce from 'lodash/debounce';
```

---

### Caching

**Add cache headers (Express example)**
```js
app.use('/static', express.static('public', {
  maxAge: '1y',
  immutable: true,
}));
```

**Next.js: cache API responses**
```js
export async function getStaticProps() {
  return { props: { data }, revalidate: 60 }; // ISR
}
```

---

## Accessibility

### Missing alt text
```html
<!-- Informative image -->
<img src="chart.png" alt="Bar chart showing Q3 revenue up 12%" />

<!-- Decorative image -->
<img src="decorative-border.png" alt="" role="presentation" />
```

### Missing form labels
```html
<!-- Option 1: explicit label -->
<label for="email">Email address</label>
<input id="email" type="email" />

<!-- Option 2: aria-label -->
<input type="search" aria-label="Search products" />
```

### Insufficient color contrast
- Use a contrast ratio of at least 4.5:1 for normal text, 3:1 for large text
- Tool: https://webaim.org/resources/contrastchecker/

### Missing ARIA on interactive elements
```html
<!-- Button without visible text -->
<button aria-label="Close dialog">✕</button>

<!-- Custom dropdown -->
<div role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="label">
```

### Focus management
```css
/* Never remove focus outlines without a replacement */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

### Skip navigation link
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<main id="main-content">...</main>
```

---

## Best Practices

### Missing HTTPS (dev environments)
Configure local SSL (mkcert) or note it's a dev-only issue.

### Deprecated APIs
Replace any deprecated Web APIs flagged by Lighthouse — check the specific audit item for the replacement.

### Console errors
Fix any JS errors visible in the console — Lighthouse flags these.

### No `rel="noopener"` on target="_blank" links
```html
<a href="https://external.com" target="_blank" rel="noopener noreferrer">Link</a>
```

---

## SEO

### Missing meta description
```html
<meta name="description" content="Concise, relevant page description (120–155 chars)" />
```

### Missing or duplicate `<title>`
```html
<title>Page Title — Site Name</title>
```

### Non-crawlable links
Use `<a href="...">` instead of `<button onclick>` for navigation.

### Missing `robots` meta
```html
<meta name="robots" content="index, follow" />
```

### Missing `hreflang` for multilingual sites
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
<link rel="alternate" hreflang="ro" href="https://example.com/ro/" />
```

### Structured data (JSON-LD)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title",
  "description": "Page description"
}
</script>
```

---

## Network & HTML Size

### Enable gzip / brotli compression

**Express**
```js
const compression = require('compression');
app.use(compression());
```

**Next.js** — enabled by default in production. For custom servers, add `compression` middleware.

**Nginx**
```nginx
gzip on;
gzip_types text/html text/css application/javascript application/json;
gzip_min_length 1000;
brotli on;
brotli_types text/html text/css application/javascript application/json;
```

---

### Reduce HTML document size

**Avoid inlining large JSON in HTML** (common with SSR hydration data):
```js
// Before — entire dataset serialized into HTML
const props = { products: allProducts }; // 500+ items

// After — paginate or lazy-load
const props = { products: allProducts.slice(0, 20), total: allProducts.length };
```

**Remove HTML comments in production builds** (Webpack/Vite usually handle this, but check):
```js
// vite.config.js
export default {
  build: { minify: true }
};
```

**Trim whitespace in server-rendered HTML** (Express):
```js
app.set('view options', { rmWhitespace: true });
```

---

### Reduce TTFB

**Add server-side caching (Redis example)**
```js
const cached = await redis.get(cacheKey);
if (cached) return res.send(cached);

const html = await renderPage();
await redis.setex(cacheKey, 60, html); // cache 60 seconds
res.send(html);
```

**Defer non-critical DB queries** — only fetch data needed for above-the-fold content on initial render.

**Use a CDN** — static assets and edge-cached pages dramatically reduce TTFB for end users.

**Next.js: prefer `getStaticProps` over `getServerSideProps`** when data doesn't need to be real-time.

---

### Reduce number of render-blocking `<script>` tags

Audit which scripts are truly needed on page load vs. can be deferred:

```html
<!-- Render-blocking (bad for TTFB/FCP) -->
<script src="/analytics.js"></script>

<!-- Non-blocking (good) -->
<script src="/analytics.js" defer></script>
<script src="/widget.js" async></script>
```

Consolidate multiple small scripts into a single bundled file to reduce HTTP round-trips.

---



### Image optimization — use `next/image` `[safe]`
```jsx
import Image from 'next/image';

// Before
<img src="/hero.jpg" alt="Hero" />

// After
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

### Font optimization — use `next/font` `[safe]`
```js
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
```

### Dynamic imports with SSR off (heavy client-only components) `[verify]`
```js
const HeavyChart = dynamic(() => import('../components/HeavyChart'), { ssr: false });
```

### Bundle analyzer
```bash
ANALYZE=true next build
```
Install with the project's package manager (detected from the lockfile): `<pm> add -D @next/bundle-analyzer`

---

## Next.js Config Catalog — Safe Optimizations `[safe]`

These `next.config.js` / `next.config.ts` settings are always safe to add or update. They do not change application behavior — only build output and asset delivery.

### optimizePackageImports

Prevents full-library bundling for packages that use barrel files. Add any icon library, UI component library, or utility library that re-exports from a central index.

```js
// next.config.js
experimental: {
  optimizePackageImports: [
    'lucide-react',        // icons
    '@heroicons/react',    // icons
    '@radix-ui/react-*',   // UI primitives
    '@headlessui/react',   // UI primitives
    'lodash',              // utilities
    'date-fns',            // date utilities
    'react-icons',         // icons (saves ~100KB+)
  ],
}
```
Typical savings: **50–200KB** depending on library count.

### compiler.removeConsole

Strips `console.log` statements from production bundles. Keeps error/warn for debugging.

```js
// next.config.js
compiler: {
  removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error', 'warn'] }
    : false,
}
```
Typical savings: **5–50KB** depending on console usage.

### Image format optimization

AVIF provides 60–80% size reduction over JPEG; WebP is the fallback for older browsers.

```js
// next.config.js
images: {
  formats: ['image/avif', 'image/webp'],
}
```

### compression

Enabled by default in Next.js production, but verify it hasn't been explicitly disabled:

```js
// next.config.js
compress: true, // default, but verify
```

### inlineCss (experimental)

Inlines critical CSS to eliminate render-blocking stylesheet requests. Improves FCP.

```js
// next.config.js
experimental: {
  inlineCss: true,
}
```
