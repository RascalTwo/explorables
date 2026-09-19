// #337 · Tally Counter — every mark is worth one; "/" is the fifth, not five.
// ONE approach: a mark is a mark. "|" and "/" each add 1, and the space is the
// only character that isn't a mark — so a group's own LENGTH is its count and
// "||||/".length is already 5. The misread is treating "/" as worth five (or
// multiplying groups by five and bolting on a remainder); both are the same
// mistake, and both are visible in the demo's "if / were worth five" line.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's official set, in the order the grader lists them.
// Cases 6–7 are invented, each for a reason the official set doesn't cover:
//   6 — "" is the degenerate input: no marks, no groups worth counting → 0.
//   7 — "||||/ ||||/" is the multi-group input with NO remainder, the one place
//       where the wrong mental model ("5 per group") accidentally agrees with
//       the right one. That agreement is exactly why the misread survives.
const CASES = [
  { input: "||||", want: 4 },
  { input: "||||/", want: 5 },
  { input: "||||/ |||", want: 8 },
  { input: "||||/ ||||/ ||||/ ||", want: 17 },
  { input: "||||/ ||||/ ||||/ ||||/ ||||/ ||||/ ||||/ ||||/ |", want: 41 },
  { input: "", want: 0 },
  { input: "||||/ ||||/", want: 10 },
];

// The solution itself — sum the length of every space-separated group.
const tallyCount = (str) => str.split(" ").reduce((n, g) => n + g.length, 0);

// Rebuild a canonical tally string for a total, so +1 / −1 can show the fifth
// mark turning into "/" and a fresh group opening.
function tallyOf(n) {
  const full = Math.floor(n / 5), rem = n % 5;
  const groups = Array.from({ length: full }, () => "||||/");
  if (rem) groups.push("|".repeat(rem));
  return groups.join(" ");
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .tc-board { display:flex; flex-wrap:wrap; gap:12px; margin:14px 0 4px; align-items:flex-end; }
    .tc-group { border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:9px 12px 6px; }
    .tc-group.full { border-color:var(--accent); }
    .tc-marks { display:flex; align-items:center; gap:7px; height:36px; }
    .tc-mark { width:3px; height:30px; border-radius:2px; background:var(--accent); }
    .tc-mark.slash { background:var(--warn); height:33px; transform:rotate(-28deg); }
    .tc-mark.bad { background:var(--danger); width:9px; border-radius:3px; }
    .tc-foot { margin-top:7px; display:flex; justify-content:space-between; gap:14px;
               font:700 10.5px var(--mono); color:var(--muted); letter-spacing:.03em; }
    .tc-foot b { color:var(--accent); }
    .tc-sum { font:13px var(--mono); color:var(--muted); margin-top:10px; line-height:1.7; }
    .tc-sum b { color:var(--text); }
    .tc-sum .pipe { color:var(--accent); font-weight:700; }
    .tc-sum .slash { color:var(--warn); font-weight:700; }
    .tc-sum .wrong { color:var(--danger); font-weight:700; }
  `));
}

function mount(host) {
  ensureStyle();

  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[2].input;
  inp.style.width = "360px";
  inp.style.font = "700 14px var(--mono)";

  const ctl = el("div", "controls");
  const minus = el("button", "chip", "− mark");
  const plus = el("button", "chip", "+ mark");
  ctl.append(el("span", "ctl-label", "tally ="), inp, minus, plus);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", (c.input === "" ? "(empty)" : c.input) + (i < 5 ? "" : " ✎"));
    chip.onclick = () => { inp.value = c.input; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", 'Type any tally string — <code class="inl">|</code>, <code class="inl">/</code> and spaces. The chips are freeCodeCamp\'s five official cases plus two of ours (✎). <b>+ mark</b> / <b>− mark</b> rebuild the string one mark at a time, so you can watch the fifth mark arrive as a <code class="inl">/</code>.'),
    ctl, pre, out,
  );

  const bump = (d) => { inp.value = tallyOf(Math.max(0, tallyCount(inp.value) + d)); render(); };
  minus.onclick = () => bump(-1);
  plus.onclick = () => bump(1);
  inp.oninput = render;
  render();

  function render() {
    const str = inp.value;
    const groups = str.split(" ");
    const total = tallyCount(str);

    out.innerHTML = "";
    const board = el("div", "tc-board");
    let running = 0;
    groups.forEach((g) => {
      if (!g.length) return;                       // a bare separator draws nothing
      running += g.length;
      const box = el("div", "tc-group" + (g.length === 5 ? " full" : ""));
      const marks = el("div", "tc-marks");
      for (const ch of g) {
        marks.append(el("div", "tc-mark" + (ch === "/" ? " slash" : ch === "|" ? "" : " bad")));
      }
      box.append(marks, el("div", "tc-foot", `<span>${g.length} mark${g.length === 1 ? "" : "s"}</span><b>${running}</b>`));
      board.append(box);
    });
    if (!board.children.length) board.append(el("div", "muted", "no marks — the tally is empty"));
    out.append(board);

    out.append(el("div", "result-line",
      `<span class="muted mono">getTallyCount("${esc(str)}") =</span>` +
      `<span class="num right">${total}</span>`));

    const pipes = [...str].filter((c) => c === "|").length;
    const slashes = [...str].filter((c) => c === "/").length;
    const junk = total - pipes - slashes;
    const sum = el("div", "tc-sum");
    sum.innerHTML =
      `<span class="pipe">${pipes} “|”</span> + <span class="slash">${slashes} “/”</span>` +
      (junk ? ` + <span class="wrong">${junk} non-mark character${junk === 1 ? "" : "s"}</span>` : "") +
      ` = <b>${total}</b>. The space is the only character that isn't a mark.<br>` +
      (slashes
        ? `If a <span class="slash">“/”</span> were worth <b>five</b> you'd get <span class="wrong">${total + 4 * slashes}</span> — it isn't. It closes a group of five; it doesn't <i>contain</i> one.`
        : `No <span class="slash">“/”</span> here, so nothing to misread yet — add a fifth mark and watch one appear.`);
    out.append(sum);

    if (junk) out.append(el("div", "note", "Characters other than <code class='inl'>|</code> and <code class='inl'>/</code> are drawn in red. The official inputs never contain them, and the solution counts every non-space character — so they land in the total."));
  }
}

// ── STEP — the counter line-by-line (single call frame) ───────────────────────
// `groups` becomes a struct the moment line 2 runs and stays for the rest of the
// call; `count` appears at line 3; the loop variable `g` lives only inside the
// body (lines 4–6) and only while the loop is actually running — a `inLoop`
// liveness flag drops it again on the exit check.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getTallyCount</span>(<span class="tok" data-t="str">str</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="split">groups = str.<span class="fn">split</span>(<span class="st">" "</span>)</span>;` },
  { ln: 3, html: `  <span class="k">let</span> <span class="tok" data-t="init">count = 0</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="g">g <span class="k">of</span> groups</span>) {` },
  { ln: 5, html: `    <span class="tok" data-t="add">count += g.length</span>;  <span class="cm">// "|" and "/" are both one mark</span>` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">count</span>;` },
  { ln: 8, html: `}` },
];

const q = (s) => `"${s}"`;

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const str = CASES[k - 1].input;
  const groups = str.split(" ");
  const steps = [];
  let count, g, inLoop = false;

  const S = (line, note, x = {}) => {
    const vars = { str: q(str) };
    if (line >= 3) vars.count = count;                      // `let count` is line 3
    if (inLoop && line >= 4 && line <= 6) vars.g = q(g);    // loop-body binding only
    const structs = [];
    if (line >= 2) structs.push({ label: "groups", items: groups.map(q) }); // `const groups` is line 2
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getTallyCount", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const marks = [...str].filter((c) => c !== " ").length;
  const slashes = [...str].filter((c) => c === "/").length;

  S(1, `Count the marks in <b>${q(str) === '""' ? "an empty string" : q(str)}</b>. The whole problem turns on one fact: <code class='inl'>"|"</code> and <code class='inl'>"/"</code> are each worth exactly <b>one</b>. The slash is the fifth mark of a group, not a stand-in for five.`, { focus: "str" });

  S(2, `Groups are separated by a space, so <b>split(" ")</b> cuts the string into <b>${groups.length}</b> group${groups.length === 1 ? "" : "s"}. Nothing is lost by splitting: the space is the only character in the input that <i>isn't</i> a mark, so every character that survives the split counts.`, { focus: "split" });

  count = 0;
  S(3, `Start the running total at <b>0</b>. We accumulate per group rather than per character because a group's <b>length</b> already <i>is</i> its mark count — there is nothing left to inspect inside it.`, { focus: "init", changed: ["count"] });

  groups.forEach((grp, i) => {
    inLoop = true;
    g = grp;
    const shape = g.length === 5
      ? `A complete group: four pipes and the slash that closed it.`
      : g.length === 0
        ? `An empty group — two separators landed next to each other, so there is nothing between them.`
        : `A partial group: it never reached five, which is precisely why it has no slash.`;
    S(4, `Take group <b>${i + 1}</b> of <b>${groups.length}</b> → <b>g = ${q(g)}</b>. ${shape}`, {
      focus: "g", changed: ["g"], eval: { expr: `groups[${i}] exists`, val: true },
    });

    const before = count;
    count += g.length;
    const why = g.length === 5
      ? `<b>${q(g)}.length</b> is <b>5</b> — and that 5 comes from counting five characters, not from multiplying the group by five. Drop the slash and it would be 4.`
      : g.length === 0
        ? `An empty string has length <b>0</b>, so this group contributes nothing and the total is unchanged.`
        : `<b>${q(g)}.length</b> is <b>${g.length}</b>. No arithmetic on group counts is needed; the characters already are the tally.`;
    S(5, `${why} Total: <b>${before} + ${g.length} = ${count}</b>.`, { focus: "add", changed: g.length ? ["count"] : [] });
  });

  inLoop = false;
  S(4, `Every group has been added, so the <code class='inl'>for…of</code> loop has nothing left to hand out. It ends, and <b>g</b> leaves scope — that's why it vanishes from the frame here.`, {
    focus: "g", eval: { expr: `groups[${groups.length}] exists`, val: false },
  });

  S(7, `<b>Return ${count}</b> — the number of mark characters in the string (${marks} of them, ${slashes === 1 ? "one of which is a slash" : `${slashes} of which are slashes`}). The reading that gets this wrong treats <code class='inl'>"/"</code> as worth five, which would answer <b>${count + 4 * slashes}</b>${slashes ? "" : " — indistinguishable here, because this input has no slash at all"}.`, {
    focus: "ret", done: true, result: count, ret: { value: count },
  });

  return steps;
}

export default {
  n: 337, id: "tally", title: "Tally Counter", dates: ["2026-07-13"],
  statement: `Given a string of tally marks, return the total count represented. Each pipe <code class="inl">"|"</code> is one count; every fifth mark is written as a forward slash <code class="inl">"/"</code>, completing a group of five (<code class="inl">"||||/"</code>). Groups are separated by a space. <span class="rule">Example: <code class="inl">getTallyCount("||||/ |||")</code> → <b>8</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `A mark is a mark. <code class='inl'>"|"</code> and <code class='inl'>"/"</code> each add <b>one</b> — the slash isn't worth five, it's just the fifth mark, the one that happens to close a group. So <code class='inl'>"||||/"</code> is already five <i>characters</i> long, and every group's own <code class='inl'>.length</code> is its count with no arithmetic at all. Split on the space (the only non-mark character) and sum the lengths. Watch the <b>if “/” were worth five</b> line: it's the answer you get from the tempting misread, and it's wrong on every input that has a slash.`,
      code: `// Each mark — "|" or "/" — is worth exactly one. The slash does not mean
// five; it is merely the fifth mark, so a full group "||||/" is already
// five characters long. The space is the only character that isn't a mark,
// which makes each group's own length its count.
function getTallyCount(str: string): number {
  let count = 0;
  for (const group of str.split(" ")) count += group.length;
  return count;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the counter — the string splits into a <code class='inl'>groups</code> struct, then one group at a time is folded into <code class='inl'>count</code> by its length. The notes call out, per group, <i>why</i> the length is the count: five characters, not five-per-group. Case <b>7</b> is the trap — two full groups where “5 × groups” happens to give the right answer too. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–5 official, 6–7 ours` },
      }),
    },
  ],
};
