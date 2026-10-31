// #63 · Battle of Words — a capital doubles a letter; the team with more winning WORDS wins.
// Three readings go wrong, and none of them is exotic:
//   - a capital letter is worth DOUBLE its lowercase value, not "a different letter". It is the whole
//     twist: "Z" is 52, exactly the same as "zz", and "Hello" outscores "hello" by 8 (h is 8, H is 16).
//     Lowercase the input first and the second official case ("Hello world" vs "hello world") ties.
//   - the winner is whoever wins more BATTLES, not whoever has the larger total. A big word that
//     beats its opponent by 100 still counts as one win. Summing points answers a different question.
//   - a tie wins for nobody: equal words are not wins for either side, so they do not move the count.
// ONE approach, deliberately. The work is a single pass over the words with a constant-size inner sum,
// there is no second mental model that does less, and the only way to make a "worse" version is to make
// it wrong (CONTRIBUTING Tier 3 §1). A second tab would be a strawman.
// Click "Z a / zz z": the capital Z ties zz, and the demo scores the two wrong readings in red.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 7 official freeCodeCamp cases in the grader's order, then one of ours.
//   Z a / zz z - ours. A capital Z (52) ties the lowercase pair zz (52), so the first battle is a
//     tie that no official input produces, and the second battle (1 v 26) is what decides it.
const CASES: [string, string][] = [
  ["hello world", "hello word"],
  ["Hello world", "hello world"],
  ["lorem ipsum", "kitty ipsum"],
  ["hello world", "world hello"],
  ["git checkout", "git switch"],
  ["Cheeseburger with fries", "Cheeseburger with Fries"],
  ["We must never surrender", "Our team must win"],
  ["Z a", "zz z"],
];
const OFFICIAL = 7; // CASES[0..6] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, string> = {
  "hello world|hello word": "We win",
  "Hello world|hello world": "We win",
  "lorem ipsum|kitty ipsum": "We lose",
  "hello world|world hello": "Draw",
  "git checkout|git switch": "We win",
  "Cheeseburger with fries|Cheeseburger with Fries": "We lose",
  "We must never surrender|Our team must win": "Draw",
};

// a-z -> 1-26, A-Z -> 2-52 (double). Anything else is 0 so a typo in the box cannot crash the demo.
const letter = (c: string) =>
  c >= "a" && c <= "z"
    ? c.codePointAt(0)! - 96
    : c >= "A" && c <= "Z"
      ? 2 * (c.codePointAt(0)! - 64)
      : 0;
const value = (w: string) => w.split("").reduce((s, c) => s + letter(c), 0);
const verdict = (wins: number, losses: number) =>
  wins > losses ? "We win" : wins < losses ? "We lose" : "Draw";

// The statement guarantees equal word counts; the demo pads so a half-typed box does not throw.
function solve(ourTeam: string, opponent: string) {
  const ours = ourTeam.split(" ");
  const theirs = opponent.split(" ");
  const fights = ours.map((w, i) => {
    const o = theirs[i] ?? "";
    const a = value(w);
    const b = value(o);
    return { w, o, a, b, r: a > b ? "win" : b > a ? "loss" : "tie" };
  });
  const wins = fights.filter((f) => f.r === "win").length;
  const losses = fights.filter((f) => f.r === "loss").length;
  return { fights, wins, losses, out: verdict(wins, losses) };
}

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .bw-wrap { display:flex; flex-direction:column; gap:12px; }
    .bw-rows { display:flex; flex-direction:column; gap:4px; }
    .bw-row { display:grid; grid-template-columns:1fr 70px 1fr; gap:10px; align-items:baseline; font:13px var(--mono); padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--panel-2); }
    .bw-row .r { text-align:right; }
    .bw-row .v { text-align:center; font-weight:800; }
    .bw-row.win { border-color:var(--good); background:color-mix(in srgb, var(--good) 12%, transparent); }
    .bw-row.win .v { color:var(--good); }
    .bw-row.loss { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 11%, transparent); }
    .bw-row.loss .v { color:var(--danger); }
    .bw-row.tie { opacity:.6; }
    .bw-row.tie .v { color:var(--muted); }
    .bw-row b { color:var(--text); }
    .bw-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .bw-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .bw-r b { color:var(--text); }
    .bw-r.hot { border-color:var(--danger); color:var(--danger); }
    .bw-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inA = el("input");
  inA.type = "text";
  inA.value = CASES[1]![0];
  inA.style.width = "190px";
  const inB = el("input");
  inB.type = "text";
  inB.value = CASES[1]![1];
  inB.style.width = "190px";
  ctl.append(el("span", "ctl-label", "our team"), inA, el("span", "ctl-label", "opponent"), inB);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach(([a, b], i) => {
    const c = el("button", "chip", `${esc(a)} vs ${esc(b)}`);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inA.value = a;
      inB.value = b;
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  [inA, inB].forEach((t) => t.addEventListener("input", render));
  render();

  function render() {
    const r = solve(inA.value, inB.value);
    out.innerHTML = "";
    const wrap = el("div", "bw-wrap");
    const want = EXPECTED[`${inA.value}|${inB.value}`];

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === r.out ? "ok" : "no"}`,
        `battle("${esc(inA.value)}", "${esc(inB.value)}") → "${r.out}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected "${want}"`));
    line.append(
      el(
        "span",
        "opcount cool",
        `<span class="n">${r.fights.length}</span> ${r.fights.length === 1 ? "battle" : "battles"} · ${r.wins} won, ${r.losses} lost`,
      ),
    );
    wrap.append(line);

    // The statement's own picture: word against word, value against value.
    const rows = el("div", "bw-rows");
    r.fights.forEach((f) =>
      rows.append(
        el(
          "div",
          `bw-row ${f.r}`,
          `<span><b>${esc(f.w)}</b> = ${f.a}</span><span class="v">${
            f.r === "win" ? "&gt;" : f.r === "loss" ? "&lt;" : "="
          }</span><span class="r"><b>${esc(f.o)}</b> = ${f.b}</span>`,
        ),
      ),
    );
    wrap.append(rows);

    // The wrong readings, scored on the same input.
    const flat = solve(inA.value.toLowerCase(), inB.value.toLowerCase());
    const totA = r.fights.reduce((s, f) => s + f.a, 0);
    const totB = r.fights.reduce((s, f) => s + f.b, 0);
    const byTotal = verdict(totA, totB);
    const cmp = el("div", "bw-cmp");
    (
      [
        [`ignore capitals (lowercase first)`, flat.out],
        [`bigger total points (${totA} v ${totB})`, byTotal],
      ] as [string, string][]
    ).forEach(([name, v]) =>
      cmp.append(
        el(
          "div",
          `bw-r${v !== r.out ? " hot" : ""}`,
          `${name} <b>${v}</b>${v !== r.out ? " ✗" : ""}`,
        ),
      ),
    );
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(r, flat.out, byTotal)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each preset was picked to land on a different one.
function noteFor(r: ReturnType<typeof solve>, flat: string, byTotal: string) {
  const ties = r.fights.filter((f) => f.r === "tie").length;
  if (flat !== r.out)
    return `A capital letter is worth <b>double</b>, and that decides this one. Lowercase everything first and the answer becomes <b>"${flat}"</b> instead of <b>"${r.out}"</b>. The doubling also makes a capital collide with a pair: <code class='inl'>Z</code> is 52 and so is <code class='inl'>zz</code>, which is why a single capital can tie a longer lowercase word.`;
  if (byTotal !== r.out)
    return `The winner is the team with more <i>winning words</i>, not more points. Here the totals say <b>"${byTotal}"</b> but the battles say <b>"${r.out}"</b>: one big word can out-score the rest and still be a single win.`;
  if (ties === r.fights.length)
    return `Every battle is a tie, so nobody wins a single word and the answer is <b>"Draw"</b>. A tie is not a win for either side.`;
  return `<b>${r.wins}</b> won, <b>${r.losses}</b> lost${ties ? `, <b>${ties}</b> tied (a tie scores for nobody)` : ""}, so <b>"${r.out}"</b>. The two wrong readings happen to agree on this input, which is why one lucky case proves nothing.`;
}

// ── STEP — the word-by-word battle loop ─────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">battle</span>(<span class="tok" data-t="arg">ourTeam, opponent</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> letter = (c) =&gt; <span class="tok" data-t="lower">c === c.<span class="fn">toLowerCase</span>()</span>`,
  },
  {
    ln: 3,
    html: `    ? c.<span class="fn">codePointAt</span>(0) - 96 : <span class="tok" data-t="double">2 * (c.<span class="fn">codePointAt</span>(0) - 64)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> value = (w) =&gt; w.split("").<span class="fn">reduce</span>((s, c) =&gt; s + <span class="fn">letter</span>(c), 0);`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> ours = <span class="tok" data-t="ours">ourTeam.<span class="fn">split</span>(<span class="st">" "</span>)</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">const</span> theirs = <span class="tok" data-t="theirs">opponent.<span class="fn">split</span>(<span class="st">" "</span>)</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">let</span> wins = <span class="tok" data-t="zero">0</span>, losses = 0;`,
  },
  {
    ln: 8,
    html: `  <span class="k">for</span> (<span class="k">let</span> i = 0; <span class="tok" data-t="loop">i &lt; ours.length</span>; i++) {`,
  },
  {
    ln: 9,
    html: `    <span class="k">const</span> a = <span class="tok" data-t="a"><span class="fn">value</span>(ours[i])</span>;`,
  },
  {
    ln: 10,
    html: `    <span class="k">const</span> b = <span class="tok" data-t="b"><span class="fn">value</span>(theirs[i])</span>;`,
  },
  {
    ln: 11,
    html: `    <span class="k">if</span> (<span class="tok" data-t="gt">a &gt; b</span>) wins++;`,
  },
  {
    ln: 12,
    html: `    <span class="k">else if</span> (<span class="tok" data-t="lt">b &gt; a</span>) losses++;`,
  },
  { ln: 13, html: `  }` },
  {
    ln: 14,
    html: `  <span class="k">if</span> (<span class="tok" data-t="more">wins &gt; losses</span>) <span class="k">return</span> <span class="st">"We win"</span>;`,
  },
  {
    ln: 15,
    html: `  <span class="k">if</span> (<span class="tok" data-t="fewer">wins &lt; losses</span>) <span class="k">return</span> <span class="st">"We lose"</span>;`,
  },
  { ln: 16, html: `  <span class="k">return</span> <span class="st">"Draw"</span>;` },
  { ln: 17, html: `}` },
];

// A word's value spelled out, so the note can show where the number came from.
const spell = (w: string) =>
  w
    .split("")
    .map((c) => letter(c))
    .join("+") + (w.length > 1 ? `=${value(w)}` : "");

// The step input takes "our team / opponent" as one field, because mountDebugger hands the trace a
// single value. Words are letters only, so "/" never appears inside a team.
const STEP_PRESETS = CASES.map(([a, b]) => `${a} / ${b}`);
const splitPair = (raw: string) => {
  const [a = "", b = ""] = raw.split("/");
  return [a.trim(), b.trim()] as const;
};

type StepExtra = {
  focus?: string;
  changed?: string[];
  eval?: { expr: string; val: boolean };
  done?: boolean;
  result?: string;
  ret?: { value: string };
};
type Emit = (line: number, note: string, x?: StepExtra) => void;

function trace(raw: string) {
  const [ourTeam, opponent] = splitPair(raw);
  const steps: DbgStep[] = [];
  const ours = ourTeam.split(" ");
  const theirs = opponent.split(" ");
  let wins = 0;
  let losses = 0;
  let i = 0;
  let a = 0;
  let b = 0;
  const log: string[] = [];

  const S: Emit = (line, note, x = {}) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { ourTeam: `"${ourTeam}"`, opponent: `"${opponent}"` };
    if (line >= 5) vars["ours"] = JSON.stringify(ours); // `const ours` is line 5
    if (line >= 6) vars["theirs"] = JSON.stringify(theirs); // `const theirs` is line 6
    if (line >= 7) {
      vars["wins"] = wins; // `let wins` is line 7
      vars["losses"] = losses;
    }
    const inLoop = line >= 8 && line <= 12; // i, a, b leave scope at the closing brace
    if (inLoop) vars["i"] = i;
    if (inLoop && line >= 9) vars["a"] = a;
    if (inLoop && line >= 10) vars["b"] = b;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `battle("${ourTeam}", "${opponent}")`,
          vars,
          changed: x.changed ?? [],
          // The battle log exists once the counters do, then only grows.
          structs: line >= 7 ? [{ label: "battles so far", items: [...log], newest: true }] : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Two teams, one word each per battle: <b>${ours.length}</b> battle${ours.length === 1 ? "" : "s"} here. A word's value is the sum of its letters, and the team that wins <i>more battles</i> wins, which is a different thing from having more points. The helpers come first, then the count.`,
    { focus: "arg" },
  );
  S(
    2,
    `A letter is lowercase when it equals its own lowercase form: <code class='inl'>c === c.toLowerCase()</code>. That one test splits the alphabet into the two scoring rules. Lowercase <code class='inl'>a</code> to <code class='inl'>z</code> is worth 1 to 26: the char code minus 96.`,
    { focus: "lower" },
  );
  S(
    3,
    `Otherwise the letter is a capital, worth <b>double</b>: <code class='inl'>A</code> is code 65, so <code class='inl'>65 - 64 = 1</code>, times 2 is <b>2</b>; <code class='inl'>Z</code> is <b>52</b>. That is the same as <code class='inl'>zz</code>, which is why a capital can tie a longer lowercase word.`,
    { focus: "double" },
  );
  S(
    4,
    `<code class='inl'>value(w)</code> adds up <code class='inl'>letter(c)</code> over every character of the word. Nothing here runs yet; the next lines call it once per word.`,
  );
  S(
    5,
    `Split our sentence on single spaces: <b>${ours.length}</b> word${ours.length === 1 ? "" : "s"}. The statement guarantees single spaces and letters only, so a plain <code class='inl'>split(" ")</code> is enough.`,
    { focus: "ours", changed: ["ours"] },
  );
  S(
    6,
    `The opponent's sentence splits the same way. The statement guarantees the same number of words, so <code class='inl'>theirs[i]</code> always exists when <code class='inl'>ours[i]</code> does.`,
    { focus: "theirs", changed: ["theirs"] },
  );
  S(
    7,
    `Two counters, both at 0: how many battles each side won. They are separate on purpose, because a tie raises neither, so <code class='inl'>losses</code> is not just "the rest".`,
    { focus: "zero", changed: ["wins", "losses"] },
  );

  for (i = 0; i < ours.length; i++) {
    const ow = ours[i]!;
    const tw = theirs[i] ?? "";
    S(
      8,
      `<b>${i} &lt; ${ours.length}</b>: battle ${i + 1} of ${ours.length}, <b>${esc(ow)}</b> against <b>${esc(tw)}</b>.`,
      { focus: "loop", eval: { expr: `${i} < ${ours.length}`, val: true }, changed: ["i"] },
    );
    a = value(ow);
    S(
      9,
      `Our <b>${esc(ow)}</b> is worth ${spell(ow)}. Each capital in it counts double, each lowercase once.`,
      { focus: "a", changed: ["a"] },
    );
    b = value(tw);
    S(10, `Their <b>${esc(tw)}</b> is worth ${spell(tw)}.`, { focus: "b", changed: ["b"] });
    if (a > b) {
      S(
        11,
        `<b>${a} &gt; ${b}</b>: we win this battle, so <code class='inl'>wins</code> goes up by one.`,
        {
          focus: "gt",
          eval: { expr: `${a} > ${b}`, val: true },
        },
      );
      wins++;
      log.push(`${ow} ${a} > ${b} ${tw}`);
      S(11, `<code class='inl'>wins</code> is now <b>${wins}</b>.`, {
        focus: "gt",
        changed: ["wins"],
      });
    } else {
      S(
        11,
        `<b>${a} &gt; ${b}</b> is false, so we did not win. It is a loss or a tie; line 12 tells them apart.`,
        {
          focus: "gt",
          eval: { expr: `${a} > ${b}`, val: false },
        },
      );
      if (b > a) {
        S(
          12,
          `<b>${b} &gt; ${a}</b>: they win this one, so <code class='inl'>losses</code> goes up by one.`,
          {
            focus: "lt",
            eval: { expr: `${b} > ${a}`, val: true },
          },
        );
        losses++;
        log.push(`${ow} ${a} < ${b} ${tw}`);
        S(12, `<code class='inl'>losses</code> is now <b>${losses}</b>.`, {
          focus: "lt",
          changed: ["losses"],
        });
      } else {
        S(
          12,
          `<b>${b} &gt; ${a}</b> is false too: the words are worth the same (<b>${a}</b>), a tie. Neither counter moves, because a tie is a win for nobody.`,
          {
            focus: "lt",
            eval: { expr: `${b} > ${a}`, val: false },
          },
        );
        log.push(`${ow} ${a} = ${b} ${tw}`);
      }
    }
  }

  S(
    8,
    `<b>${i} &lt; ${ours.length}</b> is false: every word has fought. Final count is <b>${wins}</b> won, <b>${losses}</b> lost.`,
    { focus: "loop", eval: { expr: `${i} < ${ours.length}`, val: false } },
  );

  verdictSteps(S, wins, losses);

  return steps;
}

// Lines 14 to 16: the two comparisons that turn the battle counts into the answer.
function verdictSteps(S: Emit, wins: number, losses: number) {
  const out = verdict(wins, losses);
  const retNote = (n: string) => `<b>Return "${out}".</b> ${n}`;
  S(
    14,
    wins > losses
      ? `<b>${wins} &gt; ${losses}</b> is true. ${retNote("More wins than losses, so we win.")}`
      : `<b>${wins} &gt; ${losses}</b> is false: we are not ahead. Check the other direction.`,
    wins > losses
      ? {
          focus: "more",
          eval: { expr: `${wins} > ${losses}`, val: true },
          done: true,
          result: out,
          ret: { value: `"${out}"` },
        }
      : { focus: "more", eval: { expr: `${wins} > ${losses}`, val: false } },
  );
  if (wins <= losses) {
    S(
      15,
      wins < losses
        ? `<b>${wins} &lt; ${losses}</b> is true. ${retNote("Fewer wins than losses, so we lose.")}`
        : `<b>${wins} &lt; ${losses}</b> is false: neither side is ahead.`,
      wins < losses
        ? {
            focus: "fewer",
            eval: { expr: `${wins} < ${losses}`, val: true },
            done: true,
            result: out,
            ret: { value: `"${out}"` },
          }
        : { focus: "fewer", eval: { expr: `${wins} < ${losses}`, val: false } },
    );
    if (wins === losses)
      S(
        16,
        retNote(
          `Equal wins (${wins} each) fall through both tests. Ties inside the battles never counted, so a tied word and a swapped pair both end here.`,
        ),
        { done: true, result: out, ret: { value: `"${out}"` } },
      );
  }
}

export default {
  n: 63,
  id: "battle-of-words",
  title: "Battle of Words",
  dates: ["2025-10-12"],
  statement: `Given two sentences, <b>your team</b> and an <b>opposing team</b>, each word of yours battles the word in the same position of theirs. Both sentences have the same number of words, separated by single spaces, and contain only letters. A word's value is the <b>sum of its letters</b>: <code class="inl">a</code> to <code class="inl">z</code> are <b>1 to 26</b>, and a <b>capital letter doubles</b> its value (<code class="inl">A</code> is 2, <code class="inl">Z</code> is 52). A word wins if its value is <b>greater</b> than the opposing word's. Return <code class="inl">"We win"</code> if your team wins more words, <code class="inl">"We lose"</code> if it wins fewer, and <code class="inl">"Draw"</code> if the counts are equal. <span class="rule">Example: <code class="inl">battle("hello world", "hello word")</code> → <code class="inl">"We win"</code> — hello ties hello, and world (72) beats word (60).</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(total letters)",
      approach: `Score each pair of words, count who won, compare the counts. <b>A capital is double, not different.</b> The test <code class='inl'>c === c.toLowerCase()</code> splits the two rules, and doubling is what makes <code class='inl'>Z</code> (52) equal <code class='inl'>zz</code>. Lowercase the sentences first and official case 2 ties instead of winning. <b>Count battles, not points.</b> The winner has more winning words, so a huge word is still one win; summing both teams' points answers a different question, and the demo scores that reading in red beside the real one. <b>A tie is a win for nobody.</b> Equal words leave both counters alone, which is why <code class='inl'>losses</code> is its own counter and not <code class='inl'>words - wins</code>. <b>Z a / zz z</b> is ours: the first battle is a 52 v 52 tie that no official input produces, and the second (1 v 26) then decides it. The statement guarantees equal word counts and letters only, so there is no validation; the demo pads a missing word with nothing so a half-typed box does not throw.`,
      code: `// Score each word, count battles won and lost, compare the counts.
function battle(ourTeam: string, opponent: string): string {
  const letter = (c: string) =>
    c === c.toLowerCase() ? c.codePointAt(0)! - 96 : 2 * (c.codePointAt(0)! - 64);
  const value = (w: string) => w.split("").reduce((s, c) => s + letter(c), 0);
  const ours = ourTeam.split(" ");
  const theirs = opponent.split(" ");
  let wins = 0, losses = 0;
  for (let i = 0; i < ours.length; i++) {
    const a = value(ours[i]);
    const b = value(theirs[i]);
    if (a > b) wins++;          // a tie moves neither counter
    else if (b > a) losses++;
  }
  if (wins > losses) return "We win";
  if (wins < losses) return "We lose";
  return "Draw";
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "one battle per round",
      approach: `The loop one battle at a time, with <code class='inl'>ours</code>, <code class='inl'>theirs</code>, the counters and the per-word values appearing only once their lines have run, and a log of each battle below. Pairs go in one box as <code class='inl'>our team / opponent</code>. The first four official cases are the short ones: <b>hello world / hello word</b> is a tie then a win, <b>Hello world / hello world</b> turns on a single capital, and <b>hello world / world hello</b> ends level. <b>Cheeseburger with fries / Cheeseburger with Fries</b> is the long one, and its last battle is the only decider. <b>Z a / zz z</b> is ours: the first battle ties on 52 v 52. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger<string>(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "our team / opponent =",
            value: STEP_PRESETS[0]!,
            presets: STEP_PRESETS,
            hint: "separated by /",
          },
        }),
    },
  ],
} satisfies Challenge;
