// #61 · Launch Fuel — fuel needs a fifth of itself in fuel; stop under 1 kg, still carry it.
// The statement IS the algorithm: fuel for the payload is payload / 5, that fuel has mass so
// it needs a fifth of itself, which needs a fifth of THAT, until the newest load is under 1 kg.
// Three readings go wrong, and none of them is exotic:
//   - the tempting closed form is m / 4 (the infinite series m/5 + m/25 + ...). It is wrong
//     here: the statement stops early, so launchFuel(50) is 12.4 and not 12.5. Every official
//     case differs from m / 4 by up to 0.25, so the grader catches it.
//   - the load under 1 kg is still ADDED. "Stop when it is less than 1" ends the loop, not the
//     bookkeeping: the statement's own 50 kg example adds the 0.4 before it stops.
//   - "less than 1" means a load of exactly 1 kg keeps going (>= 1). The official set never
//     sends a 1.0, so it cannot tell >= from >. 125 kg is ours: 25, 5, 1, 0.2 -> 31.2, not 31.
// ONE approach, deliberately. A closed form for the truncated sum exists - K = floor(log5 m) + 1
// rounds, total = m/4 * (1 - 5^-K) - but it is the same loop with the round count computed by a
// float log, and Math.log(125) / Math.log(5) is 3.0000000000000004, so it is wrong at exactly the
// powers of five that the >= vs > question is about. The gap is also not visible: the loop runs
// about one round per factor of five, 13 for a billion kg, so there is no cost you could watch
// (CONTRIBUTING Tier 3 §1/§3). A second tab would be a strawman.
// Click "50", then read the red rows: the m / 4 shortcut says 12.5, dropping the last load says 12.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   125 - ours. The mass whose rounds are 25, 5, EXACTLY 1, 0.2: the boundary the official
//     set cannot see, because >= 1 and > 1 agree on every official input.
//   4 - ours. The very first load is already 0.8 kg, so there are no rounds of "keep going":
//     the loop never runs and the one load is still carried. The shortcut answers 1.
const CASES = [50, 500, 243, 11000, 6214, 125, 4];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<number, number> = {
  50: 12.4,
  500: 124.8,
  243: 60.7,
  11000: 2749.8,
  6214: 1553.4,
};

const MAX = 1e9; // 13 rounds: still instant, still a table you can read
const r1 = (x: number) => Math.round(x * 10) / 10;
// 10 significant digits hides the float dust a repeated /5 leaves (60.7048000000001).
const fm = (x: number) => String(Number(x.toPrecision(10)));

// Every fuel load, in order. `go` decides whether a load that has just been computed is
// followed by another round; the last load is always included.
function loads(m: number, go: (e: number) => boolean = (e) => e >= 1) {
  const out: number[] = [];
  let e = m / 5;
  while (go(e)) {
    out.push(e);
    e /= 5;
  }
  out.push(e);
  return out;
}
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .lf-wrap { display:flex; flex-direction:column; gap:12px; }
    .lf-rows { display:flex; flex-direction:column; gap:4px; }
    .lf-row { display:grid; grid-template-columns:54px 1fr 1fr; gap:10px; align-items:baseline; font:13px var(--mono); padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--panel-2); }
    .lf-row .k { color:var(--muted); }
    .lf-row.last { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent); }
    .lf-row.one { border-color:var(--warn); }
    .lf-row .tag2 { color:var(--accent); font-family:var(--sans); font-size:12px; }
    .lf-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .lf-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .lf-r b { color:var(--text); }
    .lf-r.hot { border-color:var(--danger); color:var(--danger); }
    .lf-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let m = 50;

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "number";
  inp.min = "0";
  inp.max = String(MAX);
  inp.value = String(m);
  inp.style.width = "150px";
  ctl.append(
    el("span", "ctl-label", "payload kg ="),
    inp,
    el("span", "ctl-label", "(0 to 1,000,000,000)"),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", String(v));
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      m = v;
      inp.value = String(v);
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  // Keep the last good value while the box is empty or mid-edit, instead of rendering NaN.
  inp.addEventListener("input", () => {
    const v = +inp.value;
    if (inp.value.trim() !== "" && !Number.isNaN(v)) m = Math.min(MAX, Math.max(0, v));
    render();
  });
  render();

  function render() {
    const ls = loads(m);
    const total = sum(ls);
    const result = r1(total);
    const want = EXPECTED[m];
    const wrap = el("div", "lf-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `launchFuel(${fm(m)}) → ${fm(result)}`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected ${want}`));
    line.append(
      el(
        "span",
        "opcount cool",
        `<span class="n">${ls.length}</span> ${ls.length === 1 ? "load" : "loads"} · ${ls.length} divide + add`,
      ),
    );
    wrap.append(line);

    // The statement's own table: each load of fuel, what it needs, the running total.
    const rows = el("div", "lf-rows");
    let run = 0;
    ls.forEach((e, i) => {
      run += e;
      const lastRow = i === ls.length - 1;
      const lift = i === 0 ? m : ls[i - 1]!;
      rows.append(
        el(
          "div",
          `lf-row${lastRow ? " last" : ""}${e === 1 ? " one" : ""}`,
          `<span class="k">#${i + 1}</span><span>${fm(lift)} kg ÷ 5 = <b>${fm(e)}</b> kg fuel${
            lastRow ? ` <span class="tag2">under 1 kg: stop, but it is still carried</span>` : ""
          }</span><span class="k">total ${fm(run)}</span>`,
        ),
      );
    });
    wrap.append(rows);

    // The wrong readings, scored on the same input.
    const short = r1(m / 4);
    const dropLast = r1(sum(ls.slice(0, -1)));
    const strict = r1(sum(loads(m, (e) => e > 1)));
    const cmp = el("div", "lf-cmp");
    (
      [
        [`m ÷ 4 shortcut`, short],
        [`drop the final load`, dropLast],
        [`stop at &gt; 1 instead of ≥ 1`, strict],
      ] as [string, number][]
    ).forEach(([name, v]) =>
      cmp.append(
        el(
          "div",
          `lf-r${v !== result ? " hot" : ""}`,
          `${name} <b>${fm(v)}</b>${v !== result ? " ✗" : ""}`,
        ),
      ),
    );
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(m, ls, result, short, strict)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every preset was picked to land on a different one.
function noteFor(m: number, ls: number[], result: number, short: number, strict: number) {
  if (strict !== result)
    return `One load is <b>exactly 1</b> kg (<code class='inl'>${ls.map(fm).join(", ")}</code>). The statement stops when the next fuel is <i>less than</i> 1, and 1 is not less than 1, so this round still runs and one more load, <b>${fm(ls.at(-1)!)}</b>, follows. Write <code class='inl'>&gt; 1</code> and the loop stops a round early at <b>${fm(strict)}</b> instead of <b>${fm(result)}</b>. Every official input happens to skip over 1.0 exactly, so the grader cannot tell the two apart; this one is ours.`;
  if (ls.length === 1)
    return `The first load is already <b>${fm(ls[0]!)}</b> kg, under 1, so <code class='inl'>extra &gt;= 1</code> is false at once and the loop body never runs. The load is <i>still carried</i>: the answer is <b>${fm(result)}</b>, which is what the code's last line adds. A version that only adds inside the loop would return <b>0</b> here. The ÷ 4 shortcut says <b>${fm(short)}</b>, because it believes in a tail that the statement cut off.`;
  if (m === 50)
    return `The statement's own example, and it settles the two big questions. 50 → 10 → 2 → <b>0.4</b>: the 0.4 is under 1 kg, so the loop stops, but it was already computed and it is added, giving <b>12.4</b>. The tempting closed form <code class='inl'>m / 4</code> sums the infinite series and gets <b>12.5</b>: the 0.1 gap is every load the statement refuses to compute, 0.08 + 0.016 + …. Leave the last 0.4 out and it is <b>12.0</b>.`;
  return `<b>${ls.length}</b> loads, each a fifth of the one before it, so they shrink geometrically and the loop count is about log<sub>5</sub> of the payload: doubling the mass almost never adds a round. The sum is <b>${fm(sum(ls))}</b> and the answer is <b>${fm(result)}</b>, rounded <i>once, at the end</i> with <code class='inl'>Math.round(total * 10) / 10</code>. The ÷ 4 shortcut gives <b>${fm(short)}</b>: ${short === result ? "it happens to agree on this input, because the tail it adds is under 0.05, which is why one lucky case proves nothing" : `it overshoots by the ${fm(m / 4 - sum(ls))} kg tail the statement never computes`}.`;
}

// ── STEP — the do-the-load, divide-by-five loop ─────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">launchFuel</span>(<span class="tok" data-t="arg">payload</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> extra = <span class="tok" data-t="first">payload / 5</span>;`,
  },
  { ln: 3, html: `  <span class="k">let</span> total = <span class="tok" data-t="zero">0</span>;` },
  {
    ln: 4,
    html: `  <span class="k">while</span> (<span class="tok" data-t="test">extra &gt;= 1</span>) {`,
  },
  { ln: 5, html: `    total += <span class="tok" data-t="add">extra</span>;` },
  { ln: 6, html: `    extra /= <span class="tok" data-t="next">5</span>;` },
  { ln: 7, html: `  }` },
  {
    ln: 8,
    html: `  total += <span class="tok" data-t="last">extra</span>;`,
  },
  {
    ln: 9,
    html: `  <span class="k">return</span> <span class="tok" data-t="round">Math.<span class="fn">round</span>(total * 10) / 10</span>;`,
  },
  { ln: 10, html: `}` },
];

function trace(payload: number) {
  const steps: DbgStep[] = [];
  let extra = 0;
  let sumSoFar = 0;
  const added: string[] = [];

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
    const vars: Record<string, unknown> = { payload: fm(payload) };
    if (line >= 2) vars["extra"] = fm(extra); // `let extra` is line 2
    if (line >= 3) vars["total"] = fm(sumSoFar); // `let total` is line 3
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `launchFuel(${fm(payload)})`,
          vars,
          changed: x.changed ?? [],
          // The loads carried so far: exists from `total` on, then only grows.
          structs:
            line >= 3
              ? [{ label: "fuel loads carried (kg)", items: [...added], newest: true }]
              : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Launching <b>${fm(payload)}</b> kg takes <b>payload / 5</b> kg of fuel, but fuel has mass: that fuel needs a fifth of <i>itself</i> in more fuel, and that needs a fifth of itself, and so on. Each new load is a fifth of the one before, so the loads shrink fast. The only questions are where to stop and whether the load you stop on still counts.`,
    { focus: "arg" },
  );

  extra = payload / 5;
  S(
    2,
    `One fifth of <b>${fm(payload)}</b> is <b>${fm(extra)}</b> kg: the fuel to lift the payload. From here on <code class='inl'>extra</code> means "the newest load of fuel", because the payload itself is never lifted again. Only the fuel just added still needs lifting.`,
    { focus: "first", changed: ["extra"] },
  );

  S(
    3,
    `<code class='inl'>total</code> starts at 0 and will hold the fuel carried. It is a separate variable from <code class='inl'>extra</code> because the two move differently: <code class='inl'>extra</code> shrinks by 5× each round, <code class='inl'>total</code> only grows.`,
    { focus: "zero", changed: ["total"] },
  );

  let rounds = 0;
  while (extra >= 1) {
    S(
      4,
      `<b>${fm(extra)} &gt;= 1</b>: this load is a full kilogram or more, so it needs a load of its own to lift (<b>${fm(extra / 5)}</b> kg), and the loop runs again. The statement stops when the additional fuel is <i>less than</i> 1, so a load of exactly 1 kg still counts as "keep going" - hence <code class='inl'>&gt;=</code>.`,
      { focus: "test", eval: { expr: `${fm(extra)} >= 1`, val: true } },
    );
    rounds++;
    sumSoFar += extra;
    added.push(fm(extra));
    S(
      5,
      `Carry it: <b>${fm(extra)}</b> goes into <code class='inl'>total</code>, now <b>${fm(sumSoFar)}</b>. Adding happens <i>before</i> the divide, so every load that was big enough to need lifting is counted exactly once.`,
      { focus: "add", changed: ["total"] },
    );
    extra /= 5;
    S(
      6,
      `Lifting that fuel needs a fifth of it: <b>${fm(extra)}</b> kg. Note it is a fifth of the <i>previous load</i>, not of the whole mass so far - the payload's fuel is already counted, and only the new mass is new work.`,
      { focus: "next", changed: ["extra"] },
    );
  }

  S(
    4,
    `<b>${fm(extra)} &gt;= 1</b> is false: the newest load is under a kilogram, so the statement says stop after ${rounds} full round${rounds === 1 ? "" : "s"}.${rounds === 0 ? " That is already true on the first load, so the loop never ran." : ""}`,
    { focus: "test", eval: { expr: `${fm(extra)} >= 1`, val: false } },
  );

  sumSoFar += extra;
  added.push(fm(extra));
  S(
    8,
    `Stopping is not the same as discarding. This last load, <b>${fm(extra)}</b> kg, is already worked out and the rocket does carry it, so it is added too: <code class='inl'>total</code> is <b>${fm(sumSoFar)}</b>. The statement's own 50 kg example does exactly this (the 0.4). Leave this line out and every answer comes back short by that load.`,
    { focus: "last", changed: ["total"] },
  );

  const ans = Math.round(sumSoFar * 10) / 10;
  S(
    9,
    `<b>Return ${fm(ans)}.</b> Rounding happens once, here, on the exact total <b>${fm(sumSoFar)}</b>. Rounding each load as it is computed would let the errors pile up. The shortcut <code class='inl'>m / 4</code> would answer <b>${fm(r1(payload / 4))}</b>: it sums the infinite series, but the statement stopped it.`,
    { focus: "round", done: true, result: fm(ans), ret: { value: fm(ans) } },
  );

  return steps;
}

export default {
  n: 61,
  id: "launch-fuel",
  title: "Launch Fuel",
  dates: ["2025-10-10"],
  statement: `Given the mass in kg of a <b>payload</b>, return the fuel needed to send it to orbit. A rocket needs <b>1 kg of fuel per 5 kg</b> it must lift, but <b>fuel has mass</b>: lifting the fuel needs more fuel, and so on. Start with the payload, work out its fuel, then work out the fuel for <i>that</i>, and repeat <b>until the additional fuel is less than 1 kg</b>, then stop. Ignore the rocket's own mass. Return the total fuel <b>rounded to one decimal place</b>. <span class="rule">Example: <code class="inl">launchFuel(50)</code> → <code class="inl">12.4</code> — 50 ÷ 5 = 10 kg, which needs 2 kg, which needs 0.4 kg; that is under 1, so stop. 10 + 2 + 0.4 = 12.4.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(log n) — one divide per factor of five",
      approach: `The statement is the algorithm, so the interesting part is the three places where a plausible reading goes wrong. <b>The closed form is a trap.</b> The loads are <code class='inl'>m/5 + m/25 + m/125 + …</code>, an infinite geometric series that sums to <code class='inl'>m / 4</code>, and it is tempting to skip the loop. But the statement <i>stops</i> the series early, so the answer is a little short of that: 50 kg is <b>12.4</b>, not 12.5. The gap is the unborn tail and is always under a quarter of a kilogram, so on most inputs it shows in the first decimal. An exact formula for the truncated sum needs the round count, <code class='inl'>⌊log₅ m⌋ + 1</code>, and a float <code class='inl'>log</code> gets that wrong at exactly the powers of five (<code class='inl'>Math.log(125) / Math.log(5)</code> is 3.0000000000000004), so it is not worth a tab: the loop is at most 13 rounds for a billion kilograms. <b>The last load still counts.</b> "Repeat until the additional fuel is less than 1" ends the loop, not the bookkeeping: the 0.4 in the statement's own example is added. That is the extra line after the loop. <b>Exactly 1 keeps going.</b> "Less than 1" means <code class='inl'>&gt;= 1</code> continues, and the official set never produces a load of exactly 1.0, so it cannot tell it from <code class='inl'>&gt; 1</code>; <b>125</b> (ours: 25, 5, 1, 0.2) is the boundary. <b>4</b> (ours) is the other edge: the first load is already 0.8, so the loop never runs and the answer is still 0.8. Round once, at the very end, with <code class='inl'>Math.round(x * 10) / 10</code>. The demo prints the statement's own table of loads, scores the three wrong readings on the same input in red, and counts the loads.`,
      code: `// Each load of fuel needs a fifth of itself in more fuel. Loop while the newest load is
// at least 1 kg; the load that is under 1 kg ends the loop but is still carried.
function launchFuel(payload: number): number {
  let extra = payload / 5;   // fuel to lift the payload
  let total = 0;
  while (extra >= 1) {       // >= 1: a load of exactly 1 kg still needs lifting
    total += extra;
    extra /= 5;              // lifting that fuel takes a fifth of it
  }
  total += extra;            // the final load is under 1 kg and still counts
  return Math.round(total * 10) / 10;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "one load per round",
      approach: `The loop one load per round, with <code class='inl'>extra</code> and <code class='inl'>total</code> appearing in the panel only once their lines have run, and every load carried so far shown as a row of boxes. Start on <b>50</b>, the statement's own example: 10, then 2, then 0.4, and watch line 8 add that 0.4 after the loop has already decided to stop. <b>500</b>, <b>243</b>, <b>11000</b> and <b>6214</b> are the other official cases, and 6214 is six loads of unround numbers. <b>125</b> is ours: one load is exactly 1.0, and the test on line 4 has to say true. <b>4</b> is ours too: line 4 is false on the very first visit and the answer is still 0.8. Type any payload up to a billion. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "payload kg =",
            value: 50,
            min: 0,
            max: MAX,
            presets: CASES,
            hint: "0 to 1,000,000,000",
          },
        }),
    },
  ],
} satisfies Challenge;
