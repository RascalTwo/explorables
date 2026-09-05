// #323 · Song Mood — a genre + BPM lookup, drawn as a mood spectrum.
// One variant. All four genres are stacked as mood-band tracks across a
// 60→180 BPM ruler; the slider drops a live playhead onto every track.
import { el, mountDebugger } from "../shared.js";

const TABLE = {
  classical:  [[60, 109, "focus"], [110, 180, "happy"]],
  electronic: [[60, 89, "focus"], [90, 134, "happy"], [135, 180, "hype"]],
  pop:        [[60, 180, "happy"]],
  rock:       [[60, 129, "happy"], [130, 180, "hype"]],
};
const GENRES = Object.keys(TABLE);
const LO = 60, HI = 180;
const MOOD_COLOR = { focus: "#58a6ff", happy: "#3fb950", hype: "#f85149" };

function getMood(genre, bpm) {
  for (const [lo, hi, mood] of TABLE[genre] ?? []) if (bpm >= lo && bpm <= hi) return mood;
  return "";
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sm-wrap { margin-top:14px; max-width:720px; }
    .sm-readout { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin:6px 0 18px; }
    .sm-mood { font:800 34px var(--sans); letter-spacing:.01em; }
    .sm-sub { font:13px var(--mono); color:var(--muted); }
    .sm-sub b { color:var(--text); }
    .sm-bpm { font:800 26px var(--mono); color:var(--accent); }
    .sm-track { position:relative; height:40px; border-radius:9px; overflow:hidden; margin:7px 0;
      border:1px solid var(--border); background:var(--panel-2); opacity:.5; transition:opacity .2s, box-shadow .2s; }
    .sm-track.on { opacity:1; box-shadow:0 0 0 1px var(--accent), 0 4px 16px -6px color-mix(in srgb,var(--accent) 60%,transparent); }
    .sm-band { position:absolute; top:0; bottom:0; display:flex; align-items:center; justify-content:center;
      font:700 11px var(--sans); color:#0d1117; text-transform:uppercase; letter-spacing:.06em; }
    .sm-row { display:grid; grid-template-columns:88px 1fr; align-items:center; gap:10px; }
    .sm-glabel { font:700 13px var(--mono); color:var(--muted); text-align:right; cursor:pointer; }
    .sm-glabel.on { color:var(--text); }
    .sm-play { position:absolute; top:-4px; bottom:-4px; width:2px; background:var(--text); z-index:3; pointer-events:none; }
    .sm-play::before { content:""; position:absolute; top:-5px; left:-4px; border:5px solid transparent;
      border-top-color:var(--text); }
    .sm-stack { position:relative; margin:4px 0; }
    .sm-ruler { display:grid; grid-template-columns:88px 1fr; gap:10px; margin-top:6px; }
    .sm-ticks { position:relative; height:18px; font:10px var(--mono); color:var(--muted); }
    .sm-tick { position:absolute; transform:translateX(-50%); }
    .sm-controls { display:flex; align-items:center; gap:12px; margin:18px 0 4px; flex-wrap:wrap; }
    .sm-slider { flex:1; min-width:220px; }
  `));
}

function mount(host) {
  ensureStyle();
  let genre = "rock", bpm = 111;
  const pct = (b) => ((b - LO) / (HI - LO)) * 100;

  const wrap = el("div", "sm-wrap");

  // genre chips
  const chips = el("div", "controls");
  const chipEls = {};
  GENRES.forEach((g) => {
    const c = el("button", "chip" + (g === genre ? " on" : ""), g);
    c.onclick = () => { genre = g; render(); };
    chipEls[g] = c; chips.append(c);
  });

  // readout
  const readout = el("div", "sm-readout");
  const moodEl = el("div", "sm-mood");
  const subEl = el("div", "sm-sub");
  readout.append(moodEl, subEl);

  // stacked tracks (one per genre)
  const stack = el("div", "sm-stack");
  const rows = {};
  GENRES.forEach((g) => {
    const row = el("div", "sm-row");
    const label = el("div", "sm-glabel", g);
    label.onclick = () => { genre = g; render(); };
    const track = el("div", "sm-track");
    TABLE[g].forEach(([lo, hi, mood]) => {
      const band = el("div", "sm-band", mood);
      band.style.left = pct(lo) + "%";
      band.style.width = (pct(hi) - pct(lo) + (hi === HI ? 100 / (HI - LO) : 0)) + "%";
      band.style.background = `color-mix(in srgb, ${MOOD_COLOR[mood]} 82%, #fff 4%)`;
      track.append(band);
    });
    const ph = el("div", "sm-play");
    track.append(ph);
    row.append(label, track);
    rows[g] = { row, label, track, ph };
    stack.append(row);
  });

  // ruler ticks
  const ruler = el("div", "sm-ruler");
  const ticks = el("div", "sm-ticks");
  [60, 90, 110, 130, 150, 180].forEach((t) => {
    const tk = el("div", "sm-tick", String(t));
    tk.style.left = pct(t) + "%";
    ticks.append(tk);
  });
  ruler.append(el("div", "sm-sub", "BPM →"), ticks);

  // slider
  const ctl = el("div", "sm-controls");
  const slider = el("input", "sm-slider"); slider.type = "range"; slider.min = LO; slider.max = HI; slider.value = bpm;
  const bpmEl = el("div", "sm-bpm", bpm + " BPM");
  slider.oninput = () => { bpm = +slider.value; render(); };
  ctl.append(bpmEl, slider);

  wrap.append(chips, readout, stack, ruler, ctl);
  host.append(wrap);

  function render() {
    const mood = getMood(genre, bpm);
    moodEl.textContent = mood || "—";
    moodEl.style.color = MOOD_COLOR[mood] || "var(--muted)";
    subEl.innerHTML = `<b>getMood("${genre}", ${bpm})</b> → "${mood}"`;
    bpmEl.textContent = bpm + " BPM";
    slider.value = bpm;
    GENRES.forEach((g) => {
      const active = g === genre;
      rows[g].track.classList.toggle("on", active);
      rows[g].label.classList.toggle("on", active);
      chipEls[g].classList.toggle("on", active);
      rows[g].ph.style.left = pct(bpm) + "%";
    });
  }
  render();
}

const CODE = `function getMood(genre: string, bpm: number): string {
  const table: Record<string, [number, number, string][]> = {
    classical:  [[60, 109, "focus"], [110, 180, "happy"]],
    electronic: [[60, 89, "focus"], [90, 134, "happy"], [135, 180, "hype"]],
    pop:        [[60, 180, "happy"]],
    rock:       [[60, 129, "happy"], [130, 180, "hype"]],
  };
  for (const [lo, hi, mood] of table[genre] ?? [])
    if (bpm >= lo && bpm <= hi) return mood;
  return "";
}`;

// ── STEP — the getMood code, annotated + instrumented for the shared debugger ─
// The input isn't a single number or string but a (genre, bpm) pair, so we curate
// a handful of songs and pick one by index. Each lands on a different mood.
const CASES = [
  { genre: "rock",       bpm: 111, label: "matches the first band" },
  { genre: "electronic", bpm: 135, label: "two misses, then hype" },
  { genre: "classical",  bpm: 80,  label: "focus at a low tempo" },
  { genre: "classical",  bpm: 150, label: "skips focus, lands on happy" },
  { genre: "jazz",       bpm: 120, label: "unknown genre → no mood" },
];

const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getMood</span>(<span class="tok" data-t="param">genre, bpm</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> bands = <span class="tok" data-t="lookup">table[genre] ?? []</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> [<span class="tok" data-t="iter">lo, hi, mood</span>] <span class="k">of</span> bands) {` },
  { ln: 4, html: `    <span class="k">if</span> (<span class="tok" data-t="cond">bpm &gt;= lo &amp;&amp; bpm &lt;= hi</span>)` },
  { ln: 5, html: `      <span class="k">return</span> <span class="tok" data-t="ret">mood</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="empty"><span class="st">""</span></span>;` },
  { ln: 8, html: `}` },
];

// Instrumented run → generic debugger steps. One frame (no recursion). lo/hi/mood
// live only inside the loop body, so they appear when a band is taken and vanish
// again once we leave the loop to hit the final `return ""`.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx];
  const { genre, bpm } = c;
  const bands = TABLE[genre] ?? [];
  const bandItems = bands.map(([lo, hi, mood]) => `${lo}–${hi} ${mood}`);
  const steps = [];
  let lo, hi, mood, inLoop = false;
  const S = (line, note, x = {}) => {
    const vars = { genre: `"${genre}"`, bpm };
    if (inLoop) { vars.lo = lo; vars.hi = hi; vars.mood = `"${mood}"`; }
    const structs = line >= 2 ? [{ label: "bands", items: bandItems.slice() }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "getMood", vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Song ${idx + 1} — <b>getMood("${genre}", ${bpm})</b>, ${c.label}. The genre picks a row of mood bands; the BPM decides which band it falls in.`,
    { focus: "param", changed: ["genre", "bpm"] });

  S(2, bands.length
    ? `Look up <b>"${genre}"</b> in the table → <b>${bands.length}</b> band${bands.length > 1 ? "s" : ""} to check, each a <code>[lo, hi, mood]</code> range.`
    : `<b>"${genre}"</b> isn't in the table, so <code>table["${genre}"]</code> is <b>undefined</b> and <code>?? []</code> falls back to an <b>empty</b> list — there is nothing to loop over.`,
    { focus: "lookup" });

  for (let bi = 0; bi < bands.length; bi++) {
    [lo, hi, mood] = bands[bi]; inLoop = true;
    S(3, `Take the next band: <b>${lo}–${hi}</b> BPM → mood <b>"${mood}"</b>.`,
      { focus: "iter", changed: ["lo", "hi", "mood"] });
    const c1 = bpm >= lo, c2 = bpm <= hi, cond = c1 && c2;
    S(4, `Is <b>${bpm}</b> inside <b>${lo}–${hi}</b>? ${bpm} ≥ ${lo} is <b>${c1}</b>, ${bpm} ≤ ${hi} is <b>${c2}</b> → <b>${cond}</b>.`,
      { focus: "cond", eval: { expr: `${lo} ≤ ${bpm} ≤ ${hi}`, val: cond } });
    if (cond) {
      S(5, `${bpm} is inside the range — <b>return "${mood}"</b>. The first band that contains the BPM wins, so the search stops here.`,
        { focus: "ret", ret: { value: `"${mood}"` }, done: true, result: `"${mood}"` });
      return steps;
    }
  }

  inLoop = false; // lo/hi/mood leave scope with the loop
  S(7, bands.length
    ? `No band contained <b>${bpm}</b> — the loop ran out of bands, so <b>return ""</b> (no mood).`
    : `The band list was empty, so the loop never ran — <b>return ""</b>.`,
    { focus: "empty", ret: { value: `""` }, done: true, result: `""` });
  return steps;
}

export default {
  n: 323, id: "mood", title: "Song Mood", dates: ["2026-06-29"],
  statement: `Given a genre and a BPM, return the mood. Ranges are inclusive — e.g. rock is <i>happy</i> 60–129 and <i>hype</i> 130–180; electronic splits <i>focus</i>/<i>happy</i>/<i>hype</i>. Example: <code class="inl">getMood("rock", 111)</code> → <code class="inl">"happy"</code>; <code class="inl">getMood("electronic", 135)</code> → <code class="inl">"hype"</code>.`,
  variants: [
    { name: "Solution", cost: "O(bands)",
      approach: `Each genre is a small list of <code class="inl">[lo, hi, mood]</code> bands. Walk the selected genre's bands and return the first mood whose inclusive range contains the BPM. An unknown genre falls through <code class="inl">?? []</code> and returns <code class="inl">""</code>. Drag the slider to sweep the playhead across every genre's spectrum at once.`,
      code: CODE, mount },
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for the lookup — run <code class="inl">getMood</code> one line at a time on a chosen song. Watch the genre pick a row of bands, each <b>range check</b> evaluate to true/false, and the <b>first</b> band that contains the BPM return its mood (an unknown genre falls through <code class="inl">?? []</code> to <code class="inl">""</code>). Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "song =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a song` } }) },
  ],
};
