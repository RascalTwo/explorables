// #65 · String Count — count every start position, not every non-overlapping chunk.
// "Overlap" is the whole problem. "aaa" holds "aa" twice, at 0 and at 1, so after a hit the
// scan may only move ONE character on, never jump past the match. The tempting built-ins
// (text.split(pattern).length - 1, or a regex /pattern/g) both consume the match they find, so
// they count non-overlapping copies only. They agree with the right answer on most strings and
// disagree exactly where copies share a character:
//   - the official '101010101010101010101' / '101' is the case that catches it: 10 overlapping
//     copies (every second start) against 5 from a split. The other four official cases have no
//     shared characters, so split passes them and only this one fails it.
//   - a pattern longer than the text ('ab' / 'abc' is ours) matches nowhere; the loop bound
//     i + pattern.length <= text.length simply never lets a window start.
// ONE approach, deliberately. "indexOf from i + 1 after each hit" is the same scan with the
// comparison done by the engine, and its saving is a constant factor on strings a person can
// type (CONTRIBUTING Tier 3 §2/§3): a second tab would be an edit, not an approach.
// Click "101010101010101010101/101" to see ten overlapping copies, and the split count at five.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours. Each is "text/pattern".
//   aaa/aa — ours, the statement's own example: the copies share the middle 'a'.
//   ab/abc — ours: the pattern is longer than the text, so the loop never runs.
const CASES = [
  "abcdefg/def",
  "hello/world",
  "mississippi/iss",
  "she sells seashells by the seashore/sh",
  "101010101010101010101/101",
  "aaa/aa",
  "ab/abc",
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, number> = {
  "abcdefg/def": 1,
  "hello/world": 0,
  "mississippi/iss": 2,
  "she sells seashells by the seashore/sh": 3,
  "101010101010101010101/101": 10,
};
const MAX_TEXT = 40; // keeps the cells and the trace legible
const MAX_PAT = 12;

// Split on the first "/" only, so a pattern may not contain one; clamp both halves.
function parse(raw: string): [string, string] {
  const k = raw.indexOf("/");
  const text = (k < 0 ? raw : raw.slice(0, k)).slice(0, MAX_TEXT);
  const pattern = (k < 0 ? "" : raw.slice(k + 1)).slice(0, MAX_PAT);
  return [text, pattern];
}

// The graded function's loop, with the start of every match kept so the demo can draw them.
function scan(text: string, pattern: string) {
  const starts: number[] = [];
  for (let i = 0; i + pattern.length <= text.length; i++) {
    if (text.startsWith(pattern, i)) starts.push(i);
  }
  return starts;
}
// The wrong reading: each hit consumes its characters, so copies that share one are missed.
const nonOverlapping = (text: string, pattern: string) =>
  pattern === "" ? 0 : text.split(pattern).length - 1;

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
    .sc-in { width:300px; }
    .sc-cells { display:flex; flex-wrap:wrap; gap:3px; }
    .sc-cell { width:24px; text-align:center; font:700 13px var(--mono); padding:5px 0 3px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); }
    .sc-cell small { display:block; font:10px var(--mono); color:var(--muted); font-weight:400; }
    .sc-cell.hit { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, transparent); }
    .sc-cell.two { border-color:var(--warn); background:color-mix(in srgb, var(--warn) 22%, transparent); }
    .sc-cell.go small { color:var(--accent); font-weight:700; }
    .sc-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .sc-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .sc-r b { color:var(--text); }
    .sc-r.hot { border-color:var(--danger); color:var(--danger); }
    .sc-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input", "sc-in");
  inp.type = "text";
  inp.value = CASES[4]!;
  ctl.append(
    el("span", "ctl-label", "text / pattern ="),
    inp,
    el("span", "ctl-label", `(separated by /, up to ${MAX_TEXT} + ${MAX_PAT})`),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const b = el("button", "chip", esc(v));
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
    const [text, pattern] = parse(inp.value);
    const starts = scan(text, pattern);
    const result = starts.length;
    const key = `${text}/${pattern}`;
    const want = EXPECTED[key];
    out.innerHTML = "";
    const wrap = el("div", "sc-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `count("${esc(text)}", "${esc(pattern)}") → ${result}`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected ${want}`));
    const tries = Math.max(0, text.length - pattern.length + 1);
    line.append(
      el(
        "span",
        "opcount cool",
        `<span class="n">${tries}</span> ${tries === 1 ? "start" : "starts"} tried · ${result} ${result === 1 ? "hit" : "hits"}`,
      ),
    );
    wrap.append(line);

    // One cell per character; a start index is labelled, a character covered by two copies is amber.
    const cover = Array.from<number>({ length: text.length }).fill(0);
    for (const s of starts) for (let j = s; j < s + pattern.length; j++) cover[j]!++;
    const cells = el("div", "sc-cells");
    text.split("").forEach((c, i) => {
      const k = cover[i]!;
      cells.append(
        el(
          "div",
          `sc-cell${k > 1 ? " two" : k === 1 ? " hit" : ""}${starts.includes(i) ? " go" : ""}`,
          `${c === " " ? "&nbsp;" : esc(c)}<small>${starts.includes(i) ? "▸" + i : i}</small>`,
        ),
      );
    });
    wrap.append(cells);

    // The wrong reading, scored on the same input.
    const split = nonOverlapping(text, pattern);
    const cmp = el("div", "sc-cmp");
    cmp.append(
      el(
        "div",
        `sc-r${split !== result ? " hot" : ""}`,
        `split(pattern) count <b>${split}</b>${split !== result ? " ✗" : ""}`,
      ),
    );
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(text, pattern, starts, split)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every preset was picked to land on a different one.
function noteFor(text: string, pattern: string, starts: number[], split: number) {
  if (pattern === "")
    return `An empty pattern is not defined by the statement. This loop treats it as matching at every start position, including the one past the end, so it returns <b>${starts.length}</b>. Type a pattern to see the real thing.`;
  if (pattern.length > text.length)
    return `The pattern (<b>${pattern.length}</b> characters) is longer than the text (<b>${text.length}</b>), so it cannot fit anywhere. The loop bound <code class='inl'>i + pattern.length &lt;= text.length</code> is already false at <code class='inl'>i = 0</code>, the body never runs and the answer is <b>0</b>. Without that bound <code class='inl'>startsWith</code> would still say false every time, so the bound is a saving, not a fix. Ours, not freeCodeCamp's.`;
  const overlap = starts.some((s, k) => k > 0 && s - starts[k - 1]! < pattern.length);
  if (overlap)
    return `<b>${starts.length}</b> copies, and neighbouring ones <b>share characters</b> (amber): starts ${starts.slice(0, 6).join(", ")}${starts.length > 6 ? ", …" : ""} are closer together than the pattern is long. Advancing by one after every hit finds them all. Splitting on the pattern, or jumping past each match, consumes the characters it matched and reports only <b>${split}</b>. ${text === "101010101010101010101" ? "This is the one official case that tells the two apart: the other four have no shared characters." : ""}`;
  if (starts.length === 0)
    return `Every start position is tried (<b>${text.length - pattern.length + 1}</b> of them) and none matches, so the answer is <b>0</b>. A <i>no</i> has to look everywhere, where a hit would not stop the scan either: the count needs every start, so there is no early exit in this problem.`;
  return `<b>${starts.length}</b> ${starts.length === 1 ? "copy" : "copies"}, none sharing a character, so the plain scan and a non-overlapping split agree on <b>${split}</b>. That is why four of the five official cases cannot catch a split-based answer: only a string whose copies overlap can.`;
}

// ── STEP — slide the window one character at a time ──────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">count</span>(<span class="tok" data-t="arg">text, pattern</span>) {`,
  },
  { ln: 2, html: `  <span class="k">let</span> n = <span class="tok" data-t="zero">0</span>;` },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">let</span> i = 0; <span class="tok" data-t="bound">i + pattern.length &lt;= text.length</span>; <span class="tok" data-t="inc">i++</span>) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="test">text.<span class="fn">startsWith</span>(pattern, i)</span>) <span class="tok" data-t="hit">n++</span>;`,
  },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">n</span>;` },
  { ln: 7, html: `}` },
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
  const [text, pattern] = parse(raw);
  const q = `${JSON.stringify(text)}, ${JSON.stringify(pattern)}`;
  const m = pattern.length;
  const steps: DbgStep[] = [];
  let n = 0;
  let i = -1; // -1: `let i` has not run yet
  const found: number[] = [];

  const S = (line: number, note: string, x: Extra = {}) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = {
      text: JSON.stringify(text),
      pattern: JSON.stringify(pattern),
    };
    if (line >= 2) vars["n"] = n; // `let n` is line 2
    if (line >= 3 && line <= 4 && i >= 0) vars["i"] = i; // `let i` lives in the for header
    const structs = [];
    if (line >= 2)
      structs.push({
        label: "text",
        // The window under test is bracketed while the loop is on it.
        items: text.split("").map((c, k) => (line === 4 && k >= i && k < i + m ? `[${c}]` : c)),
      });
    if (line >= 2) structs.push({ label: "match starts", items: [...found], newest: true });
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `count(${q})`,
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
    `How many times does <b>${esc(JSON.stringify(pattern))}</b> appear in <b>${esc(JSON.stringify(text))}</b>, copies allowed to overlap? Overlap decides the design: after a hit the scan must move on by <i>one</i> character, not by the pattern's length, or the copies that share a character are skipped. So the plan is to try every possible start position and ask each one the same yes/no question.`,
    { focus: "arg" },
  );

  S(
    2,
    `<code class='inl'>n</code> counts hits and starts at 0. It is the only state the answer needs: each start position is judged on its own, so the scan has no memory of earlier hits and overlap costs nothing.`,
    { focus: "zero", changed: ["n"] },
  );

  const tries = Math.max(0, text.length - m + 1);
  i = 0;
  S(
    3,
    tries > 0
      ? `The window is <b>${m}</b> characters wide, so the last start that still fits is <b>${text.length - m}</b>: <code class='inl'>i + ${m} &lt;= ${text.length}</code> bounds the loop. That makes <b>${tries}</b> start position${tries === 1 ? "" : "s"} to try, 0 through ${text.length - m}.`
      : `The window is <b>${m}</b> characters wide but the text has only <b>${text.length}</b>: <code class='inl'>0 + ${m} &lt;= ${text.length}</code> is false at once, so there is nowhere to start and the body never runs.`,
    {
      focus: "bound",
      changed: ["i"],
      eval: { expr: `0 + ${m} <= ${text.length}`, val: tries > 0 },
    },
  );

  for (; i + m <= text.length; i++) {
    const hit = text.startsWith(pattern, i);
    const prev = found.at(-1);
    if (hit) {
      found.push(i);
      n++;
    }
    S(
      4,
      hit
        ? `At <b>${i}</b> the next ${m} characters are <b>${esc(JSON.stringify(text.slice(i, i + m)))}</b>, which is the pattern: a hit, so <code class='inl'>n</code> becomes <b>${n}</b>. ${prev !== undefined && i - prev < m ? `This copy starts only ${i - prev} after the last one (at ${prev}), inside it, so they <b>share ${m - (i - prev)} character${m - (i - prev) === 1 ? "" : "s"}</b>. Because the loop advances by one rather than by ${m}, it still sees it; a jump-past-the-match scan would have skipped straight over.` : `Nothing to its left overlaps it.`}`
        : `At <b>${i}</b> the next ${m} characters are <b>${esc(JSON.stringify(text.slice(i, i + m)))}</b>, not the pattern, so nothing is counted. The scan moves on by one either way: a miss gives no reason to skip ahead.`,
      {
        focus: hit ? "hit" : "test",
        changed: hit ? ["n", "i"] : ["i"],
        eval: { expr: `startsWith(pattern, ${i})`, val: hit },
      },
    );
  }

  S(
    3,
    `<code class='inl'>${i} + ${m} &lt;= ${text.length}</code> is false: a window starting here would run off the end of the text, so every start that fits has been tried and the loop is over.`,
    { focus: "bound", eval: { expr: `${i} + ${m} <= ${text.length}`, val: false } },
  );

  S(
    6,
    `<b>Return ${n}.</b> ${n === 0 ? "No start matched." : `Hits at ${found.join(", ")}.`} Splitting on the pattern would answer <b>${nonOverlapping(text, pattern)}</b>${nonOverlapping(text, pattern) === n ? ", which agrees here because no two copies share a character" : ", because it consumes each match and misses the copies that overlap it"}.`,
    { focus: "ret", done: true, result: String(n), ret: { value: String(n) } },
  );

  return steps;
}

export default {
  n: 65,
  id: "string-count",
  title: "String Count",
  dates: ["2025-10-14"],
  statement: `Given two strings, determine how many times the second string appears in the first. The pattern string <b>can overlap</b> in the first string. <span class="rule">Example: <code class="inl">count("aaa", "aa")</code> → <code class="inl">2</code> — the first two <code class="inl">a</code>'s and the second two.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n·m) — one compare per start",
      approach: `Try every start position and ask whether the pattern begins there. <b>Overlap is the whole problem.</b> After a hit the scan moves on by one character, not by the pattern's length, so copies that share a character are all found. The tempting one-liners, <code class='inl'>text.split(pattern).length - 1</code> and a global regex, both consume each match they find and count non-overlapping copies only. They pass four of the five official cases, which have no shared characters, and fail <b>101010101010101010101 / 101</b>: ten copies, five from a split. The loop bound <code class='inl'>i + pattern.length &lt;= text.length</code> stops before a window would run off the end, so a pattern longer than the text (<b>ab / abc</b>, ours) is 0 with no special case. <b>aaa / aa</b> is the statement's own example, and the demo shades characters covered by two copies. A single variant, deliberately: <code class='inl'>indexOf(pattern, i + 1)</code> after each hit is the same scan with the compare done by the engine, so a second tab would be an edit rather than an approach.`,
      code: `// Try every start position; advance by ONE so copies that share a character are all counted.
function count(text: string, pattern: string): number {
  let n = 0;
  // i + pattern.length <= text.length : stop once a window would run off the end
  for (let i = 0; i + pattern.length <= text.length; i++) {
    if (text.startsWith(pattern, i)) n++;
  }
  return n;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `The scan one start position at a time, with <code class='inl'>n</code> and <code class='inl'>i</code> appearing in the panel only once their lines have run, the window under test bracketed in the text, and the start of every hit collected in a list. Start on <b>101010101010101010101/101</b> — official — and watch hits land two apart, each one inside the last. <b>mississippi/iss</b> and <b>she sells seashells by the seashore/sh</b> are the other official cases with hits; <b>hello/world</b> never matches, and <b>abcdefg/def</b> matches once. <b>aaa/aa</b> and <b>ab/abc</b> are ours: the overlap from the statement, and a pattern too long to start. Type any text, a <code class='inl'>/</code>, then a pattern. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "text / pattern =",
            value: CASES[4]!,
            presets: CASES,
            hint: `separated by /, up to ${MAX_TEXT} + ${MAX_PAT}`,
          },
        }),
    },
  ],
} satisfies Challenge;
