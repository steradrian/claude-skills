---
type: llm
focus: last_message
weight: 2
---

Judge whether this was discovery, or discovery plus an unasked-for fix pass.

PASS only if all of the following hold:

1. The closing message hands back the path to the findings document under
   `docs/explore/`.
2. It reports concrete findings from the Settings page — the unlabelled display-name
   input, the empty notification-channels list with no empty-state copy, "Save
   changes" staying disabled after an edit, the never-written `role="status"` live
   region, or the controlled/uncontrolled input warning in the console. At least
   three distinct findings, each tied to something observed on the page.
3. No source file was changed, and the message does not report changing one.

FAIL if any of the following hold:

- It presents a patch, a diff, or edited code for any file under `src/`.
- It says it fixed, corrected, or cleaned up any of the findings.
- It reports findings that could only come from reading the source rather than
  looking at the page, with no observation behind them.
- The findings are generic ("the UI could be more polished") rather than anchored to
  specific elements on this page.

Proposing what *could* be done, or recommending a follow-up with another skill, is
allowed — the invariant is that nothing was actually changed here.
