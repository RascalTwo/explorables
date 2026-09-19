// #315 · Summer Solstice — "round to the nearest even number" is a grid, not a rounding mode.
// One approach: a closed-form latitude → hours, one snap onto the 2-grid, one
// symmetric string build. There is no second approach — the alternative to
// `Math.round(raw / 2) * 2` is rounding to the nearest integer and nudging odd
// results, which isn't slower, it's wrong (66.5° rounds to 21, and nudging up
// gives 22 against the grader's 20). Per CONTRIBUTING Tier 3 that means ship one.
//
// Two traps, and the demo puts both on screen:
//   • The rounding. `Math.round(raw)` lands on odd hours, and an odd hour can't
//     split symmetrically around noon. Rescale, round, rescale back.
//   • The alphabet. "☀️" is U+2600 + U+FE0F — TWO code points — while "🌑" is one.
//     Both are 2 UTF-16 units, so the answer is 24 hours, 48 code units, and
//     somewhere between 24 and 48 code points. Never a "24-character string".
import { el, mountDebugger } from "../shared.js";

// Measured, not assumed: `node -e 'console.log("☀️".length, [..."☀️"].length)'`
// prints `2 2`, and the same for "🌑" prints `2 1`. Written as literals so the
// variation selector survives — normalising or stripping it fails all 7 tests.
const SUN = "☀️";
const NIGHT = "🌑";

const rawHours = (lat) => 12 + (lat / 90) * 12;      // real hours, unquantised
const evenHours = (raw) => Math.round(raw / 2) * 2;  // snap onto the 2-grid
const solstice = (lat) => {
  const day = evenHours(rawHours(lat));
  const night = (24 - day) / 2;
  return NIGHT.repeat(night) + SUN.repeat(day) + NIGHT.repeat(night);
};

// The even numbers the answer can possibly be — 13 rungs, and the whole problem
// is choosing one of them. Shown as a struct in the debugger and as an axis in
// the demo, because "nearest even" is only obvious once you see the ladder.
const GRID = Array.from({ length: 13 }, (_, i) => i * 2);

const fmt = (x) => String(Number(x.toFixed(4)));           // 17.3333, not 17.333333…
const pad = (h) => String(h).padStart(2, "0") + ":00";

// Cases 1–7 are freeCodeCamp's seven official tests, in the grader's own order.
// Case 8 is ours. Each lands on a different daytime count — 12, 24, 0, 8, 20,
// 18, 6, 14 — so no two exercise the same branch:
//   1  the equator, the statement's own worked example: raw is exactly 12.
//   2  the north pole: 24 h of sun, so both NIGHT.repeat calls get 0.
//   3  the south pole: the mirror — 0 h of sun, and SUN.repeat(0) is "".
//   4  southern hemisphere: a negative latitude drives raw BELOW 12.
//   5  the Arctic Circle: raw = 20.8667 snaps DOWN to 20, even though
//      Math.round(raw) would say 21 — the case that kills the "round then fix
//      the parity" instinct, since nudging 21 upward returns the wrong answer.
//   6  raw = 17.3333 snaps UP to 18, on a fraction of only .33 — because the
//      grid is 2 wide, .33 of an hour is .17 of a step. Same reason, opposite way.
//   7  a second southern case, and the only one whose day block is shorter than
//      either half of its night.
//   8  OURS, the one shape the official set never probes: raw = exactly 13,
//      dead centre between 12 and 14. Math.round breaks ties toward +∞, so it
//      returns 14. No official assertion pins this down — see the note in the
//      demo — which is precisely why it deserves a chip.
const CASES = [
  { lat: 0,     why: "the equator, and the statement's own worked example" },
  { lat: 90,    why: "the north pole — the sun never sets" },
  { lat: -90,   why: "the south pole — the mirror image, and the sun never rises" },
  { lat: -33,   why: "southern hemisphere, so the raw hours land below 12" },
  { lat: 66.5,  why: "the Arctic Circle, where rounding to the nearest INTEGER would give an odd 21" },
  { lat: 40,    why: "a fraction of only .33 that still rounds the daylight UP" },
  { lat: -50,   why: "the shortest daylight of any official case" },
  { lat: 7.5,   why: "ours: raw is exactly 13, the dead-centre tie between 12 and 14" },
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sol-wrap { max-width:780px; }
    .sol-sl { flex:1; min-width:170px; max-width:330px; accent-color:var(--accent); }
    .sol-lat { font:800 15px var(--mono); color:var(--accent); min-width:74px; }
    .sol-top { display:grid; grid-template-columns:132px minmax(0,1fr); gap:16px; align-items:center; margin:14px 0 4px; }
    @media (max-width:560px){ .sol-top { grid-template-columns:minmax(0,1fr); } }
    .sol-globe svg { display:block; }
    .sol-calc { font:12.5px/1.9 var(--mono); color:var(--muted); }
    .sol-calc b { color:var(--text); }
    .sol-calc .hot { color:var(--accent); font-weight:800; }
    .sol-calc .no { color:var(--danger); font-weight:700; }
    .sol-axis { position:relative; height:44px; margin:12px 2px 2px; }
    .sol-track { position:absolute; top:21px; left:0; right:0; height:2px; background:var(--border); }
    .sol-tick { position:absolute; top:14px; transform:translateX(-50%); text-align:center; }
    .sol-tick i { display:block; width:1px; height:9px; margin:0 auto; background:var(--border); }
    .sol-tick span { font:600 9.5px var(--mono); color:var(--muted); }
    .sol-tick.win i { width:3px; height:15px; margin-top:-3px; background:var(--accent); }
    .sol-tick.win span { color:var(--accent); font-weight:800; }
    .sol-raw { position:absolute; top:0; transform:translateX(-50%); text-align:center; color:var(--warn); }
    .sol-raw span { font:800 9.5px var(--mono); white-space:nowrap; }
    .sol-raw i { display:block; width:1px; height:13px; margin:1px auto 0; background:var(--warn); }
    .sol-bar { display:flex; gap:2px; margin:16px 0 0; flex-wrap:nowrap; }
    .sol-cell { flex:1 1 0; min-width:0; text-align:center; padding:5px 0 4px; border-radius:6px;
                border:1px solid var(--border); background:var(--panel-2); }
    .sol-cell.day { border-color:color-mix(in srgb,var(--warn) 55%,var(--border)); background:color-mix(in srgb,var(--warn) 12%,transparent); }
    .sol-cell.noon { box-shadow:inset 2px 0 0 var(--accent); }
    .sol-cell .g { font-size:14px; line-height:1.3; }
    .sol-cell .h { font:600 8.5px var(--mono); color:var(--muted); }
    .sol-out { font-size:17px; line-height:1.5; word-break:break-all; }
  `));
}

// ── Solution demo — the slider IS the module. Drag pole to pole and the bar
// fills and empties; the readout keeps the raw hours and the snapped even value
// side by side so the quantising step is never invisible.
function mount(host) {
  ensureStyle();
  let lat = CASES[0].lat;   // bound to the case array, so the demo opens where the grader does

  const ctl = el("div", "controls");
  const sl = el("input", "sol-sl"); sl.type = "range"; sl.min = "-90"; sl.max = "90"; sl.step = "0.5";
  const latOut = el("span", "sol-lat");
  sl.oninput = () => { lat = +sl.value; render(); };
  ctl.append(el("span", "ctl-label", "latitude ="), sl, latOut);

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", `${c.lat}°`);
    b.onclick = () => { lat = c.lat; render(); };
    chips.append(b);
  });

  const globe = el("div", "sol-globe");
  const calc = el("div", "sol-calc");
  const top = el("div", "sol-top"); top.append(globe, calc);
  const axis = el("div", "sol-axis");
  const bar = el("div", "sol-bar");
  const out = el("div", "result-line");
  const note = el("div", "note");

  const wrap = el("div", "sol-wrap");
  wrap.append(ctl, chips, top, axis, bar, out, note);
  host.append(wrap);
  render();

  function render() {
    sl.value = String(lat);
    latOut.innerHTML = `${lat > 0 ? "+" : ""}${lat}°`;
    const raw = rawHours(lat), day = evenHours(raw), night = (24 - day) / 2;
    const str = solstice(lat);
    const lower = Math.floor(raw / 2) * 2, upper = lower + 2;
    const naive = Math.round(raw);

    // A globe seen from the side: the equator, the two polar circles, and a dot
    // riding the rim at the chosen latitude. y = -sin(lat), x = cos(lat).
    const R = 52, C = 62;
    const yOf = (d) => C - R * Math.sin((d * Math.PI) / 180);
    const xOf = (d) => R * Math.cos((d * Math.PI) / 180);
    const chord = (d, col, w) => `<line x1="${C - xOf(d)}" y1="${yOf(d)}" x2="${C + xOf(d)}" y2="${yOf(d)}" stroke="${col}" stroke-width="${w}" ${w === 1 ? 'stroke-dasharray="3 3"' : ""}/>`;
    globe.innerHTML =
      `<svg viewBox="0 0 124 124" width="124" height="124" aria-hidden="true">` +
      `<circle cx="${C}" cy="${C}" r="${R}" fill="var(--panel-2)" stroke="var(--border)"/>` +
      // above the Arctic Circle the sun never sets on this date; below the
      // Antarctic Circle it never rises. Tinting the caps says why the two
      // extreme presets return a solid string.
      `<path d="M ${C - xOf(66.5)} ${yOf(66.5)} A ${R} ${R} 0 0 1 ${C + xOf(66.5)} ${yOf(66.5)} Z" fill="color-mix(in srgb,var(--warn) 26%,transparent)"/>` +
      `<path d="M ${C - xOf(-66.5)} ${yOf(-66.5)} A ${R} ${R} 0 0 0 ${C + xOf(-66.5)} ${yOf(-66.5)} Z" fill="color-mix(in srgb,var(--text) 12%,transparent)"/>` +
      chord(66.5, "var(--border)", 1) + chord(-66.5, "var(--border)", 1) +
      chord(0, "var(--muted)", 1) +
      chord(lat, "var(--accent)", 2) +
      `<circle cx="${C + xOf(lat)}" cy="${yOf(lat)}" r="4.5" fill="var(--accent)"/>` +
      `</svg>`;

    calc.innerHTML =
      `raw = 12 + (<b>${lat}</b> / 90) × 12 = <b>${fmt(raw)}</b> h<br>` +
      `raw / 2 = <b>${fmt(raw / 2)}</b> → Math.round → <b>${Math.round(raw / 2)}</b> → × 2 = <span class="hot">${day}</span> h of daylight<br>` +
      (naive % 2 === 0
        ? `Math.round(raw) = <b>${naive}</b>, already even — this latitude can't tell the two rules apart`
        : `Math.round(raw) = <span class="no">${naive}</span>, <span class="no">odd</span> — rounding to the nearest <i>integer</i> lands off the grid`) +
      `<br>night = (24 − ${day}) / 2 = <b>${night}</b> h before dawn and <b>${night}</b> after dusk`;

    // The grid itself, with the unquantised value floating above it. This is the
    // one picture the problem needs: raw is continuous, the answer is a rung.
    const pct = (v) => `${(v / 24) * 100}%`;
    axis.innerHTML =
      `<div class="sol-track"></div>` +
      GRID.map((v) => `<div class="sol-tick${v === day ? " win" : ""}" style="left:${pct(v)}"><i></i><span>${v}</span></div>`).join("") +
      `<div class="sol-raw" style="left:${pct(raw)}"><span>raw ${fmt(raw)}</span><i></i></div>`;

    bar.innerHTML = "";
    for (let h = 0; h < 24; h++) {
      const isDay = h >= night && h < night + day;
      bar.append(el("div", `sol-cell${isDay ? " day" : ""}${h === 12 ? " noon" : ""}`,
        `<div class="g">${isDay ? SUN : NIGHT}</div><div class="h">${h}</div>`));
    }

    out.innerHTML =
      `<span class="sol-out">${str}</span>` +
      `<span class="tag">24 hours</span>` +
      `<span class="tag">[...s].length = ${[...str].length} code points</span>` +
      `<span class="tag">s.length = ${str.length} code units</span>` +
      `<span class="tag">${day === 24 ? "midnight sun" : day === 0 ? "polar night" : `sunrise ${pad(night)} · sunset ${pad(night + day)}`}</span>`;

    // raw % 2 === 1 is the tie: an ODD number of raw hours is a full hour from
    // the even step on either side. (These land exactly — 7.5° gives 13.0, not
    // 12.999…, so the test is safe to write as an equality on the remainder.)
    note.innerHTML = raw % 2 === 1
      ? `<b>Exactly halfway.</b> raw = ${fmt(raw)} sits the same distance from ${lower} and ${upper}, so "nearest even" doesn't name a winner. <code class='inl'>Math.round</code> breaks ties toward <b>+∞</b> and returns ${day}. No official assertion covers a tie, so this is a choice, not a rule — it is worth knowing you made it.`
      : raw % 2 === 0
        ? `raw is <b>already even</b>, so the snap does nothing and every rounding rule agrees. These are the latitudes on which a wrong implementation looks fine — the poles and the equator are all in this set.`
        : `raw = ${fmt(raw)} sits <b>${fmt(raw - lower)} h</b> above ${lower} and <b>${fmt(upper - raw)} h</b> below ${upper}, so it snaps to <b>${day}</b>. Watch the amber marker cross the midpoint between two ticks as you drag: the bar jumps <b>two</b> hours at once, because the reachable answers are only ever even.`;
  }
}

// Interpolated from nothing — this is the whole solution, and it runs as-is.
// The emoji are literals for a reason: escaping "☀️" as ☀ alone drops the
// variation selector and every assertion fails on a string that LOOKS identical.
const CODE = `// "Round to the nearest even number" is a GRID, not a rounding mode: divide by
// the step, round, multiply back. Math.round(raw) alone lands on odd hours.
const SUN = "${SUN}";    // U+2600 U+FE0F — 2 code points, 2 UTF-16 code units
const NIGHT = "${NIGHT}";  // U+1F311        — 1 code point,  2 UTF-16 code units

function getDaytimeHours(latitude: number): string {
  const raw = 12 + (latitude / 90) * 12;  // 0h at the south pole, 24h at the north
  const day = Math.round(raw / 2) * 2;    // nearest even == nearest multiple of 2
  const night = (24 - day) / 2;           // whole only because \`day\` is even —
                                          // sunrise and sunset sit symmetrically
                                          // around noon, so the halves must match
  // 24 HOURS, not 24 characters: "${SUN}" is two code points, so the returned
  // string is 48 code units wide however the sun and the dark divide it up.
  return NIGHT.repeat(night) + SUN.repeat(day) + NIGHT.repeat(night);
}`;

// ── STEP — the four lines that matter, with the even grid and the finished
// strip both visible in the state panel.
const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="glyphs">SUN = <span class="st">"${SUN}"</span>, NIGHT = <span class="st">"${NIGHT}"</span></span>;` },
  { ln: 2, html: `<span class="k">function</span> <span class="fn">getDaytimeHours</span>(<span class="tok" data-t="param">latitude</span>) {` },
  { ln: 3, html: `  <span class="k">const</span> raw = 12 + (<span class="tok" data-t="ratio">latitude / 90</span>) <span class="tok" data-t="scale">* 12</span>;` },
  { ln: 4, html: `  <span class="k">const</span> day = <span class="fn">Math.round</span>(<span class="tok" data-t="half">raw / 2</span>) <span class="tok" data-t="grid">* 2</span>;` },
  { ln: 5, html: `  <span class="k">const</span> night = <span class="tok" data-t="split">(24 - day) / 2</span>;` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="lead">NIGHT.<span class="fn">repeat</span>(night)</span> + <span class="tok" data-t="sun">SUN.<span class="fn">repeat</span>(day)</span> + <span class="tok" data-t="tail">NIGHT.<span class="fn">repeat</span>(night)</span>;` },
  { ln: 7, html: `}` },
];

// The two module constants, live for the whole call — so they show as a struct
// from the first step rather than appearing and vanishing.
const GLYPH_ITEMS = [`${SUN} = U+2600 U+FE0F`, `${NIGHT} = U+1F311`];

// Instrumented run → debugger steps. One frame (no recursion). Scope is gated on
// the LINE, and on a liveness flag where a line has more than one step: line 3
// runs twice and `raw` only exists after the second, so `rawLive` keeps the panel
// from claiming a binding that hasn't happened yet. Same for day (line 4). The
// even-grid struct appears with `day` and stays; the hours strip appears at the
// return and stays, because both are still in scope for the rest of the call.
function trace(input) {
  const idx = Math.min(CASES.length, Math.max(1, Math.floor(input))) - 1;
  const c = CASES[idx], lat = c.lat;
  const raw = rawHours(lat), day = evenHours(raw), night = (24 - day) / 2;
  const half = raw / 2, rounded = Math.round(half), naive = Math.round(raw);
  const lower = Math.floor(half) * 2, upper = lower + 2;
  const str = solstice(lat);

  const steps = [];
  const hours = [];
  let rawLive = false, dayLive = false, nightLive = false;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.latitude = lat;
    if (line >= 3 && rawLive) vars.raw = fmt(raw);
    if (line >= 4 && dayLive) vars.day = day;
    if (line >= 5 && nightLive) vars.night = night;
    const structs = [{ label: "glyphs", items: GLYPH_ITEMS }];
    if (line >= 4 && dayLive) structs.push({ label: "even grid", items: GRID.map((v) => (v === day ? `▸${v}` : String(v))) });
    if (line >= 6) structs.push({ label: "hours", items: hours.slice(), newest: !!x.grew });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 2 ? `getDaytimeHours(${lat})` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Nothing has been called yet — but the alphabet the answer is spelled in is already the first trap, because its two letters are <b>not the same shape</b>. <b>${NIGHT}</b> is one code point (<code class='inl'>U+1F311</code>) stored as a surrogate pair. <b>${SUN}</b> is <b>two</b>: <code class='inl'>U+2600</code>, the black-and-white dingbat, followed by <code class='inl'>U+FE0F</code>, the variation selector that asks for the colour emoji. Strip that selector and you get a string that <i>looks</i> identical and fails every assertion. Both letters cost 2 UTF-16 units, so the finished answer is always <b>48</b> units — the statement's "24-character string" means 24 <b>hours</b>, and taking it literally is how people end up padding to the wrong length.`, { focus: "glyphs" });

  S(2, `Call <b>getDaytimeHours(${lat})</b> — ${c.why}. Latitude is the <i>only</i> argument: no date, no clock, no timezone. On the solstice the geometry is already pinned, so everything below is arithmetic on one number, and the answer is a pure function of it.`, { focus: "param", changed: ["latitude"] });

  S(3, `<b>${lat} / 90 = ${fmt(lat / 90)}</b> — how far this latitude is from the equator, as a <b>signed</b> fraction of the way to a pole. One division is what lets a single formula cover both hemispheres: south of the equator it comes out negative, and every step after this just carries the sign along. No <code class='inl'>if</code> for the southern case, ever.`, { focus: "ratio" });

  rawLive = true;
  S(3, `× 12 turns that fraction into hours ${lat < 0 ? "<b>taken from</b>" : "<b>added to</b>"} the equator's 12, giving <b>raw = ${fmt(raw)}</b> hours of daylight. This is still a <b>real</b> number — the strip has 24 whole slots and nothing finer, so something has to quantise it. The next line is where most solutions go wrong.`, { focus: "scale", changed: ["raw"] });

  S(4, `"Nearest <b>even</b> number" is a <b>grid</b>, not a rounding mode — so rescale until the grid <i>is</i> the integers. <b>raw / 2 = ${fmt(half)}</b>, and <code class='inl'>Math.round</code> takes that to <b>${rounded}</b>, which now means "which even step", not "how many hours". Compare it with the condition panel: the instinct is to round to the nearest integer and fix the parity afterwards, and ${naive % 2 === 0
    ? `on <b>this</b> latitude that instinct happens to agree — <code class='inl'>Math.round(${fmt(raw)})</code> is already even. That is exactly why the bug survives testing; the equator and both poles all sit in this set.`
    : `here it lands on <b>${naive}</b>, an <b>odd</b> number of hours. Now which way do you nudge? Up gives ${naive + 1}, down gives ${naive - 1}, and only one of them is ${day}. There is no local rule that tells you which — the information you need was thrown away by the first rounding.`}`,
    { focus: "half", eval: { expr: `Math.round(${fmt(raw)}) = ${naive} is even`, val: naive % 2 === 0 } });

  dayLive = true;
  S(4, `Multiply back: <b>${rounded} × 2 = ${day}</b> daytime hours, and the "even grid" struct shows where that landed among the only 13 answers this function can ever return. ${raw % 2 === 1
    ? `This is the <b>tie</b>: ${fmt(raw)} is a full hour from both ${lower} and ${upper}, so "nearest" names no winner. <code class='inl'>Math.round</code> breaks ties toward <b>+∞</b> — so it picks ${day}. No official assertion probes a tie, which makes this a <b>choice</b> rather than a rule; the value of knowing that is being able to change it deliberately if a spec ever pins it down.`
    : raw % 2 === 0
      ? `raw was <b>already on the grid</b>, so the snap did nothing and every rounding rule you could have written agrees here. Both poles and the equator all sit in this set — which is exactly why an implementation that rounds the wrong way still passes them.`
      : `${fmt(raw)} sits <b>${fmt(raw - lower)} h</b> above ${lower} and <b>${fmt(upper - raw)} h</b> below ${upper}, so it snaps ${raw - lower < 1 ? "back down to" : "up to"} <b>${day}</b>. Notice where the decision point moved: on a grid 2 wide it is a <b>whole hour</b> from each rung, not half an hour, so a remainder of ${fmt(raw - lower)} h rounds ${raw - lower < 1 ? "down" : "up"} where integer rounding would have said ${naive}.`} One snap, no branch, no parity fix-up.`,
    { focus: "grid", changed: ["day"] });

  nightLive = true;
  S(5, `${24 - day === 0 ? "<b>No</b> hours are left over" : `<b>${24 - day}</b> hours are left over`}, and "sunrise and sunset fall symmetrically around noon" says they split evenly: <b>${night}</b> before dawn and <b>${night}</b> after dusk. That division comes out whole <i>only</i> because <code class='inl'>day</code> came back <b>even</b> — 24 minus an even number is even, and half of an even number is an integer. The parity the statement asked for was never cosmetic; it is what keeps both halves of the night on whole hours, and an odd <code class='inl'>day</code> here would hand <code class='inl'>repeat</code> a fraction.`, { focus: "split", changed: ["night"], eval: { expr: `(24 - ${day}) % 2 === 0`, val: (24 - day) % 2 === 0 } });

  for (let i = 0; i < night; i++) hours.push(NIGHT);
  S(6, `<code class='inl'>NIGHT.repeat(${night})</code> lays down midnight through to sunrise. ${night === 0
    ? `Here that is <code class='inl'>repeat(0)</code> → the <b>empty string</b>, so the midnight-sun case needs no special branch: the same expression that builds a normal day builds this one too.`
    : `Hour 0 to hour ${night - 1} are dark, so sunrise is at <b>${pad(night)}</b>.`} <code class='inl'>repeat</code> copies a whole <b>string</b>, not a character — which is the only reason the variation selector travels with each sun.`, { focus: "lead", grew: night > 0 });

  for (let i = 0; i < day; i++) hours.push(SUN);
  S(6, `<code class='inl'>SUN.repeat(${day})</code> fills the daylight block. ${day === 0
    ? `<code class='inl'>repeat(0)</code> again — polar night falls out of the same expression, with nothing to special-case.`
    : `It is automatically <b>centred</b>: with ${night} dark hours on each side, the middle of this block sits exactly at noon, which is what the statement meant by symmetric. Nobody computed a sunrise time; it fell out of the split on line 5.`}`, { focus: "sun", grew: day > 0 });

  for (let i = 0; i < night; i++) hours.push(NIGHT);
  S(6, `<code class='inl'>NIGHT.repeat(${night})</code> closes the day back out to midnight. ${day === 24
    ? `Nothing to append — the sun never sets at this latitude today.`
    : `Sunset at <b>${pad(night + day)}</b>, and the strip is now ${hours.length} hours long. Note that the three pieces were <b>concatenated</b>, never indexed: at no point does this function ask a string for its <code class='inl'>.length</code> or for the character at a position, so there is nothing here for UTF-16 to break. Building the answer out of whole emoji is what makes the encoding a non-issue.`}`, { focus: "tail", grew: night > 0 });

  S(6, `<b>Return</b> the finished day: <b>${day}</b> sunlit hours out of 24 at ${lat}°. Three different numbers describe this one string — <b>24</b> hours, <b>${[...str].length}</b> code points, <b>${str.length}</b> code units — and only the first was ever the answer. Any check written against <code class='inl'>.length</code> would have been testing storage, not daylight.`,
    { focus: "tail", done: true, result: str, ret: { value: `${day}${SUN} / ${24 - day}${NIGHT}` } });

  return steps;
}

export default {
  n: 315, id: "solstice", title: "Summer Solstice", dates: ["2026-06-21"],
  statement: `It's the summer solstice — the longest day of the year in the Northern Hemisphere and the shortest in the Southern. Given a <b>latitude</b> between <code class="inl">-90</code> (south pole) and <code class="inl">90</code> (north pole) inclusive, return a 24-hour string using <code class="inl">"${SUN}"</code> for a daylight hour and <code class="inl">"${NIGHT}"</code> for a dark one, one per hour starting at midnight. Daytime hours = <code class="inl">12 + (latitude / 90) * 12</code>, <b>rounded to the nearest even number</b>, with sunrise and sunset falling symmetrically around noon.
    <span class="rule">Example: the equator gets 12 hours of daylight, so sunrise is 6:00 AM and sunset 6:00 PM — <code class="inl">getDaytimeHours(0)</code> → <b>${solstice(0)}</b>.</span>`,
  // One approach. "Round to the nearest even number" has exactly one correct
  // spelling once you see it as a grid, and the alternative (round to the
  // nearest integer, then adjust odd results) is not a slower route to the same
  // answer — it is wrong on 66.5°. Tier 3 says that means one variant, so the
  // wrong route lives inside the demo and the debugger as a live comparison
  // rather than as a tab of its own.
  variants: [
    {
      name: "Solution", cost: "O(1) — one formula, one snap",
      approach: `Three lines, and the middle one is the whole challenge. The formula is handed to you, so <code class='inl'>raw = 12 + (latitude / 90) * 12</code> is transcription — a signed fraction of the way to a pole, scaled to hours, which is why the southern hemisphere needs no branch. Then <b>"round to the nearest even number"</b>: that is a <b>grid</b>, not a rounding mode, and the way to round onto a grid is to rescale it to the integers, round, and rescale back — <code class='inl'>Math.round(raw / 2) * 2</code>. Reach instead for <code class='inl'>Math.round(raw)</code> and you land on odd hours (66.5° gives <b>21</b>), and no local rule tells you which way to nudge. The evenness then pays for the last line: <code class='inl'>(24 - day) / 2</code> is a whole number of hours <i>because</i> <code class='inl'>day</code> is even, so the night splits cleanly either side of noon and the strip is three <code class='inl'>repeat</code> calls with no special cases at the poles — <code class='inl'>repeat(0)</code> is <code class='inl'>""</code>. Last trap: build it out of the <b>emoji</b>. <code class='inl'>"${SUN}"</code> is <code class='inl'>U+2600</code> plus a variation selector, so the returned value is 24 hours and 48 code units, and it is never a "24-character string". Drag the slider from pole to pole and watch the amber marker cross a midpoint: the bar jumps <b>two</b> hours at a time, because only 13 answers exist.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "the 2-grid snap",
      approach: `A debugger for the same eight latitudes. It starts <b>above</b> the function, on the two constants, because the sizes of <code class='inl'>${SUN}</code> and <code class='inl'>${NIGHT}</code> decide what "24 characters" can possibly mean. Once <code class='inl'>day</code> exists, the state panel carries the <b>even grid</b> — all 13 answers this function can return, with the winner marked — so the snap is a move between rungs rather than an arithmetic result you have to trust. Line 4 gets two steps and a condition panel showing <code class='inl'>Math.round(raw)</code>'s parity, which is the fork between the correct rule and the popular wrong one. Then the strip builds in three <code class='inl'>repeat</code> calls. Case <b>5</b> (66.5°) is the one where the naive route breaks; case <b>8</b> (7.5°) is ours — raw is exactly 13, a dead tie that no official assertion pins down. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      // `max` is bound to the case array, so adding a ninth case can never orphan
      // it the way a hard-coded literal did in 318. The hint is derived from the
      // same array for the same reason.
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 1, min: 1, max: CASES.length,
          presets: CASES.map((_, i) => i + 1),
          hint: CASES.map((c, i) => `${i + 1}:${c.lat}°`).join(" · ") + " — 1–7 official, 8 ours",
        },
      }),
    },
  ],
};
