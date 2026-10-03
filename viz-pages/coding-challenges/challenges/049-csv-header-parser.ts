// #49 · CSV Header Parser — split on the comma, then trim each cell, not the whole line.
// Two bullets, and the second one carries the problem: "remove any leading or trailing
// whitespace from EACH heading". Padding sits around every comma, not just at the two
// ends of the line, so .trim() on the line fixes the ends and leaves every interior
// cell dirty ("email " keeps its trailing space). The trim has to run per cell,
// after the split has decided where the cells are. The other tempting shortcut is to
// split on ", " — right for tidy files, wrong for "username , email", where the space
// sits BEFORE the comma and the separator never matches the way you wrote it.
// ONE approach, deliberately. A character-by-character scanner, or a single
// .split(/\s*,\s*/) with a .trim() bolted on, is the same transform respelled rather
// than a second mental model (Tier 3 §1), so the demo lets you swap the trim for the
// two wrong ones and watch what each leaves behind.
// Flip the mode to "trim the line only" on the third official case: the ends are clean
// and "email " still carries its trailing space.
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep, DbgStruct } from "../shared.js";

// The 3 official freeCodeCamp cases in the grader's order, then three of ours.
//   "id,,name," — ours. Two empty cells, one in the middle and one trailing: split
//     keeps them, so the answer is ["id", "", "name", ""] and not three headings.
//     The statement never says to drop blanks, so this solution does not.
//   "\"last, first\",age" — ours, and the ceiling of the whole approach. Real CSV
//     quotes a field to protect a comma inside it; a plain split cannot see quotes
//     and returns three headings where a CSV reader returns two. The statement only
//     promises "separated by commas", so this is out of scope, not a bug — but it is
//     the line where split(",") stops being a parser.
//   "\tid\t,  name" — ours. trim() strips ALL whitespace (tabs, newlines, NBSP), not
//     just the space bar, which is why the rule is .trim() and not a regex of spaces.
const OFFICIAL = ["name,age,city", "first name,last name,phone", "username , email , signup date "];
const CASES = [...OFFICIAL, "id,,name,", `"last, first",age`, "\tid\t,  name"];

// The grader's own answers, so the demo can show a verdict instead of asking you to
// take its word for it. Only the official three have one.
const EXPECTED: Record<string, string[]> = {
  "name,age,city": ["name", "age", "city"],
  "first name,last name,phone": ["first name", "last name", "phone"],
  "username , email , signup date ": ["username", "email", "signup date"],
};

const solve = (csv: string) => csv.split(",").map((h) => h.trim());

// Three ways to clean the line. `pieces` is where the cells are cut, `clean` is
// whether each piece gets its own trim afterwards. Only the first is correct.
const MODES: { label: string; pieces: (s: string) => string[]; clean: boolean }[] = [
  { label: "trim each heading", pieces: (s) => s.split(","), clean: true },
  { label: "trim the line only", pieces: (s) => s.trim().split(","), clean: false },
  { label: `split on ", "`, pieces: (s) => s.split(", "), clean: false },
];

const show = (t: string) => [...t].map((c) => (c === " " ? "·" : c === "\t" ? "→" : /\s/.test(c) ? "¶" : esc(c))).join("");
const q = (s: string) => JSON.stringify(s);
const list = (a: string[]) => `[${a.map(q).join(", ")}]`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .csh-wrap { display:flex; flex-direction:column; gap:11px; }
    .csh-chip { white-space:pre; }
    .csh-row { display:flex; flex-wrap:wrap; gap:6px; align-items:stretch; }
    .csh-cell { font:700 13px var(--mono); padding:6px 10px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); white-space:pre; }
    .csh-cell.empty { border-style:dashed; color:var(--muted); }
    .csh-pad { color:var(--muted); opacity:.7; }
    .csh-cut { color:var(--danger); text-decoration:line-through; }
    .csh-left { color:var(--warn); background:color-mix(in srgb, var(--warn) 22%, transparent); border-radius:3px; }
    .csh-head { font:700 13px var(--mono); padding:6px 10px; border:1px solid var(--good); border-radius:8px; background:color-mix(in srgb, var(--good) 14%, transparent); color:var(--good); white-space:pre; }
    .csh-head.bad { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent); color:var(--danger); }
    .csh-head.empty { border-style:dashed; }
    .csh-lab { font:700 10px var(--mono); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .csh-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .csh-cmp b { font-family:var(--mono); color:var(--text); }
    .csh-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .csh-cmp.split b { color:var(--danger); }
  `));
}

// One cell as it arrives from the split: leading padding, the heading, trailing
// padding. `clean` strikes the padding through (it is about to go); otherwise it is
// highlighted as what will be left behind.
function cellHtml(piece: string, clean: boolean) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(piece)!;
  const pad = (t: string) => (t ? `<span class="${clean ? "csh-cut" : "csh-left"}">${show(t)}</span>` : "");
  return `<div class="csh-cell${m[2] ? "" : " empty"}">${pad(m[1]!)}${m[2] ? esc(m[2]) : `<span class="csh-pad">∅</span>`}${pad(m[3]!)}</div>`;
}

function mount(host: HTMLElement) {
  ensureStyle();
  let mode = 0;

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = OFFICIAL[2]!; inp.style.width = "320px";
  ctl.append(el("span", "ctl-label", "csv ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  // white-space:pre keeps the padding visible on the chip — it is the input.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip csh-chip", `"${show(v)}"`);
    c.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });

  const mod = el("div", "controls");
  mod.append(el("span", "ctl-label", "cleaning"));
  const modChips = MODES.map((m, i) => {
    const c = el("button", "chip" + (i ? " bad" : " good"), m.label);
    c.onclick = () => { mode = i; render(); };
    mod.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, mod, out);
  inp.oninput = render;
  render();

  function render() {
    modChips.forEach((c, i) => c.classList.toggle("on", i === mode));
    const raw = String(inp.value);
    const m = MODES[mode]!;
    const pieces = m.pieces(raw);
    const result = m.clean ? pieces.map((h) => h.trim()) : pieces;
    const want = EXPECTED[raw] ?? solve(raw);
    const official = EXPECTED[raw] !== undefined;
    const ok = JSON.stringify(result) === JSON.stringify(want);

    out.innerHTML = "";
    const wrap = el("div", "csh-wrap");

    const line = el("div", "result-line");
    line.append(el("span", `badge ${ok ? "ok" : "no"}`, `getHeadings(${esc(q(raw))}) → ${esc(list(result))}`));
    if (official)
      line.append(el("span", "csh-cmp" + (ok ? "" : " split"),
        ok ? `matches freeCodeCamp's expected <b>${esc(list(want))}</b>`
           : `freeCodeCamp expects <b>${esc(list(want))}</b> — this cleaning fails the grader`));
    else if (!ok)
      line.append(el("span", "csh-cmp split", `the per-heading trim returns <b>${esc(list(want))}</b>`));
    wrap.append(line);

    wrap.append(el("div", "csh-lab", `cells the split cuts (${pieces.length})`));
    const cells = el("div", "csh-row");
    cells.innerHTML = pieces.map((p) => cellHtml(p, m.clean)).join("");
    wrap.append(cells);

    wrap.append(el("div", "csh-lab", `headings returned (${result.length})`));
    const heads = el("div", "csh-row");
    heads.innerHTML = result.map((h) => `<div class="csh-head${h !== h.trim() ? " bad" : ""}${h ? "" : " empty"}">${h ? show(h) : "∅"}</div>`).join("");
    wrap.append(heads);

    wrap.append(el("div", "muted",
      `<code class='inl'>·</code> is a space, <code class='inl'>→</code> a tab, <code class='inl'>∅</code> an empty cell. Struck-through padding is what <code class='inl'>.trim()</code> removes; amber padding is what this cleaning leaves in the heading.`));
    wrap.append(el("div", "note", noteFor(raw, mode, result, pieces)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different rule, because every
// preset was chosen to land on a different one.
function noteFor(raw: string, mode: number, result: string[], pieces: string[]) {
  const left = result.filter((h) => h !== h.trim()).length;
  if (mode === 1)
    return left
      ? `<code class='inl'>csv.trim()</code> cleaned the <b>two ends of the line</b> and nothing else. <b>${left}</b> of the ${result.length} headings still carry padding — in the amber, around a comma that sits <i>inside</i> the line, where a line-level trim cannot reach. The statement says each <b>heading</b>, and a heading is a cell, so the trim has to run after the split has found the cells, once per cell.`
      : `This input has no padding next to an inner comma, so trimming the line is enough and nothing visibly breaks — which is the dangerous half of the story. The two plainest official cases cannot tell this from the right answer. Click <code class='inl'>"username , email , signup date "</code> to see it fail.`;
  if (mode === 2) {
    if (raw.includes(",") && !raw.includes(", "))
      return `There is no comma-space in this string, so <code class='inl'>", "</code> matches <b>nothing</b> and the whole line comes back as <b>one</b> heading. The separator you wrote is not the one in the data — and nothing trims it, either. Pick a separator that does not depend on what surrounds it: split on the comma itself.`;
    if (JSON.stringify(result) !== JSON.stringify(solve(raw)) && !left)
      return `Splitting on <code class='inl'>", "</code> only cuts where a comma is <i>followed by a space</i>, which is a different set of cells from the commas in the line — here it leaves <b>${result.length}</b> where the commas make <b>${solve(raw).length}</b>. Split on the comma itself and the question never comes up.`;
    return left
      ? `Splitting on <code class='inl'>", "</code> assumes the space comes <b>after</b> the comma. Here it sits <i>before</i> it as well, so the separator you wrote down is not the one in the data and the cells keep their padding (<b>${left}</b> of ${result.length}). You would have to guess every shape of padding — space-comma, comma-tab, no space at all — and the trim already handles all of them.`
      : `<code class='inl'>", "</code> happens to match this input, so the answer comes out right — here. Tidy files are exactly the ones that hide this bug. Split on the comma itself and let <code class='inl'>.trim()</code> deal with whatever surrounds it.`;
  }
  if (raw.includes('"'))
    return `This is the ceiling of the technique, and it is ours, not freeCodeCamp's. The quotes in <code class='inl'>${esc(raw)}</code> exist to protect the comma inside <b>last, first</b>, but <code class='inl'>split(",")</code> cannot see quotes, so it cuts there and returns <b>${result.length}</b> headings where a CSV reader returns 2. The statement only promises headings "separated by commas", so the plain split is the answer to this challenge; a real file needs a quote-aware reader, and that is a state machine, not a one-liner.`;
  const blanks = pieces.filter((p) => !p.trim()).length;
  if (blanks)
    return `${blanks} empty cell${blanks === 1 ? "" : "s"} survive${blanks === 1 ? "s" : ""} as <code class='inl'>""</code>. Nothing in the statement says to drop blanks, and <code class='inl'>split</code> keeps one piece per comma: <b>n</b> commas always give <b>n + 1</b> cells. That arithmetic is also why the empty string returns <code class='inl'>[""]</code> and not <code class='inl'>[]</code> — no commas, one cell. Adding <code class='inl'>.filter(Boolean)</code> would be inventing a rule the grader never asked for.`;
  if (/[^\S ]/.test(raw))
    return `The padding here is a <b>tab</b>, drawn <code class='inl'>→</code>, and <code class='inl'>.trim()</code> removes it exactly as it removes a space — it strips every whitespace character, newlines and non-breaking spaces included. That is the reason to reach for <code class='inl'>trim</code> rather than a hand-written <code class='inl'>/^ +| +$/g</code>: "whitespace" in the statement is the whole class, and the built-in already means it.`;
  if (result.some((h, i) => h !== pieces[i]))
    return `Every cell was cut at a comma and then trimmed on its own, so the padding on <i>both sides of every comma</i> is gone — including the trailing space at the very end of the line. The two outer spaces are the easy part; the ones next to the inner commas are what a trim of the whole line would have missed. Switch to <b>trim the line only</b> to see them stay.`;
  return `No padding anywhere, so the trim has nothing to do and the cells come out as cut — one heading per comma-separated piece, spaces <i>inside</i> a heading (<b>first name</b>) untouched, because <code class='inl'>.trim()</code> only looks at the two ends of each cell. The rule it implements is still there, just idle: try the padded official case or type a space next to a comma.`;
}

// ── STEP — the one-liner unrolled, so the cut and the trim are separate lines ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getHeadings</span>(<span class="tok" data-t="arg">csv</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="cells">cells = csv.<span class="fn">split</span>(<span class="st">","</span>)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="out">headings = []</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="cell">cell</span> <span class="k">of</span> cells) {` },
  { ln: 5, html: `    <span class="tok" data-t="trim">headings.<span class="fn">push</span>(cell.<span class="fn">trim</span>())</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">headings</span>;` },
  { ln: 8, html: `}` },
];

function trace(rawInput: string) {
  const csv = String(rawInput);
  const steps: DbgStep[] = [];
  let cells: string[] = [], headings: string[] = [], cell: string | null = null;

  const S = (line: number, note: string, x: { focus?: string | undefined; changed?: string[] | undefined; eval?: { expr: string; val: boolean; } | undefined; done?: boolean | undefined; result?: string | undefined; ret?: { value: string; } | undefined } = {}) => {
    const vars: Record<string, unknown> = { csv: q(csv) };
    if (line >= 2) vars["cells"] = list(cells);          // `const cells` is line 2
    if (line >= 3) vars["headings"] = list(headings);    // `const headings` is line 3
    if (cell !== null) vars["cell"] = q(cell);           // only while the loop body is running
    const structs: DbgStruct[] = [];
    if (line >= 2) structs.push({ label: "cells", items: cells.map((c) => show(c) || "∅") });
    if (line >= 3) structs.push({ label: "headings", items: headings.map((h) => show(h) || "∅"), newest: headings.length > 0 && line === 5 });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getHeadings(${q(csv)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `One line of text in, a list out, and two rules: split at the commas, and strip whitespace from <b>each heading</b>. The word <i>each</i> is the design — it says the cleaning is per cell, which fixes the order of the two jobs below: find the cells first, then clean them one at a time.`, { focus: "arg" });

  cells = csv.split(",");
  S(2, `<code class='inl'>split(",")</code> cuts at every comma and nowhere else, so <b>${cells.length - 1}</b> comma${cells.length === 2 ? "" : "s"} give <b>${cells.length}</b> cell${cells.length === 1 ? "" : "s"}. Nothing has been cleaned yet — look at the padding on the cells below, because it is exactly what the next lines remove. It cuts on the <i>comma alone</i>, not on <code class='inl'>", "</code>, so it does not matter whether a space comes before, after or on both sides of the comma.`, { focus: "cells", changed: ["cells"] });

  S(3, `An empty result list, to be filled in the same order the cells came in. The loop is only here so you can watch the trim happen once per cell; the real solution is <code class='inl'>csv.split(",").map((h) => h.trim())</code>, which is this exact shape with the bookkeeping removed.`, { focus: "out", changed: ["headings"] });

  cells.forEach((c, i) => {
    cell = c;
    S(4, `Cell <b>${i + 1}</b> of ${cells.length}: <b>${q(c)}</b>. ${/^\s|\s$/.test(c) ? `It has padding at ${/^\s/.test(c) && /\s$/.test(c) ? "both ends" : /^\s/.test(c) ? "the front" : "the back"} — it came from the comma's neighbourhood, which is why a trim of the whole line could never have reached it.` : c ? `It is already clean.` : `It is empty — two commas in a row, or a comma at an end of the line.`}`, { focus: "cell", changed: ["cell"] });

    const h = c.trim();
    headings.push(h);
    S(5, `<code class='inl'>trim()</code> returns <b>${q(h)}</b>${h === c ? ` — unchanged, so <code class='inl'>push</code> just copies it` : `, ${c.length - h.length} whitespace character${c.length - h.length === 1 ? "" : "s"} shorter`}. It only looks at the <b>two ends</b> of this one cell, so a space <i>inside</i> a heading (${h.includes(" ") ? `<b>${esc(h)}</b> keeps its own` : `as in "first name"`}) is never touched. ${c.trim() === "" ? `An empty cell stays an empty heading: the statement does not say to drop blanks, so the answer keeps one entry per comma.` : `Whitespace here means the whole class — tabs and newlines go too, not just the space bar.`}`,
      { focus: "trim", changed: ["headings"], eval: { expr: `cell !== cell.trim()`, val: h !== c } });
  });
  cell = null;

  S(7, `<b>Return ${list(headings)}.</b> ${headings.length} cell${headings.length === 1 ? "" : "s"} in, ${headings.length} heading${headings.length === 1 ? "" : "s"} out — the list is always <b>commas + 1</b> long. The split decided where the headings are and the trim decided what is in them; neither could have been done by one call on the whole line.`,
    { focus: "ret", done: true, result: list(headings), ret: { value: list(headings) } });

  return steps;
}

export default {
  n: 49, id: "csvheaders", title: "CSV Header Parser", dates: ["2025-09-28"],
  statement: `Given the <b>first line</b> of a comma-separated values (CSV) file, return an array containing the <b>headings</b>. The first line of a CSV file contains headings separated by commas, and any <b>leading or trailing whitespace</b> must be removed from each heading. <span class="rule">Example: <code class="inl">getHeadings("username , email , signup date ")</code> → <code class="inl">["username", "email", "signup date"]</code> — the padding sits on both sides of every comma, and a space <i>inside</i> a heading stays.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one split, one trim per cell",
      approach: `The code is <code class='inl'>csv.split(",").map((h) => h.trim())</code>, and the interesting part is why it is <i>that</i> order. The statement has two bullets and the second carries the problem: remove whitespace from <b>each heading</b>. Padding sits around every comma, not just at the two ends of the line, so <code class='inl'>csv.trim().split(",")</code> fixes the outside and leaves every inner cell dirty — the third official case is built to catch exactly that. The other shortcut is <code class='inl'>split(", ")</code>, which assumes the space comes <i>after</i> the comma; in <code class='inl'>"username , email"</code> it comes before, so the separator you wrote is not the one in the data. Split on the one thing that is always there, the comma, and let <code class='inl'>trim()</code> absorb every shape of padding, tabs and newlines included. Use the cleaning toggle to watch both wrong versions fail the grader. Two of the presets are ours and each shows a boundary the grader does not reach. <code class='inl'>"id,,name,"</code> keeps its empty cells, because <b>n</b> commas always make <b>n + 1</b> cells and the statement never says to drop blanks. And <code class='inl'>"last, first",age</code> is where the approach <i>ends</i>: a quoted field may contain a comma, <code class='inl'>split</code> cannot see quotes, and a real CSV needs a quote-aware reader. The statement only promises "separated by commas", so the plain split is the right answer here — just know which side of that line you are on.`,
      code: `// Cut at every comma, then clean EACH cell on its own. A trim of the whole line
// would only fix the two ends; the padding next to every inner comma would stay.
// Splitting on ", " would assume the space comes after the comma, and it doesn't
// have to. Plain split keeps empty cells ("a,,b" -> ["a", "", "b"]).
// Known ceiling, untested by the grader: a quoted field ("last, first") holds a
// comma that split cannot tell from a separator.
function getHeadings(csv: string): string[] {
  return csv.split(",").map((heading) => heading.trim());
}`,
      mount,
    },
    {
      name: "Step through", cost: "split → trim each",
      approach: `The one-liner unrolled into a loop, so the <b>cut</b> and the <b>clean</b> are two separate lines you can step between. Start on <b>"username , email , signup date "</b> — the official padded case — and watch line 2 produce cells that still carry their padding, then line 5 take it off one cell at a time. <b>"id,,name,"</b> is ours: two empty cells survive as <code class='inl'>""</code>. <b>"last, first",age</b> is ours too, and traces to <b>3</b> headings where a real CSV reader returns 2. <b>"→id→,  name"</b> shows a tab being trimmed like a space. Type any line. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "csv =", value: OFFICIAL[2]!, presets: CASES, hint: "first line of a CSV" } }),
    },
  ],
} satisfies Challenge;
