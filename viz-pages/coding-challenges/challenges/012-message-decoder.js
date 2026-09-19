// #12 · Message Decoder — the alphabet is a ring, so decoding is one subtraction.
// • BRUTE: step the letter round the ring once per unit of shift, wrapping by
//   hand at each end — |shift| hops for every single character.
// • OPT: ((p - shift) % 26 + 26) % 26 lands in one move. The doubled modulo is
//   not superstition: JS's % keeps the sign, so -19 % 26 is -19, not 7.
// Open case is the official shift-20 one: 200 hops against 10 modulo ops.
import { el, esc, mountDebugger } from "../shared.js";

const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const isLetter = (ch) => /[a-zA-Z]/.test(ch);
const pos = (ch) => ch.toUpperCase().charCodeAt(0) - 65;

// All four official freeCodeCamp cases, in the grader's order: a full sentence
// with punctuation, the large shift, the negative shift, and the one with no
// spaces and interior capitals. Between them they cover every rule the statement
// states — case preserved, non-letters untouched, both shift directions.
const PRESETS = [
  { message: "Xlmw mw e wigvix qiwweki.", shift: 4 },
  { message: "Byffi Qilfx!", shift: 20 },
  { message: "Zqd xnt njzx?", shift: -1 },
  { message: "oannLxmnLjvy", shift: 9 },
];

const decode = (message, shift) => [...message].map((ch) => {
  if (!isLetter(ch)) return ch;
  const base = ch < "a" ? 65 : 97;
  return String.fromCharCode(base + (((ch.charCodeAt(0) - base - shift) % 26) + 26) % 26);
}).join("");

const letterCount = (message) => [...message].filter(isLetter).length;

// Same U+2212 minus the surrounding arithmetic is written with, so a negative
// shift doesn't render as "25 − (-1)" with two different minus glyphs.
const signed = (n) => (n < 0 ? "\u2212" + Math.abs(n) : String(n));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .dc-wrap { display:flex; flex-direction:column; gap:12px; }
    .dc-row { display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
    .dc-svg { width:240px; max-width:100%; height:auto; flex:0 0 auto; }
    .dc-svg text { font-family:var(--mono); }
    .dc-ring { fill:none; stroke:var(--border); stroke-width:1.5; }
    .dc-l { fill:var(--muted); font-size:11px; font-weight:700; text-anchor:middle; dominant-baseline:middle; }
    .dc-l.from { fill:var(--warn); font-size:14px; font-weight:800; }
    .dc-l.to { fill:var(--good); font-size:14px; font-weight:800; }
    .dc-l.via { fill:var(--text); }
    .dc-hop { fill:var(--accent); }
    .dc-arc { fill:none; stroke:var(--accent); stroke-width:2.5; stroke-linecap:round; }
    .dc-arc.jump { stroke:var(--good); stroke-dasharray:none; }
    .dc-mid { fill:var(--text); font-size:12px; font-weight:800; text-anchor:middle; }
    .dc-sub { fill:var(--muted); font-size:10px; text-anchor:middle; }
    .dc-side { flex:1 1 250px; min-width:220px; display:flex; flex-direction:column; gap:7px; }
    .dc-math { font:12.5px var(--mono); color:var(--muted); line-height:1.7; }
    .dc-math b { color:var(--text); } .dc-math .neg { color:var(--danger); } .dc-math .fix { color:var(--good); }
    .dc-strip { display:flex; flex-wrap:wrap; gap:3px; }
    .dc-c { min-width:22px; text-align:center; padding:4px 3px; border-radius:6px; border:1px solid transparent;
            font:800 14px var(--mono); color:var(--muted); background:var(--panel-2); cursor:pointer; }
    .dc-c.skip { background:transparent; color:var(--muted); opacity:.55; cursor:default; }
    .dc-c.on { border-color:var(--warn); color:var(--warn); }
    .dc-c:hover:not(.skip):not(.on) { border-color:var(--border); color:var(--text); }
    .dc-out { font:800 17px var(--mono); color:var(--good); word-break:break-word; }
    .dc-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
  `));
}

// One ring, drawn two ways. `hops` renders each intermediate letter as a dot (the
// brute's per-step walk); without it the arc is a single jump (the modulo).
function ring(from, to, shift, { hops }) {
  const C = 120, R = 88, RA = 66;
  const ang = (p) => ((p * 360) / 26 - 90) * (Math.PI / 180);
  const at = (p, r) => [C + r * Math.cos(ang(p)), C + r * Math.sin(ang(p))];

  const back = shift > 0;              // decoding a forward shift walks backwards
  const steps = Math.abs(shift);
  const visited = [];
  for (let k = 1; k <= Math.min(steps, 26); k++) visited.push(((from + (back ? -k : k)) % 26 + 26) % 26);

  let letters = "";
  for (let p = 0; p < 26; p++) {
    const [x, y] = at(p, R);
    const cls = p === from ? "from" : p === to ? "to" : hops && visited.includes(p) ? "via" : "";
    letters += `<text class="dc-l ${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${A[p]}</text>`;
  }

  let dots = "";
  if (hops) for (const p of visited.slice(0, -1)) {
    const [x, y] = at(p, RA);
    dots += `<circle class="dc-hop" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`;
  }

  // Residual arc from `from` to `to` in the direction of travel. Whole laps are
  // not drawable, so they're reported in the caption instead.
  const spanSteps = back ? ((from - to) % 26 + 26) % 26 : ((to - from) % 26 + 26) % 26;
  const [x0, y0] = at(from, RA), [x1, y1] = at(to, RA);
  const large = spanSteps * (360 / 26) > 180 ? 1 : 0;
  const sweep = back ? 0 : 1;
  const arc = spanSteps === 0 ? "" :
    `<path class="dc-arc${hops ? "" : " jump"}" d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${RA} ${RA} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;

  const laps = Math.floor(steps / 26);
  return `<svg class="dc-svg" viewBox="0 0 240 240" role="img" aria-label="alphabet ring">` +
    `<circle class="dc-ring" cx="${C}" cy="${C}" r="${R}"/>` + arc + dots + letters +
    `<text class="dc-mid" x="${C}" y="${C - 4}">${hops ? `${steps} hop${steps === 1 ? "" : "s"}` : `${shift > 0 ? "−" : "+"}${Math.abs(shift)} mod 26`}</text>` +
    `<text class="dc-sub" x="${C}" y="${C + 12}">${A[from]} → ${A[to]}${laps && hops ? ` · ${laps} full lap${laps === 1 ? "" : "s"} wasted` : ""}</text>` +
    `</svg>`;
}

// Shared controls plus the clickable message strip. `focus` is the index of the
// character the ring is currently showing; clicking a letter moves it.
function build(host, draw) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inMsg = el("input"); inMsg.type = "text"; inMsg.value = PRESETS[1].message; inMsg.style.width = "260px";
  const inSh = el("input"); inSh.type = "number"; inSh.value = "20"; inSh.style.width = "72px";
  ctl.append(el("span", "ctl-label", "message"), inMsg, el("span", "ctl-label", "shift"), inSh);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `"${p.message.slice(0, 16)}${p.message.length > 16 ? "…" : ""}" ${p.shift > 0 ? "+" : ""}${p.shift}`);
    c.onclick = () => { inMsg.value = p.message; inSh.value = String(p.shift); focus = null; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  let focus = null;
  inMsg.oninput = inSh.oninput = () => { focus = null; render(); };
  render();

  function render() {
    const message = inMsg.value;
    const shift = Math.trunc(+inSh.value) || 0;
    const chars = [...message];
    if (focus === null || !isLetter(chars[focus] ?? "")) focus = chars.findIndex(isLetter);

    out.innerHTML = "";
    const wrap = el("div", "dc-wrap");
    if (focus === -1) {
      wrap.append(el("div", "note", "Type a message containing at least one letter."));
      out.append(wrap); return;
    }

    const ch = chars[focus];
    const from = pos(ch);
    const to = ((from - shift) % 26 + 26) % 26;
    const upper = ch < "a";
    const dec = String.fromCharCode((upper ? 65 : 97) + to);

    // There are two distinct ways `p - shift` can leave 0–25, and only one of
    // them is the sign trap. A positive shift can drive it below zero, where JS's
    // sign-keeping `%` is why the second wrap exists; a negative shift can push
    // it past 25, where one modulo already does the job. Saying "JS keeps the
    // sign" on that second case would explain a mechanism that isn't running.
    const raw = from - shift;
    const m1 = raw % 26;
    const modNote = m1 < 0
      ? `, which falls <span class="neg">below the ring</span>.<br>` +
        `<b>${signed(raw)} % 26 = <span class="neg">${signed(m1)}</span></b> — still negative, because JavaScript's <code class='inl'>%</code> keeps the sign of the left operand. Add <b>26</b> and take the modulo again to land back on: <b class="fix">${to}</b>.`
      : raw > 25
        ? `, which runs <b>past the top</b> of the ring.<br>` +
          `<b>${raw} % 26 = <span class="fix">${m1}</span></b> — overflowing this way, the first modulo is already enough, so the <code class='inl'>+ 26) % 26</code> leaves it alone.`
        : `, already on the ring — both wraps are no-ops here.<br>Try <b>+20</b> for the negative case the double modulo exists for, or <b>−1</b> to see it overrun the other end.`;

    const row = el("div", "dc-row");
    row.innerHTML = ring(from, to, shift, { hops: draw === "hops" });
    const side = el("div", "dc-side");
    side.append(el("div", "dc-math", draw === "hops"
      ? `<b>'${esc(ch)}'</b> sits at position <b>${from}</b>.<br>` +
        `Walk <b>${Math.abs(shift)}</b> ${shift > 0 ? "step(s) backwards" : "step(s) forwards"}, wrapping by hand at each end.<br>` +
        `Land on <b>${to}</b> → <b>'${esc(dec)}'</b>, kept ${upper ? "upper" : "lower"}-case because the base was <b>${upper ? 65 : 97}</b>.`
      : `<b>'${esc(ch)}'</b> sits at position <b>${from}</b>.<br>` +
        `<b>${from} − (${signed(shift)}) = ${signed(raw)}</b>` + modNote +
        `<br>→ <b>'${esc(dec)}'</b>, case preserved by the base.`));
    row.append(side);
    wrap.append(row);

    wrap.append(el("div", "dc-lbl", "click any letter to send it round the ring"));
    const strip = el("div", "dc-strip");
    chars.forEach((c, i) => {
      const letter = isLetter(c);
      const cell = el("div", "dc-c" + (letter ? (i === focus ? " on" : "") : " skip"), c === " " ? "&nbsp;" : esc(c));
      if (letter) cell.onclick = () => { focus = i; render(); };
      strip.append(cell);
    });
    wrap.append(strip);

    wrap.append(el("div", "dc-lbl", "decoded"));
    wrap.append(el("div", "dc-out", esc(decode(message, shift))));

    const n = letterCount(message);
    wrap.append(el("div", "dc-row", draw === "hops"
      ? `<span class="opcount hot"><span class="n">${(n * Math.abs(shift)).toLocaleString("en-US")}</span> hops — ${n} letters × ${Math.abs(shift)}</span>`
      : `<span class="opcount cool"><span class="n">${n}</span> modulo steps — one per letter</span>`));
    wrap.append(el("div", "note", draw === "hops"
      ? `The walk is correct and it is genuinely how the ring behaves — but the cost scales with the <b>shift</b> as well as the message. At shift <b>${Math.abs(shift)}</b> that is <b>${Math.abs(shift)}</b> hops to answer a question one subtraction already knows${Math.abs(shift) >= 26 ? `, and ${Math.floor(Math.abs(shift) / 26)} of those laps return to where they started` : ""}. Non-letters are copied straight through — the strip greys them out.`
      : `One subtraction and one wrap per letter, whatever the shift is. Note what is <b>not</b> here: no alphabet lookup table, no branch for "did it fall off the end". Subtracting <code class='inl'>base</code> first (65 or 97) is what turns a character code into a ring position <i>and</i> preserves case for free — the same 0–25 arithmetic serves both.`));
    out.append(wrap);
  }
}

// ── STEP: walk the ring ─────────────────────────────────────────────────────
const SRC_WALK = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">decode</span>(<span class="tok" data-t="param">message</span>, <span class="tok" data-t="param">shift</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> out = <span class="st">""</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="ch">ch</span> <span class="k">of</span> message) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="alpha">!/[a-zA-Z]/.<span class="fn">test</span>(ch)</span>) { out += ch; <span class="k">continue</span>; }` },
  { ln: 5,  html: `    <span class="k">const</span> base = <span class="tok" data-t="base">ch &lt; <span class="st">"a"</span> ? 65 : 97</span>;` },
  { ln: 6,  html: `    <span class="k">let</span> p = <span class="tok" data-t="p">ch.<span class="fn">charCodeAt</span>(0) - base</span>;` },
  { ln: 7,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="k">k = 0; k &lt; Math.<span class="fn">abs</span>(shift)</span>; k++) {` },
  { ln: 8,  html: `      <span class="tok" data-t="hop">p += shift &gt; 0 ? -1 : 1</span>;` },
  { ln: 9,  html: `      <span class="k">if</span> (<span class="tok" data-t="wrap">p &lt; 0</span>) p = 25;` },
  { ln: 10, html: `      <span class="k">if</span> (<span class="tok" data-t="wrap">p &gt; 25</span>) p = 0;` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `    <span class="tok" data-t="emit">out += String.<span class="fn">fromCharCode</span>(base + p)</span>;` },
  { ln: 13, html: `  }` },
  { ln: 14, html: `  <span class="k">return</span> out;` },
  { ln: 15, html: `}` },
];

// ── STEP: one modulo ────────────────────────────────────────────────────────
const SRC_MOD = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">decode</span>(<span class="tok" data-t="param">message</span>, <span class="tok" data-t="param">shift</span>) {` },
  { ln: 2, html: `  <span class="k">return</span> [...message].<span class="fn">map</span>((<span class="tok" data-t="ch">ch</span>) =&gt; {` },
  { ln: 3, html: `    <span class="k">if</span> (<span class="tok" data-t="alpha">!/[a-zA-Z]/.<span class="fn">test</span>(ch)</span>) <span class="k">return</span> ch;` },
  { ln: 4, html: `    <span class="k">const</span> base = <span class="tok" data-t="base">ch &lt; <span class="st">"a"</span> ? 65 : 97</span>;` },
  { ln: 5, html: `    <span class="k">const</span> p = <span class="tok" data-t="p">ch.<span class="fn">charCodeAt</span>(0) - base</span>;` },
  { ln: 6, html: `    <span class="k">return</span> String.<span class="fn">fromCharCode</span>(base + <span class="tok" data-t="mod">((p - shift) % 26 + 26) % 26</span>);` },
  { ln: 7, html: `  }).<span class="fn">join</span>(<span class="st">""</span>);` },
  { ln: 8, html: `}` },
];

const parseCase = (raw) => {
  const i = String(raw).lastIndexOf("/");
  if (i < 0) return { message: String(raw), shift: 0 };
  return { message: String(raw).slice(0, i).trim(), shift: Math.trunc(+String(raw).slice(i + 1)) || 0 };
};

// The walk trace is |shift| hops per letter, so its presets are short phrases —
// a full official message at shift 20 is a 1,000-step trace. All four official
// cases run in full on the demo above and on the modulo step-through below.
const WALK_PRESETS = ["Xlmw / 4", "Byffi / 20", "Zqd xnt / -1", "oannLxmn / 9"];
const MOD_PRESETS = PRESETS.map((p) => `${p.message} / ${p.shift}`);

function traceWalk(raw) {
  const { message, shift } = parseCase(raw);
  const steps = [];
  const chars = [...message];
  let out = "", ch, base, p, k;
  const S = (line, note, x = {}) => {
    const vars = { shift, out: out === "" ? '""' : `"${out}"` };
    if (line >= 4 && ch !== undefined) vars.ch = `'${ch}'`;
    if (line >= 5 && line <= 12 && base !== undefined) vars.base = base;
    if (line >= 6 && line <= 12 && p !== undefined) vars.p = `${p} (${A[p]})`;
    if (line >= 7 && line <= 11 && k !== undefined) vars.k = k;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `decode("${message}", ${shift})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Undo a Caesar shift of <b>${shift}</b>. The alphabet is a <b>ring</b> — after Z comes A again — and this version walks that ring one letter at a time.`, { focus: "param" });
  for (const c of chars) {
    ch = c; base = p = k = undefined;
    S(3, `Next character: <b>'${esc(ch)}'</b>.`, { focus: "ch", changed: ["ch"] });
    if (!isLetter(ch)) {
      out += ch;
      S(4, `Not a letter, so nothing to decode — <b>copy it straight through</b>. Punctuation and spaces are landmarks the cipher never touched.`, { focus: "alpha", eval: { expr: `!/[a-zA-Z]/.test('${ch}')`, val: true } });
      continue;
    }
    S(4, `<b>'${esc(ch)}'</b> is a letter, so it gets decoded.`, { focus: "alpha", eval: { expr: `!/[a-zA-Z]/.test('${ch}')`, val: false } });
    base = ch < "a" ? 65 : 97;
    S(5, `Pick the base for its case: <b>${base}</b> (<code class='inl'>'${base === 65 ? "A" : "a"}'</code>). Everything after this is 0–25 arithmetic, and re-adding <b>${base}</b> at the end is what preserves the case with no separate branch.`, { focus: "base", changed: ["base"] });
    p = ch.charCodeAt(0) - base;
    S(6, `Position on the ring: <b>${ch.charCodeAt(0)} − ${base} = ${p}</b>, which is <b>${A[p]}</b>.`, { focus: "p", changed: ["p"] });
    const hops = Math.abs(shift);
    for (k = 0; k < hops; k++) {
      S(7, `Hop <b>${k + 1}</b> of <b>${hops}</b>.`, { focus: "k", changed: ["k"], eval: { expr: `k = ${k} < ${hops}`, val: true } });
      p += shift > 0 ? -1 : 1;
      const wrapped = p < 0 || p > 25;
      S(8, `Step ${shift > 0 ? "back" : "forward"} one: <b>p = ${p}</b>${wrapped ? " — which is off the end of the ring." : ` (<b>${A[p]}</b>).`}`, { focus: "hop", changed: ["p"] });
      if (p < 0) { p = 25; S(9, `Wrapped past A, so come round to <b>25</b> (<b>Z</b>). This hand-written wrap is the thing the modulo version replaces.`, { focus: "wrap", changed: ["p"] }); }
      else if (p > 25) { p = 0; S(10, `Wrapped past Z, so come round to <b>0</b> (<b>A</b>).`, { focus: "wrap", changed: ["p"] }); }
    }
    k = undefined;
    out += String.fromCharCode(base + p);
    S(12, `The walk ended at <b>${p}</b>, so emit <b>'${esc(String.fromCharCode(base + p))}'</b>. That took <b>${hops}</b> hop${hops === 1 ? "" : "s"} — for one character.`, { focus: "emit", changed: ["out"] });
  }
  ch = base = p = undefined;
  const total = letterCount(message) * Math.abs(shift);
  S(14, `<b>Return "${esc(out)}"</b> — <b>${total}</b> hop${total === 1 ? "" : "s"} in total, ${letterCount(message)} letters × ${Math.abs(shift)}.`,
    { done: true, result: `"${out}"`, ret: { value: `"${out}"` } });
  return steps;
}

function traceMod(raw) {
  const { message, shift } = parseCase(raw);
  const steps = [];
  const chars = [...message];
  let out = "", ch, base, p;
  const S = (line, note, x = {}) => {
    const vars = { shift, out: out === "" ? '""' : `"${out}"` };
    if (line >= 3 && ch !== undefined) vars.ch = `'${ch}'`;
    if (line >= 4 && base !== undefined) vars.base = base;
    if (line >= 5 && p !== undefined) vars.p = `${p} (${A[p]})`;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `decode("${message}", ${shift})`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Same message, same shift — but every letter is now <b>one</b> subtraction away from its answer, however big the shift is.`, { focus: "param" });
  S(2, `<code class='inl'>[...message]</code> rather than <code class='inl'>message.split("")</code>: spreading iterates by <b>code point</b>, so an emoji or accented character in the input survives intact instead of being cut in half.`, { focus: "ch" });
  for (const c of chars) {
    ch = c; base = p = undefined;
    S(2, `Next character: <b>'${esc(ch)}'</b>.`, { focus: "ch", changed: ["ch"] });
    if (!isLetter(ch)) {
      out += ch;
      S(3, `Not a letter — <b>return it unchanged</b>. Spaces and punctuation are exactly why a decoded message is still readable as a sentence.`, { focus: "alpha", eval: { expr: `!/[a-zA-Z]/.test('${ch}')`, val: true } });
      continue;
    }
    S(3, `A letter, so decode it.`, { focus: "alpha", eval: { expr: `!/[a-zA-Z]/.test('${ch}')`, val: false } });
    base = ch < "a" ? 65 : 97;
    S(4, `Base <b>${base}</b> for ${base === 65 ? "upper" : "lower"}-case. One expression handles both cases because the base is the only thing that differs.`, { focus: "base", changed: ["base"] });
    p = ch.charCodeAt(0) - base;
    S(5, `Ring position <b>p = ${p}</b> (<b>${A[p]}</b>).`, { focus: "p", changed: ["p"] });
    const raw1 = p - shift;
    const m1 = raw1 % 26;
    const fin = ((m1) + 26) % 26;
    S(6, `<b>${p} − (${shift}) = ${raw1}</b>. Then <b>${raw1} % 26 = ${m1}</b>` +
      (m1 < 0
        ? ` — <b style="color:var(--danger)">negative</b>, because JavaScript's <code class='inl'>%</code> is a <i>remainder</i>, not a mathematical modulo: it keeps the sign of the left operand. Adding <b>26</b> and taking the modulo again pulls it back onto the ring: <b>${fin}</b> (<b>${A[fin]}</b>).`
        : `, already on the ring, so the <code class='inl'>+ 26) % 26</code> leaves it alone: <b>${fin}</b> (<b>${A[fin]}</b>).`) +
      ` Emit <b>'${esc(String.fromCharCode(base + fin))}'</b>.`,
      { focus: "mod" });
    out += String.fromCharCode(base + fin);
  }
  ch = base = p = undefined;
  S(7, `<code class='inl'>join("")</code> stitches the mapped characters back into one string. <b>Return "${esc(out)}"</b> — <b>${letterCount(message)}</b> modulo steps, one per letter, against the walk's <b>${letterCount(message) * Math.abs(shift)}</b> hops.`,
    { done: true, result: `"${out}"`, ret: { value: `"${out}"` } });
  return steps;
}

export default {
  n: 12, id: "decoder", title: "Message Decoder", dates: ["2025-08-22"],
  statement: `Given a secret message and an integer <b>shift</b>, return the decoded string. A positive shift means the message was moved <b>forward</b> through the alphabet, a negative one backward. <span class="rule">Case is preserved, and non-alphabetical characters are left alone. Example: <code class="inl">decode("Byffi Qilfx!", 20)</code> → <code class="inl">"Hello World!"</code>.</span>`,
  variants: [
    {
      name: "Walk the ring", tone: "brute", cost: "O(n × |shift|) hops",
      approach: `Take the letter's position, then step it round the alphabet one place at a time — <code class='inl'>shift</code> times — wrapping by hand whenever it falls off either end. This is the mental model the problem describes, and it is correct: subtract the base first so everything is 0–25, walk, then add the base back to restore the case. What it costs is one hop per unit of shift <b>per character</b>, so a shift of 20 does twenty times the work of a shift of 1 to answer the same question. Click any letter in the strip to watch its journey.`,
      code: `function decode(message: string, shift: number): string {
  let out = "";
  for (const ch of message) {
    if (!/[a-zA-Z]/.test(ch)) { out += ch; continue; }
    const base = ch < "a" ? 65 : 97;  // 'A' or 'a' — this is what preserves case
    let p = ch.charCodeAt(0) - base;
    for (let k = 0; k < Math.abs(shift); k++) {
      p += shift > 0 ? -1 : 1;
      if (p < 0) p = 25;   // walked past A
      if (p > 25) p = 0;   // walked past Z
    }
    out += String.fromCharCode(base + p);
  }
  return out;
}`,
      mount: (host) => build(host, "hops"),
    },
    { name: "Step: walk the ring", tone: "brute", cost: "hops taken",
      approach: `Every hop is a step, so the trace length <i>is</i> the cost. The presets here are short phrases on purpose — the full official <code class='inl'>"Byffi Qilfx!" / 20</code> is a 1,000-step trace, which is the argument rather than an omission; run it whole in the demo above. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_WALK, trace: traceWalk, input: { type: "text", label: "message / shift =", value: "Byffi / 20", presets: WALK_PRESETS, hint: "message / shift" } }) },
    {
      name: "One modulo", tone: "opt", cost: "O(n) — one step per letter",
      approach: `A ring is what modular arithmetic <i>is</i>, so the whole walk collapses into <code class='inl'>p - shift</code> followed by a wrap. The doubled modulo isn't superstition: JavaScript's <code class='inl'>%</code> is a <b>remainder</b>, so <code class='inl'>-19 % 26</code> is <code class='inl'>-19</code> and not <code class='inl'>7</code>. Adding 26 and taking the modulo again lands any negative back on the ring, and it costs nothing when the value was already in range. Cost stops depending on the shift entirely — 1 or 20 or 2,000, it's the same one step per letter.`,
      code: `function decode(message: string, shift: number): string {
  return [...message].map((ch) => {
    if (!/[a-zA-Z]/.test(ch)) return ch;
    const base = ch < "a" ? 65 : 97;
    const p = ch.charCodeAt(0) - base;
    // JS % keeps the sign (-19 % 26 === -19), so wrap it twice
    return String.fromCharCode(base + ((p - shift) % 26 + 26) % 26);
  }).join("");
}`,
      mount: (host) => build(host, "jump"),
    },
    { name: "Step: one modulo", tone: "opt", cost: "one step per letter",
      approach: `All four official cases run here in full, because the trace no longer grows with the shift. Watch the <b>−1</b> case: <code class='inl'>25 − (−1) = 26</code> goes off the top rather than the bottom, and the same expression catches it. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_MOD, trace: traceMod, input: { type: "text", label: "message / shift =", value: MOD_PRESETS[1], presets: MOD_PRESETS, hint: "message / shift" } }) },
  ],
};
