// #349 · Cell Signal — a reading is a ray, so one tower already names its 8 cells.
// "N cells away in a straight line: horizontal, vertical or diagonal" is not a fuzzy
// distance, it is a constraint that pins the phone to eight positions per tower.
//   • BRUTE — test every cell in the grid against all three towers. The wasteful act:
//     it asks "could the phone be here?" of cells no reading could ever reach.
//   • OPT   — read the first tower's number as an ANSWER rather than a filter. Walk
//     its eight rays out to exactly that distance, and check the ≤8 cells that come
//     back against the other two. The grid never enters the cost at all.
// Flip the Approach toggle on the 12×12 case: 118 cells tested against 3.
import { el, esc, mountDebugger } from "../shared.js";

// Aligned means the offset lies on one of the eight rays; along one of those rays
// the number of cells travelled is just the larger of the two offsets.
const aligned = (dr, dc) => dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
const reach = (dr, dc) => Math.max(Math.abs(dr), Math.abs(dc));
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

// Cases 1–5 are freeCodeCamp's official tests in the order the grader lists them —
// 3×3 up to 6×6. Case 6 is invented, and it exists because the official grids are
// all small enough that scanning them looks cheap: at 12×12 the sweep tests 118
// cells to find what three ray endpoints already answer. The phone is deliberately
// far down the row-major order, so the brute gets no early exit to hide behind.
const CASES = [
  { label: "3×3", grid: [[0, 0, 1], [0, 1, 0], [0, 0, 1]] },
  { label: "3×3 · diagonal", grid: [[0, 2, 0], [1, 0, 0], [0, 0, 1]] },
  { label: "4×4", grid: [[0, 0, 2, 0], [0, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 1]] },
  { label: "5×5", grid: [[0, 3, 0, 0, 0], [0, 0, 0, 0, 2], [0, 0, 0, 0, 0], [4, 0, 0, 0, 0], [0, 0, 0, 0, 0]] },
  { label: "6×6", grid: [[3, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 2, 0, 0, 0, 2]] },
  { label: "12×12 · far corner", grid: Array.from({ length: 12 }, (_, r) => Array.from({ length: 12 }, (_, c) =>
      (r === 0 && c === 0) ? 9 : (r === 9 && c === 0) ? 9 : (r === 11 && c === 11) ? 2 : 0)) },
];

const towersOf = (grid) => {
  const t = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v > 0) t.push({ r, c, d: v }); }));
  return t;
};

const fits = (grid, towers, r, c) =>
  towers.every((t) => aligned(r - t.r, c - t.c) && reach(r - t.r, c - t.c) === t.d);

// Scan the whole grid. `tested` counts cells actually examined before the return.
function solveBrute(grid) {
  const towers = towersOf(grid);
  let tested = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      tested++;
      if (fits(grid, towers, r, c)) return { at: [r, c], tested, total: grid.length * grid[0].length };
    }
  }
  return { at: null, tested, total: grid.length * grid[0].length };
}

// Generate from tower 0's reading instead. `candidates` is every ray endpoint,
// in-bounds or not; `tested` is the ones that survived the bounds check.
function solveRays(grid) {
  const towers = towersOf(grid);
  const t0 = towers[0];
  const candidates = DIRS.map(([dr, dc]) => [t0.r + dr * t0.d, t0.c + dc * t0.d]);
  let tested = 0, at = null;
  for (const [r, c] of candidates) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) continue;
    tested++;
    if (!at && fits(grid, towers, r, c)) at = [r, c];
  }
  return { at, tested, candidates, inBounds: candidates.filter(([r, c]) => r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cs-grid { display:grid; gap:2px; margin:6px 0 2px; width:max-content; max-width:100%; }
    .cs-c { width:30px; height:30px; display:flex; align-items:center; justify-content:center;
            font:700 12px var(--mono); border-radius:5px; cursor:pointer; color:var(--muted);
            border:1px solid var(--border); background:var(--panel-2); }
    .cs-c.sm { width:22px; height:22px; font-size:10px; }
    .cs-c:hover { outline:2px solid var(--accent); outline-offset:1px; }
    .cs-c.swept { background:color-mix(in srgb, var(--danger) 13%, transparent); }
    .cs-c.ray { background:color-mix(in srgb, var(--accent) 17%, transparent); }
    .cs-c.cand { border-color:var(--warn); color:var(--warn);
                 background:color-mix(in srgb, var(--warn) 18%, transparent); }
    .cs-c.tower { border-color:var(--c3); color:var(--c3); font-weight:800;
                  background:color-mix(in srgb, var(--c3) 20%, transparent); }
    .cs-c.found { border-color:var(--good); color:var(--good);
                  background:color-mix(in srgb, var(--good) 26%, transparent);
                  box-shadow:0 0 0 2px var(--good); }
    .cs-c.probe { outline:2px dashed var(--accent); outline-offset:1px; }
    .cs-wrap { display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start; }
    .cs-side { flex:1; min-width:252px; }
    .cs-leg { display:flex; gap:14px; flex-wrap:wrap; font:12px var(--sans); color:var(--muted); margin-bottom:10px; }
    .cs-leg i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
    .cs-check { font:12px var(--mono); margin:3px 0; }
  `));
}

function mountDemo(mode) {
  return function (host) {
    ensureStyle();
    let gi = 0, probe = null;

    const pre = el("div", "controls");
    CASES.forEach((c, i) => {
      const chip = el("button", "chip", esc(c.label));
      chip.onclick = () => { gi = i; probe = null; render(); };
      pre.append(chip);
    });

    const out = el("div");
    host.append(
      el("div", "note", mode === "brute"
        ? "Pick a grid, then <b>click any cell</b> to run the same three checks the sweep runs on it. The shaded cells are the ones the loop actually reached before returning — on the 12×12 that is 118 of 144, and almost none of them were ever geometrically possible."
        : "Pick a grid, then <b>click any cell</b> to test it yourself. The tinted cells are the eight rays out of tower 1; only the ring at exactly its reading — the amber cells — can hold the phone, whatever the other towers say. Everything outside those eight positions is unreachable by definition."),
      pre, out,
    );
    render();

    function render() {
      out.innerHTML = "";
      const grid = CASES[gi].grid;
      const towers = towersOf(grid);
      const n = grid.length, w = grid[0].length;
      const brute = solveBrute(grid), rays = solveRays(grid);
      const answer = mode === "brute" ? brute.at : rays.at;
      const sweptTo = brute.tested;
      const candKeys = new Set(rays.inBounds.map(([r, c]) => `${r},${c}`));
      const t0 = towers[0];

      const wrap = el("div", "cs-wrap");
      const g = el("div", "cs-grid");
      g.style.gridTemplateColumns = `repeat(${w}, auto)`;
      grid.forEach((row, r) => row.forEach((v, c) => {
        const idx = r * w + c;
        const isTower = v > 0;
        const isAns = answer && answer[0] === r && answer[1] === c;
        const onRay = aligned(r - t0.r, c - t0.c) && !(r === t0.r && c === t0.c);
        let cls = "cs-c" + (w > 8 ? " sm" : "");
        if (mode === "brute" && idx < sweptTo && !isTower && !isAns) cls += " swept";
        if (mode === "rays" && onRay && !isTower && !isAns) cls += candKeys.has(`${r},${c}`) ? " cand" : " ray";
        if (isTower) cls += " tower";
        if (isAns) cls += " found";
        if (probe && probe[0] === r && probe[1] === c) cls += " probe";
        const cell = el("div", cls, isTower ? String(v) : isAns ? "●" : "");
        cell.title = `[${r}, ${c}]`;
        cell.onclick = () => { probe = [r, c]; render(); };
        g.append(cell);
      }));

      const side = el("div", "cs-side");
      side.append(el("div", "cs-leg",
        `<span><i style="background:color-mix(in srgb, var(--c3) 60%, transparent)"></i>tower · its reading</span>` +
        `<span><i style="background:var(--good)"></i>the phone</span>` +
        (mode === "brute"
          ? `<span><i style="background:color-mix(in srgb, var(--danger) 40%, transparent)"></i>cells the sweep tested</span>`
          : `<span><i style="background:var(--warn)"></i>the 8 candidates</span>`)));

      side.append(el("div", "result-line",
        `<span class="badge ok">[${answer ? answer.join(", ") : "—"}]</span>` +
        (mode === "brute"
          ? `<span class="opcount hot"><span class="n">${brute.tested}</span> of ${brute.total} cells tested</span>`
          : `<span class="opcount cool"><span class="n">${rays.tested}</span> candidates tested</span>`)));

      if (mode === "rays") {
        const oob = rays.candidates.length - rays.inBounds.length;
        side.append(el("div", "note",
          `Tower 1 reads <b>${t0.d}</b> from <b>[${t0.r}, ${t0.c}]</b>, so the phone is on one of <b>8</b> cells — its rays at exactly that distance. ${oob ? `<b>${oob}</b> of them fall off the grid, leaving <b>${rays.tested}</b> to check` : `All 8 are on the grid`}. The other two towers are not searched with; they are only used to <i>reject</i>, which is why the grid's size never appears in the cost.`));
      } else {
        side.append(el("div", "note",
          `The sweep reached <b>${brute.tested}</b> cells before it hit the answer, out of <b>${brute.total}</b>. Of those, only <b>${rays.tested}</b> were ever geometrically capable of holding the phone — every other test was a cell that tower 1's reading had already ruled out.`));
      }

      // Click-to-probe: run the module's actual predicate on a user-chosen cell.
      if (probe) {
        const [pr, pc] = probe;
        side.append(el("div", "cs-check", `<b>probe [${pr}, ${pc}]</b>`));
        const chips = el("div", "cand-grid");
        towers.forEach((t, i) => {
          const dr = pr - t.r, dc = pc - t.c;
          const al = aligned(dr, dc), dist = reach(dr, dc), ok = al && dist === t.d;
          chips.append(el("span", "cand " + (ok ? "pass" : "fail"),
            `T${i + 1} [${t.r},${t.c}]=${t.d} · ${al ? `${dist} away` : "not on a ray"}`));
        });
        side.append(chips);
        side.append(el("div", "note", fits(grid, towers, pr, pc)
          ? `All three readings agree — this is the phone. The puzzle promises exactly one such cell, which is what lets both approaches return the moment they find it.`
          : `Rejected. ${towers.some((t) => !aligned(pr - t.r, pc - t.c))
              ? `At least one offset isn't horizontal, vertical or diagonal, so that tower could not have measured this cell <i>at all</i> — no distance would have saved it. That is the constraint the ray approach exploits: it is a much stronger filter than "wrong number".`
              : `Every offset is on a ray, but at least one distance is wrong.`}`));
      } else {
        side.append(el("div", "note", "Click any cell to run the three checks against it."));
      }

      wrap.append(g, side);
      out.append(wrap);
    }
  };
}

// ── STEP: the sweep ──────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">findSignal</span>(<span class="tok" data-t="params">grid</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="towers">towers = <span class="fn">readTowers</span>(grid)</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="r">r = <span class="nu">0</span>; r &lt; grid.length</span>; r++) {` },
  { ln: 4, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="c">c = <span class="nu">0</span>; c &lt; grid[r].length</span>; c++) {` },
  { ln: 5, html: `      <span class="k">if</span> (<span class="tok" data-t="fits">towers.<span class="fn">every</span>((t) =&gt; <span class="fn">onRay</span>(r - t.r, c - t.c) &amp;&amp; <span class="fn">dist</span>(r - t.r, c - t.c) === t.d)</span>)` },
  { ln: 6, html: `        <span class="k">return</span> <span class="tok" data-t="ret">[r, c]</span>;` },
  { ln: 7, html: `    }` },
  { ln: 8, html: `  }` },
  { ln: 9, html: `}` },
];

// ── STEP: the rays ───────────────────────────────────────────────────────────
const SRC_RAYS = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">findSignal</span>(<span class="tok" data-t="params">grid</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="towers">towers = <span class="fn">readTowers</span>(grid)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="t0">[first, ...rest] = towers</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="dir">[dr, dc] <span class="k">of</span> DIRS</span>) {` },
  { ln: 5, html: `    <span class="k">const</span> <span class="tok" data-t="step">r = first.r + dr * first.d, c = first.c + dc * first.d</span>;` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="bounds">!<span class="fn">inside</span>(grid, r, c)</span>) <span class="k">continue</span>;` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="rest">rest.<span class="fn">every</span>((t) =&gt; <span class="fn">onRay</span>(r - t.r, c - t.c) &amp;&amp; <span class="fn">dist</span>(r - t.r, c - t.c) === t.d)</span>)` },
  { ln: 8, html: `      <span class="k">return</span> <span class="tok" data-t="ret">[r, c]</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `}` },
];

const DIR_NAME = ["up", "down", "left", "right", "up-left", "up-right", "down-left", "down-right"];

function traceBrute(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const grid = CASES[k - 1].grid;
  const towers = towersOf(grid);
  const w = grid[0].length;
  const steps = [];
  let r = null, c = null, tested = 0;

  const S = (line, note, x = {}) => {
    // Only what the displayed source actually declares — the running `tested`
    // tally is narration, not a variable in the code, so it stays in the notes.
    const vars = {};
    if (line >= 3 && r != null) vars.r = r;
    if (line >= 4 && c != null) vars.c = c;
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `findSignal(${grid.length}×${w} grid)`, vars, changed: x.changed || [],
                 structs: [{ label: "towers", items: towers.map((t) => `[${t.r},${t.c}]=${t.d}`) }], ret: x.ret }],
    });
  };

  S(1, `A <b>${grid.length}×${w}</b> grid — <b>${grid.length * w}</b> cells — with three readings in it. This approach makes no use of what a reading <i>means</i>; it only uses it to say yes or no about a cell it was already going to visit.`,
    { focus: "params" });
  S(2, `The three towers: ${towers.map((t) => `<b>[${t.r},${t.c}]</b> reads <b>${t.d}</b>`).join(", ")}.`, { focus: "towers" });

  outer:
  for (r = 0; r < grid.length; r++) {
    S(3, `Row <b>${r}</b>.`, { focus: "r", changed: ["r"] });
    for (c = 0; c < w; c++) {
      tested++;
      const failing = towers.findIndex((t) => !(aligned(r - t.r, c - t.c) && reach(r - t.r, c - t.c) === t.d));
      const ok = failing === -1;
      const t = towers[failing === -1 ? 0 : failing];
      const dr = r - t.r, dc = c - t.c;
      S(5, ok
        ? `<b>[${r}, ${c}]</b> satisfies all three readings. Cell number <b>${tested}</b> of ${grid.length * w}.`
        : `<b>[${r}, ${c}]</b> fails on tower <b>${(failing) + 1}</b>: offset (${dr}, ${dc}) ${aligned(dr, dc)
            ? `is on a ray but <b>${reach(dr, dc)}</b> cells away, not ${t.d}`
            : `is not horizontal, vertical or diagonal at all — that tower could never have measured this cell, at any distance`}. Tested so far: <b>${tested}</b>.`,
        { focus: "fits", changed: ["c"], eval: { expr: `all three readings agree at [${r}, ${c}]`, val: ok } });
      if (ok) break outer;
    }
  }

  S(6, `Return <b>[${r}, ${c}]</b> after testing <b>${tested}</b> of ${grid.length * w} cells. Only the eight positions on the first tower's rays were ever candidates — the rest were arithmetic spent proving what a single reading had already ruled out.`,
    { focus: "ret", done: true, result: `[${r}, ${c}]`, ret: { value: `[${r}, ${c}]` } });
  return steps;
}

function traceRays(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const grid = CASES[k - 1].grid;
  const towers = towersOf(grid);
  const [first, ...rest] = towers;
  const w = grid[0].length;
  const steps = [];
  let dir = null, r = null, c = null, tested = 0;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4 && dir) vars.dir = dir;
    if (line >= 5 && r != null) { vars.r = r; vars.c = c; }
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `findSignal(${grid.length}×${w} grid)`, vars, changed: x.changed || [],
                 structs: [{ label: "towers", items: towers.map((t) => `[${t.r},${t.c}]=${t.d}`) }], ret: x.ret }],
    });
  };

  S(1, `The same <b>${grid.length}×${w}</b> grid. The difference starts with how the first reading is read: not as a test to apply, but as an <i>answer</i> about where the phone is.`,
    { focus: "params" });
  S(2, `The three towers: ${towers.map((t) => `<b>[${t.r},${t.c}]</b> reads <b>${t.d}</b>`).join(", ")}.`, { focus: "towers" });
  S(3, `Take the <b>first</b> one — <b>[${first.r}, ${first.c}]</b> reading <b>${first.d}</b> — as the generator. Any of the three would do; the phone must satisfy all of them, so it must lie on <i>each</i> one's rays, and generating from one and rejecting with the others is enough. The remaining <b>${rest.length}</b> become the filter.`,
    { focus: "t0" });

  for (let i = 0; i < DIRS.length; i++) {
    const [dr, dc] = DIRS[i];
    dir = DIR_NAME[i];
    S(4, `Ray <b>${i + 1}</b> of 8: <b>${dir}</b>.`, { focus: "dir", changed: ["dir"] });
    r = first.r + dr * first.d; c = first.c + dc * first.d;
    S(5, `Step <b>${first.d}</b> cells ${dir} from [${first.r}, ${first.c}] → <b>[${r}, ${c}]</b>. No search: the distance is known, so the destination is arithmetic.`,
      { focus: "step", changed: ["r", "c"] });

    const inside = r >= 0 && r < grid.length && c >= 0 && c < w;
    if (!inside) {
      S(6, `<b>[${r}, ${c}]</b> is off the grid — skip.`,
        { focus: "bounds", eval: { expr: `inside(grid, ${r}, ${c})`, val: false } });
      continue;
    }
    S(6, `<b>[${r}, ${c}]</b> is on the grid.`, { focus: "bounds", eval: { expr: `inside(grid, ${r}, ${c})`, val: true } });

    tested++;
    const bad = rest.findIndex((t) => !(aligned(r - t.r, c - t.c) && reach(r - t.r, c - t.c) === t.d));
    const ok = bad === -1;
    if (ok) {
      S(7, `Both remaining towers agree — <b>[${r}, ${c}]</b> is the phone, on candidate <b>${tested}</b>.`,
        { focus: "rest", eval: { expr: `rest.every(...)`, val: true } });
      S(8, `Return <b>[${r}, ${c}]</b> after testing <b>${tested}</b> candidate${tested === 1 ? "" : "s"} — against the sweep's ${solveBrute(grid).tested} cells on this same grid. The grid could be a thousand cells wide and this number would not move, because it is bounded by the eight directions, not by the area.`,
        { focus: "ret", done: true, result: `[${r}, ${c}]`, ret: { value: `[${r}, ${c}]` } });
      return steps;
    }
    const t = rest[bad];
    const ddr = r - t.r, ddc = c - t.c;
    S(7, `Tower <b>${towers.indexOf(t) + 1}</b> at [${t.r}, ${t.c}] rejects it: offset (${ddr}, ${ddc}) ${aligned(ddr, ddc)
      ? `is on a ray but <b>${reach(ddr, ddc)}</b> away, not ${t.d}`
      : `isn't on any of its rays`}. Candidate <b>${tested}</b> discarded.`,
      { focus: "rest", eval: { expr: `rest.every(...)`, val: false } });
  }
  // Unreachable for a well-formed grid — the prompt promises exactly one solution,
  // and it must lie on the first tower's rays. Kept so the trace always terminates.
  S(9, `All eight rays exhausted with no cell satisfying the other two towers — impossible for a valid grid.`, { focus: "dir", done: true, result: "—" });
  return steps;
}

const STEP_IN = { label: "case =", value: 6, min: 1, max: CASES.length,
  presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` };

export default {
  n: 349, id: "cellsignal", title: "Cell Signal", dates: ["2026-07-25"],
  statement: `Given a grid holding three cell-tower readings, find the phone. Each cell is either <code class="inl">0</code> or a positive integer — the number of cells to the phone measured in a <b>straight line: horizontal, vertical or diagonal</b>. Return the <code class="inl">[row, col]</code> that is the correct distance from all three. <span class="rule">There is always exactly one solution. Example: <code class="inl">findSignal([[0,0,1],[0,1,0],[0,0,1]])</code> → <b>[1, 2]</b>.</span>`,
  variants: [
    {
      name: "Test every cell", tone: "brute", cost: "O(rows · cols · 3)",
      approach: `The readings are treated purely as a <b>predicate</b>: walk the grid, and for each cell ask whether all three towers would have reported what they did. It is short, obviously correct, and needs no geometric insight — the cost is that it asks the question of cells that no reading could possibly describe. On the 12×12 case it tests <b>118</b> cells to find one, and only <b>3</b> of those were on the first tower's rays at all; the remaining 115 were rejected by a constraint that could have excluded them without ever visiting them. The work scales with the <i>area</i> of the grid, which is the giveaway — nothing in the problem grows with area.`,
      code: `// Treat each reading as a test and sweep the whole grid.
type Tower = { r: number; c: number; d: number };

function findSignal(grid: number[][]): [number, number] {
  const towers: Tower[] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v > 0) towers.push({ r, c, d: v }); }));

  // On a ray at all, and the right number of cells along it.
  const onRay = (dr: number, dc: number) => dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  const dist = (dr: number, dc: number) => Math.max(Math.abs(dr), Math.abs(dc));

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (towers.every((t) => onRay(r - t.r, c - t.c) && dist(r - t.r, c - t.c) === t.d)) {
        return [r, c];
      }
    }
  }
  return [-1, -1]; // the prompt promises this is unreachable
}`,
      mount: mountDemo("brute"),
    },
    {
      name: "Step: test every cell", tone: "brute", cost: "one step per cell",
      approach: `A debugger for the sweep. Watch the rejection reasons on line 5: most cells fail because the offset is <i>not on a ray at all</i>, not because the distance is wrong. That distinction is the whole opening — a cell failing on alignment was never a candidate under any reading, so the search space was eight positions from the start. On the <b>12×12</b> case this runs 118 rejections before it lands. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: STEP_IN }),
    },
    {
      name: "Walk one tower's rays", tone: "opt", cost: "O(1) — 8 candidates",
      approach: `Read the first tower's number as an <b>answer</b> rather than a filter. "The phone is 9 cells away in a straight line" doesn't narrow the grid — it <i>names</i> eight cells, one per direction, and the phone is certainly one of them. So step out to each in turn and let the other two towers reject the seven that are wrong.<br><br>The cost stops depending on the grid entirely: eight candidates, minus whichever fall off the edge, times two rejection checks. A 1000×1000 grid would cost exactly the same. That's the shape worth recognising — when a constraint <b>determines</b> a small set of positions instead of merely testing them, generate the set and verify, rather than enumerating a space and filtering. The two approaches return the same cell because the puzzle guarantees exactly one, and it necessarily lies on tower 1's rays.`,
      code: `// A reading names eight cells — one per direction. Generate them and let
// the other two towers reject. The grid's size never enters the cost.
type Tower = { r: number; c: number; d: number };

const DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1],
];

function findSignal(grid: number[][]): [number, number] {
  const towers: Tower[] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (v > 0) towers.push({ r, c, d: v }); }));

  const onRay = (dr: number, dc: number) => dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  const dist = (dr: number, dc: number) => Math.max(Math.abs(dr), Math.abs(dc));

  const [first, ...rest] = towers;
  for (const [dr, dc] of DIRS) {
    const r = first.r + dr * first.d;   // no search — the distance IS the step
    const c = first.c + dc * first.d;
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) continue;
    if (rest.every((t) => onRay(r - t.r, c - t.c) && dist(r - t.r, c - t.c) === t.d)) {
      return [r, c];
    }
  }
  return [-1, -1]; // the prompt promises this is unreachable
}`,
      mount: mountDemo("rays"),
    },
    {
      name: "Step: walk one tower's rays", tone: "opt", cost: "one step per direction",
      approach: `At most eight iterations, ever. Watch line 5: the destination is computed, never searched for — <code class='inl'>first.d</code> is both the distance and the multiplier. Run the <b>12×12</b> case here and in the sweep tab back to back: identical <code class='inl'>[9, 9]</code>, from <b>3</b> in-bounds candidates against <b>118</b> cells, and five of the eight rays fell off the grid before costing anything. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_RAYS, trace: traceRays, input: STEP_IN }),
    },
  ],
};
