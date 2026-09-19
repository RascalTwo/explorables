// #309 · Number Sort — the whole challenge is one JavaScript gotcha.
// EXEMPLAR MODULE: shows the contract in full — two variants, each with its own
// self-contained interactive demo, a scoped <style>, optional cost + code.
import { el, mountDebugger } from "../shared.js";

// All 4 official freeCodeCamp cases, in the order the grader lists them.
// No invented presets here — the official set already spans the interesting
// space (tiny, single-digit, multi-digit, negatives + duplicate zeros).
const PRESETS = ["3,1,2", "5,3,8,1,9,2", "12,61,49,80,19,50,77,38", "0,6,-19,44,-2,7,0"];
const parse = (s) => s.split(",").map((x) => x.trim()).filter((x) => x !== "").map(Number);

// One scoped style block, injected once, shared by both this challenge's demos.
// A challenge is free to bring whatever CSS it needs — the scaffold imposes none.
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ns-row { display:flex; flex-wrap:wrap; gap:5px; margin:10px 0; }
    .ns-n { font:700 14px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .ns-n.bad { border-color:var(--danger); color:var(--danger); }
    .ns-n.good { border-color:var(--good); color:var(--good); }
    .ns-cmp { font:12.5px var(--mono); color:var(--muted); margin-top:4px; }
    .ns-cmp b { color:var(--text); }
    .ns-cmp .win { color:var(--accent); }
  `));
}

function controls(host, onChange, initial) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = initial; inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "comma-separated"), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", v); c.onclick = () => { inp.value = v; onChange(inp.value); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = () => onChange(inp.value);
  queueMicrotask(() => onChange(inp.value)); // defer: caller's `const out = controls(...)` must finish first (TDZ)
  return out;
}

// Variant 1 — the naive call that silently breaks.
function mountNaive(host) {
  const out = controls(host, render, "12,61,49,80,19,50,77,38");
  function render(str) {
    const nums = parse(str);
    const lex = [...nums].sort();                 // default: coerce to strings
    const right = [...nums].sort((a, b) => a - b);
    const broken = JSON.stringify(lex) !== JSON.stringify(right);
    out.innerHTML = "";
    out.append(el("div", "muted", "<code class='inl'>[...nums].sort()</code> with no comparator:"));
    const row = el("div", "ns-row");
    lex.forEach((x, i) => row.append(el("span", "ns-n" + (broken && lex[i] !== right[i] ? " bad" : ""), String(x))));
    out.append(row);
    // show WHY: the first out-of-order adjacent string comparison
    if (broken) {
      let why = "";
      for (let i = 0; i < lex.length - 1; i++) {
        if (Number(lex[i]) > Number(lex[i + 1])) {
          const a = String(lex[i]), b = String(lex[i + 1]);
          why = `Compared as text, <b>"${a}"</b> &lt; <b>"${b}"</b> — because <span class="win">'${a[0]}'</span> &lt; <span class="win">'${b[0]}'</span> at the first character. So ${a} lands before ${b}, which is wrong for numbers.`;
          break;
        }
      }
      out.append(el("div", "ns-cmp", why));
    } else {
      out.append(el("div", "ns-cmp", "On this input the string order happens to match — try the multi-digit preset to see it break."));
    }
    out.append(el("div", "note", "Array.prototype.sort() converts every element to a string and sorts lexicographically. So \"12\" sorts before \"2\", and negatives scatter. It's not a bug in your data — it's the default comparator."));
  }
}

// Variant 2 — one comparator fixes it.
function mountFixed(host) {
  const out = controls(host, render, "12,61,49,80,19,50,77,38");
  function render(str) {
    const nums = parse(str);
    const right = [...nums].sort((a, b) => a - b);
    out.innerHTML = "";
    out.append(el("div", "muted", "<code class='inl'>[...nums].sort((a,b) =&gt; a - b)</code> — numeric compare:"));
    const row = el("div", "ns-row");
    right.forEach((x) => row.append(el("span", "ns-n good", String(x))));
    out.append(row);
    out.append(el("div", "ns-cmp", "The comparator returns a <b>negative / zero / positive</b> number, so sort orders by value, not by text. <span class='win'>a − b</span> ascending; <span class='win'>b − a</span> descending."));
    out.append(el("div", "note", "Parse with map(Number) first (the input is a string), then always pass a comparator. This is the entire challenge."));
  }
}

// ── STEP — the SAME insertion sort run TWICE, once per comparator, so the learner
// sees WHERE the two approaches diverge. Both parse the string, then insertion-sort;
// only the while-test differs: String(nums[j]) > String(key)  (default .sort, text)
// vs  nums[j] > key  (numeric).
//
// The first two DIVERGE — "12,2,3,100" sorts to [100,12,2,3] as text vs
// [2,3,12,100] numerically; "10,2,33,4" to [10,2,33,4] vs [2,4,10,33].
// The third is the CONTROL: every value is single-digit, so text order and
// numeric order are identical and both runs agree. That contrast is the point —
// the gotcha is invisible until a number has more digits than its neighbour, which
// is exactly why it survives casual testing. The control is freeCodeCamp's own
// official case, so it earns official coverage here as well.
const STEP_PRESETS = ["12,2,3,100", "10,2,33,4", "5,3,8,1,9,2"];

// Both step tabs share the same layout; only line 6 (the compare) and the closing
// comment differ. `whileHtml` is the inner condition, `retNote` the trailing comment.
const srcLines = (whileHtml, retNote) => [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">sortNumbers</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> nums = str.<span class="tok" data-t="split"><span class="fn">split</span>(<span class="st">","</span>)</span>.<span class="tok" data-t="map"><span class="fn">map</span>(Number)</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = 1; i &lt; nums.length</span>; i++) {` },
  { ln: 4,  html: `    <span class="k">const</span> <span class="tok" data-t="key">key = nums[i]</span>;` },
  { ln: 5,  html: `    <span class="k">let</span> <span class="tok" data-t="jinit">j = i - 1</span>;` },
  { ln: 6,  html: `    <span class="k">while</span> (<span class="tok" data-t="wcond">j &gt;= 0 &amp;&amp; ${whileHtml}</span>) {` },
  { ln: 7,  html: `      <span class="tok" data-t="shift">nums[j + 1] = nums[j]</span>;` },
  { ln: 8,  html: `      <span class="tok" data-t="jdec">j--</span>;` },
  { ln: 9,  html: `    }` },
  { ln: 10, html: `    <span class="tok" data-t="place">nums[j + 1] = key</span>;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="ret">nums</span>;  <span class="cm">// ${retNote}</span>` },
  { ln: 13, html: `}` },
];

const SRC_DEFAULT = srcLines(`String(nums[j]) &gt; String(key)`, `sorted as TEXT — wrong for numbers`);
const SRC_NUMERIC = srcLines(`nums[j] &gt; key`, `sorted by value — correct`);

// Why did the string comparison go the way it did? Cite the first differing char —
// this is the whole gotcha: "12" &lt; "2" because '1' &lt; '2' at position 0.
function textWhy(a, b) {
  const sa = String(a), sb = String(b);
  const len = Math.min(sa.length, sb.length);
  for (let k = 0; k < len; k++) {
    if (sa[k] !== sb[k]) {
      const rel = sa[k] > sb[k] ? "&gt;" : "&lt;";
      return `<span class="win">'${sa[k]}'</span> ${rel} <span class="win">'${sb[k]}'</span> at char ${k}`;
    }
  }
  return `"${sa}" is a prefix of "${sb}" — shorter text sorts first`;
}

// Instrumented run → generic debugger steps. mode="text" reproduces the DEFAULT
// comparator (elements stringified, compared lexicographically); mode="value" is
// the numeric a−b compare. One frame (no recursion); `nums` visibly REORDERS.
function traceSort(str, mode) {
  const src = parse(str);            // reuse the challenge's parser
  const steps = [];
  const nums = [];
  let i, key, j;
  const isText = mode === "text";
  const gt = isText ? (a, b) => String(a) > String(b) : (a, b) => a > b;
  const q = (a) => "[" + a.join(", ") + "]";
  const cmpExpr = (a, b) => isText ? `"${a}" > "${b}"` : `${a} > ${b}`;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3 && line <= 11) vars.i = i;   // for-loop index: block-scoped to the loop
    if (line >= 4 && line <= 11) vars.key = key; // const in the loop body
    if (line >= 5 && line <= 11) vars.j = j;     // let in the loop body
    const structs = [{ label: "nums", items: nums.slice(), newest: !!x.numsNew }];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `sortNumbers("${str}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, isText
    ? `Sort <b>"${str}"</b> the way <code class='inl'>.sort()</code> does by default — comparing elements as <b>text</b>. The argument arrives as one string.`
    : `Sort <b>"${str}"</b> comparing by <b>numeric value</b>. The argument arrives as one string.`, { focus: "param" });

  // ── parse ──
  const tokens = str.split(",").map((t) => t.trim()).filter((t) => t !== "");
  S(2, `<b>split(",")</b> cuts the text into ${tokens.length} pieces: ${tokens.map((t) => `"${t}"`).join(", ")}. These are still <b>strings</b>.`, { focus: "split" });
  for (let t = 0; t < tokens.length; t++) {
    nums.push(Number(tokens[t]));
    S(2, isText
      ? `<b>map(Number)</b> parses <b>"${tokens[t]}"</b> → <b>${Number(tokens[t])}</b>. But the default comparator will turn each number back into a string to compare it — so this parse buys nothing for ordering.`
      : `<b>map(Number)</b> parses <b>"${tokens[t]}"</b> into the number <b>${Number(tokens[t])}</b>. Converting first is exactly what lets the sort compare by <b>value</b>.`,
      { focus: "map", numsNew: true });
  }

  // ── insertion sort (comparator = mode) ──
  const n = nums.length;
  for (i = 1; i < n; i++) {
    S(3, `The part left of index <b>${i}</b> is already sorted. Insert <b>nums[${i}]</b> into its correct spot within it.`, { focus: "forcond", changed: ["i"], eval: { expr: `i = ${i} < ${n}`, val: true } });
    key = nums[i];
    S(4, `Lift out <b>key = nums[${i}] = ${key}</b>, leaving a gap. We'll slide bigger neighbours right until key fits.`, { focus: "key", changed: ["key"] });
    j = i - 1;
    S(5, `Scan the sorted part starting at <b>j = ${j}</b>, just left of the gap.`, { focus: "jinit", changed: ["j"] });
    for (;;) {
      const inRange = j >= 0;
      const nb = inRange ? nums[j] : null;
      const w = inRange && gt(nb, key);
      let why;
      if (!inRange) why = `j fell off the front of the array`;
      else if (isText) why = w
        ? `as <b>text</b>, "${nb}" &gt; "${key}" (${textWhy(nb, key)}) → slide it right`
        : `as <b>text</b>, "${nb}" is not &gt; "${key}" (${textWhy(nb, key)}) — key belongs here`;
      else why = w
        ? `<b>${nb} &gt; ${key}</b> by value, so it must move right`
        : `<b>${nb}</b> is not greater than <b>${key}</b> — key belongs right after it`;
      S(6, `While-test at <b>j = ${j}</b>: ${why} → <b>${w}</b>.`, { focus: "wcond", eval: { expr: inRange ? cmpExpr(nb, key) : `j = ${j} < 0`, val: w } });
      if (!w) break;
      nums[j + 1] = nums[j];
      S(7, `Slide <b>${nums[j]}</b> one slot right into index <b>${j + 1}</b>. The gap shifts left. (nums briefly shows a duplicate — the old slot is overwritten next.)`, { focus: "shift" });
      j--;
      S(8, `Step the scan down to <b>j = ${j}</b> and compare again.`, { focus: "jdec", changed: ["j"] });
    }
    nums[j + 1] = key;
    S(10, `Drop <b>key = ${key}</b> into the gap at index <b>${j + 1}</b>. The left part now reads <b>${q(nums.slice(0, i + 1))}</b>.`, { focus: "place" });
  }
  S(3, `<b>i = ${i}</b> reached the length — the sorted region now covers the whole array. Exit the loop.`, { focus: "forcond", eval: { expr: `i = ${i} < ${n}`, val: false } });
  S(12, isText
    ? `<b>Return</b> <b>${q(nums)}</b> — but ordered as <b>text</b>. On this input "12" and "100" landed before "2" because '1' &lt; '2' at the first character. Looks sorted, silently wrong for numbers.`
    : `<b>Return</b> the sorted numbers: <b>${q(nums)}</b>. By value, not by text — the payoff of comparing numerically.`,
    { focus: "ret", done: true, result: q(nums) });
  return steps;
}

const traceDefault = (str) => traceSort(str, "text");
const traceNumeric = (str) => traceSort(str, "value");
const STEP_INPUT = { type: "text", label: "numbers =", value: "12,2,3,100", presets: STEP_PRESETS, hint: "comma-separated" };

export default {
  n: 309, id: "sort", title: "Number Sort", dates: ["2026-06-15"],
  statement: `Given a comma-separated string of numbers, return them sorted smallest to largest. <span class="rule">The catch is JavaScript's default sort.</span>`,
  // Grouped by approach: each approach is [intuition viz] → [step through], paired by
  // tone. Both step tabs run the SAME insertion sort — only the comparator differs —
  // so the divergence (default sorts as text) is visible side by side.
  variants: [
    // graded: false — THE Tier 1 §3 exception, and the only one of its kind.
    // This variant is deliberately broken because the broken behaviour IS the
    // challenge: it fails the official negatives/multi-digit case exactly as a
    // learner's own `.sort()` would. Don't copy this opt-out; see CONTRIBUTING.
    { name: "Default .sort()", tone: "brute", cost: "sorts as TEXT", graded: false, approach: `<code class='inl'>.sort()</code> with no argument coerces each element to a string and compares lexicographically — <code class='inl'>"12" &lt; "2"</code>. It looks sorted but isn't. Watch the multi-digit preset.`, code: `// Looks right, silently wrong: default sort is lexicographic.\nfunction sortNumbers(str: string): number[] {\n  return str.split(",").map(Number).sort(); // "12" before "2"\n}`, mount: mountNaive },
    { name: "Step: default sort", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the <b>default comparator</b> — parse the string, then insertion-sort but decide each slide with <code class='inl'>String(nums[j]) &gt; String(key)</code>, exactly what <code class='inl'>.sort()</code> does. On <code class='inl'>"12,2,3,100"</code> watch it leave <b>12</b> and <b>100</b> before <b>2</b> because <code class='inl'>'1' &lt; '2'</code> char-by-char → wrong order. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_DEFAULT, trace: traceDefault, input: STEP_INPUT }) },
    { name: "Numeric comparator", tone: "opt", cost: "O(n log n)", approach: `Pass a comparator so sort orders by value. <code class='inl'>(a,b) =&gt; a - b</code> returns negative when a should come first. Parse with <code class='inl'>map(Number)</code> because the input arrives as a string.`, code: `// Parse to numbers, then sort with an explicit numeric comparator.\nfunction sortNumbers(str: string): number[] {\n  return str.split(",").map(Number).sort((a, b) => a - b);\n}`, mount: mountFixed },
    { name: "Step: numeric", tone: "opt", cost: "line-by-line",
      approach: `The <b>same</b> insertion sort, but each slide is decided by <code class='inl'>nums[j] &gt; key</code> — a <b>numeric</b> compare. On the same <code class='inl'>"12,2,3,100"</code> it produces the correct ascending order <code class='inl'>[2, 3, 12, 100]</code>. Compare it with the “Step: default sort” tab to see exactly where they diverge. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_NUMERIC, trace: traceNumeric, input: STEP_INPUT }) },
  ],
};
