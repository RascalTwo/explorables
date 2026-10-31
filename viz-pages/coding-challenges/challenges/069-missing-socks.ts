// #69 · Missing Socks — simulate the wash cycles one by one, and floor the sock count at zero.
// The four rules overlap (cycle 10 fires three of them), and the floor makes the order matter:
// "you can never have less than zero socks" means a lost sock from an empty drawer vanishes,
// it does not become a debt a later found sock has to pay off. So the count is clamped at every
// decrement, not once at the end, and pairs are only read at the very end as floor(socks / 2).
//   socks = pairs * 2
//   for c in 1..cycles:  c%2 lose 1 · c%3 find 1 · c%5 wear out 1 · c%10 buy 2
// Two readings go wrong:
//   - No floor: (1, 8) dips to -1 on cycle 6, finds one back, and ends at -1 socks, so Math.floor
//     gives -1 pairs instead of 0. Official case (1, 8) catches it; the demo prints this figure.
//   - Counting pairs instead of socks: the rules move ONE sock at a time, so an odd count
//     (3 socks = 1 pair + a stray) has to be representable until the final floor(/ 2).
// ONE approach, deliberately. Because of the floor there is no closed form for the count (it
// is a running clamp, not a sum), and a cycle-by-cycle loop is already O(cycles); a precomputed
// table or a reduce() is the same loop respelled, with nothing on screen to compare
// (CONTRIBUTING Tier 3 §1-§3). A second tab would be a strawman.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   6 (0, 4)  ours: empty drawer, the floor eats a loss on cycle 2; no-floor ends at -1 pairs
//   7 (3, 10) ours: cycle 10 fires lose, wear out and buy together, the statement's own example
const CASES: [number, number][] = [
  [2, 5],
  [1, 2],
  [5, 11],
  [6, 25],
  [1, 8],
  [0, 4],
  [3, 10],
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED = [1, 0, 4, 3, 0];
const MAX_CYCLES = 60; // keeps the strip and the trace readable

// One wash cycle's events, in the statement's order.
const events = (c: number) => ({
  lose: c % 2 === 0,
  find: c % 3 === 0,
  wear: c % 5 === 0,
  buy: c % 10 === 0,
});

// Run the cycles; `floor` false is the wrong reading, scored on the same input.
function run(pairs: number, cycles: number, floor = true) {
  const down = (s: number) => (floor ? Math.max(0, s - 1) : s - 1);
  let socks = pairs * 2;
  const after: number[] = [];
  for (let c = 1; c <= cycles; c++) {
    const e = events(c);
    if (e.lose) socks = down(socks);
    if (e.find) socks++;
    if (e.wear) socks = down(socks);
    if (e.buy) socks += 2;
    after.push(socks);
  }
  return { socks, pairs: Math.floor(socks / 2), after };
}

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sk-wrap { display:flex; flex-direction:column; gap:12px; }
    .sk-strip { display:flex; flex-wrap:wrap; gap:4px; }
    .sk-c { width:38px; display:flex; flex-direction:column; align-items:center; gap:1px; font:11px var(--mono); padding:4px 0; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .sk-c b { color:var(--text); font-size:14px; }
    .sk-c i { font-style:normal; min-height:13px; color:var(--accent); }
    .sk-c.zero b { color:var(--warn); }
    .sk-c.hit { border-color:var(--accent); }
    .sk-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let pairs = CASES[0]![0];
  let cycles = CASES[0]![1];

  const num = (v: number, max: number) => {
    const i = el("input");
    i.type = "number";
    i.min = "0";
    i.max = String(max);
    i.value = String(v);
    i.style.width = "70px";
    return i;
  };
  const pIn = num(pairs, 20);
  const cIn = num(cycles, MAX_CYCLES);
  const ctl = el("div", "controls");
  ctl.append(
    el("span", "ctl-label", "pairs ="),
    pIn,
    el("span", "ctl-label", "cycles ="),
    cIn,
    el("span", "ctl-label", `(0..20, 0..${MAX_CYCLES})`),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach(([p, c], i) => {
    const b = el("button", "chip", `(${p}, ${c})`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      pIn.value = String(p);
      cIn.value = String(c);
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  pIn.addEventListener("input", render);
  cIn.addEventListener("input", render);
  render();

  function render() {
    pairs = Math.max(0, Math.min(20, Math.floor(Number(pIn.value) || 0)));
    cycles = Math.max(0, Math.min(MAX_CYCLES, Math.floor(Number(cIn.value) || 0)));
    out.innerHTML = "";
    const r = run(pairs, cycles);
    const bad = run(pairs, cycles, false);
    const idx = CASES.findIndex(([p, c]) => p === pairs && c === cycles);
    const want = idx >= 0 && idx < OFFICIAL ? EXPECTED[idx] : undefined;

    const wrap = el("div", "sk-wrap");
    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === r.pairs ? "ok" : "no"}`,
        `sockPairs(${pairs}, ${cycles}) → ${r.pairs}`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? `${r.socks} loose socks at the end`
          : `${r.socks} socks · matches freeCodeCamp's expected ${want}`,
      ),
    );
    wrap.append(line);

    // One cell per wash cycle: the events that fired and the sock count after them.
    const strip = el("div", "sk-strip");
    strip.append(el("div", "sk-c", `start<i></i><b>${pairs * 2}</b>`));
    r.after.forEach((s, i) => {
      const e = events(i + 1);
      const tag = [e.lose && "-1", e.find && "+1", e.wear && "-1", e.buy && "+2"]
        .filter(Boolean)
        .join(" ");
      const hit = e.lose || e.find || e.wear || e.buy;
      strip.append(
        el(
          "div",
          `sk-c${hit ? " hit" : ""}${s === 0 ? " zero" : ""}`,
          `#${i + 1}<i>${tag}</i><b>${s}</b>`,
        ),
      );
    });
    wrap.append(strip);

    if (bad.pairs !== r.pairs)
      wrap.append(
        el(
          "div",
          "sk-warn",
          `Without the floor at zero the count ends at <b>${bad.socks}</b> socks, which reads as <b>${bad.pairs}</b> pairs, not <b>${r.pairs}</b>. The yellow zeros above are where a loss had nothing to take.`,
        ),
      );
    wrap.append(el("div", "note", noteFor(pairs, cycles, r, bad)));
    out.append(wrap);
  }
}

// What did THIS input exercise?
function noteFor(
  pairs: number,
  cycles: number,
  r: ReturnType<typeof run>,
  bad: ReturnType<typeof run>,
) {
  if (cycles === 0)
    return `No wash cycles: no rule ever fires, so <b>${pairs}</b> pairs stay <b>${pairs}</b>.`;
  if (bad.pairs !== r.pairs)
    return `The drawer hits zero and a loss lands on nothing. The floor throws that loss away; without it the count goes negative and a later found sock only pays off a debt that never existed.`;
  if (cycles >= 10 && cycles % 10 === 0)
    return `Cycle <b>${cycles}</b> is a multiple of 2, 5 and 10 at once: lose one, wear one out and buy a pair all in the same wash, a net of <b>0</b> socks. Overlapping rules are applied one after another, they do not cancel by rule.`;
  if (r.socks % 2 === 1)
    return `<b>${r.socks}</b> socks is an odd number: ${r.pairs} complete pairs and one stray. The rules move a single sock at a time, so the count is kept in socks and only halved at the end.`;
  return `Each cycle applies whichever of the four rules divide it, in order. The count ends at <b>${r.socks}</b> socks, which is <b>${r.pairs}</b> complete pairs.`;
}

// ── STEP — one loop turn per cycle, one step per rule that fires ─────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">sockPairs</span>(<span class="tok" data-t="arg">pairs, cycles</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> socks = <span class="tok" data-t="socks">pairs * 2</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">let</span> c = 1; <span class="tok" data-t="loop">c &lt;= cycles</span>; c++) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="lose">c % 2 === 0</span>) socks = Math.<span class="fn">max</span>(0, socks - 1);`,
  },
  {
    ln: 5,
    html: `    <span class="k">if</span> (<span class="tok" data-t="find">c % 3 === 0</span>) socks++;`,
  },
  {
    ln: 6,
    html: `    <span class="k">if</span> (<span class="tok" data-t="wear">c % 5 === 0</span>) socks = Math.<span class="fn">max</span>(0, socks - 1);`,
  },
  {
    ln: 7,
    html: `    <span class="k">if</span> (<span class="tok" data-t="buy">c % 10 === 0</span>) socks += 2;`,
  },
  { ln: 8, html: `  }` },
  {
    ln: 9,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">Math.<span class="fn">floor</span>(socks / 2)</span>;`,
  },
  { ln: 10, html: `}` },
];

function trace(idx: number) {
  const [pairs, cycles] = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const steps: DbgStep[] = [];
  let socks = 0;
  let c = 0;

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
    const vars: Record<string, unknown> = { pairs, cycles };
    if (line >= 2) vars["socks"] = socks; // `let socks` is line 2
    if (line >= 3 && line <= 8) vars["c"] = c; // `let c` is line 3, out of scope after the loop
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `sockPairs(${pairs}, ${cycles})`,
          vars,
          changed: x.changed ?? [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `<b>${pairs}</b> pairs to start, <b>${cycles}</b> wash cycles to go through. The rules fire on multiples of 2, 3, 5 and 10 and can overlap, so the only safe way to get the answer is to replay the cycles in order.`,
    { focus: "arg" },
  );
  socks = pairs * 2;
  S(
    2,
    `The rules add and remove <i>single</i> socks, so the count is kept in socks, <b>${pairs} * 2 = ${socks}</b>. Pairs only come back at the end, by halving.`,
    { focus: "socks", changed: ["socks"] },
  );

  for (c = 1; c <= cycles; c++) {
    const e = events(c);
    const fired = [e.lose && "lose", e.find && "find", e.wear && "wear out", e.buy && "buy"].filter(
      Boolean,
    );
    S(
      3,
      `Wash cycle <b>${c}</b>: ${
        fired.length > 0
          ? `<b>${fired.join(", ")}</b> fire${fired.length === 1 ? "s" : ""}`
          : "no rule fires (not a multiple of 2, 3, 5 or 10), so the count stays"
      }. Socks so far: <b>${socks}</b>.`,
      { focus: "loop", changed: ["c"], eval: { expr: `${c} <= ${cycles}`, val: true } },
    );
    if (e.lose) {
      const before = socks;
      socks = Math.max(0, socks - 1);
      S(
        4,
        `${c} % 2 is 0, a sock goes missing: <b>${before} → ${socks}</b>.${before === 0 ? " The drawer was empty, so <code class='inl'>Math.max(0, ...)</code> eats the loss: you can never have less than zero socks." : ""}`,
        { focus: "lose", changed: ["socks"], eval: { expr: `${c} % 2 === 0`, val: true } },
      );
    }
    if (e.find) {
      socks++;
      S(
        5,
        `${c} % 3 is 0, a missing sock turns up: <b>${socks - 1} → ${socks}</b>. No floor is needed on a gain.`,
        { focus: "find", changed: ["socks"], eval: { expr: `${c} % 3 === 0`, val: true } },
      );
    }
    if (e.wear) {
      const before = socks;
      socks = Math.max(0, socks - 1);
      S(
        6,
        `${c} % 5 is 0, a sock is worn out and thrown away: <b>${before} → ${socks}</b>.${before === 0 ? " Nothing left to throw, so the floor keeps it at 0." : ""}`,
        { focus: "wear", changed: ["socks"], eval: { expr: `${c} % 5 === 0`, val: true } },
      );
    }
    if (e.buy) {
      socks += 2;
      S(
        7,
        `${c} % 10 is 0, a new pair is bought: <b>${socks - 2} → ${socks}</b>. Cycle 10 has now run lose, wear out and buy in a row; they overlap by design.`,
        { focus: "buy", changed: ["socks"], eval: { expr: `${c} % 10 === 0`, val: true } },
      );
    }
  }
  c = cycles + 1;
  S(3, `<b>${c} &lt;= ${cycles}</b> is false, so the loop ends with <b>${socks}</b> socks.`, {
    focus: "loop",
    eval: { expr: `${c} <= ${cycles}`, val: false },
  });

  const res = Math.floor(socks / 2);
  S(
    9,
    `<b>Return ${res}.</b> ${socks} socks make <code class='inl'>Math.floor(${socks} / 2)</code> = ${res} complete pairs${socks % 2 ? ", with one stray sock that does not count" : ""}.`,
    { focus: "ret", done: true, result: String(res), ret: { value: String(res) } },
  );
  return steps;
}

export default {
  n: 69,
  id: "missing-socks",
  title: "Missing Socks",
  dates: ["2025-10-18"],
  statement: `Given an integer for the number of pairs of socks you started with, and another for how many wash cycles you have gone through, return the number of <b>complete pairs</b> you currently have. Every 2 wash cycles you lose a single sock. Every 3 you find a single missing sock. Every 5 a single sock is worn out and thrown away. Every 10 you buy a pair. You can never have less than zero total socks, and rules can overlap. <span class="rule">Example: <code class="inl">sockPairs(2, 5)</code> → <code class="inl">1</code> — 4 socks, then cycles 2 and 4 lose one each, cycle 3 finds one, cycle 5 wears one out: 2 socks left, 1 pair.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(cycles)",
      approach: `Replay the wash cycles in order, keeping the count in <b>socks</b>, not pairs, because every rule moves a single sock. Each cycle applies the rules whose number divides it (<code class='inl'>c % 2</code> lose, <code class='inl'>c % 3</code> find, <code class='inl'>c % 5</code> wear out, <code class='inl'>c % 10</code> buy two), and overlaps simply happen one after another. The floor is the trap: clamp with <code class='inl'>Math.max(0, ...)</code> at every decrement, because a loss from an empty drawer is gone, not a debt. Skip it and official case <b>(1, 8)</b> ends at -1 socks and returns -1; the yellow zeros and the red line under the demo show it. Type any pairs and cycles or click a case: the first five are freeCodeCamp's, <b>(0, 4)</b> is ours (starts empty), and <b>(3, 10)</b> is ours (cycle 10 fires three rules at once).`,
      code: `// Replay the cycles in order; count socks, halve only at the end.
function sockPairs(pairs: number, cycles: number): number {
  let socks = pairs * 2;
  for (let c = 1; c <= cycles; c++) {
    if (c % 2 === 0) socks = Math.max(0, socks - 1); // lose one, never below zero
    if (c % 3 === 0) socks++;                         // find one
    if (c % 5 === 0) socks = Math.max(0, socks - 1); // worn out, never below zero
    if (c % 10 === 0) socks += 2;                     // buy a pair
  }
  return Math.floor(socks / 2);
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "cycle by cycle",
      approach: `The loop one rule at a time, with <code class='inl'>socks</code> appearing once line 2 has run and <code class='inl'>c</code> only inside the loop. A cycle with no rule costs a single step; a cycle that fires costs one step per rule. Start on <b>case 5</b>, (1, 8): watch cycle 6, where the count is already 0 when the loss lands and the floor on line 4 matters. <b>Case 7</b>, (3, 10), ends on cycle 10 firing lines 4, 6 and 7 together. <b>Case 6</b>, (0, 4), is ours and starts empty. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 1,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1–${CASES.length}: 1–${OFFICIAL} official, the rest ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
