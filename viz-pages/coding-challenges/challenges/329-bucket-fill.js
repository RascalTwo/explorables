// #329 · Bucket Fill — paint-bucket flood fill over a 4-connected region.
// Solution: a live colour grid — pick a fill colour, click a cell, and watch
// the fill spread BFS-style to every same-valued neighbour. Step: the BFS
// traced line-by-line, the queue growing and draining as cells are recoloured.
import { el, mountDebugger } from "../shared.js";

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   // up, down, left, right
const PALETTE = ["R", "G", "B", "Y", "O", "P", "T"];
const COLOR = { R: "#f85149", G: "#3fb950", B: "#58a6ff", Y: "#d29922", O: "#ff9f45", P: "#bc8cff", T: "#39c5cf" };

const PRESETS = [
  { label: "stripes", grid: [["Y", "G", "G"], ["Y", "Y", "Y"], ["B", "Y", "R"]] },
  { label: "ring", grid: [["O", "O", "P"], ["P", "O", "O"], ["P", "P", "O"]] },
  { label: "checker", grid: [["G", "B", "G", "B"], ["R", "B", "B", "G"], ["B", "G", "B", "R"], ["B", "G", "G", "B"]] },
  { label: "bars", grid: [["T", "T", "R", "T"], ["R", "T", "R", "T"], ["R", "T", "R", "T"], ["T", "T", "T", "T"]] },
];

// The algorithm under test — mutates a copy and returns it.
function bucketFill(grid, [row, col], newValue) {
  const target = grid[row][col];
  if (target === newValue) return grid;              // guard: no-op, avoids looping forever
  const R = grid.length, C = grid[0].length;
  const queue = [[row, col]];
  grid[row][col] = newValue;
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
      if (grid[nr][nc] === target) { grid[nr][nc] = newValue; queue.push([nr, nc]); }
    }
  }
  return grid;
}

// BFS visitation order from a seed, used to animate the spread.
function fillOrder(grid, sr, sc, newVal) {
  const target = grid[sr][sc];
  if (target === newVal) return { order: [], target };
  const R = grid.length, C = grid[0].length;
  const seen = new Set([sr + "," + sc]);
  const order = [], q = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.shift();
    order.push([r, c]);
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc, key = nr + "," + nc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen.has(key)) continue;
      if (grid[nr][nc] === target) { seen.add(key); q.push([nr, nc]); }
    }
  }
  return { order, target };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bf-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
    .bf-row .lab { font:600 12px var(--sans); color:var(--muted); }
    .bf-swatch { width:30px; height:30px; border-radius:8px; border:2px solid var(--border); cursor:pointer;
                 display:flex; align-items:center; justify-content:center; font:800 13px var(--mono); color:#0a0e14; transition:transform .1s; }
    .bf-swatch:hover { transform:scale(1.1); }
    .bf-swatch.on { border-color:#fff; box-shadow:0 0 0 2px var(--accent); }
    .bf-mode { display:inline-flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    .bf-mode button { font:700 12px var(--sans); background:var(--panel-2); border:0; padding:6px 12px; cursor:pointer; color:var(--muted); }
    .bf-mode button.on { background:var(--accent); color:var(--bg); }
    .bf-grid { display:grid; gap:6px; margin:14px 0; width:max-content; }
    .bf-cell { width:44px; height:44px; border-radius:8px; border:2px solid rgba(0,0,0,.25); cursor:pointer;
               display:flex; align-items:center; justify-content:center; font:800 16px var(--mono); color:#0a0e14;
               transition:transform .1s; }
    .bf-cell:hover { transform:scale(1.07); border-color:#fff; }
    .bf-cell.seed { box-shadow:0 0 0 3px #fff, 0 0 14px 2px var(--accent); z-index:2; }
    .bf-cell.fresh { animation:bfPop .4s cubic-bezier(.2,1.4,.4,1); }
    @keyframes bfPop { 0%{ transform:scale(.35); } 100%{ transform:scale(1); } }
    .bf-info { font:13px var(--mono); color:var(--text); background:#0a0e14; border:1px solid var(--border);
               border-radius:8px; padding:9px 12px; max-width:440px; line-height:1.55; }
    .bf-info b { color:var(--accent); }
  `));
}

function mount(host) {
  ensureStyle();
  let grid = PRESETS[0].grid.map((r) => [...r]);
  let fill = "B";
  let mode = "seed";

  const stopAnim = () => { if (host.__bfTimer) { clearInterval(host.__bfTimer); host.__bfTimer = null; } };

  const presetRow = el("div", "bf-row");
  presetRow.append(el("span", "lab", "grid"));
  PRESETS.forEach((p, i) => {
    const c = el("button", "chip" + (i === 0 ? " on" : ""), p.label);
    c.onclick = () => { stopAnim(); grid = p.grid.map((r) => [...r]); [...presetRow.querySelectorAll(".chip")].forEach((x, xi) => x.classList.toggle("on", xi === i)); paint(); };
    presetRow.append(c);
  });

  const palRow = el("div", "bf-row");
  palRow.append(el("span", "lab", "fill with"));
  PALETTE.forEach((v) => {
    const s = el("div", "bf-swatch" + (v === fill ? " on" : ""), v); s.style.background = COLOR[v];
    s.onclick = () => { fill = v; [...palRow.querySelectorAll(".bf-swatch")].forEach((x) => x.classList.toggle("on", x.textContent === v)); };
    palRow.append(s);
  });

  const modeRow = el("div", "bf-row");
  modeRow.append(el("span", "lab", "click a cell to"));
  const modeBox = el("div", "bf-mode");
  const bSeed = el("button", "on", "flood-fill"), bPaint = el("button", null, "paint one");
  bSeed.onclick = () => { mode = "seed"; bSeed.classList.add("on"); bPaint.classList.remove("on"); };
  bPaint.onclick = () => { mode = "paint"; bPaint.classList.add("on"); bSeed.classList.remove("on"); };
  modeBox.append(bSeed, bPaint);
  modeRow.append(modeBox);

  const gridBox = el("div", "bf-grid");
  const info = el("div", "bf-info");
  host.append(presetRow, palRow, modeRow, gridBox, info);

  function paint(x = {}) {
    gridBox.innerHTML = "";
    gridBox.style.gridTemplateColumns = `repeat(${grid[0].length}, 44px)`;
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
      const v = grid[r][c], key = r + "," + c;
      const cell = el("div", "bf-cell" + (x.seed === key ? " seed" : "") + (x.fresh === key ? " fresh" : ""), v);
      cell.style.background = COLOR[v] || "var(--panel-2)";
      cell.onclick = () => cellClick(r, c);
      gridBox.append(cell);
    }
    if (x.guard) info.innerHTML = `Cell <b>[${x.seed}]</b> is already <b>"${fill}"</b> — target equals the new value, so <code class="inl">bucketFill</code> returns immediately (the guard that stops an infinite loop).`;
    else if (x.done) info.innerHTML = `Flood-filled <b>${x.count}</b> connected cell${x.count === 1 ? "" : "s"} of region <b>"${x.target}"</b> with <b>"${fill}"</b>.`;
    else info.innerHTML = mode === "seed"
      ? `Pick a fill colour above, then click any cell — the fill spreads to every cell 4-connected to it that shares its value.`
      : `Paint mode: click a cell to set it to <b>"${fill}"</b> and design your own grid, then switch back to flood-fill.`;
  }

  function cellClick(r, c) {
    if (mode === "paint") { stopAnim(); grid[r][c] = fill; paint(); return; }
    stopAnim();
    const seedKey = r + "," + c, target = grid[r][c];
    if (target === fill) { paint({ seed: seedKey, guard: true }); return; }
    const { order } = fillOrder(grid, r, c, fill);
    let k = 0;
    host.__bfTimer = setInterval(() => {
      if (k >= order.length) { stopAnim(); paint({ seed: seedKey, done: true, count: order.length, target }); return; }
      const [rr, cc] = order[k]; grid[rr][cc] = fill; k++;
      paint({ seed: seedKey, fresh: rr + "," + cc });
    }, 150);
  }

  paint();
}

// ── Brute: no queue — sweep the whole grid until a pass changes nothing ──────
// The beginner's flood fill: mark the seed, then scan the ENTIRE grid over and
// over. Each pass repaints any target cell touching a cell WE already filled
// (a `filled` marker, not the fill colour — else it leaks into unrelated regions
// that share the colour); stop when a full pass paints nothing. A winding region
// costs many passes — the pass count next to BFS's "touch each cell once" is the lesson.
function mountBrute(host) {
  ensureStyle();
  let grid = PRESETS[3].grid.map((r) => [...r]);   // "bars" — the T region winds up each column against scan order
  let fill = "B";                                   // a colour absent from the grids → the spread stands out from any bars

  const stopAnim = () => { if (host.__bfTimer) { clearInterval(host.__bfTimer); host.__bfTimer = null; } };

  const presetRow = el("div", "bf-row");
  presetRow.append(el("span", "lab", "grid"));
  PRESETS.forEach((p, i) => {
    const c = el("button", "chip" + (i === 3 ? " on" : ""), p.label);
    c.onclick = () => { stopAnim(); grid = p.grid.map((r) => [...r]); [...presetRow.querySelectorAll(".chip")].forEach((x, xi) => x.classList.toggle("on", xi === i)); paint(); };
    presetRow.append(c);
  });

  const palRow = el("div", "bf-row");
  palRow.append(el("span", "lab", "fill with"));
  PALETTE.forEach((v) => {
    const s = el("div", "bf-swatch" + (v === fill ? " on" : ""), v); s.style.background = COLOR[v];
    s.onclick = () => { fill = v; [...palRow.querySelectorAll(".bf-swatch")].forEach((x) => x.classList.toggle("on", x.textContent === v)); };
    palRow.append(s);
  });

  const gridBox = el("div", "bf-grid");
  const info = el("div", "bf-info");
  host.append(presetRow, palRow, el("div", "bf-row", `<span class="lab">click any cell to flood it — watch the passes</span>`), gridBox, info);

  function paint(x = {}) {
    gridBox.innerHTML = "";
    gridBox.style.gridTemplateColumns = `repeat(${grid[0].length}, 44px)`;
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
      const v = grid[r][c], key = r + "," + c;
      const cell = el("div", "bf-cell" + (x.seed === key ? " seed" : "") + ((x.fresh || []).includes(key) ? " fresh" : ""), v);
      cell.style.background = COLOR[v] || "var(--panel-2)";
      cell.onclick = () => cellClick(r, c);
      gridBox.append(cell);
    }
    info.innerHTML = x.html || `The dumb flood fill: <b>no queue</b>. Repaint the clicked cell, then sweep the whole grid over and over — each pass repaints any target cell touching an already-filled one — until a full pass changes nothing.`;
  }

  function cellClick(r, c) {
    stopAnim();
    const seedKey = r + "," + c, target = grid[r][c];
    if (target === fill) { paint({ seed: seedKey, html: `Cell <b>[${seedKey}]</b> is already <b>"${fill}"</b> — nothing to do (same guard as the BFS version).` }); return; }
    const R = grid.length, C = grid[0].length;
    const g = grid.map((row) => [...row]);          // work on a copy so we can animate the real grid
    const filled = new Set([seedKey]);              // cells WE painted — not just anything already the fill colour
    g[r][c] = fill;
    const passes = [{ painted: [seedKey] }];        // pass 0 = repaint the seed
    let changed = true, exams = 0;
    while (changed) {
      changed = false;
      const painted = [];
      for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) {
        exams++;
        if (g[rr][cc] !== target) continue;         // not part of the region we're filling
        const adj = DIRS.some(([dr, dc]) => { const nr = rr + dr, nc = cc + dc; return nr >= 0 && nr < R && nc >= 0 && nc < C && filled.has(nr + "," + nc); });
        if (adj) { const k = rr + "," + cc; g[rr][cc] = fill; filled.add(k); painted.push(k); changed = true; }
      }
      if (painted.length) passes.push({ painted });
    }
    const sweeps = passes.length - 1;               // productive sweeps (exclude the seed)
    const cells = R * C;

    let p = 0;
    const step = () => {
      if (p >= passes.length) {
        stopAnim();
        paint({ seed: seedKey, html: `Stable after <b>${sweeps}</b> sweep${sweeps === 1 ? "" : "s"}. This naive fill examined <b>${exams}</b> cells in total; a BFS queue would visit each of the grid's <b>${cells}</b> cells about once. The more a region winds back on itself, the more full sweeps it costs — that gap is why the real solution uses a queue.` });
        return;
      }
      passes[p].painted.forEach((k) => { const [rr, cc] = k.split(",").map(Number); grid[rr][cc] = fill; });
      const n = passes[p].painted.length;
      paint({ seed: seedKey, fresh: passes[p].painted,
        html: p === 0
          ? `Pass 0 — repaint the clicked seed to <b>"${fill}"</b>, then start sweeping.`
          : `Pass <b>${p}</b> — swept the whole grid, repainted <b>${n}</b> cell${n === 1 ? "" : "s"}. Keep sweeping while a pass still changes something.` });
      p++;
    };
    step();                                          // seed immediately
    host.__bfTimer = setInterval(step, 650);
  }

  paint();
}

// ── STEP — the BFS flood fill, line by line (single frame, a live queue) ─────
// A numeric case-index picks one of four small scenarios so the BFS stays a few
// dozen steps. The queue struct grows on push and drains on shift.
const CASES = [
  { label: "2×2 · fill \"R\" with \"B\"", grid: [["R", "G"], ["R", "G"]], seed: [0, 1], nv: "B" },
  { label: "3×3 stripes · fill \"Y\" with \"B\"", grid: [["Y", "G", "G"], ["Y", "Y", "Y"], ["B", "Y", "R"]], seed: [1, 2], nv: "B" },
  { label: "3×3 ring · fill \"P\" with \"R\"", grid: [["O", "O", "P"], ["P", "O", "O"], ["P", "P", "O"]], seed: [2, 0], nv: "R" },
  { label: "guard · fill \"R\" with \"R\"", grid: [["R", "G"], ["R", "G"]], seed: [0, 0], nv: "R" },
];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, [<span class="tok" data-t="rc">row, col</span>], <span class="tok" data-t="nv">newValue</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> target = <span class="tok" data-t="target">grid[row][col]</span>;` },
  { ln: 3,  html: `  <span class="k">if</span> (<span class="tok" data-t="guard">target === newValue</span>) <span class="k">return</span> grid;` },
  { ln: 4,  html: `  <span class="k">const</span> R = grid.length, C = grid[0].length;` },
  { ln: 5,  html: `  <span class="k">const</span> <span class="tok" data-t="seed">queue = [[row, col]]</span>;` },
  { ln: 6,  html: `  grid[row][col] = newValue;` },
  { ln: 7,  html: `  <span class="k">while</span> (<span class="tok" data-t="wcond">queue.length</span>) {` },
  { ln: 8,  html: `    <span class="k">const</span> [r, c] = <span class="tok" data-t="shift">queue.shift()</span>;` },
  { ln: 9,  html: `    <span class="k">for</span> (<span class="k">const</span> [dr, dc] <span class="k">of</span> dirs) {` },
  { ln: 10, html: `      <span class="k">const</span> nr = r + dr, nc = c + dc;` },
  { ln: 11, html: `      <span class="k">if</span> (<span class="tok" data-t="bounds">off the board</span>) <span class="k">continue</span>;` },
  { ln: 12, html: `      <span class="k">if</span> (<span class="tok" data-t="match">grid[nr][nc] === target</span>) {` },
  { ln: 13, html: `        grid[nr][nc] = newValue; <span class="tok" data-t="push">queue.<span class="fn">push</span>([nr, nc])</span>;` },
  { ln: 14, html: `      }` },
  { ln: 15, html: `    }` },
  { ln: 16, html: `  }` },
  { ln: 17, html: `  <span class="k">return</span> grid;` },
  { ln: 18, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const cs = CASES[idx];
  const grid = cs.grid.map((r) => [...r]);
  const [row, col] = cs.seed, nv = cs.nv;
  const R = grid.length, C = grid[0].length;
  const steps = [];
  const live = {};
  let queue = [];
  const boxes = () => queue.map(([r, c]) => `[${r},${c}]`);
  const snap = (line, o = {}) => {
    const vars = {}; for (const k in live) vars[k] = live[k];
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: "bucketFill(grid, seed, nv)", vars, changed: o.changed || [],
        structs: [{ label: "queue", items: boxes(), newest: !!o.qNew }], ret: o.ret }] });
  };

  live.seed = `[${row},${col}]`; live.newValue = `"${nv}"`;
  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label}.</b> Call bucketFill on a ${R}×${C} grid, seed <b>[${row},${col}]</b>, new value <b>"${nv}"</b>.`, focus: "rc" });
  const target = grid[row][col];
  live.target = `"${target}"`;
  snap(2, { note: `Read the colour at the seed: <b>target = "${target}"</b> — every cell 4-connected to the seed that also holds "${target}" gets repainted.`, focus: "target", changed: ["target"] });

  const isGuard = target === nv;
  snap(3, { note: `Guard: is the target already the new value? <b>"${target}" === "${nv}"</b>.`, focus: "guard", eval: { expr: `"${target}" === "${nv}"`, val: isGuard } });
  if (isGuard) {
    snap(3, { note: `They match — repainting would spin forever (the seed never stops matching). <b>Return the grid unchanged.</b>`, focus: "guard", done: true, result: "grid (unchanged)", ret: { value: "grid" } });
    return steps;
  }

  live.R = R; live.C = C;
  snap(4, { note: `Grid shape: <b>${R}</b> rows × <b>${C}</b> cols — used to keep neighbour probes on the board.`, changed: ["R", "C"] });
  queue = [[row, col]];
  snap(5, { note: `Seed the BFS <b>queue</b> with the start cell.`, focus: "seed", changed: [], qNew: true });
  grid[row][col] = nv;
  snap(6, { note: `Repaint the seed to <b>"${nv}"</b> right away — that also marks it visited, so it is never re-queued.` });

  while (queue.length) {
    snap(7, { note: `Queue holds <b>${queue.length}</b> cell${queue.length === 1 ? "" : "s"} — keep going while it is non-empty.`, focus: "wcond", eval: { expr: `queue.length = ${queue.length}`, val: true } });
    const [r, c] = queue.shift();
    live.cell = `[${r},${c}]`;
    snap(8, { note: `Dequeue the front cell: <b>[${r},${c}]</b>. Visit its four neighbours.`, focus: "shift", changed: ["cell"] });
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      live.nb = `[${nr},${nc}]`;
      snap(10, { note: `Neighbour ${dr === -1 ? "above" : dr === 1 ? "below" : dc === -1 ? "left" : "right"}: <b>[${nr},${nc}]</b>.`, changed: ["nb"] });
      const oob = nr < 0 || nr >= R || nc < 0 || nc >= C;
      snap(11, { note: oob ? `<b>[${nr},${nc}]</b> is off the board — skip it.` : `<b>[${nr},${nc}]</b> is on the board.`, focus: "bounds", eval: { expr: oob ? `[${nr},${nc}] off board` : `[${nr},${nc}] on board`, val: !oob } });
      if (oob) continue;
      const cur = grid[nr][nc];
      const hit = cur === target;
      snap(12, { note: `Does the neighbour hold the target colour? <b>"${cur}" ${hit ? "===" : "!=="} "${target}"</b>.`, focus: "match", eval: { expr: `"${cur}" === "${target}"`, val: hit } });
      if (hit) {
        grid[nr][nc] = nv;
        queue.push([nr, nc]);
        snap(13, { note: `Match — repaint <b>[${nr},${nc}]</b> to "${nv}" and <b>push</b> it so its own neighbours get visited.`, focus: "push", changed: [], qNew: true });
      }
    }
    delete live.nb;
  }
  delete live.cell;
  snap(17, { note: `Queue drained — the whole connected region is repainted. <b>Return the grid.</b>`, done: true, result: "grid (filled)", ret: { value: "grid" } });
  return steps;
}

// ── STEP (sweep) — the brute "no queue" fill, line by line ───────────────────
// Paired with the "Sweep till stable" tab: watch the outer while(changed) loop
// re-scan the WHOLE grid pass after pass, repainting any target cell that touches
// a `filled` cell WE painted (seeded from the start — never colour-equality with
// newValue, which would leak into unrelated same-colour regions). The `filled`
// frontier and the pass counter are the stars. Tiny grids that wind against the
// row-major scan so it takes 2–3 productive sweeps to stabilise.
const CASES_SWEEP = [
  { label: "3×3 bar · winds up 1 column (2 sweeps)", grid: [["G", "R", "G"], ["G", "R", "G"], ["G", "R", "G"]], seed: [2, 1], nv: "B" },
  { label: "3×3 snake · fills up both sides (3 sweeps)", grid: [["R", "G", "R"], ["R", "G", "R"], ["R", "R", "R"]], seed: [2, 0], nv: "B" },
  { label: "guard · fill \"R\" with \"R\"", grid: [["R", "G"], ["R", "G"]], seed: [0, 0], nv: "R" },
];

const SRC_SWEEP = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, [<span class="tok" data-t="rc">row, col</span>], <span class="tok" data-t="nv">newValue</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> target = <span class="tok" data-t="target">grid[row][col]</span>;` },
  { ln: 3,  html: `  <span class="k">if</span> (<span class="tok" data-t="guard">target === newValue</span>) <span class="k">return</span> grid;` },
  { ln: 4,  html: `  <span class="k">const</span> R = grid.length, C = grid[0].length;` },
  { ln: 5,  html: `  <span class="k">const</span> <span class="tok" data-t="filled">filled</span> = all-false marker grid; filled[row][col] = true;  <span class="cm">// cells WE painted</span>` },
  { ln: 6,  html: `  grid[row][col] = <span class="tok" data-t="seed">newValue</span>;` },
  { ln: 7,  html: `  <span class="k">let</span> changed = <span class="k">true</span>, pass = 0;` },
  { ln: 8,  html: `  <span class="k">while</span> (<span class="tok" data-t="wcond">changed</span>) { changed = <span class="k">false</span>; pass++;` },
  { ln: 9,  html: `    <span class="k">for</span> (<span class="k">let</span> r = 0; r &lt; R; r++) <span class="k">for</span> (<span class="k">let</span> c = 0; c &lt; C; c++) {` },
  { ln: 10, html: `      <span class="k">if</span> (grid[r][c] !== target) <span class="k">continue</span>;  <span class="cm">// not this region</span>` },
  { ln: 11, html: `      <span class="k">const</span> touches = <span class="tok" data-t="touches">neighbour in filled?</span>;` },
  { ln: 12, html: `      <span class="k">if</span> (touches) { <span class="tok" data-t="paint">grid[r][c] = newValue</span>; filled[r][c] = <span class="k">true</span>; changed = <span class="k">true</span>; }` },
  { ln: 13, html: `    }` },
  { ln: 14, html: `  }` },
  { ln: 15, html: `  <span class="k">return</span> grid;` },
  { ln: 16, html: `}` },
];

function traceSweep(caseIndex) {
  const idx = Math.max(0, Math.min(CASES_SWEEP.length - 1, (caseIndex | 0) - 1));
  const cs = CASES_SWEEP[idx];
  const grid = cs.grid.map((r) => [...r]);
  const [row, col] = cs.seed, nv = cs.nv;
  const R = grid.length, C = grid[0].length;
  const steps = [];
  const live = {};
  const filled = new Set();
  const filledList = [];                       // painted coords, in paint order
  const gridRows = () => grid.map((r) => r.join(" "));
  const snap = (line, o = {}) => {
    const vars = {}; for (const k in live) vars[k] = live[k];
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: "bucketFill(grid, seed, nv)", vars, changed: o.changed || [],
        structs: [
          { label: "grid", items: gridRows() },
          { label: "filled", items: filledList.map((k) => `[${k}]`), newest: !!o.fNew },
        ], ret: o.ret }] });
  };

  live.seed = `[${row},${col}]`; live.newValue = `"${nv}"`;
  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label}.</b> The no-queue fill on a ${R}×${C} grid, seed <b>[${row},${col}]</b> → <b>"${nv}"</b>. Instead of a queue, re-scan the whole grid until a full pass changes nothing.`, focus: "rc" });
  const target = grid[row][col];
  live.target = `"${target}"`;
  snap(2, { note: `Read the seed colour: <b>target = "${target}"</b>. Every "${target}" cell 4-connected back to the seed will be repainted.`, focus: "target", changed: ["target"] });

  const isGuard = target === nv;
  snap(3, { note: `Guard: is the seed already the new value? <b>"${target}" === "${nv}"</b>.`, focus: "guard", eval: { expr: `"${target}" === "${nv}"`, val: isGuard } });
  if (isGuard) {
    snap(3, { note: `They match — sweeping would never settle (the seed always re-matches). <b>Return the grid unchanged.</b>`, focus: "guard", done: true, result: "grid (unchanged)", ret: { value: "grid" } });
    return steps;
  }

  live.R = R; live.C = C;
  snap(4, { note: `Grid shape: <b>${R}</b> rows × <b>${C}</b> cols — every sweep visits all ${R * C} cells.`, changed: ["R", "C"] });
  filled.add(`${row},${col}`); filledList.push(`${row},${col}`);
  snap(5, { note: `Make a <b>filled</b> marker — all false except the seed. This tracks cells <i>we</i> painted, so the adjacency test can't leak into an unrelated "${target}" region that merely shares the colour.`, focus: "filled", fNew: true });
  grid[row][col] = nv;
  snap(6, { note: `Repaint the seed to <b>"${nv}"</b> and mark it filled.`, focus: "seed" });
  live.pass = 0; live.changed = "true";
  snap(7, { note: `Prime <b>changed = true</b> so the loop runs at least once; <b>pass</b> counts sweeps.`, changed: ["pass", "changed"] });

  let changed = true, pass = 0;
  while (changed) {
    changed = false; pass++;
    live.pass = pass; live.changed = "false";
    snap(8, { note: `<b>Sweep #${pass}</b> — <code class="inl">changed</code> was true, so scan again. Reset <b>changed = false</b>, then walk every cell top-to-bottom, left-to-right.`, focus: "wcond", eval: { expr: `while (changed) → run sweep #${pass}`, val: true }, changed: ["pass", "changed"] });
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (grid[r][c] !== target) continue;      // non-target cells: skipped silently (line 10 `continue`)
      live.at = `[${r},${c}]`;
      const touches = DIRS.some(([dr, dc]) => { const nr = r + dr, nc = c + dc; return nr >= 0 && nr < R && nc >= 0 && nc < C && filled.has(`${nr},${nc}`); });
      snap(11, { note: `Cell <b>[${r},${c}]</b> still holds "${target}". Does any neighbour sit in <b>filled</b>? <b>${touches}</b>.`, focus: "touches", eval: { expr: `[${r},${c}] touches a filled cell`, val: touches }, changed: ["at"] });
      if (touches) {
        grid[r][c] = nv; filled.add(`${r},${c}`); filledList.push(`${r},${c}`); changed = true;
        live.changed = "true";
        snap(12, { note: `Yes — repaint <b>[${r},${c}]</b> to "${nv}", mark it filled, set <b>changed = true</b> (this sweep did something, so we'll sweep again).`, focus: "paint", changed: ["changed"], fNew: true });
      }
    }
  }
  delete live.at;
  live.changed = "false";
  snap(8, { note: `<b>Sweep #${pass}</b> repainted nothing, so <b>changed stayed false</b> and <code class="inl">while (changed)</code> stops. Stable after <b>${pass - 1}</b> productive sweep${pass - 1 === 1 ? "" : "s"} plus this confirming one.`, focus: "wcond", eval: { expr: `while (changed) → false`, val: false }, changed: ["changed"] });
  snap(15, { note: `The whole connected "${target}" region is now "${nv}" — <b>${filledList.length}</b> cell${filledList.length === 1 ? "" : "s"} filled. <b>Return the grid.</b>`, done: true, result: "grid (filled)", ret: { value: "grid" } });
  return steps;
}

export default {
  n: 329, id: "bucketfill", title: "Bucket Fill", dates: ["2026-07-05"],
  statement: `Given a 2D grid, a start position <code class="inl">[row, col]</code>, and a new value, replace the value at the start and every cell 4-connected (up/down/left/right, not diagonal) to it that shares that value. Return the updated grid — the classic paint-bucket flood fill. <span class="rule">Example: <code class="inl">bucketFill([["R","G"],["R","G"]], [0,1], "B")</code> → <code class="inl">[["R","B"],["R","B"]]</code>.</span>`,
  variants: [
    {
      name: "Sweep till stable", tone: "brute", cost: "O((R·C)²)",
      approach: `The beginner's flood fill with <b>no queue</b>. Mark the seed, then scan the <b>entire grid</b> repeatedly: on each pass, any target-coloured cell touching a cell we've already filled gets repainted too. Keep sweeping until a whole pass changes nothing. Correct — but a region that winds back on itself forces pass after pass, each re-scanning every cell. Try a far corner of <b>bars</b> to watch the sweeps stack up. (Note the <code class='inl'>filled</code> marker: testing "touches the fill <i>colour</i>" would wrongly leak into unrelated regions that happen to share it.)`,
      code: `function bucketFill(grid, [row, col], newValue) {
  const target = grid[row][col];
  if (target === newValue) return grid;
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const filled = grid.map(row => row.map(() => false)); // cells WE painted
  filled[row][col] = true;
  grid[row][col] = newValue;
  let changed = true;
  while (changed) {                 // keep sweeping until a pass does nothing
    changed = false;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (grid[r][c] !== target) continue;
      const touches = dirs.some(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nr < R && nc >= 0 && nc < C && filled[nr][nc];
      });
      if (touches) { grid[r][c] = newValue; filled[r][c] = true; changed = true; }
    }
  }
  return grid;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: sweep", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute sweep — watch the outer <code class='inl'>while (changed)</code> loop re-scan the <b>whole grid</b> pass after pass, and the <b>filled</b> frontier grow one ring per sweep. Each pass repaints any target cell that touches a cell <i>we</i> already filled; it takes a wasted final sweep (painting nothing) to prove the fill is stable. The <b>pass</b> counter is the lesson — a region that winds against the row-major scan costs a sweep per turn. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_SWEEP, trace: traceSweep, input: { label: "case =", value: 1, min: 1, max: CASES_SWEEP.length, presets: CASES_SWEEP.map((_, i) => i + 1), hint: `1–${CASES_SWEEP.length}: pick a scenario` } }),
    },
    {
      name: "BFS queue", tone: "opt", cost: "O(R·C)",
      approach: `Read the <b>target</b> colour at the seed. If it already equals the new value, return immediately — otherwise the seed would match forever. Otherwise BFS from the seed: repaint each dequeued cell, then enqueue any in-bounds neighbour still holding the target colour. Repainting on enqueue doubles as the visited-marker, so no cell is queued twice.`,
      code: `function bucketFill(grid: string[][], [row, col]: [number, number], newValue: string): string[][] {
  const target = grid[row][col];
  if (target === newValue) return grid;              // guard: no-op, avoids looping forever
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const queue: [number, number][] = [[row, col]];
  grid[row][col] = newValue;
  while (queue.length) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
      if (grid[nr][nc] === target) { grid[nr][nc] = newValue; queue.push([nr, nc]); }
    }
  }
  return grid;
}`,
      mount,
    },
    {
      name: "Step: bfs", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the BFS — watch the <b>queue</b> grow on each match and drain on each dequeue, while <code class='inl'>target</code>, <code class='inl'>newValue</code>, the current cell and each neighbour update in scope. Case 4 shows the guard: when target already equals the new value the function returns on line 3. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a scenario` } }),
    },
  ],
};
