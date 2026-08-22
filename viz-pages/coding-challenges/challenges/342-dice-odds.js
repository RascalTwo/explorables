// #342 · Dice Odds — 46,656 rolls, or one row of counts per die.
// The odds are total ÷ favourable, so the whole problem is counting the ways a
// target sum can happen. Two ways to count them, both 6/6 official:
//   • BRUTE — enumerate every possible roll (6^dice of them) and tally the ones
//     that land on the target. The wasteful act: it re-walks every individual
//     roll to learn a single number.
//   • OPT   — roll the distribution forward one die at a time:
//     ways(d, s) = Σ ways(d-1, s-f) for f in 1…6. Each new row is built from
//     counts, not from rolls, so a whole subtree collapses into one addition.
//
// Honest about the size of the win: the DP LOSES at one and two dice (42 adds
// against 36 rolls) because a row carries sums the brute never visits. It pulls
// ahead from three dice and never looks back — 486 adds against 46,656 rolls at
// six. Flip the Approach toggle on the 6-dice case to see exactly that.
import { el, esc, mountDebugger } from "../shared.js";

// Pip layout on a 3×3 grid (row-major indices 0–8) for each face 1–6 — the same
// convention #335 uses, so a die reads the same across the gallery.
const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8],
  4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

// The first six are freeCodeCamp's official cases, in the grader's order. The
// last two are invented and teach the two ends of the bell: 21 is the single
// most likely six-dice total, and 6 is the only total with exactly one roll
// behind it. Every dice/target pair is also reachable from the two sliders, so
// nothing here is the only route to a case.
const CASES = [
  { dice: 1, target: 5,  want: "1 in 6",     official: true },
  { dice: 2, target: 4,  want: "1 in 12",    official: true },
  { dice: 3, target: 10, want: "1 in 8",     official: true },
  { dice: 4, target: 7,  want: "1 in 65",    official: true },
  { dice: 5, target: 26, want: "1 in 111",   official: true },
  { dice: 6, target: 35, want: "1 in 7776",  official: true },
  { dice: 6, target: 21, want: "1 in 11",    official: false },
  { dice: 6, target: 6,  want: "1 in 46656", official: false },
];
const OFFICIAL = CASES.filter((c) => c.official);

// ── The two approaches ───────────────────────────────────────────────────────
// Both return the same `hits` out of the same `total`; they differ only in how
// much work that took. `ops` is what the demo headers count.

// BRUTE: walk every one of the 6^dice rolls, tallying the ones that hit.
// `collect` caps how many winning rolls we keep for display — at (6, 21) there
// are 4332 of them and nobody needs 4332 rows of dice.
function byEnumerate(dice, target, collect = 0) {
  let hits = 0, ops = 0;
  const found = [], roll = new Array(dice);
  (function place(i, sum) {
    if (i === dice) {
      ops++;                                    // one complete roll enumerated
      if (sum === target) { hits++; if (found.length < collect) found.push(roll.slice()); }
      return;
    }
    for (let f = 1; f <= 6; f++) { roll[i] = f; place(i + 1, sum + f); }
  })(0, 0);
  return { hits, total: 6 ** dice, ops, found };
}

// OPT: build the sum distribution one die at a time. rows[d][s] = the number of
// ways to make sum s with d dice; each row is a convolution of the previous one
// with a single uniform die, so only the previous row is ever needed.
function byDistribution(dice, target) {
  let ways = [1], ops = 0;                      // 0 dice: one way to total 0
  const rows = [ways];
  for (let d = 1; d <= dice; d++) {
    const next = new Array(ways.length + 6).fill(0);
    for (let s = 0; s < ways.length; s++) {
      if (ways[s] === 0) continue;              // no rolls reach s — nothing to carry
      for (let f = 1; f <= 6; f++) { next[s + f] += ways[s]; ops++; }
    }
    ways = next; rows.push(ways);
  }
  return { hits: ways[target] || 0, total: 6 ** dice, ops, rows, ways };
}

const solve = (dice, target, mode, collect) =>
  mode === "brute" ? byEnumerate(dice, target, collect) : byDistribution(dice, target);

// The answer string. `hits` can only be 0 for a sum outside dice…6·dice, which
// the problem promises never happens and the target slider cannot produce — but
// dividing by it would print "1 in Infinity", so say so instead.
const odds = (total, hits) => (hits > 0 ? `1 in ${Math.round(total / hits)}` : "unreachable");

const clampTarget = (dice, target) => Math.min(6 * dice, Math.max(dice, target));
const commas = (n) => n.toLocaleString("en-US");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .do-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
              color:var(--muted); margin:14px 0 4px; }
    .do-eq { font:12.5px var(--mono); color:var(--muted); margin:6px 0 2px; }
    .do-eq b { color:var(--text); }
    .do-eq .win { color:var(--accent); }
    .do-range { flex:1; min-width:120px; max-width:280px; accent-color:var(--accent); }
    .do-ratio { height:14px; border-radius:7px; background:var(--panel-2);
                border:1px solid var(--border); overflow:hidden; margin:8px 0 2px; }
    .do-ratio i { display:block; height:100%; min-width:2px; background:var(--warn); }
    .do-rolls { display:flex; flex-wrap:wrap; gap:7px; margin:8px 0 2px; }
    .do-roll { display:flex; gap:3px; align-items:center; padding:4px 6px; border-radius:8px;
               border:1px solid var(--border); background:var(--panel-2); }
    .do-die { width:22px; height:22px; border-radius:5px; background:#f4f6fb; border:1px solid #c9d1d9;
              display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr);
              padding:3px; gap:1px; }
    .do-c { display:flex; align-items:center; justify-content:center; }
    .do-pip { width:4px; height:4px; border-radius:50%; background:#11151c; }
    .do-grid { display:grid; gap:2px; overflow-x:auto; padding-bottom:4px; margin:6px 0 2px; }
    .do-cell { font:8.5px var(--mono); text-align:center; padding:4px 1px; border-radius:4px;
               background:var(--panel-2); border:1px solid var(--border); color:var(--text); }
    .do-cell.zero { color:var(--muted); opacity:.3; }
    .do-cell.hdr { background:transparent; border-color:transparent; color:var(--muted); }
    .do-cell.pending { opacity:.1; }
    .do-cell.tgt { border-color:var(--warn); }
    .do-cell.ans { background:color-mix(in srgb,var(--warn) 26%,transparent);
                   border-color:var(--warn); font-weight:700; }
    .do-rlbl { font:700 9px var(--mono); color:var(--accent); display:flex;
               align-items:center; justify-content:flex-end; padding-right:5px; }
    .do-chart { display:flex; align-items:flex-end; gap:2px; height:118px; margin:8px 0 2px; }
    .do-col { flex:1; min-width:0; display:flex; flex-direction:column;
              justify-content:flex-end; align-items:center; gap:3px; height:100%; }
    .do-bar { width:100%; border-radius:3px 3px 0 0; border-top:2px solid var(--accent);
              background:color-mix(in srgb,var(--accent) 32%,transparent); }
    .do-col.on .do-bar { border-top-color:var(--warn);
                         background:color-mix(in srgb,var(--warn) 45%,transparent); }
    .do-x { font:8.5px var(--mono); color:var(--muted); }
    .do-col.on .do-x { color:var(--warn); font-weight:700; }
  `));
}

const dieFace = (v) => {
  const set = new Set(PIPS[v] || []);
  return Array.from({ length: 9 }, (_, i) =>
    `<div class="do-c">${set.has(i) ? '<div class="do-pip"></div>' : ""}</div>`).join("");
};
const rollHtml = (r) =>
  `<div class="do-roll">${r.map((v) => `<div class="do-die">${dieFace(v)}</div>`).join("")}` +
  `<span class="do-x" style="margin-left:4px">= ${r.reduce((a, b) => a + b, 0)}</span></div>`;

// ── The official-test scoreboard ─────────────────────────────────────────────
// Both approaches pass all 6. The `work` column is where they part company: the
// totals are 55,986 rolls against 1,176 additions for the same six answers.
function scoreboard(mode) {
  const box = el("div");
  const rows = OFFICIAL.map((c) => {
    const r = solve(c.dice, c.target, mode);
    return { ...c, got: odds(r.total, r.hits), work: r.ops };
  });
  const pass = rows.filter((x) => x.got === x.want).length;
  const total = rows.reduce((s, x) => s + x.work, 0);
  const unit = mode === "brute" ? "rolls" : "adds";

  box.append(el("div", "do-lbl", `Official freeCodeCamp tests · ${pass} of ${rows.length} passing`));
  box.append(el("div", "srow head",
    `<span class="mark"></span><span class="k">case</span><span class="exp">expected</span>` +
    `<span class="got">got</span><span class="exp">${unit}</span>`));
  rows.forEach((x) => {
    box.append(el("div", "srow" + (x.got === x.want ? "" : " bad"),
      `<span class="mark">${x.got === x.want ? "✓" : "✗"}</span>` +
      `<span class="k">getOdds(${x.dice}, ${x.target})</span>` +
      `<span class="exp">${esc(x.want)}</span>` +
      `<span class="got">${esc(x.got)}</span>` +
      `<span class="exp">${commas(x.work)}</span>`));
  });
  box.append(el("div", "do-eq",
    `all six official cases cost <b>${commas(total)}</b> ${unit} in total` +
    (mode === "brute" ? ` — the distribution answers them in <span class="win">1,176</span> adds.` : ``)));
  return box;
}

// ── Shared demo shell ────────────────────────────────────────────────────────
// Same controls, same result, same scoreboard on both sides. What changes is the
// picture of the work: the brute shows the odometer of rolls it walked, the DP
// shows the table it filled and the distribution that falls out of it for free.
function mountDemo(host, mode) {
  ensureStyle();
  let dice = 6, target = 35, built = 6;   // open on the payoff case

  const diceCtl = el("div", "controls");
  diceCtl.append(el("span", "ctl-label", "dice ="));
  const diceChips = [1, 2, 3, 4, 5, 6].map((n) => {
    const c = el("button", "chip", String(n));
    c.onclick = () => { dice = n; target = clampTarget(dice, target); built = dice; render(); };
    diceCtl.append(c); return c;
  });

  const tgtCtl = el("div", "controls");
  const tgt = el("input"); tgt.type = "range"; tgt.className = "do-range";
  const tgtVal = el("span", "ctl-label", "");
  tgtCtl.append(el("span", "ctl-label", "target ="), tgt, tgtVal);
  tgt.oninput = () => { target = +tgt.value; render(); };

  const buildCtl = el("div", "controls");
  const buildRange = el("input"); buildRange.type = "range"; buildRange.className = "do-range";
  buildRange.min = 0;
  const buildVal = el("span", "ctl-label", "");
  if (mode === "opt") {
    buildCtl.append(el("span", "ctl-label", "rows built ="), buildRange, buildVal);
    buildRange.oninput = () => { built = +buildRange.value; render(); };
  }

  const chips = el("div", "controls");
  CASES.forEach((c) => {
    const b = el("button", "chip", `${c.dice}d → ${c.target}`);
    b.title = `${c.official ? "official" : "invented"} · getOdds(${c.dice}, ${c.target}) → ${c.want}`;
    b.onclick = () => { dice = c.dice; target = c.target; built = c.dice; render(); };
    chips.append(b);
  });

  const head = el("div", "demo-head");
  const body = el("div");
  host.append(
    el("div", "note", mode === "brute"
      ? "Pick a dice count and drag the target. Every roll of every die is walked — the counter is the real number of enumerations, and it multiplies by six with each die you add."
      : "Pick a dice count and drag the target. Drag <b>rows built</b> to watch the table fill one die at a time — each row is built only from the row above it."),
    diceCtl, tgtCtl, buildCtl, chips, head, body);
  render();

  function render() {
    target = clampTarget(dice, target);
    built = Math.min(built, dice);
    diceChips.forEach((c, i) => c.classList.toggle("on", i + 1 === dice));
    tgt.min = dice; tgt.max = 6 * dice; tgt.value = target;
    tgtVal.textContent = `${target}  (${dice}–${6 * dice})`;
    buildRange.max = dice; buildRange.value = built;
    buildVal.textContent = `${built} of ${dice}`;

    const r = solve(dice, target, mode, 24);
    const answer = odds(r.total, r.hits);

    head.innerHTML = mode === "brute"
      ? `<span class="opcount hot"><span class="n">${commas(r.ops)}</span> rolls enumerated</span>` +
        `<span class="muted mono">6<sup>${dice}</sup> — every one walked to the last die</span>`
      : `<span class="opcount cool"><span class="n">${commas(r.ops)}</span> additions</span>` +
        `<span class="muted mono">${r.rows.length - 1} row${dice === 1 ? "" : "s"}, each from the one above</span>`;

    body.innerHTML = "";
    if (mode === "brute") renderBrute(body, r);
    else renderOpt(body, r);

    body.append(el("div", "result-line",
      `<span class="badge ok">${esc(answer)}</span>` +
      `<span class="muted mono">${commas(r.hits)} favourable ÷ ${commas(r.total)} total ` +
      `= ${(r.total / r.hits).toFixed(2)} → rounds to ${Math.round(r.total / r.hits)}</span>`));
    body.append(scoreboard(mode));
  }

  function renderBrute(box, r) {
    box.append(el("div", "do-eq",
      `enumerated <b>${Array(dice).fill(6).join(" × ")}</b> = ` +
      `<b>${commas(r.total)}</b> rolls; <span class="win">${commas(r.hits)}</span> of them totalled <b>${target}</b>`));
    const pct = Math.max(0.4, (r.hits / r.total) * 100);
    box.append(el("div", "do-ratio", `<i style="width:${pct}%"></i>`));
    box.append(el("div", "do-eq", `that sliver is the answer: <b>${esc(odds(r.total, r.hits))}</b>`));

    box.append(el("div", "do-lbl",
      `Winning rolls · ${commas(r.hits)} found${r.found.length < r.hits ? `, first ${r.found.length} shown` : ""}`));
    const rolls = el("div", "do-rolls");
    r.found.forEach((f) => rolls.append(el("div", null, rollHtml(f))));
    box.append(rolls);
    if (r.found.length < r.hits)
      box.append(el("div", "do-eq", `…and <b>${commas(r.hits - r.found.length)}</b> more, each one found by walking the whole tree.`));
  }

  function renderOpt(box, r) {
    const cols = 6 * dice + 1;
    box.append(el("div", "do-lbl", "ways[dice][sum] — each row convolved from the row above"));
    const grid = el("div", "do-grid");
    grid.style.gridTemplateColumns = `26px repeat(${cols}, minmax(20px, 1fr))`;
    grid.append(el("div", "do-cell hdr", "s"));
    for (let s = 0; s <= 6 * dice; s++) grid.append(el("div", "do-cell hdr", String(s)));
    r.rows.forEach((row, d) => {
      grid.append(el("div", "do-rlbl", `${d}d`));
      for (let s = 0; s <= 6 * dice; s++) {
        const v = row[s] || 0;
        const isAnswer = d === dice && s === target;
        const cls = "do-cell" + (d > built ? " pending" : "") +
          (isAnswer ? " ans" : s === target ? " tgt" : "") + (v === 0 ? " zero" : "");
        grid.append(el("div", cls, d > built ? "" : commas(v)));
      }
    });
    box.append(grid);
    box.append(el("div", "do-eq",
      `row <b>${built}</b> reads ways(${built}, s) for every s at once — the brute would have to enumerate ` +
      `<b>${commas(6 ** built)}</b> rolls to learn the same row.`));

    box.append(el("div", "do-lbl", `Ways per total · ${dice} dice`));
    const max = Math.max(...r.ways);
    const chart = el("div", "do-chart");
    for (let s = dice; s <= 6 * dice; s++) {
      const col = el("div", "do-col" + (s === target ? " on" : ""));
      const bar = el("div", "do-bar");
      bar.style.height = `${Math.max(2, ((r.ways[s] || 0) / max) * 92)}%`;
      bar.title = `${s}: ${commas(r.ways[s] || 0)} ways`;
      col.append(bar, el("div", "do-x", String(s)));
      chart.append(col);
    }
    box.append(chart);
    box.append(el("div", "do-eq",
      `the bell is the whole point: <b>${target}</b> has <b>${commas(r.hits)}</b> of the ` +
      `<b>${commas(r.total)}</b> rolls behind it, while the peak at <b>${r.ways.indexOf(max)}</b> ` +
      `has <b>${commas(max)}</b>.`));
  }
}

const mountBrute = (host) => mountDemo(host, "brute");
const mountOpt = (host) => mountDemo(host, "opt");

// ── STEP — one debugger per approach ─────────────────────────────────────────
// Curated for trace length, and deliberately the SAME three cases on both tabs
// so the step counters are directly comparable: 1 die is 19 steps against 14,
// and 2 dice is 97 against 60. The larger official cases are NOT dropped — the
// demo's dice/target sliders reach every one of them; a six-dice brute trace
// would be 46,656 leaves and simply cannot be rendered, which is the lesson.
const STEP_CASES = [
  { dice: 1, target: 5 },   // official
  { dice: 2, target: 4 },   // official
  { dice: 2, target: 7 },   // invented: same dice, the most likely total
];
const STEP_INPUT = {
  label: "case =", value: 2, min: 1, max: STEP_CASES.length,
  presets: STEP_CASES.map((_, i) => i + 1), hint: "1–3: pick a small case",
};
const pickCase = (i) => STEP_CASES[Math.max(1, Math.min(STEP_CASES.length, i | 0)) - 1];

const SRC_BRUTE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getOdds</span>(<span class="tok" data-t="params">dice, target</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> <span class="tok" data-t="hits">hits = 0</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="tok" data-t="roll">roll = []</span>;` },
  { ln: 4,  html: `  <span class="k">function</span> <span class="fn">place</span>(<span class="tok" data-t="pp">i, sum</span>) {` },
  { ln: 5,  html: `    <span class="k">if</span> (<span class="tok" data-t="base">i === dice</span>) { <span class="k">if</span> (sum === target) hits++; <span class="k">return</span>; }` },
  { ln: 6,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="loop">f = 1; f &lt;= 6</span>; f++) { roll[i] = f; <span class="fn">place</span>(i + 1, sum + f); }` },
  { ln: 7,  html: `  }` },
  { ln: 8,  html: `  <span class="fn">place</span>(<span class="tok" data-t="kick">0, 0</span>);` },
  { ln: 9,  html: `  <span class="k">return</span> <span class="tok" data-t="ret">"1 in " + Math.<span class="fn">round</span>(6 ** dice / hits)</span>;` },
  { ln: 10, html: `}` },
];

// BRUTE trace — real recursion, one frame per placed die. The step count is
// 6^dice leaves plus the scaffolding around them; that growth IS the lesson.
function traceBrute(caseIndex) {
  const { dice, target } = pickCase(caseIndex);
  const steps = [];
  const roll = [];
  const stack = [];
  let hits = 0, leaves = 0, hitsLive = false, rollLive = false;
  const total = 6 ** dice;

  const S = (line, note, x = {}) => {
    const vars = { dice, target };
    if (hitsLive) vars.hits = hits;               // `let hits` is line 2
    const structs = [];
    if (rollLive) structs.push({ label: "roll", items: roll.slice(), newest: !!x.rollNew }); // `const roll` is line 3
    const frames = [{
      title: `getOdds(${dice}, ${target})`, vars,
      changed: x.outerChanged || [], structs, ret: x.outerRet,
    }];
    stack.forEach((fr, k) => {
      const fv = { i: fr.i, sum: fr.sum };
      if (fr.f !== undefined) fv.f = fr.f;         // `f` only exists once line 6 runs
      const top = k === stack.length - 1;
      frames.push({
        title: `place(${fr.i}, ${fr.sum})`, vars: fv,
        changed: top ? x.changed || [] : [], ret: top ? x.ret : undefined,
      });
    });
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames });
  };

  function place(i, sum) {
    stack.push({ i, sum });
    if (i === dice) {
      leaves++;
      const hit = sum === target;
      if (hit) hits++;
      S(5, `All <b>${dice}</b> dice are placed, so this branch is a finished roll: <b>[${roll.slice(0, dice).join(", ")}]</b> totalling <b>${sum}</b>. ` +
           (hit ? `That is the target — <b>hits</b> climbs to <b>${hits}</b>.` : `Not <b>${target}</b>, so it counts for nothing.`) +
           ` This is leaf <b>${leaves}</b> of <b>${commas(total)}</b>; every one of them costs a full walk down the tree, whether it hits or not.`, {
        focus: "base", eval: { expr: `i = ${i} === dice = ${dice}`, val: true },
        changed: [], outerChanged: hit ? ["hits"] : [], ret: { value: "void" },
      });
      stack.pop();
      return;
    }
    S(5, `<b>i = ${i}</b>, so ${dice - i} ${dice - i === 1 ? "die is" : "dice are"} still unplaced — not a finished roll yet. Recurse deeper instead of scoring.`, {
      focus: "base", eval: { expr: `i = ${i} === dice = ${dice}`, val: false },
    });
    const fr = stack[stack.length - 1];
    for (let f = 1; f <= 6; f++) {
      fr.f = f;
      roll[i] = f;
      roll.length = i + 1;
      S(6, `Fix die <b>${i + 1}</b> to <b>${f}</b> and recurse with sum <b>${sum + f}</b>. Each face here opens a whole subtree beneath it — that factor of six per die is what turns ${dice} dice into <b>${commas(total)}</b> leaves, and six dice into <b>46,656</b>.`, {
        focus: "loop", changed: ["f"], rollNew: true,
      });
      place(i + 1, sum + f);
    }
    S(7, `All six faces tried for die <b>${i + 1}</b>. This frame is done — pop back to the caller, which will overwrite <code class='inl'>roll[${i}]</code> with its next face.`, {
      ret: { value: "void" },
    });
    stack.pop();
    roll.length = i;
  }

  S(1, `<b>getOdds(${dice}, ${target})</b>. The odds are total ÷ favourable, and the total is easy — <b>6<sup>${dice}</sup> = ${commas(total)}</b>. Everything below is spent on the favourable half.`, { focus: "params" });
  hitsLive = true;
  S(2, `<b>hits</b> is the only thing this whole enumeration produces: one number. Keep that in mind while it walks ${commas(total)} rolls to fill it in.`, { focus: "hits", outerChanged: ["hits"] });
  rollLive = true;
  S(3, `<b>roll</b> holds the faces chosen so far. It is scratch space for the current branch — the recursion overwrites it constantly, so it never grows past <b>${dice}</b> entries.`, { focus: "roll" });
  S(8, `Kick off at depth <b>0</b> with a running sum of <b>0</b>. From here the tree branches six ways per die.`, { focus: "kick" });

  place(0, 0);

  const res = odds(total, hits);
  S(9, `<b>${commas(hits)}</b> of the <b>${commas(total)}</b> rolls totalled <b>${target}</b>, so the odds are <b>${commas(total)} / ${commas(hits)} = ${(total / hits).toFixed(2)}</b> → <b>${res}</b>. The distribution tab reaches the identical number without ever looking at an individual roll.`, {
    focus: "ret", done: true, result: res, outerRet: { value: res },
  });
  return steps;
}

const SRC_DIST = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getOdds</span>(<span class="tok" data-t="params">dice, target</span>) {` },
  { ln: 2,  html: `  <span class="k">let</span> <span class="tok" data-t="ways">ways = [1]</span>;  <span class="cm">// 0 dice: one way to total 0</span>` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="dloop">d = 1; d &lt;= dice</span>; d++) {` },
  { ln: 4,  html: `    <span class="k">const</span> <span class="tok" data-t="next">next = <span class="k">new</span> <span class="fn">Array</span>(ways.length + 6).<span class="fn">fill</span>(0)</span>;` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">let</span> s = 0; s &lt; ways.length; s++) {` },
  { ln: 6,  html: `      <span class="k">if</span> (<span class="tok" data-t="guard">ways[s] === 0</span>) <span class="k">continue</span>;` },
  { ln: 7,  html: `      <span class="k">for</span> (<span class="k">let</span> f = 1; f &lt;= 6; f++) <span class="tok" data-t="add">next[s + f] += ways[s]</span>;` },
  { ln: 8,  html: `    }` },
  { ln: 9,  html: `    <span class="tok" data-t="assign">ways = next</span>;  <span class="cm">// the old row is never needed again</span>` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">"1 in " + Math.<span class="fn">round</span>(6 ** dice / ways[target])</span>;` },
  { ln: 12, html: `}` },
];

// OPT trace — one frame, two live rows. `next` is block-scoped to the d-loop, so
// it enters the panel on line 4 and leaves it on line 9 when it becomes `ways`:
// that disappearance is the memory claim made visible.
function traceDist(caseIndex) {
  const { dice, target } = pickCase(caseIndex);
  const steps = [];
  const total = 6 ** dice;
  let ways = [1], next = null, d = 0, s = 0, f = 0, adds = 0;
  let dLive = false, sLive = false, fLive = false, nextLive = false, waysLive = false;

  const items = (arr) => arr.map((v, i) => `${i}:${v}`);
  const S = (line, note, x = {}) => {
    const vars = { dice, target };
    if (dLive) vars.d = d;                        // `let d` belongs to the loop on line 3
    if (sLive) vars.s = s;                        // `let s` belongs to the loop on line 5
    if (fLive) vars.f = f;                        // `let f` belongs to the loop on line 7
    const structs = [];
    if (waysLive) structs.push({ label: "ways", items: items(ways) });      // line 2, alive throughout
    if (nextLive) structs.push({ label: "next", items: items(next), newest: !!x.nextNew }); // line 4 → line 9
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getOdds(${dice}, ${target})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `<b>getOdds(${dice}, ${target})</b>. Same job as the enumeration — count the rolls totalling <b>${target}</b> out of <b>${commas(total)}</b> — but counted rather than walked.`, { focus: "params" });
  waysLive = true;
  S(2, `Seed the table with the <b>zero-dice</b> row. There is exactly one way to have rolled nothing and be sitting on a total of <b>0</b>, and no way at all to be on any other total. Everything else is derived from this one entry.`, { focus: "ways" });

  for (d = 1; d <= dice; d++) {
    dLive = true;
    S(3, `Add die <b>${d}</b>. The row about to be built is the sum distribution for <b>${d}</b> ${d === 1 ? "die" : "dice"} — every reachable total at once, not one target.`, {
      focus: "dloop", changed: ["d"], eval: { expr: `d = ${d} <= dice = ${dice}`, val: true },
    });
    next = new Array(ways.length + 6).fill(0);
    nextLive = true;
    S(4, `A blank row of <b>${next.length}</b> slots — six wider than the last, because the new die can add anywhere from <b>1</b> to <b>6</b> to a total already on the board.`, { focus: "next" });

    for (s = 0; s < ways.length; s++) {
      sLive = true;
      const zero = ways[s] === 0;
      S(6, `Look at total <b>${s}</b> in the previous row: <b>${ways[s]}</b> way${ways[s] === 1 ? "" : "s"}. ` +
           (zero
             ? `No roll of ${d - 1} ${d - 1 === 1 ? "die" : "dice"} ever lands there, so there is nothing to carry forward — skip it. This guard is why the work tracks the reachable totals, not the row's width.`
             : `Those <b>${ways[s]}</b> rolls all still exist once die ${d} is thrown; they just move to a bigger total. That is the whole trick — carry the <b>count</b>, never the rolls.`), {
        focus: "guard", changed: ["s"], eval: { expr: `ways[${s}] = ${ways[s]} === 0`, val: zero },
      });
      if (zero) continue;

      fLive = true;
      for (f = 1; f <= 6; f++) {
        const before = next[s + f];
        next[s + f] += ways[s]; adds++;
        S(7, `Die ${d} shows <b>${f}</b>: each of the <b>${ways[s]}</b> ways to total <b>${s}</b> becomes a way to total <b>${s + f}</b>. <code class='inl'>next[${s + f}]</code> goes ${before} → <b>${next[s + f]}</b>. That single addition stands in for <b>${commas(ways[s])}</b> distinct rolls the enumeration would have re-walked — addition <b>${adds}</b> so far.`, {
          focus: "add", changed: ["f"], nextNew: true,
        });
      }
      fLive = false;
    }
    sLive = false;

    ways = next; next = null; nextLive = false;
    S(9, `Row <b>${d}</b> is finished, so it becomes <b>ways</b> and the previous row is dropped. Nothing ever asks about <b>d − 2</b>: <code class='inl'>ways(d, s)</code> is defined purely in terms of <code class='inl'>ways(d - 1, ·)</code>, so one row of memory is the entire storage cost.`, { focus: "assign" });
  }
  S(3, `<b>d = ${d}</b> is past <b>${dice}</b> — every die is folded in. Total additions: <b>${adds}</b>, against <b>${commas(total)}</b> rolls for the enumeration.`, {
    focus: "dloop", eval: { expr: `d = ${d} <= dice = ${dice}`, val: false },
  });
  dLive = false;

  const hits = ways[target] || 0;
  const res = odds(total, hits);
  S(11, `Read the answer straight out of the finished row: <b>ways[${target}] = ${commas(hits)}</b>. Odds are <b>${commas(total)} / ${commas(hits)} = ${(total / hits).toFixed(2)}</b> → <b>${res}</b>, the same string the enumeration returned. Every other entry in that row is a target we could answer for free.`, {
    focus: "ret", done: true, result: res, ret: { value: res },
  });
  return steps;
}

export default {
  n: 342, id: "dice-odds", title: "Dice Odds", dates: ["2026-07-18"],
  statement: `Given a number of six-sided dice to roll (1–6) and a target sum, return the odds of rolling that sum as a string <code class="inl">"1 in X"</code>, with <b>X</b> rounded to the nearest whole number. The target is always achievable. <span class="rule">Example: <code class="inl">getOdds(2, 4)</code> → <b>"1 in 12"</b> — three of the 36 two-dice rolls total 4 (1+3, 2+2, 3+1), and 36 ÷ 3 = 12.</span>`,
  variants: [
    {
      name: "Enumerate every roll", tone: "brute", cost: "O(6ᵈ) — 46,656 rolls",
      approach: `The definition, taken literally: build every possible roll and count the ones that total the target. Six branches per die, so <b>6<sup>dice</sup></b> complete rolls get walked to the last face — <b>46,656</b> of them at six dice — and the entire yield is one integer, <code class='inl'>hits</code>. It is correct on all six official cases and needs no insight at all, which is exactly its appeal and exactly its cost. Drag the dice count from 1 to 6 and watch the counter multiply by six each time.`,
      code: `// The definition, taken literally: walk all 6^dice rolls and tally the hits.
function getOdds(dice: number, target: number): string {
  let hits = 0;
  const roll: number[] = [];

  function place(i: number, sum: number): void {
    if (i === dice) {            // a complete roll — score it
      if (sum === target) hits++;
      return;
    }
    for (let f = 1; f <= 6; f++) {
      roll[i] = f;
      place(i + 1, sum + f);     // six branches per die
    }
  }
  place(0, 0);

  return "1 in " + Math.round(6 ** dice / hits);
}`,
      mount: mountBrute,
    },
    {
      name: "Step: enumerate every roll", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the enumeration — the call stack grows one frame per die, and every leaf is a finished roll that gets scored and thrown away. Two dice is <b>97 steps</b> for 36 rolls; six dice would be 46,656 leaves, a trace that cannot be rendered at all. That impossibility is the argument for the other approach. The larger official cases live on the demo's sliders. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: STEP_INPUT }),
    },
    {
      name: "Roll the distribution forward", tone: "opt", cost: "O(d · s · 6) — 486 adds",
      approach: `Don't enumerate rolls — count them. Start from the zero-dice row (<code class='inl'>[1]</code>: one way to total 0) and add one die at a time: every way to reach <code class='inl'>s</code> with <code class='inl'>d-1</code> dice becomes a way to reach <code class='inl'>s+f</code> with <code class='inl'>d</code>, for each face <code class='inl'>f</code>. One addition carries a whole subtree of rolls, and each row needs only the row above it, so the memory is a single array. The finished row answers <i>every</i> target for that dice count, not just the one asked for — which is what the bar chart is showing you.`,
      code: `// Count the rolls instead of walking them: one convolution per die.
function getOdds(dice: number, target: number): string {
  let ways = [1];                    // 0 dice: exactly one way to total 0

  for (let d = 1; d <= dice; d++) {
    const next = new Array(ways.length + 6).fill(0);
    for (let s = 0; s < ways.length; s++) {
      if (ways[s] === 0) continue;   // unreachable total — nothing to carry
      for (let f = 1; f <= 6; f++) next[s + f] += ways[s];
    }
    ways = next;                     // only the previous row is ever needed
  }

  return "1 in " + Math.round(6 ** dice / ways[target]);
}`,
      mount: mountOpt,
    },
    {
      name: "Step: roll the distribution forward", tone: "opt", cost: "line-by-line",
      approach: `The same answer built from counts. Watch <b>next</b> appear on line 4, absorb the row above it one total at a time, then vanish on line 9 as it becomes <b>ways</b> — that disappearance is the memory claim. Run case 2 here and in the enumeration tab back to back: identical <code class='inl'>"1 in 12"</code>, <b>60 steps</b> against <b>97</b>. At two dice the gap is small and the DP is even slightly behind on raw additions; by six dice it is 486 against 46,656. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_DIST, trace: traceDist, input: STEP_INPUT }),
    },
  ],
};
