// #23 · RGB to Hex — toString(16) is variable-width, and six characters is the spec.
// The base conversion is the easy half. The two details that decide the answer:
// • PARSE / the input is a formatted string, and the whitespace after each comma
//   is real. Pull the three digit runs out with /\d+/g and the spacing, the
//   "rgb(" wrapper and the ")" all stop being your problem.
// • PAD   / (1).toString(16) is "1", not "01", so a plain join hands back five
//   characters that still look like a colour. padStart(2, "0") puts back the
//   HIGH NIBBLE that a variable-width conversion dropped — the zero is a digit,
//   not decoration. Case 2, "rgb(1, 11, 111)" → "#010b6f", is the only official
//   case that catches it, and "Don't use any shorthand values" in the statement
//   is the problem-setter pointing straight at it. Watch the rgb(0, 0, 0) preset:
//   the naive join returns "#000", which is legal CSS and still the wrong answer.
// The lowercase clause is free — toString(16) already emits a-f. Casing only
// bites going the other way, in #21 Hex Generator the day before.
// ONE APPROACH on purpose: a hand-rolled ÷16 digit lookup is not a second mental
// model, it is toString(16) spelled worse, so it gets no tab.
import { el, mountDebugger } from "../shared.js";

// Cases 1–4 are freeCodeCamp's four official ones, in the order the grader lists
// them. 5 and 6 are ours, and each lands somewhere the official set never does:
//   rgb(0, 0, 0)      — every channel pads. The naive join gives "#000", which a
//                       browser accepts as shorthand black, so this is the one
//                       input where the bug produces a *valid colour* and the
//                       page still looks right. That is the clause being banned.
//   rgb(15, 16, 255)  — the padding boundary, adjacent: 15 is the last value that
//                       needs a pad ("f" → "0f"), 16 the first that does not
//                       ("10"). Side by side, so the cutoff is a place, not a rule.
const CASES = [
  { rgb: "rgb(255, 255, 255)", hex: "#ffffff" },   // official 1 — all-max, no pad
  { rgb: "rgb(1, 11, 111)",    hex: "#010b6f" },   // official 2 — two channels pad
  { rgb: "rgb(173, 216, 230)", hex: "#add8e6" },   // official 3 — letters in both nibbles
  { rgb: "rgb(79, 123, 201)",  hex: "#4f7bc9" },   // official 4 — mixed digit/letter
  { rgb: "rgb(0, 0, 0)",       hex: "#000000" },   // ours — naive join yields "#000"
  { rgb: "rgb(15, 16, 255)",   hex: "#0f10ff" },   // ours — 15 pads, 16 does not
];

const HEXD = "0123456789abcdef";
const CHANNELS = [
  { name: "red",   tint: "#ff8f8f" },
  { name: "green", tint: "#79dd97" },
  { name: "blue",  tint: "#8fb4ff" },
];

const clamp = (n) => Math.max(0, Math.min(255, Math.floor(n) || 0));
// The parse the challenge actually asks for: three runs of digits, wrapper and
// spacing ignored. Missing channels read as 0 so a half-typed string still renders.
const parseRgb = (s) => {
  const m = String(s).match(/\d+/g) || [];
  return [0, 1, 2].map((i) => clamp(Number(m[i] ?? 0)));
};
const pair = (n) => n.toString(16).padStart(2, "0");
const solve = (nums) => "#" + nums.map(pair).join("");
const naiveJoin = (nums) => "#" + nums.map((n) => n.toString(16)).join("");
const fmt = (nums) => `rgb(${nums[0]}, ${nums[1]}, ${nums[2]})`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rh-wrap { display:flex; flex-direction:column; gap:13px; }
    .rh-top { display:flex; gap:16px; align-items:stretch; flex-wrap:wrap; }
    .rh-swatch { width:150px; min-height:96px; border-radius:10px; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font:800 17px var(--mono); letter-spacing:.5px; }
    .rh-out { flex:1; min-width:230px; display:flex; flex-direction:column; gap:8px; justify-content:center; }
    .rh-hex { font:800 30px var(--mono); letter-spacing:2px; display:flex; align-items:baseline; }
    .rh-hex .hash { color:var(--muted); }
    .rh-count { font:12px var(--mono); color:var(--muted); }
    .rh-count b { color:var(--good); }
    .rh-sliders { display:flex; flex-direction:column; gap:5px; margin:2px 0; }
    .rh-srow { display:grid; grid-template-columns:46px 1fr 46px; align-items:center; gap:9px; font:12px var(--mono); color:var(--muted); }
    .rh-srow input { width:100%; }
    .rh-srow .v { text-align:right; color:var(--text); font-weight:700; }
    .rh-ch { border:1px solid var(--border); border-radius:9px; background:var(--panel-2); padding:7px 11px; display:flex; flex-direction:column; gap:5px; }
    .rh-hd { display:grid; grid-template-columns:52px 44px 1fr 40px; align-items:center; gap:10px; font:13px var(--mono); }
    .rh-hd .nm { font-size:11.5px; font-weight:700; }
    .rh-hd .dec { font-weight:800; text-align:right; }
    .rh-bar { height:9px; border-radius:5px; background:color-mix(in srgb, var(--border) 70%, transparent); overflow:hidden; }
    .rh-bar i { display:block; height:100%; border-radius:5px; }
    .rh-hd .pr { font-weight:800; text-align:right; letter-spacing:1px; }
    .rh-mt { font:12px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .rh-mt b { color:var(--text); }
    .rh-nib { display:inline-block; min-width:17px; text-align:center; padding:1px 4px; border-radius:5px; border:1px solid var(--border); background:var(--panel); color:var(--text); font-weight:800; }
    .rh-nib.pad { border-color:var(--warn); color:var(--warn); }
    .rh-pad { color:var(--warn); }
    .rh-pad s { opacity:.65; }
    .rh-naive { font:12.5px var(--mono); }
    .rh-naive.bad { color:var(--danger); }
    .rh-naive.ok { color:var(--muted); }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = CASES[1].rgb; inp.style.width = "210px";
  ctl.append(el("span", "ctl-label", "css string"), inp);

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", c.rgb.replace("rgb", "").replace(/\s/g, ""));
    b.onclick = () => { inp.value = c.rgb; syncFromText(); render(); };
    pre.append(b);
  });

  // Sliders write back into the text field, so the string stays the source of
  // truth — the function is handed a string, not three numbers, and the demo
  // should not quietly pretend otherwise.
  const sliders = el("div", "rh-sliders");
  const ranges = CHANNELS.map((ch, i) => {
    const row = el("div", "rh-srow");
    const r = el("input"); r.type = "range"; r.min = "0"; r.max = "255"; r.value = "0";
    const v = el("span", "v", "0");
    row.append(el("span", null, ch.name), r, v);
    r.oninput = () => { const nums = parseRgb(inp.value); nums[i] = +r.value; inp.value = fmt(nums); render(); };
    sliders.append(row);
    return { r, v };
  });

  const out = el("div");
  host.append(ctl, pre, sliders, out);
  inp.oninput = () => { syncFromText(); render(); };
  syncFromText(); render();

  function syncFromText() {
    parseRgb(inp.value).forEach((n, i) => { ranges[i].r.value = String(n); ranges[i].v.textContent = String(n); });
  }

  function render() {
    const nums = parseRgb(inp.value);
    nums.forEach((n, i) => { ranges[i].r.value = String(n); ranges[i].v.textContent = String(n); });
    const hex = solve(nums), naive = naiveJoin(nums);
    out.innerHTML = "";
    const wrap = el("div", "rh-wrap");

    // The colour itself, then the answer split into its three pairs.
    const lum = 0.299 * nums[0] + 0.587 * nums[1] + 0.114 * nums[2];
    const top = el("div", "rh-top");
    const sw = el("div", "rh-swatch", hex);
    sw.style.background = fmt(nums);
    sw.style.color = lum > 140 ? "#111" : "#fff";
    const info = el("div", "rh-out");
    info.append(el("div", "rh-hex",
      `<span class="hash">#</span>` +
      nums.map((n, i) => `<span style="color:${CHANNELS[i].tint}">${pair(n)}</span>`).join("")));
    info.append(el("div", "rh-count",
      `<b>${hex.length}</b> characters — one <code class='inl'>#</code> and exactly six digits, two per channel, always.`));
    info.append(el("div", "result-line", `<span class="badge ok">rgbToHex("${fmt(nums)}") → "${hex}"</span>`));
    top.append(sw, info);
    wrap.append(top);

    // Per channel: the division that base 16 actually is.
    nums.forEach((n, i) => {
      const ch = CHANNELS[i], hi = n >> 4, lo = n & 15, padded = n < 16;
      const card = el("div", "rh-ch");
      card.append(el("div", "rh-hd",
        `<span class="nm" style="color:${ch.tint}">${ch.name}</span>` +
        `<span class="dec">${n}</span>` +
        `<div class="rh-bar"><i style="width:${((n / 255) * 100).toFixed(1)}%;background:${ch.tint}"></i></div>` +
        `<span class="pr" style="color:${ch.tint}">${pair(n)}</span>`));
      card.append(el("div", "rh-mt",
        `<span><b>${n}</b> = <b>${hi}</b> × 16 + <b>${lo}</b></span>` +
        `<span>→ hi <span class="rh-nib${padded ? " pad" : ""}">${HEXD[hi]}</span> lo <span class="rh-nib">${HEXD[lo]}</span></span>` +
        (padded
          ? `<span class="rh-pad">· <code class='inl'>toString(16)</code> gave <s>"${n.toString(16)}"</s>, one character — the high nibble is <b>0</b> and it dropped it. <code class='inl'>padStart</code> puts that digit back.</span>`
          : `<span>· both nibbles are non-zero, so <code class='inl'>toString(16)</code> is already two wide and <code class='inl'>padStart</code> changes nothing.</span>`)));
      wrap.append(card);
    });

    // What the same code without padStart would have returned.
    const short = naive !== hex;
    wrap.append(el("div", "rh-naive " + (short ? "bad" : "ok"), short
      ? `Without <code class='inl'>padStart(2, "0")</code>: <b>"${naive}"</b> — ${naive.length - 1} character${naive.length - 1 === 1 ? "" : "s"}, not six.${naive.length === 4 ? ` A browser reads that as shorthand and paints a colour anyway, which is exactly why the statement bans shorthand.` : ""}`
      : `Without <code class='inl'>padStart(2, "0")</code>: <b>"${naive}"</b> — identical here, because all three channels are ≥ 16. That is why the bug survives casual testing.`));

    wrap.append(el("div", "note",
      `Two things happen and only one of them is arithmetic. The <b>parse</b> takes the three runs of digits out of a formatted string — <code class='inl'>/\\d+/g</code> steps over <code class='inl'>rgb(</code>, the commas, the spaces after them and the <code class='inl'>)</code>, so none of that has to be trimmed. The <b>conversion</b> is one division: a byte is two base-16 digits, <b>⌊n ÷ 16⌋</b> and <b>n mod 16</b>, which is what the row above spells out. <code class='inl'>toString(16)</code> does that division for you but returns the <i>shortest</i> string, so any channel below 16 comes back one character short and the answer quietly stops being six long. Padding to two is not formatting — it is restoring a digit that exists.`));
    out.append(wrap);
  }
}

// ── STEP — the map unrolled into a for-of, one channel per pass ──────────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">rgbToHex</span>(<span class="tok" data-t="param">rgb</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> channels = <span class="tok" data-t="match">rgb.<span class="fn">match</span>(/\\d+/g) ?? []</span>;` },
  { ln: 3,  html: `  <span class="k">let</span> hex = <span class="tok" data-t="init"><span class="st">"#"</span></span>;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="iter">c</span> <span class="k">of</span> channels) {` },
  { ln: 5,  html: `    <span class="k">const</span> n = <span class="tok" data-t="num"><span class="fn">Number</span>(c)</span>;` },
  { ln: 6,  html: `    <span class="k">const</span> raw = <span class="tok" data-t="tohex">n.<span class="fn">toString</span>(<span class="nu">16</span>)</span>;` },
  { ln: 7,  html: `    hex += <span class="tok" data-t="pad">raw.<span class="fn">padStart</span>(<span class="nu">2</span>, <span class="st">"0"</span>)</span>;` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="ret">hex</span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const cs = CASES[k - 1];
  const steps = [];
  const pairs = [];
  let channels, hex, c, n, raw, inBody = false;

  const S = (line, note, x = {}) => {
    const vars = { rgb: `"${cs.rgb}"` };
    if (line >= 2 && channels) vars.channels = `[${channels.map((t) => `"${t}"`).join(", ")}]`;
    if (line >= 3 && hex !== undefined) vars.hex = `"${hex}"`;
    if (inBody && line >= 4) vars.c = `"${c}"`;
    if (inBody && line >= 5) vars.n = n;
    if (inBody && line >= 6) vars.raw = `"${raw}"`;
    const structs = [];
    if (line >= 2 && channels) structs.push({ label: "channels", items: channels.slice(), newest: false });
    if (line >= 3) structs.push({ label: "hex pairs", items: pairs.slice(), newest: !!x.fresh });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `rgbToHex("${cs.rgb}")`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The argument is one <b>string</b>, <code class='inl'>"${cs.rgb}"</code> — not three numbers. Before anything can be converted, the three channel values have to be got out of it, and the formatting around them is part of what arrives.`, { focus: "param" });

  channels = cs.rgb.match(/\d+/g);
  S(2, `<code class='inl'>/\\d+/g</code> matches <b>runs of digits</b>, so it walks straight past <code class='inl'>rgb(</code>, the commas, the <b>spaces after the commas</b> and the closing <code class='inl'>)</code> — none of which needs trimming, because none of it is a digit. Out come ${channels.length} pieces: ${channels.map((t) => `<b>"${t}"</b>`).join(", ")}. They are still <b>strings</b>.`, { focus: "match", changed: ["channels"] });

  hex = "#";
  S(3, `Start the answer with the <code class='inl'>#</code>. The statement asks for a <code class='inl'>#</code> followed by exactly six characters — so from here the only job is to append <b>three pairs</b>, and every pair must be two wide no matter how small its channel is.`, { focus: "init", changed: ["hex"] });

  for (let i = 0; i < channels.length; i++) {
    inBody = true;
    c = channels[i];
    S(4, `Channel <b>${i + 1} of ${channels.length}</b> (${CHANNELS[i] ? CHANNELS[i].name : "extra"}): <b>"${c}"</b>. Each channel is one byte, and one byte is exactly two hex digits — which is where the "six characters" in the statement comes from.`, { focus: "iter", changed: ["c"] });

    n = Number(c);
    S(5, `<code class='inl'>Number("${c}")</code> → <b>${n}</b>. The regex handed back text; <code class='inl'>toString(16)</code> is a method on numbers, so the conversion has to happen first.`, { focus: "num", changed: ["n"] });

    raw = n.toString(16);
    const hi = n >> 4, lo = n & 15;
    S(6, `<b>${n}</b> in base 16 is one division: <b>${n} = ${hi} × 16 + ${lo}</b>, so the digits are <b>${HEXD[hi]}</b> and <b>${HEXD[lo]}</b>. <code class='inl'>toString(16)</code> returns <b>"${raw}"</b> — ${raw.length === 1
      ? `<b>one</b> character, because the high nibble is <b>0</b> and a shortest-form conversion does not print a leading zero. Append this as it stands and the answer ends up ${channels.length * 2 - 1} characters long instead of 6.`
      : `<b>two</b> characters, because both nibbles are non-zero. This is the case that makes the bug invisible.`} Note the letters are already <b>lowercase</b> — <code class='inl'>toString(16)</code> emits <code class='inl'>a-f</code>, so the lowercase rule costs nothing here.`, { focus: "tohex", changed: ["raw"] });

    const p = raw.padStart(2, "0");
    pairs.push(p);
    hex += p;
    S(7, `<code class='inl'>padStart(2, "0")</code> → <b>"${p}"</b>${raw.length === 1
      ? ` — and the <b>0</b> it added is not decoration, it is the <b>high nibble</b>, which really is ${hi}. The pad restores a digit that the variable-width conversion dropped.`
      : `, unchanged: it was already two wide, so <code class='inl'>padStart</code> is a no-op on this channel.`} <code class='inl'>hex</code> is now <b>"${hex}"</b>.`, { focus: "pad", changed: ["hex"], fresh: true });
  }

  inBody = false;
  S(4, `All ${channels.length} channels consumed, so the loop ends. Because every pass appended exactly two characters, the length is fixed by construction rather than checked at the end.`, { focus: "iter", eval: { expr: `channels exhausted after ${channels.length}`, val: true } });

  S(9, `<b>Return "${hex}"</b> — ${hex.length} characters. ${pairs.some((_, i) => Number(channels[i]) < 16)
    ? `Drop the <code class='inl'>padStart</code> on this input and you get <b>"${naiveJoin(channels.map(Number))}"</b> instead, which is the whole reason the statement says "don't use any shorthand values".`
    : `Every channel here was ≥ 16, so <code class='inl'>padStart</code> never fired — run case 2 or case 5 to see the input where it is the difference between a right and a wrong answer.`}`,
    { focus: "ret", done: true, result: `"${hex}"`, ret: { value: `"${hex}"` } });
  return steps;
}

export default {
  n: 23, id: "rgbhex", title: "RGB to Hex", dates: ["2025-09-02"],
  statement: `Given a CSS <code class="inl">rgb(r, g, b)</code> colour string, return its hexadecimal equivalent: a <code class="inl">#</code> followed by <b>exactly six</b> lowercase characters, with no shorthand. <span class="rule">Example: <code class="inl">rgbToHex("rgb(1, 11, 111)")</code> → <code class="inl">"#010b6f"</code>, not <code class="inl">"#1b6f"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — three channels",
      approach: `Two clauses of the statement do all the work, and neither is the base conversion. First, the input is a <b>formatted string</b>: the wrapper, the commas and the <b>spaces after the commas</b> all arrive with it. Matching <code class='inl'>/\\d+/g</code> — runs of digits — steps over every one of them, so there is nothing to trim and nothing to split. Second, <b>"a <code class='inl'>#</code> followed by six characters, no shorthand"</b> is a warning, not a formatting preference. A byte is two base-16 digits — <code class='inl'>⌊n / 16⌋</code> and <code class='inl'>n % 16</code> — but <code class='inl'>toString(16)</code> returns the <i>shortest</i> string, so anything under 16 comes back one character wide and a straight join silently produces a five-character answer that still looks like a colour. <code class='inl'>padStart(2, "0")</code> puts back the high nibble, which genuinely is <b>0</b>; it is restoring a digit, not padding a field. Official case 2, <code class='inl'>"rgb(1, 11, 111)"</code>, is the only one of the four that catches a missing pad. The lowercase clause is free — <code class='inl'>toString(16)</code> already emits <code class='inl'>a-f</code>.`,
      code: `function rgbToHex(rgb: string): string {
  // Runs of digits only, so "rgb(", the commas, the spaces after them
  // and the ")" are all stepped over rather than trimmed.
  const channels = rgb.match(/\\d+/g) ?? [];

  // Each byte is exactly two base-16 digits. toString(16) returns the
  // SHORTEST form, so 1 -> "1"; padStart puts the high nibble back.
  // (toString(16) is already lowercase, so nothing else is needed.)
  return "#" + channels.map((c) => Number(c).toString(16).padStart(2, "0")).join("");
}`,
      mount,
    },
    {
      name: "Step through", cost: "one channel at a time",
      approach: `The <code class='inl'>map</code> unrolled into a <code class='inl'>for…of</code> so each channel's division is visible on its own. Run <b>case 2</b> — <code class='inl'>"rgb(1, 11, 111)"</code> — and watch <code class='inl'>toString(16)</code> hand back a <b>one</b>-character string twice, then <code class='inl'>padStart</code> restore the missing high nibble; that is the only official case where the two disagree. Then <b>case 5</b>, <code class='inl'>"rgb(0, 0, 0)"</code>, ours, where all three pad and the unpadded answer is <code class='inl'>"#000"</code> — a colour a browser will happily paint. <b>Case 6</b> puts <b>15</b> and <b>16</b> next to each other, the last value that pads and the first that doesn't. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 2, min: 1, max: CASES.length,
          presets: CASES.map((_, i) => i + 1),
          hint: `1–${CASES.length}: 1–4 official, 5–6 ours`,
        },
      }),
    },
  ],
};
