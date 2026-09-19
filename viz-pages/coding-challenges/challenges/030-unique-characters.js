// #30 · Unique Characters — "are these all distinct?" is "have I seen this before?".
// The question reads as a fact about the whole string, so the first solution goes
// looking for it the only way a string can be searched without writing anything
// down: take each character and compare it against every character after it. That
// is n(n−1)/2 comparisons to answer one boolean, and every single one of them
// re-asks something an earlier position already knew.
// • BRUTE / compare every pair — an n×n upper triangle of ===, no memory at all.
// • OPT   / remember what you've seen — one pass, one Set, O(1) membership.
// The cost gap only shows on the inputs where the answer is TRUE, because a false
// answer lets both sides quit early: "hello" costs 8 comparisons against 4 lookups
// and looks like nothing. Flip the Approach toggle on "QwErTy123!@" — 55 against
// 11 — or "~!@#$%^&*()_+" — 78 against 13. Test only the failing strings and the
// whole difference stays invisible, which is the actual lesson.
// One rule in the statement is free: "uppercase and lowercase are different
// characters" is already how === and Set behave, so the correct amount of code to
// write for it is none. The official "aA" → true case exists to catch a reflexive
// .toLowerCase().
// One case here is OURS and the grader cannot catch it. The idiomatic one-liner
// `new Set(str).size === str.length` passes all 7 official tests, so nothing
// freeCodeCamp publishes distinguishes it from the loop — but it mixes units: Set
// counts code points, .length counts UTF-16 code units. The "🙂🙃" preset is an
// invented input where it reads 2 === 4 and answers false for a string whose two
// characters are plainly distinct. Both variants here iterate by code point
// ([...str] and for…of) precisely so they agree on it; the one-liner is the odd
// one out, and the opt demo draws that split. Treat it as this module doing better
// than the grader, not as a failing official case.
import { el, esc, mountDebugger } from "../shared.js";

// The 7 official freeCodeCamp cases, in the grader's order, then three of ours.
//   "" — the degenerate the grader never tries. Neither loop runs a single
//     iteration, so both return true by falling off the end: vacuously unique.
//   "abcdefghijklmnopqrstuvwxyz" — ours, and the loudest form of the divergence:
//     325 comparisons against 26 lookups, same answer. The official set tops out
//     at 13 characters, so it never makes the gap shout.
//   "🙂🙃" — ours, and the one input where the compressed one-liner
//     `new Set(str).size === str.length` stops being the same function. A Set
//     counts code points (2), `.length` counts UTF-16 code units (4), so it
//     reports false for a string whose two characters are plainly distinct.
//     No official case goes near this; both variants here iterate by code point
//     deliberately, so they agree, and the demo shows the one-liner disagreeing.
const OFFICIAL = [
  "abc", "aA", "QwErTy123!@", "~!@#$%^&*()_+",
  "hello", "freeCodeCamp", "!@#*$%^&*()aA",
];
const CASES = [...OFFICIAL, "", "abcdefghijklmnopqrstuvwxyz", "🙂🙃"];
const OPENING = OFFICIAL[2]; // "QwErTy123!@" — 55 vs 11, the payoff case

// ── the two runs, instrumented ──────────────────────────────────────────────
// Brute: the upper triangle. `hit` is the first colliding pair, and everything
// after it was never looked at — which is the whole reason a false answer is
// cheap and a true one is not.
function bruteRun(str) {
  const chars = [...str];
  const n = chars.length;
  let comparisons = 0, hit = null;
  outer:
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (chars[i] === chars[j]) { hit = { i, j, ch: chars[i] }; break outer; }
    }
  }
  return { chars, n, comparisons, hit, total: (n * (n - 1)) / 2, ok: !hit };
}

// Was pair (i, j) actually reached, or is it triangle the early return skipped?
const reached = (r, i, j) => !r.hit || i < r.hit.i || (i === r.hit.i && j <= r.hit.j);

// Opt: one pass. `trail` is what the demo draws — per character, whether this was
// its first sighting (goes into `seen`) or the second one (which ends the call).
function optRun(str) {
  const set = new Set(), seen = [], trail = [];
  let hit = null;
  for (const ch of str) {
    const again = set.has(ch);
    trail.push({ ch, again });
    if (again) { hit = ch; break; }
    set.add(ch); seen.push(ch);
  }
  // The compressed form, evaluated separately so the demo can show where the two
  // part company: size is a count of code points, length a count of code units.
  return { trail, seen, hit, lookups: trail.length, ok: !hit,
    size: new Set(str).size, len: str.length, oneLiner: new Set(str).size === str.length };
}

// Does this string hold two characters that differ only by case? That pair is the
// statement's casing rule made visible — and the thing a .toLowerCase() destroys.
function casePair(chars) {
  for (let i = 0; i < chars.length; i++)
    for (let j = i + 1; j < chars.length; j++)
      if (chars[i] !== chars[j] && chars[i].toLowerCase() === chars[j].toLowerCase())
        return [chars[i], chars[j]];
  return null;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .uc-wrap { display:flex; flex-direction:column; gap:12px; }
    .uc-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .uc-grid { display:grid; gap:2px; width:max-content; max-width:100%; overflow:auto; align-items:center; }
    .uc-h { font:700 11px var(--mono); color:var(--muted); padding-right:7px; text-align:right; white-space:nowrap; }
    .uc-h.hit { color:var(--danger); }
    .uc-h.cold { opacity:.3; }
    .uc-t { font:700 10.5px var(--mono); color:var(--muted); padding-left:8px; white-space:nowrap; }
    .uc-t.hit { color:var(--danger); }
    .uc-c { border-radius:2px; border:1px solid transparent; display:flex; align-items:center; justify-content:center;
            font:700 10px var(--mono); color:var(--muted); }
    .uc-c.pair { background:var(--panel-2); border-color:var(--border); }
    .uc-c.done { background:color-mix(in srgb, var(--accent) 16%, transparent); border-color:color-mix(in srgb, var(--accent) 45%, var(--border)); color:var(--accent); }
    .uc-c.cold { background:var(--panel); border-color:var(--border); opacity:.22; }
    .uc-c.hit { background:var(--danger); border-color:var(--danger); color:var(--bg); }
    .uc-cards { display:flex; flex-wrap:wrap; gap:5px; }
    .uc-card { min-width:40px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:5px 7px; text-align:center; }
    .uc-card .v { display:block; font:800 15px var(--mono); color:var(--text); }
    .uc-card .w { font:700 9px var(--sans); letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
    .uc-card.first { border-color:color-mix(in srgb, var(--accent) 50%, var(--border)); }
    .uc-card.first .w { color:var(--accent); }
    .uc-card.again { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 14%, transparent); }
    .uc-card.again .v, .uc-card.again .w { color:var(--danger); }
    .uc-card.unread { opacity:.22; }
    .uc-chips { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
    .uc-kv { font:700 12px var(--mono); border:1px solid var(--border); border-radius:6px; padding:3px 8px; background:var(--panel); color:var(--accent); }
    .uc-one { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .uc-one b { font-family:var(--mono); color:var(--text); }
    .uc-one.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .uc-one.split b { color:var(--danger); }
  `));
}

// Chips carry the empty string too, so it needs a visible stand-in; everything
// else is shown verbatim, since the whole point is which characters are in there.
const chipLabel = (s) => s === "" ? "(empty)" : s.length > 16 ? s.slice(0, 15) + "…" : s;
const quoted = (s) => `"${esc(s)}"`;
const plural = (n, one, many) => n === 1 ? one : many;

// Shared controls: one text field plus the preset chips. Both approaches read the
// same field, so flipping the toggle keeps whatever case you were looking at.
function controls(host, onChange) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = OPENING; inp.style.width = "300px";
  ctl.append(el("span", "ctl-label", "str"), inp);
  const pre = el("div", "controls");
  CASES.forEach((s) => {
    const c = el("button", "chip", esc(chipLabel(s)));
    c.onclick = () => { inp.value = s; onChange(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = onChange;
  queueMicrotask(onChange); // defer: the caller's `const out = controls(...)` must bind first
  // READ_CAP is not a display limit — the brute really is quadratic, so a pasted
  // novel would run billions of === on every keystroke. 1200 characters is 720k
  // comparisons, which is instant, and is already far past what the grid can draw.
  return { out, read: () => String(inp.value).slice(0, READ_CAP) };
}

const READ_CAP = 1200;
const GRID_CAP = 34; // beyond this the triangle is more cells than a page wants

// ── BRUTE demo — the upper triangle of === ──────────────────────────────────
function mountBrute(host) {
  const { out, read } = controls(host, render);
  function render() {
    const str = read();
    const r = bruteRun(str);
    const o = optRun(str);
    out.innerHTML = "";
    const wrap = el("div", "uc-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${r.ok ? "ok" : "no"}">allUnique(${quoted(str)}) → ${r.ok}</span>` +
      `<span class="opcount hot"><span class="n">${r.comparisons.toLocaleString("en-US")}</span> comparison${plural(r.comparisons, "", "s")}${r.total ? ` of ${r.total.toLocaleString("en-US")} possible pair${plural(r.total, "", "s")}` : ""}</span>`));

    if (!r.n) {
      wrap.append(el("div", "note", "The empty string has no characters, so the outer loop fails its very first condition and no pair is ever formed. The function falls through to <code class='inl'>return true</code> — <b>vacuously unique</b>, and it needs no branch of its own. freeCodeCamp never tests this, which is exactly why it is worth typing in."));
      out.append(wrap); return;
    }
    if (r.n > GRID_CAP) {
      wrap.append(el("div", "note", `<b>${r.n}</b> characters is <b>${r.total.toLocaleString("en-US")}</b> pairs — too many cells to draw, which is rather the point. Trim below ${GRID_CAP} characters to see the triangle.${str.length === READ_CAP ? ` (Only the first <b>${READ_CAP}</b> characters are being analysed — past that the quadratic loop is slow enough to stall the page on every keystroke, which is the same fact from the other side.)` : ``}`));
      out.append(wrap); return;
    }

    // Row i, column j. Only j > i exists — (a,b) and (b,a) are the same pair, and
    // (a,a) is a character against itself — so the shape is a triangle, not a square.
    const cs = r.n <= 8 ? 26 : r.n <= 14 ? 20 : r.n <= 22 ? 14 : 10;
    const grid = el("div", "uc-grid");
    grid.style.gridTemplateColumns = `max-content repeat(${r.n}, ${cs}px) max-content`;
    const cells = [];
    for (let i = 0; i < r.n; i++) {
      const rowLive = !r.hit || i <= r.hit.i;
      const rowHit = r.hit && i === r.hit.i;
      cells.push(`<div class="uc-h${rowHit ? " hit" : rowLive ? "" : " cold"}">${esc(r.chars[i])}</div>`);
      for (let j = 0; j < r.n; j++) {
        if (j <= i) { cells.push(`<div style="height:${cs}px"></div>`); continue; }
        const isHit = r.hit && i === r.hit.i && j === r.hit.j;
        const cls = isHit ? "hit" : reached(r, i, j) ? "done" : "cold";
        cells.push(`<div class="uc-c pair ${cls}" style="height:${cs}px" title="${esc(r.chars[i])} === ${esc(r.chars[j])}">${cs >= 14 ? esc(r.chars[j]) : ""}</div>`);
      }
      const done = rowHit ? r.hit.j - i : rowLive ? r.n - 1 - i : 0;
      cells.push(`<div class="uc-t${rowHit ? " hit" : ""}">${done}${rowHit ? ` ✗ matched '${esc(r.hit.ch)}'` : rowLive ? "" : " — never run"}</div>`);
    }
    grid.innerHTML = cells.join("");
    wrap.append(el("div", "uc-lbl", `row i vs every character after it — each cell is one <code class="inl">===</code>`), grid);

    const cp = casePair(r.chars);
    wrap.append(el("div", "note", (r.hit
      ? `<b>'${esc(r.hit.ch)}'</b> at position ${r.hit.i} meets itself again at position ${r.hit.j}, and the answer is settled there — <b>${r.comparisons}</b> of the <b>${r.total}</b> pairs, with the dimmed cells never looked at. A <b>false</b> answer is the cheap case: one match ends it, so the two approaches barely differ here (<b>${r.comparisons}</b> comparison${plural(r.comparisons, "", "s")} against the Set's <b>${o.lookups}</b> lookup${plural(o.lookups, "", "s")}). `
      : `${plural(r.total, "The single pair", `Every one of the <b>${r.total}</b> pairs`)} was checked, because <b>true</b> is the answer you can only give after exhausting the triangle — there is no early exit from "nothing matched". That is where this approach actually costs you: <b>${r.total}</b> comparison${plural(r.total, "", "s")} against <b>${o.lookups}</b> Set lookup${plural(o.lookups, "", "s")} for the same boolean. `) +
      `The inner loop starts at <code class='inl'>i + 1</code> rather than <code class='inl'>0</code>: comparing a character with itself is always true, and <code class='inl'>(a, b)</code> and <code class='inl'>(b, a)</code> are one pair, so half the square plus the diagonal is dead weight. ` +
      (cp ? `Notice <b>'${esc(cp[0])}'</b> and <b>'${esc(cp[1])}'</b> sitting together without colliding — <code class='inl'>===</code> on strings is case-sensitive already, so the statement's "uppercase and lowercase are different characters" rule is enforced by code nobody wrote. Lowercase the input first and this pair starts matching. ` : ``) +
      `Nothing a row learns outlives it, which is the waste the other approach removes.`));
    out.append(wrap);
  }
}

// ── OPT demo — one pass, one Set ────────────────────────────────────────────
function mountOpt(host) {
  const { out, read } = controls(host, render);
  function render() {
    const str = read();
    const o = optRun(str);
    const b = bruteRun(str);
    out.innerHTML = "";
    const wrap = el("div", "uc-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${o.ok ? "ok" : "no"}">allUnique(${quoted(str)}) → ${o.ok}</span>` +
      `<span class="opcount cool"><span class="n">${o.lookups.toLocaleString("en-US")}</span> Set lookup${o.lookups === 1 ? "" : "s"}</span>`));

    if (!o.len) {
      wrap.append(el("div", "note", "Nothing to iterate, so <code class='inl'>seen</code> stays empty and the <code class='inl'>for…of</code> body never runs. <code class='inl'>return true</code> handles the empty string with no special case — and so does the one-liner, since <code class='inl'>new Set(\"\").size</code> and <code class='inl'>\"\".length</code> are both 0."));
      out.append(wrap); return;
    }

    // One card per code point, in order. Everything after the collision is dimmed:
    // the pass stops at the second sighting, it does not finish the string.
    const all = [...str];
    const cards = el("div", "uc-cards");
    all.forEach((ch, k) => {
      const t = o.trail[k];
      cards.append(el("div", "uc-card " + (!t ? "unread" : t.again ? "again" : "first"),
        `<span class="v">${esc(ch)}</span><span class="w">${!t ? "unread" : t.again ? "again" : "new"}</span>`));
    });
    wrap.append(el("div", "uc-lbl", "one pass, left to right — each character is either new or already known"), cards);

    const seenRow = el("div", "uc-chips");
    if (!o.seen.length) seenRow.append(el("span", "muted", "(empty — the very first character was the repeat)"));
    o.seen.forEach((ch) => seenRow.append(el("span", "uc-kv", esc(ch))));
    wrap.append(el("div", "uc-lbl", "seen — every character met so far, added after the check, not before"), seenRow);

    wrap.append(el("div", "uc-one" + (o.oneLiner === o.ok ? "" : " split"),
      `the one-liner <b>new Set(str).size === str.length</b> reads <b>${o.size} === ${o.len}</b> → <b>${o.oneLiner}</b>` +
      (o.oneLiner === o.ok ? " — same answer" : " — it disagrees with the loop")));

    const cp = casePair(all);
    wrap.append(el("div", "note",
      (o.hit
        ? `<b>'${esc(o.hit)}'</b> was already in <code class='inl'>seen</code>, and a second sighting <i>is</i> the definition of "not all unique" — so the function returns there, after <b>${o.lookups}</b> lookup${plural(o.lookups, "", "s")}, without reading the ${all.length - o.lookups} dimmed character${plural(all.length - o.lookups, "", "s")}. `
        : `No character was ever met twice, so the pass ran to the end: <b>${o.lookups}</b> lookup${plural(o.lookups, "", "s")}, one per character, and then <code class='inl'>true</code>. `) +
      `Against the re-scan's <b>${b.comparisons.toLocaleString("en-US")}</b> comparison${plural(b.comparisons, "", "s")} on this same input${o.ok && b.total > 1 ? ` — every pair of the triangle, because it had no way to stop early` : ``}. ` +
      `The order matters inside the loop: check <code class='inl'>seen.has(ch)</code> <b>before</b> <code class='inl'>seen.add(ch)</code>, or every character finds itself and the answer is always false. ` +
      (cp ? `And <b>'${esc(cp[0])}'</b> and <b>'${esc(cp[1])}'</b> are two different keys as far as a Set is concerned, so "uppercase and lowercase are different characters" needs no code at all. ` : ``) +
      (o.oneLiner === o.ok
        ? `The dashed line above is the same idea compressed — a multiset's cardinality against a set's — and it agrees here, as it does on all seven official cases.`
        : `The dashed line above is where the compressed form breaks: <code class='inl'>new Set(str)</code> iterates by <b>code point</b> and counts <b>${o.size}</b>, while <code class='inl'>str.length</code> counts <b>UTF-16 code units</b> and says <b>${o.len}</b>. Both loops here walk code points — <code class='inl'>[...str]</code> and <code class='inl'>for…of</code> — so they agree with each other and the one-liner is the odd one out.`)));
    out.append(wrap);
  }
}

// ── STEP: every pair ────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">allUnique</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> chars = <span class="tok" data-t="spread">[...str]</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="i">i = 0; i &lt; chars.length</span>; i++) {` },
  { ln: 4, html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="j">j = i + 1; j &lt; chars.length</span>; j++) {` },
  { ln: 5, html: `      <span class="k">if</span> (<span class="tok" data-t="eq">chars[i] === chars[j]</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 6, html: `    }` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret"><span class="k">true</span></span>;` },
  { ln: 9, html: `}` },
];

// ── STEP: set membership ────────────────────────────────────────────────────
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">allUnique</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> seen = <span class="tok" data-t="mk"><span class="k">new</span> <span class="fn">Set</span>()</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="take">ch</span> <span class="k">of</span> str) {` },
  { ln: 4, html: `    <span class="k">if</span> (<span class="tok" data-t="has">seen.<span class="fn">has</span>(ch)</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 5, html: `    <span class="tok" data-t="add">seen.<span class="fn">add</span>(ch)</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret"><span class="k">true</span></span>;` },
  { ln: 8, html: `}` },
];

// The alphabet case is 325 inner steps — reachable by typing it in, but far too
// long to open on, so the step chips are the short cases. TRACE_CAP keeps a pasted
// novel from building tens of thousands of Step objects.
const TRACE_CAP = 24;
const STEP_PRESETS = ["abc", "aA", "hello", "freeCodeCamp", "!@#*$%^&*()aA", "QwErTy123!@", "🙂🙃"];
const stepInput = (value) => ({ type: "text", label: "str =", value, presets: STEP_PRESETS, hint: "any text" });

function traceBrute(raw) {
  const chars = [...String(raw)].slice(0, TRACE_CAP);
  const n = chars.length;
  const steps = [];
  let i, j, comparisons = 0;
  const title = `allUnique("${chars.join("")}")`;
  const total = (n * (n - 1)) / 2;
  const S = (line, note, x = {}) => {
    const vars = { str: `"${chars.join("")}"` };
    if (line >= 3 && i !== undefined) vars.i = i;
    if (line >= 4 && line <= 6 && j !== undefined) vars.j = j;
    if (line >= 3) vars.comparisons = comparisons;
    // `chars` is live from line 2 to the end of the call, so its panel stays put;
    // the cursors show which two positions the current === is looking at.
    const structs = line >= 2
      ? [{ label: "chars", items: chars.map((c, k) => (k === i ? "▶ " : k === j ? "· " : "") + c) }]
      : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Are all the characters of <b>"${esc(chars.join(""))}"</b> different? With nothing written down, the only way to know is to ask every character about every other one.`, { focus: "param" });
  S(2, `<code class='inl'>[...str]</code> splits the string into its <b>${n}</b> character${n === 1 ? "" : "s"}. Spreading rather than indexing matters for one reason: it walks <b>code points</b>, so an emoji stays one character instead of becoming the two UTF-16 halves that <code class='inl'>str[i]</code> would hand back.`, { focus: "spread" });

  for (i = 0; i < n; i++) {
    j = undefined;
    S(3, `Take <b>chars[${i}] = '${esc(chars[i])}'</b> and check it against everything still ahead of it.`, { focus: "i", changed: ["i"] });
    j = i + 1;
    if (j >= n) {
      S(4, `<b>j = ${j}</b> is already past the end — the last character has nothing after it, so this row does no work at all. Every pair it belongs to was checked by an earlier row.`,
        { focus: "j", changed: ["j"], eval: { expr: `j = ${j} < ${n}`, val: false } });
      continue;
    }
    S(4, `The inner loop starts at <b>i + 1 = ${j}</b>, not 0. Starting at 0 would compare <b>'${esc(chars[i])}'</b> with itself (always equal) and re-check every pair the rows above already settled — so this one <code class='inl'>+ 1</code> is what turns a square into a triangle.`,
      { focus: "j", changed: ["j"], eval: { expr: `j = ${j} < ${n}`, val: true } });

    for (j = i + 1; j < n; j++) {
      comparisons++;
      const same = chars[i] === chars[j];
      const caseOnly = !same && chars[i].toLowerCase() === chars[j].toLowerCase();
      S(5, same
        ? `<b>'${esc(chars[i])}' === '${esc(chars[j])}'</b> — found. One matching pair is enough to answer the whole question, so the function returns immediately, after <b>${comparisons}</b> of the <b>${total}</b> possible pairs.`
        : `<b>'${esc(chars[i])}' !== '${esc(chars[j])}'</b>. Comparison <b>${comparisons}</b> of <b>${total}</b>, and it buys exactly one bit that is thrown away on the next line. ${caseOnly
            ? `Worth stopping on: these two differ <i>only</i> by case, and <code class='inl'>===</code> on strings already treats them as different characters — the statement's casing rule is enforced here by no code whatsoever.`
            : `Nothing about this comparison is remembered, which is why the position <b>${j}</b> will be compared all over again from every row below.`}`,
        { focus: "eq", changed: ["comparisons", "j"], eval: { expr: `chars[${i}] === chars[${j}]`, val: same } });
      if (same) {
        S(5, `<b>Return false.</b> Notice how cheap this was — a repeat lets the loops quit early, so on a string that <i>fails</i>, the pair-wise approach looks almost as good as any other. It is the strings that pass which expose it.`,
          { focus: "eq", done: true, result: "false", ret: { value: false } });
        return steps;
      }
    }
  }
  i = j = undefined;

  S(8, `Every one of the <b>${total}</b> pair${total === 1 ? "" : "s"} came back different, and only now can the answer be given: <b>return true</b>. There is no early exit from "nothing matched" — proving a negative means checking all of it, which is the entire cost of refusing to write anything down. ${n <= 1 ? `With ${n} character${n === 1 ? "" : "s"} there was no pair to check at all, so the answer is true by default.` : `The Set version answers the same question in <b>${n}</b> lookups.`}`,
    { focus: "ret", done: true, result: "true", ret: { value: true } });
  return steps;
}

function traceOpt(raw) {
  const chars = [...String(raw)].slice(0, TRACE_CAP);
  const n = chars.length;
  const steps = [];
  const seen = new Set();
  let ch, lookups = 0, at = -1;
  const title = `allUnique("${chars.join("")}")`;
  const S = (line, note, x = {}) => {
    const vars = { str: `"${chars.join("")}"` };
    if (line >= 3 && line <= 6 && ch !== undefined) vars.ch = `'${ch}'`;
    if (line >= 3) vars.lookups = lookups;
    const structs = [{ label: "chars", items: chars.map((c, k) => (k === at ? "▶ " : "") + c) }];
    if (line >= 2) structs.push({ label: "seen", items: [...seen], newest: !!x.fresh });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Same question about <b>"${esc(chars.join(""))}"</b>, but stop treating it as a fact about the whole string. "All distinct" fails the instant one character turns up twice — so the only thing worth asking at each position is <i>have I seen this before?</i>`, { focus: "param" });
  S(2, `<b>seen</b> is the memory the pair-wise version refused to keep. A Set rather than an array, because the one question ever asked of it is membership, and a Set answers that in O(1) instead of a scan — which is precisely the inner loop, deleted.`, { focus: "mk" });

  for (let k = 0; k < n; k++) {
    at = k; ch = chars[k];
    S(3, `Take <b>'${esc(ch)}'</b>. <code class='inl'>for…of</code> walks the string by <b>code point</b>, the same unit <code class='inl'>new Set(str)</code> uses — worth knowing, because <code class='inl'>str.length</code> does not.`, { focus: "take", changed: ["ch"] });
    lookups++;
    const again = seen.has(ch);
    S(4, again
      ? `<code class='inl'>seen.has('${esc(ch)}')</code> → <b>true</b>. That single question replaced the entire inner loop of the other approach, and it is the answer: a character met a second time means the string is not all-unique.`
      : `<code class='inl'>seen.has('${esc(ch)}')</code> → <b>false</b>. First sighting. This one lookup does the work of comparing <b>'${esc(ch)}'</b> against every character behind it, because the Set already holds all of them.`,
      { focus: "has", changed: ["lookups"], eval: { expr: `seen.has('${ch}')`, val: again } });
    if (again) {
      S(4, `<b>Return false</b> after <b>${lookups}</b> lookup${lookups === 1 ? "" : "s"}, with ${n - lookups} character${n - lookups === 1 ? "" : "s"} still unread. The pass never needed to finish the string.`,
        { focus: "has", done: true, result: "false", ret: { value: false } });
      return steps;
    }
    seen.add(ch);
    S(5, `File <b>'${esc(ch)}'</b> away. The order of these two lines is load-bearing: add before you check and every character finds itself in the Set, so the function returns false on any non-empty input.${seen.size >= 2 && [...seen].some((c) => c !== ch && c.toLowerCase() === ch.toLowerCase()) ? ` And note that <b>'${esc(ch)}'</b> did not collide with its own other case already sitting in there — a Set keys on the exact string, so the casing rule costs nothing.` : ``}`,
      { focus: "add", fresh: true });
  }
  at = -1; ch = undefined;

  S(7, `The pass is over: <b>${lookups}</b> lookup${lookups === 1 ? "" : "s"}, one per character, and no character ever turned up twice. <b>Return true.</b> ${n >= 2 ? `The pair-wise version needed <b>${(n * (n - 1)) / 2}</b> comparisons to reach the same boolean on this input — and note that <code class='inl'>seen.size</code> is now <b>${seen.size}</b> against <b>${n}</b> characters, which is the one-liner <code class='inl'>new Set(str).size === str.length</code> in slow motion.` : `With ${n} character${n === 1 ? "" : "s"} there was nothing to collide with.`}`,
    { focus: "ret", done: true, result: "true", ret: { value: true } });
  return steps;
}

export default {
  n: 30, id: "unique", title: "Unique Characters", dates: ["2025-09-09"],
  statement: `Given a string, decide whether <b>all</b> of its characters are unique. <b>Uppercase and lowercase letters count as different characters.</b> <span class="rule">Example: <code class="inl">allUnique("aA")</code> → <code class="inl">true</code>, but <code class="inl">allUnique("hello")</code> → <code class="inl">false</code>.</span>`,
  variants: [
    {
      name: "Compare every pair", tone: "brute", cost: "O(n²) — n(n−1)/2 comparisons",
      approach: `"Are all of these different?" is a claim about the whole string, and the most direct way to test it is to test every pair: for each character, walk everything after it and look for a match. The <code class='inl'>j = i + 1</code> is the only subtlety — start at <code class='inl'>0</code> and each character is compared with itself (always equal, always a false positive) and every pair is checked twice — so the work is the <b>upper triangle</b>, <code class='inl'>n(n−1)/2</code> comparisons, not <code class='inl'>n²</code>. Two things then follow. Because the statement's casing rule is exactly how <code class='inl'>===</code> already behaves on strings, <b>none</b> of it needs writing: <code class='inl'>"a" === "A"</code> is false for free, which is what the official <code class='inl'>"aA"</code> → true case is there to catch. And the early return makes a <b>false</b> answer cheap — <code class='inl'>"hello"</code> is settled in 8 comparisons — while a <b>true</b> answer has no early exit at all, since "nothing matched" can only be known after everything has been checked. Watch the counter on <code class='inl'>"~!@#$%^&amp;*()_+"</code>: 13 characters, 78 comparisons, and not one of them remembered.`,
      code: `// Compare every pair: one match anywhere means the string isn't all-unique.
function allUnique(str: string): boolean {
  const chars = [...str];                        // by code point, so an emoji is ONE character
  for (let i = 0; i < chars.length; i++) {
    // j starts at i + 1: a character always equals itself, and (a,b) is the
    // same pair as (b,a) — so this is the upper triangle, n(n-1)/2 comparisons.
    for (let j = i + 1; j < chars.length; j++) {
      // === on strings is case-sensitive already, so "uppercase and lowercase
      // are different characters" is a rule that needs no code at all.
      if (chars[i] === chars[j]) return false;
    }
  }
  return true;                                   // "" never enters the loop: vacuously unique
}`,
      mount: mountBrute,
    },
    {
      name: "Step: every pair", tone: "brute", cost: "comparisons",
      approach: `Watch <b>comparisons</b> climb. <code class='inl'>"hello"</code> costs <b>8</b> and <code class='inl'>"freeCodeCamp"</code> costs <b>22</b>, both stopping early on a repeat — so on the failing cases this looks perfectly reasonable. Then run <code class='inl'>"QwErTy123!@"</code>, where the answer is <b>true</b>: <b>55</b> comparisons with no exit anywhere, because you cannot know nothing matched until you have checked everything. <code class='inl'>"aA"</code> is one comparison that comes back false, and <code class='inl'>"🙂🙃"</code> shows why the loop spreads the string first. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput("hello") }),
    },
    {
      name: "Remember what you've seen", tone: "opt", cost: "O(n) — one pass, one Set",
      approach: `The inner loop exists to answer one question — <i>is this character among the ones I already walked past?</i> — and that is a <b>membership</b> question, which a <code class='inl'>Set</code> answers in O(1). Keep every character you have met, and at each new character ask the Set instead of asking the string: one pass, <code class='inl'>n</code> lookups, and the same boolean. The order inside the loop is load-bearing — <code class='inl'>has</code> <i>before</i> <code class='inl'>add</code>, or every character finds itself and the answer is always false. Casing is free again, because a Set keys on the exact string. Compressed, this is the idiomatic one-liner <code class='inl'>new Set(str).size === str.length</code>: a set's cardinality against a multiset's, and if they differ something was counted twice. It is the same idea, and it passes all seven official cases — but keep the loop in mind, because the one-liner cannot return early, and it silently mixes units. <code class='inl'>new Set(str)</code> counts <b>code points</b> while <code class='inl'>str.length</code> counts <b>UTF-16 code units</b>, so <code class='inl'>"🙂🙃"</code> — two plainly distinct characters — reads as <b>2 === 4</b> and comes back false. The demo shows that split; no freeCodeCamp test goes there.`,
      code: `// Remember what you've seen: the second sighting IS the answer.
function allUnique(str: string): boolean {
  const seen = new Set<string>();
  for (const ch of str) {          // for...of walks code points, same as new Set(str)
    if (seen.has(ch)) return false; // has() BEFORE add(), or every char finds itself
    seen.add(ch);
  }
  return true;
}
// The idiomatic one-liner is the same idea compressed — a set's size against a
// multiset's — and it passes every official case:
//     const allUniqueTerse = (str: string): boolean => new Set(str).size === str.length;
// It cannot return early, and it mixes units: Set counts code points, .length
// counts UTF-16 code units, so "\u{1F642}\u{1F643}" reads 2 === 4 and reports false.`,
      mount: mountOpt,
    },
    {
      name: "Step: set membership", tone: "opt", cost: "set lookups",
      approach: `Two steps per character, always — <b>lookups</b> climbs by exactly one per character and never more. Run <code class='inl'>"QwErTy123!@"</code> for <b>11</b> lookups against the pair-wise <b>55</b> comparisons on the identical input and answer, then <code class='inl'>"hello"</code>, where the counts are <b>4</b> against <b>8</b> and the advantage nearly vanishes — that contrast is the point. <code class='inl'>"!@#*$%^&amp;*()aA"</code> is the case that repeats <code class='inl'>*</code> long before it reaches the <code class='inl'>aA</code> that never collides. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: stepInput("hello") }),
    },
  ],
};
