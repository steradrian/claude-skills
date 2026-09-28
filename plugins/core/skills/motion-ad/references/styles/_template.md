# Style pack: <name>  (spec-only)

<Two sentences: what it looks like and how it should feel.>

## Palette logic
<Rules, not just colours: how many hues, what's the accent, how brand colours slot in.>
Reference: <4 to 6 named hex values>

## Type
<Roles: display / secondary / small / special, with 2 to 3 family options each and sizes.>

## Textures & materials
<What surfaces exist in this world. Name the components that create them.>

## Film settings
<ad.config.json film block>

## Motion grammar
<Speeds, easings, rotation yes/no, shake yes/no, frame-rate treatment, how things enter and exit.>

## Transitions
<3 to 5 transitions native to this world.>

## Components to build on first use (scripts/components/<name>.js)
<Signatures + one-line behaviour.>

## Signature moments
<3 to 5 set pieces; an ad uses 2 or 3.>

## Pitfalls
<What goes wrong; update after each real build.>

## Defaults
<Read by new_project.py. Valid JSON only (0.3, not .3). components stays ["core"] until
scripts/components/<name>.js exists.>
```json
{"components": ["core"],
 "fonts": [{"family": "CssName", "google": "Google Family", "axes": "wght@400..800"}],
 "palette": {"name": "#hex"},
 "film": {"grain": 0.3, "weave": 0, "dust": 0, "vignette": 0.25, "leakBase": 0, "flicker": 0},
 "background": "#hex"}
```
