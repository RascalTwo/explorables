// #64 · 24 to 12 — hour % 12 || 12, suffix from h < 12; midnight and noon are the traps.
// The statement fixes the format ("HHMM", 0000 to 2359), so there is nothing to parse or validate.
// The suffix comes from h < 12, the hour from h % 12 || 12, and the minutes are never touched:
// they stay the string "MM" so a leading zero ("00", "05") survives.
// Three plausible shortcuts each fail on a specific hour:
//   - h > 12 ? h - 12 : h leaves midnight as "0:30 AM". The official set has one midnight case
//     ("0030") and it catches this.
//   - h <= 12 ? "AM" : "PM" calls noon "12:00 AM". NO official case has hour 12, so the grader
//     cannot tell < from <=. 1200 is ours.
//   - Number(mm) turns "00" into 0 and prints "9:0 AM". "0900" and "0030" catch it.
// ONE approach, deliberately. A lookup table of 24 labels or a Date round-trip is the same
// mapping respelled, and neither costs anything you could watch (CONTRIBUTING Tier 3 §1-§3).
// Click "1200", the case the grader never asks, and read the red rows.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then one of ours.
//   1200 - ours. Noon: the only input where h % 12 is 0 on the PM side, and the one hour the
//     official set never sends, so `h <= 12` for AM passes every official assertion.
const CASES = ["1124", "0900", "1455", "2346", "0030", "1200"];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, string> = {
  "1124": "11:24 AM",
  "0900": "9:00 AM",
  "1455": "2:55 PM",
  "2346": "11:46 PM",
  "0030": "12:30 AM",
};

// Out-of-contract text is coerced to four digits inside 0000..2359 so the demo never shows NaN.
function norm(s: string) {
  const d = s.replaceAll(/\D/gu, "").slice(0, 4).padStart(4, "0");
  const h = Math.min(23, Number(d.slice(0, 2)));
  const m = Math.min(59, Number(d.slice(2)));
  return String(h).padStart(2, "0") + String(m).padStart(2, "0");
}
const suffixOf = (h: number) => (h < 12 ? "AM" : "PM");
const hourOf = (h: number) => h % 12 || 12;
const to12 = (t: string) => `${hourOf(+t.slice(0, 2))}:${t.slice(2)} ${suffixOf(+t.slice(0, 2))}`;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .tc-wrap { display:flex; flex-direction:column; gap:12px; }
    .tc-strip { display:grid; grid-template-columns:repeat(12, 1fr); gap:4px; }
    .tc-h { display:flex; flex-direction:column; align-items:center; gap:2px; font:12px var(--mono); padding:5px 0; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .tc-h b { color:var(--text); font-size:14px; }
    .tc-h.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, transparent); }
    .tc-h.on b { color:var(--accent); }
    .tc-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .tc-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .tc-r b { color:var(--text); }
    .tc-r.hot { border-color:var(--danger); color:var(--danger); }
    .tc-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let t = CASES[0]!;

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.maxLength = 4;
  inp.value = t;
  inp.style.width = "90px";
  ctl.append(
    el("span", "ctl-label", "time ="),
    inp,
    el("span", "ctl-label", "(HHMM, 0000 to 2359)"),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", v);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      t = v;
      inp.value = v;
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => {
    if (inp.value.trim() !== "") t = norm(inp.value);
    render();
  });
  render();

  function render() {
    const h = +t.slice(0, 2);
    const mm = t.slice(2);
    const result = to12(t);
    const want = EXPECTED[t];
    const wrap = el("div", "tc-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `to12("${t}") → "${result}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected "${esc(want)}"`));
    wrap.append(line);

    // All 24 hours as the clock shows them; the input's hour is lit.
    const strip = el("div", "tc-strip");
    for (let i = 0; i < 24; i++)
      strip.append(
        el(
          "div",
          `tc-h${i === h ? " on" : ""}`,
          `${String(i).padStart(2, "0")}<b>${hourOf(i)}</b>${suffixOf(i)}`,
        ),
      );
    wrap.append(strip);

    // The wrong readings, scored on the same input.
    const noFix = `${h > 12 ? h - 12 : h}:${mm} ${suffixOf(h)}`;
    const noon = `${hourOf(h)}:${mm} ${h <= 12 ? "AM" : "PM"}`;
    const num = `${hourOf(h)}:${Number(mm)} ${suffixOf(h)}`;
    const cmp = el("div", "tc-cmp");
    (
      [
        [`h - 12 only`, noFix],
        [`h &lt;= 12 is AM`, noon],
        [`Number(mm)`, num],
      ] as [string, string][]
    ).forEach(([name, v]) =>
      cmp.append(
        el(
          "div",
          `tc-r${v !== result ? " hot" : ""}`,
          `${name} <b>${v}</b>${v !== result ? " ✗" : ""}`,
        ),
      ),
    );
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(h, mm, result)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every preset was picked to land on a different one.
function noteFor(h: number, mm: string, result: string) {
  if (h === 0)
    return `Hour <b>0</b> is midnight. <code class='inl'>0 % 12</code> is 0, which is falsy, so <code class='inl'>|| 12</code> kicks in and the clock reads <b>12</b>, and <code class='inl'>0 &lt; 12</code> makes it AM: <b>${result}</b>. Subtracting 12 only when h &gt; 12 would print <b>0:${mm} AM</b>.`;
  if (h === 12)
    return `Hour <b>12</b> is noon, the hour the grader never asks. <code class='inl'>12 % 12</code> is 0, so <code class='inl'>|| 12</code> restores 12, and <code class='inl'>12 &lt; 12</code> is false, so it is PM: <b>${result}</b>. Write <code class='inl'>h &lt;= 12</code> for AM and this prints <b>12:${mm} AM</b> while still passing all five official tests.`;
  if (h < 12)
    return `Morning: <code class='inl'>${h} &lt; 12</code> is AM and <code class='inl'>${h} % 12</code> is ${h}, so the hour is unchanged and printed without a leading zero (<b>${result}</b>). The minutes <b>${mm}</b> are never converted to a number, so a "00" stays "00".`;
  return `Afternoon: <code class='inl'>${h} &lt; 12</code> is false, so PM, and <code class='inl'>${h} % 12</code> is <b>${h - 12}</b>: <b>${result}</b>. The same modulo that fixes 13 to 23 also sends 12 to 0, which is why the <code class='inl'>|| 12</code> is there.`;
}

// ── STEP — slice, suffix, hour ───────────────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">to12</span>(<span class="tok" data-t="arg">time</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> h = <span class="fn">Number</span>(<span class="tok" data-t="h">time.<span class="fn">slice</span>(0, 2)</span>);`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> mm = <span class="tok" data-t="mm">time.<span class="fn">slice</span>(2)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> suffix = <span class="tok" data-t="suffix">h &lt; 12 ? <span class="st">"AM"</span> : <span class="st">"PM"</span></span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> hour = <span class="tok" data-t="hour">h % 12 || 12</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">\`\${hour}:\${mm} \${suffix}\`</span>;`,
  },
  { ln: 7, html: `}` },
];

function trace(input: string) {
  const time = norm(input);
  const h = +time.slice(0, 2);
  const mm = time.slice(2);
  const suffix = suffixOf(h);
  const hour = hourOf(h);
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
    const vars: Record<string, unknown> = { time: `"${time}"` };
    if (line >= 2) vars["h"] = h; // `const h` is line 2
    if (line >= 3) vars["mm"] = `"${mm}"`; // `const mm` is line 3
    if (line >= 4) vars["suffix"] = `"${suffix}"`; // `const suffix` is line 4
    if (line >= 5) vars["hour"] = hour; // `const hour` is line 5
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [{ title: `to12("${time}")`, vars, changed: x.changed ?? [], ret: x.ret }],
    });
  };

  S(
    1,
    `A 24-hour string <b>"${time}"</b>: two digits of hour, two of minute. The statement guarantees the shape, so there is nothing to validate. The work is to turn the hour into a 1-12 number plus an AM/PM word and leave the minutes alone.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>slice(0, 2)</code> takes "${time.slice(0, 2)}" and <code class='inl'>Number</code> makes it <b>${h}</b>. The hour needs to be a number because we are about to compare and divide it.`,
    { focus: "h", changed: ["h"] },
  );
  S(
    3,
    `The minutes are cut with <code class='inl'>slice(2)</code> and kept as the <i>string</i> <b>"${mm}"</b>. Converting them to a number would drop a leading zero ("00" would print as 0), and they need no arithmetic at all.`,
    { focus: "mm", changed: ["mm"] },
  );
  S(
    4,
    `<b>${h} &lt; 12</b> is ${h < 12}, so the suffix is <b>${suffix}</b>. It is strict: hour 12 is noon, which is already PM, and <code class='inl'>&lt;=</code> would call it AM. The suffix is read from the <i>original</i> 24-hour value, which is why it is decided before the hour is changed.`,
    {
      focus: "suffix",
      changed: ["suffix"],
      eval: { expr: `${h} < 12`, val: h < 12 },
    },
  );
  S(
    5,
    `<code class='inl'>${h} % 12</code> is <b>${h % 12}</b>${
      h % 12 === 0
        ? `, which is falsy, so <code class='inl'>|| 12</code> replaces it: ${h === 0 ? "midnight" : "noon"} is shown as 12, never 0`
        : `, already a valid 1-11 clock hour, so <code class='inl'>|| 12</code> does nothing`
    }. Hour is <b>${hour}</b>. The modulo folds 13-23 onto 1-11; the <code class='inl'>|| 12</code> catches the two hours (0 and 12) that fold onto 0.`,
    { focus: "hour", changed: ["hour"] },
  );

  const res = `${hour}:${mm} ${suffix}`;
  S(
    6,
    `<b>Return "${res}".</b> The hour is interpolated as a number, so it has no leading zero ("9" not "09"), and the minutes go in as the untouched string.`,
    { focus: "ret", done: true, result: `"${res}"`, ret: { value: `"${res}"` } },
  );

  return steps;
}

export default {
  n: 64,
  id: "24-to-12",
  title: "24 to 12",
  dates: ["2025-10-13"],
  statement: `Given a string representing a time of day in the 24-hour format <code class="inl">"HHMM"</code>, return the time in its equivalent 12-hour format, <code class="inl">"H:MM AM"</code> or <code class="inl">"H:MM PM"</code>. The input is always a four-digit string from <code class="inl">"0000"</code> to <code class="inl">"2359"</code>. <span class="rule">Example: <code class="inl">to12("1455")</code> → <code class="inl">"2:55 PM"</code> — 14 is 2 in the afternoon; <code class="inl">to12("0030")</code> → <code class="inl">"12:30 AM"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1)",
      approach: `Split the string into hour and minutes and treat them differently. The <b>minutes</b> are never touched: they stay the string <code class='inl'>"MM"</code>, so "00" and "05" keep their zero. The <b>suffix</b> is <code class='inl'>h &lt; 12</code>, strictly, because 12 is noon and already PM. The <b>hour</b> is <code class='inl'>h % 12 || 12</code>: the modulo folds 13-23 onto 1-11, and the <code class='inl'>|| 12</code> catches the two hours the modulo sends to 0, midnight and noon. Three shortcuts fail. <code class='inl'>h &gt; 12 ? h - 12 : h</code> prints midnight as "0:30 AM"; the official <b>0030</b> catches it. <code class='inl'>Number(mm)</code> prints "9:0 AM"; <b>0900</b> catches it. <code class='inl'>h &lt;= 12</code> for AM prints noon as "12:00 AM", and <b>no official case has hour 12</b>, so all five official tests pass anyway; <b>1200</b> is ours. The demo lights the hour on a 24-hour strip, prints the clock's reading, and scores the three wrong readings in red on the same input.`,
      code: `// Minutes pass through as a string; only the hour needs arithmetic.
function to12(time: string): string {
  const h = Number(time.slice(0, 2));
  const mm = time.slice(2);               // stays a string: "00" keeps its zero
  const suffix = h < 12 ? "AM" : "PM";    // strict: 12 is noon, already PM
  const hour = h % 12 || 12;              // 0 and 12 fold to 0, so show 12
  return \`\${hour}:\${mm} \${suffix}\`;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Five lines, one fact per line, with <code class='inl'>h</code>, <code class='inl'>mm</code>, <code class='inl'>suffix</code> and <code class='inl'>hour</code> appearing only once their lines have run. Start with <b>0030</b> and watch line 6: <code class='inl'>0 % 12</code> is 0, falsy, so <code class='inl'>|| 12</code> fires. <b>1200</b> (ours) does the same with a PM suffix, and is the only case where line 5's test must be false at 12. <b>1124</b> and <b>0900</b> are morning, <b>1455</b> and <b>2346</b> are afternoon. Type any four digits. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "time =",
            value: CASES[0]!,
            presets: CASES,
            hint: "HHMM, 0000 to 2359",
          },
        }),
    },
  ],
} satisfies Challenge;
