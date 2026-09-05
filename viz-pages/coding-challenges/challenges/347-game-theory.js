// #347 · Game Theory — build the key from both moves and the 2×2 matrix is data.
// The scoring rules read like four conditionals, but the two characters at round i
// already spell the case: p1[i] + p2[i] is "CC", "CD", "DC" or "DD". Look that up in
// a table and the branch disappears — the same move as #338's age table, except the
// key here is assembled from two inputs rather than handed over. What's left is a
// single pass adding two numbers, and the interesting part stops being the code.
import { el, esc, mountDebugger } from "../shared.js";

// The prompt's three rules, written as the four outcomes they actually describe.
// Both scores live in one entry so a round is one lookup, not two.
const PAYOFF = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };

// Cases 1–5 are freeCodeCamp's official tests in the order the grader lists them.
// Cases 6–7 are invented. The official set never contains a wholly one-sided game,
// so 6 is the maximum exploitation available — the 5/0 cell four times over. And 7
// is the one that makes the dilemma visible: two players who alternate exploiting
// each other tie at 10 apiece, which is WORSE for both than the 12 apiece they'd
// each have taken from four rounds of plain mutual cooperation (case 1).
const CASES = [
  { p1: "CCCC",               p2: "CCCC",               label: "all cooperate" },
  { p1: "DDDD",               p2: "DDDD",               label: "all defect" },
  { p1: "CCDD",               p2: "CDDD",               label: "CCDD / CDDD" },
  { p1: "CCCDCDCCCDDC",       p2: "CCDDCDCDDCCD",       label: "12 rounds" },
  { p1: "DDCCDDDDCDDCDDDCDD", p2: "CCDCCCDCCCDCCCCDCC", label: "18 rounds" },
  { p1: "CCCC",               p2: "DDDD",               label: "fully exploited" },
  { p1: "CDCD",               p2: "DCDC",               label: "alternating" },
];

// The solution itself — shared by the demo and the trace so they cannot drift.
function playGame(p1, p2) {
  const score = [0, 0];
  for (let i = 0; i < p1.length; i++) {
    const [a, b] = PAYOFF[p1[i] + p2[i]];
    score[0] += a; score[1] += b;
  }
  return score;
}

const KEYS = ["CC", "CD", "DC", "DD"];
const clean = (s) => s.toUpperCase().replace(/[^CD]/g, "");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .gt-rounds { display:flex; gap:4px; flex-wrap:wrap; margin:6px 0 2px; }
    .gt-r { display:flex; flex-direction:column; gap:2px; align-items:center; }
    .gt-m { width:30px; height:30px; display:flex; align-items:center; justify-content:center;
            font:800 14px var(--mono); border-radius:6px; cursor:pointer; border:1px solid var(--border); }
    .gt-m.c { background:color-mix(in srgb, var(--good) 17%, transparent); border-color:var(--good); color:var(--good); }
    .gt-m.d { background:color-mix(in srgb, var(--danger) 17%, transparent); border-color:var(--danger); color:var(--danger); }
    .gt-m:hover { outline:2px solid var(--accent); outline-offset:1px; }
    .gt-pay { font:700 10.5px var(--mono); color:var(--muted); white-space:nowrap; }
    .gt-idx { font:10px var(--mono); color:var(--muted); opacity:.6; }
    .gt-bars { display:grid; grid-template-columns:78px 1fr 52px; gap:9px; align-items:center; margin:6px 0; }
    .gt-bar { height:15px; border-radius:7px; min-width:2px;
              background:color-mix(in srgb, var(--accent) 60%, transparent); }
    .gt-bar.p2 { background:color-mix(in srgb, var(--c3) 60%, transparent); }
    .gt-sc { font:800 16px var(--mono); color:var(--text); text-align:right; }
    .gt-lab { font:700 12px var(--mono); color:var(--muted); }
    .gt-mx td.hit { background:color-mix(in srgb, var(--accent) 22%, transparent); color:var(--text); font-weight:800; }
    .gt-mx td.used { background:color-mix(in srgb, var(--accent) 9%, transparent); }
  `));
}

function mount(host) {
  ensureStyle();
  let p1 = CASES[0].p1, p2 = CASES[0].p2;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { p1 = c.p1; p2 = c.p2; aIn.value = p1; bIn.value = p2; render(); };
    pre.append(chip);
  });

  const ctl = el("div", "controls");
  const aIn = el("input"); aIn.type = "text"; aIn.value = p1; aIn.style.width = "220px";
  const bIn = el("input"); bIn.type = "text"; bIn.value = p2; bIn.style.width = "220px";
  aIn.oninput = () => { p1 = clean(aIn.value); render(); };
  bIn.oninput = () => { p2 = clean(bIn.value); render(); };
  ctl.append(el("span", "ctl-label", "player 1 ="), aIn, el("span", "ctl-label", "player 2 ="), bIn);

  const out = el("div");
  host.append(
    el("div", "note", "Type strategies, or <b>click any move to flip it</b> and watch that round's cell — and both totals — change. Flipping one of your own C's to a D always gains you points, every single time. That is the dilemma: the move that pays is the one that, if you both make it, leaves you with 1 instead of 3."),
    pre, ctl, out,
  );
  render();

  function render() {
    out.innerHTML = "";
    const n = Math.min(p1.length, p2.length);
    if (!n) { out.append(el("div", "note", "Give both players at least one round of C or D.")); return; }

    const a = p1.slice(0, n), b = p2.slice(0, n);
    const [s1, s2] = playGame(a, b);
    const used = new Set();

    const rounds = el("div", "gt-rounds");
    for (let i = 0; i < n; i++) {
      const key = a[i] + b[i];
      used.add(key);
      const [x, y] = PAYOFF[key];
      const col = el("div", "gt-r");
      const flip = (who) => () => {
        const swap = (s) => s.slice(0, i) + (s[i] === "C" ? "D" : "C") + s.slice(i + 1);
        if (who === 1) { p1 = swap(a) + p1.slice(n); aIn.value = p1; }
        else { p2 = swap(b) + p2.slice(n); bIn.value = p2; }
        render();
      };
      const m1 = el("div", "gt-m " + (a[i] === "C" ? "c" : "d"), a[i]);
      const m2 = el("div", "gt-m " + (b[i] === "C" ? "c" : "d"), b[i]);
      m1.onclick = flip(1); m2.onclick = flip(2);
      m1.title = m2.title = `round ${i + 1}: ${key} → ${x} / ${y}`;
      col.append(el("div", "gt-idx", String(i + 1)), m1, m2, el("div", "gt-pay", `${x}/${y}`));
      rounds.append(col);
    }
    out.append(rounds);

    const max = Math.max(1, s1, s2, 5 * n);
    const bars = el("div", "gt-bars");
    [["player 1", s1, ""], ["player 2", s2, " p2"]].forEach(([lab, s, cls]) => {
      const bar = el("div", "gt-bar" + cls);
      bar.style.width = (s / max) * 100 + "%";
      bars.append(el("div", "gt-lab", lab), bar, el("div", "gt-sc", String(s)));
    });
    out.append(bars);

    out.append(el("div", "result-line", `<span class="badge ok">[${s1}, ${s2}]</span>`));

    const t = el("table", "cmp gt-mx");
    t.innerHTML =
      `<tr><th></th><th>p2 cooperates</th><th>p2 defects</th></tr>` +
      `<tr><th>p1 cooperates</th><td class="${used.has("CC") ? "used" : ""}">3 / 3</td><td class="${used.has("CD") ? "used" : ""}">0 / 5</td></tr>` +
      `<tr><th>p1 defects</th><td class="${used.has("DC") ? "used" : ""}">5 / 0</td><td class="${used.has("DD") ? "used" : ""}">1 / 1</td></tr>`;
    out.append(el("div", "gt-lab", "payoff matrix · shaded cells were used"), t);

    const total = s1 + s2, best = 6 * n;
    out.append(el("div", "note",
      `Together they scored <b>${total}</b> of a possible <b>${best}</b>. Only the <b>3/3</b> cell pays 6 to the table; every other outcome pays 5, 5 or 2. So the pair does best when neither defects — and yet from either player's own seat, swapping a C for a D gains ${a.includes("C") || b.includes("C") ? "2 or 5 points" : "points"} no matter what the other does. That gap between the group's best move and each individual's best move <i>is</i> the prisoner's dilemma; the code is a one-line lookup, and the reason it's famous isn't the code.`));
  }
}

// ── STEP — one pass, one lookup per round ────────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">playGame</span>(<span class="tok" data-t="params">p1, p2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="table">PAYOFF = { CC: [<span class="nu">3</span>, <span class="nu">3</span>], CD: [<span class="nu">0</span>, <span class="nu">5</span>], DC: [<span class="nu">5</span>, <span class="nu">0</span>], DD: [<span class="nu">1</span>, <span class="nu">1</span>] }</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="init">score = [<span class="nu">0</span>, <span class="nu">0</span>]</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cond">i = <span class="nu">0</span>; i &lt; p1.length</span>; i++) {` },
  { ln: 5, html: `    <span class="k">const</span> <span class="tok" data-t="look">[a, b] = PAYOFF[p1[i] + p2[i]]</span>;` },
  { ln: 6, html: `    <span class="tok" data-t="add">score[<span class="nu">0</span>] += a; score[<span class="nu">1</span>] += b</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">score</span>;` },
  { ln: 9, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { p1, p2 } = CASES[k - 1];
  const steps = [];
  const score = [0, 0];
  let i = 0, a = null, b = null;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4 && line <= 7) vars.i = i;                     // the for-statement's let
    if (line >= 6 && line <= 7 && a != null) { vars.a = a; vars.b = b; }  // line 5's consts
    if (line >= 3) { vars["score[0]"] = score[0]; vars["score[1]"] = score[1]; }
    const structs = [
      { label: "p1", items: [...p1] },
      { label: "p2", items: [...p2] },
    ];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `playGame("${p1}", "${p2}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `<b>${p1.length}</b> rounds. The two strings are the same length by promise, and each position is one simultaneous round — nothing carries between them, so this is a fold, not a simulation.`,
    { focus: "params" });

  S(2, `The rules as a <b>table</b> instead of a cascade of ifs. Both scores sit in one entry, so a round costs one lookup rather than two. The keys are the four possible round outcomes spelled out — which is the whole trick, because the input already spells them.`,
    { focus: "table" });

  S(3, `One accumulator per player. They only ever grow, so no round can undo an earlier one.`,
    { focus: "init", changed: ["score[0]", "score[1]"] });

  const counts = { CC: 0, CD: 0, DC: 0, DD: 0 };
  for (i = 0; i < p1.length; i++) {
    S(4, `Round <b>${i + 1}</b> of ${p1.length}.`, { focus: "cond", changed: ["i"],
      eval: { expr: `i (${i}) < p1.length (${p1.length})`, val: true } });

    const key = p1[i] + p2[i];
    counts[key]++;
    [a, b] = PAYOFF[key];
    S(5, `<b>p1[${i}] + p2[${i}]</b> is <code class='inl'>"${p1[i]}" + "${p2[i]}"</code> = <b>"${key}"</b> — the two moves concatenated spell the table key directly, so there is no <code class='inl'>if</code> anywhere in this function. <b>PAYOFF["${key}"]</b> destructures to <b>a = ${a}, b = ${b}</b>${
      key === "CC" ? " — the only cell that pays 6 between them." :
      key === "DD" ? " — mutual defection, and the worst joint outcome on the board at 2 total." :
      ` — one player takes 5, the other takes nothing.`}`,
      { focus: "look", changed: ["a", "b"] });

    score[0] += a; score[1] += b;
    S(6, `Running totals: <b>${score[0]}</b> and <b>${score[1]}</b>.`, { focus: "add", changed: ["score[0]", "score[1]"] });
  }
  a = null; b = null;

  S(4, `<b>i = ${i}</b> reached the length — every round is scored.`,
    { focus: "cond", eval: { expr: `i (${i}) < p1.length (${p1.length})`, val: false } });

  const total = score[0] + score[1];
  S(8, `Return <b>[${score[0]}, ${score[1]}]</b>. The four cells came up <b>${KEYS.map((kk) => `${kk}×${counts[kk]}`).join(", ")}</b>, and the pair banked <b>${total}</b> of a possible ${6 * p1.length}${
    counts.CC === p1.length ? ` — the maximum, because they never defected once.` :
    counts.DD === p1.length ? ` — the floor. Mutual defection is individually sensible and collectively the worst thing on the board.` :
    `. Every round that wasn't 3/3 left something on the table.`}`,
    { focus: "ret", done: true, result: `[${score[0]}, ${score[1]}]`, ret: { value: `[${score[0]}, ${score[1]}]` } });

  return steps;
}

export default {
  n: 347, id: "gametheory", title: "Game Theory", dates: ["2026-07-23"],
  statement: `Given two equal-length strings of <code class="inl">"C"</code> (cooperate) and <code class="inl">"D"</code> (defect), return the scores as <code class="inl">[player1, player2]</code>. Each character is one round: both cooperate → <b>3</b> each; both defect → <b>1</b> each; one defects while the other cooperates → the defector takes <b>5</b> and the cooperator <b>0</b>. <span class="rule">Example: <code class="inl">playGame("CCDD", "CDDD")</code> → <b>[5, 10]</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Three prose rules, four outcomes, zero conditionals. At round <code class='inl'>i</code> the two characters <b>already spell the case</b>: <code class='inl'>p1[i] + p2[i]</code> is one of <code class='inl'>"CC"</code>, <code class='inl'>"CD"</code>, <code class='inl'>"DC"</code>, <code class='inl'>"DD"</code>, so the payoff matrix can be a plain object keyed by exactly those strings. Storing <i>both</i> players' points in one entry makes a round a single lookup rather than two symmetric branches you have to keep in sync.<br><br>The general move: when a rule set is indexed by a small combination of inputs, build the key out of the inputs and let the table hold the rules. A chain of <code class='inl'>if</code>s here would re-encode a 2×2 grid as control flow, which is longer, easy to get backwards, and — unlike the table — impossible to read off against the spec at a glance.`,
      code: `// The two moves concatenate into the table key, so there are no branches:
// "C" + "D" is literally the name of the cell you want.
function playGame(p1: string, p2: string): [number, number] {
  const PAYOFF: Record<string, [number, number]> = {
    CC: [3, 3],   // both cooperate — the only cell paying 6 to the pair
    CD: [0, 5],   // p1 cooperates, p2 defects
    DC: [5, 0],   // p1 defects, p2 cooperates
    DD: [1, 1],   // both defect — individually rational, jointly the worst
  };

  const score: [number, number] = [0, 0];
  for (let i = 0; i < p1.length; i++) {
    const [a, b] = PAYOFF[p1[i] + p2[i]];
    score[0] += a;
    score[1] += b;
  }
  return score;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `The loop is unremarkable — <b>line 5</b> is the whole idea, and it is worth watching a few rounds to see the key get built out of the two inputs rather than tested against them. Run <b>fully exploited</b> (<code class='inl'>"CCCC"</code> against <code class='inl'>"DDDD"</code>) to watch one accumulator never move, then <b>alternating</b>, where both players end on 10 — a tie that is <i>worse for each of them</i> than the 12 they'd have had from four rounds of mutual cooperation. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
