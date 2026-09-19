// #36 · Thermostat Adjuster — "below the target" means heat, and that reads backwards.
// Three lines of spec, one condition each, and the answer is a single expression:
// temp < target ? "heat" : temp > target ? "cool" : "hold". That IS the problem —
// a statement that enumerates its COMPLETE output space is a lookup table, not an
// algorithm, and recognising that in two seconds instead of hunting for the trick
// is the skill being tested. Three things still repay care, and all three generalise:
// • DIRECTION / the action is the opposite of the state. "Heat" is what you do when
//   the room is COLD, so the branch returning "heat" is the one where temp is the
//   SMALLER number. freeCodeCamp tests it with negatives on purpose —
//   adjustThermostat(-20.5, -10.1) is "heat", and -20.5 is the colder value despite
//   the larger absolute value. The demo puts both temperatures on one axis so
//   "below" is a position you can see rather than a sign you have to reason about.
// • TRICHOTOMY / two numbers are <, > or equal with nothing left over, so "hold" is
//   the FALLTHROUGH. Write it as a third `temp === target` test and you have invited
//   an else branch that can never run, plus a "what if none match" worry that cannot
//   happen. (NaN is the sole exception: it makes all three comparisons false, which
//   is why the fallthrough belongs last if the inputs are ever untrusted.)
// • FLOAT EQUALITY / `===` on 72 and 72, or 0.0 and 0.0, is exact because those
//   values were GIVEN. Compute one and the equal branch stops being reachable. The
//   official (100, 99.9) → "cool" is a 0.1 gap that survives only because neither
//   number came out of arithmetic. Click the `0.1+0.2 → 0.3` chip — OURS, not
//   freeCodeCamp's — for "cool" where every human reading the two numbers says hold.
// ONE APPROACH, deliberately. There is no wasteful act to name (Tier 3 §1): every
// "slower" version is two comparisons spelled differently, so it gets no tab.
import { el, mountDebugger } from "../shared.js";

// Cases 1–6 are freeCodeCamp's six official ones, in the grader's order. 7 and 8
// are ours. Three outputs and six official tests means the official set has to
// repeat branches — what each one adds beyond its verdict is noted below.
//   1 (68, 72)        heat — the plain reading
//   2 (75, 72)        cool — the plain reading, mirrored
//   3 (72, 72)        hold — equality on two GIVEN integers
//   4 (-20.5, -10.1)  heat — negatives, where "below" and "bigger number" split
//   5 (100, 99.9)     cool — a 0.1 gap that survives because nothing was computed
//   6 (0.0, 0.0)      hold — equality at zero, the value people expect to be fragile
//   7 (-10.1, -20.5)  ours — case 4 with the arguments swapped. Same two numbers,
//                     opposite verdict, which is the cheapest possible check that
//                     you wrote the comparison the right way round.
//   8 (0.1+0.2, 0.3)  ours — the only case where the temperature was COMPUTED.
//                     0.1 + 0.2 is 0.30000000000000004, so "hold" is unreachable
//                     and the answer is "cool" by 5.55e-17 of a degree.
const CASES = [
  { temp: 68, target: 72, want: "heat" },
  { temp: 75, target: 72, want: "cool" },
  { temp: 72, target: 72, want: "hold" },
  { temp: -20.5, target: -10.1, want: "heat" },
  { temp: 100, target: 99.9, want: "cool" },
  { temp: 0.0, target: 0.0, want: "hold" },
  { temp: -10.1, target: -20.5, want: "cool" },
  { temp: 0.1 + 0.2, target: 0.3, want: "cool", label: "0.1+0.2 → 0.3", expr: "0.1 + 0.2" },
];

const solve = (temp, target) => (temp < target ? "heat" : temp > target ? "cool" : "hold");

// Print a number the way JavaScript actually holds it: 68 renders "68" and
// 0.1 + 0.2 renders "0.30000000000000004", which is the float lesson for free.
const num = (v) => String(v);

const MIN = -30, MAX = 110;
const pct = (v) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100;

// The gap is itself a subtraction, so it is no more exact than its operands: on
// (100, 99.9) it is 0.09999999999999432. Two decimals for the floating chip, the
// raw value in the prose, and "≈0" for a gap too small to be a temperature.
const gapChip = (g) => (g === 0 ? "0°" : g < 0.005 ? "≈0°" : +g.toFixed(2) + "°");

const WORD = { heat: "below", cool: "above", hold: "equal to" };

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .th-wrap { display:flex; flex-direction:column; gap:13px; }
    .th-verdict { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .th-badge { font:800 26px var(--mono); letter-spacing:1px; padding:7px 18px; border-radius:11px; border:1px solid var(--border); }
    .th-badge.heat { color:var(--warn); border-color:var(--warn); background:color-mix(in srgb, var(--warn) 13%, transparent); }
    .th-badge.cool { color:var(--accent); border-color:var(--accent); background:color-mix(in srgb, var(--accent) 13%, transparent); }
    .th-badge.hold { color:var(--good); border-color:var(--good); background:color-mix(in srgb, var(--good) 13%, transparent); }
    .th-call { font:13px var(--mono); color:var(--muted); line-height:1.6; }
    .th-call b { color:var(--text); }
    .th-srow { display:grid; grid-template-columns:54px 1fr 108px; align-items:center; gap:10px; font:12px var(--mono); color:var(--muted); }
    .th-srow input { width:100%; }
    .th-srow .v { text-align:right; color:var(--text); font-weight:800; font-size:13px; overflow:hidden; text-overflow:ellipsis; }
    .th-plot { position:relative; height:126px; margin:6px 40px 0; }
    .th-track { position:absolute; left:0; right:0; top:56px; height:14px; border-radius:7px; background:var(--panel-2); border:1px solid var(--border); }
    .th-fill { position:absolute; top:0; bottom:0; border-radius:6px; }
    .th-fill.heat { background:color-mix(in srgb, var(--warn) 40%, transparent); }
    .th-fill.cool { background:color-mix(in srgb, var(--accent) 40%, transparent); }
    .th-fill.hold { background:color-mix(in srgb, var(--good) 40%, transparent); }
    .th-zero { position:absolute; top:-5px; bottom:-5px; width:1px; background:var(--muted); opacity:.55; }
    .th-dot { position:absolute; width:14px; height:14px; border-radius:50%; top:0; margin-left:-7px; border:2px solid var(--panel); }
    .th-dtgt { background:var(--muted); }
    .th-dnow.heat { background:var(--warn); } .th-dnow.cool { background:var(--accent); } .th-dnow.hold { background:var(--good); }
    .th-mk { position:absolute; transform:translateX(-50%); text-align:center; white-space:nowrap; display:flex; flex-direction:column; gap:1px; }
    .th-mk .cap { font:700 9.5px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
    .th-mk .val { font:800 14px var(--mono); color:var(--text); }
    .th-tgt { top:10px; }
    .th-now { top:90px; }
    .th-gap { position:absolute; top:34px; transform:translateX(-50%); font:700 11px var(--mono); padding:2px 7px; border-radius:6px; border:1px solid var(--border); background:var(--panel); white-space:nowrap; }
    .th-gap.heat { color:var(--warn); border-color:color-mix(in srgb, var(--warn) 55%, var(--border)); }
    .th-gap.cool { color:var(--accent); border-color:color-mix(in srgb, var(--accent) 55%, var(--border)); }
    .th-gap.hold { color:var(--good); border-color:color-mix(in srgb, var(--good) 55%, var(--border)); }
    .th-tick { position:absolute; top:74px; transform:translateX(-50%); font:10px var(--mono); color:var(--muted); opacity:.75; }
    .th-float { font:12.5px/1.55 var(--sans); color:var(--text); border:1px solid color-mix(in srgb, var(--warn) 55%, var(--border)); background:color-mix(in srgb, var(--warn) 9%, transparent); border-radius:9px; padding:8px 12px; }
    .th-float b { font-family:var(--mono); color:var(--warn); }
  `));
}

// The three source branches as pills: green = the comparison that fired, red = one
// that was reached and came back false, grey = never evaluated at all.
const pill = (label, state) => `<span class="cand${state}">${label}</span>`;

function branchHtml(verdict) {
  const lt = verdict === "heat", gt = verdict === "cool";
  return pill("temp &lt; target", lt ? " pass" : " fail")
    + pill("temp &gt; target", lt ? "" : gt ? " pass" : " fail")
    + pill('fallthrough "hold"', verdict === "hold" ? " pass" : "");
}

function axisHtml(temp, target, verdict) {
  const lo = pct(Math.min(temp, target)), hi = pct(Math.max(temp, target));
  const g = Math.abs(temp - target);
  const ticks = [MIN, 0, MAX].map((t) => `<span class="th-tick" style="left:${pct(t)}%">${t}°</span>`).join("");
  return `<div class="th-gap ${verdict}" style="left:${(lo + hi) / 2}%">${gapChip(g)}</div>` +
    `<div class="th-mk th-tgt" style="left:${pct(target)}%"><span class="cap">target</span><span class="val">${num(target)}°</span></div>` +
    `<div class="th-track">` +
      `<i class="th-fill ${verdict}" style="left:${lo}%;right:${100 - hi}%"></i>` +
      `<i class="th-zero" style="left:${pct(0)}%"></i>` +
      `<i class="th-dot th-dtgt" style="left:${pct(target)}%"></i>` +
      `<i class="th-dot th-dnow ${verdict}" style="left:${pct(temp)}%"></i>` +
    `</div>${ticks}` +
    `<div class="th-mk th-now" style="left:${pct(temp)}%"><span class="val">${num(temp)}°</span><span class="cap">now</span></div>`;
}

function mount(host) {
  ensureStyle();
  // `expr` is set only by the computed chip and cleared by any drag: it records
  // that this temperature came out of ARITHMETIC rather than being handed in.
  let temp = 68, target = 72, expr = null;

  const pre = el("div", "controls");
  const chips = CASES.map((c) => {
    const b = el("button", "chip", c.label || `${num(c.temp)} → ${num(c.target)}`);
    b.onclick = () => { temp = c.temp; target = c.target; expr = c.expr || null; render(); };
    pre.append(b);
    return b;
  });

  // A range with step 0.1 and a negative min can hand back -10.099999999999998,
  // so round on read. Without this, -10.1, 99.9 and -20.5 — all official inputs —
  // would be reachable by chip but not by DRAGGING, which is the coverage that
  // actually matters here.
  const sliders = el("div");
  const mk = (name, set) => {
    const row = el("div", "th-srow");
    const r = el("input");
    r.type = "range"; r.min = String(MIN); r.max = String(MAX); r.step = "0.1";
    const v = el("span", "v", "");
    row.append(el("span", null, name), r, v);
    r.oninput = () => { set(Math.round(+r.value * 10) / 10); expr = null; render(); };
    sliders.append(row);
    return { r, v };
  };
  const nowS = mk("now", (x) => { temp = x; });
  const tgtS = mk("target", (x) => { target = x; });

  const out = el("div");
  host.append(pre, sliders, out);
  render();

  function render() {
    const verdict = solve(temp, target);
    nowS.r.value = String(Math.max(MIN, Math.min(MAX, temp)));
    tgtS.r.value = String(Math.max(MIN, Math.min(MAX, target)));
    nowS.v.textContent = num(temp) + "°";
    tgtS.v.textContent = num(target) + "°";
    chips.forEach((b, i) =>
      b.classList.toggle("on", Object.is(CASES[i].temp, temp) && Object.is(CASES[i].target, target)));

    out.innerHTML = "";
    const wrap = el("div", "th-wrap");
    wrap.append(el("div", "th-verdict",
      `<span class="th-badge ${verdict}">"${verdict}"</span>` +
      `<span class="th-call">adjustThermostat(<b>${num(temp)}</b>, <b>${num(target)}</b>) → <b>"${verdict}"</b><br>` +
      `now is <b>${WORD[verdict]}</b> target${verdict === "hold" ? "" : ` by <b>${num(+Math.abs(temp - target).toFixed(6))}°</b>`}</span>`));
    wrap.append(el("div", "th-plot", axisHtml(temp, target, verdict)));
    wrap.append(el("div", "cand-grid", branchHtml(verdict)));
    if (expr) wrap.append(el("div", "th-float", floatNote(expr, temp, target)));
    wrap.append(el("div", "note", noteFor(temp, target, verdict, expr)));
    out.append(wrap);
  }
}

function floatNote(expr, temp, target) {
  return `<b>${expr}</b> is <b>${num(temp)}</b>, not <b>0.3</b>. The two numbers on screen read as equal, so <code class='inl'>"hold"</code> is what a human answers — but <code class='inl'>temp &gt; target</code> is <b>true</b> by <b>${num(temp - target)}</b> of a degree, and the equal branch is not merely unlikely here, it is <b>unreachable</b>. This is ours, not freeCodeCamp's: every official temperature is a value the caller <i>handed</i> the function, which is exactly why exact <code class='inl'>===</code> is safe on all six of them. The moment one side comes out of arithmetic you need a tolerance — <code class='inl'>Math.abs(temp - target) &lt; 0.05</code> — and the problem quietly changes from a comparison into a decision about how close counts as close.`;
}

function noteFor(temp, target, verdict, expr) {
  if (expr) {
    return `The verdict above is <code class='inl'>"cool"</code> and the axis shows two dots sitting on top of each other, which is the whole point: the gap is real, it is just far too small to draw. Nothing about the code is wrong — <code class='inl'>temp &gt; target</code> answered the question it was asked. What changed is the <b>provenance</b> of the number, and provenance is not visible at the call site. Drag either slider to get back to a value that was given rather than computed.`;
  }
  if (verdict === "hold") {
    const zero = temp === 0;
    return `Both comparisons came back false, and that is the <i>only</i> way to reach <code class='inl'>"hold"</code> — it is never tested for. Two numbers are below, above, or equal with nothing left over, so the fallthrough is a <b>proof</b>, not an assumption, and a third <code class='inl'>if (temp === target)</code> would add a branch that cannot fail and an <code class='inl'>else</code> that cannot run. ${zero
      ? `<code class='inl'>0.0 === 0.0</code> is exact, and it is worth being clear about <i>why</i>: not because zero is special, but because both zeros were <b>given</b>. Every value in the official set was handed in literally.`
      : `<code class='inl'>${num(temp)} === ${num(target)}</code> is exact because both values were <b>given</b>, not calculated — which is the only condition under which <code class='inl'>===</code> on a number means what it looks like it means.`} Click the <code class='inl'>0.1+0.2 → 0.3</code> chip to see the same pair of numbers refuse to be equal.`;
  }
  const below = verdict === "heat";
  const bothNeg = temp < 0 && target < 0;
  const gap = Math.abs(temp - target);
  if (bothNeg) {
    return `Both temperatures are <b>negative</b>, and this is where the direction stops being obvious. <b>${num(temp)}</b> has the ${Math.abs(temp) > Math.abs(target) ? "larger" : "smaller"} absolute value and sits to the <b>${below ? "left" : "right"}</b> of the target on the axis, so it is the ${below ? "colder" : "warmer"} of the two — which is what <code class='inl'>&lt;</code> and <code class='inl'>&gt;</code> compare, and what "below" means. freeCodeCamp includes <code class='inl'>(-20.5, -10.1)</code> for exactly this reason: a solution that reasons about magnitudes, or that got the two branches the wrong way round, passes every positive case and dies here. Swap the two sliders and watch the verdict flip.`;
  }
  if (gap < 0.5) {
    return `The gap is <b>${num(gap)}</b> — not the <code class='inl'>0.1</code> you typed, because the subtraction is no more exact than the numbers going into it. It does not matter: the comparison only asks for the <b>sign</b> of the difference, never its value, and the sign is unambiguous here. That is why a 0.1 gap is safe to compare and a 0.1 gap is <i>not</i> safe to test for equality — <code class='inl'>&lt;</code> and <code class='inl'>&gt;</code> survive a tiny error in the last bits, <code class='inl'>===</code> does not.`;
  }
  return `<b>${num(temp)}</b> sits to the <b>${below ? "left" : "right"}</b> of <b>${num(target)}</b> on the axis, so the room is <b>${below ? "colder" : "warmer"}</b> than you asked for and the thing to <i>do</i> is <code class='inl'>"${verdict}"</code>. Say that out loud once, because the action is the opposite of the state and this is the single place this class of problem gets written backwards: <b>below</b> the target returns <b>heat</b>. Everything after that is two comparisons in the order the statement lists them.`;
}

// ── STEP — the ternary unrolled into two ifs, so each comparison gets a line ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">adjustThermostat</span>(<span class="tok" data-t="args">temp, target</span>) {` },
  { ln: 2, html: `  <span class="k">if</span> (<span class="tok" data-t="lt">temp &lt; target</span>) <span class="k">return</span> <span class="st">"heat"</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="gt">temp &gt; target</span>) <span class="k">return</span> <span class="st">"cool"</span>;` },
  { ln: 4, html: `  <span class="k">return</span> <span class="tok" data-t="hold"><span class="st">"hold"</span></span>;` },
  { ln: 5, html: `}` },
];

const LADDER = ['temp < target → "heat"', 'temp > target → "cool"', 'fallthrough → "hold"'];

function trace(idx) {
  const c = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1];
  const temp = c.temp, target = c.target;
  const steps = [];
  const marks = [];
  const S = (line, note, x = {}) => {
    const vars = { temp: num(temp), target: num(target) };
    // The ladder appears once the first comparison is being evaluated and stays
    // for the rest of the call, filling in left to right as each rung resolves.
    const structs = line >= 2 ? [{ label: "branches", items: LADDER.map((t, i) => t + (marks[i] || "")) }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `adjustThermostat(${num(temp)}, ${num(target)})`, vars, structs, ret: x.ret }] });
  };
  const RET = (line, focus, word, note) => S(line, note, { focus, done: true, result: `"${word}"`, ret: { value: `"${word}"` } });

  S(1, `<b>adjustThermostat(${num(temp)}, ${num(target)})</b>. The statement lists three outputs and gives exactly one condition for each, which means the complete answer space is already written down — there is no algorithm to find, only a direction to get right. ${c.expr
    ? `Note where <b>${num(temp)}</b> came from: <code class='inl'>${c.expr}</code>. It was <b>computed</b>, not handed in, and that is the only thing separating this case from the official ones.`
    : temp < 0 && target < 0
      ? `Both values are negative, so "below" and "bigger number" point in opposite directions — read the axis, not the digits.`
      : `Two numbers in, one of three strings out.`}`, { focus: "args" });

  const lt = temp < target;
  marks[0] = lt ? " ✓" : " ✗";
  S(2, lt
    ? `<b>${num(temp)} &lt; ${num(target)}</b>, so the room is <b>colder</b> than you asked for — and the answer is <code class='inl'>"heat"</code>, because the action you take is the opposite of the state you are in. This is the line that gets written backwards: "heat if the current temperature is below the target" pairs the warm-sounding word with the smaller number.${temp < 0 && target < 0 ? ` Here it is deliberately awkward: <b>${Math.abs(temp)}</b> is the larger magnitude and <b>${num(temp)}</b> is still the colder temperature.` : ``}`
    : `<b>${num(temp)}</b> is not below <b>${num(target)}</b>, so heating would move the room <i>away</i> from the target. One rung down, and note what this <i>false</i> does not yet tell us — not below is not the same as equal.`,
    { focus: "lt", eval: { expr: `${num(temp)} < ${num(target)}`, val: lt } });
  if (lt) {
    RET(2, "lt", "heat", `<b>Return "heat"</b>. The first condition that matches returns immediately, so line 3 is never evaluated at all — with a trichotomy that is not an optimisation, it is the reason the remaining branches can be written as if the earlier ones had already been ruled out.`);
    return steps;
  }

  const gt = temp > target;
  marks[1] = gt ? " ✓" : " ✗";
  S(3, gt
    ? `<b>${num(temp)} &gt; ${num(target)}</b>: the room is <b>warmer</b> than the target, so cool it.${c.expr
        ? ` And this is the case worth staring at — the difference is <b>${num(temp - target)}</b>, which is not a temperature, it is the error left over from <code class='inl'>${c.expr}</code>. The comparison is doing its job perfectly; the number it was given is the surprise.`
        : Math.abs(temp - target) < 0.5
          ? ` The gap is only <b>${num(Math.abs(temp - target))}</b>, and that is fine: <code class='inl'>&gt;</code> asks for the <b>sign</b> of the difference, never its magnitude, so a tiny gap between two <i>given</i> values is as decisive as a large one.`
          : ``}`
    : `Also false. Two numbers for which <code class='inl'>&lt;</code> and <code class='inl'>&gt;</code> are <b>both</b> false are equal — that is the trichotomy, and it is a fact about the ordering rather than a lucky coincidence. So line 4 has nothing left to test.`,
    { focus: "gt", eval: { expr: `${num(temp)} > ${num(target)}`, val: gt } });
  if (gt) {
    RET(3, "gt", "cool", `<b>Return "cool"</b>. Both comparisons ran, in the order the statement lists them, and the second one decided it.${c.expr ? ` The verdict is correct and still counter-intuitive, which is the whole reason this case is here: <code class='inl'>===</code> was safe on all six official inputs only because none of them was calculated.` : ``}`);
    return steps;
  }

  marks[2] = " ✓";
  RET(4, "hold", "hold", `<b>Return "hold"</b> — and notice it was never <b>tested</b>. It is what is left when both comparisons fail, so writing <code class='inl'>if (temp === target) return "hold"</code> buys nothing and costs something: it invites an <code class='inl'>else</code> that can never run and a "what if none of them match?" worry that cannot happen for two numbers. The one input that reaches this line without being equal is <b>NaN</b>, which makes all three comparisons false — no official test goes there, but it is the reason the fallthrough belongs <i>last</i> rather than first if the inputs are ever untrusted.`);
  return steps;
}

export default {
  n: 36, id: "thermostat", title: "Thermostat Adjuster", dates: ["2025-09-15"],
  statement: `Given the <b>current temperature</b> of a room and a <b>target</b> temperature, return a string saying how to adjust it: <code class="inl">"heat"</code> if the current temperature is <b>below</b> the target, <code class="inl">"cool"</code> if it is <b>above</b> the target, and <code class="inl">"hold"</code> if the two are <b>equal</b>. <span class="rule">Example: <code class="inl">adjustThermostat(68, 72)</code> → <code class="inl">"heat"</code> — and so is <code class="inl">adjustThermostat(-20.5, -10.1)</code>, because −20.5 is the colder number.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — two comparisons",
      approach: `Read the three bullets and the answer is already written. One condition per output, and no output that needs anything but a comparison — which is the recognition step itself: a spec that enumerates its <b>complete</b> output space is a lookup table, not an algorithm, and spotting that in two seconds instead of looking for a trick that is not there is the skill being tested. Three details then repay care. The <b>direction</b> is the one people get backwards, because the action is the opposite of the state: <code class='inl'>"heat"</code> is what you do when the room is <b>colder</b> than the target, so the branch returning it is the one where <code class='inl'>temp</code> is the <i>smaller</i> number. freeCodeCamp tests that with negatives on purpose — <code class='inl'>adjustThermostat(-20.5, -10.1)</code> is <code class='inl'>"heat"</code>, and −20.5 is the colder value despite the larger absolute value. Drag the sliders and "below" becomes a <b>position on the axis</b> rather than a sign to reason about. Second, <code class='inl'>"hold"</code> is a <b>fallthrough</b>, not a third test: two numbers are below, above or equal with nothing left over, so <code class='inl'>if (temp === target)</code> adds a branch that cannot fail and an <code class='inl'>else</code> that cannot run. Third, exact equality on floats is safe <i>here</i> and it is worth knowing why — <code class='inl'>72 === 72</code> and <code class='inl'>0.0 === 0.0</code> hold because both values were <b>given</b>. Click the <code class='inl'>0.1+0.2 → 0.3</code> chip, ours rather than freeCodeCamp's, and the equal branch becomes unreachable the instant one side comes out of arithmetic.`,
      code: `// Three outputs, two comparisons — "hold" is what is left, not a third test.
function adjustThermostat(temp: number, target: number): string {
  // Read the direction out loud: the ACTION is the opposite of the STATE.
  // Below the target means the room is too cold, so the answer is "heat".
  // The third case needs no condition of its own — two numbers that are
  // neither < nor > are equal, so a \`temp === target\` test would only add
  // an else that can never run. (NaN is the one value that reaches the
  // fallthrough without being equal: all three comparisons are false.)
  return temp < target ? "heat" : temp > target ? "cool" : "hold";
}`,
      mount,
    },
    {
      name: "Step through", cost: "two comparisons, in order",
      approach: `The ternary unrolled into two <code class='inl'>if</code>s so each comparison gets its own line, its own truth value in the condition panel, and a note saying why the branch that fired is the one that fired. Start on <b>case 4</b> — <code class='inl'>(-20.5, -10.1)</code> — where the larger magnitude is the colder temperature, then <b>case 7</b>, ours, which is the same two numbers swapped and the opposite answer. <b>Case 3</b> is the short one worth watching anyway: both comparisons come back false and the <code class='inl'>branches</code> panel shows <code class='inl'>"hold"</code> being reached rather than chosen. Finish on <b>case 8</b>, also ours, where <code class='inl'>0.1 + 0.2</code> makes that same fallthrough unreachable. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 4, min: 1, max: CASES.length,
          presets: CASES.map((_, i) => i + 1),
          hint: `1–${CASES.length}: 1–6 official, 7–8 ours`,
        },
      }),
    },
  ],
};
