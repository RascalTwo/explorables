// #314 · Prime Factorization — prime factors ascending, with multiplicity.
// Two approaches, each paired with its own line-by-line step-through debugger:
//   • BRUTE — try EVERY divisor d = 2..n. Everything past √n is wasted work.
//             (viz + SRC_BRUTE/traceBrute: watch it grind past √n, testing 1%d forever.)
//   • OPT   — stop at √n; whatever is left above 1 is itself prime.
//             (viz + SRC_OPT/traceOpt: watch it bail the moment d·d > n.)
// The step tabs share the same default n so the contrast is direct: same input,
// the brute drags on for dozens of dead divisions while the √n version stops early.
import { el, mountDebugger } from "../shared.js";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pf-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:2px 0 12px; }
    .pf-legend { display:flex; gap:14px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); margin-top:9px; }
    .pf-legend span { display:inline-flex; align-items:center; gap:5px; }
    .pf-swatch { width:16px; height:14px; border-radius:4px; display:inline-block; border:1px solid var(--border); }
    .pf-explode { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; padding:16px; }
    .pf-explode .huge { font:800 40px var(--mono); font-variant-numeric:tabular-nums; color:var(--danger); }
    .pf-mark { position:relative; }
    .pf-mark::after { content:"√n"; position:absolute; top:-16px; left:50%; transform:translateX(-50%);
      font:700 10px var(--mono); color:var(--warn); white-space:nowrap; }
  `));
}

// ── BRUTE — trial-divide by every d from 2..n, no √n cutoff ──────────────────
function mountBrute(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "number"; inp.value = 360; inp.min = 2; inp.style.width = "120px";
  const go = el("button", "chip on", "factorize");
  ctl.append(el("span", "ctl-label", "n ="), inp, go);
  const presets = el("div", "controls");
  // All 7 official freeCodeCamp cases — 15 and 35 are the semiprimes, where the
  // √n cutoff is most interesting (d=3 divides 15, leaving 5 > 1 for the tail).
  [20, 17, 15, 35, 999, 360, 510510].forEach((v) => { const c = el("button", "chip", String(v)); c.onclick = () => { inp.value = v; render(); }; presets.append(c); });
  const head = el("div", "pf-head");
  const out = el("div");
  host.append(ctl, presets, head, out);

  const CAP = 120;
  function render() {
    const orig = Math.max(2, Math.floor(+inp.value || 2));
    let n = orig; const factors = []; const isFactor = new Set();
    for (let d = 2; d <= orig; d++) {
      if (n % d === 0) { isFactor.add(d); while (n % d === 0) { factors.push(d); n /= d; } }
    }
    const tested = orig - 1;
    const sqrtN = Math.floor(Math.sqrt(orig));

    head.innerHTML =
      `<span class="opcount hot"><span class="n">${tested.toLocaleString()}</span> divisors tested</span>` +
      `<span class="muted mono">d = 2 … ${orig.toLocaleString()}</span>`;

    out.innerHTML = "";
    out.append(el("div", "result-line", `<span class="muted mono">${orig.toLocaleString()} =</span> ` +
      factors.map((f) => `<span class="num right">${f}</span>`).join('<span class="muted"> · </span>')));

    if (orig <= 4000) {
      const shown = Math.min(orig, CAP);
      const sweep = el("div", "sweep");
      for (let d = 2; d <= shown; d++) {
        let cls;
        if (isFactor.has(d)) cls = "dv hit";
        else if (d > sqrtN) cls = "dv past";
        else cls = "dv tested";
        const cell = el("div", cls, String(d));
        if (d === sqrtN) cell.classList.add("pf-mark");
        sweep.append(cell);
      }
      out.append(sweep);
      if (orig > CAP) out.append(el("div", "more", "+" + (orig - CAP).toLocaleString() + " more divisors tested"));
      out.append(el("div", "pf-legend",
        `<span><i class="pf-swatch" style="background:var(--good);border-color:var(--good)"></i>divides (a factor)</span>` +
        `<span><i class="pf-swatch"></i>tested, no factor</span>` +
        `<span><i class="pf-swatch" style="border-color:var(--warn)"></i>past √${orig} — wasted</span>`));
    } else {
      const box = el("div", "panel pf-explode");
      box.innerHTML =
        `<span class="huge">${tested.toLocaleString()}</span>` +
        `<span class="muted mono">divisions — too many to draw.</span>` +
        `<span class="muted mono">The √n version needs only ~${sqrtN.toLocaleString()}.</span>`;
      out.append(box);
    }

    const waste = Math.max(0, tested - Math.max(0, sqrtN - 1));
    out.append(el("div", "note",
      `Trial-dividing by <b>every</b> d up to ${orig.toLocaleString()} means <b>${tested.toLocaleString()}</b> checks. ` +
      `Everything past √${orig} ≈ ${sqrtN} is wasted (${waste.toLocaleString()} needless divisions) — once d·d &gt; n the leftover above 1 must already be prime. ` +
      `See the “√n” tab.`));
  }
  go.onclick = render; inp.onkeydown = (e) => { if (e.key === "Enter") render(); };
  render();
}

// ── OPT — stop at √n; count the trial divisions actually performed ───────────
function mountOpt(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "number"; inp.value = 360; inp.min = 2; inp.style.width = "120px";
  const go = el("button", "chip on", "factorize");
  ctl.append(el("span", "ctl-label", "n ="), inp, go);
  const presets = el("div", "controls");
  // All 7 official freeCodeCamp cases — same set as the brute tab, so the two
  // approaches are always comparable on identical input. 15 and 35 are the
  // semiprimes: the loop stops at √n and the survivor above 1 is pushed by the tail.
  [20, 17, 15, 35, 999, 360, 510510].forEach((v) => { const c = el("button", "chip", String(v)); c.onclick = () => { inp.value = v; render(); }; presets.append(c); });
  const head = el("div", "pf-head");
  const out = el("div");
  host.append(ctl, presets, head, out);

  function render() {
    let n = Math.max(2, Math.floor(+inp.value || 2)); const orig = n;
    const factors = []; let divisions = 0;
    for (let d = 2; d * d <= n; d++) {
      divisions++;
      while (n % d === 0) { factors.push(d); n /= d; }
    }
    if (n > 1) factors.push(n);

    head.innerHTML =
      `<span class="opcount cool"><span class="n">${divisions.toLocaleString()}</span> trial divisions</span>` +
      `<span class="muted mono">d climbs only to √${orig.toLocaleString()} ≈ ${Math.floor(Math.sqrt(orig)).toLocaleString()}</span>`;

    out.innerHTML = "";
    out.append(el("div", "result-line", `<span class="muted mono">${orig.toLocaleString()} =</span> ` +
      factors.map((f) => `<span class="num right">${f}</span>`).join('<span class="muted"> · </span>')));

    const lad = el("div", "panel"); lad.style.font = "13px var(--mono)";
    lad.append(el("div", "muted", "Trial division — divide out the smallest prime each time:"));
    let cur = orig;
    factors.forEach((f) => {
      const row = el("div"); row.style.cssText = "display:flex;gap:10px;align-items:center;padding:3px 0";
      row.innerHTML = `<span class="mono">${cur.toLocaleString()}</span> <span class="muted">÷</span> <span class="num right" style="padding:2px 7px">${f}</span> <span class="muted">=</span> <span class="mono">${(cur / f).toLocaleString()}</span>`;
      lad.append(row); cur = cur / f;
    });
    out.append(lad);
    out.append(el("div", "note",
      `Stop dividing once d·d &gt; n: any remainder above 1 must itself be prime. ` +
      `Only <b>${divisions.toLocaleString()}</b> divisions here — the brute tab does <b>${(orig - 1).toLocaleString()}</b>. ` +
      (orig === 510510 ? `510510 = 2·3·5·7·11·13·17 — the product of the first 7 primes (a “primorial”).` : "")));
  }
  go.onclick = render; inp.onkeydown = (e) => { if (e.key === "Enter") render(); };
  render();
}

// ── STEP (brute) — every divisor d = 2..original, instrumented for the debugger ─
// Paired with the "Divide by every d" tab: watch the for-loop keep testing d long
// after n has hit 1, grinding through divisor after divisor past √n — every one a
// guaranteed miss. That dead work is exactly what the √n version skips.
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">primeFactorization</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> factors = [];` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="orig">original = n</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="init">d = 2</span>; <span class="tok" data-t="cond">d &lt;= original</span>; <span class="tok" data-t="incr">d++</span>) {` },
  { ln: 5,  html: `    <span class="k">while</span> (<span class="tok" data-t="wcond">n % d === 0</span>) {` },
  { ln: 6,  html: `      factors.<span class="fn">push</span>(d);` },
  { ln: 7,  html: `      n = n / d;` },
  { ln: 8,  html: `    }` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> factors;` },
  { ln: 11, html: `}` },
];

// Instrumented run of the brute variant. `d` is block-scoped to the for-loop (lines
// 4–7), `original` appears once saved on line 3, and the trace flags every check
// where d has already climbed past √original — the divisions that can never pay off.
function traceBrute(n0) {
  const steps = []; let factors = []; let n = n0; const original = n0; let d;
  const sqrtN = Math.floor(Math.sqrt(original));
  const S = (line, note, x = {}) => {
    const dLive = line >= 4 && line <= 7;   // `let d` block-scoped to the for-loop
    const origLive = line >= 3;             // original saved on line 3
    const facLive = line >= 2;              // factors declared on line 2
    const vars = { n };
    if (origLive) vars.original = original;
    if (dLive) vars.d = d;
    const structs = facLive ? [{ label: "factors", items: factors.slice(), newest: !!x.facNew }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "primeFactorization", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };
  S(1, `Call <b>primeFactorization(${n0})</b> — the brute way: trial-divide by <b>every</b> d from 2 to n, no √n shortcut.`, { focus: "param", changed: ["n"] });
  S(2, `Declare <b>factors</b>: an empty array to collect the prime factors.`, {});
  S(3, `Save <b>original = ${original}</b> — n shrinks as we divide it out, so keep the ceiling to loop up to.`, { focus: "orig", changed: ["original"] });
  d = 2; S(4, `Initialise the loop: <b>d = 2</b>, the smallest divisor to try.`, { focus: "init", changed: ["d"] });
  for (;;) {
    const c = d <= original;
    const past = d > sqrtN;
    S(4, `Check <b>d ≤ original</b> — ${d} ≤ ${original} → <b>${c}</b>.${c && past ? ` (d is already past √${original} ≈ ${sqrtN}; the √n version stopped long ago — this keeps grinding.)` : ""}`,
      { focus: "cond", eval: { expr: `${d} ≤ ${original}`, val: c } });
    if (!c) { S(4, `d has passed original — every divisor up to n has been tried. <b>Exit the for-loop.</b>`, { focus: "cond", eval: { expr: `${d} > ${original}`, val: false } }); break; }
    for (;;) {
      const w = n % d === 0;
      S(5, `Inner check <b>n % d === 0</b> — ${n} % ${d} = ${n % d} → <b>${w}</b>.`, { focus: "wcond", eval: { expr: `${n} % ${d} = ${n % d}`, val: w } });
      if (!w) {
        S(5, `${n} is not divisible by ${d} — the while-loop ends.${past ? ` And ${d} is past √${original}, so this check never had a chance: pure wasted work.` : ""}`,
          { focus: "wcond", eval: { expr: `${n} % ${d} = ${n % d} ≠ 0`, val: false } });
        break;
      }
      factors.push(d);
      S(6, `${d} divides evenly — <b>push ${d}</b> into factors.`, { facNew: true });
      const p = n; n = n / d;
      S(7, `Divide it out: <b>n = ${p} / ${d} = ${n}</b>. The same factor may divide again.`, { changed: ["n"] });
    }
    d = d + 1; S(4, `Loop step <b>d++</b> → d = ${d}. Back to the condition.`, { focus: "incr", changed: ["d"] });
  }
  S(10, `<b>Return</b> factors = [${factors.join(", ")}]. Correct — but it tested every d up to ${original}, long after n had already dropped to 1.`, { done: true, result: `[${factors.join(", ")}]` });
  return steps;
}

// ── STEP (opt) — the √n code, annotated + instrumented for the shared debugger ─
// Paired with the "Stop at √n" tab: watch the for-loop bail the moment d·d > n,
// leaving any survivor above 1 to be pushed as the final prime.
const SRC_OPT = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">primeFactorization</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> factors = [];` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="init">d = 2</span>; <span class="tok" data-t="cond">d * d &lt;= n</span>; <span class="tok" data-t="incr">d++</span>) {` },
  { ln: 4,  html: `    <span class="k">while</span> (<span class="tok" data-t="wcond">n % d === 0</span>) {` },
  { ln: 5,  html: `      factors.<span class="fn">push</span>(d);` },
  { ln: 6,  html: `      n = n / d;` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">if</span> (<span class="tok" data-t="ifcond">n &gt; 1</span>) factors.<span class="tok" data-t="ifpush"><span class="fn">push</span>(n)</span>;` },
  { ln: 10, html: `  <span class="k">return</span> factors;` },
  { ln: 11, html: `}` },
];

// Instrumented run → generic debugger steps. One frame (no recursion); a variable
// is included in the frame ONLY while it's in scope, so `d` appears with the loop
// and vanishes after it (block-scoped `let`), and `factors` appears at line 2.
function traceOpt(n0) {
  const steps = []; let factors = []; let n = n0, d;
  const S = (line, note, x = {}) => {
    const dLive = line >= 3 && line <= 6;   // `let d` is block-scoped to the for-loop
    const facLive = line >= 2;               // factors declared on line 2
    const vars = { n };
    if (dLive) vars.d = d;
    const structs = facLive ? [{ label: "factors", items: factors.slice(), newest: !!x.facNew }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "primeFactorization", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };
  S(1, `Call <b>primeFactorization(${n0})</b> — the parameter <b>n</b> starts at ${n0}.`, { focus: "param", changed: ["n"] });
  S(2, `Declare <b>factors</b>: an empty array to collect the prime factors.`, {});
  d = 2; S(3, `Initialise the loop: <b>d = 2</b>, the smallest number to try dividing by.`, { focus: "init", changed: ["d"] });
  for (;;) {
    const c = d * d <= n;
    S(3, `Check <b>d·d ≤ n</b> — ${d}·${d} = ${d * d}, and ${d * d} ${c ? "≤" : ">"} ${n} → <b>${c}</b>.`, { focus: "cond", eval: { expr: `${d}·${d} = ${d * d} ${c ? "≤" : ">"} ${n}`, val: c } });
    if (!c) { S(3, `d·d has passed n — no divisor up to √n is left. <b>Exit the for-loop.</b>`, { focus: "cond", eval: { expr: `${d * d} > ${n}`, val: false } }); break; }
    for (;;) {
      const w = n % d === 0;
      S(4, `Inner check <b>n % d === 0</b> — ${n} % ${d} = ${n % d} → <b>${w}</b>.`, { focus: "wcond", eval: { expr: `${n} % ${d} = ${n % d}`, val: w } });
      if (!w) { S(4, `${n} is not divisible by ${d} — the while-loop ends.`, { focus: "wcond", eval: { expr: `${n} % ${d} = ${n % d} ≠ 0`, val: false } }); break; }
      factors.push(d);
      S(5, `${d} divides evenly — <b>push ${d}</b> into factors.`, { facNew: true });
      const p = n; n = n / d;
      S(6, `Divide it out: <b>n = ${p} / ${d} = ${n}</b>. The same factor may divide again.`, { changed: ["n"] });
    }
    d = d + 1; S(3, `Loop step <b>d++</b> → d = ${d}. Back to the condition.`, { focus: "incr", changed: ["d"] });
  }
  const f = n > 1;
  S(9, `Loop done — <b>d</b> leaves scope now (it lived only inside the for-loop). Check <b>n > 1</b> — ${n} > 1 → <b>${f}</b>.`, { focus: "ifcond", eval: { expr: `${n} > 1`, val: f } });
  if (f) { factors.push(n); S(9, `${n} is a prime bigger than √n that survived the loop — <b>push ${n}</b>.`, { focus: "ifpush", facNew: true }); }
  S(10, `<b>Return</b> factors = [${factors.join(", ")}]. Done — every factor is prime, in ascending order.`, { done: true, result: `[${factors.join(", ")}]` });
  return steps;
}

const CODE_BRUTE = `// Brute force: trial-divide by EVERY d from 2 up to n — no √n cutoff.
// Correct, but it keeps testing divisors long after the last factor is found:
// for 360 that's 359 divisions to discover [2,2,2,3,3,5].
function primeFactorization(n: number): number[] {
  const factors: number[] = [];
  const original = n;
  for (let d = 2; d <= original; d++) {
    while (n % d === 0) { factors.push(d); n /= d; } // divide d out fully
  }
  return factors;
}`;

const CODE_OPT = `// Trial division by the SMALLEST factor. Divide it out completely, move on.
// Once d*d > n, whatever remains (> 1) is itself prime — so stop at √n.
function primeFactorization(n: number): number[] {
  const factors: number[] = [];
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { factors.push(d); n /= d; }
  }
  if (n > 1) factors.push(n); // the last prime left standing
  return factors;
}`;

export default {
  n: 314, id: "prime", title: "Prime Factorization", dates: ["2026-06-20"],
  statement: `Return the prime factors of an integer > 1, in ascending order, with multiplicity. <code>20 → [2,2,5]</code>, <code>17 → [17]</code>.`,
  // Grouped by approach: each approach is [intuition viz] → [step-through debugger],
  // and the tone colour pairs them (brute-tinted pair, then opt-tinted pair).
  variants: [
    { name: "Divide by every d", tone: "brute", cost: "O(n)",
      approach: `Trial-divide by <b>every</b> divisor from 2 to n. It finds the right factors, but keeps grinding through divisors far past √n where nothing can be found — <code class='inl'>n−1</code> divisions total.`,
      code: CODE_BRUTE, mount: mountBrute },
    { name: "Step: divide by every d", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — run it one line at a time. Watch the loop keep testing divisor after divisor <b>long past √n</b>, each <code class='inl'>n % d</code> a guaranteed miss once <code class='inl'>n</code> has hit 1: that grind is the wasted work the √n version skips. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Same default n as the √n step tab — compare the step counts.)`,
      // Presets: official 15, 17, 20, 35 (all fit under max: 120 at negligible step
      // cost) + the invented 12/24/60/84, kept because their repeated small factors
      // make the inner while-loop divide the same d out several times in a row.
      // 999/360/510510 are official but trimmed here — brute tests every d up to n,
      // so they'd be thousands of steps. Both are reachable on the demo tabs.
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "n =", value: 12, min: 2, max: 120, presets: [12, 15, 17, 20, 24, 35, 60, 84], hint: "small n — brute tests d up to n" } }) },
    { name: "Stop at √n", tone: "opt", cost: "O(√n)",
      approach: `Divide out the smallest factor fully, then climb d only while <code class='inl'>d·d ≤ n</code>. The moment d² passes n, any leftover above 1 is itself prime — so a handful of divisions replaces the full sweep.`,
      code: CODE_OPT, mount: mountOpt },
    { name: "Step: stop at √n", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the √n solution — run it one line at a time. Watch each <b>condition</b> evaluate to true/false, the <b>branches</b> decide where control goes, <code class='inl'>n</code> shrink as factors divide out, and the loop <b>bail the moment d·d > n</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Same default n as the brute step tab — far fewer steps.)`,
      // Presets: official 15, 17, 20, 35 + the invented 12/24/45/60/84/97. 97 is
      // prime, so the loop finds nothing and the `n > 1` tail pushes 97 itself;
      // 15/35 show the same tail with a factor already divided out first.
      // 510510 is official but trimmed (it exceeds max: 999) — reachable on the demo.
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: { label: "n =", value: 12, min: 2, max: 999, presets: [12, 15, 17, 20, 24, 35, 45, 60, 84, 97], hint: "small n — step trace" } }) },
  ],
};
