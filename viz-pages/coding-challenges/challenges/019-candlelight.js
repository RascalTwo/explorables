// #19 · Candlelight — recycling is a fixed net loss, so the whole run is one divide.
// The statement hands you a seven-step worked example, which is an invitation to
// simulate — and the simulation is fine. But each trade swaps k leftovers for one
// candle that burns back into one leftover, so it costs exactly k − 1 leftovers,
// every time, forever. A constant cost per trade means the number of trades is a
// division rather than a loop.
// • BRUTE / replay the rounds: burn, pool the leftovers, recycle, repeat.
// • OPT   / candles + ⌊(candles − 1) / (leftoversNeeded − 1)⌋, in one step.
// The gap is O(log n) against O(1) — real, but small in absolute terms until the
// input is large: the official 2345/3 case is 9 rounds, and 1000000/2 is 21.
import { el, mountDebugger } from "../shared.js";

// The five official freeCodeCamp cases, then two of ours. 1/5 is the degenerate
// input — one burn, never enough leftovers to trade, so the loop runs exactly once
// and the formula's ⌊0 / 4⌋ contributes nothing. 1000000/2 is the divergence case:
// 21 rounds against one division, on an answer of 1,999,999.
const OFFICIAL = [
  { n: 7, k: 2 }, { n: 10, k: 5 }, { n: 20, k: 3 }, { n: 17, k: 4 }, { n: 2345, k: 3 },
];
const PRESETS = [...OFFICIAL, { n: 1, k: 5 }, { n: 1000000, k: 2 }];

// The simulation, instrumented — one entry per round of burning.
function simulate(n, k) {
  const rounds = [];
  let burned = 0, leftovers = 0, have = n, guard = 0;
  while (have > 0 && guard++ < 500) {
    const pool = leftovers + have;
    const made = Math.floor(pool / k);
    burned += have;
    rounds.push({ burn: have, burned, pool, made, carried: pool % k });
    leftovers = pool % k;
    have = made;
  }
  return { burned, rounds };
}

const closed = (n, k) => (n < 1 ? 0 : n + Math.floor((n - 1) / (k - 1)));
const N = (x) => x.toLocaleString("en-US");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cl-wrap { display:flex; flex-direction:column; gap:13px; }
    .cl-strip { display:flex; flex-wrap:wrap; gap:3px; align-items:flex-end; }
    .cl-c { width:7px; height:26px; border-radius:2px 2px 1px 1px; background:color-mix(in srgb, var(--accent) 55%, transparent); border:1px solid var(--accent); }
    .cl-c.made { background:color-mix(in srgb, var(--good) 45%, transparent); border-color:var(--good); height:20px; }
    .cl-key { display:flex; gap:14px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); align-items:center; }
    .cl-key i { display:inline-block; width:8px; height:14px; border-radius:2px; margin-right:5px; vertical-align:-2px; }
    .cl-math { font:14px var(--mono); color:var(--muted); line-height:2; }
    .cl-math b { color:var(--text); }
    .cl-math .hi { color:var(--good); font-weight:800; }
    .cl-total { font:800 30px var(--mono); color:var(--good); }
  `));
}

function controls(host, onChange, dn, dk) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inN = el("input"); inN.type = "number"; inN.min = "0"; inN.max = "1000000"; inN.value = String(dn); inN.style.width = "110px";
  const inK = el("input"); inK.type = "number"; inK.min = "2"; inK.max = "50"; inK.value = String(dk); inK.style.width = "80px";
  ctl.append(el("span", "ctl-label", "candles"), inN, el("span", "ctl-label", "leftovers per new candle"), inK);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `${N(p.n)} / ${p.k}`);
    c.onclick = () => { inN.value = String(p.n); inK.value = String(p.k); onChange(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inN.oninput = inK.oninput = onChange;
  queueMicrotask(onChange);
  return { inN, inK, out };
}

const read = (inN, inK) => ({
  n: Math.min(1000000, Math.max(0, Math.floor(+inN.value) || 0)),
  k: Math.min(50, Math.max(2, Math.floor(+inK.value) || 2)),
});

function mountSim(host) {
  const { inN, inK, out } = controls(host, render, 20, 3);
  function render() {
    const { n, k } = read(inN, inK);
    const r = simulate(n, k);
    out.innerHTML = "";
    const wrap = el("div", "cl-wrap");
    wrap.append(el("div", "result-line",
      `<span class="badge ok">burnCandles(${N(n)}, ${k}) → ${N(r.burned)}</span>` +
      `<span class="opcount hot"><span class="n">${r.rounds.length}</span> rounds replayed</span>`));

    const rows = r.rounds.map((x, i) =>
      `<tr><td>${i + 1}</td><td>${N(x.burn)}</td><td>${N(x.burned)}</td><td>${N(x.pool)}</td><td>${N(x.made)}</td><td>${N(x.carried)}</td></tr>`).join("");
    const table = el("table", "cmp",
      `<tr><th>round</th><th>burn</th><th>burned so far</th><th>leftovers pooled</th><th>new candles</th><th>carried</th></tr>${rows}`);
    wrap.append(table);
    wrap.append(el("div", "note", n === 0
      ? `Nothing to burn, so the loop never runs.`
      : `Every round burns whatever is in hand, adds those stubs to whatever was carried over, and trades <b>${k}</b> stubs for one new candle. It ends when the pool drops below ${k}, leaving <b>${r.rounds[r.rounds.length - 1].carried}</b> stub${r.rounds[r.rounds.length - 1].carried === 1 ? "" : "s"} unusable. The loop is honest work, and it is also <b>${r.rounds.length}</b> replays of a trade whose cost never changed — flip to <b>Closed form</b>.`));
    out.append(wrap);
  }
}

const STRIP_CAP = 150;

function mountClosed(host) {
  const { inN, inK, out } = controls(host, render, 2345, 3);
  function render() {
    const { n, k } = read(inN, inK);
    const trades = n < 1 ? 0 : Math.floor((n - 1) / (k - 1));
    const total = closed(n, k);
    out.innerHTML = "";
    const wrap = el("div", "cl-wrap");
    wrap.append(el("div", "result-line",
      `<span class="badge ok">burnCandles(${N(n)}, ${k}) → ${N(total)}</span>` +
      `<span class="opcount cool"><span class="n">1</span> division</span>`));

    // The two blocks the answer is made of: what you were given, and what you earned.
    const strip = el("div", "cl-strip");
    const shownN = Math.min(n, STRIP_CAP), shownT = Math.min(trades, STRIP_CAP);
    for (let i = 0; i < shownN; i++) strip.append(el("div", "cl-c"));
    if (n > shownN) strip.append(el("span", "more", `+${N(n - shownN)}`));
    for (let i = 0; i < shownT; i++) strip.append(el("div", "cl-c made"));
    if (trades > shownT) strip.append(el("span", "more", `+${N(trades - shownT)}`));
    wrap.append(strip);
    wrap.append(el("div", "cl-key",
      `<span><i style="background:color-mix(in srgb, var(--accent) 55%, transparent);border:1px solid var(--accent)"></i>${N(n)} given</span>` +
      `<span><i style="background:color-mix(in srgb, var(--good) 45%, transparent);border:1px solid var(--good)"></i>${N(trades)} recycled</span>`));

    wrap.append(el("div", "cl-math",
      `<div>one trade: <b>${k}</b> stubs in, <b>1</b> candle out, which burns back to <b>1</b> stub → net cost <b class="hi">${k - 1}</b> stubs</div>` +
      `<div>stubs to spend: <b>${N(n)}</b> − <b>1</b> (one can never be traded) = <b>${N(Math.max(0, n - 1))}</b></div>` +
      `<div>trades: ⌊ <b>${N(Math.max(0, n - 1))}</b> ÷ <b>${k - 1}</b> ⌋ = <b class="hi">${N(trades)}</b></div>`));
    wrap.append(el("div", "cl-total", `${N(n)} + ${N(trades)} = ${N(total)}`));
    wrap.append(el("div", "note",
      `Every candle ever lit burns exactly once, so the answer is simply <b>how many candles existed</b>: the ${N(n)} you were given plus the ${N(trades)} you traded for. And because a trade always costs the same <b>${k - 1}</b> stubs — ${k} in, one back out when it burns — the number of trades never needed a loop to discover. The <b>− 1</b> is the stub you can never spend: the run ends holding between 1 and ${k - 1} of them, and the arithmetic reserves one up front rather than checking for it at the end.`));
    out.append(wrap);
  }
}

// ── STEP × 2 ────────────────────────────────────────────────────────────────
const SRC_SIM = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">burnCandles</span>(<span class="tok" data-t="param">candles</span>, <span class="tok" data-t="param">need</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> <span class="tok" data-t="init">burned = <span class="nu">0</span>, stubs = <span class="nu">0</span>, have = candles</span>;` },
  { ln: 3, html: `  <span class="k">while</span> (<span class="tok" data-t="cond">have &gt; <span class="nu">0</span></span>) {` },
  { ln: 4, html: `    <span class="tok" data-t="burn">burned += have; stubs += have</span>;` },
  { ln: 5, html: `    <span class="tok" data-t="make">have = Math.<span class="fn">floor</span>(stubs / need)</span>;` },
  { ln: 6, html: `    <span class="tok" data-t="carry">stubs %= need</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">burned</span>;` },
  { ln: 9, html: `}` },
];

const SRC_MATH = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">burnCandles</span>(<span class="tok" data-t="param">candles</span>, <span class="tok" data-t="param">need</span>) {` },
  { ln: 2, html: `  <span class="k">if</span> (<span class="tok" data-t="guard">candles &lt; <span class="nu">1</span></span>) <span class="k">return</span> <span class="nu">0</span>;` },
  { ln: 3, html: `  <span class="k">const</span> net = <span class="tok" data-t="net">need - <span class="nu">1</span></span>;` },
  { ln: 4, html: `  <span class="k">const</span> trades = <span class="tok" data-t="trades">Math.<span class="fn">floor</span>((candles - <span class="nu">1</span>) / net)</span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="ret">candles + trades</span>;` },
  { ln: 6, html: `}` },
];

const STEP_PRESETS = PRESETS.map((p) => `${p.n} / ${p.k}`);
const splitCase = (raw) => {
  const [a = "", b = ""] = String(raw).split("/");
  return {
    n: Math.min(1000000, Math.max(0, Math.floor(+a.trim()) || 0)),
    k: Math.min(50, Math.max(2, Math.floor(+b.trim()) || 2)),
  };
};

function traceSim(raw) {
  const { n, k } = splitCase(raw);
  const steps = [];
  const log = [];
  let burned, stubs, have, round = 0;
  const S = (line, note, x = {}) => {
    const vars = { candles: N(n), need: k };
    if (line >= 2) { vars.burned = N(burned); vars.stubs = N(stubs); vars.have = N(have); }
    const structs = line >= 3 ? [{ label: "burned per round", items: log.slice(-14), newest: !!x.fresh }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `burnCandles(${N(n)}, ${k})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Start with <b>${N(n)}</b> candle${n === 1 ? "" : "s"}; <b>${k}</b> stubs make a new one. The statement walks its example through seven numbered steps, so replaying those steps is the obvious reading — and it is a correct one.`, { focus: "param" });
  burned = 0; stubs = 0; have = n;
  S(2, `Three counters: candles <b>burned</b> in total (the answer), <b>stubs</b> waiting to be traded, and how many candles you <b>have</b> in hand right now.`, { focus: "init", changed: ["burned", "stubs", "have"] });

  let guard = 0;
  for (;;) {
    const go = have > 0;
    S(3, go
      ? `<b>${N(have)}</b> candle${have === 1 ? "" : "s"} in hand — round <b>${round + 1}</b>.`
      : `Nothing left in hand: the last trade produced <b>0</b> candles, so the run is over${stubs ? ` with <b>${stubs}</b> stub${stubs === 1 ? "" : "s"} that can never be traded` : ""}.`,
      { focus: "cond", eval: { expr: `have = ${N(have)} > 0`, val: go } });
    if (!go || guard++ > 300) break;
    round++;
    burned += have; stubs += have;
    log.push(N(have));
    S(4, `Burn all <b>${N(have)}</b>. Total burned is now <b>${N(burned)}</b>, and the stub pile is <b>${N(stubs)}</b> — every candle leaves exactly one stub, which is the fact the closed form is built on.`,
      { focus: "burn", changed: ["burned", "stubs"], fresh: true });
    const made = Math.floor(stubs / k);
    have = made;
    S(5, `Trade <b>${N(stubs)}</b> stubs at <b>${k}</b> apiece → <b>${N(made)}</b> new candle${made === 1 ? "" : "s"}.`, { focus: "make", changed: ["have"] });
    stubs %= k;
    S(6, `<b>${N(stubs)}</b> stub${stubs === 1 ? "" : "s"} left over, carried into the next round. ${made ? `The trade turned ${N(made * k)} stubs into ${N(made)} candles that will become ${N(made)} stubs again — a net loss of <b>${N(made * (k - 1))}</b>, or <b>${k - 1}</b> per candle.` : `Below ${k}, so nothing more can be made.`}`,
      { focus: "carry", changed: ["stubs"] });
  }
  S(8, `<b>Return ${N(burned)}</b> after <b>${round}</b> round${round === 1 ? "" : "s"}. Every round did the same trade at the same rate — which is the hint that the count was computable without replaying any of them.`,
    { focus: "ret", done: true, result: N(burned), ret: { value: N(burned) } });
  return steps;
}

function traceMath(raw) {
  const { n, k } = splitCase(raw);
  const steps = [];
  let net, trades;
  const S = (line, note, x = {}) => {
    const vars = { candles: N(n), need: k };
    if (line >= 3 && net !== undefined) vars.net = net;
    if (line >= 4 && trades !== undefined) vars.trades = N(trades);
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `burnCandles(${N(n)}, ${k})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `The same <b>${N(n)}</b> candles at <b>${k}</b> stubs each — but count instead of replay. The answer is just <b>how many candles ever existed</b>, because each one burns exactly once.`, { focus: "param" });
  if (n < 1) {
    S(2, `<b>${n} &lt; 1</b>: nothing to burn. This guard is not decoration — with 0 candles the formula below would compute ⌊−1 / ${k - 1}⌋ and hand back a negative answer.`, { focus: "guard", eval: { expr: `${n} < 1`, val: true } });
    S(2, `<b>Return 0.</b>`, { focus: "guard", done: true, result: "0", ret: { value: 0 } });
    return steps;
  }
  S(2, `<b>${N(n)} &lt; 1</b> is false, so there is a real run to count.`, { focus: "guard", eval: { expr: `${N(n)} < 1`, val: false } });
  net = k - 1;
  S(3, `Here is the whole insight. One trade takes <b>${k}</b> stubs and gives back a candle — which burns, and returns <b>1</b> stub. So a trade costs <b>${k} − 1 = ${net}</b> stubs, and it costs that <i>every single time</i>, no matter how far into the run you are. A constant price means a division, not a loop.`,
    { focus: "net", changed: ["net"] });
  trades = Math.floor((n - 1) / net);
  S(4, `You will end up producing <b>${N(n)}</b> stubs from the original candles and everything they lead to, and the run stops holding between 1 and ${net} unspendable stubs. Reserve that one up front: <b>⌊(${N(n)} − 1) ÷ ${net}⌋ = ${N(trades)}</b> trades. ${n - 1 < net ? `Here <b>${N(n - 1)}</b> is below <b>${net}</b>, so there is not even one trade to make.` : `Drop the <b>− 1</b> and ${(n - 1) % net === 0 ? `this very input` : `an input like ${N(net + 1)} / ${k}`} claims one trade too many.`}`,
    { focus: "trades", changed: ["trades"] });
  S(5, `<b>${N(n)} + ${N(trades)} = ${N(n + trades)}</b> candles existed, so that many were burned. <b>Return ${N(n + trades)}</b> — one division, whatever the input.`,
    { focus: "ret", done: true, result: N(n + trades), ret: { value: N(n + trades) } });
  return steps;
}

const STEP_INPUT = (value) => ({ type: "text", label: "candles / needed =", value, presets: STEP_PRESETS, hint: "candles / stubs per new one" });

export default {
  n: 19, id: "candles", title: "Candlelight", dates: ["2025-08-29"],
  statement: `You start with a number of candles, and every <b>k</b> burned-out candles can be recycled into one new candle. Burn everything you can and return the <b>total number of candles burned</b>. <span class="rule">Example: <code class="inl">burnCandles(7, 2)</code> → <code class="inl">13</code> — 7, then 3, then 2, then 1.</span>`,
  variants: [
    {
      name: "Burn and recycle", tone: "brute", cost: "O(log n) — one pass per round",
      approach: `The statement's own worked example is a seven-step replay, so replaying it is the natural reading and it is entirely correct: burn everything in hand, add those stubs to whatever was carried over, trade <code class='inl'>k</code> stubs for a candle, repeat until the pile is too small. Two details are easy to lose. The stubs from the <i>new</i> candles have to join the pool — recycling doesn't stop after one round — and the remainder must be <b>carried</b>, not dropped, or <code class='inl'>burnCandles(7, 2)</code> comes to 12 instead of 13. What the loop wastes is subtle: it re-derives a trade whose price is the same on every round.`,
      code: `// Replay the rounds exactly as the statement describes them.
function burnCandles(candles: number, leftoversNeeded: number): number {
  let burned = 0, stubs = 0, have = candles;
  while (have > 0) {
    burned += have;                              // burn everything in hand
    stubs += have;                               // ...each leaves one stub
    have = Math.floor(stubs / leftoversNeeded);  // trade for new candles
    stubs %= leftoversNeeded;                    // CARRY the remainder
  }
  return burned;
}`,
      mount: mountSim,
    },
    {
      name: "Step: replay the rounds", tone: "brute", cost: "one round per stop",
      approach: `Follow the statement's example on <b>7 / 2</b> and watch the carried stub on round 2 be the difference between 13 and 12. Then <b>2345 / 3</b> for nine rounds, and <b>1000000 / 2</b> for twenty-one. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_SIM, trace: traceSim, input: STEP_INPUT("7 / 2") }),
    },
    {
      name: "Closed form", tone: "opt", cost: "O(1) — one division",
      approach: `A trade takes <b>k</b> stubs and returns a candle that burns back into <b>1</b> stub, so its true price is <b>k − 1</b> stubs — and that price never changes, which is exactly the condition under which a loop is a division in disguise. Every candle that ever exists burns once, so the answer is <i>how many existed</i>: the ones you were given plus the ones you traded for. The <b>− 1</b> is the stub you can never spend — a run always ends holding between 1 and k − 1 of them, and reserving one up front is cheaper than testing for it at the end. The <code class='inl'>candles &lt; 1</code> guard matters for the same reason: at 0 the numerator goes negative and the floor drags the answer below zero.`,
      code: `// Every trade costs the same k - 1 stubs, so the count is arithmetic.
function burnCandles(candles: number, leftoversNeeded: number): number {
  if (candles < 1) return 0;              // else (candles - 1) goes negative
  const net = leftoversNeeded - 1;        // k in, 1 stub back out
  const trades = Math.floor((candles - 1) / net);  // the -1 is never spendable
  return candles + trades;                // every candle that existed, burned once
}`,
      mount: mountClosed,
    },
    {
      name: "Step: count the trades", tone: "opt", cost: "one division",
      approach: `Five lines, and the whole run collapses into the third one. Try <b>1 / 5</b>, where <code class='inl'>⌊0 / 4⌋</code> contributes nothing and the answer is the input, then <b>1000000 / 2</b> — the same 1,999,999 the other tab reaches after twenty-one rounds. Hit <b>Step</b> or drag the scrubber.`,
      mount: (host) => mountDebugger(host, { source: SRC_MATH, trace: traceMath, input: STEP_INPUT("2345 / 3") }),
    },
  ],
};
