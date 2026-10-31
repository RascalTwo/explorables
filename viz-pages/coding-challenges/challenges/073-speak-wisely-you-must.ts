// #73 · Speak Wisely, You Must — cut at the first whole-word helper, swap the halves.
// There is no search to optimise and no state to carry: find ONE index, cut the words there, and
// glue the halves back in the other order. The work is in the three small traps around the cut:
//   - the keyword match must be a WHOLE word, case-insensitive. "Can" opens a sentence in the
//     official set, so a case-sensitive match misses it; and a substring test (includes) would
//     fire on "Canada" or "care" ("are" lives inside it) and cut the sentence in the wrong place.
//   - the closing punctuation is cut off first and put back last, so it never ends up in the
//     middle ("wisely.," ) or glued to a keyword ("can!" is not the word "can").
//   - the moved half is lowercased and the new first word is capitalised: two case changes that
//     are easy to do on only one side.
// ONE approach, deliberately. A regex rewrite or a loop that builds both halves by hand does the
// same single pass over a handful of words; the saving is a constant factor on a sentence a person
// can type (CONTRIBUTING Tier 3 §2/§3), so a second tab would be an edit, not an approach.
// Click "Canada will win." to see a whole-word match refuse the "can" inside "Canada".
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then three of ours.
//   Are you ready?       — ours: the keyword is the FIRST word, so the head is a single word and
//                          the capital moves from "Are" to "You".
//   Canada will win.     — ours: "Canada" contains "can", but only the whole word "will" counts.
//   Keep calm.           — ours: no keyword at all; the statement is silent, this loop returns the
//                          sentence unchanged.
const CASES = [
  "You must speak wisely.",
  "You can do it!",
  "Do you think you will complete this?",
  "All your base are belong to us.",
  "You have much to learn.",
  "Are you ready?",
  "Canada will win.",
  "Keep calm.",
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, string> = {
  "You must speak wisely.": "Speak wisely, you must.",
  "You can do it!": "Do it, you can!",
  "Do you think you will complete this?": "Complete this, do you think you will?",
  "All your base are belong to us.": "Belong to us, all your base are.",
  "You have much to learn.": "Much to learn, you have.",
};
const KEYS = ["have", "must", "are", "will", "can"];
const MAX_LEN = 90; // keeps the cells and the trace legible

const clamp = (s: string) => s.slice(0, MAX_LEN);
const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

// The graded function's logic, with the cut index and the pieces kept so the demo can draw them.
function split(raw: string) {
  const sentence = clamp(raw);
  const punct = sentence.slice(-1);
  const words = sentence.slice(0, -1).split(" ");
  const i = words.findIndex((w) => KEYS.includes(w.toLowerCase()));
  // No keyword, or nothing after it to lead with: the statement does not cover it; leave it alone.
  const ok = i >= 0 && i < words.length - 1;
  const head = ok
    ? words
        .slice(0, i + 1)
        .join(" ")
        .toLowerCase()
    : "";
  const tail = ok ? words.slice(i + 1).join(" ") : "";
  const out = ok ? `${cap(tail)}, ${head}${punct}` : sentence;
  return { sentence, punct, words, i, ok, head, tail, out };
}
// The wrong reading: a substring test finds "can" inside "Canada" and "are" inside "care".
const loose = (words: string[]) =>
  words.findIndex((w) => KEYS.some((k) => w.toLowerCase().includes(k)));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sw-wrap { display:flex; flex-direction:column; gap:12px; }
    .sw-in { width:380px; max-width:100%; }
    .sw-cells { display:flex; flex-wrap:wrap; gap:4px; }
    .sw-cell { font:700 13px var(--mono); padding:5px 9px 3px; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); text-align:center; }
    .sw-cell small { display:block; font:10px var(--mono); color:var(--muted); font-weight:400; }
    .sw-cell.head { border-color:var(--warn); background:color-mix(in srgb, var(--warn) 18%, transparent); }
    .sw-cell.key { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 22%, transparent); }
    .sw-cell.key small { color:var(--accent); font-weight:700; }
    .sw-cell.tail { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, transparent); }
    .sw-out { font:700 16px var(--mono); padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--panel-2); }
    .sw-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .sw-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .sw-r b { color:var(--text); }
    .sw-r.hot { border-color:var(--danger); color:var(--danger); }
    .sw-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input", "sw-in");
  inp.type = "text";
  inp.value = CASES[0]!;
  ctl.append(
    el("span", "ctl-label", "sentence ="),
    inp,
    el("span", "ctl-label", `(single spaces, one closing mark, up to ${MAX_LEN} characters)`),
  );

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const b = el("button", "chip", esc(v));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = v;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const s = split(inp.value);
    const want = EXPECTED[s.sentence];
    out.innerHTML = "";
    const wrap = el("div", "sw-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === s.out ? "ok" : "no"}`,
        `wiseSpeak("${esc(s.sentence)}") → "${esc(s.out)}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", "matches freeCodeCamp's expected output"));
    const looked = s.i < 0 ? s.words.length : s.i + 1;
    line.append(
      el(
        "span",
        "opcount cool",
        `<span class="n">${looked}</span> ${looked === 1 ? "word" : "words"} tested · ${s.words.length} in the sentence`,
      ),
    );
    wrap.append(line);

    // Amber = moved to the back, green = leads the new sentence, blue-green = the keyword.
    const cells = el("div", "sw-cells");
    s.words.forEach((w, k) => {
      const role = !s.ok ? "" : k === s.i ? " key" : k < s.i ? " head" : " tail";
      cells.append(el("div", `sw-cell${role}`, `${esc(w)}<small>${k}</small>`));
    });
    wrap.append(cells);
    wrap.append(el("div", "sw-out", esc(s.out)));

    // The wrong reading, scored on the same input.
    const l = loose(s.words);
    const cmp = el("div", "sw-cmp");
    cmp.append(
      el(
        "div",
        `sw-r${l !== s.i ? " hot" : ""}`,
        `substring match cuts at <b>${l < 0 ? "none" : `${l} (${esc(s.words[l]!)})`}</b>${l !== s.i ? " ✗" : ""}`,
      ),
    );
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(s, l)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every preset was picked to land on a different one.
function noteFor(s: ReturnType<typeof split>, l: number) {
  if (s.i < 0)
    return `None of <b>${KEYS.join(", ")}</b> is a word of this sentence, so there is nowhere to cut. The statement does not say what to return; this loop gives the sentence back unchanged. Ours, not freeCodeCamp's.`;
  if (!s.ok)
    return `The keyword <b>${esc(s.words[s.i]!)}</b> is the last word, so nothing is left to lead the new sentence. Undefined by the statement; this loop returns the sentence unchanged.`;
  if (l !== s.i)
    return `A substring test would cut at word <b>${l}</b> (<b>${esc(s.words[l]!)}</b>), because it contains a keyword inside a longer word. The whole-word test skips it and cuts at <b>${s.i}</b>, <b>${esc(s.words[s.i]!)}</b>. Ours, not freeCodeCamp's.`;
  if (s.i === 0)
    return `The keyword is the very first word, so the moved half is just <b>${esc(s.head)}</b>. The capital letter has to move too: <b>${esc(cap(s.tail.split(" ")[0]!))}</b> now opens the sentence. Ours, not freeCodeCamp's.`;
  if (s.words[0]!.toLowerCase() !== s.words[0] && s.words[s.i]!.toLowerCase() !== s.words[s.i])
    return `Both ends of the cut carry a capital: <b>${esc(s.words[0]!)}</b> is lowercased because it moves to the back, and the first word of the tail is capitalised because it now leads.`;
  return `The first keyword is <b>${esc(s.words[s.i]!)}</b> at word <b>${s.i}</b>. Everything up to and including it (amber) moves to the back in order, lowercased; the rest (green) leads, capitalised; the <b>${esc(s.punct)}</b> is put back last. Later keywords are ignored: only the <i>first</i> one decides the cut.`;
}

// ── STEP — find the cut, then build the sentence ─────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">wiseSpeak</span>(<span class="tok" data-t="arg">sentence</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> keys = [<span class="s">"have"</span>, <span class="s">"must"</span>, <span class="s">"are"</span>, <span class="s">"will"</span>, <span class="s">"can"</span>];`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> punct = <span class="tok" data-t="punct">sentence.<span class="fn">slice</span>(-1)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> words = <span class="tok" data-t="words">sentence.<span class="fn">slice</span>(0, -1).<span class="fn">split</span>(<span class="s">" "</span>)</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> i = words.<span class="fn">findIndex</span>(<span class="tok" data-t="find">w =&gt; keys.<span class="fn">includes</span>(w.<span class="fn">toLowerCase</span>())</span>);`,
  },
  {
    ln: 6,
    html: `  <span class="k">if</span> (<span class="tok" data-t="guard">i &lt; 0 || i === words.length - 1</span>) <span class="k">return</span> sentence;`,
  },
  {
    ln: 7,
    html: `  <span class="k">const</span> head = <span class="tok" data-t="head">words.<span class="fn">slice</span>(0, i + 1).<span class="fn">join</span>(<span class="s">" "</span>).<span class="fn">toLowerCase</span>()</span>;`,
  },
  {
    ln: 8,
    html: `  <span class="k">const</span> tail = <span class="tok" data-t="tail">words.<span class="fn">slice</span>(i + 1).<span class="fn">join</span>(<span class="s">" "</span>)</span>;`,
  },
  {
    ln: 9,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">tail[0].<span class="fn">toUpperCase</span>() + tail.<span class="fn">slice</span>(1) + <span class="s">", "</span> + head + punct</span>;`,
  },
  { ln: 10, html: `}` },
];

type Extra = {
  focus?: string | undefined;
  changed?: string[] | undefined;
  eval?: { expr: string; val: boolean } | undefined;
  done?: boolean | undefined;
  result?: string | undefined;
  ret?: { value: string } | undefined;
};

function trace(raw: string) {
  const s = split(raw);
  const steps: DbgStep[] = [];
  const q = JSON.stringify(s.sentence);
  // Which names exist yet is a function of the line that declares them.
  const S = (line: number, note: string, x: Extra = {}, probe = -1) => {
    const vars: Record<string, unknown> = { sentence: q };
    if (line >= 3) vars["punct"] = JSON.stringify(s.punct);
    if (line >= 4) vars["words"] = `[${s.words.length} words]`;
    if (line > 5 || (line === 5 && probe === -2)) vars["i"] = s.i;
    if (line >= 7 && s.ok) vars["head"] = JSON.stringify(s.head);
    if (line >= 8 && s.ok) vars["tail"] = JSON.stringify(s.tail);
    const structs = [];
    if (line >= 4)
      structs.push({
        label: "words",
        // The word under test is bracketed while findIndex is on it.
        items: s.words.map((w, k) => (k === probe ? `[${w}]` : w)),
      });
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `wiseSpeak(${q})`,
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Cut the sentence at the <b>first</b> helper word, put the words up to and including it at the back, and tidy the case. One pass, no state to carry between words: the whole answer is one index <code class='inl'>i</code> and two slices.`,
    { focus: "arg" },
  );
  S(
    2,
    `The five helper words, all lowercase. The sentence's own words are lowercased before they are compared, so <b>Can</b> at the start of a sentence still counts.`,
    {},
  );
  S(
    3,
    `The last character is the closing mark: <b>${esc(JSON.stringify(s.punct))}</b>. It is taken off now so it can never sit glued to the last word (<code class='inl'>"can!"</code> is not the word <code class='inl'>"can"</code>) and is put back at the very end.`,
    { focus: "punct", changed: ["punct"] },
  );
  S(
    4,
    `Everything before the mark, split on the single spaces the statement guarantees: <b>${s.words.length}</b> word${s.words.length === 1 ? "" : "s"}.`,
    { focus: "words", changed: ["words"] },
  );

  const stop = s.i < 0 ? s.words.length - 1 : s.i;
  for (let k = 0; k <= stop; k++) {
    const w = s.words[k]!;
    const hit = KEYS.includes(w.toLowerCase());
    const sub = !hit && KEYS.some((q2) => w.toLowerCase().includes(q2));
    S(
      5,
      hit
        ? `Word <b>${k}</b>, <b>${esc(w)}</b>, lowercases to <b>${esc(w.toLowerCase())}</b>, which is in the list: <code class='inl'>findIndex</code> stops here with <code class='inl'>i = ${k}</code>. Any later helper word is ignored, because only the <i>first</i> one counts.`
        : `Word <b>${k}</b>, <b>${esc(w)}</b>, is not a helper word${sub ? `. It <i>contains</i> one, but a whole-word match is what the statement asks for: a substring test would cut the sentence here by mistake` : ""}, so the search goes on.`,
      {
        focus: "find",
        eval: { expr: `keys.includes("${w.toLowerCase()}")`, val: hit },
        changed: hit ? ["i"] : [],
      },
      hit ? -2 : k,
    );
  }

  if (s.i < 0) {
    S(
      5,
      `No word matched, so <code class='inl'>findIndex</code> returns <b>-1</b>.`,
      { focus: "find", changed: ["i"] },
      -2,
    );
  }
  S(
    6,
    s.ok
      ? `<code class='inl'>i = ${s.i}</code> is a real index and not the last word, so there is something on each side of the cut and the guard lets us through.`
      : s.i < 0
        ? `<code class='inl'>i &lt; 0</code>: there is no helper word, so there is nowhere to cut and the sentence is returned as it came. The statement does not cover this; the loop just refuses to guess.`
        : `<code class='inl'>i</code> is the last word, so the tail would be empty and there would be nothing to lead the new sentence. The statement does not cover this; the sentence is returned unchanged.`,
    {
      focus: "guard",
      eval: { expr: `i < 0 || i === ${s.words.length - 1}`, val: !s.ok },
      ...(s.ok
        ? {}
        : { done: true, result: JSON.stringify(s.out), ret: { value: JSON.stringify(s.out) } }),
    },
  );
  if (!s.ok) return steps;

  S(
    7,
    `Words <b>0</b> to <b>${s.i}</b> are the part that moves: joined with spaces and lowercased, since they are about to land mid-sentence. Their order is untouched. That gives <b>${esc(JSON.stringify(s.head))}</b>.`,
    { focus: "head", changed: ["head"] },
  );
  S(
    8,
    `The rest, from word ${s.i + 1} on, is what leads the new sentence: <b>${esc(JSON.stringify(s.tail))}</b>. It keeps whatever case it had, which is why the next line has to capitalise it.`,
    { focus: "tail", changed: ["tail"] },
  );
  S(
    9,
    `<b>Return ${esc(JSON.stringify(s.out))}.</b> The tail's first letter is capitalised, then <code class='inl'>", "</code>, the lowercased head, and the closing <b>${esc(s.punct)}</b> last. Comma and space belong to the join, not to either half, so there is never a stray space at either end.`,
    {
      focus: "ret",
      done: true,
      result: JSON.stringify(s.out),
      ret: { value: JSON.stringify(s.out) },
    },
  );
  return steps;
}

export default {
  n: 73,
  id: "speak-wisely-you-must",
  title: "Speak Wisely, You Must",
  dates: ["2025-10-22"],
  statement: `Given a sentence, return a version of it that sounds like advice from a wise teacher using the following rules: words are separated by a single space. Find the first occurrence of one of the words <code class="inl">"have"</code>, <code class="inl">"must"</code>, <code class="inl">"are"</code>, <code class="inl">"will"</code>, <code class="inl">"can"</code>. Move all words before and including that word to the end of the sentence, preserving their order, making them all lowercase, and adding a comma and space before them. Capitalize the first letter of the new first word. Every sentence ends with a single punctuation mark: keep it and move it to the end of the new sentence. Return the new sentence with a single space between words and none at the start or end. <span class="rule">Example: <code class="inl">wiseSpeak("You must speak wisely.")</code> → <code class="inl">"Speak wisely, you must."</code></span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass over the words",
      approach: `Find the first helper word, cut the words there, and swap the halves. The match has to be a <b>whole word, ignoring case</b>: <b>Can</b> opens a sentence in the official set, and a substring test would fire on <b>Canada</b> or on the <b>are</b> inside <b>care</b> (<b>Canada will win.</b>, ours). The closing mark is taken off first and put back last so it never lands mid-sentence or sticks to a keyword. The head is lowercased, the new first word is capitalised, and <code class='inl'>", "</code> is the glue between them. Every official case is covered by a chip; <b>Are you ready?</b> (keyword first, so the capital moves) and <b>Keep calm.</b> (no keyword, returned unchanged, which the statement leaves open) are ours. A single variant, deliberately: a regex rewrite is the same single pass, so a second tab would be an edit rather than an approach.`,
      code: `// Cut at the FIRST whole-word helper (any case); move the head to the back, lowercased.
function wiseSpeak(sentence: string): string {
  const keys = ["have", "must", "are", "will", "can"];
  const punct = sentence.slice(-1);
  const words = sentence.slice(0, -1).split(" ");
  const i = words.findIndex((w) => keys.includes(w.toLowerCase()));
  // No helper word, or nothing after it: the statement is silent, leave the sentence alone.
  if (i < 0 || i === words.length - 1) return sentence;
  const head = words.slice(0, i + 1).join(" ").toLowerCase();
  const tail = words.slice(i + 1).join(" ");
  return tail[0].toUpperCase() + tail.slice(1) + ", " + head + punct;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `The function one line at a time, with each name appearing in the panel only once its line has run and the word under test bracketed while <code class='inl'>findIndex</code> walks the list. Start on <b>You must speak wisely.</b> (official) and watch the search stop at word 1. <b>Do you think you will complete this?</b> walks five words before it hits <b>will</b>, and <b>All your base are belong to us.</b> walks four before <b>are</b>. <b>You can do it!</b> and <b>You have much to learn.</b> are the other official cases. <b>Are you ready?</b>, <b>Canada will win.</b> and <b>Keep calm.</b> are ours: keyword first, a keyword hiding inside a longer word, and no keyword. Type any single-spaced sentence ending in one mark. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "sentence =",
            value: CASES[0]!,
            presets: CASES,
            hint: `single spaces, one closing mark, up to ${MAX_LEN} characters`,
          },
        }),
    },
  ],
} satisfies Challenge;
