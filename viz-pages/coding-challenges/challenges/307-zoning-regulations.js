// #307 · Zoning Regulations — the ban table is symmetric, so violations come in pairs.
// ONE APPROACH, deliberately. Visiting every cell and reading its up-to-4
// orthogonal neighbours IS the algorithm: there is no wasteful act you could name
// without making the code wrong, and no second mental model to compare it to (no
// search to prune, no re-scan to remember, no closed form hiding in a 5-label
// table). So this ships `Solution` + `Step through`, the gallery's normal shape.
//
// The two things that decide correctness are both in the table, not in the loop:
//   • The labels are CASE-SENSITIVE — "i" is industrial, "I" is institutional,
//     and "i" cannot sit next to "I". Lower-case one of them and cases 2 and 5 die.
//   • Read the table one-directionally, exactly as freeCodeCamp writes it — a cell
//     is flagged when ITS OWN row names the neighbour. You never need to also ask
//     "does the neighbour's row name me?", because the transcribed table is already
//     symmetric: i↔R, i↔I, A↔C, R↔C. Both readings return the same answer on every
//     input, so the choice is invisible to the grader — but the symmetry is what
//     makes the minimum non-empty answer TWO cells, never one.
import { el, mountDebugger } from "../shared.js";

// The adjacency table, transcribed verbatim from the problem statement. This one
// constant feeds the statement's table, the demo's legend, the debugger's struct
// panel AND the `code` snippet below — so none of them can drift from each other.
const CANNOT = { i: ["R", "I"], A: ["C"], R: ["i", "C"], I: ["i"], C: ["R", "A"], "": [] };
const ZONES = [
  { k: "i", name: "industrial", color: "var(--muted)" },
  { k: "A", name: "Agricultural", color: "var(--warn)" },
  { k: "R", name: "Residential", color: "var(--good)" },
  { k: "I", name: "Institutional", color: "var(--c4)" },
  { k: "C", name: "Commercial", color: "var(--accent)" },
  { k: "", name: "undeveloped", color: "" },
];
const NAME = Object.fromEntries(ZONES.map((z) => [z.k, z.name]));
const COLOR = Object.fromEntries(ZONES.map((z) => [z.k, z.color]));
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];           // up, down, left, right
const DIRNAME = { "-1,0": "above", "1,0": "below", "0,-1": "left of", "0,1": "right of" };

const lbl = (v) => (v === "" ? '""' : `"${v}"`);
const pair = ([r, c]) => `[${r}, ${c}]`;
const listOut = (out) => (out.length ? `[${out.map(pair).join(", ")}]` : "[]");

// ── the graded function, plus the per-cell evidence the demo needs ───────────
// getZoneViolations() below is the shipped `code` verbatim. `report()` runs the
// same scan but collects EVERY offending neighbour instead of breaking at the
// first, because the demo has to be able to show you which pair broke the rule.
// Its `out` is identical to getZoneViolations()'s — a cell is listed once either
// way; the extra offenders only feed the hover explanation.
function report(grid) {
  const out = [], offenders = {};
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const banned = CANNOT[grid[r][c]] ?? [];
      const hits = [];
      for (const [dr, dc] of DIRS) {
        const nb = grid[r + dr]?.[c + dc];
        if (nb !== undefined && banned.includes(nb)) hits.push([r + dr, c + dc]);
      }
      offenders[r + "," + c] = hits;
      if (hits.length) out.push([r, c]);
    }
  }
  return { out, offenders };
}

// ── curated cases ───────────────────────────────────────────────────────────
// PROVENANCE: cases 1–5 are freeCodeCamp's five official tests, verbatim and in
// the order the grader lists them, with the documented expected output attached
// so the demo can prove it matches. Cases 6–7 are invented, and each lands on a
// branch the official set never exercises:
//   6 — one cell with FOUR banned neighbours at once. The official set never has
//       a cell offend more than once, so nothing there answers "is it listed once
//       or once per offender?". It is once: the scan breaks after the first hit.
//   7 — a 1×5 strip: every cell has at most two neighbours, so the up/down probes
//       fall off the grid on every single cell. It also puts "i" next to "I",
//       the case-sensitivity trap, on its own row.
const CASES = [
  { label: "official 1 · 2×2", grid: [["R", "C"], ["", "C"]], expect: "[[0, 0], [0, 1]]" },
  { label: "official 2 · 3×2", grid: [["", "i"], ["", "R"], ["R", "I"]], expect: "[[0, 1], [1, 1]]" },
  { label: "official 3 · all legal", grid: [["A", "i", "C"], ["A", "", "C"], ["R", "R", "I"]], expect: "[]" },
  { label: "official 4 · 3×5", grid: [["R", "R", "C", "R", "R"], ["R", "I", "C", "", "A"], ["R", "R", "", "i", "A"]], expect: "[[0, 1], [0, 2], [0, 3]]" },
  { label: "official 5 · 4×6", grid: [["R", "A", "A", "", "i", "i"], ["R", "I", "", "C", "i", "i"], ["R", "", "C", "C", "A", "A"], ["R", "R", "C", "I", "R", "R"]], expect: "[[2, 3], [2, 4], [3, 1], [3, 2]]" },
  { label: "surrounded · 4 offenders, 1 entry", grid: [["", "A", ""], ["A", "C", "A"], ["", "A", ""]] },
  { label: "1×5 strip · i vs I", grid: [["A", "C", "", "i", "I"]] },
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    /* One bespoke, module-prefixed token: a shade DARKER than --bg, used both as the
       ink on a saturated zone tile and as the readout box's background. Derived from
       the kit rather than hardcoded, so a re-theme carries it along. */
    .zon-cell, .zon-sw, .zon-info { --zon-ink: color-mix(in srgb, var(--bg) 70%, black); }
    .zon-wrap { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start; margin:14px 0 10px; }
    .zon-grid { display:grid; gap:6px; width:max-content; }
    .zon-cell { width:48px; height:48px; border-radius:9px; border:2px solid rgba(0,0,0,.35); cursor:pointer;
      display:flex; align-items:center; justify-content:center; font:800 18px var(--mono); color:var(--zon-ink);
      position:relative; transition:transform .1s; }
    .zon-cell:hover { transform:scale(1.07); }
    .zon-cell.empty { background:var(--panel-2); color:var(--muted); border-style:dashed; border-color:var(--border); }
    .zon-cell.bad { box-shadow:0 0 0 3px var(--danger); }
    .zon-cell.bad::after { content:"✗"; position:absolute; top:-7px; right:-6px; width:16px; height:16px;
      display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg);
      font:800 11px var(--sans); color:var(--danger); }
    .zon-cell.pair { box-shadow:0 0 0 3px var(--warn); z-index:2; }
    .zon-cell.focus { box-shadow:0 0 0 3px var(--danger), 0 0 0 7px color-mix(in srgb, var(--danger) 30%, transparent); z-index:3; }
    .zon-sw { width:34px; height:34px; border-radius:8px; border:2px solid var(--border); cursor:pointer;
      display:flex; align-items:center; justify-content:center; font:800 15px var(--mono); color:var(--zon-ink); transition:transform .1s; }
    .zon-sw:hover { transform:scale(1.1); }
    .zon-sw.empty { background:var(--panel-2); color:var(--muted); border-style:dashed; }
    .zon-sw.on { border-color:var(--text); box-shadow:0 0 0 2px var(--accent); }
    .zon-rules .z { font-weight:800; }
    .zon-rules .no { color:var(--danger); font-weight:700; }
    .zon-rules .ok { color:var(--muted); }
    .zon-info { font:12.5px/1.6 var(--mono); color:var(--text); background:var(--zon-ink); border:1px solid var(--border);
      border-radius:8px; padding:10px 12px; max-width:640px; min-height:46px; }
    .zon-info b { color:var(--accent); } .zon-info .x { color:var(--danger); font-weight:800; }
    .zon-info .y { color:var(--warn); font-weight:800; }
    .zon-out { font:13px var(--mono); color:var(--good); word-break:break-word; }
  `));
}

// The rules table, rendered from CANNOT so the legend can never disagree with the
// scan running two functions above it.
const rulesTable = (cls) =>
  `<table class="cmp ${cls}"><thead><tr><th>Label</th><th>Type</th><th>Cannot be adjacent to</th></tr></thead><tbody>` +
  ZONES.map((z) => `<tr><td class="z">${z.k === "" ? "&quot;&quot;" : `"${z.k}"`}</td><td>${z.name}</td>` +
    `<td class="${CANNOT[z.k].length ? "no" : "ok"}">${CANNOT[z.k].length ? CANNOT[z.k].map((x) => `"${x}"`).join(", ") : "no restrictions"}</td></tr>`).join("") +
  `</tbody></table>`;

// ── Solution demo — paint your own city, violations outline live ─────────────
// Pick a zone from the palette, click cells to paint. Every violating cell gets a
// red outline; hovering one amber-outlines the exact neighbour(s) that broke the
// rule and spells the reason out. Repaint either half of a pair and both clear —
// which is the symmetry of the table made visible.
function mount(host) {
  ensureStyle();
  let caseIdx = 0;
  let grid = CASES[0].grid.map((row) => [...row]);
  let brush = "";
  let edited = false;

  const caseRow = el("div", "controls");
  caseRow.append(el("span", "ctl-label", "city"));
  CASES.forEach((cs, i) => {
    const chip = el("button", "chip" + (i === 0 ? " on" : ""), cs.label);
    chip.onclick = () => {
      caseIdx = i; edited = false;
      grid = cs.grid.map((row) => [...row]);
      [...caseRow.querySelectorAll(".chip")].forEach((x, xi) => x.classList.toggle("on", xi === i));
      paint();
    };
    caseRow.append(chip);
  });

  const palRow = el("div", "controls");
  palRow.append(el("span", "ctl-label", "paint with"));
  ZONES.forEach((z) => {
    const sw = el("div", "zon-sw" + (z.k === "" ? " empty" : "") + (z.k === brush ? " on" : ""), z.k === "" ? "·" : z.k);
    if (z.color) sw.style.background = z.color;
    sw.title = `${z.k === "" ? "undeveloped" : `"${z.k}" — ${z.name}`}`;
    sw.onclick = () => {
      brush = z.k;
      [...palRow.querySelectorAll(".zon-sw")].forEach((x, xi) => x.classList.toggle("on", ZONES[xi].k === brush));
    };
    palRow.append(sw);
  });

  const wrap = el("div", "zon-wrap");
  const board = el("div", "zon-grid");
  const legend = el("div", "zon-rules", rulesTable(""));
  wrap.append(board, legend);

  const res = el("div", "result-line");
  const info = el("div", "zon-info");
  host.append(caseRow, palRow, wrap, res, info,
    el("div", "note", `Every rule in the table has a mirror — <code class='inl'>"R"</code> bans <code class='inl'>"C"</code> and <code class='inl'>"C"</code> bans <code class='inl'>"R"</code> — so a violation always flags <b>both</b> cells. That is why no city can ever have exactly one violating coordinate. Repaint either half of a pair to <code class='inl'>""</code> and watch both outlines clear.`));

  const cellEls = [];
  const DEFAULT_INFO = `Hover a cell to see the check the scan runs on it; click to repaint it with the selected zone. A red outline means the cell is in the answer, amber marks the neighbour that put it there.`;

  function paint() {
    const { out, offenders } = report(grid);
    const R = grid.length, C = grid[0].length;
    board.innerHTML = ""; cellEls.length = 0;
    board.style.gridTemplateColumns = `repeat(${C}, 48px)`;
    for (let r = 0; r < R; r++) {
      cellEls.push([]);
      for (let c = 0; c < C; c++) {
        const v = grid[r][c], bad = offenders[r + "," + c].length > 0;
        const cell = el("div", "zon-cell" + (v === "" ? " empty" : "") + (bad ? " bad" : ""), v === "" ? "·" : v);
        if (COLOR[v]) cell.style.background = COLOR[v];
        cell.title = `[${r}, ${c}]`;
        cell.onclick = () => { grid[r][c] = brush; edited = true; paint(); explain(r, c); };
        cell.onmouseenter = () => explain(r, c);
        cell.onmouseleave = () => explain(null, null);
        cellEls[r].push(cell);
        board.append(cell);
      }
    }

    res.innerHTML = "";
    res.append(el("span", "badge " + (out.length ? "no" : "ok"),
      out.length ? `${out.length} violating cell${out.length === 1 ? "" : "s"}` : "zoning clean"));
    res.append(el("span", "zon-out", `getZoneViolations(grid) → ${listOut(out)}`));
    const cs = CASES[caseIdx];
    if (!edited && cs.expect) {
      const ok = listOut(out) === cs.expect;
      res.append(el("span", "tag", ok ? `matches freeCodeCamp's ${cs.expect} ✓` : `expected ${cs.expect}`));
    }
    explain(null, null);
  }

  function explain(r, c) {
    cellEls.flat().forEach((x) => x.classList.remove("pair", "focus"));
    if (r == null) { info.innerHTML = DEFAULT_INFO; return; }
    const { out, offenders } = report(grid);
    const v = grid[r][c], hits = offenders[r + "," + c], banned = CANNOT[v] ?? [];
    cellEls[r][c].classList.add("focus");
    hits.forEach(([nr, nc]) => cellEls[nr][nc].classList.add("pair"));
    if (v === "") {
      info.innerHTML = `<b>[${r}, ${c}]</b> is <b>""</b> — undeveloped. The table gives it <b>no restrictions</b>, so however you surround it, it can never appear in the answer.`;
      return;
    }
    const head = `<b>[${r}, ${c}]</b> holds <b>${lbl(v)}</b> (${NAME[v]}), which cannot be adjacent to <b>${banned.map(lbl).join(" or ")}</b>.`;
    if (!hits.length) {
      const nbs = DIRS.map(([dr, dc]) => [r + dr, c + dc, grid[r + dr]?.[c + dc]]).filter(([, , nb]) => nb !== undefined);
      info.innerHTML = `${head} Its ${nbs.length} neighbour${nbs.length === 1 ? "" : "s"} — ` +
        nbs.map(([nr, nc, nb]) => `${lbl(nb)} at [${nr}, ${nc}]`).join(", ") +
        ` — ${nbs.length === 1 ? "is" : "are"} all legal, so it stays off the list.`;
      return;
    }
    const idx = out.findIndex(([a, b]) => a === r && b === c);
    info.innerHTML = `${head} <span class="x">✗</span> ` +
      hits.map(([nr, nc]) => `<span class="y">${lbl(grid[nr][nc])}</span> sits ${DIRNAME[(nr - r) + "," + (nc - c)]} it at [${nr}, ${nc}]`).join("; ") +
      `. ${hits.length > 1
        ? `That is <b>${hits.length}</b> broken rules on one cell, but the answer names <b>cells</b>, not violations — the scan stops at the first offender, so <b>[${r}, ${c}]</b> appears <b>once</b>, at index ${idx}.`
        : `So <b>[${r}, ${c}]</b> is in the answer at index ${idx} — and because the ban is mutual, <b>[${hits[0][0]}, ${hits[0][1]}]</b> is in it too.`}`;
  }

  paint();
}

// The rules table as source text, generated FROM the constant the demo runs on,
// so the copy-pasteable snippet cannot drift from the data above it.
const rulesSrc = Object.entries(CANNOT)
  .map(([k, v]) => `${JSON.stringify(k)}: [${v.map((x) => `"${x}"`).join(", ")}]`)
  .join(", ");

const CODE = `// The adjacency table, transcribed exactly. Note "i" (industrial) and "I"
// (institutional) are DIFFERENT labels — and "i" may not sit next to "I".
const CANNOT: Record<string, string[]> = { ${rulesSrc} };
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   // up, down, left, right

function getZoneViolations(grid: string[][]): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const banned = CANNOT[grid[r][c]] ?? [];
      for (const [dr, dc] of DIRS) {
        const nb = grid[r + dr]?.[c + dc];      // undefined off the grid
        if (nb !== undefined && banned.includes(nb)) {
          out.push([r, c]);                     // once per CELL, not per offender
          break;
        }
      }
    }
  }
  return out;
}`;

// ── STEP — the scan, line by line ───────────────────────────────────────────
// PROVENANCE: cases 1–2 are freeCodeCamp's official tests #1 and #2; cases 3–5
// are invented. Officials #3–#5 are dropped here on trace length alone (the 4×6
// board is ~300 steps) and all three are preset chips on the solution demo, so
// nothing is hard-unreachable. Each case lands on a different branch:
//   1 — the ordinary case: two cells flag each other across a shared edge.
//   2 — a violation that spans rows, and an "I"/"R" pair that is legal.
//   3 — a 1×5 strip: every up/down probe falls off the grid, and "i" meets "I".
//   4 — one cell with three banned neighbours: watch `break` fire on the first.
//   5 — every cell legal, so `out` never grows and the return is [].
const STEP_CASES = [
  { label: "official 1 · 2×2", grid: [["R", "C"], ["", "C"]] },
  { label: "official 2 · 3×2", grid: [["", "i"], ["", "R"], ["R", "I"]] },
  { label: "1×5 strip · i vs I", grid: [["A", "C", "", "i", "I"]] },
  { label: "3 offenders, 1 entry", grid: [["", "A", ""], ["A", "C", "A"]] },
  { label: "all legal → []", grid: [["A", "A"], ["R", "R"]] },
];

const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="table">CANNOT</span> = { i: [<span class="st">"R"</span>, <span class="st">"I"</span>], A: [<span class="st">"C"</span>], R: [<span class="st">"i"</span>, <span class="st">"C"</span>], I: [<span class="st">"i"</span>], C: [<span class="st">"R"</span>, <span class="st">"A"</span>], <span class="st">""</span>: [] };` },
  { ln: 2, html: `<span class="k">const</span> <span class="tok" data-t="dirs">DIRS</span> = [[-1, 0], [1, 0], [0, -1], [0, 1]];   <span class="cm">// up, down, left, right</span>` },
  { ln: 3, html: `<span class="k">function</span> <span class="fn">getZoneViolations</span>(<span class="tok" data-t="arg">grid</span>) {` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="out">out = []</span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> r = 0; <span class="tok" data-t="rcond">r &lt; grid.length</span>; r++) {` },
  { ln: 6, html: `    <span class="k">for</span> (<span class="k">let</span> c = 0; <span class="tok" data-t="ccond">c &lt; grid[r].length</span>; c++) {` },
  { ln: 7, html: `      <span class="k">const</span> banned = <span class="tok" data-t="lookup">CANNOT[grid[r][c]]</span> ?? [];` },
  { ln: 8, html: `      <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="dir">[dr, dc]</span> <span class="k">of</span> DIRS) {` },
  { ln: 9, html: `        <span class="k">const</span> nb = <span class="tok" data-t="probe">grid[r + dr]?.[c + dc]</span>;   <span class="cm">// undefined off the grid</span>` },
  { ln: 10, html: `        <span class="k">if</span> (<span class="tok" data-t="test">nb !== undefined &amp;&amp; banned.<span class="fn">includes</span>(nb)</span>) {` },
  { ln: 11, html: `          <span class="tok" data-t="push">out.<span class="fn">push</span>([r, c])</span>;` },
  { ln: 12, html: `          <span class="k">break</span>;   <span class="cm">// once per CELL, not per offender</span>` },
  { ln: 13, html: `        }` },
  { ln: 14, html: `      }` },
  { ln: 15, html: `    }` },
  { ln: 16, html: `  }` },
  { ln: 17, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 18, html: `}` },
];

// The CANNOT table as struct items — the same six rows the legend and the
// statement render, so the panel is the actual data the scan is reading.
const RULE_ITEMS = ZONES.map((z) => `${z.k === "" ? '""' : z.k} ✗ ${CANNOT[z.k].length ? CANNOT[z.k].join(",") : "—"}`);

// Instrumented run → debugger steps. ONE frame (nested loops, no recursion).
// Scope is expressed by omission and gated on the line number: `r` exists only
// inside its for-block (lines 5–16), `c` inside 6–15, `banned` 7–15, the
// destructured `dr/dc` and `nb` only while the direction loop is running (8–13,
// 9–13). The struct panels are gated the same way — CANNOT is a module constant
// so it is up from line 1, `grid` arrives with the call on line 3, and `out`
// appears the moment line 4 creates it and then stays for the whole call.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(STEP_CASES.length - 1, (caseIndex | 0) - 1));
  const cs = STEP_CASES[idx];
  const grid = cs.grid;
  const { offenders } = report(grid);
  const steps = [], out = [];
  let r = 0, c = 0, banned = null, dir = null, nb = null, cursor = null;

  const gridRows = () => grid.map((row, rr) => row.map((v, cc) => {
    const t = v === "" ? "·" : v;
    return cursor && cursor[0] === rr && cursor[1] === cc ? `[${t}]` : ` ${t} `;
  }).join(""));

  const S = (line, note, o = {}) => {
    const vars = {};
    if (line >= 5 && line <= 16) vars.r = r;
    if (line >= 6 && line <= 15) vars.c = c;
    if (line >= 7 && line <= 15) vars.banned = banned && banned.length ? `[${banned.map((x) => `"${x}"`).join(",")}]` : "[]";
    if (line >= 9 && line <= 13) { vars["[dr,dc]"] = dir; vars.nb = nb === undefined ? "undefined" : lbl(nb); }
    const structs = [];
    if (line >= 1) structs.push({ label: "CANNOT", items: RULE_ITEMS });
    if (line >= 3) structs.push({ label: "grid", items: gridRows() });
    if (line >= 4) structs.push({ label: "out", items: out.map(pair), newest: !!o.pushed });
    steps.push({
      line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: "getZoneViolations(grid)", vars, changed: o.changed || [], structs, ret: o.ret }],
    });
  };

  S(1, `<b>Case ${idx + 1}: ${cs.label}.</b> Transcribe the table first, and transcribe it <b>exactly</b> — <b>"i"</b> is industrial, <b>"I"</b> is institutional, and the table says they cannot be neighbours. Lower-casing one of them silently merges two zone types.`, { focus: "table" });
  S(2, `Only the <b>four orthogonal</b> offsets. Diagonals are absent on purpose: the problem says "horizontal or vertical", so a corner-touching pair is never a violation.`, { focus: "dirs" });
  S(3, `Enter the scan on this ${grid.length}×${grid[0].length} grid. Nothing is connected or searched here — every cell's verdict depends only on the cells touching it, so one sweep is enough.`, { focus: "arg" });
  S(4, `<b>out</b> collects the answer. Cells are appended in row-major order, which is exactly the order the expected output is written in.`, { focus: "out", changed: ["out"] });

  for (r = 0; r < grid.length; r++) {
    S(5, `Start row <b>${r}</b>. Rows are walked top to bottom so the coordinates come out sorted for free — no sort at the end.`, { focus: "rcond", changed: ["r"], eval: { expr: `r = ${r} < ${grid.length}`, val: true } });
    for (c = 0; c < grid[r].length; c++) {
      cursor = [r, c];
      S(6, `Move the cursor to <b>[${r}, ${c}]</b>. Every cell gets checked — a violation is a property of a cell's <i>surroundings</i>, so there is nothing to skip and nothing to remember between cells.`, { focus: "ccond", changed: ["c"] });
      const v = grid[r][c];
      banned = CANNOT[v] ?? [];
      S(7, banned.length
        ? `This cell holds <b>${lbl(v)}</b> (${NAME[v]}). Look its row up in the table: it cannot sit beside <b>${banned.map(lbl).join(" or ")}</b>. Reading the table one-directionally is enough — every ban in it is mirrored, so the neighbour's row would say the same thing.`
        : `This cell holds <b>""</b> — undeveloped, and the table gives it an <b>empty</b> ban list. The loop below still runs, but <code class='inl'>[].includes(nb)</code> is false for every neighbour, so an empty lot can never be in violation.`,
        { focus: "lookup", changed: ["banned"] });
      dir = null; nb = null;
      S(8, `Walk its up-to-four neighbours in order: <b>above, below, left, right</b>. "Up to" is doing the work — an edge cell simply has fewer, and nothing here counts them first.`, { focus: "dir" });
      let hit = null;
      for (const [dr, dc] of DIRS) {
        const side = DIRNAME[dr + "," + dc];
        dir = `[${dr}, ${dc}]`;
        nb = grid[r + dr]?.[c + dc];
        const off = nb === undefined;
        S(9, off
          ? `The cell ${side} it would be <b>[${r + dr}, ${c + dc}]</b>, which is off the grid — <code class='inl'>?.</code> yields <b>undefined</b> rather than throwing, so a border needs no bounds arithmetic of its own.`
          : `The neighbour ${side} it is <b>[${r + dr}, ${c + dc}]</b>, holding <b>${lbl(nb)}</b>.`,
          { focus: "probe", changed: ["[dr,dc]", "nb"] });
        const bad = !off && banned.includes(nb);
        S(10, off
          ? `<b>undefined</b> is not a zone label, so the guard short-circuits before <code class='inl'>includes</code> ever runs. Missing neighbours cost nothing.`
          : bad
            ? `<b>${lbl(nb)}</b> is on ${lbl(v)}'s ban list — <b>[${r}, ${c}]</b> is in violation.`
            : `<b>${lbl(nb)}</b> is not on ${lbl(v)}'s ban list${banned.length ? ` (${banned.map(lbl).join(", ")})` : ""}, so this pairing is legal. Keep probing.`,
          { focus: "test", eval: { expr: off ? `nb === undefined` : `banned.includes(${lbl(nb)})`, val: bad } });
        if (bad) { hit = [r + dr, c + dc]; break; }
      }
      if (hit) {
        out.push([r, c]);
        const n = offenders[r + "," + c].length;
        S(11, `Append <b>[${r}, ${c}]</b> to the answer. Note what is recorded: <b>this cell</b>, not the pair. Its offender at <b>[${hit[0]}, ${hit[1]}]</b> gets flagged in its own turn — earlier or later in the sweep — because the ban is mutual, and nothing here has to remember that.`, { focus: "push", pushed: true });
        S(12, n > 1
          ? `<b>break.</b> This cell actually has <b>${n}</b> banned neighbours, but the answer is a list of <i>cells</i>, not of broken rules — without this <code class='inl'>break</code> it would be pushed ${n} times and the grader's deepEqual would fail.`
          : `<b>break.</b> One offender is all it takes; there is nothing to learn from the remaining neighbours, and stopping here also guarantees a cell can never be listed twice.`,
          { focus: "push" });
      } else {
        S(14, `Every neighbour came back legal, so nothing is pushed and <b>[${r}, ${c}]</b> stays out of the answer. <code class='inl'>dr</code>, <code class='inl'>dc</code> and <code class='inl'>nb</code> go out of scope with the loop.`);
      }
      banned = null;
    }
  }
  cursor = null;
  S(5, `<b>r</b> reached <b>${grid.length}</b> — every cell in the grid has been judged against its own neighbourhood. Exit the sweep.`, { focus: "rcond", eval: { expr: `r = ${grid.length} < ${grid.length}`, val: false } });
  S(17, out.length
    ? `<b>Return ${listOut(out)}</b> — ${out.length} cells, already in row-major order because that is the order they were appended in; no sort needed. Never a lone coordinate, either: the table's bans are mutual, so whoever offended a flagged cell is flagged too.`
    : `<b>Return []</b> — not one cell had a banned neighbour, so <b>out</b> was never appended to. An empty array is a real answer here, not a failure.`,
    { focus: "ret", done: true, result: listOut(out), ret: { value: listOut(out) } });
  return steps;
}

export default {
  n: 307, id: "zoning", title: "Zoning Regulations", dates: ["2026-06-13"],
  statement: `Given a 2D grid of zone labels, return the coordinates of every building that breaks a zoning rule. A cell is in violation if <b>any</b> of its up-to-4 neighbours — horizontal or vertical, never diagonal — is a type it cannot be adjacent to. Return them as <code class="inl">[row, col]</code> pairs, or <code class="inl">[]</code> if the city is clean.
    ${rulesTable("zon-rules")}
    <span class="rule">The labels are case-sensitive: <code class="inl">"i"</code> is industrial, <code class="inl">"I"</code> is institutional. Example: <code class="inl">[["R","C"],["","C"]]</code> → <code class="inl">[[0,0],[0,1]]</code> — the residential block and the commercial block next to it each break the other's rule.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(R·C) — 4 probes per cell",
      approach: `Visit every cell, look its label up in the ban table, and test the up-to-four orthogonal neighbours. <code class='inl'>grid[r + dr]?.[c + dc]</code> returns <b>undefined</b> off the edge, so the border needs no special case. The two decisions that actually matter are in the data, not the loop: transcribe <code class='inl'>"i"</code> and <code class='inl'>"I"</code> as the <b>different</b> labels they are, and <code class='inl'>break</code> after the first offender so a cell with two banned neighbours is still listed <b>once</b>. You never need to check the neighbour's row as well as your own — the table as written is already symmetric, which is also why a violation always comes as a <b>pair</b> of coordinates.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the scan. Watch <code class='inl'>banned</code> get looked up per cell and then vanish, the four probes run in order (with <code class='inl'>nb</code> coming back <b>undefined</b> whenever one falls off the grid), and <code class='inl'>out</code> grow one coordinate at a time. Case 4 is the one to sit with: a cell with <b>three</b> banned neighbours still hits <code class='inl'>break</code> after the first, and is listed once. Case 5 never appends anything and returns <code class='inl'>[]</code>. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: STEP_CASES.length, presets: STEP_CASES.map((_, i) => i + 1), hint: `1–${STEP_CASES.length}: pick a city` },
      }),
    },
  ],
};
