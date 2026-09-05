// #14 · Character Battle — the two retreat rules are settled before a single battle.
// Five outcomes are listed as if they were peers; they aren't. The first two are
// decided by `length` alone, so an army that would win every fight still retreats
// for being one character too long. Read the list as a LADDER, in the given order.
// The strength table then has one collision worth knowing: a digit's face value and
// "everything else" meet at ZERO, so '0' and '@' are indistinguishable in a fight.
import { el, esc, mountDebugger } from "../shared.js";

// The seven official freeCodeCamp cases, in the grader's order, then three of ours.
// Each invented one targets a clause no official case can reach:
//   "zzz" / "aaaa"  — we would win every battle and still retreat. Only this case
//                     shows the length gate outranking the fight.
//   "0" / "!"       — the strength table's one collision: digit 0 and a symbol are
//                     both 0, so the battle ties. No official case pairs them.
//   "a" / "A"       — the same letter, and the capital wins 27 to 1.
const OFFICIAL = [
  ["Hello", "World"], ["pizza", "salad"], ["C@T5", "D0G$"], ["kn!ght", "orc"],
  ["PC", "Mac"], ["Wizards", "Dragons"], ["Mr. Smith", "Dr. Jones"],
];
const PRESETS = [...OFFICIAL, ["zzz", "aaaa"], ["0", "!"], ["a", "A"]];

// a–z → 1–26, A–Z → 27–52, 0–9 → face value, everything else → 0.
const strength = (c) =>
  c >= "a" && c <= "z" ? c.charCodeAt(0) - 96 :
  c >= "A" && c <= "Z" ? c.charCodeAt(0) - 38 :
  c >= "0" && c <= "9" ? +c : 0;

// The full ladder, in order, with the rung each input lands on. `rung` is the index
// so the demo can light exactly one and grey the rest.
const RUNGS = ["Opponent retreated", "We retreated", "We won", "We lost", "It was a tie"];
const WHY = [
  "your army is longer",
  "the opposing army is longer",
  "you won more battles",
  "they won more battles",
  "equal victories",
];

function solve(mine, theirs) {
  if (mine.length > theirs.length) return { rung: 0, out: RUNGS[0], fights: [], a: 0, b: 0 };
  if (mine.length < theirs.length) return { rung: 1, out: RUNGS[1], fights: [], a: 0, b: 0 };
  const fights = [];
  let a = 0, b = 0;
  for (let i = 0; i < mine.length; i++) {
    const x = strength(mine[i]), y = strength(theirs[i]);
    if (x > y) a++; else if (y > x) b++;
    fights.push({ i, mc: mine[i], tc: theirs[i], x, y, r: x > y ? "win" : y > x ? "loss" : "tie" });
  }
  const rung = a > b ? 2 : b > a ? 3 : 4;
  return { rung, out: RUNGS[rung], fights, a, b };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cb-wrap { display:flex; flex-direction:column; gap:12px; }
    .cb-board { display:flex; flex-wrap:wrap; gap:6px; }
    .cb-col { min-width:56px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:6px 8px; text-align:center; }
    .cb-col.win { border-color:var(--good); background:color-mix(in srgb, var(--good) 12%, transparent); }
    .cb-col.loss { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 11%, transparent); }
    .cb-col.tie { opacity:.55; }
    .cb-ch { font:800 17px var(--mono); color:var(--text); line-height:1.2; }
    .cb-s { font:11px var(--mono); color:var(--muted); }
    .cb-vs { font:9.5px var(--sans); letter-spacing:.1em; color:var(--muted); margin:2px 0; }
    .cb-mark { font:800 12px var(--mono); margin-top:3px; }
    .cb-col.win .cb-mark { color:var(--good); } .cb-col.loss .cb-mark { color:var(--danger); }
    .cb-col.tie .cb-mark { color:var(--muted); }
    .cb-tally { display:flex; gap:16px; flex-wrap:wrap; align-items:baseline; font:13px var(--sans); color:var(--muted); }
    .cb-tally b { font:800 20px var(--mono); color:var(--text); }
    .cb-lens { font:12.5px var(--mono); color:var(--muted); }
    .cb-lens b { color:var(--text); }
    .cb-lens .gate { color:var(--warn); font-weight:800; }
  `));
}

// A space, and anything else invisible, has to be shown or the board lies about
// what it is comparing — "Mr. Smith" has a battle at index 3 that looks empty.
const glyph = (c) => (c === " " ? "␣" : esc(c));

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inA = el("input"); inA.type = "text"; inA.value = "Mr. Smith"; inA.style.width = "150px";
  const inB = el("input"); inB.type = "text"; inB.value = "Dr. Jones"; inB.style.width = "150px";
  ctl.append(el("span", "ctl-label", "my army"), inA, el("span", "ctl-label", "opposing army"), inB);
  const pre = el("div", "controls");
  PRESETS.forEach(([a, b]) => {
    const c = el("button", "chip", `${esc(a)} vs ${esc(b)}`);
    c.onclick = () => { inA.value = a; inB.value = b; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inA.oninput = inB.oninput = render;
  render();

  function render() {
    const mine = inA.value, theirs = inB.value;
    const r = solve(mine, theirs);
    out.innerHTML = "";
    const wrap = el("div", "cb-wrap");

    wrap.append(el("div", "cb-lens",
      `length <b>${mine.length}</b> vs <b>${theirs.length}</b> — ` +
      (r.rung < 2
        ? `<span class="gate">unequal, so the war never happens.</span> No character is scored.`
        : `equal, so the armies actually fight.`)));

    if (r.fights.length) {
      const board = el("div", "cb-board");
      r.fights.forEach((f) => {
        board.append(el("div", "cb-col " + f.r,
          `<div class="cb-ch">${glyph(f.mc)}</div><div class="cb-s">${f.x}</div>` +
          `<div class="cb-vs">VS</div>` +
          `<div class="cb-ch">${glyph(f.tc)}</div><div class="cb-s">${f.y}</div>` +
          `<div class="cb-mark">${f.r === "win" ? "▲ ours" : f.r === "loss" ? "▼ theirs" : "= tie"}</div>`));
      });
      wrap.append(board);
      wrap.append(el("div", "cb-tally",
        `<span>our victories <b style="color:var(--good)">${r.a}</b></span>` +
        `<span>theirs <b style="color:var(--danger)">${r.b}</b></span>` +
        `<span>ties <b>${r.fights.length - r.a - r.b}</b></span>`));
    }

    // The ladder is the answer's shape, so show all five rungs and light the one
    // that fired — the priority order is the thing that is easy to get wrong.
    const ladder = el("div", "ladder");
    RUNGS.forEach((name, i) => ladder.append(el("div", "rung" + (i === r.rung ? " on" : ""),
      `<span>${i + 1}. "${name}"</span><span class="v">${WHY[i]}</span>`)));
    wrap.append(ladder);

    wrap.append(el("div", "result-line", `<span class="badge ok">battle(${esc(JSON.stringify(mine))}, ${esc(JSON.stringify(theirs))}) → "${r.out}"</span>`));
    wrap.append(el("div", "note", noteFor(mine, theirs, r)));
    out.append(wrap);
  }
}

function noteFor(mine, theirs, r) {
  if (r.rung < 2) {
    const stronger = [...mine].reduce((s, c) => s + strength(c), 0) > [...theirs].reduce((s, c) => s + strength(c), 0);
    return `The length check runs <b>before</b> anything is scored, so the retreat is not about how strong either side is${stronger ? " — on total strength this army is the stronger one, and it retreats anyway" : ""}. Try <b>zzz vs aaaa</b>: three 26s against four 1s, and the answer is still <code class='inl'>"We retreated"</code>.`;
  }
  const zeroTie = r.fights.find((f) => f.x === 0 && f.y === 0 && f.mc !== f.tc);
  if (zeroTie) return `Index <b>${zeroTie.i}</b> pairs <b>${glyph(zeroTie.mc)}</b> with <b>${glyph(zeroTie.tc)}</b> and both score <b>0</b> — the table's one collision. "All other characters have a value of zero" and the digit <code class='inl'>0</code>'s face value are the same number, so a symbol and a zero can never beat each other.`;
  const flip = r.fights.find((f) => f.mc.toLowerCase() === f.tc.toLowerCase() && f.x !== f.y);
  if (flip) return `Index <b>${flip.i}</b> is the same letter in two cases — <b>${glyph(flip.mc)}</b> (${flip.x}) against <b>${glyph(flip.tc)}</b> (${flip.y}). Uppercase starts at <b>27</b>, above every lowercase letter, so <i>any</i> capital beats <i>any</i> small letter.`;
  return `${r.a} to ${r.b}, with ${r.fights.length - r.a - r.b} tie${r.fights.length - r.a - r.b === 1 ? "" : "s"}. A tied battle is worth nothing to either side — it is not half a victory — which is why an all-tie war lands on <code class='inl'>"It was a tie"</code> by the same line that a 3–3 war does.`;
}

// ── STEP — the ladder, one rung at a time ───────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">battle</span>(<span class="tok" data-t="param">mine</span>, <span class="tok" data-t="param">theirs</span>) {` },
  { ln: 2, html: `  <span class="k">if</span> (<span class="tok" data-t="longer">mine.length &gt; theirs.length</span>) <span class="k">return</span> <span class="st">"Opponent retreated"</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="shorter">mine.length &lt; theirs.length</span>) <span class="k">return</span> <span class="st">"We retreated"</span>;` },
  { ln: 4, html: `  <span class="k">let</span> <span class="tok" data-t="init">a = 0, b = 0</span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 0; i &lt; mine.length</span>; i++) {` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="str">x = <span class="fn">strength</span>(mine[i]), y = <span class="fn">strength</span>(theirs[i])</span>;` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">x &gt; y</span>) a++;` },
  { ln: 8, html: `    <span class="k">else</span> <span class="k">if</span> (<span class="tok" data-t="cmp2">y &gt; x</span>) b++;   <span class="cm">// a tie scores for nobody</span>` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">if</span> (<span class="tok" data-t="won">a &gt; b</span>) <span class="k">return</span> <span class="st">"We won"</span>;` },
  { ln: 11, html: `  <span class="k">if</span> (<span class="tok" data-t="lost">b &gt; a</span>) <span class="k">return</span> <span class="st">"We lost"</span>;` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="tie">"It was a tie"</span>;` },
  { ln: 13, html: `}` },
];

const STEP_PRESETS = PRESETS.map(([a, b]) => `${a} / ${b}`);
const splitCase = (raw) => {
  const cut = String(raw).indexOf("/");
  return cut < 0 ? [String(raw).trim(), ""] : [String(raw).slice(0, cut).trim(), String(raw).slice(cut + 1).trim()];
};
const named = (c) => (c === " " ? "a space" : `<b>${glyph(c)}</b>`);
const kind = (c) =>
  c >= "a" && c <= "z" ? "lowercase, so 1–26" :
  c >= "A" && c <= "Z" ? "uppercase, so 27–52" :
  c >= "0" && c <= "9" ? "a digit, so its face value" : "not a letter or digit, so 0";

function trace(raw) {
  const [mine, theirs] = splitCase(raw);
  const steps = [];
  const fought = [];
  let a, b, i, x, y;
  const S = (line, note, xx = {}) => {
    const vars = { mine: JSON.stringify(mine), theirs: JSON.stringify(theirs) };
    if (line >= 4) { vars.a = a; vars.b = b; }
    if (line >= 5 && line <= 9 && i !== undefined) vars.i = i;
    if (line >= 6 && line <= 9 && x !== undefined) { vars.x = x; vars.y = y; }
    const structs = line >= 5 ? [{ label: "battles", items: fought.slice(), newest: !!xx.fresh }] : [];
    steps.push({ line, note, focus: xx.focus, eval: xx.eval, done: xx.done, result: xx.result,
      frames: [{ title: `battle("${mine}", "${theirs}")`, vars, changed: xx.changed || [], structs, ret: xx.ret }] });
  };

  S(1, `Two armies, <b>"${esc(mine)}"</b> and <b>"${esc(theirs)}"</b>. Five outcomes are on offer and they are checked <b>in order</b> — the first one that fits wins, which is what makes this a ladder rather than five independent rules.`, { focus: "param" });

  const longer = mine.length > theirs.length;
  S(2, longer
    ? `<b>${mine.length} &gt; ${theirs.length}</b>. Your army is bigger, so the opponent leaves — and that is the entire answer. Nothing is scored, no character strength is even looked at.`
    : `<b>${mine.length} &gt; ${theirs.length}</b> is false. Not outnumbered in your favour, so the war is still possible.`,
    { focus: "longer", eval: { expr: `${mine.length} > ${theirs.length}`, val: longer } });
  if (longer) {
    S(2, `<b>Return "Opponent retreated"</b> — decided by <code class='inl'>length</code> alone.`, { focus: "longer", done: true, result: `"Opponent retreated"`, ret: { value: `"Opponent retreated"` } });
    return steps;
  }

  const shorter = mine.length < theirs.length;
  S(3, shorter
    ? `<b>${mine.length} &lt; ${theirs.length}</b>. You are outnumbered, so you retreat — again before any strength is computed. An army of three <b>z</b>s (26 each) loses this way to four <b>a</b>s (1 each).`
    : `<b>${mine.length} &lt; ${theirs.length}</b> is false too, so the armies are the same size and every character gets exactly one opponent.`,
    { focus: "shorter", eval: { expr: `${mine.length} < ${theirs.length}`, val: shorter } });
  if (shorter) {
    S(3, `<b>Return "We retreated"</b> — still nothing to do with strength.`, { focus: "shorter", done: true, result: `"We retreated"`, ret: { value: `"We retreated"` } });
    return steps;
  }

  a = 0; b = 0;
  S(4, `Two counters, both starting at <b>0</b>. Only victories are counted — a tied battle increments neither, so the two tallies need not add up to the number of battles.`, { focus: "init", changed: ["a", "b"] });

  for (i = 0; i < mine.length; i++) {
    S(5, `Battle <b>${i + 1}</b> of <b>${mine.length}</b>: position <b>${i}</b> against position <b>${i}</b>. "Each character can only fight one battle" is what makes this an index-for-index pairing rather than a search for the best match.`,
      { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} < ${mine.length}`, val: true } });
    x = strength(mine[i]); y = strength(theirs[i]);
    S(6, `${named(mine[i])} is ${kind(mine[i])} → <b>${x}</b>. ${named(theirs[i])} is ${kind(theirs[i])} → <b>${y}</b>.`,
      { focus: "str", changed: ["x", "y"] });
    const win = x > y, loss = y > x;
    S(7, win ? `<b>${x} &gt; ${y}</b> — ours wins this one.` : `<b>${x} &gt; ${y}</b> is false${loss ? "" : ` — and since ${x} isn't less than ${y} either, the two are equal`}.`,
      { focus: "cmp", eval: { expr: `${x} > ${y}`, val: win } });
    if (win) a++;
    else {
      S(8, loss
        ? `<b>${y} &gt; ${x}</b> — theirs takes it.`
        : `<b>${y} &gt; ${x}</b> is false as well, so the battle is a <b>tie</b> and <i>neither</i> counter moves. Treating a tie as half a point, or as a loss, is the easy way to break the 3–3 cases.`,
        { focus: "cmp2", eval: { expr: `${y} > ${x}`, val: loss } });
      if (loss) b++;
    }
    fought.push(`${glyph(mine[i])}${win ? ">" : loss ? "<" : "="}${glyph(theirs[i])}`);
    S(win ? 7 : 8, `Running score: <b>${a}</b> to <b>${b}</b>${a + b < i + 1 ? ` with <b>${i + 1 - a - b}</b> tied` : ""}.`,
      { focus: win ? "cmp" : "cmp2", changed: win ? ["a"] : loss ? ["b"] : [], fresh: true });
  }
  S(5, `<b>i = ${i}</b> reached the army's length — every character has fought exactly once.`, { focus: "loop", eval: { expr: `i = ${i} < ${mine.length}`, val: false } });

  const won = a > b;
  S(10, won ? `<b>${a} &gt; ${b}</b> — more victories than the opposing army.` : `<b>${a} &gt; ${b}</b> is false.`,
    { focus: "won", eval: { expr: `${a} > ${b}`, val: won } });
  if (won) { S(10, `<b>Return "We won".</b>`, { focus: "won", done: true, result: `"We won"`, ret: { value: `"We won"` } }); return steps; }
  const lost = b > a;
  S(11, lost ? `<b>${b} &gt; ${a}</b> — they took more battles.` : `<b>${b} &gt; ${a}</b> is false too, so the tallies are level at <b>${a}</b> each.`,
    { focus: "lost", eval: { expr: `${b} > ${a}`, val: lost } });
  if (lost) { S(11, `<b>Return "We lost".</b>`, { focus: "lost", done: true, result: `"We lost"`, ret: { value: `"We lost"` } }); return steps; }
  S(12, `Neither comparison fired, so the war is level at <b>${a}–${b}</b>. <b>Return "It was a tie"</b> — the rung that catches everything the four above it did not.`,
    { focus: "tie", done: true, result: `"It was a tie"`, ret: { value: `"It was a tie"` } });
  return steps;
}

export default {
  n: 14, id: "battle", title: "Character Battle", dates: ["2025-08-24"],
  statement: `Two strings are two armies; the character at each position fights the character at the same position of the other. <b>a–z</b> are worth <b>1–26</b>, <b>A–Z</b> are worth <b>27–52</b>, digits are worth their face value, everything else is <b>0</b>; the stronger character wins that battle. Return <code class="inl">"Opponent retreated"</code> if your army is longer, <code class="inl">"We retreated"</code> if theirs is, then <code class="inl">"We won"</code> / <code class="inl">"We lost"</code> / <code class="inl">"It was a tie"</code> by victory count. <span class="rule">Example: <code class="inl">battle("pizza", "salad")</code> → <code class="inl">"We won"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass",
      approach: `The five return values are a <b>ladder</b>, not a menu: the two retreat rules are settled by <code class='inl'>length</code> before a single strength is computed, which is why an army that would win every fight can still retreat. Only once the lengths match does the pairing become index-for-index — that is all "each character can only fight one battle" means. Then <b>count victories, not strength</b>: a tie moves neither counter, so the two tallies need not sum to the number of battles, and an all-tie war lands on <code class='inl'>"It was a tie"</code> through exactly the same line as a 3–3 war.`,
      code: `function battle(myArmy: string, opposingArmy: string): string {
  // The retreat rules are pure length, and they outrank everything below.
  if (myArmy.length > opposingArmy.length) return "Opponent retreated";
  if (myArmy.length < opposingArmy.length) return "We retreated";

  const strength = (c: string): number =>
    c >= "a" && c <= "z" ? c.charCodeAt(0) - 96 :   // a = 97 -> 1
    c >= "A" && c <= "Z" ? c.charCodeAt(0) - 38 :   // A = 65 -> 27
    c >= "0" && c <= "9" ? +c : 0;                  // '0' and '@' both score 0

  let mine = 0, theirs = 0;
  for (let i = 0; i < myArmy.length; i++) {
    const x = strength(myArmy[i]), y = strength(opposingArmy[i]);
    if (x > y) mine++;
    else if (y > x) theirs++;                       // equal: nobody scores
  }
  if (mine > theirs) return "We won";
  if (theirs > mine) return "We lost";
  return "It was a tie";
}`,
      mount,
    },
    {
      name: "Step through", cost: "the ladder, in order",
      approach: `Watch the two length gates fire first. <b>zzz / aaaa</b> never reaches the loop despite winning on strength everywhere; <b>0 / !</b> shows the table's zero collision tying a digit against a symbol; <b>Mr. Smith / Dr. Jones</b> runs the full nine battles to a 3–3 draw, with the space and the full stop scoring nothing on either side. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "armies =", value: "Mr. Smith / Dr. Jones", presets: STEP_PRESETS, hint: "mine / theirs" } }),
    },
  ],
};
