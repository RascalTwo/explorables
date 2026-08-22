// #293 · Best Hand — five cards collapse to a group SHAPE plus two flags.
// • BRUTE — for every card, rescan all five to count how many share its rank;
//   then rescan every pair again for the flush and for distinctness; then rescan
//   again for each rung of a possible run. Nothing learned on one pass is kept
//   for the next, so the same five cards get re-read a dozen times over.
// • OPT   — one map/Set/sort pass reduces the hand to `groups` (e.g. [3,2] = full
//   house) plus a `flush` and a `straight` flag; a strongest-first cascade of
//   `if`s reads the rank straight off that shape.
// Flip the Approach toggle on preset 8, the ace-low "As 2h 3d 4c 5h" straight,
// to watch 109 rank/suit comparisons collapse to 27 on identical input — the
// widest gap of the ten official cases. It's the wheel that does it: the brute
// has to probe two different run bases card-by-card, while sorting once turns
// the whole question into one subtraction and one string compare.
import { el, esc, mountDebugger } from "../shared.js";

const RANKS = "23456789TJQKA";       // index 0 = 2 … index 12 = A
const SUITS = "hdcs";
const SUIT = { h: "♥", d: "♦", c: "♣", s: "♠" }, RED = { h: 1, d: 1 };
const HANDS = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];

// PROVENANCE — these are the 10 official freeCodeCamp test cases for daily
// challenge #293, verbatim and in the order the challenge publishes them.
// They are the complete preset set for BOTH demos and BOTH step-throughs.
// No pedagogical extras are needed here: the official ten already land on ten
// DIFFERENT rungs of the ladder (every hand name exactly once), and they
// already contain the two nasty edge cases — the A-2-3-4-5 "wheel" where the
// ace plays low (#8) and Royal vs ordinary Straight Flush (#10 vs #6).
const CASES = [
  { cards: ["7s", "7h", "7d", "2c", "5h"], want: "Three of a Kind" },
  { cards: ["Ks", "Kh", "Kd", "4s", "4h"], want: "Full House" },
  { cards: ["2h", "5h", "7h", "9h", "Jh"], want: "Flush" },
  { cards: ["As", "Ah", "Ad", "Ac", "Kh"], want: "Four of a Kind" },
  { cards: ["Ts", "Th", "9d", "9c", "8h"], want: "Two Pair" },
  { cards: ["9c", "8c", "7c", "6c", "5c"], want: "Straight Flush" },
  { cards: ["As", "Kh", "Jd", "8c", "5h"], want: "High Card" },
  { cards: ["As", "2h", "3d", "4c", "5h"], want: "Straight" },
  { cards: ["Ts", "Th", "7c", "6d", "5h"], want: "Pair" },
  { cards: ["As", "Ks", "Qs", "Js", "Ts"], want: "Royal Flush" },
];

// ── The two evaluators ──────────────────────────────────────────────────────
// Both return the identical { name, groups, flush, straight } for every input;
// only `comps` (rank/suit comparisons actually performed) differs. That counter
// is the whole point of the pairing, so it is threaded through both.

// BRUTE — no reduction, no memory. Count each rank by rescanning the hand, find
// the flush and the distinctness by comparing every ordered pair, and test a run
// by asking "is this value present?" five times per candidate base.
function evalBrute(cards) {
  let comps = 0;
  const val = (c) => RANKS.indexOf(c[0]);

  // For EVERY card, rescan ALL five counting how many share its rank. Cards of
  // the same rank each redo the identical sweep; `first` keeps only the earliest
  // one's count so `groups` gets one entry per distinct rank.
  const groups = [];
  for (let i = 0; i < 5; i++) {
    let count = 0, first = true;
    for (let j = 0; j < 5; j++) {
      comps++;
      if (cards[j][0] === cards[i][0]) { count++; if (j < i) first = false; }
    }
    if (first) groups.push(count);
  }
  groups.sort((a, b) => b - a);

  // Two more full n² sweeps — one comparison of each kind per ordered pair.
  let flush = true, distinct = true;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    comps += 2;
    if (cards[i][1] !== cards[j][1]) flush = false;
    if (i !== j && val(cards[i]) === val(cards[j])) distinct = false;
  }

  // A run is tested by presence: five `has` calls per base, each a fresh scan.
  // Base −1 is the ace-low wheel — has(-1) asks for an ace, then 2,3,4,5.
  const has = (v) => cards.some((c) => { comps++; return val(c) === (v < 0 ? 12 : v); });
  const runFrom = (b) => [0, 1, 2, 3, 4].every((d) => has(b + d));
  const low = Math.min(...cards.map(val));
  const straight = distinct && (runFrom(low) || runFrom(-1));

  let name = "High Card";
  if (straight && flush) name = low === 8 ? "Royal Flush" : "Straight Flush";
  else if (groups[0] === 4) name = "Four of a Kind";
  else if (groups[0] === 3 && groups[1] === 2) name = "Full House";
  else if (flush) name = "Flush";
  else if (straight) name = "Straight";
  else if (groups[0] === 3) name = "Three of a Kind";
  else if (groups[0] === 2 && groups[1] === 2) name = "Two Pair";
  else if (groups[0] === 2) name = "Pair";
  return { name, groups, flush, straight, comps };
}

// OPT — reduce first, decide second. Sort the rank indices once so runs and
// repeats line up by position, collapse them to a sorted group shape, and read
// the rank off that shape plus two booleans.
function evalOpt(cards) {
  let comps = 0;
  const values = cards.map(c => RANKS.indexOf(c[0])).sort((a, b) => a - b);
  const suits = cards.map(c => c[1]);
  const groups = [...new Set(values)]
    .map(v => values.filter(x => { comps++; return x === v; }).length)
    .sort((a, b) => b - a);
  const flush = suits.every(s => { comps++; return s === suits[0]; });
  const distinct = new Set(values).size === 5;          // hashed, not compared
  const straight = distinct && (
    values[4] - values[0] === 4 ||                       // ordinary run
    values.join() === "0,1,2,3,12"                       // A-2-3-4-5 (ace low)
  );
  let name = "High Card";
  if (straight && flush) name = values[0] === 8 ? "Royal Flush" : "Straight Flush";
  else if (groups[0] === 4) name = "Four of a Kind";
  else if (groups[0] === 3 && groups[1] === 2) name = "Full House";
  else if (flush) name = "Flush";
  else if (straight) name = "Straight";
  else if (groups[0] === 3) name = "Three of a Kind";
  else if (groups[0] === 2 && groups[1] === 2) name = "Two Pair";
  else if (groups[0] === 2) name = "Pair";
  return { name, groups, flush, straight, comps };
}

// ── Module-scoped styles (design system first; only the card-editor affordances
// and the two-counter bar are bespoke). .hand/.pcard/.ladder/.rung/.opcount all
// come from the kit and are reused untouched.
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bh-card { cursor:pointer; user-select:none; position:relative; transition:transform .1s, border-color .1s; }
    .bh-card:hover { border-color:var(--accent); transform:translateY(-3px); }
    .bh-half { flex:1; display:flex; align-items:center; justify-content:center; width:100%; border-radius:5px; }
    .bh-half:hover { background:color-mix(in srgb, var(--accent) 22%, transparent); }
    .bh-card .hint { position:absolute; bottom:-15px; left:0; right:0; text-align:center;
                     font:600 9px var(--sans); color:var(--muted); letter-spacing:.03em; opacity:0; white-space:nowrap; }
    .bh-card:hover .hint { opacity:1; }
    .bh-bar { display:flex; align-items:center; gap:18px; flex-wrap:wrap; margin:24px 0 10px; }
    .bh-bar .opcount.dim { opacity:.42; }
    .bh-bar .mark { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--accent); }
    .bh-badge { display:inline-flex; align-items:center; gap:8px; margin:8px 0 2px; padding:7px 14px;
                border-radius:999px; background:color-mix(in srgb,var(--good) 15%,transparent);
                border:1px solid var(--good); color:var(--good); font:800 15px var(--sans); }
    .bh-badge .lbl { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; opacity:.7; }
    .bh-dup { color:var(--warn); font:12.5px var(--mono); margin-top:6px; }
  `));
}

const handStr = (cards) => cards.join(" ");

// ── The demos — one builder, two evaluators ─────────────────────────────────
// The user OWNS the hand: click a card's top half to cycle its rank, the bottom
// half to cycle its suit, hit Deal for a random hand, or load an official case.
// Both counters are always on screen; the active approach's is lit and the other
// dimmed, so the brute/opt gap is visible without leaving the tab.
function makeMount(mode) {
  const evalHand = mode === "brute" ? evalBrute : evalOpt;
  return function mount(host) {
    ensureStyle();
    let cards = CASES[7].cards.slice();   // ace-low wheel — the widest brute/opt gap

    const row = el("div", "hand");
    const ctl = el("div", "controls"); ctl.style.marginTop = "20px";
    const deal = el("button", "chip", "🂠 Deal");
    deal.onclick = () => {
      const deck = [];
      for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
      cards = [];
      while (cards.length < 5) {
        const pick = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
        cards.push(pick);
      }
      render();
    };
    ctl.append(deal);

    const pre = el("div", "controls");
    CASES.forEach(({ cards: c, want }) => {
      const chip = el("button", "chip", handStr(c));
      chip.title = `official case → ${want}`;
      chip.onclick = () => { cards = c.slice(); render(); };
      pre.append(chip);
    });

    const out = el("div");
    host.append(
      el("div", "note", "Click a card's <b>top half</b> to cycle its rank (2…A), its <b>bottom half</b> to cycle its suit (♥♦♣♠). Or press <b>Deal</b>, or load one of the ten official test hands below."),
      row, ctl, pre, out);
    render();

    function render() {
      row.innerHTML = "";
      cards.forEach((c, i) => {
        const pc = el("div", "pcard bh-card" + (RED[c[1]] ? " red" : ""));
        const rankHalf = el("div", "bh-half", c[0]);
        const suitHalf = el("div", "bh-half s", SUIT[c[1]]);
        rankHalf.onclick = () => { cards[i] = RANKS[(RANKS.indexOf(c[0]) + 1) % 13] + c[1]; render(); };
        suitHalf.onclick = () => { cards[i] = c[0] + SUITS[(SUITS.indexOf(c[1]) + 1) % 4]; render(); };
        pc.append(rankHalf, suitHalf, el("div", "hint", "rank ▲ / suit ▼"));
        row.append(pc);
      });

      const r = evalHand(cards);
      const other = (mode === "brute" ? evalOpt : evalBrute)(cards);
      const official = CASES.find(x => handStr(x.cards) === handStr(cards));
      out.innerHTML = "";

      out.append(el("div", "result-line",
        `<span class="tag">groups ${JSON.stringify(r.groups)}</span>` +
        `<span class="tag" style="border-color:${r.flush ? "var(--good)" : "var(--border)"}">flush ${r.flush ? "✓" : "✗"}</span>` +
        `<span class="tag" style="border-color:${r.straight ? "var(--good)" : "var(--border)"}">straight ${r.straight ? "✓" : "✗"}</span>`));

      out.append(el("div", null, `<span class="bh-badge"><span class="lbl">best hand</span>${esc(r.name)}</span>`));

      if (official) {
        out.append(el("div", null,
          `<span class="badge ${official.want === r.name ? "ok" : "no"}">official case · expected "${esc(official.want)}" ${official.want === r.name ? "✓" : "✗"}</span>`));
      }
      const dupes = cards.length - new Set(cards).size;
      if (dupes) out.append(el("div", "bh-dup", `⚠ ${dupes} duplicate card${dupes > 1 ? "s" : ""} — a real deck can't deal this, but the classifier still runs.`));

      // Both counters, every time — the divergence IS the lesson.
      const bar = el("div", "bh-bar");
      const mk = (label, n, cls, active) => {
        const oc = el("span", "opcount " + cls + (active ? "" : " dim"));
        oc.append(el("span", "n", String(n)), document.createTextNode(" " + label));
        if (active) oc.append(el("span", "mark", "◀ this approach"));
        return oc;
      };
      bar.append(
        mk("rescan comparisons", mode === "brute" ? r.comps : other.comps, "hot", mode === "brute"),
        mk("reduction comparisons", mode === "opt" ? r.comps : other.comps, "cool", mode === "opt"));
      out.append(bar);

      const lad = el("div", "ladder");
      HANDS.slice().reverse().forEach(h => {
        const rung = el("div", "rung" + (h === r.name ? " on" : ""));
        rung.innerHTML = `<span>${h}</span>${h === r.name ? "<span>◀ best</span>" : '<span class="v"></span>'}`;
        lad.append(rung);
      });
      out.append(lad);
    }
  };
}

const mountBrute = makeMount("brute");
const mountOpt = makeMount("opt");

// ── Shared trace plumbing ───────────────────────────────────────────────────
// Both step-throughs take a 1-based preset index into CASES and share the
// scope-by-omission idiom: a variable is added to the frame only once the line
// that declares it has run, so nothing ever renders as `undefined`.
const pickCase = (caseIndex) => CASES[Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1))] || CASES[0];
const STEP_INPUT = { label: "hand =", value: 8, min: 1, max: CASES.length, presets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], hint: "1–10: the ten official cases" };

// ── STEP (brute) — the rescans, one comparison at a time ─────────────────────
// Paired with "Count each rank by rescanning": watch the SAME five cards get
// re-read from index 0 for every card (25 rank comparisons where 5 tallies
// would do), then re-read again for flush + distinctness, then again per rung of
// the run test. `comps` sits in the frame so the waste is countable, not just
// asserted. On preset 8 (the ace-low wheel) it ends at 109 vs the optimized 27.
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getBestHand</span>(<span class="tok" data-t="cards">cards</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> val = (c) =&gt; RANKS.<span class="fn">indexOf</span>(c[0]);` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="groups">groups = []</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="i">i = 0; i &lt; 5</span>; i++) {` },
  { ln: 5,  html: `    <span class="k">let</span> <span class="tok" data-t="cnt">count = 0, first = <span class="k">true</span></span>;` },
  { ln: 6,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="rescan">j = 0; j &lt; 5</span>; j++) {  <span class="cm">// rescan ALL five</span>` },
  { ln: 7,  html: `      <span class="k">if</span> (<span class="tok" data-t="cmp">cards[j][0] === cards[i][0]</span>) { count++; <span class="k">if</span> (j &lt; i) first = <span class="k">false</span>; }` },
  { ln: 8,  html: `    }` },
  { ln: 9,  html: `    <span class="k">if</span> (<span class="tok" data-t="push">first</span>) groups.<span class="fn">push</span>(count);  <span class="cm">// one entry per distinct rank</span>` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  groups.<span class="tok" data-t="sort"><span class="fn">sort</span>((a, b) =&gt; b - a)</span>;` },
  { ln: 12, html: `  <span class="k">let</span> flush = <span class="k">true</span>, distinct = <span class="k">true</span>;` },
  { ln: 13, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="pairs">i = 0; i &lt; 5</span>; i++) <span class="k">for</span> (<span class="k">let</span> j = 0; j &lt; 5; j++) {` },
  { ln: 14, html: `    <span class="k">if</span> (<span class="tok" data-t="fl">cards[i][1] !== cards[j][1]</span>) flush = <span class="k">false</span>;` },
  { ln: 15, html: `    <span class="k">if</span> (<span class="tok" data-t="di">i !== j &amp;&amp; val(cards[i]) === val(cards[j])</span>) distinct = <span class="k">false</span>;` },
  { ln: 16, html: `  }` },
  { ln: 17, html: `  <span class="k">const</span> <span class="tok" data-t="has">has = (v) =&gt; cards.<span class="fn">some</span>((c) =&gt; val(c) === (v &lt; 0 ? 12 : v))</span>;` },
  { ln: 18, html: `  <span class="k">const</span> <span class="tok" data-t="run">runFrom = (b) =&gt; [0,1,2,3,4].<span class="fn">every</span>((d) =&gt; <span class="fn">has</span>(b + d))</span>;` },
  { ln: 19, html: `  <span class="k">const</span> <span class="tok" data-t="low">low = <span class="fn">Math</span>.min(...cards.<span class="fn">map</span>(val))</span>;` },
  { ln: 20, html: `  <span class="k">const</span> <span class="tok" data-t="straight">straight = distinct &amp;&amp; (<span class="fn">runFrom</span>(low) || <span class="fn">runFrom</span>(-1))</span>;  <span class="cm">// -1 = ace-low wheel</span>` },
  { ln: 21, html: `  <span class="k">if</span> (<span class="tok" data-t="sf">straight &amp;&amp; flush</span>) <span class="k">return</span> low === 8 ? <span class="st">"Royal Flush"</span> : <span class="st">"Straight Flush"</span>;` },
  { ln: 22, html: `  <span class="k">if</span> (<span class="tok" data-t="g4">groups[0] === 4</span>) <span class="k">return</span> <span class="st">"Four of a Kind"</span>;` },
  { ln: 23, html: `  <span class="k">if</span> (<span class="tok" data-t="fh">groups[0] === 3 &amp;&amp; groups[1] === 2</span>) <span class="k">return</span> <span class="st">"Full House"</span>;` },
  { ln: 24, html: `  <span class="k">if</span> (<span class="tok" data-t="fl2">flush</span>) <span class="k">return</span> <span class="st">"Flush"</span>;` },
  { ln: 25, html: `  <span class="k">if</span> (<span class="tok" data-t="st2">straight</span>) <span class="k">return</span> <span class="st">"Straight"</span>;` },
  { ln: 26, html: `  <span class="k">if</span> (<span class="tok" data-t="g3">groups[0] === 3</span>) <span class="k">return</span> <span class="st">"Three of a Kind"</span>;` },
  { ln: 27, html: `  <span class="k">if</span> (<span class="tok" data-t="tp">groups[0] === 2 &amp;&amp; groups[1] === 2</span>) <span class="k">return</span> <span class="st">"Two Pair"</span>;` },
  { ln: 28, html: `  <span class="k">if</span> (<span class="tok" data-t="g2">groups[0] === 2</span>) <span class="k">return</span> <span class="st">"Pair"</span>;` },
  { ln: 29, html: `  <span class="k">return</span> <span class="st">"High Card"</span>;` },
  { ln: 30, html: `}` },
];

function traceBrute(caseIndex) {
  const c = pickCase(caseIndex);
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const cards = c.cards;
  const val = (x) => RANKS.indexOf(x[0]);
  const steps = [];
  let i, j, count, first, groups, flush, distinct, low, straight, comps = 0;

  // Scope by omission — a name enters the panel only after its declaring line.
  const live = () => {
    const v = { cards: handStr(cards), comps };
    if (groups !== undefined) v.groups = `[${groups.join(",")}]`;
    if (i !== undefined) v.i = i;
    if (j !== undefined) v.j = j;
    if (count !== undefined) v.count = count;
    if (first !== undefined) v.first = String(first);
    if (flush !== undefined) v.flush = String(flush);
    if (distinct !== undefined) v.distinct = String(distinct);
    if (low !== undefined) v.low = low;
    if (straight !== undefined) v.straight = String(straight);
    return v;
  };
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
    frames: [{ title: "getBestHand · brute", vars: live(), changed: x.changed || [], ret: x.ret }],
  });
  const finish = (nm, line, note, focus) => {
    S(line, note, { focus, done: true, result: nm, ret: { value: nm } });
    return steps;
  };

  S(1, `<b>Hand ${k}: ${c.want}.</b> Classify <b>${handStr(cards)}</b> the brute way — no reduction, no memory. Every fact gets recomputed by rescanning the whole hand.`, { focus: "cards", changed: ["cards"] });
  S(2, `<b>val(c)</b> turns a card's rank letter into its index in "${RANKS}" (0 = 2 … 12 = A). It will be called over and over — each call is another look at a card we've already seen.`);

  groups = [];
  S(3, `<b>groups = []</b> — it will end up holding one count per <i>distinct</i> rank, largest first.`, { focus: "groups", changed: ["groups"] });

  // ── Loop 1: for every card, rescan all five counting its rank ──────────────
  for (i = 0; i < 5; i++) {
    count = 0; first = true;
    S(4, `Outer pass <b>i = ${i}</b>: take card <b>${cards[i]}</b> and ask "how many cards share rank <b>${cards[i][0]}</b>?"`, { focus: "i", changed: ["i"] });
    S(5, `Reset the tally — <b>count = 0</b>, <b>first = true</b>. Everything learned on the previous pass is thrown away; that's the brute's defining sin.`, { focus: "cnt", changed: ["count", "first"] });
    S(6, `Start a <b>fresh scan of all five cards from index 0</b> just for <b>${cards[i]}</b>.`, { focus: "rescan" });
    for (j = 0; j < 5; j++) {
      comps++;
      const same = cards[j][0] === cards[i][0];
      if (same) { count++; if (j < i) first = false; }
      S(7, `Compare <b>cards[${j}]</b> rank '${cards[j][0]}' with <b>cards[${i}]</b> rank '${cards[i][0]}' → <b>${same}</b>.${same ? ` count is now <b>${count}</b>${j < i ? ` — and because an earlier card (index ${j}) already had this rank, <b>first = false</b>: this pass is pure duplicated work.` : "."}` : " No match — keep sweeping."} Comparison #<b>${comps}</b>.`,
        { focus: "cmp", changed: same ? ["count", "comps"] : ["comps"], eval: { expr: `'${cards[j][0]}' === '${cards[i][0]}'`, val: same } });
    }
    j = undefined;
    if (first) {
      groups.push(count);
      S(9, `<b>first</b> is true — card ${i} is the earliest of its rank, so record its count: <b>groups = [${groups.join(",")}]</b>.`, { focus: "push", changed: ["groups"] });
    } else {
      S(9, `<b>first</b> is false — an earlier card already recorded rank '${cards[i][0]}'. All ${5} comparisons of this pass are discarded.`, { focus: "push" });
    }
    count = undefined; first = undefined;
  }
  i = undefined;

  groups.sort((a, b) => b - a);
  S(11, `Sort the counts largest-first → <b>groups = [${groups.join(",")}]</b>. Same shape the optimized version reaches, ${comps} comparisons later.`, { focus: "sort", changed: ["groups"] });

  // ── Loop 2: every ordered pair, twice over (flush + distinctness) ──────────
  flush = true; distinct = true;
  S(12, `<b>flush = true</b>, <b>distinct = true</b> — start optimistic and let a counterexample knock each one down.`, { changed: ["flush", "distinct"] });
  for (let a = 0; a < 5; a++) {
    let rowFl = 0, rowDi = 0;
    for (let b = 0; b < 5; b++) {
      comps += 2;
      if (cards[a][1] !== cards[b][1]) { flush = false; rowFl++; }
      if (a !== b && val(cards[a]) === val(cards[b])) { distinct = false; rowDi++; }
    }
    S(13, `Pair sweep row <b>i = ${a}</b> — compare <b>${cards[a]}</b> against all five cards again, testing suit and rank on each. That's 10 more comparisons (total <b>${comps}</b>). ${rowFl ? `${rowFl} suit mismatch${rowFl > 1 ? "es" : ""} → <b>flush = false</b>. ` : "All suits matched so far. "}${rowDi ? `${rowDi} rank collision${rowDi > 1 ? "s" : ""} → <b>distinct = false</b>.` : "No rank collisions in this row."}`,
      { focus: "pairs", changed: ["comps", ...(rowFl ? ["flush"] : []), ...(rowDi ? ["distinct"] : [])] });
  }
  S(16, `Pair sweeps done: <b>flush = ${flush}</b>, <b>distinct = ${distinct}</b>. The optimized version gets both from a single <code>every</code> and a <code>Set</code> size.`, { focus: "di", eval: { expr: `flush = ${flush}, distinct = ${distinct}`, val: flush || distinct } });

  // ── Run tests: five presence scans per candidate base ──────────────────────
  const has = (v) => cards.some((x) => { comps++; return val(x) === (v < 0 ? 12 : v); });
  S(17, `<b>has(v)</b> answers "is a card with value v in the hand?" — by scanning the hand. Again.`, { focus: "has" });
  S(18, `<b>runFrom(b)</b> asks <b>has</b> five times, for b, b+1 … b+4. One call is up to 25 more card reads.`, { focus: "run" });

  low = Math.min(...cards.map(val));
  S(19, `<b>low = ${low}</b> — the lowest rank index in the hand (${RANKS[low]}).`, { focus: "low", changed: ["low"] });

  const ordinary = distinct ? [0, 1, 2, 3, 4].every(d => has(low + d)) : false;
  const wheel = distinct && !ordinary ? [0, 1, 2, 3, 4].every(d => has(-1 + d)) : false;
  straight = distinct && (ordinary || wheel);
  S(20, distinct
    ? `<b>runFrom(${low})</b> → <b>${ordinary}</b>${ordinary ? ` — ${RANKS[low]} through ${RANKS[low + 4]} are all present.` : ` — the run breaks somewhere.`}${!ordinary ? ` Try the ace-low wheel, <b>runFrom(-1)</b> (A,2,3,4,5) → <b>${wheel}</b>.` : ""} So <b>straight = ${straight}</b>. Comparison count is now <b>${comps}</b>.`
    : `<b>distinct</b> is false, so the <code>&&</code> short-circuits — no run test runs at all. <b>straight = false</b>. Comparison count: <b>${comps}</b>.`,
    { focus: "straight", changed: ["straight", "comps"], eval: { expr: distinct ? (ordinary ? `runFrom(${low})` : `runFrom(${low}) || runFrom(-1)`) : "distinct && …", val: straight } });

  // ── Cascade: identical to the optimized version, strongest first ───────────
  const sf = straight && flush;
  S(21, `Now the same strongest-first cascade the optimized version uses. <b>straight && flush</b>? → <b>${sf}</b>.`, { focus: "sf", eval: { expr: "straight && flush", val: sf } });
  if (sf) {
    const royal = low === 8;
    const nm = royal ? "Royal Flush" : "Straight Flush";
    return finish(nm, 21, `A straight flush. Its lowest card is index ${low} ${royal ? "= 8 (a Ten), so the run is T-J-Q-K-A — the top hand, <b>Royal Flush</b>" : "≠ 8, so it's an ordinary <b>Straight Flush</b>"}. <b>Return "${nm}"</b> after <b>${comps}</b> comparisons.`, "sf");
  }

  const g4 = groups[0] === 4;
  S(22, `<b>groups[0] === 4</b> — four cards of one rank? → <b>${g4}</b>.`, { focus: "g4", eval: { expr: `groups[0] (${groups[0]}) === 4`, val: g4 } });
  if (g4) return finish("Four of a Kind", 22, `The biggest group is four — <b>Four of a Kind</b>, at a cost of <b>${comps}</b> comparisons.`, "g4");

  const fh = groups[0] === 3 && groups[1] === 2;
  S(23, `<b>groups[0] === 3 && groups[1] === 2</b> — trips plus a pair? → <b>${fh}</b>.`, { focus: "fh", eval: { expr: "groups is [3,2]", val: fh } });
  if (fh) return finish("Full House", 23, `Three of one rank and two of another — a <b>Full House</b>, after <b>${comps}</b> comparisons.`, "fh");

  S(24, `<b>flush</b>? → <b>${flush}</b>.`, { focus: "fl2", eval: { expr: "flush", val: flush } });
  if (flush) return finish("Flush", 24, `All one suit, no run and no big group — a plain <b>Flush</b>, after <b>${comps}</b> comparisons.`, "fl2");

  S(25, `<b>straight</b>? → <b>${straight}</b>.`, { focus: "st2", eval: { expr: "straight", val: straight } });
  if (straight) return finish("Straight", 25, `Five in a row, mixed suits — a <b>Straight</b>, after <b>${comps}</b> comparisons.`, "st2");

  const g3 = groups[0] === 3;
  S(26, `<b>groups[0] === 3</b> — three of one rank, no second pair? → <b>${g3}</b>.`, { focus: "g3", eval: { expr: `groups[0] (${groups[0]}) === 3`, val: g3 } });
  if (g3) return finish("Three of a Kind", 26, `Three matching, the rest unpaired — <b>Three of a Kind</b>, after <b>${comps}</b> comparisons.`, "g3");

  const tp = groups[0] === 2 && groups[1] === 2;
  S(27, `<b>groups[0] === 2 && groups[1] === 2</b> — two separate pairs? → <b>${tp}</b>.`, { focus: "tp", eval: { expr: "groups is [2,2]", val: tp } });
  if (tp) return finish("Two Pair", 27, `Two distinct pairs — <b>Two Pair</b>, after <b>${comps}</b> comparisons.`, "tp");

  const g2 = groups[0] === 2;
  S(28, `<b>groups[0] === 2</b> — a single pair? → <b>${g2}</b>.`, { focus: "g2", eval: { expr: `groups[0] (${groups[0]}) === 2`, val: g2 } });
  if (g2) return finish("Pair", 28, `Exactly one pair, nothing better — <b>Pair</b>, after <b>${comps}</b> comparisons.`, "g2");

  return finish("High Card", 29, `Every check failed — the hand is worth only its <b>High Card</b>. Note the price: <b>${comps}</b> comparisons to conclude "nothing". The optimized version reaches the same verdict in ${evalOpt(cards).comps}.`);
}

// ── STEP (opt) — the group-shape reduction, line by line ─────────────────────
// Paired with "Group-shape reduction": five cards collapse to a `groups` shape
// plus flush/straight flags, then a strongest-first cascade of ifs names the
// hand and the first match returns. Every cascade check renders its own
// true/false eval panel; a flag enters the frame only once assigned.
const SRC_OPT = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getBestHand</span>(<span class="tok" data-t="cards">cards</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="values">values = cards.<span class="fn">map</span>(c =&gt; RANKS.<span class="fn">indexOf</span>(c[0])).<span class="fn">sort</span>((a, b) =&gt; a - b)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="suits">suits  = cards.<span class="fn">map</span>(c =&gt; c[1])</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> <span class="tok" data-t="groups">groups = [...<span class="k">new</span> <span class="fn">Set</span>(values)].<span class="fn">map</span>(v =&gt; values.<span class="fn">filter</span>(x =&gt; x === v).length).<span class="fn">sort</span>((a, b) =&gt; b - a)</span>;` },
  { ln: 5,  html: `  <span class="k">const</span> <span class="tok" data-t="flush">flush    = suits.<span class="fn">every</span>(s =&gt; s === suits[0])</span>;` },
  { ln: 6,  html: `  <span class="k">const</span> <span class="tok" data-t="distinct">distinct = <span class="k">new</span> <span class="fn">Set</span>(values).size === 5</span>;` },
  { ln: 7,  html: `  <span class="k">const</span> <span class="tok" data-t="straight">straight = distinct &amp;&amp; (values[4] - values[0] === 4 || values.<span class="fn">join</span>() === <span class="st">"0,1,2,3,12"</span>)</span>;` },
  { ln: 8,  html: `  <span class="k">if</span> (<span class="tok" data-t="sf">straight &amp;&amp; flush</span>) <span class="k">return</span> values[0] === 8 ? <span class="st">"Royal Flush"</span> : <span class="st">"Straight Flush"</span>;` },
  { ln: 9,  html: `  <span class="k">if</span> (<span class="tok" data-t="g4">groups[0] === 4</span>) <span class="k">return</span> <span class="st">"Four of a Kind"</span>;` },
  { ln: 10, html: `  <span class="k">if</span> (<span class="tok" data-t="fh">groups[0] === 3 &amp;&amp; groups[1] === 2</span>) <span class="k">return</span> <span class="st">"Full House"</span>;` },
  { ln: 11, html: `  <span class="k">if</span> (<span class="tok" data-t="fl2">flush</span>) <span class="k">return</span> <span class="st">"Flush"</span>;` },
  { ln: 12, html: `  <span class="k">if</span> (<span class="tok" data-t="st2">straight</span>) <span class="k">return</span> <span class="st">"Straight"</span>;` },
  { ln: 13, html: `  <span class="k">if</span> (<span class="tok" data-t="g3">groups[0] === 3</span>) <span class="k">return</span> <span class="st">"Three of a Kind"</span>;` },
  { ln: 14, html: `  <span class="k">if</span> (<span class="tok" data-t="tp">groups[0] === 2 &amp;&amp; groups[1] === 2</span>) <span class="k">return</span> <span class="st">"Two Pair"</span>;` },
  { ln: 15, html: `  <span class="k">if</span> (<span class="tok" data-t="g2">groups[0] === 2</span>) <span class="k">return</span> <span class="st">"Pair"</span>;` },
  { ln: 16, html: `  <span class="k">return</span> <span class="st">"High Card"</span>;` },
  { ln: 17, html: `}` },
];

function traceOpt(caseIndex) {
  const c = pickCase(caseIndex);
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const cards = c.cards;
  const steps = [];
  let values, suits, groups, flush, distinct, straight;
  const comps = evalOpt(cards).comps;

  const live = () => {
    const v = { cards: handStr(cards) };
    if (values !== undefined)   v.values   = `[${values.join(",")}]`;
    if (suits !== undefined)    v.suits    = `[${suits.join(",")}]`;
    if (groups !== undefined)   v.groups   = `[${groups.join(",")}]`;
    if (flush !== undefined)    v.flush    = String(flush);
    if (distinct !== undefined) v.distinct = String(distinct);
    if (straight !== undefined) v.straight = String(straight);
    return v;
  };
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
    frames: [{ title: "getBestHand · opt", vars: live(), changed: x.changed || [], ret: x.ret }],
  });
  const finish = (nm, line, note, focus) => {
    S(line, note, { focus, done: true, result: nm, ret: { value: nm } });
    return steps;
  };

  S(1, `<b>Hand ${k}: ${c.want}.</b> Call <b>getBestHand</b> on <b>${handStr(cards)}</b>. The whole job is to boil five cards down to a few facts, then read off the rank.`, { focus: "cards", changed: ["cards"] });

  values = cards.map(c2 => RANKS.indexOf(c2[0])).sort((a, b) => a - b);
  S(2, `Map each rank letter to its index in "${RANKS}" (0 = 2 … 12 = A) and sort ascending → <b>values = [${values.join(",")}]</b>. Sorting lines up runs and repeats so we can read them by position instead of hunting for them.`, { focus: "values", changed: ["values"] });

  suits = cards.map(c2 => c2[1]);
  S(3, `Pull just the suit letter off each card → <b>suits = [${suits.join(",")}]</b>. These feed the flush test and nothing else.`, { focus: "suits", changed: ["suits"] });

  groups = [...new Set(values)].map(v => values.filter(x => x === v).length).sort((a, b) => b - a);
  S(4, `Take the distinct ranks, count how many cards share each, and sort those counts largest-first → <b>groups = [${groups.join(",")}]</b>. This shape alone names most hands: <code>[4]</code> four of a kind, <code>[3,2]</code> full house, <code>[2,2]</code> two pair, <code>[2]</code> a pair, <code>[1,1,1,1,1]</code> nothing paired.`, { focus: "groups", changed: ["groups"] });

  flush = suits.every(s => s === suits[0]);
  S(5, `<b>flush</b> flag: are all five suits the same as the first? → <b>${flush}</b>. One pass, and <code>every</code> bails at the first mismatch.`, { focus: "flush", changed: ["flush"], eval: { expr: `every suit === "${suits[0]}"`, val: flush } });

  distinct = new Set(values).size === 5;
  S(6, `<b>distinct</b> flag: are all five ranks different? → <b>${distinct}</b>. A <code>Set</code> answers this by hashing — <i>zero</i> comparisons, where the brute burned 25 on the same question. A straight can only exist when all five are distinct.`, { focus: "distinct", changed: ["distinct"], eval: { expr: `${new Set(values).size} distinct ranks === 5`, val: distinct } });

  const runOrdinary = values[4] - values[0] === 4;
  const aceLow = values.join() === "0,1,2,3,12";
  straight = distinct && (runOrdinary || aceLow);
  S(7, `<b>straight</b> flag: five distinct ranks forming a run. Because <b>values</b> is sorted, one subtraction settles it — the high and low must span exactly 4 (${values[4]} − ${values[0]} = ${values[4] - values[0]})${aceLow ? `. Here they don't, but the sorted values read exactly <code>0,1,2,3,12</code> — the A-2-3-4-5 <b>wheel</b>, where the ace plays low` : ``} → <b>${straight}</b>.`, { focus: "straight", changed: ["straight"], eval: { expr: aceLow ? `A-2-3-4-5 wheel (0,1,2,3,12)` : `${values[4]} - ${values[0]} === 4`, val: straight } });

  // Read the rank strongest-first — the first matching if wins and returns.
  const sf = straight && flush;
  S(8, `Now walk the ranks strongest-first; the first match returns. <b>straight && flush</b>? → <b>${sf}</b>.`, { focus: "sf", eval: { expr: "straight && flush", val: sf } });
  if (sf) {
    const royal = values[0] === 8;
    const nm = royal ? "Royal Flush" : "Straight Flush";
    return finish(nm, 8, `A straight flush! Its lowest card is index ${values[0]} ${royal ? "= 8 (a Ten), so it runs T-J-Q-K-A — the top hand, <b>Royal Flush</b>" : "≠ 8, so it's an ordinary <b>Straight Flush</b>"}. <b>Return "${nm}"</b> — total cost <b>${comps}</b> comparisons.`, "sf");
  }

  const g4 = groups[0] === 4;
  S(9, `<b>groups[0] === 4</b> — four cards of one rank? → <b>${g4}</b>.`, { focus: "g4", eval: { expr: `groups[0] (${groups[0]}) === 4`, val: g4 } });
  if (g4) return finish("Four of a Kind", 9, `The biggest group is four — <b>Four of a Kind</b>. <b>Return "Four of a Kind"</b> — total cost <b>${comps}</b> comparisons.`, "g4");

  const fh = groups[0] === 3 && groups[1] === 2;
  S(10, `<b>groups[0] === 3 && groups[1] === 2</b> — trips plus a pair? → <b>${fh}</b>.`, { focus: "fh", eval: { expr: `groups is [3,2]`, val: fh } });
  if (fh) return finish("Full House", 10, `Three of one rank and two of another — a <b>Full House</b>. <b>Return "Full House"</b> — total cost <b>${comps}</b> comparisons.`, "fh");

  S(11, `<b>flush</b>? → <b>${flush}</b>.`, { focus: "fl2", eval: { expr: "flush", val: flush } });
  if (flush) return finish("Flush", 11, `All one suit, but no straight and no big group — a plain <b>Flush</b>. <b>Return "Flush"</b> — total cost <b>${comps}</b> comparisons.`, "fl2");

  S(12, `<b>straight</b>? → <b>${straight}</b>.`, { focus: "st2", eval: { expr: "straight", val: straight } });
  if (straight) return finish("Straight", 12, `Five in a row but mixed suits — a <b>Straight</b>. <b>Return "Straight"</b> — total cost <b>${comps}</b> comparisons.`, "st2");

  const g3 = groups[0] === 3;
  S(13, `<b>groups[0] === 3</b> — three of one rank (with no second pair)? → <b>${g3}</b>.`, { focus: "g3", eval: { expr: `groups[0] (${groups[0]}) === 3`, val: g3 } });
  if (g3) return finish("Three of a Kind", 13, `Three matching, the rest unpaired — <b>Three of a Kind</b>. <b>Return "Three of a Kind"</b> — total cost <b>${comps}</b> comparisons.`, "g3");

  const tp = groups[0] === 2 && groups[1] === 2;
  S(14, `<b>groups[0] === 2 && groups[1] === 2</b> — two separate pairs? → <b>${tp}</b>.`, { focus: "tp", eval: { expr: `groups is [2,2]`, val: tp } });
  if (tp) return finish("Two Pair", 14, `Two distinct pairs — <b>Two Pair</b>. <b>Return "Two Pair"</b> — total cost <b>${comps}</b> comparisons.`, "tp");

  const g2 = groups[0] === 2;
  S(15, `<b>groups[0] === 2</b> — a single pair? → <b>${g2}</b>.`, { focus: "g2", eval: { expr: `groups[0] (${groups[0]}) === 2`, val: g2 } });
  if (g2) return finish("Pair", 15, `Exactly one pair, nothing better — <b>Pair</b>. <b>Return "Pair"</b> — total cost <b>${comps}</b> comparisons.`, "g2");

  return finish("High Card", 16, `Every shape check failed and there's no straight or flush — the hand is worth only its <b>High Card</b>. <b>Return "High Card"</b> — total cost <b>${comps}</b> comparisons, against the brute's ${evalBrute(cards).comps} for the same verdict.`);
}

const CODE_BRUTE = `// No reduction, no memory: rescan the hand for every fact.
const RANKS = "23456789TJQKA";
function getBestHand(cards: string[]): string {
  const val = (c: string) => RANKS.indexOf(c[0]);

  // For EVERY card, rescan ALL five counting how many share its rank.
  const groups: number[] = [];
  for (let i = 0; i < 5; i++) {
    let count = 0, first = true;
    for (let j = 0; j < 5; j++)                          // O(n²) rank comparisons
      if (cards[j][0] === cards[i][0]) { count++; if (j < i) first = false; }
    if (first) groups.push(count);                       // one entry per distinct rank
  }
  groups.sort((a, b) => b - a);

  // Two more full sweeps over every ordered pair.
  let flush = true, distinct = true;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if (cards[i][1] !== cards[j][1]) flush = false;
    if (i !== j && val(cards[i]) === val(cards[j])) distinct = false;
  }

  // And a fresh scan per rung of every candidate run.
  const has = (v: number) => cards.some(c => val(c) === (v < 0 ? 12 : v));
  const runFrom = (b: number) => [0, 1, 2, 3, 4].every(d => has(b + d));
  const low = Math.min(...cards.map(val));
  const straight = distinct && (runFrom(low) || runFrom(-1));  // -1 = ace-low wheel

  if (straight && flush)                  return low === 8 ? "Royal Flush" : "Straight Flush";
  if (groups[0] === 4)                    return "Four of a Kind";
  if (groups[0] === 3 && groups[1] === 2) return "Full House";
  if (flush)                              return "Flush";
  if (straight)                           return "Straight";
  if (groups[0] === 3)                    return "Three of a Kind";
  if (groups[0] === 2 && groups[1] === 2) return "Two Pair";
  if (groups[0] === 2)                    return "Pair";
  return "High Card";
}`;

const CODE_OPT = `// Reduce 5 cards to two facts: the shape of the rank groups, and flush/straight.
const RANKS = "23456789TJQKA";
function getBestHand(cards: string[]): string {
  const values = cards.map(c => RANKS.indexOf(c[0])).sort((a, b) => a - b);
  const suits  = cards.map(c => c[1]);

  const groups = [...new Set(values)]                  // e.g. [3,2] = full house,
    .map(v => values.filter(x => x === v).length)      //      [4]   = four of a kind
    .sort((a, b) => b - a);

  const flush    = suits.every(s => s === suits[0]);
  const distinct = new Set(values).size === 5;         // hashed — no comparisons
  const straight = distinct && (
    values[4] - values[0] === 4 ||                      // sorted, so one subtraction
    values.join() === "0,1,2,3,12"                      // A-2-3-4-5 (ace low)
  );

  if (straight && flush)             return values[0] === 8 ? "Royal Flush" : "Straight Flush";
  if (groups[0] === 4)               return "Four of a Kind";
  if (groups[0] === 3 && groups[1] === 2) return "Full House";
  if (flush)                         return "Flush";
  if (straight)                      return "Straight";
  if (groups[0] === 3)               return "Three of a Kind";
  if (groups[0] === 2 && groups[1] === 2) return "Two Pair";
  if (groups[0] === 2)               return "Pair";
  return "High Card";
}`;

export default {
  n: 293, id: "besthand", title: "Best Hand", dates: ["2026-05-30"],
  statement: `Given five cards as rank+suit strings (e.g. <code class="inl">"Th"</code> — ranks <code class="inl">2 3 4 5 6 7 8 9 T J Q K A</code>, suits <code class="inl">h d c s</code>), return the best poker hand name: <b>High Card</b>, <b>Pair</b>, <b>Two Pair</b>, <b>Three of a Kind</b>, <b>Straight</b>, <b>Flush</b>, <b>Full House</b>, <b>Four of a Kind</b>, <b>Straight Flush</b>, <b>Royal Flush</b>. An ace plays <b>high or low</b> in a straight. <span class="rule">Example: <code class="inl">getBestHand(["Ks","Kh","Kd","4s","4h"])</code> → <b>"Full House"</b>.</span>`,
  // Grouped by approach: each approach is [interactive demo] → [step through],
  // paired by tone. Both demos share the same click-to-build hand editor, so the
  // comparison counters can be read against byte-identical input.
  variants: [
    {
      name: "Count each rank by rescanning", tone: "brute", cost: "O(n²) — 75–109 comparisons",
      approach: `Compute every fact by re-reading the whole hand. For each of the five cards, rescan all five counting how many share its rank; sweep every ordered pair again for the flush and again for rank collisions; then probe for a run by asking "is value <i>v</i> present?" once per rung, each probe another scan. Correct, and it never remembers a thing. Click a card's halves to build any hand — the two counters below show what each approach paid.`,
      code: CODE_BRUTE, mount: mountBrute,
    },
    {
      name: "Step: rescan", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the brute force — every single rank comparison gets its own step, and <code class='inl'>comps</code> in the stack frame ticks up so the waste is countable rather than asserted. Watch the same five cards get re-read from index 0 for <i>each</i> card, then swept pairwise twice more, then probed once per rung of the run test. Try case <b>8</b>, the ace-low wheel: <b>109</b> comparisons, because the ordinary run test fails and the whole probe has to start over from the ace-low base. Pick a hand, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: STEP_INPUT }),
    },
    {
      name: "Group-shape reduction", tone: "opt", cost: "O(1) — 5 cards",
      approach: `Reduce the hand to two facts, then decide. Sorting the rank indices once lines up runs and repeats by position, so the group shape (<code class='inl'>[3,2]</code> = full house, <code class='inl'>[4]</code> = four of a kind) falls out of one map, and the straight test becomes a single subtraction plus the ace-low special case. Distinctness comes free from a <code class='inl'>Set</code> — hashed, not compared. Then a strongest-first cascade returns on the first match.`,
      code: CODE_OPT, mount: mountOpt,
    },
    {
      name: "Step: group shape", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the reduction — watch five cards collapse into a <code class='inl'>groups</code> shape plus the <b>flush</b> and <b>straight</b> flags, then a strongest-first ladder of <code class='inl'>if</code> checks pick the rank and the first match returns. Every condition renders its own true/false panel, and a flag appears in the frame only once it has been assigned. Compare case <b>8</b> against the "Step: rescan" tab: identical verdict, <b>27</b> comparisons instead of <b>109</b> — sorting once collapses the ace-low wheel into a single string compare. Pick a hand, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: STEP_INPUT }),
    },
  ],
};
