// #15 · camelCase — lowercase the whole word first, then raise only its first letter.
// Two clauses do all the damage. "One or more characters" makes a RUN of separators
// a single break, so the split needs a `+` and the empty pieces at the ends need
// dropping. And "the rest of it lowercase" means every word is flattened before its
// initial goes up — uppercase the first character of "cODE" without lowering the
// rest and you get "CODE", which passes three of the five official cases.
import { el, esc, mountDebugger } from "../shared.js";

// The five official freeCodeCamp cases, then three of ours. The official set never
// starts or ends on a separator, so nothing in it reaches `filter(Boolean)` — that
// is what "-hello_world-" is for, and without the filter it does not merely answer
// wrong, it throws on ""[0]. "MiXeD" is the only single-word input, where the whole
// job is the flattening. "a" is the shortest thing that still has a first letter.
const OFFICIAL = [
  "hello world",
  "HELLO WORLD",
  "secret agent-X",
  "FREE cODE cAMP",
  "ye old-_-sea  faring_buccaneer_-_with a - peg__leg----and a_parrot_ _named- _squawk",
];
const PRESETS = [...OFFICIAL, "-hello_world-", "MiXeD", "a"];

const SEP = /[ _-]/;
const split = (s) => s.split(/[ _-]+/);
const camel = (w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase());

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .cc-wrap { display:flex; flex-direction:column; gap:13px; }
    .cc-raw { font:15px var(--mono); background:var(--panel); border:1px solid var(--border); border-radius:9px; padding:9px 11px; word-break:break-all; line-height:1.9; }
    .cc-raw .sep { background:color-mix(in srgb, var(--warn) 26%, transparent); color:var(--warn); border-radius:3px; }
    .cc-step { font:11px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
    .cc-words { display:flex; flex-wrap:wrap; gap:7px; }
    .cc-w { border:1px solid var(--border); border-radius:8px; background:var(--panel-2); padding:5px 9px; text-align:center; min-width:44px; }
    .cc-w.first { border-color:var(--accent); }
    .cc-w.empty { border-style:dashed; opacity:.5; }
    .cc-w .was { font:11px var(--mono); color:var(--muted); text-decoration:line-through; }
    .cc-w .now { font:800 14px var(--mono); color:var(--text); }
    .cc-w .now .cap { color:var(--good); }
    .cc-w.first .now { color:var(--accent); }
    .cc-out { font:800 20px var(--mono); color:var(--good); word-break:break-all; }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "FREE cODE cAMP"; inp.style.width = "min(520px, 100%)";
  ctl.append(el("span", "ctl-label", "input ="), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => {
    const c = el("button", "chip", esc(v.length > 34 ? v.slice(0, 31) + "…" : v));
    c.title = v;
    c.onclick = () => { inp.value = v; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const s = inp.value;
    const raw = split(s);
    const words = raw.filter(Boolean);
    out.innerHTML = "";
    const wrap = el("div", "cc-wrap");

    // 1 — where the breaks are. A run of separators is highlighted as one block,
    // which is the whole content of "one or more characters from the following set".
    wrap.append(el("div", "cc-step", "1 · every separator, and every run of them, is one break"));
    wrap.append(el("div", "cc-raw", [...s].map((c) => (SEP.test(c) ? `<span class="sep">${c === " " ? "␣" : esc(c)}</span>` : esc(c))).join("") || `<span class="muted">(empty)</span>`));

    // 2 — the split, empties included, so the reason for filter(Boolean) is visible.
    const dropped = raw.length - words.length;
    wrap.append(el("div", "cc-step", `2 · split → ${raw.length} piece${raw.length === 1 ? "" : "s"}${dropped ? `, ${dropped} of them empty` : ""}`));
    const rawRow = el("div", "cc-words");
    raw.forEach((w) => rawRow.append(el("div", "cc-w" + (w ? "" : " empty"), `<div class="now">${w ? esc(w) : "∅"}</div>`)));
    wrap.append(rawRow);

    // 3 — the case transform, with the before/after on each word.
    wrap.append(el("div", "cc-step", "3 · word 0 all lowercase; every other word lowercased, then its first letter raised"));
    const row = el("div", "cc-words");
    words.forEach((w, i) => {
      const done = camel(w, i);
      const shown = i === 0 ? esc(done) : `<span class="cap">${esc(done[0])}</span>${esc(done.slice(1))}`;
      row.append(el("div", "cc-w" + (i === 0 ? " first" : ""),
        (done === w ? "" : `<div class="was">${esc(w)}</div>`) + `<div class="now">${shown}</div>`));
    });
    if (!words.length) row.append(el("div", "cc-w empty", `<div class="now">∅</div>`));
    wrap.append(row);

    wrap.append(el("div", "cc-step", "4 · join with nothing"));
    wrap.append(el("div", "cc-out", esc(JSON.stringify(words.map(camel).join("")))));
    wrap.append(el("div", "note", noteFor(s, raw, words)));
    out.append(wrap);
  }
}

function noteFor(s, raw, words) {
  if (raw.length !== words.length)
    return `The split produced <b>${raw.length - words.length}</b> empty piece${raw.length - words.length === 1 ? "" : "s"}, because the string ${SEP.test(s[0] || "") ? "starts" : "ends"} on a separator. That empty string is not just a stray word — <code class='inl'>""[0].toUpperCase()</code> <b>throws</b>, so dropping the empties is the difference between a wrong answer and a crash. No official case has one.`;
  const shouty = words.find((w, i) => i > 0 && w.slice(1) !== w.slice(1).toLowerCase());
  if (shouty)
    return `<b>${esc(shouty)}</b> is why the word is lowercased <i>before</i> its first letter goes up. Raise the initial and leave the tail alone and you get <code class='inl'>${esc(shouty[0].toUpperCase() + shouty.slice(1))}</code> — and <code class='inl'>"FREE cODE cAMP"</code> comes back as <code class='inl'>"freeCODECAMP"</code>.`;
  const runs = (s.match(/[ _-]{2,}/g) || []).length;
  if (runs)
    return `<b>${runs}</b> run${runs === 1 ? "" : "s"} of two or more separators here, and each one is a <b>single</b> break. That is what the <code class='inl'>+</code> in <code class='inl'>/[ _-]+/</code> buys — drop it and <code class='inl'>"peg__leg"</code> splits into three pieces, the middle one empty.`;
  return `Word 0 is the odd one out: it stays <b>entirely lowercase</b>, so <code class='inl'>"MiXeD"</code> becomes <code class='inl'>"mixed"</code> rather than being left alone. Every other word takes the same flatten and then raises exactly one character.`;
}

// ── STEP — the same transform, unrolled into a loop so each word is a stop ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">toCamelCase</span>(<span class="tok" data-t="param">s</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> words = <span class="tok" data-t="split">s.<span class="fn">split</span>(/[ _-]+/)</span>.<span class="tok" data-t="filter"><span class="fn">filter</span>(Boolean)</span>;` },
  { ln: 3, html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span></span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">i = 0; i &lt; words.length</span>; i++) {` },
  { ln: 5, html: `    <span class="k">const</span> w = <span class="tok" data-t="lower">words[i].<span class="fn">toLowerCase</span>()</span>;` },
  { ln: 6, html: `    out += <span class="tok" data-t="pick">i === <span class="nu">0</span> ? w : w[<span class="nu">0</span>].<span class="fn">toUpperCase</span>() + w.<span class="fn">slice</span>(<span class="nu">1</span>)</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 9, html: `}` },
];

const short = (x) => (String(x).length > 26 ? String(x).slice(0, 23) + "…" : String(x));

function trace(s) {
  const raw = split(s);
  const words = raw.filter(Boolean);
  const steps = [];
  let out, i, w;
  const S = (line, note, x = {}) => {
    const vars = { s: short(JSON.stringify(s)) };
    if (line >= 3) vars.out = JSON.stringify(short(out));
    if (line >= 4 && line <= 7 && i !== undefined) vars.i = i;
    if (line >= 5 && line <= 7 && w !== undefined) vars.w = JSON.stringify(w);
    const structs = line >= 2 ? [{ label: "words", items: words.slice(0, 16).concat(words.length > 16 ? ["…"] : []), newest: false }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `toCamelCase(${short(JSON.stringify(s))})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  out = "";
  S(1, `Turn <b>${esc(short(s))}</b> into camel case. The separators are space, dash and underscore, and a <b>run</b> of them counts as one break.`, { focus: "param" });
  S(2, `<code class='inl'>split(/[ _-]+/)</code> cuts on every run and gives <b>${raw.length}</b> piece${raw.length === 1 ? "" : "s"}. The <code class='inl'>+</code> is doing real work: without it, <code class='inl'>"peg__leg"</code> would come back as three pieces with an empty one wedged in the middle.`, { focus: "split" });
  S(2, raw.length === words.length
    ? `<code class='inl'>filter(Boolean)</code> drops nothing here — this input neither starts nor ends on a separator, which is true of all five official cases.`
    : `<code class='inl'>filter(Boolean)</code> drops <b>${raw.length - words.length}</b> empty string${raw.length - words.length === 1 ? "" : "s"} from the ends. Skip this and line 6 reaches <code class='inl'>""[0]</code>, which is <code class='inl'>undefined</code> — <code class='inl'>.toUpperCase()</code> on it <b>throws</b>.`,
    { focus: "filter" });
  S(3, `Start the answer empty. Everything from here is appending one word at a time.`, { focus: "init", changed: ["out"] });

  for (i = 0; i < words.length; i++) {
    S(4, `Word <b>${i}</b> of <b>${words.length}</b>: <b>${esc(words[i])}</b>.`, { focus: "loop", changed: ["i"], eval: { expr: `i = ${i} < ${words.length}`, val: true } });
    w = words[i].toLowerCase();
    S(5, words[i] === w
      ? `<b>${esc(words[i])}</b> is already lowercase, so this changes nothing — but it runs on every word regardless, and that uniformity is the point.`
      : `Flatten it first: <b>${esc(words[i])}</b> → <b>${esc(w)}</b>. Doing this <i>before</i> the capital goes on is what turns <code class='inl'>"cODE"</code> into <code class='inl'>"Code"</code> instead of <code class='inl'>"CODE"</code>.`,
      { focus: "lower", changed: ["w"] });
    const piece = i === 0 ? w : w[0].toUpperCase() + w.slice(1);
    out += piece;
    S(6, i === 0
      ? `Word <b>0</b> is the exception: it stays all lowercase, so it is appended as <b>${esc(piece)}</b>. Every camelCase rule is really "all words the same, except the first."`
      : `Raise just the initial: <b>${esc(w)}</b> → <b>${esc(piece)}</b>, appended. <code class='inl'>out</code> is now <b>${esc(short(out))}</b>.`,
      { focus: "pick", changed: ["out"], eval: { expr: `i === 0`, val: i === 0 } });
  }
  S(4, words.length
    ? `<b>i = ${i}</b> is past the last word — every piece has been folded in.`
    : `There were no words at all, so the loop body never runs.`,
    { focus: "loop", eval: { expr: `i = ${i} < ${words.length}`, val: false } });
  S(8, `<b>Return ${esc(JSON.stringify(out))}</b> — the pieces joined with nothing between them, which is what "all separators should be removed" amounts to once the split has already thrown them away.`,
    { focus: "ret", done: true, result: JSON.stringify(short(out)), ret: { value: JSON.stringify(short(out)) } });
  return steps;
}

export default {
  n: 15, id: "camelcase", title: "camelCase", dates: ["2025-08-25"],
  statement: `Given a string whose words are separated by <b>one or more</b> spaces, dashes or underscores, return its camel case form: the first word entirely lowercase, every later word lowercase with an uppercase initial, and all separators removed. <span class="rule">Example: <code class="inl">toCamelCase("FREE cODE cAMP")</code> → <code class="inl">"freeCodeCamp"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — split, map, join",
      approach: `Three lines, and each one answers a clause of the statement. <b>"One or more characters"</b> is the <code class='inl'>+</code> in <code class='inl'>/[ _-]+/</code> — without it a run like <code class='inl'>"peg__leg"</code> splits into three pieces with an empty in the middle. <b>"All spaces and separators removed"</b> is free once you have split on them, so the join takes no argument. And <b>"the rest of it lowercase"</b> is the clause that decides the hard cases: flatten the word <i>first</i>, then raise one character. Uppercase the initial without lowering the tail and <code class='inl'>"FREE cODE cAMP"</code> comes back <code class='inl'>"freeCODECAMP"</code>. The <code class='inl'>filter(Boolean)</code> is not tidiness — a leading separator yields <code class='inl'>""</code>, and <code class='inl'>""[0].toUpperCase()</code> throws.`,
      code: `function toCamelCase(s: string): string {
  return s
    .split(/[ _-]+/)      // a RUN of separators is one break
    .filter(Boolean)      // a leading/trailing separator leaves ""
    .map((w, i) => {
      const lower = w.toLowerCase();               // flatten FIRST
      return i === 0 ? lower                       // word 0 stays lowercase
                     : lower[0].toUpperCase() + lower.slice(1);
    })
    .join("");
}`,
      mount,
    },
    {
      name: "Step through", cost: "one word per stop",
      approach: `The same transform written as a loop, so each word is a stop. Run <b>FREE cODE cAMP</b> to watch the flatten land before the capital, then <b>-hello_world-</b> for the two empty pieces the filter removes, and the long <b>ye old-_-sea…</b> case for fourteen words and seven different separator runs. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "s =", value: "FREE cODE cAMP", presets: PRESETS, hint: "spaces, dashes, underscores" } }),
    },
  ],
};
