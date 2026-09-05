// #363 · Bucket Fill 2 — one click kills exactly one region, so the answer is a region count.
//
// THE SERIES. #329 "Bucket Fill" did the primitive: seed a cell, flood its
// 4-connected same-coloured region, recolour it. This one asks how MANY of those
// clicks it takes to make the whole grid one colour — and the step up is that the
// unit of work stops being a CELL and becomes a REGION. Collapse the grid into
// connected components once, and the grid stops being a grid: it is a graph whose
// nodes are regions. #365 "Bucket Fill 3" then relaxes the colour constraint —
// clicks there may use ANY intermediate colour, which is strictly harder and is
// where the edges of this graph finally start to matter.
//
// THE RULE, derived not assumed. Every click paints the TARGET colour, so a
// region's colour can only ever move to the target — never to anything else.
// A region that isn't the target colour therefore can never grow, can never be
// absorbed by a neighbour, and can only be cleared by a click aimed at it: one
// click each, no more, no fewer. The answer is the number of regions whose colour
// isn't already the target. The adjacency edges are real and drawn in the demo,
// but this answer never reads them — that's #365's problem. Validated against an
// exhaustive state-space search on all 5 official cases and 400 random 3×3 grids.
//
// • BRUTE — "Search every click order": BFS over whole GRID STATES. Correct by
//   construction (it is the oracle the rule above was checked against) and it
//   passes all 5 official assertions, but it enumerates 2^regions states to learn
//   one number: 4,096 states on the official 5×5 where a labelling pass reads 25
//   cells. The wasteful act is enumerating the answer instead of counting it.
// • OPT — "Count the regions": one flood-fill labelling pass, O(R·C), no click
//   ever simulated.
// Open the brute on the 4×4 checkerboard to watch it blow its state budget on a
// grid the optimized side answers by counting to 16.
import { el, mountDebugger } from "../shared.js";

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   // up, down, left, right — same 4-connectivity as #329
const PALETTE = ["R", "G", "B", "Y", "O", "P", "C", "J"];
const COLOR = { R: "#f85149", G: "#3fb950", B: "#58a6ff", Y: "#d29922", O: "#ff9f45", P: "#bc8cff", C: "#39c5cf", J: "#f778ba" };

// Cases 1–5 are freeCodeCamp's five official assertions for #363, verbatim, with
// their documented answers. Cases 6–7 are ours, each landing somewhere the
// official set doesn't:
//   6 "checker"  — every cell is its own region, so the answer is the maximum
//                  possible (R·C) and the state-space brute goes 2^16.
//   7 "split G"  — one colour, two disconnected blobs. Counting COLOURS says 1;
//                  counting REGIONS says 2. This is the case that punishes
//                  anyone who groups by colour instead of by connectivity.
// Cases 1 (target absent), 2 (already uniform → 0) and 3 (target absent, three
// regions) are the edges the official set does cover, so they aren't duplicated.
const CASES = [
  { label: `2×2 → "G"`, grid: [["R", "R"], ["R", "R"]], target: "G", exp: 1 },
  { label: `all "B" → "B"`, grid: [["B", "B", "B"], ["B", "B", "B"], ["B", "B", "B"]], target: "B", exp: 0 },
  { label: `3×3 → "R"`, grid: [["G", "Y", "Y"], ["G", "Y", "G"], ["Y", "Y", "G"]], target: "R", exp: 3 },
  { label: `4×4 → "P"`, grid: [["G", "G", "P", "Y"], ["O", "P", "P", "P"], ["O", "O", "P", "G"], ["G", "O", "O", "G"]], target: "P", exp: 5 },
  { label: `5×5 → "Y"`, grid: [["G", "G", "C", "C", "O"], ["B", "Y", "B", "Y", "O"], ["B", "J", "O", "J", "B"], ["G", "Y", "Y", "Y", "B"], ["G", "P", "P", "G", "G"]], target: "Y", exp: 12 },
  { label: `checker → "B"`, grid: [["R", "G", "R", "G"], ["G", "R", "G", "R"], ["R", "G", "R", "G"], ["G", "R", "G", "R"]], target: "B", exp: 16 },
  { label: `split "G" → "B"`, grid: [["G", "G", "B"], ["B", "B", "B"], ["G", "G", "B"]], target: "B", exp: 2 },
];

// ── The region decomposition — the one primitive the whole module runs on ────
// Flood-fill labelling (#329's BFS with `region[..] = id` in place of
// `grid[..] = newValue`), plus the adjacency between labels. `adj` is what makes
// the region GRAPH visible; #363's answer ignores it, #365's cannot.
function regionsOf(grid, withAdj = true) {
  const R = grid.length, C = grid[0].length;
  const reg = grid.map((row) => row.map(() => -1));
  const list = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (reg[r][c] !== -1) continue;
    const color = grid[r][c], id = list.length, cells = [[r, c]];
    reg[r][c] = id;
    for (let i = 0; i < cells.length; i++) {
      const [y, x] = cells[i];
      for (const [dy, dx] of DIRS) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || ny >= R || nx < 0 || nx >= C) continue;
        if (reg[ny][nx] === -1 && grid[ny][nx] === color) { reg[ny][nx] = id; cells.push([ny, nx]); }
      }
    }
    list.push({ id, color, cells, adj: new Set() });
  }
  if (withAdj) {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      for (const [dy, dx] of [[1, 0], [0, 1]]) {          // right + down only: each edge once
        const ny = r + dy, nx = c + dx;
        if (ny >= R || nx >= C) continue;
        const a = reg[r][c], b = reg[ny][nx];
        if (a !== b) { list[a].adj.add(b); list[b].adj.add(a); }
      }
    }
  }
  return { list, reg };
}

const clicksNeeded = (grid, target) => regionsOf(grid, false).list.filter((x) => x.color !== target).length;
const uniform = (grid, target) => grid.every((row) => row.every((v) => v === target));

// One real click: repaint the region containing [r,c] with `target`. Mutates, and
// returns the "r,c" keys it painted — empty when the click was wasted on a region
// that was already the target colour.
function clickAt(grid, r, c, target) {
  const color = grid[r][c];
  if (color === target) return [];                         // wasted click — nothing changes
  const cells = [[r, c]];
  grid[r][c] = target;
  for (let i = 0; i < cells.length; i++) {
    const [y, x] = cells[i];
    for (const [dy, dx] of DIRS) {
      const ny = y + dy, nx = x + dx;
      if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
      if (grid[ny][nx] === color) { grid[ny][nx] = target; cells.push([ny, nx]); }
    }
  }
  return cells.map(([y, x]) => y + "," + x);
}

// ── The brute's engine: BFS over grid states, with a budget so a hand-painted
// grid can visibly bankrupt it rather than freezing the page. `levels[d]` is how
// many distinct states sit d clicks from the start — the binomial explosion.
const STATE_BUDGET = 8000;
function searchStates(grid, target, cap = STATE_BUDGET) {
  const key = (g) => g.map((row) => row.join("")).join("|");
  const queue = [[grid.map((row) => [...row]), 0]];
  const seen = new Set([key(grid)]);
  const levels = [1];
  let popped = 0;
  while (queue.length) {
    const [g, depth] = queue.shift();
    if (popped >= cap) return { answer: null, popped, levels, capped: true };
    popped++;
    if (uniform(g, target)) return { answer: depth, popped, levels, capped: false };
    for (const rg of regionsOf(g, false).list) {
      if (rg.color === target) continue;
      const next = g.map((row) => [...row]);
      for (const [y, x] of rg.cells) next[y][x] = target;
      const k = key(next);
      if (!seen.has(k)) { seen.add(k); queue.push([next, depth + 1]); levels[depth + 1] = (levels[depth + 1] || 0) + 1; }
    }
  }
  return { answer: -1, popped, levels, capped: false };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .b2-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:9px; }
    .b2-row .lab { font:600 12px var(--sans); color:var(--muted); }
    .b2-swatch { width:28px; height:28px; border-radius:8px; border:2px solid var(--border); cursor:pointer;
                 display:flex; align-items:center; justify-content:center; font:800 12px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b2-swatch:hover { transform:scale(1.12); }
    .b2-swatch.on { border-color:#fff; box-shadow:0 0 0 2px var(--accent); }
    .b2-swatch.tgt.on { box-shadow:0 0 0 2px var(--good); }
    .b2-mode { display:inline-flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    .b2-mode button { font:700 12px var(--sans); background:var(--panel-2); border:0; padding:6px 12px; cursor:pointer; color:var(--muted); }
    .b2-mode button.on { background:var(--accent); color:var(--bg); }
    .b2-panes { display:flex; gap:24px; flex-wrap:wrap; margin:14px 0 4px; }
    .b2-pane h5 { margin:0 0 7px; font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .b2-grid { display:grid; gap:5px; width:max-content; }
    .b2-cell { width:40px; height:40px; border-radius:8px; border:2px solid rgba(0,0,0,.25); cursor:pointer;
               display:flex; align-items:center; justify-content:center; font:800 15px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b2-cell:hover { transform:scale(1.08); border-color:#fff; }
    .b2-cell.fresh { animation:b2Pop .35s cubic-bezier(.2,1.4,.4,1); }
    @keyframes b2Pop { 0%{ transform:scale(.35); } 100%{ transform:scale(1); } }
    .b2-map { display:grid; gap:0; width:max-content; }
    .b2-rcell { width:40px; height:40px; box-sizing:border-box; display:flex; align-items:center; justify-content:center;
                font:800 13px var(--mono); color:#0a0e14; border:2px solid transparent; }
    .b2-rcell.free { color:rgba(10,14,20,.42); }
    .b2-adj { margin-top:9px; max-width:340px; max-height:172px; overflow:auto; }
    .b2-adj .r { display:flex; align-items:center; gap:7px; font:12px var(--mono); padding:2px 0;
                 border-bottom:1px dashed color-mix(in srgb, var(--border) 60%, transparent); }
    .b2-adj .dot { width:12px; height:12px; border-radius:4px; flex:none; }
    .b2-adj .id { color:var(--text); font-weight:800; width:26px; }
    .b2-adj .to { color:var(--muted); }
    .b2-adj .free { color:var(--good); font-weight:700; }
    .b2-info { font:13px var(--mono); color:var(--text); background:#0a0e14; border:1px solid var(--border);
               border-radius:8px; padding:9px 12px; max-width:560px; line-height:1.55; margin-top:10px; }
    .b2-info b { color:var(--accent); }
    .b2-info .win { color:var(--good); font-weight:800; }
    .b2-info .lose { color:var(--danger); font-weight:800; }
    .b2-lvl { display:flex; align-items:center; gap:8px; font:11.5px var(--mono); color:var(--muted); padding:1px 0; }
    .b2-lvl .d { width:52px; flex:none; }
    .b2-lvl .bar { height:11px; border-radius:3px; background:var(--danger); min-width:2px; }
    .b2-lvl .n { color:var(--text); font-weight:700; }
  `));
}

// Shared renderers — both demos draw the same two panes so the pair reads as one
// module: the colour grid on the left, the region decomposition on the right.
function paintGrid(box, grid, onClick, fresh) {
  box.innerHTML = "";
  box.style.gridTemplateColumns = `repeat(${grid[0].length}, 40px)`;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const cell = el("div", "b2-cell" + ((fresh || []).includes(r + "," + c) ? " fresh" : ""), grid[r][c]);
    cell.style.background = COLOR[grid[r][c]] || "var(--panel-2)";
    if (onClick) cell.onclick = () => onClick(r, c);
    box.append(cell);
  }
}

// The region map: same geometry, but the number in each cell is its REGION id and
// a white edge is drawn only where two different regions touch. The outlines you
// see ARE the graph's edges.
function paintMap(box, grid, target) {
  const { list, reg } = regionsOf(grid);
  box.innerHTML = "";
  box.style.gridTemplateColumns = `repeat(${grid[0].length}, 40px)`;
  const R = grid.length, C = grid[0].length;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const id = reg[r][c], free = grid[r][c] === target;
    const cell = el("div", "b2-rcell" + (free ? " free" : ""), String(id));
    cell.style.background = COLOR[grid[r][c]] || "var(--panel-2)";
    const edge = (dr, dc) => {
      const nr = r + dr, nc = c + dc;
      return nr < 0 || nr >= R || nc < 0 || nc >= C ? "rgba(0,0,0,.35)" : reg[nr][nc] === id ? "transparent" : "#e6edf3";
    };
    cell.style.borderTopColor = edge(-1, 0); cell.style.borderBottomColor = edge(1, 0);
    cell.style.borderLeftColor = edge(0, -1); cell.style.borderRightColor = edge(0, 1);
    box.append(cell);
  }
  return list;
}

function paintAdj(box, list, target) {
  box.innerHTML = "";
  list.forEach((rg) => {
    const free = rg.color === target;
    const dot = `<span class="dot" style="background:${COLOR[rg.color] || "#30363d"}"></span>`;
    const to = rg.adj.size ? [...rg.adj].sort((a, b) => a - b).map((i) => "#" + i).join(" ") : "—";
    box.append(el("div", "r", `${dot}<span class="id">#${rg.id}</span><span class="to">"${rg.color}"×${rg.cells.length} · touches ${to}</span>` +
      (free ? `<span class="free">free</span>` : "")));
  });
}

// ── OPT DEMO — "Count the regions" ──────────────────────────────────────────
// Paint your own grid, pick a target, and read the region map. Then switch to
// play and click the grid yourself: `used + left` never drops below the minimum,
// and only rises when you click a region that is ALREADY the target colour. That
// invariant on screen is the whole proof.
function mount(host) {
  ensureStyle();
  let ci = 4;                                        // open on the official 5×5 — 15 regions, 12 clicks
  let grid = CASES[ci].grid.map((r) => [...r]);
  let target = CASES[ci].target;
  let brush = "R";
  let mode = "play";
  let used = 0;
  let par = clicksNeeded(grid, target);

  const caseRow = el("div", "b2-row");
  caseRow.append(el("span", "lab", "case"));
  const caseChips = CASES.map((cs, i) => {
    const c = el("button", "chip" + (i === ci ? " on" : ""), cs.label);
    c.onclick = () => { ci = i; reset(); };
    caseRow.append(c); return c;
  });

  const tgtRow = el("div", "b2-row");
  tgtRow.append(el("span", "lab", "target colour"));
  const tgtSw = PALETTE.map((v) => {
    const s = el("div", "b2-swatch tgt" + (v === target ? " on" : ""), v);
    s.style.background = COLOR[v];
    s.onclick = () => { target = v; used = 0; par = clicksNeeded(grid, target);
      tgtSw.forEach((x) => x.classList.toggle("on", x.textContent === v)); draw(); };
    tgtRow.append(s); return s;
  });

  const modeRow = el("div", "b2-row");
  modeRow.append(el("span", "lab", "click a cell to"));
  const modeBox = el("div", "b2-mode");
  const bPlay = el("button", "on", "bucket-fill it"), bPaint = el("button", null, "paint it");
  bPlay.onclick = () => { mode = "play"; bPlay.classList.add("on"); bPaint.classList.remove("on"); draw(); };
  bPaint.onclick = () => { mode = "paint"; bPaint.classList.add("on"); bPlay.classList.remove("on"); draw(); };
  modeBox.append(bPlay, bPaint);
  const undo = el("button", "chip", "↺ reset");
  undo.onclick = () => reset();
  modeRow.append(modeBox, el("span", "lab", "· paint with"));
  const brushSw = PALETTE.map((v) => {
    const s = el("div", "b2-swatch" + (v === brush ? " on" : ""), v);
    s.style.background = COLOR[v];
    s.onclick = () => { brush = v; brushSw.forEach((x) => x.classList.toggle("on", x.textContent === v)); };
    modeRow.append(s); return s;
  });
  modeRow.append(undo);

  const panes = el("div", "b2-panes");
  const gPane = el("div", "b2-pane"), mPane = el("div", "b2-pane");
  const gridBox = el("div", "b2-grid"), mapBox = el("div", "b2-map"), adjBox = el("div", "b2-adj");
  gPane.append(el("h5", null, "grid"), gridBox);
  mPane.append(el("h5", null, "regions · the graph"), mapBox, adjBox);
  panes.append(gPane, mPane);

  const line = el("div", "result-line");
  const info = el("div", "b2-info");
  host.append(caseRow, tgtRow, modeRow, panes, line, info);

  function reset() {
    grid = CASES[ci].grid.map((r) => [...r]);
    target = CASES[ci].target;
    used = 0;
    par = clicksNeeded(grid, target);
    caseChips.forEach((c, i) => c.classList.toggle("on", i === ci));
    tgtSw.forEach((s) => s.classList.toggle("on", s.textContent === target));
    draw();
  }

  function cellClick(r, c) {
    if (mode === "paint") { grid[r][c] = brush; used = 0; par = clicksNeeded(grid, target); draw(); return; }
    const painted = clickAt(grid, r, c, target);
    used++;
    draw(painted, painted.length === 0);
  }

  function draw(fresh, wasted) {
    paintGrid(gridBox, grid, cellClick, fresh);
    const list = paintMap(mapBox, grid, target);
    paintAdj(adjBox, list, target);
    const left = list.filter((x) => x.color !== target).length;
    const total = used + left;
    line.innerHTML =
      `<span class="tag">${list.length} region${list.length === 1 ? "" : "s"}</span>` +
      `<span class="opcount cool"><span class="n">${par}</span> minimum click${par === 1 ? "" : "s"}</span>` +
      `<span class="opcount ${total > par ? "hot" : ""}"><span class="n">${used}</span> used + <span class="n">${left}</span> left = ${total}</span>`;

    if (mode === "paint") {
      info.innerHTML = `Paint mode — click cells to design a grid. Watch the region map on the right resplit as you go: two blobs of <b>the same colour</b> that don't touch stay <b>two separate ids</b>, and each one still costs its own click. That is why the answer counts regions, not colours.`;
    } else if (uniform(grid, target)) {
      info.innerHTML = used === par
        ? `<span class="win">Solved in ${used} click${used === 1 ? "" : "s"} — exactly the minimum.</span> You could not have done better, and you could only have done worse by clicking a region that was already <b>"${target}"</b>. Every other click deletes exactly one node from the region graph, so the click count and the region count are the same number.`
        : `<span class="lose">Solved in ${used} clicks; the minimum was ${par}.</span> The extra ${used - par} went on regions that were already <b>"${target}"</b> — the only kind of wasted click this game allows.`;
    } else {
      info.innerHTML = (wasted ? `<span class="lose">That region was already "${target}"</span> — nothing changed, and the click still counted. ` : "") +
        `Click any cell: its whole region turns <b>"${target}"</b>. Watch <b>used + left</b> — it holds at <b>${par}</b> while you play well, because each useful click removes exactly one non-target region. It can only go up.`;
    }
  }

  draw();
}

// ── BRUTE DEMO — "Search every click order" ─────────────────────────────────
// The oracle: BFS over whole grid states. It never assumes the rule above — it
// discovers the minimum by exhausting the reachable state space, which is why it
// was trustworthy enough to validate the rule with. It is also why it costs
// 2^regions: the histogram is a binomial curve, and the 4×4 checkerboard runs out
// of budget on a grid the region count answers by counting to 16.
function mountBrute(host) {
  ensureStyle();
  let ci = 4;                                        // open on the official 5×5: 4,096 states for the number 12
  let grid = CASES[ci].grid.map((r) => [...r]);
  let target = CASES[ci].target;
  let brush = "R";

  const caseRow = el("div", "b2-row");
  caseRow.append(el("span", "lab", "case"));
  const caseChips = CASES.map((cs, i) => {
    const c = el("button", "chip" + (i === ci ? " on" : ""), cs.label);
    c.onclick = () => { ci = i; grid = CASES[i].grid.map((r) => [...r]); target = CASES[i].target;
      caseChips.forEach((x, xi) => x.classList.toggle("on", xi === i));
      tgtSw.forEach((s) => s.classList.toggle("on", s.textContent === target)); draw(); };
    caseRow.append(c); return c;
  });

  const tgtRow = el("div", "b2-row");
  tgtRow.append(el("span", "lab", "target colour"));
  const tgtSw = PALETTE.map((v) => {
    const s = el("div", "b2-swatch tgt" + (v === target ? " on" : ""), v);
    s.style.background = COLOR[v];
    s.onclick = () => { target = v; tgtSw.forEach((x) => x.classList.toggle("on", x.textContent === v)); draw(); };
    tgtRow.append(s); return s;
  });

  const brushRow = el("div", "b2-row");
  brushRow.append(el("span", "lab", "click a cell to paint it"));
  PALETTE.forEach((v) => {
    const s = el("div", "b2-swatch" + (v === brush ? " on" : ""), v);
    s.style.background = COLOR[v];
    s.onclick = () => { brush = v; [...brushRow.querySelectorAll(".b2-swatch")].forEach((x) => x.classList.toggle("on", x.textContent === v)); };
    brushRow.append(s);
  });

  const panes = el("div", "b2-panes");
  const gPane = el("div", "b2-pane"), lPane = el("div", "b2-pane");
  const gridBox = el("div", "b2-grid"), lvlBox = el("div");
  gPane.append(el("h5", null, "grid"), gridBox);
  lPane.append(el("h5", null, "states reachable in d clicks"), lvlBox);
  panes.append(gPane, lPane);

  const line = el("div", "result-line");
  const info = el("div", "b2-info");
  host.append(caseRow, tgtRow, brushRow, panes, line, info);

  // The BFS is exponential and draw() runs on every swatch, chip and cell click.
  // Re-search only when the grid or the target actually changed — same cache key
  // idiom as #365's board demo, so the two sequels stay in step.
  let cache = { key: null };
  function draw() {
    paintGrid(gridBox, grid, (r, c) => { grid[r][c] = brush; draw(); });
    const key = grid.map((r) => r.join("")).join("/") + "|" + target;
    if (cache.key !== key) cache = { key, res: searchStates(grid, target) };
    const res = cache.res;
    const regions = regionsOf(grid, false).list;
    const cells = grid.length * grid[0].length;

    lvlBox.innerHTML = "";
    const peak = res.levels.reduce((m, v) => Math.max(m, v || 0), 1);
    res.levels.forEach((n, d) => {
      if (!n) return;
      const row = el("div", "b2-lvl", `<span class="d">d = ${d}</span>`);
      const bar = el("span", "bar"); bar.style.width = Math.max(2, Math.round((n / peak) * 190)) + "px";
      row.append(bar, el("span", "n", String(n)));
      lvlBox.append(row);
    });

    line.innerHTML =
      `<span class="tag">${regions.length} region${regions.length === 1 ? "" : "s"}</span>` +
      (res.capped ? `<span class="opcount hot"><span class="n">${res.popped}</span> states expanded — budget blown</span>`
                  : `<span class="opcount hot"><span class="n">${res.popped}</span> state${res.popped === 1 ? "" : "s"} expanded</span>`) +
      `<span class="opcount cool"><span class="n">${cells}</span> cells the counting pass reads</span>`;

    info.innerHTML = res.capped
      ? `Gave up after <b>${STATE_BUDGET.toLocaleString()}</b> states. This grid has <b>${regions.filter((x) => x.color !== target).length}</b> non-target regions and any subset of them can be filled, so the reachable space is <b>2<sup>${regions.filter((x) => x.color !== target).length}</sup> = ${Math.pow(2, regions.filter((x) => x.color !== target).length).toLocaleString()}</b> states — for an answer the optimized side gets by reading <b>${cells}</b> cells once. <span class="lose">That gap is the whole point of this challenge.</span>`
      : `Minimum = <b>${res.answer}</b> click${res.answer === 1 ? "" : "s"}, found by expanding <b>${res.popped}</b> distinct grid states — the bars are the binomial curve of "which subset of regions have I filled". The search never assumes anything, which is exactly why it can be trusted to <i>check</i> the rule; it is also why it reads <b>${res.popped}</b> states where counting regions reads <b>${cells}</b> cells. Repaint cells above, or try <b>checker → "B"</b> to watch it run out of budget.`;
  }

  draw();
}

// ── STEP: label — the region pass, line by line ─────────────────────────────
// Deliberately NOT a re-run of #329's cell-level BFS: the inner flood fill is
// compressed to one step per absorbed cell (that story is #329's), so the steps
// that remain are the region-level ones — a new id being minted, a region being
// judged free or costly, the `region` label grid filling in.
const DBG_LABEL = [
  { label: `2×2 → "G" · one region`, grid: [["R", "R"], ["R", "R"]], target: "G" },
  { label: `all "B" → "B" · answer 0`, grid: [["B", "B", "B"], ["B", "B", "B"], ["B", "B", "B"]], target: "B" },
  { label: `3×3 → "R" · target absent`, grid: [["G", "Y", "Y"], ["G", "Y", "G"], ["Y", "Y", "G"]], target: "R" },
  { label: `split "G" → "B" · one colour, two ids`, grid: [["G", "G", "B"], ["B", "B", "B"], ["G", "G", "B"]], target: "B" },
  { label: `checker → "B" · every cell its own`, grid: [["R", "G", "R"], ["G", "R", "G"], ["R", "G", "R"]], target: "B" },
];

const SRC_LABEL = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> R = grid.length, C = grid[0].length;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="reg">region</span> = grid.map(row =&gt; row.map(() =&gt; -1));` },
  { ln: 4,  html: `  <span class="k">const</span> <span class="tok" data-t="regions">regions</span> = [];  <span class="k">let</span> <span class="tok" data-t="clicks">clicks</span> = 0;` },
  { ln: 5,  html: `  <span class="k">for</span> (<span class="k">let</span> r = 0; r &lt; R; r++) <span class="k">for</span> (<span class="k">let</span> c = 0; c &lt; C; c++) {` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="seen">region[r][c] !== -1</span>) <span class="k">continue</span>;` },
  { ln: 7,  html: `    <span class="k">const</span> color = grid[r][c], <span class="tok" data-t="mint">id = regions.length</span>;` },
  { ln: 8,  html: `    <span class="fn">floodLabel</span>(r, c, color, id);` },
  { ln: 9,  html: `    regions.<span class="fn">push</span>(color); <span class="k">if</span> (<span class="tok" data-t="cost">color !== targetColor</span>) clicks++;` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">clicks</span>;` },
  { ln: 12, html: `}` },
  { ln: 13, html: `` },
  { ln: 14, html: `<span class="k">function</span> <span class="fn">floodLabel</span>(r, c, color, id) {` },
  { ln: 15, html: `  <span class="k">const</span> <span class="tok" data-t="queue">queue = [[r, c]]</span>; region[r][c] = id;` },
  { ln: 16, html: `  <span class="k">while</span> (queue.length) {` },
  { ln: 17, html: `    <span class="k">const</span> [y, x] = <span class="tok" data-t="shift">queue.<span class="fn">shift</span>()</span>;` },
  { ln: 18, html: `    <span class="k">for</span> (<span class="k">const</span> [dy, dx] <span class="k">of</span> dirs) {` },
  { ln: 19, html: `      <span class="k">if</span> (in bounds &amp;&amp; region[ny][nx] === -1 &amp;&amp; grid[ny][nx] === color)` },
  { ln: 20, html: `        <span class="tok" data-t="absorb">region[ny][nx] = id</span>, queue.<span class="fn">push</span>([ny, nx]);` },
  { ln: 21, html: `    }` },
  { ln: 22, html: `  }` },
  { ln: 23, html: `}` },
];

function traceLabel(caseIndex) {
  const idx = Math.max(0, Math.min(DBG_LABEL.length - 1, (caseIndex | 0) - 1));
  const cs = DBG_LABEL[idx];
  const grid = cs.grid.map((r) => [...r]), target = cs.target;
  const R = grid.length, C = grid[0].length;
  const reg = grid.map((row) => row.map(() => -1));
  const steps = [];

  const live = {};                 // outer-frame vars — a key appears when its line runs
  let inner = null;                // floodLabel's frame, or null when it isn't on the stack
  let queue = [];
  let hasReg = false, hasFound = false, hasQueue = false;
  const found = [];                // {id, color, size, free}

  const gridRows = () => grid.map((row) => row.join(" "));
  const regRows = () => reg.map((row) => row.map((v) => (v < 0 ? "·" : v)).join(" "));
  const foundItems = () => found.map((f) => `#${f.id} "${f.color}" ${f.free ? "free" : "CLICK"}`);

  const snap = (line, o = {}) => {
    const structs = [{ label: "grid", items: gridRows() }];
    if (hasReg) structs.push({ label: "region", items: regRows() });
    if (hasFound) structs.push({ label: "regions", items: foundItems(), newest: !!o.fNew });
    const frames = [{ title: `bucketFill(grid, "${target}")`, vars: { ...live }, changed: o.changed || [], structs, ret: o.ret }];
    if (inner) {
      const iStructs = hasQueue ? [{ label: "queue", items: queue.map(([y, x]) => `[${y},${x}]`), newest: !!o.qNew }] : [];
      frames.push({ title: inner.title, vars: { ...inner.vars }, changed: o.ichanged || [], structs: iStructs, ret: o.iret });
    }
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result, frames });
  };

  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label}.</b> #329 recoloured one region; this asks how many regions there <i>are</i>. Nothing is clicked, ever — the grid is about to be collapsed into a graph.`, focus: "tc" });
  live.R = R; live.C = C;
  snap(2, { note: `A ${R}×${C} grid — <b>${R * C}</b> cells is the entire budget of this approach. The state-space search on the other tab reads thousands.`, changed: ["R", "C"] });
  hasReg = true;
  snap(3, { note: `<b>region</b> is a parallel grid of labels, all <code class="inl">-1</code> for "not in a region yet". It is the same shape as the flood fill in #329 writes into, except it stamps an <b>id</b> instead of a colour — so the original colours survive and can still be compared to the target.`, focus: "reg" });
  live.clicks = 0; hasFound = true;
  snap(4, { note: `<b>regions</b> collects each region as the scan finds it, so its length is always the next id to mint; <b>clicks</b> is the answer. The two numbers differ whenever the grid already contains the target colour — those regions are found but never charged for.`, focus: "clicks", changed: ["clicks"] });

  let n = 0, clicks = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    live.r = r; live.c = c;
    delete live.color; delete live.id;   // both are `const`s in the loop BODY — out of scope again at line 6
    const already = reg[r][c] !== -1;
    snap(6, {
      note: already
        ? `Cell <b>[${r},${c}]</b> already carries label <b>#${reg[r][c]}</b> — an earlier flood fill swallowed it. Skip: a region must be counted once, and the cell that <i>starts</i> it is the only one that gets to.`
        : `Cell <b>[${r},${c}]</b> is unlabelled, so it is the first cell of a region nobody has seen. Scanning row-major means the top-left cell of each region is always the one that discovers it.`,
      focus: "seen", changed: ["r", "c"], eval: { expr: `region[${r}][${c}] !== -1`, val: already },
    });
    if (already) continue;

    const color = grid[r][c], id = n++;
    live.color = `"${color}"`; live.id = id;
    snap(7, { note: `Mint region <b>#${id}</b>, colour <b>"${color}"</b> — the id is just how many regions have been found so far. This id is the node; every cell the flood fill reaches from here is the same node.`, focus: "mint", changed: ["color", "id"] });

    snap(8, { note: `Hand the seed to <b>floodLabel</b> — #329's BFS, unchanged apart from writing <code class="inl">id</code> where it used to write a colour.` });

    // ── inside floodLabel ────────────────────────────────────────────────
    inner = { title: `floodLabel(${r}, ${c}, "${color}", ${id})`, vars: {} };
    queue = [[r, c]]; reg[r][c] = id; hasQueue = true;
    let size = 1;
    snap(15, { note: `Seed the queue and stamp <b>[${r},${c}]</b> with <b>#${id}</b>. Stamping on <i>enqueue</i> is what stops a cell being queued twice — exactly #329's trick.`, focus: "queue", qNew: true });
    while (queue.length) {
      const [y, x] = queue.shift();
      inner.vars.y = y; inner.vars.x = x;
      snap(17, { note: `Dequeue <b>[${y},${x}]</b> and look at its four neighbours for more "${color}".`, focus: "shift", ichanged: ["y", "x"] });
      for (const [dy, dx] of DIRS) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || ny >= R || nx < 0 || nx >= C) continue;
        if (reg[ny][nx] !== -1 || grid[ny][nx] !== color) continue;
        reg[ny][nx] = id; queue.push([ny, nx]); size++;
        snap(20, { note: `<b>[${ny},${nx}]</b> is also "${color}" and touches us, so it joins <b>#${id}</b> — region <b>${size}</b> cell${size === 1 ? "" : "s"} and growing. Connectivity, not colour, decides this: a "${color}" cell somewhere else on the grid gets its own id.`, focus: "absorb", qNew: true });
      }
    }
    snap(23, { note: `Queue drained — region <b>#${id}</b> is closed at <b>${size}</b> cell${size === 1 ? "" : "s"}. Back to the scan.`, iret: { value: `#${id}` } });
    inner = null;

    // ── back in bucketFill ───────────────────────────────────────────────
    const free = color === target;
    found.push({ id, color, size, free });
    if (!free) { clicks++; live.clicks = clicks; }
    snap(9, {
      note: free
        ? `Region <b>#${id}</b> is already <b>"${target}"</b> — it costs <b>nothing</b>. It cannot be un-done either: clicks only ever paint the target colour, so a correct region stays correct.`
        : `Region <b>#${id}</b> is "${color}", not "${target}", so it needs a click — and <b>exactly one</b>. It can never merge into a neighbour (no click paints "${color}") and one click clears all ${size} of its cells, so it is worth exactly 1. <b>clicks = ${clicks}</b>.`,
      focus: "cost", changed: free ? [] : ["clicks"], fNew: true,
      eval: { expr: `"${color}" !== "${target}"`, val: !free },
    });
  }

  delete live.r; delete live.c; delete live.color; delete live.id;
  snap(11, {
    note: `Scan finished: <b>${n}</b> region${n === 1 ? "" : "s"} in the grid, <b>${clicks}</b> of them not already "${target}". Every cell was read once and no click was ever simulated. Note what was never needed — <i>which</i> regions touch which. #365 relaxes the colour rule and that is where the edges start to matter.`,
    focus: "ret", done: true, result: String(clicks), ret: { value: clicks },
  });
  return steps;
}

// ── STEP: search — the state-space BFS, line by line ────────────────────────
// Paired with the "Search every click order" tab. Grids are kept tiny because
// the queue IS the lesson: watch it branch once per non-target region, and watch
// `seen` grow toward 2^regions. The last case has 3 regions and still expands 8
// states to learn the number 3.
const DBG_SEARCH = [
  { label: `all "B" → "B" · pops once`, grid: [["B", "B"], ["B", "B"]], target: "B" },
  { label: `2×2 → "G" · one region`, grid: [["R", "R"], ["R", "R"]], target: "G" },
  { label: `split "G" → "B" · 2 regions, 4 states`, grid: [["G", "G", "B"], ["B", "B", "B"], ["G", "G", "B"]], target: "B" },
  { label: `3×3 → "R" · 3 regions, 8 states`, grid: [["G", "Y", "Y"], ["G", "Y", "G"], ["Y", "Y", "G"]], target: "R" },
];

const SRC_SEARCH = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="queue">queue = [[grid, 0]]</span>;   <span class="cm">// [state, clicks so far]</span>` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="seen">seen</span> = <span class="k">new</span> <span class="k">Set</span>([key(grid)]); <span class="k">let</span> popped = 0;` },
  { ln: 4,  html: `  <span class="k">while</span> (queue.length) {` },
  { ln: 5,  html: `    <span class="k">const</span> [g, depth] = <span class="tok" data-t="pop">queue.<span class="fn">shift</span>()</span>; popped++;` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="win">every cell === targetColor</span>) <span class="k">return</span> depth;` },
  { ln: 7,  html: `    <span class="k">for</span> (<span class="k">const</span> region <span class="k">of</span> <span class="fn">regionsOf</span>(g)) {` },
  { ln: 8,  html: `      <span class="k">if</span> (<span class="tok" data-t="skip">region.color === targetColor</span>) <span class="k">continue</span>;` },
  { ln: 9,  html: `      <span class="k">const</span> next = <span class="tok" data-t="click">click(g, region, targetColor)</span>;` },
  { ln: 10, html: `      <span class="k">if</span> (!seen.<span class="fn">has</span>(<span class="tok" data-t="dedup">key(next)</span>)) {` },
  { ln: 11, html: `        seen.<span class="fn">add</span>(key(next)); queue.<span class="fn">push</span>([next, depth + 1]);` },
  { ln: 12, html: `      }` },
  { ln: 13, html: `    }` },
  { ln: 14, html: `  }` },
  { ln: 15, html: `}` },
];

function traceSearch(caseIndex) {
  const idx = Math.max(0, Math.min(DBG_SEARCH.length - 1, (caseIndex | 0) - 1));
  const cs = DBG_SEARCH[idx];
  const start = cs.grid.map((r) => [...r]), target = cs.target;
  const steps = [];
  const key = (g) => g.map((row) => row.join("")).join("|");

  const live = {};
  let hasQueue = false, hasSeen = false;
  let queue = [];
  const seen = new Set();
  let popped = 0;

  const snap = (line, o = {}) => {
    const structs = [];
    if (hasQueue) structs.push({ label: "queue", items: queue.map(([g, d]) => `${key(g)} d${d}`), newest: !!o.qNew });
    if (hasSeen) structs.push({ label: "seen", items: [...seen], newest: !!o.sNew });
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: `bucketFill(grid, "${target}")`, vars: { ...live }, changed: o.changed || [], structs, ret: o.ret }] });
  };

  const regionCount = regionsOf(start, false).list.filter((x) => x.color !== target).length;
  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label}.</b> The honest brute: never guess a rule, just search. A move is one click, so the shortest path from this grid to an all-"${target}" grid <i>is</i> the answer. This is the oracle the counting solution was checked against.`, focus: "tc" });
  queue = [[start, 0]]; hasQueue = true;
  snap(2, { note: `Seed the BFS with the starting grid at depth <b>0</b>. Each queue entry is a whole ${start.length}×${start[0].length} grid — the state is the <i>picture</i>, not a cell.`, focus: "queue", qNew: true });
  seen.add(key(start)); hasSeen = true; live.seen = 1; live.popped = 0;
  snap(3, { note: `<b>seen</b> keeps the search from re-expanding a grid it already reached. Without it, clicking regions in a different order revisits the same picture and the search never ends. With it, the space is bounded at <b>2<sup>${regionCount}</sup> = ${Math.pow(2, regionCount)}</b> — one state per subset of the ${regionCount} non-target region${regionCount === 1 ? "" : "s"}.`, focus: "seen", changed: ["seen"], sNew: true });

  while (queue.length) {
    const [g, depth] = queue.shift();
    popped++;
    live.depth = depth; live.popped = popped;
    snap(5, { note: `Pop state <b>${popped}</b> at depth <b>${depth}</b>: <code class="inl">${key(g)}</code>. BFS pops in depth order, so the first finished grid we meet is reached by the fewest clicks.`, focus: "pop", changed: ["depth", "popped"] });

    const done = uniform(g, target);
    snap(6, { note: done
      ? `Every cell is <b>"${target}"</b> — finished. It took <b>${depth}</b> click${depth === 1 ? "" : "s"}, and it took <b>${popped}</b> expanded state${popped === 1 ? "" : "s"} to prove nothing shorter exists.`
      : `Not uniform yet — some cell isn't "${target}". Branch on every region that could be clicked next.`,
      focus: "win", eval: { expr: `all cells === "${target}"`, val: done } });
    if (done) {
      snap(6, { note: `<b>Return ${depth}.</b> Now compare: the other tab reads <b>${start.length * start[0].length}</b> cells once and gets the same number, because it noticed that the order never mattered — every click removes exactly one region, so the count of regions <i>is</i> the depth.`, focus: "win", done: true, result: String(depth), ret: { value: depth } });
      return steps;
    }

    for (const rg of regionsOf(g, false).list) {
      const skip = rg.color === target;
      snap(8, { note: skip
        ? `Region <b>#${rg.id}</b> is already "${target}" — clicking it produces the same grid, so it is not a move at all. Skipping it is the only pruning this search gets.`
        : `Region <b>#${rg.id}</b> is "${rg.color}" over ${rg.cells.length} cell${rg.cells.length === 1 ? "" : "s"} — a legal click. Every legal click becomes a branch, which is why the fan-out is the region count.`,
        focus: "skip", eval: { expr: `region #${rg.id} is "${rg.color}"`, val: !skip } });
      if (skip) continue;

      const next = g.map((row) => [...row]);
      for (const [y, x] of rg.cells) next[y][x] = target;
      snap(9, { note: `Click <b>#${rg.id}</b>: a fresh copy of the whole grid with those ${rg.cells.length} cell${rg.cells.length === 1 ? "" : "s"} repainted → <code class="inl">${key(next)}</code>. Copying the grid per branch is what makes this expensive in memory as well as time.`, focus: "click" });

      const k = key(next);
      const fresh = !seen.has(k);
      snap(10, { note: fresh
        ? `<code class="inl">${k}</code> is new — queue it at depth <b>${depth + 1}</b>.`
        : `<code class="inl">${k}</code> was already reached, by clicking the same regions in a different order. Order never changes the outcome — that is the first hint the search is doing pointless work.`,
        focus: "dedup", eval: { expr: `seen.has(...)`, val: !fresh } });
      if (fresh) {
        seen.add(k); queue.push([next, depth + 1]); live.seen = seen.size;
        snap(11, { note: `Queued. <b>seen = ${seen.size}</b> — heading for ${Math.pow(2, regionCount)} on a grid whose answer is a single count.`, changed: ["seen"], qNew: true, sNew: true });
      }
    }
  }
  snap(15, { note: `Queue drained without finishing — impossible here, since any region can always be clicked.`, done: true, result: "—" });
  return steps;
}

export default {
  n: 363, id: "bucketfill2", title: "Bucket Fill 2", dates: ["2026-08-08"],
  statement: `Given a 2D grid of single-letter colour strings and a <b>target colour</b>, return the <b>minimum number of clicks</b> needed to make the entire grid that colour. Each click repaints the clicked cell's whole 4-connected same-colour region — the flood fill of <b>#329</b> — with the target colour. <span class="rule">Example: <code class="inl">bucketFill([["G","Y","Y"],["G","Y","G"],["Y","Y","G"]], "R")</code> → <code class="inl">3</code>: the grid holds three connected regions and none of them is already "R". Note that a grid already entirely the target colour costs <code class="inl">0</code>.</span>`,
  variants: [
    {
      name: "Search every click order", tone: "brute", cost: "O(2^regions)",
      approach: `The honest brute, and the one that assumes nothing: a <b>breadth-first search over whole grid states</b>. A move is one click on one non-target region; the first uniform grid BFS pops is reached in the fewest clicks. It is correct by construction — this is the oracle the optimized side's rule was validated against, on all five official cases and 400 random 3×3 grids — and it <b>passes every official assertion</b>. But the reachable space is one state per <i>subset</i> of non-target regions, so it is <b>2<sup>regions</sup></b>: the official 5×5 expands <b>4,096</b> states to return 12, and the 4×4 checkerboard wants <b>65,536</b> to return 16. The demo caps it at 8,000 so you can watch it go bankrupt on that chip; the code below has no cap, because the official inputs don't need one. The waste isn't a slow line — it is <b>enumerating an answer that could have been counted</b>.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (g: string[][]) => g.map(row => row.join("")).join("|");
  const uniform = (g: string[][]) => g.every(row => row.every(v => v === targetColor));

  // A "move" is one click: pick a region that isn't the target colour and repaint
  // it. Breadth-first over whole GRID STATES, so the first uniform grid we pop is
  // reached by the fewest clicks. Correct by construction — and it enumerates the
  // entire reachable state space to learn one number.
  const queue: [string[][], number][] = [[grid.map(row => [...row]), 0]];
  const seen = new Set([key(grid)]);
  while (queue.length) {
    const [g, depth] = queue.shift()!;
    if (uniform(g)) return depth;
    const done = g.map(row => row.map(() => false));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (done[r][c] || g[r][c] === targetColor) continue;   // already enumerated, or nothing to click
      const color = g[r][c], cells: [number, number][] = [[r, c]];
      done[r][c] = true;
      for (let i = 0; i < cells.length; i++) {               // #329's flood fill: collect the region
        const [y, x] = cells[i];
        for (const [dy, dx] of dirs) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= R || nx < 0 || nx >= C) continue;
          if (!done[ny][nx] && g[ny][nx] === color) { done[ny][nx] = true; cells.push([ny, nx]); }
        }
      }
      const next = g.map(row => [...row]);                   // ...and click it
      for (const [y, x] of cells) next[y][x] = targetColor;
      const k = key(next);
      if (!seen.has(k)) { seen.add(k); queue.push([next, depth + 1]); }
    }
  }
  return -1;                                                 // unreachable: every grid can be finished
}`,
      mount: mountBrute,
    },
    {
      name: "Step: search", tone: "brute", cost: "state explosion",
      approach: `A debugger for the state-space BFS on grids small enough that the <b>queue</b> struct stays readable — each entry is an entire grid, not a cell. Watch the fan-out: one branch per non-target region, and <b>seen</b> climbing toward 2<sup>regions</sup>. Case 4 has just three regions and still expands eight whole grids to discover the number three. The step that gives the game away is the <b>deduplication</b> on line 10 — "already reached, by clicking the same regions in a different order". Once order provably doesn't matter, there is nothing left to search. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_SEARCH, trace: traceSearch, input: { label: "case =", value: 4, min: 1, max: DBG_SEARCH.length, presets: DBG_SEARCH.map((_, i) => i + 1), hint: `1–${DBG_SEARCH.length}: pick a scenario` } }),
    },
    {
      name: "Count the regions", tone: "opt", cost: "O(R·C)",
      approach: `Stop thinking in cells. Run <b>#329's flood fill once per unlabelled cell</b>, stamping a region <b>id</b> instead of a colour, and the grid collapses into a handful of nodes. Now the argument is short: a click only ever paints the <b>target</b> colour, so a non-target region can never change colour, never grow, and never be absorbed by a neighbour — the only thing that can clear it is a click aimed at it, and one click clears all of it. <b>Exactly one click per region that isn't already the target colour.</b> Nothing is simulated and no order is chosen. Play the grid yourself: <code class='inl'>used + left</code> is pinned to the minimum and can only rise, which is the proof made clickable. The region map draws the adjacency too — this answer never reads it, but <b>#365</b> will.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const region: number[][] = grid.map(row => row.map(() => -1));  // no cell has a region yet
  let regions = 0, clicks = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (region[r][c] !== -1) continue;           // already swallowed by an earlier region
    const color = grid[r][c], id = regions++;
    const queue: [number, number][] = [[r, c]];  // #329's flood fill — paints ids, not colours
    region[r][c] = id;
    while (queue.length) {
      const [y, x] = queue.shift()!;
      for (const [dy, dx] of dirs) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || ny >= R || nx < 0 || nx >= C) continue;
        if (region[ny][nx] === -1 && grid[ny][nx] === color) { region[ny][nx] = id; queue.push([ny, nx]); }
      }
    }
    if (color !== targetColor) clicks++;         // one click per region that isn't already right
  }
  return clicks;
}`,
      mount,
    },
    {
      name: "Step: label", tone: "opt", cost: "region graph",
      approach: `A debugger for the labelling pass. The inner flood fill is deliberately compressed to <b>one step per absorbed cell</b> — that story belongs to <b>#329</b> — so the steps you actually read are the region-level ones: an id being minted, the <b>region</b> label grid filling in beside the colour grid, and each finished region being judged <i>free</i> or <i>CLICK</i>. Case 4 is the one to sit with: two "G" blobs that never touch get <b>two different ids</b>, so the answer is 2, not 1. Case 5 gives every cell its own id. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_LABEL, trace: traceLabel, input: { label: "case =", value: 4, min: 1, max: DBG_LABEL.length, presets: DBG_LABEL.map((_, i) => i + 1), hint: `1–${DBG_LABEL.length}: pick a scenario` } }),
    },
  ],
};
