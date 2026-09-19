// #304 · Itinerary Arrangements — count valid day-trip itineraries.
// Two variants of the SAME question:
//   • BRUTE  — actually enumerate every concrete itinerary and count the list.
//   • OPT    — don't enumerate; the answer is the closed form (2n−3)·n!.
// The point of the brute demo is to SHOW the pile of real arrangements the
// formula collapses into a single multiplication.
import { el, mountDebugger } from "../shared.js";

const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));

// All permutations of a small array (n ≤ 6 here → at most 720).
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .itin-skel { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font:600 12px var(--mono); }
    .itin-list { display:flex; flex-direction:column; gap:5px; margin-top:10px; }
    .itin-row { display:flex; align-items:center; gap:5px; flex-wrap:wrap;
      padding:5px 9px; border:1px solid var(--border); border-radius:7px;
      background:var(--panel-2); font:600 11.5px var(--mono); }
    .itin-idx { color:var(--muted); width:2.4em; flex:none; text-align:right; opacity:.7; }
    .itin-meal { color:var(--good); border:1px solid color-mix(in srgb, var(--good) 55%, var(--border));
      border-radius:5px; padding:2px 6px; }
    .itin-stop { color:var(--accent); border:1px solid color-mix(in srgb, var(--accent) 55%, var(--border));
      border-radius:5px; padding:2px 6px; }
    .itin-dot { color:var(--muted); opacity:.6; }
  `));
}

const opBadge = (cls, n, label) =>
  `<span class="opcount ${cls}"><span class="n">${n}</span> ${label}</span>`;

// ── OPTIMIZED — pure arithmetic, no enumeration ──────────────────────────────
function mountOptimized(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const rng = el("input"); rng.type = "range"; rng.min = 2; rng.max = 7; rng.value = 3; rng.style.width = "180px";
  const lab = el("span", "ctl-label");
  ctl.append(el("span", "ctl-label", "optional stops n ="), rng, lab);
  const out = el("div");
  host.append(ctl, out);

  function render() {
    const n = +rng.value; lab.textContent = ` ${n}`;
    const skeleton = el("div", "panel itin-skel");
    const slot = (txt, col) => `<span class="tag" style="border-color:${col}">${txt}</span>`;
    skeleton.innerHTML =
      slot("breakfast", "var(--good)") + '<span class="itin-dot">→</span>' +
      slot("gap A · ≥1", "var(--accent)") + '<span class="itin-dot">→</span>' +
      slot("lunch", "var(--good)") + '<span class="itin-dot">→</span>' +
      slot("gap B · ≥1", "var(--accent)") + '<span class="itin-dot">→</span>' +
      slot("dinner", "var(--good)") + '<span class="itin-dot">→</span>' +
      slot("gap C · 0–1", "var(--warn)");

    const comps = [];
    for (let c = 0; c <= 1; c++) for (let a = 1; a <= n; a++) { const b = n - a - c; if (b >= 1) comps.push([a, b, c]); }
    const grid = el("div", "panel");
    grid.innerHTML = `<div class="muted" style="margin-bottom:6px">${comps.length} valid gap-size placements <span class="mono">(a,b,c)</span> — i.e. 2n−3 = ${2 * n - 3}:</div>`;
    const wrap = el("div", "units");
    comps.forEach(([a, b, c]) => wrap.append(el("span", "unit", `${a},${b},${c}`)));
    grid.append(wrap);

    out.innerHTML = "";
    out.append(el("div", "result-line", opBadge("cool", "1", "multiplication — nothing enumerated")));
    out.append(skeleton, grid);
    out.append(el("div", "result-line",
      `<span class="big">${((2 * n - 3) * fact(n)).toLocaleString()}</span>` +
      `<span class="muted mono">= (2·${n} − 3) × ${n}!  =  ${2 * n - 3} × ${fact(n).toLocaleString()}</span>`));
    out.append(el("div", "note", "Each placement fixes only the <em>counts</em> in each gap. The n distinct stops are then arranged across those slots in n! ways — so the answer is the placement count times n!. One line of arithmetic, no list built."));
  }
  rng.oninput = render; render();
}

// ── BRUTE — build every concrete itinerary, count the pile ───────────────────
function mountBrute(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const rng = el("input"); rng.type = "range"; rng.min = 2; rng.max = 6; rng.value = 3; rng.style.width = "180px";
  const lab = el("span", "ctl-label");
  ctl.append(el("span", "ctl-label", "optional stops n ="), rng, lab);
  const out = el("div");
  host.append(ctl, out);
  const CAP = 24;

  function render() {
    const n = +rng.value; lab.textContent = ` ${n}`;
    const stops = Array.from({ length: n }, (_, i) => "S" + (i + 1));
    const perms = permute(stops);

    // Actually enumerate: every gap-size placement × every ordering of the stops.
    const arrangements = [];
    for (let c = 0; c <= 1; c++) for (let a = 1; a <= n; a++) {
      const b = n - a - c; if (b < 1) continue;
      for (const p of perms) arrangements.push({ A: p.slice(0, a), B: p.slice(a, a + b), C: p.slice(a + b) });
    }
    const total = arrangements.length; // === (2n − 3) · n!

    out.innerHTML = "";
    out.append(el("div", "result-line", opBadge("hot", total.toLocaleString(), "real itineraries generated")));

    const list = el("div", "itin-list");
    const stopSpan = (s) => `<span class="itin-stop">${s}</span>`;
    const meal = (m) => `<span class="itin-meal">${m}</span>`;
    const dot = '<span class="itin-dot">·</span>';
    arrangements.slice(0, CAP).forEach((it, i) => {
      const seg = (arr) => arr.map(stopSpan).join(" ");
      let html = `<span class="itin-idx">${i + 1}</span>` +
        meal("breakfast") + dot + seg(it.A) + dot + meal("lunch") + dot + seg(it.B) + dot + meal("dinner");
      if (it.C.length) html += dot + seg(it.C);
      list.append(el("div", "itin-row", html));
    });
    out.append(list);
    if (total > CAP) out.append(el("div", "more", `+ ${(total - CAP).toLocaleString()} more itineraries not shown…`));
    out.append(el("div", "note",
      `Every row above is one real itinerary the brute force must build and hold. There are <b>${total.toLocaleString()}</b> of them` +
      `${n === 6 ? " at n=6" : ""} = (2·${n}−3) × ${n}! — and this is only the first ${Math.min(CAP, total)}. ` +
      `Flip to <em>Optimized</em>: that same count drops out of a single multiplication, with nothing enumerated.`));
  }
  rng.oninput = render; render();
}

const BRUTE_CODE = `// Brute force: build EVERY valid itinerary, then count the list.
function getItineraryCount(stops: string[]): number {
  const n = stops.length;
  const out: string[] = [];
  const permute = (a: string[]): string[][] =>
    a.length <= 1 ? [a]
      : a.flatMap((s, i) =>
          permute([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [s, ...p]));

  for (let c = 0; c <= 1; c++) {           // stops after dinner: 0 or 1
    for (let a = 1; a <= n; a++) {          // stops before lunch: >= 1
      const b = n - a - c;                  // stops between lunch & dinner
      if (b < 1) continue;                  // must be >= 1
      for (const p of permute(stops)) {     // every ordering of the stops
        const A = p.slice(0, a), B = p.slice(a, a + b), C = p.slice(a + b);
        out.push(["breakfast", ...A, "lunch", ...B, "dinner", ...C].join(" · "));
      }
    }
  }
  return out.length;                        // the whole point: this equals (2n - 3) * n!
}`;

const OPT_CODE = `// Don't enumerate — count. The itinerary is a fixed skeleton with 3 gaps:
//   breakfast · [gap A >= 1] · lunch · [gap B >= 1] · dinner · [gap C in {0,1}]
//   #ways to size the gaps       = (n-1) + (n-2) = 2n - 3
//   #ways to order the n stops                    = n!
function getItineraryCount(stops: string[]): number {
  const n = stops.length;
  const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));
  return (2 * n - 3) * factorial(n);
}`;

// ── STEP (brute) — enumerate the pile the formula collapses. Cross every legal
// gap-sizing (a,b,c) with every ordering of the n stops, BUILD each concrete
// itinerary, and tally. Deliberately paired with the "Enumerate all" tab: watch
// count climb one real itinerary at a time — the work the formula skips. ───────
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getItineraryCount</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> count = <span class="tok" data-t="init">0</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cinit">c = 0</span>; <span class="tok" data-t="ccond">c &lt;= 1</span>; <span class="tok" data-t="cincr">c++</span>) {  <span class="cm">// stops after dinner: 0 or 1</span>` },
  { ln: 4,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="ainit">a = 1</span>; <span class="tok" data-t="acond">a &lt;= n</span>; <span class="tok" data-t="aincr">a++</span>) {  <span class="cm">// stops before lunch: &gt;= 1</span>` },
  { ln: 5,  html: `      <span class="k">const</span> b = <span class="tok" data-t="bcalc">n - a - c</span>;  <span class="cm">// stops between lunch &amp; dinner</span>` },
  { ln: 6,  html: `      <span class="k">if</span> (<span class="tok" data-t="bcheck">b &lt; 1</span>) <span class="k">continue</span>;  <span class="cm">// b must be &gt;= 1</span>` },
  { ln: 7,  html: `      <span class="k">for</span> (<span class="k">const</span> p <span class="k">of</span> <span class="tok" data-t="perm">permute(stops)</span>) {  <span class="cm">// every ordering</span>` },
  { ln: 8,  html: `        <span class="tok" data-t="build">build(breakfast·A·lunch·B·dinner·C)</span>; count++;` },
  { ln: 9,  html: `      }` },
  { ln: 10, html: `    }` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="ret">count</span>;  <span class="cm">// === (2n-3) * n!</span>` },
  { ln: 13, html: `}` },
];

// Instrumented run → generic debugger steps. ONE frame (no recursion), but a
// growing `built` pile. Scope by omission and line-range: `c` lives across the
// outer loop, `a`/`b` across the inner loop, the current `itinerary` only while
// an ordering is in hand — each vanishes from the panel when out of scope.
function traceBrute(n0) {
  const n = n0;
  const stops = Array.from({ length: n }, (_, i) => "S" + (i + 1));
  const perms = permute(stops);
  const steps = []; const built = [];
  let count, c, a, b, itin;
  const S = (line, note, x = {}) => {
    const cLive = line >= 3 && line <= 11;
    const aLive = line >= 4 && line <= 10;
    const bLive = line >= 5 && line <= 10;
    const pLive = line >= 7 && line <= 9 && x.pShow;
    const vars = { n };
    if (count !== undefined) vars.count = count;
    if (cLive && c !== undefined) vars.c = c;
    if (aLive && a !== undefined) vars.a = a;
    if (bLive && b !== undefined) vars.b = b;
    if (pLive) vars.itinerary = itin;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getItineraryCount", vars, changed: x.changed || [],
        structs: [{ label: "built", items: built.slice(), newest: !!x.newest }] }] });
  };

  S(1, `Call <b>getItineraryCount(${n})</b> — the brute way: actually BUILD every valid itinerary and count the pile. n = ${n} optional stops → ${perms.length} ordering${perms.length === 1 ? "" : "s"} to try per legal gap-sizing.`, { focus: "param" });
  count = 0;
  S(2, `Start the tally at <b>count = 0</b>. Every real itinerary we construct bumps it by one.`, { focus: "init", changed: ["count"] });

  c = 0;
  S(3, `Outer loop: <b>c</b> = stops placed AFTER dinner. Start <b>c = 0</b>.`, { focus: "cinit", changed: ["c"] });
  for (;;) {
    const cc = c <= 1;
    S(3, `Check <b>c ≤ 1</b> — ${c} ${cc ? "≤" : ">"} 1 → <b>${cc}</b>. (At most one stop after dinner.)`, { focus: "ccond", eval: { expr: `${c} ${cc ? "≤" : ">"} 1`, val: cc } });
    if (!cc) { S(3, `c has passed 1 — <b>exit the outer loop</b>.`, { focus: "ccond", eval: { expr: `${c} > 1`, val: false } }); break; }

    a = 1;
    S(4, `Inner loop: <b>a</b> = stops before lunch (must be ≥ 1). Start <b>a = 1</b>.`, { focus: "ainit", changed: ["a"] });
    for (;;) {
      const ac = a <= n;
      S(4, `Check <b>a ≤ n</b> — ${a} ${ac ? "≤" : ">"} ${n} → <b>${ac}</b>.`, { focus: "acond", eval: { expr: `${a} ${ac ? "≤" : ">"} ${n}`, val: ac } });
      if (!ac) { S(4, `a has passed n — <b>exit the inner loop</b>, then bump c.`, { focus: "acond", eval: { expr: `${a} > ${n}`, val: false } }); break; }
      b = n - a - c;
      S(5, `The lunch→dinner gap gets whatever is left: <b>b = n − a − c = ${n} − ${a} − ${c} = ${b}</b>.`, { focus: "bcalc", changed: ["b"] });
      const bad = b < 1;
      S(6, `Is this gap-sizing legal? <b>b &lt; 1</b> — ${b} &lt; 1 → <b>${bad}</b>.${bad ? " Illegal (need ≥ 1 between lunch &amp; dinner) — <b>skip it</b>." : " Legal — now enumerate every ordering of the stops."}`, { focus: "bcheck", eval: { expr: `${b} < 1`, val: bad } });
      if (bad) {
        a = a + 1;
        S(4, `<b>continue</b> → a++ → a = ${a}. Back to the check.`, { focus: "aincr", changed: ["a"] });
        continue;
      }
      for (const p of perms) {
        const A = p.slice(0, a), B = p.slice(a, a + b), C = p.slice(a + b);
        itin = `${A.join(" ")} | ${B.join(" ")} | ${C.length ? C.join(" ") : "∅"}`;
        built.push(itin);
        count = count + 1;
        S(8, `Gap-sizing <b>(a,b,c) = (${a},${b},${c})</b> × ordering <b>[${p.join(" ")}]</b> → build one real itinerary <b>breakfast · ${A.join(" ")} · lunch · ${B.join(" ")} · dinner${C.length ? " · " + C.join(" ") : ""}</b>. Push it, <b>count → ${count}</b>.`, { focus: "build", pShow: true, newest: true, changed: ["count"] });
      }
      a = a + 1;
      S(4, `Ordering loop done for this gap-sizing. <b>a++</b> → a = ${a}.`, { focus: "aincr", changed: ["a"] });
    }
    c = c + 1;
    S(3, `<b>c++</b> → c = ${c}. Back to the outer check.`, { focus: "cincr", changed: ["c"] });
  }

  const ans = count;
  S(12, `Every legal gap-sizing crossed with every ordering — <b>${built.length}</b> itineraries actually built and held. <b>Return count = ${ans}</b> = (2·${n} − 3) × ${n}! = ${2 * n - 3} × ${fact(n)}. The formula tab gets this same number with one multiply.`, { focus: "ret", done: true, result: ans });
  return steps;
}

// ── STEP (formula) — debugger of the formula. The formula itself has no loop, so
// we build the trace by computing n! with an EXPLICIT loop: something to actually
// step, with a running product `fact` and a counter `k`, then apply (2n−3)·n!. ──
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getItineraryCount</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> placements = <span class="tok" data-t="place">2 * n - 3</span>;` },
  { ln: 3, html: `  <span class="k">let</span> fact = <span class="tok" data-t="factinit">1</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="init">k = 2</span>; <span class="tok" data-t="cond">k &lt;= n</span>; <span class="tok" data-t="incr">k++</span>) {` },
  { ln: 5, html: `    fact = <span class="tok" data-t="mul">fact * k</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">placements * fact</span>;` },
  { ln: 8, html: `}` },
];

// Instrumented run → generic debugger steps. ONE frame (no recursion). Scope by
// omission: `placements`/`fact` appear once declared; `k` is block-scoped to the
// for-loop so it shows up on line 4 and vanishes after the loop exits.
function traceOpt(n0) {
  const steps = []; let n = n0, placements, fact, k;
  const S = (line, note, x = {}) => {
    const kLive = line >= 4 && line <= 5;   // `let k` is block-scoped to the for-loop
    const vars = { n };
    if (placements !== undefined) vars.placements = placements;
    if (fact !== undefined) vars.fact = fact;
    if (kLive) vars.k = k;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getItineraryCount", vars, changed: x.changed || [] }] });
  };
  S(1, `Call <b>getItineraryCount(${n0})</b> — <b>n</b> = ${n0} optional stops. We count itineraries WITHOUT building any list.`, { focus: "param", changed: ["n"] });
  placements = 2 * n - 3;
  S(2, `The itinerary is a fixed skeleton with three gaps to size. There are <b>2n−3 = 2·${n} − 3 = ${placements}</b> ways to choose the gap sizes — that's the whole shape decided.`, { focus: "place", changed: ["placements"] });
  fact = 1;
  S(3, `Now count how many ways to <em>order</em> the ${n} distinct stops: that's ${n}!. Start a running product <b>fact = 1</b> and fold the stops in one at a time.`, { focus: "factinit", changed: ["fact"] });
  k = 2;
  S(4, `Initialise the factorial loop: <b>k = 2</b>. (Multiplying by 1 changes nothing, so start at 2.)`, { focus: "init", changed: ["k"] });
  for (;;) {
    const c = k <= n;
    S(4, `Check <b>k ≤ n</b> — ${k} ${c ? "≤" : ">"} ${n} → <b>${c}</b>.`, { focus: "cond", eval: { expr: `${k} ${c ? "≤" : ">"} ${n}`, val: c } });
    if (!c) { S(4, `k has passed n — every stop is folded in. <b>Exit the loop.</b> fact now holds ${fact.toLocaleString()} = ${n}!.`, { focus: "cond", eval: { expr: `${k} > ${n}`, val: false } }); break; }
    const p = fact; fact = fact * k;
    S(5, `Fold the next stop in: <b>fact = ${p.toLocaleString()} × ${k} = ${fact.toLocaleString()}</b>.`, { focus: "mul", changed: ["fact"] });
    k = k + 1;
    S(4, `Loop step <b>k++</b> → k = ${k}. Back to the condition.`, { focus: "incr", changed: ["k"] });
  }
  const ans = placements * fact;
  S(7, `Combine the two counts: <b>placements × fact = ${placements} × ${fact.toLocaleString()} = ${ans.toLocaleString()}</b>. That's (2n−3)·n! — every itinerary counted with one multiplication, nothing enumerated.`, { focus: "ret", changed: [], done: true, result: ans.toLocaleString() });
  return steps;
}

export default {
  n: 304, id: "itinerary", title: "Itinerary Arrangements", dates: ["2026-06-10"],
  statement: `Count valid day-trip itineraries. <code>breakfast/lunch/dinner</code> are fixed; optional stops slot around them with rules: ≥1 stop before lunch, ≥1 between lunch and dinner, at most one after dinner. <span class="rule">Return how many arrangements exist.</span>`,
  // Grouped by approach: each approach is [intuition viz] → [step through], and
  // the tone colour pairs them (brute-tinted pair, then opt-tinted pair).
  variants: [
    {
      name: "Enumerate all", tone: "brute", cost: "O(n!·n) enumerate",
      approach: `Do it the obvious way: cross every valid gap-sizing with every permutation of the n distinct stops, materialise each concrete itinerary, and return the length. Correct — but the list is <code class='inl'>(2n−3)·n!</code> long, so at n=6 you build <b>6,480</b> arrangements just to learn a count.`,
      code: BRUTE_CODE, mount: mountBrute,
    },
    {
      name: "Step: enumerate", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — step the nested loops that <b>build every real itinerary</b>. Watch <code class='inl'>count</code> climb one arrangement at a time as each legal gap-sizing <code class='inl'>(a,b,c)</code> is crossed with every ordering of the stops, and see illegal gap-sizings get skipped. That whole pile is what the formula collapses into one multiply. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (n capped small — the pile is <code class='inl'>(2n−3)·n!</code>.)`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "n =", value: 3, min: 2, max: 3, presets: [2, 3], hint: "small n — every itinerary built" } }),
    },
    {
      name: "(2n−3)·n! formula", tone: "opt", cost: "O(1) formula",
      approach: `Never build the list. The skeleton has three gaps with tiny constraints, giving <code class='inl'>2n−3</code> ways to size them; the n distinct stops then permute in <code class='inl'>n!</code> ways. Answer: <code class='inl'>(2n−3)·n!</code> — one multiplication.`,
      code: OPT_CODE, mount: mountOptimized,
    },
    {
      name: "Step: formula", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the formula — watch the two counts come together. The <b>2n−3</b> gap-sizings drop out in one line; the <code class='inl'>n!</code> orderings are built by an explicit loop so you can watch <code class='inl'>fact</code> grow one stop at a time, then a single multiply gives the answer. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: { label: "n =", value: 4, min: 2, max: 8, presets: [2, 3, 4, 5, 6, 7, 8], hint: "small n — step trace" } }),
    },
  ],
};
