// #48 · Spam Detector — four independent tripwires; the run check must see stripped digits.
// The statement lists four criteria and ANY one convicts, so there is no algorithm to
// find: four predicates joined by ||. The work is in reading each one literally.
// The country code is spam when it is longer than two digits OR does not start with
// zero (so "+0" and "+00" pass, "+091" and "+1" do not). The area code is spam only
// strictly outside 200..900 — 200 itself is clean, which the first official case
// leans on. The sum of the first three local digits must appear AS A SUBSTRING of the
// last four, and the sum can be two digits (9+9+9 = 27), so it is compared as text.
// And "four or more in a row, ignoring the formatting" means the run is looked for in
// the digits with "+", "(", ")", " " and "-" removed: official "+0 (555) 564-1987" is
// 0 555 5 64 — the fourth 5 is in a different field from the first three, so a
// regex over the raw string never sees it.
// ONE approach, deliberately. Early-return ifs, one boolean expression and a rule
// table are the same four tests respelled, not a second mental model, and there is
// no wasteful act to name that does not make the answer wrong (Tier 3 §1, §2).
// Click "+0 (555) 564-1987": the run that convicts it spans the area code and the
// local number, so it is invisible until the formatting is gone.
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep, DbgStruct } from "../shared.js";

// The 8 official freeCodeCamp cases in the grader's order, then four of ours. The
// official set convicts on each of the four rules at least once, always alone (091 and
// 1 are the country cases, 955 and 155 the area cases, 135-0192 the sum, 564-1987 the
// run) and has two clean numbers, so every rule has an official witness and none has
// an official near miss.
//   +0 (900) 234-0182 — ours. 900 is the top of the allowed range and the check is a
//     strict > 900, so it is clean. The official clean boundary is 200; the upper one
//     is never tested.
//   +0 (555) 309-1922 — ours. 3+0+9 = 12, and "1922" contains a 1 and a 2 but never
//     "12". A check that asks whether each digit of the sum appears would convict it;
//     the substring check does not. Clean.
//   +0 (555) 999-1272 — ours. 9+9+9 = 27 is two digits, and "1272" contains "27", so
//     this is convicted by the sum rule alone and only if the sum is compared as text.
//   +0 (555) 234-8888 — ours. The only official run straddles two fields; this one sits
//     entirely inside the last four digits, and is again convicted by the run rule alone.
const OFFICIAL: [string, boolean][] = [
  ["+0 (200) 234-0182", false],
  ["+091 (555) 309-1922", true],
  ["+1 (555) 435-4792", true],
  ["+0 (955) 234-4364", true],
  ["+0 (155) 131-6943", true],
  ["+0 (555) 135-0192", true],
  ["+0 (555) 564-1987", true],
  ["+00 (555) 234-0182", false],
];
const OURS = ["+0 (900) 234-0182", "+0 (555) 309-1922", "+0 (555) 999-1272", "+0 (555) 234-8888"];
const CASES = [...OFFICIAL.map(([n]) => n), ...OURS];
const EXPECTED = new Map(OFFICIAL);

// The statement's format: any number of country digits, then fixed 3 / 3 / 4.
const FORMAT = /^\+(\d+) \((\d{3})\) (\d{3})-(\d{4})$/;
const RUN = /(\d)\1{3,}/;

// All four tests run here, side by side, so the demo can show which ones fire. The
// graded function stops at the first one — see the step-through.
function analyse(text: string) {
  const m = FORMAT.exec(text.trim());
  if (!m) return null;
  const [country, area, first, last] = [m[1]!, m[2]!, m[3]!, m[4]!];
  const sum = [...first].reduce((a, d) => a + Number(d), 0);
  const digits = country + area + first + last;
  const run = RUN.exec(digits);
  const at = last.indexOf(String(sum));
  const tooLong = country.length > 2, notZero = country[0] !== "0";
  const hi = +area > 900, lo = +area < 200;
  const rules = [tooLong || notZero, hi || lo, at >= 0, !!run];
  return {
    country, area, first, last, sum, digits, run, at, tooLong, notZero, hi, lo, rules,
    spam: rules.some(Boolean),
  };
}

// Segment colours come from the kit's categorical ramp: one per field of the number.
const SEG = ["--c1", "--c2", "--c3", "--c4"];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sp-wrap { display:flex; flex-direction:column; gap:12px; }
    .sp-strip { display:flex; flex-wrap:wrap; align-items:flex-end; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:var(--panel-2); }
    .sp-seg { display:flex; flex-direction:column; gap:3px; }
    .sp-seg > span { font:700 10px var(--mono); color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    .sp-cells { display:flex; gap:2px; }
    .sp-d { width:22px; height:28px; display:flex; align-items:center; justify-content:center; font:700 14px var(--mono); border-radius:5px; background:var(--panel); border:1px solid var(--border); border-bottom-width:3px; color:var(--text); }
    .sp-d.run { background:color-mix(in srgb, var(--danger) 30%, transparent); border-color:var(--danger); }
    .sp-d.sub { background:color-mix(in srgb, var(--danger) 30%, transparent); border-color:var(--danger); }
    .sp-d.sum { background:color-mix(in srgb, var(--warn) 25%, transparent); }
    .sp-fmt { font:700 16px var(--mono); color:var(--muted); padding-bottom:4px; }
    .sp-rules { display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:8px; }
    .sp-rule { border:1px solid var(--border); border-radius:10px; padding:8px 11px; background:var(--panel-2); font:12px var(--sans); color:var(--muted); display:flex; flex-direction:column; gap:4px; }
    .sp-rule.fire { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 9%, transparent); }
    .sp-rule b.t { font:700 11px var(--mono); color:var(--text); text-transform:uppercase; letter-spacing:.04em; display:flex; justify-content:space-between; }
    .sp-rule.fire b.t { color:var(--danger); }
    .sp-rule code { font-family:var(--mono); color:var(--text); }
    .sp-cmp { font:12px var(--sans); color:var(--muted); }
    .sp-cmp b { font-family:var(--mono); color:var(--text); }
    .sp-bad { font:12px var(--sans); color:var(--warn); border:1px solid var(--warn); border-radius:8px; padding:6px 10px; background:color-mix(in srgb, var(--warn) 10%, transparent); }
  `));
}

type A = NonNullable<ReturnType<typeof analyse>>;

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "+0 (555) 564-1987"; inp.style.width = "280px";
  ctl.append(el("span", "ctl-label", "number ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", esc(v));
    c.title = i < OFFICIAL.length ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const text = inp.value;
    const a = analyse(text);
    out.innerHTML = "";
    const wrap = el("div", "sp-wrap");

    if (!a) {
      wrap.append(el("div", "result-line", `<span class="badge no">isSpam("${esc(text)}") → no parse</span>`));
      wrap.append(el("div", "sp-bad", `Not in the <code class='inl'>"+A (BBB) CCC-DDDD"</code> shape. The statement promises the format, so the solution never checks it — it would throw on this string. Try <code class='inl'>+0 (555) 564-1987</code>.`));
      out.append(wrap);
      return;
    }

    const want = EXPECTED.get(text.trim());
    const line = el("div", "result-line");
    line.append(el("span", `badge ${want === undefined ? (a.spam ? "no" : "ok") : (want === a.spam ? "ok" : "no")}`,
      `isSpam("${esc(text.trim())}") → ${a.spam}`));
    if (want !== undefined) line.append(el("span", "sp-cmp", `matches freeCodeCamp's expected <b>${want}</b>`));
    wrap.append(line);

    // The four fields as digit cells, with the run (red), the sum's hit inside the
    // last four (red) and the three digits being summed (amber) marked on them.
    // A run can start in one field and end in the next, so it is located in the
    // concatenated digits and then mapped back onto the cells.
    const runLo = a.run ? a.run.index : -1, runHi = a.run ? a.run.index + a.run[0].length : -1;
    const fields = [a.country, a.area, a.first, a.last];
    const names = ["country", "area", "first 3", "last 4"];
    const strip = el("div", "sp-strip");
    let off = 0;
    fields.forEach((f, k) => {
      const base = off; off += f.length;
      const seg = el("div", "sp-seg");
      seg.style.setProperty("color", `var(${SEG[k]})`);
      const cells = el("div", "sp-cells");
      [...f].forEach((d, j) => {
        const cls = ["sp-d"];
        const g = base + j;
        if (g >= runLo && g < runHi) cls.push("run");
        if (k === 3 && a.at >= 0 && j >= a.at && j < a.at + String(a.sum).length) cls.push("sub");
        if (k === 2) cls.push("sum");
        const c = el("div", cls.join(" "), d);
        c.style.borderBottomColor = `var(${SEG[k]})`;
        cells.append(c);
      });
      seg.append(el("span", null, names[k]), cells);
      strip.append(seg);
    });
    wrap.append(strip);

    const rules = el("div", "sp-rules");
    const card = (fire: boolean, title: string, body: string) =>
      rules.append(el("div", "sp-rule" + (fire ? " fire" : ""), `<b class="t"><span>${title}</span><span>${fire ? "spam" : "clear"}</span></b>${body}`));
    card(a.rules[0]!, "1 · country code",
      `<code>+${a.country}</code> — ${a.tooLong ? `<b>${a.country.length}</b> digits, over 2` : `${a.country.length} digit${a.country.length === 1 ? "" : "s"}, within 2`}; ${a.notZero ? `begins with <b>${a.country[0]}</b>, not 0` : `begins with 0`}`);
    card(a.rules[1]!, "2 · area code",
      `<code>${a.area}</code> against 200 … 900 — ${a.hi ? `<b>above 900</b>` : a.lo ? `<b>below 200</b>` : a.area === "900" || a.area === "200" ? `<b>on the edge</b>, and the edge is allowed` : `inside the range`}`);
    card(a.rules[2]!, "3 · sum in last four",
      `<code>${[...a.first].join("+")} = ${a.sum}</code> — ${a.at >= 0 ? `<b>"${a.sum}"</b> appears inside <code>${a.last}</code>` : `<code>"${a.sum}"</code> is not a substring of <code>${a.last}</code>${String(a.sum).length > 1 && [...String(a.sum)].every((d) => a.last.includes(d)) ? ` — though each of its digits is there on its own` : ``}`}`);
    card(a.rules[3]!, "4 · four in a row",
      a.run ? `<code>${a.run[0]}</code> repeats <b>${a.run[0].length}</b> times in <code>${a.digits}</code>${runLo < a.country.length + a.area.length && runHi > a.country.length + a.area.length ? ` — across the area code and the local number` : ``}` : `no digit repeats 4+ times in <code>${a.digits}</code>`);
    wrap.append(rules);

    wrap.append(el("div", "note", noteFor(a)));
    out.append(wrap);
  }
}

// What did THIS number exercise? One branch per rule, plus the clean cases, and
// every preset was chosen to land on a different one.
function noteFor(a: A) {
  const fired: string[] = [];
  if (a.tooLong || a.notZero)
    fired.push(`<b>Country code.</b> The statement joins two conditions with <b>or</b>: more than two digits, <i>or</i> not starting with zero. <code class='inl'>+${a.country}</code> trips ${a.tooLong && a.notZero ? "both" : a.tooLong ? `the length (<code class='inl'>${a.country.length} &gt; 2</code>)` : `the leading digit (<code class='inl'>${a.country[0]}</code> is not <code class='inl'>0</code>)`}. Note what passes: <code class='inl'>+0</code> and <code class='inl'>+00</code> are both fine, because "begins with 0 and is at most two digits" is the allowed set. The length test uses the captured string's <code class='inl'>.length</code>, so a leading zero counts as a digit.`);
  if (a.hi || a.lo)
    fired.push(`<b>Area code.</b> <code class='inl'>${a.area}</code> is ${a.hi ? "above 900" : "below 200"}. Both comparisons are strict, so 200 and 900 are themselves allowed — official case 1 sits on 200 and is clean. The area code is compared as a <i>number</i> (<code class='inl'>+area</code>), which is safe only because the regex already guarantees three digits; compared as strings it would also happen to work, for that same reason.`);
  if (a.at >= 0)
    fired.push(`<b>Sum in the last four.</b> <code class='inl'>${[...a.first].join(" + ")} = ${a.sum}</code>, and <code class='inl'>"${a.sum}"</code> is a substring of <code class='inl'>${a.last}</code>. The sum is turned into <i>text</i> before searching, which is what lets a two-digit sum like 27 work as one unit; looking for the sum's digits separately would convict numbers the statement does not.`);
  if (a.run) {
    const split = a.country.length + a.area.length;
    const lo = a.run.index, hi = lo + a.run[0].length;
    const cross = lo < split && hi > split ? "the area code and the local number" : lo < a.country.length && hi > a.country.length ? "the country code and the area code" : "";
    fired.push(`<b>Four in a row.</b> <code class='inl'>${a.run[0]}</code> repeats <b>${a.run[0].length}</b> times in <code class='inl'>${a.digits}</code>${cross ? `, and the run straddles ${cross}` : ``}. "Ignoring the formatting characters" is an instruction about <i>where to look</i>: the check runs on the concatenated digits, so the separators cannot break a run${cross ? ` — on the raw string the punctuation sits in the middle of it and a regex never sees four in a row` : ``}.`);
  }
  if (fired.length)
    return `Convicted by <b>${fired.length}</b> of the four rules. ${fired.join(" ")} Any single rule is enough, so the graded function is <code class='inl'>a || b || c || d</code> and stops at the first that fires — the order changes how much work is done, never the answer, which is why the step-through can return early.`;
  if (a.area === "900" || a.area === "200")
    return `<b>Clean, on the edge.</b> The area code <code class='inl'>${a.area}</code> is exactly the boundary and the rule is strict (<code class='inl'>&gt; 900</code>, <code class='inl'>&lt; 200</code>), so it passes. Official case 1 pins the lower edge (200) and nothing in the official set pins the upper one, which makes this the quietest place for a <code class='inl'>&gt;=</code> to hide. The other three rules clear too: the country code is ${a.country.length} digit${a.country.length === 1 ? "" : "s"} starting with 0, <code class='inl'>${a.sum}</code> is not in <code class='inl'>${a.last}</code>, and no digit repeats four times.`;
  if (String(a.sum).length > 1 && [...String(a.sum)].every((d) => a.last.includes(d)))
    return `<b>Clean, and a near miss.</b> The sum is <b>${a.sum}</b>, and <code class='inl'>${a.last}</code> contains a <code class='inl'>${String(a.sum)[0]}</code> and a <code class='inl'>${String(a.sum)[1]}</code> — but never <code class='inl'>"${a.sum}"</code> as one run. The statement says the sum <i>appears within</i> the last four, and appearing is a substring test. A solution that checks each digit of the sum separately convicts this number, and no official case catches it, because the official sum cases either convict outright or have a one-digit sum.`;
  return `<b>Clean.</b> Country <code class='inl'>+${a.country}</code> is at most two digits and starts with 0, area <code class='inl'>${a.area}</code> is inside 200 … 900, the sum <code class='inl'>${a.sum}</code> does not appear in <code class='inl'>${a.last}</code>, and no digit repeats four times in <code class='inl'>${a.digits}</code>. A number is spam on <i>any</i> rule, so it takes all four being clear to return <b>false</b> — which is why this branch is the one that has to run every test.`;
}

// ── STEP — the four rules as early returns, in the order the statement lists them ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isSpam</span>(<span class="tok" data-t="param">number</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="parse">[, country, area, first, last] = number.<span class="fn">match</span>(<span class="st">/^\\+(\\d+) \\((\\d{3})\\) (\\d{3})-(\\d{4})$/</span>)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="country">country.length &gt; <span class="nu">2</span> || country[<span class="nu">0</span>] !== <span class="st">"0"</span></span>) <span class="k">return true</span>;` },
  { ln: 4, html: `  <span class="k">if</span> (<span class="tok" data-t="area">+area &gt; <span class="nu">900</span> || +area &lt; <span class="nu">200</span></span>) <span class="k">return true</span>;` },
  { ln: 5, html: `  <span class="k">const</span> <span class="tok" data-t="sum">sum = [...first].<span class="fn">reduce</span>((a, d) =&gt; a + <span class="fn">Number</span>(d), <span class="nu">0</span>)</span>;` },
  { ln: 6, html: `  <span class="k">if</span> (<span class="tok" data-t="incl">last.<span class="fn">includes</span>(<span class="fn">String</span>(sum))</span>) <span class="k">return true</span>;` },
  { ln: 7, html: `  <span class="k">const</span> <span class="tok" data-t="digits">digits = country + area + first + last</span>;` },
  { ln: 8, html: `  <span class="k">if</span> (<span class="tok" data-t="run">/(\\d)\\1{3}/.<span class="fn">test</span>(digits)</span>) <span class="k">return true</span>;` },
  { ln: 9, html: `  <span class="k">return false</span>;` },
  { ln: 10, html: `}` },
];

function trace(input: string) {
  const text = String(input).trim();
  const a = analyse(text) ?? analyse("+0 (555) 564-1987")!;
  const steps: DbgStep[] = [];
  const q = (s: string) => JSON.stringify(s);

  const S = (line: number, note: string, x: { focus?: string | undefined; changed?: string[] | undefined; eval?: { expr: string; val: boolean } | undefined; done?: boolean | undefined; result?: string | undefined; ret?: { value: boolean } | undefined } = {}) => {
    const vars: Record<string, unknown> = { number: q(text) };
    if (line >= 2) Object.assign(vars, { country: q(a.country), area: q(a.area), first: q(a.first), last: q(a.last) }); // line 2
    if (line >= 5) vars["sum"] = a.sum;                                    // `const sum` is line 5
    if (line >= 7) vars["digits"] = q(a.digits);                           // `const digits` is line 7
    // The fields stay live from line 2 on; the stripped digit string appears with line 7
    // and is the one the run test reads.
    const structs: DbgStruct[] = [];
    if (line >= 2) structs.push({ label: "fields", items: [a.country, a.area, a.first, a.last] });
    if (line >= 7) structs.push({ label: "digits (formatting removed)", items: [...a.digits], newest: line === 7 });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isSpam(${q(text)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };
  // A rule fires: record the verdict and hand the finished trace back (early exit).
  const convict = (line: number, why: string, focus: string, expr: string) => {
    S(line, why, { focus, eval: { expr, val: true }, done: true, result: "true", ret: { value: true } });
    return steps;
  };

  S(1, `One string in a fixed shape, <b>four criteria</b>, and <b>any one</b> of them makes it spam. So the structure is four independent tests with an early exit — nothing to search or optimise. Each test needs a different <i>piece</i> of the number, which is why the first move is to take it apart.`, { focus: "param" });

  S(2, `One anchored regex is the parser: <code class='inl'>\\+(\\d+)</code> takes the country code at <b>any</b> length (the statement says "any number of digits"), <code class='inl'>\\((\\d{3})\\)</code> the area code, then the local number as <code class='inl'>\\d{3}-\\d{4}</code>. The fields are <b>${q(a.country)}</b>, <b>${q(a.area)}</b>, <b>${q(a.first)}</b>, <b>${q(a.last)}</b>. They stay strings on purpose — "09" and "9" must differ, and leading zeros are exactly what rule 1 asks about.`, { focus: "parse", changed: ["country", "area", "first", "last"] });

  const c = a.tooLong || a.notZero;
  if (c)
    return convict(3, `<b>${a.tooLong && a.notZero ? `both halves of the <code class='inl'>||</code> are true` : a.tooLong ? `<code class='inl'>${a.country.length} &gt; 2</code>` : `<code class='inl'>"${a.country[0]}" !== "0"</code>`}</b> — the country code ${a.tooLong ? `is ${a.country.length} digits long` : `does not begin with zero`}, so this is spam and the function returns <b>true</b> without reading another field. The rule is an <b>or</b>: more than two digits, <i>or</i> not starting with 0. That is why <code class='inl'>+0</code> and <code class='inl'>+00</code> pass and <code class='inl'>+091</code> and <code class='inl'>+1</code> do not. Early return is safe because one rule is enough — the later ones could only say "spam" again.`, "country", `country.length > 2 || country[0] !== "0"`);
  S(3, `<b>${a.country.length}</b> digit${a.country.length === 1 ? "" : "s"}, starting with <b>0</b> — the country code is acceptable, so execution falls through. Both halves had to be false: it is <code class='inl'>||</code>, so clearing one is not enough. The check reads <code class='inl'>.length</code> of a <i>string</i>, which is why the field was not turned into a number: <code class='inl'>Number("00")</code> is 0, one digit shorter than it was.`,
    { focus: "country", eval: { expr: `country.length > 2 || country[0] !== "0"`, val: false } });

  if (a.hi || a.lo)
    return convict(4, `<b>${a.hi ? `${a.area} &gt; 900` : `${a.area} &lt; 200`}</b> — outside the allowed band, so this is spam. Both bounds are <i>strict</i>: 200 and 900 themselves are allowed, which official case 1 (area <b>200</b>) is there to prove. <code class='inl'>+area</code> converts the string to a number for the comparison — safe because the regex has already guaranteed exactly three digits, so there is no stray length to fool it.`, "area", `+area > 900 || +area < 200`);
  S(4, `<b>${a.area}</b> is inside <b>200 … 900</b>${a.area === "900" || a.area === "200" ? ` — on the edge, and the edge is allowed, since the test is strict` : ``}. Falls through. The two comparisons are one condition because the statement describes one band: spam outside it, on either side.`,
    { focus: "area", eval: { expr: `+area > 900 || +area < 200`, val: false } });

  S(5, `Add the first three local digits: <b>${[...a.first].join(" + ")} = ${a.sum}</b>. The spread splits the string into characters and <code class='inl'>Number(d)</code> turns each back into a digit; with a <code class='inl'>0</code> seed this cannot go wrong. The sum can be <b>one or two digits</b> — nine for 234, twenty-seven for 999 — and that decides how the next line has to compare it.`, { focus: "sum", changed: ["sum"] });

  if (a.at >= 0)
    return convict(6, `<b>${q(String(a.sum))}</b> is inside <b>${q(a.last)}</b> at position ${a.at}, so this is spam. The sum is converted to a <i>string</i> first, because "appears within the last four digits" is a substring test: <code class='inl'>String(27)</code> is the two-character unit <code class='inl'>"27"</code> and has to match as one. Searching for each of the sum's digits separately would convict a number like <code class='inl'>309-1922</code> (sum 12; has a 1 and a 2, never "12").`, "incl", `last.includes(String(sum))`);
  S(6, `<b>${q(String(a.sum))}</b> is not a substring of <b>${q(a.last)}</b>${String(a.sum).length > 1 && [...String(a.sum)].every((d) => a.last.includes(d)) ? `, even though each digit of it is in there separately — a near miss that a per-digit check would wrongly call spam` : ``}. Falls through. <code class='inl'>String(sum)</code> matters when the sum is two digits: the test is whether the sum appears as a single run.`,
    { focus: "incl", eval: { expr: `last.includes("${a.sum}")`, val: false } });

  S(7, `Glue the four digit fields together: <b>${q(a.digits)}</b>. "Ignoring the formatting characters" is an instruction about <i>where the next test looks</i>, and this is the string it looks at — the parentheses, the plus, the space and the hyphen are already gone. A run is allowed to start in one field and finish in the next, so it can only be seen after the fields are joined.`, { focus: "digits", changed: ["digits"] });

  if (a.run) {
    const split = a.country.length + a.area.length, lo = a.run.index, hi = lo + a.run[0].length;
    const cross = lo < split && hi > split ? ` — straddling the area code and the local number, so the separators between them would have hidden it from a regex over the raw string` : lo < a.country.length && hi > a.country.length ? ` — straddling the country code and the area code` : ``;
    return convict(8, `<b>${q(a.run[0])}</b> — digit <b>${a.run[0][0]}</b> repeats <b>${a.run[0].length}</b> times in a row${cross}. <code class='inl'>(\\d)\\1{3}</code> reads "a digit, then the same digit three more times": the group captures it and <code class='inl'>\\1</code> is a backreference to that capture, which is how "the same digit" is said in a regex without writing out ten alternatives.`, "run", `/(\\d)\\1{3}/.test(digits)`);
  }
  S(8, `No digit appears four times running in <b>${q(a.digits)}</b>. <code class='inl'>(\\d)\\1{3}</code> reads "a digit, then the same digit three more times": the group captures one digit and <code class='inl'>\\1</code> refers back to it, so it matches 4 or more and needs no loop to count them. Three in a row is allowed, so a pair like <code class='inl'>555</code> is fine.`,
    { focus: "run", eval: { expr: `/(\\d)\\1{3}/.test(digits)`, val: false } });

  S(9, `<b>Return false.</b> All four tripwires stayed quiet, so this is the only path that read every field: the country code, the area code, the sum and the stripped digits. Every spam answer can exit early, but a clean one has to pass <i>all four</i> tests to earn its <code class='inl'>false</code> — the one place where the order of the rules costs real work.`,
    { done: true, result: "false", ret: { value: false } });
  return steps;
}

export default {
  n: 48, id: "spam", title: "Spam Detector", dates: ["2025-09-27"],
  statement: `Given a phone number in the format <code class="inl">"+A (BBB) CCC-DDDD"</code> — <code class="inl">A</code> the country code (any number of digits), <code class="inl">BBB</code> the three-digit area code, <code class="inl">CCC</code> and <code class="inl">DDDD</code> the local number — return whether it is <b>spam</b>: the country code is <b>more than 2 digits</b> or <b>doesn't begin with 0</b>; the area code is <b>above 900</b> or <b>below 200</b>; the <b>sum of the first three local digits appears within the last four</b>; or the number has the <b>same digit four or more times in a row</b>, ignoring the formatting. <span class="rule">Example: <code class="inl">isSpam("+0 (555) 135-0192")</code> → <code class="inl">true</code> — 1 + 3 + 5 = 9, and 9 is in <code class="inl">0192</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — four short tests",
      approach: `Four criteria, any one of which convicts, so the solution is four tests joined by <code class='inl'>||</code> — nothing to search and nothing to optimise. The work is in reading each one literally. <b>Country code:</b> spam if longer than two digits <i>or</i> not starting with 0, so <code class='inl'>+0</code> and <code class='inl'>+00</code> are fine while <code class='inl'>+091</code> (too long) and <code class='inl'>+1</code> (wrong first digit) are not — the two official cases that each hit one half. <b>Area code:</b> strictly above 900 or strictly below 200, so the boundary values are allowed; official case 1 pins 200, and the upper edge is one of our presets. <b>The sum:</b> add the first three local digits and look for the result <i>as a substring</i> of the last four. The sum can be two digits (999 gives <b>27</b>), so it is compared as text, and it must appear whole — the 309-1922 preset has sum <b>12</b> and a last four holding a 1 and a 2 but no "12", which a per-digit check would convict. <b>The run:</b> four or more of the same digit, "ignoring the formatting" — so the test runs on the digits with every separator removed. Official <code class='inl'>+0 (555) 564-1987</code> is the case this exists for: its digits are <b>0 555 5 64</b>, a run of four 5s that straddles the area code and the local number. On the raw string it reads <code class='inl'>555) 5</code> and never matches. Click through all eight official cases: each of the four rules is the <i>only</i> reason for at least one of them, and two are clean. Four more presets are ours — the upper area-code boundary, the near miss, a two-digit sum, and a run that sits inside the local number.`,
      code: `// Any one of four rules convicts, so the answer is four tests joined by ||.
function isSpam(number: string): boolean {
  // The format is fixed: any number of country digits, then 3 / 3 / 4.
  const [, country, area, first, last] = number.match(/^\\+(\\d+) \\((\\d{3})\\) (\\d{3})-(\\d{4})$/)!;
  // The sum can be two digits (9 + 9 + 9 = 27), so compare it as text.
  const sum = [...first].reduce((a, d) => a + Number(d), 0);
  return (
    // 1. more than two digits, OR not starting with 0 ("+0" and "+00" are fine)
    country.length > 2 || country[0] !== "0" ||
    // 2. strictly outside 200..900 — 200 and 900 themselves are allowed
    +area > 900 || +area < 200 ||
    // 3. the sum appears as a substring of the last four digits
    last.includes(String(sum)) ||
    // 4. four of the same digit in a row, over the digits with formatting removed:
    //    a run may straddle fields, e.g. the 555|5 of "+0 (555) 564-1987"
    /(\\d)\\1{3}/.test(country + area + first + last)
  );
}`,
      mount,
    },
    {
      name: "Step through", cost: "four tripwires, early exit",
      approach: `The four rules unrolled into four <code class='inl'>if … return true</code> lines, in the order the statement lists them, so a spam answer stops at the first rule that fires and the trace shows <i>which one</i>. The <b>digits</b> panel is the formatting-free string that line 8 reads. Start on <b>+0 (555) 564-1987</b> — official — which sails past lines 3, 4 and 6 and is convicted on line 8 by a run that straddles two fields. <b>+0 (555) 135-0192</b> is convicted one rule earlier, by the sum on line 6; <b>+0 (200) 234-0182</b> clears all four and is the only path that reaches <b>return false</b>. <b>+0 (900) 234-0182</b> and <b>+0 (555) 309-1922</b> are ours: the upper boundary and a near miss on the sum. Type any number in the <code class='inl'>+A (BBB) CCC-DDDD</code> shape. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "number =", value: "+0 (555) 564-1987", presets: CASES, hint: "+A (BBB) CCC-DDDD" },
      }),
    },
  ],
} satisfies Challenge;
