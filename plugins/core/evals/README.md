# `core` eval suite

Behavioural eval cases for the eight skills that carry the plugin's load-bearing
invariants. Each case asserts that the skill **did its job** — a file on disk, a
command actually executed, a specific bug named, a runner chosen from a lockfile —
rather than that it produced convincing prose.

> **Blocked on early access.** `claude plugin eval` is not enabled for this account
> yet (`claude plugin eval init` returns "`plugin eval` is currently in early
> access"), so nothing here has been executed. The cases are written against the
> case/grader schema the shipped CLI validates, and are expected to run unchanged the
> day it is switched on.

---

## Running it

```bash
# the whole suite, against the marketplace plugin id
claude plugin eval core@adrian --scaffold --allow-tools Bash Write Edit

# one case, or a family of them
claude plugin eval core@adrian --case 'review-*' --scaffold --allow-tools Bash

# machine-readable results for CI
claude plugin eval core@adrian --scaffold --allow-tools Bash Write Edit --json results.json

# explicit with/without-plugin arms and the score delta
claude plugin eval core@adrian --scaffold --ablation with-without --allow-tools Bash Write Edit

# hard budget ceiling; aborts with exit 2 and partial results if hit
claude plugin eval core@adrian --scaffold --allow-tools Bash Write Edit --max-cost-usd 8
```

Three flags are not optional in practice:

- **`--scaffold`** — six of the eight cases build their working directory from a
  `scaffold.sh` that copies a tree out of `fixtures/`. Scaffolds are off by default
  because they run author-supplied bash; these are the ones in this directory.
  Without it those cases run against an empty directory and their file graders are
  skipped.
- **`--allow-tools`** — `Bash`, `Write` and `Edit` are operator-gated. Every case
  that builds, fixes or writes an artifact needs them.
- **`--ablation with-without`** is already the default when the plugin resolves. The
  `skill-fired` grader in each case is marked `arm: with-only`, so it reports whether
  the skill actually loaded without inflating the score.

A cheap smoke pass: add `--runs 1`. Every case is set to `runs: 3` because agent
output varies and a single sample turns a flake into a red build.

---

## What each case proves

| Case | Skill | The assertion that carries it |
|---|---|---|
| `build-tested-utility` | `core:build` | A test file and its module exist on disk; a real `npm run test` / `typecheck` ran through Bash; and an LLM grader that the closing summary **pasted command output** instead of asserting "tests pass". |
| `review-finds-unawaited-promise` | `core:review` | Regex on the unified output for `updateBalance` and for unawaited-promise phrasing, plus an LLM grader that the finding cites `src/hooks/use-deposit.js` **with a line number** and states the real consequence. |
| `edge-bash-domain-taxonomy` | `core:edge-bash` | A strategist subagent was spawned, no `Tier A/B/C` headings, and an LLM grader that **fails outright** on generic categories ("boundary inputs", "happy path", "error handling") — the exact failure mode the skill exists to prevent. |
| `create-ticket-writes-file` | `core:create-ticket` | `file_exists` on `docs/tickets/Ticket-*.md`. The conversation is ephemeral; the file is the deliverable. |
| `fix-after-review-sequential` | `core:fix-after-review` | `tool_order` puts the first verification run **after** the first edit, and `npm run typecheck` is executed at least twice — one check per finding, not one batched check at the end. |
| `manual-test-no-browser` | `core:manual-test` | No browser tools granted. An LLM grader that it says so plainly, names the static checks it ran instead, and claims no screenshot. This is the cloud-session degradation rule. |
| `explore-report-only` | `core:explore` | The artifact lands at `docs/explore/Explore-*.md`, `Edit` is called zero times (and is granted on purpose, so zero means the invariant held under temptation), and nothing is written into `src/`. |
| `dead-code-detects-pnpm` | `core:dead-code` | `pnpm-lock.yaml` is committed and a decoy `package-lock.json` is untracked beside it. The trace must show `pnpm exec`, must show the lockfile being consulted, and must contain no `npm`/`yarn`/`bun` command. |

---

## Layout

```
evals/
  <case-name>/
    prompt.md            frontmatter + the user prompt
    case.yaml            only where a fixture is needed (context.scaffold_script)
    scaffold.sh          copies a tree out of ../fixtures/ into the run's cwd
    graders/*.md         one grader per file; the filename is the grader name
  fixtures/              the version-controlled inputs the scaffolds copy
  mocks/playwright/      stand-ins for the Playwright MCP server
  results/              (generated) per-run JSON and the HTML report
```

`fixtures/` holds real, readable files rather than heredocs inside the scaffolds, so
a fixture can be opened and reasoned about on its own. `scaffold.sh` locates them
relative to itself (`dirname "$0"/../fixtures/...`) because the scaffold runs with
the sandbox working directory as its cwd and a deliberately minimal environment.

`review-repo` is shared by three cases with different scaffolds: `review-*` commits
the change on a branch, `create-ticket-*` leaves it uncommitted, `manual-test-*`
commits it and then withholds every browser tool.

---

## Mocks

`mocks/playwright/` stands in for the Playwright MCP server so `explore-report-only`
is reproducible and needs no dev server. The canned page is a Settings screen with
four planted defects — an unlabelled input, an empty list with no empty-state copy,
a Save button stuck disabled, and a dead `role="status"` region — and the source that
produces them is scaffolded into `src/settings/` so "did not modify source" is a
meaningful assertion rather than a vacuous one.

`manual-test-no-browser` depends on the *absence* of those tools and simply omits
them from `allowed_tools`. If a stand-in ever leaks into that case's tool list, run
it with `--mocks off`.

---

## Assumptions worth revisiting when the runner is enabled

1. **Plan mode.** `core:build` gates implementation behind native plan-mode approval,
   which no unattended runner can grant. `build-tested-utility` tells the model to
   treat the plan as approved. Everything after the gate — tests, the quality gate,
   the evidence-bearing summary — is graded normally, but the gate itself is not
   under test in this case.
2. **`scaffold.sh` receives an absolute `$0`.** The scaffold is spawned as
   `bash <script>` with the sandbox cwd, so `dirname "$0"` must resolve to the case
   directory. If it turns out to be relative, each scaffold needs its fixture path
   rebased.
3. **`input_match` runs against the serialized tool input**, which includes file
   contents. `no-writes-into-src` therefore anchors on the `file_path` argument; a
   looser `src/` pattern would fail a correct run whose document cites source paths.
4. **Offline everywhere.** No fixture has `node_modules` and no case may install.
   Verification scripts are `node --check` and `node --test`, which ship with Node.
   `dead-code-detects-pnpm` expects `pnpm exec knip` to fail — the graded behaviour is
   *which runner was chosen*, not whether knip ran.
