// #350 · Letter Distance — the alphabet is a ring, so every pair folds at 13.
// Two equal-length strings, one index walking both, and an answer that is a SUM
// of independent per-position folds: min(gap, 26 - gap). The wrap is the whole
// problem — |a - b| alone reads a↔z as 25 when the statement says it is 1.
//
// ONE APPROACH, deliberately. The nameable brute here is #336's ring-search —
// widen d = 0, 1, 2… probing clockwise and counter-clockwise until one lands —
// with 12 swapped for 26. It is correct, it is slower, and its cost would be
// visible on an op counter. But it is the *same lesson the neighbouring module
// already teaches*, on a bigger wheel; what is new in #350 is the shape around
// the fold, not the fold. A second tab would add a tab, not an insight, so this
// ships as Solution + Step through — CONTRIBUTING Tier 3's normal outcome.
import { el, esc, mountDebugger } from "../shared.js";

// PROVENANCE — cases 1–6 are freeCodeCamp's official six, in the grader's order.
// 7–9 are mine, each for a branch the official set never isolates:
//   7  "az"/"za"      — the seam itself: the statement's own a↔z = 1 rule, alone.
//   8  "same"/"same"  — the degenerate zero; identical letters, gap 0 wins over
//                       the 26-step lap all the way round.
//   9  "an"/"na"      — the fold point: gap 13 ties 26 − gap 13, the largest
//                       distance any two letters can be, twice over.
// Every case lands on a different outcome: 1 all-adjacent no-wrap · 2 every pair
// wraps (23 → 3) · 3 five identical pairs contribute 0 · 4 one wrap among eight
// direct · 5 all direct but three gaps ≥ 10 · 6 the official maximum, ending on an
// exact tie · 7 pure seam · 8 zero · 9 every pair maximal.
const CASES = [
  { a: "abc", b: "bcd", want: 3, official: true },
  { a: "abc", b: "xyz", want: 9, official: true },
  { a: "encrypt", b: "decrypt", want: 10, official: true },
  { a: "algorithm", b: "codeblock", want: 43, official: true },
  { a: "lobster", b: "penguin", want: 47, official: true },
  { a: "alligator", b: "crocodile", want: 55, official: true },
  { a: "az", b: "za", want: 2 },
  { a: "same", b: "same", want: 0 },
  { a: "an", b: "na", want: 26 },
];

const N = 26;
const ALPHA = "abcdefghijklmnopqrstuvwxyz";

// One position's worth of work, in the order the solution does it. `other` is the
// way round past 'z'; the two routes always sum to 26, which is why `d` ≤ 13.
function pairsOf(s1, s2) {
  const out = [];
  const n = Math.min(s1.length, s2.length);
  for (let i = 0; i < n; i++) {
    const a = s1.charCodeAt(i) - 97, b = s2.charCodeAt(i) - 97;
    const gap = Math.abs(a - b);
    out.push({ i, c1: s1[i], c2: s2[i], a, b, gap, other: N - gap, d: Math.min(gap, N - gap) });
  }
  return out;
}
const sumOf = (ps) => ps.reduce((s, p) => s + p.d, 0);
const solve = (s1, s2) => sumOf(pairsOf(s1, s2));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ld-wrap { display:grid; grid-template-columns:300px minmax(0,1fr); gap:18px; align-items:start; }
    @media (max-width:760px) { .ld-wrap { grid-template-columns:1fr; } }
    .ld-svg { width:300px; height:300px; display:block; }
    .ld-svg .ring { fill:var(--panel-2); stroke:var(--border); }
    .ld-svg .ring.a { fill:color-mix(in srgb, var(--accent) 30%, transparent); stroke:var(--accent); }
    .ld-svg .ring.b { fill:color-mix(in srgb, var(--c4) 30%, transparent); stroke:var(--c4); }
    .ld-svg .ring.ab { fill:color-mix(in srgb, var(--good) 30%, transparent); stroke:var(--good); }
    .ld-svg .gl { font:700 10px var(--mono); fill:var(--text); text-anchor:middle; pointer-events:none; }
    .ld-svg .pick { font:700 8.5px var(--mono); text-anchor:middle; pointer-events:none; letter-spacing:.06em; }
    .ld-svg .pick.a { fill:var(--accent); } .ld-svg .pick.b { fill:var(--c4); }
    .ld-svg .arc { fill:none; stroke-linecap:round; }
    .ld-svg .arc.win { stroke:var(--accent); stroke-width:3.5; }
    .ld-svg .arc.lose { stroke:var(--border); stroke-width:2.5; stroke-dasharray:3 5; }
    .ld-svg .hop { fill:var(--accent); }
    .ld-strip { display:flex; flex-wrap:wrap; gap:5px; margin:4px 0 2px; }
    .ld-pair { display:flex; flex-direction:column; align-items:center; gap:1px; cursor:pointer;
               border:1px solid var(--border); background:var(--panel-2); border-radius:7px; padding:4px 7px; }
    .ld-pair:hover { border-color:var(--accent); }
    .ld-pair .p { font:700 12px var(--mono); color:var(--muted); }
    .ld-pair .d { font:800 15px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; }
    .ld-pair.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 15%, transparent); }
    .ld-pair.on .p { color:var(--text); }
    .ld-pair.wrapped { border-color:var(--warn); }
    .ld-pair.wrapped .d { color:var(--warn); }
    .ld-pair.zero .d { color:var(--muted); }
    .ld-eq { font:12.5px var(--mono); color:var(--muted); margin:8px 0 4px; line-height:1.7; }
    .ld-eq b { color:var(--text); } .ld-eq .win { color:var(--accent); } .ld-eq .warn { color:var(--warn); }
    .ld-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
              color:var(--muted); margin:12px 0 4px; }
    .ld-al { display:flex; width:max-content; flex-direction:column; gap:1px; margin:6px 0 1px; font:700 12px var(--mono); }
    .ld-al .r { display:flex; gap:2px; }
    .ld-al .c { width:15px; text-align:center; border-radius:3px; color:var(--muted); }
    .ld-al .c.on { background:color-mix(in srgb, var(--accent) 30%, transparent); color:var(--text); }
  `));
}

// ── The alphabet ring ───────────────────────────────────────────────────────
const CX = 150, CY = 150, R_NODE = 128, R_ARC = 98;
const pt = (k, r) => {
  const ang = (-90 + k * (360 / N)) * Math.PI / 180;
  return { x: +(CX + r * Math.cos(ang)).toFixed(2), y: +(CY + r * Math.sin(ang)).toFixed(2) };
};
// An arc hugging the ring from position `from`, `steps` positions clockwise
// (negative runs counter-clockwise).
const arcPath = (from, steps, r) => {
  const cw = steps >= 0, len = Math.abs(steps);
  const p = pt(from, r), q = pt(((from + steps) % N + N) % N, r);
  return `M ${p.x} ${p.y} A ${r} ${r} 0 ${len > N / 2 ? 1 : 0} ${cw ? 1 : 0} ${q.x} ${q.y}`;
};
const hopDot = (k, big) =>
  `<circle class="hop" cx="${pt(k, R_ARC).x}" cy="${pt(k, R_ARC).y}" r="${big ? 4 : 2.2}"/>`;

// Draws one pair: the route the fold KEPT is lit, the route it rejected is
// ghosted — the picture of `Math.min` making a choice.
function ringSvg(p) {
  let arcs = "", hops = "";
  if (p && p.d > 0) {
    const cw = (p.b - p.a + N) % N;         // steps clockwise from a to b
    const from = cw <= N / 2 ? p.a : p.b;   // start the short arc at whichever end
    arcs += `<path class="arc lose" d="${arcPath(from, -(N - p.d), R_ARC)}"/>`;
    arcs += `<path class="arc win" d="${arcPath(from, p.d, R_ARC)}"/>`;
    for (let s = 0; s <= p.d; s++) hops += hopDot((from + s) % N, s === 0 || s === p.d);
  } else if (p) {
    hops += hopDot(p.a, true);
  }
  const nodes = ALPHA.split("").map((ch, k) => {
    const q = pt(k, R_NODE);
    const role = !p ? "" : k === p.a && k === p.b ? "ab" : k === p.a ? "a" : k === p.b ? "b" : "";
    // Tagged "a=17", not "a" — a bare letter beside the lowercase ring reads as
    // one of the ring's own letters, and the index is the number the code uses.
    const tag = !p ? "" : k === p.a && k === p.b ? `a=b=${p.a}` : k === p.a ? `a=${p.a}` : k === p.b ? `b=${p.b}` : "";
    return `<g><circle class="ring ${role}" cx="${q.x}" cy="${q.y}" r="9.5" stroke-width="1.4"/>` +
      `<text class="gl" x="${q.x}" y="${q.y + 3.6}">${ch}</text>` +
      (tag ? `<text class="pick ${role === "ab" ? "a" : role}" x="${q.x}" y="${q.y - 13}">${tag}</text>` : "") + `</g>`;
  }).join("");
  return `<svg class="ld-svg" viewBox="0 0 300 300" role="img" aria-label="${
    p ? `Alphabet ring: ${esc(p.c1)} to ${esc(p.c2)}, shortest distance ${p.d}` : "Alphabet ring"}">
    <circle cx="${CX}" cy="${CY}" r="${R_ARC}" fill="none" stroke="var(--border)" stroke-width="1" opacity=".4"/>
    ${arcs}${hops}${nodes}
  </svg>`;
}

// ── The official-test scoreboard ────────────────────────────────────────────
// Runs freeCodeCamp's own six through the same `solve` the demo uses, so the
// claim "this passes" is re-derived on every render rather than asserted.
function scoreboard() {
  const box = el("div");
  const rows = CASES.filter((c) => c.official).map((c) => ({ ...c, got: solve(c.a, c.b) }));
  const pass = rows.filter((r) => r.got === r.want).length;
  box.append(el("div", "ld-lbl", `Official freeCodeCamp tests · ${pass} of ${rows.length} passing`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">case</span><span class="exp">expected</span><span class="got">got</span>`));
  rows.forEach((r) => {
    box.append(el("div", "srow" + (r.got === r.want ? "" : " bad"),
      `<span class="mark">${r.got === r.want ? "✓" : "✗"}</span>` +
      `<span class="k">"${esc(r.a)}", "${esc(r.b)}"</span>` +
      `<span class="exp">${r.want}</span><span class="got">${r.got}</span>`));
  });
  return box;
}

// ── Variant 1 — the solution demo ───────────────────────────────────────────
function mountSolve(host) {
  ensureStyle();
  // Opens on "algorithm"/"codeblock": nine pairs, eight of them direct and one
  // (r→b) where the wrap wins — both branches of the fold on one screen.
  const OPEN = CASES.findIndex((c) => c.a === "algorithm");
  let s1 = CASES[OPEN].a, s2 = CASES[OPEN].b, sel = 0;

  const i1 = el("input"); i1.type = "text"; i1.value = s1; i1.style.width = "170px";
  const i2 = el("input"); i2.type = "text"; i2.value = s2; i2.style.width = "170px";
  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "str1"), i1, el("span", "ctl-label", "str2"), i2);

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", `"${esc(c.a)}"·"${esc(c.b)}"`);
    chip.title = `expects ${c.want}${c.official ? " (official)" : " (added here)"}`;
    chip.onclick = () => { i1.value = c.a; i2.value = c.b; read(true); };
    chips.append(chip);
  });

  const head = el("div", "demo-head");
  const wrap = el("div", "ld-wrap");
  const left = el("div"), right = el("div");
  wrap.append(left, right);
  host.append(ctl, chips, head, wrap);

  // Re-read the two fields; `reset` re-picks the interesting position to show.
  function read(reset) {
    s1 = i1.value; s2 = i2.value;
    const ps = pairsOf(s1, s2);
    if (reset || sel >= ps.length) sel = Math.max(0, ps.findIndex((p) => p.d < p.gap));
    render();
  }
  i1.oninput = i2.oninput = () => read(true);

  function render() {
    const ps = pairsOf(s1, s2);
    const total = sumOf(ps);
    const p = ps[sel];

    head.innerHTML =
      `<span class="opcount cool"><span class="n">${total}</span> total distance</span>` +
      `<span class="muted mono">${ps.length} position${ps.length === 1 ? "" : "s"} × 3 ops — one pass, no search</span>`;

    left.innerHTML = ringSvg(p);

    right.innerHTML = "";
    if (s1.length !== s2.length)
      right.append(el("div", "note",
        `The challenge promises <b>equal-length</b> strings; these differ (${s1.length} vs ${s2.length}), so only the first <b>${ps.length}</b> position${ps.length === 1 ? "" : "s"} pair up. The solution reads <code class='inl'>str1.length</code> and trusts the promise.`));
    if (/[^a-z]/.test(s1 + s2))
      right.append(el("div", "note",
        `Input is promised <b>lowercase letters only</b>. Anything else still gets <code class='inl'>charCodeAt - 97</code> applied to it, which lands off the ring — so the numbers below stop meaning "letters".`));

    right.append(el("div", "ld-lbl", "Every position, folded — click one to trace it on the ring"));
    const strip = el("div", "ld-strip");
    ps.forEach((q) => {
      const cls = "ld-pair" + (q.i === sel ? " on" : "") + (q.d < q.gap ? " wrapped" : "") + (q.d === 0 ? " zero" : "");
      const card = el("button", cls, `<span class="p">${esc(q.c1)}→${esc(q.c2)}</span><span class="d">${q.d}</span>`);
      card.onclick = () => { sel = q.i; render(); };
      strip.append(card);
    });
    right.append(strip);
    if (!ps.length) right.append(el("div", "muted", "Type two strings to compare."));

    if (p) {
      right.append(el("div", "ld-eq",
        `position <b>${p.i}</b>: <b>'${esc(p.c1)}'</b> = ${p.a}, <b>'${esc(p.c2)}'</b> = ${p.b}<br>` +
        `gap = |${p.a} − ${p.b}| = <b>${p.gap}</b>, the other way round = 26 − ${p.gap} = <b>${p.other}</b><br>` +
        (p.d === 0
          ? `same letter → <span class="win">0</span>; there is nothing to walk`
          : `min(<span class="${p.d === p.gap ? "win" : ""}">${p.gap}</span>, <span class="${p.d === p.other ? "warn" : ""}">${p.other}</span>) = <b>${p.d}</b>` +
            (p.gap === p.other ? ` — a dead heat at <b>13</b>, the farthest two letters can be` :
             p.d === p.other ? ` — <span class="warn">the wrap wins</span>: crossing the z→a seam is ${p.gap - p.d} shorter` :
             ` — the straight-line route was already shorter, so the wrap changes nothing`))));
      right.append(el("div", "ld-eq",
        `sum = ${ps.map((q) => q.i === sel ? `<b>${q.d}</b>` : q.d).join(" + ")} = <b>${total}</b>`));
    }

    right.append(el("div", "result-line",
      `<span class="badge ok">letterDistance = ${total}</span>` +
      (ps.length ? `<span class="tag mono">max possible ${ps.length * 13}</span>` : "")));
    right.append(scoreboard());
    right.append(el("div", "note",
      `Each position is independent — its neighbours never change its answer — so the whole problem is one pass with a single accumulator. The only real decision is per-pair: <code class='inl'>Math.min(gap, 26 - gap)</code>, because on a ring the two routes always sum to 26.`));
  }
  read(true);
}

const CODE = `// The alphabet is a ring: the two ways round always sum to 26, so fold at 13.
function letterDistance(str1: string, str2: string): number {
  let total = 0;
  for (let i = 0; i < str1.length; i++) {
    const a = str1.charCodeAt(i) - 97;   // 'a' → 0 … 'z' → 25
    const b = str2.charCodeAt(i) - 97;
    const gap = Math.abs(a - b);         // the straight-line way
    const d = Math.min(gap, 26 - gap);   // …or the way round past 'z'
    total += d;
  }
  return total;
}`;

// ── Variant 2 — the step-through ────────────────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">letterDistance</span>(<span class="tok" data-t="param">str1, str2</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> <span class="tok" data-t="total">total = 0</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="icond">i = 0; i &lt; str1.length</span>; i++) {` },
  { ln: 4, html: `    <span class="k">const</span> <span class="tok" data-t="a">a = str1.<span class="fn">charCodeAt</span>(i) - 97</span>;` },
  { ln: 5, html: `    <span class="k">const</span> <span class="tok" data-t="b">b = str2.<span class="fn">charCodeAt</span>(i) - 97</span>;` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="gap">gap = Math.<span class="fn">abs</span>(a - b)</span>;` },
  { ln: 7, html: `    <span class="k">const</span> <span class="tok" data-t="d">d = Math.<span class="fn">min</span>(gap, 26 - gap)</span>;  <span class="cm">// the ring folds at 13</span>` },
  { ln: 8, html: `    <span class="tok" data-t="add">total += d</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">total</span>;` },
  { ln: 11, html: `}` },
];

// The two strings drawn one above the other with position `i` boxed — the
// picture of "one index walks both", rendered into the narration panel.
const alignHtml = (s1, s2, i) => {
  const row = (s) => `<span class="r">${[...s].map((c, k) =>
    `<span class="c${k === i ? " on" : ""}">${esc(c)}</span>`).join("")}</span>`;
  return `<span class="ld-al">${row(s1)}${row(s2)}</span>`;
};

const plural = (k) => (k === 1 ? "" : "s");

function trace(caseNo) {
  const c = CASES[Math.min(CASES.length, Math.max(1, caseNo)) - 1];
  const s1 = c.a, s2 = c.b, n = s1.length;
  const ps = pairsOf(s1, s2);
  const steps = [];
  let total, i, a, b, gap, d;

  // Scope by omission, gated on the declaration line. `i`, `a`, `b`, `gap` and
  // `d` are block-scoped to the loop, so they also DISAPPEAR again at line 10 —
  // and `a`…`d` are absent at line 3, where the next iteration has not declared
  // them yet. str1/str2 are parameters, so their structs stand for the whole call.
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.total = total;
    if (line >= 3 && line <= 9) vars.i = i;
    if (line >= 4 && line <= 9) vars.a = `${a} (${s1[i]})`;
    if (line >= 5 && line <= 9) vars.b = `${b} (${s2[i]})`;
    if (line >= 6 && line <= 9) vars.gap = gap;
    if (line >= 7 && line <= 9) vars.d = d;
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{
        title: `letterDistance("${s1}", "${s2}")`, vars, changed: x.changed || [],
        structs: [{ label: "str1", items: [...s1] }, { label: "str2", items: [...s2] }],
      }],
    });
  };

  S(1, `Sum the shortest alphabet distance at every position of <b>"${s1}"</b> and <b>"${s2}"</b>. The strings are promised <b>equal length</b>, which is what lets a single index walk both — there is no alignment to work out, only ${n} independent little distance questions.${alignHtml(s1, s2, -1)}`, { focus: "param" });

  total = 0;
  S(2, `<b>total = 0</b>. The answer is a sum, so this accumulator is the only state that outlives an iteration — once a position's distance is added, nothing about that position matters again.`, { focus: "total", changed: ["total"] });

  for (i = 0; i < n; i++) {
    const p = ps[i];
    S(3, `Position <b>${i}</b> of ${n}: <b>'${s1[i]}'</b> against <b>'${s2[i]}'</b>. Each position is judged on its own — the letters either side never change this pair's answer, which is why one pass suffices.${alignHtml(s1, s2, i)}`,
      { focus: "icond", changed: ["i"], eval: { expr: `i = ${i} < ${n}`, val: true } });

    a = p.a;
    S(4, `<code class='inl'>'${s1[i]}'.charCodeAt(0)</code> is <b>${a + 97}</b>; subtracting <b>97</b> — the code for <code class='inl'>'a'</code> — rebases it to <b>a = ${a}</b>. Letters can't be subtracted from each other, so the first move is always to turn them into positions on the ring.${alignHtml(s1, s2, i)}`,
      { focus: "a", changed: ["a"] });

    b = p.b;
    S(5, `The same rebasing for <b>'${s2[i]}'</b> gives <b>b = ${b}</b>. Both letters are now points on a 26-position circle, and the question is purely geometric.${alignHtml(s1, s2, i)}`,
      { focus: "b", changed: ["b"] });

    gap = p.gap;
    S(6, `<b>|${a} − ${b}| = ${gap}</b> — the distance if the alphabet were a straight line that dead-ends at <code class='inl'>z</code>. That is one of the two routes, and taking it on faith is exactly the bug the "alphabet is a circle" clause warns about.${alignHtml(s1, s2, i)}`,
      { focus: "gap", changed: ["gap"] });

    d = p.d;
    const flavour = p.d === 0
      ? `Identical letters, so there is nothing to walk — <b>0</b> beats the 26-step lap all the way round.`
      : p.gap === p.other
        ? `A dead heat: <b>13</b> either way. 13 is the fold point of a 26-letter ring, which is why <i>no</i> pair of letters can ever be more than 13 apart.`
        : p.d === p.other
          ? `The wrap wins — stepping backwards past <code class='inl'>a</code> into <code class='inl'>z</code> is <b>${p.gap - p.d}</b> shorter than walking through the middle of the alphabet. This is the case <code class='inl'>Math.abs</code> alone gets wrong.`
          : `The straight-line route was already the shorter one, so the fold changes nothing here — it costs one comparison to <i>prove</i> that, which is cheaper than checking whether a wrap applies.`;
    S(7, `A ring has two routes between any two points and they <b>always sum to 26</b>: <b>${gap}</b> this way, <b>${p.other}</b> the other. Take the smaller → <b>d = ${d}</b>. ${flavour}${alignHtml(s1, s2, i)}`,
      { focus: "d", changed: ["d"], eval: { expr: `gap = ${gap} <= 26 - gap = ${p.other}`, val: gap <= p.other } });

    const before = total;
    total += d;
    S(8, `<b>total = ${before} + ${d} = ${total}</b>. ${i + 1} of ${n} position${plural(n)} folded and banked; <code class='inl'>a</code>, <code class='inl'>b</code>, <code class='inl'>gap</code> and <code class='inl'>d</code> are about to go out of scope and be rebuilt for the next one.${alignHtml(s1, s2, i)}`,
      { focus: "add", changed: ["total"] });
  }

  S(3, `<b>i = ${n}</b> has caught up with <code class='inl'>str1.length</code>, so the loop ends and everything declared inside it — <code class='inl'>i</code>, <code class='inl'>a</code>, <code class='inl'>b</code>, <code class='inl'>gap</code>, <code class='inl'>d</code> — falls out of scope. Only <b>total</b> survives.`,
    { focus: "icond", eval: { expr: `i = ${n} < ${n}`, val: false } });

  S(10, `<b>Return ${total}</b> — ${n} independent folds added up, in one pass and with no search.${c.official ? ` freeCodeCamp's test for <code class='inl'>letterDistance("${s1}", "${s2}")</code> expects <b>${c.want}</b>.` : ` This case isn't freeCodeCamp's; it's here to isolate ${c.a === "az" ? "the a↔z seam the statement names" : c.a === "same" ? "the degenerate zero" : "the 13-13 fold point, the largest distance a letter pair can have"}.`}`,
    { focus: "ret", done: true, result: total });

  return steps;
}

// Opens on "az"/"za" — the statement's own a↔z = 1 rule, and the shortest trace
// that contains the whole insight. Index is looked up, not written down.
const OPEN_CASE = CASES.findIndex((c) => c.a === "az") + 1;
// `max` is bound to CASES.length, so adding a case below can never orphan it.
const STEP_INPUT = {
  label: "case =", value: OPEN_CASE, min: 1, max: CASES.length,
  presets: CASES.map((_, k) => k + 1),
  hint: `1–${CASES.length}: 1–6 official, 7 the a↔z seam, 8 zero, 9 the 13-13 tie`,
};

export default {
  n: 350, id: "letterdist", title: "Letter Distance", dates: ["2026-07-26"],
  statement: `Given two strings of <b>equal length</b>, return the sum of the shortest distances between each pair of characters. The input is lowercase letters only, and <b>the alphabet is treated as a circle</b> — so <code class="inl">a</code> and <code class="inl">z</code> are <b>1</b> apart, not 25. <span class="rule">Example: <code class="inl">letterDistance("abc", "xyz")</code> → <b>9</b>, because each pair is 3 apart the short way round (<code class="inl">a→z→y→x</code>) rather than 23 the long way.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass, 3 ops per letter",
      approach: `Rebase each letter to a number with <code class='inl'>charCodeAt(i) - 97</code>, so <code class='inl'>a</code>…<code class='inl'>z</code> become <b>0</b>…<b>25</b>. Then every position is the same tiny question: two points on a 26-position ring, which way round is shorter? The two routes <b>always sum to 26</b>, so once you know <code class='inl'>gap = |a - b|</code> the answer is <code class='inl'>Math.min(gap, 26 - gap)</code> — no direction bookkeeping, no loop, and it <i>proves</i> the result can never exceed 13. Positions are independent, so the whole problem is that fold plus a running sum. Click any pair to watch the ring: the lit arc is the route the <code class='inl'>min</code> kept, the dashed one is what it rejected.`,
      code: CODE, mount: mountSolve,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Run the solution one line at a time. It opens on <code class='inl'>"az"</code>/<code class='inl'>"za"</code> — the statement's own <b>a↔z is 1</b> rule, where <code class='inl'>gap = 25</code> and the fold turns it into <b>1</b>. Then try case <b>4</b> (<code class='inl'>"algorithm"</code>/<code class='inl'>"codeblock"</code>) to see eight direct pairs and one wrap in the same run, case <b>8</b> for the identical-string zero, and case <b>9</b> where both routes tie at 13. Watch the state panel: <code class='inl'>a</code>, <code class='inl'>b</code>, <code class='inl'>gap</code> and <code class='inl'>d</code> appear only inside the loop body and vanish at the closing brace — they are rebuilt from scratch every position, and <code class='inl'>total</code> is the only thing that carries. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: STEP_INPUT }),
    },
  ],
};
