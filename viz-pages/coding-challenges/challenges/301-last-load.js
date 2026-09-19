// #301 · Last Load — the name says date; the assertions say a floored day COUNT.
// The function is `lastLoadDate` and the statement asks for "the number of full days
// of detergent you have remaining". Those are different return types, and the grader
// settles it: all five assertions compare against an integer, so it returns a COUNT.
// Then two decisions, only one of which the grader can see:
//   • "FULL days" → Math.floor, never Math.round. Official case 5 (20 scoops at an
//     average of 10.4/day = 1.92) is the one that catches a round; and case 1 (10 at
//     2.0/day) pins the other end — an exact division keeps its last day, 5 not 4.
//   • scoops / (total / usage.length) divides TWICE, and the middle value is rarely
//     exact in binary. On 35 scoops against [3, 2, 2] the answer is exactly 15 days,
//     but the round-trip through 2.3333… gives 14.999999999999998 and the floor eats
//     a day. (scoops * usage.length) / total is one division of two integers and is
//     exact. Be clear about who caught that: NOT the grader — the two-step form
//     passes all 5 official cases, and case 7 is invented to separate them.
// ONE approach. The wasteful act cannot be named without breaking the code (there is
// nothing here to re-scan or remember), and the two divisions DISAGREE on case 7, so
// they can never be two graded variants — CONTRIBUTING Tier 3. The two-step form
// ships as a comparison row inside the demo instead.
// Drag a bar up on the "boundary" chip and watch the projection lose a whole day.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader lists
// them. Cases 6–7 are invented. Each lands somewhere different:
//   1  10 ÷ 2.0 = 5 exactly  → the floor BOUNDARY: an exact division keeps its last
//                              day, so the answer is 5 and not 4
//   2  a zero-usage day      → a skipped day still counts in the divisor, so it
//                              lowers the average and BUYS days
//   3  a six-day history     → 11.6 days; the divisor is the history length, not 7
//   4  one 12-scoop spike    → the mean is dragged to 3.857 by a single outlier day;
//                              the median day is 2 scoops, which would answer 25, and
//                              dropping the spike leaves a 2.5 mean answering 20 — the
//                              shipped mean answers 12
//   5  usage outruns supply  → 1.92 days: Math.round says 2, and 2 is a lie
//   6  a one-day history     → n = 1, so "the average" is just that day; the divide
//                              by usage.length is the line that has to survive it
//   7  35 against [3, 2, 2]  → exactly 15 days, but scoops / (total / n) floors to 14
// Case 7 is the module's thesis: the official set never lands on an inexact average
// that divides out exactly, so no official test can separate the two divisions.
const CASES = [
  { scoops: 10, usage: [2, 2, 2, 2, 2, 2, 2], label: "exact · 5" },
  { scoops: 16, usage: [2, 3, 0, 3, 4, 2, 1], label: "a day off" },
  { scoops: 33, usage: [5, 0, 4, 3, 3, 2], label: "six days" },
  { scoops: 50, usage: [2, 0, 2, 9, 12, 0, 2], label: "one spike" },
  { scoops: 20, usage: [13, 9, 12, 10, 8], label: "nearly out" },
  { scoops: 7, usage: [3], label: "one day of history" },
  { scoops: 35, usage: [3, 2, 2], label: "15 vs 14 · boundary" },
];

// The solution itself, split so the demo and the trace share it and cannot drift.
const totalOf = (usage) => usage.reduce((sum, used) => sum + used, 0);
const fullDays = (scoops, usage) => Math.floor((scoops * usage.length) / totalOf(usage)); // ships
const twoStep = (scoops, usage) => Math.floor(scoops / (totalOf(usage) / usage.length));  // what most people write

// Averages here are usually repeating decimals, so print a short form for labels and
// keep the full double for the places where the exact value is the point. The trailing
// "…" is not decoration — it says the printed digits are not the whole number, which is
// the entire subject of this module.
const d3 = (x) => {
  if (Number.isInteger(x)) return String(x);
  const s = x.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return Number(s) === x ? s : s + "…";
};
const scoopWord = (x) => (x === 1 ? "scoop" : "scoops");
// "2 + 3 + 0 + 3" — the history is a running total, so show it as the sum it is.
const sumExpr = (usage) => usage.join(" + ");

const AXIS = 14;       // fixed vertical scale in scoops: a dragged bar must track the
                       // cursor, which a data-derived max would break mid-drag
const MAX_GHOSTS = 26; // the projection can run long; past this it is a number, not a picture

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .lld-chart { position:relative; overflow-x:auto; border:1px solid var(--border); border-radius:12px;
                 background:var(--panel); padding:18px 12px 28px; }
    .lld-plot { position:relative; height:150px; display:flex; align-items:flex-end; gap:5px;
                width:max-content; min-width:100%; touch-action:none; }
    .lld-col { position:relative; width:28px; height:100%; display:flex; align-items:flex-end; flex:none; }
    .lld-col.past { cursor:ns-resize; }
    .lld-col.past:hover .lld-bar { filter:brightness(1.3); }
    .lld-bar { width:100%; min-height:2px; border-radius:4px 4px 0 0; border:1px solid var(--accent); border-bottom:0;
               background:color-mix(in srgb, var(--accent) 55%, transparent); }
    .lld-col.ghost { width:17px; }
    .lld-col.ghost .lld-bar { background:color-mix(in srgb, var(--accent) 12%, transparent);
               border:1px dashed color-mix(in srgb, var(--accent) 50%, var(--border)); border-bottom:0; }
    .lld-col.part .lld-bar { background:color-mix(in srgb, var(--danger) 16%, transparent);
               border:1px dashed var(--danger); border-bottom:0; }
    .lld-v { position:absolute; left:-3px; right:-3px; text-align:center; font:700 10.5px var(--mono); color:var(--text); }
    .lld-lab { position:absolute; left:-3px; right:-3px; bottom:-18px; text-align:center;
               font:9.5px var(--mono); color:var(--muted); }
    .lld-col.part .lld-lab { color:var(--danger); }
    .lld-avg { position:absolute; left:0; right:0; border-top:1px dashed var(--accent); pointer-events:none; }
    .lld-avg span { position:absolute; right:0; top:-16px; padding:0 4px; background:var(--panel);
                    font:700 10px var(--mono); color:var(--accent); }
    .lld-div { flex:none; width:0; height:100%; margin:0 10px; position:relative;
               border-left:1px dashed color-mix(in srgb, var(--muted) 70%, transparent); }
    .lld-div span { position:absolute; bottom:-18px; left:50%; transform:translateX(-50%);
                    font:9.5px var(--mono); color:var(--muted); white-space:nowrap; }
    .lld-more { flex:none; align-self:flex-end; padding:0 4px 2px; font:10px var(--mono); color:var(--muted); white-space:nowrap; }
    .lld-sum { font:13px var(--mono); color:var(--muted); margin:14px 0 3px; }
    .lld-sum b { color:var(--text); font-size:15px; }
    .lld-cmp { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:10px 0 0; }
    .lld-c { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:14px;
             padding:11px 13px; font:12.5px var(--mono); }
    .lld-c + .lld-c { border-top:1px solid var(--border); }
    .lld-c .lld-val { font:800 22px var(--mono); font-variant-numeric:tabular-nums; }
    .lld-k { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .lld-c.ship { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .lld-c.ship .lld-val, .lld-c.ship .lld-k { color:var(--accent); }
    .lld-c.other .lld-val { color:var(--muted); }
    .lld-c.other.split .lld-val, .lld-c.other.split .lld-k { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  // Open on official case 2 — a real fraction with a zero-usage day in it — so the
  // "boundary" chip is a change the reader makes, not a state they arrive in.
  let scoops = CASES[1].scoops;
  let usage = [...CASES[1].usage];

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { scoops = c.scoops; usage = [...c.usage]; inp.value = scoops; render(); };
    chips.append(chip);
  });

  const bar = el("div", "controls");
  const inp = el("input"); inp.type = "number"; inp.min = 0; inp.value = scoops; inp.style.width = "80px";
  inp.oninput = () => { scoops = Math.max(0, Math.round(+inp.value) || 0); render(); };
  const add = el("button", "chip", "+ day");
  add.onclick = () => { usage.push(usage[usage.length - 1]); render(); };
  const drop = el("button", "chip", "− day");
  drop.onclick = () => { if (usage.length > 1) usage.pop(); render(); };
  bar.append(el("span", "ctl-label", "scoops left ="), inp, add, drop);

  const chart = el("div", "lld-chart");
  const plot = el("div", "lld-plot");   // rebuilt every render — the LISTENERS live on it, not its children
  chart.append(plot);
  const out = el("div");

  host.append(
    el("div", "note", "Drag any solid bar to change what you used that day, add or drop days, or edit the scoops you have left. The dashed line is the <b>average</b>; the faint bars are the projection forward, one average-sized day each, until the detergent runs out. Add one heavy day and watch the run get shorter."),
    chips, bar, chart, out,
  );

  // Drag maps the cursor's height in the plot to a scoop count on a FIXED axis, so
  // the bar stays under the finger. Capture is taken on `plot`, which render() never
  // replaces — only its children — or the drag would die on the first move.
  const valueAt = (e) => {
    const r = plot.getBoundingClientRect();
    return Math.max(0, Math.min(AXIS, Math.round((1 - (e.clientY - r.top) / r.height) * AXIS)));
  };
  let drag = -1;
  plot.addEventListener("pointerdown", (e) => {
    const col = e.target.closest(".lld-col.past");
    if (!col) return;
    drag = +col.dataset.i;
    plot.setPointerCapture(e.pointerId); e.preventDefault();
    usage[drag] = valueAt(e); render();
  });
  plot.addEventListener("pointermove", (e) => { if (drag >= 0) { usage[drag] = valueAt(e); render(); } });
  const endDrag = () => { drag = -1; };
  plot.addEventListener("pointerup", endDrag);
  plot.addEventListener("pointercancel", endDrag);

  render();

  function render() {
    const total = totalOf(usage), n = usage.length;
    const avg = total / n;
    const dry = total === 0;                       // nothing used, ever — the division has no answer
    const days = dry ? Infinity : fullDays(scoops, usage);
    const naive = dry ? Infinity : twoStep(scoops, usage);
    const split = days !== naive;
    // The unfloored projection AS THE SHIPPED LINE COMPUTES IT. Printing scoops / avg
    // here instead would show "14.999999999999998 → floor → 15", which is not what
    // any single expression does — the two-step form gets its own row below.
    const raw = (scoops * n) / total;
    const leftover = dry ? 0 : scoops - days * avg;
    const pct = (v) => Math.max(0, Math.min(100, (v / AXIS) * 100));

    // ── the chart ────────────────────────────────────────────────────────────
    plot.innerHTML = "";
    usage.forEach((u, i) => {
      const col = el("div", "lld-col past"); col.dataset.i = i;
      col.title = `day ${i + 1}: ${u} scoop${u === 1 ? "" : "s"} — drag to change`;
      const b = el("div", "lld-bar"); b.style.height = pct(u) + "%";
      col.append(b, el("div", "lld-v", String(u)), el("div", "lld-lab", "d" + (i + 1)));
      col.querySelector(".lld-v").style.bottom = `calc(${pct(u)}% + 3px)`;
      plot.append(col);
    });

    const div = el("div", "lld-div");
    div.append(el("span", null, "now"));
    plot.append(div);

    const shown = Number.isFinite(days) ? Math.min(days, MAX_GHOSTS) : 0;
    for (let k = 1; k <= shown; k++) {
      const col = el("div", "lld-col ghost");
      col.title = `projected day ${k} — ${d3(avg)} scoops`;
      const b = el("div", "lld-bar"); b.style.height = pct(avg) + "%";
      col.append(b, el("div", "lld-lab", String(k)));
      plot.append(col);
    }
    if (Number.isFinite(days) && days > shown) plot.append(el("div", "lld-more", `+${days - shown} more days`));
    // The leftover is the floor made visible: real detergent, not enough for a day.
    if (!dry && leftover > 1e-9 && days <= MAX_GHOSTS) {
      const col = el("div", "lld-col ghost part");
      col.title = `${d3(leftover)} scoops left over — less than one day's ${d3(avg)}`;
      const b = el("div", "lld-bar"); b.style.height = pct(leftover) + "%";
      col.append(b, el("div", "lld-lab", "½"));
      plot.append(col);
    }
    if (!dry) {
      const line = el("div", "lld-avg", `<span>avg ${d3(avg)}/day</span>`);
      line.style.bottom = pct(avg) + "%";
      plot.append(line);
    }

    // ── the arithmetic ───────────────────────────────────────────────────────
    out.innerHTML = "";
    out.append(el("div", "lld-sum",
      `${sumExpr(usage)} &nbsp;=&nbsp; <b>${total}</b> &nbsp;÷&nbsp; ${n} day${n === 1 ? "" : "s"} &nbsp;=&nbsp; <b>${dry ? 0 : avg}</b> scoops/day`));

    if (dry) {
      out.append(el("div", "note", "Every day in the history is <b>zero</b>, so the average is <b>0</b> and <code class='inl'>scoops / 0</code> is <b>Infinity</b> — detergent that is never used never runs out. No official case goes here and the shipped function doesn't guard it; the demo says so rather than pretending. Drag a bar back up."));
      return;
    }

    out.append(el("div", "lld-sum",
      `<b>${scoops}</b> scoops &nbsp;÷&nbsp; ${d3(avg)}/day &nbsp;=&nbsp; <b>${raw}</b> days &nbsp;→&nbsp; floor &nbsp;→&nbsp; <b>${days}</b> full day${days === 1 ? "" : "s"}`));

    const cmp = el("div", "lld-cmp");
    const row = (cls, expr, val, tag) => {
      const r = el("div", "lld-c " + cls);
      r.append(el("div", null, expr), el("div", "lld-k", tag), el("div", "lld-val", String(val)));
      return r;
    };
    cmp.append(row("ship", "Math.floor(scoops * usage.length / total)", days, "returned"));
    cmp.append(row("other" + (split ? " split" : ""), "Math.floor(scoops / (total / usage.length))", naive, split ? "disagrees" : "agrees"));
    out.append(cmp);

    if (days === 0) {
      // Reachable by clearing the scoops box or dragging the history above the supply.
      out.append(el("div", "note", scoops === 0
        ? `No detergent at all, so there is no next load and the answer is <b>0</b>. Note that the history still has to be summed and divided to get here — the average is fine, it is the supply that ran out.`
        : `<b>Zero</b> full days: ${scoops} ${scoopWord(scoops)} is less than the ${d3(avg)} an average day takes, so you cannot run even one more load. This is the same rule as every other case — floor of ${d3(raw)} — but it is the one place where "you have some detergent left" and "you have a day left" come apart completely.`));
    } else if (split) {
      out.append(el("div", "note", `Same arithmetic, two divisions instead of one — and it costs a day. <code class='inl'>${total} / ${n}</code> is not exactly ${d3(avg)}; the double nearest to it is <b>${avg.toPrecision(20)}</b>, so <code class='inl'>${scoops} / that</code> comes out <b>${(scoops / avg).toPrecision(20)}</b> — a hair under ${days}, and <code class='inl'>Math.floor</code> is exactly the operator that turns a hair into a whole day. Multiplying first keeps both operands whole: <code class='inl'>${scoops} × ${n} / ${total}</code> is <b>${days}</b> on the nose. <b>No official case reaches this</b> — all five pass either way.`));
    } else if (leftover <= 1e-9) {
      out.append(el("div", "note", `The supply divides <b>exactly</b>: ${days} days at ${d3(avg)} is precisely ${scoops} scoops, nothing left over. That is the boundary the word "full" has to rule on, and the official <b>exact · 5</b> case rules it <b>in</b> — 10 scoops at 2/day is <b>5</b> days, not 4. You have enough for that last load, so you get it.`));
    } else {
      const rounded = Math.round(raw);
      out.append(el("div", "note", `The last full day ends with <b>${d3(leftover)}</b> ${scoopWord(leftover)} still in the box — real detergent, but less than a day's ${d3(avg)}, so it buys no load. That is the whole of <code class='inl'>Math.floor</code>. ${rounded > days
        ? `<code class='inl'>Math.round</code> would report <b>${rounded}</b> here, because ${d3(raw)} is nearer ${rounded} than ${days} — a day of detergent you do not have. The official <b>nearly out</b> case is the one that catches it: 1.92 rounds to 2.`
        : `<code class='inl'>Math.round</code> happens to agree on this input (${d3(raw)} rounds down too), which is why a round survives casual testing — try the <b>nearly out</b> chip, where it reports 2 days out of 1.92.`}`));
    }
  }
}

// ── STEP — fold the history to a total, divide once, floor. Four lines, and the
// last two are the only decisions in the problem.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">lastLoadDate</span>(<span class="tok" data-t="params">scoops, usage</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> total = usage.<span class="fn">reduce</span>((sum, used) =&gt; <span class="tok" data-t="acc">sum + used</span>, <span class="nu">0</span>);` },
  { ln: 3, html: `  <span class="k">const</span> days = <span class="tok" data-t="div">(scoops * usage.length) / total</span>;` },
  { ln: 4, html: `  <span class="k">return</span> <span class="tok" data-t="floor">Math.<span class="fn">floor</span>(days)</span>;` },
  { ln: 5, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { scoops, usage } = CASES[k - 1];
  const n = usage.length;
  const steps = [];
  const running = [];            // the partial sums, one per day folded
  let sum = null, used = null;   // the reduce callback's bindings — alive only on line 2
  let total = null, days = null;

  const S = (line, note, x = {}) => {
    const vars = { scoops };
    if (line === 2 && sum !== null) { vars.sum = sum; if (used !== null) vars.used = used; }
    if (line >= 2 && total !== null) vars.total = total;   // `const total` binds when reduce returns
    if (line >= 3 && days !== null) vars.days = days;
    const structs = [{ label: "usage", items: usage }];    // a parameter — in scope for the whole call
    if (line >= 2) structs.push({ label: "running sum", items: running.slice(), newest: !!x.newest });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `lastLoadDate(${scoops}, [${usage.join(", ")}])`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Two arguments and a <b>naming trap</b>: the function is called <code class='inl'>lastLoadDate</code>, but the statement asks for "the number of <b>full days</b> remaining" and every official assertion compares against an integer. It returns a <b>count</b>. <code class='inl'>usage</code> is the past — ${n === 1 ? "a single day of it, which is enough" : `${n} days of it`} — and it is only ever used to answer one question: how much is a typical day?`,
    { focus: "params" });

  sum = 0;
  S(2, `<b>reduce</b> starts from the explicit seed <b>0</b>. Seeding it matters even here: with no initial value reduce would take <code class='inl'>usage[0]</code> as the seed, which quietly changes nothing on a sum and throws outright on an empty history.`,
    { focus: "acc", changed: ["sum"] });

  let saidZero = false, saidSpike = false;
  const peak = Math.max(...usage);
  for (let j = 0; j < n; j++) {
    used = usage[j];
    const before = sum;
    sum += used;
    running.push(sum);
    let why;
    if (used === 0 && !saidZero) {
      why = ` A <b>zero</b> day adds nothing to the total but still counts in the divisor below, so a day you skipped the laundry <i>lowers</i> the average and <b>buys</b> you days.`;
      saidZero = true;
    } else if (used === peak && peak >= 3 * (totalOf(usage) / n) && !saidSpike) {
      why = ` One heavy day, and the mean has no defence against it — <b>${used}</b> against an average of ${d3(totalOf(usage) / n)}. Averaging assumes tomorrow looks like the mean of the past, which a single spike quietly rewrites.`;
      saidSpike = true;
    } else {
      why = "";
    }
    S(2, `Day ${j + 1} used <b>${used}</b>: the running sum goes ${before} → <b>${sum}</b>.${why}`,
      { focus: "acc", changed: ["sum", "used"], newest: true });
  }
  total = sum; sum = null; used = null;
  S(2, `reduce hands back <b>${total}</b> and only now does <code class='inl'>total</code> exist — <code class='inl'>sum</code> and <code class='inl'>used</code> belonged to the callback and are gone with it.`,
    { focus: "acc", changed: ["total"] });

  const avg = total / n;
  days = (scoops * n) / total;
  const naive = scoops / avg;
  // Two different questions, and the condition panel below asks the FIRST one,
  // because that is what its `expr` literally says. `same` is bit-identity of the
  // two raw quotients; `split` is whether the floors — the returned answers —
  // come apart. `same` is false on cases 4, 5 and 7; `split` only on case 7.
  const same = days === naive;
  const split = Math.floor(days) !== Math.floor(naive);
  S(3, `The average daily usage is <b>${total} / ${n} = ${d3(avg)}</b>, and the answer is <b>${scoops} / ${d3(avg)}</b> — so this line is that, rearranged into <b>one</b> division of two whole numbers: <b>${scoops} × ${n} / ${total} = ${days}</b>. ${split
    ? `The condition below is <b>red</b>, and that red is the whole module. ${total}/${n} is not representable, so the two-step form gives <b>${naive.toPrecision(20)}</b> — under ${Math.floor(days)} by a hair — and line 4 is about to turn that hair into a whole lost day.`
    : same
      ? `On this input the two-step form <code class='inl'>${scoops} / (${total} / ${n})</code> lands on the <i>same double</i>, so the condition below holds. Load <b>case 7</b> for the input where it doesn't.`
      : `The condition below is <b>red</b>, and that is the lesson rather than a failure: ${total}/${n} is not representable, so the two-step form gives <b>${naive.toPrecision(20)}</b> against this line's <b>${days.toPrecision(20)}</b> — <i>different doubles</i>, off in the last bit. Here <code class='inl'>Math.floor</code> happens to swallow the difference and both still answer ${Math.floor(days)}, which is exactly why <b>all five official cases pass either way</b>. Load <b>case 7</b>, where the same last bit falls on the wrong side of a whole number and costs a day.`}`,
    { focus: "div", changed: ["days"], eval: { expr: `scoops / (total / usage.length) === ${days}`, val: same } });

  const answer = Math.floor(days);
  const leftover = scoops - answer * avg;
  S(4, `<b>Math.floor(${days}) = ${answer}</b>. ${Number.isInteger(days)
    ? `The division came out <b>whole</b>, so floor changes nothing — and that is the boundary case worth being sure about: ${answer} days at ${d3(avg)} uses exactly the ${scoops} scoops you have, and the problem counts that last load <b>in</b>.`
    : `Day ${answer} ends with <b>${d3(leftover)}</b> ${scoopWord(leftover)} still in the box — real detergent, but short of the ${d3(avg)} a load needs, so it is not a day you get. <code class='inl'>Math.round</code> would ${Math.round(days) > answer ? `report <b>${Math.round(days)}</b> here and promise a load that isn't there` : `agree on this input, which is exactly how a round survives testing`}.`} The word in the statement is "<b>full</b>", and floor is the operator that means it.`,
    { focus: "floor", done: true, result: answer, ret: { value: answer } });

  return steps;
}

export default {
  n: 301, id: "lastload", title: "Last Load", dates: ["2026-06-07"],
  statement: `Given the number of <b>scoops</b> of laundry detergent you have left and an array of how many scoops you used on each of the previous days, return the number of <b>full days</b> of detergent you have remaining. Take your average daily usage from the history and assume that much every day from here on. <span class="rule">Despite the name, <code class="inl">lastLoadDate</code> returns a <b>count</b>, not a date. Example: <code class="inl">lastLoadDate(16, [2, 3, 0, 3, 4, 2, 1])</code> → <b>7</b> — 15 scoops over 7 days averages 2.142…/day, and 16 ÷ 2.142… is 7.46, of which 7 days are full.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Sum the history, divide, floor. The summing is free; both of the real decisions live in the last two lines.<br><br><b>"Full days" means <code class='inl'>Math.floor</code>, not <code class='inl'>Math.round</code>.</b> Leftover detergent that can't fill a load isn't a day. Official case <b>nearly out</b> is the one that proves it — 20 scoops at 10.4/day is 1.92 days, and rounding would promise <b>2</b>. The opposite boundary matters just as much: <b>exact · 5</b> divides out evenly, and 10 scoops at 2/day is <b>5</b> days, not 4, because you do have enough for that last load.<br><br><b>Then divide once, not twice.</b> The obvious spelling computes the average first and divides by it — two divisions, and the average is rarely exact in binary. <code class='inl'>(scoops * usage.length) / total</code> is the same value with both operands still whole, so an exact boundary can't slip under the floor.<br><br>Be clear about who caught that: <b>not the grader</b>. The two-step form passes all five official cases. The <b>15 vs 14 · boundary</b> preset is invented for exactly this — 35 scoops against <code class='inl'>[3, 2, 2]</code> is exactly 15 days, and the two-step form floors it to 14.`,
      code: `// "Full days", so floor: a day you can only half-supply is not a day you get.
function lastLoadDate(scoops: number, usage: number[]): number {
  const total = usage.reduce((sum, used) => sum + used, 0);

  // Average daily usage is total / usage.length, and the answer is
  // scoops / average. Written as ONE division of two integers instead, because
  // a floor after two divisions can land on the wrong side of an exact
  // boundary: 35 scoops against [3, 2, 2] is exactly 15 days, but
  // 35 / (7 / 3) is 14.999999999999998, and the floor would eat a day.
  const days = (scoops * usage.length) / total;

  return Math.floor(days);
}`,
      mount,
    },
    {
      name: "Step through", cost: "the floor step",
      approach: `Four lines, and the first two are bookkeeping. Watch the <b>running sum</b> grow one day at a time — note that <code class='inl'>sum</code> and <code class='inl'>used</code> vanish the moment the callback is done and <code class='inl'>total</code> comes into being — then the two lines that decide anything.<br><br>It opens on <b>case 7</b>, where the average is 7/3 and the two ways of writing the same division split: <b>15</b> against <b>14</b>. Step through <b>case 1</b> for the other boundary (an exact division keeps its last day) and <b>case 5</b> for the one that punishes a <code class='inl'>Math.round</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 7, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
