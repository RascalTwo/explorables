// #35 · Word Frequency — the tie-break nobody wrote down is insertion order.
// "Three most frequent" is a tally: collapse the paragraph into a word→count map,
// rank by count, take three. The counting is the easy half. The half the statement
// never mentions is what happens when counts are EQUAL — and on the official test
// "I like coding. I like testing. I love debugging!" four words are tied at 1 while
// only one of them may have the third slot. The grader wants `coding`, and `coding`
// wins for one reason: it was seen first. Two language guarantees make that fall
// out for free — a Map iterates in INSERTION ORDER, and Array.prototype.sort has
// been required to be STABLE since ES2019. So the correct solution leans on a rule
// the problem never states, and the official set CANNOT CATCH IT — twice over.
// Case 1's top three are 4, 3 and 2: no tie reaches its cut, so stability cannot
// change its answer on ANY engine. Cases 2 and 3 genuinely do depend on it (case 3
// ranks debug:4 before test:4, and an unstable sort returning ["test","debug",
// "deploy"] fails deepEqual) — but their tallies are 6 and 3 entries, far inside
// the *stable* insertion-sort fall-back V8's pre-TimSort QuickSort used on short
// arrays (TimSort landed in V8 v7.0 / Chrome 70). So no official case can tell a
// stable sort from an unstable one, and that holds wherever you put the engine's
// exact boundary. The dependency is real and invisible to the grader: ours to
// point out, not the challenge's. Case 6 is ours — ELEVEN distinct words, clear
// of the fall-back and tied at the cut, the only input here where an unstable
// sort could ever have shown up. The demo boxes the tied group at the cut line and
// labels it, so you can watch position 3 get decided by first appearance rather
// than by count — edit the paragraph and push a word across the line, or add an
// eleventh distinct word and watch the threshold flag light up.
// ONE approach, deliberately: a "top-3 podium instead of a
// full sort" variant is a constant factor on paragraph-sized input and is easy to
// get subtly wrong on ties, which is the opposite of what this module teaches.
import { el, esc, mountDebugger } from "../shared.js";

// Provenance — the 3 official freeCodeCamp cases first, in the grader's order,
// then two of ours. Each lands on a different tie situation:
//   1 official — counts 4 / 3 / 2, nothing tied anywhere near the cut. The easy
//     shape, and the reason a wrong tie-break survives casual testing.
//   2 official — i:3, like:2, then coding / testing / love / debugging ALL tied at
//     1. Three of the four lose the last slot purely on first appearance.
//   3 official — debug:4 and test:4 are tied, but both are inside the top three, so
//     stability decides their ORDER and not who makes the cut. Worth contrasting.
//   4 ours — merge:3, then rebase / squash / revert / stash all tied at 2, so the
//     tie band spans slots TWO AND THREE: two winners, two losers, and the only
//     thing separating them is where they first appeared.
//   5 ours — only two distinct words, so "the three most frequent" has no third.
//     The statement never says what to do; slice(0, 3) just returns what there is.
//   6 ours — ELEVEN distinct words with nine of them tied at 1, and the only input
//     here big enough to clear V8's old short-array insertion-sort fall-back. Every
//     other case is either untouched by stability (1 and 5 have no tie at the cut)
//     or small enough that a pre-TimSort engine sorted it stably anyway (2, 3, 4).
//     So this is the one input where the guarantee the solution leans on could
//     actually have been violated — and the official set cannot reach it.
const OFFICIAL = [
  "Coding in Python is fun because coding Python allows for coding in Python easily while coding",
  "I like coding. I like testing. I love debugging!",
  "Debug, test, deploy. Debug, debug, test, deploy. Debug, test, test, deploy!",
];
const CASES = [
  ...OFFICIAL,
  "Merge, merge, merge! Rebase, rebase. Squash, squash. Revert, revert. Stash, stash.",
  "Works. Works! Works, sometimes.",
  "Ship, ship, ship! Test, test. Build, lint, type, audit, sign, tag, draft, publish, announce.",
];

// V8's pre-TimSort Array#sort was "a Quicksort with an Insertion Sort fall-back for
// shorter arrays (length < 10)", and the fall-back "was also used when Quicksort
// recursion reached a sub-array length of 10" — so a ten-element array is stably
// sorted either way, and only something LARGER than 10 can reach the unstable path.
// TimSort arrived in V8 v7.0 / Chrome 70; ES2019 made stability mandatory.
// Quotes and both clauses: https://v8.dev/blog/array-sort · https://v8.dev/features/stable-sort
// Don't lean on this number harder than it deserves — the module's argument that the
// official set can't detect stability holds without it (see `stabilityMatters`).
const V8_INSERTION_FALLBACK = 10;

// Short labels for the preset chips — the paragraphs themselves are far too long
// to sit on a button, and a chip that says what the case TEACHES beats one that
// says the first six words of it.
const CHIP = [
  "official · no tie at the cut",
  "official · 4-way tie for slot 3",
  "official · tie inside the top 3",
  "ours · tie spans slots 2 and 3",
  "ours · only 2 distinct words",
  "ours · 11 distinct — past the old V8 fallback",
];

// The whole solution, plus the bookkeeping the demo needs to explain itself.
// `firstAt` is the tie-break made visible: the 1-based token index where each word
// was first seen, which is exactly the order a Map hands its entries back in.
function analyze(paragraph) {
  const text = paragraph.toLowerCase().replace(/[,.!]/g, "");
  const words = text.split(/\s+/).filter(Boolean);
  const counts = new Map();
  const firstAt = new Map();
  words.forEach((w, i) => {
    if (!counts.has(w)) firstAt.set(w, i + 1);
    counts.set(w, (counts.get(w) || 0) + 1);
  });
  // The sort is stable and the spread preserves insertion order, so `ranked` is
  // "by count, then by first appearance" without a word of code saying so.
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const answer = ranked.slice(0, 3).map(([w]) => w);

  // The cut line sits after rank 3. The band is every word sharing the third
  // place's count; it is "contested" when at least one member falls outside the
  // top three, which is the only situation where stability changes the ANSWER.
  const cut = ranked.length > 3 ? ranked[2][1] : null;
  const band = cut === null ? [] : ranked.filter(([, n]) => n === cut);
  const contested = band.length > 1 && ranked[3][1] === cut;
  const winners = contested ? band.filter(([w]) => answer.includes(w)) : [];
  const losers = contested ? band.filter(([w]) => !answer.includes(w)) : [];
  // A tie entirely inside the podium reorders the answer without changing it.
  const innerTie = ranked.slice(0, 3).some((e, i) => i > 0 && e[1] === ranked[i - 1][1]);
  // Two independent reasons an input can be blind to sort stability, and the first
  // one needs no engine trivia at all: if no tie touches the answer, every sorting
  // algorithm returns the same array. Only when one does is the length worth asking
  // about — and only a tally LARGER than the fall-back could ever have gone unstable.
  const stabilityMatters = contested || innerTie;
  const overFallback = counts.size > V8_INSERTION_FALLBACK;

  return { text, words, counts, firstAt, ranked, answer, cut, band, contested, winners, losers, innerTie, stabilityMatters, overFallback };
}

// Punctuation the statement does NOT list. The spec enumerates , . and ! — so a
// broad /[^\w\s]/ would over-reach, and anything else the user types stays glued
// to its word. Naming the actual characters beats saying "some punctuation".
const strays = (p) => [...new Set(p.match(/[^\p{L}\p{N}\s,.!]/gu) || [])];

const fmtArr = (a) => `[${a.map((w) => `"${w}"`).join(", ")}]`;
const clip = (s, n = 30) => `"${s.length > n ? s.slice(0, n - 1) + "…" : s}"`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .wf-wrap { display:flex; flex-direction:column; gap:12px; }
    .wf-ta { width:100%; box-sizing:border-box; min-height:74px; resize:vertical;
             font:13px/1.6 var(--mono); color:var(--text); background:var(--panel-2);
             border:1px solid var(--border); border-radius:8px; padding:8px 10px; }
    .wf-ta:focus { outline:none; border-color:var(--accent); }
    .wf-toks { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
    .wf-tok { font:600 12px var(--mono); padding:3px 7px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .wf-tok.top { border-color:var(--good); color:var(--good); }
    .wf-stray { font:12px var(--sans); color:var(--warn); padding:5px 10px; border-radius:8px; border:1px dashed var(--warn); }
    .wf-stray b { font-family:var(--mono); color:var(--text); }
    .wf-thresh { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .wf-thresh b { font-family:var(--mono); color:var(--text); }
    .wf-thresh.over { color:var(--accent); border-color:var(--accent); border-style:solid; background:color-mix(in srgb, var(--accent) 10%, transparent); }
    .wf-thresh.over b { color:var(--accent); }
    .wf-chart { display:flex; flex-direction:column; gap:3px; }
    .wf-bar { display:grid; grid-template-columns:26px 104px 1fr 30px 86px; align-items:center; gap:8px; padding:4px 8px; border:1px solid transparent; border-radius:7px; }
    .wf-bar .rk { font:11px var(--mono); color:var(--muted); }
    .wf-bar .w { font:700 13px var(--mono); color:var(--muted); overflow:hidden; text-overflow:ellipsis; }
    .wf-bar .track { height:12px; border-radius:4px; background:color-mix(in srgb, var(--border) 60%, transparent); }
    .wf-bar .fill { height:12px; border-radius:4px; background:color-mix(in srgb, var(--muted) 45%, transparent); }
    .wf-bar .ct { font:700 13px var(--mono); color:var(--muted); text-align:right; font-variant-numeric:tabular-nums; }
    .wf-bar .fs { font:11px var(--mono); color:var(--muted); text-align:right; }
    .wf-bar.win { background:color-mix(in srgb, var(--good) 10%, transparent); }
    .wf-bar.win .w, .wf-bar.win .ct { color:var(--good); }
    .wf-bar.win .fill { background:var(--good); }
    .wf-band { display:flex; flex-direction:column; gap:3px; padding:3px; border:1px dashed var(--warn); border-radius:9px; background:color-mix(in srgb, var(--warn) 8%, transparent); }
    .wf-band-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--warn); padding:3px 7px 1px; }
    .wf-cut { display:flex; align-items:center; gap:8px; padding:1px 8px; font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--danger); }
    .wf-cut .ln { flex:1; border-top:1px dashed var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  const ta = el("textarea", "wf-ta");
  ta.value = CASES[1];
  ta.spellcheck = false;
  const lab = el("div", "controls");
  lab.append(el("span", "ctl-label", "paragraph"));
  const pre = el("div", "controls");
  // Chips are built off CASES, so a case added there can never go unreachable.
  CASES.forEach((v, i) => {
    const c = el("button", "chip", CHIP[i]);
    c.title = v;
    c.onclick = () => { ta.value = v; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(lab, ta, pre, out);
  ta.oninput = render;
  render();

  function render() {
    const p = String(ta.value);
    const a = analyze(p);
    const top = new Set(a.answer);
    out.innerHTML = "";
    const wrap = el("div", "wf-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${a.answer.length === 3 ? "ok" : "no"}">getWords(…) → ${esc(fmtArr(a.answer))}</span>` +
      `<span class="more">${a.words.length} token${a.words.length === 1 ? "" : "s"} · ${a.counts.size} distinct</span>`));

    // The normalised stream, because every later number is computed from THIS and
    // not from what the user typed. Top-three words are tinted wherever they occur.
    const toks = el("div", "wf-toks");
    if (!a.words.length) toks.append(el("span", "muted", "(no words — the normalised paragraph is empty)"));
    a.words.forEach((w) => toks.append(el("span", "wf-tok" + (top.has(w) ? " top" : ""), esc(w))));
    wrap.append(toks);

    const odd = strays(p);
    if (odd.length)
      wrap.append(el("div", "wf-stray",
        `Left alone: ${odd.map((c) => `<b>${esc(c)}</b>`).join(" ")} — the statement enumerates <b>,</b> <b>.</b> and <b>!</b> and nothing else, so these stay glued to their word. A broad <code class='inl'>/[^\\w\\s]/g</code> would have stripped them, which is more than the spec asked for.`));

    // The one input property that decides whether the stability guarantee is doing
    // observable work, so it gets its own line rather than a clause in the prose.
    if (a.counts.size)
      wrap.append(el("div", "wf-thresh" + (a.stabilityMatters && a.overFallback ? " over" : ""),
        !a.stabilityMatters
          ? `<b>No tie touches the answer</b> — the top ${Math.min(3, a.ranked.length)} counts are all distinct, so <i>every</i> sorting algorithm returns this same array and stability cannot change it. This input proves nothing about the sort, whatever engine runs it.`
          : a.overFallback
            ? `Stability decides this answer, and at <b>${a.counts.size}</b> entries the ranking is <b>past</b> V8's old short-array insertion-sort fall-back — so a pre-ES2019 engine really could have returned something else. No official case gets here.`
            : `Stability decides this answer, but at <b>${a.counts.size}</b> entries the ranking is small enough that V8's pre-TimSort sort took its <i>stable</i> insertion-sort path anyway. A 2018 engine agreed, so the guarantee is invisible on this input.`));

    if (a.ranked.length) wrap.append(chart(a));
    wrap.append(el("div", "note", noteFor(a)));
    out.append(wrap);
  }
}

// Bars in ranked order, with the cut line drawn after rank 3 and the tied group
// boxed — so "position 3 was decided by insertion order" is a thing you can see
// rather than a thing you have to be told.
function chart(a) {
  const max = a.ranked[0][1];
  // Never truncate mid-band — a boxed tie group that runs off the bottom of the
  // chart is the one thing this view exists to show. The band is contiguous (the
  // ranking is sorted), so its last member is the LAST entry carrying the cut
  // count — searching for the first entry that differs finds rank #1, not the end.
  const after = a.contested ? a.ranked.findLastIndex(([, n]) => n === a.cut) + 1 : 0;
  const limit = Math.max(9, after);
  const shown = a.ranked.slice(0, limit);
  const box = el("div", "wf-chart");
  let group = box;

  shown.forEach(([w, n], i) => {
    const inBand = a.contested && n === a.cut;
    if (inBand && group === box) {
      group = el("div", "wf-band");
      group.append(el("div", "wf-band-lbl",
        `${a.band.length} words tied at ${a.cut} — only the first ${a.winners.length} fit`));
      box.append(group);
    } else if (!inBand && group !== box) {
      group = box;
    }
    const pct = Math.round((n / max) * 100);
    group.append(el("div", "wf-bar" + (i < 3 ? " win" : ""),
      `<span class="rk">#${i + 1}</span><span class="w">${esc(w)}</span>` +
      `<span class="track"><span class="fill" style="display:block;width:${pct}%"></span></span>` +
      `<span class="ct">${n}</span><span class="fs">first seen #${a.firstAt.get(w)}</span>`));
    if (i === 2 && a.ranked.length > 3)
      group.append(el("div", "wf-cut", `<span>cut</span><span class="ln"></span>`));
  });

  if (a.ranked.length > shown.length)
    box.append(el("span", "more", `+${a.ranked.length - shown.length} more, all at ${a.ranked[shown.length][1]} or below`));
  return box;
}

function noteFor(a) {
  if (!a.words.length)
    return `Nothing to count. <code class='inl'>split(/\\s+/)</code> on an empty or whitespace-only string still produces a piece — an empty one — which is why <code class='inl'>filter(Boolean)</code> is there rather than being decoration. Without it the empty string becomes a "word" with a count, and on a paragraph that merely starts with a space it would arrive <b>first</b> in the Map and win every tie it entered.`;
  if (a.answer.length < 3)
    return `Only <b>${a.counts.size}</b> distinct word${a.counts.size === 1 ? "" : "s"}, so "the three most frequently occurring" has no third. <b>The statement never says what to do here</b>, and that silence is the interesting part — it means any behaviour is defensible and you should pick the one that needs no code. <code class='inl'>slice(0, 3)</code> on a shorter array returns the whole array rather than throwing or padding, so the degenerate case is handled by the line that was already there. Reaching for a guard would add a branch that no test can reach.`;
  if (a.contested) {
    const w = a.winners.map(([x]) => `<code class='inl'>${esc(x)}</code>`).join(" and ");
    const l = a.losers.map(([x]) => `<code class='inl'>${esc(x)}</code>`).join(", ");
    return `<b>${a.band.length} words are tied at ${a.cut}</b>, and only ${a.winners.length} of them fit above the cut. The comparator <code class='inl'>(a, b) =&gt; b[1] - a[1]</code> returns <b>0</b> for every pair inside that box, so it expresses no opinion at all about their order — it is a <i>partial</i> order and this is exactly the region it leaves undecided. What actually picks ${w} over ${l} is two guarantees the problem statement never mentions: a <b>Map iterates in insertion order</b>, so the entries arrive ranked by first appearance, and <b>Array.prototype.sort has been required to be stable since ES2019</b>, so equal elements keep that relative order. Check the "first seen" column — the survivors are simply the ones the paragraph got to first. ${a.overFallback
      ? `And this tally is <b>${a.counts.size} entries</b>, which is what makes this case worth having: V8's pre-TimSort sort was a QuickSort that fell back to a <i>stable</i> insertion sort on short arrays, so only a ranking longer than that fall-back could ever have come back in a different order. <b>No official paragraph reaches it</b> — this preset is ours precisely because the official set cannot get at the thing the solution depends on.`
      : `Note what the official set can and cannot prove, though: this tally is only <b>${a.counts.size} entries</b>, and V8's pre-TimSort sort fell back to a <i>stable</i> insertion sort on rankings this short, so a 2018 engine produced first-appearance order here too. The grader is blind to stability twice over — <b>case 1 because no tie reaches its cut at all</b>, cases 2 and 3 because their tallies are far inside that fall-back. Try the <b>11 distinct</b> preset for the only input here that clears it.`}`;
  }
  if (a.innerTie) {
    const t = a.ranked.slice(0, 3).filter((e, i) => e[1] === a.ranked[0][1]);
    return `${t.length > 1 ? `<code class='inl'>${esc(t[0][0])}</code> and <code class='inl'>${esc(t[1][0])}</code> are tied at <b>${t[0][1]}</b>` : `There is a tie inside the top three`}, but every tied word is <i>already</i> above the cut — so stability decides their <b>order within the answer</b> and not which words the answer contains. That is the milder half of the same problem and worth separating from it: the returned array is still <code class='inl'>${esc(fmtArr(a.answer))}</code> in that order only because the Map saw them in that order, and <code class='inl'>assert.deepEqual</code> compares position by position. Try the <b>4-way tie for slot 3</b> preset for the version where the tie changes the <i>membership</i>.`;
  }
  return `No tie anywhere near the cut: ${a.ranked.slice(0, 3).map(([w, n]) => `<code class='inl'>${esc(w)}</code>&nbsp;${n}`).join(", ")}${a.ranked.length > 3 ? `, then ${a.ranked[3][1]}` : ""}. This is the comfortable shape, and it is precisely why a wrong tie-break survives casual testing — every count is distinct, so the comparator decides everything and nothing is left for insertion order to settle. Edit the paragraph: delete one occurrence of <code class='inl'>${esc(a.ranked[2][0])}</code> and watch it fall into a tie, or repeat a word until it crosses the cut.`;
}

// ── STEP — normalise → tokenise → tally → sort → slice, with the Map's entries
// shown in INSERTION ORDER throughout, so the tie-break is traceable rather than
// asserted. The sort gets two steps on the same line: the entries before it, and
// the entries after, because the whole lesson lives in what did NOT move.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getWords</span>(<span class="tok" data-t="param">paragraph</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> text = <span class="tok" data-t="norm">paragraph.<span class="fn">toLowerCase</span>().<span class="fn">replace</span>(/[,.!]/g, <span class="st">""</span>)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> words = <span class="tok" data-t="split">text.<span class="fn">split</span>(/\\s+/).<span class="fn">filter</span>(Boolean)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> counts = <span class="tok" data-t="newmap"><span class="k">new</span> <span class="fn">Map</span>()</span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="pick">word</span> <span class="k">of</span> words) {` },
  { ln: 6, html: `    <span class="tok" data-t="bump">counts.<span class="fn">set</span>(word, (counts.<span class="fn">get</span>(word) ?? <span class="nu">0</span>) + <span class="nu">1</span>)</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">const</span> ranked = <span class="tok" data-t="spread">[...counts.<span class="fn">entries</span>()]</span>.<span class="tok" data-t="sort"><span class="fn">sort</span>((a, b) =&gt; b[<span class="nu">1</span>] - a[<span class="nu">1</span>])</span>;` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="slice">ranked.<span class="fn">slice</span>(<span class="nu">0</span>, <span class="nu">3</span>).<span class="fn">map</span>(([word]) =&gt; word)</span>;` },
  { ln: 10, html: `}` },
];

// The debugger takes a CASE INDEX rather than free text: these paragraphs run to
// 93 characters and a chip carrying one is a wall, not a button. The freeform
// paragraph lives on the Solution demo, which is where arbitrary input belongs.
function trace(caseNo) {
  const paragraph = CASES[caseNo - 1] ?? CASES[0];
  const a = analyze(paragraph);
  const steps = [];
  let text, words, counts = null, ranked = null, word, cur = -1;

  const pairs = (m) => [...m].map(([w, n]) => `${w}:${n}`);
  const S = (line, note, x = {}) => {
    const vars = { paragraph: clip(paragraph) };
    if (line >= 2 && text !== undefined) vars.text = clip(text);
    if (line >= 5 && line <= 7 && word !== undefined) vars.word = `"${word}"`;
    // Every struct appears on the line that creates it and then STAYS, because the
    // thing it shows is still in scope — the panel is a picture of the moment.
    const structs = [];
    if (line >= 3 && words) structs.push({ label: "words", items: words.map((w, i) => (i === cur ? "▶ " : "") + w) });
    if (line >= 4 && counts) structs.push({ label: "counts", items: pairs(counts), newest: !!x.mapNew });
    if (line >= 8 && ranked) structs.push({ label: "ranked", items: pairs(new Map(ranked)) });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getWords(${clip(paragraph, 22)})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Case <b>${caseNo}</b> — ${CHIP[caseNo - 1]}. Which <b>three</b> words occur most often in <b>${esc(paragraph)}</b>? The answer depends on <i>counts</i> and not on <i>positions</i>, which is the signal to stop thinking about the paragraph as a sequence and collapse it into a word→count map.`, { focus: "param" });

  text = paragraph.toLowerCase().replace(/[,.!]/g, "");
  const odd = strays(paragraph);
  S(2, `Lowercase and punctuation-stripping are two separate bullets in the statement, and they belong in the <b>same step, before any counting</b> — normalise once at the boundary and every line after this one gets to assume clean input. Note the punctuation set is <b>enumerated</b>: commas, periods, exclamation points, and nothing else. ${odd.length
    ? `This paragraph also contains ${odd.map((c) => `<code class='inl'>${esc(c)}</code>`).join(" ")}, which is <b>not</b> on the list and stays attached to its word — a broad <code class='inl'>/[^\\w\\s]/g</code> would have removed it, and that is more than the spec asked for.`
    : `A broad <code class='inl'>/[^\\w\\s]/g</code> would also strip apostrophes and hyphens; the spec gives a list, and the list <i>is</i> the spec.`}`,
    { focus: "norm", changed: ["text"] });

  words = text.split(/\s+/).filter(Boolean);
  S(3, `<b>${words.length}</b> token${words.length === 1 ? "" : "s"}. The statement promises words are separated by spaces, but <code class='inl'>split</code> on a leading, trailing or doubled space still hands back an <b>empty</b> piece — so <code class='inl'>filter(Boolean)</code> is load-bearing, not decoration. An empty "word" would get a tally of its own, and on a paragraph starting with a space it would be the <i>first</i> key in the Map and win every tie it entered.`, { focus: "split" });

  counts = new Map();
  S(4, `An empty <code class='inl'>Map</code> — and choosing <code class='inl'>Map</code> over a plain object is doing real work here. A <code class='inl'>{}</code> coerces every key to a string and <b>re-orders integer-like keys ahead of the rest</b>, so a word like <code class='inl'>"7"</code> would jump to the front of the iteration order and win ties it should have lost. Watch this panel fill: the order keys land in is the order the words were first seen, and that order is about to decide the answer.`, { focus: "newmap" });

  for (let i = 0; i < words.length; i++) {
    cur = i; word = words[i];
    S(5, `Word <b>${i + 1}</b> of ${words.length}: <b>"${esc(word)}"</b>.`, { focus: "pick", changed: ["word"] });
    const had = counts.has(word);
    counts.set(word, (counts.get(word) ?? 0) + 1);
    S(6, had
      ? `<b>"${esc(word)}"</b> was already here, so <code class='inl'>counts.get</code> returns <b>${counts.get(word) - 1}</b> and the entry becomes <b>${counts.get(word)}</b>. Re-setting an existing key does <i>not</i> move it — its position in the Map is still where it first appeared, which is what keeps the tie-break stable no matter how often a word recurs.`
      : `<b>"${esc(word)}"</b> is new, so <code class='inl'>counts.get</code> is <code class='inl'>undefined</code>, <code class='inl'>?? 0</code> supplies the seed, and the entry starts at <b>1</b>. This is the moment its rank among equals is fixed: it takes slot <b>${counts.size}</b> in the Map's insertion order, and nothing later can change that.`,
      { focus: "bump", mapNew: !had, eval: { expr: `counts.has("${word}")`, val: had } });
  }
  cur = -1; word = undefined;

  const entries = [...counts.entries()];
  S(8, `Spreading the Map gives <b>${entries.length}</b> pair${entries.length === 1 ? "" : "s"} <b>in the order the words were first seen</b> — not sorted, and not arbitrary. Most people read this line as "get the entries out". It is also, silently, the line that chooses the tie-break.`, { focus: "spread" });

  ranked = [...entries].sort((x, y) => y[1] - x[1]);
  S(8, `Sorted by count, descending. Now look at what did <b>not</b> move: <code class='inl'>b[1] - a[1]</code> returns <b>0</b> whenever two counts are equal, so for those pairs the comparator expresses no opinion whatsoever — it is a <i>partial</i> order. ${a.contested
    ? `<b>${a.band.length} words are tied at ${a.cut}</b> here (${a.band.map(([w]) => `<code class='inl'>${esc(w)}</code>`).join(", ")}) and only ${a.winners.length} can be above the cut, so the answer itself hangs on this. They stay in first-appearance order because <b>Array.prototype.sort has been required to be stable since ES2019</b>. ${a.overFallback
        ? `And at <b>${a.counts.size} entries</b> this ranking is long enough for that to have mattered: V8's pre-TimSort sort fell back to a <i>stable</i> insertion sort on short arrays and only reached its unstable QuickSort above that, so this is the one case in the module where a 2018 engine could have returned a different member of the box.`
        : `At <b>${a.counts.size} entries</b>, though, this particular ranking was safe even before that, because V8's old sort fell back to a <i>stable</i> insertion sort on rankings this short. <b>The official set cannot detect stability at all</b> — case 1's top three are 4, 3 and 2, so no tie reaches its cut and any algorithm returns the same array, while cases 2 and 3 do depend on stability but tally only 6 and 3 entries. Step <b>case 6</b>, ours, for the only tally here that clears the fall-back.`}`
    : a.innerTie
      ? `There is a tie inside the top three here, so stability decides the answer's <b>order</b> — and <code class='inl'>assert.deepEqual</code> compares position by position, so that still has to be right. <b>Array.prototype.sort has been stable since ES2019</b>; before that this was not guaranteed.`
      : `Nothing is tied on this input, so the comparator decides everything and stability never comes up. That is the comfortable case — and the reason a wrong tie-break survives casual testing. Step <b>case 2</b> or <b>case 4</b> to see the other shape.`}`,
    { focus: "sort" });

  const answer = ranked.slice(0, 3).map(([w]) => w);
  S(9, `<b>Return ${esc(fmtArr(answer))}.</b> ${ranked.length < 3
    ? `There are only <b>${ranked.length}</b> distinct words, and the statement never says what "the three most frequent" means when there are fewer than three. <code class='inl'>slice(0, 3)</code> already handles it — a short array comes back whole — so the unspecified case costs no code at all.`
    : `<code class='inl'>slice</code> keeps the first three pairs and <code class='inl'>map</code> throws the counts away, because the problem asked for words. The counts were never the answer; they were the key the answer was <i>sorted by</i> — and every ordering question the comparator left open was settled by the order this Map was built in.`}`,
    { focus: "slice", done: true, result: fmtArr(answer), ret: { value: fmtArr(answer) } });

  return steps;
}

export default {
  n: 35, id: "wordfreq", title: "Word Frequency", dates: ["2025-09-14"],
  statement: `Given a <b>paragraph</b>, return an array of the <b>three most frequently occurring words</b>. Words are separated by spaces. <b>Ignore case</b> — <code class="inl">Hello</code> and <code class="inl">hello</code> are the same word — and <b>ignore punctuation</b>, which here means exactly commas (<code class="inl">,</code>), periods (<code class="inl">.</code>) and exclamation points (<code class="inl">!</code>). The returned array is all lowercase, most frequent first. <span class="rule">Example: <code class="inl">getWords("I like coding. I like testing. I love debugging!")</code> → <code class="inl">["i", "like", "coding"]</code> — note that <code class="inl">coding</code>, <code class="inl">testing</code>, <code class="inl">love</code> and <code class="inl">debugging</code> each occur exactly <b>once</b>, and only one of them is in the answer.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass, then a sort",
      approach: `"Most frequently occurring" is a <b>tally</b>, so the first move is to stop treating the paragraph as a sequence and collapse it into a word→count map. Normalise once at the boundary — <code class='inl'>toLowerCase()</code> and <code class='inl'>replace(/[,.!]/g, "")</code> in the same step, before anything is counted — then split, count, rank, take three. Note the punctuation set is <b>enumerated</b> in the statement: commas, periods and exclamation points. A broad <code class='inl'>/[^\\w\\s]/g</code> would also strip apostrophes and hyphens, which is more than was asked; the spec gives a list, and the list <i>is</i> the spec. The part worth slowing down for is the <b>tie</b>. On the official <code class='inl'>"I like coding. I like testing. I love debugging!"</code> the counts are <code class='inl'>i</code>&nbsp;3, <code class='inl'>like</code>&nbsp;2, and then <code class='inl'>coding</code>, <code class='inl'>testing</code>, <code class='inl'>love</code> and <code class='inl'>debugging</code> <b>all tied at 1</b> — yet the expected answer is <code class='inl'>["i", "like", "coding"]</code>. <code class='inl'>coding</code> takes the third slot for one reason: it was seen first. The comparator <code class='inl'>(a, b) =&gt; b[1] - a[1]</code> returns <b>0</b> for every pair in that group, so it decides nothing there; what decides it is two guarantees the statement never mentions — a <b>Map iterates in insertion order</b>, and <b>Array.prototype.sort has been required to be stable since ES2019</b>. Be precise about how much the grader is actually checking here, because it is less than it looks — <b>the official set is blind to stability twice over</b>. Case 1's top three are <b>4, 3 and 2</b>: no tie reaches its cut, so every sorting algorithm returns the same array and stability cannot change it on any engine. Cases 2 and 3 genuinely do depend on it — case 3 ranks <code class='inl'>debug</code>&nbsp;4 ahead of <code class='inl'>test</code>&nbsp;4, and an unstable sort returning <code class='inl'>["test", "debug", "deploy"]</code> fails <code class='inl'>deepEqual</code> — but they tally only <b>6 and 3</b> entries, far inside the <i>stable</i> insertion-sort fall-back that V8's pre-TimSort QuickSort used on short arrays (TimSort landed in V8 v7.0 / Chrome 70). So no official test can distinguish a stable sort from an unstable one, and that conclusion survives wherever you put the engine's exact boundary. The dependency is real and the grader cannot reach it — which is why <b>case 6 is ours</b>: eleven distinct words with nine tied at the cut, clear of the fall-back, and the only input in the module where the guarantee is doing observable work. Use a <code class='inl'>Map</code> rather than <code class='inl'>{}</code> for the same reason: object keys coerce and integer-like keys are re-ordered ahead of everything else, so the word <code class='inl'>"7"</code> would jump the queue and win a tie it should have lost. Last, <code class='inl'>slice(0, 3)</code> quietly covers the case the statement leaves unspecified — <b>fewer than three distinct words</b> — by returning what there is. Edit the paragraph and watch a word cross the cut line.`,
      code: `// Tally, then rank. The tie-break the statement never mentions is FIRST APPEARANCE.
function getWords(paragraph: string): string[] {
  // Normalise once, at the boundary. The statement ENUMERATES its punctuation —
  // commas, periods, exclamation points — so a broad /[^\\w\\s]/g would over-reach
  // and strip apostrophes and hyphens the spec never asked about.
  const text = paragraph.toLowerCase().replace(/[,.!]/g, "");
  // filter(Boolean) is load-bearing: a leading/trailing/doubled space makes split
  // hand back an empty piece, which would otherwise be tallied as a word.
  const words = text.split(/\\s+/).filter(Boolean);

  // A Map, not a plain object: object keys coerce, and integer-like keys are
  // re-ordered ahead of the rest — so the word "7" would jump to the front of the
  // iteration order and win a tie it should have lost.
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  // b[1] - a[1] returns 0 for equal counts, so the comparator decides NOTHING
  // among ties. Two guarantees settle them instead: a Map iterates in insertion
  // order, and Array.prototype.sort has been required to be stable since ES2019.
  // Together: ties resolve by first appearance, which is what the grader expects
  // ("I like coding. I like testing. I love debugging!" wants coding, not testing).
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  // slice(0, 3) also covers the unspecified case of fewer than three distinct
  // words: a short array comes back whole, so the edge costs no extra code.
  return ranked.slice(0, 3).map(([word]) => word);
}`,
      mount,
    },
    {
      name: "Step through", cost: "insertion order",
      approach: `Normalise → tokenise → tally → sort → slice, with the <code class='inl'>counts</code> Map shown in <b>insertion order</b> at every step so the tie-break is something you can trace rather than something you are told. The sort gets <b>two steps on the same line</b> — the pairs before it and the pairs after — because the lesson lives in what did <i>not</i> move. It opens on <b>case 2</b>, the official paragraph where <code class='inl'>coding</code>, <code class='inl'>testing</code>, <code class='inl'>love</code> and <code class='inl'>debugging</code> are all tied at 1 and only the first of them survives. <b>Case 4</b> is ours: four words tied at 2, split into two winners and two losers by nothing but position. <b>Case 3</b> is the milder variety — the tie sits inside the podium, so it moves the order without changing the membership — and <b>case 1</b> is the control, every count distinct and stability never consulted. <b>Case 5</b> has only two distinct words. Then read the sort step on <b>case 6</b>, also ours: it is the only tally here past V8's old short-array fall-back, and therefore the only one where a pre-ES2019 engine could genuinely have returned a different answer — case 1 has no tie at its cut for stability to affect, and cases 2 and 3 are small enough that the old <i>stable</i> insertion-sort path covered them. The input is a case number because these paragraphs run past 90 characters; type your own on the <b>Solution</b> tab. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 2, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a paragraph` },
      }),
    },
  ],
};
