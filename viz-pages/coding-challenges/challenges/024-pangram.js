// #24 · Pangram — "and no other letters" makes it set EQUALITY: two containments, not one.
// The title primes you for a one-directional question — "does the sentence contain
// every letter?" — and that reading gets 6 of the 8 official cases right, which is
// exactly why it survives. The statement's four trailing words, "and no other
// letters", turn it around: the sentence's letters must also all be allowed. Two
// containments, checked both ways, and the verdict is their AND.
// One approach here, deliberately. The obvious second one — rescan with `includes`
// instead of building Sets — is the same rescan-vs-remember tab #324 and #6 already
// ship, and on inputs this small (44 characters against 26 letters) it is a
// constant-factor difference nobody can see. The lesson is the second containment,
// not the data structure, so the module spends its whole surface showing both
// directions at once instead of splitting into a race nothing wins.
import { el, esc, mountDebugger } from "../shared.js";

// The 8 official freeCodeCamp cases in the grader's order, then 2 of ours.
// The official set is unusually well built for this problem: cases 2 and 7 fail
// ONLY the sentence ⊆ letters direction, cases 3 and 6 fail ONLY letters ⊆
// sentence, so it pulls the two containments apart cleanly. Two things it never
// does, hence ours:
//   hello / helz   — fails BOTH directions at once (z required and never used, o
//                    used and never allowed). No official case lights up both.
//   hello / hello  — a repeat on the LETTERS side. `letters` is never promised
//                    distinct, so the tempting `used.size === letters.length`
//                    shortcut answers false here. Nothing official catches it.
//                    (The sentence side needs no preset of its own — the repeated
//                    l in "hello" collapses on eight of these ten.)
// Every case below lands on a branch no other one reaches, with one exception
// that is the source's and not ours: cases 5 and 8 take an identical path and
// differ only in scale (7 letters against 26). Both are official, and 8 is the
// sentence the challenge is named after, so neither is droppable.
const OFFICIAL = [
  ["hello", "helo"],
  ["hello", "hel"],
  ["hello", "helow"],
  ["hello world", "helowrd"],
  ["Hello World!", "helowrd"],
  ["Hello World!", "heliowrd"],
  ["freeCodeCamp", "frcdmp"],
  ["The quick brown fox jumps over the lazy dog.", "abcdefghijklmnopqrstuvwxyz"],
];
const CASES = [...OFFICIAL, ["hello", "helz"], ["hello", "hello"]];

// The normalisation, and it applies to the SENTENCE only — `letters` arrives
// promised lowercase. Doing it once at the boundary is the whole reason no later
// line has to say `toLowerCase` again.
const clean = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

// One pass over the problem: what the sentence uses, what the set requires, and
// the two ways those can disagree.
function analyse(sentence, letters) {
  const used = new Set(clean(sentence));
  const allowed = new Set(letters);
  return {
    used, allowed,
    missing: [...allowed].filter((c) => !used.has(c)),  // required, never used  → letters ⊄ sentence
    extra: [...used].filter((c) => !allowed.has(c)),    // used, never allowed   → sentence ⊄ letters
  };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pg-wrap { display:flex; flex-direction:column; gap:13px; }
    .pg-strip { display:flex; flex-wrap:wrap; gap:3px; }
    .pg-ch { min-width:22px; padding:3px 5px; display:flex; flex-direction:column; align-items:center; justify-content:center;
      font:700 14px var(--mono); border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); }
    .pg-ch i { font:600 8.5px var(--mono); font-style:normal; color:var(--muted); line-height:1; margin-top:2px; }
    .pg-ch.ok { border-color:color-mix(in srgb,var(--good) 60%,var(--border)); color:var(--good); }
    .pg-ch.bad { border-color:var(--danger); color:var(--danger); background:color-mix(in srgb,var(--danger) 12%,var(--panel)); }
    .pg-ch.drop { border-style:dashed; color:var(--muted); opacity:.45; }
    .pg-union { display:flex; flex-wrap:wrap; gap:4px; }
    .pg-l { min-width:26px; padding:4px 7px; text-align:center; font:800 13px var(--mono);
      border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .pg-l.both { border-color:var(--good); color:var(--good); background:color-mix(in srgb,var(--good) 12%,transparent); }
    .pg-l.miss { border-color:var(--warn); color:var(--warn); background:color-mix(in srgb,var(--warn) 14%,transparent); }
    .pg-l.extra { border-color:var(--danger); color:var(--danger); background:color-mix(in srgb,var(--danger) 16%,transparent); }
    .pg-key { display:flex; gap:15px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); align-items:center; }
    .pg-key i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:5px; vertical-align:0; border:1px solid; }
    .pg-pane { border:1px solid var(--border); border-radius:9px; padding:10px 12px; background:var(--panel-2); }
    .pg-pane.hit { border-color:color-mix(in srgb,var(--danger) 55%,var(--border)); }
    .pg-pt { font:700 10.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
    .pg-pt b { color:var(--text); font-family:var(--mono); text-transform:none; letter-spacing:0; font-size:11.5px; }
    .pg-ps { font:11.5px var(--sans); color:var(--muted); margin-top:8px; }
    .pg-trap { font:12.5px var(--sans); color:var(--muted); border-left:2px solid var(--warn); padding:3px 0 3px 10px; }
    .pg-trap b { color:var(--text); }
  `));
}

// Two text fields plus the case chips. Both demos on this module would share it;
// there is only one, but the shape stays the same as the rest of the gallery.
function controls(host, onChange, init) {
  ensureStyle();
  const ctl = el("div", "controls");
  const iS = el("input"); iS.type = "text"; iS.value = init[0]; iS.style.width = "300px";
  const iL = el("input"); iL.type = "text"; iL.value = init[1]; iL.style.width = "170px";
  ctl.append(el("span", "ctl-label", "sentence"), iS,
             el("span", "ctl-label", "letters"), iL, el("span", "ctl-label", "(lowercase a–z)"));
  const pre = el("div", "controls");
  CASES.forEach(([s, l]) => {
    const c = el("button", "chip", `${esc(s.length > 26 ? s.slice(0, 25) + "…" : s)} / ${esc(l)}`);
    c.onclick = () => { iS.value = s; iL.value = l; onChange(iS.value, iL.value); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  iS.oninput = iL.oninput = () => onChange(iS.value, iL.value);
  queueMicrotask(() => onChange(iS.value, iL.value)); // defer: the caller's `const out = …` must finish first
  return out;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const quoted = (xs) => xs.map((c) => `<b>'${esc(c)}'</b>`).join(", ");

function mountSolution(host) {
  const out = controls(host, render, ["Hello World!", "heliowrd"]);

  function render(sentenceRaw, lettersRaw) {
    // The letters argument is promised lowercase a–z; the free-text field is not,
    // so sanitise it on read. That is input hygiene, not part of the algorithm.
    const sentence = sentenceRaw, letters = clean(lettersRaw);
    const { used, allowed, missing, extra } = analyse(sentence, letters);
    const ok = !missing.length && !extra.length;
    // The one-directional reading the word "pangram" invites: does the sentence
    // contain every required letter? It never looks at `extra`.
    const oneWay = !missing.length;

    out.innerHTML = "";
    const wrap = el("div", "pg-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${ok ? "ok" : "no"}">isPangram("${esc(sentence)}", "${esc(letters)}") → ${ok}</span>` +
      `<span class="opcount cool"><span class="n">${used.size}</span> distinct letters used</span>` +
      `<span class="opcount"><span class="n">${allowed.size}</span> required</span>`));

    // ── the sentence, normalised in place: casing folded, non-letters dropped,
    // and every surviving letter already coloured by whether the set allows it.
    const strip = el("div", "pg-strip");
    for (const ch of sentence) {
      const low = ch.toLowerCase();
      if (!/[a-z]/.test(low)) { strip.append(el("span", "pg-ch drop", esc(ch === " " ? "␣" : ch))); continue; }
      const cls = "pg-ch " + (allowed.has(low) ? "ok" : "bad");
      strip.append(el("span", cls, esc(low) + (ch !== low ? `<i>${esc(ch)}</i>` : "")));
    }
    if (!sentence.length) strip.append(el("span", "muted", "(empty sentence)"));
    wrap.append(el("div", "pg-pt", "the sentence, normalised — <b>lowercased</b>, non-letters <b>dropped</b>"), strip);

    // ── both directions at once: every letter either side mentions, tagged with
    // which side is missing it. Green means both agree.
    const union = [...new Set([...used, ...allowed])].sort();
    const row = el("div", "pg-union");
    union.forEach((c) => {
      const kind = used.has(c) && allowed.has(c) ? "both" : allowed.has(c) ? "miss" : "extra";
      row.append(el("span", "pg-l " + kind, esc(c)));
    });
    if (!union.length) row.append(el("span", "muted", "(no letters on either side)"));
    wrap.append(el("div", "pg-pt", "used ∪ required"), row);
    wrap.append(el("div", "pg-key",
      `<span><i style="border-color:var(--good);background:color-mix(in srgb,var(--good) 12%,transparent)"></i>in both</span>` +
      `<span><i style="border-color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,transparent)"></i>required, never used</span>` +
      `<span><i style="border-color:var(--danger);background:color-mix(in srgb,var(--danger) 16%,transparent)"></i>used, not allowed</span>`));

    // ── the two containments, side by side, each with the letters that break it.
    const g = el("div", "grid2");
    g.append(
      pane("<b>letters ⊆ sentence</b> · required but missing", missing,
        missing.length
          ? `${quoted(missing)} ${missing.length === 1 ? "is" : "are"} in the set and never appear${missing.length === 1 ? "s" : ""} in the sentence.`
          : `Every one of the ${allowed.size} required letters shows up at least once.`),
      pane("<b>sentence ⊆ letters</b> · used but not allowed", extra,
        extra.length
          ? `${quoted(extra)} ${extra.length === 1 ? "is" : "are"} used by the sentence and ${extra.length === 1 ? "is" : "are"} not in the set.`
          : `The sentence never reaches for a letter outside the set.`));
    wrap.append(g);

    // ── the verdict, as the AND of the two tests.
    wrap.append(
      srow(!missing.length, "letters ⊆ sentence", missing.length ? `missing ${quoted(missing)}` : `all ${plural(allowed.size, "letter", "letters")} used`),
      srow(!extra.length, "sentence ⊆ letters", extra.length ? `${quoted(extra)} not allowed` : `nothing outside the set`),
      srow(ok, "verdict", `${!missing.length} && ${!extra.length} → <b>${ok}</b>`));

    // ── the thesis, restated against this exact input.
    wrap.append(el("div", "pg-trap", oneWay === ok
      ? `The one-directional reading — <b>“does the sentence contain every required letter?”</b> — happens to agree here, answering <b>${ok}</b> too. That agreement is the trap: it holds on <b>6 of the 8</b> official cases, so the missing half of the statement never shows up in the grader's score until you hit case 2 or case 7.`
      // The two readings can only disagree one way round: `missing` empty and
      // `extra` not, i.e. the half that check never looks at.
      : `A one-directional reading — <b>“does the sentence contain every required letter?”</b> — answers <b>true</b> on this input, and it is <b>wrong</b>. Every required letter really is present; ${quoted(extra)} ${extra.length === 1 ? "is" : "are"} the problem, and only the second containment can see ${extra.length === 1 ? "it" : "them"}. The four words <i>“and no other letters”</i> are doing all the work.`));

    wrap.append(el("div", "note",
      `Both sides are <b>sets</b>, because the statement says <i>at least once</i> — how many times a letter appears never enters the answer, on either side. That is what rules out sorting the two strings and comparing them, and it is why the second <b>l</b> of <code class="inl">"hello"</code> changes nothing above — as would a sixth, or a sixtieth. Two equal-size sets where one contains the other are the same set, so the whole check compresses to <code class="inl">used.size === allowed.size && [...allowed].every(c =&gt; used.has(c))</code> — but written out as two containments it is much harder to accidentally implement only one of them.`));

    out.append(wrap);
  }
}

function pane(title, items, sub) {
  const p = el("div", "pg-pane" + (items.length ? " hit" : ""));
  p.append(el("div", "pg-pt", title));
  const g = el("div", "cand-grid");
  if (items.length) items.forEach((c) => g.append(el("span", "cand fail", esc(c))));
  else g.append(el("span", "cand pass", "∅  none"));
  p.append(g, el("div", "pg-ps", sub));
  return p;
}

function srow(pass, key, exp) {
  return el("div", "srow" + (pass ? "" : " bad"),
    `<span class="mark">${pass ? "✓" : "✗"}</span><span class="k">${key}</span><span class="exp">${exp}</span>`);
}

// ── STEP ────────────────────────────────────────────────────────────────────
// The `code` variant spells the two containments with `.every`; the debugger
// expands them into their loops so each membership test is a stop of its own.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">isPangram</span>(<span class="tok" data-t="param">sentence</span>, <span class="tok" data-t="param">letters</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> clean = sentence.<span class="tok" data-t="lower"><span class="fn">toLowerCase</span>()</span>.<span class="tok" data-t="strip"><span class="fn">replace</span>(/[^a-z]/g, <span class="st">""</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> used = <span class="tok" data-t="used"><span class="k">new</span> Set(clean)</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> allowed = <span class="tok" data-t="allowed"><span class="k">new</span> Set(letters)</span>;` },
  { ln: 5,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop1">c <span class="k">of</span> allowed</span>)          <span class="cm">// every required letter used?</span>` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="has1">!used.<span class="fn">has</span>(c)</span>) <span class="k">return</span> <span class="tok" data-t="no1"><span class="k">false</span></span>;` },
  { ln: 7,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop2">c <span class="k">of</span> used</span>)             <span class="cm">// ...and nothing else used?</span>` },
  { ln: 8,  html: `    <span class="k">if</span> (<span class="tok" data-t="has2">!allowed.<span class="fn">has</span>(c)</span>) <span class="k">return</span> <span class="tok" data-t="no2"><span class="k">false</span></span>;` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="yes"><span class="k">true</span></span>;` },
  { ln: 10, html: `}` },
];

// "sentence / letters", split on the FIRST slash — no case here contains one.
const splitCase = (raw) => {
  const s = String(raw), i = s.indexOf("/");
  return { sentence: (i < 0 ? s : s.slice(0, i)).trim(), letters: clean(i < 0 ? "" : s.slice(i + 1)) };
};

function traceIsPangram(raw) {
  const { sentence, letters } = splitCase(raw);
  const steps = [];
  const q = (s) => esc(String(s));
  const used = [], usedSet = new Set();
  const allowedArr = [...new Set(letters)], allowedSet = new Set(letters);
  let cleaned, c, cleanLive = false;

  const S = (line, note, x = {}) => {
    const vars = { sentence: `"${sentence}"`, letters: `"${letters}"` };
    if (line >= 2 && cleanLive) vars.clean = `"${cleaned}"`;
    if (line >= 5 && c !== undefined) vars.c = `'${c}'`;
    const structs = [];                                  // scope by omission: each
    if (line >= 3) structs.push({ label: "used", items: used.slice(), newest: !!x.fresh });   // appears on its
    if (line >= 4) structs.push({ label: "allowed", items: allowedArr });                     // declaration line
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isPangram("${sentence}", "${letters}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Two arguments, and only one of them needs cleaning up. The <b>sentence</b> arrives however a human typed it — <code class='inl'>"${q(sentence)}"</code> — while <b>letters</b> is promised as plain lowercase a–z. The word “pangram” suggests one question, <i>does the sentence contain every letter?</i>, but the statement asks for that <b>and no other letters</b>. That is two questions.`, { focus: "param" });

  const lowered = sentence.toLowerCase();
  S(2, lowered === sentence
    ? `<b>toLowerCase()</b> leaves <code class='inl'>"${q(sentence)}"</code> unchanged — nothing here was capitalised. It still runs, because the next case will be.`
    : `<b>toLowerCase()</b> folds the casing: <code class='inl'>"${q(sentence)}"</code> → <code class='inl'>"${q(lowered)}"</code>. “Ignore letter casing” is a <i>normalisation</i>, so it happens once here rather than at every comparison further down.`,
    { focus: "lower" });

  cleaned = clean(sentence); cleanLive = true;
  const dropped = [...lowered].filter((ch) => !/[a-z]/.test(ch));
  S(2, dropped.length
    ? `<b>replace(/[^a-z]/g, "")</b> deletes the ${plural(dropped.length, "character", "characters")} that are not letters (${[...new Set(dropped)].map((ch) => `<b>'${q(ch === " " ? "␣" : ch)}'</b>`).join(", ")}), leaving <code class='inl'>"${q(cleaned)}"</code>. Same idea as the casing: strip what the problem says to ignore, once, at the boundary.`
    : `<b>replace(/[^a-z]/g, "")</b> finds nothing to drop — <code class='inl'>"${q(cleaned)}"</code> is already all letters. The regex still earns its place: the very next case has a space and a <b>'!'</b>.`,
    { focus: "strip", changed: ["clean"] });

  if (!cleaned.length) {
    S(3, `Nothing survived the normalisation, so <b>used</b> starts and stays empty.`, { focus: "used" });
  }
  for (const ch of cleaned) {
    if (usedSet.has(ch)) {
      S(3, `<b>'${q(ch)}'</b> again — the Set already holds it, so nothing changes. This is where multiplicity stops mattering: the statement says <i>at least once</i>, so the fourth <b>'${q(ch)}'</b> is worth exactly as much as the first.`, { focus: "used" });
    } else {
      usedSet.add(ch); used.push(ch);
      S(3, `Add <b>'${q(ch)}'</b> to <b>used</b> — now ${plural(used.length, "distinct letter", "distinct letters")}. What is being built is the <i>set</i> of letters the sentence reaches for, not a count of them.`, { focus: "used", fresh: true });
    }
  }

  S(4, allowedArr.length === letters.length
    ? `<b>allowed</b> is the required set: ${plural(allowedArr.length, "letter", "letters")}, already distinct. Wrapping it in a Set costs nothing here and buys the case where it isn't — <code class='inl'>letters</code> is never promised to be duplicate-free.`
    : `<b>allowed</b> is the required set. <code class='inl'>"${q(letters)}"</code> has ${letters.length} characters but only <b>${allowedArr.length}</b> distinct ones, so the Set collapses the repeats. Compare against <code class='inl'>letters.length</code> instead and this input answers <b>false</b> for no reason.`,
    { focus: "allowed" });

  S(5, `<b>First containment: letters ⊆ used.</b> Walk everything the set requires and ask whether the sentence bothered to use it. This loop alone is the reading the word “pangram” invites — and on its own it gets 6 of freeCodeCamp's 8 cases right, which is exactly why the missing half is easy to never notice.`, { focus: "loop1" });

  for (const a of allowedArr) {
    c = a;
    const hit = usedSet.has(a);
    S(6, hit
      ? `<b>'${q(a)}'</b> is required, and the sentence used it. Keep going — one letter proves nothing on its own.`
      : `<b>'${q(a)}'</b> is required and the sentence <b>never uses it</b>. The first containment is broken, so the answer is settled.`,
      { focus: "has1", changed: ["c"], eval: { expr: `used.has("${a}")`, val: hit } });
    if (!hit) {
      S(6, `<b>Return false</b> — a letter the set demands is absent from the sentence. Note which direction failed: this is the half a one-directional solution <i>does</i> catch.`,
        { focus: "no1", done: true, result: "false", ret: { value: false } });
      return steps;
    }
  }
  c = undefined;

  S(5, `The loop ran out: <b>every required letter appears</b>. A one-directional solution returns <code class='inl'>true</code> right here and walks away — and on ${allowedArr.length && used.length === allowedArr.length ? `this input it would even be right` : `some inputs it is right`}. The statement is not finished, though.`, { focus: "loop1" });

  S(7, `<b>Second containment: used ⊆ allowed.</b> Now the same question backwards — walk the letters the sentence actually used and ask whether each one was permitted. <code class='inl'>c</code> is a fresh binding; the first loop's is gone.`, { focus: "loop2" });

  for (const u of used) {
    c = u;
    const ok = allowedSet.has(u);
    S(8, ok
      ? `<b>'${q(u)}'</b> is used, and it is in the allowed set. Fine.`
      : `<b>'${q(u)}'</b> is used by the sentence and is <b>not</b> in the set. Nothing in the first loop could have seen this — it only ever asked about letters the set already contained.`,
      { focus: "has2", changed: ["c"], eval: { expr: `allowed.has("${u}")`, val: ok } });
    if (!ok) {
      S(8, `<b>Return false</b> — “and no other letters”. Every letter the set asked for <i>was</i> present; the sentence simply used one more. This is the failure a one-directional check hands back as <code class='inl'>true</code>.`,
        { focus: "no2", done: true, result: "false", ret: { value: false } });
      return steps;
    }
  }

  S(9, `Both containments held: nothing required is missing, and nothing used is forbidden. Two sets that contain each other are the same set. <b>Return true.</b>`,
    { focus: "yes", done: true, result: "true", ret: { value: true } });
  return steps;
}

// Six cases, six different outcomes: pass, fail-direction-2-only, fail-direction-
// 1-only, pass-through-normalisation, fail-both (ours), and the 26-letter one the
// challenge is named after. The remaining official cases are reachable from the
// free-text field, which takes any "sentence / letters" pair.
const STEP_PRESETS = [
  "hello / helo",
  "hello / hel",
  "hello / helow",
  "Hello World! / helowrd",
  "hello / helz",
  "The quick brown fox jumps over the lazy dog. / abcdefghijklmnopqrstuvwxyz",
];

export default {
  n: 24, id: "pangram", title: "Pangram", dates: ["2025-09-03"],
  statement: `Given a word or sentence and a string of lowercase letters, decide whether the sentence uses <b>all</b> the given letters at least once <b>and no other letters</b>. Ignore non-alphabetical characters and ignore casing in the sentence. <span class="rule">Example: <code class="inl">isPangram("Hello World!", "helowrd")</code> → <code class="inl">true</code>, but <code class="inl">isPangram("hello", "hel")</code> → <code class="inl">false</code> — every required letter is there, and the sentence also used an <b>o</b> that the set never allowed.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n + m)",
      approach: `The title is a false friend. “Pangram” asks <i>does this text contain every letter?</i>, and that one-directional check passes <b>6 of the 8</b> official cases — but the statement's last four words, <b>“and no other letters”</b>, ask the question the other way round as well. What is being tested is <b>set equality</b>: the required letters must all appear, <i>and</i> every letter that appears must be required. Two containments, and the answer is their AND. Both sides are <b>sets</b> rather than strings, because “at least once” makes repetition irrelevant on both sides — which is exactly why sorting the two inputs and comparing them is the wrong instinct. The normalisation applies to the <b>sentence only</b> (<code class='inl'>letters</code> is promised lowercase), so it belongs once at the boundary and never again. Flip through the presets and watch which of the two panels lights up: cases 2 and 7 break only the second containment, cases 3 and 6 only the first, and <code class='inl'>"hello" / "helz"</code> — ours — breaks both at once.`,
      code: `// "Uses all of these letters and no others" is set EQUALITY, so it is two
// containment checks. Checking only the first is the bug this problem exists
// to catch: it still passes 6 of the 8 official cases.
function isPangram(sentence: string, letters: string): boolean {
  // Normalise the SENTENCE once at the boundary — "ignore casing" and "ignore
  // non-alphabetical characters" are both about this argument. \`letters\` is
  // promised lowercase a-z already.
  const used = new Set(sentence.toLowerCase().replace(/[^a-z]/g, ""));
  const allowed = new Set(letters);

  // Sets, not strings: "at least once" means multiplicity is noise on both
  // sides, so "aaaaaa" and "a" are the same input to this problem.
  const everyRequiredAppears = [...allowed].every((c) => used.has(c));
  const nothingElseAppears = [...used].every((c) => allowed.has(c));

  return everyRequiredAppears && nothingElseAppears;
  // Same test, compressed: two equal-size sets where one contains the other are
  // equal, i.e. used.size === allowed.size && [...allowed].every(c => used.has(c)).
}`,
      mount: mountSolution,
    },
    {
      name: "Step through", cost: "two containments",
      approach: `Ten lines, and the interesting moment is line 5 running out. Start on <code class='inl'>hello / hel</code>: the first loop checks <b>h</b>, <b>e</b>, <b>l</b>, finds all three, and exits clean — a one-directional solution returns <code class='inl'>true</code> exactly there. Line 7 then walks the same letters backwards and trips on the <b>o</b> the set never allowed. Compare with <code class='inl'>hello / helow</code>, which fails in the <i>other</i> loop, and <code class='inl'>hello / helz</code> — ours — which fails in the first but would have failed in the second too. Along the way watch <code class='inl'>used</code> swallow the second <b>l</b> without growing, which is multiplicity becoming irrelevant in one line. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace: traceIsPangram,
        input: { type: "text", label: "sentence / letters =", value: "hello / hel", presets: STEP_PRESETS, hint: "split on the first /" },
      }),
    },
  ],
};
