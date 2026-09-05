// #336 · Horoscope Match — the signs sit on a WHEEL, so no gap exceeds half a turn.
// Same input, two ways to find the distance — both correct, both 7/7 official:
//   • BRUTE — try every distance d = 0…6, testing one step clockwise and one
//     counter-clockwise each time, and return on the first hit. It finds the
//     right answer by SEARCHING for it, probing up to 13 positions.
//   • OPT   — fold the index gap: min(gap, 12 - gap). The two ways round always
//     sum to 12, so the shorter one is arithmetic, not search — 3 ops, no loop.
//     The fold also proves the index can never leave the 7-row table.
//
// Flip the Approach toggle on Capricorn·Cancer to watch 13 position checks
// collapse to 3 arithmetic ops on identical input, with the same answer.
//
// Honest about the size of the win: the wheel is fixed at 12, so both are O(1)
// and neither is "slow" in wall-clock terms — this is a constant-factor gap,
// not an asymptotic one. It only becomes asymptotic if you generalise the ring:
// on an n-position wheel the search is O(n) while the fold stays O(1). The
// transferable lesson is the one the pattern clue names — when a structure is
// circular, reach for modular arithmetic instead of walking it.
import { el, esc, mountDebugger } from "../shared.js";

// The wheel, in the order the problem states it. Index IS the position.
const WHEEL = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const GLYPH = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

// COMPAT[distance] — the table from the prompt, indexed by shortest distance.
// 7 entries, because a distance on a 12-wheel can never exceed 6.
const COMPAT = ["100%", "40%", "80%", "30%", "90%", "20%", "50%"];

// All 7 official freeCodeCamp cases, in the grader's order. No invented presets:
// their distances are 2, 5, 1, 6, 0, 4, 3 — every row of the table, exactly once.
const OFFICIAL = [
  ["Libra", "Sagittarius", "80%"],
  ["Gemini", "Scorpio", "20%"],
  ["Pisces", "Aries", "40%"],
  ["Capricorn", "Cancer", "50%"],
  ["Aquarius", "Aquarius", "100%"],
  ["Virgo", "Taurus", "90%"],
  ["Leo", "Scorpio", "30%"],
];

const idx = (s) => WHEEL.indexOf(s);

// ── The two approaches ───────────────────────────────────────────────────────
// Both return the same `dist`; they differ only in how much work that took.
// `checks`/`ops` are what the demo headers count.

// BRUTE: search outward from i, one distance at a time, both directions.
// `hitDir` records which probe landed, so the wheel can highlight it.
function byScan(i, j) {
  let checks = 0;
  for (let d = 0; d <= 6; d++) {
    checks++;
    if ((i + d) % 12 === j) return { dist: d, checks, hitDir: "cw" };
    checks++;
    if ((i - d + 12) % 12 === j) return { dist: d, checks, hitDir: "ccw" };
  }
  return { dist: 0, checks, hitDir: "cw" }; // unreachable: every pair is within 6
}

// OPT: the two ways round sum to 12, so the shorter is min(gap, 12 - gap).
function byFold(i, j) {
  const gap = Math.abs(i - j);
  return { dist: Math.min(gap, 12 - gap), gap, ops: 3 };
}

const solve = (i, j, mode) => (mode === "fold" ? byFold(i, j) : byScan(i, j));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .hm-wrap { display:grid; grid-template-columns:300px 1fr; gap:18px; align-items:start; }
    @media (max-width:720px) { .hm-wrap { grid-template-columns:1fr; } }
    .hm-svg { width:300px; height:300px; display:block; }
    .hm-svg .node { cursor:pointer; }
    .hm-svg .ring { fill:var(--panel-2); stroke:var(--border); }
    .hm-svg .node:hover .ring { stroke:var(--accent); }
    .hm-svg .ring.a { fill:color-mix(in srgb, var(--accent) 26%, transparent); stroke:var(--accent); }
    .hm-svg .ring.b { fill:color-mix(in srgb, var(--c4) 26%, transparent); stroke:var(--c4); }
    .hm-svg .gl { font:17px var(--sans); fill:var(--text); text-anchor:middle; pointer-events:none; }
    .hm-svg .nm { font:8.5px var(--sans); fill:var(--muted); text-anchor:middle; pointer-events:none;
                  letter-spacing:.04em; text-transform:uppercase; }
    .hm-svg .pick { font:700 9px var(--mono); text-anchor:middle; pointer-events:none; letter-spacing:.06em; }
    .hm-svg .pick.a { fill:var(--accent); }
    .hm-svg .pick.b { fill:var(--c4); }
    .hm-svg .arc { fill:none; stroke-linecap:round; }
    .hm-svg .arc.win { stroke:var(--accent); stroke-width:3.5; }
    .hm-svg .arc.lose { stroke:var(--border); stroke-width:2.5; stroke-dasharray:3 5; }
    .hm-svg .hop { fill:var(--accent); }
    .hm-svg .hop.probe { fill:var(--muted); }
    .hm-eq { font:13px var(--mono); margin:8px 0 4px; color:var(--muted); }
    .hm-eq b { color:var(--text); }
    .hm-eq .win { color:var(--accent); }
    .hm-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
              color:var(--muted); margin:12px 0 4px; }
  `));
}

// ── The wheel ────────────────────────────────────────────────────────────────
const CX = 150, CY = 150, R_NODE = 116, R_ARC = 84;
const pt = (k, r) => {
  const a = (-90 + k * 30) * Math.PI / 180;
  return { x: +(CX + r * Math.cos(a)).toFixed(2), y: +(CY + r * Math.sin(a)).toFixed(2) };
};

// An arc hugging the wheel from position `from`, `steps` positions clockwise.
// Negative `steps` runs counter-clockwise.
const arcPath = (from, steps, r) => {
  const cw = steps >= 0;
  const n = Math.abs(steps);
  const a = pt(from, r), b = pt(((from + steps) % 12 + 12) % 12, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${n > 6 ? 1 : 0} ${cw ? 1 : 0} ${b.x} ${b.y}`;
};

const hopDot = (k, r, cls, big) =>
  `<circle class="hop${cls}" cx="${pt(k, r).x}" cy="${pt(k, r).y}" r="${big ? 4 : 2.5}"/>`;

// Draws the traversal the given approach actually performs.
//   scan → both probes crawl out to `dist`; the one that lands on j is lit,
//          the other stays a ghosted "we checked here too" trail.
//   fold → the short way lit, the long way ghosted as the rejected route.
function wheelSvg(i, j, mode) {
  const r = solve(i, j, mode);
  const dist = r.dist;
  let arcs = "", hops = "";

  if (mode === "scan") {
    const hit = r.hitDir === "cw" ? dist : -dist;
    const miss = r.hitDir === "cw" ? -dist : dist;
    if (dist > 0) {
      arcs += `<path class="arc lose" d="${arcPath(i, miss, R_ARC)}"/>`;
      arcs += `<path class="arc win" d="${arcPath(i, hit, R_ARC)}"/>`;
    }
    // Every position the loop actually probed, both directions.
    for (let d = 0; d <= dist; d++) {
      hops += hopDot((i + d) % 12, R_ARC, d === dist && r.hitDir === "cw" ? "" : " probe", d === dist);
      if (d > 0) hops += hopDot((i - d + 12) % 12, R_ARC, d === dist && r.hitDir === "ccw" ? "" : " probe", d === dist);
    }
    hops += hopDot(i, R_ARC, "", true);
  } else {
    const cw = (j - i + 12) % 12;
    const shortFrom = cw <= 6 ? i : j;
    if (dist > 0) {
      arcs += `<path class="arc lose" d="${arcPath(shortFrom, -(12 - dist), R_ARC)}"/>`;
      arcs += `<path class="arc win" d="${arcPath(shortFrom, dist, R_ARC)}"/>`;
    }
    for (let s = 0; s <= dist; s++)
      hops += hopDot((shortFrom + s) % 12, R_ARC, "", s === 0 || s === dist);
  }

  const nodes = WHEEL.map((name, k) => {
    const p = pt(k, R_NODE);
    const role = k === i ? "a" : k === j ? "b" : "";
    const tag = k === i && k === j ? "A·B" : k === i ? "A" : k === j ? "B" : "";
    return `<g class="node" data-k="${k}">
      <circle class="ring ${role}" cx="${p.x}" cy="${p.y}" r="17" stroke-width="1.5"/>
      <text class="gl" x="${p.x}" y="${p.y + 6}">${GLYPH[k]}</text>
      <text class="nm" x="${p.x}" y="${p.y + 29}">${name.slice(0, 3)}</text>
      ${tag ? `<text class="pick ${role}" x="${p.x}" y="${p.y - 23}">${tag}</text>` : ""}
    </g>`;
  }).join("");

  return `<svg class="hm-svg" viewBox="0 0 300 300" role="img"
    aria-label="Zodiac wheel: ${esc(WHEEL[i])} to ${esc(WHEEL[j])}, distance ${dist}">
    <circle cx="${CX}" cy="${CY}" r="${R_ARC}" fill="none" stroke="var(--border)" stroke-width="1" opacity=".45"/>
    ${arcs}${hops}${nodes}
  </svg>`;
}

// ── The official-test scoreboard ─────────────────────────────────────────────
// Both approaches pass all 7. The `work` column is where they part company —
// it totals the same result reached two ways, so the cost gap is legible at a
// glance rather than asserted in prose.
function scoreboard(mode) {
  const box = el("div");
  const rows = OFFICIAL.map(([a, b, want]) => {
    const r = solve(idx(a), idx(b), mode);
    return { a, b, want, got: COMPAT[r.dist], work: mode === "scan" ? r.checks : r.ops };
  });
  const pass = rows.filter((x) => x.got === x.want).length;
  const total = rows.reduce((s, x) => s + x.work, 0);
  const unit = mode === "scan" ? "checks" : "ops";

  box.append(el("div", "hm-lbl", `Official freeCodeCamp tests · ${pass} of ${rows.length} passing`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">case</span><span class="exp">expected</span>` +
    `<span class="got">got</span><span class="exp">${unit}</span>`));
  rows.forEach((x) => {
    box.append(el("div", "srow" + (x.got === x.want ? "" : " bad"),
      `<span class="mark">${x.got === x.want ? "✓" : "✗"}</span>` +
      `<span class="k">${esc(x.a)}, ${esc(x.b)}</span>` +
      `<span class="exp">${esc(x.want)}</span>` +
      `<span class="got">${esc(x.got)}</span>` +
      `<span class="exp">${x.work}</span>`));
  });
  box.append(el("div", "hm-eq",
    `all 7 cases cost <b>${total}</b> ${unit} total` +
    (mode === "scan" ? ` — the fold does the same work in <span class="win">21</span>.` : ``)));
  return box;
}

// ── Shared demo shell: the wheel, two picks, the verdict ─────────────────────
function mountWheel(host, mode) {
  ensureStyle();
  // Open on Capricorn/Scorpio — distance 6, the pair that costs the scan most.
  let i = 9, j = 3, next = 0;

  const chips = el("div", "controls");
  OFFICIAL.forEach(([a, b]) => {
    const c = el("button", "chip", `${a.slice(0, 3)}·${b.slice(0, 3)}`);
    c.title = `${a}, ${b}`;
    c.onclick = () => { i = idx(a); j = idx(b); next = 0; render(); };
    chips.append(c);
  });

  const head = el("div", "demo-head");
  const wrap = el("div", "hm-wrap");
  const left = el("div"), right = el("div");
  wrap.append(left, right);
  host.append(chips, el("div", "muted", "Click any sign on the wheel to set <b>A</b>, then <b>B</b> — all 144 pairs are reachable."), head, wrap);

  function render() {
    const r = solve(i, j, mode);
    const dist = r.dist;

    head.innerHTML = mode === "scan"
      ? `<span class="opcount hot"><span class="n">${r.checks}</span> position checks</span>` +
        `<span class="muted mono">d climbs 0 → ${dist}, two probes each</span>`
      : `<span class="opcount cool"><span class="n">${r.ops}</span> arithmetic ops</span>` +
        `<span class="muted mono">subtract, subtract, min — no loop</span>`;

    left.innerHTML = wheelSvg(i, j, mode);
    left.querySelectorAll(".node").forEach((g) => {
      g.onclick = () => { if (next === 0) i = +g.dataset.k; else j = +g.dataset.k; next ^= 1; render(); };
    });

    right.innerHTML = "";
    right.append(el("div", "hm-eq",
      `i = <b>${i}</b> (${esc(WHEEL[i])}) &nbsp; j = <b>${j}</b> (${esc(WHEEL[j])})`));

    if (mode === "scan") {
      right.append(el("div", "hm-eq",
        `probed d = 0…<b>${dist}</b> — hit going <span class="win">${r.hitDir === "cw" ? "clockwise" : "counter-clockwise"}</span>`));
      right.append(el("div", "hm-eq",
        `<b>${r.checks}</b> checks to learn one number`));
    } else {
      const other = 12 - r.gap;
      right.append(el("div", "hm-eq", `gap = |i − j| = <b>${r.gap}</b>`));
      right.append(el("div", "hm-eq",
        `dist = min(<span class="${other < r.gap ? "" : "win"}">${r.gap}</span>, ` +
        `<span class="${other < r.gap ? "win" : ""}">12 − ${r.gap} = ${other}</span>) = <b>${dist}</b>` +
        (other < r.gap ? ` &nbsp;— <span class="win">the short way crosses the seam</span>` : "")));
    }

    right.append(el("div", null, `<span class="badge ok">${esc(COMPAT[dist])}</span>`));

    right.append(el("div", "hm-lbl", "Distance → compatibility"));
    const lad = el("div", "ladder");
    COMPAT.forEach((v, d) => {
      const rung = el("div", "rung" + (d === dist ? " on" : ""));
      rung.innerHTML = `<span>distance ${d}</span>${d === dist ? `<span>◀ ${v}</span>` : `<span class="v">${v}</span>`}`;
      lad.append(rung);
    });
    right.append(lad);
    right.append(scoreboard(mode));
  }
  render();
}

const mountScan = (host) => mountWheel(host, "scan");
const mountFold = (host) => mountWheel(host, "fold");

// ── STEP — one debugger per approach ─────────────────────────────────────────
const SRC_SCAN = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">horoscopeMatch</span>(<span class="tok" data-t="param">sign1, sign2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="wheel">WHEEL</span> = [<span class="st">"Aries"</span>, <span class="st">"Taurus"</span>, …, <span class="st">"Pisces"</span>];` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="compat">COMPAT</span> = [<span class="st">"100%"</span>, <span class="st">"40%"</span>, <span class="st">"80%"</span>, <span class="st">"30%"</span>, <span class="st">"90%"</span>, <span class="st">"20%"</span>, <span class="st">"50%"</span>];` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="i">i = WHEEL.<span class="fn">indexOf</span>(sign1)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="j">j = WHEEL.<span class="fn">indexOf</span>(sign2)</span>;` },
  { ln: 6, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="dcond">d = 0; d &lt;= 6</span>; d++) {` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="cw">(i + d) % 12 === j</span>) <span class="k">return</span> COMPAT[d];` },
  { ln: 8, html: `    <span class="k">if</span> (<span class="tok" data-t="ccw">(i - d + 12) % 12 === j</span>) <span class="k">return</span> COMPAT[d];` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `}` },
];

const SRC_FOLD = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">horoscopeMatch</span>(<span class="tok" data-t="param">sign1, sign2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="wheel">WHEEL</span> = [<span class="st">"Aries"</span>, <span class="st">"Taurus"</span>, …, <span class="st">"Pisces"</span>];` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="compat">COMPAT</span> = [<span class="st">"100%"</span>, <span class="st">"40%"</span>, <span class="st">"80%"</span>, <span class="st">"30%"</span>, <span class="st">"90%"</span>, <span class="st">"20%"</span>, <span class="st">"50%"</span>];` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="i">i = WHEEL.<span class="fn">indexOf</span>(sign1)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="j">j = WHEEL.<span class="fn">indexOf</span>(sign2)</span>;` },
  { ln: 6, html: `  <span class="k">const</span> <span class="tok" data-t="gap">gap = Math.<span class="fn">abs</span>(i - j)</span>;` },
  { ln: 7, html: `  <span class="k">const</span> <span class="tok" data-t="dist">dist = Math.<span class="fn">min</span>(gap, 12 - gap)</span>;  <span class="cm">// never more than half a turn</span>` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">COMPAT[dist]</span>;` },
  { ln: 9, html: `}` },
];

// Struct panel contents — constant for the whole call, built once.
const WHEEL_ITEMS = WHEEL.map((w, k) => `${k}:${w.slice(0, 3)}`);
const COMPAT_ITEMS = COMPAT.map((v, d) => `${d}:${v}`);

const parsePair = (s) => String(s).split(",").map((x) => x.trim())
  .map((x) => WHEEL.find((w) => w.toLowerCase() === x.toLowerCase()));

const badInput = () => [{
  line: 1,
  note: `Type <b>two sign names, comma-separated</b> — e.g. <code class='inl'>Capricorn,Cancer</code>. Anything not on the wheel would make <code class='inl'>indexOf</code> return <b>−1</b>, and the challenge promises valid signs, so neither solution guards against it.`,
  frames: [{ title: "horoscopeMatch(?, ?)", vars: {} }],
}];

// Shared prologue: lines 1–5 are identical in both approaches, so both traces
// narrate them the same way and diverge only once the distance work begins.
function prologue(S, s1, s2, i, j) {
  S(1, `Compare <b>${s1}</b> and <b>${s2}</b>. Nothing about the signs themselves matters — only <b>where they sit on the wheel</b>, so the first job is turning each name into a position.`, { focus: "param" });
  S(2, `The wheel array <i>is</i> the position map: <b>Aries</b> is 0, <b>Pisces</b> is 11, and after Pisces it wraps back to Aries. Writing the order down once is what makes the rest arithmetic.`, { focus: "wheel" });
  S(3, `The prompt's table, indexed by distance — <b>COMPAT[0]</b> is <code class='inl'>"100%"</code>, <b>COMPAT[6]</b> is <code class='inl'>"50%"</code>. Exactly <b>7</b> entries, because a distance on a 12-wheel can never exceed 6.`, { focus: "compat" });
  S(4, `<b>indexOf("${s1}")</b> scans the wheel and lands at <b>${i}</b>.`, { focus: "i", changed: ["i"] });
  S(5, `The same scan for <b>${s2}</b> gives <b>j = ${j}</b>. Both signs are now just numbers, and the problem is the distance between two points on a circle.`, { focus: "j", changed: ["j"] });
}

// BRUTE trace — the search. Step count grows with the distance; that growth is
// the point, so compare this tab's step counter against the fold tab's.
function traceScan(input) {
  const [s1, s2] = parsePair(input);
  if (!s1 || !s2) return badInput();

  const steps = [];
  let i, j, d, checks = 0;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4) vars.i = i;
    if (line >= 5) vars.j = j;
    if (line >= 6 && d !== undefined) { vars.d = d; vars.checks = checks; }
    const structs = [];
    if (line >= 2) structs.push({ label: "WHEEL", items: WHEEL_ITEMS });
    if (line >= 3) structs.push({ label: "COMPAT", items: COMPAT_ITEMS });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `horoscopeMatch("${s1}", "${s2}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  i = idx(s1); j = idx(s2);
  prologue(S, s1, s2, i, j);

  for (d = 0; d <= 6; d++) {
    S(6, `Try distance <b>d = ${d}</b>. The loop asks a yes/no question — "is ${s2} exactly ${d} step${d === 1 ? "" : "s"} away?" — and has to ask it about <b>both</b> directions.`, { focus: "dcond", changed: ["d"], eval: { expr: `d = ${d} <= 6`, val: true } });

    const cw = (i + d) % 12;
    checks++;
    const cwHit = cw === j;
    S(7, `Step <b>${d}</b> clockwise from ${s1} lands on <b>${WHEEL[cw]}</b> (${cw}). ${cwHit ? `That's ${s2} — found it, return <b>COMPAT[${d}]</b>.` : `Not ${s2}, so keep looking. That's check <b>${checks}</b>.`}`, {
      focus: "cw", changed: ["checks"],
      eval: { expr: `(${i} + ${d}) % 12 === ${j}`, val: cwHit },
      ...(cwHit ? { done: true, result: COMPAT[d], ret: { value: COMPAT[d] } } : {}),
    });
    if (cwHit) return steps;

    const ccw = (i - d + 12) % 12;
    checks++;
    const ccwHit = ccw === j;
    S(8, `Now <b>${d}</b> step${d === 1 ? "" : "s"} counter-clockwise → <b>${WHEEL[ccw]}</b> (${ccw}). ${ccwHit ? `That's ${s2} — found it at distance <b>${d}</b>.` : `Still not ${s2}. That's check <b>${checks}</b>; widen the ring and go again.`}`, {
      focus: "ccw", changed: ["checks"],
      eval: { expr: `(${i} - ${d} + 12) % 12 === ${j}`, val: ccwHit },
      ...(ccwHit ? { done: true, result: COMPAT[d], ret: { value: COMPAT[d] } } : {}),
    });
    if (ccwHit) return steps;
  }
  return steps;
}

// OPT trace — the arithmetic. Always the same length regardless of distance.
function traceFold(input) {
  const [s1, s2] = parsePair(input);
  if (!s1 || !s2) return badInput();

  const steps = [];
  let i, j, gap, dist;
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 4) vars.i = i;
    if (line >= 5) vars.j = j;
    if (line >= 6) vars.gap = gap;
    if (line >= 7 && dist !== undefined) vars.dist = dist;
    const structs = [];
    if (line >= 2) structs.push({ label: "WHEEL", items: WHEEL_ITEMS });
    if (line >= 3) structs.push({ label: "COMPAT", items: COMPAT_ITEMS });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `horoscopeMatch("${s1}", "${s2}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  i = idx(s1); j = idx(s2);
  prologue(S, s1, s2, i, j);

  gap = Math.abs(i - j);
  const other = 12 - gap;
  S(6, `<b>|${i} − ${j}| = ${gap}</b> — the gap along the array, i.e. the distance if the signs were a straight line. One subtraction, no loop.`, { focus: "gap", changed: ["gap"] });

  dist = Math.min(gap, other);
  S(7, `But the wheel is a circle, so there are two routes and they <b>always sum to 12</b>: <b>${gap}</b> one way, <b>${other}</b> the other. Take the smaller — <b>${dist}</b>. ${other < gap ? `Here the wrap wins: ${s1} and ${s2} are only <b>${dist}</b> apart across the Pisces→Aries seam.` : `Here the direct gap was already the shorter route.`} This single <code class='inl'>min</code> also guarantees dist ≤ 6, so the table index is always in range.`, {
    focus: "dist", changed: ["dist"],
    eval: { expr: `min(gap = ${gap}, 12 - gap = ${other})`, val: true },
  });

  S(8, `<b>COMPAT[${dist}] = "${COMPAT[dist]}"</b>. The search version needed <b>${byScan(i, j).checks}</b> position checks to reach this same answer; the fold got here in three arithmetic ops, and its step count doesn't grow with the distance.`, {
    focus: "ret", done: true, result: COMPAT[dist], ret: { value: COMPAT[dist] },
  });
  return steps;
}

// Capricorn,Cancer first — distance 6, the pair the scan works hardest for.
const STEP_PRESETS = OFFICIAL.map(([a, b]) => `${a},${b}`);
const STEP_INPUT = { type: "text", label: "signs =", value: "Capricorn,Cancer", presets: STEP_PRESETS, hint: "two signs, comma-separated" };

export default {
  n: 336, id: "horoscope", title: "Horoscope Match", dates: ["2026-07-12"],
  statement: `Given two star sign strings, return their compatibility percentage. The twelve signs sit on a wheel — <b>Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces</b> — wrapping back to Aries after Pisces. Find the <b>shortest</b> distance between the two signs and map it: <code class="inl">0→"100%"</code>, <code class="inl">1→"40%"</code>, <code class="inl">2→"80%"</code>, <code class="inl">3→"30%"</code>, <code class="inl">4→"90%"</code>, <code class="inl">5→"20%"</code>, <code class="inl">6→"50%"</code>. <span class="rule">Example: <code class="inl">horoscopeMatch("Pisces", "Aries")</code> → <b>"40%"</b> — adjacent, across the seam.</span>`,
  variants: [
    {
      name: "Try every distance", tone: "brute", cost: "O(1) — up to 13 checks",
      approach: `Search for the answer: try <code class='inl'>d = 0</code>, then 1, then 2… and at each one ask whether ${"`sign2`"} sits exactly that far away <b>clockwise</b> or <b>counter-clockwise</b>. The first hit is the shortest distance, so it's correct by construction — and the wrap costs nothing extra, because <code class='inl'>% 12</code> handles it. But it can probe <b>13 positions</b> to learn a number two subtractions already know. Click <code class='inl'>Cap·Can</code> to see the worst case.`,
      code: `// Correct, and the modulo handles the wrap — but it SEARCHES for the distance.\nconst WHEEL = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",\n               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];\nconst COMPAT = ["100%", "40%", "80%", "30%", "90%", "20%", "50%"];\n\nfunction horoscopeMatch(sign1: string, sign2: string): string {\n  const i = WHEEL.indexOf(sign1);\n  const j = WHEEL.indexOf(sign2);\n  for (let d = 0; d <= 6; d++) {\n    if ((i + d) % 12 === j) return COMPAT[d];      // d steps clockwise\n    if ((i - d + 12) % 12 === j) return COMPAT[d]; // d steps the other way\n  }\n  throw new Error("unreachable — every pair is within 6");\n}`,
      mount: mountScan,
    },
    {
      name: "Step: try every distance", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the search — run it one line at a time and watch the ring widen. On <code class='inl'>Capricorn,Cancer</code> the loop asks twelve losing questions before the thirteenth lands. Every one of those checks is work the fold never does. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>. (Same default pair as the fold step tab — compare the step counts.)`,
      mount: (host) => mountDebugger(host, { source: SRC_SCAN, trace: traceScan, input: STEP_INPUT }),
    },
    {
      name: "Fold at the half-turn", tone: "opt", cost: "O(1) — 3 ops",
      approach: `Don't search — compute. The two ways round the wheel always sum to 12, so once you know the straight-line gap <code class='inl'>|i - j|</code>, the shorter route is just <code class='inl'>Math.min(gap, 12 - gap)</code>. No loop, no direction bookkeeping, and the same three operations whether the signs are adjacent or opposite. It also <i>proves</i> the result can't exceed 6, so the table index is always in range. The ghosted arc is the route it rejected.`,
      code: `// Fold the gap at the half-turn: the two ways round sum to 12.\nconst WHEEL = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",\n               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];\nconst COMPAT = ["100%", "40%", "80%", "30%", "90%", "20%", "50%"];\n\nfunction horoscopeMatch(sign1: string, sign2: string): string {\n  const i = WHEEL.indexOf(sign1);\n  const j = WHEEL.indexOf(sign2);\n  const gap = Math.abs(i - j);\n  const dist = Math.min(gap, 12 - gap); // always 0..6\n  return COMPAT[dist];\n}`,
      mount: mountFold,
    },
    {
      name: "Step: fold", tone: "opt", cost: "line-by-line",
      approach: `The same problem in a straight line of arithmetic — <b>eight steps, always</b>, whether the signs are adjacent or opposite. Run <code class='inl'>Capricorn,Cancer</code> here and in the search tab back to back: identical answer, and the step counter tells the whole story. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_FOLD, trace: traceFold, input: STEP_INPUT }),
    },
  ],
};
