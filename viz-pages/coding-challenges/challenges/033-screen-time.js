// #33 · Screen Time — a bulleted spec is a chain of early returns, not an algorithm.
// There is nothing to discover here and that is the lesson: the statement hands you
// three independent thresholds, and the whole job is translating each bullet without
// dropping a word. Every bug in this problem is one of two words. ">= 10" not "> 10",
// because the official [1,2,3,10,2,1,0] is exactly 10 and answers true. And "three
// days IN A ROW", which means five sliding windows on a seven-day week, not every
// 3-subset of it — read it the loose way and you are solving a different problem.
// The one habit worth stealing: "average >= k over m items" is "sum >= k·m", so an
// average of 8 over 3 days is a sum of 24 and an average of 6 over 7 days is 42.
// Integers, not floats, and the comparison says exactly what the bullet says.
// ONE approach, deliberately. The input is always seven numbers, so a sliding-window
// rewrite would save four additions on five windows — a constant-factor difference
// you cannot see on screen, which Tier 3 §1 says is not worth a tab.
import { el, mountDebugger } from "../shared.js";

// The 7 official freeCodeCamp cases, in the grader's order, then two of ours.
//   [1,1,8,8,8,1,1] — ours. Rule 2 fires at exactly 24 (8+8+8) while the peak day is
//     8 and the week totals 28, miles under 42. It is the case that proves rule 2 is
//     not redundant: delete it and this week comes back false. The official
//     [3,3,5,8,8,9,4] also fires on rule 2 but has a 9-hour day and a 40-hour week,
//     so it never isolates the rule from its neighbours.
//   [6,6,6,6,6,6,6] — ours, and the partner to the official [5,6,6,6,6,6,6]: one hour
//     apart, opposite answers. 42 is the inclusive floor, so a flat six-hour week is
//     already too much while 41 is not.
// Every preset lands on a different rung: 1 and 2 fall through all three rules (one
// comfortably, one one hour short on rule 2), 3 and 9 straddle the rule-3 boundary,
// 4 and 5 straddle the rule-1 boundary, and 6 and 8 fire rule 2 for different reasons.
const OFFICIAL = [
  [1, 2, 3, 4, 5, 6, 7], [7, 8, 8, 4, 2, 2, 3], [5, 6, 6, 6, 6, 6, 6],
  [1, 2, 3, 11, 1, 3, 4], [1, 2, 3, 10, 2, 1, 0], [3, 3, 5, 8, 8, 9, 4],
  [3, 9, 4, 8, 5, 7, 6],
];
const CASES = [...OFFICIAL, [1, 1, 8, 8, 8, 1, 1], [6, 6, 6, 6, 6, 6, 6]];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_H = 14;    // the bar ceiling — clears the tallest official day (11) and the 10-line
const DAY_CAP = 10;  // rule 1, in hours
const WIN = 3;       // rule 2, "three days in a row"
const WIN_SUM = 8 * WIN;   // avg >= 8 over 3 days IS sum >= 24 — the whole trick, in integers
const WEEK_AVG = 6;        // rule 3; the threshold is WEEK_AVG * hours.length, i.e. 42 on a week

const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const parse = (s) => {
  const xs = String(s).split(",").map((x) => x.trim()).filter((x) => x !== "").map(Number).map((x) => (Number.isFinite(x) ? x : 0));
  return xs.length ? xs : [0];
};

// The three rules, resolved in the statement's order. `stop` is the index of the
// first rule that fires, or -1 if none does — every rule after `stop` is one the
// real function returns before ever reaching.
function analyze(h) {
  const windows = [];
  for (let i = 0; i + WIN - 1 < h.length; i++) windows.push({ i, sum: sum(h.slice(i, i + WIN)) });
  const peak = Math.max(...h), peakDay = h.indexOf(peak);
  const total = sum(h), need = WEEK_AVG * h.length;
  const fired = [peak >= DAY_CAP, windows.some((w) => w.sum >= WIN_SUM), total >= need];
  const stop = fired.indexOf(true);
  return {
    windows, peak, peakDay, total, need, fired, stop, answer: stop !== -1,
    hitWin: windows.find((w) => w.sum >= WIN_SUM) || null,
    bestWin: windows.reduce((a, b) => (b.sum > a.sum ? b : a), windows[0] || { i: 0, sum: 0 }),
  };
}

// How many ways to pick any WIN days out of n — the number the loose reading of
// "three days in a row" would have you check, and the contrast the demo points at.
const choose = (n) => (n < WIN ? 0 : (n * (n - 1) * (n - 2)) / 6);

// "Mon–Wed", "Fri–Sun" — a window is easier to argue about by its days than its index.
const span = (i) => `${DAYS[i]}–${DAYS[i + WIN - 1]}`;
const avg = (s, n) => (s / n).toFixed(2).replace(/\.?0+$/, "");
const list = (h) => `[${h.join(", ")}]`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .st-wrap { display:flex; flex-direction:column; gap:12px; }
    .st-chart { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; }
    .st-col { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .st-track { position:relative; width:100%; height:130px; border:1px solid var(--border); border-radius:7px; background:var(--panel-2); cursor:ns-resize; overflow:hidden; }
    .st-bar { position:absolute; left:0; right:0; bottom:0; background:color-mix(in srgb, var(--accent) 34%, transparent); border-top:2px solid var(--accent); }
    .st-bar.hot { background:color-mix(in srgb, var(--danger) 32%, transparent); border-top-color:var(--danger); }
    .st-bar.win { background:color-mix(in srgb, var(--warn) 30%, transparent); border-top-color:var(--warn); }
    .st-cap { position:absolute; left:0; right:0; border-top:1px dashed var(--danger); pointer-events:none; }
    .st-cap i { position:absolute; right:3px; top:-14px; font:normal 10px var(--mono); color:var(--danger); }
    .st-v { font:800 14px var(--mono); font-variant-numeric:tabular-nums; }
    .st-v.hot { color:var(--danger); }
    .st-d { font:600 10px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .st-step { display:flex; gap:3px; }
    .st-step button { font:700 12px var(--mono); line-height:1; padding:3px 8px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); cursor:pointer; }
    .st-step button:hover { border-color:var(--accent); }
    .st-wins { display:grid; grid-template-columns:repeat(7, 1fr); gap:4px 6px; }
    .st-win { display:flex; justify-content:space-between; align-items:baseline; gap:6px; padding:3px 8px; border:1px solid var(--border); border-radius:6px; background:var(--panel-2); font:11.5px var(--mono); color:var(--muted); }
    .st-win b { color:var(--text); }
    .st-win.hit { border-color:var(--danger); color:var(--danger); } .st-win.hit b { color:var(--danger); }
    .st-win.best { border-color:var(--warn); color:var(--warn); } .st-win.best b { color:var(--warn); }
    .st-meter { position:relative; height:18px; border:1px solid var(--border); border-radius:6px; background:var(--panel-2); overflow:hidden; }
    .st-fill { position:absolute; left:0; top:0; bottom:0; background:color-mix(in srgb, var(--accent) 30%, transparent); }
    .st-fill.hot { background:color-mix(in srgb, var(--danger) 30%, transparent); }
    .st-mark { position:absolute; top:0; bottom:0; border-left:1px dashed var(--danger); }
    .st-rules { display:flex; flex-direction:column; gap:5px; }
    .st-rule { display:grid; grid-template-columns:18px 1fr auto auto; align-items:center; gap:10px; padding:5px 10px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); }
    .st-rule.skip { opacity:.4; }
    .st-rule.hit { border-color:color-mix(in srgb, var(--danger) 55%, var(--border)); }
    .st-rule .n { font:700 11px var(--mono); color:var(--muted); }
    .st-rule .lbl { font:12.5px var(--sans); }
    .st-rule .ev { font:12px var(--mono); color:var(--muted); }
  `));
}

function mount(host) {
  ensureStyle();
  let hours = [...CASES[1]];   // the near miss — 7+8+8 = 23, one hour short of rule 2
  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((c) => {
    const b = el("button", "chip", list(c));
    b.onclick = () => { hours = [...c]; render(); };
    pre.append(b);
  });
  const out = el("div");
  host.append(pre, out);
  render();

  function set(i, v) { hours[i] = Math.max(0, Math.min(MAX_H, v)); render(); }

  function render() {
    const a = analyze(hours);
    out.innerHTML = "";
    const wrap = el("div", "st-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${a.answer ? "no" : "ok"}">tooMuchScreenTime(${list(hours)}) → ${a.answer}</span>` +
      `<span class="more">${a.stop === -1
        ? `all three rules were evaluated and all three fell through`
        : a.stop === 2
          ? `rule <b>3</b> returned — the last one, so every rule ran`
          : `rule <b>${a.stop + 1}</b> returned — rule${a.stop === 0 ? "s <b>2</b> and <b>3</b> were" : " <b>3</b> was"} never reached`}</span>`));

    // ── the week, as bars you can drag or step ──
    const chart = el("div", "st-chart");
    hours.forEach((v, i) => {
      const col = el("div", "st-col");
      const inWin = a.stop === 1 && a.hitWin && i >= a.hitWin.i && i < a.hitWin.i + WIN;
      const track = el("div", "st-track",
        `<div class="st-bar${v >= DAY_CAP ? " hot" : inWin ? " win" : ""}" style="height:${(v / MAX_H) * 100}%"></div>` +
        `<div class="st-cap" style="bottom:${(DAY_CAP / MAX_H) * 100}%">${i === hours.length - 1 ? `<i>${DAY_CAP}h</i>` : ""}</div>`);
      // Click or drag anywhere on the track to set that day — the fastest way to walk
      // a value across a threshold and watch a different rule take over. The listener
      // lives on `window` because `set` re-renders and destroys this element mid-drag;
      // the rect is captured once, and stays valid because only bar HEIGHTS change.
      track.onpointerdown = (e) => {
        const r = track.getBoundingClientRect();
        const at = (ev) => set(i, Math.round((1 - (ev.clientY - r.top) / r.height) * MAX_H));
        const move = (ev) => { ev.preventDefault(); at(ev); };
        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
        at(e);
      };
      const steps = el("div", "st-step");
      const minus = el("button", null, "−"), plus = el("button", null, "+");
      minus.onclick = () => set(i, v - 1); plus.onclick = () => set(i, v + 1);
      steps.append(minus, plus);
      col.append(track, el("div", "st-v" + (v >= DAY_CAP ? " hot" : ""), String(v)), steps, el("div", "st-d", DAYS[i] || `d${i + 1}`));
      chart.append(col);
    });
    wrap.append(chart);

    // ── the five three-day windows, drawn under the days they cover ──
    const wins = el("div", "st-wins");
    a.windows.forEach((w, k) => {
      const cls = w.sum >= WIN_SUM ? " hit" : w === a.bestWin ? " best" : "";
      const row = el("div", "st-win" + cls,
        `<span>${span(w.i)}</span><span>${hours.slice(w.i, w.i + WIN).join(" + ")} = <b>${w.sum}</b>` +
        `<span class="more"> avg ${avg(w.sum, WIN)}</span></span>`);
      row.style.gridColumn = `${w.i + 1} / span ${WIN}`;
      row.style.gridRow = String(k + 1);
      wins.append(row);
    });
    wrap.append(wins);
    wrap.append(el("div", "muted", `<b>${a.windows.length}</b> windows, not <b>${choose(hours.length)}</b> — "three days <b>in a row</b>" is a sliding window, so the only question is where a width-${WIN} window fits on ${hours.length} days, not which ${WIN} of the ${hours.length} you pick. The highlighted one is the largest; it needs <b>${WIN_SUM}</b> to fire.`));

    // ── the weekly total against 42 ──
    const meter = el("div", "st-meter",
      `<div class="st-fill${a.total >= a.need ? " hot" : ""}" style="width:${Math.min(100, (a.total / (MAX_H * hours.length)) * 100)}%"></div>` +
      `<div class="st-mark" style="left:${(a.need / (MAX_H * hours.length)) * 100}%"></div>`);
    wrap.append(meter);
    wrap.append(el("div", "muted",
      `Week total <b>${a.total}</b> against the <b>${a.need}</b> mark — that is ${WEEK_AVG} × ${hours.length}, the same "average ≥ k over m items is sum ≥ k·m" rewrite. Average <b>${avg(a.total, hours.length)}</b> h/day.`));

    // ── the ladder: which rule fired, and which ones never ran ──
    const rules = el("div", "st-rules");
    RULES.forEach((r, k) => {
      const reached = a.stop === -1 || k <= a.stop;
      const hit = a.fired[k] && k === a.stop;
      rules.append(el("div", "st-rule" + (hit ? " hit" : reached ? "" : " skip"),
        `<span class="n">${k + 1}</span><span class="lbl">${r.lbl}</span>` +
        `<span class="ev">${reached ? r.ev(a, hours) : "—"}</span>` +
        `<span class="cand${hit ? " fail" : reached ? " pass" : ""}">${hit ? "→ return true" : reached ? "under" : "never reached"}</span>`));
    });
    wrap.append(rules);

    wrap.append(el("div", "note", noteFor(hours, a)));
    out.append(wrap);
  }
}

const RULES = [
  { lbl: `any single day ≥ ${DAY_CAP} h`, ev: (a) => `max = ${a.peak} on ${DAYS[a.peakDay] || "day " + (a.peakDay + 1)}` },
  { lbl: `any ${WIN} days in a row averaging ≥ 8 h &nbsp;<span class="muted">(sum ≥ ${WIN_SUM})</span>`, ev: (a) => (a.windows.length ? `best = ${a.bestWin.sum} (${span(a.bestWin.i)})` : "no window fits") },
  { lbl: `the whole week's average ≥ ${WEEK_AVG} h &nbsp;<span class="muted">(sum ≥ ${WEEK_AVG}·n)</span>`, ev: (a) => `total = ${a.total} / ${a.need}` },
];

function noteFor(h, a) {
  if (a.stop === 0) {
    const exact = a.peak === DAY_CAP;
    return `<b>${DAYS[a.peakDay]}</b> alone is ${a.peak} hours, so rule 1 returns and rules 2 and 3 are never evaluated — the three bullets are an <b>OR</b>, and the first true one is the answer. ${exact
      ? `This is the boundary, and it is the single most likely place to lose the challenge: the statement says "<b>10 hours or more</b>", so <code class='inl'>&gt;=</code>, not <code class='inl'>&gt;</code>. Write <code class='inl'>h &gt; 10</code> and this exact official case comes back <b>false</b> — and only this one, because every other true case fires on a different rule or a taller day.`
      : `Notice how little else matters: this week totals only <b>${a.total}</b> hours, well under <b>${a.need}</b>, and its biggest window is <b>${a.bestWin.sum}</b>, under <b>${WIN_SUM}</b>. Both of the other rules would have said no. Drop ${DAYS[a.peakDay]} to <b>9</b> and the answer flips.`}`;
  }
  if (a.stop === 1) {
    const w = a.hitWin, days = h.slice(w.i, w.i + WIN);
    return `No day reaches ${DAY_CAP}, so rule 1 falls through and the window scan runs. <b>${span(w.i)}</b> is ${days.join(" + ")} = <b>${w.sum}</b>, and ${w.sum} ≥ ${WIN_SUM} is the same statement as an average of ${avg(w.sum, WIN)} ≥ 8 — comparing the <b>sum</b> keeps it in integers, where <code class='inl'>&gt;=</code> means exactly what it says. Rule 3 never runs${a.total < a.need
      ? `, and here that matters: the week totals <b>${a.total}</b>, ${a.need - a.total} under <b>${a.need}</b>, so rule 3 would have answered <b>false</b>. Three days of binge inside an otherwise quiet week is precisely the shape rule 2 exists to catch.`
      : `. This week would also have tripped rule 3 (<b>${a.total}</b> ≥ <b>${a.need}</b>), so the two rules agree — which is why a week like <code class='inl'>[1, 1, 8, 8, 8, 1, 1]</code>, where they do not, is the one that proves rule 2 is load-bearing.`}`;
  }
  if (a.stop === 2) {
    const exact = a.total === a.need;
    return `Both of the sharp rules fell through — the peak day is <b>${a.peak}</b> and the biggest window is <b>${a.bestWin.sum}</b>, under ${DAY_CAP} and ${WIN_SUM} respectively — so the answer comes down to the bulk of the week. <b>${a.total}</b> ≥ <b>${a.need}</b>${exact
      ? `, on the nose. ${a.need} is <code class='inl'>${WEEK_AVG} × ${h.length}</code>: rewriting "average ≥ ${WEEK_AVG}" as "sum ≥ ${a.need}" is what lets you compare two integers instead of asking whether <code class='inl'>${a.total} / ${h.length}</code> is really ${WEEK_AVG} in floating point.`
      : `. Take any one hour out of the week and check what happens — <b>${a.total - 1}</b> is under the line and the whole week turns legal.`} Nothing here is spread unevenly enough for the first two rules; the damage is just steady.`;
  }
  const gaps = [[DAY_CAP - a.peak, `rule 1 — ${DAYS[a.peakDay]} would need <b>${DAY_CAP - a.peak}</b> more hour${DAY_CAP - a.peak === 1 ? "" : "s"}`],
                [WIN_SUM - a.bestWin.sum, `rule 2 — <b>${span(a.bestWin.i)}</b> sums to <b>${a.bestWin.sum}</b> and needs <b>${WIN_SUM}</b>`],
                [a.need - a.total, `rule 3 — the week is <b>${a.total}</b> and needs <b>${a.need}</b>`]];
  const near = gaps.reduce((x, y) => (y[0] < x[0] ? y : x));
  return `All three rules were evaluated and all three said no, which is the only way to reach <code class='inl'>false</code> — there is no early exit on the negative side. The closest call is ${near[1]}, ${near[0]} short. ${near[0] <= 1
    ? `One hour anywhere in that ${near[1].startsWith("rule 1") ? "day" : near[1].startsWith("rule 2") ? "window" : "week"} flips the answer, which is what makes this a good test of a <code class='inl'>&gt;</code> written where <code class='inl'>&gt;=</code> belongs.`
    : `Nudge a bar and watch which rule closes first — with three independent thresholds, the one that fires is rarely the one you would guess from the shape of the week.`}`;
}

// ── STEP — the three rules unrolled: scan the days, slide the window, sum the week ──
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">tooMuchScreenTime</span>(<span class="tok" data-t="param">hours</span>) {` },
  { ln: 2,  html: `  <span class="k">for</span> (<span class="k">const</span> h <span class="k">of</span> hours) {` },
  { ln: 3,  html: `    <span class="k">if</span> (<span class="tok" data-t="day">h &gt;= <span class="nu">10</span></span>) <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 4,  html: `  }` },
  { ln: 5,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="wloop">i = <span class="nu">0</span>; i + <span class="nu">2</span> &lt; hours.length</span>; i++) {` },
  { ln: 6,  html: `    <span class="k">const</span> <span class="tok" data-t="sum3">sum3 = hours[i] + hours[i + <span class="nu">1</span>] + hours[i + <span class="nu">2</span>]</span>;` },
  { ln: 7,  html: `    <span class="k">if</span> (<span class="tok" data-t="win">sum3 &gt;= <span class="nu">24</span></span>) <span class="k">return</span> <span class="k">true</span>;  <span class="cm">// 8 * 3</span>` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">let</span> <span class="tok" data-t="init">total = <span class="nu">0</span></span>;` },
  { ln: 10, html: `  <span class="k">for</span> (<span class="k">const</span> day <span class="k">of</span> hours) <span class="tok" data-t="add">total += day</span>;` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="week">total &gt;= <span class="nu">6</span> * hours.length</span>;` },
  { ln: 12, html: `}` },
];

function trace(raw) {
  const hours = parse(raw);
  const a = analyze(hours);
  const steps = [];
  const wins = [];               // the trace's running record of each sum3 — not a
                                 // variable in the source, which is why it is a struct
                                 // labelled by what it holds rather than by a name.
  let phase = 1, cur = -1, h, i, sum3, total, day;
  // Scope by omission: a var appears only once its declaration line has run, and the
  // window struct appears when the window loop starts and then stays for the call.
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2 && line <= 4 && h !== undefined) vars.h = h;
    if (line >= 5 && line <= 8 && i !== undefined) vars.i = i;
    if (line >= 6 && line <= 8 && sum3 !== undefined) vars.sum3 = sum3;
    if (line === 10 && day !== undefined) vars.day = day;
    if (line >= 9 && total !== undefined) vars.total = total;
    const structs = [{ label: "hours", items: hours.map(markFor) }];
    if (line >= 5 && wins.length) structs.push({ label: "window sums", items: wins.slice(), newest: !!x.winNew });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `tooMuchScreenTime(${list(hours)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };
  const markFor = (v, k) => {
    if (phase === 1) return (k === cur ? "▸" : "") + v;
    if (phase === 2) return (cur >= 0 && k >= cur && k < cur + WIN ? "▸" : "") + v;
    return (k <= cur ? "+" : "") + v;
  };
  const TRUE = (line, focus, note) => S(line, note, { focus, done: true, result: "true", ret: { value: true } });

  S(1, `Is <b>${list(hours)}</b> too much screen time? The statement is three bullets and they are an <b>OR</b> — one true bullet ends it. So the code is three checks in the statement's order, each with its own early return, and nothing clever in between.`, { focus: "param" });

  // ── rule 1: any single day >= 10 ──
  S(2, `<b>Rule 1 — any single day of ${DAY_CAP} hours or more.</b> The cheapest rule and the one worth reading twice: "${DAY_CAP} hours <b>or more</b>" is <code class='inl'>&gt;=</code>. A ${DAY_CAP}-hour day is already too much, and freeCodeCamp tests exactly that.`);
  let seen = -Infinity;
  for (let k = 0; k < hours.length; k++) {
    cur = k; h = hours[k];
    const over = h >= DAY_CAP;
    const name = DAYS[k] || `day ${k + 1}`;   // not `day` — that name belongs to the rule-3 loop
    seen = Math.max(seen, h);
    S(3, over
      ? `<b>${name}</b> is <b>${h}</b>${h === DAY_CAP ? ` — exactly the limit, and "or more" means the limit counts` : ` hours, past the limit`}. Rule 1 fires.`
      : k === 0
        ? `<b>${name}</b> is <b>${h}</b>, under ${DAY_CAP}. One day cleared, and it constrains nothing: this rule asks about each day <i>on its own</i>, so all ${hours.length} have to be looked at.`
        : k === hours.length - 1
          ? `<b>${name}</b> is <b>${h}</b>, the last day, and the week's tallest was <b>${seen}</b>. Rule 1 has nothing to say about this week.`
          : k === 1
            ? `<b>${name}</b> is <b>${h}</b>, under ${DAY_CAP} — tallest so far <b>${seen}</b>. The order of the days is irrelevant to this rule: shuffle the week and it gives the same answer. That stops being true one rule from now.`
            : `<b>${name}</b> is <b>${h}</b>, under ${DAY_CAP} — tallest so far <b>${seen}</b>, still ${DAY_CAP - seen} short of the cap.`,
      { focus: "day", changed: ["h"], eval: { expr: `h = ${h} >= ${DAY_CAP}`, val: over } });
    if (over) { TRUE(3, "day", `<b>Return true</b> on day ${k + 1}. Rules 2 and 3 are never reached — that is not an optimisation, it is what an OR <i>means</i>, and it is why writing each bullet as its own early return keeps the code checkable against the statement line by line.`); return steps; }
  }
  cur = -1; h = undefined;
  S(4, `Every day is under ${DAY_CAP} (the peak was <b>${a.peak}</b>). Rule 1 says nothing — and it cannot, because it only ever looks at one day at a time. On to the rule that looks at three.`);

  // ── rule 2: any WIN consecutive days averaging >= 8 ──
  phase = 2;
  S(5, `<b>Rule 2 — any ${WIN} days <u>in a row</u> averaging ${8} hours or more.</b> "In a row" is the load-bearing phrase. It means a <b>sliding window</b>: <b>${a.windows.length}</b> positions on ${hours.length} days, not the ${choose(hours.length)} ways of picking any ${WIN} of them. And "average ≥ 8 over ${WIN} days" is just <b>sum ≥ ${WIN_SUM}</b>, so the comparison stays in integers.`, { focus: "wloop" });
  let prev = null;
  for (const w of a.windows) {
    i = w.i; cur = w.i; sum3 = w.sum;
    wins.push(`#${w.i + 1}:${w.sum}`);
    S(6, prev === null
      ? `Window <b>1</b> of ${a.windows.length}, <b>${span(i)}</b>: ${hours.slice(i, i + WIN).join(" + ")} = <b>${sum3}</b>. Adding instead of averaging is the move worth keeping — <code class='inl'>${sum3} / ${WIN}</code> is ${avg(sum3, WIN)}, and comparing that against 8 puts a float where the statement only ever talked about whole hours.`
      : `Window <b>${i + 1}</b> of ${a.windows.length}, <b>${span(i)}</b>: ${hours.slice(i, i + WIN).join(" + ")} = <b>${sum3}</b> — drop ${DAYS[i - 1] || `day ${i}`}'s ${hours[i - 1]}, pick up ${DAYS[i + WIN - 1] || `day ${i + WIN}`}'s ${hours[i + WIN - 1]}, and ${prev} becomes ${sum3}.${i === 1 ? ` Consecutive windows share ${WIN - 1} days, and that overlap <i>is</i> "in a row" — a reading that allowed any ${WIN} of the ${hours.length} days would have ${choose(hours.length)} of these to check instead of ${a.windows.length}.` : ``}`,
      { focus: "sum3", changed: ["i", "sum3"], winNew: true });
    prev = sum3;
    const hit = sum3 >= WIN_SUM;
    const left = a.windows.length - 1 - i;
    S(7, hit
      ? `<b>${sum3} ≥ ${WIN_SUM}</b> — that is an average of ${avg(sum3, WIN)} hours across ${span(i)}. Rule 2 fires.`
      : `<b>${sum3} &lt; ${WIN_SUM}</b>, an average of ${avg(sum3, WIN)}${WIN_SUM - sum3 <= 2 ? ` — only ${WIN_SUM - sum3} short, and this is where a <code class='inl'>&gt;</code> written for a <code class='inl'>&gt;=</code> would still agree` : ``}. ${left ? `${left} window${left === 1 ? "" : "s"} left.` : `That was the last window.`}`,
      { focus: "win", eval: { expr: `sum3 = ${sum3} >= ${WIN_SUM}`, val: hit } });
    if (hit) { TRUE(7, "win", `<b>Return true</b> at <b>${span(i)}</b>. Rule 3 never runs${a.total < a.need ? `, and on this week that changes the answer: the seven days total only <b>${a.total}</b>, under <b>${a.need}</b>, so rule 3 alone would have said <b>false</b>. A short binge inside a quiet week is the case rule 2 exists for.` : ` — though here it would have agreed, since the week totals <b>${a.total}</b>.`}`); return steps; }
  }
  cur = -1; i = undefined; sum3 = undefined;
  S(8, `All ${a.windows.length} windows are under ${WIN_SUM}; the biggest was <b>${a.bestWin.sum}</b> at <b>${span(a.bestWin.i)}</b>${WIN_SUM - a.bestWin.sum <= 2 ? `, only ${WIN_SUM - a.bestWin.sum} short` : ``}. Neither of the two "spike" rules found anything, so what is left is the week as a whole.`);

  // ── rule 3: the seven-day average >= 6 ──
  phase = 3;
  total = 0;
  S(9, `<b>Rule 3 — the ${hours.length}-day average of ${WEEK_AVG} hours or more.</b> Same rewrite one more time: an average of ${WEEK_AVG} over ${hours.length} days is a total of <b>${a.need}</b>. This is the rule that catches a week with no spike at all, just a steady load.`, { focus: "init", changed: ["total"] });
  for (let k = 0; k < hours.length; k++) {
    cur = k; day = hours[k]; total += day;
    S(10, `+ ${day} (${DAYS[k] || `day ${k + 1}`}) → running total <b>${total}</b>${k === hours.length - 1 ? `. That is the week.` : `, with ${hours.length - 1 - k} day${hours.length - 2 === k ? "" : "s"} still to add — it needs <b>${a.need}</b>.`}`,
      { focus: "add", changed: ["total", "day"] });
  }
  day = undefined;
  const over = total >= a.need;
  S(11, over
    ? `<b>${total} ≥ ${a.need}</b> — an average of ${avg(total, hours.length)} hours a day${total === a.need ? `, sitting exactly on the line. ${a.need} is <code class='inl'>${WEEK_AVG} × ${hours.length}</code>, and "or more" makes the line itself count` : ``}. Rule 3 fires.`
    : `<b>${total} &lt; ${a.need}</b> — an average of ${avg(total, hours.length)} hours a day, ${a.need - total} hour${a.need - total === 1 ? "" : "s"} under the line.`,
    { focus: "week", eval: { expr: `total = ${total} >= ${WEEK_AVG} * ${hours.length}`, val: over } });
  S(11, over
    ? `<b>Return true.</b> Reaching this line at all means the week had no ${DAY_CAP}-hour day and no heavy three-day run — the total alone is what condemns it, which is why the three rules are genuinely independent rather than three spellings of "a lot of hours".`
    : `<b>Return false.</b> This is the only way to get here: every rule evaluated, every one under its threshold. There is no early exit on the negative side, because "not too much" is a claim about <i>all three</i> bullets at once.`,
    { focus: "week", done: true, result: String(over), ret: { value: over } });
  return steps;
}

export default {
  n: 33, id: "screentime", title: "Screen Time", dates: ["2025-09-12"],
  statement: `Given an array of <b>seven integers</b> — a week of daily phone hours — decide whether it is too much screen time. It is too much if <b>any single day is 10 hours or more</b>, or if <b>the average of any three days in a row is 8 hours or more</b>, or if <b>the average of the seven days is 6 hours or more</b>. <span class="rule">Example: <code class="inl">tooMuchScreenTime([3, 3, 5, 8, 8, 9, 4])</code> → <code class="inl">true</code> (Fri–Sun averages 8⅓), but <code class="inl">tooMuchScreenTime([5, 6, 6, 6, 6, 6, 6])</code> → <code class="inl">false</code> (41 hours, one short of 42).</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — 7 days, 5 windows",
      approach: `A statement that is a <b>bulleted list of independent thresholds</b> is telling you there is no algorithm to find. The work is translating each bullet faithfully, and every bug in this problem is a word you skimmed. Rule 1 is "<b>10 hours or more</b>", so <code class='inl'>&gt;=</code> — the official <code class='inl'>[1, 2, 3, 10, 2, 1, 0]</code> is exactly 10 and answers <b>true</b>, and it is the only case that punishes <code class='inl'>&gt;</code>. Rule 2 is "three days <b>in a row</b>", which is a sliding window of width 3 — <b>five</b> positions on a seven-day week, not the 35 ways of choosing any three days. Read it loosely and <code class='inl'>[3, 9, 4, 8, 5, 7, 6]</code> gets the right answer for the wrong reason while other weeks quietly go wrong. The habit that makes both rules easy: rewrite "<b>average ≥ k over m items</b>" as "<b>sum ≥ k·m</b>". An average of 8 over 3 days is a sum of <b>24</b>; an average of 6 over 7 days is <b>42</b>. Now every comparison is between two integers and the boundary behaves — no <code class='inl'>25 / 3</code>, no float that is 7.999999 when you wanted 8. Short-circuiting is not an optimisation here, it is the natural shape: the bullets are an OR, so the first true one <i>is</i> the answer, and writing them as a chain of early returns is what lets you check the code against the statement line by line. Drag a bar and watch which rule takes over — <code class='inl'>[1, 1, 8, 8, 8, 1, 1]</code> is the week where only rule 2 can see the problem.`,
      code: `// Three independent thresholds, checked in the order the statement lists them.
// The bullets are an OR, so the first one that fires is the answer — which is why
// each is its own early return rather than a single boolean expression.
function tooMuchScreenTime(hours: number[]): boolean {
  // Rule 1 — any single day of 10 hours OR MORE. ">=", not ">": the official
  // case [1, 2, 3, 10, 2, 1, 0] is exactly 10 and is supposed to answer true.
  if (hours.some((h) => h >= 10)) return true;

  // Rule 2 — any three days IN A ROW averaging 8 or more. "In a row" means a
  // sliding window: 5 positions on a 7-day week, not every 3-subset of it.
  // "average >= 8 over 3 days" IS "sum >= 24", so the compare stays in integers.
  for (let i = 0; i + 2 < hours.length; i++) {
    if (hours[i] + hours[i + 1] + hours[i + 2] >= 24) return true;
  }

  // Rule 3 — the whole week averaging 6 or more, i.e. sum >= 6 * 7 = 42. Same
  // rewrite, same reason: [5, 6, 6, 6, 6, 6, 6] totals 41 and must answer false.
  const total = hours.reduce((sum, h) => sum + h, 0);
  return total >= 6 * hours.length;
}`,
      mount,
    },
    {
      name: "Step through", cost: "rule by rule",
      approach: `The three rules unrolled so each one is checked in front of you: seven single-day tests, then five sliding windows with their sums accumulating in the <b>window sums</b> panel, then the week added up one day at a time. The trace stops at the rule that returns, so the rules below it are simply never visited. Start on <code class='inl'>7,8,8,4,2,2,3</code> — the near miss, whose best window is <b>23</b>, one hour short of 24. Then <code class='inl'>1,1,8,8,8,1,1</code> (ours), where that same window lands on <b>24</b> exactly while the week totals only 28. Then <code class='inl'>5,6,6,6,6,6,6</code> against <code class='inl'>6,6,6,6,6,6,6</code>: 41 versus 42, the whole difference between the two answers. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "hours =", value: CASES[1].join(","), presets: CASES.map((c) => c.join(",")), hint: "7 numbers, comma-separated" },
      }),
    },
  ],
};
