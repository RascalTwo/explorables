// #31 · Array Diff — "in only one of the arrays" is symmetric; a one-way filter is not.
// The first thing everyone writes is `arr1.filter(x => !arr2.includes(x))`, and it is
// not slightly wrong — it is wrong in one direction and right in the other. The two
// opening official cases are deliberately mirror images of each other and both answer
// ["cherry"]; the one-way filter passes the second and returns [] on the first. So the
// fix is not a faster lookup, it is a SECOND pass: values only in arr1, then values
// only in arr2, concatenated. That is a symmetric difference, and the two Sets exist
// only so each of those membership questions costs O(1) instead of a rescan.
// The other half of the problem is the sort. Here the bare `.sort()` the statement
// seems to ask for is CORRECT — the values are strings — which is the exact opposite
// of #309 Number Sort, where the identical call is the entire bug. But "alphabetical"
// and "what .sort() does" only coincide while the data stays in one case, because the
// default comparator orders by UTF-16 code unit and every capital sorts before every
// lowercase. Load the mixed-case preset to watch "Mango" and "Zebra" land ahead of
// "apple" — no official case has a surviving capital, so the grader never finds out.
// ONE approach, deliberately: an includes()-based version is the same Set lesson
// #30 already ships as a full brute/opt pair, and a rerun of it here would be filler.
import { el, esc, mountDebugger } from "../shared.js";

// The 5 official freeCodeCamp cases first, in the grader's order, then two of ours.
//   mixed case — OURS. The official set never leaves a capital letter in the answer,
//     so it cannot expose that `.sort()` is a code-unit sort: "Mango" < "Zebra" <
//     "apple" because M=77, Z=90, a=97. This is the only preset where the returned
//     order and a human's idea of alphabetical disagree.
//   duplicate in arr1 — OURS. No official case repeats a value, so the spec never
//     says what should happen. Filtering the ARRAYS (not the Sets) keeps both copies;
//     that is a decision, and this preset is where you get to see it made.
// Cases 1 and 2 are the same pair swapped and both answer ["cherry"] — that is the
// mirror the one-directional filter fails, and it is why case 1 opens the demo.
const CASES = [
  { a: ["apple", "banana"], b: ["apple", "banana", "cherry"] },
  { a: ["apple", "banana", "cherry"], b: ["apple", "banana"] },
  { a: ["one", "two", "three", "four", "six"], b: ["one", "three", "eight"] },
  { a: ["two", "four", "five", "eight"], b: ["one", "two", "three", "four", "seven", "eight"] },
  { a: ["I", "like", "freeCodeCamp"], b: ["I", "like", "rocks"] },
  { a: ["apple", "Zebra", "kiwi"], b: ["kiwi", "Mango"] },
  { a: ["apple", "apple", "banana"], b: ["banana", "cherry"] },
];

const listOf = (s) => String(s).split(",").map((t) => t.trim()).filter((t) => t !== "");
const join = (a) => a.join(", ");
const q = (a) => `[${a.map((v) => `"${esc(v)}"`).join(", ")}]`;

// The graded function, spelled out so the demo and the debugger agree with the `code`.
const solve = (arr1, arr2) => {
  const inA = new Set(arr1), inB = new Set(arr2);
  return [...arr1.filter((x) => !inB.has(x)), ...arr2.filter((x) => !inA.has(x))].sort();
};

// What a one-directional solution returns. Never a second variant — it is not a
// slower approach, it answers a different (asymmetric) question.
const oneWay = (arr1, arr2) => { const inB = new Set(arr2); return arr1.filter((x) => !inB.has(x)).sort(); };

// "Alphabetical" as a person means it, for contrast with the code-unit default.
const humanSort = (a) => [...a].sort((p, r) => p.localeCompare(r));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .adf-wrap { display:flex; flex-direction:column; gap:12px; }
    .adf-cols { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .adf-col { border:1px solid var(--border); border-radius:10px; padding:9px 10px; background:var(--panel-2); }
    .adf-ch { display:flex; align-items:baseline; gap:8px; margin-bottom:7px; }
    .adf-ch .nm { font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .adf-ch .ct { font:700 12px var(--mono); }
    .adf-col.a .adf-ch .ct { color:var(--c1); } .adf-col.b .adf-ch .ct { color:var(--c3); }
    .adf-items { display:flex; flex-wrap:wrap; gap:5px; }
    .adf-it { font:700 12.5px var(--mono); padding:4px 9px; border-radius:7px; border:1px solid var(--border); }
    .adf-col.a .adf-it.keep { border-color:var(--c1); color:var(--c1); background:color-mix(in srgb, var(--c1) 12%, transparent); }
    .adf-col.b .adf-it.keep { border-color:var(--c3); color:var(--c3); background:color-mix(in srgb, var(--c3) 12%, transparent); }
    .adf-it.gone { border-style:dashed; color:var(--muted); text-decoration:line-through; opacity:.6; }
    .adf-it.gone::before { content:"↔ "; text-decoration:none; display:inline-block; }
    .adf-flow { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
    .adf-arrow { font:700 15px var(--mono); color:var(--muted); }
    .adf-lbl { font:11px var(--sans); color:var(--muted); min-width:104px; }
    .adf-moved { border-color:var(--warn); color:var(--warn); }
    .adf-one { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .adf-one b { font-family:var(--mono); color:var(--text); }
    .adf-one.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .adf-one.split b { color:var(--danger); }
    .adf-warn { font:12px var(--sans); color:var(--warn); padding:5px 10px; border-radius:8px; border:1px solid var(--warn); background:color-mix(in srgb, var(--warn) 10%, transparent); }
    .adf-warn code.inl { color:var(--warn); }
    @media (max-width:640px) { .adf-cols { grid-template-columns:1fr; } }
  `));
}

function mount(host) {
  ensureStyle();
  const inA = el("input"), inB = el("input");
  const row = (label, inp, v) => {
    inp.type = "text"; inp.value = v; inp.style.width = "330px";
    const c = el("div", "controls"); c.append(el("span", "ctl-label", label), inp); return c;
  };
  const r1 = row("arr1", inA, join(CASES[0].a));
  const r2 = row("arr2", inB, join(CASES[0].b));
  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((c) => {
    const btn = el("button", "chip", `${join(c.a)} ⟷ ${join(c.b)}`);
    btn.onclick = () => { inA.value = join(c.a); inB.value = join(c.b); render(); };
    pre.append(btn);
  });
  const out = el("div");
  host.append(r1, r2, pre, out);
  inA.oninput = inB.oninput = render;
  render();

  function render() {
    const arr1 = listOf(inA.value), arr2 = listOf(inB.value);
    const setA = new Set(arr1), setB = new Set(arr2);
    const only1 = arr1.filter((x) => !setB.has(x));
    const only2 = arr2.filter((x) => !setA.has(x));
    const merged = [...only1, ...only2];
    const result = [...merged].sort();
    const half = oneWay(arr1, arr2);
    const agrees = JSON.stringify(half) === JSON.stringify(result);
    const human = humanSort(result);
    const caseSplit = JSON.stringify(human) !== JSON.stringify(result);

    out.innerHTML = "";
    const wrap = el("div", "adf-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${result.length ? "ok" : "no"}">arrayDiff(…) → ${q(result)}</span>` +
      `<span class="adf-one${agrees ? "" : " split"}">a one-way <b>arr1.filter(x =&gt; !inB.has(x))</b> returns <b>${q(half)}</b>` +
      `${agrees ? " — the same answer, on this input" : ` — it drops the ${only2.length} value${only2.length === 1 ? "" : "s"} that only arr2 has`}</span>`));

    // Both directions side by side. A shared value is struck through in BOTH columns,
    // because it cancels twice — once on each pass — and that is the symmetry.
    const cols = el("div", "adf-cols");
    [["a", "arr1 — only here", arr1, setB, only1], ["b", "arr2 — only here", arr2, setA, only2]]
      .forEach(([cls, label, arr, other, kept]) => {
        const col = el("div", `adf-col ${cls}`);
        col.append(el("div", "adf-ch", `<span class="nm">${label}</span><span class="ct">${kept.length}</span>`));
        const items = el("div", "adf-items");
        if (!arr.length) items.append(el("span", "muted", "(empty)"));
        arr.forEach((v) => items.append(el("span", "adf-it " + (other.has(v) ? "gone" : "keep"), esc(v))));
        col.append(items);
        cols.append(col);
      });
    wrap.append(cols);

    const shared = arr1.filter((x) => setB.has(x)).length;
    wrap.append(el("div", "muted",
      `${shared} value${shared === 1 ? "" : "s"} appear${shared === 1 ? "s" : ""} in both and cancel${shared === 1 ? "s" : ""} on <i>both</i> passes — struck through twice, kept nowhere. The survivors are what is left.`));

    // The concat, then the sort, as two separate rows: the sort is a real step and
    // you should be able to see it move things.
    const strip = (label, vals, marks) => {
      const f = el("div", "adf-flow");
      f.append(el("span", "adf-lbl", label));
      if (!vals.length) f.append(el("span", "muted", "(empty)"));
      vals.forEach((v, i) => f.append(el("span", "adf-it" + (marks && marks[i] ? " adf-moved" : ""), esc(v))));
      return f;
    };
    const movedAt = merged.map((v, i) => v !== result[i]);
    wrap.append(strip("only1 ++ only2", merged, null));
    wrap.append(el("div", "adf-flow", `<span class="adf-lbl"></span><span class="adf-arrow">↓ .sort()</span>`));
    wrap.append(strip("returned", result, movedAt));

    if (caseSplit) {
      wrap.append(el("div", "adf-warn",
        `The statement says <b>alphabetical</b>, and <code class='inl'>.sort()</code> just said ${q(result)}. A person sorting these alphabetically writes ${q(human)}. The default comparator compares <b>UTF-16 code units</b>, so every capital (65–90) sorts before every lowercase (97–122) — <code class='inl'>"Z" &lt; "a"</code>. Real code wants <code class='inl'>.sort((a, b) =&gt; a.localeCompare(b))</code>; freeCodeCamp's grader wants the bare <code class='inl'>.sort()</code>, because no official case leaves a capital in the answer.`));
    }

    wrap.append(el("div", "note", noteFor(arr1, arr2, only1, only2, merged, result, half, agrees, caseSplit)));
    out.append(wrap);
  }
}

function noteFor(arr1, arr2, only1, only2, merged, result, half, agrees, caseSplit) {
  const dupes = result.length !== new Set(result).size;
  const reorder = JSON.stringify(merged) !== JSON.stringify(result);
  let lead;
  if (!only1.length && only2.length)
    lead = `Nothing in <b>arr1</b> survives — every one of its values also appears in arr2 — so the entire answer comes from the <i>second</i> pass. This is the shape that kills a one-directional solution: <code class='inl'>arr1.filter(x =&gt; !arr2.includes(x))</code> returns <b>[]</b> here and is perfectly correct on the mirrored input, which is why the bug reads as bad luck rather than a design error.`;
  else if (only1.length && !only2.length)
    lead = `Everything in <b>arr2</b> is also in arr1, so this time the whole answer comes from the <i>first</i> pass — and a one-directional filter would have looked right. Swap the two inputs and it returns <b>[]</b> on the same problem. Passing is not evidence when half the inputs can't distinguish the two.`;
  else if (!only1.length && !only2.length)
    lead = `The two arrays hold exactly the same set of values, so both passes come back empty and the answer is <b>[]</b>. Note that this is a statement about the <i>sets</i>, not the arrays — order and repeats were never going to matter.`;
  else
    lead = `Both passes contribute: <b>${only1.length}</b> from arr1 and <b>${only2.length}</b> from arr2. ${agrees
      ? `The one-way filter happens to agree on this input too, which it will whenever arr2 is a subset of arr1.`
      : `A one-directional filter would have returned <b>${q(half)}</b> — right values, half the answer.`}`;

  const tail = caseSplit
    ? ` And read the returned order carefully: it is what <code class='inl'>.sort()</code> does, not what "alphabetical" means to you. See the amber note above.`
    : reorder
      ? ` The sort is doing real work here — the concat handed it ${q(merged)} and it returned ${q(result)}. On this input the bare <code class='inl'>.sort()</code> is <i>correct</i>, because the values are strings and they are all one case; that is the exact opposite of <b>#309 Number Sort</b>, where the same call with no comparator is the entire bug.`
      : ` The concat order already happened to be alphabetical, so the sort changed nothing — which is worth noticing, because "my output looked right" is how a missing sort survives testing.`;

  const extra = dupes
    ? ` One more thing this input shows: <b>"${esc(result.find((v, i) => result.indexOf(v) !== i))}"</b> comes back twice. The Sets are used for <i>membership only</i> — the filters run over the original arrays — so a value repeated inside one array is repeated in the answer. Filter the Sets instead (<code class='inl'>[...inA].filter(…)</code>) and it silently dedupes. No official case repeats a value, so the spec never rules; pick one on purpose.`
    : "";

  return lead + tail + extra;
}

// ── STEP — the two filters unrolled, so each membership question is its own step ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">arrayDiff</span>(<span class="tok" data-t="params">arr1, arr2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> inB = <span class="tok" data-t="setb"><span class="k">new</span> <span class="fn">Set</span>(arr2)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="only1">only1</span> = [];` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="pick1">x</span> <span class="k">of</span> arr1) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="test1">!inB.<span class="fn">has</span>(x)</span>) <span class="tok" data-t="push1">only1.<span class="fn">push</span>(x)</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">const</span> inA = <span class="tok" data-t="seta"><span class="k">new</span> <span class="fn">Set</span>(arr1)</span>;` },
  { ln: 8, html: `  <span class="k">const</span> <span class="tok" data-t="only2">only2</span> = [];` },
  { ln: 9, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="pick2">y</span> <span class="k">of</span> arr2) {` },
  { ln: 10, html: `    <span class="k">if</span> (<span class="tok" data-t="test2">!inA.<span class="fn">has</span>(y)</span>) <span class="tok" data-t="push2">only2.<span class="fn">push</span>(y)</span>;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">const</span> merged = <span class="tok" data-t="merge">[...only1, ...only2]</span>;` },
  { ln: 13, html: `  <span class="k">return</span> <span class="tok" data-t="sort">merged.<span class="fn">sort</span>()</span>;` },
  { ln: 14, html: `}` },
];

// The debugger takes one text field, so both arrays travel in it: "a,b | c,d".
const PAIR = (c) => `${join(c.a)} | ${join(c.b)}`;
const STEP_PRESETS = CASES.map(PAIR);

function trace(raw) {
  const [left = "", right = ""] = String(raw).split("|");
  const arr1 = listOf(left), arr2 = listOf(right);
  const steps = [];
  const m1 = [], m2 = [];
  let cur1 = -1, cur2 = -1, x, y;
  let inB = null, inA = null, only1 = null, only2 = null, merged = null;
  const S = (line, note, o = {}) => {
    const vars = { arr1: q(arr1), arr2: q(arr2) };
    if (line >= 4 && line <= 6 && x !== undefined) vars.x = `"${x}"`;
    if (line >= 9 && line <= 11 && y !== undefined) vars.y = `"${y}"`;
    // Each struct appears the moment its line runs and stays for the rest of the
    // call — arr1/arr2 are parameters, so they are on screen from step one, and the
    // ↔ marks fill in as each value is decided.
    const structs = [
      { label: "arr1", items: arr1.map((v, i) => `${i === cur1 ? "▶ " : ""}"${v}"${m1[i] || ""}`) },
      { label: "arr2", items: arr2.map((v, i) => `${i === cur2 ? "▶ " : ""}"${v}"${m2[i] || ""}`) },
    ];
    if (line >= 2) structs.push({ label: "inB", items: [...inB].map((v) => `"${v}"`) });
    if (line >= 3) structs.push({ label: "only1", items: only1.map((v) => `"${v}"`), newest: !!o.new1 });
    if (line >= 7) structs.push({ label: "inA", items: [...inA].map((v) => `"${v}"`) });
    if (line >= 8) structs.push({ label: "only2", items: only2.map((v) => `"${v}"`), newest: !!o.new2 });
    if (line >= 12) structs.push({ label: "merged", items: merged.map((v) => `"${v}"`) });
    steps.push({ line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: `arrayDiff(${q(arr1)}, ${q(arr2)})`, vars, changed: o.changed || [], structs, ret: o.ret }] });
  };

  S(1, `"Values that appear in <b>only one</b> of the arrays" is a question about <i>both</i> arrays, and it is symmetric — swap the arguments and the answer must not change. That is why what follows is two loops and not one. Everything else here is bookkeeping.`, { focus: "params" });

  inB = new Set(arr2);
  S(2, `Build a Set of <b>arr2</b> before touching arr1. The loop below asks "is this in arr2?" once per element of arr1, and <code class='inl'>includes</code> would answer each of those by rescanning arr2 from the start — ${arr1.length}×${arr2.length} comparisons. The Set is that same scan, done once and written down.`, { focus: "setb" });

  only1 = [];
  S(3, `<b>only1</b> collects the first half of the answer: values in arr1 that arr2 does not have. Half, not all — stopping here is the single most common way to get this problem wrong.`, { focus: "only1", changed: [] });

  for (let i = 0; i < arr1.length; i++) {
    cur1 = i; x = arr1[i];
    S(4, `Element <b>#${i + 1}</b> of arr1: <b>"${esc(x)}"</b>. Each value is judged on its own; nothing about this pass depends on the order of either array.`, { focus: "pick1", changed: ["x"] });
    const shared = inB.has(x);
    S(5, shared
      ? `<b>"${esc(x)}"</b> is in arr2 as well, so it is <i>shared</i> — and the rule is "only one of the arrays", so it is discarded. Watch what happens to it in the second loop: it gets thrown out again from the other side. A shared value cancels twice.`
      : `arr2 has never heard of <b>"${esc(x)}"</b>, so it belongs in the answer. This lookup is <b>O(1)</b> — that is the entire reason the Set was built on line 2.`,
      { focus: "test1", eval: { expr: `!inB.has("${x}")`, val: !shared } });
    if (shared) { m1[i] = " ↔"; continue; }
    only1.push(x); m1[i] = " ✓";
    S(5, `Push <b>"${esc(x)}"</b> onto only1 (now ${only1.length} value${only1.length === 1 ? "" : "s"}). Note it goes in <i>unsorted</i> and in arr1's order — the sort is deliberately left until the very end, once both halves exist.`, { focus: "push1", new1: true });
  }
  cur1 = -1; x = undefined;

  inA = new Set(arr1);
  S(7, `Now the mirror image. A second Set, this time of <b>arr1</b>, for the same reason: the next loop asks "is this in arr1?" once per element of arr2.${only1.length ? "" : ` And notice only1 came back <b>empty</b> — if the function returned here, it would return <b>[]</b>. Everything the answer contains is still ahead.`}`, { focus: "seta" });

  only2 = [];
  S(8, `<b>only2</b> collects the other half: values arr2 has that arr1 does not. Same code as lines 3–6 with the arguments swapped, which is exactly what "symmetric" buys you — if you can't write the second loop by flipping the names in the first, one of them is wrong.`, { focus: "only2" });

  for (let j = 0; j < arr2.length; j++) {
    cur2 = j; y = arr2[j];
    S(9, `Element <b>#${j + 1}</b> of arr2: <b>"${esc(y)}"</b>.`, { focus: "pick2", changed: ["y"] });
    const shared = inA.has(y);
    S(10, shared
      ? `<b>"${esc(y)}"</b> is in arr1 too — this is the second half of its cancellation, and it is the step a one-directional solution never runs at all.`
      : `arr1 does not have <b>"${esc(y)}"</b>. This value is invisible to <code class='inl'>arr1.filter(…)</code>, no matter how it is written, because that expression can only ever return things that were in arr1.`,
      { focus: "test2", eval: { expr: `!inA.has("${y}")`, val: !shared } });
    if (shared) { m2[j] = " ↔"; continue; }
    only2.push(y); m2[j] = " ✓";
    S(10, `Push <b>"${esc(y)}"</b> onto only2 (now ${only2.length} value${only2.length === 1 ? "" : "s"}).`, { focus: "push2", new2: true });
  }
  cur2 = -1; y = undefined;

  merged = [...only1, ...only2];
  S(12, `Concatenate the two halves: <b>${q(merged)}</b>. The order is an accident of how they were collected — arr1's survivors, then arr2's — and it is the wrong order almost always, which is what the next line is for.`, { focus: "merge" });

  const before = merged.slice();
  merged.sort();
  const moved = JSON.stringify(before) !== JSON.stringify(merged);
  const human = humanSort(merged);
  const caseSplit = JSON.stringify(human) !== JSON.stringify(merged);
  S(13, `<code class='inl'>.sort()</code> with no comparator${moved ? ` reorders ${q(before)} into <b>${q(merged)}</b>` : ` leaves ${q(merged)} exactly as it was`} — and sorts <b>in place</b>, so <code class='inl'>merged</code> itself is now the answer. ${caseSplit
    ? `But look at it: the default comparator compares <b>UTF-16 code units</b>, so <code class='inl'>"Z"</code> (90) sorts before <code class='inl'>"a"</code> (97) and the capitals all bunch at the front. A person writing these alphabetically would write ${q(human)}. freeCodeCamp's grader wants the bare <code class='inl'>.sort()</code>; real code wants <code class='inl'>.sort((a, b) =&gt; a.localeCompare(b))</code>.`
    : `Here the bare call is genuinely right: the values are strings, and lexicographic <i>is</i> alphabetical while they stay in one case. Load the mixed-case preset to see that qualifier matter — and compare with <b>#309 Number Sort</b>, where this same comparator-free call is the whole bug.`}`,
    { focus: "sort", done: true, result: q(merged), ret: { value: q(merged) } });

  return steps;
}

export default {
  n: 31, id: "arraydiff", title: "Array Diff", dates: ["2025-09-10"],
  statement: `Given two arrays of string values, return a new array containing all the values that appear in <b>only one</b> of the arrays. The returned array should be sorted in <b>alphabetical order</b>. <span class="rule">Example: <code class="inl">arrayDiff(["apple", "banana"], ["apple", "banana", "cherry"])</code> → <code class="inl">["cherry"]</code>, and so does the same pair swapped.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n + m) — two Sets, two passes",
      approach: `The phrase to read twice is <b>"in only one of the arrays"</b>. It is symmetric about its inputs — swap the arguments and the answer is unchanged — so the code has to be symmetric too. The first thing most people write, <code class='inl'>arr1.filter(x =&gt; !arr2.includes(x))</code>, is not: it can only ever return values that were in <code class='inl'>arr1</code>. freeCodeCamp puts the proof in the first two official cases, which are the same pair swapped and both answer <code class='inl'>["cherry"]</code>; the one-way filter returns <code class='inl'>[]</code> on the first and the right answer on the second. This is a <b>symmetric difference</b>, and it needs two passes: values only in arr1, then values only in arr2, concatenated. The two <code class='inl'>Set</code>s are the cheap part of the idea rather than the clever part — a membership question asked <i>n</i> times against a linear scan is <i>n</i>×<i>m</i> work, and a Set is that scan done once and written down. Then the sort, which is a real requirement and not a formality. Here the bare <code class='inl'>.sort()</code> is <b>correct</b>, because the values are strings — the exact opposite of <b>#309 Number Sort</b>, where the identical call is the entire bug. But the default comparator orders by <b>UTF-16 code unit</b>, so every capital sorts before every lowercase (<code class='inl'>"Z" &lt; "a"</code>), and "alphabetical" only means "what <code class='inl'>.sort()</code> does" while the data stays in one case. No official case leaves a capital in the answer, so the grader never notices; the <b>mixed-case</b> preset does. Edit either array and watch the one-way result diverge from the real one.`,
      code: `// "In only one of the arrays" is symmetric, so the filter has to run BOTH ways.
function arrayDiff(arr1: string[], arr2: string[]): string[] {
  // Sets for membership only: asking "is x in arr2?" once per element of arr1 is
  // n x m comparisons with includes(), and O(n + m) once the scan is written down.
  const inA = new Set(arr1);
  const inB = new Set(arr2);
  // One pass would answer "in arr1 but not arr2", which is [] whenever arr1 is a
  // subset of arr2 — i.e. wrong on the first official case and right on its mirror.
  const merged = [
    ...arr1.filter((x) => !inB.has(x)),
    ...arr2.filter((x) => !inA.has(x)),
  ];
  // Bare .sort() is right here because the values are strings — but it compares
  // UTF-16 code units, so "Zebra" would sort before "apple". Real alphabetical
  // ordering across mixed case wants .sort((a, b) => a.localeCompare(b)).
  return merged.sort();
}`,
      mount,
    },
    {
      name: "Step through", cost: "one membership question at a time",
      approach: `Both <code class='inl'>filter</code> calls unrolled into loops, so every membership question is its own step and you can watch a shared value get thrown out <b>twice</b> — once from each side. Start on the opening preset, <code class='inl'>apple,banana | apple,banana,cherry</code>: the first loop finishes with <code class='inl'>only1</code> still <b>empty</b>, which is precisely where a one-directional solution would have returned <code class='inl'>[]</code>. Then run the second preset, the same pair swapped, and watch the answer arrive from the other loop instead. The <b>mixed-case</b> preset is the one to step to the last line for — that is where <code class='inl'>.sort()</code> puts <code class='inl'>"Mango"</code> and <code class='inl'>"Zebra"</code> in front of <code class='inl'>"apple"</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "arr1 | arr2 =", value: PAIR(CASES[0]), presets: STEP_PRESETS, hint: "comma lists, separated by |" },
      }),
    },
  ],
};
