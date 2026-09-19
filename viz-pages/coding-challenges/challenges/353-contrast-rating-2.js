// #353 · Contrast Rating 2 — +0.05 on both luminances is what keeps black's ratio finite.
//
// DAY 2 OF 3. freeCodeCamp shipped Contrast Rating as a three-day series, and each
// day is graded on its own getContrastRating():
//   #352 — (ratio, isLargeText)      owns the WCAG threshold table.
//   #353 — (l1, l2, isLargeText)     THIS FILE: owns the +0.05 and the division.
//   #354 — (rgb1, rgb2, isLargeText) owns gamma correction, RGB → luminance.
//
// So this module spends all its pixels on ONE expression: (l1 + 0.05) / (l2 + 0.05).
// Why the constant is there at all — pure black has relative luminance 0, and a
// bare l1/l2 would divide by it; physically the 0.05 stands in for the ambient
// light every real screen reflects, so nothing is ever truly at luminance 0. And
// why the answer is a RATIO rather than l1 − l2 — contrast is perceived
// multiplicatively, so the same *gap* reads very differently down in the shadows
// than it does up in the highlights. The demo's whole job is to let you drag l2 to
// 0 and watch the +0.05 catch it; the threshold ladder is a readout, not a lesson
// (that is #352's day), and the greys are painted from luminance without dwelling
// on how (that is #354's).
//
// Single approach: the spec IS the formula, so there is no second mental model to
// put beside it — one Solution + one Step through, same as #331 and #325.
import { el, mountDebugger } from "../shared.js";

// The flare term, and the rating floors as [normal, large]. Both are interpolated
// into the `code` block below so the snippet can never drift from what runs here.
const FLARE = 0.05;
const BAR = { AAA: [7, 4.5], AA: [4.5, 3] };
const MAX_RATIO = (1 + FLARE) / FLARE; // 21 — white (L=1) over black (L=0)

const rate = (ratio, large) =>
  ratio >= (large ? BAR.AAA[1] : BAR.AAA[0]) ? "AAA"
  : ratio >= (large ? BAR.AA[1] : BAR.AA[0]) ? "AA"
  : "Fail";

// ── Cases ────────────────────────────────────────────────────────────────────
// 1–6 are freeCodeCamp's six official tests, verbatim and in the order the grader
// lists them. Between them they hit all six branches (AAA / AA / Fail × normal /
// large), and case 1 is already the extreme this module exists for: l2 = 0, the
// input a bare l1/l2 would divide by zero on.
// 7–8 are ours. They are the SAME luminance pair, engineered so the ratio lands
// exactly on 4.5 — the one place where "7.0+ is inclusive, below 4.5 is exclusive"
// actually decides something, and where flipping only isLargeText turns one
// unchanged ratio from AA into AAA. Everything else on this page is reachable by
// dragging the two sliders, which span the whole 0–1 luminance space.
const CASES = [
  { l1: 1.0,    l2: 0.0,    large: false, why: "white on pure black — the ceiling, and the divide-by-zero that isn't" },
  { l1: 0.9015, l2: 0.1364, large: false, why: "comfortable body text" },
  { l1: 0.8965, l2: 0.1628, large: false, why: "misses 4.5 by six hundredths" },
  { l1: 0.7469, l2: 0.0957, large: true,  why: "large text clears its lower AAA bar" },
  { l1: 0.7489, l2: 0.2018, large: true,  why: "large text, AA only" },
  { l1: 0.6571, l2: 0.1974, large: true,  why: "fails even the softer large-text bar" },
  { l1: 0.85,   l2: 0.15,   large: false, why: "exactly 4.5 — the inclusive edge of AA" },
  { l1: 0.85,   l2: 0.15,   large: true,  why: "same 4.5, large text — the very same ratio is AAA" },
];

const f4 = (x) => x.toFixed(4);
const f2 = (x) => x.toFixed(2);

// Paint a neutral grey whose relative luminance is L. For a grey all three
// channels are equal and the luminance weights sum to 1, so the linear channel IS
// L; this just undoes the gamma encoding to get a displayable byte. Rendering
// only — turning colour into luminance is #354's subject, not this one's.
function greyOf(L) {
  const c = L <= 0.0031308 ? 12.92 * L : 1.055 * Math.pow(L, 1 / 2.4) - 0.055;
  const v = Math.round(Math.min(1, Math.max(0, c)) * 255);
  return `rgb(${v},${v},${v})`;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cr2-wrap { display:flex; flex-direction:column; gap:14px; max-width:760px; }
    .cr2-srow { display:grid; grid-template-columns:96px 1fr 74px 30px; align-items:center; gap:10px; }
    .cr2-slab { font:700 12px var(--mono); color:var(--muted); }
    .cr2-slab b { color:var(--accent); }
    .cr2-sl { width:100%; accent-color:var(--accent); }
    .cr2-sval { font:800 14px var(--mono); font-variant-numeric:tabular-nums; color:var(--text); text-align:right; }
    .cr2-swatch { width:26px; height:26px; border-radius:6px; border:1px solid var(--border); }

    .cr2-sample { border:1px solid var(--border); border-radius:12px; padding:14px 16px;
                  display:flex; flex-direction:column; gap:6px; }
    .cr2-sample .lg { font:700 24px var(--sans); }
    .cr2-sample .sm { font:400 15px var(--sans); }
    .cr2-sample .dim { opacity:.4; }

    .cr2-eq { display:flex; align-items:center; gap:9px; flex-wrap:wrap;
              font:600 15px var(--mono); border:1px solid var(--border); border-radius:12px;
              padding:13px 15px; background:var(--panel); }
    .cr2-eq b { font-weight:800; color:var(--text); }
    .cr2-flare { color:var(--accent); font-weight:800;
                 background:color-mix(in srgb,var(--accent) 14%,transparent);
                 border-radius:5px; padding:1px 5px; }
    .cr2-op { color:var(--muted); }
    .cr2-ratio { margin-left:auto; font:800 30px var(--mono); color:var(--accent);
                 font-variant-numeric:tabular-nums; }

    .cr2-alt { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap;
               font:12.5px var(--mono); color:var(--muted); padding:7px 10px;
               border:1px dashed var(--border); border-radius:9px; }
    .cr2-alt .lab { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; }
    .cr2-alt b { color:var(--text); }
    .cr2-alt.blown { border-color:var(--danger); color:var(--danger); }
    .cr2-alt.blown b { color:var(--danger); }

    .cr2-scale { position:relative; height:26px; border-radius:8px; overflow:hidden;
                 border:1px solid var(--border); display:flex; }
    .cr2-zone { height:100%; }
    .cr2-zone.fail { background:color-mix(in srgb,var(--danger) 34%,transparent); }
    .cr2-zone.aa   { background:color-mix(in srgb,var(--warn) 34%,transparent); }
    .cr2-zone.aaa  { background:color-mix(in srgb,var(--good) 34%,transparent); }
    .cr2-head { position:absolute; top:0; bottom:0; width:2px; background:var(--text); z-index:2; }
    .cr2-ticks { position:relative; height:15px; font:10px var(--mono); color:var(--muted); }
    .cr2-tick { position:absolute; transform:translateX(-50%); }

    .cr2-out { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  `));
}

function mount(host) {
  ensureStyle();
  let l1 = CASES[1].l1, l2 = CASES[1].l2, large = CASES[1].large;

  // Preset chips — all six official cases plus the two boundary ones.
  const chips = el("div", "controls");
  const chipEls = CASES.map((c, i) => {
    const b = el("button", "chip", `${c.l1} / ${c.l2} · ${c.large ? "large" : "normal"}`);
    b.title = c.why;
    b.onclick = () => { l1 = c.l1; l2 = c.l2; large = c.large; sync(); };
    chips.append(b);
    return b;
  });

  // The second axis. Same luminances, different bar — case 7 vs 8 is that alone.
  const sizeCtl = el("div", "controls");
  sizeCtl.append(el("span", "ctl-label", "text size"));
  const sizeEls = [false, true].map((v) => {
    const b = el("button", "chip", v ? "large text" : "normal text");
    b.onclick = () => { large = v; sync(); };
    sizeCtl.append(b);
    return b;
  });

  const wrap = el("div", "cr2-wrap");

  // Two sliders over the whole 0–1 luminance space. The spec promises l1 is the
  // lighter one, so the pair is kept ordered rather than allowed to cross — that
  // promise is exactly why the solution needs no Math.max/Math.min.
  const mkSlider = (key, label) => {
    const row = el("div", "cr2-srow");
    const lab = el("div", "cr2-slab", label);
    const sl = el("input", "cr2-sl"); sl.type = "range"; sl.min = "0"; sl.max = "1"; sl.step = "0.0001";
    const val = el("div", "cr2-sval");
    const sw = el("div", "cr2-swatch");
    sl.oninput = () => {
      const v = +sl.value;
      if (key === "l1") { l1 = v; if (l2 > l1) l2 = l1; }
      else { l2 = v; if (l1 < l2) l1 = l2; }
      sync();
    };
    row.append(lab, sl, val, sw);
    wrap.append(row);
    return { sl, val, sw };
  };
  const s1 = mkSlider("l1", `<b>l1</b> lighter`);
  const s2 = mkSlider("l2", `<b>l2</b> darker`);

  // The one-click version of the whole lesson.
  const jump = el("div", "controls");
  const toBlack = el("button", "chip", "drag l2 → 0 (pure black)");
  toBlack.onclick = () => { l2 = 0; sync(); };
  const toEqual = el("button", "chip", "l2 → l1 (no contrast at all)");
  toEqual.onclick = () => { l2 = l1; sync(); };
  jump.append(toBlack, toEqual);

  const sample = el("div", "cr2-sample");
  const eq = el("div", "cr2-eq");
  const alt = el("div", "cr2-alt");
  const scale = el("div", "cr2-scale");
  const ticks = el("div", "cr2-ticks");
  const out = el("div", "cr2-out");
  const ladder = el("div", "ladder");
  const note = el("div", "note");

  wrap.append(jump, sample, eq, alt, scale, ticks, out, ladder, note);
  host.append(chips, sizeCtl, wrap);
  sync();

  function sync() {
    const lighter = l1 + FLARE, darker = l2 + FLARE;
    const ratio = lighter / darker;
    const rating = rate(ratio, large);
    const aaaBar = large ? BAR.AAA[1] : BAR.AAA[0];
    const aaBar = large ? BAR.AA[1] : BAR.AA[0];

    s1.sl.value = l1; s2.sl.value = l2;
    s1.val.textContent = f4(l1); s2.val.textContent = f4(l2);
    s1.sw.style.background = greyOf(l1); s2.sw.style.background = greyOf(l2);
    sizeEls.forEach((b, i) => b.classList.toggle("on", (i === 1) === large));
    chipEls.forEach((b, i) => b.classList.toggle("on",
      CASES[i].l1 === l1 && CASES[i].l2 === l2 && CASES[i].large === large));

    // What the numbers actually look like as text on a background.
    sample.style.background = greyOf(l1);
    sample.style.color = greyOf(l2);
    sample.innerHTML =
      `<div class="lg${large ? "" : " dim"}">Large text — 24px bold</div>` +
      `<div class="sm${large ? " dim" : ""}">Normal text — the size the stricter bar is written for.</div>`;

    // The arithmetic, with the flare term left visible as its own term.
    eq.innerHTML =
      `<span>(<b>${f4(l1)}</b> <span class="cr2-flare">+ ${FLARE}</span>)</span>` +
      `<span class="cr2-op">÷</span>` +
      `<span>(<b>${f4(l2)}</b> <span class="cr2-flare">+ ${FLARE}</span>)</span>` +
      `<span class="cr2-op">=</span>` +
      `<span><b>${f4(lighter)}</b> ÷ <b>${f4(darker)}</b></span>` +
      `<span class="cr2-op">=</span>` +
      `<span class="cr2-ratio">${f2(ratio)}</span>`;

    // Same sum, flare removed. This is the row the module exists for.
    const blown = l2 === 0;
    alt.className = "cr2-alt" + (blown ? " blown" : "");
    alt.innerHTML = blown
      ? `<span class="lab">without the +0.05</span>` +
        `<span><b>${f4(l1)} ÷ 0</b> = <b>∞</b> — black is luminance <b>0</b>, so the bare quotient has no value at all. ` +
        `The flare term is the entire reason this input returns <b>${f2(ratio)}</b> instead of crashing.</span>`
      : `<span class="lab">without the +0.05</span>` +
        `<span>${f4(l1)} ÷ ${f4(l2)} = <b>${f2(l1 / l2)}</b> — usable here, but only because l2 happens not to be 0. ` +
        `Drag l2 to the floor and this column stops existing.</span>`;

    // Log scale: the ratio lives in [1, 21] and the interesting thresholds all
    // sit in its bottom third, so a linear bar would bunch them together.
    const pos = (r) => Math.max(0, Math.min(100, (Math.log(r) / Math.log(MAX_RATIO)) * 100));
    scale.innerHTML =
      `<div class="cr2-zone fail" style="width:${pos(aaBar)}%"></div>` +
      `<div class="cr2-zone aa" style="width:${pos(aaaBar) - pos(aaBar)}%"></div>` +
      `<div class="cr2-zone aaa" style="width:${100 - pos(aaaBar)}%"></div>` +
      `<div class="cr2-head" style="left:${pos(ratio)}%"></div>`;
    ticks.innerHTML = [1, aaBar, aaaBar, MAX_RATIO]
      .map((t) => `<div class="cr2-tick" style="left:${pos(t)}%">${t}</div>`).join("");

    out.innerHTML =
      `<span class="badge ${rating === "Fail" ? "no" : "ok"}">${rating}</span>` +
      `<span class="tag">ratio ${f2(ratio)} : 1</span>` +
      `<span class="tag">${large ? "large text" : "normal text"}</span>` +
      `<span class="muted mono" style="font-size:12.5px">getContrastRating(${l1}, ${l2}, ${large})</span>`;

    ladder.innerHTML =
      `<div class="rung${rating === "AAA" ? " on" : ""}"><span>AAA</span><span class="v">ratio ≥ ${aaaBar}</span></div>` +
      `<div class="rung${rating === "AA" ? " on" : ""}"><span>AA</span><span class="v">ratio ≥ ${aaBar}</span></div>` +
      `<div class="rung${rating === "Fail" ? " on" : ""}"><span>Fail</span><span class="v">ratio &lt; ${aaBar}</span></div>`;

    // Why a ratio and not a difference: hold the gap fixed, slide both ends down
    // to the floor, and the same gap buys a completely different ratio.
    const gap = l1 - l2;
    const best = (gap + FLARE) / FLARE;
    note.innerHTML = l2 === l1
      ? `Both luminances are identical, so the quotient is exactly <b>1</b> — and 1 is the <b>floor</b> of this scale, not 0. That is what makes it a ratio: two values can be no less than "the same".`
      : `These two are <b>${f4(gap)}</b> apart. Slide both ends down until the darker one hits 0 and that <i>same</i> gap yields ` +
        `<code class="inl">(${f4(gap)} + ${FLARE}) ÷ ${FLARE}</code> = <b>${f2(best)}</b>` +
        (l2 === 0 ? ` — which is where you already are, so this pair is the most a gap that size can be worth.`
                  : `, against <b>${f2(ratio)}</b> here. A difference of ${f4(gap)} is worth far more down in the shadows than up in the highlights, which is exactly why the spec divides instead of subtracting.`);
  }
}

const CODE = `function getContrastRating(l1: number, l2: number, isLargeText: boolean): string {
  // l1 is promised to be the lighter luminance, so there is nothing to normalise.
  // The +${FLARE} on BOTH sides models the ambient light a real screen reflects —
  // and it is the only thing standing between a pure-black l2 (relative
  // luminance 0) and a division by zero.
  const lighter = l1 + ${FLARE};
  const darker = l2 + ${FLARE};
  const ratio = lighter / darker;   // a RATIO, so it can never drop below 1
  const aaa = isLargeText ? ${BAR.AAA[1]} : ${BAR.AAA[0]};
  const aa = isLargeText ? ${BAR.AA[1]} : ${BAR.AA[0]};
  if (ratio >= aaa) return "AAA";   // "${BAR.AAA[0]}.0+" — inclusive
  if (ratio >= aa) return "AA";
  return "Fail";                    // "below ${BAR.AA[0]}" — exclusive
}`;

// ── STEP — one frame, no recursion. The two flare-adjusted terms are the only
// live structure worth drawing, so they enter the panel as the lines that build
// them run and stay for the rest of the call. ───────────────────────────────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getContrastRating</span>(<span class="tok" data-t="param">l1, l2, isLargeText</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> lighter = <span class="tok" data-t="lt">l1 + 0.05</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> darker  = <span class="tok" data-t="dk">l2 + 0.05</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> ratio = <span class="tok" data-t="div">lighter / darker</span>;` },
  { ln: 5,  html: `  <span class="k">const</span> aaa = <span class="tok" data-t="baaa">isLargeText ? 4.5 : 7</span>;` },
  { ln: 6,  html: `  <span class="k">const</span> aa  = <span class="tok" data-t="baa">isLargeText ? 3 : 4.5</span>;` },
  { ln: 7,  html: `  <span class="k">if</span> (<span class="tok" data-t="caaa">ratio &gt;= aaa</span>) <span class="k">return</span> <span class="st">"AAA"</span>;` },
  { ln: 8,  html: `  <span class="k">if</span> (<span class="tok" data-t="caa">ratio &gt;= aa</span>) <span class="k">return</span> <span class="st">"AA"</span>;` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="fail"><span class="st">"Fail"</span></span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { l1, l2, large, why } = CASES[idx];
  const steps = [];
  let lighter, darker, ratio, aaa, aa;

  const S = (line, note, x = {}) => {
    const vars = { l1, l2, isLargeText: large };
    if (line >= 2) vars.lighter = f4(lighter);
    if (line >= 3) vars.darker = f4(darker);
    if (line >= 4) vars.ratio = f4(ratio);
    if (line >= 5) vars.aaa = aaa;
    if (line >= 6) vars.aa = aa;
    // The pair being divided: it comes into being one term at a time and then
    // stays, because both are still in scope right through the comparisons.
    const structs = [];
    if (line >= 2) {
      const items = [`l1 + 0.05 = ${f4(lighter)}`];
      if (line >= 3) items.push(`l2 + 0.05 = ${f4(darker)}`);
      structs.push({ label: "divide these", items, newest: !!x.newest });
    }
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getContrastRating", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Case ${idx + 1} — <b>getContrastRating(${l1}, ${l2}, ${large})</b>: ${why}. Two <b>relative luminances</b> arrive, already ordered — the spec guarantees <b>l1</b> is the lighter one, which is why no <code class='inl'>Math.max</code> appears anywhere below.`,
    { focus: "param", changed: ["l1", "l2", "isLargeText"] });

  lighter = l1 + FLARE;
  S(2, `Nudge the lighter value up by <b>0.05</b> → <b>${f4(lighter)}</b>. That constant is not a fudge: no real screen is ever as dark as its pixel value claims, because the glass reflects whatever light is in the room. Both sides get it, so it is a floor, not a bias.`,
    { focus: "lt", changed: ["lighter"], newest: true });

  darker = l2 + FLARE;
  S(3, l2 === 0
      ? `Now the darker value — and this is the one that matters. <b>l2 = 0</b> is pure black, so the next line would be dividing by <b>zero</b>. Adding 0.05 makes the divisor <b>${f4(darker)}</b>, and the whole formula stays finite.`
      : `Same 0.05 on the darker value → <b>${f4(darker)}</b>. This is the <b>divisor</b>, so it is the term that can break things: any luminance can legitimately be 0, and only this constant keeps that from being fatal.`,
    { focus: "dk", changed: ["darker"], newest: true });

  ratio = lighter / darker;
  S(4, `Divide: <b>${f4(lighter)} ÷ ${f4(darker)} = ${f4(ratio)}</b>. A quotient rather than a subtraction because contrast is judged <b>multiplicatively</b> — and because both terms are now trapped between 0.05 and 1.05, the answer can never leave <b>1 … ${MAX_RATIO}</b>. That bounded scale is what the rating table is written against.`,
    { focus: "div", changed: ["ratio"] });

  aaa = large ? BAR.AAA[1] : BAR.AAA[0];
  S(5, `Pick the AAA bar for this text size: <b>${aaa}</b> — the <b>${large ? "large" : "normal"}</b>-text column of the table <b>#352</b> walks through, which is where the two columns and the gap between them are argued. Note what does <i>not</i> happen here: the ratio computed above is untouched. Only the bar it is measured against moves.`,
    { focus: "baaa", changed: ["aaa"] });

  aa = large ? BAR.AA[1] : BAR.AA[0];
  S(6, `And the AA bar: <b>${aa}</b>. Two numbers is the whole of day one's table; from here it is a strongest-first cascade.`,
    { focus: "baa", changed: ["aa"] });

  const hitAAA = ratio >= aaa;
  S(7, `Test the strictest rung first: is <b>${f4(ratio)} ≥ ${aaa}</b>? → <b>${hitAAA}</b>. An inclusive <code class='inl'>&gt;=</code>, from the same "<b>${aaa}+</b>" table <b>#352</b> walks through.`,
    { focus: "caaa", eval: { expr: `${f4(ratio)} >= ${aaa}`, val: hitAAA } });
  if (hitAAA) {
    S(7, `It clears AAA, so <b>return "AAA"</b> and stop — the lower rungs cannot say anything better.`,
      { focus: "caaa", done: true, result: `"AAA"`, ret: { value: `"AAA"` } });
    return steps;
  }

  const hitAA = ratio >= aa;
  S(8, `AAA is out, so try AA: is <b>${f4(ratio)} ≥ ${aa}</b>? → <b>${hitAA}</b>. Only reachable because the line above already failed, so the ladder needs no upper bound here.`,
    { focus: "caa", eval: { expr: `${f4(ratio)} >= ${aa}`, val: hitAA } });
  if (hitAA) {
    S(8, `<b>Return "AA"</b> — good enough to read, short of the strictest grade.`,
      { focus: "caa", done: true, result: `"AA"`, ret: { value: `"AA"` } });
    return steps;
  }

  S(9, `Both rungs missed, so <b>return "Fail"</b>. "Below ${aa}" is <b>exclusive</b> — the only way to get here is to be strictly under the bar, which is why the two <code class='inl'>&gt;=</code> tests above need no companion <code class='inl'>&lt;</code>.`,
    { focus: "fail", done: true, result: `"Fail"`, ret: { value: `"Fail"` } });
  return steps;
}

export default {
  n: 353, id: "contrast2", title: "Contrast Rating 2", dates: ["2026-07-29"],
  statement: `Given two <b>relative luminance</b> values — <code class="inl">l1</code> always the lighter, <code class="inl">l2</code> the darker — and whether the text is large, return the WCAG rating. Add <b>0.05</b> to each luminance, divide the lighter by the darker, then read the ratio off the table: <b>AAA</b> at 7.0+ (4.5+ for large text), <b>AA</b> at 4.5+ (3.0+), otherwise <b>Fail</b>. <span class="rule">Example: <code class="inl">getContrastRating(1.0, 0.0, false)</code> → <b>"AAA"</b> — white on black is <code class="inl">1.05 / 0.05</code> = <b>21</b>, the largest ratio the formula can produce. Without the two 0.05s it would be a division by zero. Day 2 of a three-day series: <b>#352</b> owns the rating table these two bars are read off, and <b>#354</b> starts a stage earlier still, from two RGB triples it must gamma-correct into the luminances handed over here.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1)",
      approach: `Two additions, one division, two comparisons. The interesting character is <b>0.05</b>: relative luminance runs 0–1 and black really is <b>0</b>, so <code class='inl'>l1 / l2</code> would be undefined on the most common pairing there is. Adding the constant to <b>both</b> sides floors the divisor without favouring either value, and it has a physical meaning — screens reflect ambient light, so nothing is ever truly at 0. It also bounds the whole scale: the smallest possible quotient is <b>1</b> (identical luminances) and the largest is <code class='inl'>1.05 / 0.05</code> = <b>21</b>. And it is a <b>ratio</b> rather than <code class='inl'>l1 − l2</code> because contrast is perceived multiplicatively — the same gap is worth far more between two dark values than between two bright ones. Drag <b>l2</b> to 0 and watch the divisor stop at 0.05 instead of vanishing. This is the middle day of three: <b>#354</b> computes these two luminances from raw RGB, and <b>#352</b> takes the ratio produced here and reads it off the threshold table.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Run the formula one line at a time on any of the eight cases. Watch the two <b>+0.05</b> terms enter the panel one at a time, the division bound the result into <b>1 … 21</b>, and the two bars swap when <code class='inl'>isLargeText</code> is true. Case <b>1</b> is the one to start on — <code class='inl'>l2 = 0</code>, where line 3 is the difference between a rating and a divide-by-zero. Cases <b>7</b> and <b>8</b> are the same pair at both text sizes, sitting exactly on 4.5, so the <code class='inl'>&gt;=</code> is doing real work. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a case` } }),
    },
  ],
};
