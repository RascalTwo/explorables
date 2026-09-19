// #28 · Roman Numeral Parser — the subtraction rule is about neighbours, not tokens.
// • BRUTE — write the six subtractive pairs down. A 13-row table, longest-and-largest
//   first, probed top-down at every position for the longest prefix that matches, then
//   advance by that prefix's length. Correct, and six of those thirteen rows exist for
//   one reason only: the statement mentions subtraction. CM, CD, XC, XL, IX, IV are
//   not symbols, they are cases, and you have to remember all six.
// • OPT — don't write them down at all. One pass over the characters with a 7-entry
//   value map: add V[s[i]], except SUBTRACT it when V[s[i]] < V[s[i+1]]. The six pairs
//   stop being special cases and fall out of one comparison.
// Be honest about the size of the win: both are O(n), the input is a handful of
// characters, and there is nothing asymptotic here. What shrinks is the table (13
// hand-written rows → 7) and the number of rules a human has to get right (6 → 1).
// Both pass all 7 official tests and agree on all 3,999 well-formed numerals (checked
// by round-tripping an independent encoder over 1..3999). They part company only on
// strings that are not numerals at all — "IC" is 101 by table and 99 by comparison —
// and that IS the parse-vs-validate lesson rather than a bug in either: two correct
// parsers can only disagree once you have handed them something outside the language.
// Flip the Approach toggle on XCIX to see 16 table probes against 4 comparisons.
import { el, esc, mountDebugger } from "../shared.js";

// All 7 official freeCodeCamp cases, in the grader's order, then two of ours.
//   MMMCMXCIX — 3999, the largest standard numeral, with subtraction happening at
//     three different scales (CM, XC, IX) in one string. It is where the brute's
//     probe count runs away and the opt's does not move.
//   IIII — the clock-face four. Non-canonical, and the parser returns 4 for it
//     anyway, because the problem says PARSE, not VALIDATE. Conflating the two is
//     the scope creep this challenge invites. It deliberately shares its ANSWER
//     with the official IV and shares none of its path: IV is the subtractive
//     branch taken once, IIII is the additive branch taken four times. Same 4,
//     opposite mechanisms — which is the pair, not a duplicate.
// The official seven are already well spread and each lands somewhere different:
// III is plain repetition, IV is the subtractive pair on its own, XXVI mixes scales
// with no subtraction, XCIX subtracts twice, CDLX subtracts at the front, DIV
// subtracts in the middle (read left to right and added, it gives 506), and MMXXV
// is four symbols and no subtraction at all.
const OFFICIAL = ["III", "IV", "XXVI", "XCIX", "CDLX", "DIV", "MMXXV"];
const CASES = [...OFFICIAL, "MMMCMXCIX", "IIII"];

// The opt approach's whole data requirement: the seven symbols the statement lists.
const VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

// The brute approach's data requirement: the same seven, plus six pairs that are not
// symbols at all. Sorted by value descending, which is what makes the top-down probe
// find the LONGEST match first — reverse CM and C and "CM" parses as C + M = 1100.
const TABLE = [
  ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90],
  ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
];
const SUBTRACTIVE = new Set(["CM", "CD", "XC", "XL", "IX", "IV"]);

// The demo takes free text, so fold to the seven symbols before either approach runs.
// Both are deliberately permissive about ORDER — neither validates — but neither has
// an opinion about a character that is not a Roman symbol, so drop those here rather
// than letting one approach spin and the other return NaN.
const clean = (s) => String(s).toUpperCase().replace(/[^IVXLCDM]/g, "");

// Instrumented brute run: every `startsWith` probe is counted, because the probe
// count is the only place the cost of writing the pairs down becomes visible.
function runBrute(numeral) {
  const tiles = []; const used = new Set();
  let total = 0, i = 0, probes = 0;
  while (i < numeral.length) {
    for (let k = 0; k < TABLE.length; k++) {
      const [token, value] = TABLE[k];
      probes++;
      if (numeral.startsWith(token, i)) {
        total += value; used.add(token); i += token.length;
        tiles.push({ token, value, probes: k + 1, total, sub: SUBTRACTIVE.has(token) });
        break;
      }
    }
  }
  return { total, tiles, probes, used };
}

// Instrumented opt run: one comparison per symbol, and `next` is 0 past the end so
// the final symbol can never be the small half of a pair.
function runOpt(numeral) {
  const tiles = [];
  let total = 0, cmps = 0;
  for (let i = 0; i < numeral.length; i++) {
    const cur = VALUES[numeral[i]], next = VALUES[numeral[i + 1]] ?? 0;
    cmps++;
    const sub = cur < next;
    total += sub ? -cur : cur;
    tiles.push({ symbol: numeral[i], value: cur, next, sub, total });
  }
  return { total, tiles, cmps };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rn-wrap { display:flex; flex-direction:column; gap:12px; }
    .rn-tiles { display:flex; flex-wrap:wrap; gap:6px; align-items:stretch; }
    .rn-t { min-width:54px; text-align:center; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--panel-2); }
    .rn-t .sym { font:800 18px var(--mono); line-height:1.2; }
    .rn-t .val { font:700 11.5px var(--mono); color:var(--good); }
    .rn-t .val.neg { color:var(--danger); }
    .rn-t .run { font:11px var(--mono); color:var(--muted); }
    .rn-t.sub { border-color:var(--warn); background:color-mix(in srgb, var(--warn) 10%, transparent); }
    .rn-t.sub .sym { color:var(--warn); }
    .rn-rows { display:flex; flex-wrap:wrap; gap:4px; }
    .rn-r { font:600 11.5px var(--mono); padding:3px 8px; border-radius:6px; border:1px solid var(--border); color:var(--muted); background:var(--panel-2); }
    .rn-r.sub { border-color:color-mix(in srgb, var(--warn) 55%, var(--border)); color:var(--warn); background:color-mix(in srgb, var(--warn) 12%, transparent); }
    .rn-r.used { border-color:var(--accent); color:var(--text); font-weight:800; }
    .rn-rules { font:12px var(--sans); color:var(--muted); }
    .rn-rules b { color:var(--text); font-family:var(--mono); }
    .rn-counts { display:flex; flex-wrap:wrap; gap:16px; align-items:baseline; }
    .rn-drop { font:12px var(--sans); color:var(--warn); }
    .rn-drop b { font-family:var(--mono); }
  `));
}

// Both demos share the input, the chips and the tile strip; only the tiles' MEANING
// differs (one tile per matched token vs. one tile per character) and only the brute
// shows the table it had to write down. That split is the lesson, so it lives here
// rather than in two near-identical mounts.
function mountFor(mode) {
  return function (host) {
    ensureStyle();
    const ctl = el("div", "controls");
    const inp = el("input"); inp.type = "text"; inp.value = "XCIX"; inp.style.width = "220px";
    ctl.append(el("span", "ctl-label", "numeral"), inp, el("span", "ctl-label", "(I V X L C D M)"));
    const pre = el("div", "controls");
    // Chips come off CASES, so a case added there can never go unreachable here.
    CASES.forEach((v) => { const c = el("button", "chip", v); c.onclick = () => { inp.value = v; render(); }; pre.append(c); });
    const out = el("div");
    host.append(ctl, pre, out);
    inp.oninput = render;
    render();

    function render() {
      const raw = String(inp.value);
      const numeral = clean(raw);
      const b = runBrute(numeral), o = runOpt(numeral);
      const mine = mode === "brute" ? b : o;
      const blind = o.tiles.reduce((s, t) => s + t.value, 0);
      out.innerHTML = "";
      const wrap = el("div", "rn-wrap");

      wrap.append(el("div", "result-line",
        `<span class="badge ok">parseRomanNumeral("${esc(numeral)}") → ${mine.total}</span>` +
        (blind === mine.total || !numeral ? "" :
          `<span class="tag" style="color:var(--danger);border-color:var(--danger)">add every symbol blindly → ${blind}</span>`)));

      // The two approaches agree on all 3,999 well-formed numerals, so this line can
      // only ever fire on a string that is not one. That makes it evidence for the
      // parse-vs-validate point rather than an embarrassment — frame it that way,
      // and never let the two tabs quietly contradict each other instead.
      if (b.total !== o.total)
        wrap.append(el("div", "rn-drop", `The two approaches just disagreed: the table reads <b>"${esc(numeral)}"</b> as <b>${b.total}</b>, the neighbour comparison as <b>${o.total}</b>. That is more interesting than it looks. They agree on all <b>3,999</b> well-formed numerals, so the only way to make two correct parsers differ is to hand them something that is <i>not a numeral</i> — which is exactly what <b>${esc(numeral)}</b> is. The disagreement is not a bug in either one; it is the <b>parse, don't validate</b> point made out loud. Neither was asked to say no, so neither has an opinion about a string nobody would write.`));

      if (numeral !== raw.toUpperCase().replace(/\s+/g, ""))
        wrap.append(el("div", "rn-drop", `Ignored the characters that are not Roman symbols — parsing <b>"${esc(numeral)}"</b>.`));

      const strip = el("div", "rn-tiles");
      if (mode === "brute") {
        b.tiles.forEach((t) => strip.append(el("div", "rn-t" + (t.sub ? " sub" : ""),
          `<div class="sym">${t.token}</div><div class="val">+${t.value}</div><div class="run">= ${t.total}</div>`)));
      } else {
        o.tiles.forEach((t) => strip.append(el("div", "rn-t" + (t.sub ? " sub" : ""),
          `<div class="sym">${t.symbol}</div><div class="val${t.sub ? " neg" : ""}">${t.sub ? "−" : "+"}${t.value}</div><div class="run">= ${t.total}</div>`)));
      }
      if (!numeral) strip.append(el("span", "more", "(no symbols)"));
      wrap.append(strip);

      if (mode === "brute") {
        const rows = el("div", "rn-rows");
        TABLE.forEach(([token, value]) => rows.append(el("span",
          "rn-r" + (SUBTRACTIVE.has(token) ? " sub" : "") + (b.used.has(token) ? " used" : ""),
          `${token} = ${value}`)));
        wrap.append(rows);
        wrap.append(el("div", "rn-rules", `<b>13</b> rows written out by hand, <b>6</b> of them (tinted) purely because the statement mentions subtraction. The other approach never writes those six down.`));
      } else {
        const rows = el("div", "rn-rows");
        Object.entries(VALUES).forEach(([sym, value]) => rows.append(el("span",
          "rn-r" + (numeral.includes(sym) ? " used" : ""), `${sym} = ${value}`)));
        wrap.append(rows);
        wrap.append(el("div", "rn-rules", `<b>7</b> values written out by hand and <b>1</b> rule — <code class='inl'>cur &lt; next</code>. No row for 90, 400 or 900, because those are not symbols.`));
      }

      wrap.append(el("div", "rn-counts",
        mode === "brute"
          ? `<span class="opcount hot"><span class="n">${b.probes}</span> table probes</span>` +
            `<span class="opcount"><span class="n">${o.cmps}</span> the other approach's comparisons</span>`
          : `<span class="opcount cool"><span class="n">${o.cmps}</span> neighbour comparisons</span>` +
            `<span class="opcount"><span class="n">${b.probes}</span> the other approach's table probes</span>`));

      wrap.append(el("div", "note", noteFor(mode, numeral, b, o, blind)));
      out.append(wrap);
    }
  };
}

function noteFor(mode, numeral, b, o, blind) {
  if (!numeral)
    return `No symbols, so neither loop runs and the total stays <b>0</b>. Neither approach calls this an error — the challenge asks for a <b>value</b>, and the value of nothing is zero. That is the first hint that this is a parser and not a validator.`;

  const subs = o.tiles.filter((t) => t.sub);
  const first = subs[0];
  const firstIdx = o.tiles.indexOf(first);
  const runs = /(.)\1{3,}/.exec(numeral);

  if (mode === "brute") {
    const usedSub = b.tiles.filter((t) => t.sub);
    const worst = b.tiles.reduce((m, t) => Math.max(m, t.probes), 0);
    return `The table was walked from the top <b>${b.probes}</b> times to read ${b.tiles.length} token${b.tiles.length === 1 ? "" : "s"}; the deepest single position needed <b>${worst}</b> probes before something matched. ${usedSub.length
      ? `<b>${usedSub.map((t) => t.token).join("</b>, <b>")}</b> ${usedSub.length === 1 ? "is one of the six rows" : "are among the six rows"} that only exists because of the subtraction clause — and notice where ${usedSub.length === 1 ? "it sits" : "they sit"} in the table. ${usedSub[0].token} has to be probed <i>before</i> <b>${usedSub[0].token[0]}</b>, or the two characters get read separately and the answer comes out wrong. Sorting the rows by value descending is what buys that ordering, and it is the kind of correctness that is invisible until someone rearranges the list.`
      : `Nothing here needed a subtractive row, so all thirteen rows were in play and only ${b.used.size} of them ever matched. The six pairs still had to be written down and still had to be probed past — you pay for them on every input, not just the ones that use them.`}`;
  }

  if (!subs.length)
    return `Every symbol here is worth at least as much as the one after it, so <code class='inl'>cur &lt; next</code> is false at every position and the whole string is added. This is exactly the shape that makes a blind left-to-right sum look like a working solution${runs ? ` — and <b>${esc(numeral)}</b> adds a second reassurance, since ${runs[1]} repeated ${runs[0].length} times parses happily to <b>${o.total}</b> even though no clock face outside a church tower writes it that way. The parser was asked to read a numeral, not to police it.` : `. It is right on ${o.tiles.length} of these symbols and wrong the moment a smaller one appears before a larger one.`}`;

  return `<b>${subs.length}</b> of the ${o.tiles.length} symbols got subtracted, and each decision came from looking at exactly one neighbour: ${subs.map((t) => `<code class='inl'>${t.value} &lt; ${t.next}</code>`).join(", ")}. ${firstIdx > 0
    ? `Note where the first one is — position <b>${firstIdx}</b>, not the front. Reading <b>${esc(numeral)}</b> left to right and adding gives <b>${blind}</b>, which is the trap: the subtraction is buried inside the numeral, so it does not announce itself the way <code class='inl'>IV</code> does.`
    : `Here it is at the very front, where it is easy to see. <code class='inl'>DIV</code> is the case that stops being obvious — there the subtraction sits in the middle and a left-to-right sum quietly returns 506.`} The pairs themselves are never named anywhere in this approach; ${subs.map((t) => `<b>${t.symbol}</b>`).join(" and ")} ${subs.length === 1 ? "is" : "are"} just a symbol that lost a comparison.`;
}

// ── STEP (brute) — the table probed one row at a time, so the cost of having written
// the six pairs down is a thing you count rather than a thing you assert. ──────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">parseRomanNumeral</span>(<span class="tok" data-t="param">numeral</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="table">TABLE</span> = [[<span class="st">"M"</span>, 1000], [<span class="st">"CM"</span>, 900], [<span class="st">"D"</span>, 500], [<span class="st">"CD"</span>, 400], [<span class="st">"C"</span>, 100], [<span class="st">"XC"</span>, 90],` },
  { ln: 3, html: `                 [<span class="st">"L"</span>, 50], [<span class="st">"XL"</span>, 40], [<span class="st">"X"</span>, 10], [<span class="st">"IX"</span>, 9], [<span class="st">"V"</span>, 5], [<span class="st">"IV"</span>, 4], [<span class="st">"I"</span>, 1]];` },
  { ln: 4, html: `  <span class="k">let</span> <span class="tok" data-t="init">total = 0, i = 0</span>;` },
  { ln: 5, html: `  <span class="k">while</span> (<span class="tok" data-t="wcond">i &lt; numeral.length</span>) {` },
  { ln: 6, html: `    <span class="k">const</span> hit = TABLE.<span class="fn">find</span>(([token]) =&gt; <span class="tok" data-t="probe">numeral.<span class="fn">startsWith</span>(token, i)</span>);` },
  { ln: 7, html: `    <span class="k">if</span> (!hit) { i++; <span class="k">continue</span>; }` },
  { ln: 8, html: `    <span class="tok" data-t="add">total += hit[1]</span>;` },
  { ln: 9, html: `    <span class="tok" data-t="adv">i += hit[0].length</span>;` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">total</span>;` },
  { ln: 12, html: `}` },
];

function traceBrute(rawInput) {
  const numeral = clean(rawInput);
  const steps = [];
  let total = 0, i = 0, probes = 0, hitStr = null;
  const pieces = [], consumed = [];

  // Scope by omission, gated on the line that declares each name. `numeral` is the
  // parameter so it is live throughout; `hit` exists only after find() returns, which
  // is why it stays out of the panel during the probing on line 6.
  const S = (line, note, x = {}) => {
    const vars = { numeral: `"${numeral}"` };
    if (line >= 4) { vars.total = total; vars.i = i; }
    if (line >= 8 && line <= 9 && hitStr) vars.hit = hitStr;
    const structs = [{ label: "numeral", items: [...numeral].map((c, k) => (k === i ? `▶${c}` : consumed[k] ? `${c}·` : c)) }];
    if (line >= 4) structs.push({ label: "pieces", items: pieces.slice(), newest: !!x.newPiece });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `parseRomanNumeral("${numeral}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Read <b>"${esc(numeral)}"</b> as a number. This approach refuses to look ahead: it decides each position by asking "what is the longest thing in my table that starts here?", which means the table has to contain every answer in advance — including the six that are not symbols.`, { focus: "param" });
  S(2, `Thirteen rows: the seven real symbols plus <b>CM CD XC XL IX</b> and <b>IV</b>. Those six are the subtraction clause, transcribed by hand. The order is not cosmetic — it is descending by value, which is exactly what makes a top-down scan find the <i>longest</i> match. Put <code class='inl'>C</code> above <code class='inl'>CM</code> and "CM" reads as 100 + 1000 = <b>1100</b>.`, { focus: "table" });
  S(4, `Start the accumulator at 0 and the cursor at the front. <b>i</b> is a byte position, not a symbol index, because a match here can be one character wide or two.`, { focus: "init", changed: ["total", "i"] });

  while (i < numeral.length) {
    S(5, `Cursor at <b>i = ${i}</b>${i ? `, with <b>${numeral.slice(0, i)}</b> already folded into the total` : ``}. Whatever matches here will be consumed whole and the cursor jumps past it.`, { focus: "wcond", eval: { expr: `i = ${i} < ${numeral.length}`, val: true } });

    let hit = null;
    for (let k = 0; k < TABLE.length; k++) {
      const [token, value] = TABLE[k];
      const ok = numeral.startsWith(token, i);
      probes++;
      S(6, ok
        ? `Probe <b>${k + 1}</b> of 13 hits: <b>${token}</b>${SUBTRACTIVE.has(token) ? ` — one of the six subtractive rows, worth <b>${value}</b> as a unit. The pair is being <i>recognised</i>, not computed; somebody had to know it was 900 and not 1100, and write that down` : ` is worth <b>${value}</b>`}. Every earlier row was a miss, and a miss costs a full string comparison. That is <b>${probes}</b> probe${probes === 1 ? "" : "s"} so far for ${pieces.length + 1} token${pieces.length ? "s" : ""}.`
        : `Probe <b>${k + 1}</b> of 13: does <b>"${esc(numeral.slice(i) || "")}"</b> start with <b>${token}</b>? No. The scan cannot stop early or start lower — the first match is only the longest match because the table is in descending order, so every position pays for the rows above its answer.`,
        { focus: "probe", eval: { expr: `numeral.startsWith("${token}", ${i})`, val: ok } });
      if (ok) { hit = TABLE[k]; break; }
    }
    if (!hit) { i++; continue; }

    const [token, value] = hit;
    hitStr = `["${token}", ${value}]`;
    total += value;
    pieces.push(`${token} +${value}`);
    S(8, `Add <b>${value}</b>, total is now <b>${total}</b>. Everything this approach adds is positive — there is no subtraction anywhere in the code, because the subtraction was pre-computed into the ${SUBTRACTIVE.has(token) ? `<b>${token} = ${value}</b> row` : `table`} before the program ever ran.`, { focus: "add", changed: ["total"], newPiece: true });

    for (let k = 0; k < token.length; k++) consumed[i + k] = true;
    i += token.length;
    S(9, `Jump the cursor <b>${token.length}</b> character${token.length === 1 ? "" : "s"} to <b>i = ${i}</b>. ${token.length === 2 ? `Two at once: that is how the approach avoids ever peeking at a neighbour — it swallows the pair instead.` : `One character, so this position and the next are decided independently.`}`, { focus: "adv", changed: ["i"] });
    hitStr = null;
  }

  S(5, `<b>i = ${i}</b> has reached the end of the string, so there is nothing left to match and the loop exits.`, { focus: "wcond", eval: { expr: `i = ${i} < ${numeral.length}`, val: false } });
  S(11, `<b>Return ${total}.</b> ${probes} table probes went into ${pieces.length} token${pieces.length === 1 ? "" : "s"}. Compare that with the other step-through, which reads the same string with ${numeral.length} comparison${numeral.length === 1 ? "" : "s"} and a table of seven — same answer, six fewer rules to remember.`, { focus: "ret", done: true, result: total, ret: { value: total } });
  return steps;
}

// ── STEP (opt) — one character at a time, and the only question ever asked is
// "is my neighbour bigger?". The six pairs never appear. ───────────────────────────
const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">parseRomanNumeral</span>(<span class="tok" data-t="param">numeral</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="values">VALUES</span> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };` },
  { ln: 3, html: `  <span class="k">let</span> <span class="tok" data-t="init">total = 0</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="fcond">i = 0; i &lt; numeral.length</span>; i++) {` },
  { ln: 5, html: `    <span class="k">const</span> <span class="tok" data-t="cur">cur = VALUES[numeral[i]]</span>;` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="next">next = VALUES[numeral[i + 1]] ?? 0</span>;` },
  { ln: 7, html: `    <span class="tok" data-t="decide">total += cur &lt; next ? -cur : cur</span>;` },
  { ln: 8, html: `  }` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">total</span>;` },
  { ln: 10, html: `}` },
];

function traceOpt(rawInput) {
  const numeral = clean(rawInput);
  const steps = [];
  let total = 0, i = 0, cur, next;
  const pieces = [];

  const S = (line, note, x = {}) => {
    const vars = { numeral: `"${numeral}"` };
    if (line >= 3) vars.total = total;
    if (line >= 4 && line <= 8) vars.i = i;
    if (line >= 5 && line <= 7) vars.cur = cur;
    if (line >= 6 && line <= 7) vars.next = next;
    const structs = [{ label: "numeral", items: [...numeral].map((c, k) => (line >= 4 && line <= 8 && k === i ? `▶${c}` : c)) }];
    if (line >= 3) structs.push({ label: "pieces", items: pieces.slice(), newest: !!x.newPiece });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `parseRomanNumeral("${numeral}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Read <b>"${esc(numeral)}"</b> as a number. The statement's rule — "if a smaller numeral appears before a larger one, the value is subtracted" — mentions a symbol and the one next to it and nothing else. A rule phrased in terms of adjacent elements is a <b>one-step lookahead</b>, so that is all this code does.`, { focus: "param" });
  S(2, `Seven entries, one per symbol the statement lists. There is deliberately no row for 4, 9, 40, 90, 400 or 900 — those are not symbols, they are what the comparison on line 7 produces. Writing them down is the work this approach is avoiding.`, { focus: "values" });
  S(3, `One accumulator. It can go down as well as up, which is the whole difference: the subtraction happens at run time here instead of being baked into a table.`, { focus: "init", changed: ["total"] });

  for (i = 0; i < numeral.length; i++) {
    S(4, `Symbol <b>${i + 1}</b> of ${numeral.length}. Every character is visited exactly once, whether or not it turns out to be half of a pair — there is no second pass and no backtracking.`, { focus: "fcond", changed: ["i"], eval: { expr: `i = ${i} < ${numeral.length}`, val: true } });

    cur = VALUES[numeral[i]];
    S(5, `<b>${numeral[i]}</b> is worth <b>${cur}</b>. On its own that number is meaningless — this symbol's sign has not been decided yet and cannot be, because it depends on something to its right.`, { focus: "cur", changed: ["cur"] });

    const beyond = i + 1 >= numeral.length;
    next = VALUES[numeral[i + 1]] ?? 0;
    S(6, beyond
      ? `There is no symbol after this one, so <code class='inl'>VALUES[numeral[${i + 1}]]</code> is <code class='inl'>undefined</code> and <code class='inl'>?? 0</code> makes <b>next = 0</b>. That default is doing real work: every real value is at least 1, so nothing can ever be smaller than the end of the string, and the last symbol is guaranteed to be added. No special case for the final character.`
      : `The neighbour is <b>${numeral[i + 1]}</b>, worth <b>${next}</b>. This one peek is the entire mechanism — it is the difference between knowing what <b>${numeral[i]}</b> means and only knowing what it is.`,
      { focus: "next", changed: ["next"] });

    const sub = cur < next;
    total += sub ? -cur : cur;
    pieces.push(`${sub ? "−" : "+"}${cur}`);
    S(7, sub
      ? `<b>${cur} &lt; ${next}</b>, so <b>${numeral[i]}</b> is the small half of a pair and gets <b>subtracted</b>: total ${total + cur} − ${cur} = <b>${total}</b>. Look at what did <i>not</i> happen — nothing named <code class='inl'>${numeral[i]}${numeral[i + 1]}</code>, nothing looked up 900 or 90 or 4. The pair is an emergent property of two values and one comparison.`
      : `<b>${cur}</b> is not smaller than <b>${next}</b>${beyond ? ` (there is no next)` : ``}, so <b>${numeral[i]}</b> is added: total ${total - cur} + ${cur} = <b>${total}</b>. The default case is addition, which is why a solution that forgets the rule entirely still gets most inputs right and is therefore easy to ship broken.`,
      { focus: "decide", changed: ["total"], newPiece: true, eval: { expr: `cur = ${cur} < next = ${next}`, val: sub } });
  }

  S(4, `<b>i = ${i}</b> reached the length; every symbol has been signed and added. ${numeral.length} comparison${numeral.length === 1 ? "" : "s"} for ${numeral.length} character${numeral.length === 1 ? "" : "s"}.`, { focus: "fcond", eval: { expr: `i = ${i} < ${numeral.length}`, val: false } });
  S(9, `<b>Return ${total}.</b> The same answer the 13-row table produces, from a 7-row map and one <code class='inl'>&lt;</code>. Nothing here validates: <code class='inl'>IIII</code> returns <b>4</b>, because the problem asked how to <i>read</i> a numeral, not whether it was spelled properly. Go further and the two approaches stop agreeing — <code class='inl'>IC</code> is 99 by this comparison and 101 by the table — which is the honest cost of a parser that was never asked to say no.`, { focus: "ret", done: true, result: total, ret: { value: total } });
  return steps;
}

const STEP_INPUT = { type: "text", label: "numeral =", presets: CASES, hint: "I V X L C D M" };

export default {
  n: 28, id: "roman", title: "Roman Numeral Parser", dates: ["2025-09-07"],
  statement: `Given a string representing a <b>Roman numeral</b>, return its integer value. The symbols are <code class="inl">I</code> = 1, <code class="inl">V</code> = 5, <code class="inl">X</code> = 10, <code class="inl">L</code> = 50, <code class="inl">C</code> = 100, <code class="inl">D</code> = 500, <code class="inl">M</code> = 1000. Numerals are read left to right: if a <b>smaller</b> numeral appears before a <b>larger</b> one its value is <b>subtracted</b>, otherwise values are added. <span class="rule">Example: <code class="inl">parseRomanNumeral("XCIX")</code> → <code class="inl">99</code>, because X before C is −10, then C is +100, then I before X is −1, then X is +10.</span>`,
  variants: [
    {
      name: "Match the longest token", tone: "brute", cost: "O(n) — up to 13 table probes per token",
      approach: `The mental model almost everyone reaches for. Build the ordered table <code class='inl'>M CM D CD C XC L XL X IX V IV I</code>, and at each position scan it from the top for the longest prefix that matches, add that row's value, and advance the cursor by the row's length. It is correct on every official case and it never looks ahead — which is precisely the deal it struck. <b>Six of those thirteen rows are not symbols.</b> <code class='inl'>CM</code>, <code class='inl'>CD</code>, <code class='inl'>XC</code>, <code class='inl'>XL</code>, <code class='inl'>IX</code> and <code class='inl'>IV</code> exist only because the statement's last sentence mentions subtraction, and you have to remember all six, spell all six right, and put all six <i>above</i> their own first character in the list — reverse <code class='inl'>C</code> and <code class='inl'>CM</code> and the parser silently reads <code class='inl'>"CM"</code> as 100 + 1000 = <b>1100</b>. The cost on screen is the probe counter: reading <code class='inl'>IX</code> means ten failed string comparisons before the eleventh succeeds, and that happens at every position, on every input, whether or not any subtraction is involved. The win in the other tab is <b>not</b> asymptotic — both are one pass over a handful of characters — it is that six of the thirteen rules stop needing to exist.`,
      code: `// Write every subtractive pair down: 13 tokens, longest and largest first.
function parseRomanNumeral(numeral: string): number {
  // Order is load-bearing. A top-down scan finds the LONGEST match only because
  // the rows descend by value — put C above CM and "CM" parses as C + M = 1100.
  const TABLE: [string, number][] = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90],
    ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
  ];
  let total = 0, i = 0;
  while (i < numeral.length) {
    const hit = TABLE.find(([token]) => numeral.startsWith(token, i));
    if (!hit) { i++; continue; }   // not a Roman symbol — skip, don't spin
    total += hit[1];
    i += hit[0].length;
  }
  return total;
}`,
      mount: mountFor("brute"),
    },
    {
      name: "Step: probe the table", tone: "brute", cost: "table probes",
      approach: `The same table, walked one row at a time so the probes are countable rather than assertable. Start on <b>XCIX</b>: position 0 costs six probes to reach <code class='inl'>XC</code>, position 2 costs ten to reach <code class='inl'>IX</code>, and the cursor jumps two characters each time — that jump is how the approach dodges lookahead, by swallowing the pair whole. Try <b>MMMCMXCIX</b> to watch the probe counter climb past twenty, and <b>MMXXV</b> for the contrast: no subtractive row is ever used, and all six are still sitting there being probed past. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: { ...STEP_INPUT, value: "XCIX" } }),
    },
    {
      name: "Compare with the next symbol", tone: "opt", cost: "O(n) — one pass, one lookup",
      approach: `Read the rule again and notice that it is already <b>local</b>: "if a smaller numeral appears before a larger one" refers to a symbol and its immediate neighbour, and to nothing else. A rule stated in terms of adjacent elements is a one-step lookahead, not a table of cases. So keep the seven symbol values the statement actually gives you, walk the characters once, and add <code class='inl'>VALUES[s[i]]</code> — except <b>subtract</b> it when <code class='inl'>VALUES[s[i]] &lt; VALUES[s[i + 1]]</code>. All six subtractive pairs fall out of that one comparison; none of them is ever named. The neat detail is the end of the string: let <code class='inl'>next</code> default to <b>0</b> with <code class='inl'>?? 0</code> and the final symbol needs no special case, because every real value is at least 1 and so nothing can be smaller than the end. The table shrinks from 13 hand-written rows to 7, and six things you had to get right become one. Both approaches are <code class='inl'>O(n)</code> on inputs of a dozen characters, so this is a win in <i>rules</i>, not in running time — which is the kind worth having anyway. Note what neither approach does: <code class='inl'>parseRomanNumeral("IIII")</code> returns <b>4</b>, because the problem says <i>parse</i>, not <i>validate</i>, and conflating the two is the scope creep this challenge invites. Push that past the clock face and the permissiveness shows its teeth — <code class='inl'>"IC"</code> reads as <b>99</b> here and <b>101</b> from the table, and neither approach is entitled to an opinion about a string no one would write.`,
      code: `// The subtraction rule is about neighbours, so look at the neighbour.
function parseRomanNumeral(numeral: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const cur = VALUES[numeral[i]];
    // Past the end there is no symbol, so call it 0: every real value is >= 1,
    // which makes the last symbol additive without a special case for it.
    const next = VALUES[numeral[i + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}`,
      mount: mountFor("opt"),
    },
    {
      name: "Step: peek at the neighbour", tone: "opt", cost: "one lookahead",
      approach: `Four steps per symbol, and the interesting one is line 6 — the single peek that decides the sign. On <b>XCIX</b> watch <code class='inl'>X</code> go negative because <code class='inl'>10 &lt; 100</code>, then positive at the end because <code class='inl'>next</code> defaults to 0. <b>DIV</b> is the one to sit with: <code class='inl'>D</code> adds 500, then <code class='inl'>I</code> turns negative on a neighbour two characters from the front — read left to right and added it would be 506. <b>IIII</b> shows the parser declining to validate. Then flip to <b>Step: probe the table</b> on the same input and compare the step counts. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: traceOpt, input: { ...STEP_INPUT, value: "XCIX" } }),
    },
  ],
};
