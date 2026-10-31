// #56 · Exoplanet Search — the average needs every reading, so average, then hunt a dip.
// "Any single reading <= 80% of the average" cannot be judged until the average exists, and
// the average needs ALL readings: two passes are the problem's shape, not a choice. Three
// small things decide whether it is right:
//   - the alphabet is base 36. parseInt(c, 36) reads 0-9 as 0-9 and A-Z as 10-35, exactly the
//     statement's table, so there is no lookup table and no char-code offset (-48 vs -55) to
//     get wrong.
//   - "less than or EQUAL". Official FGFFCFFGG averages 15, its limit is 12, and its only dip
//     is a C = 12 sitting exactly on the line. A strict < answers false where the grader wants true.
//   - multiply by 0.8, never divide by the average. x / average <= 0.8 is 0/0 = NaN when every
//     reading is 0 (a dark star), and NaN <= 0.8 is false, where 0 <= 0 is true. "000" is ours.
// I also checked the float multiply against exact integer arithmetic (5*min*n <= 4*sum) on a
// few million random strings and found no disagreement, so average * 0.8 is safe here.
// ONE approach, deliberately. Only the smallest reading can ever qualify, so
// Math.min(...levels) <= limit is the same test spelled differently (Tier 3 §2), and the
// early-exit loop saves a handful of comparisons on strings a person can type (Tier 3 §3):
// a second tab would be a strawman.
// Click "FGFFCFFGG" to see a dip land exactly on the 80% line.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 6 official freeCodeCamp cases in the grader's order, then two of ours.
//   "000" — ours: every reading is 0, so average and limit are both 0 and 0 <= 0 is true.
//     A version that divides by the average gets 0/0 = NaN and answers false.
//   ""    — ours: no readings at all. average is 0/0 = NaN, nothing is <= NaN, so false;
//     no guard is needed, but it is the input that proves it.
const CASES = [
  "665544554",
  "FGFFCFFGG",
  "MONOPLONOMONPLNOMPNOMP",
  "FREECODECAMP",
  "9AB98AB9BC98A",
  "ZXXWYZXYWYXZEGZXWYZXYGEE",
  "000",
  "",
];
const OFFICIAL = 6; // CASES[0..5] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, boolean> = {
  "665544554": false,
  FGFFCFFGG: true,
  MONOPLONOMONPLNOMPNOMP: false,
  FREECODECAMP: true,
  "9AB98AB9BC98A": false,
  ZXXWYZXYWYXZEGZXWYZXYGEE: true,
};
const MAX_LEN = 30; // keeps the bars and the trace legible

// Free input: upper-case it, drop anything outside 0-9 A-Z (the statement's whole alphabet).
const parse = (raw: string) =>
  raw
    .toUpperCase()
    .replaceAll(/[^0-9A-Z]/gu, "")
    .slice(0, MAX_LEN);
const fmt = (x: number) => (Number.isNaN(x) ? "NaN" : String(+x.toFixed(2)));

// The graded function, kept verbatim so the demo can't drift from the answer.
function stats(readings: string) {
  const levels = readings.split("").map((c) => Number.parseInt(c, 36));
  const sum = levels.reduce((s, x) => s + x, 0);
  const average = sum / levels.length;
  const limit = average * 0.8;
  const hit = levels.findIndex((x) => x <= limit);
  return { levels, sum, average, limit, hit, result: hit >= 0 };
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
    .ex-wrap { display:flex; flex-direction:column; gap:12px; }
    .ex-in { width:300px; }
    .ex-plot { position:relative; height:150px; margin:18px 0 0; }
    .ex-bars { position:absolute; inset:0; display:flex; align-items:flex-end; gap:3px; }
    .ex-bar { flex:1; min-width:12px; max-width:34px; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; }
    .ex-fill { width:100%; min-height:2px; border-radius:4px 4px 0 0; background:var(--c1); opacity:.75; }
    .ex-bar.dip .ex-fill { background:var(--warn); opacity:1; }
    .ex-lv { font:10px var(--mono); color:var(--muted); }
    .ex-ch { font:700 12px var(--mono); color:var(--text); text-align:center; margin-top:2px; }
    .ex-bar.dip .ex-ch { color:var(--warn); }
    .ex-line { position:absolute; left:0; right:0; border-top:1px dashed var(--muted); pointer-events:none; }
    .ex-line.lim { border-top:2px solid var(--warn); }
    .ex-line span { position:absolute; right:0; top:-15px; font:11px var(--mono); color:var(--muted); background:var(--panel); padding:0 4px; }
    .ex-line.lim span { color:var(--warn); }
    .ex-axis { height:20px; }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input", "ex-in");
  inp.type = "text";
  inp.value = CASES[1]!;
  ctl.append(
    el("span", "ctl-label", "readings ="),
    inp,
    el("span", "ctl-label", `(0-9 and A-Z, up to ${MAX_LEN})`),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const b = el("button", "chip", v === "" ? `""` : `"${esc(v)}"`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = v;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const readings = parse(inp.value);
    const s = stats(readings);
    const want = EXPECTED[readings];
    out.innerHTML = "";
    const wrap = el("div", "ex-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === s.result ? "ok" : "no"}`,
        `hasExoplanet("${esc(readings)}") → ${s.result}`,
      ),
      el(
        "span",
        "more",
        (readings === ""
          ? "no readings"
          : `average ${fmt(s.average)} · limit ${fmt(s.limit)} (80%)`) +
          (want === undefined ? "" : ` · matches freeCodeCamp's expected ${want}`),
      ),
    );
    wrap.append(line);

    // One bar per reading. A bar at or under the solid line is a dip; the dashed line is the average.
    const top = Math.max(1, ...s.levels);
    const plot = el("div", "ex-plot");
    const bars = el("div", "ex-bars");
    s.levels.forEach((x, i) =>
      bars.append(
        el(
          "div",
          `ex-bar${x <= s.limit ? " dip" : ""}`,
          `<span class="ex-lv">${x}</span><div class="ex-fill" style="height:${(x / top) * 100}%"></div><span class="ex-ch">${esc(readings[i]!)}</span>`,
        ),
      ),
    );
    plot.append(bars);
    if (s.levels.length > 0) {
      plot.append(
        el("div", "ex-line", `<span>average ${fmt(s.average)}</span>`),
        el("div", "ex-line lim", `<span>80% = ${fmt(s.limit)}</span>`),
      );
      const [avgL, limL] = Array.from(plot.querySelectorAll<HTMLElement>(".ex-line"));
      avgL!.style.bottom = `calc(${(s.average / top) * 100}% + 0px)`;
      limL!.style.bottom = `calc(${(s.limit / top) * 100}% + 0px)`;
    }
    wrap.append(plot, el("div", "ex-axis"));

    wrap.append(el("div", "note", noteFor(readings, s)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch is a different thing to get wrong.
function noteFor(readings: string, s: ReturnType<typeof stats>) {
  const n = s.levels.length;
  const min = n ? Math.min(...s.levels) : 0;
  if (n === 0)
    return `No readings. <code class='inl'>0 / 0</code> is <code class='inl'>NaN</code>, so the limit is <code class='inl'>NaN</code> too, and no reading is <code class='inl'>&lt;=</code> it: <b>false</b>, with no special case. A star with nothing observed has no transit to find.`;
  if (s.sum === 0)
    return `Every reading is <b>0</b>: average 0, limit 0, and <code class='inl'>0 &lt;= 0</code> is true, so this answers <b>true</b>. It is the input that punishes the other spelling, <code class='inl'>x / average &lt;= 0.8</code>: that is <code class='inl'>0 / 0</code> = <code class='inl'>NaN</code>, and <code class='inl'>NaN &lt;= 0.8</code> is false. Multiply the average by 0.8 once and compare against that; never divide by it. This one is ours, not freeCodeCamp's.`;
  if (5 * min * n === 4 * s.sum)
    return `The dip is <b>exactly</b> on the line: the smallest reading is <b>${min}</b> and 80% of the average ${fmt(s.average)} is also <b>${fmt(s.limit)}</b>. The statement says "less than <i>or equal to</i>", so this is a transit and the answer is <b>true</b>. Write a strict <code class='inl'>&lt;</code> and this input, the only dip in it, is missed. The official set has this case on purpose.`;
  if (s.result)
    return `<b>${s.levels.filter((x) => x <= s.limit).length}</b> reading${s.levels.filter((x) => x <= s.limit).length === 1 ? "" : "s"} at or under the limit ${fmt(s.limit)}, led by <code class='inl'>${esc(readings[s.hit]!)}</code> = <b>${s.levels[s.hit]}</b>. One is enough: "any single reading" means the loop can return the moment it finds one. Only the smallest reading can ever qualify, so this is really <code class='inl'>min &lt;= limit</code>. Note the average includes the dip itself, which pulls the limit down a little.`;
  return `The smallest reading is <b>${min}</b> and the limit is <b>${fmt(s.limit)}</b>, so nothing dips far enough: <b>false</b>. To say <i>no</i> the loop must look at every reading, where a <i>yes</i> can stop at the first dip. Readings can be wildly different from one another and still not qualify, because the threshold is relative to this star's own average, not to a fixed brightness.`;
}

// ── STEP — decode, average, limit, scan ───────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">hasExoplanet</span>(<span class="tok" data-t="arg">readings</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> levels = <span class="tok" data-t="levels">[...readings].<span class="fn">map</span>((c) =&gt; <span class="fn">parseInt</span>(c, 36))</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> average = <span class="tok" data-t="avg">levels.<span class="fn">reduce</span>((s, x) =&gt; s + x, 0) / levels.length</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> limit = <span class="tok" data-t="limit">average * 0.8</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="x">x</span> <span class="k">of</span> levels) {`,
  },
  {
    ln: 6,
    html: `    <span class="k">if</span> (<span class="tok" data-t="dip">x &lt;= limit</span>) <span class="k">return</span> <span class="tok" data-t="yes">true</span>;`,
  },
  { ln: 7, html: `  }` },
  {
    ln: 8,
    html: `  <span class="k">return</span> <span class="tok" data-t="no">false</span>;`,
  },
  { ln: 9, html: `}` },
];

type Extra = {
  focus?: string | undefined;
  changed?: string[] | undefined;
  eval?: { expr: string; val: boolean } | undefined;
  done?: boolean | undefined;
  result?: string | undefined;
  ret?: { value: string } | undefined;
};

function trace(raw: string) {
  const readings = parse(raw);
  const s = stats(readings);
  const q = JSON.stringify(readings);
  const steps: DbgStep[] = [];
  let at = -1;

  const S = (line: number, note: string, x: Extra = {}) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { readings: q };
    if (line >= 2) vars["levels"] = `[${s.levels.join(", ")}]`;
    if (line >= 3) vars["average"] = fmt(s.average);
    if (line >= 4) vars["limit"] = fmt(s.limit);
    if (line >= 5 && line <= 6 && at >= 0) vars["x"] = s.levels[at];
    const structs = [];
    if (line >= 2)
      structs.push({
        label: "levels",
        items: s.levels.map((v, i) => (i === at && line >= 5 && line <= 6 ? `[${v}]` : String(v))),
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
          title: `hasExoplanet(${q})`,
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
    `Is any single reading at most 80% of the <b>average</b> of all of them? The average is the catch: no reading can be judged until every reading has been read, so this takes two passes — one to build the average, one to compare against it. Nothing here can be decided in a single sweep.`,
    { focus: "arg" },
  );

  S(
    2,
    `Decode each character into a number. <code class='inl'>parseInt(c, 36)</code> reads base 36, whose digits are exactly <code class='inl'>0-9</code> then <code class='inl'>A-Z</code>: 0-9 stay 0-9 and A-Z become 10-35, which is the table in the statement. No lookup object, and no char-code arithmetic where <code class='inl'>- 48</code> for digits and <code class='inl'>- 55</code> for letters are two different offsets to keep straight.`,
    { focus: "levels", changed: ["levels"] },
  );

  S(
    3,
    n0(s.levels)
      ? `Sum ${s.sum} over <b>${s.levels.length}</b> readings is <b>${fmt(s.average)}</b>. This is the average of <i>all</i> readings, the dip itself included, so a deep dip drags its own average down and the bar for "low enough" slightly with it.`
      : `No readings, so the sum is 0 and the length is 0: <code class='inl'>0 / 0</code> is <b>NaN</b>. Nothing crashes — JavaScript division by zero gives NaN or Infinity, not an exception — and the next lines will cope without a guard.`,
    { focus: "avg", changed: ["average"] },
  );

  S(
    4,
    `The threshold is computed <b>once</b>: ${fmt(s.average)} &times; 0.8 = <b>${fmt(s.limit)}</b>. It is a multiply on purpose. Dividing each reading by the average (<code class='inl'>x / average &lt;= 0.8</code>) gives the same answer until the average is 0, and then <code class='inl'>0 / 0</code> is NaN and the all-zero star <code class='inl'>"000"</code> wrongly answers false.`,
    { focus: "limit", changed: ["limit"] },
  );

  for (at = 0; at < s.levels.length; at++) {
    const x = s.levels[at]!;
    const dip = x <= s.limit;
    const exact = 5 * x * s.levels.length === 4 * s.sum;
    S(
      6,
      dip
        ? exact
          ? `<code class='inl'>${esc(readings[at]!)}</code> = <b>${x}</b> against the limit ${fmt(s.limit)}: it is <b>exactly</b> on the line. The statement says "less than <i>or equal to</i>", so this counts, and with a strict <code class='inl'>&lt;</code> it would not. The official <code class='inl'>"FGFFCFFGG"</code> has this as its only dip. <b>Return true</b>; one reading is enough, so the scan stops here.`
          : `<code class='inl'>${esc(readings[at]!)}</code> = <b>${x}</b> is below the limit ${fmt(s.limit)}: a dip, which is what a planet crossing the star looks like. "Any single reading" means one is sufficient, so there is no reason to look at the rest — <b>return true</b> now.`
        : `<code class='inl'>${esc(readings[at]!)}</code> = <b>${x}</b> is above the limit ${fmt(s.limit)}, so this reading shows no transit. ${at === s.levels.length - 1 ? "That was the last one." : "A single bright reading proves nothing about the others, so keep scanning."}`,
      {
        focus: "dip",
        changed: ["x"],
        eval: { expr: `${x} <= ${fmt(s.limit)}`, val: dip },
        ...(dip && { done: true, result: "true", ret: { value: "true" } }),
      },
    );
    if (dip) return steps;
  }
  at = -1;
  S(
    8,
    s.levels.length === 0
      ? `The loop body never ran, since there are no readings. <b>Return false</b>: you cannot detect a dip in a signal you never saw.`
      : `Every reading was above the limit ${fmt(s.limit)} (the smallest is ${Math.min(...s.levels)}), so there is no transit: <b>return false</b>. This is the expensive answer — a <i>no</i> had to look at every reading, where a <i>yes</i> stops at the first dip. And because only the smallest reading can qualify, comparing just the minimum would have said the same.`,
    { focus: "no", done: true, result: "false", ret: { value: "false" } },
  );
  return steps;
}
const n0 = (a: number[]) => a.length > 0;

export default {
  n: 56,
  id: "exoplanet-search",
  title: "Space Week Day 2: Exoplanet Search",
  dates: ["2025-10-05"],
  statement: `A string of luminosity readings, one character per reading: <code class="inl">0-9</code> are levels 0-9 and <code class="inl">A-Z</code> are levels 10-35. Return <code class="inl">true</code> if any <b>single</b> reading is <b>less than or equal to 80%</b> of the average of all readings (a planet crossing the star dims it), else <code class="inl">false</code>. <span class="rule">Example: <code class="inl">hasExoplanet("FGFFCFFGG")</code> → <code class="inl">true</code> — the levels are 15, 16, 15, 15, 12, 15, 15, 16, 16, average 15, so the limit is 12, and the <code class="inl">C</code> (12) sits exactly on it.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — two passes",
      approach: `Decode, average, then look for one reading under the line. The average needs every reading, so there are inherently two passes: one to build it, one to compare against it. Three things are easy to get wrong. <b>The alphabet is base 36</b>: <code class='inl'>parseInt(c, 36)</code> turns <code class='inl'>0-9</code> into 0-9 and <code class='inl'>A-Z</code> into 10-35, so there is no table and no char-code offset to mix up. <b>"Less than or equal"</b>: official <code class='inl'>"FGFFCFFGG"</code> has an average of 15, a limit of 12, and its only dip is a <code class='inl'>C</code> = 12 exactly on the line, so a strict <code class='inl'>&lt;</code> returns false where the grader wants true. <b>Multiply, don't divide</b>: <code class='inl'>average * 0.8</code> is safe for an all-zero star, whereas <code class='inl'>x / average &lt;= 0.8</code> is <code class='inl'>0 / 0</code> = NaN there and answers false; <code class='inl'>"000"</code> (ours) shows it. The empty string (ours) is false without a guard, because NaN is not greater than anything. Click <b>FGFFCFFGG</b> to see the dip land on the solid line, <b>FREECODECAMP</b> for several readings under it (C, C, A), and <b>665544554</b> for a star that wobbles but never dips far enough. A single variant, deliberately: only the smallest reading can qualify, so <code class='inl'>Math.min(...levels) &lt;= limit</code> is the same test spelled differently, and its saving is a few comparisons on strings you can type, so a second tab would be a strawman.`,
      code: `// Decode to levels, average them all, then ask whether any reading is at or under 80% of it.
function hasExoplanet(readings: string): boolean {
  // Base 36: "0"-"9" -> 0-9 and "A"-"Z" -> 10-35, the statement's table with no lookup.
  const levels = readings.split("").map((c) => parseInt(c, 36));
  const average = levels.reduce((s, x) => s + x, 0) / levels.length;
  // Multiply once; x / average <= 0.8 is 0/0 = NaN for an all-zero star and answers false.
  const limit = average * 0.8;
  for (const x of levels) {
    if (x <= limit) return true; // <=, not <: "FGFFCFFGG" has a 12 exactly on its limit of 12
  }
  return false; // also "" : the average is NaN, but the loop never runs
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "decode, average, scan",
      approach: `The function one line at a time, with each name appearing in the panel only once its line has run and the array of levels shown with the element under the cursor bracketed. Start on <b>FGFFCFFGG</b> — official — where line 6 returns true on a reading exactly equal to the limit. <b>665544554</b> is official and runs to the end and returns false on line 8, the only way to see the "no" path. <b>FREECODECAMP</b> finds its first dip at the first <code class='inl'>C</code> (12 against a limit of 13.47). <b>000</b> and the empty string are ours: the all-zero star and the star with no readings. Type any readings, 0-9 and A-Z. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "readings =",
            value: CASES[1]!,
            presets: CASES,
            hint: `0-9 and A-Z, up to ${MAX_LEN}`,
          },
        }),
    },
  ],
} satisfies Challenge;
