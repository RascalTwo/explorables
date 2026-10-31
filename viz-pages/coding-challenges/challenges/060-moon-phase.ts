// #60 · Moon Phase — days since the reference, mod 28, cut into blocks of seven.
// Two subtractions and a modulo: days since 2000-01-06, position in the 28-day cycle, phase = position / 7.
// What the statement leaves to the reader is the numbering. It says "days 1 - 7" are New, but the
// arithmetic produces a ZERO-based position (the reference day has 0 days elapsed), and that mismatch is
// the whole bug surface:
//   - compare the zero-based position against the one-based ranges ("pos <= 7 is New") and the first
//     day of every later phase lands one phase early. Official "2000-01-13" (day 8) comes back New.
//   - keep the position zero-based and divide: Math.floor(pos / 7) is already 0,1,2,3.
// The other trap is the date maths. Date.parse("YYYY-MM-DD") reads a bare date as UTC midnight, so the
// difference is an exact multiple of 86 400 000 ms on any machine. Build the dates with new Date(y, m, d)
// instead and they are local midnight, a daylight-saving change makes a day 23 or 25 hours long, and the
// division stops being a whole number.
// ONE approach, deliberately. Walking the calendar forward a day at a time until you reach the input date
// is the same subtraction done slowly, and subtracting two Date.parse values is already the standard
// library's answer; a second tab would be a strawman (CONTRIBUTING Tier 3 §1/§2).
// Click "2000-01-13" and read the red row: the one-based-range bug returns "New".
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

const REF = "2000-01-06";
const DAY_MS = 86_400_000;
const PHASES = ["New", "Waxing", "Full", "Waning"];

// The 5 official freeCodeCamp cases in the grader's order, then three of ours.
//   "2000-01-06" — ours. The reference itself: 0 days elapsed, day 1, the very first cell.
//   "2000-02-02" — ours. 27 days elapsed = day 28, the last Waning day before the cycle wraps.
//   "2000-02-03" — ours. 28 days elapsed: position wraps to 0 and the moon is New again.
const CASES = [
  "2000-01-12",
  "2000-01-13",
  "2014-10-15",
  "2012-10-21",
  "2022-12-14",
  "2000-01-06",
  "2000-02-02",
  "2000-02-03",
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

const EXPECTED: Record<string, string> = {
  "2000-01-12": "New",
  "2000-01-13": "Waxing",
  "2014-10-15": "Full",
  "2012-10-21": "Waning",
  "2022-12-14": "New",
};

// An error string when the text is not a real calendar date or is before the reference.
type Calc = { days: number; cycles: number; pos: number; day: number; phase: string };
function calc(s: string): Calc | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(s)) return { error: "write the date as YYYY-MM-DD" };
  const t = Date.parse(s);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s)
    return { error: `${s} is not a real calendar date` };
  const days = (t - Date.parse(REF)) / DAY_MS;
  if (days < 0)
    return { error: `${s} is before the reference ${REF}, which the challenge never gives` };
  const pos = days % 28;
  return {
    days,
    cycles: Math.floor(days / 28),
    pos,
    day: pos + 1,
    phase: PHASES[Math.floor(pos / 7)] ?? "",
  };
}

// The wrong reading, scored on the same input so the demo can show it: the zero-based
// position compared against the statement's one-based ranges.
const offByOne = (pos: number) =>
  pos <= 7 ? "New" : pos <= 14 ? "Waxing" : pos <= 21 ? "Full" : "Waning";

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .mp-wrap { display:flex; flex-direction:column; gap:12px; }
    .mp-grid { display:grid; grid-template-columns:auto repeat(7, minmax(30px, 44px)); gap:4px; align-items:center; }
    .mp-name { font:700 12px var(--mono); padding-right:6px; }
    .mp-cell { font:12px var(--mono); text-align:center; padding:7px 0; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .mp-p0 { border-color:var(--c1); } .mp-p1 { border-color:var(--c2); } .mp-p2 { border-color:var(--c3); } .mp-p3 { border-color:var(--c4); }
    .mp-n0 { color:var(--c1); } .mp-n1 { color:var(--c2); } .mp-n2 { color:var(--c3); } .mp-n3 { color:var(--c4); }
    .mp-cell.mp-on { background:var(--accent); color:var(--bg); font-weight:700; }
    .mp-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = "2000-01-13";
  inp.style.width = "140px";
  ctl.append(el("span", "ctl-label", "dateString ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", `"${esc(v)}"`);
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
    const s = inp.value.trim();
    const r = calc(s);
    out.innerHTML = "";
    const wrap = el("div", "mp-wrap");

    if ("error" in r) {
      wrap.append(el("div", "mp-warn", esc(r.error)));
      out.append(wrap);
      return;
    }

    const want = EXPECTED[s];
    const wrong = offByOne(r.pos) !== r.phase;

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === r.phase ? "ok" : "no"}`,
        `moonPhase("${esc(s)}") → "${r.phase}"`,
      ),
    );
    line.append(
      el(
        "span",
        "more",
        want === undefined
          ? `${r.days} days after the reference · day ${r.day} of 28`
          : `${r.days} days after the reference · day ${r.day} of 28 · matches freeCodeCamp's expected "${want}"`,
      ),
    );
    wrap.append(line);

    // The 28-day cycle, one row per phase. The lit cell is where this date falls.
    const grid = el("div", "mp-grid");
    PHASES.forEach((name, p) => {
      grid.append(el("span", `mp-name mp-n${p}`, name));
      for (let k = 0; k < 7; k++) {
        const d = p * 7 + k + 1;
        grid.append(el("span", `mp-cell mp-p${p}${d === r.day ? " mp-on" : ""}`, String(d)));
      }
    });
    wrap.append(grid);

    const rows: [string, string][] = [
      ["days elapsed", `${esc(s)} − ${REF} = <b>${r.days}</b>`],
      ["full cycles", `⌊${r.days} / 28⌋ = <b>${r.cycles}</b> — thrown away by the modulo`],
      ["position", `${r.days} % 28 = <b>${r.pos}</b> (zero-based)`],
      [
        "phase",
        `PHASES[⌊${r.pos} / 7⌋] = PHASES[<b>${Math.floor(r.pos / 7)}</b>] = <b>${r.phase}</b>`,
      ],
    ];
    const tbl = el("div");
    rows.forEach(([k, v]) =>
      tbl.append(el("div", "srow", `<span class="k">${k}</span><span class="exp">${v}</span>`)),
    );
    wrap.append(tbl);

    if (wrong)
      wrap.append(
        el(
          "div",
          "mp-warn",
          `Compare the zero-based position <b>${r.pos}</b> with the statement's one-based ranges (<code class='inl'>pos &lt;= 7</code> is New) and this scores <b>${offByOne(r.pos)}</b>, not <b>${r.phase}</b>.`,
        ),
      );

    wrap.append(el("div", "note", noteFor(s, r, wrong)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing to get wrong.
function noteFor(s: string, r: Calc, wrong: boolean) {
  if (r.days === 0)
    return `The reference day itself: <b>0</b> days have passed, so the position is 0 and the date is <b>day 1</b>. This is why the arithmetic is zero-based while the statement counts from one — "Day 1 represents the day of the new moon, meaning 0 days have passed" is the sentence that pins the offset, and <code class='inl'>PHASES[Math.floor(0 / 7)]</code> is New with no adjustment.`;
  if (r.pos === 0)
    return `<b>${r.days}</b> days is exactly ${r.cycles} full cycle${r.cycles === 1 ? "" : "s"}, so the modulo wraps all the way back to position <b>0</b> and the moon is <b>New</b> again. The statement says "after day 28, the cycle repeats with day 1": that is what <code class='inl'>% 28</code> does, and it is why no separate wrap-around case is written.`;
  if (r.day === 28)
    return `Position <b>27</b>, day 28: the last cell of Waning. <code class='inl'>Math.floor(27 / 7)</code> is 3, still in range, and the very next day wraps to 0. Seven wide times four phases is exactly 28, so the index can never reach 4 and run off the end of the array.`;
  if (wrong)
    return `Position <b>${r.pos}</b> is <b>day ${r.day}</b>, the first day of ${r.phase}. The statement's ranges are one-based ("Waxing: days 8 - 14"), but the position is zero-based, so testing <code class='inl'>pos &lt;= 7</code> hands this day to ${offByOne(r.pos)}. Divide instead: <code class='inl'>Math.floor(${r.pos} / 7)</code> is ${Math.floor(r.pos / 7)} because the zero-based seven-blocks already start on 0, 7, 14, 21. The official <code class='inl'>"2000-01-12"</code> (day 7, New) and <code class='inl'>"2000-01-13"</code> (day 8, Waxing) straddle the first boundary.`;
  if (r.pos % 7 === 6)
    return `Position <b>${r.pos}</b> is the last day of ${r.phase} (day ${r.day}). It is the boundary's other side: one more day moves the index from ${Math.floor(r.pos / 7)} to ${Math.floor(r.pos / 7) + 1}. Both comparisons and the divide agree on this side; it is the first day of the <i>next</i> phase where the wrong reading breaks.`;
  return `<b>${r.days}</b> days after ${REF} leaves ${r.cycles} complete cycle${r.cycles === 1 ? "" : "s"} behind and a position of <b>${r.pos}</b> inside the current one, which is day ${r.day} and so <b>${r.phase}</b>. The date maths is in UTC (<code class='inl'>Date.parse</code> reads a bare <code class='inl'>${esc(s)}</code> as UTC midnight), so both dates are exact midnights and the day count is a whole number on any machine. Only the remainder is used: ${r.cycles} cycles of 28 change nothing about the phase.`;
}

// ── STEP — parse, subtract, wrap, divide ────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">const</span> PHASES = [<span class="st">"New"</span>, <span class="st">"Waxing"</span>, <span class="st">"Full"</span>, <span class="st">"Waning"</span>];`,
  },
  {
    ln: 2,
    html: `<span class="k">function</span> <span class="fn">moonPhase</span>(<span class="tok" data-t="arg">dateString</span>) {`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> ms = <span class="tok" data-t="ms">Date.<span class="fn">parse</span>(dateString) - Date.<span class="fn">parse</span>(<span class="st">"2000-01-06"</span>)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> days = <span class="tok" data-t="days">ms / 86400000</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> pos = <span class="tok" data-t="pos">days % 28</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">PHASES[Math.<span class="fn">floor</span>(pos / 7)]</span>;`,
  },
  { ln: 7, html: `}` },
];

const q = (s: string) => JSON.stringify(s);

function trace(input: string): DbgStep[] {
  const s = input.trim();
  const r = calc(s);
  const steps: DbgStep[] = [];

  if ("error" in r) {
    steps.push({
      line: 2,
      note: `${esc(r.error)}. The challenge only gives real dates on or after the reference, so there is nothing to trace; pick one of the chips or type a valid date.`,
      frames: [{ title: `moonPhase(${q(s)})`, vars: { dateString: q(s) } }],
      done: true,
      result: "no result",
    });
    return steps;
  }

  const ms = r.days * DAY_MS;
  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean | string | number };
      ret?: { value: string };
      done?: boolean;
      result?: string;
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { dateString: q(s) };
    if (line >= 3) vars["ms"] = ms;
    if (line >= 4) vars["days"] = r.days;
    if (line >= 5) vars["pos"] = r.pos;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `moonPhase(${q(s)})`,
          vars,
          changed: x.changed ?? [],
          structs: [{ label: "PHASES", items: PHASES.map(q) }],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    2,
    `The table of four names is already in scope (line 1), so the function only has to produce an <i>index</i> into it. The plan: how many days since the reference new moon, forget whole 28-day cycles, then cut the remaining position into four blocks of seven.`,
    { focus: "arg" },
  );
  S(
    3,
    `Subtract the reference from the input in milliseconds: <b>${ms}</b>. <code class='inl'>Date.parse</code> reads a bare <code class='inl'>YYYY-MM-DD</code> as <b>UTC</b> midnight, so both operands are exact midnights and the difference is an exact multiple of a day on any machine. Build them with <code class='inl'>new Date(y, m, d)</code> and they would be local midnights, and a daylight-saving change in between makes one day 23 or 25 hours long.`,
    { focus: "ms", changed: ["ms"] },
  );
  S(
    4,
    `Divide by 86 400 000 ms in a day: <b>${r.days}</b> days elapsed. ${
      r.days === 0
        ? "This is the reference day itself, so zero days have passed, which the statement calls day 1."
        : `The statement's "day 1" is the reference with 0 days passed, so a date ${r.days} days later is day ${r.days + 1} of the running count.`
    }`,
    { focus: "days", changed: ["days"] },
  );
  S(
    5,
    `<code class='inl'>${r.days} % 28</code> is <b>${r.pos}</b>: ${r.cycles} complete cycle${r.cycles === 1 ? "" : "s"} are discarded because every cycle starts the pattern again, and what is left is the zero-based position inside the current one. Zero-based is the point: it is <i>day ${r.day}</i> in the statement's numbering, and <code class='inl'>${r.pos}</code> is one less on purpose.`,
    { focus: "pos", changed: ["pos"], eval: { expr: `${r.days} % 28`, val: r.pos } },
  );
  S(
    6,
    `<code class='inl'>Math.floor(${r.pos} / 7)</code> is <b>${Math.floor(r.pos / 7)}</b>, so <b>return ${q(r.phase)}</b>. Because the position is zero-based, blocks of seven start on 0, 7, 14 and 21, which is exactly the first day of each phase in the statement's one-based ranges (days 1, 8, 15, 22). Compare <code class='inl'>pos</code> with the one-based "days 1 - 7" instead and ${wrongNote(r.pos)}`,
    {
      focus: "ret",
      eval: { expr: `⌊${r.pos} / 7⌋`, val: Math.floor(r.pos / 7) },
      ret: { value: q(r.phase) },
      done: true,
      result: q(r.phase),
    },
  );
  return steps;
}

const wrongNote = (pos: number) =>
  offByOne(pos) === PHASES[Math.floor(pos / 7)]
    ? `this input would happen to survive (<b>${offByOne(pos)}</b>), but day 8, 15 and 22 would not.`
    : `this input comes back <b>${offByOne(pos)}</b>, one phase early.`;

export default {
  n: 60,
  id: "moon-phase",
  title: "Space Week Day 6: Moon Phase",
  dates: ["2025-10-09"],
  statement: `Given a date <code class="inl">"YYYY-MM-DD"</code>, return its phase of a simplified <b>28-day</b> lunar cycle: <code class="inl">"New"</code> for days 1&ndash;7, <code class="inl">"Waxing"</code> for 8&ndash;14, <code class="inl">"Full"</code> for 15&ndash;21 and <code class="inl">"Waning"</code> for 22&ndash;28, then the cycle repeats from day 1. <code class="inl">"2000-01-06"</code> is the reference new moon and <b>day 1</b> (zero days have passed); no date before it is given. <span class="rule">Example: <code class="inl">moonPhase("2000-01-13")</code> → <code class="inl">"Waxing"</code> — it is 7 days after the reference, so 7 % 28 = 7 is the eighth day of the cycle, the first of days 8&ndash;14.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — two parses, one modulo",
      approach: `Two subtractions and a modulo. <b>Days since the reference</b> is the difference of two <code class='inl'>Date.parse</code> values over 86 400 000, and <b>the position in the cycle</b> is that count % 28, which throws away every complete cycle. Then <code class='inl'>Math.floor(pos / 7)</code> picks the phase. The two traps: <b>the numbering</b> and <b>the dates</b>. The statement counts days from <i>one</i> but the position is <i>zero-based</i> (the reference has 0 days elapsed), so testing it against "days 1 - 7" with <code class='inl'>pos &lt;= 7</code> gives the first day of every later phase to the previous phase; the official <code class='inl'>"2000-01-13"</code> catches it, and the demo shows it as a red row. Dividing the zero-based position by seven needs no off-by-one fix. On the dates, a bare <code class='inl'>YYYY-MM-DD</code> parses as UTC, so the difference is an exact whole number of days on any machine; two local-time <code class='inl'>new Date(y, m, d)</code> values can straddle a daylight-saving change and be an hour off a whole day. "Day 28 to day 1" is not a special case either: day 28 is position 27 and the next day is position 0, so the index never reaches 4. My own chips are the reference day, day 28, and the wrap to New.`,
      code: `// Days since the reference new moon, wrapped at 28, cut into four blocks of seven.
function moonPhase(dateString: string): string {
  const PHASES = ["New", "Waxing", "Full", "Waning"];
  // A bare YYYY-MM-DD parses as UTC midnight, so this is an exact whole number of days.
  const days = (Date.parse(dateString) - Date.parse("2000-01-06")) / 86400000;
  const pos = days % 28;                      // zero-based: the reference day is 0
  return PHASES[Math.floor(pos / 7)];         // 0-6 New, 7-13 Waxing, 14-20 Full, 21-27 Waning
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `The function one subtraction per line, with each value appearing in the panel only once its line has run. Start on <b>"2000-01-13"</b>: official, and the first day of Waxing, where the one-based-range bug returns "New". <b>"2000-01-12"</b> is the last day of New, one day earlier, and the boundary the bug gets right. <b>"2014-10-15"</b> and <b>"2012-10-21"</b> are Full and Waning after many wraps; <b>"2022-12-14"</b> is day 7 after 8 378 days, the last New day, the other side of the boundary from "2000-01-13". <b>"2000-01-06"</b>, <b>"2000-02-02"</b> and <b>"2000-02-03"</b> are ours: day 1, day 28 and the wrap. Type any date on or after 2000-01-06. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "dateString =",
            value: "2000-01-13",
            presets: CASES,
            hint: "YYYY-MM-DD, on or after 2000-01-06",
          },
        }),
    },
  ],
} satisfies Challenge;
