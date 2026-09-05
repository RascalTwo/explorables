# Adding a challenge to this viz

This is the bar. It is not aspirational — every one of the existing modules
clears it, and the gallery reads as one coherent thing *because* they do.

`shared.js` validates nothing at runtime: a malformed module renders `undefined`
into the page, or throws and kills the whole gallery render. The only guard in
the platform is a `try/catch` around `mount()`.

**Run `node check.mjs` before you ship.** It enforces the mechanical half of this
document — required fields, `dates` format, `cost`/`code` placement, id and
number uniqueness, the registry import *and* array entry, a canonical `SPOT`
pattern, no redefined kit properties, and the header's one-line format. It loads
every module without a browser or the dev server.

It **also runs every official freeCodeCamp assertion** against each variant's
`code` (Tier 1 §3), from the vendored `official-tests.json`. Run
`node fetch-official.mjs` when you add a challenge to pull its fixture.

It deliberately checks nothing that needs taste. **Whether each variant is a
genuine approach rather than a strawman, whether the presets teach, whether every
debugger note explains *why* — none of that is mechanical, and a green run is not
a substitute for reading this file.**

Note what moved: Tier 1 §3 (*every* variant passes *every* official test) used to
live here as prose, and it is the rule the gallery broke most often — `304`
shipped a brute returning the itinerary list where the grader wants a count, and
`321` shipped a `code` block with its data elided to `/* …118 symbols… */`. Both
survived every review and a green `check.mjs`. **Correctness turned out to be
mechanical after all** — a script can't tell an approach from a bug, but it can
run the grader's own assertions. What stays human is everything above.

**Fastest path: read `challenges/309-number-sort.js` first.** It self-designates
as the exemplar and shows the full contract in one 233-line file.

---

## Tier 1 — the hard contract

Break any of these and the page is broken or the entry is invisible.

### 1. Default-export the module object

```js
export default {
  n, id, title, dates, statement, variants: [ /* ≥1 */ ]
};
```

| Field | Required | What it is |
|---|---|---|
| `n` | yes | Challenge number. Drives the tab badge, the eyebrow, **and the derived freeCodeCamp date + "original ↗" URL**. |
| `id` | yes | Kebab slug. Used as the tab key, the URL hash key, and **the lookup key into `patterns.js`**. Must be unique. |
| `title` | yes | Human title. Escaped on render. |
| `dates` | yes | Array of ISO `YYYY-MM-DD`, one per day the module covers. Sorts the gallery, builds the "original ↗" link, and **derives** the eyebrow label. See [Dates](#dates). |
| `statement` | yes | The problem, as **raw trusted HTML** (not escaped). Include a worked example. |
| `variants` | yes, ≥1 | See below. Missing this throws and takes down the entire gallery. |
| `source` | no | `"leetcode"` → orange LC badges. Omit for freeCodeCamp (defaults `"fcc"`). |
| `difficulty` | no | Overrides the eyebrow label. For sources with no daily date — LeetCode shows `"Medium"` there. |
| `url` | no | Explicit "original" link. Required for non-fCC; overrides the derived one. |

### 2. Every variant has `name` and `mount`

```js
{ name, mount(host), tone?, cost?, approach?, code?, graded? }
```

`mount(host)` is mandatory — **255/255 existing variants have one. There is no
such thing as a static entry in this gallery.** If you can't make it
interactive, it doesn't belong here.

### 3. Every variant is a correct solution

**Each variant must pass every official test the source publishes. All of them,
not most of them.** A variant is an *approach to solving* the problem, not a
demonstration of getting it wrong. If your brute side scores 6 of 7 on the
official set, you have not written a brute-force approach — you have written a
bug and given it a tab.

The brute/opt axis is **work done, never correctness**. Both variants return the
same answer on every input; they differ in how much they had to do to get there.
See [Tier 3](#tier-3--what-makes-an-entry-great).

**This rule is now enforced.** `check.mjs` writes each code-bearing variant's
`code` to a temp `.ts`, lets Node strip the types, and runs freeCodeCamp's
*literal* assertions against it — vendored in `official-tests.json`. Adding a
challenge means running `node fetch-official.mjs` once to pull its fixture; that
script is the only thing here that touches the network, so `check.mjs` stays
hermetic. A variant that fails one official assertion, or whose `code` doesn't
run standalone, is a hard failure.

Those assertions run against a small hand-written `ASSERT` map in `check.mjs`,
not against chai, so **a challenge using an assertion style no earlier one used
will throw rather than fail** — add the method there. `21-hex-generator` is the
case that first forced this: its output is random, so its grader cannot compare
against a fixed answer and asserts *properties* instead (`isAbove`, `lengthOf`,
and `notEqual` across two separate calls). Note the one asymmetry when you add
one — the map deliberately tightens `equal` to `strictEqual`, but doing the same
to `notEqual` would *loosen* the gate, so that one stays `!=` like chai's.

#### `graded: false` — the only way out

A code-bearing variant that deliberately doesn't answer the grader must say so:

```js
{ name: "Shift-aware alignment", cost: "O(5n) — 5 shifts", graded: false, … }
```

It is not a snooze button. Three variants in the gallery carry it, each for a
reason no other variant can borrow:

| Variant | Why |
|---|---|
| `309` `Default .sort()` | The Tier 1 §3 exception — the broken behaviour *is* the challenge. |
| `318` `Shift-aware alignment` | A declared detour *past* the challenge; solves frame-shift alignment, not the graded compare. |
| `295` `Solution` | Merges the six-day series #295–300, so no single day's graded function is the answer. |

Every exemption is printed on each run, so they stay visible rather than
accumulating unread. If you reach for it because your variant fails a test,
you want Tier 1 §3, not this field.

**The one exception, and don't generalise it:** `309-number-sort`'s brute variant
really is broken code, because the *entire challenge* is that gotcha — the
problem exists to teach you that `.sort()` is lexicographic. That's why it's
filed under pattern `Gotcha`. When the wrong behaviour **is** the lesson the
challenge is teaching, showing it is the point. When it isn't, showing it is
just a strawman. If you're reaching for this exception, check that your
`patterns.js` entry says `Gotcha` — if it doesn't, you're not in the exception.

### 4. Register it

`registry.js` — add the import *and* the array entry. Ordering is computed, but
keep the import list sorted by number.

### 5. Add a `SPOT` entry in `patterns.js`

Keyed by your module's `id`:

```js
"combination-sum": {
  pattern: "Backtracking",
  spot: `The prompt asks for <b>every</b> combination that sums to a target…`
},
```

- `pattern` **must** be one of the ten canonical names: `Backtracking`,
  `Dynamic programming`, `Greedy`, `Recursion`, `Hashing`, `Flood fill`,
  `Math`, `Simulation`, `Gotcha`, `Direct`. Anything else silently falls out
  of the filter bar's ordering.
- `spot` is the **problem-specific** clue — "how would I recognize that *this*
  problem wants this technique?" It is distinct from the pattern's `tell`,
  which is the general signal and already lives on `PATTERNS[name]`.

Skipping this is the single easiest way to ship a technically-working entry
that quietly fails the gallery's purpose.

---

## Tier 2 — the quality bar

Treat these as required. Adherence is high but not literally universal — where a
rule has defensible exceptions, they're named inline. Run `node check.mjs` rather
than trusting a claim in this file; the counts here drift, the script doesn't.

### Every challenge ships a step-through debugger

All 95 modules do this; 128 debugger variants total. It is the most expensive
requirement and the most important one. You hand-write:

- a `SRC` array of source lines, and
- a `trace(input)` function that returns `Step[]`,

and feed both to `mountDebugger`. Every step carries a prose `note` narrating
what just happened and *why* — not a restatement of the line. See
[The debugger contract](#the-debugger-contract).

### The demo is manipulable, not a playback

The user must be able to change something and watch the result change. Two
acceptable levels:

1. **Best — the user supplies their own input.** A text field, a number field,
   a slider, a clickable grid. 89/95 modules do this — and "their own input"
   includes a clickable board or a bumpable die (`322`, `335`), not just a
   text field.
2. **Acceptable — curated presets only.** Use this when free-form input is
   meaningless or explosive (e.g. `294-parentheses` where n=5 is already huge).

An animation the user only watches does not clear the bar.

### Curated cases: source-official first, then pedagogical

**Minimum: every official test case the source publishes, reachable somewhere in
the module.** If freeCodeCamp or LeetCode ships N cases, all N are selectable —
normally as preset chips on the solution demo. The entry claims to solve the
challenge, so it must demonstrably pass the challenge's own tests.

Two refinements the first full audit forced, because the flat rule was
unsatisfiable:

- **Coverage is a module-level obligation, not a per-variant one.** This is about
  which cases are *selectable where* — it is **not** licence for a variant to get
  a case wrong. Every variant still answers every official case correctly
  (Tier 1 §3); this clause only says each one needn't ship a chip for all of
  them. Step-throughs may curate for trace length, *provided* the cases they drop
  are reachable in the demo. `294-parentheses` is officially tested at `n=13` → `742900`; a
  step-through of that is 742,900 leaves and cannot exist. `314` is officially
  tested at `510510`. Trimming those is correct. Dropping a case that *would*
  have fit inside the existing `min`/`max` is not — check before you trim.
- **A freeform input can satisfy coverage better than a chip list.** Judge the
  input *space*, not the array. `304-itinerary` ships no preset array at all;
  its slider spans `n=2..7`, which is every official input. `323-song-mood`
  covers 2 of 8 in its `CASES` but its genre chips × 60–180 BPM slider span the
  whole official surface. Both are clean. A module with **no** free input and a
  short chip list is the dangerous shape — its missing cases are genuinely
  unreachable.

The number that matters is **hard-unreachable**: an official case reachable by
neither a preset nor user input. That should always be zero.

**Then add your own**, but only ones that *teach*: an edge case the official
set misses, the input where brute-force and optimized visibly diverge, the
degenerate input, the off-by-one boundary. Existing modules do exactly this and
say so in a comment (`331`: *"every FCC test case plus one exact-midpoint tie"*;
`333`: *"Verified against all 9 official cases"*).

**Never random or arbitrary.** Typical count is 4–6, and each one should land on
a *different* branch or outcome — `335`'s nine dice presets hit nine different
rungs of the ladder. If two presets exercise the same path, one of them is
filler.

Record provenance in a comment above the array so the next person knows which
cases are official and which are yours.

#### Where to get the official cases

The challenge pages are client-rendered, so fetching the HTML gets you nothing.
Use freeCodeCamp's public API — this is the exact JSON the page itself consumes,
and the `testString` values are the literal assertions the grader runs. No auth:

```
https://api.freecodecamp.org/daily-coding-challenge/date/YYYY-MM-DD
```

Derive the date from the challenge number: `2026-05-30 + (n − 293) days`. The
response carries the full statement, both language seeds, and every test.

**The dailies ended, and the endpoint reflects it.** #365 (2026-08-10) was the
last new challenge — one year to the day after #1, *Vowel Balance*, on
2025-08-11. `/date/` now returns **404 for every date after 2026-08-10**, by
design: freeCodeCamp made the feature year-agnostic and it now replays the 365
from the start on a second endpoint, `/daily-coding-challenge/day/MM-DD`.

There was no blog post or changelog entry — which is why this is easy to miss,
and why it is written down here. The sources:

- [PR #68177 — *feat(client): loop daily challenges*](https://github.com/freeCodeCamp/freeCodeCamp/pull/68177)
  (branch `feat/sunset-daily-challenges`, merged 2026-07-22) is the change
  itself. Its author, Tom Mondloch (`moT01`),
  [commented on 2026-06-24](https://github.com/freeCodeCamp/freeCodeCamp/pull/68177#issuecomment-4790332631):
  "we are not going to be adding new daily challenges after August 10th **for
  now**. We may bring them back in the future."
- [Forum: *Daily Coding Challenges to sunset*](https://forum.freecodecamp.org/t/daily-coding-challenges-to-sunset/796630)
  — the public discussion. Quincy Larson gives the reason there (2026-08-06):
  365 challenges "was a ton of work for @moT01 … we only have one Tom."
- The [launch post](https://www.freecodecamp.org/news/introducing-freecodecamp-daily-python-and-javascript-challenges-solve-a-new-programming-puzzle-every-day/)
  (2025-09-05) names **no** end date — so a one-year run was where it landed,
  not what was planned. Don't describe it as a planned finite series.

Two consequences for this gallery. First, `fetch-official.mjs` still works
unchanged, because it fetches by each module's `dates[0]` and every one of those
is ≤ 2026-08-10. Don't "fix" it to use `/day/`. Second, **there is no longer a
moving target**, and the tail of the run is now closed:

- **#293–365 is COMPLETE — 73 of 73, no gaps.** (#296–300 look absent from
  `challenges/` but aren't: `295-schema-validator` merges Parts 1–6 into one
  module, which is why its `dates` array has six entries.) Nothing inside this
  range is left to add; an fCC entry that lands here now would be a duplicate.
- **#1–292 is the only territory left**, and 26 of it is done (#1–26). All of it
  is reachable through the same `/date/` endpoint, since those dates are past.

That is a fixed, finite back-fill of 266 challenges rather than a backlog that
grows every morning. There is no deadline on it and no partial state to keep
straight — the gallery's claim is "every daily from #293 to the last one", which
is true today and stays true whether or not #1–292 ever gets filled in.

If the dailies return — the announcement said "for now" and "we may bring them
back" — the arithmetic above is the first thing to break: a resumed series will
not be contiguous with #365. Write the date down from the API rather than
computing it, which is what [Dates](#dates) already tells you to do.

In practice you don't call this by hand — **`node fetch-official.mjs` does it for
you.** It reads `dates[0]` off every freeCodeCamp module, fetches each one, and
writes the trimmed result to `official-tests.json`, which `check.mjs` then grades
against. Write your module's `dates` first, run it, and your fixture appears.

**Do this before writing the module, not after.** Both modules audited when this
guide was written had drifted from the official set — `293` was missing the
official `"Pair"` case entirely and its debugger had substituted an invented
hand; `318`'s step-through used four hand-made pairs instead of the official
five. Neither error was visible from the page.

### Every variant declares `cost`, every solution variant declares `code`

- **`cost`** — a short string in the demo header describing the work done, e.g.
  `"O(n)"`, `"O(1) — 5 dice"`, `"O(n²)"`. It's a label, not a computed value.
  Step-throughs use `"line-by-line"` (54 of 128) — or, better, a phrase naming
  what that particular trace emphasises: `"call stack"` for a recursive one,
  `"cache hit"` for a memoised one. `check.mjs` notes the exceptions without
  failing them.
- **`code`** — the real, copy-pasteable TypeScript solution as a template
  literal, rendered as a syntax-highlighted block. Present on **every**
  non-debugger variant (127/127); **absent from every step-through variant**
  (128/128), because the debugger renders its own source. That's a rule, not an
  inconsistency — don't add `code` to a step-through.

  **"Copy-pasteable" is literal — the snippet must run standalone.** No elided
  data, no constant borrowed from a sibling variant's block. `321` shipped
  `["H", "He", "Li", /* …118 symbols… */ "Og"]`, and its second variant
  referenced an `ELEMENTS` that only the first one declared; neither could
  execute. It now interpolates the real table from the module constant, so the
  snippet cannot drift from the data the demo actually runs on.

### Every file opens with a header comment

Invariant first line:

```js
// #<number> · <Title> — <the one-line insight>
```

Then, for multi-approach modules, a `• BRUTE / • OPT` (or `NAIVE / OPT`) block
naming *the wasteful act* and *the fix*. The best examples end with a pointer to
the payoff, e.g. `320`:

> `// Flip the Approach toggle on case 2 to see 4 of 5 vs 5 of 5 on identical input.`

### Reuse the design system; scope anything bespoke

Never redefine the kit's custom properties (`--bg --panel --panel-2 --border
--text --muted --accent --good --warn --danger --c1…--c8 --sans --mono --r`).
The categorical ramp runs to **`--c8`**, not `--c6` — this line said `--c6` for
months, which quietly implied `--c7`/`--c8` were yours to redefine. They aren't.

Reuse the existing utility classes rather than reinventing them: `.controls`,
`.chip` (+`.on .bad .good`), `.note`, `.muted`, `.mono`, `.tag`, `.rule`,
`code.inl`, `.badge.ok`/`.badge.no`, `.result-line`, `.demo-head`, `.cost`,
`.opcount`, `.cand-grid`/`.cand.pass`/`.cand.fail`, `.ladder`/`.rung`,
`table.cmp`, `.grid2`, `.srow`.

For genuinely module-specific styles, use the established lazy-injection idiom
(93/95 modules) with a 2–3 character prefix:

```js
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `.pz-foo { … }`));
}
```

---

## Tier 3 — what makes an entry *great*

### First: does this problem *have* two approaches?

Ask before you build. **Most don't, and that's the normal case** — 63 of 95
modules ship a single `Solution` + `Step through` and are none the worse for it.
A one-approach module is a correct outcome, not a shortfall.

Two approaches are warranted only when all three hold:

1. **You can name the wasteful act without breaking the code.** Say it out loud:
   *"it re-scans str1 for every character"*, *"it divides by every d past √n"*,
   *"it probes 13 positions to learn one number"*. If the only way you can make
   the first variant "worse" is to make it **wrong**, the problem has one
   approach. Ship one. (This is the trap that produced a strawman on `336` —
   the naive version returned `undefined` on a case the real one passed, which
   makes it a bug wearing an approach's clothes.)
2. **The two are different mental models, not two spellings of one.** Search vs.
   closed-form, re-scan vs. remember, enumerate vs. count. If variant B is
   variant A with a line rewritten, that's an edit, not an approach.
3. **The cost gap is visible on screen** — an op counter, a step counter, a
   render that visibly grinds. "It's asymptotically worse" that you can't *see*
   isn't worth a tab.

Be honest about the size of the win in the header comment. A gap that only
matters at large n, on a problem whose input is fixed and small, is a
constant-factor win — say so rather than implying an asymptotic one.

### If it does: the two-approach shape

**Two approaches is the goal *where the problem supports it*** — 31 of 95
modules do it:

1. **The wasteful one first** — `tone: "brute"`
2. **The optimized one second** — `tone: "opt"`
3. **Each gets its own step-through**, so a two-approach module has 4 variants.

Naming matters and follows a strict convention: **brute-side names describe the
wasteful act**, **opt-side names describe the trick**. Never generic.

| Brute | Optimized |
|---|---|
| `Scan str1 each time` | `Set membership` |
| `Every pair` | `Suffix-max` |
| `Generate & filter` | `Pruned recursion` |
| `Divide by every d` | `Stop at √n` |
| `Sweep till stable` | `BFS queue` |

Per-approach debuggers use the literal prefix `"Step: "` + a lowercase phrase
(`"Step: recurse"`, `"Step: suffix-max"`). Single-approach modules use exactly
`"Solution"` and `"Step through"`.

**The highest bar: engineer a curated case where the two approaches visibly
diverge in the WORK THEY DO on identical input — same answer, different cost.**
Not just "one is slower" — a case where you can *see* it: an op counter, a step
counter, a visible grind. `336-horoscope-match` opens on the pair that costs its
search 13 position checks against the fold's 3, and its step-throughs run 25
steps against 8 on that same input.

**They must not disagree on the answer.** Two correct solutions never can — if
yours do, one of them is broken, and Tier 1 §3 says it doesn't ship.

The subtle case is an approach that is *correct but suboptimal under the
problem's own objective*, which is different from being wrong. `320-blood-bank`
serves 4 of 5 patients naively and 5 of 5 greedily on the same input. The naive
one isn't buggy — serve-in-request-order is a legitimate strategy that returns a
legitimate count; it just isn't the **maximum**, and the problem asks for the
maximum. That's a fair second approach. "Returns a worse result under a stated
objective" is allowed. "Returns a wrong answer" is not.

`tone` is functional, not decorative — it tints the approach pill and the cost
badge. Set it on both variants of a two-approach pair.

**Omit it when neither side is the default choice** — a two-approach module is
usually a ladder, but it need not be. `21-hex-generator` ships rejection sampling
against constructive sampling, and the constructive one bounds the work while
being measurably *less uniform*; tinting it `opt` told a skimmer "use this" about
the side that is worse at the thing the word "random" in the statement is about.
Untinted, the two read as strategies rather than rungs. Only reach for this when
you can name what each side wins and loses — "I couldn't decide" is not a reason.

Mind the side effect: `check.mjs` derives its **two-approach census from the tint**
(`variants.some(v => v.tone === "opt")`), so an untinted pair drops out of that
count — it reports 30 where the true number is 31. The count was left keyed to the
tint on purpose. The obvious structural alternative, "two or more `Step:` variants",
reports 32, because it sweeps in `318`'s `graded: false` detour, which is not a
second approach. Neither rule is clean, so the tint stays and the discrepancy is
written down here instead.

**If your brute variant passes every official test, say so in the header.** This
is not hypothetical: `320-blood-bank`'s naive serve-in-request-order strategy
passes all 6 of freeCodeCamp's tests. The official set never distinguishes it
from the greedy one. The module's entire thesis rests on `cases[1]`, an
*invented* input where the two diverge 4/5 vs 5/5.

That's the module doing better than the grader — but it means the "wasteful"
approach is presented as wrong when no official test can catch it. Name that in
the header comment so the divergence case is understood as yours rather than
the challenge's.

---

## The debugger contract

`mountDebugger(host, cfg)`:

```js
cfg.source : [{ ln, html }]        // source lines; html may carry <span class="tok" data-t="…">
cfg.trace  : (input) => Step[]     // instrumented run
cfg.input  : { label, value, min, max, presets, hint, type? }
```

`cfg.input.type: "text"` opts into a string input; otherwise it's numeric with
`Math.floor` + min/max clamping. `presets` render as `.chip` buttons.

A `Step`:

```js
{
  line,            // required — matched against the ln in cfg.source; highlights + auto-scrolls
  note,            // required — prose narration, injected as HTML (not escaped)
  focus,           // optional — matches data-t on a .tok within the active line; amber spotlight
  frames: [{       // bottom-of-stack → top; LAST element is the active frame
    title,         //   required per frame
    vars: {k: v},  //   object order is render order; a var absent from vars vanishes
                   //   from the panel — express scope by omission
    changed: [k],  //   those chips flash amber
    structs: [{ label, items, newest }],  // array/stack/queue visualizer;
                   //   newest:true highlights only the last item
    ret: { value } //   turns the frame green
  }],
  eval: { expr, val },  // optional — condition panel, green/red
  done, result          // optional — appends the "Return value" panel
}
```

**Bind `max` to the array, never to a literal.** Write:

```js
input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: PRESETS, … }
```

`335-five-dice` does this and therefore cannot drift. `318` hard-coded `max: 4`
against a longer array and silently orphaned a case — invisible from the page,
and it survived a full `node` test pass because nothing about it is a *logic*
error. If you add a case later, a literal `max` is the thing that will betray
you.

Two more things that bite:

- **Source-line HTML uses `.k` / `.fn` / `.st`** (keyword / function / string) —
  *different names* from the `pre.code` highlighter's `.kw` / `.fn` / `.st`.
  Use `k`, `fn`, `st` inside `cfg.source`.
- **Scope is expressed by omission** — i.e. *a thing shows up in the state panel
  only once the line that creates it has actually run.*

  The debugger renders whatever keys are in `vars`. If you put every variable in
  from step 1, the panel shows `dist: undefined` while the reader is still on
  line 2 — which reads as "`dist` exists and is empty". It doesn't exist yet.
  The fix is not to render a placeholder; it's to **leave the key out of `vars`
  entirely** until its declaration line has executed. Then it appears exactly
  when it comes into being, and the panel is a truthful picture of scope at that
  moment. Gate on the line number:

  ```js
  const vars = {};
  if (line >= 4) vars.i = i;        // `const i` is line 4 — invisible before that
  if (line >= 6) vars.gap = gap;    // `const gap` is line 6
  ```

  **This applies to `structs` too, not just `vars`.** Same rule, same reason: a
  struct panel appears when its line runs and then *stays* for the rest of the
  call, because the thing it shows is still in scope. Build them in the same
  helper, gated the same way — don't attach a struct to one step and let it
  vanish on the next, which reads as "this stopped existing".

  ```js
  const structs = [];
  if (line >= 2) structs.push({ label: "WHEEL", items: WHEEL_ITEMS });
  if (line >= 3) structs.push({ label: "COMPAT", items: COMPAT_ITEMS });
  ```

  `318`, `335` and `336` all do this. `318:248` says so in a comment; a value
  live for the whole function shows as a struct throughout, and one that isn't
  gets gated on a liveness flag.

Recursion is fully supported — push/pop a JS array and rebuild `frames` each
step (`294-parentheses.js` is the reference).

---

## Before you call it done

- [ ] **Given** the new module, **when** the gallery loads, **then** its tab
      appears, the demo mounts with no console error, and no field renders as
      `undefined`.
- [ ] **Given** each official source test case, **when** loaded as a preset,
      **then** the demo produces the documented expected output.
- [ ] **Given** every preset, **when** clicked, **then** it lands on a
      *different* branch/outcome than the others.
- [ ] **Given** the step-through, **when** stepped from start to finish on each
      case, **then** every step highlights a real line, every `note` explains
      *why*, and the final return matches the demo.
- [ ] **Given** the pattern filter bar, **when** the module's pattern chip is
      selected, **then** this challenge appears and its "How to spot it" clue
      renders.
- [ ] **Given** a two-approach module, **when** the approach toggle is flipped
      on the designated case, **then** the difference is visible on screen.

---

## Known warts

Don't propagate these; don't be surprised by them.

### Dates

One field. Write the dates down; everything else is derived from them.

```js
n: 335, id: "fivedice", title: "Five Dice", dates: ["2026-07-11"],
```

`dates` is an **array of ISO `YYYY-MM-DD` strings, one per day the module
covers.** Almost every entry has exactly one. A module that merges a multi-day
series lists them all:

```js
n: 295, id: "schema", title: "Schema Validator",
dates: ["2026-06-01", "2026-06-02", "2026-06-03",
        "2026-06-04", "2026-06-05", "2026-06-06"],   // Parts 1–6, one per day
```

From that single field:

- **`registry.js` sorts** by `dates[0]`.
- **`shared.js` builds the "original ↗" link** from `dates[0]` — a substitution,
  not a calculation.
- **The eyebrow label is derived**: one date → `"Jul 11"`; a run → `"Jun 1–6"`.
  You do not write the label, so it cannot disagree with the dates.

`difficulty` overrides the label for sources with no daily date — the LeetCode
entry sets `difficulty: "Medium"` and shows that instead.

**Adding an fCC entry:** the dailies run one per day from `#293 = 2026-05-30`,
so the date is that plus `(n − 293)` days. Work it out **once**, write it into
`dates`, and never compute it again. That mapping is a fact about the source,
not an invariant the code should re-derive on every render — if freeCodeCamp
ever skips a day, arithmetic silently corrupts every link after the gap, while
a written-down date stays right.

**Back-filling #1–292:** the same one-per-day run, anchored at `#1 = 2025-08-11`
— one year to the day before #365. Work out `2025-08-11 + (n − 1)` days once and
write it down, same rule as above. Write the **original 2025** day, never the day
the replay served the challenge again: `/date/` is keyed by the original, so
`fetch-official.mjs` keeps working, and the derived eyebrow label stays a single
day rather than a cross-year range. The replay dates 404 on `/date/` entirely.

There is deliberately no `date` or `published` field. Both existed; both were
hand-maintained restatements of this one, and `date` was additionally
overloaded to carry LeetCode's difficulty.

### There is no `tag` field

Modules used to carry a freeform `tag` (`"strings"`, `"logic"`, …). It was only
ever a *fallback* for a missing `SPOT` entry, all ids were covered, so nothing
read it — and the values had drifted inconsistent (both `dynamic programming`
and `dynamic-programming` existed). It has been removed from all modules and
from `patternFor`.

`PATTERNS` in `patterns.js` is the only taxonomy. A new challenge needs a good
`SPOT` entry; an unregistered id now lands on `"Direct"` with no clue box.
