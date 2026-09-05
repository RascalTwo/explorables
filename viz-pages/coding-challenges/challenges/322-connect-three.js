// #322 · Connect Three — scan a board for three-in-a-row of one colour.
// One variant. The grid is live: click a cell to cycle empty→R→Y and it
// re-evaluates, drawing a halo + line through the winning triple.
import { el, mountDebugger } from "../shared.js";

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
// All 5 official freeCodeCamp boards, one per geometry the scan can hit:
// → row, ↓ column, ↙ anti-diagonal, ↘ down-right, and no win.
const PRESETS = [
  { label: "row win", board: [["","","",""],["","","",""],["","Y","",""],["Y","R","R","R"]] },
  { label: "column win", board: [["","","",""],["","Y","Y",""],["","Y","R","R"],["","Y","R","R"]] },
  { label: "anti-diagonal", board: [["","","Y","R"],["","Y","R","Y"],["","R","Y","R"],["","R","Y","R"]] },
  { label: "diagonal ↘", board: [["","Y","",""],["","Y","Y",""],["","R","R","Y"],["R","R","Y","R"]] },
  { label: "no win", board: [["Y","R","R","Y"],["R","Y","Y","R"],["Y","R","R","Y"],["R","Y","Y","R"]] },
];

function connectThree(matrix) {
  const R = matrix.length, C = matrix[0].length;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const v = matrix[r][c];
    if (v === "") continue;
    for (const [dr, dc] of DIRS) {
      const cells = [[r, c]]; let ok = true;
      for (let k = 1; k < 3; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || matrix[nr][nc] !== v) { ok = false; break; }
        cells.push([nr, nc]);
      }
      if (ok) return [v, ...cells];
    }
  }
  return [];
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .c3-wrap { display:flex; gap:26px; flex-wrap:wrap; align-items:flex-start; margin-top:14px; }
    .c3-board { position:relative; padding:10px; background:var(--panel); border:1px solid var(--border); border-radius:14px; }
    .c3-grid { display:grid; gap:8px; position:relative; }
    .c3-cell { width:56px; height:56px; border-radius:50%; cursor:pointer; position:relative;
      background:radial-gradient(circle at 32% 30%, color-mix(in srgb,var(--panel-2) 60%,#000), var(--panel-2));
      border:2px solid var(--border); transition:transform .12s, box-shadow .2s; }
    .c3-cell:hover { transform:scale(1.06); border-color:var(--accent); }
    .c3-cell.R { background:radial-gradient(circle at 32% 28%, #ff8a80, var(--danger)); border-color:color-mix(in srgb,var(--danger) 70%,#000); }
    .c3-cell.Y { background:radial-gradient(circle at 32% 28%, #ffe08a, var(--warn)); border-color:color-mix(in srgb,var(--warn) 70%,#000); }
    .c3-cell.scan { box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 55%,transparent); }
    .c3-cell.win { box-shadow:0 0 0 4px #fff, 0 0 22px 4px currentColor; z-index:2; animation:c3Pulse 1.1s ease-in-out infinite; }
    .c3-cell.win.R { color:var(--danger); } .c3-cell.win.Y { color:var(--warn); }
    @keyframes c3Pulse { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.09); } }
    .c3-svg { position:absolute; inset:0; pointer-events:none; z-index:1; overflow:visible; }
    .c3-side { min-width:180px; }
    .c3-verdict { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .c3-hint { font:12px var(--mono); color:var(--muted); margin-top:10px; line-height:1.6; }
    .c3-ret { font:13px var(--mono); color:var(--text); background:#0a0e14; border:1px solid var(--border);
      border-radius:8px; padding:9px 11px; margin-top:8px; word-break:break-word; }
    .c3-ret .t.R { color:var(--danger); font-weight:800; } .c3-ret .t.Y { color:var(--warn); font-weight:800; }
    .c3-legend { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
    .c3-key { display:flex; align-items:center; gap:6px; font:12px var(--mono); color:var(--muted); }
    .c3-dot { width:16px; height:16px; border-radius:50%; border:2px solid var(--border); }
    .c3-dot.R { background:var(--danger); } .c3-dot.Y { background:var(--warn); }
  `));
}

function mount(host) {
  ensureStyle();
  let board = PRESETS[0].board.map((r) => [...r]);
  const R = board.length, C = board[0].length;
  const CELL = 56, GAP = 8, PAD = 10;

  const chips = el("div", "controls");
  PRESETS.forEach((p, i) => {
    const c = el("button", "chip", p.label);
    c.onclick = () => { board = p.board.map((r) => [...r]); [...chips.children].forEach((x, xi) => x.classList.toggle("on", xi === i)); render(); };
    if (i === 0) c.classList.add("on");
    chips.append(c);
  });

  const wrap = el("div", "c3-wrap");
  const boardBox = el("div", "c3-board");
  const grid = el("div", "c3-grid");
  grid.style.gridTemplateColumns = `repeat(${C}, ${CELL}px)`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "c3-svg");
  boardBox.append(grid, svg);

  const side = el("div", "c3-side");
  wrap.append(boardBox, side);
  host.append(chips, wrap);

  const cellCenter = (r, c) => [PAD + c * (CELL + GAP) + CELL / 2, PAD + r * (CELL + GAP) + CELL / 2];

  function render() {
    const res = connectThree(board);
    const winner = res.length ? res[0] : "";
    const winSet = new Set(res.slice(1).map(([r, c]) => r + "," + c));

    grid.innerHTML = "";
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const v = board[r][c];
      const cell = el("div", "c3-cell" + (v ? " " + v : "") + (winSet.has(r + "," + c) ? " win" : ""));
      cell.onclick = () => { board[r][c] = v === "" ? "R" : v === "R" ? "Y" : ""; render(); };
      grid.append(cell);
    }

    // winning line
    svg.innerHTML = "";
    if (res.length) {
      const [, a, , cc] = res;
      const [x1, y1] = cellCenter(a[0], a[1]);
      const [x2, y2] = cellCenter(cc[0], cc[1]);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("stroke", winner === "R" ? "#f85149" : "#d29922");
      line.setAttribute("stroke-width", "7"); line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.9");
      svg.append(line);
    }

    side.innerHTML = "";
    const verdict = el("div", "c3-verdict");
    if (res.length) {
      const badge = el("span", "badge ok", "Connect three!");
      verdict.append(badge);
    } else {
      verdict.append(el("span", "badge no", "No triple"));
    }
    side.append(verdict);

    const ret = el("div", "c3-ret");
    if (res.length) {
      ret.innerHTML = `[<span class="t ${winner}">"${winner}"</span>, ` +
        res.slice(1).map(([r, c]) => `[${r},${c}]`).join(", ") + `]`;
    } else {
      ret.textContent = "[]";
    }
    side.append(ret);

    const legend = el("div", "c3-legend");
    legend.innerHTML = `<span class="c3-key"><span class="c3-dot R"></span>R</span>
      <span class="c3-key"><span class="c3-dot Y"></span>Y</span>
      <span class="c3-key"><span class="c3-dot"></span>empty</span>`;
    side.append(legend);

    side.append(el("div", "c3-hint", "Click any cell to cycle empty → R → Y. The scan checks four directions (→ ↓ ↘ ↙) from every filled cell and returns the first triple, top-to-bottom then left-to-right."));
  }
  render();
}

const CODE = `function connectThree(matrix: string[][]): (string | number[])[] {
  const R = matrix.length, C = matrix[0].length;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];   // →  ↓  ↘  ↙
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const v = matrix[r][c];
    if (v === "") continue;
    for (const [dr, dc] of dirs) {
      const cells: number[][] = [[r, c]];
      let ok = true;
      for (let k = 1; k < 3; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || matrix[nr][nc] !== v) { ok = false; break; }
        cells.push([nr, nc]);
      }
      if (ok) return [v, ...cells];
    }
  }
  return [];
}`;

// ── STEP — line-by-line debugger of connectThree (shared mountDebugger) ──────
// Single call frame (nested loops, no recursion). A numeric preset-index picks
// one of four small 3×3 boards so the scan stays a few dozen steps, not hundreds.
// Invented 3×3 boards, NOT the official set — a trace of an official 4×4 board runs
// to hundreds of steps. Every official board is a preset on the solution demo above.
const CASES = [
  { label: "row of three", board: [["R", "R", "R"], ["", "", ""], ["", "", ""]] },
  { label: "column of three", board: [["", "Y", ""], ["", "Y", ""], ["", "Y", ""]] },
  { label: "diagonal ↘", board: [["R", "", ""], ["", "R", ""], ["", "", "R"]] },
  { label: "no run — returns []", board: [["R", "", "Y"], ["", "Y", ""], ["R", "", "R"]] },
];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">connectThree</span>(matrix) {` },
  { ln: 2,  html: `  <span class="k">const</span> R = matrix.length, C = matrix[0].length;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> r = 0; <span class="tok" data-t="rcond">r &lt; R</span>; r++) <span class="k">for</span> (<span class="k">let</span> c = 0; <span class="tok" data-t="ccond">c &lt; C</span>; c++) {` },
  { ln: 4,  html: `    <span class="k">const</span> v = <span class="tok" data-t="read">matrix[r][c]</span>;` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="empty">v === ""</span>) <span class="k">continue</span>;` },
  { ln: 6,  html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="dir">[dr, dc]</span> <span class="k">of</span> dirs) {` },
  { ln: 7,  html: `      <span class="k">const</span> <span class="tok" data-t="seed">cells = [[r, c]]</span>; <span class="k">let</span> ok = <span class="k">true</span>;` },
  { ln: 8,  html: `      <span class="k">for</span> (<span class="k">let</span> k = 1; <span class="tok" data-t="kcond">k &lt; 3</span>; k++) {` },
  { ln: 9,  html: `        <span class="k">const</span> <span class="tok" data-t="probe">nr = r + dr * k, nc = c + dc * k</span>;` },
  { ln: 10, html: `        <span class="k">if</span> (<span class="tok" data-t="bounds">nr &lt; 0 || nr &gt;= R || nc &lt; 0 || nc &gt;= C || matrix[nr][nc] !== v</span>) { ok = <span class="k">false</span>; <span class="k">break</span>; }` },
  { ln: 11, html: `        <span class="tok" data-t="push">cells.<span class="fn">push</span>([nr, nc])</span>;` },
  { ln: 12, html: `      }` },
  { ln: 13, html: `      <span class="k">if</span> (<span class="tok" data-t="okret">ok</span>) <span class="k">return</span> [v, ...cells];` },
  { ln: 14, html: `    }` },
  { ln: 15, html: `  }` },
  { ln: 16, html: `  <span class="k">return</span> [];` },
  { ln: 17, html: `}` },
];

// Instrumented run → generic debugger steps. ONE frame (nested loops, no
// recursion). A variable is included only while it is in scope, so `v` appears
// when read and vanishes at the next cell, `dr/dc` live only inside the direction
// loop, and `nr/nc` only while probing. `cells` renders as the growing run.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const cs = CASES[idx] || CASES[0];
  const matrix = cs.board;
  const R = matrix.length, C = matrix[0].length;
  const steps = [];
  const arrow = (dr, dc) => (dr === 0 && dc === 1) ? "→ right" : (dr === 1 && dc === 0) ? "↓ down"
    : (dr === 1 && dc === 1) ? "↘ down-right" : "↙ down-left";
  const q = (x) => x === "" ? `""` : `"${x}"`;
  const live = {};       // vars currently in scope in the single frame
  let cells = null;      // the run being built (null when out of scope)
  const snap = (line, o = {}) => {
    const vars = {}; for (const k in live) vars[k] = live[k];
    const structs = cells ? [{ label: "cells (the run)", items: cells.map(([rr, cc]) => `[${rr},${cc}]`), newest: !!o.cellNew }] : [];
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: "connectThree(board)", vars, changed: o.changed || [], structs, ret: o.ret }] });
  };

  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label}.</b> Call connectThree — we sweep every filled cell of this ${R}×${C} board looking for a same-colour run of three.` });
  live.R = R; live.C = C;
  snap(2, { note: `Record the board's shape: <b>R = ${R}</b> rows, <b>C = ${C}</b> columns — used later to test whether a probe stays on the board.`, changed: ["R", "C"] });

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      live.cell = `[${r},${c}]`;
      snap(3, { note: `Advance the scan to cell <b>${live.cell}</b> — row-major order (left→right, then down a row) guarantees we find the top-left-most triple first.`, focus: "ccond", changed: ["cell"] });
      const v = matrix[r][c];
      live.v = q(v);
      snap(4, { note: `Read the colour sitting at ${live.cell}: <b>${q(v)}</b>.`, focus: "read", changed: ["v"] });
      const isEmpty = v === "";
      snap(5, { note: `Is the cell empty? A run can only start on a filled cell.`, focus: "empty", eval: { expr: `${q(v)} === ""`, val: isEmpty } });
      if (isEmpty) {
        snap(5, { note: `Empty — nothing to build a run from here. <b>continue</b> to the next cell.`, focus: "empty" });
        delete live.v;
        continue;
      }
      let found = false;
      for (const [dr, dc] of DIRS) {
        live.dir = arrow(dr, dc);
        snap(6, { note: `Look outward from ${live.cell} in direction <b>${arrow(dr, dc)}</b>. Only four directions are scanned — sweeping every cell already covers the reverse three.`, focus: "dir", changed: ["dir"] });
        cells = [[r, c]];
        live.run = cells.length; live.ok = true;
        snap(7, { note: `Seed the run with the cell itself, then trust it (<b>ok = true</b>) until a probe proves otherwise.`, focus: "seed", changed: ["run", "ok"], cellNew: true });
        let ok = true;
        let k = 1;
        for (;;) {
          const kc = k < 3;
          snap(8, { note: kc
              ? `We need three in a row — take probe step <b>k = ${k}</b>.`
              : `The run already holds three cells (k reached 3) — stop probing this direction.`,
            focus: "kcond", eval: { expr: `k = ${k} < 3`, val: kc } });
          if (!kc) break;
          const nr = r + dr * k, nc = c + dc * k;
          live.probe = `[${nr},${nc}]`;
          snap(9, { note: `The cell ${k} step(s) along ${arrow(dr, dc)} is <b>${live.probe}</b>.`, focus: "probe", changed: ["probe"] });
          const oob = nr < 0 || nr >= R || nc < 0 || nc >= C;
          const nv = oob ? null : matrix[nr][nc];
          const cont = !oob && nv === v;
          snap(10, { note: oob
              ? `${live.probe} falls off the board — this direction can't reach three.`
              : `Does the neighbour match the run's colour? ${q(nv)} ${nv === v ? "===" : "!=="} ${q(v)}.`,
            focus: "bounds", eval: { expr: oob ? `${live.probe} off board` : `${q(nv)} === ${q(v)}`, val: cont } });
          if (!cont) {
            ok = false; live.ok = false;
            snap(10, { note: oob
                ? `Off the board — set <b>ok = false</b> and <b>break</b> out of this direction.`
                : `Colour mismatch — set <b>ok = false</b> and <b>break</b> out of this direction.`,
              focus: "bounds", changed: ["ok"] });
            break;
          }
          cells.push([nr, nc]);
          live.run = cells.length;
          snap(11, { note: `It matches — <b>push</b> ${live.probe} onto the run, now <b>${cells.length}</b> long.`, focus: "push", changed: ["run"], cellNew: true });
          k++;
        }
        delete live.probe;
        snap(13, { note: `Direction ${arrow(dr, dc)} done — did every probe hold? <b>ok</b> decides whether this is a winning triple.`, focus: "okret", eval: { expr: `ok`, val: ok } });
        if (ok) {
          const result = `["${v}", ${cells.map(([rr, cc]) => `[${rr},${cc}]`).join(", ")}]`;
          snap(13, { note: `Three <b>${q(v)}</b>'s line up! <b>Return</b> ${result} — the first match wins, so the whole scan stops here.`, focus: "okret", done: true, result, ret: { value: result } });
          found = true;
          break;
        }
        cells = null;
        delete live.run; delete live.ok; delete live.dir;
      }
      if (found) return steps;
      delete live.v;
    }
  }
  delete live.cell;
  snap(16, { note: `Every filled cell was probed in all four directions and no three-in-a-row appeared. <b>Return []</b>.`, done: true, result: `[]`, ret: { value: `[]` } });
  return steps;
}

export default {
  n: 322, id: "connect3", title: "Connect Three", dates: ["2026-06-28"],
  statement: `Given a matrix of <code class="inl">"R"</code>, <code class="inl">"Y"</code>, <code class="inl">""</code> cells, find any three-in-a-row (horizontal, vertical, or either diagonal) of the same non-empty type. Return <code class="inl">[type, [r,c], [r,c], [r,c]]</code> with cells ordered top-to-bottom then left-to-right, or <code class="inl">[]</code>. Example: a board whose bottom row is <code class="inl">Y R R R</code> → <code class="inl">["R",[3,1],[3,2],[3,3]]</code>.`,
  variants: [
    { name: "Solution", cost: "O(R·C)",
      approach: `From every filled cell, look 3 deep along four directions — right, down, and both diagonals. Only four are needed because scanning every cell already covers the reverse directions. First match wins; scan order (row-major) guarantees the top-left-most triple.`,
      code: CODE, mount },
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for the solution — watch the scan visit each cell, seed a run, then probe up to two cells along a direction, growing <code class='inl'>cells</code> until three of one colour line up or a probe falls off the board / hits a different colour. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick an example` } }) },
  ],
};
