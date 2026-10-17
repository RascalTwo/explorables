// #59 · Goldilocks Zone — three formulas in a row; the only decision is WHEN you round.
// Mass -> luminosity (m^3.5) -> its square root -> two scaled copies. Nothing to search,
// order or count, so the problem is arithmetic plus one discipline: round ONLY the two
// outputs, never what feeds them. The official set catches one slip and misses the other:
//   - rounding sqrt(L) before scaling: goldilocksZone(20) comes back [179.69, 259.14]
//     where the grader wants 259.13, so the fifth official case catches it.
//   - rounding the luminosity first: every official mass survives it (0.5, 6, 3.7, 20 all
//     still round to the right pair), so the grader is green on a wrong function.
//     0.3 is ours: the right answer is [0.12, 0.17], the early-rounded one [0.1, 0.14].
// (Also: toFixed(2) hands back strings and deepEqual against numbers fails; that one
// is loud, so the demo does not stage it.)
// Side fact, checked rather than assumed: sqrt(m^3.5) is m^1.75, and 0.95 * m ** 1.75
// rounds to the same pair as the statement's three steps for every mass from 0.01 to 30
// in steps of 0.01. The code keeps the statement's steps because they are what a reader
// can check against it.
// ONE approach, deliberately. The m^1.75 shortcut is the same three steps with one
// deleted, an edit rather than a second mental model, and there is no cost gap to watch
// (CONTRIBUTING Tier 3 §1-§3), so a second tab would be a strawman.
// Click 20, then 0.3, and read the red rows: each wrong rounding shows what it returns.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   "0.3" — ours. The dim-star case the official set cannot see: luminosity is 0.0148,
//     which rounds to 0.01, so rounding it first drags the whole zone inward.
//   "0.08" — ours. A red dwarf whose zone is [0.01, 0.02] AU: the two ends are one
//     rounding step apart, the narrowest answer the function can give that is not equal.
const CASES = ["1", "0.5", "6", "3.7", "20", "0.3", "0.08"];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

// The grader's own answers, so the demo shows a verdict rather than asking you to
// take its word for it. Only the official masses have one.
const EXPECTED: Record<string, [number, number]> = {
  "1": [0.95, 1.37],
  "0.5": [0.28, 0.41],
  "6": [21.85, 31.51],
  "3.7": [9.38, 13.52],
  "20": [179.69, 259.13],
};

const round = (x: number) => Math.round(x * 100) / 100;

// The graded function, plus the two wrong roundings so the demo can show them.
//   "ok"    — round the two outputs, nothing else.
//   "root"  — round sqrt(L) before scaling it.
//   "lum"   — round L before taking its root.
function zone(mass: number, how: "ok" | "root" | "lum" = "ok") {
  const lum = how === "lum" ? round(mass ** 3.5) : mass ** 3.5;
  const root = how === "root" ? round(Math.sqrt(lum)) : Math.sqrt(lum);
  return { lum: mass ** 3.5, root: Math.sqrt(lum), start: 0.95 * root, end: 1.37 * root };
}
const answer = (mass: number, how: "ok" | "root" | "lum" = "ok"): [number, number] => {
  const z = zone(mass, how);
  return [round(z.start), round(z.end)];
};
const fmt = (a: number[]) => `[${a.join(", ")}]`;

// The band is drawn on a log axis, 0.01 to 10,000 AU, because a 0.08 star and a 100 star
// differ by five orders of magnitude and a linear axis would show only one of them.
const LO = -2,
  HI = 4;
const pos = (au: number) =>
  Math.min(100, Math.max(0, ((Math.log10(Math.max(au, 1e-9)) - LO) / (HI - LO)) * 100));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .gz-wrap { display:flex; flex-direction:column; gap:12px; }
    .gz-axis { position:relative; height:54px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); overflow:hidden; }
    .gz-band { position:absolute; top:10px; height:22px; min-width:3px; border-radius:4px; background:var(--good); opacity:.85; }
    .gz-earth { position:absolute; top:4px; bottom:16px; width:2px; background:var(--c2); }
    .gz-earth span { position:absolute; top:-1px; left:5px; font:11px var(--mono); color:var(--c2); white-space:nowrap; }
    .gz-tick { position:absolute; bottom:0; font:10px var(--mono); color:var(--muted); transform:translateX(-50%); padding-bottom:2px; }
    .gz-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .gz-row .exp { flex:1; }
    .gz-row .k { min-width:92px; }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = "20";
  inp.style.width = "110px";
  ctl.append(
    el("span", "ctl-label", "mass ="),
    inp,
    el("span", "ctl-label", "(solar masses, > 0)"),
  );

  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", v);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inp.value = v;
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const raw = inp.value.trim();
    const m = Number(raw);
    out.innerHTML = "";
    if (raw === "" || !Number.isFinite(m) || m <= 0) {
      out.append(
        el(
          "div",
          "note",
          "Enter a positive mass. Zero and negative masses are outside the statement; a negative one makes <code class='inl'>**&nbsp;3.5</code> return NaN.",
        ),
      );
      return;
    }
    const z = zone(m);
    const [a, b] = answer(m);
    const want = EXPECTED[raw];
    const ok = !want || (want[0] === a && want[1] === b);
    const [ra, rb] = answer(m, "root");
    const [la, lb] = answer(m, "lum");
    const badRoot = ra !== a || rb !== b;
    const badLum = la !== a || lb !== b;

    const wrap = el("div", "gz-wrap");
    const line = el("div", "result-line");
    line.append(
      el("span", `badge ${ok ? "ok" : "no"}`, `goldilocksZone(${esc(raw)}) → ${fmt([a, b])}`),
    );
    line.append(
      el(
        "span",
        "more",
        want ? `matches freeCodeCamp's expected ${fmt(want)}` : "luminosity = mass^3.5",
      ),
    );
    wrap.append(line);

    // The band, on a log axis, with Earth's 1 AU for scale.
    const axis = el("div", "gz-axis");
    const l = pos(z.start),
      r = pos(z.end);
    const band = el("div", "gz-band");
    band.style.left = `${l}%`;
    band.style.width = `${Math.max(0, r - l)}%`;
    band.title = `${z.start.toPrecision(5)} to ${z.end.toPrecision(5)} AU`;
    const earth = el("div", "gz-earth", `<span>Earth 1 AU</span>`);
    earth.style.left = `${pos(1)}%`;
    axis.append(band, earth);
    for (let e = LO; e <= HI; e++) {
      const t = el("div", "gz-tick", String(10 ** e));
      t.style.left = `${Math.min(97, Math.max(3, pos(10 ** e)))}%`;
      axis.append(t);
    }
    wrap.append(axis);

    const rows: [string, string, string][] = [
      ["luminosity", `${m} ** 3.5 = ${+z.lum.toPrecision(6)}`, "unrounded"],
      ["√luminosity", String(+z.root.toPrecision(6)), "unrounded"],
      ["start", `0.95 × √L = ${+z.start.toPrecision(6)}`, `→ <b>${a}</b>`],
      ["end", `1.37 × √L = ${+z.end.toPrecision(6)}`, `→ <b>${b}</b>`],
    ];
    const tbl = el("div");
    rows.forEach(([k, calc, to]) =>
      tbl.append(
        el(
          "div",
          "srow gz-row",
          `<span class="k">${k}</span><span class="exp mono">${calc}</span><span class="mono">${to}</span>`,
        ),
      ),
    );
    wrap.append(tbl);

    if (badRoot)
      wrap.append(
        el(
          "div",
          "gz-warn",
          `Round √luminosity to ${round(Math.sqrt(m ** 3.5))} before scaling it and this returns <b>${fmt([ra, rb])}</b>, not <b>${fmt([a, b])}</b>.`,
        ),
      );
    if (badLum)
      wrap.append(
        el(
          "div",
          "gz-warn",
          `Round the luminosity to ${round(m ** 3.5)} before the square root and this returns <b>${fmt([la, lb])}</b>, not <b>${fmt([a, b])}</b>.`,
        ),
      );

    wrap.append(el("div", "note", noteFor(raw, m, z, [a, b], badRoot, badLum)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing to get wrong.
function noteFor(
  raw: string,
  m: number,
  z: ReturnType<typeof zone>,
  [a, b]: [number, number],
  badRoot: boolean,
  badLum: boolean,
) {
  if (m === 1)
    return `A one-solar-mass star has luminosity <code class='inl'>1 ** 3.5 = 1</code> and a root of 1, so the two constants <i>are</i> the answer: <b>${fmt([a, b])}</b>. This is the one input where the formula can be checked by eye, and it is the statement's own example.`;
  if (b - a <= 0.011)
    return `Luminosity <b>${z.lum.toPrecision(3)}</b>: this star is thousands of times dimmer than the Sun, so its zone is <b>${fmt([a, b])}</b> AU, only one rounding step wide. Round the luminosity first and it becomes ${round(m ** 3.5)}; the answer collapses to <b>${fmt(answer(m, "lum"))}</b>. The tighter the numbers, the more a rounding in the middle costs.`;
  if (badLum)
    return `Luminosity is <b>${z.lum.toPrecision(3)}</b>, and rounded to two places it is <b>${round(m ** 3.5)}</b>: a ${Math.round((Math.abs(round(m ** 3.5) - z.lum) / z.lum) * 100)}% error before the root is even taken. It is only one rounding and every later step inherits it, so the zone comes out as <b>${fmt(answer(m, "lum"))}</b> instead of <b>${fmt([a, b])}</b>. No official mass is dim enough to notice, which is why <code class='inl'>${esc(raw)}</code> is ours.`;
  if (badRoot)
    return `Here the early rounding is caught by the grader. √L is <b>${z.root.toPrecision(6)}</b>; rounded to <b>${round(z.root)}</b> and then multiplied by 1.37, the end becomes <b>${answer(m, "root")[1]}</b> where the true value ${z.end.toPrecision(7)} rounds to <b>${b}</b>. A rounding error is multiplied by whatever scales it afterwards, so it is cheaper to carry full precision to the end and round once.`;
  if (m < 1)
    return `A dim star: luminosity falls <i>faster</i> than mass (<code class='inl'>${m} ** 3.5 = ${z.lum.toPrecision(3)}</code>), so half the mass gives about a tenth of the light and a zone <b>${fmt([a, b])}</b> AU that sits inside Earth's orbit. Exponent 3.5 on a number below 1 shrinks it, and the square root takes back half of that shrink.`;
  return `A brighter star: luminosity <b>${z.lum.toPrecision(4)}</b> grows much faster than mass, but the square root takes half the exponent back, so the zone scales like <code class='inl'>mass ** 1.75</code> and lands at <b>${fmt([a, b])}</b> AU. The zone is always the same shape; only its distance from the star changes.`;
}

// ── STEP — three formulas, one rounding ─────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">goldilocksZone</span>(<span class="tok" data-t="arg">mass</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> luminosity = <span class="tok" data-t="lum">mass ** 3.5</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> root = <span class="tok" data-t="root">Math.<span class="fn">sqrt</span>(luminosity)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> start = <span class="tok" data-t="start">0.95 * root</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> end = <span class="tok" data-t="end">1.37 * root</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">const</span> <span class="fn">round</span> = <span class="tok" data-t="round">(x) =&gt; Math.<span class="fn">round</span>(x * 100) / 100</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">[<span class="fn">round</span>(start), <span class="fn">round</span>(end)]</span>;`,
  },
  { ln: 8, html: `}` },
];

function trace(rawInput: string) {
  const mass = Number(rawInput);
  const z = zone(mass);
  const [a, b] = answer(mass);
  const steps: DbgStep[] = [];
  const g = (x: number) => Number(x.toPrecision(6)); // keep the state panel readable
  const have: Record<string, unknown> = {};

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
    const vars: Record<string, unknown> = { mass };
    ["luminosity", "root", "start", "end", "round"].forEach((k, i) => {
      if (line >= i + 2) vars[k] = have[k];
    });
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `goldilocksZone(${mass})`,
          vars,
          changed: x.changed ?? [],
          structs:
            line >= 7
              ? [{ label: "[start, end] before rounding", items: [g(z.start), g(z.end)] }]
              : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Three formulas in a row, each feeding the next: mass to luminosity, luminosity to its root, the root to the two ends of the zone. No branch and no loop, so the only choice left is <i>when to round</i>. The answer is: once, at the very end.`,
    { focus: "arg" },
  );

  have["luminosity"] = g(z.lum);
  S(
    2,
    `<code class='inl'>${mass} ** 3.5</code> is <b>${g(z.lum)}</b>. Luminosity climbs far faster than mass, because the exponent is 3.5: ${mass < 1 ? "a star below one solar mass is far dimmer than its mass suggests" : mass === 1 ? "one solar mass is the fixed point, since 1 to any power is 1" : "a star heavier than the Sun is vastly brighter"}. This value is kept unrounded: rounding it to ${round(z.lum)} here would feed that error through the root and both ends.`,
    { focus: "lum", changed: ["luminosity"] },
  );

  have["root"] = g(z.root);
  S(
    3,
    `<code class='inl'>Math.sqrt</code> gives <b>${g(z.root)}</b>. A zone distance grows with the square root of the light because the light a planet receives falls with the square of its distance: to get the same flux from a brighter star you stand √L times as far away. Still no rounding: this is the value the next two lines multiply, so any error here is multiplied by 0.95 and by 1.37.`,
    { focus: "root", changed: ["root"] },
  );

  have["start"] = g(z.start);
  S(
    4,
    `The inner edge is <b>0.95 × ${g(z.root)} = ${g(z.start)}</b> AU: closer than this, water boils. It still has its full precision. The shape of the zone is a fixed pair of ratios, 0.95 and 1.37, and only √L moves it.`,
    { focus: "start", changed: ["start"] },
  );

  have["end"] = g(z.end);
  S(
    5,
    `The outer edge is <b>1.37 × ${g(z.root)} = ${g(z.end)}</b> AU: farther than this, water freezes. Both ends come from the same root, so the zone's width is always 0.42 × √L and a dim star has a narrow one.`,
    { focus: "end", changed: ["end"] },
  );

  have["round"] = "(x) => …";
  S(
    6,
    `Defining the rounding as a function costs nothing and shows where it will be used: <code class='inl'>Math.round(x * 100) / 100</code> shifts two decimals up, rounds to a whole number, and shifts back. It returns a <i>number</i>; <code class='inl'>x.toFixed(2)</code> would return a string, and the grader compares with <code class='inl'>deepEqual</code> against numbers.`,
    { focus: "round", changed: ["round"] },
  );

  const res = fmt([a, b]);
  S(
    7,
    `Round the two outputs and nothing else: <b>${g(z.start)} → ${a}</b> and <b>${g(z.end)} → ${b}</b>, so <b>return ${res}</b>. ${
      mass === 1
        ? "The Sun-like case needs no real rounding at all."
        : "Every earlier line kept full precision, and that is the reason this is the answer the grader expects. Round √L or the luminosity above and the pair can shift by a hundredth or more."
    }`,
    { focus: "ret", done: true, result: res, ret: { value: res } },
  );
  return steps;
}

export default {
  n: 59,
  id: "goldilocks-zone",
  title: "Goldilocks Zone",
  dates: ["2025-10-08"],
  statement: `Given the <b>mass</b> of a star, return an array <code class="inl">[start, end]</code> with the inner and outer distance of its Goldilocks zone in astronomical units. Luminosity is the mass raised to the power <b>3.5</b>. The zone starts at <b>0.95 ×</b> the square root of the luminosity and ends at <b>1.37 ×</b> the square root of the luminosity. Round both distances to two decimal places. <span class="rule">Example: <code class="inl">goldilocksZone(1)</code> → <code class="inl">[0.95, 1.37]</code> — luminosity is 1<sup>3.5</sup> = 1 and its root is 1, so the two constants are the answer. For mass 0.5: luminosity 0.0884, root 0.2973, giving <code class="inl">[0.28, 0.41]</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — three formulas",
      approach: `Mass to luminosity to square root to two scaled copies. No branch, no loop, so the decision that matters is <b>when to round</b>: only the two returned values, never anything that feeds them. Both slips are shown as red rows. <b>Rounding √luminosity first</b> is caught by the official set: <code class='inl'>goldilocksZone(20)</code> then ends at 259.14 where the grader wants 259.13. <b>Rounding the luminosity first</b> passes every official mass, so the grader is green on a wrong function. <code class='inl'>0.3</code> is ours: the right answer is [0.12, 0.17] and the early-rounded one [0.1, 0.14]. The rounding is <code class='inl'>Math.round(x * 100) / 100</code>, which returns a number; <code class='inl'>toFixed(2)</code> returns a string and fails <code class='inl'>deepEqual</code>. <code class='inl'>0.08</code> (ours) gives [0.01, 0.02], a zone as narrow as the rounding step. The band on the log axis is drawn from the unrounded values.`,
      code: `// Mass -> luminosity -> root -> two scaled copies. Round only the outputs.
function goldilocksZone(mass: number): number[] {
  const luminosity = mass ** 3.5;
  const root = Math.sqrt(luminosity);
  const start = 0.95 * root;
  const end = 1.37 * root;
  const round = (x: number) => Math.round(x * 100) / 100;   // a number; toFixed gives a string
  return [round(start), round(end)];                        // the only rounding
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `The function one formula per line, with each constant appearing in the panel only once its line has run and the unrounded pair shown just before the return. Start on <b>20</b>, official, whose last digit is where an early rounding shows. <b>1</b> is the statement's example and the one input where every step is exact. <b>0.5</b>, <b>6</b> and <b>3.7</b> are the other official cases. <b>0.3</b> and <b>0.08</b> are ours: dim stars, where an early rounding destroys the answer. The mass box is a text field, so decimals work. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "mass =",
            value: "20",
            presets: CASES,
            hint: "a positive number",
          },
        }),
    },
  ],
} satisfies Challenge;
