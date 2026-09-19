// #3 · Fibonacci Sequence — the base case is an argument, so length 0/1/2 is a slice.
// ONE approach, on purpose. The famous Fibonacci lesson — naive recursion versus
// iteration — is about the nth TERM, and it does not apply here: this problem asks
// for the whole SEQUENCE, so the array you are required to return already IS the
// memo table. The only way to reintroduce the exponential recomputation is to throw
// that array away deliberately, which is a strawman wearing an approach's clothes
// (CONTRIBUTING, Tier 3), so there is no brute/opt toggle on this tab.
//
// The actual difficulty is the boundary, and it lives in the COPY, not the loop.
// You are handed two seeds and asked for `length` terms, so when length is 1 the
// correct answer is SHORTER than the input. `startSequence.slice(0, length)` clamps
// at both ends and settles 0, 1 and 2 in one call; a loop that opens by pushing both
// seeds returns [21, 32] where the grader wants [21], and [0, 1] where it wants [].
//
// The demo lets you set the seeds yourself — negative, equal, huge — because "you
// are handed the first two numbers" is the framing every other Fibonacci demo drops.
import { el, mountDebugger } from "../shared.js";

// The solution itself, shared by the demo and the trace so the two cannot drift.
const fibSeq = (start, length) => {
  const seq = start.slice(0, length);
  for (let i = 2; i < length; i++) seq.push(seq[i - 1] + seq[i - 2]);
  return seq;
};

// Cases 1–5 are freeCodeCamp's official tests, verbatim and in the grader's order:
// the textbook 20 terms · length 1 (one number back from two handed in) · length 0 ·
// length 2 (the answer is the input) · seeds far outside 0/1, growing past 2³¹.
// Three of the five are the length boundary, which is the whole difficulty.
//
// Cases 6–8 are invented, because every official case starts from a NON-NEGATIVE,
// non-decreasing pair, and so hides that the seeds are free parameters:
//   6 · [2, -1] crosses zero and settles into the standard 0,1,1,2,3 — the recurrence
//       remembers only two terms, so the seeds choose the phase, not the shape.
//   7 · [7, 7] equal seeds: every term is 7 × Fib(k). The rule is linear; 0 and 1 are
//       just the pair whose multiplier is 1.
//   8 · [-3, -5] both negative, so every sum is more negative — the sequence runs
//       downhill. "Fibonacci" never promised increasing; the usual seeds did.
const CASES = [
  { a: 0, b: 1, len: 20, official: true, note: "official — the textbook sequence, 20 terms" },
  { a: 21, b: 32, len: 1, official: true, note: "official — length 1: the second seed is dropped" },
  { a: 0, b: 1, len: 0, official: true, note: "official — length 0: both seeds dropped" },
  { a: 10, b: 20, len: 2, official: true, note: "official — length 2: the loop never runs" },
  { a: 123456789, b: 987654321, len: 5, official: true, note: "official — huge seeds, no special casing" },
  { a: 2, b: -1, len: 10, official: false, note: "invented — a negative seed that heals into 0,1,1,2,3" },
  { a: 7, b: 7, len: 8, official: false, note: "invented — equal seeds: every term is 7 × Fib(k)" },
  { a: -3, b: -5, len: 6, official: false, note: "invented — both seeds negative: the sequence runs downhill" },
];

const caseLabel = (c) => `[${c.a}, ${c.b}], ${c.len}`;
const arr = (xs) => "[" + xs.join(", ") + "]";

// ── Geometry ────────────────────────────────────────────────────────────────
// Every cell is given the SAME explicit pixel width, computed from the widest
// value, so the arc endpoints are pure arithmetic. Deliberately not measured:
// mount() runs for every tab including the hidden ones, where a measured
// getBoundingClientRect is all zeros and the arcs would land on top of each other.
const GAP = 8, ARC_H = 40;
const cellW = (seq) => Math.round(Math.max(2, ...seq.map((v) => String(v).length)) * 8.6) + 18;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .fib-track { overflow-x:auto; padding:2px 2px 6px; }
    .fib-stage { display:inline-block; }
    .fib-arcs { display:block; }
    .fib-arcs path { fill:none; stroke:var(--accent); stroke-width:1.6; }
    .fib-arcs circle { fill:var(--accent); }
    .fib-row { display:flex; gap:${GAP}px; }
    .fib-c { flex:0 0 auto; height:44px; border:1px solid var(--border); border-radius:8px;
             background:var(--panel-2); display:flex; flex-direction:column; align-items:center;
             justify-content:center; gap:1px; font:800 13px var(--mono); color:var(--text); cursor:default; }
    .fib-c .ix { font:600 9px var(--sans); letter-spacing:.06em; color:var(--muted); }
    .fib-c.calc { cursor:pointer; }
    .fib-c.calc:hover { border-color:var(--accent); }
    .fib-c.seed { border-style:dashed; border-color:var(--good); color:var(--good); }
    .fib-c.par { border-color:var(--accent); }
    .fib-c.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 18%, transparent); }
    .fib-eq { font:12.5px var(--mono); color:var(--muted); margin:10px 0 2px; }
    .fib-eq b { color:var(--text); }
    .fib-eq .win { color:var(--accent); }
    .fib-key { display:flex; gap:14px; flex-wrap:wrap; font:11px var(--sans); color:var(--muted); margin-top:6px; }
    .fib-key i { display:inline-block; width:11px; height:11px; border-radius:3px;
                 margin-right:5px; vertical-align:-1px; border:1px solid var(--border); }
  `));
}

// Two arcs into the focused cell: the tall one from i−2, the shallow one from i−1.
// They are the picture of `seq[i - 1] + seq[i - 2]` — the only line in the loop.
function arcSvg(W, n, f) {
  const total = n * W + (n - 1) * GAP;
  const x = (i) => i * (W + GAP) + W / 2;
  if (f < 2) return `<svg class="fib-arcs" width="${total}" height="${ARC_H}"></svg>`;
  const hop = (from, ctrlY) =>
    `<path d="M ${x(from)} ${ARC_H - 2} Q ${(x(from) + x(f)) / 2} ${ctrlY} ${x(f)} ${ARC_H - 2}"/>` +
    `<circle cx="${x(from)}" cy="${ARC_H - 2}" r="2.4"/>`;
  return `<svg class="fib-arcs" width="${total}" height="${ARC_H}">${hop(f - 2, 0)}${hop(f - 1, 15)}</svg>`;
}

// ── The demo ────────────────────────────────────────────────────────────────
function mount(host) {
  ensureStyle();
  let focus = null;               // null = follow the last term; otherwise a pinned index
  let timer = null;

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", caseLabel(c));
    chip.title = c.note;
    chip.onclick = () => { stop(); aIn.value = c.a; bIn.value = c.b; lIn.value = c.len; focus = null; render(); };
    chips.append(chip);
  });

  const ctl = el("div", "controls");
  const numIn = (v) => { const i = el("input"); i.type = "number"; i.value = v; i.style.width = "112px"; return i; };
  const aIn = numIn(CASES[0].a), bIn = numIn(CASES[0].b);
  const lIn = el("input");
  lIn.type = "range"; lIn.min = 0; lIn.max = 20; lIn.value = CASES[0].len; lIn.style.width = "170px";
  const lOut = el("span", "tag", "");
  const build = el("button", "chip", "▶ Build");
  ctl.append(el("span", "ctl-label", "startSequence = ["), aIn, el("span", "ctl-label", ","), bIn,
             el("span", "ctl-label", "]"), el("span", "ctl-label", "length ="), lIn, lOut, build);

  const out = el("div");
  host.append(
    el("div", "note", "The first two numbers are <b>given</b>, not derived — so try seeds nobody's Fibonacci demo uses: make them <b>equal</b>, make one <b>negative</b>, make the second <b>smaller</b> than the first. The rule never changes; only what you handed it does. Then drag <b>length</b> down to 2, 1 and 0 and watch where the answer has to come from."),
    chips, ctl, out);

  aIn.oninput = bIn.oninput = () => { stop(); render(); };
  lIn.oninput = () => { stop(); focus = null; render(); };
  build.onclick = () => {
    if (timer) return stop();
    const n = fibSeq(read().start, read().len).length;
    if (n < 3) return;
    focus = 2; render();
    build.classList.add("on"); build.textContent = "❚❚ Pause";
    timer = setInterval(() => {
      if (!host.isConnected || focus >= n - 1) return stop();
      focus++; render();
    }, 620);
  };
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    build.classList.remove("on"); build.textContent = "▶ Build";
  }
  function read() {
    return { start: [Number(aIn.value), Number(bIn.value)], len: Math.max(0, Math.min(20, +lIn.value)) };
  }

  render();

  function render() {
    const { start, len } = read();
    const [a, b] = start;
    lOut.textContent = `length ${len}`;
    out.innerHTML = "";
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      out.append(el("div", "note", "Both seeds have to be numbers — the recurrence is pure addition, so it has nothing to fall back on if one is blank."));
      return;
    }

    const seq = fibSeq(start, len);
    const n = seq.length;
    const copied = Math.min(len, 2), computed = Math.max(0, len - 2);
    const f = n > 2 ? Math.min(Math.max(focus ?? n - 1, 2), n - 1) : -1;

    const hit = CASES.find((c) => c.official && c.a === a && c.b === b && c.len === len);
    out.append(el("div", "result-line",
      `<span class="opcount cool"><span class="n">${copied}</span> copied from the seed</span>` +
      `<span class="opcount"><span class="n">${computed}</span> computed by the loop</span>` +
      (hit ? `<span class="badge ok">official test ✓</span>` : "")));

    if (!n) {
      out.append(el("div", "fib-eq", `returns <b>[]</b> — nothing to draw, which is the answer.`));
    } else {
      const W = cellW(seq);
      const stage = el("div", "fib-stage");
      const row = el("div", "fib-row");
      seq.forEach((v, i) => {
        const cls = i < 2 ? " seed" : " calc";
        const mark = i === f ? " on" : (f >= 2 && (i === f - 1 || i === f - 2)) ? " par" : "";
        const cell = el("div", "fib-c" + cls + mark, `<span class="ix">${i}</span><span>${v}</span>`);
        cell.style.width = W + "px";
        cell.title = i < 2 ? "given — copied straight out of startSequence" : `computed: seq[${i - 2}] + seq[${i - 1}]`;
        if (i >= 2) cell.onclick = () => { stop(); focus = i; render(); };
        row.append(cell);
      });
      stage.innerHTML = arcSvg(W, n, f);
      stage.append(row);
      const track = el("div", "fib-track");
      track.append(stage);
      out.append(track);
      // Keep the focused cell in view without measuring anything: the x of a cell
      // is arithmetic, and clientWidth is simply 0 on a hidden tab (harmless).
      if (f >= 2) track.scrollLeft = Math.max(0, f * (W + GAP) - track.clientWidth / 2);

      out.append(el("div", "fib-key",
        `<span><i style="border-style:dashed;border-color:var(--good)"></i>given (seed)</span>` +
        `<span><i></i>computed</span>` +
        `<span><i style="border-color:var(--accent);background:color-mix(in srgb, var(--accent) 18%, transparent)"></i>the term the arcs land on — click any computed cell</span>`));

      out.append(el("div", "fib-eq", f >= 2
        ? `<b>seq[${f}]</b> = seq[${f - 2}] + seq[${f - 1}] = <span class="win">${seq[f - 2]}</span> + <span class="win">${seq[f - 1]}</span> = <b>${seq[f]}</b>`
        : `Nothing is computed here — every element on screen was <b>copied</b> out of <code class='inl'>startSequence</code>.`));
      out.append(el("div", "fib-eq", `returns <b>${arr(seq)}</b>`));
    }

    if (len <= 2) out.append(el("div", "note", boundaryNote(a, b, len)));
    const seed = seedNote(a, b, seq);
    if (seed) out.append(el("div", "note", seed));
  }
}

// The three lengths that break a naive loop. Each says what `slice` did AND what
// the seed-then-loop version would have returned instead, because that gap is the
// entire challenge — see the header.
function boundaryNote(a, b, len) {
  const spread = len === 2 ? "" :
    ` A version that starts from <code class='inl'>[...startSequence]</code> and then loops returns <b>${arr([a, b])}</b> here, and the grader wants <b>${arr(fibSeq([a, b], len))}</b>.`;
  if (len === 0) return `<b>length 0.</b> <code class='inl'>slice(0, 0)</code> drops <i>both</i> numbers you were handed. "Return the sequence of the given length" outranks "the starting numbers are part of the sequence" — a length of zero has no room for them.${spread}`;
  if (len === 1) return `<b>length 1.</b> <code class='inl'>slice(0, 1)</code> keeps <b>${a}</b> and drops <b>${b}</b>. Read that twice: you were given <i>two</i> numbers and asked for <i>one</i>, so the correct answer is <b>shorter than the input</b>. That is the case the obvious loop cannot reach, because by the time it starts counting it has already pushed both seeds.${spread}`;
  return `<b>length 2.</b> The answer is exactly what you were given: <code class='inl'>slice</code> copies both seeds and <code class='inl'>i &lt; 2</code> is false on its very first test, so <b>no addition happens at all</b>. This is the one boundary a seed-then-loop version also gets right — which is why passing it proves nothing about lengths 0 and 1.`;
}

// What the seeds themselves teach. Only fires when the current pair actually
// demonstrates it, so it reads as an observation rather than a caption.
function seedNote(a, b, seq) {
  const n = seq.length;
  if (a === 0 && b === 0) return `Both seeds are <b>0</b>. Addition has no way to manufacture a value, so the sequence is zeros forever — proof that everything downstream is a consequence of the pair you passed in, not of the rule.`;
  if (a === b && a !== 0) return `Equal seeds, so every term is <b>${a} × Fib(k)</b>: ${arr(seq.slice(0, Math.min(n, 6)))}${n > 6 ? " …" : ""}. The recurrence is <b>linear</b> — scale the seeds and the whole sequence scales. 0 and 1 aren't special, they're just the pair whose multiplier is 1.`;
  if (seq.some((v) => v < 0) && n > 2) {
    // Once BOTH remembered terms are negative every later sum must be smaller
    // still, so the two ends of this branch are decided by the last pair — not
    // by the seeds, which is itself the point being made.
    return seq[n - 1] < 0 && seq[n - 2] < 0
      ? `The last two terms are both negative, and from there every sum is more negative than the pair that made it — the sequence runs <b>downhill</b> and cannot come back. Nothing in the definition promises growth; that was a property of the seeds 0 and 1, not of "each number is the sum of the two preceding ones".`
      : `A negative seed, and the sequence <b>climbs back out</b>: ${arr(seq.slice(0, Math.min(n, 8)))}${n > 8 ? " …" : ""}. Only two terms are ever remembered, so once the pair is positive again the shape is indistinguishable from the standard sequence. The seeds choose the <i>phase</i>, not the shape.`;
  }
  if (n >= 8 && seq[n - 2] !== 0 && Math.sign(seq[n - 1]) === Math.sign(seq[n - 2])) {
    const r = seq[n - 1] / seq[n - 2];
    return `Consecutive terms here divide to <b>${Number(r.toFixed(6))}</b> — and they would, from <i>any</i> seeds that don't cancel: the ratio converges on <b>φ ≈ 1.618</b> no matter where you start it. That is the other half of <b>#344 Golden Ratio</b>, which only ever meets the sequence at 0 and 1.`;
  }
  return "";
}

// ── STEP — six lines, and the boundary is settled on the second one ──────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">fibonacciSequence</span>(<span class="tok" data-t="param">startSequence, length</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="slice">seq = startSequence.<span class="fn">slice</span>(<span class="nu">0</span>, length)</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = <span class="nu">2</span>; i &lt; length</span>; i++) {` },
  { ln: 4, html: `    <span class="tok" data-t="push">seq.<span class="fn">push</span>(seq[i - <span class="nu">1</span>] + seq[i - <span class="nu">2</span>])</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">seq</span>;` },
  { ln: 7, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { a, b, len } = CASES[k - 1];
  const steps = [];
  let seq, i;

  const S = (line, note, x = {}) => {
    const vars = { startSequence: arr([a, b]), length: len };
    if (line >= 3 && line <= 5) vars.i = i;   // block-scoped to the for loop: gone by line 6
    const structs = [];
    if (line >= 2) structs.push({ label: "seq", items: seq.slice(), newest: !!x.fresh });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `fibonacciSequence(${arr([a, b])}, ${len})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The base case arrives as an <b>argument</b>. <b>startSequence = ${arr([a, b])}</b> is the pair the sequence starts from and <b>length = ${len}</b> is how many terms to hand back. There is no <code class='inl'>if (n &lt; 2) return n</code> anywhere in this function, because 0 and 1 have no special status here — the caller picked the seeds.`,
    { focus: "param" });

  seq = [a, b].slice(0, len);
  S(2, len === 0
    ? `<code class='inl'>slice(0, 0)</code> → <b>[]</b>. Both numbers you were handed are dropped, and this single call is why: it clamps <i>down</i>. The obvious opening move, <code class='inl'>const seq = [...startSequence]</code>, returns <b>${arr([a, b])}</b> on this input and no later line can take it back.`
    : len === 1
      ? `<code class='inl'>slice(0, 1)</code> keeps <b>${a}</b> and drops <b>${b}</b>. The answer is <b>shorter than the input</b> — you were given two numbers and asked for one. This is the whole challenge in one call; everything below it is the easy part.`
      : len === 2
        ? `<code class='inl'>slice(0, 2)</code> copies both seeds, which on this input is already the finished answer. Watch the next line refuse to run.`
        : `<code class='inl'>slice(0, ${len})</code> asks for more elements than <b>startSequence</b> holds and simply gets <b>${arr([a, b])}</b> — <code class='inl'>slice</code> clamps <i>up</i> as well as down. That is why one call covers every length: it can't overshoot on 0 or 1, and it can't under-deliver here.`,
    { focus: "slice", fresh: len > 0 });

  for (i = 2; ; i++) {
    const more = i < len;
    S(3, i === 2
      ? `The counter starts at <b>2</b>, not 0 — indices 0 and 1 were <i>copied</i>, so the recurrence has nothing to do there. ${more
          ? `<b>2 &lt; ${len}</b>, so there are ${len - 2} term${len - 2 === 1 ? "" : "s"} left to build.`
          : `<b>2 &lt; ${len}</b> is false before the body runs even once. The boundary was settled entirely on line 2 — this loop never contributes anything on lengths 0, 1 or 2.`}`
      : more
        ? `<b>i = ${i}</b> is still below <b>${len}</b>, so build another term. The loop counts <i>positions in the answer</i>, not additions performed, which is what keeps <code class='inl'>seq.length</code> equal to <b>length</b> at the end.`
        : `<b>i = ${len}</b> — the array now holds exactly the ${len} terms asked for, so stop. No off-by-one to check afterwards: the index that fills position <b>i</b> is the same <b>i</b> the condition tests.`,
      { focus: "forcond", changed: ["i"], eval: { expr: `i = ${i} < ${len}`, val: more } });
    if (!more) break;

    const [x, y] = [seq[i - 2], seq[i - 1]];
    seq.push(x + y);
    S(4, `<b>seq[${i - 2}] + seq[${i - 1}] = ${x} + ${y} = ${x + y}</b>. Both operands are already sitting in <b>seq</b> — the array being returned <i>is</i> the table, which is why nothing here needs a cache or a recursive call. ${
      i === 2 ? `This is the first number the function actually computes; everything before it was data.`
        : x + y < Math.min(x, y) ? `Note it went <i>down</i>: addition only grows when the terms are positive, and nothing in the rule requires that.`
        : `Only the last two terms matter, so the ones further left could be discarded — except that they are the answer.`}`,
      { focus: "push", fresh: true });
  }

  S(6, `<b>Return ${arr(seq)}</b> — ${len} number${len === 1 ? "" : "s"}: <b>${Math.min(len, 2)}</b> copied from the seed and <b>${Math.max(0, len - 2)}</b> computed. Line 2 decided the first figure and line 3 decided the second, which is the shape worth taking away: when a problem <b>hands you the base case</b>, the edge cases move out of the recurrence and into the copy.`,
    { focus: "ret", done: true, result: arr(seq), ret: { value: arr(seq) } });

  return steps;
}

export default {
  n: 3, id: "fibseq", title: "Fibonacci Sequence", dates: ["2025-08-13"],
  statement: `Given an array containing the <b>first two numbers</b> of a Fibonacci sequence and an integer <code class="inl">length</code>, return an array containing the sequence of the given length. Each number after the first two is the sum of the two preceding ones. Handle any length <b>≥ 0</b>; a length of <b>0</b> returns an empty array, and the starting numbers <i>are</i> part of the sequence. <span class="rule">Example: <code class="inl">fibonacciSequence([0, 1], 10)</code> → <b>[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]</b>. But <code class="inl">fibonacciSequence([21, 32], 1)</code> → <b>[21]</b> — one number back, from the two you were handed.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — n − 2 additions",
      approach: `The recurrence is one line and it is not where the difficulty is. Everything hard about this problem is that <b>the base case is an argument</b>: you are handed the first two numbers, so the answer can legitimately be <i>shorter</i> than the input. <code class='inl'>startSequence.slice(0, length)</code> is the whole fix — <code class='inl'>slice</code> clamps at <b>both</b> ends, so it returns <code class='inl'>[]</code>, <code class='inl'>[a]</code>, <code class='inl'>[a, b]</code> or <code class='inl'>[a, b]</code> again for anything longer, and three of freeCodeCamp's five tests are settled before the loop is reached. Then start the counter at <b>2</b>, because indices 0 and 1 were copied rather than computed, and let <code class='inl'>i &lt; length</code> do double duty: on lengths 0, 1 and 2 it is already false. The instinct to write <code class='inl'>const seq = [...startSequence]</code> is what this problem is built to punish.`,
      code: `// The first two numbers are GIVEN, not computed — so copy them with slice,
// never with a spread. slice(0, length) clamps at BOTH ends, and that single
// call is the entire length 0 / 1 / 2 boundary: it hands back [], [a] or [a, b].
function fibonacciSequence(startSequence: number[], length: number): number[] {
  const seq = startSequence.slice(0, length);
  // Start at 2, because indices 0 and 1 arrived as data. If length <= 2 this
  // test is already false, so the recurrence never runs at all.
  for (let i = 2; i < length; i++) seq.push(seq[i - 1] + seq[i - 2]);
  return seq;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Six lines, and the interesting one is line <b>2</b>. Load cases <b>2</b>, <b>3</b> and <b>4</b> — <code class='inl'>[21, 32], 1</code>, <code class='inl'>[0, 1], 0</code> and <code class='inl'>[10, 20], 2</code> — one after another: each is over in four steps, and in all three <code class='inl'>slice</code> produces the finished answer before the loop is even tested. Then run case <b>1</b> to watch <b>seq</b> grow with <code class='inl'>i</code> tracking the position it is filling, and case <b>6</b> (<code class='inl'>[2, -1], 10</code>) to see a sequence cross zero and settle into the textbook one — proof that only the last two terms are ever remembered. Watch <b>i</b> appear on line 3 and vanish again by line 6, because it is scoped to the loop. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => {
        ensureStyle();
        host.append(el("div", "fib-eq", "cases &nbsp;" + CASES.map((c, i) =>
          `<b>${i + 1}</b>&nbsp;${caseLabel(c)}`).join(" &nbsp;&nbsp;")));
        mountDebugger(host, {
          source: SRC, trace,
          input: {
            label: "case =", value: 5, min: 1, max: CASES.length,
            presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case`,
          },
        });
      },
    },
  ],
};
