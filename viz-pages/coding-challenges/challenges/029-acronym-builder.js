// #29 · Acronym Builder — the skip-list is six words, and "the" is not one of them.
// The statement ENUMERATES the words to drop: a, for, an, and, by, of. Six, listed,
// closed. Everyone reads that as a category — "the little connecting words" — and
// the category contains "the", so they add it. freeCodeCamp tests that on purpose:
// "By the way" is BTW, not BW, and the long penguin sentence keeps every "the" it
// has. When a spec enumerates a set, the set IS the spec; do not generalise it.
// The second half is shape. "Drop these words, unless it is the first word" is a
// filter whose predicate depends on the INDEX, which `Array.prototype.filter`
// supports and almost nobody remembers — (w, i) => i === 0 || !SKIP.has(...) — so
// there is no pre-loop special case and no off-by-one. And watch the two opposite
// case operations: lowercase to MATCH the list, uppercase to EMIT the letter.
// ONE approach, deliberately. Split, drop, take the initial, join — there is no
// wasteful act to name here that isn't just a bug (Tier 3 §1), so instead of a
// strawman variant the demo runs the two WRONG readings alongside the real one and
// shows you the inputs where each of them breaks.
import { el, esc, mountDebugger } from "../shared.js";

// ── The six words, exactly as the statement lists them ────────────────────────
const SKIP_LIST = ["a", "for", "an", "and", "by", "of"];
const SKIP = new Set(SKIP_LIST);

// The 7 strings freeCodeCamp's JavaScript grader actually asserts on, in its
// order, then two of ours.
//
// CAREFUL — the official fixture has a defect, and it is not ours to "fix".
// Test #5's TEXT reads `buildAcronym("For your information") should return "FYI"`,
// but the `testString` beneath it asserts
//   assert.equal(buildAcronym("Light Amplification by ... Radiation"), "LASER");
// The Python half of the same challenge asserts FYI and never mentions LASER, so
// the JS assertion was evidently overwritten and its label left behind. The grader
// runs the assertion, so LASER is the case that is really tested and FYI is the
// case that got lost — which is why LASER is in OFFICIAL and FYI is in ours.
//
// Ours, and what each one is for:
//   For your information — the lost test, restored by hand. A stop-word first
//     word in its shortest form: "For" survives, so the answer is FYI and not YI.
//   The Lord of the Rings — isolates the trap on its own. "the" appears twice,
//     both times kept, while "of" between them is dropped; anyone running on
//     their own intuition of English articles answers LR or TLR instead of TLTR.
// SEO and FAQ land on the same rung — no skip-word anywhere — and both are here
// because official coverage is a floor, not because FAQ teaches what SEO doesn't.
const OFFICIAL = [
  "Search Engine Optimization",
  "Frequently Asked Questions",
  "National Aeronautics and Space Administration",
  "Federal Bureau of Investigation",
  "Light Amplification by Stimulated Emission of Radiation",
  "By the way",
  "An unstoppable herd of waddling penguins overtakes the icy mountains and sings happily",
];
const CASES = [...OFFICIAL, "For your information", "The Lord of the Rings"];

const splitWords = (s) => String(s).split(/\s+/).filter(Boolean);

// One row per word: is it on the list, did it survive, what letter does it emit.
// `kept` is the index-dependent predicate itself, kept in one place so the demo,
// the notes and the debugger can never drift from each other.
function analyze(str) {
  return splitWords(str).map((w, i) => ({
    w, i,
    inList: SKIP.has(w.toLowerCase()),
    first: i === 0,
    kept: i === 0 || !SKIP.has(w.toLowerCase()),
    letter: w[0].toUpperCase(),
  }));
}

const build = (rows) => rows.filter((r) => r.kept).map((r) => r.letter).join("");

// The two readings people actually write, so the real one has something to be
// different from. Neither is a second approach — each is a misread of one clause.
//   dropFirst : obeys the list but forgets "unless they are the first word".
//   addThe    : keeps the first-word exception but treats the list as a category
//               and folds "the" into it.
const naiveDropFirst = (str) =>
  splitWords(str).filter((w) => !SKIP.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("");
const THE = new Set([...SKIP_LIST, "the"]);
const naiveAddThe = (str) =>
  splitWords(str).filter((w, i) => i === 0 || !THE.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ac-wrap { display:flex; flex-direction:column; gap:12px; }
    .ac-skip { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .ac-sw { font:700 12px var(--mono); padding:4px 8px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .ac-sw.hit { border-color:var(--warn); color:var(--warn); background:color-mix(in srgb, var(--warn) 12%, transparent); }
    .ac-sw.no { border-color:color-mix(in srgb, var(--danger) 50%, var(--border)); color:var(--danger); border-style:dashed; text-decoration:line-through; }
    .ac-words { display:flex; flex-wrap:wrap; gap:6px; }
    .ac-w { display:inline-flex; align-items:center; gap:7px; font:13px var(--mono); padding:5px 9px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .ac-w .ini { font-weight:800; color:var(--accent); }
    .ac-w.drop { opacity:.55; border-style:dashed; }
    .ac-w.drop .txt { text-decoration:line-through; }
    .ac-w.drop .ini { color:var(--muted); }
    .ac-w.first { border-color:var(--good); }
    .ac-w.decoy { border-color:var(--warn); }
    .ac-w .tag { display:inline-block; font:600 10px var(--mono); color:var(--muted); }
    .ac-w.first .tag { color:var(--good); }
    .ac-w.decoy .tag { color:var(--warn); }
    .ac-build { display:flex; flex-wrap:wrap; gap:6px; align-items:flex-end; min-height:52px; }
    .ac-l { display:flex; flex-direction:column; align-items:center; gap:3px; animation:ac-pop .3s backwards; }
    .ac-l .ch { font:800 19px var(--mono); color:var(--accent); background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:5px 10px; min-width:32px; text-align:center; }
    .ac-l .src { font:10px var(--mono); color:var(--muted); max-width:78px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    @keyframes ac-pop { from { opacity:0; transform:translateY(-7px); } }
    .ac-alts { display:flex; flex-direction:column; gap:5px; }
    .ac-alt { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .ac-alt b { font-family:var(--mono); color:var(--text); }
    .ac-alt.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .ac-alt.split b { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "By the way"; inp.style.width = "460px";
  ctl.append(el("span", "ctl-label", "phrase"), inp);
  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((v) => {
    const c = el("button", "chip", esc(v.length > 34 ? v.slice(0, 31) + "…" : v));
    c.title = v;
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const str = String(inp.value);
    const rows = analyze(str);
    const acr = build(rows);
    const alt1 = naiveDropFirst(str);
    const alt2 = naiveAddThe(str);
    out.innerHTML = "";
    const wrap = el("div", "ac-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${rows.length ? "ok" : "no"}">buildAcronym(…) → "${esc(acr)}"</span>` +
      `<span class="more">${rows.length} word${rows.length === 1 ? "" : "s"} in, ${acr.length} letter${acr.length === 1 ? "" : "s"} out</span>`));

    // The list, drawn as the closed set it is — plus the word everybody adds to it.
    const hits = new Set(rows.filter((r) => r.inList).map((r) => r.w.toLowerCase()));
    const skipRow = el("div", "ac-skip");
    skipRow.append(el("span", "ctl-label", "SKIP ="));
    SKIP_LIST.forEach((w) => skipRow.append(el("span", "ac-sw" + (hits.has(w) ? " hit" : ""), esc(w))));
    skipRow.append(el("span", "more", "· and that is all of it —"));
    skipRow.append(el("span", "ac-sw no", "the"));
    wrap.append(skipRow);

    const strip = el("div", "ac-words");
    rows.forEach((r) => {
      const decoy = !r.inList && r.w.toLowerCase() === "the";
      const cls = "ac-w" + (r.kept ? (r.inList ? " first" : decoy ? " decoy" : "") : " drop");
      const tag = !r.kept ? "on the list"
        : r.inList ? "on the list · first word, kept"
        : decoy ? "not on the list"
        : "";
      strip.append(el("span", cls,
        `<span class="txt"><span class="ini">${esc(r.w[0])}</span>${esc(r.w.slice(1))}</span>` +
        (tag ? `<span class="tag">${tag}</span>` : "")));
    });
    if (!rows.length) strip.append(el("span", "more", "(nothing to split — type a phrase)"));
    wrap.append(strip);

    const built = el("div", "ac-build");
    rows.filter((r) => r.kept).forEach((r, k) => {
      const box = el("div", "ac-l", `<span class="ch">${esc(r.letter)}</span><span class="src">${esc(r.w)}</span>`);
      box.style.animationDelay = `${k * 70}ms`;
      built.append(box);
    });
    wrap.append(built);

    const alts = el("div", "ac-alts");
    alts.append(el("div", "ac-alt" + (alt1 === acr ? "" : " split"),
      `Drop every listed word, <b>first one included</b> → <b>"${esc(alt1)}"</b>${alt1 === acr ? " — same here" : " — it disagrees"}`));
    alts.append(el("div", "ac-alt" + (alt2 === acr ? "" : " split"),
      `Read the list as a category and add <b>"the"</b> → <b>"${esc(alt2)}"</b>${alt2 === acr ? " — same here" : " — it disagrees"}`));
    wrap.append(alts);

    wrap.append(el("div", "note", noteFor(str, rows, acr, alt1, alt2)));
    out.append(wrap);
  }
}

function noteFor(str, rows, acr, alt1, alt2) {
  if (!rows.length)
    return `Nothing to work with. <code class='inl'>split(/\\s+/)</code> on an empty or all-whitespace string still hands back a piece — an empty one — which is why the <code class='inl'>.filter(Boolean)</code> is there rather than being decoration. Without it the first "word" would be <code class='inl'>""</code>, and <code class='inl'>""[0]</code> is <code class='inl'>undefined</code>, so <code class='inl'>.toUpperCase()</code> throws.`;

  const firstKept = rows[0].inList;
  const theCount = rows.filter((r) => r.w.toLowerCase() === "the").length;
  const dropped = rows.filter((r) => !r.kept);
  const capped = rows.filter((r) => r.inList && r.w[0] !== r.w[0].toLowerCase());

  if (firstKept)
    return `<b>"${esc(rows[0].w)}"</b> is on the list and it survives anyway, because the rule is "ignore these words <i>unless they are the first word of the given string</i>". That clause is what stops this from being a plain predicate: whether a word is dropped depends on <b>where</b> it is, not only on what it is. Written as a pre-loop special case it is an off-by-one waiting to happen; written as <code class='inl'>filter((w, i) =&gt; i === 0 || !SKIP.has(w.toLowerCase()))</code> it is one clause, because <code class='inl'>filter</code> hands the callback the index and always has. The reading that forgets it answers <b>"${esc(alt1)}"</b> here.${theCount ? ` Meanwhile <b>"the"</b> is not on the list at all, so it keeps its letter — that reading answers <b>"${esc(alt2)}"</b>.` : ""}`;

  if (theCount)
    return `This is the trap on its own. <b>"the"</b> appears ${theCount === 1 ? "once" : `${theCount} times`} and is kept ${theCount === 1 ? "" : "every time"}, because the statement does not describe a <i>category</i> of words to drop — it <b>enumerates</b> six of them, and "the" is not among the six. ${dropped.length ? `<b>"${esc(dropped[0].w)}"</b> in the same sentence <i>is</i> on the list and goes, which is what makes the contrast visible: these two words feel identical and the spec treats them differently.` : ``} Fold "the" in because it feels like it belongs and the answer becomes <b>"${esc(alt2)}"</b>. When a spec lists a set, the list <i>is</i> the rule; an intuition about what the list is "for" is a different rule you invented.`;

  if (!dropped.length)
    return `No word here is on the list, so the acronym is simply the initials — every word contributes exactly one letter, uppercased. Worth noticing what this case <i>cannot</i> tell you: it passes under all three readings on the screen, which is why a test suite built out of phrases like this one would never catch either mistake. The cases that discriminate are the ones with a listed word in them, and especially the ones where that word is <b>first</b>.`;

  const w = dropped[0].w;
  return `<b>"${esc(w)}"</b> is dropped: it is on the list and it is not the first word, so both halves of the condition are satisfied. There are <b>two opposite case operations</b> in this one pipeline — <code class='inl'>toLowerCase()</code> to <i>match</i> against a list stored in lowercase, <code class='inl'>toUpperCase()</code> to <i>emit</i> the letter — and they are easy to get the same way round, which either stops the listed words matching or returns the acronym in lower case. ${capped.length ? `You can see why the match side is needed right here: the word arrives as <b>"${esc(capped[0].w)}"</b> and the list holds <code class='inl'>"${esc(capped[0].w.toLowerCase())}"</code>.` : `None of freeCodeCamp's cases capitalises a listed word, so the grader never punishes dropping the <code class='inl'>toLowerCase()</code> — retype this phrase in Title Case and watch <b>"${esc(w)}"</b> come back from the dead.`} The <code class='inl'>Set</code> is not here for speed — six words is nothing — it is here because <code class='inl'>SKIP.has(w)</code> says <i>membership</i>, which is the word the statement itself uses.`;
}

// ── STEP — the pipeline unrolled into a loop, one word and one decision at a time ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">buildAcronym</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="skip">SKIP = <span class="k">new</span> <span class="fn">Set</span>([<span class="st">"a"</span>, <span class="st">"for"</span>, <span class="st">"an"</span>, <span class="st">"and"</span>, <span class="st">"by"</span>, <span class="st">"of"</span>])</span>;` },
  { ln: 3, html: `  <span class="k">const</span> words = <span class="tok" data-t="split">str.<span class="fn">split</span>(/\\s+/).<span class="fn">filter</span>(<span class="fn">Boolean</span>)</span>;` },
  { ln: 4, html: `  <span class="k">let</span> <span class="tok" data-t="seed">acronym = <span class="st">""</span></span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> i = <span class="nu">0</span>; i &lt; words.length; i++) {` },
  { ln: 6, html: `    <span class="k">const</span> <span class="tok" data-t="pick">w = words[i]</span>;` },
  { ln: 7, html: `    <span class="k">if</span> (<span class="tok" data-t="test">i &gt; <span class="nu">0</span> &amp;&amp; SKIP.<span class="fn">has</span>(w.<span class="fn">toLowerCase</span>())</span>) <span class="k">continue</span>;` },
  { ln: 8, html: `    <span class="tok" data-t="emit">acronym += w[<span class="nu">0</span>].<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> acronym;` },
  { ln: 11, html: `}` },
];

function trace(raw) {
  const str = String(raw);
  const steps = [];
  const marks = [];
  let words, acronym, i, w;
  const title = `buildAcronym("${str.length > 30 ? str.slice(0, 27) + "…" : str}")`;

  const S = (line, note, x = {}) => {
    const vars = { str: `"${str.length > 38 ? str.slice(0, 35) + "…" : str}"` };
    if (line >= 3 && words) vars.words = `${words.length} word${words.length === 1 ? "" : "s"}`;
    if (line >= 4 && acronym !== undefined) vars.acronym = `"${acronym}"`;
    if (line >= 5 && line <= 9 && i !== undefined) vars.i = i;
    if (line >= 6 && line <= 9 && w !== undefined) vars.w = `"${w}"`;
    // SKIP is live from line 2 and `words` from line 3, both to the end of the
    // call, so their panels appear on those lines and then stay. The marks fill
    // in left to right as each word is decided.
    const structs = [];
    if (line >= 2) structs.push({ label: "SKIP", items: SKIP_LIST });
    if (line >= 3 && words)
      structs.push({ label: "words", items: words.map((v, k) => `${k === i && line >= 6 ? "▶ " : ""}${v}${marks[k] || ""}`) });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Build an acronym from <b>"${esc(str)}"</b>. Three clauses do all the work: take each word's first letter capitalised, skip six named words, and keep the first word whatever it is. Only the middle clause looks like the hard one, and it is the easiest — it is the interaction between the second and the third that people get wrong.`, { focus: "param" });

  S(2, `The six words, written down. This is an <b>enumerated set</b>, not a description of a category — it is not "articles and prepositions", it is <i>these six strings</i>. <b>"the"</b> is the word that is missing and the word everyone adds: it is an article, it is short, it feels exactly like <code class='inl'>"an"</code> and <code class='inl'>"a"</code>, and it is not here. A <code class='inl'>Set</code> rather than an array is not about speed at six items — it is the data structure whose verb is <i>membership</i>, which is the question being asked.`, { focus: "skip" });

  words = splitWords(str);
  S(3, `<code class='inl'>split(/\\s+/)</code> cuts on runs of whitespace, so a double space between words does not manufacture an extra one. The <code class='inl'>filter(Boolean)</code> after it is not decoration: a leading space makes <code class='inl'>split</code> emit an empty string first, and <code class='inl'>""[0]</code> is <code class='inl'>undefined</code>, so the very next line would throw rather than return a wrong answer. <b>${words.length}</b> word${words.length === 1 ? "" : "s"} survive.`, { focus: "split", changed: ["words"] });

  acronym = "";
  S(4, `The accumulator starts empty. Everything below only ever <b>appends</b>, so the "letters in the order they are given" clause needs no code at all — it is a property of walking the array forwards.`, { focus: "seed", changed: ["acronym"] });

  for (i = 0; i < words.length; i++) {
    w = words[i];
    S(6, `Word <b>#${i + 1}</b> of ${words.length}: <b>"${esc(w)}"</b>.${i === 0 ? ` This is the one position where the skip-list does not apply.` : ``}`, { focus: "pick", changed: ["w"] });

    const lower = w.toLowerCase();
    const inList = SKIP.has(lower);
    const skipped = i > 0 && inList;
    S(7, inList
      ? (i === 0
          ? `<b>"${esc(w)}"</b> <i>is</i> on the list — and it stays, because <code class='inl'>i &gt; 0</code> is false. The condition is deliberately index-first: the exception is not a property of the word, it is a property of the position, so testing the position before the membership says out loud which of the two rules wins. Drop the <code class='inl'>i &gt; 0</code> and this acronym loses its first letter.`
          : `<b>"${esc(w)}"</b> is past position 0 <i>and</i> on the list, so both halves hold and it contributes nothing. Note the <code class='inl'>toLowerCase()</code>: the list is stored lowercase and this word arrived as <code class='inl'>"${esc(w)}"</code>${w === lower ? `` : ` with a capital`} — the membership test lowercases to <b>match</b>, while the line below uppercases to <b>emit</b>. Two opposite case operations in one pipeline, and swapping them is the other common way to write this wrong.`)
      : (lower === "the"
          ? `<b>"${esc(w)}"</b> is not on the list. It <i>feels</i> like it should be — it is the definite article, it sits where <code class='inl'>"an"</code> and <code class='inl'>"a"</code> sit — but the statement enumerated six words and this is not one of them, so it keeps its letter. This single word is the difference between <code class='inl'>"BTW"</code> and <code class='inl'>"BW"</code>.`
          : `<b>"${esc(w)}"</b> is not one of the six, so nothing skips it and it contributes its initial.`),
      { focus: "test", eval: { expr: `i > 0 && SKIP.has("${lower}")`, val: skipped } });

    if (skipped) { marks[i] = " ✗"; continue; }

    acronym += w[0].toUpperCase();
    marks[i] = " ✓";
    S(8, `<code class='inl'>"${esc(w[0])}"</code> uppercases to <b>${esc(w[0].toUpperCase())}</b> and the acronym becomes <b>"${esc(acronym)}"</b>. <code class='inl'>toUpperCase()</code> runs unconditionally rather than behind an "is it already capital?" test — it is a no-op on a letter that already is one, and the official set contains <code class='inl'>"For your information"</code>-shaped inputs where some words are lowercase and some are not.`, { focus: "emit", changed: ["acronym"] });
  }

  i = undefined; w = undefined;
  S(10, `Every word has been decided. <b>Return "${esc(acronym)}"</b> — ${acronym.length} letter${acronym.length === 1 ? "" : "s"} from ${words.length} word${words.length === 1 ? "" : "s"}. The whole function is a filter with an index-dependent predicate followed by a map; the loop above is only that pipeline written out so you can watch the predicate decide.`,
    { focus: null, done: true, result: `"${acronym}"`, ret: { value: `"${acronym}"` } });
  return steps;
}

export default {
  n: 29, id: "acronym", title: "Acronym Builder", dates: ["2025-09-08"],
  statement: `Given a string containing one or more words, return an <b>acronym</b> of the words. Each word contributes its <b>first letter, capitalized</b>, in the order given, with no spaces — except that these six words are <b>ignored</b> unless they are the first word of the string: <code class="inl">a</code>, <code class="inl">for</code>, <code class="inl">an</code>, <code class="inl">and</code>, <code class="inl">by</code>, <code class="inl">of</code>. <span class="rule">Example: <code class="inl">buildAcronym("Federal Bureau of Investigation")</code> → <code class="inl">"FBI"</code>, but <code class="inl">buildAcronym("By the way")</code> → <code class="inl">"BTW"</code> — <code class="inl">by</code> is first so it stays, and <code class="inl">the</code> is not on the list.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(w) — one pass per word",
      approach: `The pipeline is short enough to read off the statement: split on whitespace, drop the ignored words, take each survivor's first letter uppercased, join. Two clauses are where it actually goes wrong. First, the ignore-list is <b>enumerated</b> — <code class='inl'>a</code>, <code class='inl'>for</code>, <code class='inl'>an</code>, <code class='inl'>and</code>, <code class='inl'>by</code>, <code class='inl'>of</code>, six strings, closed — and it is enormously tempting to read it as the category "little connecting words" and add <code class='inl'>the</code>. freeCodeCamp tests that deliberately: <code class='inl'>"By the way"</code> is <b>BTW</b>, not BW, and the long penguin sentence keeps both of its <code class='inl'>the</code>s. When a spec lists a set, the list is the rule. Second, <i>"unless they are the first word"</i> makes the predicate depend on the <b>index</b>, not only on the word — and that is exactly the shape <code class='inl'>Array.prototype.filter</code> already supports, since it passes the index as the second argument. <code class='inl'>filter((w, i) =&gt; i === 0 || !SKIP.has(w.toLowerCase()))</code> is the whole rule in one clause, with no pre-loop special case to get off by one. Watch the two <b>opposite</b> case operations while you are in there: <code class='inl'>toLowerCase()</code> to match against a lowercase list, <code class='inl'>toUpperCase()</code> to emit the letter. The <code class='inl'>Set</code> earns its place on intent rather than speed — at six words <code class='inl'>includes</code> would be just as fast, but <code class='inl'>has</code> says <i>membership</i>, which is the word the statement uses. Type a phrase and watch the two wrong readings diverge from the right one.`,
      code: `// The skip-list is EXACTLY these six words. "the" is not one of them — that is
// the whole trap, and the grader tests it ("By the way" -> "BTW", not "BW").
const SKIP = new Set(["a", "for", "an", "and", "by", "of"]);

function buildAcronym(str: string): string {
  return str
    .split(/\\s+/)
    // A leading space makes split() emit "", and ""[0] is undefined, so the
    // .map() below would throw rather than return a wrong answer.
    .filter(Boolean)
    // "...unless they are the first word" makes this predicate depend on the
    // INDEX, which filter has always supplied. No pre-loop special case needed.
    .filter((w, i) => i === 0 || !SKIP.has(w.toLowerCase()))
    // Two opposite case operations: lowercase to MATCH, uppercase to EMIT.
    .map((w) => w[0].toUpperCase())
    .join("");
}`,
      mount,
    },
    {
      name: "Step through", cost: "one word at a time",
      approach: `The <code class='inl'>filter</code>/<code class='inl'>map</code>/<code class='inl'>join</code> unrolled into a loop, so the predicate makes its decision in the open, one word per pass. Start on <b>By the way</b> — three words, and every interesting rule in the problem fires: <code class='inl'>"By"</code> is on the list and kept because it is first, <code class='inl'>"the"</code> is kept because it was never on the list, and neither fact is one you would guess. Then <b>An unstoppable herd…</b>, the long official case, where the first-word exception and two mid-sentence drops and two surviving <code class='inl'>the</code>s all appear in the same sentence, and <b>Light Amplification by Stimulated Emission of Radiation</b>, where <code class='inl'>by</code> and <code class='inl'>of</code> both go and nothing else does. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "phrase =", value: "By the way", presets: CASES, hint: "any words" } }),
    },
  ],
};
