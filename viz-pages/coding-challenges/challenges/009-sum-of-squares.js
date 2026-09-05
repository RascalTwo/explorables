// #9 · Sum of Squares — a thousand additions, or one multiply-divide.
// • BRUTE: add i*i for every i from 1 to n — n additions, exactly as stated.
// • OPT: n(n+1)(2n+1)/6 answers the same question with three multiplications
//   and a divide, whatever n is. The gap is asymptotic, not constant-factor.
// The official n = 1000 case is the payoff: 1000 additions against 1.
import { el, mountDebugger } from "../shared.js";

// All five official freeCodeCamp cases, plus n = 1 — the degenerate end, where
// the loop runs once and the formula reads 1·2·3/6. Nothing invented beyond it;
// the official set already spans tiny to the stated 1,000 ceiling.
const PRESETS = [1, 5, 10, 25, 500, 1000];
const MAX_N = 1000;

const loopSum = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += i * i; return s; };
const formula = (n) => (n * (n + 1) * (2 * n + 1)) / 6;

// Exactly one of n, n+1, 2n+1 is a multiple of 3, and one of n, n+1 is even —
// which is why the /6 is never a fraction. Naming the culprits makes that
// visible instead of asserted.
function divisors(n) {
  const f = [{ label: "n", v: n }, { label: "n + 1", v: n + 1 }, { label: "2n + 1", v: 2 * n + 1 }];
  return {
    factors: f,
    even: f.find((x) => x.v % 2 === 0),
    third: f.find((x) => x.v % 3 === 0),
  };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ss-wrap { display:flex; flex-direction:column; gap:12px; }
    .ss-svg { width:100%; height:auto; display:block; background:var(--panel); border:1px solid var(--border); border-radius:12px; }
    .ss-svg text { font-family:var(--mono); }
    .ss-axis { stroke:var(--border); stroke-width:1.5; }
    .ss-area { fill:color-mix(in srgb, var(--accent) 22%, transparent); stroke:none; }
    .ss-line { fill:none; stroke:var(--accent); stroke-width:2; }
    .ss-bar { fill:color-mix(in srgb, var(--warn) 45%, transparent); }
    .ss-lab { fill:var(--muted); font-size:11px; }
    .ss-lab.end { text-anchor:end; }
    .ss-terms { font:12.5px var(--mono); color:var(--muted); word-break:break-word; }
    .ss-terms b { color:var(--text); }
    .ss-answer { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .ss-answer b { font:800 22px var(--mono); color:var(--good); font-variant-numeric:tabular-nums; }
    .ss-facs { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .ss-fac { border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:7px 12px; text-align:center; min-width:78px; }
    .ss-fac .lbl { font:700 10px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .ss-fac .v { font:800 18px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; }
    .ss-fac .why { display:block; font:700 9.5px var(--sans); color:var(--good); margin-top:2px; min-height:12px; }
    .ss-op { font:800 17px var(--mono); color:var(--muted); }
    .ss-eq { font:13px var(--mono); color:var(--muted); }
    .ss-eq b { color:var(--text); }
  `));
}

// Shared control strip so the Approach toggle keeps you on the same n.
function controls(host, onChange, init) {
  ensureStyle();
  const ctl = el("div", "controls");
  const num = el("input"); num.type = "number"; num.min = "1"; num.max = String(MAX_N); num.value = String(init); num.style.width = "82px";
  const slider = el("input"); slider.type = "range"; slider.min = "1"; slider.max = String(MAX_N); slider.value = String(init);
  slider.style.flex = "1"; slider.style.minWidth = "160px"; slider.style.accentColor = "var(--accent)";
  ctl.append(el("span", "ctl-label", "n ="), num, slider);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", `n = ${v}`); c.onclick = () => { num.value = slider.value = String(v); onChange(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  num.oninput = () => { slider.value = num.value; onChange(); };
  slider.oninput = () => { num.value = slider.value; onChange(); };
  queueMicrotask(onChange);
  return { out, read: () => Math.max(1, Math.min(MAX_N, Math.floor(+num.value) || 1)) };
}

// ── BRUTE demo — the running total, drawn ───────────────────────────────────
function mountLoop(host) {
  const { out, read } = controls(host, render, 1000);
  function render() {
    const n = read();
    const total = loopSum(n);
    const W = 640, H = 180, pad = 30, padB = 26;
    const X = (k) => pad + (k / n) * (W - 2 * pad);
    const Y = (v) => H - padB - (v / total) * (H - pad - padB);

    // Sample the cumulative curve: at most ~200 points, so n = 1000 still draws
    // in one pass instead of a thousand path segments.
    const stride = Math.max(1, Math.ceil(n / 200));
    let running = 0, pts = [`${pad},${(H - padB).toFixed(1)}`];
    for (let k = 1; k <= n; k++) {
      running += k * k;
      if (k % stride === 0 || k === n) pts.push(`${X(k).toFixed(1)},${Y(running).toFixed(1)}`);
    }
    const poly = pts.join(" ");

    // Individual k² terms are only legible while there are few of them.
    let bars = "";
    if (n <= 64) {
      const bw = Math.max(1.5, (W - 2 * pad) / n - 1.5);
      for (let k = 1; k <= n; k++) {
        const h = ((k * k) / (n * n)) * (H - pad - padB) * 0.9;
        bars += `<rect class="ss-bar" x="${(X(k) - bw / 2).toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1"/>`;
      }
    }

    const svg = `<svg class="ss-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="cumulative sum of squares">` +
      `<polygon class="ss-area" points="${poly} ${(W - pad).toFixed(1)},${H - padB}"/>` +
      bars +
      `<polyline class="ss-line" points="${poly}"/>` +
      `<line class="ss-axis" x1="${pad}" y1="${H - padB}" x2="${W - pad}" y2="${H - padB}"/>` +
      `<text class="ss-lab" x="${pad}" y="${H - 8}">i = 1</text>` +
      `<text class="ss-lab end" x="${W - pad}" y="${H - 8}">i = ${n}</text>` +
      `<text class="ss-lab end" x="${W - pad}" y="${Y(total) - 7}">${total.toLocaleString("en-US")}</text>` +
      `</svg>`;

    const head = [];
    for (let k = 1; k <= Math.min(n, 5); k++) head.push(`${k}² = <b>${k * k}</b>`);
    const terms = head.join(" + ") + (n > 6 ? ` + … + ${n}² = <b>${(n * n).toLocaleString("en-US")}</b>` : n === 6 ? ` + 6² = <b>36</b>` : "");

    out.innerHTML = "";
    const wrap = el("div", "ss-wrap");
    wrap.append(el("div", "muted", n <= 64
      ? "Each amber bar is one <b>i²</b> term; the line is the running total as the loop folds them in."
      : "The running total after each of the <b>n</b> additions. The curve is cubic — it grows like <code class='inl'>n³/3</code>."));
    wrap.append(el("div", null, svg));
    wrap.append(el("div", "ss-terms", terms));
    wrap.append(el("div", "ss-answer",
      `<span>sumOfSquares(${n}) =</span> <b>${total.toLocaleString("en-US")}</b>` +
      `<span class="muted">·</span><span class="opcount hot"><span class="n">${n.toLocaleString("en-US")}</span> additions</span>`));
    wrap.append(el("div", "note", `The work is <b>one addition per integer</b>, so it scales straight with n — at the official ceiling of 1,000 that is a thousand trips round the loop for a number the formula tab gets in one. Nothing here is wrong; it just does every unit of work the problem's <i>description</i> implies rather than the work the <i>answer</i> needs.`));
    out.append(wrap);
  }
}

// ── OPT demo — the three factors and the divide ─────────────────────────────
function mountFormula(host) {
  const { out, read } = controls(host, render, 1000);
  function render() {
    const n = read();
    const { factors, even, third } = divisors(n);
    const product = n * (n + 1) * (2 * n + 1);
    const total = formula(n);

    out.innerHTML = "";
    const wrap = el("div", "ss-wrap");
    const facs = el("div", "ss-facs");
    factors.forEach((f, idx) => {
      if (idx) facs.append(el("span", "ss-op", "×"));
      const why = [f === even ? "supplies the 2" : "", f === third ? "supplies the 3" : ""].filter(Boolean).join(" · ");
      facs.append(el("div", "ss-fac", `<div class="lbl">${f.label}</div><div class="v">${f.v.toLocaleString("en-US")}</div><span class="why">${why}</span>`));
    });
    facs.append(el("span", "ss-op", "÷"));
    facs.append(el("div", "ss-fac", `<div class="lbl">always</div><div class="v">6</div><span class="why"></span>`));
    wrap.append(facs);

    wrap.append(el("div", "ss-eq", `<b>${n.toLocaleString("en-US")}</b> × <b>${(n + 1).toLocaleString("en-US")}</b> × <b>${(2 * n + 1).toLocaleString("en-US")}</b> = <b>${product.toLocaleString("en-US")}</b>, and ${product.toLocaleString("en-US")} ÷ 6 = <b>${total.toLocaleString("en-US")}</b>`));
    wrap.append(el("div", "ss-answer",
      `<span>sumOfSquares(${n}) =</span> <b>${total.toLocaleString("en-US")}</b>` +
      `<span class="muted">·</span><span class="opcount cool"><span class="n">4</span> arithmetic ops</span>`));
    wrap.append(el("div", "note", `The divide is never a fraction, and that isn't luck. One of <b>n</b> and <b>n + 1</b> is even — here <b>${even.label} = ${even.v.toLocaleString("en-US")}</b> — and exactly one of the three is a multiple of 3, here <b>${third.label} = ${third.v.toLocaleString("en-US")}</b>${even === third ? " (the same factor carries both)" : ""}. Between them the product always contains a 2 and a 3, so it is always divisible by 6.`));
    wrap.append(el("div", "note", `Four operations at <b>n = 1</b>, four at <b>n = 1,000</b>, four at <b>n = 10<sup>9</sup></b>. That is what makes this an asymptotic win rather than a constant-factor one — flip to <b>Add each square</b> and drag n to see the other side scale with the input.`));
    out.append(wrap);
  }
}

// ── STEP: loop ──────────────────────────────────────────────────────────────
const SRC_LOOP = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">sumOfSquares</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> sum = <span class="tok" data-t="seed">0</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 1; i &lt;= n</span>; i++) {` },
  { ln: 4, html: `    <span class="tok" data-t="add">sum += i * i</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">sum</span>;` },
  { ln: 7, html: `}` },
];

// The brute step-through is capped at n = 30 on purpose: n = 1000 is 3,001
// steps, which is the point rather than an omission. Both large official cases
// (500 and 1000) are reachable from the demo above and from the formula
// step-through below, which stays 5 steps long at any n.
const STEP_MAX_LOOP = 30;

function traceLoop(raw) {
  const n = Math.max(1, Math.min(STEP_MAX_LOOP, Math.floor(raw) || 1));
  const steps = [];
  let sum = 0, i;
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 2) vars.sum = sum.toLocaleString("en-US");
    if (line >= 3 && line <= 5 && i !== undefined) vars.i = i;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `sumOfSquares(${n})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Add up <b>1² + 2² + … + ${n}²</b>. Only the running total has to survive between iterations, so one accumulator is enough — no array.`, { focus: "param" });
  S(2, `Seed at <b>0</b>, the additive identity. (The factorial next door seeds at 1 for the same reason in the other operation — an empty sum is 0, an empty product is 1.)`, { focus: "seed", changed: ["sum"] });
  for (i = 1; i <= n; i++) {
    S(3, `<b>i = ${i} ≤ ${n}</b> — another term to add.`, { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} <= ${n}`, val: true } });
    const before = sum;
    sum += i * i;
    S(4, `<b>${i}² = ${i * i}</b>, so the total goes ${before.toLocaleString("en-US")} → <b>${sum.toLocaleString("en-US")}</b>. That is addition number <b>${i}</b> of <b>${n}</b>.`, { focus: "add", changed: ["sum"] });
  }
  const exited = i; i = undefined;
  S(3, `<b>i = ${exited}</b> is past <b>${n}</b> — every term has been folded in.`, { focus: "loop", eval: { expr: `i = ${exited} <= ${n}`, val: false } });
  S(6, `<b>Return ${sum.toLocaleString("en-US")}</b>, after <b>${n}</b> addition${n === 1 ? "" : "s"}. At the official <b>n = 1000</b> this same trace would be ${(3 * 1000 + 3).toLocaleString("en-US")} steps long — which is the argument for the formula, made by the step counter.`,
    { focus: "ret", done: true, result: sum.toLocaleString("en-US"), ret: { value: sum.toLocaleString("en-US") } });
  return steps;
}

// ── STEP: formula ───────────────────────────────────────────────────────────
const SRC_FORM = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">sumOfSquares</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> product = <span class="tok" data-t="prod">n * (n + 1) * (2 * n + 1)</span>;` },
  { ln: 3, html: `  <span class="k">return</span> <span class="tok" data-t="div">product / 6</span>;` },
  { ln: 4, html: `}` },
];

function traceFormula(raw) {
  const n = Math.max(1, Math.min(MAX_N, Math.floor(raw) || 1));
  const steps = [];
  const { even, third } = divisors(n);
  let product, result;
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 2 && product !== undefined) vars.product = product.toLocaleString("en-US");
    if (line >= 3 && result !== undefined) vars.result = result.toLocaleString("en-US");
    steps.push({ line, note, focus: x.focus, done: x.done, result: x.result,
      frames: [{ title: `sumOfSquares(${n})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Same question as the loop tab, but nothing here depends on <b>n</b> being small — the step count below is the same for <b>n = 5</b> and <b>n = 1000</b>.`, { focus: "param" });
  product = n * (n + 1) * (2 * n + 1);
  S(2, `Three factors: <b>n = ${n.toLocaleString("en-US")}</b>, <b>n + 1 = ${(n + 1).toLocaleString("en-US")}</b>, <b>2n + 1 = ${(2 * n + 1).toLocaleString("en-US")}</b>. Their product is <b>${product.toLocaleString("en-US")}</b> — two multiplications, whatever n is.`, { focus: "prod", changed: ["product"] });
  result = product / 6;
  S(3, `Divide by <b>6</b> → <b>${result.toLocaleString("en-US")}</b>. It comes out whole every time: <b>${even.label} = ${even.v.toLocaleString("en-US")}</b> is even and <b>${third.label} = ${third.v.toLocaleString("en-US")}</b> is a multiple of 3, so the product always carries a 2 and a 3.`, { focus: "div", changed: ["result"] });
  S(3, `<b>Return ${result.toLocaleString("en-US")}</b> — the same number the loop reaches after <b>${n.toLocaleString("en-US")}</b> additions, reached in <b>4</b> operations.`,
    { focus: "div", done: true, result: result.toLocaleString("en-US"), ret: { value: result.toLocaleString("en-US") } });
  return steps;
}

export default {
  n: 9, id: "sumsquares", title: "Sum of Squares", dates: ["2025-08-19"],
  statement: `Given a positive integer up to <b>1,000</b>, return the sum of every integer squared from 1 up to that number. <span class="rule">Example: <code class="inl">sumOfSquares(5)</code> → <b>55</b> — that's 1 + 4 + 9 + 16 + 25.</span>`,
  variants: [
    {
      name: "Add each square", tone: "brute", cost: "O(n) — n additions",
      approach: `Read the problem statement as a loop: for every <code class='inl'>i</code> from 1 to n, add <code class='inl'>i * i</code>. It is correct, obvious, and needs nothing you don't already know — and the amount of work it does is fixed by the <i>size of the input</i> rather than by the difficulty of the question. Drag n and watch the addition counter track it exactly.`,
      code: `function sumOfSquares(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i * i;
  }
  return sum;
}`,
      mount: mountLoop,
    },
    { name: "Step: add each square", tone: "brute", cost: "additions",
      approach: `One addition per step, so the trace length <i>is</i> the cost. Capped at <b>n = 30</b> here — the official <b>n = 1000</b> case would be a 3,001-step trace, which is exactly the complaint the formula answers. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_LOOP, trace: traceLoop, input: { label: "n =", value: 10, min: 1, max: STEP_MAX_LOOP, presets: [1, 5, 10, 25, 30], hint: "capped at 30 — see why below" } }) },
    {
      name: "Closed form", tone: "opt", cost: "O(1) — 4 operations",
      approach: `The square pyramidal number has a closed form: <b>n(n + 1)(2n + 1) / 6</b>. Two multiplications and a divide answer the whole question, so the cost stops depending on <b>n</b> at all — same four operations at n = 5 and at n = 1,000. The divide is always exact, and the demo names why: one of <code class='inl'>n</code>, <code class='inl'>n + 1</code> is even, and exactly one of the three factors is a multiple of 3.`,
      code: `function sumOfSquares(n: number): number {
  const product = n * (n + 1) * (2 * n + 1);
  return product / 6;
}`,
      mount: mountFormula,
    },
    { name: "Step: closed form", tone: "opt", cost: "constant, whatever n is",
      approach: `Five steps at <b>n = 5</b>; five steps at <b>n = 1000</b>. Set n to the official <b>1000</b> and compare the step counter with the loop tab's — that number is the entire argument. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_FORM, trace: traceFormula, input: { label: "n =", value: 1000, min: 1, max: MAX_N, presets: PRESETS } }) },
  ],
};
