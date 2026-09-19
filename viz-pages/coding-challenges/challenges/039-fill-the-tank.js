// #39 · Fill The Tank — the arithmetic is free; the last bullet is the problem.
// The sum is one subtraction and one multiplication, so a statement that spends
// its final bullet specifying an OUTPUT FORMAT is telling you where the difficulty
// actually lives. `toFixed(2)` discharges all three obligations of "$d.dd" at once
// — two decimals, a leading digit, a decimal point — and returns a string, which is
// why the "$" concatenates. But it rounds the stored DOUBLE, not the decimal you
// typed: (1.005).toFixed(2) is "1.00", because the nearest double to 1.005 is
// 1.0049999999999998934. None of freeCodeCamp's five cases lands on a midpoint, so
// the grader cannot catch this — the last three presets are ours and they do.
// ONE approach, deliberately. There is no second way to multiply two numbers, and
// swapping in Math.round(x * 100) / 100 is a different bug rather than a fix.
// Start on 15 / 9.5 / 3.98 and open the full-precision row to see the stored value
// is 21.890000000000000568, not 21.89. Then hit the 10, 9, 1.005 chip to watch the
// dollar every human would write as $1.01 come back as $1.00.
import { el, esc, mountDebugger } from "../shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then three of ours.
//   15, 12.5, 3.99 — ours, and the control for the two below. 2.5 × 3.99 stores as
//     9.975000000000001, the only preset where JS's own short printout already
//     shows the noise; it is a midpoint too, but the error leans UP, so the answer
//     comes out the way a human would write it. Same shape, opposite luck.
//   15, 14.5, 4.05 — ours. Half a gallon at $4.05 reaches the decimal midpoint
//     2.025 through arguments a driver could actually have, rather than through a
//     bare number picked to break. It stores as 2.0249999999999999112, just BELOW
//     the midpoint, so toFixed(2) gives "2.02". But 2.025 * 100 is exactly 202.5 —
//     the scaling lands the value back ON the midpoint it was sitting below — and
//     Math.round takes halves up to 203. The two strategies disagree by a cent.
//   10, 9, 1.005 — ours, and the loudest form of the gotcha: one gallon at $1.005,
//     where toFixed AND Math.round both answer "$1.00" and every human says $1.01.
// Each official case lands on a different outcome — whole dollars, an exact tenth,
// an exact quarter, the zero-gallon "already full" path, and fractional gallons —
// and not one of them lands on a midpoint, which is exactly why ours are here.
const OFFICIAL = [[20, 0, 4.00], [15, 10, 3.50], [18, 9, 3.25], [12, 12, 4.99], [15, 9.5, 3.98]];
const CASES = [...OFFICIAL, [15, 12.5, 3.99], [15, 14.5, 4.05], [10, 9, 1.005]];

const MAX_TANK = 30, MAX_PRICE = 8;

// What the double actually is. JS prints the SHORTEST string that round-trips, so
// String(21.89) hides the fact that the stored value is 21.890000000000000568 —
// and that hidden tail is the thing toFixed is really rounding.
const expand = (x) => Math.abs(x).toPrecision(20);

// A double landed on its decimal exactly when the 20-digit expansion runs out in
// zeros. Anything else means the stored value sits a hair above or below.
const isExact = (x) => /0{8}$/.test(expand(x));

// Reproduce the decision toFixed(2) makes, in DECIMAL. Truncate the expansion at
// two places to get the lower candidate; the midpoint it is judged against is that
// truncation plus "5"; the rest of the expansion is the tail doing the judging.
// The comparison is on digit TEXT, deliberately — comparing `total < 1.005` as
// doubles re-runs the very approximation this is trying to expose, and comes out
// "equal" on the one case where the whole lesson lives.
function roundingCall(total) {
  const s = expand(total);
  const dot = s.indexOf(".");
  const lo = s.slice(0, dot + 3);            // "1.00"
  const tail = s.slice(dot + 3);             // "49999999999998934"
  const mid = "5".padEnd(tail.length, "0");  // the same length, for a text compare
  return { s, lo, mid: lo + "5", tail, rel: tail === mid ? "at" : tail < mid ? "below" : "above" };
}

// Print a price the way the statement writes it: 4 → "4.00", 1.005 → "1.005".
const price = (p) => (Math.round(p * 1000) % 10 === 0 ? p.toFixed(2) : p.toFixed(3));
const label = ([t, f, p]) => `${t}, ${f}, ${price(p)}`;
const argStr = ([t, f, p]) => `${t},${f},${price(p)}`;

const parseArgs = (str) => {
  const n = String(str).split(",").map((x) => Number(x.trim()));
  return [0, 1, 2].map((i) => (Number.isFinite(n[i]) ? n[i] : 0));
};

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ft-wrap { display:flex; flex-direction:column; gap:12px; }
    .ft-ctl { display:grid; grid-template-columns:132px 1fr 82px; gap:8px 10px; align-items:center; margin-bottom:6px; }
    .ft-ctl .lbl { font:12px var(--mono); color:var(--muted); }
    .ft-track { width:100%; height:52px; display:flex; align-items:stretch; }
    .ft-tank { display:flex; border:2px solid var(--border); border-radius:11px; overflow:hidden; background:var(--panel-2); transition:width .12s linear; }
    .ft-seg { display:flex; align-items:center; justify-content:center; font:700 11.5px var(--mono); white-space:nowrap; overflow:hidden; }
    .ft-fuel { background:color-mix(in srgb, var(--good) 38%, transparent); color:var(--good); }
    .ft-gap { color:var(--accent); background:repeating-linear-gradient(135deg, color-mix(in srgb, var(--accent) 26%, transparent) 0 7px, transparent 7px 14px); }
    .ft-cap { font:11px var(--mono); color:var(--muted); align-self:center; padding-left:9px; white-space:nowrap; }
    .ft-head { font:800 34px var(--mono); color:var(--good); font-variant-numeric:tabular-nums; line-height:1; }
    .ft-headlbl { font:12px var(--sans); color:var(--muted); }
    .ft-rows { display:flex; flex-direction:column; gap:4px; }
    .ft-row { display:grid; grid-template-columns:150px 1fr; gap:10px; align-items:baseline; padding:5px 9px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); }
    .ft-row .rk { font:11px var(--sans); color:var(--muted); }
    .ft-row .rv { font:13px var(--mono); color:var(--text); word-break:break-all; }
    .ft-row.hot { border-color:var(--warn); }
    .ft-row.hot .rv { color:var(--warn); }
    .ft-row .dim { color:var(--muted); }
    .ft-cmp { display:flex; flex-wrap:wrap; gap:7px; align-items:stretch; }
    .ft-card { flex:1; min-width:168px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:7px 10px; }
    .ft-card .ck { font:11px var(--mono); color:var(--muted); display:block; }
    .ft-card .cv { font:800 19px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; }
    .ft-card.split { border-color:var(--danger); }
    .ft-card.split .cv { color:var(--danger); }
    .ft-mine { font:700 10px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--warn); border:1px solid var(--warn); border-radius:5px; padding:2px 6px; }
  `));
}

function mount(host) {
  ensureStyle();

  const ctl = el("div", "ft-ctl");
  // A slider AND a number box per argument, kept in sync. Dragging explores; the
  // box is what makes an exact official value (9.5, 3.98) reachable without a chip.
  const mk = (text, min, max, step, value) => {
    const rng = el("input"); rng.type = "range";
    const num = el("input"); num.type = "number"; num.style.width = "76px";
    for (const i of [rng, num]) { i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(value); }
    ctl.append(el("span", "lbl", text), rng, num);
    rng.oninput = () => { num.value = rng.value; render(); };
    num.oninput = () => { rng.value = num.value; render(); };
    return { rng, num, get: () => +num.value, set: (v) => { num.value = rng.value = String(v); } };
  };
  // 0.5-gallon steps so the official 9.5 is reachable by dragging; 0.005-dollar
  // steps so 4.00/3.50/3.25/4.99/3.98 all sit on the grid AND the midpoint case at
  // 1.005 does too. A 0.01 step would push the whole gotcha off the slider's grid,
  // where the range input would silently snap it to 1.00 and hide the lesson.
  const tank = mk("tankSize", 1, MAX_TANK, 0.5, 15);
  const fuel = mk("fuelLevel", 0, MAX_TANK, 0.5, 9.5);
  const cost = mk("pricePerGallon", 0, MAX_PRICE, 0.005, 3.98);

  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((c, i) => {
    const b = el("button", "chip", label(c) + (i >= OFFICIAL.length ? " ✦" : ""));
    b.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours, not freeCodeCamp's";
    b.onclick = () => { tank.set(c[0]); fuel.set(c[1]); cost.set(c[2]); render(); };
    pre.append(b);
  });

  const cmpChip = el("button", "chip", "compare rounding strategies");
  let showCmp = false;
  cmpChip.onclick = () => { showCmp = !showCmp; cmpChip.classList.toggle("on", showCmp); render(); };
  pre.append(cmpChip);

  const out = el("div");
  host.append(ctl, el("div", "muted", `The <b>fuelLevel</b> control is capped at <b>tankSize</b>, because a tank cannot hold more than it holds. The <i>function</i> has no such guard and the statement never asks for one — hand it a fuel level above the capacity and the gallon count goes negative, the product goes negative, and <code class='inl'>toFixed(2)</code> faithfully formats it: <code class='inl'>costToFill(10, 12, 3.50)</code> returns <b>"$-7.00"</b>, a dollar sign glued to a minus. The step-through's free-text input will let you try it.`), pre, out);
  render();

  function render() {
    // The cap is enforced here rather than once at setup, so that shrinking the
    // tank under a parked fuel level pulls the fuel down with it. Raise the
    // ceiling BEFORE clamping: a preset that grows the tank sets the fuel while
    // the range input still carries the old, smaller max, and a range silently
    // clamps its own value — which would leave the slider disagreeing with the
    // number box. The second branch repairs exactly that, without touching the
    // box, so it cannot eat a half-typed number.
    const tankSize = tank.get();
    fuel.rng.max = fuel.num.max = String(tankSize);
    let fuelLevel = fuel.get();
    if (fuelLevel > tankSize) { fuelLevel = tankSize; fuel.set(fuelLevel); }
    else if (fuel.rng.value !== fuel.num.value) fuel.rng.value = fuel.num.value;
    const pricePerGallon = cost.get();

    const gallons = tankSize - fuelLevel;
    const total = gallons * pricePerGallon;
    const cents = total.toFixed(2);
    const answer = "$" + cents;
    const r = roundingCall(total);
    const alt = (Math.round(total * 100) / 100).toFixed(2);
    const mine = CASES.findIndex((c) => c[0] === tankSize && c[1] === fuelLevel && c[2] === pricePerGallon);

    out.innerHTML = "";
    const wrap = el("div", "ft-wrap");

    wrap.append(el("div", "result-line",
      `<span class="ft-headlbl">costToFill(${tankSize}, ${fuelLevel}, ${price(pricePerGallon)}) →</span>` +
      `<span class="ft-head">${esc(answer)}</span>` +
      (mine >= OFFICIAL.length ? `<span class="ft-mine">our case, not fCC's</span>` : "")));

    // The gauge: the tank's own width scales with tankSize, so shrinking the tank
    // shrinks the picture rather than just re-labelling it.
    const track = el("div", "ft-track");
    const box = el("div", "ft-tank");
    box.style.width = `${(tankSize / MAX_TANK) * 100}%`;
    const fp = tankSize ? (fuelLevel / tankSize) * 100 : 0;
    const f1 = el("div", "ft-seg ft-fuel", fuelLevel ? `${fuelLevel} in tank` : "");
    f1.style.width = `${fp}%`;
    const f2 = el("div", "ft-seg ft-gap", gallons ? `+ ${gallons} gal` : "");
    f2.style.width = `${100 - fp}%`;
    box.append(f1, f2);
    track.append(box, el("span", "ft-cap", `${tankSize} gal tank`));
    wrap.append(track);

    const rows = el("div", "ft-rows");
    const row = (k, v, hot) => rows.append(el("div", "ft-row" + (hot ? " hot" : ""),
      `<span class="rk">${k}</span><span class="rv">${v}</span>`));
    row("gallons needed", `${tankSize} − ${fuelLevel} = <b>${gallons}</b> gal`);
    row("raw product", `${gallons} × ${price(pricePerGallon)} = <b>${total}</b> <span class="dim">← what JS prints</span>`);
    row("what is stored", `<b>${r.s}</b>`, !isExact(total));
    row("toFixed(2)", `<b>"${cents}"</b> <span class="dim">← a string, not a number</span>`);
    row('"$" + cents', `<b>${esc(answer)}</b>`);
    wrap.append(rows);

    if (showCmp) {
      const split = cents !== alt;
      const cmp = el("div", "ft-cmp");
      cmp.append(el("div", "ft-card" + (split ? " split" : ""),
        `<span class="ck">"$" + total.toFixed(2)</span><span class="cv">$${esc(cents)}</span>`));
      cmp.append(el("div", "ft-card" + (split ? " split" : ""),
        `<span class="ck">Math.round(total * 100) / 100</span><span class="cv">$${esc(alt)}</span>`));
      wrap.append(cmp);
      wrap.append(el("div", "muted", split
        ? `The two strategies <b>disagree</b>, by a cent, on the same input. Here is why: the stored product is <b>${r.s}</b>, a hair <b>${r.rel}</b> the midpoint <b>${r.mid}</b>, and <code class='inl'>toFixed(2)</code> judges it exactly there. Scaling judges something else — <code class='inl'>total * 100</code> is <b>${total * 100}</b>, and that multiplication has <i>rounded away</i> the very tail the decision rested on, landing the value back on the midpoint it was sitting ${r.rel} it. <code class='inl'>Math.round</code> then applies its own rule, halves go up, and out comes the other cent. Neither is a fix for the other: one rounds the true value, the other rounds a value it damaged on the way in.`
        : `Both strategies agree on this input. They agree on every official case too, which is why neither one's failure mode shows up until you go looking for it.`));
    }

    wrap.append(el("div", "note", noteFor({ tankSize, fuelLevel, pricePerGallon, gallons, total, cents, answer, r, alt })));
    out.append(wrap);
  }
}

function noteFor({ tankSize, fuelLevel, pricePerGallon, gallons, total, cents, answer, r, alt }) {
  if (gallons === 0)
    return `The tank is already full, so <b>${tankSize} − ${fuelLevel}</b> is <b>0</b> and zero gallons at any price is zero dollars. This is the case that proves the "already full" path needs <b>no special-casing</b> — there is nothing to branch on, because the arithmetic already produces the right number and the formatter does the rest. Note what <code class='inl'>toFixed(2)</code> is doing here that a naive formatter would not: it emits <b>"0.00"</b> and not <code class='inl'>"0"</code>, and it keeps the leading digit rather than handing back <code class='inl'>".00"</code>. Three separate obligations of the <code class='inl'>"$d.dd"</code> format, all discharged by one call.`;
  if (r.rel === "at")
    return `The stored value is <b>exactly</b> the midpoint <b>${r.mid}</b>, so <code class='inl'>toFixed</code> falls back on its documented tie rule and rounds away from the lower candidate — the one case where the spec, rather than the approximation, decides.`;
  const nearMid = r.tail.slice(0, 3) === "499" || r.tail.slice(0, 3) === "500";
  const up = "$" + (Number(r.lo) + 0.01).toFixed(2);
  if (nearMid && r.rel === "below")
    return `This is the whole problem in one input. The decimal answer is <b>${r.mid}</b> — an exact midpoint, the kind every human rounds <b>up</b> to <b>${up}</b>. But <code class='inl'>${gallons} × ${price(pricePerGallon)}</code> does not store <b>${r.mid}</b>; it stores <b>${r.s}</b>, which is a hair <b>below</b> it, because a decimal midpoint ending in 5 is never exactly representable in binary. <code class='inl'>toFixed(2)</code> rounds what is actually there, so the answer comes back <b>${answer}</b> and not ${up}. Nothing here is a JavaScript wart — it is an <b>IEEE-754</b> consequence every language with binary floats shares. And no official case reaches it: freeCodeCamp's five all land clear of a midpoint, so the grader marks this solution correct and always will.`;
  if (nearMid)
    return `A decimal midpoint again — <b>${r.mid}</b> — but this one comes out the way you wanted, and that is the point of having it next to the others. The stored value is <b>${r.s}</b>, a hair <b>above</b> the midpoint rather than below it, so <code class='inl'>toFixed(2)</code> rounds up to <b>${answer}</b>, which is exactly what a human would have written. The approximation did not get better here; it simply happened to lean the other way. Compare with <b>15, 14.5, 4.05</b> — the same shape, the same one place of noise, and the lean goes against you. A test suite full of cases like this one is what lets the bug reach production.`;
  if (!isExact(total))
    return `<code class='inl'>${gallons} × ${price(pricePerGallon)}</code> prints as <b>${total}</b>, but the value actually sitting in memory is <b>${r.s}</b> — a hair <b>${r.rel}</b> the decimal you meant. That gap is invisible at the printing stage because JS shows the shortest string that round-trips back to the same double. It only matters at the rounding step, and here it does not matter at all: the tail is nowhere near the midpoint <b>${r.mid}</b>, so <code class='inl'>toFixed(2)</code> lands on <b>${answer}</b> regardless. Hit the <b>15, 14.5, 4.05</b> chip and the same invisible gap decides the cents instead.`;
  return `<code class='inl'>${gallons} × ${price(pricePerGallon)}</code> is <b>${total}</b>, and the double holds it <b>exactly</b> — <b>${r.s}</b>, zeros all the way down. That is the comfortable case, and it is the one the official tests are made of: four of freeCodeCamp's five products are exactly representable, so nothing about the rounding is ever put under pressure. <code class='inl'>toFixed(2)</code> still earns its place by padding to two decimals — <b>${answer}</b>, not <code class='inl'>$${String(total)}</code>, which is what <code class='inl'>String(total)</code> alone would have given you.`;
}

// ── STEP — four lines, and the interesting one is the third. The value being
// rounded gets named at full precision at the moment toFixed looks at it.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">costToFill</span>(<span class="tok" data-t="args">tankSize, fuelLevel, pricePerGallon</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="gal">gallons = tankSize - fuelLevel</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="mul">total = gallons * pricePerGallon</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="fix">cents = total.<span class="fn">toFixed</span>(<span class="nu">2</span>)</span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="cat"><span class="st">"$"</span> + cents</span>;` },
  { ln: 6, html: `}` },
];

function trace(input) {
  const [tankSize, fuelLevel, pricePerGallon] = parseArgs(input);
  const steps = [];
  let gallons, total, cents;
  const S = (line, note, x = {}) => {
    const vars = { tankSize, fuelLevel, pricePerGallon };
    // Scope by omission: each local appears only once its declaration has run.
    // Line 4 gets TWO steps — one weighing the rounding, one after the binding
    // exists — so `cents` is gated on having been assigned rather than on the
    // line number, which would print `cents: undefined` for the first of them.
    if (line >= 2) vars.gallons = gallons;
    if (line >= 3) vars.total = total;
    if (cents !== undefined) vars.cents = `"${cents}"`;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `costToFill(${tankSize}, ${fuelLevel}, ${pricePerGallon})`, vars, changed: x.changed || [] }] });
  };

  S(1, `Three numbers in, one <b>string</b> out. The statement's first three bullets describe an arithmetic problem a calculator solves; the fourth — <i>"rounded to two decimal places in the format <code class='inl'>"$d.dd"</code>"</i> — is the only one that can go wrong, and it is where every real bug in this shape of problem lives.`, { focus: "args" });

  gallons = tankSize - fuelLevel;
  S(2, gallons === 0
    ? `The tank is already full: <b>${tankSize} − ${fuelLevel} = 0</b>. No branch is needed for this — zero gallons times any price is zero dollars, and the formatter turns that into <code class='inl'>"$0.00"</code> without being asked. A special case here would be code that never changes an answer.`
    : gallons < 0
      ? `<b>${tankSize} − ${fuelLevel} = ${gallons}</b>, a <b>negative</b> gallon count, because the fuel level handed in is above the tank's capacity. The statement never says what should happen — so nothing here guards against it, and the negative simply flows onward into a negative cost.`
      : `<b>${tankSize} − ${fuelLevel} = ${gallons}</b> gallons of headroom to pay for. Both operands are multiples of a half here, and halves are exactly representable in binary, so this subtraction is <b>exact</b>. The trouble starts on the next line.`,
    { focus: "gal", changed: ["gallons"] });

  total = gallons * pricePerGallon;
  const r = roundingCall(total);
  const exact = isExact(total);
  S(3, exact
    ? `<b>${gallons} × ${pricePerGallon} = ${total}</b>, and the double holds that <b>exactly</b>: <b>${r.s}</b>, zeros all the way down. Four of freeCodeCamp's five cases look like this, which is why the format clause never feels dangerous while you are passing the grader.`
    : `JavaScript prints <b>${total}</b>, and that is a lie of omission — it prints the <i>shortest</i> string that reads back as the same double. The value actually stored is <b>${r.s}</b>, a hair <b>${r.rel}</b> the decimal you meant. Nothing has gone wrong yet; the gap is far too small to see. It becomes visible only when something has to choose between two 2-decimal strings.`,
    { focus: "mul", changed: ["total"], eval: { expr: `${gallons} * ${pricePerGallon} is exact in binary`, val: exact } });

  const nearMid = r.tail.slice(0, 3) === "499" || r.tail.slice(0, 3) === "500";
  if (total >= 0) {
    S(4, `<code class='inl'>toFixed(2)</code> now has to pick between <b>${r.lo}</b> and the next hundredth up. The question it asks is whether the value is past the midpoint <b>${r.mid}</b> — and the value it asks about is <b>${r.s}</b>, the binary one, not the decimal one. That tail reads <b>${r.rel}</b> the midpoint.`,
      { focus: "fix", eval: { expr: `${r.s} > ${r.mid}`, val: r.rel === "above" } });
  } else {
    S(4, `<code class='inl'>toFixed(2)</code> formats the magnitude and carries the sign, so a negative total comes back as a string beginning with <code class='inl'>-</code>. Worth pausing on: the statement's format is <code class='inl'>"$d.dd"</code> and there is no <code class='inl'>d</code> that is a minus sign. Nothing rejects it; it simply is not a case the spec contemplated.`,
      { focus: "fix" });
  }

  cents = total.toFixed(2);
  S(4, nearMid && total >= 0
    ? `<b>cents = "${cents}"</b> — and this is the case worth remembering. The <i>decimal</i> product is exactly <b>${r.mid}</b>, a midpoint every human rounds <b>up</b>. The <i>stored</i> product is <b>${r.s}</b>, a hair <b>${r.rel}</b> it, and <code class='inl'>toFixed</code> rounded the number it was actually given${r.rel === "below" ? ` — so it went <b>down</b>, against every expectation you had` : ` — which this time happened to agree with you, purely because the error leaned the right way`}. A decimal midpoint ending in 5 is never exactly representable in binary, in any language, which is why this is IEEE-754 and not a JavaScript wart.`
    : `<b>cents = "${cents}"</b>. Note the type: <code class='inl'>toFixed</code> returns a <b>string</b>, not a number — which is the whole reason the two decimals survive. <code class='inl'>${total}</code> as a number has no memory of how many places you wanted.`,
    { focus: "fix", changed: ["cents"] });

  const answer = "$" + cents;
  S(5, `<b>Return "${answer}".</b> Because <code class='inl'>cents</code> is already a string, <code class='inl'>"$" + cents</code> is concatenation rather than arithmetic, and one call has satisfied all three obligations of <code class='inl'>"$d.dd"</code>: always two decimals (<b>"$80.00"</b>, never <code class='inl'>"$80"</code>), always at least one leading digit (<b>"$0.00"</b>, never <code class='inl'>"$.00"</code>), and the point itself even when the cents are zero. Anything downstream that wants to <i>add</i> this to something has to parse it back — which is the last reminder that a formatted currency string is an output, not a value.`,
    { focus: "cat", done: true, result: answer });
  return steps;
}

export default {
  n: 39, id: "filltank", title: "Fill The Tank", dates: ["2025-09-18"],
  statement: `Given the size of a fuel tank, the current fuel level, and the price per gallon, return the <b>cost to fill the tank all the way</b>. <code class="inl">tankSize</code> is the tank's total capacity in gallons, <code class="inl">fuelLevel</code> is how many gallons are in it now, and <code class="inl">pricePerGallon</code> is the cost of one gallon. The returned value should be rounded to <b>two decimal places</b> in the format <code class="inl">"$d.dd"</code>. <span class="rule">Example: <code class="inl">costToFill(15, 9.5, 3.98)</code> → <code class="inl">"$21.89"</code>, and <code class="inl">costToFill(12, 12, 4.99)</code> → <code class="inl">"$0.00"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — one subtract, one multiply",
      approach: `The sum is a subtraction and a multiplication, and it is worth noticing how little of the statement that consumes. Three bullets define the inputs; the fourth defines an <b>output format</b>, and a spec that spends its last clause pinning a currency format is telling you the whole difficulty is there. <code class='inl'>toFixed(2)</code> is the intended answer because it discharges three separate obligations in one call: always two decimals, so <code class='inl'>80</code> renders <b>"$80.00"</b> and not <code class='inl'>"$80"</code>; always at least one leading digit, so the already-full case renders <b>"$0.00"</b> and not <code class='inl'>"$.00"</code>; and a decimal point even when the cents are zero. It also returns a <b>string</b>, which is why <code class='inl'>"$" + cents</code> concatenates cleanly — and a standing hint that nothing downstream should do arithmetic on the result. The zero-gallon case is the one that shows no special-casing is needed: <code class='inl'>costToFill(12, 12, 4.99)</code> subtracts to <b>0</b>, multiplies to <b>0</b>, and the formatter handles the rest, so an <code class='inl'>if (fuelLevel === tankSize)</code> branch would be code that can never change an answer. The part worth carrying away is what <code class='inl'>toFixed</code> is actually rounding. It rounds the stored <b>double</b>, not the decimal you typed, and decimal midpoints ending in 5 are never exactly representable in binary — so <code class='inl'>(1.005).toFixed(2)</code> is <b>"1.00"</b>, because the nearest double to 1.005 is <b>1.0049999999999998934</b>. Hit the <b>10, 9, 1.005</b> chip to watch one gallon at $1.005 come back as <b>$1.00</b> where every human writes $1.01; that case is ours, and no official test can catch it because freeCodeCamp's five all land clear of a midpoint. Turn on <b>compare rounding strategies</b> and you will see that <code class='inl'>Math.round(total * 100) / 100</code> is not the fix either. At <b>15, 14.5, 4.05</b> the two disagree by a cent: half a gallon at $4.05 stores as <b>2.0249999999999999112</b>, just below the midpoint, so <code class='inl'>toFixed</code> gives <b>$2.02</b> — while <code class='inl'>2.025 * 100</code> is exactly <b>202.5</b>, the multiplication having rounded away the tail the decision rested on, so <code class='inl'>Math.round</code> takes the half up and gives <b>$2.03</b>. In production code the habit is to never let a currency value exist as a float you will later round: keep integer <b>cents</b>, or use a decimal library. That is outside what this grader asks for, and reaching for it here answers a different question than the one on the page.`,
      code: `// One subtraction, one multiplication — and then the only line that can go wrong.
function costToFill(tankSize: number, fuelLevel: number, pricePerGallon: number): string {
  const gallons = tankSize - fuelLevel;
  const total = gallons * pricePerGallon;
  // toFixed(2) discharges all three obligations of the "$d.dd" format at once:
  // always two decimals ("$80.00", never "$80"), always a leading digit ("$0.00",
  // never "$.00"), and the point itself when the cents are zero. It returns a
  // STRING, which is why "$" + it concatenates and why nothing downstream should
  // do arithmetic on the result. No branch is needed for the already-full tank:
  // 0 gallons times any price is 0, and the formatter turns that into "0.00".
  //
  // The catch, which no official test reaches: toFixed rounds the stored DOUBLE,
  // not the decimal you wrote. (1.005).toFixed(2) is "1.00", because the nearest
  // double to 1.005 is 1.0049999999999998934. Real money code keeps integer cents.
  return "$" + total.toFixed(2);
}`,
      mount,
    },
    {
      name: "Step through", cost: "one rounding decision",
      approach: `Four lines, and only the third is interesting. Each step names the value at <b>full precision</b> next to the number JavaScript prints, so you can watch the gap open at the multiply and close again at the rounding. Start on <b>15,9.5,3.98</b> — the official case — and notice at line 3 that the stored product is <b>21.890000000000000568</b> rather than 21.89; it is a hair off and it does not matter, because the tail is nowhere near the midpoint. Then hit <b>10,9,1.005</b> and step to line 4, where the same invisible gap decides the cents and the answer comes back <b>"$1.00"</b>. <b>12,12,4.99</b> is the contrast: exact all the way through, and the already-full path with no branch in it. Type your own three numbers — including a fuel level above the tank size, which the demo's sliders will not let you reach. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "tank, fuel, price =", value: "15,9.5,3.98", presets: CASES.map(argStr), hint: "three numbers" },
      }),
    },
  ],
};
