// #2 · Base Check — a digit is legal in base b exactly when its VALUE is < b.
//
// The clean model is ONE digit alphabet, "0…9A…Z", and a value lookup: a
// character's value is its index in that alphabet, the same in every base, and
// base b keeps exactly the first b of them. That replaces the pile of per-base
// range checks the prompt invites (0-1, 0-7, 0-9+A-F, 0-9+A-Z) with two lines —
// one for "not a digit at all", one for "a digit, but too big for THIS base".
//
// ONE APPROACH, deliberately (Tier 3). The alternatives are spellings, not
// models: a regex assembled per base, or a chain of range tests, is the same
// idea with different syntax — variant B would be variant A with a line
// rewritten. So this ships `Solution` + `Step through`, the gallery's normal
// shape.
//
// `parseInt(n, base)` is the tempting fourth idea and it is a GOTCHA, not an
// approach: it stops at the first character it cannot use and returns the
// prefix, so `parseInt("10201", 2)` is 2 — not NaN — and a naive
// `!isNaN(parseInt(n, base))` calls that string VALID when official test 2 says
// false. A wrong answer cannot be a graded variant (Tier 1 §3), so it ships as
// a live comparison readout inside the demo instead, where the disagreement is
// the lesson.
//
// Drag the base slider on `5G3F8F`: at 17 every character is legal, at 16 the G
// alone turns red, because G is worth exactly 16 and 16 is not < 16. That one
// flip is the whole challenge.
import { el, esc, mountDebugger } from "../shared.js";

// The alphabet. Index === value: '0'→0, '9'→9, 'A'→10, 'Z'→35.
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// The graded function, exactly as shipped in CODE below.
const isValid = (n, base) => {
  for (const ch of String(n).toUpperCase()) {
    const v = DIGITS.indexOf(ch);
    if (v === -1 || v >= base) return false;
  }
  return true;
};

// Provenance: cases 1–16 are freeCodeCamp's OFFICIAL set for #2, verbatim and in
// the grader's own order — all sixteen, verified 16/16 against the published
// assertions. 17–18 are ours (dashed chips) and cover the two holes the official
// set leaves wide open: a character that is a digit in NO base, and the empty
// string, on which freeCodeCamp takes no position at all.
const CASES = [
  { n: "10101",      b: 2,  why: "0 and 1 are the whole of base 2's alphabet" },
  { n: "10201",      b: 2,  why: "'2' is worth exactly 2 — and 2 is not < 2. The boundary" },
  { n: "76543210",   b: 8,  why: "7 is octal's largest digit; nothing here exceeds it" },
  { n: "9876543210", b: 8,  why: "'9' is worth 9, far past the base-8 ceiling of 7" },
  { n: "9876543210", b: 10, why: "same string, base 10: 9 is now exactly the top legal digit" },
  { n: "ABC",        b: 10, why: "letters start at value 10, so no letter fits a base ≤ 10" },
  { n: "ABC",        b: 16, why: "A=10, B=11, C=12 — all comfortably under 16" },
  { n: "Z",          b: 36, why: "Z is worth 35, the very last digit base 36 has" },
  { n: "ABC",        b: 20, why: "base 20 stretches the alphabet to J; A–C sit well inside" },
  { n: "4B4BA9",     b: 16, why: "digits and letters mixed — the value test never cares which" },
  { n: "5G3F8F",     b: 16, why: "G is worth exactly 16, one past hex. Now drag the base up ↑" },
  { n: "5G3F8F",     b: 17, why: "…and at 17 the same string is valid. One base, one flip" },
  { n: "abc",        b: 10, why: "lowercase folds to ABC first; still worth 10–12" },
  { n: "abc",        b: 16, why: "case-insensitive: 'a' and 'A' are the same digit" },
  { n: "AbC",        b: 16, why: "mixed case, folded in a single pass" },
  { n: "z",          b: 36, why: "lowercase top of the alphabet: z → Z → 35" },
  { n: "1 0",        b: 16, mine: true, why: "OURS — a space is a digit in no base; indexOf returns −1" },
  { n: "",           b: 2,  mine: true, why: "OURS — nothing can fail, so it falls through to true" },
];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bck-strip { display:flex; flex-wrap:wrap; gap:3px; margin:6px 0 2px; }
    .bck-d { width:20px; height:22px; display:flex; align-items:center; justify-content:center;
      font:700 11px var(--mono); border-radius:4px; border:1px solid var(--border);
      background:var(--panel-2); color:var(--muted); opacity:.32; transition:all .15s; }
    .bck-d.legal { opacity:1; color:var(--good); border-color:var(--good);
      background:color-mix(in srgb,var(--good) 14%,transparent); }
    .bck-d.edge { opacity:1; color:var(--warn); border-color:var(--warn);
      background:color-mix(in srgb,var(--warn) 18%,transparent); }
    .bck-cells { display:flex; flex-wrap:wrap; gap:7px; margin:14px 0 4px; min-height:60px; align-items:center; }
    .bck-cell { width:46px; border:1px solid var(--border); border-radius:8px; padding:6px 0;
      text-align:center; background:var(--panel-2); transition:all .15s; }
    .bck-cell .ch { font:800 20px var(--mono); line-height:1.15; }
    .bck-cell .v { font:11px var(--mono); color:var(--muted); height:14px; }
    .bck-cell.ok { border-color:var(--good); }
    .bck-cell.ok .ch { color:var(--good); }
    .bck-cell.ok .v { color:var(--good); }
    .bck-cell.bad { border-color:var(--danger); background:color-mix(in srgb,var(--danger) 12%,transparent); }
    .bck-cell.bad .ch, .bck-cell.bad .v { color:var(--danger); }
    .bck-why { font:12.5px/1.55 var(--mono); color:var(--muted); margin:2px 0 6px; min-height:18px; }
    .bck-why b { color:var(--text); }
    .bck-trap { border:1px dashed color-mix(in srgb,var(--warn) 55%,var(--border)); border-radius:9px;
      padding:9px 11px; margin-top:14px; font:12.5px/1.55 var(--mono); color:var(--muted); }
    .bck-trap h4 { margin:0 0 6px; font:700 10.5px var(--sans); letter-spacing:.07em;
      text-transform:uppercase; color:var(--warn); }
    .bck-trap b { color:var(--text); }
    .bck-base { font:800 15px var(--mono); color:var(--accent); min-width:26px; text-align:right; }
    .chip.bck-mine { border-style:dashed; border-color:color-mix(in srgb,var(--accent) 55%,var(--border)); }
  `));
}

// ── Variant 1 — the demo. Free text + a 2–36 base slider, so every one of the
// eighteen cases above is landable by typing as well as by chip.
function mountSolution(host) {
  ensureStyle();

  const numRow = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "5G3F8F"; inp.style.width = "200px";
  numRow.append(el("span", "ctl-label", "number ="), inp);

  const baseRow = el("div", "controls");
  const slider = el("input"); slider.type = "range"; slider.min = 2; slider.max = 36; slider.value = 16; slider.style.width = "230px";
  const bnum = el("span", "bck-base", "16");
  baseRow.append(el("span", "ctl-label", "base ="), slider, bnum, el("span", "ctl-label", "(2–36 — drag it and watch characters flip)"));

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip" + (c.mine ? " bck-mine" : ""), `${c.n === "" ? "(empty)" : esc(c.n)} · b${c.b}`);
    chip.title = c.why;
    chip.onclick = () => { inp.value = c.n; slider.value = c.b; render(); };
    chips.append(chip);
  });

  const out = el("div");
  host.append(numRow, baseRow, chips,
    el("div", "note", "Sixteen solid chips are freeCodeCamp's official cases, in grader order. The two <b>dashed</b> chips are ours — a character that is a digit in no base, and the empty string."),
    out);

  function render() {
    const str = inp.value;
    const base = +slider.value;
    bnum.textContent = base;
    out.innerHTML = "";

    // 1) The alphabet, with this base's slice lit and its ceiling in amber.
    //    This is the payoff of the slider: the legal set visibly grows/shrinks.
    out.append(el("div", "muted", `Base <b>${base}</b> keeps the first <b>${base}</b> of the 36 digits — <code class="inl">0</code> through <code class="inl">${DIGITS[base - 1]}</code>. The amber cell is the largest legal digit; everything past it is illegal <i>here</i> and legal in some bigger base.`));
    const strip = el("div", "bck-strip");
    for (let i = 0; i < DIGITS.length; i++) {
      strip.append(el("div", "bck-d" + (i < base ? " legal" : "") + (i === base - 1 ? " edge" : ""), DIGITS[i]));
    }
    out.append(strip);

    // 2) One cell per character: the character, its VALUE, and the verdict.
    const chars = [...str];
    const cells = el("div", "bck-cells");
    chars.forEach((ch) => {
      const v = DIGITS.indexOf(ch.toUpperCase());
      const good = v !== -1 && v < base;
      const cell = el("div", "bck-cell " + (good ? "ok" : "bad"));
      cell.innerHTML = `<div class="ch">${esc(ch === " " ? "␣" : ch)}</div><div class="v">${v === -1 ? "—" : v}</div>`;
      cells.append(cell);
    });
    if (!chars.length) cells.append(el("span", "muted", "(empty string — there is no character here to reject)"));
    out.append(cells);

    // 3) The verdict, and WHY it landed there.
    const ok = isValid(str, base);
    const line = el("div", "result-line");
    line.append(el("span", "badge " + (ok ? "ok" : "no"), ok ? "valid" : "invalid"));
    line.append(el("span", "mono", `isValidNumber("${esc(str)}", ${base}) → <b>${ok}</b>`));
    out.append(line);

    let why;
    if (!chars.length) {
      why = `The loop body never runs, so nothing can <b>return false</b> and the function falls through to <b>return true</b>. freeCodeCamp never tests the empty string — this is our reading of "every character is a valid digit", stated openly rather than hidden.`;
    } else if (ok) {
      const values = chars.map((ch) => DIGITS.indexOf(ch.toUpperCase()));
      const top = Math.max(...values);
      why = `Every character's value is under <b>${base}</b>. The largest here is <b>${DIGITS[top]}</b> at <b>${top}</b>, and this base's ceiling is <b>${base - 1}</b> — ${base - 1 === top ? `so it sits <i>exactly</i> on the ceiling. Drop the base by one and this character is the first to fail.` : `so it clears with ${base - 1 - top} to spare.`}`;
    } else {
      const k = chars.findIndex((ch) => { const v = DIGITS.indexOf(ch.toUpperCase()); return v === -1 || v >= base; });
      const bad = chars[k], v = DIGITS.indexOf(bad.toUpperCase());
      why = v === -1
        ? `<b>"${esc(bad === " " ? "␣" : bad)}"</b> at index ${k} is not in the alphabet at all — <code class="inl">DIGITS.indexOf</code> returns <b>−1</b>. No base could rescue it, so raising the slider will not help this one.`
        : `<b>${esc(bad)}</b> at index ${k} is worth <b>${v}</b>, and ${v} is not &lt; ${base}. Base ${base} stops at <b>${DIGITS[base - 1]}</b> (${base - 1})${v === base ? ` — a digit equal to the base is already one too many` : ``}. Push the base to <b>${v + 1}</b> and this character becomes legal.`;
    }
    out.append(el("div", "bck-why", why));

    // 4) The gotcha, side by side — NOT a graded approach, because it is wrong.
    const p = parseInt(str, base);
    const naive = !Number.isNaN(p);
    const trap = el("div", "bck-trap");
    const verdictLine = `<code class="inl">parseInt("${esc(str)}", ${base})</code> → <b>${Number.isNaN(p) ? "NaN" : p}</b>, so a naive <code class="inl">!isNaN(…)</code> check answers <b>${naive}</b> where the truth is <b>${ok}</b>.`;
    const explain = !chars.length
      ? `They disagree. <b>parseInt</b> has nothing to parse and reports NaN; our loop has nothing to reject and reports true. Neither is "the" answer here — the official set is silent on the empty string.`
      : naive === ok
        ? `They agree on this input — by luck, not by logic. Try <b>10201</b> at base 2 to watch the agreement collapse.`
        : `<b>They disagree.</b> parseInt stops at the first character it cannot use and returns the prefix it already had, so it cannot tell a valid number from a valid <i>beginning</i>. That is why it is shown here and not as a solution.`;
    trap.innerHTML = `<h4>the trap · parseInt</h4><div>${verdictLine}</div><div style="margin-top:6px">${explain}</div>`;
    out.append(trap);

    out.append(el("div", "note", "Two rejection tests, and they are not the same question. <code class=\"inl\">v === -1</code> asks <i>is this a digit at all?</i> — a permanent no. <code class=\"inl\">v &gt;= base</code> asks <i>does this digit fit here?</i> — a no that a bigger base can overturn."));
  }

  inp.oninput = render;
  slider.oninput = render;
  render();
}

// ── The copy-pasteable solution. DIGITS is interpolated from the module constant
// above, so the snippet cannot drift from the alphabet the demo actually runs on.
const CODE = `// One alphabet for every base. A character's VALUE is its index here, and a
// digit is legal in base b exactly when that value is < b.
const DIGITS = ${JSON.stringify(DIGITS)};

function isValidNumber(n: string, base: number): boolean {
  for (const ch of n.toUpperCase()) {   // case-insensitive: fold ONCE, up front
    const v = DIGITS.indexOf(ch);       // this character's value, or -1 if it isn't a digit
    if (v === -1) return false;         // not a digit in ANY base (space, "-", "$"…)
    if (v >= base) return false;        // a real digit, but too big for THIS base
  }
  return true;                          // nothing failed — "" is vacuously valid
}`;

// ── STEP — the same function, one character at a time ────────────────────────
// The two rejection tests are split onto their own lines (6 and 7) rather than
// combined with ||, because they fail for different reasons and the trace needs
// to land on one or the other. Line 1 interpolates DIGITS, so the source the
// reader steps through is literally the alphabet the demo uses.
const SRC = [
  { ln: 1,  html: `<span class="k">const</span> DIGITS = <span class="tok" data-t="digits"><span class="st">"${DIGITS}"</span></span>;` },
  { ln: 2,  html: `<span class="k">function</span> <span class="fn">isValidNumber</span>(<span class="tok" data-t="params">n, base</span>) {` },
  { ln: 3,  html: `  <span class="k">const</span> s = <span class="tok" data-t="upper">n.<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch">ch</span> <span class="k">of</span> s) {` },
  { ln: 5,  html: `    <span class="k">const</span> v = <span class="tok" data-t="idx">DIGITS.<span class="fn">indexOf</span>(ch)</span>;` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="neg">v === -1</span>) <span class="k">return</span> <span class="k">false</span>;   <span class="cm">// not a digit in ANY base</span>` },
  { ln: 7,  html: `    <span class="k">if</span> (<span class="tok" data-t="cmp">v &gt;= base</span>) <span class="k">return</span> <span class="k">false</span>;  <span class="cm">// too big for THIS base</span>` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="ret"><span class="k">true</span></span>;` },
  { ln: 10, html: `}` },
];

// Curated for trace length, one branch each: 1 clean pass · 2 digit EQUAL to the
// base (the boundary) · 3 letters in a base ≤ 10 · 4 lowercase folded and
// accepted · 5 a letter equal to the base · 6 the SAME string one base higher,
// now valid · 7 ours, the only case that reaches line 6's `v === -1`. Cases 1–6
// are official freeCodeCamp cases (#1, #2, #6, #14, #11, #12 in grader order);
// the other ten official cases are chips or free input on the Solution tab.
const STEP_CASES = [
  { n: "10101",  b: 2 },
  { n: "10201",  b: 2 },
  { n: "ABC",    b: 10 },
  { n: "abc",    b: 16 },
  { n: "5G3F8F", b: 16 },
  { n: "5G3F8F", b: 17 },
  { n: "1 0",    b: 16 },
];

function traceCheck(idx) {
  const c = STEP_CASES[Math.max(1, Math.min(STEP_CASES.length, idx)) - 1];
  const n = c.n, base = c.b, s = n.toUpperCase();
  const steps = [];
  let ch = null, v = null, inLoop = false;

  // Scope by omission, gated on the line number (plus one liveness flag for the
  // loop binding, which dies at the closing brace rather than at a line):
  //   line 1  — module scope: DIGITS exists, the call has not happened yet.
  //   line 2  — n and base arrive with the call.
  //   line 3  — `const s` comes into being.
  //   inLoop  — `ch` lives only inside the for-of body.
  //   line 5  — `const v` is re-created fresh on every iteration.
  // DIGITS is a module constant, so it is live for the WHOLE call and is pushed
  // unconditionally — it must never blink out. The base-narrowed view is a second
  // struct ALONGSIDE it, not a replacement, gated on line 2 where `base` arrives
  // and the cut-off first means something. The narrowing then reads as a subset
  // of the alphabet still sitting above it.
  const S = (line, note, x = {}) => {
    const vars = {}, structs = [{ label: "DIGITS", items: [...DIGITS] }];
    if (line >= 2) {
      vars.n = `"${n}"`; vars.base = base;
      if (line >= 3) vars.s = `"${s}"`;
      if (inLoop) vars.ch = `"${ch}"`;
      if (inLoop && line >= 5) vars.v = v;
      structs.push({ label: `DIGITS.slice(0, base)`, items: [...DIGITS.slice(0, base)] });
    }
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line === 1 ? "module scope" : `isValidNumber("${n}", ${base})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `<b>One alphabet, every base.</b> A character's <b>value</b> is just its index here — <code class='inl'>'0'</code>→0, <code class='inl'>'9'</code>→9, <code class='inl'>'A'</code>→10, … <code class='inl'>'Z'</code>→35. That mapping never changes; the only thing a base changes is where the list is <i>cut off</i>.`, { focus: "digits" });
  S(2, `Call <b>isValidNumber("${n}", ${base})</b>. Base ${base} keeps only the first ${base} of those 36 digits — <code class='inl'>0</code> to <code class='inl'>${DIGITS[base - 1]}</code>. A second struct appears below the full alphabet showing exactly that slice — the same 36 characters are still there, a base just draws a line across them, and that line is the entire meaning of "base ${base}".`, { focus: "params" });
  S(3, `Fold the whole string to upper case <b>once</b>: <b>"${n}"</b> → <b>"${s}"</b>. Doing it here, before the loop, is why nothing below ever has to think about case again — this single line <i>is</i> the case-insensitivity requirement, and it costs one pass instead of one branch per character.`, { focus: "upper", changed: ["s"] });

  for (let i = 0; i < s.length; i++) {
    inLoop = true; ch = s[i]; v = null;
    S(4, `Character ${i + 1} of ${s.length}: <b>ch = "${ch === " " ? "␣" : ch}"</b>. Each is judged alone, because the rule is <i>every</i> character must be a legal digit — one failure condemns the whole string.`, { focus: "ch", changed: ["ch"] });

    v = DIGITS.indexOf(ch);
    S(5, `<b>DIGITS.indexOf("${ch === " " ? "␣" : ch}")</b> → <b>${v}</b>. ${v === -1
      ? `It appears nowhere in the alphabet, so it has no value in <i>any</i> base — that is a different kind of failure from being too big.`
      : `So "${ch}" is worth <b>${v}</b> — and it is worth ${v} in base 2 and in base 36 alike. The character's value is fixed; only the ceiling moves.`}`, { focus: "idx", changed: ["v"] });

    const missing = v === -1;
    S(6, `First rejection test — <i>is this a digit at all?</i> <b>${v} === -1</b> → <b>${missing}</b>. ${missing
      ? `Nothing in the 36-character alphabet matches it.`
      : `It is a real digit, so this test lets it through. Being a digit is necessary but not sufficient — the next line does the base-specific half.`}`, { focus: "neg", eval: { expr: `${v} === -1`, val: missing } });
    if (missing) {
      S(6, `<b>"${ch === " " ? "␣" : ch}"</b> is a digit in no base whatsoever, so no base could make this string valid — <b>return false</b> at once, without reading the remaining ${s.length - i - 1} character${s.length - i - 1 === 1 ? "" : "s"}. Raising the base would not save this one.`, { focus: "neg", ret: { value: "false" }, done: true, result: "false" });
      return steps;
    }

    const tooBig = v >= base;
    S(7, `Second rejection test — <i>does this digit fit</i> base ${base}? <b>${v} &gt;= ${base}</b> → <b>${tooBig}</b>. Base ${base} runs 0…${base - 1}, so a digit worth ${v} ${tooBig ? `does not exist in it${v === base ? ` — and note ${v} is <i>exactly</i> the base, which is already one too many; the largest legal digit is always base − 1` : ``}` : `sits safely inside it`}.`, { focus: "cmp", eval: { expr: `${v} >= ${base}`, val: tooBig } });
    if (tooBig) {
      S(7, `<b>"${ch}"</b> is worth ${v}, but base ${base}'s largest digit is <b>${DIGITS[base - 1]}</b> (${base - 1}) — <b>return false</b>. This failure is not permanent, unlike line 6's: raise the base to <b>${v + 1}</b> and this very character passes.`, { focus: "cmp", ret: { value: "false" }, done: true, result: "false" });
      return steps;
    }
  }

  inLoop = false; ch = null; v = null;
  S(4, `The string is exhausted, so the loop ends and <b>ch</b> and <b>v</b> leave scope — watch them disappear from the panel. Every character survived both tests.`, { focus: "ch" });
  S(9, `Nothing ever returned false, so <b>return true</b>: every character of "${n}" is a digit worth less than ${base}, which is exactly what "valid in base ${base}" means.`, { focus: "ret", done: true, result: "true", ret: { value: "true" } });
  return steps;
}

// A legend, because the case chips are bare numbers. Appended before the
// debugger builds its own controls, so it reads as a caption above them.
function mountStep(host) {
  ensureStyle();
  host.append(el("div", "note",
    "Cases — " + STEP_CASES.map((c, i) => `<b>${i + 1}</b>&nbsp;"${esc(c.n)}"·b${c.b}`).join(" · ") +
    ". 1–6 are official freeCodeCamp cases; <b>7</b> is ours and is the only one that ever reaches line 6."));
  mountDebugger(host, {
    source: SRC,
    trace: traceCheck,
    input: { label: "case =", value: 5, min: 1, max: STEP_CASES.length, presets: STEP_CASES.map((_, i) => i + 1), hint: "1–" + STEP_CASES.length },
  });
}

export default {
  n: 2, id: "basecheck", title: "Base Check", dates: ["2025-08-12"],
  statement: `Given a string <code class="inl">n</code> and an integer <code class="inl">base</code> from 2 to 36, decide whether <code class="inl">n</code> is a valid number in that base — every character must be a legal digit, checked <b>case-insensitively</b>. Digits run <code class="inl">0</code>–<code class="inl">9</code> then <code class="inl">A</code>–<code class="inl">Z</code>: base 2 allows 0–1, base 8 allows 0–7, base 16 allows 0–9 and A–F, base 36 allows 0–9 and A–Z. Example: <code class="inl">isValidNumber("ABC", 16)</code> → <code class="inl">true</code>, <code class="inl">isValidNumber("ABC", 10)</code> → <code class="inl">false</code>. <span class="rule">A digit is legal when its value is strictly less than the base — which is why base 2 rejects "2".</span>`,
  variants: [
    { name: "Solution", cost: "O(n) — one pass",
      approach: `Stop thinking in ranges and think in <b>values</b>. Every character has one value — its index in <code class='inl'>0…9A…Z</code> — and that value is the same in every base. A base only decides where the alphabet is <b>cut off</b>: base <i>b</i> keeps digits 0 through <i>b</i>−1. So the test is two questions, in order: <b>is it a digit at all</b> (<code class='inl'>indexOf</code> gives −1 if not), and <b>is its value below the base</b>. Fold the case once up front and the whole thing is one pass with no per-base special-casing. Drag the base slider on <code class='inl'>5G3F8F</code> and watch <b>G</b> flip red at 16 and green at 17 — <b>G</b> is worth exactly 16, and 16 is not less than 16.`,
      code: CODE, mount: mountSolution },
    { name: "Step through", cost: "value vs ceiling",
      approach: `The same function, one character at a time. Watch the <code class='inl'>DIGITS.slice(0, base)</code> struct narrow the instant the call begins — that slice <i>is</i> the base. Then each character is looked up once and put to two different questions: line 6 asks whether it is a digit at all (a permanent no), line 7 asks whether it fits <i>this</i> base (a no a bigger base can overturn). Load case <b>5</b> then case <b>6</b>: identical string, base 16 versus 17, and the trace diverges on exactly one character. Case <b>7</b> is the only one that ever reaches line 6. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: mountStep },
  ],
};
