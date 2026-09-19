// #364 · Between Two Buckets — fullness, not colour, decides where on the line the mix lands.
//
// The arithmetic is one weighted average per channel. What is worth pixels is
// WEIGHTING: the answer always lies on the straight line between the two colours,
// and it only lands on the midpoint when the two buckets are equally full. Drag a
// fullness slider and the marker slides along that line without either colour
// changing — 90 against 10 puts the mix nine tenths of the way to the fuller
// bucket. Two smaller things the demo keeps visible: the rounding is per CHANNEL
// and happens AFTER the divide (one call can round R down and G up), and the two
// degenerate inputs — one bucket empty (the answer is just the other colour) and
// both empty (0/0, which freeCodeCamp never tests; see CASES).
//
// Single approach: the spec is the formula, so there is no second mental model to
// put beside it — one Solution + one Step through, as with #331 and #353. A loop
// over the three channels versus three copy-pasted lines is a spelling, not an
// approach.
import { el, mountDebugger } from "../shared.js";

const CH = ["R", "G", "B"];
const CH_COLOR = ["#f85149", "#3fb950", "#58a6ff"];   // channel labels, not kit properties
const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

// The whole solution, plus the intermediate values the demo wants to show. Every
// number the page prints comes from here, so the table and the shipped `code`
// cannot disagree about what was computed.
function mix(b1, b2) {
  const total = b1.fullness + b2.fullness;
  const rows = CH.map((name, i) => {
    const p1 = b1.color[i] * b1.fullness;
    const p2 = b2.color[i] * b2.fullness;
    const exact = (p1 + p2) / total;
    return { name, i, p1, p2, sum: p1 + p2, exact, out: Math.round(exact) };
  });
  return { total, rows, out: rows.map((r) => r.out) };
}

// ── Cases ────────────────────────────────────────────────────────────────────
// 1–5 are freeCodeCamp's five official tests, verbatim and in the order the grader
// lists them: equal fullness (the true midpoint), 80/20 (four fifths of the way
// to white — the case that proves it is not a midpoint), the same colour twice
// (where the weighting cannot matter), and two lopsided pairs whose channels
// round in different directions within one call.
// 6–8 are ours, each on a branch the official set never reaches:
//   6 — two channels land on an exact .5, so the tie-breaking direction is visible;
//   7 — one bucket empty, where the weighted average collapses to the other colour;
//   8 — BOTH empty. total is 0, so the divide is 0/0 and every channel comes back
//       NaN. freeCodeCamp does not test it and the reference solution does not
//       guard it; it is here because it is the one input the formula has no answer
//       for, and pretending otherwise would be inventing a spec.
// 7 and 8 are the same two colours and differ only in bucket2's fullness, so the
// step from "just the other colour" to "no colour at all" is one number.
const CASES = [
  { b1: { color: [250, 250, 250], fullness: 50 }, b2: { color: [0, 0, 0], fullness: 50 },
    label: "50 / 50 · white ↔ black", why: "equal fullness — the only time the mix is the midpoint" },
  { b1: { color: [250, 250, 250], fullness: 80 }, b2: { color: [0, 0, 0], fullness: 20 },
    label: "80 / 20 · white ↔ black", why: "same two colours, lopsided fullness — four fifths of the way to white" },
  { b1: { color: [100, 150, 200], fullness: 30 }, b2: { color: [100, 150, 200], fullness: 70 },
    label: "30 / 70 · same colour", why: "identical colours, so no weighting can move the answer" },
  { b1: { color: [143, 143, 101], fullness: 45 }, b2: { color: [100, 204, 204], fullness: 90 },
    label: "45 / 90 · khaki ↔ cyan", why: "exactly 1:2, and R rounds down while G and B round up" },
  { b1: { color: [15, 134, 249], fullness: 29 }, b2: { color: [97, 178, 55], fullness: 54 },
    label: "29 / 54 · blue ↔ green", why: "an ugly total of 83 — no channel divides evenly" },
  { b1: { color: [255, 0, 40], fullness: 50 }, b2: { color: [0, 255, 60], fullness: 50 },
    label: "50 / 50 · exact .5 tie", why: "R and G both land on 127.5 — watch which way the tie goes" },
  { b1: { color: [200, 120, 40], fullness: 0 }, b2: { color: [30, 60, 90], fullness: 100 },
    label: "0 / 100 · one empty", why: "an empty bucket has no vote — the answer is the other colour exactly" },
  { b1: { color: [200, 120, 40], fullness: 0 }, b2: { color: [30, 60, 90], fullness: 0 },
    label: "0 / 0 · both empty", why: "no paint at all — 0/0, the input the grader never asks about" },
];

const clone = (b) => ({ color: [...b.color], fullness: b.fullness });
const same = (a, b) => a.fullness === b.fullness && a.color.every((v, i) => v === b.color[i]);
// 3 decimals is plenty: with fullness capped at 100 the quotient's denominator is
// at most 200, so a value can never be within 0.0005 of a .5 without being one.
const fx = (x) => (Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : String(x));
const isTie = (x) => Number.isFinite(x) && Math.abs(x - Math.floor(x) - 0.5) < 1e-9;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mx-wrap { display:flex; flex-direction:column; gap:14px; max-width:800px; }
    .mx-stage { display:grid; grid-template-columns:1fr 150px 1fr; gap:14px; align-items:start; }
    @media (max-width:680px){ .mx-stage { grid-template-columns:1fr; } }

    .mx-panel { border:1px solid var(--border); border-radius:12px; background:var(--panel);
                padding:11px 12px 13px; display:flex; flex-direction:column; gap:7px; }
    .mx-head { display:flex; align-items:baseline; justify-content:space-between; gap:8px;
               font:700 12px var(--mono); color:var(--accent); }
    .mx-head .hex { color:var(--muted); font-weight:600; }

    .mx-can { position:relative; height:104px; border:2px solid var(--border); border-top-width:4px;
              border-radius:4px 4px 16px 16px; overflow:hidden;
              background:repeating-linear-gradient(45deg, transparent 0 7px,
                         color-mix(in srgb, var(--border) 55%, transparent) 7px 8px); }
    .mx-fill { position:absolute; left:0; right:0; bottom:0; transition:height .16s ease, background .16s ease; }
    /* the label sits ON the paint, and one official case is white — so give it its
       own backing rather than betting on the colour underneath */
    .mx-lvl { position:absolute; left:0; right:0; bottom:6px; text-align:center;
              font:800 13px var(--mono); color:var(--text); }
    .mx-lvl span { background:color-mix(in srgb, var(--bg) 74%, transparent);
                   border-radius:6px; padding:1px 7px; }

    .mx-srow { display:grid; grid-template-columns:30px 1fr 38px; align-items:center; gap:8px; }
    .mx-slab { font:700 11px var(--mono); }
    .mx-slab.f { color:var(--muted); }
    .mx-sl { width:100%; accent-color:var(--accent); }
    .mx-sval { font:800 12.5px var(--mono); font-variant-numeric:tabular-nums; color:var(--text); text-align:right; }

    .mx-mixcol { display:flex; flex-direction:column; gap:7px; align-items:stretch; }
    .mx-swatch { height:104px; border-radius:12px; border:1px solid var(--border); }
    .mx-swatch.dead { background:repeating-linear-gradient(45deg, transparent 0 7px,
                      color-mix(in srgb, var(--danger) 45%, transparent) 7px 8px);
                      border-color:var(--danger); }
    .mx-outtxt { font:800 14px var(--mono); color:var(--text); text-align:center; }
    .mx-outtxt.dead { color:var(--danger); }

    .mx-line { position:relative; height:34px; border-radius:9px; border:1px solid var(--border); }
    .mx-grad { position:absolute; inset:0; border-radius:8px; }
    .mx-mid { position:absolute; top:-5px; bottom:-5px; left:50%; width:0;
              border-left:1px dashed var(--muted); }
    .mx-pin { position:absolute; top:-7px; bottom:-7px; width:3px; background:var(--text);
              border-radius:2px; box-shadow:0 0 0 2px var(--bg); transition:left .16s ease; }
    .mx-ticks { position:relative; height:30px; font:10.5px var(--mono); color:var(--muted); }
    .mx-tick { position:absolute; transform:translateX(-50%); text-align:center; white-space:nowrap; }
    .mx-tick.l { transform:none; left:0; } .mx-tick.r { transform:none; right:0; text-align:right; }
    .mx-tick b { color:var(--text); }

    .mx-tbl table.cmp { width:100%; }
    .mx-tbl td.x { text-align:right; }
    .mx-up { color:var(--good); font-weight:800; }
    .mx-dn { color:var(--warn); font-weight:800; }
    .mx-ex { color:var(--muted); }
    .mx-tie td { background:color-mix(in srgb, var(--accent) 13%, transparent); }
    .mx-nan td { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  // Live, mutable state — the sliders are free to leave every preset behind.
  let b1 = clone(CASES[1].b1), b2 = clone(CASES[1].b2);

  const chips = el("div", "controls");
  chips.append(el("span", "ctl-label", "cases"));
  const chipEls = CASES.map((c) => {
    const b = el("button", "chip", c.label);
    b.title = c.why;
    b.onclick = () => { b1 = clone(c.b1); b2 = clone(c.b2); sync(); };
    chips.append(b);
    return b;
  });

  // The payoff in one click each: hold the colours still and move only the weights.
  const jump = el("div", "controls");
  const mkJump = (text, fn) => { const b = el("button", "chip", text); b.onclick = () => { fn(); sync(); }; jump.append(b); };
  mkJump("equalise fullness → midpoint", () => { b1.fullness = 50; b2.fullness = 50; });
  mkJump("swap the two fullness levels", () => { const t = b1.fullness; b1.fullness = b2.fullness; b2.fullness = t; });
  mkJump("empty bucket 1", () => { b1.fullness = 0; });

  const wrap = el("div", "mx-wrap");
  const stage = el("div", "mx-stage");

  function mkBucket(which) {
    const get = () => (which === 0 ? b1 : b2);
    const box = el("div", "mx-panel");
    const head = el("div", "mx-head", `<span>bucket${which + 1}</span><span class="hex"></span>`);
    const can = el("div", "mx-can");
    const fill = el("div", "mx-fill"), lvl = el("div", "mx-lvl");
    can.append(fill, lvl);

    const frow = el("div", "mx-srow");
    const fsl = el("input", "mx-sl"); fsl.type = "range"; fsl.min = "0"; fsl.max = "100"; fsl.step = "1";
    const fval = el("div", "mx-sval");
    fsl.oninput = () => { get().fullness = +fsl.value; sync(); };
    frow.append(el("div", "mx-slab f", "full"), fsl, fval);

    const chan = CH.map((name, i) => {
      const row = el("div", "mx-srow");
      const sl = el("input", "mx-sl"); sl.type = "range"; sl.min = "0"; sl.max = "255"; sl.step = "1";
      const val = el("div", "mx-sval");
      const lab = el("div", "mx-slab", name); lab.style.color = CH_COLOR[i];
      sl.oninput = () => { get().color[i] = +sl.value; sync(); };
      row.append(lab, sl, val);
      return { row, sl, val };
    });
    box.append(head, can, frow, ...chan.map((c) => c.row));
    stage.append(box);
    return { head, fill, lvl, fsl, fval, chan };
  }

  const B1 = mkBucket(0);

  const mixCol = el("div", "mx-mixcol");
  const outSw = el("div", "mx-swatch");
  const outTxt = el("div", "mx-outtxt");
  mixCol.append(el("div", "mx-head", `<span>mixPaint</span>`), outSw, outTxt);
  stage.append(mixCol);

  const B2 = mkBucket(1);

  const line = el("div", "mx-line");
  const grad = el("div", "mx-grad"), mid = el("div", "mx-mid"), pin = el("div", "mx-pin");
  line.append(grad, mid, pin);
  const ticks = el("div", "mx-ticks");
  const tbl = el("div", "mx-tbl");
  const res = el("div", "result-line");
  const note = el("div", "note");

  wrap.append(stage, line, ticks, tbl, res, note);
  host.append(chips, jump, wrap);
  sync();

  function sync() {
    const { total, rows, out } = mix(b1, b2);
    const dead = total === 0;

    [[B1, b1], [B2, b2]].forEach(([ui, b]) => {
      ui.head.querySelector(".hex").textContent = `[${b.color.join(", ")}] · ${b.fullness}%`;
      ui.fill.style.height = `${b.fullness}%`;
      ui.fill.style.background = css(b.color);
      ui.lvl.innerHTML = `<span>${b.fullness === 0 ? "empty" : b.fullness + "% full"}</span>`;
      ui.fsl.value = b.fullness;
      ui.fval.textContent = b.fullness;
      ui.chan.forEach((c, i) => { c.sl.value = b.color[i]; c.val.textContent = b.color[i]; });
    });
    chipEls.forEach((b, i) => b.classList.toggle("on", same(CASES[i].b1, b1) && same(CASES[i].b2, b2)));

    outSw.className = "mx-swatch" + (dead ? " dead" : "");
    outSw.style.background = dead ? "" : css(out);
    outTxt.className = "mx-outtxt" + (dead ? " dead" : "");
    outTxt.textContent = `[${out.join(", ")}]`;

    // The line between the two colours. A CSS gradient interpolates each channel
    // linearly, which is exactly the arithmetic below — so the marker sits on the
    // very colour the swatch shows, rather than merely near it.
    grad.style.background = `linear-gradient(90deg, ${css(b1.color)}, ${css(b2.color)})`;
    const w2 = dead ? 0 : b2.fullness / total;
    pin.style.display = dead ? "none" : "";
    pin.style.left = `calc(${(w2 * 100).toFixed(2)}% - 1.5px)`;
    // Row one names the two weights; row two carries the midpoint and the marker,
    // collapsed into one label when the marker IS the midpoint.
    const atMid = Math.abs(w2 - 0.5) < 0.06;
    ticks.innerHTML = dead
      ? `<div class="mx-tick l">bucket1</div><div class="mx-tick r">bucket2</div>` +
        `<div class="mx-tick" style="left:50%;top:16px">no paint in either bucket — <b>nowhere</b> on this line is an answer</div>`
      : `<div class="mx-tick l">bucket1 · weight <b>${fx(1 - w2)}</b></div>` +
        `<div class="mx-tick r">bucket2 · weight <b>${fx(w2)}</b></div>` +
        (atMid
          ? `<div class="mx-tick" style="left:${(w2 * 100).toFixed(2)}%;top:16px"><b>${(w2 * 100).toFixed(1)}%</b> of the way${w2 === 0.5 ? " — the midpoint" : ", beside the midpoint"}</div>`
          : `<div class="mx-tick" style="left:50%;top:16px">midpoint</div>` +
            `<div class="mx-tick" style="left:${(w2 * 100).toFixed(2)}%;top:16px"><b>${(w2 * 100).toFixed(1)}%</b> of the way</div>`);

    // Three rows, one per channel — the divide and the rounding are separate columns
    // on purpose, because that is where the per-channel rounding becomes visible.
    tbl.innerHTML =
      `<table class="cmp"><tr><th>ch</th><th>c₁×f₁ + c₂×f₂</th><th>÷ total</th><th>exact</th><th>rounded</th></tr>` +
      rows.map((r) => {
        const tie = isTie(r.exact);
        const dir = dead ? `<span class="mx-dn">nothing to round</span>`
          : r.exact === r.out ? `<span class="mx-ex">exact</span>`
          : r.out > r.exact ? `<span class="mx-up">↑ up</span>` : `<span class="mx-dn">↓ down</span>`;
        return `<tr class="${dead ? "mx-nan" : tie ? "mx-tie" : ""}">` +
          `<td style="color:${CH_COLOR[r.i]};font-weight:800">${r.name}</td>` +
          `<td class="x">${r.p1} + ${r.p2} = ${r.sum}</td>` +
          `<td class="x">${r.sum} ÷ ${total}</td>` +
          `<td class="x">${fx(r.exact)}</td>` +
          `<td class="x"><b>${r.out}</b> ${dir}</td></tr>`;
      }).join("") + `</table>`;

    res.innerHTML =
      `<span class="badge ${dead ? "no" : "ok"}">[${out.join(", ")}]</span>` +
      `<span class="tag">total = ${b1.fullness} + ${b2.fullness} = ${total}</span>` +
      (dead ? `<span class="tag">0 ÷ 0</span>` : `<span class="tag">weights ${fx(1 - w2)} / ${fx(w2)}</span>`);

    const ties = rows.filter((r) => isTie(r.exact)).map((r) => r.name);
    note.innerHTML = dead
      ? `Both buckets are empty, so <code class="inl">total</code> is <b>0</b> and every channel divides <b>0 by 0</b> — ` +
        `<code class="inl">Math.round(NaN)</code> is <b>NaN</b>. That is not a bug to patch: with no paint anywhere there is no ` +
        `colour to report, and freeCodeCamp never asks. Give either bucket a single unit of fullness and an answer exists again.`
      : b1.fullness === b2.fullness
        ? `Equal fullness is the <b>only</b> case where the mix is the midpoint — both weights are <b>${fx(1 - w2)}</b>, so each channel is a plain average. ` +
          `Drag either fullness slider and the marker leaves the dashed line while <b>neither colour changes</b>.` +
          (ties.length ? ` Channel${ties.length > 1 ? "s" : ""} <b>${ties.join(" and ")}</b> land${ties.length > 1 ? "" : "s"} on an exact <b>.5</b> here: <code class="inl">Math.round</code> breaks the tie <b>upward</b>, not toward the fuller or the brighter bucket.` : "")
        : `Bucket${b1.fullness > b2.fullness ? "1" : "2"} holds <b>${Math.max(b1.fullness, b2.fullness)}</b> of the <b>${total}</b> units of paint, so it gets that share of the vote: the mix sits <b>${(w2 * 100).toFixed(1)}%</b> of the way from bucket1's colour to bucket2's, not at the midpoint. ` +
          (b1.fullness === 0 || b2.fullness === 0
            ? `One bucket is empty, so its colour is multiplied by <b>0</b> and drops out entirely — the answer is the other colour, unrounded and unchanged.`
            : `Press <b>swap the two fullness levels</b> to mirror it across the midpoint with the same two colours.`);
  }
}

const CODE = `type Bucket = { color: number[]; fullness: number };

// The answer always lies on the straight line between the two colours; FULLNESS
// alone decides where. Each channel is a weighted average with the fullness
// levels as the weights, so the fuller bucket pulls the result toward its colour.
function mixPaint(bucket1: Bucket, bucket2: Bucket): number[] {
  const total = bucket1.fullness + bucket2.fullness;
  const mixed: number[] = [];
  for (let i = 0; i < 3; i++) {
    // each bucket's share of this channel: its value scaled by how much paint it has
    const p1 = bucket1.color[i] * bucket1.fullness;
    const p2 = bucket2.color[i] * bucket2.fullness;
    mixed.push(Math.round((p1 + p2) / total));   // round PER CHANNEL, after the divide
  }
  return mixed;
}`;

// ── STEP — one frame, no recursion. The two input colours are parameters, so they
// are on screen from the first step; `mixed` appears only when line 3 creates it
// and then fills one channel at a time. `i`, `p1` and `p2` are block-scoped to the
// loop body, so they leave the panel when the loop does. The two contributions are
// separate lines rather than one expression precisely so the panel can show them
// side by side — p1 against p2 IS the weighting. ────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">mixPaint</span>(<span class="tok" data-t="param">bucket1, bucket2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> total = <span class="tok" data-t="total">bucket1.fullness + bucket2.fullness</span>;` },
  { ln: 3, html: `  <span class="k">const</span> mixed = <span class="tok" data-t="init">[]</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cond">i = 0; i &lt; 3</span>; i++) {` },
  { ln: 5, html: `    <span class="k">const</span> p1 = <span class="tok" data-t="p1">bucket1.color[i] * bucket1.fullness</span>;` },
  { ln: 6, html: `    <span class="k">const</span> p2 = <span class="tok" data-t="p2">bucket2.color[i] * bucket2.fullness</span>;` },
  { ln: 7, html: `    mixed.<span class="fn">push</span>(<span class="tok" data-t="round">Math.round((p1 + p2) / total)</span>);` },
  { ln: 8, html: `  }` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">mixed</span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { b1, b2, why } = CASES[idx];
  const f1 = b1.fullness, f2 = b2.fullness;
  const steps = [];
  const mixed = [];
  let total, i, p1, p2;

  const S = (line, note, x = {}) => {
    const vars = { "bucket1.fullness": f1, "bucket2.fullness": f2 };
    if (line >= 2) vars.total = total;
    if (line >= 4 && line <= 8) vars.i = i;         // the loop's own index
    if (line >= 5 && line <= 8) vars.p1 = p1;       // const in the loop body
    if (line >= 6 && line <= 8) vars.p2 = p2;
    // Both colours are parameters, live for the whole call; `mixed` is not born
    // until line 3, so it must not appear before then.
    const structs = [
      { label: "bucket1.color", items: b1.color },
      { label: "bucket2.color", items: b2.color },
    ];
    if (line >= 3) structs.push({ label: "mixed", items: mixed.slice(), newest: !!x.newest });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "mixPaint(bucket1, bucket2)", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Case ${idx + 1} — ${why}. <b>bucket1</b> is <code class='inl'>[${b1.color}]</code> at <b>${f1}%</b>, <b>bucket2</b> is <code class='inl'>[${b2.color}]</code> at <b>${f2}%</b>. ` +
    `The two colours fix the <i>line</i> the answer lies on; the two fullness numbers are the only thing that decides <i>where</i> on it.`,
    { focus: "param" });

  total = f1 + f2;
  S(2, total === 0
    ? `<b>total = ${f1} + ${f2} = 0</b>. Both buckets are empty, so there is no paint to weight at all. Nothing has gone wrong yet — but this is the denominator every channel is about to divide by. Watch line 7.`
    : `<b>total = ${f1} + ${f2} = ${total}</b> — the total volume of paint, not a percentage. It is the denominator for all three channels because it is what makes the weights sum to 1: <code class='inl'>${f1}/${total} + ${f2}/${total} = 1</code>. It does not depend on the channel, so it is computed once, above the loop.`,
    { focus: "total", changed: ["total"] });

  S(3, `Start the answer as an empty array. The three channels are computed <b>independently</b> — red never consults green — which is why the rounding below happens three separate times instead of once on some aggregate.`,
    { focus: "init" });

  for (i = 0; i < 3; i++) {
    S(4, `<b>i = ${i}</b> — the <b style="color:${CH_COLOR[i]}">${CH[i]}</b> channel. One pass per channel; the two lines inside are identical every time, only the pair of numbers they read changes.`,
      { focus: "cond", changed: ["i"], eval: { expr: `i = ${i} < 3`, val: true } });

    const c1 = b1.color[i], c2 = b2.color[i];
    p1 = c1 * f1;
    S(5, `Bucket1's share of this channel: <b>${c1} × ${f1} = ${p1}</b>. Its colour value is scaled by how much paint it actually has, which is the entire mechanism — a bucket with nothing in it is multiplied by 0 and stops mattering.`,
      { focus: "p1", changed: ["p1"] });

    p2 = c2 * f2;
    const mechanism =
      f1 === f2 && f1 !== 0 ? `The two fullness levels are equal, so the two shares are weighted the same and the divide below is a plain average.`
      : f1 === 0 && f2 === 0 ? `Both shares are <b>0</b>, because both fullness levels are — there is no paint anywhere to contribute.`
      : f1 === 0 || f2 === 0 ? `Bucket${f1 === 0 ? "1" : "2"} is empty, so its share is <b>0</b> and only bucket${f1 === 0 ? "2" : "1"} says anything about this channel.`
      : `Put the two side by side: <b>${p1}</b> against <b>${p2}</b>. Bucket${f1 > f2 ? "1" : "2"} holds more paint, so its share is the larger one — that inequality <i>is</i> the weighting, and nothing else in this function creates it.`;
    S(6, `Bucket2's share: <b>${c2} × ${f2} = ${p2}</b>. ${mechanism}`,
      { focus: "p2", changed: ["p2"] });

    const sum = p1 + p2;
    const exact = sum / total;
    const out = Math.round(exact);
    mixed.push(out);
    const rounding =
      total === 0 ? `<b>0 ÷ 0 is NaN</b>, and <code class='inl'>Math.round(NaN)</code> is <b>NaN</b>. The code is not misbehaving — with no paint in either bucket there is genuinely no colour to name. freeCodeCamp never tests this input, so nothing here guards it.`
      : exact === out ? `The division came out whole, so the rounding has nothing to do on this channel.`
      : isTie(exact) ? `That is an exact <b>.5</b>. <code class='inl'>Math.round</code> breaks ties by going <b>up</b> — toward +∞, not toward the fuller bucket or the brighter colour — so it becomes <b>${out}</b>, and it would still be ${out} with the two buckets swapped.`
      : `Rounding <b>${out > exact ? "up" : "down"}</b> to the nearest integer. Note <i>where</i> that happens: <b>after</b> the divide and <b>per channel</b>. Round the two shares first, or round one figure for the whole colour, and you get a different pixel.`;
    S(7, `Add the shares and divide by total, then round: <b>${p1} + ${p2} = ${sum}</b>, <b>${sum} ÷ ${total} = ${fx(exact)}</b> → <b>${out}</b>. ${rounding}`,
      { focus: "round", newest: true });
  }

  S(4, `<b>i = 3</b>, so the loop ends — all three channels are in <b>mixed</b>, and <code class='inl'>i</code>, <code class='inl'>p1</code> and <code class='inl'>p2</code> go out of scope with the loop body.`,
    { focus: "cond", eval: { expr: `i = ${i} < 3`, val: false } });

  const w2 = total === 0 ? 0 : f2 / total;
  const closing = total === 0
    ? `` // the dead case gets its own sentence below — "three integers" would be a lie
    : f1 === f2
      ? `With equal fullness this landed exactly on the <b>midpoint</b> of the two colours. That is the special case, not the rule.`
      : `On the line between the two colours this sits <b>${(w2 * 100).toFixed(1)}%</b> of the way from bucket1 toward bucket2 — because bucket${f1 > f2 ? "1" : "2"} holds ${Math.max(f1, f2)} of the ${total} units of paint.`;
  S(9, total === 0
    ? `Return <b>[NaN, NaN, NaN]</b> — one per channel, and not a colour. That is the honest answer to "what shade is nothing mixed with nothing?", and this is the only input for which the formula has none.`
    : `Return <b>[${mixed.join(", ")}]</b> — three integers, one per channel. ${closing}`,
    { focus: "ret", done: true, result: `[${mixed.join(", ")}]`, ret: { value: `[${mixed.join(", ")}]` } });

  return steps;
}

export default {
  n: 364, id: "mixpaint", title: "Between Two Buckets", dates: ["2026-08-09"],
  statement: `Two buckets of paint arrive, each an object with a <code class="inl">color</code> — <code class="inl">[r, g, b]</code> — and a <code class="inl">fullness</code> from 0 to 100. Return the mixed colour as an array of three integers: every channel is the <b>weighted average</b> of the two colours, with the fullness levels as the weights, rounded to the nearest integer. <span class="rule">Example: <code class="inl">mixPaint({ color: [250,250,250], fullness: 80 }, { color: [0,0,0], fullness: 20 })</code> → <b>[200, 200, 200]</b> — four times as much white as black, so the grey lands four fifths of the way to white rather than halfway.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(3) — one pass per channel",
      approach: `Per channel: <code class='inl'>(c₁·f₁ + c₂·f₂) / (f₁ + f₂)</code>, rounded. The shape worth internalising is that the result is <b>always on the straight line between the two colours</b> — mixing can never produce a value outside the pair — and the fullness levels are the only thing that decides where on that line it stops. Equal fullness is the single case that gives the midpoint; <b>90 against 10</b> lands nine tenths of the way toward the fuller bucket. Two details the demo keeps in view: the rounding is applied <b>per channel and after the divide</b>, so one call can round R down and G up; and the degenerate inputs behave differently from each other — an <b>empty</b> bucket is multiplied by 0 and simply drops out, leaving the other colour exactly, while <b>two</b> empty buckets make <code class='inl'>total</code> 0 and the divide <code class='inl'>0/0</code>. freeCodeCamp never tests that second one, and this solution does not invent an answer for it.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Run the loop one line at a time on any of the eight cases. Watch <code class='inl'>mixed</code> fill one channel per pass, and read line 7 closely — the same expression rounds <b>up</b> on one channel and <b>down</b> on the next within a single call (case <b>4</b>). Case <b>1</b> is the true midpoint and case <b>2</b> is the same two colours weighted 80/20, so stepping them back to back shows fullness moving the answer on its own. Case <b>6</b> puts two channels on an exact <b>.5</b>; case <b>7</b> empties one bucket; case <b>8</b> empties both, and line 7 divides by zero. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 2, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a case` } }),
    },
  ],
};
