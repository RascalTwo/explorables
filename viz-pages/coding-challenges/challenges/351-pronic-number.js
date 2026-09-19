// #351 · Pronic Number — n = k(k+1) forces k = ⌊√n⌋, so one square root replaces the search.
// Two approaches, each paired with its own line-by-line step-through debugger:
//   • BRUTE — multiply out EVERY k from 0 to n. The wasteful act: once k·(k+1) has
//             passed n the products only grow, yet the loop's bound is n, not √n —
//             so a "false" costs n+1 multiplications to learn one bit.
//   • OPT   — solve k² + k − n = 0. Because k² ≤ k(k+1) < (k+1)², the only k that
//             can work is ⌊√n⌋: one multiply, one compare, done.
// Both answer every official case identically — including isPronic(0) === true
// (0 = 0 × 1), the edge a loop that starts at k = 1 silently gets wrong.
// Payoff: hit the 999999 chip on either demo — 1,000,000 products against 1.
// Honest about the size of that win: 10⁶:1 is against THIS brute, whose bound is
// `k <= n`. Bound the same loop by `k*(k+1) <= n` instead and it stops at ⌊√n⌋ —
// O(√n), about 1,000 products at n = 999,999 — so the asymptotic story the
// closed form really buys is ~10³:1, not 10⁶:1. The demo's note says the same.
import { el, mountDebugger } from "../shared.js";

// ── Cases ───────────────────────────────────────────────────────────────────
// freeCodeCamp's six official cases (0, 6, 12, 15, 80, 132) plus two of mine
// (10, 999999). Each lands on a different outcome:
//   0       official — the k = 0 edge: 0 = 0 × 1 is pronic. A loop starting at
//                      k = 1 fails this one and nothing else.
//   6       official — pronic, the statement's own example (2 × 3).
//   10      MINE     — not pronic, and its candidate OVERSHOOTS: ⌊√10⌋ = 3, 3·4 = 12 > 10.
//   12      official — pronic (3 × 4) — same candidate k = 3, and it HITS.
//   15      official — not pronic, candidate UNDERSHOOTS: k = 3 again, 3·4 = 12 < 15.
//                      10 / 12 / 15 are one candidate landing three different ways.
//   80      official — not pronic and big enough to see the grind: 81 products vs 1.
//   132     official — pronic (11 × 12), the largest official value.
//   999999  MINE     — the payoff: not pronic, so the brute runs all 1,000,000
//                      products while the √n version does exactly one.
const CASES = [0, 6, 10, 12, 15, 80, 132, 999999];
const MAX_N = 1000000;

// The brute step-through multiplies once per k, so it can only take the cases
// that fit in a few hundred steps. Both the preset list and the input ceiling
// are derived from CASES, so adding a case can never orphan it or drift.
const STEP_CASES = CASES.filter((c) => c <= 200);
const STEP_MAX = Math.max(...STEP_CASES);

const clampN = (v) => Math.min(MAX_N, Math.max(0, Math.floor(+v || 0)));
const fmt = (x) => x.toLocaleString();

// The two consecutive pronics that bracket a non-pronic n: [j(j+1), (j+1)(j+2)].
function bracket(n) {
  let j = Math.floor(Math.sqrt(n));
  if (j * (j + 1) > n) j--;
  return [j * (j + 1), (j + 1) * (j + 2)];
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pn-head { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin:2px 0 12px; }
    .pn-eq { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; font:700 14px var(--mono); margin:14px 0 8px; }
    .pn-eq .step { color:var(--muted); }
    .pn-eq b { font-size:19px; }
    .pn-hit { color:var(--good); } .pn-miss { color:var(--danger); }
    .cand.pn-waste { border-color:var(--warn); color:var(--warn); opacity:.8; }
    .rung.pn-target { border-color:var(--accent); color:var(--text); font-weight:700; }
  `));
}

// One control strip, shared by both demos: the same number field and the same
// case chips, so the two op counters are always read on identical input.
function caseControls(host, initial, onRender) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "number"; inp.value = String(initial);
  inp.min = "0"; inp.max = String(MAX_N); inp.style.width = "130px";
  ctl.append(el("span", "ctl-label", "n ="), inp);
  const chips = el("div", "controls");
  const head = el("div", "pn-head"), out = el("div");
  host.append(ctl, chips, head, out);
  const render = () => onRender(clampN(inp.value), head, out);
  CASES.forEach((v) => {
    const c = el("button", "chip", fmt(v));
    c.onclick = () => { inp.value = String(v); render(); };
    chips.append(c);
  });
  inp.oninput = render;
  render();
}

// ── BRUTE — try every k from 0 to n, counting the products it multiplies out ──
function mountBrute(host) {
  caseControls(host, 80, (n, head, out) => {
    const CAP = 120;
    let hit = -1, tests = 0, live = 0;   // `live` = tests whose product was still ≤ n
    for (let k = 0; k <= n; k++) {
      tests++;
      if (k * (k + 1) <= n) live++;
      if (k * (k + 1) === n) { hit = k; break; }
    }
    const root = Math.floor(Math.sqrt(n));
    const wasted = tests - live;   // every product past n is a decided-in-advance miss

    head.innerHTML =
      `<span class="opcount hot"><span class="n">${fmt(tests)}</span> products multiplied out</span>` +
      `<span class="muted mono">k = 0 … ${fmt(hit >= 0 ? hit : n)}</span>` +
      `<span class="muted mono">⌊√n⌋ tab: 1</span>`;

    out.innerHTML = "";
    const [lo, hi] = bracket(n);
    out.append(el("div", "result-line",
      `<span class="mono muted">isPronic(${fmt(n)})</span>` +
      (hit >= 0
        ? `<span class="badge ok">true</span><span class="mono">${fmt(n)} = ${hit} × ${hit + 1}</span>`
        : `<span class="badge no">false</span><span class="mono">${fmt(lo)} &lt; ${fmt(n)} &lt; ${fmt(hi)}</span>`)));

    // One cell per k actually tested, showing the product k·(k+1) — the thing
    // being compared to n. Amber = the product already passed n, so the compare
    // was decided before it ran.
    const last = hit >= 0 ? hit : n;
    const shown = Math.min(last, CAP - 1);
    const grid = el("div", "cand-grid");
    for (let k = 0; k <= shown; k++) {
      const p = k * (k + 1);
      const cell = el("div", "cand" + (p === n ? " pass" : p > n ? " pn-waste" : ""), fmt(p));
      cell.title = `k = ${k} → ${k} × ${k + 1} = ${fmt(p)}`;
      grid.append(cell);
    }
    if (last > shown) grid.append(el("div", "more", `+${fmt(last - shown)} more k tested`));
    out.append(grid);

    out.append(el("div", "note",
      `The loop's bound is <code class='inl'>k &lt;= n</code>, not <code class='inl'>k·(k+1) &lt;= n</code>. ` +
      (wasted > 0
        ? `From k = <b>${fmt(live)}</b> onward every product already exceeds n, and they only grow — <b>${fmt(wasted)}</b> of these ${fmt(tests)} multiplications were misses decided before they ran. ⌊√${fmt(n)}⌋ = <b>${root}</b> is the last candidate that can matter.`
        : `Here it returned the moment it hit k = ${hit} = ⌊√${fmt(n)}⌋, so almost nothing was wasted — a <b>true</b> is the brute's best case. The waste shows on a <b>false</b>, where it must run all the way to n: try <b>80</b>, or <b>999,999</b>.`) +
      ` The <b>Jump to ⌊√n⌋</b> tab multiplies exactly once, on every input.`));
  });
}

// ── OPT — solve for k, test the single candidate ⌊√n⌋ ────────────────────────
function mountOpt(host) {
  caseControls(host, 80, (n, head, out) => {
    const k = Math.floor(Math.sqrt(n));
    const p = k * (k + 1);
    const hit = p === n;
    const bruteTests = hit ? k + 1 : n + 1;   // the brute returns early on a hit
    const exact = (-1 + Math.sqrt(1 + 4 * n)) / 2;

    head.innerHTML =
      `<span class="opcount cool"><span class="n">1</span> product multiplied out</span>` +
      `<span class="muted mono">k = ⌊√${fmt(n)}⌋ = ${k}</span>` +
      `<span class="muted mono">every-k tab: ${fmt(bruteTests)}</span>`;

    out.innerHTML = "";
    const [lo, hi] = bracket(n);
    // Same verdict line, same place as the brute tab, so flipping the Approach
    // toggle changes the work on screen and nothing else.
    out.append(el("div", "result-line",
      `<span class="mono muted">isPronic(${fmt(n)})</span>` +
      (hit
        ? `<span class="badge ok">true</span><span class="mono">${fmt(n)} = ${k} × ${k + 1}</span>`
        : `<span class="badge no">false</span><span class="mono">${fmt(lo)} &lt; ${fmt(n)} &lt; ${fmt(hi)}</span>`)));
    out.append(el("div", "pn-eq",
      `<span>k = ⌊√${fmt(n)}⌋ = <b>${k}</b></span>` +
      `<span class="step">→</span><span>${k} × ${k + 1} = <b>${fmt(p)}</b></span>` +
      `<span class="step">→</span><span>${fmt(p)} ${hit ? "===" : "≠"} ${fmt(n)} → ` +
      `<b class="${hit ? "pn-hit" : "pn-miss"}">${hit}</b></span>`));

    // The candidate and its two neighbours. On a miss, n is slotted in where it
    // actually falls — strictly between two consecutive pronics, which is the
    // whole proof that no k produces it.
    const lad = el("div", "ladder");
    const rung = (j) => el("div", "rung" + (j === k ? " on" : ""),
      `<span>k = ${j} &nbsp;→&nbsp; ${j} × ${j + 1}${j === k && hit ? " &nbsp;= n ✓" : ""}</span><span class="v">${fmt(j * (j + 1))}</span>`);
    let placed = hit;   // on a hit there is nothing to slot in — n IS a rung
    for (let j = Math.max(0, k - 1); j <= k + 1; j++) {
      if (!placed && j * (j + 1) > n) { lad.append(el("div", "rung pn-target", `<span>n</span><span class="v">${fmt(n)}</span>`)); placed = true; }
      lad.append(rung(j));
    }
    if (!placed) lad.append(el("div", "rung pn-target", `<span>n</span><span class="v">${fmt(n)}</span>`));
    out.append(lad);

    out.append(el("div", "note",
      `Why ⌊√n⌋ is the <b>only</b> candidate: for every k ≥ 0, <code class='inl'>k² ≤ k(k+1) &lt; (k+1)²</code>. ` +
      `So if n = k(k+1) then k ≤ √n &lt; k+1 — k <b>is</b> ⌊√n⌋. ` +
      (hit
        ? `Solving k² + k − n = 0 outright says the same thing: <code class='inl'>(−1 + √(1+4n)) / 2</code> = <b>${exact.toFixed(3)}</b>, a whole number precisely because n is pronic. The every-k tab needed ${fmt(bruteTests)} product${bruteTests === 1 ? "" : "s"} to arrive at the same k.`
        : `The quadratic settles it the other way: <code class='inl'>(−1 + √(1+4n)) / 2</code> = <b>${exact.toFixed(3)}</b> is not a whole number, so no consecutive pair lands on n — it falls strictly between ${fmt(lo)} and ${fmt(hi)}. Testing ⌊√n⌋ is that same test without an equality check on a fraction, and the every-k tab spent ${fmt(bruteTests)} products reaching the same verdict.`)));
  });
}

// ── STEP (brute) — one multiplication per k, instrumented for the debugger ────
// Paired with the "Test every k" tab: watch the products climb past n and the
// loop carry on anyway, because its condition looks at k, not at k·(k+1).
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isPronic</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="init">k = 0</span>; <span class="tok" data-t="cond">k &lt;= n</span>; <span class="tok" data-t="incr">k++</span>) {` },
  { ln: 3, html: `    <span class="k">if</span> (<span class="tok" data-t="test">k * (k + 1) === n</span>) <span class="k">return</span> <span class="tok" data-t="rett">true</span>;` },
  { ln: 4, html: `  }` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="retf">false</span>;` },
  { ln: 6, html: `}` },
];

// `k` is block-scoped to the for-loop (lines 2–4), so it is absent from the
// frame on line 1 and again on line 5 — it genuinely does not exist there.
// The products panel is a running log of work done; it appears when the loop
// starts and stays to the end, because the work does not un-happen.
const WINDOW = 14;
const tail = (a) => (a.length > WINDOW ? [`…+${a.length - WINDOW}`, ...a.slice(-WINDOW)] : a.slice());

function traceBrute(n0) {
  const n = n0, steps = [], tried = [];
  let k;
  const root = Math.floor(Math.sqrt(n));
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 2 && line <= 4) vars.k = k;
    const structs = [];
    if (line >= 2) structs.push({ label: "k·(k+1) tested", items: tail(tried), newest: !!x.fresh });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isPronic(${n})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Call <b>isPronic(${fmt(n)})</b> — is n the product of two consecutive integers? The brute answer is to name every candidate k and multiply it out.`, { focus: "param" });
  k = 0;
  S(2, `Start k at <b>0</b>, not 1. <b>0 = 0 × 1</b> is itself pronic, so a loop beginning at k = 1 would answer <code class='inl'>isPronic(0)</code> wrong — and that is one of freeCodeCamp's six tests.`, { focus: "init", changed: ["k"] });

  for (;;) {
    const c = k <= n;
    if (!c) {
      S(2, `<b>k ≤ n</b> is false at k = ${fmt(k)} — every candidate from 0 to n has been multiplied out and none matched. <b>Exit the loop.</b>`, { focus: "cond", eval: { expr: `${fmt(k)} ≤ ${fmt(n)}`, val: false } });
      break;
    }
    const p = k * (k + 1);
    S(2, `<b>k ≤ n</b> — ${fmt(k)} ≤ ${fmt(n)} → <b>true</b>, so try another candidate.` +
      (k > root ? ` Note the bound: k has already passed ⌊√${fmt(n)}⌋ = ${root}, so the next product is guaranteed to overshoot — but the condition tests <b>k</b>, not k·(k+1), so it keeps going.` : ""),
      { focus: "cond", eval: { expr: `${fmt(k)} ≤ ${fmt(n)}`, val: true } });

    tried.push(fmt(p));
    const isHit = p === n;
    S(3, isHit
      ? `<b>${k} × ${k + 1} = ${fmt(p)}</b>, which <b>is</b> n. Found it — and note k = ${k} is exactly ⌊√${fmt(n)}⌋, the value the other approach computes in one step instead of walking to.`
      : `<b>${k} × ${k + 1} = ${fmt(p)}</b> ≠ ${fmt(n)}${p > n ? ` — and it overshot. Products of consecutive integers only grow, so from here every remaining test is already decided.` : `, so this candidate is out. Keep climbing.`}`,
      { focus: "test", fresh: true, eval: { expr: `${k} × ${k + 1} = ${fmt(p)} === ${fmt(n)}`, val: isHit } });

    if (isHit) {
      S(3, `Return <b>true</b> immediately — no later k can help, because k·(k+1) is strictly increasing. Total work: <b>${tried.length}</b> multiplication${tried.length === 1 ? "" : "s"}.`,
        { focus: "rett", done: true, result: "true", ret: { value: "true" } });
      return steps;
    }
    k = k + 1;
    S(2, `<b>k++</b> → ${fmt(k)}. Back to the condition, which will let this run all the way to n.`, { focus: "incr", changed: ["k"] });
  }

  S(5, `Return <b>false</b> — nothing in 0…${fmt(n)} satisfies k(k+1) = n. Notice <b>k</b> has left the frame: it was scoped to the loop. That verdict cost <b>${fmt(tried.length)}</b> multiplications across <b>${steps.length + 1}</b> steps; the ⌊√n⌋ tab settles the same input in <b>5</b> steps and one multiplication.`,
    { focus: "retf", done: true, result: "false", ret: { value: "false" } });
  return steps;
}

// ── STEP (opt) — the closed-form candidate, line by line ─────────────────────
// Paired with the "Jump to ⌊√n⌋" tab: five steps on any input, because the
// square root names k outright instead of searching for it.
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isPronic</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> k = <span class="tok" data-t="floor">Math.<span class="fn">floor</span></span>(<span class="tok" data-t="sqrt">Math.<span class="fn">sqrt</span>(n)</span>);` },
  { ln: 3, html: `  <span class="k">return</span> <span class="tok" data-t="prod">k * (k + 1)</span> <span class="tok" data-t="cmp">=== n</span>;` },
  { ln: 4, html: `}` },
];

// `k` is a const on line 2: it does not exist while line 2's right-hand side is
// still being evaluated, so the first line-2 step omits it and `kLive` turns it
// on only once the assignment has happened.
function traceOpt(n0) {
  const n = n0, steps = [];
  let k, kLive = false;
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (kLive) vars.k = k;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isPronic(${n})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  const sq = Math.sqrt(n);
  const sqTxt = Number.isInteger(sq) ? String(sq) : sq.toFixed(3) + "…";

  S(1, `Call <b>isPronic(${fmt(n)})</b>. Rather than search for k, solve for it: n = k(k+1) is the quadratic <b>k² + k − n = 0</b>, which has at most one non-negative root — so at most one k can ever work.`, { focus: "param" });
  S(2, `<b>Math.sqrt(${fmt(n)}) = ${sqTxt}</b>. This is what pins k down: for every k ≥ 0, <code class='inl'>k² ≤ k(k+1) &lt; (k+1)²</code>, so if n really is k(k+1) then k ≤ √n &lt; k+1.`, { focus: "sqrt" });
  k = Math.floor(sq); kLive = true;
  S(2, `Flooring lands on <b>k = ${k}</b> — the one and only candidate. Every other k was eliminated by that inequality, not by being tested.${n === 0 ? " For n = 0 that candidate is 0 itself, which is why this handles the 0 × 1 case without a special branch." : ""}`, { focus: "floor", changed: ["k"] });

  const p = k * (k + 1);
  const hit = p === n;
  S(3, `Multiply the candidate out: <b>${k} × ${k + 1} = ${fmt(p)}</b>. This is the only product this function ever computes, whatever n is.`, { focus: "prod" });
  const [lo, hi] = bracket(n);
  S(3, hit
    ? `<b>${fmt(p)} === ${fmt(n)}</b> → return <b>true</b>: n is ${k} × ${k + 1}. One square root, one multiply, one compare.`
    : `<b>${fmt(p)} ≠ ${fmt(n)}</b> → return <b>false</b>. The candidate ${p > n ? "overshot" : "fell short"}, and since it was the only one possible, n must sit strictly between the consecutive pronics ${fmt(lo)} and ${fmt(hi)} — a gap no k(k+1) lands in.`,
    { focus: "cmp", eval: { expr: `${k} × ${k + 1} = ${fmt(p)} === ${fmt(n)}`, val: hit }, done: true, result: String(hit), ret: { value: String(hit) } });
  return steps;
}

const CODE_BRUTE = `// Brute force: try EVERY k from 0 up to n and multiply it by its successor.
// Correct — but on a non-pronic n it does n+1 products to learn one bit,
// and every k above ⌊√n⌋ already overshoots, so it can never match.
// k starts at 0, not 1: 0 = 0 * 1 is pronic, and isPronic(0) is an official case.
function isPronic(n: number): boolean {
  for (let k = 0; k <= n; k++) {
    if (k * (k + 1) === n) return true; // 132 → k = 11 (11 * 12)
  }
  return false;
}`;

const CODE_OPT = `// n = k * (k + 1) is the quadratic k² + k − n = 0, so at most ONE k can work.
// Since k² ≤ k(k + 1) < (k + 1)², that k is pinned: k = ⌊√n⌋. Test it, stop.
// n = 0 → k = 0 → 0 * 1 === 0 → true. Negative n → NaN, which fails the compare.
function isPronic(n: number): boolean {
  const k = Math.floor(Math.sqrt(n));
  return k * (k + 1) === n;
}`;

export default {
  n: 351, id: "pronic", title: "Pronic Number", dates: ["2026-07-27"],
  statement: `Given a number, determine whether it is a <b>pronic</b> number — the product of two consecutive integers. <span class="rule">Example: <code class="inl">isPronic(6)</code> → <b>true</b>, because 2 × 3 = 6. And <code class="inl">isPronic(0)</code> → <b>true</b>: 0 × 1 = 0.</span>`,
  // Grouped by approach: each approach is [intuition viz] → [step-through debugger],
  // paired by tone. Both demos share one control strip and the same default n = 80,
  // so the two op counters (81 products vs 1) are read on identical input.
  variants: [
    { name: "Test every k", tone: "brute", cost: "O(n) — up to n+1 products",
      approach: `Name every candidate and multiply it out: k = 0, 1, 2, … up to n, checking <code class='inl'>k * (k + 1) === n</code> each time. It is correct on all six official cases, including <code class='inl'>isPronic(0)</code> because k starts at <b>0</b>. The waste is in the loop's bound — it stops at <b>k &gt; n</b>, but products of consecutive integers pass n at <b>k = ⌊√n⌋</b> and only grow after that. So a <b>true</b> costs about √n multiplications and a <b>false</b> costs n+1. Watch the amber cells: every one of them was decided before it was computed.`,
      code: CODE_BRUTE, mount: mountBrute },
    { name: "Step: test every k", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — one multiplication per step. Watch <code class='inl'>k·(k+1)</code> sail past n and the loop keep going anyway, because its condition reads <code class='inl'>k &lt;= n</code>. On <b>80</b> that is <b>247</b> steps and 81 products to return <b>false</b>; the ⌊√n⌋ tab does the same input in <b>5</b>. Note <code class='inl'>k</code> vanishing from the state panel on the final line — it was scoped to the loop. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (999,999 is trimmed here — a million steps cannot exist — but it is one click away on either demo tab.)`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "n =", value: 80, min: 0, max: STEP_MAX, presets: STEP_CASES, hint: "small n — one step per k" } }) },
    { name: "Jump to ⌊√n⌋", tone: "opt", cost: "O(1) — one √, one product",
      approach: `Stop searching for k and solve for it. <code class='inl'>n = k(k+1)</code> is the quadratic <code class='inl'>k² + k − n = 0</code>, whose only non-negative root is <code class='inl'>(−1 + √(1+4n)) / 2</code>. Cheaper still: since <code class='inl'>k² ≤ k(k+1) &lt; (k+1)²</code>, any k that works must satisfy <code class='inl'>k ≤ √n &lt; k+1</code> — so <b>k = ⌊√n⌋</b>, full stop. Multiply that one candidate out and compare. The ladder shows why a miss is final: n lands in the gap between two consecutive pronics, and nothing else can be there.`,
      code: CODE_OPT, mount: mountOpt },
    { name: "Step: jump to ⌊√n⌋", tone: "opt", cost: "line-by-line",
      approach: `The same debugger for the closed-form solution — and it is <b>five steps on every input</b>, from 0 to 999,999. Watch <code class='inl'>k</code> appear only once line 2's assignment has actually run (a <code class='inl'>const</code> does not exist while its own right-hand side is being evaluated), then a single multiply settle the question. Compare the step counter with the “Step: test every k” tab on the same n. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: { label: "n =", value: 80, min: 0, max: Math.max(...CASES), presets: CASES, hint: "any n — always 5 steps" } }) },
  ],
};
