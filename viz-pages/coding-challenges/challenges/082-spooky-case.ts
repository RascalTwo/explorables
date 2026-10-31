// #82 · SpOoKy~CaSe — swap separators for "~", then alternate case on a letters-only counter.
// The only trap is the counter. "Capitalize the first letter and every other letter after that, ignoring
// the tilde" means the parity belongs to the LETTERS, not to the positions in the string:
//   - a "~" is copied through and does not tick the counter, so "c_a" is C~a (a is the 2nd letter, lower),
//     not C~A. Index-based parity (i % 2 on the string index) gets "c_a-n" wrong the moment a separator
//     sits at an odd index.
//   - the counter runs across words, it never restarts: "hello_world" is HeLlO~wOrLd, the w is lower
//     because five letters came before it. Restarting per word would give HeLlO~WoRlD.
//   - existing case is irrelevant: every letter is forced, so "TRICK-or-TREAT" flattens as it goes.
//   - a run of separators stays a run: "y_-b" is two tildes, one per character, never merged.
// ONE approach, deliberately. A split/map/join version is the same single pass with the loop hidden:
// same work, same answer, nothing on screen to compare (CONTRIBUTING Tier 3 §1-§3).
// Limit (shortcut: every non-tilde character ticks the counter, digits included; the statement only
// ever shows letters).
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   1 hello_world                        HeLlO~wOrLd           the counter carries over the "~" and the word break
//   2 Spooky_Case                        SpOoKy~CaSe           already-capitalised letters are forced, not kept
//   3 TRICK-or-TREAT                     TrIcK~oR~tReAt        two kinds of separator; SHOUTING is flattened
//   4 c_a-n_d-y_-b-o_w_l                 C~a~N~d~Y~~b~O~w~L    one-letter words; "_-" is two tildes
//   5 thE_hAUntEd-hOUsE-Is-fUll_Of_ghOsts  ThE~hAuNtEd~...     the long one: 30 letters of parity
//   6 --ab                               ~~Ab                  ours: leading separators do not use up the capital
//   7 (empty)                            (empty)               ours: nothing to loop over
const CASES: { s: string; want?: string }[] = [
  { s: "hello_world", want: "HeLlO~wOrLd" },
  { s: "Spooky_Case", want: "SpOoKy~CaSe" },
  { s: "TRICK-or-TREAT", want: "TrIcK~oR~tReAt" },
  { s: "c_a-n_d-y_-b-o_w_l", want: "C~a~N~d~Y~~b~O~w~L" },
  { s: "thE_hAUntEd-hOUsE-Is-fUll_Of_ghOsts", want: "ThE~hAuNtEd~HoUsE~iS~fUlL~oF~gHoStS" },
  { s: "--ab", want: "~~Ab" },
  { s: "", want: "" },
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

const spookify = (boo: string) => {
  let out = "";
  let i = 0;
  for (const ch of boo.replaceAll(/[_-]/gu, "~")) {
    if (ch === "~") {
      out += ch;
      continue;
    }
    out += i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase();
    i++;
  }
  return out;
};

const q = (s: string) => JSON.stringify(s);
const short = (x: string) => (x.length > 26 ? x.slice(0, 23) + "…" : x);
const label = (s: string) => (s === "" ? "(empty)" : s.length > 26 ? s.slice(0, 24) + "…" : s);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .sp-wrap { display:flex; flex-direction:column; gap:12px; }
    .sp-row { display:flex; flex-wrap:wrap; gap:4px; }
    .sp-t { width:26px; text-align:center; border:1px solid var(--border); border-radius:6px; background:var(--panel-2); padding:3px 0 2px; }
    .sp-t .was { display:block; font:11px var(--mono); color:var(--muted); }
    .sp-t .now { display:block; font:800 15px var(--mono); color:var(--text); }
    .sp-t.up { border-color:var(--accent); }
    .sp-t.up .now { color:var(--accent); }
    .sp-t.lo .now { color:var(--good); }
    .sp-t.sep { border-style:dashed; background:color-mix(in srgb, var(--warn) 18%, transparent); }
    .sp-t.sep .now { color:var(--warn); }
    .sp-t .k { display:block; font:9px var(--sans); color:var(--muted); letter-spacing:.04em; }
    .sp-key { font:11px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; }
    .sp-out { font:800 20px var(--mono); color:var(--good); word-break:break-all; }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!.s;
  inp.style.width = "min(420px, 100%)";
  ctl.append(el("span", "ctl-label", "boo ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", esc(label(c.s)));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c.s;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const s = inp.value;
    const result = spookify(s);
    const want = CASES.find((c) => c.s === s)?.want;
    const ok = want === undefined || want === result;

    out.innerHTML = "";
    const wrap = el("div", "sp-wrap");
    wrap.append(
      el(
        "div",
        "result-line",
        `<span class="badge ${ok ? "ok" : "no"}">spookify(${esc(q(s))}) → ${esc(q(result))}</span><span class="more">${
          want === undefined ? "your own input" : "matches freeCodeCamp's expected output"
        }</span>`,
      ),
    );

    // One tile per character: the counter value it saw, and what it became.
    const row = el("div", "sp-row");
    let letters = 0;
    for (const ch of s) {
      if (ch === "_" || ch === "-" || ch === "~") {
        row.append(
          el(
            "div",
            "sp-t sep",
            `${ch === "~" ? "" : `<span class="was">${esc(ch)}</span>`}<span class="now">~</span><span class="k">skip</span>`,
          ),
        );
        continue;
      }
      const up = letters % 2 === 0;
      const now = up ? ch.toUpperCase() : ch.toLowerCase();
      row.append(
        el(
          "div",
          "sp-t " + (up ? "up" : "lo"),
          `<span class="was">${esc(ch)}</span><span class="now">${esc(now)}</span><span class="k">#${letters}</span>`,
        ),
      );
      letters++;
    }
    if (s === "") row.append(el("div", "muted", "(empty input)"));
    wrap.append(
      row,
      el(
        "div",
        "sp-key",
        `<span>top: the character you typed</span><span>bottom: what it became</span><span>#n: letter count before it (even = upper)</span><span>dashed: separator, becomes ~, not counted</span>`,
      ),
      el("div", "sp-out", esc(q(result))),
      el("div", "note", noteFor(s)),
    );
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch names a different thing to get wrong.
function noteFor(s: string) {
  if (s === "")
    return `Nothing to loop over, so the loop body never runs and <code class='inl'>out</code> stays <code class='inl'>""</code>.`;
  if (/^[_~-]/u.test(s))
    return `The string <b>starts</b> on a separator. It is copied as <code class='inl'>~</code> without ticking the counter, so the first <i>letter</i> is still letter #0 and gets the capital. Counting string positions instead would lowercase it. This one is ours.`;
  if (/[_-]{2}/u.test(s))
    return `A run of separators (<code class='inl'>_-</code>) becomes <b>two</b> tildes, one per character, and neither ticks the counter. The letter after the run carries on from the letter before it, which is why <code class='inl'>y_-b</code> gives <code class='inl'>Y~~b</code>.`;
  if (/(^|[_-])[a-z]([_-]|$)/iu.test(s))
    return `One-letter words: the counter does not restart at each word, so each lone letter alternates with its neighbours (<code class='inl'>C~a~N</code>). Resetting per word would capitalise every one of them.`;
  if (/[A-Z]{3}/u.test(s))
    return `The shouting is flattened as it goes: every letter is forced to the case its counter asks for, whatever it arrived as. <code class='inl'>TRICK</code> becomes <code class='inl'>TrIcK</code>, not <code class='inl'>TRICK</code>.`;
  return `The counter runs <b>across</b> words. A word break (the tile in dashes) is skipped, so a word's first letter is upper or lower depending on how many letters came before the break. That is why the second word can start lowercase.`;
}

// ── STEP — one character per loop turn ─────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">spookify</span>(<span class="tok" data-t="arg">boo</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="swap">s = boo.<span class="fn">replace</span>(/[_-]/g, <span class="st">"~"</span>)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span>, i = <span class="nu">0</span></span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop">ch <span class="k">of</span> s</span>) {`,
  },
  {
    ln: 5,
    html: `    <span class="k">if</span> (<span class="tok" data-t="tilde">ch === <span class="st">"~"</span></span>) { out += ch; <span class="k">continue</span>; }`,
  },
  {
    ln: 6,
    html: `    <span class="k">const</span> <span class="tok" data-t="up">up = i % <span class="nu">2</span> === <span class="nu">0</span></span>;`,
  },
  {
    ln: 7,
    html: `    <span class="tok" data-t="app">out += up ? ch.<span class="fn">toUpperCase</span>() : ch.<span class="fn">toLowerCase</span>()</span>; <span class="tok" data-t="tick">i++</span>;`,
  },
  { ln: 8, html: `  }` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 10, html: `}` },
];

function trace(idx: number) {
  const boo = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!.s;
  const steps: DbgStep[] = [];
  const s = boo.replaceAll(/[_-]/gu, "~");
  let out = "";
  let i = 0;
  let ch: string | undefined;
  let up: boolean | undefined;

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { boo: q(short(boo)) };
    if (line >= 2) vars["s"] = q(short(s));
    if (line >= 3) {
      vars["out"] = q(short(out));
      vars["i"] = i;
    }
    if (line >= 4 && line <= 8 && ch !== undefined) vars["ch"] = q(ch);
    if (line >= 6 && line <= 8 && up !== undefined) vars["up"] = up;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `spookify(${q(short(boo))})`,
          vars,
          changed: x.changed ?? [],
          structs:
            line >= 2
              ? [
                  {
                    label: "s",
                    items: s
                      .split("")
                      .slice(0, 24)
                      .concat(s.length > 24 ? ["…"] : []),
                    newest: false,
                  },
                ]
              : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Spookify <b>${esc(q(short(boo)))}</b>: separators become <code class='inl'>~</code>, and letters alternate upper, lower, upper... starting with upper.`,
    { focus: "arg" },
  );
  S(
    2,
    `Swap every <code class='inl'>_</code> and <code class='inl'>-</code> for <code class='inl'>~</code> up front, so the loop only has one non-letter to recognise. Now <code class='inl'>s</code> is <b>${esc(q(short(s)))}</b>.`,
    { focus: "swap", changed: ["s"] },
  );
  S(
    3,
    `<code class='inl'>out</code> collects the answer. <code class='inl'>i</code> counts <b>letters seen</b>, not positions, because the tilde must be ignored when counting.`,
    { focus: "init", changed: ["out", "i"] },
  );

  const chars = s.split("");
  for (const c of chars) {
    ch = c;
    up = undefined;
    S(4, `Next character: <b>${esc(q(c))}</b>.`, { focus: "loop", changed: ["ch"] });
    const isTilde = c === "~";
    S(
      5,
      isTilde
        ? `A tilde. It goes straight into <code class='inl'>out</code> and the loop moves on, <b>skipping</b> the <code class='inl'>i++</code>. That is "ignore the tilde when counting": <code class='inl'>i</code> stays <b>${i}</b>, so the next letter picks up where the last one left off.`
        : `Not a tilde, so it is a letter and falls through to the case flip.`,
      { focus: "tilde", eval: { expr: `ch === "~"`, val: isTilde } },
    );
    if (isTilde) {
      out += c;
      continue;
    }
    up = i % 2 === 0;
    S(
      6,
      `<code class='inl'>i</code> is <b>${i}</b>, which is ${up ? "even" : "odd"}, so this letter goes ${up ? "<b>upper</b>" : "<b>lower</b>"}. The first letter is i = 0, so the string starts with a capital.`,
      { focus: "up", changed: ["up"] },
    );
    const nowCh = up ? c.toUpperCase() : c.toLowerCase();
    out += nowCh;
    i++;
    S(
      7,
      c === nowCh
        ? `<b>${esc(c)}</b> is already ${up ? "upper" : "lower"} case, so it is unchanged, but it was forced anyway: the input's own case never matters. <code class='inl'>i</code> ticks to <b>${i}</b>.`
        : `<b>${esc(c)}</b> → <b>${esc(nowCh)}</b>, forced to the case the counter asks for whatever it arrived as. <code class='inl'>i</code> ticks to <b>${i}</b>, so the next letter flips.`,
      { focus: "app", changed: ["out", "i"] },
    );
  }
  ch = undefined;
  up = undefined;
  S(
    4,
    chars.length > 0
      ? `Every character of <code class='inl'>s</code> has been handled, so the loop ends.`
      : `<code class='inl'>s</code> is empty, so the loop body never runs.`,
    { focus: "loop" },
  );
  S(
    9,
    `<b>Return ${esc(q(short(out)))}</b>. ${i} letter${i === 1 ? "" : "s"} were counted across the whole string, and the counter never restarted at a word break.`,
    { focus: "ret", done: true, result: q(short(out)), ret: { value: q(short(out)) } },
  );
  return steps;
}

export default {
  n: 82,
  id: "spooky-case",
  title: "SpOoKy~CaSe",
  dates: ["2025-10-31"],
  statement: `Given a string representing a variable name, convert it to "spooky case": replace every underscore (<code class="inl">_</code>) and hyphen (<code class="inl">-</code>) with a tilde (<code class="inl">~</code>), then capitalize the first letter and every other letter after it, ignoring the tilde when counting. All other letters are lowercase. <span class="rule">Example: <code class="inl">spookify("hello_world")</code> → <code class="inl">"HeLlO~wOrLd"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `Swap the separators for <code class='inl'>~</code> first, then walk the string once with a counter of <b>letters seen</b>. A tilde is copied through and does not tick the counter; any other character is forced upper when the count is even and lower when odd. Three things fall out of the official set. The counter is <b>per letter, not per position</b>: <code class='inl'>c_a-n</code> is <code class='inl'>C~a~N</code> because the tildes do not count, and a string index would misalign after the first separator. It <b>never restarts</b> at a word break: <code class='inl'>hello_world</code> is <code class='inl'>HeLlO~wOrLd</code>, with the lowercase <code class='inl'>w</code> because five letters came first. And the input's own case is <b>irrelevant</b>: <code class='inl'>TRICK-or-TREAT</code> is flattened as it goes. A run like <code class='inl'>_-</code> stays two tildes. Type any name, or click a case: the first five are freeCodeCamp's. One honest limit: every non-tilde character ticks the counter, digits included; the statement only shows letters.`,
      code: `// Swap separators for "~", then alternate case on a counter that skips every "~".
function spookify(boo: string): string {
  let out = "";
  let i = 0;                                          // letters seen so far, NOT string positions
  for (const ch of boo.replace(/[_-]/g, "~")) {
    if (ch === "~") {                                 // copy through; do not tick the counter
      out += ch;
      continue;
    }
    out += i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase();   // forced, whatever case it arrived in
    i++;
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "one character per stop",
      approach: `The function one character at a time, so you can watch the counter <code class='inl'>i</code> only move on letters. Start on <b>case 4</b>: every word is a single letter, and the <code class='inl'>_-</code> pair gives two tildes that leave <code class='inl'>i</code> alone. <b>Case 1</b> shows the counter carrying across the word break, so the <code class='inl'>w</code> comes out lowercase. <b>Case 6</b> is ours: leading tildes do not use up the capital. <b>Case 7</b> is the empty string and never enters the loop. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 4,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1–${CASES.length}: 1–${OFFICIAL} official, ${OFFICIAL + 1}–${CASES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
