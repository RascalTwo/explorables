// #10 · 3 Strikes — "contains a digit 3" is a string question, so no formula exists.
// One approach only, and that is the finding rather than a shortfall: a digit
// predicate has no closed form and no reusable structure between i and i+1, so
// every candidate has to be squared and read. The grid below is what "no
// pattern" actually looks like — and the density climbs with the digit count.
import { el, mountDebugger } from "../shared.js";

const MAX_N = 10000;
// All five official freeCodeCamp cases — 1 (the empty answer), 10, 100, 1000 and
// the stated 10,000 ceiling. They also happen to be one per decade, which is the
// set that shows the density climbing, so nothing invented is needed.
const PRESETS = [1, 10, 100, 1000, 10000];

const isStrike = (k) => String(k * k).includes("3");

function run(n) {
  const hits = [];
  let count = 0;
  for (let k = 1; k <= n; k++) if (isStrike(k)) { count++; if (hits.length < 18) hits.push(k); }
  return { count, hits };
}

// At most this many cells are drawn. Past it each cell stands for a block of
// consecutive numbers and is shaded by how many of them are strikes — the count
// stays exact either way, only the resolution drops.
const MAX_CELLS = 2500;
const COLS = 100;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .st-wrap { display:flex; flex-direction:column; gap:12px; }
    .st-svg { width:100%; height:auto; display:block; background:var(--panel); border:1px solid var(--border); border-radius:12px; }
    .st-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .st-hits { display:flex; flex-wrap:wrap; gap:5px; }
    .st-hit { border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:4px 8px;
              font:700 12px var(--mono); color:var(--muted); }
    .st-hit .k { color:var(--text); }
    .st-hit .sq { color:var(--muted); }
    .st-hit .d3 { color:var(--danger); font-weight:800; }
    .st-more { align-self:center; font:600 12px var(--sans); color:var(--muted); }
    .st-answer { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .st-answer b { font:800 22px var(--mono); color:var(--good); font-variant-numeric:tabular-nums; }
    .st-dens { display:flex; align-items:center; gap:8px; }
    .st-dens .track { flex:1; height:10px; border-radius:5px; background:var(--panel-2); border:1px solid var(--border); overflow:hidden; }
    .st-dens .fill { height:100%; background:color-mix(in srgb, var(--danger) 55%, transparent); }
    .st-dens .pct { font:700 12px var(--mono); color:var(--text); min-width:52px; text-align:right; }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const num = el("input"); num.type = "number"; num.min = "1"; num.max = String(MAX_N); num.value = "100"; num.style.width = "88px";
  const slider = el("input"); slider.type = "range"; slider.min = "1"; slider.max = String(MAX_N); slider.value = "100";
  slider.style.flex = "1"; slider.style.minWidth = "160px"; slider.style.accentColor = "var(--accent)";
  ctl.append(el("span", "ctl-label", "n ="), num, slider);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", `n = ${v.toLocaleString("en-US")}`); c.onclick = () => { num.value = slider.value = String(v); render(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  num.oninput = () => { slider.value = num.value; render(); };
  slider.oninput = () => { num.value = slider.value; render(); };
  render();

  function render() {
    const n = Math.max(1, Math.min(MAX_N, Math.floor(+num.value) || 1));
    const { count, hits } = run(n);

    // One cell per number while that fits; otherwise one cell per block, shaded
    // by the fraction of the block that strikes.
    const block = Math.max(1, Math.ceil(n / MAX_CELLS));
    const cells = Math.ceil(n / block);
    const rows = Math.ceil(cells / COLS);
    const W = 640, cw = W / COLS, H = rows * cw;
    let rects = "";
    for (let c = 0; c < cells; c++) {
      const lo = c * block + 1, hi = Math.min(n, lo + block - 1);
      let h = 0;
      for (let k = lo; k <= hi; k++) if (isStrike(k)) h++;
      const frac = h / (hi - lo + 1);
      const x = (c % COLS) * cw, y = Math.floor(c / COLS) * cw;
      const fill = frac === 0 ? "var(--panel-2)" : `color-mix(in srgb, var(--danger) ${Math.round(18 + frac * 62)}%, transparent)`;
      rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cw - .5).toFixed(2)}" height="${(cw - .5).toFixed(2)}" rx="1" fill="${fill}"/>`;
    }
    const svg = `<svg class="st-svg" viewBox="0 0 ${W} ${Math.max(cw, H).toFixed(2)}" role="img" aria-label="which numbers have a 3 in their square">${rects}</svg>`;

    const hitEls = hits.map((k) => {
      const sq = String(k * k).replace(/3/g, `<span class="d3">3</span>`);
      return `<span class="st-hit"><span class="k">${k}</span><span class="sq">² = ${sq}</span></span>`;
    }).join("");

    const pct = (count / n) * 100;
    out.innerHTML = "";
    const wrap = el("div", "st-wrap");
    wrap.append(el("div", "st-lbl", block === 1
      ? `each cell is one number from 1 to ${n.toLocaleString("en-US")} — red means its square contains a 3`
      : `each cell covers ${block} consecutive numbers, shaded by how many of them strike (the count below is exact)`));
    wrap.append(el("div", null, svg));
    wrap.append(el("div", "st-lbl", `the first strikes, with the offending digits marked`));
    wrap.append(el("div", "st-hits", hitEls + (count > hits.length ? `<span class="st-more">+ ${(count - hits.length).toLocaleString("en-US")} more</span>` : "") || `<span class="st-more">none — 1² = 1 has no 3 in it</span>`));
    wrap.append(el("div", "st-answer",
      `<span>squaresWithThree(${n.toLocaleString("en-US")}) =</span> <b>${count.toLocaleString("en-US")}</b>` +
      `<span class="muted">·</span><span class="opcount hot"><span class="n">${n.toLocaleString("en-US")}</span> squares read</span>`));
    wrap.append(el("div", "st-dens",
      `<span class="st-lbl">strike rate</span><span class="track"><span class="fill" style="width:${pct.toFixed(1)}%"></span></span><span class="pct">${pct.toFixed(1)}%</span>`));
    wrap.append(el("div", "note", `The rate climbs with n — <b>10%</b> at 10, <b>19%</b> at 100, <b>32.6%</b> at 1,000, <b>45.3%</b> at 10,000 — and the reason is just that bigger squares have more digits, so more slots that could hold a 3. There is no arithmetic rule underneath it: whether <code class='inl'>i²</code> contains a 3 depends on its decimal spelling, and knowing the answer for <b>i</b> tells you nothing about <b>i + 1</b>. That is why the grid looks like static, and why the cost is one square per candidate with no way around it.`));
    out.append(wrap);
  }
}

// ── STEP — square it, spell it, look for a 3 ────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">squaresWithThree</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> count = <span class="tok" data-t="seed">0</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 1; i &lt;= n</span>; i++) {` },
  { ln: 4, html: `    <span class="k">if</span> (<span class="tok" data-t="test"><span class="fn">String</span>(i * i).<span class="fn">includes</span>(<span class="st">"3"</span>)</span>) {` },
  { ln: 5, html: `      <span class="tok" data-t="inc">count++</span>;` },
  { ln: 6, html: `    }` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">count</span>;` },
  { ln: 9, html: `}` },
];

// Capped at 60: n = 10,000 is a 30,000-step trace, and there is nothing at step
// 20,000 that step 60 doesn't already show. The three large official cases are
// reachable from the demo above, which computes them exactly.
const STEP_MAX = 60;

function trace(raw) {
  const n = Math.max(1, Math.min(STEP_MAX, Math.floor(raw) || 1));
  const steps = [];
  const found = [];
  let count = 0, i;
  const S = (line, note, x = {}) => {
    const vars = { n };
    if (line >= 2) vars.count = count;
    if (line >= 3 && line <= 7 && i !== undefined) { vars.i = i; vars["i * i"] = i * i; }
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `squaresWithThree(${n})`, vars, changed: x.changed || [], structs: [{ label: "strikes", items: found.slice(), newest: !!x.fresh }], ret: x.ret }] });
  };

  S(1, `Count how many integers from 1 to <b>${n}</b> have a <b>3</b> somewhere in their square. Note what the question is <i>not</i>: it isn't about divisibility or remainders, it's about how the square is spelled.`, { focus: "param" });
  S(2, `One tally, seeded at <b>0</b>. Nothing else needs to survive between iterations — no memo helps, because knowing the answer for <b>i</b> says nothing about <b>i + 1</b>.`, { focus: "seed", changed: ["count"] });

  for (i = 1; i <= n; i++) {
    S(3, `<b>i = ${i}</b>, still ≤ ${n}.`, { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} <= ${n}`, val: true } });
    const sq = i * i, txt = String(sq), hit = txt.includes("3");
    S(4, `Square it: <b>${i}² = ${sq}</b>. Now spell it — <code class='inl'>String(${sq})</code> — and look for a "3": <b>${hit ? `found one${txt.split("3").length > 2 ? ` (${txt.split("3").length - 1} of them, and they still count as one hit)` : ""}` : "no 3 anywhere in it"}</b>. <i>Turning the number into text is the whole trick, and it's why no formula exists.</i>`,
      { focus: "test", eval: { expr: `"${txt}".includes("3")`, val: hit } });
    if (hit) {
      count++; found.push(i);
      S(5, `Strike. <b>count++</b> → <b>${count}</b>. A square with two 3s in it is still one strike; the problem asks "at least one".`, { focus: "inc", changed: ["count"], fresh: true });
    }
  }
  const exited = i; i = undefined;
  S(3, `<b>i = ${exited}</b> is past <b>${n}</b> — every candidate has been squared and read.`, { focus: "loop", eval: { expr: `i = ${exited} <= ${n}`, val: false } });
  S(8, `<b>Return ${count}</b> — ${count} of ${n} squares contained a 3, a strike rate of <b>${((count / n) * 100).toFixed(1)}%</b>. That rate keeps climbing as n grows, because longer squares have more digits to hide a 3 in.`,
    { focus: "ret", done: true, result: count, ret: { value: count } });
  return steps;
}

export default {
  n: 10, id: "threestrikes", title: "3 Strikes", dates: ["2025-08-20"],
  statement: `Given an integer between <b>1 and 10,000</b>, return how many numbers from 1 up to it have a square containing <b>at least one digit 3</b>. <span class="rule">Example: <code class="inl">squaresWithThree(10)</code> → <b>1</b> — only 6² = 3<b>6</b> qualifies.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one square per candidate",
      approach: `Square every candidate, turn it into text, and ask whether a <code class='inl'>"3"</code> is in there. That sounds like giving up on cleverness, and it is — correctly. A digit predicate has <b>no closed form</b> and <b>no reusable state</b>: the answer for <code class='inl'>i</code> tells you nothing about <code class='inl'>i + 1</code>, so there is nothing to memoize, sieve, or skip. Recognising that early is the actual win; the grid below is what the absence of a pattern looks like.`,
      code: `function squaresWithThree(n: number): number {
  let count = 0;
  for (let i = 1; i <= n; i++) {
    // a digit test is a *string* test — there is no arithmetic shortcut
    if (String(i * i).includes("3")) {
      count++;   // "at least one" — two 3s is still one strike
    }
  }
  return count;
}`,
      mount,
    },
    { name: "Step through", cost: "one candidate per pass",
      approach: `Each pass squares the next integer, spells it out, and looks for the digit. Watch the <b>strikes</b> struct fill and notice how irregularly it does — 6, 18, 19, 37… no stride, no rule. Capped at <b>n = 60</b>: the official 10,000 case is a 30,000-step trace, and the demo above computes it exactly. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "n =", value: 20, min: 1, max: STEP_MAX, presets: [1, 10, 20, 40, 60], hint: "capped at 60 — the big cases live in the demo" } }) },
  ],
};
