// #54 · P@ssw0rd Str3ngth! — four yes/no rules and a tally; the bugs hide in how each is read.
// Nothing to search and nothing to order: four independent checks, a tally, and a
// three-way split of the tally (0-1 weak, 2-3 medium, 4 strong). What the statement
// leaves to the reader is how each bullet is read, and three readings go wrong:
//   - "both uppercase AND lowercase" is ONE rule needing both, not two rules. Split
//     it and "PASSWORD" scores 2 (length + upper) -> medium, where the grader wants weak.
//   - the special set is EIGHT named characters. [^a-zA-Z0-9] is the lazy spelling and
//     it also counts "_" and spaces, so "Passw0rd_" climbs from medium to strong.
//   - "at least 8" is >= 8. The official set never separates >= from >: its only
//     eight-character case, "PASSWORD", is weak whichever you write. "Passw0r!" is ours.
// ONE approach, deliberately. A loop over characters that sets four flags is the same
// four tests done in one pass, and the gap between them is nothing you could watch
// (CONTRIBUTING Tier 3 §1/§3), so a second tab would be a strawman.
// Click "PASSWORD" and read the red row: the split-rule bug returns "medium".
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep } from "../shared.js";

// The 9 official freeCodeCamp cases in the grader's order, then three of ours.
//   "Passw0r!" — ours. Exactly eight characters and all four rules: the boundary the
//     official set cannot see, because >= 8 and > 8 agree on every official input.
//   "Passw0rd_" — ours. "_" is not one of the eight specials, so this is medium.
//     A [^a-zA-Z0-9] class counts it and answers strong.
//   "" — ours. Zero rules met, so "weak", and no test throws on an empty string.
const CASES = [
  "123456", "pass!!!", "Qwerty", "PASSWORD", "PASSWORD!", "PassWord%^!",
  "qwerty12345", "S3cur3P@ssw0rd", "C0d3&Fun!",
  "Passw0r!", "Passw0rd_", "",
];
const OFFICIAL = 9; // CASES[0..8] are freeCodeCamp's; the rest are ours.

const EXPECTED: Record<string, string> = {
  "123456": "weak", "pass!!!": "weak", "Qwerty": "weak", "PASSWORD": "weak",
  "PASSWORD!": "medium", "PassWord%^!": "medium", "qwerty12345": "medium",
  "S3cur3P@ssw0rd": "strong", "C0d3&Fun!": "strong",
};

const SPECIAL = "!@#$%^&*";
const tier = (met: number) => (met === 4 ? "strong" : met >= 2 ? "medium" : "weak");

// The four rules, each as the test the code runs. `upper`/`lower` are exposed on
// their own because the demo needs them to show the split-rule bug.
function rules(p: string) {
  const upper = /[A-Z]/.test(p), lower = /[a-z]/.test(p);
  return {
    upper, lower,
    long: p.length >= 8,
    mixed: upper && lower,
    digit: /[0-9]/.test(p),
    special: /[!@#$%^&*]/.test(p),
  };
}
const met = (r: ReturnType<typeof rules>) => [r.long, r.mixed, r.digit, r.special].filter(Boolean).length;

// The two wrong readings, scored on the same input so the demo can show them.
const splitMet = (p: string) => { const r = rules(p); return [r.long, r.upper, r.lower, r.digit, r.special].filter(Boolean).length; };
const looseMet = (p: string) => { const r = rules(p); return [r.long, r.mixed, r.digit, /[^a-zA-Z0-9]/.test(p)].filter(Boolean).length; };

// A character's category, which drives its colour in the demo.
const kind = (c: string) =>
  /[A-Z]/.test(c) ? "up" : /[a-z]/.test(c) ? "lo" : /[0-9]/.test(c) ? "dg" : SPECIAL.includes(c) ? "sp" : "ot";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pw-wrap { display:flex; flex-direction:column; gap:12px; }
    .pw-chars { display:flex; flex-wrap:wrap; gap:3px; min-height:30px; }
    .pw-c { font:700 15px var(--mono); min-width:24px; text-align:center; padding:4px 0; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); white-space:pre; }
    .pw-up { border-color:var(--c1); color:var(--c1); }
    .pw-lo { border-color:var(--c2); color:var(--c2); }
    .pw-dg { border-color:var(--c3); color:var(--c3); }
    .pw-sp { border-color:var(--c4); color:var(--c4); }
    .pw-ot { border-style:dashed; border-color:var(--warn); color:var(--warn); }
    .pw-key { font:11px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:10px; }
    .pw-key .pw-up, .pw-key .pw-lo, .pw-key .pw-dg, .pw-key .pw-sp, .pw-key .pw-ot { border:0; }
    .pw-rule .mark { font-weight:700; }
    .pw-y .mark { color:var(--good); }
    .pw-n .mark { color:var(--muted); }
    .pw-n .k { color:var(--muted); }
    .pw-rule .exp { flex:1; }
    .pw-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `));
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "PASSWORD"; inp.style.width = "260px";
  ctl.append(el("span", "ctl-label", "password ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", v === "" ? `""` : `"${esc(v)}"`);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = () => render();
  render();

  function render() {
    const p = String(inp.value);
    const r = rules(p);
    const n = met(r), result = tier(n);
    const want = EXPECTED[p];
    const wrongSplit = tier(splitMet(p)) !== result;
    const wrongLoose = tier(looseMet(p)) !== result;

    out.innerHTML = "";
    const wrap = el("div", "pw-wrap");

    const line = el("div", "result-line");
    line.append(el("span", `badge ${want === undefined || want === result ? "ok" : "no"}`, `checkStrength("${esc(p)}") → "${result}"`));
    line.append(el("span", "more", want === undefined ? `${n} of 4 rules met` : `${n} of 4 rules met · matches freeCodeCamp's expected "${want}"`));
    wrap.append(line);

    // Each character, coloured by which rule it can help with. A dashed amber cell
    // is a symbol the statement does NOT list, which is the one that fools a loose pattern.
    const chars = el("div", "pw-chars");
    [...p].forEach((c) => chars.append(el("span", `pw-c pw-${kind(c)}`, esc(c === " " ? "␣" : c))));
    wrap.append(chars);
    wrap.append(el("div", "pw-key",
      `<span class="pw-up">■ upper</span><span class="pw-lo">■ lower</span><span class="pw-dg">■ digit</span><span class="pw-sp">■ one of ${esc(SPECIAL)}</span><span class="pw-ot">■ symbol not in the set</span>`));

    const rows: [boolean, string, string][] = [
      [r.long, "length ≥ 8", `${[...p].length} characters`],
      [r.mixed, "upper and lower", `${r.upper ? "has" : "no"} uppercase · ${r.lower ? "has" : "no"} lowercase — needs both`],
      [r.digit, "a digit", r.digit ? `found ${esc([...p].filter((c) => kind(c) === "dg").join(" "))}` : "none"],
      [r.special, `one of ${esc(SPECIAL)}`, r.special ? `found ${esc([...p].filter((c) => kind(c) === "sp").join(" "))}` : "none"],
    ];
    const tbl = el("div");
    rows.forEach(([ok, name, why]) =>
      tbl.append(el("div", `srow pw-rule ${ok ? "pw-y" : "pw-n"}`, `<span class="mark">${ok ? "✓" : "✗"}</span><span class="k">${name}</span><span class="exp">${why}</span>`)));
    wrap.append(tbl);

    const ladder = el("div", "ladder");
    [["weak", "0–1 rules", n <= 1], ["medium", "2–3 rules", n === 2 || n === 3], ["strong", "all 4 rules", n === 4]]
      .forEach(([name, span, on]) => ladder.append(el("div", `rung${on ? " on" : ""}`, `<span>${name}</span><span class="v">${span}</span>`)));
    wrap.append(ladder);

    if (wrongSplit)
      wrap.append(el("div", "pw-warn", `Count upper and lower as <b>two</b> rules and this scores <b>${splitMet(p)}</b> → <b>${tier(splitMet(p))}</b>, not <b>${result}</b>.`));
    if (wrongLoose)
      wrap.append(el("div", "pw-warn", `Test for special with <code class='inl'>[^a-zA-Z0-9]</code> and this scores <b>${looseMet(p)}</b> → <b>${tier(looseMet(p))}</b>, not <b>${result}</b>.`));

    wrap.append(el("div", "note", noteFor(p, r, n, result, wrongSplit, wrongLoose)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing to get wrong.
function noteFor(p: string, r: ReturnType<typeof rules>, n: number, result: string, wrongSplit: boolean, wrongLoose: boolean) {
  const names = [r.long && "length", r.mixed && "case mix", r.digit && "a digit", r.special && "a special character"].filter(Boolean).join(", ");
  if (wrongLoose)
    return `<code class='inl'>${esc([...p].find((c) => kind(c) === "ot") ?? "")}</code> is not a letter or a digit, so it <i>feels</i> like a special character — but the statement lists eight, and this is not one of them. That is why the set is spelled out as <code class='inl'>[!@#$%^&amp;*]</code> and not as "anything else": the loose class is shorter and wrong, and it moves this password from <b>${result}</b> to <b>${tier(looseMet(p))}</b>. No official case contains such a symbol, so the grader cannot catch it.`;
  if (wrongSplit)
    return `Only <b>${n}</b> of 4 rules are met${names ? ` (${names})` : ``}, so the answer is <b>${result}</b>. The trap is the second bullet: "<b>both</b> uppercase and lowercase letters" is <b>one</b> rule that needs <i>both</i> halves, so a password with only one kind of letter does not earn it. Count the halves separately and this input gets credit for a rule it never met, moving it to <b>${tier(splitMet(p))}</b>. The official <code class='inl'>"Qwerty"</code> and <code class='inl'>"PASSWORD"</code> are there to catch exactly this.`;
  if ([...p].length === 8 && n >= 3)
    return `Exactly <b>eight</b> characters, and the length rule is met only because it is <code class='inl'>&gt;= 8</code>. Write <code class='inl'>&gt; 8</code> and this drops to <b>${tier(n - 1)}</b>. The official set cannot tell the two apart: its only eight-character case, <code class='inl'>"PASSWORD"</code>, is weak either way. This one is ours, and it is the boundary a grader that is green does not prove.`;
  if (p === "")
    return `The empty string meets <b>zero</b> rules and is <b>weak</b>, with nothing special-cased: <code class='inl'>.test</code> on <code class='inl'>""</code> is simply false four times, and a tally of zero falls to the last line. Rules that are written as tests never need a guard for emptiness; a version that indexed <code class='inl'>password[0]</code> would.`;
  if (result === "strong")
    return `All four rules: ${names}. It is <b>strong</b> and the other tiers are decided before it, because the cheapest thing to check is the top — only <code class='inl'>met === 4</code> is strong, so every other count falls through to a range test. Notice that no rule needs the others: the four checks are independent, which is why they can be tallied rather than chained.`;
  if (result === "medium")
    return `<b>${n}</b> of 4 rules met (${names}) is <b>medium</b>, the widest band: it is two <i>different</i> counts, 2 and 3, behind one label. That is why the middle answer is a range test (<code class='inl'>met &gt;= 2</code>) rather than an equality, and why different passwords can share it for completely different reasons — compare <code class='inl'>"PASSWORD!"</code> (length and symbol) with <code class='inl'>"qwerty12345"</code> (length and digit).`;
  return `<b>${n}</b> of 4 rules met${names ? ` (${names})` : ``}, which is below two, so <b>weak</b>. A single rule does not earn any better, however strong that one rule looks: a thirty-character password of one letter case is weak. The threshold is on the <i>count</i>, not on which rules were met.`;
}

// ── STEP — four tests, a tally, three buckets ───────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">checkStrength</span>(<span class="tok" data-t="arg">password</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> long = <span class="tok" data-t="long">password.length &gt;= 8</span>;` },
  { ln: 3, html: `  <span class="k">const</span> mixed = <span class="tok" data-t="mixed">/[a-z]/.<span class="fn">test</span>(password) &amp;&amp; /[A-Z]/.<span class="fn">test</span>(password)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> digit = <span class="tok" data-t="digit">/[0-9]/.<span class="fn">test</span>(password)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> special = <span class="tok" data-t="special">/[!@#$%^&amp;*]/.<span class="fn">test</span>(password)</span>;` },
  { ln: 6, html: `  <span class="k">const</span> met = <span class="tok" data-t="met">[long, mixed, digit, special].<span class="fn">filter</span>(Boolean).length</span>;` },
  { ln: 7, html: `  <span class="k">if</span> (<span class="tok" data-t="strong">met === 4</span>) <span class="k">return</span> <span class="st">"strong"</span>;` },
  { ln: 8, html: `  <span class="k">if</span> (<span class="tok" data-t="medium">met &gt;= 2</span>) <span class="k">return</span> <span class="st">"medium"</span>;` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="weak"><span class="st">"weak"</span></span>;` },
  { ln: 10, html: `}` },
];

const q = (s: string) => JSON.stringify(s);

function trace(rawInput: string) {
  const password = String(rawInput);
  const r = rules(password);
  const count = met(r);
  const steps: DbgStep[] = [];
  const have: Record<string, unknown> = {};

  const S = (line: number, note: string, x: { focus?: string; changed?: string[]; eval?: { expr: string; val: boolean }; done?: boolean; result?: string; ret?: { value: string } } = {}) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { password: q(password) };
    ["long", "mixed", "digit", "special", "met"].forEach((k, i) => { if (line >= i + 2) vars[k] = have[k]; });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{
        title: `checkStrength(${q(password)})`, vars, changed: x.changed || [],
        structs: line >= 6 ? [{ label: "[long, mixed, digit, special]", items: [r.long, r.mixed, r.digit, r.special].map(String) }] : [],
        ret: x.ret,
      }],
    });
  };

  S(1, `Four rules, each a yes or no, then a verdict from <b>how many</b> said yes. The rules do not depend on one another, so there is no order to get right and nothing to short-circuit — what matters is how each bullet is <i>read</i>. Watch the second one.`, { focus: "arg" });

  have["long"] = r.long;
  S(2, `<b>${[...password].length}</b> character${[...password].length === 1 ? "" : "s"}, so the length rule is <b>${r.long}</b>. The bullet says "at least 8", which is <code class='inl'>&gt;= 8</code>: write <code class='inl'>&gt; 8</code> and an eight-character password silently loses this rule. No official case notices — the only one with exactly eight characters is <code class='inl'>"PASSWORD"</code>, which is weak either way.`,
    { focus: "long", changed: ["long"], eval: { expr: `${[...password].length} >= 8`, val: r.long } });

  have["mixed"] = r.mixed;
  S(3, `${r.upper ? "An uppercase letter is present" : "No uppercase letter"}; ${r.lower ? "a lowercase letter is present" : "no lowercase letter"}. The rule is met only if <b>both</b> are, so this is <b>${r.mixed}</b>. "Both uppercase and lowercase" is <i>one</i> rule, not two: score the halves separately and <code class='inl'>"PASSWORD"</code> gets credit for its capitals, reaches two rules and comes back <b>medium</b> where the grader wants <b>weak</b>. The <code class='inl'>&amp;&amp;</code> on this line is what keeps it one rule.`,
    { focus: "mixed", changed: ["mixed"], eval: { expr: `${r.lower} && ${r.upper}`, val: r.mixed } });

  have["digit"] = r.digit;
  S(4, `${r.digit ? "At least one digit is present" : "No digit anywhere"}, so <b>${r.digit}</b>. <code class='inl'>/[0-9]/.test</code> asks "is there one?" and stops at the first match — the rule says "at least one number", not a count, so one 7 is as good as five.`,
    { focus: "digit", changed: ["digit"] });

  have["special"] = r.special;
  const odd = [...password].find((c) => kind(c) === "ot" && !/\s/.test(c));
  S(5, `${r.special ? "One of the eight listed symbols is present" : "None of the eight listed symbols is present"}, so <b>${r.special}</b>. The class is the literal set <code class='inl'>!@#$%^&amp;*</code> and not "anything that is not a letter or digit": ${odd ? `<code class='inl'>${esc(odd)}</code> in this password is exactly the character the loose pattern would wrongly accept` : `a loose <code class='inl'>[^a-zA-Z0-9]</code> would also count <code class='inl'>_</code> and spaces, which the statement does not list`}.`,
    { focus: "special", changed: ["special"] });

  have["met"] = count;
  S(6, `Tally: <b>${count}</b> of 4. <code class='inl'>filter(Boolean)</code> keeps the rules that said yes and <code class='inl'>.length</code> counts them — the booleans are what is being added up, which is the reason each rule is a plain boolean and not a message. Everything below this line looks only at <code class='inl'>met</code>, never at which rules produced it.`,
    { focus: "met", changed: ["met"] });

  const out = (line: number, v: string, note: string, focus: string, ev?: { expr: string; val: boolean }) =>
    S(line, note, { focus, ...(ev && { eval: ev }), done: true, result: q(v), ret: { value: q(v) } });

  const top = count === 4;
  const sNote = top
    ? `<code class='inl'>met === 4</code> is true: every rule passed, so <b>return "strong"</b>. The strict test goes first because it is the narrowest — only one count qualifies — and the later tests are ranges that would swallow it if they ran first.`
    : `<code class='inl'>met === 4</code> is false (<b>${count}</b>). Only the full house is strong, so this falls through to the range tests.`;
  const sEval = { expr: `${count} === 4`, val: top };
  if (top) { out(7, "strong", sNote, "strong", sEval); return steps; }
  S(7, sNote, { focus: "strong", eval: sEval });

  const mid = count >= 2;
  const mNote = mid
    ? `<code class='inl'>met &gt;= 2</code> is true: <b>${count}</b> rules, so <b>return "medium"</b>. This is a range because "2 or 3" is two counts behind one label, and by this line 4 has already left, so <code class='inl'>&gt;= 2</code> can only mean 2 or 3.`
    : `<code class='inl'>met &gt;= 2</code> is false (<b>${count}</b>). Fewer than two rules — and that includes zero.`;
  const mEval = { expr: `${count} >= 2`, val: mid };
  if (mid) { out(8, "medium", mNote, "medium", mEval); return steps; }
  S(8, mNote, { focus: "medium", eval: mEval });

  out(9, "weak", `<b>Return "weak".</b> No condition is written for this one: after 4 and the 2-or-3 range have been ruled out, "fewer than two" is whatever is left, so the last line is unconditional. That is also why the empty string needs no special case — zero rules is just a smaller count than one.`, "weak");
  return steps;
}

export default {
  n: 54, id: "pwstrength", title: "P@ssw0rd Str3ngth!", dates: ["2025-10-03"],
  statement: `Given a password string, return <code class="inl">"weak"</code>, <code class="inl">"medium"</code> or <code class="inl">"strong"</code>. Rules: it is <b>at least 8</b> characters; it has <b>both uppercase and lowercase</b> letters; it has <b>at least one number</b>; it has at least one of <code class="inl">! @ # $ % ^ &amp; *</code>. <b>Weak</b> if fewer than two rules are met, <b>medium</b> if two or three, <b>strong</b> if all four. <span class="rule">Example: <code class="inl">checkStrength("PASSWORD")</code> → <code class="inl">"weak"</code> — eight characters meets the length rule, but capitals alone do not meet the case rule, so only <b>1</b> of 4.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — four scans",
      approach: `Four yes-or-no rules and a tally, so the code is four booleans, a count and a three-way split. The rules are independent, so there is no order to get right and the problem is really about how each bullet is <i>read</i>. Three readings go wrong, and the demo shows each one as a red row. <b>"Both uppercase and lowercase" is one rule</b>: score the halves separately and <code class='inl'>"PASSWORD"</code> earns a rule for its capitals, reaches two and answers <b>medium</b> where the grader says weak — the official weak cases exist to catch it. <b>The special set is eight named characters</b>: <code class='inl'>[^a-zA-Z0-9]</code> is the shorter spelling and counts <code class='inl'>_</code> and spaces too, so <code class='inl'>"Passw0rd_"</code> (ours) jumps from medium to strong, and no official case contains such a symbol. <b>"At least 8" is <code class='inl'>&gt;= 8</code></b>: the official set cannot tell it from <code class='inl'>&gt; 8</code>, because its only eight-character case is weak whichever you write, so <code class='inl'>"Passw0r!"</code> (ours, exactly eight, all four rules) is the boundary check. Then the split: test <code class='inl'>=== 4</code> first because it is the narrowest, make medium a range (<code class='inl'>&gt;= 2</code>) because it covers two counts, and let weak be the fall-through, which is also why the empty string needs no guard.`,
      code: `// Four independent boolean rules, tallied, then the tally is bucketed.
function checkStrength(password: string): string {
  const long = password.length >= 8;                                  // >= 8, not > 8
  const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password);     // ONE rule: needs both
  const digit = /[0-9]/.test(password);
  const special = /[!@#$%^&*]/.test(password);                        // the eight listed, not [^a-zA-Z0-9]
  const met = [long, mixed, digit, special].filter(Boolean).length;
  if (met === 4) return "strong";   // narrowest test first
  if (met >= 2) return "medium";    // 2 or 3
  return "weak";                    // whatever is left: 0 or 1
}`,
      mount,
    },
    {
      name: "Step through", cost: "rule by rule",
      approach: `The function one rule per line, with each boolean appearing in the panel only once its line has run, and the final tally shown as the four-element array it is built from. Start on <b>"PASSWORD"</b> — official, and the case where line 3's <code class='inl'>&amp;&amp;</code> is the whole answer. <b>"PASSWORD!"</b> is the same input with one symbol added, which moves it from weak to medium. <b>"S3cur3P@ssw0rd"</b> is a strong one that returns on line 7 and never reaches the range tests. <b>"Passw0rd_"</b>, <b>"Passw0r!"</b> and <b>""</b> are ours. Type any password. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "password =", value: "PASSWORD", presets: CASES, hint: "any string" },
      }),
    },
  ],
} satisfies Challenge;
