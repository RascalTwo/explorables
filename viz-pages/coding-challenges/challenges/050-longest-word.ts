// #50 · Longest Word — strip the periods before you measure, and compare with a strict >.
// Two bullets, two silent bugs, and the official set catches only one of each by luck.
// "Ignore periods when determining word length" means the period must be GONE before
// .length is read: measure "educational." first and you compare 12 against its true 11,
// which no official case notices because that word wins by miles either way. And "ties
// go to the first" is not a sentence to implement — it is the difference between > and
// >=. Strict > only replaces the leader when something is genuinely longer, so a tie
// falls through and the earlier word stays. Official #3 has "sentence" and "multiple"
// both at 8, and is the one test that fails a >=.
// ONE approach, deliberately. Sorting by length (stable) and taking the head, or a
// reduce, is the same running-maximum scan respelled rather than a second mental
// model, and the sort is strictly more work for one answer (Tier 3 §1). So the demo
// lets you swap the rule for the two wrong ones and watch which words each picks.
// Click "Stop. Think" — ours, not freeCodeCamp's — and flip to "count the period": the
// period makes a 4-letter word tie a 5-letter one, and the earlier word wins.
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep, DbgStruct } from "../shared.js";

// The 3 official freeCodeCamp cases in the grader's order, then three of ours.
//   "Stop. Think" — ours, and the case "count the period" is built for. Stop is 4
//     letters and Think is 5, but "Stop." is 5 characters long: measured raw it ties
//     Think, and the tie goes to the first. The official set cannot see this because
//     its longest word always wins by a wide margin.
//   "see a.b.c.d.e.f now" — ours. "Ignore periods" means EVERY period, not just a
//     trailing one: the winner is "abcdef" with its five inner periods gone, not the
//     eleven-character token that was typed.
//   "..." — ours. Nothing survives the strip, so the answer is the empty string.
const OFFICIAL = ["coding is fun", "Coding challenges are fun and educational.", "This sentence has multiple long words."];
const CASES = [...OFFICIAL, "Stop. Think", "see a.b.c.d.e.f now", "..."];

// The grader's own answers, so the demo can show a verdict instead of asking you to
// take its word for it. Only the official three have one.
const EXPECTED: Record<string, string> = {
  "coding is fun": "coding",
  "Coding challenges are fun and educational.": "educational",
  "This sentence has multiple long words.": "sentence",
};

const words = (s: string) => s.split(/\s+/);
const clean = (w: string) => w.replaceAll(".", "");

// Three rules for choosing the winner. `len` is what gets measured, `strict` whether
// a tie displaces the leader. Only the first is correct.
const MODES = [
  { label: "strip, then strict >", len: (w: string) => clean(w).length, strict: true },
  { label: "count the period", len: (w: string) => w.length, strict: true },
  { label: "ties: last wins (>=)", len: (w: string) => clean(w).length, strict: false },
];

// The running-maximum scan under a given rule: the winning index, and every other
// word that reached the same length (the ties the rule had to break).
function pick(ws: string[], m: (typeof MODES)[number]) {
  let win = 0, best = -1;
  ws.forEach((w, i) => { const l = m.len(w); if (m.strict ? l > best : l >= best) { best = l; win = i; } });
  return { win, best, tied: ws.map((_, i) => i).filter((i) => i !== win && m.len(ws[i]!) === best) };
}
const solve = (s: string) => clean(words(s)[pick(words(s), MODES[0]!).win]!);

const q = (s: string) => JSON.stringify(s);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .lgw-wrap { display:flex; flex-direction:column; gap:11px; }
    .lgw-chip { white-space:pre; }
    .lgw-rows { display:flex; flex-direction:column; gap:5px; }
    .lgw-row { display:grid; grid-template-columns:minmax(0,190px) minmax(0,1fr) 30px 64px; align-items:center; gap:10px; padding:5px 10px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); }
    .lgw-row.win { border-color:var(--good); background:color-mix(in srgb, var(--good) 10%, transparent); }
    .lgw-row.tie { border-color:var(--warn); border-style:dashed; }
    .lgw-w { font:700 13px var(--mono); overflow:hidden; text-overflow:ellipsis; white-space:pre; }
    .lgw-dot { color:var(--danger); text-decoration:line-through; opacity:.8; }
    .lgw-dot.kept { color:var(--warn); text-decoration:none; opacity:1; }
    .lgw-bar { height:12px; border-radius:6px; background:var(--panel); overflow:hidden; }
    .lgw-bar i { display:block; height:100%; background:var(--accent); }
    .lgw-row.win .lgw-bar i { background:var(--good); }
    .lgw-n { font:700 13px var(--mono); text-align:right; }
    .lgw-tag { font:700 10px var(--mono); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
    .lgw-row.win .lgw-tag { color:var(--good); }
    .lgw-row.tie .lgw-tag { color:var(--warn); }
    .lgw-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .lgw-cmp b { font-family:var(--mono); color:var(--text); }
    .lgw-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .lgw-cmp.split b { color:var(--danger); }
    @media (max-width:640px) { .lgw-row { grid-template-columns:minmax(0,1fr) 30px; } .lgw-bar, .lgw-tag { display:none; } }
  `));
}

// One token, with every period marked: struck through when it is about to be ignored,
// amber when this rule is (wrongly) counting it.
const tokenHtml = (w: string, counted: boolean) => w
  ? [...w].map((c) => (c === "." ? `<span class="lgw-dot${counted ? " kept" : ""}">.</span>` : esc(c))).join("")
  : `<span class="lgw-tag">∅</span>`;

function mount(host: HTMLElement) {
  ensureStyle();
  let mode = 0;

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = OFFICIAL[2]!; inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "sentence ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip lgw-chip", `"${esc(v)}"`);
    c.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });

  const mod = el("div", "controls");
  mod.append(el("span", "ctl-label", "rule"));
  const modChips = MODES.map((m, i) => {
    const c = el("button", "chip" + (i ? " bad" : " good"), m.label);
    c.onclick = () => { mode = i; render(); };
    mod.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, mod, out);
  inp.oninput = render;
  render();

  function render() {
    modChips.forEach((c, i) => c.classList.toggle("on", i === mode));
    const raw = String(inp.value);
    const ws = words(raw);
    const m = MODES[mode]!;
    const { win, tied } = pick(ws, m);
    const result = clean(ws[win]!);
    const want = EXPECTED[raw] ?? solve(raw);
    const ok = result === want;

    out.innerHTML = "";
    const wrap = el("div", "lgw-wrap");

    const line = el("div", "result-line");
    line.append(el("span", `badge ${ok ? "ok" : "no"}`, `getLongestWord(${esc(q(raw))}) → ${esc(q(result))}`));
    if (EXPECTED[raw] !== undefined)
      line.append(el("span", "lgw-cmp" + (ok ? "" : " split"),
        ok ? `matches freeCodeCamp's expected <b>${esc(q(want))}</b>` : `freeCodeCamp expects <b>${esc(q(want))}</b> — this rule fails the grader`));
    else if (!ok)
      line.append(el("span", "lgw-cmp split", `the correct rule returns <b>${esc(q(want))}</b>`));
    wrap.append(line);

    const top = Math.max(1, ...ws.map(m.len));
    const rows = el("div", "lgw-rows");
    ws.forEach((w, i) => {
      const n = m.len(w);
      const cls = i === win ? " win" : tied.includes(i) ? " tie" : "";
      rows.append(el("div", "lgw-row" + cls,
        `<span class="lgw-w">${tokenHtml(w, mode === 1)}</span>` +
        `<span class="lgw-bar"><i style="width:${(n / top) * 100}%"></i></span>` +
        `<span class="lgw-n">${n}</span>` +
        `<span class="lgw-tag">${i === win ? "winner" : tied.includes(i) ? (m.strict ? "tie · loses" : "tie · lost") : ""}</span>`));
    });
    wrap.append(rows);

    wrap.append(el("div", "muted",
      mode === 1
        ? `Amber periods are being <i>counted</i> — the length column includes them.`
        : `Struck-through periods are ignored — the length column is measured after they are gone.`));
    wrap.append(el("div", "note", noteFor(raw, ws, mode, result, tied.length, want)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different rule, because every
// preset was chosen to land on a different one.
function noteFor(raw: string, ws: string[], mode: number, result: string, ties: number, want: string) {
  const right = result === want;
  if (mode === 1)
    return right
      ? `Counting the period gives the right answer <b>here</b>, and that is the danger: the winner beats everything else by enough that two stray characters cannot change it. Official <code class='inl'>"educational."</code> is 12 raw against a true 11 and still wins by miles. Click <code class='inl'>"Stop. Think"</code> to see where it stops being harmless.`
      : `Measured with its period, a word is longer than it really is, and here that moves the answer to <b>${esc(q(result))}</b> instead of <b>${esc(q(want))}</b> — the period lets a shorter word tie the real leader, and the tie goes to the earlier one. "Ignore periods when determining word length" is not a clause about what to <i>return</i>: it says the period must be gone <b>before</b> <code class='inl'>.length</code> is read. Strip first, measure second.`;
  if (mode === 2)
    return ties && !right
      ? `Two words reach the same length, and <code class='inl'>&gt;=</code> lets the <b>later</b> one replace the leader — so it returns <b>${esc(q(result))}</b> where the statement says "the first one that occurs" (<b>${esc(q(want))}</b>). One character separates the passing solution from the failing one, and the test that notices is official #3, where <b>sentence</b> and <b>multiple</b> are both 8 letters.`
      : `No two words tie for the lead here, so <code class='inl'>&gt;=</code> and <code class='inl'>&gt;</code> make the same choices and the answer is right. A tie-break rule is invisible until two words tie — click <code class='inl'>"This sentence has multiple long words."</code>.`;
  if (!clean(result) && !want)
    return `Every character was a period, so the strip leaves nothing and the winner is the empty string — which is exactly what <code class='inl'>best = ""</code> started as. The statement never asks for this and the grader never sends it, but it falls out of the loop for free: a word of length 0 is never strictly longer than the initial 0, so nothing is replaced and <code class='inl'>""</code> comes back.`;
  if (ties)
    return `<b>${ties + 1}</b> words tie for the longest at <b>${clean(result).length}</b> letters, and the statement says to return the first. That is a one-character decision in the code: <code class='inl'>word.length &gt; best.length</code> replaces the leader only when something is <i>strictly</i> longer, so a tie falls through and the earlier word keeps the lead. Write <code class='inl'>&gt;=</code> and the last one wins instead. Flip the rule to <b>ties: last wins</b> and watch the winner jump.`;
  if (/\w\.\w/.test(raw))
    return `"Ignore periods" means <b>every</b> period, not just the one at the end of a sentence. <code class='inl'>replaceAll(".", "")</code> removes the five inner ones and the answer is <b>${esc(q(result))}</b>, not the eleven-character token that was typed. A trailing-only strip (<code class='inl'>.replace(/\\.$/, "")</code>) would hand back <code class='inl'>"a.b.c.d.e.f"</code> — and measure it at 11. The official set only ever puts a period at the end of the last word, so it cannot tell the two apart.`;
  if (pick(ws, MODES[1]!).win !== pick(ws, MODES[0]!).win)
    return `Read the first word's length with and without its period: raw, the period lets it <b>tie</b> a longer word, and the earlier word wins the tie. Stripped, the longer word wins outright and the answer is <b>${esc(q(result))}</b>. Flip to <b>count the period</b> to watch it pick the wrong one. That is why the period has to go before the comparison, not after.`;
  if (raw.includes("."))
    return `The periods are removed before any length is read, so the answer is <b>${esc(q(result))}</b> without one. Returning the <i>stripped</i> word is part of the spec too: <code class='inl'>"educational."</code> is a different string from <code class='inl'>"educational"</code> as far as the grader's <code class='inl'>equal</code> is concerned.`;
  return `No periods and no ties: the loop just keeps whichever word is longest so far, and <b>${esc(q(result))}</b> is left standing at the end. The two rules this problem hides — strip before you measure, and a strict <code class='inl'>&gt;</code> for ties — both sit idle on this input. Try one of the other presets.`;
}

// ── STEP — the running maximum, one word per pass ───────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getLongestWord</span>(<span class="tok" data-t="arg">sentence</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> <span class="tok" data-t="best">best = <span class="st">""</span></span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="raw">raw</span> <span class="k">of</span> sentence.<span class="fn">split</span>(<span class="st">/\\s+/</span>)) {` },
  { ln: 4, html: `    <span class="k">const</span> <span class="tok" data-t="word">word = raw.<span class="fn">replaceAll</span>(<span class="st">"."</span>, <span class="st">""</span>)</span>;` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">word.length &gt; best.length</span>) <span class="tok" data-t="set">best = word</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">best</span>;` },
  { ln: 8, html: `}` },
];

function trace(rawInput: string) {
  const sentence = String(rawInput);
  const parts = words(sentence);
  const steps: DbgStep[] = [];
  let best = "", raw: string | null = null, word = "", seen = -1;

  const S = (line: number, note: string, x: { focus?: string | undefined; changed?: string[] | undefined; eval?: { expr: string; val: boolean; } | undefined; done?: boolean | undefined; result?: string | undefined; ret?: { value: string; } | undefined } = {}) => {
    const vars: Record<string, unknown> = { sentence: q(sentence) };
    if (line >= 2) vars["best"] = q(best);                      // `let best` is line 2
    if (raw !== null) vars["raw"] = q(raw);                     // only while the loop body is running
    if (raw !== null && line >= 4) vars["word"] = q(word);      // `const word` is line 4
    const structs: DbgStruct[] = [];
    if (line >= 3) structs.push({ label: "words", items: parts.map((p) => p || "∅") });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getLongestWord(${q(sentence)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `A sentence in, one word out, and the word to return is "the longest" — which says <b>something has to be remembered</b> while the words go by: the best so far. That makes this a running maximum, one pass, nothing sorted. Two bullets decide the details: periods do not count, and a tie goes to whoever came first.`, { focus: "arg" });

  S(2, `<code class='inl'>best</code> starts as the empty string, length <b>0</b>. That is a deliberate floor: every real word is at least one letter, so the first one always beats it — but a sentence made only of periods strips down to length 0, never beats it, and the function returns <code class='inl'>""</code> instead of throwing.`, { focus: "best", changed: ["best"] });

  parts.forEach((p, i) => {
    raw = p; word = "";
    S(3, `Word <b>${i + 1}</b> of ${parts.length}: <b>${q(p)}</b>. The split is on <code class='inl'>/\\s+/</code>, a whole <i>run</i> of whitespace, so two spaces in a row cannot hand the loop an empty word between them. The period is still attached — measuring now would count it.`, { focus: "raw", changed: ["raw"] });

    word = clean(p);
    const dots = p.length - word.length;
    S(4, `${dots ? `Removed <b>${dots}</b> period${dots === 1 ? "" : "s"}: <b>${q(p)}</b> becomes <b>${q(word)}</b>, ${p.length} characters down to ${word.length}. It is <code class='inl'>replaceAll</code>, so a period <i>inside</i> a token goes too, not just a trailing one. ` : `No periods on this one, so nothing changes. `}This runs <b>before</b> the length is read, which is the whole reading of "ignore periods when determining word length" — the stripped word is also the one that gets returned, so the period never reaches the answer.`, { focus: "word", changed: ["word"] });

    const longer = word.length > best.length, tie = word.length === best.length && i > 0;
    const prev = best;
    if (longer) { best = word; seen = i; }
    S(5, longer
      ? `<b>${word.length}</b> &gt; <b>${prev.length}</b>, so <b>${q(word)}</b> becomes the best so far. A strictly longer word is the only thing allowed to take the lead.`
      : tie
        ? `<b>${word.length}</b> is <i>not</i> &gt; <b>${best.length}</b> — it ties <b>${q(best)}</b>, and the statement says the <b>first</b> one wins. That is the entire tie rule: a strict <code class='inl'>&gt;</code> lets the tie fall through, and <code class='inl'>&gt;=</code> would hand the lead to ${q(word)} instead.`
        : `<b>${word.length}</b> is not &gt; <b>${best.length}</b>, so <b>${q(best)}</b> keeps the lead.${seen < 0 && !word ? ` Nothing was ever longer than the empty start.` : ``}`,
      { focus: longer ? "set" : "cmp", changed: longer ? ["best"] : [], eval: { expr: `${q(word)}.length > ${q(prev)}.length`, val: longer } });
  });
  raw = null;

  S(7, `<b>Return ${q(best)}.</b> One pass, and the answer is whichever word was strictly longest at some point and never beaten — which, because a tie never replaces it, is also the earliest of the longest. Nothing was sorted, and the strict comparison on line 5 is what does the tie-break.`,
    { focus: "ret", done: true, result: q(best), ret: { value: q(best) } });

  return steps;
}

export default {
  n: 50, id: "longestword", title: "Longest Word", dates: ["2025-09-29"],
  statement: `Given a sentence, return the <b>longest word</b> in it. <b>Ignore periods</b> (<code class="inl">.</code>) when determining word length, and if several words tie for the longest, return the <b>first</b> one that occurs. <span class="rule">Example: <code class="inl">getLongestWord("This sentence has multiple long words.")</code> → <code class="inl">"sentence"</code> — it ties <b>multiple</b> at 8 letters, and the earlier word wins. <code class="inl">getLongestWord("Coding challenges are fun and educational.")</code> → <code class="inl">"educational"</code>, without the period.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass",
      approach: `A running maximum: walk the words once, keep the longest so far, replace it only when something is <b>strictly</b> longer. Two bullets, and each one hides a bug that the official tests only catch by luck. <b>"Ignore periods when determining word length"</b> means the period has to be gone <i>before</i> <code class='inl'>.length</code> is read. Measure first and <code class='inl'>"educational."</code> compares as 12 instead of 11 — and no official case notices, because that word wins by miles either way. <code class='inl'>"Stop. Think"</code> (ours) is where it bites: <b>Stop.</b> is 5 characters raw, ties <b>Think</b>, and the tie goes to the first, so counting the period returns the <i>shorter</i> word. The stripped word is also what you return, and <code class='inl'>replaceAll</code> removes every period, not just a trailing one. The second bullet, <b>"the first one that occurs"</b>, is not a step to implement; it is the difference between <code class='inl'>&gt;</code> and <code class='inl'>&gt;=</code>. A strict comparison cannot replace the leader with an equal, so a tie falls through and the earlier word stays — and <b>sentence</b> and <b>multiple</b> in official #3 are exactly that tie, the one test that fails a <code class='inl'>&gt;=</code>. Use the rule toggle to watch both wrong versions pick a different word on identical input. Sorting by length would also work, but it is more work for the same answer, and its tie behaviour depends on the sort being stable.`,
      code: `// One pass, keeping the longest word seen so far. Two details carry the problem:
// the period is stripped BEFORE the length is read (and the stripped word is what
// gets returned), and the comparison is a strict > so a tie never replaces the
// earlier word. Ours, untested by the grader: "Stop. Think" is 5 chars raw for
// "Stop." and ties "Think", so counting the period would return "Stop".
function getLongestWord(sentence: string): string {
  let best = "";
  for (const raw of sentence.split(/\\s+/)) {
    const word = raw.replaceAll(".", "");  // every period, before measuring
    if (word.length > best.length) best = word;  // strict >: the first of a tie stays
  }
  return best;
}`,
      mount,
    },
    {
      name: "Step through", cost: "word by word",
      approach: `The running maximum unrolled, one word per pass, with the strip and the comparison on separate lines. Start on <b>"This sentence has multiple long words."</b> — official — and watch line 5 reach <b>multiple</b>, hit the tie with <b>sentence</b>, and leave the leader alone. <b>"Coding challenges are fun and educational."</b> shows the period come off <b>educational.</b> on line 4, before the length is read. <b>"Stop. Think"</b> and <b>"see a.b.c.d.e.f now"</b> are ours: the first shows the stripped length (4) losing to 5 where the raw one would tie, the second a token losing five inner periods at once. <b>"..."</b> strips to nothing and returns the empty string. Type any sentence. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "sentence =", value: OFFICIAL[2]!, presets: CASES, hint: "any sentence" } }),
    },
  ],
} satisfies Challenge;
