// #359 · Golf Handicap Calculator — the averaging is free; the rounding is the problem.
// Subtract par from score per round, average the differentials, round to one decimal.
// Three lines of arithmetic and exactly one decision, which is the last one:
//   Number(mean.toFixed(1))        rounds the VALUE, ties AWAY FROM ZERO
//   Math.round(mean * 10) / 10     rounds a scaled COPY, ties toward +∞
// They disagree the moment the mean is negative and lands on an exact .x5 — which is
// normal in golf, because an under-par round has a NEGATIVE differential. On −2.25 the
// first gives −2.3 and the second −2.2. freeCodeCamp's five cases are all ≥ 0, so both
// expressions score 5/5 and the grader cannot tell them apart. Case 7 is invented to
// separate them.
// (The ×10 also invents ties outright: 0.15 is really 0.14999999999999999445, but
// 0.15 * 10 is exactly 1.5, so Math.round says 0.2 where the nearest tenth is 0.1.)
// And `toFixed` alone returns a STRING — the grader compares with ===, so it fails all
// five, including the ones where no rounding happens at all.
// ONE approach, and the disagreement is exactly why: two graded variants must never
// disagree on the answer (CONTRIBUTING Tier 3), and on case 7 these two do — so the
// Math.round(mean * 10) / 10 alternative ships as a comparison row inside the demo
// rather than as a second tab.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader lists them.
// Cases 6–7 are invented. Each case lands somewhere different:
//   1  every round on par        → all differentials 0, mean 0, nothing to round
//   2  four over-par rounds      → mean is exactly 6, an integer
//   3  mean 8.25                 → a POSITIVE exact tie; both roundings agree, .5 goes up
//   4  par differs per round     → the two arrays must be read in lockstep, not summed apart
//   5  nine-hole rounds          → mean 11.666…, a repeating decimal, no tie anywhere
//   6  a plus golfer             → every differential NEGATIVE, mean −1.833…, rounds to −1.8
//   7  the boundary              → mean −2.25: toFixed → −2.3, Math.round(×10)/10 → −2.2
// The official set never produces a negative mean, so case 7 is the only one that
// separates the two rounding expressions — it is the module's whole thesis.
const CASES = [
  { scores: [72, 72, 72],                 pars: [72, 72, 72],             label: "all on par" },
  { scores: [80, 76, 78, 78],             pars: [72, 72, 72, 72],         label: "whole number" },
  { scores: [42, 45, 46, 44],             pars: [36, 36, 36, 36],         label: "8.25 · tie" },
  { scores: [85, 80, 76, 79, 82],         pars: [72, 72, 72, 71, 71],     label: "pars vary" },
  { scores: [41, 50, 48, 52, 46, 49],     pars: [35, 37, 35, 37, 35, 37], label: "nine holes" },
  { scores: [70, 69, 71, 70, 72, 69],     pars: [72, 72, 72, 72, 72, 72], label: "under par" },
  { scores: [70, 69, 71, 69],             pars: [72, 72, 72, 72],         label: "−2.25 · boundary" },
];

// The solution itself, split so the demo and the trace share it and cannot drift.
const differentials = (scores, pars) => scores.map((score, i) => score - pars[i]);
const meanOf = (diffs) => diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
const roundOne = (mean) => Number(mean.toFixed(1));        // what ships
const naiveOne = (mean) => Math.round(mean * 10) / 10;     // what most people reach for

// Differentials are signed by nature — a round under par is a negative number, and the
// sign is the thing the reader has to keep in view, so never render a bare digit.
const signed = (d) => (d > 0 ? "+" + d : d < 0 ? "−" + Math.abs(d) : "0");
const dClass = (d) => (d < 0 ? "under" : d > 0 ? "over" : "even");
// "−2 − 3 − 1 − 3", not "−2 + −3 + −1 + −3": the running sum is an expression, so a
// negative differential turns the + into a −.
const sumExpr = (diffs) => diffs.map((d, i) =>
  (i === 0 ? (d < 0 ? `&minus;${-d}` : String(d)) : d < 0 ? ` &minus; ${-d}` : ` + ${d}`)).join("");

// A tie only counts as a REAL tie if the double sits exactly on the .x5 — and most
// don't. 8.8 is really 8.8000000000000007105 and 0.15 is really 0.14999999999999999445,
// which is the whole reason `mean * 10` can invent a boundary the mean never had.
const exactly = (mean) => mean.toPrecision(20).replace(/0+$/, "") === String(mean);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .gf-card { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--panel); margin:4px 0 0; }
    .gf-row { display:grid; grid-template-columns:44px minmax(60px,1fr) minmax(60px,1fr) 96px 30px; align-items:center; gap:10px; padding:7px 12px; }
    .gf-row + .gf-row { border-top:1px solid var(--border); }
    .gf-row.gf-head { background:var(--panel-2); font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); padding:8px 12px; }
    .gf-rn { font:700 12px var(--mono); color:var(--muted); }
    .gf-row input { width:100%; }
    .gf-d { justify-self:start; font:800 14px var(--mono); padding:3px 12px; border-radius:20px;
            border:1px solid var(--border); background:var(--panel-2); font-variant-numeric:tabular-nums; }
    .gf-d.under { color:var(--good); border-color:color-mix(in srgb, var(--good) 50%, var(--border)); }
    .gf-d.over  { color:var(--danger); border-color:color-mix(in srgb, var(--danger) 50%, var(--border)); }
    .gf-d.even  { color:var(--muted); }
    .gf-x { width:26px; height:26px; border-radius:6px; cursor:pointer; font:700 13px var(--sans);
            background:var(--panel-2); border:1px solid var(--border); color:var(--muted); }
    .gf-x:hover:not(:disabled) { border-color:var(--danger); color:var(--danger); }
    .gf-x:disabled { opacity:.3; cursor:default; }
    .gf-sum { font:13px var(--mono); color:var(--muted); margin:14px 0 3px; }
    .gf-sum b { color:var(--text); font-size:15px; }
    .gf-bits { font:11.5px var(--mono); color:var(--muted); opacity:.7; word-break:break-all; margin-bottom:2px; }
    .gf-cmp { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:10px 0 0; }
    .gf-c { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:14px; padding:11px 13px; font:12.5px var(--mono); }
    .gf-c + .gf-c { border-top:1px solid var(--border); }
    .gf-c .gf-v { font:800 22px var(--mono); font-variant-numeric:tabular-nums; }
    .gf-lab { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .gf-c.ship { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .gf-c.ship .gf-v { color:var(--accent); }
    .gf-c.ship .gf-lab { color:var(--accent); }
    .gf-c.other .gf-v { color:var(--muted); }
    .gf-c.other.split .gf-v { color:var(--danger); }
    .gf-c.other.split .gf-lab { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  // Open on the official 8.25 case — a real rounding decision that both expressions
  // get right — so the "−2.25 · boundary" chip is a change the reader makes, not a
  // state they arrive in.
  let rounds = CASES[2].scores.map((s, i) => ({ score: s, par: CASES[2].pars[i] }));

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { rounds = c.scores.map((s, i) => ({ score: s, par: c.pars[i] })); render(); };
    pre.append(chip);
  });

  const card = el("div", "gf-card");
  const out = el("div");
  const add = el("button", "chip", "+ add round");
  add.onclick = () => { const last = rounds[rounds.length - 1]; rounds.push({ score: last.par, par: last.par }); render(); };
  const addBar = el("div", "controls"); addBar.append(add);

  host.append(
    el("div", "note", "Type a score or a par, add or drop rounds, and watch the mean move. With four rounds every odd total lands on an exact <b>×.×5</b> — the boundary where the two rounding expressions below can part company. Push the mean <b>below zero</b> and onto a .25 or .75 and they will."),
    pre, card, addBar, out,
  );
  render();

  function render() {
    card.innerHTML = "";
    const head = el("div", "gf-row gf-head");
    head.append(el("div", null, "rnd"), el("div", null, "score"), el("div", null, "par"), el("div", null, "differential"), el("div", null, ""));
    card.append(head);

    rounds.forEach((r, i) => {
      const row = el("div", "gf-row");
      row.append(el("div", "gf-rn", String(i + 1)));

      const sc = el("input"); sc.type = "number"; sc.value = r.score; sc.min = 1;
      sc.oninput = () => { r.score = Math.round(+sc.value) || 0; render(); };
      const pr = el("input"); pr.type = "number"; pr.value = r.par; pr.min = 1;
      pr.oninput = () => { r.par = Math.round(+pr.value) || 0; render(); };
      row.append(sc, pr);

      const d = r.score - r.par;
      row.append(el("div", "gf-d " + dClass(d), signed(d)));

      const kill = el("button", "gf-x", "×");
      kill.title = "drop this round";
      kill.disabled = rounds.length <= 1;
      kill.onclick = () => { rounds.splice(i, 1); render(); };
      row.append(kill);
      card.append(row);
    });

    const scores = rounds.map((r) => r.score), pars = rounds.map((r) => r.par);
    const diffs = differentials(scores, pars);
    const total = diffs.reduce((s, d) => s + d, 0);
    const mean = meanOf(diffs);
    const ship = roundOne(mean), naive = naiveOne(mean);
    const split = !Object.is(ship, naive);

    out.innerHTML = "";
    out.append(el("div", "gf-sum",
      `${sumExpr(diffs)} &nbsp;=&nbsp; <b>${total}</b>` +
      ` &nbsp;÷&nbsp; ${diffs.length} round${diffs.length === 1 ? "" : "s"} &nbsp;=&nbsp; <b>${mean}</b>`));
    if (!Number.isInteger(mean))
      out.append(el("div", "gf-bits", exactly(mean)
        ? `the double holds ${mean} exactly, so a tie here is a real one`
        : `the double actually holds ${mean.toPrecision(20)}, not the decimal above`));

    const cmp = el("div", "gf-cmp");
    const rowOf = (cls, expr, val, tag) => {
      const r = el("div", "gf-c " + cls);
      r.append(el("div", null, expr), el("div", "gf-lab", tag), el("div", "gf-v", String(val)));
      return r;
    };
    cmp.append(rowOf("ship", "Number(mean.toFixed(1))", ship, "returned"));
    cmp.append(rowOf("other" + (split ? " split" : ""), "Math.round(mean * 10) / 10", naive, split ? "disagrees" : "agrees"));
    out.append(cmp);

    // A REAL tie needs the double to sit exactly on the .x5 — plenty of means only
    // look like they do, and `mean * 10` turns those into ties that were never there.
    const scaled = mean * 10;
    const realTie = !Number.isInteger(mean) && Math.abs(scaled % 1) === 0.5 && exactly(mean);
    out.append(el("div", "note", split
      ? (realTie
        // A real tie that splits the two expressions can only be a negative one:
        // on a positive tie "half up" and "half away from zero" are the same rule.
        ? `A real tie, and the mean is <b>negative</b>. <code class='inl'>toFixed</code> strips the sign before rounding, so it goes <b>away from zero</b> → <b>${ship}</b>. <code class='inl'>Math.round</code> breaks every tie toward <b>+∞</b>, so <code class='inl'>Math.round(${scaled})</code> is ${Math.round(scaled)} → <b>${naive}</b>. That rule is not symmetric about zero, and half of golf lives below zero.`
        : `Multiplying by 10 <b>manufactured</b> a tie the mean never had. The mean's double is ${mean.toPrecision(20)} — not on the halfway point at all — so the nearest tenth really is <b>${ship}</b>, which is what <code class='inl'>toFixed</code> reports. But <code class='inl'>mean * 10</code> lands on exactly ${scaled}, and <code class='inl'>Math.round</code> pushes that to <b>${naive}</b>. Rounding a scaled copy is not rounding the value.`)
      : realTie
        ? `An exact <b>×.×5</b> tie, and both expressions send it <b>up</b> to <b>${ship}</b> — because the mean is positive, "half up" and "half away from zero" are the same rule. Take the mean below zero and they stop being the same rule.`
        : `No tie here: the mean is <b>${mean}</b> and the nearest tenth is unambiguous, so every rounding expression agrees on <b>${ship}</b>. That is why the trap survives — most inputs never reach a boundary. Try the <b>−2.25 · boundary</b> chip.`));

    out.append(el("div", "note", `Whatever the arithmetic, the return type is fixed: <code class='inl'>mean.toFixed(1)</code> is the <b>string</b> <code class='inl'>"${mean.toFixed(1)}"</code>, and the grader asserts with <code class='inl'>===</code>. Without <code class='inl'>Number()</code> this fails all five official cases — including <b>all on par</b>, where the answer is 0 and no rounding happens at all.`));
  }
}

// ── STEP — build the differentials, total them, divide, then the one decision ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">calculateHandicap</span>(<span class="tok" data-t="params">scores, pars</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> diffs = scores.<span class="fn">map</span>((score, i) =&gt; <span class="tok" data-t="diff">score - pars[i]</span>);` },
  { ln: 3, html: `  <span class="k">const</span> total = diffs.<span class="fn">reduce</span>((sum, d) =&gt; <span class="tok" data-t="acc">sum + d</span>, <span class="nu">0</span>);` },
  { ln: 4, html: `  <span class="k">const</span> mean = <span class="tok" data-t="mean">total / diffs.length</span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="num"><span class="fn">Number</span></span>(<span class="tok" data-t="fixed">mean.<span class="fn">toFixed</span>(<span class="nu">1</span>)</span>);` },
  { ln: 6, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { scores, pars } = CASES[k - 1];
  const steps = [];
  const diffs = [];
  let i = null, score = null;   // the map callback's bindings — alive only on line 2
  let sum = null, d = null;     // the reduce callback's bindings — alive only on line 3
  let total = null, mean = null;

  const S = (line, note, x = {}) => {
    const vars = { scores: `[${scores.join(", ")}]`, pars: `[${pars.join(", ")}]` };
    if (line === 2 && i !== null) { vars.i = i; vars.score = score; }
    if (line === 3 && sum !== null) { vars.sum = sum; if (d !== null) vars.d = d; }
    if (line >= 3 && total !== null) vars.total = total;   // `const total` binds when reduce returns
    if (line >= 4 && mean !== null) vars.mean = mean;
    const structs = [];
    if (line >= 2) structs.push({ label: "diffs", items: diffs.map(signed), newest: !!x.newest });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `calculateHandicap(${JSON.stringify(scores)}, …)`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Two <b>parallel</b> arrays: <code class='inl'>scores[j]</code> is only meaningful against <code class='inl'>pars[j]</code>, the course it was played on. ${new Set(pars).size > 1
    ? `Here the pars differ between rounds (${[...new Set(pars)].join(" and ")}), so the index is doing real work — pairing by position is the only thing that keeps round ${pars.indexOf(Math.min(...pars)) + 1} matched to its own course.`
    : `Every par is ${pars[0]} here, which is exactly when a mis-pairing would go unnoticed — case 4 is the one that punishes it.`}`,
    { focus: "params" });

  // Each shade of differential earns one full sentence of explanation; after that
  // it gets a short one, so a six-round trace doesn't repeat the same paragraph.
  const said = { under: false, even: false };
  for (let j = 0; j < scores.length; j++) {
    i = j; score = scores[j];
    const diff = scores[j] - pars[j];
    diffs.push(diff);
    let why;
    if (diff < 0) {
      why = said.under ? "Another round under par." : `Under par — so the differential is <b>negative</b>. Nothing downstream clamps it, and that is what eventually drags the mean below zero, where the two rounding expressions stop agreeing.`;
      said.under = true;
    } else if (diff > 0) {
      why = `Over par by ${diff}.`;
    } else {
      why = said.even ? "Level par again." : `Level par — this round adds nothing to the total, but it still counts in the <b>divisor</b>, so it drags the average toward zero.`;
      said.even = true;
    }
    S(2, `Round ${j + 1}: <b>${scores[j]} − ${pars[j]} = ${signed(diff)}</b>. ${why}`,
      { focus: "diff", changed: ["i", "score"], newest: true });
  }
  i = null; score = null;

  sum = 0;
  S(3, `<b>reduce</b> starts from the explicit seed <b>0</b>. Seeding it matters: with no initial value reduce would take <code class='inl'>diffs[0]</code> as the seed and throw outright on an empty array.`,
    { focus: "acc", changed: ["sum"] });
  let saidDown = false;
  for (let j = 0; j < diffs.length; j++) {
    d = diffs[j];
    const before = sum;
    sum += d;
    const note = diffs[j] < 0 && !saidDown ? " A negative differential pulls the total <i>down</i> — this is a signed sum, not a tally." : "";
    if (diffs[j] < 0) saidDown = true;
    S(3, `Fold in <b>${signed(diffs[j])}</b>: the running sum goes ${before} → <b>${sum}</b>.${note}`,
      { focus: "acc", changed: ["sum", "d"] });
  }
  total = sum; sum = null; d = null;
  S(3, `reduce hands back <b>${total}</b> and only now does <code class='inl'>total</code> exist — <code class='inl'>sum</code> and <code class='inl'>d</code> belonged to the callback and are gone with it.`,
    { focus: "acc", changed: ["total"] });

  mean = total / diffs.length;
  S(4, `<b>${total} / ${diffs.length} = ${mean}</b>. Divide once, at the end. Rounding each differential first and averaging the rounded values would be a different function — the spec rounds the <b>result</b>, not the parts.${Number.isInteger(mean)
    ? " This one landed on a whole number, so line 5 has nothing left to decide."
    : exactly(mean)
      ? ` The double holds <b>${mean}</b> exactly, so whatever line 5 decides about it is a decision about a real value, not about a rounding error.`
      : ` The double actually holds <b>${mean.toPrecision(20)}</b> — that, not the decimal you just read, is the number line 5 rounds.`}`,
    { focus: "mean", changed: ["mean"] });

  const fixed = mean.toFixed(1);
  const ship = Number(fixed);
  const naive = Math.round(mean * 10) / 10;
  const split = !Object.is(ship, naive);
  const scaled = mean * 10;

  S(5, `<b>toFixed(1)</b> rounds <b>${mean}</b> to the nearest tenth and returns the string <b>"${fixed}"</b>. Its rule is: drop the sign, pick the nearest tenth, and on an exact tie take the larger — so ties go <b>away from zero</b>. ${split
    ? (mean < 0
      ? `The alternative most people write, <code class='inl'>Math.round(mean * 10) / 10</code>, returns <b>${naive}</b> instead: <code class='inl'>Math.round(${scaled})</code> is <b>${Math.round(scaled)}</b>, because Math.round breaks ties toward <b>+∞</b> rather than away from zero. On a plus golfer that quietly reports a <b>better</b> handicap than they earned.`
      : `<code class='inl'>Math.round(mean * 10) / 10</code> returns <b>${naive}</b> instead — the multiply landed on exactly ${scaled} and invented a tie the mean never had.`)
    : `<code class='inl'>Math.round(mean * 10) / 10</code> also gives <b>${naive}</b> here — as it does on all five official cases. Load <b>case 7</b> to find the input that separates them.`}`,
    { focus: "fixed", eval: { expr: `Math.round(mean * 10) / 10 === ${ship}`, val: !split } });

  S(5, `<b>Number("${fixed}")</b> → <b>${ship}</b>. Not cosmetic: the grader asserts <code class='inl'>calculateHandicap(…) === ${ship}</code>, and <code class='inl'>"${fixed}" === ${ship}</code> is <b>false</b>. Returning the string fails every official case, including the all-on-par one where the answer is 0 and nothing was rounded.`,
    { focus: "num", done: true, result: ship, ret: { value: ship } });

  return steps;
}

export default {
  n: 359, id: "handicap", title: "Golf Handicap Calculator", dates: ["2026-08-04"],
  statement: `Given an array of golf <b>scores</b> and a matching array of course <b>pars</b>, each round's <b>differential</b> is <code class="inl">score − par</code>. Return the average of the differentials, <b>rounded to one decimal place</b>. <span class="rule">Example: <code class="inl">calculateHandicap([42, 45, 46, 44], [36, 36, 36, 36])</code> → <b>8.3</b> — the differentials are 6, 9, 10 and 8, which average to 8.25.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Map the two arrays down to one array of differentials, total it, divide. That part has nothing in it — the whole problem is the last line.<br><br><b>Round the value, not a scaled copy of it.</b> <code class='inl'>mean.toFixed(1)</code> rounds <code class='inl'>mean</code> itself, stripping the sign first, so an exact tie goes <b>away from zero</b>. <code class='inl'>Math.round(mean * 10) / 10</code> does two lossy things instead: the multiply can land on a <code class='inl'>.5</code> the mean never had, and <code class='inl'>Math.round</code> breaks every tie toward <b>+∞</b>. On <code class='inl'>−2.25</code> that is <b>−2.2</b> against <b>−2.3</b> — and negative differentials are not exotic here, they are what an under-par golfer produces every round.<br><br>Be clear about who caught this: <b>not the grader</b>. All five freeCodeCamp cases have a mean of 0 or more, and both expressions pass all five. The <b>−2.25 · boundary</b> preset is invented for exactly this.<br><br>Then <code class='inl'>Number(…)</code>, because <code class='inl'>toFixed</code> returns a <b>string</b> and the assertions use <code class='inl'>===</code>. Drop it and the module fails all five cases, including the one where the answer is <code class='inl'>0</code>.`,
      code: `// One pass to the differentials, one to their total, then a single rounding.
function calculateHandicap(scores: number[], pars: number[]): number {
  const diffs = scores.map((score, i) => score - pars[i]);
  const total = diffs.reduce((sum, d) => sum + d, 0);
  const mean = total / diffs.length;

  // Round the VALUE, not a scaled copy of it. toFixed strips the sign first, so a
  // tie goes away from zero — symmetric for the negative differentials an under-par
  // golfer produces. Math.round(mean * 10) / 10 breaks ties toward +Infinity and
  // turns -2.25 into -2.2. And Number() is not cosmetic: toFixed returns a string.
  return Number(mean.toFixed(1));
}`,
      mount,
    },
    {
      name: "Step through", cost: "the rounding step",
      approach: `Five lines, and four of them are bookkeeping. Watch <code class='inl'>diffs</code> fill one round at a time, then <code class='inl'>reduce</code> fold it to a total — note that <code class='inl'>sum</code> and <code class='inl'>d</code> vanish the moment the callback is done and <code class='inl'>total</code> comes into being.<br><br>The step that matters is line 5. It opens on <b>case 7</b>, where the mean is <code class='inl'>−2.25</code> and the two rounding expressions split: <b>−2.3</b> against <b>−2.2</b>. Step back through <b>case 3</b> (<code class='inl'>8.25</code>, the same tie with the sign flipped) and they agree — which is precisely why five official tests never noticed. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 7, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
