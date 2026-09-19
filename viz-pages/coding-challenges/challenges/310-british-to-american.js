// #310 · British to American — the unit of replacement is the ROOT, not the word.
// The table is the easy half. The whole problem is deciding what a "match" is,
// and the official tests answer it twice over: "unrecognised" must become
// "unrecognized" and "neighbouring" must become "neighboring", so a \b-anchored
// word match scores 3 of 5. Roots match INSIDE longer words. The control that
// keeps that from being reckless is "organisation", which the grader leaves
// alone — "organise" is not a substring of it, so the table's own spelling is
// already the gatekeeper. Two more clauses hide in the flags: /g (the sentence
// may repeat a word) and /i (a sentence-initial "Colour").
//
// ONE approach, which is the normal outcome (CONTRIBUTING Tier 3). There is no
// wasteful act to name here: the answer is a table lookup, and every alternative
// spelling of it — a split/map/join, a reduce over Object.entries, a hand-rolled
// scanner — is the same mental model with the loop written differently, which
// CONTRIBUTING calls an edit rather than an approach. So the module ships
// Solution + Step through, and the two WRONG spellings go where they belong: the
// demo's comparison table, which runs all three against your live sentence.
import { el, esc, mountDebugger } from "../shared.js";

// ── the lookup table, exactly as freeCodeCamp prints it ──────────────────────
// Insertion order is also the regex's alternation order. That is safe here for a
// reason worth checking rather than assuming: no root is a prefix of another, so
// leftmost-first alternation can never shadow a longer root.
const BRITISH = {
  colour: "color",
  flavour: "flavor",
  honour: "honor",
  neighbour: "neighbor",
  labour: "labor",
  humour: "humor",
  centre: "center",
  fibre: "fiber",
  defence: "defense",
  offence: "offense",
  organise: "organize",
  recognise: "recognize",
  analyse: "analyze",
};
const ROOTS = new RegExp(Object.keys(BRITISH).join("|"), "gi");

// The one rule the table cannot express: it is all lowercase, so a root that
// arrived capitalised has to have that capital re-applied to its replacement.
const toAmerican = (root) => {
  const american = BRITISH[root.toLowerCase()];
  return root[0] === root[0].toUpperCase()
    ? american[0].toUpperCase() + american.slice(1)
    : american;
};

const britishToAmerican = (sentence) => sentence.replace(ROOTS, toAmerican);

// ── the two ways this is normally written wrong ──────────────────────────────
// Both are shown side by side in the demo against the live sentence, so the bug
// is a visible diff rather than a claim.
const naiveReplace = (s) =>
  Object.entries(BRITISH).reduce((acc, [b, a]) => acc.replace(b, a), s);
const boundaryReplace = (s) =>
  s.replace(new RegExp(`\\b(${Object.keys(BRITISH).join("|")})\\b`, "gi"), toAmerican);

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader
// lists them; 6–8 are ours, each buying a branch the official set never isolates.
//   1 one root, one word                     5 ten roots, eight of them inside longer words
//   2 a -re root                             6 CAPITALISATION — the table is lowercase
//   3 two different roots in one sentence     7 the SAME root three times (a missing /g dies here)
//   4 roots inside longer words               8 IDENTITY — nothing matches at all
// Case 8 is also the near-miss: "organisation" looks British and stays British,
// because "organise" is genuinely not inside it. Case 5 carries the same control
// mid-sentence, which is what makes substring matching safe rather than reckless.
const CASES = [
  "I love the colour blue.",
  "The fibre optic cable is new.",
  "It's an honour to meet someone with such humour.",
  "The unrecognised artist analysed his colour palette at the centre.",
  "The offence analysed, with organisation, the defence centre and recognised that the neighbouring labouror was humourous, flavourful, and colourful.",
  "Colour the centre of the flag.",
  "The colour chart lost its colour, so pick another colour.",
  "Our organisation held a marathon.",
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .b2a-sent { font:15px/2.2 var(--mono); background:var(--panel-2); border:1px solid var(--border);
      border-radius:10px; padding:13px 15px; margin:13px 0 6px; word-break:break-word; }
    .b2a-sw { display:inline-block; border-radius:6px; padding:0 4px;
      background:color-mix(in srgb, var(--good) 11%, transparent);
      border:1px solid color-mix(in srgb, var(--good) 42%, var(--border)); }
    .b2a-old { text-decoration:line-through; text-decoration-color:var(--danger);
      text-decoration-thickness:2px; color:var(--danger); opacity:.8; }
    .b2a-new { color:var(--good); font-weight:800; margin-left:4px; }
    .b2a-affix { color:var(--warn); font-style:italic; }
    .b2a-legend { display:flex; gap:15px; flex-wrap:wrap; margin:8px 0 2px;
      font:600 11.5px var(--sans); color:var(--muted); }
    .b2a-legend b { font:800 12px var(--mono); }
    .b2a-tblhead { font:700 10.5px var(--sans); letter-spacing:.07em; text-transform:uppercase;
      color:var(--muted); margin:16px 0 6px; }
    .b2a-key .a { color:var(--good); }
    .b2a-key .ar { color:var(--muted); margin:0 3px; }
    .b2a-cmp { overflow-x:auto; margin-top:8px; }
    .b2a-cmp td.txt { text-align:left; max-width:430px; word-break:break-word; line-height:1.6; }
    .b2a-cmp td .miss { color:var(--danger); font-weight:800; }
    .b2a-cmp td .hit { color:var(--good); }
  `));
}

// Render the sentence with every rewrite shown IN PLACE: the British root struck
// through, the American one beside it, and — the part that teaches the rule —
// the surrounding letters of the same word tinted amber, because those affixes
// were never matched and simply rode along ("un·recognise·d").
function diffHtml(s, matches) {
  let html = "", last = 0;
  matches.forEach((m, k) => {
    const root = m[0], i = m.index;
    // Clamp the affix scan to the previous match's end and the next match's
    // start, so two roots inside one word can never double-render a slice.
    const stop = k + 1 < matches.length ? matches[k + 1].index : s.length;
    let ws = i; while (ws > last && /[A-Za-z]/.test(s[ws - 1])) ws--;
    let we = i + root.length; while (we < stop && /[A-Za-z]/.test(s[we])) we++;
    const pre = s.slice(ws, i), post = s.slice(i + root.length, we);
    html += esc(s.slice(last, ws)) +
      `<span class="b2a-sw">` +
      (pre ? `<span class="b2a-affix">${esc(pre)}</span>` : "") +
      `<span class="b2a-old">${esc(root)}</span><span class="b2a-new">${esc(toAmerican(root))}</span>` +
      (post ? `<span class="b2a-affix">${esc(post)}</span>` : "") +
      `</span>`;
    last = we;
  });
  return html + esc(s.slice(last));
}

function mount(host) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = CASES[3]; inp.style.width = "420px";
  ctl.append(el("span", "ctl-label", "sentence"), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", esc(c.length > 30 ? c.slice(0, 28) + "…" : c));
    chip.title = `${i < 5 ? `official test ${i + 1}` : "ours"} — ${c}`;
    chip.onclick = () => { inp.value = c; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", "Type any sentence, or load a case. Every rewritten root is struck through with its American spelling beside it — and the <b>amber</b> letters are the rest of the word, which was never matched and came along untouched. That is the whole rule: the table holds <b>roots</b>, not words."),
    ctl, pre, out,
  );
  inp.oninput = render;
  render();

  function render() {
    const s = inp.value;
    out.innerHTML = "";
    if (!s.trim()) { out.append(el("div", "muted", "Type something above.")); return; }

    const matches = [...s.matchAll(ROOTS)];
    const answer = britishToAmerican(s);

    out.append(el("div", "b2a-sent", diffHtml(s, matches)));

    const line = el("div", "result-line");
    line.append(el("span", "badge " + (matches.length ? "ok" : "no"),
      matches.length ? `${matches.length} root${matches.length === 1 ? "" : "s"} rewritten` : "no British root found — returned unchanged"));
    if (matches.length) {
      const uniq = new Set(matches.map((m) => m[0].toLowerCase()));
      line.append(el("span", "tag", `${uniq.size} distinct · ${matches.length} occurrence${matches.length === 1 ? "" : "s"}`));
    }
    out.append(line);
    out.append(el("div", "b2a-legend",
      `<span><b class="b2a-old">struck</b> the British root that matched</span>` +
      `<span><b class="b2a-new">green</b> its table entry</span>` +
      `<span><b class="b2a-affix">amber</b> letters the regex never touched</span>`));

    // ── why the two obvious spellings of "replace" break, on THIS sentence ──
    const rows = [
      ["for (const [b,a] of …) s = s.replace(b, a)", naiveReplace(s),
       "no /g — only the FIRST occurrence of each root"],
      ["s.replace(/\\b(colour|…)\\b/gi, …)", boundaryReplace(s),
       "\\b anchors to whole words — misses roots inside longer ones"],
      ["s.replace(/colour|…/gi, …)", answer, "matches the root anywhere, every time"],
    ];
    out.append(el("div", "b2a-tblhead", "The same table, three ways to apply it"));
    const wrap = el("div", "b2a-cmp");
    const tbl = el("table", "cmp");
    tbl.innerHTML = `<tr><th>how it's written</th><th>result on this sentence</th><th>vs. expected</th></tr>` +
      rows.map(([code, got, why]) => {
        const ok = got === answer;
        return `<tr><td class="txt"><code class="inl">${esc(code)}</code><div class="muted" style="font:600 10.5px var(--sans);margin-top:4px">${esc(why)}</div></td>` +
          `<td class="txt">${ok ? `<span class="hit">${esc(got)}</span>` : `<span class="miss">${esc(got)}</span>`}</td>` +
          `<td>${ok ? "✓" : "✗"}</td></tr>`;
      }).join("");
    wrap.append(tbl);
    out.append(wrap);
    out.append(el("div", "note",
      "Load <b>“The colour chart lost its colour…”</b> to kill row 1 (a missing <code class='inl'>/g</code> fixes one of three), " +
      "<b>“The unrecognised artist…”</b> to kill row 2 (<code class='inl'>\\b</code> refuses to look inside a word), and " +
      "<b>“Colour the centre…”</b> to kill row 1 again on case alone. All three rows agree only when every root happens to stand as its own lowercase word."));

    // ── the table itself, clickable ──
    out.append(el("div", "b2a-tblhead", "The lookup table — click a root to append it"));
    const keys = el("div", "controls");
    Object.entries(BRITISH).forEach(([b, a]) => {
      const chip = el("button", "chip b2a-key", `${esc(b)}<span class="ar">→</span><span class="a">${esc(a)}</span>`);
      chip.onclick = () => { inp.value = (inp.value.replace(/\s+$/, "") + " " + b).trim(); render(); };
      keys.append(chip);
    });
    out.append(keys);
  }
}

// ── the shipped snippet ──────────────────────────────────────────────────────
// The table is INTERPOLATED from the constant above, never retyped, so the block
// is genuinely copy-pasteable and cannot drift from the data the demo runs on.
const TABLE_TS = Object.entries(BRITISH).map(([b, a]) => `  ${b}: "${a}",`).join("\n");

const CODE = `const BRITISH: Record<string, string> = {
${TABLE_TS}
};

// One alternation over the ROOTS. Deliberately no \\b: the roots have to match
// INSIDE longer words -- "colourful" -> "colorful", "unrecognised" ->
// "unrecognized". /g because a sentence may repeat a root, /i because it may
// capitalise one. Alternation is leftmost-first, which is safe here only
// because no root is a prefix of another.
const ROOTS = new RegExp(Object.keys(BRITISH).join("|"), "gi");

function britishToAmerican(sentence: string): string {
  return sentence.replace(ROOTS, (root) => {
    const american = BRITISH[root.toLowerCase()];
    // The table is all lowercase, so re-apply the root's own leading capital.
    return root[0] === root[0].toUpperCase()
      ? american[0].toUpperCase() + american.slice(1)
      : american;
  });
}`;

// ── STEP — the same transform with .replace unrolled into an explicit loop ───
// The callback in the shipped solution has no place to hold `out` or `last`, so
// the trace writes the scan out longhand: same roots, same regex, same output,
// but every intermediate value lives in a scope the state panel can show
// entering and leaving. Line 19 is the one to watch — `last` advances past the
// ROOT, not the word, which is exactly why a trailing "-ing" or "-d" survives.
//
// Traced cases are CASES 1–4 and 6–8. The five-line official case 5 is dropped
// deliberately: ten matches at six steps each runs past sixty steps and lands on
// no branch the others miss. It stays fully reachable in the demo, both as a
// preset chip and by typing it into the free field.
const STEP_CASES = [CASES[0], CASES[1], CASES[2], CASES[3], CASES[5], CASES[6], CASES[7]];

// The table is written out in FULL across lines 3–9, two roots to a line. It is the
// data the whole answer is made of, so an elided "…, analyse: 'analyze'" in the
// source pane would hide the one thing a reader might want to check row by row —
// and the pane does not wrap, so a line past ~52 characters is elision by another
// name. All 13 rows fit inside that width.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">britishToAmerican</span>(<span class="tok" data-t="arg">sentence</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="table">BRITISH</span> = {` },
  { ln: 3,  html: `    colour: <span class="st">"color"</span>, flavour: <span class="st">"flavor"</span>,` },
  { ln: 4,  html: `    honour: <span class="st">"honor"</span>, neighbour: <span class="st">"neighbor"</span>,` },
  { ln: 5,  html: `    labour: <span class="st">"labor"</span>, humour: <span class="st">"humor"</span>,` },
  { ln: 6,  html: `    centre: <span class="st">"center"</span>, fibre: <span class="st">"fiber"</span>,` },
  { ln: 7,  html: `    defence: <span class="st">"defense"</span>, offence: <span class="st">"offense"</span>,` },
  { ln: 8,  html: `    organise: <span class="st">"organize"</span>, recognise: <span class="st">"recognize"</span>,` },
  { ln: 9,  html: `    analyse: <span class="st">"analyze"</span>,` },
  { ln: 10, html: `  };` },
  { ln: 11, html: `  <span class="k">const</span> <span class="tok" data-t="roots">ROOTS = <span class="k">new</span> <span class="fn">RegExp</span>(Object.<span class="fn">keys</span>(BRITISH).<span class="fn">join</span>(<span class="st">"|"</span>), <span class="st">"gi"</span>)</span>;` },
  { ln: 12, html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span>, last = 0</span>;` },
  { ln: 13, html: `  <span class="k">for</span> (<span class="k">const</span> m <span class="k">of</span> <span class="tok" data-t="scan">sentence.<span class="fn">matchAll</span>(ROOTS)</span>) {` },
  { ln: 14, html: `    <span class="k">const</span> <span class="tok" data-t="root">root = m[0]</span>;` },
  { ln: 15, html: `    <span class="k">const</span> <span class="tok" data-t="amer">american = BRITISH[root.<span class="fn">toLowerCase</span>()]</span>;` },
  { ln: 16, html: `    <span class="k">const</span> <span class="tok" data-t="capped">capped = root[0] === root[0].<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 17, html: `    <span class="k">const</span> <span class="tok" data-t="fixed">fixed = capped ? american[0].<span class="fn">toUpperCase</span>() + american.<span class="fn">slice</span>(1) : american</span>;` },
  { ln: 18, html: `    <span class="tok" data-t="emit">out += sentence.<span class="fn">slice</span>(last, m.index) + fixed</span>;` },
  { ln: 19, html: `    <span class="tok" data-t="advance">last = m.index + root.length</span>;   <span class="k">// past the ROOT, not the word</span>` },
  { ln: 20, html: `  }` },
  { ln: 21, html: `  <span class="k">return</span> <span class="tok" data-t="tail">out + sentence.<span class="fn">slice</span>(last)</span>;` },
  { ln: 22, html: `}` },
];

// The letters of the enclosing word that the match did NOT cover — quoted in the
// line-11 note so "why did the suffix survive" is answered with the actual text.
const affixOf = (s, i, len) => {
  let e = i + len;
  while (e < s.length && /[A-Za-z]/.test(s[e])) e++;
  let b = i;
  while (b > 0 && /[A-Za-z]/.test(s[b - 1])) b--;
  return { prefix: s.slice(b, i), suffix: s.slice(i + len, e) };
};

const TABLE_ITEMS = Object.entries(BRITISH).map(([b, a]) => `${b}→${a}`);
const short = (s, n = 30) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const sentence = STEP_CASES[k - 1];
  const steps = [];

  const matches = [...sentence.matchAll(ROOTS)];
  let out = "", last = 0;
  let root, american, capped, fixed, idx;

  // Scope by omission, gated on the declaring line. `out`/`last` are function
  // scope from line 12 onward; everything else belongs to the loop body (13–19)
  // and is gone again on 21. Re-entering line 13 for the next match clears them
  // all, because 13 sits below every loop-local gate. `x.exit` is the one step
  // sitting ON line 13 with the iterator exhausted — no `m` is bound there, so
  // nothing from the body may be shown. The BRITISH struct appears when line 2
  // runs and stays for the whole call, because the table never goes out of scope.
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 12) { vars.out = `"${out}"`; vars.last = last; }
    if (line >= 13 && line <= 19 && !x.exit) vars["m.index"] = idx;
    if (line >= 14 && line <= 19) vars.root = `"${root}"`;
    if (line >= 15 && line <= 19) vars.american = `"${american}"`;
    if (line >= 16 && line <= 19) vars.capped = capped;
    if (line >= 17 && line <= 19) vars.fixed = `"${fixed}"`;
    const structs = [];
    if (line >= 2) structs.push({ label: "BRITISH", items: TABLE_ITEMS });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `britishToAmerican("${short(sentence)}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Rewrite <b>"${sentence}"</b> into American spelling. Nothing here is a search — the answer is fully determined by a 13-row table, so the only real decision is <b>what counts as a match</b>.`, { focus: "arg" });
  S(2, `The table arrives as <b>data</b>, not as a chain of <code class='inl'>if</code>s. Thirteen British roots, each mapped to its American spelling — and every key is <b>lowercase</b>, which is the fact line 16 will have to work around.`, { focus: "table" });
  S(11, `Join the keys with <code class='inl'>|</code> into one alternation. Read the flags as the two clauses they are: <b>/g</b> because a sentence may use the same root more than once, <b>/i</b> because it may capitalise one. Now read what is <b>absent</b> — there is no <code class='inl'>\\b</code>, so a root is free to match in the middle of a longer word. That single omission is the challenge.`, { focus: "roots" });
  S(12, `<b>out</b> collects the rewritten sentence and <b>last</b> remembers how far the original has been copied across. Building a new string rather than editing in place means no index ever shifts under us — the replacements can be different lengths ("colour" is 6, "color" is 5) and nothing has to be re-measured.`, { focus: "init", changed: ["out", "last"] });

  matches.forEach((m, mi) => {
    idx = m.index;
    root = m[0]; american = undefined; capped = undefined; fixed = undefined;
    const skipped = sentence.slice(last, idx);
    S(13, `The scan finds match ${mi + 1} of ${matches.length} at index <b>${idx}</b>${skipped ? `, having walked past <b>"${skipped}"</b> without a single hit` : ""}. <code class='inl'>matchAll</code> only ever reports what the pattern matched, so every character it skipped is text the table has no opinion about.`,
      { focus: "scan", changed: ["m.index"], eval: { expr: `another match?`, val: true } });

    S(14, `The matched text is <b>"${root}"</b>${root !== root.toLowerCase() ? ` — note the capital, which only got here because of the <b>/i</b> flag` : ""}. It is a <b>root</b>, not necessarily a word: the regex stopped the moment the table entry was consumed, regardless of what letters sit next to it.`,
      { focus: "root", changed: ["root"] });

    american = BRITISH[root.toLowerCase()];
    S(15, root === root.toLowerCase()
      ? `Look the root up: <b>"${root}"</b> → <b>"${american}"</b>. The <code class='inl'>toLowerCase()</code> changes nothing on <i>this</i> root, which is exactly why it is easy to leave out — it only earns its keep on a capitalised one, and then it earns it completely.`
      : `Look the root up — and here the <code class='inl'>toLowerCase()</code> is load-bearing rather than defensive padding. <b>/i</b> is what let <b>"${root}"</b> match at all, but the table's key is <b>"${root.toLowerCase()}"</b>, so without the fold this lookup returns <code class='inl'>undefined</code> and the sentence gains the word "undefined". → <b>"${american}"</b>.`,
      { focus: "amer", changed: ["american"] });

    capped = root[0] === root[0].toUpperCase();
    S(16, capped
      ? `<b>"${root[0]}"</b> is already uppercase, so this root carried a capital that the lowercase table cannot reproduce. It has to be <b>re-applied</b>, not preserved — the character being written out is a different one.`
      : `<b>"${root[0]}"</b> is lowercase, so the table entry can be used exactly as stored and nothing needs re-casing.`,
      { focus: "capped", changed: ["capped"], eval: { expr: `"${root[0]}" === "${root[0].toUpperCase()}"`, val: capped } });

    fixed = capped ? american[0].toUpperCase() + american.slice(1) : american;
    S(17, capped
      ? `Raise the replacement's first letter: <b>"${american}"</b> → <b>"${fixed}"</b>. Only the first — uppercasing the whole word would invent a shout the sentence never had.`
      : `No capital to re-home, so <b>fixed = "${fixed}"</b> is the table entry unchanged.`,
      { focus: "fixed", changed: ["fixed"] });

    out += skipped + fixed;
    S(18, `Copy the untouched run <b>"${skipped || "(nothing)"}"</b> across verbatim, then append <b>"${fixed}"</b>. Everything the pattern did not match is preserved <i>exactly</i> — that is why punctuation, spacing, and near-misses like <code class='inl'>"organisation"</code> come through untouched without a rule of their own.`,
      { focus: "emit", changed: ["out"] });

    const { prefix, suffix } = affixOf(sentence, idx, root.length);
    last = idx + root.length;
    S(19, prefix || suffix
      ? `Advance <b>last</b> past the <b>root</b> — index ${idx} + ${root.length} = <b>${last}</b> — not past the word. The word here is <b>"${prefix}${root}${suffix}"</b>, so ${suffix ? `<b>"${suffix}"</b>` : `<b>"${prefix}"</b>`} is still ahead of <code class='inl'>last</code> and will be copied across as ordinary text on the next pass. That is how <b>"${prefix}${root}${suffix}"</b> becomes <b>"${prefix}${fixed}${suffix}"</b> for free — the affix was never matched, edited, or even looked at.`
      : `Advance <b>last</b> to index ${idx} + ${root.length} = <b>${last}</b>, just past the root. Here the root stood as a whole word, so there is no affix left over — which is exactly the case that makes a <code class='inl'>\\b</code> solution look correct.`,
      { focus: "advance", changed: ["last"] });
  });

  S(13, matches.length
    ? `The scan is exhausted after ${matches.length} match${matches.length === 1 ? "" : "es"} — the loop ends and every one of its locals goes out of scope.`
    : `The scan finds <b>nothing</b>. Not one of the 13 roots appears anywhere, so the loop body never runs — <b>out</b> is still empty and <b>last</b> is still 0. This is the identity case, and it needs no special handling.`,
    { focus: "scan", exit: true, eval: { expr: `another match?`, val: false } });

  const answer = out + sentence.slice(last);
  S(21, `Append the final untouched run <b>"${sentence.slice(last) || "(nothing)"}"</b>${matches.length ? "" : " — which, nothing having matched, is the entire input"} and <b>return "${answer}"</b>.`,
    { focus: "tail", done: true, result: answer, ret: { value: short(answer, 40) } });

  return steps;
}

export default {
  n: 310, id: "british", title: "British to American", dates: ["2026-06-16"],
  statement: `Convert the British spellings in a sentence to American ones using a fixed 13-row table — <code class="inl">colour→color</code>, <code class="inl">flavour→flavor</code>, <code class="inl">honour→honor</code>, <code class="inl">neighbour→neighbor</code>, <code class="inl">labour→labor</code>, <code class="inl">humour→humor</code>, <code class="inl">centre→center</code>, <code class="inl">fibre→fiber</code>, <code class="inl">defence→defense</code>, <code class="inl">offence→offense</code>, <code class="inl">organise→organize</code>, <code class="inl">recognise→recognize</code>, <code class="inl">analyse→analyze</code> — and return the updated sentence. Replacement is case-insensitive, so <code class="inl">"Colour"</code> → <b>"Color"</b>. <span class="rule">The catch: the table holds <b>roots</b>, not words. <code class="inl">"colouring"</code> → <b>"coloring"</b> and <code class="inl">"unrecognised"</code> → <b>"unrecognized"</b>, so matching on word boundaries fails 2 of the 5 official tests. But <code class="inl">"organisation"</code> must stay put — and it does, for free, because <code class="inl">"organise"</code> is simply not inside it.</span>`,
  // One approach — the argument is in the header comment at the top of the file.
  variants: [
    {
      name: "Solution", cost: "O(n) — one scan",
      approach: `The table is data, so the only design decision is the <b>unit of replacement</b> — and the official tests decide it for you. <code class='inl'>"unrecognised"</code> must become <code class='inl'>"unrecognized"</code> and <code class='inl'>"neighbouring"</code> must become <code class='inl'>"neighboring"</code>, so a <code class='inl'>\\b</code>-anchored word match scores <b>3 of 5</b>. Match the <b>root anywhere</b> instead, and the affixes ride along untouched because they were never part of the match. That sounds reckless until you notice the control the grader planted: <code class='inl'>"organisation"</code> stays British, and no rule enforces that — <code class='inl'>"organise"</code> is genuinely not a substring of it, so the table's own spelling is already the gatekeeper.<br><br>One alternation, built from the keys so it can never disagree with them. <b>/g</b> because a sentence may repeat a root — without it you fix the first <code class='inl'>"colour"</code> and leave the other two. <b>/i</b> because a sentence may capitalise one; that in turn forces the <code class='inl'>toLowerCase()</code> on the lookup (the keys are lowercase) and the re-capitalisation on the way out (a lowercase table cannot return <code class='inl'>"Color"</code> by itself).`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `The same transform with <code class='inl'>.replace</code>'s callback unrolled into an explicit <code class='inl'>matchAll</code> loop, so <code class='inl'>out</code>, <code class='inl'>last</code> and every per-match local enter and leave the state panel as the scan advances. The <b>BRITISH</b> struct appears the moment line 2 runs and stays — the table is in scope for the whole call.<br><br>Case <b>4</b> is the one to watch: line 19 advances <code class='inl'>last</code> past the <b>root</b> rather than the word, which is precisely how <code class='inl'>"unrecognised"</code>'s <code class='inl'>"un"</code> and <code class='inl'>"d"</code> survive without a rule. Case <b>5</b> shows the capital being re-applied at lines 16–17; case <b>6</b> runs the same root three times, which is what a missing <code class='inl'>/g</code> would break; case <b>7</b> matches <b>nothing at all</b> and the loop body never executes. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 4, min: 1, max: STEP_CASES.length,
          presets: STEP_CASES.map((_, i) => i + 1),
          hint: `1–${STEP_CASES.length}: pick a sentence`,
        },
      }),
    },
  ],
};
