// #77 · Duration Formatter — split seconds into h / m / s, then pad by position, not by habit.
// Three divisions, one formatting rule that changes with context:
//   h = floor(seconds / 3600)        m = floor((seconds % 3600) / 60)        s = seconds % 60
//   seconds are ALWAYS two digits    minutes are two digits only when an hours part sits in front of them
//   hours appear only when h > 0     so 500 is "8:20" but 4000 is "1:06:40"
// The one trap is the minutes field. The statement says to omit its leading zero, yet the official
// 4000 -> "1:06:40" keeps one: "omit" only applies when minutes lead the string. Padding minutes
// unconditionally breaks 500 ("08:20"); never padding them breaks 4000 ("1:6:40"). The hour boundary
// is the sharp case (ours): 3600 is "1:00:00", minutes of zero still padded because hours are present.
// Hours are never wrapped at 24: 99999 -> "27:46:39".
// ONE approach, deliberately. A subtract-in-a-loop version (peel off 3600s, then 60s) is the same
// divisions respelled, slower on huge inputs but nothing on screen differs for any realistic duration
// (CONTRIBUTING Tier 3 §1-§3). Type any number of seconds, or use a chip.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// Cases 1-5 are freeCodeCamp's five assertions in the grader's order. 6-7 are ours.
//   6 - 3600: the exact hour boundary; zero minutes must still pad because an hour leads
//   7 - 0: the degenerate duration; minutes fall back to "0", seconds still pad
const CASES: { secs: number; exp?: string }[] = [
  { secs: 500, exp: "8:20" },
  { secs: 4000, exp: "1:06:40" },
  { secs: 1, exp: "0:01" },
  { secs: 5555, exp: "1:32:35" },
  { secs: 99999, exp: "27:46:39" },
  { secs: 3600 },
  { secs: 0 },
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (secs: number) => ({
  h: Math.floor(secs / 3600),
  m: Math.floor((secs % 3600) / 60),
  s: secs % 60,
});
const format = (secs: number) => {
  const { h, m, s } = parts(secs);
  return h === 0 ? `${m}:${pad(s)}` : `${h}:${pad(m)}:${pad(s)}`;
};

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .df-row { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
    .df-box { font:700 20px var(--mono); padding:8px 14px; border-radius:8px; border:1px solid var(--border); background:var(--panel-2); text-align:center; min-width:62px; }
    .df-box small { display:block; font:11px var(--mono); color:var(--muted); font-weight:400; }
    .df-box.off { opacity:.4; border-style:dashed; }
    .df-box.out { border-color:var(--accent); color:var(--accent); }
    .df-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); display:inline-block; margin-top:4px; }
    .df-r.hot { border-color:var(--danger); color:var(--danger); }
    .df-r b { color:var(--text); }
    .df-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let secs = CASES[0]!.secs;

  const pre = el("div", "controls");
  CASES.forEach((cs, i) => {
    const b = el("button", "chip", String(cs.secs));
    b.title = i < OFFICIAL ? `official freeCodeCamp case: "${cs.exp}"` : "ours";
    b.addEventListener("click", () => {
      secs = cs.secs;
      inp.value = String(secs);
      render();
    });
    pre.append(b);
  });
  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "number";
  inp.min = "0";
  inp.value = String(secs);
  inp.style.width = "140px";
  inp.addEventListener("input", () => {
    const v = Math.floor(Number(inp.value));
    secs = Number.isFinite(v) && v >= 0 ? v : 0;
    render();
  });
  ctl.append(el("span", "ctl-label", "seconds"), inp);

  const out = el("div");
  host.append(pre, ctl, out);
  render();

  function render() {
    out.innerHTML = "";
    const { h, m, s } = parts(secs);
    const result = format(secs);
    const idx = CASES.findIndex((cs) => cs.secs === secs);
    const want = idx >= 0 && idx < OFFICIAL ? CASES[idx]!.exp : undefined;

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `format(${secs}) → "${result}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected "${want}"`));
    out.append(line);

    const row = el("div", "df-row");
    const box = (label: string, val: string, cls = "") => {
      const b = el("div", `df-box ${cls}`, val);
      b.append(el("small", null, label));
      return b;
    };
    row.append(
      box("hours", String(h), h === 0 ? "off" : ""),
      box("minutes", String(m)),
      box("seconds", String(s)),
      box("output", result, "out"),
    );
    out.append(row);

    // The tempting shortcut: always pad minutes, so "8:20" becomes "08:20".
    const wrong = h === 0 ? `${pad(m)}:${pad(s)}` : result;
    const hot = wrong !== result;
    out.append(
      el(
        "div",
        `df-r${hot ? " hot" : ""}`,
        `pad minutes always <b>${wrong}</b>${hot ? " ✗" : ""} · pad only after an hour <b>${result}</b>`,
      ),
    );
    out.append(el("div", "note", noteFor(secs)));
  }
}

// What did THIS input exercise?
function noteFor(secs: number) {
  const { h, m, s } = parts(secs);
  if (h === 0)
    return `<b>${secs}</b> s is under an hour, so the hours part is dropped and the minutes lead the string as plain <b>${m}</b>: no padding, because nothing sits in front of them. Only the seconds (<b>${pad(s)}</b>) are forced to two digits.`;
  return `<b>${secs}</b> s holds <b>${h}</b> hour${h === 1 ? "" : "s"}, so the string has three fields and the minutes now sit in the middle: <b>${m}</b> becomes <b>${pad(m)}</b>${m < 10 ? ", the zero a leading minute would have lost" : ""}. Hours are never wrapped, however large.`;
}

// ── STEP — three divisions, then one branch ──────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">format</span>(<span class="tok" data-t="arg">seconds</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="pad">pad = n =&gt; <span class="fn">String</span>(n).<span class="fn">padStart</span>(2, <span class="st">"0"</span>)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> h = <span class="tok" data-t="h">Math.<span class="fn">floor</span>(seconds / 3600)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> m = <span class="tok" data-t="m">Math.<span class="fn">floor</span>((seconds % 3600) / 60)</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> s = <span class="tok" data-t="s">seconds % 60</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">if</span> (<span class="tok" data-t="test">h === 0</span>) <span class="k">return</span> <span class="tok" data-t="short">m + <span class="st">":"</span> + <span class="fn">pad</span>(s)</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">return</span> <span class="tok" data-t="long">h + <span class="st">":"</span> + <span class="fn">pad</span>(m) + <span class="st">":"</span> + <span class="fn">pad</span>(s)</span>;`,
  },
  { ln: 8, html: `}` },
];

function trace(idx: number) {
  const cs = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const secs = cs.secs;
  const { h, m, s } = parts(secs);
  const result = format(secs);
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { seconds: secs };
    if (line >= 3) vars["h"] = h;
    if (line >= 4) vars["m"] = m;
    if (line >= 5) vars["s"] = s;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? `"${result}"` : undefined,
      frames: [
        {
          title: `format(${secs})`,
          vars,
          changed: x.changed ?? [],
          structs: line >= 5 ? [{ label: "h  m  s", items: [h, m, s].map(String) }] : [],
          ret: x.done ? { value: `"${result}"` } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `Start from <b>${secs}</b> seconds. The output has up to three fields, and which ones appear (and how wide) depends on how big the number is, so first pull the number apart into hours, minutes and seconds.`,
    { focus: "arg" },
  );
  S(
    2,
    `A tiny helper that left-pads to two digits. It is not applied everywhere on purpose: the seconds always need it, but the minutes only sometimes do, and that choice is the whole challenge.`,
    { focus: "pad" },
  );
  S(
    3,
    `Whole hours: <code class='inl'>floor(${secs} / 3600)</code> = <b>${h}</b>. Flooring discards the remainder, which the next two lines recover. Hours are not capped at 24, so a long duration just gives a big number.`,
    { focus: "h", changed: ["h"] },
  );
  S(
    4,
    `Minutes are what is left after the hours, in 60s: <code class='inl'>(${secs} % 3600)</code> = ${secs % 3600}, and <code class='inl'>floor(${secs % 3600} / 60)</code> = <b>${m}</b>. Taking the remainder first is what keeps m below 60.`,
    { focus: "m", changed: ["m"] },
  );
  S(
    5,
    `Seconds are the leftover under a minute: <code class='inl'>${secs} % 60</code> = <b>${s}</b>. The three parts now rebuild the input exactly (${h}x3600 + ${m}x60 + ${s} = ${secs}).`,
    { focus: "s", changed: ["s"] },
  );
  if (h === 0) {
    S(
      6,
      `<code class='inl'>h === 0</code> is true: no hour to show, so the minutes lead. They print as plain <b>${m}</b> with no padding (nothing precedes them, and the statement says to drop that leading zero), then <code class='inl'>pad(${s})</code> = <b>${pad(s)}</b>. Result <b>"${result}"</b>.`,
      { focus: "short", eval: { expr: "h === 0", val: true }, done: true },
    );
    return steps;
  }
  S(
    6,
    `<code class='inl'>h === 0</code> is false: there is an hour part, so the short form is skipped.`,
    { focus: "test", eval: { expr: "h === 0", val: false } },
  );
  S(
    7,
    `Now the minutes sit between two colons, so they must be two digits: <code class='inl'>pad(${m})</code> = <b>${pad(m)}</b>${m < 10 ? ` (the official 4000 case needs exactly this: "1:<b>06</b>:40", not "1:6:40")` : ""}. Seconds pad too, giving <b>"${result}"</b>.`,
    { focus: "long", done: true },
  );
  return steps;
}

export default {
  n: 77,
  id: "duration-formatter",
  title: "Duration Formatter",
  dates: ["2025-10-26"],
  statement: `Given an integer number of seconds, return a string representing the same duration in the format <code class="inl">"H:MM:SS"</code>. Seconds are always two digits. Minutes omit leading zeros when they aren't needed, using <code class="inl">"0"</code> if the duration is under a minute. Hours are included only if greater than zero. <span class="rule">Example: <code class="inl">format(500)</code> → <code class="inl">"8:20"</code>, but <code class="inl">format(4000)</code> → <code class="inl">"1:06:40"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1)",
      approach: `Three divisions split the number: <code class='inl'>floor(s / 3600)</code> hours, <code class='inl'>floor((s % 3600) / 60)</code> minutes, <code class='inl'>s % 60</code> seconds. Then one branch decides the shape. With no hours, minutes lead and stay unpadded (<code class='inl'>"8:20"</code>); with hours, minutes sit in the middle and must be two digits (<code class='inl'>"1:06:40"</code>). The red line under the boxes scores the tempting shortcut of always padding minutes on the same input: it gives <code class='inl'>"08:20"</code>. Hours never wrap at 24. Type any seconds, or pick a chip: 1 to 5 are freeCodeCamp's, <b>3600</b> and <b>0</b> are ours (the hour boundary and the empty duration).`,
      code: `// Split into h / m / s, then pad by position: seconds always, minutes only after an hour.
function format(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h === 0) return m + ":" + pad(s);               // minutes lead: no padding
  return h + ":" + pad(m) + ":" + pad(s);             // minutes in the middle: two digits
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Eight lines. Lines 3 to 5 each add one variable to the panel as they run; line 6 is the only decision. Cases <b>1</b>, <b>3</b> and <b>7</b> take the short form and stop at line 6; <b>2</b>, <b>4</b>, <b>5</b> and <b>6</b> fall through to line 7. Compare <b>2</b> (4000: minutes 6 become "06") with <b>6</b> (3600: minutes 0 become "00"), and watch <b>5</b> keep 27 hours unwrapped. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${CASES.length - OFFICIAL} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
