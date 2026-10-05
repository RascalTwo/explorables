// #46 · 2nd Largest — two slots, one pass; "distinct" means a tie must not fill slot two.
// The statement is one sentence and its one adjective does the work. [2, 3, 4, 6, 6] is 4,
// not 6, so a repeat of the maximum must be REFUSED by slot two: the test is
// `x < first && x > second`, strict on both sides. Drop `x < first` and the second 6 walks
// straight into slot two. Drop the strictness on `x > first` and a repeat of the maximum
// demotes the old maximum, which is itself. Two slots start at -Infinity, not 0, so that
// [-3, -1, -2] has somewhere to put a negative number (0 would come back as the answer,
// and 0 is not in the array).
// ONE approach, deliberately. The obvious alternative — dedupe with a Set, sort descending,
// take [1] — is correct and SHORTER, so it is not a strawman, but it fails Tier 3's third
// condition: no gap you can see. The sort alone makes 3, 8, 3, 12 and 2 comparisons on the
// five official arrays; the one-pass scan runs 4, 8, 6, 9 and 17 if-tests. At any size a person
// types, the sort does about as much work as the scan and sometimes less, so a cost
// counter would show nothing — the O(n log n) vs O(n) gap needs arrays far larger than
// this gallery's inputs. The demo therefore shows the decisions, not a race.
// The grader's second-largest is undefined for fewer than two distinct values; ours returns
// -Infinity there (the slot was never filled). Neither is tested, so [7, 7, 7] is ours.
// Click [7, 7, 7], then [9, 7, 7, 3] — ours, not freeCodeCamp's — to watch a tie refused.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp arrays in the grader's order, then three of ours.
//   [-3, -1, -2] — ours: every value is negative, so the slots have to start BELOW
//     every number, i.e. at -Infinity. Official has negatives but never an all-negative
//     array, so a 0 seed passes all five tests and fails here.
//   [7, 7, 7] — ours: one distinct value, so slot two is never filled. The statement
//     does not say what to return; the demo shows -Infinity (the slot as it started).
//   [9, 7, 7, 3] — ours: a repeat of the SECOND largest (official only repeats the
//     maximum) followed by a value below it. The second 7 must be refused as well, and
//     the 3 must not displace it.
const OFFICIAL: number[][] = [
  [1, 2, 3, 4],
  [20, 139, 94, 67, 31],
  [2, 3, 4, 6, 6],
  [10, -17, 55.5, 44, 91, 0],
  [1, 0, -1, 0, 1, 0, -1, 1, 0],
];
const EXPECTED = [3, 94, 4, 55.5, 0]; // aligned with OFFICIAL
const CASES: number[][] = [...OFFICIAL, [-3, -1, -2], [7, 7, 7], [9, 7, 7, 3]];
const MAX_LEN = 14; // keeps the tiles and the trace legible

const fmtArr = (a: number[]) => a.join(", ");
const show = (x: number) => (x === -Infinity ? "−∞" : String(x));

// Free text: commas or spaces, anything that is not a finite number is dropped.
function parse(raw: string): number[] {
  return raw
    .split(/[\s,]+/u)
    .filter((s) => s !== "")
    .map(Number)
    .filter(Number.isFinite)
    .slice(0, MAX_LEN);
}

// The graded function, kept verbatim so the demo can't drift from the answer.
function solve(arr: number[]) {
  let first = -Infinity,
    second = -Infinity;
  for (const x of arr) {
    if (x > first) {
      second = first;
      first = x;
    } else if (x < first && x > second) second = x;
  }
  return second;
}

// What each element did, in order. `after` is the state once it has been handled.
type Why = "record" | "tie-first" | "second" | "tie-second" | "below";
interface Entry {
  x: number;
  why: Why;
  first: number;
  second: number;
}
function walk(arr: number[]): Entry[] {
  let first = -Infinity,
    second = -Infinity;
  return arr.map((x) => {
    let why: Why;
    if (x > first) {
      second = first;
      first = x;
      why = "record";
    } else if (x === first) why = "tie-first";
    else if (x > second) {
      second = x;
      why = "second";
    } else why = x === second ? "tie-second" : "below";
    return { x, why, first, second };
  });
}

const VERDICT: Record<Why, string> = {
  record: "new maximum — the old one drops to slot two",
  "tie-first": "equals the maximum — refused (distinct)",
  second: "between the two — new second",
  "tie-second": "equals the second — refused (distinct)",
  below: "below the second — ignored",
};

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sl-wrap { display:flex; flex-direction:column; gap:12px; }
    .sl-in { width:300px; }
    .sl-slots { display:flex; flex-wrap:wrap; gap:14px; align-items:baseline; }
    .sl-rows { display:flex; flex-direction:column; gap:5px; }
    .sl-row { display:grid; grid-template-columns:70px 170px minmax(0,1fr); gap:10px; align-items:baseline; padding:5px 10px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); font:12.5px var(--mono); }
    .sl-row .x { font-weight:800; color:var(--text); } .sl-row .s { color:var(--muted); } .sl-row .w { font:12px var(--sans); color:var(--muted); }
    .sl-row.record { border-color:var(--accent); } .sl-row.second { border-color:var(--good); }
    .sl-row.tie-first, .sl-row.tie-second { border-color:color-mix(in srgb, var(--danger) 55%, var(--border)); }
    @media (max-width:640px) { .sl-row { grid-template-columns:minmax(0,1fr); } }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input", "sl-in");
  inp.type = "text";
  inp.value = fmtArr(OFFICIAL[2]!);
  ctl.append(
    el("span", "ctl-label", "arr ="),
    inp,
    el("span", "ctl-label", `(numbers, up to ${MAX_LEN})`),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", `[${fmtArr(c)}]`);
    b.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = fmtArr(c);
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const arr = parse(inp.value);
    const log = walk(arr),
      res = solve(arr);
    const none = res === -Infinity;
    const oi = OFFICIAL.findIndex((c) => fmtArr(c) === fmtArr(arr));
    out.innerHTML = "";
    const wrap = el("div", "sl-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${none ? "no" : "ok"}`,
        `secondLargest([${esc(fmtArr(arr))}]) → ${none ? "−Infinity (no second distinct value)" : res}`,
      ),
    );
    if (oi >= 0) line.append(el("span", "more", `matches freeCodeCamp's expected ${EXPECTED[oi]}`));
    wrap.append(line);

    const tiles = el("div", "cand-grid");
    arr.forEach((x) => tiles.append(el("span", "cand" + (x === res ? " pass" : ""), String(x))));
    wrap.append(tiles);

    const rows = el("div", "sl-rows");
    log.forEach((e) =>
      rows.append(
        el(
          "div",
          `sl-row ${e.why}`,
          `<span class="x">x = ${esc(String(e.x))}</span><span class="s">first ${show(e.first)} · second ${show(e.second)}</span><span class="w">${VERDICT[e.why]}</span>`,
        ),
      ),
    );
    wrap.append(rows);
    wrap.append(el("div", "note", noteFor(arr, log, res)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch names a different rule, because each
// preset was chosen to land on a different one.
function noteFor(arr: number[], log: Entry[], res: number) {
  if (arr.length === 0)
    return `Nothing to scan: both slots stay at <code class='inl'>−Infinity</code>, which is what the function returns. Type some numbers.`;
  if (res === -Infinity)
    return `Only <b>${arr.length === 1 ? "one value" : `one distinct value`}</b> here, so slot two is never filled and the function returns the value it started with, <code class='inl'>−Infinity</code>. The statement does not say what <i>should</i> come back for fewer than two distinct numbers and no official test asks; returning the sentinel is honest about "never filled", where <code class='inl'>undefined</code> or <code class='inl'>null</code> would be a choice nobody was asked to make. Every repeat was refused by the same line: <code class='inl'>x &lt; first</code> is false when x <i>equals</i> first.`;
  if (arr.every((x) => x < 0))
    return `Every value is negative, which is the input a <code class='inl'>0</code> seed cannot handle: with <code class='inl'>first = second = 0</code> no negative ever beats either, and the function would return <b>0</b> — a number that is not in the array. <code class='inl'>−Infinity</code> loses to every real number, so the very first element lands in slot one and the next lower one in slot two. Official tests have negatives, but never an all-negative array, so the wrong seed passes all five.`;
  if (log.some((e) => e.why === "tie-first"))
    return `The repeat of the maximum is the whole point of the word <b>distinct</b>. The second <code class='inl'>${log.find((e) => e.why === "tie-first")!.x}</code> is not <code class='inl'>&gt; first</code>, so it falls to the <code class='inl'>else if</code>, where <code class='inl'>x &lt; first</code> refuses it. Drop that half of the test and a tie fills slot two with a copy of slot one — <code class='inl'>[2, 3, 4, 6, 6]</code> would answer <b>6</b> instead of <b>4</b>. Notice the order of events on a real record, too: <code class='inl'>second = first</code> runs <i>before</i> <code class='inl'>first = x</code>, or the old maximum is gone before it can be demoted.`;
  if (log.some((e) => e.why === "tie-second"))
    return `A repeat of the <i>second</i> largest, which the official set never sends. The second <code class='inl'>${log.find((e) => e.why === "tie-second")!.x}</code> is below the maximum, so <code class='inl'>x &lt; first</code> passes — and then <code class='inl'>x &gt; second</code> is <b>false</b>, because it is equal. That strict <code class='inl'>&gt;</code> is what refuses it, and the slot keeps the value it holds. The value after it (${arr.at(-1)}) is simply below the second and ignored.`;
  return `No ties here, so every element is either a new maximum (<code class='inl'>${log.filter((e) => e.why === "record").length}</code> of them), a new second (<code class='inl'>${log.filter((e) => e.why === "second").length}</code>), or ignored. A record <b>demotes</b> the old maximum into slot two rather than discarding it — which is why the answer is <b>${res}</b> and not just "the biggest thing that is not the maximum". Add a repeat of the largest value and watch the verdict change from "new second" to "refused".`;
}

// ── STEP — the scan, one element at a time ─────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">secondLargest</span>(<span class="tok" data-t="param">arr</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">first = -Infinity, second = -Infinity</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="x">x</span> <span class="k">of</span> arr) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="rec">x &gt; first</span>) { second = first; first = x; }`,
  },
  {
    ln: 5,
    html: `    <span class="k">else if</span> (<span class="tok" data-t="mid">x &lt; first &amp;&amp; x &gt; second</span>) second = x;`,
  },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">second</span>;` },
  { ln: 8, html: `}` },
];

type Extra = {
  focus?: string | undefined;
  changed?: string[] | undefined;
  eval?: { expr: string; val: boolean } | undefined;
  done?: boolean | undefined;
  result?: string | undefined;
  ret?: { value: string } | undefined;
};

function trace(raw: string) {
  const arr = parse(raw);
  const steps: DbgStep[] = [];
  let first = -Infinity,
    second = -Infinity,
    at = -1;
  const S = (line: number, note: string, x: Extra = {}) => {
    const vars: Record<string, unknown> = { arr: `[${fmtArr(arr)}]` };
    if (line >= 2) {
      vars["first"] = show(first);
      vars["second"] = show(second);
    }
    if (line >= 3 && line <= 5 && at >= 0) vars["x"] = arr[at];
    // arr is a parameter, so it is in scope from line 1; the element under the cursor
    // is bracketed so its position is visible without a loop counter.
    const items = arr.map((v, i) => (i === at && line >= 3 && line <= 5 ? `[${v}]` : String(v)));
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `secondLargest([${fmtArr(arr)}])`,
          vars,
          changed: x.changed ?? [],
          structs: [{ label: "arr", items }],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Return the second largest <b>distinct</b> number. That adjective is the whole difficulty: in <code class='inl'>[2, 3, 4, 6, 6]</code> the answer is <b>4</b>, not 6, because the two sixes count as one value. So this is a scan with two slots, and the work is deciding what is allowed to enter the second one.`,
    { focus: "param" },
  );

  S(
    2,
    `Both slots start at <code class='inl'>−Infinity</code>, not <code class='inl'>0</code>. A zero seed would beat every negative number to both slots, and <code class='inl'>[-3, -1, -2]</code> would return <b>0</b> — a value that is not in the array. <code class='inl'>−Infinity</code> loses to every real number, so the first element always lands somewhere. It also means a never-filled slot is visible in the result.`,
    { focus: "init", changed: ["first", "second"] },
  );

  for (at = 0; at < arr.length; at++) {
    const x = arr[at]!;
    const rec = x > first;
    S(
      4,
      `<code class='inl'>x = ${x}</code> against the maximum so far (${show(first)}). ${
        rec
          ? `It is larger, so it is a <b>new maximum</b>. Both assignments matter, and so does their order: <code class='inl'>second = first</code> runs first, so the old maximum${first === -Infinity ? ` (still −Infinity — this is the first element, so nothing real is demoted)` : ` (${first})`} drops into slot two before <code class='inl'>first</code> is overwritten. Swap those two statements and the old maximum is destroyed before it can be saved.`
          : `It is not larger, so it is not a record. Equal to the maximum or below it, the next line has to say which.`
      }`,
      {
        focus: "rec",
        eval: { expr: `x > first  →  ${x} > ${show(first)}`, val: rec },
        ...(rec ? { changed: ["first", "second", "x"] } : { changed: ["x"] }),
      },
    );
    if (rec) {
      second = first;
      first = x;
      continue;
    }

    const between = x < first && x > second;
    S(
      5,
      between
        ? `<code class='inl'>${x}</code> is below the maximum and above the second (${show(second)}), so it is the <b>new second</b>. Both halves are needed, and both are strict.`
        : x === first
          ? `<code class='inl'>x &lt; first</code> is <b>false</b>: ${x} equals the maximum. This is the word <b>distinct</b> doing its job — a repeat of the largest value is the same value, so it must not fill slot two. Remove this half of the test and a tie fills the second slot with a copy of the first; <code class='inl'>[2, 3, 4, 6, 6]</code> would answer 6.`
          : x === second
            ? `<code class='inl'>x &gt; second</code> is <b>false</b>: ${x} equals the second largest already held. A tie is the same value, so the slot is unchanged.`
            : `<code class='inl'>x &gt; second</code> is <b>false</b>: ${x} is below the second largest (${show(second)}), so it cannot change either slot.`,
      {
        focus: "mid",
        eval: {
          expr: `x < first && x > second  →  ${x} < ${show(first)} && ${x} > ${show(second)}`,
          val: between,
        },
        changed: between ? ["second", "x"] : ["x"],
      },
    );
    if (between) second = x;
  }
  at = -1;
  S(
    3,
    `The array is exhausted. Every element was compared against two numbers, once — no sorting, no second pass, no copy of the array.`,
    { focus: "x" },
  );
  S(
    7,
    `<b>Return ${show(second)}.</b> ${
      second === -Infinity
        ? `The second slot was never filled — the array has fewer than two distinct values — so the sentinel it started with comes back. The statement does not say what should happen here, and no official test asks.`
        : `That is the largest value strictly below the maximum <b>${first}</b>, which is exactly what "second largest distinct" means.`
    }`,
    { focus: "ret", done: true, result: show(second), ret: { value: show(second) } },
  );
  return steps;
}

export default {
  n: 46,
  id: "secondlargest",
  title: "2nd Largest",
  dates: ["2025-09-25"],
  statement: `Given an array, return the second largest <b>distinct</b> number. <span class="rule">Example: <code class="inl">secondLargest([2, 3, 4, 6, 6])</code> → <code class="inl">4</code> — the two 6s are one value, so the second largest is 4, not 6.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass, two slots",
      approach: `Keep the two biggest <i>distinct</i> values seen so far and update them as you scan; nothing needs sorting. Each element does one of three things. If it is greater than <code class='inl'>first</code> it is a new record, so the old maximum drops into <code class='inl'>second</code> and the element becomes <code class='inl'>first</code> — in that order, or the old maximum is lost. If it is strictly <i>between</i> the two it becomes the new <code class='inl'>second</code>. Anything else, including every tie, is ignored. The word <b>distinct</b> is carried entirely by two strict comparisons: <code class='inl'>x &lt; first</code> refuses a repeat of the maximum, <code class='inl'>x &gt; second</code> refuses a repeat of the second. Drop the first and <code class='inl'>[2, 3, 4, 6, 6]</code> answers 6. Both slots start at <code class='inl'>−Infinity</code> rather than 0, because a zero seed wins against every negative number and <code class='inl'>[-3, -1, -2]</code> would return 0, which is not in the array; the five official tests never send an all-negative array. A never-filled second slot (one distinct value) returns <code class='inl'>−Infinity</code>, which the statement does not cover. A single variant, deliberately: the alternative — <code class='inl'>[...new Set(arr)].sort((a, b) =&gt; b - a)[1]</code> — is correct and shorter, but on the official arrays its sort makes <b>3, 8, 3, 12, 2</b> comparisons against this scan's <b>4, 8, 6, 9, 17</b> if-tests, so there is no cost gap to see. (It needs the comparator: a bare <code class='inl'>.sort()</code> is lexicographic and puts 139 before 20.) Click <b>[2, 3, 4, 6, 6]</b> to watch a tie refused, then <b>[9, 7, 7, 3]</b> and <b>[-3, -1, -2]</b> — ours.`,
      code: `// One pass, two slots. "Distinct" is enforced by two STRICT comparisons.
function secondLargest(arr: number[]): number {
  // -Infinity, not 0: a 0 seed beats every negative, so [-3, -1, -2] would return 0.
  // It also doubles as "never filled": a single distinct value returns -Infinity.
  let first = -Infinity, second = -Infinity;
  for (const x of arr) {
    if (x > first) {
      // New record: demote the old maximum BEFORE overwriting it, or it is lost.
      second = first;
      first = x;
    } else if (x < first && x > second) {
      // Between the two. x < first refuses a repeat of the maximum ([2,3,4,6,6]
      // would answer 6 without it); x > second refuses a repeat of the second.
      second = x;
    }
  }
  return second;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "first / second slots",
      approach: `The scan one element per step, with the two slots in the state panel and the element under the cursor bracketed in the array. Start on <b>2, 3, 4, 6, 6</b> — official — where the final 6 is refused on line 5 because it equals the maximum, which is what <b>distinct</b> means. <b>10, -17, 55.5, 44, 91, 0</b> has a decimal and an out-of-order maximum, so the old maximum gets demoted twice. <b>-3, -1, -2</b> is ours: every value negative, which is why the slots start at <code class='inl'>−Infinity</code>. <b>7, 7, 7</b> is ours too, and never fills the second slot. Type any numbers, separated by commas or spaces. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "arr =",
            value: fmtArr(OFFICIAL[2]!),
            presets: CASES.map(fmtArr),
            hint: `numbers, up to ${MAX_LEN}`,
          },
        }),
    },
  ],
} satisfies Challenge;
