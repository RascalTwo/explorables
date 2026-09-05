// #306 · HTML Content Extractor — a tag is a region you're inside, not a pattern you match.
// ONE approach, deliberately. The wasteful act you'd need for a brute/opt pair
// doesn't exist here: every honest solution is a single left-to-right pass over
// the characters, so there is no cost gap to put on screen (CONTRIBUTING Tier 3,
// test 3) and no second mental model — only a second SPELLING.
//
// The second spelling is `html.replace(/<[^>]*>/g, "")`, and it passes all five
// official assertions. It is not shipped as a variant because it DISAGREES with
// the scanner on `<a title="5 > 3">math</a>` — the regex answers ` 3">math` —
// and Tier 1 §3 forbids shipping two variants that disagree. So the one-liner
// appears where it belongs: inline in the demo, on every input, as the answer
// you'd have got. Every official input keeps its ">" outside the quotes, which
// is exactly why the one-liner survives the grader; the divergence case is OURS,
// not freeCodeCamp's.
//
// SAFETY: this module renders the user's HTML as ESCAPED TEXT and never assigns
// it to innerHTML. The solution is a character scan, not a DOM parse, which is
// also what lets the `code` snippet run outside a browser.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's official set, in the order the grader lists them,
// and each already lands on a different branch: a plain open/close pair, nested
// tags, a tag with a quoted attribute, a mixed document with a self-closing
// <br/> and an unclosed <code>, and a full nested document.
// Cases 6–7 are ours, for branches the official set never reaches:
//   6 — no tags at all: the scanner never enters the tag region, so the input
//       comes back byte-for-byte. The degenerate input.
//   7 — THE teaching case: a ">" inside a quoted attribute value. This is the
//       only input here where the naive one-liner and the scanner disagree.
const CASES = [
  { label: "1 · tag pair", html: `<p>hello world</p>`, want: "hello world" },
  { label: "2 · nested", html: `<p>hello <span>world</span></p>`, want: "hello world" },
  { label: "3 · attribute", html: `<a href="example.com">Click me</a>`, want: "Click me" },
  {
    label: "4 · mixed",
    html: `<p><button onClick="learnToCode()">Learn</button> to <code>code<code> <br/>for <strong>free</strong> <br/>on <a href="https://freecodecamp.org/" target="_blank"><span class="highlight">freecodecamp</span>.org</a>`,
    want: "Learn to code for free on freecodecamp.org",
  },
  {
    label: "5 · document",
    html: `<div class="container"><h1 id="title">Welcome to <strong>My</strong> Website.</h1><p>This is a <a href="https://example.com" target="_blank">link</a> to something <em>really</em> <span class="highlight">important</span>.</p><ul><li>Item <strong>one</strong></li><li>Item <em>two</em></li><li>Item three</li></ul><img src="pic.jpg" alt="A picture"/><p class="footer">Contact us at <a href="mailto:hello@example.com">hello@example.com</a> for <span>more <strong>info</strong></span>.</p></div>`,
    want: "Welcome to My Website.This is a link to something really important.Item oneItem twoItem threeContact us at hello@example.com for more info.",
  },
  { label: "6 · no tags ✎", html: `no tags here, just words`, want: "no tags here, just words", mine: true },
  { label: "7 · > in attribute ✎", html: `<a title="5 > 3">math</a>`, want: "math", mine: true },
];

// The solution, instrumented: same single pass, but it also records the state
// each character was decided in so the demo can colour it. `out` is identical to
// what the shipped `code` returns.
function scan(html) {
  let out = "";
  let inTag = false;
  let quote = "";
  const marks = [];
  for (const ch of html) {
    let state;
    if (!inTag) {
      if (ch === "<") { inTag = true; state = "open"; }
      else { out += ch; state = "text"; }
    } else if (quote) {
      if (ch === quote) { quote = ""; state = "qend"; }
      else state = "val";
    } else if (ch === '"' || ch === "'") { quote = ch; state = "qstart"; }
    else if (ch === ">") { inTag = false; state = "close"; }
    else state = "tag";
    marks.push({ ch, state });
  }
  return { out, marks, unterminated: inTag };
}

// The one-liner, for the side-by-side contrast only. Never the shipped answer.
const naive = (html) => html.replace(/<[^>]*>/g, "");

const CELL_CLASS = { text: "t", open: "d", close: "d", tag: "m", qstart: "q", qend: "q", val: "v" };
// A visible glyph for whitespace — display only; the value counted is the real char.
const GLYPH = { " ": "·", "\n": "↵", "\t": "⇥" };
const TAPE_CAP = 1200;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .hxt-ta { width:100%; box-sizing:border-box; min-height:76px; resize:vertical; margin-top:4px;
              font:13px/1.6 var(--mono); color:var(--text); background:var(--panel-2);
              border:1px solid var(--border); border-radius:7px; padding:8px 10px; }
    .hxt-tape { display:flex; flex-wrap:wrap; gap:2px; align-items:center; margin:12px 0 0; padding:9px;
                border:1px solid var(--border); border-radius:9px; background:var(--panel);
                max-height:230px; overflow:auto; }
    .hxt-c { min-width:14px; height:22px; padding:0 2px; display:flex; align-items:center; justify-content:center;
             font:700 12px var(--mono); border-radius:4px; border:1px solid transparent; white-space:pre; }
    .hxt-c.t, .hxt-sw.t { background:color-mix(in srgb, var(--good) 20%, transparent); border-color:var(--good); color:var(--good); }
    .hxt-c.m, .hxt-sw.m { background:var(--panel-2); border-color:var(--border); color:var(--muted); }
    .hxt-c.d, .hxt-sw.d { background:color-mix(in srgb, var(--accent) 26%, transparent); border-color:var(--accent); color:var(--accent); }
    .hxt-c.q, .hxt-sw.q { background:color-mix(in srgb, var(--warn) 24%, transparent); border-color:var(--warn); color:var(--warn); }
    .hxt-c.v, .hxt-sw.v { background:color-mix(in srgb, var(--warn) 10%, transparent); color:var(--warn);
                          border-color:color-mix(in srgb, var(--warn) 45%, transparent); }
    .hxt-c.m { opacity:.7; }
    .hxt-c.trap { border-color:var(--danger); color:var(--danger); font-weight:800;
                  box-shadow:0 0 0 2px color-mix(in srgb, var(--danger) 45%, transparent); }
    .hxt-c.ws { opacity:.5; }
    .hxt-legend { display:flex; flex-wrap:wrap; gap:14px; font:11.5px var(--sans); color:var(--muted); margin-top:8px; }
    .hxt-sw { display:inline-block; width:11px; height:11px; border-radius:3px;
              margin-right:6px; vertical-align:-1px; border:1px solid var(--border); }
    .hxt-out { font:700 13.5px var(--mono); color:var(--good); white-space:pre-wrap; word-break:break-word;
               background:color-mix(in srgb, var(--good) 10%, transparent);
               border:1px solid var(--good); border-radius:8px; padding:7px 10px; }
    .hxt-out.empty { color:var(--muted); border-color:var(--border); background:var(--panel-2); font-weight:400; }
    .hxt-naive { font:12.5px var(--mono); color:var(--muted); margin-top:14px; line-height:1.8; }
    .hxt-naive b { color:var(--text); }
    .hxt-naive .wrong { color:var(--danger); font-weight:700; }
    .hxt-naive .same { color:var(--good); font-weight:700; }
    .hxt-got { font:700 12.5px var(--mono); color:var(--danger); white-space:pre-wrap; word-break:break-word;
               background:color-mix(in srgb, var(--danger) 10%, transparent);
               border:1px solid var(--danger); border-radius:8px; padding:6px 10px; margin-top:5px; }
  `));
}

function mount(host) {
  ensureStyle();

  // The input is a free-form textarea: every official case is typeable, and the
  // chips below are only shortcuts. Nothing typed here is ever parsed as HTML.
  const ta = el("textarea", "hxt-ta");
  ta.value = CASES[6].html;
  ta.spellcheck = false;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { ta.value = c.html; render(); };
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", `Type or paste any HTML. Every character is shown as <b>escaped text</b> — this page never renders your input as markup — and coloured by the state the scan was in when it read it: <b>outside a tag</b> (kept), <b>inside a tag</b> (dropped), or <b>inside a quoted attribute value</b>, where a <code class="inl">&gt;</code> is just a character. Chips 1–5 are freeCodeCamp's official cases; 6–7 are ours (✎). Open chip <b>7</b>, or type a <code class="inl">&gt;</code> between the quotes of an attribute, to watch the one-liner split the tag in the wrong place.`),
    el("div", "controls", `<span class="ctl-label">html =</span>`),
    ta, pre, out,
  );
  ta.oninput = render;
  render();

  function render() {
    const html = ta.value;
    const { out: text, marks, unterminated } = scan(html);
    const rx = naive(html);
    const known = CASES.find((c) => c.html === html);

    out.innerHTML = "";

    // ── the tape: one cell per character, coloured by scan state ──────────────
    const tape = el("div", "hxt-tape");
    if (!marks.length) tape.append(el("span", "muted", "(empty input — nothing to scan)"));
    marks.slice(0, TAPE_CAP).forEach((m) => {
      const ws = GLYPH[m.ch];
      // The trap: a ">" that did NOT close the tag because it sits inside quotes.
      const trap = m.state === "val" && m.ch === ">";
      const cell = el("span", `hxt-c ${CELL_CLASS[m.state]}${ws ? " ws" : ""}${trap ? " trap" : ""}`);
      cell.textContent = ws || m.ch;          // textContent, never innerHTML
      cell.title = trap
        ? '">" inside a quoted attribute value — an ordinary character, not the end of the tag'
        : m.state;
      tape.append(cell);
    });
    if (marks.length > TAPE_CAP) tape.append(el("span", "more", `+${marks.length - TAPE_CAP} more`));
    out.append(tape);

    out.append(el("div", "hxt-legend",
      `<span><i class="hxt-sw t"></i>content — copied out</span>` +
      `<span><i class="hxt-sw m"></i>inside a tag — dropped</span>` +
      `<span><i class="hxt-sw d"></i><code class="inl">&lt;</code> <code class="inl">&gt;</code> the region's edges</span>` +
      `<span><i class="hxt-sw q"></i>quote — opens/closes a value</span>` +
      `<span><i class="hxt-sw v"></i>inside a quoted value</span>`));

    // ── the extracted text, assembling beneath ───────────────────────────────
    const res = el("div", "result-line");
    res.append(el("span", "muted mono", "extractContent(html) ="));
    out.append(res);
    const box = el("div", "hxt-out" + (text === "" ? " empty" : ""));
    box.textContent = text !== "" ? text
      : html === "" ? "(empty string — nothing was given to scan)"
      : "(empty string — every character was markup)";
    out.append(box);

    if (known) {
      const ok = text === known.want;
      out.append(el("div", "result-line",
        `<span class="badge ${ok ? "ok" : "no"}">${ok ? "✓" : "✗"} ${ok ? "matches" : "does not match"} the expected answer</span>` +
        `<span class="tag muted">${known.mine ? "our case" : "official case"}</span>`));
    }

    if (unterminated) {
      out.append(el("div", "note", `The last <code class="inl">&lt;</code> is never closed, so the scan ends still inside a tag and everything after it is dropped. That is what a browser's tokenizer does too — an unfinished tag at end-of-input emits no text.`));
    }

    // ── the one-liner, on this same input (337's "if / were worth five" idiom) ──
    const nv = el("div", "hxt-naive");
    if (rx === text) {
      nv.innerHTML = `The one-liner <b>html.replace(/&lt;[^&gt;]*&gt;/g, "")</b> answers the <span class="same">same thing</span> here — as it does on all five official inputs, which is why it passes the grader. Its <code class="inl">[^&gt;]*</code> stops at the first <code class="inl">&gt;</code> it meets, and every official input keeps its <code class="inl">&gt;</code> characters outside the quotes.`;
      out.append(nv);
    } else {
      nv.innerHTML = `The one-liner <b>html.replace(/&lt;[^&gt;]*&gt;/g, "")</b> answers <span class="wrong">something else</span> on this input:`;
      out.append(nv);
      const got = el("div", "hxt-got");
      got.textContent = rx === "" ? "(empty string)" : rx;
      out.append(got);
      out.append(el("div", "note", `<code class="inl">[^&gt;]*</code> is "any run of non-<code class="inl">&gt;</code> characters", and a regex has no notion of being <i>inside</i> anything — so it ends the tag at the <code class="inl">&gt;</code> that sits between the quotes and leaves the rest of the attribute behind as text. The scan doesn't, because <code class="inl">quote</code> remembers that the current region is an attribute value where <code class="inl">&gt;</code> means nothing. That memory is the whole difference between a pattern and a state machine.`));
    }

    out.append(el("div", "note", `Two things the statement doesn't ask for, so the scan doesn't do them: <b>whitespace is never collapsed</b> (official case 5 expects <code class="inl">Website.This</code> run together, with no space invented between the tags) and <b>entities are never decoded</b> — <code class="inl">&amp;amp;</code> is content, and content is copied as-is.`));
  }
}

// ── STEP — the scan, one character at a time ─────────────────────────────────
// The step-through curates for trace length: official cases 4 and 5 are 250 and
// 530 characters, i.e. hundreds of steps, so they are dropped HERE and stay
// reachable in the demo above (chips 4 and 5, or by typing). Cases 1–3 below are
// freeCodeCamp's first three official inputs; 4–5 are ours — the degenerate
// no-tag input, and the ">"-inside-an-attribute case the one-liner splits wrong.
const STEP_CASES = [
  `<p>hello world</p>`,
  `<p>hello <span>world</span></p>`,
  `<a href="example.com">Click me</a>`,
  `no tags here`,
  `<a title="5 > 3">math</a>`,
];

const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">extractContent</span>(<span class="tok" data-t="html">html</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> <span class="tok" data-t="out">out = <span class="st">""</span></span>;` },
  { ln: 3,  html: `  <span class="k">let</span> <span class="tok" data-t="intag">inTag = <span class="k">false</span></span>;` },
  { ln: 4,  html: `  <span class="k">let</span> <span class="tok" data-t="quote">quote = <span class="st">""</span></span>;` },
  { ln: 5,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop">ch <span class="k">of</span> html</span>) {` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="notin">!inTag</span>) {` },
  { ln: 7,  html: `      <span class="k">if</span> (<span class="tok" data-t="open">ch === <span class="st">"&lt;"</span></span>) inTag = <span class="k">true</span>;` },
  { ln: 8,  html: `      <span class="k">else</span> <span class="tok" data-t="keep">out += ch</span>;` },
  { ln: 9,  html: `    } <span class="k">else if</span> (<span class="tok" data-t="inq">quote</span>) {` },
  { ln: 10, html: `      <span class="k">if</span> (<span class="tok" data-t="qend">ch === quote</span>) quote = <span class="st">""</span>;` },
  { ln: 11, html: `    } <span class="k">else if</span> (<span class="tok" data-t="isq">ch === <span class="st">'"'</span> || ch === <span class="st">"'"</span></span>) {` },
  { ln: 12, html: `      <span class="tok" data-t="qstart">quote = ch</span>;` },
  { ln: 13, html: `    } <span class="k">else if</span> (<span class="tok" data-t="close">ch === <span class="st">"&gt;"</span></span>) {` },
  { ln: 14, html: `      <span class="tok" data-t="shut">inTag = <span class="k">false</span></span>;` },
  { ln: 15, html: `    }` },
  { ln: 16, html: `  }` },
  { ln: 17, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 18, html: `}` },
];

const box = (c) => (GLYPH[c] ? "␣" : c);          // struct boxes need a visible glyph
const q = (s) => `"${s}"`;
const show = (c) => `<code class='inl'>${esc(GLYPH[c] || c)}</code>`;

function trace(caseIndex) {
  const k = Math.max(1, Math.min(STEP_CASES.length, caseIndex | 0));
  const html = STEP_CASES[k - 1];
  const steps = [];
  let out = "", inTag = false, quote = "", ch, inLoop = false;

  const S = (line, note, x = {}) => {
    const vars = { html: q(html) };
    if (line >= 3) vars.inTag = inTag;                             // `let inTag` is line 3
    if (line >= 4) vars.quote = quote === "" ? '""' : q(quote);    // `let quote` is line 4
    if (inLoop && line >= 5 && line <= 16) vars.ch = q(GLYPH[ch] || ch);  // loop binding only
    const structs = [];
    if (line >= 2) structs.push({ label: "out", items: [...out].map(box), newest: !!x.kept }); // `let out` is line 2
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "extractContent", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Pull the plain text out of <b>${esc(q(html))}</b>. The statement is one sentence — <i>return the plain text content with all tags removed</i> — so the whole job is deciding, for each character, whether it is inside a tag or outside one.`, { focus: "html" });

  S(2, `<b>out</b> starts empty. We build the answer by <b>copying what we keep</b> rather than cutting out what we don't: at the moment we meet a <code class='inl'>&lt;</code> we have no idea where its tag ends, so there is no substring to delete yet.`, { focus: "out" });

  S(3, `<b>inTag = false</b> — we begin outside any tag. This single boolean <i>is</i> the state machine, and it is why nested tags need no extra bookkeeping: markup can't be nested <i>inside markup</i>, so you can never be "twice inside" a tag and a counter would buy nothing.`, { focus: "intag", changed: ["inTag"] });

  S(4, `<b>quote = ""</b> — not inside a quoted attribute value. This is the only subtlety in the problem: inside quotes, a <code class='inl'>&gt;</code> is an ordinary character. Storing the quote <i>character</i> rather than a second boolean is what lets a value opened with <code class='inl'>"</code> legally contain a <code class='inl'>'</code>.`, { focus: "quote", changed: ["quote"] });

  inLoop = true;
  S(5, `Walk the string left to right, one character at a time — no lookahead, no backtracking, one pass. Length ${[...html].length}.`, { focus: "loop" });

  const chars = [...html];
  chars.forEach((c, i) => {
    ch = c;
    const at = `<span class="muted">(${i + 1}/${chars.length})</span>`;
    if (!inTag) {
      if (c === "<") {
        inTag = true;
        S(7, `${show(c)} ${at} — the tag region <b>opens</b>. Set <b>inTag = true</b> and stop copying: everything from here to the matching <code class='inl'>&gt;</code> is markup, and the statement says all of it goes.`,
          { focus: "open", changed: ["ch", "inTag"], eval: { expr: `ch === "<"`, val: true } });
      } else {
        out += c;
        S(8, `${show(c)} ${at} is outside every tag, so it is <b>content</b> — append it to <b>out</b> (now ${out.length} character${out.length === 1 ? "" : "s"}). Note what we are <i>not</i> doing: no trimming, no collapsing runs of spaces. The grader's expected answers keep the spacing exactly as it arrived.`,
          { focus: "keep", changed: ["ch"], kept: true, eval: { expr: `ch === "<"`, val: false } });
      }
    } else if (quote) {
      if (c === quote) {
        quote = "";
        S(10, `${show(c)} ${at} matches the quote that opened the value, so the value <b>ends</b> and <b>quote</b> goes back to <code class='inl'>""</code>. From the next character on, <code class='inl'>&gt;</code> means "end of tag" again.`,
          { focus: "qend", changed: ["ch", "quote"], eval: { expr: `ch === quote`, val: true } });
      } else if (c === ">") {
        S(10, `${show(c)} ${at} — and here is the whole point of <b>quote</b>. We are inside a quoted attribute value, so this <code class='inl'>&gt;</code> is <b>not</b> the end of the tag; it is a character in the value, exactly as a browser's tokenizer treats it. The one-liner <code class='inl'>replace(/&lt;[^&gt;]*&gt;/g, "")</code> has no notion of being <i>inside</i> anything, so it ends the tag right here and leaves the rest of the attribute behind as text.`,
          { focus: "qend", changed: ["ch"], eval: { expr: `ch === quote`, val: false } });
      } else {
        S(9, `${show(c)} ${at} is part of the quoted value — and this is the arm that decides it, because <b>quote</b> is still set. While it is, the only character in the whole tag with any meaning is the closing <code class='inl'>${esc(quote)}</code>; everything else is just value text.`,
          { focus: "inq", changed: ["ch"], eval: { expr: `quote !== ""`, val: true } });
      }
    } else if (c === '"' || c === "'") {
      S(11, `${show(c)} ${at} is a quote character, and we are <b>not</b> already inside a value — so this one <b>opens</b> a quoted attribute value rather than closing one. The test has to run here, third in the chain, because a quote met while <b>quote</b> is already set means the opposite thing.`,
        { focus: "isq", changed: ["ch"], eval: { expr: `ch === '"' || ch === "'"`, val: true } });
      quote = c;
      S(12, `Record <i>which</i> quote opened it: <b>quote = ${esc(q(c))}</b>. A boolean wouldn't do — a value opened with <code class='inl'>${esc(c)}</code> may legally contain the other quote character, so only a matching <code class='inl'>${esc(c)}</code> can close it. For as long as it is open, <code class='inl'>&gt;</code> loses its meaning.`,
        { focus: "qstart", changed: ["quote"] });
    } else if (c === ">") {
      inTag = false;
      S(14, `${show(c)} ${at} sits outside any quoted value, so the tag <b>closes</b>: <b>inTag = false</b> and copying resumes. Notice we never looked at the tag's <i>name</i> or its attributes — "remove all tags" doesn't ask which tag it was, so the scan only ever needed to know where the region ended.`,
        { focus: "shut", changed: ["ch", "inTag"], eval: { expr: `ch === ">"`, val: true } });
    } else {
      S(13, `${show(c)} ${at} is inside the tag — part of a name or an attribute — so it is <b>dropped</b>. The machine doesn't parse it; it is only waiting for the character that ends the region.`,
        { focus: "close", changed: ["ch"], eval: { expr: `ch === ">"`, val: false } });
    }
  });

  inLoop = false;
  S(5, `The string is exhausted, so <code class='inl'>for…of</code> has nothing left to hand out and the loop ends — which is why <b>ch</b> disappears from the frame here: it was bound per iteration and there is no iteration left.`,
    { focus: "loop", eval: { expr: `another character in html`, val: false } });

  const rx = naive(html);
  S(17, `<b>Return ${esc(q(out))}</b> — ${out.length} of the ${chars.length} characters survived; the other ${chars.length - out.length} were markup. ` +
    (rx === out
      ? `The one-liner <code class='inl'>replace(/&lt;[^&gt;]*&gt;/g, "")</code> agrees on this input, which is exactly why it clears all five official assertions — try case ${STEP_CASES.length} to see where it doesn't.`
      : `The one-liner <code class='inl'>replace(/&lt;[^&gt;]*&gt;/g, "")</code> answers <b>${esc(q(rx))}</b> instead: it ended the tag at the <code class='inl'>&gt;</code> inside the quotes. Same five official passes, different answer here — which is why only one of the two can ship.`),
    { focus: "ret", done: true, result: out, ret: { value: out } });

  return steps;
}

export default {
  n: 306, id: "htmlextract", title: "HTML Content Extractor", dates: ["2026-06-12"],
  statement: `Given a string of HTML, return the plain text content with all tags removed. <span class="rule">Example: <code class="inl">extractContent("&lt;p&gt;hello &lt;span&gt;world&lt;/span&gt;&lt;/p&gt;")</code> → <b>"hello world"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass",
      approach: `A tag is a <b>region you are inside</b>, not a pattern you match. Carry one boolean: outside it, every character is content and gets copied; inside it, every character is markup and gets dropped. Nesting needs nothing extra — markup can't sit inside markup, so you can never be twice inside a tag. The one subtlety is the second, smaller region: a <code class='inl'>&gt;</code> inside a <b>quoted attribute value</b> is an ordinary character, so remember <i>which</i> quote opened the value and let only its match close it. That single extra variable is the entire difference from <code class='inl'>html.replace(/&lt;[^&gt;]*&gt;/g, "")</code>, which passes all five official tests and still mis-splits <code class='inl'>&lt;a title="5 &gt; 3"&gt;</code> — watch the contrast line under the demo, and open chip <b>7</b>.`,
      code: `// A tag is a REGION, not a pattern. Walk the string once holding one flag —
// am I inside a tag or not? — and copy out only the characters that fall
// outside. The one subtlety is that a ">" inside a QUOTED attribute value is
// an ordinary character, not the end of the tag, so a quote opens a smaller
// region where ">" loses its meaning until the matching quote closes it.
function extractContent(html: string): string {
  let out = "";
  let inTag = false;
  let quote = "";                              // "" outside a quoted value, else " or '
  for (const ch of html) {
    if (!inTag) {
      if (ch === "<") inTag = true;            // markup starts — stop copying
      else out += ch;                          // plain content — keep it
    } else if (quote) {
      if (ch === quote) quote = "";            // the matching quote closes the value
    } else if (ch === '"' || ch === "'") {
      quote = ch;                              // inside a value, ">" is just text
    } else if (ch === ">") {
      inTag = false;                           // markup ends — resume copying
    }
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `The scan one character at a time. Watch the two state variables do all the work: <b>inTag</b> flips at <code class='inl'>&lt;</code> and <code class='inl'>&gt;</code>, and <b>quote</b> — visible only once line 4 has run — holds the quote character while an attribute value is open. The <b>out</b> struct grows by exactly the characters the loop chose to keep. Case <b>3</b> is the first with a quoted attribute; case <b>5</b> is the one that matters, where a <code class='inl'>&gt;</code> arrives <i>inside</i> the quotes and the machine correctly ignores it. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 5, min: 1, max: STEP_CASES.length,
          presets: STEP_CASES.map((_, i) => i + 1),
          hint: `1–${STEP_CASES.length}: 1–3 official, 4–5 ours`,
        },
      }),
    },
  ],
};
