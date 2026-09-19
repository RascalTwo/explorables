// #26 · IPv4 Validator — validate the TEXT before you validate the number.
// The obvious solution reads straight off the statement: split on ".", check there
// are four parts, check each one is between 0 and 255. It looks right and it is
// wrong on three of the seven official cases, all for one reason — Number() is far
// more forgiving than the spec. Number("01") is 1, Number("") is 0, Number(" 7 ")
// is 7, Number("0x1f") is 31; every one of those sails through a range check while
// breaking "only numeric characters" or "no leading zeros". The fix is an ordering:
// make the octet match /^(0|[1-9]\d*)$/ first — that kills empty, non-numeric and
// leading-zero in one expression — and only then does a number mean anything.
// ONE approach, deliberately. The naive Number() check is not a second approach
// but a bug (Tier 3 §1), so instead of shipping it as a variant the demo runs it
// alongside the real one on every input and shows you where the two disagree.
import { el, esc, mountDebugger } from "../shared.js";

// The 7 official freeCodeCamp cases, in the grader's order, then two of ours.
//   255.255.255.255 — the inclusive upper boundary, and the partner to the official
//     256.101.50.115: one apart, opposite answers.
//   0x1f.0.0.1 — ours, and the loudest form of the gotcha after the empty octet.
//     Number("0x1f") is 31, so a range check calls that a perfectly good octet.
// The two official leading-zero cases ("01" and "00") land on the same rung, and
// both are here because official coverage is a floor rather than because "00"
// teaches something "01" doesn't. What "00" does add is that Number("00") is 0 —
// even the harmless-looking zero slips past a check that only reads the value.
const OFFICIAL = [
  "192.168.1.1", "0.0.0.0", "255.01.50.111", "255.00.50.111",
  "256.101.50.115", "192.168.101.", "192168145213",
];
const CASES = [...OFFICIAL, "255.255.255.255", "0x1f.0.0.1"];

const OCTET = /^(0|[1-9]\d*)$/;

// The three text/number rules, resolved in order. `stop` is the index of the first
// rule that failed, or 3 if the octet is clean — everything after `stop` is a rule
// the real function never reaches.
function analyze(p) {
  const digits = /^\d+$/.test(p);
  const noLead = digits && OCTET.test(p);
  const value = Number(p);
  const inRange = noLead && value <= 255;
  const stop = !digits ? 0 : !noLead ? 1 : !inRange ? 2 : 3;
  return { p, digits, noLead, inRange, value, stop, ok: stop === 3 };
}

const solve = (ip) => { const ps = ip.split("."); return ps.length === 4 && ps.every((p) => OCTET.test(p) && Number(p) <= 255); };

// The check everybody writes first: right shape, no opinion about the text.
const naive = (ip) => { const ps = ip.split("."); return ps.length === 4 && ps.every((p) => Number(p) >= 0 && Number(p) <= 255); };

// Number() prints "NaN" for real garbage, but that is not the interesting half.
const numText = (v) => (Number.isNaN(v) ? "NaN" : String(v));

// Why did the text rule reject this octet? Name the actual character, because
// "invalid" tells the reader nothing they couldn't already see.
function whyText(p) {
  if (p === "") return `it is <b>empty</b> — a dot at the end (or two in a row) still produces a piece, just one with nothing in it`;
  const bad = [...p].find((c) => c < "0" || c > "9");
  if (bad !== undefined) return `it contains ${bad === " " ? "a <b>space</b>" : `<b>'${esc(bad)}'</b>`}, which is not a digit`;
  return `it starts with a <b>0</b> but is not the single character <code class='inl'>0</code> — that is a leading zero`;
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ip-wrap { display:flex; flex-direction:column; gap:12px; }
    .ip-parts { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .ip-part { font:700 13px var(--mono); padding:5px 9px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .ip-part.ok { border-color:var(--good); color:var(--good); }
    .ip-part.bad { border-color:var(--danger); color:var(--danger); }
    .ip-part.empty { border-color:var(--danger); color:var(--danger); border-style:dashed; }
    .ip-dot { font:700 15px var(--mono); color:var(--muted); }
    .ip-rows { display:flex; flex-direction:column; gap:4px; }
    .ip-row { display:grid; grid-template-columns:28px 104px 1fr 132px; align-items:center; gap:9px; padding:5px 9px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); }
    .ip-row.bad { border-color:color-mix(in srgb, var(--danger) 55%, var(--border)); }
    .ip-row .idx { font:11px var(--mono); color:var(--muted); }
    .ip-row .oct { font:700 13px var(--mono); }
    .ip-row.bad .oct { color:var(--danger); }
    .ip-row .co { font:12px var(--mono); color:var(--muted); text-align:right; }
    .ip-checks { display:flex; flex-wrap:wrap; gap:5px; }
    .ip-naive { font:12px var(--sans); color:var(--muted); padding:5px 10px; border-radius:8px; border:1px dashed var(--border); }
    .ip-naive b { font-family:var(--mono); color:var(--text); }
    .ip-naive.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .ip-naive.split b { color:var(--danger); }
  `));
}

const pill = (label, state) => `<span class="cand${state}">${label}</span>`;
const RULES = ["digits only", "no leading 0", "≤ 255"];

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "192.168.101."; inp.style.width = "260px";
  ctl.append(el("span", "ctl-label", "address"), inp);
  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach((v) => { const c = el("button", "chip", v); c.onclick = () => { inp.value = v; render(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const ip = String(inp.value);
    const parts = ip.split(".");
    const rows = parts.map(analyze);
    const gate = parts.length === 4;
    const valid = gate && rows.every((r) => r.ok);
    const naiveSays = naive(ip);
    out.innerHTML = "";
    const wrap = el("div", "ip-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${valid ? "ok" : "no"}">isValidIPv4("${esc(ip)}") → ${valid}</span>` +
      `<span class="ip-naive${naiveSays === valid ? "" : " split"}">the <b>Number()</b> check says <b>${naiveSays}</b>${naiveSays === valid ? " too" : " — it disagrees"}</span>`));

    const strip = el("div", "ip-parts");
    parts.forEach((p, i) => {
      if (i) strip.append(el("span", "ip-dot", "."));
      const cls = "ip-part" + (!gate ? "" : p === "" ? " empty" : rows[i].ok ? " ok" : " bad");
      strip.append(el("span", cls, `"${esc(p)}"`));
    });
    strip.append(el("span", "more", `split(".") → ${parts.length} part${parts.length === 1 ? "" : "s"}`));
    wrap.append(strip);

    if (gate) {
      const list = el("div", "ip-rows");
      rows.forEach((r, i) => {
        const checks = RULES.map((label, k) =>
          pill(label, k < r.stop ? " pass" : k === r.stop ? " fail" : "")).join("");
        list.append(el("div", "ip-row" + (r.ok ? "" : " bad"),
          `<span class="idx">#${i + 1}</span><span class="oct">"${esc(r.p)}"</span>` +
          `<span class="ip-checks">${checks}</span>` +
          `<span class="co">Number() → ${numText(r.value)}</span>`));
      });
      wrap.append(list);
      wrap.append(el("div", "muted", `The greyed-out rules are the ones that were never reached — the first failure returns immediately. The <b>Number()</b> column is what a range check would have seen instead.`));
    }

    wrap.append(el("div", "note", noteFor(ip, parts, rows, gate, valid, naiveSays)));
    out.append(wrap);
  }
}

function noteFor(ip, parts, rows, gate, valid, naiveSays) {
  if (!gate) {
    return parts.length === 1
      ? `There is no dot anywhere in <b>"${esc(ip)}"</b>, so <code class='inl'>split(".")</code> hands back the whole string as a single piece and the length check ends it before any octet is examined. This is one of the two official failures the naive check also catches: no amount of forgiveness about <i>what</i> an octet contains helps when there are not four of them.`
      : `<code class='inl'>split(".")</code> produced <b>${parts.length}</b> pieces, not 4, so the shape is wrong and nothing else is looked at. Worth noticing what split did <i>not</i> do: it never rejected anything, and it happily returns empty pieces for a leading, trailing or doubled dot.`;
  }
  if (valid) {
    const maxed = rows.every((r) => r.value === 255);
    const zeros = rows.every((r) => r.value === 0);
    return `Four parts, and every one of them is digits only, free of a leading zero, and inside 0–255. ${maxed
      ? `<b>255</b> is the inclusive top — one more and the official <code class='inl'>256.101.50.115</code> case is the same address failing the last rule.`
      : zeros
        ? `The single character <code class='inl'>0</code> is explicitly allowed, which is exactly why the leading-zero rule cannot be "reject anything starting with 0" — it has to be "reject anything starting with 0 <i>that is longer than one character</i>", which is what the <code class='inl'>(0|[1-9]\\d*)</code> alternation says.`
        : `Nothing exotic here.`} The naive check agrees on this input — it agrees on <i>every</i> valid address, which is precisely why it survives casual testing and then fails the grader.`;
  }
  const i = rows.findIndex((r) => !r.ok);
  const r = rows[i];
  const naiveTook = r.value >= 0 && r.value <= 255;
  if (r.stop === 0 && r.p === "")
    return `This is the sharpest case in the whole problem. The trailing dot means <code class='inl'>split(".")</code> returns <b>four</b> pieces — the length check passes — and the fourth is <code class='inl'>""</code>. Then <code class='inl'>Number("")</code> is <b>0</b>, which is a perfectly legal octet value. So a length check plus a range check reports this address as <b>valid</b>, and it is the one official case where you can watch two correct-looking tests conspire to be wrong. Asking whether the <i>text</i> is a numeral first is what catches it: <code class='inl'>""</code> has no digits, so it never becomes a number at all.`;
  if (r.stop === 0)
    return `Octet #${i + 1} is <b>"${esc(r.p)}"</b>, and ${whyText(r.p)}. ${naiveTook
      ? `<code class='inl'>Number("${esc(r.p)}")</code> is <b>${numText(r.value)}</b> — inside 0–255, so a range check waves it through. <code class='inl'>Number</code> understands hex (<code class='inl'>0x1f</code> → 31), exponents (<code class='inl'>1e2</code> → 100) and surrounding whitespace (<code class='inl'>" 7 "</code> → 7); "only numeric characters" is a statement about characters, and only a test on characters can enforce it.`
      : `Here the naive check happens to agree, because <code class='inl'>Number("${esc(r.p)}")</code> is <b>NaN</b> and every comparison against NaN is false. That accident covers real garbage and nothing else — it is the narrow forgiveness of <code class='inl'>Number</code>, not the wide kind, that does the damage.`}`;
  if (r.stop === 1)
    return `Octet #${i + 1} is <b>"${esc(r.p)}"</b> — all digits, in range, and still invalid, because the statement forbids leading zeros. <code class='inl'>Number("${esc(r.p)}")</code> is <b>${numText(r.value)}</b>, so a range check sees a fine octet and says yes. Note that the rule is not "no zeros": <code class='inl'>0</code> on its own is allowed and <code class='inl'>${esc(r.p)}</code> is not, which is why the pattern is the alternation <code class='inl'>(0|[1-9]\\d*)</code> rather than a <code class='inl'>[1-9]</code> first character.`;
  return `Octet #${i + 1} passes both text rules — <b>"${esc(r.p)}"</b> is digits with no leading zero — and then fails on the number: <b>${numText(r.value)} &gt; 255</b>. This is the one rule that is genuinely about the value, and it is the only one the naive check gets right. Ordering matters even here: because the regex already guaranteed digits and nothing else, <code class='inl'>Number(p)</code> cannot come back as something surprising, so the comparison means what it looks like it means.`;
}

// ── STEP — the `every` unrolled into a loop, one octet and one rule at a time ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isValidIPv4</span>(<span class="tok" data-t="param">ipv4</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> parts = <span class="tok" data-t="split">ipv4.<span class="fn">split</span>(<span class="st">"."</span>)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="len">parts.length !== <span class="nu">4</span></span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="pick">p</span> <span class="k">of</span> parts) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="text">!/^(0|[1-9]\\d*)$/.<span class="fn">test</span>(p)</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="range"><span class="fn">Number</span>(p) &gt; <span class="nu">255</span></span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 9, html: `}` },
];

function trace(raw) {
  const ipv4 = String(raw);
  const steps = [];
  let parts, p, cur = -1;
  const marks = [];
  const S = (line, note, x = {}) => {
    const vars = { ipv4: `"${ipv4}"` };
    if (line >= 2 && parts) vars.parts = `[${parts.map((v) => `"${v}"`).join(", ")}]`;
    if (line >= 4 && line <= 7 && p !== undefined) vars.p = `"${p}"`;
    // `parts` is live from line 2 to the end of the call, so its panel stays put;
    // the marks fill in left to right as each octet is decided.
    const structs = line >= 2 && parts
      ? [{ label: "parts", items: parts.map((v, i) => `${i === cur ? "▶ " : ""}"${v}"${marks[i] || ""}`) }]
      : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `isValidIPv4("${ipv4}")`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };
  const FALSE = (line, focus, note) => S(line, note, { focus, done: true, result: "false", ret: { value: false } });

  S(1, `Is <b>"${esc(ipv4)}"</b> a valid IPv4 address? Four rules: four parts, digits only, no leading zeros, 0–255. Three of the four are about the <b>text</b> and only the last one is about the number — which is the order the code has to check them in.`, { focus: "param" });

  parts = ipv4.split(".");
  S(2, `<code class='inl'>split(".")</code> cuts the string into <b>${parts.length}</b> piece${parts.length === 1 ? "" : "s"}. Notice what it does <i>not</i> do: it rejects nothing, and a dot with nothing after it still yields a piece — an <b>empty</b> one. Every rule below has to be enforced by hand.`, { focus: "split", changed: ["parts"] });

  const shaped = parts.length === 4;
  S(3, shaped
    ? `<b>${parts.length} === 4</b>, so the shape is right. Necessary, and nowhere near sufficient — <code class='inl'>"192.168.101."</code> has four parts too, and the fourth is <code class='inl'>""</code>.`
    : `<b>${parts.length} ≠ 4</b>${parts.length === 1 ? ` — there is no dot in the string at all, so the whole thing came back as one piece` : ""}. Nothing else needs checking.`,
    { focus: "len", eval: { expr: `parts.length = ${parts.length} !== 4`, val: !shaped } });
  if (!shaped) { FALSE(3, "len", `<b>Return false.</b> The length check is the one rule a naive <code class='inl'>Number()</code> solution also gets right, because it never looks at an octet to do it.`); return steps; }

  for (let i = 0; i < parts.length; i++) {
    cur = i; p = parts[i];
    S(4, `Octet <b>#${i + 1}</b> of 4: <b>"${esc(p)}"</b>. Each one is checked on its own and the first failure returns immediately.`, { focus: "pick", changed: ["p"] });

    const textOk = OCTET.test(p);
    const n = Number(p);
    const naiveTook = n >= 0 && n <= 255;
    S(5, textOk
      ? `The pattern accepts <b>"${esc(p)}"</b>: an octet is either the single character <code class='inl'>0</code> or a run of digits starting 1–9. Empty, non-numeric and leading-zero are all rejected by this one expression, which is why it can run <i>before</i> anything is converted to a number.`
      : `The pattern rejects <b>"${esc(p)}"</b> — ${whyText(p)}. ${naiveTook
          ? `And here is the trap: <code class='inl'>Number("${esc(p)}")</code> is <b>${numText(n)}</b>, comfortably inside 0–255. Check the range and skip the text and this octet passes.`
          : `<code class='inl'>Number("${esc(p)}")</code> is <b>NaN</b> here, so a range check would have caught this one by accident — that accident does not extend to <code class='inl'>""</code>, <code class='inl'>"01"</code> or <code class='inl'>"0x1f"</code>.`}`,
      { focus: "text", eval: { expr: `/^(0|[1-9]\\d*)$/.test("${p}")`, val: textOk } });
    if (!textOk) {
      marks[i] = " ✗";
      FALSE(5, "text", `<b>Return false</b> at octet #${i + 1}. The text rule fired before the number rule ever ran, which is the entire fix — ${naiveTook ? `reverse the two and this address is reported <b>valid</b>.` : `and it keeps the range check honest for the octets that do get there.`}`);
      return steps;
    }

    const over = n > 255;
    S(6, over
      ? `<code class='inl'>Number("${esc(p)}")</code> is <b>${n}</b>, above the maximum. This is the one rule that is genuinely about the value.`
      : `<code class='inl'>Number("${esc(p)}")</code> is <b>${n}</b>, inside 0–255. The pattern already guaranteed there is nothing here but digits, so this conversion cannot surprise us — no hex, no exponent, no whitespace. That is what makes the comparison mean what it looks like it means.`,
      { focus: "range", eval: { expr: `Number("${p}") = ${n} > 255`, val: over } });
    if (over) { marks[i] = " ✗"; FALSE(6, "range", `<b>Return false</b> at octet #${i + 1}. <b>${n}</b> is one of the failures a range check catches on its own — the official <code class='inl'>256.101.50.115</code> is exactly this, and it is why the naive solution looks like it works.`); return steps; }
    marks[i] = " ✓";
  }

  cur = -1;
  S(8, `All four octets cleared all four rules. <b>Return true.</b> The order was the whole thing: text first, so that by the time a number is read it is known to be nothing but digits.`,
    { focus: null, done: true, result: "true", ret: { value: true } });
  return steps;
}

export default {
  n: 26, id: "ipv4", title: "IPv4 Validator", dates: ["2025-09-05"],
  statement: `Given a string, decide whether it is a valid <b>IPv4</b> address: four integers separated by dots, each between <b>0 and 255</b> inclusive, with <b>no leading zeros</b> (<code class="inl">0</code> is allowed, <code class="inl">01</code> is not) and <b>only numeric characters</b>. <span class="rule">Example: <code class="inl">isValidIPv4("192.168.1.1")</code> → <code class="inl">true</code>, but <code class="inl">isValidIPv4("255.01.50.111")</code> → <code class="inl">false</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one regex per octet",
      approach: `Read the three bullets and the obvious code writes itself: split on <code class='inl'>"."</code>, insist on four parts, then test each part with <code class='inl'>Number(p) &gt;= 0 &amp;&amp; Number(p) &lt;= 255</code>. That version fails <b>three of the seven</b> official cases, and it fails all three the same way — <code class='inl'>Number</code> is far more permissive than the statement. <code class='inl'>Number("01")</code> is <b>1</b>, <code class='inl'>Number("")</code> is <b>0</b>, <code class='inl'>Number(" 7 ")</code> is <b>7</b>, <code class='inl'>Number("0x1f")</code> is <b>31</b>; each one lands inside 0–255 while breaking "only numeric characters" or "no leading zeros". The worst of them is <code class='inl'>"192.168.101."</code>: the trailing dot yields <b>four</b> parts, so the length check passes, and the fourth is <code class='inl'>""</code>, which numbers to 0 — two reasonable-looking tests agreeing on the wrong answer. The fix is not another special case but an <b>ordering</b>. Check the text first with <code class='inl'>/^(0|[1-9]\\d*)$/</code>: an octet is either the single character <code class='inl'>0</code> or digits beginning 1–9, which rejects empty, non-numeric and leading-zero in one expression. Only after that does <code class='inl'>Number(p) &lt;= 255</code> mean anything — and note the alternation, not a bare <code class='inl'>[1-9]</code>, because <code class='inl'>0.0.0.0</code> is a valid address. Type an address of your own and watch the two verdicts diverge.`,
      code: `// Validate the TEXT before you validate the number.
function isValidIPv4(ipv4: string): boolean {
  const parts = ipv4.split(".");
  if (parts.length !== 4) return false;
  // ^(0|[1-9]\\d*)$ rejects "", "01" and "0x1f" in one expression: an octet is
  // either the single character 0, or digits starting 1-9. Only once that holds
  // does the range check mean anything — Number("") is 0 and Number("01") is 1,
  // so a length check plus a range check calls "192.168.101." a valid address.
  return parts.every((p) => /^(0|[1-9]\\d*)$/.test(p) && Number(p) <= 255);
}`,
      mount,
    },
    {
      name: "Step through", cost: "one rule at a time",
      approach: `The <code class='inl'>every</code> unrolled into a loop so each octet meets each rule separately. Start on <b>192.168.101.</b> and watch the length check pass on a four-part split whose last part is <code class='inl'>""</code>. Then <b>255.01.50.111</b>, where the octet is in range and rejected anyway, and <b>0x1f.0.0.1</b> — ours, not freeCodeCamp's — where <code class='inl'>Number</code> quietly reads hex. <b>256.101.50.115</b> is the contrast: the one official failure that a range check alone would have caught. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "address =", value: "192.168.101.", presets: CASES, hint: "any string" } }),
    },
  ],
};
