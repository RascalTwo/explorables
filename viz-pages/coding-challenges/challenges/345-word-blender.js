// #345 · Word Blender — one Math.floor cuts both words, from opposite ends.
// "For odd-length words the first half is the shorter half" sounds like it needs a
// floor for word1 and a ceil for word2. It doesn't. Both cuts sit at the SAME index,
// Math.floor(len / 2) — word1 keeps everything before its cut, word2 keeps
// everything from its cut onward. The shorter-half rule falls out of using one as
// an end bound and the other as a start bound, so there is no parity branch at all.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–6 are freeCodeCamp's official tests in the order the grader lists them.
// They cover even/even and even/odd but never odd/odd, and never a case where the
// two cuts are the same index — so cases 7–8 are invented. 7 is odd/odd, where BOTH
// halves round down at once. 8 blends a word with itself: the halves are exactly
// complementary, so the answer must be the word back, which is the cheapest proof
// that the two slices meet without overlapping or dropping a letter.
const CASES = [
  { a: "turtle",   b: "toucan"    },
  { a: "chipmunk", b: "flamingo"  },
  { a: "falcon",   b: "pelican"   },
  { a: "hyena",    b: "iguana"    },
  { a: "scorpion", b: "gorilla"   },
  { a: "platypus", b: "wolverine" },
  { a: "hyena",    b: "pelican"   },
  { a: "banana",   b: "banana"    },
];

// The solution itself — shared by the demo and the trace so they cannot drift.
const cut = (w) => Math.floor(w.length / 2);
const blend = (a, b) => a.slice(0, cut(a)) + b.slice(cut(b));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    /* top margin leaves room for the cut marker's floating "cut N" label, which
       sits 15px above the row and would otherwise land on the heading. */
    .wb-word { display:flex; align-items:center; gap:3px; flex-wrap:wrap; margin:19px 0 2px; }
    .wb-l { min-width:26px; height:34px; display:flex; align-items:center; justify-content:center;
            font:800 16px var(--mono); border-radius:6px; border:1px solid var(--border);
            background:var(--panel-2); color:var(--muted); }
    .wb-l.keep { border-color:var(--accent); color:var(--text);
                 background:color-mix(in srgb, var(--accent) 16%, transparent); }
    .wb-l.keep2 { border-color:var(--c3); color:var(--text);
                  background:color-mix(in srgb, var(--c3) 16%, transparent); }
    .wb-l.drop { opacity:.4; text-decoration:line-through; }
    .wb-cut { width:0; align-self:stretch; border-left:2px dashed var(--warn); margin:0 4px; position:relative; }
    .wb-cut::after { content:attr(data-i); position:absolute; top:-15px; left:50%; transform:translateX(-50%);
                     font:700 10px var(--mono); color:var(--warn); white-space:nowrap; }
    .wb-lab { font:700 10.5px var(--sans); letter-spacing:.06em; text-transform:uppercase;
              color:var(--muted); margin-top:14px; }
    .wb-out { display:flex; gap:3px; flex-wrap:wrap; margin-top:6px; }
    .wb-meta { font:12.5px var(--mono); color:var(--muted); margin-top:10px; }
    .wb-meta b { color:var(--text); }
  `));
}

// One word rendered as letter tiles with the cut drawn in. `side` decides which
// half is kept, so the same builder draws both rows and they cannot disagree.
function wordRow(word, side) {
  const k = cut(word);
  const row = el("div", "wb-word");
  const marker = () => {
    const c = el("div", "wb-cut");
    c.dataset.i = `cut ${k}`;
    return c;
  };
  [...word].forEach((ch, i) => {
    if (i === k) row.append(marker());           // sits between letters k-1 and k
    const kept = side === "head" ? i < k : i >= k;
    row.append(el("div", "wb-l " + (kept ? (side === "head" ? "keep" : "keep2") : "drop"), esc(ch)));
  });
  if (k >= word.length) row.append(marker());    // cut past the last letter (empty word)
  return row;
}

function mount(host) {
  ensureStyle();
  let a = CASES[0].a, b = CASES[0].b;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(`${c.a} + ${c.b}`));
    chip.onclick = () => { a = c.a; b = c.b; aIn.value = a; bIn.value = b; render(); };
    pre.append(chip);
  });

  const ctl = el("div", "controls");
  const aIn = el("input"); aIn.type = "text"; aIn.value = a; aIn.style.width = "150px";
  const bIn = el("input"); bIn.type = "text"; bIn.value = b; bIn.style.width = "150px";
  aIn.oninput = () => { a = aIn.value; render(); };
  bIn.oninput = () => { b = bIn.value; render(); };
  ctl.append(el("span", "ctl-label", "word1 ="), aIn, el("span", "ctl-label", "word2 ="), bIn);

  const out = el("div");
  host.append(
    el("div", "note", "Type your own pair and watch both dashed cuts. Add or remove one letter from a word to see its cut move only every <i>other</i> time — that stepping is <code class='inl'>Math.floor</code>, and it is the only thing handling odd lengths. Try a one-letter word to push a cut to index 0."),
    pre, ctl, out,
  );
  render();

  function render() {
    out.innerHTML = "";
    if (!a.length && !b.length) { out.append(el("div", "note", "Type two words to blend.")); return; }

    const k1 = cut(a), k2 = cut(b), result = blend(a, b);

    out.append(el("div", "wb-lab", `word1 · keep the first ${k1} of ${a.length}`), wordRow(a, "head"));
    out.append(el("div", "wb-lab", `word2 · drop the first ${k2} of ${b.length}, keep ${b.length - k2}`), wordRow(b, "tail"));

    out.append(el("div", "wb-lab", "result"));
    const res = el("div", "wb-out");
    [...a.slice(0, k1)].forEach((ch) => res.append(el("div", "wb-l keep", esc(ch))));
    [...b.slice(k2)].forEach((ch) => res.append(el("div", "wb-l keep2", esc(ch))));
    if (!result.length) res.append(el("span", "muted", '(empty string)'));
    out.append(res);

    out.append(el("div", "result-line", `<span class="badge ok">${esc(JSON.stringify(result))}</span>`));

    out.append(el("div", "wb-meta",
      `<b>${a.length}</b> ÷ 2 → floor <b>${k1}</b> kept ${a.length % 2 ? "(odd — the shorter half)" : "(even — an exact half)"} &nbsp;·&nbsp; ` +
      `<b>${b.length}</b> ÷ 2 → floor <b>${k2}</b> dropped, <b>${b.length - k2}</b> kept ${b.length % 2 ? "(odd — the longer half)" : "(even — an exact half)"}`));

    const same = a === b;
    out.append(el("div", "note", same
      ? `Both words are the same, so the two cuts land on the same index and the halves are exactly complementary — <b>${k1}</b> letters from the front plus <b>${b.length - k2}</b> from the back rebuild the original with nothing lost or repeated. If a blend of a word with itself ever came back changed, one of the two slices would be off by one.`
      : `Result length is <b>${k1} + ${b.length - k2} = ${result.length}</b>. Notice it is <i>not</i> generally the average of the two word lengths — word1 contributes its <b>shorter</b> half and word2 its <b>longer</b> one, so an odd word donates a different amount depending on which side it sits.`));
  }
}

// ── STEP — the two cuts, computed the same way and used differently ──────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">blendWords</span>(<span class="tok" data-t="params">word1, word2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="c1">cut1 = Math.<span class="fn">floor</span>(word1.length / <span class="nu">2</span>)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="c2">cut2 = Math.<span class="fn">floor</span>(word2.length / <span class="nu">2</span>)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="head">head = word1.<span class="fn">slice</span>(<span class="nu">0</span>, cut1)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="tail">tail = word2.<span class="fn">slice</span>(cut2)</span>;` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="join">head + tail</span>;` },
  { ln: 7, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { a, b } = CASES[k - 1];
  const c1 = cut(a), c2 = cut(b), head = a.slice(0, c1), tail = b.slice(c2), result = head + tail;
  const steps = [];

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3) vars.cut1 = c1;               // scope by omission: each const shows up
    if (line >= 4) vars.cut2 = c2;               // only once its own line has executed
    if (line >= 5) vars.head = `"${head}"`;
    if (line >= 6) vars.tail = `"${tail}"`;
    const structs = [{ label: "word1", items: [...a] }, { label: "word2", items: [...b] }];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `blendWords("${a}", "${b}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Blend <b>"${a}"</b> (${a.length} letters, ${a.length % 2 ? "odd" : "even"}) with <b>"${b}"</b> (${b.length} letters, ${b.length % 2 ? "odd" : "even"}). The only rule with any subtlety is that an odd word's first half is the <i>shorter</i> one.`,
    { focus: "params" });

  S(2, `<b>Math.floor(${a.length} / 2) = ${c1}</b>. ${a.length % 2
    ? `${a.length} is odd, so the exact half is ${a.length / 2} and flooring gives the <b>shorter</b> side — which is what the spec asked for. No branch needed; <code class='inl'>floor</code> <i>is</i> the rule.`
    : `${a.length} is even, so the halves are equal and flooring changes nothing. The odd case is the only reason <code class='inl'>floor</code> is here at all.`}`,
    { focus: "c1", changed: ["cut1"] });

  S(3, `<b>Math.floor(${b.length} / 2) = ${c2}</b> — computed <i>identically</i> to cut1. This is the step where it is tempting to reach for <code class='inl'>Math.ceil</code>, because word2 has to give up its <b>longer</b> half. Watch line 5: the same floor produces that, for free.`,
    { focus: "c2", changed: ["cut2"] });

  S(4, `<b>slice(0, ${c1})</b> keeps everything <i>before</i> the cut: <b>"${head}"</b> (${head.length} letter${head.length === 1 ? "" : "s"}).${c1 === 0 ? ` The cut is at index 0, so word1 donates nothing — a one-letter word has no first half.` : ""}`,
    { focus: "head", changed: ["head"] });

  S(5, `<b>slice(${c2})</b> with no end bound keeps everything <i>from</i> the cut onward: <b>"${tail}"</b> (${tail.length} letter${tail.length === 1 ? "" : "s"}). ${b.length % 2
    ? `Here is the payoff — dropping the shorter ${c2} leaves the longer ${tail.length}. <b>floor</b> as a start index does exactly what <b>ceil</b> as a length would, without a second rounding rule to keep straight.`
    : `Even length, so this is a clean half either way.`}`,
    { focus: "tail", changed: ["tail"] });

  S(6, `Concatenate: <b>"${head}" + "${tail}" = "${result}"</b>${a === b ? ` — and since both words were the same, the two slices are complementary and rebuild the original exactly.` : `.`} Total length <b>${head.length} + ${tail.length} = ${result.length}</b>.`,
    { focus: "join", done: true, result: `"${result}"`, ret: { value: `"${result}"` } });

  return steps;
}

export default {
  n: 345, id: "blender", title: "Word Blender", dates: ["2026-07-21"],
  statement: `Given two words, return a new word combining the <b>first half of the first word</b> with the <b>second half of the second word</b>. For odd-length words, the first half is the shorter half. <span class="rule">Example: <code class="inl">blendWords("falcon", "pelican")</code> → <b>"falican"</b> — "fal" (3 of 6) plus "ican" (the longer 4 of 7).</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `The rule that looks like it needs two cases needs none. Compute <code class='inl'>Math.floor(len / 2)</code> for <i>both</i> words — the same expression, no parity check — then use the first as an <b>end</b> bound and the second as a <b>start</b> bound. <code class='inl'>slice(0, cut)</code> keeps the shorter front half; <code class='inl'>slice(cut)</code> discards a shorter front half and therefore keeps the longer back one. The asymmetry the spec describes comes entirely from which side of the index you stand on, so <code class='inl'>Math.ceil</code> never appears and there is nothing to get backwards. The general move: when two rules look like mirror images, check whether one operator applied from opposite ends already expresses both.`,
      code: `// The same floor for both words. Used as an END bound it keeps the shorter
// front half; used as a START bound it keeps the longer back half — so the
// odd-length rule needs no branch and no Math.ceil.
function blendWords(word1: string, word2: string): string {
  const cut1 = Math.floor(word1.length / 2);
  const cut2 = Math.floor(word2.length / 2);
  return word1.slice(0, cut1) + word2.slice(cut2);
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Six lines. The one to watch is <b>line 3</b>, where <code class='inl'>cut2</code> is computed exactly like <code class='inl'>cut1</code> even though word2 needs the opposite half — and then <b>line 5</b>, where using it as a start index rather than an end index supplies the difference. Run <b>hyena + pelican</b> (both odd, both cuts round down) against <b>banana + banana</b> (identical words, complementary halves, the original word returned). Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
