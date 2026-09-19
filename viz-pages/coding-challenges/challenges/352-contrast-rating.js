// #352 · Contrast Rating 1 — the first rung the ratio clears; large text is a lower column.
//
// SERIES — "Contrast Rating" is a three-day freeCodeCamp run (#352–#354), and it
// is a pipeline. This is DAY 1, and it owns the pipeline's LAST stage: the WCAG
// threshold table. #353 hands you two relative luminances and makes you compute
// the ratio — (l1 + 0.05) / (l2 + 0.05) — before rating it. #354 hands you two
// RGB triples and makes you gamma-correct each channel → luminance → ratio
// first. Both then fall into exactly this table. So there is deliberately no
// luminance and no gamma here: the one thing this module has to make obvious is
// the 2×3 grid itself, and specifically why the large-text column sits lower.
//
// ONE APPROACH. There is no wasteful way to read a two-row table — a "brute"
// version would be the same two comparisons spelled as an if/else chain, which
// is an edit, not a second mental model, and the only way to make it visibly
// cost more is to make it wrong. See CONTRIBUTING Tier 3.
import { el, mountDebugger } from "../shared.js";

// The WCAG rating table, transcribed straight from the problem's own grid, in
// the order it prints: strictest rung first. Each row is [rating, minimum ratio
// for NORMAL text, minimum ratio for LARGE text] — two numbers for one rung,
// not two tables. Row order is load-bearing: "the first row whose minimum is
// met" is the entire algorithm, and it is why "Fail" is not a row.
const THRESHOLDS = [
  ["AAA", 7.0, 4.5],
  ["AA", 4.5, 3.0],
];

// WCAG's own range: 1:1 is a colour against itself, 21:1 is black on white.
const RATIO_MIN = 1, RATIO_MAX = 21;

// The live function, character-for-character the one in CODE below.
function getContrastRating(ratio, isLargeText) {
  const r = Number(ratio);
  for (const [rating, normalMin, largeMin] of THRESHOLDS) {
    const min = isLargeText ? largeMin : normalMin;
    if (r >= min) return rating;
  }
  return "Fail";
}

// The table is rendered INTO the snippet, so the code a reader copies and the
// data the demo runs on cannot drift apart.
const TABLE_SRC = THRESHOLDS
  .map(([rating, n, l]) => `  ["${rating}", ${n.toFixed(1)}, ${l.toFixed(1)}],`)
  .join("\n");

const CODE = `// The rating table is DATA, not control flow — transcribed from the problem's
// own 2x3 grid, strictest rung first. Each row is [rating, normal minimum,
// large minimum]: the same rung measured in two columns, and the large-text
// number is the lower bar in every row.
const THRESHOLDS: [string, number, number][] = [
${TABLE_SRC}
];

function getContrastRating(ratio: number | string, isLargeText: boolean): string {
  // freeCodeCamp passes the ratio in as a string ("7.5"). Relational operators
  // would coerce it silently, and only because the other side is a number —
  // "4.2" >= "10" compares as text and is true. One Number() removes the doubt.
  const r = Number(ratio);

  for (const [rating, normalMin, largeMin] of THRESHOLDS) {
    // isLargeText picks a COLUMN. It is not a branch, which is exactly why the
    // table holds two numbers per row instead of being duplicated per size.
    const min = isLargeText ? largeMin : normalMin;

    // ">=" because the table's "7.0+" is inclusive. Rows run strictest-first,
    // so the first rung the ratio clears is the best rating it can earn.
    if (r >= min) return rating;
  }

  // "below 4.5" / "below 3.0" is the exact complement of the AA row, so Fail
  // needs no threshold of its own — it is just "cleared nothing".
  return "Fail";
}`;

// ── Display plumbing, not a lesson ───────────────────────────────────────────
// Given a target ratio against pure black, the grey that hits it exactly. Black
// has luminance 0, so (L + 0.05) / 0.05 = ratio inverts to L = 0.05 * (ratio − 1),
// and the sRGB transfer curve inverts in closed form. That arithmetic is #353's
// and #354's subject, not this module's — it lives here only so the rating can
// be SEEN, and it is deliberately never narrated.
const greyFor = (ratio) => {
  const L = 0.05 * (Math.min(RATIO_MAX, Math.max(RATIO_MIN, ratio)) - 1);
  const c = L <= 0.0031308 ? L * 12.92 : 1.055 * Math.pow(L, 1 / 2.4) - 0.055;
  const v = Math.round(Math.max(0, Math.min(1, c)) * 255);
  return `rgb(${v},${v},${v})`;
};

// Log axis: the interesting thresholds (3.0, 4.5, 7.0) all live in the bottom
// third of a 1–21 linear scale and would be unreadable stacked on top of each
// other. A ratio axis is multiplicative anyway, so log is the honest one.
const toPos = (r) => Math.log(r) / Math.log(RATIO_MAX);
const fromPos = (p) => Math.round(Math.pow(RATIO_MAX, p) * 10) / 10;
const pct = (r) => toPos(r) * 100;

const RUNG_COLOR = { AAA: "var(--good)", AA: "var(--warn)", Fail: "var(--danger)" };

// Bands for one column, low→high: Fail, then each rung up to the ceiling.
const bandsFor = (isLarge) => {
  const col = THRESHOLDS.map(([rating, n, l]) => [rating, isLarge ? l : n]);
  const lowest = col[col.length - 1][1];
  const out = [["Fail", RATIO_MIN, lowest]];
  for (let i = col.length - 1; i >= 0; i--) out.push([col[i][0], col[i][1], i === 0 ? RATIO_MAX : col[i - 1][1]]);
  return out;
};

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cr1-wrap { margin-top:12px; max-width:760px; }
    .cr1-row { display:grid; grid-template-columns:104px 1fr; align-items:center; gap:10px; margin:6px 0; }
    .cr1-lbl { font:700 12.5px var(--mono); color:var(--muted); text-align:right; cursor:pointer; }
    .cr1-lbl.on { color:var(--text); }
    .cr1-track { position:relative; height:34px; border-radius:9px; overflow:hidden;
      border:1px solid var(--border); background:var(--panel-2); opacity:.48; cursor:pointer;
      transition:opacity .2s, box-shadow .2s; }
    .cr1-track.on { opacity:1; box-shadow:0 0 0 1px var(--accent); }
    .cr1-band { position:absolute; top:0; bottom:0; display:flex; align-items:center; justify-content:center;
      font:700 10.5px var(--sans); color:#0a0e14; text-transform:uppercase; letter-spacing:.06em; overflow:hidden; }
    .cr1-play { position:absolute; top:-4px; bottom:-4px; width:2px; background:var(--text); z-index:3; pointer-events:none; }
    .cr1-play::before { content:""; position:absolute; top:-5px; left:-4px; border:5px solid transparent; border-top-color:var(--text); }
    .cr1-ticks { position:relative; height:16px; font:10px var(--mono); color:var(--muted); }
    .cr1-tick { position:absolute; transform:translateX(-50%); white-space:nowrap; }
    .cr1-ctl { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:16px 0 6px; }
    .cr1-slider { flex:1; min-width:220px; accent-color:var(--accent); }
    .cr1-num { width:78px; }
    .cr1-big { font:800 26px var(--mono); color:var(--accent); font-variant-numeric:tabular-nums; }
    .cr1-colhead { font:700 10.5px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin-bottom:2px; }
    .cr1-colhead.on { color:var(--accent); }
    .cr1-swatch { margin-top:18px; background:#000; border:1px solid var(--border); border-radius:10px; padding:16px 18px; }
    .cr1-sample { display:flex; align-items:baseline; justify-content:space-between; gap:14px; padding:8px 10px; border-radius:8px; border:1px solid transparent; }
    .cr1-sample.sel { border-color:var(--accent); }
    .cr1-txt { font:400 15px var(--sans); }
    .cr1-sample.cr1-lg .cr1-txt { font:700 25px var(--sans); }
    .cr1-rt { font:700 11px var(--mono); letter-spacing:.06em; white-space:nowrap; }
  `));
}

// Demo presets. Ratios 2.7 / 3.0 / 4.2 / 4.5 / 4.8 / 7.5 with their booleans are
// freeCodeCamp's six official cases; 7.0 · normal is ours — the exact inclusive
// bar for AAA on normal text, the one number the official set never lands on.
// (Everything between them is reachable by dragging the slider, and the toggle
// covers the second axis, so no official input is more than one gesture away.)
const PRESETS = [
  { ratio: 2.7, large: false },
  { ratio: 3.0, large: true },
  { ratio: 4.2, large: false },
  { ratio: 4.5, large: true },
  { ratio: 4.8, large: false },
  { ratio: 7.0, large: false },
  { ratio: 7.5, large: false },
];

function mount(host) {
  ensureStyle();
  let ratio = 4.5, isLargeText = false;

  // preset chips
  const chips = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `${p.ratio.toFixed(1)} · ${p.large ? "large" : "normal"}`);
    c.onclick = () => { ratio = p.ratio; isLargeText = p.large; render(); };
    chips.append(c);
  });

  // ratio slider (log-positioned so the handle tracks the playhead) + exact entry
  const ctl = el("div", "cr1-ctl");
  const big = el("div", "cr1-big");
  const slider = el("input", "cr1-slider");
  slider.type = "range"; slider.min = 0; slider.max = 1000; slider.step = 1;
  const num = el("input", "cr1-num"); num.type = "number"; num.step = "0.1";
  num.min = RATIO_MIN; num.max = RATIO_MAX;
  // `dragging` stops render() writing the slider's own position back while the
  // user holds it — the 0.1 rounding would otherwise tug the handle backwards
  // near ratio 1, where a tenth spans dozens of slider units on a log axis.
  let dragging = false;
  const setRatio = (v) => {
    ratio = Math.max(RATIO_MIN, Math.min(RATIO_MAX, Math.round((+v || RATIO_MIN) * 10) / 10));
    render();
  };
  slider.oninput = () => { dragging = true; setRatio(fromPos(+slider.value / 1000)); dragging = false; };
  num.oninput = () => setRatio(num.value);
  ctl.append(el("span", "ctl-label", "contrast ratio ="), big, slider, num);

  // the isLargeText axis
  const sizeCtl = el("div", "controls");
  const sizeChips = [false, true].map((v) => {
    const c = el("button", "chip", v ? "large text" : "normal text");
    c.onclick = () => { isLargeText = v; render(); };
    sizeCtl.append(c);
    return c;
  });

  const result = el("div", "result-line");

  // the two columns as banded tracks on one shared axis — the large row's
  // boundaries visibly sit to the LEFT of the normal row's.
  const gauge = el("div");
  const cols = [false, true].map((large) => {
    const row = el("div", "cr1-row");
    const lbl = el("div", "cr1-lbl", large ? "large text" : "normal text");
    const track = el("div", "cr1-track");
    bandsFor(large).forEach(([rating, lo, hi]) => {
      const b = el("div", "cr1-band", rating);
      b.style.left = pct(lo) + "%";
      b.style.width = (pct(hi) - pct(lo)) + "%";
      b.style.background = `color-mix(in srgb, ${RUNG_COLOR[rating]} 78%, #fff 6%)`;
      track.append(b);
    });
    const play = el("div", "cr1-play");
    track.append(play);
    lbl.onclick = track.onclick = () => { isLargeText = large; render(); };
    row.append(lbl, track);
    gauge.append(row);
    return { large, lbl, track, play };
  });
  const tickRow = el("div", "cr1-row");
  const ticks = el("div", "cr1-ticks");
  [1, 2, 3, 4.5, 7, 12, 21].forEach((t) => {
    const tk = el("div", "cr1-tick", t.toFixed(1).replace(/\.0$/, ""));
    tk.style.left = pct(t) + "%";
    ticks.append(tk);
  });
  tickRow.append(el("div", "cr1-lbl", "ratio →"), ticks);
  gauge.append(tickRow);

  // the literal 2×3 grid, one ladder per column, both lit at once
  const grid = el("div", "grid2");
  const ladders = [false, true].map((large) => {
    const cell = el("div");
    const head = el("div", "cr1-colhead", large ? "Large text · ≥24px, or ≥19px bold" : "Normal text");
    const lad = el("div", "ladder");
    cell.append(head, lad);
    grid.append(cell);
    return { large, head, lad };
  });

  // the rating, felt: one grey on black, set at both sizes at once
  const swatch = el("div", "cr1-swatch");
  const samples = [false, true].map((large) => {
    const s = el("div", "cr1-sample" + (large ? " cr1-lg" : ""));
    const txt = el("span", "cr1-txt", large ? "Large text passes lower." : "Normal text needs more contrast than large text.");
    const rt = el("span", "cr1-rt");
    s.append(txt, rt);
    s.onclick = () => { isLargeText = large; render(); };
    swatch.append(s);
    return { large, s, txt, rt };
  });

  const wrap = el("div", "cr1-wrap");
  wrap.append(chips, ctl, sizeCtl, result, gauge, grid, swatch);
  host.append(wrap, el("div", "note",
    "Drag the ratio and watch <b>both</b> columns at once. Everywhere the two disagree — 3.0–4.5 and 4.5–7.0 — the same colours earn a better rating purely because the text got bigger. That is the whole 2×3 grid: not six rules, but two rungs read against two different bars."));
  render();

  function render() {
    const rating = getContrastRating(ratio, isLargeText);
    const other = getContrastRating(ratio, !isLargeText);
    const grey = greyFor(ratio);

    big.textContent = ratio.toFixed(1);
    if (!dragging) slider.value = Math.round(toPos(ratio) * 1000);
    if (+num.value !== ratio) num.value = ratio;   // plain, so typing "4." isn't rewritten mid-keystroke
    sizeChips.forEach((c, i) => c.classList.toggle("on", (i === 1) === isLargeText));

    result.innerHTML =
      `<span class="mono muted">getContrastRating(<b style="color:var(--text)">${ratio.toFixed(1)}</b>, <b style="color:var(--text)">${isLargeText}</b>) →</span>` +
      `<span class="badge ${rating === "Fail" ? "no" : "ok"}">${rating}</span>` +
      (other === rating
        ? `<span class="tag muted">${isLargeText ? "normal" : "large"} text: also ${other}</span>`
        : `<span class="tag" style="color:${RUNG_COLOR[other]};border-color:${RUNG_COLOR[other]}">${isLargeText ? "normal" : "large"} text: ${other}</span>`);

    cols.forEach((c) => {
      c.track.classList.toggle("on", c.large === isLargeText);
      c.lbl.classList.toggle("on", c.large === isLargeText);
      c.play.style.left = pct(ratio) + "%";
    });

    ladders.forEach((L) => {
      const hit = getContrastRating(ratio, L.large);
      L.head.classList.toggle("on", L.large === isLargeText);
      L.lad.innerHTML = "";
      const col = THRESHOLDS.map(([rt, n, l]) => [rt, L.large ? l : n]);
      col.forEach(([rt, min]) => L.lad.append(el("div", "rung" + (hit === rt ? " on" : ""),
        `<span>${rt}</span><span class="v">ratio ≥ ${min.toFixed(1)}</span>`)));
      const lowest = col[col.length - 1][1];
      L.lad.append(el("div", "rung" + (hit === "Fail" ? " on" : ""),
        `<span>Fail</span><span class="v">ratio &lt; ${lowest.toFixed(1)}</span>`));
    });

    samples.forEach((s) => {
      const r = getContrastRating(ratio, s.large);
      s.txt.style.color = grey;
      s.rt.textContent = r;
      s.rt.style.color = RUNG_COLOR[r];
      s.s.classList.toggle("sel", s.large === isLargeText);
    });
  }
}

// ── STEP — the table read line by line ───────────────────────────────────────
// Cases 1–6 are freeCodeCamp's six official tests, in the grader's own order,
// with the ratio kept as a STRING because that is how the grader passes it.
// Cases 7–9 are ours, and all three are EXACT threshold values, because
// inclusive-vs-exclusive is the only way to get this problem wrong: 7.0 and 4.5
// are normal text's two "+" bars, and 3.0 is the large-text AA bar tried in the
// normal column, where it misses. 8 and 9 also replay the numbers from official
// cases 4 and 5 in the other column, so the same ratio visibly earns a
// different rating.
// Cases 3 and 6 share the "Fail" rung but not the lesson: 4.2 fails only
// because the text is normal (as large text it would be AA), while 2.7 clears
// nothing in either column.
const CASES = [
  { ratio: "7.5", large: false, why: "comfortably past the top rung" },
  { ratio: "4.8", large: false, why: "clears AA, misses AAA" },
  { ratio: "4.2", large: false, why: "misses AA by 0.3 — yet would pass as large text" },
  { ratio: "4.5", large: true, why: "exactly the large-text AAA bar" },
  { ratio: "3.0", large: true, why: "exactly the large-text AA bar" },
  { ratio: "2.7", large: false, why: "clears nothing in either column" },
  { ratio: "7.0", large: false, why: "ours — exactly the normal-text AAA bar" },
  { ratio: "4.5", large: false, why: "ours — the same 4.5 as case 4, other column" },
  { ratio: "3.0", large: false, why: "ours — the same 3.0 as case 5, and here it misses" },
];

const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">THRESHOLDS</span> = [` },
  { ln: 2, html: `  [<span class="st">"AAA"</span>, <span class="tok" data-t="row0">7.0, 4.5</span>],` },
  { ln: 3, html: `  [<span class="st">"AA"</span>,  <span class="tok" data-t="row1">4.5, 3.0</span>],` },
  { ln: 4, html: `<span class="tok" data-t="seal">]</span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">getContrastRating</span>(<span class="tok" data-t="params">ratio, isLargeText</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> r = <span class="tok" data-t="num"><span class="fn">Number</span>(ratio)</span>;` },
  { ln: 7, html: `  <span class="k">for</span> (<span class="k">const</span> [<span class="tok" data-t="iter">rating, normalMin, largeMin</span>] <span class="k">of</span> THRESHOLDS) {` },
  { ln: 8, html: `    <span class="k">const</span> min = <span class="tok" data-t="pick">isLargeText ? largeMin : normalMin</span>;` },
  { ln: 9, html: `    <span class="k">if</span> (<span class="tok" data-t="test">r &gt;= min</span>) <span class="k">return</span> <span class="tok" data-t="ret">rating</span>;` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="fail"><span class="st">"Fail"</span></span>;` },
  { ln: 12, html: `}` },
];

// Instrumented run → generic debugger steps. One frame (no recursion). THRESHOLDS
// is a module constant, so it appears as line 1 runs and stays for the whole
// trace — it is still in scope inside the call. `ratio`/`isLargeText` are
// parameters and only exist from line 5, `r` from line 6, and the destructured
// row plus `min` live only inside the loop body, so they vanish again when the
// loop is exhausted and control reaches line 11.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx];
  const isLargeText = c.large;
  const colName = isLargeText ? "large" : "normal";
  const rows = THRESHOLDS.map(([rating, n, l]) => `${rating} ${n.toFixed(1)}|${l.toFixed(1)}`);
  const steps = [];
  let filled = 0, r, rating, normalMin, largeMin, min;
  let rBound = false, inLoop = false, minBound = false;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 5) { vars.ratio = `"${c.ratio}"`; vars.isLargeText = isLargeText; }
    if (line >= 6 && rBound) vars.r = r;
    // the table's own numbers, shown to one decimal as the table writes them;
    // `r` stays raw, so Number("7.0") → 7 is visible rather than cosmetically hidden
    if (inLoop) { vars.rating = `"${rating}"`; vars.normalMin = normalMin.toFixed(1); vars.largeMin = largeMin.toFixed(1); }
    if (inLoop && minBound) vars.min = min.toFixed(1);
    const structs = [{ label: "THRESHOLDS", items: rows.slice(0, filled), newest: !!x.tableNew }];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{
        title: line >= 5 ? `getContrastRating("${c.ratio}", ${isLargeText})` : "module scope",
        vars, changed: x.changed || [], structs, ret: x.ret,
      }],
    });
  };

  S(1, `The table is built <b>once</b>, before any call. Its row <i>order</i> is not cosmetic: the function returns the <b>first</b> row it clears, so listing the strictest rung first is what makes a ratio that clears both rungs come back as <b>AAA</b> rather than <b>AA</b>.`,
    { focus: "decl" });

  filled = 1;
  S(2, `Row one is the <b>AAA</b> rung: <b>7.0</b> for normal text, <b>4.5</b> for large. One rung, two numbers — the standard doesn't change with the text size, only the <b>bar</b> does, and the large-text bar is the lower of the two.`,
    { focus: "row0", tableNew: true });

  filled = 2;
  S(3, `Row two is <b>AA</b>: <b>4.5</b> normal, <b>3.0</b> large. Look at what just happened — <b>4.5</b> now appears twice in the grid, as AA's normal bar and as AAA's large bar. That collision is why "4.5 passes" is a meaningless sentence until you say which column you're reading.`,
    { focus: "row1", tableNew: true });

  S(4, `Two rows, and no third one for <b>Fail</b>. The statement's "below 4.5" and "below 3.0" are the <i>exact</i> complements of the AA row, so a Fail row would restate the same two numbers with the comparison flipped — two more places to typo, and no new information.`,
    { focus: "seal" });

  S(5, `Call <b>getContrastRating("${c.ratio}", ${isLargeText})</b> — ${c.why}. The second parameter decides which <b>column</b> of the table to read. It is not asking which code to run, and that distinction is what keeps this function two comparisons instead of four.`,
    { focus: "params", changed: ["ratio", "isLargeText"] });

  r = Number(c.ratio); rBound = true;
  S(6, `The grader hands the ratio over as the <b>string</b> <code class='inl'>"${c.ratio}"</code>. <code class='inl'>r &gt;= min</code> would have coerced it anyway — but only because the other side is a number. Compare two strings and <code class='inl'>"4.2" &gt;= "10"</code> is <b>true</b>, since text compares character by character. Converting once, up front, means the comparison below can't quietly change meaning.`,
    { focus: "num", changed: ["r"] });

  for (let i = 0; i < THRESHOLDS.length; i++) {
    [rating, normalMin, largeMin] = THRESHOLDS[i];
    inLoop = true; minBound = false;
    S(7, `Take the <b>${rating}</b> rung — <b>${normalMin.toFixed(1)}</b> normal, <b>${largeMin.toFixed(1)}</b> large. The walk goes top-down, so this is the best rating still on the table; everything below it is a consolation prize.`,
      { focus: "iter", changed: ["rating", "normalMin", "largeMin"] });

    min = isLargeText ? largeMin : normalMin;
    minBound = true;
    S(8, isLargeText
      ? `<b>isLargeText</b> is true, so the large column wins: <b>min = ${min.toFixed(1)}</b>, a full <b>${(normalMin - largeMin).toFixed(1)}</b> below the ${normalMin.toFixed(1)} a normal-size reader would need. Bigger glyphs put more pixels of the same colour on screen, so the eye recovers the letterform at a contrast where small text would smear — the lower bar is a measurement, not a discount.`
      : `<b>isLargeText</b> is false, so the normal column wins: <b>min = ${min.toFixed(1)}</b>. The large column's <b>${largeMin.toFixed(1)}</b> is sitting right there unused — same rung, same page, a bar this text simply isn't allowed to use.`,
      { focus: "pick", changed: ["min"] });

    const pass = r >= min;
    S(9, pass
      ? (r === min
        ? `Dead on the bar. The statement writes this threshold as <b>"${min.toFixed(1)}+"</b>, and that <b>+</b> is doing real work: with <code class='inl'>&gt;</code> instead of <code class='inl'>&gt;=</code> this exact input would drop a whole rung. Boundary values are the only inputs that can tell the two operators apart, which is why they are the ones worth testing.`
        : `<b>${r}</b> clears <b>${min.toFixed(1)}</b> with ${(r - min).toFixed(1)} to spare. Because the rows run strictest-first, there is nothing better left to check — the search can stop the moment it succeeds.`)
      : `<b>${r}</b> falls short of <b>${min.toFixed(1)}</b> by ${(min - r).toFixed(1)}, so this rung isn't earned. Drop to the next row: a weaker rating, but a lower bar to clear.`,
      { focus: "test", eval: { expr: `${r} >= ${min.toFixed(1)}`, val: pass } });

    if (pass) {
      S(9, `<b>Return "${rating}"</b> straight out of the loop. No further rows are examined, and no <code class='inl'>else</code> was ever needed — an early return from an ordered table <i>is</i> the priority logic.`,
        { focus: "ret", ret: { value: `"${rating}"` }, done: true, result: `"${rating}"` });
      return steps;
    }
  }

  const lowest = THRESHOLDS[THRESHOLDS.length - 1][isLargeText ? 2 : 1];
  inLoop = false; // the destructured row and `min` leave scope with the loop
  S(7, `Both rungs were tried and neither was cleared. There is no third row, so the loop ends and <b>rating</b>, <b>normalMin</b>, <b>largeMin</b> and <b>min</b> all go out of scope.`,
    { focus: "iter" });

  S(11, `Falling out of the loop <i>is</i> the Fail case. For <b>${colName}</b> text the lowest bar on the table was <b>${lowest.toFixed(1)}</b> and <b>${r}</b> is under it — which is exactly what the statement's "below ${lowest.toFixed(1)}" row means. Nothing is compared here, because "cleared nothing" was already established by the loop finishing.`,
    { focus: "fail", ret: { value: `"Fail"` }, done: true, result: `"Fail"` });

  return steps;
}

export default {
  n: 352, id: "contrast", title: "Contrast Rating 1", dates: ["2026-07-28"],
  statement: `Given a <b>contrast ratio</b> and a boolean saying whether the text is large, return the WCAG rating from this table: <code class="inl">"AAA"</code> at <b>7.0+</b> normal / <b>4.5+</b> large; <code class="inl">"AA"</code> at <b>4.5+</b> normal / <b>3.0+</b> large; otherwise <code class="inl">"Fail"</code>. <span class="rule">The <b>+</b> is inclusive. Example: <code class="inl">getContrastRating(4.5, false)</code> → <b>"AA"</b>, but <code class="inl">getContrastRating(4.5, true)</code> → <b>"AAA"</b> — same colours, bigger text, better rating. Day 1 of a three-day series: <b>#353</b> computes the ratio from two relative luminances and <b>#354</b> from two RGB triples, and both then land back on this same table.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 2 rungs",
      approach: `The problem <b>prints you a 2×3 grid</b>, so store the grid. Two rows — <code class="inl">["AAA", 7.0, 4.5]</code> and <code class="inl">["AA", 4.5, 3.0]</code> — hold every number in the table, and the answer is the <b>first row whose minimum the ratio meets</b>. Two details carry the whole problem. First, <code class="inl">isLargeText</code> selects a <b>column</b>, not a branch: written as an if/else it doubles the comparisons and lets the two halves drift apart. Second, the boundaries are asymmetric in wording only — <b>"7.0+"</b> is inclusive, so it's <code class="inl">&gt;=</code>, and <b>"below 4.5"</b> is the exact complement of the AA row, so <code class="inl">"Fail"</code> needs no threshold and no test. Drag the ratio and watch both columns at once: between <b>3.0</b> and <b>7.0</b> the two disagree, and every disagreement is the large-text bar sitting lower.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the table. It starts <b>before</b> the call, watching the two rows land, because the ordering decided there is what makes the loop's early return correct. Then one call: the string ratio is converted, a rung is taken, <code class="inl">isLargeText</code> picks <b>one of its two numbers</b>, and <code class="inl">&gt;=</code> decides. Cases <b>4, 5, 7, 8, 9</b> land <i>exactly</i> on a bar — where <code class="inl">&gt;=</code> and <code class="inl">&gt;</code> would disagree — and cases 8 and 9 replay the ratios from cases 4 and 5 in the other column to show the same number rating differently. Watch <b>min</b> appear only once its line has run, and the loop's variables vanish when it's exhausted. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–6 official, 7–9 exact boundaries` },
      }),
    },
  ],
};
