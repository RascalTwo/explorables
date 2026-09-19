// #1 · Vowel Balance — an odd string's centre character belongs to neither half.
// The first freeCodeCamp daily, 2025-08-11 — day one of the 365-challenge run.
// The whole problem is one index. The front half ends at Math.floor(n / 2) and the
// back half starts at Math.ceil(n / 2); on an even length those are the same number
// and the halves meet, on an odd length they differ by one and that gap IS the
// ignored centre character. Take slice(floor) for the back half instead and every
// even test still passes — only the odd ones break, and "racecar" breaks loudest
// because its ignored centre is itself a vowel.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–7 are freeCodeCamp's official tests, in the order the grader lists them.
// 8 and 9 are mine, filling the two gaps the official set leaves. Every official
// even-length case is FALSE ("string" 0≠1, the alphabet 3≠2), so "puzzle" (1 = 1)
// is the only case here where the halves meet with no gap and still agree — the
// control proving the floor/ceil pair drops nothing on even input. "rhythm" has no
// vowels anywhere: 0 = 0 is balanced, which is worth seeing because "balanced"
// sounds like it needs something to balance, and because y is not a vowel here.
const CASES = [
  "racecar",                    // odd — the ignored centre 'e' is ITSELF a vowel
  "Lorem Ipsum",                // odd, mixed case, centre is a space
  "Kitty Ipsum",                // odd, mixed case — 1 vs 2, the near miss
  "string",                     // even — 0 vs 1
  " ",                          // one character: it IS the centre, both halves empty
  "abcdefghijklmnopqrstuvwxyz", // even and long — 3 vs 2
  "123A#b!E&*456-o.U",          // digits and punctuation; uppercase vowels still count
  "puzzle",                     // MINE — even AND balanced, 1 = 1
  "rhythm",                     // MINE — no vowels at all; 0 = 0 is still balanced
];

// The solution itself, shared by the demo and the trace so they cannot drift.
const isVowel = (ch) => ch != null && "aeiou".includes(ch.toLowerCase());
const countVowels = (t) => [...t].filter(isVowel).length;
const front = (s) => s.slice(0, Math.floor(s.length / 2));
const back = (s) => s.slice(Math.ceil(s.length / 2));

// Spaces are invisible in a tile and inside quotes, so print them. `show`/`qRaw`
// are for places the scaffold escapes for us (frame titles, vars, structs, eval);
// `q`/`chq` escape here, because `note` and el() html are injected raw.
const show = (ch) => (ch === " " ? "␣" : ch);
const qRaw = (t) => '"' + [...t].map(show).join("") + '"';
const q = (t) => esc(qRaw(t));
const chq = (ch) => esc(show(ch));
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .vb-lane { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; margin:18px 0 4px; }
    .vb-col { display:flex; flex-direction:column; gap:6px; min-width:0; }
    .vb-tag { font:700 10.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .vb-row { display:flex; gap:3px; flex-wrap:wrap; align-items:center; min-height:34px; }
    .vb-ch { min-width:26px; height:34px; padding:0 5px; display:flex; align-items:center; justify-content:center;
             font:800 16px var(--mono); border-radius:6px; border:1px solid var(--border);
             background:var(--panel-2); color:var(--muted); }
    /* a vowel is tinted with its OWN half's colour, so the two tallies below are
       readable as "how much of this colour is on this side". */
    .vb-ch.v1 { border-color:var(--accent); color:var(--text); background:color-mix(in srgb, var(--accent) 20%, transparent); }
    .vb-ch.v2 { border-color:var(--c3); color:var(--text); background:color-mix(in srgb, var(--c3) 20%, transparent); }
    .vb-ch.ig { border-style:dashed; border-color:var(--warn); opacity:.6; }
    .vb-seam { width:0; height:34px; border-left:2px dashed var(--warn); margin:0 10px; }
    .vb-cnt { font:800 15px var(--mono); color:var(--muted); }
    .vb-cnt.front { color:var(--accent); }
    .vb-cnt.back { color:var(--c3); }
    .vb-mid .vb-tag { color:var(--warn); }
    .vb-meta { font:12.5px var(--mono); color:var(--muted); margin-top:10px; }
    .vb-meta b { color:var(--text); }
  `));
}

// One half rendered as tiles plus its tally. `klass` picks the half's colour, so
// the same builder draws both sides and they cannot disagree about what a vowel is.
function halfCol(tag, text, klass, cntClass) {
  const col = el("div", "vb-col");
  col.append(el("div", "vb-tag", esc(tag)));
  const row = el("div", "vb-row");
  if (!text.length) row.append(el("span", "muted", "(empty)"));
  [...text].forEach((ch) => row.append(el("div", "vb-ch" + (isVowel(ch) ? " " + klass : ""), chq(ch))));
  col.append(row, el("div", "vb-cnt " + cntClass, plural(countVowels(text), "vowel")));
  return col;
}

function mount(host) {
  ensureStyle();
  let s = CASES[0];

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", q(c));
    chip.onclick = () => { s = c; inp.value = c; render(); };
    chips.append(chip);
  });

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = s; inp.style.width = "330px";
  inp.oninput = () => { s = inp.value; render(); };
  ctl.append(el("span", "ctl-label", "s ="), inp);

  const out = el("div");
  host.append(
    el("div", "note", "Type anything — letters, digits, punctuation, spaces. Add or delete a single character and watch the dashed marker flip between an <b>ignored centre tile</b> (odd length) and a bare <b>seam</b> (even length). The fastest way to feel the trap: start from <code class='inl'>racecar</code>, whose ignored centre is a vowel, and delete the leading <b>r</b>."),
    chips, ctl, out,
  );
  render();

  function render() {
    out.innerHTML = "";
    const n = s.length, cut1 = Math.floor(n / 2), cut2 = Math.ceil(n / 2);
    const f = front(s), b = back(s);
    const a = countVowels(f), z = countVowels(b), ok = a === z;

    const lane = el("div", "vb-lane");
    lane.append(halfCol(`front · slice(0, ${cut1})`, f, "v1", "front"));

    const mid = el("div", "vb-col vb-mid");
    if (n % 2) {
      mid.append(el("div", "vb-tag", "ignored"));
      const row = el("div", "vb-row");
      row.append(el("div", "vb-ch ig", chq(s[cut1])));
      mid.append(row, el("div", "vb-cnt", `index ${cut1}`));
    } else {
      mid.append(el("div", "vb-tag", "no centre"));
      const row = el("div", "vb-row");
      row.append(el("div", "vb-seam"));
      mid.append(row, el("div", "vb-cnt", "halves meet"));
    }
    lane.append(mid, halfCol(`back · slice(${cut2})`, b, "v2", "back"));
    out.append(lane);

    out.append(el("div", "result-line",
      `<span class="badge ${ok ? "ok" : "no"}">${ok}</span> <span class="mono">${a} ${ok ? "===" : "!=="} ${z}</span>`));

    out.append(el("div", "vb-meta",
      `length <b>${n}</b> — <b>${n % 2 ? "odd" : "even"}</b> &nbsp;·&nbsp; ` +
      `floor(${n}/2) = <b>${cut1}</b>, ceil(${n}/2) = <b>${cut2}</b> &nbsp;·&nbsp; ` +
      (n % 2
        ? `they differ by one, and index <b>${cut1}</b> (${chq(s[cut1])}) falls in the gap`
        : `they agree, so no character is skipped`)));

    if (n % 2 && isVowel(s[cut1])) {
      out.append(el("div", "note", `The ignored character <b>${chq(s[cut1])}</b> is itself a vowel — this is the input that punishes a wrong split. Count it into the back half and the answer becomes <b>${a === z + 1}</b> instead of <b>${ok}</b>.`));
    } else if (n % 2) {
      out.append(el("div", "note", `The ignored character <b>${chq(s[cut1])}</b> isn't a vowel, so dropping it changes nothing here — which is exactly why an off-by-one split survives most odd inputs too. Only a case whose centre <i>is</i> a vowel exposes it.`));
    } else {
      out.append(el("div", "note", `Even length, so <code class='inl'>floor</code> and <code class='inl'>ceil</code> return the same index and nothing is thrown away. Every character is counted exactly once — which is why a solution that gets the odd case wrong still passes here.`));
    }

    if (a === 0 && z === 0) {
      out.append(el("div", "note", `Neither half holds a vowel, and <b>0 = 0</b> is a balance. "Balanced" is a statement about the two counts being <i>equal</i>, not about them being non-zero.`));
    }
  }
}

const CODE = `// The centre character of an odd-length string belongs to NEITHER half: the
// front stops at floor(n / 2) and the back starts at ceil(n / 2), so the two
// indexes are equal on an even length and one apart on an odd one. The /i flag
// covers "either uppercase or lowercase"; every other character the string is
// allowed to hold simply never matches, so nothing else needs handling.
function isBalanced(s: string): boolean {
  const vowels = (t: string): number => (t.match(/[aeiou]/gi) || []).length;
  const mid = s.length / 2;
  return vowels(s.slice(0, Math.floor(mid))) === vowels(s.slice(Math.ceil(mid)));
}`;

// ── STEP — the two slice bounds, then one tally per half ─────────────────────
// The regex count is expanded into explicit for-of loops so each vowel test is a
// step you can stop on; lines 3 and 4 are the pair worth staring at.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">isBalanced</span>(<span class="tok" data-t="param">s</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="mid">mid = s.length / <span class="nu">2</span></span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="front">front = s.<span class="fn">slice</span>(<span class="nu">0</span>, Math.<span class="fn">floor</span>(mid))</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> <span class="tok" data-t="back">back = s.<span class="fn">slice</span>(Math.<span class="fn">ceil</span>(mid))</span>;  <span class="cm">// ceil, not floor — skips an odd centre</span>` },
  { ln: 5,  html: `  <span class="k">let</span> a = <span class="nu">0</span>;` },
  { ln: 6,  html: `  <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> front) <span class="k">if</span> (<span class="tok" data-t="ta"><span class="st">"aeiou"</span>.<span class="fn">includes</span>(c.<span class="fn">toLowerCase</span>())</span>) a++;` },
  { ln: 7,  html: `  <span class="k">let</span> b = <span class="nu">0</span>;` },
  { ln: 8,  html: `  <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> back) <span class="k">if</span> (<span class="tok" data-t="tb"><span class="st">"aeiou"</span>.<span class="fn">includes</span>(c.<span class="fn">toLowerCase</span>())</span>) b++;` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="cmp">a === b</span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const s = CASES[k - 1];
  const n = s.length, odd = n % 2 === 1;
  const cut1 = Math.floor(n / 2), cut2 = Math.ceil(n / 2);
  const f = front(s), bk = back(s);
  const centre = odd ? s[cut1] : null;
  const steps = [];
  let a = 0, b = 0, c = null;

  // Scope by omission, gated on the line that CREATES each thing: mid on 2, front
  // on 3, back on 4, a on 5, b on 7. `c` is block-scoped to whichever for-of is
  // running, so it is passed in per step rather than gated on a line range — and
  // it disappears the moment that loop ends. The structs follow the same rule and
  // then stay, because a slice stays in scope for the rest of the call.
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.mid = n / 2;
    if (line >= 3) vars.front = qRaw(f);
    if (line >= 4) vars.back = qRaw(bk);
    if (line >= 5) vars.a = a;
    if (line >= 7) vars.b = b;
    if (x.c) vars.c = "'" + show(c) + "'";
    const structs = [{ label: "s", items: [...s].map(show) }];
    if (line >= 3) structs.push({ label: "front", items: [...f].map(show) });
    if (line >= 4) structs.push({ label: "back", items: [...bk].map(show) });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isBalanced(${qRaw(s)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Is <b>${q(s)}</b> balanced? Its length is <b>${n}</b>, which is <b>${odd ? "odd" : "even"}</b> — and that alone decides whether any character gets thrown away before a single vowel is counted.`,
    { focus: "param" });

  S(2, `<b>mid = ${n} / 2 = ${n / 2}</b>. ${odd
    ? `The midpoint lands <i>between</i> nothing — there is no index ${n / 2}. The character at index <b>${cut1}</b> straddles it, which is the one the spec says to ignore.`
    : `An even length puts the midpoint exactly on a boundary between two characters, so every character will land in one half or the other.`}`,
    { focus: "mid", changed: ["mid"] });

  S(3, `<b>slice(0, Math.floor(${n / 2})) = slice(0, ${cut1})</b> → <b>${q(f)}</b>. <code class='inl'>slice</code>'s end bound is exclusive, so flooring stops the front half <i>before</i> the midpoint rather than on it.`,
    { focus: "front", changed: ["front"] });

  S(4, `<b>slice(Math.ceil(${n / 2})) = slice(${cut2})</b> → <b>${q(bk)}</b>. ${odd
    ? `Here is the whole challenge: <b>floor ${cut1} ≠ ceil ${cut2}</b>, and the one-index gap between them is the centre <b>${chq(centre)}</b>. Look at the structs — it is in <b>s</b>, and in neither half. Writing <code class='inl'>slice(${cut1})</code> here instead would hand it to the back half.`
    : `floor and ceil agree on an even length, so both are <b>${cut1}</b> and the halves meet with nothing between them. Note what that means for a buggy solution: <code class='inl'>slice(${cut1})</code> would produce this identical back half, so an even-length test can never catch the mistake.`}`,
    { focus: "back", changed: ["back"] });

  // Each of the two rules the statement bothers to spell out — "either uppercase
  // or lowercase" and "can contain any characters" — earns a sentence the FIRST
  // time a character actually exercises it, and never again. Repeating it on all
  // 26 letters of the alphabet case would turn narration into wallpaper.
  let saidCase = false, saidAny = false;
  const vnote = (ch, v, tally, name, lead) => {
    const lower = ch.toLowerCase(), cased = ch !== lower;
    let why = "";
    if (v && cased && !saidCase) {
      saidCase = true;
      why = ` This is the "either uppercase or lowercase" clause being paid for: the tally never sees <b>'${chq(ch)}'</b>, only the lower-cased copy, so one five-letter test covers ten letters.`;
    } else if (!v && !/[a-z]/i.test(ch) && !saidAny) {
      saidAny = true;
      why = ` And there is the "can contain any characters" clause, costing nothing — a space, a digit or a symbol needs no branch of its own, it just isn't a vowel.`;
    }
    return `<b>'${chq(ch)}'</b>${cased ? ` lower-cases to <b>'${chq(lower)}'</b> and` : ""} is ${v
      ? `a vowel, so <b>${name}</b> ticks to <b>${tally}</b>.`
      : `not one of <code class='inl'>aeiou</code>, so <b>${name}</b> stays <b>${tally}</b>.`}${why}${lead}`;
  };

  S(5, `Start the front tally at <b>a = 0</b>.`, { changed: ["a"] });

  if (!f.length) {
    S(6, `<b>front</b> is empty, so the loop body never runs and <b>a</b> stays 0.${n <= 1 ? ` A string this short is <i>all</i> centre — there is nothing on either side of it to compare.` : ""}`,
      { focus: "ta" });
  } else {
    let first = true;
    for (const ch of f) {
      c = ch;
      const v = isVowel(ch);
      if (v) a++;
      S(6, vnote(ch, v, a, "a", first
        ? ` Note what the loop iterates: <b>front</b>, not <b>s</b>. The centre character was excluded by line 3 and can no longer sneak into a tally by accident.`
        : ""),
        { focus: "ta", c: true, eval: { expr: `"aeiou".includes('${show(ch.toLowerCase())}')`, val: v }, changed: v ? ["c", "a"] : ["c"] });
      first = false;
    }
  }

  S(7, `The front half is done with <b>${plural(a, "vowel")}</b>, and its <code class='inl'>c</code> went out of scope with the loop. Start the back tally at <b>b = 0</b>.`,
    { changed: ["b"] });

  if (!bk.length) {
    S(8, `<b>back</b> is empty too, so this loop body also never runs and <b>b</b> stays 0.`, { focus: "tb" });
  } else {
    let first = true;
    for (const ch of bk) {
      c = ch;
      const v = isVowel(ch);
      if (v) b++;
      S(8, vnote(ch, v, b, "b", first
        ? ` Same test, same characters-to-vowels rule — only the tally differs. The two halves are never compared until both counts are final, which is why the order of these two loops cannot matter.`
        : ""),
        { focus: "tb", c: true, eval: { expr: `"aeiou".includes('${show(ch.toLowerCase())}')`, val: v }, changed: v ? ["c", "b"] : ["c"] });
      first = false;
    }
  }

  const ok = a === b;
  S(9, `<b>${a} === ${b}</b> → <b>${ok}</b>. ${ok
    ? `Both halves carry the same number of vowels, so the string is balanced.`
    : `The halves differ by ${Math.abs(a - b)}, so it isn't.`}${odd
    ? ` The centre <b>${chq(centre)}</b> never entered either tally${isVowel(centre)
      ? ` — and it <i>is</i> a vowel, so a back half that started at index ${cut1} would have answered <b>${a === b + 1}</b> here.`
      : `, though since it isn't a vowel that particular bug would have gone unnoticed on this input.`}`
    : ""}`,
    { focus: "cmp", eval: { expr: `${a} === ${b}`, val: ok }, done: true, result: String(ok), ret: { value: String(ok) } });

  return steps;
}

export default {
  n: 1, id: "vowelbal", title: "Vowel Balance", dates: ["2025-08-11"],
  statement: `Given a string, return <code class="inl">true</code> when the first half holds the same number of vowels as the second half. The string can contain <b>any</b> characters; <code class="inl">a e i o u</code> count in either uppercase or lowercase; and if the length is odd, the <b>centre character is ignored</b>. <span class="rule">Example: <code class="inl">isBalanced("racecar")</code> → <b>true</b> — <code class="inl">"rac"</code> has one vowel and <code class="inl">"car"</code> has one, while the centre <code class="inl">e</code> is discarded even though it is a vowel itself.</span>`,
  // One approach. There is no wasteful act to name here: counting the vowels in
  // two slices is already a single linear pass, and the only way to make a first
  // variant "worse" would be to make it WRONG about the split — which Tier 1 §3
  // forbids. A second tab spelling the same scan as a reduce would be an edit,
  // not an approach.
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Cut once, count twice. <code class='inl'>Math.floor(n / 2)</code> is where the front half <b>ends</b> and <code class='inl'>Math.ceil(n / 2)</code> is where the back half <b>begins</b> — on an even length those are the same index and the halves meet, on an odd length they are one apart and the character in the gap is skipped, which is the rule the spec states. Nothing else needs a branch: the <code class='inl'>/i</code> flag handles "either uppercase or lowercase", and "can contain any characters" needs no handling at all, because a digit or a symbol simply fails the vowel test like every other non-vowel. The general move worth keeping: when a spec says <i>ignore the middle one</i>, reach for a <b>pair of bounds that disagree by one</b> rather than a length check and a special case.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Ten lines, and the pair to watch is <b>3 and 4</b> — the same <code class='inl'>mid</code>, rounded two different ways. Run case <b>1</b> (<code class='inl'>"racecar"</code>, odd, and the ignored centre is a vowel) against case <b>8</b> (<code class='inl'>"puzzle"</code>, even, halves meet): on the even one the structs show <b>front</b> and <b>back</b> covering all of <b>s</b> between them, on the odd one a character is visibly in <b>s</b> alone. Case <b>5</b> is the degenerate end — one character, so both halves are empty and neither loop body ever runs. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
