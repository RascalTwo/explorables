// #25 · Vowel Repeater — one counter for the whole string, not per word or per letter.
// The four clauses in the statement are all counting rules wearing string-rule
// clothes. The counter is a single running total: it advances on every vowel
// OCCURRENCE, never on a consonant, and never resets at a space — which is why the
// o in "world" is the third vowel of "hello world" and lands as "ooo", and why the
// last a of the long official case is fourteen characters wide. The three case
// clauses then cost no branches at all, because ch + ch.toLowerCase().repeat(n) writes
// the original with its case and the copies without it, in one expression.
// One approach. Appending with += versus pushing into an array and joining is two
// spellings of one idea, not two mental models — see CONTRIBUTING, Tier 3.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–4 are freeCodeCamp's official tests, in the order the grader lists them.
// 5 and 6 are mine, each closing a gap the official set leaves open.
//   "banana" — the same letter written at three different lengths in six characters.
//     Every official case mixes its vowels, so none of them rules out a per-LETTER
//     counter (an `a` counter, an `e` counter, …); this one does, and it is the
//     misreading that survives casual testing because the answer only diverges once
//     a vowel repeats.
//   "synth flyby" — no vowels at all. The else branch runs eleven times, the counter
//     never moves, and the output is the input. Worth seeing because "duplicate each
//     vowel" sounds like it needs a vowel to be well defined, and because y isn't one.
const CASES = [
  "hello world",                        // official — the space does not reset the counter
  "freeCodeCamp",                       // official — adjacent vowels; capital C and C untouched
  "AEIOU",                              // official — the only case testing either case clause
  "I like eating ice cream in Iceland", // official — 34 characters in, 125 out
  "banana",                             // MINE — one letter, three different run lengths
  "synth flyby",                        // MINE — no vowels; output is identical to input
];

const isVowel = (ch) => "aeiou".includes(ch.toLowerCase());

// The solution, decomposed one character at a time so the demo and the trace read
// the same run and cannot drift. `mult` is how many characters that vowel became —
// 0 marks a non-vowel, which is also exactly "the counter did not move here".
function runs(str) {
  let seen = 0;
  return [...str].map((ch) => (isVowel(ch)
    ? { ch, text: ch + ch.toLowerCase().repeat(seen++), mult: seen }
    : { ch, text: ch, mult: 0 }));
}

// Spaces are invisible inside a tile and inside quotes, so print them. `show`/`qRaw`
// are for the places the scaffold escapes for us (frame titles, vars, structs, eval);
// `q` escapes here, because `note` and el() html are injected raw.
const show = (t) => t.replace(/ /g, "␣");
const qRaw = (t) => '"' + show(t) + '"';
const q = (t) => esc(qRaw(t));
const head = (t, n = 40) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const tail = (t, n = 40) => (t.length > n ? "…" + t.slice(-(n - 1)) : t);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .vr-out { display:flex; flex-wrap:wrap; gap:3px; align-items:flex-end; margin:16px 0 4px; }
    .vr-run { display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; }
    .vr-txt { font:800 15px var(--mono); padding:5px 6px; border-radius:6px; white-space:pre;
              border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .vr-run.v .vr-txt { color:var(--text); border-color:var(--accent); }
    .vr-mult { font:700 10.5px var(--mono); color:var(--muted); min-height:14px; }
    .vr-run.v .vr-mult { color:var(--accent); }
    .vr-chart { display:flex; align-items:flex-end; gap:3px; height:70px; margin:16px 0 6px; }
    .vr-bar { width:13px; border-radius:3px 3px 0 0; border:1px solid var(--accent); min-height:3px; }
    .vr-cap { font:12.5px var(--mono); color:var(--muted); }
    .vr-cap b { color:var(--text); }
    .vr-raw { font:13px/1.7 var(--mono); color:var(--text); background:var(--panel-2);
              border:1px solid var(--border); border-radius:8px; padding:9px 11px;
              word-break:break-all; margin-top:10px; }
  `));
}

// A vowel's tint scales with its multiplier, so the escalation is readable before
// you have read a single ×n label. Capped, or the tenth vowel onward is one colour.
const tint = (m) => `color-mix(in srgb, var(--accent) ${Math.min(58, 8 + m * 7)}%, transparent)`;

function mount(host) {
  ensureStyle();

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", q(head(c, 24)));
    chip.onclick = () => { inp.value = c; render(); };
    chips.append(chip);
  });

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = CASES[0]; inp.style.width = "370px";
  inp.oninput = render;
  ctl.append(el("span", "ctl-label", "str ="), inp);

  const out = el("div");
  host.append(
    el("div", "note", "Type any sentence. Each tile is one character of the <b>input</b> and shows what it became; the ×n under a vowel is its run length, and the staircase below is those run lengths in order. The quickest way to feel the rule: type <code class='inl'>a</code> repeatedly and watch every existing run stay put while only the new one grows — then put a space in the middle and watch nothing change."),
    chips, ctl, out,
  );
  render();

  function render() {
    const s = inp.value;
    const rs = runs(s);
    const result = rs.map((r) => r.text).join("");
    const vs = rs.filter((r) => r.mult);
    const v = vs.length;
    const added = result.length - s.length;
    out.innerHTML = "";

    out.append(el("div", "result-line",
      `<span class="badge ok">${s.length} chars → ${result.length} chars</span>` +
      `<span class="opcount ${v > 6 ? "hot" : "cool"}"><span class="n">${v}</span> ${v === 1 ? "vowel" : "vowels"} · +${added} characters</span>`));

    const row = el("div", "vr-out");
    rs.forEach((r) => {
      const cell = el("div", "vr-run" + (r.mult ? " v" : ""));
      const t = el("div", "vr-txt", esc(show(r.text)));
      if (r.mult) t.style.background = tint(r.mult);
      cell.append(t, el("div", "vr-mult", r.mult ? "×" + r.mult : ""));
      row.append(cell);
    });
    out.append(row);

    if (v) {
      const chart = el("div", "vr-chart");
      vs.forEach((r) => {
        const bar = el("div", "vr-bar");
        bar.style.height = `${(r.mult / v) * 100}%`;
        bar.style.background = tint(r.mult);
        bar.title = `vowel #${r.mult}: '${r.ch}' written ${r.mult}×`;
        chart.append(bar);
      });
      const sum = v <= 5 ? [...Array(v).keys()].join(" + ") : `0 + 1 + … + ${v - 1}`;
      out.append(chart, el("div", "vr-cap", v > 1
        ? `run lengths <b>1…${v}</b>, one rung per vowel &nbsp;·&nbsp; extra characters = <b>${sum}</b> = <b>${v}×${v - 1}/2</b> = <b>${added}</b>`
        : `one vowel, so its run length is <b>1</b> and nothing is added — the first vowel is always written once.`));
    }

    out.append(el("div", "vr-raw", esc(result) || "<span class='muted'>(empty)</span>"));

    // The notes below are the three ways this problem is misread, each shown only
    // when the current input actually exercises it.
    if (!v) {
      out.append(el("div", "note", `Not one of <code class='inl'>a e i o u</code> anywhere, so the else branch runs ${plural(s.length, "time")}, the counter never leaves <b>0</b>, and the output is the input. Note that <b>y</b> is not a vowel here — the statement lists five letters and means exactly those five.`));
    } else {
      const last = vs[vs.length - 1];
      out.append(el("div", "note", `The counter is <b>one running total for the whole string</b>. It reached <b>${v}</b>, so the last vowel — <b>'${esc(last.ch)}'</b> — was written ${plural(v, "time")}. It advances on a vowel <i>occurrence</i> and on nothing else: ${s.includes(" ") ? `the ${plural(s.split(" ").length - 1, "space")} in this input ${s.split(" ").length - 1 === 1 ? "is" : "are"} just more non-vowels, so the count carries straight across the word boundary rather than restarting at 1.` : `a consonant leaves it exactly where it was.`} That is why the output grows <b>quadratically</b> in the number of vowels while the input grows linearly — the staircase above is the sum being accumulated.`));

      // The dedupe misreading: does any single letter appear twice at different lengths?
      const byLetter = new Map();
      vs.forEach((r) => {
        const k = r.ch.toLowerCase();
        byLetter.set(k, [...(byLetter.get(k) || []), r.mult]);
      });
      const repeated = [...byLetter].find(([, m]) => m.length > 1);
      if (repeated) {
        out.append(el("div", "note", `<b>'${esc(repeated[0])}'</b> appears ${plural(repeated[1].length, "time")} and is written at ${repeated[1].map((m) => `<b>${m}</b>`).join(", ")} characters — the same letter, different lengths. There is no per-letter counter; there is one counter, and each occurrence takes whatever number it happens to land on.`));
      }

      // Only worth saying once the run is longer than one — at ×1 the original IS
      // the whole run and the two spellings coincide, which proves nothing.
      const upper = vs.find((r) => r.ch !== r.ch.toLowerCase() && r.mult > 1);
      if (upper) {
        out.append(el("div", "note", `<b>'${esc(upper.ch)}'</b> is vowel <b>#${upper.mult}</b> and comes back as <code class='inl'>${esc(upper.text)}</code>, not <code class='inl'>${esc(upper.ch.repeat(upper.mult))}</code>. The original keeps its case and the copies are lower-cased — two separate clauses, and both of them fall out of writing <code class='inl'>ch</code> once and <code class='inl'>ch.toLowerCase()</code> for the rest.`));
      }
    }
  }
}

const CODE = `// The counter is ONE running total for the whole string. It advances on every
// vowel occurrence and on nothing else, so it does not reset at a space and it is
// not kept per letter: the nth vowel of the string is written n times, wherever
// it is. The three case rules then need no branches — writing ch once and
// ch.toLowerCase() for the copies keeps the original's case and lowers the rest.
function repeatVowels(str: string): string {
  let out = "";
  let seen = 0;
  for (const ch of str) {
    if ("aeiou".includes(ch.toLowerCase())) {
      out += ch + ch.toLowerCase().repeat(seen++);  // seen copies AFTER the original
    } else {
      out += ch;                                    // consonants pass through untouched
    }
  }
  return out;
}`;

// ── STEP — the counter, one character at a time ──────────────────────────────
// Two steps per character: the test on line 5, then whichever branch it chose. The
// pair matters because the wrong mental model (a per-word or per-letter counter)
// gets line 5 right every time and only differs on line 6.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">repeatVowels</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> <span class="tok" data-t="out">out = <span class="st">""</span></span>;` },
  { ln: 3,  html: `  <span class="k">let</span> <span class="tok" data-t="seen">seen = <span class="nu">0</span></span>;  <span class="cm">// one counter, for the whole string</span>` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch">ch</span> <span class="k">of</span> str) {` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="test"><span class="st">"aeiou"</span>.<span class="fn">includes</span>(ch.<span class="fn">toLowerCase</span>())</span>) {` },
  { ln: 6,  html: `      <span class="tok" data-t="write">out += ch + ch.<span class="fn">toLowerCase</span>().<span class="fn">repeat</span>(seen++)</span>;` },
  { ln: 7,  html: `    } <span class="k">else</span> {` },
  { ln: 8,  html: `      <span class="tok" data-t="keep">out += ch</span>;  <span class="cm">// seen does not move</span>` },
  { ln: 9,  html: `    }` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 12, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const s = CASES[k - 1];
  const steps = [];
  const written = [];
  let out, seen, ch = null;

  // Scope by omission, gated on the line that CREATES each thing: `out` on 2,
  // `seen` on 3. `ch` is block-scoped to the for-of body, so it is passed in per
  // step rather than gated on a range, and it vanishes the moment the loop ends.
  // The `written` struct appears with `seen` and then stays, because what it shows
  // — the runs already committed to `out` — stays live for the rest of the call.
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 2) vars.out = qRaw(tail(out));
    if (line >= 3) vars.seen = seen;
    if (x.ch) vars.ch = "'" + show(ch) + "'";
    const structs = [{ label: "str", items: [...s].map(show) }];
    if (line >= 3) structs.push({ label: "vowel runs written", items: written.slice(), newest: !!x.fresh });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `repeatVowels(${qRaw(head(s))})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const total = [...s].filter(isVowel).length;
  S(1, `Rewrite <b>${q(s)}</b>. It holds <b>${plural(total, "vowel")}</b>, and the last of them will be written <b>${total}</b> ${total === 1 ? "time" : "times"} — so the answer is already ${total > 1 ? `<b>${(total * (total - 1)) / 2}</b> characters longer than the input` : `the same length as the input`}, before a single character has been read.`,
    { focus: "param" });

  out = "";
  S(2, `<b>out</b> starts empty and is only ever appended to, so it is the answer under construction rather than a copy of the input being edited.`,
    { focus: "out", changed: ["out"] });

  seen = 0;
  S(3, `Here is the whole problem. <b>seen = 0</b> is declared <i>outside</i> the loop, which is what makes it a running total for the entire string. Declare it inside the loop and every vowel resets to 1; reset it on a space and <code class='inl'>"hello world"</code> comes back as <code class='inl'>"helloo woorld"</code> — one o short, and passing on any single-word input.`,
    { focus: "seen", changed: ["seen"] });

  S(4, `Walk the string one character at a time. <b>ch</b> is block-scoped to this body, so it appears in the panel only while the loop is running.`, { focus: "ch" });

  // The two clauses worth a sentence — "a space is just another non-vowel" and
  // "the original keeps its case" — are explained the FIRST time a character
  // actually exercises them, and never again. Repeating either on all 34
  // characters of case 4 would turn narration into wallpaper.
  let saidSpace = false, saidCase = false;
  const chars = [...s];

  chars.forEach((c, i) => {
    ch = c;
    const v = isVowel(c);
    S(5, `Character <b>${i + 1}</b> of ${chars.length} is <b>'${esc(show(c))}'</b>. Lower-case it and ask whether <code class='inl'>"aeiou"</code> holds it — one test covers both cases of all five letters, which is the whole of the "in either uppercase or lowercase" clause.`,
      { focus: "test", ch: true, changed: ["ch"], eval: { expr: `"aeiou".includes('${show(c.toLowerCase())}')`, val: v } });

    if (v) {
      const before = seen;
      const piece = c + c.toLowerCase().repeat(seen);
      seen++;
      out += piece;
      written.push(show(piece));
      let extra = "";
      if (c !== c.toLowerCase() && !saidCase) {
        saidCase = true;
        extra = ` Note the shape of what was written: <b>'${esc(c)}'</b> once with its own case, then <b>'${esc(c.toLowerCase())}'</b> for the copies. Uppercasing the lot would give <code class='inl'>${esc(c.repeat(seen))}</code>, and repeating the original would give the same — both clauses are paid for by writing <code class='inl'>ch</code> and <code class='inl'>ch.toLowerCase()</code> as two different things in one expression.`;
      }
      S(6, `Vowel <b>#${seen}</b>. <b>seen</b> was <b>${before}</b>, so write the original plus <b>${before}</b> lowercase cop${before === 1 ? "y" : "ies"} → <code class='inl'>${esc(show(piece))}</code>, ${plural(seen, "character")}. Then <code class='inl'>seen++</code> makes it <b>${seen}</b>, which is the length the <i>next</i> vowel will take — wherever in the string it turns up.${extra}`,
        { focus: "write", ch: true, changed: ["out", "seen"], fresh: true });
    } else {
      out += c;
      let extra = "";
      if (c === " " && !saidSpace) {
        saidSpace = true;
        extra = ` This one is the trap: a space is <i>just another non-vowel</i>. The word ended, and the counter did not care — it carries <b>${seen}</b> into the next word, which is why the first vowel over there is written ${plural(seen + 1, "time")} and not once.`;
      }
      S(8, `<b>'${esc(show(c))}'</b> fails the test, so it is appended exactly as it stands — original case and all — and <b>seen stays ${seen}</b>. The counter tracks vowel <i>occurrences</i>, not positions.${extra}`,
        { focus: "keep", ch: true, changed: ["out"] });
    }
  });

  S(4, `No characters left, so the loop ends and <b>ch</b> goes out of scope. <b>seen</b> finished at <b>${seen}</b> — one per vowel, never more.`, { focus: "ch" });

  S(11, `<b>Return</b> ${q(out)} — <b>${out.length}</b> characters from <b>${s.length}</b>. The ${plural(out.length - s.length, "extra character")} ${out.length - s.length === 1 ? "is" : "are"} exactly <b>0 + 1 + … + ${Math.max(0, seen - 1)}</b>, the copies each vowel added, which is why doubling the vowels roughly quadruples the growth.`,
    { focus: "ret", done: true, result: show(out), ret: { value: tail(out, 28) } });

  return steps;
}

export default {
  n: 25, id: "vowelrep", title: "Vowel Repeater", dates: ["2025-09-04"],
  statement: `Given a string, return it with each vowel <b>duplicated one more time than the previous vowel you encountered</b>: the first vowel is unchanged, the second appears twice, the third three times, and so on. <code class="inl">a e i o u</code> count in either uppercase or lowercase; the <b>original</b> vowel keeps its case, the <b>repeats</b> are lowercase, and every other character keeps its own case. <span class="rule">Example: <code class="inl">repeatVowels("hello world")</code> → <code class="inl">"helloo wooorld"</code> — the count does not restart at the space, so the <b>o</b> of "world" is the third vowel and is written three times.</span>`,
  // One approach. There is no wasteful act to name: a single pass that appends is
  // already the minimum work, and the only way to make a first variant "worse"
  // would be to make it wrong about the counter — which Tier 1 §3 forbids. A second
  // tab pushing into an array and joining would be an edit, not an approach.
  variants: [
    {
      name: "Solution", cost: "O(n + v²) — the output is quadratic",
      approach: `Read the statement as arithmetic rather than as string surgery and it collapses to two variables. <b>seen</b> is a running count of vowels met so far, declared <i>outside</i> the loop — that placement is the entire challenge, because it is what makes the count span the whole string instead of a word or a letter. Each vowel is then written <code class='inl'>ch + ch.toLowerCase().repeat(seen++)</code>: the original with its own case, then <b>seen</b> lowercase copies, so it occupies <code class='inl'>seen + 1</code> characters and leaves the counter one higher for whatever vowel comes next. That one expression discharges all three case clauses at once — original keeps its case, repeats are lowercase, non-vowels never enter the branch — where three separate rules invite three separate branches and at least one of them will be wrong. The cost worth naming is the <b>output</b>: <b>v</b> vowels add <code class='inl'>0 + 1 + … + (v − 1)</code> characters, so the result grows quadratically in the vowels while the input grows linearly. Nothing can beat that, because the answer is that big. The general habit: when a spec says <i>one more than the previous</i>, it is describing a counter, and the first question to ask is what the counter is scoped to.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "the running counter",
      approach: `Twelve lines, and the one to stare at is <b>3</b> — a declaration, outside the loop, that decides the entire answer. Run case <b>5</b> (<code class='inl'>"banana"</code>) first: three identical <code class='inl'>a</code>s, written at one, two and three characters, which is the shortest proof that the counter is not kept per letter. Then case <b>1</b> (<code class='inl'>"hello world"</code>) and watch the space step at character 6 do nothing to <b>seen</b>. Case <b>6</b> is the degenerate end — eleven characters, no vowels, and line 6 never executes. Case <b>4</b> is the long one, 34 characters and 74 steps, and the payoff is watching the "vowel runs written" struct stretch until the closing <code class='inl'>a</code> of "Iceland" is fourteen characters wide. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 5, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
