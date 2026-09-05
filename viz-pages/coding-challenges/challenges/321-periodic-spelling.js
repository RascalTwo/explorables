// #321 · Periodic Spelling — can a word be built from element symbols?
// Two variants share the same DFS; the brute one walks the exponential tree,
// the optimized one memoizes each position so the tree collapses to a line.
import { el, mountDebugger } from "../shared.js";

const ELEMENTS = ["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"];
const CANON = new Map(ELEMENTS.map((e) => [e.toLowerCase(), e]));
const NUMBER = new Map(ELEMENTS.map((e, i) => [e, i + 1]));
// All 8 official freeCodeCamp cases (neon, rational, yarn, carbon, noisy,
// bicycles, optics, value) plus one of ours: `snack` — it only spells because the
// DFS falls through to the 2-letter Ac where the 1-letter "a" is no element.
// `carbon`, `noisy`, `bicycles` and `optics` each accept several decompositions;
// all four variants land on an accepted one (verified in node).
const PRESETS = ["neon", "rational", "yarn", "carbon", "noisy", "bicycles", "optics", "snack", "value"];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ps-wrap { margin-top:12px; }
    .ps-word { display:flex; gap:4px; flex-wrap:wrap; margin:14px 0 6px; }
    .ps-l { width:30px; height:38px; display:flex; align-items:center; justify-content:center;
      font:700 18px var(--mono); border-radius:8px; border:1px solid var(--border);
      background:var(--panel-2); color:var(--muted); transition:all .18s; position:relative; }
    .ps-l.g0 { color:var(--text); background:color-mix(in srgb,var(--accent) 16%,var(--panel-2)); border-color:color-mix(in srgb,var(--accent) 55%,var(--border)); }
    .ps-l.g1 { color:var(--text); background:color-mix(in srgb,#a371f7 18%,var(--panel-2)); border-color:color-mix(in srgb,#a371f7 55%,var(--border)); }
    .ps-l.active { border-color:var(--warn); box-shadow:0 0 0 2px color-mix(in srgb,var(--warn) 45%,transparent); color:var(--warn); }
    .ps-l.done { border-color:var(--good); color:var(--good); }
    .ps-cells { display:flex; gap:6px; flex-wrap:wrap; margin:12px 0; min-height:56px; align-items:center; }
    .ps-cell { width:50px; height:52px; border:1px solid var(--accent); border-radius:8px; position:relative;
      display:flex; align-items:center; justify-content:center; font:800 19px var(--mono); color:var(--accent);
      background:color-mix(in srgb,var(--accent) 12%,var(--panel)); animation:psPop .2s ease; }
    .ps-cell .z { position:absolute; top:2px; left:4px; font:600 8px var(--mono); color:var(--muted); }
    .ps-cell.ghost { border-color:var(--danger); color:var(--danger); background:color-mix(in srgb,var(--danger) 14%,var(--panel));
      opacity:.85; animation:psShake .3s ease; }
    @keyframes psPop { from{transform:scale(.4);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes psShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
    .ps-note { font:12.5px var(--mono); color:var(--muted); min-height:18px; margin-top:2px; }
    .ps-note b { color:var(--text); }
    .ps-bar { display:flex; align-items:center; gap:10px; margin-top:10px; flex-wrap:wrap; }
    .ps-track { display:flex; gap:0; align-items:center; margin:14px 0; flex-wrap:wrap; }
    .ps-node { width:26px; height:26px; border-radius:50%; border:1px solid var(--border); background:var(--panel-2);
      display:flex; align-items:center; justify-content:center; font:700 11px var(--mono); color:var(--muted); transition:all .2s; }
    .ps-node.reach { background:color-mix(in srgb,var(--good) 20%,var(--panel)); border-color:var(--good); color:var(--good); }
    .ps-node.cur { border-color:var(--warn); box-shadow:0 0 0 2px color-mix(in srgb,var(--warn) 40%,transparent); }
    .ps-node.dead { border-color:var(--danger); color:var(--danger); opacity:.6; }
    .ps-arc { width:16px; height:2px; background:var(--border); }
    .ps-arc.reach { background:var(--good); }
  `));
}

// Build the full frame-trace of the brute DFS.
function bruteFrames(word) {
  const w = word.toLowerCase();
  const frames = []; const chosen = []; let calls = 0;
  const snap = (cursor, note, flash, done, ok) =>
    frames.push({ cursor, chosen: [...chosen], calls, note, flash: flash || null, done: !!done, ok });
  function dfs(i) {
    calls++; snap(i, `dfs(${i}) — ${calls} call${calls > 1 ? "s" : ""} so far`);
    if (i === w.length) { snap(i, "reached the end — every letter is covered", null, true, true); return true; }
    for (const len of [1, 2]) {
      if (i + len > w.length) continue;
      const sub = w.slice(i, i + len);
      if (!CANON.has(sub)) continue;
      const sym = CANON.get(sub);
      chosen.push(sym);
      snap(i + len, `place <b>${sym}</b> and advance to ${i + len}`, { type: "place" });
      if (dfs(i + len)) return true;
      chosen.pop();
      snap(i, `dead end after <b>${sym}</b> — backtrack`, { type: "back", sym });
    }
    return false;
  }
  const ok = dfs(0);
  if (!ok) snap(0, "exhausted every branch — no spelling exists", null, true, false);
  const result = ok ? frames[frames.length - 1].chosen : [];
  return { frames, calls, ok, result };
}

// Optimized reachability DP frames (left→right fill).
function dpFrames(word) {
  const w = word.toLowerCase(); const n = w.length;
  const reach = new Array(n + 1).fill(false); reach[0] = true;
  const from = new Array(n + 1).fill(-1);
  const frames = []; let checks = 0;
  frames.push({ reach: [...reach], cur: 0, checks, note: "position 0 is reachable (the start)" });
  for (let i = 0; i < n; i++) {
    if (!reach[i]) { frames.push({ reach: [...reach], cur: i, checks, note: `position ${i} unreachable — skip`, dead: true }); continue; }
    for (const len of [1, 2]) {
      checks++;
      if (i + len > n) continue;
      const sub = w.slice(i, i + len);
      if (CANON.has(sub)) {
        if (!reach[i + len]) { reach[i + len] = true; from[i + len] = i; }
        frames.push({ reach: [...reach], cur: i, checks, note: `<b>${CANON.get(sub)}</b> spans ${i}→${i + len} — mark ${i + len} reachable` });
      } else {
        frames.push({ reach: [...reach], cur: i, checks, note: `"${sub}" is not an element` });
      }
    }
  }
  // reconstruct
  const result = [];
  if (reach[n]) { let p = n; while (p > 0) { const q = from[p]; result.unshift(CANON.get(w.slice(q, p))); p = q; } }
  frames.push({ reach: [...reach], cur: n, checks, note: reach[n] ? "final position reachable — spellable" : "final position unreachable — impossible", done: true, ok: reach[n] });
  return { frames, checks, ok: reach[n], result };
}

// Shared player: steps through frames, stops if host detaches (re-mount safe).
function makePlayer(host) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  function run(count, render, onEnd) {
    stop(); let k = 0;
    (function step() {
      if (!host.isConnected) { stop(); return; }
      render(k);
      if (k >= count - 1) { if (onEnd) onEnd(); return; }
      k++; timer = setTimeout(step, 420);
    })();
  }
  return { run, stop };
}

function cell(sym, extra) {
  const c = el("div", "ps-cell" + (extra ? " " + extra : ""));
  c.innerHTML = `<span class="z">${NUMBER.get(sym) || ""}</span>${sym}`;
  return c;
}

function controls(host, onRun) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "neon"; inp.style.width = "220px";
  inp.maxLength = 16;
  ctl.append(el("span", "ctl-label", "word"), inp);
  const chips = el("div", "controls");
  PRESETS.forEach((p) => { const c = el("button", "chip", p); c.onclick = () => { inp.value = p; onRun(p); }; chips.append(c); });
  const runBtn = el("button", "chip good", "▶ run");
  runBtn.onclick = () => onRun(inp.value.replace(/[^a-z]/gi, ""));
  inp.onkeydown = (e) => { if (e.key === "Enter") onRun(inp.value.replace(/[^a-z]/gi, "")); };
  host.append(ctl, chips, runBtn);
  return { inp, runBtn };
}

function mountBrute(host) {
  const player = makePlayer(host);
  const stage = el("div", "ps-wrap");
  const wordRow = el("div", "ps-word");
  const cells = el("div", "ps-cells");
  const note = el("div", "ps-note");
  const bar = el("div", "ps-bar");
  const opc = el("span", "opcount hot");
  const opn = el("span", "n", "0"); opc.append(opn, document.createTextNode(" DFS calls"));
  const badge = el("span");
  bar.append(opc, badge);
  stage.append(wordRow, cells, note, bar);
  const { inp } = controls(host, go);
  host.append(stage);

  function go(word) {
    if (!word) return;
    const { frames, calls, ok, result } = bruteFrames(word);
    const w = word.toLowerCase();
    player.run(frames.length, (k) => {
      const f = frames[k];
      // letters
      wordRow.innerHTML = "";
      const groups = []; let pos = 0;
      f.chosen.forEach((sym, gi) => { for (let j = 0; j < sym.length; j++) groups[pos + j] = gi; pos += sym.length; });
      for (let idx = 0; idx < w.length; idx++) {
        const g = groups[idx];
        let cls = "ps-l";
        if (g != null) cls += " g" + (g % 2);
        if (idx === f.cursor && !f.done) cls += " active";
        if (f.done && f.ok) cls += " done";
        wordRow.append(el("div", cls, word[idx]));
      }
      // cells
      cells.innerHTML = "";
      f.chosen.forEach((s) => cells.append(cell(s)));
      if (f.flash && f.flash.type === "back") cells.append(cell(f.flash.sym, "ghost"));
      note.innerHTML = f.note;
      opn.textContent = f.calls;
      badge.className = "";
      if (f.done) { badge.className = "badge " + (f.ok ? "ok" : "no"); badge.textContent = f.ok ? "[" + result.join(", ") + "]  →  " + calls + " calls" : "[]  →  " + calls + " calls, no path"; }
      else badge.textContent = "";
    });
  }
  go(inp.value);
}

function mountOpt(host) {
  const player = makePlayer(host);
  const stage = el("div", "ps-wrap");
  const wordRow = el("div", "ps-word");
  const track = el("div", "ps-track");
  const cells = el("div", "ps-cells");
  const note = el("div", "ps-note");
  const bar = el("div", "ps-bar");
  const opc = el("span", "opcount cool");
  const opn = el("span", "n", "0"); opc.append(opn, document.createTextNode(" checks"));
  const badge = el("span");
  bar.append(opc, badge);
  stage.append(wordRow, track, cells, note, bar);
  const { inp } = controls(host, go);
  host.append(stage);

  function go(word) {
    if (!word) return;
    const { frames, checks, ok, result } = dpFrames(word);
    const w = word.toLowerCase();
    player.run(frames.length, (k) => {
      const f = frames[k];
      // static word row (context)
      wordRow.innerHTML = "";
      for (let idx = 0; idx < w.length; idx++) wordRow.append(el("div", "ps-l" + (f.done && f.ok ? " done" : ""), word[idx]));
      // position track 0..n
      track.innerHTML = "";
      for (let i = 0; i <= w.length; i++) {
        let cls = "ps-node";
        if (f.reach[i]) cls += " reach";
        if (i === f.cur && !f.done) cls += " cur";
        if (f.dead && i === f.cur) cls += " dead";
        track.append(el("div", cls, String(i)));
        if (i < w.length) track.append(el("div", "ps-arc" + (f.reach[i] && f.reach[i + 1] ? " reach" : "")));
      }
      // decomposition only once done
      cells.innerHTML = "";
      if (f.done && f.ok) result.forEach((s) => cells.append(cell(s)));
      note.innerHTML = f.note;
      opn.textContent = f.checks;
      badge.className = "";
      if (f.done) { badge.className = "badge " + (f.ok ? "ok" : "no"); badge.textContent = f.ok ? "[" + result.join(", ") + "]  →  " + checks + " checks" : "[]  →  impossible"; }
      else badge.textContent = "";
    });
  }
  go(inp.value);
}

// Both code blocks open with the same symbol table. It's interpolated from the
// ELEMENTS above rather than retyped, so the shipped snippet is genuinely
// copy-pasteable AND cannot drift from the table the demo actually runs on.
const CODE_PRELUDE = `const ELEMENTS = ${JSON.stringify(ELEMENTS)};
const CANON = new Map(ELEMENTS.map(e => [e.toLowerCase(), e]));`;

const CODE_BRUTE = `${CODE_PRELUDE}

// Try a 1-char then a 2-char symbol at each cursor; backtrack on dead ends.
function getPeriodicSpelling(word: string): string[] {
  const w = word.toLowerCase();
  function dfs(i: number): string[] | null {
    if (i === w.length) return [];
    for (const len of [1, 2]) {
      const sym = w.slice(i, i + len);
      if (sym.length === len && CANON.has(sym)) {
        const rest = dfs(i + len);
        if (rest) return [CANON.get(sym)!, ...rest];
      }
    }
    return null;                 // no symbol fits here — dead end
  }
  return dfs(0) ?? [];
}`;

const CODE_OPT = `${CODE_PRELUDE}

// Reachability of position i depends ONLY on i, so remember dead positions.
function getPeriodicSpelling(word: string): string[] {
  const w = word.toLowerCase();
  const failed = new Set<number>();          // memo of positions that can't finish
  function dfs(i: number): string[] | null {
    if (i === w.length) return [];
    if (failed.has(i)) return null;          // seen this dead end before
    for (const len of [1, 2]) {
      const sym = w.slice(i, i + len);
      if (sym.length === len && CANON.has(sym)) {
        const rest = dfs(i + len);
        if (rest) return [CANON.get(sym)!, ...rest];
      }
    }
    failed.add(i);                           // collapse the exponential tree
    return null;
  }
  return dfs(0) ?? [];
}`;

// ── STEP — the backtracking DFS on the shared debugger (a growing call stack) ─
const SRC_STEP = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getPeriodicSpelling</span>(word) {` },
  { ln: 2,  html: `  <span class="k">const</span> w = word.<span class="fn">toLowerCase</span>();` },
  { ln: 3,  html: `  <span class="k">function</span> <span class="fn">dfs</span>(i) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">i === w.length</span>) <span class="k">return</span> [];` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="forlen">len</span> <span class="k">of</span> [1, 2]) {` },
  { ln: 6,  html: `      <span class="k">const</span> sym = <span class="tok" data-t="slice">w.slice(i, i + len)</span>;` },
  { ln: 7,  html: `      <span class="k">if</span> (<span class="tok" data-t="iscanon">CANON.has(sym)</span>) {` },
  { ln: 8,  html: `        <span class="k">const</span> rest = <span class="tok" data-t="recur"><span class="fn">dfs</span>(i + len)</span>;` },
  { ln: 9,  html: `        <span class="k">if</span> (<span class="tok" data-t="restcheck">rest</span>) <span class="k">return</span> <span class="tok" data-t="return">[CANON.get(sym), ...rest]</span>;` },
  { ln: 10, html: `      }` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `    <span class="k">return</span> <span class="tok" data-t="retnull">null</span>;   <span class="k">// dead end — backtrack</span>` },
  { ln: 13, html: `  }` },
  { ln: 14, html: `  <span class="k">return</span> <span class="fn">dfs</span>(0) ?? [];` },
  { ln: 15, html: `}` },
];

function traceStep(input) {
  const w = String(input).toLowerCase().replace(/[^a-z]/g, "");
  const steps = [];
  const stack = []; // {i, len, sym}
  const framesNow = (opt = {}) => {
    const arr = [{ title: `getPeriodicSpelling("${input}")`, vars: { w: `"${w}"` }, changed: opt.baseChanged || [] }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      const vars = { i: fr.i };
      if (fr.len != null) vars.len = fr.len;
      if (fr.sym != null) vars.sym = `"${fr.sym}"`;
      arr.push({ title: `dfs(${fr.i})`, vars, changed: top ? (opt.topChanged || []) : [], ret: top ? opt.ret : undefined });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>getPeriodicSpelling("${input}")</b> — can this word be built from element symbols?`, {});
  S(2, `Lowercase it → <b>w = "${w}"</b>.`, { baseChanged: ["w"] });
  S(14, `Kick off the search with <b>dfs(0)</b> — start at position 0.`, {});

  const found = (function dfs(i) {
    const frame = { i, len: null, sym: null };
    stack.push(frame);
    S(3, `Enter <b>dfs(${i})</b> — a new frame is <b>pushed</b>. Can the tail from position ${i} be spelled?`, { topChanged: ["i"] });
    const atEnd = i === w.length;
    S(4, `Base case: <b>i === w.length</b> — ${i} === ${w.length} → <b>${atEnd}</b>.`, { focus: "base", eval: { expr: `${i} === ${w.length}`, val: atEnd } });
    if (atEnd) {
      S(4, `Whole word consumed — <b>return []</b> (this frame pops off).`, { focus: "base", ret: { value: "[] ✓" } });
      stack.pop();
      return [];
    }
    for (const len of [1, 2]) {
      frame.len = len; frame.sym = null;
      S(5, `Try a <b>${len}-letter</b> symbol here (len = ${len}).`, { focus: "forlen", topChanged: ["len"] });
      if (i + len > w.length) { S(6, `Only ${w.length - i} letter${w.length - i === 1 ? "" : "s"} left — a ${len}-letter symbol won't fit. Skip.`, { focus: "slice" }); continue; }
      const sym = w.slice(i, i + len);
      frame.sym = sym;
      S(6, `Slice ${len} char${len > 1 ? "s" : ""} at ${i}: <b>sym = "${sym}"</b>.`, { focus: "slice", topChanged: ["sym"] });
      const isEl = CANON.has(sym);
      S(7, `Is <b>"${sym}"</b> an element symbol? <b>CANON.has(sym)</b> → <b>${isEl}</b>.`, { focus: "iscanon", eval: { expr: `CANON.has("${sym}")`, val: isEl } });
      if (!isEl) continue;
      S(8, `Yes — that's <b>${CANON.get(sym)}</b>. Recurse into <b>dfs(${i + len})</b>.`, { focus: "recur" });
      const rest = dfs(i + len);
      const good = rest !== null;
      S(9, `Back in dfs(${i}). <b>dfs(${i + len})</b> returned ${good ? "a spelling" : "<b>null</b> (dead end)"} → rest is <b>${good ? "truthy" : "null"}</b>.`, { focus: "restcheck", eval: { expr: good ? "rest ≠ null" : "rest = null", val: good } });
      if (good) {
        const out = [CANON.get(sym), ...rest];
        S(9, `Success — prepend <b>${CANON.get(sym)}</b> and <b>return</b> [${out.join(", ")}] (this frame pops off).`, { focus: "return", ret: { value: `[${out.join(", ")}]` } });
        stack.pop();
        return out;
      }
    }
    S(12, `No symbol led to a spelling from ${i} — <b>return null</b> and backtrack (this frame pops off).`, { focus: "retnull", ret: { value: "null ✗" } });
    stack.pop();
    return null;
  })(0);

  const result = found ?? [];
  S(14, `dfs(0) finished. <b>Return ${found === null ? "[]  — no spelling exists" : `[${result.join(", ")}]`}</b>.`, { done: true, result: found === null ? "[]" : `[${result.join(", ")}]` });
  return steps;
}

// ── STEP (memo) — the SAME DFS, now with a `failed` cache on the shared debugger ─
// Paired with "Memoized reach": watch the `failed` Set fill up, then a second path
// reach a position it already contains and RETURN INSTANTLY (the cache hit) instead
// of re-walking that dead subtree — the exact re-work the plain backtracker repeats.
const SRC_MEMO = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getPeriodicSpelling</span>(word) {` },
  { ln: 2,  html: `  <span class="k">const</span> w = word.<span class="fn">toLowerCase</span>();` },
  { ln: 3,  html: `  <span class="k">const</span> failed = <span class="k">new</span> <span class="fn">Set</span>();   <span class="k">// positions proven hopeless</span>` },
  { ln: 4,  html: `  <span class="k">function</span> <span class="fn">dfs</span>(i) {` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">i === w.length</span>) <span class="k">return</span> [];` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="memo">failed.has(i)</span>) <span class="k">return</span> null;   <span class="k">// cached dead end — skip</span>` },
  { ln: 7,  html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="forlen">len</span> <span class="k">of</span> [1, 2]) {` },
  { ln: 8,  html: `      <span class="k">const</span> sym = <span class="tok" data-t="slice">w.slice(i, i + len)</span>;` },
  { ln: 9,  html: `      <span class="k">if</span> (<span class="tok" data-t="iscanon">CANON.has(sym)</span>) {` },
  { ln: 10, html: `        <span class="k">const</span> rest = <span class="tok" data-t="recur"><span class="fn">dfs</span>(i + len)</span>;` },
  { ln: 11, html: `        <span class="k">if</span> (<span class="tok" data-t="restcheck">rest</span>) <span class="k">return</span> <span class="tok" data-t="return">[CANON.get(sym), ...rest]</span>;` },
  { ln: 12, html: `      }` },
  { ln: 13, html: `    }` },
  { ln: 14, html: `    <span class="tok" data-t="failadd">failed.<span class="fn">add</span>(i)</span>;   <span class="k">// remember this dead end</span>` },
  { ln: 15, html: `    <span class="k">return</span> <span class="tok" data-t="retnull">null</span>;` },
  { ln: 16, html: `  }` },
  { ln: 17, html: `  <span class="k">return</span> <span class="fn">dfs</span>(0) ?? [];` },
  { ln: 18, html: `}` },
];

function traceMemo(input) {
  const w = String(input).toLowerCase().replace(/[^a-z]/g, "");
  const steps = [];
  const stack = []; // {i, len, sym}
  const failed = new Set();
  const framesNow = (opt = {}) => {
    const arr = [{ title: `getPeriodicSpelling("${input}")`, vars: { w: `"${w}"` }, changed: opt.baseChanged || [],
      structs: [{ label: "failed", items: [...failed], newest: !!opt.failNew }] }];
    stack.forEach((fr, idx) => {
      const top = idx === stack.length - 1;
      const vars = { i: fr.i };
      if (fr.len != null) vars.len = fr.len;
      if (fr.sym != null) vars.sym = `"${fr.sym}"`;
      arr.push({ title: `dfs(${fr.i})`, vars, changed: top ? (opt.topChanged || []) : [], ret: top ? opt.ret : undefined });
    });
    return arr;
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  S(1, `Call <b>getPeriodicSpelling("${input}")</b> — same DFS as before, but now it remembers its failures.`, {});
  S(2, `Lowercase it → <b>w = "${w}"</b>.`, { baseChanged: ["w"] });
  S(3, `Create <b>failed</b> — a Set of positions already proven to lead nowhere. This is the whole optimization.`, {});
  S(17, `Kick off the search with <b>dfs(0)</b> — start at position 0.`, {});

  const found = (function dfs(i) {
    const frame = { i, len: null, sym: null };
    stack.push(frame);
    S(4, `Enter <b>dfs(${i})</b> — a new frame is <b>pushed</b>. Can the tail from position ${i} be spelled?`, { topChanged: ["i"] });
    const atEnd = i === w.length;
    S(5, `Base case: <b>i === w.length</b> — ${i} === ${w.length} → <b>${atEnd}</b>.`, { focus: "base", eval: { expr: `${i} === ${w.length}`, val: atEnd } });
    if (atEnd) {
      S(5, `Whole word consumed — <b>return []</b> (this frame pops off).`, { focus: "base", ret: { value: "[] ✓" } });
      stack.pop();
      return [];
    }
    const cached = failed.has(i);
    S(6, `Consult the cache first: <b>failed.has(${i})</b> → <b>${cached}</b>.`, { focus: "memo", eval: { expr: `failed.has(${i})`, val: cached } });
    if (cached) {
      S(6, `<b>CACHE HIT</b> — position ${i} is already known hopeless, so <b>return null</b> immediately. The whole subtree below ${i} is <b>skipped</b> — that's the re-work the plain backtracker repeats.`, { focus: "memo", ret: { value: "null (cached)" } });
      stack.pop();
      return null;
    }
    for (const len of [1, 2]) {
      frame.len = len; frame.sym = null;
      S(7, `Try a <b>${len}-letter</b> symbol here (len = ${len}).`, { focus: "forlen", topChanged: ["len"] });
      if (i + len > w.length) { S(8, `Only ${w.length - i} letter${w.length - i === 1 ? "" : "s"} left — a ${len}-letter symbol won't fit. Skip.`, { focus: "slice" }); continue; }
      const sym = w.slice(i, i + len);
      frame.sym = sym;
      S(8, `Slice ${len} char${len > 1 ? "s" : ""} at ${i}: <b>sym = "${sym}"</b>.`, { focus: "slice", topChanged: ["sym"] });
      const isEl = CANON.has(sym);
      S(9, `Is <b>"${sym}"</b> an element symbol? <b>CANON.has(sym)</b> → <b>${isEl}</b>.`, { focus: "iscanon", eval: { expr: `CANON.has("${sym}")`, val: isEl } });
      if (!isEl) continue;
      S(10, `Yes — that's <b>${CANON.get(sym)}</b>. Recurse into <b>dfs(${i + len})</b>.`, { focus: "recur" });
      const rest = dfs(i + len);
      const good = rest !== null;
      S(11, `Back in dfs(${i}). <b>dfs(${i + len})</b> returned ${good ? "a spelling" : "<b>null</b> (dead end)"} → rest is <b>${good ? "truthy" : "null"}</b>.`, { focus: "restcheck", eval: { expr: good ? "rest ≠ null" : "rest = null", val: good } });
      if (good) {
        const out = [CANON.get(sym), ...rest];
        S(11, `Success — prepend <b>${CANON.get(sym)}</b> and <b>return</b> [${out.join(", ")}] (this frame pops off).`, { focus: "return", ret: { value: `[${out.join(", ")}]` } });
        stack.pop();
        return out;
      }
    }
    failed.add(i);
    S(14, `No symbol led anywhere from ${i}. <b>failed.add(${i})</b> — cache this dead end so no other path re-explores it.`, { focus: "failadd", failNew: true });
    S(15, `<b>return null</b> and backtrack (this frame pops off).`, { focus: "retnull", ret: { value: "null ✗" } });
    stack.pop();
    return null;
  })(0);

  const result = found ?? [];
  S(17, `dfs(0) finished. <b>Return ${found === null ? "[]  — no spelling exists" : `[${result.join(", ")}]`}</b>. The <b>failed</b> cache made every position cost O(1) work.`, { done: true, result: found === null ? "[]" : `[${result.join(", ")}]` });
  return steps;
}

export default {
  n: 321, id: "periodic", title: "Periodic Spelling", dates: ["2026-06-27"],
  statement: `Can a word be spelled entirely with periodic-table element symbols (case-insensitive)? Return the symbols used, in original element casing and spelling order, or <code class="inl">[]</code>. Example: <code class="inl">getPeriodicSpelling("neon")</code> → <code class="inl">["Ne","O","N"]</code>; <code class="inl">getPeriodicSpelling("value")</code> → <code class="inl">[]</code>.`,
  // Grouped by approach: each approach is [intuition viz] → [step through], and
  // the tone colour pairs them (brute-tinted pair, then opt-tinted pair).
  variants: [
    { name: "Backtracking DFS", tone: "brute", cost: "O(2ⁿ) backtrack",
      approach: `At each cursor position, try consuming a <b>1-letter</b> then a <b>2-letter</b> symbol. Recurse; when a branch reaches a wall with no fitting symbol, unwind (the red ghost tile) and try the next length. Every position can branch two ways, so worst case the search tree is exponential.`,
      code: CODE_BRUTE, mount: mountBrute },
    { name: "Step: backtrack", tone: "brute", cost: "call stack",
      approach: `A debugger for the backtracking DFS — watch the <b>call stack</b> grow as <code class='inl'>dfs</code> recurses one symbol deeper and shrink as dead ends <b>return null</b> and pop off (that's the backtrack). Each frame carries its own position <code class='inl'>i</code>, the symbol length it's trying, and the <code class='inl'>sym</code> it sliced. Notice it can re-enter the <b>same position</b> down different branches — the wasted work the memo tab kills. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Short words keep the stack readable.)`,
      mount: (host) => mountDebugger(host, { source: SRC_STEP, trace: traceStep, input: { type: "text", label: "word =", value: "neon", presets: ["neon", "carbon", "snack", "value"], hint: "short word" } }) },
    { name: "Memoized reach", tone: "opt", cost: "O(n) memo/DP",
      approach: `Whether the tail from position <i>i</i> can be spelled depends <b>only on i</b>, never on how you arrived. Cache the positions that fail (or fill reachability left→right). The exponential tree flattens to one linear pass — about <code class="inl">2n</code> symbol checks.`,
      code: CODE_OPT, mount: mountOpt },
    { name: "Step: memo", tone: "opt", cost: "cache hit",
      approach: `The same DFS with a <code class='inl'>failed</code> Set bolted on — watch it fill with dead-end positions, then a later branch reach a position <b>already in the cache</b> and <b>return null instantly</b> (the cache hit) instead of re-walking that subtree. That skipped re-work is exactly what the plain backtracker repeats. Try <code class='inl'>cast</code> or <code class='inl'>cobalt</code> to see a hit; <code class='inl'>neon</code> spells cleanly so the cache is never needed. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_MEMO, trace: traceMemo, input: { type: "text", label: "word =", value: "cast", presets: ["cast", "cobalt", "science", "neon"], hint: "watch failed[]" } }) },
  ],
};
