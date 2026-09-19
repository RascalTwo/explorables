// #316 · 1337 Speak — i and l both become 1, so the table is many-to-one: leet has no decoder.
// ONE approach — the normal outcome, not a shortfall (CONTRIBUTING Tier 3: most
// modules ship a single Solution + Step through). The whole job is a
// per-character table lookup — `[...s].map(c => LEET[c] ?? c).join("")` —
// and the tempting "second approach", eight chained `.replace(/a/g, "4")` calls,
// is the same mental model spelled differently. Tier 3 rejects that pair
// explicitly, so there is no brute/opt axis to manufacture here.
//
// Two things about this table DO earn the page, and the demo is built around
// them rather than around the substitution:
//   • It is MANY-TO-ONE. `i` and `l` both map to `1`, so nothing decodes: the
//     official case "satellite" → "547311173" has EIGHT possible originals.
//     That is the header insight and the demo's teaching payload.
//   • One row invites a real bug. Write the table with NUMBER values and reach
//     for `LEET[c] || c` and the `o → 0` row breaks, because `0` is falsy — the
//     miss branch steals the hit and makeLeet("cool") returns "coo1", failing
//     the grader's very FIRST case while the other seven rows still look fine.
//     This module stores STRING values and uses `??`; either guard alone suffices.
import { el, esc, mountDebugger } from "../shared.js";

// freeCodeCamp's printed table, transcribed in its own row order. Values are
// strings, not numbers — see the header. Everything below (the code block, the
// debugger's source lines, the statement, the reverse map) is derived from this
// one object, so the shipped snippet cannot drift from the data the demo runs on.
const LEET = { a: "4", e: "3", g: "9", i: "1", l: "1", o: "0", s: "5", t: "7" };
const ROWS = Object.entries(LEET);
const rowText = (rs) => rs.map(([k, v]) => `${k}: "${v}"`).join(", ");

const makeLeet = (str) => [...str].map((c) => LEET[c] ?? c).join("");

// The reverse map, built from LEET so it cannot disagree with it: leet char →
// every letter that produces it. Exactly one entry has length 2 — "1" ← i, l.
const BACK = {};
for (const [k, v] of ROWS) (BACK[v] ||= []).push(k);

// What could this output character have been? The problem guarantees a lowercase
// input, so a digit's only possible sources are its table rows; anything else
// passed straight through and can only have been itself.
const sources = (ch) => BACK[ch] || [ch];
const preimageCount = (out) => [...out].reduce((n, ch) => n * sources(ch).length, 1);
// Mixed-radix decode: hand back the i-th preimage without materialising all of
// them, because a string with 20 ones has a million and we only ever show eight.
const preimageAt = (out, i) => {
  const cells = [...out].map(sources);
  let rest = i, s = "";
  for (let k = cells.length - 1; k >= 0; k--) {
    s = cells[k][rest % cells[k].length] + s;
    rest = Math.floor(rest / cells[k].length);
  }
  return s;
};

const vis = (c) => (c === " " ? "␣" : c);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .lt3-wrap { max-width:760px; }
    .lt3-strip { display:flex; gap:5px; flex-wrap:wrap; margin:10px 0 2px; min-height:58px; align-items:flex-start; }
    .lt3-tile { min-width:34px; padding:4px 6px 5px; border-radius:8px; border:1px solid var(--border);
                background:var(--panel-2); text-align:center; }
    .lt3-tile .f { display:block; font:600 11px var(--mono); color:var(--muted); }
    .lt3-tile .a { display:block; font:9px var(--mono); color:var(--muted); opacity:.5; line-height:1.1; }
    .lt3-tile .t { display:block; font:800 16px var(--mono); color:var(--muted); }
    .lt3-tile.sub { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 13%,transparent); }
    .lt3-tile.sub .t { color:var(--accent); }
    .lt3-tile.zero { border-color:var(--warn); background:color-mix(in srgb,var(--warn) 13%,transparent); }
    .lt3-tile.zero .t { color:var(--warn); }
    .lt3-tile.amb { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 13%,transparent); }
    .lt3-tile.amb .t { color:var(--danger); }
    .lt3-box { border:1px solid var(--border); border-radius:10px; padding:9px 12px 12px; margin-top:14px; }
    .lt3-box.rev { border-color:color-mix(in srgb,var(--danger) 40%,var(--border)); }
    .lt3-hd { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
    .lt3-hd h4 { margin:0; font:700 12.5px var(--mono); color:var(--text); }
    .lt3-src { min-width:34px; padding:5px 7px 6px; border-radius:8px; border:1px solid var(--border);
               background:var(--panel-2); text-align:center; }
    .lt3-src .t { display:block; font:800 16px var(--mono); color:var(--text); }
    .lt3-src .f { display:block; font:600 10.5px var(--mono); color:var(--muted); margin-top:2px; }
    .lt3-src.two { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 13%,transparent); }
    .lt3-src.two .f { color:var(--danger); }
    .lt3-cands { display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; }
    .lt3-cand { font:700 12.5px var(--mono); padding:4px 9px; border-radius:7px;
                border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .lt3-cand.you { border-color:var(--good); color:var(--good); }
    .lt3-tally { font:12.5px var(--mono); color:var(--muted); margin-top:12px; }
    .lt3-tally b { color:var(--text); }
    .lt3-tally .hot { color:var(--danger); }
  `));
}

// ── Solution demo — forward on top, backward underneath ──────────────────────
// The forward half is the challenge and takes four lines. The reverse panel is
// the point: it enumerates every lowercase string that makeLeet() maps onto the
// same output, so the collapse of `i` and `l` is a number on screen rather than
// a remark. Type a word with both (the "satellite" chip, or your own) to see it.
function mount(host) {
  ensureStyle();
  let str = CASES[0].str;

  const inp = el("input"); inp.type = "text"; inp.value = str; inp.style.width = "260px";
  inp.oninput = () => { str = inp.value; render(); };
  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "str ="), inp);

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", c.str);
    b.onclick = () => { str = c.str; render(); };
    chips.append(b);
  });

  const fwd = el("div", "lt3-box");
  const rev = el("div", "lt3-box rev");
  const tally = el("div", "lt3-tally");
  const wrap = el("div", "lt3-wrap");
  wrap.append(ctl, chips, fwd, rev, tally);
  host.append(
    el("div", "note", "Type anything lowercase, or pick a case. The top panel substitutes character by character — <b>amber</b> is the <code class='inl'>o → 0</code> row that a <code class='inl'>||</code> fallback would silently drop, <b>red</b> is a character that turned into a <code class='inl'>1</code>. The bottom panel runs the table <i>backwards</i>, which is where the problem gets interesting."),
    wrap,
  );
  render();

  function render() {
    if (inp.value !== str) inp.value = str;
    const chars = [...str];
    const out = makeLeet(str);
    const ones = [...out].filter((ch) => ch === "1").length;
    const total = preimageCount(out);
    // 2^ones is exact as a double for any realistic input, but its DECIMAL
    // rendering is not past 2^53 — so past that, show the exponent instead of a
    // number whose last digits would be a lie.
    const totalTxt = total > Number.MAX_SAFE_INTEGER ? `2<sup>${ones}</sup>` : total.toLocaleString();

    // ── forward ──
    fwd.innerHTML = "";
    fwd.append(el("div", "lt3-hd",
      `<h4>[...str].map(c =&gt; LEET[c] ?? c).join("")</h4><span class="tag">${chars.length} character${chars.length === 1 ? "" : "s"}</span>`));
    const fs = el("div", "lt3-strip");
    if (!chars.length) fs.append(el("span", "muted", "(empty string — map over nothing, join nothing, return \"\")"));
    chars.forEach((c) => {
      const v = LEET[c];
      const hit = v !== undefined;
      const kind = !hit ? "" : v === "1" ? " amb" : v === "0" ? " zero" : " sub";
      fs.append(el("div", "lt3-tile" + kind,
        `<span class="f">${esc(vis(c))}</span><span class="a">${hit ? "↓" : "="}</span><span class="t">${esc(vis(hit ? v : c))}</span>`));
    });
    fwd.append(fs, el("div", "result-line", `<span class="badge ok">"${esc(out)}"</span>` +
      (chars.length ? `<span class="tag">${chars.filter((c) => LEET[c] !== undefined).length} of ${chars.length} characters had a row; the rest fell through <code class='inl'>??</code> unchanged</span>` : "")));

    // ── backward ──
    rev.innerHTML = "";
    rev.append(el("div", "lt3-hd",
      `<h4>…and back again?</h4><span class="tag">${totalTxt} possible original${total === 1 ? "" : "s"}</span>`));
    const rs = el("div", "lt3-strip");
    if (!out.length) rs.append(el("span", "muted", "(nothing to decode)"));
    [...out].forEach((ch) => {
      const src = sources(ch);
      rs.append(el("div", "lt3-src" + (src.length > 1 ? " two" : ""),
        `<span class="t">${esc(vis(ch))}</span><span class="f">${src.map((s) => esc(vis(s))).join(" or ")}</span>`));
    });
    rev.append(rs);

    if (total > 1) {
      const shown = Math.min(total, 8);
      const cands = el("div", "lt3-cands");
      for (let i = 0; i < shown; i++) {
        const p = preimageAt(out, i);
        cands.append(el("div", "lt3-cand" + (p === str ? " you" : ""), esc(p) + (p === str ? " ← yours" : "")));
      }
      if (total > shown) cands.append(el("div", "lt3-cand", total > Number.MAX_SAFE_INTEGER ? `and the rest of the 2<sup>${ones}</sup>` : `+${(total - shown).toLocaleString()} more`));
      rev.append(cands);
    }

    tally.innerHTML = !out.length
      ? `Empty in, empty out — <code class='inl'>[].join("")</code> is <code class='inl'>""</code>, so no branch is needed for it.`
      : ones === 0
        ? `No <b>1</b> in the output, so every character here has exactly one source and this particular string <b>does</b> round-trip. That is a property of the input, not of the function — add a single <code class='inl'>i</code> or <code class='inl'>l</code> and it stops being true.`
        : `<b>${ones}</b> character${ones === 1 ? "" : "s"} became a <b>1</b>, and each one could have been <code class='inl'>i</code> <i>or</i> <code class='inl'>l</code> — so <span class="hot">2<sup>${ones}</sup> = ${totalTxt}</span> different lowercase strings all produce <b>"${esc(out)}"</b>. <code class='inl'>makeLeet</code> is a function, not a cipher: seven of the eight rows are one-to-one, and the single collision is enough to destroy the inverse.`;
  }
}

// Interpolated from LEET above, so the snippet and the demo cannot disagree —
// and it pastes into a file and runs on its own.
const CODE = `// The statement prints an 8-row table, so ship the table: not eight if/else
// branches, and not eight chained .replace() calls. Values are STRINGS on purpose.
const LEET: Record<string, string> = {
  ${rowText(ROWS.slice(0, 4))},
  ${rowText(ROWS.slice(4))},   // i and l share "1" — the map is many-to-one
};

function makeLeet(str: string): string {
  // ?? falls through only on null/undefined, i.e. only on a genuine MISS.
  // The trap it dodges: written with NUMBER values, LEET["o"] would be 0, which
  // is falsy, so \`LEET[c] || c\` would throw that hit away and return "o" —
  // makeLeet("cool") gives "coo1" and fails the grader's first case, while the
  // other seven rows keep working. Two independent guards, either one enough:
  // string values ("0" is truthy) and ?? (only null/undefined trigger it).
  return [...str].map((c) => LEET[c] ?? c).join("");
}`;

// ── STEP — one lookup decision per character ─────────────────────────────────
// Cases 1–5 are freeCodeCamp's five official tests, in the grader's own order.
// Cases 6–7 are ours, and each reaches a branch the official set never does.
// Every case lands somewhere different:
//   1 "cool"      — the o → "0" row, the one hit a `||` fallback would discard.
//   2 "leet"      — every character substitutes; the result is all digits.
//   3 "hacker"    — the MISS path is the majority (h, c, k, r have no row).
//   4 "satellite" — the collision, three times over: l, l and i all become 1,
//                   so 2³ = 8 lowercase strings share this output.
//   5 "abc…xyz"   — every table row exactly once, plus all 18 misses.
//   6 "crunchy"   — ours: zero substitutions. A fixed point of the map, and the
//                   only shape of input that provably round-trips.
//   7 "hello, world!" — ours: the space, comma and bang are not letters and are
//                   not special-cased either; they miss exactly like `h` does.
const CASES = [
  { str: "cool", why: "the falsy-zero row" },
  { str: "leet", why: "the eponymous case — all four characters substitute" },
  { str: "hacker", why: "mostly misses" },
  { str: "satellite", why: "three ones from two different letters" },
  { str: "abcdefghijklmnopqrstuvwxyz", why: "every row of the table, exactly once" },
  { str: "crunchy", why: "ours: not one substitutable letter" },
  { str: "hello, world!", why: "ours: spaces and punctuation" },
];

const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">LEET</span> = {` },
  { ln: 2, html: `  <span class="tok" data-t="rows1">${rowText(ROWS.slice(0, 4)).replace(/"(\d)"/g, '<span class="st">"$1"</span>')}</span>,` },
  { ln: 3, html: `  <span class="tok" data-t="rows2">${rowText(ROWS.slice(4)).replace(/"(\d)"/g, '<span class="st">"$1"</span>')}</span>,` },
  { ln: 4, html: `<span class="tok" data-t="seal">}</span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">makeLeet</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> chars = <span class="tok" data-t="spread">[...str]</span>;` },
  { ln: 7, html: `  <span class="k">const</span> out = chars.<span class="fn">map</span>(c =&gt; <span class="tok" data-t="lookup">LEET[c]</span> <span class="tok" data-t="fallback">?? c</span>);` },
  { ln: 8, html: `  <span class="k">return</span> out.<span class="tok" data-t="join"><span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 9, html: `}` },
];

// Instrumented run → debugger steps. One frame; scope by omission and by line.
// LEET is a module constant, so it appears at line 1 and stays for the whole
// call; `str` binds at line 5; the `chars` struct arrives at line 6 and `out` at
// line 7. `c` is the map callback's parameter, so it exists ONLY while line 7 is
// running and vanishes again at line 8.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { str, why } = CASES[idx];
  const chars = [...str];
  const steps = [];
  const entries = ROWS.map(([k, v]) => `${k}→${v}`);
  let filled = 0;
  const got = [], outs = [];
  let c = null, cLive = false;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 5) vars.str = `"${str}"`;
    if (line === 7 && cLive) vars.c = `"${vis(c)}"`;
    const structs = [{ label: "LEET", items: entries.slice(0, filled), newest: !!x.tableNew }];
    if (line >= 6) structs.push({ label: "chars", items: got.map(vis), newest: !!x.charsNew });
    if (line >= 7) structs.push({ label: "out", items: outs.map(vis), newest: !!x.outNew });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 5 ? `makeLeet("${str}")` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Nothing has been called yet. The table the problem statement <i>prints</i> is built <b>once</b>, at module load, and that is the whole design decision: eight rows of data instead of eight <code class='inl'>if</code>s or eight chained <code class='inl'>.replace()</code> calls, which would encode the same facts as control flow and make a ninth letter an edit to the function.`, { focus: "decl" });

  filled = 4;
  S(2, `Four rows land. Look at what the values <b>are</b>: the string <code class='inl'>"4"</code>, not the number <code class='inl'>4</code>. The output is a string either way, so numbers would <i>seem</i> harmless here — the next line is where that choice turns into a bug.`, { focus: "rows1", tableNew: true });

  filled = 8;
  S(3, `Four more, and both of this challenge's real problems are on this line. <code class='inl'>l: "1"</code> is the <b>second</b> key whose value is <code class='inl'>"1"</code> — <code class='inl'>i</code> got there first — so the table is <b>many-to-one</b> and nothing downstream can undo it. And <code class='inl'>o: "0"</code> is the one row whose value would be <b>falsy</b> if it were a number: <code class='inl'>LEET[c] || c</code> would discard that hit and hand back <code class='inl'>"o"</code>, so <code class='inl'>makeLeet("cool")</code> would return <b>"coo1"</b> — official case 1, failed, with the other seven rows still working.`, { focus: "rows2", tableNew: true });

  S(4, `Sealed: <b>8 keys, 7 distinct values</b>. That count mismatch is the entire interesting property of this challenge. Seven of the substitutions are one-to-one and could be run backwards; the eighth collides with one of them, which is enough to make the <i>whole</i> function non-invertible.`, { focus: "seal" });

  S(5, `Call <b>makeLeet("${str}")</b> — ${why}. One parameter, and the problem guarantees it is lowercase, so there is no case-folding to do: the keys can be matched exactly as they are written.`, { focus: "param", changed: ["str"] });

  got.push(...chars);
  S(6, `Split into <b>${chars.length}</b> character${chars.length === 1 ? "" : "s"} to look up one at a time. <code class='inl'>[...str]</code> iterates <b>code points</b>; here everything is ASCII, so <code class='inl'>split("")</code> would give the same array — the spread is the habit worth keeping rather than a fix this input needs.`, { focus: "spread", charsNew: true });

  chars.forEach((ch, i) => {
    c = ch; cLive = true;
    const v = LEET[ch];
    const hit = v !== undefined;
    outs.push(hit ? v : ch);
    let note;
    if (!hit) {
      note = `<code class='inl'>LEET["${vis(ch)}"]</code> → <b>undefined</b>. ${/[a-z]/.test(ch)
        ? `<b>${ch}</b> is a letter the table simply has no row for.`
        : `<b>${vis(ch)}</b> is not a letter at all — and notice there is no branch for that. Punctuation and spaces are not <i>handled</i>; they just fail the same lookup every other missing key fails.`} A missing property is not an error in JavaScript, so the miss arrives silently as <code class='inl'>undefined</code>, and <code class='inl'>?? c</code> puts the original character back. On a miss <code class='inl'>||</code> would behave identically — the two only part company on a <b>hit</b>, which is the next thing to watch for.`;
    } else if (ch === "o") {
      note = `<code class='inl'>LEET["o"]</code> → <b>"0"</b>, and this is the probe that separates a working solution from a nearly-working one. The lookup <i>succeeded</i>, so the fallback must not fire — but with a <b>number</b>-valued table this hit would be <code class='inl'>0</code>, which is falsy, and <code class='inl'>LEET[c] || c</code> reads a falsy hit as "no answer" and substitutes <code class='inl'>"o"</code>. <code class='inl'>??</code> asks the right question (is it <i>null/undefined</i>?) rather than a convenient one (is it truthy?), so it keeps the zero.`;
    } else if (v === "1") {
      const other = ch === "i" ? "l" : "i";
      note = `<code class='inl'>LEET["${ch}"]</code> → <b>"1"</b> — and so does <code class='inl'>LEET["${other}"]</code>. The probe itself is unremarkable; what it costs is. This is the only value two keys share, so the <b>1</b> just written into <code class='inl'>out</code> no longer records which of the two letters produced it. Every other row is still reversible at this point; this one throws information away.`;
    } else {
      note = `<code class='inl'>LEET["${ch}"]</code> → <b>"${v}"</b>. One hash probe on an <b>exact</b> key — the character was never compared against anything, it was <i>retrieved</i>, which is why the function has one code path no matter how many rows the table grows to. <code class='inl'>"${v}"</code> is this table's only source for <code class='inl'>${ch}</code>, so <i>this</i> character could still be decoded later.`;
    }
    S(7, `Character <b>${i + 1}</b> of ${chars.length}. ${note}`,
      { focus: hit ? "lookup" : "fallback", changed: ["c"], outNew: true, eval: { expr: `"${vis(ch)}" in LEET`, val: hit } });
  });

  cLive = false;
  const out = outs.join("");
  const ones = [...out].filter((x) => x === "1").length;
  const total = preimageCount(out);
  const hits = chars.filter((x) => LEET[x] !== undefined).length;
  S(8, !chars.length
    ? `<code class='inl'>[].join("")</code> is <code class='inl'>""</code>. The empty string needs no special case — <code class='inl'>map</code> ran zero callbacks and <code class='inl'>join</code> had nothing to stitch.`
    : ones === 0
      ? `<code class='inl'>join("")</code> with the empty separator glues the pieces back into <b>"${out}"</b> — ${hits ? `${hits} substituted, ${chars.length - hits} passed through` : `nothing substituted at all, so the output equals the input`}. No <b>1</b> anywhere, which means every character here has exactly one possible source and this string <i>can</i> be decoded. That is luck about the input, not a property of the function.`
      : `<code class='inl'>join("")</code> returns <b>"${out}"</b> — and here is the bill for line 3. <b>${ones}</b> of those characters ${ones === 1 ? "is a" : "are"} <b>1</b>, and each could have come from <code class='inl'>i</code> or <code class='inl'>l</code>, so <b>2<sup>${ones}</sup> = ${total}</b> different lowercase strings all translate to this exact output. The grader only ever runs the function forwards, so it never notices — but "translate it back" is not a task this table can be asked to do.`,
    { focus: "join", done: true, result: `"${out}"`, ret: { value: `"${out}"` } });

  return steps;
}

export default {
  n: 316, id: "leet", title: "1337 Speak", dates: ["2026-06-22"],
  statement: `Given a lowercase string, return it translated into leet speak using this table: ${ROWS.map(([k, v]) => `<code class="inl">${k}</code>→<code class="inl">${v}</code>`).join(" · ")}. Characters with no substitution are left unchanged. <span class="rule">Example: <code class="inl">makeLeet("leet")</code> → <b>"1337"</b>; <code class="inl">makeLeet("satellite")</code> → <b>"547311173"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one probe per character",
      approach: `The statement hands you a table, so <b>store a table</b> and the answer is one <code class='inl'>map</code>: <code class='inl'>[...str].map(c =&gt; LEET[c] ?? c).join("")</code>. Eight <code class='inl'>if</code>s or eight chained <code class='inl'>.replace()</code> calls return the same string; they just re-encode the data as control flow. That part is small, and pretending otherwise would be dishonest — so the demo spends its space on the two things that are <i>not</i> obvious. First, <code class='inl'>o</code> maps to <code class='inl'>0</code>, the one row that is falsy if you write the table with numbers: <code class='inl'>LEET[c] || c</code> then discards a successful lookup and <code class='inl'>makeLeet("cool")</code> returns <b>"coo1"</b>, failing official case 1 while the other seven rows still pass. Storing strings fixes it; so does <code class='inl'>??</code>; this uses both. Second, and more interesting: <code class='inl'>i</code> and <code class='inl'>l</code> <b>both</b> become <code class='inl'>1</code>, so eight keys share seven values and the map is <b>many-to-one</b>. Leet speak has no decoder. Click <b>satellite</b> and read the bottom panel — one output, eight possible originals.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "hit · miss · the falsy hit",
      approach: `A debugger for the same seven cases. It starts <b>above</b> the function, watching the table fill, because line 3 is where both of this challenge's real decisions are made — <code class='inl'>l: "1"</code> collides with <code class='inl'>i</code>, and <code class='inl'>o: "0"</code> is the value a <code class='inl'>||</code> fallback would mistake for a miss. Then one step per character, each one narrating <b>which branch the lookup took</b>: a plain reversible hit, the falsy <code class='inl'>o</code> hit, one of the two hits that collapse into <code class='inl'>1</code>, or a miss that <code class='inl'>??</code> passes through untouched. Watch <code class='inl'>c</code> appear only while line 7 runs, and the <code class='inl'>out</code> struct fill one slot per probe. Case <b>1</b> is the falsy-zero row, case <b>4</b> collides three times, case <b>6</b> substitutes nothing at all, and case <b>7</b> is punctuation. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–5 official, 6–7 ours` },
      }),
    },
  ],
};
