// #53 · Decimal to Binary — remainders come out rightmost-first, so prepend; guard zero.
// The statement hands over the algorithm: divide by 2, record the remainder, repeat until
// the number is zero, read the remainders last to first. Everything left is the two
// places that recipe is quietly wrong or awkward. "Last to first" is because n = 2q + r
// makes r the RIGHTMOST digit, so the string is born backwards — prepend each remainder
// (or push and reverse) rather than appending. And "repeat until the number is zero" has
// a hole at zero itself: it is already zero, the loop never runs, and the answer comes
// back as the empty string. The statement allows 0 ("non-negative"); the grader never
// asks. The mirror problem is #52 (Binary to Decimal), which reads the digits left to
// right and folds them back in with `* 2 + bit`.
// ONE approach, deliberately. Subtracting the largest power of two, or building from
// the top bit down, is the same decomposition run from the other end, and
// n.toString(2) is a library call — a "worse" second variant would have to waste work
// on purpose, which is a strawman (CONTRIBUTING Tier 3 §1). The demo instead shows the
// remainder ladder from the statement, plus the two near-miss versions that look right.
// Click 0 or 2147483648 — ours, not freeCodeCamp's — to watch the empty string and a
// `>> 1` loop that stops after one digit.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 4 official freeCodeCamp cases in the grader's order, then two of ours. The
// official fixture text and its assertions agree on all four — no un-run input here.
//   0 — ours. "Non-negative integer" includes it, and it is the one input where the
//     recipe's own stopping rule fires before any division happens.
//   2147483648 (2^31) — ours. The first value a `>> 1` loop cannot halve: bitwise
//     operators coerce to signed 32-bit, 2^31 becomes -2^31, the `> 0` test fails, and
//     the loop stops after a single digit. Exact with Math.floor(n / 2).
const CASES = [5, 12, 50, 99, 0, 2 ** 31];
const OFFICIAL = 4; // CASES[0..3] are freeCodeCamp's; the rest are ours.

// The grader's own answers, so the demo shows a verdict instead of asking for trust.
const EXPECTED: Record<number, string> = { 5: "101", 12: "1100", 50: "110010", 99: "1100011" };

// The graded function, kept verbatim so the demo cannot drift from the answer.
const solve = (decimal: number) => {
  if (decimal === 0) return "0";
  let bits = "";
  while (decimal > 0) {
    bits = (decimal % 2) + bits;
    // oxlint-disable-next-line eslint/no-param-reassign -- graded solution kept verbatim (and its near-misses mirror it), so the argument is mutated by design
    decimal = Math.floor(decimal / 2);
  }
  return bits;
};
// Near-misses: the same loop without the zero line, and with a 32-bit halving.
const noGuard = (decimal: number) => {
  let bits = "";
  while (decimal > 0) {
    bits = (decimal % 2) + bits;
    // oxlint-disable-next-line eslint/no-param-reassign -- graded solution kept verbatim (and its near-misses mirror it), so the argument is mutated by design
    decimal = Math.floor(decimal / 2);
  }
  return bits;
};
const halfShift = (decimal: number) => {
  let bits = "";
  while (decimal > 0) {
    bits = (decimal % 2) + bits;
    // oxlint-disable-next-line eslint/no-param-reassign -- near-miss mirrors the graded solution, so the argument is mutated by design
    decimal = decimal >> 1;
  }
  return bits;
};
// The inverse, which is exactly #52's solution — used here as a round-trip check.
const toDecimal = (binary: string) => {
  let n = 0;
  for (const b of binary) n = n * 2 + Number(b);
  return n;
};

// One row per division, exactly as the statement writes them.
function ladder(n: number) {
  const rows: { n: number; q: number; r: number }[] = [];
  for (let m = n; m > 0; m = Math.floor(m / 2)) rows.push({ n: m, q: Math.floor(m / 2), r: m % 2 });
  return rows;
}

const fmt = (x: number) => x.toLocaleString("en-US");
const q = (s: string) => JSON.stringify(s);
const MAX = Number.MAX_SAFE_INTEGER; // past 2^53 the input itself stops being an exact integer

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .db-wrap { display:flex; flex-direction:column; gap:11px; }
    .db-ladder { display:flex; flex-wrap:wrap; gap:5px; }
    .db-div { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .db-div b { color:var(--accent); font-size:14px; }
    .db-div.one b { color:var(--text); }
    .db-cells { display:flex; flex-wrap:wrap; gap:4px; align-items:stretch; }
    .db-cell { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:34px; padding:5px 4px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); font-family:var(--mono); color:var(--muted); }
    .db-cell b { font-size:15px; color:var(--text); }
    .db-cell .k { font-size:10px; }
    .db-cell.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 11%, transparent); }
    .db-arrow { font:12px var(--sans); color:var(--muted); }
    .db-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .db-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .db-r b { color:var(--text); }
    .db-r.hot { border-color:var(--danger); color:var(--danger); }
    .db-r.hot b { color:var(--danger); }
    .db-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .db-cmp b { font-family:var(--mono); color:var(--text); }
    .db-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .db-cmp.split b { color:var(--danger); }
  `,
    ),
  );
}

const show = (s: string) => (s === "" ? `""` : `"${s}"`);

function mount(host: HTMLElement) {
  ensureStyle();
  let n = 12;

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "number";
  inp.min = "0";
  inp.max = String(MAX);
  inp.value = String(n);
  inp.style.width = "170px";
  ctl.append(
    el("span", "ctl-label", "decimal ="),
    inp,
    el("span", "ctl-label", "(non-negative integer)"),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", String(v));
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      n = v;
      inp.value = String(v);
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  // Keep the last good value while the box is empty or mid-edit, instead of
  // rendering NaN; clamp the rest into the range the statement promises.
  inp.addEventListener("input", () => {
    const v = Math.floor(+inp.value);
    if (inp.value.trim() !== "" && !Number.isNaN(v)) n = Math.min(MAX, Math.max(0, v));
    render();
  });
  render();

  function render() {
    const bits = solve(n);
    const rows = ladder(n);
    const want = EXPECTED[n];
    const bare = noGuard(n),
      half = halfShift(n);
    const back = toDecimal(bits);

    out.innerHTML = "";
    const wrap = el("div", "db-wrap");

    const line = el("div", "result-line");
    line.append(el("span", "badge ok", `toBinary(${n}) → "${bits}"`));
    if (want !== undefined)
      line.append(
        el(
          "span",
          "db-cmp" + (bits === want ? "" : " split"),
          bits === want
            ? `matches freeCodeCamp's expected <b>"${want}"</b>`
            : `freeCodeCamp expects <b>"${want}"</b>`,
        ),
      );
    line.append(el("span", "more", `${rows.length} division${rows.length === 1 ? "" : "s"}`));
    wrap.append(line);

    // The statement's own table. The remainder is the bold part: those are the digits.
    const lad = el("div", "db-ladder");
    if (rows.length === 0)
      lad.append(el("div", "db-div", `<b>0</b> is already zero — no division happens at all`));
    rows.forEach((r) =>
      lad.append(
        el("div", "db-div" + (r.r ? " one" : ""), `${fmt(r.n)} ÷ 2 = ${fmt(r.q)} r <b>${r.r}</b>`),
      ),
    );
    wrap.append(lad);

    // The answer, with its columns labelled — read from the LAST remainder to the first.
    const cells = el("div", "db-cells");
    const len = bits.length;
    Array.from(bits).forEach((b, i) =>
      cells.append(
        el(
          "div",
          "db-cell" + (b === "1" ? " on" : ""),
          `<span class="k">2<sup>${len - 1 - i}</sup></span><b>${b}</b>`,
        ),
      ),
    );
    wrap.append(cells);
    wrap.append(
      el(
        "div",
        "db-arrow",
        rows.length > 0
          ? `read the remainders <b>bottom to top</b> — the first one recorded is the rightmost digit`
          : `the guard line supplies the only digit`,
      ),
    );

    const rr = el("div", "db-rows");
    rr.append(el("div", "db-r", `n.toString(2) <b>"${n.toString(2)}"</b>`));
    rr.append(
      el(
        "div",
        "db-r" + (bare !== bits ? " hot" : ""),
        `no zero guard <b>${show(bare)}</b>${bare !== bits ? " ✗" : ""}`,
      ),
    );
    rr.append(
      el(
        "div",
        "db-r" + (half !== bits ? " hot" : ""),
        `n &gt;&gt; 1 instead of floor <b>${show(half)}</b>${half !== bits ? " ✗" : ""}`,
      ),
    );
    rr.append(
      el("div", "db-r", `back through #52: toDecimal <b>${fmt(back)}</b>${back === n ? " ✓" : ""}`),
    );
    wrap.append(rr);

    wrap.append(el("div", "note", noteFor(n, bits, rows.length, bare, half)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing, because every
// preset was chosen to land on a different one.
function noteFor(n: number, bits: string, steps: number, bare: string, half: string) {
  if (n === 0)
    return `The recipe says "repeat until the number is zero", and this number is <b>already</b> zero — so the loop body never runs and, without line 2, the function returns <b>${show(bare)}</b>: a perfectly valid string of no digits, and not the answer. The statement promises a <b>non-negative</b> integer, which includes 0, and 0 is the one input where the algorithm has nothing to divide. The fix is a line that returns <code class='inl'>"0"</code> up front; every other input runs the loop at least once and never needs it. freeCodeCamp's four cases are all positive, so the grader cannot see this hole.`;
  if (half !== bits)
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- the note shows the int32 wrap of `| 0`, which Math.trunc does not do
    return `The answer is a <b>${bits.length}-digit</b> string, and the <code class='inl'>&gt;&gt; 1</code> version returns <b>${show(half)}</b>. JavaScript's bitwise operators coerce their operand to a <b>signed 32-bit</b> integer, so <code class='inl'>${fmt(n)} &gt;&gt; 1</code> reads <b>${fmt(n)}</b> as <b>${fmt(n | 0)}</b>, so from the second pass on the loop is halving a different number — here the <code class='inl'>&gt; 0</code> test ${(n | 0) <= 0 ? "fails at once and ends the loop after a single digit" : "keeps going on the wrapped value and returns the wrong digits"}. Shifting feels like the natural way to halve a binary number and it works on every value below 2<sup>31</sup>, which is why the official cases cannot catch it. <code class='inl'>Math.floor(n / 2)</code> is exact on any integer up to 2<sup>53</sup> and costs one extra function call.`;
  if (/^10*$/u.test(bits) && n > 1)
    return `<b>${fmt(n)}</b> is a power of two, so every remainder is <b>0</b> until the very last division, where the quotient finally reaches <code class='inl'>1 ÷ 2 = 0 r 1</code>. That is why the answer is a single <code class='inl'>1</code> followed by <b>${steps - 1}</b> zeros: a power of two has exactly one bit set. The leading <code class='inl'>1</code> is the <i>last</i> remainder recorded, which is the reason the string has to be read from the other end.`;
  const odd = n % 2 === 1;
  return `<b>${steps}</b> divisions, and the first one already tells you something: <code class='inl'>${fmt(n)} ÷ 2</code> leaves remainder <b>${n % 2}</b>, so the number is ${odd ? "odd" : "even"} and the <b>rightmost</b> digit of the answer is <b>${n % 2}</b>. That is the whole reason for "read the remainders last recorded to first": <code class='inl'>n = 2q + r</code> makes <code class='inl'>r</code> the 2<sup>0</sup> digit and hands you <code class='inl'>q</code> to peel the next digit from, so the digits come out <b>right to left</b> and the string is born backwards. Prepending each one — <code class='inl'>bits = (n % 2) + bits</code> — does the reversal for free. The bottom row runs the result back through #52 (Binary to Decimal): <b>${fmt(toDecimal(bits))}</b> again, since that problem folds the digits in from the left exactly as this one peels them off the right.`;
}

// ── STEP — the division loop, one remainder per pass ────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">toBinary</span>(<span class="tok" data-t="arg">decimal</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">if</span> (<span class="tok" data-t="zero">decimal === <span class="nu">0</span></span>) <span class="k">return</span> <span class="st">"0"</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">let</span> <span class="tok" data-t="bits">bits = <span class="st">""</span></span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">while</span> (<span class="tok" data-t="test">decimal &gt; <span class="nu">0</span></span>) {`,
  },
  {
    ln: 5,
    html: `    <span class="tok" data-t="rem">bits = (decimal % <span class="nu">2</span>) + bits</span>;`,
  },
  {
    ln: 6,
    html: `    <span class="tok" data-t="half">decimal = Math.<span class="fn">floor</span>(decimal / <span class="nu">2</span>)</span>;`,
  },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">bits</span>;` },
  { ln: 9, html: `}` },
];

function trace(input: number) {
  const start = Math.min(MAX, Math.max(0, Math.floor(input) || 0));
  const steps: DbgStep[] = [];
  let decimal = start,
    bits = "";
  const recorded: number[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string | undefined;
      changed?: string[] | undefined;
      eval?: { expr: string; val: boolean } | undefined;
      done?: boolean | undefined;
      result?: string | undefined;
      ret?: { value: string } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = { decimal };
    if (line >= 3) vars["bits"] = q(bits); // `let bits` is line 3
    // The remainders, in the order they were recorded. Same gating as `bits`: it
    // exists from line 3 on and then stays, only its contents grow.
    const structs =
      line >= 3
        ? [{ label: "remainders, in order recorded", items: [...recorded], newest: true }]
        : [];
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        { title: `toBinary(${start})`, vars, changed: x.changed ?? [], structs, ret: x.ret },
      ],
    });
  };

  S(
    1,
    `Convert <b>${fmt(start)}</b> to base 2 by the statement's own recipe: divide by 2, <b>record the remainder</b>, repeat until the number is zero, then read the remainders from last to first. Two things to watch: <i>why</i> "last to first", and what the recipe does when the number is <b>already</b> zero. (#52, the inverse, goes the other way and reads the digits left to right.)`,
    { focus: "arg" },
  );

  if (start === 0) {
    S(
      2,
      `<b>decimal === 0</b> is true, so the function returns <b>"0"</b> without looking further. Take this line out and the recipe's own stopping rule — "until the number is zero" — fires immediately: the loop never runs, <code class='inl'>bits</code> stays <code class='inl'>""</code>, and the function returns an empty string, which is a string of no digits rather than the digit zero. 0 is the one input that has nothing to divide, and "non-negative" in the statement means it can arrive. The official cases are all positive, so only this line stands between you and a hidden bug.`,
      {
        focus: "zero",
        eval: { expr: "decimal === 0", val: true },
        done: true,
        result: q("0"),
        ret: { value: q("0") },
      },
    );
    return steps;
  }

  S(
    2,
    `<b>${fmt(start)}</b> is not 0, so the guard falls through. It exists for exactly one input: 0, where "repeat until the number is zero" has no division to do and the loop below would hand back an empty string. Everything else runs the loop at least once. Try the <b>0</b> preset to see it fire.`,
    { focus: "zero", eval: { expr: "decimal === 0", val: false } },
  );

  S(
    3,
    `<code class='inl'>bits</code> starts as an empty <i>string</i>, not a number: binary here is a sequence of characters, and it is built one character at a time. It starts empty so the first remainder is the whole string.`,
    { focus: "bits", changed: ["bits"] },
  );

  let pass = 0;
  while (decimal > 0) {
    pass++;
    S(
      4,
      `<b>${fmt(decimal)} &gt; 0</b> — still digits left to peel. Each pass removes exactly one binary digit from the number, so this loop runs once per digit: <b>${solve(start).length}</b> times for ${fmt(start)}.`,
      { focus: "test", eval: { expr: `${decimal} > 0`, val: true } },
    );

    const r = decimal % 2,
      before = bits,
      was = decimal;
    bits = r + bits;
    recorded.push(r);
    S(
      5,
      `<b>${fmt(was)} % 2 = ${r}</b>, so ${fmt(was)} is ${r ? "odd" : "even"} and its <b>rightmost</b> binary digit is <b>${r}</b>. That is what a remainder <i>means</i> here: <code class='inl'>n = 2q + r</code> puts <code class='inl'>r</code> in the 2<sup>0</sup> column. It goes on the <b>front</b> of the string, ${before ? `ahead of <code class='inl'>"${before}"</code>` : `where nothing else is yet`}, because every digit found later is worth more and belongs further left. Appending would build <code class='inl'>"${[...recorded].join("")}"</code> — the same digits in the wrong order.`,
      { focus: "rem", changed: ["bits"] },
    );

    decimal = Math.floor(decimal / 2);
    S(
      6,
      `<b>${fmt(was)} ÷ 2 = ${fmt(decimal)}</b>${decimal === 0 ? `, and that is the stopping rule from the statement: the number has reached zero` : `, with the remainder already banked`}. <code class='inl'>Math.floor</code> because the true quotient of an odd number is a fraction (${fmt(was)} / 2 is ${was / 2}), and the leftover half is exactly the remainder just recorded. Not <code class='inl'>&gt;&gt; 1</code>: that halves too, but coerces to signed 32-bit and breaks from 2<sup>31</sup> up.`,
      { focus: "half", changed: ["decimal"] },
    );
  }

  S(
    4,
    `<b>0 &gt; 0</b> is false — the number has been divided down to nothing, so every digit has been recorded and the loop ends after <b>${pass}</b> pass${pass === 1 ? "" : "es"}.`,
    { focus: "test", eval: { expr: "0 > 0", val: false } },
  );

  S(
    8,
    `<b>Return ${q(bits)}.</b> The remainders were recorded as <b>${recorded.join(", ")}</b>; the string reads them in the opposite order because each one was prepended, which is the statement's "last recorded to first" done as it goes. Check it by running it back through #52 (Binary to Decimal): folding ${q(bits)} left to right with <code class='inl'>* 2 + bit</code> gives <b>${fmt(toDecimal(bits))}</b>, the number we started with.`,
    { focus: "ret", done: true, result: q(bits), ret: { value: q(bits) } },
  );

  return steps;
}

export default {
  n: 53,
  id: "to-binary",
  title: "Decimal to Binary",
  dates: ["2025-10-02"],
  statement: `Given a <b>non-negative integer</b>, return its <b>binary</b> representation as a string. To convert, repeatedly <b>divide by 2</b> and record the remainder until the number is zero, then read the remainders from <b>last recorded to first</b>. <span class="rule">Example: <code class="inl">toBinary(12)</code> → <code class="inl">"1100"</code> — 12 ÷ 2 = 6 r 0, 6 ÷ 2 = 3 r 0, 3 ÷ 2 = 1 r 1, 1 ÷ 2 = 0 r 1, read bottom to top.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(log n) — one division per binary digit",
      approach: `The statement is the algorithm, so the interesting part is the two places where following it literally goes wrong or goes backwards. <b>"Last recorded to first"</b> is not a stylistic note. Writing <code class='inl'>n = 2q + r</code> makes <code class='inl'>r</code> the <b>rightmost</b> digit and gives you <code class='inl'>q</code> to peel the next one from, so digits come out right to left and the string is born reversed. Prepend each remainder — <code class='inl'>bits = (n % 2) + bits</code> — and the reversal happens as you go; append and you need a <code class='inl'>.reverse()</code> at the end. The loop count is the number of binary digits, <code class='inl'>⌊log₂ n⌋ + 1</code>, which is why the cost is logarithmic: doubling the input adds <i>one</i> pass. The second place is <b>zero</b>. "Repeat until the number is zero" is already satisfied by 0, so the loop never runs and the function returns <code class='inl'>""</code> — an empty string, a perfectly valid value that is not the answer. The statement asks for a <i>non-negative</i> integer, which includes 0; the four official cases are all positive, so the grader cannot see it, and one guard line fixes it. A third trap sits in the halving: <code class='inl'>Math.floor(n / 2)</code> is exact up to 2<sup>53</sup>, but <code class='inl'>n &gt;&gt; 1</code> looks shorter and quietly coerces to signed 32-bit, so from 2<sup>31</sup> up the <code class='inl'>&gt; 0</code> test fails and the loop stops after one digit — click <b>2147483648</b>. The demo lays out the statement's own division table, then runs the near-misses next to the answer, then pushes the result back through #52 (Binary to Decimal): that problem folds digits in from the left, this one peels them off the right, and composing them must return the original number. <code class='inl'>n.toString(2)</code> is the one-liner you would ship; it agrees on every input, and the point of the exercise is the loop it hides.`,
      code: `// Divide by 2, record the remainder, repeat until the number is zero. The remainder
// is the RIGHTMOST remaining digit, so each one is prepended — the digits are found
// last-to-first and this builds the string in reading order as it goes.
function toBinary(decimal: number): string {
  if (decimal === 0) return "0"; // the loop never runs for 0, and would return ""
  let bits = "";
  while (decimal > 0) {
    bits = (decimal % 2) + bits;
    decimal = Math.floor(decimal / 2); // not >> 1: that is signed 32-bit and breaks at 2^31
  }
  return bits;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "one remainder per pass",
      approach: `The division loop, one remainder per pass, with the remainders in the order they were recorded shown as boxes next to the string they build. Start on <b>12</b> — the statement's own example — and watch <code class='inl'>bits</code> grow from the <b>front</b>: <code class='inl'>"0"</code>, <code class='inl'>"00"</code>, <code class='inl'>"100"</code>, <code class='inl'>"1100"</code>. <b>5</b>, <b>50</b> and <b>99</b> are the other official cases, and 99 is seven passes of mixed remainders. <b>0</b> is ours and stops on line 2 — the only input that guard is for. <b>2147483648</b> is ours too: 32 passes, with a note on line 6 about why the halving is <code class='inl'>Math.floor</code> and not a shift. Type any non-negative integer up to 2<sup>53</sup> − 1. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "decimal =",
            value: 12,
            min: 0,
            max: MAX,
            presets: CASES,
            hint: "non-negative integer",
          },
        }),
    },
  ],
} satisfies Challenge;
