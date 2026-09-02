---
name: web-design-taste
description: Design or critique MARKETING and editorial pages — landing pages, portfolios, brand sites — against measured technique from award-calibre work. Use when asked to "design a landing page", "make this look designed", "why does this look AI-generated", "critique this marketing page", "pick a design direction", or when a page reads as generic/templated. NOT for dashboards or tool UI — use web-design-guidelines for those.
metadata:
  version: '1.1.0'
  benchmark: 'mariajoaoabrantes.work · sondaven.com · oryzo.ai · kriss.ai · silencio.es'
  adopted: 'github.com/leonxlnx/taste-skill (MIT) — design read, content tells, redesign protocol, pre-flight'
---

# Marketing Design Taste

Every number in this skill was measured from a live site with Playwright, not
recalled. Where a technique is attributed, the attribution is a measurement.

**Two kinds of claim live here, and they are labelled.** Anything with a count,
a ratio or a hex value came out of the benchmark study and is falsifiable — go
re-measure it. Anything marked **(adopted)** came from
[leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) (MIT) and is
convention rather than measurement: widely held, useful, unverified here. Do not
let the two blur — the measured half is the part of this skill you cannot get
anywhere else, and it loses its authority the moment an assertion is smuggled in
next to a number.

**Scope.** Marketing pages: landing pages, portfolios, brand and product sites.
For dashboards, admin and tool UI use `web-design-guidelines` instead — its
benchmark is Linear/Vercel/Raycast and its rules (card containment everywhere,
dense information design) are actively wrong here.

---

## Before generating: the design read (adopted)

Most bad output comes from jumping to a default aesthetic instead of reading the
room. Before any code, state the read in **one line**:

> *Reading this as: **\<page kind\>** for **\<audience\>**, with a **\<vibe\>**
> language, leaning toward **\<direction from the table below\>**.*

Read it from: the page kind (landing / portfolio / redesign / editorial), the
vibe words the user actually used, any references or URLs they linked, the
audience (a procurement panel and a design-conscious consumer want opposite
things), brand assets that already exist, and any quiet constraints —
accessibility-critical, regulated, trust-first. **Constraints override taste.**

If the read genuinely diverges, ask **exactly one** question — never a
multi-question dump — and only then. If it can be inferred, do not ask; declare
the read and proceed.

The audience picks the aesthetic, not your preference. See "When the audience is
not a design audience" near the end, which can invert most of this document.

---

## The core diagnosis

A page that reads as machine-made is almost never missing *effects*. It is
missing a **grammar**: the decision that a product looks like a product, a
testimonial looks like a testimonial, and a hero looks like nothing else on the
page.

The fastest way to confirm this on any page:

```
grep -o 'aspect-\[[^]]*\]' <blocks> | sort | uniq -c    # one ratio for every family?
grep -c 'hover:\|group-hover'  <blocks>                 # zero response to a cursor?
```

If one aspect ratio serves five content families, nothing on the page announces
what kind of thing the reader is looking at. That single repeated rectangle does
more damage than every missing animation combined.

---

## The measured rules

These recurred across all five benchmark sites. They are cheap, they are not
fashion, and they are most of the distance between amateur and set.

### 1. One typeface, or one plus a deliberate foreigner — 5/5 sites

Maria João: **one family across 1,184 elements**. Oryzo: one, plus a serif on
**34 elements**. Silencio: two weights of one face, plus PT Mono on **39**.
Nobody pairs a display face and a body face from different foundries.

The "foreigner" is scarcity, not variety: 34 elements out of 3,577.

### 2. Two or three colours, total — 5/5 sites

Sondaven ships a 37-screen site on **literally two hex values** (`#a89474`
sand, `#2c2824` bark). Silencio: black, off-white, and **pure red on exactly 4
elements**. Maria João: two greys plus two accents used on ~5 elements — and
the *muted* grey outnumbers the bright one (487 vs 456 elements).

### 3. Tracking polarity — 4/5 sites

**Negative on display, positive on small caps and eyebrows.** Sondaven
tokenises it: `-0.064em` on every heading, `+0.08em` on every body size, no
exceptions. Maria João: `-4.4px` display against `+0.96px` eyebrow.

Costs nothing. Has been true for eighty years.

### 4. Display:body ratio ≥ 4× — 5/5 sites

Measured: 4.4× · 14.4× · 7.6× · 4.3× · 11.7×. **There is no 2× jump anywhere in
the set.** If a heading scale tops out one step above body copy, the page has no
hierarchy regardless of how good the tokens are.

> **Known conflict, resolved deliberately.** The skill this document adopted
> from says the opposite — *"no oversized H1s that just scream; control
> hierarchy with weight and colour, not raw scale."* That is a common position
> and it is not what the benchmark does: every one of the five sites carries
> hierarchy on **scale**, and the smallest ratio in the set is still 4.3×. The
> measurement wins here. Their rule is a reasonable guard against a 96px
> headline on a page with nothing else going on — which is the *one-rupture*
> principle in different words, not a ceiling on the ratio.

### 5. Sub-1.0 line-height on display — 5/5 sites

0.90 · 0.83 · 0.90 · 0.97 · 0.90. Headlines are set as **blocks**, not as lines.
Free, and it is most of what separates a set headline from a typed one.

### 6. Elevation without shadow — 4/5 sites

Sondaven: **zero box-shadows**. Silencio: zero. Oryzo's four are glows, not
elevation. Maria João's four are all ≥16px blur at ≤0.18 alpha.

Depth comes from **ground-colour steps** — Maria João uses `rgb(20,20,20)`
against `rgb(28,28,28)`, a 3% luminance step — and from scale, not from drop
shadows.

### 7. The one-rupture principle

Maria João distorts **one word** of the headline through a canvas shader and
leaves every other word as plain text. Oryzo uses a serif on 34 elements.
Silencio uses red on 4.

Scarcity is what makes an accent read as intent rather than decoration. Budget
**one** loud moment per page and keep everything around it quiet.

### 8. Tokenised motion

Sondaven's is the most portable artefact in the study:

```css
--dur-s: 0.4s;  --dur-m: 0.6s;  --dur-l: 1.2s;
--ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);
--ease-out:    cubic-bezier(0.25, 1, 0.5, 1);
--ease-in:     cubic-bezier(0.5, 0, 0.75, 0);
```

Maria João's house curve is `cubic-bezier(0.16, 1, 0.3, 1)` — expo-out, the
same shape as Sondaven's `--ease-out`: **instant departure, long settle**. Two
independent studios converged on it. Use it as the default and stop picking
curves per component.

### 9. Fold as composition, not inventory

Maria João leaves **~55% of the fold empty** — nav at top, then nothing until
the eyebrow at y≈385. Every one of these sites decides *where the eye lands*
before deciding what to put there.

---

## Per-section questions

Run the universal gate first. A section failing it does not get to argue about
its own list.

### Universal gate

1. Does this look like a **different kind of thing** from the section above it,
   or the same rectangle with different words?
2. Strip all photography. Does the layout still hold on type and space alone?
3. Does anything here respond to a cursor or a finger?
4. Could a site builder produce this shape in two minutes?
5. Is this differentiating the **client's business**, or the designer's portfolio?

### Material gate

6. Does this section have a *material* — scrim, tint, texture, elevation — or is
   it flat colour with text on it?
7. Does the boundary between this section and the last do anything, or do two
   flat colours simply meet?
8. Is there any ambient motion — anything alive on a page nobody is touching?
9. Do the durations come from a scale, or were they picked one at a time?
10. Does scroll animation change how content **arrives**, or whether it
    **exists**? Only the first is allowed.

### Hero

- Does it establish a compositional rule the rest of the page obeys or
  deliberately breaks — or does every section start from zero?
- Is the headline sized by what the words need, or by the default display step?
- Is the hero's media a **different shape** from every other image on the page?
- The LCP element cannot animate. Does its frozen state still look art-directed?
- Is the negative space carrying intentional weight, or is it leftover margin?

### Testimonials

- Is the quote **an object** — card, border, ground — or paragraphs floating on
  the section background?
- Does a "large" variant earn its size with real photography and attribution, or
  is it a scaled-up grid card?
- Is there differentiation between quotes, or identical weight and length?

### Feature / benefits grid

- Are the cards visually distinct, or interchangeable — same icon size, same
  three-line copy, same height?
- Is there one item breaking the N-up rhythm as a deliberate anchor?
- Does copy length vary the way real content does, or has it been forced even?

### Product / catalogue

- Is the price typographically the commercial hook, or the same weight as a
  caption?
- Do prices use tabular figures so a column does not jitter?
- Does the product image share its shape with the hero image? It should not.

### Stats

- Is one number visually prioritised, or are all four sized identically?
- Is the unit subordinate to the figure, or the same size as it?

### Page as a whole

- Does spacing vary to create pacing, or is every band the same height?
- Do backgrounds follow a cadence, or a checkerboard?
- Is there exactly one loud moment, or is every section independently animating?
- Put two client sites side by side. Is the difference more than palette and
  font-family?

---

## Directions, not styles

A "modern" page is not one look. Five genuinely distinct composition logics —
distinct in *structure*, not palette. Pick one per client and commit.

| Direction | Thesis | Composition | Right for | Wrong for |
|---|---|---|---|---|
| **Broadsheet** | structure is the ornament | visible hairline column grid, unequal spans, never centred, borders do all separation, zero motion | clinics, law, notaries, accountants | atmosphere-led hospitality — reads as a document, not a place |
| **Cinema** | the photograph is the ground | full-viewport panels, a caption slot that persists while imagery changes behind it | guesthouses, restaurants, venues | anything with a price list — the caption slot cannot hold it |
| **Specimen** | the object, catalogued | one artefact at absurd scale with annotation, then a rigid grid where repetition IS the composition | roasteries, bakeries, workshops | pure services with no artefact |
| **Constellation** | depth as atmosphere | cards escape the grid and overlap on z, focal plane plus defocused planes | bars, nightlife, creative studios | trust-critical — floating things read as unserious to someone choosing a dentist |
| **Diptych** | the viewport is divided, not stacked | hard split panels each carrying **its own ground**, one pinned while the other scrolls, the seam is the spine | barbershops, tattoo studios, gyms | content that cannot split into a stable/advancing pair |

Two directions that produce the same layout in different colours are **one**
direction.

---

## Anti-patterns

### The generated tells

Centred-everything with no asymmetry anywhere — the single strongest tell.
Icon-in-a-tinted-rounded-square as the default decoration. Uniform 3-up grids
with identically-lengthed copy in every card (real content is uneven; forcing it
even is the tell). Gradient text on headlines. Mesh/blob backgrounds behind hero
copy. Every section fading up at identical distance and duration — that is one
unmodified library preset, not art direction. Verb-noun button copy
("Get Started Today") with no product-specific language.

### The content tells (adopted)

The layout tells above are only half of it. A page can pass every measured rule
and still read as generated, because the *words and data in it* are generated.
This is the fastest tell for a non-designer, and the benchmark study never
covered it — it measured rendered CSS, not copy.

- **Placeholder people.** "John Doe", "Sarah Chan", "Jane Doe". Use realistic,
  locale-appropriate names. A Cluj restaurant's testimonials are not from Jack.
- **Placeholder avatars.** SVG eggs, a Lucide user glyph in a tinted circle.
- **Fake-perfect numbers.** `99.99%`, `50%`, `10,000+`, `1234567`. Real data is
  messy: `47.2%`, `1 in 9`, `+40 264 …`. A round number reads as an estimate,
  which is the opposite of the trust a stat is there to buy.
- **Startup-slop brand names.** Acme, Nexus, SmartFlow, Cloudly, Lumina.
- **Filler verbs.** Elevate, Seamless, Unleash, Empower, Revolutionize,
  Next-Gen. Concrete verbs only — what does the thing actually do.
- **Verb-noun CTA copy** with no product in it ("Get Started Today").
- **Duplicate CTA intent** — "Get in touch" and "Let's talk" on one page.
- **Em-dashes in rendered page copy.** Headlines, eyebrows, buttons, captions,
  alt text. The single most recognisable LLM signature in body copy right now.
  (Prose *about* the work — this document, a commit message — is unaffected.)
- **Fake product screenshots built from `<div>`s.** Use a real image, a real
  render, or leave a declared placeholder slot. A drawn approximation of a UI
  reads as a drawn approximation of a UI.
- **Section-number eyebrows** — `00 / INDEX`, `001 · Capabilities`,
  `06 · how it works`. An eyebrow names a topic; it does not enumerate.
- **Version labels in a hero** — `V0.6`, `BETA`, `EARLY ACCESS` — unless the
  brief is literally about launch status.
- **Scroll cues** — `Scroll`, `↓ scroll to explore`. The scrollbar already said
  it.

### Dated, with a short half-life

Preloaders as theatre. Gated entry ("CLICK TO ENTER"). Vertical rotated edge
labels. Hairline weights at display size. WebGL dithering / ASCII-fication — the
chromatic aberration of 2025. Magnetic buttons, cursor blobs, tilt-on-hover 3D
cards. Glassmorphism as the *default card material*.

### Glass and gradients — the nuance

Do not ban these; ban the bad version.

Measured on a well-executed reference: `backdrop-filter` appears **exactly
once**, on a floating nav pill. Gradients are not decorative — they do four
working jobs: **two-stop fills**, **image scrims for legibility**, **rules that
fade at both ends**, and **section-to-section handoffs**.

Glass on floating chrome: yes. Glass as the material every card is made of: no.

---

## When the audience is not a design audience

The benchmark sites are for people who arrived already willing to be impressed.
A local business — restaurant, guesthouse, clinic, barbershop — has a visitor
who is often 55+, on a mid-range Android, on patchy mobile data, whose
conversion action is **a phone call**.

Measured page weights, before any scroll:

| Site | Payload | Requests | Time to stable fold |
|---|---|---|---|
| mariajoaoabrantes.work | **0.05 MB** | 26 | immediate |
| silencio.es | 2.92 MB | 64 | after entry gate |
| oryzo.ai | 22.19 MB | 184 | ~19 s |
| sondaven.com | 27.16 MB | 250 | ~20 s |
| kriss.ai | 29.12 MB | 41 | — |

**Maria João is the only defensible reference for this brief.** 0.05 MB at boot,
with 6 MB of video deferred until asked for.

Specifically wrong to copy:

1. **Preloaders and entry gates.** ~20 s to a stable fold on desktop fibre is
   60 s+ on mid-range Android over 4G. The phone number must be in the **first
   paint**.
2. **20–30 MB payloads.** Real money on a metered plan, for a visitor who wanted
   an address.
3. **Canvas/WebGL as the primary surface.** Content inside a canvas is invisible
   to a screen reader and unselectable by someone trying to copy the address. If
   the content is in the canvas, the content does not exist.
4. **Replacing scroll with a camera or virtual scroller.** Defeats the OS
   scrollbar — the only "how much is left?" signal there is.
5. **Display type at 88–216px with `line-height: 0.83` and `letter-spacing:
   -0.064em`.** Tight tracking plus hairline weight plus low contrast is a
   legibility failure for presbyopic eyes. Here: **~1.15 line-height, tracking at
   0 or slightly positive, weight 500+**.
6. **Muted grey as the dominant body colour.** ~5.2:1 passes AA and is still a
   hard read at 55+ in daylight on a phone.
7. **Mystery.** A guesthouse must answer *where, when, how much, call this
   number* above the fold. Withholding is a luxury of businesses whose visitors
   already decided to be impressed.
8. **Ambient infinite animation.** Up to 4 concurrent on these sites. Keeps the
   compositor awake, drains battery, and is a vestibular trigger for some.
   **None of the five gated a single animation behind `prefers-reduced-motion`.**
9. **Heavy `backdrop-filter: blur(20px)`.** Expensive on mid-range Mali/Adreno,
   and it reduces the contrast of whatever sits on it — wrong trade when that
   text is a phone number.
10. **A 36–63-screen page.** The local-business equivalent is **3–5 screens**
    with the call action repeated.

What *does* transfer: one family, two grounds, accents used five times,
expo-out easing at 0.5 s, CSS-only motion with at most one infinite animation,
lazy muted video that never autoplays, and every rule in "The measured rules"
applied at **sane sizes** — headline 36–44px, body 18px, 1.15 display leading,
1.6 body leading.

---

## Redesigns (adopted)

Most work is not greenfield, and misclassifying the mode is the biggest source
of bad redesign output.

**Detect the mode first.** *Preserve* — modernise without breaking the brand.
*Overhaul* — new visual language over existing content and IA. *Greenfield* —
the brand itself is changing. If ambiguous, ask once: "should this preserve the
existing brand, or start visually from scratch?"

**Audit before touching anything.** Write down the brand tokens actually in use,
the information architecture, which content blocks are doing work and which are
filler, the signature patterns worth keeping, and the SEO baseline — ranking
pages, titles, structured data. *SEO migration is the number-one redesign risk*,
and it is invisible in a screenshot.

**Never change silently:** URL structure and slugs, anchor IDs, primary nav
labels, form field names and order (breaks analytics and autofill), the logo,
and legal/consent copy. Preserve copy voice unless a rewrite was asked for —
visual modernisation is not a content rewrite. Do not regress an existing
accessibility win.

**Modernisation levers, in order of lift per unit of risk.** Stop as soon as the
brief is satisfied: typography → spacing and rhythm → colour recalibration →
motion layer → hero recomposition → full block replacement. If the IA, content
and SEO are sound, the first four get most of the value at a fraction of the
risk. Reach for a full redesign only when the visual debt is structural.

---

## Pre-flight

Before delivering, every box. This is deliberately shorter than the checklist it
came from — each box below is enforceable against something in this document,
and boxes that encoded one person's taste (banned individual typefaces, specific
animation libraries, icon-vendor policy) were dropped rather than inherited.

- [ ] Design read declared in one line, and the direction named?
- [ ] One typeface, or one plus a scarce foreigner? Two or three colours total?
- [ ] Display:body ratio ≥ 4×, display line-height < 1.0, tracking polarity
      applied (negative on display, positive on eyebrows)?
- [ ] Exactly **one** rupture on the page — one loud moment, everything else
      quiet?
- [ ] Motion durations and easing from tokens, not picked per component? Every
      animation justifiable in one sentence?
- [ ] Anything gated behind `prefers-reduced-motion` that needs to be? (None of
      the five benchmark sites did this. Do not inherit that.)
- [ ] Does each section read as a **different kind of thing** from the one above
      it — at least four layout families across eight sections?
- [ ] Strip the photography: does the page still hold on type and space?
- [ ] Content tells swept — names, numbers, brand names, filler verbs,
      em-dashes in rendered copy, duplicate CTA intent?
- [ ] For a redesign: mode declared, audit done, nothing on the never-change
      list touched?
- [ ] Audience check: is this visitor 55+ on mid-range Android over 4G? If so,
      the whole "not a design audience" section applies and most of the above
      inverts.

---

## How to use this skill

**Designing:** pick a direction from the table, commit to it structurally, then
apply the measured rules. Budget one rupture. Write the motion tokens before the
first animation.

**Critiquing:** run the universal gate, then the material gate, then the
per-section questions. Report as `file:line — [CATEGORY] issue`, severity
ordered. Cite a measured rule for each finding rather than an adjective —
"display:body is 2.1×, the benchmark floor is 4×" beats "hierarchy feels weak".

**Always ask who the visitor is before applying any of it.** The entire
"when the audience is not a design audience" section can invert the advice.
