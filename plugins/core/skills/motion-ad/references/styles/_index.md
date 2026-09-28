# Style packs

| pack | one-liner for the user | maturity | best for |
|------|------------------------|----------|----------|
| `gritty-collage` | Torn paper, ransom type, grain, stamps, stop-motion. Raw and handmade. | **proven** (components + reference ad) | streetwear, sustainability, indie, music, food, anything with a "made by hand" story |
| `swiss-kinetic` | Strict grid, huge sans type, hard cuts on the beat, flat colour blocks. | spec-only | tech, design tools, events, bold statements, typographic ads |
| `premium-soft-light` | Soft gradients, glass, slow camera, light sweeps, restraint. | spec-only | beauty, fintech, hardware, premium apps (best with product photos) |
| `neon-nightlife` | Dark scenes, neon tubes, glow, chromatic flicker, punchy cuts. | spec-only | nightlife, gaming, events, energy drinks, casino/entertainment |
| `retro-vhs` | Tracking lines, RGB split, timecode, 90s type, CRT curvature. | spec-only | nostalgia, music, youth brands, ironic humour |
| `product-ui-kinetic` | Real app UI — cards, chips, maps, search bars — flying and stacking as the hero, no phone mockup. | spec-only | app ads, SaaS, screen-recording energy |
| `receipt-thermal` | Thermal receipts and tickets, mono type, perforations, printing-out motion. | **proven** (components + bearmenu ad) | food/order apps, restaurants, retail, deals, checkout-flavoured stories |
| `editorial-magazine` | Big serif cover lines, pull quotes, cropped photo boxes, page turns, folios. | spec-only | premium editorial, media, culture, longform brand stories |
| `risograph-print` | Two/three spot colours, overprint multiply, coarse grain, misregistration. | spec-only | indie, art, zines, print-flavoured launches |
| `chat-thread` | Messaging bubbles, typing indicators, reactions, notification cascades. | spec-only | social, messaging apps, community products |
| `hand-drawn-doodle` | Marker/pencil line animation, boiling lines, scribble fills, sticky notes. | spec-only | playful/indie brands, education, kids, notebook-flavoured stories |
| `y2k-chrome` | Chrome type, bubble shapes, noisy gradients, early-web UI windows, no sparkle clichés. | spec-only | nostalgia, gen-Z, gaming, playful tech |

**proven**: components exist in `scripts/components/`, a full ad was built and reviewed with it.
**spec-only**: the pack defines palette, type, textures, motion and transitions, but its
components don't exist yet. On first use, budget extra build time: build the components into
`scripts/components/<pack>.js`, then update the pack file with what worked and mark it proven.
Tell the user this when they choose one.

To add a new pack, copy `_template.md`.

## Inventing a new pack

When no existing pack fits a brief, the skill writes a new one before building anything: copy
`_template.md`, fill every section from the user's references (moodboard, competitor ads,
described aesthetic), and save it as `references/styles/<name>.md` marked spec-only with a
`## Defaults` block. Only then does scene-building start.

Packs are never brand-specific — a pack is adapted to the brand's colours at build time, not
authored around them. The palette logic in a pack file describes the *rules* (how many hues, what
carries the accent, how a brand colour slots in); the reference hex values are one worked example,
not a fixed requirement. The same pack should look right for two different brands with two
different colour sets.
