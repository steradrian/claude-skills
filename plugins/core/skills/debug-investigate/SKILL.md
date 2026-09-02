---
name: debug-investigate
description: Systematically debug a reported problem, find the root cause, then fix it. Use when asked to "debug", "investigate why" or "figure out what's broken".
argument-hint: <bug description>
---

Systematically debug and fix: $ARGUMENTS

Follow this protocol in order. Do not skip steps.

## Step 1: Parse the Problem

Read the error message, stack trace, or bug description carefully.

Answer explicitly:
- What is the exact error or unexpected behavior?
- When does it occur? (always, intermittently, specific conditions)
- What is the expected behavior vs. actual behavior?
- Is this a regression? When did it last work?

## Step 2: Find the Source

Locate the file and function where the problem originates.

- For errors with a stack trace: find the top frame in the project's own code (not in node_modules)
- For behavioral bugs: find where the incorrect output is first produced

Read that file completely. Understand what it does before hunting for the bug.

## Step 3: Trace the Data Path

Follow the execution path backwards from the symptom:

- Where does the relevant input come from?
- What transforms happen to it along the way?
- At which point does it diverge from expected behavior?

Read each function in the chain. Don't skim — bugs hide in the code you think you already understand.

## Step 4: Check Recent Changes

```bash
git log -15 --oneline -- <affected-file>
git log -15 --oneline -- <related-files>
```

Did a recent commit change behavior in this file or its dependencies? If yes, read that diff with `git show <hash>`.

## Step 5: Form a Hypothesis

State the hypothesis explicitly before touching any code:

> "I believe the bug is in [file:approximate-line] because [reason]. The root cause is [mechanism]. This explains why it manifests when [condition]."

Verify the hypothesis by tracing the code path one more time with it in mind. Does it hold at every step? If not, revise before continuing.

## Step 6: Assess Before Fixing

Before writing the fix:
1. What is the minimal change that addresses the root cause?
2. What is the blast radius? What else calls this code?
3. Does the same pattern exist elsewhere in the codebase? (`grep -r` for the anti-pattern)

## Step 7: Implement and Verify

1. Apply the minimal fix
2. Run the relevant tests: do existing tests now pass?
3. Add a regression test for this exact case — make it fail first (without the fix), then pass (with it)
4. Confirm the original symptom is resolved
5. If the same bug pattern existed elsewhere, fix those too (or file a note)

Report: root cause, fix applied, regression test added, any sibling instances found.
