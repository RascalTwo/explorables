// #8 · Factorializer — 20! is past Number.MAX_SAFE_INTEGER and still exactly right.
// The loop is four lines; the interesting part is why the problem stops at 20.
// 19! and 20! both exceed MAX_SAFE_INTEGER, yet a double stores them exactly,
// because n! ends in enough binary zeros that the significand still fits in 53
// bits. That runs out at 23!, which is the first factorial JS gets wrong.
import { el, mountDebugger } from "../shared.js";

// The demo deliberately runs past the problem's stated 0–20 so the cliff is
// visible. Every value is cross-checked against BigInt, which is exact forever.
const MAX_N = 25;

// 0, 5 and 20 are freeCodeCamp's three official cases. 1 is the other half of
// the empty-product story (same answer as 0!, for the same reason); 19 is where
// the result first passes MAX_SAFE_INTEGER; 22 is the last exact factorial; 23
// is the first wrong one. Six presets, six different things to notice.
const PRESETS = [0, 1, 5, 19, 20, 22, 23];

// Exact reference. `Number(exact)` is what the loop's double would land on, so
// comparing them is the honest test of whether the answer is still true.
const bigFact = (n) => { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; return f; };

// How many trailing binary zeros n! has — Legendre's formula for the exponent of
// 2. It is the reason a double survives so far past MAX_SAFE_INTEGER: those zeros
// live in the exponent, so they cost the 53-bit significand nothing.
const twos = (n) => { let e = 0; for (let p = 2; p <= n; p *= 2) e += Math.floor(n / p); return e; };

const fmt = (x) => (Number.isFinite(x) && Number.isInteger(x) ? BigInt(x).toLocaleString("en-US") : String(x));

function rows(n) {
  const out = [];
  let f = 1;
  for (let k = 0; k <= n; k++) {
    if (k >= 2) f *= k;
    const exact = bigFact(k);
    out.push({ k, value: f, exact, correct: BigInt(f) === exact, safe: f <= Number.MAX_SAFE_INTEGER });
  }
  return out;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .fa-wrap { display:flex; flex-direction:column; gap:12px; }
    .fa-ladder { display:flex; flex-direction:column; gap:2px; }
    /* 232px, not 210: the widest value the ladder can show is 23! at 30 characters,
       and that is the one row whose exact digits are the whole point. */
    .fa-r { display:grid; grid-template-columns:44px minmax(0,1fr) 232px 96px; gap:8px; align-items:center;
            padding:2px 0; border-radius:6px; }
    @media (max-width:640px){ .fa-r { grid-template-columns:38px minmax(0,1fr) 96px; } .fa-r .fa-badge { display:none; } }
    .fa-k { font:700 12px var(--mono); color:var(--muted); text-align:right; }
    .fa-track { height:13px; border-radius:4px; background:var(--panel-2); border:1px solid var(--border); position:relative; overflow:hidden; }
    .fa-fill { position:absolute; inset:0 auto 0 0; border-radius:3px; background:color-mix(in srgb, var(--accent) 55%, transparent); }
    .fa-r.unsafe .fa-fill { background:color-mix(in srgb, var(--warn) 55%, transparent); }
    .fa-r.wrong .fa-fill { background:color-mix(in srgb, var(--danger) 55%, transparent); }
    .fa-safeline { position:absolute; top:-2px; bottom:-2px; width:2px; background:var(--danger); opacity:.75; }
    .fa-v { font:700 12px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; text-align:right;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fa-r.wrong .fa-v { color:var(--danger); }
    .fa-badge { font:700 9.5px var(--sans); letter-spacing:.05em; text-transform:uppercase; text-align:left; color:var(--muted); }
    .fa-badge.warn { color:var(--warn); } .fa-badge.bad { color:var(--danger); }
    .fa-r.on { background:color-mix(in srgb, var(--accent) 10%, transparent); }
    .fa-r.on .fa-k, .fa-r.on .fa-v { color:var(--accent); }
    .fa-answer { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .fa-answer b { font:800 20px var(--mono); color:var(--good); }
    .fa-answer b.bad { color:var(--danger); }
    .fa-cmp { font:12px var(--mono); color:var(--muted); }
    .fa-cmp .exact { color:var(--good); } .fa-cmp .drift { color:var(--danger); }
    .fa-key { display:flex; gap:14px; flex-wrap:wrap; font:600 11px var(--sans); color:var(--muted); }
    .fa-key i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const slider = el("input"); slider.type = "range"; slider.min = "0"; slider.max = String(MAX_N);
  slider.value = "20"; slider.style.flex = "1"; slider.style.minWidth = "160px"; slider.style.accentColor = "var(--accent)";
  const num = el("input"); num.type = "number"; num.min = "0"; num.max = String(MAX_N); num.value = "20"; num.style.width = "72px";
  ctl.append(el("span", "ctl-label", "n ="), num, slider);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", `n = ${v}`); c.onclick = () => { num.value = String(v); slider.value = String(v); render(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  slider.oninput = () => { num.value = slider.value; render(); };
  num.oninput = () => { slider.value = num.value; render(); };
  render();

  function render() {
    let n = Math.floor(+num.value);
    if (!Number.isFinite(n)) n = 0;
    n = Math.max(0, Math.min(MAX_N, n));
    const rs = rows(n);
    const last = rs[rs.length - 1];
    // Log scale — a linear one would render every row but the last as a dot.
    const top = Math.max(1, Math.log10(Number(rs[rs.length - 1].exact) || 1));
    const safeAt = Math.min(100, (Math.log10(Number.MAX_SAFE_INTEGER) / top) * 100);

    const wrap = el("div", "fa-wrap");
    const lad = el("div", "fa-ladder");
    rs.forEach((r) => {
      const mag = Math.log10(Number(r.exact) || 1);
      const w = Math.max(1.5, (mag / top) * 100);
      const cls = !r.correct ? "wrong" : !r.safe ? "unsafe" : "";
      const badge = !r.correct ? `<span class="fa-badge bad">✗ wrong</span>`
        : !r.safe ? `<span class="fa-badge warn">&gt; MAX_SAFE · exact</span>`
        : `<span class="fa-badge">safe integer</span>`;
      lad.append(el("div", `fa-r ${cls}${r.k === n ? " on" : ""}`,
        `<div class="fa-k">${r.k}!</div>` +
        `<div class="fa-track"><div class="fa-fill" style="width:${w}%"></div>` +
          (safeAt < 100 ? `<div class="fa-safeline" style="left:${safeAt}%"></div>` : "") + `</div>` +
        `<div class="fa-v">${fmt(r.value)}</div>${badge}`));
    });
    wrap.append(lad);

    wrap.append(el("div", "fa-key",
      `<span><i style="background:color-mix(in srgb, var(--accent) 55%, transparent)"></i>within MAX_SAFE_INTEGER</span>` +
      `<span><i style="background:color-mix(in srgb, var(--warn) 55%, transparent)"></i>past it, still exact</span>` +
      `<span><i style="background:color-mix(in srgb, var(--danger) 55%, transparent)"></i>the double is wrong</span>` +
      (safeAt < 100 ? `<span><i style="background:var(--danger);width:2px;border-radius:0"></i>MAX_SAFE_INTEGER (2⁵³−1)</span>` : "")));

    wrap.append(el("div", "fa-answer",
      `<span>factorial(${n}) =</span> <b class="${last.correct ? "" : "bad"}">${fmt(last.value)}</b>` +
      `<span class="muted">·</span><span class="opcount cool"><span class="n">${Math.max(0, n - 1)}</span> multiplications</span>`));

    if (!last.correct) {
      wrap.append(el("div", "fa-cmp", `exact&nbsp;&nbsp;<span class="exact">${last.exact.toLocaleString("en-US")}</span><br>double&nbsp;<span class="drift">${fmt(last.value)}</span>`));
      wrap.append(el("div", "note", `<b>${n}! is outside the problem's domain</b>, which stops at 20 — and this is why. ${n}! ends in <b>${twos(n)}</b> binary zeros, but what's left still needs more than 53 bits, so the double has to round. The digits above diverge from the true value by <b>${(last.exact - BigInt(last.value) > 0n ? "−" : "+")}${(last.exact - BigInt(last.value) > 0n ? last.exact - BigInt(last.value) : BigInt(last.value) - last.exact).toLocaleString("en-US")}</b>. Reach for <code class='inl'>BigInt</code> up here.`));
    } else if (!last.safe) {
      wrap.append(el("div", "note", `${n}! is <b>bigger than MAX_SAFE_INTEGER</b> (9,007,199,254,740,991) and still <b>exactly</b> right. MAX_SAFE_INTEGER is the point past which <i>consecutive</i> integers stop being representable — not the point where every large integer becomes wrong. ${n}! is divisible by 2<sup>${twos(n)}</sup>, and those trailing zeros ride in the exponent for free, leaving the significand only ${BigInt(last.value) / (2n ** BigInt(twos(n)))} to hold. That fits. <b>23! is the first one that doesn't.</b>`));
    } else {
      wrap.append(el("div", "note", n <= 1
        ? `<b>${n}! = 1</b> — the loop body never runs, and the seed <code class='inl'>result = 1</code> is the answer. That isn't a special case bolted on for zero: 1 is the <b>empty product</b>, the multiplicative identity, exactly as an empty sum is 0. Starting <code class='inl'>i</code> at 2 rather than 1 makes both 0! and 1! fall out of the same loop for free.`
        : `Each rung is the one above it times its own <code class='inl'>k</code> — <b>${n}! = ${n - 1}! × ${n}</b>. That is the whole algorithm: carry one running product, multiply <b>${Math.max(0, n - 1)}</b> times. Drag the slider up to <b>19</b> to watch it cross MAX_SAFE_INTEGER, and to <b>23</b> to watch it break.`));
    }
    out.innerHTML = "";
    out.append(wrap);
  }
}

// ── STEP — the running product, one multiplication at a time ────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">factorial</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> result = <span class="tok" data-t="seed">1</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 2; i &lt;= n</span>; i++) {` },
  { ln: 4, html: `    <span class="tok" data-t="mul">result *= i</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">result</span>;` },
  { ln: 7, html: `}` },
];

function trace(raw) {
  let n = Math.max(0, Math.min(MAX_N, Math.floor(raw)));
  const steps = [];
  let result = 1, i;
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 2) vars.result = fmt(result);
    if (line >= 3 && line <= 5 && i !== undefined) vars.i = i;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `factorial(${n})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Multiply every integer from 1 up to <b>${n}</b> together. Only one value has to survive between iterations, so no array is needed — just a running product.`, { focus: "param" });
  S(2, `Seed the product at <b>1</b>, not 0. 1 is the <b>empty product</b>: multiplying nothing together leaves the identity, the same way summing nothing leaves 0. Seed it at 0 and every answer is 0.`, { focus: "seed", changed: ["result"] });

  for (i = 2; i <= n; i++) {
    S(3, i === 2
      ? `Start the loop at <b>i = 2</b>, not 1 — multiplying by 1 changes nothing, and skipping it is what makes <b>0!</b> and <b>1!</b> return the seed with no special case.`
      : `<b>i = ${i} ≤ ${n}</b>, so there is another factor to fold in.`,
      { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} <= ${n}`, val: true } });
    const before = result;
    result *= i;
    const safe = result <= Number.MAX_SAFE_INTEGER;
    const trueVal = bigFact(i);
    const ok = BigInt(result) === trueVal;
    S(4, `<b>${fmt(before)} × ${i} = ${fmt(result)}</b> — that is <b>${i}!</b>. ` + (!ok
      ? `<b style="color:var(--danger)">And it is now wrong</b>: the true value is ${trueVal.toLocaleString("en-US")}. The significand ran out of bits.`
      : !safe
        ? `Past <b>MAX_SAFE_INTEGER</b> now — but still exact, because ${i}! ends in ${twos(i)} binary zeros and the rest still fits in 53 bits.`
        : `Still comfortably inside the safe-integer range.`),
      { focus: "mul", changed: ["result"] });
  }
  const exited = i;
  i = undefined;
  S(3, n < 2
    ? `The loop condition <b>i = 2 ≤ ${n}</b> is false on the very first test, so the body never runs at all — which is exactly the behaviour <b>${n}!</b> needs.`
    : `<b>i = ${exited}</b> has passed <b>${n}</b>. Every factor has been folded in; leave the loop.`,
    { focus: "loop", eval: { expr: `i = ${exited} <= ${n}`, val: false } });
  S(6, `<b>Return ${fmt(result)}</b> after <b>${Math.max(0, n - 1)}</b> multiplication${n - 1 === 1 ? "" : "s"}.`,
    { focus: "ret", done: true, result: fmt(result), ret: { value: fmt(result) } });
  return steps;
}

export default {
  n: 8, id: "factorial", title: "Factorializer", dates: ["2025-08-18"],
  statement: `Given an integer from <b>0 to 20</b>, return its <b>factorial</b> — the product of every integer from 1 up to that number. <span class="rule">The factorial of zero is 1. Example: <code class="inl">factorial(5)</code> → <b>120</b>; <code class="inl">factorial(20)</code> → <b>2432902008176640000</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — n−1 multiplications",
      approach: `Carry one running product and fold each factor into it. Two choices do all the work: seed at <b>1</b> (the empty product, which is why 0! is 1 without a special case) and start <code class='inl'>i</code> at <b>2</b> (multiplying by 1 is a no-op, and skipping it makes both 0! and 1! fall out of a loop that never runs). The ladder below adds the part the problem doesn't say out loud — why it stops at 20. Drag past it: <b>19!</b> and <b>20!</b> are already larger than <code class='inl'>Number.MAX_SAFE_INTEGER</code> and still exactly right, and <b>23!</b> is the first one a double gets wrong.`,
      code: `function factorial(n: number): number {
  let result = 1;              // the empty product — this is why 0! is 1
  for (let i = 2; i <= n; i++) // from 2: x1 is a no-op, and 0!/1! skip the body
    result *= i;
  return result;
}`,
      mount,
    },
    { name: "Step through", cost: "one multiplication per step",
      approach: `Watch <code class='inl'>result</code> grow. Each step names the factorial it has just reached and whether a JavaScript <code class='inl'>number</code> can still hold it exactly — set <b>n</b> to <b>0</b> to see the loop body never run, to <b>20</b> for the official case, and to <b>23</b> to watch the value go quietly wrong. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "n =", value: 20, min: 0, max: MAX_N, presets: PRESETS } }) },
  ],
};
