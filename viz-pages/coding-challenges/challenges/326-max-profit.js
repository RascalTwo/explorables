// #326 · Max Profit — one buy, one later sell, whole shares only.
// TWO variants: brute-force every (buy, sell) pair O(n²) vs a single pass over a
// SUFFIX-MAX of prices O(n). Integer-cents math throughout to dodge float bugs.
import { el, esc, mountDebugger } from "../shared.js";

// Provenance: freeCodeCamp's OFFICIAL six test cases, verbatim and in the
// published order. No invented cases here — the official set already covers the
// interesting branches (no-profit, cheaper-buy-buys-more-shares, fractional
// budget, duplicated peak price).
const PRESETS = [
  { prices: [5, 6], budget: 50, expect: "10.00" },
  { prices: [8, 2, 5, 10], budget: 20, expect: "80.00" },
  { prices: [4, 5, 3, 6], budget: 20, expect: "18.00" },
  { prices: [54.40, 51.22, 53.99, 50.28, 53.01, 52.84], budget: 200, expect: "8.31" },
  { prices: [15.38, 15.01, 14.99, 14.62, 14.28], budget: 80, expect: "0.00" },
  // The only official case with a fractional budget — so it's the one that
  // exercises Math.round(budget * 100) at all — and the one that shows why the
  // rounding is there: 128.83 * 100 === 12883.000000000002 in IEEE-754, so a
  // plain (p * 100) would carry that dust into every profit. It's also the only
  // duplicated peak (128.83 twice → strict `profit > best` keeps the FIRST
  // sell day, and the suffix-max ties across both).
  { prices: [121.45, 126.82, 122.91, 124.65, 128.83, 128.83, 127.33], budget: 1230.25, expect: "73.80" },
];

const toCents = (arr) => arr.map((p) => Math.round(p * 100));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mp-chart { width:100%; border:1px solid var(--border); border-radius:12px; background:var(--panel); display:block; }
    .mp-bar { fill:color-mix(in srgb,var(--muted) 30%,transparent); transition:fill .15s; }
    .mp-bar.buy { fill:color-mix(in srgb,var(--good) 55%,transparent); }
    .mp-bar.sell { fill:color-mix(in srgb,var(--accent) 55%,transparent); }
    .mp-bar.dim { opacity:.28; }
    .mp-line { fill:none; stroke:var(--muted); stroke-width:1.5; opacity:.65; }
    .mp-suf { fill:none; stroke:var(--good); stroke-width:2; stroke-dasharray:5 4; }
    .mp-dot { fill:var(--text); }
    .mp-lbl { font:600 10px var(--mono); fill:var(--muted); }
    .mp-lbl.px { fill:var(--text); }
    .mp-tag { font:800 11px var(--mono); }
    .mp-tag.buy { fill:var(--good); } .mp-tag.sell { fill:var(--accent); }
    .mp-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
    .mp-res { display:flex; align-items:baseline; gap:8px; margin-left:auto; }
    .mp-res .big { color:var(--accent); }
    .mp-eval { display:grid; grid-template-columns:repeat(auto-fill,minmax(118px,1fr)); gap:6px; margin-top:12px; }
    .mp-cell { border:1px solid var(--border); border-radius:8px; padding:7px 9px; font:11.5px var(--mono); background:var(--panel); }
    .mp-cell.win { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,transparent); }
    .mp-cell .d { color:var(--muted); font-size:10px; }
    .mp-cell .p { font-weight:800; color:var(--text); }
    .mp-cell.win .p { color:var(--accent); }
    .mp-cell.zero .p { color:var(--muted); font-weight:600; }
  `));
}

// One shared SVG chart. opts: { buy, sell, dimAfter, suffix }
function chart(prices, opts = {}) {
  const n = prices.length;
  const W = 560, H = 190, padL = 34, padR = 12, padT = 14, padB = 30;
  const lo = Math.min(...prices), hi = Math.max(...prices), span = (hi - lo) || 1;
  const iw = W - padL - padR, colW = iw / n;
  const cx = (i) => padL + colW * (i + 0.5);
  const y = (p) => padT + (1 - (p - lo) / span) * (H - padT - padB);
  const barW = Math.min(30, colW * 0.5);

  let bars = "", dots = "", labels = "";
  prices.forEach((p, i) => {
    const cls = i === opts.buy ? "buy" : i === opts.sell ? "sell"
      : (opts.dimAfter != null && i > opts.dimAfter) ? "dim" : "";
    const top = y(p), h = (H - padB) - top;
    bars += `<rect class="mp-bar ${cls}" x="${cx(i) - barW / 2}" y="${top}" width="${barW}" height="${Math.max(1, h)}" rx="3"/>`;
    dots += `<circle class="mp-dot" cx="${cx(i)}" cy="${top}" r="2.5"/>`;
    labels += `<text class="mp-lbl px" x="${cx(i)}" y="${top - 6}" text-anchor="middle">${p.toFixed(2)}</text>`;
    labels += `<text class="mp-lbl" x="${cx(i)}" y="${H - padB + 15}" text-anchor="middle">d${i}</text>`;
    if (i === opts.buy) labels += `<text class="mp-tag buy" x="${cx(i)}" y="${H - padB + 26}" text-anchor="middle">BUY</text>`;
    if (i === opts.sell) labels += `<text class="mp-tag sell" x="${cx(i)}" y="${H - padB + 26}" text-anchor="middle">SELL</text>`;
  });
  const linePts = prices.map((p, i) => `${cx(i)},${y(p)}`).join(" ");
  let suf = "";
  if (opts.suffix) {
    // step line of the best FUTURE price at each buy day (suffix-max shifted)
    let d = "";
    opts.suffix.forEach((s, i) => {
      const yy = y(s / 100);
      const x0 = cx(i) - colW / 2, x1 = cx(i) + colW / 2;
      d += (i === 0 ? `M ${x0} ${yy}` : ` L ${x0} ${yy}`) + ` L ${x1} ${yy}`;
    });
    suf = `<path class="mp-suf" d="${d}"/>`;
  }
  return `<svg class="mp-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <polyline class="mp-line" points="${linePts}"/>${suf}${bars}${dots}${labels}</svg>`;
}

function controls(host, onChange) {
  ensureStyle();
  let cur = 1;
  const pre = el("div", "controls");
  PRESETS.forEach((p, i) => {
    const c = el("button", "chip", `[${p.prices.map((x) => (Number.isInteger(x) ? x : x.toFixed(2))).join(", ")}] $${p.budget}`);
    c.onclick = () => { cur = i; sync(); onChange(PRESETS[i]); };
    pre.append(c); p._chip = c;
  });
  const out = el("div");
  host.append(pre, out);
  function sync() { PRESETS.forEach((p, i) => p._chip.classList.toggle("on", i === cur)); }
  sync(); queueMicrotask(() => onChange(PRESETS[cur])); // defer: caller's `const out = controls(...)` must finish first (TDZ)
  return out;
}

// ── Brute: every (i, j) with j > i ─────────────────────────────────────────
function mountBrute(host) {
  const out = controls(host, render);
  function render({ prices, budget }) {
    const cents = toCents(prices), bC = Math.round(budget * 100), n = cents.length;
    let best = 0, bi = -1, bj = -1, pairs = 0;
    for (let i = 0; i < n - 1; i++) {
      const shares = Math.floor(bC / cents[i]);
      for (let j = i + 1; j < n; j++) {
        pairs++;
        const profit = shares * (cents[j] - cents[i]);
        if (profit > best) { best = profit; bi = i; bj = j; }
      }
    }
    const shares = bi >= 0 ? Math.floor(bC / cents[bi]) : 0;
    out.innerHTML = `
      <div class="mp-head">
        <span class="opcount hot"><span class="n">${pairs}</span> pairs · n(n−1)/2</span>
        <div class="mp-res"><span class="units">budget $${budget.toFixed(2)}</span><span class="big">$${(best / 100).toFixed(2)}</span></div>
      </div>
      ${chart(prices, { buy: bi, sell: bj })}
      <div class="note">${bi >= 0 && best > 0
        ? `Best pair: buy day <b>${bi}</b> at $${prices[bi].toFixed(2)} → ${shares} whole share${shares === 1 ? "" : "s"}, sell day <b>${bj}</b> at $${prices[bj].toFixed(2)}. Profit = ${shares} · ($${prices[bj].toFixed(2)} − $${prices[bi].toFixed(2)}) = <b>$${(best / 100).toFixed(2)}</b>.`
        : `No pair yields a positive profit — every later price is ≤ the buy price. Return <b>0.00</b>.`}
        Brute force scores all <b>${pairs}</b> ordered pairs.</div>`;
  }
}

// ── Optimized: suffix-max of prices, one pass ──────────────────────────────
function mountOpt(host) {
  const out = controls(host, render);
  function render({ prices, budget }) {
    const cents = toCents(prices), bC = Math.round(budget * 100), n = cents.length;
    const suffixMax = new Array(n).fill(0);
    suffixMax[n - 1] = cents[n - 1];
    for (let i = n - 2; i >= 0; i--) suffixMax[i] = Math.max(cents[i], suffixMax[i + 1]);
    let best = 0, bi = -1;
    const rows = [];
    for (let i = 0; i < n - 1; i++) {
      const shares = Math.floor(bC / cents[i]);
      const profit = shares * (suffixMax[i + 1] - cents[i]);
      rows.push({ i, shares, bestSell: suffixMax[i + 1], profit });
      if (profit > best) { best = profit; bi = i; }
    }
    // find the sell day that realises bestSell for the winning buy day
    let sellIdx = -1;
    if (bi >= 0) for (let j = bi + 1; j < n; j++) if (cents[j] === suffixMax[bi + 1]) { sellIdx = j; break; }

    const cells = rows.map((r) => `
      <div class="mp-cell ${r.i === bi && best > 0 ? "win" : ""} ${r.profit <= 0 ? "zero" : ""}">
        <div class="d">buy d${r.i} @ $${prices[r.i].toFixed(2)}</div>
        <div>${r.shares}×($${(r.bestSell / 100).toFixed(2)}−$${prices[r.i].toFixed(2)})</div>
        <div class="p">$${(r.profit / 100).toFixed(2)}</div>
      </div>`).join("");

    out.innerHTML = `
      <div class="mp-head">
        <span class="opcount cool"><span class="n">${n}</span> passes · O(n)</span>
        <div class="mp-res"><span class="units">budget $${budget.toFixed(2)}</span><span class="big">$${(best / 100).toFixed(2)}</span></div>
      </div>
      ${chart(prices, { buy: bi, sell: sellIdx, suffix: suffixMax })}
      <div class="note"><b style="color:var(--good)">Dashed step line</b> = suffix-max (best price from each day onward). The classic “min price so far” trick <b>doesn't</b> apply here: shares = ⌊budget / buyPrice⌋ depends on the buy price, so a cheaper buy can still lose to a costlier one that buys more shares. So we scan future <b>maxima</b> instead — each buy day is scored once against the best reachable sell.</div>
      <div class="mp-eval">${cells}</div>`;
  }
}

// ── STEP — line-by-line debugger of the brute-force O(n²) pair search ────────
// Preset-index input: the real input is (array of prices + budget), so we curate
// a few short series and let the numeric field pick one. Small n keeps the n²
// trace to a few dozen steps.
// Provenance: all SIX of freeCodeCamp's official cases, re-ordered shortest-trace
// first. None are invented, and none are dropped — the longest is n=7 (21 pairs),
// which still traces in well under a hundred steps.
const CASES = [
  { prices: [8, 2, 5, 10], budget: 20 },                       // official 2 — the headline example → 80.00
  { prices: [4, 5, 3, 6], budget: 20 },                        // official 3 — cheaper buy buys more shares → 18.00
  { prices: [5, 6], budget: 50 },                              // official 1 — smallest case, a single pair → 10.00
  { prices: [15.38, 15.01, 14.99, 14.62, 14.28], budget: 80 }, // official 5 — all downhill, no profit → 0.00
  { prices: [54.40, 51.22, 53.99, 50.28, 53.01, 52.84], budget: 200 }, // official 4 — jagged, n=6 → 8.31
  { prices: [121.45, 126.82, 122.91, 124.65, 128.83, 128.83, 127.33], budget: 1230.25 }, // official 6 — fractional budget + duplicated peak, n=7 → 73.80
];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getMaxProfit</span>(prices, budget) {` },
  { ln: 2,  html: `  <span class="k">const</span> cents = prices.<span class="fn">map</span>(p =&gt; Math.<span class="fn">round</span>(p * 100));` },
  { ln: 3,  html: `  <span class="k">const</span> budgetCents = Math.<span class="fn">round</span>(budget * 100);` },
  { ln: 4,  html: `  <span class="k">const</span> n = cents.length;` },
  { ln: 5,  html: `  <span class="k">let</span> best = 0, buyDay = -1, sellDay = -1;` },
  { ln: 6,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="oinit">i = 0</span>; <span class="tok" data-t="ocond">i &lt; n - 1</span>; <span class="tok" data-t="oincr">i++</span>) {` },
  { ln: 7,  html: `    <span class="k">const</span> <span class="tok" data-t="shares">shares = Math.floor(budgetCents / cents[i])</span>;` },
  { ln: 8,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="jinit">j = i + 1</span>; <span class="tok" data-t="jcond">j &lt; n</span>; <span class="tok" data-t="jincr">j++</span>) {` },
  { ln: 9,  html: `      <span class="k">const</span> <span class="tok" data-t="profit">profit = shares * (cents[j] - cents[i])</span>;` },
  { ln: 10, html: `      <span class="k">if</span> (<span class="tok" data-t="cmp">profit &gt; best</span>) { best = profit; buyDay = i; sellDay = j; }` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `  }` },
  { ln: 13, html: `  <span class="k">return</span> <span class="tok" data-t="ret">(best / 100).toFixed(2)</span>;` },
  { ln: 14, html: `}` },
];

// Instrumented run → generic debugger steps. One call frame (no recursion). A
// variable appears in the frame ONLY while it's in scope: `i` lives with the
// outer loop, `shares` inside one outer pass, `j`/`profit` inside the inner loop.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { prices, budget } = CASES[idx];
  const steps = [];
  const cents = prices.map((p) => Math.round(p * 100));
  const budgetCents = Math.round(budget * 100);
  const n = cents.length;
  const d = (x) => "$" + (x / 100).toFixed(2);      // cents → dollars string
  const day = (k) => (k < 0 ? "—" : "d" + k);
  let best = 0, buyDay = -1, sellDay = -1, i, j, shares, profit;

  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 6 && line <= 12) vars.i = i;
    if (line >= 7 && line <= 11) vars.shares = shares;
    if (line >= 8 && line <= 11) vars.j = j;
    if (line >= 9 && line <= 10) vars.profit = d(profit);
    vars.best = d(best); vars.buyDay = day(buyDay); vars.sellDay = day(sellDay);
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getMaxProfit", vars, changed: x.changed || [],
        structs: [{ label: `prices($)  d0→d${n - 1}`, items: prices.map((p) => p.toFixed(2)) }] }] });
  };

  const priceList = prices.map((p) => "$" + p.toFixed(2)).join(", ");
  S(1, `<b>Case ${idx + 1} of ${CASES.length}:</b> prices [${priceList}] with a budget of ${d(budgetCents)}. Brute force will score <b>every</b> ordered pair (buy day <b>i</b>, later sell day <b>j</b>) and keep the most profitable.`, {});
  S(2, `Work in whole <b>cents</b> to dodge floating-point money errors — every price ×100, rounded to an integer.`, {});
  S(3, `Convert the budget too: <b>budgetCents</b> = ${d(budgetCents)} = ${budgetCents}¢.`, {});
  S(4, `There are <b>n = ${n}</b> trading days.`, {});
  S(5, `Start the running <b>best</b> at 0 profit; <b>buyDay</b> / <b>sellDay</b> are unknown (−1) until some pair beats it.`, { changed: ["best", "buyDay", "sellDay"] });
  i = 0;
  S(6, `Outer loop — choose a <b>buy day i</b>. Start at i = 0.`, { focus: "oinit", changed: ["i"] });
  for (;;) {
    const oc = i < n - 1;
    S(6, `Is there a buy day that still has a later day to sell into? <b>i &lt; n−1</b> → ${i} &lt; ${n - 1} → <b>${oc}</b>.`, { focus: "ocond", eval: { expr: `${i} < ${n - 1}`, val: oc } });
    if (!oc) break;
    shares = Math.floor(budgetCents / cents[i]);
    S(7, `Buying on day ${i} at <b>${d(cents[i])}</b>, the budget affords <b>⌊${budgetCents} / ${cents[i]}⌋ = ${shares}</b> whole shares. A cheaper buy price buys <i>more</i> shares — that's the twist.`, { focus: "shares", changed: ["shares"] });
    j = i + 1;
    S(8, `Inner loop — try each later <b>sell day j</b>, starting at j = i+1 = ${j}.`, { focus: "jinit", changed: ["j"] });
    for (;;) {
      const jc = j < n;
      S(8, `Any sell day left? <b>j &lt; n</b> → ${j} &lt; ${n} → <b>${jc}</b>.`, { focus: "jcond", eval: { expr: `${j} < ${n}`, val: jc } });
      if (!jc) break;
      profit = shares * (cents[j] - cents[i]);
      S(9, `Sell on day ${j} at <b>${d(cents[j])}</b>: profit = ${shares} × (${d(cents[j])} − ${d(cents[i])}) = <b>${d(profit)}</b>.`, { focus: "profit", changed: ["profit"] });
      const prevBest = best;
      const better = profit > best;
      if (better) { best = profit; buyDay = i; sellDay = j; }
      S(10, better
        ? `Is this pair better than anything so far? <b>${d(profit)} &gt; ${d(prevBest)}</b> → <b>true</b>. Remember it: buy ${day(i)}, sell ${day(j)}.`
        : `Is this pair better than anything so far? <b>${d(profit)} &gt; ${d(prevBest)}</b> → <b>false</b>. Keep the current best and move on.`,
        { focus: "cmp", eval: { expr: `${d(profit)} > ${d(prevBest)}`, val: better }, changed: better ? ["best", "buyDay", "sellDay"] : [] });
      j++;
      S(8, `Next sell day: <b>j++</b> → j = ${j}. Same buy day, later sell.`, { focus: "jincr", changed: ["j"] });
    }
    i++;
    S(6, `Every sell day for this buy day is scored. Move the buy day forward: <b>i++</b> → i = ${i}.`, { focus: "oincr", changed: ["i"] });
  }
  const res = (best / 100).toFixed(2);
  S(13, buyDay >= 0
    ? `No pair left to try. The best was <b>${d(best)}</b> — buy ${day(buyDay)} at ${d(cents[buyDay])} (${Math.floor(budgetCents / cents[buyDay])} shares), sell ${day(sellDay)} at ${d(cents[sellDay])}. Return it formatted to 2 decimals: <b>"${res}"</b>.`
    : `No pair ever beat 0 — every later price was ≤ the buy price, so buying only loses money. Return <b>"${res}"</b>.`,
    { focus: "ret", done: true, result: `"${res}"` });
  return steps;
}

// ── STEP (opt) — line-by-line debugger of the O(n) suffix-max solution ───────
// Two phases: (1) build suffixMax RIGHT-to-LEFT (each cell = best price from that
// day onward), then (2) a single forward pass scoring each buy day against the
// best reachable FUTURE price. The suffixMax array is shown as a struct panel
// filling in. Same curated CASES / numeric-index input as the brute stepper.
const SRC_OPT = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getMaxProfit</span>(prices, budget) {` },
  { ln: 2,  html: `  <span class="k">const</span> cents = prices.<span class="fn">map</span>(p =&gt; Math.<span class="fn">round</span>(p * 100));` },
  { ln: 3,  html: `  <span class="k">const</span> budgetCents = Math.<span class="fn">round</span>(budget * 100);` },
  { ln: 4,  html: `  <span class="k">const</span> n = cents.length;` },
  { ln: 5,  html: `  <span class="k">const</span> suffixMax = <span class="k">new</span> <span class="fn">Array</span>(n).<span class="fn">fill</span>(0);` },
  { ln: 6,  html: `  <span class="tok" data-t="seed">suffixMax[n - 1] = cents[n - 1]</span>;  <span class="cm">// best price from the last day is itself</span>` },
  { ln: 7,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="finit">i = n - 2</span>; <span class="tok" data-t="fcond">i &gt;= 0</span>; <span class="tok" data-t="fdecr">i--</span>) {  <span class="cm">// fill right→left</span>` },
  { ln: 8,  html: `    <span class="tok" data-t="smax">suffixMax[i] = Math.max(cents[i], suffixMax[i + 1])</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">let</span> best = 0, buyDay = -1;` },
  { ln: 11, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="oinit">i = 0</span>; <span class="tok" data-t="ocond">i &lt; n - 1</span>; <span class="tok" data-t="oincr">i++</span>) {  <span class="cm">// one forward pass</span>` },
  { ln: 12, html: `    <span class="k">const</span> <span class="tok" data-t="shares">shares = Math.floor(budgetCents / cents[i])</span>;` },
  { ln: 13, html: `    <span class="k">const</span> <span class="tok" data-t="profit">profit = shares * (suffixMax[i + 1] - cents[i])</span>;  <span class="cm">// vs best FUTURE price</span>` },
  { ln: 14, html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">profit &gt; best</span>) { best = profit; buyDay = i; }` },
  { ln: 15, html: `  }` },
  { ln: 16, html: `  <span class="k">return</span> <span class="tok" data-t="ret">(best / 100).toFixed(2)</span>;` },
  { ln: 17, html: `}` },
];

// Instrumented run → generic debugger steps. One call frame (no recursion). The
// suffixMax array is a struct panel that fills in as the algorithm computes it;
// a cell reads "—" until its value is known. Scope is expressed by presence:
// `i` lives with whichever loop is active, `shares`/`profit` only inside the pass.
function traceOpt(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { prices, budget } = CASES[idx];
  const steps = [];
  const cents = prices.map((p) => Math.round(p * 100));
  const budgetCents = Math.round(budget * 100);
  const n = cents.length;
  const d = (x) => "$" + (x / 100).toFixed(2);
  const day = (k) => (k < 0 ? "—" : "d" + k);
  const suffixMax = new Array(n).fill(0);
  const suf = new Array(n).fill(null);            // display: null → "—" until computed
  let best = 0, buyDay = -1, i, shares, profit;

  const priceStruct = () => ({ label: `prices($)  d0→d${n - 1}`, items: prices.map((p) => p.toFixed(2)) });
  const sufStruct = (newest) => ({ label: `suffixMax($)  best price from day i on`,
    items: suf.map((v) => (v == null ? "—" : "$" + (v / 100).toFixed(2))), newest: !!newest });

  const S = (line, note, x = {}) => {
    const vars = { n };
    if (x.i != null) vars.i = x.i;
    if (x.shares != null) vars.shares = x.shares;
    if (x.profit != null) vars.profit = x.profit;
    if (line >= 10) { vars.best = d(best); vars.buyDay = day(buyDay); }
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getMaxProfit", vars, changed: x.changed || [],
        structs: [priceStruct(), sufStruct(x.sufNew)] }] });
  };

  const priceList = prices.map((p) => "$" + p.toFixed(2)).join(", ");
  S(1, `<b>Case ${idx + 1} of ${CASES.length}:</b> prices [${priceList}] with a budget of ${d(budgetCents)}. The O(n) trick: precompute the <b>best future price</b> for each day, then score every buy day once — no re-scanning the future.`, {});
  S(2, `Work in whole <b>cents</b> to dodge floating-point money errors — every price ×100, rounded to an integer.`, {});
  S(3, `Convert the budget too: <b>budgetCents</b> = ${d(budgetCents)} = ${budgetCents}¢.`, {});
  S(4, `There are <b>n = ${n}</b> trading days.`, {});
  S(5, `Allocate <b>suffixMax</b> — one slot per day, where <b>suffixMax[i]</b> will hold the highest price on day i <i>or any later day</i>. Empty for now.`, {});
  suffixMax[n - 1] = cents[n - 1]; suf[n - 1] = cents[n - 1];
  S(6, `Seed the last day: from day ${n - 1} the only reachable price is itself, so <b>suffixMax[${n - 1}] = ${d(cents[n - 1])}</b>.`, { focus: "seed", sufNew: true });
  i = n - 2;
  S(7, `Fill the rest <b>right → left</b>. Start at <b>i = n−2 = ${i}</b>.`, { focus: "finit", i });
  for (;;) {
    const fc = i >= 0;
    S(7, `More cells to fill? <b>i &gt;= 0</b> → ${i} &gt;= 0 → <b>${fc}</b>.`, { focus: "fcond", i, eval: { expr: `${i} >= 0`, val: fc } });
    if (!fc) break;
    suffixMax[i] = Math.max(cents[i], suffixMax[i + 1]); suf[i] = suffixMax[i];
    S(8, `Best from day ${i} on = max(today ${d(cents[i])}, best from day ${i + 1} on ${d(suffixMax[i + 1])}) = <b>${d(suffixMax[i])}</b>.`, { focus: "smax", i });
    i--;
    S(7, `Step left: <b>i--</b> → i = ${i}.`, { focus: "fdecr", i });
  }
  S(10, `suffixMax is complete. Start the running <b>best</b> at 0 profit; <b>buyDay</b> is unknown (−1) until some day beats it.`, { changed: ["best", "buyDay"] });
  i = 0;
  S(11, `Forward pass — one look at each <b>buy day i</b>. Start at i = 0.`, { focus: "oinit", i, changed: ["i"] });
  for (;;) {
    const oc = i < n - 1;
    S(11, `A buy day with a later day to sell into? <b>i &lt; n−1</b> → ${i} &lt; ${n - 1} → <b>${oc}</b>.`, { focus: "ocond", i, eval: { expr: `${i} < ${n - 1}`, val: oc } });
    if (!oc) break;
    shares = Math.floor(budgetCents / cents[i]);
    S(12, `Buying on day ${i} at <b>${d(cents[i])}</b>, the budget affords <b>⌊${budgetCents} / ${cents[i]}⌋ = ${shares}</b> whole shares.`, { focus: "shares", i, shares, changed: ["shares"] });
    profit = shares * (suffixMax[i + 1] - cents[i]);
    S(13, `Best reachable sell price is <b>suffixMax[${i + 1}] = ${d(suffixMax[i + 1])}</b> — no scanning needed. Profit = ${shares} × (${d(suffixMax[i + 1])} − ${d(cents[i])}) = <b>${d(profit)}</b>.`, { focus: "profit", i, shares, profit: d(profit), changed: ["profit"] });
    const prevBest = best;
    const better = profit > best;
    if (better) { best = profit; buyDay = i; }
    S(14, better
      ? `Beats the best so far? <b>${d(profit)} &gt; ${d(prevBest)}</b> → <b>true</b>. Remember it: buy ${day(i)}.`
      : `Beats the best so far? <b>${d(profit)} &gt; ${d(prevBest)}</b> → <b>false</b>. Keep the current best and move on.`,
      { focus: "cmp", i, shares, profit: d(profit), eval: { expr: `${d(profit)} > ${d(prevBest)}`, val: better }, changed: better ? ["best", "buyDay"] : [] });
    i++;
    S(11, `Next buy day: <b>i++</b> → i = ${i}.`, { focus: "oincr", i, changed: ["i"] });
  }
  const res = (best / 100).toFixed(2);
  let sellIdx = -1;
  if (buyDay >= 0) for (let k = buyDay + 1; k < n; k++) if (cents[k] === suffixMax[buyDay + 1]) { sellIdx = k; break; }
  S(16, buyDay >= 0
    ? `One pass, done. Best was <b>${d(best)}</b> — buy ${day(buyDay)} at ${d(cents[buyDay])} (${Math.floor(budgetCents / cents[buyDay])} shares), sell into the future high ${day(sellIdx)} at ${d(suffixMax[buyDay + 1])}. Return it formatted: <b>"${res}"</b>.`
    : `No day ever beat 0 — every future max was ≤ the buy price, so buying only loses money. Return <b>"${res}"</b>.`,
    { focus: "ret", done: true, result: `"${res}"` });
  return steps;
}

export default {
  n: 326, id: "profit", title: "Max Profit", dates: ["2026-07-02"],
  statement: `Given daily <code class="inl">prices</code> and a <code class="inl">budget</code>, buy whole shares on one day (<code class="inl">shares = ⌊budget / buyPrice⌋</code>) and sell on a later day. Return the max profit <code class="inl">shares · (sellPrice − buyPrice)</code> as a string with 2 decimals, rounded DOWN. <span class="rule">Example: <code class="inl">getMaxProfit([8,2,5,10], 20)</code> → <b>"80.00"</b> (buy@2 → 10 shares, sell@10 → 10·8 = 80).</span>`,
  variants: [
    {
      name: "Every pair", tone: "brute", cost: "O(n²)",
      approach: `Try every buy day <code class='inl'>i</code> and every later sell day <code class='inl'>j &gt; i</code>. For each, buy as many whole shares as the budget allows and score the profit, keeping the best. Correct, but it re-examines the future for every buy day — <code class='inl'>n(n−1)/2</code> pairs.`,
      code: `function getMaxProfit(prices: number[], budget: number): string {
  const cents = prices.map(p => Math.round(p * 100));
  const budgetCents = Math.round(budget * 100);
  const n = cents.length;
  let best = 0;
  for (let i = 0; i < n - 1; i++) {
    const shares = Math.floor(budgetCents / cents[i]);
    for (let j = i + 1; j < n; j++) {
      const profit = shares * (cents[j] - cents[i]);
      if (profit > best) best = profit;
    }
  }
  return (best / 100).toFixed(2);
}`,
      mount: mountBrute,
    },
    {
      name: "Step: pairs", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute-force solution — run the O(n²) pair search one line at a time. Watch the <b>outer loop pick a buy day</b>, the budget decide <code class='inl'>shares = ⌊budget / buyPrice⌋</code>, the <b>inner loop sweep every later sell day</b>, and each <code class='inl'>profit &gt; best</code> check decide whether to remember a new best pair. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: "1–6: pick an example" } }),
    },
    {
      name: "Suffix-max", tone: "opt", cost: "O(n)",
      approach: `Precompute a <b>suffix-max</b>: the best sell price on or after each day. Then one pass evaluates each buy day exactly once against its best reachable future price. Note the twist — “min price so far” fails because share count depends on the buy price, so we track future <b>maxima</b> instead of past minima.`,
      code: `function getMaxProfit(prices: number[], budget: number): string {
  const cents = prices.map(p => Math.round(p * 100));
  const budgetCents = Math.round(budget * 100);
  const n = cents.length;
  const suffixMax = new Array(n).fill(0);
  suffixMax[n - 1] = cents[n - 1];
  for (let i = n - 2; i >= 0; i--) suffixMax[i] = Math.max(cents[i], suffixMax[i + 1]);
  let best = 0;
  for (let i = 0; i < n - 1; i++) {
    const shares = Math.floor(budgetCents / cents[i]);
    const profit = shares * (suffixMax[i + 1] - cents[i]);
    if (profit > best) best = profit;
  }
  return (best / 100).toFixed(2);
}`,
      mount: mountOpt,
    },
    {
      name: "Step: suffix-max", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the O(n) solution — two phases, one line at a time. First watch <b>suffixMax</b> fill <b>right → left</b> in the struct panel (each cell = the best price from that day onward), then watch the <b>single forward pass</b> score each buy day against its best reachable future price <code class='inl'>suffixMax[i+1]</code> — no re-scanning. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: "1–6: pick an example" } }),
    },
  ],
};
