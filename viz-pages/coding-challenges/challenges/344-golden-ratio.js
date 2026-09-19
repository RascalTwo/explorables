// #344 · Golden Ratio — normalise the orientation, then never compare floats with ===.
// Two ideas, both easy to miss. First, "their ratio" has no direction: the grader
// passes (1618, 1000) as well as (21, 34), so divide max by min and the argument
// order stops mattering. Second, "approximates" is the entire point — 34/21 is
// 1.61904…, which no equality test will ever match. The tolerance turns one number
// into a band, and every such problem is really |value − target| <= epsilon.
// The invented edge presets add the third lesson the official set never reaches:
// the two inputs exactly ±0.01 from φ return DIFFERENT answers, because binary
// floating point rounds one drift down and the other up. Bands, not boundaries.
import { el, esc, mountDebugger } from "../shared.js";

const PHI = 1.618, TOL = 0.01;

// Cases 1–6 are freeCodeCamp's official tests in the order the grader lists them.
// (4 and 6 both land on 1.6 — that duplication is the grader's, kept because the
// official set has to be reachable in full.)
//
// Cases 7–8 are invented, and they are the same input mirrored: 1628/1000 is φ
// plus exactly 0.01, 1608/1000 is φ minus exactly 0.01. On paper an inclusive
// tolerance admits both. Binary floating point admits only the first — 1.628 −
// 1.618 evaluates to 0.00999999999999979, while 1.618 − 1.608 evaluates to
// 0.01000000000000001. Nothing in the spec is asymmetric; the representation is.
// No official case goes near the edge, so without this pair the module would
// quietly imply the boundary is clean.
const CASES = [
  { a: 21,   b: 34,   label: "21, 34" },
  { a: 15,   b: 20,   label: "15, 20" },
  { a: 8,    b: 13,   label: "8, 13" },
  { a: 10,   b: 16,   label: "10, 16" },
  { a: 1618, b: 1000, label: "1618, 1000 · a > b" },
  { a: 88,   b: 55,   label: "88, 55 · a > b" },
  { a: 1000, b: 1628, label: "1000, 1628 · edge +0.01" },
  { a: 1000, b: 1608, label: "1000, 1608 · edge −0.01" },
];

// The solution itself — shared by the demo and the trace so they cannot drift.
const ratioOf = (a, b) => Math.max(a, b) / Math.min(a, b);
const isGolden = (a, b) => Math.abs(ratioOf(a, b) - PHI) <= TOL;

// Consecutive Fibonacci pairs converge on φ, so the ladder shows exactly where the
// sequence crosses into the band — and that two of the official "true" cases are
// simply the first two rungs that make it.
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55];

const LO = 1.35, HI = 1.9;                       // number-line window, wide enough for 1.5 and 1.75
const pct = (r) => Math.max(0, Math.min(100, ((r - LO) / (HI - LO)) * 100));
const fix = (x, n = 4) => Number(x.toFixed(n)).toString();

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .gr-line { position:relative; height:46px; margin:20px 0 6px; border-radius:9px;
               background:var(--panel-2); border:1px solid var(--border); }
    .gr-band { position:absolute; top:0; bottom:0; background:color-mix(in srgb, var(--good) 22%, transparent);
               border-left:1px solid var(--good); border-right:1px solid var(--good); }
    .gr-phi { position:absolute; top:0; bottom:0; width:2px; background:var(--good); }
    .gr-mark { position:absolute; top:-7px; bottom:-7px; width:3px; background:var(--danger); border-radius:2px; }
    .gr-mark.in { background:var(--accent); }
    .gr-mark span { position:absolute; top:-19px; left:50%; transform:translateX(-50%);
                    font:800 12px var(--mono); white-space:nowrap; color:inherit; }
    .gr-tick { position:absolute; top:100%; font:11px var(--mono); color:var(--muted);
               transform:translateX(-50%); padding-top:3px; }
    .gr-rects { display:flex; gap:22px; align-items:flex-end; margin:26px 0 4px; flex-wrap:wrap; }
    .gr-rect { position:relative; border:1px solid var(--accent); border-radius:4px;
               background:color-mix(in srgb, var(--accent) 13%, transparent); }
    .gr-rect.ref { border-color:var(--good); border-style:dashed;
                   background:color-mix(in srgb, var(--good) 10%, transparent); }
    .gr-cap { font:11px var(--sans); color:var(--muted); margin-top:6px; text-align:center; }
    .gr-drift { font:12.5px var(--mono); color:var(--muted); margin-top:10px; }
    .gr-drift b { color:var(--text); }
  `));
}

function mount(host) {
  ensureStyle();
  let a = CASES[0].a, b = CASES[0].b;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { a = c.a; b = c.b; aIn.value = a; bIn.value = b; render(); };
    pre.append(chip);
  });

  const ctl = el("div", "controls");
  const aIn = el("input"); aIn.type = "number"; aIn.value = a; aIn.style.width = "92px"; aIn.min = 1;
  const bIn = el("input"); bIn.type = "number"; bIn.value = b; bIn.style.width = "92px"; bIn.min = 1;
  aIn.oninput = () => { a = +aIn.value; render(); };
  bIn.oninput = () => { b = +bIn.value; render(); };
  ctl.append(el("span", "ctl-label", "a ="), aIn, el("span", "ctl-label", "b ="), bIn);

  const out = el("div");
  host.append(
    el("div", "note", "Type any two numbers — <b>swap them and nothing changes</b>, which is the first half of the problem. The green band is the whole answer: 1.618 ± 0.01. Nudge <b>b</b> one at a time near 1628 to walk the marker across the edge."),
    pre, ctl, out,
  );
  render();

  function render() {
    out.innerHTML = "";
    if (!(a > 0) || !(b > 0)) { out.append(el("div", "note", "Both numbers must be positive — a ratio needs something to divide by.")); return; }

    const ratio = ratioOf(a, b), drift = Math.abs(ratio - PHI), ok = drift <= TOL;

    const line = el("div", "gr-line");
    const band = el("div", "gr-band");
    band.style.left = pct(PHI - TOL) + "%";
    band.style.width = (pct(PHI + TOL) - pct(PHI - TOL)) + "%";
    const phi = el("div", "gr-phi"); phi.style.left = pct(PHI) + "%";
    const mark = el("div", "gr-mark" + (ok ? " in" : ""), `<span>${fix(ratio)}</span>`);
    mark.style.left = pct(ratio) + "%";
    line.append(band, phi, mark);
    [LO, 1.5, PHI, 1.75, HI].forEach((t) => {
      const tick = el("div", "gr-tick", t === PHI ? "φ ≈ 1.618" : fix(t, 2));
      tick.style.left = pct(t) + "%";
      line.append(tick);
    });
    out.append(line);

    out.append(el("div", "result-line",
      `<span class="badge ${ok ? "ok" : "no"}">${ok ? "true" : "false"}</span>` +
      `<span class="opcount ${ok ? "cool" : "hot"}"><span class="n">${fix(drift)}</span> drift from φ</span>` +
      `<span class="muted mono">tolerance ${TOL}</span>`));

    // Same short side for both, so the only visible difference IS the drift.
    const SHORT = 76;
    const rects = el("div", "gr-rects");
    const mk = (r, cls, cap) => {
      const box = el("div");
      const rect = el("div", "gr-rect" + cls);
      rect.style.width = Math.round(SHORT * Math.min(r, 3)) + "px";
      rect.style.height = SHORT + "px";
      box.append(rect, el("div", "gr-cap", cap));
      return box;
    };
    rects.append(mk(ratio, "", `your ratio · ${fix(ratio, 3)}`),
                 mk(PHI, " ref", `golden · ${PHI}`));
    out.append(rects);

    out.append(el("div", "gr-drift",
      `max(${a}, ${b}) / min(${a}, ${b}) = <b>${Math.max(a, b)} / ${Math.min(a, b)}</b> = <b>${fix(ratio, 6)}</b> &nbsp;·&nbsp; |${fix(ratio, 6)} − 1.618| = <b>${fix(drift, 6)}</b> ${ok ? "≤" : ">"} 0.01`));

    // The two edge presets are the same distance from φ and disagree. Say why, in
    // full precision, or it reads as a bug in the module rather than in binary.
    if (Math.abs(drift - TOL) < 1e-12) {
      out.append(el("div", "note",
        `<b>Exactly 0.01 from φ — on paper.</b> The drift really computes to <code class='inl'>${drift.toPrecision(17)}</code>, so this one is <b>${ok ? "inside" : "outside"}</b>. Try its mirror, <b>${ok ? "1000, 1608" : "1000, 1628"}</b>: same 0.01, other side of φ, <b>opposite</b> answer. 1.618, 1.628 and 1.608 have no exact binary representation, and the rounding lands where it lands — so the edge of a tolerance is never somewhere to stand.`));
    }

    const ladder = el("div", "ladder");
    for (let i = 1; i < FIB.length; i++) {
      const lo = FIB[i - 1], hi = FIB[i], r = hi / lo, hit = Math.abs(r - PHI) <= TOL;
      const rung = el("div", "rung" + (hit ? " on" : ""),
        `<span>${lo} / ${hi}</span><span class="v">${fix(r, 5)} ${hit ? "✓ inside the band" : "✗"}</span>`);
      ladder.append(rung);
    }
    out.append(el("div", "gr-drift", "Consecutive Fibonacci pairs, converging:"), ladder);
    out.append(el("div", "note",
      `The sequence crosses into tolerance at <b>8/13</b> and never leaves — which is why <b>8, 13</b> and <b>21, 34</b> are the official <i>true</i> cases and <b>5, 8</b> (1.6, drift 0.018) is not. Nothing about Fibonacci is in the spec; it just happens to be where these numbers come from.`));
  }
}

// ── STEP — four lines, and every one of them is a decision ───────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isGoldenRatio</span>(<span class="tok" data-t="params">a, b</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="ratio">ratio = Math.<span class="fn">max</span>(a, b) / Math.<span class="fn">min</span>(a, b)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="drift">drift = Math.<span class="fn">abs</span>(ratio - <span class="nu">1.618</span>)</span>;` },
  { ln: 4, html: `  <span class="k">return</span> <span class="tok" data-t="cmp">drift &lt;= <span class="nu">0.01</span></span>;` },
  { ln: 5, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { a, b } = CASES[k - 1];
  const ratio = ratioOf(a, b), drift = Math.abs(ratio - PHI), ok = drift <= TOL;
  const steps = [];

  const S = (line, note, x = {}) => {
    const vars = { a, b };
    if (line >= 3) vars.ratio = fix(ratio, 6);   // scope by omission — each const
    if (line >= 4) vars.drift = fix(drift, 6);   // appears only once its line has run
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isGoldenRatio(${a}, ${b})`, vars, changed: x.changed || [], ret: x.ret }],
    });
  };

  S(1, `Two numbers, <b>a = ${a}</b> and <b>b = ${b}</b>${a > b ? " — note that <b>a is the larger one here</b>, which is exactly the case a naive <code class='inl'>b / a</code> gets wrong" : ""}. The question is whether their ratio is <i>near</i> φ, not equal to it.`,
    { focus: "params" });

  S(2, `<b>max / min</b> rather than <code class='inl'>b / a</code>: a ratio between two lengths has no direction, and the grader passes the pair both ways round (<b>21, 34</b> and <b>1618, 1000</b>). Normalising here means the rest of the function never has to care. <b>${Math.max(a, b)} / ${Math.min(a, b)} = ${fix(ratio, 6)}</b>.`,
    { focus: "ratio", changed: ["ratio"] });

  S(3, `Collapse "how close is it?" into a single non-negative number: <b>|${fix(ratio, 6)} − 1.618| = ${fix(drift, 6)}</b>. <code class='inl'>Math.abs</code> is what lets one comparison cover being too big <i>and</i> too small — without it you would need two.`,
    { focus: "drift", changed: ["drift"] });

  // "Nominally on the edge" means |ratio − φ| is 0.01 in decimal arithmetic. Both
  // edge cases are, and they still disagree — which is the lesson, so detect the
  // intent rather than the float.
  const onEdge = Math.abs(drift - TOL) < 1e-12;

  S(4, `<b>${drift.toPrecision(17)} ${ok ? "≤" : ">"} 0.01</b> → <b>${ok}</b>. ${
    drift === 0
      ? `An exact hit — but that is luck, not the norm: 1618/1000 <i>is</i> φ as the problem defines it. Real ratios like 34/21 = 1.61904… never land on it, which is why the band exists at all.`
      : onEdge
        ? `Look at the full precision: this input is <b>exactly 0.01 from φ on paper</b>, and the comparison still comes out <b>${ok}</b> because the drift actually computes to <b>${drift.toPrecision(17)}</b>. Its mirror image — <b>${ok ? "1000, 1608" : "1000, 1628"}</b>, the same 0.01 the other side of φ — lands on the <b>opposite</b> side of the test. Neither the spec nor <code class='inl'>&lt;=</code> is asymmetric; binary floating point cannot represent 1.618, 1.628 or 1.608 exactly, and the rounding error falls whichever way it falls. The practical lesson is that <b>the edge of a tolerance is not a place you can stand</b> — pick an epsilon comfortably larger than the precision you care about and never depend on the boundary itself.`
        : ok
          ? `Inside the band. The drift is real — <b>${fix(ratio, 6)}</b> is not 1.618 and never will be — but "approximates" is satisfied. This is exactly why the comparison is a subtraction and not <code class='inl'>ratio === 1.618</code>, which would return false on every one of the official true cases.`
          : `Outside the band by <b>${fix(drift - TOL, 6)}</b>. Close-looking is not close enough: ${fix(ratio, 4)} is ${fix(drift, 4)} away, and the whole job of the tolerance is to draw that line somewhere explicit.`}`,
    { focus: "cmp", eval: { expr: `${drift.toPrecision(17)} <= 0.01`, val: ok }, done: true, result: String(ok), ret: { value: ok } });

  return steps;
}

export default {
  n: 344, id: "golden", title: "Golden Ratio", dates: ["2026-07-20"],
  statement: `Given two numbers, determine if their ratio approximates the golden ratio. Use <b>1.618</b>, and allow a tolerance of <b>0.01</b>. <span class="rule">Example: <code class="inl">isGoldenRatio(21, 34)</code> → <b>true</b> — 34/21 = 1.61904…, which is 0.00095 from 1.618.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1)",
      approach: `Two lines, each fixing a different trap. <b>max / min</b> makes the answer independent of argument order — the grader passes <code class='inl'>(21, 34)</code> and <code class='inl'>(1618, 1000)</code>, and a plain <code class='inl'>b / a</code> gets exactly half of the official set wrong. Then <b>|ratio − 1.618| ≤ 0.01</b> instead of an equality test: 34/21 is 1.61904…, so <code class='inl'>ratio === 1.618</code> is false on every true case in the suite. Any spec that says "approximates", "within", or "about" is asking for this same shape — turn the target into a band and compare the absolute difference against its half-width. <code class='inl'>Math.abs</code> is what makes one comparison cover both sides.`,
      code: `// A ratio has no direction, so normalise with max/min — the grader passes
// the pair both ways round. And "approximates" means a band, never ===.
function isGoldenRatio(a: number, b: number): boolean {
  const ratio = Math.max(a, b) / Math.min(a, b);
  return Math.abs(ratio - 1.618) <= 0.01;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Four lines, and each one is load-bearing. Watch <b>ratio</b> appear on line 2 already normalised, so the <b>1618, 1000</b> case looks identical to the others by the time line 3 runs. Then run the two <b>edge</b> cases back to back — they sit the same 0.01 either side of φ and return <i>different</i> answers. Line 4 prints the drift at full precision, and the reason is visible there: 1.628 and 1.608 are both unrepresentable in binary, so one rounds just inside the band and the other just outside. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 5, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
