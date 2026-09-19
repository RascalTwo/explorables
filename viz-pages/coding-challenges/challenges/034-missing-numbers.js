// #34 · Missing Numbers — n is the array's MAXIMUM, not its length.
// One clause of the statement carries the whole problem: "between 1 and n (where n
// is the largest number in the given array)". Read it fast and `n` looks like the
// length, because the two agree on any contiguous array — and the official set
// opens with two of those. They diverge the moment the array is sparse ([1, 10] is
// two elements and eight missing numbers) or repeated ([10,1,10,1,10,1] is six
// elements, the same max, and the same eight answers). Once `n` is the max, the
// question is "which of 1..n are absent", which is "have I seen this?" asked n
// times — a Set. Duplicates then stop mattering, because membership doesn't count.
// ONE approach, deliberately. An includes()-per-candidate brute is a genuine
// second approach to the SET, but the Set lesson already has a full two-approach
// module in #30 Unique Characters; repeating it here would crowd out the three
// things that are specific to this problem — max-vs-length, duplicates as noise,
// and the ascending order you get for free by walking the search space instead of
// the data. The demo spends itself on those instead.
import { el, esc, mountDebugger } from "../shared.js";

// Provenance. The first five are freeCodeCamp's, in the grader's order, minus one:
// the official test #5 SAYS findMissingNumbers([3,1,4,1,5,9]) should be [2,6,7,8],
// but the testString it actually asserts is a verbatim copy of test #2
// (assert.deepEqual(findMissingNumbers([1, 2, 3, 4, 5]), []);). So [3,1,4,1,5,9] is
// never really graded — it is carried here as OURS, on its own merits: unsorted,
// duplicated, and with a three-wide gap that runs to the top of the range.
// Also ours: [5], the degenerate case where the array contributes exactly one
// present number and the max does all the work ([1,2,3,4] out of a one-element in).
const OFFICIAL = [
  [1, 3, 5],                  // → [2, 4]                  sparse, sorted, interior gaps
  [1, 2, 3, 4, 5],            // → []                      the "nothing missing" rule
  [1, 10],                    // → [2, 3, 4, 5, 6, 7, 8, 9]  length 2, max 10
  [10, 1, 10, 1, 10, 1],      // → [2, 3, 4, 5, 6, 7, 8, 9]  length 6, same answer
  [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 6, 8, 9, 3, 2, 10, 7, 4], // → [11]
];
const CASES = [...OFFICIAL, [3, 1, 4, 1, 5, 9], [5]];

// Display caps, all for the same reason: the field is freeform, so a stray keypress
// can ask for a range nobody wants rendered. STRIP_MAX bounds what the parser will
// accept at all — it also keeps Math.max(...arr) away from the argument-count limit
// and the walk away from a billion iterations. STRIP_CAP bounds how many boxes get
// drawn once a legal-but-large max gets through, and TEXT_CAP does the same for the
// two inline arrays. Every cap announces its overflow rather than hiding it; the
// computed answer is never truncated, only its rendering.
const STRIP_MAX = 999;
const STRIP_CAP = 120;
const TEXT_CAP = 40;

const fmt = (a) => `[${a.join(", ")}]`;
const fmtCap = (a) => (a.length <= TEXT_CAP ? fmt(a) : `[${a.slice(0, TEXT_CAP).join(", ")}, … +${a.length - TEXT_CAP} more]`);

// Brackets are stripped rather than rejected so a chip's own text can be pasted back
// in. Anything that isn't an integer in 1..STRIP_MAX is set aside and reported, not
// silently clamped — a clamp would answer a question the user didn't ask.
function parse(text) {
  const toks = String(text).replace(/[[\]]/g, " ").split(/[\s,]+/).filter(Boolean);
  const kept = [], dropped = [];
  for (const t of toks) {
    const v = Number(t);
    if (Number.isInteger(v) && v >= 1 && v <= STRIP_MAX) kept.push(v); else dropped.push(t);
  }
  return { kept, dropped };
}

// The walk itself, bounded. Called with `n` it IS the solution; called with
// arr.length it is what the misreading would have answered — the same code
// stopped at the wrong place, which is why the divergence is a fact on screen
// rather than a claim in the prose.
function walkTo(seen, limit) {
  const out = [];
  for (let k = 1; k <= limit; k++) if (!seen.has(k)) out.push(k);
  return out;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mn-wrap { display:flex; flex-direction:column; gap:12px; }
    .mn-ans { font:700 13px var(--mono); padding:6px 11px; border-radius:8px;
              border:1px solid var(--accent); color:var(--accent);
              background:color-mix(in srgb, var(--accent) 12%, transparent); }
    .mn-badges { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .mn-b { font:12px var(--mono); color:var(--muted); padding:4px 10px; border-radius:7px;
            border:1px solid var(--border); background:var(--panel-2); }
    .mn-b b { font-size:14px; color:var(--text); }
    .mn-b.split { border-color:var(--warn); color:var(--warn); }
    .mn-b.split b { color:var(--warn); }
    .mn-vs { font:12px var(--sans); color:var(--muted); }
    .mn-in { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
    .mn-v { font:700 12px var(--mono); padding:4px 8px; border-radius:6px;
            border:1px solid var(--border); background:var(--panel-2); }
    .mn-v.rep { opacity:.32; border-style:dashed; }
    .mn-strip { display:flex; flex-wrap:wrap; gap:4px; align-items:flex-start; }
    .mn-cell { width:34px; border-radius:7px; border:1px solid var(--border);
               background:var(--panel-2); padding:4px 0 2px; text-align:center; }
    .mn-cell .mn-n { display:block; font:700 13px var(--mono); }
    .mn-cell .mn-d { display:block; font:9px var(--mono); line-height:9px; height:9px; letter-spacing:1px; }
    .mn-cell.lit { border-color:var(--good); }
    .mn-cell.lit .mn-n, .mn-cell.lit .mn-d { color:var(--good); }
    .mn-cell.dark { border-color:color-mix(in srgb, var(--danger) 55%, var(--border));
                    background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .mn-cell.dark .mn-n { color:var(--danger); }
    .mn-cell.ahead { opacity:.22; }
    .mn-res { display:flex; flex-wrap:wrap; gap:4px; align-items:center; min-height:26px; }
    .mn-r { font:700 12px var(--mono); padding:4px 8px; border-radius:6px;
            border:1px solid var(--danger); color:var(--danger);
            background:color-mix(in srgb, var(--danger) 12%, transparent); }
    .mn-drop { font:12px var(--sans); color:var(--warn); }
  `));
}

function mount(host) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = fmt(CASES[3]); inp.style.width = "300px";
  ctl.append(el("span", "ctl-label", "arr ="), inp, el("span", "ctl-label", `(integers 1–${STRIP_MAX}, any separator)`));

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", fmt(c));
    b.onclick = () => { inp.value = fmt(c); walk = null; render(); };
    pre.append(b);
  });

  // The walk slider lives OUTSIDE the re-rendered region so dragging it doesn't
  // rebuild (and reset) itself. `walk` is the k the walk has reached; null means
  // "all the way", which is what a fresh input should show.
  let walk = null;
  const scrub = el("div", "controls");
  const sc = el("input"); sc.type = "range"; sc.min = 0; sc.style.flex = "1"; sc.style.minWidth = "150px";
  const scLab = el("span", "ctl-label", "");
  scrub.append(el("span", "ctl-label", "walk k ="), sc, scLab);
  sc.oninput = () => { walk = +sc.value; render(); };

  const out = el("div");
  host.append(ctl, pre, scrub, out);
  inp.oninput = () => { walk = null; render(); };
  render();

  function render() {
    const { kept, dropped } = parse(inp.value);
    const seen = new Set(kept);
    const n = kept.length ? Math.max(...kept) : 0;
    const missing = walkTo(seen, n);
    const tally = new Map();
    kept.forEach((v) => tally.set(v, (tally.get(v) || 0) + 1));

    sc.max = Math.max(1, n);
    if (walk === null || walk > n) walk = n;
    sc.value = walk;
    scLab.textContent = n ? `${walk} / ${n}` : "—";
    sc.disabled = n === 0;

    out.innerHTML = "";
    const wrap = el("div", "mn-wrap");

    wrap.append(el("div", "result-line",
      `<span class="mn-ans">findMissingNumbers(${esc(fmtCap(kept))}) → ${esc(fmtCap(missing))}</span>` +
      (dropped.length ? `<span class="mn-drop">ignored: ${dropped.map((d) => `<b>${esc(d)}</b>`).join(", ")}</span>` : "")));

    if (!kept.length) {
      wrap.append(el("div", "note", `Nothing to work with yet — type a few integers, or press a chip. The statement promises an array of integers <i>from 1 to n</i>, so an empty input isn't a case the function has to answer; it is only here because a text field can always be emptied.`));
      out.append(wrap); return;
    }

    // Badge pair: the whole problem in two numbers. The `.split` tint fires exactly
    // when the arr.length misreading would change the answer.
    const diff = kept.length !== n;
    const lenAns = walkTo(seen, kept.length);
    wrap.append(el("div", "mn-badges",
      `<span class="mn-b">arr.length = <b>${kept.length}</b></span>` +
      `<span class="mn-b${diff ? " split" : ""}">n = max(arr) = <b>${n}</b></span>` +
      `<span class="mn-vs">${diff
        ? `different, so <code class='inl'>arr.length</code> in place of the max would have walked to <b>${kept.length}</b> and answered <b>${esc(fmt(lenAns))}</b>`
        : `equal on this input — which is why <code class='inl'>arr.length</code> passes a contiguous test case and then fails everything else`}</span>`));

    const inrow = el("div", "mn-in");
    const so_far = new Set();
    kept.slice(0, STRIP_CAP).forEach((v) => {
      const rep = so_far.has(v); so_far.add(v);
      inrow.append(el("span", "mn-v" + (rep ? " rep" : ""), String(v)));
    });
    if (kept.length > STRIP_CAP) inrow.append(el("span", "more", `+${kept.length - STRIP_CAP} more`));
    inrow.append(el("span", "more", `new Set(arr) → ${seen.size} distinct`));
    wrap.append(inrow);
    wrap.append(el("div", "muted", `The faded values are repeats: <code class='inl'>new Set(arr)</code> drops them on a member that is already there, so <b>${kept.length - seen.size}</b> of the ${kept.length} element${kept.length === 1 ? "" : "s"} contribute${kept.length - seen.size === 1 ? "s" : ""} nothing. Each dot under a cell below is one occurrence feeding into it.`));

    const cap = Math.min(n, STRIP_CAP);
    const strip = el("div", "mn-strip");
    for (let k = 1; k <= cap; k++) {
      const c = tally.get(k) || 0;
      strip.append(el("div", `mn-cell ${c ? "lit" : "dark"}${k > walk ? " ahead" : ""}`,
        `<span class="mn-n">${k}</span><span class="mn-d">${c > 4 ? "••••+" : "•".repeat(c)}</span>`));
    }
    if (n > cap) strip.append(el("span", "more", `+${n - cap} more cells`));
    wrap.append(strip);

    const shown = missing.filter((m) => m <= walk);
    const res = el("div", "mn-res");
    if (!shown.length) res.append(el("span", "muted", missing.length ? "(the walk hasn't reached a gap yet)" : "(empty — nothing between 1 and n is missing)"));
    shown.slice(0, STRIP_CAP).forEach((m) => res.append(el("span", "mn-r", String(m))));
    if (shown.length > STRIP_CAP) res.append(el("span", "more", `+${shown.length - STRIP_CAP} more`));
    wrap.append(res);
    wrap.append(el("div", "muted", `The result fills <b>left to right</b> because <code class='inl'>k</code> only ever goes up. "The returned array should be in ascending order" is therefore a rule that needs no code — and a reflexive <code class='inl'>.sort()</code> here would have been <b>#309 Number Sort</b> all over again, since the default comparator sorts numbers as text and puts <code class='inl'>11</code> before <code class='inl'>2</code>. Drag the slider to watch the walk.`));

    wrap.append(el("div", "note", noteFor(kept, n, seen, missing, lenAns)));
    out.append(wrap);
  }
}

function noteFor(kept, n, seen, missing, lenAns) {
  const dups = kept.length - seen.size;
  const firstRep = kept.find((v, i) => kept.indexOf(v) !== i);
  const sorted = kept.every((v, i) => !i || kept[i - 1] <= v);
  const longer = missing.length > kept.length;
  if (!missing.length)
    return `Every one of 1…${n} is present, so the loop pushes nothing and <code class='inl'>missing</code> is returned exactly as it was declared. "If no integers are missing, return an empty array" is the third stated rule, and it costs <b>zero lines</b> — there is no <code class='inl'>if (missing.length === 0)</code> anywhere, because an empty array is what a loop that never pushes leaves behind. Notice also that this is the shape where <code class='inl'>arr.length</code> and <code class='inl'>max(arr)</code> agree${dups ? `… except they don't here, because the duplicates inflate the length` : ` — a contiguous array is the one input that hides the difference, and freeCodeCamp opens with one`}.`;
  if (dups > 0)
    return `<b>${dups}</b> of the ${kept.length} element${kept.length === 1 ? "" : "s"} ${dups === 1 ? "is a repeat" : "are repeats"}, and the Set makes that a non-event: <code class='inl'>seen.has(k)</code> asks whether <i>k</i> appeared, never how often. That is the difference between checking membership and counting — a solution that tallied occurrences, or compared <code class='inl'>arr.length</code> against the range, has to invent a rule for the second <b>${firstRep}</b> that the statement never gave it. ${sorted ? `This array happens to arrive in order, but nothing below leans on that` : `The array is also unsorted, and nothing here cares`}: the walk goes over <b>1…${n}</b>, the <i>search space</i>, so the order the data arrived in was never load-bearing.`;
  if (kept.length < n)
    return `${kept.length} element${kept.length === 1 ? "" : "s"}, but <code class='inl'>n</code> is <b>${n}</b> — and the answer runs to <b>${missing.length}</b> number${missing.length === 1 ? "" : "s"}${longer ? `, which is longer than the input itself` : ``}. This is the reading that decides the problem. Walk to <code class='inl'>arr.length</code> instead and you stop at <b>${kept.length}</b>, returning <b>${fmt(lenAns)}</b>${lenAns.length ? `` : ` — the empty array, confidently wrong`}. ${kept.length === 1 ? `With a single element the point is at its starkest: the array contributes exactly one present number and the maximum does all of the rest of the work.` : `The array is a <i>sample</i> of 1…n, not a measurement of it; only its largest member says how far the range goes.`}`;
  return `${kept.length} distinct elements and a maximum of <b>${n}</b>, so the length and the max agree — but only by coincidence, and the walk still runs over <b>1…${n}</b> rather than over the array. ${missing.length} gap${missing.length === 1 ? "" : "s"} showed up: <b>${fmt(missing)}</b>. Change one value to something larger and watch the two badges above come apart.`;
}

// ── STEP — the Set built in one move, then the walk over 1..n one k at a time ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">findMissingNumbers</span>(<span class="tok" data-t="arr">arr</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> seen = <span class="tok" data-t="set"><span class="k">new</span> <span class="fn">Set</span>(arr)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> n = <span class="tok" data-t="max">Math.<span class="fn">max</span>(...arr)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="out">missing</span> = [];` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="k">k = <span class="nu">1</span>; k &lt;= n; k++</span>) {` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="has">!seen.<span class="fn">has</span>(k)</span>) <span class="tok" data-t="push">missing.<span class="fn">push</span>(k)</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">missing</span>;` },
  { ln: 9, html: `}` },
];

function trace(caseNo) {
  const arr = CASES[Math.max(0, Math.min(CASES.length - 1, caseNo - 1))];
  const steps = [];
  let seen, n, missing = [], k, hits = 0;

  // Scope by omission, and by line number: `seen` does not exist until line 2 has
  // run, `missing` until line 4. `arr` is a parameter, so its struct is there from
  // the first step and stays for the call. `k` is the one with a closing bracket
  // as well as an opening one — it is declared in the loop header, so it is live
  // on lines 5-7 and gone again by the return on line 8.
  const S = (line, note, x = {}) => {
    const vars = { "arr.length": arr.length };
    if (line >= 2) vars["seen.size"] = seen.size;
    if (line >= 3) vars["n (= max)"] = n;
    if (line >= 5 && line <= 7) vars.k = k;
    const firstAt = new Map();
    const structs = [{
      label: "arr", items: arr.map((v, i) => {
        if (!firstAt.has(v)) { firstAt.set(v, i); return String(v); }
        return `${v} ↩`;  // a repeat: the Set already holds it, so it adds nothing
      }),
    }];
    if (line >= 2) structs.push({ label: "seen", items: [...seen].map((v) => (line >= 5 && line <= 7 && v === k ? `▶ ${v}` : String(v))) });
    if (line >= 4) structs.push({ label: "missing", items: missing.map(String), newest: true });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `findMissingNumbers(${fmt(arr)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const repeats = arr.length - new Set(arr).size;
  S(1, `<b>${fmt(arr)}</b>. Three promises come with it: the array may be unsorted, it may contain duplicates, and <code class='inl'>n</code> is its <b>largest</b> member — not its length. A statement that goes out of its way to disclaim order and uniqueness is telling you the input is a <b>set in disguise</b>, so the first move is to make it one.`, { focus: "arr" });

  seen = new Set(arr);
  S(2, repeats
    ? `<code class='inl'>new Set(arr)</code> takes ${arr.length} values and keeps <b>${seen.size}</b>. The ${repeats} marked <b>↩</b> landed on members that were already there — which is the entire handling of duplicates, and it is handling by <i>not caring</i>. From here the only question asked of the data is "is it in?", and "how many times" has no way to matter.`
    : `<code class='inl'>new Set(arr)</code> keeps all <b>${seen.size}</b> values — nothing repeats in this one. Build it anyway: it turns each of the n membership questions below from a scan of the array into an O(1) lookup, and it is what makes the duplicate-heavy cases cost nothing extra.`,
    { focus: "set", changed: ["seen.size"] });

  n = Math.max(...arr);
  S(3, n === arr.length
    ? `<code class='inl'>Math.max(...arr)</code> is <b>${n}</b>, which happens to equal <code class='inl'>arr.length</code> here. That coincidence is the trap — every contiguous array makes the wrong reading look right, and two of freeCodeCamp's own cases are contiguous.`
    : `<code class='inl'>Math.max(...arr)</code> is <b>${n}</b>, while <code class='inl'>arr.length</code> is <b>${arr.length}</b>. The range to search is <b>1…${n}</b>, so the loop below runs ${n} times over an array of ${arr.length}${n > arr.length ? ` — more iterations than there are elements` : ` — fewer iterations than there are elements`}. Reach for the length here and the walk stops in the wrong place.`,
    { focus: "max", changed: ["n (= max)"] });

  S(4, `An empty accumulator. Worth saying now, because it is the whole implementation of the third rule: "if no integers are missing, return an empty array" is satisfied by a loop that pushes nothing, so no branch is ever written for it.`, { focus: "out" });

  k = 1;  // the loop header's initialiser has run by the time this step is shown
  S(5, `The loop is over <b>1…${n}</b> — the <i>search space</i> — and not over <code class='inl'>arr</code>. That choice is why the rest is easy: iterate the data instead and you end up sorting it, comparing neighbours, and hunting gaps between them, which works but has an off-by-one at each end. Here every candidate is visited exactly once, in order.`, { focus: "k" });

  for (k = 1; k <= n; k++) {
    const has = seen.has(k);
    if (!has) missing.push(k);
    // Each branch makes its full argument once and then gets out of the way — a
    // run of ten identical paragraphs teaches nothing the first one didn't.
    hits += has ? 1 : 0;
    const note = has
      ? (hits === 1
        ? `<b>${k}</b> is in the set, so nothing is pushed. It appears <b>${arr.filter((v) => v === k).length}</b>× in the array, and the lookup costs exactly the same either way — membership has no opinion about multiplicity, which is the whole reason the duplicates never needed handling.`
        : `<b>${k}</b> is present too (<b>${arr.filter((v) => v === k).length}</b>× in the array). One hash probe, no scan of <code class='inl'>arr</code>.`)
      : (missing.length === 1
        ? `<b>${k}</b> is absent — the first gap, so it is pushed. Note <i>where</i> it lands: at the end, and every later push will land after it, because <code class='inl'>k</code> only ever increases. "The returned array should be in ascending order" is therefore already satisfied — a consequence of the iteration rather than a step. Reaching for <code class='inl'>.sort()</code> here would be <b>#309 Number Sort</b> repeating itself: the default comparator sorts numbers as text and would put <code class='inl'>11</code> before <code class='inl'>2</code>.`
        : `<b>${k}</b> is absent — pushed, landing after <b>${missing[missing.length - 2]}</b>. The result stays sorted without anything sorting it.`);
    S(6, note, { focus: has ? "has" : "push", changed: has ? [] : ["missing"], eval: { expr: `!seen.has(${k})`, val: !has } });
  }

  S(8, missing.length
    ? `The walk reached <b>${n}</b>. <b>Return ${fmt(missing)}</b> — already ascending, never sorted, and indifferent to both the order the input arrived in and how many times anything repeated.`
    : `The walk reached <b>${n}</b> without finding a gap, so <code class='inl'>missing</code> is still the empty array it started as. <b>Return []</b> — the "nothing is missing" rule, discharged by writing no code for it.`,
    { focus: "ret", done: true, result: fmt(missing), ret: { value: fmt(missing) } });
  return steps;
}

export default {
  n: 34, id: "missing", title: "Missing Numbers", dates: ["2025-09-13"],
  statement: `Given an array of integers from 1 to <code class="inl">n</code>, inclusive, return an array of all the missing integers between 1 and <code class="inl">n</code> — where <b><code class="inl">n</code> is the largest number in the given array</b>. The array <b>may be unsorted</b> and <b>may contain duplicates</b>; the returned array must be in <b>ascending order</b>, and empty if nothing is missing. <span class="rule">Example: <code class="inl">findMissingNumbers([1, 3, 5])</code> → <code class="inl">[2, 4]</code>, and <code class="inl">findMissingNumbers([10, 1, 10, 1, 10, 1])</code> → <code class="inl">[2, 3, 4, 5, 6, 7, 8, 9]</code> — six elements in, eight out.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(len + n) — one Set, one walk",
      approach: `The parenthetical does the damage: <b>"where n is the largest number in the given array"</b>. It is easy to read <code class='inl'>n</code> as the array's length, and on a contiguous array the two are the same number — which is exactly why that misreading passes <code class='inl'>[1, 3, 5]</code>'s neighbours and then falls apart on <code class='inl'>[1, 10]</code>, two elements whose answer is eight numbers long. Take the statement literally and the question becomes <i>which of 1…n are absent</i>, which is "have I seen this?" asked n times. That is a <b>Set</b>: <code class='inl'>new Set(arr)</code> once, then <code class='inl'>seen.has(k)</code> in O(1) per candidate. The two disclaimers in the bullets are then handled by not handling them. <b>"May contain duplicates"</b> stops mattering because membership doesn't count — <code class='inl'>[10,1,10,1,10,1]</code> and <code class='inl'>[1,10]</code> collapse to the same two members and must therefore give the same answer, which they do. <b>"May be unsorted"</b> stops mattering because the loop iterates the <i>search space</i> <code class='inl'>1…n</code>, not the data; the array's order was never read. And the last two rules cost nothing at all. <b>Ascending order</b> falls out of <code class='inl'>k</code> going up — reaching for <code class='inl'>.sort()</code> here would be <b>#309 Number Sort</b> repeating itself, since the default comparator would place <code class='inl'>11</code> before <code class='inl'>2</code>. <b>"Return an empty array if none are missing"</b> falls out of a loop that pushes nothing. Type your own array and watch the <code class='inl'>arr.length</code> and <code class='inl'>max(arr)</code> badges come apart.`,
      code: `// n is the array's MAXIMUM, not its length: [1, 10] is two elements and eight
// missing numbers. Duplicates are noise once membership replaces counting.
function findMissingNumbers(arr: number[]): number[] {
  // "May contain duplicates" — a Set answers "did this appear?" and has no
  // opinion about how often, so [10,1,10,1,10,1] reduces to the members of [1,10].
  const seen = new Set(arr);
  const n = Math.max(...arr);
  const missing: number[] = [];
  // Walk the SEARCH SPACE (1..n), not the data. Iterating arr instead means
  // sorting it, diffing neighbours and hunting gaps — correct, but with an
  // off-by-one at each end. Because k only ever increases, the results come out
  // in ascending order for free: no .sort(), which on numbers would be
  // lexicographic and would put 11 before 2.
  for (let k = 1; k <= n; k++) {
    if (!seen.has(k)) missing.push(k);
  }
  // "If no integers are missing, return an empty array" — a loop that pushes
  // nothing already leaves one behind, so there is no branch for it.
  return missing;
}`,
      mount,
    },
    {
      name: "Step through", cost: "one k at a time",
      approach: `The Set is built in a single move so you can see the collapse rather than 18 insertions, and then the walk runs one candidate at a time. Start on case <b>4</b>, <code class='inl'>[10,1,10,1,10,1]</code>, where six elements reduce to two and the <b>↩</b> marks show which ones added nothing. Case <b>3</b> is its twin, <code class='inl'>[1, 10]</code> — a different array with the same Set and therefore the same answer. Case <b>7</b> is <code class='inl'>[5]</code>: one element, ten steps, four missing numbers. Case <b>2</b> ends with the empty return that nobody wrote code for, and case <b>5</b> is the long officially-tested one where a single gap hides at <b>11</b>. Watch <code class='inl'>arr.length</code> and <code class='inl'>n (= max)</code> in the panel — the loop bound is the second one. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 4, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: CASES.map((c, i) => `${i + 1}:${fmt(c)}`).join("  ") },
      }),
    },
  ],
};
