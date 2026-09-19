// #341 · Birthday Countdown — jump to the year that has the date, don't walk the days.
// Same input, two ways to reach the same number — both correct, both 7/7 official:
//   • BRUTE — step the calendar forward ONE DAY AT A TIME, rolling the month and
//     the year by hand, until (m, d) matches the birthday. It is correct because
//     it literally lives through every leap day it crosses — and it costs one
//     loop iteration per day of the answer, so the answer IS the op count.
//   • OPT   — construct the next occurrence instead: try the birthday in this
//     year, and if that date isn't strictly in the future, advance the year
//     (skipping years with no Feb 29), then subtract two day-numbers. A handful
//     of candidate years, no matter how far away the birthday is.
//
// Flip the Approach toggle on the 2096 case to see 2,920 day-steps vs 9 candidate
// years — identical answer, and the walk has to cross 2100, a century that is NOT
// a leap year, to get there.
import { el, esc, mountDebugger } from "../shared.js";

// ── The calendar, derived from the leap rule rather than from Date ───────────
// Everything here is integer arithmetic on (y, m, d). No Date object anywhere,
// so there is no timezone to get an off-by-one from — the classic way this
// challenge breaks on someone else's machine.
const isLeap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLen = (y, m) => (m === 2 && isLeap(y) ? 29 : MDAYS[m - 1]);

// Day-of-year, then an absolute day number counted from 0001-01-01. The leap
// count uses the SAME rule as isLeap — /4 minus /100 plus /400 — so the two can
// never disagree about 2100.
const dayOfYear = (y, m, d) => {
  let doy = d;
  for (let k = 1; k < m; k++) doy += monthLen(y, k);
  return doy;
};
const dayNumber = (y, m, d) => {
  const prior = y - 1;
  return 365 * prior + Math.floor(prior / 4) - Math.floor(prior / 100)
    + Math.floor(prior / 400) + dayOfYear(y, m, d);
};

const fmt = (n) => n.toLocaleString("en-US");
const dLabel = (y, m, d) => `${MON[m - 1]} ${d}, ${y}`;

// ── Parsing ─────────────────────────────────────────────────────────────────
// Both parsers reject anything the challenge doesn't promise, because the BRUTE
// walk would spin forever on an (m, d) that no calendar year contains — 2/30.
function parseToday(s) {
  const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!mm) return null;
  const [y, m, d] = mm.slice(1).map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > monthLen(y, m)) return null;
  return { y, m, d };
}
function parseBirthday(s) {
  const mm = /^(\d{1,2})\/(\d{1,2})$/.exec(String(s).trim());
  if (!mm) return null;
  const [m, d] = mm.slice(1).map(Number);
  // 2/29 is legal (it just doesn't happen every year); 2/30 is not.
  if (m < 1 || m > 12 || d < 1 || d > (m === 2 ? 29 : MDAYS[m - 1])) return null;
  return { m, d };
}

// ── The two approaches ──────────────────────────────────────────────────────
// Both return the same `days`. They differ only in how much work that took:
// `days` itself for the walk, `tried.length` for the jump.

// BRUTE: one loop iteration per day. `path` records every day it lived through,
// which is what the grid on screen draws — 2,920 dots is not a metaphor.
function walk(today, b) {
  let { y, m, d } = today;
  let days = 0;
  const path = [];
  do {
    const len = monthLen(y, m);
    if (d < len) d++;
    else if (m < 12) { d = 1; m++; }
    else { d = 1; m = 1; y++; }
    days++;
    path.push({ y, m, d });
  } while (m !== b.m || d !== b.d);
  return { days, path, land: { y, m, d } };
}

// OPT: construct the next occurrence. `tried` is every candidate year the loop
// looked at, with the reason it was rejected — that list is the ladder on screen.
function jump(today, b) {
  const from = dayNumber(today.y, today.m, today.d);
  const tried = [];
  for (let y = today.y; ; y++) {
    if (b.m === 2 && b.d === 29 && !isLeap(y)) {
      tried.push({ y, skip: true });
      continue;
    }
    const when = dayNumber(y, b.m, b.d);
    const future = when > from;
    tried.push({ y, when, future, diff: when - from });
    // Strict `>`: if today IS the birthday, this year's date is not in the
    // future, so we fall through to the next year and return a full year.
    if (future) return { days: when - from, tried, ops: tried.length, land: { y, m: b.m, d: b.d } };
  }
}

const solve = (today, b, mode) => (mode === "walk" ? walk(today, b) : jump(today, b));

// Cases 1–7 are freeCodeCamp's official set, verbatim and in the grader's order:
// forward within the year · wraps into next year · today IS the birthday (365,
// not 0) · steps over Feb 29 in a leap year · long wrap · Feb-29 birthday four
// years out · Feb-29 birthday EIGHT years out, because 2100 is a century that
// isn't a leap year. Case 8 is invented — the official set never crosses a
// December→January boundary, which is the one branch where the walk has to roll
// the month AND the year in the same step.
const CASES = [
  ["2026-07-16", "9/7", 53],
  ["2026-07-16", "3/22", 249],
  ["2026-07-16", "7/16", 365],
  ["2024-02-28", "3/1", 2],
  ["2023-04-24", "12/30", 250],
  ["2024-03-01", "2/29", 1460],
  ["2096-03-01", "2/29", 2920],
  ["2024-12-31", "1/1", 1],
];
const OFFICIAL = CASES.slice(0, 7);
const PAYOFF = 6; // index of the 2096 case — the one the module opens on

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bd-wrap { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,320px); gap:18px; align-items:start; }
    @media (max-width:760px) { .bd-wrap { grid-template-columns:1fr; } }
    .bd-grid { display:flex; flex-wrap:wrap; gap:1px; max-height:230px; overflow:auto;
               padding:8px; border:1px solid var(--border); border-radius:10px; background:var(--panel-2); }
    .bd-d { width:4px; height:4px; border-radius:1px; background:var(--border); flex:0 0 auto; }
    .bd-d.ny { background:var(--muted); height:8px; margin:-2px 0; }
    .bd-d.feb { background:var(--warn); width:6px; height:6px; margin:-1px 0; border-radius:2px; }
    .bd-d.hit { background:var(--accent); width:8px; height:8px; margin:-2px 0; border-radius:2px; }
    .bd-key { display:flex; gap:14px; flex-wrap:wrap; font:11px var(--sans); color:var(--muted); margin-top:7px; }
    .bd-key i { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
    .bd-eq { font:13px var(--mono); margin:8px 0 4px; color:var(--muted); }
    .bd-eq b { color:var(--text); }
    .bd-eq .win { color:var(--accent); }
    .bd-eq .no { color:var(--danger); }
    .bd-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
              color:var(--muted); margin:12px 0 4px; }
    .bd-rung-why { color:var(--muted); font:11.5px var(--mono); }
  `));
}

// ── The walk, drawn ──────────────────────────────────────────────────────────
// One dot per loop iteration. Jan 1 draws as a tall tick and Feb 29 as an amber
// square, so on the 2096 case you can count eight year ticks and see that the
// stretch containing 2100 has no amber square in it at all.
function walkGrid(path) {
  const cells = path.map((p, i) => {
    let cls = "bd-d";
    if (i === path.length - 1) cls += " hit";
    else if (p.m === 2 && p.d === 29) cls += " feb";
    else if (p.m === 1 && p.d === 1) cls += " ny";
    return `<i class="${cls}"></i>`;
  }).join("");
  return `<div class="bd-grid">${cells}</div>` +
    `<div class="bd-key">` +
    `<span><i style="background:var(--border)"></i>one day stepped</span>` +
    `<span><i style="background:var(--muted)"></i>Jan 1</span>` +
    `<span><i style="background:var(--warn)"></i>Feb 29</span>` +
    `<span><i style="background:var(--accent)"></i>the birthday</span></div>`;
}

// ── The jump, drawn ──────────────────────────────────────────────────────────
// One rung per candidate year, carrying the reason it was rejected. The Feb-29
// rows are where the century rule becomes visible.
function jumpLadder(tried, b) {
  const lad = el("div", "ladder");
  tried.forEach((t) => {
    const on = t.future;
    const rung = el("div", "rung" + (on ? " on" : ""));
    let why;
    if (t.skip) why = `<span class="bd-rung-why">no Feb 29 — ${t.y % 4 !== 0
      ? `${t.y} % 4 = ${t.y % 4}`
      : `a century, and ${t.y} % 400 = ${t.y % 400}`} → skip</span>`;
    else if (!t.future) why = `<span class="bd-rung-why">${MON[b.m - 1]} ${b.d} already gone (${fmt(-t.diff)} days back)</span>`;
    else why = `<span>◀ ${fmt(t.diff)} days away</span>`;
    rung.innerHTML = `<span>${t.y}</span>${why}`;
    lad.append(rung);
  });
  return lad;
}

// ── The official-test scoreboard ─────────────────────────────────────────────
// Both approaches pass all 7. The `work` column is where they part company, so
// the cost gap is legible at a glance instead of asserted in prose.
function scoreboard(mode) {
  const box = el("div");
  const rows = OFFICIAL.map(([t, b, want]) => {
    const r = solve(parseToday(t), parseBirthday(b), mode);
    return { t, b, want, got: r.days, work: mode === "walk" ? r.days : r.ops };
  });
  const pass = rows.filter((x) => x.got === x.want).length;
  const total = rows.reduce((s, x) => s + x.work, 0);
  const other = OFFICIAL.reduce((s, [t, b]) => {
    const r = solve(parseToday(t), parseBirthday(b), mode === "walk" ? "jump" : "walk");
    return s + (mode === "walk" ? r.ops : r.days);
  }, 0);
  const unit = mode === "walk" ? "day-steps" : "years tried";

  box.append(el("div", "bd-lbl", `Official freeCodeCamp tests · ${pass} of ${rows.length} passing`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">case</span><span class="exp">expected</span>` +
    `<span class="got">got</span><span class="exp">${unit}</span>`));
  rows.forEach((x) => {
    box.append(el("div", "srow" + (x.got === x.want ? "" : " bad"),
      `<span class="mark">${x.got === x.want ? "✓" : "✗"}</span>` +
      `<span class="k">${esc(x.t)}, ${esc(x.b)}</span>` +
      `<span class="exp">${fmt(x.want)}</span>` +
      `<span class="got">${fmt(x.got)}</span>` +
      `<span class="exp">${fmt(x.work)}</span>`));
  });
  box.append(el("div", "bd-eq",
    `all 7 cases cost <b>${fmt(total)}</b> ${unit} — ` +
    `the other approach answers the same 7 in <span class="win">${fmt(other)}</span> ` +
    `${mode === "walk" ? "years tried" : "day-steps"}.`));
  return box;
}

// ── Shared demo shell ────────────────────────────────────────────────────────
// Free date entry plus every case as a chip, so the whole official surface is
// reachable two ways. Opens on the 2096 case — the payoff.
function mountDemo(host, mode) {
  ensureStyle();

  const ctl = el("div", "controls");
  const tIn = el("input"); tIn.type = "date"; tIn.value = CASES[PAYOFF][0]; tIn.style.width = "168px";
  const bIn = el("input"); bIn.type = "text"; bIn.value = CASES[PAYOFF][1]; bIn.style.width = "76px";
  ctl.append(el("span", "ctl-label", "today ="), tIn,
             el("span", "ctl-label", "birthday ="), bIn, el("span", "ctl-label", "(M/D)"));

  const chips = el("div", "controls");
  CASES.forEach(([t, b, want], i) => {
    const c = el("button", "chip", `${t} · ${b}`);
    c.title = `expects ${want}${i < 7 ? " (official)" : " (invented — December→January roll)"}`;
    c.onclick = () => { tIn.value = t; bIn.value = b; render(); };
    chips.append(c);
  });

  const head = el("div", "demo-head");
  const wrap = el("div", "bd-wrap");
  const left = el("div"), right = el("div");
  wrap.append(left, right);
  host.append(ctl, chips,
    el("div", "muted", "Type any date and any <code class='inl'>M/D</code> birthday — <b>2/29</b> is the interesting one."),
    head, wrap);

  function render() {
    const today = parseToday(tIn.value), b = parseBirthday(bIn.value);
    head.innerHTML = ""; left.innerHTML = ""; right.innerHTML = "";
    if (!today || !b) {
      left.append(el("div", "note", "Give a real <code class='inl'>YYYY-MM-DD</code> date and an <code class='inl'>M/D</code> birthday. <b>2/30</b> is not a date in any year — the walking version would loop forever looking for it, which is why both parse strictly."));
      return;
    }

    const r = solve(today, b, mode);

    head.innerHTML = mode === "walk"
      ? `<span class="opcount hot"><span class="n">${fmt(r.days)}</span> day-steps</span>` +
        `<span class="muted mono">one loop iteration per day of the answer</span>`
      : `<span class="opcount cool"><span class="n">${fmt(r.ops)}</span> candidate years</span>` +
        `<span class="muted mono">two day-numbers, one subtraction</span>`;

    if (mode === "walk") {
      left.append(el("div", "bd-eq",
        `from <b>${dLabel(today.y, today.m, today.d)}</b>, one day at a time, until (m, d) = <b>${b.m}/${b.d}</b>`));
      left.innerHTML += walkGrid(r.path);
      left.append(el("div", "bd-eq",
        `<b>${fmt(r.days)}</b> iterations — the loop had to <i>live through</i> every one of them, ` +
        `including ${r.path.filter((p) => p.m === 2 && p.d === 29).length} leap day(s), to learn one number.`));
    } else {
      left.append(el("div", "bd-eq",
        `from = dayNumber(<b>${today.y}</b>, ${today.m}, ${today.d}) = <b>${fmt(dayNumber(today.y, today.m, today.d))}</b>`));
      left.append(el("div", "bd-lbl", "Candidate years, in order"));
      left.append(jumpLadder(r.tried, b));
      const hit = r.tried[r.tried.length - 1];
      left.append(el("div", "bd-eq",
        `when = dayNumber(<b>${hit.y}</b>, ${b.m}, ${b.d}) = <b>${fmt(hit.when)}</b>, ` +
        `so <span class="win">${fmt(hit.when)} − ${fmt(dayNumber(today.y, today.m, today.d))} = ${fmt(r.days)}</span>`));
    }

    right.append(el("div", null,
      `<span class="badge ok">${fmt(r.days)} days</span>`));
    right.append(el("div", "bd-eq",
      `next birthday lands on <b>${dLabel(r.land.y, r.land.m, r.land.d)}</b>`));
    if (dayNumber(today.y, today.m, today.d) === dayNumber(today.y, b.m, b.d))
      right.append(el("div", "bd-eq",
        `Today <span class="win">is</span> the birthday — the answer is a <b>whole year</b>, not <b class="no">0</b>. ` +
        `The walk gets that from stepping <i>before</i> it tests; the jump gets it from a <b>strict</b> <code class='inl'>&gt;</code>.`));
    right.append(scoreboard(mode));
  }

  tIn.oninput = render; bIn.oninput = render;
  render();
}

const mountWalk = (host) => mountDemo(host, "walk");
const mountJump = (host) => mountDemo(host, "jump");

// ── STEP — one debugger per approach ─────────────────────────────────────────
const SRC_WALK = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="leap"><span class="fn">isLeap</span> = (y) =&gt; y % 4 === 0 &amp;&amp; (y % 100 !== 0 || y % 400 === 0)</span>;` },
  { ln: 2, html: `<span class="k">const</span> <span class="tok" data-t="mdays">MDAYS</span> = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];` },
  { ln: 3, html: `<span class="k">function</span> <span class="fn">daysUntilBirthday</span>(<span class="tok" data-t="param">today, birthday</span>) {` },
  { ln: 4, html: `  <span class="k">let</span> <span class="tok" data-t="parseT">[y, m, d] = today.<span class="fn">split</span>(<span class="st">"-"</span>).<span class="fn">map</span>(Number)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="parseB">[bm, bd] = birthday.<span class="fn">split</span>(<span class="st">"/"</span>).<span class="fn">map</span>(Number)</span>;` },
  { ln: 6, html: `  <span class="k">let</span> <span class="tok" data-t="days">days = 0</span>;` },
  { ln: 7, html: `  <span class="k">do</span> {` },
  { ln: 8, html: `    <span class="k">const</span> <span class="tok" data-t="len">len = m === 2 &amp;&amp; <span class="fn">isLeap</span>(y) ? 29 : MDAYS[m - 1]</span>;` },
  { ln: 9, html: `    <span class="k">if</span> (<span class="tok" data-t="roll">d &lt; len</span>) d++; <span class="k">else if</span> (m &lt; 12) { d = 1; m++; } <span class="k">else</span> { d = 1; m = 1; y++; }` },
  { ln: 10, html: `    <span class="tok" data-t="tick">days++</span>;` },
  { ln: 11, html: `  } <span class="k">while</span> (<span class="tok" data-t="wcond">m !== bm || d !== bd</span>);` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="ret">days</span>;` },
  { ln: 13, html: `}` },
];

const SRC_JUMP = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="leap"><span class="fn">isLeap</span> = (y) =&gt; y % 4 === 0 &amp;&amp; (y % 100 !== 0 || y % 400 === 0)</span>;` },
  { ln: 2, html: `<span class="k">function</span> <span class="fn">daysUntilBirthday</span>(<span class="tok" data-t="param">today, birthday</span>) {` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="parseT">[ty, tm, td] = today.<span class="fn">split</span>(<span class="st">"-"</span>).<span class="fn">map</span>(Number)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="parseB">[bm, bd] = birthday.<span class="fn">split</span>(<span class="st">"/"</span>).<span class="fn">map</span>(Number)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="from">from = <span class="fn">dayNumber</span>(ty, tm, td)</span>;  <span class="cm">// absolute day count, no Date</span>` },
  { ln: 6, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="ycond">y = ty; ; y++</span>) {` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="feb">bm === 2 &amp;&amp; bd === 29 &amp;&amp; !<span class="fn">isLeap</span>(y)</span>) <span class="k">continue</span>;` },
  { ln: 8, html: `    <span class="k">const</span> <span class="tok" data-t="when">when = <span class="fn">dayNumber</span>(y, bm, bd)</span>;` },
  { ln: 9, html: `    <span class="k">if</span> (<span class="tok" data-t="strict">when &gt; from</span>) <span class="k">return</span> when - from;  <span class="cm">// strict: today → a full year</span>` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `}` },
];

const MDAYS_ITEMS = MDAYS.map((n, k) => `${MON[k]} ${n}`);

// The BRUTE step-through runs its OWN short cases: at 2,920 iterations the 2096
// case is 14,000+ steps and cannot be a trace. These four each land on a
// different branch of line 9 — day++, month roll, month roll across a leap day,
// and the December→January roll that also bumps the year. Every case the walk
// step-through drops (including all seven official ones) stays reachable in the
// demo above, which runs this exact algorithm with no cap.
const WALK_CASES = [
  ["2024-02-28", "3/1", 2],    // official — steps over Feb 29 because 2024 is a leap year
  ["2023-02-28", "3/1", 1],    // invented — the same walk in a non-leap year, one step
  ["2024-12-31", "1/1", 1],    // invented — December→January, rolls d, m AND y at once
  ["2026-07-16", "7/19", 3],   // invented — three plain d++ steps, no roll at all
];

// The debugger input is a case NUMBER, so the chips read "1", "2"… — a legend
// above them says which case each number is. `max` is bound to the array that
// this particular step-through actually runs, so neither can drift.
function mountCaseDebugger(host, cases, source, trace, value, label) {
  ensureStyle();
  host.append(el("div", "bd-eq", "cases &nbsp;" + cases.map((c, i) =>
    `<b>${i + 1}</b>&nbsp;${c[0]} · ${c[1]} → ${fmt(c[2])}`).join(" &nbsp;&nbsp;")));
  mountDebugger(host, {
    source, trace,
    input: { label, value, min: 1, max: cases.length, presets: cases.map((_, i) => i + 1), hint: `1–${cases.length}` },
  });
}

// BRUTE trace — every iteration is one day and one tick of the counter. The
// notes are written to make the cost accumulate: on a two-day case that reads as
// cheap, which is exactly the illusion the 2096 case in the demo destroys.
function traceWalk(idx) {
  const [todayStr, bdayStr, want] = WALK_CASES[Math.min(WALK_CASES.length, Math.max(1, idx)) - 1];
  const today = parseToday(todayStr), b = parseBirthday(bdayStr);

  const steps = [];
  let y, m, d, bm, bd, days;
  const visited = [];
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4) { vars.y = y; vars.m = m; vars.d = d; }
    if (line >= 5) { vars.bm = bm; vars.bd = bd; }
    if (line >= 6) vars.days = days;
    // `len` is a const inside the do-block, so it is gone again by the time the
    // while-condition on line 11 is evaluated — scope by omission, both ends.
    if (line >= 8 && line <= 10 && x.len !== undefined) vars.len = x.len;
    const structs = [];
    if (line >= 2) structs.push({ label: "MDAYS", items: MDAYS_ITEMS });
    if (line >= 7) structs.push({ label: "walked", items: visited.slice(), newest: !!x.fresh });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `daysUntilBirthday("${todayStr}", "${bdayStr}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The leap rule, written out in full: divisible by <b>4</b>, <b>except</b> centuries, <b>unless</b> divisible by 400. A bare <code class='inl'>y % 4 === 0</code> would call <b>2100</b> a leap year and hand back an answer one day short — the walking version would physically step onto a Feb 29 that never happened.`, { focus: "leap" });
  S(2, `Month lengths for a common year. February's <b>28</b> is the only one line 8 ever has to override, so this table plus <code class='inl'>isLeap</code> is the entire calendar.`, { focus: "mdays" });
  S(3, `Walk forward from <b>${todayStr}</b> until the calendar reads <b>${bdayStr}</b>. No cleverness at all: we will simply <i>be</i> every day in between, and count them.`, { focus: "param" });

  ({ y, m, d } = today);
  S(4, `Today splits into <b>y = ${y}</b>, <b>m = ${m}</b>, <b>d = ${d}</b>. These three are <code class='inl'>let</code>, because the walk mutates them — the cursor <i>is</i> the state.`, { focus: "parseT", changed: ["y", "m", "d"] });
  bm = b.m; bd = b.d;
  S(5, `The birthday has no year — only <b>bm = ${bm}</b>, <b>bd = ${bd}</b>. That is the whole reason the answer isn't a plain date subtraction: we have to find <i>which</i> year it belongs to.`, { focus: "parseB", changed: ["bm", "bd"] });
  days = 0;
  S(6, `The counter starts at <b>0</b>. Every increment from here costs one loop iteration, so <b>days</b> ends up being both the answer <i>and</i> the bill.`, { focus: "days", changed: ["days"] });

  let first = true;
  for (;;) {
    S(7, first
      ? `Enter the loop body. It is a <code class='inl'>do…while</code>, not a <code class='inl'>while</code> — the body runs <b>before</b> the test even once. That single choice is what makes "today is your birthday" return a full year instead of <b>0</b>.`
      : `Round the loop again. Nothing is remembered between iterations except the cursor and the counter; each pass buys exactly <b>one</b> day of the final answer.`);
    first = false;

    const len = monthLen(y, m);
    S(8, `How long is <b>${MON[m - 1]} ${y}</b>? ${m === 2
      ? `February, so ask <code class='inl'>isLeap(${y})</code> → <b>${isLeap(y)}</b> → <b>${len}</b> days. This is the only place the leap rule can change the walk's path.`
      : `Not February, so read it straight off MDAYS: <b>${len}</b> days.`}`, { focus: "len", len, changed: ["len"] });

    const before = dLabel(y, m, d);
    const om = m; // the month we're leaving — read it before the roll mutates m
    let how;
    if (d < len) { d++; how = `<b>d</b> is still inside the month, so just <b>d++</b>`; }
    else if (m < 12) { d = 1; m++; how = `<b>d</b> hit the last day of ${MON[om - 1]}, so reset <b>d = 1</b> and <b>m++</b>`; }
    else { d = 1; m = 1; y++; how = `<b>Dec 31</b> — reset <b>d = 1</b>, wrap <b>m = 1</b>, and bump <b>y++</b>. All three roll in one step`; }
    visited.push(`${MON[m - 1]} ${d}`);
    S(9, `${before} → <b>${dLabel(y, m, d)}</b>: ${how}.${m === 2 && d === 29 ? ` We just stepped <i>onto</i> Feb 29 — a day that only exists because ${y} passes the leap test.` : ``}`, { focus: "roll", changed: ["y", "m", "d"], len, fresh: true });

    days++;
    S(10, `<b>days = ${days}</b>. One more iteration spent, one more day bought. For a birthday next week that's fine; for the Feb-29 cases in the demo this line runs <b>1,460</b> and <b>2,920</b> times.`, { focus: "tick", changed: ["days"], len });

    const more = m !== bm || d !== bd;
    S(11, `Does the cursor read <b>${bm}/${bd}</b> yet? It reads <b>${m}/${d}</b> — ${more
      ? `not a match, so go round again. Note the test only compares <b>month and day</b>: the year is deliberately ignored, which is what lets the walk sail past a December boundary without special-casing anything.`
      : `<b>match</b>. Stop walking; <b>days</b> is the answer.`}`, {
      focus: "wcond", len,
      eval: { expr: `m !== ${bm} || d !== ${bd}   (m = ${m}, d = ${d})`, val: more },
    });
    if (!more) break;
  }

  S(12, `<b>Return ${days}</b> — and the run cost <b>${days}</b> iterations to produce it, matching the expected <b>${want}</b>. The optimised tab reaches the same number by naming the year outright and subtracting two day-numbers; its step count doesn't grow with the answer at all.`, {
    focus: "ret", done: true, result: days, ret: { value: days },
  });
  return steps;
}

// OPT trace — the loop is over CANDIDATE YEARS, not days, so case 7 (2,920 days)
// is nine iterations. Every official case fits, which is why this step-through
// gets the full CASES array and the walk step-through doesn't.
function traceJump(idx) {
  const [todayStr, bdayStr, want] = CASES[Math.min(CASES.length, Math.max(1, idx)) - 1];
  const today = parseToday(todayStr), b = parseBirthday(bdayStr);

  const steps = [];
  let ty, tm, td, bm, bd, from, y, when;
  const cand = [];
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3) { vars.ty = ty; vars.tm = tm; vars.td = td; }
    if (line >= 4) { vars.bm = bm; vars.bd = bd; }
    if (line >= 5) vars.from = from;
    if (line >= 6 && y !== undefined) vars.y = y;
    if (line >= 8 && when !== undefined) vars.when = when;
    const structs = [];
    if (line >= 6) structs.push({ label: "candidates", items: cand.slice(), newest: !!x.fresh });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `daysUntilBirthday("${todayStr}", "${bdayStr}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The same leap rule the walking version needs — but here it is load-bearing in a second way. Line 7 uses it to decide whether a candidate year <i>contains</i> Feb 29 at all, so getting <b>2100</b> wrong wouldn't just shift the answer, it would return a date that doesn't exist.`, { focus: "leap" });
  S(2, `Instead of travelling to the birthday, <b>construct</b> it: the next occurrence is <b>${bdayStr}</b> in some year, and there are only a few candidates worth testing.`, { focus: "param" });

  ty = today.y; tm = today.m; td = today.d;
  S(3, `Today is <b>${dLabel(ty, tm, td)}</b>. Unlike the walk, these are <code class='inl'>const</code> — nothing here ever moves, because we never travel.`, { focus: "parseT", changed: ["ty", "tm", "td"] });
  bm = b.m; bd = b.d;
  S(4, `The birthday is <b>${MON[bm - 1]} ${bd}</b> with the year left blank. Finding that missing year is now the <i>entire</i> problem.`, { focus: "parseB", changed: ["bm", "bd"] });

  from = dayNumber(ty, tm, td);
  S(5, `Collapse today into one integer: <b>${fmt(from)}</b> days since 0001-01-01, counted with the very same <code class='inl'>/4 − /100 + /400</code> rule. Once both dates are plain numbers, "how far apart" is a subtraction — and there is no <code class='inl'>Date</code> object, so no timezone can shift it by a day.`, { focus: "from", changed: ["from"] });

  for (y = ty; ; y++) {
    when = undefined;
    S(6, `Try year <b>${y}</b>. The loop counts <i>years</i>, not days — this is the whole saving. ${y === ty ? `Start with today's own year, because most birthdays are still ahead in it.` : `The previous candidate didn't work out, so step to the next one.`}`, { focus: "ycond", changed: ["y"] });

    const noFeb = bm === 2 && bd === 29 && !isLeap(y);
    S(7, bm === 2 && bd === 29
      ? `A <b>Feb 29</b> birthday, so this candidate is only valid if <b>${y}</b> actually has one. <code class='inl'>isLeap(${y})</code> → <b>${isLeap(y)}</b>${!isLeap(y) && y % 4 === 0 ? ` — divisible by 4, but it is a century and <b>${y} % 400 = ${y % 400}</b>, so the exception to the exception does <i>not</i> apply` : !isLeap(y) ? ` — <b>${y} % 4 = ${y % 4}</b>` : ``}. ${noFeb ? `No Feb 29 here; <code class='inl'>continue</code> and try the next year without even computing a day-number.` : `${y} has a Feb 29, so this candidate is worth pricing.`}`
      : `The birthday is <b>${MON[bm - 1]} ${bd}</b>, which every year has, so this guard is a no-op — it exists solely for <b>2/29</b>, the one date that isn't in every calendar.`, {
      focus: "feb",
      eval: { expr: `bm === 2 && bd === 29 && !isLeap(${y})`, val: noFeb },
    });
    if (noFeb) { cand.push(`${y} ✗`); continue; }

    when = dayNumber(y, bm, bd);
    S(8, `<b>${MON[bm - 1]} ${bd}, ${y}</b> is day <b>${fmt(when)}</b>. One call, no loop over days — the day-number formula walks twelve months at most, never a year.`, { focus: "when", changed: ["when"] });

    const future = when > from;
    cand.push(`${y} ${future ? "✓" : "•"}`);
    S(9, `Is <b>${fmt(when)} &gt; ${fmt(from)}</b>? ${future
      ? `Yes — <b>${fmt(when - from)}</b> days away. First candidate strictly in the future is by definition the <i>next</i> birthday, so return.`
      : (when === from
        ? `No — they are <b>equal</b>, because today <i>is</i> the birthday. The comparison is deliberately <b>strict</b>: an accidental <code class='inl'>&gt;=</code> here returns <b>0</b>, and the challenge says the answer must be a whole year.`
        : `No — that date is <b>${fmt(from - when)}</b> days in the past. Advance the year and price the next one.`)}`, {
      focus: "strict", fresh: true, changed: ["when"],
      eval: { expr: `${fmt(when)} > ${fmt(from)}`, val: future },
      ...(future ? { done: true, result: when - from, ret: { value: when - from } } : {}),
    });
    if (future) {
      const cost = walk(today, b).days;
      steps[steps.length - 1].note +=
        ` &nbsp;<span class="rule">Answer <b>${fmt(when - from)}</b>, expected <b>${fmt(want)}</b> — reached after <b>${cand.length}</b> candidate year${cand.length === 1 ? "" : "s"}, where the walking version needed <b>${fmt(cost)}</b> iterations.</span>`;
      return steps;
    }
  }
}

export default {
  n: 341, id: "birthday", title: "Birthday Countdown", dates: ["2026-07-17"],
  statement: `Given today's date as <code class="inl">"YYYY-MM-DD"</code> and a birthday as <code class="inl">"M/D"</code> (no leading zeros), return the number of days until that person's <b>next</b> birthday. If today <i>is</i> their birthday, return the days until the following one — <b>not 0</b>. Leap years count. <span class="rule">Example: <code class="inl">daysUntilBirthday("2024-02-28", "3/1")</code> → <b>2</b>, because 2024 is a leap year and Feb 29 sits in between. And <code class="inl">daysUntilBirthday("2096-03-01", "2/29")</code> → <b>2920</b>, because the next Feb 29 is in <b>2104</b> — 2100 is a century that is not a leap year.</span>`,
  variants: [
    {
      name: "Walk one day at a time", tone: "brute", cost: "O(days) — up to 2,920 steps",
      approach: `Don't think about the calendar — <i>walk</i> it. Move the cursor forward one day, rolling the day into the month and the month into the year by hand, and stop when the cursor reads the birthday. It is correct precisely because it is literal: it can't get a leap year wrong, because it physically visits Feb 29 whenever there is one. The price is that the answer <b>is</b> the op count — the counter in the header equals the number returned. Click the <code class='inl'>2096-03-01 · 2/29</code> chip and watch it draw <b>2,920</b> dots.`,
      code: `// Correct, and immune to leap-year mistakes because it LIVES every day —
// but it pays one loop iteration per day of the answer.
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeap = (y: number): boolean =>
  y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);

function daysUntilBirthday(today: string, birthday: string): number {
  let [y, m, d] = today.split("-").map(Number);
  const [bm, bd] = birthday.split("/").map(Number);
  let days = 0;
  do {                       // do/while, so today itself can never score 0
    const len = m === 2 && isLeap(y) ? 29 : MDAYS[m - 1];
    if (d < len) d++;
    else if (m < 12) { d = 1; m++; }
    else { d = 1; m = 1; y++; }
    days++;
  } while (m !== bm || d !== bd);
  return days;
}`,
      mount: mountWalk,
    },
    {
      name: "Step: walk one day at a time", tone: "brute", cost: "one iteration per day",
      approach: `A debugger for the walk. It runs <b>short</b> cases on purpose — at 2,920 iterations the 2096 case is a fourteen-thousand-step trace and cannot exist; every case dropped here is still reachable in the demo above, which runs this exact algorithm uncapped. Case <b>1</b> is freeCodeCamp's own leap-year case: watch line 8 return <b>29</b> for February and line 9 step onto a day that only exists in 2024. Cases 2–4 are invented to land on the other branches of line 9. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountCaseDebugger(host, WALK_CASES, SRC_WALK, traceWalk, 1, "short case ="),
    },
    {
      name: "Jump to the next occurrence", tone: "opt", cost: "O(1) — a few candidate years",
      approach: `Stop travelling and start constructing. The next birthday is <code class='inl'>bm/bd</code> in <i>some</i> year, so try this year first; if that date isn't <b>strictly</b> in the future, move to the next year — repeating while a <b>2/29</b> birthday lands on a year with no Feb 29. Then turn both dates into absolute day numbers and subtract. The loop counts <b>years</b>, so the 2096 case costs <b>9</b> candidates instead of 2,920 day-steps, and the strict <code class='inl'>&gt;</code> is what makes "today is your birthday" a full year rather than <b>0</b>. The ladder shows every candidate and why it was rejected.`,
      code: `// Construct the next occurrence instead of walking to it.
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeap = (y: number): boolean =>
  y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);

// Absolute day count from 0001-01-01, built from the leap rule itself.
// No Date object, so there is no timezone to be off by one from.
function dayNumber(y: number, m: number, d: number): number {
  let doy = d;
  for (let k = 1; k < m; k++) doy += k === 2 && isLeap(y) ? 29 : MDAYS[k - 1];
  const prior = y - 1;
  return 365 * prior + Math.floor(prior / 4) - Math.floor(prior / 100)
    + Math.floor(prior / 400) + doy;
}

function daysUntilBirthday(today: string, birthday: string): number {
  const [ty, tm, td] = today.split("-").map(Number);
  const [bm, bd] = birthday.split("/").map(Number);
  const from = dayNumber(ty, tm, td);
  for (let y = ty; ; y++) {
    if (bm === 2 && bd === 29 && !isLeap(y)) continue; // that year has no Feb 29
    const when = dayNumber(y, bm, bd);
    if (when > from) return when - from;               // strict: today -> a full year
  }
}`,
      mount: mountJump,
    },
    {
      name: "Step: jump to the next occurrence", tone: "opt", cost: "one iteration per year",
      approach: `The same problem as a short arithmetic run — <b>all eight</b> cases fit here, including the two the walk step-through can't touch. Load case <b>7</b> (<code class='inl'>2096-03-01 · 2/29</code>) and step through: the loop rejects 2096 (Feb 29 already gone), skips 2097–2099 and <b>2100</b> — the century that fails the leap test — then 2101–2103, and lands on <b>2104</b>. Nine iterations for an answer of 2,920. Run case 3 to watch the strict <code class='inl'>&gt;</code> refuse to return 0. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountCaseDebugger(host, CASES, SRC_JUMP, traceJump, 7, "case ="),
    },
  ],
};
