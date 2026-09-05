// #294 · Parentheses Combinations — count valid arrangements of n pairs (Catalan).
// Two variants that make the same number the HARD way and the SMART way:
//   • BRUTE  — generate all 2^(2n) strings over "(" and ")", balance-test each.
//   • OPT    — build strings left-to-right, pruning illegal moves; count leaves.
// The teaching payload is the op-counter: brute tests 256 strings for n=4 to
// find 14 valid; the pruned recursion never even constructs a bad prefix.
//
// COVERAGE: fCC tests n = 2, 3, 5, 8, 13. The Pruned-recursion tab reaches
// 2, 3 and 5 (42 leaves, ~3900px of scrollable tree). n=8 is 1430 leaves /
// ~131,000px and n=13 is 742,900 leaves / 3.7M nodes — every variant here is an
// enumerator, so neither can be drawn or stepped. `catalan()` below is only a
// cross-check badge inside the tree render, not a standalone count-only
// surface, so there is nowhere to display 8/13 without building the tree.
// This is the trim CONTRIBUTING.md names as legitimate.
import { el, esc, mountDebugger } from "../shared.js";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pz-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:2px 0 12px; }
    .pz-tree { overflow:auto; }
    .pz-legend { display:flex; gap:14px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); margin-top:8px; }
    .pz-legend span { display:inline-flex; align-items:center; gap:5px; }
    .pz-dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
  `));
}

const catalan = (n) => { let c = 1; for (let i = 0; i < n; i++) c = c * 2 * (2 * i + 1) / (i + 2); return Math.round(c); };
const isBalanced = (s) => { let bal = 0; for (const c of s) { bal += c === "(" ? 1 : -1; if (bal < 0) return false; } return bal === 0; };

// ── BRUTE — enumerate every string of "(" / ")", keep the balanced ones ──────
function mountBrute(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  [1, 2, 3, 4].forEach((n) => { const b = el("button", "chip" + (n === 3 ? " on" : ""), "n = " + n); b.dataset.n = n; ctl.append(b); });
  const head = el("div", "pz-head");
  const out = el("div");
  host.append(ctl, head, out);

  const CAP = 80;
  function render(n) {
    const len = 2 * n, total = 1 << len;
    const cells = []; let valid = 0;
    for (let mask = 0; mask < total; mask++) {
      let s = "";
      for (let i = 0; i < len; i++) s += ((mask >> (len - 1 - i)) & 1) ? "(" : ")";
      const ok = isBalanced(s);
      if (ok) valid++;
      cells.push({ s, ok });
    }
    head.innerHTML =
      `<span class="opcount hot"><span class="n">${total}</span> strings tested</span>` +
      `<span class="muted mono">→</span>` +
      `<span class="badge ok">${valid} valid</span>` +
      `<span class="muted">= Catalan(${n})</span>`;

    out.innerHTML = "";
    const grid = el("div", "cand-grid");
    cells.slice(0, CAP).forEach((c) => grid.append(el("span", "cand " + (c.ok ? "pass" : "fail"), esc(c.s))));
    if (cells.length > CAP) grid.append(el("span", "more", "+" + (cells.length - CAP) + " more"));
    out.append(grid);
    out.append(el("div", "note",
      `Brute force builds <b>all ${total}</b> length-${len} strings of “(” and “)”, then balance-checks each — only <b>${valid}</b> survive. ` +
      `Green cells are the valid ones; the faded red cells are wasted work. ` +
      `For n = 4 that’s <b>256 tries for 14 answers</b>. The “Pruned recursion” tab never even constructs an invalid prefix.`));
  }
  ctl.onclick = (e) => { if (!e.target.dataset.n) return; [...ctl.children].forEach((c) => c.classList.toggle("on", c === e.target)); render(+e.target.dataset.n); };
  render(3);
}

// ── OPT — the pruned recursion tree; count green leaves. Op-counter = nodes visited ──
function mountPruned(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  // Official cases are n = 2, 3, 5, 8, 13. The first three are here; 8 (1430
  // leaves) and 13 (742900) cannot be drawn as a tree — see the module note.
  // n = 1 is the trivial base; n = 4 is the 256-strings-for-14-answers punchline.
  [1, 2, 3, 4, 5].forEach((n) => { const b = el("button", "chip" + (n === 3 ? " on" : ""), "n = " + n); b.dataset.n = n; ctl.append(b); });
  const head = el("div", "pz-head");
  const out = el("div");
  const svgBox = el("div");
  host.append(ctl, head, out, svgBox);

  function build(n) {
    let id = 0; const nodes = []; const edges = [];
    function rec(open, close, str, depth) {
      const me = { id: id++, str: str || "ε", open, close, depth, leaf: open === n && close === n };
      nodes.push(me);
      if (me.leaf) return me;
      if (open < n) { const ch = rec(open + 1, close, str + "(", depth + 1); edges.push({ from: me.id, to: ch.id, ch: "(" }); }
      else edges.push({ from: me.id, pruned: "(", ch: "(" });
      if (close < open) { const ch = rec(open, close + 1, str + ")", depth + 1); edges.push({ from: me.id, to: ch.id, ch: ")" }); }
      else if (close < n) edges.push({ from: me.id, pruned: ")", ch: ")" });
      return me;
    }
    rec(0, 0, "", 0);
    return { nodes, edges };
  }

  function render(n) {
    const { nodes, edges } = build(n);
    const byId = Object.fromEntries(nodes.map((nd) => [nd.id, nd]));
    let leafX = 0;
    const place = (nd) => {
      const kids = edges.filter((e) => e.from === nd.id && e.to != null).map((e) => byId[e.to]);
      if (!kids.length) { nd.x = leafX++; return nd.x; }
      const xs = kids.map(place); nd.x = (Math.min(...xs) + Math.max(...xs)) / 2; return nd.x;
    };
    place(nodes[0]);
    const maxDepth = Math.max(...nodes.map((nd) => nd.depth));
    const dx = 92, dy = 64, padX = 30, padY = 26;
    const width = leafX * dx + padX * 2;
    const height = (maxDepth + 1) * dy + padY * 2;
    const px = (nd) => padX + nd.x * dx + dx / 2;
    const py = (nd) => padY + nd.depth * dy;

    let s = `<svg viewBox="0 0 ${width} ${height}" width="${width}">`;
    edges.forEach((e) => {
      if (e.to == null) return;
      const a = byId[e.from], b = byId[e.to];
      const col = e.ch === "(" ? "var(--accent)" : "var(--c5)";
      s += `<line x1="${px(a)}" y1="${py(a) + 9}" x2="${px(b)}" y2="${py(b) - 9}" stroke="${col}" stroke-width="1.5" opacity=".55"/>`;
    });
    edges.forEach((e) => {
      if (e.to != null) return;
      const a = byId[e.from]; const dir = e.pruned === "(" ? -22 : 22;
      s += `<line x1="${px(a)}" y1="${py(a) + 9}" x2="${px(a) + dir}" y2="${py(a) + 30}" stroke="var(--danger)" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/>`;
      s += `<text x="${px(a) + dir}" y="${py(a) + 42}" fill="var(--danger)" font-size="10" text-anchor="middle" opacity=".7">✗${e.pruned}</text>`;
    });
    nodes.forEach((nd) => {
      const fill = nd.leaf ? "var(--good)" : "var(--panel-2)";
      const stroke = nd.leaf ? "var(--good)" : "var(--border)";
      const tcol = nd.leaf ? "var(--bg)" : "var(--text)";
      const w = Math.max(26, nd.str.length * 9 + 12);
      s += `<g><rect x="${px(nd) - w / 2}" y="${py(nd) - 10}" width="${w}" height="20" rx="6" fill="${fill}" stroke="${stroke}"/>` +
           `<text x="${px(nd)}" y="${py(nd) + 4}" fill="${tcol}" font-family="var(--mono)" font-size="11" font-weight="700" text-anchor="middle">${esc(nd.str)}</text></g>`;
    });
    s += `</svg>`;

    const leaves = nodes.filter((nd) => nd.leaf).length;
    const pruned = edges.filter((e) => e.to == null).length;
    const visited = nodes.length; // every state the recursion actually entered

    head.innerHTML =
      `<span class="opcount cool"><span class="n">${visited}</span> nodes visited</span>` +
      `<span class="muted mono">${leaves} leaves · ${pruned} pruned</span>` +
      `<span class="badge ok" style="margin-left:2px">= Catalan(${n}) = ${catalan(n)}</span>`;

    out.innerHTML = "";
    out.append(el("div", "result-line",
      `<span class="big">${leaves}</span><span class="muted">valid combinations (green leaves)</span>`));
    out.append(el("div", "note",
      `Red dashed stubs are moves the rules forbid — adding “)” with nothing open, or “(” past n. ` +
      `That pruning is the whole trick: every surviving path reaches a valid string, so the answer is just the leaf count. ` +
      `The recursion touches <b>${visited}</b> nodes — vs the brute tab’s <b>${(1 << (2 * n))}</b> full strings.`));
    out.append(el("div", "pz-legend",
      `<span><i class="pz-dot" style="background:var(--good)"></i>valid leaf</span>` +
      `<span><i class="pz-dot" style="background:var(--panel-2);border:1px solid var(--border)"></i>partial string</span>` +
      `<span><i class="pz-dot" style="background:var(--danger)"></i>pruned move</span>`));
    svgBox.innerHTML = `<div class="panel pz-tree">${s}</div>`;
  }
  ctl.onclick = (e) => { if (!e.target.dataset.n) return; [...ctl.children].forEach((c) => c.classList.toggle("on", c === e.target)); render(+e.target.dataset.n); };
  render(3);
}

const CODE_BRUTE = `// Brute force: build EVERY string of "(" and ")" of length 2n, keep the balanced ones.
// 2^(2n) candidates — 256 strings for n=4 — to find just Catalan(n) answers.
function getCombinations(n: number): number {
  const len = 2 * n;
  let count = 0;
  for (let mask = 0; mask < (1 << len); mask++) {
    let bal = 0, ok = true;
    for (let i = 0; i < len; i++) {
      bal += (mask >> i) & 1 ? 1 : -1; // 1 bit = "(", 0 bit = ")"
      if (bal < 0) { ok = false; break; }
    }
    if (ok && bal === 0) count++;
  }
  return count;
}`;

const CODE_OPT = `// "Number of valid combinations" = the nth Catalan number.
// Build strings left-to-right, pruning the moment a string can't be completed:
//   - add '(' only while open < n
//   - add ')' only while close < open   (never let ')' overtake '(')
// Every leaf reached is valid by construction — so just count leaves.
function getCombinations(n: number): number {
  let count = 0;
  const build = (open: number, close: number): void => {
    if (open === n && close === n) { count++; return; } // complete & balanced
    if (open < n)     build(open + 1, close);           // place '('
    if (close < open) build(open, close + 1);           // place ')'
  };
  build(0, 0);
  return count;
}`;

// ── STEP (brute) — enumerate every string, balance-test each, one line at a time ─
// Deliberately paired with the "Generate & filter" tab: watch it BUILD garbage
// like "))((" and reject it — the exact work the pruned recursion never does.
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getCombinations</span>(n) {` },
  { ln: 2, html: `  <span class="k">const</span> len = 2 * n;` },
  { ln: 3, html: `  <span class="k">let</span> count = 0;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="cand">s</span> <span class="k">of</span> everyString(len)) {  <span class="cm">// all 2^len "(" / ")" strings</span>` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="test">isBalanced(s)</span>) count++;  <span class="cm">// keep only the balanced ones</span>` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> count;` },
  { ln: 8, html: `}` },
];

function traceBrute(n) {
  const len = 2 * n;
  const steps = [];
  let count = 0, s = "";
  const strings = [];
  for (let mask = 0; mask < (1 << len); mask++) {
    let str = "";
    for (let i = 0; i < len; i++) str += ((mask >> (len - 1 - i)) & 1) ? "(" : ")";
    strings.push(str);
  }
  const S = (line, note, x = {}) => {
    const vars = { n, len };
    if (line >= 3) vars.count = count;
    if (x.showS) vars.s = `"${s}"`;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getCombinations(${n})`, vars, changed: x.changed || [] }] });
  };

  S(1, `Call <b>getCombinations(${n})</b> — count valid strings of ${n} pair${n === 1 ? "" : "s"} the brute way: build every string, test each.`);
  S(2, `Each candidate is <b>len = 2·${n} = ${len}</b> characters long.`, { changed: ["len"] });
  S(3, `Start the tally at <b>count = 0</b>.`, { changed: ["count"] });
  strings.forEach((str, idx) => {
    s = str;
    S(4, `Next candidate — <b>${idx + 1} of ${strings.length}</b>: <b>s = "${str}"</b>.`, { focus: "cand", showS: true, changed: ["s"] });
    let bal = 0, ok = true;
    for (const ch of str) { bal += ch === "(" ? 1 : -1; if (bal < 0) { ok = false; break; } }
    const balanced = ok && bal === 0;
    if (balanced) count++;
    S(5, balanced
      ? `<b>isBalanced("${str}")</b> → <b>true</b>: every prefix keeps “(” ≥ “)”, and it ends even. Keep it — <b>count → ${count}</b>.`
      : `<b>isBalanced("${str}")</b> → <b>false</b>: ${ok ? "it ends with opens still unclosed" : "a “)” appears with nothing open"}. Wasted — skip it.`,
      { focus: "test", showS: true, eval: { expr: `isBalanced("${str}")`, val: balanced }, changed: balanced ? ["count"] : [] });
  });
  S(7, `All <b>${strings.length}</b> candidates tested to keep just <b>${count}</b>. <b>Return count = ${count}</b>.`, { done: true, result: count });
  return steps;
}

// ── STEP (pruned) — recursion visualised on the shared debugger (a growing call stack) ─
// Stepped version builds the actual strings so `results` and the recursion depth
// are visible; results.length is the same Catalan count the challenge returns.
const SRC_STEP = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getCombinations</span>(n) {` },
  { ln: 2,  html: `  <span class="k">const</span> results = [];` },
  { ln: 3,  html: `  <span class="k">function</span> <span class="fn">build</span>(open, close, s) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">s.length === 2 * n</span>) { <span class="tok" data-t="basepush">results.<span class="fn">push</span>(s)</span>; <span class="k">return</span>; }` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="opencond">open &lt; n</span>) <span class="tok" data-t="opencall"><span class="fn">build</span>(open + 1, close, s + "(")</span>;` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="closecond">close &lt; open</span>) <span class="tok" data-t="closecall"><span class="fn">build</span>(open, close + 1, s + ")")</span>;` },
  { ln: 7,  html: `  }` },
  { ln: 8,  html: `  <span class="fn">build</span>(0, 0, "");` },
  { ln: 9,  html: `  <span class="k">return</span> results.length;` },
  { ln: 10, html: `}` },
];

function traceStep(n) {
  const steps = []; const results = []; const stack = []; // stack of {open, close, s}
  const framesNow = (opt = {}) => {
    const arr = [{ title: `getCombinations(${n})`, vars: { n }, changed: opt.baseChanged || [],
      structs: [{ label: "results", items: results.slice(), newest: !!opt.resNew }] }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      arr.push({ title: `build(${fr.open}, ${fr.close}, "${fr.s}")`,
        vars: { open: fr.open, close: fr.close, s: `"${fr.s}"` },
        changed: top ? (opt.topChanged || []) : [], ret: top ? opt.ret : undefined });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>getCombinations(${n})</b> — count the valid strings of ${n} pairs of parentheses.`, { baseChanged: ["n"] });
  S(2, `Declare <b>results</b> — an array to hold every complete valid string.`, {});
  S(8, `Kick off the recursion with <b>build(0, 0, "")</b> — nothing placed yet.`, {});

  (function build(open, close, s) {
    stack.push({ open, close, s });
    S(3, `Enter <b>build(${open}, ${close}, "${s}")</b> — a new frame is <b>pushed</b> onto the call stack.`, { topChanged: ["open", "close", "s"] });
    const complete = s.length === 2 * n;
    S(4, `Base case <b>s.length === 2·n</b> — ${s.length} === ${2 * n} → <b>${complete}</b>.`, { focus: "base", eval: { expr: `${s.length} === ${2 * n}`, val: complete } });
    if (complete) {
      results.push(s);
      S(4, `Complete & balanced — <b>push "${s}"</b> to results, then <b>return</b> (this frame pops off).`, { focus: "basepush", resNew: true, ret: { value: `"${s}" ✓` } });
      stack.pop();
      return;
    }
    const canOpen = open < n;
    S(5, `Room for a '(' ? <b>open &lt; n</b> — ${open} &lt; ${n} → <b>${canOpen}</b>.`, { focus: "opencond", eval: { expr: `${open} < ${n}`, val: canOpen } });
    if (canOpen) {
      S(5, `Yes — recurse into <b>build(${open + 1}, ${close}, "${s}(")</b>.`, { focus: "opencall" });
      build(open + 1, close, s + "(");
      S(5, `Returned to <b>build(${open}, ${close}, "${s}")</b>; the '(' branch is done.`, { focus: "opencall" });
    }
    const canClose = close < open;
    S(6, `Room for a ')' ? <b>close &lt; open</b> — ${close} &lt; ${open} → <b>${canClose}</b>.`, { focus: "closecond", eval: { expr: `${close} < ${open}`, val: canClose } });
    if (canClose) {
      S(6, `Yes — recurse into <b>build(${open}, ${close + 1}, "${s})")</b>.`, { focus: "closecall" });
      build(open, close + 1, s + ")");
      S(6, `Returned to <b>build(${open}, ${close}, "${s}")</b>; the ')' branch is done.`, { focus: "closecall" });
    }
    S(7, `No moves left from <b>build(${open}, ${close}, "${s}")</b> — <b>return</b> (this frame pops off).`, { ret: { value: "⏎" } });
    stack.pop();
  })(0, 0, "");

  S(9, `Recursion finished — the stack is empty again. <b>Return results.length = ${results.length}</b>.`, { done: true, result: results.length });
  return steps;
}

export default {
  n: 294, id: "parens", title: "Parentheses Combinations", dates: ["2026-05-31"],
  statement: `Given <code>n</code>, return the number of valid combinations of <code>n</code> pairs of parentheses. (For n=2: <code>(())</code> and <code>()()</code> → 2.)`,
  // Grouped by approach: each approach is [intuition viz] → [step through], and
  // the tone colour pairs them (brute-tinted pair, then opt-tinted pair).
  variants: [
    { name: "Generate & filter", tone: "brute", cost: "O(4ⁿ)",
      approach: `Enumerate all <code class='inl'>2^(2n)</code> strings over “(” and “)”, then balance-test each. Correct, but it builds a mountain of garbage: for n=4 it checks <b>256</b> strings to keep <b>14</b>.`,
      code: CODE_BRUTE, mount: mountBrute },
    { name: "Step: generate", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — step the loop that <b>builds every string and balance-tests it</b>. Watch it construct garbage like <code class='inl'>"))(("</code> and reject it: that wasted work is exactly what the pruned recursion avoids. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (n capped at 2 — brute tests <code class='inl'>2^(2n)</code> strings.)`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "n =", value: 2, min: 1, max: 2, presets: [1, 2], hint: "pairs — 2^(2n) candidates" } }) },
    { name: "Pruned recursion", tone: "opt", cost: "O(Cₙ) leaves",
      approach: `Build strings left-to-right and prune illegal moves — never close more than you’ve opened, never open past n. Every surviving path is valid, so the answer is the number of leaves, which is exactly the nth Catalan number.`,
      code: CODE_OPT, mount: mountPruned },
    { name: "Step: recurse", tone: "opt", cost: "call stack",
      approach: `A debugger for the pruned recursion — watch the <b>call stack</b> grow as <code class='inl'>build</code> calls itself and shrink as each frame <b>returns</b> (backtracking). Each frame carries its own <code class='inl'>open</code>, <code class='inl'>close</code>, and partial string <code class='inl'>s</code>; completed strings land in <code class='inl'>results</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Small n so the stack stays readable.)`,
      mount: (host) => mountDebugger(host, { source: SRC_STEP, trace: traceStep, input: { label: "n =", value: 2, min: 1, max: 3, presets: [1, 2, 3], hint: "pairs — small n" } }) },
  ],
};
