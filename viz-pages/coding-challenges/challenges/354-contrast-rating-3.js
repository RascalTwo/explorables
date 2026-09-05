// #354 · Contrast Rating 3 — 0–255 is a code value, not a brightness: undo the curve first.
// Day 3 of freeCodeCamp's three-day Contrast Rating series, and the full run of
// the pipeline. What the earlier days owned, in one line each:
//   #352 — handed you the ratio; its lesson is the WCAG threshold table.
//   #353 — handed you two luminances; its lesson is the +0.05 before dividing.
//   #354 — hands you two RGB triples, so THIS day owns the two steps the earlier
//          days were given for free: the sRGB transfer curve (gamma) and the
//          per-channel weights. Both describe the eye, not the file format.
//          Middle grey 128 is not half-lit — it is 0.2159 of white's light. And
//          green is weighted 0.7152 against blue's 0.0722, nearly 10× for the
//          same "full" channel.
// ONE approach, deliberately. There is no wasteful sibling to name here: the only
// way to make the solution "simpler" is to drop line 7 and treat 0–255 as
// brightness, and that is not a slower answer, it is a WRONG one — it fails
// official cases 2 and 5. So it ships as a side-by-side readout inside the single
// demo rather than as a graded tab. Open on case 2 and drag any slider: the
// linear guess reads 3.05 → Fail, the gamma-corrected answer reads 6.69 → AA.
import { el, esc, mountDebugger } from "../shared.js";

// The two tables the challenge is really about. Both are interpolated into the
// `code` block below, so the snippet can never drift from the demo's arithmetic.
const COEF = [0.2126, 0.7152, 0.0722];      // R, G, B — cone density, not RGB's own scale
const CH = ["R", "G", "B"];
// The kit's danger/good/accent happen to BE red/green/blue, so the channel tints
// stay on-theme rather than hardcoding hexes. (Not --c1/--c2/--c3: those alias to
// accent/good/warn, which would paint the blue channel amber.)
const CHC = ["var(--danger)", "var(--good)", "var(--accent)"];
const T = { aaa: [7, 4.5], aa: [4.5, 3] };  // [normal, large] — #352's whole job
const OFFSET = 0.05;                        // #353's whole job

// The sRGB transfer curve: a stored code value → the light it actually emits.
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
// The strawman the demo shows beside it: pretend the code value IS the light.
const flat = (v) => v / 255;

const lum = (rgb, f = lin) => COEF.reduce((s, w, i) => s + w * f(rgb[i]), 0);
const ratioOf = (la, lb) => (Math.max(la, lb) + OFFSET) / (Math.min(la, lb) + OFFSET);
const rate = (r, big) => (r >= (big ? T.aaa[1] : T.aaa[0]) ? "AAA" : r >= (big ? T.aa[1] : T.aa[0]) ? "AA" : "Fail");
const verdict = (rgb1, rgb2, big, f = lin) => rate(ratioOf(lum(rgb1, f), lum(rgb2, f)), big);

const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
const f4 = (x) => x.toFixed(4);

// ── CASES ───────────────────────────────────────────────────────────────────
// PROVENANCE: 1–6 are freeCodeCamp's six official cases, in the grader's own
// order (three normal-text, three large-text — the boolean is a second axis, so
// both states ship). 7–8 are mine and each earns its slot:
//   • The ratio-21 ceiling is already official case 1 (pure white on pure black),
//     so there is nothing to invent there — that boundary comes free.
//   • Official 2 and 5 are already the gamma payoff: strip the curve and both
//     drop to "Fail". The official set does catch this one.
//   7 (mine) — white on #767676, the real WCAG boundary grey. 4.542 scrapes AA;
//              one step darker (119 → 4.478) Fails. A knife-edge you cannot see
//              in the hex, and the linear guess calls it 2.05 → Fail.
//   8 (mine) — pure green on pure blue, large text. Both channels are maxed, so
//              gamma is a no-op at the endpoints and the linear readout AGREES
//              here — the CURVE bites in the middle, but the WEIGHTS bite
//              everywhere: 0.7152 against 0.0722 is the whole ratio.
const CASES = [
  { rgb1: [255, 255, 255], rgb2: [0, 0, 0], big: false, label: "white ▸ black", want: "AAA", src: "fCC 1" },
  { rgb1: [215, 188, 188], rgb2: [55, 55, 55], big: false, label: "rose ▸ charcoal", want: "AA", src: "fCC 2" },
  { rgb1: [143, 144, 210], rgb2: [46, 47, 61], big: false, label: "periwinkle ▸ slate", want: "Fail", src: "fCC 3" },
  { rgb1: [167, 167, 210], rgb2: [53, 10, 53], big: true, label: "lilac ▸ plum", want: "AAA", src: "fCC 4" },
  { rgb1: [135, 147, 155], rgb2: [60, 70, 90], big: true, label: "steel ▸ navy", want: "AA", src: "fCC 5" },
  { rgb1: [125, 210, 195], rgb2: [105, 130, 90], big: true, label: "mint ▸ moss", want: "Fail", src: "fCC 6" },
  { rgb1: [255, 255, 255], rgb2: [118, 118, 118], big: false, label: "white ▸ #767676", want: "AA", src: "mine" },
  { rgb1: [0, 255, 0], rgb2: [0, 0, 255], big: true, label: "green ▸ blue", want: "AAA", src: "mine" },
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cr3-wrap { display:flex; flex-direction:column; gap:14px; }
    .cr3-lg { font:800 8.5px var(--sans); vertical-align:super; letter-spacing:.05em; opacity:.75; margin-left:3px; }
    .cr3-col { border:1px solid var(--border); border-radius:12px; padding:11px 13px; background:var(--panel); }
    .cr3-role { font:700 10px var(--sans); letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
    .cr3-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .cr3-sw { width:44px; height:44px; border-radius:9px; border:1px solid var(--border); flex:none; }
    .cr3-hex { font:700 13px var(--mono); }
    .cr3-hex .sub { display:block; font:11px var(--mono); color:var(--muted); font-weight:400; }
    .cr3-sl { display:grid; grid-template-columns:16px 1fr 40px; align-items:center; gap:8px; margin:3px 0; }
    .cr3-sl .ch { font:800 12px var(--mono); text-align:center; }
    .cr3-sl .ch.R { color:var(--danger); } .cr3-sl .ch.G { color:var(--good); } .cr3-sl .ch.B { color:var(--accent); }
    .cr3-sl .v { font:700 12px var(--mono); text-align:right; color:var(--muted); font-variant-numeric:tabular-nums; }
    .cr3-sl input[type=range] { width:100%; }
    .cr3-prev { border:1px solid var(--border); border-radius:12px; padding:18px 16px; text-align:center; }
    .cr3-prev .t { font:400 16px var(--sans); }
    .cr3-prev.big .t { font:700 24px var(--sans); }
    .cr3-pipe { display:flex; gap:12px; flex-wrap:wrap; }
    .cr3-pipe > div { flex:1 1 300px; }
    .cr3-cap { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
    .cr3-wt { position:relative; min-width:96px; }
    .cr3-bar { position:absolute; left:0; top:0; bottom:0; opacity:.28; border-radius:2px; }
    .cr3-wt span { position:relative; }
    .cr3-tot td { border-top:2px solid var(--accent) !important; font-weight:800; color:var(--accent); }
    .cr3-eq { font:13px var(--mono); background:#0a0e14; border:1px solid var(--border); border-radius:9px; padding:10px 13px; line-height:1.7; }
    .cr3-eq b { color:var(--accent); }
    .cr3-vs { display:grid; grid-template-columns:1fr; gap:10px; }
    @media (min-width:640px) { .cr3-vs { grid-template-columns:1fr 1fr; } }
    .cr3-vsc { border:1px solid var(--border); border-radius:11px; padding:10px 13px; }
    .cr3-vsc.right { border-color:var(--good); background:color-mix(in srgb, var(--good) 7%, transparent); }
    .cr3-vsc.wrong { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 7%, transparent); }
    .cr3-vsc .h { font:700 11px var(--sans); letter-spacing:.05em; text-transform:uppercase; margin-bottom:6px; }
    .cr3-vsc.right .h { color:var(--good); } .cr3-vsc.wrong .h { color:var(--danger); }
    .cr3-vsc .n { font:800 26px var(--mono); font-variant-numeric:tabular-nums; }
    .cr3-vsc .d { font:12px var(--mono); color:var(--muted); }
    .cr3-flip { border-left:3px solid var(--warn); }
  `));
}

// ── SOLUTION DEMO — six live sliders, the pipeline rendered as stages ────────
// The payoff is the pair of cards at the bottom: the same two colours scored
// with and without the transfer curve. Drag any slider into the midtones and
// watch them disagree; drag it to 0 or 255 and watch them agree again.
function mount(host) {
  ensureStyle();
  // `a` and `b` are MUTATED in place, never reassigned — the sliders below close
  // over these exact arrays, so swapping in a fresh one would orphan them.
  const a = [...CASES[1].rgb1], b = [...CASES[1].rgb2];
  const setRgb = (dst, src) => src.forEach((v, i) => { dst[i] = v; });
  let big = CASES[1].big;

  const chips = el("div", "controls");
  chips.append(el("span", "ctl-label", "case"));
  const chipEls = CASES.map((cs, i) => {
    const c = el("button", "chip" + (i === 1 ? " on" : ""), `${esc(cs.label)}${cs.big ? '<span class="cr3-lg">LARGE</span>' : ""}`);
    c.title = `${cs.src} — expects "${cs.want}"`;
    c.onclick = () => { setRgb(a, cs.rgb1); setRgb(b, cs.rgb2); big = cs.big; chipEls.forEach((x, xi) => x.classList.toggle("on", xi === i)); syncSliders(); sizeBtns(); render(); };
    chips.append(c); return c;
  });

  const sizeRow = el("div", "controls");
  sizeRow.append(el("span", "ctl-label", "isLargeText"));
  const bFalse = el("button", "chip", "false · 16px"), bTrue = el("button", "chip", "true · 24px bold");
  const sizeBtns = () => { bFalse.classList.toggle("on", !big); bTrue.classList.toggle("on", big); };
  bFalse.onclick = () => { big = false; sizeBtns(); render(); };
  bTrue.onclick = () => { big = true; sizeBtns(); render(); };
  sizeRow.append(bFalse, bTrue);
  sizeBtns();

  // Sliders are built ONCE — rebuilding them on input would drop the drag.
  const sliders = [];
  const colBox = (rgb, role, note) => {
    const box = el("div", "cr3-col");
    box.append(el("div", "cr3-role", role));
    const head = el("div", "cr3-head");
    const sw = el("div", "cr3-sw"), tx = el("div", "cr3-hex");
    head.append(sw, tx); box.append(head);
    CH.forEach((name, i) => {
      const row = el("div", "cr3-sl");
      const inp = el("input"); inp.type = "range"; inp.min = 0; inp.max = 255; inp.value = rgb[i];
      const val = el("span", "v", String(rgb[i]));
      inp.oninput = () => { rgb[i] = +inp.value; val.textContent = inp.value; chipEls.forEach((x) => x.classList.remove("on")); render(); };
      row.append(el("span", `ch ${name}`, name), inp, val);
      box.append(row);
      sliders.push({ inp, val, rgb, i });
    });
    box.append(el("div", "note", note));
    return { box, sw, tx };
  };
  const A = colBox(a, "rgb1 — the lighter colour", "The challenge promises rgb1 is the lighter one. Drag it below rgb2 anyway: <code class='inl'>Math.max/min</code> keeps the ratio ≥ 1 either way.");
  const B = colBox(b, "rgb2 — the darker colour", "Every slider here is a <b>code value</b>, not a brightness. The table below turns it into one.");
  const cols = el("div", "grid2"); cols.append(A.box, B.box);
  const syncSliders = () => sliders.forEach((s) => { s.inp.value = s.rgb[s.i]; s.val.textContent = String(s.rgb[s.i]); });

  const out = el("div", "cr3-wrap");
  host.append(chips, sizeRow, cols, out);
  render();

  // One colour's pipeline: raw → ÷255 → gamma → × weight, plus the total.
  function pipeTable(rgb, name) {
    const parts = COEF.map((w, i) => w * lin(rgb[i]));
    const total = parts.reduce((s, x) => s + x, 0);
    const rows = CH.map((chn, i) => {
      const c = rgb[i] / 255, g = lin(rgb[i]);
      const pct = total > 0 ? (parts[i] / total) * 100 : 0;
      return `<tr>
        <td style="color:${CHC[i]}"><b>${chn}</b></td>
        <td>${rgb[i]}</td><td>${c.toFixed(4)}</td><td>${g.toFixed(4)}</td>
        <td class="cr3-wt"><div class="cr3-bar" style="width:${pct.toFixed(1)}%;background:${CHC[i]}"></div><span>${parts[i].toFixed(4)}</span></td>
      </tr>`;
    }).join("");
    return `<div>
      <div class="cr3-cap">${name} · ${esc(hex(rgb))}</div>
      <table class="cmp"><thead><tr>
        <th>ch</th><th>0–255</th><th>÷ 255</th><th>gamma</th><th>× weight</th>
      </tr></thead><tbody>${rows}
      <tr class="cr3-tot"><td colspan="4">relative luminance</td><td>${f4(total)}</td></tr>
      </tbody></table></div>`;
  }

  function render() {
    A.sw.style.background = css(a); B.sw.style.background = css(b);
    A.tx.innerHTML = `${hex(a)}<span class="sub">${css(a)}</span>`;
    B.tx.innerHTML = `${hex(b)}<span class="sub">${css(b)}</span>`;

    const la = lum(a), lb = lum(b);
    const r = ratioOf(la, lb), got = rate(r, big);
    const rn = ratioOf(lum(a, flat), lum(b, flat)), gotN = rate(rn, big);
    const flipped = got !== gotN;
    const inverted = la < lb;
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    const need = big ? T.aaa[1] : T.aaa[0], needAA = big ? T.aa[1] : T.aa[0];
    const match = CASES.find((cs) => String(cs.rgb1) === String(a) && String(cs.rgb2) === String(b) && cs.big === big);

    out.innerHTML = `
      <div class="cr3-prev${big ? " big" : ""}" style="background:${css(b)};color:${css(a)};border-color:${css(a)}">
        <div class="t">The quick brown fox jumps over the lazy dog</div>
      </div>

      <div class="cr3-pipe">${pipeTable(a, "rgb1")}${pipeTable(b, "rgb2")}</div>

      <div class="cr3-eq">
        ratio = (<b>${f4(hi)}</b> + ${OFFSET}) / (<b>${f4(lo)}</b> + ${OFFSET}) = <b>${r.toFixed(3)}</b>
        ${inverted ? `<br><span class="muted">rgb1 is currently the <b>darker</b> colour — the grader promises this never happens, but max/min keeps the ratio ≥ 1.</span>` : ""}
      </div>

      <div class="result-line">
        <span class="badge ${got === "Fail" ? "no" : "ok"}">${got}</span>
        <span class="tag">${big ? "large text" : "normal text"}</span>
        <span class="tag mono">AAA ≥ ${need}</span><span class="tag mono">AA ≥ ${needAA}</span>
        ${match ? `<span class="muted">${esc(match.src)} — expects <b>"${match.want}"</b> ${got === match.want ? "✓" : "✗"}</span>` : `<span class="muted">your own colours</span>`}
      </div>

      <div class="ladder">
        <div class="rung${got === "AAA" ? " on" : ""}"><span>AAA</span><span class="v">ratio ≥ ${need}</span></div>
        <div class="rung${got === "AA" ? " on" : ""}"><span>AA</span><span class="v">ratio ≥ ${needAA}</span></div>
        <div class="rung${got === "Fail" ? " on" : ""}"><span>Fail</span><span class="v">ratio &lt; ${needAA}</span></div>
      </div>

      <div class="cr3-vs">
        <div class="cr3-vsc wrong">
          <div class="h">skip gamma — treat 0–255 as light</div>
          <div class="n">${rn.toFixed(3)} → ${gotN}</div>
          <div class="d">L = ${f4(lum(a, flat))} vs ${f4(lum(b, flat))}</div>
        </div>
        <div class="cr3-vsc right">
          <div class="h">gamma-corrected — the answer</div>
          <div class="n">${r.toFixed(3)} → ${got}</div>
          <div class="d">L = ${f4(la)} vs ${f4(lb)}</div>
        </div>
      </div>

      <div class="note${flipped ? " cr3-flip" : ""}">${flipped
        ? `<b>Gamma just changed the verdict.</b> Dropping line 7 and reading the code value as light rates this pair <b>${gotN}</b>; the real transfer curve rates it <b>${got}</b>. That is why "average the channels" is not a cheaper solution — it is a wrong one.`
        : `Both readings agree on <b>${got}</b> right now. Push a slider into the <b>midtones</b> (roughly 60–200) to split them — the curve is nearly flat at 0 and exactly 1 at 255, so it does its work in the middle. Case 2 and case 5 are official pairs where it flips the answer.`}</div>

      <div class="note">Green is weighted <b>${COEF[1]}</b> against blue's <b>${COEF[2]}</b> — nearly 10× — because the retina's cones cluster there. The width of each bar in the last column is that channel's share of its colour's luminance: on a neutral grey, green alone is over 70% of it.</div>
    `;
  }
}

// ── STEP — the solution line by line, with luminance() as its own frame ──────
// The helper is called twice, so it pushes and pops a frame each time (like the
// nested counts() in #325). The per-channel struct lives inside that frame and
// records raw → ÷255 → gamma → weighted for each channel as it is folded in;
// COEF is a struct on the OUTER frame from line 2 onward, because that is where
// it is declared and it stays live for the whole call. `c` and `lin` are
// per-iteration consts, so they leave the panel at the top of every pass — that
// disappearance is the point of gating them on the line number. `sum` is gated
// the same way, on a `sumLive` flag: the frame opens on line 3, but `sum` is
// declared on line 4, so showing it as 0.0000 a step early would read as
// "sum exists and is empty".
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getContrastRating</span>(<span class="tok" data-t="args">rgb1, rgb2, isLargeText</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="coef">COEF = [0.2126, 0.7152, 0.0722]</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="fn">luminance</span> = (rgb) =&gt; {` },
  { ln: 4, html: `    <span class="k">let</span> <span class="tok" data-t="sum">sum = 0</span>;` },
  { ln: 5, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="fori">i = 0; i &lt; 3</span>; i++) {` },
  { ln: 6, html: `      <span class="k">const</span> <span class="tok" data-t="div">c = rgb[i] / 255</span>;` },
  { ln: 7, html: `      <span class="k">const</span> lin = <span class="tok" data-t="gamma">c &lt;= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4</span>;` },
  { ln: 8, html: `      <span class="tok" data-t="weigh">sum += COEF[i] * lin</span>;` },
  { ln: 9, html: `    }` },
  { ln: 10, html: `    <span class="k">return</span> <span class="tok" data-t="lret">sum</span>;` },
  { ln: 11, html: `  };` },
  { ln: 12, html: `  <span class="k">const</span> <span class="tok" data-t="calls">l1 = <span class="fn">luminance</span>(rgb1), l2 = <span class="fn">luminance</span>(rgb2)</span>;` },
  { ln: 13, html: `  <span class="k">const</span> ratio = <span class="tok" data-t="ratio">(<span class="fn">Math.max</span>(l1, l2) + 0.05) / (<span class="fn">Math.min</span>(l1, l2) + 0.05)</span>;` },
  { ln: 14, html: `  <span class="k">if</span> (<span class="tok" data-t="taaa">ratio &gt;= (isLargeText ? 4.5 : 7)</span>) <span class="k">return</span> <span class="st">"AAA"</span>;` },
  { ln: 15, html: `  <span class="k">if</span> (<span class="tok" data-t="taa">ratio &gt;= (isLargeText ? 3 : 4.5)</span>) <span class="k">return</span> <span class="st">"AA"</span>;` },
  { ln: 16, html: `  <span class="k">return</span> <span class="st">"Fail"</span>;` },
  { ln: 17, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const cs = CASES[idx];
  const steps = [];

  const main = {};        // getContrastRating's own scope — keys appear as lines run
  let coefLive = false;   // COEF's struct: born on line 2, alive for the whole call
  let hf = null;          // the active luminance() frame, or null between calls
  let sumLive = false;    // `sum` is declared on line 4: the line-3 step must not show it

  const framesNow = (x) => {
    const outer = {
      title: "getContrastRating(rgb1, rgb2, isLargeText)",
      vars: { ...main },
      changed: hf ? [] : (x.changed || []),
      ret: (!hf && x.ret) ? x.ret : undefined,
    };
    if (coefLive) outer.structs = [{ label: "COEF", items: CH.map((n, i) => `${n} ×${COEF[i]}`) }];
    const frames = [outer];
    if (hf) {
      const vars = { rgb: `[${hf.rgb.join(", ")}]` };
      if (sumLive) vars.sum = f4(hf.sum);
      if (hf.i !== undefined) vars.i = hf.i;
      if (hf.c !== undefined) vars.c = hf.c.toFixed(4);
      if (hf.lin !== undefined) vars.lin = hf.lin.toFixed(4);
      frames.push({
        title: `luminance([${hf.rgb.join(", ")}])`,
        vars,
        changed: x.changed || [],
        structs: [{ label: "channels folded in", items: hf.chans.slice(), newest: !!x.newest }],
        ret: x.ret,
      });
    }
    return frames;
  };
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x),
  });

  // luminance(rgb) — pushes a frame, folds three channels in, pops with the sum.
  const runLum = (rgb, which) => {
    hf = { rgb, sum: 0, chans: [] }; sumLive = false;
    S(3, `Call <b>luminance</b> on the <b>${which}</b> colour <b>rgb(${rgb.join(", ")})</b>. A fresh frame opens: luminance is a property of one colour, so the identical code runs twice rather than trying to compare the triples directly. Only <code class='inl'>rgb</code> is bound so far — <code class='inl'>sum</code> is declared on the next line and does not exist yet.`, { focus: "calls" });
    sumLive = true;
    S(4, `<b>sum = 0</b>, and it appears in the panel only now, as its own line runs. Three weighted pieces are about to be added into it — one per channel — and their total is all that survives this frame.`, { focus: "sum", changed: ["sum"] });
    for (let i = 0; i < 3; i++) {
      hf.i = i; hf.c = undefined; hf.lin = undefined;
      S(5, i === 0
        ? `Start with channel <b>${CH[i]}</b>. Only <b>i</b> is in scope here — <code class='inl'>c</code> and <code class='inl'>lin</code> are declared <i>inside</i> the loop body, so they do not exist yet.`
        : `Next channel: <b>${CH[i]}</b>. Notice <code class='inl'>c</code> and <code class='inl'>lin</code> have vanished from the panel — they are per-iteration <code class='inl'>const</code>s and the previous pair died when the block ended.`,
        { focus: "fori", changed: ["i"], eval: { expr: `i = ${i} < 3`, val: true } });
      const raw = rgb[i]; const c = raw / 255; hf.c = c;
      S(6, `<b>${raw} / 255 = ${c.toFixed(4)}</b>. This only rescales the stored number into 0–1; it does <b>not</b> make it a brightness. ${raw === 128 ? "128 sits exactly halfway up the byte and is nowhere near half as bright." : raw === 255 ? "255 is the one value where the code and the light do agree — it is full output by definition." : raw === 0 ? "0 is the other fixed point: no code, no light." : "The byte is a code the display was told to store, not a measurement of light."}`, { focus: "div", changed: ["c"] });
      const below = c <= 0.04045; const g = lin(raw); hf.lin = g;
      S(7, `<b>${c.toFixed(4)} ${below ? "≤" : ">"} 0.04045</b>, so take the ${below ? "<b>linear</b> foot of the curve: <b>" + c.toFixed(4) + " / 12.92</b>" : "<b>power</b> branch: <b>((" + c.toFixed(4) + " + 0.055) / 1.055) ** 2.4</b>"} → <b>${g.toFixed(4)}</b>. sRGB spends more of its 256 code values on darks than on lights, because the eye resolves dark tones better; this exponent hands those crowded codes back the light they actually stand for.${below ? " Near black the curve is a straight line — a power law there would make quantisation and noise explode." : ""}`,
        { focus: "gamma", changed: ["lin"], eval: { expr: `${c.toFixed(4)} <= 0.04045`, val: below } });
      const part = COEF[i] * g; hf.sum += part;
      hf.chans.push(`${CH[i]} ${raw}→${g.toFixed(3)}→${part.toFixed(3)}`);
      S(8, `Weight it by <b>${COEF[i]}</b>: <b>${g.toFixed(4)} × ${COEF[i]} = ${part.toFixed(4)}</b>, and <b>sum</b> is now <b>${f4(hf.sum)}</b>. ${i === 1 ? "Green's weight is the big one — 71.5% of perceived light — because the retina's cones are packed toward green." : i === 2 ? "Blue's 0.0722 is barely a twentieth of the total: we see blue detail poorly, so it contributes almost nothing to brightness." : "Red sits in the middle at 0.2126."}`,
        { focus: "weigh", changed: ["sum"], newest: true });
    }
    hf.i = undefined; hf.c = undefined; hf.lin = undefined;
    const total = hf.sum;
    S(10, `All three folded in. Return <b>${f4(total)}</b> — the light this colour actually emits, on a scale where black is 0 and white is 1. <code class='inl'>i</code>, <code class='inl'>c</code> and <code class='inl'>lin</code> are gone: the loop that owned them has ended, and this frame is about to pop.`, { focus: "lret", ret: { value: f4(total) } });
    hf = null;
    return total;
  };

  main.rgb1 = `[${cs.rgb1.join(", ")}]`; main.rgb2 = `[${cs.rgb2.join(", ")}]`; main.isLargeText = String(cs.big);
  S(1, `<b>Case ${idx + 1} · ${cs.label}</b> (${cs.src}) — rate <b>${hex(cs.rgb1)}</b> against <b>${hex(cs.rgb2)}</b> for <b>${cs.big ? "large" : "normal"}</b> text. Six numbers in, one of three strings out; everything in between is a model of the eye, not of the file format.`, { focus: "args", changed: ["rgb1", "rgb2", "isLargeText"] });
  coefLive = true;
  S(2, `The three weights are neither equal nor arbitrary — they are the CIE luminance coefficients. Swapping the same amount of green for the same amount of blue changes perceived brightness by about <b>10×</b>, which is why a colour cannot be reduced to a plain average of its channels.`, { focus: "coef" });

  const l1 = runLum(cs.rgb1, "first");
  main.l1 = f4(l1);
  S(12, `Back in the outer frame with <b>l1 = ${f4(l1)}</b>. The helper's <code class='inl'>sum</code>, <code class='inl'>rgb</code> and channel list went with the popped frame — only the one number crossed back.`, { focus: "calls", changed: ["l1"] });
  const l2 = runLum(cs.rgb2, "second");
  main.l2 = f4(l2);
  S(12, `<b>l2 = ${f4(l2)}</b>. Both colours are now single numbers, which is exactly the input <b>#353</b> was handed for free — from here on this is that day's problem.`, { focus: "calls", changed: ["l2"] });

  const r = ratioOf(l1, l2);
  main.ratio = r.toFixed(4);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  S(13, `Add <b>${OFFSET}</b> to each before dividing: <b>(${f4(hi)} + ${OFFSET}) / (${f4(lo)} + ${OFFSET}) = ${r.toFixed(4)}</b>. The offset stands in for ambient screen flare — no pixel is truly black in a lit room — and it is also what stops black-on-black dividing by zero. ${r > 20 ? "With pure white over pure black it pins the scale at its ceiling of <b>21</b>." : ""}`, { focus: "ratio", changed: ["ratio"] });

  const need = cs.big ? T.aaa[1] : T.aaa[0];
  const isAAA = r >= need;
  S(14, `<b>AAA</b> demands <b>${need}</b> for ${cs.big ? "large" : "normal"} text — the ${cs.big ? "large" : "normal"}-text column of the same inclusive table <b>#352</b> walks through, which is also where that <code class='inl'>&gt;=</code> is argued. ${r.toFixed(4)} ${isAAA ? "clears" : "misses"} it → <b>${isAAA}</b>.`, { focus: "taaa", eval: { expr: `${r.toFixed(4)} >= ${need}`, val: isAAA } });
  if (isAAA) {
    S(14, `Return <b>"AAA"</b> — the top rating, and the function exits before the AA test is ever reached.${gammaAside(cs, "AAA")}`, { focus: "taaa", done: true, result: "AAA", ret: { value: "AAA" } });
    return steps;
  }
  const needAA = cs.big ? T.aa[1] : T.aa[0];
  const isAA = r >= needAA;
  S(15, `Not AAA, so try <b>AA</b> at <b>${needAA}</b>: ${r.toFixed(4)} ${isAA ? "clears" : "misses"} it → <b>${isAA}</b>. Order matters — testing the loose bar first would label every AAA pair as AA.`, { focus: "taa", eval: { expr: `${r.toFixed(4)} >= ${needAA}`, val: isAA } });
  if (isAA) {
    S(15, `Return <b>"AA"</b> — legible, but short of the strict bar.${gammaAside(cs, "AA")}`, { focus: "taa", done: true, result: "AA", ret: { value: "AA" } });
    return steps;
  }
  S(16, `Both bars missed, so fall through and return <b>"Fail"</b> — this pairing is not readable enough at this text size.${gammaAside(cs, "Fail")}`, { done: true, result: "Fail", ret: { value: "Fail" } });
  return steps;
}

// The closing sentence on the return step: what the same pair would have scored
// had line 7 been skipped. On the cases where it differs, that IS the challenge.
function gammaAside(cs, got) {
  const rn = ratioOf(lum(cs.rgb1, flat), lum(cs.rgb2, flat));
  const gotN = rate(rn, cs.big);
  return got === gotN
    ? ` <span class="muted">(Skipping the gamma line would have given ${rn.toFixed(3)} → <b>${gotN}</b> here too — these channels sit near 0 or 255, where the curve barely moves. Try case 2 or 5.)</span>`
    : ` <span class="muted">(Skipping the gamma line would have given ${rn.toFixed(3)} → <b>${gotN}</b> — a different verdict. The curve is the whole challenge.)</span>`;
}

export default {
  n: 354, id: "contrast3", title: "Contrast Rating 3", dates: ["2026-07-30"],
  statement: `Given two RGB triples <code class="inl">[R, G, B]</code> and a boolean for large text, return the WCAG contrast rating. Turn each colour into its <b>relative luminance</b>: divide each channel by 255, gamma-correct it with <code class="inl">c &lt;= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4</code>, then weight the three by <code class="inl">0.2126·R + 0.7152·G + 0.0722·B</code>. Add <code class="inl">0.05</code> to each luminance, divide the lighter by the darker, and read the ratio off the table — <b>"AAA"</b> at 7.0+ (4.5+ for large text), <b>"AA"</b> at 4.5+ (3.0+), otherwise <b>"Fail"</b>. <span class="rule">Example: <code class="inl">getContrastRating([215,188,188], [55,55,55], false)</code> → luminances 0.5404 and 0.0382, so <code class="inl">(0.5904 / 0.0882) = 6.69</code> → <b>"AA"</b>. Skip the gamma step and the same pair reads 3.05 → <b>"Fail"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 6 channels",
      approach: `Two colours, three channels each — six numbers, fixed work. Per channel: rescale to 0–1, then <b>undo the sRGB transfer curve</b>, because a stored byte is a code value, not a measurement of light (sRGB deliberately spends more codes on darks, where the eye resolves better). Weight the linear values by <code class='inl'>0.2126 / 0.7152 / 0.0722</code> — the eye's own sensitivity, which is why green counts for ten blues. That gives one luminance per colour; from there it is <b>#353</b>'s ratio and <b>#352</b>'s table. Drag any slider into the midtones and watch the two cards at the bottom disagree: the linear guess is not a cheaper answer, it is a wrong one.`,
      code: `function getContrastRating(rgb1: number[], rgb2: number[], isLargeText: boolean): string {
  const COEF = [${COEF.join(", ")}];  // R, G, B — the eye's sensitivity, not RGB's own scale
  const luminance = (rgb: number[]): number => {
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      const c = rgb[i] / 255;                                                // code value → 0–1
      const lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;   // undo the sRGB curve
      sum += COEF[i] * lin;                                                  // weight by eye sensitivity
    }
    return sum;
  };
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  // The challenge promises rgb1 is the lighter one; max/min costs nothing and
  // keeps the ratio >= 1 even if it isn't.
  const ratio = (Math.max(l1, l2) + ${OFFSET}) / (Math.min(l1, l2) + ${OFFSET});
  if (ratio >= (isLargeText ? ${T.aaa[1]} : ${T.aaa[0]})) return "AAA";
  if (ratio >= (isLargeText ? ${T.aa[1]} : ${T.aa[0]})) return "AA";
  return "Fail";
}`,
      mount,
    },
    {
      name: "Step through", cost: "two luminance frames",
      approach: `A debugger for the solution. <code class='inl'>luminance</code> is called twice, so it gets its <b>own call frame</b> each time — watch <code class='inl'>rgb</code>, <code class='inl'>sum</code> and the channel list appear on top and pop away leaving a single number behind. Inside the loop, <code class='inl'>c</code> and <code class='inl'>lin</code> <b>vanish from the panel at the top of every pass</b>, because per-iteration <code class='inl'>const</code>s really do die at the closing brace. Cases 1–6 are freeCodeCamp's; 7 is the knife-edge <code class='inl'>#767676</code> grey and 8 is pure green over pure blue, where gamma does nothing but the weights do everything. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 2, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–6 official, 7–8 mine` },
      }),
    },
  ],
};
