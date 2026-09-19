// #6 · Anagram Checker — same letters, so compare the letter counts, not the order.
// • BRUTE: for every char of str1, `indexOf` re-scans what's left of str2 and
//   splices the match out — the pool shrinks, but each lookup still walks it.
// • OPT: tally str1's letters into a Map once, then spend str2 decrementing it.
//   Two linear passes, no rescanning.
// The official strings are all short, so the honest gap there is under 2x. The
// opening case is invented for that reason: the alphabet against its own reverse
// is the worst ordering for a front-scanning indexOf — 351 comparisons vs 52.
import { el, esc, mountDebugger } from "../shared.js";

// All 6 official freeCodeCamp cases, in the grader's order. The first three are
// the true ones and carry the interesting shapes — a plain rearrangement, a
// two-word pair with a space and mixed case, and a pair whose word boundaries
// move. The last three are the three distinct ways to be false: same length but
// different letters (Hello/World), different lengths (apple/banana), and a pair
// that shares nothing at all (cat/dog).
const PRESETS = [
  ["listen", "silent"],
  ["School master", "The classroom"],
  ["A gentleman", "Elegant man"],
  ["Hello", "World"],
  ["apple", "banana"],
  ["cat", "dog"],
  // Invented, and the reason the module has two approaches at all. Every official
  // pair is under 12 letters, where the brute's early bail keeps it within 2x of
  // the tally — on "listen"/"silent" and "cat"/"dog" it is actually cheaper. This
  // is the worst ordering a front-scanning indexOf can meet: each letter's partner
  // sits at the very back of what is left, so the O(n²) finally shows, 351 against
  // 52, on a pair that is still plainly an anagram.
  ["abcdefghijklmnopqrstuvwxyz", "zyxwvutsrqponmlkjihgfedcba"],
];

const norm = (s) => s.toLowerCase().replace(/\s/g, "");

// The brute run, instrumented: how many pool slots each character had to walk
// past before it found its match. That per-character number IS the wasteful act.
function bruteRun(s1, s2) {
  const a = norm(s1), pool = norm(s2).split("");
  if (a.length !== pool.length) return { ok: false, comparisons: 0, marks: [], lengthBail: true, a, pool: norm(s2).split("") };
  const marks = [];
  let comparisons = 0;
  for (const ch of a) {
    const at = pool.indexOf(ch);
    comparisons += at === -1 ? pool.length : at + 1;
    marks.push({ ch, at });
    if (at === -1) return { ok: false, comparisons, marks, lengthBail: false, a, pool: norm(s2).split("") };
    pool.splice(at, 1);
  }
  return { ok: true, comparisons, marks, lengthBail: false, a, pool: norm(s2).split("") };
}

// The optimized run: one increment per char of str1, one decrement per char of
// str2. `ops` is the honest count of map touches.
function tallyRun(s1, s2) {
  const a = norm(s1), b = norm(s2);
  const ta = new Map(), tb = new Map();
  for (const ch of a) ta.set(ch, (ta.get(ch) ?? 0) + 1);
  for (const ch of b) tb.set(ch, (tb.get(ch) ?? 0) + 1);
  const letters = [...new Set([...ta.keys(), ...tb.keys()])].sort();
  const rows = letters.map((ch) => ({ ch, na: ta.get(ch) ?? 0, nb: tb.get(ch) ?? 0 }));
  return { ok: a.length === b.length && rows.every((r) => r.na === r.nb), rows, ops: a.length + b.length, a, b };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ag-wrap { display:flex; flex-direction:column; gap:12px; }
    .ag-verdict { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .ag-verdict b { font:800 20px var(--mono); }
    .ag-verdict b.yes { color:var(--good); } .ag-verdict b.no { color:var(--danger); }
    .ag-chars { display:flex; flex-wrap:wrap; gap:4px; }
    .ag-ch { min-width:26px; text-align:center; padding:5px 6px; border-radius:7px; border:1px solid var(--border);
             background:var(--panel-2); font:800 14px var(--mono); position:relative; }
    .ag-ch .cost { display:block; font:700 9.5px var(--mono); color:var(--muted); margin-top:2px; }
    .ag-ch.hit { border-color:var(--good); color:var(--good); }
    .ag-ch.hit .cost { color:var(--good); opacity:.75; }
    .ag-ch.miss { border-color:var(--danger); color:var(--danger); }
    .ag-ch.miss .cost { color:var(--danger); }
    .ag-ch.dim { opacity:.35; }
    .ag-tally { display:grid; grid-template-columns:26px 1fr 1fr; gap:4px 8px; align-items:center; }
    .ag-let { font:800 14px var(--mono); color:var(--text); text-align:center; }
    .ag-bar { display:flex; align-items:center; gap:6px; height:22px; }
    .ag-bar .fill { height:14px; border-radius:4px; min-width:2px; }
    .ag-bar.l { flex-direction:row-reverse; }
    .ag-bar .num { font:700 11px var(--mono); color:var(--muted); min-width:12px; }
    .ag-row.same .fill { background:color-mix(in srgb, var(--good) 55%, transparent); }
    .ag-row.diff .fill { background:color-mix(in srgb, var(--danger) 60%, transparent); }
    .ag-row.diff .ag-let { color:var(--danger); }
    .ag-head { display:grid; grid-template-columns:26px 1fr 1fr; gap:4px 8px;
               font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .ag-head .r { text-align:right; } .ag-head .l { text-align:left; }
  `));
}

// Both demos share the same two text inputs + preset chips, so flipping the
// Approach toggle keeps you on the same pair.
function controls(host, onChange, init) {
  ensureStyle();
  const ctl = el("div", "controls");
  const i1 = el("input"); i1.type = "text"; i1.value = init[0]; i1.style.width = "160px";
  const i2 = el("input"); i2.type = "text"; i2.value = init[1]; i2.style.width = "160px";
  ctl.append(el("span", "ctl-label", "str1"), i1, el("span", "ctl-label", "str2"), i2);
  const pre = el("div", "controls");
  PRESETS.forEach(([a, b]) => {
    const c = el("button", "chip", `${a} / ${b}`);
    c.onclick = () => { i1.value = a; i2.value = b; onChange(i1.value, i2.value); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  i1.oninput = i2.oninput = () => onChange(i1.value, i2.value);
  queueMicrotask(() => onChange(i1.value, i2.value));
  return out;
}

// ── BRUTE demo — every character of str1, tagged with what its indexOf cost ──
function mountBrute(host) {
  const out = controls(host, render, PRESETS[6]);
  function render(s1, s2) {
    const r = bruteRun(s1, s2);
    out.innerHTML = "";
    const wrap = el("div", "ag-wrap");

    if (r.lengthBail) {
      wrap.append(el("div", "ag-verdict",
        `<span>lengths differ (${norm(s1).length} vs ${norm(s2).length}) —</span> <b class="no">false</b> <span>with 0 comparisons.</span>`));
      wrap.append(el("div", "note", "The length guard is free and settles a whole class of pairs before any scanning starts — that's why <code class='inl'>apple</code>/<code class='inl'>banana</code> costs nothing."));
      out.append(wrap); return;
    }

    const row = el("div", "ag-chars");
    r.marks.forEach((m) => {
      const cost = m.at === -1 ? "✗" : m.at + 1;
      row.append(el("div", "ag-ch " + (m.at === -1 ? "miss" : "hit"),
        `${esc(m.ch)}<span class="cost">${cost}</span>`));
    });
    // Characters never reached, because an earlier one already failed.
    for (let i = r.marks.length; i < r.a.length; i++)
      row.append(el("div", "ag-ch dim", `${esc(r.a[i])}<span class="cost">–</span>`));

    wrap.append(el("div", "muted", "Each character of <b>str1</b>, labelled with how many pool slots <code class='inl'>indexOf</code> walked to find it:"));
    wrap.append(row);
    wrap.append(el("div", "ag-verdict",
      `<span class="opcount hot"><span class="n">${r.comparisons}</span> comparisons</span> → <b class="${r.ok ? "yes" : "no"}">${r.ok}</b>`));
    wrap.append(el("div", "note", r.ok
      ? `Every letter found a partner and was spliced out, so the pool emptied exactly — <b>true</b>. But the total is the sum of those per-character walks: the pool shrinks, yet each lookup still starts from the front.`
      : `<b>'${esc(r.marks[r.marks.length - 1].ch)}'</b> isn't in what's left of the pool, so the scan bails at <b>false</b>. The greyed characters were never examined.`));
    out.append(wrap);
  }
}

// ── OPT demo — the two letter tallies, mirrored, row per letter ──────────────
function mountTally(host) {
  const out = controls(host, render, PRESETS[6]);
  function render(s1, s2) {
    const r = tallyRun(s1, s2);
    const max = Math.max(1, ...r.rows.map((x) => Math.max(x.na, x.nb)));
    out.innerHTML = "";
    const wrap = el("div", "ag-wrap");
    wrap.append(el("div", "ag-head", `<span></span><span class="r">str1</span><span class="l">str2</span>`));

    const grid = el("div", "ag-tally");
    r.rows.forEach(({ ch, na, nb }) => {
      const same = na === nb;
      const cell = (n, side) =>
        `<div class="ag-bar ${side}"><div class="fill" style="width:${(n / max) * 100}%"></div><span class="num">${n}</span></div>`;
      const g = el("div", "ag-row " + (same ? "same" : "diff"));
      g.style.display = "contents";
      g.innerHTML = `<div class="ag-let">${esc(ch)}</div>${cell(na, "l")}${cell(nb, "r")}`;
      grid.append(g);
    });
    wrap.append(grid);

    const bad = r.rows.filter((x) => x.na !== x.nb);
    wrap.append(el("div", "ag-verdict",
      `<span class="opcount cool"><span class="n">${r.ops}</span> map ops</span> → <b class="${r.ok ? "yes" : "no"}">${r.ok}</b>`));
    wrap.append(el("div", "note", r.ok
      ? `Every row is level, so the two strings are built from exactly the same multiset of letters — the definition of an anagram. Order never entered into it.`
      : r.a.length !== r.b.length
        ? `The lengths differ (${r.a.length} vs ${r.b.length}), so no tally can balance — <b>false</b> before the rows even matter.`
        : `${bad.length === 1 ? "One letter is" : `${bad.length} letters are`} out of balance (${bad.slice(0, 3).map((x) => `<b>${esc(x.ch)}</b> ${x.na}≠${x.nb}`).join(", ")}${bad.length > 3 ? ", …" : ""}) — <b>false</b>.`));
    wrap.append(el("div", "note", `Cost is <code class='inl'>str1.length + str2.length</code> map touches, regardless of how the letters are arranged. The brute tab on this same pair pays <b>${bruteRun(s1, s2).comparisons}</b>.`));
    out.append(wrap);
  }
}

// ── STEP: brute ─────────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">areAnagrams</span>(<span class="tok" data-t="param">str1</span>, <span class="tok" data-t="param">str2</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> a = <span class="tok" data-t="norma">str1.<span class="fn">toLowerCase</span>().<span class="fn">replace</span>(/\\s/g, <span class="st">""</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> pool = <span class="tok" data-t="normb">str2.<span class="fn">toLowerCase</span>().<span class="fn">replace</span>(/\\s/g, <span class="st">""</span>).<span class="fn">split</span>(<span class="st">""</span>)</span>;` },
  { ln: 4,  html: `  <span class="k">if</span> (<span class="tok" data-t="len">a.length !== pool.length</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 5,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch">ch</span> <span class="k">of</span> a) {` },
  { ln: 6,  html: `    <span class="k">const</span> at = <span class="tok" data-t="idx">pool.<span class="fn">indexOf</span>(ch)</span>;` },
  { ln: 7,  html: `    <span class="k">if</span> (<span class="tok" data-t="miss">at === -1</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 8,  html: `    <span class="tok" data-t="splice">pool.<span class="fn">splice</span>(at, 1)</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="k">true</span>;  <span class="cm">// pool emptied — every letter matched</span>` },
  { ln: 11, html: `}` },
];

// ── STEP: tally ─────────────────────────────────────────────────────────────
const SRC_TALLY = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">areAnagrams</span>(<span class="tok" data-t="param">str1</span>, <span class="tok" data-t="param">str2</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="fn">norm</span> = (s) =&gt; <span class="tok" data-t="norm">s.<span class="fn">toLowerCase</span>().<span class="fn">replace</span>(/\\s/g, <span class="st">""</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> a = <span class="fn">norm</span>(str1), b = <span class="tok" data-t="ab"><span class="fn">norm</span>(str2)</span>;` },
  { ln: 4,  html: `  <span class="k">if</span> (<span class="tok" data-t="len">a.length !== b.length</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 5,  html: `  <span class="k">const</span> tally = <span class="tok" data-t="new"><span class="k">new</span> <span class="fn">Map</span>()</span>;` },
  { ln: 6,  html: `  <span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> a) <span class="tok" data-t="inc">tally.<span class="fn">set</span>(ch, (tally.<span class="fn">get</span>(ch) ?? 0) + 1)</span>;` },
  { ln: 7,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch2">ch</span> <span class="k">of</span> b) {` },
  { ln: 8,  html: `    <span class="k">const</span> n = <span class="tok" data-t="get">tally.<span class="fn">get</span>(ch) ?? 0</span>;` },
  { ln: 9,  html: `    <span class="k">if</span> (<span class="tok" data-t="zero">n === 0</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 10, html: `    <span class="tok" data-t="dec">tally.<span class="fn">set</span>(ch, n - 1)</span>;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="k">true</span>;  <span class="cm">// every count came back to zero</span>` },
  { ln: 13, html: `}` },
];

// The step inputs take "str1 / str2" as one field, because mountDebugger hands
// the trace a single value. Same pairs as the demo presets, minus apple/banana —
// its length bail is 3 steps long and teaches nothing the others don't. It is
// still reachable by typing, and by preset on the demos above.
const STEP_PRESETS = ["abcdefghijklmnopqrstuvwxyz / zyxwvutsrqponmlkjihgfedcba", "listen / silent", "School master / The classroom", "A gentleman / Elegant man", "Hello / World", "cat / dog"];
const splitPair = (raw) => {
  const [s1 = "", s2 = ""] = String(raw).split("/");
  return [s1.trim(), s2.trim()];
};
const stepInput = (value) => ({ type: "text", label: "str1 / str2 =", value, presets: STEP_PRESETS, hint: "separated by /" });

function traceBrute(raw) {
  const [s1, s2] = splitPair(raw);
  const steps = [];
  const a = norm(s1);
  const pool = [];
  let ch, at, comparisons = 0;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.a = a || "(empty)";
    if (line >= 3) vars.comparisons = comparisons;
    if (line >= 6 && line <= 9 && ch !== undefined) vars.ch = ch;
    if (line >= 7 && line <= 9 && at !== undefined) vars.at = at;
    const structs = [];
    if (line >= 3) structs.push({ label: "pool", items: pool.slice() });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `areAnagrams("${s1}", "${s2}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Decide whether <b>"${esc(s1)}"</b> and <b>"${esc(s2)}"</b> use the same letters. Casing and spaces don't count, so both get normalised first.`, { focus: "param" });
  S(2, `Lower-case str1 and strip its spaces → <b>"${a}"</b>. Comparing raw text would call <code class='inl'>"School master"</code> and <code class='inl'>"schoolmaster"</code> different strings.`, { focus: "norma", changed: ["a"] });
  const bChars = norm(s2).split("");
  bChars.forEach((c) => pool.push(c));
  S(3, `Normalise str2 the same way and <b>split it into a mutable pool</b> of ${pool.length} letter${pool.length === 1 ? "" : "s"}. Splicing out of an array is what lets a letter be consumed exactly once.`, { focus: "normb" });

  const lenBad = a.length !== pool.length;
  S(4, `Length guard: <b>${a.length} !== ${pool.length}</b> → <b>${lenBad}</b>. ${lenBad ? "Different letter counts can't be a rearrangement — bail now and pay nothing." : "Same length, so a rearrangement is at least possible. Keep going."}`,
    { focus: "len", eval: { expr: `${a.length} !== ${pool.length}`, val: lenBad } });
  if (lenBad) { S(4, `<b>Return false</b> — the strings hold a different number of letters.`, { focus: "len", done: true, result: "false", ret: { value: "false" } }); return steps; }

  for (const c of a) {
    ch = c; at = undefined;
    S(5, `Take the next letter of str1: <b>'${esc(ch)}'</b>. It has to find a partner somewhere in the pool.`, { focus: "ch", changed: ["ch"] });
    at = pool.indexOf(ch);
    const walked = at === -1 ? pool.length : at + 1;
    comparisons += walked;
    S(6, `<b>pool.indexOf('${esc(ch)}')</b> walks the pool from the front and ${at === -1
      ? `runs off the end after <b>${walked}</b> comparison${walked === 1 ? "" : "s"} → <b>-1</b>`
      : `stops at index <b>${at}</b> — <b>${walked}</b> comparison${walked === 1 ? "" : "s"}`}. <i>This is the wasteful act: the pool shrinks, but every search restarts at slot 0.</i> Running total: <b>${comparisons}</b>.`,
      { focus: "idx", changed: ["at", "comparisons"] });
    const missed = at === -1;
    S(7, `Was it found? <b>at === -1</b> → <b>${missed}</b>.`, { focus: "miss", eval: { expr: `at === -1`, val: missed } });
    if (missed) {
      S(7, `<b>Return false</b> — <b>'${esc(ch)}'</b> has no partner left, so str2 cannot be a rearrangement of str1.`,
        { focus: "miss", done: true, result: "false", ret: { value: "false" } });
      return steps;
    }
    pool.splice(at, 1);
    S(8, `Consume the match: <b>splice(${at}, 1)</b> removes it, so a second <b>'${esc(ch)}'</b> in str1 can't reuse the same slot. ${pool.length} letter${pool.length === 1 ? "" : "s"} left.`, { focus: "splice" });
  }
  ch = at = undefined;
  S(10, `Every letter of str1 was matched and removed, so the pool is empty. <b>Return true</b> — after <b>${comparisons}</b> comparisons.`,
    { focus: null, done: true, result: "true", ret: { value: "true" } });
  return steps;
}

function traceTally(raw) {
  const [s1, s2] = splitPair(raw);
  const steps = [];
  const a = norm(s1), b = norm(s2);
  const tally = new Map();
  let ch, n, ops = 0;
  // The Map rendered as a struct: "a:2" chips, so a count dropping to 0 is visible.
  const items = () => [...tally].map(([k, v]) => `${k}:${v}`);
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3) vars.a = a || "(empty)";
    if (line >= 3) vars.b = b || "(empty)";
    if (line >= 5) vars.ops = ops;
    if (line >= 7 && line <= 11 && ch !== undefined) vars.ch = ch;
    if (line >= 8 && line <= 11 && n !== undefined) vars.n = n;
    const structs = [];
    if (line >= 5) structs.push({ label: "tally", items: items(), newest: !!x.fresh });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `areAnagrams("${s1}", "${s2}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Same question, different idea: instead of hunting for each letter, <b>count</b> the letters on both sides and check the counts match.`, { focus: "param" });
  S(2, `<b>norm</b> lower-cases and drops whitespace — the two things the problem says to ignore, written once instead of twice.`, { focus: "norm" });
  S(3, `Normalised: <b>a = "${a}"</b>, <b>b = "${b}"</b>.`, { focus: "ab", changed: ["a", "b"] });

  const lenBad = a.length !== b.length;
  S(4, `Length guard: <b>${a.length} !== ${b.length}</b> → <b>${lenBad}</b>. ${lenBad ? "Bail — no tally could balance." : "Equal lengths, so if every count matches the answer is true."}`,
    { focus: "len", eval: { expr: `${a.length} !== ${b.length}`, val: lenBad } });
  if (lenBad) { S(4, `<b>Return false</b> — different letter counts.`, { focus: "len", done: true, result: "false", ret: { value: "false" } }); return steps; }

  S(5, `Open an empty <b>Map</b>. A plain object would work too, but a Map keeps keys like <code class='inl'>"constructor"</code> from colliding with prototype properties.`, { focus: "new" });
  for (const c of a) {
    tally.set(c, (tally.get(c) ?? 0) + 1);
    ops++;
    S(6, `Charge str1's <b>'${esc(c)}'</b> to the tally → <b>${tally.get(c)}</b>. One map touch per letter; that is the entire first pass.`, { focus: "inc", changed: ["ops"], fresh: true });
  }
  S(7, `str1 is fully counted. Now spend the tally down with str2 — every letter of str2 must find a credit waiting for it.`, { focus: "ch2" });
  for (const c of b) {
    ch = c; n = undefined;
    S(7, `Next letter of str2: <b>'${esc(ch)}'</b>.`, { focus: "ch2", changed: ["ch"] });
    n = tally.get(ch) ?? 0;
    ops++;
    S(8, `Look it up: <b>tally.get('${esc(ch)}')</b> → <b>${n}</b>. One hash lookup, no scanning — <i>this is the whole win over the brute</i>. Ops so far: <b>${ops}</b>.`, { focus: "get", changed: ["n", "ops"] });
    const empty = n === 0;
    S(9, `Any credit left? <b>n === 0</b> → <b>${empty}</b>.`, { focus: "zero", eval: { expr: `n === 0`, val: empty } });
    if (empty) {
      S(9, `<b>Return false</b> — str2 wants ${tally.has(ch) ? `another <b>'${esc(ch)}'</b> than str1 supplied` : `a <b>'${esc(ch)}'</b> that str1 never had`}.`,
        { focus: "zero", done: true, result: "false", ret: { value: "false" } });
      return steps;
    }
    tally.set(ch, n - 1);
    S(10, `Spend it: <b>'${esc(ch)}'</b> drops to <b>${n - 1}</b>. Decrementing rather than deleting is what makes repeated letters come out right.`, { focus: "dec" });
  }
  ch = n = undefined;
  S(12, `str2 paid for every letter and nothing was left owing, so the two strings hold the same multiset. <b>Return true</b> — <b>${ops}</b> map ops, against the brute's <b>${bruteRun(s1, s2).comparisons}</b> comparisons on the same pair.`,
    { done: true, result: "true", ret: { value: "true" } });
  return steps;
}

export default {
  n: 6, id: "anagram", title: "Anagram Checker", dates: ["2025-08-16"],
  statement: `Given two strings, determine if they are <b>anagrams</b> of each other — the same characters in any order. <span class="rule">Ignore casing and whitespace. Example: <code class="inl">areAnagrams("School master", "The classroom")</code> → <b>true</b>.</span>`,
  variants: [
    {
      name: "Strike out each letter", tone: "brute", cost: "O(n²) — indexOf per char",
      approach: `Normalise both strings, split str2 into a <b>pool</b>, then walk str1 asking <code class='inl'>pool.indexOf(ch)</code> for each character and splicing the match out so it can't be reused. Correct, and the splice is genuinely necessary — without it, <code class='inl'>"aab"</code> would match <code class='inl'>"abb"</code>. The waste is that <code class='inl'>indexOf</code> restarts at slot 0 every single time. Each character below is labelled with how many slots it walked.`,
      code: `function areAnagrams(str1: string, str2: string): boolean {
  const a = str1.toLowerCase().replace(/\\s/g, "");
  const pool = str2.toLowerCase().replace(/\\s/g, "").split("");
  if (a.length !== pool.length) return false;
  for (const ch of a) {
    const at = pool.indexOf(ch); // re-scans the pool from the front, every time
    if (at === -1) return false;
    pool.splice(at, 1);          // consume it, so repeats can't share a slot
  }
  return true;
}`,
      mount: mountBrute,
    },
    { name: "Step: strike out", tone: "brute", cost: "comparisons walked",
      approach: `Watch the <b>pool</b> shrink one splice at a time, and watch the comparison counter climb faster than the pool shrinks. On the opening reversed-alphabet pair it ends at <b>351</b>; on every official pair it stays under 50, which is the honest shape of this win. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput(STEP_PRESETS[0]) }) },
    {
      name: "Letter tally", tone: "opt", cost: "O(n) — two passes",
      approach: `Order is exactly what an anagram is allowed to change, so stop looking at it. Count str1's letters into a <code class='inl'>Map</code> in one pass, then let str2 spend that tally down in a second — any letter that finds a zero (or a key that was never there) settles it as <b>false</b>. Two linear passes, one hash lookup per character, no rescanning. The mirrored bars below are the two tallies; a level row is a letter both strings agree on.`,
      code: `function areAnagrams(str1: string, str2: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\\s/g, "");
  const a = norm(str1), b = norm(str2);
  if (a.length !== b.length) return false;
  const tally = new Map<string, number>();
  for (const ch of a) tally.set(ch, (tally.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const n = tally.get(ch) ?? 0;
    if (n === 0) return false;   // str2 wants a letter str1 can't pay for
    tally.set(ch, n - 1);
  }
  return true;
}`,
      mount: mountTally,
    },
    { name: "Step: letter tally", tone: "opt", cost: "map touches",
      approach: `The <b>tally</b> struct fills on the first pass and drains on the second — an anagram is exactly the input where it comes back to all zeros. Same reversed-alphabet pair as the brute step-through: <b>52</b> map touches against <b>351</b> comparisons, same <b>true</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_TALLY, trace: traceTally, input: stepInput(STEP_PRESETS[0]) }) },
  ],
};
