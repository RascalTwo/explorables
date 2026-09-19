// #330 · Lowercase Words — keep only the words that are entirely lowercase.
// Split on spaces, keep each word where word === word.toLowerCase(), rejoin.
import { el, esc, mountDebugger } from "../shared.js";

// All 5 official freeCodeCamp test cases, verbatim and in order. No added cases.
const PRESETS = [
  "hello GOOD world",
  "these are all lowercase",
  "less is NoT more",
  "DonT eat pizza every OTHER day",
  "the Super quick AND snEaky brown fox Leapt anD jumped over aNd AROUND the lazy SloW dog",
];

const isLower = (w) => w === w.toLowerCase();

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .lw-wrap { margin-top:14px; }
    .lw-tag { font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin:14px 0 6px; }
    .lw-words { display:flex; flex-wrap:wrap; gap:7px; }
    .lw-tok { position:relative; font:700 14px var(--mono); padding:6px 11px; border-radius:8px;
      border:1px solid var(--border); background:var(--panel-2); color:var(--text); transition:all .15s; }
    .lw-tok.keep { border-color:var(--good); background:color-mix(in srgb,var(--good) 16%,var(--panel));
      color:var(--good); box-shadow:0 0 0 1px color-mix(in srgb,var(--good) 30%,transparent); }
    .lw-tok.drop { opacity:.4; text-decoration:line-through; text-decoration-color:var(--danger);
      text-decoration-thickness:2px; border-style:dashed; }
    .lw-mk { position:absolute; top:-8px; right:-6px; font:800 11px var(--sans); width:17px; height:17px;
      border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .lw-tok.keep .lw-mk { background:var(--good); color:var(--bg); }
    .lw-tok.drop .lw-mk { background:var(--danger); color:var(--bg); }
    .lw-result { display:flex; flex-wrap:wrap; gap:7px; align-items:center; margin-top:6px;
      padding:12px 14px; border-radius:10px; border:1px solid var(--good);
      background:color-mix(in srgb,var(--good) 8%,var(--panel)); font:800 16px var(--mono); }
    .lw-result .empty { color:var(--muted); font:600 13px var(--sans); }
    .lw-stat { display:inline-flex; align-items:baseline; gap:7px; font:600 13px var(--sans);
      color:var(--muted); margin-top:12px; }
    .lw-stat b { font:800 20px var(--mono); color:var(--accent); }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = PRESETS[0]; inp.style.width = "min(100%, 420px)";
  ctl.append(el("span", "ctl-label", "sentence"), inp);
  const chips = el("div", "controls");
  PRESETS.forEach((s) => {
    const short = s.length > 34 ? s.slice(0, 32) + "…" : s;
    const c = el("button", "chip", esc(short));
    c.onclick = () => { inp.value = s; render(); };
    chips.append(c);
  });
  const out = el("div", "lw-wrap");
  host.append(ctl, chips, out);
  inp.oninput = render;
  render();

  function render() {
    const words = inp.value.split(" ").filter((w) => w.length > 0);
    if (!words.length) { out.innerHTML = `<div class="note">Type a sentence to see which words survive.</div>`; return; }
    const kept = words.filter(isLower);

    const toks = words.map((w) => {
      const keep = isLower(w);
      return `<span class="lw-tok ${keep ? "keep" : "drop"}">${esc(w)}<span class="lw-mk">${keep ? "✓" : "✕"}</span></span>`;
    }).join("");

    const result = kept.length
      ? kept.map((w) => `<span>${esc(w)}</span>`).join(`<span style="color:var(--muted);font-weight:400">·</span>`)
      : `<span class="empty">(no all-lowercase words — result is "")</span>`;

    out.innerHTML = `
      <div class="lw-tag">Each word · <b style="color:var(--good)">✓</b> entirely lowercase, <b style="color:var(--danger)">✕</b> has an uppercase letter</div>
      <div class="lw-words">${toks}</div>
      <div class="lw-tag">Reassembled result</div>
      <div class="lw-result">${result}</div>
      <div class="lw-stat">kept <b>${kept.length}</b> of <b>${words.length}</b> word${words.length === 1 ? "" : "s"}</div>
      <div class="note">A word is kept iff it equals its own lowercased form — <code class="inl">word === word.toLowerCase()</code>. Any capital letter (like <b>G</b> in "GOOD" or the trailing <b>T</b> in "DonT") fails the test, so the whole word is dropped. The kept words rejoin in order with a single space.</div>`;
  }
}

// ── STEP — the filter as a line-by-line debugger ─────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getLowercaseWords</span>(str) {` },
  { ln: 2, html: `  <span class="k">const</span> words = str.<span class="fn">split</span>(<span class="st">" "</span>);` },
  { ln: 3, html: `  <span class="k">const</span> kept = [];` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> word <span class="k">of</span> words) {` },
  { ln: 5, html: `    <span class="k">const</span> isLower = <span class="tok" data-t="test">word === word.<span class="fn">toLowerCase</span>()</span>;` },
  { ln: 6, html: `    <span class="k">if</span> (isLower) kept.<span class="fn">push</span>(word);` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> kept.<span class="fn">join</span>(<span class="st">" "</span>);` },
  { ln: 9, html: `}` },
];

function trace(input) {
  const str = String(input);
  const words = str.split(" ").filter((w) => w.length > 0);
  const kept = [];
  const steps = [];
  let word = null, isLow = null, done = false;

  const frames = (opt = {}) => {
    const vars = { str: `"${str}"` };
    if (opt.words) vars.words = `[${words.length}]`;
    if (opt.word) vars.word = `"${word}"`;
    if (opt.isLower) vars.isLower = String(isLow);
    return [{
      title: "getLowercaseWords(str)",
      vars, changed: opt.changed || [],
      structs: [{ label: "kept", items: kept.map((w) => `"${w}"`), newest: !!opt.newest }],
    }];
  };
  const S = (line, note, opt = {}) => steps.push({
    line, note, focus: opt.focus, eval: opt.eval, done: opt.done, result: opt.result, frames: frames(opt),
  });

  S(1, `Call <b>getLowercaseWords</b> — keep only the words that are <b>entirely lowercase</b>, in order, rejoined with single spaces.`);
  S(2, `Split the string on spaces into <b>${words.length}</b> word${words.length === 1 ? "" : "s"}.`, { words: true, changed: ["words"] });
  S(3, `Start an empty <b>kept</b> list — words that pass the test land here.`, { words: true });

  for (const w of words) {
    word = w;
    S(4, `Take the next word: <b>"${esc(w)}"</b>.`, { words: true, word: true, changed: ["word"] });
    isLow = isLower(w);
    S(5, `Is it all lowercase? <b>"${esc(w)}" === "${esc(w.toLowerCase())}"</b> → <b>${isLow}</b>.`,
      { words: true, word: true, isLower: true, focus: "test", changed: ["isLower"],
        eval: { expr: `"${w}" === "${w.toLowerCase()}"`, val: isLow } });
    if (isLow) {
      kept.push(w);
      S(6, `<b>isLower</b> is true — <b>push "${esc(w)}"</b>. kept now holds <b>${kept.length}</b> word${kept.length === 1 ? "" : "s"}.`,
        { words: true, word: true, isLower: true, newest: true });
    } else {
      S(6, `<b>isLower</b> is false — <b>"${esc(w)}"</b> has an uppercase letter, so it is skipped.`,
        { words: true, word: true, isLower: true });
    }
  }
  done = true;
  const result = kept.join(" ");
  S(8, `Every word checked. Join the kept words with spaces → <b>"${esc(result)}"</b>.`,
    { words: true, done: true, result: `"${result}"` });
  return steps;
}

export default {
  n: 330, id: "lowerwords", title: "Lowercase Words", dates: ["2026-07-06"],
  statement: `Given a string, return only the words that are <b>entirely lowercase</b>, in their original order and separated by a single space. A word qualifies when it equals its own lowercased form — <code class="inl">word === word.toLowerCase()</code> — so any capital letter drops the whole word. <span class="rule">Example: <code class="inl">getLowercaseWords("hello GOOD world")</code> → <code class="inl">"hello world"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `Split the sentence on spaces into words, keep each word for which <code class="inl">word === word.toLowerCase()</code> (it contains no uppercase letters), then <code class="inl">join</code> the survivors back together with a single space. One linear pass over the characters.`,
      code: `function getLowercaseWords(str: string): string {
  return str
    .split(" ")
    .filter((word) => word === word.toLowerCase())
    .join(" ");
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the filter — run it one line at a time. Watch the sentence <b>split</b> into words, each word tested with <code class="inl">word === word.toLowerCase()</code>, the passing words <b>push</b> into <code class="inl">kept</code>, and the final <b>join</b> reassemble the answer. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "str =", value: "hello GOOD world", presets: PRESETS, hint: "a sentence" } }),
    },
  ],
};
