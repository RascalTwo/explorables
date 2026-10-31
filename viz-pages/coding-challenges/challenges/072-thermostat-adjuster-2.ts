// #72 · Thermostat Adjuster 2 — convert the target to Fahrenheit, then toFixed(1) the gap.
// Sequel to #36 "Thermostat Adjuster" (id "thermostat"): same three-way verdict, but the two numbers
// no longer share a unit. #36 compared temp and target directly; here the target is in Celsius, so
// the whole problem is one conversion (F = C * 1.8 + 32) in front of the same <, > fallthrough.
// Three things repay care:
//   - UNITS FIRST. Compare 72 with 18 and you get "cool" for the wrong reason. Convert, then compare.
//   - toFixed(1), NOT Math.round. "Heat: 7.0 degrees" must keep its ".0"; Math.round(x * 10) / 10
//     prints the number 7 and the string reads "Heat: 7 degrees". The official 70 -> 25 case catches it.
//   - FLOAT EQUALITY. 37 * 1.8 + 32 is 98.60000000000001, so a room at a given 98.6 is not "equal" to
//     37 C under ===; an exact compare answers "Heat: 0.0 degrees". The official Hold cases (32, 0) and
//     (212, 100) both land on exact floats, so they cannot tell. 98.6 / 37 is ours. We compare the
//     ROUNDED gap ("0.0") instead, which is the number the player would read anyway.
// ONE approach, deliberately: lookup of the verdict is two comparisons either way (CONTRIBUTING Tier 3).
// Click the 98.6 / 37 chip and read the red row.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   (-40, -50) - ours. Negatives, and the point where the scales agree (-40 F = -40 C): the
//     room is at -40 and the target is -58 F, so Cool by 18.0. Direction survives a sign.
//   (98.6, 37) - ours. Body temperature: 37 * 1.8 + 32 is 98.60000000000001, so an exact === compare
//     misses Hold. No official case has a computed float that is off by an ulp.
const CASES = [
  { cur: 32, c: 0 },
  { cur: 70, c: 25 },
  { cur: 72, c: 18 },
  { cur: 212, c: 100 },
  { cur: 59, c: 22 },
  { cur: -40, c: -50 },
  { cur: 98.6, c: 37 },
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, string> = {
  "32,0": "Hold",
  "70,25": "Heat: 7.0 degrees Fahrenheit",
  "72,18": "Cool: 7.6 degrees Fahrenheit",
  "212,100": "Hold",
  "59,22": "Heat: 12.6 degrees Fahrenheit",
};

const toF = (c: number) => c * 1.8 + 32;
function solve(cur: number, c: number) {
  const diff = toF(c) - cur;
  const gap = Math.abs(diff).toFixed(1);
  if (gap === "0.0") return "Hold";
  return diff > 0 ? `Heat: ${gap} degrees Fahrenheit` : `Cool: ${gap} degrees Fahrenheit`;
}
const fmt = String; // print a number the way JS holds it: 98.60000000000001 stays visible

const MIN = -70,
  MAX = 230;
const pct = (v: number) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .t2-wrap { display:flex; flex-direction:column; gap:12px; }
    .t2-conv { font:13px var(--mono); color:var(--muted); line-height:1.6; }
    .t2-conv b { color:var(--text); }
    .t2-plot { position:relative; height:70px; margin:4px 30px 0; }
    .t2-track { position:absolute; left:0; right:0; top:30px; height:12px; border-radius:6px; background:var(--panel-2); border:1px solid var(--border); }
    .t2-fill { position:absolute; top:0; bottom:0; border-radius:5px; }
    .t2-fill.heat { background:color-mix(in srgb, var(--warn) 40%, transparent); }
    .t2-fill.cool { background:color-mix(in srgb, var(--accent) 40%, transparent); }
    .t2-fill.hold { background:color-mix(in srgb, var(--good) 40%, transparent); }
    .t2-dot { position:absolute; width:14px; height:14px; border-radius:50%; top:-3px; margin-left:-7px; border:2px solid var(--panel); }
    .t2-mk { position:absolute; transform:translateX(-50%); font:700 11px var(--mono); color:var(--text); white-space:nowrap; }
    .t2-mk.up { top:6px; } .t2-mk.dn { top:50px; }
    .t2-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .t2-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .t2-r b { color:var(--text); }
    .t2-r.hot { border-color:var(--danger); color:var(--danger); }
    .t2-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let cur = CASES[0]!.cur;
  let c = CASES[0]!.c;

  const ctl = el("div", "controls");
  const iCur = el("input");
  const iC = el("input");
  for (const i of [iCur, iC]) {
    i.type = "number";
    i.step = "any";
    i.style.width = "90px";
  }
  iCur.value = String(cur);
  iC.value = String(c);
  ctl.append(el("span", "ctl-label", "currentF ="), iCur, el("span", "ctl-label", "targetC ="), iC);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((k, i) => {
    const b = el("button", "chip", `${k.cur} / ${k.c}`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      cur = k.cur;
      c = k.c;
      iCur.value = String(cur);
      iC.value = String(c);
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  const read = () => {
    if (iCur.value.trim() !== "" && Number.isFinite(+iCur.value)) cur = +iCur.value;
    if (iC.value.trim() !== "" && Number.isFinite(+iC.value)) c = +iC.value;
    render();
  };
  iCur.addEventListener("input", read);
  iC.addEventListener("input", read);
  render();

  function render() {
    out.innerHTML = "";
    const tf = toF(c);
    const diff = tf - cur;
    const result = solve(cur, c);
    const kind = result === "Hold" ? "hold" : diff > 0 ? "heat" : "cool";
    const want = EXPECTED[`${cur},${c}`];
    const wrap = el("div", "t2-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `adjustThermostat(${cur}, ${c}) → "${esc(result)}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected "${esc(want)}"`));
    wrap.append(line);

    wrap.append(
      el(
        "div",
        "t2-conv",
        `targetF = <b>${fmt(c)}</b> * 1.8 + 32 = <b>${fmt(tf)}</b> &nbsp;|&nbsp; gap = targetF - currentF = <b>${fmt(diff)}</b>`,
      ),
    );

    // Both temperatures on one Fahrenheit axis, so "below" is a position.
    const lo = pct(Math.min(cur, tf)),
      hi = pct(Math.max(cur, tf));
    const plot = el("div", "t2-plot");
    plot.innerHTML =
      `<div class="t2-mk up" style="left:${pct(tf)}%">target ${fmt(+tf.toFixed(2))}°F</div>` +
      `<div class="t2-track"><i class="t2-fill ${kind}" style="left:${lo}%;right:${100 - hi}%"></i>` +
      `<i class="t2-dot" style="left:${pct(tf)}%;background:var(--muted)"></i>` +
      `<i class="t2-dot" style="left:${pct(cur)}%;background:var(--${kind === "heat" ? "warn" : kind === "cool" ? "accent" : "good"})"></i></div>` +
      `<div class="t2-mk dn" style="left:${pct(cur)}%">now ${fmt(cur)}°F</div>`;
    wrap.append(plot);

    // The wrong readings, scored on the same input.
    const raw = cur < c ? "Heat" : cur > c ? "Cool" : "Hold";
    const g = Math.abs(diff);
    const noFixed =
      diff === 0
        ? "Hold"
        : `${diff > 0 ? "Heat" : "Cool"}: ${Math.round(g * 10) / 10} degrees Fahrenheit`;
    const exact =
      diff === 0 ? "Hold" : `${diff > 0 ? "Heat" : "Cool"}: ${g.toFixed(1)} degrees Fahrenheit`;
    const cmp = el("div", "t2-cmp");
    (
      [
        ["no conversion (F vs C)", raw + (raw === "Hold" ? "" : "…")],
        ["Math.round, no toFixed", noFixed],
        ["exact === Hold", exact],
      ] as [string, string][]
    ).forEach(([name, v]) => {
      const bad = v !== result;
      cmp.append(
        el("div", `t2-r${bad ? " hot" : ""}`, `${name} <b>${esc(v)}</b>${bad ? " ✗" : ""}`),
      );
    });
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(cur, c, tf, diff, result)));
    out.append(wrap);
  }
}

// What did THIS input exercise?
function noteFor(cur: number, c: number, tf: number, diff: number, result: string) {
  if (result === "Hold" && diff !== 0)
    return `Here <code class='inl'>${fmt(c)} * 1.8 + 32</code> is <b>${fmt(tf)}</b>, not ${fmt(cur)}: floating point is off by <b>${fmt(Math.abs(diff))}</b>. An exact <code class='inl'>===</code> would say the room needs a degree-sized adjustment of 0.0. Rounding the gap to one decimal first, as the output does, calls it <b>Hold</b>.`;
  if (result === "Hold")
    return `The converted target equals the room exactly (<b>${fmt(tf)}</b>), so the gap prints as 0.0 and the answer is <b>Hold</b>. Both official Hold cases convert to exact floats, which is why the grader cannot tell exact equality from rounded equality.`;
  if (c < 0 || cur < 0)
    return `Negatives are fine: the formula is linear, so <b>${fmt(c)}&deg;C</b> is <b>${fmt(tf)}&deg;F</b> and the sign of <code class='inl'>targetF - currentF</code> still says which way to go. ${diff > 0 ? "Target above room: heat." : "Target below room: cool."}`;
  return diff > 0
    ? `Target <b>${fmt(+tf.toFixed(2))}&deg;F</b> is above the room's ${fmt(cur)}, so the room must be <b>heated</b> by <b>${Math.abs(diff).toFixed(1)}</b>. toFixed keeps a trailing zero where Math.round would print a bare integer.`
    : `Target <b>${fmt(+tf.toFixed(2))}&deg;F</b> is below the room's ${fmt(cur)}, so the room must be <b>cooled</b> by <b>${Math.abs(diff).toFixed(1)}</b>. "Cool" is the case where the room is the larger number.`;
}

// ── STEP — convert, subtract, round, branch ──────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">adjustThermostat</span>(<span class="tok" data-t="args">currentF, targetC</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> targetF = <span class="tok" data-t="conv">targetC * 1.8 + 32</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> diff = <span class="tok" data-t="diff">targetF - currentF</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> gap = <span class="tok" data-t="gap">Math.<span class="fn">abs</span>(diff).<span class="fn">toFixed</span>(1)</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">if</span> (<span class="tok" data-t="hold">gap === <span class="st">"0.0"</span></span>) <span class="k">return</span> <span class="st">"Hold"</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">diff &gt; 0 ? <span class="st">\`Heat: \${gap} degrees Fahrenheit\`</span> : <span class="st">\`Cool: \${gap} degrees Fahrenheit\`</span></span>;`,
  },
  { ln: 7, html: `}` },
];

function trace(idx: number) {
  const k = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const cur = k.cur;
  const c = k.c;
  const tf = toF(c);
  const diff = tf - cur;
  const gap = Math.abs(diff).toFixed(1);
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { currentF: fmt(cur), targetC: fmt(c) };
    if (line >= 3) vars["targetF"] = fmt(tf); // `const targetF` is line 2
    if (line >= 4) vars["diff"] = fmt(diff); // `const diff` is line 3
    if (line >= 5) vars["gap"] = `"${gap}"`; // `const gap` is line 4
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `adjustThermostat(${fmt(cur)}, ${fmt(c)})`,
          vars,
          changed: x.changed ?? [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `<b>${fmt(cur)}&deg;F</b> in the room, <b>${fmt(c)}&deg;C</b> wanted. The two numbers are in different units, so comparing them directly would be meaningless: ${fmt(cur)} vs ${fmt(c)} says nothing about the room. Convert one to the other's scale before any comparison.`,
    { focus: "args" },
  );
  S(
    2,
    `<code class='inl'>${fmt(c)} * 1.8 + 32</code> turns the target into Fahrenheit: <b>${fmt(tf)}</b>. We convert the target, not the room, because the output is a Fahrenheit amount.${
      fmt(tf) !== fmt(+tf.toFixed(10))
        ? ` Note the trailing digits: ${fmt(tf)} is what a double really holds, not the tidy decimal.`
        : ""
    }`,
    { focus: "conv", changed: ["targetF"] },
  );
  S(
    3,
    `<code class='inl'>targetF - currentF</code> is <b>${fmt(diff)}</b>. Positive means the target is above the room (heat), negative means below (cool). Keeping the sign now means the direction needs no second comparison later.`,
    { focus: "diff", changed: ["diff"] },
  );
  S(
    4,
    `<code class='inl'>Math.abs(diff).toFixed(1)</code> is the string <b>"${gap}"</b>. <code class='inl'>toFixed</code> returns a string with exactly one decimal, so 7 prints as "7.0"; <code class='inl'>Math.round(x * 10) / 10</code> would give the number 7 and the output would read "Heat: 7 degrees".`,
    { focus: "gap", changed: ["gap"] },
  );
  const isHold = gap === "0.0";
  S(
    5,
    isHold
      ? `<b>"${gap}" === "0.0"</b>: nothing to adjust.${diff !== 0 ? ` The raw gap is ${fmt(diff)}, not 0: floating point made 1.8 * ${fmt(c)} + 32 land a hair off. Testing the rounded gap treats it as Hold, where <code class='inl'>diff === 0</code> would have said Heat or Cool by 0.0.` : ` The gap is exactly 0.`}`
      : `<b>"${gap}"</b> is not "0.0", so there is a real adjustment to make and the sign of diff picks which one. Comparing the rounded string keeps the check consistent with what the output would print.`,
    { focus: "hold", eval: { expr: `"${gap}" === "0.0"`, val: isHold } },
  );
  if (isHold) {
    steps.push({ ...steps.at(-1)!, note: steps.at(-1)!.note });
    // Return happens on the same line; show it as the final frame.
    const last = steps.at(-1)!;
    last.note = `<b>Return "Hold".</b> The first test already decided it; line 6 never runs.`;
    last.done = true;
    last.result = `"Hold"`;
    last.eval = undefined;
    last.frames = last.frames?.map((f) =>
      Object.assign({}, f, { changed: [], ret: { value: `"Hold"` } }),
    );
    return steps;
  }

  const res = solve(cur, c);
  S(
    6,
    `<b>${fmt(diff)} &gt; 0</b> is ${diff > 0}, so the verb is <b>${diff > 0 ? "Heat" : "Cool"}</b>. Return <b>"${res}"</b>: the gap string goes in as is, keeping its one decimal.`,
    {
      focus: "ret",
      done: true,
      result: `"${res}"`,
      ret: { value: `"${res}"` },
    },
  );
  return steps;
}

export default {
  n: 72,
  id: "thermostat-adjuster-2",
  title: "Thermostat Adjuster 2",
  dates: ["2025-10-21"],
  statement: `Given the current temperature of a room in <b>Fahrenheit</b> and a target temperature in <b>Celsius</b>, return a string saying how to adjust the room. Return <code class="inl">"Heat: X degrees Fahrenheit"</code> if the current temperature is below the target, <code class="inl">"Cool: X degrees Fahrenheit"</code> if it is above, and <code class="inl">"Hold"</code> if they are equal. <code class="inl">X</code> is the number of Fahrenheit degrees to heat or cool by, rounded to 1 decimal place. Convert with <code class="inl">F = (C * 1.8) + 32</code>. <span class="rule">Example: <code class="inl">adjustThermostat(70, 25)</code> → <code class="inl">"Heat: 7.0 degrees Fahrenheit"</code> (25 C is 77 F); <code class="inl">adjustThermostat(212, 100)</code> → <code class="inl">"Hold"</code>. A sequel to #36 "Thermostat Adjuster", which compared two numbers in one unit.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1)",
      approach: `Convert the Celsius target to Fahrenheit, subtract, and format the gap. Sequel to #36: there the verdict was two comparisons on two numbers in the same unit; here the unit mismatch is the new work, and the comparison collapses into the sign of one subtraction. Three shortcuts fail. Skipping the conversion compares 72 with 18 and gets the direction right by luck on some inputs and wrong on others. <code class='inl'>Math.round(x * 10) / 10</code> prints 7 instead of "7.0", and the official <b>70 / 25</b> catches it. An exact <code class='inl'>diff === 0</code> for Hold misses <b>98.6 / 37</b> (ours): 37 * 1.8 + 32 is 98.60000000000001, so it answers "Heat: 0.0 degrees". Both official Hold cases convert to exact floats, so the grader cannot see that. The code tests the rounded gap <code class='inl'>"0.0"</code> instead. The demo shows both temperatures on a Fahrenheit axis and scores each wrong reading in red on the same input.`,
      code: `// Convert the target, subtract, format. Hold is a gap that prints as 0.0.
function adjustThermostat(currentF: number, targetC: number): string {
  const targetF = targetC * 1.8 + 32;
  const diff = targetF - currentF;          // positive: target is warmer, so heat
  const gap = Math.abs(diff).toFixed(1);    // a string: 7 stays "7.0"
  if (gap === "0.0") return "Hold";         // compares what we would print, not a raw float
  return diff > 0 ? \`Heat: \${gap} degrees Fahrenheit\` : \`Cool: \${gap} degrees Fahrenheit\`;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Six lines with <code class='inl'>targetF</code>, <code class='inl'>diff</code> and <code class='inl'>gap</code> appearing only once their lines have run. Start with <b>case 2</b> (70 / 25) and watch line 4: the gap is the string "7.0", not the number 7. <b>Case 7</b> (98.6 / 37, ours) is the one that exits on line 5 through the float trap: diff is not 0, but the rounded gap is. Cases 1 and 4 are the official Holds, 3 and 5 the Cool and Heat with fractions, and case 6 (-40 / -50, ours) crosses below zero. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 2,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${OFFICIAL + 1}-${CASES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
