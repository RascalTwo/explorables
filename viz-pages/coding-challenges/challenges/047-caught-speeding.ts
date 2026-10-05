// #47 · Caught Speeding — average the excess of the speeders, not the speeds of everyone.
// Three small decisions hide in a filter-then-mean: the comparison is STRICT (a car
// exactly at the limit is not speeding — two official cases sit on that edge), the
// quantity averaged is the EXCESS over the limit (so the speeders are filtered first
// and the limit subtracted, never a mean of all vehicles), and an empty speeder list
// needs a guard, because 0 / 0 is NaN and the statement's "[0, 0]" is that guard
// written down. Subtract the limit before averaging or after, the mean is identical;
// what matters is dividing by the speeder count and not the vehicle count.
// ONE approach, deliberately. A running-sum loop and a filter/map/reduce chain are
// the same single pass respelled, not a second mental model (Tier 3 §2), and nothing
// here can be made visibly wasteful without making it wrong (Tier 3 §1).
// Click "no vehicles at all" — ours — to watch the unguarded version return NaN.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep, DbgStruct } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   [], 60 — ours. The official set never has an empty list, but its "no speeders"
//     bullet is really a statement about the divisor: with zero speeders the mean
//     is 0 / 0 = NaN, so the guard is what makes the answer [0, 0] and not [0, NaN].
//   [70.1, 70.2], 70 — ours. Decimal speeds: the excesses are 0.09999999999999432 and
//     0.20000000000000284, so the mean is 0.14999999999999858, not 0.15. The grader
//     never feeds a decimal, so none of its answers carry this noise; a hand-rolled
//     equality check on such a result would.
const CASES: [number[], number][] = [
  [[50, 60, 55], 60],
  [[58, 50, 60, 55], 55],
  [[61, 81, 74, 88, 65, 71, 68], 70],
  [[100, 105, 95, 102], 100],
  [[40, 45, 44, 50, 112, 39], 55],
  [[], 60],
  [[70.1, 70.2], 70],
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

// The grader's own answers for the official five, so the demo shows a verdict
// rather than asking you to take its word for it.
const EXPECTED: [number, number][] = [
  [0, 0],
  [2, 4],
  [4, 8.5],
  [2, 3.5],
  [1, 57],
];

const solve = (speeds: number[], limit: number): [number, number] => {
  const over = speeds.filter((s) => s > limit).map((s) => s - limit);
  return over.length > 0 ? [over.length, over.reduce((a, b) => a + b, 0) / over.length] : [0, 0];
};

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(+x.toPrecision(15)));
const raw = (x: number) => (Number.isInteger(x) ? String(x) : String(x).slice(0, 20));
const pair = (r: [number, number]) => `[${raw(r[0])}, ${raw(r[1])}]`;

// "58, 50, 60, 55 ; 55" -> [[58, 50, 60, 55], 55]. Anything unparseable is dropped
// (an empty left side is a legitimate empty list); a missing limit falls back to 60
// rather than tracing NaN, which would render a debugger full of "NaN".
function parse(text: string): [number[], number] {
  const [l = "", r = ""] = text.split(";");
  const speeds = l
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const limit = Number(r.trim());
  return [speeds, r.trim() !== "" && Number.isFinite(limit) ? limit : 60];
}
const show = (speeds: number[], limit: number) => `${speeds.join(", ")} ; ${limit}`;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sd-wrap { display:flex; flex-direction:column; gap:12px; }
    .sd-lane { display:flex; flex-direction:column; gap:4px; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:var(--panel-2); }
    .sd-row { display:grid; grid-template-columns:34px minmax(0,1fr) 120px; align-items:center; gap:10px; }
    .sd-id { font:700 11px var(--mono); color:var(--muted); text-align:right; }
    .sd-track { position:relative; height:18px; border-radius:5px; background:var(--panel); }
    .sd-ok { position:absolute; inset:0 auto 0 0; background:var(--accent); border-radius:5px 0 0 5px; opacity:.85; }
    .sd-over { position:absolute; top:0; bottom:0; background:var(--danger); border-radius:0 5px 5px 0; }
    .sd-limit { position:absolute; top:-3px; bottom:-3px; width:2px; background:var(--text); opacity:.75; }
    .sd-val { font:12px var(--mono); color:var(--muted); }
    .sd-val b { color:var(--text); }
    .sd-row.hit .sd-val, .sd-row.hit .sd-val b { color:var(--danger); }
    .sd-axis { font:11px var(--mono); color:var(--muted); display:flex; align-items:center; gap:6px; margin-left:44px; }
    .sd-axis i { width:2px; height:11px; background:var(--text); opacity:.75; display:inline-block; }
    .sd-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .sd-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .sd-r b { color:var(--text); }
    .sd-r.hot { border-color:var(--danger); color:var(--danger); }
    .sd-r.hot b { color:var(--danger); }
    .sd-cmp { font:12px var(--sans); color:var(--muted); }
    .sd-cmp b { font-family:var(--mono); color:var(--text); }
    .sd-empty { font:12px var(--sans); color:var(--muted); padding:8px 0; text-align:center; }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inS = el("input");
  inS.type = "text";
  inS.style.width = "300px";
  const inL = el("input");
  inL.type = "number";
  inL.style.width = "80px";
  [inS.value, inL.value] = [CASES[2]![0].join(", "), String(CASES[2]![1])];
  ctl.append(el("span", "ctl-label", "speeds ="), inS, el("span", "ctl-label", "limit ="), inL);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach(([sp, lim], i) => {
    const c = el(
      "button",
      "chip",
      sp.length > 0 ? `[${sp.join(", ")}] @ ${lim}` : `no vehicles at all @ ${lim}`,
    );
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inS.value = sp.join(", ");
      inL.value = String(lim);
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  [inS, inL].forEach((t) => t.addEventListener("input", render));
  render();

  function render() {
    const [speeds, limit] = parse(`${inS.value} ; ${inL.value}`);
    const res = solve(speeds, limit);
    const want =
      EXPECTED[
        CASES.findIndex(([sp, l], i) => i < OFFICIAL && show(sp, l) === show(speeds, limit))
      ];
    const over = speeds.filter((s) => s > limit);
    const atLimit = speeds.filter((s) => s === limit).length;

    out.innerHTML = "";
    const wrap = el("div", "sd-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want ? (pair(want) === pair(res) ? "ok" : "no") : "ok"}`,
        `speeding([${speeds.join(", ")}], ${limit}) → ${pair(res)}`,
      ),
    );
    if (want)
      line.append(el("span", "sd-cmp", `matches freeCodeCamp's expected <b>${pair(want)}</b>`));
    wrap.append(line);

    // One bar per vehicle, drawn to a common scale with the limit as a vertical tick.
    // The red tail is the EXCESS — the only quantity this problem ever averages.
    const lane = el("div", "sd-lane");
    if (speeds.length === 0) lane.append(el("div", "sd-empty", "no vehicles observed"));
    const top = Math.max(limit, ...speeds, 1) * 1.04;
    speeds.forEach((s, i) => {
      const hit = s > limit;
      const row = el("div", "sd-row" + (hit ? " hit" : ""));
      row.append(
        el("span", "sd-id", `#${i + 1}`),
        el(
          "div",
          "sd-track",
          `<div class="sd-ok" style="width:${(Math.min(s, limit) / top) * 100}%"></div>` +
            (hit
              ? `<div class="sd-over" style="left:${(limit / top) * 100}%;width:${((s - limit) / top) * 100}%"></div>`
              : "") +
            `<div class="sd-limit" style="left:${(limit / top) * 100}%"></div>`,
        ),
        el(
          "span",
          "sd-val",
          hit
            ? `<b>${s}</b> · +${fmt(s - limit)}`
            : `<b>${s}</b>${s === limit ? " · at limit" : ""}`,
        ),
      );
      lane.append(row);
    });
    if (speeds.length > 0) lane.append(el("div", "sd-axis", `<i></i> limit ${limit}`));
    wrap.append(lane);

    // The wrong ways to read the same data, side by side. Only the first line is the
    // answer; a row goes red only where it actually disagrees with it.
    const total = over.reduce((a, s) => a + (s - limit), 0);
    const rows = el("div", "sd-rows");
    rows.append(el("div", "sd-r", `speeders <b>${over.length}</b> of ${speeds.length}`));
    rows.append(el("div", "sd-r", `total excess <b>${fmt(total)}</b>`));
    const geq = speeds.filter((s) => s >= limit).length;
    rows.append(
      el(
        "div",
        "sd-r" + (geq !== over.length ? " hot" : ""),
        `count with ≥ <b>${geq}</b>${geq !== over.length ? " ✗" : ""}`,
      ),
    );
    const everyone = speeds.length > 0 ? total / speeds.length : Number.NaN;
    rows.append(
      el(
        "div",
        "sd-r" + (over.length > 0 && everyone !== res[1] ? " hot" : ""),
        `÷ all vehicles <b>${raw(everyone)}</b>${over.length > 0 && everyone !== res[1] ? " ✗" : ""}`,
      ),
    );
    rows.append(
      el(
        "div",
        "sd-r" + (over.length === 0 ? " hot" : ""),
        `unguarded ÷ speeders <b>${raw(total / over.length)}</b>${over.length === 0 ? " ✗" : ""}`,
      ),
    );
    wrap.append(rows);

    wrap.append(el("div", "note", noteFor({ speeds, limit, over, atLimit, res, total })));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch is a different thing the one-liner can
// get wrong, and every preset was chosen to land on a different one.
function noteFor(s: {
  speeds: number[];
  limit: number;
  over: number[];
  atLimit: number;
  res: [number, number];
  total: number;
}) {
  if (s.speeds.length === 0)
    return `Nothing was observed, so there are <b>zero</b> speeders and the mean has an empty denominator: <code class='inl'>0 / 0</code> is <b>NaN</b>, and the unguarded row above shows it. The statement's "return <code class='inl'>[0, 0]</code>" bullet is not a tie-break for an odd case — it is the guard, spelled out, because a mean of nothing has no value. The official set only reaches it through a list of cars that are all legal; an empty list is the purest version, and the check <code class='inl'>over.length === 0</code> has to sit <b>before</b> the division, not after.`;
  if (s.over.length === 0)
    return `No vehicle is over <b>${s.limit}</b>, so the answer is <b>[0, 0]</b> — and ${
      s.atLimit
        ? `the interesting part is that <b>${s.atLimit}</b> ${s.atLimit === 1 ? "car sits" : "cars sit"} <i>exactly on</i> the limit. A car doing ${s.limit} in a ${s.limit} zone is not speeding, so the comparison is a strict <code class='inl'>&gt;</code>; with <code class='inl'>≥</code> the count row goes red and this returns <b>[${s.atLimit}, 0]</b> instead. Official case 1 is built on this edge.`
        : `every observation is strictly under it. The all-clear case is where a guard-free mean returns <b>NaN</b> rather than 0, which is the red cell above.`
    }`;
  if (s.speeds.some((v) => !Number.isInteger(v)))
    return `<b>${s.res[0]}</b> speeders, and the mean excess prints as <b>${raw(s.res[1])}</b> rather than the <b>${fmt(s.res[1])}</b> you would write by hand. Subtracting a limit from a decimal speed lands a few units in the last place away from the tidy value (<b>70.1 − 70</b> is <b>0.09999999999999432</b>), and the noise survives the sum and the division. Every official answer is a clean binary fraction — 8.5, 3.5, 57 — so none of them can show it; a test that compared such a result with <code class='inl'>===</code> would fail on a correct function. The fix lives in the comparison (a tolerance), never in the solution.`;
  if (s.atLimit)
    return `<b>${s.res[0]}</b> over, with <b>${s.atLimit}</b> sitting exactly on the limit. The mean is <b>${fmt(s.res[1])}</b>: total excess <b>${fmt(s.total)}</b> divided by <b>${s.over.length}</b> speeders — not by the <b>${s.speeds.length}</b> vehicles, which would give <b>${raw(s.total / s.speeds.length)}</b> and drag a lone offender's number toward the speed of everyone who stayed legal. The car at the limit contributes nothing to either side: a strict <code class='inl'>&gt;</code> keeps it out of the count, and its excess would be 0 anyway, so a <code class='inl'>≥</code> would only quietly inflate the count and deflate the average.`;
  if (s.over.length === 1)
    return `One speeder out of <b>${s.speeds.length}</b>, doing <b>${s.over[0]! + s.limit}</b> in a <b>${s.limit}</b> zone, so the average excess is just that car's own <b>${fmt(s.res[1])}</b>. This is the case that exposes the wrong divisor: dividing by all <b>${s.speeds.length}</b> vehicles gives <b>${raw(s.total / s.speeds.length)}</b>, a number that describes nobody. "The average amount beyond the limit <i>of those vehicles</i>" is a mean over the filtered list, so the count and the divisor are the same number — which is why they come out of one <code class='inl'>.length</code>.`;
  return `<b>${s.res[0]}</b> of <b>${s.speeds.length}</b> are over <b>${s.limit}</b>, with a combined excess of <b>${fmt(s.total)}</b>, so the average is <b>${fmt(s.total)} ÷ ${s.res[0]} = ${fmt(s.res[1])}</b>. The count and the divisor are one number — the filtered list's length — so there is no second pass to keep in sync. The wrong divisor, the count of all <b>${s.speeds.length}</b> vehicles, would answer <b>${raw(s.total / s.speeds.length)}</b>: the red cell above. Drag any speed across the limit and watch both numbers move together.`;
}

// ── STEP — the chain unrolled into a loop, so the filter, the sum and the guard are separate ──
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">speeding</span>(<span class="tok" data-t="param">speeds, limit</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="over">over = []</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="s">s</span> <span class="k">of</span> speeds) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">s &gt; limit</span>) {`,
  },
  {
    ln: 5,
    html: `      <span class="tok" data-t="push">over.<span class="fn">push</span>(s - limit)</span>;`,
  },
  { ln: 6, html: `    }` },
  { ln: 7, html: `  }` },
  {
    ln: 8,
    html: `  <span class="k">if</span> (<span class="tok" data-t="guard">over.length === <span class="nu">0</span></span>) <span class="k">return</span> [<span class="nu">0</span>, <span class="nu">0</span>];`,
  },
  {
    ln: 9,
    html: `  <span class="k">const</span> <span class="tok" data-t="total">total = over.<span class="fn">reduce</span>((a, b) =&gt; a + b, <span class="nu">0</span>)</span>;`,
  },
  {
    ln: 10,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">[over.length, total / over.length]</span>;`,
  },
  { ln: 11, html: `}` },
];

function trace(input: string) {
  const [speeds, limit] = parse(input);
  const steps: DbgStep[] = [];
  const over: number[] = [];
  let s: number | null = null,
    i = -1,
    total: number | null = null;

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string | undefined;
      changed?: string[] | undefined;
      eval?: { expr: string; val: boolean } | undefined;
      done?: boolean | undefined;
      result?: string | undefined;
      ret?: { value: string } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = { speeds: `[${speeds.join(", ")}]`, limit };
    if (line >= 2) vars["over"] = `[${over.map(fmt).join(", ")}]`; // `const over` is line 2
    if (s !== null) vars["s"] = s; // `s` lives only inside the loop
    if (total !== null) vars["total"] = fmt(total); // `const total` is line 9
    // The two arrays are live for the whole call once line 2 has run, so both structs
    // stay put and only their contents change; the cursor marks which vehicle is read.
    const structs: DbgStruct[] = [
      { label: "speeds", items: speeds.map((v, k) => (k === i && s !== null ? `▶ ${v}` : v)) },
    ];
    if (line >= 2)
      structs.push({ label: "over (excess only)", items: over.map(fmt), newest: line === 5 });
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `speeding([${speeds.join(", ")}], ${limit})`,
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `<b>${speeds.length}</b> observation${speeds.length === 1 ? "" : "s"} and a limit of <b>${limit}</b>. The answer is two numbers — how many were over, and by how much on average — and both are about the <i>speeders only</i>. That is the shape of the whole problem: <b>filter first, then summarise the survivors</b>.`,
    { focus: "param" },
  );

  S(
    2,
    `<code class='inl'>over</code> starts empty and will hold the <b>excess</b> of each speeder — the amount beyond the limit — not the speeds themselves. Storing <code class='inl'>s - limit</code> now means the average at the end needs no second subtraction, and the list's own length is the count the statement asks for first.`,
    { focus: "over", changed: ["over"] },
  );

  speeds.forEach((v, k) => {
    s = v;
    i = k;
    S(
      3,
      `Vehicle <b>#${k + 1}</b> clocked <b>${v}</b>. A loop is the plainest way to see the filter happen one car at a time; the one-line version spells the same thing <code class='inl'>speeds.filter(…).map(…)</code>.`,
      { focus: "s", changed: ["s"] },
    );
    const hit = v > limit;
    S(
      4,
      hit
        ? `<b>${v} &gt; ${limit}</b> — over by <b>${fmt(v - limit)}</b>, so this one counts. The comparison is strictly greater: only <i>beyond</i> the limit is speeding.`
        : v === limit
          ? `<b>${v} &gt; ${limit}</b> is false, because it is <b>equal</b>. A car doing exactly the limit is not speeding, and this is the edge two official cases sit on. Write <code class='inl'>&gt;=</code> here and it is counted with an excess of 0 — the count rises and the average falls, and both are wrong.`
          : `<b>${v} &gt; ${limit}</b> is false — under the limit, so it is skipped and contributes to neither the count nor the average.`,
      { focus: "cmp", eval: { expr: `${v} > ${limit}`, val: hit } },
    );
    if (hit) {
      over.push(v - limit);
      S(
        5,
        `Push the excess <b>${fmt(v - limit)}</b>, not the speed <b>${v}</b>. After this the list holds <b>${over.length}</b> excess${over.length === 1 ? "" : "es"}, and that number is already the first answer.`,
        { focus: "push", changed: ["over"] },
      );
    }
  });
  s = null;
  i = -1;

  const none = over.length === 0;
  S(
    8,
    none
      ? `<b>over.length === 0</b> is true. No one was speeding, and the guard returns <b>[0, 0]</b> before any division happens. Without it the next lines would compute <code class='inl'>0 / 0</code> and return <b>[0, NaN]</b> — the statement's "no vehicles speeding" bullet is exactly this check, written as a requirement.`
      : `<b>${over.length}</b> speeder${over.length === 1 ? "" : "s"}, so the guard is false and the average has a real denominator. The check has to sit <i>before</i> the division: after it, the damage is done and a <code class='inl'>NaN</code> is already on its way out.`,
    {
      focus: "guard",
      eval: { expr: "over.length === 0", val: none },
      ...(none ? { done: true, result: "[0, 0]", ret: { value: "[0, 0]" } } : {}),
    },
  );
  if (none) return steps;

  total = over.reduce((a, b) => a + b, 0);
  S(
    9,
    `Sum the excesses: <b>${over.map(fmt).join(" + ")} = ${fmt(total)}</b>. The reduce needs its <code class='inl'>0</code> seed only for an empty list, which the guard above has already ruled out — but keeping the seed costs nothing and makes the function safe to move.`,
    { focus: "total", changed: ["total"] },
  );

  const mean = total / over.length;
  const res = `[${over.length}, ${raw(mean)}]`;
  S(
    10,
    `<b>Return ${res}.</b> The mean is <b>${fmt(total)} ÷ ${over.length} = ${fmt(mean)}</b>, divided by the <i>speeder</i> count. Dividing by all <b>${speeds.length}</b> vehicles would give <b>${raw(total / speeds.length)}</b> instead, which averages in the cars that did nothing wrong. The count and the divisor are the same <code class='inl'>over.length</code>, so there is no second number to get out of step.`,
    { focus: "ret", done: true, result: res, ret: { value: res } },
  );
  return steps;
}

export default {
  n: 47,
  id: "speeding",
  title: "Caught Speeding",
  dates: ["2025-09-26"],
  statement: `Given an array of numbers representing the speeds at which vehicles were observed, and a number representing the <b>speed limit</b>, return an array with two items: the <b>number of vehicles that were speeding</b>, followed by the <b>average amount beyond the limit</b> of those vehicles. If no vehicle was speeding, return <code class="inl">[0, 0]</code>. <span class="rule">Example: <code class="inl">speeding([58, 50, 60, 55], 55)</code> → <code class="inl">[2, 4]</code> — 58 and 60 are over by 3 and 5, so two vehicles averaging 4; the 55 is <i>at</i> the limit and does not count.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `Filter the speeders, take how far over each one is, and average that. There is no search and no choice of algorithm; what the problem is really testing is three small decisions. <b>The comparison is strict.</b> A car exactly at the limit is not speeding — official cases 1 and 4 each put a vehicle right on it (<code class='inl'>60</code> against 60, <code class='inl'>100</code> against 100) — and <code class='inl'>≥</code> would count it with an excess of zero, raising the count and lowering the average. <b>The thing averaged is the excess</b>, not the speed, and it is averaged over the <i>speeders</i>: dividing by every vehicle blends in the cars that did nothing wrong, and on official case 5 (<code class='inl'>112</code> amid five legal cars) that turns <b>57</b> into <b>9.5</b>. <b>An empty speeder list needs a guard</b>, because <code class='inl'>0 / 0</code> is <b>NaN</b>; the statement's "return <code class='inl'>[0, 0]</code>" bullet is that guard, written as a requirement. Pick any preset, then drag a speed across the limit and watch the count and the average move together. Two presets are ours: the empty list, where the unguarded mean is <b>NaN</b>, and a pair of decimal speeds, where the answer carries floating-point noise no official answer shows.`,
      code: `// Filter first, then summarise the survivors: the count and the divisor are the
// same number, the length of the filtered list.
function speeding(speeds: number[], limit: number): [number, number] {
  // strict >: a car exactly at the limit is not speeding
  const over = speeds.filter((s) => s > limit).map((s) => s - limit);
  // guard before the division: with no speeders, 0 / 0 would be NaN
  if (over.length === 0) return [0, 0];
  return [over.length, over.reduce((a, b) => a + b, 0) / over.length];
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "filter → guard → mean",
      approach: `The chain unrolled into a loop so the three decisions each get a line of their own: the strict comparison on line 4, the empty guard on line 8, and the divisor on line 10. The <b>over</b> panel holds <i>excesses</i> rather than speeds, and the <b>speeds</b> panel shows which vehicle the loop is on. Start on <b>61, 81, 74, 88, 65, 71, 68 ; 70</b> — official — where four of seven are over and the mean lands on <b>8.5</b>, then <b>58, 50, 60, 55 ; 55</b>, where the 55 sits exactly on the limit and line 4 declines it. <b>50, 60, 55 ; 60</b> exits at the guard on line 8 without ever reaching a division, and <b>; 60</b> (no vehicles) is ours and takes the same exit. Type any <code class='inl'>speeds ; limit</code> pair, comma-separated before the semicolon. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "speeds ; limit =",
            value: show(CASES[2]![0], CASES[2]![1]),
            presets: CASES.map(([sp, lim]) => show(sp, lim)),
            hint: "numbers, comma-separated ; limit",
          },
        }),
    },
  ],
} satisfies Challenge;
