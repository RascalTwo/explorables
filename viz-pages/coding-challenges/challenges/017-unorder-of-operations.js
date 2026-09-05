// #17 · Unorder of Operations — a running accumulator, and one modulo for the ops.
// "Left-to-right ignoring precedence" is the whole problem: the moment you build an
// expression and hand it to anything that knows what * means, you get the wrong
// answer. Fold instead — acc = op(acc, next) — and precedence never exists.
// The second clause, "repeat the operators as needed", is not a second loop either:
// operators[(i - 1) % operators.length] cycles them, and it also quietly covers the
// case of more operators than gaps, where the cycle simply never wraps.
import { el, mountDebugger } from "../shared.js";

// The five official freeCodeCamp cases, then three of ours. The first invented one
// is the statement's OWN worked example, which the grader does not test: it is the
// only case where left-to-right and normal precedence differ by a lot (65 vs 27).
// [2,3,4] with + and * is the smallest input that separates the two readings at all.
// [42] with one operator never enters the loop — the accumulator is already the
// answer, and no official case has fewer than four numbers.
const OFFICIAL = [
  { nums: [5, 6, 7, 8, 9], ops: ["+", "-"] },
  { nums: [17, 61, 40, 24, 38, 14], ops: ["+", "%"] },
  { nums: [20, 2, 4, 24, 12, 3], ops: ["*", "/"] },
  { nums: [11, 4, 10, 17, 2], ops: ["*", "*", "%"] },
  { nums: [33, 11, 29, 13], ops: ["/", "-"] },
];
const PRESETS = [
  ...OFFICIAL,
  { nums: [1, 2, 3, 4, 5], ops: ["+", "*"] },
  { nums: [2, 3, 4], ops: ["+", "*"] },
  { nums: [42], ops: ["+"] },
];

const APPLY = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => a % b,
};
const num = (x) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(6)));

function fold(nums, ops) {
  const steps = [];
  let acc = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const oi = (i - 1) % ops.length;
    const op = ops[oi];
    const before = acc;
    acc = APPLY[op](acc, nums[i]);
    steps.push({ i, oi, op, before, rhs: nums[i], after: acc });
  }
  return { acc, steps };
}

// What the SAME expression comes to under ordinary precedence — the number the
// problem is defined by not being. Two passes: * / % first, then + -.
function standardEval(nums, ops) {
  const vals = [nums[0]], gaps = [];
  for (let i = 1; i < nums.length; i++) { gaps.push(ops[(i - 1) % ops.length]); vals.push(nums[i]); }
  const v = [vals[0]], o = [];
  for (let i = 0; i < gaps.length; i++) {
    const op = gaps[i], b = vals[i + 1];
    if (op === "*" || op === "/" || op === "%") v.push(APPLY[op](v.pop(), b));
    else { o.push(op); v.push(b); }
  }
  let acc = v[0];
  for (let i = 0; i < o.length; i++) acc = APPLY[o[i]](acc, v[i + 1]);
  return acc;
}

const expr = (nums, ops) => nums.map((n, i) => (i ? ` ${ops[(i - 1) % ops.length]} ${n}` : String(n))).join("");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .uo-wrap { display:flex; flex-direction:column; gap:13px; }
    .uo-expr { font:15px var(--mono); color:var(--text); background:var(--panel); border:1px solid var(--border); border-radius:9px; padding:9px 11px; word-break:break-word; }
    .uo-expr .op { color:var(--accent); font-weight:800; }
    .uo-ring { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .uo-op { min-width:34px; text-align:center; font:800 15px var(--mono); border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:4px 8px; color:var(--muted); }
    .uo-op .ix { display:block; font:10px var(--mono); opacity:.6; font-weight:600; }
    .uo-op.used { color:var(--accent); border-color:var(--accent); }
    .uo-tape { display:flex; flex-wrap:wrap; align-items:center; gap:5px; }
    .uo-acc { font:800 15px var(--mono); border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:5px 10px; }
    .uo-acc.seed { border-color:var(--accent); color:var(--accent); }
    .uo-acc.final { border-color:var(--good); color:var(--good); }
    .uo-arrow { display:flex; flex-direction:column; align-items:center; font:11px var(--mono); color:var(--muted); }
    .uo-arrow b { color:var(--accent); font-size:13px; }
    .uo-vs { display:flex; gap:18px; flex-wrap:wrap; font:13px var(--sans); color:var(--muted); align-items:baseline; }
    .uo-vs b { font:800 22px var(--mono); }
  `));
}

const parseNums = (s) => s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
const parseOps = (s) => s.split(/[,\s]+/).map((x) => x.trim()).filter((x) => x in APPLY);

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inN = el("input"); inN.type = "text"; inN.value = "1, 2, 3, 4, 5"; inN.style.width = "230px";
  const inO = el("input"); inO.type = "text"; inO.value = "+, *"; inO.style.width = "110px";
  ctl.append(el("span", "ctl-label", "numbers"), inN, el("span", "ctl-label", "operators"), inO);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `[${p.nums.join(",")}] ${p.ops.join("")}`);
    c.onclick = () => { inN.value = p.nums.join(", "); inO.value = p.ops.join(", "); render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inN.oninput = inO.oninput = render;
  render();

  function render() {
    const nums = parseNums(inN.value), ops = parseOps(inO.value);
    out.innerHTML = "";
    if (!nums.length || !ops.length) {
      out.append(el("div", "note", "Give at least one number and one operator from <code class='inl'>+ - * / %</code>."));
      return;
    }
    const r = fold(nums, ops);
    const std = standardEval(nums, ops);
    const wrap = el("div", "uo-wrap");

    wrap.append(el("div", "uo-expr", expr(nums, ops).replace(/ ([-+*/%]) /g, ` <span class="op">$1</span> `)));

    // The operator ring, with the ones this input actually reached lit.
    const usedIx = new Set(r.steps.map((s) => s.oi));
    const ring = el("div", "uo-ring");
    ring.append(el("span", "ctl-label", "operators cycle:"));
    ops.forEach((o, i) => ring.append(el("div", "uo-op" + (usedIx.has(i) ? " used" : ""), `${o}<span class="ix">${i}</span>`)));
    if (ops.length > r.steps.length) ring.append(el("span", "ctl-label", `— only ${r.steps.length} gap${r.steps.length === 1 ? "" : "s"}, so the cycle never wraps`));
    wrap.append(ring);

    // The tape: the accumulator, and every operator that moved it.
    const tape = el("div", "uo-tape");
    tape.append(el("div", "uo-acc seed", num(nums[0])));
    r.steps.forEach((s, k) => {
      tape.append(el("div", "uo-arrow", `<b>${s.op}</b> ${num(s.rhs)}<span>ops[${s.oi}]</span>`));
      tape.append(el("div", "uo-acc" + (k === r.steps.length - 1 ? " final" : ""), num(s.after)));
    });
    wrap.append(tape);

    wrap.append(el("div", "uo-vs",
      `<span>left-to-right <b style="color:var(--good)">${num(r.acc)}</b></span>` +
      `<span>ordinary precedence <b style="color:${r.acc === std ? "var(--muted)" : "var(--danger)"}">${num(std)}</b></span>`));

    wrap.append(el("div", "note", r.acc === std
      ? `These agree here — every operator in play has the same precedence, so there is nothing for the usual rules to reorder. That is why four of the five official cases can't tell a correct solution from one that quietly respects precedence. Try <b>[1,2,3,4,5] + *</b>.`
      : `The two differ by <b>${num(Math.abs(r.acc - std))}</b>. <code class='inl'>${expr(nums, ops)}</code> is <b>${num(std)}</b> in ordinary arithmetic and <b>${num(r.acc)}</b> read strictly left to right. Anything that builds this expression as text and evaluates it lands on the wrong one — the fold never gives precedence a chance to exist.`));
    out.append(wrap);
  }
}

// ── STEP — the fold, one operator at a time ─────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">evaluate</span>(<span class="tok" data-t="param">numbers</span>, <span class="tok" data-t="param">operators</span>) {` },
  { ln: 2, html: `  <span class="k">let</span> acc = <span class="tok" data-t="seed">numbers[<span class="nu">0</span>]</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 1; i &lt; numbers.length</span>; i++) {` },
  { ln: 4, html: `    <span class="k">const</span> op = <span class="tok" data-t="pick">operators[(i - <span class="nu">1</span>) % operators.length]</span>;` },
  { ln: 5, html: `    acc = <span class="tok" data-t="apply"><span class="fn">apply</span>(op, acc, numbers[i])</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">acc</span>;` },
  { ln: 8, html: `}` },
];

const STEP_PRESETS = PRESETS.map((p) => `${p.nums.join(",")} | ${p.ops.join(",")}`);
const splitCase = (raw) => {
  const [a = "", b = ""] = String(raw).split("|");
  const nums = parseNums(a), ops = parseOps(b);
  return { nums: nums.length ? nums : [0], ops: ops.length ? ops : ["+"] };
};

function trace(raw) {
  const { nums, ops } = splitCase(raw);
  const steps = [];
  const tape = [];
  let acc, i, op;
  const S = (line, note, x = {}) => {
    const vars = { numbers: `[${nums.join(",")}]`, operators: `[${ops.join(",")}]` };
    if (line >= 2) vars.acc = num(acc);
    if (line >= 3 && line <= 6 && i !== undefined) vars.i = i;
    if (line >= 4 && line <= 6 && op !== undefined) vars.op = `"${op}"`;
    const structs = line >= 2 ? [{ label: "evaluated so far", items: tape.slice(), newest: !!x.fresh }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `evaluate([${nums.join(",")}], [${ops.map((o) => `"${o}"`).join(",")}])`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Evaluate <b>${expr(nums, ops)}</b> — but strictly left to right, so <code class='inl'>*</code> gets no head start over <code class='inl'>+</code>. Ordinary arithmetic makes this <b>${num(standardEval(nums, ops))}</b>; that is the answer to a different question.`, { focus: "param" });
  acc = nums[0];
  tape.push(num(acc));
  S(2, `Seed the accumulator with the first number, <b>${num(acc)}</b>. Every operator from here folds one more number into it — there is never a partial expression sitting around waiting to be reordered.`, { focus: "seed", changed: ["acc"], fresh: true });

  for (i = 1; i < nums.length; i++) {
    S(3, `Number <b>${i}</b> of <b>${nums.length - 1}</b> still to fold in: <b>${num(nums[i])}</b>.`, { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} < ${nums.length}`, val: true } });
    const oi = (i - 1) % ops.length;
    op = ops[oi];
    S(4, ops.length === 1
      ? `One operator, so the cycle is trivial: <code class='inl'>(${i} − 1) % 1 = 0</code> → <b>${op}</b> every time.`
      : i - 1 < ops.length
        ? `<code class='inl'>(${i} − 1) % ${ops.length} = ${oi}</code> → <b>${op}</b>. Still on the first trip through the operator list.`
        : `<code class='inl'>(${i} − 1) % ${ops.length} = ${oi}</code> → <b>${op}</b>. The list has wrapped — this is the ${Math.floor((i - 1) / ops.length) + 1}${["st", "nd", "rd"][Math.floor((i - 1) / ops.length)] || "th"} time through it. "Repeat the operators as needed" is this one modulo, not a second loop.`,
      { focus: "pick", changed: ["op"] });
    const before = acc;
    acc = APPLY[op](acc, nums[i]);
    tape.push(`${op}${num(nums[i])}`, `=${num(acc)}`);
    S(5, `<b>${num(before)} ${op} ${num(nums[i])} = ${num(acc)}</b>${op === "%" ? ` — remainder, and it keeps the sign of the left side` : op === "/" ? ` — real division, not integer division` : ""}. The accumulator is the <i>whole</i> expression so far, already collapsed to one number, which is exactly why precedence can't apply.`,
      { focus: "apply", changed: ["acc"], fresh: true });
  }
  S(3, nums.length > 1
    ? `<b>i = ${i}</b> is past the last number — every one has been folded in.`
    : `There is only one number, so the loop body never runs and the seed is already the answer.`,
    { focus: "loop", eval: { expr: `i = ${i} < ${nums.length}`, val: false } });
  S(7, `<b>Return ${num(acc)}</b>.`, { focus: "ret", done: true, result: num(acc), ret: { value: num(acc) } });
  return steps;
}

export default {
  n: 17, id: "unorder", title: "Unorder of Operations", dates: ["2025-08-27"],
  statement: `Given an array of integers and an array of operator strings, apply the operators to the numbers <b>strictly left to right</b>, ignoring the usual order of operations, and cycle back through the operators as often as needed. Valid operators are <code class="inl">+ - * / %</code>. <span class="rule">Example: <code class="inl">[1,2,3,4,5]</code> with <code class="inl">['+','*']</code> evaluates <code class="inl">1 + 2 * 3 + 4 * 5</code> left to right → <code class="inl">65</code>, not 27.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one fold",
      approach: `Both clauses of the statement collapse into one loop. <b>"Left to right ignoring precedence"</b> is a <b>fold</b>: keep one accumulator that already <i>is</i> the whole expression so far, and there is never a pending sub-expression for precedence to reorder. This is why building the expression as a string and evaluating it is the trap — anything that parses arithmetic knows that <code class='inl'>*</code> binds tighter, and answers the wrong question. <b>"Repeat the operators as needed"</b> is <code class='inl'>operators[(i − 1) % operators.length]</code>: numbers are indexed from 1 in the loop, gaps from 0, hence the <code class='inl'>− 1</code>. The same modulo also handles more operators than gaps, where the cycle simply never wraps. Note that <code class='inl'>/</code> is real division and <code class='inl'>%</code> is a remainder that keeps the left operand's sign — no truncation anywhere.`,
      code: `type Op = "+" | "-" | "*" | "/" | "%";

function evaluate(numbers: number[], operators: string[]): number {
  const apply: Record<string, (a: number, b: number) => number> = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
    "%": (a, b) => a % b,
  };
  let acc = numbers[0];                     // the expression so far, already collapsed
  for (let i = 1; i < numbers.length; i++) {
    const op = operators[(i - 1) % operators.length];   // cycle the operators
    acc = apply[op](acc, numbers[i]);
  }
  return acc;
}`,
      mount,
    },
    {
      name: "Step through", cost: "one operator per stop",
      approach: `Watch the accumulator swallow the expression one number at a time, and the <code class='inl'>%</code> on line 4 wrap the operator list. Run the statement's own <b>[1,2,3,4,5] +*</b> — 65 left-to-right against 27 under normal precedence — then <b>[42] +</b>, where the loop never runs at all. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "case =", value: "1,2,3,4,5 | +,*", presets: STEP_PRESETS, hint: "numbers | operators" } }),
    },
  ],
};
