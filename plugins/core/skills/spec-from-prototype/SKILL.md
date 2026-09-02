---
name: spec-from-prototype
description: >
  Take a prototype description (path, link, screenshot, or free-text
  pitch) and produce a complete product spec end-to-end: narrative,
  user flows, roadmap, tickets, and an explicit Assumptions Register.
  Runs the product-manager agent for a first draft, then three critic
  agents in parallel (UX, engineering, business), then a second
  product-manager pass to reconcile feedback. The agent makes every
  judgment call itself — it does NOT ask the user questions during
  the run. Every ambiguity becomes a numbered assumption the user
  reviews at the end. Triggered by `/core:spec-from-prototype <input>` or
  natural language: "build a spec from this prototype", "turn this
  pitch into tickets", "PO this prototype end-to-end".
argument-hint: <prototype path, URL, screenshot or pitch>
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent, WebFetch
---

# Spec from prototype

Input: $ARGUMENTS

Autonomous product-spec generator. Reads a prototype (any form), drafts
the full spec + ticket list, runs a parallel critique panel, reconciles
feedback, and writes everything to disk for the user to review.

The Assumptions Register is the load-bearing artifact: every judgment
call the agent had to make appears as a numbered, override-able entry.
The user reviews that first — if any assumption is wrong, the affected
tickets are explicitly flagged.

## When to use

- New product or major feature prototype that needs to become buildable.
- A founder-style pitch ("here's the idea, build the roadmap").
- A Figma / screenshot / sketch that needs to be turned into tickets.
- Anything where you want a thorough PO pass without playing 20 questions.

## When NOT to use

- A single ticket or bug → use the `core:product-manager` agent directly.
- A spec that already exists and just needs revision → use `core:product-manager`
  with the existing doc as input.
- Architecture decisions for already-scoped work → use `/core:build --arch`.

## Strict invariants

1. **Never ask the user a question during the run.** Every ambiguity
   becomes an assumption in the Assumptions Register. The user reviews
   the register at the end; that is their input surface.
2. **Critic panel runs in parallel.** Three critics, one message,
   three Agent calls in the same block. Sequential critique is slower
   AND lets earlier critic output bias later critics.
3. **Critics find gaps, do not rewrite.** Each critic returns findings
   with severity + suggested change. They do not produce a new spec.
   The reconciliation pass is owned by the product-manager agent.
4. **Reconciliation is honest.** When the PO rejects a P0 finding,
   it must say so in `06-critique-log.md` with the reason. No silent
   overrides.
5. **All artifacts written to disk.** Conversation output is a summary
   pointer. The spec lives in `docs/specs/<feature-slug>/`.
6. **Don't commit.** Per global CLAUDE.md, only the user runs commits.
   End with "ready for review" and the path to the spec directory.

## Required prerequisites

1. **Input identified.** One of:
   - Markdown / text file path
   - URL (Figma, Notion, doc, blog post) — use WebFetch
   - Image / screenshot path — Read can ingest
   - Inline free-text pitch
   - A directory of prototype code → read structure and key files
2. **Feature slug decided.** Lowercased kebab-case. The PO agent picks
   this from the prototype content in phase 1; no need to ask.
3. **Target output directory.** Default `docs/specs/<feature-slug>/`.
   Override only if the user said where in their prompt.

## Phases

### Phase 0 — Intake (host, silent)

The host (you) reads the input. Build initial mental model:
- Domain / industry
- Target user(s) (best guess)
- Core value proposition
- What's explicit in the prototype vs implied
- What's the smallest thing that could ship (rough MVP guess)

Do NOT write anything yet. This phase is context-building only.
If the input is a URL, fetch it. If it's an image, read it. If it's
a directory, glob the key files.

Pick the feature slug now (kebab-case, ≤ 4 words). Write it down.

### Phase 1 — Draft spec (product-manager agent, foreground)

Spawn `core:product-manager` with a self-contained prompt. The agent's
default behavior is to flag ambiguities as open questions — **override
that** in the prompt: in this skill, ambiguities become assumptions.

Required prompt structure:

```
You are drafting a full product spec from a prototype. This is phase 1
of a spec-from-prototype pipeline.

CRITICAL OVERRIDE: Your default instruction is to flag ambiguities as
open questions. In this pipeline, you do the opposite: every ambiguity
becomes an explicit, numbered assumption. Make the call, document it.
Never ask the user a question. Never leave a placeholder like
"[TBD]" or "depends on requirements".

INPUT:
<inline the entire prototype content here, or paths>

PRODUCE THE FOLLOWING ARTIFACTS as markdown text in your response,
each one separated by a delimiter line `=== <filename> ===`:

1. `00-narrative.md` — problem, target user(s), value prop, scope,
   success criteria, what success looks like 90 days post-launch
2. `01-user-flows.md` — primary flows step-by-step + edge cases
   (auth boundary, empty/error/loading states, offline, first run,
   permissions, mobile vs desktop divergence)
3. `02-roadmap.md` — MVP / v1 / v2 phasing with rationale for what
   each phase achieves
4. `03-tickets.md` — full ticket list. Each ticket: title, user story,
   acceptance criteria (Given/When/Then), dependencies, rough size
   (S/M/L), phase (MVP/v1/v2)
5. `04-assumptions.md` — the Assumptions Register. Every judgment
   call you made. Format per entry:
   ```
   A-NN — <one-line statement>
     Confidence:       Low | Medium | High
     Impact if wrong:  <one line — what re-architects>
     Tickets affected: <comma-separated T-NN list>
     Override?         [ ]
   ```
   You must produce AT LEAST 10 assumptions. If you have fewer, you're
   not being honest about what you guessed.

DO NOT produce: critique log, open questions doc. Those come from
later phases.

Be exhaustive but concrete. No filler. Every ticket must be implementable
by an engineer who reads it cold.
```

Parse the response. Write each section to its file under
`docs/specs/<feature-slug>/`.

### Phase 2 — Parallel critique panel (3 agents, parallel)

Spawn all three in a single message:
- `core:ux-flow-critic`
- `core:eng-feasibility-critic`
- `core:business-pm-critic`

Each gets the same context: the just-written spec files. Each critic
returns structured findings (see their agent definitions).

Prompt template (per critic):

```
You are critiquing a freshly-drafted product spec for gaps in your
domain. Read all spec files at <path>:
- 00-narrative.md
- 01-user-flows.md
- 02-roadmap.md
- 03-tickets.md
- 04-assumptions.md

Apply your rubric. Return findings ONLY — do not rewrite the spec.

For each finding, output:
  F-<initials>-NN — <one-line title>
    Severity:      P0 | P1 | P2
    Where:         <file:section>
    Problem:       <what's wrong or missing>
    Suggested fix: <one paragraph, concrete>

Be ruthless. The PO will reconcile and is allowed to reject P0s with
reason. Your job is to find every gap, not to be polite.

Aim for 10–25 findings. Fewer than 10 means you weren't reading carefully.
```

Collect all three returns. Write the raw findings to
`06-critique-log.md` under three sections.

### Phase 3 — Reconcile (product-manager second pass)

Spawn `core:product-manager` again. Required prompt:

```
You are doing a reconcile pass on the spec you just drafted. Three
critics ran in parallel and produced findings. Read:
- The current spec at <path>
- The critique log at <path>/06-critique-log.md

For EVERY P0 finding, do one of:
  (a) Accept — update the relevant spec file(s) AND note the change
      in the critique log under `## Accepted` with the F-ID.
  (b) Reject — leave the spec unchanged AND note in the critique log
      under `## Rejected` with the F-ID and a one-paragraph reason.

For P1 findings: accept if cheap, otherwise reject with reason.
For P2 findings: accept selectively. Reject the rest in bulk with a
single "P2 batch deferred to vNext" note.

ALSO produce `05-open-questions.md` — anything you genuinely could
not reason through even with full latitude. These are NOT assumptions
(those go in 04). These are questions where you'd need user input
in a future iteration. Aim for 3–8. Zero is a red flag.

Output the updated artifacts in the same `=== <filename> ===` format.
Always include 06-critique-log.md with Accepted/Rejected sections.
Include 04-assumptions.md if any assumption changed.
Include 05-open-questions.md (new).
Include any other file that changed.
```

Parse, overwrite files. Done.

### Phase 4 — Summary (host)

Write a short summary to the conversation:
- Path to the spec directory
- Counts: # tickets, # assumptions, # critique findings, # accepted,
  # rejected, # open questions
- Top 3 highest-impact assumptions (by "Impact if wrong" severity)
- One sentence: "Review `04-assumptions.md` first. Flip Override? on
  anything wrong; we'll regenerate affected tickets in a follow-up."

DO NOT regenerate tickets in this run. The regenerate-on-override
flow is a future skill (out of scope here).

## Output layout

```
docs/specs/<feature-slug>/
├── 00-narrative.md
├── 01-user-flows.md
├── 02-roadmap.md
├── 03-tickets.md
├── 04-assumptions.md
├── 05-open-questions.md
└── 06-critique-log.md
```

## Stop conditions

- Input is genuinely unreadable (broken URL, corrupted file) →
  fail fast, tell the user, do not guess at content.
- Phase 1 returns fewer than 5 tickets or fewer than 5 assumptions →
  re-run phase 1 once with a sharpened prompt. If it fails twice,
  surface what came back and stop.
- Any critic returns zero findings → that critic re-runs once. If
  still zero, log and proceed (don't block on it).
- Reconcile pass would touch every file → that's fine if findings
  warrant it; not a stop condition.
- User interruption → stop immediately, leave files as-is.

## Cost guard

- Phase 1 + Phase 3 each call product-manager once. Two PM calls total.
- Phase 2 is three critics, parallel, one call each. Three critic calls.
- Total: 5 agent calls. Do not loop or retry beyond the stop conditions
  above.
