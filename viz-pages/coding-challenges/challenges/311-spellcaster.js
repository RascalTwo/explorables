// #311 · Spellcaster — the multiplier belongs to the streak, not to the spell.
// ONE approach, and deliberately so: there is no wasteful act to name here. The
// score of a spell depends on the spells before it, so any correct solution
// carries the same two pieces of state (the previous category, the streak length
// so far) through one left-to-right pass. A "brute" version would have to
// re-derive the streak by re-scanning backwards from every index — an O(n²)
// spelling of the identical mental model, not a second one. So: Solution +
// Step through, the normal shape.
//
// The whole challenge is one sentence read literally: "casting a spell from the
// same category as the previous RESETS the multiplier back to 1". Not to 0, not
// to 2 — the repeating spell is the first link of the NEXT chain, so it scores
// at base and the climb starts again from it. Click Clump / Interleave in the
// demo to watch the same six spells score 15 or 46 depending only on their order.
import { el, esc, mountDebugger } from "../shared.js";

// The spell table, transcribed from the statement. This is the single source of
// truth: the demo runs on it, the debugger traces it, and the `code` block below
// interpolates it, so the published snippet cannot drift from the data on screen.
const SPELLS = {
  f: { name: "Fire", cat: "Destruction", base: 3 },
  l: { name: "Lightning", cat: "Destruction", base: 3 },
  i: { name: "Ice", cat: "Control", base: 2 },
  w: { name: "Wind", cat: "Control", base: 2 },
  h: { name: "Heal", cat: "Restoration", base: 1 },
  s: { name: "Shield", cat: "Restoration", base: 1 },
};
const CODES = Object.keys(SPELLS);
const CAT_CLASS = { Destruction: "spc-d", Control: "spc-c", Restoration: "spc-r" };

// The graded function, exactly as the `code` block publishes it. `mult` starts at
// 0 so the first spell's own "different from the previous category?" test — which
// a "" sentinel always answers yes — is what lifts it to 1. No special case.
function cast(spells) {
  let total = 0, mult = 0, prev = "";
  for (const code of spells) {
    const { cat, base } = SPELLS[code];
    mult = cat === prev ? 1 : mult + 1;
    prev = cat;
    total += base * mult;
  }
  return total;
}

// Per-spell breakdown for the visuals: the same scan, but keeping every
// intermediate the demo and the trace both want to draw.
function breakdown(str) {
  const rows = [];
  let total = 0, mult = 0, prev = "";
  for (const code of str) {
    const sp = SPELLS[code];
    const broke = sp.cat === prev;              // a repeat — the chain snaps here
    mult = broke ? 1 : mult + 1;
    prev = sp.cat;
    const pts = sp.base * mult;
    total += pts;
    rows.push({ code, ...sp, mult, pts, broke, running: total });
  }
  return { rows, total };
}

// Contiguous runs of different categories — one bracket each in the demo.
function streaksOf(rows) {
  const out = [];
  rows.forEach((r, i) => {
    if (i === 0 || r.broke) out.push({ from: i, to: i, rows: [r] });
    else { const s = out[out.length - 1]; s.to = i; s.rows.push(r); }
  });
  return out;
}

const clean = (s) => [...s].filter((c) => SPELLS[c]).join("");

// ── The reorder payoff — same multiset of spells, two orderings ──────────────
// Clump: sort so every category sits together, which snaps the chain on almost
// every spell. Interleave: round-robin the categories (most-remaining first,
// cheapest base first on a tie) so the streak never breaks and the big base
// scores land on the big multipliers. Neither is claimed optimal; they're the
// two ends the user can feel.
const clump = (str) => [...clean(str)].sort((a, b) => SPELLS[a].cat.localeCompare(SPELLS[b].cat)).join("");

function interleave(str) {
  const pool = [...clean(str)];
  const out = [];
  let prev = "";
  while (pool.length) {
    const counts = {};
    pool.forEach((c) => { counts[SPELLS[c].cat] = (counts[SPELLS[c].cat] || 0) + 1; });
    const pick = pool
      .filter((c) => SPELLS[c].cat !== prev)
      .sort((a, b) => counts[SPELLS[b].cat] - counts[SPELLS[a].cat] || SPELLS[a].base - SPELLS[b].base)[0];
    const chosen = pick ?? pool[0];               // only one category left — no choice
    out.push(chosen);
    prev = SPELLS[chosen].cat;
    pool.splice(pool.indexOf(chosen), 1);
  }
  return out.join("");
}

// Cases 1–5 are freeCodeCamp's official set, in the order the grader lists them.
// Between them they already cover the never-breaks shapes (1, 2, 4), a break in
// the MIDDLE that restarts (3: "wi" repeats Control, then the chain climbs again
// to ×5 before "fl" snaps it) and a string that breaks four times (5).
// Cases 6–9 are ours, each on a branch the official set leaves untested:
//   6 — "f": one spell. The multiplier can only ever be 1, so the answer is the
//       base score. This is the "first spell always scores at base value" rule
//       with nothing else in the way.
//   7 — "": the degenerate input. The loop body never runs, so the answer is 0.
//   8 — "fliwhs": all six spells, clumped by category. Every second spell repeats
//       its predecessor's category, so the multiplier never gets past ×2.
//   9 — "hifswl": the SAME six spells, interleaved. One unbroken streak to ×6,
//       with the 3-point spells landing on ×3 and ×6. 15 vs 46 on identical
//       spells is the whole point of the module, so the pair is one case each.
const CASES = [
  { input: "fihwl", want: 33 },
  { input: "lwswfi", want: 45 },
  { input: "wislhfl", want: 37 },
  { input: "sihwlih", want: 50 },
  { input: "wishlfihwslwifihl", want: 101 },
  { input: "f", want: 3 },
  { input: "", want: 0 },
  { input: "fliwhs", want: 15 },
  { input: "hifswl", want: 46 },
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .spc-bar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:10px; }
    .spc-spell { font:700 12px var(--mono); padding:5px 10px; border-radius:7px; cursor:pointer;
                 background:var(--panel-2); border:1px solid var(--border); color:var(--text); }
    .spc-spell b { font-size:14px; }
    .spc-spell .bs { color:var(--muted); font-weight:600; }
    .spc-spell:hover { filter:brightness(1.25); }
    .spc-d { border-color:color-mix(in srgb,var(--c8) 60%,var(--border)); color:var(--c8); }
    .spc-c { border-color:color-mix(in srgb,var(--c5) 60%,var(--border)); color:var(--c5); }
    .spc-r { border-color:color-mix(in srgb,var(--c4) 60%,var(--border)); color:var(--c4); }
    .spc-seq { display:flex; flex-wrap:wrap; align-items:stretch; margin:14px 0 2px; }
    .spc-card, .spc-link { display:flex; flex-direction:column; justify-content:flex-end; }
    .spc-card { min-width:74px; border:1px solid var(--border); border-radius:9px 9px 0 0;
                background:var(--panel-2); padding:7px 9px 0; text-align:center; }
    .spc-card.spc-d { border-color:color-mix(in srgb,var(--c8) 45%,var(--border)); }
    .spc-card.spc-c { border-color:color-mix(in srgb,var(--c5) 45%,var(--border)); }
    .spc-card.spc-r { border-color:color-mix(in srgb,var(--c4) 45%,var(--border)); }
    .spc-cat { font:700 8.5px var(--sans); letter-spacing:.08em; text-transform:uppercase; }
    .spc-glyph { font:800 20px var(--mono); color:var(--text); line-height:1.2; }
    .spc-name { font:600 10px var(--sans); color:var(--muted); }
    .spc-math { font:600 11px var(--mono); color:var(--muted); margin-top:4px; }
    .spc-math .m { color:var(--accent); font-weight:800; }
    .spc-math .m.one { color:var(--muted); }
    .spc-pts { font:800 16px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; }
    .spc-link { width:16px; align-items:center; }
    .spc-brk { font:800 11px var(--mono); color:var(--danger); line-height:1; padding-bottom:3px; }
    .spc-tie { height:4px; align-self:stretch; background:var(--accent); margin:7px 0 0; }
    .spc-card .spc-tie { margin-left:-9px; margin-right:-9px; }  /* bleed past the card's padding so a streak's bar is one unbroken run */
    .spc-tie.st { border-radius:4px 0 0 4px; }
    .spc-tie.en { border-radius:0 4px 4px 0; }
    .spc-tie.off { background:transparent; }
    .spc-legend { font:12px var(--mono); color:var(--muted); margin-top:9px; }
    .spc-legend b { color:var(--text); }
    .spc-swap { font:12.5px var(--sans); color:var(--muted); margin-top:12px; line-height:1.7; }
    .spc-swap b { color:var(--text); }
    .spc-swap .up { color:var(--good); font-weight:700; }
    .spc-swap .down { color:var(--danger); font-weight:700; }
  `));
}

function mount(host) {
  ensureStyle();

  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[2].input;
  inp.style.width = "260px";
  inp.style.font = "700 14px var(--mono)";

  const ctl = el("div", "controls");
  const undo = el("button", "chip", "⌫");
  const clr = el("button", "chip", "clear");
  ctl.append(el("span", "ctl-label", "spells ="), inp, undo, clr);

  // The spell bar — click to append a code. Colour is the category, so a repeat
  // is visible in the bar before it is visible in the score.
  const bar = el("div", "spc-bar");
  CODES.forEach((c) => {
    const sp = SPELLS[c];
    const b = el("button", "spc-spell " + CAT_CLASS[sp.cat], `<b>${c}</b> ${sp.name} <span class="bs">${sp.base}</span>`);
    b.title = `${sp.cat} · base ${sp.base}`;
    b.onclick = () => { inp.value += c; render(); };
    bar.append(b);
  });

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", (c.input === "" ? "(empty)" : c.input) + (i < 5 ? "" : " ✎"));
    chip.title = `expects ${c.want}`;
    chip.onclick = () => { inp.value = c.input; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", "Click spells to build a cast, or type the codes. The chips are freeCodeCamp's five official cases plus four of ours (✎). Then hit <b>Clump</b> or <b>Interleave</b> under the score — <i>same spells, different order, different total</i>."),
    ctl, bar, pre, out,
  );

  undo.onclick = () => { inp.value = inp.value.slice(0, -1); render(); };
  clr.onclick = () => { inp.value = ""; render(); };
  inp.oninput = render;
  render();

  function render() {
    const raw = inp.value;
    const str = clean(raw);
    const { rows, total } = breakdown(str);
    const streaks = streaksOf(rows);

    out.innerHTML = "";
    if (!rows.length) {
      out.append(el("div", "muted", "No spells cast — the loop body never runs, so the total is 0."));
    } else {
      const seq = el("div", "spc-seq");
      rows.forEach((r, i) => {
        const card = el("div", "spc-card " + CAT_CLASS[r.cat]);
        const st = i === 0 || r.broke, en = i === rows.length - 1 || (rows[i + 1] && rows[i + 1].broke);
        card.innerHTML =
          `<div class="spc-cat">${r.cat}</div>` +
          `<div class="spc-glyph">${r.code}</div>` +
          `<div class="spc-name">${r.name}</div>` +
          `<div class="spc-math">${r.base} × <span class="m${r.mult === 1 ? " one" : ""}">×${r.mult}</span></div>` +
          `<div class="spc-pts">${r.pts}</div>` +
          `<div class="spc-tie${st ? " st" : ""}${en ? " en" : ""}"></div>`;
        seq.append(card);
        if (i < rows.length - 1) {
          const next = rows[i + 1];
          const link = el("div", "spc-link",
            (next.broke ? `<span class="spc-brk">✕</span>` : "") +
            `<div class="spc-tie${next.broke ? " off" : ""}"></div>`);
          link.title = next.broke
            ? `${next.cat} again — the chain snaps, the multiplier drops to ×1`
            : `${next.cat} is different — the multiplier climbs to ×${next.mult}`;
          seq.append(link);
        }
      });
      out.append(seq);

      // One rung per bracket: the codes it spans, how far the multiplier climbed,
      // and what the streak was worth. Reads top-to-bottom as the cast unfolds.
      const ladder = el("div", "ladder");
      streaks.forEach((s, i) => {
        const pts = s.rows.reduce((a, r) => a + r.pts, 0);
        const codes = s.rows.map((r) => r.code).join(" ");
        const top = s.rows[s.rows.length - 1].mult;
        ladder.append(el("div", "rung" + (top === streaks.reduce((m, x) => Math.max(m, x.rows.length), 0) ? " on" : ""),
          `<span>${i === 0 ? "opening streak" : "restart after a repeat"} · <b>${codes}</b></span>` +
          `<span class="v">×1 → ×${top} &nbsp; ${pts} pts</span>`));
      });
      out.append(ladder);
    }

    out.append(el("div", "result-line",
      `<span class="muted mono">cast("${esc(str)}") =</span><span class="num right">${total}</span>`));

    if (rows.length) {
      out.append(el("div", "spc-legend",
        rows.map((r) => `${r.base}×${r.mult}`).join(" + ") + ` = <b>${total}</b>`));
    }

    // The payoff: hold the multiset fixed, change the order.
    if (rows.length > 1) {
      const cl = clump(str), iv = interleave(str);
      const clT = cast(cl), ivT = cast(iv);
      const swap = el("div", "spc-swap");
      swap.innerHTML =
        `The same ${rows.length} spells, reordered — the multiset is fixed, only the sequence moves:<br>` +
        `<b>clumped</b> <code class="inl">${cl}</code> scores <span class="down">${clT}</span> · ` +
        `<b>interleaved</b> <code class="inl">${iv}</code> scores <span class="up">${ivT}</span>` +
        (clT === ivT ? ` — identical here, because these spells can't be arranged to break differently.` : ` — a ${(ivT / Math.max(1, clT)).toFixed(1)}× spread from ordering alone.`);
      const btns = el("div", "controls");
      const bc = el("button", "chip", "Clump"); bc.onclick = () => { inp.value = cl; render(); };
      const bi = el("button", "chip", "Interleave"); bi.onclick = () => { inp.value = iv; render(); };
      btns.append(bc, bi);
      swap.style.marginBottom = "8px";
      out.append(swap, btns);
    }

    const dropped = [...raw].filter((c) => !SPELLS[c]).length;
    if (dropped) out.append(el("div", "note", `${dropped} character${dropped === 1 ? "" : "s"} in the box ${dropped === 1 ? "is" : "are"} not one of <code class='inl'>f l i w h s</code>, so ${dropped === 1 ? "it was" : "they were"} ignored. The official inputs only ever contain the six codes.`));
    else out.append(el("div", "note", "The <span style='color:var(--accent)'>bar under the cards</span> is the current streak; it <span style='color:var(--danger)'>✕ breaks</span> wherever a category repeats. The multiplier is just how long that bar is — which is why a repeat sets it to <b>×1</b> and not to 0: the repeating spell <i>starts</i> the next streak."));
  }
}

// ── STEP — the scan line-by-line, one frame, with the streak as a struct ──────
// `mult` is the length of the STREAK struct at every moment, which is the point
// the trace exists to make: watch the two move together, and watch the struct
// empty down to one item (never to zero) on a repeat.
//
// The table is declared in the pane (lines 1–8) as well as carried as a struct,
// because line 14's SPELLS[code] is where `cat` and `base` come from: a reader
// checking the transcription — the thing the module calls the decoy — has to be
// able to see the table the lookup reads, not take it on trust. One row per line,
// because the pane does not wrap: two rows to a line and the second one is off the
// right edge, which is the elision this was written to remove.
const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="table">SPELLS</span> = {` },
  { ln: 2, html: `  f: { cat: <span class="st">"Destruction"</span>, base: 3 },` },
  { ln: 3, html: `  l: { cat: <span class="st">"Destruction"</span>, base: 3 },` },
  { ln: 4, html: `  i: { cat: <span class="st">"Control"</span>, base: 2 },` },
  { ln: 5, html: `  w: { cat: <span class="st">"Control"</span>, base: 2 },` },
  { ln: 6, html: `  h: { cat: <span class="st">"Restoration"</span>, base: 1 },` },
  { ln: 7, html: `  s: { cat: <span class="st">"Restoration"</span>, base: 1 },` },
  { ln: 8, html: `};` },
  { ln: 9, html: `<span class="k">function</span> <span class="fn">cast</span>(<span class="tok" data-t="param">spells</span>) {` },
  { ln: 10, html: `  <span class="k">let</span> <span class="tok" data-t="total">total = 0</span>;` },
  { ln: 11, html: `  <span class="k">let</span> <span class="tok" data-t="mult">mult = 0</span>;` },
  { ln: 12, html: `  <span class="k">let</span> <span class="tok" data-t="prev">prev = <span class="st">""</span></span>;` },
  { ln: 13, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="code">code <span class="k">of</span> spells</span>) {` },
  { ln: 14, html: `    <span class="k">const</span> { cat, base } = <span class="tok" data-t="look">SPELLS[code]</span>;` },
  { ln: 15, html: `    <span class="tok" data-t="mrule">mult = cat === prev ? <span class="st">1</span> : mult + <span class="st">1</span></span>;` },
  { ln: 16, html: `    <span class="tok" data-t="setprev">prev = cat</span>;` },
  { ln: 17, html: `    <span class="tok" data-t="add">total += base * mult</span>;` },
  { ln: 18, html: `  }` },
  { ln: 19, html: `  <span class="k">return</span> <span class="tok" data-t="ret">total</span>;` },
  { ln: 20, html: `}` },
];

// The SPELLS struct, built from the module constant so it cannot drift from the
// table the demo and the `code` block run on. Rows land a category at a time —
// source lines 3, 5 and 7 — so the struct fills as the reader reads it.
const SPELL_ROWS = Object.entries(SPELLS).map(([c, s]) => `${c} → ${s.cat} ${s.base}`);

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const str = CASES[k - 1].input;
  const steps = [];
  let total, mult, prev, code, cat, base, inLoop = false;
  let streak = [];
  let spellRowsIn = 0;                                        // how much of SPELLS has been built

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 9) vars.spells = `"${str}"`;                  // the parameter binds at line 9
    if (line >= 10) vars.total = total;                       // `let total` is line 10
    if (line >= 11) vars.mult = mult;                         // `let mult` is line 11
    if (line >= 12) vars.prev = `"${prev}"`;                  // `let prev` is line 12
    if (inLoop && line >= 13 && line <= 18) vars.code = `"${code}"`;  // loop binding
    if (inLoop && line >= 14 && line <= 18) {                 // destructured at line 14
      vars.cat = `"${cat}"`;
      vars.base = base;
    }
    const structs = [];
    // SPELLS is module scope: its rows land as lines 2–7 run, and it then stays for
    // the whole call, because line 14 reads it again on every single spell. Without
    // it on screen, `cat` and `base` would appear out of nowhere.
    if (spellRowsIn) structs.push({ label: "SPELLS", items: SPELL_ROWS.slice(0, spellRowsIn), newest: !!x.tableNew });
    // The streak is the shape `mult` measures, so it comes into being with it on
    // line 11 and stays for the whole call.
    if (line >= 11) structs.push({ label: "streak", items: streak.slice(), newest: !!x.grew });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 9 ? `cast("${str}")` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const chars = [...str];
  S(1, `Before any call happens: the statement's spell table, transcribed once as <b>data</b>. Six codes, and each one carries exactly two facts — a category and a base score. Watch what it does <i>not</i> carry: there is no column here that could tell you what a spell is worth in a cast.`, { focus: "table" });

  spellRowsIn = 2;
  S(3, `<b>Destruction</b>: <code class='inl'>f</code> Fire and <code class='inl'>l</code> Lightning, base <b>3</b> each. The keys are the literal characters the input string is made of, so the lookup on line 14 needs no translation step between input and table.`, { tableNew: true });

  spellRowsIn = 4;
  S(5, `<b>Control</b>: <code class='inl'>i</code> Ice and <code class='inl'>w</code> Wind, base <b>2</b>. Two codes share a category, which is what makes a repeat possible at all — <code class='inl'>"iw"</code> breaks the chain even though the two spells are different.`, { tableNew: true });

  spellRowsIn = 6;
  S(7, `<b>Restoration</b>: <code class='inl'>h</code> Heal and <code class='inl'>s</code> Shield, base <b>1</b>. That is the whole table, and it is the <b>decoy</b>: every number in it is fixed, so nothing here can explain why the same <code class='inl'>"f"</code> scores 3 in one cast and 18 in another. Keep the struct in view — the trace will read it once per spell, and it never changes.`, { tableNew: true });

  S(9, `Score the cast <b>${str === "" ? "(the empty string)" : `"${str}"`}</b>. The parameter binds and the table above stays in scope. The multiplier is a property of the <b>streak</b> a spell arrives in, not of the spell, so the answer cannot be read off the table — it has to be walked.`, { focus: "param", changed: ["spells"] });

  total = 0;
  S(10, `The answer accumulates per spell, so start it at <b>0</b>. Note what the multiplier does <i>not</i> apply to: the running total is never multiplied, only each spell's own base score is.`, { focus: "total", changed: ["total"] });

  mult = 0;
  S(11, `Start the multiplier at <b>0</b>, not 1 — this is the trick that removes the special case for the first spell. The rule "each spell from a different category increases the multiplier by 1" will fire on spell one too, lifting 0 → 1, which is exactly what "the first spell always scores at base value" means.`, { focus: "mult", changed: ["mult"] });

  prev = "";
  S(12, `<b>prev</b> is the previous spell's category, and the empty string is a category no spell has. That's what makes the first comparison come out "different" for free.`, { focus: "prev", changed: ["prev"] });

  chars.forEach((ch, idx) => {
    inLoop = true;
    code = ch;
    const sp = SPELLS[ch];
    S(13, `Take spell <b>${idx + 1}</b> of <b>${chars.length}</b> → <b>code = "${ch}"</b>. We only ever look one spell back, so a single left-to-right pass is enough — nothing later can change what this one is worth.`, {
      focus: "code", changed: ["code"], grew: false, eval: { expr: `spells[${idx}] exists`, val: true },
    });

    cat = sp.cat; base = sp.base;
    S(14, `Read row <b>${ch}</b> out of the <b>SPELLS</b> struct above: <b>${sp.name}</b> — category <b>${cat}</b>, base score <b>${base}</b>. That is the whole of the table's contribution, and it is the same on every pass; the ordering does the rest.`, {
      focus: "look", changed: ["cat", "base"],
    });

    const same = cat === prev;
    const before = mult;
    mult = same ? 1 : mult + 1;
    if (same) streak = [ch]; else streak.push(ch);
    const why = same
      ? `<b>${cat}</b> again, straight after ${prev === cat ? "the last spell" : "it"} — the chain of different categories is broken. It resets to <b>1</b>, not to 0: this spell is the <i>first link of the next chain</i>, so it still scores, just at base. Watch the <b>streak</b> struct drop to a single item rather than emptying.`
      : `<b>${cat}</b> ≠ <b>${prev === "" ? "(nothing yet)" : prev}</b>, so this continues the chain: <b>${before} + 1 = ${mult}</b>. The multiplier is now literally the number of spells in a row that switched category.`;
    S(15, why, { focus: "mrule", changed: ["mult"], grew: !same, eval: { expr: `cat === prev  →  "${cat}" === "${prev}"`, val: same } });

    prev = cat;
    S(16, `Remember this category, because the only thing the next spell needs to know about the whole cast so far is what came immediately before it. Two variables (<b>prev</b>, <b>mult</b>) carry all the history there is.`, { focus: "setprev", changed: ["prev"] });

    const gain = base * mult;
    const was = total;
    total += gain;
    S(17, `Score this spell alone: <b>${base} × ${mult} = ${gain}</b>, and add it in — <b>${was} + ${gain} = ${total}</b>. The multiplier scales the <i>base score</i>, never the running total; multiplying the total instead would re-multiply every spell already paid for.`, {
      focus: "add", changed: ["total"],
    });
  });

  inLoop = false;
  S(13, chars.length
    ? `Every spell has been cast, so <code class='inl'>for…of</code> has nothing left to hand out and <b>code</b>, <b>cat</b> and <b>base</b> leave scope — that's why they vanish from the frame here.`
    : `The cast is empty, so the loop body never runs even once. Nothing is looked up, nothing is multiplied, and the initial <b>total</b> falls straight through.`, {
    focus: "code", eval: { expr: `spells[${chars.length}] exists`, val: false },
  });

  const naive = [...str].reduce((a, c) => a + SPELLS[c].base, 0);
  S(19, `<b>Return ${total}</b> — an integer, with no rounding anywhere: every base score is a whole number and every multiplier is a count, so nothing fractional is ever produced to round. ${chars.length ? `Ignore the combo entirely and these spells would be worth just <b>${naive}</b>; the ordering is doing the other <b>${total - naive}</b>.` : `The sum of no spells is 0.`}`, {
    focus: "ret", done: true, result: total, ret: { value: total },
  });

  return steps;
}

// The published snippet interpolates the table from SPELLS above, so the copy the
// reader pastes runs on exactly the data the demo runs on.
const CODE_ROWS = Object.entries(SPELLS)
  .map(([c, s]) => `  ${c}: { cat: "${s.cat}", base: ${s.base} },`.padEnd(38) + `// ${s.name}`)
  .join("\n");

export default {
  n: 311, id: "spellcast", title: "Spellcaster", dates: ["2026-06-17"],
  statement: `Given a string of spell codes, return the total score of the cast. Each code is one spell: <code class="inl">f</code> Fire and <code class="inl">l</code> Lightning are <b>Destruction</b> (base <b>3</b>), <code class="inl">i</code> Ice and <code class="inl">w</code> Wind are <b>Control</b> (base <b>2</b>), <code class="inl">h</code> Heal and <code class="inl">s</code> Shield are <b>Restoration</b> (base <b>1</b>). A combo multiplier tracks how many spells in a row came from <b>different</b> categories: the first spell scores at base value, each consecutive spell from a different category than the previous raises the multiplier by 1, and a spell from the <b>same</b> category as the previous resets it back to 1. Each spell scores its base × the current multiplier. <span class="rule">Example: <code class="inl">cast("fihwl")</code> → 3×1 + 2×2 + 1×3 + 2×4 + 3×5 = <b>33</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass",
      approach: `The table is the decoy. What decides the answer is the <b>streak</b>: the multiplier is how many spells in a row have switched category, so the same <code class='inl'>"f"</code> is worth 3 in one position and 18 in another. That means two carried variables and one left-to-right pass — <code class='inl'>prev</code> (the last category) and <code class='inl'>mult</code> (the streak length so far). Two details are worth reading literally. <b>A repeat resets to 1, not 0</b>, because the repeating spell is the first link of the next chain and still scores at base. And <b>the multiplier scales the base score, not the running total</b> — multiply the total and you'd re-pay every spell already scored. Starting <code class='inl'>mult</code> at <b>0</b> against a <code class='inl'>prev = ""</code> sentinel makes "the first spell always scores at base" fall out of the same line as every other spell, with no special case.`,
      code: `// Each spell code carries a category and a base score — the table, transcribed.
const SPELLS: Record<string, { cat: string; base: number }> = {
${CODE_ROWS}
};

// The multiplier is a property of the STREAK, not of the spell: it counts how
// many spells in a row have come from different categories. Starting it at 0
// against an impossible "" category means the first spell takes the same
// "different → +1" branch as everyone else and lands on x1 — which is what
// "the first spell always scores at base value" means. A repeat does not zero
// it: that spell is the first link of the next chain, so it resets to 1.
function cast(spells: string): number {
  let total = 0;
  let mult = 0;
  let prev = "";
  for (const code of spells) {
    const { cat, base } = SPELLS[code];
    mult = cat === prev ? 1 : mult + 1;
    prev = cat;
    total += base * mult;   // the multiplier scales THIS spell, not the total
  }
  return total;
}`,
      mount,
    },
    {
      name: "Step through", cost: "running streak",
      approach: `A debugger for the scan. The <b>SPELLS</b> struct fills a category at a time as lines 2–7 run and then stays for the whole call — line 14 reads it once per spell, so <code class='inl'>cat</code> and <code class='inl'>base</code> can be checked against the transcribed table rather than taken on trust. The <b>streak</b> struct holds the spells in the current unbroken chain, and <code class='inl'>mult</code> is nothing more than its length — watch the two move together. The moment a category repeats, the struct collapses to a <b>single</b> item rather than emptying, which is the reset-to-1 rule made visible. Case <b>3</b> breaks in the middle and climbs again; case <b>7</b> is the empty cast, where the loop body never runs at all; cases <b>8</b> and <b>9</b> are the same six spells clumped and interleaved. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–5 official, 6–${CASES.length} ours` },
      }),
    },
  ],
};
