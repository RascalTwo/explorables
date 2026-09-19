// #40 · Photo Storage — no algorithm here, just a contested unit and a rounding rule.
// The answer is one expression, so what is worth learning is why the statement is
// shaped the way it is. It spends one of its two bullets pinning down "1 gigabyte
// equals 1000 megabytes" — and a spec only pins down a conversion when the
// conversion is DISPUTED. Drive manufacturers sell decimal GB (10^9 bytes) while
// operating systems have historically reported binary GiB (2^30), which is the
// entire reason a "1 TB" drive shows as 931 GB. The demo puts both on a toggle
// so the answer visibly moves; 1000 is what the grader wants.
// The other bullet says "whole photos", which is Math.floor and not Math.round —
// a partial photo is no photo. Official 3.5/750 is the case that catches a round
// (214285.71 must floor to 214285, not round to 214286).
// ONE approach, deliberately. There is no second mental model for a division, and
// inventing a slower one would be a strawman (CONTRIBUTING Tier 3 §1).
// Click the 4.4 MB / 1.1 GB chip — ours, not freeCodeCamp's — to watch the floor
// go one photo low on a division whose exact answer is a whole number.
import { el, mountDebugger } from "../shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   4.4 MB / 1.1 GB — ours, and the only case here where the one-line answer is
//     arithmetically WRONG. 1100 / 4.4 is exactly 250, but 4.4 has no exact double,
//     so the quotient computes as 249.99999999999997 and floor returns 249. Found
//     by sweeping mb over 0.10–50.00 in 0.01 steps against gb over 0.1–4000.0 in
//     0.1 steps, keeping only the pairs whose quotient is exactly a whole number,
//     and asking which of those floor one low: 71,579 of them do. Not a rare case.
//   120 MB / 0.1 GB — ours. The drive cannot hold a single photo, so the answer is
//     0. The official set never returns 0 and never goes below one full photo.
// The first three official cases are all exact fits differing only in scale; they
// are here because official coverage is a floor, not because 2/1 teaches something
// 1/1 doesn't. The cases that carry weight are 3.5/750 (floor vs round) and
// 3.5/5.5 (a remainder small enough to see).
const CASES = [
  [1, 1], [2, 1], [4, 256], [3.5, 750], [3.5, 5.5],
  [4.4, 1.1], [120, 0.1],
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

// The two candidate meanings of "gigabyte". The statement picks the first one.
const FACTORS = [1000, 1024];

// The graded one-liner, kept verbatim so the demo can't drift from the answer.
const solve = (mb, gb, k) => Math.floor((gb * k) / mb);

// How many decimal places a value is written with — the sliders step by 0.1, so
// this is always small. Guards against exponent notation just in case.
const decimals = (x) => {
  const s = String(x);
  return s.includes("e") ? 0 : (s.split(".")[1] || "").length;
};

// The float-safe answer: scale both operands until they are integers, so the
// division runs on exact integers and binary rounding never touches the quotient.
// This is the standard fix, and it is what makes the 4.4 / 1.1 divergence provable
// rather than a claim — it returns 250 where the one-liner returns 249.
function exactly(mb, gb, k) {
  const p = Math.max(decimals(mb), decimals(gb));
  const s = 10 ** p;
  return Math.floor((Math.round(gb * s) * k) / Math.round(mb * s));
}

const fmt = (x) => x.toLocaleString("en-US");
// Trim the tail off a long float without hiding the interesting part — a value
// like 249.99999999999997 must stay legible as "not quite 250".
const num = (x) => (Number.isInteger(x) ? String(x) : String(x).slice(0, 20));

// 214,285 tiles is not a picture, it's a hang. Past this many photos the grid is
// replaced by a proportional bar; the fractional leftover moves to the magnified
// slot below, which is the only part of it worth looking at anyway.
// 260 rather than a round 240 so the 4.4 / 1.1 case lands on the grid: that one
// draws 249 tiles followed by a slot the code says is 100% full and still refuses
// to count, which is the float bug made visible. The other six cases are all in
// the thousands and use the bar; the grid's middle ground is slider territory.
const TILE_CAP = 260;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ph-wrap { display:flex; flex-direction:column; gap:12px; }
    .ph-ctl { display:flex; align-items:center; gap:9px; }
    .ph-ctl input[type=range] { flex:1; min-width:150px; max-width:300px; accent-color:var(--accent); }
    .ph-val { font:700 13px var(--mono); min-width:74px; }
    .ph-drive { border:1px solid var(--border); border-radius:10px; background:var(--panel-2); padding:10px; }
    .ph-tiles { display:flex; flex-wrap:wrap; gap:3px; }
    .ph-t { width:13px; height:13px; border-radius:3px; background:var(--accent); }
    .ph-t.part { background:var(--panel); border:1px dashed var(--danger); position:relative; overflow:hidden; }
    .ph-t.part i { position:absolute; inset:0 auto 0 0; background:color-mix(in srgb, var(--danger) 45%, transparent); }
    .ph-bar { height:20px; border-radius:6px; background:var(--panel); border:1px solid var(--border); overflow:hidden; display:flex; }
    .ph-bar .fill { background:var(--accent); }
    .ph-bar .waste { background:color-mix(in srgb, var(--danger) 55%, transparent); min-width:2px; }
    .ph-slot { display:flex; align-items:center; gap:10px; }
    .ph-slot .box { width:210px; height:26px; border-radius:6px; border:1px dashed var(--danger); background:var(--panel); overflow:hidden; }
    .ph-slot .box.full { border-style:solid; border-color:var(--good); }
    .ph-slot .box i { display:block; height:100%; background:color-mix(in srgb, var(--danger) 45%, transparent); }
    .ph-slot .box.full i { background:color-mix(in srgb, var(--good) 40%, transparent); }
    .ph-slot .cap { font:12px var(--sans); color:var(--muted); }
    .ph-slot .cap b { color:var(--text); font-family:var(--mono); }
    .ph-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .ph-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .ph-r b { color:var(--text); }
    .ph-r.hot { border-color:var(--danger); color:var(--danger); }
    .ph-r.hot b { color:var(--danger); }
    .ph-warn { font:12px var(--sans); color:var(--warn); border:1px solid var(--warn); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--warn) 10%, transparent); }
  `));
}

// One labelled slider. Ranges are wide enough that every official case is reachable
// here and not only from a chip: 0.1–200 MB covers 1, 2, 3.5 and 4; 0.1–1000 GB
// covers 1, 5.5, 256 and 750. The cost is that dragging near the top of the drive
// range is coarse — 5.5 GB is half a percent of the track — so the arrow keys
// (one 0.1 step each) are the way to land on a value exactly, and the chips carry
// the large cases. A log scale would drag better and could not hit 750 at all.
function slider(label, unit, min, max, value, onChange) {
  const row = el("div", "ph-ctl");
  const r = el("input"); r.type = "range"; r.min = min; r.max = max; r.step = 0.1; r.value = value;
  const out = el("span", "ph-val", `${value} ${unit}`);
  r.oninput = () => { out.textContent = `${+r.value} ${unit}`; onChange(+r.value); };
  row.append(el("span", "ctl-label", label), r, out);
  return { row, set: (v) => { r.value = v; out.textContent = `${v} ${unit}`; } };
}

function mount(host) {
  ensureStyle();
  let mb = 3.5, gb = 5.5, k = 1000;

  const sMb = slider("photo", "MB", 0.1, 200, mb, (v) => { mb = v; render(); });
  const sGb = slider("drive", "GB", 0.1, 1000, gb, (v) => { gb = v; render(); });

  // The unit toggle — the whole reason the statement has a bullet about gigabytes.
  const kRow = el("div", "ph-ctl");
  kRow.append(el("span", "ctl-label", "1 GB ="));
  const kChips = FACTORS.map((f) => {
    const c = el("button", "chip", `${f} MB`);
    c.onclick = () => { k = f; render(); };
    kRow.append(c); return c;
  });

  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach(([cm, cg], i) => {
    const c = el("button", "chip", `${cm} MB / ${cg} GB`);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.onclick = () => { mb = cm; gb = cg; k = 1000; sMb.set(cm); sGb.set(cg); render(); };
    pre.append(c);
  });

  const out = el("div");
  host.append(sMb.row, sGb.row, kRow, pre, out);
  render();

  function render() {
    const capacity = gb * k;
    const raw = capacity / mb;
    const whole = solve(mb, gb, k);
    const safe = exactly(mb, gb, k);
    const rounded = Math.round(raw);
    const leftover = capacity - whole * mb;
    const frac = leftover / mb;
    const drift = whole !== safe;

    kChips.forEach((c, i) => c.classList.toggle("on", FACTORS[i] === k));
    out.innerHTML = "";
    const wrap = el("div", "ph-wrap");

    wrap.append(el("div", "result-line",
      `<span class="badge ${whole > 0 ? "ok" : "no"}">numberOfPhotos(${mb}, ${gb}) → ${fmt(whole)}</span>` +
      `<span class="more">${gb} GB × ${k} = ${fmt(capacity)} MB ÷ ${mb} MB</span>`));

    if (k !== 1000) {
      const decimal = solve(mb, gb, 1000);
      wrap.append(el("div", "ph-warn",
        `Reading a gigabyte as <b>1024</b> MB — the binary GiB. ${decimal === whole
          ? `The answer stays at <b>${fmt(whole)}</b> here, because the extra <b>${(gb * 24).toFixed(1)} MB</b> the binary reading buys is still less than one <b>${mb} MB</b> photo. The factor is wrong and the test passes anyway, which is how a unit bug survives to production.`
          : `The answer moved from <b>${fmt(decimal)}</b> to <b>${fmt(whole)}</b>, and only the first is what freeCodeCamp's grader accepts. That gap is the whole reason the statement bothers to say "1 gigabyte equals 1000 megabytes".`}`));
    }

    // The three ways to turn the quotient into a count, side by side. Only floor
    // answers "whole photos"; the others are here to be visibly wrong.
    const rows = el("div", "ph-rows");
    rows.append(el("div", "ph-r", `exact quotient <b>${num(raw)}</b>`));
    rows.append(el("div", "ph-r", `Math.floor <b>${fmt(whole)}</b>`));
    rows.append(el("div", "ph-r" + (rounded !== whole ? " hot" : ""),
      `Math.round <b>${fmt(rounded)}</b>${rounded !== whole ? " ✗" : ""}`));
    if (drift) rows.append(el("div", "ph-r hot", `integer-scaled <b>${fmt(safe)}</b> ✗`));
    wrap.append(rows);

    const drive = el("div", "ph-drive");
    if (whole <= TILE_CAP) {
      const tiles = el("div", "ph-tiles");
      for (let i = 0; i < whole; i++) tiles.append(el("div", "ph-t"));
      if (frac > 1e-9) tiles.append(el("div", "ph-t part", `<i style="width:${(frac * 100).toFixed(1)}%"></i>`));
      drive.append(tiles);
    } else {
      const used = (whole * mb) / capacity;
      drive.append(el("div", "ph-bar",
        `<div class="fill" style="width:${(used * 100).toFixed(4)}%"></div><div class="waste"></div>`));
      drive.append(el("div", "muted",
        `${fmt(whole)} photos is too many to draw one at a time, so this is the drive to scale. The leftover ${leftover.toFixed(2)} MB is ${((1 - used) * 100).toFixed(4)}% of the bar — invisible, which is exactly why the slot below is drawn separately.`));
    }
    wrap.append(drive);

    const filled = frac > 1e-9 ? frac : whole > 0 ? 1 : 0;
    wrap.append(el("div", "ph-slot",
      `<div class="box${frac > 1e-9 ? "" : " full"}"><i style="width:${(filled * 100).toFixed(1)}%"></i></div>` +
      `<span class="cap">${frac > 1e-9
        ? `the next slot holds <b>${leftover.toFixed(2)} MB</b> — <b>${(frac * 100).toFixed(1)}%</b> of a ${mb} MB photo, so it stores <b>none</b>`
        : `the drive divides <b>exactly</b> — <b>0 MB</b> left over, so floor and round agree here`}</span>`));

    wrap.append(el("div", "note", noteFor({ mb, gb, k, capacity, raw, whole, safe, rounded, leftover, frac, drift })));
    out.append(wrap);
  }
}

function noteFor(s) {
  if (s.drift)
    return `This is the case the one-liner gets <b>wrong</b>, and no official test covers it. <b>${s.gb} × ${s.k}</b> is exactly <b>${fmt(s.capacity)}</b>, and <b>${fmt(s.capacity)} ÷ ${s.mb}</b> is exactly <b>${fmt(s.safe)}</b> — a whole number, no remainder at all. But <b>${s.mb}</b> has no exact representation as a double, so the division lands one unit in the last place low, at <b>${num(s.raw)}</b>, and <code class='inl'>Math.floor</code> does what it is told and chops off the <b>${s.safe}</b>th photo. This is the standing hazard with <code class='inl'>floor</code> on a quotient: it turns an error far too small to print into an error of <b>one whole item</b>. The fix is not an epsilon but to get the decimals out of the division — scale both operands to integers first, which is what the "integer-scaled" figure above does. freeCodeCamp's grader never asks, so the plain expression is still the answer to this challenge; it just isn't the answer to the general problem.`;
  if (!s.whole)
    return `Zero. The drive holds <b>${fmt(s.capacity)} MB</b> and one photo needs <b>${s.mb} MB</b>, so not even the first one fits and the quotient is already below 1. Nothing in the official set goes here, which is worth noticing — "return the number of whole photos" has a natural floor at 0 and a solution built on <code class='inl'>Math.round</code> would report <b>${s.rounded}</b> on a quotient of <b>${num(s.raw)}</b>, inventing a photo that does not exist. The empty case is usually where a rounding choice announces itself.`;
  if (s.frac <= 1e-9)
    return `An exact fit: <b>${fmt(s.capacity)} MB</b> divided by <b>${s.mb} MB</b> leaves nothing over, so the drive is completely full and <code class='inl'>Math.floor</code> has nothing to discard. Three of freeCodeCamp's five cases look like this, which is the trap in the official set — on an exact fit <code class='inl'>floor</code>, <code class='inl'>round</code> and <code class='inl'>trunc</code> all agree, so a wrong rounding choice survives them untouched. Drag the photo slider one step and watch a remainder appear.`;
  if (s.rounded !== s.whole)
    return `The quotient is <b>${num(s.raw)}</b> and the answer is <b>${fmt(s.whole)}</b>, not <b>${fmt(s.rounded)}</b>. The leftover <b>${s.leftover.toFixed(2)} MB</b> is <b>${(s.frac * 100).toFixed(1)}%</b> of a photo — more than half, so <code class='inl'>Math.round</code> rounds it up into a photo that was never stored. This is the case that separates a correct solution from a plausible one: "the number of <b>whole</b> photos" is a floor, and past the halfway point of a slot the two functions disagree by one. JavaScript has no integer division to fall back on, so the choice has to be written down explicitly.`;
  return `The quotient is <b>${num(s.raw)}</b>, so <b>${fmt(s.whole)}</b> photos fit and <b>${s.leftover.toFixed(2)} MB</b> is stranded — <b>${(s.frac * 100).toFixed(1)}%</b> of a photo, which stores nothing. <code class='inl'>Math.round</code> happens to agree here because the leftover is under half a slot, and that agreement is the danger: a rounding bug is silent on most inputs and only shows up once the remainder crosses <b>50%</b>. Push the drive slider up a little and the two answers split.`;
}

// ── STEP — the one-liner unrolled, so the conversion and the floor are separate ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">numberOfPhotos</span>(<span class="tok" data-t="param">photoSizeMb, hardDriveSizeGb</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="unit">MB_PER_GB = <span class="nu">1000</span></span>;  <span class="cm">// stated by the problem</span>` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="cap">capacityMb = hardDriveSizeGb * MB_PER_GB</span>;` },
  { ln: 4, html: `  <span class="k">const</span> <span class="tok" data-t="div">exact = capacityMb / photoSizeMb</span>;` },
  { ln: 5, html: `  <span class="k">return</span> <span class="tok" data-t="floor">Math.<span class="fn">floor</span>(exact)</span>;` },
  { ln: 6, html: `}` },
];

// "3.5, 5.5" → [3.5, 5.5]. Anything unparseable falls back to the opening case
// rather than tracing NaN, which would render a debugger full of "NaN".
function parsePair(raw) {
  const [a, b] = String(raw).split(",").map((t) => Number(t.trim()));
  return [a > 0 ? a : 3.5, b > 0 ? b : 5.5];
}

function trace(raw) {
  const [mb, gb] = parsePair(raw);
  const steps = [];
  const K = 1000;
  let capacityMb, exact, whole;
  const S = (line, note, x = {}) => {
    const vars = { photoSizeMb: mb, hardDriveSizeGb: gb };
    if (line >= 2) vars.MB_PER_GB = K;              // `const MB_PER_GB` is line 2
    if (line >= 3) vars.capacityMb = capacityMb;    // `const capacityMb` is line 3
    if (line >= 4) vars.exact = num(exact);         // `const exact` is line 4
    // The slot picture only exists once the floor has happened, and then it stays
    // for the rest of the call. Big counts are elided rather than dropped — the
    // last chip is the rejected partial, which is the one worth looking at.
    const structs = [];
    if (line >= 5) {
      const items = [];
      const show = Math.min(whole, 8);
      for (let i = 0; i < show; i++) items.push(`#${i + 1}`);
      if (whole > show) items.push(`… +${fmt(whole - show)}`);
      const rest = (capacityMb - whole * mb) / mb;
      if (rest > 1e-9) items.push(`${(rest * 100).toFixed(0)}% ✗`);
      structs.push({ label: "photos stored", items, newest: rest > 1e-9 });
    }
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `numberOfPhotos(${mb}, ${gb})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
  };

  S(1, `Two numbers arrive in <b>two different units</b> — <b>${mb}</b> is megabytes, <b>${gb}</b> is gigabytes — and the answer is a count with no unit at all. That mismatch is the entire problem: there is no loop and no algorithm here, only a conversion and a decision about the remainder.`, { focus: "param" });

  S(2, `The statement spends one of its two bullets saying <b>1 gigabyte equals 1000 megabytes</b>, and a spec only pins down a conversion when the conversion is <b>contested</b>. It is: drive manufacturers sell decimal GB, while an operating system has historically reported binary GiB at <b>1024</b> MB — which is why a "1 TB" drive shows up as 931 GB. Take 1024 here and this same drive reports <b>${fmt(Math.floor((gb * 1024) / mb))}</b> instead of <b>${fmt(Math.floor((gb * K) / mb))}</b>. Read the factor off the page; never assume it.`, { focus: "unit", changed: ["MB_PER_GB"] });

  capacityMb = gb * K;
  S(3, `Convert the drive into the photo's unit: <b>${gb} × ${K} = ${fmt(capacityMb)} MB</b>. Converting the <i>drive</i> down rather than the <i>photo</i> up is the cheaper direction — one multiplication against one division — and it keeps the two quantities comparable before anything is divided. From here the gigabyte never appears again.`, { focus: "cap", changed: ["capacityMb"] });

  exact = capacityMb / mb;
  whole = Math.floor(exact);
  const rest = capacityMb - whole * mb;
  const rounded = Math.round(exact);
  S(4, `<b>${fmt(capacityMb)} ÷ ${mb} = ${num(exact)}</b>. This is how many photos the drive holds if a photo could be cut in half — the honest answer to a question nobody asked. ${rest > 1e-9
    ? `The fractional part is real space: <b>${rest.toFixed(2)} MB</b> of the drive that is free and useless.`
    : `It divides exactly, so there is no fraction to argue about — which is precisely why an exact-fit test cannot tell floor from round.`}`, { focus: "div", changed: ["exact"] });

  S(5, `The other bullet says <b>whole</b> photos, and that word is the rounding rule. ${rest > 1e-9
    ? `<b>${rest.toFixed(2)} MB</b> is left over — <b>${((rest / mb) * 100).toFixed(1)}%</b> of a photo, and a fraction of a photo is not a photo. <code class='inl'>Math.floor</code> throws it away and returns <b>${fmt(whole)}</b>. ${rounded !== whole
        ? `<code class='inl'>Math.round</code> would return <b>${fmt(rounded)}</b> here, because the leftover is over half a slot — the exact failure freeCodeCamp's <code class='inl'>(3.5, 750)</code> case is built to catch.`
        : `<code class='inl'>Math.round</code> happens to agree on this input, which is what makes a rounding bug so quiet: it only surfaces once the remainder passes 50%.`}`
    : `Nothing is left over, so <code class='inl'>floor</code> has nothing to discard and returns <b>${fmt(whole)}</b> unchanged. Write it anyway — JavaScript has no integer division, so a quotient that <i>looks</i> whole is only whole until the inputs change.`}`,
    { focus: "floor", eval: { expr: `Math.floor(${num(exact)})`, val: whole === rounded } });

  S(5, `<b>Return ${fmt(whole)}.</b> Both bugs this problem can produce live in the two lines above rather than anywhere else: the wrong factor on line 3, or the wrong rounding on line 5. There is nothing else here to get wrong.`,
    { focus: "floor", done: true, result: String(whole), ret: { value: whole } });
  return steps;
}

export default {
  n: 40, id: "photos", title: "Photo Storage", dates: ["2025-09-19"],
  statement: `Given a photo size in <b>megabytes (MB)</b> and a hard drive capacity in <b>gigabytes (GB)</b>, return the number of photos the hard drive can store, where <b>1 gigabyte equals 1000 megabytes</b> and only <b>whole</b> photos count. <span class="rule">Example: <code class="inl">numberOfPhotos(3.5, 5.5)</code> → <code class="inl">1571</code> — 5500 MB fits 1571.43 photos, and the 0.43 is not a photo.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — one multiply, one divide",
      approach: `The code is <code class='inl'>Math.floor(hardDriveSizeGb * 1000 / photoSizeMb)</code> and that is genuinely all of it, so the interesting question is what the <i>statement</i> is doing. It has two bullets and neither is filler. The first pins the conversion: <b>1 gigabyte equals 1000 megabytes</b>. A spec only spells out a conversion when the conversion is disputed, and this one is — drive manufacturers sell <b>decimal</b> GB (10⁹ bytes) while operating systems have historically reported <b>binary</b> GiB (2³⁰ bytes, 1024 MB), which is the entire reason a "1 TB" drive shows up as 931 GB. Flip the toggle and watch <code class='inl'>(4, 256)</code> go from <b>64,000</b> to <b>65,536</b>; both are defensible readings of "256 GB" and only one is the answer. The second bullet says <b>whole</b> photos, which is <code class='inl'>Math.floor</code> and not <code class='inl'>Math.round</code> — a partial photo is no photo, and the official <code class='inl'>(3.5, 750)</code> case exists to catch exactly that, since <b>214285.71</b> must floor to <b>214285</b>. Then there is one hazard the grader never tests. <code class='inl'>floor</code> on a floating-point quotient is one unit in the last place away from being wrong: on <b>4.4 MB / 1.1 GB</b> the true answer is <b>250</b> exactly, but <code class='inl'>1100 / 4.4</code> computes as <b>249.99999999999997</b> and the floor returns <b>249</b>. An error too small to print becomes an error of one whole photo. Scaling both operands to integers before dividing is the fix; the plain expression is still the answer to <i>this</i> challenge.`,
      code: `// Convert the drive into the photo's unit, then floor — "whole photos" means a
// partial photo is no photo, so Math.round would over-count by one whenever the
// leftover passes half a slot (3.5 MB / 750 GB is 214285.71, and 214286 is wrong).
// The factor is 1000 because the problem says so: a gigabyte is decimal here, not
// the 1024 MB binary GiB an operating system would report.
// Known hazard, untested by the grader: floor on a float quotient can land one ULP
// low — (4.4, 1.1) is exactly 250 but computes as 249.99999999999997 and floors to
// 249. Scale both operands to integers first if that case has to be right.
function numberOfPhotos(photoSizeMb: number, hardDriveSizeGb: number): number {
  return Math.floor((hardDriveSizeGb * 1000) / photoSizeMb);
}`,
      mount,
    },
    {
      name: "Step through", cost: "units → divide → floor",
      approach: `The one-liner pulled apart into the three decisions hiding inside it: read the factor, convert the drive to megabytes, divide, then choose what to do with the remainder. Start on <b>3.5, 5.5</b> — official — where <b>1.50 MB</b> is stranded and <code class='inl'>round</code> happens to agree, then try <b>3.5, 750</b> where it doesn't. <b>4.4, 1.1</b> is ours: the trace returns <b>249</b> on a division whose exact answer is <b>250</b>. <b>120, 0.1</b> is the empty drive. Type any <code class='inl'>photoMb, driveGb</code> pair. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { type: "text", label: "photo MB, drive GB =", value: "3.5, 5.5",
                 presets: CASES.map(([m, g]) => `${m}, ${g}`), hint: "two numbers" },
      }),
    },
  ],
};
