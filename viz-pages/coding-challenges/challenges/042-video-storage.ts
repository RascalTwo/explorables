// #42 · Video Storage — two unit tables, guards in statement order, then bytes and floor.
// #41's conversion with the rules turned up: the units now arrive on BOTH sides and the
// statement says which ones are legal and what to return otherwise. The two legal sets
// differ — a video may be B, KB, MB or GB, a drive only GB or TB — so the clean shape is
// two small lookup tables rather than one, and the tables ARE the validation: a unit is
// valid exactly when it is a key. Two traps live in that sentence. A key test has to be
// Object.hasOwn, not truthiness or `in`: "constructor" and "toString" are inherited by
// every plain object, so `!VIDEO[unit]` waves them through and the arithmetic quietly
// returns NaN. And the guards run video first, drive second, because that is the
// statement's order — official case 2 (1 TB video, 10 TB drive) pins nothing about it,
// since only one unit is wrong, so what happens when BOTH are wrong is ours to decide.
// Past the guards it is #41 again: both sides to bytes, divide, floor. Official cases
// 1, 4 and 5 are the three arithmetic ones (case 5, 1.5 GB / 2.2 TB, leaves .67 of a
// video, which a round gets wrong); cases 2 and 3 are the two guards, one each.
// ONE approach, deliberately. One table with a flag per unit, or a switch per unit,
// is the same lookup respelled, not a second mental model (Tier 3 §1).
// Click the 1 TB / 10 MB chip — ours — to see both guards fail and only the first speak.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep, DbgStruct } from "./lib/shared.js";

// Bytes per unit. Two tables because the statement lists two different legal sets.
const VIDEO: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9 };
const DRIVE: Record<string, number> = { GB: 1e9, TB: 1e12 };
const ALL_UNITS = ["B", "KB", "MB", "GB", "TB"];

// The 5 official freeCodeCamp cases in the grader's order (the text of every test
// agrees with the assertion it runs), then three of ours.
//   1 TB / 10 MB — ours. BOTH units are illegal, and the statement does not say
//     which message wins. The bullets list the video unit first, so ours returns
//     "Invalid video unit"; no official case has two wrong units, so the grader
//     cannot tell this from the reverse order.
//   500 constructor / 100 GB — ours. "constructor" is not a unit, but it IS a
//     property of every object, so a truthiness check on the table accepts it and
//     returns NaN where the statement wants "Invalid video unit".
//   1 KB / 4.1 GB — ours, and the only kind of case where the arithmetic is wrong.
//     4.1 has no exact double, so 4.1 * 1e9 lands a hair under 4,100,000,000 and
//     floor returns 4,099,999 where the exact answer is 4,100,000. Found by
//     sweeping every legal unit pair over sizes and drives up to 60 and their
//     tenths: 210 combinations come out one low. The official set never reaches it.
const CASES: [number, string, number, string][] = [
  [500, "MB", 100, "GB"],
  [1, "TB", 10, "TB"],
  [2000, "MB", 100000, "MB"],
  [500000, "KB", 2, "TB"],
  [1.5, "GB", 2.2, "TB"],
  [1, "TB", 10, "MB"],
  [500, "constructor", 100, "GB"],
  [1, "KB", 4.1, "GB"],
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

// The graded function, kept verbatim so the demo cannot drift from the answer.
function solve(vs: number, vu: string, ds: number, du: string): number | string {
  if (!Object.hasOwn(VIDEO, vu)) return "Invalid video unit";
  if (!Object.hasOwn(DRIVE, du)) return "Invalid drive unit";
  return Math.floor((ds * DRIVE[du]!) / (vs * VIDEO[vu]!));
}

const decimals = (x: number) => {
  const s = String(x);
  return s.includes("e") ? 0 : (s.split(".")[1] ?? "").length;
};
// The float-safe answer: scale both operands to integers, divide as BigInt.
function exactly(vs: number, vu: string, ds: number, du: string) {
  const s = 10 ** Math.min(9, Math.max(decimals(vs), decimals(ds)));
  const video = BigInt(Math.round(vs * s)) * BigInt(VIDEO[vu]!);
  const drive = BigInt(Math.round(ds * s)) * BigInt(DRIVE[du]!);
  return Number(drive / video);
}

const fmt = (x: number) => x.toLocaleString("en-US");
const num = (x: number) => (Number.isInteger(x) ? fmt(x) : String(x).slice(0, 20));
const q = (s: string) => JSON.stringify(s);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .vi-wrap { display:flex; flex-direction:column; gap:12px; }
    .vi-ctl { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
    .vi-ctl input[type=number] { width:110px; }
    .vi-ctl input[type=text] { width:96px; }
    .vi-gates { display:flex; flex-direction:column; gap:5px; }
    .vi-gate { display:grid; grid-template-columns:18px minmax(0,1.3fr) minmax(0,2fr); align-items:center; gap:10px; padding:7px 10px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); }
    .vi-gate.pass { border-color:var(--good); }
    .vi-gate.fail { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .vi-gate.skip { opacity:.5; border-style:dashed; }
    .vi-n { font:700 10px var(--mono); color:var(--muted); text-align:right; }
    .vi-call { font:12px var(--mono); color:var(--accent); overflow-wrap:anywhere; }
    .vi-v { font:12px var(--sans); color:var(--muted); }
    .vi-v b { font-family:var(--mono); color:var(--text); }
    .vi-gate.fail .vi-v b { color:var(--danger); }
    .vi-rows { display:flex; flex-wrap:wrap; gap:6px; }
    .vi-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .vi-r b { color:var(--text); }
    .vi-r.hot { border-color:var(--danger); color:var(--danger); }
    .vi-r.hot b { color:var(--danger); }
    .chip.vi-na { opacity:.55; text-decoration:line-through; }
    @media (max-width:640px) { .vi-gate { grid-template-columns:18px minmax(0,1fr); } .vi-v { grid-column:1 / -1; } }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let vs = 1.5,
    vu = "GB",
    ds = 2.2,
    du = "TB";

  const numIn = (v: number, onChange: (v: number) => void) => {
    const i = el("input");
    i.type = "number";
    i.step = "any";
    i.min = "0";
    i.value = String(v);
    // oxlint-disable-next-line unicorn/prefer-number-coercion -- empty field must stay NaN; Number("") is 0
    i.addEventListener("input", () => onChange(Number.parseFloat(i.value)));
    return i;
  };
  const textIn = (v: string, onChange: (v: string) => void) => {
    const i = el("input");
    i.type = "text";
    i.value = v;
    i.spellcheck = false;
    i.addEventListener("input", () => onChange(i.value));
    return i;
  };
  const iVs = numIn(vs, (v) => {
    vs = v;
    render();
  });
  const iDs = numIn(ds, (v) => {
    ds = v;
    render();
  });
  const iVu = textIn(vu, (v) => {
    vu = v;
    render();
  });
  const iDu = textIn(du, (v) => {
    du = v;
    render();
  });

  // Unit chips for one side. A unit the statement does not allow there is struck
  // through, so the two legal sets are visible before anything is run.
  const unitChips = (
    table: Record<string, number>,
    input: HTMLInputElement,
    set: (u: string) => void,
  ) =>
    ALL_UNITS.map((u) => {
      const c = el("button", "chip" + (Object.hasOwn(table, u) ? "" : " vi-na"), u);
      c.addEventListener("click", () => {
        set(u);
        input.value = u;
        render();
      });
      return c;
    });
  const vChips = unitChips(VIDEO, iVu, (u) => {
    vu = u;
  });
  const dChips = unitChips(DRIVE, iDu, (u) => {
    du = u;
  });

  const rowV = el("div", "vi-ctl"),
    rowD = el("div", "vi-ctl");
  rowV.append(
    el("span", "ctl-label", "videoSize ="),
    iVs,
    el("span", "ctl-label", "videoUnit ="),
    iVu,
    ...vChips,
  );
  rowD.append(
    el("span", "ctl-label", "driveSize ="),
    iDs,
    el("span", "ctl-label", "driveUnit ="),
    iDu,
    ...dChips,
  );

  const pre = el("div", "controls");
  // Chips come off CASES, so a case added there can never go unreachable here.
  CASES.forEach(([s, u, d, w], i) => {
    const c = el("button", "chip", `${s} ${u} / ${d} ${w}`);
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      vs = s;
      vu = u;
      ds = d;
      du = w;
      iVs.value = String(s);
      iVu.value = u;
      iDs.value = String(d);
      iDu.value = w;
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(rowV, rowD, pre, out);
  render();

  // oxlint-disable-next-line complexity -- single render pass wires every panel from one state; splitting needs a rewrite
  function render() {
    out.innerHTML = "";
    const vOk = Object.hasOwn(VIDEO, vu),
      dOk = Object.hasOwn(DRIVE, du);
    const numbersOk = vs > 0 && ds > 0;
    const wrap = el("div", "vi-wrap");

    if (vOk && dOk && !numbersOk) {
      out.append(
        el(
          "div",
          "note",
          `Enter a positive video size and a positive drive size — a zero-byte video would divide by zero and "fit" infinitely many times.`,
        ),
      );
      return;
    }
    const answer = solve(vs, vu, ds, du);
    wrap.append(
      el(
        "div",
        "result-line",
        `<span class="badge ${typeof answer === "number" && answer > 0 ? "ok" : "no"}">numberOfVideos(${vs}, ${q(vu)}, ${ds}, ${q(du)}) → ${typeof answer === "number" ? fmt(answer) : q(answer)}</span>`,
      ),
    );

    // The two guards in the order they run. A guard that fails ends the function, so
    // anything below it is drawn as "not reached" rather than evaluated.
    const naive = (t: Record<string, number>, u: string) => !!t[u];
    const gate = (n: number, call: string, cls: string, body: string) =>
      `<div class="vi-gate ${cls}"><span class="vi-n">${n}</span><span class="vi-call">${call}</span><span class="vi-v">${body}</span></div>`;
    const gates = el("div", "vi-gates");
    gates.innerHTML =
      gate(
        1,
        `Object.hasOwn(VIDEO, ${q(vu)})`,
        vOk ? "pass" : "fail",
        vOk
          ? `<b>${q(vu)}</b> is a video unit — 1 ${vu} = <b>${fmt(VIDEO[vu]!)}</b> B`
          : `<b>${q(vu)}</b> is not in {B, KB, MB, GB} → returns <b>"Invalid video unit"</b>${naive(VIDEO, vu) ? ` · a plain <code class='inl'>!VIDEO[unit]</code> check would have <b>accepted</b> it` : ``}`,
      ) +
      gate(
        2,
        `Object.hasOwn(DRIVE, ${q(du)})`,
        !vOk ? "skip" : dOk ? "pass" : "fail",
        !vOk
          ? `not reached${dOk ? `` : ` — ${q(du)} is also illegal, but the video guard already spoke`}`
          : dOk
            ? `<b>${q(du)}</b> is a drive unit — 1 ${du} = <b>${fmt(DRIVE[du]!)}</b> B`
            : `<b>${q(du)}</b> is not in {GB, TB} → returns <b>"Invalid drive unit"</b>`,
      );
    wrap.append(gates);

    if (typeof answer === "number") {
      const videoBytes = vs * VIDEO[vu]!,
        driveBytes = ds * DRIVE[du]!;
      const raw = driveBytes / videoBytes;
      const safe = exactly(vs, vu, ds, du);
      const rounded = Math.round(raw);
      const rows = el("div", "vi-rows");
      rows.append(el("div", "vi-r", `videoBytes <b>${fmt(videoBytes)}</b>`));
      rows.append(el("div", "vi-r", `driveBytes <b>${fmt(driveBytes)}</b>`));
      rows.append(el("div", "vi-r", `exact quotient <b>${num(raw)}</b>`));
      rows.append(
        el(
          "div",
          "vi-r" + (answer !== safe ? " hot" : ""),
          `Math.floor <b>${fmt(answer)}</b>${answer !== safe ? " ✗" : ""}`,
        ),
      );
      rows.append(
        el(
          "div",
          "vi-r" + (rounded !== answer ? " hot" : ""),
          `Math.round <b>${fmt(rounded)}</b>${rounded !== answer ? " ✗" : ""}`,
        ),
      );
      if (answer !== safe)
        rows.append(el("div", "vi-r hot", `integer-scaled <b>${fmt(safe)}</b> ✓`));
      wrap.append(rows);
      wrap.append(
        el(
          "div",
          "note",
          noteFor({
            vs,
            vu,
            ds,
            du,
            vOk,
            dOk,
            raw,
            whole: answer,
            safe,
            rounded,
            videoBytes,
            driveBytes,
          }),
        ),
      );
    } else {
      wrap.append(
        el(
          "div",
          "note",
          noteFor({
            vs,
            vu,
            ds,
            du,
            vOk,
            dOk,
            raw: 0,
            whole: 0,
            safe: 0,
            rounded: 0,
            videoBytes: 0,
            driveBytes: 0,
          }),
        ),
      );
    }
    out.append(wrap);
  }
}

interface S {
  vs: number;
  vu: string;
  ds: number;
  du: string;
  vOk: boolean;
  dOk: boolean;
  raw: number;
  whole: number;
  safe: number;
  rounded: number;
  videoBytes: number;
  driveBytes: number;
}

// What did THIS input exercise? Every branch names a different rule, because every
// preset was chosen to land on a different one.
function noteFor(s: S) {
  if (!s.vOk && !s.dOk)
    return `Both units are illegal — <b>${q(s.vu)}</b> as a video and <b>${q(s.du)}</b> as a drive — and the function says only <b>"Invalid video unit"</b>. The statement never says which message wins when both apply, so this is a decision the code makes by <i>where it puts the lines</i>: the bullets name the video unit first, so its guard goes first, and a guard that returns ends the function before the second can speak. No official case has two wrong units (each of #2 and #3 breaks exactly one), so the grader cannot tell this order from the reverse; the lesson is that an unspecified tie is still resolved by something, and it should be the statement's own order rather than whichever line you happened to type first.`;
  if (!s.vOk) {
    if (Object.hasOwn(DRIVE, s.vu))
      return `<b>${q(s.vu)}</b> is a perfectly good unit — as a <i>drive</i>. The two legal sets are different (a video is B, KB, MB or GB; a drive is GB or TB), which is why there are two tables and not one: a single shared table would accept a terabyte video, and this is official case 2, written to catch exactly that. The guard checks the video table, finds no <code class='inl'>${q(s.vu)}</code> key, and returns <b>"Invalid video unit"</b> before any arithmetic runs — the drive side is never even looked at.`;
    if (s.vu in VIDEO)
      return `<b>${q(s.vu)}</b> is not a unit, but it <i>is</i> a property: every plain object inherits <code class='inl'>constructor</code>, <code class='inl'>toString</code> and a handful more from <code class='inl'>Object.prototype</code>. A guard written as <code class='inl'>!VIDEO[videoUnit]</code> reads that inherited function, finds it truthy, and waves the unit through — after which <code class='inl'>videoSize * VIDEO[videoUnit]</code> is <code class='inl'>NaN</code>, <code class='inl'>Math.floor(NaN)</code> is <code class='inl'>NaN</code>, and the function returns a number where the statement demands a string. <code class='inl'>Object.hasOwn</code> asks about the table's <i>own</i> keys only. The grader never tries it, which is why it is worth trying here.`;
    return `<b>${q(s.vu)}</b> is not one of B, KB, MB or GB, so the first guard returns <b>"Invalid video unit"</b> and the function ends there. The match is exact and case-sensitive — the statement lists <code class='inl'>"MB"</code>, not <code class='inl'>"mb"</code> — so a near miss is as invalid as nonsense. Nothing below the guard runs: the table lookup, the multiplications and the floor all assume a unit that exists.`;
  }
  if (!s.dOk)
    return `The video unit <b>${q(s.vu)}</b> passes, and then the drive's <b>${q(s.du)}</b> does not: a drive may be GB or TB, and ${Object.hasOwn(VIDEO, s.du) ? `<code class='inl'>${q(s.du)}</code> is a perfectly good <i>video</i> unit that the drive table simply does not have` : `it is in neither table`}. This is official case 3 — <code class='inl'>(2000, "MB", 100000, "MB")</code> — the mirror image of case 2, and the reason the two tables must differ in <i>both</i> directions. The function returns <b>"Invalid drive unit"</b> before dividing anything.`;
  if (s.whole !== s.safe)
    return `Both units are legal, so this is pure arithmetic — and it is the case the one-liner gets <b>wrong</b>. <b>${s.ds} × ${fmt(DRIVE[s.du]!)}</b> should be exactly <b>${fmt(s.driveBytes)}</b>, but <b>${s.ds}</b> has no exact double, so the product lands a hair low and the quotient comes out at <b>${num(s.raw)}</b>. <code class='inl'>Math.floor</code> chops it to <b>${fmt(s.whole)}</b> where the exact answer is <b>${fmt(s.safe)}</b> — an error too small to print becoming an error of <b>${fmt(s.safe - s.whole)}</b> whole video${s.safe - s.whole === 1 ? "" : "s"}. The fix is not an epsilon but to scale both operands to integers before dividing, which is the green "integer-scaled" figure. freeCodeCamp's grader never asks, so the plain expression is still the answer to this challenge.`;
  if (s.raw - Math.floor(s.raw) < 1e-9)
    return `Both guards pass and the sizes divide <b>exactly</b>: <b>${fmt(s.driveBytes)} B</b> over <b>${fmt(s.videoBytes)} B</b> is <b>${fmt(s.whole)}</b> with nothing left over, so <code class='inl'>floor</code>, <code class='inl'>round</code> and <code class='inl'>trunc</code> all agree. Two of the three official arithmetic cases are exact fits, which makes them poor judges of the rounding rule. Note that the units differ across the two sides — that is the whole point of converting both to bytes first, so the comparison never has to care which side was the bigger unit.`;
  if (s.rounded !== s.whole)
    return `Both guards pass and the quotient is <b>${num(s.raw)}</b> — the answer is <b>${fmt(s.whole)}</b>, not <b>${fmt(s.rounded)}</b>. The leftover is over half a video, so <code class='inl'>Math.round</code> rounds it up into a video that was never stored. "Whole videos" is a floor, and this is the one official case (<code class='inl'>1.5 GB</code> on <code class='inl'>2.2 TB</code>) that separates a correct solution from a plausible one. The units here also sit three powers of ten apart (<code class='inl'>GB</code> against <code class='inl'>TB</code>), which is where a mis-scaled table would shift the answer by a factor of 1000.`;
  return `Both guards pass and the quotient is <b>${num(s.raw)}</b>, so <b>${fmt(s.whole)}</b> whole videos fit. <code class='inl'>Math.round</code> happens to agree because the leftover is under half a video, and that agreement is the danger — a rounding bug is silent until the remainder passes <b>50%</b>.`;
}

// ── STEP — the guards and the conversion, one decision per line ──
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">numberOfVideos</span>(<span class="tok" data-t="param">videoSize, videoUnit, driveSize, driveUnit</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="vtable">VIDEO = { B: <span class="nu">1</span>, KB: <span class="nu">1e3</span>, MB: <span class="nu">1e6</span>, GB: <span class="nu">1e9</span> }</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="dtable">DRIVE = { GB: <span class="nu">1e9</span>, TB: <span class="nu">1e12</span> }</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">if</span> (<span class="tok" data-t="vguard">!Object.<span class="fn">hasOwn</span>(VIDEO, videoUnit)</span>) <span class="k">return</span> <span class="st">"Invalid video unit"</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">if</span> (<span class="tok" data-t="dguard">!Object.<span class="fn">hasOwn</span>(DRIVE, driveUnit)</span>) <span class="k">return</span> <span class="st">"Invalid drive unit"</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">const</span> <span class="tok" data-t="vbytes">videoBytes = videoSize * VIDEO[videoUnit]</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">const</span> <span class="tok" data-t="dbytes">driveBytes = driveSize * DRIVE[driveUnit]</span>;`,
  },
  {
    ln: 8,
    html: `  <span class="k">return</span> <span class="tok" data-t="floor">Math.<span class="fn">floor</span>(driveBytes / videoBytes)</span>;`,
  },
  { ln: 9, html: `}` },
];

// "500, MB, 100, GB" -> [500, "MB", 100, "GB"]. Units are kept exactly as typed —
// case and all — because an illegal unit is the point. Unparseable NUMBERS fall back
// to the opening case rather than tracing NaN.
function parseCase(raw: string): [number, string, number, string] {
  const [a, b, c, d] = raw.split(",").map((t) => t.trim());
  const vs = Number(a),
    ds = Number(c);
  return vs > 0 && ds > 0 && b !== undefined && d !== undefined
    ? [vs, b, ds, d]
    : [500, "MB", 100, "GB"];
}

function trace(raw: string) {
  const [vs, vu, ds, du] = parseCase(raw);
  const steps: DbgStep[] = [];
  let videoBytes = 0,
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
      ret?: { value: number | string } | undefined;
    } = {},
  ) => {
    const vars: Record<string, unknown> = {
      videoSize: vs,
      videoUnit: q(vu),
      driveSize: ds,
      driveUnit: q(du),
    };
    if (line >= 2) vars["VIDEO"] = "{ B: 1, KB: 1e3, MB: 1e6, GB: 1e9 }"; // `const VIDEO` is line 2
    if (line >= 3) vars["DRIVE"] = "{ GB: 1e9, TB: 1e12 }"; // `const DRIVE` is line 3
    if (line >= 6) vars["videoBytes"] = fmt(videoBytes); // `const videoBytes` is line 6
    if (line >= 7) vars["driveBytes"] = fmt(driveBytes); // `const driveBytes` is line 7
    // The stored-videos picture exists only once the floor has run, and then stays.
    const structs: DbgStruct[] = [];
    if (line >= 8) {
      const items: string[] = [];
      const show = Math.min(whole, 8);
      for (let i = 0; i < show; i++) items.push(`#${i + 1}`);
      if (whole > show) items.push(`… +${fmt(whole - show)}`);
      const rest = (driveBytes - whole * videoBytes) / videoBytes;
      if (rest > 1e-9) items.push(`${(rest * 100).toFixed(0)}% ✗`);
      structs.push({ label: "videos stored", items, newest: rest > 1e-9 });
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
          title: `numberOfVideos(${vs}, ${q(vu)}, ${ds}, ${q(du)})`,
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
    `Four inputs, and this time the <b>units are an input to be judged</b>, not just converted: <b>${vs} ${vu}</b> for the video and <b>${ds} ${du}</b> for the drive. The statement attaches two return values to bad units, so the function has two ways to end before it does any arithmetic. Watch for the line that ends it.`,
    { focus: "param" },
  );

  S(
    2,
    `The legal video units, each mapped to bytes: <b>B, KB, MB, GB</b>. The same table does two jobs — it holds the multipliers <i>and</i> it is the validation, because a unit is legal exactly when it is a key. That is why there is no list of allowed units anywhere else, and why adding a unit is one entry. Bytes is the common unit for the same reason as in #41: the smallest unit keeps values whole, and arithmetic on whole numbers is exact.`,
    { focus: "vtable", changed: ["VIDEO"] },
  );

  S(
    3,
    `A <b>second</b> table, not a shared one: a drive is only <b>GB</b> or <b>TB</b>. The two sets overlap in a single unit, GB, and differ in both directions — TB is legal for a drive and not a video, B, KB and MB are legal for a video and not a drive. A single shared table would have to carry a flag per unit to say which side may use it, and the flag would be the same information as the two tables, harder to read.`,
    { focus: "dtable", changed: ["DRIVE"] },
  );

  const vOk = Object.hasOwn(VIDEO, vu),
    dOk = Object.hasOwn(DRIVE, du);
  if (!vOk) {
    S(
      4,
      `<code class='inl'>Object.hasOwn(VIDEO, ${q(vu)})</code> is <b>false</b>, so the guard fires and the function returns <b>"Invalid video unit"</b> without computing anything. ${
        Object.hasOwn(DRIVE, vu)
          ? `${q(vu)} is a legal <i>drive</i> unit — that is official case 2, and the reason the tables are separate.`
          : vu in VIDEO
            ? `${q(vu)} is not a unit, but it is an <i>inherited property</i> of every object: <code class='inl'>!VIDEO[videoUnit]</code> would have found a function there, judged it truthy and let it through to produce <code class='inl'>NaN</code>. <code class='inl'>hasOwn</code> looks at the table's own keys only.`
            : `Matching is exact and case-sensitive, so a near miss like <code class='inl'>"mb"</code> fails just as nonsense does.`
      }${dOk ? `` : ` The drive unit ${q(du)} is <i>also</i> illegal, but this guard runs first and ends the function, so the drive guard never speaks.`}`,
      {
        focus: "vguard",
        eval: { expr: `Object.hasOwn(VIDEO, ${q(vu)})`, val: false },
        done: true,
        result: q("Invalid video unit"),
        ret: { value: q("Invalid video unit") },
      },
    );
    return steps;
  }
  S(
    4,
    `<code class='inl'>Object.hasOwn(VIDEO, ${q(vu)})</code> is <b>true</b>, so the video unit is legal and execution falls through. The check is <code class='inl'>hasOwn</code> and not truthiness or <code class='inl'>in</code> for one reason: <code class='inl'>constructor</code> and <code class='inl'>toString</code> are inherited by every plain object, so a looser test accepts them as units and the arithmetic below quietly turns to <code class='inl'>NaN</code>.`,
    { focus: "vguard", eval: { expr: `Object.hasOwn(VIDEO, ${q(vu)})`, val: true } },
  );

  if (!dOk) {
    S(
      5,
      `<code class='inl'>Object.hasOwn(DRIVE, ${q(du)})</code> is <b>false</b>: a drive is GB or TB, and ${q(du)} is not. The function returns <b>"Invalid drive unit"</b> — this is official case 3, where the video unit is fine and only the drive's is wrong. This guard sits <i>second</i> because the statement lists the video bullet first; with both units illegal it would never be reached, and the grader would not notice either order.`,
      {
        focus: "dguard",
        eval: { expr: `Object.hasOwn(DRIVE, ${q(du)})`, val: false },
        done: true,
        result: q("Invalid drive unit"),
        ret: { value: q("Invalid drive unit") },
      },
    );
    return steps;
  }
  S(
    5,
    `<code class='inl'>Object.hasOwn(DRIVE, ${q(du)})</code> is <b>true</b>: the drive unit is legal too. Both inputs are now known to be in range, which is what lets every line below index the tables without a fallback — the guards have already paid for that safety, so the arithmetic carries no <code class='inl'>?? 0</code> and no <code class='inl'>NaN</code> check.`,
    { focus: "dguard", eval: { expr: `Object.hasOwn(DRIVE, ${q(du)})`, val: true } },
  );

  videoBytes = vs * VIDEO[vu]!;
  S(
    6,
    `Convert the video: <b>${vs} × ${fmt(VIDEO[vu]!)} = ${fmt(videoBytes)} B</b>.${Number.isInteger(videoBytes) ? ` A whole number of bytes, so nothing here can drift.` : ` <b>${fmt(videoBytes)}</b> is not a whole number of bytes, so this input already carries a rounding hazard.`}`,
    { focus: "vbytes", changed: ["videoBytes"] },
  );

  driveBytes = ds * DRIVE[du]!;
  S(
    7,
    `Convert the drive: <b>${ds} × ${fmt(DRIVE[du]!)} = ${fmt(driveBytes)} B</b>. The factor is <b>${fmt(DRIVE[du]!)}</b> because the statement says 1 TB is 1000 GB and 1 GB is 1000 MB, 1000 KB, 1000 B — a chain of 1000s, so a terabyte is 1000⁴ bytes. Both sides share a unit now; which one started bigger no longer matters. ${Number.isInteger(driveBytes) ? `` : `Careful: <b>${ds}</b> has no exact double, so this product is already slightly off — the next line is where it surfaces.`}`,
    { focus: "dbytes", changed: ["driveBytes"] },
  );

  const exact = driveBytes / videoBytes;
  whole = Math.floor(exact);
  const rest = driveBytes - whole * videoBytes;
  const rounded = Math.round(exact);
  const truth = exactly(vs, vu, ds, du);
  S(
    8,
    `<b>${fmt(driveBytes)} ÷ ${fmt(videoBytes)} = ${num(exact)}</b>. ${
      whole !== truth
        ? `Floor returns <b>${fmt(whole)}</b>, but the exact answer is <b>${fmt(truth)}</b>: the quotient sits a hair under a whole number and <code class='inl'>Math.floor</code> chops the last video off. The grader never reaches an input like this.`
        : rest > 1e-9
          ? `<b>${((rest / videoBytes) * 100).toFixed(1)}%</b> of a video is left over, and a fraction of a video is not a video, so <code class='inl'>Math.floor</code> throws it away and returns <b>${fmt(whole)}</b>. ${
              rounded !== whole
                ? `<code class='inl'>Math.round</code> would return <b>${fmt(rounded)}</b> — the failure official case 5 is built to catch.`
                : `<code class='inl'>Math.round</code> happens to agree here, which is what makes a rounding bug so quiet.`
            }`
          : `It divides exactly, so <code class='inl'>floor</code> has nothing to discard and returns <b>${fmt(whole)}</b> unchanged. A quotient that <i>looks</i> whole is only whole until the inputs change.`
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
    8,
    `<b>Return ${fmt(whole)}.</b> The function had three ways to end — two sentinel strings and one number — and which one fires was decided entirely by the guards on lines 4 and 5, before any multiplication ran. The arithmetic is the easy half; the unit validation, and the order of the checks, is where the statement's rules actually live.`,
    { focus: "floor", done: true, result: String(whole), ret: { value: whole } },
  );
  return steps;
}

export default {
  n: 42,
  id: "video-storage",
  title: "Video Storage",
  dates: ["2025-09-21"],
  statement: `Given a <b>video size</b>, a <b>unit</b> for the video size, a <b>hard drive capacity</b> and a <b>unit</b> for the drive, return the number of <b>whole</b> videos the drive can store. A video unit is <code class="inl">"B"</code>, <code class="inl">"KB"</code>, <code class="inl">"MB"</code> or <code class="inl">"GB"</code>, otherwise return <code class="inl">"Invalid video unit"</code>; a drive unit is <code class="inl">"GB"</code> or <code class="inl">"TB"</code>, otherwise return <code class="inl">"Invalid drive unit"</code>. Each unit is <b>1000×</b> the one below it, from <b>1 KB = 1000 B</b> up to <b>1 TB = 1000 GB</b>. <span class="rule">Example: <code class="inl">numberOfVideos(500, "MB", 100, "GB")</code> → <code class="inl">200</code> — 100 GB is 100,000 MB, and 500 MB goes into that 200 times.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — two key checks, one divide",
      approach: `#41's conversion with the rules turned up, so two things are new. First, the statement now says which units are <b>legal</b> and what to return otherwise — and the two legal sets are different: a video is B, KB, MB or GB, a drive only GB or TB. That is why there are <b>two tables</b>, not one: a single shared table would accept a terabyte video (official case 2) or a megabyte drive (official case 3), and the tables must differ in <i>both</i> directions to catch both. The tables double as the validation — a unit is legal exactly when it is a key — so there is no separate list of allowed units to keep in sync. Second, how to test for a key matters more than it looks. <code class='inl'>Object.hasOwn(VIDEO, unit)</code> asks about the table's <i>own</i> keys; truthiness and <code class='inl'>in</code> also see what every object inherits, so <code class='inl'>!VIDEO["constructor"]</code> is <code class='inl'>false</code>, the guard waves it through, and the function returns <code class='inl'>NaN</code> where the statement wants a string. The grader never tries it; click the <b>500 constructor</b> chip. The guards also run in the <b>statement's order</b>, video then drive, and the order is a real decision: with both units wrong (the <b>1 TB / 10 MB</b> chip, ours) the statement is silent on which message wins, no official case has two wrong units, and so the first guard to return decides it. Past the guards it is #41 exactly: both sides to bytes, divide, <code class='inl'>Math.floor</code>. The word <b>whole</b> is a floor, not a round — official case 5 (<code class='inl'>1.5 GB</code> on <code class='inl'>2.2 TB</code>, quotient <b>1466.67</b>) is the one that catches a round. And one hazard no official test reaches: <b>1 KB / 4.1 GB</b> is exactly <b>4,100,000</b>, but <code class='inl'>4.1 * 1e9</code> lands a hair under 4.1 billion and the one-liner returns <b>4,099,999</b>. Scaling both operands to integers first is the fix; the plain expression is still the answer to <i>this</i> challenge.`,
      code: `// Two tables, because the statement lists two different legal sets: a video is
// B/KB/MB/GB, a drive is GB/TB. A unit is valid exactly when it is a key, so the
// tables are also the validation. Both map to bytes, the smallest unit, so both
// operands tend to be whole numbers and the division is exact.
const VIDEO: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9 };
const DRIVE: Record<string, number> = { GB: 1e9, TB: 1e12 };

function numberOfVideos(videoSize: number, videoUnit: string, driveSize: number, driveUnit: string): number | string {
  // hasOwn, not !VIDEO[unit] or "in": "constructor" and "toString" are inherited by
  // every plain object, so a truthiness check accepts them and the maths returns NaN.
  // Video first, drive second: the statement's order. If BOTH units are wrong the
  // statement does not say which message wins, so the first guard decides it.
  if (!Object.hasOwn(VIDEO, videoUnit)) return "Invalid video unit";
  if (!Object.hasOwn(DRIVE, driveUnit)) return "Invalid drive unit";
  // "Whole videos" is a floor: 1.5 GB on 2.2 TB is 1466.67, and 1467 was never stored.
  // Known hazard, untested by the grader: (1, "KB", 4.1, "GB") is exactly 4100000 but
  // computes as 4099999, because 4.1 has no exact double. Scale both operands to
  // integers first if that has to be right.
  return Math.floor((driveSize * DRIVE[driveUnit]!) / (videoSize * VIDEO[videoUnit]!));
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "guards → bytes → floor",
      approach: `The function pulled apart into its two tables, two guards and its conversion, with a note on every line about <i>why</i> it is shaped that way. Start on <b>500, MB, 100, GB</b> — official, an exact fit where every guard passes — then <b>1, TB, 10, TB</b> and <b>2000, MB, 100000, MB</b>, the two official cases that end at a guard, each on a different one, and <b>1.5, GB, 2.2, TB</b>, where <code class='inl'>round</code> would invent a video. The rest are ours: <b>1, TB, 10, MB</b> has two illegal units and shows that only the first guard speaks, <b>500, constructor, 100, GB</b> is a "unit" that an inherited property makes look real, and <b>1, KB, 4.1, GB</b> returns <b>4,099,999</b> on a division whose exact answer is <b>4,100,000</b>. Type any <code class='inl'>size, unit, size, unit</code> — units are matched exactly, so <code class='inl'>mb</code> is as invalid as nonsense. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "size, unit, size, unit =",
            value: "500, MB, 100, GB",
            presets: CASES.map(([s, u, d, w]) => `${s}, ${u}, ${d}, ${w}`),
            hint: "e.g. 1.5, GB, 2.2, TB",
          },
        }),
    },
  ],
} satisfies Challenge;
