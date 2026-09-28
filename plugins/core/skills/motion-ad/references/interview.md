# Intake

Everything the ad needs is asked **once, before any work**: up to four `AskUserQuestion` calls back
to back (max 4 questions each), then at most one text message for file paths, hex codes or exact
copy. After that the skill runs to the end without asking anything (see SKILL.md, Phase 7 is the
only other conversation).

Before the first call, send one line: "A few questions up front, then I'll run the whole thing and
show you the cut."

## Skip what you already know

1. **The first message.** Anything the user already said is locked; don't ask it again.
2. **The brand file.** If `ads/_brand.md` exists in the working directory, read it first. It
   answers brand, audience, logo, brand kit, claim rules, hard no's and voice. Ask only what it
   leaves open, and never ask a question whose answer contradicts it.
3. **Fill the freed slots** with the next open question rather than asking fewer; if everything is
   known after two calls, stop at two.

Option descriptions say what choosing it means **for the ad**, not what the word means. Recommended
option first, label ending in " (Recommended)". No "Something else" option (Other is built in).

---

## Call 1 · The ad

1. **header: "Brand"**, "What are we making an ad for?" (skip when `_brand.md` exists)
   - Real brand or product: "Your name, assets and real claims only."
   - My own product or startup: "Same, and we can shape the positioning together."
   - Fictional brand (showcase): "I invent the brand, copy and claims. Fastest portfolio piece."
2. **header: "Offer"**, "What is this ad selling?"
   - A physical product: "The product becomes the hero object; needs photos or an illustrated build."
   - An app or digital product: "UI, flows and outcomes become the visuals."
   - An event, drop or launch: "A date and a call to action drive the ending."
   - A brand or feeling: "No single product; the ad sells an attitude."
   For a brand file with campaigns or ideas listed, offer those instead (up to 4), recommended first.
3. **header: "Goal"**, "What should a viewer do or feel afterwards?"
   - Remember the name: "Logo and name repeat; the end card holds longer."
   - Act now: "Offer, date or link on screen; urgency in pacing."
   - Understand one idea: "One message told through a clear before/after."
   - Share it: "Built around one surprising visual moment worth a repost."
4. **header: "Audience"**: 3 plausible audiences inferred from context. Use their words in copy.

## Call 2 · Format & sound

1. **header: "Platform"**
   - Reels / TikTok / Shorts (9:16) (Recommended for social): "1080x1920, text kept out of the UI zones."
   - Feed post (4:5): "1080x1350, reads well muted in a scroll."
   - Square (1:1): "Works everywhere, least immersive."
   - YouTube / web / deck (16:9): "Landscape, room for wider compositions."
2. **header: "Length"**
   - 15 seconds (Recommended): "A hook, a turn and an end card."
   - 6 seconds: "Bumper. One idea, one hit, logo."
   - 30 seconds: "Room for a story; needs a stronger concept."
3. **header: "Ending"** (→ `new_project.py --ending`)
   - Loop seamlessly: "The last frame flows into the first; best for Reels autoplay."
   - Hard end card: "Fades in, holds logo and CTA 2 to 3 seconds, fades out."
4. **header: "Sound"**
   - Silent-first (Recommended): "Works muted, which is how most social video is watched."
   - I have a music track: "Cuts land on its beats; I'll ask for the file and BPM or beat times."
   - Music later: "Sound cues marked in the storyboard for an editor."

## Call 3 · Look

1. **header: "Style"**: the 3 packs from `styles/_index.md` that best fit what you've heard, each
   with its one-liner and maturity, best fit first. The 4th option is always
   **"Invent a new style"**: "Describe or link references; I write a new pack before building."
   If the user named a look in their first message, confirm it instead and ask about intensity.
2. **header: "Energy"**
   - Punchy: "Fast cuts, slams, camera shake, 8 to 12 beats in 15s."
   - Confident: "Fewer, bigger moves; holds on the hero."
   - Playful: "Bouncy easing, surprises, humour in the copy."
   - Moody: "Slow reveals, atmosphere, restraint."
3. **header: "Visuals"**, "How should the product appear?"
   - Illustrate it in code: "Stylised, fits graphic styles; not photoreal."
   - Type-only: "No product image; the words do the work. Often the boldest."
   - UI recreated in code: "For apps: real screens rebuilt as animatable layers."
   - My photos (cut-outs): "Most realistic; composited into the style."
4. **header: "Concept"**
   - You pick it (Recommended): "I write three concepts, a critic and I choose, runners-up shown at the end."
   - I choose from three: "One extra stop after concepting, before any build."

## Call 4 · Only if still open (brand, assets, claims)

1. **header: "Logo"**: I have an SVG / I have a PNG / Make a wordmark.
2. **header: "Brand kit"**: Use my colours and fonts / Pick for me / Colours yes, fonts pick.
3. **header: "Claims"**: I'll give exact copy / Draft it, mark [CLAIM] until I confirm / (fictional only) Invent it.
4. **header: "Hard no's"** (multiSelect): 4 common ones, e.g. "No stock-looking gradients",
   "No fake stats", "No dark backgrounds", "No chat-bubble clichés".

Then one text message for what the answers require: file paths (copy them into
`<project>/assets/` and `fonts/`), hex codes, exact copy, track + beats, reference links.

For a music track you don't need their BPM: run `scripts/beats.py <file> --duration <s>` (pass
`--from/--to` around the middle for long mixes) and use its offset and beats. If the track is a
commercial recording, say once that it is a scratch track and that the delivery includes a
version without it; don't ask for permission.

## After the intake

Write `brief.md` and post a 6 to 8 line summary of it as a message (not a question), ending with
"Starting now." Then go. If a later step truly cannot proceed without the user (a missing file, a
claim for a real brand with no source), stop and ask only that; everything else is your call.
