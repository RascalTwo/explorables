// #27 · Matrix Rotate — a rotation is a transpose and a flip, two moves you can check.
// • BRUTE — Build a new grid: allocate a fresh C×R output and copy every cell to its
//   rotated home with out[c][R-1-r] = matrix[r][c]. One index map, one pass, and a
//   whole second matrix — n² cells that did not exist a moment ago.
// • OPT — Transpose, then reverse each row: swap across the main diagonal (only where
//   c > r, or the second half of the loop undoes the first), then reverse each row in
//   place. Zero extra cells. Square matrices only.
// Be honest about the size of the win: it is SPACE, not time. Both are O(n²) passes,
// and the in-place one actually performs MORE cell writes — n(n−1) for the swaps plus
// 2n⌊n/2⌋ for the reversals, against the brute's flat n². What it buys is the n² cells
// it never allocates, and two moves a reader can verify by eye instead of one index
// expression nobody can check by staring at it.
// Flip the Approach toggle on the 2×3 case for the gap that isn't about cost at all:
// the brute rotates it into a 3×2, while the in-place one does not crash but quietly
// returns a scrambled 2×3 — a wrong answer shaped like a right one, which no official
// test can catch because every official case is square.
import { el, esc, mountDebugger } from "../shared.js";

// The first four are freeCodeCamp's four official cases, in the grader's order.
//   [[1]] — the degenerate square: the rotation is the identity and the in-place
//     version does literally nothing (0 swaps), while the brute still writes a cell.
//   [[1,2],[3,4]] — the statement's worked example; even n, so no cell is fixed.
//   [[1,2,3],[4,5,6],[7,8,9]] — odd n, so the centre cell sits ON the diagonal and
//     is never swapped. That is the case where `c > r` earns its keep.
//   [[0,1,0],[1,0,1],[0,0,0]] — the one where a wrong index map still LOOKS
//     plausible. With two distinct values you cannot trace a cell by its value, so
//     a transposed-instead-of-rotated answer reads as a perfectly good matrix.
// The fifth is ours: a NON-SQUARE matrix, which is exactly where the two approaches
// stop agreeing about what is even possible. The brute turns 2×3 into 3×2; the
// in-place one uses n = matrix.length as both dimensions, never visits column 2, and
// returns a scrambled 2×3 without complaining — so the demo declines for it.
const OFFICIAL = [
  [[1]],
  [[1, 2], [3, 4]],
  [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  [[0, 1, 0], [1, 0, 1], [0, 0, 0]],
];
const CASES = [...OFFICIAL, [[1, 2, 3], [4, 5, 6]]];

const MAX_DIM = 5;                                  // keeps the grid and the trace legible
const fmt = (m) => m.map((row) => row.join(",")).join(";");
const clone = (m) => m.map((row) => [...row]);
const isSquare = (m) => m.every((row) => row.length === m.length);

// Rows are ";"-separated, cells ","-separated. Ragged input is squared off against
// the first row rather than rejected, so the demo never renders a hole.
function parseMatrix(raw) {
  const rows = String(raw).split(";")
    .map((r) => r.split(",").map((x) => x.trim()).filter((x) => x !== "").map(Number))
    .filter((r) => r.length).slice(0, MAX_DIM);
  if (!rows.length) return [[1]];
  const C = Math.min(rows[0].length, MAX_DIM);
  return rows.map((r) => Array.from({ length: C }, (_, i) => (Number.isFinite(r[i]) ? r[i] : 0)));
}

const brute = (matrix) => {
  const R = matrix.length, C = matrix[0].length;
  const out = Array.from({ length: C }, () => Array(R).fill(0));
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) out[c][R - 1 - r] = matrix[r][c];
  return out;
};

// Work done, counted the way the demos report it. The brute's two numbers are the
// same n²; the opt's are 0 and 2×(diagonal swaps + reversal swaps) — which is MORE
// than n² for every n > 1. Saying so out loud is the point of showing both.
const bruteWork = (R, C) => ({ cells: R * C, writes: R * C });
const optWork = (n) => ({ cells: 0, swaps: (n * (n - 1)) / 2 + n * Math.floor(n / 2) });

// What the in-place algorithm ACTUALLY does to a non-square, run unguarded. It does
// not throw — that is the point. `n = matrix.length` is used as both dimensions, so a
// wide matrix never has its far columns visited and a tall one writes past the end of
// its rows; either way a plausible-looking matrix of the wrong shape comes back.
function optUnguarded(m) {
  const g = clone(m), n = g.length;
  for (let r = 0; r < n; r++) for (let c = r + 1; c < n; c++) [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
  for (const row of g) row.reverse();
  return g.map((row) => `[${row.map((v) => (v === undefined ? "—" : v)).join(",")}]`).join(", ");
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mr-wrap { display:flex; flex-direction:column; gap:12px; }
    .mr-stage { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
    .mr-side { display:flex; flex-direction:column; gap:6px; }
    .mr-cap { font:700 10.5px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .mr-grid { display:grid; gap:4px; }
    .mr-cell { width:44px; height:36px; box-sizing:border-box; line-height:34px; text-align:center;
               border:1px solid var(--border); border-radius:7px; background:var(--panel-2);
               color:var(--text); font:700 14px var(--mono); }
    input.mr-cell { padding:0; min-width:0; box-sizing:border-box; width:44px; height:36px;
                    border:1px solid var(--border); border-radius:7px; background:var(--panel-2);
                    color:var(--text); font:700 14px var(--mono); text-align:center; }
    .mr-cell.src { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); color:var(--accent); }
    .mr-cell.dst { border-color:var(--warn); box-shadow:0 0 0 1px var(--warn); color:var(--warn); }
    .mr-cell.hit { border-color:var(--warn); color:var(--warn); background:color-mix(in srgb, var(--warn) 14%, transparent); }
    .mr-cell.diag { background:color-mix(in srgb, var(--accent) 15%, transparent); }
    .mr-cell.dead { border-style:dashed; border-color:var(--danger); color:var(--danger); opacity:.75; }
    .mr-arrow { font:700 22px var(--mono); color:var(--muted); }
    .mr-counts { display:flex; flex-wrap:wrap; gap:18px; align-items:baseline; }
    .mr-vs { font:12px var(--sans); color:var(--muted); border-left:1px dashed var(--border); padding-left:14px; }
    .mr-vs b { font-family:var(--mono); color:var(--text); }
    .mr-map { font:13px var(--mono); color:var(--muted); }
    .mr-map b { color:var(--text); }
    .mr-map .a { color:var(--accent); } .mr-map .w { color:var(--warn); }
    .mr-stagebar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .mr-scrub { flex:1; min-width:120px; max-width:280px; accent-color:var(--accent); }
    .mr-lab { font:700 12.5px var(--mono); color:var(--text); }
    .mr-dead { border:1px solid var(--danger); border-radius:9px; padding:9px 12px;
               background:color-mix(in srgb, var(--danger) 10%, transparent); font:12.5px var(--sans); color:var(--text); }
  `));
}

const counter = (n, label, cls) => `<span class="opcount ${cls}"><span class="n">${n}</span> ${label}</span>`;
const s_ = (n) => (n === 1 ? "" : "s");

// Rows/cols steppers + the preset chips, shared by both demos. `onShape` fires when
// the grid's dimensions change (the caller must rebuild its cell elements); `onEdit`
// when only a value moved.
function frame(host, st, onShape) {
  ensureStyle();
  const ctl = el("div", "controls");
  const mk = (label, get, set) => {
    const i = el("input"); i.type = "number"; i.min = 1; i.max = MAX_DIM; i.value = get();
    i.style.width = "62px";
    i.onchange = () => { set(Math.max(1, Math.min(MAX_DIM, Math.floor(+i.value) || 1))); i.value = get(); onShape(); };
    ctl.append(el("span", "ctl-label", label), i);
    return i;
  };
  const resize = (R, C) => {
    st.m = Array.from({ length: R }, (_, r) =>
      Array.from({ length: C }, (_, c) => (st.m[r] && st.m[r][c] !== undefined ? st.m[r][c] : r * C + c + 1)));
  };
  const rowsIn = mk("rows", () => st.m.length, (v) => resize(v, st.m[0].length));
  const colsIn = mk("cols", () => st.m[0].length, (v) => resize(st.m.length, v));

  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((m) => {
    const c = el("button", "chip", `${m.length}×${m[0].length} · ${fmt(m)}`);
    c.onclick = () => { st.m = clone(m); rowsIn.value = st.m.length; colsIn.value = st.m[0].length; onShape(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  return out;
}

// A grid of editable cells. Rebuilt only when the dimensions change, so typing never
// loses the caret; `sync` refreshes the values of the cells the user is NOT in.
function editable(m, onEdit, onPick) {
  const g = el("div", "mr-grid");
  g.style.gridTemplateColumns = `repeat(${m[0].length}, 44px)`;
  const cells = m.map((row, r) => row.map((v, c) => {
    const i = el("input"); i.className = "mr-cell"; i.type = "text"; i.value = String(v);
    i.oninput = () => { const n = Number(i.value.trim()); onEdit(r, c, Number.isFinite(n) ? n : 0); };
    i.onfocus = () => onPick(r, c);
    g.append(i);
    return i;
  }));
  const sync = (vals) => cells.forEach((row, r) => row.forEach((i, c) => {
    if (i !== document.activeElement) i.value = String(vals[r][c]);
  }));
  return { g, cells, sync };
}

const readonlyGrid = (rows, cols) => {
  const g = el("div", "mr-grid");
  g.style.gridTemplateColumns = `repeat(${cols}, 44px)`;
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => {
    const d = el("div", "mr-cell", ""); g.append(d); return d;
  }));
  return { g, cells };
};

const labelled = (cap, grid) => { const s = el("div", "mr-side"); s.append(el("div", "mr-cap", cap), grid); return s; };

// ── BRUTE demo — click a source cell, watch its destination light up ─────────────
// The index map is the whole problem and it is unreadable in the abstract, so the
// demo makes one instance of it concrete at a time.
function mountBrute(host) {
  const st = { m: clone(CASES[2]), sel: { r: 0, c: 0 } };
  const out = frame(host, st, build);
  build();

  function build() {
    const R = st.m.length, C = st.m[0].length;
    st.sel = { r: Math.min(st.sel.r, R - 1), c: Math.min(st.sel.c, C - 1) };
    out.innerHTML = "";
    const inG = editable(st.m, (r, c, v) => { st.m[r][c] = v; paint(); }, (r, c) => { st.sel = { r, c }; paint(); });
    const outG = readonlyGrid(C, R);
    const stage = el("div", "mr-stage");
    stage.append(labelled(`matrix · ${R}×${C}`, inG.g), el("div", "mr-arrow", "⟳"), labelled(`out · ${C}×${R}`, outG.g));
    const counts = el("div", "mr-counts"), map = el("div", "mr-map"), note = el("div", "note");
    const wrap = el("div", "mr-wrap");
    wrap.append(stage, counts, map, note);
    out.append(wrap);
    paint();

    function paint() {
      const res = brute(st.m);
      const { r, c } = st.sel;
      const dr = c, dc = R - 1 - r;
      inG.sync(st.m);
      inG.cells.forEach((row, i) => row.forEach((cell, j) =>
        cell.classList.toggle("src", i === r && j === c)));
      outG.cells.forEach((row, i) => row.forEach((cell, j) => {
        cell.textContent = String(res[i][j]);
        cell.classList.toggle("dst", i === dr && j === dc);
      }));

      const bw = bruteWork(R, C), ow = optWork(R);
      const ow2 = ow.swaps * 2;
      counts.innerHTML =
        counter(bw.cells, `extra cell${s_(bw.cells)} allocated`, "hot") +
        counter(bw.writes, `cell write${s_(bw.writes)}`, "hot") +
        `<span class="mr-vs">In place, the same matrix would allocate <b>0</b> extra cells` +
        `${!isSquare(st.m)
          ? `, but this matrix is not square — it would return a scrambled grid rather than refuse`
          : ` and do <b>${ow2}</b> write${s_(ow2)} — ${ow2 > bw.writes ? `<b>more</b> writes than this, not fewer` : ow2 === bw.writes ? `the same number` : `<b>fewer</b>, the one size where in place wins on both counts`}`}.</span>`;

      map.innerHTML = `<b>out[<span class="w">${dr}</span>][<span class="w">${dc}</span>]</b> = ` +
        `matrix[<span class="a">${r}</span>][<span class="a">${c}</span>] = <b>${esc(String(st.m[r][c]))}</b>` +
        ` &nbsp;·&nbsp; the map is <b>out[c][R−1−r]</b>, with R = ${R}`;
      note.innerHTML = whyBrute(st.m, r, c, R, C);
    }
  }
}

function whyBrute(m, r, c, R, C) {
  const edge = r === 0
    ? `Row <b>0</b> is the top row, and <code class='inl'>out[c][R−1−0]</code> is the <i>last</i> column of every output row — so the top row becomes the right-hand column, read left-to-right going down. That is what "clockwise" means, and it is the sentence to check your index map against.`
    : c === 0
      ? `Column <b>0</b> is the left edge, and <code class='inl'>out[0][R−1−r]</code> is the top output row — so the left column becomes the top row, read bottom-to-top. Notice the reversal: <code class='inl'>R−1−r</code> is the only place the flip lives.`
      : r === R - 1
        ? `Row <b>${R - 1}</b> is the bottom row, and <code class='inl'>R−1−r</code> is <b>0</b> for it — the bottom row becomes the left-hand column. Every corner check like this one is cheap, and it is the only honest way to review a subscript expression.`
        : `An interior cell. <code class='inl'>r</code> becomes the output <i>column</i> (counted from the bottom) and <code class='inl'>c</code> becomes the output <i>row</i>: the two subscripts trade places, and exactly one of them is reversed. Swap which one gets the <code class='inl'>R−1−</code> and you have written the counter-clockwise rotation, which still returns a plausible-looking matrix.`;
  const shape = R === C
    ? ``
    : ` This matrix is <b>${R}×${C}</b>, so <code class='inl'>out</code> is <b>${C}×${R}</b> — a different shape from the input. That is fine here, because <code class='inl'>out</code> was allocated for it. The in-place approach cannot produce a different shape at all — it only ever writes back into the rows it was given — so on this input it does not refuse, it returns a ${R}×${C} full of scrambled values. Flip the Approach toggle to see it.`;
  const flat = m.flat();
  const dull = new Set(flat).size <= 2
    ? ` Watch this case in particular: with only ${new Set(flat).size} distinct value${new Set(flat).size === 1 ? "" : "s"} in the grid you cannot tell a rotation from a transpose by reading the answer, which is why freeCodeCamp ships it.`
    : ``;
  return edge + shape + dull;
}

// ── OPT demo — the two moves, staged ────────────────────────────────────────────
// Each frame is the whole matrix after one swap or one row reversal, so the user can
// step across the boundary between "transpose" and "reverse" and see what each buys.
function optFrames(m) {
  const n = m.length, g = clone(m);
  const frames = [{ g: clone(g), stage: 0, hit: [], swaps: 0, label: "the matrix as given" }];
  let swaps = 0;
  for (let r = 0; r < n; r++) for (let c = r + 1; c < n; c++) {
    [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
    swaps++;
    frames.push({ g: clone(g), stage: 1, hit: [[r, c], [c, r]], swaps, label: `swap [${r}][${c}] ↔ [${c}][${r}]` });
  }
  for (let r = 0; r < n; r++) {
    g[r].reverse();
    swaps += Math.floor(n / 2);
    frames.push({ g: clone(g), stage: 2, hit: g[r].map((_, i) => [r, i]), swaps, label: `reverse row ${r}` });
  }
  return frames;
}

function mountOpt(host) {
  const st = { m: clone(CASES[2]), at: 0 };
  const out = frame(host, st, build);
  build();

  function build() {
    const n = st.m.length, C = st.m[0].length;
    st.at = 0; st.scrub = null;                       // the previous build's slider is gone
    out.innerHTML = "";
    // Editing a cell invalidates every frame after the first, so rebuild them and
    // rewind — otherwise the stage replay would paint the old values back over the edit.
    const inG = editable(st.m, (r, c, v) => {
      st.m[r][c] = v; st.at = 0;
      if (isSquare(st.m)) frames = optFrames(st.m);
      paint();
    }, () => {});
    const wrap = el("div", "mr-wrap");
    const bar = el("div", "mr-stagebar"), lab = el("div", "mr-lab");
    const counts = el("div", "mr-counts"), note = el("div", "note");
    wrap.append(labelled(`matrix · ${n}×${C} — mutated in place`, inG.g), bar, lab, counts, note);
    out.append(wrap);

    const square = isSquare(st.m);
    let frames = [];
    if (square) {
      frames = optFrames(st.m);
      const cut = 1 + (n * (n - 1)) / 2;                  // first frame of the reverse stage
      const bReset = el("button", "chip", "⏮"), bBack = el("button", "chip", "◀"), bFwd = el("button", "chip", "▶");
      const scrub = el("input"); scrub.type = "range"; scrub.min = 0; scrub.className = "mr-scrub";
      scrub.max = frames.length - 1; scrub.value = 0;     // bound to the frame list, never a literal
      const jump1 = el("button", "chip", "after the transpose"), jump2 = el("button", "chip", "after the reverses");
      bar.append(bReset, bBack, bFwd, scrub, jump1, jump2);
      const go = (i) => { st.at = Math.max(0, Math.min(frames.length - 1, Number.isFinite(i) ? i : 0)); paint(); };
      bReset.onclick = () => go(0); bBack.onclick = () => go(st.at - 1); bFwd.onclick = () => go(st.at + 1);
      scrub.oninput = () => go(+scrub.value);
      jump1.onclick = () => go(cut - 1); jump2.onclick = () => go(frames.length - 1);
      st.scrub = scrub;
    }
    paint();

    function paint() {
      if (!square) {
        inG.sync(st.m);
        inG.cells.forEach((row, r) => row.forEach((cell, c) => {
          cell.className = "mr-cell" + (c >= n || r >= C ? " dead" : "");
        }));
        lab.innerHTML = "";
        counts.innerHTML = counter(0, "extra cells allocated", "cool") + counter(0, "swaps — this demo refuses to start", "hot");
        note.innerHTML = `<b>This demo declines — and note that the code would not.</b> Transposing in place swaps <code class='inl'>matrix[r][c]</code> with <code class='inl'>matrix[c][r]</code>, which only means anything when both exist. Here <code class='inl'>n = matrix.length</code> is <b>${n}</b> and gets used as <i>both</i> dimensions, so on this <b>${n}×${C}</b> the dashed cells are where that assumption breaks. Run it anyway and nothing throws — it returns <code class='inl'>[${esc(optUnguarded(st.m))}]</code>, ${n === C ? `` : `still <b>${n}</b> row${n === 1 ? "" : "s"} when a clockwise rotation of a ${n}×${C} has to be <b>${C}×${n}</b>, `}with the values scrambled. A silent wrong answer of a plausible shape is strictly worse than an exception, which is why the decline has to be made here rather than left to the algorithm. Switch to <b>Build a new grid</b>: it allocates <b>${C}×${n}</b> up front and never notices the difference. This is the one place the "wasteful" approach is strictly the more capable one.`;
        return;
      }
      const f = frames[st.at];
      if (st.scrub) st.scrub.value = st.at;
      inG.sync(f.g);
      const hit = new Set(f.hit.map(([r, c]) => `${r},${c}`));
      inG.cells.forEach((row, r) => row.forEach((cell, c) => {
        cell.className = "mr-cell" + (f.stage === 1 && r === c ? " diag" : "") + (hit.has(`${r},${c}`) ? " hit" : "");
      }));
      const stageName = ["start", "move 1 · transpose across the diagonal", "move 2 · reverse each row"][f.stage];
      lab.innerHTML = `<b>${esc(stageName)}</b> — ${esc(f.label)} &nbsp;<span class="muted">(frame ${st.at + 1} / ${frames.length})</span>`;
      const bw = bruteWork(n, C);
      const optTotal = optWork(n).swaps * 2;
      counts.innerHTML =
        counter(0, "extra cells allocated", "cool") +
        counter(f.swaps, `swap${s_(f.swaps)} so far`, "") +
        counter(f.swaps * 2, `cell write${s_(f.swaps * 2)} so far`, "") +
        `<span class="mr-vs">A new grid would allocate <b>${bw.cells}</b> cell${s_(bw.cells)} and do <b>${bw.writes}</b> write${s_(bw.writes)} — ` +
        `${optTotal > bw.writes ? `<b>fewer</b> writes than this approach's ${optTotal}, bought with ${bw.cells} cell${s_(bw.cells)} of extra memory`
          : optTotal === bw.writes ? `the same ${optTotal}, bought with ${bw.cells} cell${s_(bw.cells)} of extra memory`
          : `<b>more</b> writes than this approach's ${optTotal}, so at n = ${n} in place wins on both counts`}.</span>`;
      note.innerHTML = whyOpt(f, n);
    }
  }
}

function whyOpt(f, n) {
  if (f.stage === 0)
    return `Two moves, in this order. First <b>transpose</b> — reflect every cell across the main diagonal (the highlighted cells, where <code class='inl'>r === c</code>, are their own mirror and never move). Then <b>reverse each row</b>. Neither move needs a second matrix, and both are things you can check by eye, which is the real argument for this version over a single subscript expression.`;
  if (f.stage === 1) {
    const [r, c] = f.hit[0];
    return `Swapping <code class='inl'>[${r}][${c}]</code> with <code class='inl'>[${c}][${r}]</code>. The inner loop starts at <code class='inl'>c = r + 1</code>, and that bound is load-bearing: <code class='inl'>(${r},${c})</code> and <code class='inl'>(${c},${r})</code> are the <i>same pair</i>, so visiting both halves of the grid would swap every cell twice and hand back the original matrix unchanged. The diagonal is skipped for free by the same bound${n % 2 ? `, which is why the centre cell of an odd-sized grid never moves` : ``}. A transpose alone is <b>not</b> a rotation — the rows are right but each one is backwards.`;
  }
  const r = f.hit[0][0];
  return `Reversing row <b>${r}</b>. The transpose put old column <i>k</i> into row <i>k</i>, but reading bottom-to-top; the reverse flips it to top-to-bottom, which is what clockwise asks for. <b>Order matters</b> — transpose then reverse-rows is clockwise, reverse-rows then transpose is counter-clockwise, and getting it backwards is the classic bug because both answers are valid-looking matrices of the right shape. Note the cost: each reversal is ⌊n/2⌋ more swaps, so in-place finishes with <b>more</b> cell writes than the copy does. The only thing it wins is the memory.`;
}

// ── STEP (brute) — the index map, one cell at a time ─────────────────────────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">rotate</span>(<span class="tok" data-t="param">matrix</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="dims">R = matrix.length, C = matrix[<span class="nu">0</span>].length</span>;` },
  { ln: 3, html: `  <span class="k">const</span> out = <span class="tok" data-t="alloc">Array.<span class="fn">from</span>({ length: C }, () =&gt; <span class="fn">Array</span>(R).<span class="fn">fill</span>(<span class="nu">0</span>))</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="rloop">r = <span class="nu">0</span>; r &lt; R</span>; r++) {` },
  { ln: 5, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cloop">c = <span class="nu">0</span>; c &lt; C</span>; c++) {` },
  { ln: 6, html: `      <span class="tok" data-t="copy">out[c][R - <span class="nu">1</span> - r] = matrix[r][c]</span>;` },
  { ln: 7, html: `    }` },
  { ln: 8, html: `  }` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 10, html: `}` },
];

// One box per ROW, so the struct panel reads as a grid rather than a flat list. The
// cell under the cursor is bracketed; an unwritten cell of `out` is a dot, which is
// what makes it visible that the brute is filling a second matrix from empty.
const rowBox = (row, marks, hole) =>
  row.map((v, i) => {
    const t = v === null && hole ? "·" : String(v);
    return marks.includes(i) ? `[${t}]` : t;
  }).join(",");
const gridStruct = (label, g, mark, hole) => ({
  label,
  items: g.map((row, r) => rowBox(row, mark && mark[0] === r ? [mark[1]] : [], hole)),
});

function traceBrute(raw) {
  const matrix = parseMatrix(raw);
  const R = matrix.length, C = matrix[0].length;
  const steps = [];
  let out = null, r, c;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) { vars.R = R; vars.C = C; }
    if (line >= 4 && line <= 8) vars.r = r;
    if (line >= 5 && line <= 7) vars.c = c;
    const structs = [gridStruct("matrix", matrix, x.srcMark, false)];
    if (line >= 3 && out) structs.push(gridStruct("out", out, x.dstMark, true));
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `rotate(${R}×${C})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Rotate a <b>${R}×${C}</b> matrix 90° clockwise. Nothing is hidden here — no search, no state. The entire problem is writing down <i>where each cell goes</i> and being right about it, which is harder to check than it is to write.`, { focus: "param" });
  S(2, `<b>R = ${R}</b> rows, <b>C = ${C}</b> columns. Keep them apart: the output is <b>${C}×${R}</b>, not ${R}×${C}${R === C ? ` — they happen to match on a square, which is exactly why a mixed-up R and C survives every square test case` : ``}.`, { focus: "dims", changed: ["R", "C"] });

  out = Array.from({ length: C }, () => Array(R).fill(null));
  S(3, `Allocate the output up front: <b>${C}</b> rows of <b>${R}</b>. These are the <b>${R * C} extra cells</b> this approach costs, and they are the whole price — the work itself is one pass either way. Note the dots: nothing has been written yet, and you will watch the grid fill in an order that has nothing to do with reading order.`, { focus: "alloc" });

  for (r = 0; r < R; r++) {
    S(4, `Row <b>${r}</b> of the input. Every cell in it lands in the <i>same output column</i>, <code class='inl'>R−1−r</code> = <b>${R - 1 - r}</b> — a row of the input becomes a column of the output, which is the sentence "rotate clockwise" turned into arithmetic.`,
      { focus: "rloop", changed: ["r"], eval: { expr: `r = ${r} < R = ${R}`, val: true }, srcMark: [r, 0] });
    for (c = 0; c < C; c++) {
      S(5, `Column <b>${c}</b>. Together with r this names one cell, <code class='inl'>matrix[${r}][${c}]</code> = <b>${matrix[r][c]}</b>. The two subscripts are about to trade places.`,
        { focus: "cloop", changed: ["c"], eval: { expr: `c = ${c} < C = ${C}`, val: true }, srcMark: [r, c] });
      out[c][R - 1 - r] = matrix[r][c];
      S(6, `<code class='inl'>out[${c}][${R - 1 - r}] = matrix[${r}][${c}]</code> — the value <b>${matrix[r][c]}</b> moves to row <b>${c}</b>, column <b>${R - 1 - r}</b>. Read the map, don't trust it: <code class='inl'>c</code> became the output row and <code class='inl'>r</code> became the output column <i>counted from the far end</i>. Exactly one of the two subscripts is reversed; reverse the other one instead and you have written the counter-clockwise rotation, which returns a matrix of the right shape and the wrong contents.`,
        { focus: "copy", srcMark: [r, c], dstMark: [c, R - 1 - r] });
    }
  }
  r = R; c = undefined;
  S(4, `<b>r = ${R}</b> reached R, so every input cell has been read exactly once. <b>${R * C}</b> writes, <b>${R * C}</b> cells of new memory.`,
    { focus: "rloop", eval: { expr: `r = ${R} < R = ${R}`, val: false } });
  const res = brute(matrix);
  S(9, `<b>Return out.</b> The input was never touched — this version answers the question by building a second matrix beside it. That is what lets it handle a <b>non-square</b> input, and it is also the ${R * C} cells the in-place version refuses to pay.`,
    { focus: "ret", done: true, result: `[${res.map((x) => `[${x.join(",")}]`).join(", ")}]`, ret: { value: "out" } });
  return steps;
}

// ── STEP (opt) — two moves you can watch separately ─────────────────────────────
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">rotate</span>(<span class="tok" data-t="param">matrix</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="n">n = matrix.length</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="rloop">r = <span class="nu">0</span>; r &lt; n</span>; r++) {` },
  { ln: 4, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cloop">c = r + <span class="nu">1</span>; c &lt; n</span>; c++) {` },
  { ln: 5, html: `      <span class="tok" data-t="swap">[matrix[r][c], matrix[c][r]] = [matrix[c][r], matrix[r][c]]</span>;` },
  { ln: 6, html: `    }` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">for</span> (<span class="k">const</span> row <span class="k">of</span> matrix) <span class="tok" data-t="rev">row.<span class="fn">reverse</span>()</span>;` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">matrix</span>;` },
  { ln: 10, html: `}` },
];

function traceOpt(raw) {
  const m = parseMatrix(raw);
  const n = m.length, C = m[0].length;
  const g = clone(m);
  const steps = [];
  let r, c, row, swaps = 0;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.n = n;
    if (line >= 3 && line <= 7) vars.r = r;
    if (line >= 4 && line <= 6) vars.c = c;
    if (line === 8 && row) vars.row = `[${row.join(",")}]`;
    if (line >= 5) vars.swaps = swaps;
    const items = g.map((rw, i) => rowBox(rw, (x.mark || []).filter((p) => p[0] === i).map((p) => p[1]), false));
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `rotate(${n}×${C})`, vars, changed: x.changed || [], structs: [{ label: "matrix", items }], ret: x.ret }] });
  };

  S(1, `Rotate a <b>${n}×${C}</b> matrix clockwise <i>without allocating anything</i>. The move that makes it possible is a decomposition: a rotation is a <b>transpose</b> followed by a <b>row reversal</b>, and both of those are things you already trust.`, { focus: "param" });
  S(2, `<b>n = ${n}</b> — the row count, used as <i>both</i> dimensions from here on. That is the assumption this whole approach rests on.`, { focus: "n", changed: ["n"], eval: { expr: `every row.length === n = ${n}`, val: isSquare(m) } });

  if (!isSquare(m)) {
    S(5, `<b>Stopping here on purpose — the code would not.</b> Line 2 took <code class='inl'>n</code> from the row count, and every loop below uses it as <i>both</i> dimensions. On a <b>${n}×${C}</b> that quietly works on the wrong region: ${n < C ? `columns ${n}–${C - 1} are never visited at all` : `it reaches column ${n - 1} on rows that only have ${C}, writing past the end and leaving holes`}. <b>Nothing throws.</b> It returns <code class='inl'>[${esc(optUnguarded(m))}]</code> — ${n === C ? `` : `<b>${n}</b> row${n === 1 ? "" : "s"} where a clockwise rotation of a ${n}×${C} must have <b>${C}</b>, and `}the values scrambled. A wrong answer shaped like a plausible one is worse than a crash, and no official test would catch it, because every official case is square. The decomposition is real; it just only holds on a square — use <b>Step: copy into a new grid</b> for this input, which allocates a ${C}×${n} and never notices the difference.`,
      { focus: "swap", eval: { expr: `matrix.length (${n}) === matrix[0].length (${C})`, val: false } });
    return steps;
  }

  for (r = 0; r < n; r++) {
    const pairs = n - 1 - r;
    S(3, pairs > 0
      ? `Row <b>${r}</b> of the reflection. It has <b>${pairs}</b> cell${pairs === 1 ? "" : "s"} still to its right that have not been paired up yet.`
      : `Row <b>${r}</b> is the last one. Its only cell at or past the diagonal is <code class='inl'>[${r}][${r}]</code> itself, which is its own mirror — so the inner loop does not run at all, and nothing is left to swap.`,
      { focus: "rloop", changed: ["r"], eval: { expr: `r = ${r} < n = ${n}`, val: true }, mark: [[r, r]] });
    for (c = r + 1; c < n; c++) {
      S(4, `<b>c starts at r + 1 = ${r + 1}</b>, never at 0. <code class='inl'>(${r},${c})</code> and <code class='inl'>(${c},${r})</code> are the <i>same pair</i>; walk both halves of the grid and the second visit undoes the first, leaving the matrix exactly as it arrived. The same bound skips the diagonal, where <code class='inl'>r === c</code> and a swap would be a no-op.`,
        { focus: "cloop", changed: ["c"], eval: { expr: `c = ${c} < n = ${n}`, val: true }, mark: [[r, c], [c, r]] });
      [g[r][c], g[c][r]] = [g[c][r], g[r][c]];
      swaps++;
      S(5, `Swap <b>${g[c][r]}</b> and <b>${g[r][c]}</b> across the diagonal. One swap, two cell writes, no new memory — and notice the matrix panel above is the <i>same</i> array the caller handed in. After all of these, rows and columns will have traded roles but each row will read <b>backwards</b>; that leftover is what the second move is for.`,
        { focus: "swap", changed: ["swaps"], mark: [[r, c], [c, r]] });
    }
  }
  r = n; c = undefined;
  S(3, `<b>r = ${n}</b> reached n. The transpose is done: <b>${swaps}</b> swap${swaps === 1 ? "" : "s"}, ${swaps * 2} cell writes, still zero extra cells. But this is <i>not</i> the answer yet — it is the mirror image of it.`,
    { focus: "rloop", eval: { expr: `r = ${n} < n = ${n}`, val: false } });

  for (let i = 0; i < n; i++) {
    row = g[i];
    row.reverse();
    swaps += Math.floor(n / 2);
    S(8, `Reverse row <b>${i}</b>. The transpose dropped old column <i>${i}</i> into this row but reading <i>bottom-to-top</i>; flipping it makes it read top-to-bottom, which is what clockwise means. The order is the thing to remember: <b>transpose → reverse rows</b> is clockwise, <b>reverse rows → transpose</b> is counter-clockwise, and both compile.`,
      { focus: "rev", changed: ["swaps"], mark: row.map((_, j) => [i, j]) });
  }
  row = null;
  const bruteWrites = n * C;
  S(9, `<b>Return the same array that came in.</b> Total: <b>${swaps}</b> swaps, <b>${swaps * 2}</b> cell writes, <b>0</b> extra cells. Compare that honestly with the other approach — it writes <b>${bruteWrites}</b> cells, which is ${swaps * 2 > bruteWrites ? `<i>fewer</i> than this one` : `the same as this one`}. The in-place version is not faster; it is smaller, and it is made of two moves you can check by eye instead of one subscript expression you cannot.`,
    { focus: "ret", done: true, result: `[${g.map((x) => `[${x.join(",")}]`).join(", ")}]`, ret: { value: "matrix" } });
  return steps;
}

const STEP_PRESETS = CASES.map(fmt);
const stepInput = (value) => ({ type: "text", label: "matrix =", value, presets: STEP_PRESETS, hint: "rows separated by ;" });

export default {
  n: 27, id: "rotate", title: "Matrix Rotate", dates: ["2025-09-06"],
  statement: `Given a <b>matrix</b> (an array of arrays), rotate it <b>90 degrees clockwise</b> and return it. <span class="rule">Example: <code class="inl">rotate([[1, 2], [3, 4]])</code> → <code class="inl">[[3, 1], [4, 2]]</code> — the top row <code class="inl">1 2</code> becomes the right-hand column, read top to bottom.</span>`,
  variants: [
    {
      name: "Build a new grid", tone: "brute", cost: "O(n²) — n² extra cells",
      approach: `A rotation is a relabelling of coordinates, so the direct move is to write the relabelling down and copy. The cell at <code class='inl'>matrix[r][c]</code> ends up at <code class='inl'>out[c][R−1−r]</code>: the two subscripts trade places and exactly one of them is counted from the far end. Allocate a fresh <b>C×R</b> grid, walk the input once, place each value. One pass, n² writes, and — the honest upside — it is correct for <b>every shape</b>: a 2×3 rotates into a 3×2, which the in-place approach cannot do at all. What it costs is the second matrix, n² cells that did not exist a moment ago. The subtler cost is reviewability. <code class='inl'>out[c][R−1−r] = matrix[r][c]</code> is a claim nobody can verify by staring at it; put the <code class='inl'>R−1−</code> on the other subscript and the code still runs, still returns the right shape, and quietly computes the counter-clockwise rotation instead. That is why freeCodeCamp's <code class='inl'>[[0,1,0],[1,0,1],[0,0,0]]</code> case earns its place — with two distinct values you cannot catch a mis-map by reading the answer. Click any input cell to light up its destination, and check the corners against the sentence "the top row becomes the right column".`,
      code: `// Copy every cell to its rotated home in a brand-new C x R grid.
function rotate(matrix: number[][]): number[][] {
  const R = matrix.length, C = matrix[0]?.length ?? 0;
  // Allocated up front: C rows of R. These n^2 cells are the entire price of this
  // approach — and the reason it is the one that also handles a NON-SQUARE input,
  // since the output is C x R and nothing has to fit back into the original.
  const out: number[][] = Array.from({ length: C }, () => Array(R).fill(0));
  // The whole rotation is this one index map: row r / column c becomes row c /
  // column R-1-r. Exactly one subscript is reversed; reverse the other one and you
  // have written the counter-clockwise rotation, which looks just as plausible.
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      out[c][R - 1 - r] = matrix[r][c];
  return out;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: copy into a new grid", tone: "brute", cost: "index map",
      approach: `The two loops unrolled so each cell's journey is one step. Watch the <b>out</b> panel fill from dots: the order it fills in has nothing to do with reading order, because a <i>row</i> of the input is a <i>column</i> of the output. Start on <b>1,2,3;4,5,6;7,8,9</b> where every value is distinct and the map is easy to follow, then try <b>0,1,0;1,0,1;0,0,0</b> — freeCodeCamp's own case, and the one where you could not tell a wrong map from a right one by reading the result. <b>1,2,3;4,5,6</b> is ours: non-square, which this approach handles and the other cannot. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput("1,2,3;4,5,6;7,8,9") }),
    },
    {
      name: "Transpose, then reverse each row", tone: "opt", cost: "O(n²) — in place, 0 extra cells",
      approach: `When a transform is hard to verify as one index expression, look for a <b>decomposition</b> into moves you already trust. A clockwise rotation is exactly two of them: <b>transpose</b> (reflect across the main diagonal) and then <b>reverse each row</b>. Both are familiar, both are checkable by eye, and neither needs a second matrix — the transpose is a loop of swaps and <code class='inl'>row.reverse()</code> is in-place. Two details carry the weight. The inner loop must start at <code class='inl'>c = r + 1</code>, because <code class='inl'>(r,c)</code> and <code class='inl'>(c,r)</code> are the same pair: walk the whole grid and every swap happens twice, handing back the original. And the <b>order</b> is not a detail — transpose then reverse-rows is clockwise, reverse-rows then transpose is counter-clockwise, and getting it backwards is the classic bug precisely because both produce a legitimate-looking matrix. Be clear about what this buys: <b>not speed</b>. Both approaches are one O(n²) pass, and this one does <code class='inl'>n(n−1) + 2n⌊n/2⌋</code> cell writes against the copy's flat <code class='inl'>n²</code> — <i>more</i> writes for every n &gt; 1. What it wins is the n² cells it never allocates, and the fact that two visible moves are easier to get right than one subscript expression. The cost is generality, and it is a nastier cost than it first looks: <code class='inl'>n = matrix.length</code> gets used as <i>both</i> dimensions, so on a non-square the loops work on the wrong region and <b>nothing throws</b> — <code class='inl'>[[1,2,3],[4,5,6]]</code> comes back as <code class='inl'>[[3,4,1],[6,5,2]]</code>, still 2×3 where the answer must be 3×2, values scrambled. Every official case is square, so no test catches it. Load the 2×3 chip: the demo declines on the code's behalf and shows you what it would have returned.`,
      code: `// Rotate in place: transpose across the main diagonal, then reverse each row.
// SQUARE matrices only, and it will NOT tell you: n is the row count used as both
// dimensions, so a non-square silently comes back the wrong shape with the values
// scrambled rather than throwing. See the other approach for a general R x C.
function rotate(matrix: number[][]): number[][] {
  const n = matrix.length;
  // c starts at r + 1, never 0: (r, c) and (c, r) are the SAME pair, so walking
  // both halves swaps everything twice and returns the matrix unchanged. The same
  // bound skips the diagonal, where a swap would be a no-op anyway.
  for (let r = 0; r < n; r++)
    for (let c = r + 1; c < n; c++)
      [matrix[r][c], matrix[c][r]] = [matrix[c][r], matrix[r][c]];
  // Order matters: transpose THEN reverse rows is clockwise. Reverse first and you
  // get the counter-clockwise rotation — same shape, same plausibility, wrong answer.
  for (const row of matrix) row.reverse();
  return matrix;
}`,
      mount: mountOpt,
    },
    {
      name: "Step: transpose, then reverse", tone: "opt", cost: "two moves",
      approach: `The same matrix twice over: first every diagonal swap, then every row reversal, with the swap counter running the whole way. Step to the end of the transpose on <b>1,2,3;4,5,6;7,8,9</b> and stop — the values are all in the right <i>rows</i> and every row is backwards, which is the clearest picture of why the second move exists. On <b>0,1,0;1,0,1;0,0,0</b> the transpose and the rotation are different matrices that look equally reasonable, so it is the case worth stepping slowly. Then load <b>1,2,3;4,5,6</b>, where the trace stops after line 2 and prints what the unguarded code would have returned instead — the demo declines because the algorithm will not. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: stepInput("1,2,3;4,5,6;7,8,9") }),
    },
  ],
};
