// #308 · Credit Card Validator — the Luhn digit-doubling walk, boxed.
import { el, mountDebugger } from "../shared.js";

function mountLuhn(host) {
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "4532015112830366"; inp.style.width = "240px";
  ctl.append(el("span", "ctl-label", "card number"), inp);
  const presets = el("div", "controls");
  // All 7 official freeCodeCamp cases. The first three are the near-miss triple —
  // …366 / …367 / …368 differ by one digit and are kept adjacent on purpose.
  [
    ["4532015112830366", true], ["4532015112830367", false], ["4532015112830368", false],
    ["371449635398431", true], ["5425233430109903", true], ["6011111111111117", true],
    ["1234567890123456", false],
  ].forEach(([v, ok]) => {
    const c = el("button", "chip " + (ok ? "good" : "bad"), v.slice(0, 4) + "…" + v.slice(-4));
    c.onclick = () => { inp.value = v; render(); }; presets.append(c);
  });
  const out = el("div");
  host.append(ctl, presets, out);

  function render() {
    const num = inp.value.replace(/\D/g, "");
    const digits = [...num].map(Number);
    const N = digits.length;
    let sum = 0;
    const boxes = digits.map((d, i) => {
      const fromRight = N - 1 - i;
      const doubled = fromRight % 2 === 1;
      let val = d;
      if (doubled) { val = d * 2; if (val > 9) val -= 9; }
      sum += val;
      return { d, val, doubled };
    });
    const ok = num.length > 0 && sum % 10 === 0;
    out.innerHTML = "";
    const dRow = el("div", "digits");
    boxes.forEach(b => {
      const box = el("div", "dbox" + (b.doubled ? " dbl" : ""));
      box.innerHTML = `<div class="x">${b.doubled ? "×2" + (b.d * 2 > 9 ? "−9" : "") : ""}</div><div class="d">${b.d}</div><div class="x">${b.doubled ? "→" + b.val : ""}</div>`;
      dRow.append(box);
    });
    out.append(dRow);
    out.append(el("div", "result-line",
      `<span class="muted">sum =</span> <span class="num">${sum}</span>` +
      `<span class="muted mono">${sum} mod 10 = ${sum % 10}</span>` +
      `<span class="badge ${ok ? "ok" : "no"}">${ok ? "✓ valid" : "✗ invalid"}</span>`));
    out.append(el("div", "note", "Outlined digits are every second one counting from the right. Double them; if the result is two digits, subtract 9 (same as summing the two digits). The card is valid when the grand total is a multiple of 10."));
  }
  inp.oninput = render; render();
}

// ── STEP — the Luhn walk as a line-by-line debugger (single frame) ───────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">isValidCard</span>(<span class="tok" data-t="param">number</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> digits = [...number].<span class="fn">map</span>(Number).<span class="fn">reverse</span>();` },
  { ln: 3,  html: `  <span class="k">let</span> sum = 0;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">let</span> i = 0; <span class="tok" data-t="cond">i &lt; digits.length</span>; i++) {` },
  { ln: 5,  html: `    <span class="k">let</span> d = digits[i];` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="odd">i % 2 === 1</span>) {` },
  { ln: 7,  html: `      d = d * 2;` },
  { ln: 8,  html: `      <span class="k">if</span> (<span class="tok" data-t="big">d &gt; 9</span>) d = d - 9;` },
  { ln: 9,  html: `    }` },
  { ln: 10, html: `    sum = sum + d;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="ret">sum % 10 === 0</span>;` },
  { ln: 13, html: `}` },
];

function trace(input) {
  const number = String(input).replace(/\D/g, "");
  const digits = [...number].map(Number).reverse();
  const steps = [];
  let sum = 0, i = 0, d = 0;
  const S = (line, note, x = {}) => {
    const iLive = line >= 4 && line <= 11;   // for-loop scope
    const dLive = line >= 5 && line <= 11;   // d declared atop the loop body
    const vars = {};
    if (line >= 3) vars.sum = sum;
    if (iLive) vars.i = i;
    if (dLive) vars.d = d;
    const structs = line >= 2 ? [{ label: "digits (right→left)", items: digits.slice() }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "isValidCard", vars, changed: x.changed || [], structs }] });
  };

  S(1, `Validate the ${digits.length}-digit number <b>${number}</b> with the Luhn checksum.`, { focus: "param" });
  S(2, `Split into digits and <b>reverse</b> — index 0 is now the rightmost (check) digit.`, {});
  S(3, `Start the running <b>sum</b> at 0.`, { changed: ["sum"] });
  for (;;) {
    const cont = i < digits.length;
    S(4, `Loop check — i = ${i}, ${i} &lt; ${digits.length} → <b>${cont}</b>.`, { focus: "cond", eval: { expr: `${i} < ${digits.length}`, val: cont } });
    if (!cont) break;
    d = digits[i];
    S(5, `Take the digit at position ${i}: <b>d = ${d}</b>.`, { changed: ["d"] });
    const odd = i % 2 === 1;
    S(6, `Every-second digit? <b>i % 2 === 1</b> — ${i} % 2 = ${i % 2} → <b>${odd}</b>.`, { focus: "odd", eval: { expr: `${i} % 2 = ${i % 2}`, val: odd } });
    if (odd) {
      const before = d; d = d * 2;
      S(7, `Double it: <b>d = ${before} · 2 = ${d}</b>.`, { changed: ["d"] });
      const big = d > 9;
      S(8, `Two digits? <b>d &gt; 9</b> — ${d} &gt; 9 → <b>${big}</b>.`, { focus: "big", eval: { expr: `${d} > 9`, val: big } });
      if (big) { const b2 = d; d = d - 9; S(8, `Cast it down: <b>d = ${b2} − 9 = ${d}</b> — same as adding its two digits.`, { focus: "big", changed: ["d"] }); }
    }
    const prev = sum; sum = sum + d;
    S(10, `Add to the total: <b>sum = ${prev} + ${d} = ${sum}</b>.`, { changed: ["sum"] });
    i++;
  }
  const ok = sum % 10 === 0;
  S(12, `Loop done — <b>i</b> leaves scope. Check <b>sum % 10 === 0</b> — ${sum} % 10 = ${sum % 10} → <b>${ok}</b>.`, { focus: "ret", eval: { expr: `${sum} % 10 = ${sum % 10}`, val: ok } });
  S(12, `<b>Return ${ok}</b> — the card is ${ok ? "valid ✓" : "invalid ✗"}.`, { done: true, result: ok });
  return steps;
}

export default {
  n: 308, id: "luhn", title: "Credit Card Validator", dates: ["2026-06-14"],
  statement: `Validate a card number with the Luhn checksum: from the second-to-last digit, double every other digit (subtracting 9 if over 9), sum all digits, and check divisibility by 10.`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Reverse, then double the odd-indexed digits (the every-other-from-the-right ones), cast any two-digit result down by 9, sum, and test <code class='inl'>sum % 10 === 0</code>.`,
      code: `// Luhn: walk right-to-left, double every SECOND digit, cast nines down by 9,
// sum everything, check divisibility by 10.
function isValidCard(number: string): boolean {
  const sum = [...number]
    .map(Number)
    .reverse()
    .reduce((acc, d, i) => {
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } // every 2nd from the right
      return acc + d;
    }, 0);
  return sum % 10 === 0;
}`,
      mount: mountLuhn,
    },
    // Debugger presets are deliberately NOT the official set (the demo above covers
    // all 7): "4242" is a short readable trace and "79927398713" is the canonical
    // textbook Luhn example. Free-text input reaches every official case anyway.
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for the Luhn solution — run it one line at a time. Watch the digits <b>reverse</b>, each <b>condition</b> decide whether a digit doubles, the two-digit results <b>cast down by 9</b>, and <code class='inl'>sum</code> climb in the call frame until the final <code class='inl'>sum % 10</code> test. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "card =", value: "4242", presets: ["4242", "79927398713", "1234567890123456"], hint: "digits only" } }) },
  ],
};
