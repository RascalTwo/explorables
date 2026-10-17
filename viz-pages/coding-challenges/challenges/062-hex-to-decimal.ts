// #62 · Hex to Decimal — read left to right, times 16 and add; a digit is its table index.
// Same fold as #52 (Binary to Decimal) with the base changed from 2 to 16: every digit
// already read has to move one column left when the next one arrives, and one column
// left in base 16 is "times 16". Two things are new. A digit is no longer 0 or 1, so
// `Number(digit)` stops working at "A"; looking the character up in a 16-character
// string turns it into its value (the index IS the value). And the statement's own
// table is the trap — "15" is not fifteen, it is 1 * 16 + 5 = 21.
// ONE approach, deliberately. Power-sum (digit x 16^k) is the same arithmetic in the
// statement's order, and parseInt(s, 16) is a library call, not a second mental model;
// a "slower" variant could only be made so by wasting work on purpose, which is a
// strawman (CONTRIBUTING Tier 3 §1). The demo shows place value and the running total
// side by side, landing on the same number, instead.
// Click "FFFFFFFF" — ours — to see a bit-shift version go negative.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours. The
// official fixture text and its assertions agree on all five — no un-run input here.
//   "0" — ours. The smallest input; the loop body runs once and decimal stays 0.
//   "FFFFFFFF" — ours. 4,294,967,295. Fine for `n * 16 + d`; an `(n << 4) | d` version
//     treats n as a signed 32-bit integer and returns -1 here.
const CASES: string[] = ["A", "15", "2E", "FF", "A3F", "0", "FFFFFFFF"];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

// The grader's own answers, so the demo shows a verdict instead of asking for trust.
const EXPECTED: Record<string, number> = { A: 10, "15": 21, "2E": 46, FF: 255, A3F: 2623 };

const DIGITS = "0123456789ABCDEF";
const isHex = (c: string) => DIGITS.includes(c);

// The graded fold, kept verbatim so the demo cannot drift from the answer.
const solve = (hex: string) => {
  let decimal = 0;
  for (const digit of hex) decimal = decimal * 16 + DIGITS.indexOf(digit);
  return decimal;
};
// The rival that looks identical: shifts are 32-bit signed, so it wraps at 2^31.
const shifted = (hex: string) => {
  let n = 0;
  for (const d of hex) n = (n << 4) | DIGITS.indexOf(d);
  return n;
};

const fmt = (x: number) => x.toLocaleString("en-US");
const q = (s: string) => JSON.stringify(s);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .hx-wrap { display:flex; flex-direction:column; gap:11px; }
    .hx-cells { display:flex; flex-wrap:wrap; gap:4px; }
    .hx-cell { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:40px; padding:5px 4px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); font-family:var(--mono); color:var(--muted); }
    .hx-cell b { font-size:15px; color:var(--text); }
    .hx-cell .k { font-size:10px; }
    .hx-cell .v { font-size:11px; }
    .hx-cell.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 11%, transparent); }
    .hx-cell.on .v { color:var(--accent); }
    .hx-cell.bad { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .hx-cell.bad b { color:var(--danger); }
    .hx-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .hx-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .hx-r b { color:var(--text); }
    .hx-r.hot { border-color:var(--danger); color:var(--danger); }
    .hx-r.hot b { color:var(--danger); }
    .hx-run { font:12px var(--mono); color:var(--muted); overflow-wrap:anywhere; }
    .hx-run b { color:var(--accent); }
    .hx-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .hx-cmp b { font-family:var(--mono); color:var(--text); }
    .hx-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .hx-cmp.split b { color:var(--danger); }
  `,
    ),
  );
}

// The running total after each digit — the second reading of the same sum.
function runningLine(digits: string[]) {
  const seq: number[] = [];
  let n = 0;
  for (const d of digits) {
    n = n * 16 + DIGITS.indexOf(d);
    seq.push(n);
  }
  const parts = seq.map((v, i) => (i === seq.length - 1 ? `<b>${fmt(v)}</b>` : fmt(v)));
  return `running total, one digit at a time: 0 → ${parts.join(" → ")}`;
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = "A3F";
  inp.style.width = "260px";
  ctl.append(el("span", "ctl-label", "hex ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", `"${c}"`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const raw = inp.value;
    const chars = Array.from(raw);
    const bad = chars.filter((c) => !isHex(c));
    out.innerHTML = "";
    const wrap = el("div", "hx-wrap");

    const len = chars.length;
    const cells = el("div", "hx-cells");
    chars.forEach((c, i) => {
      const k = len - 1 - i;
      cells.append(
        el(
          "div",
          "hx-cell" + (!isHex(c) ? " bad" : " on"),
          `<span class="k">16<sup>${k}</sup></span><b>${esc(c)}</b>` +
            (len <= 8 && isHex(c)
              ? `<span class="v">${fmt(DIGITS.indexOf(c) * 16 ** k)}</span>`
              : ""),
        ),
      );
    });

    if (bad.length > 0) {
      wrap.append(
        el(
          "div",
          "result-line",
          `<span class="badge no">hexToDecimal("${esc(raw)}") → not a hex string</span>` +
            `<span class="more">${bad.length} character${bad.length === 1 ? "" : "s"} outside 0-9 and A-F</span>`,
        ),
        cells,
        el(
          "div",
          "note",
          `<b>${[...new Set(bad)].map((c) => `<code class='inl'>${esc(c)}</code>`).join(" ")}</b> is not a hex digit, and the statement promises it will never arrive: "only <code class='inl'>0-9</code> and <code class='inl'>A-F</code>". So the solution carries no validation, and on this input it would not fail loudly: <code class='inl'>"0123456789ABCDEF".indexOf(c)</code> returns <b>-1</b>, which is quietly subtracted into the total. Lowercase <code class='inl'>a-f</code> lands here too, since the lookup string is uppercase; <code class='inl'>parseInt(raw, 16)</code> would accept it. Trusting the spec is fine; knowing what you are trusting it about is the point.`,
        ),
      );
      out.append(wrap);
      return;
    }

    const n = solve(raw);
    const sh = shifted(raw);
    const want = EXPECTED[raw];

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || n === want ? "ok" : "no"}`,
        `hexToDecimal("${esc(raw)}") → ${fmt(n)}`,
      ),
    );
    if (want !== undefined)
      line.append(
        el(
          "span",
          "hx-cmp" + (n === want ? "" : " split"),
          n === want
            ? `matches freeCodeCamp's expected <b>${want}</b>`
            : `freeCodeCamp expects <b>${want}</b>`,
        ),
      );
    wrap.append(line, cells);
    if (len) wrap.append(el("div", "hx-run", runningLine(chars)));

    const rows = el("div", "hx-rows");
    rows.append(
      el("div", "hx-r", `times 16 and add <b>${fmt(n)}</b>`),
      el(
        "div",
        "hx-r",
        `parseInt(s, 16) <b>${fmt(len ? Number.parseInt(raw, 16) : Number.NaN)}</b>`,
      ),
      el(
        "div",
        "hx-r" + (sh !== n ? " hot" : ""),
        `(n &lt;&lt; 4) | d <b>${fmt(sh)}</b>${sh !== n ? " ✗" : ""}`,
      ),
    );
    wrap.append(rows, el("div", "note", noteFor(raw, n, sh)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Every branch names a different thing, because every
// preset was chosen to land on a different one.
function noteFor(raw: string, n: number, sh: number) {
  if (sh !== n)
    return `Same loop, one operator swapped, and a different answer: <code class='inl'>(n &lt;&lt; 4) | d</code> gives <b>${fmt(sh)}</b> where <code class='inl'>n * 16 + d</code> gives <b>${fmt(n)}</b>. JavaScript's bitwise operators silently convert their operands to <b>signed 32-bit</b> integers, so once an 8-digit value starts with 8-F the sign bit flips and the total goes negative. Shifting by 4 reads as the "obvious" way to write base 16 and passes every official case, the longest of which has three digits. Plain arithmetic stays exact up to 2<sup>53</sup>.`;
  if (/^0+$/u.test(raw))
    return `Every digit is zero, so every step is <code class='inl'>0 * 16 + 0</code> and the total never leaves <b>0</b>. It is the one input where nothing <i>happens</i>, and a solution that starts the accumulator anywhere but <b>0</b> is wrong only here. The official set has no zero.`;
  if (/^\d+$/u.test(raw))
    return `Every character is a decimal digit, and the answer is still not the number you see: <code class='inl'>"${raw}"</code> is <b>${fmt(n)}</b>, not ${fmt(Number(raw))}. The columns are worth 16, 256, 4096... instead of 10, 100, 1000... which is exactly what the cells above show. The statement's own table makes the same point, since <code class='inl'>10</code> is 16 and <code class='inl'>100</code> is 256.`;
  return `Two readings of one sum, and the cells above show both. The statement's reading is place value: each digit contributes its value times its column's weight (a power of 16) and the contributions add to <b>${fmt(n)}</b>. The code's reading is the running line: start at 0, and each new digit first moves everything already read one column left, <code class='inl'>* 16</code>, then drops itself into the 16<sup>0</sup> column. Letters need one extra step that decimal digits do not: <code class='inl'>Number("F")</code> is NaN, so the value is looked up as the character's index in <code class='inl'>"0123456789ABCDEF"</code>, where position and value are the same thing. The first digit gets multiplied ${raw.length - 1} time${raw.length === 2 ? "" : "s"}, which is how it ends up worth 16<sup>${raw.length - 1}</sup> without that power ever being computed.`;
}

// ── STEP — the fold unrolled, one digit per iteration ───────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">hexToDecimal</span>(<span class="tok" data-t="arg">hex</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="tbl">DIGITS = <span class="st">"0123456789ABCDEF"</span></span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">let</span> <span class="tok" data-t="acc">decimal = <span class="nu">0</span></span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="digit">digit</span> <span class="k">of</span> hex) {`,
  },
  {
    ln: 5,
    html: `    <span class="tok" data-t="fold">decimal = decimal * <span class="nu">16</span> + DIGITS.<span class="fn">indexOf</span>(digit)</span>;`,
  },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">decimal</span>;` },
  { ln: 8, html: `}` },
];

function trace(rawInput: string) {
  const kept = Array.from(rawInput).filter(isHex);
  const dropped = Array.from(rawInput).length - kept.length;
  const hex = kept.join("");
  const steps: DbgStep[] = [];
  let decimal = 0,
    digit = "",
    read = 0,
    inLoop = false;

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string | undefined;
      changed?: string[] | undefined;
      done?: boolean | undefined;
      result?: string | undefined;
      ret?: { value: number } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = { hex: q(hex) };
    if (line >= 2) vars["DIGITS"] = q(DIGITS);
    if (line >= 3) vars["decimal"] = decimal; // `let decimal` is line 3
    if (inLoop) vars["digit"] = q(digit); // `digit` only exists inside the loop body
    const structs =
      line >= 4 ? [{ label: "digits read", items: kept.slice(0, read), newest: true }] : [];
    steps.push({
      line,
      note,
      focus: x.focus,
      done: x.done,
      result: x.result,
      frames: [
        { title: `hexToDecimal(${q(hex)})`, vars, changed: x.changed ?? [], structs, ret: x.ret },
      ],
    });
  };

  S(
    1,
    `A string of ${kept.length} hex digit${kept.length === 1 ? "" : "s"}. The statement's recipe is place value, <b>right to left</b>: the rightmost digit times 16<sup>0</sup>, the next times 16<sup>1</sup>, and so on. This solution goes the <b>other way</b>, front to back, and never computes a power. It is the binary fold from #52 with 2 swapped for 16.${dropped ? ` The ${dropped} character${dropped === 1 ? "" : "s"} outside 0-9 and A-F in what you typed ${dropped === 1 ? "was" : "were"} dropped, since the statement promises they never arrive.` : ""}`,
    { focus: "arg" },
  );

  S(
    2,
    `The lookup table. <code class='inl'>Number("F")</code> is NaN, so a letter cannot be converted directly; instead each digit's value is its <b>index</b> in this 16-character string. <b>A</b> sits at index 10 and <b>F</b> at 15, which is the statement's table written as a string.`,
    { focus: "tbl", changed: ["DIGITS"] },
  );

  S(
    3,
    `The running total starts at <b>0</b>, the identity for the fold, so an empty string returns 0 and a leading zero (<code class='inl'>0 * 16 + 0</code>) changes nothing.`,
    { focus: "acc", changed: ["decimal"] },
  );

  for (let i = 0; i < kept.length; i++) {
    digit = kept[i]!;
    read = i + 1;
    inLoop = true;
    const v = DIGITS.indexOf(digit);
    S(
      4,
      `Digit <b>${i + 1}</b> of ${kept.length}: <b>${digit}</b>${v > 9 ? `, a letter worth ${v}` : ""}, reading <b>left to right</b>, the order the digits already sit in the string, so there is no <code class='inl'>hex.length - 1 - i</code> to get wrong.`,
      { focus: "digit" },
    );

    const prev = decimal;
    decimal = prev * 16 + v;
    const left = kept.length - 1 - i;
    S(
      5,
      `<b>${fmt(prev)} × 16 + ${v} = ${fmt(decimal)}</b>. The <code class='inl'>* 16</code> moves every digit already read one column left, since each column in base 16 is worth sixteen times the one beside it, and the <code class='inl'>+ ${v}</code> drops the new digit's value${v !== Number(digit) ? ` (<code class='inl'>indexOf("${digit}")</code>)` : ""} into the 16<sup>0</sup> column. ${
        left === 0
          ? `This was the last digit, so it is the only one that is not multiplied again.`
          : `${left} more digit${left === 1 ? "" : "s"} will multiply this one by 16, which is how it ends up worth 16<sup>${left}</sup> without that power ever being computed.`
      }`,
      { focus: "fold", changed: ["decimal"] },
    );
  }

  inLoop = false;
  S(
    7,
    `<b>Return ${fmt(decimal)}.</b> ${
      kept.length > 0
        ? `The loop ran once per digit: ${kept.length} multiplication${kept.length === 1 ? "" : "s"} and ${kept.length} lookup${kept.length === 1 ? "" : "s"}, no exponent anywhere.`
        : `The loop body never ran, so the initial 0 is the answer.`
    } Every intermediate value is a whole number below 2<sup>53</sup>, which plain arithmetic represents exactly, unlike a <code class='inl'>&lt;&lt;</code> version, which turns negative at 8 digits.`,
    { focus: "ret", done: true, result: String(decimal), ret: { value: decimal } },
  );

  return steps;
}

export default {
  n: 62,
  id: "hex-to-decimal",
  title: "Hex to Decimal",
  dates: ["2025-10-11"],
  statement: `Given a string representing a <b>hexadecimal number</b> (base 16), return its <b>decimal</b> (base 10) value as an integer. Hexadecimal uses 16 digits: <code class="inl">0-9</code> are the values <code class="inl">0</code> through <code class="inl">9</code>, and <code class="inl">A-F</code> are <code class="inl">10</code> through <code class="inl">15</code>. The string will only contain characters <code class="inl">0-9</code> and <code class="inl">A-F</code>. <span class="rule">Example: <code class="inl">hexToDecimal("FF")</code> → <code class="inl">255</code>, and <code class="inl">hexToDecimal("100")</code> → <code class="inl">256</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one multiply-and-add per digit",
      approach: `The statement's table is place value: <code class='inl'>A3F</code> is <code class='inl'>10*16² + 3*16¹ + 15*16⁰</code>. That is the right way to <i>understand</i> hex and an awkward way to <i>write</i> the loop, since it starts at the rightmost digit. Read the string <b>left to right</b> and the powers disappear: every digit already read moves one column left when the next one arrives, and one column left in base 16 is <b>times 16</b>, so the whole conversion is <code class='inl'>decimal = decimal * 16 + value</code>. That is Horner's rule, the same fold as #52 with a bigger base. The one new problem is the digit's value: <code class='inl'>Number("F")</code> is NaN, so the solution looks each character up in <code class='inl'>"0123456789ABCDEF"</code> and uses the index. The demo shows both readings of one input, place-value cells and a running total, which always land on the same number. Two things the grader does not test. <code class='inl'>parseInt(s, 16)</code> passes every case and is what you would ship, but it also accepts lowercase and stops silently at the first bad character. Writing the fold with <code class='inl'>(n &lt;&lt; 4) | d</code> looks more "hex" and also passes all five official cases, then returns <b>-1</b> for <b>FFFFFFFF</b>, because JavaScript's bitwise operators are signed 32-bit. Try the <b>"15"</b> chip too: it is 21, not 15.`,
      code: `// Read the digits front to back. Each new digit shifts everything already read one
// column left (* 16) and then lands in the 16^0 column (+ its value): Horner's rule,
// so no powers are ever computed. A digit's value is its index in the table, which
// handles A-F. Plain arithmetic, not << and |, so it stays exact past 32 bits.
function hexToDecimal(hex: string): number {
  const DIGITS = "0123456789ABCDEF";
  let decimal = 0;
  for (const digit of hex) {
    decimal = decimal * 16 + DIGITS.indexOf(digit);
  }
  return decimal;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "multiply and add",
      approach: `The fold unrolled, one digit per iteration, with the digits read so far shown as boxes. Start on <b>"A3F"</b>, official, and watch <code class='inl'>decimal</code> go <b>10, 163, 2,623</b>: every step is the previous total times 16 plus the new digit's value. <b>"15"</b> is official and shows decimal-looking digits meaning 21. <b>"0"</b> and <b>"FFFFFFFF"</b> are ours: the loop with nothing to do, and an 8-digit run whose final note explains why this fold does not wrap where a shift would. Type any string of 0-9 and A-F, or press <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "hex =",
            value: "A3F",
            presets: CASES,
            hint: "digits 0-9 and A-F",
          },
        }),
    },
  ],
} satisfies Challenge;
