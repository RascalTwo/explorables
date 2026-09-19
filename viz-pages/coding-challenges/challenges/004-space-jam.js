// #4 · S  P  A  C  E  J  A  M — strip the spaces before the join, or the old gaps survive.
// One approach, deliberately: the three edits the statement names are the whole
// solution, and there is no wasteful act to name — a regex chain and a
// split/map/join are two spellings of the same pipeline, not two approaches.
// What the module has to teach instead is ORDER, so the demo makes the pipeline
// re-orderable and lets you watch the same three stages produce a wrong answer.
import { el, esc, mountDebugger } from "../shared.js";

// ── the solution, shared by the demo, the trace, and the "expected" check ─────
// Strip first, uppercase, then join. `[...s]` iterates code points where
// `split("")` iterates UTF-16 units; on every case in this module the two agree
// exactly (all BMP), but the spread is the one that would not halve an emoji.
const spaceJam = (s) => [...s.replaceAll(" ", "").toUpperCase()].join("  ");

// The three stages as data, so the demo can run them in any order and the
// "wrong order" comparison is a re-ordering rather than a second code path.
const OPS = {
  strip: {
    label: `remove all spaces`,
    fn: (s) => s.replaceAll(" ", ""),
    delta: (b, a) => {
      const n = b.length - a.length;
      return n ? `−${n} space${n === 1 ? "" : "s"}` : `no spaces present — no-op`;
    },
  },
  upper: {
    label: `uppercase`,
    fn: (s) => s.toUpperCase(),
    delta: (b) => {
      const n = [...b].filter((c) => c !== c.toUpperCase()).length;
      return n ? `${n} letter${n === 1 ? "" : "s"} raised` : `nothing to raise — no-op`;
    },
  },
  join: {
    label: `join with two spaces`,
    fn: (s) => [...s].join("  "),
    delta: (b) => {
      const n = [...b].length;
      return n > 1 ? `${n - 1} gaps × 2 = +${(n - 1) * 2} spaces` : `${n} char → 0 gaps, nothing inserted`;
    },
  },
};

// The comparison the challenge is actually about. Order 1 is the answer; orders
// 2 and 3 are the two ways the same three stages go wrong, and both are real
// bugs people write rather than strawmen — 2 is "I'll clean up the spaces at the
// end", 3 is "the statement never said the input had spaces".
const ORDERS = [
  {
    name: `strip → upper → join`, ops: ["strip", "upper", "join"], ok: true,
    why: `Removing the spaces <b>first</b> is what makes the last stage unambiguous: by the time <code class='inl'>join("  ")</code> runs, every space in the string is one <i>we</i> put there. Uppercasing in the middle is free — it could sit anywhere, because spaces have no case.`,
  },
  {
    name: `upper → join → strip`, ops: ["upper", "join", "strip"], ok: false,
    why: `The same three stages, one of them moved. Stripping <b>last</b> cannot tell your separators from the input's — <code class='inl'>replaceAll(" ", "")</code> deletes both — so every gap that was just inserted disappears again and the answer collapses into a single word. Cleaning up at the end is too late once the cleanup and the output use the same character.`,
  },
  {
    name: `upper → join  (strip forgotten)`, ops: ["upper", "join"], ok: false,
    why: `Skip the strip and the input's own spaces are still <b>characters in the list</b>, so each one gets padded like any other: one original gap comes back as five spaces, and a run of three comes back as eleven. This is the failure that freeCodeCamp's <code class='inl'>"   free   Code   Camp   "</code> case exists to catch — it is the only official input where a space-blind solution visibly differs.`,
  },
];

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader
// lists them, and they already span four branches: no spaces at all (1), runs of
// spaces at both ends and between words (2), punctuation passing through (3),
// digits and symbols that have no uppercase form (4), and an all-lowercase
// sentence where uppercasing does all the visible work (5).
// 6–8 are invented, one per branch the official set never reaches:
//   6  "X"          — n = 1, so the join inserts nothing at all (0 gaps).
//   7  "SPACE JAM"  — already uppercase, so stage 2 is the no-op and the other
//                     two carry the whole transform. It is also the module's own
//                     title: spaceJam("SPACE JAM") is literally "S  P  A  C  E  J  A  M".
//   8  ""           — n = 0, the loop body never runs, out stays "".
// The official set asserts nothing about 6 or 8; both outputs fall out of
// join()'s "between, not after" semantics rather than from a stated rule.
const CASES = [
  "freeCodeCamp",
  "   free   Code   Camp   ",
  "Hello World?!",
  "C@t$ & D0g$",
  "all your base",
  "X",
  "SPACE JAM",
  "",
];

// Spaces are invisible and HTML collapses runs of them, so anywhere the point is
// *counting* spaces they are drawn as amber dots. The final answer is rendered
// with real spaces (white-space:pre-wrap) so it can be copied and compared.
const vis = (s) => esc(s).replaceAll(" ", `<span class="sjm-sp">·</span>`);
const chipLabel = (s) => (s === "" ? `<i>(empty)</i>` : vis(s.length > 24 ? s.slice(0, 22) + "…" : s));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sjm-stages { display:flex; flex-direction:column; gap:6px; margin:14px 0 6px; }
    .sjm-stage { display:grid; grid-template-columns:22px minmax(105px,auto) minmax(0,1fr); gap:11px;
                 align-items:baseline; border:1px solid var(--border); border-radius:9px;
                 background:var(--panel-2); padding:7px 11px; }
    .sjm-stage.raw { background:transparent; border-style:dashed; }
    .sjm-stage.noop { opacity:.6; border-style:dashed; }
    .sjm-num { font:800 11px var(--mono); color:var(--bg); background:var(--accent);
               border-radius:6px; text-align:center; line-height:19px; height:19px; }
    .sjm-stage.raw .sjm-num, .sjm-stage.noop .sjm-num { background:var(--muted); }
    .sjm-op { font:700 12px var(--sans); color:var(--muted); }
    .sjm-str { font:800 14px var(--mono); word-break:break-all; color:var(--text); }
    .sjm-sp { color:var(--warn); opacity:.9; }
    .sjm-d { font:700 11px var(--sans); color:var(--muted); margin-left:9px; white-space:nowrap; }
    .sjm-final { font:800 19px var(--mono); white-space:pre-wrap; word-break:break-all; margin:2px 0 6px; }
    .sjm-final.ok { color:var(--good); }
    .sjm-final.no { color:var(--danger); }
    .sjm-exp { font:700 13px var(--mono); white-space:pre-wrap; word-break:break-all; color:var(--muted); margin-bottom:8px; }
    .sjm-exp b { color:var(--good); }
    .sjm-math { font:700 12.5px var(--mono); color:var(--muted); margin:8px 0 2px; }
    .sjm-math b { color:var(--accent); }
  `));
}

function mount(host) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = CASES[1]; inp.style.width = "300px";
  ctl.append(el("span", "ctl-label", "s ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", chipLabel(c));
    chip.title = JSON.stringify(c);
    chip.onclick = () => { inp.value = c; render(); };
    pre.append(chip);
  });

  // The teaching device: the same three stages, re-orderable. Wrong orders wear
  // .bad so a selected one turns red rather than accent.
  let oi = 0;
  const orderBar = el("div", "controls");
  orderBar.append(el("span", "ctl-label", "run the stages in this order"));
  const chips = ORDERS.map((o, i) => {
    const chip = el("button", "chip" + (o.ok ? "" : " bad"), esc(o.name));
    chip.onclick = () => { oi = i; sync(); render(); };
    orderBar.append(chip);
    return chip;
  });
  const sync = () => chips.forEach((c, i) => c.classList.toggle("on", i === oi));
  sync();

  const out = el("div");
  host.append(
    el("div", "note", "Type anything, or load a case. Each stage of the pipeline gets its own row, so you can see <b>which stage did what</b> — spaces are drawn as <span class='sjm-sp'>·</span> because HTML collapses them. Then re-order the stages and watch the same three operations return the wrong answer."),
    ctl, pre, orderBar, out,
  );
  inp.oninput = render;
  render();

  function row(num, label, str, delta, cls) {
    const r = el("div", "sjm-stage" + (cls ? " " + cls : ""));
    r.append(
      el("div", "sjm-num", num == null ? "·" : String(num)),
      el("div", "sjm-op", esc(label)),
      el("div", "sjm-str", (vis(str) || `<span class="muted">(empty string)</span>`) +
        (delta ? `<span class="sjm-d">${esc(delta)}</span>` : "")),
    );
    return r;
  }

  function render() {
    const s = inp.value;
    const order = ORDERS[oi];
    out.innerHTML = "";

    const stages = el("div", "sjm-stages");
    stages.append(row(null, "input", s, `${s.length} char${s.length === 1 ? "" : "s"}`, "raw"));
    let cur = s;
    order.ops.forEach((k, i) => {
      const op = OPS[k], next = op.fn(cur);
      stages.append(row(i + 1, op.label, next, op.delta(cur, next), next === cur ? "noop" : ""));
      cur = next;
    });
    out.append(stages);

    // The n − 1 arithmetic, spelled out, because it is the only thing the
    // official assertions never state: the separator goes BETWEEN characters.
    const n = [...s.replaceAll(" ", "")].length;
    out.append(el("div", "sjm-math",
      `<b>${n}</b> character${n === 1 ? "" : "s"} after the strip → <b>${Math.max(0, n - 1)}</b> gap${n === 2 ? "" : "s"}` +
      (n > 1 ? ` (one <i>fewer</i> than characters)` : "") +
      ` → <b>${spaceJam(s).length}</b> character${spaceJam(s).length === 1 ? "" : "s"} out.` +
      (n <= 1 ? ` With ${n} character${n === 1 ? "" : "s"} there is nothing to separate, so the join inserts nothing at all.` : "")));

    const want = spaceJam(s);
    const good = cur === want;
    out.append(el("div", "result-line",
      `<span class="badge ${good ? "ok" : "no"}">${good ? "✓ matches the grader" : "✗ not what the grader wants"}</span>` +
      `<span class="muted mono">spaceJam(${esc(JSON.stringify(s))})</span>`));
    out.append(el("div", "sjm-final " + (good ? "ok" : "no"),
      esc(cur) || `<span class="muted">(empty string)</span>`));
    if (!good) {
      out.append(el("div", "sjm-exp",
        `expected  <b>${esc(want) || "(empty string)"}</b>`));
    }
    out.append(el("div", "note", order.why));
  }
}

// ── STEP — the join unrolled, because the join is the part that lies ─────────
// `[...s].join("  ")` is one call, and one call cannot show that the separator
// is written before the character rather than after it. So the trace runs an
// explicit loop: line 7 is the separator, line 8 is the character, and on the
// first iteration line 7's test is FALSE. That single skipped branch is why a
// one-character string comes back bare and why n characters produce n − 1 gaps.
// Every case is traced — the longest (cases 1–3) is 12 characters, well inside a
// readable trace, so nothing needed curating away.
const STEP_CASES = CASES;

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">spaceJam</span>(<span class="tok" data-t="param">s</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="packed">packed = s.<span class="fn">replaceAll</span>(<span class="st">" "</span>, <span class="st">""</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="upper">upper = packed.<span class="fn">toUpperCase</span>()</span>;` },
  { ln: 4,  html: `  <span class="k">const</span> <span class="tok" data-t="chars">chars = [...upper]</span>;` },
  { ln: 5,  html: `  <span class="k">let</span> <span class="tok" data-t="outinit">out = <span class="st">""</span></span>;` },
  { ln: 6,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = 0; i &lt; chars.length</span>; i++) {` },
  { ln: 7,  html: `    <span class="k">if</span> (<span class="tok" data-t="gap">i &gt; 0</span>) out += <span class="st">"  "</span>;   <span class="cm">// BETWEEN, not after</span>` },
  { ln: 8,  html: `    <span class="tok" data-t="app">out += chars[i]</span>;` },
  { ln: 9,  html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 11, html: `}` },
];

// Quote a string for the state panel, showing spaces as · so a value like
// "F  R" is distinguishable from "F R" at a glance in a 150px-wide chip.
const q = (s) => `"${String(s).replaceAll(" ", "·")}"`;

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const s = STEP_CASES[k - 1];
  const steps = [];

  let packed, upper, chars, out, i;

  // Scope by omission. Each name appears only once its own declaration line has
  // run, and `i` additionally disappears again on line 10 because `let i` in the
  // for-head is scoped to the loop, not the function. `chars` is a struct rather
  // than a var for the same reason `out` is not: the panel should show the list
  // being indexed, and it stays visible from line 4 to the end because it is
  // still in scope there.
  const S = (line, note, x = {}) => {
    const vars = { s: q(s) };
    if (line >= 2) vars.packed = q(packed);
    if (line >= 3) vars.upper = q(upper);
    if (line >= 5) vars.out = q(out);
    if (line >= 6 && line <= 9) vars.i = i;
    const structs = [];
    if (line >= 4) structs.push({ label: "chars", items: chars, newest: false });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `spaceJam(${q(s)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Transform <b>${q(s)}</b>. The statement lists three edits — remove the spaces, put two spaces between every character, uppercase the letters — but that listing is <b>not</b> the order to run them in. One of these stages deletes the exact character another one inserts, so the deletion has to go first.`,
    { focus: "param" });

  const spaces = s.length - s.replaceAll(" ", "").length;
  packed = s.replaceAll(" ", "");
  S(2, spaces
    ? `<b>replaceAll(" ", "")</b> deletes all <b>${spaces}</b> space${spaces === 1 ? "" : "s"} — leading, trailing and interior runs alike, because it is a blanket delete and not a <code class='inl'>trim</code>. Doing it <b>now</b> is what makes line 7 safe later: after this line, any space in the string is one <i>we</i> added.`
    : `There is no space in this input, so <b>replaceAll(" ", "")</b> changes nothing. That is worth noticing rather than skipping — a solution that forgot this line entirely would still pass on an input like this one, which is exactly why the official set includes a case with three-space runs.`,
    { focus: "packed", changed: ["packed"] });

  const raised = [...packed].filter((c) => c !== c.toUpperCase()).length;
  upper = packed.toUpperCase();
  S(3, raised
    ? `<b>toUpperCase()</b> raises <b>${raised}</b> letter${raised === 1 ? "" : "s"}. Everything that is not alphabetical is returned unchanged — digits, <code class='inl'>@</code>, <code class='inl'>$</code>, <code class='inl'>?</code> have no uppercase form — which is the statement's "non-alphabetical characters remain unchanged" clause, already satisfied for free. This stage is also the one that could have gone <i>anywhere</i> in the pipeline: spaces have no case, so uppercasing before or after the join makes no difference.`
    : `Every letter here is already uppercase, so <b>toUpperCase()</b> is a no-op on this input — the other two stages do the entire transform. A pipeline that is wrong about <i>order</i> will still look right at this line, which is why the ordering bug survives casual testing.`,
    { focus: "upper", changed: ["upper"] });

  chars = [...upper];
  S(4, `<b>[...upper]</b> spreads the string into <b>${chars.length}</b> character${chars.length === 1 ? "" : "s"}. Spreading iterates <b>code points</b> where <code class='inl'>split("")</code> iterates UTF-16 units; on every character in this challenge the two are identical, but the spread is the version that would not cut a surrogate pair in half.`,
    { focus: "chars" });

  out = "";
  S(5, `<b>out</b> starts empty. The real solution ends in <code class='inl'>.join("  ")</code>; it is unrolled here because a single <code class='inl'>join</code> call hides the one fact that matters — <b>where</b> the separator goes relative to the character.`,
    { focus: "outinit", changed: ["out"] });

  for (i = 0; i < chars.length; i++) {
    S(6, `Character <b>${i + 1}</b> of <b>${chars.length}</b>: the loop test <code class='inl'>i &lt; chars.length</code> holds, so there is still something to place.`,
      { focus: "forcond", changed: ["i"], eval: { expr: `i = ${i} < ${chars.length}`, val: true } });

    if (i > 0) {
      out += "  ";
      S(7, `<b>i = ${i} &gt; 0</b>, so write the two-space gap <b>before</b> the character — gap <b>${i}</b> of <b>${chars.length - 1}</b>. Appending the separator <i>after</i> each character instead would be one line shorter and would leave a trailing <code class='inl'>"  "</code> on the result, which no assertion accepts.`,
        { focus: "gap", changed: ["out"], eval: { expr: `i = ${i} > 0`, val: true } });
    } else {
      S(7, `<b>i = 0</b>, so the test is <b>false</b> and <b>no separator is written</b>. This one skipped branch is the entire "two spaces <i>between</i> every character" rule: the first character has nothing on its left to be separated from. It is also why a one-character input comes back with no padding at all, and why an empty input never reaches this line.`,
        { focus: "gap", eval: { expr: `i = 0 > 0`, val: false } });
    }

    out += chars[i];
    S(8, `Append <b>"${chars[i]}"</b>. <b>out</b> is now <b>${q(out)}</b> — ${i + 1} character${i === 0 ? "" : "s"} and ${i} gap${i === 1 ? "" : "s"}, one fewer gap than characters at every point in the loop, not just at the end.`,
      { focus: "app", changed: ["out"] });
  }

  S(6, chars.length
    ? `<b>i = ${chars.length}</b> has reached the length, so the loop stops. <b>${chars.length}</b> characters went in and <b>${chars.length - 1}</b> gaps came out — the <code class='inl'>n − 1</code> that <code class='inl'>join</code> gives you for free.`
    : `<b>chars.length</b> is <b>0</b>, so the test fails immediately and the body never runs even once. Nothing was appended, nothing was separated — an empty input can only produce an empty string.`,
    { focus: "forcond", eval: { expr: `i = ${chars.length} < ${chars.length}`, val: false } });

  S(10, chars.length > 1
    ? `<b>Return ${q(out)}</b>. Compare it with the input <b>${q(s)}</b>: every original gap is gone and every gap in the answer is exactly two spaces wide. Had line 2 run <i>after</i> this loop instead, it would have deleted those too.`
    : `<b>Return ${q(out)}</b> — ${chars.length === 1 ? `a single character with <b>no</b> padding, because padding lives between characters and there is only one` : `the empty string, because there was never a character to place`}. Nothing in freeCodeCamp's five assertions pins this down; it falls out of <code class='inl'>join</code> putting separators <b>between</b> items rather than after each one.`,
    { focus: "ret", done: true, result: out === "" ? '"" (empty)' : out, ret: { value: out === "" ? '""' : out } });

  return steps;
}

export default {
  n: 4, id: "spacejam", title: "S  P  A  C  E  J  A  M", dates: ["2025-08-14"],
  statement: `Given a string, <b>remove all spaces</b>, <b>uppercase</b> every alphabetical letter, and return the characters separated by <b>two spaces</b>. Non-alphabetical characters are unchanged — only spaces are removed. <code class="inl">"C@t$ &amp; D0g$"</code> → <b>"C  @  T  $  &amp;  D  0  G  $"</b>. <span class="rule">The catch is the order. One stage deletes the character another stage inserts, so the strip has to run <i>first</i> — otherwise <code class="inl">"   free   Code   Camp   "</code> either keeps its own gaps as extra separators or loses every gap you added. And the separator goes <i>between</i> characters, not after each one: <code class="inl">"X"</code> comes back as <code class="inl">"X"</code>, with nothing added at all.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — three passes",
      approach: `Three stated edits, and the only decision is what order to run them in. <b>Strip first.</b> <code class='inl'>replaceAll(" ", "")</code> is a blanket delete — leading, trailing and interior runs all go, which is why <code class='inl'>"   free   Code   Camp   "</code> and <code class='inl'>"freeCodeCamp"</code> produce the same answer. Once it has run, every space left in the pipeline is one you put there yourself, so the join is unambiguous. <b>Uppercase second</b>, but only by convention: spaces have no case, so this stage could sit anywhere — and non-alphabetical characters are returned untouched by <code class='inl'>toUpperCase</code>, which satisfies the "unchanged" clause without a single branch. <b>Join last</b>, with <code class='inl'>join("  ")</code>, which puts the separator <i>between</i> items — <code class='inl'>n</code> characters give <code class='inl'>n − 1</code> gaps, so a one-character string gains nothing and an empty one stays empty. Flip the order control in the demo to see the two failure modes: strip last collapses the whole thing into one word, and no strip at all pads the input's own spaces along with everything else.`,
      code: `// Order is everything: the spaces have to be gone BEFORE the join runs, or the
// input's own gaps survive into the output as extra separators.
function spaceJam(s: string): string {
  const packed = s.replaceAll(" ", "");   // 1. every space, runs included
  const upper = packed.toUpperCase();     // 2. digits + punctuation are untouched
  return [...upper].join("  ");           // 3. two spaces BETWEEN chars => n - 1 gaps
}`,
      mount,
    },
    {
      name: "Step through", cost: "gap-by-gap",
      approach: `The same pipeline with the final <code class='inl'>join</code> unrolled into a loop, because one <code class='inl'>join</code> call cannot show <i>where</i> the separator goes. Line 7 writes the gap, line 8 writes the character — and on the first iteration line 7's test is <b>false</b>, which is the whole "between, not after" rule in one skipped branch. Watch case <b>2</b> (<code class='inl'>"   free   Code   Camp   "</code>) for the strip doing its real work, case <b>6</b> (<code class='inl'>"X"</code>) for a run where line 7 <i>never</i> fires, case <b>7</b> (<code class='inl'>"SPACE JAM"</code>) where uppercase is the no-op and the title is the output, and case <b>8</b> (the empty string) where the loop body never runs at all. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 2, min: 1, max: STEP_CASES.length,
          presets: STEP_CASES.map((_, i) => i + 1),
          hint: `1–${STEP_CASES.length}: 1–5 official, 6 single char, 7 already uppercase, 8 empty`,
        },
      }),
    },
  ],
};
