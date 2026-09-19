// #20 · Array Duplicates — a value's second sighting is the whole answer.
// "Appears more than once" reads as a counting question, and counting is what the
// first approach does: for every element, re-scan the entire array to tally it. The
// tally dies with the row, so the 21-element official case pays 441 equality tests
// to describe 21 numbers — and nine of its rows re-count a value already settled.
// • BRUTE / re-scan the whole array once per element, then dedupe the answers.
// • OPT   / one pass; a value already in `seen` is, by definition, a duplicate.
// Both demos carry an op counter and open on that 21-element case: 441 tests against
// 21 lookups, same [-6, 0, 2, 4, 5, 23]. Note the numeric comparator on the final
// sort — the default returns [-6, 0, 2, 23, 4, 5] — but that gotcha belongs to #309.
import { el, mountDebugger } from "../shared.js";

// The three official freeCodeCamp cases first, then three of ours.
//   [7,7,7,7] — one value, four copies. "Only include one instance of each value"
//     with nothing else going on: the brute pushes once and then re-derives the same
//     7 three more times, and Set.add absorbs it silently on the other side.
//   [100,100,9,9,20,20] — the comparator trap in miniature. The answer is
//     [9, 20, 100]; a bare .sort() hands back [100, 20, 9]. The official 21-element
//     case catches this too, but it buries it under twenty other numbers.
//   [] — the degenerate the grader never tries. Both loops fail on entry, and the
//     return is an empty array rather than undefined.
const OFFICIAL = [
  [1, 2, 3, 4, 5],
  [1, 2, 3, 4, 1, 2],
  [2, 34, 0, 1, -6, 23, 5, 3, 2, 5, 67, -6, 23, 2, 43, 2, 12, 0, 2, 4, 4],
];
const PRESETS = [...OFFICIAL, [7, 7, 7, 7], [100, 100, 9, 9, 20, 20], []];
const OPENING = PRESETS[2]; // the 21-element official case — where 441 vs 21 shows

const parseArr = (s) => String(s).split(/[,\s]+/).map((x) => x.trim()).filter((x) => x !== "")
  .map(Number).filter((x) => Number.isFinite(x));

const fmt = (a) => a.length > 12 ? `[${a.slice(0, 10).join(", ")}, …${a.length - 10} more]` : `[${a.join(", ")}]`;
const chip = (a) => a.length ? `[${a.length > 7 ? a.slice(0, 6).join(",") + ",…" : a.join(",")}]` : "[ ]";

// ── the two runs, instrumented ──────────────────────────────────────────────
// Brute: one row per element, each row a full sweep of the array. `already` is
// recorded BEFORE the push, so it marks the rows that re-derived a known answer.
function bruteRun(arr) {
  const n = arr.length;
  const rows = [];
  const dupes = [];
  let comparisons = 0;
  for (let i = 0; i < n; i++) {
    let count = 0;
    const hits = [];
    for (let j = 0; j < n; j++) { comparisons++; if (arr[j] === arr[i]) { count++; hits.push(j); } }
    const already = dupes.includes(arr[i]);
    if (count > 1 && !already) dupes.push(arr[i]);
    rows.push({ i, v: arr[i], count, hits, dup: count > 1, already });
  }
  return { rows, comparisons, order: [...dupes], out: [...dupes].sort((a, b) => a - b),
    redundant: rows.filter((r) => r.already).length };
}

// Opt: one pass. `trail` is what the demo draws — per element, whether this was
// the first sighting (goes to `seen`) or a later one (goes to `dupes`).
function optRun(arr) {
  const seen = new Set(), dupes = new Set();
  const trail = [];
  for (const v of arr) {
    const again = seen.has(v);
    if (again) dupes.add(v); else seen.add(v);
    trail.push({ v, again });
  }
  const order = [...dupes];
  return { trail, seen: [...seen], order, out: [...order].sort((a, b) => a - b),
    lex: [...order].sort(), lookups: arr.length };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ad-wrap { display:flex; flex-direction:column; gap:12px; }
    .ad-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .ad-grid { display:grid; gap:2px; width:max-content; max-width:100%; overflow:auto; align-items:center; }
    .ad-h { font:700 11px var(--mono); color:var(--muted); padding-right:7px; text-align:right; white-space:nowrap; }
    .ad-h.dup { color:var(--good); }
    .ad-h.again { opacity:.4; }
    .ad-t { font:700 10.5px var(--mono); color:var(--muted); padding-left:8px; white-space:nowrap; }
    .ad-t.dup { color:var(--good); }
    .ad-t.again { color:var(--warn); }
    .ad-c { border-radius:2px; background:var(--panel-2); border:1px solid var(--border);
            display:flex; align-items:center; justify-content:center; font:700 10px var(--mono); color:var(--muted); }
    .ad-c.hit { background:color-mix(in srgb, var(--good) 28%, transparent); border-color:var(--good); color:var(--good); }
    .ad-c.self { background:color-mix(in srgb, var(--accent) 18%, transparent); border-color:color-mix(in srgb, var(--accent) 55%, var(--border)); color:var(--accent); }
    .ad-cards { display:flex; flex-wrap:wrap; gap:5px; }
    .ad-card { min-width:46px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:5px 7px; text-align:center; }
    .ad-card .v { display:block; font:800 15px var(--mono); color:var(--text); }
    .ad-card .w { font:700 9px var(--sans); letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
    .ad-card.first { border-color:color-mix(in srgb, var(--accent) 50%, var(--border)); }
    .ad-card.first .w { color:var(--accent); }
    .ad-card.again { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, transparent); }
    .ad-card.again .v, .ad-card.again .w { color:var(--good); }
    .ad-chips { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
    .ad-kv { font:700 11.5px var(--mono); border:1px solid var(--border); border-radius:6px; padding:3px 7px; background:var(--panel); color:var(--muted); }
    .ad-kv.dup { border-color:var(--good); color:var(--good); }
    .ad-sort { font:12.5px var(--mono); color:var(--muted); line-height:1.95; }
    .ad-sort b { color:var(--text); }
    .ad-sort .ok { color:var(--good); font-weight:800; }
    .ad-sort .no { color:var(--danger); font-weight:800; }
  `));
}

// Shared controls: one text field plus the preset chips. Both approaches read the
// same field, so flipping the toggle keeps whatever case you were looking at.
function controls(host, onChange) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = OPENING.join(", "); inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "arr"), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", chip(p));
    c.onclick = () => { inp.value = p.join(", "); onChange(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = onChange;
  queueMicrotask(onChange); // defer: the caller's `const out = controls(...)` must bind first
  return { out, read: () => parseArr(inp.value) };
}

const GRID_CAP = 40; // beyond this the n×n square is more cells than a page wants

// ── BRUTE demo — the n×n square of equality tests ───────────────────────────
function mountBrute(host) {
  const { out, read } = controls(host, render);
  function render() {
    const arr = read();
    const n = arr.length;
    const r = bruteRun(arr);
    out.innerHTML = "";
    const wrap = el("div", "ad-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ok">findDuplicates(${fmt(arr)}) → [${r.out.join(", ")}]</span>` +
      `<span class="opcount hot"><span class="n">${r.comparisons.toLocaleString("en-US")}</span> equality tests</span>`));

    if (!n) {
      wrap.append(el("div", "note", "Empty array: the outer loop fails on its very first condition, so no row is ever built and <code class='inl'>dupes</code> is returned exactly as it was declared — the empty array the statement asks for, not <code class='inl'>undefined</code>."));
      out.append(wrap); return;
    }
    if (n > GRID_CAP) {
      wrap.append(el("div", "note", `<b>${n}</b> elements means <b>${r.comparisons.toLocaleString("en-US")}</b> equality tests — too many cells to draw, which is rather the point. Drop below ${GRID_CAP} values to see the square.`));
      out.append(wrap); return;
    }

    // One row per i, one cell per j. The shaded cells are the matches; the whole
    // square is the work, because the inner loop starts at 0 every time.
    const cs = n <= 10 ? 24 : n <= 16 ? 16 : n <= 28 ? 11 : 7;
    const grid = el("div", "ad-grid");
    grid.style.gridTemplateColumns = `max-content repeat(${n}, ${cs}px) max-content`;
    const cells = [];
    r.rows.forEach((row) => {
      cells.push(`<div class="ad-h${row.dup ? " dup" : ""}${row.already ? " again" : ""}">${row.v}</div>`);
      for (let j = 0; j < n; j++) {
        const hit = arr[j] === row.v;
        const cls = j === row.i ? "self" : hit ? "hit" : "";
        cells.push(`<div class="ad-c ${cls}" style="height:${cs}px">${cs >= 16 ? arr[j] : ""}</div>`);
      }
      cells.push(`<div class="ad-t${row.already ? " again" : row.dup ? " dup" : ""}">×${row.count}${row.already ? " — already recorded" : row.dup ? " ✓" : ""}</div>`);
    });
    grid.innerHTML = cells.join("");
    wrap.append(el("div", "ad-lbl", `row i counts arr[i] across the whole array — every cell is one <code class="inl">===</code>`), grid);

    const distinct = new Set(arr).size;
    wrap.append(el("div", "note", (r.out.length
      ? `Answered in <b>row</b> order as <b>[${r.order.join(", ")}]</b> — a value lands in the results on the row of its <i>first</i> copy, since that row already knows the whole count — then sorted to <b>[${r.out.join(", ")}]</b>. `
      : `No row came back with a count above 1, so <code class='inl'>dupes</code> is still empty. `) +
      `Each row is a complete sweep: <b>${n}</b> rows × <b>${n}</b> reads = <b>${r.comparisons.toLocaleString("en-US")}</b> equality tests to describe <b>${n}</b> numbers. ` +
      (r.redundant
        ? `<b>${r.redundant}</b> of those rows are dimmed above because they re-count a value an earlier row already settled — there are only <b>${distinct}</b> distinct values here, so ${r.redundant} entire scans produce an answer the <code class='inl'>includes</code> guard then throws away. `
        : `Every value here is distinct, so no row repeats another — this is the brute at its best, and it still costs the full square. `) +
      `Nothing a row learns outlives it, which is the waste the other approach removes.`));
    out.append(wrap);
  }
}

// ── OPT demo — one pass, two sets ───────────────────────────────────────────
function mountOpt(host) {
  const { out, read } = controls(host, render);
  function render() {
    const arr = read();
    const n = arr.length;
    const r = optRun(arr);
    const b = bruteRun(arr);
    out.innerHTML = "";
    const wrap = el("div", "ad-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ok">findDuplicates(${fmt(arr)}) → [${r.out.join(", ")}]</span>` +
      `<span class="opcount cool"><span class="n">${n}</span> set lookups</span>`));

    if (!n) {
      wrap.append(el("div", "note", "Empty array: the <code class='inl'>for…of</code> has nothing to iterate, so both sets stay empty and <code class='inl'>[...dupes]</code> spreads to <code class='inl'>[]</code>. The empty case needs no branch of its own — it falls out of the same three lines."));
      out.append(wrap); return;
    }

    const cards = el("div", "ad-cards");
    r.trail.forEach((t) => cards.append(el("div", "ad-card " + (t.again ? "again" : "first"),
      `<span class="v">${t.v}</span><span class="w">${t.again ? "again" : "first"}</span>`)));
    wrap.append(el("div", "ad-lbl", "one pass, left to right — each value is either new or a repeat"), cards);

    const seenRow = el("div", "ad-chips");
    r.seen.forEach((v) => seenRow.append(el("span", "ad-kv", String(v))));
    wrap.append(el("div", "ad-lbl", `seen — every distinct value, in the order it first appeared`), seenRow);

    const dupRow = el("div", "ad-chips");
    if (!r.order.length) dupRow.append(el("span", "muted", "(empty — no value was ever met twice)"));
    r.order.forEach((v) => dupRow.append(el("span", "ad-kv dup", String(v))));
    wrap.append(el("div", "ad-lbl", "dupes — filled by the pass, not derived from it"), dupRow);

    if (r.order.length) {
      const lexBad = String(r.lex) !== String(r.out);
      wrap.append(el("div", "ad-sort",
        `<div>insertion order &nbsp;<b>[${r.order.join(", ")}]</b></div>` +
        `<div><code class="inl">.sort((a, b) =&gt; a - b)</code> → <span class="ok">[${r.out.join(", ")}]</span></div>` +
        (lexBad ? `<div><code class="inl">.sort()</code> → <span class="no">[${r.lex.join(", ")}]</span> &nbsp;— compared as text</div>` : "")));
    }

    const maxRun = Math.max(...b.rows.map((x) => x.count));
    wrap.append(el("div", "note",
      `Every element is looked at exactly once. The first sighting parks a value in <b>seen</b>; a later sighting is <i>by definition</i> the moment it becomes a duplicate, so <b>dupes</b> is filled <b>during</b> the pass instead of being worked out after it — <b>${n}</b> lookups against the re-scan's <b>${b.comparisons.toLocaleString("en-US")}</b> equality tests, same answer. ` +
      `"Only one instance of each value" then costs nothing: <code class='inl'>Set.add</code> is idempotent, so the ${maxRun === 1 ? "repeats, if there were any," : `${maxRun} copies of ${b.rows.find((x) => x.count === maxRun).v}`} collapse without a single <code class='inl'>includes</code> check. ` +
      (r.order.length
        ? `The one thing the sets can't give you is order — a set has none — so the ascending clause still needs a sort, and it needs the comparator: ${String(r.lex) !== String(r.out) ? `bare <code class='inl'>.sort()</code> stringifies and answers <b>[${r.lex.join(", ")}]</b> on this very input.` : `this input happens to sort the same either way, which is exactly how a missing comparator survives testing — try the <code class='inl'>[100,100,9,9,20,20]</code> preset.`}`
        : `Nothing was ever met twice, so the sort runs on an empty array and the answer is <code class='inl'>[]</code>.`)));
    out.append(wrap);
  }
}

// ── STEP: re-scan ───────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">findDuplicates</span>(<span class="tok" data-t="param">arr</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> dupes = <span class="tok" data-t="init">[]</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="i">i = 0; i &lt; arr.length</span>; i++) {` },
  { ln: 4,  html: `    <span class="k">let</span> <span class="tok" data-t="zero">count = <span class="nu">0</span></span>;` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="j">j = 0; j &lt; arr.length</span>; j++) {` },
  { ln: 6,  html: `      <span class="k">if</span> (<span class="tok" data-t="eq">arr[j] === arr[i]</span>) count++;` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `    <span class="k">if</span> (<span class="tok" data-t="verdict">count &gt; <span class="nu">1</span> &amp;&amp; !dupes.<span class="fn">includes</span>(arr[i])</span>) dupes.<span class="fn">push</span>(arr[i]);` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">dupes.<span class="fn">sort</span>((a, b) =&gt; a - b)</span>;` },
  { ln: 11, html: `}` },
];

// ── STEP: two sets ──────────────────────────────────────────────────────────
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">findDuplicates</span>(<span class="tok" data-t="param">arr</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> seen = <span class="tok" data-t="mkseen"><span class="k">new</span> <span class="fn">Set</span>()</span>;` },
  { ln: 3, html: `  <span class="k">const</span> dupes = <span class="tok" data-t="mkdup"><span class="k">new</span> <span class="fn">Set</span>()</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="take">v</span> <span class="k">of</span> arr) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="has">seen.<span class="fn">has</span>(v)</span>) dupes.<span class="fn">add</span>(v);` },
  { ln: 6, html: `    <span class="k">else</span> <span class="tok" data-t="add">seen.<span class="fn">add</span>(v)</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">[...dupes].<span class="fn">sort</span>((a, b) =&gt; a - b)</span>;` },
  { ln: 9, html: `}` },
];

// The 21-element official case is 441 inner steps — reachable by typing it in, but
// far too long to open on, so the step chips are the short cases. TRACE_CAP keeps a
// pasted 500-element array from building a quarter of a million Step objects.
const TRACE_CAP = 40;
const STEP_PRESETS = PRESETS.filter((p) => p.length <= 12).map((p) => p.join(","));
const stepInput = (value) => ({ type: "text", label: "arr =", value, presets: STEP_PRESETS, hint: "comma-separated" });

function traceBrute(raw) {
  const arr = parseArr(raw).slice(0, TRACE_CAP);
  const n = arr.length;
  const steps = [];
  const dupes = [];
  let i, j, count, comparisons = 0;
  const title = `findDuplicates([${arr.join(", ")}])`;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3 && line <= 9 && i !== undefined) vars.i = i;
    if (line >= 4 && line <= 8 && count !== undefined) vars.count = count;
    if (line >= 5 && line <= 7 && j !== undefined) vars.j = j;
    if (line >= 3) vars.comparisons = comparisons;
    const structs = [{ label: "arr", items: arr.map(String) }];
    if (line >= 2) structs.push({ label: "dupes", items: dupes.map(String), newest: !!x.fresh });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Which of these <b>${n}</b> integer${n === 1 ? "" : "s"} appear more than once? Read literally, that is a <b>counting</b> question — so count, one value at a time.`, { focus: "param" });
  S(2, `The answers collect here. It starts empty, and if nothing repeats it stays that way — which is the empty array the statement asks for, arrived at by doing nothing special.`, { focus: "init" });

  for (i = 0; i < n; i++) {
    count = undefined; j = undefined;
    S(3, `Row <b>${i}</b>: take <b>arr[${i}] = ${arr[i]}</b> and find out how many times it occurs.`, { focus: "i", changed: ["i"] });
    count = 0;
    S(4, `A fresh tally for this row. It is a <code class='inl'>let</code> inside the loop body, so nothing this row discovers survives into the next one — that is the entire cost of this approach in one word.`, { focus: "zero", changed: ["count"] });
    j = 0;
    S(5, `The inner loop starts at <b>j = 0</b>, not <code class='inl'>i + 1</code>: to <i>count</i> ${arr[i]} you have to look at every position, including the ones behind you and the one you are standing on.`, { focus: "j", changed: ["j"] });
    for (j = 0; j < n; j++) {
      comparisons++;
      const hit = arr[j] === arr[i];
      if (hit) count++;
      S(6, `<b>arr[${j}] = ${arr[j]}</b> ${hit ? "===" : "!=="} <b>${arr[i]}</b>${j === i ? ` — this is position ${i} itself, so the match is guaranteed. That free +1 is exactly why the threshold below is <code class='inl'>count &gt; 1</code> and not <code class='inl'>count &gt; 0</code>` : hit ? ` — tally up to <b>${count}</b>` : ``}. Test <b>${comparisons}</b> of <b>${n * n}</b>.`,
        { focus: "eq", changed: hit ? ["count", "comparisons"] : ["comparisons"], eval: { expr: `${arr[j]} === ${arr[i]}`, val: hit } });
    }
    j = undefined;
    const already = dupes.includes(arr[i]);
    const push = count > 1 && !already;
    S(8, count <= 1
      ? `<b>count = ${count}</b>, so <b>${arr[i]}</b> is unique — nothing to record, and the whole row's work evaporates.`
      : already
        ? `<b>count = ${count} &gt; 1</b>, but <b>${arr[i]}</b> is already in <code class='inl'>dupes</code>. This row re-derived an answer an earlier row had, and the <code class='inl'>includes</code> guard is the only thing stopping "${arr[i]}" appearing ${count} times in the output — "only one instance of each value" costs a scan of the results, on top of the scan of the array.`
        : `<b>count = ${count} &gt; 1</b> and <b>${arr[i]}</b> is new to <code class='inl'>dupes</code>. Record it.`,
      { focus: "verdict", fresh: push, eval: { expr: `${count} > 1 && !dupes.includes(${arr[i]})`, val: push } });
    if (push) dupes.push(arr[i]);
  }
  i = count = undefined;

  const order = [...dupes];
  dupes.sort((a, b) => a - b);
  S(10, `All <b>${n}</b> rows done, at a cost of <b>${comparisons}</b> equality tests. <code class='inl'>dupes</code> came out in <b>row</b> order${order.length ? ` — <b>[${order.join(", ")}]</b>, each value recorded on the row of its first copy` : ""}, which is not the ascending order the statement wants, so sort it. The comparator is not optional: <code class='inl'>.sort()</code> with no argument compares the numbers as <b>text</b>. <b>Return [${dupes.join(", ")}]</b>.`,
    { focus: "ret", done: true, result: `[${dupes.join(", ")}]`, ret: { value: `[${dupes.join(", ")}]` } });
  return steps;
}

function traceOpt(raw) {
  const arr = parseArr(raw).slice(0, TRACE_CAP);
  const n = arr.length;
  const steps = [];
  const seen = new Set(), dupes = new Set();
  let v, lookups = 0;
  const title = `findDuplicates([${arr.join(", ")}])`;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4 && line <= 7 && v !== undefined) vars.v = v;
    if (line >= 4) vars.lookups = lookups;
    const structs = [{ label: "arr", items: arr.map(String) }];
    if (line >= 2) structs.push({ label: "seen", items: [...seen].map(String), newest: x.fresh === "seen" });
    if (line >= 3) structs.push({ label: "dupes", items: [...dupes].map(String), newest: x.fresh === "dupes" });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Same <b>${n}</b> integer${n === 1 ? "" : "s"}, but stop treating this as a counting problem. You never need a value's <i>count</i> — only whether it is more than one, and you learn that the instant you meet it a second time.`, { focus: "param" });
  S(2, `<b>seen</b> holds every value met so far. A Set, not an array, because the only question ever asked of it is membership, and a Set answers that in O(1) instead of a scan.`, { focus: "mkseen" });
  S(3, `<b>dupes</b> holds the answer as it is discovered. A Set again, and that choice quietly does the statement's "only include one instance of each value" work: <code class='inl'>add</code> of something already present is a no-op.`, { focus: "mkdup" });

  for (const x of arr) {
    v = x;
    S(4, `Take <b>${v}</b>. One visit, and it will not be revisited.`, { focus: "take", changed: ["v"] });
    lookups++;
    const again = seen.has(v);
    S(5, `Has <b>${v}</b> gone by before? <code class='inl'>seen.has(${v})</code> → <b>${again}</b>. That single question replaces the whole inner loop the other approach ran.`,
      { focus: "has", changed: ["lookups"], eval: { expr: `seen.has(${v})`, val: again } });
    if (again) {
      const had = dupes.has(v);
      dupes.add(v);
      S(5, had
        ? `Yes — and <b>${v}</b> was already in <code class='inl'>dupes</code> too. <code class='inl'>add</code> does nothing, so the set stays one entry long. No <code class='inl'>includes</code> check, no guard, no branch.`
        : `Yes. A second sighting <i>is</i> the definition of "appears more than once", so <b>${v}</b> is an answer — recorded now, mid-pass, rather than worked out afterwards.`,
        { focus: "has", fresh: had ? undefined : "dupes" });
    } else {
      seen.add(v);
      S(6, `No — first time. File <b>${v}</b> away so that if it turns up again, the next visit recognises it. This is the memory the re-scan refused to keep.`, { focus: "add", fresh: "seen" });
    }
  }
  v = undefined;

  const order = [...dupes];
  const out = [...order].sort((a, b) => a - b);
  const lex = [...order].sort();
  S(8, `The pass is over after <b>${lookups}</b> lookup${lookups === 1 ? "" : "s"}. Spread <code class='inl'>dupes</code> back into an array${order.length ? ` — <b>[${order.join(", ")}]</b>, in first-duplicated order, because a Set preserves insertion and nothing else` : `, which is empty`}, then sort ascending. ${order.length && String(lex) !== String(out) ? `<code class='inl'>(a, b) =&gt; a - b</code> is load-bearing here: the default comparator stringifies and would answer <b>[${lex.join(", ")}]</b>.` : `The comparator still matters — <code class='inl'>.sort()</code> compares as text — this input just doesn't expose it.`} <b>Return [${out.join(", ")}]</b>.`,
    { focus: "ret", done: true, result: `[${out.join(", ")}]`, ret: { value: `[${out.join(", ")}]` } });
  return steps;
}

export default {
  n: 20, id: "arrdupes", title: "Array Duplicates", dates: ["2025-08-30"],
  statement: `Given an array of integers, return the integers that appear <b>more than once</b>, sorted ascending, with <b>one instance each</b> — or an empty array if none do. <span class="rule">Example: <code class="inl">findDuplicates([1, 2, 3, 4, 1, 2])</code> → <code class="inl">[1, 2]</code>.</span>`,
  variants: [
    {
      name: "Re-scan for every element", tone: "brute", cost: "O(n²) — n² equality tests",
      approach: `"Appears more than once" is a statement about a <b>count</b>, so count: for each element, sweep the whole array tallying how many positions hold that same value, and keep the ones that come back above 1. The inner loop has to start at <code class='inl'>0</code> rather than <code class='inl'>i + 1</code> — a count needs every position, not just the ones ahead — which is why the grid below is a full square and not a triangle. Two details are easy to lose. The tally is <code class='inl'>let</code>-scoped to the row, so everything a row learns is discarded the moment it ends; and because every copy of a repeated value gets its own row, all of them pass the <code class='inl'>count &gt; 1</code> test, so <code class='inl'>!dupes.includes(...)</code> is what enforces "one instance each" — a scan of the results layered on top of a scan of the array.`,
      code: `function findDuplicates(arr: number[]): number[] {
  const dupes: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    let count = 0;                            // discarded when the row ends
    for (let j = 0; j < arr.length; j++) {    // from 0, not i + 1: a count needs every position
      if (arr[j] === arr[i]) count++;
    }
    // count > 1 fires once per copy, so includes() is what keeps one instance each
    if (count > 1 && !dupes.includes(arr[i])) dupes.push(arr[i]);
  }
  return dupes.sort((a, b) => a - b);         // numeric comparator, not the default
}`,
      mount: mountBrute,
    },
    {
      name: "Step: re-scan", tone: "brute", cost: "equality tests",
      approach: `Watch <b>comparisons</b> climb — <code class='inl'>1,2,3,4,1,2</code> costs <b>36</b> equality tests to sift six numbers, and <code class='inl'>7,7,7,7</code> spends three whole rows re-deriving a 7 that <code class='inl'>dupes</code> already has. <code class='inl'>1,2,3,4,5</code> is the no-early-exit case: the count can only be known at the end of a row, so a unique value is exactly as expensive as a repeated one. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput("1,2,3,4,1,2") }),
    },
    {
      name: "Seen set, dup set", tone: "opt", cost: "O(n) — one pass",
      approach: `You never actually need a count. "More than once" is a threshold at <b>two</b>, and you cross it the instant you meet a value for the second time — so the answer can be collected <i>during</i> a single left-to-right pass rather than computed after it. One set remembers what has gone by; the second collects anything that turns up in the first. The mental model is the opposite of the re-scan's: <b>remember</b> instead of <b>look again</b>. Two clauses of the statement then cost nothing. "Only one instance of each value" is free because <code class='inl'>Set.add</code> is idempotent, so no <code class='inl'>includes</code> guard is needed; and the empty-array case needs no branch, because two empty sets spread to an empty array on their own. What a set cannot give you is order — hence the final sort, and it wants <code class='inl'>(a, b) =&gt; a - b</code>, since the default one compares as text and puts <code class='inl'>23</code> before <code class='inl'>4</code>.`,
      code: `function findDuplicates(arr: number[]): number[] {
  const seen = new Set<number>();             // everything met so far
  const dupes = new Set<number>();            // ...and everything met twice
  for (const v of arr) {
    if (seen.has(v)) dupes.add(v);            // second sighting IS the definition
    else seen.add(v);                         // first sighting: remember it
  }
  // Set.add is idempotent, so "one instance each" needs no guard.
  return [...dupes].sort((a, b) => a - b);    // a bare .sort() gives 2, 23, 4
}`,
      mount: mountOpt,
    },
    {
      name: "Step: two sets", tone: "opt", cost: "set lookups",
      approach: `Three steps per element, always — <b>lookups</b> climbs by one per value and never more. Run <code class='inl'>1,2,3,4,1,2</code> for <b>6</b> lookups against the re-scan's <b>36</b> tests on the identical input and answer, then <code class='inl'>7,7,7,7</code> to watch <code class='inl'>dupes.add(7)</code> fire three times and change nothing. Paste the 21-element official case into the field for <b>21</b> against <b>441</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: stepInput("1,2,3,4,1,2") }),
    },
  ],
};
