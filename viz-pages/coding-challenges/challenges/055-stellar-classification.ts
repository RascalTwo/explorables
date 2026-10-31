// #55 · Stellar Classification — test only each lower bound, hottest first; M is what's left.
// Seven bands on one number line. The statement writes each band as a closed range
// ("5,200 K - 5,999 K"), which invites seven two-sided tests. You only need the lower
// bound of each, checked hottest first:
//   - the first `temp >= min` that holds IS the answer, because everything hotter was
//     already ruled out one line earlier. The upper bound is implied by the line above.
//   - that also closes a hole the written ranges leave: 5,199.5 K is above "3,700-5,199"
//     and below "5,200-5,999", so a pair of inclusive bounds matches no band at all.
//     No official case is fractional, so the grader cannot see it. 5199.5 is ours.
//   - "M" is the fall-through, not a test. "0 K - 3,699 K" needs no `temp >= 0` guard:
//     whatever is left after six misses is M.
//   - `>=` not `>`: 3700 is K and 6000 is F. The official set pins both edges (3700/3699
//     and 6000), which is why it is a real boundary check for once.
// ONE approach, deliberately. A table of [min, letter] pairs walked in a loop is the same
// six comparisons rewritten, and a binary search over seven entries saves at most three
// of them, a gap you could not watch. A second tab would be a strawman (CONTRIBUTING
// Tier 3 §1-§3).
// Click 5199.5 and read the red row: the closed-range reading finds no class at all.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 8 official freeCodeCamp cases in the grader's order, then one of ours.
//   5199.5 — ours. Between the written K (..5,199) and G (5,200..) ranges: a fractional
//     temperature that falls in the gap if you test closed ranges. Answer: "K".
const CASES = [5778, 2400, 9999, 3700, 3699, 210000, 6000, 11432, 5199.5];
const OFFICIAL = 8; // CASES[0..7] are freeCodeCamp's; the rest are ours.
// The step-through floors its input to an integer, so the fractional case lives in the demo only.
const DBG_CASES = CASES.filter(Number.isInteger);

const EXPECTED: Record<number, string> = {
  5778: "G",
  2400: "M",
  9999: "A",
  3700: "K",
  3699: "M",
  210000: "O",
  6000: "F",
  11432: "B",
};

// [letter, lower bound, upper bound as the statement writes it]. M has no test: it is
// what is left. Upper bounds exist only so the demo can show the closed-range reading.
const BANDS: { cls: string; min: number; max: number; word: string }[] = [
  { cls: "O", min: 30000, max: Infinity, word: "blue" },
  { cls: "B", min: 10000, max: 29999, word: "blue-white" },
  { cls: "A", min: 7500, max: 9999, word: "white" },
  { cls: "F", min: 6000, max: 7499, word: "yellow-white" },
  { cls: "G", min: 5200, max: 5999, word: "yellow" },
  { cls: "K", min: 3700, max: 5199, word: "orange" },
  { cls: "M", min: -Infinity, max: 3699, word: "red" },
];

// The solution: lower bounds only, hottest first. M is the fall-through.
const classify = (t: number) => (BANDS.find((b) => b.cls !== "M" && t >= b.min) ?? BANDS[6]!).cls;
// The wrong reading: each band as the closed range the statement prints.
const asWritten = (t: number) => BANDS.find((b) => t >= Math.max(b.min, 0) && t <= b.max)?.cls;

const fmt = (n: number) => n.toLocaleString("en-US");

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sc-wrap { display:flex; flex-direction:column; gap:12px; }
    .sc-rungs { display:flex; flex-direction:column; gap:4px; }
    .sc-rung { display:flex; align-items:center; gap:10px; padding:5px 10px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); font:13px var(--sans); }
    .sc-rung .cls { font:700 18px var(--mono); width:22px; text-align:center; }
    .sc-rung .rule { font:12px var(--mono); flex:1; }
    .sc-rung .res { font:11px var(--mono); color:var(--muted); }
    .sc-skip { opacity:.55; }
    .sc-skip .res { color:var(--danger); }
    .sc-hit { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, var(--panel-2)); }
    .sc-hit .res { color:var(--good); font-weight:700; }
    .sc-rest { opacity:.35; }
    .sc-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = "5778";
  inp.style.width = "130px";
  ctl.append(el("span", "ctl-label", "temp (K) ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", fmt(v));
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inp.value = String(v);
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
    const t = raw === "" ? Number.NaN : Number(raw);
    out.innerHTML = "";
    if (!Number.isFinite(t)) {
      out.append(
        el(
          "div",
          "note",
          `Type a temperature in kelvin, for example <code class='inl'>5778</code>.`,
        ),
      );
      return;
    }
    const result = classify(t);
    const want = EXPECTED[t];
    const written = asWritten(t);
    const wrap = el("div", "sc-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `classification(${esc(String(t))}) → "${result}"`,
      ),
    );
    line.append(
      el(
        "span",
        "more",
        want === undefined
          ? `${BANDS.find((b) => b.cls === result)!.word} star`
          : `matches freeCodeCamp's expected "${want}"`,
      ),
    );
    wrap.append(line);

    // The ladder is the code: top to bottom, each rung is one `if`. Rungs above the hit
    // were tested and missed; rungs below it were never reached.
    const hitAt = BANDS.findIndex((b) => b.cls === result);
    const rungs = el("div", "sc-rungs");
    BANDS.forEach((b, i) => {
      const state = i < hitAt ? "sc-skip" : i === hitAt ? "sc-hit" : "sc-rest";
      const rule = b.cls === "M" ? `nothing left: return` : `temp >= ${fmt(b.min)}`;
      const res = i < hitAt ? "no" : i === hitAt ? "yes: return" : "never reached";
      rungs.append(
        el(
          "div",
          `sc-rung ${state}`,
          `<span class="cls">${b.cls}</span><span class="rule">${rule}</span><span class="res">${res}</span>`,
        ),
      );
    });
    wrap.append(rungs);

    if (written === undefined && t >= 0)
      wrap.append(
        el(
          "div",
          "sc-warn",
          `Test the ranges as printed (<code class='inl'>3,700-5,199</code>, <code class='inl'>5,200-5,999</code>) and <b>${esc(String(t))}</b> K matches <b>no class at all</b>: it sits in the sliver between two closed ranges.`,
        ),
      );

    wrap.append(el("div", "note", noteFor(t, result, hitAt)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch teaches a different property of the walk.
function noteFor(t: number, result: string, hitAt: number) {
  const b = BANDS[hitAt]!;
  if (asWritten(t) === undefined && t >= 0)
    return `<b>${esc(String(t))}</b> K falls between "up to 5,199" and "from 5,200". Integer temperatures never land there, which is why every official case passes, but a measured temperature can. Because the code asks only <code class='inl'>temp &gt;= min</code> hottest-first, it never needs the upper bounds: <code class='inl'>5200</code> failed, <code class='inl'>3700</code> held, so this is <b>K</b> with no special handling.`;
  if (t < 0)
    return `A negative temperature is not physical, and the statement's floor is 0 K, but the code has no <code class='inl'>temp &gt;= 0</code> guard: after six misses, whatever is left is <b>M</b>. That is the cost of making the last band a fall-through, and for this problem it is the right call, since the other design (a guard that throws) invents behaviour the statement never asks for.`;
  if (t === b.min && b.cls !== "M")
    return `<b>${fmt(t)}</b> is exactly the lower bound of <b>${b.cls}</b>, and the statement says "${fmt(b.min)} K - ..." so the bound belongs to this class. That is <code class='inl'>&gt;=</code>, not <code class='inl'>&gt;</code>: write the strict form and this drops one class cooler. The official set pins this edge from both sides (<code class='inl'>3700</code> is K, <code class='inl'>3699</code> is M).`;
  if (result === "O")
    return `Hotter than 30,000 K is the first test and it holds, so the walk ends immediately. O has <b>no upper bound</b> to write: "30,000 K or higher" is the whole rule, and starting from the hot end is what lets the other six bands stop worrying about anything above them.`;
  if (result === "M")
    return `All six tests miss and the walk falls off the end, which is <b>M</b>. There is no <code class='inl'>temp &gt;= 0</code> line to run: the cool end is whatever is left, so the code stays correct even for a value the ranges never mention.`;
  return `The walk starts at the hot end and asks one question per rung. <b>${esc(String(t))}</b> K misses ${hitAt} test${hitAt === 1 ? "" : "s"} and then clears <code class='inl'>&gt;= ${fmt(b.min)}</code>, so it is <b>${result}</b>. It never checks "and below ${fmt(BANDS[hitAt - 1]!.min)}" because the rung above just said no. Each lower bound is the whole rule only because the order does the other half of the work.`;
}

// ── STEP — one comparison per line, hottest first ───────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">classification</span>(<span class="tok" data-t="arg">temp</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">if</span> (<span class="tok" data-t="O">temp &gt;= 30000</span>) <span class="k">return</span> <span class="st">"O"</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">if</span> (<span class="tok" data-t="B">temp &gt;= 10000</span>) <span class="k">return</span> <span class="st">"B"</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">if</span> (<span class="tok" data-t="A">temp &gt;= 7500</span>) <span class="k">return</span> <span class="st">"A"</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">if</span> (<span class="tok" data-t="F">temp &gt;= 6000</span>) <span class="k">return</span> <span class="st">"F"</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">if</span> (<span class="tok" data-t="G">temp &gt;= 5200</span>) <span class="k">return</span> <span class="st">"G"</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">if</span> (<span class="tok" data-t="K">temp &gt;= 3700</span>) <span class="k">return</span> <span class="st">"K"</span>;`,
  },
  {
    ln: 8,
    html: `  <span class="k">return</span> <span class="tok" data-t="M"><span class="st">"M"</span></span>;`,
  },
  { ln: 9, html: `}` },
];

const LADDER = BANDS.slice(0, 6); // the six tested rungs, in line order: line = index + 2
const q = (s: string) => JSON.stringify(s);

function trace(rawInput: number) {
  const temp = rawInput;
  const steps: DbgStep[] = [];
  const ruledOut: string[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      eval?: { expr: string; val: boolean };
      done?: boolean;
      ret?: string;
    } = {},
  ) => {
    // `ruledOut` is the record of misses; it exists as soon as the first test is
    // about to run (line 2) and stays for the rest of the call.
    const structs =
      line >= 2
        ? [
            {
              label: "ruled out (temp is below)",
              items: ruledOut.length > 0 ? [...ruledOut] : ["nothing yet"],
              newest: ruledOut.length > 0,
            },
          ]
        : [];
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? q(x.ret!) : undefined,
      frames: [
        {
          title: `classification(${temp})`,
          vars: { temp },
          changed: [],
          structs,
          ret: x.done ? { value: q(x.ret!) } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `One number in, one letter out, over seven bands that tile the line. Rather than seven two-sided range checks, the code tests only each band's <b>lower bound</b>, hottest first. That works because by the time a line runs, every hotter band has already been ruled out: the upper bound is implied by the line above it.`,
    { focus: "arg" },
  );

  for (let i = 0; i < LADDER.length; i++) {
    const b = LADDER[i]!;
    const line = i + 2;
    const hit = temp >= b.min;
    const ev = { expr: `${temp} >= ${b.min}`, val: hit };
    if (hit) {
      S(
        line,
        i === 0
          ? `<code class='inl'>${temp} &gt;= ${fmt(b.min)}</code> is true, so <b>return "${b.cls}"</b>. "30,000 K or higher" has no upper bound to write, and starting hot means the other six bands never need to say anything about being too hot.`
          : `<code class='inl'>${temp} &gt;= ${fmt(b.min)}</code> is true, so <b>return "${b.cls}"</b>. There is no "and less than ${fmt(LADDER[i - 1]!.min)}" in the test, because the line above just returned for anything that was not. ${temp === b.min ? `Here <code class='inl'>${temp}</code> is exactly the lower bound, which belongs to ${b.cls}: that is why the comparison is <code class='inl'>&gt;=</code> and not <code class='inl'>&gt;</code>.` : `Move the input down to exactly ${fmt(b.min)} and it still lands here; one below goes a rung cooler.`}`,
        { focus: b.cls, eval: ev, done: true, ret: b.cls },
      );
      return steps;
    }
    ruledOut.push(`${b.cls} (${fmt(b.min)}+)`);
    S(
      line,
      i === 0
        ? `<code class='inl'>${temp} &gt;= ${fmt(b.min)}</code> is false, so ${temp} K is cooler than every O star. Nothing is returned and the walk drops one line, now knowing the answer is below 30,000.`
        : `<code class='inl'>${temp} &gt;= ${fmt(b.min)}</code> is false. Combined with the earlier misses, <b>${b.cls}</b> and everything hotter are out, so the next test only has to ask about its own lower bound.`,
      { focus: b.cls, eval: ev },
    );
  }

  S(
    8,
    `All six tests missed, so <b>return "M"</b> with no condition at all. "0 K - 3,699 K" needs no test of its own: it is what is left, which is also why a value below zero or between two printed ranges cannot fall through a crack. A <code class='inl'>temp &gt;= 0</code> guard here would add a way to be wrong and no way to be right.`,
    { focus: "M", done: true, ret: "M" },
  );
  return steps;
}

export default {
  n: 55,
  id: "stellar-classification",
  title: "Space Week Day 1: Stellar Classification",
  dates: ["2025-10-04"],
  statement: `Given a star's surface temperature in kelvin, return its stellar classification: <code class="inl">"O"</code> for 30,000 K or higher, <code class="inl">"B"</code> 10,000-29,999, <code class="inl">"A"</code> 7,500-9,999, <code class="inl">"F"</code> 6,000-7,499, <code class="inl">"G"</code> 5,200-5,999, <code class="inl">"K"</code> 3,700-5,199, and <code class="inl">"M"</code> 0-3,699. <span class="rule">Example: <code class="inl">classification(5778)</code> → <code class="inl">"G"</code> — the Sun, at 5,778 K, is at least 5,200 and below 6,000, so it is yellow class G.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — at most six comparisons",
      approach: `Seven bands on one number line, and the shortest correct reading tests only each band's <b>lower bound</b>, hottest first: the first <code class='inl'>temp &gt;= min</code> that holds is the answer, and the miss above it is what supplies the upper bound. Three consequences, each visible in the ladder. <b>M is the fall-through</b>, not a test, so nothing needs a <code class='inl'>&gt;= 0</code> guard. <b><code class='inl'>&gt;=</code>, not <code class='inl'>&gt;</code></b>: 3700 is K and 6000 is F, and the official set pins both (3700/3699 and 6000). And the printed ranges leave a hole: <b>5199.5</b> (ours) is above "3,700-5,199" and below "5,200-5,999", so two-sided tests match no class. Every official input is an integer, so the grader cannot see it, but lower bounds alone cannot fall into it.`,
      code: `// Lower bounds only, hottest first. The miss above is the upper bound; M is what is left.
function classification(temp: number): string {
  if (temp >= 30000) return "O";
  if (temp >= 10000) return "B";
  if (temp >= 7500) return "A";
  if (temp >= 6000) return "F";   // >= : 6000 itself is F
  if (temp >= 5200) return "G";
  if (temp >= 3700) return "K";   // 5199.5 lands here, between the printed ranges
  return "M";                     // 0-3699: no guard needed
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "test by test",
      approach: `The function one comparison per line, with a "ruled out" list that grows with every miss and stays for the rest of the call, because that list is the reason the next test needs no upper bound. Start on <b>5778</b> (the Sun): it misses four tests and clears the fifth. <b>210000</b> returns on line 2 without reading the rest; <b>3699</b> falls through to line 8 with all six misses. <b>3700</b> and <b>6000</b> sit exactly on a lower bound, so they show why the test is <code class='inl'>&gt;=</code>. The input is floored to an integer here; the fractional <b>5199.5</b> is on the Solution tab. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "temp =",
            value: DBG_CASES[0]!,
            min: 0,
            max: Math.max(...DBG_CASES),
            presets: DBG_CASES,
            hint: "any whole number of kelvin",
          },
        }),
    },
  ],
} satisfies Challenge;
