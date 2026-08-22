// #340 · Pig Latin Converter — the capital belongs to the word, not to the letter.
// Moving the consonant cluster is the easy half. The hard half is that the capital
// was never a property of "P" — it marked where the word STARTS. Move the cluster
// and the start moves with it, so the capital has to be transplanted onto the new
// first letter and stripped from the relocated one. "Pig" → "Igpay", never "IgPay".
import { el, esc, mountDebugger } from "../shared.js";

// ── the solution, shared by the demo and the trace ───────────────────────────
// Split a word into the leading consonant run and whatever follows. The cluster
// is greedy but stops at the FIRST vowel — that is why "quick" moves only "q"
// (the "u" is a vowel) while "brown" moves both letters of "br".
const clusterOf = (word) => word.match(/^[^aeiou]+/i)?.[0] ?? "";

function convertWord(word) {
  const cluster = clusterOf(word);
  if (cluster === "") return { cluster: "", rest: word, suffix: "way", out: word + "way", capMoved: false };
  const rest = word.slice(cluster.length);
  const moved = rest + cluster.toLowerCase() + "ay";
  const capped = /[A-Z]/.test(word[0]);
  const out = capped ? moved[0].toUpperCase() + moved.slice(1) : moved;
  return { cluster, rest, suffix: "ay", out, capMoved: capped };
}

const pigLatin = (str) => str.split(" ").map((w) => convertWord(w).out).join(" ");

// Cases. 1–6 are freeCodeCamp's six official tests, in the order the grader
// lists them. 7 is invented: "Rhythm" has no vowel at all, so the cluster eats
// the whole word and the remainder is empty — the degenerate end of the rule,
// and the one input where the capital travels back to where it started.
const CASES = [
  "universe",
  "hello",
  "hello universe",
  "Hello universe",
  "Pig Latin is fun",
  "The quick brown fox jumped over the lazy dog",
  "Rhythm and blues",
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pl-out { font:800 19px var(--mono); color:var(--good); margin:14px 0 4px; line-height:1.5; word-break:break-word; }
    .pl-words { display:flex; flex-direction:column; gap:7px; margin-top:14px; }
    .pl-w { display:grid; grid-template-columns:minmax(120px,auto) 22px 1fr; align-items:center; gap:9px;
            border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:7px 11px; }
    .pl-w.vowel { border-color:color-mix(in srgb, var(--c3) 55%, var(--border)); }
    .pl-src, .pl-dst { font:800 15px var(--mono); letter-spacing:.01em; }
    .pl-arrow { color:var(--muted); font:700 14px var(--mono); text-align:center; }
    .pl-cl { color:var(--warn); }
    .pl-rest { color:var(--text); }
    .pl-suf { color:var(--c3); }
    .pl-cap { display:inline-block; margin-left:9px; padding:2px 7px; border-radius:999px;
              border:1px solid var(--accent); color:var(--accent);
              font:700 10px var(--sans); letter-spacing:.05em; text-transform:uppercase; vertical-align:middle; }
    .pl-legend { display:flex; gap:14px; flex-wrap:wrap; margin-top:12px; font:600 11.5px var(--sans); color:var(--muted); }
    .pl-legend b { font:800 12px var(--mono); }
  `));
}

function mount(host) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "Pig Latin is fun"; inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "sentence"), inp);

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.length > 26 ? c.slice(0, 24) + "…" : c));
    chip.title = c;
    chip.onclick = () => { inp.value = c; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", "Type any sentence, or load one of the official test cases. Each word is broken into its <b>leading consonant cluster</b>, the <b>remainder</b>, and the <b>suffix</b> — watch where the capital ends up."),
    ctl, pre, out,
  );
  inp.oninput = render;
  render();

  function render() {
    // Collapse whitespace before converting: splitting " a" on " " yields an
    // empty word, which the rule would happily turn into "way". That is an
    // artefact of a half-typed sentence, not of the algorithm.
    const str = inp.value.trim().replace(/\s+/g, " ");
    out.innerHTML = "";
    if (!str) { out.append(el("div", "muted", "Type something above.")); return; }

    const words = str.split(" ");
    out.append(el("div", "pl-out", esc(pigLatin(str))));

    const rows = el("div", "pl-words");
    words.forEach((word) => {
      const r = convertWord(word);
      const isVowel = r.cluster === "";
      const row = el("div", "pl-w" + (isVowel ? " vowel" : ""));
      // Source side: the cluster tinted amber so you can see exactly what is
      // about to be lifted off the front.
      row.append(el("div", "pl-src",
        `<span class="pl-cl">${esc(r.cluster)}</span><span class="pl-rest">${esc(r.rest)}</span>`));
      row.append(el("div", "pl-arrow", "→"));
      // Destination side: same two pieces, reordered, plus the suffix. The
      // cluster is rendered lowercased because that is what actually ships.
      const dst = isVowel
        ? `<span class="pl-rest">${esc(r.rest)}</span><span class="pl-suf">way</span>`
        : `<span class="pl-rest">${esc(r.capMoved ? r.out.slice(0, r.rest.length) : r.rest)}</span>` +
          `<span class="pl-cl">${esc(r.cluster.toLowerCase())}</span><span class="pl-suf">ay</span>`;
      const cap = r.capMoved
        ? `<span class="pl-cap">capital ${esc(r.cluster[0])} → ${esc(r.out[0])}</span>`
        : "";
      row.append(el("div", "pl-dst", dst + cap));
      rows.append(row);
    });
    out.append(rows);

    out.append(el("div", "pl-legend",
      `<span><b class="pl-cl">cluster</b> moves to the end</span>` +
      `<span><b class="pl-rest">remainder</b> becomes the new front</span>` +
      `<span><b class="pl-suf">suffix</b> — "way" after a vowel, "ay" after a cluster</span>`));
    out.append(el("div", "note",
      "A vowel-initial word keeps its spelling and only gains <code class='inl'>\"way\"</code>. " +
      "A consonant-initial word hands its whole cluster to the back — and if the word was capitalised, " +
      "the capital does <b>not</b> go with the cluster. It marked the start of the word, so it stays at the " +
      "start: the relocated cluster is lowercased and the new first letter is raised."));
  }
}

// ── STEP — one frame, the loop written out ───────────────────────────────────
// The map() in the solution is unrolled into an explicit for..of here so each
// word's locals (cluster, rest, moved, capped) live in a scope the panel can
// show entering and leaving. Traced cases are CASES[0..4] plus CASES[6]; the
// nine-word official sentence (CASES[5]) is deliberately NOT traced — it would
// run past fifty steps for no new branch. It remains fully reachable in the
// demo, both as a preset chip and by typing it into the free text field.
const STEP_CASES = [CASES[0], CASES[1], CASES[2], CASES[3], CASES[4], CASES[6]];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">pigLatin</span>(<span class="tok" data-t="str">str</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="words">words = str.<span class="fn">split</span>(<span class="st">" "</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="outinit">out = []</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="word">word</span> <span class="k">of</span> words) {` },
  { ln: 5,  html: `    <span class="k">const</span> <span class="tok" data-t="cluster">cluster = word.<span class="fn">match</span>(<span class="st">/^[^aeiou]+/i</span>)?.[<span class="st">0</span>] ?? <span class="st">""</span></span>;` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="isvowel">cluster === <span class="st">""</span></span>) { out.<span class="fn">push</span>(word + <span class="st">"way"</span>); <span class="k">continue</span>; }` },
  { ln: 7,  html: `    <span class="k">const</span> <span class="tok" data-t="rest">rest = word.<span class="fn">slice</span>(cluster.length)</span>;` },
  { ln: 8,  html: `    <span class="k">const</span> <span class="tok" data-t="moved">moved = rest + cluster.<span class="fn">toLowerCase</span>() + <span class="st">"ay"</span></span>;` },
  { ln: 9,  html: `    <span class="k">const</span> <span class="tok" data-t="capped">capped = <span class="st">/[A-Z]/</span>.<span class="fn">test</span>(word[<span class="st">0</span>])</span>;` },
  { ln: 10, html: `    out.<span class="fn">push</span>(<span class="tok" data-t="push">capped ? moved[<span class="st">0</span>].<span class="fn">toUpperCase</span>() + moved.<span class="fn">slice</span>(<span class="st">1</span>) : moved</span>);` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="join">out.<span class="fn">join</span>(<span class="st">" "</span>)</span>;` },
  { ln: 13, html: `}` },
];

// The first letter the regex refused to eat — cited in the line-5 note so the
// "why did the cluster stop there" question is answered with the actual char.
const rest0 = (word, cluster) => word[cluster.length] ?? "(end of word)";

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const str = STEP_CASES[k - 1];
  const steps = [];

  const words = str.split(" ");
  const out = [];
  let word, cluster, rest, moved, capped;

  // Scope by omission, gated on the line that declares each name. `word` and its
  // locals belong to the loop body (lines 4–11) and are gone again on 12; each
  // local only appears once its own declaration has run, and re-entering line 4
  // for the next word clears them all because 4 sits below every gate. `x.exit`
  // is the one step that sits ON line 4 with the loop already finished — the
  // iterator is exhausted, so `word` is not bound and must not be shown.
  const S = (line, note, x = {}) => {
    const vars = { str: `"${str}"` };
    if (line >= 4 && line <= 11 && !x.exit) vars.word = `"${word}"`;
    if (line >= 5 && line <= 11) vars.cluster = `"${cluster}"`;
    if (line >= 7 && line <= 11) vars.rest = `"${rest}"`;
    if (line >= 8 && line <= 11) vars.moved = `"${moved}"`;
    if (line >= 9 && line <= 11) vars.capped = capped;
    const structs = [];
    if (line >= 2) structs.push({ label: "words", items: words.slice() });
    if (line >= 3) structs.push({ label: "out", items: out.slice(), newest: !!x.pushed });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `pigLatin("${str}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Convert <b>"${str}"</b> to Pig Latin. The rule is per-<b>word</b>, so the first job is to stop thinking about the sentence.`, { focus: "str" });
  S(2, `<b>split(" ")</b> cuts the sentence into ${words.length} word${words.length === 1 ? "" : "s"}. Every rule below applies to one word in isolation — the spaces are just re-inserted at the end, so they never have to be reasoned about again.`, { focus: "words" });
  S(3, `<b>out = []</b> collects the converted words. Building a new array instead of editing <code>words</code> keeps the original spellings around, which is what lets each step compare "before" and "after".`, { focus: "outinit" });

  for (let wi = 0; wi < words.length; wi++) {
    word = words[wi];
    cluster = rest = moved = undefined; capped = undefined;
    S(4, `Take word ${wi + 1} of ${words.length}: <b>"${word}"</b>. Its own locals start fresh — nothing from the previous word is still in scope.`, { focus: "word", changed: ["word"] });

    cluster = clusterOf(word);
    const vowelStart = cluster === "";
    S(5, vowelStart
      ? `<b>/^[^aeiou]+/</b> asks for a run of non-vowels at the very front and finds none, because <b>"${word[0]}"</b> is itself a vowel. So <b>cluster = ""</b> — there is nothing to move.`
      : `<b>/^[^aeiou]+/</b> is greedy but anchored, so it eats consonants from the front and <b>stops at the first vowel</b> — here <b>"${rest0(word, cluster)}"</b>. That's why the cluster is <b>"${cluster}"</b> and not more: ${cluster.length === word.length ? `this word has no vowel at all, so the run swallowed the whole thing` : `the very next letter is a vowel`}.`,
      { focus: "cluster", changed: ["cluster"] });

    S(6, vowelStart
      ? `The word starts with a vowel, so the "move the consonants" rule has nothing to work on. Append <b>"way"</b> to the word <b>unchanged</b> and skip the rest of the body — that is why any capital here needs no attention at all: the first letter never moved.`
      : `<b>cluster</b> is non-empty, so this word takes the consonant path. Fall through to the four lines that actually rebuild it.`,
      { focus: "isvowel", eval: { expr: `cluster ("${cluster}") === ""`, val: vowelStart } });

    if (vowelStart) {
      out.push(word + "way");
      S(6, `Push <b>"${word + "way"}"</b>. Note it kept its original capitalisation for free — nothing was rearranged, so nothing had to be re-cased.`, { focus: "isvowel", pushed: true });
      continue;
    }

    rest = word.slice(cluster.length);
    S(7, rest === ""
      ? `<b>rest</b> is everything after the cluster — and the cluster was the entire word, so <b>rest = ""</b>. The "new front" of this word will be the cluster itself, arriving back where it started.`
      : `<b>rest = "${rest}"</b> — everything after the cluster. This is the piece that is about to become the <b>front</b> of the word, which is the whole reason the capital cannot stay put.`,
      { focus: "rest", changed: ["rest"] });

    moved = rest + cluster.toLowerCase() + "ay";
    S(8, `Rebuild as <b>rest + cluster + "ay"</b> → <b>"${moved}"</b>. The cluster is <b>lowercased on the way out</b>: it is no longer the start of the word, and a capital sitting mid-word (<code class='inl'>"ig${cluster.toUpperCase()}ay"</code>) would be the wrong shape.`,
      { focus: "moved", changed: ["moved"] });

    capped = /[A-Z]/.test(word[0]);
    S(9, capped
      ? `The original <b>"${word}"</b> began with a capital <b>"${word[0]}"</b>. That capital was marking <i>where the word starts</i>, not the letter "${word[0]}" — and the start has just moved. So it has to be re-applied, not preserved in place.`
      : `<b>"${word}"</b> began lowercase, so there is no capital to re-home. <b>moved</b> is already the final answer for this word.`,
      { focus: "capped", changed: ["capped"], eval: { expr: `/[A-Z]/.test("${word[0]}")`, val: capped } });

    const final = capped ? moved[0].toUpperCase() + moved.slice(1) : moved;
    out.push(final);
    S(10, capped
      ? `Raise the new first letter: <b>"${moved[0]}"</b> → <b>"${final[0]}"</b>, giving <b>"${final}"</b>. The capital has travelled from position 0 of <b>"${word}"</b> to position 0 of the rebuilt word — which is a different <i>letter</i> at the same <i>place</i>. Uppercasing the result blindly, or forgetting line 8's lowercase, is exactly how you get <code class='inl'>"Ig${cluster.toUpperCase()}ay"</code>.`
      : `No capital to move, so push <b>"${final}"</b> as-is.`,
      { focus: "push", pushed: true });
  }

  S(4, `The loop has consumed every word — <b>out</b> now holds ${out.length} converted word${out.length === 1 ? "" : "s"}, in the original order, so the sentence can be reassembled positionally.`, { focus: "word", exit: true, eval: { expr: `more words?`, val: false } });

  const answer = out.join(" ");
  S(12, `<b>join(" ")</b> puts the spaces back. <b>Return "${answer}"</b>.`,
    { focus: "join", done: true, result: answer, ret: { value: answer } });

  return steps;
}

export default {
  n: 340, id: "pig-latin", title: "Pig Latin Converter", dates: ["2026-07-16"],
  statement: `Convert a string to Pig Latin. A word beginning with a vowel (<code class="inl">a e i o u</code>) gets <code class="inl">"way"</code> appended — <code class="inl">"universe"</code> → <b>"universeway"</b>. A word beginning with one or more consonants moves that whole leading cluster to the end and adds <code class="inl">"ay"</code> — <code class="inl">"hello"</code> → <b>"ellohay"</b>. Preserve the case of the first letter — <code class="inl">"Hello"</code> → <b>"Ellohay"</b>. <span class="rule">The catch: <code class="inl">"Pig"</code> → <b>"Igpay"</b>. The cluster <code class="inl">"P"</code> moved to the back, so the capital has to move <i>forward</i> onto the new first letter — and the relocated <code class="inl">"P"</code> has to come down to <code class="inl">"p"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass per word",
      approach: `Split on spaces and treat each word alone. One anchored regex, <code class='inl'>/^[^aeiou]+/i</code>, grabs the leading consonant run; it is greedy but stops dead at the first vowel, which is why <code class='inl'>"brown"</code> moves <b>br</b> while <code class='inl'>"quick"</code> moves only <b>q</b> — the <code class='inl'>u</code> is a vowel. Empty cluster means the word starts with a vowel: append <code class='inl'>"way"</code> and leave the spelling alone. Otherwise rebuild as <code class='inl'>rest + cluster + "ay"</code>. <b>Then fix the case.</b> A capital marks where a word <i>begins</i>, and the beginning just changed hands — so lowercase the cluster you moved to the back and uppercase the letter that inherited the front. Skip either half and <code class='inl'>"Pig"</code> comes out as <code class='inl'>"IgPay"</code>.`,
      code: `// Move the leading consonant cluster, then re-home the capital.
function pigLatin(str: string): string {
  return str.split(" ").map((word) => {
    // Anchored + greedy: eats consonants from the front, stops at the first
    // vowel. "brown" -> "br", but "quick" -> "q" because "u" is a vowel.
    const cluster = word.match(/^[^aeiou]+/i)?.[0] ?? "";

    // Vowel-initial: nothing moves, so the original casing still holds.
    if (cluster === "") return word + "way";

    // The cluster is no longer word-initial, so it must come down to lowercase.
    const moved = word.slice(cluster.length) + cluster.toLowerCase() + "ay";

    // The capital marked the START of the word, not the letter that moved --
    // so re-apply it to whichever letter is now in front.
    return /[A-Z]/.test(word[0])
      ? moved[0].toUpperCase() + moved.slice(1)
      : moved;
  }).join(" ");
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `The same transform with <code class='inl'>map</code> unrolled into a <code class='inl'>for..of</code>, so every word's locals — <code class='inl'>cluster</code>, <code class='inl'>rest</code>, <code class='inl'>moved</code>, <code class='inl'>capped</code> — enter and leave the state panel as the loop body runs. Case <b>5</b> (<code class='inl'>"Pig Latin is fun"</code>) is the one to watch: lines 8 and 10 are where the capital is taken off <code class='inl'>"P"</code> and put onto <code class='inl'>"i"</code>. Case <b>6</b> is the degenerate one — <code class='inl'>"Rhythm"</code> has no vowel, so the cluster is the whole word and <code class='inl'>rest</code> is empty. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 5, min: 1, max: STEP_CASES.length,
          presets: STEP_CASES.map((_, i) => i + 1),
          hint: `1–${STEP_CASES.length}: pick a test sentence`,
        },
      }),
    },
  ],
};
