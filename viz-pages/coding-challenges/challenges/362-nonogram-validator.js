// #362 · Nonogram Validator — the zeros ARE the separators; split on them and compare.
//
// ONE approach, on purpose. The other mental model — walk the cells with an
// index and count the current run, closing it whenever a 0 arrives — is the
// same single O(n) pass with the same op count on the same inputs. There is no
// wasteful act to name and no cost gap you could see on screen, which fails
// CONTRIBUTING's third Tier-3 test, so a "brute" tab would be two spellings of
// one idea rather than a second approach. Solution + Step through it is.
//
// The insight worth showing: every empty cell is a separator, so splitting the
// joined row on "0" produces exactly the maximal filled blocks. That buys three
// edge cases for free — "at least one empty cell between runs" is enforced by
// the split itself, leading/trailing zeros produce empty pieces that
// filter(Boolean) drops, and two runs that touch simply never get split apart,
// so they surface as one longer run and fail. The demo makes that derivation
// the visible thing: toggle a cell and watch join → split → filter → map
// re-run, with the resulting array compared to the clue position by position.
import { el, mountDebugger } from "../shared.js";

// ── The graded function, exactly as shipped in `code` below ────────────────
const runsOf = (cells) => cells.join("").split("0").filter(Boolean).map((r) => r.length);
const isValid = (clue, cells) => {
  const runs = runsOf(cells);
  return runs.length === clue.length && runs.every((r, i) => r === clue[i]);
};

// PROVENANCE — cases 1–6 are freeCodeCamp's official set for #362, in the order
// the grader lists them. Cases 7–8 are mine: the official set never tests a row
// whose runs are the clue's numbers in the WRONG ORDER (the trap that punishes
// anyone who compares sums or multisets), and never tests an empty clue, whose
// only valid row is one with no filled cells at all. Every case lands on a
// different outcome: exact match · runs merged · one run too many · valid with
// padded ends · three blocks · runs too short · right numbers wrong order ·
// empty clue. The first two failures also differ in *where* they fail — the
// length check versus the element-wise compare.
const CASES = [
  { label: "exact fit", clue: [3, 2], cells: [1, 1, 1, 0, 1, 1] },                                   // fCC 1 → true
  { label: "runs touch → merged", clue: [3, 2], cells: [0, 1, 1, 1, 1, 1] },                         // fCC 2 → false
  { label: "one run too many", clue: [1, 1, 1, 1], cells: [1, 0, 1, 0, 1, 0, 1, 0, 1] },             // fCC 3 → false
  { label: "padded ends, wide gap", clue: [1, 1, 1, 1], cells: [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0] },  // fCC 4 → true
  { label: "three blocks", clue: [3, 2, 3], cells: [0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0] }, // fCC 5 → true
  { label: "runs too short", clue: [3, 2, 3], cells: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0] },               // fCC 6 → false
  { label: "right numbers, wrong order", clue: [3, 2], cells: [1, 1, 0, 1, 1, 1] },                  // mine → false
  { label: "empty clue, empty row", clue: [], cells: [0, 0, 0, 0] },                                 // mine → true
];

const MAX_CELLS = 24;
const q = (a) => "[" + a.join(", ") + "]";
const sum = (a) => a.reduce((s, x) => s + x, 0);

// Parse the clue box. Blank means the empty clue [] — a real, testable input,
// not a "nothing entered yet" state, so it must survive the parse.
const parseClue = (s) =>
  s.split(",").map((x) => x.trim()).filter((x) => x !== "")
    .map(Number).filter((n) => Number.isInteger(n) && n > 0);

// PAINTING ONLY — the verdict comes from the split pipeline. This walk exists
// so each filled cell knows which run it belongs to and can be tinted by
// whether that run matches the clue at the same position.
function runIndexes(cells) {
  const out = []; let n = -1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) { if (i === 0 || !cells[i - 1]) n++; out.push(n); } else out.push(-1);
  }
  return out;
}

// Why did this row pass or fail? Name the first disagreement, then add the
// lesson the disagreement teaches — a bare red X teaches nothing.
function reason(clue, runs) {
  if (runs.length === clue.length && runs.every((r, i) => r === clue[i])) {
    return clue.length === 0
      ? `The clue is <b>[]</b> and the row has <b>no filled cells</b>, so there are zero runs to compare. Vacuously valid — the empty clue is satisfied by an all-empty row, however long.`
      : `Runs are <b>${q(runs)}</b> and the clue wants <b>${q(clue)}</b> — same count, same lengths, same order. Valid.`;
  }
  const n = Math.max(runs.length, clue.length);
  let i = 0; while (i < n && runs[i] === clue[i]) i++;
  let msg = `Runs are <b>${q(runs)}</b>, clue wants <b>${q(clue)}</b> — `;
  if (i >= runs.length) msg += `the row only has <b>${runs.length}</b> run${runs.length === 1 ? "" : "s"}, the clue asks for <b>${clue.length}</b>.`;
  else if (i >= clue.length) msg += `the row has <b>${runs.length}</b> runs, the clue only asks for <b>${clue.length}</b>.`;
  else msg += `at position <b>${i + 1}</b> the row's run is <b>${runs[i]}</b> long but the clue wants <b>${clue[i]}</b>.`;
  if (runs.length === clue.length &&
      [...runs].sort((a, b) => a - b).join() === [...clue].sort((a, b) => a - b).join())
    msg += ` Every number the clue asked for is present — but <b>order is significant</b>, so ${q(runs)} still isn't ${q(clue)}. Comparing sums or multisets would wrongly accept this.`;
  else if (runs.length < clue.length && sum(runs) === sum(clue))
    msg += ` The filled count is exactly right, so two runs have <b>merged</b>: they touch with no empty cell between them, and nothing downstream can tell them apart again.`;
  return msg;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ng-row { display:flex; gap:6px; flex-wrap:wrap; margin:14px 0 2px; }
    .ng-cell { width:34px; height:34px; border-radius:8px; cursor:pointer; display:flex; align-items:center;
      justify-content:center; font:800 12.5px var(--mono); color:var(--muted);
      background:var(--panel-2); border:2px solid var(--border); transition:transform .1s, box-shadow .15s; }
    .ng-cell:hover { transform:scale(1.09); border-color:var(--accent); }
    .ng-cell.on { color:var(--bg); }
    .ng-cell.on.ok  { background:var(--good); border-color:var(--good); }
    .ng-cell.on.bad { background:var(--danger); border-color:var(--danger); }
    .ng-pipe { font:12.5px/2 var(--mono); background:#0a0e14; border:1px solid var(--border);
      border-radius:9px; padding:9px 12px; margin-top:12px; overflow-x:auto; }
    .ng-pipe .op { color:var(--accent); }
    .ng-pipe .gone { color:var(--muted); text-decoration:line-through; }
    .ng-pipe .res { color:var(--text); font-weight:700; }
    .ng-cmp { display:flex; gap:5px; align-items:flex-end; flex-wrap:wrap; margin-top:14px; }
    .ng-col { display:flex; flex-direction:column; gap:4px; align-items:stretch; }
    .ng-lab { font:700 10px var(--sans); letter-spacing:.06em; text-transform:uppercase;
      color:var(--muted); text-align:center; min-height:13px; }
    .ng-box { min-width:34px; padding:4px 8px; border-radius:7px; border:1px solid var(--border);
      background:var(--panel-2); font:800 13.5px var(--mono); text-align:center; color:var(--text); }
    .ng-box.ok   { border-color:var(--good); color:var(--good); }
    .ng-box.bad  { border-color:var(--danger); color:var(--danger); }
    .ng-box.miss { color:var(--muted); }
    .ng-box.name { border-color:transparent; background:transparent; color:var(--muted);
      font:700 11px var(--mono); text-align:right; padding-right:10px; }
    .ng-why { font:12.5px/1.75 var(--mono); color:var(--text); margin-top:12px; }
    .ng-why b { color:var(--accent); }
  `));
}

// ── Variant 1 — the live row. Click a cell, edit the clue, watch the RLE ────
function mount(host) {
  ensureStyle();
  let clue = CASES[0].clue.slice();
  let cells = CASES[0].cells.slice();

  const chips = el("div", "controls");
  const mark = (k) => [...chips.children].forEach((x, xi) => x.classList.toggle("on", xi === k));
  CASES.forEach((c, i) => {
    const b = el("button", "chip", c.label);
    b.onclick = () => { clue = c.clue.slice(); cells = c.cells.slice(); inp.value = c.clue.join(", "); mark(i); render(); };
    chips.append(b);
  });

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = clue.join(", "); inp.style.width = "130px";
  inp.oninput = () => { clue = parseClue(inp.value); mark(-1); render(); };
  ctl.append(el("span", "ctl-label", "clue ="), inp, el("span", "ctl-label", "(comma-separated · blank = the empty clue [])"));

  const ctl2 = el("div", "controls");
  const bMinus = el("button", "chip", "− cell"), bPlus = el("button", "chip", "+ cell"), bClear = el("button", "chip", "clear row");
  bMinus.onclick = () => { if (cells.length > 1) { cells.pop(); mark(-1); render(); } };
  bPlus.onclick = () => { if (cells.length < MAX_CELLS) { cells.push(0); mark(-1); render(); } };
  bClear.onclick = () => { cells = cells.map(() => 0); mark(-1); render(); };
  ctl2.append(el("span", "ctl-label", "row:"), bMinus, bPlus, bClear);

  const out = el("div");
  host.append(chips, ctl, ctl2, out);

  function render() {
    const bits = cells.join("");
    const pieces = bits.split("0");
    const runs = pieces.filter(Boolean).map((r) => r.length);
    const rIdx = runIndexes(cells);
    const ok = isValid(clue, cells);
    out.innerHTML = "";

    // the row itself — a run is tinted green when it matches the clue at the
    // same position, red when it doesn't, so a wrong ORDER shows as two red runs
    const row = el("div", "ng-row");
    cells.forEach((v, i) => {
      const k = rIdx[i];
      const good = k >= 0 && k < clue.length && runs[k] === clue[k];
      const cell = el("div", "ng-cell" + (v ? " on " + (good ? "ok" : "bad") : ""), v ? "1" : "0");
      cell.onclick = () => { cells[i] = v ? 0 : 1; mark(-1); render(); };
      row.append(cell);
    });
    out.append(row, el("div", "ctl-label", "click a cell to toggle it filled / empty"));

    // the derivation, spelled out — this is the whole idea
    const empties = pieces.filter((p) => p === "").length;
    const pieceHtml = pieces.map((p) => p === "" ? `<span class="gone">""</span>` : `"${p}"`).join(", ");
    out.append(el("div", "ng-pipe",
      `<div><span class="op">cells.join("")</span> → <span class="res">"${bits || ""}"</span></div>` +
      `<div><span class="op">.split("0")</span> → [ ${pieceHtml} ]</div>` +
      `<div><span class="op">.filter(Boolean).map(r =&gt; r.length)</span> → <span class="res">${q(runs)}</span></div>`));

    // position-by-position comparison
    const cmp = el("div", "ng-cmp");
    const names = el("div", "ng-col");
    names.innerHTML = `<span class="ng-lab">&nbsp;</span><span class="ng-box name">clue</span><span class="ng-box name">runs</span>`;
    cmp.append(names);
    const wide = Math.max(clue.length, runs.length);
    for (let k = 0; k < wide; k++) {
      const c = clue[k], r = runs[k];
      const match = c !== undefined && r !== undefined && c === r;
      const cls = (x) => "ng-box " + (x === undefined ? "miss" : match ? "ok" : "bad");
      const col = el("div", "ng-col");
      col.innerHTML = `<span class="ng-lab">${k + 1}</span>` +
        `<span class="${cls(c)}">${c === undefined ? "—" : c}</span>` +
        `<span class="${cls(r)}">${r === undefined ? "—" : r}</span>`;
      cmp.append(col);
    }
    if (wide === 0) cmp.append(el("div", "ng-col", `<span class="ng-lab">&nbsp;</span><span class="ng-box miss">—</span><span class="ng-box miss">—</span>`));
    out.append(cmp);

    const line = el("div", "result-line");
    line.append(el("span", "badge " + (ok ? "ok" : "no"), ok ? "valid" : "invalid"),
      el("span", "tag", `isValidNonogram([${clue}], [${cells}]) → ${ok}`));
    out.append(line);
    out.append(el("div", "ng-why", reason(clue, runs)));
    out.append(el("div", "note", empties
      ? `${empties} of the ${pieces.length} pieces came back empty (struck through) — that's a zero at the row's edge or two zeros side by side. <code class='inl'>filter(Boolean)</code> drops them, which is exactly why padding the row with empty cells can never change the answer.`
      : `No empty pieces this time: every zero here has a filled cell on both sides. Add a leading or trailing empty cell and watch an <code class='inl'>""</code> appear in the split — and the verdict stay the same.`));
  }
  mark(0); render();
}

const CODE = `function isValidNonogram(clue: number[], cells: number[]): boolean {
  // The zeros ARE the separators. Splitting on them enforces "at least one
  // empty cell between runs" for free, and drops leading/trailing padding.
  const runs = cells.join("").split("0").filter(Boolean).map((r) => r.length);
  return runs.length === clue.length && runs.every((r, i) => r === clue[i]);
}`;

// ── STEP — the same pipeline, one stage per line ────────────────────────────
// The shipped solution is one expression; the debugger spreads it over lines so
// each stage of join → split → filter/map → compare gets its own step and its
// own state panel. `&&` short-circuiting in the return is written out as the
// early `if` + loop it actually performs.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">isValidNonogram</span>(clue, cells) {` },
  { ln: 2,  html: `  <span class="k">const</span> bits = <span class="tok" data-t="join">cells.<span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> pieces = <span class="tok" data-t="split">bits.<span class="fn">split</span>(<span class="st">"0"</span>)</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> runs = pieces.<span class="tok" data-t="filter"><span class="fn">filter</span>(Boolean)</span>.<span class="tok" data-t="map"><span class="fn">map</span>(r =&gt; r.length)</span>;` },
  { ln: 5,  html: `  <span class="k">if</span> (<span class="tok" data-t="lencheck">runs.length !== clue.length</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 6,  html: `  <span class="k">for</span> (<span class="k">let</span> i = 0; <span class="tok" data-t="icond">i &lt; runs.length</span>; i++) {` },
  { ln: 7,  html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">runs[i] !== clue[i]</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="ret">true</span>;` },
  { ln: 10, html: `}` },
];

// Instrumented run → debugger steps. ONE frame (no recursion). Scope is
// expressed by omission and gated on the line number: `bits` appears only once
// line 2 has run, `pieces` only from line 3, `runs` only from line 4, `r` lives
// only inside the map callback, and `i` only between lines 6 and 8. `clue` is a
// parameter, so it is on screen for the whole call.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const cs = CASES[idx] || CASES[0];
  const clue = cs.clue, cells = cs.cells;
  const steps = [];
  let bits = null, pieces = null, runs = null, r = null, i = null;

  const S = (line, note, o = {}) => {
    const vars = {};
    if (line >= 2 && bits !== null) vars.bits = `"${bits}"`;
    if (o.showR) vars.r = `"${r}"`;
    if (line >= 6 && line <= 8 && i !== null) vars.i = i;
    const structs = [{ label: "clue", items: clue.slice() }];
    if (line >= 3 && pieces) structs.push({ label: "pieces", items: pieces.map((p) => `"${p}"`) });
    if (line >= 4 && runs) structs.push({ label: "runs", items: runs.slice(), newest: !!o.runNew });
    steps.push({
      line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: "isValidNonogram(clue, cells)", vars, changed: o.changed || [], structs, ret: o.ret }],
    });
  };

  S(1, `<b>Case ${idx + 1}: ${cs.label}.</b> The clue <b>${q(clue)}</b> lists the lengths of the filled blocks this row must contain, <b>in that order</b>. Nothing here is a search — we read the runs the row already has and compare two arrays.`);

  bits = cells.join("");
  S(2, `Glue the cells into one string: <b>"${bits}"</b>. A string is the cheapest place to reason about "consecutive", because adjacency becomes neighbouring characters.`, { focus: "join", changed: ["bits"] });

  pieces = bits.split("0");
  const empties = pieces.filter((p) => p === "").length;
  S(3, `Split on <b>"0"</b>. This is the whole trick: an empty cell <i>is</i> a separator, so the pieces are exactly the maximal filled blocks. The "at least one empty cell between runs" rule needs no code — two runs that touch were never separated by a zero, so the split leaves them as <b>one</b> longer piece. ${empties} of the ${pieces.length} pieces came back empty, from zeros sitting side by side or at the row's ends.`, { focus: "split" });

  runs = [];
  for (let j = 0; j < pieces.length; j++) {
    r = pieces[j];
    if (r === "") {
      S(4, `Piece ${j + 1} is the empty string — the gap between two adjacent zeros, or the stub outside the row's first/last filled cell. <b>filter(Boolean)</b> discards it, which is why leading, trailing and doubled empty cells can never change the answer.`, { focus: "filter", showR: true, changed: ["r"] });
    } else {
      runs.push(r.length);
      S(4, `Piece ${j + 1} is <b>"${r}"</b> — a solid block of ${r.length} filled cell${r.length === 1 ? "" : "s"}. <b>map(r =&gt; r.length)</b> keeps only its length, closing run <b>${runs.length}</b>. The cells themselves are done with; from here the row is just this array.`, { focus: "map", showR: true, changed: ["r"], runNew: true });
    }
  }
  r = null;
  S(4, `The row's run-length encoding is complete: <b>${q(runs)}</b>. That single array is everything the clue can possibly be checked against.`, { focus: "map" });

  const lenBad = runs.length !== clue.length;
  S(5, clue.length === 0
    ? `Count first. The clue is <b>empty</b>, so the only rows that can satisfy it are the ones with no filled cells at all — any run at all is one too many.`
    : `Count before comparing. A clue naming <b>${clue.length}</b> block${clue.length === 1 ? "" : "s"} can only be satisfied by exactly ${clue.length} run${clue.length === 1 ? "" : "s"}, so a length mismatch settles it without looking at a single value.`,
    { focus: "lencheck", eval: { expr: `${runs.length} !== ${clue.length}`, val: lenBad } });
  if (lenBad) {
    const why = runs.length < clue.length && sum(runs) === sum(clue)
      ? `The right number of cells is filled, but they've <b>merged</b> — two blocks touch, so the split saw one run of ${runs[0]} instead of ${q(clue)}.`
      : runs.length > clue.length
        ? `The row breaks into <b>${runs.length}</b> blocks where the clue names only ${clue.length} — too many gaps.`
        : `The row breaks into <b>${runs.length}</b> block${runs.length === 1 ? "" : "s"} where the clue names ${clue.length}.`;
    S(5, `${why} <b>Return false</b> — no element-wise comparison is needed or even possible.`, { focus: "lencheck", done: true, result: "false", ret: { value: "false" } });
    return steps;
  }

  for (i = 0; ; i++) {
    const cont = i < runs.length;
    S(6, cont
      ? (i === 0
        ? `Same number of runs, so walk them <b>in step</b>. Position matters: the clue is an ordered list, so run 1 must match clue 1 — comparing the two as sets or by their sum would wave through a row that has the right blocks in the wrong places.`
        : `Position ${i} agreed, so advance to position <b>${i + 1}</b>.`)
      : `<b>i = ${i}</b> has reached the end of <code class='inl'>runs</code>${runs.length === 0 ? " — which was empty, so there was nothing to disagree about" : " and no position ever disagreed"}. Leave the loop.`,
      { focus: "icond", eval: { expr: `${i} < ${runs.length}`, val: cont }, changed: ["i"] });
    if (!cont) break;
    const bad = runs[i] !== clue[i];
    S(7, `The row's run ${i + 1} is <b>${runs[i]}</b> long; the clue's number ${i + 1} is <b>${clue[i]}</b>. ` + (bad
      ? `They disagree, and one disagreement is fatal — the clue describes the row exactly, not approximately.`
      : `They agree, so this block is where the clue wants it and at the length it wants.`),
      { focus: "cmp", eval: { expr: `${runs[i]} !== ${clue[i]}`, val: bad } });
    if (bad) {
      S(7, `<b>Return false.</b> ${q(runs)} is not ${q(clue)}${[...runs].sort((a, b) => a - b).join() === [...clue].sort((a, b) => a - b).join() ? ` — note that every number the clue asked for <i>is</i> present, just not in that order. Order is what makes this a nonogram clue rather than a tally.` : `.`}`,
        { focus: "cmp", done: true, result: "false", ret: { value: "false" } });
      return steps;
    }
  }
  i = null;
  S(9, runs.length === 0
    ? `No runs and no clue numbers: an all-empty row does satisfy the empty clue. <b>Return true</b> — the loop guarding the comparison is what makes this fall out for free rather than needing a special case.`
    : `Every position matched, in order, and the counts agreed. <b>Return true</b> — this row draws exactly ${q(clue)}.`,
    { focus: "ret", done: true, result: "true", ret: { value: "true" } });
  return steps;
}

export default {
  n: 362, id: "nonogram", title: "Nonogram Validator", dates: ["2026-08-07"],
  statement: `Given a <b>clue</b> — an array of numbers giving the lengths of the consecutive filled blocks, <b>in order</b> — and a <b>row</b> of <code class="inl">1</code>s (filled) and <code class="inl">0</code>s (empty), return whether the row satisfies the clue. Blocks must be separated by at least one empty cell; empty cells before the first block and after the last are free. Example: <code class="inl">isValidNonogram([3, 2], [1,1,1,0,1,1])</code> → <code class="inl">true</code>, but <code class="inl">[0,1,1,1,1,1]</code> → <code class="inl">false</code>, because those five filled cells touch and form a single run of 5. <span class="rule">Order is significant — a clue of [3,2] is not satisfied by a 2 then a 3.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Don't search for placements — <b>read the row</b>. Join the cells into a string, split it on <code class='inl'>"0"</code>, and the pieces are exactly the maximal filled blocks, because every empty cell is a separator. <code class='inl'>filter(Boolean)</code> throws away the empty pieces that leading, trailing and doubled zeros leave behind, and <code class='inl'>map(r =&gt; r.length)</code> turns each block into its length. Now the answer is a plain array comparison: same length, same values, <b>same order</b>. Click any cell — or edit the clue — and watch the derived run array move.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "split → compare",
      approach: `The same pipeline with one stage per line, so you can watch <code class='inl'>pieces</code> appear and <code class='inl'>runs</code> fill up one closed block at a time. Note where each case dies: <b>runs touch → merged</b> and <b>one run too many</b> never reach the comparison loop at all — the length check on line 5 settles them — while <b>right numbers, wrong order</b> survives that check and fails on line 7, which is the whole reason the compare is element-wise rather than a sum. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: the same cases as the solution demo` },
      }),
    },
  ],
};
