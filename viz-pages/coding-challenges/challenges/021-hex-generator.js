// #21 · Hex Generator — the grader calls it twice and demands two different answers.
// There is no expected output to compare against: the tests re-derive the properties
// instead. Six characters, /^[0-9A-F]{6}$/, and `assert.isAbove(dominant, other)` on
// both rivals — strictly above, so a TIE is a failure exactly like a loss. Then three
// of the seven assertions call generateHex twice and `assert.notEqual` the results, so
// the randomness has to be real and the output space has to be big enough that a
// repeat is a curiosity rather than a bug. Pin the winner to FF and the losers to 00
// and you pass four tests and fail three.
// • REJECT / roll three bytes, test, and throw the roll away if the winner didn't win.
//   Rejects ~67% of rolls (3.02 attempts per call on average, and no upper bound).
// • BUILD  / cap the two losers at 254, then draw the winner from [max + 1, 255].
//   Dominance holds by construction: exactly 3 draws, no branch that can fail.
// Both pass all 7 official tests — the brute is not wrong, it is unbounded. The cost
// is the loop's tail (6% of calls need 8+ rolls), and the price of the fix is a
// visibly duller distribution: mean gap 43 rather than 64. Both defaults are
// "blue | 15", the same three bytes: rejected on one tab (G ties B at 103), lifted
// to 0xA5 on the other.
// Two approaches, deliberately UNTINTED — no `tone` on either, because neither is the
// one to reach for by default: rejection sampling is exactly uniform over all
// 5,559,680 valid triples, construction bounds the work at three draws, and which is
// right depends on the caller. The names and the costs carry the whole distinction.
import { el, mountDebugger } from "../shared.js";

const LONG = ["red", "green", "blue"];
const NAMES = ["R", "G", "B"];
// Readable stand-ins for the pure channel colours — pure #0000FF is unreadable on a
// dark panel. Literal values, not kit custom properties.
const CH_CSS = ["#ff6b6b", "#4ade80", "#6aa8ff"];
const hex2 = (v) => v.toString(16).padStart(2, "0").toUpperCase();
const toHex = (rgb) => rgb.map(hex2).join("");

// freeCodeCamp's official inputs are just four strings — "red", "green", "blue" and
// the invalid "yellow" — so the interesting axis is not the input but the ROLL. Each
// case therefore carries a seed, and every seed below was picked for the run it
// produces rather than taken at random:
//   red | 3     — accepted on the very first roll, the lucky third of calls.
//   green | 1   — three rolls, two of them binned. The ordinary case.
//   blue | 15   — the first roll is [60,103,103] and G *ties* B, so it is rejected
//                 even though blue never lost. `isAbove`, not `isAtLeast`. This is
//                 also the default on BOTH step tabs: same seed, same first two
//                 bytes, and the constructive side lifts the third into [104,255].
//   yellow | 1  — official; returns before a single byte is rolled.
//   red | 11    — ten rolls for one answer. The unbounded loop's tail, and the case
//                 that makes "expected O(1)" feel different from "O(1)".
//   green | 37  — G rolls 255, so the reject side wins on its first try; on the build
//                 side a loser draws 254, the ceiling, and the winner's legal range
//                 collapses to the single value FF. Two extremes of one input.
const CASES = [
  { color: "red", seed: 3 },
  { color: "green", seed: 1 },
  { color: "blue", seed: 15 },
  { color: "yellow", seed: 1 },
  { color: "red", seed: 11 },
  { color: "green", seed: 37 },
];
const OFFICIAL_INPUTS = [...new Set(CASES.map((c) => c.color))];

// mulberry32 — used ONLY by the step-through, never by the demos or the shipped code.
// A trace has to land on the same run every time you press Reset, so the debugger
// swaps Math.random for this and takes the seed from the input string. The demos below
// call the real Math.random, because a demo that can't surprise you isn't showing
// randomness.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the two approaches, instrumented ────────────────────────────────────────
// Reject: roll all three, keep the roll only if the named channel beat both rivals.
function rollReject(i, rand, cap = 60) {
  const log = [];
  for (;;) {
    const rgb = [0, 1, 2].map(() => Math.floor(rand() * 256));
    const win = rgb[i], a = rgb[(i + 1) % 3], b = rgb[(i + 2) % 3];
    const ok = win > a && win > b;
    log.push({ rgb, ok, tied: !ok && win >= a && win >= b });
    if (ok || log.length >= cap) return { rgb, log };
  }
}

// Build: the losers first, capped at 254, then the winner from what is left above them.
function rollBuild(i, rand) {
  const a = (i + 1) % 3, b = (i + 2) % 3;
  const rgb = [0, 0, 0];
  rgb[a] = Math.floor(rand() * 255);
  rgb[b] = Math.floor(rand() * 255);
  const mustBeat = Math.max(rgb[a], rgb[b]) + 1;
  rgb[i] = mustBeat + Math.floor(rand() * (256 - mustBeat));
  return { rgb, a, b, mustBeat, room: 256 - mustBeat };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .hx-wrap { display:flex; flex-direction:column; gap:13px; }
    .hx-top { display:flex; gap:14px; align-items:center; }
    .hx-sw { width:88px; height:88px; flex:none; border-radius:10px; border:1px solid var(--border); }
    .hx-sw.bad { display:flex; align-items:center; justify-content:center; text-align:center; border-style:dashed; background:var(--panel-2); font:700 11px var(--sans); color:var(--muted); padding:6px; }
    .hx-bars { display:flex; flex-direction:column; gap:5px; flex:1; min-width:0; }
    .hx-bar { display:grid; grid-template-columns:20px 1fr 88px; align-items:center; gap:9px; font:12px var(--mono); }
    .hx-bar .lbl { color:var(--muted); font-weight:700; }
    .hx-bar .track { height:11px; border-radius:6px; background:var(--panel-2); border:1px solid var(--border); overflow:hidden; }
    .hx-bar .track i { display:block; height:100%; }
    .hx-bar .val { text-align:right; font-weight:800; }
    .hx-bar .val em { font-style:normal; font-weight:400; color:var(--muted); margin-left:7px; }
    .hx-bar.win .lbl { color:var(--text); }
    .hx-bar:not(.win) { opacity:.72; }
    .hx-rel { font:12.5px var(--mono); color:var(--muted); }
    .hx-rel b { color:var(--text); }
    .hx-rel .ok { color:var(--good); }
    .hx-rel .no { color:var(--danger); }
    .hx-log tr.yes td { color:var(--good); }
    .hx-log tr.no td { color:var(--muted); }
    .hx-log td.why { font-size:11.5px; }
    .hx-rng { display:flex; flex-direction:column; gap:4px; font:12px var(--mono); color:var(--muted); }
    .hx-rng .band { position:relative; height:16px; border-radius:5px; background:var(--panel-2); border:1px solid var(--border); }
    .hx-rng .band .legal { position:absolute; top:0; bottom:0; border-radius:4px; }
    .hx-rng .band .pin { position:absolute; top:-3px; bottom:-3px; width:2px; background:var(--text); }
    .hx-rng .band .cut { position:absolute; top:-3px; bottom:-3px; width:2px; background:var(--muted); }
    .hx-pair { display:flex; gap:8px; align-items:center; flex-wrap:wrap; font:12.5px var(--mono); color:var(--muted); }
    .hx-chip { font:800 14px var(--mono); padding:3px 9px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); display:inline-flex; align-items:center; gap:7px; }
    .hx-chip i { width:12px; height:12px; border-radius:3px; display:inline-block; }
    .hx-strip { display:flex; flex-wrap:wrap; gap:2px; }
    .hx-px { width:7px; height:16px; border-radius:2px; }
    .hx-stats { display:flex; flex-wrap:wrap; gap:16px; font:11.5px var(--sans); color:var(--muted); }
    .hx-stats b { font:800 14px var(--mono); color:var(--text); margin-right:4px; }
  `));
}

// ── shared demo furniture ───────────────────────────────────────────────────
function controls(host, initial, render) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = initial; inp.style.width = "150px";
  const go = el("button", "chip", "Generate ↻");
  ctl.append(el("span", "ctl-label", "color ="), inp, go);
  const pre = el("div", "controls");
  OFFICIAL_INPUTS.forEach((c) => {
    const b = el("button", "chip", `"${c}"`);
    b.onclick = () => { inp.value = c; render(); };
    pre.append(b);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  go.onclick = render;
  queueMicrotask(render);
  return { inp, out };
}

function swatchRow(rgb, i) {
  const top = el("div", "hx-top");
  const sw = el("div", "hx-sw"); sw.style.background = "#" + toHex(rgb);
  const bars = el("div", "hx-bars");
  rgb.forEach((v, k) => {
    bars.append(el("div", "hx-bar" + (k === i ? " win" : ""),
      `<span class="lbl">${NAMES[k]}</span>` +
      `<span class="track"><i style="width:${((v / 255) * 100).toFixed(1)}%;background:${CH_CSS[k]}"></i></span>` +
      `<span class="val">${hex2(v)}<em>${v}</em></span>`));
  });
  top.append(sw, bars);
  return top;
}

function relLine(rgb, i) {
  const others = [(i + 1) % 3, (i + 2) % 3];
  return el("div", "hx-rel", others.map((o) =>
    `<b>${NAMES[i]} ${rgb[i]}</b> &gt; <b>${NAMES[o]} ${rgb[o]}</b> <span class="${rgb[i] > rgb[o] ? "ok" : "no"}">${rgb[i] > rgb[o] ? "✓" : "✗"}</span>`
  ).join(" &nbsp;·&nbsp; ") + ` &nbsp;— the two <code class='inl'>assert.isAbove</code> calls the grader makes on every returned hex.`);
}

function invalidPanel(raw) {
  const top = el("div", "hx-top");
  top.append(el("div", "hx-sw bad", "no channel"), el("div", "hx-bars",
    `<div class="hx-rel"><code class='inl'>["red","green","blue"].indexOf(${JSON.stringify(raw)})</code> is <b>-1</b>, so there is no channel to make dominant and nothing is rolled. The answer is the literal string <b>"Invalid color"</b> — capital I, lowercase c, exactly as the grader spells it.</div>`));
  return top;
}

// Two calls, side by side — this is assertion 5/6/7 rendered as a panel rather than
// described. `prev` is the previous click's answer, so the reader is the one calling
// generateHex twice.
function pairPanel(prev, cur) {
  const box = el("div", "hx-pair");
  const chip = (h) => `<span class="hx-chip"><i style="background:#${h}"></i>${h}</span>`;
  if (!prev) {
    box.innerHTML = `${chip(cur)} <span>press <b>Generate</b> again — the grader does, and then asserts the two are not equal.</span>`;
    return box;
  }
  box.innerHTML = `${chip(prev)} <span>then</span> ${chip(cur)} ` +
    (prev === cur
      ? `<span class="badge no">hex1 === hex2 — a genuine 1-in-millions collision</span>`
      : `<span class="badge ok">hex1 ≠ hex2 ✓</span>`);
  return box;
}

const SAMPLES = 200;

function sampleStrip(hexes) {
  const strip = el("div", "hx-strip");
  hexes.forEach((h) => { const p = el("div", "hx-px"); p.style.background = "#" + h; strip.append(p); });
  return strip;
}

const stat = (n, label) => `<span><b>${n}</b>${label}</span>`;

// ── VARIANT 1 — reject and reroll ───────────────────────────────────────────
function mountReject(host) {
  let prev = null;
  const { inp, out } = controls(host, "red", render);

  function render() {
    const raw = inp.value.trim();
    const i = LONG.indexOf(raw);
    out.innerHTML = "";
    const wrap = el("div", "hx-wrap");

    if (i === -1) {
      prev = null;
      wrap.append(el("div", "result-line", `<span class="badge no">generateHex(${JSON.stringify(raw)}) → "Invalid color"</span><span class="opcount cool"><span class="n">0</span> rolls</span>`));
      wrap.append(invalidPanel(raw));
      wrap.append(el("div", "note", `The guard runs before the loop, which matters more than it looks: the loop below has no exit condition of its own. It spins until a roll wins, and for an input with no channel to win, nothing ever would.`));
      out.append(wrap);
      return;
    }

    const { rgb, log } = rollReject(i, Math.random);
    const hex = toHex(rgb);
    const wasted = log.length - 1;

    wrap.append(el("div", "result-line",
      `<span class="badge ok">generateHex("${raw}") → "${hex}"</span>` +
      `<span class="opcount ${wasted > 2 ? "hot" : ""}"><span class="n">${log.length}</span> roll${log.length === 1 ? "" : "s"}, ${wasted} binned</span>`));
    wrap.append(swatchRow(rgb, i));
    wrap.append(relLine(rgb, i));

    const rows = log.map((x, k) => {
      const others = [(i + 1) % 3, (i + 2) % 3];
      const beat = others.filter((o) => x.rgb[o] >= x.rgb[i]);
      const why = x.ok
        ? "kept — beats both"
        : beat.map((o) => `${NAMES[o]} ${x.rgb[o] === x.rgb[i] ? "ties" : "beats"} ${NAMES[i]}`).join(", ") + " → binned";
      return `<tr class="${x.ok ? "yes" : "no"}"><td>${k + 1}</td><td>${x.rgb[0]}</td><td>${x.rgb[1]}</td><td>${x.rgb[2]}</td><td>${toHex(x.rgb)}</td><td class="why">${why}</td></tr>`;
    }).join("");
    wrap.append(el("table", "cmp hx-log",
      `<tr><th>roll</th><th>R</th><th>G</th><th>B</th><th>hex</th><th>verdict</th></tr>${rows}`));

    wrap.append(pairPanel(prev, hex));
    prev = hex;

    // ×200 — one draw is an anecdote; the strip is the output space.
    const runs = Array.from({ length: SAMPLES }, () => rollReject(i, Math.random));
    const attempts = runs.reduce((s, r) => s + r.log.length, 0);
    const uniq = new Set(runs.map((r) => toHex(r.rgb))).size;
    const dom = runs.reduce((s, r) => s + r.rgb[i], 0) / SAMPLES;
    const gap = runs.reduce((s, r) => s + r.rgb[i] - Math.max(r.rgb[(i + 1) % 3], r.rgb[(i + 2) % 3]), 0) / SAMPLES;
    wrap.append(sampleStrip(runs.map((r) => toHex(r.rgb))));
    wrap.append(el("div", "hx-stats",
      stat(SAMPLES, " swatches") + stat(uniq, " distinct") +
      stat((attempts / SAMPLES).toFixed(2), " rolls per call") +
      stat(Math.max(...runs.map((r) => r.log.length)), " worst run") +
      stat(dom.toFixed(0), ` mean ${NAMES[i]}`) + stat(gap.toFixed(0), " mean lead")));

    wrap.append(el("div", "note",
      `Three independent bytes land with the named channel on top only about <b>a third</b> of the time — one channel in three wins, minus the ties — so this loop bins roughly two rolls for every one it keeps, and the strip above cost about <b>${attempts}</b> rolls to produce 200 colours. That is the honest reading of the problem and it passes all seven official tests; what it does not have is an <i>upper bound</i>. Around 6% of calls need eight or more rolls, and nothing in the code says they can't need eighty. Flip to <b>Sample the losers first</b> for the same 200 swatches at exactly 3 draws each — and notice they come out visibly paler.`));
    out.append(wrap);
  }
}

// ── VARIANT 2 — construct it correct ────────────────────────────────────────
function mountBuild(host) {
  let prev = null;
  const { inp, out } = controls(host, "red", render);

  function render() {
    const raw = inp.value.trim();
    const i = LONG.indexOf(raw);
    out.innerHTML = "";
    const wrap = el("div", "hx-wrap");

    if (i === -1) {
      prev = null;
      wrap.append(el("div", "result-line", `<span class="badge no">generateHex(${JSON.stringify(raw)}) → "Invalid color"</span><span class="opcount cool"><span class="n">0</span> draws</span>`));
      wrap.append(invalidPanel(raw));
      wrap.append(el("div", "note", `Same guard, and here it is the only branch in the function — everything after it is straight-line arithmetic that cannot fail.`));
      out.append(wrap);
      return;
    }

    const r = rollBuild(i, Math.random);
    const hex = toHex(r.rgb);

    wrap.append(el("div", "result-line",
      `<span class="badge ok">generateHex("${raw}") → "${hex}"</span>` +
      `<span class="opcount cool"><span class="n">3</span> draws, 0 binned</span>`));
    wrap.append(swatchRow(r.rgb, i));
    wrap.append(relLine(r.rgb, i));

    // The band: everything at or below max(losers) is off-limits by construction.
    const pct = (v) => ((v / 255) * 100).toFixed(2) + "%";
    wrap.append(el("div", "hx-rng",
      `<div>the two losers drew <b>${r.rgb[r.a]}</b> and <b>${r.rgb[r.b]}</b> out of 0–254, so the winner may not go at or below <b>${r.mustBeat - 1}</b></div>` +
      `<div class="band">` +
      `<span class="legal" style="left:${pct(r.mustBeat)};right:0;background:${CH_CSS[i]};opacity:.45"></span>` +
      `<span class="cut" style="left:${pct(r.mustBeat)}"></span>` +
      `<span class="pin" style="left:${pct(r.rgb[i])}"></span>` +
      `</div>` +
      `<div><b>${r.room}</b> legal value${r.room === 1 ? "" : "s"} remained (${r.mustBeat}–255); the draw took <b>${r.rgb[i]}</b>${r.room === 1 ? " — the only one it could" : ""}</div>`));

    wrap.append(pairPanel(prev, hex));
    prev = hex;

    const runs = Array.from({ length: SAMPLES }, () => rollBuild(i, Math.random));
    const uniq = new Set(runs.map((x) => toHex(x.rgb))).size;
    const dom = runs.reduce((s, x) => s + x.rgb[i], 0) / SAMPLES;
    const gap = runs.reduce((s, x) => s + x.rgb[i] - (x.mustBeat - 1), 0) / SAMPLES;
    wrap.append(sampleStrip(runs.map((x) => toHex(x.rgb))));
    wrap.append(el("div", "hx-stats",
      stat(SAMPLES, " swatches") + stat(uniq, " distinct") +
      stat("3.00", " draws per call") + stat(3, " worst run") +
      stat(dom.toFixed(0), ` mean ${NAMES[i]}`) + stat(gap.toFixed(0), " mean lead")));

    wrap.append(el("div", "note",
      `<b>× 255, not × 256</b>, is the whole trick: capping the losers at 254 guarantees at least one value above them, so <code class='inl'>max + 1</code> is always a legal winner and the function can never need a second try. Six hundred draws produced the 200 swatches above; the other tab needs about ${Math.round(SAMPLES * 3.02)} rolls — some ${(Math.round(SAMPLES * 3.02) * 3).toLocaleString()} bytes — for the same 200. The bill comes due in the colours: the losers here are uniform over 0–254 rather than being conditioned on the winner, so they average <b>127</b> instead of 96 and the mean lead drops from about 64 to about ${gap.toFixed(0)}. Rejection sampling is exactly uniform over all 5,559,680 valid triples; this is not. Nothing in the challenge asks for uniformity — but "correct by construction" bought bounded work with distribution, and that is worth knowing you spent.`));
    out.append(wrap);
  }
}

// ── STEP × 2 ────────────────────────────────────────────────────────────────
const SRC_REJECT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">generateHex</span>(<span class="tok" data-t="param">color</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> i = <span class="tok" data-t="lookup">[<span class="st">"red"</span>, <span class="st">"green"</span>, <span class="st">"blue"</span>].<span class="fn">indexOf</span>(color)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="guard">i === -<span class="nu">1</span></span>) <span class="k">return</span> <span class="st">"Invalid color"</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="tok" data-t="loop">;;</span>) {` },
  { ln: 5, html: `    <span class="k">const</span> rgb = <span class="tok" data-t="roll">[<span class="nu">0</span>, <span class="nu">1</span>, <span class="nu">2</span>].<span class="fn">map</span>(() =&gt; Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() * <span class="nu">256</span>))</span>;` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="win">win = rgb[i]</span>;` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="test">win &gt; rgb[(i + <span class="nu">1</span>) % <span class="nu">3</span>] &amp;&amp; win &gt; rgb[(i + <span class="nu">2</span>) % <span class="nu">3</span>]</span>)` },
  { ln: 8, html: `      <span class="k">return</span> <span class="tok" data-t="ret">rgb.<span class="fn">map</span>((v) =&gt; v.<span class="fn">toString</span>(<span class="nu">16</span>).<span class="fn">padStart</span>(<span class="nu">2</span>, <span class="st">"0"</span>)).<span class="fn">join</span>(<span class="st">""</span>).<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `}` },
];

const SRC_BUILD = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">generateHex</span>(<span class="tok" data-t="param">color</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> i = <span class="tok" data-t="lookup">[<span class="st">"red"</span>, <span class="st">"green"</span>, <span class="st">"blue"</span>].<span class="fn">indexOf</span>(color)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="guard">i === -<span class="nu">1</span></span>) <span class="k">return</span> <span class="st">"Invalid color"</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="others">a = (i + <span class="nu">1</span>) % <span class="nu">3</span>, b = (i + <span class="nu">2</span>) % <span class="nu">3</span></span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="zero">rgb = [<span class="nu">0</span>, <span class="nu">0</span>, <span class="nu">0</span>]</span>;` },
  { ln: 6, html: `  <span class="tok" data-t="la">rgb[a] = Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() * <span class="nu">255</span>)</span>;` },
  { ln: 7, html: `  <span class="tok" data-t="lb">rgb[b] = Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() * <span class="nu">255</span>)</span>;` },
  { ln: 8, html: `  <span class="k">const</span> <span class="tok" data-t="beat">mustBeat = Math.<span class="fn">max</span>(rgb[a], rgb[b]) + <span class="nu">1</span></span>;` },
  { ln: 9, html: `  <span class="tok" data-t="draw">rgb[i] = mustBeat + Math.<span class="fn">floor</span>(Math.<span class="fn">random</span>() * (<span class="nu">256</span> - mustBeat))</span>;` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">rgb.<span class="fn">map</span>((v) =&gt; v.<span class="fn">toString</span>(<span class="nu">16</span>).<span class="fn">padStart</span>(<span class="nu">2</span>, <span class="st">"0"</span>)).<span class="fn">join</span>(<span class="st">""</span>).<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 11, html: `}` },
];

// Presets are built FROM the cases array, so adding a case cannot orphan it.
const STEP_PRESETS = CASES.map((c) => `${c.color} | ${c.seed}`);
const splitCase = (raw) => {
  const [c = "", s = ""] = String(raw).split("|");
  const seed = Math.floor(Number(s.trim()));
  return { color: c.trim(), seed: Number.isFinite(seed) && seed > 0 ? seed : 1 };
};
const STEP_INPUT = { type: "text", label: "color | seed =", value: "blue | 15", presets: STEP_PRESETS, hint: "color | seed" };

// The seed note, said once per trace at the first draw rather than in a tooltip —
// swapping Math.random for a seeded generator is a real design decision, and a reader
// who doesn't know it happened will mistrust the whole panel the first time they
// press Reset and get the identical run back.
const SEED_NOTE = (seed) => `The shipped function calls <code class='inl'>Math.random()</code>. A debugger cannot: stepping has to be reproducible, so this trace runs a small seeded generator (mulberry32) instead, keyed on the <b>${seed}</b> in the input. Change that number for a different run of the same code.`;

function traceReject(raw) {
  const { color, seed } = splitCase(raw);
  const i = LONG.indexOf(color);
  const rand = rng(seed);
  const steps = [];
  const log = [];
  let rgb, win, attempt = 0;
  const S = (line, note, x = {}) => {
    const vars = { color: JSON.stringify(color) };
    if (line >= 2) vars.i = i;
    // rgb and win are declared INSIDE the loop body — at line 4 the previous
    // iteration's block is gone and the next one hasn't started, so they are absent.
    if (line >= 5 && line <= 8) vars.rgb = `[${rgb.join(", ")}]`;
    if (line >= 6 && line <= 8) vars.win = win;
    const structs = log.length ? [{ label: "rolls", items: log.slice(), newest: !!x.fresh }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `generateHex("${color}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `<b>generateHex("${color}")</b>. There is no expected answer to compute — the grader re-derives properties from whatever comes back: six characters, all hex, and the named channel <i>strictly above</i> the other two. It also calls this function <b>twice</b> and asserts the two results differ, which is the constraint that rules out every fixed answer.`, { focus: "param" });

  S(2, i === -1
    ? `<code class='inl'>indexOf("${color}")</code> is <b>-1</b> — not one of the three.`
    : `<code class='inl'>indexOf("${color}")</code> is <b>${i}</b>. One lookup does two jobs: it validates the input <i>and</i> hands back the channel's position in the RGB triple, so nothing below this line ever mentions a colour name again.`,
    { focus: "lookup", changed: ["i"] });

  S(3, i === -1
    ? `<b>Return "Invalid color"</b> — before a single byte is rolled. The guard has to come first: the loop below has no exit test of its own, so with no channel to win it would spin forever.`
    : `Not -1, so there is a channel to make dominant.`,
    { focus: "guard", eval: { expr: `i === -1`, val: i === -1 }, done: i === -1, result: i === -1 ? `"Invalid color"` : undefined, ret: i === -1 ? { value: `"Invalid color"` } : undefined });
  if (i === -1) return steps;

  const cap = 40;
  for (;;) {
    attempt++;
    S(4, attempt === 1
      ? `<code class='inl'>for (;;)</code> — a loop with no condition and no counter. It ends only by <code class='inl'>return</code>, which is what rejection sampling looks like written down: draw from the easy distribution, and keep drawing until the draw happens to land inside the one you wanted.`
      : `Roll <b>${attempt}</b>. Note what is <i>not</i> in the panel: <code class='inl'>rgb</code> and <code class='inl'>win</code> are declared inside the loop body, so between iterations they genuinely do not exist — the previous roll is not carried anywhere, and nothing is learned from it.`,
      { focus: "loop" });

    rgb = [0, 1, 2].map(() => Math.floor(rand() * 256));
    S(5, attempt === 1
      ? `Three independent bytes: <b>${rgb.join(", ")}</b>. <code class='inl'>Math.random()</code> is in <code class='inl'>[0, 1)</code>, so <code class='inl'>× 256</code> floored covers <b>0–255</b> — the full range each channel is allowed. ${SEED_NOTE(seed)}`
      : `Three fresh bytes: <b>${rgb.join(", ")}</b>. Independent of the last roll in every sense — same distribution, no memory.`,
      { focus: "roll", changed: ["rgb"], fresh: true });

    win = rgb[i];
    S(6, `<b>win = rgb[${i}] = ${win}</b> — the ${LONG[i]} channel, the one that has to come out on top.`, { focus: "win", changed: ["win"] });

    const a = (i + 1) % 3, b = (i + 2) % 3;
    const ok = win > rgb[a] && win > rgb[b];
    const tie = !ok && (win === rgb[a] || win === rgb[b]) && win >= rgb[a] && win >= rgb[b];
    const losers = [a, b].filter((o) => rgb[o] >= win);
    S(7, ok
      ? `<b>${win} &gt; ${rgb[a]}</b> and <b>${win} &gt; ${rgb[b]}</b> — both hold, so this roll is the answer.`
      : tie
        ? `<b>${win} &gt; ${rgb[losers[0]]}</b> is <b>false</b> — ${NAMES[losers[0]]} <i>tied</i> ${NAMES[i]} at ${win}. ${LONG[i]} did not lose, and the roll is thrown away anyway, because the grader's assertion is <code class='inl'>isAbove</code> and not <code class='inl'>isAtLeast</code>. Write <code class='inl'>&gt;=</code> here and the code passes every hand-check you would think to do and still fails three official tests.`
        : `<b>${win} &gt; ${rgb[losers[0]]}</b> is <b>false</b> — ${NAMES[losers[0]]} beat ${NAMES[i]}${losers.length > 1 ? `, and so did ${NAMES[losers[1]]}` : ""}. Bin the whole roll; the two bytes that were fine go in the bin with it.`,
      { focus: "test", eval: { expr: `${win} > ${rgb[a]} && ${win} > ${rgb[b]}`, val: ok } });

    log.push(`${toHex(rgb)} ${ok ? "✓" : "✗"}`);
    if (ok) {
      const hex = toHex(rgb);
      const padded = rgb.filter((v) => v < 16).length;
      S(8, `<code class='inl'>toString(16)</code> per channel, then <code class='inl'>padStart(2, "0")</code> — ${padded
        ? `and it earns its keep right here: ${padded === 1 ? "one channel is" : `${padded} channels are`} below 16, so <code class='inl'>toString(16)</code> gives a <i>single</i> digit and the string would be ${6 - padded} characters without the pad.`
        : `every channel is 16 or more here, so nothing is padded — which is exactly why dropping it survives testing. Roughly one call in six has a channel below 16 and comes back five characters long, failing the length and regex assertions together.`} <b>Return "${hex}"</b> after <b>${attempt}</b> roll${attempt === 1 ? "" : "s"}, ${attempt - 1} of them binned.`,
        { focus: "ret", done: true, result: `"${hex}"`, ret: { value: `"${hex}"` } });
      return steps;
    }
    if (attempt >= cap) {
      S(4, `Stopped at <b>${cap}</b> rolls for the sake of this panel. The real loop has no such stop — that is the point of the tab next door.`, { focus: "loop", done: true, result: "(capped)" });
      return steps;
    }
  }
}

function traceBuild(raw) {
  const { color, seed } = splitCase(raw);
  const i = LONG.indexOf(color);
  const rand = rng(seed);
  const steps = [];
  const rgb = [0, 0, 0];
  let a, b, mustBeat;
  const S = (line, note, x = {}) => {
    const vars = { color: JSON.stringify(color) };
    if (line >= 2) vars.i = i;
    if (line >= 4) { vars.a = a; vars.b = b; }
    if (line >= 8) vars.mustBeat = mustBeat;
    const structs = line >= 5
      ? [{ label: "rgb", items: rgb.map((v, k) => `${NAMES[k]} ${v}`), newest: false }]
      : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `generateHex("${color}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `The same <b>generateHex("${color}")</b>, and the same seed as the reject tab — so the first two bytes drawn below are the <i>identical</i> two bytes. The difference is what happens to the third.`, { focus: "param" });

  S(2, i === -1
    ? `<code class='inl'>indexOf("${color}")</code> is <b>-1</b>.`
    : `<code class='inl'>indexOf("${color}")</code> is <b>${i}</b> — validation and channel index in one lookup.`,
    { focus: "lookup", changed: ["i"] });

  S(3, i === -1
    ? `<b>Return "Invalid color"</b>. This <code class='inl'>if</code> is the only branch in the whole function; everything after it is straight-line arithmetic with no way to fail.`
    : `Valid, so carry on. This is the only branch there is.`,
    { focus: "guard", eval: { expr: `i === -1`, val: i === -1 }, done: i === -1, result: i === -1 ? `"Invalid color"` : undefined, ret: i === -1 ? { value: `"Invalid color"` } : undefined });
  if (i === -1) return steps;

  a = (i + 1) % 3; b = (i + 2) % 3;
  S(4, `<b>a = ${a}</b> and <b>b = ${b}</b> — the two channels that have to lose. Modular arithmetic rather than three cases: whichever colour was named, "the other two" is <code class='inl'>(i+1)%3</code> and <code class='inl'>(i+2)%3</code>, so no branch on the colour name survives past line 2.`, { focus: "others", changed: ["a", "b"] });

  S(5, `Start from <b>[0, 0, 0]</b>. The order the slots get filled is the whole idea: <b>losers first</b>, so that by the time the winner is drawn its floor is already known.`, { focus: "zero" });

  rgb[a] = Math.floor(rand() * 255);
  S(6, `<b>rgb[${a}] = ${rgb[a]}</b>. Look at the multiplier: <code class='inl'>× 255</code>, not <code class='inl'>× 256</code>, which caps a loser at <b>254</b>. That single character is what makes the rest of the function total — a loser of 255 would leave nothing above it, and the winner would have no legal value at all.`, { focus: "la", changed: ["rgb"] });

  rgb[b] = Math.floor(rand() * 255);
  S(7, `<b>rgb[${b}] = ${rgb[b]}</b>, capped the same way. The two losers are drawn independently and neither one knows about the winner — which is precisely why this version's colours come out paler than the reject tab's.`, { focus: "lb", changed: ["rgb"] });

  mustBeat = Math.max(rgb[a], rgb[b]) + 1;
  S(8, `<b>max(${rgb[a]}, ${rgb[b]}) + 1 = ${mustBeat}</b> — the smallest value that is <i>strictly</i> above both. The <b>+ 1</b> is the whole <code class='inl'>isAbove</code>-not-<code class='inl'>isAtLeast</code> distinction, written down once here instead of being re-tested on every roll forever.`, { focus: "beat", changed: ["mustBeat"] });

  const room = 256 - mustBeat;
  rgb[i] = mustBeat + Math.floor(rand() * room);
  S(9, `<b>${room}</b> value${room === 1 ? "" : "s"} remain legal — <b>${mustBeat}</b> to <b>255</b> — and the draw takes <b>${rgb[i]}</b>.${room === 1 ? ` Exactly one was available, so the draw was a formality: a loser reached <b>254</b>, the ceiling, and the only value strictly above it is <b>255</b> — the winner is forced to <b>FF</b>. Still correct, still one pass, and this is where you can watch the construction run out of room.` : ` Dominance is now true <i>by construction</i>: there is no test to fail and no roll to throw away, because the value was drawn out of a range that could not produce a losing colour.`}`, { focus: "draw", changed: ["rgb"] });

  const hex = toHex(rgb);
  const padded = rgb.filter((v) => v < 16).length;
  S(10, `Same formatting as the other tab, and the same reason for <code class='inl'>padStart</code>: ${padded ? `${padded === 1 ? "one channel is" : `${padded} channels are`} below 16 here and would render as a single digit` : `nothing needs padding on this roll, which is what makes it so easy to leave out — about one call in eight comes back five characters long without it`}. <b>Return "${hex}"</b> — three draws, no rerolls, and that count does not depend on the input or on luck.`,
    { focus: "ret", done: true, result: `"${hex}"`, ret: { value: `"${hex}"` } });
  return steps;
}

export default {
  n: 21, id: "hexgen", title: "Hex Generator", dates: ["2025-08-31"],
  statement: `Given a named CSS colour — <code class="inl">"red"</code>, <code class="inl">"green"</code> or <code class="inl">"blue"</code> — return a <b>random</b> six-character hex code (no <code class="inl">#</code>) in which that channel's value is <b>greater than</b> both of the others. Anything else returns <code class="inl">"Invalid color"</code>. <span class="rule">Example: <code class="inl">generateHex("red")</code> → <code class="inl">"FF0000"</code>, or <code class="inl">"B80974"</code>, or any of the 5,559,680 others — and the grader calls it twice to check you can produce more than one.</span>`,
  variants: [
    {
      name: "Reroll until it wins", cost: "O(1) expected — ~3.02 rolls",
      approach: `The direct reading of the statement: a random colour is three random bytes, so roll three, check whether the named one came out on top, and if it didn't, throw all three away and roll again. It is correct, it passes all seven official tests, and it is what most people write first — the wasteful act is not a mistake but the <b>binning</b>: three bytes land with a given channel strictly highest only about a third of the time, so two rolls in three are discarded, and the two bytes that were perfectly fine get discarded with them. Watch the <b>verdict</b> column for the rejection you would not have predicted — <code class='inl'>[60, 103, 103]</code> is thrown out for blue not because blue <i>lost</i> but because green <b>tied</b> it, and the grader's assertion is <code class='inl'>isAbove</code>. The real cost is the shape of the loop rather than its average: <code class='inl'>for (;;)</code> has no bound, about 6% of calls take eight rolls or more, and nothing in the code caps it. One thing it has that the other tab does not, though, and that no amount of counting rolls will show you: throwing away every roll that misses leaves the survivors <b>exactly uniform</b> over all 5,559,680 valid triples. If these colours ever had to be evenly spread rather than merely varied, this is the version to keep.`,
      code: `// Roll three bytes; if the named channel didn't come out strictly on top, bin
// the whole roll and go again. Correct, and ~2 of every 3 rolls are wasted.
function generateHex(color: string): string {
  const i = ["red", "green", "blue"].indexOf(color);
  if (i === -1) return "Invalid color";
  for (;;) {                                   // no bound — it ends by returning
    const rgb = [0, 1, 2].map(() => Math.floor(Math.random() * 256));
    const win = rgb[i];
    if (win > rgb[(i + 1) % 3] && win > rgb[(i + 2) % 3])   // strict, so a tie loses
      return rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
}`,
      mount: mountReject,
    },
    {
      name: "Step: reroll", cost: "one roll per stop",
      approach: `Start on <b>blue | 15</b>, where the first roll is <code class='inl'>[60, 103, 103]</code> and is binned for a <b>tie</b> rather than a loss — the single most instructive step in this challenge. Then <b>red | 3</b> for the lucky third that ends on the first roll, <b>red | 11</b> for ten rolls in a row, and <b>yellow | 1</b> to return before a byte is drawn. The seed in the input is not decoration: <code class='inl'>Math.random</code> is swapped for a seeded generator so that stepping is reproducible, and changing the number gives you a different run of identical code. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_REJECT, trace: traceReject, input: STEP_INPUT }),
    },
    {
      name: "Sample the losers first", cost: "O(1) worst case — 3 draws",
      approach: `<b>This is a trade, not an upgrade</b> — it buys a hard bound on the work and pays for it in the shape of the randomness, so it is the tab to reach for when the <i>work</i> is what matters and the wrong one when the <i>spread</i> is. The method: stop testing the roll and make it impossible to fail. Draw the two <i>losing</i> channels first, from <code class='inl'>0–254</code> rather than <code class='inl'>0–255</code> — that one-character change is what guarantees at least one value above them — then draw the winner out of <code class='inl'>[max + 1, 255]</code>. The <code class='inl'>+ 1</code> encodes "strictly above" once, in the range, instead of re-checking it on every attempt, and the function loses its loop and its only failure mode along with it: exactly three draws, always, with no tail. Be honest about the size of that win. On any single call it is microseconds either way; what actually changed is that the work is now <b>bounded</b>. Now the bill. Rejection sampling is exactly uniform over all 5,559,680 valid triples and this is not, because the losers here are drawn without reference to the winner — they average <b>127</b> instead of 96, the mean lead falls from about 64 to about 43, and the 200-swatch strip below comes out visibly paler than the one on the other tab. Nothing in this challenge asks for uniformity, so the trade is a good one <i>here</i>; the moment a caller wants these colours to be evenly spread, it stops being one.`,
      code: `// Construct a winner instead of testing for one: cap the losers at 254, then
// draw the dominant channel out of the range that is left above them.
function generateHex(color: string): string {
  const i = ["red", "green", "blue"].indexOf(color);
  if (i === -1) return "Invalid color";
  const a = (i + 1) % 3, b = (i + 2) % 3;      // the two that must lose
  const rgb = [0, 0, 0];
  rgb[a] = Math.floor(Math.random() * 255);    // 0..254 — 255 would leave no room
  rgb[b] = Math.floor(Math.random() * 255);
  const mustBeat = Math.max(rgb[a], rgb[b]) + 1;             // strictly above: the +1
  rgb[i] = mustBeat + Math.floor(Math.random() * (256 - mustBeat));
  return rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}`,
      mount: mountBuild,
    },
    {
      name: "Step: sample the losers", cost: "three draws, no rerolls",
      approach: `The same default case, <b>blue | 15</b>, and the same seed — so lines 6 and 7 draw the <i>same</i> 60 and 103 the reject tab drew, and you can watch the third byte that got binned over there be lifted into <code class='inl'>[104, 255]</code> here and kept. Then try <b>green | 37</b>, where a loser draws <b>254</b> and the winner's legal range collapses to the single value <code class='inl'>FF</code>: still one pass, still correct, and visibly out of room. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BUILD, trace: traceBuild, input: STEP_INPUT }),
    },
  ],
};
