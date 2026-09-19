// #357 · Food Chain — an absence needs the whole list, so collect what IS eaten in one pass.
//
// • BRUTE — "Rescan for every link". Nothing is remembered, so every question
//   costs another sweep of the whole pairs array: one full re-scan per apex
//   candidate, then another full re-scan to resolve each link. O(n²) pair
//   comparisons — and the bill swings wildly with the ORDER the pairs arrive in,
//   because a scan that finds its match on pair 1 is cheap and one that finds it
//   on pair 8 is not.
// • OPT — "Prey set + predator map". One pass folds the pairs into an `isPrey`
//   Set and a `predator → prey` Map, and the list is never read again. The apex
//   is the single name the Set never saw; every link below it is one O(1) Map
//   hop. Exactly 2n + links + 1 operations, whatever order the pairs are in.
//
// HONEST ABOUT THE WIN: the brute passes all 5 official freeCodeCamp assertions —
// no official case can tell the two apart. Those inputs are 1–5 pairs, where this
// is a constant-factor win at best (on the 1-pair case the brute is actually
// *cheaper*, 3 ops vs 4 — building a Map is not free). It only becomes an
// asymptotic win as the chain gets long. So the payoff case is mine, not the
// challenge's:
// ▸ Flip the Approach toggle on the "savanna · bottom-up" preset — 87 pair
//   comparisons vs 25 hash operations on identical input. Then press ⇅ reverse:
//   the answer never moves, the opt counter stays nailed to 25, and the brute
//   falls to 52.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's five official tests, verbatim and in the order the
// grader lists them — they already span a useful spread: the 2-link minimum, two
// lists that happen to arrive in chain order, one with the apex LAST, and one
// fully shuffled 6-link chain. Case 6 is MINE: an 8-pair savanna chain listed
// strictly bottom-up, the worst order a re-scan can be handed. It is the case the
// two op counters diverge on (87 vs 25) and the one the ⇅ reverse button plays off.
const CASES = [
  { label: "cat · 1 pair", pairs: [["cat", "mouse"]] },
  { label: "wolf · in order", pairs: [["wolf", "deer"], ["deer", "grass"]] },
  { label: "hawk · in order", pairs: [["hawk", "snake"], ["snake", "frog"], ["frog", "fly"]] },
  { label: "eagle · apex last", pairs: [["rabbit", "grass"], ["fox", "rabbit"], ["eagle", "fox"]] },
  { label: "orca · shuffled", pairs: [["seal", "salmon"], ["herring", "shrimp"], ["orca", "seal"], ["shrimp", "plankton"], ["salmon", "herring"]] },
  { label: "savanna · bottom-up", pairs: [["cricket", "grass"], ["lizard", "cricket"], ["snake", "lizard"], ["mongoose", "snake"], ["serval", "mongoose"], ["jackal", "serval"], ["hyena", "jackal"], ["lion", "hyena"]] },
];
const OPEN_ON = CASES.length - 1;   // both demos open on the divergence case

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .fk-rows { display:flex; flex-direction:column; gap:4px; margin:2px 0 10px; }
    .fk-row { display:flex; align-items:center; gap:6px; padding:3px 7px; border:1px solid transparent; border-radius:7px; transition:background .1s; }
    .fk-row.scan { border-color:var(--warn); background:color-mix(in srgb,var(--warn) 13%,transparent); }
    .fk-row.hit { border-color:var(--good); background:color-mix(in srgb,var(--good) 15%,transparent); }
    .fk-row.eaten { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,transparent); }
    .fk-i { font:700 11px var(--mono); color:var(--muted); width:16px; text-align:right; flex:none; }
    .fk-in { width:96px; }
    .fk-eats { font:11px var(--sans); color:var(--muted); flex:none; }
    .fk-b { font:700 12px var(--mono); background:var(--panel-2); border:1px solid var(--border);
            border-radius:6px; color:var(--muted); cursor:pointer; padding:3px 7px; line-height:1.2; }
    .fk-b:hover { border-color:var(--accent); color:var(--text); }
    .fk-lad { max-width:330px; }
    .fk-lad .rung.apex { border-color:var(--good); color:var(--good); }
    .fk-lab { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
    .fk-chips { display:flex; flex-wrap:wrap; gap:4px; min-height:24px; }
    .fk-look { margin:10px 0 12px; max-width:520px; }
    .fk-msg { font:12.5px var(--mono); color:var(--muted); min-height:36px; margin:9px 0 2px; line-height:1.5; }
    .fk-msg b { color:var(--text); }
  `));
}

// ── the two runs, instrumented ──────────────────────────────────────────────
// Both return the SAME chain on every input; they differ only in `ops`. An op is
// one look at a pair (brute) or one hash operation (opt) — the same currency, so
// the two counters are comparable side by side.

function bruteRun(pairs) {
  const frames = [];
  const chain = [];
  let ops = 0, passes = 0;
  const push = (o) => frames.push({ ops, chain: chain.slice(), row: -1, ...o });

  push({ note: `<b>Nothing is written down.</b> Every question means another sweep of all ${pairs.length} pair${pairs.length === 1 ? "" : "s"}. First question: which name is never eaten?` });

  let apex = null;
  for (let c = 0; c < pairs.length && apex === null; c++) {
    const cand = pairs[c][0];
    let eaten = false;
    passes++;
    for (let j = 0; j < pairs.length; j++) {
      ops++;
      const hit = pairs[j][1] === cand;
      push({ row: j, mark: hit ? "eaten" : "scan",
        note: `Is <b>${esc(cand)}</b> anyone's prey? Re-scanning from the top — pair ${j + 1} is <b>${esc(pairs[j][0])} → ${esc(pairs[j][1])}</b>${hit ? `, so <b>${esc(cand)}</b> <i>is</i> eaten. Not the apex; throw the scan away and try the next name.` : " — no."}` });
      if (hit) { eaten = true; break; }
    }
    if (!eaten) apex = cand;
  }
  if (apex === null) {
    push({ done: true, note: `Every name turns up as prey somewhere — these pairs form a loop, so there is no apex.` });
    return { frames, ops, chain };
  }
  chain.push(apex);
  push({ note: `<b>${esc(apex)}</b> survived a whole sweep without appearing as prey, so it is the apex. That one fact cost a full pass of the list.` });

  const seen = new Set([apex]);
  let cur = apex;
  for (;;) {
    let next = null;
    passes++;
    for (let j = 0; j < pairs.length; j++) {
      ops++;
      const hit = pairs[j][0] === cur;
      push({ row: j, mark: hit ? "hit" : "scan",
        note: `What does <b>${esc(cur)}</b> eat? <b>Another full re-scan</b> — pair ${j + 1} is <b>${esc(pairs[j][0])} → ${esc(pairs[j][1])}</b>${hit ? `, a match: <b>${esc(cur)}</b> eats <b>${esc(pairs[j][1])}</b>.` : " — no."}` });
      if (hit) { next = pairs[j][1]; break; }
    }
    if (next === null) {
      push({ done: true, note: `Nothing left the scan matching <b>${esc(cur)}</b>, so the chain ends. <b>${ops}</b> pair comparisons for ${chain.length} name${chain.length === 1 ? "" : "s"} — the same ${pairs.length}-pair list started over <b>${passes}</b> separate times.` });
      break;
    }
    if (seen.has(next)) {
      push({ done: true, note: `<b>${esc(next)}</b> is already on the ladder — these pairs cycle, so the walk stops here.` });
      break;
    }
    seen.add(next); chain.push(next); cur = next;
    push({ note: `Hang <b>${esc(next)}</b> on the bottom of the ladder, then start yet another scan from pair 1 looking for what <i>it</i> eats.` });
  }
  return { frames, ops, chain };
}

function optRun(pairs) {
  const frames = [];
  const chain = [];
  const preyOf = new Map(), isPrey = new Set();
  const mapView = [], setView = [];
  let ops = 0;
  const push = (o) => frames.push({ ops, chain: chain.slice(), row: -1, map: mapView.slice(), prey: setView.slice(), ...o });

  push({ note: `<b>Read the list once, then never again.</b> Each pair goes into a <b>Map</b> (predator → prey) and its prey goes into a <b>Set</b> of everything that gets eaten.` });
  for (let j = 0; j < pairs.length; j++) {
    ops++;
    const [p, q] = pairs[j];
    if (!preyOf.has(p)) mapView.push(`${p} → ${q}`);
    preyOf.set(p, q);
    if (!isPrey.has(q)) { isPrey.add(q); setView.push(q); }
    push({ row: j, mark: "scan",
      note: `Pair ${j + 1}: file <b>${esc(p)} → ${esc(q)}</b> in the Map and drop <b>${esc(q)}</b> in the prey Set. One touch — this pair is finished with forever.` });
  }
  push({ note: `One pass, done. <b>${preyOf.size}</b> map entries and <b>${isPrey.size}</b> known prey. Everything the list had to say is now in two lookups.` });

  let apex = null;
  for (let j = 0; j < pairs.length; j++) {
    ops++;
    const p = pairs[j][0];
    const eaten = isPrey.has(p);
    if (!eaten) apex = p;
    push({ row: j, mark: eaten ? "eaten" : "hit",
      note: `<code class='inl'>isPrey.has("${esc(p)}")</code> → <b>${eaten}</b>${eaten ? " — something eats it, so it can't be the top." : ` — nothing eats <b>${esc(p)}</b>, so it is the apex.`} One hash probe, no scanning.` });
  }
  if (apex === null) {
    push({ done: true, note: `The Set contains every predator too — the pairs form a loop, so there is no apex.` });
    return { frames, ops, chain };
  }
  chain.push(apex);
  push({ note: `Apex is <b>${esc(apex)}</b>. Start the ladder there and hop down.` });

  const seen = new Set([apex]);
  let cur = apex;
  for (;;) {
    ops++;
    if (!preyOf.has(cur)) {
      push({ done: true, note: `<code class='inl'>preyOf.has("${esc(cur)}")</code> → <b>false</b>: nothing below it, the chain ends. <b>${ops}</b> hash operations — and that total doesn't change if you shuffle the pairs.` });
      break;
    }
    const next = preyOf.get(cur);
    if (seen.has(next)) {
      push({ done: true, note: `<b>${esc(next)}</b> is already on the ladder — these pairs cycle, so the walk stops here.` });
      break;
    }
    seen.add(next); chain.push(next);
    push({ note: `<b>${esc(cur)}</b> → <b>${esc(next)}</b> in a single Map hop. The answer was written down during the build pass, so there is nothing to search.` });
    cur = next;
  }
  return { frames, ops, chain };
}

// ── shared demo scaffolding ─────────────────────────────────────────────────
function makePlayer(host) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  function run(count, render) {
    stop();
    const speed = Math.max(55, Math.min(230, 2600 / Math.max(1, count)));
    let k = 0;
    (function tick() {
      if (!host.isConnected) { stop(); return; }
      render(k);
      if (k >= count - 1) return;
      k++; timer = setTimeout(tick, speed);
    })();
  }
  return { run, stop };
}

function ladderEl(chain, done) {
  const lad = el("div", "ladder fk-lad");
  if (!chain.length) { lad.append(el("div", "rung", `<span class="v">(still hunting for the apex…)</span>`)); return lad; }
  chain.forEach((name, i) => {
    const last = i === chain.length - 1;
    const tail = !last ? "eats ↓" : done ? "bottom of the chain" : "…";
    lad.append(el("div", "rung" + (i === 0 ? " apex" : "") + (last ? " on" : ""),
      `<span>${i === 0 ? "▲ " : "&nbsp;&nbsp;"}${esc(name)}</span><span class="v">${tail}</span>`));
  });
  return lad;
}

// One demo body, parameterised by which run it animates. Both get the same
// editable pair list, so the same input can be handed to either approach.
function mountApproach(host, kind) {
  ensureStyle();
  const isBrute = kind === "brute";
  const player = makePlayer(host);
  let pairs = CASES[OPEN_ON].pairs.map((p) => [...p]);

  const chipRow = el("div", "controls");
  const rowsBox = el("div", "fk-rows");
  const tools = el("div", "controls");
  const bar = el("div", "result-line");
  const opc = el("span", "opcount " + (isBrute ? "hot" : "cool"));
  const opn = el("span", "n", "0");
  opc.append(opn, document.createTextNode(isBrute ? " pair comparisons" : " hash operations"));
  const resEl = el("span", "tag");
  bar.append(opc, resEl);
  const lookBox = el("div", "fk-look");
  const ladBox = el("div");
  const msg = el("div", "fk-msg");

  const chips = CASES.map((c, i) => {
    const b = el("button", "chip" + (i === OPEN_ON ? " on" : ""), c.label);
    b.onclick = () => { pairs = c.pairs.map((p) => [...p]); markChip(i); rebuild(); run(); };
    chipRow.append(b);
    return b;
  });
  const markChip = (i) => chips.forEach((b, bi) => b.classList.toggle("on", bi === i));

  const mkTool = (label, fn) => { const b = el("button", "chip", label); b.onclick = fn; tools.append(b); return b; };
  mkTool("+ pair", () => { pairs.push(["", ""]); markChip(-1); rebuild(); run(); });
  mkTool("⇅ reverse", () => { pairs.reverse(); markChip(-1); rebuild(); run(); });
  mkTool("🔀 shuffle", () => {
    for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
    markChip(-1); rebuild(); run();
  });
  mkTool("↻ replay", () => run());

  host.append(chipRow, rowsBox, tools, bar, ...(isBrute ? [] : [lookBox]), ladBox, msg);
  host.append(el("div", "note", isBrute
    ? `Edit any name, drag rows around with <b>↑ ↓</b>, or press <b>⇅ reverse</b> / <b>🔀 shuffle</b>. The answer never changes — but the comparison counter does, because every scan starts again at pair 1. That order-sensitivity is the whole cost of not remembering anything.`
    : `Edit or reorder the pairs however you like. The build pass touches each pair exactly once and the walk is pure Map hops, so the counter reads the same number for any ordering of the same ecosystem — compare it with the brute tab's swing.`));

  let rowEls = [];
  function rebuild() {
    rowsBox.innerHTML = ""; rowEls = [];
    pairs.forEach((p, i) => {
      const row = el("div", "fk-row");
      const a = el("input"); a.type = "text"; a.value = p[0]; a.className = "fk-in"; a.placeholder = "predator";
      const b = el("input"); b.type = "text"; b.value = p[1]; b.className = "fk-in"; b.placeholder = "prey";
      a.oninput = () => { pairs[i][0] = a.value.trim(); markChip(-1); run(); };
      b.oninput = () => { pairs[i][1] = b.value.trim(); markChip(-1); run(); };
      const up = el("button", "fk-b", "↑"), dn = el("button", "fk-b", "↓"), rm = el("button", "fk-b", "✕");
      up.disabled = i === 0; dn.disabled = i === pairs.length - 1;
      up.onclick = () => { [pairs[i - 1], pairs[i]] = [pairs[i], pairs[i - 1]]; markChip(-1); rebuild(); run(); };
      dn.onclick = () => { [pairs[i + 1], pairs[i]] = [pairs[i], pairs[i + 1]]; markChip(-1); rebuild(); run(); };
      rm.onclick = () => { pairs.splice(i, 1); markChip(-1); rebuild(); run(); };
      row.append(el("span", "fk-i", String(i + 1)), a, el("span", "fk-eats", "eats"), b, up, dn, rm);
      rowsBox.append(row); rowEls.push(row);
    });
  }

  function paintLookups(f) {
    lookBox.innerHTML = "";
    const grid = el("div", "grid2");
    const left = el("div"), right = el("div");
    left.append(el("div", "fk-lab", "preyOf — predator → prey"));
    const lc = el("div", "fk-chips");
    (f.map || []).forEach((m) => lc.append(el("span", "tag", esc(m))));
    if (!(f.map || []).length) lc.append(el("span", "muted mono", "(empty)"));
    left.append(lc);
    right.append(el("div", "fk-lab", "isPrey — everything eaten"));
    const rc = el("div", "fk-chips");
    (f.prey || []).forEach((m) => rc.append(el("span", "tag", esc(m))));
    if (!(f.prey || []).length) rc.append(el("span", "muted mono", "(empty)"));
    right.append(rc);
    grid.append(left, right);
    lookBox.append(grid);
  }

  function run() {
    player.stop();
    if (!pairs.length) { idle("Add at least one <b>[predator, prey]</b> pair."); return; }
    if (pairs.some((p) => !p[0] || !p[1])) { idle("Every row needs both a predator and a prey before the chain can be built."); return; }
    // The problem guarantees ONE chain: each predator eats exactly one thing, and
    // exactly one name is never prey. Reject anything else rather than animate it —
    // a fork or a duplicate has more than one defensible answer, and the two
    // approaches would then legitimately disagree, which is not what this teaches.
    const preds = pairs.map((p) => p[0]);
    const dup = preds.find((p, i) => preds.indexOf(p) !== i);
    if (dup) { idle(`<b>${esc(dup)}</b> is listed as a predator twice. A chain gives every animal exactly <b>one</b> prey — with two, there is no single answer to walk to.`); return; }
    const eatenNames = new Set(pairs.map((p) => p[1]));
    const tops = preds.filter((p) => !eatenNames.has(p));
    if (tops.length !== 1) {
      idle(tops.length === 0
        ? "Every name here is eaten by something, so the pairs form a <b>loop</b> with no apex. Break the cycle to get a chain."
        : `<b>${tops.map(esc).join("</b> and <b>")}</b> are both never eaten, so these pairs describe <b>${tops.length}</b> separate chains rather than one.`);
      return;
    }
    const { frames, chain } = isBrute ? bruteRun(pairs) : optRun(pairs);
    player.run(frames.length, (k) => {
      const f = frames[k];
      rowEls.forEach((r, i) => { r.className = "fk-row" + (i === f.row ? " " + f.mark : ""); });
      opn.textContent = f.ops;
      if (!isBrute) paintLookups(f);
      ladBox.innerHTML = ""; ladBox.append(ladderEl(f.chain, !!f.done));
      msg.innerHTML = f.note;
      resEl.textContent = f.done ? `→ [${chain.join(", ")}]` : "";
      resEl.style.display = f.done ? "" : "none";
    });
  }
  function idle(text) {
    rowEls.forEach((r) => { r.className = "fk-row"; });
    opn.textContent = "0"; resEl.textContent = ""; resEl.style.display = "none";
    if (!isBrute) paintLookups({ map: [], prey: [] });
    ladBox.innerHTML = ""; ladBox.append(ladderEl([], false));
    msg.innerHTML = text;
  }

  rebuild();
  run();
}

const CODE_BRUTE = `// Brute: re-scan the whole pairs array to find the apex, and again for every link.
function getFoodChain(pairs: string[][]): string[] {
  let apex = "";
  for (const [predator] of pairs) {           // try each name as the apex
    let eaten = false;
    for (const [, prey] of pairs) {           // RE-SCAN: is it ever prey?
      if (prey === predator) { eaten = true; break; }
    }
    if (!eaten) { apex = predator; break; }
  }
  const chain = [apex];
  let cur = apex;
  for (;;) {
    let next = "";
    for (const [predator, prey] of pairs) {   // RE-SCAN again, once per link
      if (predator === cur) { next = prey; break; }
    }
    if (next === "") break;
    chain.push(next);
    cur = next;
  }
  return chain;
}`;

const CODE_OPT = `// One pass builds two lookups; then the apex is a Set miss and each link a Map hit.
function getFoodChain(pairs: string[][]): string[] {
  const preyOf = new Map<string, string>();   // predator -> what it eats
  const isPrey = new Set<string>();           // every name eaten by something
  for (const [predator, prey] of pairs) {
    preyOf.set(predator, prey);
    isPrey.add(prey);
  }
  let apex = "";
  for (const [predator] of pairs) {
    if (!isPrey.has(predator)) apex = predator;              // exactly one name is never eaten
  }
  const chain = [apex];
  let cur = apex;
  while (preyOf.has(cur)) {                   // one O(1) hop per link
    cur = preyOf.get(cur)!;
    chain.push(cur);
  }
  return chain;
}`;

// ── STEP cases ──────────────────────────────────────────────────────────────
// Curated for trace length, not invented: #1, #2 and #3 are freeCodeCamp's
// official cases 1, 4 and 5 (the two-link minimum, the apex-last list, the fully
// shuffled six-link chain). #4 is MINE — a four-pair cut of the demo's savanna
// case, kept short enough to step through, and the one where the two traces
// visibly disagree in length (27 pair comparisons against 13 hash operations).
// The two official cases dropped here (#2 and #3) are preset chips on both demos.
const DBG_CASES = [
  { label: "cat · 1 pair", pairs: [["cat", "mouse"]] },
  { label: "eagle · apex last", pairs: [["rabbit", "grass"], ["fox", "rabbit"], ["eagle", "fox"]] },
  { label: "orca · shuffled", pairs: [["seal", "salmon"], ["herring", "shrimp"], ["orca", "seal"], ["shrimp", "plankton"], ["salmon", "herring"]] },
  { label: "savanna · bottom-up", pairs: [["cricket", "grass"], ["lizard", "cricket"], ["snake", "lizard"], ["hyena", "snake"]] },
];
const dbgCase = (i) => DBG_CASES[Math.max(0, Math.min(DBG_CASES.length - 1, (i | 0) - 1))];
const DBG_INPUT = {
  label: "case =", value: DBG_CASES.length, min: 1, max: DBG_CASES.length,
  presets: DBG_CASES.map((_, i) => i + 1), hint: `1–${DBG_CASES.length}: pick an ecosystem`,
};
const pairItems = (pairs) => pairs.map(([p, q]) => `${p}→${q}`);

const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getFoodChain</span>(<span class="tok" data-t="param">pairs</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> apex = <span class="st">""</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> [<span class="tok" data-t="cand">predator</span>] <span class="k">of</span> pairs) {   <span class="cm">// try each name as the apex</span>` },
  { ln: 4,  html: `    <span class="k">let</span> eaten = <span class="k">false</span>;` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">const</span> [, prey] <span class="k">of</span> <span class="tok" data-t="rescan1">pairs</span>) {   <span class="cm">// RE-SCAN: is it ever prey?</span>` },
  { ln: 6,  html: `      <span class="k">if</span> (<span class="tok" data-t="cmp1">prey === predator</span>) { eaten = <span class="k">true</span>; <span class="k">break</span>; }` },
  { ln: 7,  html: `    }` },
  { ln: 8,  html: `    <span class="k">if</span> (<span class="tok" data-t="found">!eaten</span>) { apex = predator; <span class="k">break</span>; }` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">const</span> <span class="tok" data-t="chain">chain = [apex]</span>;` },
  { ln: 11, html: `  <span class="k">let</span> cur = apex;` },
  { ln: 12, html: `  <span class="k">for</span> (;;) {` },
  { ln: 13, html: `    <span class="k">let</span> next = <span class="st">""</span>;` },
  { ln: 14, html: `    <span class="k">for</span> (<span class="k">const</span> [predator, prey] <span class="k">of</span> <span class="tok" data-t="rescan2">pairs</span>) {   <span class="cm">// RE-SCAN again, once per link</span>` },
  { ln: 15, html: `      <span class="k">if</span> (<span class="tok" data-t="cmp2">predator === cur</span>) { next = prey; <span class="k">break</span>; }` },
  { ln: 16, html: `    }` },
  { ln: 17, html: `    <span class="k">if</span> (<span class="tok" data-t="stop">next === <span class="st">""</span></span>) <span class="k">break</span>;` },
  { ln: 18, html: `    <span class="tok" data-t="push">chain.<span class="fn">push</span>(next)</span>;` },
  { ln: 19, html: `    cur = next;` },
  { ln: 20, html: `  }` },
  { ln: 21, html: `  <span class="k">return</span> <span class="tok" data-t="ret">chain</span>;` },
  { ln: 22, html: `}` },
];

// Scope by omission, gated on the line that binds each name: `apex` from line 2,
// the candidate `predator` across the apex loop (3–9), `prey` only on line 6
// (line 5 is the loop header — the binding doesn't exist until the body runs),
// `chain`/`cur` from 10/11, and the second loop's own `predator`/`prey` only on
// line 15. `pairs` is a parameter, so its struct is live for the whole call;
// `chain` appears the moment line 10 creates it and stays.
function traceBrute(caseIndex) {
  const cs = dbgCase(caseIndex);
  const pairs = cs.pairs;
  const steps = [];
  const chain = [];
  let apex = "", cand = null, eaten = null, probe = null, cur = null, next = null, p2 = null, q2 = null, scans = 0, passes = 0;

  const S = (line, note, o = {}) => {
    const vars = {};
    if (line >= 2) vars.apex = `"${apex}"`;
    if (line >= 3 && line <= 9) vars.predator = `"${cand}"`;
    if (line >= 4 && line <= 9) vars.eaten = eaten;
    if (line === 6) vars.prey = `"${probe}"`;               // bound only once the loop body runs
    if (line >= 11) vars.cur = `"${cur}"`;
    if (line >= 13 && line <= 19) vars.next = `"${next}"`;
    if (line === 15) { vars.predator = `"${p2}"`; vars.prey = `"${q2}"`; }
    const structs = [{ label: "pairs", items: pairItems(pairs) }];
    if (line >= 10) structs.push({ label: "chain", items: chain.slice(), newest: !!o.grew });
    steps.push({ line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: `getFoodChain(${pairs.length} pairs)`, vars, changed: o.changed || [], structs, ret: o.ret }] });
  };

  S(1, `<b>${cs.label}.</b> ${pairs.length} <code class='inl'>[predator, prey]</code> pair${pairs.length === 1 ? "" : "s"} arrive in no particular order. This version keeps <b>no</b> record of them, so every question below is answered by another sweep of the list.`, { focus: "param" });
  S(2, `<b>apex = ""</b> — no candidate yet. The apex is defined by an <i>absence</i> ("never appears as prey"), which is exactly what makes it expensive to prove without a lookup.`, { changed: ["apex"] });

  let done = false;
  for (let c = 0; c < pairs.length && !done; c++) {
    cand = pairs[c][0];
    S(3, `Take <b>${esc(cand)}</b> (the predator of pair ${c + 1}) as the next apex candidate.`, { focus: "cand", changed: ["predator"] });
    eaten = false;
    S(4, `<b>eaten = false</b> — we haven't yet seen <b>${esc(cand)}</b> on the right-hand side of any pair.`, { changed: ["eaten"] });
    passes++;
    S(5, `Start a <b>fresh scan of every pair from the top</b> (scan #${passes}). This is the wasteful act: the previous scan learned things about this list, and all of it was thrown away.`, { focus: "rescan1" });
    for (let j = 0; j < pairs.length; j++) {
      probe = pairs[j][1]; scans++;
      const hit = probe === cand;
      S(6, `Pair ${j + 1} says <b>${esc(pairs[j][0])}</b> eats <b>${esc(probe)}</b>. Is that prey <b>${esc(cand)}</b>? → <b>${hit}</b>.${hit ? ` So something eats <b>${esc(cand)}</b> — abandon it.` : ""} <span class="muted">(${scans} comparisons so far)</span>`,
        { focus: "cmp1", eval: { expr: `"${probe}" === "${cand}"`, val: hit }, changed: ["prey"] });
      if (hit) { eaten = true; break; }
    }
    probe = null;
    if (!eaten) { apex = cand; done = true; }   // line 8 is where `apex` is assigned, so flash it here
    S(8, eaten
      ? `<b>eaten</b> is true, so <b>${esc(cand)}</b> is somebody's dinner — loop round and pay for another full scan on the next candidate.`
      : `<b>eaten</b> is false: a complete pass of the list never once found <b>${esc(cand)}</b> as prey, so it is the apex.`,
      { focus: "found", eval: { expr: `!eaten`, val: !eaten }, changed: eaten ? [] : ["apex"] });
  }
  cand = null; eaten = null;

  chain.push(apex);
  S(10, `Seed the answer with the apex: <b>chain = ["${esc(apex)}"]</b>. Finding just this first name cost <b>${scans}</b> comparisons.`, { focus: "chain", grew: true });
  cur = apex;
  S(11, `<b>cur</b> tracks where we are on the way down. Start at the top.`, { changed: ["cur"] });

  const seen = new Set([apex]);
  for (;;) {
    next = "";
    S(13, `<b>next = ""</b> — we do not know what <b>${esc(cur)}</b> eats, and there is no lookup to ask. Only the raw list.`, { changed: ["next"] });
    passes++;
    S(14, `<b>Re-scan all ${pairs.length} pairs again</b> (scan #${passes}), this time hunting for a predator called <b>${esc(cur)}</b>. Same list, same order, ${scans} comparisons already spent.`, { focus: "rescan2" });
    let hitAt = -1;
    for (let j = 0; j < pairs.length; j++) {
      p2 = pairs[j][0]; q2 = pairs[j][1]; scans++;
      const hit = p2 === cur;
      S(15, `Pair ${j + 1}: is its predator <b>${esc(p2)}</b> the same as <b>${esc(cur)}</b>? → <b>${hit}</b>.${hit ? ` Found it — <b>${esc(cur)}</b> eats <b>${esc(q2)}</b>.` : ""} <span class="muted">(${scans} comparisons so far)</span>`,
        { focus: "cmp2", eval: { expr: `"${p2}" === "${cur}"`, val: hit } });
      if (hit) { next = q2; hitAt = j; break; }
    }
    p2 = null; q2 = null;
    const stop = next === "";
    S(17, stop
      ? `The scan ended with <b>next</b> still empty — nothing eats out of <b>${esc(cur)}</b>, so this is the bottom of the chain.`
      : `<b>next</b> is <b>"${esc(next)}"</b> (from pair ${hitAt + 1}), so there is another rung below.`,
      { focus: "stop", eval: { expr: `next === ""`, val: stop } });
    if (stop) break;
    if (seen.has(next)) {
      S(17, `<b>${esc(next)}</b> is already on the chain — these pairs cycle rather than descend, so stop before looping forever.`, { focus: "stop" });
      break;
    }
    seen.add(next);
    chain.push(next);
    S(18, `Push <b>${esc(next)}</b> onto the chain — rung ${chain.length}.`, { focus: "push", grew: true });
    cur = next;
    S(19, `Move <b>cur</b> down to <b>${esc(next)}</b>, and go round to buy another full scan for it.`, { changed: ["cur"] });
  }
  next = null;
  S(21, `<b>Return [${chain.map(esc).join(", ")}]</b> — correct, at a cost of <b>${scans}</b> pair comparisons for a list of only ${pairs.length}. The same list was started over from pair 1 <b>${passes}</b> separate times, re-learning the same facts.`,
    { focus: "ret", done: true, result: `[${chain.join(", ")}]`, ret: { value: `[${chain.join(", ")}]` } });
  return steps;
}

const SRC_OPT = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getFoodChain</span>(<span class="tok" data-t="param">pairs</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> preyOf = <span class="k">new</span> <span class="fn">Map</span>();   <span class="cm">// predator -&gt; what it eats</span>` },
  { ln: 3,  html: `  <span class="k">const</span> isPrey = <span class="k">new</span> <span class="fn">Set</span>();   <span class="cm">// every name eaten by something</span>` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> [predator, prey] <span class="k">of</span> <span class="tok" data-t="onepass">pairs</span>) {` },
  { ln: 5,  html: `    <span class="tok" data-t="set">preyOf.<span class="fn">set</span>(predator, prey)</span>;` },
  { ln: 6,  html: `    <span class="tok" data-t="add">isPrey.<span class="fn">add</span>(prey)</span>;` },
  { ln: 7,  html: `  }` },
  { ln: 8,  html: `  <span class="k">let</span> apex = <span class="st">""</span>;` },
  { ln: 9,  html: `  <span class="k">for</span> (<span class="k">const</span> [predator] <span class="k">of</span> pairs) {` },
  { ln: 10, html: `    <span class="k">if</span> (<span class="tok" data-t="miss">!isPrey.<span class="fn">has</span>(predator)</span>) apex = predator;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">const</span> <span class="tok" data-t="chain">chain = [apex]</span>;` },
  { ln: 13, html: `  <span class="k">let</span> cur = apex;` },
  { ln: 14, html: `  <span class="k">while</span> (<span class="tok" data-t="hascond">preyOf.<span class="fn">has</span>(cur)</span>) {   <span class="cm">// one O(1) hop per link</span>` },
  { ln: 15, html: `    cur = <span class="tok" data-t="get">preyOf.<span class="fn">get</span>(cur)</span>;` },
  { ln: 16, html: `    <span class="tok" data-t="push">chain.<span class="fn">push</span>(cur)</span>;` },
  { ln: 17, html: `  }` },
  { ln: 18, html: `  <span class="k">return</span> <span class="tok" data-t="ret">chain</span>;` },
  { ln: 19, html: `}` },
];

// Same gating rule: `preyOf` from line 2, `isPrey` from 3 (both stay for the rest
// of the call), the build loop's `predator`/`prey` only on 4–6, `apex` from 8, the
// apex loop's `predator` only on 9–10, `chain` from 12 and `cur` from 13.
function traceOpt(caseIndex) {
  const cs = dbgCase(caseIndex);
  const pairs = cs.pairs;
  const steps = [];
  const mapView = [], setView = [], chain = [];
  const preyOf = new Map(), isPrey = new Set();
  let apex = "", bp = null, bq = null, ap = null, cur = null, ops = 0;

  const S = (line, note, o = {}) => {
    const vars = {};
    if (line >= 4 && line <= 6) { vars.predator = `"${bp}"`; vars.prey = `"${bq}"`; }
    if (line >= 8) vars.apex = `"${apex}"`;
    if (line >= 9 && line <= 10) vars.predator = `"${ap}"`;
    if (line >= 13) vars.cur = `"${cur}"`;
    const structs = [];
    if (line >= 2) structs.push({ label: "preyOf", items: mapView.slice(), newest: o.grew === "map" });
    if (line >= 3) structs.push({ label: "isPrey", items: setView.slice(), newest: o.grew === "set" });
    if (line >= 12) structs.push({ label: "chain", items: chain.slice(), newest: o.grew === "chain" });
    steps.push({ line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: `getFoodChain(${pairs.length} pairs)`, vars, changed: o.changed || [], structs, ret: o.ret }] });
  };

  S(1, `<b>${cs.label}.</b> The same ${pairs.length} pair${pairs.length === 1 ? "" : "s"} in the same order — but this time we read them <b>once</b> and turn them into something that answers questions directly.`, { focus: "param" });
  S(2, `An empty <b>Map</b>. It will answer "what does X eat?" in constant time, which is the question the walk down the chain asks over and over.`);
  S(3, `An empty <b>Set</b>. It will answer "is X eaten by anything?" — and the apex is exactly the name for which that answer is <i>no</i>.`);

  for (let j = 0; j < pairs.length; j++) {
    bp = pairs[j][0]; bq = pairs[j][1]; ops++;
    S(4, `Pair ${j + 1} of ${pairs.length}: <b>${esc(bp)} → ${esc(bq)}</b>. This is the only time this pair is looked at.`, { focus: "onepass", changed: ["predator", "prey"] });
    const newKey = !preyOf.has(bp);
    preyOf.set(bp, bq); if (newKey) mapView.push(`${bp}→${bq}`);
    S(5, `Record <b>${esc(bp)} → ${esc(bq)}</b> in the Map. Later, "what does ${esc(bp)} eat?" is a hash probe rather than a scan.`, { focus: "set", grew: newKey ? "map" : undefined });
    const newPrey = !isPrey.has(bq);
    isPrey.add(bq); if (newPrey) setView.push(bq);
    S(6, newPrey
      ? `File <b>${esc(bq)}</b> in the prey Set — it now has something above it, so it can never be the apex.`
      : `<b>${esc(bq)}</b> is already in the prey Set; a Set silently ignores the repeat.`,
      { focus: "add", grew: newPrey ? "set" : undefined });
  }
  bp = null; bq = null;
  S(7, `One pass, finished. The list has told us everything it knows: <b>${preyOf.size}</b> map entries and <b>${isPrey.size}</b> names that are somebody's prey. We never touch <code class='inl'>pairs</code> as a list again.`);
  S(8, `<b>apex = ""</b> — about to be found by asking the Set, not by scanning for an absence.`, { changed: ["apex"] });

  for (let j = 0; j < pairs.length; j++) {
    ap = pairs[j][0]; ops++;
    const eaten = isPrey.has(ap);
    if (!eaten) apex = ap;
    S(10, `<code class='inl'>isPrey.has("${esc(ap)}")</code> → <b>${eaten}</b>.${eaten ? " Something eats it, so it isn't the top." : ` Nothing eats <b>${esc(ap)}</b> — that absence <i>is</i> the definition of the apex, and one probe proved it.`}`,
      { focus: "miss", eval: { expr: `!isPrey.has("${ap}")`, val: !eaten }, changed: eaten ? ["predator"] : ["predator", "apex"] });
  }
  ap = null;
  S(11, `Every predator has been asked once. The loop runs to the end with no early exit because there is nothing to search — it is a single flat pass either way, which is why this cost never depends on the pairs' order. <b>${ops}</b> hash operations so far.`);

  chain.push(apex);
  S(12, `Seed the chain with the apex: <b>["${esc(apex)}"]</b>.`, { focus: "chain", grew: "chain" });
  cur = apex;
  S(13, `<b>cur</b> marks the rung we're standing on.`, { changed: ["cur"] });

  const seen = new Set([apex]);
  for (;;) {
    ops++;
    const has = preyOf.has(cur);
    S(14, `<code class='inl'>preyOf.has("${esc(cur)}")</code> → <b>${has}</b>.${has ? " There's a rung below." : " Nothing below — the chain is complete."}`,
      { focus: "hascond", eval: { expr: `preyOf.has("${cur}")`, val: has } });
    if (!has) break;
    const nxt = preyOf.get(cur);
    if (seen.has(nxt)) {
      S(15, `<b>${esc(nxt)}</b> is already on the chain — these pairs cycle rather than descend, so stop before looping forever.`, { focus: "get" });
      break;
    }
    seen.add(nxt);
    cur = nxt;
    S(15, `One hop: <b>${esc(cur)}</b>. No search — this was written down back on line 5.`, { focus: "get", changed: ["cur"] });
    chain.push(cur);
    S(16, `Push it — the chain is now ${chain.length} deep.`, { focus: "push", grew: "chain" });
  }
  S(18, `<b>Return [${chain.map(esc).join(", ")}]</b> — the same answer as the re-scan, in <b>${ops}</b> hash operations: ${pairs.length} to build, ${pairs.length} to find the apex, and ${chain.length} Map probes on the way down (${chain.length - 1} hop${chain.length === 2 ? "" : "s"} plus the one that found nothing). Nothing was ever searched.`,
    { focus: "ret", done: true, result: `[${chain.join(", ")}]`, ret: { value: `[${chain.join(", ")}]` } });
  return steps;
}

export default {
  n: 357, id: "foodchain", title: "Food Chain", dates: ["2026-08-02"],
  statement: `Given an array of <code class="inl">[predator, prey]</code> pairs, return the food chain from the apex predator down to the bottom, as an array of strings. The apex predator is the one animal that is <b>never prey</b> to another. <span class="rule">The pairs are not guaranteed to arrive in chain order — e.g. <code class="inl">getFoodChain([["rabbit","grass"],["fox","rabbit"],["eagle","fox"]])</code> → <code class="inl">["eagle","fox","rabbit","grass"]</code>.</span>`,
  // Grouped by approach: each approach is [editable demo] → [step through], paired
  // by tone. Both demos share the same pair editor, so the identical input can be
  // handed to either one and the op counters compared.
  variants: [
    { name: "Rescan for every link", tone: "brute", cost: "O(n²)",
      approach: `Remember nothing. To find the apex, take each name in turn and <b>re-read the entire pairs array</b> to see whether it ever shows up as prey. Then, for every rung of the ladder, <b>re-read the entire array again</b> looking for a predator with that name. Correct — it passes all five official tests — but it re-learns the same list <code class="inl">chain.length + 1</code> times, and because each scan restarts at pair 1, the bill depends on the <i>order</i> the pairs happen to be in. Press <b>⇅ reverse</b> on the savanna preset to watch the counter swing between 52 and 87 for an answer that never changes.`,
      code: CODE_BRUTE, mount: (host) => mountApproach(host, "brute") },
    { name: "Step: rescan", tone: "brute", cost: "rescan count",
      approach: `A debugger for the re-scan — watch the <code class="inl">pairs</code> struct sit there unchanged while the cursor walks it end to end, over and over: once per rejected apex candidate, then once per link. The running comparison count in each note is the thing to watch. Case 4 is the short savanna cut, listed bottom-up so every scan has to run the full length. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: DBG_INPUT }) },
    { name: "Prey set + predator map", tone: "opt", cost: "O(n)",
      approach: `One pass over the pairs fills two lookups: a <code class="inl">Set</code> of every name that appears as prey, and a <code class="inl">Map</code> from each predator to what it eats. The apex is then the one name <i>missing</i> from the Set, and each rung below it is a single <code class="inl">preyOf.get(cur)</code>. Total work is <code class="inl">2n + links + 1</code> — and, unlike the re-scan, that number is the same however the pairs are shuffled, because no step ever searches.`,
      code: CODE_OPT, mount: (host) => mountApproach(host, "opt") },
    { name: "Step: map lookup", tone: "opt", cost: "hash ops",
      approach: `A debugger for the lookup build — watch <code class="inl">preyOf</code> and <code class="inl">isPrey</code> fill up on the single pass through the pairs, then the apex fall out of one <code class="inl">isPrey.has</code> miss and the chain grow one <code class="inl">preyOf.get</code> hop at a time. Run case 4 here and in <b>Step: rescan</b> back to back: same four pairs, same answer, 13 hash operations against 27 pair comparisons. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: DBG_INPUT }) },
  ],
};
