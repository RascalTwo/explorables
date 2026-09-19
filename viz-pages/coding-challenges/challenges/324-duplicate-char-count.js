// #324 · Duplicate Character Count — how many chars of str2 occur in str1.
// Brute sweeps all of str1 per char (a running pointer); optimized builds a
// Set of str1 once and does one O(1) lookup per char of str2.
import { el, mountDebugger } from "../shared.js";

// 6 of the 7 official freeCodeCamp cases; the 7th, "ola"/"hej" (the 0 case), is a
// preset on both step-throughs below and reachable from the free-text inputs here.
// "merhaba"/"xin chao" is the only official case with a space in str2 — the one
// that demonstrates the statement's "spaces count" rule.
const PRESETS = [
  ["hello", "hola"],
  ["aloha", "hei"],
  ["jambo", "bonjour"],
  ["ciao", "konnichiwa"],
  ["merhaba", "xin chao"],
  ["hello world", "hello to everyone around the world"],
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .dc-wrap { margin-top:14px; }
    .dc-lane { margin:12px 0; }
    .dc-tag { font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
    .dc-str { display:flex; gap:3px; flex-wrap:wrap; }
    .dc-ch { min-width:24px; height:32px; padding:0 5px; display:flex; align-items:center; justify-content:center;
      font:700 15px var(--mono); border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); transition:all .12s; }
    .dc-ch.space { color:var(--muted); }
    .dc-ch.scan { border-color:var(--warn); box-shadow:0 0 0 2px color-mix(in srgb,var(--warn) 45%,transparent); }
    .dc-ch.hit { border-color:var(--good); background:color-mix(in srgb,var(--good) 20%,var(--panel)); color:var(--good); }
    .dc-ch.active { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 50%,transparent); transform:translateY(-2px); }
    .dc-ch.miss { opacity:.45; }
    .dc-ch.inset { border-color:var(--good); background:color-mix(in srgb,var(--good) 16%,var(--panel)); color:var(--good); }
    .dc-ch.noset { color:var(--muted); opacity:.6; }
    .dc-set { display:flex; gap:5px; flex-wrap:wrap; margin:6px 0 2px; }
    .dc-sc { width:28px; height:30px; display:flex; align-items:center; justify-content:center; font:700 14px var(--mono);
      border-radius:50%; border:1px dashed color-mix(in srgb,var(--good) 60%,var(--border)); color:var(--good);
      background:color-mix(in srgb,var(--good) 10%,var(--panel)); }
    .dc-note { font:12.5px var(--mono); color:var(--muted); min-height:18px; margin:8px 0 2px; }
    .dc-note b { color:var(--text); }
    .dc-bar { display:flex; align-items:center; gap:12px; margin-top:8px; flex-wrap:wrap; }
    .dc-count { font:800 22px var(--mono); }
    .dc-brace { font:11px var(--mono); color:var(--muted); }
  `));
}

function showChar(ch) { return ch === " " ? "␣" : ch; }

// Brute frames: for each char of str2, sweep str1 left→right until a match.
function bruteFrames(s1, s2) {
  const frames = []; let comps = 0, count = 0;
  for (let j = 0; j < s2.length; j++) {
    const target = s2[j]; let found = -1;
    for (let i = 0; i < s1.length; i++) {
      comps++;
      frames.push({ j, i, comps, count, matchAt: -1, note: `compare str2[${j}]=<b>'${showChar(target)}'</b> to str1[${i}]='${showChar(s1[i])}'` });
      if (s1[i] === target) { found = i; break; }
    }
    if (found >= 0) count++;
    frames.push({ j, i: found, comps, count, matchAt: found, done1: true,
      note: found >= 0 ? `found <b>'${showChar(target)}'</b> — count = ${count}` : `<b>'${showChar(target)}'</b> not in str1` });
  }
  frames.push({ done: true, comps, count, note: `swept every char — ${comps} comparisons` });
  return { frames, comps, count };
}

// Optimized frames: build Set once, then one lookup per char of str2.
function optFrames(s1, s2) {
  const set = new Set(s1);
  const frames = []; let ops = 0, count = 0;
  // build phase
  for (let i = 0; i < s1.length; i++) { ops++; frames.push({ phase: "build", i, ops, count, note: `add str1[${i}]='${showChar(s1[i])}' to the set` }); }
  frames.push({ phase: "built", ops, count, note: `set has ${set.size} distinct chars` });
  // lookup phase
  for (let j = 0; j < s2.length; j++) {
    ops++; const inSet = set.has(s2[j]); if (inSet) count++;
    frames.push({ phase: "lookup", j, ops, count, inSet, note: inSet ? `set.has('${showChar(s2[j])}') → true · count = ${count}` : `set.has('${showChar(s2[j])}') → false` });
  }
  frames.push({ phase: "done", ops, count, done: true, note: `${s1.length} + ${s2.length} = ${ops} operations` });
  return { frames, ops, count, set: [...set] };
}

function makePlayer(host) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  function run(count, render, speed) {
    stop(); let k = 0;
    (function step() {
      if (!host.isConnected) { stop(); return; }
      render(k);
      if (k >= count - 1) return;
      k++; timer = setTimeout(step, speed || 260);
    })();
  }
  return { run, stop };
}

function strRow(s, className) {
  const row = el("div", "dc-str");
  const spans = [];
  for (let i = 0; i < s.length; i++) {
    const sp = el("div", "dc-ch" + (s[i] === " " ? " space" : ""), showChar(s[i]));
    row.append(sp); spans.push(sp);
  }
  return { row, spans };
}

function controls(host, onRun) {
  ensureStyle();
  const c1 = el("input"); c1.type = "text"; c1.value = PRESETS[0][0]; c1.style.width = "180px";
  const c2 = el("input"); c2.type = "text"; c2.value = PRESETS[0][1]; c2.style.width = "180px";
  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "str1"), c1, el("span", "ctl-label", "str2"), c2);
  const chips = el("div", "controls");
  PRESETS.forEach(([a, b]) => { const c = el("button", "chip", `"${a}" · "${b}"`); c.onclick = () => { c1.value = a; c2.value = b; onRun(a, b); }; chips.append(c); });
  const runBtn = el("button", "chip good", "▶ run");
  const fire = () => onRun(c1.value, c2.value);
  runBtn.onclick = fire;
  c1.onkeydown = c2.onkeydown = (e) => { if (e.key === "Enter") fire(); };
  host.append(ctl, chips, runBtn);
  return { c1, c2 };
}

function mountBrute(host) {
  const player = makePlayer(host);
  const wrap = el("div", "dc-wrap");
  const lane2 = el("div", "dc-lane"); lane2.append(el("div", "dc-tag", "str2 — each char looks for a home"));
  const s2box = el("div"); lane2.append(s2box);
  const lane1 = el("div", "dc-lane"); lane1.append(el("div", "dc-tag", "str1 — pointer sweeps for a match"));
  const s1box = el("div"); lane1.append(s1box);
  const note = el("div", "dc-note");
  const bar = el("div", "dc-bar");
  const opc = el("span", "opcount hot"); const opn = el("span", "n", "0"); opc.append(opn, document.createTextNode(" comparisons"));
  const countEl = el("div", "dc-count");
  bar.append(opc, countEl);
  wrap.append(lane2, lane1, note, bar);
  const { c1 } = controls(host, go);
  host.append(wrap);

  function go(s1, s2) {
    const { frames, comps, count } = bruteFrames(s1, s2);
    const r2 = strRow(s2); const r1 = strRow(s1);
    s2box.innerHTML = ""; s2box.append(r2.row);
    s1box.innerHTML = ""; s1box.append(r1.row);
    player.run(frames.length, (k) => {
      const f = frames[k];
      r2.spans.forEach((sp, idx) => { sp.className = "dc-ch" + (s2[idx] === " " ? " space" : ""); if (idx === f.j) sp.classList.add(f.done1 && f.matchAt >= 0 ? "hit" : "active"); if (f.done1 && f.matchAt < 0 && idx === f.j) sp.classList.add("miss"); });
      r1.spans.forEach((sp, idx) => { sp.className = "dc-ch" + (s1[idx] === " " ? " space" : ""); if (!f.done1 && idx === f.i) sp.classList.add("scan"); if (f.done1 && f.matchAt === idx) sp.classList.add("hit"); });
      note.innerHTML = f.note;
      opn.textContent = f.comps;
      countEl.textContent = "count = " + f.count;
      if (f.done) countEl.style.color = "var(--good)";
    });
  }
  go(c1.value, PRESETS[0][1]);
}

function mountOpt(host) {
  const player = makePlayer(host);
  const wrap = el("div", "dc-wrap");
  const lane1 = el("div", "dc-lane"); lane1.append(el("div", "dc-tag", "str1 — distinct chars poured into a Set"));
  const s1box = el("div"); lane1.append(s1box);
  const setLane = el("div", "dc-lane"); setLane.append(el("div", "dc-tag", "the Set"));
  const setBox = el("div", "dc-set"); setLane.append(setBox);
  const lane2 = el("div", "dc-lane"); lane2.append(el("div", "dc-tag", "str2 — one O(1) lookup each (green = in set)"));
  const s2box = el("div"); lane2.append(s2box);
  const note = el("div", "dc-note");
  const bar = el("div", "dc-bar");
  const opc = el("span", "opcount cool"); const opn = el("span", "n", "0"); opc.append(opn, document.createTextNode(" ops"));
  const countEl = el("div", "dc-count");
  bar.append(opc, countEl);
  wrap.append(lane1, setLane, lane2, note, bar);
  const { c1 } = controls(host, go);
  host.append(wrap);

  function go(s1, s2) {
    const { frames, count } = optFrames(s1, s2);
    const distinct = [...new Set(s1)];
    const r1 = strRow(s1); const r2 = strRow(s2);
    s1box.innerHTML = ""; s1box.append(r1.row);
    s2box.innerHTML = ""; s2box.append(r2.row);
    const setSpans = {};
    setBox.innerHTML = "";
    distinct.forEach((ch) => { const sc = el("div", "dc-sc", showChar(ch)); sc.style.visibility = "hidden"; setBox.append(sc); setSpans[ch] = sc; });
    player.run(frames.length, (k) => {
      const f = frames[k];
      // str1 build highlight
      r1.spans.forEach((sp, idx) => { sp.className = "dc-ch" + (s1[idx] === " " ? " space" : ""); if (f.phase === "build" && idx === f.i) sp.classList.add("active"); if (f.phase !== "build" && f.phase !== undefined && idx <= (f.i ?? s1.length)) sp.classList.add("inset"); });
      // reveal set members up to current build index
      if (f.phase === "build") { for (let x = 0; x <= f.i; x++) setSpans[s1[x]].style.visibility = "visible"; }
      else distinct.forEach((ch) => setSpans[ch].style.visibility = "visible");
      // str2 lookup coloring
      r2.spans.forEach((sp, idx) => {
        sp.className = "dc-ch" + (s2[idx] === " " ? " space" : "");
        if (f.phase === "lookup" || f.phase === "done") {
          const upto = f.phase === "done" ? s2.length - 1 : f.j;
          if (idx <= upto) sp.classList.add(new Set(s1).has(s2[idx]) ? "inset" : "noset");
          if (f.phase === "lookup" && idx === f.j) sp.classList.add("active");
        }
      });
      note.innerHTML = f.note;
      opn.textContent = f.ops;
      countEl.textContent = "count = " + f.count;
      countEl.style.color = f.done ? "var(--good)" : "var(--text)";
    });
  }
  go(c1.value, PRESETS[0][1]);
}

const CODE_BRUTE = `// For each char of str2, scan ALL of str1 for a match.
function duplicateCharacterCount(str1: string, str2: string): number {
  let count = 0;
  for (const ch of str2) if (str1.includes(ch)) count++;   // O(n) scan each
  return count;
}`;

const CODE_OPT = `// Build a Set of str1's chars once, then one O(1) lookup per char of str2.
function duplicateCharacterCount(str1: string, str2: string): number {
  const set = new Set(str1);
  let count = 0;
  for (const ch of str2) if (set.has(ch)) count++;         // O(1) lookup each
  return count;
}`;

// ── STEP (brute) — the nested scan, one line at a time ──────────────────────
// Paired with the "Scan str1 each time" tab: watch str1 get re-read from index 0
// for EVERY character of str2 — the wasted work the Set collapses into one pass.
// str1.includes(ch) is expanded into an explicit inner loop so the rescan is visible.
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">duplicateCharacterCount</span>(str1, str2) {` },
  { ln: 2, html: `  <span class="k">let</span> count = 0;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> str2) {  <span class="cm">// each char of str2…</span>` },
  { ln: 4, html: `    <span class="k">let</span> found = <span class="k">false</span>;` },
  { ln: 5, html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="rescan">c <span class="k">of</span> str1</span>) {  <span class="cm">// …rescan ALL of str1 from index 0</span>` },
  { ln: 6, html: `      <span class="k">if</span> (<span class="tok" data-t="cmp">c === ch</span>) { found = <span class="k">true</span>; <span class="k">break</span>; }` },
  { ln: 7, html: `    }` },
  { ln: 8, html: `    <span class="k">if</span> (<span class="tok" data-t="found">found</span>) count++;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> count;` },
  { ln: 11, html: `}` },
];

// Same input contract as the set trace: split on the FIRST '/' into (str1, str2),
// then run the brute nested scan. Count matches the real algorithm exactly.
function traceBrute(input) {
  const raw = String(input);
  const slash = raw.indexOf("/");
  const str1 = slash >= 0 ? raw.slice(0, slash) : raw;
  const str2 = slash >= 0 ? raw.slice(slash + 1) : "";
  const show = (c) => (c === " " ? "␣" : c);
  const steps = [];
  let count = 0, chT = null, cCur = null, found = false;

  const frames = (opt = {}) => {
    const vars = { str1: `"${str1}"`, str2: `"${str2}"` };
    if (opt.ch) vars.ch = `'${show(chT)}'`;
    if (opt.c) vars.c = `'${show(cCur)}'`;
    if (opt.found) vars.found = found;
    if (opt.count) vars.count = count;
    return [{ title: `duplicateCharacterCount("${str1}", "${str2}")`, vars, changed: opt.changed || [] }];
  };
  const S = (line, note, opt = {}) => steps.push({
    line, note, focus: opt.focus, eval: opt.eval, done: opt.done, result: opt.result, frames: frames(opt),
  });

  S(1, `Call <b>duplicateCharacterCount</b> the brute way — for every character of str2, rescan <i>all</i> of str1 hunting for it.`);
  S(2, `Start the running tally at <b>count = 0</b>.`, { count: true, changed: ["count"] });

  for (const t of str2) {
    chT = t;
    S(3, `Take the next character of str2: <b>'${show(t)}'</b>. Now we must hunt for it inside str1.`, { ch: true, count: true, changed: ["ch"] });
    found = false;
    S(4, `<b>found = false</b> — haven't spotted <b>'${show(t)}'</b> yet.`, { ch: true, found: true, count: true, changed: ["found"] });
    S(5, `Start a <b>fresh scan of str1 from index 0</b> — the brute cost: str1 is re-read in full for <b>'${show(t)}'</b>, throwing away everything learned scanning earlier characters.`, { focus: "rescan", ch: true, found: true, count: true });
    let hit = false;
    for (const c of str1) {
      cCur = c;
      const eq = c === t;
      S(6, `Compare <b>'${show(c)}' === '${show(t)}'</b> → <b>${eq}</b>.${eq ? "" : " No match — keep scanning str1."}`,
        { focus: "cmp", ch: true, c: true, found: true, count: true, eval: { expr: `'${show(c)}' === '${show(t)}'`, val: eq } });
      if (eq) {
        found = true; hit = true;
        S(6, `Match here — set <b>found = true</b> and <b>break</b> out of the rescan.`, { focus: "cmp", ch: true, c: true, found: true, count: true, changed: ["found"] });
        break;
      }
    }
    if (!hit) S(7, `Reached the end of str1 without a match — a full wasted sweep for <b>'${show(t)}'</b>.`, { ch: true, found: true, count: true });
    if (hit) {
      count++;
      S(8, `<b>found</b> is true — <b>count++</b>. The tally is now <b>${count}</b>.`, { focus: "found", ch: true, found: true, count: true, changed: ["count"] });
    } else {
      S(8, `<b>found</b> is false — <b>'${show(t)}'</b> isn't in str1, so count stays <b>${count}</b>.`, { focus: "found", ch: true, found: true, count: true });
    }
  }
  S(10, `Every character of str2 has been hunted. <b>Return count = ${count}</b>.`, { count: true, done: true, result: count });
  return steps;
}

// ── Step-through debugger for the optimized Set solution ────────────────────
const SRC_STEP = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">duplicateCharacterCount</span>(str1, str2) {` },
  { ln: 2, html: `  <span class="k">const</span> set = <span class="k">new</span> <span class="fn">Set</span>();` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> str1) <span class="tok" data-t="add">set.<span class="fn">add</span>(ch)</span>;` },
  { ln: 4, html: `  <span class="k">let</span> count = 0;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> str2)` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="has">set.<span class="fn">has</span>(ch)</span>) count++;` },
  { ln: 7, html: `  <span class="k">return</span> count;` },
  { ln: 8, html: `}` },
];

// Split the raw input on the FIRST '/' into (str1, str2), then run the real
// algorithm: build a Set of str1's chars, one set.has lookup per char of str2.
function traceDup(input) {
  const raw = String(input);
  const slash = raw.indexOf("/");
  const str1 = slash >= 0 ? raw.slice(0, slash) : raw;
  const str2 = slash >= 0 ? raw.slice(slash + 1) : "";
  const show = (c) => (c === " " ? "␣" : c);
  const steps = [];
  const set = [];              // mirrors the real Set: distinct, insertion order
  const seen = new Set();
  let count = 0, ch = null;

  const frames = (opt = {}) => {
    const vars = { str1: `"${str1}"`, str2: `"${str2}"` };
    if (opt.ch) vars.ch = `'${show(ch)}'`;
    if (opt.count) vars.count = count;
    return [{
      title: `duplicateCharacterCount("${str1}", "${str2}")`,
      vars, changed: opt.changed || [],
      structs: [{ label: "set", items: set.map(show), newest: !!opt.newest }],
    }];
  };
  const S = (line, note, opt = {}) => steps.push({
    line, note, focus: opt.focus, eval: opt.eval, done: opt.done, result: opt.result, frames: frames(opt),
  });

  S(1, `Call <b>duplicateCharacterCount</b> — count how many characters of <b>str2</b> also appear anywhere in <b>str1</b>.`);
  S(2, `Make an empty <b>Set</b>. A Set keeps each value at most once and answers "do I contain this?" in constant time.`);

  // build phase — pour str1's chars into the set
  for (const c of str1) {
    ch = c;
    const isNew = !seen.has(c);
    if (isNew) { seen.add(c); set.push(c); }
    S(3, isNew
      ? `Add <b>'${show(c)}'</b> to the set — it's new, so the set grows to <b>${set.length}</b> distinct char${set.length === 1 ? "" : "s"}.`
      : `<b>'${show(c)}'</b> is already in the set, so <b>add</b> does nothing — a Set silently drops duplicates.`,
      { focus: "add", ch: true, newest: isNew, changed: ["ch"] });
  }
  S(3, `str1 is fully poured in — the set now holds its <b>${set.length}</b> distinct character${set.length === 1 ? "" : "s"}, a ready lookup table.`);

  // count init — the build loop's `ch` is now out of scope
  S(4, `Start the running tally at <b>count = 0</b>.`, { count: true, changed: ["count"] });

  // lookup phase — one O(1) membership test per char of str2
  for (const c of str2) {
    ch = c;
    S(5, `Take the next character of str2: <b>'${show(c)}'</b>.`, { ch: true, count: true, changed: ["ch"] });
    const inSet = seen.has(c);
    S(6, `Ask the set: <b>set.has('${show(c)}')</b> → <b>${inSet}</b>${inSet ? " — it's in str1." : " — not in str1."}`,
      { focus: "has", ch: true, count: true, eval: { expr: `set.has('${show(c)}')`, val: inSet } });
    if (inSet) {
      count++;
      S(6, `Match — <b>count++</b>. The tally is now <b>${count}</b>.`, { focus: "has", ch: true, count: true, changed: ["count"] });
    }
  }
  S(7, `Every character of str2 has been checked. <b>Return count = ${count}</b>.`, { count: true, done: true, result: count });
  return steps;
}

export default {
  n: 324, id: "dupcount", title: "Duplicate Character Count", dates: ["2026-06-30"],
  statement: `Return how many characters of <code class="inl">str2</code> appear anywhere in <code class="inl">str1</code> — case-sensitive, spaces count, and duplicates in str2 are counted separately. Example: <code class="inl">duplicateCharacterCount("hello", "hola")</code> → <code class="inl">3</code>; <code class="inl">duplicateCharacterCount("ola", "hej")</code> → <code class="inl">0</code>.`,
  // Grouped by approach: each approach is [intuition viz] → [step through], and
  // the tone colour pairs them (brute-tinted pair, then opt-tinted pair).
  variants: [
    { name: "Scan str1 each time", tone: "brute", cost: "O(n·m)",
      approach: `For every character of str2, run <code class="inl">str1.includes(ch)</code> — a fresh left-to-right sweep of str1. With str2 of length <i>m</i> and str1 of length <i>n</i>, that's up to <code class="inl">n·m</code> comparisons.`,
      code: CODE_BRUTE, mount: mountBrute },
    { name: "Step: rescan", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — <code class="inl">str1.includes(ch)</code> expanded into its inner loop so the <b>rescan</b> is visible. Watch str1 get re-read from index 0 for <i>every</i> character of str2 (a full wasted sweep whenever the char is missing) — exactly the work the Set collapses into one pass. Enter two strings separated by a <b>/</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { type: "text", label: "str1/str2 =", value: "cat/tab", presets: ["cat/tab", "hola/hi", "ola/hej", "hello/world"], hint: "two strings, split on first /" } }) },
    { name: "Set membership", tone: "opt", cost: "O(n+m)",
      approach: `Pour str1's characters into a <code class="inl">Set</code> once (<i>n</i> inserts), then each of str2's <i>m</i> chars is a single constant-time <code class="inl">set.has</code>. Total work is <code class="inl">n + m</code> — the nested scan collapses into two straight passes.`,
      code: CODE_OPT, mount: mountOpt },
    { name: "Step: lookup", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the Set solution — watch str1 pour into the <code class="inl">set</code> (duplicates are silently ignored), then one constant-time <code class="inl">set.has</code> per character of str2 tick up <code class="inl">count</code>. Enter two strings separated by a <b>/</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_STEP, trace: traceDup, input: { type: "text", label: "str1/str2 =", value: "hello/hola", presets: ["hello/hola", "aloha/hei", "ola/hej", "abba/cab"], hint: "two strings, split on first /" } }) },
  ],
};
