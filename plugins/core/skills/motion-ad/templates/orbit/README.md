# BearMenu · ORBIT (12s, 9:16, 120 BPM beat grid)

Photos: drop your Unsplash images into assets/ as photo01.jpg … photo08.jpg (jpg/png/webp, ~1500px long edge)
and rebuild. Missing files show a marked placeholder in that dish's colour.
  photo01 Spritz · photo02 Ramen · photo03 Paste cu trufe (THE HERO: fly-through, full screen, app detail)
  photo04 Tiramisu matcha · photo05 Sushi · photo06 Vin natural · photo07 Smash burger · photo08 Brunch
Dish names, meta lines and colours (the gradient takes each dish's colour): DISHES at the top of scenes.js.
Change HERO to pick which card the carousel lands on.

Timeline: 0-1.5 phone spins in + "Ce mănânci diseară?" · 1.5-6.5 cards burst into a 3D ring that accelerates ·
6.5 snap · 7-8.5 fly into the card, "Asta. Diseară." · 8.5-10 pull back into the app, chips float, Save tapped ·
10.2-12 phone spins away, lockup, loops.

Rebuild / render (motion-ad skill):
  S=~/.claude/skills/motion-ad/scripts
  python3 $S/build.py . && python3 $S/shoot.py . --sheet && python3 $S/render.py . --workers 3
