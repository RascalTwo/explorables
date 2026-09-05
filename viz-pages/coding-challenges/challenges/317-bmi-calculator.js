// #317 · BMI Calculator — 703 is a unit conversion wearing a magic number's clothes.
// weight / height² is lb per square inch; ×703 is what turns that into kg/m², because
// 0.45359237 kg per pound ÷ (0.0254 m per inch)² is 703.06957…, which the spec rounds
// to 703. So the constant MULTIPLIES a ratio — weight / (height * height * 703) divides
// by it instead and is off by a factor of 703² ≈ half a million, while still looking
// like a plausible small number.
//
// Everything else is the rounding, and this module deliberately REUSES #359 Golf
// Handicap's apparatus rather than reinventing it — the same roundOne/scaledOne split,
// the same exactly() probe, the same "comparison row rather than a second tab" shape.
// Read those as a shared jig, not as a second derivation: #359 already established
// that `toFixed(1)` returns a STRING (=== fails every case) and that
// `Number(x.toFixed(1))` and `Math.round(x * 10) / 10` are not the same function, so
// neither claim is re-argued from scratch here. What IS new is WHERE the two part
// company when the value can never be negative. Over every integer pair
// weight 1–1000 lb × height 20–120 in, the only disagreement at a plausible BMI is a
// single value: 35.15, reached by any pair with w/h² = 0.05 exactly. That sweep holds
// ELEVEN such pairs (20/20 through 720/120); the five the demo's own sliders can reach
// — 60–400 lb × 40–90 in — are 80/40, 125/50, 180/60, 245/70 and 320/80, which is the
// list the demo note quotes. (The sweep splits on 13 further pairs, all at BMIs of 246
// and up, which is why "plausible" is doing real work in that sentence.)
// 180 × 703 / 3600 is exactly 35.15 in real arithmetic, an exact tie — and no double
// can hold 35.15, so `bmi` is really 35.149999999999998579. toFixed rounds THAT and
// says 35.1; bmi * 10 rounds back up to exactly 351.5 and Math.round says 35.2.
// Neither is lying about its own input, and the grader passes both 5/5 — the choice
// below is the module's, not freeCodeCamp's.
//
// ONE approach. There is no wasteful act to name: the arithmetic is four operations
// and no alternative does less of it, so a second tab could only be a bug in costume
// (CONTRIBUTING Tier 3). The Math.round alternative ships as a comparison row inside
// the demo, where it belongs — two graded variants must never disagree on an answer,
// and on case 7 these two do.
import { el, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader lists them.
// Cases 6–7 are invented. Every case sits somewhere different relative to the tenth it
// has to round to — that distance, not the input, is the branch:
//   1  180/70 → 25.824489…  0.0245 past the tenth       → rounds DOWN, comfortably
//   2  140/64 → 24.028320…  the answer is a WHOLE number → "24.0" has no decimal to see
//   3  160/76 → 19.473684…  0.0263 short of the tenth   → rounds UP, comfortably
//   4  200/60 → 39.055555…  0.0056 PAST the .05 midpoint → the official set's nearest
//                                                          approach to the boundary
//   5  150/68 → 22.804930…  0.0049 past the tenth       → the smallest correction here
//   6  185/74 → 23.75 exactly — a REAL tie, held exactly by the double. Both rounding
//              expressions send it up to 23.8, because for a positive value "half up"
//              and "half away from zero" are the same rule. This is the control.
//   7  180/60 → the split. Same height as case 4, 20 lb lighter. Exact value 35.15,
//              stored as 35.149999999999998579 → toFixed says 35.1, Math.round(×10)
//              says 35.2. The only such value in the whole plausible input space.
const CASES = [
  { weight: 180, height: 70, label: "180/70 · down" },
  { weight: 140, height: 64, label: "140/64 · whole" },
  { weight: 160, height: 76, label: "160/76 · up" },
  { weight: 200, height: 60, label: "200/60 · near .05" },
  { weight: 150, height: 68, label: "150/68 · barely" },
  { weight: 185, height: 74, label: "185/74 · real tie" },
  { weight: 180, height: 60, label: "180/60 · the split" },
];

// The last line of the solution, twice, so the demo and the trace share the one
// decision and cannot drift. The arithmetic above it stays inline in both, because
// both need to show the intermediates rather than just the answer.
const roundOne = (bmi) => Number(bmi.toFixed(1));       // what ships
const scaledOne = (bmi) => Math.round(bmi * 10) / 10;   // what most people reach for

// The exact conversion 703 stands in for: kg per pound ÷ (metres per inch)².
const EXACT_703 = 0.45359237 / (0.0254 * 0.0254);       // 703.06957963915931487

// Does the double sit exactly on the decimal it prints? 23.75 does; 35.15 cannot.
// The `\.?` is load-bearing: toPrecision(20) pads a whole-number BMI out to
// "19.000000000000000000", and stripping only the zeros leaves a dangling "19." — so
// without it, 148 lb at 74 in (BMI exactly 19) would be reported as inexact.
const exactly = (x) => x.toPrecision(20).replace(/\.?0+$/, "") === String(x);

// The two tenths the value falls between, plus the midpoint that decides it.
const bracket = (bmi) => {
  const lo = Math.floor(bmi * 10) / 10;
  return { lo, mid: (Math.floor(bmi * 10) + 0.5) / 10, hi: (Math.floor(bmi * 10) + 1) / 10 };
};

// The published adult bands, as numbers only. They exist here for one reason: they are
// stated to one decimal place, which is the precision this challenge asks for.
const BANDS = [
  { name: "Underweight", text: "below 18.5", hi: 18.5 },
  { name: "Normal", text: "18.5 – 24.9", hi: 25 },
  { name: "Overweight", text: "25.0 – 29.9", hi: 30 },
  { name: "Obesity", text: "30.0 and above", hi: Infinity },
];
const bandOf = (v) => BANDS.findIndex((b) => v < b.hi);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bmi-sl { display:grid; grid-template-columns:auto minmax(120px,1fr) auto; align-items:center; gap:12px; margin:6px 0; }
    .bmi-sl .bmi-k { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .bmi-sl .bmi-n { font:800 17px var(--mono); font-variant-numeric:tabular-nums; color:var(--text); white-space:nowrap; }
    .bmi-why { font:11.5px var(--mono); color:var(--muted); padding:2px 9px 6px; }
    .bmi-bits { font:11.5px var(--mono); color:var(--muted); opacity:.75; word-break:break-all; margin:8px 0 0; }
    .bmi-cmp { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:12px 0 0; }
    .bmi-c { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:14px; padding:11px 13px; font:12.5px var(--mono); }
    .bmi-c + .bmi-c { border-top:1px solid var(--border); }
    .bmi-c .bmi-v { font:800 22px var(--mono); font-variant-numeric:tabular-nums; }
    .bmi-lab { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .bmi-c.ship { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .bmi-c.ship .bmi-v, .bmi-c.ship .bmi-lab { color:var(--accent); }
    .bmi-c.other .bmi-v { color:var(--muted); }
    .bmi-c.other.split .bmi-v, .bmi-c.other.split .bmi-lab { color:var(--danger); }
    .bmi-bands { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:12px; }
    .bmi-b { border:1px solid var(--border); border-radius:8px; padding:6px 8px; background:var(--panel-2); }
    .bmi-b .bmi-bn { font:700 10px var(--sans); letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
    .bmi-b .bmi-bt { font:12.5px var(--mono); color:var(--muted); font-variant-numeric:tabular-nums; }
    .bmi-b.here { border-color:var(--accent); }
    .bmi-b.here .bmi-bn, .bmi-b.here .bmi-bt { color:var(--accent); }
  `));
}

function mount(host) {
  ensureStyle();
  // Open on official case 4 — 200 lb at 60 in, the official set's closest approach to a
  // .05 midpoint. Dragging weight down to 180 at the same height is one gesture and
  // lands on the boundary, so the split is something the reader walks into.
  let weight = CASES[3].weight, height = CASES[3].height;

  const chips = el("div", "controls");
  const chipEls = CASES.map((c) => {
    const chip = el("button", "chip", c.label);
    chip.onclick = () => { weight = c.weight; height = c.height; render(); };
    chips.append(chip);
    return chip;
  });

  const mkSlider = (key, unit, min, max, get, set) => {
    const row = el("div", "bmi-sl");
    const sl = el("input");
    sl.type = "range"; sl.min = min; sl.max = max; sl.step = 1; sl.value = get();
    const val = el("span", "bmi-n", `${get()} ${unit}`);
    sl.oninput = () => { set(+sl.value); render(); };
    row.append(el("span", "bmi-k", key), sl, val);
    return { row, sync: () => { sl.value = get(); val.textContent = `${get()} ${unit}`; } };
  };
  const wSl = mkSlider("weight", "lb", 60, 400, () => weight, (v) => { weight = v; });
  const hSl = mkSlider("height", "in", 40, 90, () => height, (v) => { height = v; });

  const out = el("div");
  host.append(
    el("div", "note", "Drag either slider and watch the four steps recompute. The last two rows are the same number rounded two different ways — they agree almost everywhere. <b>Five</b> integer pairs in this range make them disagree, and they all land on the same BMI: try <b>180 lb · 60 in</b>, or <b>125 · 50</b>, or <b>320 · 80</b>."),
    chips, wSl.row, hSl.row, out,
  );
  render();

  function render() {
    wSl.sync(); hSl.sync();
    chipEls.forEach((ch, i) => ch.classList.toggle("on", CASES[i].weight === weight && CASES[i].height === height));

    const hSq = height * height;
    const ratio = weight / hSq;
    const bmi = ratio * 703;
    const ship = roundOne(bmi), scaled = scaledOne(bmi);
    const split = !Object.is(ship, scaled);
    const { lo, mid, hi } = bracket(bmi);

    out.innerHTML = "";

    // ── the arithmetic, one labelled rung per operation. The ×703 rung says what it
    // converts, because that is the only thing in the formula that isn't obvious.
    const lad = el("div", "ladder");
    const rung = (on, expr, val) => {
      const r = el("div", "rung" + (on ? " on" : ""));
      r.append(el("span", null, expr), el("span", "v", val));
      lad.append(r);
    };
    rung(false, "height × height", `${height} × ${height} = <b>${hSq}</b> in²`);
    rung(false, "weight ÷ height²", `${weight} ÷ ${hSq} = <b>${ratio}</b> lb/in²`);
    rung(true, "× 703", `<b>${bmi}</b> kg/m²`);
    lad.append(el("div", "bmi-why", `703 is the unit conversion, not part of the ratio: 0.45359237 kg per lb ÷ (0.0254 m per in)² = <b>${EXACT_703.toFixed(4)}</b>, which the spec rounds to 703. Multiply by it — <code class='inl'>weight / (height * height * 703)</code> divides instead and lands ${(703 * 703).toLocaleString("en-US")}× low.`));
    rung(false, "Number(bmi.toFixed(1))", `<b>${ship}</b>`);
    out.append(lad);

    // The raw double sits beside the rounded answer, so the rounding is a visible act
    // rather than something the formula quietly did on the way out.
    const line = el("div", "result-line");
    line.append(
      el("span", "muted mono", `raw ${bmi}`),
      el("span", "big mono", String(ship)),
      el("span", "tag", "kg/m²"));
    out.append(line);

    // What the double actually holds, whenever that differs from what it prints.
    out.append(el("div", "bmi-bits", exactly(bmi)
      ? `the double holds <b>${bmi}</b> exactly — a decision about this value is a decision about a real number`
      : `it prints as ${bmi}, but the double actually holds <b>${bmi.toPrecision(20)}</b> — that, not the decimal above it, is the number <code class='inl'>toFixed</code> rounds`));

    const cmp = el("div", "bmi-cmp");
    const rowOf = (cls, expr, val, tag) => {
      const r = el("div", "bmi-c " + cls);
      r.append(el("div", null, expr), el("div", "bmi-lab", tag), el("div", "bmi-v", String(val)));
      cmp.append(r);
    };
    rowOf("ship", "Number(bmi.toFixed(1))", ship, "returned");
    rowOf("other" + (split ? " split" : ""), "Math.round(bmi * 10) / 10", scaled, split ? "disagrees" : "agrees");
    out.append(cmp);

    // A tie is only REAL if the double itself sits on the midpoint. `bmi * 10` can land
    // on a .5 the value never had — which is the whole of the split below.
    const scaledTie = Math.abs((bmi * 10) % 1) === 0.5;
    const realTie = scaledTie && exactly(bmi);
    // Integer arithmetic, so this is a fact rather than a float comparison: is the exact
    // rational weight×703/height² the midpoint itself?
    const exactIsMid = weight * 703 * 100 === Math.round(mid * 100) * hSq;
    out.append(el("div", "note", split
      ? `${exactIsMid ? `The exact value of ${weight} × 703 ÷ ${hSq} is <b>${mid}</b> — a real tie, and one no binary double can hold. The nearest double is` : `The double holds`} <b>${bmi.toPrecision(20)}</b>, which sits <i>${bmi < mid ? "below" : "above"}</i> the midpoint ${mid}, so <code class='inl'>toFixed(1)</code> reports <b>${ship}</b>. Then <code class='inl'>bmi * 10</code> lands on exactly ${bmi * 10}, back <i>on</i> the midpoint, and <code class='inl'>Math.round</code> takes that tie upward to <b>${scaled}</b>. Two different questions, each answered correctly; only one of them is "the nearest tenth of the number I have".`
      : realTie
        ? `A real tie: the double holds <b>${bmi}</b> on the nose, exactly halfway between ${lo.toFixed(1)} and ${hi.toFixed(1)}. Both expressions send it <b>up</b> to <b>${ship}</b> — for a positive value "half up" and "half away from zero" are the same rule, which is why a tie on its own is not what separates them.`
        : scaledTie
          ? `<code class='inl'>bmi * 10</code> lands on exactly ${bmi * 10}, a midpoint the value never had — the double is <b>${bmi.toPrecision(20)}</b>, clear of ${mid}. Here both expressions still answer <b>${ship}</b>, so the manufactured tie costs nothing. It does not always.`
          : `No boundary in sight: the value sits <b>${Math.min(bmi - lo, hi - bmi).toFixed(4)}</b> from its nearest tenth, so every rounding expression agrees on <b>${ship}</b>. That is why the trap survives — almost nothing reaches a midpoint. Hit the <b>180/60 · the split</b> chip for the one BMI in this range that does.`));

    // The published bands, as numbers. They are here because they are quoted to one
    // decimal place — the same precision the return value is specified in.
    const here = bandOf(ship);
    const bands = el("div", "bmi-bands");
    BANDS.forEach((b, i) => {
      const box = el("div", "bmi-b" + (i === here ? " here" : ""));
      box.append(el("div", "bmi-bn", b.name), el("div", "bmi-bt", b.text));
      bands.append(box);
    });
    out.append(bands);
    out.append(el("div", "note", `The published adult bands above are quoted to <b>one decimal place</b>, which is exactly the precision the spec asks for — the tenth is the unit the numbers are written in, so it is the unit the answer has to be correct to. And <code class='inl'>bmi.toFixed(1)</code> on its own is the <b>string</b> <code class='inl'>"${bmi.toFixed(1)}"</code>; the grader asserts with <code class='inl'>===</code>, so without <code class='inl'>Number()</code> all five official cases fail — including <b>140/64</b>, whose answer is a whole number and looks like it was never rounded at all.`));
  }
}

// ── STEP — square, divide, convert, round. Four operations and one decision. ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">calculateBmi</span>(<span class="tok" data-t="params">weight, height</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> heightSquared = <span class="tok" data-t="sq">height * height</span>;` },
  { ln: 3, html: `  <span class="k">const</span> ratio = <span class="tok" data-t="ratio">weight / heightSquared</span>;` },
  { ln: 4, html: `  <span class="k">const</span> bmi = <span class="tok" data-t="conv">ratio * <span class="nu">703</span></span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="num"><span class="fn">Number</span></span>(<span class="tok" data-t="fixed">bmi.<span class="fn">toFixed</span>(<span class="nu">1</span>)</span>);` },
  { ln: 6, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { weight, height } = CASES[k - 1];
  const steps = [];
  let heightSquared = null, ratio = null, bmi = null;

  const S = (line, note, x = {}) => {
    const vars = { weight, height };
    if (line >= 2 && heightSquared !== null) vars.heightSquared = heightSquared;
    if (line >= 3 && ratio !== null) vars.ratio = ratio;
    if (line >= 4 && bmi !== null) vars.bmi = bmi;
    const structs = [];
    // The two tenths the answer must land on only become a question once `bmi` exists,
    // so the panel has nothing to show before line 4 — and from there it stays.
    if (line >= 4 && bmi !== null) {
      const b = bracket(bmi);
      structs.push({ label: "nearest tenths", items: [b.lo.toFixed(1), b.mid.toFixed(2), b.hi.toFixed(1)] });
    }
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `calculateBmi(${weight}, ${height})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Two numbers in <b>two different units</b> — ${weight} pounds and ${height} inches — and the answer is expected in a third, kg/m². Nothing in the signature says so, which is why the 703 on line 4 looks arbitrary until you know what it is doing.`,
    { focus: "params" });

  heightSquared = height * height;
  S(2, `<b>${height} × ${height} = ${heightSquared}</b> square inches. Squaring first is the whole idea of the index: BMI compares mass against <b>area</b>, so that a taller frame is not penalised simply for being longer. Naming it also makes the classic slip unwriteable — <code class='inl'>weight / height * height</code> divides and then multiplies back, returning ${(weight / height * height).toPrecision(6)} instead.`,
    { focus: "sq", changed: ["heightSquared"] });

  ratio = weight / heightSquared;
  S(3, `<b>${weight} ÷ ${heightSquared} = ${ratio}</b> — pounds per square inch. It is a real quantity, but it is not BMI and it is not close to BMI; every human value is a fraction under one tenth. Whatever line 4 does, it has to move this by three orders of magnitude.`,
    { focus: "ratio", changed: ["ratio"] });

  bmi = ratio * 703;
  S(4, `<b>${ratio} × 703 = ${bmi}</b>. 703 is a <b>unit conversion</b>: one pound is 0.45359237 kg and one inch is 0.0254 m, so lb/in² becomes kg/m² by multiplying by 0.45359237 ÷ 0.0254², which is <b>${EXACT_703.toFixed(5)}</b> — the spec's 703 is that, rounded. It <b>multiplies</b> a ratio, so folding it into the divisor as <code class='inl'>weight / (height * height * 703)</code> inverts it: ${(weight / (heightSquared * 703)).toExponential(3)}, a small plausible-looking number that is wrong by 703².`,
    { focus: "conv", changed: ["bmi"] });

  const fixed = bmi.toFixed(1);
  const ship = Number(fixed);
  const scaled = scaledOne(bmi);
  const split = !Object.is(ship, scaled);
  const b = bracket(bmi);

  S(5, `<b>toFixed(1)</b> has to choose between <b>${b.lo.toFixed(1)}</b> and <b>${b.hi.toFixed(1)}</b>, and the midpoint is ${b.mid.toFixed(2)}. ${exactly(bmi)
    ? `The double holds <b>${bmi}</b> exactly${(bmi * 10) % 1 === 0.5 ? `, sitting <i>on</i> that midpoint — a genuine tie, which toFixed breaks away from zero and therefore, for a positive value, upward` : `, well clear of it`} → <b>"${fixed}"</b>.`
    : `The double holds <b>${bmi.toPrecision(20)}</b>, ${bmi < b.mid ? "below" : "above"} the midpoint → <b>"${fixed}"</b>.`} ${split
      ? `Here <code class='inl'>Math.round(bmi * 10) / 10</code> says <b>${scaled}</b> instead: <code class='inl'>bmi * 10</code> is exactly ${bmi * 10}, because the multiply's own rounding error pushes the value back <i>onto</i> the midpoint it was just ${bmi < b.mid ? "below" : "above"}. Rounding a scaled copy is not rounding the value — #359 Golf Handicap makes the same point from the other side, with negative numbers. This is the only BMI in the plausible range where the two split, and 180/60 is the case that finds it.`
      : `<code class='inl'>Math.round(bmi * 10) / 10</code> agrees at <b>${scaled}</b>, as it does on all five official cases. Load <b>case 7</b> for the one input that separates them.`}`,
    { focus: "fixed", eval: { expr: `Math.round(bmi * 10) / 10 === ${ship}`, val: !split } });

  S(5, `<b>Number("${fixed}")</b> → <b>${ship}</b>. The wrapper is the difference between passing and failing every single case: <code class='inl'>toFixed</code> hands back a <b>string</b>, the grader asserts <code class='inl'>calculateBmi(${weight}, ${height}) === ${ship}</code>, and <code class='inl'>"${fixed}" === ${ship}</code> is <b>false</b>${Number.isInteger(ship) ? ` — most visibly here, where the answer is a whole number and "${fixed}" carries a decimal the return value does not` : ``}.`,
    { focus: "num", done: true, result: ship, ret: { value: ship } });

  return steps;
}

export default {
  n: 317, id: "bmi", title: "BMI Calculator", dates: ["2026-06-23"],
  statement: `Given a <b>weight in pounds</b> and a <b>height in inches</b>, return the BMI (Body Mass Index) <b>rounded to one decimal place</b>. Divide the weight by the height squared, then multiply the result by <b>703</b>. <span class="rule">Example: <code class="inl">calculateBmi(180, 70)</code> — 180 ÷ 70² = 0.0367346…, × 703 = 25.8244… → <b>25.8</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — four operations",
      approach: `Square the height, divide, multiply by 703, round. The only place to go wrong in the arithmetic is <b>where the constant attaches</b>: 703 multiplies the <i>ratio</i>, so <code class='inl'>weight / (height * height * 703)</code> divides by it and is wrong by a factor of 703² — a small, plausible-looking number rather than an obvious blow-up.<br><br><b>What 703 is.</b> BMI is defined as kg/m². A pound is 0.45359237 kg and an inch is 0.0254 m, so lb/in² converts by 0.45359237 ÷ 0.0254² = <b>703.06957…</b>. The spec's 703 is that constant rounded — the formula is a unit conversion baked into a magic number, and naming it is most of understanding the problem.<br><br><b>Then the tenth.</b> <code class='inl'>toFixed(1)</code> returns a <b>string</b> and fails a <code class='inl'>===</code> grader on all five cases, so <code class='inl'>Number()</code> is load-bearing. Which rounding expression you wrap is the module's own call, not the grader's: all five official cases pass with either. Over every integer pair from 1–1000 lb × 20–120 in, exactly one plausible BMI separates them — <b>35.15</b>, reached by any pair with w/h² = 0.05, of which five sit inside this demo's sliders (180/60, plus 80/40, 125/50, 245/70 and 320/80). Its exact value <i>is</i> the midpoint, and no double can hold it: <code class='inl'>bmi</code> is 35.14999999999999858, so <code class='inl'>toFixed</code> says 35.1 while <code class='inl'>bmi * 10</code> rounds back onto 351.5 and <code class='inl'>Math.round</code> says 35.2. <code class='inl'>Number(bmi.toFixed(1))</code> ships because it rounds the number the function actually holds, once — the alternative rounds a copy that has already been rounded, and #359 Golf Handicap shows the same mechanism producing an answer that is simply wrong.`,
      code: `// BMI is defined as kg/m². This function is handed lb and in, so 703 is not a
// magic number — it is the unit conversion 0.45359237 / 0.0254**2 = 703.06957…,
// rounded. It multiplies the RATIO: weight / (height * height * 703) divides by
// it instead, and is wrong by a factor of 703**2 while still looking plausible.
function calculateBmi(weight: number, height: number): number {
  const heightSquared = height * height;
  const ratio = weight / heightSquared;   // pounds per square inch
  const bmi = ratio * 703;                // now kg/m²

  // Round the value the function is holding, once, at the end — not a scaled copy
  // of it. And Number() is not cosmetic: toFixed returns a string, the grader
  // asserts with ===, so returning "25.8" fails every case.
  return Number(bmi.toFixed(1));
}`,
      mount,
    },
    {
      name: "Step through", cost: "the rounding step",
      approach: `Five lines, and the first four are only there to make the last one honest. Watch <code class='inl'>heightSquared</code>, <code class='inl'>ratio</code> and <code class='inl'>bmi</code> appear one line at a time — each note names the mistake that line exists to prevent, including the two ways the arithmetic can be re-associated into something that still returns a number.<br><br>From line 4 the state panel carries the <b>nearest tenths</b>: the two candidates and the midpoint between them. It opens on <b>case 7</b> — 180 lb at 60 in — where the exact answer <i>is</i> that midpoint, 35.15, and the double cannot hold it. Step to line 5 and the condition panel goes red: the two rounding expressions return different numbers. Load <b>case 6</b> (a real tie, 23.75) and it goes green, which is the point — a tie is not what breaks them. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 7, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
