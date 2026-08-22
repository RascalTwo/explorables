// #11 · Mile Pace — get to one unit, do the arithmetic there, format on the way out.
// "MM:SS" in and "MM:SS" out tempts you to divide the parts separately, which
// breaks the moment the seconds don't divide evenly. Collapse to total seconds,
// divide once, then split back — and let padStart handle the leading zeros
// rather than an if. Rounding the TOTAL also removes any 60-second carry.
import { el, mountDebugger } from "../shared.js";

// The four official freeCodeCamp cases first. Then two invented ones the official
// set never reaches: 5 / "45:07" is the only case whose answer has a leading zero
// in the SECONDS ("09:01"), and 2 / "00:59" is the only sub-minute pace and the
// only exact .5 to round. Both target the formatting rule the grader doesn't test.
const PRESETS = [
  { miles: 3, duration: "24:00" },
  { miles: 1, duration: "06:45" },
  { miles: 2, duration: "07:00" },
  { miles: 26.2, duration: "120:35" },
  { miles: 5, duration: "45:07" },
  { miles: 2, duration: "00:59" },
];

const pad2 = (x) => String(x).padStart(2, "0");
const clock = (sec) => `${pad2(Math.floor(sec / 60))}:${pad2(Math.round(sec) % 60)}`;

function solve(miles, duration) {
  const [mm, ss] = String(duration).split(":").map(Number);
  const total = (Number.isFinite(mm) ? mm : 0) * 60 + (Number.isFinite(ss) ? ss : 0);
  const exact = total / miles;
  const per = Math.round(exact);
  return { mm, ss, total, exact, per, m: Math.floor(per / 60), s: per % 60, out: `${pad2(Math.floor(per / 60))}:${pad2(per % 60)}` };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .mp-wrap { display:flex; flex-direction:column; gap:12px; }
    .mp-svg { width:100%; height:auto; display:block; background:var(--panel); border:1px solid var(--border); border-radius:12px; }
    .mp-svg text { font-family:var(--mono); }
    .mp-seg { stroke:var(--panel); stroke-width:1; }
    .mp-tick { stroke:var(--border); stroke-width:1.5; }
    .mp-tlab { fill:var(--muted); font-size:10.5px; text-anchor:middle; }
    .mp-mlab { fill:var(--text); font-size:11px; font-weight:700; text-anchor:middle; }
    .mp-cap { fill:var(--muted); font-size:11px; }
    .mp-cap.end { text-anchor:end; }
    .mp-chain { display:flex; flex-direction:column; gap:3px; font:12.5px var(--mono); color:var(--muted); }
    .mp-chain b { color:var(--text); }
    .mp-chain .lead { color:var(--warn); font-weight:800; }
    .mp-answer { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; font:600 13px var(--sans); color:var(--muted); }
    .mp-answer b { font:800 30px var(--mono); color:var(--good); letter-spacing:.02em; }
  `));
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inM = el("input"); inM.type = "number"; inM.step = "0.1"; inM.min = "0.1"; inM.value = "26.2"; inM.style.width = "84px";
  const inD = el("input"); inD.type = "text"; inD.value = "120:35"; inD.style.width = "96px";
  ctl.append(el("span", "ctl-label", "miles"), inM, el("span", "ctl-label", "duration MM:SS"), inD);
  const pre = el("div", "controls");
  PRESETS.forEach((p) => {
    const c = el("button", "chip", `${p.miles} mi in ${p.duration}`);
    c.onclick = () => { inM.value = String(p.miles); inD.value = p.duration; render(); };
    pre.append(c);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inM.oninput = inD.oninput = render;
  render();

  function render() {
    const miles = +inM.value;
    const duration = inD.value;
    out.innerHTML = "";
    if (!Number.isFinite(miles) || miles <= 0 || !/^\d+:\d{1,2}$/.test(duration.trim())) {
      out.append(el("div", "note", "Enter a positive number of miles and a duration as <code class='inl'>MM:SS</code> — e.g. <code class='inl'>120:35</code>."));
      return;
    }
    const r = solve(miles, duration.trim());

    // The bar is the whole run; each band is one mile at the computed pace, so a
    // fractional last mile shows up as a short band rather than being hidden.
    const W = 640, H = 118, pad = 26, y = 34, h = 30;
    const X = (sec) => pad + (sec / r.total) * (W - 2 * pad);
    const whole = Math.floor(miles);
    let bands = "", ticks = "";
    const labelEvery = whole <= 8 ? 1 : whole <= 14 ? 2 : 5;
    for (let k = 0; k < Math.ceil(miles); k++) {
      const a = Math.min(k, miles) * r.exact, b = Math.min(k + 1, miles) * r.exact;
      const partial = k + 1 > miles;
      bands += `<rect class="mp-seg" x="${X(a).toFixed(1)}" y="${y}" width="${Math.max(0.6, X(b) - X(a)).toFixed(1)}" height="${h}" ` +
        `fill="color-mix(in srgb, var(--accent) ${partial ? 18 : k % 2 ? 30 : 46}%, transparent)"/>`;
      if (k > 0 && (k % labelEvery === 0 || k === whole - 1)) {
        ticks += `<line class="mp-tick" x1="${X(a).toFixed(1)}" y1="${y - 5}" x2="${X(a).toFixed(1)}" y2="${y + h + 5}"/>` +
          `<text class="mp-tlab" x="${X(a).toFixed(1)}" y="${y + h + 18}">${clock(a)}</text>`;
      }
    }
    const midX = X(Math.min(1, miles) * r.exact / 2);
    const svg = `<svg class="mp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="the run split into miles">` +
      bands + ticks +
      `<text class="mp-mlab" x="${midX.toFixed(1)}" y="${y - 10}">mile 1 = ${r.out}</text>` +
      `<text class="mp-cap" x="${pad}" y="${H - 6}">start</text>` +
      `<text class="mp-cap end" x="${W - pad}" y="${H - 6}">${miles} mi in ${clock(r.total)} (${r.total.toLocaleString("en-US")}s)</text>` +
      `</svg>`;

    const wrap = el("div", "mp-wrap");
    wrap.append(el("div", null, svg));
    wrap.append(el("div", "mp-chain",
      `<div>1. one unit &nbsp;<b>${r.mm} × 60 + ${r.ss} = ${r.total.toLocaleString("en-US")}</b> seconds</div>` +
      `<div>2. divide &nbsp;&nbsp;&nbsp;<b>${r.total.toLocaleString("en-US")} ÷ ${miles} = ${Number.isInteger(r.exact) ? r.exact : r.exact.toFixed(3)}</b> s/mile${Number.isInteger(r.exact) ? "" : ` → Math.round → <b>${r.per}</b>`}</div>` +
      `<div>3. split back <b>${r.per} ÷ 60 = ${r.m}</b> min remainder <b>${r.s}</b> s</div>` +
      `<div>4. pad &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${pad2(r.m).length > String(r.m).length ? `<span class="lead">0</span>${r.m}` : r.m}</b> : <b>${pad2(r.s).length > String(r.s).length ? `<span class="lead">0</span>${r.s}` : r.s}</b></div>`));
    wrap.append(el("div", "mp-answer", `<span>milePace(${miles}, "${duration.trim()}") =</span> <b>"${r.out}"</b>`));
    wrap.append(el("div", "note", Number.isInteger(r.exact)
      ? `This one divides evenly, so nothing rounds. Try <b>26.2 mi in 120:35</b> — 7,235 ÷ 26.2 is 276.145…, and rounding the <b>total seconds</b> (not the minutes and seconds separately) is what keeps the answer honest.`
      : `<b>${r.total.toLocaleString("en-US")} ÷ ${miles}</b> isn't whole, so it rounds — and it rounds the <b>total in seconds</b>, before the split. Rounding after the split is where this problem bites: 59.5 seconds would round to 60, and <code class='inl'>"04:60"</code> isn't a time. Doing it in one unit means the remainder can never reach 60.`));
    out.append(wrap);
  }
}

// ── STEP — one unit, one divide, one format ─────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">milePace</span>(<span class="tok" data-t="param">miles</span>, <span class="tok" data-t="param">duration</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> [mm, ss] = <span class="tok" data-t="split">duration.<span class="fn">split</span>(<span class="st">":"</span>).<span class="fn">map</span>(Number)</span>;` },
  { ln: 3, html: `  <span class="k">const</span> total = <span class="tok" data-t="total">mm * 60 + ss</span>;` },
  { ln: 4, html: `  <span class="k">const</span> per = <span class="tok" data-t="per">Math.<span class="fn">round</span>(total / miles)</span>;` },
  { ln: 5, html: `  <span class="k">const</span> m = <span class="tok" data-t="m">Math.<span class="fn">floor</span>(per / 60)</span>;` },
  { ln: 6, html: `  <span class="k">const</span> s = <span class="tok" data-t="s">per % 60</span>;` },
  { ln: 7, html: `  <span class="k">return</span> <span class="st">\`</span><span class="tok" data-t="pad"><span class="st">\${</span><span class="fn">String</span>(m).<span class="fn">padStart</span>(2, <span class="st">"0"</span>)<span class="st">}</span>:<span class="st">\${</span><span class="fn">String</span>(s).<span class="fn">padStart</span>(2, <span class="st">"0"</span>)<span class="st">}</span></span><span class="st">\`</span>;` },
  { ln: 8, html: `}` },
];

const STEP_PRESETS = PRESETS.map((p) => `${p.miles} / ${p.duration}`);
const splitCase = (raw) => {
  const [m = "", d = ""] = String(raw).split("/");
  return { miles: +m.trim() || 1, duration: d.trim() || "00:00" };
};

function trace(raw) {
  const { miles, duration } = splitCase(raw);
  const r = solve(miles, duration);
  const steps = [];
  let mm, ss, total, per, m, s;
  const S = (line, note, x = {}) => {
    const vars = { miles, duration: `"${duration}"` };
    if (line >= 3) { vars.mm = mm; vars.ss = ss; }
    if (line >= 4) vars.total = total;
    if (line >= 5) vars.per = per;
    if (line >= 6) vars.m = m;
    if (line >= 7 && s !== undefined) vars.s = s;
    steps.push({ line, note, focus: x.focus, done: x.done, result: x.result,
      frames: [{ title: `milePace(${miles}, "${duration}")`, vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Average <b>${miles}</b> mile${miles === 1 ? "" : "s"} run in <b>${duration}</b> down to a per-mile pace — and hand it back in the same <code class='inl'>"MM:SS"</code> shape it arrived in.`, { focus: "param" });
  mm = r.mm; ss = r.ss;
  S(2, `Split on the colon and coerce both halves with <code class='inl'>map(Number)</code>: <b>mm = ${mm}</b>, <b>ss = ${ss}</b>. They're still two numbers, and dividing them separately is the trap — <b>${mm} ÷ ${miles}</b> and <b>${ss} ÷ ${miles}</b> would each leave a fraction with nowhere to go.`, { focus: "split", changed: ["mm", "ss"] });
  total = r.total;
  S(3, `Collapse to <b>one unit</b>: <b>${mm} × 60 + ${ss} = ${total.toLocaleString("en-US")}</b> seconds. From here it's ordinary division — the whole minutes/seconds structure has been temporarily thrown away, which is exactly what makes the arithmetic easy.`, { focus: "total", changed: ["total"] });
  per = r.per;
  S(4, `<b>${total.toLocaleString("en-US")} ÷ ${miles} = ${Number.isInteger(r.exact) ? r.exact : r.exact.toFixed(4)}</b> s/mile${Number.isInteger(r.exact) ? " — exact, nothing to round" : `, rounded to <b>${per}</b>`}. Rounding <i>here</i>, on the total, is deliberate: round the minutes and seconds separately and you can produce a 60 in the seconds slot.`, { focus: "per", changed: ["per"] });
  m = r.m;
  S(5, `Back into minutes: <b>Math.floor(${per} / 60) = ${m}</b>. <code class='inl'>floor</code>, not <code class='inl'>round</code> — the leftover belongs to the seconds, not to the minutes.`, { focus: "m", changed: ["m"] });
  s = r.s;
  S(6, `And the remainder is the seconds: <b>${per} % 60 = ${s}</b>. Because <code class='inl'>per</code> was already a whole number of seconds, this can never come out as 60.`, { focus: "s", changed: ["s"] });
  const padM = pad2(m) !== String(m), padS = pad2(s) !== String(s);
  S(7, `<code class='inl'>padStart(2, "0")</code> restores the two-digit shape${padM || padS ? ` — it adds the leading zero on ${[padM ? `the minutes (<b>${m}</b> → <b>${pad2(m)}</b>)` : "", padS ? `the seconds (<b>${s}</b> → <b>${pad2(s)}</b>)` : ""].filter(Boolean).join(" and ")}` : ` — both halves are already two digits here, so it changes nothing`}. <b>Return "${r.out}"</b>.`,
    { focus: "pad", done: true, result: `"${r.out}"`, ret: { value: `"${r.out}"` } });
  return steps;
}

export default {
  n: 11, id: "milepace", title: "Mile Pace", dates: ["2025-08-21"],
  statement: `Given a number of <b>miles</b> run and the <b>duration</b> as <code class="inl">"MM:SS"</code>, return the average time per mile in the same <code class="inl">"MM:SS"</code> format, with leading zeros where needed. <span class="rule">Example: <code class="inl">milePace(3, "24:00")</code> → <code class="inl">"08:00"</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — four conversions",
      approach: `A formatted value goes in and a formatted value comes out, which makes it tempting to divide the minutes and the seconds separately. Don't: neither half divides cleanly on its own, and the leftovers have nowhere to live. Collapse the whole duration into <b>one unit</b> — total seconds — divide there, and only then split it back. Rounding the <i>total</i> rather than the pieces is what stops a <code class='inl'>"04:60"</code> from ever forming, and <code class='inl'>padStart</code> covers the leading-zero rule without a single <code class='inl'>if</code>.`,
      code: `function milePace(miles: number, duration: string): string {
  const [mm, ss] = duration.split(":").map(Number);
  const total = mm * 60 + ss;              // one unit: seconds
  const per = Math.round(total / miles);   // round the TOTAL, not the pieces
  const m = Math.floor(per / 60);
  const s = per % 60;                      // can never be 60 — per is whole
  return \`\${String(m).padStart(2, "0")}:\${String(s).padStart(2, "0")}\`;
}`,
      mount,
    },
    { name: "Step through", cost: "unit in, unit out",
      approach: `Four moves: parse, collapse, divide, re-format. Run the official <b>26.2 / 120:35</b> to watch the rounding land, then <b>5 / 45:07</b> and <b>2 / 00:59</b> — the two cases where <code class='inl'>padStart</code> actually has something to do. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "miles / duration =", value: "26.2 / 120:35", presets: STEP_PRESETS, hint: "miles / MM:SS" } }) },
  ],
};
