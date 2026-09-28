# App-ad playbook

Read for any ad that sells an app. Researched 2026-09-28 (sources inline); the rules below are what
made two rounds of blind judging move, and their absence is what made the first attempts fail.

## Structure that works

Hook (0-1.5s, stakes, caption readable at frame 0) → the app on screen by ~3s doing the ownable
thing → 2-3 big single-phone beats that NAME what else it does → an end line that says what the
viewer will know or get. The narration alone must tell the whole story (concepting.md "Narration").
TikTok: 63% of the highest-CTR ads put the key message or product in the first 3s; ~90% of recall
impact is in the first 6s (ads.tiktok.com/business/en-US/blog/creative-best-practices-top-performing-ads).
Attention decays after ~4s; the scenario must be blatantly clear by 2s (appagent.com, "Hooked").

## Hooks (pick one per variant; ship 3-5 openers on the same body)

| pattern | example / note | source |
|---|---|---|
| Action without setup | open on the payoff shot, the product already doing its thing | appagent.com |
| Contrarian claim to check | "4.6 stars. Soggy pizza." challenges what the viewer believes | motionapp.com hook tactics |
| Warning / don't | "Don't order the Margherita yet." loss aversion, reads honest | motionapp.com, restaurant TikTok formats |
| Value promise | say the benefit outright: "Know what to order before you sit down." | Meta Reels hook types (socialmediatoday) |
| Question the viewer feels | about THEIR decision, never a stock "Where tonight?" | Meta; motionapp.com hook-analysis |
| Problem callout | "Stars don't tell you what to order." | leapwave.ai |
| Audience / city call-out | "Cluj, stop ordering blind." self-relevance filter | heyorca.com, motionapp.com |
| POV | "POV: the waiter's here and you haven't read the menu." native, viewer is the protagonist | zeely.ai |
| Demo-first | "Watch the reviews pick your dish." one uninterrupted real interaction | zeely.ai, Demand Curve |
| Occasion | "Find the perfect spot for your birthday." (OpenTable paid social) | motionapp.com/library/opentable |
| Honest brand voice | Uber Eats "almost, almost anything" | campaignbrief.com |
| Listicle frame | Beli's "Top 10 places for X" drives its growth | readsnapshots.com (Beli) |

Hook don'ts: logo or splash first; fade from black or silence; captions that arrive after the hook;
setup before payoff; stakes-free openers; counts without meaning ("24 people wrote about this
plate"); ad-speak ("Meet the revolutionary"); a TV gloss on second one (71% of TikTok users prefer
posts that don't feel too polished); one hook only (test 3-5).

## Film craft (the "world-class" part)

- **The camera moves through the real product, one action at a time.** No stock footage, no
  abstract 3D shapes (Linear's launch films; getlago.com "we killed our motion design job").
- **Design the boundary between beats**: something on screen survives into the next beat (the
  photo becomes the page hero, a card grows into a page, a FAB opens into the chat). Beats that
  only replace each other fail. Spatial continuity: the transition itself explains the feature
  (Apple HIG Motion).
- **Wide start → readable pause → closer proof.** One primary device move per beat, one
  supporting move. "The device is not the story": tilts under ~12°, no constant spinning, one flip
  per ad at most (applaunchflow.com).
- **Easing**: fast in, long settle, 5-8% overshoot max, motion blur on moves under ~250ms; never
  linear keyframes; scale from the tapped element or an edge, not the frame centre.
- **Rack focus / shallow depth** on UI layers to direct the eye; 2.5D parallax planes (photo,
  device, sheet, caption).
- **Micro-kinematics**: a small spring confirms each tap (Arc).
- **Every frame works as a still** (Duolingo's 5s Super Bowl ad: each frame screengrab-able).
- **Sound follows motion**: the whoosh leads the move and peaks at its fastest point; clicks only
  when something stops; the biggest cue on the biggest move; still works muted.
- **Beat grid**: cuts, lands and taps on downbeats.
- **Current platform material**: translucent floating chrome (Liquid Glass) over flat boxes.
- Text: 5-10 words per second at most; captions from frame 0 (+12% watch time, Meta).

Craft don'ts: walls of tiny phones; zooming past legibility (capture at 3x); glitch/flare/type-slam
"dynamic app promo" templates; the same whoosh on every cut; fake UI that doesn't match the app;
behaviour the product doesn't reliably do; emojis, cartoon cursors, AI-sparkle icons, neon blobs.

## Safe zones for PAID Reels

Meta Reels ads cover roughly the top 270px and the bottom ~670px of 1080x1920 (likes, caption,
CTA button). Organic posts are closer to 220 / 400. Set `safe_zone` in ad.config.json accordingly;
key text and the key UI moment stay out of both bands (billo.app/blog/meta-ads-safe-zones).

## Real screens of your own app (the capture kit)

1. **Fictional data layer.** Point the app at a mock API (a small server that serves the app's
   real response shapes filled with invented venues, people and copy, plus stock photos). Never
   capture real customers or businesses the brand hasn't cleared. bearmenu's lives in
   `fe/ads/_mock/` (server.mjs, build-fixtures.mjs) as the worked example.
2. **Run the app** against it on a spare port, forcing the theme and suppressing banners.
3. **`scripts/capture.py <project>`** with a `capture.json`: states (url + actions: click, type,
   scroll_to, wait...) and the elements to cut out (selectors). It writes full frames at the
   notch-safe viewport (390 x 751 @3x), element crops clipped from the same frame with rounded
   corners masked, per-line crops of wrapped highlights, and `boxes.json`.
4. **Animate with `device.js`**: pages on the phone's screen, elements lifted out with
   `lift(ph, src, box)` using the boxes as they are.

End cards: no CTA shaped like a button baked into the video (it can't be tapped and reads as
fake); the platform supplies the real button. Set the URL as plain type.

## How to use this with the pipeline

Scripts are judged blind by three lenses (world-class ECD, performance buyer, viewer panel) on hook,
clarity, sells-the-app, craft, modern, honesty; a script ships to the user only at ≥ 8 average, or
with an honest note of where it plateaued. Revisions by the same writer plateau around 7; when they
do, a fresh writer given the full critique history beats another revision.
