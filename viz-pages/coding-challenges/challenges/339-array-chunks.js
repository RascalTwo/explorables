// #339 · Array Chunks — slice clamps at the end, so the short last chunk is free.
// One idea, one variant: stride the START index by `size` instead of by 1, and let
// `slice(i, i + size)` run off the end. slice truncates at arr.length rather than
// overrunning or padding, which is why the uneven tail needs no special case at all.
// Drag the size slider past the array's length to watch every chunk collapse into one.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's official tests, in the order the grader lists them;
// they already span the three boundaries worth teaching (even split, size 1,
// size > length) plus a mixed string/number array. Case 6 is invented: size ===
// length exactly, the off-by-one neighbour of "size > length" — the last input for
// which the loop still runs a second test before quitting.
const CASES = [
  { text: "1, 2, 3, 4, 5, 6", size: 3, label: "6 ÷ 3 — even" },
  { text: '1, two, 3, four, 5, six, 7, eight', size: 2, label: "8 mixed ÷ 2" },
  { text: "1, 2, 3, 4, 5", size: 3, label: "5 ÷ 3 — short last" },
  { text: "a, b, c, d, e", size: 1, label: "5 ÷ 1 — singletons" },
  { text: "1, 2, 3", size: 5, label: "3 ÷ 5 — size > n" },
  { text: "10, 20, 30, 40", size: 4, label: "4 ÷ 4 — exact fit" },
];

// Comma-separated text → mixed array. A token that round-trips through Number is a
// number (official case 2 mixes 1 and "two"), everything else stays a string.
const parse = (s) =>
  s.split(",").map((t) => t.trim()).filter((t) => t !== "")
   .map((t) => (t !== "" && !isNaN(Number(t)) ? Number(t) : t));

// The solution itself — shared by the demo and the trace so they cannot drift.
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const fmt = (v) => (typeof v === "string" ? `"${v}"` : String(v));
const fmtArr = (a) => "[" + a.map(fmt).join(", ") + "]";
const fmtChunks = (cs) => "[" + cs.map(fmtArr).join(", ") + "]";

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ac-chunks { display:flex; flex-wrap:wrap; gap:12px; margin:6px 0 4px; padding-top:14px; }
    .ac-chunk { position:relative; display:flex; gap:5px; padding:8px 10px; border-radius:10px;
                border:1px solid var(--border); background:var(--panel-2); }
    .ac-chunk.short { border-color:var(--warn); border-style:dashed; }
    .ac-tag { position:absolute; top:-9px; left:9px; padding:0 5px; background:var(--panel);
              font:700 9px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .ac-chunk.short .ac-tag { color:var(--warn); }
    .ac-cell { min-width:24px; padding:4px 9px; border-radius:6px; font:700 13px var(--mono);
               color:var(--text); border:1px solid var(--accent);
               background:color-mix(in srgb, var(--accent) 14%, transparent); }
    .ac-cell.str { border-color:var(--c3); background:color-mix(in srgb, var(--c3) 14%, transparent); }
    .ac-row { display:flex; align-items:center; gap:12px; margin:14px 0 2px; flex-wrap:wrap; }
    .ac-slider { flex:1; min-width:140px; accent-color:var(--accent); }
    .ac-size { font:800 16px var(--mono); color:var(--accent); min-width:88px; }
    .ac-out { font:13px var(--mono); color:var(--muted); margin-top:10px; word-break:break-all; }
    .ac-out b { color:var(--text); }
  `));
}

function mount(host) {
  ensureStyle();
  let text = CASES[0].text, size = CASES[0].size;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { text = c.text; size = c.size; inp.value = text; render(); };
    pre.append(chip);
  });

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = text; inp.style.width = "340px";
  inp.oninput = () => { text = inp.value; render(); };
  ctl.append(el("span", "ctl-label", "array ="), inp);

  const row = el("div", "ac-row");
  const sizeEl = el("div", "ac-size", "");
  const slider = el("input", "ac-slider"); slider.type = "range"; slider.min = 1; slider.step = 1;
  slider.oninput = () => { size = +slider.value; render(); };
  row.append(sizeEl, slider);

  const out = el("div");
  host.append(
    el("div", "note", "Type your own comma-separated array — bare words become strings, numerals become numbers — then drag <b>size</b>. Watch the same elements regroup, and push size past the array's length to collapse everything into one short chunk."),
    pre, ctl, row, out,
  );
  render();

  function render() {
    const arr = parse(text);
    const hi = Math.max(arr.length, 1) + 2;          // reach past the end so "size > n" is always attainable
    slider.max = hi;
    size = Math.max(1, Math.min(hi, size));
    slider.value = size;
    sizeEl.textContent = `size = ${size}`;

    const chunks = chunkArray(arr, size);
    const rem = arr.length % size;
    out.innerHTML = "";

    const box = el("div", "ac-chunks");
    chunks.forEach((c, ci) => {
      const short = c.length < size;
      const g = el("div", "ac-chunk" + (short ? " short" : ""));
      g.append(el("span", "ac-tag", `chunk ${ci}${short ? " · short" : ""}`));
      c.forEach((v) => g.append(el("span", "ac-cell" + (typeof v === "string" ? " str" : ""), esc(fmt(v)))));
      box.append(g);
    });
    if (!chunks.length) box.append(el("span", "muted", "(no elements — no chunks)"));
    out.append(box);

    out.append(el("div", "ac-out",
      `<b>chunkArray(${esc(fmtArr(arr))}, ${size})</b> → ${esc(fmtChunks(chunks))}`));

    let why;
    if (!arr.length) why = "Nothing to chunk: the loop test <code class='inl'>0 &lt; 0</code> fails immediately, so the empty accumulator is returned untouched.";
    else if (size >= arr.length) why = `<b>size ${size} ≥ length ${arr.length}</b>, so <code class='inl'>slice(0, ${size})</code> asks for indices past the end. slice <b>clamps</b> at <code class='inl'>arr.length</code>, so you get one chunk of ${arr.length} and the loop's next start index, ${size}, is already out of range.`;
    else if (rem === 0) why = `<b>${arr.length} ÷ ${size}</b> divides evenly, so all ${chunks.length} chunks are full and the final stride lands exactly on <code class='inl'>arr.length</code>.`;
    else why = `<b>${arr.length} = ${chunks.length - 1}×${size} + ${rem}</b>, so the last start index is ${(chunks.length - 1) * size} and <code class='inl'>slice(${(chunks.length - 1) * size}, ${(chunks.length - 1) * size + size})</code> overshoots the end by ${size - rem}. slice clamps rather than padding, so the tail chunk simply holds ${rem} — no special case in the code.`;
    out.append(el("div", "note", `⌈${arr.length} / ${size}⌉ = <b>${chunks.length}</b> chunk${chunks.length === 1 ? "" : "s"}. ${why}`));
  }
}

// ── STEP — the loop line-by-line (single call frame) ──────────────────────────
// `arr` is a parameter, so its struct is live from line 1; `out` only appears once
// line 2 has run, and `i` exists only while the for-statement on lines 3–5 owns it.
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">chunkArray</span>(<span class="tok" data-t="params">arr, size</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="out">out = []</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cond">i = 0; i &lt; arr.length</span>; <span class="tok" data-t="stride">i += size</span>) {` },
  { ln: 4, html: `    out.<span class="fn">push</span>(<span class="tok" data-t="slice">arr.<span class="fn">slice</span>(i, i + size)</span>);` },
  { ln: 5, html: `  }` },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 7, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const c = CASES[k - 1];
  const arr = parse(c.text), size = c.size, n = arr.length;
  const expected = Math.ceil(n / size);
  const steps = [];
  const out = [];
  let i, outLive = false;

  const S = (line, note, x = {}) => {
    const vars = { size };                                  // parameter — live for the whole call
    if (line >= 3 && line <= 5) vars.i = i;                 // the for-statement's `let` — gone once we reach line 6
    const structs = [{ label: "arr", items: arr.map(fmt) }];
    if (outLive) structs.push({ label: "out", items: out.map(fmtArr), newest: !!x.pushed });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `chunkArray(${fmtArr(arr)}, ${size})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Regroup <b>${n}</b> element${n === 1 ? "" : "s"} into runs of <b>${size}</b>. The answer holds <b>⌈${n}/${size}⌉ = ${expected}</b> chunk${expected === 1 ? "" : "s"} — the <i>ceiling</i>, because a leftover partial run is still a chunk and has to go somewhere.`,
    { focus: "params" });

  outLive = true;
  S(2, `<b>out</b> is the only thing that grows: exactly one push per chunk. Nothing is copied yet — every element still lives only in <b>arr</b>.`,
    { focus: "out" });

  i = 0;
  let first = true;
  for (;;) {
    if (!first) {
      const prev = i;
      i += size;
      S(3, `<b>i += size</b> moves the start from <b>${prev}</b> to <b>${i}</b> — one jump over the <i>entire</i> chunk just taken. Striding by <b>${size}</b> instead of by 1 is what makes one pass of this loop produce one chunk rather than one element.`,
        { focus: "stride", changed: ["i"] });
    }
    first = false;
    const more = i < n;
    S(3, more
      ? `Test <b>i = ${i} &lt; ${n}</b> → <b>true</b>: index ${i} still exists, so a chunk starts there. The test asks about the <i>start</i> index only — it never asks whether a <i>full</i> ${size} elements remain, and that omission is deliberate.`
      : `Test <b>i = ${i} &lt; ${n}</b> → <b>false</b>. ${i === n
          ? `The stride landed exactly on the end, so every element was claimed by a full chunk.`
          : `The stride overshot the end by <b>${i - n}</b> — the last chunk was short, so its start plus ${size} ran past ${n}. Either way the loop stops, because there is no index ${i} to begin a chunk at.`}`,
      { focus: "cond", eval: { expr: `i (${i}) < arr.length (${n})`, val: more } });
    if (!more) break;

    const end = i + size;
    const piece = arr.slice(i, end);
    out.push(piece);
    S(4, end <= n
      ? `<b>slice(${i}, ${end})</b> copies indices ${i}…${end - 1} → <b>${fmtArr(piece)}</b>. Both bounds sit inside the array, so this is a full chunk of ${size}. slice copies — <b>arr</b> is never modified.`
      : `<b>slice(${i}, ${end})</b> asks for indices ${i}…${end - 1}, but <b>arr</b> stops at ${n - 1}. slice <b>clamps</b> the end to <code>arr.length</code> instead of overrunning, throwing, or padding with <code>undefined</code> — so it hands back the ${piece.length} element${piece.length === 1 ? "" : "s"} that actually exist, <b>${fmtArr(piece)}</b>. That clamp <i>is</i> the short-last-chunk rule; no code implements it.`,
      { focus: "slice", pushed: true });
  }

  S(6, `<b>Return out</b> = <b>${fmtChunks(out)}</b> — ${out.length} chunk${out.length === 1 ? "" : "s"}, matching the ⌈${n}/${size}⌉ predicted at the start. The elements are in their original order; only the grouping changed.`,
    { focus: "ret", done: true, result: fmtChunks(out), ret: { value: fmtChunks(out) } });

  return steps;
}

export default {
  n: 339, id: "chunks", title: "Array Chunks", dates: ["2026-07-15"],
  statement: `Given an array and a chunk size, return the array split into sub-arrays of that size. <b>The last chunk may be smaller</b> if the array doesn't divide evenly. <span class="rule">Example: <code class="inl">chunkArray([1, 2, 3, 4, 5], 3)</code> → <b>[[1, 2, 3], [4, 5]]</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Walk the <b>start</b> index, not the elements: <code class='inl'>i</code> begins at 0 and strides by <code class='inl'>size</code>, so each pass of the loop emits one whole chunk. The loop test only asks whether index <code class='inl'>i</code> exists — never whether a <i>full</i> <code class='inl'>size</code> elements remain. That's safe because <code class='inl'>slice(i, i + size)</code> <b>clamps</b> its end at <code class='inl'>arr.length</code>: ask for indices past the end and you get what's there, not <code class='inl'>undefined</code> padding and not an error. So the short final chunk falls out of the language's own semantics and needs no branch. Total copies: n elements across ⌈n/size⌉ slices.`,
      code: `// Stride the START index by \`size\`; slice clamps at arr.length, so the
// short final chunk needs no special case.
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size)); // i + size may overrun — slice truncates
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the loop. Watch <code class='inl'>i</code> jump by <code class='inl'>size</code> rather than by 1, each jump clearing an entire chunk, and watch <b>out</b> gain one array per pass. The cases that matter are <b>5 ÷ 3</b> and <b>3 ÷ 5</b>, where <code class='inl'>i + size</code> runs off the end and slice quietly truncates. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length, presets: CASES.map((_, ix) => ix + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
