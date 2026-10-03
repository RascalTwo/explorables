// #44 · String Mirror — strip to letters, reverse one side, compare; the bullets are the spec.
// "Mirror" sounds like palindrome and is not: it is a relation BETWEEN two strings,
// so the question is whether str2 read backwards says what str1 says. The three
// bullets are three decisions, and each one has a wrong answer that still looks fine.
// "Ignore all non-alphabetical characters" means the strings are filtered BEFORE the
// comparison, so "Hello World" mirrors "dlroW-olleH" (the dash and the space are both
// gone) and a plain reverse-and-compare fails official cases 6 and 7. "Treat uppercase
// and lowercase as distinct" means no .toLowerCase() — and that is what the "Mirror" /
// "rorrim" case is for: fold the case and a false becomes a true. And "RaceCar" is a
// palindrome only if you fold the case, so it does NOT mirror itself.
// ONE approach, deliberately. Filter, reverse, compare and a two-pointer walk that
// skips non-letters from both ends are the same test written two ways; the two-pointer
// saves two allocations and an early exit on strings that fit on one line, so the gap
// is a constant factor nobody could see (CONTRIBUTING Tier 3 §1-3). The demo instead
// lets you BREAK each bullet and see which official case catches it.
// Flip the mode to "ignore case" on Mirror / rorrim (official case 5), then to "keep
// non-letters" on Hello World / dlroW-olleH (case 6): each wrong mode fails exactly the
// official cases built to catch it.
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep, DbgStruct } from "../shared.js";

// The 7 official freeCodeCamp cases in the grader's order, then four of ours.
//   "ab1" / "ba2" — ours. The digits differ and the answer is still true: digits are
//     non-alphabetical, so they are dropped like punctuation. Keep-everything mode
//     fails it.
//   "123" / "!!!" — ours. No letters on either side: both filtered strings are empty
//     and "" === "" is true. Vacuous, but it is what the statement as written says.
//   "abc" / "cb" — ours. Different letter counts: the reversal is shorter, so the
//     comparison fails on length before any character does.
//   "Café" / "faC" — ours, and a reading of the statement rather than a fact about it.
//     "Alphabetical" here is taken as a-z (the sibling #43 says a-z outright), so the
//     é is ignored and this is true. A Unicode-aware filter (\p{L}) would say false.
const OFFICIAL: [string, string, boolean][] = [
  ["helloworld", "helloworld", false],
  ["Hello World", "dlroW olleH", true],
  ["RaceCar", "raCecaR", true],
  ["RaceCar", "RaceCar", false],
  ["Mirror", "rorrim", false],
  ["Hello World", "dlroW-olleH", true],
  ["Hello World", "!dlroW !olleH", true],
];
const CASES: [string, string][] = [
  ...OFFICIAL.map(([a, b]): [string, string] => [a, b]),
  ["ab1", "ba2"], ["123", "!!!"], ["abc", "cb"], ["Café", "faC"],
];
const EXPECTED = new Map(OFFICIAL.map(([a, b, r]) => [`${a}\u0000${b}`, r]));

const letters = (s: string) => [...s].filter((c) => /[a-z]/i.test(c));

// The three readings of the statement. Only the first is the spec; the other two each
// break one bullet, and the demo says which official case catches it.
const MODES: { label: string; why: string; seqs: (s1: string, s2: string) => { a: string[]; r: string[] }; eq: (x: string, y: string) => boolean }[] = [
  {
    label: "letters only, case matters",
    why: "the spec",
    seqs: (s1, s2) => ({ a: letters(s1), r: letters(s2).reverse() }),
    eq: (x, y) => x === y,
  },
  {
    label: "ignore case",
    why: "breaks bullet 2",
    seqs: (s1, s2) => ({ a: letters(s1), r: letters(s2).reverse() }),
    eq: (x, y) => x.toLowerCase() === y.toLowerCase(),
  },
  {
    label: "keep non-letters",
    why: "breaks bullet 3",
    seqs: (s1, s2) => ({ a: [...s1], r: [...s2].reverse() }),
    eq: (x, y) => x === y,
  },
];

function run(s1: string, s2: string, mode: number) {
  const m = MODES[mode]!;
  const { a, r } = m.seqs(s1, s2);
  const cols = Math.max(a.length, r.length);
  const ok = Array.from({ length: cols }, (_, i) => i < a.length && i < r.length && m.eq(a[i]!, r[i]!));
  return { a, r, ok, result: a.length === r.length && ok.every(Boolean) };
}
const isMirror = (s1: string, s2: string) => run(s1, s2, 0).result;

const glyph = (c: string) => (/\s/.test(c) ? "·" : esc(c));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mr-wrap { display:flex; flex-direction:column; gap:12px; }
    .mr-strs { display:flex; flex-direction:column; gap:7px; }
    .mr-row { display:flex; align-items:center; gap:10px; }
    .mr-lbl { font:700 11px var(--mono); color:var(--muted); min-width:96px; }
    .mr-tiles { display:flex; flex-wrap:wrap; gap:3px; min-height:30px; }
    .mr-t { min-width:26px; height:30px; padding:0 5px; display:flex; align-items:center; justify-content:center; font:800 14px var(--mono); border-radius:6px; border:1px solid var(--c1); color:var(--c1); background:color-mix(in srgb, var(--c1) 12%, transparent); }
    .mr-t.drop { border-style:dashed; border-color:var(--border); color:var(--muted); background:transparent; text-decoration:line-through; opacity:.6; }
    .mr-pairs { display:flex; flex-wrap:wrap; gap:6px; padding:10px; border:1px solid var(--border); border-radius:10px; background:var(--panel-2); }
    .mr-col { display:flex; flex-direction:column; align-items:center; gap:2px; }
    .mr-col .c { min-width:28px; height:30px; padding:0 4px; display:flex; align-items:center; justify-content:center; font:800 14px var(--mono); border-radius:6px; background:var(--panel); border:1px solid var(--border); color:var(--text); }
    .mr-col .eqs { font:700 11px var(--mono); color:var(--good); }
    .mr-col.bad .c { border-color:var(--danger); color:var(--danger); background:color-mix(in srgb, var(--danger) 12%, transparent); }
    .mr-col.bad .eqs { color:var(--danger); }
    .mr-col.fold .c { border-color:var(--warn); color:var(--warn); }
    .mr-col.fold .eqs { color:var(--warn); }
    .mr-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .mr-cmp b { font-family:var(--mono); color:var(--text); }
    .mr-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .mr-cmp.split b { color:var(--danger); }
    .mr-pre { white-space:pre; }
  `));
}

function mount(host: HTMLElement) {
  ensureStyle();
  let mode = 0;

  const ctl = el("div", "controls");
  const i1 = el("input"); i1.type = "text"; i1.value = "Hello World"; i1.style.width = "200px";
  const i2 = el("input"); i2.type = "text"; i2.value = "dlroW-olleH"; i2.style.width = "200px";
  ctl.append(el("span", "ctl-label", "str1 ="), i1, el("span", "ctl-label", "str2 ="), i2);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach(([a, b], i) => {
    const c = el("button", "chip mr-pre", `"${esc(a)}" , "${esc(b)}"`);
    c.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { i1.value = a; i2.value = b; render(); };
    pre.append(c);
  });

  const tog = el("div", "controls");
  tog.append(el("span", "ctl-label", "reading"));
  const togChips = MODES.map((m, i) => {
    const c = el("button", "chip " + (i ? "bad" : "good"), `${esc(m.label)} <span class="muted">· ${m.why}</span>`);
    c.onclick = () => { mode = i; render(); };
    tog.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, tog, out);
  i1.oninput = i2.oninput = () => render();
  render();

  function render() {
    togChips.forEach((c, i) => c.classList.toggle("on", i === mode));
    const s1 = String(i1.value), s2 = String(i2.value);
    const g = run(s1, s2, mode);
    const spec = isMirror(s1, s2);
    const known = EXPECTED.get(`${s1}\u0000${s2}`);
    const want = known ?? spec;
    const official = known !== undefined;

    out.innerHTML = "";
    const wrap = el("div", "mr-wrap");

    const line = el("div", "result-line");
    line.append(el("span", `badge ${g.result === want ? "ok" : "no"}`, `isMirror("${esc(s1)}", "${esc(s2)}") → ${g.result}`));
    line.append(el("span", "mr-cmp" + (g.result === want ? "" : " split"),
      g.result === want
        ? (official ? `matches freeCodeCamp's expected <b>${want}</b>` : `the spec reading also returns <b>${want}</b>`)
        : `${official ? "freeCodeCamp expects" : "the spec reading returns"} <b>${want}</b> — this reading is wrong`));
    wrap.append(line);

    // The two inputs, with the characters the filter drops struck through — in
    // keep-non-letters mode nothing is dropped, which is the point of that mode.
    const strs = el("div", "mr-strs");
    [["str1", s1], ["str2", s2]].forEach(([name, s]) => {
      const row = el("div", "mr-row", `<span class="mr-lbl">${name}</span>`);
      const tiles = el("div", "mr-tiles");
      [...s!].forEach((c) => tiles.append(el("div", "mr-t" + (mode !== 2 && !/[a-z]/i.test(c) ? " drop" : ""), glyph(c))));
      if (!s) tiles.append(el("span", "muted", "(empty)"));
      row.append(tiles); strs.append(row);
    });
    wrap.append(strs);

    // str1 along the top; str2 read BACKWARDS underneath. A mirror is a string whose
    // two rows agree in every column.
    const pairs = el("div", "mr-pairs");
    const cols = Math.max(g.a.length, g.r.length);
    for (let i = 0; i < cols; i++) {
      const x = g.a[i], y = g.r[i];
      const fold = g.ok[i] && x !== y;
      const col = el("div", "mr-col" + (!g.ok[i] ? " bad" : fold ? " fold" : ""));
      col.append(el("div", "c", x === undefined ? "∅" : glyph(x)), el("div", "eqs", g.ok[i] ? (fold ? "≈" : "=") : "≠"), el("div", "c", y === undefined ? "∅" : glyph(y)));
      pairs.append(col);
    }
    if (!cols) pairs.append(el("span", "muted", "both sides are empty: nothing to disagree about"));
    wrap.append(pairs);

    wrap.append(el("div", "muted",
      `Top row is <b>str1</b>${mode === 2 ? "" : "'s letters"}; bottom row is <b>str2</b>${mode === 2 ? "" : "'s letters"} read <b>backwards</b>. <code class='inl'>≈</code> (amber) is a pair equal only after folding case; a red column is a disagreement, and <code class='inl'>∅</code> is a side that ran out. Struck-through tiles are removed by the filter.`));
    wrap.append(el("div", "note", noteFor(s1, s2, g, spec, mode)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing, because every
// preset was chosen to land on a different one.
function noteFor(s1: string, s2: string, g: ReturnType<typeof run>, spec: boolean, mode: number) {
  const a = letters(s1).join(""), b = letters(s2).join(""), rev = [...b].reverse().join("");
  const rawMirror = [...s1].join("") === [...s2].reverse().join("");
  const nonAscii = [...(s1 + s2)].filter((c) => /\p{L}/u.test(c) && !/[a-z]/i.test(c));
  if (mode === 1) {
    return g.result === spec
      ? `Folding case here changes nothing — <b>${g.result}</b>, same as the spec — because the two strings either agree exactly or differ in more than case. The reading is wrong but silent on this input. Try <code class='inl'>"Mirror", "rorrim"</code>.`
      : `Folding case turns a <b>${spec}</b> into a <b>${g.result}</b>: <b>${esc(a)}</b> against <b>${esc(rev)}</b> differ <i>only</i> in capitals, and the statement says to treat uppercase and lowercase as <b>distinct</b>. This is what official case 5 (<code class='inl'>"Mirror", "rorrim"</code>) exists to catch, and the amber <code class='inl'>≈</code> columns are exactly the pairs that were forgiven.`;
  }
  if (mode === 2) {
    return g.result === spec
      ? `Keeping every character gives the same <b>${g.result}</b> here, because there is nothing to filter — or whatever is there sits symmetrically. The reading is wrong but silent on this input. Try <code class='inl'>"Hello World", "dlroW-olleH"</code>.`
      : `Without the filter the answer is <b>${g.result}</b> where the spec says <b>${spec}</b>: the punctuation, spaces and digits now have to line up too, and they do not. This is the failure of a plain <code class='inl'>str1 === reverse(str2)</code>, and it is exactly what official cases 6 and 7 (the dash, and the two <code class='inl'>!</code>) exist to catch.`;
  }
  if (a.length !== b.length)
    return `<b>${esc(a) || "∅"}</b> has ${a.length} letter${a.length === 1 ? "" : "s"} and <b>${esc(b) || "∅"}</b> has ${b.length}, so they cannot be mirrors and the comparison fails on <b>length</b> before any character is checked — the <code class='inl'>∅</code> columns are the side that ran out. A mirror is a one-to-one pairing, and a count mismatch rules it out for free.`;
  if (nonAscii.length && spec)
    return `<b>${nonAscii.map((c) => esc(c)).join(" ")}</b> ${nonAscii.length === 1 ? "is" : "are"} a letter in Unicode and not in <code class='inl'>a-z</code>, so the filter drops ${nonAscii.length === 1 ? "it" : "them"} and the rest mirrors cleanly: <b>${spec}</b>. This is a reading of "alphabetical", not a fact about the statement. A Unicode-aware <code class='inl'>/\\p{L}/u</code> filter would keep ${nonAscii.length === 1 ? "it" : "them"} and change the answer. The official set is ASCII throughout, so it never notices.`;
  if (!a && !b)
    return `Neither string has a letter, so the filter empties both and <code class='inl'>"" === ""</code> is <b>true</b>. It is vacuous and it is also what the statement says: nothing is left on either side to disagree. A solution that special-cased "no letters means false" would be inventing a rule.`;
  if (!spec && a === b && rev !== a)
    return `The <i>same</i> letters in the <i>same</i> order — <b>${esc(a)}</b> against <b>${esc(b)}</b> — which is a copy, not a mirror, so <b>false</b>. A mirror needs str2 reversed. ${a.toLowerCase() === [...a].reverse().join("").toLowerCase() ? `(<b>${esc(a)}</b> is a palindrome only if capitals are folded. Case-sensitively its reverse is <b>${esc([...a].reverse().join(""))}</b>, so even <code class='inl'>"RaceCar", "RaceCar"</code> is not a mirror of itself.)` : `Reading it forwards instead of backwards is the mistake this case catches.`}`;
  if (!spec && a.toLowerCase() === rev.toLowerCase())
    return `<b>${esc(a)}</b> against <b>${esc(rev)}</b>: the same letters, only the capitals disagree, and the statement says uppercase and lowercase are <b>distinct</b>. So <b>false</b>. Fold the case and this flips to true — switch the reading to <b>ignore case</b> to watch it happen. The red column is the entire reason <code class='inl'>.toLowerCase()</code> is not in the solution.`;
  if (!spec) {
    const i = g.ok.indexOf(false);
    return `The first disagreement is at position <b>${i + 1}</b>: <b>${esc(g.a[i] ?? "∅")}</b> from str1 against <b>${esc(g.r[i] ?? "∅")}</b> from str2 read backwards, so <b>false</b>. Everything left of that agreed, which is true of most near-misses and is why the loop can stop at the first red column.`;
  }
  if (rawMirror)
    return `A plain mirror: str2 is str1 reversed character for character, so the filter had nothing to remove and a bare <code class='inl'>str1 === [...str2].reverse().join("")</code> would also have said <b>true</b>. Cases like this cannot tell a filter from no filter, which is why the dash and the two <code class='inl'>!</code> cases are in the official set.`;
  const dropped = [...new Set([...(s1 + s2)].filter((c) => !/[a-z]/i.test(c)).map((c) => (c === " " ? "␠" : c)))];
  return `<b>true</b>, and only because of the filter: str1 and str2 are <i>not</i> reverses of each other character for character — the stripped characters (<code class='inl'>${dropped.map((c) => esc(c)).join(" ")}</code>) sit in different places or are different — but their <b>letters</b> are. Both sides collapse to <b>${esc(a)}</b> and <b>${esc(b)}</b>, and <b>${esc(rev)}</b> equals <b>${esc(a)}</b>. Switch the reading to <b>keep non-letters</b> to see the unfiltered comparison fail.`;
}

// ── STEP — the three lines that make the verdict ────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isMirror</span>(<span class="tok" data-t="arg">str1, str2</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="a">a = str1.<span class="fn">replace</span>(/[^a-z]/gi, <span class="st">""</span>)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="b">b = str2.<span class="fn">replace</span>(/[^a-z]/gi, <span class="st">""</span>)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="rev">reversed = [...b].<span class="fn">reverse</span>().<span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="cmp">a === reversed</span>;` },
  { ln: 6, html: `}` },
];

const q = (s: string) => JSON.stringify(s);

// "Hello World | dlroW olleH" -> ["Hello World", "dlroW olleH"]. The separator is the
// first "|"; with none, str2 is empty rather than the trace blowing up.
function parsePair(raw: string): [string, string] {
  const s = String(raw), i = s.indexOf("|");
  return i < 0 ? [s.trim(), ""] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}
const pairLabel = ([a, b]: [string, string]) => `${a} | ${b}`;

function trace(raw: string) {
  const [str1, str2] = parsePair(raw);
  const steps: DbgStep[] = [];
  let a = "", b = "", reversed = "";

  const S = (line: number, note: string, x: { focus?: string | undefined; changed?: string[] | undefined; eval?: { expr: string; val: boolean; } | undefined; done?: boolean | undefined; result?: string | undefined; ret?: { value: boolean; } | undefined } = {}) => {
    const vars: Record<string, unknown> = { str1: q(str1), str2: q(str2) };
    if (line >= 2) vars["a"] = q(a);               // `const a` is line 2
    if (line >= 3) vars["b"] = q(b);               // `const b` is line 3
    if (line >= 4) vars["reversed"] = q(reversed); // `const reversed` is line 4
    // Each struct appears when its line runs and stays, because the thing it draws is
    // still in scope for the rest of the call.
    const structs: DbgStruct[] = [];
    if (line >= 2) structs.push({ label: "a", items: [...a], newest: line === 2 });
    if (line >= 3) structs.push({ label: "b", items: [...b], newest: line === 3 });
    if (line >= 4) structs.push({ label: "reversed", items: [...reversed], newest: line === 4 });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isMirror(${q(str1)}, ${q(str2)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Two strings and a <b>yes/no</b>. A mirror is a relation <i>between</i> the strings — not a palindrome, which is a property of one — so the plan is: reduce each to its letters, read <b>str2</b> backwards, and see whether it says what <b>str1</b> says. The three bullets are the three decisions: filter first, reverse one side, compare <b>exactly</b>.`, { focus: "arg" });

  a = str1.replace(/[^a-z]/gi, "");
  const drop1 = [...str1].length - [...a].length;
  S(2, `${drop1 ? `Removed <b>${drop1}</b> non-letter${drop1 === 1 ? "" : "s"} from <b>str1</b>.` : `Nothing to remove from <b>str1</b>.`} Filtering <i>before</i> comparing is what "ignore all non-alphabetical characters" asks for: a space, a dash and a digit are not part of the answer, so they must not get a vote. <code class='inl'>[^a-z]</code> with the <code class='inl'>i</code> flag is "anything that is not a letter of either case" — and the <code class='inl'>i</code> only widens what counts as a <i>letter</i>; it does not fold the case of what is kept.`,
    { focus: "a", changed: ["a"] });

  b = str2.replace(/[^a-z]/gi, "");
  const drop2 = [...str2].length - [...b].length;
  S(3, `${drop2 ? `Removed <b>${drop2}</b> non-letter${drop2 === 1 ? "" : "s"} from <b>str2</b>` : `Nothing to remove from <b>str2</b>`} — the same filter, applied to <i>each side separately</i>. That is why <code class='inl'>"Hello World"</code> mirrors <code class='inl'>"dlroW-olleH"</code> and <code class='inl'>"!dlroW !olleH"</code> alike: the punctuation is allowed to be different, or in different places, because neither survives to line 5.`,
    { focus: "b", changed: ["b"] });

  reversed = [...b].reverse().join("");
  S(4, `<b>${esc(b) || "(empty)"}</b> reversed is <b>${esc(reversed) || "(empty)"}</b>. Only <b>one</b> side is reversed — reversing both would just compare the strings to each other and make a copy look like a mirror. And note what is <i>not</i> here: no <code class='inl'>.toLowerCase()</code>. The statement says uppercase and lowercase are <b>distinct</b>, so the reversal keeps every capital exactly where it was.`,
    { focus: "rev", changed: ["reversed"] });

  const result = a === reversed;
  let why: string;
  if (result) why = a === "" ? `Both sides filtered to nothing, and <code class='inl'>"" === ""</code> is true — vacuous, but it is what the statement says.` : `Every letter matched its partner, capitals included.`;
  else if (a.length !== reversed.length) why = `The lengths differ (<b>${a.length}</b> against <b>${reversed.length}</b>), so no pairing exists.`;
  else if (a.toLowerCase() === reversed.toLowerCase()) why = `They differ <i>only</i> in capitals, and capitals are distinct here. A <code class='inl'>.toLowerCase()</code> would flip this to true, which is the bug this case is for.`;
  else why = a === b ? `<b>${esc(b)}</b> was never reversed — it is a copy, and a copy is not a mirror.` : `At least one letter disagrees with its partner.`;
  S(5, `<b>${esc(a) || "(empty)"}</b> against <b>${esc(reversed) || "(empty)"}</b>: <b>${result}</b>. ${why} <code class='inl'>===</code> on strings is a case-sensitive, whole-string comparison, which is exactly the rule asked for.`,
    { focus: "cmp", eval: { expr: `a === reversed`, val: result }, done: true, result: String(result), ret: { value: result } });
  return steps;
}

export default {
  n: 44, id: "stringmirror", title: "String Mirror", dates: ["2025-09-23"],
  statement: `Given two strings, determine if the <b>second is a mirror of the first</b>. A string is a mirror if it contains the <b>same letters in reverse order</b>; uppercase and lowercase letters are <b>distinct</b>; <b>ignore all non-alphabetical characters</b>. <span class="rule">Example: <code class="inl">isMirror("Hello World", "dlroW-olleH")</code> → <code class="inl">true</code> — the dash and the space are ignored — but <code class="inl">isMirror("Mirror", "rorrim")</code> → <code class="inl">false</code>, because the capital <code class="inl">M</code> is not an <code class="inl">m</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — filter, reverse, compare",
      approach: `Three bullets, three decisions, each with a wrong answer that still looks like code. <b>Ignore non-letters</b> means filter <i>both</i> strings <i>before</i> comparing, so <code class='inl'>"Hello World"</code> mirrors <code class='inl'>"dlroW-olleH"</code> and a plain <code class='inl'>str1 === reverse(str2)</code> fails official cases 6 and 7. <b>Distinct case</b> means no <code class='inl'>.toLowerCase()</code> anywhere, and official case 5 (<code class='inl'>"Mirror", "rorrim"</code>) is there to punish it: the letters agree and only the capital does not. The same rule makes <code class='inl'>"RaceCar"</code> <i>not</i> a mirror of itself — it is a palindrome only after case-folding. And <b>reverse one side</b>, not both: reverse both and a copy would look like a mirror, which is official case 1. The three readings in the demo each break one bullet and fail exactly the official cases built for it, so flip them on the right chip. One more thing no test asks: <i>alphabetical</i> is taken as <code class='inl'>a-z</code>, so <code class='inl'>"Café", "faC"</code> (ours) is true; a Unicode filter would say false. A two-pointer walk that skips non-letters from both ends is the same test with fewer allocations and no way to see a difference on strings this size, so it is not a second approach.`,
      code: `// Filter both sides to letters, reverse one, compare exactly. No case folding:
// "Mirror" vs "rorrim" differ only in a capital, and capitals are distinct here.
function isMirror(str1: string, str2: string): boolean {
  const a = str1.replace(/[^a-z]/gi, "");  // i = what counts as a letter, NOT a case fold
  const b = str2.replace(/[^a-z]/gi, "");
  const reversed = [...b].reverse().join("");  // reverse ONE side only
  return a === reversed;                   // strict: case-sensitive, whole string
}`,
      mount,
    },
    {
      name: "Step through", cost: "filter → reverse → compare",
      approach: `The function pulled apart into the three decisions the bullets make: filter each side on lines 2 and 3, reverse one on line 4, compare exactly on line 5. Pairs are typed as <code class='inl'>str1 | str2</code>. Start on <b>Hello World | dlroW-olleH</b> — the dash is gone by line 3 — then <b>Mirror | rorrim</b>, which ends with an equal-looking pair that is <b>false</b> by one capital. <b>abc | cb</b> is ours and fails on length. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "str1 | str2 =", value: "Hello World | dlroW-olleH", presets: CASES.map(pairLabel), hint: "separate the two strings with |" } }),
    },
  ],
} satisfies Challenge;
