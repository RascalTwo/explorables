// #334 · Exact Change — count coin-change COMBINATIONS with a bottom-up DP table.
// ways[0]=1, then fold in each coin: for a=coin..amount: ways[a] += ways[a-coin].
import { el, esc, mountDebugger } from "../shared.js";

const COINS = [1, 5, 10, 25];        // pennies, nickels, dimes, quarters
const PRESETS = [3, 9, 17, 39, 61, 99];

// Bottom-up DP, capturing one snapshot row per coin folded in.
function dpRows(amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  const rows = [{ coin: null, cells: ways.slice(), changed: new Set([0]) }];
  for (const coin of COINS) {
    const changed = new Set();
    for (let a = coin; a <= amount; a++) {
      const add = ways[a - coin];
      if (add) { ways[a] += add; changed.add(a); }
    }
    rows.push({ coin, cells: ways.slice(), changed });
  }
  return { rows, count: ways[amount] };
}

// Enumerate canonical combinations (non-increasing coin sizes) for the examples.
function combosOf(amount, cap) {
  const desc = [25, 10, 5, 1], res = [];
  (function rec(i, rem, acc) {
    if (res.length >= cap) return;
    if (i === desc.length) { if (rem === 0) res.push(acc.slice()); return; }
    const c = desc[i];
    for (let k = Math.floor(rem / c); k >= 0 && res.length < cap; k--) {
      acc.push(k); rec(i + 1, rem - k * c, acc); acc.pop();
    }
  })(0, amount, []);
  return res;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ec-result { font:600 14px var(--sans); color:var(--muted); margin:2px 0 14px; }
    .ec-result b { color:var(--text); font:800 20px var(--mono); }
    .ec-result b.ec-count { color:var(--accent); font-size:26px; }
    .ec-tablewrap { overflow-x:auto; border:1px solid var(--border); border-radius:10px; background:var(--panel); padding:8px; }
    .ec-table { display:inline-flex; flex-direction:column; gap:4px; min-width:100%; }
    .ec-row { display:flex; align-items:center; gap:8px; }
    .ec-rlbl { flex:0 0 auto; width:62px; text-align:right; font:700 11px var(--mono); color:var(--muted); }
    .ec-row.head .ec-rlbl { color:transparent; }
    .ec-cells { display:flex; gap:3px; }
    .ec-cell { flex:0 0 auto; min-width:24px; height:26px; padding:0 3px; display:flex; align-items:center;
               justify-content:center; font:700 12px var(--mono); border-radius:5px; border:1px solid var(--border);
               background:var(--panel-2); color:var(--muted); font-variant-numeric:tabular-nums; }
    .ec-cell.ec-hd { border:0; background:none; color:var(--muted); opacity:.55; font-size:10.5px; height:16px; }
    .ec-cell.ec-dim { opacity:.28; }
    .ec-cell.ec-live { color:var(--text); }
    .ec-cell.ec-up { border-color:var(--accent); color:var(--accent);
                     background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .ec-cell.ec-final { border-color:var(--good); color:var(--good); font-weight:800;
                        background:color-mix(in srgb,var(--good) 16%,transparent); }
    .ec-coin { flex:0 0 auto; width:16px; height:16px; border-radius:50%; display:inline-flex; align-items:center;
               justify-content:center; font:800 8.5px var(--sans); color:var(--bg); background:var(--accent); }
    .ec-legend { display:flex; flex-wrap:wrap; gap:14px; margin:12px 0 2px; font:600 11.5px var(--sans); color:var(--muted); }
    .ec-legend span { display:inline-flex; align-items:center; gap:5px; }
    .ec-sw { width:13px; height:13px; border-radius:4px; border:1px solid var(--border); }
    .ec-sw.up { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .ec-sw.final { border-color:var(--good); background:color-mix(in srgb,var(--good) 16%,transparent); }
    .ec-ex { margin-top:16px; }
    .ec-ex h4 { margin:0 0 8px; font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .ec-combos { display:flex; flex-direction:column; gap:6px; }
    .ec-combo { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .ec-tag { font:700 12px var(--mono); padding:3px 8px; border-radius:6px; border:1px solid var(--border);
              background:var(--panel-2); color:var(--text); }
    .ec-more { font:600 12px var(--sans); color:var(--muted); }
  `));
}

const COIN_LBL = { 1: "1¢", 5: "5¢", 10: "10¢", 25: "25¢" };

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const num = el("input"); num.type = "number"; num.min = 1; num.max = 99; num.value = 17; num.style.width = "70px";
  const range = el("input"); range.type = "range"; range.min = 1; range.max = 99; range.value = 17;
  range.style.flex = "1"; range.style.minWidth = "150px"; range.style.accentColor = "var(--accent)";
  ctl.append(el("span", "ctl-label", "amount ¢"), num, range);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", v + "¢"); c.onclick = () => setVal(v); pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);

  function setVal(v) {
    v = Math.max(1, Math.min(99, Math.floor(+v) || 1));
    num.value = v; range.value = v; render(v);
  }
  num.oninput = () => setVal(num.value);
  range.oninput = () => setVal(range.value);
  render(17);

  function render(amount) {
    const { rows, count } = dpRows(amount);
    const idx = Array.from({ length: amount + 1 }, (_, i) => i);

    const head = `<div class="ec-row head"><div class="ec-rlbl"></div><div class="ec-cells">` +
      idx.map((i) => `<div class="ec-cell ec-hd">${i}</div>`).join("") + `</div></div>`;

    const body = rows.map((r, ri) => {
      const isLast = ri === rows.length - 1;
      const cells = idx.map((i) => {
        let cls = "ec-cell";
        if (r.changed.has(i)) cls += " ec-up";
        else if (r.coin != null && i >= r.coin) cls += " ec-live";
        else if (r.coin != null && i < r.coin) cls += " ec-dim";
        else if (r.coin == null && i !== 0) cls += " ec-dim";
        if (isLast && i === amount) cls += " ec-final";
        return `<div class="${cls}">${r.cells[i]}</div>`;
      }).join("");
      const lbl = r.coin == null
        ? `<span class="ec-rlbl">ways[0]=1</span>`
        : `<span class="ec-rlbl"><span class="ec-coin">${r.coin}</span> +${COIN_LBL[r.coin]}</span>`;
      return `<div class="ec-row">${lbl}<div class="ec-cells">${cells}</div></div>`;
    }).join("");

    // A few worked combinations (largest coins first, skipping zero counts).
    const combos = combosOf(amount, 7);
    const shown = combos.slice(0, 6).map((cnt) => {
      const desc = [25, 10, 5, 1];
      const parts = cnt.map((k, j) => (k ? `<span class="ec-tag">${k}×${COIN_LBL[desc[j]]}</span>` : "")).filter(Boolean);
      return `<div class="ec-combo">${parts.join("") || `<span class="ec-tag">0</span>`}</div>`;
    }).join("");
    const more = count > 6 ? `<div class="ec-more">…and ${count - 6} more combination${count - 6 === 1 ? "" : "s"}.</div>` : "";

    out.innerHTML =
      `<div class="ec-result">exactChange(<b>${amount}</b>) = <b class="ec-count">${count}</b> way${count === 1 ? "" : "s"}</div>` +
      `<div class="ec-tablewrap"><div class="ec-table">${head}${body}</div></div>` +
      `<div class="ec-legend">` +
        `<span><i class="ec-sw up"></i>updated this pass — <code class="inl">ways[a] += ways[a−coin]</code></span>` +
        `<span><i class="ec-sw final"></i>the answer, <code class="inl">ways[${amount}]</code></span>` +
      `</div>` +
      `<div class="ec-ex"><h4>Example combinations</h4><div class="ec-combos">${shown}${more}</div></div>` +
      `<div class="note">Each row folds in one more coin denomination. Sweeping <code class="inl">a</code> from <code class="inl">coin</code> upward and adding <code class="inl">ways[a−coin]</code> lets a coin be reused any number of times, while adding one denomination per row means order never matters — so we count <b>combinations</b>, not sequences.</div>`;
  }
}

// ── Brute: enumerate every combination by recursion (no DP table) ───────────
// The obvious way you'd count by hand: for each coin, try using 0, 1, 2, … of it
// and recurse on what's left. Correct, but it LISTS every combination — the DP
// tab counts the same thing without ever enumerating one.
function mountBrute(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const num = el("input"); num.type = "number"; num.min = 1; num.max = 99; num.value = 17; num.style.width = "70px";
  const range = el("input"); range.type = "range"; range.min = 1; range.max = 99; range.value = 17;
  range.style.flex = "1"; range.style.minWidth = "150px"; range.style.accentColor = "var(--accent)";
  ctl.append(el("span", "ctl-label", "amount ¢"), num, range);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", v + "¢"); c.onclick = () => setVal(v); pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);

  function setVal(v) { v = Math.max(1, Math.min(99, Math.floor(+v) || 1)); num.value = v; range.value = v; render(v); }
  num.oninput = () => setVal(num.value);
  range.oninput = () => setVal(range.value);
  render(17);

  function render(amount) {
    const desc = [25, 10, 5, 1];
    let count = 0, calls = 0;
    (function rec(i, rem) {
      calls++;
      if (rem === 0) { count++; return; }
      if (i === desc.length) return;
      for (let k = 0; k * desc[i] <= rem; k++) rec(i + 1, rem - k * desc[i]);
    })(0, amount);
    const cells = (amount + 1) * desc.length;   // the table the DP tab fills instead

    const combos = combosOf(amount, 7);
    const shown = combos.slice(0, 6).map((cnt) => {
      const parts = cnt.map((k, j) => (k ? `<span class="ec-tag">${k}×${COIN_LBL[desc[j]]}</span>` : "")).filter(Boolean);
      return `<div class="ec-combo">${parts.join("") || `<span class="ec-tag">0</span>`}</div>`;
    }).join("");
    const more = count > 6 ? `<div class="ec-more">…and ${count - 6} more.</div>` : "";

    // proportional bars: recursive calls (brute work) vs table cells (DP work)
    const max = Math.max(calls, cells, 1);
    const bar = (val, col, lbl) => `<div style="display:flex;align-items:center;gap:8px;margin:5px 0">` +
      `<span style="flex:0 0 148px;font:600 12px var(--sans);color:var(--muted)">${lbl}</span>` +
      `<span style="flex:1;height:16px;border-radius:5px;background:var(--panel-2);overflow:hidden">` +
      `<span style="display:block;height:100%;width:${(val / max * 100).toFixed(1)}%;background:${col}"></span></span>` +
      `<b style="flex:0 0 auto;font:800 13px var(--mono);color:${col}">${val}</b></div>`;

    out.innerHTML =
      `<div class="ec-result">exactChange(<b>${amount}</b>) = <b class="ec-count">${count}</b> way${count === 1 ? "" : "s"}</div>` +
      `<div class="ec-ex"><h4>Every combination, enumerated</h4><div class="ec-combos">${shown}${more}</div></div>` +
      `<div class="ec-ex"><h4>Work to reach that count</h4>` +
        bar(calls, "var(--danger)", "brute · recursive calls") +
        bar(cells, "var(--good)", "DP · table cells") +
      `</div>` +
      `<div class="note">The obvious approach mirrors counting by hand: for each coin try using <b>0, 1, 2, …</b> of it, recurse on what's left, and tally the branches that land on exactly 0. It works — but it <b>walks every combination</b>. The DP tab never lists one; it fills a small table and reads the answer off the end. The gap between the bars is the work the table saves, and it widens fast as the amount grows.</div>`;
  }
}

// ── STEP — the nested DP loop as a line-by-line debugger ─────────────────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">exactChange</span>(<span class="tok" data-t="amount">amount</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> ways = <span class="k">new</span> <span class="fn">Array</span>(amount + 1).<span class="fn">fill</span>(0);` },
  { ln: 3,  html: `  ways[0] = 1;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="coin">coin</span> <span class="k">of</span> [1, 5, 10, 25]) {` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">let</span> a = coin; <span class="tok" data-t="cond">a &lt;= amount</span>; a++) {` },
  { ln: 6,  html: `      <span class="tok" data-t="upd">ways[a] += ways[a - coin]</span>;` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> ways[amount];` },
  { ln: 10, html: `}` },
];

function trace(amount) {
  const steps = [];
  const ways = new Array(amount + 1).fill(0);
  let coin, a;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (x.showCoin) vars.coin = coin + "¢";
    if (x.showA) vars.a = a;
    if (x.showCell) { vars["ways[a−coin]"] = ways[a - coin]; vars["ways[a]"] = ways[a]; }
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "exactChange", vars, changed: x.changed || [], structs: [{ label: "ways", items: ways.slice() }] }],
    });
  };

  S(1, `Call <b>exactChange(${amount})</b> — count the combinations of 1¢/5¢/10¢/25¢ that total ${amount}¢.`, { focus: "amount" });
  S(2, `Allocate <b>ways[0…${amount}]</b>, all zero. <code class='inl'>ways[a]</code> will hold the number of ways to make <b>a</b> cents.`);
  ways[0] = 1;
  S(3, `Base case: <b>ways[0] = 1</b> — there is exactly one way to make 0¢: use no coins.`);

  for (const c of COINS) {
    coin = c;
    S(4, `Fold in the <b>${coin}¢</b> coin. For every amount from ${coin} up, add the ways that use at least one ${coin}¢.`, { focus: "coin", showCoin: true });
    for (a = coin; ; a++) {
      const cond = a <= amount;
      S(5, `Inner loop: is <b>a = ${a} ≤ ${amount}</b>? → <b>${cond}</b>.`, {
        focus: "cond", showCoin: true, showA: cond, eval: { expr: `${a} ≤ ${amount}`, val: cond },
      });
      if (!cond) break;
      const before = ways[a], add = ways[a - coin];
      ways[a] = before + add;
      S(6, `<b>ways[${a}] += ways[${a - coin}]</b> → ${before} + ${add} = <b>${ways[a]}</b>. ${add === 0 ? "(no new ways here yet)" : `${add} more way${add === 1 ? "" : "s"}.`}`, {
        focus: "upd", showCoin: true, showA: true, showCell: true, changed: ["ways[a]"],
      });
    }
  }
  S(9, `Every coin folded in. <b>Return ways[${amount}] = ${ways[amount]}</b>.`, { done: true, result: ways[amount] });
  return steps;
}

// ── STEP (brute) — the enumerate-combos recursion as a growing call stack ─────
// Paired with the "Enumerate combos" tab: watch recurse() push a frame per coin
// index, fan out over how many of each coin to use, and pop as each branch dies
// or lands on remaining === 0 (a real combination, count++). Small amount keeps
// the tree readable; count is the same number the DP tab reads off its table.
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">exactChange</span>(amount) {` },
  { ln: 2,  html: `  <span class="k">const</span> coins = [25, 10, 5, 1];` },
  { ln: 3,  html: `  <span class="k">let</span> count = 0;` },
  { ln: 4,  html: `  <span class="k">function</span> <span class="fn">recurse</span>(i, remaining) {` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">remaining === 0</span>) { count++; <span class="k">return</span>; }` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="exhausted">i === coins.length</span>) <span class="k">return</span>;` },
  { ln: 7,  html: `    <span class="k">for</span> (<span class="k">let</span> k = 0; k * coins[i] &lt;= remaining; k++)` },
  { ln: 8,  html: `      <span class="tok" data-t="call"><span class="fn">recurse</span>(i + 1, remaining - k * coins[i])</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="fn">recurse</span>(0, amount);` },
  { ln: 11, html: `  <span class="k">return</span> count;` },
  { ln: 12, html: `}` },
];

function traceBrute(amount) {
  const coins = [25, 10, 5, 1];       // largest first, matching the brute tab
  const lbl = (c) => c + "¢";
  const steps = [];
  const stack = [];                    // active recurse frames: {i, rem, k}
  let count = 0;

  const framesNow = (opt = {}) => {
    const arr = [{ title: `exactChange(${amount})`, vars: { amount, count }, changed: opt.baseChanged || [] }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      const vars = { i: fr.i, coin: fr.i < coins.length ? lbl(coins[fr.i]) : "—", remaining: fr.rem };
      if (fr.k != null) vars.k = fr.k;
      arr.push({ title: `recurse(${fr.i}, ${fr.rem})`, vars,
        changed: top ? (opt.topChanged || []) : [], ret: top ? opt.ret : undefined });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>exactChange(${amount})</b> — count coin combinations the brute way: for each coin denomination, try using 0, 1, 2, … of it and recurse on the rest.`);
  S(2, `The coin denominations, largest first: <b>[25, 10, 5, 1]</b>.`);
  S(3, `Start the tally at <b>count = 0</b>.`, { baseChanged: ["count"] });
  S(10, `Kick off the recursion with <b>recurse(0, ${amount})</b> — coin index 0, full amount still to make.`);

  (function recurse(i, rem) {
    stack.push({ i, rem, k: null });
    S(4, `Enter <b>recurse(${i}, ${rem})</b> — a new frame is <b>pushed</b> onto the call stack.`, { topChanged: ["i", "remaining"] });

    if (rem === 0) {
      count++;
      S(5, `<b>remaining === 0</b> → <b>true</b>. Exact change made — that's one combination! <b>count → ${count}</b>, then <b>return</b> (this frame pops).`,
        { focus: "base", eval: { expr: `${rem} === 0`, val: true }, baseChanged: ["count"], ret: { value: `✓ count=${count}` } });
      stack.pop();
      return;
    }

    if (i === coins.length) {
      S(6, `<b>remaining = ${rem} ≠ 0</b> but <b>i === coins.length</b> (${i}) — no coin types left. Dead end, <b>return</b> (this frame pops).`,
        { focus: "exhausted", eval: { expr: `${i} === ${coins.length}`, val: true }, ret: { value: "✗ dead end" } });
      stack.pop();
      return;
    }

    const c = coins[i];
    S(6, `<b>remaining = ${rem} ≠ 0</b> and coins remain (i = ${i} &lt; ${coins.length}) — try using 0, 1, 2, … of the <b>${lbl(c)}</b> coin.`,
      { focus: "exhausted", eval: { expr: `${i} === ${coins.length}`, val: false } });

    for (let k = 0; k * c <= rem; k++) {
      stack[stack.length - 1].k = k;
      const nextRem = rem - k * c;
      S(8, `<b>k = ${k}</b>: use ${k}×${lbl(c)} = ${k * c}¢, leaving <b>${nextRem}¢</b>. Recurse into <b>recurse(${i + 1}, ${nextRem})</b>.`,
        { focus: "call", topChanged: ["k"] });
      recurse(i + 1, nextRem);
    }
    stack[stack.length - 1].k = null;
    S(9, `Every choice for the <b>${lbl(c)}</b> coin explored from <b>recurse(${i}, ${rem})</b> — <b>return</b> (this frame pops).`, { ret: { value: "⏎" } });
    stack.pop();
  })(0, amount);

  S(11, `Recursion done — the stack is empty again. <b>Return count = ${count}</b>.`, { done: true, result: count });
  return steps;
}

export default {
  n: 334, id: "exactchange", title: "Exact Change", dates: ["2026-07-10"],
  statement: `Given an amount in cents, count the <b>distinct</b> ways to make exact change using pennies (1¢), nickels (5¢), dimes (10¢) and quarters (25¢). Order doesn't matter — count <em>combinations</em>, not sequences. <span class="rule">Example: <code class="inl">exactChange(9)</code> → <b>2</b> (nine pennies, or a nickel + four pennies).</span>`,
  variants: [
    {
      name: "Enumerate combos", tone: "brute", cost: "lists every combo",
      approach: `The way you'd count by hand: for each coin denomination, try using <b>0, 1, 2, …</b> of it, recurse on the remaining amount, and count the branches that reach exactly 0. It's the natural, obvious method — and it <b>enumerates every combination</b>. That's fine for four coin types, but the number of combinations (and the recursive work) climbs fast, which is exactly what the DP table sidesteps.`,
      code: `function exactChange(amount: number): number {
  const coins = [25, 10, 5, 1];
  let count = 0;
  const recurse = (i: number, remaining: number): void => {
    if (remaining === 0) { count++; return; }   // exact change made
    if (i === coins.length) return;             // ran out of coin types
    for (let k = 0; k * coins[i] <= remaining; k++) {
      recurse(i + 1, remaining - k * coins[i]); // use k of this coin, move on
    }
  };
  recurse(0, amount);
  return count;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: recurse", tone: "brute", cost: "call stack",
      approach: `A debugger for the brute recursion — watch the <b>call stack</b> grow as <code class='inl'>recurse</code> calls itself and shrink as each frame <b>returns</b> (backtracking). Each frame carries its coin index <code class='inl'>i</code>, the <code class='inl'>remaining</code> amount, and which count <code class='inl'>k</code> of the current coin it's trying; every branch that reaches <code class='inl'>remaining === 0</code> bumps <code class='inl'>count</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Small amount so the tree stays readable.)`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "amount =", value: 9, min: 1, max: 12, presets: [4, 6, 9, 12], hint: "cents — small tree" } }),
    },
    {
      name: "DP table", tone: "opt", cost: "O(amount × 4)",
      approach: `Build a <code class='inl'>ways[]</code> table where <code class='inl'>ways[a]</code> is the number of ways to make <b>a</b> cents. Seed <code class='inl'>ways[0] = 1</code> (one way to make nothing), then fold in one denomination at a time: for each <code class='inl'>coin</code>, sweep <code class='inl'>a</code> from <code class='inl'>coin</code> up to the amount and add <code class='inl'>ways[a − coin]</code> into <code class='inl'>ways[a]</code>. Considering each coin type once — the outer loop — is exactly what makes this count combinations rather than permutations.`,
      code: `function exactChange(amount: number): number {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1; // one way to make 0¢: no coins
  for (const coin of [1, 5, 10, 25]) {
    for (let a = coin; a <= amount; a++) {
      ways[a] += ways[a - coin];
    }
  }
  return ways[amount];
}`,
      mount,
    },
    {
      name: "Step: dp", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the nested DP loop. The <b>outer</b> loop walks the coins <code class='inl'>[1, 5, 10, 25]</code>; the <b>inner</b> loop sweeps <code class='inl'>a</code> from <code class='inl'>coin</code> to <code class='inl'>amount</code>, each pass doing <code class='inl'>ways[a] += ways[a − coin]</code>. Watch the <code class='inl'>ways</code> array fill in. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "amount =", value: 9, min: 1, max: 30, presets: [3, 9, 17, 25], hint: "cents" } }),
    },
  ],
};
