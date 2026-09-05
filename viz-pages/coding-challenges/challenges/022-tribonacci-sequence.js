// #22 · Tribonacci Sequence — the sequence you must return already IS the memo table.
// ONE approach, deliberately, and the same call #3 made on the same shape one number earlier.
// The naive reading is real — write T(i) = T(i−1) + T(i−2) + T(i−3), ask it once per index —
// and it is exponential. But making it the brute half of a toggle fails CONTRIBUTING's first
// test: the function has to hand back the whole sequence either way, so asking T(i) index by
// index is not a second mental model, it is declining to write into a table you are already
// required to fill. That is #3's "throw the array away deliberately", one term wider, and two
// neighbouring modules ruling opposite ways on identical grounds is exactly the incoherence
// the contract exists to prevent. So there is no Approach toggle here, on purpose.
//
// What the exponential reading is worth is a MEASUREMENT, and it lives inside the one demo.
// The "what recomputing would have cost" panel counts how many times each index would have
// been entered: 152,843 calls to produce twenty numbers, with T(2) reached 42,762 separate
// times, against 17 additions. That is overlapping subproblems made literal — one index
// arrived at by many paths — and it is computed in closed form, so nothing has to run.
// Three terms instead of two grow that cost at 1.8393ⁿ rather than φⁿ, which is why it is
// visible by length 20 here and only near length 35 for Fibonacci.
//
// The other half is the boundary, and it is #3's lesson with a third seed: `length` counts
// the seeds too, so at length 1 the answer is SHORTER than the input, and slice(0, length)
// clamps at both ends. Four of freeCodeCamp's six tests live there rather than in the sum.
import { el, mountDebugger } from "../shared.js";

// Cases 1–6 are freeCodeCamp's official tests, verbatim and in the grader's order. Four of the
// six are the length boundary (1, 0, 2, 3) — the official set is far more worried about
// truncation than about the recurrence, which is the tell that `slice` is doing most of the
// work and that the interesting question is elsewhere.
//
// Cases 7–9 are invented, because every official case seeds with three non-negative,
// non-decreasing numbers and so hides what the seeds can do:
//   7 · [1, 1, 1] is the Tribonacci sequence proper — 1,1,1,3,5,9,17,31 — whose consecutive
//       ratio converges on 1.8393, the tribonacci constant. That is the same number the cost
//       of recomputing grows at, and not by coincidence: the call tree IS the sequence.
//       (Fibonacci's φ ≈ 1.618 is the two-term version of the same constant.)
//   8 · [1, -1, 0] crosses zero and then runs downhill forever — nothing in "the sum of the
//       three preceding ones" promises growth; that was a property of 0, 0, 1.
//   9 · [0, 0, 1] × 22 is where the cost panel is widest inside the official seeds:
//       517,087 calls avoided for 19 additions done. The official set stops at 20.
const CASES = [
  { start: [0, 0, 1], len: 20, official: true, note: "official — the textbook sequence, 20 terms" },
  { start: [21, 32, 43], len: 1, official: true, note: "official — length 1: two of the three seeds are dropped" },
  { start: [0, 0, 1], len: 0, official: true, note: "official — length 0: all three seeds dropped" },
  { start: [10, 20, 30], len: 2, official: true, note: "official — length 2: still shorter than the seed" },
  { start: [10, 20, 30], len: 3, official: true, note: "official — length 3: the answer is the input, nothing is computed" },
  { start: [123, 456, 789], len: 8, official: true, note: "official — seeds far from 0/0/1" },
  { start: [1, 1, 1], len: 15, official: false, note: "invented — the Tribonacci numbers proper; ratio → 1.8393" },
  { start: [1, -1, 0], len: 12, official: false, note: "invented — crosses zero, then runs downhill" },
  { start: [0, 0, 1], len: 22, official: false, note: "invented — the widest gap: 517,087 calls avoided for 19 additions" },
];

const MAX_LEN = 40;
const N = (x) => x.toLocaleString("en-US");
const arr = (xs) => "[" + xs.join(", ") + "]";
const caseLabel = (c) => `${arr(c.start)} × ${c.len}`;

// The solution itself, shared by the demo and the trace so the two cannot drift.
const tribonacci = (start, length) => {
  const seq = start.slice(0, length);
  for (let i = 3; i < length; i++) seq.push(seq[i - 1] + seq[i - 2] + seq[i - 3]);
  return seq;
};

// What the recursive reading would have cost, computed WITHOUT running it. One entry of T(j)
// spawns exactly one entry each of T(j−1), T(j−2) and T(j−3), so pushing the counts downward
// from the top gives the whole histogram in `length` steps of arithmetic rather than 1.8393^n
// actual calls. Two things fall out of that: the panel stays instant at length 40 (thirty
// billion calls, which could not be run here), and the cost depends only on the indices — the
// seeds never enter into it.
function askCost(length) {
  const visits = new Array(Math.max(0, length)).fill(1); // one top-level ask per index
  for (let j = length - 1; j >= 3; j--) {
    visits[j - 1] += visits[j]; visits[j - 2] += visits[j]; visits[j - 3] += visits[j];
  }
  return { visits, calls: visits.reduce((a, b) => a + b, 0) };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .tb-wrap { display:flex; flex-direction:column; gap:13px; }
    .tb-row { display:flex; flex-wrap:wrap; gap:6px; }
    .tb-c { min-width:46px; padding:4px 7px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2);
            display:flex; flex-direction:column; align-items:center; gap:1px; font:800 13px var(--mono); color:var(--text); }
    .tb-c .ix { font:600 9px var(--sans); letter-spacing:.06em; color:var(--muted); }
    .tb-c.seed { border-style:dashed; border-color:var(--good); color:var(--good); }
    .tb-c.calc { cursor:pointer; }
    .tb-c.calc:hover { border-color:var(--accent); }
    .tb-c.src { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 10%, transparent); }
    .tb-c.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 24%, transparent); }
    .tb-eq { font:12.5px var(--mono); color:var(--muted); }
    .tb-eq b { color:var(--text); }
    .tb-eq .win { color:var(--accent); }
    .tb-key { display:flex; gap:14px; flex-wrap:wrap; font:11px var(--sans); color:var(--muted); }
    .tb-key i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; border:1px solid var(--border); }
    .tb-cost { border:1px dashed var(--border); border-radius:10px; padding:11px 13px; display:flex; flex-direction:column; gap:9px; }
    .tb-cost h5 { margin:0; font:700 11px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .tb-bars { display:flex; align-items:flex-end; gap:3px; height:96px; }
    .tb-bar { flex:1 1 0; min-width:5px; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:3px; }
    .tb-bar i { display:block; width:100%; border-radius:2px 2px 0 0; background:color-mix(in srgb, var(--danger) 42%, transparent); border:1px solid var(--danger); }
    .tb-bar.seed i { background:color-mix(in srgb, var(--warn) 42%, transparent); border-color:var(--warn); }
    .tb-bar b { font:600 9px var(--sans); color:var(--muted); }
  `));
}

const officialHit = (start, len) =>
  CASES.some((c) => c.official && c.len === len && c.start.every((v, k) => v === start[k]));

// ── The demo: the rolling window, plus what NOT keeping it would have cost ───
function mount(host) {
  ensureStyle();
  let focus = null; // null = follow the last computed term

  const ctl = el("div", "controls");
  const seeds = [0, 0, 1].map((v) => { const i = el("input"); i.type = "number"; i.value = String(v); i.style.width = "84px"; return i; });
  const lIn = el("input"); lIn.type = "range"; lIn.min = "0"; lIn.max = String(MAX_LEN); lIn.value = "20"; lIn.style.width = "180px";
  const lOut = el("span", "tag", "");
  ctl.append(el("span", "ctl-label", "startSequence = ["), seeds[0], el("span", "ctl-label", ","), seeds[1],
             el("span", "ctl-label", ","), seeds[2], el("span", "ctl-label", "]"), el("span", "ctl-label", "length ="), lIn, lOut);

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", caseLabel(c));
    b.title = c.note;
    b.onclick = () => { seeds.forEach((s, k) => { s.value = String(c.start[k]); }); lIn.value = String(c.len); focus = null; render(); };
    pre.append(b);
  });

  const out = el("div");
  host.append(
    el("div", "note", "The first three numbers are <b>given</b>, not derived — so try seeds nobody's Tribonacci demo uses: make them <b>equal</b>, make one <b>negative</b>, make them <b>descend</b>. The rule never changes; only what you handed it does. Then drag <b>length</b> down through 3, 2, 1 and 0 and watch where the answer has to come from."),
    ctl, pre, out);
  seeds.forEach((s) => { s.oninput = () => { focus = null; render(); }; });
  lIn.oninput = () => { focus = null; render(); };
  render();

  function render() {
    const start = seeds.map((s) => Number(s.value));
    const len = Math.max(0, Math.min(MAX_LEN, Math.floor(+lIn.value) || 0));
    lOut.textContent = `length ${len}`;
    out.innerHTML = "";
    if (!start.every(Number.isFinite)) {
      out.append(el("div", "note", "All three seeds have to be numbers — the recurrence is pure addition and has nothing to fall back on if one is blank."));
      return;
    }

    const seq = tribonacci(start, len);
    const adds = Math.max(0, len - 3);
    const f = seq.length > 3 ? Math.min(Math.max(focus ?? seq.length - 1, 3), seq.length - 1) : -1;

    const wrap = el("div", "tb-wrap");
    wrap.append(el("div", "result-line",
      `<span class="badge ok">${arr(seq.slice(0, 8))}${seq.length > 8 ? " …" : ""}</span>` +
      `<span class="opcount cool"><span class="n">${adds}</span> addition${adds === 1 ? "" : "s"}</span>` +
      `<span class="opcount"><span class="n">${Math.min(len, 3)}</span> copied from the seed</span>` +
      (officialHit(start, len) ? `<span class="badge ok">official test ✓</span>` : "")));

    if (!seq.length) {
      wrap.append(el("div", "tb-eq", `returns <b>[]</b> — <code class='inl'>slice(0, 0)</code> drops all three seeds, and there is nothing to draw. That <i>is</i> the answer.`));
    } else {
      const row = el("div", "tb-row");
      seq.forEach((v, i) => {
        const src = f >= 3 && i >= f - 3 && i < f;
        const cell = el("div", "tb-c" + (i < 3 ? " seed" : " calc") + (i === f ? " on" : src ? " src" : ""),
          `<span class="ix">${i}</span><span>${v}</span>`);
        cell.title = i < 3 ? "given — copied out of startSequence" : `computed: seq[${i - 3}] + seq[${i - 2}] + seq[${i - 1}]`;
        if (i >= 3) cell.onclick = () => { focus = i; render(); };
        row.append(cell);
      });
      wrap.append(row);
      wrap.append(el("div", "tb-key",
        `<span><i style="border-style:dashed;border-color:var(--good)"></i>given (seed)</span>` +
        `<span><i style="border-color:var(--accent);background:color-mix(in srgb, var(--accent) 10%, transparent)"></i>the three-wide window</span>` +
        `<span><i style="border-color:var(--accent);background:color-mix(in srgb, var(--accent) 24%, transparent)"></i>the term it sums to — click any computed cell</span>`));
      wrap.append(el("div", "tb-eq", f >= 3
        ? `<b>seq[${f}]</b> = seq[${f - 3}] + seq[${f - 2}] + seq[${f - 1}] = <span class="win">${seq[f - 3]}</span> + <span class="win">${seq[f - 2]}</span> + <span class="win">${seq[f - 1]}</span> = <b>${seq[f]}</b>`
        : `Nothing here was computed — every cell on screen was <b>copied</b> out of <code class='inl'>startSequence</code>.`));
    }

    wrap.append(costPanel(len, adds));
    wrap.append(el("div", "note", len <= 3
      ? boundaryNote(start, len)
      : `The window is three wide and it only ever moves <b>right</b>, so every operand it needs is already sitting in <code class='inl'>seq</code> — written there by an earlier turn of this same loop. There is no cache to add and no memo to invalidate, because the array you were <i>required</i> to return is the table: filling position <b>i</b> once is the entire mechanism. That is the whole reason this problem has one approach and not two.`));
    out.append(wrap);
  }
}

// The measurement that used to want its own tab. Not a second approach — a price tag on the
// instinct, shown next to the thing that avoids it.
function costPanel(len, adds) {
  const box = el("div", "tb-cost");
  box.append(el("h5", null, "What recomputing would have cost"));

  if (len === 0) {
    box.append(el("div", "tb-eq", `Length 0, so <code class='inl'>T</code> would never have been called even once. Neither reading can be wrong about a boundary it never reaches — this one is settled by <code class='inl'>slice(0, 0)</code> before any arithmetic happens.`));
    return box;
  }

  const { visits, calls } = askCost(len);
  box.append(el("div", "result-line",
    `<span class="opcount hot"><span class="n">${N(calls)}</span> call${calls === 1 ? "" : "s"} to a recursive T(i)</span>` +
    `<span class="muted mono">vs</span>` +
    `<span class="opcount cool"><span class="n">${adds}</span> addition${adds === 1 ? "" : "s"} here</span>`));

  const peak = Math.max(...visits), worst = visits.indexOf(peak);
  const bars = el("div", "tb-bars");
  visits.forEach((v, k) => {
    const b = el("div", "tb-bar" + (k < 3 ? " seed" : ""),
      `<i style="height:${Math.max(2, Math.round(Math.sqrt(v / peak) * 76))}px"></i><b>${k}</b>`);
    b.title = `T(${k}) would be entered ${N(v)}×`;
    bars.append(b);
  });
  box.append(bars);
  box.append(el("div", "tb-eq",
    `bar height = how many times <b>T(k)</b> would be entered · worst is <b class="win">T(${worst})</b> at <b>${N(peak)}×</b> · <b>T(${len - 1})</b> at <b>1×</b>` +
    (len > 24 ? ` · counted in closed form, not run — this many calls could not finish here` : "")));
  box.append(el("div", "tb-key",
    `<span><i style="background:color-mix(in srgb, var(--warn) 42%, transparent);border-color:var(--warn)"></i>seed index (base case)</span>` +
    `<span><i style="background:color-mix(in srgb, var(--danger) 42%, transparent);border-color:var(--danger)"></i>computed index</span>`));

  box.append(el("div", "note", len <= 3
    ? `Every index asked for is below <b>3</b>, so a recursive <code class='inl'>T</code> would land straight on the base case every time — <b>${N(calls)}</b> call${calls === 1 ? "" : "s"} and no recursion at all. Push the slider past 3 and the bars appear: that is where the recomputation starts, and it is also where the three official tests at lengths 0–3 stop telling you anything.`
    : `Ask for each index <i>independently</i> and <code class='inl'>T(${len - 1})</code> rebuilds the whole sequence beneath it, then <code class='inl'>T(${len - 2})</code> rebuilds it again — and inside each of those, the trees under <code class='inl'>i−1</code>, <code class='inl'>i−2</code> and <code class='inl'>i−3</code> overlap almost entirely. Nothing is written down between questions, so <b>T(${worst})</b> would be worked out <b>${N(peak)}</b> separate times and answer the same number on every one of them. <b>One index reached by many paths</b> is what "overlapping subproblems" means, and the peak sitting near the <i>start</i> of the sequence rather than the end is the picture of it. The cost above is exact and was not measured by running anything: an entry of <code class='inl'>T(j)</code> spawns exactly one entry each of <code class='inl'>T(j−1)</code>, <code class='inl'>T(j−2)</code> and <code class='inl'>T(j−3)</code>, so the counts push downward from the top in ${len} steps of arithmetic. It depends only on the indices — the seeds never enter into it.`));
  return box;
}

// The three lengths below the seed. Each says what the truncation did AND what a version that
// starts by copying all three seeds would have returned — that gap is the first half of the
// challenge, and four of the six official tests live in it.
function boundaryNote(start, len) {
  const naive = ` A version that opens with <code class='inl'>[...startSequence]</code> and then loops returns <b>${arr(start)}</b> here, where the grader wants <b>${arr(tribonacci(start, len))}</b>.`;
  if (len === 0) return `<b>Length 0.</b> <code class='inl'>slice(0, 0)</code> drops all three numbers you were handed. "Return the sequence of the given length" outranks "the starting numbers are part of the sequence" — a length of zero has no room for them.${naive}`;
  if (len === 1) return `<b>Length 1.</b> You were given <b>three</b> numbers and asked for <b>one</b>, so the correct answer is <b>shorter than the input</b>. <code class='inl'>slice(0, 1)</code> keeps <b>${start[0]}</b> and drops the rest; the same clamp handles length 2.${naive}`;
  if (len === 2) return `<b>Length 2.</b> Two of the three seeds survive. Two of freeCodeCamp's six tests sit at lengths 1 and 2 and nothing else in the set reaches them — this is the boundary the challenge is actually testing.${naive}`;
  return `<b>Length 3.</b> The answer is exactly what you were given: <code class='inl'>slice</code> copies all three seeds and <code class='inl'>i &lt; 3</code> is false on its very first test, so <b>no addition happens at all</b>. This is the one length below 4 that a copy-all-three version also gets right — which is why passing it proves nothing about 0, 1 and 2.`;
}

// ── STEP — seven lines, and the boundary is settled on the second one ────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">tribonacciSequence</span>(<span class="tok" data-t="param">startSequence, length</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="slice">seq = startSequence.<span class="fn">slice</span>(<span class="nu">0</span>, length)</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = <span class="nu">3</span>; i &lt; length</span>; i++) {` },
  { ln: 4, html: `    <span class="tok" data-t="push">seq.<span class="fn">push</span>(seq[i - <span class="nu">1</span>] + seq[i - <span class="nu">2</span>] + seq[i - <span class="nu">3</span>])</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">seq</span>;` },
  { ln: 7, html: `}` },
];

function trace(caseIndex) {
  const { start, len } = CASES[Math.max(1, Math.min(CASES.length, caseIndex | 0)) - 1];
  const steps = [];
  let seq, i;
  const S = (line, note, x = {}) => {
    const vars = { startSequence: arr(start), length: len };
    if (line >= 3 && line <= 5) vars.i = i;    // block-scoped to the for loop: gone again by line 6
    const structs = line >= 2 ? [{ label: "seq", items: seq.slice(), newest: !!x.fresh }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `tribonacciSequence(${arr(start)}, ${len})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `The base case arrives as an <b>argument</b>. <b>startSequence = ${arr(start)}</b> is the trio the sequence starts from and <b>length = ${len}</b> is how many terms to hand back. There is no <code class='inl'>if (n &lt; 3) return …</code> anywhere in this function, because 0, 0 and 1 have no special status here — the caller picked the seeds.`,
    { focus: "param" });

  seq = start.slice(0, len);
  S(2, len === 0
    ? `<code class='inl'>slice(0, 0)</code> → <b>[]</b>. All three numbers you were handed are dropped, and this single call is why: it clamps <i>down</i>. The instinctive opening move, <code class='inl'>const seq = [...startSequence]</code>, returns <b>${arr(start)}</b> on this input and no later line can take it back.`
    : len < 3
      ? `<code class='inl'>slice(0, ${len})</code> keeps <b>${arr(seq)}</b> and drops the rest. Read that twice: you were given <b>three</b> numbers and asked for <b>${len}</b>, so the correct answer is <b>shorter than the input</b>. This is the whole first half of the challenge in one call.`
      : len === 3
        ? `<code class='inl'>slice(0, 3)</code> copies all three seeds, which on this input is already the finished answer. Watch the next line refuse to run.`
        : `<code class='inl'>slice(0, ${len})</code> asks for more elements than <b>startSequence</b> holds and simply gets all <b>${arr(start)}</b> — <code class='inl'>slice</code> clamps <i>up</i> as well as down. That is why one call covers every length: it cannot overshoot on 0, 1 or 2, and it cannot under-deliver here.`,
    { focus: "slice", fresh: len > 0, changed: ["seq"] });

  for (i = 3; ; i++) {
    const more = i < len;
    S(3, i === 3
      ? `The counter starts at <b>3</b>, not 0 — indices 0, 1 and 2 were <i>copied</i>, so the recurrence has nothing to do there. ${more
          ? `<b>3 &lt; ${len}</b>, so there ${len - 3 === 1 ? "is" : "are"} ${len - 3} term${len - 3 === 1 ? "" : "s"} left to build.`
          : `<b>3 &lt; ${len}</b> is false before the body runs even once. The boundary was settled entirely on line 2 — this loop contributes nothing at any length below 4.`}`
      : more
        ? `<b>i = ${i}</b> is still below <b>${len}</b>, so build another term. The loop counts <i>positions in the answer</i>, not additions performed, which is what keeps <code class='inl'>seq.length</code> equal to <b>length</b> at the end.`
        : `<b>i = ${len}</b> — <b>seq</b> now holds exactly the ${len} terms asked for, so stop. No off-by-one to check afterwards: the index that fills position <b>i</b> is the same <b>i</b> the condition tests.`,
      { focus: "forcond", changed: ["i"], eval: { expr: `i = ${i} < ${len}`, val: more } });
    if (!more) break;

    const [c, b, a] = [seq[i - 3], seq[i - 2], seq[i - 1]];
    seq.push(a + b + c);
    S(4, `<b>seq[${i - 3}] + seq[${i - 2}] + seq[${i - 1}] = ${c} + ${b} + ${a} = ${a + b + c}</b>. All three operands are already sitting in <b>seq</b> — earlier turns of this same loop put them there — so this is one addition and zero work recovering them. ${
      i === 3 ? `This is the first number the function actually computes; everything before it was data.` :
      a + b + c < Math.min(a, b, c) ? `Note it went <i>down</i>: three-term addition only grows while the terms are positive, and nothing in the rule requires that.` :
      `A recursive <code class='inl'>T(${i})</code> would reach this same number by re-deriving all ${i} terms beneath it, and then throwing them away again.`}`,
      { focus: "push", fresh: true });
  }

  S(6, `<b>Return ${arr(seq)}</b> — ${len} number${len === 1 ? "" : "s"}: <b>${Math.min(len, 3)}</b> copied from the seed and <b>${Math.max(0, len - 3)}</b> computed, each in a single addition. Line 2 decided the first figure and line 3 decided the second, which is the shape worth taking away: when a problem <b>hands you the base case</b> and asks for the whole sequence, the edge cases move into the copy and the memo table is the return value.`,
    { focus: "ret", done: true, result: arr(seq), ret: { value: arr(seq) } });

  return steps;
}

export default {
  n: 22, id: "tribonacci", title: "Tribonacci Sequence", dates: ["2025-09-01"],
  statement: `Given an array containing the <b>first three numbers</b> of a Tribonacci sequence and an integer <code class="inl">length</code>, return an array containing the sequence of that length. Each number after the first three is the sum of the <b>three</b> preceding ones. Handle any length <b>≥ 0</b>; a length of <b>0</b> returns an empty array, and the starting numbers <i>are</i> part of the sequence. <span class="rule">Example: <code class="inl">tribonacciSequence([0, 0, 1], 10)</code> → <b>[0, 0, 1, 1, 2, 4, 7, 13, 24, 44]</b>. But <code class="inl">tribonacciSequence([21, 32, 43], 1)</code> → <b>[21]</b> — one number back, from the three you were handed.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — length − 3 additions",
      approach: `Every operand the recurrence needs is an <i>earlier term of the answer</i>, and the answer is an array you are building anyway — so there is nothing to memoise and no <code class='inl'>T(i)</code> to define. Fill it forward and the three-wide window you need is always the last three things you wrote. The instinct this problem is built to punish is the other one: transcribing the definition as a recursive <code class='inl'>T(i) = T(i−1) + T(i−2) + T(i−3)</code> and asking it once per index. That is <b>correct</b> — it passes all six official tests — and it costs <b>152,843</b> calls to produce twenty numbers, working <code class='inl'>T(2)</code> out 42,762 separate times. The <b>What recomputing would have cost</b> panel prices that instinct next to the 17 additions that avoid it. The second half is the boundary: <code class='inl'>startSequence.slice(0, length)</code> clamps at <b>both</b> ends, returning <code class='inl'>[]</code>, <code class='inl'>[a]</code>, <code class='inl'>[a, b]</code>, <code class='inl'>[a, b, c]</code>, or all three again for anything longer — four of freeCodeCamp's six tests are settled before the loop is reached. Then start the counter at <b>3</b>, because indices 0–2 arrived as data, and let <code class='inl'>i &lt; length</code> do double duty: at every length below 4 it is already false.`,
      code: `// The array being returned IS the table, so there is nothing to memoise: seq[i - 1],
// seq[i - 2] and seq[i - 3] were all written by earlier turns of this same loop. A
// recursive T(i) asked once per index is correct and costs 152,843 calls at length 20.
//
// slice(0, length) clamps at BOTH ends, and that single call is the entire
// length 0 / 1 / 2 boundary — it hands back [], [a] or [a, b] rather than the
// three numbers it was given. Start the counter at 3, because 0, 1 and 2 are data.
function tribonacciSequence(startSequence: number[], length: number): number[] {
  const seq = startSequence.slice(0, length);
  for (let i = 3; i < length; i++) seq.push(seq[i - 1] + seq[i - 2] + seq[i - 3]);
  return seq;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Seven lines, and the interesting one is line <b>2</b>. Load cases <b>2</b>, <b>3</b>, <b>4</b> and <b>5</b> — <code class='inl'>[21,32,43] × 1</code>, <code class='inl'>[0,0,1] × 0</code>, <code class='inl'>[10,20,30] × 2</code> and <code class='inl'>[10,20,30] × 3</code> — one after another: each is over in four steps, and in all four <code class='inl'>slice</code> has produced the finished answer before the loop is even tested. That is two thirds of the official set decided by one call. Then run case <b>1</b> to watch <b>seq</b> grow with <code class='inl'>i</code> tracking the position it is filling, and case <b>8</b> (<code class='inl'>[1,-1,0] × 12</code>) to see a Tribonacci sequence cross zero and run <i>downhill</i> — proof that only the last three terms are ever remembered. Watch <b>i</b> appear on line 3 and vanish again by line 6, because it is scoped to the loop. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => {
        ensureStyle();
        host.append(el("div", "tb-eq", "cases &nbsp;" + CASES.map((c, k) => `<b>${k + 1}</b>&nbsp;${caseLabel(c)}`).join(" &nbsp;&nbsp;")));
        mountDebugger(host, {
          source: SRC, trace,
          input: {
            label: "case =", value: 1, min: 1, max: CASES.length,
            presets: CASES.map((_, k) => k + 1), hint: `1–${CASES.length}: pick a test case`,
          },
        });
      },
    },
  ],
};
