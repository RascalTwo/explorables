// #356 · Magic Square Solver — a complete row IS the constant, so the hole is a subtraction.
// • BRUTE — "Try every value": walk v = 1 … (the board's total), rebuild the grid and
//   re-add all EIGHT lines for every single candidate. The wasteful act is that it
//   learns nothing from the numbers already on the board — on the official
//   "rows disagree" grid that is 268 candidates × 8 = 2,144 line sums to say "impossible".
// • OPT — "Complete row → constant": the hole sits in ONE row, so another row is
//   complete, and a complete row IS the magic constant. The answer is
//   constant − (the two knowns in the hole's row). One subtraction, then eight sums to
//   prove it — and `every` bails at the first line that misses, so ≤ 10 sums, always.
// Both pass all 5 official assertions, including both "impossible" cases.
// Flip the Approach toggle on the "rows disagree ✗" preset: 2,144 line sums vs 5.
import { el, mountDebugger } from "../shared.js";

// The eight lines of a 3×3, as indexes into the flattened grid. Both approaches walk
// this same table; they differ only in how many times they walk it.
const LINES = [
  { label: "row 0", idx: [0, 1, 2] }, { label: "row 1", idx: [3, 4, 5] }, { label: "row 2", idx: [6, 7, 8] },
  { label: "col 0", idx: [0, 3, 6] }, { label: "col 1", idx: [1, 4, 7] }, { label: "col 2", idx: [2, 5, 8] },
  { label: "diag ↘", idx: [0, 4, 8] }, { label: "diag ↙", idx: [2, 4, 6] },
];
const IDX = LINES.map((L) => L.idx);

// Both step-throughs PRINT this table on their line 2 — grouped rows, columns, diagonals.
// Derived from IDX so the displayed source can't fall behind the table the traces walk.
// CODE_BRUTE and CODE_OPT keep a literal copy on purpose (a snippet has to paste out and
// run standalone), so those two are the only other places an edit here has to reach.
const LINES_SRC = [IDX.slice(0, 3), IDX.slice(3, 6), IDX.slice(6)]
  .map((group) => group.map((line) => `[${line.join(",")}]`).join(",")).join(", ");

// PROVENANCE — presets 1–5 are freeCodeCamp's five official grids, in the order the
// grader lists them; 6–7 are mine. Every one lands on a different branch:
//   1 hole on BOTH diagonals · 2 hole in row 0 (so the constant comes from row 1)
//   3 deduction succeeds but a COLUMN disagrees · 4 hole in the bottom-right corner
//   5 the two complete rows already disagree, so the forced value is negative
//   6 hole on NO diagonal — the diagonals still have to be checked (mine)
//   7 the value that completes it is 0 — but 0 is the marker for "missing" (mine)
const PRESETS = [
  { label: "centre → 5", grid: [[2, 7, 6], [9, 0, 1], [4, 3, 8]] },
  { label: "row 0 → 4", grid: [[0, 14, 12], [18, 10, 2], [8, 6, 16]] },
  { label: "column disagrees ✗", grid: [[12, 17, 16], [19, 0, 10], [14, 13, 18]] },
  { label: "corner → 39", grid: [[15, 35, 31], [43, 27, 11], [23, 19, 0]] },
  { label: "rows disagree ✗", grid: [[26, 41, 14], [47, 35, 0], [32, 29, 44]] },
  { label: "edge → 7", grid: [[2, 0, 6], [9, 5, 1], [4, 3, 8]] },
  { label: "needs 0 ✗", grid: [[1, 6, 5], [8, 4, 0], [3, 2, 7]] },
];

const sumAt = (flat, idx) => flat[idx[0]] + flat[idx[1]] + flat[idx[2]];
const fill = (flat, hole, v) => flat.map((x, i) => (i === hole ? v : x));

// ── The two runs, instrumented. `ops` counts ONE thing in both: a line sum
// (three numbers added). That is the unit of work the whole module compares.
function runBrute(grid) {
  const flat = grid.flat();
  const limit = flat.reduce((a, b) => a + b, 0);
  const hole = flat.indexOf(0);
  let ops = 0;
  for (let v = 1; v <= limit; v++) {
    const g = fill(flat, hole, v);
    const sums = IDX.map((line) => { ops++; return sumAt(g, line); });
    if (sums.every((s) => s === sums[0])) return { answer: v, ops, limit, tried: v };
  }
  return { answer: "impossible", ops, limit, tried: limit };
}

function runDeduce(grid) {
  const flat = grid.flat();
  const hole = flat.indexOf(0);
  let ops = 0;
  const fullRow = IDX.slice(0, 3).findIndex((line) => !line.includes(hole));
  ops++; const magic = sumAt(flat, IDX[fullRow]);
  const holeRow = Math.floor(hole / 3);
  ops++; const value = magic - sumAt(flat, IDX[holeRow]);
  const g = fill(flat, hole, value);
  const ok = IDX.every((line) => { ops++; return sumAt(g, line) === magic; });
  return { answer: value > 0 && ok ? value : "impossible", ops, fullRow, holeRow, magic, value };
}

// The picture both demos draw: the grid completed with the ONLY value that can ever
// work (the one the hole's row forces), plus all eight line sums of that completion.
// When the answer is "impossible" this is exactly the evidence — some line misses.
function analyse(grid) {
  const flat = grid.flat();
  const hole = flat.indexOf(0);
  const d = runDeduce(grid);
  const g = fill(flat, hole, d.value);
  return { flat, hole, g, magic: d.magic, value: d.value, fullRow: d.fullRow, sums: IDX.map((line) => sumAt(g, line)) };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mq-wrap { display:flex; gap:22px; flex-wrap:wrap; align-items:flex-start; margin-top:4px; }
    .mq-grid { display:grid; grid-template-columns:repeat(3, 78px); gap:4px; padding:10px;
               background:var(--panel); border:1px solid var(--border); border-radius:14px; }
    .mq-cell { display:flex; flex-direction:column; align-items:center; gap:2px;
               padding:5px 4px; border-radius:9px; border:1px solid transparent; }
    .mq-cell input { width:64px; text-align:center; font:700 16px var(--mono); }
    .mq-cell.hole input { border-color:var(--accent); border-style:dashed; color:var(--accent); }
    .mq-cell.lit { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 14%, transparent); }
    .mq-cell.lit.miss { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 14%, transparent); }
    .mq-cap { font:700 11px var(--mono); height:14px; line-height:14px; color:transparent; }
    .mq-cap.good { color:var(--good); } .mq-cap.bad { color:var(--danger); }
    .mq-side { flex:1; min-width:280px; }
    .mq-lead { font:12px var(--sans); color:var(--muted); margin:10px 0 6px; }
    .mq-ded { font:12.5px/1.8 var(--mono); background:#0a0e14; border:1px solid var(--border);
              border-radius:9px; padding:9px 12px; color:var(--muted); }
    .mq-ded b { color:var(--text); } .mq-ded .s { color:var(--accent); font-weight:700; }
    .mq-ded .bad { color:var(--danger); font-weight:700; }
    .mq-lines .srow { cursor:crosshair; }
    .mq-v { color:var(--accent); font-weight:800; }
  `));
}

// One demo shape, two modes — the grid, the eight lines and the verdict are the same
// picture; only the WORK panel (candidate sweep vs. one subtraction) and the op count
// differ. That is the whole point of the pair.
function magicDemo(mode) {
  return function mount(host) {
    ensureStyle();
    let grid = PRESETS[0].grid.map((r) => [...r]);

    const chips = el("div", "controls");
    PRESETS.forEach((p, i) => {
      const c = el("button", "chip" + (i === 0 ? " on" : ""), p.label);
      c.onclick = () => {
        grid = p.grid.map((r) => [...r]);
        [...chips.children].forEach((x, xi) => x.classList.toggle("on", xi === i));
        write(); render();
      };
      chips.append(c);
    });

    const gridEl = el("div", "mq-grid");
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const cell = el("div", "mq-cell");
      const inp = el("input");
      inp.type = "number"; inp.min = 0; inp.max = 999;
      inp.oninput = () => { read(); chips.querySelectorAll(".on").forEach((c) => c.classList.remove("on")); render(); };
      const cap = el("div", "mq-cap", "·");
      cell.append(inp, cap);
      cells.push({ cell, inp, cap });
      gridEl.append(cell);
    }

    const side = el("div", "mq-side");
    const wrap = el("div", "mq-wrap");
    wrap.append(gridEl, side);
    host.append(chips, wrap,
      el("div", "note", "Type in any cell — <b>clear it, or type 0, to move the hole</b>. Hover a line row to light up its three cells. Break a grid on purpose and watch the verdict flip to <b>impossible</b>."));

    // Empty or unparseable reads as 0 — i.e. as the hole, which is what "clear a cell"
    // should mean. Only a value that the clamp actually bit gets written back, so the
    // field never fights the person typing into it.
    const read = () => cells.forEach(({ inp }, i) => {
      const n = Math.floor(+inp.value || 0), v = Math.max(0, Math.min(999, n));
      if (v !== n) inp.value = String(v);
      grid[(i / 3) | 0][i % 3] = v;
    });
    const write = () => { cells.forEach(({ inp }, i) => { inp.value = String(grid[(i / 3) | 0][i % 3]); }); };
    const lite = (line, miss) => cells.forEach(({ cell }, i) => {
      const on = !!line && line.idx.includes(i);
      cell.classList.toggle("lit", on);
      cell.classList.toggle("miss", on && miss);
    });

    function render() {
      const flat = grid.flat();
      const holes = flat.filter((x) => x === 0).length;
      cells.forEach(({ cell, cap }, i) => {
        cell.classList.toggle("hole", flat[i] === 0);
        cap.className = "mq-cap"; cap.textContent = "·";
      });
      side.innerHTML = "";
      lite(null, false);

      if (holes !== 1) {
        side.append(el("div", "result-line", `<span class="badge no">${holes === 0 ? "no hole" : holes + " holes"}</span>`));
        side.append(el("div", "note", holes === 0
          ? "Every cell is filled, so there is nothing to solve. <b>Clear one cell</b> (or type 0) to make it the missing number."
          : "The challenge promises <b>exactly one</b> missing number, and both approaches lean on that: the brute drops one value into one hole, and the deduction needs a row that is complete. Fill all but one cell."));
        return;
      }

      const a = analyse(grid);
      const run = mode === "brute" ? runBrute(grid) : runDeduce(grid);
      const ok = run.answer !== "impossible";

      // the hole cell reports the verdict where the eye already is
      const hc = cells[a.hole].cap;
      hc.className = "mq-cap " + (ok ? "good" : "bad");
      hc.textContent = ok ? "→ " + run.answer : "→ " + a.value + "?";

      const rl = el("div", "result-line");
      rl.append(el("span", "badge " + (ok ? "ok" : "no"), ok ? `returns ${run.answer}` : `returns "impossible"`));
      rl.append(el("span", "opcount " + (mode === "brute" ? "hot" : "cool"), `<span class="n">${run.ops}</span> line sums added`));
      side.append(rl);

      if (mode === "brute") {
        side.append(el("div", "mq-lead", `Sweeping <b>v = 1 … ${run.limit}</b> — every cell is positive, so the answer cannot exceed the board's total. ${ok ? `Stopped at <b>${run.answer}</b> after trying ${run.tried} value${run.tried === 1 ? "" : "s"}.` : `All <b>${run.limit}</b> failed.`}`));
        const cg = el("div", "cand-grid");
        const shown = Math.min(run.tried, 40);
        for (let v = 1; v <= shown; v++) cg.append(el("span", "cand " + (ok && v === run.answer ? "pass" : "fail"), String(v)));
        if (run.tried > shown) cg.append(el("span", "more", `+${run.tried - shown} more`));
        side.append(cg);
      } else {
        side.append(el("div", "mq-lead", "No search — read the constant off the board:"));
        const rowTerms = (r) => IDX[r].map((i) => a.flat[i]).join(" + ");
        side.append(el("div", "mq-ded",
          `<b>row ${a.fullRow}</b> has no hole → S = ${rowTerms(a.fullRow)} = <span class="s">${a.magic}</span><br>` +
          `<b>row ${(a.hole / 3) | 0}</b> holds the hole → S − (${IDX[(a.hole / 3) | 0].filter((i) => i !== a.hole).map((i) => a.flat[i]).join(" + ")}) = ` +
          `<span class="${ok ? "s" : "bad"}">${a.value}</span>` +
          (ok ? "" : a.value <= 0 ? `  ← not a positive number` : `  ← but the check below fails`)));
      }

      const list = el("div", "mq-lines");
      list.append(el("div", "srow head", `<span class="mark"></span><span class="k">target</span><span class="exp">${mode === "brute" ? "every line must match the first one" : `the constant, from complete row ${a.fullRow}`}</span><span class="got">${a.magic}</span>`));
      LINES.forEach((L, li) => {
        const s = a.sums[li], hit = s === a.magic;
        const terms = L.idx.map((i) => (i === a.hole ? `<span class="mq-v">${a.value}</span>` : a.g[i])).join(" + ");
        const row = el("div", "srow" + (hit ? "" : " bad"), `<span class="mark">${hit ? "✓" : "✗"}</span><span class="k">${L.label}</span><span class="exp">${terms}</span><span class="got">= ${s}</span>`);
        row.onmouseenter = () => lite(L, !hit);
        row.onmouseleave = () => lite(null, false);
        list.append(row);
      });
      side.append(list);

      side.append(el("div", "note", ok
        ? `All eight lines hit <b>${a.magic}</b>, so <b>${run.answer}</b> is the answer. ${mode === "brute" ? `It cost <b>${run.ops}</b> line sums to find out; the other approach spends <b>${runDeduce(grid).ops}</b>.` : `Deducing the value took one subtraction — the other <b>8</b> sums are the proof, not the search.`}`
        : a.value <= 0
          ? `The hole's row forces <b>${a.value}</b>, which is not a positive number — and <b>0</b> is this problem's own marker for "missing", so a grid completed by 0 or less has no number to hand back. ${a.sums.filter((s) => s !== a.magic).length ? `${a.sums.filter((s) => s !== a.magic).length} of the eight lines miss as well — hover the ✗ rows.` : `Every one of the eight lines does agree; the <i>value</i> alone is what makes this one impossible. (No official test settles the 0 case, so this is the module's reading of it.)`}`
          : `Only <b>${a.value}</b> can fix the hole's own row, and it still misses on ${a.sums.filter((s) => s !== a.magic).length} of the eight lines — hover the ✗ rows. Deducing a value is not proof; the completed grid has to hold <i>everywhere</i>, diagonals included. <b>"impossible"</b>.`));
    }

    write(); render();
  };
}

const CODE_BRUTE = `// BRUTE — try every value the hole could hold, re-adding all eight lines each time.
function solveMagicSquare(grid: number[][]): number | "impossible" {
  // The eight lines of a 3x3, as indexes into the flattened grid: 3 rows, 3 columns, 2 diagonals.
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const flat = grid.flat();
  const limit = flat.reduce((a, b) => a + b, 0);   // every cell is positive, so no answer can exceed the board's total
  for (let v = 1; v <= limit; v++) {
    const g = flat.map((x) => (x === 0 ? v : x));
    const sums = LINES.map(([a, b, c]) => g[a] + g[b] + g[c]);
    if (sums.every((s) => s === sums[0])) return v;
  }
  return "impossible";
}`;

const CODE_OPT = `// OPT — a complete row IS the magic constant, so the hole is one subtraction away.
function solveMagicSquare(grid: number[][]): number | "impossible" {
  // The eight lines of a 3x3, as indexes into the flattened grid: 3 rows, 3 columns, 2 diagonals.
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const flat = grid.flat();
  const hole = flat.indexOf(0);
  // The hole sits in ONE row, so at least one of the other two rows is complete.
  const full = LINES.slice(0, 3).find((line) => !line.includes(hole)) as number[];
  const magic = full.reduce((s, i) => s + flat[i], 0);
  const holeRow = LINES[Math.floor(hole / 3)];
  const value = magic - holeRow.reduce((s, i) => s + flat[i], 0);   // the 0 contributes nothing
  const g = flat.map((x, i) => (i === hole ? value : x));
  // Deduction is not proof: the completed grid still has to hold on all eight lines,
  // and 0 is the marker for "missing", so the answer has to be a positive number.
  const ok = LINES.every((line) => line.reduce((s, i) => s + g[i], 0) === magic);
  return value > 0 && ok ? value : "impossible";
}`;

// ── STEP: try every value ────────────────────────────────────────────────────
// Three cases sized so the sweep is watchable — found on the 5th value, found on the
// 7th, and one where all 11 candidates fail. Every official grid is a preset chip on
// the demos above; tracing the official "impossible" pair would run 119 and 268
// candidates (476 and 1,072 steps), which is the point being made, not a trace.
// Case 3 is mine: a tiny board where seven of the eight lines agree at v = 1 and the
// ↘ diagonal alone kills it — the cheapest possible picture of "nearly magic".
const BRUTE_CASES = [
  { label: "official #1 — hits at v = 5", grid: [[2, 7, 6], [9, 0, 1], [4, 3, 8]] },
  { label: "edge hole — hits at v = 7", grid: [[2, 0, 6], [9, 5, 1], [4, 3, 8]] },
  { label: "tiny board — 11 values, none works", grid: [[1, 1, 2], [2, 0, 1], [1, 2, 1]] },
];

const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">solveMagicSquare</span>(<span class="tok" data-t="param">grid</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="lines">LINES = [${LINES_SRC}]</span>;` },
  { ln: 3, html: `  <span class="k">const</span> flat = grid.<span class="tok" data-t="flat"><span class="fn">flat</span>()</span>;` },
  { ln: 4, html: `  <span class="k">const</span> limit = flat.<span class="tok" data-t="limit"><span class="fn">reduce</span>((a, b) =&gt; a + b, 0)</span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">v = 1; v &lt;= limit</span>; v++) {` },
  { ln: 6, html: `    <span class="k">const</span> g = flat.<span class="tok" data-t="fill"><span class="fn">map</span>(x =&gt; x === 0 ? v : x)</span>;` },
  { ln: 7, html: `    <span class="k">const</span> sums = LINES.<span class="tok" data-t="sums"><span class="fn">map</span>(([a,b,c]) =&gt; g[a] + g[b] + g[c])</span>;` },
  { ln: 8, html: `    <span class="k">if</span> (<span class="tok" data-t="all">sums.<span class="fn">every</span>(s =&gt; s === sums[0])</span>) <span class="k">return</span> v;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="st">"impossible"</span>;` },
  { ln: 11, html: `}` },
];

// Scope by omission: `limit` appears once line 4 has run; `v` only inside the loop
// (5–8); `g` and `sums` are consts in the loop BODY, so they vanish every time the
// cursor returns to line 5 — which is exactly the waste being dramatised.
function traceBrute(caseIndex) {
  const idx = Math.max(0, Math.min(BRUTE_CASES.length - 1, (caseIndex | 0) - 1));
  const cs = BRUTE_CASES[idx];
  const flat = cs.grid.flat();
  const hole = flat.indexOf(0);
  const steps = [];
  let limit = 0, v = 0, g = null, sums = null, ops = 0;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4) vars.limit = limit;
    if (line >= 5 && line <= 8) vars.v = v;
    const structs = [];
    if (line >= 3) structs.push({ label: "flat (0 = the hole)", items: flat });
    if (line >= 6 && line <= 8 && g) structs.push({ label: "g", items: g, newest: false });
    if (line >= 7 && line <= 8 && sums) structs.push({ label: "sums", items: sums });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "solveMagicSquare(grid)", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `<b>Case ${idx + 1}: ${cs.label}.</b> This approach knows nothing about magic squares beyond the definition — so it will <b>guess</b> the hole's value and check the definition, over and over.`, { focus: "param" });
  S(2, `Name the eight lines once, as index triples into a flat 9-cell array. Three rows, three columns, two diagonals — a magic square must make all eight add to the same number.`, { focus: "lines" });
  S(3, `Flatten the grid so a line is just three indexes. The <b>0</b> at index <b>${hole}</b> is the hole.`, { focus: "flat" });
  limit = flat.reduce((a, b) => a + b, 0);
  S(4, `How high can the guess go? Every cell is positive, so the magic constant is at most the whole board's total, <b>${limit}</b> — and the missing value is at most that. It is a <b>bound</b>, not a clue: the search still has no idea where in 1…${limit} the answer sits.`, { focus: "limit", changed: ["limit"] });

  let found = null;
  for (v = 1; v <= limit; v++) {
    S(5, `Next candidate: <b>v = ${v}</b>${v === 1 ? " — start at 1, because 0 is the hole marker itself" : ""}.`, { focus: "loop", changed: ["v"], eval: { expr: `v = ${v} <= ${limit}`, val: true } });
    g = fill(flat, hole, v);
    S(6, `Rebuild the whole board with <b>${v}</b> in the hole. Nothing else changed — this copy is thrown away at the end of the iteration.`, { focus: "fill" });
    sums = IDX.map((line) => sumAt(g, line));
    ops += 8;
    const miss = sums.findIndex((s) => s !== sums[0]);
    S(7, `Add all <b>eight</b> lines: ${sums.join(", ")}. ${miss < 0 ? "Every one came out the same." : `<b>${LINES[miss].label}</b> is already ${sums[miss]} against row 0's ${sums[0]} — yet the map has no early exit, so all eight get added anyway.`} Running cost: <b>${ops}</b> line sums.`, { focus: "sums" });
    const all = miss < 0;
    S(8, `Are all eight equal? ${all ? "Yes — this candidate satisfies the definition, so it is the answer." : `No (<b>${LINES[miss].label}</b> ≠ row 0), so <b>v = ${v}</b> is dead and the loop starts over one value higher.`}`, { focus: "all", eval: { expr: `sums.every(s => s === ${sums[0]})`, val: all } });
    if (all) { found = v; break; }
  }

  if (found !== null) {
    S(8, `<b>Return ${found}</b> after ${found} candidate${found === 1 ? "" : "s"} and <b>${ops}</b> line sums. The deduction tab reaches the same number in at most 10 — because it reads the constant off a complete row instead of guessing.`, { focus: "all", done: true, result: found, ret: { value: found } });
    return steps;
  }
  v = limit + 1; g = null; sums = null;
  S(5, `<b>v = ${limit + 1}</b> is past the bound — every possible value has been tried.`, { focus: "loop", eval: { expr: `v = ${limit + 1} <= ${limit}`, val: false } });
  S(10, `No value makes all eight lines agree, so the grid cannot be completed: <b>return "impossible"</b>. That verdict cost <b>${ops}</b> line sums; the deduction tab spends at most 10 to reach it.`, { done: true, result: `"impossible"`, ret: { value: `"impossible"` } });
  return steps;
}

// ── STEP: deduce & verify ────────────────────────────────────────────────────
// Five cases, one per branch of the deduction. Officials #1, #2, #3 and #5 plus one of
// mine; official #4 is omitted because it walks the same path as #1 (deduce, verify,
// return) and is a preset chip on both demos above.
//   1 the constant comes from row 0, the value checks out
//   2 the hole is IN row 0, so the constant has to come from row 1
//   3 the value is deducible but a COLUMN disagrees — deduction is not proof
//   4 the two complete rows already disagree, so the forced value is negative
//   5 (mine) the value that completes it is 0 — the marker for "missing" itself
const OPT_CASES = [
  { label: "official #1 — constant from row 0", grid: [[2, 7, 6], [9, 0, 1], [4, 3, 8]] },
  { label: "official #2 — hole in row 0", grid: [[0, 14, 12], [18, 10, 2], [8, 6, 16]] },
  { label: "official #3 — a column disagrees", grid: [[12, 17, 16], [19, 0, 10], [14, 13, 18]] },
  { label: "official #5 — forced value is negative", grid: [[26, 41, 14], [47, 35, 0], [32, 29, 44]] },
  { label: "completes with 0 (mine)", grid: [[1, 6, 5], [8, 4, 0], [3, 2, 7]] },
];

const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">solveMagicSquare</span>(<span class="tok" data-t="param">grid</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="lines">LINES = [${LINES_SRC}]</span>;` },
  { ln: 3, html: `  <span class="k">const</span> flat = grid.<span class="tok" data-t="flat"><span class="fn">flat</span>()</span>;` },
  { ln: 4, html: `  <span class="k">const</span> hole = flat.<span class="tok" data-t="hole"><span class="fn">indexOf</span>(0)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> full = LINES.<span class="fn">slice</span>(0, 3).<span class="tok" data-t="full"><span class="fn">find</span>(line =&gt; !line.<span class="fn">includes</span>(hole))</span>;` },
  { ln: 6, html: `  <span class="k">const</span> magic = full.<span class="tok" data-t="magic"><span class="fn">reduce</span>((s, i) =&gt; s + flat[i], 0)</span>;` },
  { ln: 7, html: `  <span class="k">const</span> holeRow = LINES[<span class="tok" data-t="holerow">Math.<span class="fn">floor</span>(hole / 3)</span>];` },
  { ln: 8, html: `  <span class="k">const</span> value = <span class="tok" data-t="value">magic - holeRow.<span class="fn">reduce</span>((s, i) =&gt; s + flat[i], 0)</span>;` },
  { ln: 9, html: `  <span class="k">const</span> g = flat.<span class="tok" data-t="place"><span class="fn">map</span>((x, i) =&gt; i === hole ? value : x)</span>;` },
  { ln: 10, html: `  <span class="k">const</span> ok = LINES.<span class="tok" data-t="check"><span class="fn">every</span>(line =&gt; line.<span class="fn">reduce</span>((s, i) =&gt; s + g[i], 0) === magic)</span>;` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">value &gt; 0 &amp;&amp; ok</span> ? value : <span class="st">"impossible"</span>;` },
  { ln: 12, html: `}` },
];

// Same omission rule as the brute trace: `hole` from line 4, `magic` from 6, `value`
// from 8, `ok` only once line 10 has finished. `checked` grows one entry per line the
// verification actually adds — and stops early, which is visible in its length.
function traceOpt(caseIndex) {
  const idx = Math.max(0, Math.min(OPT_CASES.length - 1, (caseIndex | 0) - 1));
  const cs = OPT_CASES[idx];
  const flat = cs.grid.flat();
  const steps = [];
  let hole, fullRow, magic, holeRow, value, g = null, ok, ops = 0;
  const checked = [];
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4) vars.hole = hole;
    if (line >= 5) vars.full = `row ${fullRow}`;
    if (line >= 6) vars.magic = magic;
    if (line >= 7) vars.holeRow = `row ${holeRow}`;
    if (line >= 8) vars.value = value;
    if (line >= 11) vars.ok = ok;
    const structs = [];
    if (line >= 3) structs.push({ label: "flat (0 = the hole)", items: flat });
    if (line >= 9 && g) structs.push({ label: "g (hole filled)", items: g });
    if (line >= 10 && checked.length) structs.push({ label: "line sums checked", items: checked.slice(), newest: !!x.newest });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "solveMagicSquare(grid)", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `<b>Case ${idx + 1}: ${cs.label}.</b> No searching here — the numbers already on the board determine the answer, and the only real work is proving it.`, { focus: "param" });
  S(2, `The same eight lines as index triples. Rows are the first three entries, which matters in a moment.`, { focus: "lines" });
  S(3, `Flatten the grid, so line <code class='inl'>[0,4,8]</code> literally means cells 0, 4 and 8.`, { focus: "flat" });
  hole = flat.indexOf(0);
  S(4, `Find the hole: index <b>${hole}</b> (row ${Math.floor(hole / 3)}, column ${hole % 3}). <b>0</b> is the problem's marker for "missing", which is also why 0 can never be a valid answer.`, { focus: "hole", changed: ["hole"] });
  fullRow = IDX.slice(0, 3).findIndex((line) => !line.includes(hole));
  S(5, `Take the first <b>row</b> that does not contain the hole — <b>row ${fullRow}</b>. One always exists: the hole sits in exactly one of the three rows, so two rows are complete. That is the whole insight.`, { focus: "full", changed: ["full"] });
  ops++; magic = sumAt(flat, IDX[fullRow]);
  S(6, `A complete row already sums to the magic constant: <b>${IDX[fullRow].map((i) => flat[i]).join(" + ")} = ${magic}</b>. The constant was free — it was sitting on the board the entire time.`, { focus: "magic", changed: ["magic"] });
  holeRow = Math.floor(hole / 3);
  S(7, `The hole lives in <b>row ${holeRow}</b>, and that row must also total ${magic}.`, { focus: "holerow", changed: ["holeRow"] });
  const known = IDX[holeRow].filter((i) => i !== hole).map((i) => flat[i]);
  ops++; value = magic - sumAt(flat, IDX[holeRow]);
  S(8, `Its 0 adds nothing, so summing that row gives exactly the two known cells: ${known.join(" + ")} = ${known[0] + known[1]}. One subtraction finishes it: <b>${magic} − ${known[0] + known[1]} = ${value}</b>. That is <b>${ops}</b> line sums so far, against the search's hundreds.`, { focus: "value", changed: ["value"] });
  g = fill(flat, hole, value);
  S(9, `Drop <b>${value}</b> into the hole. The hole's row is now guaranteed to hit ${magic} — <b>but nothing else is</b>, and that is the trap in this problem.`, { focus: "place" });

  ok = true;
  let failAt = -1;
  for (let i = 0; i < IDX.length; i++) {
    ops++;
    const s = sumAt(g, IDX[i]);
    checked.push(s);
    const hit = s === magic;
    S(10, `Verify <b>${LINES[i].label}</b>: ${IDX[i].map((j) => (j === hole ? `<b>${value}</b>` : g[j])).join(" + ")} = <b>${s}</b>${hit ? ` — matches ${magic}.` : ` — misses ${magic}.`} ${hit ? "" : `<code class='inl'>every</code> stops at the first miss, so the remaining ${IDX.length - i - 1} line(s) are never added.`}`,
      { focus: "check", newest: true, eval: { expr: `${s} === ${magic}`, val: hit } });
    if (!hit) { ok = false; failAt = i; break; }
  }

  const pos = value > 0;
  S(11, `Two things have to hold. Is the value a positive number? <b>${value} &gt; 0</b> → <b>${pos}</b>${pos ? "" : ` — a magic square completed by ${value} has no missing <i>number</i> to return; 0 is already the marker for the hole.`} And did all eight lines agree? <b>ok = ${ok}</b>${ok ? "" : ` (<b>${LINES[failAt].label}</b> broke it — deducing a value is not the same as proving the square).`}`,
    { focus: "ret", eval: { expr: `value > 0 && ok`, val: pos && ok }, changed: ["ok"] });
  const result = pos && ok ? value : `"impossible"`;
  S(11, pos && ok
    ? `<b>Return ${value}</b> — total cost <b>${ops}</b> line sums, and it would still be ${ops} if every number on the board had six digits.`
    : `<b>Return "impossible"</b> after <b>${ops}</b> line sums. The search tab reaches the same verdict, but only after exhausting every candidate up to the board's total.`,
    { focus: "ret", done: true, result, ret: { value: result } });
  return steps;
}

const caseInput = (cases, label) => ({
  label: "case =", value: 1, min: 1, max: cases.length,
  presets: cases.map((_, i) => i + 1), hint: `1–${cases.length}: ${label}`,
});

export default {
  n: 356, id: "magicsquare", title: "Magic Square Solver", dates: ["2026-08-01"],
  statement: `A 3×3 grid arrives with one number missing, written as <code class="inl">0</code>. Return the number that completes it into a <b>magic square</b> — every row, every column and both diagonals adding to the same total — or <code class="inl">"impossible"</code> if no such number exists. Example: <code class="inl">[[2,7,6],[9,0,1],[4,3,8]]</code> → <b>5</b>, because every line then totals 15. <span class="rule">Both diagonals count, and "impossible" is a real answer — most wrong solutions are wrong there.</span>`,
  variants: [
    { name: "Try every value", tone: "brute", cost: "O(total × 8)",
      approach: `The definition is checkable, so guess and check: put <b>1</b> in the hole, add all eight lines, see if they match; then <b>2</b>; then <b>3</b>. Every cell is positive, so the answer cannot exceed the board's total — that bounds the sweep, but it is a bound, not a clue. The wasteful act is right there in the op counter: it re-adds all eight lines for <i>every</i> candidate and learns nothing from the numbers already on the board. On the <b>rows disagree ✗</b> preset it burns <b>2,144</b> line sums to say "impossible".`,
      code: CODE_BRUTE, mount: magicDemo("brute") },
    { name: "Step: try every value", tone: "brute", cost: "candidate sweep",
      approach: `A debugger for the sweep. Watch <code class='inl'>v</code> climb, the board get rebuilt each time, and all eight sums get added even when the first two already disagree — <code class='inl'>map</code> has no early exit. Case 3 is the payoff: <b>11</b> candidates, and at <code class='inl'>v = 1</code> seven of the eight lines agree while the ↘ diagonal alone refuses. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: caseInput(BRUTE_CASES, "pick a grid") }) },
    { name: "Complete row → constant", tone: "opt", cost: "≤ 10 line sums",
      approach: `The hole sits in exactly <b>one</b> row, so at least one other row is complete — and a complete row <i>is</i> the magic constant. The hole's own row must total the same, and its <code class='inl'>0</code> adds nothing, so the answer is <b>constant − (the two knowns)</b>: one subtraction, no search. Then the part most solutions get wrong: <b>deduction is not proof</b>. Verify all eight lines of the completed grid, and reject a value that is not positive — <code class='inl'>0</code> is the marker for "missing", so it can never be the answer.`,
      code: CODE_OPT, mount: magicDemo("deduce") },
    { name: "Step: deduce & verify", tone: "opt", cost: "one subtraction",
      approach: `A debugger for the deduction — one subtraction, then the eight-line proof. Cases 3, 4 and 5 are the interesting ones: in <b>3</b> the value is perfectly deducible and a column still disagrees; in <b>4</b> the two complete rows contradict each other so the forced value is <b>negative</b>; in <b>5</b> the grid completes with <b>0</b>, which is the hole marker itself. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: caseInput(OPT_CASES, "pick a grid") }) },
  ],
};
