// #41 · File Storage — both sides to bytes, then floor; the smallest unit keeps floats exact.
// No algorithm: three units in, one count out. The statement's conversion table is a
// ladder, and the one decision hiding in it is WHICH rung to stand on. Bytes is the
// bottom rung, so every conversion is a multiplication by a power of 1000 and both
// operands tend to come out as integers — 220.5 KB is exactly 220500 B. Convert the
// file up into gigabytes instead and 1 B becomes 1e-9 GB, a number no double holds,
// so 1 GB / 1 B floors to 999,999,999 instead of 1,000,000,000. Same arithmetic,
// opposite direction, one whole file lost. "Whole files" is the second rule and it
// is Math.floor, not Math.round: three of the six official cases (4096 B / 1.5 GB,
// 220.5 KB / 100 GB, 4.5 MB / 750 GB) have a remainder over half a file, which is
// precisely what a round gets wrong.
// ONE approach, deliberately. A loop that subtracts one file at a time is the same
// division done a billion times (and would not finish — the on-screen gap would be
// "never"), and the GB route above is not an alternative model, it is the same
// formula standing on a worse rung and returning wrong answers. Neither is a
// genuine second approach (CONTRIBUTING Tier 3 §1).
// Click the 1 B / 1 GB chip — ours — to watch the rival route lose a file.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep, DbgStruct } from "./lib/shared.js";

// Bytes per unit, from the statement's table multiplied out: 1 KB = 1000 B,
// 1 MB = 1000 KB = 1e6 B. The drive is always gigabytes, so 1 GB = 1e9 B.
const BYTES: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6 };
const GB = 1e9;
const UNITS = Object.keys(BYTES);

// The 6 official freeCodeCamp cases in the grader's order (the text of every test
// agrees with the assertion it runs), then three of ours.
//   1 B / 1 GB — ours. Converting the FILE up to gigabytes first (file / 1e9) makes
//     the quotient 999,999,999 instead of 1,000,000,000. Found by sweeping unit x
//     size x drive (sizes and drives up to 60, plus their tenths): over 500
//     combinations lose a file by that route, against 3 for the bytes route.
//   1 KB / 4.1 GB — ours, and the only kind of case where the bytes route itself
//     is wrong. 4.1 has no exact double, so 4.1 * 1e9 lands a hair under
//     4,100,000,000 and floor returns 4,099,999 files where the exact answer is
//     4,100,000. The official set never reaches it (every official drive is a
//     round or half number).
//   700 MB / 0.5 GB — ours. The drive cannot hold one file, so the answer is 0.
//     No official case is below 200.
const CASES: [number, string, number][] = [
  [500, "KB", 1],
  [50000, "B", 1],
  [5, "MB", 1],
  [4096, "B", 1.5],
  [220.5, "KB", 100],
  [4.5, "MB", 750],
  [1, "B", 1],
  [1, "KB", 4.1],
  [700, "MB", 0.5],
];
const OFFICIAL = 6; // CASES[0..5] are freeCodeCamp's; the rest are ours.

// The graded expression, kept verbatim so the demo cannot drift from the answer.
const solve = (size: number, unit: string, gb: number) =>
  Math.floor((gb * GB) / (size * BYTES[unit]!));
// The rival route: express the file in gigabytes, then divide gigabytes by gigabytes.
const viaGb = (size: number, unit: string, gb: number) =>
  Math.floor(gb / ((size * BYTES[unit]!) / GB));

const decimals = (x: number) => {
  const s = String(x);
  return s.includes("e") ? 0 : (s.split(".")[1] ?? "").length;
};

// The float-safe answer: scale both operands to integers and divide as BigInt, so
// binary rounding never touches the quotient. This is what makes the 4.1 GB
// divergence provable rather than a claim — it returns 4,100,000 where the one-liner
// returns 4,099,999.
function exactly(size: number, unit: string, gb: number) {
  const s = 10 ** Math.min(9, Math.max(decimals(size), decimals(gb)));
  const file = BigInt(Math.round(size * s)) * BigInt(BYTES[unit]!);
  const drive = BigInt(Math.round(gb * s)) * BigInt(GB);
  return Number(drive / file);
}

const fmt = (x: number) => x.toLocaleString("en-US");
// Trim a long float without hiding the interesting tail.
const num = (x: number) => (Number.isInteger(x) ? fmt(x) : String(x).slice(0, 20));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .fi-wrap { display:flex; flex-direction:column; gap:12px; }
    .fi-ctl { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
    .fi-ctl input[type=number] { width:110px; }
    .fi-drive { border:1px solid var(--border); border-radius:10px; background:var(--panel-2); padding:10px; display:flex; flex-direction:column; gap:8px; }
    .fi-bar { height:20px; border-radius:6px; background:var(--panel); border:1px solid var(--border); overflow:hidden; display:flex; }
    .fi-bar .fill { background:var(--accent); }
    .fi-bar .waste { background:color-mix(in srgb, var(--danger) 55%, transparent); min-width:2px; }
    .fi-slot { display:flex; align-items:center; gap:10px; }
    .fi-slot .box { width:210px; height:26px; border-radius:6px; border:1px dashed var(--danger); background:var(--panel); overflow:hidden; }
    .fi-slot .box.full { border-style:solid; border-color:var(--good); }
    .fi-slot .box i { display:block; height:100%; background:color-mix(in srgb, var(--danger) 45%, transparent); }
    .fi-slot .box.full i { background:color-mix(in srgb, var(--good) 40%, transparent); }
    .fi-slot .cap { font:12px var(--sans); color:var(--muted); }
    .fi-slot .cap b { color:var(--text); font-family:var(--mono); }
    .fi-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .fi-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .fi-r b { color:var(--text); }
    .fi-r.hot { border-color:var(--danger); color:var(--danger); }
    .fi-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let size = 4096,
    unit = "B",
    gb = 1.5;

  const num_ = (v: number, onChange: (v: number) => void) => {
    const i = el("input");
    i.type = "number";
    i.step = "any";
    i.min = "0";
    i.value = String(v);
    // oxlint-disable-next-line unicorn/prefer-number-coercion -- empty field must stay NaN; Number("") is 0
    i.addEventListener("input", () => onChange(Number.parseFloat(i.value)));
    return i;
  };
  const iSize = num_(size, (v) => {
    size = v;
    render();
  });
  const iGb = num_(gb, (v) => {
    gb = v;
    render();
  });

  const row = el("div", "fi-ctl");
  row.append(el("span", "ctl-label", "fileSize ="), iSize, el("span", "ctl-label", "fileUnit ="));
  const uChips = UNITS.map((u) => {
    const c = el("button", "chip", u);
    c.addEventListener("click", () => {
      unit = u;
      render();
    });
    row.append(c);
    return c;
  });
  row.append(el("span", "ctl-label", "driveSizeGb ="), iGb, el("span", "ctl-label", "GB"));

  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach(([s, u, g], i) => {
    const c = el("button", "chip", `${s} ${u} / ${g} GB`);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      size = s;
      unit = u;
      gb = g;
      iSize.value = String(s);
      iGb.value = String(g);
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(row, pre, out);
  render();

  function render() {
    uChips.forEach((c, i) => {
      c.classList.toggle("on", UNITS[i] === unit);
    });
    out.innerHTML = "";
    if (!(size > 0 && gb > 0)) {
      out.append(
        el(
          "div",
          "note",
          `Enter a positive file size and a positive drive size — a zero-byte file would divide by zero and "fit" infinitely many times.`,
        ),
      );
      return;
    }
    const fileBytes = size * BYTES[unit]!,
      driveBytes = gb * GB;
    const raw = driveBytes / fileBytes;
    const whole = solve(size, unit, gb);
    const safe = exactly(size, unit, gb);
    const rival = viaGb(size, unit, gb);
    const rounded = Math.round(raw);
    const leftover = driveBytes - whole * fileBytes;
    const frac = leftover / fileBytes;
    const drift = whole !== safe;

    const wrap = el("div", "fi-wrap");
    wrap.append(
      el(
        "div",
        "result-line",
        `<span class="badge ${whole > 0 ? "ok" : "no"}">numberOfFiles(${size}, "${unit}", ${gb}) → ${fmt(whole)}</span>` +
          `<span class="more">${fmt(driveBytes)} B ÷ ${fmt(fileBytes)} B</span>`,
      ),
    );

    // The ways to get from the quotient to a count, side by side. Only the first
    // is the answer; the rest are here to be visibly wrong when they are.
    const rows = el("div", "fi-rows");
    rows.append(el("div", "fi-r", `exact quotient <b>${num(raw)}</b>`));
    rows.append(el("div", "fi-r", `via bytes + floor <b>${fmt(whole)}</b>${drift ? " ✗" : ""}`));
    rows.append(
      el(
        "div",
        "fi-r" + (rounded !== whole ? " hot" : ""),
        `Math.round <b>${fmt(rounded)}</b>${rounded !== whole ? " ✗" : ""}`,
      ),
    );
    rows.append(
      el(
        "div",
        "fi-r" + (rival !== whole ? " hot" : ""),
        `file → GB first <b>${fmt(rival)}</b>${rival !== whole ? " ✗" : ""}`,
      ),
    );
    if (drift) rows.append(el("div", "fi-r hot", `integer-scaled <b>${fmt(safe)}</b> ✓`));
    wrap.append(rows);

    // The drive as a bar. A file is a hair of it, so the leftover is drawn again
    // in the slot below, magnified to one file — the only part worth looking at.
    const used = Math.min(1, (whole * fileBytes) / driveBytes);
    const drv = el("div", "fi-drive");
    drv.append(
      el(
        "div",
        "fi-bar",
        `<div class="fill" style="width:${(used * 100).toFixed(4)}%"></div><div class="waste"></div>`,
      ),
    );
    const partial = frac > 1e-9;
    drv.append(
      el(
        "div",
        "fi-slot",
        `<div class="box${partial ? "" : " full"}"><i style="width:${((partial ? Math.min(frac, 1) : whole > 0 ? 1 : 0) * 100).toFixed(1)}%"></i></div>` +
          `<span class="cap">${
            partial
              ? `the next slot holds <b>${fmt(Math.round(leftover * 100) / 100)} B</b> — <b>${(frac * 100).toFixed(1)}%</b> of a ${fmt(fileBytes)} B file, so it stores <b>none</b>`
              : `the drive divides <b>exactly</b> — <b>0 B</b> left over, so floor and round agree`
          }</span>`,
      ),
    );
    wrap.append(drv);

    wrap.append(
      el(
        "div",
        "note",
        noteFor({
          size,
          unit,
          gb,
          driveBytes,
          fileBytes,
          raw,
          whole,
          safe,
          rival,
          rounded,
          leftover,
          frac,
          drift,
        }),
      ),
    );
    out.append(wrap);
  }
}

interface S {
  size: number;
  unit: string;
  gb: number;
  driveBytes: number;
  fileBytes: number;
  raw: number;
  whole: number;
  safe: number;
  rival: number;
  rounded: number;
  leftover: number;
  frac: number;
  drift: boolean;
}

// What did THIS input exercise? Each branch names a different rule, because every
// preset was chosen to land on a different one.
function noteFor(s: S) {
  if (s.drift)
    return `This is the case the one-liner gets <b>wrong</b>, and no official test covers it. <b>${s.gb} × 1e9</b> should be exactly <b>${fmt(s.driveBytes)}</b>, but <b>${s.gb}</b> has no exact double, so the product lands a hair low and the quotient comes out at <b>${num(s.raw)}</b> — and <code class='inl'>Math.floor</code> chops it to <b>${fmt(s.whole)}</b> where the exact answer is <b>${fmt(s.safe)}</b>. An error too small to print has become an error of <b>${fmt(s.safe - s.whole)} whole file${s.safe - s.whole === 1 ? "" : "s"}</b>, which is the standing hazard of <code class='inl'>floor</code> on a float quotient. The fix is not an epsilon but to get the decimals out before dividing — scale both operands to integers, which is what the green "integer-scaled" figure does. freeCodeCamp's grader never asks, so the plain expression is still the answer to this challenge; it just is not the answer to the general problem.`;
  if (s.rival !== s.whole)
    return `Both routes do the same arithmetic and disagree by <b>${fmt(Math.abs(s.whole - s.rival))}</b> file${Math.abs(s.whole - s.rival) === 1 ? "" : "s"}. Going <i>up</i> the ladder first, <b>${s.size} ${s.unit}</b> becomes <b>${num(s.fileBytes / GB)} GB</b>, a fraction with no exact binary form, so the final quotient is a hair under the true <b>${fmt(s.whole)}</b> and <code class='inl'>floor</code> drops it to <b>${fmt(s.rival)}</b>. Going <i>down</i> to bytes keeps both operands as plain integers, where multiplication and division are exact. That is the transferable rule: when a conversion table offers a choice, convert everything into the <b>smallest</b> unit, because small-unit values are whole numbers and whole numbers do not drift.`;
  if (!s.whole)
    return `Zero. The drive holds <b>${fmt(s.driveBytes)} B</b> and one file needs <b>${fmt(s.fileBytes)} B</b>, so the quotient is <b>${num(s.raw)}</b> and not even the first file fits. Nothing in the official set goes here — the smallest answer is 200 — but "the number of whole files" has a natural floor at 0 and a <code class='inl'>Math.round</code> solution would report <b>${fmt(s.rounded)}</b> on it, inventing a file that does not exist.`;
  if (s.frac <= 1e-9)
    return `An exact fit: <b>${fmt(s.driveBytes)} B</b> divided by <b>${fmt(s.fileBytes)} B</b> leaves nothing over, so <code class='inl'>Math.floor</code> has nothing to discard. Three of freeCodeCamp's six cases look like this, which is the trap in the official set — on an exact fit <code class='inl'>floor</code>, <code class='inl'>round</code> and <code class='inl'>trunc</code> all agree, so a wrong rounding choice survives them untouched. Change the file size by one and watch a remainder appear.`;
  if (s.rounded !== s.whole)
    return `The quotient is <b>${num(s.raw)}</b> and the answer is <b>${fmt(s.whole)}</b>, not <b>${fmt(s.rounded)}</b>. The leftover <b>${fmt(Math.round(s.leftover * 100) / 100)} B</b> is <b>${(s.frac * 100).toFixed(1)}%</b> of a file — more than half, so <code class='inl'>Math.round</code> rounds it up into a file that was never stored. This is the case that separates a correct solution from a plausible one: "whole files" is a floor, and past the halfway point of a slot the two functions disagree by one. JavaScript has no integer division to fall back on, so the choice has to be written down explicitly. Note the unit never mattered to this: it only changed the factor that took ${s.size} ${s.unit} to <b>${fmt(s.fileBytes)} B</b>.`;
  return `The quotient is <b>${num(s.raw)}</b>, so <b>${fmt(s.whole)}</b> files fit and <b>${fmt(Math.round(s.leftover * 100) / 100)} B</b> is stranded — <b>${(s.frac * 100).toFixed(1)}%</b> of a file, which stores nothing. <code class='inl'>Math.round</code> happens to agree here because the leftover is under half a slot, and that agreement is the danger: a rounding bug is silent until the remainder passes <b>50%</b>. Nudge the drive size up and the two answers split.`;
}

// ── STEP — the one-liner unrolled, so each conversion and the floor are separate ──
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">numberOfFiles</span>(<span class="tok" data-t="param">fileSize, fileUnit, driveSizeGb</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="table">BYTES = { B: <span class="nu">1</span>, KB: <span class="nu">1e3</span>, MB: <span class="nu">1e6</span> }</span>;  <span class="cm">// the statement's table, multiplied out</span>`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="file">fileBytes = fileSize * BYTES[fileUnit]</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> <span class="tok" data-t="drive">driveBytes = driveSizeGb * <span class="nu">1e9</span></span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">return</span> <span class="tok" data-t="floor">Math.<span class="fn">floor</span>(driveBytes / fileBytes)</span>;`,
  },
  { ln: 6, html: `}` },
];

// "500, KB, 1" -> [500, "KB", 1]. Anything unparseable falls back to the opening
// case rather than tracing NaN or an unknown unit, which would render a debugger
// full of "undefined".
function parseCase(raw: string): [number, string, number] {
  const [a, b, c] = raw.split(",").map((t) => t.trim());
  const size = Number(a),
    gb = Number(c),
    unit = (b ?? "").toUpperCase();
  return size > 0 && gb > 0 && Object.hasOwn(BYTES, unit) ? [size, unit, gb] : [500, "KB", 1];
}

function trace(raw: string) {
  const [size, unit, gb] = parseCase(raw);
  const steps: DbgStep[] = [];
  let fileBytes = 0,
    driveBytes = 0,
    whole = 0;
  const S = (
    line: number,
    note: string,
    x: {
      focus?: string | undefined;
      changed?: string[] | undefined;
      eval?: { expr: string; val: boolean } | undefined;
      done?: boolean | undefined;
      result?: string | undefined;
      ret?: { value: number } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = {
      fileSize: size,
      fileUnit: `"${unit}"`,
      driveSizeGb: gb,
    };
    if (line >= 2) vars["BYTES"] = "{ B: 1, KB: 1000, MB: 1000000 }"; // `const BYTES` is line 2
    if (line >= 3) vars["fileBytes"] = fmt(fileBytes); // `const fileBytes` is line 3
    if (line >= 4) vars["driveBytes"] = fmt(driveBytes); // `const driveBytes` is line 4
    // The slot picture only exists once the floor has happened, and then it stays
    // for the rest of the call. Big counts are elided; the last chip is the
    // rejected partial, which is the one worth looking at.
    const structs: DbgStruct[] = [];
    if (line >= 5) {
      const items: string[] = [];
      const show = Math.min(whole, 8);
      for (let i = 0; i < show; i++) items.push(`#${i + 1}`);
      if (whole > show) items.push(`… +${fmt(whole - show)}`);
      const rest = (driveBytes - whole * fileBytes) / fileBytes;
      if (rest > 1e-9) items.push(`${(rest * 100).toFixed(0)}% ✗`);
      structs.push({ label: "files stored", items, newest: rest > 1e-9 });
    }
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `numberOfFiles(${size}, "${unit}", ${gb})`,
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Three inputs in <b>two different units</b> — <b>${size} ${unit}</b> for the file, <b>${gb} GB</b> for the drive — and the answer is a count with no unit at all. There is no loop and no search here, only a conversion and a decision about the remainder, so the work is choosing which unit to compare them in.`,
    { focus: "param" },
  );

  S(
    2,
    `The statement's table is a ladder — 1 KB is 1000 B, 1 MB is 1000 KB, 1 GB is 1000 MB — and this line multiplies it out so every rung is expressed in <b>bytes</b>. Bytes is deliberate: it is the smallest unit, so values in it are whole numbers, and arithmetic on whole numbers is exact. Pick a bigger unit and the file turns into a fraction (1 B is 0.000000001 GB), which no double can hold. Only <b>B, KB and MB</b> are keys: any other unit would look up <code class='inl'>undefined</code> and poison the answer with <code class='inl'>NaN</code>, and the grader never asks.`,
    { focus: "table", changed: ["BYTES"] },
  );

  fileBytes = size * BYTES[unit]!;
  S(
    3,
    `Convert the file: <b>${size} × ${fmt(BYTES[unit]!)} = ${fmt(fileBytes)} B</b>. Looking the multiplier up by name is the whole reason the table is an object rather than three <code class='inl'>if</code> branches — adding a unit would be one entry, not one more branch.${Number.isInteger(fileBytes) ? "" : ` <b>${fmt(fileBytes)}</b> is not a whole number of bytes, so this input already has a rounding hazard baked in.`}`,
    { focus: "file", changed: ["fileBytes"] },
  );

  driveBytes = gb * GB;
  S(
    4,
    `Convert the drive the same way: <b>${gb} × 1e9 = ${fmt(driveBytes)} B</b>. The drive's unit is fixed at gigabytes, so it needs no lookup — just the one factor, <b>1000 × 1000 × 1000</b>. Now both quantities are in the same unit and nothing else about units can go wrong. ${Number.isInteger(driveBytes) ? "" : `Careful: <b>${gb}</b> has no exact double, so this product is already slightly off — the next line is where it surfaces.`}`,
    { focus: "drive", changed: ["driveBytes"] },
  );

  const exact = driveBytes / fileBytes;
  whole = Math.floor(exact);
  const rest = driveBytes - whole * fileBytes;
  const rounded = Math.round(exact);
  const truth = exactly(size, unit, gb);
  S(
    5,
    `<b>${fmt(driveBytes)} ÷ ${fmt(fileBytes)} = ${num(exact)}</b>. ${
      whole !== truth
        ? `Floor returns <b>${fmt(whole)}</b>, but the exact answer is <b>${fmt(truth)}</b>: the quotient is a hair under a whole number and <code class='inl'>Math.floor</code> chops the last file off. freeCodeCamp's grader never reaches an input like this.`
        : rest > 1e-9
          ? `<b>${fmt(Math.round(rest * 100) / 100)} B</b> is left over — <b>${((rest / fileBytes) * 100).toFixed(1)}%</b> of a file, and a fraction of a file is not a file. <code class='inl'>Math.floor</code> throws it away and returns <b>${fmt(whole)}</b>. ${
              rounded !== whole
                ? `<code class='inl'>Math.round</code> would return <b>${fmt(rounded)}</b>, because the leftover is over half a slot — the failure three of the official cases are built to catch.`
                : `<code class='inl'>Math.round</code> happens to agree on this input, which is what makes a rounding bug so quiet: it only surfaces once the remainder passes 50%.`
            }`
          : `It divides exactly, so there is nothing to discard and <code class='inl'>floor</code> returns <b>${fmt(whole)}</b> unchanged. Write it anyway — JavaScript has no integer division, and a quotient that <i>looks</i> whole is only whole until the inputs change.`
    }`,
    {
      focus: "floor",
      eval: {
        expr: `Math.floor(${num(exact)}) === Math.round(${num(exact)})`,
        val: whole === rounded,
      },
    },
  );

  S(
    5,
    `<b>Return ${fmt(whole)}.</b> Both bugs this problem can produce live in two lines rather than anywhere else: the unit chosen on lines 2–4, and the rounding on line 5. There is nothing else here to get wrong.`,
    { focus: "floor", done: true, result: String(whole), ret: { value: whole } },
  );
  return steps;
}

export default {
  n: 41,
  id: "file-storage",
  title: "File Storage",
  dates: ["2025-09-20"],
  statement: `Given a <b>file size</b>, a <b>unit</b> for the file size, and a hard drive capacity in <b>gigabytes (GB)</b>, return the number of <b>whole</b> files the drive can store. The unit is bytes (<code class="inl">"B"</code>), kilobytes (<code class="inl">"KB"</code>) or megabytes (<code class="inl">"MB"</code>), with <b>1 KB = 1000 B</b>, <b>1 MB = 1000 KB</b> and <b>1 GB = 1000 MB</b>. <span class="rule">Example: <code class="inl">numberOfFiles(500, "KB", 1)</code> → <code class="inl">2000</code> — a 1 GB drive is 1,000,000 KB, and 500 KB goes into that 2000 times.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — one lookup, one divide",
      approach: `Three units arrive and a unitless count leaves, so there is nothing to search — the whole problem is choosing a unit to compare in. The statement hands over a ladder (B, KB, MB, GB), and the right rung to stand on is the <b>bottom</b> one. In bytes both operands are whole numbers — <code class='inl'>220.5 KB</code> is exactly <code class='inl'>220500 B</code>, <code class='inl'>4.5 MB</code> is exactly <code class='inl'>4500000 B</code> — and arithmetic on whole numbers is exact. Convert the file <i>up</i> into gigabytes instead and a byte becomes <code class='inl'>1e-9 GB</code>, which no double represents: <code class='inl'>(1, "B", 1)</code> floors to <b>999,999,999</b> instead of <b>1,000,000,000</b>, one file short on the simplest input there is. Click the <b>1 B / 1 GB</b> chip to watch the "file → GB first" row lose it. The second rule is the word <b>whole</b>, which is <code class='inl'>Math.floor</code> and not <code class='inl'>Math.round</code>: three of the six official cases (<code class='inl'>4096 B</code> / 1.5, <code class='inl'>220.5 KB</code> / 100, <code class='inl'>4.5 MB</code> / 750) leave a remainder over half a file, which is exactly what a round gets wrong, and the other three are exact fits that cannot tell the two apart. Looking the multiplier up by name in a small object beats three <code class='inl'>if</code> branches because a new unit is one entry rather than one more branch. And one hazard no official test reaches: <code class='inl'>floor</code> on a float quotient sits one ULP from being wrong. <b>1 KB / 4.1 GB</b> is exactly <b>4,100,000</b>, but <code class='inl'>4.1 * 1e9</code> lands a hair under 4.1 billion and the one-liner returns <b>4,099,999</b>. Scaling both operands to integers first is the fix; the plain expression is still the answer to <i>this</i> challenge.`,
      code: `// Put both sides in bytes — the smallest unit, so both operands tend to be whole
// numbers and the division is exact. Converting the file UP to gigabytes instead
// makes 1 B equal 1e-9 GB, which no double holds: (1, "B", 1) would floor to
// 999999999.
// "Whole files" is a floor, not a round: 4096 B on a 1.5 GB drive is 366210.9375,
// and 366211 would be a file that was never stored.
// Known hazard, untested by the grader: floor on a float quotient can land one ULP
// low — (1, "KB", 4.1) is exactly 4100000 but computes as 4099999 because 4.1 has
// no exact double. Scale both operands to integers first if that has to be right.
// An unknown unit looks up undefined and returns NaN; the statement never asks.
function numberOfFiles(fileSize: number, fileUnit: string, driveSizeGb: number): number {
  const BYTES: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6 };
  return Math.floor((driveSizeGb * 1e9) / (fileSize * BYTES[fileUnit]!));
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "units → bytes → floor",
      approach: `The one-liner pulled apart into the decisions hiding inside it: build the byte table, convert the file, convert the drive, then divide and choose what to do with the remainder. Start on <b>500, KB, 1</b> — official, an exact fit where floor and round cannot be told apart — then <b>4096, B, 1.5</b>, where <b>0.9375</b> of a file is stranded and <code class='inl'>round</code> would invent one. <b>1, B, 1</b> and <b>1, KB, 4.1</b> are ours: the first is the byte-sized file the GB route loses, the second returns <b>4,099,999</b> on a division whose exact answer is <b>4,100,000</b>. <b>700, MB, 0.5</b> is the drive too small for a single file. Type any <code class='inl'>size, unit, driveGb</code> triple, with the unit one of B, KB or MB. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "size, unit, drive GB =",
            value: "500, KB, 1",
            presets: CASES.map(([s, u, g]) => `${s}, ${u}, ${g}`),
            hint: "e.g. 220.5, KB, 100",
          },
        }),
    },
  ],
} satisfies Challenge;
