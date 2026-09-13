Page snapshot (accessibility tree) — http://localhost:4173/settings

```yaml
- document "Settings":
  - heading "Settings" [level=1] [ref=e1]
  - navigation [ref=e2]:
    - link "Profile" [ref=e3]
    - link "Notifications" [ref=e4]
    - link "Danger zone" [ref=e5]
  - main [ref=e6]:
    - heading "Display name" [level=2] [ref=e7]
    - textbox [ref=e8]                      # no accessible name, no <label>
      - value: "Ada"
    - heading "Notification channels" [level=2] [ref=e9]
    - list [ref=e10]                        # renders as an empty box, no copy
    - heading "Danger zone" [level=2] [ref=e11]
    - button "Delete workspace" [ref=e12]
    - button "Save changes" [ref=e13] [disabled]
  - status [ref=e14]:
    - text: ""
```

Notes surfaced by the snapshot:

- `textbox [ref=e8]` has no accessible name — no `<label>`, no `aria-label`.
- `list [ref=e10]` has zero children and no empty-state copy; it paints as a bare
  bordered box roughly 96px tall.
- `button "Save changes" [ref=e13]` is disabled even though the textbox value has
  been edited away from its persisted value ("Ada Lovelace" on the server).
- `status [ref=e14]` is a live region that is never written to, so nothing is
  announced after a save attempt.
- `button "Delete workspace" [ref=e12]` has no confirmation affordance in the tree.
