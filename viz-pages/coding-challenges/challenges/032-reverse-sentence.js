// #32 · Reverse Sentence — the reversal is trivial; the tokenisation is the problem.
// The statement goes out of its way to say two things about whitespace: the input's
// words may be separated by ONE OR MORE spaces, and the output's must be separated by
// exactly one. Those are two different whitespace shapes, which is the statement
// telling you the step that does real work is the PARSE, not the reverse. Reach for
// the separator as a literal character — `sentence.split(" ")` — and you have already
// conceded it: split on a one-character string does not collapse a run, it faithfully
// reports that there was nothing between two adjacent separators by handing you an
// empty string. Those empties survive reverse() and come back as doubled spaces in
// join(" "), mirrored: "npm  install   apt    sudo" reverses to "sudo    apt   install
//   npm". The fix is `sentence.trim().split(/\s+/)` — a regex separator can match a
// whole run, and the .trim() is a separate half of the fix, because a zero-width match
// at position 0 has nowhere to go and `" a b".split(/\s+/)` still leads with "".
// ONE approach, deliberately. `split(" ").reverse().join(" ")` is not a second
// approach but a bug (Tier 3 §1) — it fails 2 of the 4 official cases. So, as in
// #26, the demo runs the naive tokenisation alongside the real one on every input
// and shows all three tokenisations side by side, empty slots and all.
import { el, esc, mountDebugger } from "../shared.js";

// The 4 official freeCodeCamp cases, in the grader's order, then two of ours.
//   "  hello   world  " — ours. Leading and trailing whitespace, which the official
//     set never tests, and the only case where split(/\s+/) alone is still wrong:
//     it yields ["", "hello", "world", ""] and joins back to " world hello ".
//     This is the case that earns .trim() its line.
//   "hello" — ours. The degenerate input: one word, no separator anywhere, and all
//     three tokenisations agree. Reversing a one-element array is the identity.
// Case 3 is a discrepancy in the source, not a typo here: freeCodeCamp's test TEXT
// reads reverseSentence("npm  install  sudo"), but the testString it actually
// asserts is reverseSentence("npm  install   apt    sudo") → "sudo apt install npm".
// The assertion is what the grader runs, so the assertion is what is used here.
// Cases 1 and 2 land on the same rung — single-spaced, all three tokenisations
// agree — and both are here because official coverage is a floor, not because
// "push commit git" teaches something "world hello" doesn't.
const OFFICIAL = [
  "world hello",
  "push commit git",
  "npm  install   apt    sudo",
  "import    default   function  export",
];
const CASES = [...OFFICIAL, "  hello   world  ", "hello"];

// The three tokenisations, worst to best. They are not three styles of the same
// thing: split with a STRING argument and split with a REGEX argument are genuinely
// different functions wearing one name, and only the regex one can consume a run.
const TOKENISERS = [
  { name: 'sentence.split(" ")', run: (s) => s.split(" ") },
  { name: "sentence.split(/\\s+/)", run: (s) => s.split(/\s+/) },
  { name: "sentence.trim().split(/\\s+/)", run: (s) => s.trim().split(/\s+/) },
];

const solve = (sentence) => sentence.trim().split(/\s+/).reverse().join(" ");

// Spaces are the whole subject, so they cannot be invisible. One interpunct per
// space means a doubled space reads as "··" instead of looking like a rendering bug.
const vis = (s) => esc(s).replace(/ /g, `<span class="rs-sp">·</span>`);
const tokHtml = (t) =>
  t === "" ? `<span class="rs-tok empty">""</span>` : `<span class="rs-tok">"${esc(t)}"</span>`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rs-wrap { display:flex; flex-direction:column; gap:11px; }
    .rs-row { display:flex; flex-direction:column; gap:7px; padding:9px 11px; border:1px solid var(--border); border-radius:10px; background:var(--panel-2); }
    .rs-row.good { border-color:color-mix(in srgb, var(--good) 50%, var(--border)); }
    .rs-row.bad { border-color:color-mix(in srgb, var(--danger) 55%, var(--border)); }
    .rs-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .rs-name { font:700 13px var(--mono); }
    .rs-row.bad .rs-name { color:var(--danger); }
    .rs-toks { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .rs-tok { font:700 12px var(--mono); padding:4px 8px; border-radius:7px; border:1px solid var(--border); background:var(--panel); }
    .rs-tok.empty { border-style:dashed; border-color:var(--danger); color:var(--danger); min-width:30px; text-align:center; }
    .rs-res { font:13px var(--mono); overflow-wrap:anywhere; }
    .rs-res .q { color:var(--muted); }
    .rs-sp { color:var(--warn); font-weight:800; }
    .rs-naive { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .rs-naive b { font-family:var(--mono); color:var(--text); }
    .rs-naive.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .rs-naive.split b { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "npm  install   apt    sudo"; inp.style.width = "420px";
  ctl.append(el("span", "ctl-label", "sentence"), inp);
  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((v) => {
    const c = el("button", "chip", `"${v}"`);
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const s = String(inp.value);
    const rows = TOKENISERS.map((t) => {
      const toks = t.run(s);
      return { name: t.name, toks, out: [...toks].reverse().join(" "), empties: toks.filter((x) => x === "").length };
    });
    const answer = solve(s); // the real function, so row 3's "agrees" is a check, not a tautology
    out.innerHTML = "";
    const wrap = el("div", "rs-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ok">reverseSentence("${vis(s)}") → "${vis(answer)}"</span>` +
      `<span class="rs-naive${rows[0].out === answer ? "" : " split"}">the <b>split(" ")</b> one-liner says <b>"${vis(rows[0].out)}"</b>${rows[0].out === answer ? " too" : " — it disagrees"}</span>`));

    rows.forEach((r, i) => {
      const ok = r.out === answer;
      const row = el("div", "rs-row " + (i === 2 ? "good" : ok ? "" : "bad"));
      row.append(el("div", "rs-head",
        `<span class="rs-name">${esc(r.name)}</span>` +
        `<span class="badge ${ok ? "ok" : "no"}">${i === 2 ? "the answer" : ok ? "agrees" : "wrong"}</span>` +
        `<span class="muted">${r.toks.length} token${r.toks.length === 1 ? "" : "s"}${r.empties ? ` · <b>${r.empties} empty</b>` : ""}</span>`));
      row.append(el("div", "rs-toks", r.toks.map(tokHtml).join("")));
      row.append(el("div", "rs-res", `<span class="q">reverse().join(" ") →</span> "${vis(r.out)}"`));
      wrap.append(row);
    });

    wrap.append(el("div", "muted", `The dashed slots are <b>empty strings</b>. They are not an error state — they are <code class='inl'>split</code> faithfully reporting that there was nothing between two adjacent separators. Every one of them costs a space in the join.`));
    wrap.append(el("div", "note", noteFor(s, rows)));
    out.append(wrap);
  }
}

function noteFor(s, rows) {
  const [nv, rx, rl] = rows;
  if (s.trim() === "") {
    return `Nothing but whitespace. <code class='inl'>trim()</code> reduces it to <code class='inl'>""</code>, and <code class='inl'>"".split(/\\s+/)</code> is <b>[""]</b> rather than <b>[]</b> — split always returns at least one piece, because "cut this string at every separator" applied to a string with no separators is the string itself. One empty piece joins back to <code class='inl'>""</code>, so the answer is right by accident and not by design.`;
  }
  if (rx.out !== rl.out) {
    const lead = s.length - s.trimStart().length, trail = s.length - s.trimEnd().length;
    return `This is the case the official tests never reach, and the one that shows <code class='inl'>trim()</code> is a <i>separate half</i> of the fix rather than tidying. There ${lead === 1 ? "is 1 space" : `are ${lead} spaces`} before the first word and ${trail === 1 ? "1" : trail} after the last, and <code class='inl'>split(/\\s+/)</code> still hands back <b>${rx.toks.length}</b> pieces — <code class='inl'>""</code> at each end. A regex separator collapses a run in the <i>middle</i> because there is a word on either side of it to keep apart; at position 0 there is nothing to the left, so the match produces a zero-width piece that has nowhere to go. Reversed and joined, those empties become the leading and trailing space of <code class='inl'>"${vis(rx.out)}"</code> — and note they have <b>swapped ends</b>, which is the clue that they were never whitespace at all but real elements of the array. Trim first and the split has only interior runs left to deal with.`;
  }
  if (nv.out !== rl.out) {
    return `Here is the whole problem in one input. <code class='inl'>split(" ")</code> cut at <b>every single space</b> and produced <b>${nv.toks.length}</b> pieces, <b>${nv.empties}</b> of them empty, where the regex produced <b>${rl.toks.length}</b>. A one-character separator has no notion of "one or more" — it cuts between the two spaces of a doubled space, and the nothing it finds there is a legitimate piece. Then look at what comes back: <code class='inl'>"${vis(nv.out)}"</code>. The gaps did not merely survive, they <b>mirrored</b> — the run that was widest before the last word is now widest after the first — because the empties are array elements and <code class='inl'>reverse()</code> treats them like any other. Swap in <code class='inl'>/\\s+/</code> and the <code class='inl'>+</code> does the collapsing for you.`;
  }
  if (rl.toks.length === 1) {
    return `The degenerate case: one word, no separator anywhere, so all three tokenisations return the same single-element array and reversing it is the identity. Worth clicking precisely <i>because</i> nothing happens — this is the shape of input on which the naive one-liner looks completely correct, and a test suite made only of inputs like this one would never catch it.`;
  }
  return `Every word is separated by exactly one space and there is none at either end, so the input already has the shape the output is supposed to have and all three tokenisations agree. This is what makes the bug so easy to ship: <code class='inl'>split(" ")</code> is not <i>usually</i> wrong, it is wrong exactly when the input's whitespace differs from the output's — which is the one thing the statement bothered to warn about. Add a second space anywhere above and the first row breaks.`;
}

// ── STEP — trim, split, then the reverse unrolled into a countdown loop ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">reverseSentence</span>(<span class="tok" data-t="param">sentence</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> trimmed = <span class="tok" data-t="trim">sentence.<span class="fn">trim</span>()</span>;` },
  { ln: 3, html: `  <span class="k">const</span> words = <span class="tok" data-t="split">trimmed.<span class="fn">split</span>(<span class="st">/\\s+/</span>)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> out = [];` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="idx">i = words.length - <span class="nu">1</span>; i &gt;= <span class="nu">0</span></span>; i--) {` },
  { ln: 6, html: `    <span class="tok" data-t="push">out.<span class="fn">push</span>(words[i])</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="join">out.<span class="fn">join</span>(<span class="st">" "</span>)</span>;` },
  { ln: 9, html: `}` },
];

function trace(raw) {
  const sentence = String(raw);
  const steps = [];
  // The shadow array: what `words` would have held if line 3 had read split(" ").
  // It is not a variable in the function — it is the counterfactual this whole
  // module is about, parked next to the real one so the empties stay on screen.
  const naive = sentence.split(" ");
  let trimmed, words, out, i = null;

  const S = (line, note, x = {}) => {
    const vars = { sentence: `"${sentence}"` };
    if (line >= 2 && trimmed !== undefined) vars.trimmed = `"${trimmed}"`;
    if (line >= 5 && line <= 7 && i !== null) vars.i = i;
    // words / out are live from their declaration line to the end of the call, so
    // their panels appear when that line runs and then stay put.
    const structs = [];
    if (line >= 3 && words) structs.push({ label: "words", items: words.map((w, k) => `${k === i ? "▶ " : ""}"${w}"`) });
    if (line >= 3) structs.push({ label: `split(" ") — not taken`, items: naive.map((w) => `"${w}"`) });
    if (line >= 4 && out) structs.push({ label: "out", items: out.map((w) => `"${w}"`), newest: true });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `reverseSentence("${sentence}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Reverse the words of <b>"${esc(sentence)}"</b>. The input may put <b>one or more</b> spaces between words; the output must put <b>exactly one</b>. Two different whitespace shapes — which means the reversal is the easy half and the parse is where the work is.`, { focus: "param" });

  trimmed = sentence.trim();
  const cut = sentence.length - trimmed.length;
  S(2, cut
    ? `<code class='inl'>trim()</code> removed <b>${cut}</b> character${cut === 1 ? "" : "s"} of whitespace from the ends. This is not tidying, it is load-bearing: a regex split can collapse a run in the <i>middle</i> because there is a word on each side of it, but a run at position 0 has nothing to its left, so it would produce an empty piece that survives all the way to the output as a leading space.`
    : `<code class='inl'>trim()</code> changed nothing — there is no whitespace at either end of this input. It still has to be here, because <code class='inl'>" a b".split(/\\s+/)</code> leads with <code class='inl'>""</code> and the official tests never hand you an input that would reveal it.`,
    { focus: "trim", changed: ["trimmed"] });

  words = trimmed.split(/\s+/);
  const gap = naive.length - words.length;
  S(3, `<code class='inl'>split(/\\s+/)</code> cuts at each <b>run</b> of whitespace and yields <b>${words.length}</b> word${words.length === 1 ? "" : "s"}. The panel beside it is the counterfactual: with the literal <code class='inl'>" "</code> as the separator the same string gives <b>${naive.length}</b> piece${naive.length === 1 ? "" : "s"}${gap ? `, <b>${gap}</b> of them empty` : `, identical here`}. ${gap
      ? `Those empties are not a failure — <code class='inl'>split</code> is correctly reporting that between two adjacent separators there was nothing. The <code class='inl'>+</code> is the entire difference: it lets one match consume the whole run.`
      : `Every separator in this input is a single space, so the two agree — which is exactly why the bug survives casual testing.`}`,
    { focus: "split", changed: ["words"] });

  out = [];
  S(4, `The accumulator. <code class='inl'>words.reverse()</code> would do this in one call; unrolling it into a countdown makes visible that reversing is a <b>pure re-ordering of array elements</b> — it has no opinion about what those elements are, which is why empty strings ride along untouched.`, { focus: null });

  for (i = words.length - 1; i >= 0; i--) {
    S(5, `<b>i = ${i}</b>, still ≥ 0, so there is another word to take. Walking the array backwards is the reversal — the last word is read first and lands at the front of <code class='inl'>out</code>.`,
      { focus: "idx", eval: { expr: `i = ${i} >= 0`, val: true } });
    out.push(words[i]);
    S(6, `Take <b>"${esc(words[i])}"</b> — word #${i + 1} of ${words.length} — and append it. ${i === words.length - 1
      ? `The last word becomes the first, which is the whole of what "reverse the sentence" asks for.`
      : i === 0
        ? `The first word lands last, and the re-ordering is done. Nothing about the separators was ever touched; they were discarded at the split and will be recreated at the join.`
        : `Nothing is examined, compared or rewritten — the transform half of this problem is a copy in the other direction.`}`,
      { focus: "push", changed: [] });
  }
  S(5, `<b>i = -1</b>, so the countdown is finished and every word has moved. ${words.length} word${words.length === 1 ? "" : "s"} in, ${out.length} out.`,
    { focus: "idx", eval: { expr: `i = -1 >= 0`, val: false } });

  i = null;
  const answer = out.join(" ");
  const naiveOut = [...naive].reverse().join(" ");
  S(8, `<code class='inl'>join(" ")</code> puts <b>one</b> space between every pair of elements — so the output's whitespace is manufactured fresh and cannot inherit the input's. That is the payoff of tokenising properly: <b>"${vis(answer)}"</b>. Run the shadow array through the same reverse and join and you get <b>"${vis(naiveOut)}"</b>${naiveOut === answer ? `, the same thing — this input cannot tell the two apart.` : ` — every empty element bought itself a space, and the runs came back <b>mirrored</b>, because reverse() moved them to the other end.`}`,
    { focus: "join", done: true, result: `"${answer}"`, ret: { value: `"${answer}"` } });
  return steps;
}

export default {
  n: 32, id: "revsentence", title: "Reverse Sentence", dates: ["2025-09-11"],
  statement: `Given a string of words, return a new string with the words in <b>reverse order</b> — the first word ends up at the end, the last word at the beginning. In the given string, words can be separated by <b>one or more</b> spaces; the returned string should have <b>only one space</b> between words. <span class="rule">Example: <code class="inl">reverseSentence("npm  install   apt    sudo")</code> → <code class="inl">"sudo apt install npm"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass to tokenise",
      approach: `The one-liner everybody writes is <code class='inl'>sentence.split(" ").reverse().join(" ")</code>, and it fails <b>2 of the 4</b> official cases. The reason is that <code class='inl'>split</code> with a <i>string</i> argument and <code class='inl'>split</code> with a <i>regex</i> argument are genuinely different functions wearing one name: a one-character separator has no notion of "one or more", so it cuts between the two spaces of a doubled space and reports what it found there — <b>nothing</b> — as an empty string. <code class='inl'>"npm  install   apt    sudo".split(" ")</code> is a ten-element array with six <code class='inl'>""</code> in it, and those are not an error state, they are the correct answer to the question that was asked. They then survive <code class='inl'>reverse()</code>, which has no opinion about its elements, and each one buys itself a space back in <code class='inl'>join(" ")</code> — so the output is <code class='inl'>"sudo    apt   install  npm"</code>, with the original runs <b>mirrored</b> onto the other end. The fix is to make the separator able to match a whole run: <code class='inl'>split(/\\s+/)</code>. That is only half of it, though. <code class='inl'>" a b".split(/\\s+/)</code> is still <code class='inl'>["", "a", "b"]</code>, because a run at position 0 has no word to its left and the match is forced to yield a zero-width piece — so <code class='inl'>trim()</code> is a second, independent part of the fix, not a tidy-up. <code class='inl'>sentence.trim().split(/\\s+/).reverse().join(" ")</code>. Type a sentence and watch the three tokenisations diverge.`,
      code: `// The reversal is trivial. The tokenisation is the problem.
function reverseSentence(sentence: string): string {
  // split(" ") does NOT collapse a run of spaces — a one-character separator
  // cuts between each adjacent pair and reports the nothing it finds there as
  // "". Those empties survive reverse() and buy a space each back in join(" ").
  // Only a regex separator can consume a whole run; and .trim() is a separate
  // half of the fix, because " a b".split(/\\s+/) still leads with "".
  return sentence.trim().split(/\\s+/).reverse().join(" ");
}`,
      mount,
    },
    {
      name: "Step through", cost: "tokenise → reverse → join",
      approach: `The pipeline, one stage at a time, with the naive tokenisation parked beside the real one so the empty strings stay on screen the whole way. Start on <b>"npm  install   apt    sudo"</b> and watch the shadow array carry six <code class='inl'>""</code> that the real one never had. Then <b>"  hello   world  "</b> — ours, not freeCodeCamp's — where <code class='inl'>trim()</code> visibly removes four characters and the note names what <code class='inl'>split(/\\s+/)</code> alone would still have got wrong. <b>"world hello"</b> is the contrast: every separator is a single space, both tokenisations agree, and the bug is invisible. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "sentence =", value: "npm  install   apt    sudo", presets: CASES, hint: "any string" } }),
    },
  ],
};
