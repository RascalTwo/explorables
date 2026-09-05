// #361 · Spoken Time — both hands round DOWN: a hand names the mark it has already passed.
//
// ONE approach, so one `Solution` + one `Step through`. There is no wasteful act
// to name here — the whole problem is two divisions, two mod-12 wraps and a
// six-rung if-ladder in the right order — and CONTRIBUTING Tier 3 says a
// one-approach module is the normal, correct outcome, not a shortfall.
//
// Three things the grader pins down that the prose does not:
//
//   1. ROUNDING IS Math.floor ON BOTH HANDS — established by running all four
//      combinations against the 7 official assertions before writing a line:
//        floor/floor  7/7   ·  floor minutes + round hours  3/7
//        round/round  3/7   ·  round minutes + floor hours  5/7
//      Math.round breaks the HOUR on (255, 180): 255/30 = 8.5 rounds to 9, but
//      the answer is "half past 8" — an hour hand halfway to 9 still means 8.
//      It breaks the MINUTE on (322.5, 273): 273/6 = 45.5 rounds to 46, which
//      loses "quarter to" outright. Both hands sweep forward from the mark they
//      last passed, so truncation is the physics, not a shortcut.
//
//   2. THE HOURS ARE DIGITS, NOT WORDS. Every assertion reads "3 o'clock",
//      "half past 8", "quarter to 11". So there is no hour-name table to keep in
//      sync — the code block below is literal, standalone and elides nothing.
//
//   3. THE 12 ↔ 0 WRAP IS ARITHMETIC, not a bolted-on special case. `hour || 12`
//      speaks hour 0 as 12; `(hour + 1) % 12 || 12` makes the hour after 11 come
//      out twelve rather than zero. Same trick at both ends of the wheel — the
//      clock is #336's 12-position wheel with the hands attached.
//
// The demo is a clock you DRAG. The minute hand is GEARED to the hour hand
// (1/12 of its sweep), so at "half past 8" you can watch the hour hand park
// itself between 8 and 9 — the picture of why floor is right. Drag the hour hand
// on its own to break the gearing and reach any (hourAngle, minuteAngle) pair,
// including the official ones where the two hands disagree by a fraction. The
// highlighted arc is the span the sentence is describing, and it visibly flips
// sides — anchored at 12 for "past", anchored at the hand for "to" — the moment
// the minute hand crosses 30.
import { el, esc, mountDebugger } from "../shared.js";

// The six bands in the exact order the if-ladder must test them. The demo's
// ladder renders this array, so the lit rung IS the branch that ran.
const BANDS = [
  ["minutes === 0", "Y o'clock"],
  ["minutes === 15", "quarter past Y"],
  ["minutes === 30", "half past Y"],
  ["minutes === 45", "quarter to Z"],
  ["minutes < 30", "X minutes past Y"],
  ["otherwise", "(60 − X) minutes to Z"],
];

// CASES — the nine this module runs on, as (hourAngle°, minuteAngle°).
//   1–7 are freeCodeCamp's official assertions, verbatim and in the grader's
//     order. They already land on six different bands: o'clock (1), an ordinary
//     "past" (2), half past (3), quarter past (4), an ordinary "to" (5, and 7
//     again at the small end), quarter to (6). Four carry the non-integer angles
//     the statement warns about — 67.5°, 322.5° and 117.5° on the hour hand, and
//     minute angles of 92°, 273° and 335° that are not multiples of 6. Case 6 is
//     the sharpest: 273 / 6 = 45.5, exactly where Math.round loses "quarter to".
//   8–9 are MINE, because no official case touches the 12 ↔ 0 wrap — one for
//     each end of it. 8 forces hour 0 to speak as "12" (the `hour || 12` half);
//     9 asks for the hour after 11 and must answer 12, not 0 (the
//     `(hour + 1) % 12 || 12` half). Nothing else in the set exercises either.
const CASES = [
  [90, 0, "3 o'clock"],
  [160, 120, "20 minutes past 5"],
  [255, 180, "half past 8"],
  [67.5, 92, "quarter past 2"],
  [200, 240, "20 minutes to 7"],
  [322.5, 273, "quarter to 11"],
  [117.5, 335, "5 minutes to 4"],
  [0, 0, "12 o'clock"],
  [355, 300, "10 minutes to 12"],
];

// ── The solution ─────────────────────────────────────────────────────────────
// Identical logic to the TypeScript block below; it just also hands back the
// intermediates the clock needs to draw, so the picture and the sentence can
// never disagree about which branch ran.
function solve(hourAngle, minuteAngle) {
  const minutes = Math.floor(minuteAngle / 6);
  const hour = Math.floor(hourAngle / 30) % 12;
  const Y = hour || 12;
  const Z = (hour + 1) % 12 || 12;
  const band = minutes === 0 ? 0 : minutes === 15 ? 1 : minutes === 30 ? 2
    : minutes === 45 ? 3 : minutes < 30 ? 4 : 5;
  const text = [
    `${Y} o'clock`, `quarter past ${Y}`, `half past ${Y}`,
    `quarter to ${Z}`, `${minutes} minutes past ${Y}`, `${60 - minutes} minutes to ${Z}`,
  ][band];
  return { minutes, hour, Y, Z, band, text, to: band === 3 || band === 5 };
}

// The `code` block, kept as one constant so the demo, the debugger and the
// snippet are read from the same place. It is standalone: no data table, no
// borrowed constant, nothing elided.
const CODE = `// Both hands round DOWN. A hand points at the mark it has already passed:
// at half past 8 the hour hand sits between 8 and 9, and the time is still 8.
// Math.round says 9 there, and says 46 minutes for a hand at 273° (= 45.5).
function getSpokenTime(hourAngle: number, minuteAngle: number): string {
  const minutes = Math.floor(minuteAngle / 6);   // 360° = 60 minutes → 6° each
  const hour = Math.floor(hourAngle / 30) % 12;  // 360° = 12 hours → 30° each; 0..11

  const Y = hour || 12;            // the hour just passed; hour 0 is spoken "12"
  const Z = (hour + 1) % 12 || 12; // the NEXT hour; after 11 comes 12, not 0

  // Order matters. The three exact values must be caught before the ranges, or
  // \`minutes < 30\` swallows 15 and the final line swallows 45.
  if (minutes === 0) return \`\${Y} o'clock\`;
  if (minutes === 15) return \`quarter past \${Y}\`;
  if (minutes === 30) return \`half past \${Y}\`;
  if (minutes === 45) return \`quarter to \${Z}\`;
  if (minutes < 30) return \`\${minutes} minutes past \${Y}\`;
  return \`\${60 - minutes} minutes to \${Z}\`;
}
`;

// ── Bespoke styles (reserved prefix .sk-) ────────────────────────────────────
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sk-wrap { display:grid; grid-template-columns:320px minmax(0,1fr); gap:20px; align-items:start; }
    @media (max-width:760px) { .sk-wrap { grid-template-columns:1fr; } }
    .sk-clock { width:320px; height:320px; display:block; touch-action:none; user-select:none; }
    .sk-face { fill:var(--panel-2); stroke:var(--border); stroke-width:1.5; }
    .sk-tick { stroke:var(--border); stroke-width:1; }
    .sk-tick.big { stroke:var(--muted); stroke-width:2; }
    .sk-num { font:700 14px var(--sans); fill:var(--muted); text-anchor:middle; pointer-events:none; }
    .sk-num.on { fill:var(--accent); font-size:18px; font-weight:800; }
    .sk-arc { fill:none; stroke-width:8; stroke-linecap:round; opacity:.9; }
    .sk-arc.past { stroke:var(--good); }
    .sk-arc.to { stroke:var(--warn); }
    .sk-hand .hit { stroke:transparent; stroke-width:28; pointer-events:stroke; cursor:grab; }
    .sk-hand .bar { stroke-linecap:round; pointer-events:none; }
    .sk-hand .knob { pointer-events:all; cursor:grab; stroke:var(--bg); stroke-width:1.5; }
    .sk-hand.hour .bar { stroke:var(--text); stroke-width:7.5; }
    .sk-hand.hour .knob { fill:var(--text); }
    .sk-hand.min .bar { stroke:var(--accent); stroke-width:4.5; }
    .sk-hand.min .knob { fill:var(--accent); }
    .sk-hand:hover .knob { stroke:var(--accent); stroke-width:2.5; }
    .sk-hand.drag .hit, .sk-hand.drag .knob { cursor:grabbing; }
    .sk-pin { fill:var(--bg); stroke:var(--text); stroke-width:2.5; }
    .sk-say { font:800 26px var(--sans); letter-spacing:-.02em; color:var(--text); margin:2px 0 2px; }
    .sk-pivot { display:inline-flex; border:1px solid var(--border); border-radius:999px;
                overflow:hidden; font:700 10.5px var(--sans); letter-spacing:.08em; text-transform:uppercase; }
    .sk-pivot span { padding:4px 12px; color:var(--muted); }
    .sk-pivot span.on.past { background:var(--good); color:var(--bg); }
    .sk-pivot span.on.to { background:var(--warn); color:var(--bg); }
    .sk-eq { font:12.5px var(--mono); color:var(--muted); margin:5px 0; }
    .sk-eq b { color:var(--text); }
    .sk-eq .win { color:var(--accent); font-weight:700; }
    .sk-eq .cut { color:var(--danger); }
    .sk-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
              color:var(--muted); margin:14px 0 4px; }
    .sk-ang { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
    .sk-ang input { width:88px; }
  `));
}

// ── Clock geometry ───────────────────────────────────────────────────────────
// Angles are degrees clockwise from 12, exactly as the problem states them.
const CX = 150, CY = 150, R_FACE = 134, R_ARC = 121, R_NUM = 100, L_MIN = 96, L_HOUR = 62;
const pt = (deg, r) => {
  const a = deg * Math.PI / 180;
  return { x: +(CX + r * Math.sin(a)).toFixed(2), y: +(CY - r * Math.cos(a)).toFixed(2) };
};
// Arc hugging the dial from a1 clockwise to a2. Empty when the span vanishes.
const arcPath = (a1, a2) => {
  const span = a2 - a1;
  if (span < 0.5) return "";
  const A = pt(a1, R_ARC), B = pt(a2, R_ARC);
  return `M ${A.x} ${A.y} A ${R_ARC} ${R_ARC} 0 ${span > 180 ? 1 : 0} 1 ${B.x} ${B.y}`;
};

const hand = (cls, key, len) => `<g class="sk-hand ${cls}" data-hand="${key}" transform="rotate(0 ${CX} ${CY})">
  <line class="hit" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - len}"/>
  <line class="bar" x1="${CX}" y1="${CY + 13}" x2="${CX}" y2="${CY - len + 3}"/>
  <circle class="knob" cx="${CX}" cy="${CY - len}" r="9"/>
</g>`;

function clockSvg() {
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const a = pt(i * 6, big ? 113 : 119), b = pt(i * 6, 127);
    ticks += `<line class="sk-tick${big ? " big" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
  }
  let nums = "";
  for (let h = 1; h <= 12; h++) {
    const p = pt(h * 30, R_NUM);
    nums += `<text class="sk-num" data-h="${h}" x="${p.x}" y="${p.y + 5}">${h}</text>`;
  }
  return `<svg class="sk-clock" viewBox="0 0 300 300" role="img"
    aria-label="Analog clock — drag the hour or minute hand to change the time">
    <circle class="sk-face" cx="${CX}" cy="${CY}" r="${R_FACE}"/>
    ${ticks}<path class="sk-arc past" d=""/>${nums}
    ${hand("hour", "h", L_HOUR)}${hand("min", "m", L_MIN)}
    <circle class="sk-pin" cx="${CX}" cy="${CY}" r="5"/>
  </svg>`;
}

// ── The demo ─────────────────────────────────────────────────────────────────
const f = (x) => String(Math.round(x * 1000) / 1000);
const wrap360 = (x) => ((x % 360) + 360) % 360;

function mountClock(host) {
  ensureStyle();
  // Opens on the official (255, 180): "half past 8", the case where Math.round
  // on the hour hand would say 9 — the hour hand is visibly parked past the 8.
  const st = { ha: 255, ma: 180 };

  const chips = el("div", "controls");
  CASES.forEach(([ha, ma, want], k) => {
    const c = el("button", "chip", `${f(ha)}°, ${f(ma)}°`);
    c.title = `case ${k + 1} → "${want}"`;
    c.onclick = () => { st.ha = ha; st.ma = ma; render(); };
    chips.append(c);
  });

  const haIn = el("input"), maIn = el("input");
  [haIn, maIn].forEach((i) => { i.type = "number"; i.step = "0.5"; i.min = "0"; i.max = "360"; });
  const angs = el("div", "controls sk-ang");
  angs.append(el("span", "ctl-label", "hourAngle ="), haIn,
              el("span", "ctl-label", "minuteAngle ="), maIn,
              el("span", "ctl-label", "· or drag a hand"));
  const commit = () => {
    st.ha = wrap360(+haIn.value || 0); st.ma = wrap360(+maIn.value || 0); render();
  };
  [haIn, maIn].forEach((i) => { i.onchange = commit; i.onkeydown = (e) => { if (e.key === "Enter") commit(); }; });

  const wrapEl = el("div", "sk-wrap");
  const left = el("div"), panel = el("div");
  left.innerHTML = clockSvg();
  wrapEl.append(left, panel);
  host.append(chips, angs, wrapEl);

  const svg = left.querySelector(".sk-clock");
  const arc = svg.querySelector(".sk-arc");
  const nums = [...svg.querySelectorAll(".sk-num")];
  const hands = { h: svg.querySelector('[data-hand="h"]'), m: svg.querySelector('[data-hand="m"]') };

  // Pointer angle in the SVG's own coordinate space, degrees clockwise from 12.
  const angleAt = (e) => {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 300 - CX;
    const y = (e.clientY - r.top) / r.height * 300 - CY;
    return wrap360(Math.atan2(x, -y) * 180 / Math.PI);
  };

  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("[data-hand]");
    if (!g) return;
    drag = g.dataset.hand; g.classList.add("drag");
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const a = angleAt(e);
    if (drag === "m") {
      // Geared like a real clock: the hour hand advances 1/12 of the minute
      // hand's sweep, so dragging round an hour walks it one numeral on. The
      // signed shortest delta keeps that true across the 12 o'clock seam.
      const d = ((a - st.ma + 540) % 360) - 180;
      st.ma = a; st.ha = wrap360(st.ha + d / 12);
    } else {
      st.ha = a; // hour hand alone — breaks the gearing, reaching any pair
    }
    render();
  });
  const release = () => { if (drag) hands[drag].classList.remove("drag"); drag = null; };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  function render() {
    const r = solve(st.ha, st.ma);
    const arcEnd = r.minutes * 6; // the mark the hand has PASSED, not where it points

    hands.h.setAttribute("transform", `rotate(${st.ha} ${CX} ${CY})`);
    hands.m.setAttribute("transform", `rotate(${st.ma} ${CX} ${CY})`);
    arc.setAttribute("class", "sk-arc " + (r.to ? "to" : "past"));
    arc.setAttribute("d", r.to ? arcPath(arcEnd, 360) : arcPath(0, arcEnd));
    nums.forEach((n) => n.classList.toggle("on", +n.dataset.h === (r.to ? r.Z : r.Y)));
    if (document.activeElement !== haIn) haIn.value = f(st.ha);
    if (document.activeElement !== maIn) maIn.value = f(st.ma);

    const rawM = st.ma / 6, rawH = st.ha / 30;
    const roundH = Math.round(rawH) % 12, roundM = Math.round(rawM);

    panel.innerHTML = "";
    panel.append(el("div", "sk-say", `“${esc(r.text)}”`));
    panel.append(el("div", "result-line",
      `<span class="sk-pivot"><span class="past${r.to ? "" : " on"}">counting past</span>` +
      `<span class="to${r.to ? " on" : ""}">counting to</span></span>` +
      `<span class="tag mono">${r.to ? "arc anchored at the hand → 12" : "arc anchored at 12 → the hand"}</span>`));

    panel.append(el("div", "sk-lbl", "Angle → number"));
    panel.append(el("div", "sk-eq",
      `minuteAngle <b>${f(st.ma)}°</b> ÷ 6 = <b>${f(rawM)}</b> → floor → minutes = <span class="win">${r.minutes}</span>` +
      (roundM !== r.minutes ? ` &nbsp;<span class="cut">(round says ${roundM})</span>` : "")));
    panel.append(el("div", "sk-eq",
      `hourAngle <b>${f(st.ha)}°</b> ÷ 30 = <b>${f(rawH)}</b> → floor → % 12 → hour = <span class="win">${r.hour}</span>` +
      (roundH !== r.hour ? ` &nbsp;<span class="cut">(round says ${roundH})</span>` : "")));
    panel.append(el("div", "sk-eq",
      `Y = hour || 12 = <b>${r.Y}</b> &nbsp;·&nbsp; Z = (hour + 1) % 12 || 12 = <b>${r.Z}</b>` +
      (r.hour === 0 || r.hour === 11 ? ` &nbsp;<span class="win">← the 12 ↔ 0 wrap</span>` : "")));
    if (arcEnd !== st.ma) panel.append(el("div", "sk-eq",
      `the arc stops <b>${f(st.ma - arcEnd)}°</b> short of the minute hand — that sliver is what <code class='inl'>floor</code> discarded`));

    panel.append(el("div", "sk-lbl", "Which band spoke"));
    const lad = el("div", "ladder");
    BANDS.forEach(([test, say], b) => {
      const rung = el("div", "rung" + (b === r.band ? " on" : ""));
      rung.innerHTML = `<span>${esc(test)}</span>${b === r.band ? `<span>◀ ${esc(say)}</span>` : `<span class="v">${esc(say)}</span>`}`;
      lad.append(rung);
    });
    panel.append(lad);
    panel.append(scoreboard());
    panel.append(el("div", "note", "Drag the <b>minute</b> hand and the hour hand follows at a twelfth of the sweep, like real gearing — that is why the hour rounds down: by half past, the hour hand has already left the numeral it names. Drag the <b>hour</b> hand alone to break the gearing and reach the official pairs where the two hands disagree by a fraction of a degree."));
  }

  render();
}

// Every case, scored live against the module's own solve() — so a regression in
// the demo shows up as a red row instead of quietly rendering a wrong sentence.
function scoreboard() {
  const box = el("div");
  const rows = CASES.map(([ha, ma, want]) => ({ ha, ma, want, got: solve(ha, ma).text }));
  const pass = rows.filter((x) => x.got === x.want).length;
  box.append(el("div", "sk-lbl", `Cases · ${pass} of ${rows.length} passing (1–7 official, 8–9 the 12 ↔ 0 wrap)`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">hourAngle, minuteAngle</span><span class="exp">expected</span><span class="got">got</span>`));
  rows.forEach((x, k) => {
    box.append(el("div", "srow" + (x.got === x.want ? "" : " bad"),
      `<span class="mark">${x.got === x.want ? "✓" : "✗"}</span>` +
      `<span class="k">${k + 1}. ${f(x.ha)}°, ${f(x.ma)}°</span>` +
      `<span class="exp">${esc(x.want)}</span>` +
      `<span class="got">${esc(x.got)}</span>`));
  });
  return box;
}

// ── STEP ─────────────────────────────────────────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getSpokenTime</span>(<span class="tok" data-t="param">hourAngle, minuteAngle</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="min">minutes = Math.<span class="fn">floor</span>(minuteAngle / 6)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="hr">hour = Math.<span class="fn">floor</span>(hourAngle / 30) % 12</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="y">Y = hour || 12</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="z">Z = (hour + 1) % 12 || 12</span>;` },
  { ln: 6, html: `  <span class="k">if</span> (<span class="tok" data-t="g0">minutes === 0</span>) <span class="k">return</span> <span class="st">\`\${Y} o'clock\`</span>;` },
  { ln: 7, html: `  <span class="k">if</span> (<span class="tok" data-t="g15">minutes === 15</span>) <span class="k">return</span> <span class="st">\`quarter past \${Y}\`</span>;` },
  { ln: 8, html: `  <span class="k">if</span> (<span class="tok" data-t="g30">minutes === 30</span>) <span class="k">return</span> <span class="st">\`half past \${Y}\`</span>;` },
  { ln: 9, html: `  <span class="k">if</span> (<span class="tok" data-t="g45">minutes === 45</span>) <span class="k">return</span> <span class="st">\`quarter to \${Z}\`</span>;` },
  { ln: 10, html: `  <span class="k">if</span> (<span class="tok" data-t="glt">minutes &lt; 30</span>) <span class="k">return</span> <span class="st">\`\${minutes} minutes past \${Y}\`</span>;` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="gto"><span class="st">\`\${60 - minutes} minutes to \${Z}\`</span></span>;` },
  { ln: 12, html: `}` },
];

function traceSpoken(caseIdx) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIdx | 0) - 1));
  const [ha, ma, want] = CASES[idx];
  const r = solve(ha, ma);
  const steps = [];
  const tried = [];               // grows only once the ladder starts — see gating below
  let minutes, hour, Y, Z;

  const S = (line, note, x = {}) => {
    const vars = {};
    // Scope by omission: each name appears exactly when its `const` line has run.
    if (line >= 2) vars.minutes = minutes;
    if (line >= 3) vars.hour = hour;
    if (line >= 4) vars.Y = Y;
    if (line >= 5) vars.Z = Z;
    const structs = [];
    // The ladder log only exists from line 6 on, and then stays for the rest of
    // the call — it is the running record of which guards have been asked.
    if (line >= 6) structs.push({ label: "guards asked", items: tried.slice(), newest: true });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getSpokenTime(${f(ha)}, ${f(ma)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Two angles arrive, both measured <b>clockwise from 12</b>. Nothing about them is a time yet — the whole job is turning each angle into a number, then choosing a sentence. Expected here: <b>"${esc(want)}"</b>.`, { focus: "param" });

  const rawM = ma / 6;
  minutes = Math.floor(rawM);
  S(2, `A full turn of the minute hand is 60 minutes, so one minute is <b>6°</b>: <b>${f(ma)} / 6 = ${f(rawM)}</b>. ` +
    (Number.isInteger(rawM)
      ? `It lands exactly on a mark, so any rounding would agree — but the cases where it doesn't are the ones that decide the answer.`
      : `It does <b>not</b> land on a mark. Take <code class='inl'>floor</code>, not <code class='inl'>round</code>: a hand at ${f(ma)}° has <i>swept past</i> minute <b>${minutes}</b> and not yet reached ${minutes + 1}. Rounding here would say <b>${Math.round(rawM)}</b>` +
        (Math.round(rawM) !== minutes ? ` — and on this input that is a different sentence.` : ` — the same number, this time.`)),
    { focus: "min", changed: ["minutes"] });

  const rawH = ha / 30;
  hour = Math.floor(rawH) % 12;
  S(3, `Twelve hours to a turn, so an hour is <b>30°</b>: <b>${f(ha)} / 30 = ${f(rawH)}</b>. Floor again, for the same physical reason — the hour hand creeps forward all hour, so it is <i>past</i> ${hour} rather than near ${(hour + 1) % 12}. This is where <code class='inl'>Math.round</code> is most tempting and most wrong: at half past, the hand is exactly halfway to the next numeral and round would name it. The <code class='inl'>% 12</code> is what folds a full 360° back to <b>0</b>.`, { focus: "hr", changed: ["hour"] });

  Y = hour || 12;
  S(4, `<code class='inl'>hour</code> is an <i>index</i> on a 12-position wheel — 0 to 11 — but nobody says "0 o'clock". ` +
    (hour === 0
      ? `That is exactly this case: index <b>0</b> has to speak as <b>12</b>, and <code class='inl'>|| 12</code> is the whole fix.`
      : `Here the index and the spoken hour happen to coincide at <b>${Y}</b>; the <code class='inl'>|| 12</code> only earns its keep when the index is 0.`),
    { focus: "y", changed: ["Y"] });

  Z = (hour + 1) % 12 || 12;
  S(5, `"Quarter to" and "X minutes to" name the hour <b>ahead</b>. Stepping the wheel is <code class='inl'>+ 1</code>, and <code class='inl'>% 12</code> keeps it on the wheel — then the same <code class='inl'>|| 12</code> turns index 0 back into a spoken twelve. ` +
    (hour === 11
      ? `This case is the wrap: <b>11 + 1 = 12</b>, <code class='inl'>% 12</code> makes it <b>0</b>, and <code class='inl'>|| 12</code> makes it speak as <b>12</b>. A bare <code class='inl'>hour + 1</code> would have been right by luck here and wrong at 11 on the o'clock branch.`
      : `Nothing wraps here — <b>${hour} + 1 = ${Z}</b> — but the same two operators handle 11 → 12 without a special case.`),
    { focus: "z", changed: ["Z"] });

  // The if-ladder, asked in source order. Each miss is logged so the reader can
  // see that the exact values are tested BEFORE the ranges that would swallow them.
  const guards = [
    [6, "g0", minutes === 0, `minutes === 0`, "=0",
      `<b>minutes === 0</b> — the o'clock branch. It goes first because it is the only value that names no offset at all.`],
    [7, "g15", minutes === 15, `minutes === 15`, "=15",
      `<b>minutes === 15</b>. This has to be tested before <code class='inl'>minutes &lt; 30</code>, which 15 also satisfies — put the range first and "quarter past" never speaks.`],
    [8, "g30", minutes === 30, `minutes === 30`, "=30",
      `<b>minutes === 30</b> — the pivot. Everything at or below here counts <i>past</i> the hour just gone; everything above counts <i>to</i> the hour ahead. Half past is the last word that still looks backwards.`],
    [9, "g45", minutes === 45, `minutes === 45`, "=45",
      `<b>minutes === 45</b>. Same trap as 15, mirrored: 45 also matches the final catch-all, so it must be asked first or "quarter to" degrades into "15 minutes to".`],
    // struct items are escaped by mountDebugger, so this one carries a raw "<"
    [10, "glt", minutes < 30, `minutes < 30`, "<30",
      `<b>minutes &lt; 30</b> — the ordinary "past" range, 1–29. Safe to write as a bare inequality only because 0 and 15 were already claimed above.`],
  ];

  for (const [line, focus, hit, expr, chip, why] of guards) {
    tried.push(`${chip} ${hit ? "✓" : "✗"}`);
    S(line, `${why} Here <code class='inl'>minutes = ${minutes}</code>, so it is <b>${hit}</b>. ` +
      (hit ? `The sentence is settled: <b>"${esc(r.text)}"</b>.` : `Fall through and ask the next one.`),
      { focus, eval: { expr: `${expr}  (minutes = ${minutes})`, val: hit },
        ...(hit ? { done: true, result: r.text, ret: { value: r.text } } : {}) });
    if (hit) return steps;
  }

  tried.push("else ✓");
  S(11, `Nothing matched, so <code class='inl'>minutes</code> is in <b>31–59</b> and isn't 45. This branch counts <b>backwards</b>: the spoken number is <code class='inl'>60 − ${minutes} = ${60 - minutes}</code>, and the hour it attaches to is <b>Z = ${Z}</b>, not Y. That single flip — from Y to Z, and from ${minutes} to ${60 - minutes} — is the whole "past vs to" pivot, and it is why the hour wrap had to be arithmetic.`,
    { focus: "gto", done: true, result: r.text, ret: { value: r.text } });
  return steps;
}

// A legend, because a bare case index tells the reader nothing. Rendered above
// the debugger's own controls so the chips below it mean something.
function caseLegend() {
  const box = el("div");
  box.append(el("div", "sk-lbl", `Cases · 1–${CASES.length}  (1–7 freeCodeCamp, 8–9 the 12 ↔ 0 wrap)`));
  CASES.forEach(([ha, ma, want], k) => {
    box.append(el("div", "srow",
      `<span class="mark">${k + 1}</span><span class="k">${f(ha)}°, ${f(ma)}°</span>` +
      `<span class="exp">→</span><span class="got">${esc(want)}</span>`));
  });
  return box;
}

// max is bound to the array, so adding a case can never orphan it.
const STEP_INPUT = { label: "case =", value: 3, min: 1, max: CASES.length, presets: CASES.map((_, k) => k + 1), hint: "1–" + CASES.length };

export default {
  n: 361, id: "spokentime", title: "Spoken Time", dates: ["2026-08-06"],
  statement: `Given the angles of an analog clock's <b>hour</b> and <b>minute</b> hands in degrees clockwise from 12, return the time in spoken English. A full turn is 60 minutes and 12 hours, so a minute is <b>6°</b> and an hour is <b>30°</b>. Then read the minutes off this table: <code class="inl">0 → "Y o'clock"</code>, <code class="inl">15 → "quarter past Y"</code>, <code class="inl">30 → "half past Y"</code>, <code class="inl">45 → "quarter to Z"</code>, <code class="inl">1–29 except 15 → "X minutes past Y"</code>, <code class="inl">31–59 except 45 → "X minutes to Z"</code> where <code class="inl">X = 60 − minutes</code>. <b>Y</b> is the current hour, <b>Z</b> the next. <span class="rule">The hands may not land exactly on a mark — "consider rounding them somehow". Example: <code class="inl">getSpokenTime(255, 180)</code> → <b>"half past 8"</b>, because 255 / 30 = <b>8.5</b> and an hour hand halfway to 9 still means 8.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 2 divisions, 6 guards",
      approach: `Two divisions turn the angles into numbers, then a six-rung ladder turns the numbers into a sentence. Everything interesting is in the details. <b>Both hands floor</b>, never round: a hand points at the mark it has already <i>passed</i>, which is why 255° reads as hour 8 even though it is halfway to 9. <b>The wrap is arithmetic</b>: <code class='inl'>hour || 12</code> speaks index 0 as twelve, and <code class='inl'>(hour + 1) % 12 || 12</code> makes the hour after 11 come out twelve rather than zero. <b>The ladder's order is load-bearing</b> — 15 also satisfies <code class='inl'>minutes &lt; 30</code> and 45 also reaches the final line, so the exact values must be asked first. Drag the <b>minute</b> hand: the hour hand is geared to it and drifts off the numeral, which is the floor rule made visible. Drag the <b>hour</b> hand alone to break the gearing. The coloured arc is the span being described, and it jumps from the 12-anchored side to the hand-anchored side the moment the minute hand crosses 30.`,
      code: CODE,
      mount: mountClock,
    },
    {
      name: "Step through", cost: "the past/to pivot",
      approach: `Run it one line at a time. The first five lines are the arithmetic — watch <code class='inl'>minutes</code> and <code class='inl'>hour</code> get <i>truncated</i>, and the narration name the rounding that would have been wrong. The rest is the ladder, and the <b>guards asked</b> panel logs every question in source order so you can see why the exact values have to be tested before the ranges that would swallow them. Case <b>3</b> opens it — the one <code class='inl'>Math.round</code> gets wrong on the hour hand. Case <b>6</b> is the one it gets wrong on the minute hand, case <b>8</b> is the hour-0 wrap and case <b>9</b> is the hour-11 wrap. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => { ensureStyle(); host.append(caseLegend()); mountDebugger(host, { source: SRC, trace: traceSpoken, input: STEP_INPUT }); },
    },
  ],
};
