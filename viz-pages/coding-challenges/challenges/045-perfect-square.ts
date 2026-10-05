// #45 · Perfect Square — floor the root, square it back; isInteger(√n) alone lies past 2^52.
// • BRUTE — Try every root: walk i = 0, 1, 2… and test i * i === n, stopping once i * i
//   passes n. Correct on every input, and it costs a try per root up to √n whether the
//   answer is yes or no — 160 of them for the official 25281, a million for 10^12.
// • OPT — Math.floor(Math.sqrt(n)) is the only integer that COULD be the root, so square
//   it back and compare: one sqrt, one multiply, no search. The statement's own
//   definition ("multiply an integer by itself") run exactly once.
// Be honest about the size of the win: the brute passes all 8 official tests too, and on
// the grader's inputs (the largest is 25281, so 160 tries) it is a constant-factor win;
// it is a real asymptotic one (O(√n) vs O(1)) only on inputs the grader never sends.
// The comparison back to n is NOT optional. The famous one-liner Number.isInteger(
// Math.sqrt(n)) passes every official test and is wrong from 2^52 up: 2^52 + 1 is not a
// square, but its root is 2^-27 from 67108864 — less than half the gap between doubles
// there — so the sqrt rounds to exactly 67108864. Those two cases are ours.
// Load 4503599627370497 on the opt demo: the one-liner says square, the back-check says no.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 8 official freeCodeCamp cases in the grader's order (expected: T T T F F F T T).
// Then ours, which the grader never sends:
//   1000000 — a large square both demos can take: the brute needs 1,001 tries, the opt 1.
//   4503599627370496 (2^52) and 4503599627370497 (2^52 + 1) — opt demo only (the brute
//     would need 67 million tries). The first IS a square, the second is NOT, and the
//     one-liner Number.isInteger(Math.sqrt(n)) answers "true" to both. This is the
//     input where "check that the root is an integer" and "check that the root
//     squares back to n" stop being the same question.
const OFFICIAL = [9, 49, 1, 2, 99, -9, 0, 25281];
const BRUTE_CASES = [...OFFICIAL, 1000000];
const OPT_CASES = [...OFFICIAL, 1000000, 4503599627370496, 4503599627370497];

const BRUTE_MAX = 1e12; // a million tries: still instant, still legible as a count
const TRACE_MAX = 40000; // 201 steps; keeps the step-through scrubbable

// The graded one-liner, kept verbatim so the demos can't drift from the answer.
const solve = (n: number) => {
  const r = Math.floor(Math.sqrt(n));
  return r * r === n;
};
// The popular shortcut. Shown only to be contrasted — it is not a variant.
const naive = (n: number) => Number.isInteger(Math.sqrt(n));

// Exact integer floor-root for the safe-integer range, used only to count the brute's
// tries for an input that is too big to loop through on screen.
const isqrt = (n: number) => {
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
};
const tries = (n: number) => (n < 0 ? 0 : isqrt(n) + 1); // loop bodies run for i = 0..√n
const fmt = (x: number) => x.toLocaleString("en-US");
const num = (x: number) => String(x).slice(0, 22);

// The brute, run for real and counted. The loop body runs once per try.
function bruteRun(n: number) {
  let count = 0,
    i = 0;
  for (; i * i <= n; i++) {
    count++;
    if (i * i === n) return { count, hit: true, last: i };
  }
  return { count, hit: false, last: i };
}

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .ps-wrap { display:flex; flex-direction:column; gap:12px; }
    .ps-in { width:190px; }
    .ps-rows { display:flex; flex-direction:column; gap:5px; }
    .ps-row { display:grid; grid-template-columns:170px minmax(0,1fr) auto; gap:10px; align-items:baseline; padding:6px 10px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); font:12.5px var(--mono); }
    .ps-row .k { color:var(--accent); } .ps-row .v { font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis; }
    .ps-row .c { font:12px var(--sans); color:var(--muted); }
    .ps-row.bad { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .ps-row.bad .v, .ps-row.bad .c { color:var(--danger); }
    .ps-row.good { border-color:var(--good); }
    .ps-cap { font:12px var(--sans); color:var(--warn); }
    @media (max-width:640px) { .ps-row { grid-template-columns:minmax(0,1fr); } }
  `,
    ),
  );
}

// A number box + the preset chips, shared by both demos. Chips come off the case list,
// so a case added there can never go unreachable; the box covers everything between.
function frame(host: HTMLElement, cases: number[], max: number, onChange: (n: number) => void) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input", "ps-in");
  inp.type = "number";
  inp.step = "1";
  inp.value = "25281";
  const set = (v: number) => {
    const n = Math.max(-max, Math.min(max, Math.trunc(v) || 0));
    inp.value = String(n);
    onChange(n);
  };
  inp.addEventListener("input", () => set(+inp.value));
  ctl.append(el("span", "ctl-label", "n ="), inp);
  const pre = el("div", "controls");
  cases.forEach((c) => {
    const b = el("button", "chip", String(c));
    b.title = OFFICIAL.includes(c) ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => set(c));
    pre.append(b);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  return { out, start: () => set(+inp.value) };
}

// ── BRUTE demo — the squares laid out in a row until one lands on n or jumps it ──
function mountBrute(host: HTMLElement) {
  const { out, start } = frame(host, BRUTE_CASES, BRUTE_MAX, render);
  start();

  function render(n: number) {
    const r = bruteRun(n);
    const total = r.count;
    out.innerHTML = "";
    const wrap = el("div", "ps-wrap");
    wrap.append(
      el(
        "div",
        "result-line",
        `<span class="badge ${r.hit ? "ok" : "no"}">isPerfectSquare(${fmt(n)}) → ${r.hit}</span>` +
          `<span class="opcount hot"><span class="n">${fmt(total)}</span> ${total === 1 ? "try" : "tries"}</span>` +
          `<span class="more">the other approach: 1 sqrt, 1 multiply</span>`,
      ),
    );

    // Every try is a tile showing i². Past 36 tries the middle is elided so the strip
    // keeps its shape: the first tiles show the walk starting, the last show it ending.
    const idx: (number | "gap")[] = [];
    const lastI = r.last; // when !hit: the first i with i*i > n
    const upto = r.hit ? r.last : n < 0 ? -1 : r.last - 1;
    const shown = upto + 1;
    if (shown <= 36) for (let i = 0; i <= upto; i++) idx.push(i);
    else {
      for (let i = 0; i < 14; i++) idx.push(i);
      idx.push("gap");
      for (let i = upto - 5; i <= upto; i++) idx.push(i);
    }
    const grid = el("div", "cand-grid");
    idx.forEach((i) => {
      if (i === "gap") {
        grid.append(el("span", "more", `… ${fmt(shown - 20)} more …`));
        return;
      }
      const hit = r.hit && i === r.last;
      grid.append(el("span", "cand " + (hit ? "pass" : "fail"), `${i}² = ${fmt(i * i)}`));
    });
    if (!r.hit && n >= 0)
      grid.append(el("span", "cand", `${fmt(lastI)}² = ${fmt(lastI * lastI)} &gt; n — stop`));
    if (n < 0) grid.append(el("span", "cand", `0² = 0 &gt; ${fmt(n)} — stop before the first try`));
    wrap.append(grid);
    wrap.append(el("div", "note", noteBrute(n, r)));
    out.append(wrap);
  }
}

function noteBrute(n: number, r: { count: number; hit: boolean; last: number }) {
  if (n < 0)
    return `<b>Zero tries.</b> The loop test <code class='inl'>i * i &lt;= n</code> is <code class='inl'>0 &lt;= ${n}</code> before the body ever runs, so a negative is rejected by the loop condition itself — no guard line needed. A square cannot be negative, and a search that only ever looks at <code class='inl'>i * i</code> was never going to find one. The official <code class='inl'>-9</code> is the only case that gets here.`;
  if (n === 0 || n === 1)
    return `<b>${n}</b> is its own square, found on the try <code class='inl'>i = ${n}</code>. The reason to look at this case is the loop test: it is <code class='inl'>&lt;=</code>, not <code class='inl'>&lt;</code>. Write <code class='inl'>i * i &lt; n</code> and ${n === 0 ? `the body never runs for 0, so the function returns <b>false</b> for the most obviously square number there is` : `the loop exits at <code class='inl'>i = 1</code> without testing it, so 1 comes back <b>false</b>`}. The squares of 0 and 1 are the boundary the grader checks on purpose.`;
  if (r.hit)
    return `Found on try <b>${fmt(r.count)}</b>: <code class='inl'>${fmt(r.last)} * ${fmt(r.last)} = ${fmt(n)}</code>. The tries are the roots <b>0 … ${fmt(r.last)}</b>, so the cost is the size of the root and not the size of <code class='inl'>n</code> — √${fmt(n)} is ${fmt(r.last)}. That is the whole case for this approach (correct, one idea, impossible to get subtly wrong) and the whole case against it: a <b>yes</b> costs exactly as much as a <b>no</b> would have, because you must climb to the root to know. The other approach asks one question instead of ${fmt(r.count)}.`;
  const lo = r.last - 1;
  return `Never found, and the loop only stops because it <i>overshot</i>: <code class='inl'>${fmt(lo)}² = ${fmt(lo * lo)}</code> is below <b>${fmt(n)}</b> and <code class='inl'>${fmt(r.last)}² = ${fmt(r.last * r.last)}</code> is above it. Consecutive squares are <code class='inl'>2i + 1</code> apart, so <code class='inl'>n</code> sat in a gap and no <code class='inl'>i * i</code> could equal it. A <b>no</b> costs the same <b>${fmt(r.count)}</b> tries a <b>yes</b> on a neighbouring square would — the search has no way to say "not a square" without reaching √n first. The two answers differ only in which tile turns green.`;
}

// ── OPT demo — sqrt, floor, square back, with the one-liner shown beside it ──────
function mountOpt(host: HTMLElement) {
  const { out, start } = frame(host, OPT_CASES, Number.MAX_SAFE_INTEGER, render);
  start();

  function render(n: number) {
    const exact = Math.sqrt(n),
      root = Math.floor(exact),
      sq = root * root;
    const ok = solve(n),
      short = naive(n),
      t = tries(n);
    out.innerHTML = "";
    const wrap = el("div", "ps-wrap");
    wrap.append(
      el(
        "div",
        "result-line",
        `<span class="badge ${ok ? "ok" : "no"}">isPerfectSquare(${fmt(n)}) → ${ok}</span>` +
          `<span class="opcount cool"><span class="n">1</span> sqrt · 1 multiply</span>` +
          `<span class="more">the other approach: ${n < 0 ? "0 tries" : `${fmt(t)} tries`}</span>`,
      ),
    );

    const row = (k: string, v: string, c: string, cls = "") =>
      `<div class="ps-row ${cls}"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="c">${c}</span></div>`;
    const rows = el("div", "ps-rows");
    rows.innerHTML =
      row(
        "Math.sqrt(n)",
        Number.isNaN(exact) ? "NaN" : num(exact),
        Number.isNaN(exact)
          ? "no real root"
          : Number.isInteger(exact)
            ? "lands on an integer"
            : "has a fraction",
      ) +
      row("Math.floor(…)", Number.isNaN(root) ? "NaN" : String(root), "the one candidate root") +
      row("root * root", Number.isNaN(sq) ? "NaN" : fmt(sq), `compare to n = ${fmt(n)}`) +
      row(
        "=== n",
        String(ok),
        ok ? "squares back to n" : "does not square back",
        ok ? "good" : "",
      ) +
      row(
        "Number.isInteger(Math.sqrt(n))",
        String(short),
        short === ok
          ? "the shortcut agrees here"
          : "the shortcut DISAGREES — it is wrong on this input",
        short === ok ? "" : "bad",
      );
    wrap.append(rows);
    if (n > 2 ** 52)
      wrap.append(
        el(
          "div",
          "ps-cap",
          "Past 2^52 the gap between neighbouring doubles is 1 or more, so a double no longer separates n from n + 1 by itself — the integer back-check is what keeps this correct.",
        ),
      );
    wrap.append(el("div", "note", noteOpt(n, exact, root, ok, short)));
    out.append(wrap);
  }
}

function noteOpt(n: number, exact: number, root: number, ok: boolean, short: boolean) {
  if (short !== ok)
    return `<b>The shortcut is wrong here, and no official test shows it.</b> <code class='inl'>Math.sqrt(${fmt(n)})</code> is <b>${num(exact)}</b> — an integer — so <code class='inl'>Number.isInteger</code> answers <b>true</b>. But ${fmt(n)} is <b>${fmt(root * root)} + ${fmt(n - root * root)}</b>, not a square. The true root is ${fmt(root)} plus about <code class='inl'>1 / (2 × ${fmt(root)})</code>, and that sliver is smaller than half the spacing between doubles at this size, so the correctly-rounded sqrt swallows it. Floating point did not make a mistake; it answered a question about <i>doubles</i>. Squaring the floored root back gives ${fmt(root * root)}, which is not ${fmt(n)}, and that comparison is in integers, which are exact up to 2^53. The check against <code class='inl'>n</code> is not a belt-and-braces extra — it is the actual test.`;
  if (n < 0)
    return `<code class='inl'>Math.sqrt(${n})</code> is <b>NaN</b>, and <code class='inl'>NaN * NaN === n</code> is false, so a negative would come back <b>false</b> even with no guard — by accident. The line-2 guard says it on purpose: no real number squared is negative, so there is nothing to compute. Writing the guard costs one line; relying on <code class='inl'>NaN</code> costs the next reader the question of why it works.`;
  if (ok && n > 2 ** 52)
    return `A genuine square at a size where doubles are already coarse: <code class='inl'>${fmt(root)}² = ${fmt(n)}</code> exactly, and <code class='inl'>Math.sqrt</code> returns <b>${fmt(root)}</b> with nothing to spare. Here the shortcut gives the right answer — and so it did for the neighbour <b>${fmt(n + 1)}</b>, which it also called square. Load that one: same sqrt, opposite truth. A check that cannot tell <code class='inl'>${fmt(n)}</code> from <code class='inl'>${fmt(n + 1)}</code> is not testing the number.`;
  if (n === 0 || n === 1)
    return `<code class='inl'>Math.sqrt(${n})</code> is exactly <b>${n}</b>, so the floor does nothing and <code class='inl'>${n} * ${n} === ${n}</code>. The cheap way to get this wrong is a bound — "n &gt; 1" or "root &gt; 1" to skip trivial cases — which turns 0 and 1 into <b>false</b>. Neither needs special treatment: the arithmetic is already right, and the official set includes both on purpose.`;
  if (ok)
    return `<code class='inl'>Math.sqrt(${fmt(n)})</code> is <b>${fmt(exact)}</b> with no fraction, so the floor is a no-op and <code class='inl'>${fmt(root)} * ${fmt(root)}</code> lands on <b>${fmt(n)}</b>. IEEE 754 requires <code class='inl'>sqrt</code> to be correctly rounded, which is why a true square always returns its exact integer root up to 2^53 — nothing here needs an epsilon. The brute walk needed <b>${fmt(tries(n))}</b> tries to reach the same root; this reaches it in one call.`;
  return `<code class='inl'>Math.sqrt(${fmt(n)})</code> is <b>${num(exact)}</b>, so the only integer that could be its root is <b>${fmt(root)}</b> — and <code class='inl'>${fmt(root)} * ${fmt(root)}</code> is <b>${fmt(root * root)}</b>, not ${fmt(n)}. That one comparison is the entire "no": any other integer's square is farther from <code class='inl'>n</code> than this one's, so there is nothing else to try. The brute walk spent <b>${fmt(tries(n))}</b> tries discovering that; the floor spent none. Take the root's integer part, never its rounding — a <code class='inl'>Math.round</code> here would test ${fmt(Math.round(exact))} instead, which changes nothing for squares but invites the wrong mental model.`;
}

// ── STEP (brute) — the walk up the squares, one try per step ────────────────────
const SRC_BRUTE = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">isPerfectSquare</span>(<span class="tok" data-t="param">n</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = <span class="nu">0</span>; i * i &lt;= n</span>; i++) {`,
  },
  {
    ln: 3,
    html: `    <span class="k">if</span> (<span class="tok" data-t="test">i * i === n</span>) <span class="k">return</span> <span class="tok" data-t="yes">true</span>;`,
  },
  { ln: 4, html: `  }` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="no">false</span>;` },
  { ln: 6, html: `}` },
];

type Extra = {
  focus?: string | undefined;
  changed?: string[] | undefined;
  eval?: { expr: string; val: boolean } | undefined;
  done?: boolean | undefined;
  result?: string | undefined;
  ret?: { value: boolean } | undefined;
};

function traceBrute(n: number) {
  const steps: DbgStep[] = [];
  let i: number | undefined;
  const squares: number[] = [];
  const S = (line: number, note: string, x: Extra = {}) => {
    const vars: Record<string, unknown> = { n };
    if (i !== undefined && line >= 2 && line <= 4) vars["i"] = i;
    // The squares tried so far exist from the first try and stay in scope for the
    // whole loop, so the panel is built here rather than attached to one step.
    const structs =
      i !== undefined && line >= 2 && line <= 4
        ? [{ label: "i * i tried (last 10)", items: squares.slice(-10), newest: line === 3 }]
        : [];
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        { title: `isPerfectSquare(${n})`, vars, changed: x.changed ?? [], structs, ret: x.ret },
      ],
    });
  };

  S(
    1,
    `Is <b>${fmt(n)}</b> some integer multiplied by itself? The statement's own definition is the algorithm: try integers in order and see whether any of them, squared, is <code class='inl'>n</code>. No cleverness — and no way to be wrong, which is what makes it the reference to compare the other approach against.`,
    { focus: "param" },
  );

  i = 0;
  const go = 0 <= n;
  S(
    2,
    go
      ? `<code class='inl'>i</code> starts at <b>0</b> and the loop test is <code class='inl'>i * i &lt;= n</code>, <b>&lt;=</b> and not <b>&lt;</b>. With a strict test 0 and 1 are never examined — the loop would exit before testing 1's own root — so the two most obviously square numbers would come back false.`
      : `<code class='inl'>i</code> starts at <b>0</b>, and the test <code class='inl'>0 * 0 &lt;= ${n}</code> is already false. A negative number is rejected here by the loop condition alone, with no guard line: nothing squared is negative, so a search over squares has nothing to find.`,
    { focus: "loop", changed: ["i"], eval: { expr: `i * i <= n  →  0 <= ${n}`, val: go } },
  );
  if (!go) {
    i = undefined;
    S(
      5,
      `<b>Return false</b> without a single try. Of the eight official cases, only <code class='inl'>-9</code> ends here.`,
      { focus: "no", done: true, result: "false", ret: { value: false } },
    );
    return steps;
  }

  for (;;) {
    const sq = i * i,
      hit = sq === n;
    squares.push(sq);
    S(
      3,
      hit
        ? `<code class='inl'>${i} * ${i}</code> is <b>${fmt(sq)}</b>, and that <i>is</i> <code class='inl'>n</code>. Found after <b>${fmt(i + 1)}</b> tries — one for each of the roots 0 … ${fmt(i)}. Notice what decided the cost: the size of the answer's <i>root</i>, not of <code class='inl'>n</code>. A perfect square found is only as cheap as √n is small.`
        : `Try <b>${fmt(i)}</b>: <code class='inl'>${fmt(i)} * ${fmt(i)}</code> is <b>${fmt(sq)}</b>, ${sq < n ? `below` : `above`} ${fmt(n)}, so not this one.${i === 0 ? ` The loop test passed on its own — <code class='inl'>i * i &lt;= n</code> — which is what keeps this from running forever: once the squares pass <code class='inl'>n</code> there is nothing left to find.` : ` The loop incremented <code class='inl'>i</code> and re-tested <code class='inl'>i * i &lt;= n</code> in between, which is not given its own step.`}`,
      {
        focus: "test",
        changed: i === 0 ? [] : ["i"],
        eval: { expr: `i * i === n  →  ${fmt(sq)} === ${fmt(n)}`, val: hit },
        ...(hit ? { done: true, result: "true", ret: { value: true } } : {}),
      },
    );
    if (hit) return steps;
    i++;
    if (i * i > n) {
      S(
        2,
        `<code class='inl'>i</code> is now <b>${fmt(i)}</b> and <code class='inl'>${fmt(i)} * ${fmt(i)} = ${fmt(i * i)}</code> is past <b>${fmt(n)}</b> — the loop test fails and the loop ends. It stops because it <i>overshot</i>, not because it proved anything: squares are <code class='inl'>2i + 1</code> apart, so ${fmt(n)} sat in the gap between <code class='inl'>${fmt(i - 1)}²</code> and <code class='inl'>${fmt(i)}²</code>.`,
        {
          focus: "loop",
          changed: ["i"],
          eval: { expr: `i * i <= n  →  ${fmt(i * i)} <= ${fmt(n)}`, val: false },
        },
      );
      i = undefined;
      S(
        5,
        `<b>Return false.</b> It took ${fmt(squares.length)} tries to say no — exactly what a <b>yes</b> on a neighbouring square would have cost, because the loop cannot give up before it reaches √n.`,
        { focus: "no", done: true, result: "false", ret: { value: false } },
      );
      return steps;
    }
  }
}

// ── STEP (opt) — sqrt, floor, square back ───────────────────────────────────────
const SRC_OPT = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">isPerfectSquare</span>(<span class="tok" data-t="param">n</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">if</span> (<span class="tok" data-t="guard">n &lt; <span class="nu">0</span></span>) <span class="k">return</span> <span class="tok" data-t="neg">false</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="exact">exact = Math.<span class="fn">sqrt</span>(n)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> <span class="tok" data-t="root">root = Math.<span class="fn">floor</span>(exact)</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">return</span> <span class="tok" data-t="back">root * root === n</span>;`,
  },
  { ln: 6, html: `}` },
];

function traceOpt(n: number) {
  const steps: DbgStep[] = [];
  let exact: number | undefined, root: number | undefined;
  const S = (line: number, note: string, x: Extra = {}) => {
    const vars: Record<string, unknown> = { n };
    if (exact !== undefined && line >= 3) vars["exact"] = num(exact);
    if (root !== undefined && line >= 4) vars["root"] = root;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [{ title: `isPerfectSquare(${fmt(n)})`, vars, changed: x.changed ?? [], ret: x.ret }],
    });
  };

  S(
    1,
    `The same question, answered by <i>computing</i> the only integer that could be the root instead of searching for it. If <b>${fmt(n)}</b> is a perfect square, its root is <code class='inl'>Math.sqrt(n)</code> to within a rounding error, so there is exactly one candidate to test. Compare how few steps this takes to the other approach's ${n < 0 ? "none (a negative is rejected at once)" : `${fmt(tries(n))} tries`} on the same input.`,
    { focus: "param" },
  );

  if (n < 0) {
    S(
      2,
      `<code class='inl'>${n} &lt; 0</code>: <b>return false</b>. No real number squared is negative, so there is nothing to compute. Without this line <code class='inl'>Math.sqrt(${n})</code> would be <b>NaN</b> and <code class='inl'>NaN * NaN === n</code> would still come out false — correct, but by accident, which is the worst kind of correct.`,
      {
        focus: "guard",
        eval: { expr: `n < 0  →  ${n} < 0`, val: true },
        done: true,
        result: "false",
        ret: { value: false },
      },
    );
    return steps;
  }
  S(
    2,
    `${fmt(n)} is not negative, so the guard falls through. It is one line, but it is what makes line 3 safe to read: from here on <code class='inl'>Math.sqrt</code> returns a real number.`,
    { focus: "guard", eval: { expr: `n < 0  →  ${fmt(n)} < 0`, val: false } },
  );

  exact = Math.sqrt(n);
  S(
    3,
    `<code class='inl'>Math.sqrt(${fmt(n)})</code> is <b>${num(exact)}</b>${Number.isInteger(exact) ? ` — an integer` : ` — it has a fraction, which already hints that ${fmt(n)} is not a square (but only hints; see the last step)`}. IEEE 754 requires sqrt to be <i>correctly rounded</i>, so for a true square this is the exact integer root, with no epsilon to tune.`,
    { focus: "exact", changed: ["exact"] },
  );

  root = Math.floor(exact);
  S(
    4,
    `<code class='inl'>Math.floor</code> keeps the integer part: <b>${fmt(root)}</b>. This is the one integer that could be the root — any smaller one squares to less than n, and any larger one to more. It is a <i>candidate</i>, not an answer: nothing has yet said ${fmt(root)} squared is anything in particular.`,
    { focus: "root", changed: ["root"] },
  );

  const sq = root * root,
    ok = sq === n,
    short = Number.isInteger(exact);
  S(
    5,
    ok
      ? `<code class='inl'>${fmt(root)} * ${fmt(root)} = ${fmt(sq)}</code>, which <b>is</b> ${fmt(n)}. This is the statement's definition — "multiply an integer by itself to achieve the number" — run once, in integers, which are exact up to 2^53.`
      : `<code class='inl'>${fmt(root)} * ${fmt(root)} = ${fmt(sq)}</code>, not ${fmt(n)}, so there is no integer to find. ${short ? `<b>Look at line 3, though:</b> exact was <b>${num(exact)}</b> — an integer — and the shortcut <code class='inl'>Number.isInteger(Math.sqrt(n))</code> would have answered <b>true</b> here. The true root is ${fmt(root)} plus a sliver too small for a double to hold, so the sqrt rounded it away. Only the back-check, done in integers, can see the difference. This is the case to keep in your head: the answer to "is the root an integer?" and the answer to "does the root square back to n?" agree on every input until the doubles run out of room.` : `The fraction in line 3's sqrt agreed — but this comparison is what proves it, and it still has to be made on the inputs where the fraction is vanishingly small.`}`,
    {
      focus: "back",
      eval: { expr: `root * root === n  →  ${fmt(sq)} === ${fmt(n)}`, val: ok },
      done: true,
      result: String(ok),
      ret: { value: ok },
    },
  );
  return steps;
}

const stepInput = (cases: number[], min: number, max: number) => ({
  label: "n =",
  value: 25281,
  min,
  max,
  presets: cases,
  hint: "an integer",
});

export default {
  n: 45,
  id: "perfectsquare",
  title: "Perfect Square",
  dates: ["2025-09-24"],
  statement: `Given an integer, determine if it is a <b>perfect square</b>. A number is a perfect square if you can <b>multiply an integer by itself</b> to achieve the number. <span class="rule">Example: <code class="inl">isPerfectSquare(9)</code> → <code class="inl">true</code> — 9 is a perfect square because you can multiply 3 by itself to get it. <code class="inl">isPerfectSquare(2)</code> → <code class="inl">false</code>.</span>`,
  variants: [
    {
      name: "Try every root",
      tone: "brute",
      cost: "O(√n) — one try per root",
      approach: `The statement is the algorithm: a perfect square is an integer times itself, so try the integers in order. Start at <code class='inl'>i = 0</code> and test <code class='inl'>i * i === n</code>; stop when <code class='inl'>i * i</code> climbs past <code class='inl'>n</code>, because squares only grow and nothing after that can match. It is correct on every input and has no edge cases of its own: the loop test is <code class='inl'>&lt;=</code> so that 0 and 1 are examined, and a negative <code class='inl'>n</code> fails that test on the very first look, so no guard is needed. The cost is what to look at. A <b>yes</b> and a <b>no</b> both cost about √n tries — the loop cannot say "not a square" until it has walked up to the root — so the official <code class='inl'>25281</code> takes <b>160</b> and <code class='inl'>10^12</code> takes a million. It passes all eight official tests, so the grader cannot tell it from the other approach; on inputs that small this is a constant-factor difference, and a real asymptotic one only on numbers the grader never sends. Click <b>25281</b>, then <b>1000000</b>, and watch the strip of squares grow. The inputs where it matters most are not in this demo: the box stops at 10^12 so it can run for real.`,
      code: `// Try every root: the smallest integer whose square reaches n either equals it or
// jumps over it. Squares only grow, so the loop can stop the moment i * i passes n.
function isPerfectSquare(n: number): boolean {
  // <=, not <: with a strict test the body never runs for n = 0, and 1 exits before
  // it is tested. A negative n fails the test on the first look and returns false.
  for (let i = 0; i * i <= n; i++) {
    if (i * i === n) return true;
  }
  return false;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: try every root",
      tone: "brute",
      cost: "root by root",
      approach: `The walk, one try per step, with the squares tried so far accumulating in the panel. Start on <b>9</b> — official — which is found on the fourth try, then <b>99</b>, where the loop never finds anything and stops because <code class='inl'>10² = 100</code> jumped over it. <b>0</b> and <b>1</b> show why the loop test is <code class='inl'>&lt;=</code>, and <b>-9</b> returns before the first try. <b>25281</b> is the longest official trace at 160 tries. The step-through accepts up to <b>40000</b> so the trace stays scrubbable; the demo takes anything up to 10^12. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC_BRUTE,
          trace: traceBrute,
          input: stepInput(OFFICIAL, -100, TRACE_MAX),
        }),
    },
    {
      name: "Floor the sqrt, square it back",
      tone: "opt",
      cost: "O(1) — one sqrt, one multiply",
      approach: `If <code class='inl'>n</code> is a perfect square, its root is <code class='inl'>Math.sqrt(n)</code>, so there is exactly one integer worth testing: <code class='inl'>Math.floor(Math.sqrt(n))</code>. Square it and compare to <code class='inl'>n</code>. If it matches, <code class='inl'>n</code> is a square; if it does not, no integer's square can match, because every other candidate is farther away. One sqrt, one multiply, regardless of size. The line that matters is the <b>last one</b>. The tempting version is <code class='inl'>Number.isInteger(Math.sqrt(n))</code> — it reads like the definition, passes all eight official tests, and is wrong. A double has 53 bits; once <code class='inl'>n</code> is past 2^52 the sqrt of <code class='inl'>n</code> and the sqrt of <code class='inl'>n + 1</code> can round to the <i>same</i> double, so a non-square gets an integer root. <code class='inl'>4503599627370497</code> (2^52 + 1) is the smallest, and it is in the chip row: the shortcut says <b>true</b>, the back-check says <b>false</b>. The comparison is done in integers, which are exact up to 2^53, so it does not have the problem. This is the one approach here that has a way to be wrong that the grader cannot see. The brute never does: its answer comes from exact integer multiplication, so it is correct to 10^12 in this demo. Load <b>4503599627370496</b> and <b>4503599627370497</b> in turn.`,
      code: `// The only integer that could be the root is floor(sqrt(n)): square it back in
// integers and compare. Do NOT replace the last line with
// Number.isInteger(Math.sqrt(n)): from 2^52 up a non-square's root can round to an
// integer, so that shortcut says true for 4503599627370497 (2^52 + 1).
function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;                // sqrt(-9) is NaN; say it, don't rely on it
  const exact = Math.sqrt(n);             // correctly rounded: exact for a true square
  const root = Math.floor(exact);         // the one candidate root
  return root * root === n;               // the real test, in exact integer arithmetic
}`,
      mount: mountOpt,
    },
    {
      name: "Step: square it back",
      tone: "opt",
      cost: "sqrt → floor → square",
      approach: `Five lines, one answer. Start on <b>25281</b> — official — and note that the whole job is a sqrt, a floor and a multiply, against 160 steps for the other approach on the same input. <b>99</b> is the typical <b>no</b>: the sqrt has a fraction and the back-check confirms it. <b>-9</b> exits at the guard. Then the case that is not in the grader — <b>4503599627370497</b> — where line 3 returns what looks like a clean integer and line 5 is the only thing that notices. The note on that last step is the one worth reading. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC_OPT,
          trace: traceOpt,
          input: stepInput(OPT_CASES, -1000000, Number.MAX_SAFE_INTEGER),
        }),
    },
  ],
} satisfies Challenge;
