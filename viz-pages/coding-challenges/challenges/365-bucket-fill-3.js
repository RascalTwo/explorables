// #365 · The Last Challenge: Bucket Fill 3 — any colour is legal, so one seed is not enough.
//
// Third and last of the bucket-fill series, and the last daily challenge:
//   • #329 Bucket Fill    — flood ONE region from a seed. One click, no counting.
//   • #363 Bucket Fill 2  — fewest clicks to make the whole board the target,
//                           where every click must paint the TARGET colour.
//   • #365 (here)         — same goal, but a click may paint ANY colour, so other
//                           colours become intermediate steps.
// That one relaxed clause is the whole difficulty. With the colour forced, a
// click can only ever grow the target blob outward, so expansion is greedy and
// the answer is one click per non-target region. Once any colour is allowed, the
// COLOUR of each click is a free variable: painting the middle of #363's board
// "Y" can swallow two Y patches at once and pay for itself. Nothing decides that
// locally, so the answer stops being a formula and becomes a shortest-sequence
// search over the region graph.
//
// Same input, two strategies. Both deepen shortest-first and both prune with an
// admissible floor (a click retires at most one colour, so at least that many
// clicks remain); the difference is WHERE you are allowed to click:
//   • BRUTE — "Drag one blob around": pick a seed and never click anywhere else,
//     #329's mental model scaled up. Every click repaints the WHOLE grown blob, so
//     the only way to reach an outlying region is to drag the blob out to it,
//     recolouring everything already inside on the way.
//   • OPT   — click ANY blob with ANY colour, so the optimum can paint an
//     outlying region directly instead of dragging one blob across the board.
// Flip the Approach toggle on case 8 "two flanks" to see 3 clicks vs 2 on
// identical input — the optimum paints the two outliers directly instead of
// dragging one blob around.
//
// CAVEAT (verified in node, same shape as 320-blood-bank): the one-seed strategy
// passes ALL SIX of freeCodeCamp's official tests. The official set never
// separates the two — the only inputs where they disagree are ours. So "worse"
// here means worse in general, not wrong by the grader.
//
// Day 365 of the daily coding challenge, published 2026-08-10, exactly a year
// after #1 "Vowel Balance". freeCodeCamp kept the feature and made it loop.
import { el, mountDebugger } from "../shared.js";

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const PALETTE = ["R", "G", "B", "Y", "O", "P", "C"];
const COLOR = { R: "#f85149", G: "#3fb950", B: "#58a6ff", Y: "#d29922", O: "#ff9f45", P: "#bc8cff", C: "#39c5cf" };
const MAXR = 5, MAXC = 4;   // the official maximum board; the search is exponential

// Provenance: cases 1–6 are freeCodeCamp's OFFICIAL six, verbatim and in the
// published order. Cases 7 and 8 are INVENTED and both load-bearing:
//   7 "pinwheel"   — THE case that justifies this module over #363. Paint the Y
//     plus "R" and it swallows all four corners at once, then one coat of "B":
//     2 clicks. If every click had to be the target it would cost 5, one per
//     region. Engineered for exactly that gap, not found by luck.
//   8 "two flanks" — the only case where the two approaches disagree (one seed 3,
//     free 2). It is also the only case with WORK LEFT TO DO whose target colour
//     is already on the board, so its floor starts one below the colour count.
//     (Case 2 also holds its target, but that board is finished before it starts.)
const CASES = [
  { label: "one region", grid: [["B", "B"], ["B", "B"]], target: "R" },                                                    // official 1 → 1
  { label: "already done", grid: [["G", "G", "G"], ["G", "G", "G"], ["G", "G", "G"]], target: "G" },                       // official 2 → 0
  { label: "two Y patches", grid: [["P", "P", "Y"], ["Y", "P", "Y"], ["Y", "P", "P"]], target: "O" },                      // official 3 → 2
  { label: "mosaic", grid: [["G", "Y", "C", "C"], ["Y", "Y", "Y", "B"], ["C", "Y", "B", "B"], ["C", "B", "B", "C"]], target: "R" },   // official 4 → 4
  { label: "columns", grid: [["G", "G", "O", "O"], ["G", "Y", "B", "Y"], ["B", "Y", "B", "Y"], ["B", "Y", "B", "Y"], ["G", "G", "G", "G"]], target: "P" }, // official 5 → 5
  { label: "bands", grid: [["R", "G", "R", "G"], ["R", "G", "R", "G"], ["B", "B", "B", "B"], ["B", "B", "B", "B"], ["R", "G", "R", "G"]], target: "Y" },   // official 6 → 3
  { label: "pinwheel", grid: [["R", "Y", "R"], ["Y", "Y", "Y"], ["R", "Y", "R"]], target: "B" },                           // INVENTED → 2 (vs 5 target-only)
  { label: "two flanks", grid: [["B", "B", "B"], ["G", "B", "R"], ["G", "B", "R"]], target: "B" },                         // INVENTED → 2 free / 3 one-seed
];

// ── The region graph ────────────────────────────────────────────────────────
// Every click repaints a whole same-colour blob, so a single cell is never the
// unit of anything. Collapse the grid once into connected same-colour components
// and the rest of the module — both searches, both step-throughs, the picture on
// screen — works on a graph of at most a couple of dozen nodes.
function regionize(grid) {
  const R = grid.length, C = grid[0].length;
  const id = grid.map((row) => row.map(() => -1));
  const color = [], cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (id[r][c] !== -1) continue;
    const k = color.length; color.push(grid[r][c]); cells.push([]);
    const stack = [[r, c]]; id[r][c] = k;
    while (stack.length) {
      const [a, b] = stack.pop(); cells[k].push([a, b]);
      for (const [dr, dc] of DIRS) {
        const na = a + dr, nb = b + dc;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        if (id[na][nb] === -1 && grid[na][nb] === grid[a][b]) { id[na][nb] = k; stack.push([na, nb]); }
      }
    }
  }
  const n = color.length;
  const adj = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of DIRS) {
    const na = r + dr, nb = c + dc;
    if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
    const u = id[r][c], v = id[na][nb];
    if (u !== v && !adj[u].includes(v)) adj[u].push(v);
  }
  return { R, C, n, id, color, cells, adj };
}

// Blobs of a state: connected runs of equal colour in the region graph. Regions
// only ever merge (a click paints a whole blob), so the original regions stay
// atomic forever and a plain colour array is a complete description of the board.
function blobsOf(reg, s) {
  const seen = new Array(reg.n).fill(false), out = [];
  for (let i = 0; i < reg.n; i++) {
    if (seen[i]) continue;
    const stack = [i], group = [i]; seen[i] = true;
    while (stack.length) {
      const u = stack.pop();
      for (const v of reg.adj[u]) if (!seen[v] && s[v] === s[u]) { seen[v] = true; stack.push(v); group.push(v); }
    }
    out.push(group);
  }
  return out;
}

// The admissible floor. A click paints ONE blob ONE colour, so it can retire at
// most one colour from the board; the finished board holds exactly the target.
const floorOf = (s, target) => { const set = new Set(s); return set.size - (set.has(target) ? 1 : 0); };

// ── OPT — any blob, any colour, iterative deepening ─────────────────────────
// Returns the minimum click count plus the plan and the states searched.
function solveFree(reg, target) {
  let nodes = 0;
  const dead = new Map();
  const search = (s, left, path) => {
    nodes++;
    const need = floorOf(s, target);
    if (need === 0) return path;
    if (need > left) return null;
    const key = s.join("");
    if ((dead.get(key) ?? -1) >= left) return null;
    dead.set(key, left);
    for (const blob of blobsOf(reg, s)) {
      const cur = s[blob[0]];
      const options = new Set([target]);
      for (const i of blob) for (const v of reg.adj[i]) if (s[v] !== cur) options.add(s[v]);
      for (const c of options) {
        if (c === cur) continue;
        const next = s.slice();
        for (const i of blob) next[i] = c;
        const hit = search(next, left - 1, [...path, { region: blob[0], blob, color: c }]);
        if (hit) return hit;
      }
    }
    return null;
  };
  for (let budget = floorOf(reg.color, target); budget <= reg.n + 1; budget++) {
    dead.clear();
    const plan = search(reg.color, budget, []);
    if (plan) return { min: plan.length, plan, nodes };
  }
  return { min: -1, plan: [], nodes };
}

// ── BRUTE — "Drag one blob around", #329's model scaled up ──────────────────
// Pick a region and never click anywhere else: every click repaints the whole
// grown blob, which is the only thing that ever changes colour. Its own floor is
// the same idea as the optimum's, aimed outward — one click can retire at most
// one colour from OUTSIDE the blob, plus a last coat if the target is not among
// them. Without it a 20-region board costs 12.5M states; with it, ~2,000.
const seedFloor = (reg, blob, cur, target) => {
  const rest = new Set();
  for (let i = 0; i < reg.n; i++) if (!blob.has(i)) rest.add(reg.color[i]);
  if (rest.size === 0) return cur === target ? 0 : 1;
  return rest.size + (rest.has(target) ? 0 : 1);
};

function solveSeed(reg, target) {
  let nodes = 0;
  if (reg.color.every((c) => c === target)) return { min: 0, seed: 0, plan: [], nodes };
  const absorb = (blob, c) => {
    const out = new Set(blob), stack = [...blob];
    while (stack.length) {
      const u = stack.pop();
      for (const v of reg.adj[u]) if (!out.has(v) && reg.color[v] === c) { out.add(v); stack.push(v); }
    }
    return out;
  };
  const grow = (blob, cur, left, path) => {
    nodes++;
    const need = seedFloor(reg, blob, cur, target);
    if (need === 0) return path;
    if (need > left) return null;
    const options = new Set([target]);
    for (const i of blob) for (const v of reg.adj[i]) if (!blob.has(v)) options.add(reg.color[v]);
    for (const c of options) {
      if (c === cur) continue;
      const grown = absorb(blob, c);
      const hit = grow(grown, c, left - 1, [...path, { color: c, blob: [...grown] }]);
      if (hit) return hit;
    }
    return null;
  };
  for (let limit = 1; limit <= reg.n + 1; limit++)
    for (let seed = 0; seed < reg.n; seed++) {
      const plan = grow(new Set([seed]), reg.color[seed], limit, []);
      if (plan) return { min: limit, seed, plan, nodes };
    }
  return { min: -1, seed: 0, plan: [], nodes };
}

// #363's rule as a yardstick, and it needs no search at all: if every click must
// paint the target, a click can only ever convert one original region (target
// blobs merge, but merging never saves a click), so the cost is exactly the
// number of regions that are not already the target.
const targetOnlyCost = (reg, target) => reg.color.filter((c) => c !== target).length;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .b3-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
    .b3-row .lab { font:600 12px var(--sans); color:var(--muted); }
    .b3-sw { width:26px; height:26px; border-radius:7px; border:2px solid var(--border); cursor:pointer;
             display:flex; align-items:center; justify-content:center; font:800 12px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b3-sw:hover { transform:scale(1.12); }
    .b3-sw.on { border-color:#fff; box-shadow:0 0 0 2px var(--accent); }
    .b3-main { display:flex; gap:22px; align-items:flex-start; flex-wrap:wrap; margin:6px 0 12px; }
    .b3-grid { display:grid; gap:5px; width:max-content; }
    .b3-cell { width:40px; height:40px; border-radius:8px; border:2px solid rgba(0,0,0,.28); cursor:pointer;
               display:flex; align-items:center; justify-content:center; font:800 15px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b3-cell:hover { transform:scale(1.08); border-color:#fff; }
    .b3-cell.seed { box-shadow:0 0 0 3px #fff, 0 0 12px 2px var(--accent); z-index:2; }
    .b3-cell.hit { animation:b3pop .4s cubic-bezier(.2,1.4,.4,1); }
    @keyframes b3pop { 0%{ transform:scale(.4); } 100%{ transform:scale(1); } }
    .b3-graph { border:1px solid var(--border); border-radius:10px; background:#0a0e14; padding:4px; }
    .b3-graph text { font:800 10px var(--mono); fill:#0a0e14; }
    .b3-cap { font:600 10.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
    .b3-info { font:13px var(--mono); color:var(--text); background:#0a0e14; border:1px solid var(--border);
               border-radius:8px; padding:9px 12px; max-width:520px; line-height:1.6; }
    .b3-info b { color:var(--accent); }
    .b3-rungs { max-width:520px; }
    .b3-dot { display:inline-block; width:11px; height:11px; border-radius:3px; vertical-align:-1px; margin-right:4px; border:1px solid rgba(0,0,0,.35); }
  `));
}

// Region-graph picture: nodes sit at their region's centroid so the graph reads
// as an X-ray of the board, then relax apart so two centroids never overlap.
function graphSVG(reg, state, opts = {}) {
  const step = 40, pad = 22;
  const w = pad * 2 + (reg.C - 1) * step, h = pad * 2 + (reg.R - 1) * step;
  const pos = reg.cells.map((cs) => {
    const y = cs.reduce((a, p) => a + p[0], 0) / cs.length, x = cs.reduce((a, p) => a + p[1], 0) / cs.length;
    return [pad + x * step, pad + y * step];
  });
  const rad = reg.cells.map((cs) => Math.min(17, 8 + 3.4 * Math.sqrt(cs.length)));
  for (let it = 0; it < 60; it++) for (let i = 0; i < reg.n; i++) for (let j = i + 1; j < reg.n; j++) {
    let dx = pos[j][0] - pos[i][0], dy = pos[j][1] - pos[i][1];
    let d = Math.hypot(dx, dy) || 0.01;
    const want = rad[i] + rad[j] + 5;
    if (d >= want) continue;
    if (d < 0.05) { dx = (i % 2 ? 1 : -1); dy = (j % 2 ? 1 : -1); d = Math.hypot(dx, dy); }
    const push = (want - d) / 2;
    pos[i][0] -= (dx / d) * push; pos[i][1] -= (dy / d) * push;
    pos[j][0] += (dx / d) * push; pos[j][1] += (dy / d) * push;
  }
  const bx = 6;
  const minX = Math.min(...pos.map((p, i) => p[0] - rad[i])) - bx, maxX = Math.max(...pos.map((p, i) => p[0] + rad[i])) + bx;
  const minY = Math.min(...pos.map((p, i) => p[1] - rad[i])) - bx, maxY = Math.max(...pos.map((p, i) => p[1] + rad[i])) + bx;
  const vw = Math.max(maxX - minX, w), vh = Math.max(maxY - minY, h);
  let out = `<svg class="b3-graph" viewBox="${minX} ${minY} ${vw} ${vh}" width="${Math.min(230, vw * 1.1)}" height="${Math.min(260, vh * 1.1)}">`;
  for (let u = 0; u < reg.n; u++) for (const v of reg.adj[u]) if (v > u)
    out += `<line x1="${pos[u][0]}" y1="${pos[u][1]}" x2="${pos[v][0]}" y2="${pos[v][1]}" stroke="${state[u] === state[v] ? "#8b949e" : "#30363d"}" stroke-width="${state[u] === state[v] ? 2.4 : 1.3}"/>`;
  for (let i = 0; i < reg.n; i++)
    out += `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="${rad[i]}" fill="${COLOR[state[i]] || "#30363d"}" stroke="${opts.seed === i ? "#fff" : "rgba(0,0,0,.4)"}" stroke-width="${opts.seed === i ? 3 : 1.5}"/>`
         + `<text x="${pos[i][0]}" y="${pos[i][1] + 3.5}" text-anchor="middle">${i + 1}</text>`;
  return out + `</svg>`;
}

const swatch = (c) => `<span class="b3-dot" style="background:${COLOR[c]}"></span><b>"${c}"</b>`;

// ── The board demo, shared by both approaches ───────────────────────────────
// mode "seed": solve with the one-seed strategy and show which seed won.
// mode "free": solve optimally, and offer a PLAY mode where your own clicks race
// the computed minimum — losing to the optimum is the fastest way to feel why
// the colour choice matters.
function mountBoard(mode) {
  return function mount(host) {
    ensureStyle();
    let ci = 7;                                       // both open on "two flanks", the case where the approaches split
    let grid = CASES[ci].grid.map((r) => [...r]);
    let target = CASES[ci].target;
    let brush = "Y";
    let playing = false;
    let state = null, clicks = 0, lastHit = [];

    const presetRow = el("div", "b3-row");
    presetRow.append(el("span", "lab", "case"));
    const chips = CASES.map((cs, i) => {
      const c = el("button", "chip" + (i === ci ? " on" : ""), cs.label);
      c.onclick = () => { ci = i; grid = cs.grid.map((r) => [...r]); target = cs.target; playing = false; chips.forEach((x, xi) => x.classList.toggle("on", xi === i)); draw(); };
      presetRow.append(c); return c;
    });

    const tgtRow = el("div", "b3-row");
    tgtRow.append(el("span", "lab", "target colour"));
    const tsw = PALETTE.map((v) => {
      const s = el("div", "b3-sw", v); s.style.background = COLOR[v];
      s.onclick = () => { target = v; playing = false; draw(); };
      tgtRow.append(s); return s;
    });

    const brushRow = el("div", "b3-row");
    brushRow.append(el("span", "lab", "brush"));
    const bsw = PALETTE.map((v) => {
      const s = el("div", "b3-sw", v); s.style.background = COLOR[v];
      s.onclick = () => { brush = v; draw(); };
      brushRow.append(s); return s;
    });

    const sizeRow = el("div", "b3-row");
    sizeRow.append(el("span", "lab", "board"));
    const mkSize = (txt, fn) => { const b = el("button", "chip", txt); b.onclick = () => { fn(); playing = false; draw(); }; sizeRow.append(b); return b; };
    mkSize("− row", () => { if (grid.length > 2) grid.pop(); });
    mkSize("+ row", () => { if (grid.length < MAXR) grid.push(grid[grid.length - 1].map((c) => c)); });
    mkSize("− col", () => { if (grid[0].length > 2) grid.forEach((r) => r.pop()); });
    mkSize("+ col", () => { if (grid[0].length < MAXC) grid.forEach((r) => r.push(r[r.length - 1])); });
    sizeRow.append(el("span", "lab", `max ${MAXR}×${MAXC} — freeCodeCamp's largest board, and about as far as an exponential search stays quick; paint 20 different regions and it really does take a second`));

    let playRow = null, playBtn = null, resetBtn = null;
    if (mode === "free") {
      playRow = el("div", "b3-row");
      playRow.append(el("span", "lab", "mode"));
      playBtn = el("button", "chip", "✎ editing — click to play");
      resetBtn = el("button", "chip", "↺ restart");
      playBtn.onclick = () => { playing = !playing; if (playing) { state = null; clicks = 0; } draw(); };
      resetBtn.onclick = () => { state = null; clicks = 0; draw(); };
      playRow.append(playBtn, resetBtn);
    }

    const main = el("div", "b3-main");
    const gridBox = el("div"), graphBox = el("div");
    main.append(gridBox, graphBox);
    const resLine = el("div", "result-line");
    const info = el("div", "b3-info");
    const rungs = el("div", "ladder b3-rungs");
    host.append(presetRow, tgtRow, brushRow, sizeRow);
    if (playRow) host.append(playRow);
    host.append(main, resLine, info, rungs);

    function cellClick(r, c) {
      const reg = regionize(grid);
      if (!playing) { grid[r][c] = brush; draw(); return; }
      if (state === null) state = reg.color.slice();
      const k = reg.id[r][c];
      if (state[k] === brush) { lastHit = []; draw({ nudge: `That blob is already ${swatch(brush)} — a click that changes nothing still would not count, so pick another colour.` }); return; }
      const blob = blobsOf(reg, state).find((b) => b.includes(k));
      blob.forEach((i) => { state[i] = brush; });
      clicks++;
      lastHit = blob;
      draw();
    }

    // Both searches are exponential in the worst case, and draw() runs on every
    // swatch and toggle. Re-solve only when the board or the target actually
    // changed, so picking a brush colour never re-runs a search.
    let cache = { key: null };
    function draw(x = {}) {
      const reg = regionize(grid);
      const view = playing && state ? state : reg.color;
      const key = grid.map((r) => r.join("")).join("/") + "|" + target;
      if (cache.key !== key) cache = { key, free: solveFree(reg, target), seed: solveSeed(reg, target), only: targetOnlyCost(reg, target) };
      const free = cache.free, seed = cache.seed, only = cache.only;
      tsw.forEach((s, i) => s.classList.toggle("on", PALETTE[i] === target));
      bsw.forEach((s, i) => s.classList.toggle("on", PALETTE[i] === brush));
      if (playBtn) { playBtn.textContent = playing ? "▶ playing — click to edit" : "✎ editing — click to play"; playBtn.classList.toggle("on", playing); }

      gridBox.innerHTML = "";
      gridBox.append(el("div", "b3-cap", "board"));
      const g = el("div", "b3-grid");
      g.style.gridTemplateColumns = `repeat(${reg.C}, 40px)`;
      for (let r = 0; r < reg.R; r++) for (let c = 0; c < reg.C; c++) {
        const k = reg.id[r][c], v = view[k];
        const on = !playing && mode === "seed" && seed.seed === k && seed.min > 0;
        const cell = el("div", "b3-cell" + (on ? " seed" : "") + (lastHit.includes(k) ? " hit" : ""), v);
        cell.style.background = COLOR[v] || "var(--panel-2)";
        cell.onclick = () => cellClick(r, c);
        g.append(cell);
      }
      gridBox.append(g);

      graphBox.innerHTML = `<div class="b3-cap">region graph · ${reg.n} node${reg.n === 1 ? "" : "s"}</div>` +
        graphSVG(reg, view, { seed: !playing && mode === "seed" && seed.min > 0 ? seed.seed : -1 });

      const solved = view.every((c) => c === target);
      const shown = mode === "seed" ? seed.min : free.min;
      const work = mode === "seed" ? seed.nodes : free.nodes;
      resLine.innerHTML =
        `<span class="badge ${mode === "seed" && seed.min > free.min ? "no" : "ok"}">${shown} click${shown === 1 ? "" : "s"}</span>` +
        `<span class="opcount ${work > 400 ? "hot" : "cool"}"><span class="n">${work}</span> states searched</span>` +
        `<span class="tag">true minimum ${free.min}</span>` +
        `<span class="tag">one seed ${seed.min}</span>` +
        `<span class="tag">#363 rule (target only) ${only}</span>`;

      if (x.nudge) info.innerHTML = x.nudge;
      else if (playing) {
        info.innerHTML = solved
          ? `<b>${clicks}</b> click${clicks === 1 ? "" : "s"} — the minimum is <b>${free.min}</b>. ` +
            (clicks === free.min ? `That is optimal. ` : `${clicks - free.min} over par. `) +
            `Painting only ${swatch(target)} would have cost <b>${only}</b>. Hit <b>↺ restart</b> to try again.`
          : `Pick a <b>brush</b> colour, then click any cell — the whole blob under it takes that colour. ` +
            `Get every cell to ${swatch(target)}. You are on click <b>${clicks}</b>; the minimum is <b>${free.min}</b>.`;
      } else if (mode === "seed") {
        info.innerHTML = seed.min === 0
          ? `Every region already holds ${swatch(target)} — <b>0</b> clicks, and the search never starts.`
          : `Best single seed: <b>region ${seed.seed + 1}</b> (ringed), finishing in <b>${seed.min}</b> click${seed.min === 1 ? "" : "s"} after searching <b>${seed.nodes}</b> blob states. ` +
            (seed.min > free.min
              ? `The true minimum is <b>${free.min}</b> — dragging one blob around costs ${seed.min - free.min} extra click${seed.min - free.min === 1 ? "" : "s"} here, because the cheap move is to paint an outlying region <i>directly</i>.`
              : `Here that ties the true minimum of <b>${free.min}</b> — this strategy is not wrong, it is just not always optimal.`) +
          ` <span class="muted">Pick a brush and click a cell to redraw the board.</span>`;
      } else {
        info.innerHTML = free.min === 0
          ? `Every region already holds ${swatch(target)} — <b>0</b> clicks. The floor is <code class="inl">1 − 1 = 0</code>, so iterative deepening returns before it searches anything.`
          : `Minimum <b>${free.min}</b> click${free.min === 1 ? "" : "s"} over <b>${reg.n}</b> region${reg.n === 1 ? "" : "s"}, found after <b>${free.nodes}</b> state${free.nodes === 1 ? "" : "s"}. ` +
            `Painting only ${swatch(target)} — #363's rule — would cost <b>${only}</b>, one click per non-target region` +
            (only > free.min ? `; the <b>${only - free.min}</b> saved click${only - free.min === 1 ? "" : "s"} are what the intermediate colours buy. ` : `, which happens to tie here. `) +
            (seed.min > free.min
              ? `Dragging <i>one</i> blob around — the other tab — costs <b>${seed.min}</b>: the cheap move here is to paint an outlying region <b>directly</b> rather than drag one blob out to it.`
              : `One seed would also manage <b>${seed.min}</b> on this board.`) +
            ` <span class="muted">Pick a brush and click a cell to redraw the board, or switch to <b>▶ play</b>.</span>`;
      }

      rungs.innerHTML = "";
      const plan = mode === "seed" ? seed.plan : free.plan;
      if (!playing && plan.length) {
        rungs.append(el("div", "b3-cap", mode === "seed" ? "the one-seed run" : "an optimal plan"));
        let live = reg.color.slice();
        plan.forEach((p, i) => {
          const before = live.slice();
          const grew = (p.blob || []).filter((k) => before[k] !== p.color).length;
          (p.blob || []).forEach((k) => { live[k] = p.color; });
          const where = mode === "seed" ? `repaint the blob` : `click region ${p.region + 1}`;
          rungs.append(el("div", "rung", `<span>${i + 1}. ${where} → ${swatch(p.color)}</span><span class="v">${grew} region${grew === 1 ? "" : "s"} now that colour</span>`));
        });
      }
      lastHit = [];
    }

    draw();
  };
}

// ── STEP: free search — the iterative deepening, line by line ───────────────
// Five short cases. The frames ARE the recursion: each live search() call is a
// frame carrying its own board state `s` and its remaining budget, so a failed
// branch visibly pops back off. Cases picked so no trace runs long: case 1 never
// enters the search at all, case 2 finishes on the first click.
const CASES_FREE = [CASES[1], CASES[0], CASES[7], CASES[6], CASES[2]];

const SRC_FREE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> { color, adj } = <span class="fn">collapseToRegions</span>(<span class="tok" data-t="reg">grid</span>);  <span class="cm">// regions, never cells</span>` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="floor">floor</span> = s =&gt; distinct(s).size - (s has target ? 1 : 0);` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="dead">dead</span> = <span class="k">new</span> Map();                     <span class="cm">// colourings already refuted</span>` },
  { ln: 5, html: `  <span class="k">function</span> <span class="fn">search</span>(s, left) {              <span class="cm">// finish within left clicks?</span>` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="need">need</span> = <span class="fn">floor</span>(s);             <span class="cm">// clicks this colouring owes</span>` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="win">need === 0</span>) <span class="k">return</span> <span class="k">true</span>;          <span class="cm">// every region is the target</span>` },
  { ln: 8, html: `    <span class="k">if</span> (<span class="tok" data-t="prune">need &gt; left</span>) <span class="k">return</span> <span class="k">false</span>;       <span class="cm">// no budget can reach it</span>` },
  { ln: 9, html: `    <span class="k">if</span> (<span class="tok" data-t="memo">dead.<span class="fn">get</span>(key(s)) &gt;= left</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 10, html: `    dead.<span class="fn">set</span>(key(s), left);` },
  { ln: 11, html: `    <span class="k">for</span> (<span class="k">const</span> blob <span class="k">of</span> <span class="tok" data-t="blobs">blobsOf(s)</span>)         <span class="cm">// ANY blob may be clicked</span>` },
  { ln: 12, html: `      <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> <span class="tok" data-t="cols">coloursTouching(blob)</span>) <span class="cm">// with ANY colour</span>` },
  { ln: 13, html: `        <span class="k">if</span> (<span class="fn">search</span>(<span class="fn">paint</span>(s, blob, c), left - 1)) <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 14, html: `    <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 15, html: `  }` },
  { ln: 16, html: `` },
  { ln: 17, html: `  <span class="k">for</span> (<span class="k">let</span> budget = <span class="tok" data-t="budget">floor(color)</span>; ; budget++)  <span class="cm">// shortest answer first</span>` },
  { ln: 18, html: `    <span class="k">if</span> (<span class="fn">search</span>(color, budget)) <span class="k">return</span> budget;` },
  { ln: 19, html: `}` },
];

function traceFree(caseIndex) {
  const idx = Math.max(0, Math.min(CASES_FREE.length - 1, (caseIndex | 0) - 1));
  const cs = CASES_FREE[idx];
  const reg = regionize(cs.grid), target = cs.target;
  const steps = [];
  const stack = [];                   // live search() frames, bottom → top
  const live = {};                    // vars of the outer bucketFill frame
  const fmt = (s) => s.map((c, i) => `${i + 1}·${c}`);
  const snap = (line, o = {}) => {
    const vars = {}; for (const k in live) vars[k] = live[k];
    const structs = [];
    if (line >= 2) structs.push({ label: "color", items: fmt(reg.color) });
    const frames = [{ title: `bucketFill(grid, "${target}")`, vars, changed: o.changed || [], structs, ret: o.ret }];
    stack.forEach((f) => frames.push({
      title: `search(s, left = ${f.left})`,
      vars: { left: f.left, need: floorOf(f.s, target), ...(f.pick ? { c: f.pick } : {}) },
      changed: f.changed || [],
      structs: [{ label: "s", items: fmt(f.s), newest: !!f.fresh }],
      ret: f.ret,
    }));
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result, frames });
  };

  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label} · target "${target}".</b> A ${reg.R}×${reg.C} board. The question is the fewest clicks, and a click may paint <i>any</i> colour — so this is a shortest-sequence search, not a formula.`, focus: "tc" });
  snap(2, { note: `Collapse the board into <b>${reg.n}</b> connected same-colour region${reg.n === 1 ? "" : "s"}. A click repaints a whole region at once, so a single cell was never the unit of anything — the search runs on this graph, and <b>color</b> holds one entry per node.`, focus: "reg" });
  const f0 = floorOf(reg.color, target);
  snap(3, { note: `The <b>floor</b> is a function, not a number: one click paints one blob one colour, so it can retire at most <b>one colour</b> from whatever board it is handed. On the starting colouring, ${new Set(reg.color).size} colour${new Set(reg.color).size === 1 ? "" : "s"} are present${reg.color.includes(target) ? ` and one of them is already "${target}"` : ` and "${target}" is not among them`}, so no plan is shorter than <b>${f0}</b>.`, focus: "floor" });
  snap(4, { note: `A map of <b>refuted colourings</b>. Different click orders land on the same board, and re-proving that a board is hopeless is the single biggest waste in a search like this.`, focus: "dead" });

  if (f0 === 0) {
    snap(17, { note: `Iterative deepening starts at the floor, and the floor is <b>0</b> — every region already holds "${target}".`, focus: "budget" });
    snap(7, { note: `<code class="inl">search(color, 0)</code> computes <b>need = 0</b> and the win test fires straight away. <b>Return 0.</b> Nothing is searched; the answer was in the colouring all along.`, focus: "win", eval: { expr: `need === 0`, val: true }, done: true, result: "0", ret: { value: 0 } });
    return steps;
  }

  let answer = null;
  for (let budget = f0; budget <= reg.n + 1 && answer === null; budget++) {
    live.budget = budget;
    snap(17, { note: budget === f0
      ? `Try the floor first: can it be done in <b>${budget}</b> click${budget === 1 ? "" : "s"}? Deepening one level at a time is what makes the first success the <i>minimum</i> rather than merely a plan.`
      : `Depth <b>${budget - 1}</b> was refuted, so raise the budget to <b>${budget}</b> and search again. Re-searching the shallow part is cheap next to the risk of returning a non-minimal answer.`,
      focus: "budget", changed: ["budget"] });

    const dead = new Map();
    const search = (s, left) => {
      const fr = { s, left };
      stack.push(fr);
      const need = floorOf(s, target);
      if (need === 0) {
        snap(7, { note: `Every region is "${target}" — this branch is a finished board, so the whole chain of calls above it succeeds.`, focus: "win", eval: { expr: `need === 0`, val: true } });
        fr.ret = { value: true };
        snap(7, { note: `Unwind: <code class="inl">search</code> returns <b>true</b>.`, focus: "win" });
        stack.pop();
        return true;
      }
      snap(7, { note: `Not finished — <b>${new Set(s).size}</b> colour${new Set(s).size === 1 ? "" : "s"} still on the board, so the win test fails.`, focus: "win", eval: { expr: `need === 0`, val: false } });
      if (need > left) {
        snap(8, { note: `The floor says <b>${need}</b> more click${need === 1 ? "" : "s"} are needed and only <b>${left}</b> remain — abandon the branch <i>without</i> generating a single move. This prune is why an exponential search stays instant on boards this size.`, focus: "prune", eval: { expr: `need = ${need} > left = ${left}`, val: true } });
        fr.ret = { value: false };
        snap(8, { note: `Unwind: this branch cannot pay for itself.`, focus: "prune" });
        stack.pop();
        return false;
      }
      snap(8, { note: `Floor <b>${need}</b> fits inside the remaining budget <b>${left}</b>, so the branch is still worth exploring.`, focus: "prune", eval: { expr: `need = ${need} > left = ${left}`, val: false } });
      const key = s.join("");
      const stale = (dead.get(key) ?? -1) >= left;
      snap(9, { note: stale
        ? `This exact colouring was already refuted with at least <b>${left}</b> clicks in hand, so it cannot suddenly work now — drop it. Different click orders reach the same board, which is why the map earns its keep.`
        : `First time this colouring has been reached with <b>${left}</b> clicks in hand, so it still has to be tried.`,
        focus: "memo", eval: { expr: `dead.get(key) >= ${left}`, val: stale } });
      if (stale) {
        fr.ret = { value: false };
        stack.pop();
        return false;
      }
      dead.set(key, left);
      const blobs = blobsOf(reg, s);
      snap(11, { note: `The board is <b>${blobs.length}</b> blob${blobs.length === 1 ? "" : "s"} right now. <b>Every one of them is clickable</b> — that is the freedom #363 does not have, and it is why a greedy rule cannot decide the next move.`, focus: "blobs" });
      for (const blob of blobs) {
        const cur = s[blob[0]];
        const options = new Set([target]);
        for (const i of blob) for (const v of reg.adj[i]) if (s[v] !== cur) options.add(s[v]);
        options.delete(cur);
        snap(12, { note: `Blob {${blob.map((i) => i + 1).join(",")}} is "${cur}". Worth trying: ${[...options].map((c) => `"${c}"`).join(", ")} — every colour that touches it (each swallows a different set of neighbours) plus the target, which is the only useful colour that need not touch anything.`, focus: "cols" });
        for (const c of options) {
          const next = s.slice();
          for (const i of blob) next[i] = c;
          const gained = next.filter((v, i) => v === c && s[i] !== c).length - blob.length;
          fr.pick = `"${c}"`;
          fr.changed = ["c"];
          snap(13, { note: `Paint blob {${blob.map((i) => i + 1).join(",")}} ${swatch(c)}${gained > 0 ? ` — it merges with <b>${gained}</b> neighbouring region${gained === 1 ? "" : "s"} of that colour, for free` : ` — nothing merges, but it may set up the next click`}. Recurse with one click less.`, focus: "cols" });
          fr.changed = [];
          if (search(next, left - 1)) { fr.ret = { value: true }; snap(13, { note: `The recursive call succeeded, so this click is part of a plan of length <b>${budget}</b>. Return <b>true</b> straight up the stack.`, focus: "cols" }); stack.pop(); return true; }
        }
        delete fr.pick;
      }
      snap(14, { note: `Every blob × every colour failed inside the budget — this position needs more clicks than it has. Return <b>false</b> and let the caller try its next colour.`, focus: "prune" });
      fr.ret = { value: false };
      stack.pop();
      return false;
    };

    if (search(reg.color, budget)) answer = budget;
    else snap(18, { note: `<code class="inl">search</code> came back false: <b>${budget}</b> click${budget === 1 ? "" : "s"} is provably not enough. Loop round and allow one more.`, focus: "budget", eval: { expr: `search(color, ${budget})`, val: false } });
  }

  snap(18, { note: `The first budget that succeeded is <b>${answer}</b>, and every smaller one was refuted — so <b>${answer}</b> is the minimum, not just a plan that works.`, focus: "budget", done: true, result: String(answer), ret: { value: answer } });
  return steps;
}

// ── STEP: drag one blob around — #329's model scaled up, line by line ───────
// The brute side traced. `blob` is the only thing that ever changes: it starts as
// one region and each click repaints all of it, so the frontier is whatever the
// blob currently touches. Four short cases; case 4 is the one where this loses.
const CASES_SEED = [CASES[0], CASES[1], CASES[2], CASES[7]];

const SRC_SEED = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> { color, adj } = <span class="fn">collapseToRegions</span>(<span class="tok" data-t="reg">grid</span>);` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="guard">color.every(c =&gt; c === targetColor)</span>) <span class="k">return</span> 0;` },
  { ln: 4, html: `` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="floor">floor</span> = (blob, cur) =&gt; {        <span class="cm">// clicks still owed</span>` },
  { ln: 6, html: `    <span class="k">const</span> rest = <span class="fn">coloursOutside</span>(blob);   <span class="cm">// one click retires one</span>` },
  { ln: 7, html: `    <span class="k">if</span> (rest.size === 0) <span class="k">return</span> cur === targetColor ? 0 : 1;` },
  { ln: 8, html: `    <span class="k">return</span> rest.size + (rest.<span class="fn">has</span>(targetColor) ? 0 : 1);` },
  { ln: 9, html: `  };` },
  { ln: 10, html: `` },
  { ln: 11, html: `  <span class="k">function</span> <span class="fn">grow</span>(blob, cur, left) {        <span class="cm">// ONE blob, forever</span>` },
  { ln: 12, html: `    <span class="k">if</span> (<span class="tok" data-t="win">floor(blob, cur) === 0</span>) <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 13, html: `    <span class="k">if</span> (<span class="tok" data-t="prune">floor(blob, cur) &gt; left</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 14, html: `    <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> <span class="tok" data-t="touch">coloursTouching(blob)</span>)  <span class="cm">// one colour per click</span>` },
  { ln: 15, html: `      <span class="k">if</span> (<span class="fn">grow</span>(<span class="tok" data-t="absorb">absorb(blob, c)</span>, c, left - 1)) <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 16, html: `    <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 17, html: `  }` },
  { ln: 18, html: `` },
  { ln: 19, html: `  <span class="k">for</span> (<span class="k">let</span> limit = 1; ; limit++)          <span class="cm">// shortest run first</span>` },
  { ln: 20, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="seed">seed</span> = 0; seed &lt; color.length; seed++)` },
  { ln: 21, html: `      <span class="k">if</span> (<span class="fn">grow</span>(<span class="k">new</span> Set([seed]), color[seed], limit)) <span class="k">return</span> limit;` },
  { ln: 22, html: `}` },
];

function traceSeed(caseIndex) {
  const idx = Math.max(0, Math.min(CASES_SEED.length - 1, (caseIndex | 0) - 1));
  const cs = CASES_SEED[idx];
  const reg = regionize(cs.grid), target = cs.target;
  const steps = [];
  const stack = [];
  const live = {};
  const fmt = (s) => s.map((c, i) => `${i + 1}·${c}`);
  const snap = (line, o = {}) => {
    const vars = {}; for (const k in live) vars[k] = live[k];
    const structs = [];
    if (line >= 2) structs.push({ label: "color", items: fmt(reg.color) });
    const frames = [{ title: `bucketFill(grid, "${target}")`, vars, changed: o.changed || [], structs, ret: o.ret }];
    stack.forEach((f) => frames.push({
      title: `grow(blob, "${f.cur}", left = ${f.left})`,
      vars: { cur: `"${f.cur}"`, left: f.left },
      changed: f.changed || [],
      structs: [{ label: "blob", items: f.blob.map((i) => `${i + 1}`), newest: !!f.fresh }],
      ret: f.ret,
    }));
    steps.push({ line, note: o.note, focus: o.focus, eval: o.eval, done: o.done, result: o.result, frames });
  };

  snap(1, { note: `<b>Case ${idx + 1}: ${cs.label} · target "${target}".</b> The one-seed strategy: pick a region and never click anywhere else, exactly what #329's flood fill does — only now we count the clicks.`, focus: "tc" });
  snap(2, { note: `Collapse to <b>${reg.n}</b> region${reg.n === 1 ? "" : "s"}, one entry each in <b>color</b>. Regions outside the blob never change colour under this strategy, so the original colouring stays valid for the whole run.`, focus: "reg" });

  const done = reg.color.every((c) => c === target);
  snap(3, { note: `Is every region already "${target}"?`, focus: "guard", eval: { expr: `color.every(c => c === "${target}")`, val: done } });
  if (done) {
    snap(3, { note: `Yes — the board is finished, so no click is needed. <b>Return 0.</b>`, focus: "guard", done: true, result: "0", ret: { value: 0 } });
    return steps;
  }

  const absorb = (blob, c) => {
    const out = new Set(blob), st = [...blob];
    while (st.length) { const u = st.pop(); for (const v of reg.adj[u]) if (!out.has(v) && reg.color[v] === c) { out.add(v); st.push(v); } }
    return [...out].sort((a, b) => a - b);
  };
  const owed = (blob, cur) => {
    const rest = new Set();
    for (let i = 0; i < reg.n; i++) if (!blob.includes(i)) rest.add(reg.color[i]);
    if (rest.size === 0) return { need: cur === target ? 0 : 1, rest };
    return { need: rest.size + (rest.has(target) ? 0 : 1), rest };
  };

  snap(5, { note: `Before searching, a way to give up early. Every click absorbs <b>one</b> colour class from outside the blob, so the clicks still owed are at least the number of distinct colours out there — plus a final coat if "${target}" is not one of them.`, focus: "floor" });

  let answer = null;
  for (let limit = 1; limit <= reg.n + 1 && answer === null; limit++) {
    live.limit = limit;
    snap(19, { note: limit === 1
      ? `Try runs of length <b>1</b> first, then 2, then 3 — ascending, so the first seed that finishes gives the shortest run this strategy can manage.`
      : `No seed finished in <b>${limit - 1}</b>. Allow <b>${limit}</b> and start over from seed 1.`, changed: ["limit"] });

    for (let seed = 0; seed < reg.n && answer === null; seed++) {
      live.seed = seed + 1;
      snap(20, { note: `Seed on <b>region ${seed + 1}</b> ("${reg.color[seed]}"). Which region you start from matters — the blob can only ever eat outward from here, so a badly-placed seed pays for it every click.`, focus: "seed", changed: ["seed"] });

      const grow = (blob, cur, left) => {
        const fr = { blob, cur, left };
        stack.push(fr);
        const { need, rest } = owed(blob, cur);
        if (need === 0) {
          snap(12, { note: `Nothing left outside the blob and it is already "${target}" — the board is finished, with <b>${left}</b> click${left === 1 ? "" : "s"} to spare.`, focus: "win", eval: { expr: `floor(blob, cur) === 0`, val: true } });
          fr.ret = { value: true };
          snap(12, { note: `Unwind: <code class="inl">grow</code> returns <b>true</b>.`, focus: "win" });
          stack.pop();
          return true;
        }
        snap(12, { note: `Not finished: ${rest.size ? `<b>${rest.size}</b> colour${rest.size === 1 ? "" : "s"} still outside the blob (${[...rest].map((c) => `"${c}"`).join(", ")})` : `the blob is the whole board but holds "${cur}", not "${target}"`}.`, focus: "win", eval: { expr: `floor(blob, cur) === 0`, val: false } });
        if (need > left) {
          snap(13, { note: `<b>${need}</b> click${need === 1 ? "" : "s"} still owed against <b>${left}</b> left — this run is refuted without trying anything. The floor is what keeps a 20-region board from costing millions of states.`, focus: "prune", eval: { expr: `floor = ${need} > left = ${left}`, val: true } });
          fr.ret = { value: false };
          stack.pop();
          return false;
        }
        snap(13, { note: `<b>${need}</b> owed, <b>${left}</b> left — still affordable, so keep going.`, focus: "prune", eval: { expr: `floor = ${need} > left = ${left}`, val: false } });
        const options = new Set([target]);
        for (const i of blob) for (const v of reg.adj[i]) if (!blob.includes(v)) options.add(reg.color[v]);
        options.delete(cur);
        snap(14, { note: `Colours worth trying from here: ${[...options].map((c) => `"${c}"`).join(", ")}. <b>One click can take only one of them</b> — the whole blob becomes that colour and eats every neighbour holding it, so the blob's frontier decides the branching.`, focus: "touch" });
        for (const c of options) {
          const grown = absorb(blob, c);
          fr.changed = ["cur"];
          snap(15, { note: `Repaint the <i>entire</i> blob ${swatch(c)}: it grows from <b>${blob.length}</b> to <b>${grown.length}</b> region${grown.length === 1 ? "" : "s"}. Note what this costs — the regions already inside the blob are recoloured too, and that is the price of never clicking anywhere else.`, focus: "absorb" });
          fr.changed = [];
          if (grow(grown, c, left - 1)) { fr.ret = { value: true }; snap(15, { note: `The rest of the run worked out. Return <b>true</b>.`, focus: "absorb" }); stack.pop(); return true; }
        }
        snap(16, { note: `Every colour the blob touches led nowhere inside the budget. Return <b>false</b> and let the caller try its next colour.` });
        fr.ret = { value: false };
        stack.pop();
        return false;
      };

      if (grow([seed], reg.color[seed], limit)) answer = limit;
    }
  }

  snap(21, { note: `Seed <b>${live.seed}</b> finished in <b>${answer}</b> click${answer === 1 ? "" : "s"}, and no shorter run existed for any seed. <b>Return ${answer}.</b> This is the best <i>one-seed</i> run — the free search may still beat it.`, done: true, result: String(answer), ret: { value: answer } });
  return steps;
}

export default {
  n: 365, id: "bucketfill3", title: "The Last Challenge: Bucket Fill 3", dates: ["2026-08-10"],
  statement: `Given a 2D grid of single-letter colour strings and a target colour, return the <b>minimum number of flood-fill clicks</b> needed to make the entire grid that colour. A click recolours the clicked cell and its whole 4-connected region of matching cells — and a click may paint <b>any</b> colour, not only the target, so other colours are legal intermediate steps.
  <span class="rule">Example: <code class="inl">bucketFill([["P","P","Y"],["Y","P","Y"],["Y","P","P"]], "O")</code> → <code class="inl">2</code>. Paint the P snake <code class="inl">"Y"</code> and it swallows <i>both</i> Y patches at once; then one coat of <code class="inl">"O"</code>. Painting <code class="inl">"O"</code> every time — the rule in #363 — would cost 3.</span>
  <span class="rule">This is day 365, the last new daily coding challenge freeCodeCamp published: the run opened with #1 "Vowel Balance" on 2025-08-11 and closed exactly a year later on 2026-08-10. The feature was not retired — a later change made the dailies year-agnostic, so they now replay from the start.</span>`,
  variants: [
    {
      name: "Drag one blob around", tone: "brute", cost: "one seed · colours^d",
      approach: `The obvious way to scale <b>#329 Bucket Fill</b> up: pick a region, then <b>never click anywhere else</b>. Every click repaints the whole grown blob and swallows each neighbour holding that colour, so the blob only ever grows outward — the same picture as a flood fill, with a click counter on it. Try each seed, shortest run first, and take the first that finishes. It is a legitimate strategy returning a legitimate count, and it <b>passes every official test</b>. It just is not always the <i>minimum</i>: on case 8 <b>two flanks</b> it drags one blob around for 3 clicks where painting the two outliers directly costs 2. Edit the board or flip the Approach toggle to see the gap.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Collapse the board into regions — connected same-colour components.
  const id: number[][] = grid.map((row) => row.map(() => -1));
  const color: string[] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (id[r][c] !== -1) continue;
    const k = color.length; color.push(grid[r][c]);
    const stack: number[][] = [[r, c]]; id[r][c] = k;
    while (stack.length) {
      const [a, b] = stack.pop()!;
      for (const [dr, dc] of dirs) {
        const na = a + dr, nb = b + dc;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        if (id[na][nb] === -1 && grid[na][nb] === grid[a][b]) { id[na][nb] = k; stack.push([na, nb]); }
      }
    }
  }
  const n = color.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
    const na = r + dr, nb = c + dc;
    if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
    const u = id[r][c], v = id[na][nb];
    if (u !== v && !adj[u].includes(v)) adj[u].push(v);
  }
  if (color.every((c) => c === targetColor)) return 0;

  // Clicks still owed: one click absorbs ONE colour class from outside the blob,
  // and if the target is not out there the run still needs a final coat.
  const floor = (blob: Set<number>, cur: string): number => {
    const rest = new Set<string>();
    for (let i = 0; i < n; i++) if (!blob.has(i)) rest.add(color[i]);
    if (rest.size === 0) return cur === targetColor ? 0 : 1;
    return rest.size + (rest.has(targetColor) ? 0 : 1);
  };

  // One click paints the WHOLE blob, swallowing every neighbour of that colour.
  const absorb = (blob: Set<number>, c: string): Set<number> => {
    const out = new Set(blob), stack = [...blob];
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj[u]) if (!out.has(v) && color[v] === c) { out.add(v); stack.push(v); }
    }
    return out;
  };

  // Can this seed finish within \`left\` clicks?
  const grow = (blob: Set<number>, cur: string, left: number): boolean => {
    const need = floor(blob, cur);
    if (need === 0) return true;                 // blob is the board, in the target
    if (need > left) return false;               // this run cannot pay for itself
    const options = new Set<string>([targetColor]);
    for (const i of blob) for (const v of adj[i]) if (!blob.has(v)) options.add(color[v]);
    for (const c of options) {
      if (c === cur) continue;
      if (grow(absorb(blob, c), c, left - 1)) return true;
    }
    return false;
  };

  for (let limit = 1; ; limit++)              // shortest run first
    for (let seed = 0; seed < n; seed++)      // every region gets a turn
      if (grow(new Set([seed]), color[seed], limit)) return limit;
}`,
      mount: mountBoard("seed"),
    },
    {
      name: "Step: drag one blob around", tone: "brute", cost: "the blob, growing",
      approach: `The one-seed run traced. The <b>blob</b> struct is the only thing that moves: it starts as a single region and each click repaints <i>all</i> of it, swallowing every neighbour that holds the chosen colour. Watch the frames stack up and pop — a colour that leads nowhere inside the budget unwinds and the caller tries the next one. Case 4 <b>two flanks</b> is the one that loses: no seed can finish in 2, so the answer comes back 3. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_SEED, trace: traceSeed, input: { label: "case =", value: 4, min: 1, max: CASES_SEED.length, presets: CASES_SEED.map((_, i) => i + 1), hint: `1–${CASES_SEED.length}: pick a scenario` } }),
    },
    {
      name: "Any blob, any colour", tone: "opt", cost: "IDDFS + colour floor",
      approach: `Drop the seed. Any blob may be clicked, with any colour, so the state is just "what colour is each region now" and the answer is the shortest path from the start colouring to the all-target one. Two things make that searchable: <b>iterative deepening</b> — try 1 click, then 2, so the first success is provably the minimum — and an <b>admissible floor</b>: a click paints one blob one colour, so it retires at most one colour from the board, and any position needing more colours retired than it has clicks left is abandoned untried. Switch to <b>▶ play</b> and try to match the number yourself; the readout also prints what #363's always-paint-the-target rule would have cost.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 1. Collapse the board into regions — a click repaints a whole region, so a
  //    single cell is never the unit of anything.
  const id: number[][] = grid.map((row) => row.map(() => -1));
  const color: string[] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (id[r][c] !== -1) continue;
    const k = color.length; color.push(grid[r][c]);
    const stack: number[][] = [[r, c]]; id[r][c] = k;
    while (stack.length) {
      const [a, b] = stack.pop()!;
      for (const [dr, dc] of dirs) {
        const na = a + dr, nb = b + dc;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        if (id[na][nb] === -1 && grid[na][nb] === grid[a][b]) { id[na][nb] = k; stack.push([na, nb]); }
      }
    }
  }
  const n = color.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
    const na = r + dr, nb = c + dc;
    if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
    const u = id[r][c], v = id[na][nb];
    if (u !== v && !adj[u].includes(v)) adj[u].push(v);
  }

  // 2. Admissible floor: one click paints one blob one colour, so it retires at
  //    most one colour. A finished board holds exactly the target.
  const floor = (s: string[]): number => {
    const set = new Set(s);
    return set.size - (set.has(targetColor) ? 1 : 0);
  };

  // Blobs of a state: connected runs of equal colour in the region graph.
  const blobsOf = (s: string[]): number[][] => {
    const seen = new Array(n).fill(false), out: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (seen[i]) continue;
      const stack = [i], group = [i]; seen[i] = true;
      while (stack.length) {
        const u = stack.pop()!;
        for (const v of adj[u]) if (!seen[v] && s[v] === s[u]) { seen[v] = true; stack.push(v); group.push(v); }
      }
      out.push(group);
    }
    return out;
  };

  // 3. Depth-limited search. Refutations are memoised: many click orders reach
  //    the same colouring, and re-refuting one is pure waste.
  const dead = new Map<string, number>();
  const search = (s: string[], left: number): boolean => {
    const need = floor(s);
    if (need === 0) return true;                    // every region is the target
    if (need > left) return false;                  // the floor kills the branch
    const key = s.join("");
    if ((dead.get(key) ?? -1) >= left) return false;
    dead.set(key, left);
    for (const blob of blobsOf(s)) {                // ANY blob may be clicked
      const cur = s[blob[0]];
      const options = new Set<string>([targetColor]);
      for (const i of blob) for (const v of adj[i]) if (s[v] !== cur) options.add(s[v]);
      for (const c of options) {                    // with ANY colour
        if (c === cur) continue;
        const next = s.slice();
        for (const i of blob) next[i] = c;
        if (search(next, left - 1)) return true;
      }
    }
    return false;
  };

  // 4. Iterative deepening, starting at the floor: the first depth that works
  //    is the minimum, not merely a plan that happens to work.
  for (let budget = floor(color); ; budget++) {
    dead.clear();
    if (search(color, budget)) return budget;
  }
}`,
      mount: mountBoard("free"),
    },
    {
      name: "Step: free search", tone: "opt", cost: "the floor, pruning",
      approach: `The optimal search traced. Each live <code class='inl'>search</code> call is a frame carrying its own colouring <b>s</b> and its remaining budget, so a refuted branch visibly pops off. Two lines do the work: line 8 abandons any position whose <b>need</b> exceeds the clicks left — untried, no moves generated — and line 17 raises the budget only after the whole shallower tree is refuted, which is what makes the answer a minimum. Case 1 <b>already done</b> returns before searching anything; case 3 <b>two flanks</b> shows the optimum clicking two <i>different</i> regions. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_FREE, trace: traceFree, input: { label: "case =", value: 3, min: 1, max: CASES_FREE.length, presets: CASES_FREE.map((_, i) => i + 1), hint: `1–${CASES_FREE.length}: pick a scenario` } }),
    },
  ],
};
