// #343 · Elevator Stops — only two routes are ever legal, so pick the nearer turn.
// "Visit a floor the moment you first pass it" is the whole problem: it forbids
// doubling back, which collapses the k! orderings down to exactly two — sweep down
// then up, or sweep up then down. Both approaches return the same route:
//   • BRUTE — generate all k! orderings, throw away the ones that skip a floor they
//     pass, and keep the shortest survivor. The wasteful act: it builds 362,880
//     orders on the 9-stop case to discover the two the rule already allowed.
//   • OPT   — never build an order. Split the stops around the current floor, and
//     compare only the two turnaround distances: down-first costs 2·D + U, up-first
//     costs 2·U + D, so down wins exactly when D < U. Ties go up, as the spec says.
// Flip the Approach toggle on the 9-stop case to see 362,880 orders against 2.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's official tests in the order the grader lists them.
// They already cover both directions winning (1 vs 2) and both one-sided shafts
// (3 is all-up, 4 is all-down). Case 6 is invented: the exact tie D === U, which
// no official case produces and which is the only place the "go up first"
// tie-break is observable at all.
const CASES = [
  { floor: 5,  stops: [2, 8, 3, 9],                    label: "5 · down wins" },
  { floor: 6,  stops: [2, 10, 8, 3, 1, 9],             label: "6 · up wins" },
  { floor: 1,  stops: [4, 8, 3, 6, 9],                 label: "1 · all above" },
  { floor: 12, stops: [6, 10, 7, 3, 1, 4],             label: "12 · all below" },
  { floor: 11, stops: [2, 8, 23, 5, 12, 10, 6, 9, 19], label: "11 · 9 stops" },
  { floor: 5,  stops: [3, 7],                          label: "5 · exact tie" },
];

// The optimized route — shared by the demo and the trace so they cannot drift.
function route(currentFloor, stops) {
  const down = stops.filter((f) => f < currentFloor).sort((a, b) => b - a);
  const up = stops.filter((f) => f >= currentFloor).sort((a, b) => a - b);
  const downCost = down.length ? currentFloor - down[down.length - 1] : 0;
  const upCost = up.length ? up[up.length - 1] - currentFloor : 0;
  return { down, up, downCost, upCost, order: downCost < upCost ? [...down, ...up] : [...up, ...down] };
}

// Total floors travelled by a route, and whether it ever sails past a floor that
// still has a waiting request — the constraint that makes most orderings illegal.
function walk(currentFloor, order, allStops) {
  let at = currentFloor, dist = 0;
  const waiting = new Set(allStops);
  for (const f of order) {
    waiting.delete(f);
    const lo = Math.min(at, f), hi = Math.max(at, f);
    for (const g of waiting) if (g > lo && g < hi) return { dist: Infinity, skipped: g, legal: false };
    dist += Math.abs(f - at);
    at = f;
  }
  return { dist, skipped: null, legal: true };
}

// Every ordering of `stops`, scored. Returns the winner plus the tally the demo
// puts on screen — this is the enumeration the optimized approach never performs.
function bruteSearch(currentFloor, stops) {
  let best = null, bestDist = Infinity, examined = 0, legal = 0;
  const order = [], used = stops.map(() => false);
  (function permute() {
    if (order.length === stops.length) {
      examined++;
      const { dist, legal: ok } = walk(currentFloor, order, stops);
      if (!ok) return;
      legal++;
      // Tie-break exactly as the spec says: equal distance → the one heading up.
      if (dist < bestDist || (dist === bestDist && order[0] > currentFloor && !(best[0] > currentFloor))) {
        best = [...order]; bestDist = dist;
      }
      return;
    }
    for (let i = 0; i < stops.length; i++) {
      if (used[i]) continue;
      used[i] = true; order.push(stops[i]);
      permute();
      order.pop(); used[i] = false;
    }
  })();
  return { order: best ?? [], dist: bestDist, examined, legal };
}

const fact = (k) => { let p = 1; for (let i = 2; i <= k; i++) p *= i; return p; };
const fmt = (a) => "[" + a.join(", ") + "]";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ev-wrap { display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; }
    .ev-shaft { display:flex; flex-direction:column-reverse; gap:2px; min-width:186px; }
    .ev-fl { display:grid; grid-template-columns:34px 1fr 26px; align-items:center; gap:8px;
             padding:2px 6px; border-radius:6px; font:12.5px var(--mono); color:var(--muted);
             border:1px solid transparent; }
    .ev-fl .num { text-align:right; font-weight:700; }
    .ev-fl.req { border-color:var(--border); background:var(--panel-2); color:var(--text); }
    .ev-fl.here { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 15%, transparent); color:var(--text); }
    .ev-fl .seq { font:800 11px var(--mono); text-align:center; border-radius:5px; }
    .ev-fl.visited .seq { background:var(--accent); color:var(--bg); }
    .ev-bar { height:9px; border-radius:5px; background:color-mix(in srgb, var(--border) 55%, transparent); }
    .ev-bar.up { background:color-mix(in srgb, var(--good) 55%, transparent); }
    .ev-bar.down { background:color-mix(in srgb, var(--c3) 55%, transparent); }
    .ev-side { flex:1; min-width:250px; }
    .ev-leg { display:flex; gap:14px; flex-wrap:wrap; font:12px var(--sans); color:var(--muted); margin-bottom:10px; }
    .ev-leg i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
  `));
}

// One demo body, two modes. The brute mode enumerates; the opt mode reasons. They
// print the SAME route and a wildly different op count on identical input — which
// is the entire argument for the second tab.
function mountDemo(mode) {
  return function (host) {
    ensureStyle();
    let floor = CASES[0].floor, text = CASES[0].stops.join(", ");

    const pre = el("div", "controls");
    CASES.forEach((c) => {
      const chip = el("button", "chip", esc(c.label));
      chip.onclick = () => { floor = c.floor; text = c.stops.join(", "); fIn.value = floor; sIn.value = text; render(); };
      pre.append(chip);
    });

    const ctl = el("div", "controls");
    const fIn = el("input"); fIn.type = "number"; fIn.value = floor; fIn.style.width = "70px";
    const sIn = el("input"); sIn.type = "text"; sIn.value = text; sIn.style.width = "260px";
    fIn.oninput = () => { floor = Math.round(+fIn.value) || 0; render(); };
    sIn.oninput = () => { text = sIn.value; render(); };
    ctl.append(el("span", "ctl-label", "current floor ="), fIn,
               el("span", "ctl-label", "requests ="), sIn);

    const out = el("div");
    host.append(
      el("div", "note", mode === "brute"
        ? "Type your own requests and watch the <b>orders examined</b> counter follow k! — 4 stops is 24 orders, 9 stops is 362,880. The <b>legal</b> row underneath is the number that survive the pass-them-as-you-go rule, and it is always 1 or 2."
        : "Type your own requests. The shaft shows the two turnaround distances the whole decision rests on: <b>D</b> down to the lowest request, <b>U</b> up to the highest. Nothing else about the stops matters."),
      pre, ctl, out,
    );
    render();

    function render() {
      // Dedup and clamp: 10 stops is 3.6M orderings, which would hang the brute tab.
      const stops = [...new Set(sIn.value.split(",").map((t) => Number(t.trim())).filter((t) => Number.isFinite(t)))].slice(0, 9);
      out.innerHTML = "";
      if (!stops.length) { out.append(el("div", "note", "No requests — the elevator stays put.")); return; }

      const opt = route(floor, stops);
      const brute = mode === "brute" ? bruteSearch(floor, stops) : null;
      const order = brute ? brute.order : opt.order;
      const total = walk(floor, order, stops).dist;
      const seq = new Map(order.map((f, i) => [f, i + 1]));

      const wrap = el("div", "ev-wrap");
      const shaft = el("div", "ev-shaft");
      const lo = Math.min(floor, ...stops), hi = Math.max(floor, ...stops);
      const span = Math.max(1, hi - lo);
      for (let f = lo; f <= hi; f++) {
        const req = stops.includes(f), here = f === floor;
        const row = el("div", "ev-fl" + (here ? " here" : req ? " req" : "") + (seq.has(f) ? " visited" : ""));
        row.append(el("span", "num", String(f)));
        // Bar length encodes the floor's distance from the start, so the two
        // turnarounds are visible as the two longest bars.
        const bar = el("div", "ev-bar" + (f > floor ? " up" : f < floor ? " down" : ""));
        bar.style.width = `${8 + (Math.abs(f - floor) / span) * 92}%`;
        row.append(bar);
        row.append(el("span", "seq", seq.has(f) ? String(seq.get(f)) : here ? "▲▼" : ""));
        shaft.append(row);
      }

      const side = el("div", "ev-side");
      side.append(el("div", "ev-leg",
        `<span><i style="background:color-mix(in srgb, var(--c3) 55%, transparent)"></i>below</span>` +
        `<span><i style="background:color-mix(in srgb, var(--good) 55%, transparent)"></i>above</span>` +
        `<span><i style="background:var(--accent)"></i>stop order</span>`));

      side.append(el("div", "result-line",
        `<span class="badge ok">${esc(fmt(order))}</span>` +
        `<span class="opcount"><span class="n">${total}</span> floors travelled</span>`));

      if (mode === "brute") {
        side.append(el("div", "result-line",
          `<span class="opcount hot"><span class="n">${brute.examined.toLocaleString()}</span> orders examined</span>`));
        side.append(el("div", "result-line",
          `<span class="opcount cool"><span class="n">${brute.legal}</span> legal after the pass-them-as-you-go filter</span>`));
        side.append(el("div", "note",
          `<b>${stops.length}! = ${fact(stops.length).toLocaleString()}</b> orderings were built and scored to keep <b>${brute.legal}</b>. Every discarded one sails past a floor whose light is still on — illegal, not merely slow. The rule was in the prompt the whole time; enumerating never reads it.`));
      } else {
        side.append(el("div", "result-line",
          `<span class="opcount cool"><span class="n">2</span> routes compared</span>`));
        const t = el("table", "cmp");
        t.innerHTML =
          `<tr><th></th><th>stops</th><th>turnaround</th><th>total = 2·turn + other</th></tr>` +
          `<tr><td>down first</td><td>${esc(fmt(opt.down))}</td><td>D = ${opt.downCost}</td>` +
          `<td${opt.downCost < opt.upCost ? ' style="color:var(--good);font-weight:700"' : ""}>${2 * opt.downCost + opt.upCost}</td></tr>` +
          `<tr><td>up first</td><td>${esc(fmt(opt.up))}</td><td>U = ${opt.upCost}</td>` +
          `<td${opt.downCost < opt.upCost ? "" : ' style="color:var(--good);font-weight:700"'}>${2 * opt.upCost + opt.downCost}</td></tr>`;
        side.append(t);
        side.append(el("div", "note", opt.downCost === opt.upCost
          ? `<b>D = U = ${opt.downCost}</b> — a dead tie, so both routes travel exactly ${2 * opt.upCost + opt.downCost} floors. The spec breaks it: <b>go up first</b>. This is the only input shape where that clause changes anything.`
          : opt.downCost < opt.upCost
            ? `<b>D = ${opt.downCost} &lt; U = ${opt.upCost}</b>, so going down first is cheaper. You pay the shorter leg twice — once outbound, once coming back through — and the longer leg only once.`
            : `<b>U = ${opt.upCost} ≤ D = ${opt.downCost}</b>, so going up first is cheaper (or tied, which the spec also awards to up). You pay the shorter leg twice and the longer leg once.`));
      }

      wrap.append(shaft, side);
      out.append(wrap);
    }
  };
}

// ── STEP: enumerate ──────────────────────────────────────────────────────────
// k! is unrenderable past a handful of stops, so this trace curates hard: the
// presets are 2- and 3-stop shafts (2 and 6 orderings). Every official case is
// reachable on both demos above; a 362,880-leaf step-through cannot exist.
const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">elevatorStops</span>(<span class="tok" data-t="params">currentFloor, stops</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> <span class="tok" data-t="init">best = null, bestDist = Infinity</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="gen">order <span class="k">of</span> <span class="fn">permutations</span>(stops)</span>) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="legal">!<span class="fn">isLegal</span>(currentFloor, order)</span>) <span class="k">continue</span>;` },
  { ln: 5,  html: `    <span class="k">const</span> <span class="tok" data-t="dist">d = <span class="fn">distance</span>(currentFloor, order)</span>;` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">d &lt; bestDist || (d === bestDist &amp;&amp; order[0] &gt; currentFloor)</span>) {` },
  { ln: 7,  html: `      <span class="tok" data-t="keep">best = order; bestDist = d</span>;` },
  { ln: 8,  html: `    }` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">best</span>;` },
  { ln: 11, html: `}` },
];

// Small enough to step through: 2 stops → 2 orderings, 3 stops → 6.
const STEP_CASES = [
  { floor: 5, stops: [3, 8] },
  { floor: 5, stops: [2, 3, 8] },
  { floor: 6, stops: [2, 8, 9] },
  { floor: 5, stops: [3, 7] },
];

function permutationsOf(items) {
  if (items.length <= 1) return [items.slice()];
  const out = [];
  items.forEach((x, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    permutationsOf(rest).forEach((p) => out.push([x, ...p]));
  });
  return out;
}

function traceBrute(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const { floor, stops } = STEP_CASES[k - 1];
  const orders = permutationsOf(stops);
  const steps = [];
  let best = null, bestDist = Infinity, order = null, d = null, seen = 0;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) { vars.bestDist = bestDist === Infinity ? "∞" : bestDist; vars.best = best ? fmt(best) : "null"; }
    if (line >= 3 && line <= 8 && order) vars.order = fmt(order);   // the loop's `const` — gone at line 10
    if (line >= 5 && line <= 8 && d != null) vars.d = d;            // declared on line 5
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `elevatorStops(${floor}, ${fmt(stops)})`, vars, changed: x.changed || [],
                 structs: [{ label: "stops", items: stops }], ret: x.ret }],
    });
  };

  S(1, `Start at floor <b>${floor}</b> with <b>${stops.length}</b> request${stops.length === 1 ? "" : "s"}. This approach assumes nothing about the shape of a good route — it will build <b>${stops.length}! = ${orders.length}</b> orderings and let the scoring decide.`,
    { focus: "params" });
  S(2, `<b>bestDist = Infinity</b> so the first legal order always wins, whatever it costs.`, { focus: "init" });

  for (const cand of orders) {
    order = cand; d = null; seen++;
    S(3, `Ordering <b>${seen} of ${orders.length}</b>: <b>${fmt(order)}</b>. The generator emits every arrangement — it has no idea which are physically possible.`,
      { focus: "gen", changed: ["order"] });

    const { dist, skipped, legal } = walk(floor, order, stops);
    if (!legal) {
      S(4, `Illegal: heading for <b>${order[0]}</b> the car passes floor <b>${skipped}</b>, whose light is still on. "Must be visited when the elevator first passes them" forbids sailing by, so this ordering is discarded without ever being measured.`,
        { focus: "legal", eval: { expr: `isLegal(${fmt(order)})`, val: false } });
      continue;
    }
    S(4, `Legal: the car never passes a waiting floor without stopping. This one is worth measuring.`,
      { focus: "legal", eval: { expr: `isLegal(${fmt(order)})`, val: true } });

    d = dist;
    const legs = [];
    let at = floor;
    for (const f of order) { legs.push(`|${f} − ${at}| = ${Math.abs(f - at)}`); at = f; }
    S(5, `Distance = ${legs.join(" + ")} = <b>${d}</b>.`, { focus: "dist", changed: ["d"] });

    const better = d < bestDist;
    const tie = d === bestDist && order[0] > floor && !(best[0] > floor);
    S(6, better
      ? `<b>${d} &lt; ${bestDist === Infinity ? "∞" : bestDist}</b> — a new best.`
      : d === bestDist
        ? `<b>${d} === ${bestDist}</b>, an exact tie. ${tie ? `This one heads <b>up</b> first (${order[0]} &gt; ${floor}) and the incumbent doesn't, so the spec's tie-break hands it the win.` : `The incumbent already heads up, or this one doesn't — keep the incumbent.`}`
        : `<b>${d} &gt; ${bestDist}</b> — legal but longer. Discard.`,
      { focus: "cmp", eval: { expr: `${d} < ${bestDist === Infinity ? "Infinity" : bestDist}`, val: better || tie } });

    if (better || tie) { best = [...order]; bestDist = d; S(7, `Keep <b>${fmt(best)}</b> at <b>${bestDist}</b> floors.`, { focus: "keep", changed: ["best", "bestDist"] }); }
  }

  order = null; d = null;
  S(10, `All <b>${orders.length}</b> orderings scored; <b>${fmt(best)}</b> at ${bestDist} floors survives. Note how few were ever legal — the constraint did almost all the work, and the enumeration only rediscovered it the expensive way.`,
    { focus: "ret", done: true, result: fmt(best), ret: { value: fmt(best) } });
  return steps;
}

// ── STEP: the two-route comparison ───────────────────────────────────────────
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">elevatorStops</span>(<span class="tok" data-t="params">currentFloor, stops</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="down">down = stops.<span class="fn">filter</span>(f =&gt; f &lt; currentFloor).<span class="fn">sort</span>((a, b) =&gt; b - a)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="up">up = stops.<span class="fn">filter</span>(f =&gt; f &gt;= currentFloor).<span class="fn">sort</span>((a, b) =&gt; a - b)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="dcost">downCost = down.length ? currentFloor - down.<span class="fn">at</span>(-1) : 0</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="ucost">upCost = up.length ? up.<span class="fn">at</span>(-1) - currentFloor : 0</span>;` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="pick">downCost &lt; upCost ? [...down, ...up] : [...up, ...down]</span>;` },
  { ln: 7, html: `}` },
];

function traceOpt(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { floor, stops } = CASES[k - 1];
  const r = route(floor, stops);
  const steps = [];
  let line = 1;

  const S = (ln, note, x = {}) => {
    line = ln;
    const vars = {};
    if (ln >= 4) vars.downCost = r.downCost;
    if (ln >= 5) vars.upCost = r.upCost;
    const structs = [{ label: "stops", items: stops }];
    if (ln >= 2) structs.push({ label: "down", items: r.down });   // scope by omission:
    if (ln >= 3) structs.push({ label: "up", items: r.up });       // each appears on its own line
    steps.push({
      line: ln, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `elevatorStops(${floor}, ${fmt(stops)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Start at floor <b>${floor}</b>. The trick is to stop thinking about <i>orderings</i>. Because a waiting floor must be served the moment it's passed, the car can only ever sweep one way, turn once, and sweep back — so there are exactly <b>two</b> routes, no matter how many requests there are.`,
    { focus: "params" });
  S(2, `Everything strictly below ${floor}, sorted <b>descending</b>: <b>${fmt(r.down)}</b>. Descending because that is the order the car meets them on the way down — the sort <i>is</i> the pass-them-as-you-go rule.`,
    { focus: "down" });
  S(3, `Everything at or above ${floor}, sorted <b>ascending</b>: <b>${fmt(r.up)}</b>. A request on the current floor lands here with distance 0.`,
    { focus: "up" });
  S(4, r.down.length
    ? `The down turnaround is the <b>lowest</b> request: <b>${floor} − ${r.down[r.down.length - 1]} = ${r.downCost}</b>. Only the far end matters — the stops in between are free, since the car passes them anyway.`
    : `Nothing below, so <b>D = 0</b>.`,
    { focus: "dcost", changed: ["downCost"] });
  S(5, r.up.length
    ? `The up turnaround is the <b>highest</b> request: <b>${r.up[r.up.length - 1]} − ${floor} = ${r.upCost}</b>.`
    : `Nothing above, so <b>U = 0</b>.`,
    { focus: "ucost", changed: ["upCost"] });

  const downFirst = r.downCost < r.upCost;
  S(6, `Down-first travels <b>2·D + U = ${2 * r.downCost + r.upCost}</b>; up-first travels <b>2·U + D = ${2 * r.upCost + r.downCost}</b> — you always pay the leg you do <i>first</i> twice, because you have to come back through it. So the cheaper route is simply the one with the nearer turnaround, and the comparison reduces to <b>D &lt; U</b>. ${
    r.downCost === r.upCost
      ? `Here they are <b>equal</b>, so <code class='inl'>&lt;</code> is false and the car goes <b>up</b> first — which is exactly the tie-break the prompt asked for. Writing <code class='inl'>&lt;=</code> here would silently break that rule.`
      : downFirst ? `Here <b>${r.downCost} &lt; ${r.upCost}</b>, so down first.` : `Here <b>${r.downCost} ≥ ${r.upCost}</b>, so up first.`}`,
    { focus: "pick", eval: { expr: `downCost (${r.downCost}) < upCost (${r.upCost})`, val: downFirst },
      done: true, result: fmt(r.order), ret: { value: fmt(r.order) } });
  return steps;
}

const STEP_IN_BRUTE = { label: "case =", value: 2, min: 1, max: STEP_CASES.length,
  presets: STEP_CASES.map((_, i) => i + 1), hint: `1–${STEP_CASES.length}: small shafts only — k! grows too fast to render` };
const STEP_IN_OPT = { label: "case =", value: 1, min: 1, max: CASES.length,
  presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` };

export default {
  n: 343, id: "elevator", title: "Elevator Stops", dates: ["2026-07-19"],
  statement: `Given the elevator's current floor and an array of requested floors, return the order it should visit them to <b>minimize floors travelled</b>. If tied, go up first. A floor with a request must be visited when the elevator <b>first passes</b> it. <span class="rule">Example: <code class="inl">elevatorStops(5, [2, 8, 3, 9])</code> → <b>[3, 2, 8, 9]</b> — down to 2 costs 3 floors and back up to 9 costs 7, for 10; going up first would cost 11.</span>`,
  variants: [
    {
      name: "Enumerate every order", tone: "brute", cost: "O(k! · k) — 362,880 orders",
      approach: `Take "minimize floors travelled" at face value and search for the minimum. Generate all <b>k!</b> arrangements of the requested floors, discard any that sail past a floor still waiting, measure what survives, and keep the shortest — with the spec's tie-break applied literally. It needs <i>no</i> insight into elevators, which is its appeal, and it costs <b>362,880</b> constructed orders on the nine-stop official case to end up choosing between the same two routes every time. Watch the <b>legal</b> counter: it is never more than 2.`,
      code: `// Search for the minimum instead of reasoning about it: build all k!
// orderings, keep the physically legal ones, take the shortest.
function elevatorStops(currentFloor: number, stops: number[]): number[] {
  function permutations(items: number[]): number[][] {
    if (items.length <= 1) return [items.slice()];
    const out: number[][] = [];
    items.forEach((x, i) => {
      const rest = [...items.slice(0, i), ...items.slice(i + 1)];
      for (const p of permutations(rest)) out.push([x, ...p]);
    });
    return out;
  }

  // Illegal if the car ever passes a floor whose request is still waiting.
  function isLegal(from: number, order: number[]): boolean {
    let at = from;
    const waiting = new Set(order);
    for (const f of order) {
      waiting.delete(f);
      for (const g of waiting) if (g > Math.min(at, f) && g < Math.max(at, f)) return false;
      at = f;
    }
    return true;
  }

  const distance = (from: number, order: number[]): number =>
    order.reduce((d, f, i) => d + Math.abs(f - (i ? order[i - 1] : from)), 0);

  let best: number[] = [], bestDist = Infinity;
  for (const order of permutations(stops)) {
    if (!isLegal(currentFloor, order)) continue;
    const d = distance(currentFloor, order);
    // Ties go to the route heading up, as the spec requires.
    if (d < bestDist || (d === bestDist && order[0] > currentFloor && !(best[0] > currentFloor))) {
      best = order;
      bestDist = d;
    }
  }
  return best;
}`,
      mount: mountDemo("brute"),
    },
    {
      name: "Step: enumerate every order", tone: "brute", cost: "one pass per ordering",
      approach: `A debugger for the search. Watch how many orderings die on line 4 without ever being measured — on the 3-stop case, four of six are illegal before a single distance is computed. That ratio is the tell: the constraint had already narrowed the answer to two routes, and the enumeration is paying k! to rediscover it. The presets stop at three stops on purpose; the nine-stop official case is 362,880 leaves and cannot be rendered as a trace at all. It lives on the demos instead. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: STEP_IN_BRUTE }),
    },
    {
      name: "Pick the nearer turnaround", tone: "opt", cost: "O(k log k) — 2 routes",
      approach: `Never build an ordering. The pass-them-as-you-go rule means the car sweeps one direction, turns exactly once, and sweeps back — so the route is fully determined by <i>which way it goes first</i>, and there are only two candidates. Split the stops around the current floor and sort each side into the order the car meets them. Then note that whichever leg you take first gets travelled <b>twice</b> — out and back through — so down-first costs <code class='inl'>2·D + U</code> and up-first costs <code class='inl'>2·U + D</code>. Subtract: down wins exactly when <b>D &lt; U</b>. The intermediate stops never enter the arithmetic, because the car passes them for free either way. Strict <code class='inl'>&lt;</code> delivers the "if tied, go up first" clause for nothing.`,
      code: `// Only two routes are legal, so compare their turnarounds and stop.
// Take the first leg twice (out and back), the second leg once:
//   down first = 2·D + U     up first = 2·U + D     →  down wins iff D < U
function elevatorStops(currentFloor: number, stops: number[]): number[] {
  // Sorted into the order the car actually meets them on each sweep.
  const down = stops.filter((f) => f < currentFloor).sort((a, b) => b - a);
  const up = stops.filter((f) => f >= currentFloor).sort((a, b) => a - b);

  // Only the far end of each side costs anything; the rest are passed anyway.
  const downCost = down.length ? currentFloor - down[down.length - 1] : 0;
  const upCost = up.length ? up[up.length - 1] - currentFloor : 0;

  // Strict < is the tie-break: equal turnarounds fall through to up-first.
  return downCost < upCost ? [...down, ...up] : [...up, ...down];
}`,
      mount: mountDemo("opt"),
    },
    {
      name: "Step: pick the nearer turnaround", tone: "opt", cost: "one pass, no search",
      approach: `Six lines, and the same route. Watch <b>down</b> and <b>up</b> appear as the sweeps the car will actually make, then watch the entire decision collapse into one comparison on line 6. Run the <b>9 stops</b> case here and in the enumeration tab back to back: identical <code class='inl'>[10, 9, 8, 6, 5, 2, 12, 19, 23]</code>, from <b>2</b> compared routes instead of <b>362,880</b> constructed ones. The <b>exact tie</b> case is the one to watch on line 6 — it is the only input where <code class='inl'>&lt;</code> versus <code class='inl'>&lt;=</code> changes the answer. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: STEP_IN_OPT }),
    },
  ],
};
