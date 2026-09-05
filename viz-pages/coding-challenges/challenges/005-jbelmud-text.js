// #5 · Jbelmud Text — the title is its own worked example: "jumbled" → "jbelmud".
// Say it out loud before writing any code. j·belmu·d keeps the j and the d, and
// the middle "umble" has been sorted into "belmu". The challenge names its answer.
//
// One approach, and that is the honest outcome — there is no wasteful way to do
// this that isn't simply a bug. What there IS, is two places to be careful:
//
//   • THE ENDS CAN COLLIDE. slice(1, -1) is safe on any length — a 2-letter word
//     yields "" and a 3-letter word yields one letter, and both sort to
//     themselves, so neither needs a branch. But the REASSEMBLY does: for a
//     1-letter word, slice(0, 1) and slice(-1) are the same character, so
//     "i" comes back as "ii". freeCodeCamp's own case 2 catches this.
//
//   • THE BARE .sort() IS RIGHT HERE. #309 exists to teach that .sort() with no
//     comparator sorts as TEXT and mangles numbers. This problem is the mirror:
//     the statement promises lowercase letters and no punctuation, so every
//     element is a single lowercase character — and for those, lexicographic
//     order IS alphabetical order. The lesson isn't "never call .sort() bare",
//     it's "know what the default comparator does to YOUR elements".
//
// Load "almost knows best" in the demo for the case that looks like a bug: every
// middle is already in alphabetical order, so the output equals the input exactly.
import { el, esc, mountDebugger } from "../shared.js";

// ── the solution, shared by the demo and the trace ───────────────────────────
// Split one word into [first, middle, last] and sort the middle. `order` is the
// permutation the sort applies — order[j] is the ORIGINAL index of the letter
// that ends up at position j — which is what lets the demo animate each middle
// tile from where it was to where it belongs instead of just swapping the text.
function jumbleWord(w) {
  if (w.length < 2) return { w, out: w, mid: [], to: [], branch: "collide" };
  const mid = w.slice(1, -1).split("");
  // Compare by character, break ties by original index: identical to what the
  // engine's stable .sort() does to single-character strings, and it hands back
  // the mapping as a side effect.
  const order = mid.map((_, i) => i).sort((a, b) => (mid[a] < mid[b] ? -1 : mid[a] > mid[b] ? 1 : a - b));
  const to = [];                          // to[oldIndex] = newIndex
  order.forEach((oldI, j) => { to[oldI] = j; });
  const out = w.slice(0, 1) + order.map((i) => mid[i]).join("") + w.slice(-1);
  const branch = mid.length === 0 ? "nomiddle" : mid.length === 1 ? "onemiddle" : out === w ? "presorted" : "moved";
  return { w, out, mid, to, branch };
}

const jbelmu = (text) => text.split(" ").map((w) => jumbleWord(w).out).join(" ");

// Cases. 1–4 are freeCodeCamp's four official tests, in the order the grader
// lists them. 5–7 are mine, because four cases leave three branches untested:
//   5 "a is an odd oxymoron" — the short-word ladder. "a" is the length-1 word
//     where the two ends are the SAME character; "is"/"an" have an empty middle;
//     "odd" has a one-letter middle. Nothing to sort in any of them, and
//     "oxymoron" is the payoff — an 8-letter word whose middle carries a
//     duplicate 'o', so the stability of the sort is visible.
//   6 "almost knows best" — every middle is ALREADY alphabetical, so the output
//     is byte-identical to the input. This is the case that reads as a broken
//     demo, and seeing it named is the point of shipping it.
//   7 "jumbled" — the title itself, and the degenerate sentence: no spaces at
//     all, so split(" ") returns a single word.
const CASES = [
  "hello world",
  "i love jumbled text",
  "freecodecamp is my favorite place to learn to code",
  "the quick brown fox jumps over the lazy dog",
  "a is an odd oxymoron",
  "almost knows best",
  "jumbled",
];

// Tile geometry lives in ONE place, because the animation is arithmetic on it:
// a middle letter moving from index i to index j slides (j − i) × STRIDE px.
const TILE = 26, GAP = 6, STRIDE = TILE + GAP;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .jbl-out { font:800 19px var(--mono); color:var(--good); line-height:1.5; word-break:break-word; }
    .jbl-words { display:flex; flex-direction:column; gap:9px; margin-top:16px; }
    .jbl-w { display:grid; grid-template-columns:minmax(110px,auto) 1fr; align-items:center; gap:12px;
             border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:8px 11px; }
    /* The branch note is a third child of a two-column grid, so without this it
       lands in column 1 and its text inflates that track — which shoves the
       tiles to the far right and makes rows disagree with each other. */
    .jbl-w > .note { grid-column:1 / -1; margin:2px 0 0; }
    .jbl-src { font:700 13px var(--mono); color:var(--muted); letter-spacing:.02em; }
    .jbl-right { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .jbl-tiles { display:flex; gap:${GAP}px; }
    .jbl-t { width:${TILE}px; height:30px; display:flex; align-items:center; justify-content:center;
             font:800 14px var(--mono); border-radius:6px; border:1px solid var(--border);
             background:var(--panel); color:var(--text);
             transition:transform .55s cubic-bezier(.22,1,.36,1); }
    .jbl-t.pin { border-color:var(--accent); color:var(--accent);
                 box-shadow:0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
    .jbl-t.mid { border-color:color-mix(in srgb, var(--warn) 55%, var(--border)); color:var(--warn); }
    .jbl-t.stay { border-color:var(--border); color:var(--muted); }
    .jbl-pinrow { display:flex; gap:${GAP}px; margin-top:3px; height:9px; }
    .jbl-pinmark { width:${TILE}px; text-align:center; font:700 8px var(--sans); color:var(--accent);
                   letter-spacing:.08em; }
    .jbl-why { font:600 10.5px var(--sans); letter-spacing:.04em; text-transform:uppercase; color:var(--muted);
               border:1px dashed var(--border); border-radius:999px; padding:2px 9px; }
    .jbl-why.same { color:var(--c3); border-color:color-mix(in srgb, var(--c3) 55%, var(--border)); }
    .jbl-why.trap { color:var(--danger); border-color:color-mix(in srgb, var(--danger) 55%, var(--border)); }
    .jbl-legend { display:flex; gap:16px; flex-wrap:wrap; margin-top:14px; font:600 11.5px var(--sans); color:var(--muted); }
    .jbl-legend b { font:800 12px var(--mono); }
    .jbl-legend .pin { color:var(--accent); }
    .jbl-legend .mid { color:var(--warn); }
    .jbl-warn { border-left-color:var(--warn); color:var(--warn); }
  `));
}

// Why did this word come out the way it did? Named, not just shown — three of
// the five branches produce output identical to the input, and a demo that
// doesn't say WHY looks broken on all three.
const WHY = {
  collide: { cls: "trap", text: "1 letter — both ends", note: "the guard: <code class='inl'>slice(0,1)</code> and <code class='inl'>slice(-1)</code> would return the <b>same</b> character, so rebuilding this word would print it twice" },
  nomiddle: { cls: "same", text: "no middle", note: "the two ends are the whole word, so <code class='inl'>slice(1,-1)</code> is empty — nothing to sort" },
  onemiddle: { cls: "same", text: "middle is 1 letter", note: "a single letter is already sorted; no branch needed, the general path handles it" },
  presorted: { cls: "same", text: "already sorted", note: "the middle was <b>already</b> alphabetical, so the sort is a no-op and the word comes out unchanged — correct, not broken" },
  moved: { cls: "", text: "middle sorted", note: "" },
};

function mount(host) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "jumbled"; inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "lowercase sentence"), inp);

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.length > 26 ? c.slice(0, 24) + "…" : c));
    chip.title = c;
    chip.onclick = () => { inp.value = c; render(); };
    pre.append(chip);
  });
  const replay = el("button", "chip", "↻ replay");
  replay.onclick = () => render();
  pre.append(replay);

  const out = el("div");
  host.append(
    el("div", "note", "Type a sentence, or load an official case. Each word becomes a row of letter tiles: the <b>first and last are pinned</b> and never move, and the middle tiles slide into alphabetical order. Watch the pins stay put."),
    ctl, pre, out,
  );
  inp.oninput = render;
  render();

  function render() {
    // Collapse whitespace first. Two spaces would split into an empty word,
    // which the real function passes through untouched (length < 2) — correct,
    // but it renders as an empty tile row, which is an artefact of a half-typed
    // sentence rather than anything about the algorithm.
    const str = inp.value.trim().replace(/\s+/g, " ");
    out.innerHTML = "";
    if (!str) { out.append(el("div", "muted", "Type something above.")); return; }

    const words = str.split(" ");
    out.append(el("div", "result-line",
      `<span class="tag">jbelmu →</span><span class="jbl-out">${esc(jbelmu(str))}</span>`));

    const rows = el("div", "jbl-words");
    const animate = [];
    words.forEach((word) => {
      const r = jumbleWord(word);
      const w = WHY[r.branch];
      const row = el("div", "jbl-w");
      row.append(el("div", "jbl-src", esc(word) + (r.out === word ? "" : ` → ${esc(r.out)}`)));

      const right = el("div", "jbl-right");
      const tiles = el("div", "jbl-tiles");
      const marks = el("div", "jbl-pinrow");
      [...word].forEach((ch, i) => {
        const isEnd = word.length >= 2 && (i === 0 || i === word.length - 1);
        // A 1-letter word is a single tile that is BOTH ends — mark it as the
        // collision it is rather than pretending it is an ordinary pin.
        const isLone = word.length < 2;
        const midI = i - 1;
        const moved = !isEnd && !isLone && r.to[midI] !== midI;
        const t = el("div", "jbl-t " + (isEnd || isLone ? "pin" : moved ? "mid" : "stay"), esc(ch));
        t.style.transform = "translateX(0)";
        if (!isEnd && !isLone) animate.push([t, (r.to[midI] - midI) * STRIDE]);
        tiles.append(t);
        marks.append(el("div", "jbl-pinmark", isLone ? "BOTH" : isEnd ? "PIN" : ""));
      });
      const col = el("div"); col.append(tiles, marks);
      right.append(col);
      right.append(el("div", "jbl-why " + w.cls, esc(w.text)));
      row.append(right);
      if (w.note) row.append(el("div", "note", `<b>${esc(word)}</b> — ${w.note}.`));
      rows.append(row);
    });
    out.append(rows);

    // FLIP-lite: the tiles are laid out in ORIGINAL order, then on the next
    // frame every middle tile is told where it belongs. Same-width tiles mean
    // the offset is pure arithmetic — (newIndex − oldIndex) × STRIDE — so no
    // measuring is needed, and the pinned tiles are simply never told to move.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      animate.forEach(([t, dx]) => { t.style.transform = `translateX(${dx}px)`; });
    }));

    out.append(el("div", "jbl-legend",
      `<span><b class="pin">first / last</b> pinned — never move</span>` +
      `<span><b class="mid">middle</b> slides into alphabetical order</span>` +
      `<span><b>grey</b> middle tile was already in the right place</span>`));

    if (/[^a-z ]/.test(str)) {
      out.append(el("div", "note jbl-warn",
        "That input isn't plain lowercase letters. The challenge <b>promises</b> it will be, and that promise is exactly what makes the bare " +
        "<code class='inl'>.sort()</code> correct — a capital sorts before <i>every</i> lowercase letter (<code class='inl'>\"Z\" &lt; \"a\"</code>), " +
        "and a digit before both. Break the promise and you'd need a comparator, which is #309's lesson arriving from the other side."));
    }
  }
}

// ── STEP — one frame, map() unrolled into a for..of ──────────────────────────
// The solution's map() is written out as a loop so each word's locals (middle,
// sorted) visibly enter and leave scope in the state panel — that per-word scope
// is the whole shape of the problem, and a chained one-liner hides it.
//
// Traced cases are CASES[0], [1], [4], [5] and [6]. The two long official
// sentences (CASES[2], nine words; CASES[3], nine words) are deliberately NOT
// traced — they run past fifty steps and land on no branch the shorter cases
// miss. Both stay fully reachable in the demo, as preset chips and by typing.
const STEP_CASES = [CASES[0], CASES[1], CASES[4], CASES[5], CASES[6]];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">jbelmu</span>(<span class="tok" data-t="text">text</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="split">words = text.<span class="fn">split</span>(<span class="st">" "</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="outinit">out = []</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="word">w</span> <span class="k">of</span> words) {` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="guard">w.length &lt; <span class="st">2</span></span>) { out.<span class="fn">push</span>(w); <span class="k">continue</span>; }` },
  { ln: 6,  html: `    <span class="k">const</span> <span class="tok" data-t="middle">middle = w.<span class="fn">slice</span>(<span class="st">1</span>, -<span class="st">1</span>)</span>;` },
  { ln: 7,  html: `    <span class="k">const</span> <span class="tok" data-t="sorted">sorted = middle.<span class="fn">split</span>(<span class="st">""</span>).<span class="fn">sort</span>().<span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 8,  html: `    out.<span class="fn">push</span>(<span class="tok" data-t="push">w.<span class="fn">slice</span>(<span class="st">0</span>, <span class="st">1</span>) + sorted + w.<span class="fn">slice</span>(-<span class="st">1</span>)</span>);` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="join">out.<span class="fn">join</span>(<span class="st">" "</span>)</span>;` },
  { ln: 11, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const str = STEP_CASES[k - 1];
  const steps = [];

  const words = str.split(" ");
  const out = [];
  let w, middle, sorted;

  // Scope by omission, gated on the declaring line. `w` belongs to the loop body
  // (4–8) and `middle`/`sorted` to the lines that declare them, so re-entering
  // line 4 for the next word wipes all three — which is the truth: they are
  // re-declared per iteration. `x.exit` is the one step sitting ON line 4 with
  // the iterator exhausted, where `w` is no longer bound at all. The two structs
  // follow the same rule: `words` appears once line 2 runs and `out` once line 3
  // does, and both then stay for the rest of the call because both are still live.
  const S = (line, note, x = {}) => {
    const vars = { text: `"${str}"` };
    if (line >= 4 && line <= 8 && !x.exit) vars.w = `"${w}"`;
    if (line >= 6 && line <= 8) vars.middle = `"${middle}"`;
    if (line >= 7 && line <= 8) vars.sorted = `"${sorted}"`;
    const structs = [];
    if (line >= 2) structs.push({ label: "words", items: words.slice() });
    if (line >= 3) structs.push({ label: "out", items: out.slice(), newest: !!x.pushed });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `jbelmu("${str}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Jumble <b>"${str}"</b>. The rule is stated per-<b>word</b> — first and last stay, the middle sorts — so the sentence itself is never the unit of work. <b>"jumbled" → "jbelmud"</b> is the whole problem in one word, and it is the challenge's own title.`, { focus: "text" });
  S(2, `<b>split(" ")</b> cuts the sentence into ${words.length} word${words.length === 1 ? "" : "s"}. Doing this first is what lets every rule below be about a single word: the spaces are put back untouched at the end, so word boundaries never have to be reasoned about again.`, { focus: "split" });
  S(3, `<b>out = []</b> collects the rebuilt words. Building a new array rather than editing <code>words</code> in place keeps the originals around, which is what makes each "before → after" comparison below possible.`, { focus: "outinit" });

  for (let i = 0; i < words.length; i++) {
    w = words[i];
    middle = sorted = undefined;
    S(4, `Word ${i + 1} of ${words.length}: <b>"${w}"</b>. Its locals start empty — nothing from the previous word survives into this iteration.`, { focus: "word", changed: ["w"] });

    const short = w.length < 2;
    S(5, short
      ? `<b>"${w}"</b> has ${w.length} letter${w.length === 1 ? "" : "s"}, so it has no <i>two</i> ends. This guard is the one branch the problem genuinely needs: <code class='inl'>slice(0,1)</code> and <code class='inl'>slice(-1)</code> would both return <b>"${w}"</b>, and line 8 would concatenate them into <b>"${w + w}"</b>. Return the word untouched instead.`
      : `<b>"${w}"</b> has ${w.length} letters, so its first and last are different characters and the reassembly on line 8 is safe. Note the guard is <b>only</b> about length ${w.length < 4 ? "— a " + w.length + "-letter word still takes the normal path below, because it has to" : "1 and 0"}; nothing shorter than 4 letters needs a special case beyond this.`,
      { focus: "guard", eval: { expr: `"${w}".length (${w.length}) < 2`, val: short } });

    if (short) {
      out.push(w);
      S(5, `Push <b>"${w}"</b> unchanged. freeCodeCamp's second official case is <code class='inl'>"i love jumbled text"</code> precisely because of this word — drop the guard and it grades as <code class='inl'>"ii love …"</code>.`, { focus: "guard", pushed: true });
      continue;
    }

    middle = w.slice(1, -1);
    S(6, middle === ""
      ? `<b>slice(1, -1)</b> asks for everything between the ends, and on a 2-letter word there is nothing between them — <b>middle = ""</b>. No branch was needed to discover that: <code class='inl'>slice</code> clamps rather than throwing, so the empty middle falls out of the general path.`
      : middle.length === 1
        ? `<b>middle = "${middle}"</b> — a single letter, because the two ends already claim ${w.length - 1} of the ${w.length}. It is trivially in sorted order, which is why a 3-letter word needs no special case either.`
        : `<b>middle = "${middle}"</b> — the ${middle.length} letters the ends do not claim. This is the <i>only</i> part of the word that is allowed to move; <b>"${w[0]}"</b> and <b>"${w[w.length - 1]}"</b> are now spoken for.`,
      { focus: "middle", changed: ["middle"] });

    sorted = middle.split("").sort().join("");
    S(7, middle.length < 2
      ? `Sorting ${middle === "" ? "nothing" : "one letter"} gives <b>"${sorted}"</b> back. Worth watching anyway: <code class='inl'>.sort()</code> here is called with <b>no comparator</b>, and that is deliberate.`
      : sorted === middle
        ? `<b>"${middle}"</b> sorts to <b>"${sorted}"</b> — <i>identical</i>, because it was already alphabetical. This is the outcome that reads like a broken program and isn't. And note the bare <code class='inl'>.sort()</code>: with no comparator it compares elements <b>as text</b>, but every element here is a single lowercase letter, so text order and alphabetical order are the same order.`
        : `<b>"${middle}"</b> → <b>"${sorted}"</b>. The call is <code class='inl'>.sort()</code> with <b>no comparator</b>, which is the exact call that silently ruins <b>#309</b>'s numbers — it stringifies and compares lexicographically. Here that is precisely what is wanted: the statement promises lowercase letters and no punctuation, so every element is one lowercase character, and for those lexicographic <b>is</b> alphabetical. Knowing what the default does to <i>your</i> elements is the lesson, not avoiding it.`,
      { focus: "sorted", changed: ["sorted"] });

    const rebuilt = w.slice(0, 1) + sorted + w.slice(-1);
    out.push(rebuilt);
    S(8, rebuilt === w
      ? `Reassemble <b>"${w[0]}" + "${sorted}" + "${w[w.length - 1]}"</b> → <b>"${rebuilt}"</b>, the same string we started with. Nothing went wrong: the ends were pinned and the middle was already in order, so there was no work left to do.`
      : `Reassemble as <b>first + sorted middle + last</b> → <b>"${rebuilt}"</b>. Both ends are taken from <b>"${w}"</b> by position, not carried along with any letter — <b>"${w[0]}"</b> is still at index 0 and <b>"${w[w.length - 1]}"</b> is still last, which is the invariant the whole problem is built on.`,
      { focus: "push", pushed: true });
  }

  S(4, `Every word has been consumed. <b>out</b> holds ${out.length} word${out.length === 1 ? "" : "s"} in the original order — the transform never reorders words, only letters inside them, so the sentence can be reassembled positionally.`, { focus: "word", exit: true, eval: { expr: `more words?`, val: false } });

  const answer = out.join(" ");
  S(10, `<b>join(" ")</b> puts the single spaces back. <b>Return "${answer}"</b>.`,
    { focus: "join", done: true, result: answer, ret: { value: answer } });

  return steps;
}

export default {
  n: 5, id: "jbelmu", title: "Jbelmud Text", dates: ["2025-08-15"],
  statement: `Return a jumbled version of a string, transforming each word so that <b>the first and last letters stay in place</b> and <b>every letter between them is sorted alphabetically</b>. The input is entirely lowercase and contains no punctuation. <span class="rule">The title is the worked example: <code class="inl">"jumbled"</code> keeps its <b>j</b> and its <b>d</b>, and the middle <code class="inl">umble</code> sorts to <code class="inl">belmu</code> — <b>"jbelmud"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n log n) — one sort per word",
      approach: `Split on spaces and rewrite each word alone. <code class='inl'>slice(1, -1)</code> is the middle, and it needs <b>no</b> length branch: <code class='inl'>slice</code> clamps, so a 2-letter word yields <code class='inl'>""</code> and a 3-letter word yields one letter, and both sort to themselves. <b>The reassembly is where the branch lives.</b> On a 1-letter word <code class='inl'>slice(0, 1)</code> and <code class='inl'>slice(-1)</code> return the <i>same</i> character, so <code class='inl'>"i"</code> would be rebuilt as <code class='inl'>"ii"</code> — hence the <code class='inl'>w.length &lt; 2</code> guard, which freeCodeCamp's second case tests directly. <b>And the bare <code class='inl'>.sort()</code> is correct.</b> <b>#309</b> teaches that the default comparator sorts as text and mangles numbers; here the statement promises lowercase letters, so every element is a single lowercase character and text order <i>is</i> alphabetical order. The rule isn't "always pass a comparator" — it's "know what the default does to the elements you actually have".`,
      code: `// "jumbled" -> "jbelmud": pin the ends, sort what is between them.
function jbelmu(text: string): string {
  return text.split(" ").map((w) => {
    // Fewer than two letters means there are no two DISTINCT ends: for "i",
    // slice(0, 1) and slice(-1) are the same character, so rebuilding would
    // emit it twice ("ii"). Hand those words back untouched.
    if (w.length < 2) return w;

    // The middle is every letter the ends do not claim. slice clamps, so a
    // 2-letter word yields "" and a 3-letter word yields one letter -- both
    // sort to themselves, which is why they need no special case.
    const middle = w.slice(1, -1);

    // A bare .sort() is CORRECT here: every element is one lowercase letter,
    // so the default string comparison IS alphabetical order. (Contrast #309,
    // where the same call silently mangles numbers.)
    const sorted = middle.split("").sort().join("");

    return w.slice(0, 1) + sorted + w.slice(-1);
  }).join(" ");
}`,
      mount,
    },
    {
      name: "Step through", cost: "per-word scope",
      approach: `The same transform with <code class='inl'>map</code> unrolled into a <code class='inl'>for..of</code>, so <code class='inl'>middle</code> and <code class='inl'>sorted</code> enter and leave the state panel once per word — the per-word scope <i>is</i> the shape of the problem. Case <b>2</b> (<code class='inl'>"i love jumbled text"</code>) is the one to watch: line 5 fires on <code class='inl'>"i"</code>, and line 7 turns <code class='inl'>"umble"</code> into <code class='inl'>"belmu"</code>. Case <b>3</b> walks the short-word ladder — 1, 2 and 3 letters — and case <b>4</b> is the one that looks broken: every middle is already alphabetical, so the return value equals the input. The two nine-word official sentences aren't traced; they're on the <b>Solution</b> tab's chips. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 2, min: 1, max: STEP_CASES.length,
          presets: STEP_CASES.map((_, i) => i + 1),
          hint: `1–${STEP_CASES.length}: pick a test sentence`,
        },
      }),
    },
  ],
};
