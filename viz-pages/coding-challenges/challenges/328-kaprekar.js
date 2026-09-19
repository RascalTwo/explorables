// #328 · Kaprekar's Routine — descend to 6174, count the steps.
// Single-approach: sort digits desc/asc, subtract, repeat until the fixed point.
import { el, esc, mountDebugger } from "../shared.js";

const PRESETS = [1234, 2025, 7173, 3164, 8082];
const KONST = 6174;

function digitsOf(n) { return String(n).padStart(4, "0").split(""); }

function stepsOf(n) {
  const chain = [];
  let cur = n, count = 0;
  while (cur !== KONST) {
    const d = digitsOf(cur);
    const desc = Number(d.slice().sort((a, b) => +b - +a).join(""));
    const asc = Number(d.slice().sort((a, b) => +a - +b).join(""));
    const next = desc - asc;
    chain.push({ cur, desc, asc, next });
    cur = next; count++;
    if (count > 7) break;
  }
  return { chain, count, locked: cur === KONST };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .kp-chain { display:flex; flex-direction:column; align-items:center; gap:0; }
    .kp-step { border:1px solid var(--border); border-radius:12px; background:var(--panel);
               padding:12px 16px; width:100%; max-width:420px; }
    .kp-line { display:flex; align-items:center; justify-content:center; gap:8px; font:700 15px var(--mono); }
    .kp-op { color:var(--muted); width:20px; text-align:center; }
    .kp-digs { display:flex; gap:4px; }
    .kp-d { width:26px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:6px;
            border:1px solid var(--border); background:var(--panel-2); font:700 16px var(--mono); }
    .kp-d.desc { color:var(--danger); border-color:color-mix(in srgb,var(--danger) 45%,var(--border)); }
    .kp-d.asc { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 45%,var(--border)); }
    .kp-sub { display:grid; grid-template-columns:auto auto; gap:2px 10px; justify-content:center;
              font:700 15px var(--mono); margin:8px 0 2px; }
    .kp-sub .val { text-align:right; }
    .kp-sub .val.d { color:var(--danger); } .kp-sub .val.a { color:var(--accent); }
    .kp-sub .bar { grid-column:1/3; border-top:2px solid var(--border); margin:2px 0; }
    .kp-sub .res { grid-column:1/3; text-align:right; color:var(--text); }
    .kp-cap { font:600 11px var(--sans); color:var(--muted); text-align:center; margin-bottom:6px;
              letter-spacing:.04em; }
    .kp-cap .num { background:none; border:0; padding:0; color:var(--text); font-size:12px; }
    .kp-arrow { color:var(--muted); font-size:18px; line-height:1; padding:5px 0; }
    .kp-lock { border-color:var(--good); background:color-mix(in srgb,var(--good) 10%,transparent);
               display:flex; flex-direction:column; align-items:center; gap:4px; }
    .kp-lock .big { color:var(--good); font-size:32px; letter-spacing:2px; }
    .kp-lock .sub { color:var(--muted); font:600 12px var(--sans); }
    .kp-count { display:inline-flex; align-items:baseline; gap:7px; font:600 13px var(--sans); color:var(--muted);
                margin-bottom:14px; }
    .kp-count b { font:800 24px var(--mono); color:var(--accent); }
    .kp-warn { color:var(--danger); }
  `));
}

function digRow(str, cls) {
  return `<div class="kp-digs">${[...str].map((c) => `<span class="kp-d ${cls}">${c}</span>`).join("")}</div>`;
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.inputMode = "numeric"; inp.value = "1234"; inp.style.width = "110px";
  ctl.append(el("span", "ctl-label", "4-digit number"), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", String(v)); c.onclick = () => { inp.value = String(v); render(); }; pre.append(c); });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function render() {
    const raw = inp.value.replace(/\D/g, "").slice(0, 4);
    const n = Number(raw || 0);
    if (raw.length < 1) { out.innerHTML = `<div class="note">Enter a 4-digit number.</div>`; return; }
    const uniq = new Set(digitsOf(n));
    if (uniq.size === 1) {
      out.innerHTML = `<div class="note kp-warn">A repdigit like <b>${String(n).padStart(4, "0")}</b> collapses to 0 immediately and never reaches 6174 — that's the one excluded case.</div>`;
      return;
    }
    const { chain, count, locked } = stepsOf(n);

    const steps = chain.map((s, i) => `
      <div class="kp-step">
        <div class="kp-cap">step ${i + 1} · from <span class="num">${String(s.cur).padStart(4, "0")}</span></div>
        <div class="kp-line">
          <span class="kp-op">↓</span>${digRow(String(s.desc).padStart(4, "0"), "desc")}
          <span class="kp-op">↑</span>${digRow(String(s.asc).padStart(4, "0"), "asc")}
        </div>
        <div class="kp-sub">
          <span></span><span class="val d">${String(s.desc).padStart(4, "0")}</span>
          <span>−</span><span class="val a">${String(s.asc).padStart(4, "0")}</span>
          <span class="bar"></span>
          <span class="res">${String(s.next).padStart(4, "0")}</span>
        </div>
      </div>
      <div class="kp-arrow">▼</div>`).join("");

    out.innerHTML = `
      <div class="kp-count">applied Kaprekar's routine <b>${count}</b> time${count === 1 ? "" : "s"}</div>
      <div class="kp-chain">
        ${count === 0 ? "" : steps}
        <div class="kp-step kp-lock">
          <div class="big">6174</div>
          <div class="sub">Kaprekar's constant — the fixed point ${count === 0 ? "(you started here)" : "every 4-digit number descends to"}</div>
        </div>
      </div>
      <div class="note">Largest arrangement (<b style="color:var(--danger)">desc</b>) minus smallest (<b style="color:var(--accent)">asc</b>), padded to 4 digits, feeds the next step. <b>6174</b> maps to itself (7641 − 1467 = 6174), so it's an attractor: every non-repdigit 4-digit number reaches it in <b>≤ 7</b> steps.</div>`;
  }
}

// ── STEP — the routine as a line-by-line debugger (single frame) ─────────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">kaprekar</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> count = 0;` },
  { ln: 3,  html: `  <span class="k">let</span> cur = n;` },
  { ln: 4,  html: `  <span class="k">while</span> (<span class="tok" data-t="cond">cur !== 6174</span>) {` },
  { ln: 5,  html: `    <span class="k">const</span> s = <span class="fn">pad4</span>(cur);` },
  { ln: 6,  html: `    <span class="k">const</span> desc = <span class="tok" data-t="desc"><span class="fn">biggest</span>(s)</span>;   <span class="k">// digits high→low</span>` },
  { ln: 7,  html: `    <span class="k">const</span> asc  = <span class="tok" data-t="asc"><span class="fn">smallest</span>(s)</span>;  <span class="k">// digits low→high</span>` },
  { ln: 8,  html: `    cur = desc - asc;` },
  { ln: 9,  html: `    count = count + 1;` },
  { ln: 10, html: `    <span class="k">if</span> (count &gt; 7) <span class="k">break</span>;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> count;` },
  { ln: 13, html: `}` },
];

function trace(n0) {
  const pad = (v) => String(v).padStart(4, "0");
  const steps = [];
  let count = 0, cur = n0, s, desc, asc;
  const S = (line, note, x = {}) => {
    const sLive = line >= 5 && line <= 10;   // block-scoped to the while body
    const vars = {};
    if (line >= 2) vars.count = count;
    if (line >= 3) vars.cur = cur;
    if (sLive) vars.s = `"${s}"`;
    if (line >= 6 && line <= 10) vars.desc = desc;
    if (line >= 7 && line <= 10) vars.asc = asc;
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "kaprekar", vars, changed: x.changed || [], structs: [] }] });
  };

  S(1, `Call <b>kaprekar(${n0})</b> — count the steps to reach 6174.`, { focus: "param" });
  S(2, `count = 0.`, { changed: ["count"] });
  S(3, `cur = ${n0} — the number we keep transforming.`, { changed: ["cur"] });
  for (;;) {
    const cont = cur !== 6174;
    S(4, `While <b>cur ≠ 6174</b> — ${cur} ≠ 6174 → <b>${cont}</b>.`, { focus: "cond", eval: { expr: `${cur} ≠ 6174`, val: cont } });
    if (!cont) break;
    s = pad(cur);
    S(5, `Pad to 4 digits: <b>s = "${s}"</b>.`, { changed: ["s"] });
    const dStr = [...s].sort((a, b) => b - a).join("");
    desc = Number(dStr);
    S(6, `Biggest arrangement of ${[...s].join(",")}: <b>${dStr}</b> = ${desc}.`, { focus: "desc", changed: ["desc"] });
    const aStr = [...s].sort((a, b) => a - b).join("");
    asc = Number(aStr);
    S(7, `Smallest arrangement: <b>${aStr}</b> = ${asc}.`, { focus: "asc", changed: ["asc"] });
    const nv = desc - asc;
    cur = nv;
    S(8, `Subtract: <b>cur = ${desc} − ${asc} = ${cur}</b> — this feeds the next step.`, { changed: ["cur"] });
    count = count + 1;
    S(9, `That's one step: <b>count = ${count}</b>.`, { changed: ["count"] });
    if (count > 7) { S(10, `Safety cap: count &gt; 7. A repdigit (like 1111) collapses to 0 and never reaches 6174 — <b>break</b>.`, {}); break; }
  }
  S(12, `Reached the fixed point. <b>Return count = ${count}</b>.`, { done: true, result: count });
  return steps;
}

export default {
  n: 328, id: "kaprekar", title: "Kaprekar's Routine", dates: ["2026-07-04"],
  statement: `Given a 4-digit number, count how many times you apply Kaprekar's routine to reach <b>6174</b>: sort the digits descending (largest) and ascending (smallest, padded to 4 with leading zeros), subtract, repeat. <span class="rule">Example: <code class="inl">kaprekar(1234)</code> → <b>3</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "≤ 7 steps",
      approach: `Loop until the current value is 6174. Each pass: pad to 4 digits, sort the digits both ways to form the largest and smallest numbers, subtract, and count. The routine is guaranteed to reach 6174 in at most 7 steps for any non-repdigit 4-digit number — the safety cap of 7 just guards the loop.`,
      code: `function kaprekar(n: number): number {
  let count = 0, cur = n;
  while (cur !== 6174) {
    const digits = String(cur).padStart(4, "0").split("");
    const desc = Number(digits.slice().sort((a, b) => +b - +a).join(""));
    const asc = Number(digits.slice().sort((a, b) => +a - +b).join(""));
    cur = desc - asc;
    count++;
    if (count > 7) break;
  }
  return count;
}`,
      mount,
    },
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for the routine — run it one line at a time. Watch the <b>while</b> condition test <code class='inl'>cur !== 6174</code>, the digits sort into the <b>biggest</b> and <b>smallest</b> arrangements, the subtraction produce the next <code class='inl'>cur</code>, and <code class='inl'>count</code> tick up until the loop locks on 6174. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "n =", value: 1234, min: 0, max: 9999, presets: [1234, 2025, 3524, 6174], hint: "4-digit n" } }) },
  ],
};
