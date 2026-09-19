// #7 · Targeted Sum — remember what you've walked past instead of re-pairing it.
// • BRUTE: every i<j pair, so the work is the upper triangle of an n×n grid.
// • OPT: one pass; before storing arr[i], ask a Map whether its complement
//   target−arr[i] already went by. A pair is found from its SECOND member.
// Open case is engineered: 10 evens, answer at the very end — 45 pairs vs 10 steps.
import { el, mountDebugger } from "../shared.js";

// The four official freeCodeCamp cases first, then one invented worst case.
// Official [1,3,5,6,7,8]/15 already puts the answer in the last pair, and
// [1,3,5,7]/14 is the not-found path; the invented 10-element run just stretches
// the same shape far enough that the triangle is worth looking at (45 vs 10).
const PRESETS = [
  { arr: [2, 7, 11, 15], target: 9, note: "official — found immediately" },
  { arr: [3, 2, 4, 5], target: 6, note: "official — skips index 0 entirely" },
  { arr: [1, 3, 5, 6, 7, 8], target: 15, note: "official — answer is the LAST pair" },
  { arr: [1, 3, 5, 7], target: 14, note: "official — no pair sums to 14" },
  { arr: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], target: 38, note: "invented — the widest gap" },
];

const parseArr = (s) => String(s).split(",").map((x) => x.trim()).filter((x) => x !== "").map(Number).filter((x) => Number.isFinite(x));

// Brute: walk pairs in the exact order the nested loops do, recording where it
// stopped so the grid can shade "tested" separately from "never reached".
function bruteRun(arr, target) {
  let pairs = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) {
      pairs++;
      if (arr[i] + arr[j] === target) return { found: [i, j], pairs, hi: i, hj: j };
    }
  return { found: null, pairs, hi: arr.length, hj: arr.length };
}

// Opt: the same answer from one pass. `trail` is what the demo draws — per index,
// the complement it wanted and whether the Map already had it.
function mapRun(arr, target) {
  const seen = new Map();
  const trail = [];
  for (let i = 0; i < arr.length; i++) {
    const need = target - arr[i];
    const at = seen.has(need) ? seen.get(need) : null;
    trail.push({ i, v: arr[i], need, at });
    if (at !== null) return { found: [at, i], steps: i + 1, trail, seen: [...seen] };
    seen.set(arr[i], i);
  }
  return { found: null, steps: arr.length, trail, seen: [...seen] };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ts-wrap { display:flex; flex-direction:column; gap:12px; }
    .ts-result { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .ts-result b { font:800 20px var(--mono); color:var(--good); }
    .ts-result b.none { color:var(--danger); font-size:16px; }
    .ts-grid { display:grid; gap:3px; width:max-content; max-width:100%; overflow:auto; }
    .ts-cell { width:30px; height:30px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2);
               display:flex; align-items:center; justify-content:center; font:700 10.5px var(--mono); color:var(--muted); }
    .ts-cell.void { border:none; background:transparent; }
    .ts-cell.head { border-color:transparent; background:transparent; color:var(--text); font-weight:800; font-size:12px; }
    .ts-cell.head.mark { color:var(--good); }
    .ts-cell.tried { border-color:color-mix(in srgb, var(--warn) 55%, var(--border)); color:var(--text); }
    .ts-cell.hit { border-color:var(--good); background:color-mix(in srgb, var(--good) 22%, transparent); color:var(--good); font-weight:800; }
    .ts-cards { display:flex; flex-wrap:wrap; gap:6px; }
    .ts-card { min-width:58px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:6px 8px; text-align:center; }
    .ts-card .v { font:800 16px var(--mono); color:var(--text); }
    .ts-card .ix { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .ts-card .need { display:block; font:700 10.5px var(--mono); color:var(--muted); margin-top:3px; }
    .ts-card.stored { border-color:color-mix(in srgb, var(--accent) 50%, var(--border)); }
    .ts-card.stored .need { color:var(--accent); }
    .ts-card.hit { border-color:var(--good); background:color-mix(in srgb, var(--good) 15%, transparent); }
    .ts-card.hit .v, .ts-card.hit .need { color:var(--good); }
    .ts-card.unseen { opacity:.32; }
    .ts-map { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .ts-kv { font:700 11.5px var(--mono); border:1px solid var(--border); border-radius:6px; padding:3px 7px; background:var(--panel); color:var(--muted); }
    .ts-kv.hitkey { border-color:var(--good); color:var(--good); }
    .ts-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
  `));
}

// Shared controls: an array field, a target field, and the preset chips. Both
// approaches read the same two inputs, so flipping the toggle keeps the case.
function controls(host, onChange, init) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inA = el("input"); inA.type = "text"; inA.value = init.arr.join(", "); inA.style.width = "290px";
  const inT = el("input"); inT.type = "number"; inT.value = String(init.target); inT.style.width = "76px";
  ctl.append(el("span", "ctl-label", "arr"), inA, el("span", "ctl-label", "target"), inT);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `[${p.arr.join(",")}] → ${p.target}`);
    c.onclick = () => { inA.value = p.arr.join(", "); inT.value = String(p.target); onChange(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inA.oninput = inT.oninput = onChange;
  queueMicrotask(onChange);
  return { out, read: () => ({ arr: parseArr(inA.value), target: Math.trunc(+inT.value) || 0 }) };
}

const answerLine = (found, arr, opcount) =>
  `${opcount} → ` + (found
    ? `<b>[${found[0]}, ${found[1]}]</b> <span>&nbsp;— arr[${found[0]}] + arr[${found[1]}] = ${arr[found[0]]} + ${arr[found[1]]}</span>`
    : `<b class="none">"Target not found"</b>`);

// ── BRUTE demo — the pair triangle ──────────────────────────────────────────
function mountBrute(host) {
  const { out, read } = controls(host, render, PRESETS[4]);
  function render() {
    const { arr, target } = read();
    out.innerHTML = "";
    if (arr.length < 2) { out.append(el("div", "note", "Enter at least two numbers.")); return; }
    const r = bruteRun(arr, target);
    const n = arr.length;
    const wrap = el("div", "ts-wrap");

    // Row 0 and column 0 are the value headers; cell (i,j) is the pair i<j.
    const grid = el("div", "ts-grid");
    grid.style.gridTemplateColumns = `repeat(${n + 1}, 30px)`;
    const cells = [];
    cells.push(`<div class="ts-cell void"></div>`);
    for (let j = 0; j < n; j++)
      cells.push(`<div class="ts-cell head${r.found && r.found[1] === j ? " mark" : ""}">${arr[j]}</div>`);
    for (let i = 0; i < n; i++) {
      cells.push(`<div class="ts-cell head${r.found && r.found[0] === i ? " mark" : ""}">${arr[i]}</div>`);
      for (let j = 0; j < n; j++) {
        if (j <= i) { cells.push(`<div class="ts-cell void"></div>`); continue; }
        const reached = i < r.hi || (i === r.hi && j <= r.hj);
        const hit = r.found && r.found[0] === i && r.found[1] === j;
        cells.push(`<div class="ts-cell ${hit ? "hit" : reached ? "tried" : ""}">${reached ? arr[i] + arr[j] : ""}</div>`);
      }
    }
    grid.innerHTML = cells.join("");
    wrap.append(el("div", "ts-lbl", `every pair i &lt; j — the shaded cells are the ones actually summed`), grid);
    wrap.append(el("div", "ts-result", answerLine(r.found, arr, `<span class="opcount hot"><span class="n">${r.pairs}</span> pairs summed</span>`)));
    wrap.append(el("div", "note", r.found
      ? `The loops stop at the first hit, so only the cells up to <b>(${r.hi}, ${r.hj})</b> were ever computed — but the triangle shows the bill if the answer had sat further right. A full sweep of ${n} numbers is <b>${(n * (n - 1)) / 2}</b> pairs.`
      : `No pair matched, so the entire triangle was computed: all <b>${r.pairs}</b> of them. Not-found is the brute's worst case — it can never stop early.`));
    out.append(wrap);
  }
}

// ── OPT demo — one pass, each index asking for its complement ───────────────
function mountMap(host) {
  const { out, read } = controls(host, render, PRESETS[4]);
  function render() {
    const { arr, target } = read();
    out.innerHTML = "";
    if (arr.length < 2) { out.append(el("div", "note", "Enter at least two numbers.")); return; }
    const r = mapRun(arr, target);
    const wrap = el("div", "ts-wrap");

    const cards = el("div", "ts-cards");
    arr.forEach((v, i) => {
      const t = r.trail[i];
      const hit = r.found && r.found[1] === i;
      const cls = !t ? "unseen" : hit ? "hit" : "stored";
      cards.append(el("div", "ts-card " + cls,
        `<div class="ix">i=${i}</div><div class="v">${v}</div>` +
        `<span class="need">${t ? `needs ${t.need}` : "—"}</span>`));
    });
    wrap.append(el("div", "ts-lbl", `one pass — under each value, the complement it went looking for`), cards);

    const map = el("div", "ts-map");
    if (!r.seen.length) map.append(el("span", "muted", "(map empty — the answer came from index 1 or the array is too short)"));
    r.seen.forEach(([k, i]) => {
      const isKey = r.found && k === target - arr[r.found[1]];
      map.append(el("span", "ts-kv" + (isKey ? " hitkey" : ""), `${k} → ${i}`));
    });
    wrap.append(el("div", "ts-lbl", "seen — value → index, filled as the pass moves right"), map);

    wrap.append(el("div", "ts-result", answerLine(r.found, arr, `<span class="opcount cool"><span class="n">${r.steps}</span> indexes visited</span>`)));
    const b = bruteRun(arr, target);
    wrap.append(el("div", "note", r.found
      ? `Index <b>${r.found[1]}</b> asked for <b>${target - arr[r.found[1]]}</b> and the map already had it, parked at index <b>${r.found[0]}</b> — so the pair is discovered from its <i>second</i> member, which is also why the indices come out ascending for free. <b>${r.steps}</b> visits against the brute's <b>${b.pairs}</b> sums.`
      : `The pass ran out of array with nothing matching. Even the worst case is one visit per element — <b>${r.steps}</b>, against the brute's <b>${b.pairs}</b>.`));
    out.append(wrap);
  }
}

// ── STEP: pairs ─────────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">findTarget</span>(<span class="tok" data-t="param">arr</span>, <span class="tok" data-t="param">target</span>) {` },
  { ln: 2,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="i">i = 0; i &lt; arr.length</span>; i++) {` },
  { ln: 3,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="j">j = i + 1; j &lt; arr.length</span>; j++) {` },
  { ln: 4,  html: `      <span class="k">if</span> (<span class="tok" data-t="sum">arr[i] + arr[j] === target</span>) {` },
  { ln: 5,  html: `        <span class="k">return</span> <span class="tok" data-t="ret">[i, j]</span>;` },
  { ln: 6,  html: `      }` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="st">"Target not found"</span>;` },
  { ln: 10, html: `}` },
];

// ── STEP: complement ────────────────────────────────────────────────────────
const SRC_MAP = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">findTarget</span>(<span class="tok" data-t="param">arr</span>, <span class="tok" data-t="param">target</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> seen = <span class="tok" data-t="new"><span class="k">new</span> <span class="fn">Map</span>()</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="i">i = 0; i &lt; arr.length</span>; i++) {` },
  { ln: 4,  html: `    <span class="k">const</span> need = <span class="tok" data-t="need">target - arr[i]</span>;` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="has">seen.<span class="fn">has</span>(need)</span>) {` },
  { ln: 6,  html: `      <span class="k">return</span> <span class="tok" data-t="ret">[seen.<span class="fn">get</span>(need), i]</span>;` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `    <span class="tok" data-t="set">seen.<span class="fn">set</span>(arr[i], i)</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="st">"Target not found"</span>;` },
  { ln: 11, html: `}` },
];

// The debugger hands the trace one value, so the pair travels as "nums / target".
const STEP_PRESETS = PRESETS.map((p) => `${p.arr.join(",")} / ${p.target}`);
const splitCase = (raw) => {
  const [a = "", t = ""] = String(raw).split("/");
  return { arr: parseArr(a), target: Math.trunc(+t) || 0 };
};
const stepInput = (value) => ({ type: "text", label: "arr / target =", value, presets: STEP_PRESETS, hint: "comma-separated / target" });

function traceBrute(raw) {
  const { arr, target } = splitCase(raw);
  const steps = [];
  let i, j, pairs = 0;
  const title = `findTarget([${arr.join(", ")}], ${target})`;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2 && line <= 8 && i !== undefined) vars.i = i;
    if (line >= 3 && line <= 7 && j !== undefined) vars.j = j;
    if (line >= 3) vars.pairs = pairs;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs: [{ label: "arr", items: arr }], ret: x.ret }] });
  };

  S(1, `Find two <b>different</b> positions in <b>[${arr.join(", ")}]</b> whose values add to <b>${target}</b>, and return their indices in ascending order.`, { focus: "param" });
  if (arr.length < 2) { S(9, `Fewer than two numbers — nothing to pair. <b>Return "Target not found"</b>.`, { done: true, result: "Target not found", ret: { value: "Target not found" } }); return steps; }

  for (i = 0; i < arr.length; i++) {
    j = undefined;
    S(2, `Outer loop takes <b>arr[${i}] = ${arr[i]}</b> as the left half of the pair.`, { focus: "i", changed: ["i"] });
    for (j = i + 1; j < arr.length; j++) {
      S(3, `Inner loop starts at <b>j = ${j}</b>, not 0 — every pair with a smaller j was already tried from the other side, and <code class='inl'>j = i</code> would pair a number with itself.`, { focus: "j", changed: ["j"] });
      pairs++;
      const sum = arr[i] + arr[j];
      const hit = sum === target;
      S(4, `Sum the pair: <b>${arr[i]} + ${arr[j]} = ${sum}</b> ${hit ? "—" : "vs"} target <b>${target}</b>. That's pair <b>${pairs}</b>. <i>Nothing learned here is remembered — the next i re-sums almost all of it.</i>`,
        { focus: "sum", changed: ["pairs"], eval: { expr: `${arr[i]} + ${arr[j]} === ${target}`, val: hit } });
      if (hit) {
        S(5, `Match. <b>Return [${i}, ${j}]</b> — ascending because the inner loop always keeps <b>j &gt; i</b>. Total cost: <b>${pairs}</b> pair sums.`,
          { focus: "ret", done: true, result: `[${i}, ${j}]`, ret: { value: `[${i}, ${j}]` } });
        return steps;
      }
    }
    j = undefined;
  }
  i = undefined;
  S(9, `Both loops ran out with no match — the full triangle of <b>${pairs}</b> pairs was summed. <b>Return "Target not found"</b>.`,
    { done: true, result: "Target not found", ret: { value: "Target not found" } });
  return steps;
}

function traceMap(raw) {
  const { arr, target } = splitCase(raw);
  const steps = [];
  const seen = new Map();
  let i, need;
  const title = `findTarget([${arr.join(", ")}], ${target})`;
  const items = () => [...seen].map(([k, v]) => `${k}→${v}`);
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3 && i !== undefined) vars.i = i;
    if (line >= 4 && line <= 8 && need !== undefined) vars.need = need;
    const structs = [{ label: "arr", items: arr }];
    if (line >= 2) structs.push({ label: "seen", items: items(), newest: !!x.fresh });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Same array, same target — but this time the pass will <b>remember</b> what it walked past instead of re-pairing it.`, { focus: "param" });
  S(2, `Open an empty <b>Map</b> from value → the index it was seen at. The index is the payload; the value is the key you'll want to look up.`, { focus: "new" });
  if (arr.length < 2) { S(10, `Fewer than two numbers. <b>Return "Target not found"</b>.`, { done: true, result: "Target not found", ret: { value: "Target not found" } }); return steps; }

  for (i = 0; i < arr.length; i++) {
    need = undefined;
    S(3, `Visit index <b>${i}</b>, value <b>${arr[i]}</b>.`, { focus: "i", changed: ["i"] });
    need = target - arr[i];
    S(4, `Invert the question. Rather than "which later number pairs with this one?", ask "what <b>single</b> number would finish the job?" — <b>${target} − ${arr[i]} = ${need}</b>. One subtraction replaces a whole inner loop.`, { focus: "need", changed: ["need"] });
    const at = seen.has(need) ? seen.get(need) : null;
    S(5, `Has <b>${need}</b> already gone by? <b>seen.has(${need})</b> → <b>${at !== null}</b> — an O(1) hash lookup, not a scan.`,
      { focus: "has", eval: { expr: `seen.has(${need})`, val: at !== null } });
    if (at !== null) {
      S(6, `Yes — <b>${need}</b> was parked at index <b>${at}</b>. <b>Return [${at}, ${i}]</b>. The stored index is always the smaller one, so ascending order falls out for free. Cost: <b>${i + 1}</b> visits, one per index up to here.`,
        { focus: "ret", done: true, result: `[${at}, ${i}]`, ret: { value: `[${at}, ${i}]` } });
      return steps;
    }
    seen.set(arr[i], i);
    S(8, `No match yet, so file this one away: <b>${arr[i]} → ${i}</b>. It is now a candidate <i>partner</i> for everything still to the right — which is exactly the work the brute would have redone.`, { focus: "set", fresh: true });
  }
  i = need = undefined;
  S(10, `The pass reached the end and no value ever found its complement waiting. <b>Return "Target not found"</b> — after <b>${arr.length}</b> visits, against the brute's <b>${bruteRun(arr, target).pairs}</b> pair sums.`,
    { done: true, result: "Target not found", ret: { value: "Target not found" } });
  return steps;
}

export default {
  n: 7, id: "targetsum", title: "Targeted Sum", dates: ["2025-08-17"],
  statement: `Given an array of numbers and a <b>target</b>, find two <b>different</b> positions whose values add up to the target and return their indices in ascending order — or the string <code class="inl">"Target not found"</code> if no pair does. <span class="rule">Example: <code class="inl">findTarget([2, 7, 11, 15], 9)</code> → <code class="inl">[0, 1]</code>.</span>`,
  variants: [
    {
      name: "Every pair", tone: "brute", cost: "O(n²) — n(n−1)/2 sums",
      approach: `The direct reading of the problem: try every pair. The inner loop starts at <code class='inl'>i + 1</code> rather than <code class='inl'>0</code> — that both skips pairing a number with itself and avoids testing <code class='inl'>(3,1)</code> after <code class='inl'>(1,3)</code>, which is why the grid below is a triangle instead of a square. Correct, and it needs no extra memory. The waste is that it <b>forgets</b>: by the time the loop reaches index 5 it has already summed index 5 against every earlier value and thrown all of it away.`,
      code: `function findTarget(arr: number[], target: number): number[] | string {
  for (let i = 0; i < arr.length; i++) {
    // j starts at i + 1: no self-pairing, and no (b,a) after (a,b)
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] + arr[j] === target) {
        return [i, j]; // j > i, so this is already ascending
      }
    }
  }
  return "Target not found";
}`,
      mount: mountBrute,
    },
    { name: "Step: every pair", tone: "brute", cost: "pairs summed",
      approach: `Watch <b>pairs</b> climb. On the opening 10-element case the answer is the very last pair, so the counter runs all the way to <b>45</b> — and on <code class='inl'>[1,3,5,7] / 14</code> there is no early exit at all. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput(STEP_PRESETS[4]) }) },
    {
      name: "Complement map", tone: "opt", cost: "O(n) — one pass",
      approach: `Turn the question around. At index <code class='inl'>i</code> you don't need to search for a partner — you can <b>name</b> it: <code class='inl'>target - arr[i]</code>. So the only thing worth keeping is a record of which values have already gone by and where. Store <code class='inl'>value → index</code> as you walk, and check the map <i>before</i> inserting so a number can't pair with itself. Each pair is discovered from its second member, which is why <code class='inl'>[seen.get(need), i]</code> is ascending without a sort.`,
      code: `function findTarget(arr: number[], target: number): number[] | string {
  const seen = new Map<number, number>(); // value -> index it was seen at
  for (let i = 0; i < arr.length; i++) {
    const need = target - arr[i];         // name the partner instead of hunting it
    if (seen.has(need)) {
      return [seen.get(need)!, i];        // stored index is always the smaller
    }
    seen.set(arr[i], i);                  // check before insert: no self-pairing
  }
  return "Target not found";
}`,
      mount: mountMap,
    },
    { name: "Step: complement", tone: "opt", cost: "indexes visited",
      approach: `The <b>seen</b> struct grows by exactly one chip per step, and the run ends the moment an index finds its complement already filed. Same 10-element case as the brute step-through: <b>10</b> visits against <b>45</b> pair sums, same <code class='inl'>[8, 9]</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_MAP, trace: traceMap, input: stepInput(STEP_PRESETS[4]) }) },
  ],
};
