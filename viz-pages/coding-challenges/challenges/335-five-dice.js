// #335 · Five Dice — count values, read the shape, name the best hand.
// Tally each value, sort the counts descending, and a strongest-first cascade
// names the hand; straights only live in the all-distinct [1,1,1,1,1] shape.
import { el, esc, mountDebugger } from "../shared.js";

// Ranked lowest → highest (freeCodeCamp order).
const LADDER = [
  "no pair", "pair", "two pair", "three of a kind",
  "small straight", "large straight", "full house",
  "four of a kind", "five of a kind",
];

// Pip layout on a 3×3 grid (row-major indices 0–8) for each face 1–6.
const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

const PRESETS = [
  [1, 1, 1, 1, 1], [5, 5, 5, 6, 5], [2, 5, 6, 4, 3], [4, 3, 3, 3, 1],
  [4, 6, 2, 6, 5], [1, 4, 5, 6, 2], [1, 3, 4, 6, 2], [2, 2, 5, 2, 5], [6, 4, 5, 6, 4],
];

// Longest run of consecutive values in a sorted, de-duplicated list.
function longestRun(distinctSorted) {
  let best = 1, run = 1;
  for (let i = 1; i < distinctSorted.length; i++) {
    if (distinctSorted[i] === distinctSorted[i - 1] + 1) { run++; if (run > best) best = run; }
    else run = 1;
  }
  return best;
}

function evalHand(dice) {
  const counts = {};
  for (const d of dice) counts[d] = (counts[d] || 0) + 1;
  const sortedCounts = Object.values(counts).sort((a, b) => b - a);
  const distinctSorted = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const allDistinct = distinctSorted.length === 5;
  const run = allDistinct ? longestRun(distinctSorted) : 0;
  const isLarge = run === 5, isSmall = run === 4;

  let name;
  if (sortedCounts[0] === 5) name = "five of a kind";
  else if (sortedCounts[0] === 4) name = "four of a kind";
  else if (sortedCounts[0] === 3 && sortedCounts[1] === 2) name = "full house";
  else if (sortedCounts[0] === 3) name = "three of a kind";
  else if (sortedCounts[0] === 2 && sortedCounts[1] === 2) name = "two pair";
  else if (sortedCounts[0] === 2) name = "pair";
  else if (isLarge) name = "large straight";
  else if (isSmall) name = "small straight";
  else name = "no pair";

  return { counts, sortedCounts, isLarge, isSmall, name };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .dice-row { display:flex; gap:12px; flex-wrap:wrap; margin:2px 0 4px; }
    .dice-die { width:60px; height:60px; border-radius:12px; background:#f4f6fb; border:1px solid #c9d1d9;
                display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr);
                padding:9px; gap:2px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.25); position:relative; }
    .dice-die:hover { border-color:var(--accent); }
    .dice-cell { display:flex; align-items:center; justify-content:center; }
    .dice-pip { width:11px; height:11px; border-radius:50%; background:#11151c; }
    .dice-die .hint { position:absolute; bottom:-16px; left:0; right:0; text-align:center;
                      font:600 9px var(--sans); color:var(--muted); letter-spacing:.03em; opacity:0; }
    .dice-die:hover .hint { opacity:1; }
    .dice-tally { display:flex; gap:6px; flex-wrap:wrap; margin:20px 0 4px; }
    .dice-t { border:1px solid var(--border); border-radius:7px; padding:4px 9px; background:var(--panel-2);
              font:700 13px var(--mono); color:var(--muted); display:inline-flex; align-items:baseline; gap:5px; }
    .dice-t b { color:var(--accent); font-size:15px; }
    .dice-t.pair { border-color:var(--accent); color:var(--text); }
    .dice-badge { display:inline-flex; align-items:center; gap:8px; margin:10px 0 2px; padding:7px 14px;
                  border-radius:999px; background:color-mix(in srgb,var(--good) 15%,transparent);
                  border:1px solid var(--good); color:var(--good); font:800 15px var(--sans); letter-spacing:.02em; }
    .dice-badge .lbl { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; opacity:.7; }
  `));
}

function dieFace(v) {
  const set = new Set(PIPS[v] || []);
  const cells = Array.from({ length: 9 }, (_, i) =>
    `<div class="dice-cell">${set.has(i) ? '<div class="dice-pip"></div>' : ""}</div>`).join("");
  return `${cells}<div class="hint">click +1</div>`;
}

function mount(host) {
  ensureStyle();
  let dice = [4, 6, 2, 6, 5];

  const row = el("div", "dice-row");
  const ctl = el("div", "controls"); ctl.style.marginTop = "14px";
  const roll = el("button", "chip", "🎲 Roll");
  roll.onclick = () => { dice = dice.map(() => 1 + Math.floor(Math.random() * 6)); render(); };
  ctl.append(roll);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => { const c = el("button", "chip", p.join(" ")); c.onclick = () => { dice = p.slice(); render(); }; pre.append(c); });
  const out = el("div");
  host.append(el("div", "note", "Click a die to bump its value (wraps 6 → 1), press <b>Roll</b>, or load a preset hand."), row, ctl, pre, out);
  render();

  function render() {
    row.innerHTML = "";
    dice.forEach((v, i) => {
      const d = el("div", "dice-die"); d.innerHTML = dieFace(v);
      d.onclick = () => { dice[i] = (dice[i] % 6) + 1; render(); };
      row.append(d);
    });

    const r = evalHand(dice);
    out.innerHTML = "";
    const tally = el("div", "dice-tally");
    for (let v = 1; v <= 6; v++) {
      const n = r.counts[v] || 0;
      if (!n) continue;
      tally.append(el("span", "dice-t" + (n >= 2 ? " pair" : ""), `${v} <b>×${n}</b>`));
    }
    out.append(el("div", "dice-slbl", `<span style="font:700 10px var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--muted)">Value tally · counts ${JSON.stringify(r.sortedCounts)}</span>`));
    out.append(tally);
    out.append(el("div", null, `<span class="dice-badge"><span class="lbl">best hand</span>${esc(r.name)}</span>`));

    const lad = el("div", "ladder");
    LADDER.slice().reverse().forEach((h) => {
      const rung = el("div", "rung" + (h === r.name ? " on" : ""));
      rung.innerHTML = `<span>${h}</span>${h === r.name ? '<span>◀ best</span>' : '<span class="v"></span>'}`;
      lad.append(rung);
    });
    out.append(lad);
  }
}

// ── STEP — the classifier line-by-line (single call frame) ────────────────────
// Preset-index picks one of the curated test hands; each lands on a different
// rung. counts/sortedCounts/isStraight enter the frame only once assigned.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">fiveDice</span>(<span class="tok" data-t="dice">dice</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="counts">counts = {}; <span class="k">for</span> (<span class="k">const</span> d <span class="k">of</span> dice) counts[d] = (counts[d] ?? 0) + 1</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="sc"><span class="fn">Object</span>.values(counts).<span class="fn">sort</span>((a, b) =&gt; b - a)</span> =&gt; sortedCounts;` },
  { ln: 4,  html: `  <span class="k">const</span> <span class="tok" data-t="straight">isStraight = 5 distinct values in a row (span 4)</span>;` },
  { ln: 5,  html: `  <span class="k">if</span> (<span class="tok" data-t="c5">sortedCounts[0] === 5</span>) <span class="k">return</span> <span class="st">"five of a kind"</span>;` },
  { ln: 6,  html: `  <span class="k">if</span> (<span class="tok" data-t="c4">sortedCounts[0] === 4</span>) <span class="k">return</span> <span class="st">"four of a kind"</span>;` },
  { ln: 7,  html: `  <span class="k">if</span> (<span class="tok" data-t="fh">sortedCounts[0] === 3 &amp;&amp; sortedCounts[1] === 2</span>) <span class="k">return</span> <span class="st">"full house"</span>;` },
  { ln: 8,  html: `  <span class="k">if</span> (<span class="tok" data-t="c3">sortedCounts[0] === 3</span>) <span class="k">return</span> <span class="st">"three of a kind"</span>;` },
  { ln: 9,  html: `  <span class="k">if</span> (<span class="tok" data-t="tp">sortedCounts[0] === 2 &amp;&amp; sortedCounts[1] === 2</span>) <span class="k">return</span> <span class="st">"two pair"</span>;` },
  { ln: 10, html: `  <span class="k">if</span> (<span class="tok" data-t="c2">sortedCounts[0] === 2</span>) <span class="k">return</span> <span class="st">"pair"</span>;` },
  { ln: 11, html: `  <span class="k">if</span> (<span class="tok" data-t="lg">isStraight === "large"</span>) <span class="k">return</span> <span class="st">"large straight"</span>;` },
  { ln: 12, html: `  <span class="k">if</span> (<span class="tok" data-t="sm">isStraight === "small"</span>) <span class="k">return</span> <span class="st">"small straight"</span>;` },
  { ln: 13, html: `  <span class="k">return</span> <span class="st">"no pair"</span>;` },
  { ln: 14, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(PRESETS.length, caseIndex | 0));
  const dice = PRESETS[k - 1];
  const r = evalHand(dice);
  const straightKind = r.isLarge ? "large" : r.isSmall ? "small" : "none";
  const steps = [];
  let counts, sortedCounts, isStraight;

  const live = () => {
    const v = { dice: `[${dice.join(",")}]` };
    if (counts !== undefined) v.counts = counts;
    if (sortedCounts !== undefined) v.sortedCounts = `[${sortedCounts.join(",")}]`;
    if (isStraight !== undefined) v.isStraight = isStraight;
    return v;
  };
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
    frames: [{ title: "fiveDice", vars: live(), changed: x.changed || [], ret: x.ret }],
  });
  const finish = (nm, line, note, focus) => { S(line, note, { focus, done: true, result: nm, ret: { value: nm } }); return steps; };

  S(1, `Call <b>fiveDice([${dice.join(", ")}])</b>. Roll five dice down to a shape, then read off the best hand.`, { focus: "dice", changed: ["dice"] });

  counts = "{" + Object.entries(r.counts).map(([v, n]) => `${v}:${n}`).join(", ") + "}";
  S(2, `Tally how many times each value appears → <b>counts = ${counts}</b>. This is the whole hand boiled down to per-value multiplicities.`, { focus: "counts", changed: ["counts"] });

  sortedCounts = r.sortedCounts;
  S(3, `Take just the counts and sort them largest-first → <b>sortedCounts = [${sortedCounts.join(",")}]</b>. This shape alone names every hand except the straights: <code>[3,2]</code> full house, <code>[2,2,1]</code> two pair, <code>[1,1,1,1,1]</code> all different.`, { focus: "sc", changed: ["sortedCounts"] });

  isStraight = straightKind;
  const allDistinct = sortedCounts[0] === 1;
  S(4, `<b>isStraight</b>: only possible when all five differ (shape <code>[1,1,1,1,1]</code>). ${allDistinct ? `The distinct values ${JSON.stringify(Object.keys(r.counts).map(Number).sort((a, b) => a - b))} form ${straightKind === "large" ? "five in a row → <b>large</b>" : straightKind === "small" ? "a four-long run → <b>small</b>" : "no four-long run → <b>none</b>"}` : `here the dice repeat, so no straight is possible → <b>none</b>`}.`, { focus: "straight", changed: ["isStraight"], eval: { expr: "consecutive run", val: straightKind !== "none" } });

  // Strongest-first cascade — the first matching check returns.
  const c5 = sortedCounts[0] === 5;
  S(5, `Walk the shape strongest-first. <b>sortedCounts[0] === 5</b>? → <b>${c5}</b>.`, { focus: "c5", eval: { expr: `sortedCounts[0] (${sortedCounts[0]}) === 5`, val: c5 } });
  if (c5) return finish("five of a kind", 5, `All five dice share one value — <b>five of a kind</b>. <b>Return "five of a kind"</b>.`, "c5");

  const c4 = sortedCounts[0] === 4;
  S(6, `<b>sortedCounts[0] === 4</b>? → <b>${c4}</b>.`, { focus: "c4", eval: { expr: `sortedCounts[0] (${sortedCounts[0]}) === 4`, val: c4 } });
  if (c4) return finish("four of a kind", 6, `Four dice match — <b>four of a kind</b>. <b>Return "four of a kind"</b>.`, "c4");

  const fh = sortedCounts[0] === 3 && sortedCounts[1] === 2;
  S(7, `<b>sortedCounts[0] === 3 && sortedCounts[1] === 2</b> — trips plus a pair? → <b>${fh}</b>.`, { focus: "fh", eval: { expr: `shape is [3,2]`, val: fh } });
  if (fh) return finish("full house", 7, `Three of one value and two of another — a <b>full house</b>. <b>Return "full house"</b>.`, "fh");

  const c3 = sortedCounts[0] === 3;
  S(8, `<b>sortedCounts[0] === 3</b> — three matching, rest unpaired? → <b>${c3}</b>.`, { focus: "c3", eval: { expr: `sortedCounts[0] (${sortedCounts[0]}) === 3`, val: c3 } });
  if (c3) return finish("three of a kind", 8, `Exactly three share a value — <b>three of a kind</b>. <b>Return "three of a kind"</b>.`, "c3");

  const tp = sortedCounts[0] === 2 && sortedCounts[1] === 2;
  S(9, `<b>sortedCounts[0] === 2 && sortedCounts[1] === 2</b> — two separate pairs? → <b>${tp}</b>.`, { focus: "tp", eval: { expr: `shape is [2,2,1]`, val: tp } });
  if (tp) return finish("two pair", 9, `Two distinct pairs — <b>two pair</b>. <b>Return "two pair"</b>.`, "tp");

  const c2 = sortedCounts[0] === 2;
  S(10, `<b>sortedCounts[0] === 2</b> — a single pair? → <b>${c2}</b>.`, { focus: "c2", eval: { expr: `sortedCounts[0] (${sortedCounts[0]}) === 2`, val: c2 } });
  if (c2) return finish("pair", 10, `Just one pair, nothing better — <b>pair</b>. <b>Return "pair"</b>.`, "c2");

  const lg = straightKind === "large";
  S(11, `Five distinct values now — is it a <b>large straight</b> (all five in a row)? → <b>${lg}</b>.`, { focus: "lg", eval: { expr: `isStraight === "large"`, val: lg } });
  if (lg) return finish("large straight", 11, `Five consecutive values — a <b>large straight</b>. <b>Return "large straight"</b>.`, "lg");

  const sm = straightKind === "small";
  S(12, `Is it a <b>small straight</b> (four in a row)? → <b>${sm}</b>.`, { focus: "sm", eval: { expr: `isStraight === "small"`, val: sm } });
  if (sm) return finish("small straight", 12, `Four consecutive values among the five — a <b>small straight</b>. <b>Return "small straight"</b>.`, "sm");

  return finish("no pair", 13, `No repeats and no run of four — the hand is only <b>no pair</b>. <b>Return "no pair"</b>.`);
}

export default {
  n: 335, id: "fivedice", title: "Five Dice", dates: ["2026-07-11"],
  statement: `Given an array of five dice with values 1–6, return the best possible hand — ranked lowest to highest: <b>no pair</b>, <b>pair</b>, <b>two pair</b>, <b>three of a kind</b>, <b>small straight</b> (four consecutive), <b>large straight</b> (five consecutive), <b>full house</b>, <b>four of a kind</b>, <b>five of a kind</b>. <span class="rule">Example: <code class="inl">fiveDice([2, 2, 5, 2, 5])</code> → <b>"full house"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 5 dice",
      approach: `Tally each value into <code class='inl'>counts</code>, then sort those counts largest-first. That single shape names almost every hand: <code class='inl'>[5]</code> five of a kind, <code class='inl'>[3,2]</code> full house, <code class='inl'>[2,2,1]</code> two pair. Straights only occur in the all-different <code class='inl'>[1,1,1,1,1]</code> shape, so they're checked last — five-in-a-row is large, four-in-a-row is small, otherwise no pair.`,
      code: `// Boil five dice down to their sorted value-counts, then read the rank.
function fiveDice(dice: number[]): string {
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;
  const sortedCounts = Object.values(counts).sort((a, b) => b - a);

  // A straight is only possible when all five values differ.
  const vals = Object.keys(counts).map(Number).sort((a, b) => a - b);
  let run = 1, best = 1;
  for (let i = 1; i < vals.length; i++)
    run = vals[i] === vals[i - 1] + 1 ? (best = Math.max(best, run + 1), run + 1) : 1;
  const isLarge = vals.length === 5 && best === 5;
  const isSmall = vals.length === 5 && best === 4;

  if (sortedCounts[0] === 5) return "five of a kind";
  if (sortedCounts[0] === 4) return "four of a kind";
  if (sortedCounts[0] === 3 && sortedCounts[1] === 2) return "full house";
  if (sortedCounts[0] === 3) return "three of a kind";
  if (sortedCounts[0] === 2 && sortedCounts[1] === 2) return "two pair";
  if (sortedCounts[0] === 2) return "pair";
  if (isLarge) return "large straight";
  if (isSmall) return "small straight";
  return "no pair";
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the classifier — watch five dice collapse into a <code class='inl'>counts</code> map, then a <code class='inl'>sortedCounts</code> shape plus the <b>isStraight</b> flag, then a strongest-first ladder of <code class='inl'>if</code> checks pick the rank and the first match returns. Pick a hand, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "hand =", value: 8, min: 1, max: PRESETS.length, presets: [1, 2, 3, 4, 5, 6, 7, 8, 9], hint: "1–9: pick a test hand" } }),
    },
  ],
};
