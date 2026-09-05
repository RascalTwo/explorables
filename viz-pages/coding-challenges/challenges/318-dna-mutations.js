// #318 · DNA Mutations — a "mutation" is a disagreement at a POSITION, not in the sequence.
// Same two strands, two readings:
//   • POSITIONAL — the graded solution. Walk both strands together and collect every
//     index where the bases differ. O(n), one pass, no memory. It defines a mutation
//     purely by position, so it cannot tell a substitution from a shifted frame.
//   • SHIFT-AWARE — beyond the challenge (NOT what freeCodeCamp grades). Slide strand2
//     a few bases left/right, score each alignment by its mismatch count, keep the best.
//     An inserted/deleted base shows up as an offset instead of 26 phantom mutations.
// Load case 5 (the official frame-shift case) and flip the Approach toggle to see
// 26 mutations vs 1 inserted base on identical input.
import { el, mountDebugger } from "../shared.js";

// ── Cases ───────────────────────────────────────────────────────────────────
// PROVENANCE: cases 1–5 are freeCodeCamp's five official test cases, verbatim and in
// order — they are the graded set and every one is reachable in both step-throughs.
// Cases 6–7 are ADDED (mine), because the two official shift cases that matter are
// long (29 and 44 bases) and each added one lands on a branch nothing else reaches:
//   6 — a SHORT positive frame shift, so the two approaches visibly disagree inside a
//       trace you can step end-to-end (official case 5 is the same lesson, 29 bases long).
//   7 — a NEGATIVE shift (a base deleted from strand2's front instead of inserted), the
//       only case that drives the alignment search to a d < 0 offset.
// Every case lands on a different outcome: 1 one substitution · 2 three scattered ·
// 3 no mutations at all · 4 a contiguous four-base run · 5 official frame shift ·
// 6 short frame shift · 7 negative frame shift.
const CASES = [
  { label: "official 1 — one base off", pair: ["ATCG", "ATGG"] },
  { label: "official 2 — three scattered", pair: ["ATGCGTACGTTAGC", "ATGCATACGATTGC"] },
  { label: "official 3 — identical strands", pair: ["GATCTAGCTAGGCTAGCTAG", "GATCTAGCTAGGCTAGCTAG"] },
  { label: "official 4 — a run of four", pair: ["TCAGATCATGGCTAGCTACGATCAGCTAGCATGCATATCGACTG", "TCAGATCATGGCTAGAGCTGATCAGCTAGCATGCATATCGACTG"] },
  { label: "official 5 — the frame shift", pair: ["ACGTCAGTACGCACATGACCATTGACATA", "AACGTCAGTACGCACATGACCATTGACAT"] },
  { label: "added — short frame shift", pair: ["CATCAT", "TCATCA"] },
  { label: "added — shift the other way", pair: ["AGGTCAGC", "GGTCAGCT"] },
];
const HINT = "1–7 · 1–5 are the official cases, 5 is the frame shift";
const PRESETS = CASES.map((_, i) => i + 1);

// ── The two algorithms ──────────────────────────────────────────────────────
// The graded solution. The challenge guarantees equal lengths; we clamp to the
// shorter one anyway so a hand-typed pair can't index past the end.
function detectMutations(strand1, strand2) {
  const mutations = [];
  const n = Math.min(strand1.length, strand2.length);
  for (let i = 0; i < n; i++) if (strand1[i] !== strand2[i]) mutations.push(i);
  return mutations;
}

// Mismatching strand1 indexes when strand2 is slid by `d` bases. Positions that fall
// outside the overlap aren't compared at all — they're the inserted/deleted bases.
function mismatchesAt(s1, s2, d) {
  const mut = [];
  for (let i = 0; i < s1.length; i++) {
    const j = i + d;
    if (j < 0 || j >= s2.length) continue;
    if (s1[i] !== s2[j]) mut.push(i);
  }
  return mut;
}

// Try a small window of frame shifts and keep the cheapest alignment. Score is
// mismatches + |d|, so shifting is never free: a shift has to *earn* its place by
// erasing at least as many mismatches as it costs. 0 is tried first, so on any input
// where nothing is gained the search falls straight back to the graded answer.
const SHIFTS = [0, -1, 1, -2, 2];
function alignBest(strand1, strand2) {
  let best = null;
  const tried = [];
  for (const d of SHIFTS) {
    const mut = mismatchesAt(strand1, strand2, d);
    const score = mut.length + Math.abs(d);
    tried.push({ d, mut, score });
    if (best === null || score < best.score) best = { offset: d, mutations: mut, score };
  }
  return { ...best, tried };
}

// ── Scoped styles (lazy, injected once) ─────────────────────────────────────
// Reuses the kit's .strand/.base/.base.mut/.result-line/.num/.note; only the
// alignment-specific bits (gap cells, unpaired bases, the index ruler, the score
// board) are bespoke, and all of those carry the `dna-` prefix.
let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .dna-lane { display:flex; align-items:center; gap:10px; margin:5px 0; }
    .dna-lbl { flex:none; width:62px; font:700 10px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); text-align:right; }
    .dna-strand { flex-wrap:nowrap; }
    .dna-gap { flex:none; width:1ch; color:var(--muted); opacity:.4; }
    .dna-lone { color:var(--warn); background:color-mix(in srgb, var(--warn) 24%, transparent); border-radius:3px; }
    .dna-ruler { font:600 10px/1 var(--mono); letter-spacing:3px; display:flex; flex-wrap:nowrap; color:var(--muted); }
    .dna-ruler span { flex:none; width:1ch; }
    .dna-ruler .t { color:var(--accent); }
    .dna-scores { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
    .dna-score { font:12px var(--mono); border:1px solid var(--border); border-radius:6px; padding:3px 9px; color:var(--muted); background:var(--panel-2); }
    .dna-score.win { border-color:var(--good); color:var(--good); font-weight:700; }
    .dna-idx { max-width:100%; overflow-wrap:anywhere; }
  `));
}

// ── Demo ────────────────────────────────────────────────────────────────────
// Two free-text strands + the seven preset chips. Both approaches share this shell
// AND this module-level strand pair, so flipping the Approach toggle re-reads the
// SAME input the other way instead of resetting — that's what makes "load case 5,
// then flip" work. Seeded with official case 5, the frame-shift divergence case.
let CURRENT = CASES[4].pair.slice();

function controls(host, onRun) {
  ensureStyle();
  const a = el("input"); a.type = "text"; a.value = CURRENT[0]; a.style.width = "230px"; a.spellcheck = false;
  const b = el("input"); b.type = "text"; b.value = CURRENT[1]; b.style.width = "230px"; b.spellcheck = false;
  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "strand1"), a, el("span", "ctl-label", "strand2"), b);
  const chips = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", `case ${i + 1}`);
    chip.title = c.label;
    chip.onclick = () => { a.value = c.pair[0]; b.value = c.pair[1]; fire(); };
    chips.append(chip);
  });
  const fire = () => { CURRENT = [a.value, b.value]; onRun(a.value, b.value); };
  a.oninput = b.oninput = fire;
  host.append(ctl, chips);
  return fire;
}

const laneOf = (label, cells) => {
  const lane = el("div", "dna-lane");
  const row = el("div", "strand dna-strand");
  cells.forEach((c) => row.append(c));
  lane.append(el("div", "dna-lbl", label), row);
  return lane;
};
const baseCell = (ch, cls) => el("span", "base" + (cls ? " " + cls : ""), ch);
const gapCell = () => el("span", "base dna-gap", "·");

// A ruler under the strands: the strand1 index every 5 columns, so a reported
// mutation list like [15, 16, 17, 18] can be read straight off the picture.
function rulerLane(indent, len) {
  const lane = el("div", "dna-lane");
  const r = el("div", "dna-ruler");
  for (let c = 0; c < indent; c++) r.append(el("span", null, " "));
  for (let i = 0; i < len; i++) r.append(el("span", i % 5 === 0 ? "t" : null, i % 5 === 0 ? String(i % 10) : "·"));
  lane.append(el("div", "dna-lbl", "index"), r);
  return lane;
}

// Non-ACGT characters and unequal lengths are user-input problems, not algorithm
// problems — flag them in a .note rather than silently mangling the input.
function inputNotes(a, b) {
  const notes = [];
  if (a.length !== b.length) {
    notes.push(`These strands are <b>${a.length}</b> and <b>${b.length}</b> bases long. The challenge <b>guarantees equal length</b>, so the reference solution never has to think about this; here the comparison simply runs to the shorter of the two (<b>${Math.min(a.length, b.length)}</b> positions) and the leftover tail is reported as unpaired.`);
  }
  const odd = [...new Set([...(a + b)].filter((ch) => !"ATCG".includes(ch)))];
  if (odd.length) notes.push(`Input is upper-cased for you. <b>${odd.map((c) => `"${c}"`).join(", ")}</b> ${odd.length === 1 ? "is not a" : "are not"} DNA base — only <b>A, T, C, G</b> occur in the challenge's strands, but the comparison treats any character the same way.`);
  return notes;
}

const clean = (s) => String(s).toUpperCase();

function mountPositional(host) {
  const out = el("div");
  const fire = controls(host, render);
  host.append(out);

  function render(rawA, rawB) {
    const a = clean(rawA), b = clean(rawB);
    const mut = detectMutations(a, b);
    const set = new Set(mut);
    const n = Math.min(a.length, b.length);
    out.innerHTML = "";

    const box = el("div", "panel"); box.style.overflowX = "auto";
    box.append(
      laneOf("strand1", [...a].map((ch, i) => baseCell(ch, set.has(i) ? "mut" : i >= n ? "dna-lone" : ""))),
      laneOf("strand2", [...b].map((ch, i) => baseCell(ch, set.has(i) ? "mut" : i >= n ? "dna-lone" : ""))),
      rulerLane(0, Math.max(a.length, b.length)),
    );
    out.append(box);

    out.append(el("div", "result-line",
      `<span class="muted">mutations at</span> <span class="num dna-idx">[${mut.join(", ")}]</span> <span class="muted">— ${mut.length} of ${n} position${n === 1 ? "" : "s"}</span>`));

    // Contrast against the other reading, on this exact input — the whole point.
    const al = alignBest(a, b);
    if (al.offset !== 0) {
      out.append(el("div", "note", `<b>${mut.length} mutation${mut.length === 1 ? "" : "s"} here — but the two strands are nearly the same sequence.</b> Slide strand2 by <b>${al.offset > 0 ? "+" : ""}${al.offset}</b> and the mismatches collapse to <b>${al.mutations.length}</b>: one strand simply has ${Math.abs(al.offset)} extra base${Math.abs(al.offset) === 1 ? "" : "s"} at the front, so every later base is compared against its neighbour. Positional compare cannot see that — and it is still the <b>correct graded answer</b>, because the challenge defines a mutation as a position where the two strings disagree, full stop. Flip the Approach toggle to watch the other reading.`));
    } else {
      out.append(el("div", "note", "Equal-length strands compared base-by-base; collect the indexes that differ. One pass, O(n), no extra memory beyond the answer. Try <b>case 5</b> — an inserted base makes this same loop flag almost every position."));
    }
    inputNotes(a, b).forEach((t) => out.append(el("div", "note", t)));
  }
  fire();
}

function mountAligned(host) {
  const out = el("div");
  const fire = controls(host, render);
  host.append(out);

  function render(rawA, rawB) {
    const a = clean(rawA), b = clean(rawB);
    const al = alignBest(a, b);
    const d = al.offset, set = new Set(al.mutations);
    out.innerHTML = "";

    // Draw the winning alignment: strand1 sits at column i + d, so a positive shift
    // indents strand1 and a negative one indents strand2.
    const indent1 = Math.max(0, d), indent2 = Math.max(0, -d);
    const paired = (i) => i + d >= 0 && i + d < b.length;
    const cells1 = [];
    for (let c = 0; c < indent1; c++) cells1.push(gapCell());
    [...a].forEach((ch, i) => cells1.push(baseCell(ch, set.has(i) ? "mut" : paired(i) ? "" : "dna-lone")));
    const cells2 = [];
    for (let c = 0; c < indent2; c++) cells2.push(gapCell());
    [...b].forEach((ch, j) => {
      const i = j - d;
      const inOverlap = i >= 0 && i < a.length;
      cells2.push(baseCell(ch, set.has(i) ? "mut" : inOverlap ? "" : "dna-lone"));
    });

    const box = el("div", "panel"); box.style.overflowX = "auto";
    box.append(laneOf("strand1", cells1), laneOf("strand2", cells2), rulerLane(indent1, a.length));
    out.append(box);

    const indels = Math.abs(d);
    out.append(el("div", "result-line",
      `<span class="muted">best shift</span> <span class="num">${d > 0 ? "+" : ""}${d}</span> <span class="muted">→ real mutations at</span> <span class="num dna-idx">[${al.mutations.join(", ")}]</span> <span class="muted">${indels ? `+ ${indels} unpaired base${indels === 1 ? "" : "s"} (an insertion/deletion)` : "· no shift needed"}</span>`));

    // The scoreboard: every shift that was tried and what it cost.
    const board = el("div", "dna-scores");
    al.tried.forEach((t) => board.append(el("div", "dna-score" + (t.d === d ? " win" : ""),
      `shift ${t.d > 0 ? "+" : ""}${t.d} · ${t.mut.length} mismatch${t.mut.length === 1 ? "" : "es"} + ${Math.abs(t.d)} = <b>${t.score}</b>`)));
    out.append(board);

    const naive = detectMutations(a, b);
    if (d !== 0) {
      out.append(el("div", "note", `<b>Not the graded answer.</b> freeCodeCamp wants the positional list — on this input that's <b>${naive.length}</b> index${naive.length === 1 ? "" : "es"}, and it is correct by the challenge's own definition. This tab asks the <i>biologist's</i> question instead: sliding strand2 by <b>${d > 0 ? "+" : ""}${d}</b> drops the mismatch count from <b>${naive.length}</b> to <b>${al.mutations.length}</b>, which says the strands aren't ${naive.length} separate substitutions — they're the same sequence with <b>${indels}</b> base${indels === 1 ? "" : "s"} inserted at one end. Flip back to Positional compare to see the same input read the graded way.`));
    } else {
      out.append(el("div", "note", `Shift <b>0</b> already scores best, so this agrees exactly with the graded positional answer — <b>${naive.length}</b> mutation${naive.length === 1 ? "" : "s"}. Shifting is only worth it when it erases more mismatches than the <code class='inl'>|d|</code> penalty it costs. Try <b>case 5</b>, <b>6</b> or <b>7</b> to see a shift win. <b>This tab is a detour past the challenge, not the challenge</b> — the graded solution is the Positional compare tab.`));
    }
    inputNotes(a, b).forEach((t) => out.append(el("div", "note", t)));
  }
  fire();
}

// ── STEP A — the positional compare on the shared debugger ───────────────────
// One call frame (no recursion). The two strands are the parameters, in scope for the
// whole function, so they show as structs throughout; `mutations` is declared on line 2;
// the loop index `i` is block-scoped to the for-loop, so it appears with the loop and
// vanishes at the return; `count` mirrors mutations.length as it grows.
const SRC_POS = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">detectMutations</span>(<span class="tok" data-t="params">strand1, strand2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> mutations = [];` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="init">i = 0</span>; <span class="tok" data-t="cond">i &lt; strand1.length</span>; <span class="tok" data-t="incr">i++</span>) {` },
  { ln: 4, html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">strand1[i] !== strand2[i]</span>)` },
  { ln: 5, html: `      mutations.<span class="tok" data-t="push"><span class="fn">push</span>(i)</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">mutations</span>;` },
  { ln: 8, html: `}` },
];

const pick = (k) => CASES[Math.max(0, Math.min(CASES.length - 1, (k | 0) - 1))];

// Instrumented run of detectMutations → generic debugger steps. Snapshot at every
// meaningful moment: the loop condition, each position compare, each push, the return.
function tracePositional(caseIndex) {
  const c = pick(caseIndex);
  const [strand1, strand2] = c.pair;
  const n = Math.min(strand1.length, strand2.length);
  const align = alignBest(strand1, strand2);
  const steps = []; const mutations = []; let i;
  const S = (line, note, x = {}) => {
    const iLive = line >= 3 && line <= 6;       // `let i` is block-scoped to the for-loop
    const mutLive = line >= 2;                  // mutations declared on line 2
    const vars = {};
    if (iLive) vars.i = i;
    if (mutLive) vars.count = mutations.length; // running mismatch counter
    const structs = [
      { label: "strand1", items: [...strand1] },
      { label: "strand2", items: [...strand2] },
    ];
    if (mutLive) structs.push({ label: "mutations", items: mutations.slice(), newest: !!x.mutNew });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "detectMutations", vars, changed: x.changed || [], structs }] });
  };

  S(1, `Case <b>${c.label}</b>. Call <b>detectMutations</b> on two strands of ${strand1.length === strand2.length ? `equal length <b>${strand1.length}</b>` : `length <b>${strand1.length}</b> and <b>${strand2.length}</b>`}. The challenge's definition is deliberately blunt: a mutation is an <b>index</b> where the two strings disagree — nothing about what the bases mean.`, { focus: "params" });
  S(2, `Start an empty <b>mutations</b> list. It only ever grows, and only ever with indexes, so it comes out sorted ascending for free — no sort needed at the end.`, {});
  i = 0; S(3, `Begin the walk at <b>i = 0</b>. One index drives <i>both</i> strands, which is what makes "mutation" mean "same position, different base".`, { focus: "init", changed: ["i"] });
  for (;;) {
    const cond = i < n;
    if (!cond) {
      S(3, `<b>${i} &lt; ${n}</b> is false — every position has been inspected, so the loop ends and <b>i</b> falls out of scope.`, { focus: "cond", eval: { expr: `${i} < ${n}`, val: false } });
      break;
    }
    S(3, `<b>${i} &lt; ${n}</b> → there's still a position left to inspect. Nothing is remembered between iterations except the answer list, which is why this stays O(n) with no lookahead.`, { focus: "cond", eval: { expr: `${i} < ${n}`, val: true } });
    const x = strand1[i], y = strand2[i], differ = x !== y;
    S(4, `Position <b>${i}</b>: strand1 has <b>${x}</b>, strand2 has <b>${y}</b> → <b>${differ ? "they differ" : "they agree"}</b>. This single test <i>is</i> the whole definition — it never asks whether ${y} might be ${x} shoved sideways by an inserted base.`, { focus: "cmp", eval: { expr: `'${x}' !== '${y}'`, val: differ } });
    if (differ) {
      mutations.push(i);
      S(5, `Record index <b>${i}</b>. We push the <b>index</b>, not the base — the caller wants to know <i>where</i> the strands diverge, and indexes are what make the result comparable between strands.`, { focus: "push", mutNew: true, changed: ["count"] });
    }
    i = i + 1; S(3, `<b>i++</b> → ${i}. Every position costs exactly one compare, so the total work is one pass over the strand.`, { focus: "incr", changed: ["i"] });
  }
  const extra = align.offset !== 0
    ? ` But look at the shape of that list: it's nearly every index. A frame shift of <b>${align.offset > 0 ? "+" : ""}${align.offset}</b> would leave only <b>${align.mutations.length}</b> — the "Shift-aware alignment" tab chases that. Positional compare still returns the <b>correct graded answer</b>; it just can't distinguish ${mutations.length} substitutions from ${Math.abs(align.offset)} inserted base.`
    : ``;
  S(7, `<b>Return</b> [${mutations.join(", ")}] — ${mutations.length} mutation${mutations.length === 1 ? "" : "s"} found in a single O(n) pass.${extra}`,
    { focus: "ret", done: true, result: `[${mutations.join(", ")}]` });
  return steps;
}

// ── STEP B — the shift search on the shared debugger ─────────────────────────
// Two frames: the outer search over candidate shifts, and mismatchesAt pushed on top
// while it counts one alignment. The inner per-base compare is deliberately NOT
// re-stepped here — it is exactly the loop in "Step: positional compare", just run at
// an offset — so this trace stays about the SEARCH, which is the new idea.
const SRC_ALIGN = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">detectMutationsAligned</span>(strand1, strand2) {` },
  { ln: 2,  html: `  <span class="k">let</span> best = <span class="k">null</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="shift">d</span> <span class="k">of</span> [<span class="nu">0</span>, <span class="nu">-1</span>, <span class="nu">1</span>, <span class="nu">-2</span>, <span class="nu">2</span>]) {  <span class="cm">// candidate frame shifts</span>` },
  { ln: 4,  html: `    <span class="k">const</span> mut = <span class="tok" data-t="call"><span class="fn">mismatchesAt</span>(strand1, strand2, d)</span>;` },
  { ln: 5,  html: `    <span class="k">const</span> score = <span class="tok" data-t="score">mut.length + Math.<span class="fn">abs</span>(d)</span>;  <span class="cm">// shifting is never free</span>` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="better">best === <span class="k">null</span> || score &lt; best.score</span>)` },
  { ln: 7,  html: `      <span class="tok" data-t="adopt">best = { offset: d, mutations: mut, score }</span>;` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="ret">best</span>;` },
  { ln: 10, html: `}` },
  { ln: 11, html: `` },
  { ln: 12, html: `<span class="k">function</span> <span class="fn">mismatchesAt</span>(s1, s2, d) {  <span class="cm">// compare across the overlap only</span>` },
  { ln: 13, html: `  <span class="k">const</span> mut = [];` },
  { ln: 14, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="scan">i = 0; i &lt; s1.length</span>; i++) {` },
  { ln: 15, html: `    <span class="k">const</span> j = i + d;` },
  { ln: 16, html: `    <span class="k">if</span> (<span class="tok" data-t="skip">j &lt; 0 || j &gt;= s2.length</span>) <span class="k">continue</span>;  <span class="cm">// unpaired — an indel</span>` },
  { ln: 17, html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">s1[i] !== s2[j]</span>) mut.<span class="fn">push</span>(i);` },
  { ln: 18, html: `  }` },
  { ln: 19, html: `  <span class="k">return</span> <span class="tok" data-t="iret">mut</span>;` },
  { ln: 20, html: `}` },
];

// Instrumented run of the shift search. `d`/`mut`/`score` are block-scoped to the
// for-loop body, so they appear on line 3 and vanish at the return; the inner frame
// exists only for the duration of the mismatchesAt call.
function traceAligned(caseIndex) {
  const c = pick(caseIndex);
  const [strand1, strand2] = c.pair;
  const naive = detectMutations(strand1, strand2);
  const steps = [];
  let d, mut, score, best = null, inner = null;

  const S = (line, note, x = {}) => {
    const loopLive = line >= 3 && line <= 8;
    const vars = { "strand1.length": strand1.length, "strand2.length": strand2.length };
    if (loopLive || line >= 12) vars.d = d;
    if (line >= 5 && line <= 8) { vars.mut = mut.length; vars.score = score; }
    if (best) vars.best = `d=${best.offset > 0 ? "+" : ""}${best.offset} score=${best.score}`;
    const frames = [{
      title: "detectMutationsAligned", vars, changed: x.changed || [],
      structs: [{ label: "best.mutations", items: best ? best.mutations.slice() : [], newest: !!x.bestNew }],
    }];
    if (inner) {
      frames.push({
        title: `mismatchesAt(s1, s2, ${inner.d > 0 ? "+" : ""}${inner.d})`,
        vars: { d: inner.d, overlap: inner.overlap },
        changed: x.innerChanged || [],
        structs: [{ label: "mut", items: inner.mut.slice(), newest: !!x.innerNew }],
        ret: x.innerRet ? { value: `${inner.mut.length} mismatches` } : undefined,
      });
    }
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames });
  };

  S(1, `Case <b>${c.label}</b>. <b>This is not the graded solution</b> — freeCodeCamp wants the positional list, which on this input is <b>${naive.length}</b> index${naive.length === 1 ? "" : "es"}. This function asks a different question: <i>is one strand just the other one slid sideways?</i>`, {});
  S(2, `<b>best = null</b>. We're about to try several alignments and keep the cheapest, so we need a champion slot that starts empty.`, { changed: ["best"] });

  for (const cand of SHIFTS) {
    d = cand;
    S(3, `Try shift <b>d = ${d > 0 ? "+" : ""}${d}</b>${d === 0 ? " — the identity alignment, i.e. exactly what the graded solution does. It goes first so that when no shift helps, the search falls back to the graded answer." : `, i.e. compare <code class='inl'>strand1[i]</code> against <code class='inl'>strand2[i${d > 0 ? " + " + d : " - " + -d}]</code>.`}`, { focus: "shift", changed: ["d"] });

    const lo = Math.max(0, -d), hi = Math.min(strand1.length, strand2.length - d);
    const overlap = Math.max(0, hi - lo);
    inner = { d, overlap, mut: [] };
    S(12, `Step into <b>mismatchesAt</b> with d = ${d > 0 ? "+" : ""}${d}. Only the <b>overlap</b> is comparable: strand1 indexes <b>${overlap ? `${lo}…${hi - 1}` : "(none)"}</b> — <b>${overlap}</b> position${overlap === 1 ? "" : "s"}. The ${strand1.length - overlap} position${strand1.length - overlap === 1 ? "" : "s"} hanging off the end ${strand1.length - overlap === 1 ? "is" : "are"} unpaired, and unpaired means <i>indel</i>, not mutation.`, { changed: ["d"] });

    const m = mismatchesAt(strand1, strand2, d);
    inner = { d, overlap, mut: m };
    S(14, `Walk the overlap and count disagreements — <b>the identical loop the "Step: positional compare" tab walks base-by-base</b>, just reading strand2 at <code class='inl'>i ${d >= 0 ? "+" : "−"} ${Math.abs(d)}</code>. It finds <b>${m.length}</b> mismatch${m.length === 1 ? "" : "es"}${m.length && m.length <= 8 ? ` at [${m.join(", ")}]` : ""}.`, { focus: "scan", innerNew: !!m.length });
    S(19, `Return those <b>${m.length}</b> mismatching indexes to the search. The frame pops — <code class='inl'>i</code> and <code class='inl'>j</code> die with it; only the count matters upstairs.`, { focus: "iret", innerRet: true });

    inner = null;
    mut = m;
    score = m.length + Math.abs(d);
    S(5, `Score it: <b>${m.length} mismatch${m.length === 1 ? "" : "es"} + |${d}| = ${score}</b>. The <code class='inl'>|d|</code> term is the whole reason this doesn't cheat — without it, a big shift that trims the overlap to almost nothing would always "win" by comparing fewer bases.`, { focus: "score", changed: ["mut", "score"] });

    const better = best === null || score < best.score;
    S(6, best === null
      ? `No champion yet, so this one takes the crown by default.`
      : `Is <b>${score}</b> cheaper than the champion's <b>${best.score}</b>? → <b>${better}</b>.${better ? "" : ` Ties keep the incumbent, and shift 0 was tried first — so an ambiguous input still resolves to the graded alignment.`}`,
      { focus: "better", eval: { expr: `${score} < ${best === null ? "∞" : best.score}`, val: better } });
    if (better) {
      best = { offset: d, mutations: m, score };
      S(7, `New best alignment: shift <b>${d > 0 ? "+" : ""}${d}</b> with <b>${m.length}</b> real mismatch${m.length === 1 ? "" : "es"}.`, { focus: "adopt", changed: ["best"], bestNew: !!m.length });
    }
  }

  d = undefined; mut = undefined; score = undefined;
  const indels = Math.abs(best.offset);
  S(9, best.offset === 0
    ? `Shift <b>0</b> survived every challenger, so this answer <b>is</b> the graded one: <b>[${best.mutations.join(", ")}]</b>, ${best.mutations.length} mutation${best.mutations.length === 1 ? "" : "s"}. No shift earned back its penalty — these really are position-for-position substitutions.`
    : `Winner: shift <b>${best.offset > 0 ? "+" : ""}${best.offset}</b>, leaving only <b>[${best.mutations.join(", ")}]</b> — <b>${best.mutations.length}</b> real mismatch${best.mutations.length === 1 ? "" : "es"} plus <b>${indels}</b> unpaired base${indels === 1 ? "" : "s"}. The positional reading called this <b>${naive.length}</b> mutations; both are "right" under their own definition, and <b>the graded one is ${naive.length}</b>.`,
    { focus: "ret", done: true, result: `shift ${best.offset > 0 ? "+" : ""}${best.offset} · [${best.mutations.join(", ")}]` });
  return steps;
}

const CODE_POS = `// The graded solution: a mutation is an INDEX where the two strands disagree.
// One pass, no lookahead, no memory beyond the answer.
function detectMutations(strand1: string, strand2: string): number[] {
  const mutations: number[] = [];
  for (let i = 0; i < strand1.length; i++) {
    if (strand1[i] !== strand2[i]) mutations.push(i);
  }
  return mutations;               // ascending for free — i only ever grows
}`;

const CODE_ALIGN = `// NOT the graded answer — a detour past the challenge. Instead of assuming the
// strands line up, try a few frame shifts and keep the cheapest alignment.
type Alignment = { offset: number; mutations: number[]; score: number };

function mismatchesAt(s1: string, s2: string, d: number): number[] {
  const mut: number[] = [];
  for (let i = 0; i < s1.length; i++) {
    const j = i + d;
    if (j < 0 || j >= s2.length) continue;   // unpaired — an indel, not a mutation
    if (s1[i] !== s2[j]) mut.push(i);
  }
  return mut;
}

function detectMutationsAligned(strand1: string, strand2: string): Alignment {
  let best: Alignment | null = null;
  for (const d of [0, -1, 1, -2, 2]) {       // 0 first: ties fall back to graded
    const mut = mismatchesAt(strand1, strand2, d);
    const score = mut.length + Math.abs(d);  // shifting must earn its keep
    if (best === null || score < best.score) best = { offset: d, mutations: mut, score };
  }
  return best!;
}`;

export default {
  n: 318, id: "dna", title: "DNA Mutations", dates: ["2026-06-24"],
  statement: `Given two DNA strands of <b>equal length</b> (strings of <code class="inl">A</code>, <code class="inl">T</code>, <code class="inl">C</code>, <code class="inl">G</code>), return the ascending list of indexes where they differ; no differences → <code class="inl">[]</code>. Example: <code class="inl">detectMutations("ATCG", "ATGG")</code> → <code class="inl">[2]</code>, because index 2 holds <code class="inl">C</code> in one strand and <code class="inl">G</code> in the other. <span class="rule">A mutation here is defined by position, not by biology.</span>`,
  // Grouped by approach: each approach is [intuition viz] → [step through]. NO tone is
  // set on purpose — this is not a brute/optimized pair. The first approach is the
  // graded solution; the second is an explicitly-labelled detour past the challenge,
  // and case 5 (official) is the input where the two visibly disagree: 26 vs 1.
  variants: [
    {
      name: "Positional compare", cost: "O(n)",
      approach: `The graded solution. Walk one index across both strands and collect every position where the bases disagree — that <i>is</i> the challenge's definition of a mutation. One pass, O(n), and the result comes out sorted because <code class='inl'>i</code> only ever grows. <b>Load case 5</b> (official) and watch it flag 26 of 29 positions: an inserted base at the front shifts everything, and a positional compare has no way to notice.`,
      code: CODE_POS, mount: mountPositional,
    },
    {
      name: "Step: positional compare", cost: "line-by-line",
      approach: `A debugger for the graded solution — walk the two strands base-by-base and watch the <b>position compare</b> decide, at each index, whether it's a mutation. See <code class='inl'>mutations</code> fill and <code class='inl'>count</code> climb; <code class='inl'>i</code> appears with the loop and vanishes at the return, because it is block-scoped to it. All five official cases are presets (1–5); <b>case 5</b> is the frame shift. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_POS, trace: tracePositional, input: { label: "case =", value: 5, min: 1, max: CASES.length, presets: PRESETS, hint: HINT } }),
    },
    {
      // graded: false — this variant says so in its own code comment: it is a
      // detour PAST the challenge, solving frame-shift alignment rather than
      // the graded equal-length compare, and defines detectMutationsAligned()
      // rather than the graded detectMutations().
      name: "Shift-aware alignment", cost: "O(5n) — 5 shifts", graded: false,
      approach: `<b>This is NOT what freeCodeCamp asks for</b> — it goes past the challenge on purpose. The positional reading can't tell a substitution from an inserted base, so instead: slide strand2 by −2…+2, count mismatches across each overlap, and charge <code class='inl'>|d|</code> for the privilege of shifting. Shift 0 is tried first and ties keep the incumbent, so whenever no shift earns its penalty this returns exactly the graded answer. <b>On official case 5 it reports 1 inserted base instead of 26 mutations.</b> Real sequence aligners (Needleman–Wunsch) generalise this to gaps anywhere, not just at the ends.`,
      code: CODE_ALIGN, mount: mountAligned,
    },
    {
      name: "Step: try each shift", cost: "line-by-line",
      approach: `A debugger for the <b>search</b>, not the graded answer — step through all five candidate shifts, watch <code class='inl'>mismatchesAt</code> push onto the call stack for each one, and see the champion change hands. The inner base-by-base compare isn't re-stepped here: it's the same loop as the "Step: positional compare" tab, just reading strand2 at an offset. Same seven presets, so you can run <b>case 5</b> in both tabs and compare the returns. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_ALIGN, trace: traceAligned, input: { label: "case =", value: 5, min: 1, max: CASES.length, presets: PRESETS, hint: HINT } }),
    },
  ],
};
