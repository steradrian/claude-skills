---
name: design-to-code
description: Analyze a design (image, Figma, description) and build a production-ready component from it. Use when asked to "implement this design" or "turn this mockup into a component".
argument-hint: <design reference or description>
---

Analyze a design and build a production-ready component for: $ARGUMENTS

Chains multiple specialized agents in sequence: design analysis → spec → approval gate → build → accessibility audit → motion design (if applicable).

---

## Phase 1: Design Analysis

Read and analyze the design input (screenshot, description, or reference). Extract:

1. **Layout structure** — grid/flex, nesting, responsive breakpoints
2. **Color palette** — map every color to existing design tokens (read globals.css first)
3. **Typography** — heading levels, body text, captions, labels — map to Tailwind scale
4. **Spacing** — padding, margins, gaps — map to 4pt grid / Tailwind scale
5. **Interactive elements** — buttons, inputs, links, toggles — identify states (default, hover, active, disabled, focus)
6. **Component boundaries** — what is one component vs. multiple composed components
7. **Data requirements** — what props/data does each component need

Check the project's existing component library first — reuse before recreating.

---

## Phase 2: Design Spec

Produce a structured spec:

```
### Component: <Name>

**Responsibility**: one sentence

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|

**States**: default, loading, error, empty, [any others]

**Responsive behavior**:
- Mobile (375px): ...
- Tablet (768px): ...
- Desktop (1024px+): ...

**Token mapping**:
- Background: bg-card
- Text: text-foreground / text-muted-foreground
- Border: border-border
- etc.

**Animations** (if any):
- Entrance: ...
- Hover: ...
- State transitions: ...
```

Repeat for each component identified.

### ⛔ GATE — Design Spec Approval

Stop here. Present the design spec. Do NOT write code until the developer approves.

Wait for: "approved", "looks good", "proceed", or similar.
If changes are requested, update and re-present.

---

## Phase 3: Build

After approval, dispatch the `core:ui-component-builder` agent to implement the approved spec (or implement it here when the surface is a single small component). Either way the rules are:

1. Create each component following the approved spec
2. Use semantic tokens only — no hardcoded colors
3. Implement all states: default, loading, error, empty
4. Mobile-first responsive design
5. Dark mode support via token system
6. The TS hook will surface errors automatically — self-correct as they appear

**When build is complete, proceed immediately to Phase 4. Do not stop.**

---

## Phase 4: Accessibility Audit + Motion (Parallel Agents)

**Spawn agents in parallel in a single message:**

**`core:accessibility-auditor` — Accessibility Audit (always runs):**
- Task: Audit the built components for WCAG 2.1 AA compliance
- Files to audit: [list the component file paths]
- Checklist: color contrast 4.5:1 (light + dark), touch targets 44x44px, `aria-label` on icon-only buttons, visible focus rings, keyboard navigability, `prefers-reduced-motion`, semantic HTML
- Fix any issues found directly in the component files

**`core:ui-designer` — Motion Design (conditional — only if the design spec identified animations):**
- Task: Implement animations identified in the design spec
- For each animation: define intent (entrance, feedback, state change), specify duration/easing/properties (transform + opacity only for GPU compositing)
- Use Framer Motion or Tailwind transitions as appropriate
- Add `prefers-reduced-motion` fallback for every animation

If no animations were identified in the spec, skip `core:ui-designer` here and spawn only `core:accessibility-auditor`.

Wait for agent(s) to complete, then proceed to Phase 5.

---

## Phase 5: Quality Gate

**Mandatory and non-interactive. Execute it now without pausing.** Re-reading your own
code is not a gate — the gate is tool output plus independent reviewers.

### 5a — Static gate

Detect the package manager per `${CLAUDE_PLUGIN_ROOT}/references/package-manager.md`
(`<pm>` below). Run these in order and **paste each command's output into the
conversation** — last ~20 lines when green, the full failure when red:

1. **Typecheck** — first existing script among `typecheck`, `type-check`, `tsc`; else `<pm> exec tsc --noEmit`
2. **Lint** — first existing script among `lint`, `lint:check`, `biome:check`, `eslint`; skip if none
3. **Tests** — `<pm> exec vitest run` (or the `test` script when it wraps vitest)

Any failure: fix it, then re-run the whole gate from step 1. Do not proceed while any
step is red. Pre-existing failures in files you did not touch are reported, not fixed.

### 5b — Independent review

Dispatch both agents in parallel on the diff (`git diff HEAD`, or the merge-base diff
when the work spans commits), passing the changed file list and the approved spec:

- **`core:pr-reviewer`** — correctness, conventions, missing states, dead code
- **`core:ui-designer`** — token usage, hierarchy, spacing, dark mode, motion against the spec

Do not review your own diff in main context.

Handle findings: 🔴 — fix, then re-run 5a until none remain. 🟡 — fix when the change is
local to this diff, otherwise flag for developer decision. 🔵 — carry into the summary.

---

## Completion Summary

Report:
- Components created (with file paths)
- Token mapping used
- Static gate result — one line per command
- `core:accessibility-auditor`, `core:pr-reviewer` and `core:ui-designer` outcomes
- Animations added (if any)
- Any deviations from the approved spec (and why)
- Follow-up items from review (🟡 flagged, 🔵 carried)
