// #355 · Morse Code — the gaps are data: three spaces end a word, one ends a letter.
// ONE approach, and deliberately so. The alphabet is a lookup table; there is no
// wasteful act to name on the other side of it, and every alternative spelling
// (regex, reduce, a dot/dash tree) does the same work for the same cost — an edit,
// not a second mental model. What the module has to make visible instead is the
// SEPARATOR: the same character, one space vs three, carrying two different
// meanings. So the demo draws every gap at its true width, and the notes keep
// pointing at the one rule that matters — split the WIDE separator first, because
// the narrow split can't see a gap it has already destroyed.
import { el, esc, mountDebugger } from "../shared.js";

// The table, keyed the way the problem hands it to you: code → letter. This one
// constant feeds the demo, the trace AND the shipped snippet (see CODE_TABLE),
// so the code block can never drift from the data the page actually runs on.
const MORSE = {
  ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F",
  "--.": "G", "....": "H", "..": "I", ".---": "J", "-.-": "K", ".-..": "L",
  "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R",
  "...": "S", "-": "T", "..-": "U", "...-": "V", ".--": "W", "-..-": "X",
  "-.--": "Y", "--..": "Z",
};
const TO_MORSE = Object.fromEntries(Object.entries(MORSE).map(([m, c]) => [c, m]));

// Which OTHER codes start with this one — the reason a gap is load-bearing.
// "." is the head of ".." and "...", so E/I/S are told apart by nothing but the
// space that ended the token.
const longerThan = (code) => Object.keys(MORSE).filter((k) => k !== code && k.startsWith(code));

// Cases 1–5 are freeCodeCamp's official set, in the order the grader lists them.
// Cases 6–7 are ours, and they are the same seven characters twice:
//   6 — ". .. ..." with ONE-space gaps is a single word, "EIS".
//   7 — ".   ..   ..." with THREE-space gaps is three words, "E I S".
// Identical dots, identical order, different answer — the gap width is the only
// thing that changed. That pair is the whole lesson, and no official case has it:
// every official input is unambiguous once you know the rule, so none of them
// punishes you for guessing the separator wrong.
const CASES = [
  { code: "--..", want: "Z" },
  { code: "... --- ...", want: "SOS" },
  { code: "..-. .-. . . -.-. --- -.. . -.-. .- -- .--.", want: "FREECODECAMP" },
  { code: ".... . .-.. .-.. ---   .-- --- .-. .-.. -..", want: "HELLO WORLD" },
  { code: "- .... .   --.- ..- .. -.-. -.-   -... .-. --- .-- -.   ..-. --- -..-   .--- ..- -- .--. . -..   --- ...- . .-.   - .... .   .-.. .- --.. -.--   -.. --- --.", want: "THE QUICK BROWN FOX JUMPED OVER THE LAZY DOG" },
  { code: ". .. ...", want: "EIS" },
  { code: ".   ..   ...", want: "E I S" },
];

// The shipped solution, factored so the demo cannot drift from it: split on the
// WIDE separator, then the narrow one. The only difference from the code block is
// the `?? "?"` — the graded snippet indexes the table directly, because a graded
// input is always well-formed, while the demo has a half-typed string in it.
const decodeWords = (code) =>
  code.split("   ").map((word) => word.split(" ").map((t) => ({ t, ch: MORSE[t] })));
const textOf = (words) => words.map((w) => w.map((l) => l.ch ?? "?").join("")).join(" ");

// Letters → Morse, for the reverse field. Unknown characters are dropped rather
// than encoded; there is no Morse for "!" in this table.
const encode = (text) =>
  text.toUpperCase().trim().split(/\s+/).filter(Boolean)
    .map((w) => [...w].map((c) => TO_MORSE[c]).filter(Boolean).join(" "))
    .filter(Boolean).join("   ");

// Cut a string into alternating symbol / space runs so each gap can be drawn at
// its real width — the one thing a plain <input> renders identically at 1 and 3.
function runs(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    let j = i;
    if (src[i] === " ") { while (src[j] === " ") j++; out.push({ gap: j - i }); }
    else { while (j < src.length && src[j] !== " ") j++; out.push({ sym: src.slice(i, j) }); }
    i = j;
  }
  return out;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mo-strip { display:flex; align-items:center; flex-wrap:wrap; gap:0 2px; margin:12px 0 2px;
                border:1px solid var(--border); border-radius:10px; background:var(--panel-2); padding:8px 10px; min-height:46px; }
    .mo-sym { font:700 15px var(--mono); color:var(--accent); letter-spacing:.1em; padding:0 2px; }
    .mo-sym.bad { color:var(--danger); text-decoration:underline wavy; }
    .mo-gap { height:26px; border-radius:5px; display:flex; align-items:center; justify-content:center;
              font:800 9.5px var(--sans); letter-spacing:.04em; flex:none; }
    .mo-gap.g1 { width:20px; color:var(--warn); border:1px dashed color-mix(in srgb,var(--warn) 65%,var(--border));
                 background:color-mix(in srgb,var(--warn) 14%,transparent); }
    .mo-gap.g3 { width:60px; color:var(--accent); border:1px dashed color-mix(in srgb,var(--accent) 70%,var(--border));
                 background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .mo-gap.gx { width:38px; color:var(--danger); border:1px dashed var(--danger);
                 background:color-mix(in srgb,var(--danger) 14%,transparent); }
    .mo-legend { font:12px var(--sans); color:var(--muted); display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-bottom:10px; }
    .mo-words { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:14px 0 2px; }
    .mo-word { border:1px solid var(--border); border-radius:10px; background:var(--panel-2);
               padding:7px 10px 5px; display:flex; gap:8px; align-items:flex-end; }
    .mo-let { min-width:30px; text-align:center; }
    .mo-let .c { font:800 20px var(--mono); color:var(--text); line-height:1.15; }
    .mo-let .m { font:700 10.5px var(--mono); color:var(--accent); letter-spacing:.09em; }
    .mo-let.bad .c { color:var(--danger); } .mo-let.bad .m { color:var(--danger); }
    .mo-naive { font:12.5px var(--mono); color:var(--muted); line-height:1.7; margin-top:12px; }
    .mo-naive b { color:var(--text); }
    .mo-pieces { display:flex; flex-wrap:wrap; gap:4px; margin:7px 0 4px; }
    .mo-piece { font:700 12px var(--mono); border:1px solid var(--border); border-radius:6px;
                background:var(--panel-2); color:var(--accent); padding:3px 7px; letter-spacing:.08em; }
    .mo-piece.empty { color:var(--danger); border-color:var(--danger); letter-spacing:0; }
    .mo-alpha { display:flex; flex-wrap:wrap; gap:4px; margin-top:10px; }
    .mo-a { border:1px solid var(--border); border-radius:6px; background:var(--panel-2); cursor:pointer;
            padding:3px 5px 2px; text-align:center; min-width:34px; color:var(--muted); }
    .mo-a:hover { border-color:var(--accent); }
    .mo-a .c { display:block; font:800 12px var(--mono); }
    .mo-a .m { display:block; font:700 9px var(--mono); letter-spacing:.06em; }
    .mo-a.on { border-color:var(--accent); color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,var(--panel-2)); }
  `));
}

// A gap is drawn proportional to how many spaces it really is: 1 narrow, 3 wide,
// anything else red — because "two spaces" is not a separator this format has.
const gapCls = (n) => "mo-gap " + (n === 1 ? "g1" : n === 3 ? "g3" : "gx");
const gapEl = (n) => el("span", gapCls(n), String(n));
const gapChip = (n) => `<span class="${gapCls(n)}">${n}</span>`;

function mount(host) {
  ensureStyle();

  const inp = el("input");
  inp.type = "text"; inp.value = CASES[3].code;
  inp.style.width = "min(560px, 100%)"; inp.style.font = "700 14px var(--mono)";

  const rev = el("input");
  rev.type = "text"; rev.placeholder = "hello world";
  rev.style.width = "200px"; rev.style.font = "700 13px var(--mono)";

  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "morse ="), inp);

  const comp = el("div", "controls");
  const btn = (label, fn) => { const b = el("button", "chip", label); b.onclick = () => { fn(); inp.focus(); render(); }; return b; };
  const add = (s) => { inp.value += s; };
  comp.append(
    el("span", "ctl-label", "compose"),
    btn("dot&nbsp;&nbsp;.", () => add(".")),
    btn("dash&nbsp;&nbsp;−", () => add("-")),
    btn("letter gap&nbsp;&nbsp;␣", () => add(" ")),
    btn("word gap&nbsp;&nbsp;␣␣␣", () => add("   ")),
    btn("⌫", () => {
      const v = inp.value;
      inp.value = v.endsWith("   ") ? v.slice(0, -3) : v.slice(0, -1);
    }),
    btn("clear", () => { inp.value = ""; }),
  );

  const revRow = el("div", "controls");
  revRow.append(el("span", "ctl-label", "or type text →"), rev);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const label = c.code.length > 26 ? c.want.slice(0, 14) + (c.want.length > 14 ? "…" : "") : c.code;
    const chip = el("button", "chip", esc(label) + (i < 5 ? "" : " ✎"));
    chip.title = c.code;
    chip.onclick = () => { inp.value = c.code; rev.value = ""; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", 'Type Morse, or build it with the <b>compose</b> buttons so you never have to count spaces by hand — <b>letter gap</b> inserts one space, <b>word gap</b> inserts three. Or type plain text on the right and watch it encode. The chips are freeCodeCamp\'s five official cases plus two of ours (✎); the last two are the <i>same seven characters</i> with different gap widths.'),
    ctl, comp, revRow, pre, out,
  );

  inp.oninput = render;
  rev.oninput = () => { inp.value = encode(rev.value); render(); };
  render();

  function render() {
    const raw = inp.value;
    const src = raw.trim();          // the graded inputs never carry padding; a composed one might
    out.innerHTML = "";

    // ── the string, with every gap drawn at its true width ──
    const strip = el("div", "mo-strip");
    if (!src) strip.append(el("span", "muted", "nothing to decode yet — press a dot or a dash"));
    runs(src).forEach((r) => {
      if (r.sym != null) strip.append(el("span", "mo-sym" + (MORSE[r.sym] ? "" : " bad"), esc(r.sym)));
      else strip.append(gapEl(r.gap));
    });
    out.append(
      strip,
      el("div", "mo-legend",
        `${gapChip(1)} one space = next letter &nbsp;·&nbsp; ${gapChip(3)} three spaces = next word` +
        (raw !== src ? " &nbsp;·&nbsp; <b>leading/trailing spaces trimmed before decoding</b>" : "")),
    );

    if (!src) return;

    // ── the two splits, as boxes: words outside, letters inside ──
    const words = decodeWords(src);
    const wrow = el("div", "mo-words");
    words.forEach((w, i) => {
      if (i) wrow.append(gapEl(3));
      const box = el("div", "mo-word");
      w.forEach((l, j) => {
        if (j) box.append(gapEl(1));
        box.append(el("div", "mo-let" + (l.ch ? "" : " bad"),
          `<div class="c">${esc(l.ch ?? "?")}</div><div class="m">${esc(l.t || "∅")}</div>`));
      });
      wrow.append(box);
    });
    out.append(wrow);

    const text = textOf(words);
    out.append(el("div", "result-line",
      `<span class="muted mono">decodeMorse(…) =</span><span class="num right">"${esc(text)}"</span>`));

    // ── what the naive single split would have handed you ──
    const pieces = src.split(" ");
    const empties = pieces.filter((p) => p === "").length;
    const shown = pieces.slice(0, 22);
    const prow = el("div", "mo-pieces");
    shown.forEach((p) => prow.append(el("span", "mo-piece" + (p === "" ? " empty" : ""), p === "" ? '""' : esc(p))));
    if (pieces.length > shown.length) prow.append(el("span", "muted mono", `+${pieces.length - shown.length} more`));

    const naive = el("div", "mo-naive");
    naive.innerHTML = empties
      ? `<code class="inl">code.split(" ")</code> alone gives <b>${pieces.length}</b> pieces, <b>${empties}</b> of them empty strings. That's all the word breaks are reduced to — <b>two empties per break</b> — so you'd have to count them back out. Splitting on <code class="inl">"   "</code> first means you never meet one.`
      : `<code class="inl">code.split(" ")</code> alone gives <b>${pieces.length}</b> pieces and <b>no</b> empty ones — because this input has no word break yet. That's exactly why the naive split looks correct right up until the first three-space gap.`;
    out.append(naive, prow);

    // ── the table, clickable, with the letters in play lit up ──
    const used = new Set(words.flat().map((l) => l.ch).filter(Boolean));
    const alpha = el("div", "mo-alpha");
    Object.entries(MORSE).forEach(([m, c]) => {
      const a = el("div", "mo-a" + (used.has(c) ? " on" : ""), `<span class="c">${c}</span><span class="m">${esc(m)}</span>`);
      a.title = `append ${m} + a letter gap`;
      a.onclick = () => { inp.value = (src ? src + " " : "") + m; render(); };
      alpha.append(a);
    });
    out.append(el("div", "muted", "The table — click one to append its code and a letter gap. Lit entries are in the current string."), alpha);
  }
}

// The snippet ships the WHOLE table, generated from the constant above rather
// than retyped, so it is genuinely copy-pasteable and cannot disagree with the
// demo. Four entries per line keeps 26 of them readable.
const CODE_TABLE = (() => {
  const entries = Object.entries(MORSE).map(([m, c]) => `"${m}": "${c}"`);
  const rows = [];
  for (let i = 0; i < entries.length; i += 4) rows.push("  " + entries.slice(i, i + 4).join(", ") + ",");
  return `const MORSE: Record<string, string> = {\n${rows.join("\n")}\n};`;
})();

const CODE = `${CODE_TABLE}

// Two separators made of the same character, told apart only by width — so
// split on the WIDE one first. After that every remaining space is a letter
// gap, and the narrow split can never produce an empty piece.
function decodeMorse(code: string): string {
  return code
    .split("   ")                        // three spaces → words
    .map((word) => word
      .split(" ")                        // one space → letters
      .map((letter) => MORSE[letter])
      .join(""))
    .join(" ");                          // one space between words in the output
}`;

// ── STEP — the same algorithm written as loops, so each split is a line you can
// stop on. Scope is gated on the line number: `word`, `letters` and `text` are
// loop-body bindings, so they appear when their line runs and leave again at the
// top of the next iteration — `inWord`/`inLetter` are the liveness flags that do
// it, the same trick 337 uses for its loop variable. `words` and `out` are
// function-scoped and stay for the whole call.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">decodeMorse</span>(<span class="tok" data-t="code">code</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="split3">words = code.<span class="fn">split</span>(<span class="st">"&nbsp;&nbsp;&nbsp;"</span>)</span>;  <span class="cm">// THREE spaces</span>` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="out">out = []</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="word">word <span class="k">of</span> words</span>) {` },
  { ln: 5,  html: `    <span class="k">const</span> <span class="tok" data-t="split1">letters = word.<span class="fn">split</span>(<span class="st">"&nbsp;"</span>)</span>;  <span class="cm">// ONE space</span>` },
  { ln: 6,  html: `    <span class="k">let</span> <span class="tok" data-t="text">text = <span class="st">""</span></span>;` },
  { ln: 7,  html: `    <span class="k">for</span> (<span class="k">const</span> l <span class="k">of</span> letters) <span class="tok" data-t="lookup">text += MORSE[l]</span>;` },
  { ln: 8,  html: `    <span class="tok" data-t="push">out.<span class="fn">push</span>(text)</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="join">out.<span class="fn">join</span>(<span class="st">"&nbsp;"</span>)</span>;` },
  { ln: 11, html: `}` },
];

// The step-through curates CASES down to five: #3 (FREECODECAMP, 12 letters in
// one word) and #5 (the 44-letter pangram) are the same two branches as #2 and
// #4 at four times the trace length, and both stay reachable in the demo — as a
// preset chip and by typing. The two that teach are kept and are the last two.
const STEP_CASES = [0, 1, 3, 5, 6].map((i) => CASES[i]);

const q = (s) => `"${s}"`;
const vis = (s) => s.replace(/ /g, "␣");   // make surviving single spaces countable in a chip

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const code = STEP_CASES[k - 1].code;
  const words = code.split("   ");
  const steps = [];
  const out = [];
  let word, letters, text, letter;
  let inWord = false, inLetter = false;

  const S = (line, note, x = {}) => {
    const vars = { code: q(vis(code)) };
    if (inWord && line >= 4 && line <= 8) vars.word = q(vis(word));        // `const word` — loop body only
    if (inWord && line >= 6 && line <= 8) vars.text = q(text);             // `let text` is line 6
    if (inLetter && line === 7) vars.l = q(letter);                        // inner for…of binding
    const structs = [];
    if (line >= 2) structs.push({ label: "words", items: words.map((w) => q(vis(w))) });
    if (inWord && line >= 5 && line <= 8) structs.push({ label: "letters", items: letters.map(q) });
    if (line >= 3) structs.push({ label: "out", items: out.map(q), newest: !!x.pushed });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `decodeMorse(…)`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const nW = words.length;
  S(1, `Decode <b>${q(vis(code))}</b> — every space is drawn as <b>␣</b> here, because the entire problem is that you cannot tell one from three by eye. The spec says a <b>single</b> space separates letters and <b>three</b> separate words, so the gaps are data, not layout.`, { focus: "code" });

  S(2, `Split on <b>three</b> spaces first → <b>${nW}</b> word${nW === 1 ? "" : "s"}. The wide separator is the one that can only appear at a word boundary, so cutting on it is unambiguous — and it leaves every one-space gap sitting untouched inside the pieces. Do the narrow split first and this information is gone: the three-space gaps collapse into empty strings you'd then have to count back out.`, { focus: "split3", eval: { expr: `code.split("␣␣␣").length`, val: nW } });

  S(3, `<b>out</b> collects one decoded word per iteration. Keeping the words apart until the very end is what lets line 10 put a <i>single</i> space between them — the output separator has nothing to do with the input's three.`, { focus: "out" });

  words.forEach((w, i) => {
    inWord = true; word = w; letters = null; text = undefined;
    S(4, `Take word <b>${i + 1}</b> of <b>${nW}</b> → <b>word = ${q(vis(w))}</b>. Inside a word, every gap that survived line 2 is exactly one space wide — that promise is what makes the next split safe.`, { focus: "word", changed: ["word"], eval: { expr: `words[${i}] exists`, val: true } });

    letters = w.split(" ");
    S(5, `Split on <b>one</b> space → <b>${letters.length}</b> letter code${letters.length === 1 ? "" : "s"}. There can be no empty piece here, because the only place two spaces ever sat next to each other was a word gap, and line 2 already ate it.`, { focus: "split1" });

    text = "";
    S(6, `Start this word's text empty. ${letters.length === 1 ? "This word is a single code, so there is nothing to concatenate — but the same line still runs." : "Letters get concatenated with nothing between them; the separator was consumed by the split and does not survive into the message."}`, { focus: "text", changed: ["text"] });

    letters.forEach((l) => {
      inLetter = true; letter = l;
      const ch = MORSE[l];
      const longer = longerThan(l);
      const why = longer.length
        ? `<code class='inl'>${esc(l)}</code> is also the <b>start</b> of ${longer.slice(0, 2).map((x) => `<code class='inl'>${esc(x)}</code> (${MORSE[x]})`).join(" and ")}${longer.length > 2 ? ` and ${longer.length - 2} more` : ""} — nothing in the dots and dashes says where <b>${ch}</b> stops. Only the space that ended this token does.`
        : `No other code starts with <code class='inl'>${esc(l)}</code>, so this one happens to be self-delimiting — but you can't rely on that in general, which is why the split does the work rather than a longest-match scan.`;
      text += ch;
      S(7, `<b>MORSE[${q(l)}]</b> → <b>${ch}</b>, so text becomes <b>${q(text)}</b>. ${why}`, { focus: "lookup", changed: ["text", "l"] });
      inLetter = false;
    });

    out.push(text);
    S(8, `Word ${i + 1} is fully decoded — push <b>${q(text)}</b>. ${i + 1 < nW ? "The next iteration re-binds <b>word</b>, <b>letters</b> and <b>text</b>, which is why they blink out of the frame above." : "That was the last word, so the loop is about to end and these three leave scope for good."}`, { focus: "push", pushed: true });
  });

  inWord = false;
  S(4, `<b>words</b> is exhausted, so the outer loop ends and <b>word</b>, <b>letters</b> and <b>text</b> all leave scope — that's why they vanish from the frame. Only <b>words</b> and <b>out</b>, declared at function level, are still alive.`, { focus: "word", eval: { expr: `words[${nW}] exists`, val: false } });

  const result = out.join(" ");
  S(10, `<b>Join with ONE space</b> → <b>${q(result)}</b>. The asymmetry is the point: three spaces came <i>in</i> as a word break, one space goes <i>out</i> as one. ${nW === 1 ? "This input had no word gap at all, so the join had nothing to separate." : `Feed the same ${code.replace(/ +/g, " ").split(" ").length} codes in with one-space gaps throughout and you'd get <b>${q(out.join(""))}</b> instead — one word, same dots.`}`, { focus: "join", done: true, result: q(result), ret: { value: q(result) } });

  return steps;
}

export default {
  n: 355, id: "morse", title: "Morse Code", dates: ["2026-07-31"],
  statement: `Given a Morse code string, return the decoded message — <code class="inl">".-"</code> is <b>A</b>, <code class="inl">"-..."</code> is <b>B</b>, on through <code class="inl">"--.."</code> for <b>Z</b>. <span class="rule">Letters are separated by a <b>single</b> space; words are separated by <b>three</b>. Example: <code class="inl">decodeMorse(".... . .-.. .-.. ---&nbsp;&nbsp;&nbsp;.-- --- .-. .-.. -..")</code> → <b>"HELLO WORLD"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `The alphabet is the easy half — it's a table, and you either have it or you don't. The challenge is the <b>separator</b>: one space and three spaces are the same character at two widths, meaning two different things. Split on the <b>wide</b> one first (<code class='inl'>split("&nbsp;&nbsp;&nbsp;")</code>) and each piece is exactly one word; split on the narrow one inside that and each piece is exactly one letter code, with no empty strings to reason about. Reach for a single <code class='inl'>split(" ")</code> and the word boundaries survive only as pairs of empty strings — the <b>naive split</b> line under the demo counts them for you. The last two chips are the same seven characters with different gaps, and they decode to different messages.`,
      code: CODE,
      mount,
    },
    {
      name: "Step through", cost: "the two splits",
      approach: `The same algorithm written as two nested loops so each split gets its own line to stop on. Watch the <code class='inl'>words</code> struct appear at line 2, then <code class='inl'>letters</code> appear <i>inside</i> each word at line 5 and vanish again at the top of the next iteration — that nesting is the two separator widths made structural. Every space is drawn as <b>␣</b> in the panels, so you can count them. Case <b>4</b> and case <b>5</b> are the pair to compare: identical dots and dashes, one-space gaps versus three, and a different answer. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: STEP_CASES.length, presets: STEP_CASES.map((_, i) => i + 1), hint: `1–${STEP_CASES.length}: 1–3 official, 4–5 ours` },
      }),
    },
  ],
};
