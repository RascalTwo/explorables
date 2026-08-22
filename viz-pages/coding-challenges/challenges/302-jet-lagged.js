// #302 · Jet Lagged — the ×1.5 scales the flight term only, never the timezone gap.
//
// ONE approach, so one `Solution` + one `Step through`. CONTRIBUTING Tier 3 asks
// the question first: is there a wasteful act to name? There isn't. The whole
// problem is a table lookup, a subtraction and one multiply — and "lookup table
// vs. seven-branch if-chain" is two spellings of one approach, which Tier 3
// explicitly rejects as a second tab.
//
// Three things the seven official assertions pin down that a real-world instinct
// gets WRONG, and all three were established by running the assertions first:
//
//   1. OPERATOR PRECEDENCE IS THE WHOLE CHALLENGE. The statement writes
//      "timezone difference + (flight duration * 0.1) * direction multiplier".
//      `*` binds tighter than `+`, so the multiplier scales ONLY the flight
//      term. Case 1 — Istanbul→Hong Kong, 10 h, east — is 5 + 1.0×1.5 = 6.5.
//      Read it as (5 + 1.0)×1.5 and you get 9.0 — and exactly 3 of the 7
//      assertions fail: cases 1, 3 and 7, the eastbound ones. The other four
//      carry multiplier 1.0, so the re-bracketing is a no-op there and they
//      pass either way. A suite of only those four would have shipped the bug.
//      So "eastward is worse" is worth at most 0.5 × duration/10 here: half an
//      hour on a ten-hour flight, against a gap that can be 17. The famous
//      asymmetry is, in this spec, the *smallest* term in the sum.
//
//   2. DIRECTION IS GIVEN, NOT DERIVED. It arrives as a fourth argument and is
//      never checked against the offsets. Official case 5 is Los Angeles →
//      Hong Kong tagged "west" — geographically true (across the Pacific) but
//      the offsets go −8 → +8, i.e. *up*. Derive direction from the sign of the
//      offset difference and you break that case. The sign is thrown away by
//      Math.abs; which way you flew is carried by the argument alone.
//
//   3. THE RESULT IS NEVER NEGATIVE AND NEVER CLAMPED. The difference is a
//      magnitude and the flight term is non-negative, so there is nothing to
//      clamp — no Math.max(0, …) anywhere. The only post-processing is the
//      one-decimal round, and the two obvious spellings of it DISAGREE. Every
//      official case sums to a double that is already exact to one place, so
//      the grader never separates them — but case 8 below does. Its sum is the
//      double just BELOW 18.65 (18.649999999999998579), and:
//        Math.round(x * 10) / 10  →  18.7     (x * 10 is exactly 186.5)
//        x.toFixed(1)             →  "18.6"   (it sees the value beneath 18.65)
//      That divergence is invented, not the challenge's — same standing as
//      320-blood-bank's cases[1], and named here for the same reason.
//
// Flip the direction toggle on cases 8 and 9 — Los Angeles → Tokyo, 11 h, the
// widest gap in the table — to watch the whole payoff: 18.7 vs 18.1. The bar
// grows by 0.55 h out of 18. That gap between what you expect and what the spec
// says is the module's point.
import { el, esc, mountDebugger } from "../shared.js";

// The statement's UTC-offset table, transcribed as DATA in the row order
// freeCodeCamp prints it — which is also ascending offset, so this array doubles
// as the layout order for the world strip in the demo. Every key is quoted for
// uniformity: three of the seven carry a space and could not be bare identifiers.
const CITIES = [
  ["Los Angeles", -8], ["New York", -5], ["London", 0], ["Istanbul", 3],
  ["Dubai", 4], ["Hong Kong", 8], ["Tokyo", 9],
];
const OFFSETS = Object.fromEntries(CITIES);

// The `code` block below is built from this, so the snippet and the demo read
// the same seven rows and cannot drift apart.
const OFFSET_LINES = CITIES.map(([c, o]) => `  "${c}": ${o},`).join("\n");

const MIN_OFF = CITIES[0][1], MAX_OFF = CITIES[CITIES.length - 1][1]; // −8 … +9
const SPAN = MAX_OFF - MIN_OFF;                                        // 17 hours
const DUR_MAX = 20;
// Widest possible answer: the full 17-hour gap plus a 20-hour eastbound flight.
const TOTAL_SCALE = SPAN + DUR_MAX * 0.1 * 1.5;

// ── The solution ─────────────────────────────────────────────────────────────
// Identical arithmetic to the TypeScript block below, in the same associativity,
// so the floats match bit for bit; it just also hands back the intermediates the
// picture needs, so the drawing and the number can never disagree.
function solve(dep, arr, dur, dir) {
  const gap = Math.abs(OFFSETS[arr] - OFFSETS[dep]);
  const mult = dir === "east" ? 1.5 : 1.0;
  const fatigue = dur * 0.1 * mult;
  const raw = gap + dur * 0.1 * mult;
  return { gap, mult, fatigue, raw, hours: Math.round(raw * 10) / 10 };
}

const CODE = `// The statement prints a table, so store a table: the seven offsets are DATA,
// and nothing below cares how many cities there are. Every key is quoted —
// three of them contain a space and cannot be bare identifiers.
const UTC_OFFSET: Record<string, number> = {
${OFFSET_LINES}
};

function getJetLagHours(
  departureCity: string,
  arrivalCity: string,
  flightDuration: number,
  direction: string,
): number {
  // Step 1 — the difference is a MAGNITUDE. Math.abs throws away which way the
  // clock moved, because "5 hours of shift" is 5 hours whether you gained them
  // or lost them. Which way you flew is carried by \`direction\`, below.
  const timezoneDifference = Math.abs(UTC_OFFSET[arrivalCity] - UTC_OFFSET[departureCity]);

  // Step 2 — direction is GIVEN, never inferred from the offsets. Los Angeles →
  // Hong Kong is an official case tagged "west" even though −8 → +8 goes up.
  // Anything that isn't exactly "east" takes the 1.0 branch.
  const directionMultiplier = direction === "east" ? 1.5 : 1.0;

  // Step 3 — precedence is the whole challenge. \`*\` binds tighter than \`+\`, so
  // the multiplier scales ONLY the flight term, not the timezone difference.
  // Bracket it as (difference + flight * 0.1) * multiplier and every test fails.
  const jetLagHours = timezoneDifference + flightDuration * 0.1 * directionMultiplier;

  // One decimal place — and scale-then-round, not toFixed. On ("Los Angeles",
  // "Tokyo", 11, "east") the sum is the double just below 18.65, so toFixed(1)
  // reads it as 18.6 while multiplying out first gives 186.5 exactly, and 18.7.
  return Math.round(jetLagHours * 10) / 10;
}`;

// ── CASES ────────────────────────────────────────────────────────────────────
// 1–7 are freeCodeCamp's seven official assertions, verbatim and in the grader's
//   own order, each with the value the grader demands. Between them they already
//   cover four eastbound/westbound splits, gaps of 1, 4, 5, 5, 5, 8 and 16, and
//   a crossing of the zero meridian (case 7).
// 8–11 are MINE, and each reaches a branch no official case touches:
//   8 + 9  the widest gap in the table (LA ↔ Tokyo, 17 h) on the SAME pair and
//          the SAME duration with only `direction` flipped — the module's payoff.
//          8 is additionally the ONLY input on this table where the final round
//          does real work: every official sum is already exact to one decimal,
//          while 8's is the double just below 18.65, where toFixed(1) and
//          Math.round(x * 10) / 10 disagree by a digit. See the header.
//   10     a ZERO gap. No two cities in the table share an offset, so the only
//          way to reach it is departure === arrival — a round-the-world flight
//          home. The answer is then the flight term alone, and non-zero.
//   11     a ZERO duration, where the multiplier has nothing to scale and the
//          direction toggle stops mattering at all. It is the boundary the
//          direction rule turns on: 1.5 × 0 and 1.0 × 0 are the same number.
const CASES = [
  ["Istanbul", "Hong Kong", 10, "east", 6.5, "official · eastbound, gap 5"],
  ["London", "New York", 8, "west", 5.8, "official · same gap as case 1, flown west"],
  ["Hong Kong", "Tokyo", 4, "east", 1.6, "official · the smallest non-zero gap"],
  ["Dubai", "London", 7, "west", 4.7, "official · odd duration, gap 4"],
  ["Los Angeles", "Hong Kong", 15, "west", 17.5, "official · gap 16, and −8 → +8 is tagged west"],
  ["Tokyo", "Dubai", 9, "west", 5.9, "official · westbound down the offsets"],
  ["New York", "Istanbul", 10, "east", 9.5, "official · crosses the zero meridian"],
  ["Los Angeles", "Tokyo", 11, "east", 18.7, "mine · widest gap, and the only round that does real work"],
  ["Los Angeles", "Tokyo", 11, "west", 18.1, "mine · case 8 with only the direction flipped"],
  ["Tokyo", "Tokyo", 12, "east", 1.8, "mine · zero gap — the flight term alone"],
  ["New York", "London", 0, "east", 5, "mine · zero duration — the multiplier is a no-op"],
];

// ── Bespoke styles (reserved prefix .jlg-) ───────────────────────────────────
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .jlg-strip { position:relative; height:112px; margin:18px 0 4px; }
    .jlg-track { position:absolute; left:38px; right:38px; top:0; bottom:0; }
    .jlg-axis { position:absolute; left:0; right:0; top:52px; height:2px; background:var(--border); }
    .jlg-tick { position:absolute; top:47px; width:1px; height:12px; background:var(--border); }
    .jlg-tlab { position:absolute; top:32px; font:10px var(--mono); color:var(--muted);
                transform:translateX(-50%); }
    .jlg-tlab.edge { color:var(--text); font-weight:700; }
    .jlg-span { position:absolute; top:16px; height:11px; border-radius:6px;
                background:color-mix(in srgb, var(--accent) 32%, transparent);
                border:1px solid var(--accent); }
    .jlg-span.zero { background:var(--warn); border-color:var(--warn); }
    .jlg-spanlab { position:absolute; top:-4px; transform:translateX(-50%);
                   font:700 12px var(--mono); color:var(--accent); white-space:nowrap; }
    .jlg-spanlab.zero { color:var(--warn); }
    .jlg-dot { position:absolute; top:46px; width:14px; height:14px; margin-left:-7px;
               border-radius:50%; background:var(--panel-2); border:2px solid var(--muted); }
    .jlg-dot.dep { border-color:var(--good); background:var(--good); }
    .jlg-dot.arr { border-color:var(--accent); background:var(--accent); }
    .jlg-dot.both { border-color:var(--warn); background:var(--warn); }
    .jlg-name { position:absolute; transform:translateX(-50%); white-space:nowrap;
                font:11px var(--sans); color:var(--muted); }
    .jlg-name.dep { color:var(--good); font-weight:700; }
    .jlg-name.arr { color:var(--accent); font-weight:700; }
    .jlg-name.both { color:var(--warn); font-weight:700; }
    .jlg-say { font:800 30px var(--mono); color:var(--accent); font-variant-numeric:tabular-nums;
               letter-spacing:-.01em; }
    .jlg-unit { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase;
                color:var(--muted); }
    .jlg-barwrap { position:relative; margin:6px 0 2px; }
    .jlg-bar { display:flex; height:28px; border-radius:8px; overflow:hidden;
               border:1px solid var(--border); background:var(--panel-2); }
    .jlg-seg { display:flex; align-items:center; justify-content:center; overflow:hidden;
               font:700 11px var(--mono); white-space:nowrap; }
    .jlg-seg.gap { background:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--text); }
    .jlg-seg.fat { background:color-mix(in srgb, var(--warn) 45%, transparent); color:var(--text); }
    .jlg-ghost { position:absolute; top:-5px; bottom:-5px; width:2px; background:var(--muted); }
    .jlg-glab { position:absolute; top:-22px; transform:translateX(-50%); white-space:nowrap;
                font:10px var(--mono); color:var(--muted); }
    .jlg-eq { font:12.5px var(--mono); color:var(--muted); margin:5px 0; }
    .jlg-eq b { color:var(--text); }
    .jlg-eq .win { color:var(--accent); font-weight:700; }
    .jlg-eq .cut { color:var(--danger); }
    .jlg-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
               color:var(--muted); margin:16px 0 4px; }
    .jlg-slider { flex:1; min-width:170px; accent-color:var(--accent); }
    .jlg-num { width:70px; }
  `));
}

// ── The demo ─────────────────────────────────────────────────────────────────
const pos = (off) => (off - MIN_OFF) / SPAN * 100;   // offset → % across the strip
const sgn = (n) => (n < 0 ? String(n).replace("-", "−") : "+" + n);
const num = (x) => String(Math.round(x * 100) / 100);

function stripHtml() {
  let ticks = "";
  for (let o = MIN_OFF; o <= MAX_OFF; o++) {
    const edge = o === MIN_OFF || o === MAX_OFF || o === 0;
    ticks += `<div class="jlg-tick" style="left:${pos(o)}%"></div>` +
      `<div class="jlg-tlab${edge ? " edge" : ""}" style="left:${pos(o)}%">${sgn(o)}</div>`;
  }
  // Names stagger between two rows so Istanbul/Dubai and Hong Kong/Tokyo — one
  // hour apart on a 17-hour axis — don't collide.
  const names = CITIES.map(([c, o], i) =>
    `<div class="jlg-name" data-city="${esc(c)}" style="left:${pos(o)}%; top:${i % 2 ? 86 : 68}px">${esc(c)}</div>`).join("");
  const dots = CITIES.map(([c, o]) =>
    `<div class="jlg-dot" data-city="${esc(c)}" style="left:${pos(o)}%"></div>`).join("");
  return `<div class="jlg-strip"><div class="jlg-track">
    <div class="jlg-spanlab"></div><div class="jlg-span"></div>
    <div class="jlg-axis"></div>${ticks}${dots}${names}
  </div></div>`;
}

function mount(host) {
  ensureStyle();
  // Opens on case 8 — the widest gap in the table, and the one input where the
  // rounding step visibly changes the answer. Flip the direction toggle here.
  const st = { dep: "Los Angeles", arr: "Tokyo", dur: 11, dir: "east" };

  const caseChips = el("div", "controls");
  caseChips.append(el("span", "ctl-label", "case"));
  const caseEls = CASES.map(([d, a, t, dir, want, why], k) => {
    const c = el("button", "chip", String(k + 1));
    c.title = `${d} → ${a}, ${t} h, ${dir} → ${want}  (${why})`;
    c.onclick = () => { st.dep = d; st.arr = a; st.dur = t; st.dir = dir; render(); };
    caseChips.append(c);
    return c;
  });

  const mkRow = (label, key) => {
    const row = el("div", "controls");
    row.append(el("span", "ctl-label", label));
    const els = {};
    CITIES.forEach(([c]) => {
      const b = el("button", "chip", c);
      b.onclick = () => { st[key] = c; render(); };
      els[c] = b; row.append(b);
    });
    return { row, els };
  };
  const from = mkRow("from", "dep"), to = mkRow("to", "arr");

  const dirRow = el("div", "controls");
  dirRow.append(el("span", "ctl-label", "direction"));
  const dirEls = {};
  [["east", "east × 1.5"], ["west", "west × 1.0"]].forEach(([k, txt]) => {
    const b = el("button", "chip", txt);
    b.onclick = () => { st.dir = k; render(); };
    dirEls[k] = b; dirRow.append(b);
  });

  const durRow = el("div", "controls");
  const durNum = el("input", "jlg-num"); durNum.type = "number"; durNum.min = 0; durNum.max = DUR_MAX;
  const durSl = el("input", "jlg-slider"); durSl.type = "range"; durSl.min = 0; durSl.max = DUR_MAX; durSl.step = 1;
  const setDur = (v) => { st.dur = Math.max(0, Math.min(DUR_MAX, Math.floor(v) || 0)); render(); };
  durNum.oninput = () => setDur(+durNum.value);
  durSl.oninput = () => setDur(+durSl.value);
  durRow.append(el("span", "ctl-label", "flightDuration ="), durNum, durSl, el("span", "ctl-label", "hours"));

  const stripBox = el("div"); stripBox.innerHTML = stripHtml();
  const panel = el("div");

  host.append(
    el("div", "note", "Pick a departure and an arrival: the bar above the axis is the <b>timezone gap</b>, measured straight off the offsets. Then drag the flight duration and flip <b>east / west</b> on the same pair — only the small amber segment moves. That is the whole spec: the multiplier never touches the gap."),
    caseChips, from.row, to.row, dirRow, durRow, stripBox, panel,
  );

  const spanEl = stripBox.querySelector(".jlg-span");
  const spanLab = stripBox.querySelector(".jlg-spanlab");
  const dotEls = [...stripBox.querySelectorAll(".jlg-dot")];
  const nameEls = [...stripBox.querySelectorAll(".jlg-name")];

  function render() {
    const r = solve(st.dep, st.arr, st.dur, st.dir);
    const other = solve(st.dep, st.arr, st.dur, st.dir === "east" ? "west" : "east");
    const oDep = OFFSETS[st.dep], oArr = OFFSETS[st.arr];

    caseEls.forEach((c, k) => {
      const [d, a, t, dir] = CASES[k];
      c.classList.toggle("on", d === st.dep && a === st.arr && t === st.dur && dir === st.dir);
    });
    CITIES.forEach(([c]) => {
      from.els[c].classList.toggle("on", c === st.dep);
      to.els[c].classList.toggle("on", c === st.arr);
    });
    Object.entries(dirEls).forEach(([k, b]) => b.classList.toggle("on", k === st.dir));
    if (+durNum.value !== st.dur) durNum.value = st.dur;
    durSl.value = st.dur;

    // The strip: the span is drawn between the two offsets, direction-blind,
    // because Math.abs has already thrown the sign away.
    const a = pos(oDep), b = pos(oArr);
    const zero = r.gap === 0;
    spanEl.className = "jlg-span" + (zero ? " zero" : "");
    spanEl.style.left = Math.min(a, b) + "%";
    spanEl.style.width = zero ? "3px" : Math.abs(b - a) + "%";
    spanLab.className = "jlg-spanlab" + (zero ? " zero" : "");
    spanLab.style.left = (a + b) / 2 + "%";
    spanLab.innerHTML = zero
      ? "same city — gap 0 h"
      : `|${sgn(oArr)} − ${sgn(oDep)}| = <b>${r.gap} h</b>`;

    const role = (c) => (c === st.dep && c === st.arr) ? "both" : c === st.dep ? "dep" : c === st.arr ? "arr" : "";
    dotEls.forEach((d) => { d.className = "jlg-dot " + role(d.dataset.city); });
    nameEls.forEach((n) => { n.className = "jlg-name " + role(n.dataset.city); });

    panel.innerHTML = "";
    panel.append(el("div", "result-line",
      `<span class="jlg-say">${r.hours}</span><span class="jlg-unit">jet lag hours</span>` +
      `<span class="tag mono">getJetLagHours("${esc(st.dep)}", "${esc(st.arr)}", ${st.dur}, "${st.dir}")</span>`));

    // Stacked bar: the answer, split into the two terms the formula adds. The
    // ghost line marks where the OTHER direction would land, so the size of the
    // asymmetry is visible without clicking.
    const wrap = el("div", "jlg-barwrap");
    const bar = el("div", "jlg-bar");
    const gapPct = r.gap / TOTAL_SCALE * 100, fatPct = r.fatigue / TOTAL_SCALE * 100;
    const gseg = el("div", "jlg-seg gap", r.gap >= 2 ? `gap ${r.gap}` : "");
    gseg.style.width = gapPct + "%";
    const fseg = el("div", "jlg-seg fat", r.fatigue >= 1.6 ? `+${num(r.fatigue)}` : "");
    fseg.style.width = fatPct + "%";
    bar.append(gseg, fseg);
    wrap.append(bar);
    if (other.hours !== r.hours) {
      const g = el("div", "jlg-ghost"); g.style.left = other.raw / TOTAL_SCALE * 100 + "%";
      const gl = el("div", "jlg-glab", `${st.dir === "east" ? "west" : "east"} → ${other.hours}`);
      gl.style.left = other.raw / TOTAL_SCALE * 100 + "%";
      wrap.append(g, gl);
    }
    panel.append(el("div", "jlg-lbl", "The answer, split into the two terms"), wrap);

    panel.append(el("div", "jlg-eq",
      `<b>1.</b> timezone difference = |${sgn(oArr)} − ${sgn(oDep)}| = <span class="win">${r.gap}</span> ` +
      `&nbsp;<span class="muted">— a magnitude; the sign of ${oArr - oDep} is discarded</span>`));
    panel.append(el("div", "jlg-eq",
      `<b>2.</b> direction "${st.dir}" → multiplier = <span class="win">${r.mult}</span> ` +
      `&nbsp;<span class="muted">— read off the argument, never off the offsets</span>`));
    panel.append(el("div", "jlg-eq",
      `<b>3.</b> ${r.gap} + ${st.dur} × 0.1 × ${r.mult} = ${r.gap} + <span class="win">${num(r.fatigue)}</span> = <b>${r.raw}</b>` +
      (String(r.raw) !== String(r.hours) ? ` → round to 1 dp → <span class="win">${r.hours}</span>` : "")));
    panel.append(el("div", "jlg-eq",
      `<span class="cut">bracket it as (${r.gap} + ${num(st.dur * 0.1)}) × ${r.mult} and you get ` +
      `${Math.round((r.gap + st.dur * 0.1) * r.mult * 10) / 10}</span> — the precedence is the challenge`));
    // Only shown when the two spellings of "round to 1 dp" actually disagree,
    // which on this table happens on exactly one input — case 8.
    if (+r.raw.toFixed(1) !== r.hours) panel.append(el("div", "jlg-eq",
      `and the rounding itself is not free: the sum is really <b>${r.raw.toFixed(15)}</b>, so ` +
      `<code class='inl'>toFixed(1)</code> says <span class="cut">${r.raw.toFixed(1)}</span> where ` +
      `<code class='inl'>Math.round(x × 10) / 10</code> says <span class="win">${r.hours}</span>`));
    panel.append(el("div", "jlg-eq",
      st.dur === 0
        ? `flying <b>0 hours</b>: 1.5 × 0 and 1.0 × 0 are both 0, so the direction toggle changes <b>nothing</b>. That is the boundary the rule turns on.`
        : `flip the direction and the answer moves by <b>${num(Math.abs(other.hours - r.hours))} h</b> — ` +
          `<b>${num(Math.abs(other.hours - r.hours) / (r.hours || 1) * 100)}%</b> of the total. ` +
          `The famous "eastward is worse" is the smallest term in this sum.`));

    panel.append(scoreboard());
  }

  render();
}

// Every case scored live against the module's own solve(), so a regression shows
// up as a red row rather than quietly rendering a wrong number.
function scoreboard() {
  const box = el("div");
  const rows = CASES.map(([d, a, t, dir, want, why]) => ({ d, a, t, dir, want, why, got: solve(d, a, t, dir).hours }));
  const pass = rows.filter((x) => x.got === x.want).length;
  box.append(el("div", "jlg-lbl", `Cases · ${pass} of ${rows.length} passing (1–7 freeCodeCamp, 8–11 mine)`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">call</span><span class="exp">expected</span><span class="got">got</span>`));
  rows.forEach((x, k) => {
    box.append(el("div", "srow" + (x.got === x.want ? "" : " bad"),
      `<span class="mark">${x.got === x.want ? "✓" : "✗"}</span>` +
      `<span class="k">${k + 1}. ${esc(x.d)} → ${esc(x.a)}, ${x.t} h, ${x.dir}</span>` +
      `<span class="exp">${x.want}</span><span class="got">${x.got}</span>`));
  });
  box.append(el("div", "note", "Every official case is also a numbered chip at the top of the demo, and the city chips × the 0–20 h slider × the direction toggle span the whole input space besides."));
  return box;
}

// ── STEP ─────────────────────────────────────────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">UTC_OFFSET</span> = {` },
  { ln: 2, html: `  <span class="tok" data-t="rows1"><span class="st">"Los Angeles"</span>: -8, <span class="st">"New York"</span>: -5, <span class="st">"London"</span>: 0, <span class="st">"Istanbul"</span>: 3</span>,` },
  { ln: 3, html: `  <span class="tok" data-t="rows2"><span class="st">"Dubai"</span>: 4, <span class="st">"Hong Kong"</span>: 8, <span class="st">"Tokyo"</span>: 9</span>,` },
  { ln: 4, html: `<span class="tok" data-t="seal">}</span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">getJetLagHours</span>(<span class="tok" data-t="param">departureCity, arrivalCity, flightDuration, direction</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> timezoneDifference = Math.<span class="fn">abs</span>(<span class="tok" data-t="sub">UTC_OFFSET[arrivalCity] - UTC_OFFSET[departureCity]</span>);` },
  { ln: 7, html: `  <span class="k">const</span> directionMultiplier = <span class="tok" data-t="dir">direction === <span class="st">"east"</span></span> ? 1.5 : 1.0;` },
  { ln: 8, html: `  <span class="k">const</span> jetLagHours = timezoneDifference + <span class="tok" data-t="prec">flightDuration * 0.1 * directionMultiplier</span>;` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="round">Math.<span class="fn">round</span>(jetLagHours * 10) / 10</span>;` },
  { ln: 10, html: `}` },
];

// Instrumented run → generic debugger steps. One frame, no recursion. Scope is
// expressed by OMISSION on BOTH panels: the UTC_OFFSET struct appears when line 1
// runs and then stays (it is a module constant, still in scope inside the call),
// while the four parameters only exist from line 5 and each `const` only from the
// line that declares it.
function trace(caseIdx) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIdx | 0) - 1));
  const [dep, arr, dur, dir, want, why] = CASES[idx];
  const r = solve(dep, arr, dur, dir);
  const rows = CITIES.map(([c, o]) => `${c} ${sgn(o)}`);
  const steps = [];
  let filled = 0, timezoneDifference, directionMultiplier, jetLagHours;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 5) {
      vars.departureCity = `"${dep}"`; vars.arrivalCity = `"${arr}"`;
      vars.flightDuration = dur; vars.direction = `"${dir}"`;
    }
    if (line >= 6 && timezoneDifference !== undefined) vars.timezoneDifference = timezoneDifference;
    if (line >= 7 && directionMultiplier !== undefined) vars.directionMultiplier = directionMultiplier;
    if (line >= 8 && jetLagHours !== undefined) vars.jetLagHours = jetLagHours;
    // Gated the same way as the vars, and never removed once shown — the table
    // is still in scope for the whole call, so it must not blink out of existence.
    const structs = [{ label: "UTC_OFFSET", items: rows.slice(0, filled), newest: !!x.tableNew }];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{
        title: line >= 5 ? `getJetLagHours("${dep}", "${arr}", ${dur}, "${dir}")` : "module scope",
        vars, changed: x.changed || [], structs, ret: x.ret,
      }],
    });
  };

  S(1, `Before any call, the statement's printed table becomes <b>one object</b>, built once at module load. That transcription is most of the challenge — seven <code class='inl'>if (city === …)</code> branches would encode the same seven facts, but you could only <i>read</i> them by tracing execution.`, { focus: "decl" });

  filled = 4;
  S(2, `Four rows land: <b>Los Angeles −8, New York −5, London 0, Istanbul +3</b>. Every key is <b>quoted</b> — not a style choice, since <code class='inl'>Los Angeles</code> has a space in it and cannot be a bare identifier. The values are plain signed integers, so the difference between any two cities is a subtraction and nothing more.`, { focus: "rows1", tableNew: true });

  filled = 7;
  S(3, `Three more: <b>Dubai +4, Hong Kong +8, Tokyo +9</b>. Notice what the table does <i>not</i> contain — no direction, no distance, no coordinates. The only geography in this problem is a number line from −8 to +9, and the widest gap on it is <b>17 hours</b>.`, { focus: "rows2", tableNew: true });

  S(4, `Table sealed at <b>7 entries</b>, all offsets distinct. That last detail matters below: because no two cities share an offset, a <b>zero</b> timezone difference can only happen when departure and arrival are the same city — which is case 10.`, { focus: "seal" });

  S(5, `Call <b>getJetLagHours("${esc(dep)}", "${esc(arr)}", ${dur}, "${dir}")</b> — ${esc(why)}. Four arguments arrive, and the fourth is the one to watch: <b>direction is data</b>, handed in, not something the function works out. Expected answer: <b>${want}</b>.`, { focus: "param", changed: ["departureCity", "arrivalCity", "flightDuration", "direction"] });

  const oDep = OFFSETS[dep], oArr = OFFSETS[arr], signed = oArr - oDep;
  timezoneDifference = Math.abs(signed);
  S(6, `Two lookups, one subtraction: <b>${sgn(oArr)} − ${sgn(oDep)} = ${signed}</b>, then <code class='inl'>Math.abs</code> makes it <b>${timezoneDifference}</b>. ` +
    (signed < 0
      ? `The raw difference is <b>negative</b> here — the arrival clock is behind the departure clock — and <code class='inl'>abs</code> throws that sign away. It has to: "${timezoneDifference} hours of shift" is ${timezoneDifference} hours whether you gained them or lost them.`
      : signed === 0
        ? `Same city, so the difference is <b>0</b> and <code class='inl'>abs</code> has nothing to do. The gap term vanishes entirely and everything below comes from the flight alone.`
        : `Positive here, so <code class='inl'>abs</code> changes nothing — but it is not optional. Fly the same route backwards and this subtraction goes negative; without <code class='inl'>abs</code> the answer would come out smaller than the flight term, or negative outright.`) +
    ` And note the sign is thrown away <i>before</i> direction is even looked at: which way you flew is carried by the argument, not by this subtraction.`,
    { focus: "sub", changed: ["timezoneDifference"], eval: { expr: `${sgn(oArr)} − ${sgn(oDep)} < 0`, val: signed < 0 } });

  directionMultiplier = dir === "east" ? 1.5 : 1.0;
  S(7, `The direction rule, and it is a two-way branch on a <b>string</b>, not on the offsets. <code class='inl'>"${dir}" === "east"</code> is <b>${dir === "east"}</b>, so the multiplier is <b>${directionMultiplier}</b>. ` +
    (dir === "east"
      ? `Eastward is the penalised one — the spec's nod to the real-world asymmetry. Watch how little it is worth on the next line.`
      : `Everything that is not exactly <code class='inl'>"east"</code> takes 1.0. Case 5 is the proof that this must not be inferred from the table: Los Angeles → Hong Kong runs −8 → +8, straight <i>up</i> the offsets, and the grader still calls it <b>"west"</b> — because that is the way the plane actually goes, across the Pacific.`),
    { focus: "dir", changed: ["directionMultiplier"], eval: { expr: `direction === "east"`, val: dir === "east" } });

  const flightTerm = dur * 0.1 * directionMultiplier;
  jetLagHours = r.raw;
  const wrong = Math.round((timezoneDifference + dur * 0.1) * directionMultiplier * 10) / 10;
  S(8, `<b>Precedence is the entire challenge.</b> <code class='inl'>*</code> binds tighter than <code class='inl'>+</code>, so the multiplier scales <b>only</b> the flight term: <b>${dur} × 0.1 × ${directionMultiplier} = ${num(flightTerm)}</b>, then <b>${timezoneDifference} + ${num(flightTerm)} = ${jetLagHours}</b>. ` +
    (wrong !== r.hours
      ? `Read the statement's brackets as <code class='inl'>(difference + flight × 0.1) × multiplier</code> and you would get <b>${wrong}</b> instead — wrong, and wrong on the official assertion for this very case.`
      : `On this input the two readings happen to agree, because the multiplier is 1.0 and scales nothing. Try case 1 to see them come apart.`) +
    ` The consequence is worth sitting with: the direction is worth at most <b>0.05 × flightDuration</b>, against a gap that reaches <b>17</b>. "Eastward is worse" is the <i>smallest</i> term in this sum.`,
    { focus: "prec", changed: ["jetLagHours"] });

  // Three genuinely different outcomes, and the narration must not claim the
  // wrong one: a real second decimal to round away, pure floating-point noise to
  // scrub, or a value that was already exact.
  const fixed = jetLagHours.toFixed(1);
  const kind = Math.abs(jetLagHours - r.hours) > 1e-9 ? "round"
    : String(jetLagHours) !== String(r.hours) ? "noise" : "exact";
  S(9, `<code class='inl'>Math.round(x * 10) / 10</code> is the one-decimal round: <b>${jetLagHours} × 10 = ${jetLagHours * 10}</b>, round to <b>${Math.round(jetLagHours * 10)}</b>, divide back to <b>${r.hours}</b>. ` +
    (kind === "round"
      ? `A real second decimal gets folded away here, and the spelling turns out to matter. The sum is not quite <b>${jetLagHours}</b> — it is the double <b>${jetLagHours.toFixed(15)}</b>, a hair <i>below</i> it. Scaling first lands on exactly <b>186.5</b>, which rounds up to <b>${r.hours}</b>; <code class='inl'>jetLagHours.toFixed(1)</code> looks at the value underneath and answers <b>"${fixed}"</b> instead. Two readings of "round to one decimal place", one digit apart. No official case can tell them apart, because every official sum is already exact — this one is mine.`
      : kind === "noise"
        ? `Nothing here needed rounding in the mathematical sense — <b>${timezoneDifference} + ${num(flightTerm)}</b> is <b>${r.hours}</b> on paper. But <code class='inl'>0.1</code> has no exact binary representation, so the arithmetic produced <b>${jetLagHours}</b>, and returning that raw would fail <code class='inl'>assert.equal</code> against ${r.hours} outright. The rounding is scrubbing floating-point noise, not digits.`
        : `The value was already exact to one decimal place, so this is a no-op on <i>this</i> input — which is exactly why it is easy to leave out and still see green. Step to case 10 for the input where it repairs floating-point noise, and case 8 for the one where it does real rounding work.`) +
    ` The condition below asks whether the <i>other</i> spelling of "round to one decimal place" lands on the same number — ${r.hours === Number(fixed)
      ? `here it does, which is why the choice looks like a formality`
      : `and here it does <b>not</b>: <b>${r.hours}</b> against <b>${fixed}</b>`}. Return <b>${r.hours}</b>.`,
    // NOT `val: true`. The old spelling asserted the definition of the line above
    // it and so could never be red; this one is the module's own case-8 thesis and
    // is red on exactly that case.
    { focus: "round", eval: { expr: `Math.round(x * 10) / 10 === +x.toFixed(1)`, val: r.hours === Number(fixed) },
      done: true, result: String(r.hours), ret: { value: r.hours } });

  return steps;
}

// A legend, because a bare case index tells the reader nothing.
function caseLegend() {
  const box = el("div");
  box.append(el("div", "jlg-lbl", `Cases · 1–${CASES.length}  (1–7 freeCodeCamp, 8–11 mine)`));
  CASES.forEach(([d, a, t, dir, want, why], k) => {
    box.append(el("div", "srow",
      `<span class="mark">${k + 1}</span>` +
      `<span class="k">${esc(d)} → ${esc(a)}, ${t} h, ${dir}</span>` +
      `<span class="exp">→ ${want}</span><span class="got">${esc(why)}</span>`));
  });
  return box;
}

// max is bound to the array, so adding a case can never orphan it.
const STEP_INPUT = {
  label: "case =", value: 8, min: 1, max: CASES.length,
  presets: CASES.map((_, k) => k + 1), hint: `1–${CASES.length}`,
};

export default {
  n: 302, id: "jetlag", title: "Jet Lagged", dates: ["2026-06-08"],
  statement: `Given a departure city, an arrival city, a flight duration in hours and a direction of travel, return the traveller's jet lag hours. The cities come from this UTC-offset table: <code class="inl">"Los Angeles"</code> −8, <code class="inl">"New York"</code> −5, <code class="inl">"London"</code> 0, <code class="inl">"Istanbul"</code> +3, <code class="inl">"Dubai"</code> +4, <code class="inl">"Hong Kong"</code> +8, <code class="inl">"Tokyo"</code> +9. Then: <b>(1)</b> find the timezone difference in hours between the two cities; <b>(2)</b> the direction multiplier is <b>1.5</b> when travelling <code class="inl">"east"</code> and <b>1.0</b> otherwise; <b>(3)</b> jet lag hours = <code class="inl">timezone difference + (flight duration * 0.1) * direction multiplier</code>, rounded to one decimal place. <span class="rule">Example: <code class="inl">getJetLagHours("Istanbul", "Hong Kong", 10, "east")</code> → <b>6.5</b>, because the gap is 5 and <code class="inl">10 × 0.1 × 1.5</code> is 1.5 — the multiplier scales the <i>flight</i> term, not the gap.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 2 lookups, 1 branch",
      approach: `The statement prints a table and then writes the formula out for you, so the work is transcription — and the three places transcription can go wrong are the whole problem. <b>The difference is a magnitude.</b> <code class='inl'>Math.abs</code> discards the sign, because five hours of shift is five hours whichever way the clock moved. <b>Direction is given, not derived.</b> It is a fourth argument and is never checked against the offsets — official case 5 flies Los Angeles → Hong Kong, −8 up to +8, and is tagged <code class='inl'>"west"</code>, because that is the way the plane goes. <b>And precedence is the trap.</b> <code class='inl'>difference + (flight * 0.1) * multiplier</code> scales only the second term; bracket it as <code class='inl'>(difference + flight * 0.1) * multiplier</code> and <b>3 of the 7</b> official assertions fail — cases 1, 3 and 7, the only <i>eastbound</i> ones. The other four carry a multiplier of 1.0, so the re-bracketing is a no-op on them and they pass either way; a suite made of only those four would have let the bug straight through. The practical consequence is counter-intuitive: eastward travel adds at most <code class='inl'>0.05 × duration</code>, so on a ten-hour flight the famous asymmetry is worth half an hour against a gap that can be seventeen. Open on <b>case 8</b> and flip the direction toggle — 18.7 against 18.1, and only the small amber segment of the bar moves. Case 8 is also the one input on this table where the final round stops being a formality: the sum is the double a hair <i>below</i> 18.65, so <code class='inl'>toFixed(1)</code> answers 18.6 while <code class='inl'>Math.round(x * 10) / 10</code> answers 18.7. No official assertion separates those two — every official sum is already exact to one place — so that case is mine, not the challenge's.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "the precedence line",
      approach: `Run it one line at a time. It starts <b>before</b> the function, watching the offset table fill row by row, because turning the printed table into data is where the real decision was made. Then one call: two lookups and a subtraction whose <b>sign is thrown away</b>, a branch on the string <code class='inl'>"east"</code> that never consults the table, and then line 8 — where the narration prints both readings of the formula side by side so you can see the bracketed one give a different, failing answer. Watch <code class='inl'>timezoneDifference</code>, <code class='inl'>directionMultiplier</code> and <code class='inl'>jetLagHours</code> each appear only once their own line has run, while <b>UTC_OFFSET</b> stays for the whole call. Case <b>8</b> opens it — widest gap, and the one input where the final rounding visibly earns its keep. Case <b>9</b> is the same flight flown the other way, <b>10</b> has a zero gap and <b>11</b> a zero duration. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => { ensureStyle(); host.append(caseLegend()); mountDebugger(host, { source: SRC, trace, input: STEP_INPUT }); },
    },
  ],
};
