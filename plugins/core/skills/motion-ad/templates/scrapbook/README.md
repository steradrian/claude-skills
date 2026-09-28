# BearMenu · SCRAPBOOK template (collage + real photos)

One scenes.js, many reels. A reel is a list of beats in ad.config.json → "reel.beats".
Set "duration" to the sum of the beat durations (the scene logs a warning if they differ).

Presets included (each delivers a different kind of information):
  top5/ ranked countdown 14.7s · weekend/ plan across days 13.4s · secret/ insider places 12.6s ·
  tonight/ "what's on tonight" map 10.8s · budget/ dinner on a receipt 12.8s · thisorthat/ engagement rounds 11s · chat/ group-chat problem → answer 11s
Photos: assets/photo01.jpg … photo06.jpg (see each preset's "images"); empty slots show a marked placeholder.

## Beat types and fields
- hook       dur, bg, line (typed), word (ransom letters, auto-fit), mark: circle|strike|underline, write (handwritten after the mark),
             sticker (round sticker, <br> allowed), decor: [photo keys] (two polaroids at the frame edges)
- ranked     dur (~1.5), bg, n (rank; 1 gets the "NR. 1" stamp), photo, name (handwritten caption), tip (sticky note, <br>), meta (typed on tape)
- tickets    dur (~3.4), bg, title, note (handwritten after), items: [{day, date, title, meta, color, photo}]  (up to 3)
- note       dur (~2.6), bg, line, photo, caption, from, text (sticky-note message, <br>)
- polaroids  dur (~2.8), bg, line, items: [{photo, caption}]  (up to 4)
- map        dur (~3.6), bg, title (typed on tape), note (handwritten after), items: [{photo, label, x, y}] (up to 5; x/y in the
             980×1320 map sheet; list them in time order, the marker route follows the list)
- receipt    dur (~3.0), bg, title, date, items: [{name, price}] (up to 6), total, currency (default lei), footer, write (handwritten)
- versus     dur (~2.0), bg, q (typed question), a: {photo, caption}, b: {photo, caption}, pick: 'a'|'b' (optional tick)
- chat       dur (~3.4), bg, title, messages: [{text, me}] (up to ~5), answer: {photo, name, meta} (BearMenu card), write
- phone      dur (~2.2), bg, title, subtitle, sticker, marker (handwritten), items: [{photo, name, meta}]  (up to 5)
- end        dur (~2.6), bg, word (default BearMenu), tagline, stamp, cta (optional typed line)
Backgrounds (bg): paper · cream · kraft · news · amber · sage · accent · ink.   Theme colours: ad.config.json → "theme".

Rules baked in: pieces land on twos and boil slightly; camera drifts and punches in; no shake; torn-paper wipes between
beats (sheet colour = next beat's bg); flash frames on ranked cuts; all single-line text shrinks to fit after fonts load.

Rebuild/render (motion-ad skill):  S=~/.claude/skills/motion-ad/scripts
  python3 $S/build.py top5 && python3 $S/shoot.py top5 --sheet && python3 $S/render.py top5 --workers 3
Placeholders: venue names, tips, times and counts are illustrative; replace with real ones before posting.
