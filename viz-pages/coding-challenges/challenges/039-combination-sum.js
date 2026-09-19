// LeetCode #39 · Combination Sum — every multiset of candidates that sums to target.
// Numbers may be reused; [2,2,3] and [3,2,2] count once. Two variants:
//   • TREE — the backtracking recursion tree. A `start` index keeps each path
//     non-decreasing, which is the whole trick that collapses those permutations
//     into one combination. Sorted candidates let us PRUNE: once a candidate
//     exceeds what's left, every later one does too, so we break.
//   • STEP — the same recursion in the shared debugger: watch `path` grow on the
//     way down and POP on the way back up (that pop IS the backtrack), while the
//     call stack deepens and `res` collects the winners.
import { el, esc, mountDebugger } from "../shared.js";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cs-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:2px 0 12px; }
    .cs-tree { overflow:auto; }
    .cs-legend { display:flex; gap:14px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); margin-top:8px; }
    .cs-legend span { display:inline-flex; align-items:center; gap:5px; }
    .cs-dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
    .cs-cands { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:2px 0 10px; }
    .cs-cand { font:700 13px var(--mono); padding:5px 11px; border-radius:8px; border:1px solid var(--accent);
               color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,transparent); }
    .cs-t { font:700 13px var(--mono); padding:5px 11px; border-radius:8px; border:1px solid var(--good);
            color:var(--good); background:color-mix(in srgb,var(--good) 12%,transparent); }
    .cs-combo { display:inline-flex; gap:4px; align-items:center; font:700 13px var(--mono);
                padding:4px 9px; border-radius:7px; border:1px solid var(--good); color:var(--good);
                background:color-mix(in srgb,var(--good) 12%,transparent); }
    .cs-combos { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
  `));
}

// The reference solver — also the source of truth the trace/tree agree with.
function solve(candidates, target) {
  const cs = [...candidates].sort((a, b) => a - b);
  const res = [];
  const path = [];
  const backtrack = (start, remaining) => {
    if (remaining === 0) { res.push([...path]); return; }
    for (let i = start; i < cs.length; i++) {
      if (cs[i] > remaining) break;      // sorted → every later candidate is bigger too
      path.push(cs[i]);
      backtrack(i, remaining - cs[i]);   // i (not i+1) → the candidate may be reused
      path.pop();                        // undo — this is the backtrack
    }
  };
  backtrack(0, target);
  return { cs, res };
}

// ── TREE — draw the actual recursion tree; green leaves are the answers ───────
function mountTree(host) {
  ensureStyle();
  // LeetCode #39 publishes 3 examples; all 3 are here (1st, 3rd, 5th below).
  // The other two are ours: [2,3,6,7]→8 (7 overshoots, nothing reaches 8 with it)
  // and [2,4,6]→8 (all-even candidates, three distinct answers).
  const PRESETS = [
    { c: [2, 3, 6, 7], t: 7 },   // official — [[2,2,3],[7]]
    { c: [2, 3, 6, 7], t: 8 },
    { c: [2, 3, 5], t: 8 },      // official — [[2,2,2,2],[2,3,3],[3,5]]
    { c: [2, 4, 6], t: 8 },
    { c: [2], t: 1 },            // official — [] (the only no-solution case: dead root)
  ];
  const ctl = el("div", "controls");
  PRESETS.forEach((p, i) => {
    const b = el("button", "chip" + (i === 0 ? " on" : ""), `[${p.c.join(",")}] → ${p.t}`);
    b.dataset.i = i; ctl.append(b);
  });
  const head = el("div", "cs-head");
  const out = el("div");
  const svgBox = el("div");
  host.append(ctl, head, out, svgBox);

  // Build the tree by replaying the same backtracking, recording every node/edge.
  function build(candidates, target) {
    const { cs } = solve(candidates, target);
    let id = 0; const nodes = []; const edges = [];
    const path = [];
    // kind: "leaf" (remaining 0) | "dead" (no move led anywhere) | "inner"
    function rec(start, remaining, pick, depth) {
      const me = { id: id++, pick, remaining, path: [...path], depth, kind: "inner" };
      nodes.push(me);
      if (remaining === 0) { me.kind = "leaf"; return me; }
      let moved = false;
      for (let i = start; i < cs.length; i++) {
        if (cs[i] > remaining) {                                   // pruned stub
          edges.push({ from: me.id, pruned: cs[i] });
          break;
        }
        path.push(cs[i]);
        const ch = rec(i, remaining - cs[i], cs[i], depth + 1);
        edges.push({ from: me.id, to: ch.id, ch: cs[i] });
        path.pop();
        moved = true;
      }
      if (!moved) me.kind = "dead";                                // start ran off the end w/ nothing placed
      return me;
    }
    rec(0, target, null, 0);
    return { cs, nodes, edges };
  }

  function render(idx) {
    const { c, t } = PRESETS[idx];
    const { cs, nodes, edges } = build(c, t);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    // x-placement: leaves left→right, parents centered over children (same as #294 tree)
    let leafX = 0;
    const place = (nd) => {
      const kids = edges.filter((e) => e.from === nd.id && e.to != null).map((e) => byId[e.to]);
      if (!kids.length) { nd.x = leafX++; return nd.x; }
      const xs = kids.map(place); nd.x = (Math.min(...xs) + Math.max(...xs)) / 2; return nd.x;
    };
    place(nodes[0]);
    const maxDepth = Math.max(...nodes.map((n) => n.depth));
    const dx = 78, dy = 70, padX = 30, padY = 30;
    const width = Math.max(1, leafX) * dx + padX * 2;
    const height = (maxDepth + 1) * dy + padY * 2;
    const px = (nd) => padX + nd.x * dx + dx / 2;
    const py = (nd) => padY + nd.depth * dy;

    let s = `<svg viewBox="0 0 ${width} ${height}" width="${width}">`;
    edges.forEach((e) => {
      if (e.to == null) return;
      const a = byId[e.from], b = byId[e.to];
      s += `<line x1="${px(a)}" y1="${py(a) + 12}" x2="${px(b)}" y2="${py(b) - 12}" stroke="var(--accent)" stroke-width="1.5" opacity=".5"/>`;
      const mx = (px(a) + px(b)) / 2, my = (py(a) + py(b)) / 2;
      s += `<text x="${mx + 6}" y="${my}" fill="var(--accent)" font-size="10.5" font-family="var(--mono)" opacity=".9">+${e.ch}</text>`;
    });
    edges.forEach((e) => {
      if (e.to != null || e.pruned == null) return;
      const a = byId[e.from];
      s += `<line x1="${px(a)}" y1="${py(a) + 12}" x2="${px(a) + 22}" y2="${py(a) + 34}" stroke="var(--danger)" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/>`;
      s += `<text x="${px(a) + 26}" y="${py(a) + 44}" fill="var(--danger)" font-size="9.5" opacity=".7">${e.pruned}&gt;left</text>`;
    });
    nodes.forEach((nd) => {
      const isLeaf = nd.kind === "leaf";
      const label = nd.pick == null ? "start" : `+${nd.pick}`;
      const sub = isLeaf ? "✓ sum" : (nd.pick == null ? `need ${nd.remaining}` : `left ${nd.remaining}`);
      const fill = isLeaf ? "var(--good)" : "var(--panel-2)";
      const stroke = isLeaf ? "var(--good)" : (nd.kind === "dead" ? "color-mix(in srgb,var(--danger) 45%,var(--border))" : "var(--border)");
      const tcol = isLeaf ? "var(--bg)" : "var(--text)";
      const scol = isLeaf ? "var(--bg)" : "var(--muted)";
      const w = 52;
      s += `<g><rect x="${px(nd) - w / 2}" y="${py(nd) - 13}" width="${w}" height="30" rx="7" fill="${fill}" stroke="${stroke}"/>` +
           `<text x="${px(nd)}" y="${py(nd) - 1}" fill="${tcol}" font-family="var(--mono)" font-size="12" font-weight="700" text-anchor="middle">${esc(label)}</text>` +
           `<text x="${px(nd)}" y="${py(nd) + 11}" fill="${scol}" font-family="var(--mono)" font-size="8.5" text-anchor="middle">${esc(sub)}</text></g>`;
    });
    s += `</svg>`;

    const leaves = nodes.filter((n) => n.kind === "leaf");
    const combos = leaves.map((n) => n.path);

    head.innerHTML =
      `<span class="opcount cool"><span class="n">${nodes.length}</span> nodes explored</span>` +
      `<span class="muted mono">${edges.filter((e) => e.pruned != null).length} pruned</span>` +
      `<span class="badge ok" style="margin-left:2px">${combos.length} combination${combos.length === 1 ? "" : "s"}</span>`;

    out.innerHTML = "";
    out.append(el("div", "cs-cands",
      `<span class="ctl-label">candidates</span>` + cs.map((v) => `<span class="cs-cand">${v}</span>`).join("") +
      `<span class="ctl-label" style="margin-left:6px">target</span><span class="cs-t">${t}</span>`));
    out.append(el("div", "result-line",
      `<span class="big">${combos.length}</span><span class="muted">combinations that sum to ${t}</span>`));
    out.append(el("div", "cs-combos",
      combos.length
        ? combos.map((cm) => `<span class="cs-combo">[${cm.join(", ")}]</span>`).join("")
        : `<span class="muted">none</span>`));
    out.append(el("div", "note",
      `Each downward edge <b>picks a candidate</b> (its <code class='inl'>+k</code> label) and subtracts it from what's left. ` +
      `A branch only ever moves <b>rightward or stays</b> in the candidate list — that <code class='inl'>start</code> index is why <code class='inl'>[2,2,3]</code> appears once, not as ${"6"} shuffles. ` +
      `Red dashed stubs are <b>pruned</b>: the sorted list means once a candidate overshoots what's left, so does every later one — stop. ` +
      `Green boxes hit <b>left 0</b> exactly — those paths are the answers.`));
    out.append(el("div", "cs-legend",
      `<span><i class="cs-dot" style="background:var(--good)"></i>sum reached (answer)</span>` +
      `<span><i class="cs-dot" style="background:var(--panel-2);border:1px solid var(--border)"></i>partial sum</span>` +
      `<span><i class="cs-dot" style="background:var(--danger)"></i>pruned (overshoot)</span>`));
    svgBox.innerHTML = `<div class="panel cs-tree">${s}</div>`;
  }
  ctl.onclick = (e) => { if (e.target.dataset.i == null) return; [...ctl.children].forEach((c) => c.classList.toggle("on", c === e.target)); render(+e.target.dataset.i); };
  render(0);
}

// ── BRUTE — no start index: generate every ORDERING, then dedup with a Set ────
// The naive instinct: at each step try EVERY candidate. That reaches the same
// multisets but as permutations — [2,2,3], [2,3,2], [3,2,2] all show up — so a
// Set has to collapse them back. Seeing that waste is the whole motivation for
// the `start` index in the optimized tab.
function mountBrute(host) {
  ensureStyle();
  // Same provenance as the tree: 3 official LeetCode examples + 2 of ours
  // ([2,4,6]→8, [2,3,6,7]→9 — the latter is where permutation waste peaks).
  const PRESETS = [
    { c: [2, 3, 6, 7], t: 7 },   // official
    { c: [2, 3, 5], t: 8 },      // official
    { c: [2, 4, 6], t: 8 },
    { c: [2, 3, 6, 7], t: 9 },
    { c: [2], t: 1 },            // official — [] (no ordering ever sums to 1)
  ];
  const ctl = el("div", "controls");
  PRESETS.forEach((p, i) => { const b = el("button", "chip" + (i === 0 ? " on" : ""), `[${p.c.join(",")}] → ${p.t}`); b.dataset.i = i; ctl.append(b); });
  const head = el("div", "cs-head");
  const out = el("div");
  host.append(ctl, head, out);

  function render(idx) {
    const { c, t } = PRESETS[idx];
    const cs = [...c].sort((a, b) => a - b);
    const hits = [];              // every ORDERED sequence that reaches 0
    let calls = 0;
    const path = [];
    (function rec(rem) {
      calls++;
      if (rem === 0) { hits.push([...path]); return; }
      for (let i = 0; i < cs.length; i++) {   // every candidate every time — no `start`
        if (cs[i] > rem) continue;             // this one overshoots; try the next
        path.push(cs[i]); rec(rem - cs[i]); path.pop();
      }
    })(t);

    // group ordered hits by their sorted key → each group is ONE real combination
    const groups = new Map();
    hits.forEach((h) => {
      const k = [...h].sort((a, b) => a - b).join(",");
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(h);
    });
    const unique = [...groups.keys()].map((k) => k.split(",").map(Number));

    head.innerHTML =
      `<span class="opcount hot"><span class="n">${hits.length}</span> ordered hits</span>` +
      `<span class="muted mono">${calls} calls</span>` +
      `<span class="badge ok" style="margin-left:2px">${unique.length} unique combination${unique.length === 1 ? "" : "s"}</span>`;

    out.innerHTML = "";
    out.append(el("div", "cs-cands",
      `<span class="ctl-label">candidates</span>` + cs.map((v) => `<span class="cs-cand">${v}</span>`).join("") +
      `<span class="ctl-label" style="margin-left:6px">target</span><span class="cs-t">${t}</span>`));
    out.append(el("div", "result-line",
      `<span class="big">${hits.length}</span><span class="muted">ordered hits</span>` +
      `<span class="muted mono">→ dedup →</span>` +
      `<span class="big">${unique.length}</span><span class="muted">unique combination${unique.length === 1 ? "" : "s"}</span>`));

    const rawRows = [...groups.values()].map((g) => {
      const dup = g.length > 1;
      return `<div class="cs-combos" style="margin-top:2px">` +
        g.map((h) => `<span class="cs-combo"${dup ? ' style="border-color:var(--danger);color:var(--danger)"' : ""}>[${h.join(", ")}]</span>`).join("") +
        (dup ? `<span class="muted mono" style="align-self:center">← ${g.length} orderings of one multiset</span>` : "") +
        `</div>`;
    }).join("");
    out.append(el("div", null,
      `<div class="cs-legend" style="margin:12px 0 4px"><b style="color:var(--text)">Raw hits — every ordering the recursion finds</b></div>${rawRows}`));
    out.append(el("div", null,
      `<div class="cs-legend" style="margin:14px 0 4px"><b style="color:var(--text)">After the Set dedups — the actual answer</b></div>` +
      `<div class="cs-combos">${unique.map((u) => `<span class="cs-combo">[${u.join(", ")}]</span>`).join("")}</div>`));
    out.append(el("div", "note",
      `Looping over <b>every</b> candidate at each step finds <code class='inl'>[2,2,3]</code>, <code class='inl'>[2,3,2]</code> and <code class='inl'>[3,2,2]</code> as three separate hits (shown in red), then a <b>Set</b> collapses them back to one. ` +
      `The optimized tab's single trick — a <code class='inl'>start</code> index that forbids returning to an earlier candidate — keeps every path non-decreasing, so those duplicate orderings are <b>never generated</b>. Same answers, a fraction of the calls.`));
  }
  ctl.onclick = (e) => { if (e.target.dataset.i == null) return; [...ctl.children].forEach((x) => x.classList.toggle("on", x === e.target)); render(+e.target.dataset.i); };
  render(0);
}

const CODE = `// LeetCode 39 — return every combination of candidates (reuse allowed) summing to target.
// The 'start' index makes each path non-decreasing, so permutations of the same
// multiset collapse into one answer. Sorting first unlocks the early break (prune).
function combinationSum(candidates: number[], target: number): number[][] {
  candidates.sort((a, b) => a - b);
  const res: number[][] = [];
  const path: number[] = [];

  const backtrack = (start: number, remaining: number): void => {
    if (remaining === 0) { res.push([...path]); return; } // exact hit — record a copy
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;   // sorted ⇒ all later candidates overshoot too
      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // i, not i+1 ⇒ candidates[i] may repeat
      path.pop();                              // backtrack: undo the choice
    }
  };

  backtrack(0, target);
  return res;
}`;

// ── STEP — the recursion on the shared debugger (candidates fixed, target is the knob) ─
const CANDS = [2, 3, 6, 7];
const SRC_STEP = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">combinationSum</span>(candidates, target) {` },
  { ln: 2, html: `  candidates.<span class="fn">sort</span>((a, b) =&gt; a - b);` },
  { ln: 3, html: `  <span class="k">const</span> res = [];` },
  { ln: 4, html: `  <span class="k">const</span> path = [];` },
  { ln: 5, html: `  <span class="k">const</span> <span class="fn">backtrack</span> = (start, remaining) =&gt; {` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="base">remaining === 0</span>) { <span class="tok" data-t="push">res.<span class="fn">push</span>([...path])</span>; <span class="k">return</span>; }` },
  { ln: 7, html: `    <span class="k">for</span> (<span class="k">let</span> i = start; i &lt; candidates.length; i++) {` },
  { ln: 8, html: `      <span class="k">if</span> (<span class="tok" data-t="prune">candidates[i] &gt; remaining</span>) <span class="k">break</span>;` },
  { ln: 9, html: `      path.<span class="fn">push</span>(candidates[i]);` },
  { ln: 10, html: `      <span class="tok" data-t="rec"><span class="fn">backtrack</span>(i, remaining - candidates[i])</span>;` },
  { ln: 11, html: `      path.<span class="fn">pop</span>();` },
  { ln: 12, html: `    }` },
  { ln: 13, html: `  };` },
  { ln: 14, html: `  <span class="fn">backtrack</span>(0, target);` },
  { ln: 15, html: `  <span class="k">return</span> res;` },
  { ln: 16, html: `}` },
];

function traceStep(target) {
  const cs = CANDS; // already sorted
  const steps = []; const res = []; const path = []; const stack = []; // stack of {start, remaining, i}
  const framesNow = (opt = {}) => {
    const arr = [{
      title: `combinationSum([${cs.join(",")}], ${target})`, vars: { target },
      changed: opt.baseChanged || [],
      structs: [{ label: "res", items: res.map((r) => `[${r.join(",")}]`), newest: !!opt.resNew }],
    }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      arr.push({
        title: `backtrack(${fr.start}, ${fr.remaining})`,
        vars: { start: fr.start, remaining: fr.remaining, i: fr.i == null ? "—" : fr.i },
        changed: top ? (opt.topChanged || []) : [],
        structs: top ? [{ label: "path", items: path.slice(), newest: !!opt.pathNew }] : [],
        ret: top ? opt.ret : undefined,
      });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>combinationSum([${cs.join(", ")}], ${target})</b> — find every multiset of these numbers (reuse allowed) that sums to <b>${target}</b>.`, { baseChanged: ["target"] });
  S(2, `Sort candidates ascending → <b>[${cs.join(", ")}]</b>. Sorted order is what lets us <b>break</b> early later.`, {});
  S(3, `Declare <b>res</b> — collects each complete combination.`, {});
  S(4, `Declare <b>path</b> — the numbers chosen on the current branch. It grows on the way down and <b>pops</b> on the way back up.`, {});
  S(14, `Kick off with <b>backtrack(0, ${target})</b> — start at index 0, nothing chosen yet.`, {});

  (function backtrack(start, remaining) {
    const fr = { start, remaining, i: null }; stack.push(fr);
    S(5, `Enter <b>backtrack(${start}, ${remaining})</b> — a new frame is <b>pushed</b>. It may pick candidates from index ${start} onward.`, { topChanged: ["start", "remaining"] });
    const done = remaining === 0;
    S(6, `Base case <b>remaining === 0</b> → <b>${done}</b>.`, { focus: "base", eval: { expr: `${remaining} === 0`, val: done } });
    if (done) {
      res.push([...path]);
      S(6, `Exact hit — <b>push [${path.join(", ")}]</b> into res, then <b>return</b> (frame pops).`, { focus: "push", resNew: true, ret: { value: `[${path.join(",")}] ✓` } });
      stack.pop();
      return;
    }
    for (let i = start; i < cs.length; i++) {
      fr.i = i;
      const over = cs[i] > remaining;
      S(8, `i = ${i}: is <b>candidates[${i}] &gt; remaining</b>? ${cs[i]} &gt; ${remaining} → <b>${over}</b>.`, { focus: "prune", eval: { expr: `${cs[i]} > ${remaining}`, val: over } });
      if (over) {
        S(8, `Overshoot — and since candidates are sorted, every later one overshoots too. <b>break</b> out of the loop.`, { focus: "prune" });
        break;
      }
      path.push(cs[i]);
      S(9, `Pick <b>${cs[i]}</b> — push it onto path → <b>[${path.join(", ")}]</b>.`, { pathNew: true });
      S(10, `Recurse into <b>backtrack(${i}, ${remaining - cs[i]})</b> — same start ${i} keeps ${cs[i]} reusable.`, { focus: "rec" });
      backtrack(i, remaining - cs[i]);
      fr.i = i;
      path.pop();
      S(11, `Back in <b>backtrack(${start}, ${remaining})</b>. <b>path.pop()</b> undoes ${cs[i]} → <b>[${path.join(", ")}]</b>. That undo is the backtrack.`, { topChanged: ["i"] });
    }
    S(12, `Loop over from <b>backtrack(${start}, ${remaining})</b> — no moves left. <b>return</b> (frame pops).`, { ret: { value: "⏎" } });
    stack.pop();
  })(0, target);

  S(15, `Recursion done, stack empty. <b>Return res</b> — ${res.length} combination${res.length === 1 ? "" : "s"}: ${res.map((r) => `[${r.join(",")}]`).join(", ") || "none"}.`, { done: true, result: res.map((r) => `[${r.join(",")}]`).join("  ") || "none" });
  return steps;
}

// ── STEP (brute) — the "No start index" recursion on the shared debugger ───────
// Deliberately paired with the "No start index" tab: no `start`, so every call
// loops over ALL candidates and the same multiset shows up as several orderings
// ([2,2,3], [2,3,2], [3,2,2] at target 7). A Set of sorted keys collapses them —
// watch it REJECT the repeats. That rejected work is exactly what the `start`
// index in the optimized tab never generates.
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">combinationSum</span>(candidates, target) {` },
  { ln: 2,  html: `  <span class="k">const</span> seen = <span class="k">new</span> <span class="fn">Set</span>();` },
  { ln: 3,  html: `  <span class="k">const</span> res = [];` },
  { ln: 4,  html: `  <span class="k">const</span> path = [];` },
  { ln: 5,  html: `  <span class="k">const</span> <span class="fn">recurse</span> = (remaining) =&gt; {` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">remaining === 0</span>) {` },
  { ln: 7,  html: `      <span class="k">const</span> combo = [...path].<span class="fn">sort</span>((a, b) =&gt; a - b);` },
  { ln: 8,  html: `      <span class="k">const</span> key = combo.<span class="fn">join</span>(",");` },
  { ln: 9,  html: `      <span class="k">if</span> (<span class="tok" data-t="seen">!seen.<span class="fn">has</span>(key)</span>) { <span class="tok" data-t="add">seen.<span class="fn">add</span>(key); res.<span class="fn">push</span>(combo)</span>; }` },
  { ln: 10, html: `      <span class="k">return</span>;` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `    <span class="k">for</span> (<span class="k">const</span> cand <span class="k">of</span> candidates) {  <span class="cm">// every candidate, every time — no start index</span>` },
  { ln: 13, html: `      <span class="k">if</span> (<span class="tok" data-t="over">cand &gt; remaining</span>) <span class="k">continue</span>;` },
  { ln: 14, html: `      path.<span class="fn">push</span>(<span class="tok" data-t="push">cand</span>);` },
  { ln: 15, html: `      <span class="tok" data-t="rec"><span class="fn">recurse</span>(remaining - cand)</span>;` },
  { ln: 16, html: `      path.<span class="fn">pop</span>();` },
  { ln: 17, html: `    }` },
  { ln: 18, html: `  };` },
  { ln: 19, html: `  <span class="fn">recurse</span>(target);` },
  { ln: 20, html: `  <span class="k">return</span> res;` },
  { ln: 21, html: `}` },
];

function traceBrute(target) {
  const cs = CANDS; // [2,3,6,7], sorted as given
  const steps = []; const seen = new Set(); const res = []; const path = []; const stack = []; // stack of {remaining, cand}
  const framesNow = (opt = {}) => {
    const arr = [{
      title: `combinationSum([${cs.join(",")}], ${target})`, vars: { target },
      changed: opt.baseChanged || [],
      structs: [
        { label: "seen", items: [...seen], newest: !!opt.seenNew },
        { label: "res", items: res.map((r) => `[${r.join(",")}]`), newest: !!opt.resNew },
      ],
    }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      arr.push({
        title: `recurse(${fr.remaining})`,
        vars: { remaining: fr.remaining, cand: fr.cand == null ? "—" : fr.cand },
        changed: top ? (opt.topChanged || []) : [],
        structs: top ? [{ label: "path", items: path.slice(), newest: !!opt.pathNew }] : [],
        ret: top ? opt.ret : undefined,
      });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>combinationSum([${cs.join(", ")}], ${target})</b> — the naive way: at every step try <b>every</b> candidate, keep each ordered run that sums to <b>${target}</b>, then dedup.`, { baseChanged: ["target"] });
  S(2, `Declare <b>seen</b> — a Set of sorted-combo keys already recorded. This is the thing that collapses duplicate orderings.`, {});
  S(3, `Declare <b>res</b> — the unique combinations we keep.`, {});
  S(4, `Declare <b>path</b> — the numbers chosen on the current branch (grows down, pops back up).`, {});
  S(19, `Kick off with <b>recurse(${target})</b> — nothing chosen yet, and no <code class='inl'>start</code> index to hold us back.`, {});

  (function recurse(remaining) {
    const fr = { remaining, cand: null }; stack.push(fr);
    S(5, `Enter <b>recurse(${remaining})</b> — a new frame is <b>pushed</b>. With no start index it will loop over <b>all</b> candidates.`, { topChanged: ["remaining"] });
    const done = remaining === 0;
    S(6, `Base case <b>remaining === 0</b> → <b>${done}</b>.`, { focus: "base", eval: { expr: `${remaining} === 0`, val: done } });
    if (done) {
      const combo = [...path].sort((a, b) => a - b);
      const key = combo.join(",");
      const fresh = !seen.has(key);
      if (fresh) {
        seen.add(key);
        res.push(combo);
        S(9, `Hit ${target}. Sort path → <b>[${combo.join(", ")}]</b>, key <b>"${key}"</b>. <b>seen.has("${key}")</b> → <b>false</b>: brand-new multiset — <b>add</b> the key and <b>push [${combo.join(", ")}]</b> to res, then <b>return</b>.`,
          { focus: "add", eval: { expr: `!seen.has("${key}")`, val: true }, seenNew: true, resNew: true, ret: { value: `[${combo.join(",")}] ✓` } });
      } else {
        S(9, `Hit ${target}. Sort path → <b>[${combo.join(", ")}]</b>, key <b>"${key}"</b>. <b>seen.has("${key}")</b> → <b>true</b>: a different ordering of this same multiset was already recorded — <b>skip it</b> (this is the wasted work the Set absorbs), then <b>return</b>.`,
          { focus: "seen", eval: { expr: `!seen.has("${key}")`, val: false }, ret: { value: `dup ✗` } });
      }
      stack.pop();
      return;
    }
    for (let idx = 0; idx < cs.length; idx++) {
      const cand = cs[idx];
      fr.cand = cand;
      if (cand > remaining) {
        S(13, `<b>cand = ${cand} &gt; remaining ${remaining}</b> → overshoot; <b>continue</b>. (These candidates are ${cs.join(", ")}, so every later one overshoots too — nothing more can be picked here.)`,
          { focus: "over", eval: { expr: `${cand} > ${remaining}`, val: true }, topChanged: ["cand"] });
        break; // sorted ⇒ all later candidates also overshoot; res is unaffected
      }
      path.push(cand);
      S(14, `<b>cand = ${cand} ≤ remaining ${remaining}</b> — pick it: <b>push</b> onto path → <b>[${path.join(", ")}]</b>.`, { focus: "push", topChanged: ["cand"], pathNew: true });
      S(15, `Recurse into <b>recurse(${remaining - cand})</b>. No start index, so this next frame will again try every candidate — that's how one multiset gets reached as several orderings.`, { focus: "rec" });
      recurse(remaining - cand);
      fr.cand = cand;
      path.pop();
      S(16, `Back in <b>recurse(${remaining})</b>. <b>path.pop()</b> undoes ${cand} → <b>[${path.join(", ")}]</b>.`, { focus: "pop", topChanged: ["cand"] });
    }
    S(17, `Loop over from <b>recurse(${remaining})</b> — <b>return</b> (frame pops).`, { ret: { value: "⏎" } });
    stack.pop();
  })(target);

  S(20, `Done — the Set collapsed every duplicate ordering. <b>Return res</b> — <b>${seen.size}</b> unique combination${seen.size === 1 ? "" : "s"}: ${res.map((r) => `[${r.join(",")}]`).join("  ") || "none"}.`,
    { done: true, result: res.map((r) => `[${r.join(",")}]`).join("  ") || "none" });
  return steps;
}

export default {
  n: 39, id: "combination-sum", title: "Combination Sum",
  source: "leetcode", url: "https://leetcode.com/problems/combination-sum/",
  // LeetCode publishes no official "problem added" date; #39 is a low-numbered
  // problem from the original 2014–15 set. Approximate date so the gallery can
  // sort by publish order — only the era matters (it predates every fCC daily).
  // `difficulty` replaces the eyebrow label a daily gets from its date.
  dates: ["2015-01-01"], difficulty: "Medium",
  statement: `Given distinct integers <code>candidates</code> and a <code>target</code>, return every unique combination that sums to <code>target</code>. The <b>same number may be reused</b> any number of times; combinations are multisets, so <code>[2,2,3]</code> and <code>[3,2,2]</code> are the <span class="rule">same answer</span>. <span class="rule">(candidates = [2,3,6,7], target = 7 → [[2,2,3],[7]].)</span>`,
  variants: [
    { name: "No start index", tone: "brute", cost: "every ordering",
      approach: `The naive instinct: at every step, try <b>every</b> candidate. This reaches all the right multisets — but as permutations, so <code class='inl'>[2,2,3]</code>, <code class='inl'>[2,3,2]</code> and <code class='inl'>[3,2,2]</code> all appear, and a <b>Set</b> has to dedup them. The red hits are the wasted work; the optimized tab's <code class='inl'>start</code> index is exactly what stops them from being generated.`,
      code: `// The obvious way: try EVERY candidate at each step (no start index),
// collect every ordered sequence that sums to target, then dedup with a Set.
function combinationSum(candidates: number[], target: number): number[][] {
  const seen = new Set<string>();
  const res: number[][] = [];
  const path: number[] = [];

  const recurse = (remaining: number): void => {
    if (remaining === 0) {
      const combo = [...path].sort((a, b) => a - b);
      const key = combo.join(",");
      if (!seen.has(key)) { seen.add(key); res.push(combo); } // collapse orderings
      return;
    }
    for (const cand of candidates) {      // every candidate, every time
      if (cand > remaining) continue;     // overshoots — skip it
      path.push(cand);
      recurse(remaining - cand);
      path.pop();
    }
  };

  recurse(target);
  return res;
}`,
      mount: mountBrute },
    { name: "Step: every ordering", tone: "brute", cost: "call stack",
      approach: `A debugger for the brute force — <b>no <code class='inl'>start</code> index</b>, so every <code class='inl'>recurse</code> call loops over <b>all</b> candidates. Watch the <b>call stack</b> deepen as it picks a number, and <code class='inl'>path</code> grow on the way down then <b>pop</b> on the way back. Every ordered run that hits <b>0</b> is sorted into a key and offered to <code class='inl'>seen</code>; the same multiset reached by a different ordering (e.g. at target 7, <code class='inl'>[2,3,2]</code> after <code class='inl'>[2,2,3]</code>) is <b>rejected by the Set</b> — that rejected work is exactly what the <code class='inl'>start</code> index eliminates. Candidates fixed <code class='inl'>[2,3,6,7]</code>; drag the target (try <b>5</b> or <b>7</b> to watch a repeat get skipped). Hit <b>Step</b>, scrub, or <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { label: "target =", value: 6, min: 4, max: 7, presets: [5, 6, 7], hint: "candidates fixed [2,3,6,7]" } }) },
    { name: "Backtracking tree", tone: "opt", cost: "O(N^(T/min))",
      approach: `Grow combinations one pick at a time. A <code class='inl'>start</code> index forbids going back to an earlier candidate, so each path is non-decreasing and every multiset is reached exactly once — no permutation duplicates. Because candidates are sorted, the moment one overshoots what's left, we <b>break</b> (every later one is bigger). Green leaves — where remaining hits <b>0</b> — are the answers.`,
      code: CODE, mount: mountTree },
    { name: "Step: recurse", tone: "opt", cost: "call stack",
      approach: `The same recursion in a debugger. Watch the <b>call stack</b> deepen as <code class='inl'>backtrack</code> picks a number and recurses, and watch <code class='inl'>path</code> grow on the way down then <b>pop</b> on the way back up — that pop is the backtrack. Completed combinations land in <code class='inl'>res</code>. Candidates are fixed at <code class='inl'>[2,3,6,7]</code>; drag the target. Hit <b>Step</b>, scrub, or <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_STEP, trace: traceStep, input: { label: "target =", value: 7, min: 2, max: 9, presets: [7, 8], hint: "candidates fixed [2,3,6,7]" } }) },
  ],
};
