// #52 · Binary to Decimal — read left to right, double and add; no powers needed.
// The statement teaches place value: rightmost digit x 2^0, next x 2^1, and so on. That
// is the right picture and the awkward program — it walks the string backwards and
// needs an exponent per digit. Run the same sum in the other direction and the powers
// vanish: every digit already read has to move one place left when the next one
// arrives, and moving left in base 2 is "times two". So `n = n * 2 + digit`, front to
// back, with no index arithmetic. That is Horner's rule, and it is the whole answer.
// The mirror problem is #53 (Decimal to Binary): there the remainders come out
// rightmost-digit-first, so that one has to build its string backwards.
// ONE approach, deliberately. Power-sum (digit x 2^k) is the same arithmetic spelled in
// the statement's order, and parseInt(s, 2) is a library call, not a second mental
// model — a "slower" variant could only be made so by wasting work on purpose, which is
// a strawman (CONTRIBUTING Tier 3 §1). The demo shows the place-value sum and the
// running double-and-add side by side, landing on the same number, instead.
// Click "2^53 + 1" or "32 ones" — ours, not freeCodeCamp's — to see where a numeric
// answer stops being exact, and where a bit-shift version quietly goes negative.
import { el, esc, mountDebugger } from "../shared.js";
import type { Challenge, DbgStep } from "../shared.js";

// The 4 official freeCodeCamp cases in the grader's order, then four of ours. The
// official fixture text and its assertions agree on all four — no un-run input here.
//   "0" — ours. The smallest input; the loop body runs once and decimal stays 0.
//   "00101" — ours. Leading zeros are legal and weightless: doubling zero is zero, so
//     they cost steps and change nothing. The official set never has one.
//   32 ones — ours. 4,294,967,295. Fine for `n * 2 + bit`; a `(n << 1) | bit` version
//     treats n as a signed 32-bit integer and returns -1 here.
//   2^53 + 1 — ours. 54 digits. A JS number cannot hold 9,007,199,254,740,993; the
//     answer rounds to ...992 and nothing complains. Real, but outside what the grader
//     (or the problem's "return a number") asks for, so it is a note and not a fix.
const CASES: { s: string; label?: string }[] = [
  { s: "101" }, { s: "1010" }, { s: "10010" }, { s: "1010101" },
  { s: "0" }, { s: "00101" },
  { s: "1".repeat(32), label: "32 ones" },
  { s: "1" + "0".repeat(52) + "1", label: "2^53 + 1" },
];
const OFFICIAL = 4; // CASES[0..3] are freeCodeCamp's; the rest are ours.

// The grader's own answers, so the demo shows a verdict instead of asking for trust.
const EXPECTED: Record<string, number> = { "101": 5, "1010": 10, "10010": 18, "1010101": 85 };

// The graded fold, kept verbatim so the demo cannot drift from the answer.
const solve = (binary: string) => { let n = 0; for (const bit of binary) n = n * 2 + Number(bit); return n; };
// The rival that looks identical: shifts are 32-bit signed, so it wraps at 2^31.
const shifted = (binary: string) => { let n = 0; for (const bit of binary) n = (n << 1) | Number(bit); return n; };
// Exact, for any length — what a double is compared against.
const exact = (binary: string) => BigInt("0b" + (binary || "0"));

const fmt = (x: number | bigint) => x.toLocaleString("en-US");
const isBit = (c: string) => c === "0" || c === "1";
const q = (s: string) => JSON.stringify(s);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bd-wrap { display:flex; flex-direction:column; gap:11px; }
    .bd-cells { display:flex; flex-wrap:wrap; gap:4px; }
    .bd-cell { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:34px; padding:5px 4px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); font-family:var(--mono); color:var(--muted); }
    .bd-cell b { font-size:15px; color:var(--text); }
    .bd-cell .k { font-size:10px; }
    .bd-cell .v { font-size:11px; }
    .bd-cell.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 11%, transparent); }
    .bd-cell.on .v { color:var(--accent); }
    .bd-cell.bad { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .bd-cell.bad b { color:var(--danger); }
    .bd-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .bd-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .bd-r b { color:var(--text); }
    .bd-r.hot { border-color:var(--danger); color:var(--danger); }
    .bd-r.hot b { color:var(--danger); }
    .bd-run { font:12px var(--mono); color:var(--muted); overflow-wrap:anywhere; }
    .bd-run b { color:var(--accent); }
    .bd-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .bd-cmp b { font-family:var(--mono); color:var(--text); }
    .bd-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .bd-cmp.split b { color:var(--danger); }
  `));
}

// The running total after each digit — the second reading of the same sum. Long
// strings elide the middle: the first few and last few carry the idea.
function runningLine(bits: string[]) {
  const seq: number[] = []; let n = 0;
  for (const b of bits) { n = n * 2 + Number(b); seq.push(n); }
  const cell = (v: number, last: boolean) => (last ? `<b>${fmt(v)}</b>` : fmt(v));
  const parts = seq.length <= 14
    ? seq.map((v, i) => cell(v, i === seq.length - 1))
    : [...seq.slice(0, 6).map((v) => cell(v, false)), "…", ...seq.slice(-3).map((v, i, a) => cell(v, i === a.length - 1))];
  return `running total, one digit at a time: 0 → ${parts.join(" → ")}`;
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "1010101"; inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "binary ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", c.label ?? `"${c.s}"`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.onclick = () => { inp.value = c.s; render(); };
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const raw = String(inp.value);
    const bits = [...raw];
    const bad = bits.filter((c) => !isBit(c));
    out.innerHTML = "";
    const wrap = el("div", "bd-wrap");

    const len = bits.length;
    const cells = el("div", "bd-cells");
    bits.forEach((b, i) => {
      const k = len - 1 - i;
      const c = el("div", "bd-cell" + (!isBit(b) ? " bad" : b === "1" ? " on" : ""),
        `<span class="k">2<sup>${k}</sup></span><b>${esc(b)}</b>` +
        (len <= 12 && isBit(b) ? `<span class="v">${b === "1" ? 2 ** k : 0}</span>` : ""));
      cells.append(c);
    });

    if (bad.length) {
      wrap.append(el("div", "result-line",
        `<span class="badge no">toDecimal("${esc(raw)}") → not a binary string</span>` +
        `<span class="more">${bad.length} character${bad.length === 1 ? "" : "s"} outside 0 and 1</span>`));
      wrap.append(cells);
      wrap.append(el("div", "note", `<b>${[...new Set(bad)].map((c) => `<code class='inl'>${esc(c)}</code>`).join(" ")}</b> is not a binary digit, and the statement promises it will never arrive — "a string representing a binary number" uses only <code class='inl'>0</code> and <code class='inl'>1</code>. So the solution carries no validation, and on this input it would not fail loudly: <code class='inl'>Number("2")</code> is <b>2</b>, and a digit worth 2 in a base-2 position quietly corrupts everything to its left. <code class='inl'>parseInt(raw, 2)</code> fails the opposite way — it stops at the first bad character and returns the prefix, so <code class='inl'>"1012"</code> reads as <b>5</b>. Both are silent. Trusting the spec is fine; knowing what you are trusting it about is the point.`));
      out.append(wrap);
      return;
    }

    const n = solve(raw);
    const ex = exact(raw);
    const lost = BigInt(n) !== ex;
    const sh = shifted(raw);
    const want = EXPECTED[raw];
    const ok = want === undefined ? !lost : n === want;

    const line = el("div", "result-line");
    line.append(el("span", `badge ${ok ? "ok" : "no"}`, `toDecimal("${esc(raw)}") → ${fmt(n)}`));
    if (want !== undefined)
      line.append(el("span", "bd-cmp" + (n === want ? "" : " split"),
        n === want ? `matches freeCodeCamp's expected <b>${want}</b>` : `freeCodeCamp expects <b>${want}</b>`));
    else if (lost)
      line.append(el("span", "bd-cmp split", `the exact value is <b>${fmt(ex)}</b> — a double cannot hold it`));
    wrap.append(line);

    wrap.append(cells);
    if (len) wrap.append(el("div", "bd-run", runningLine(bits)));

    const rows = el("div", "bd-rows");
    rows.append(el("div", "bd-r", `double and add <b>${fmt(n)}</b>`));
    rows.append(el("div", "bd-r", `parseInt(s, 2) <b>${fmt(len ? parseInt(raw, 2) : NaN)}</b>`));
    rows.append(el("div", "bd-r" + (sh !== n ? " hot" : ""), `(n &lt;&lt; 1) | bit <b>${fmt(sh)}</b>${sh !== n ? " ✗" : ""}`));
    if (lost) rows.append(el("div", "bd-r hot", `exact (BigInt) <b>${fmt(ex)}</b> ✗`));
    wrap.append(rows);

    wrap.append(el("div", "note", noteFor(raw, n, ex, sh, lost)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing, because every
// preset was chosen to land on a different one.
function noteFor(raw: string, n: number, ex: bigint, sh: number, lost: boolean) {
  if (lost)
    return `The answer shown is <b>${fmt(n)}</b>; the true value of this string is <b>${fmt(ex)}</b>. A JavaScript number is a 64-bit float with 53 bits of mantissa, so past <b>2<sup>53</sup></b> it can only hold every <i>other</i> integer, and the last doubling-and-add lands on a neighbour. Nothing throws and nothing warns — the digits were all read correctly and the result is still wrong by one. The statement says "return it as a number", so this is the correct answer to <i>this</i> problem and the grader would never ask; the general fix is <code class='inl'>BigInt("0b" + s)</code>, which is exact at any length and returns a different type. Know which contract you signed.`;
  if (sh !== n)
    return `Same loop, one operator swapped, and a different answer: <code class='inl'>(n &lt;&lt; 1) | bit</code> gives <b>${fmt(sh)}</b> where <code class='inl'>n * 2 + bit</code> gives <b>${fmt(n)}</b>. JavaScript's bitwise operators silently convert their operands to <b>signed 32-bit</b> integers, so once the 32nd digit lands the sign bit flips and the total goes negative. It reads as the "obvious" way to write base 2 and it passes every official case — the longest has seven digits. Plain arithmetic is exact all the way to 2<sup>53</sup>, which is the reason to prefer it here.`;
  if (/^0+$/.test(raw))
    return `Every digit is zero, so every step is <code class='inl'>0 * 2 + 0</code> and the total never leaves <b>0</b>. It is the one input where nothing <i>happens</i>, and a solution that initialises the accumulator to anything other than <b>0</b>, or reads the first digit separately, is wrong only here. The official set has no zero.`;
  if (raw.length > 1 && raw.startsWith("0"))
    return `The leading zeros contribute nothing — <b>${raw.length - raw.replace(/^0+/, "").length}</b> of them, each worth <code class='inl'>0 * 2</code> — and the answer is the same <b>${fmt(n)}</b> as <code class='inl'>"${raw.replace(/^0+/, "")}"</code>. That is place value working as designed: a zero in a high position is a zero times a large weight. Doubling-and-adding gets this for free (doubling zero is zero), while a solution that sizes something by the string's length, or special-cases the first digit, has to remember it. The official inputs all start with a <code class='inl'>1</code>, so they never test this.`;
  return `Two readings of one sum, and the cells above show both. The statement's reading is place value: each <code class='inl'>1</code> contributes its column's weight and the weights add to <b>${fmt(n)}</b>. The code's reading is the running line: start at 0, and each new digit first moves everything already read one place left — <code class='inl'>* 2</code> — then drops itself into the 2<sup>0</sup> column. The first digit gets doubled <b>${raw.length - 1}</b> time${raw.length === 2 ? "" : "s"}, which is exactly why it ends up worth 2<sup>${raw.length - 1}</sup>; the powers were never computed, just <i>accumulated</i>. One tell you get for free: only the last digit is <i>not</i> doubled after being added, so the answer is odd exactly when the string ends in <code class='inl'>1</code> — here it ends in <code class='inl'>${raw.slice(-1)}</code> and <b>${fmt(n)}</b> is ${n % 2 ? "odd" : "even"}. Run the same idea backwards and you get #53 (Decimal to Binary), which peels digits off the right instead of folding them in from the left.`;
}

// ── STEP — the fold unrolled, one digit per iteration ───────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">toDecimal</span>(<span class="tok" data-t="arg">binary</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> <span class="tok" data-t="acc">decimal = <span class="nu">0</span></span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="bit">bit</span> <span class="k">of</span> binary) {` },
  { ln: 4, html: `    <span class="tok" data-t="fold">decimal = decimal * <span class="nu">2</span> + <span class="fn">Number</span>(bit)</span>;` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">decimal</span>;` },
  { ln: 7, html: `}` },
];

function trace(rawInput: string) {
  const text = String(rawInput);
  const kept = [...text].filter(isBit);
  const dropped = [...text].length - kept.length;
  const binary = kept.join("");
  const steps: DbgStep[] = [];
  let decimal = 0, bit = "", read = 0, inLoop = false;

  const S = (line: number, note: string, x: { focus?: string | undefined; changed?: string[] | undefined; done?: boolean | undefined; result?: string | undefined; ret?: { value: number } | undefined } = {}) => {
    const vars: Record<string, unknown> = { binary: q(binary) };
    if (line >= 2) vars["decimal"] = decimal;          // `let decimal` is line 2
    if (inLoop) vars["bit"] = q(bit);                  // `bit` only exists inside the loop body
    // The digits consumed so far appear when the loop starts and stay for the rest of
    // the call: they are the thing the running total is a summary of.
    const structs = line >= 3 ? [{ label: "digits read", items: kept.slice(0, read), newest: true }] : [];
    steps.push({ line, note, focus: x.focus, done: x.done, result: x.result,
      frames: [{ title: `toDecimal(${q(binary)})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `A string of ${kept.length} binary digit${kept.length === 1 ? "" : "s"}, and the statement's recipe is <b>right to left</b>: the rightmost digit times 2<sup>0</sup>, the next times 2<sup>1</sup>, and so on. That is how a human reads place value and it makes an awkward loop — it walks the string backwards and needs an exponent per digit. This solution goes the <b>other way</b>, front to back, and never computes a power at all. (#53, the inverse, is forced to work from the right; this one is not.)${dropped ? ` The ${dropped} character${dropped === 1 ? "" : "s"} outside 0 and 1 in what you typed ${dropped === 1 ? "was" : "were"} dropped, since the statement promises they never arrive.` : ""}`, { focus: "arg" });

  S(2, `The running total starts at <b>0</b>, and the choice is not arbitrary: it is the identity for the fold, so an empty string returns 0 and a leading zero (<code class='inl'>0 * 2 + 0</code>) changes nothing. Start anywhere else and every answer is wrong by that offset times a power of two.`, { focus: "acc", changed: ["decimal"] });

  for (let i = 0; i < kept.length; i++) {
    bit = kept[i]!; read = i + 1; inLoop = true;
    S(3, `Digit <b>${i + 1}</b> of ${kept.length}: <b>${bit}</b>, reading <b>left to right</b> — the order the digits already sit in the string, so there is no <code class='inl'>binary.length - 1 - i</code> to get wrong.`, { focus: "bit" });

    const prev = decimal;
    decimal = prev * 2 + Number(bit);
    const last = i === kept.length - 1;
    S(4, `<b>${fmt(prev)} × 2 + ${bit} = ${fmt(decimal)}</b>. The <code class='inl'>* 2</code> moves every digit already read one column left — in base 2 each column is worth twice the one beside it — and the <code class='inl'>+ ${bit}</code> drops the new digit into the 2<sup>0</sup> column. ${last
      ? `This was the last digit, so it is the only one that was <i>not</i> doubled afterwards: that is why the answer is ${decimal % 2 ? "odd" : "even"} exactly when the string ends in <code class='inl'>${bit}</code>.`
      : `After ${kept.length - 1 - i} more digit${kept.length - 1 - i === 1 ? "" : "s"} this one will have been doubled ${kept.length - 1 - i} time${kept.length - 1 - i === 1 ? "" : "s"}, which is how it ends up worth 2<sup>${kept.length - 1 - i}</sup> without that power ever being computed.`}`,
      { focus: "fold", changed: ["decimal"] });
  }

  inLoop = false;
  const ex = exact(binary);
  S(6, `<b>Return ${fmt(decimal)}.</b> ${kept.length
    ? `The loop ran once per digit — ${kept.length} multiplication${kept.length === 1 ? "" : "s"} and ${kept.length} addition${kept.length === 1 ? "" : "s"}, no exponent anywhere.`
    : `The loop body never ran, so the initial 0 is the answer.`} ${BigInt(decimal) !== ex
      ? `Careful: the exact value of this string is <b>${fmt(ex)}</b>. A JS number is exact only up to 2<sup>53</sup>, so the final doubling rounded; <code class='inl'>BigInt("0b" + binary)</code> is the fix when length is unbounded, and the statement's "return a number" says it is not.`
      : `It is also exact: every intermediate value is a whole number below 2<sup>53</sup>, which plain arithmetic represents without error — unlike a <code class='inl'>&lt;&lt;</code> version, which turns negative at 32 digits.`}`,
    { focus: "ret", done: true, result: String(decimal), ret: { value: decimal } });

  return steps;
}

export default {
  n: 52, id: "to-decimal", title: "Binary to Decimal", dates: ["2025-10-01"],
  statement: `Given a string representing a <b>binary number</b>, return its <b>decimal</b> equivalent as a number. A binary number uses only the digits <code class="inl">0</code> and <code class="inl">1</code>: multiply each digit by a power of <code class="inl">2</code>, starting with the <b>rightmost</b> digit times <code class="inl">2^0</code>, the next to the left times <code class="inl">2^1</code>, and so on, then add the results. <span class="rule">Example: <code class="inl">toDecimal("101")</code> → <code class="inl">5</code> — <code class="inl">1 * 2^2 + 0 * 2^1 + 1 * 2^0 = 4 + 0 + 1</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one double-and-add per digit",
      approach: `The statement describes <b>place value</b> — a power of 2 for each digit, summed — and that is the right way to <i>understand</i> binary, but it is an awkward way to <i>write</i> the loop: it starts at the rightmost digit, so you either reverse the string or compute <code class='inl'>binary.length - 1 - i</code> and an exponent for every digit. Read the same string <b>left to right</b> and the powers disappear. Every digit already read has to move one column left when the next one arrives, and one column left in base 2 is <b>times two</b>, so the whole conversion is <code class='inl'>decimal = decimal * 2 + digit</code>. That is Horner's rule: the sum <code class='inl'>1*2² + 0*2¹ + 1*2⁰</code> regrouped as <code class='inl'>((1)*2 + 0)*2 + 1</code>. Same arithmetic, same answer, and the exponent was never computed — it was <i>accumulated</i>, one doubling at a time. The demo shows both readings of one input: the cells are the statement's place values, the running line is the code's. They always land on the same number. Three things worth knowing that the grader does not test. <code class='inl'>parseInt(s, 2)</code> passes every case and is what you would ship, but it reads a <b>prefix</b> and stops at the first non-digit, so <code class='inl'>"1012"</code> comes back as 5 rather than failing. Writing the fold with bit shifts, <code class='inl'>(n &lt;&lt; 1) | bit</code>, looks more "binary" and is also correct on all four cases — and returns <b>-1</b> for 32 ones, because JavaScript's bitwise operators are signed 32-bit. And past 2<sup>53</sup> a number cannot represent the answer exactly at all; try the <b>2^53 + 1</b> chip. Its inverse is #53 (Decimal to Binary), which has to peel digits off the other end.`,
      code: `// Read the digits front to back. Each new digit shifts everything already read one
// column left (* 2) and then lands in the 2^0 column (+ digit): Horner's rule, so no
// powers are ever computed. Plain arithmetic, not << and |, so it stays exact (and
// positive) past 32 digits; it is exact up to 2^53, and a double cannot go further.
function toDecimal(binary: string): number {
  let decimal = 0;
  for (const bit of binary) {
    decimal = decimal * 2 + Number(bit);
  }
  return decimal;
}`,
      mount,
    },
    {
      name: "Step through", cost: "double and add",
      approach: `The fold unrolled, one digit per iteration, with the digits read so far shown as boxes. Start on <b>"1010101"</b> — official — and watch <code class='inl'>decimal</code> go <b>1, 2, 5, 10, 21, 42, 85</b>: every step is the previous total doubled plus the new digit, and the first digit ends up worth 2<sup>6</sup> after being doubled six times. <b>"101"</b> is the statement's own example. <b>"0"</b> and <b>"00101"</b> are ours — the loop with nothing to do, and leading zeros that cost steps and change nothing. <b>32 ones</b> is ours too: 32 iterations, and the final note explains why this exact fold does not wrap where a shift would. The 2^53 + 1 case is in the demo only; its trace is 108 steps. Type any string of 0s and 1s. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "binary =", value: "1010101",
                 presets: CASES.slice(0, 7).map((c) => c.s), hint: "digits 0 and 1" },
      }),
    },
  ],
} satisfies Challenge;
