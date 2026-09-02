# Steps 5, 7, 8 — Accessibility, Tailwind, Performance

## Step 5 — Accessibility (changed JSX only)

Only flag issues in **new or modified JSX**. Do not audit unchanged code.

**ARIA:**
- Icon-only buttons → `aria-label`; toggle buttons → `aria-pressed`; expanding buttons → `aria-expanded` + `aria-controls`
- Dialogs → `role="dialog"` or `<dialog>`, `aria-labelledby`, `aria-modal="true"`
- Tabs → `role="tablist"` container, `role="tab"` + `aria-selected` per tab, `role="tabpanel"` + `aria-labelledby`
- Form inputs → `<label htmlFor>` or `aria-label` (placeholder alone is insufficient); required → `aria-required="true"`; invalid → `aria-invalid="true"` + `aria-describedby`

**Semantic HTML:**
- `<div onClick>` → `<button>` (or `role="button"` + `tabIndex={0}` + keyboard handler); `<span onClick>` for nav → `<a href>`
- `<div>` as nav/header/footer/main → semantic elements; heading level skipping (h1 → h3 with no h2); `<a>` without `href`
- **Missing `type="button"`**: `<button>` defaults to `type="submit"`, triggering form submission inside `<form>`. Every non-submit `<button onClick>` needs `type="button"` — scan all buttons performing navigation, toggling, or non-submit actions.

**Images:**
- Every `<img>`/`<Image>` needs `alt`; decorative → `alt=""`; SVGs → `role="img"` + `aria-labelledby` pointing to `<title>`, or `aria-hidden="true"` for decorative

**Focus & keyboard:**
- Modals must trap focus (Tab/Shift+Tab cycle within); close must restore focus to trigger; `tabIndex > 0` disrupts tab order; interactive elements must be keyboard-reachable; custom interactive elements need `:focus-visible` styling
- **Keyboard shortcuts**: (1) `event.key` is case-sensitive — use `.toLowerCase()` or `event.code`; (2) missing `event.preventDefault()` — browser intercepts Ctrl+K etc.; (3) `metaKey` only works on macOS — use `(metaKey || ctrlKey)`; (4) missing `event.repeat` guard — held keys fire continuously

**Screen reader:**
- `aria-live` regions conditionally rendered — must be always-mounted: `<div aria-live="polite">{message || ''}</div>`
- `aria-hidden="true"` on focusable elements; loading states missing `aria-busy="true"`

## Step 7 — Tailwind CSS (changed files only)

- **Class conflicts**: adjacent conflicting classes (`px-2 px-4`) without `cn()`. Components accepting `className` must merge via `cn()` from `src/utils/style.ts`
- **Dynamic classes**: never template literals (`bg-${color}-500` breaks purging) — use `cn()` with complete literal strings
- **Repeated arbitrary values**: `w-[347px]` appearing 2+ times → add to theme config. Arbitrary colors (`text-[#1DA1F2]`) → design tokens
- **Design tokens**: flag raw color values — use semantic tokens via CSS custom properties
- **Responsive direction**: flag desktop-first `max-*` — enforce mobile-first with `md:`/`lg:`
- **Component extraction**: class strings repeated 3+ times across files → shared component

Note: class ordering enforced by Biome `useSortedClasses` — do not flag.

## Step 8 — Performance & Core Web Vitals (changed files only)

**LCP:** Hero `<Image>` missing `priority`; render-blocking fetches without `<Suspense>` streaming; fonts without `display: 'swap'`/`'optional'`; `strategy="beforeInteractive"` on non-critical `<Script>`

**CLS:** `<Image>` without dimensions (`width`/`height` or `fill` + sized parent); dynamically injected content above existing content without reserved space; iframe/embed without set dimensions

**INP:** Heavy computation in event handlers — use `startTransition` or Web Workers; `use client` on large trees (excess hydration); missing `React.memo` on expensive children; sync state updates that should use `useTransition`

**Bundle size:** Barrel imports from large libs not in `optimizePackageImports` (check `next.config.ts` first); `moment.js`/full `lodash` → `date-fns`/`lodash-es`; heavy libs in Client Components → Server Components or `next/dynamic`

**Dynamic imports:** Conditionally rendered heavy components without `next/dynamic`; modal/dialog/drawer content should always be dynamic; `ssr: false` on components that could benefit from SSR

**Third-party scripts:** Analytics without `strategy="afterInteractive"`; chat/embeds without `strategy="lazyOnload"`
