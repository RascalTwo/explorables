// #37 · Sentence Capitalizer — raising a letter is a claim about what came before it.
// "The first letter of each sentence" reads like a rule about characters and it is not
// one: whether this `w` should be raised depends on what the scan walked past to reach
// it, and a rule about history is a rule about state. One boolean — call it `start`,
// meaning "a sentence has ended and its first letter has not arrived yet" — plus one
// left-to-right pass is the entire solution. The hard question is not when to SET the
// flag, it is what LEAVES IT ALONE: `.?!` arm it, letters and digits clear it, and
// spaces, apostrophes and quotes must do neither. Get that third category wrong and you
// break one of the two official traps — the letter to raise in "…this period . why is…"
// sits two characters past the ender, and the apostrophe inside "today's" sits inside a
// word where a re-arm would produce "today'S".
// ONE approach, deliberately. The two things people reach for first — `split(". ")` and
// "capitalise the character after an ender" — are not second approaches but bugs
// (Tier 3 §1), so rather than give them tabs the demo runs both alongside the real scan
// on every input and shows where each breaks. They fail on DISJOINT official cases —
// split(". ") fails only #4, the after-an-ender rule fails only #2, #3 and #5 — so
// neither one's blind spot is the other's, and no combination of the two composes into
// the right answer. That is the argument for carrying a flag: click the
// crazy!!!strange??? chip to see the first one break, and any chip with a ". " in it to
// see the second.
import { el, esc, mountDebugger } from "../shared.js";

// The three character categories the machine sorts every character into. `LETTER` and
// `ALNUM` differ by exactly the digits, and that difference is a decision, not an
// oversight: a digit cannot be capitalized but it does mean the sentence has started,
// so it clears the flag rather than leaving it armed for the next word.
const ENDER = /[.?!]/;
const LETTER = /[a-z]/i;
const ALNUM = /[a-z0-9]/i;

// The 5 official freeCodeCamp cases, in the grader's order, then two of ours. Each one
// lands on a different shape of the scan:
//   1 · one sentence, ender at the very end — the case where every wrong version looks
//       right, which is why it is the grader's first.
//   2 · ". " — one filler character between the ender and the letter to raise.
//   3 · "..." plus a space, and an apostrophe sitting inside a word.
//   4 · runs of enders with NO space anywhere, so "split on whitespace" has nothing to
//       split on and the letter to raise is immediately after the ender.
//   5 · a detached ender — " . " — with filler on BOTH sides of it.
//   6 · ours: the paragraph opens with punctuation, so the first letter of the first
//       sentence is not the first character. `charAt(0).toUpperCase()` is a no-op on "'".
//   7 · ours, and the case the statement never rules on — a sentence opening with a
//       DIGIT. Our machine treats a digit as a clear, so that sentence gets no capital
//       at all and the "is" after it is left alone. That is a decision: the alternative
//       (digits leave the flag armed) would capitalize the next word instead and give
//       "1 Is a number." See the note that chip renders.
const OFFICIAL = [
  "this is a simple sentence.",
  "hello world. how are you?",
  "i did today's coding challenge... it was fun!!",
  "crazy!!!strange???unconventional...sentences.",
  "there's a space before this period . why is there a space before that period ?",
];
const CASES = [...OFFICIAL, "'tis the night. all is calm.", "1 is a number. two is also."];

// Walk once, carrying one flag, and record what every character did to it. `armed` is
// the flag as it stood when the machine ARRIVED at the character; `act` is the category
// it fell into. The demo reads nothing else.
function scan(paragraph) {
  const steps = [];
  let out = "", start = true;
  for (const ch of paragraph) {
    const armed = start;
    let emitted = ch, act;
    if (start && LETTER.test(ch)) { emitted = ch.toUpperCase(); start = false; act = "cap"; }
    else if (ENDER.test(ch)) { start = true; act = "arm"; }
    else if (ALNUM.test(ch)) { start = false; act = "clear"; }
    else act = "skip";
    out += emitted;
    steps.push({ ch, emitted, armed, act, after: start, out });
  }
  return { out, steps };
}

// Wrong version #1 — split on the sentence separator, raise each piece's first
// character, glue it back. Survives 4 of the 5 official cases.
const naiveSplit = (p) => p.split(". ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(". ");

// Wrong version #2 — raise the character that FOLLOWS an ender (and the first one).
// Survives 2 of the 5, and exactly the one #1 fails.
const naiveAfter = (p) => { let o = ""; for (let i = 0; i < p.length; i++) o += i === 0 || ENDER.test(p[i - 1]) ? p[i].toUpperCase() : p[i]; return o; };

// Whitespace has to be visible in a per-character strip or the boxes read as missing.
const glyph = (c) => (c === " " ? "␣" : c === "\n" ? "⏎" : c === "\t" ? "⇥" : c);

// First index where two outputs disagree, or -1. Length differences cannot happen here
// (both versions emit one character per character) but the guard costs one clause.
function diffAt(got, want) {
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) if (got[i] !== want[i]) return i;
  return got.length === want.length ? -1 : n;
}

const ACT_WORD = { cap: "raises it", arm: "arms the flag", clear: "clears the flag", skip: "leaves the flag alone" };

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sc-wrap { display:flex; flex-direction:column; gap:12px; }
    .sc-ta { width:100%; box-sizing:border-box; min-height:52px; resize:vertical;
             font:13px/1.6 var(--mono); color:var(--text); background:var(--panel-2);
             border:1px solid var(--border); border-radius:8px; padding:8px 10px; }
    .sc-ta:focus { outline:none; border-color:var(--accent); }
    .sc-out { font:700 14px/1.7 var(--mono); white-space:pre-wrap; word-break:break-word;
              padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); }
    .sc-out b.up { color:var(--good); background:color-mix(in srgb, var(--good) 18%, transparent); border-radius:3px; }
    .sc-strip { display:flex; flex-wrap:wrap; gap:2px; align-items:flex-end; }
    .sc-ch { font:700 13px var(--mono); min-width:17px; text-align:center; padding:4px 2px 3px;
             border:1px solid var(--border); border-bottom-width:3px; border-radius:5px;
             background:var(--panel-2); color:var(--muted); cursor:pointer; }
    .sc-ch.armed { background:color-mix(in srgb, var(--accent) 16%, var(--panel-2)); }
    .sc-ch.cap { color:var(--good); border-bottom-color:var(--good); }
    .sc-ch.arm { color:var(--warn); border-bottom-color:var(--warn); }
    .sc-ch.clear { color:var(--text); }
    .sc-ch.skip { border-bottom-style:dashed; }
    .sc-ch.cur { outline:2px solid var(--accent); outline-offset:1px; }
    .sc-lamp { display:grid; grid-template-columns:auto auto auto 1fr; align-items:center; gap:10px;
               padding:7px 10px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); }
    .sc-bulb { font:700 11px var(--sans); letter-spacing:.06em; padding:3px 8px; border-radius:999px;
               border:1px solid var(--border); color:var(--muted); }
    .sc-bulb.on { border-color:var(--accent); color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, transparent); }
    .sc-did { font:12px var(--sans); color:var(--muted); }
    .sc-did b { font-family:var(--mono); color:var(--text); }
    .sc-scrub { width:100%; accent-color:var(--accent); }
    .sc-nrow { display:grid; grid-template-columns:168px 1fr auto; align-items:baseline; gap:10px;
               font:12px var(--sans); color:var(--muted); padding:5px 10px;
               border:1px dashed var(--border); border-radius:8px; }
    .sc-nrow.split { color:var(--danger); border-color:var(--danger); border-style:solid;
                     background:color-mix(in srgb, var(--danger) 9%, transparent); }
    .sc-nrow .got { font:12px var(--mono); color:var(--text); white-space:pre-wrap; word-break:break-word; }
    .sc-nrow b.bad { color:var(--danger); background:color-mix(in srgb, var(--danger) 20%, transparent); border-radius:3px; }
    .sc-leg { display:flex; flex-wrap:wrap; gap:12px; font:11px var(--sans); color:var(--muted); }
    .sc-leg i { font-style:normal; font-family:var(--mono); font-weight:700; }
  `));
}

function mount(host) {
  ensureStyle();
  let cur = 0;

  const lab = el("div", "controls");
  lab.append(el("span", "ctl-label", "paragraph"));
  const ta = el("textarea", "sc-ta");
  ta.spellcheck = false;
  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v) => {
    const c = el("button", "chip", esc(v.length > 30 ? v.slice(0, 28) + "…" : v));
    c.title = v;
    c.onclick = () => { ta.value = v; cur = openAt(v); render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(lab, ta, pre, out);
  ta.oninput = () => { cur = Math.min(cur, Math.max(0, ta.value.length - 1)); render(); };
  ta.value = CASES[4];
  cur = openAt(ta.value);
  render();

  // Open the cursor on the first capital that had to reach across filler to get there —
  // the interesting position — rather than on character 0, which is always trivial.
  function openAt(p) {
    const { steps } = scan(p);
    const reach = steps.findIndex((s, i) => s.act === "cap" && i > 0 && steps[i - 1].act === "skip");
    return reach >= 0 ? reach : Math.max(0, steps.findIndex((s, i) => s.act === "cap" && i > 0));
  }

  function render() {
    const p = String(ta.value);
    const { out: result, steps } = scan(p);
    cur = Math.max(0, Math.min(cur, steps.length - 1));
    const n1 = naiveSplit(p), n2 = naiveAfter(p);
    out.innerHTML = "";
    const wrap = el("div", "sc-wrap");

    wrap.append(el("div", "sc-out", steps.length
      ? steps.map((s) => (s.act === "cap" ? `<b class="up">${esc(s.emitted)}</b>` : esc(s.emitted))).join("")
      : `<span class="muted">(empty)</span>`));

    if (steps.length) {
      const strip = el("div", "sc-strip", steps.map((s, i) =>
        `<span class="sc-ch ${s.act}${s.armed ? " armed" : ""}${i === cur ? " cur" : ""}" data-i="${i}" title="#${i + 1} — ${ACT_WORD[s.act]}">${esc(glyph(s.emitted))}</span>`
      ).join(""));
      strip.onclick = (e) => { const b = e.target.closest(".sc-ch"); if (b) { cur = +b.dataset.i; render(); } };
      wrap.append(strip);

      wrap.append(el("div", "sc-leg",
        `<span><i style="color:var(--accent)">▉</i> flag armed on arrival</span>` +
        `<span><i style="color:var(--good)">▁</i> raised</span>` +
        `<span><i style="color:var(--warn)">▁</i> arms the flag</span>` +
        `<span><i>▁</i> clears it</span>` +
        `<span><i>┄</i> leaves it alone</span>` +
        `<span class="muted">click any character</span>`));

      // The scrubber and the strip are two handles on the same index — this is the
      // "watch the flag flip" control the whole module is built around.
      const scrub = el("input", "sc-scrub");
      scrub.type = "range"; scrub.min = 0; scrub.max = steps.length - 1; scrub.value = cur;
      scrub.oninput = () => { cur = +scrub.value; render(); };
      wrap.append(scrub);

      const s = steps[cur];
      // Show the TAIL of the output, not the head — the character just emitted is the
      // one worth seeing, and the official paragraphs are far too long to print whole.
      const sofar = s.out.length > 30 ? "…" + s.out.slice(-29) : s.out;
      wrap.append(el("div", "sc-lamp",
        `<span class="sc-bulb${s.armed ? " on" : ""}">${s.armed ? "start = true" : "start = false"}</span>` +
        `<span class="sc-did">char #${cur + 1} <b>${esc(glyph(s.ch))}</b> → ${ACT_WORD[s.act]}</span>` +
        `<span class="sc-bulb${s.after ? " on" : ""}">${s.after ? "start = true" : "start = false"}</span>` +
        `<span class="sc-did">out so far <b>"${esc(sofar)}"</b></span>`));
    }

    wrap.append(el("div", "sc-nrow" + (n1 === result ? "" : " split"),
      `<span>split(". ") + charAt(0)</span><span class="got">"${markDiff(n1, result)}"</span>` +
      `<span>${verdict(n1, result)}</span>`));
    wrap.append(el("div", "sc-nrow" + (n2 === result ? "" : " split"),
      `<span>raise the char after an ender</span><span class="got">"${markDiff(n2, result)}"</span>` +
      `<span>${verdict(n2, result)}</span>`));

    wrap.append(el("div", "note", noteFor(p, steps, result, n1, n2)));
    out.append(wrap);
  }
}

// Render a wrong answer with its first divergence from the real one picked out, so the
// reader sees the character rather than being told a number.
function markDiff(got, want) {
  const d = diffAt(got, want);
  if (d < 0) return esc(got);
  return esc(got.slice(0, d)) + `<b class="bad">${esc(glyph(got[d] ?? "·"))}</b>` + esc(got.slice(d + 1));
}

function verdict(got, want) {
  const d = diffAt(got, want);
  if (d < 0) return "agrees";
  const mine = want[d], theirs = got[d];
  return mine && theirs && mine === theirs.toUpperCase()
    ? `left <b>${esc(glyph(theirs))}</b> lowercase`
    : `raised <b>${esc(glyph(theirs))}</b>`;
}

function noteFor(p, steps, result, n1, n2) {
  if (!steps.length)
    return `Nothing to scan — but note where the flag starts. <code class='inl'>start</code> is initialised to <b>true</b>, because the first sentence needs a capital too and there is no ender in front of it to arm the flag on its behalf. That single initial value is the only piece of state the loop cannot read off the string.`;

  const both = n1 === result && n2 === result;
  const tail = both
    ? ` Both wrong versions agree with the real one on this input, which is exactly why they survive casual testing.`
    : ` ${n1 !== result && n2 !== result ? `<b>Both</b> shortcuts break here.` : `The other shortcut happens to agree on this input — they fail on different cases, and neither one is rescued by the other.`}`;

  const digit = steps.findIndex((s) => s.armed && /[0-9]/.test(s.ch));
  if (digit >= 0)
    return `Character #${digit + 1} is the digit <b>${esc(steps[digit].ch)}</b> and the flag is armed when the scan reaches it. freeCodeCamp's statement never says what to do here, so this is <i>our</i> decision and it is worth stating: a digit <b>clears</b> the flag. It cannot be capitalized, but it does mean the sentence has started, so nothing later in that sentence is a candidate any more — you get <code class='inl'>"${esc(result)}"</code>. The alternative is to treat a digit like a space and leave the flag armed, which would carry the capital along to the next word and produce <code class='inl'>"1 Is a number."</code> — a capital in the middle of a sentence. That is the shape of every decision in this problem: the three categories are <i>arm</i>, <i>clear</i> and <i>leave alone</i>, and the only real work is deciding which one an unusual character belongs in.${tail}`;

  const lead = steps[0].act === "skip" ? steps.findIndex((s) => s.act === "cap") : -1;
  if (lead > 0)
    return `The paragraph opens with <b>${esc(glyph(steps[0].ch))}</b>, not a letter — so the first letter of the first sentence is character #${lead + 1}, not character #1. The flag is armed from the start and simply stays armed across the opening punctuation until a letter turns up, which is the same mechanism that carries it across <code class='inl'>". "</code> in the middle of a paragraph; nothing here is a special case for the beginning. This is where <code class='inl'>charAt(0).toUpperCase()</code> quietly does nothing at all: <code class='inl'>"'".toUpperCase()</code> is <code class='inl'>"'"</code>, so the split version raises a quote mark and calls it done.${tail}`;

  const reach = steps.findIndex((s, i) => s.act === "cap" && i > 0 && steps[i - 1].act === "skip");
  if (reach > 0) {
    const gapStart = steps.slice(0, reach).findIndex((s, i) => s.act === "arm" && steps.slice(i + 1, reach).every((t) => t.act === "skip"));
    const gap = reach - gapStart - 1;
    // Three of the five official paragraphs land here, so say what is different about
    // each: a run of enders in front of the gap, or filler on the ender's other side.
    let runFrom = gapStart;
    while (runFrom > 0 && steps[runFrom - 1].act === "arm") runFrom--;
    const extra = runFrom < gapStart
      ? ` And that ender is the last of a run of <b>${gapStart - runFrom + 1}</b>. Each one re-armed a flag that was already armed, which costs nothing and is why <code class='inl'>...</code> and <code class='inl'>!!</code> need no handling of their own — the flag has no notion of how many times it has been set.`
      : gapStart > 0 && steps[gapStart - 1].act === "skip"
        ? ` And look at the other side of it: character #${gapStart} is filler too, so this ender has a space <i>before</i> it as well as after. That space belongs to the sentence and has to come out untouched, which is what rules out every strategy that trims or normalises before it starts.`
        : "";
    return `Look at characters #${gapStart + 1}–${reach + 1}. The ender <b>${esc(steps[gapStart].ch)}</b> arms the flag, then <b>${gap}</b> character${gap === 1 ? " goes" : "s go"} by that are neither enders nor alphanumeric — appended unchanged, flag <i>untouched</i> — and only then does the letter <b>${esc(steps[reach].ch)}</b> arrive and get raised. That gap is the reason the rule cannot be "capitalise the character after an ender": the character after the ender is <b>${esc(glyph(steps[gapStart + 1].ch))}</b>, and <code class='inl'>"${esc(steps[gapStart + 1].ch)}".toUpperCase()</code> is itself. The statement says the first <b>letter</b> of each sentence, and "first letter" means staying armed across an unbounded amount of filler rather than acting at a fixed offset.${extra}${tail}`;
  }

  const runIdx = steps.findIndex((s, i) => i > 0 && s.act === "arm" && steps[i - 1].act === "arm");
  const tight = steps.findIndex((s, i) => s.act === "cap" && i > 0 && steps[i - 1].act === "arm");
  if (runIdx > 0 || tight > 0)
    return `${runIdx > 0 ? `Characters #${runIdx} and #${runIdx + 1} are both enders. The second one arms a flag that was already armed, which costs nothing and needs no special case — a run of <code class='inl'>!!!</code> or <code class='inl'>...</code> just re-arms it once per character. ` : ""}${tight > 0 ? `And the sentence that follows starts <i>immediately</i>: <b>${esc(steps[tight].ch)}</b> at #${tight + 1} sits flush against the ender with no space at all. ` : ""}That kills the tempting shortcut of splitting on <code class='inl'>". "</code> or on whitespace — there is no whitespace here to split on, so the whole paragraph comes back as one piece and only its very first character gets raised. Carrying a flag does not care: a separator that is zero characters wide is the same code path as one that is five.${tail}`;

  const inWord = steps.findIndex((s, i) => s.act === "skip" && !s.armed && s.ch !== " ");
  if (inWord > 0)
    return `The interesting character here is <b>${esc(steps[inWord].ch)}</b> at #${inWord + 1}, sitting <i>inside</i> a word with the flag already down. It is in the third category — leave the flag alone — and that is the whole reason the category has to exist. Re-arm on "any punctuation" and <code class='inl'>today's</code> comes back as <code class='inl'>today'S</code>; the flag has to be cleared by the <b>letter</b> that starts the sentence, not re-armed by whatever punctuation wanders past. Only <code class='inl'>.</code>, <code class='inl'>?</code> and <code class='inl'>!</code> arm it.${tail}`;

  const caps = steps.filter((s) => s.act === "cap").length;
  return `One straightforward pass: <b>${caps}</b> letter${caps === 1 ? "" : "s"} raised, every other character copied across untouched. This is the shape of input on which every wrong version looks right — a single sentence with its ender at the end gives a splitter nothing to get wrong and gives an after-the-ender rule nothing to act on. Edit the text, or click one of the other chips, and watch the two rows below come apart.${tail}`;
}

// ── STEP — the scan, one character at a time, with the flag decision on its own line ──
// The `first` temporary is hoisted out of the if/else so that each of the three
// categories gets its own source line to highlight: 6 clears, 7 arms, and 8 falling
// through to nothing is the "leave it alone" case you cannot see in the one-liner.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">capitalize</span>(<span class="tok" data-t="param">paragraph</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span>, start = <span class="k">true</span></span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop">ch</span> <span class="k">of</span> paragraph) {` },
  { ln: 4, html: `    <span class="k">const</span> first = <span class="tok" data-t="test">start &amp;&amp; /[a-z]/i.<span class="fn">test</span>(ch)</span>;` },
  { ln: 5, html: `    <span class="tok" data-t="emit">out += first ? ch.<span class="fn">toUpperCase</span>() : ch</span>;` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="clr1">first</span>) start = <span class="k">false</span>;` },
  { ln: 7, html: `    <span class="k">else if</span> (<span class="tok" data-t="arm">/[.?!]/.<span class="fn">test</span>(ch)</span>) start = <span class="k">true</span>;` },
  { ln: 8, html: `    <span class="k">else if</span> (<span class="tok" data-t="clr2">/[a-z0-9]/i.<span class="fn">test</span>(ch)</span>) start = <span class="k">false</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> out;` },
  { ln: 11, html: `}` },
];

// Short on purpose. Two steps land per character, so a 78-character official paragraph
// would be a 150-step trace nobody scrubs to the end of; CONTRIBUTING allows a
// step-through to curate for trace length provided the cases it drops stay reachable,
// and all five official paragraphs are chips on the demo above. Each of these is one
// official shape shrunk to its bones, plus the two edges that are ours.
const TRACE_CASES = [
  "hi. go!",      // ender, one space of filler, letter — the plain shape
  "ah!!ok.",      // a run of enders and no space at all between sentences
  "it's ok.",     // an apostrophe inside a word, with the flag already down
  "hm . why?",    // a detached ender with filler on both sides of it
  "'tis ok.",     // punctuation before the first letter of the first sentence
  "1 no. ok!",    // a digit opens a sentence — ours, and the case the spec omits
];

function trace(raw) {
  const paragraph = String(raw);
  const steps = [];
  let out = "", start = true, ch, first, idx = -1;
  const marks = [];
  const S = (line, note, x = {}) => {
    const vars = { paragraph: `"${paragraph}"` };
    // `out` and `start` are born on line 2 and live to the end of the call; `ch` and
    // `first` only exist inside the loop body, so they vanish again at the return.
    if (line >= 2) { vars.out = `"${out}"`; vars.start = String(start); }
    if (line >= 3 && idx >= 0) vars.ch = `"${glyph(ch)}"`;
    if (line >= 4 && line <= 8 && idx >= 0) vars.first = String(first);
    const structs = [];
    if (line >= 3) structs.push({ label: "paragraph", items: [...paragraph].map((c, i) => `${i === idx ? "▶" : ""}${glyph(c)}${marks[i] || ""}`) });
    if (line >= 2) structs.push({ label: "out", items: [...out].map(glyph), newest: true });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `capitalize("${paragraph}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Raise the first letter of every sentence in <b>"${esc(paragraph)}"</b> and leave everything else byte for byte. Nothing here gets split: the delimiters and the spacing between them are part of the answer, so the only safe move is to walk the string and rebuild it.`, { focus: "param" });
  S(2, `Two pieces of state, and the second one is the whole solution. <code class='inl'>start</code> means "a sentence has ended and its first letter has not arrived yet". It begins <b>true</b> because the very first sentence needs a capital as well, and there is no ender in front of it to arm the flag on its behalf.`, { focus: "init", changed: ["out", "start"] });
  S(3, `One character at a time, left to right. Watch what this loop does <i>not</i> do — no <code class='inl'>split</code>, no <code class='inl'>join</code>, no lookahead. Splitting would throw away exactly the thing the answer has to preserve, and then you would have to put it back.`, { focus: "loop" });

  for (let i = 0; i < paragraph.length; i++) {
    idx = i; ch = paragraph[i];
    const isL = LETTER.test(ch);
    const armed = start;
    first = armed && isL;
    S(4, first
      ? `Character #${i + 1} is <b>${esc(glyph(ch))}</b>, a letter, and the flag is <b>armed</b>. This is the one the statement is talking about — not "the character after the ender", but the first <i>letter</i> since it, however far back that ender was.`
      : armed
        ? `Character #${i + 1} is <b>${esc(glyph(ch))}</b>. The flag is armed but this is not a letter, so nothing is raised — and notice the test says nothing about dropping the flag either. Whether this character disarms is decided further down, and for ${ch === " " ? "a space" : `<code class='inl'>${esc(ch)}</code>`} the answer will be no.`
        : `Character #${i + 1} is <b>${esc(glyph(ch))}</b> and the flag is down — the sentence is already under way, so ${isL ? `this letter is mid-word and stays exactly as it is` : `there is nothing to raise here regardless`}.`,
      { focus: "test", changed: ["ch", "first"], eval: { expr: `start = ${armed} && /[a-z]/i.test("${glyph(ch)}") = ${isL}`, val: first } });

    out += first ? ch.toUpperCase() : ch;
    if (first) marks[i] = "↑";
    S(5, first
      ? `<b>${esc(glyph(ch))}</b> goes out as <b>${esc(glyph(ch.toUpperCase()))}</b>. Every character is appended on this one line whether it was raised or not, which is what makes "all other characters should be preserved" true by construction rather than by care.`
      : `<b>${esc(glyph(ch))}</b> is appended untouched. Doubled enders, the space before a period, the apostrophe inside a word — none of them are decisions here, they are just copied, and that is why the output can never drift from the input's spacing.`,
      { focus: "emit", changed: ["out"] });

    if (first) {
      start = false;
      S(6, `The sentence has its capital, so the flag comes down. It stays down until an ender puts it back up — which is the only thing standing between this and a paragraph in Title Case.`,
        { focus: "clr1", eval: { expr: `first = true`, val: true }, changed: ["start"] });
    } else if (ENDER.test(ch)) {
      const again = armed;
      start = true;
      S(7, again
        ? `Another ender, and the flag was <b>already</b> armed. Arming it a second time changes nothing — which is exactly why a run like <code class='inl'>!!!</code> or <code class='inl'>...</code> needs no special handling at all. The naive fix of "skip past consecutive enders" is solving a problem the flag does not have.`
        : `<b>${esc(ch)}</b> ends a sentence, so the flag goes up. It is now armed and will stay armed — through spaces, quotes, whatever comes — until a letter or a digit arrives.`,
        { focus: "arm", eval: { expr: `/[.?!]/.test("${glyph(ch)}")`, val: true }, changed: ["start"] });
    } else if (ALNUM.test(ch)) {
      const wasArmed = armed;
      start = false;
      S(8, wasArmed
        ? `A digit with the flag armed. It cannot be capitalized, but it does mean the sentence has begun, so it <b>clears</b> the flag — otherwise the capital would be carried along to the next word and land in the middle of the sentence. The statement never covers this case; it is a decision, and this is it.`
        : `A letter or digit in the middle of a sentence. The flag is already down, so this line changes nothing — but it is the line that matters for the character right after an ender, and putting digits in the same category as letters is a deliberate call.`,
        { focus: "clr2", eval: { expr: `/[a-z0-9]/i.test("${glyph(ch)}")`, val: true }, changed: wasArmed ? ["start"] : [] });
    } else {
      S(8, `Neither test fired: <b>${esc(glyph(ch))}</b> is not an ender and not alphanumeric, so no branch runs and <code class='inl'>start</code> keeps the value it already had (<b>${start}</b>). This third category is where the bugs live. ${armed
        ? `Right now the flag stays <b>up</b> — that is what carries it across the gap between an ender and the letter it belongs to.`
        : `Right now the flag stays <b>down</b> — and that is what keeps the apostrophe in <code class='inl'>today's</code> from re-arming it and giving you <code class='inl'>today'S</code>.`}`,
        { focus: "clr2", eval: { expr: `/[a-z0-9]/i.test("${glyph(ch)}")`, val: false } });
    }
  }

  idx = -1;
  S(10, `Done in one pass, with one boolean and no backtracking. <b>Return "${esc(out)}"</b>. Every character of the input is still here in its original place; the only difference is that ${marks.filter(Boolean).length} of them arrived while the flag was up.`,
    { done: true, result: `"${out}"`, ret: { value: `"${out}"` } });
  return steps;
}

export default {
  n: 37, id: "capitalize", title: "Sentence Capitalizer", dates: ["2025-09-16"],
  statement: `Given a paragraph, return a new paragraph where the <b>first letter of each sentence</b> is capitalized. Every other character is preserved exactly as it was. A sentence ends with a period (<code class="inl">.</code>), one or more question marks (<code class="inl">?</code>), or one or more exclamation points (<code class="inl">!</code>). <span class="rule">Example: <code class="inl">capitalize("hello world. how are you?")</code> → <code class="inl">"Hello world. How are you?"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass, one boolean",
      approach: `The rule for any one character depends on <b>what came before it</b>, not on the character itself — "raise this letter if a sentence just ended" is a statement about history, and history means state. So: one left-to-right pass carrying one boolean, <code class='inl'>start</code>, meaning "a sentence has ended and its first letter has not arrived yet". It begins <b>true</b>, because the first sentence needs a capital too and there is no ender in front of it. The interesting part is not when to set the flag but <b>what leaves it alone</b>. Three categories: <code class='inl'>.?!</code> arm it, letters and digits clear it, and everything else — spaces, apostrophes, quotes — does not touch it at all. That third category is where every wrong version dies. Official case <code class='inl'>"there's a space before this period . why …"</code> puts a space between the ender and the letter to raise, so "capitalise the character after an ender" capitalises a space and gives up; the flag has to survive arbitrary filler. Official case <code class='inl'>"crazy!!!strange???unconventional...sentences."</code> has no whitespace between sentences at all, so <code class='inl'>split(". ")</code> returns the whole paragraph as one piece — and the run of <code class='inl'>!!!</code> just re-arms an already-armed flag, harmlessly, with no special case. Those two failures are <b>disjoint</b>: the splitter passes 4 of the 5 official cases and misses only that one, the after-an-ender rule passes only that one and misses the other three. Neither shortcut covers the other's blind spot, which is why the fix is a flag rather than a combination of the two. And the apostrophe in <code class='inl'>today's</code> is the trap for anyone who disarms on "any non-letter": it sits <i>inside</i> a word, so the flag must be cleared by the <b>letter</b> that opened the sentence rather than re-armed by passing punctuation. Type your own paragraph, or drag the cursor along the strip and watch the flag flip.`,
      code: `// "The first LETTER of each sentence" is a rule about history, so carry history:
// one boolean, one pass. Splitting on ". " cannot work, because the delimiters and
// the spacing between them are part of the answer.
function capitalize(paragraph: string): string {
  let out = "";
  // "A sentence has ended and its first letter has not arrived yet." True at the
  // start: the first sentence needs a capital and has no ender in front of it.
  let start = true;
  for (const ch of paragraph) {
    const first = start && /[a-z]/i.test(ch);
    out += first ? ch.toUpperCase() : ch;
    // Three categories, and the third one is the whole problem:
    //   .?!             arm the flag (a run of them just re-arms it, harmlessly)
    //   letters/digits  clear it — the sentence is under way
    //   anything else   LEAVES IT ALONE, which is what carries the flag across
    //                   ". " and stops the apostrophe in "today's" re-arming it
    if (first) start = false;
    else if (/[.?!]/.test(ch)) start = true;
    else if (/[a-z0-9]/i.test(ch)) start = false;
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through", cost: "one character, one flag",
      approach: `The same scan with the flag decision broken onto its own line, so each of the three categories gets a line you can watch highlight. Start on <b>hm . why?</b> and follow the flag from the period across two characters of filler to the <code class='inl'>w</code> that finally clears it. Then <b>ah!!ok.</b>, where the second <code class='inl'>!</code> arms an already-armed flag and the next sentence starts flush against it; <b>it's ok.</b>, where the apostrophe falls through both tests and leaves the flag exactly as it was; and <b>1 no. ok!</b>, ours, where a digit opens a sentence and clears a flag it cannot use. The cases here are deliberately tiny — two steps land per character — and all five official paragraphs are chips on the <b>Solution</b> demo. Type any of them in and the trace just gets longer. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "paragraph =", value: TRACE_CASES[3], presets: TRACE_CASES, hint: "any string" } }),
    },
  ],
};
