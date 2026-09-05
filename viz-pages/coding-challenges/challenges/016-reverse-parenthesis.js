// #16 · Reverse Parenthesis — nesting wants a stack, not a string you keep rewriting.
// "Innermost first, then the result joins the outer reversal" is a recurrence, and
// the obvious reading of it is a rewrite loop: find the innermost pair, reverse it,
// splice it out, start over. That is correct and it re-copies the whole string once
// per pair.
// • BRUTE / rewrite the innermost pair, then rescan the string from the front.
// • OPT   / one left-to-right pass: "(" pushes a fresh buffer, ")" reverses the top
//   one and appends it to the buffer beneath. Every character is touched once.
// Flip the Approach toggle on the ten-deep preset: 210 characters copied vs 30.
import { el, esc, mountDebugger } from "../shared.js";

// The three official freeCodeCamp cases, then three of ours. "((((…))))" is the
// divergence input — ten nested pairs, so the brute makes ten full passes to the
// stack's one, and the ten reversals cancel out, which makes the wasted work the
// only thing that changed. "abc" has no parentheses at all (the brute's loop body
// never runs). "(ab)(cd)" is the only sibling case: depth returns to 0 mid-string,
// which is the shape a recursive reading handles and a "find the outermost pair"
// reading does not.
const OFFICIAL = ["(f(b(dc)e)a)", "((is?)(a(t d)h)e(n y( uo)r)aC)", "f(Ce(re))o((e(aC)m)d)p"];
const PRESETS = [...OFFICIAL, "((((((((((abcdefghij))))))))))", "(ab)(cd)", "abc"];

const rev = (t) => [...t].reverse().join("");

// BRUTE, instrumented: every pass is recorded so the demo can show the rewrite log.
function bruteRun(input) {
  let s = input, copied = 0;
  const passes = [];
  let guard = 0;
  while (s.includes("(") && guard++ < 500) {
    const close = s.indexOf(")");
    if (close < 0) break;                       // unbalanced input: bail rather than spin
    const open = s.lastIndexOf("(", close);
    if (open < 0) break;
    const inner = s.slice(open + 1, close);
    const next = s.slice(0, open) + rev(inner) + s.slice(close + 1);
    copied += s.length;
    passes.push({ from: s, open, close, inner, to: next });
    s = next;
  }
  return { out: s, passes, copied };
}

// The reference implementation, used by both demos for the answer itself.
function decodeStack(s) {
  const stack = [""];
  for (const c of s) {
    if (c === "(") stack.push("");
    else if (c === ")") { const top = stack.pop() ?? ""; stack[stack.length - 1] += rev(top); }
    else stack[stack.length - 1] += c;
  }
  return stack[0];
}

// The nesting tree, as a list of segments per level — text runs and child groups in
// the order they appeared, which is what the box view needs.
function parse(s) {
  const root = { segs: [] };
  const stack = [root];
  for (const c of s) {
    const top = stack[stack.length - 1];
    if (c === "(") { const node = { segs: [] }; top.segs.push(node); stack.push(node); }
    else if (c === ")") { if (stack.length > 1) stack.pop(); }
    else {
      const last = top.segs[top.segs.length - 1];
      if (typeof last === "string") top.segs[top.segs.length - 1] = last + c;
      else top.segs.push(c);
    }
  }
  return root;
}
const resolveNode = (node) => rev(node.segs.map((x) => (typeof x === "string" ? x : resolveNode(x))).join(""));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rp-wrap { display:flex; flex-direction:column; gap:12px; }
    .rp-log { display:flex; flex-direction:column; gap:5px; }
    .rp-pass { display:grid; grid-template-columns:auto 1fr; gap:10px; align-items:baseline; font:13px var(--mono); border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:6px 10px; }
    .rp-pass .no { color:var(--muted); font-size:11px; }
    .rp-str { word-break:break-all; }
    .rp-str .hot { background:color-mix(in srgb, var(--warn) 28%, transparent); color:var(--warn); font-weight:800; border-radius:3px; }
    .rp-str .par { color:var(--muted); }
    .rp-arrow { color:var(--muted); }
    .rp-box { display:inline-flex; align-items:center; gap:2px; border:1px solid var(--border); border-radius:7px; padding:3px 5px; margin:2px; }
    .rp-box > .lbl { font:700 9px var(--sans); color:var(--muted); align-self:flex-start; }
    .rp-txt { font:700 14px var(--mono); color:var(--text); white-space:pre; }
    .rp-res { font:12px var(--mono); color:var(--good); border-top:1px dashed var(--border); margin-top:4px; padding-top:3px; }
    .rp-outline { border:1px solid var(--border); border-radius:9px; background:var(--panel); padding:9px 11px; }
    .rp-out { font:800 20px var(--mono); color:var(--good); word-break:break-all; }
  `));
}

// Depth → one of the kit's categorical slots. Read, never redefined.
const depthColor = (d) => `var(--c${((d - 1) % 8) + 1})`;

function markup(s, open, close) {
  return [...s].map((c, i) => {
    const inPair = i >= open && i <= close;
    const cls = inPair ? "hot" : c === "(" || c === ")" ? "par" : "";
    return cls ? `<span class="${cls}">${esc(c === " " ? "␣" : c)}</span>` : esc(c === " " ? "␣" : c);
  }).join("");
}

function mountBrute(host) {
  ensureStyle();
  const { inp, out } = controls(host, render, "(f(b(dc)e)a)");
  function render() {
    const s = inp.value;
    const r = bruteRun(s);
    out.innerHTML = "";
    const wrap = el("div", "rp-wrap");
    wrap.append(el("div", "result-line",
      `<span class="badge ok">decode(${esc(JSON.stringify(s))}) → ${esc(JSON.stringify(r.out))}</span>` +
      `<span class="opcount hot"><span class="n">${r.copied.toLocaleString("en-US")}</span> characters copied</span>` +
      `<span class="opcount"><span class="n">${r.passes.length}</span> passes</span>`));
    const log = el("div", "rp-log");
    if (!r.passes.length) log.append(el("div", "note", "No parentheses, so the loop body never runs and the string is returned untouched."));
    r.passes.forEach((p, i) => {
      log.append(el("div", "rp-pass",
        `<span class="no">pass ${i + 1}</span>` +
        `<span class="rp-str">${markup(p.from, p.open, p.close)} <span class="rp-arrow">→ reverse "${esc(p.inner)}" →</span> ${esc(p.to.replace(/ /g, "␣"))}</span>`));
    });
    wrap.append(log);
    wrap.append(el("div", "note",
      r.passes.length
        ? `Each pass rewrites the <b>whole</b> string — <b>${r.passes.map((p) => p.from.length).join(" + ")}</b> = <b>${r.copied.toLocaleString("en-US")}</b> characters copied to resolve ${r.passes.length} pair${r.passes.length === 1 ? "" : "s"}. The rescan is the waste: after a pair is spliced out, everything to its left is untouched and gets searched again anyway. Flip to <b>One stack pass</b> for the same answer in ${s.length} character${s.length === 1 ? "" : "s"} of work.`
        : `The answer is the input. Worth trying, because it is the one case where the two approaches genuinely cost the same.`));
    out.append(wrap);
  }
}

function mountStack(host) {
  ensureStyle();
  const { inp, out } = controls(host, render, "((is?)(a(t d)h)e(n y( uo)r)aC)");
  function render() {
    const s = inp.value;
    const root = parse(s);
    const answer = decodeStack(s);
    out.innerHTML = "";
    const wrap = el("div", "rp-wrap");
    wrap.append(el("div", "result-line",
      `<span class="badge ok">decode(${esc(JSON.stringify(s))}) → ${esc(JSON.stringify(answer))}</span>` +
      `<span class="opcount cool"><span class="n">${s.length.toLocaleString("en-US")}</span> characters copied</span>` +
      `<span class="opcount"><span class="n">1</span> pass</span>`));

    // Every "(" is a box. A box shows its own characters in reading order and, under
    // them, what it hands upward — its contents reversed. Read the boxes inside-out
    // and you have executed the algorithm.
    const draw = (node, depth) => {
      const box = el("span", "rp-box");
      if (depth > 0) box.style.borderColor = depthColor(depth);
      const line = el("span", null);
      node.segs.forEach((seg) => {
        if (typeof seg === "string") line.append(el("span", "rp-txt", esc(seg.replace(/ /g, "␣"))));
        else line.append(draw(seg, depth + 1));
      });
      if (!node.segs.length) line.append(el("span", "rp-txt muted", "∅"));
      const col = el("span", null);
      col.style.display = "inline-flex"; col.style.flexDirection = "column";
      col.append(line);
      if (depth > 0) {
        const res = el("span", "rp-res", `⏎ ${esc(resolveNode(node).replace(/ /g, "␣")) || "∅"}`);
        res.style.color = depthColor(depth);
        col.append(res);
      }
      if (depth > 0) box.append(el("span", "lbl", String(depth)));
      box.append(col);
      return box;
    };
    const outline = el("div", "rp-outline");
    outline.append(draw(root, 0));
    wrap.append(outline);
    wrap.append(el("div", "rp-out", esc(JSON.stringify(answer))));
    wrap.append(el("div", "note",
      `Each box is one <code class='inl'>(</code>: a buffer pushed onto the stack. Its own characters accumulate in reading order; the <b>⏎</b> line under it is what the matching <code class='inl'>)</code> hands to the box outside — the buffer <b>reversed</b>. Because a child is appended to its parent <i>already reversed</i>, the parent's own reversal then flips it a second time, which is exactly what "the innermost pair first, then included in the outer reversal" describes. Nothing is ever rescanned; the nesting does the recursion for you.`));
    out.append(wrap);
  }
}

function controls(host, onChange, initial) {
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = initial; inp.style.width = "min(460px, 100%)";
  ctl.append(el("span", "ctl-label", "s ="), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", esc(v.length > 30 ? v.slice(0, 27) + "…" : v)); c.title = v; c.onclick = () => { inp.value = v; onChange(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = onChange;
  queueMicrotask(onChange);
  return { inp, out };
}

// ── STEP × 2 ────────────────────────────────────────────────────────────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">decode</span>(<span class="tok" data-t="param">s</span>) {` },
  { ln: 2, html: `  <span class="k">while</span> (<span class="tok" data-t="has">s.<span class="fn">includes</span>(<span class="st">"("</span>)</span>) {` },
  { ln: 3, html: `    <span class="k">const</span> close = <span class="tok" data-t="close">s.<span class="fn">indexOf</span>(<span class="st">")"</span>)</span>;` },
  { ln: 4, html: `    <span class="k">const</span> open = <span class="tok" data-t="open">s.<span class="fn">lastIndexOf</span>(<span class="st">"("</span>, close)</span>;` },
  { ln: 5, html: `    <span class="k">const</span> inner = <span class="tok" data-t="inner">[...s.<span class="fn">slice</span>(open + <span class="nu">1</span>, close)].<span class="fn">reverse</span>().<span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 6, html: `    s = <span class="tok" data-t="splice">s.<span class="fn">slice</span>(<span class="nu">0</span>, open) + inner + s.<span class="fn">slice</span>(close + <span class="nu">1</span>)</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">s</span>;` },
  { ln: 9, html: `}` },
];

const SRC_STACK = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">decode</span>(<span class="tok" data-t="param">s</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> stack = <span class="tok" data-t="seed">[<span class="st">""</span>]</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="char">c</span> <span class="k">of</span> s) {` },
  { ln: 4, html: `    <span class="k">if</span> (c === <span class="st">"("</span>) <span class="tok" data-t="push">stack.<span class="fn">push</span>(<span class="st">""</span>)</span>;` },
  { ln: 5, html: `    <span class="k">else</span> <span class="k">if</span> (c === <span class="st">")"</span>) {` },
  { ln: 6, html: `      <span class="k">const</span> top = <span class="tok" data-t="pop">stack.<span class="fn">pop</span>() ?? <span class="st">""</span></span>;` },
  { ln: 7, html: `      <span class="tok" data-t="merge">stack[stack.length - <span class="nu">1</span>] += [...top].<span class="fn">reverse</span>().<span class="fn">join</span>(<span class="st">""</span>)</span>;` },
  { ln: 8, html: `    } <span class="k">else</span> <span class="tok" data-t="append">stack[stack.length - <span class="nu">1</span>] += c</span>;` },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">stack[<span class="nu">0</span>]</span>;` },
  { ln: 11, html: `}` },
];

const cut = (x) => (String(x).length > 30 ? String(x).slice(0, 27) + "…" : String(x));
const show = (x) => esc(String(x).replace(/ /g, "␣"));
const box = (x) => (x === "" ? "∅" : String(x).replace(/ /g, "␣"));

function traceBrute(input) {
  const steps = [];
  let s = input, copied = 0, pass = 0;
  const S = (line, note, x = {}) => {
    const vars = { s: cut(JSON.stringify(s)) };
    if (x.close !== undefined) vars.close = x.close;
    if (x.open !== undefined) vars.open = x.open;
    if (x.inner !== undefined) vars.inner = JSON.stringify(x.inner);
    vars["copied"] = copied;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `decode(${cut(JSON.stringify(input))})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Decode <b>${show(input)}</b>. The rule is recursive — innermost pair first, its result folded into the pair around it — and the most direct way to obey it is to <b>keep rewriting the string</b> until no parentheses are left.`, { focus: "param" });
  let guard = 0;
  for (;;) {
    const has = s.includes("(") && s.includes(")");
    S(2, has
      ? `<b>${show(s)}</b> still has a <code class='inl'>(</code>, so there is at least one pair left to resolve. Pass <b>${pass + 1}</b>.`
      : `No <code class='inl'>(</code> left in <b>${show(s)}</b> — every pair has been resolved and spliced away.`,
      { focus: "has", eval: { expr: `s.includes("(")`, val: has } });
    if (!has || guard++ > 200) break;
    pass++;
    const close = s.indexOf(")");
    S(3, `The <b>first</b> <code class='inl'>)</code> is at index <b>${close}</b>. Whatever pair closes there must be an <i>innermost</i> one — nothing can have opened and closed inside it, or that <code class='inl'>)</code> would have come first.`, { focus: "close", close });
    const open = s.lastIndexOf("(", close);
    S(4, `Its partner is the <b>last</b> <code class='inl'>(</code> before it, at index <b>${open}</b>. That pair — indices <b>${open}…${close}</b> — is the one to resolve now.`, { focus: "open", close, open });
    const inner = s.slice(open + 1, close);
    S(5, `Reverse its contents: <b>${show(inner) || "∅"}</b> → <b>${show(rev(inner)) || "∅"}</b>. Because the pair is innermost, these are plain characters — no nested result is hiding inside them.`, { focus: "inner", close, open, inner });
    const next = s.slice(0, open) + rev(inner) + s.slice(close + 1);
    copied += s.length;
    S(6, `Splice it back without the parentheses: <b>${show(next)}</b>. That rebuild copies all <b>${s.length}</b> characters, including the ${open} to the left of the pair that nothing touched — and the next pass will scan straight past them again. Running total: <b>${copied}</b>.`,
      { focus: "splice", close, open, inner, changed: ["s", "copied"] });
    s = next;
  }
  S(8, `<b>Return ${esc(JSON.stringify(s))}</b> after <b>${pass}</b> pass${pass === 1 ? "" : "es"} and <b>${copied}</b> characters copied${input.length ? ` — against ${input.length} for a single left-to-right pass.` : "."}`,
    { focus: "ret", done: true, result: JSON.stringify(cut(s)), ret: { value: JSON.stringify(cut(s)) } });
  return steps;
}

function traceStack(input) {
  const steps = [];
  const stack = [""];
  let c, i = -1, top;
  const S = (line, note, x = {}) => {
    const vars = { s: cut(JSON.stringify(input)) };
    if (i >= 0) { vars.i = i; vars.c = JSON.stringify(c === " " ? "␣" : c); }
    if (x.top !== undefined) vars.top = JSON.stringify(box(x.top));
    vars.depth = stack.length - 1;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `decode(${cut(JSON.stringify(input))})`, vars, changed: x.changed || [],
        structs: [{ label: "stack (bottom → top)", items: stack.map(box), newest: !!x.fresh }], ret: x.ret }] });
  };

  S(1, `The same problem, one pass. The insight is that a stack of buffers <i>is</i> the nesting: the character you are on always belongs to exactly one open group, and that group is the top of the stack.`, { focus: "param" });
  S(2, `Seed the stack with one empty buffer for the text outside all parentheses. It never gets popped, so whatever is in it at the end is the answer.`, { focus: "seed", changed: ["depth"] });

  for (i = 0; i < input.length; i++) {
    c = input[i];
    S(3, `Character <b>${i}</b> of <b>${input.length}</b>: <b>${show(c)}</b>.`, { focus: "char", changed: ["c", "i"] });
    if (c === "(") {
      stack.push("");
      S(4, `<code class='inl'>(</code> opens a group, so <b>push a fresh buffer</b>. Depth is now <b>${stack.length - 1}</b>, and everything from here belongs to this new buffer until its <code class='inl'>)</code> arrives.`, { focus: "push", changed: ["depth"], fresh: true });
    } else if (c === ")") {
      top = stack.pop() ?? "";
      S(6, `<code class='inl'>)</code> closes the group. Pop its buffer: <b>${box(top)}</b>.`, { focus: "pop", top, changed: ["depth"] });
      stack[stack.length - 1] += rev(top);
      S(7, `Reverse it — <b>${box(top)}</b> → <b>${box(rev(top))}</b> — and append to the buffer beneath, which now reads <b>${box(stack[stack.length - 1])}</b>. It goes in <i>already reversed</i>, so when this outer buffer is reversed in turn, this piece gets flipped a second time. That double flip is the "innermost first, then included in the outer reversal" rule, for free.`,
        { focus: "merge", top, fresh: true });
    } else {
      stack[stack.length - 1] += c;
      S(8, `An ordinary character: append it to the current buffer, which now reads <b>${box(stack[stack.length - 1])}</b>. It is written in reading order — the reversal happens once, at the <code class='inl'>)</code>.`, { focus: "append", fresh: true });
    }
  }
  S(3, `The string is exhausted, and the stack is back to <b>${stack.length}</b> buffer${stack.length === 1 ? "" : "s"} — every <code class='inl'>(</code> was matched.`, { focus: "char" });
  S(10, `<b>Return ${esc(JSON.stringify(stack[0]))}</b>. Each of the <b>${input.length}</b> characters was read once and copied once; nothing was ever rescanned.`,
    { focus: "ret", done: true, result: JSON.stringify(cut(stack[0])), ret: { value: JSON.stringify(cut(stack[0])) } });
  return steps;
}

const STEP_INPUT = (value) => ({ type: "text", label: "s =", value, presets: PRESETS, hint: "balanced parentheses" });

export default {
  n: 16, id: "revparen", title: "Reverse Parenthesis", dates: ["2025-08-26"],
  statement: `Given a string of properly nested, balanced parentheses, reverse the characters inside each pair and drop the parentheses themselves. Nested pairs resolve <b>innermost first</b>, and each result is then part of the reversal around it. <span class="rule">Example: <code class="inl">decode("(f(b(dc)e)a)")</code> → <code class="inl">"abcdef"</code>.</span>`,
  variants: [
    {
      name: "Rewrite the innermost pair", tone: "brute", cost: "O(n²) — one rewrite per pair",
      approach: `The recurrence, obeyed literally. Find an innermost pair — the <b>first</b> <code class='inl'>)</code> and the <b>last</b> <code class='inl'>(</code> before it, which is guaranteed to have nothing nested inside it — reverse those characters, splice them in without the parentheses, and start over. It is correct, and it is easy to believe because each pass leaves a strictly simpler string. What it costs is the splice: every pass rebuilds the <b>whole</b> string, including everything to the left that nothing touched, and then rescans it from the front next time round.`,
      code: `// Correct, and one full rewrite of the string per pair.
function decode(s: string): string {
  while (s.includes("(")) {
    const close = s.indexOf(")");            // an innermost pair closes here
    const open = s.lastIndexOf("(", close);  // ...and opens at the last "(" before it
    const inner = [...s.slice(open + 1, close)].reverse().join("");
    s = s.slice(0, open) + inner + s.slice(close + 1);
  }
  return s;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: rewrite the innermost pair", tone: "brute", cost: "one pair per pass",
      approach: `One pass per pair, with the running copy count in the state panel. Run <b>(f(b(dc)e)a)</b> to see three passes peel the nesting from the inside out, then the ten-deep preset to watch the same string get rebuilt ten times. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: STEP_INPUT("(f(b(dc)e)a)") }),
    },
    {
      name: "One stack pass", tone: "opt", cost: "O(n) — one pass",
      approach: `Stop rewriting the string and let a <b>stack of buffers</b> be the nesting. A <code class='inl'>(</code> pushes an empty buffer; ordinary characters append to whichever buffer is on top; a <code class='inl'>)</code> pops the top, reverses it, and appends it to the one beneath. The clever part is that the child goes in <i>already reversed</i>, so the parent's own reversal flips it again — which is precisely "innermost first, then included in the outer reversal", with no recursion written down and nothing rescanned. The bottom buffer is the answer.`,
      code: `// One left-to-right pass: the stack IS the nesting.
function decode(s: string): string {
  const stack: string[] = [""];              // buffer for the text outside all pairs
  for (const c of s) {
    if (c === "(") stack.push("");           // open a group
    else if (c === ")") {                    // close it: reverse, hand upward
      const top = stack.pop() ?? "";
      stack[stack.length - 1] += [...top].reverse().join("");
    } else stack[stack.length - 1] += c;
  }
  return stack[0];
}`,
      mount: mountStack,
    },
    {
      name: "Step: one stack pass", tone: "opt", cost: "the stack, growing",
      approach: `Watch the stack panel: it deepens on every <code class='inl'>(</code> and collapses on every <code class='inl'>)</code>, and the buffer at the bottom is the answer being assembled. <b>(ab)(cd)</b> shows the depth returning to zero mid-string; the ten-deep preset shows the stack at its tallest, resolved in <b>30</b> character copies against the other tab's <b>210</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_STACK, trace: traceStack, input: STEP_INPUT("((is?)(a(t d)h)e(n y( uo)r)aC)") }),
    },
  ],
};
