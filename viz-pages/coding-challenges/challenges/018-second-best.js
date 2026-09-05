// #18 · Second Best — a three-rung ladder over the DISTINCT prices, dearest first.
// The counter-intuitive part is rung 1: the second most expensive wins even when the
// most expensive is comfortably affordable, so "within your budget" is a test on one
// specific laptop and not an invitation to spend the most you can. Read the three
// numbered clauses in the order they are written and the code is that order.
// "Duplicate prices should be ignored" is the clause the grader never checks — see
// the [2000, 2000, 1500] preset, which is ours and not freeCodeCamp's.
import { el, mountDebugger } from "../shared.js";

// The five official freeCodeCamp cases, then three of ours.
//   [2000,2000,1500] / 2000 — the ONLY input here where the dedupe changes the
//     answer. The official set includes a duplicate case, but on it the two readings
//     coincide: without dedupe the second entry is 2000, which is over budget, so it
//     falls through to rung 2 and lands on the same 1800 anyway.
//   [100,5] / 1000 — everything is affordable and the rule still hands back the
//     cheaper one. The starkest form of "second best is not best affordable".
//   [2000] / 2000 — one distinct price, so there is no second and rung 1 is skipped.
const OFFICIAL = [
  { laptops: [1500, 2000, 1800, 1400], budget: 1900 },
  { laptops: [1500, 2000, 2000, 1800, 1400], budget: 1900 },
  { laptops: [2099, 1599, 1899, 1499], budget: 2200 },
  { laptops: [2099, 1599, 1899, 1499], budget: 1000 },
  { laptops: [1200, 1500, 1600, 1800, 1400, 2000], budget: 1450 },
];
const PRESETS = [
  ...OFFICIAL,
  { laptops: [2000, 2000, 1500], budget: 2000 },
  { laptops: [100, 5], budget: 1000 },
  { laptops: [2000], budget: 2000 },
];

const RUNGS = ["the second most expensive", "the most expensive within budget", "0"];
const WHY = ["if it is within budget", "if the second is not", "nothing is affordable"];

function solve(laptops, budget) {
  const prices = [...new Set(laptops)].sort((a, b) => b - a);
  if (prices.length > 1 && prices[1] <= budget) return { prices, rung: 0, out: prices[1] };
  const affordable = prices.find((p) => p <= budget);
  return affordable === undefined
    ? { prices, rung: 2, out: 0 }
    : { prices, rung: 1, out: affordable };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sb-wrap { display:flex; flex-direction:column; gap:13px; }
    .sb-list { display:flex; flex-direction:column; gap:4px; }
    .sb-row { display:grid; grid-template-columns:34px 1fr auto; align-items:center; gap:10px; font:13px var(--mono); border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:5px 10px; }
    .sb-row .rk { color:var(--muted); font-size:11px; }
    .sb-row .bar { height:9px; border-radius:5px; background:color-mix(in srgb, var(--accent) 40%, transparent); }
    .sb-row.over .bar { background:color-mix(in srgb, var(--danger) 34%, transparent); }
    .sb-row.pick { border-color:var(--good); background:color-mix(in srgb, var(--good) 12%, transparent); }
    .sb-row.second { border-color:var(--accent); }
    .sb-row .p { font-weight:800; }
    .sb-row.over .p { color:var(--danger); }
    .sb-budget { display:flex; align-items:baseline; gap:8px; font:12.5px var(--mono); color:var(--muted); }
    .sb-budget b { color:var(--text); font-size:15px; }
    .sb-dupe { font:12.5px var(--mono); color:var(--warn); }
    .sb-dupe s { opacity:.7; }
  `));
}

const parseNums = (s) => s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
const money = (n) => "$" + n.toLocaleString("en-US");

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inL = el("input"); inL.type = "text"; inL.value = "2099, 1599, 1899, 1499"; inL.style.width = "250px";
  const inB = el("input"); inB.type = "number"; inB.value = "2200"; inB.style.width = "100px";
  ctl.append(el("span", "ctl-label", "prices"), inL, el("span", "ctl-label", "budget"), inB);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `[${p.laptops.join(",")}] ≤ ${p.budget}`);
    c.onclick = () => { inL.value = p.laptops.join(", "); inB.value = String(p.budget); render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inL.oninput = inB.oninput = render;
  render();

  function render() {
    const laptops = parseNums(inL.value), budget = +inB.value;
    out.innerHTML = "";
    if (!laptops.length || !Number.isFinite(budget)) {
      out.append(el("div", "note", "Give at least one price and a budget."));
      return;
    }
    const r = solve(laptops, budget);
    const max = Math.max(...r.prices, budget, 1);
    const wrap = el("div", "sb-wrap");

    const dropped = laptops.length - r.prices.length;
    if (dropped) wrap.append(el("div", "sb-dupe", `<b>${dropped}</b> duplicate price${dropped === 1 ? "" : "s"} dropped before ranking — "the second most expensive" means the second distinct <s>${laptops.length}</s> <b>${r.prices.length}</b> price, not the second entry in the list.`));

    wrap.append(el("div", "sb-budget", `budget <b>${money(budget)}</b> — the dashed prices are over it`));

    const list = el("div", "sb-list");
    r.prices.forEach((p, i) => {
      const over = p > budget;
      const cls = "sb-row" + (over ? " over" : "") + (p === r.out && r.out !== 0 ? " pick" : "") + (i === 1 ? " second" : "");
      const bar = `<div class="bar" style="width:${Math.max(3, (p / max) * 100).toFixed(1)}%"></div>`;
      list.append(el("div", cls, `<span class="rk">#${i + 1}</span>${bar}<span class="p">${money(p)}${i === 1 ? " ← second" : ""}${over ? " ✗" : ""}</span>`));
    });
    wrap.append(list);

    const ladder = el("div", "ladder");
    RUNGS.forEach((name, i) => ladder.append(el("div", "rung" + (i === r.rung ? " on" : ""), `<span>${i + 1}. return ${name}</span><span class="v">${WHY[i]}</span>`)));
    wrap.append(ladder);

    wrap.append(el("div", "result-line", `<span class="badge ${r.out ? "ok" : "no"}">getLaptopCost([${laptops.join(", ")}], ${budget}) → ${r.out}</span>`));
    wrap.append(el("div", "note", noteFor(r, budget, dropped)));
    out.append(wrap);
  }
}

function noteFor(r, budget, dropped) {
  if (r.rung === 0 && r.prices[0] <= budget)
    return `Both the top two are inside the budget, and the rule still returns the <b>second</b> — ${money(r.prices[1])} rather than ${money(r.prices[0])}. Rung 1 is a test on one specific laptop, not a hunt for the most you can spend; read it as "best affordable" and this case breaks while the others still pass.`;
  if (r.rung === 0 && dropped)
    return `Dedupe first, and the second distinct price is ${money(r.prices[1])}. Skip the dedupe and the second <i>entry</i> is ${money(r.prices[0])} — over budget, so it falls to rung 2, which here happens to land on the same number. That coincidence is why the official set cannot catch a missing dedupe.`;
  if (r.rung === 0)
    return `The second most expensive is ${money(r.prices[1])}, inside the budget, so rung 1 answers it and the other ${r.prices.length - 2} price${r.prices.length - 2 === 1 ? "" : "s"} are never consulted. The most expensive, ${money(r.prices[0])}, is out of reach — which is the ordinary case and the one that makes rung 1 look like "best affordable".`;
  if (r.rung === 1)
    return `${r.prices.length > 1 ? `The second most expensive, ${money(r.prices[1])}, is over the ${money(budget)} budget` : `There is only one distinct price, so there is no second at all`}, so rung 2 takes over: walk down the sorted list and take the first thing that fits — ${money(r.out)}. Sorted dearest-first, "the first affordable" and "the most expensive affordable" are the same scan.`;
  return `Every distinct price is above ${money(budget)}, so both rungs miss and the answer is the literal <b>0</b> — a number, not an empty array and not <code class='inl'>undefined</code>. <code class='inl'>find</code> returning <code class='inl'>undefined</code> is exactly the case the <code class='inl'>?? 0</code> exists for.`;
}

// ── STEP — the ladder, one rung at a time ───────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getLaptopCost</span>(<span class="tok" data-t="param">laptops</span>, <span class="tok" data-t="param">budget</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> prices = <span class="tok" data-t="dedupe">[...<span class="k">new</span> <span class="fn">Set</span>(laptops)]</span>.<span class="tok" data-t="sort"><span class="fn">sort</span>((a, b) =&gt; b - a)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="rung1">prices.length &gt; <span class="nu">1</span> &amp;&amp; prices[<span class="nu">1</span>] &lt;= budget</span>) <span class="k">return</span> prices[<span class="nu">1</span>];` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="scan">p</span> <span class="k">of</span> prices) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="fits">p &lt;= budget</span>) <span class="k">return</span> p;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="zero">0</span>;` },
  { ln: 8, html: `}` },
];

const STEP_PRESETS = PRESETS.map((p) => `${p.laptops.join(",")} | ${p.budget}`);
const splitCase = (raw) => {
  const [a = "", b = ""] = String(raw).split("|");
  const laptops = parseNums(a);
  return { laptops: laptops.length ? laptops : [0], budget: Number(b.trim()) || 0 };
};

function trace(raw) {
  const { laptops, budget } = splitCase(raw);
  const steps = [];
  let prices, p;
  const S = (line, note, x = {}) => {
    const vars = { laptops: `[${laptops.join(",")}]`, budget };
    if (line >= 3 && prices) vars.prices = `[${prices.join(",")}]`;
    if (line >= 4 && line <= 6 && p !== undefined) vars.p = p;
    const structs = prices && line >= 3 ? [{ label: "distinct, dearest first", items: prices.map(String), newest: false }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getLaptopCost([${laptops.join(",")}], ${budget})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `<b>${laptops.length}</b> laptop${laptops.length === 1 ? "" : "s"}, budget <b>${money(budget)}</b>. Three numbered rules, checked <b>in order</b> — the whole problem is that the first of them is not "the best one you can afford".`, { focus: "param" });

  const unique = [...new Set(laptops)];
  S(2, unique.length === laptops.length
    ? `<code class='inl'>new Set</code> finds no duplicates here, so all ${laptops.length} prices survive.`
    : `<code class='inl'>new Set</code> drops <b>${laptops.length - unique.length}</b> duplicate${laptops.length - unique.length === 1 ? "" : "s"}. "Ignore duplicate prices" is about <b>ranking</b>: two identical laptops are one position, not two, so without this the "second most expensive" can be the same number as the first.`,
    { focus: "dedupe" });
  prices = unique.slice().sort((a, b) => b - a);
  S(2, `Sort <b>descending</b>: <b>[${prices.join(", ")}]</b>. Dearest first is what makes both remaining rules cheap — rank 2 is just index 1, and "the most expensive within budget" becomes "the first one that fits".`, { focus: "sort", changed: ["prices"] });

  const hasSecond = prices.length > 1;
  const rung1 = hasSecond && prices[1] <= budget;
  S(3, !hasSecond
    ? `There is only one distinct price, so there is no second most expensive and rung 1 cannot apply. The <code class='inl'>length &gt; 1</code> guard is what stops <code class='inl'>prices[1]</code> being <code class='inl'>undefined</code> here.`
    : rung1
      ? `<b>${money(prices[1])} ≤ ${money(budget)}</b> — the second most expensive fits, so it is the answer${prices[0] <= budget ? `, even though the most expensive (${money(prices[0])}) is also affordable. That is the rule as written, and it is the part everyone rewrites into "best affordable" by accident.` : "."}`
      : `<b>${money(prices[1])} ≤ ${money(budget)}</b> is false — the second most expensive is out of reach, so rung 1 passes and rung 2 takes over.`,
    { focus: "rung1", eval: { expr: hasSecond ? `${prices[1]} <= ${budget}` : `prices.length > 1`, val: rung1 } });
  if (rung1) {
    S(3, `<b>Return ${prices[1]}.</b> Nothing below index 1 was ever looked at.`, { focus: "rung1", done: true, result: String(prices[1]), ret: { value: prices[1] } });
    return steps;
  }

  for (const q of prices) {
    p = q;
    S(4, `Walk down the sorted list: <b>${money(p)}</b>.`, { focus: "scan", changed: ["p"] });
    const fits = p <= budget;
    S(5, fits
      ? `<b>${money(p)} ≤ ${money(budget)}</b> — it fits. Because the list is sorted dearest-first, the <i>first</i> price that fits is also the <b>most expensive</b> one that fits, so there is nothing left to compare.`
      : `<b>${money(p)} ≤ ${money(budget)}</b> is false — over budget, keep walking.`,
      { focus: "fits", eval: { expr: `${p} <= ${budget}`, val: fits } });
    if (fits) {
      S(5, `<b>Return ${p}.</b>`, { focus: "fits", done: true, result: String(p), ret: { value: p } });
      return steps;
    }
  }
  S(7, `The loop ran out of prices — every one of them is above ${money(budget)}. <b>Return 0</b>, the literal number the third rule names.`,
    { focus: "zero", done: true, result: "0", ret: { value: 0 } });
  return steps;
}

export default {
  n: 18, id: "secondbest", title: "Second Best", dates: ["2025-08-28"],
  statement: `Given laptop prices and a budget, return <b>(1)</b> the second most expensive laptop if it is within budget, otherwise <b>(2)</b> the most expensive laptop that is within budget, otherwise <b>(3)</b> <code class="inl">0</code>. Duplicate prices are ignored when ranking. <span class="rule">Example: <code class="inl">getLaptopCost([2099, 1599, 1899, 1499], 2200)</code> → <code class="inl">1899</code> — even though 2099 is affordable.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n log n) — one sort",
      approach: `The three numbered clauses <i>are</i> the control flow, and the order matters more than any of them individually: rung 1 fires even when the most expensive laptop is comfortably affordable, so <code class='inl'>[2099, 1599, 1899, 1499]</code> under a 2200 budget answers <b>1899</b>, not 2099. Rewrite it as "the best one you can afford" and that single case breaks while the rest keep passing. Two preparations make the rungs one-liners. <b>Dedupe first</b> — "second most expensive" is about distinct <i>positions</i>, so two identical laptops occupy one — and <b>sort descending</b>, after which rank 2 is index 1 and "the most expensive within budget" is just the first entry that fits. Then read rung 3 literally: the answer is the number <code class='inl'>0</code>, which is what the <code class='inl'>?? 0</code> on a <code class='inl'>find</code> that returned <code class='inl'>undefined</code> is for.`,
      code: `function getLaptopCost(laptops: number[], budget: number): number {
  // Distinct prices, dearest first: rank 2 becomes index 1.
  const prices = [...new Set(laptops)].sort((a, b) => b - a);

  // 1. the second most expensive, if it fits — even when the first also fits
  if (prices.length > 1 && prices[1] <= budget) return prices[1];

  // 2. sorted descending, the first affordable IS the most expensive affordable
  // 3. ...and if there isn't one, the literal 0
  return prices.find((p) => p <= budget) ?? 0;
}`,
      mount,
    },
    {
      name: "Step through", cost: "one rung at a time",
      approach: `The <code class='inl'>find</code> unrolled into a loop so the walk down the price list is visible. Run <b>[2099,1599,1899,1499] ≤ 2200</b> to watch rung 1 skip an affordable laptop, the same list at <b>≤ 1000</b> to fall all the way to 0, and <b>[2000,2000,1500] ≤ 2000</b> — ours, not freeCodeCamp's — where the dedupe is the only thing standing between 1500 and 2000. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "case =", value: "2099,1599,1899,1499 | 2200", presets: STEP_PRESETS, hint: "prices | budget" } }),
    },
  ],
};
