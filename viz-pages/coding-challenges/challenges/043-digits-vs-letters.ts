// #43 · Digits vs Letters — three buckets, and the whole problem is the third one: ignore.
// Two counters and a comparison. The statement's last bullet, "ignore any other
// characters", is the only line that can go wrong, because it means every character
// needs a yes/no answer to TWO questions — is it a digit, is it a letter — and a
// character is allowed to answer no to both. The traps are all in how those two
// questions get asked. "Is it a digit" asked as !isNaN(ch) says yes to a space,
// because Number(" ") is 0, so every gap in the text quietly becomes a digit.
// "Is it a letter" asked as ch.toLowerCase() !== ch.toUpperCase() says yes to é and
// ü; the statement says a-z, so they are ignored. Ranges, not tricks.
// freeCodeCamp's six cases never separate the two: the one case with a space has a
// digit lead too big for the spaces to flip it. The a b c 1 chip is ours and does.
// ONE approach, deliberately. A single signed counter (+1 digit, -1 letter) or a
// match-all regex and .length are the same count spelled differently, not a second
// mental model, and the input is a short string so no cost gap would show on screen
// (CONTRIBUTING Tier 3 §1-3).
// Click the a b c 1 chip, then switch the digit test to isNaN: the verdict flips from
// "letters" to "digits" because the three spaces are now counted as digits.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep, DbgStruct } from "./lib/shared.js";

// The 6 official freeCodeCamp cases in the grader's order, then three of ours.
//   "a b c 1" — ours, and the case the digit-test toggle is built for. Correct:
//     3 letters vs 1 digit -> "letters". With !isNaN the 3 spaces count as digits:
//     4 vs 3 -> "digits". No official case separates the two tests.
//   "!?-" — ours. Nothing is a digit and nothing is a letter, so the counters are
//     0 and 0 and the answer is "tie". The official ties both have equal NON-zero
//     counts; the empty tie is where a `digits >= letters` slip shows.
//   "é1" — ours. Statement says letters are a-z, so é is ignored: 1 digit vs 0
//     letters -> "digits". A Unicode-aware test (\p{L}) would call it a tie.
const OFFICIAL = ["abc123", "a1b2c3d", "1a2b3c4", "abc123!@#DEF", "H3110 W0R1D", "P455W0RD"];
const CASES = [...OFFICIAL, "a b c 1", "!?-", "é1"];

// The grader's own answers, so the demo can show a verdict instead of asking you to
// take its word for it. Ours have an answer too, computed by the spec test below.
const EXPECTED: Record<string, string> = {
  abc123: "tie",
  a1b2c3d: "letters",
  "1a2b3c4": "digits",
  "abc123!@#DEF": "letters",
  "H3110 W0R1D": "digits",
  P455W0RD: "tie",
};

// The two ways to ask "is it a digit". The first is the spec; the second is the
// one that looks fine and treats whitespace as a digit.
const DIGIT_TESTS: { label: string; src: string; test: (c: string) => boolean }[] = [
  { label: "/[0-9]/", src: "/[0-9]/.test(ch)", test: (c) => /[0-9]/u.test(c) },
  { label: "!isNaN(ch)", src: "!isNaN(Number(ch))", test: (c) => !Number.isNaN(Number(c)) },
];
const isLetter = (c: string) => /[a-z]/iu.test(c);

type Kind = "digit" | "letter" | "skip";
const classify = (c: string, mode: number): Kind =>
  DIGIT_TESTS[mode]!.test(c) ? "digit" : isLetter(c) ? "letter" : "skip";

function tally(s: string, mode: number) {
  let digits = 0,
    letters = 0;
  const kinds = Array.from(s).map((c) => classify(c, mode));
  for (const k of kinds) {
    if (k === "digit") digits++;
    else if (k === "letter") letters++;
  }
  const verdict = digits > letters ? "digits" : letters > digits ? "letters" : "tie";
  return { kinds, digits, letters, verdict };
}

const glyph = (c: string) => (/\s/u.test(c) ? "·" : esc(c));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .dl-wrap { display:flex; flex-direction:column; gap:12px; }
    .dl-chip { white-space:pre; }
    .dl-tiles { display:flex; flex-wrap:wrap; gap:4px; min-height:36px; }
    .dl-t { min-width:30px; height:34px; padding:0 6px; display:flex; align-items:center; justify-content:center; font:800 15px var(--mono); border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .dl-t.digit { border-color:var(--c1); color:var(--c1); background:color-mix(in srgb, var(--c1) 14%, transparent); }
    .dl-t.letter { border-color:var(--c3); color:var(--c3); background:color-mix(in srgb, var(--c3) 14%, transparent); }
    .dl-t.skip { opacity:.55; border-style:dashed; }
    .dl-t.trap { border-color:var(--danger); color:var(--danger); background:color-mix(in srgb, var(--danger) 14%, transparent); opacity:1; }
    .dl-bars { display:grid; grid-template-columns:70px minmax(0,1fr) 34px; align-items:center; gap:6px 10px; font:12px var(--mono); }
    .dl-bar { height:16px; border-radius:5px; background:var(--panel-2); border:1px solid var(--border); overflow:hidden; }
    .dl-bar i { display:block; height:100%; }
    .dl-bar i.digit { background:var(--c1); }
    .dl-bar i.letter { background:var(--c3); }
    .dl-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .dl-cmp b { font-family:var(--mono); color:var(--text); }
    .dl-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .dl-cmp.split b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let mode = 0;

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = "H3110 W0R1D";
  inp.style.width = "300px";
  ctl.append(el("span", "ctl-label", "str ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip dl-chip", `"${esc(v)}"`);
    c.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      inp.value = v;
      render();
    });
    pre.append(c);
  });

  const tog = el("div", "controls");
  tog.append(el("span", "ctl-label", "digit test"));
  const togChips = DIGIT_TESTS.map((d, i) => {
    const c = el(
      "button",
      "chip " + (i ? "bad" : "good"),
      `<span class="mono">${esc(d.label)}</span>`,
    );
    c.addEventListener("click", () => {
      mode = i;
      render();
    });
    tog.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, tog, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    togChips.forEach((c, i) => {
      c.classList.toggle("on", i === mode);
    });
    const raw = inp.value;
    const t = tally(raw, mode);
    const spec = tally(raw, 0);
    const want = EXPECTED[raw] ?? spec.verdict;
    const official = EXPECTED[raw] !== undefined;

    out.innerHTML = "";
    const wrap = el("div", "dl-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${t.verdict === want ? "ok" : "no"}`,
        `digitsOrLetters("${esc(raw)}") → "${t.verdict}"`,
      ),
    );
    line.append(
      el(
        "span",
        "dl-cmp" + (t.verdict === want ? "" : " split"),
        t.verdict === want
          ? official
            ? `matches freeCodeCamp's expected <b>"${want}"</b>`
            : `the spec test also returns <b>"${want}"</b>`
          : `${official ? "freeCodeCamp expects" : "the spec test returns"} <b>"${want}"</b> — this digit test is wrong`,
      ),
    );
    wrap.append(line);

    // Every character, coloured by the bucket it landed in. A character the active
    // test counts but the spec would not is outlined red: that is the bug, drawn.
    const tiles = el("div", "dl-tiles");
    Array.from(raw).forEach((c, i) => {
      const k = t.kinds[i]!;
      const trap = k !== spec.kinds[i];
      tiles.append(el("div", `dl-t ${k}${trap ? " trap" : ""}`, glyph(c)));
    });
    if (!raw) tiles.append(el("span", "muted", "(empty string — nothing to count)"));
    wrap.append(tiles);

    const max = Math.max(t.digits, t.letters, 1);
    wrap.append(
      el(
        "div",
        "dl-bars",
        `<span>digits</span><div class="dl-bar"><i class="digit" style="width:${(t.digits / max) * 100}%"></i></div><b>${t.digits}</b>` +
          `<span>letters</span><div class="dl-bar"><i class="letter" style="width:${(t.letters / max) * 100}%"></i></div><b>${t.letters}</b>`,
      ),
    );

    wrap.append(
      el(
        "div",
        "muted",
        `<code class='inl'>·</code> is a space. Blue is a digit, green is a letter, dashed grey is <b>ignored</b>; a red outline is a character the active digit test counts and the spec would not.`,
      ),
    );
    wrap.append(el("div", "note", noteFor(raw, t, spec, mode)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing, because every
// preset was chosen to land on a different one.
function noteFor(
  raw: string,
  t: ReturnType<typeof tally>,
  spec: ReturnType<typeof tally>,
  mode: number,
) {
  const spaces = Array.from(raw).filter((c) => /\s/u.test(c)).length;
  const nonAscii = Array.from(raw).filter((c) => /\p{L}/u.test(c) && !isLetter(c));
  if (mode === 1 && spaces)
    return `Asking <code class='inl'>!isNaN(Number(ch))</code> counts <b>${spaces}</b> whitespace character${spaces === 1 ? "" : "s"} as digits, because <code class='inl'>Number(" ")</code> is <b>0</b>, not <code class='inl'>NaN</code>. That moves the digit count from <b>${spec.digits}</b> to <b>${t.digits}</b>${t.verdict === spec.verdict ? `, and on this input it still lands on <b>"${t.verdict}"</b>, which is why the bug survives the official tests: the one case with a space has digits to spare. Try <code class='inl'>"a b c 1"</code>.` : `, which flips the answer from <b>"${spec.verdict}"</b> to <b>"${t.verdict}"</b>. freeCodeCamp never asks this question, so the wrong test passes all six of its cases.`}`;
  if (mode === 1)
    return `This input has no whitespace, so <code class='inl'>!isNaN(Number(ch))</code> and <code class='inl'>/[0-9]/</code> agree on every character and the answer is the same. The wrong test is only visible on a string with a gap in it — try <code class='inl'>"a b c 1"</code>.`;
  if (!raw.replaceAll(/[^0-9a-z]/giu, ""))
    return `Nothing here is a digit and nothing is a letter, so both counters stay at <b>0</b> and <b>0 = 0</b> is a <b>tie</b>. This is the one tie the official set does not contain: both of its ties have equal <i>non-zero</i> counts. It is also where a lazy <code class='inl'>digits >= letters ? "digits" : "letters"</code> shows its hand — a three-way answer needs three-way logic. "Ignore" is a bucket with no counter, and an empty string is just the case where it holds everything.`;
  if (nonAscii.length > 0)
    return `<b>${nonAscii.map((c) => esc(c)).join(" ")}</b> ${nonAscii.length === 1 ? "is" : "are"} a letter in every dictionary and <b>not</b> a letter here: the statement says letters consist of <code class='inl'>a-z</code>, so ${nonAscii.length === 1 ? "it falls" : "they fall"} into the ignored bucket and the answer is <b>"${t.verdict}"</b> (${t.digits} vs ${t.letters}). A Unicode-aware test such as <code class='inl'>/\\p{L}/u</code> would count ${nonAscii.length === 1 ? "it" : "them"} and change the answer. Neither reading is wrong in general; the statement picked one, and the range is how to write it.`;
  if (t.verdict === "tie")
    return `<b>${t.digits}</b> digits and <b>${t.letters}</b> letters: a tie, and the only verdict that needs both counters at once. There is no rule that breaks it toward one side, which is why the function ends with a <code class='inl'>"tie"</code> fallthrough rather than a two-way choice.${/[^0-9a-z]/iu.test(raw) ? ` The ignored characters take no part in the count.` : ``}`;
  if (/[^0-9a-z]/iu.test(raw))
    return `<b>${t.digits}</b> digits against <b>${t.letters}</b> letters, so <b>"${t.verdict}"</b> — and the ignored characters (<code class='inl'>${[...new Set(Array.from(raw).filter((c) => !/[0-9a-z]/iu.test(c)))].map((c) => esc(c === " " ? "␠" : c)).join(" ")}</code>) never touched either counter. They are why this is a count and not a length: <code class='inl'>raw.length</code> is <b>${Array.from(raw).length}</b> and only <b>${t.digits + t.letters}</b> of it was ever in the race. Upper and lower case count the same, which is what the <code class='inl'>i</code> flag on <code class='inl'>/[a-z]/i</code> is for; without it every capital would be ignored.`;
  return `<b>${t.digits}</b> digits against <b>${t.letters}</b> letters, so <b>"${t.verdict}"</b>. Nothing was ignored here; it is a plain count. Add a space, a symbol or an <code class='inl'>é</code> to the input and watch the ignored bucket appear without moving either bar.`;
}

// ── STEP — the loop, one character at a time ────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">digitsOrLetters</span>(<span class="tok" data-t="arg">str</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">digits = <span class="nu">0</span>, letters = <span class="nu">0</span></span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch">ch</span> <span class="k">of</span> str) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="isd">/[0-9]/.<span class="fn">test</span>(ch)</span>) <span class="tok" data-t="dinc">digits++</span>;`,
  },
  {
    ln: 5,
    html: `    <span class="k">else if</span> (<span class="tok" data-t="isl">/[a-z]/i.<span class="fn">test</span>(ch)</span>) <span class="tok" data-t="linc">letters++</span>;`,
  },
  { ln: 6, html: `  }` },
  {
    ln: 7,
    html: `  <span class="k">if</span> (<span class="tok" data-t="gt">digits &gt; letters</span>) <span class="k">return</span> <span class="st">"digits"</span>;`,
  },
  {
    ln: 8,
    html: `  <span class="k">if</span> (<span class="tok" data-t="lt">letters &gt; digits</span>) <span class="k">return</span> <span class="st">"letters"</span>;`,
  },
  {
    ln: 9,
    html: `  <span class="k">return</span> <span class="tok" data-t="tie"><span class="st">"tie"</span></span>;`,
  },
  { ln: 10, html: `}` },
];

const q = (s: string) => JSON.stringify(s);
const MAX_TRACE = 40; // 2-3 steps a character; past this the scrubber stops being useful

function trace(rawInput: string) {
  const str = Array.from(rawInput).slice(0, MAX_TRACE).join("");
  const steps: DbgStep[] = [];
  let digits = 0,
    letters = 0,
    ch: string | null = null;
  const dList: string[] = [],
    lList: string[] = [];
  let newest: "d" | "l" | null = null;

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string | undefined;
      changed?: string[] | undefined;
      eval?: { expr: string; val: boolean } | undefined;
      done?: boolean | undefined;
      result?: string | undefined;
      ret?: { value: string } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = { str: q(str) };
    if (line >= 2) {
      vars["digits"] = digits;
      vars["letters"] = letters;
    } // `let` is line 2
    // `ch` is the loop's own const: it exists on lines 3-5 and is gone after the loop.
    if (line >= 3 && line <= 5 && ch !== null) vars["ch"] = q(ch);
    // The two tallies are the counters drawn as the characters they counted, so an
    // ignored character is visibly in neither. They live as long as the counters do.
    const structs: DbgStruct[] =
      line >= 2
        ? [
            { label: "digits counted", items: [...dList], newest: newest === "d" },
            { label: "letters counted", items: [...lList], newest: newest === "l" },
          ]
        : [];
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `digitsOrLetters(${q(str)})`,
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
    `A string comes in and a <b>word</b> goes out, with no list of letters or digits in between — the function only has to <b>count</b> two kinds of character and compare. The catch is the last bullet: <b>"ignore any other characters"</b> means a character may belong to <i>neither</i> kind, so every character gets two separate yes/no questions, not one either/or.`,
    { focus: "arg" },
  );

  S(
    2,
    `Two counters, both starting at <b>0</b>. There is no third counter for the ignored characters — ignoring something means nothing records it, and that is why <b>"tie"</b> can mean <b>0 and 0</b> as well as <b>3 and 3</b>.`,
    { focus: "init", changed: ["digits", "letters"] },
  );

  for (const c of str) {
    ch = c;
    newest = null;
    const shown = /\s/u.test(c) ? `a space` : `<code class='inl'>${esc(c)}</code>`;
    S(
      3,
      `Next character: ${shown}. <code class='inl'>for…of</code> hands over whole characters, so there is no index to keep and no off-by-one to make.`,
      { focus: "ch", changed: ["ch"] },
    );

    const dig = /[0-9]/u.test(c);
    if (dig) {
      digits++;
      dList.push(c);
      newest = "d";
      S(
        4,
        `<code class='inl'>${esc(c)}</code> is in <code class='inl'>0-9</code>, so <b>digits</b> goes to <b>${digits}</b> and the second question is never asked, since a character cannot be both.${digits === 1 ? ` A <b>range</b> is the right test: <code class='inl'>!isNaN(Number(ch))</code> also says yes to a space, because <code class='inl'>Number(" ")</code> is <b>0</b>.` : ``}`,
        { focus: "dinc", changed: ["digits"], eval: { expr: `/[0-9]/.test(${q(c)})`, val: true } },
      );
      continue;
    }
    S(
      4,
      `${/\s/u.test(c) ? `A space` : `<code class='inl'>${esc(c)}</code>`} is not in <code class='inl'>0-9</code>, so it is not a digit. That settles only the first question; the next line asks the second. <code class='inl'>!isNaN(Number(ch))</code> would have answered <b>${!Number.isNaN(Number(c))}</b> here${/\s/u.test(c) ? `, and that is the bug: whitespace silently becomes a digit` : ``}.`,
      { focus: "isd", eval: { expr: `/[0-9]/.test(${q(c)})`, val: false } },
    );

    const let_ = /[a-z]/iu.test(c);
    if (let_) {
      letters++;
      lList.push(c);
      newest = "l";
      S(
        5,
        `<code class='inl'>${esc(c)}</code> matches <code class='inl'>/[a-z]/i</code>, so <b>letters</b> goes to <b>${letters}</b>. The <code class='inl'>i</code> flag is the whole case rule: <b>${esc(c)}</b> counts the same upper or lower, and without it every capital would fall through to ignored.`,
        {
          focus: "linc",
          changed: ["letters"],
          eval: { expr: `/[a-z]/i.test(${q(c)})`, val: true },
        },
      );
    } else {
      S(
        5,
        `${/\s/u.test(c) ? `A space` : `<code class='inl'>${esc(c)}</code>`} is neither a digit nor a letter, so <b>nothing happens</b>. This is the "ignore" bullet, and it costs no code at all: it is simply the case where neither <code class='inl'>if</code> fires.${/\p{L}/u.test(c) ? ` Note it <i>is</i> a letter in Unicode, but the statement says <code class='inl'>a-z</code>, so it is ignored.` : ``}`,
        { focus: "isl", eval: { expr: `/[a-z]/i.test(${q(c)})`, val: false } },
      );
    }
  }
  ch = null;
  newest = null;

  S(
    6,
    `Loop finished: <b>${digits}</b> digit${digits === 1 ? "" : "s"} and <b>${letters}</b> letter${letters === 1 ? "" : "s"}. <code class='inl'>ch</code> is gone — it only ever lived inside the loop — and everything else in the string was seen and dropped.`,
  );

  if (digits > letters) {
    S(7, `<b>${digits} &gt; ${letters}</b>, so the answer is <b>"digits"</b>.`, {
      focus: "gt",
      eval: { expr: `${digits} > ${letters}`, val: true },
    });
    S(
      7,
      `<b>Return "digits".</b> The first comparison is allowed to return early only because it is strict: a tie must fall past it.`,
      { focus: "gt", done: true, result: q("digits"), ret: { value: q("digits") } },
    );
  } else {
    S(
      7,
      `<b>${digits} &gt; ${letters}</b> is false, so digits did not win. That does not mean letters did.`,
      { focus: "gt", eval: { expr: `${digits} > ${letters}`, val: false } },
    );
    if (letters > digits) {
      S(8, `<b>${letters} &gt; ${digits}</b>, so the answer is <b>"letters"</b>.`, {
        focus: "lt",
        eval: { expr: `${letters} > ${digits}`, val: true },
      });
      S(8, `<b>Return "letters".</b>`, {
        focus: "lt",
        done: true,
        result: q("letters"),
        ret: { value: q("letters") },
      });
    } else {
      S(8, `<b>${letters} &gt; ${digits}</b> is false too, so neither side won.`, {
        focus: "lt",
        eval: { expr: `${letters} > ${digits}`, val: false },
      });
      S(
        9,
        `<b>Return "tie".</b> It is the fallthrough, not a third comparison: once neither side is strictly ahead, equal is the only thing left. ${digits + letters ? `Both counters stand at <b>${digits}</b>.` : `Both counters never moved off <b>0</b>.`}`,
        { focus: "tie", done: true, result: q("tie"), ret: { value: q("tie") } },
      );
    }
  }
  return steps;
}

export default {
  n: 43,
  id: "digitsletters",
  title: "Digits vs Letters",
  dates: ["2025-09-22"],
  statement: `Given a string, return <code class="inl">"digits"</code> if the string has <b>more digits than letters</b>, <code class="inl">"letters"</code> if it has more letters than digits, and <code class="inl">"tie"</code> if it has the same amount of each. Digits are <code class="inl">0-9</code>; letters are <code class="inl">a-z</code> in upper or lower case; <b>ignore any other characters</b>. <span class="rule">Example: <code class="inl">digitsOrLetters("abc123!@#DEF")</code> → <code class="inl">"letters"</code> — 6 letters against 3 digits, and the three symbols are not in the race.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass, two counters",
      approach: `Count, then compare — there is no real search here, so the problem is really three buckets. A character is a <b>digit</b>, a <b>letter</b>, or <b>neither</b>, and "neither" is the bullet that does the damage: it means the two questions have to be asked <i>separately</i>, and the way you ask them matters. <b>Digit</b> as <code class='inl'>/[0-9]/</code>, not <code class='inl'>!isNaN(Number(ch))</code> — the second says yes to a space, because <code class='inl'>Number(" ")</code> is <code class='inl'>0</code>, and the freeCodeCamp tests never find out: the only one with a space has digits to spare. Flip the toggle on <code class='inl'>"a b c 1"</code> (ours) and the three spaces turn a correct <b>"letters"</b> into <b>"digits"</b>. <b>Letter</b> as <code class='inl'>/[a-z]/i</code>, where the flag is the entire case rule and <code class='inl'>é</code> is ignored because the statement says <code class='inl'>a-z</code>. And "tie" is not "both zero", it is "equal", which includes <b>0 and 0</b> — try <code class='inl'>"!?-"</code>. Two counters beat a signed one for readability, and the final comparison is three branches because the answer is three-way: the first <code class='inl'>></code> must be strict or a tie slips out as "digits".`,
      code: `// Two counters and a three-way comparison. A character may be neither a digit
// nor a letter, so the two tests are independent and nothing counts the rest.
function digitsOrLetters(str: string): "digits" | "letters" | "tie" {
  let digits = 0, letters = 0;
  for (const ch of str) {
    if (/[0-9]/.test(ch)) digits++;   // a range: !isNaN(Number(" ")) is true, so it would count spaces
    else if (/[a-z]/i.test(ch)) letters++;  // i = either case; é is NOT a-z, so it is ignored
  }
  if (digits > letters) return "digits";
  if (letters > digits) return "letters";
  return "tie";
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "character by character",
      approach: `The loop unrolled, one character per beat, with the two counters drawn as the characters they counted — so an ignored character is visibly in neither. Start on <b>abc123!@#DEF</b>: the <code class='inl'>!@#</code> go by on line 5 without anything happening, which is the whole "ignore" bullet. <b>P455W0RD</b> is the tie, ending on line 9 with both counters at 4. <b>!?-</b> is ours: it also ends on line 9, with both counters never leaving 0. Type any string (the trace stops at ${MAX_TRACE} characters). Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "str =",
            value: "abc123!@#DEF",
            presets: CASES,
            hint: `any string, first ${MAX_TRACE} characters traced`,
          },
        }),
    },
  ],
} satisfies Challenge;
