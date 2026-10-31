// #78 · Integer Sequence — build the string by appending each number, 1 up to n.
// The output is text, not a total: "12345" is five characters, and 10 adds TWO of them.
//   out = ""                      -> start with a string so += concatenates
//   for i = 1..n:  out += i       -> each number is written out, left to right
// Two ways to go wrong, both silent:
//   - Start `out` at 0 and the += adds instead of joining, so sequence(5) gives 15.
//   - Think of the result as n characters long; from 10 up every number is wider than one digit.
// ONE approach, deliberately. Array.from(...).join("") is the same loop spelled differently, and
// nothing you could watch differs (CONTRIBUTING Tier 3 §1-§3).
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// All 4 official freeCodeCamp cases, in the grader's order: 5, 10, 1, 27.
// 100 is ours: the first n where a number is three digits wide, so the width of each piece changes twice.
const PRESETS = [5, 10, 1, 27, 100];
const OFFICIAL = 4; // PRESETS[0..3] are freeCodeCamp's.
const DEMO_MAX = 200;
const TRACE_MAX = 30; // 27 is the largest official n; the trace stays short enough to step through

const sequence = (n: number) => {
  let out = "";
  for (let i = 1; i <= n; i++) out += i;
  return out;
};
const clamp = (v: number, hi: number) => Math.max(1, Math.min(hi, Math.floor(v) || 1));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .is-row { display:flex; flex-wrap:wrap; gap:4px; margin:10px 0; }
    .is-n { font:700 13px var(--mono); padding:4px 8px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .is-n.w2 { border-color:var(--accent); color:var(--accent); }
    .is-n.w3 { border-color:var(--warn); color:var(--warn); }
    .is-str { font:700 15px var(--mono); word-break:break-all; padding:8px 10px; border-radius:7px; border:1px solid var(--good); color:var(--good); }
    .is-r { font:12px var(--mono); color:var(--muted); margin-top:6px; }
    .is-r b { color:var(--text); }
    .is-r.hot { color:var(--danger); }
    .is-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "number";
  inp.min = "1";
  inp.max = String(DEMO_MAX);
  inp.value = "10";
  ctl.append(el("span", "ctl-label", "n ="), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v, i) => {
    const c = el("button", "chip", String(v));
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inp.value = String(v);
      render();
    });
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const n = clamp(Number(inp.value), DEMO_MAX);
    const s = sequence(n);
    const total = (n * (n + 1)) / 2; // what a numeric accumulator would give
    out.innerHTML = "";
    const line = el("div", "result-line");
    const shown = s.length > 60 ? `${s.slice(0, 57)}...` : s;
    line.append(el("span", "badge ok", `sequence(${n}) → "${shown}"`));
    out.append(line);
    const row = el("div", "is-row");
    for (let i = 1; i <= n; i++) {
      const w = String(i).length;
      row.append(el("span", `is-n${w > 1 ? ` w${w}` : ""}`, String(i)));
    }
    out.append(row);
    out.append(el("div", "is-str", s));
    out.append(
      el(
        "div",
        "is-r",
        `<b>${n}</b> numbers, but <b>${s.length}</b> characters: pieces from 10 up are two digits wide (blue), from 100 up three (amber).`,
      ),
    );
    out.append(
      el(
        "div",
        "is-r hot",
        `Start <code class='inl'>out</code> at <b>0</b> and <code class='inl'>+=</code> adds instead of joining: you get <b>${total}</b>, not the string.`,
      ),
    );
    out.append(
      el(
        "div",
        "note",
        "The result has to be a string. Seeding the accumulator with <code class='inl'>\"\"</code> makes <code class='inl'>+=</code> concatenate, so each number is written out in full, in order.",
      ),
    );
  }
}

// ── STEP — the loop, one number at a time ────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">sequence</span>(<span class="tok" data-t="arg">n</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span></span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = 1; i &lt;= n</span>; i++) {`,
  },
  { ln: 4, html: `    <span class="tok" data-t="append">out += i</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 7, html: `}` },
];

function trace(input: number) {
  const n = clamp(input, TRACE_MAX);
  const steps: DbgStep[] = [];
  let i = 0;
  let out = "";
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
    const vars: Record<string, unknown> = { n };
    if (line >= 2) vars["out"] = `"${out}"`;
    if (line >= 3 && line <= 5) vars["i"] = i;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? `"${out}"` : undefined,
      frames: [
        {
          title: `sequence(${n})`,
          vars,
          changed: x.changed ?? [],
          structs: [],
          ret: x.done ? { value: `"${out}"` } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `Write the integers <b>1</b> through <b>${n}</b> one after another into a single string. The answer is text, so the work is joining, not adding.`,
    { focus: "arg" },
  );
  S(
    2,
    `Start <code class='inl'>out</code> as the empty string <b>""</b>. It has to be a string: seeded with <code class='inl'>0</code>, the <code class='inl'>+=</code> below would add the numbers and end at ${(n * (n + 1)) / 2}.`,
    { focus: "init", changed: ["out"] },
  );
  for (i = 1; i <= n; i++) {
    S(3, `<b>i = ${i}</b> is within <b>n = ${n}</b>, so this number still has to be written.`, {
      focus: "forcond",
      changed: ["i"],
      eval: { expr: `${i} <= ${n}`, val: true },
    });
    out += i;
    const w = String(i).length;
    S(
      4,
      `<code class='inl'>out += ${i}</code>: a string plus a number joins, so <b>"${i}"</b> is written on the end${w > 1 ? `, adding <b>${w}</b> characters in one go (${i} is ${w} digits wide)` : ""}. out is now ${out.length} character${out.length === 1 ? "" : "s"} long.`,
      { focus: "append", changed: ["out"] },
    );
  }
  S(
    3,
    `<b>i = ${i}</b> is past <b>n = ${n}</b>, so the loop ends. Every number from 1 to ${n} has been written exactly once.`,
    { focus: "forcond", eval: { expr: `${i} <= ${n}`, val: false } },
  );
  S(
    6,
    `<b>Return</b> <b>"${out}"</b>: ${n} numbers, ${out.length} characters${out.length === n ? "" : `, because from 10 up each number takes more than one`}.`,
    { focus: "ret", done: true },
  );
  return steps;
}

export default {
  n: 78,
  id: "integer-sequence",
  title: "Integer Sequence",
  dates: ["2025-10-27"],
  statement: `Given a positive integer, return a string with all of the integers from <code class="inl">1</code> up to, and including, the given number, in numerical order. <span class="rule">Example: <code class="inl">sequence(5)</code> → <code class="inl">"12345"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(total digits)",
      approach: `Start with an empty string and append each number from <code class='inl'>1</code> to <code class='inl'>n</code>. The empty string is what makes <code class='inl'>+=</code> join; seeded with <code class='inl'>0</code> it would add and return a sum. The result is longer than <code class='inl'>n</code> once numbers reach two digits: <code class='inl'>sequence(10)</code> is eleven characters, not ten. Type any n up to ${DEMO_MAX}, or use the chips: 5, 10, 1 and 27 are freeCodeCamp's, 100 is ours (three-digit pieces).`,
      code: `// Append each number to a string; "" makes += join instead of add.
function sequence(n: number): string {
  let out = "";
  for (let i = 1; i <= n; i++) {
    out += i;
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Watch <code class='inl'>out</code> grow one number per pass. Lines 3 and 4 alternate: the test, then the append. On <b>10</b> the append at <code class='inl'>i = 10</code> adds two characters at once. Cases 5, 10, 1 and 27 are freeCodeCamp's; the box accepts 1 to ${TRACE_MAX}. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "n =",
            value: 10,
            min: 1,
            max: TRACE_MAX,
            presets: PRESETS.filter((v) => v <= TRACE_MAX),
            hint: `1-${TRACE_MAX}; 5, 10, 1, 27 official`,
          },
        }),
    },
  ],
} satisfies Challenge;
