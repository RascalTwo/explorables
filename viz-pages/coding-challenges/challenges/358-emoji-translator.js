// #358 · Emoji Translator — the table is the easy half; string indexing is not.
// One approach: transcribe the printed table as data, then walk the string by
// CODE POINT. The trap is that `str.split("")`, `str[i]` and `str.length` all
// count UTF-16 code UNITS, and 9 of these 10 emoji cost two units each. The demo
// runs both walks on the same string side by side so the tearing is visible, and
// the palette's ⌫ key deletes a code point rather than a unit for the same reason.
// Only ⭐ (U+2B50) fits in one unit — which is exactly why a naive `.split("")`
// can look fine on a hand-typed test and shred every real input.
import { el, esc, mountDebugger } from "../shared.js";

// The official emoji→word table, in freeCodeCamp's own row order. This is the
// problem statement's printed table, transcribed — not re-encoded as branches.
const TABLE = [
  ["👶", "baby"], ["🐱", "cat"], ["🐕", "dog"], ["🐟", "fish"], ["🥵", "hot"],
  ["🧊", "ice"], ["🪨", "rock"], ["🦈", "shark"], ["🍲", "soup"], ["⭐", "star"],
];
const WORDS = Object.fromEntries(TABLE);
const ENTRIES = TABLE.map(([e, w]) => `${e} ${w}`);

// Measured, not assumed: `node -e 'console.log("👶".length, [..."👶"].length)'`
// prints `2 1`. Every key above is 2 UTF-16 code units except ⭐, which is 1.
const units = (s) => s.split("");                       // UTF-16 code units — the trap
const points = (s) => [...s];                           // code points — correct
const isLone = (u) => { const c = u.charCodeAt(0); return c >= 0xd800 && c <= 0xdfff; };
const unitLabel = (u) => (isLone(u) ? "\\u" + u.charCodeAt(0).toString(16).toUpperCase() : u);
const cp = (ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase();

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ej-wrap { max-width:760px; }
    .ej-pal { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; align-items:stretch; }
    .ej-key { font:inherit; padding:5px 8px; border-radius:9px; border:1px solid var(--border);
              background:var(--panel-2); cursor:pointer; color:var(--text); text-align:center; line-height:1.1; }
    .ej-key:hover { border-color:var(--accent); }
    .ej-key .g { font-size:21px; }
    .ej-key .w { display:block; font:600 9px var(--sans); color:var(--muted); margin-top:4px; letter-spacing:.04em; }
    .ej-key .u { display:block; font:600 8.5px var(--mono); color:var(--muted); opacity:.7; }
    .ej-box { border:1px solid var(--border); border-radius:10px; padding:9px 12px 11px; margin-top:12px; }
    .ej-box.ok { border-color:color-mix(in srgb,var(--good) 45%,var(--border)); }
    .ej-box.no { border-color:color-mix(in srgb,var(--danger) 42%,var(--border)); }
    .ej-hd { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
    .ej-hd h4 { margin:0; font:700 12.5px var(--mono); color:var(--text); }
    .ej-strip { display:flex; gap:6px; flex-wrap:wrap; margin:9px 0 2px; min-height:56px; align-items:flex-start; }
    .ej-cell { min-width:50px; padding:5px 7px 6px; border-radius:9px; border:1px solid var(--border);
               background:var(--panel-2); text-align:center; }
    .ej-cell .g { font-size:21px; line-height:1.25; }
    .ej-cell .w { font:700 11px var(--mono); color:var(--accent); margin-top:3px; }
    .ej-cell .u { font:9px var(--mono); color:var(--muted); margin-top:1px; }
    .ej-cell.miss { border-color:var(--danger); }
    .ej-cell.miss .w { color:var(--danger); }
    .ej-cell.torn { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 13%,transparent); }
    .ej-cell.torn .g { font:700 11.5px var(--mono); color:var(--danger); line-height:1.9; }
    .ej-tally { font:12.5px var(--mono); color:var(--muted); margin-top:14px; }
    .ej-tally b { color:var(--text); }
    .ej-tally .hot { color:var(--danger); }
  `));
}

// ── Solution demo — the same string walked BOTH ways, stacked ────────────────
function mount(host) {
  ensureStyle();
  let str = CASES[0].str;   // bound to the case array, so the two demos can't drift apart

  const pal = el("div", "ej-pal");
  TABLE.forEach(([e, w]) => {
    const b = el("button", "ej-key", `<span class="g">${e}</span><span class="w">${w}</span><span class="u">${cp(e)}</span>`);
    b.onclick = () => { str += e; render(); };
    pal.append(b);
  });
  const edits = el("div", "controls");
  const back = el("button", "chip", "⌫ backspace");
  // Deleting by code POINT. `str.slice(0, -1)` would drop one code unit and leave
  // a lone high surrogate behind — the same bug the demo is about, in the toolbar.
  back.onclick = () => { str = points(str).slice(0, -1).join(""); render(); };
  // `chip bad on`, not `chip bad`: the kit only styles `.chip.bad.on` (solid --danger),
  // so the bare `.bad` renders identically to a preset chip — and this one throws the
  // composed string away. It stays lit because it is destructive, not because it is selected.
  const clear = el("button", "chip bad on", "clear");
  clear.onclick = () => { str = ""; render(); };
  const inp = el("input"); inp.type = "text"; inp.value = str; inp.style.width = "240px";
  inp.oninput = () => { str = inp.value; render(); };
  edits.append(el("span", "ctl-label", "string ="), inp, back, clear);

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", c.str);
    b.onclick = () => { str = c.str; render(); };
    chips.append(b);
  });

  const good = el("div", "ej-box ok");
  const bad = el("div", "ej-box no");
  const tally = el("div", "ej-tally");
  const wrap = el("div", "ej-wrap");
  wrap.append(pal, edits, chips, good, bad, tally);
  host.append(
    el("div", "note", "Tap the palette to build a phrase, or type/paste your own. The <b>same string</b> is decoded twice below — once by code point, once by code unit — so the difference between <code class='inl'>[...str]</code> and <code class='inl'>str.split(\"\")</code> is on screen rather than in the release notes."),
    wrap,
  );
  render();

  function render() {
    if (inp.value !== str) inp.value = str;
    const pts = points(str), us = units(str);
    const right = pts.map((p) => WORDS[p]).join(" ");
    const wrong = us.map((u) => WORDS[u]).join(" ");
    const torn = us.filter(isLone).length;
    const misses = pts.filter((p) => WORDS[p] === undefined).length;

    good.innerHTML = "";
    good.append(el("div", "ej-hd",
      `<h4>[...str].map(ch =&gt; EMOJI_WORDS[ch])</h4><span class="tag">${pts.length} code point${pts.length === 1 ? "" : "s"}</span>`));
    const gs = el("div", "ej-strip");
    if (!pts.length) gs.append(el("span", "muted", "(empty string — nothing to iterate)"));
    pts.forEach((p) => {
      const w = WORDS[p];
      gs.append(el("div", "ej-cell" + (w === undefined ? " miss" : ""),
        `<div class="g">${esc(p)}</div><div class="w">${w === undefined ? "undefined" : esc(w)}</div><div class="u">${cp(p)} · ${p.length}u</div>`));
    });
    good.append(gs, el("div", "result-line",
      `<span class="badge ${misses ? "no" : "ok"}">"${esc(right)}"</span>` +
      (misses ? `<span class="tag">${misses} key${misses === 1 ? "" : "s"} missing — and <code class='inl'>join</code> prints <code class='inl'>undefined</code> as <b>nothing</b>, so the miss shows up only as a stray space</span>` : "")));

    bad.innerHTML = "";
    bad.append(el("div", "ej-hd",
      `<h4>str.split("").map(ch =&gt; EMOJI_WORDS[ch])</h4><span class="tag">${us.length} code unit${us.length === 1 ? "" : "s"}</span>`));
    const bs = el("div", "ej-strip");
    if (!us.length) bs.append(el("span", "muted", "(empty string — nothing to iterate)"));
    us.forEach((u) => {
      const lone = isLone(u), w = WORDS[u];
      bs.append(el("div", "ej-cell" + (lone ? " torn" : w === undefined ? " miss" : ""),
        `<div class="g">${lone ? unitLabel(u) : esc(u)}</div><div class="w">${w === undefined ? "undefined" : esc(w)}</div><div class="u">${lone ? "half an emoji" : cp(u) + " · 1u"}</div>`));
    });
    bad.append(bs, el("div", "result-line",
      `<span class="badge ${wrong === right ? "ok" : "no"}">"${esc(wrong)}"</span>` +
      (wrong === right ? `<span class="tag">agrees — nothing in this string is a surrogate pair</span>` : "")));

    tally.innerHTML = torn
      ? `<b>str.length = ${str.length}</b> code units, but <b>[...str].length = ${pts.length}</b> characters. <span class="hot">${torn / 2} emoji</span> got cut into ${torn} unusable halves by <code class='inl'>split("")</code> — each half is a lone surrogate that matches no key.`
      : pts.length
        ? `<b>str.length = ${str.length}</b> and <b>[...str].length = ${pts.length}</b> — they agree, so both walks return the same answer. That is what makes the bug survive testing: this input can't detect it. Add any emoji other than ⭐ and the two lines split apart.`
        : `Empty string: <code class='inl'>[].join(" ")</code> is <code class='inl'>""</code>, so the function returns an empty phrase rather than throwing.`;
  }
}

// The table is interpolated from TABLE above, so the shipped snippet cannot drift
// from the data the demo actually runs on — and it pastes into a file and runs.
const CODE = `// The statement prints a two-column table, so ship a table. Emoji is the key.
const EMOJI_WORDS: Record<string, string> = {
${TABLE.map(([e, w]) => `  "${e}": "${w}",`).join("\n")}
};

function getEmojiPhrase(str: string): string {
  // [...str] iterates CODE POINTS. str.split("") / str[i] / a for-i loop over
  // str.length all iterate UTF-16 code UNITS, and every emoji here except ⭐
  // costs two of them — so those would hand the lookup half a character.
  return [...str].map((ch) => EMOJI_WORDS[ch]).join(" ");
}`;

// ── STEP — the lookup line by line, with both string lengths on screen ───────
// Cases 1–6 are freeCodeCamp's six official tests, in the grader's own order.
// Cases 7–9 are ours, and each lands somewhere the official set never goes:
//   7 "⭐⭐⭐" is the CONTROL. ⭐ (U+2B50) is the table's only single-code-unit
//     key, so this is the one shape of input where a naive .split("") returns
//     the right answer. Every official case contains at least one surrogate
//     pair, so the official set can never show you the input that hides the bug.
//   8 "🦈" is one emoji — join(" ") with nothing to join, so no separator at all.
//   9 "🐕🐈" is the miss path. 🐈 (U+1F408) is a cat, but this table's cat is
//     🐱 (U+1F431); a lookup is an exact code-point match, so the near-miss reads
//     back undefined and join() stringifies it rather than complaining.
const CASES = [
  { str: "🪨⭐", why: "a surrogate pair followed by the table's one single-unit emoji" },
  { str: "🥵🐕", why: "two surrogate pairs — 4 code units for 2 characters" },
  { str: "👶🦈", why: "structurally a repeat of the last case — the grader probes the table, not the tearing" },
  { str: "⭐🐟", why: "the single-unit emoji comes FIRST, so str[0] accidentally works" },
  { str: "🧊🧊👶", why: "a repeated key — the same lookup twice" },
  { str: "🐱🐟🍲", why: "three surrogate pairs — 6 units for 3 characters, the widest official gap" },
  { str: "⭐⭐⭐", why: "ours: the control — nothing here is a surrogate pair" },
  { str: "🦈", why: "ours: a single emoji, so join() has no gap to fill" },
  { str: "🐕🐈", why: "ours: 🐈 is a cat, but not THIS table's cat" },
];

// The displayed source spells the table out over two lines of five. Derived from TABLE,
// like the `code` block above, so adding a row cannot update the demo and the snippet
// and quietly leave the debugger showing the old ten.
const srcRows = (rows) => rows.map(([e, w]) => `<span class="st">"${e}"</span>: <span class="st">"${w}"</span>`).join(", ");

const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">EMOJI_WORDS</span> = {` },
  { ln: 2, html: `  <span class="tok" data-t="rows1">${srcRows(TABLE.slice(0, 5))}</span>,` },
  { ln: 3, html: `  <span class="tok" data-t="rows2">${srcRows(TABLE.slice(5))}</span>,` },
  { ln: 4, html: `<span class="tok" data-t="seal">}</span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">getEmojiPhrase</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> chars = <span class="tok" data-t="spread">[...str]</span>;` },
  { ln: 7, html: `  <span class="k">const</span> words = chars.<span class="fn">map</span>(ch =&gt; <span class="tok" data-t="lookup">EMOJI_WORDS[ch]</span>);` },
  { ln: 8, html: `  <span class="k">return</span> words.<span class="tok" data-t="join"><span class="fn">join</span>(<span class="st">" "</span>)</span>;` },
  { ln: 9, html: `}` },
];

// Instrumented run → debugger steps. One frame. Scope by omission and by line:
// EMOJI_WORDS is a module constant, so it appears at line 1 and stays; the two
// length structs appear when `str` binds (line 5) and stay for the whole call;
// `chars` from line 6, `words` from line 7. `ch` is the map callback's parameter,
// so it exists ONLY while line 7 is executing and vanishes again at line 8.
function trace(input) {
  const str = String(input);
  const pts = points(str), us = units(str);
  const hit = CASES.find((c) => c.str === str);
  const why = hit ? hit.why : "your own input";
  const steps = [];
  let filled = 0;
  const chars = [], words = [];
  let ch = null, chLive = false;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 5) vars.str = `"${str}"`;
    if (line === 7 && chLive) vars.ch = `"${ch}"`;
    const structs = [{ label: "EMOJI_WORDS", items: ENTRIES.slice(0, filled), newest: !!x.tableNew }];
    if (line >= 5) structs.push({ label: `str · UTF-16 units`, items: us.map(unitLabel) });
    if (line >= 6) structs.push({ label: "chars · code points", items: chars.slice(), newest: !!x.charsNew });
    if (line >= 7) structs.push({ label: "words", items: words.map((w) => String(w)), newest: !!x.wordsNew });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 5 ? `getEmojiPhrase("${str}")` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Nothing has been called yet. The table the problem statement <i>prints</i> is built <b>once</b>, at module load — ten keys, ten words. Transcribing it as data instead of ten <code class='inl'>if</code>s is the obvious half of this challenge; the interesting half is what a "character" turns out to be.`, { focus: "decl" });

  filled = 5;
  S(2, `Five rows land. Each key <i>looks</i> like one character, and each really is one <b>code point</b> — but every one of these five sits above <b>U+FFFF</b>, so JavaScript stores it as a <b>surrogate pair</b>: two 16-bit units that only mean an emoji when read together.`, { focus: "rows1", tableNew: true });

  filled = 10;
  S(3, `Five more, and the last one is the odd one out: <b>⭐ is U+2B50</b>, inside the Basic Multilingual Plane, so it costs a <b>single</b> code unit. That inconsistency is the whole trap — the table mixes 1-unit and 2-unit keys, so a broken indexing strategy works on some inputs and shreds others.`, { focus: "rows2", tableNew: true });

  S(4, `Ten entries, sealed. Every lookup from here is one hash probe on an <b>exact</b> key — no normalising, no fuzzy match. Whatever the loop below hands this table has to be a whole emoji, or it finds nothing.`, { focus: "seal" });

  S(5, `Call <b>getEmojiPhrase("${str}")</b> — ${why}. Two numbers are now in play and they disagree: <code class='inl'>str.length</code> is <b>${str.length}</b> (code units, the panel's first strip) while the string holds <b>${pts.length}</b> emoji. <code class='inl'>.length</code> has never been a character count; it is a <b>storage</b> count.`, { focus: "param", changed: ["str"] });

  pts.forEach((p, i) => {
    chars.push(p);
    const wide = p.length === 2;
    const tail = wide
      ? `Two units, <code class='inl'>${units(p).map(unitLabel).join(" ")}</code>, consumed together. This is exactly where <code class='inl'>split("")</code> would have stopped early and handed the lookup <code class='inl'>${unitLabel(units(p)[0])}</code> — a lone high surrogate that is not a key, not an emoji, and not anything.`
      : `One unit — ⭐ is the one key in this table that a <code class='inl'>split("")</code> walk would also get right. Cases built only from ⭐ are why the bug ships.`;
    S(6, `The spread pulls off character <b>${i + 1}</b>: <b>${p}</b> (${cp(p)}). ${tail}`, { focus: "spread", charsNew: true });
  });

  S(6, `Spread finished: <b>${str.length} code units</b> became <b>${pts.length} character${pts.length === 1 ? "" : "s"}</b>, each one whole. The two strips in the panel are the same string measured two ways — <code class='inl'>[...str]</code>, <code class='inl'>Array.from(str)</code> and <code class='inl'>for…of</code> all produce the lower one; <code class='inl'>split("")</code>, <code class='inl'>str[i]</code> and a <code class='inl'>for (i &lt; str.length)</code> loop all produce the upper one.`, { focus: "spread" });

  pts.forEach((p, i) => {
    ch = p; chLive = true;
    const w = WORDS[p];
    const found = w !== undefined;
    words.push(w);
    S(7, found
      ? `<code class='inl'>EMOJI_WORDS["${p}"]</code> → <b>"${w}"</b>. The probe cost the same as it would on a thousand-row table, and it never compared the emoji against anything — it <i>retrieved</i>. Note what the key is: a whole code point, which only exists because line 6 refused to slice by unit.`
      : `<code class='inl'>EMOJI_WORDS["${p}"]</code> → <b>undefined</b>. ${p === "🐈" ? `The animal is right and the emoji is wrong: this table's cat is <b>🐱 ${cp("🐱")}</b>, and <b>${cp(p)}</b> is a different code point entirely. Object keys match exactly, so a near-miss misses as completely as a lone surrogate would.` : `No such key. A missing property is not an error in JavaScript — it reads back as <b>undefined</b>, silently, and the next line will happily stringify it.`}`,
      { focus: "lookup", changed: ["ch"], wordsNew: true, eval: { expr: `"${p}" in EMOJI_WORDS`, val: found } });
  });

  chLive = false;
  const out = words.join(" ");
  const anyMiss = words.some((w) => w === undefined);
  S(8, anyMiss
    ? `<code class='inl'>join(" ")</code> stitches the words with single spaces — and here it hides the miss. <code class='inl'>Array.prototype.join</code> renders <b>undefined</b> and <b>null</b> as the <b>empty string</b>, not as the text "undefined", so the failed lookup leaves only a stray separator: <code class='inl'>"${out}"</code>. Compare the <code class='inl'>words</code> strip, which still says <b>undefined</b>. Two silences stacked — a missing key returns undefined instead of throwing, and join swallows the undefined instead of printing it. If you need a miss to be loud, the guard belongs at the lookup, not after the join.`
    : pts.length === 1
      ? `<code class='inl'>join(" ")</code> puts a separator <b>between</b> elements, and with one element there is no between — so the result is <b>"${out}"</b> with no trailing space. The single-emoji case needs no special branch.`
      : `<code class='inl'>join(" ")</code> puts one space between the ${words.length} words and returns <b>"${out}"</b>. Every character survived because the walk on line 6 counted code points; had it counted code units, ${us.length - pts.length === 0 ? "this particular input would still have worked — which is the danger" : `${(us.length - pts.length)} of these words would be missing`}.`,
    { focus: "join", done: true, result: `"${out}"`, ret: { value: `"${out}"` } });

  return steps;
}

export default {
  n: 358, id: "emoji", title: "Emoji Translator", dates: ["2026-08-03"],
  statement: `Given a string of emoji, return the phrase they spell — one word per emoji, separated by single spaces — using this table: ${TABLE.map(([e, w]) => `${e} <code class="inl">${w}</code>`).join(" · ")}. <span class="rule">Example: <code class="inl">getEmojiPhrase("🪨⭐")</code> → <b>"rock star"</b>; <code class="inl">getEmojiPhrase("🧊🧊👶")</code> → <b>"ice ice baby"</b>.</span>`,
  // One approach. There is no second one here: the alternative to walking by code
  // point is walking by code unit, and that isn't a slower way to the same answer
  // — it's the wrong answer. Per CONTRIBUTING Tier 3, "the only way to make the
  // first variant worse is to make it wrong" means ship one. So the broken walk
  // lives inside the demo as a live side-by-side readout instead of as a tab.
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass, by code point",
      approach: `Two moves. First, the printed table becomes an <b>object</b>, so the answer is a lookup rather than ten <code class='inl'>if</code>s. That part is bookkeeping. The part that actually decides whether this works is <b>how you cut the string up</b>: <code class='inl'>[...str]</code>, <code class='inl'>Array.from(str)</code> and <code class='inl'>for…of</code> iterate <b>code points</b>, while <code class='inl'>str.split("")</code>, <code class='inl'>str[i]</code> and any <code class='inl'>i &lt; str.length</code> loop iterate <b>UTF-16 code units</b> — and nine of these ten emoji cost <b>two</b> units each, so the unit-wise walk hands the table half an emoji and gets <code class='inl'>undefined</code>. The exception is ⭐ (<code class='inl'>U+2B50</code>), which fits in one unit; a test built only from ⭐ passes either way, which is precisely how this bug reaches production. Build a phrase from the palette and watch the two strips agree, then add anything that isn't a star and watch the lower one tear in half.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "code points vs code units",
      approach: `A debugger for the same nine cases. It starts <b>above</b> the function, watching the table fill, because line 3 is where ⭐ turns out to be a different size from its nine neighbours. Once <code class='inl'>str</code> binds, the state panel carries the string measured <b>both ways at once</b> — <code class='inl'>str · UTF-16 units</code> and <code class='inl'>chars · code points</code> — so the gap between them is a number you can watch, and lone surrogates show as <code class='inl'>\\uD83E</code>-style escapes rather than as invisible damage. Then one lookup per character, and the join. Case <b>7</b> is the control (<code class='inl'>⭐⭐⭐</code>, where both strips have the same length and the naive walk would also be right) and case <b>9</b> is the near-miss (<code class='inl'>🐈</code> vs <code class='inl'>🐱</code>). Paste your own emoji into the field too. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      // A text input, so there is no numeric `max` to bind — instead the presets
      // ARE the case array, and the hint counts it, so adding a case can never
      // orphan a chip the way a hard-coded `max: 4` did in 318.
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "emoji =", value: CASES[0].str, presets: CASES.map((c) => c.str), hint: `${CASES.length} cases: 1–6 official, 7–9 ours — or paste your own` },
      }),
    },
  ],
};
