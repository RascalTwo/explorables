// #331 · Nearest Multiple — round num to the closest multiple of a divisor.
// A number-line view: bracket num between two multiples, measure both gaps,
// crown the nearer one (ties round up, matching Math.round(num/multiple)).
import { el, esc, mountDebugger } from "../shared.js";

// [num, multiple] pairs — every FCC test case plus one exact-midpoint tie.
const PRESETS = [[5, 3], [17, 4], [43, 5], [38, 11], [93, 12], [15, 10]];

function solve(num, multiple) {
  const result = Math.round(num / multiple) * multiple;
  const lower = Math.floor(num / multiple) * multiple;
  const upper = lower + multiple;
  return { result, lower, upper, dLo: num - lower, dHi: upper - num, upWins: result === upper };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .nm-wrap { display:flex; flex-direction:column; gap:14px; }
    .nm-svg { width:100%; height:auto; display:block; background:var(--panel); border:1px solid var(--border); border-radius:12px; }
    .nm-svg text { font-family:var(--mono); }
    .nm-axis { stroke:var(--border); stroke-width:2; }
    .nm-tick { stroke:var(--border); stroke-width:1.5; }
    .nm-tick.hot { stroke:var(--muted); stroke-width:2; }
    .nm-tlab { fill:var(--muted); font-size:11px; text-anchor:middle; }
    .nm-tlab.hot { fill:var(--text); font-weight:700; }
    .nm-bracket { fill:none; stroke-width:2.5; }
    .nm-blab { font-size:12px; font-weight:700; text-anchor:middle; }
    .nm-lose { stroke:var(--muted); } .nm-lose-t { fill:var(--muted); }
    .nm-win  { stroke:var(--good);  } .nm-win-t  { fill:var(--good); }
    .nm-pin { stroke:var(--accent); stroke-width:2; }
    .nm-dot { fill:var(--accent); }
    .nm-plab { fill:var(--accent); font-size:12px; font-weight:800; text-anchor:middle; }
    .nm-node { fill:var(--panel-2); stroke-width:2; }
    .nm-node.win { stroke:var(--good); } .nm-node.lose { stroke:var(--border); }
    .nm-nlab { font-size:13px; font-weight:800; text-anchor:middle; }
    .nm-nlab.win { fill:var(--good); } .nm-nlab.lose { fill:var(--muted); }
    .nm-result { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;
                 font:600 13px var(--sans); color:var(--muted); }
    .nm-result b { font:800 22px var(--mono); color:var(--good); }
    .nm-result .eq { font:700 15px var(--mono); color:var(--text); }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inNum = el("input"); inNum.type = "number"; inNum.value = "5"; inNum.style.width = "72px";
  const inMul = el("input"); inMul.type = "number"; inMul.value = "3"; inMul.min = "1"; inMul.style.width = "72px";
  ctl.append(el("span", "ctl-label", "round"), inNum, el("span", "ctl-label", "to nearest multiple of"), inMul);
  const pre = el("div", "controls");
  PRESETS.forEach(([a, b]) => {
    const c = el("button", "chip", `${a}, ${b}`);
    c.onclick = () => { inNum.value = String(a); inMul.value = String(b); render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inNum.oninput = inMul.oninput = render;
  render();

  function render() {
    const num = Math.trunc(+inNum.value);
    const multiple = Math.trunc(+inMul.value);
    if (!Number.isFinite(num) || !Number.isFinite(multiple) || multiple <= 0) {
      out.innerHTML = `<div class="note">Enter a number and a positive multiple.</div>`;
      return;
    }
    const { result, lower, upper, dLo, dHi, upWins } = solve(num, multiple);

    // Frame a window of multiples around the bracket for context.
    const k = Math.floor(num / multiple);
    let startIdx = k - 2;
    if (num >= 0 && startIdx < 0) startIdx = 0;
    const endIdx = Math.max(k + 3, startIdx + 4);
    const W = 640, H = 190, padX = 46, axisY = 118;
    const vMin = startIdx * multiple, vMax = endIdx * multiple;
    const X = (v) => padX + ((v - vMin) / (vMax - vMin)) * (W - 2 * padX);

    let ticks = "";
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const val = idx * multiple, x = X(val).toFixed(1);
      const hot = val === lower || val === upper;
      ticks += `<line class="nm-tick${hot ? " hot" : ""}" x1="${x}" y1="${axisY - 7}" x2="${x}" y2="${axisY + 7}"/>` +
               `<text class="nm-tlab${hot ? " hot" : ""}" x="${x}" y="${axisY + 26}">${val}</text>`;
    }

    // The two bracketing multiples, drawn as nodes; the nearer one is the winner.
    const xLo = X(lower), xHi = X(upper), xNum = X(num);
    const node = (x, val, win) =>
      `<circle class="nm-node ${win ? "win" : "lose"}" cx="${x.toFixed(1)}" cy="${axisY}" r="15"/>` +
      `<text class="nm-nlab ${win ? "win" : "lose"}" x="${x.toFixed(1)}" y="${axisY + 5}">${val}</text>`;

    // Gap brackets above the axis: winner highlighted, loser muted.
    const gap = (xa, xb, dist, win) => {
      const y = axisY - 34, mid = ((xa + xb) / 2).toFixed(1);
      const c = win ? "nm-win" : "nm-lose", ct = win ? "nm-win-t" : "nm-lose-t";
      return `<path class="nm-bracket ${c}" d="M ${xa.toFixed(1)} ${axisY - 16} L ${xa.toFixed(1)} ${y} L ${xb.toFixed(1)} ${y} L ${xb.toFixed(1)} ${axisY - 16}"/>` +
             `<text class="nm-blab ${ct}" x="${mid}" y="${y - 6}">${dist}</text>`;
    };

    const svg =
      `<svg class="nm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="number line">` +
      `<line class="nm-axis" x1="${padX}" y1="${axisY}" x2="${W - padX}" y2="${axisY}"/>` +
      ticks +
      gap(Math.min(xLo, xNum), Math.max(xLo, xNum), dLo, upWins ? false : true) +
      gap(Math.min(xNum, xHi), Math.max(xNum, xHi), dHi, upWins ? true : false) +
      // num marker
      `<line class="nm-pin" x1="${xNum.toFixed(1)}" y1="${axisY}" x2="${xNum.toFixed(1)}" y2="${axisY + 44}"/>` +
      `<circle class="nm-dot" cx="${xNum.toFixed(1)}" cy="${axisY + 44}" r="5"/>` +
      `<text class="nm-plab" x="${xNum.toFixed(1)}" y="${axisY + 64}">num = ${num}</text>` +
      node(xLo, lower, !upWins) +
      node(xHi, upper, upWins) +
      `</svg>`;

    const tie = dLo === dHi;
    out.innerHTML = `<div class="nm-wrap">${svg}` +
      `<div class="nm-result">` +
        `<span class="eq">Math.round(${num} / ${multiple}) × ${multiple} = Math.round(${(num / multiple).toFixed(3)}) × ${multiple} = ${Math.round(num / multiple)} × ${multiple}</span>` +
        `→ <b>${result}</b>` +
      `</div>` +
      `<div class="note">${lower} is <b>${dLo}</b> away, ${upper} is <b>${dHi}</b> away — ` +
        (tie
          ? `an exact tie, so it <b>rounds up</b> to <b style="color:var(--good)">${upper}</b> (that's what <code class="inl">Math.round</code> does at .5).`
          : `<b style="color:var(--good)">${result}</b> is nearer.`) +
      `</div></div>`;
  }
}

// ── STEP — trace q → rounded → result, one line at a time ────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">roundToNearestMultiple</span>(<span class="tok" data-t="param">num</span>, <span class="tok" data-t="param">multiple</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> q = <span class="tok" data-t="q">num / multiple</span>;` },
  { ln: 3, html: `  <span class="k">const</span> rounded = <span class="tok" data-t="rnd">Math.round(q)</span>;` },
  { ln: 4, html: `  <span class="k">const</span> result = <span class="tok" data-t="res">rounded * multiple</span>;` },
  { ln: 5, html: `  <span class="k">return</span> result;` },
  { ln: 6, html: `}` },
];

function trace(raw) {
  const parts = String(raw).split(/[\s,]+/).filter(Boolean).map(Number);
  const num = Math.trunc(parts[0] || 0);
  const multiple = Math.trunc(parts[1] || 1) || 1;
  const steps = [];
  let q, rounded, result;
  const S = (line, note, x = {}) => {
    const vars = { num, multiple };
    if (line >= 2) vars.q = Number.isInteger(q) ? q : q.toFixed(3);
    if (line >= 3) vars.rounded = rounded;
    if (line >= 4) vars.result = result;
    steps.push({ line, note, focus: x.focus, done: x.done, result: x.result,
      frames: [{ title: "roundToNearestMultiple", vars, changed: x.changed || [], structs: [] }] });
  };

  S(1, `Call <b>roundToNearestMultiple(${num}, ${multiple})</b> — round ${num} to the nearest multiple of ${multiple}.`, { focus: "param" });
  q = num / multiple;
  S(2, `Divide: <b>q = ${num} / ${multiple} = ${Number.isInteger(q) ? q : q.toFixed(3)}</b> — how many multiples fit.`, { focus: "q", changed: ["q"] });
  rounded = Math.round(q);
  S(3, `Round to the nearest whole number of multiples: <b>Math.round(${Number.isInteger(q) ? q : q.toFixed(3)}) = ${rounded}</b> (a .5 tie rounds up).`, { focus: "rnd", changed: ["rounded"] });
  result = rounded * multiple;
  S(4, `Scale back up: <b>result = ${rounded} × ${multiple} = ${result}</b>.`, { focus: "res", changed: ["result"] });
  S(5, `Return the nearest multiple: <b>${result}</b>.`, { done: true, result });
  return steps;
}

export default {
  n: 331, id: "nearmult", title: "Nearest Multiple", dates: ["2026-07-07"],
  statement: `Given two integers, round the first to the nearest multiple of the second. <span class="rule">Example: <code class="inl">roundToNearestMultiple(5, 3)</code> → <b>6</b> — 5 sits between 3 and 6, one step from 6 and two from 3.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1)",
      approach: `Dividing <code class='inl'>num / multiple</code> asks "how many multiples fit?" — a fractional answer. <code class='inl'>Math.round</code> snaps that count to the nearest whole number (rounding a .5 tie <b>up</b>), and multiplying back by <code class='inl'>multiple</code> lands you on the nearest multiple. On the number line that's just picking whichever of the two bracketing multiples is closer.`,
      code: `function roundToNearestMultiple(num: number, multiple: number): number {
  const q = num / multiple;
  const rounded = Math.round(q);
  return rounded * multiple;
}`,
      mount,
    },
    { name: "Step through", cost: "line-by-line",
      approach: `Run the formula one line at a time. Watch <code class='inl'>q</code> become the fractional multiple-count, <code class='inl'>Math.round</code> snap it to a whole number, and the final multiply scale it back onto the number line. Enter <b>num, multiple</b>, then hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "num, multiple =", value: "5, 3", hint: "num, multiple", presets: ["5, 3", "17, 4", "43, 5", "38, 11", "93, 12"] } }) },
  ],
};
