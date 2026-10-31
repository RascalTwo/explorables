// #58 · Landing Spot — danger is the SUM of four neighbours; a missing one adds 0.
// Nothing to search and nothing to order: every 0 is a candidate, each one is scored by the
// same four reads, and the lowest score wins. What the statement leaves to the reader is
// how "danger" is measured, and three readings go wrong:
//   - "total danger" is a SUM of the numbers, not a count of dangerous neighbours. One 9
//     is worse than three 1s; count them and the ranking flips (ours: the "sum" case).
//   - "ignore diagonals" means FOUR neighbours. Read eight and the answer moves (the
//     official cases 2-4 and ours both catch it).
//   - "ignore out-of-bounds" means a missing neighbour adds nothing, so a corner or edge
//     zero has fewer terms to pay for. That is the rule, not a hack: official case 1 is won
//     by an edge cell for exactly that reason.
// ONE approach, deliberately. Gathering (each 0 reads its neighbours) and scattering (each
// non-zero pushes its number onto its neighbours) are the same four reads per cell
// written two ways, so a second tab would be a strawman (CONTRIBUTING Tier 3 §1/§2/§3).
// Every variant passes all 4 official tests. Click cells to edit the grid and watch the
// scores move; cases 1-4 are freeCodeCamp's, 5-7 are ours.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 4 official freeCodeCamp cases in the grader's order, then three of ours.
//   diagonals — ours. Read the 8 surrounding cells and the answer jumps from [1,0] to
//     [2,0]: the zero beside the other zeros stops looking safe once the diagonal 5 and 8
//     are counted.
//   sum, not count — ours. Counting dangerous neighbours picks [2,0] (one neighbour);
//     summing picks [0,2] (a 1 and a 2 beat a lone 9).
//   [[0]] — ours. One cell and no neighbours: danger 0, and the first 0 wins against
//     bestDanger = Infinity with nothing to compare it to.
const CASES: { label: string; grid: number[][]; want?: [number, number] }[] = [
  {
    label: "2×2 · edge wins",
    want: [0, 1],
    grid: [
      [1, 0],
      [2, 0],
    ],
  },
  {
    label: "3×3 · middle column",
    want: [1, 1],
    grid: [
      [9, 0, 3],
      [7, 0, 4],
      [8, 0, 5],
    ],
  },
  {
    label: "3×3 · zeros touch",
    want: [2, 2],
    grid: [
      [1, 2, 1],
      [0, 0, 2],
      [3, 0, 0],
    ],
  },
  {
    label: "4×4",
    want: [2, 1],
    grid: [
      [9, 6, 0, 8],
      [7, 1, 1, 0],
      [3, 0, 3, 9],
      [8, 6, 0, 9],
    ],
  },
  {
    label: "diagonals",
    grid: [
      [0, 5, 2],
      [0, 0, 8],
      [0, 1, 5],
    ],
  },
  {
    label: "sum, not count",
    grid: [
      [0, 1, 0],
      [5, 8, 2],
      [0, 0, 9],
    ],
  },
  { label: "[[0]]", grid: [[0]] },
];
const OFFICIAL = 4; // CASES[0..3] are freeCodeCamp's; the rest are ours.

const D4: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const D8: [number, number][] = [...D4, [-1, -1], [-1, 1], [1, -1], [1, 1]];
const DIR_NAME = ["up", "down", "left", "right"];

type Grid = number[][];
type Spot = { r: number; c: number; d: number };

// Every 0 and its danger. `count` and `dirs` exist only so the demo can show the wrong readings.
function spots(grid: Grid, dirs = D4, count = false): Spot[] {
  const out: Spot[] = [];
  grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== 0) return;
      let d = 0;
      for (const [dr, dc] of dirs) {
        const n = grid[r + dr]?.[c + dc] ?? 0;
        d += count ? (n > 0 ? 1 : 0) : n;
      }
      out.push({ r, c, d });
    }),
  );
  return out;
}
// First-minimum in row-major order: strict < is what the real code does.
function best(list: Spot[]): Spot | null {
  let b: Spot | null = null;
  for (const s of list) if (!b || s.d < b.d) b = s;
  return b;
}
const at = (s: Spot | null) => (s ? `[${s.r}, ${s.c}]` : "null");
const inBounds = (grid: Grid, r: number, c: number) => grid[r]?.[c] !== undefined;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .ls-wrap { display:flex; flex-direction:column; gap:12px; }
    .ls-grid { display:grid; gap:3px; width:max-content; max-width:100%; }
    .ls-c { width:44px; height:44px; display:flex; flex-direction:column; align-items:center; justify-content:center;
            font:700 16px var(--mono); border-radius:7px; cursor:pointer; user-select:none;
            border:1px solid var(--border); background:var(--panel-2); color:var(--text); }
    .ls-c small { font:600 10px var(--mono); color:var(--muted); }
    .ls-c:hover { outline:2px solid var(--accent); outline-offset:1px; }
    .ls-z { color:var(--muted); border-style:dashed; }
    .ls-nb { outline:2px dashed var(--warn); outline-offset:1px; }
    .ls-win { border:2px solid var(--good); color:var(--good); background:color-mix(in srgb, var(--good) 22%, transparent); }
    .ls-win small { color:var(--good); }
    .ls-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .ls-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let grid: Grid = CASES[1]!.grid.map((row) => row.slice());

  const pre = el("div", "controls");
  CASES.forEach((cs, i) => {
    const chip = el("button", "chip", esc(cs.label));
    chip.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    chip.addEventListener("click", () => {
      grid = cs.grid.map((row) => [...row]);
      render();
    });
    pre.append(chip);
  });

  const size = el("div", "controls");
  const resize = (dr: number, dc: number) => {
    const R = Math.min(8, Math.max(1, grid.length + dr)),
      C = Math.min(8, Math.max(1, grid[0]!.length + dc));
    grid = Array.from({ length: R }, (_row, r) =>
      Array.from({ length: C }, (_cell, c) => grid[r]?.[c] ?? 0),
    );
    render();
  };
  size.append(el("span", "ctl-label", "size"));
  (
    [
      ["rows −", -1, 0],
      ["rows +", 1, 0],
      ["cols −", 0, -1],
      ["cols +", 0, 1],
    ] as const
  ).forEach(([label, dr, dc]) => {
    const b = el("button", "chip", label);
    b.addEventListener("click", () => resize(dr, dc));
    size.append(b);
  });

  const out = el("div");
  host.append(
    el(
      "div",
      "note",
      "Click a cell to raise it by one (0–9, then back to 0); shift-click lowers it. Every <b>0</b> shows its danger <b>Σ</b>; hover one to outline the four neighbours it adds up. The green cell is the safest.",
    ),
    pre,
    size,
    out,
  );
  render();

  function render() {
    out.innerHTML = "";
    const R = grid.length,
      C = grid[0]!.length;
    const list = spots(grid),
      win = best(list);
    const diag = best(spots(grid, D8)),
      cnt = best(spots(grid, D4, true));
    const wrongDiag = at(diag) !== at(win),
      wrongCnt = at(cnt) !== at(win);
    const ties = win ? list.filter((s) => s.d === win.d).length : 0;
    const sumAt = new Map(list.map((s) => [`${s.r},${s.c}`, s.d]));

    const cells: HTMLElement[][] = [];
    const g = el("div", "ls-grid");
    g.style.gridTemplateColumns = `repeat(${C}, auto)`;
    grid.forEach((row, r) => {
      cells.push([]);
      row.forEach((v, c) => {
        const isWin = !!win && win.r === r && win.c === c;
        const cell = el(
          "div",
          `ls-c${v === 0 ? " ls-z" : ""}${isWin ? " ls-win" : ""}`,
          v === 0 ? `<small>Σ</small>${sumAt.get(`${r},${c}`)}` : String(v),
        );
        if (v > 0)
          cell.style.background = `color-mix(in srgb, var(--danger) ${v * 9}%, transparent)`;
        cell.title = `[${r}, ${c}]`;
        cell.addEventListener("click", (e) => {
          grid[r]![c] = (v + (e.shiftKey ? 9 : 1)) % 10;
          render();
        });
        cell.addEventListener("mouseenter", () => {
          if (v !== 0) return;
          for (const [dr, dc] of D4) cells[r + dr]?.[c + dc]?.classList.add("ls-nb");
        });
        cell.addEventListener("mouseleave", () =>
          cells.flat().forEach((x) => x.classList.remove("ls-nb")),
        );
        cells[r]!.push(cell);
        g.append(cell);
      });
    });

    const wrap = el("div", "ls-wrap");
    const official = CASES.slice(0, OFFICIAL).find(
      (cs) => JSON.stringify(cs.grid) === JSON.stringify(grid),
    );
    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${official && at(win) !== `[${official.want![0]}, ${official.want![1]}]` ? "no" : "ok"}`,
        `findLandingSpot(${R}×${C}) → ${at(win)}`,
      ),
      el(
        "span",
        "more",
        official
          ? `matches freeCodeCamp's expected [${official.want!.join(", ")}]`
          : `${list.length} landing spot${list.length === 1 ? "" : "s"} scored`,
      ),
    );
    wrap.append(line, g);

    // One chip per candidate: the scoreboard the loop is building.
    const chips = el("div", "cand-grid");
    list.forEach((s) =>
      chips.append(
        el(
          "span",
          `cand ${win && s.r === win.r && s.c === win.c ? "pass" : "fail"}`,
          `[${s.r},${s.c}] Σ=${s.d}`,
        ),
      ),
    );
    if (list.length > 0) wrap.append(chips);

    if (wrongCnt && win && cnt)
      wrap.append(
        el(
          "div",
          "ls-warn",
          `Count the dangerous neighbours instead of adding their numbers and this picks <b>${at(cnt)}</b>, not <b>${at(win)}</b>.`,
        ),
      );
    if (wrongDiag && win && diag)
      wrap.append(
        el(
          "div",
          "ls-warn",
          `Read all eight surrounding cells instead of four and this picks <b>${at(diag)}</b>, not <b>${at(win)}</b>.`,
        ),
      );

    wrap.append(el("div", "note", noteFor(grid, list, win, ties, cnt, diag, wrongCnt, wrongDiag)));
    out.append(wrap);
  }
}

// What did THIS grid exercise? Every branch names a different thing to get wrong.
function noteFor(
  grid: Grid,
  list: Spot[],
  win: Spot | null,
  ties: number,
  cnt: Spot | null,
  diag: Spot | null,
  wrongCnt: boolean,
  wrongDiag: boolean,
) {
  if (!win)
    return `There is no <b>0</b> anywhere, so nothing is a candidate. The inner loop body never gets past its first <code class='inl'>continue</code>, <code class='inl'>best</code> keeps its starting <code class='inl'>null</code>, and that is what comes back. The statement promises a safest spot exists, so the grader never asks — but an empty answer is the honest one when no cell is landable.`;
  if (ties > 1)
    return `<b>${ties}</b> spots tie at danger <b>${win.d}</b>. The statement promises exactly one safest spot, so the grader never sets this up — but it shows what <code class='inl'>danger &lt; bestDanger</code> does with a tie: the strict comparison keeps the <i>first</i> in row-major order, ${at(win)}, and an equal later one cannot take over. Write <code class='inl'>&lt;=</code> and the last would win instead.`;
  if (wrongCnt && cnt)
    return `Danger is the <b>sum</b> of the neighbouring numbers, which is why <b>${at(win)}</b> wins with <b>${win.d}</b>: "the higher the number, the more dangerous" means one 9 outweighs several small ones. Counting the nonzero neighbours throws the sizes away and prefers <b>${at(cnt)}</b>. It is not a harmless shortcut — it measures a different thing.`;
  if (wrongDiag && diag)
    return `Only the <b>four</b> orthogonal neighbours count, so ${at(win)} scores <b>${win.d}</b> and wins. The statement says to ignore diagonals, and the diagonal cells are not neutral: read all eight and ${at(diag)} takes the lead instead. That is why the offsets are the four pairs <code class='inl'>[±1, 0]</code> and <code class='inl'>[0, ±1]</code> and not a nested loop over <code class='inl'>-1..1</code>, which would also include the diagonals and the cell itself.`;
  if (list.length === 1)
    return `Only one <b>0</b>, so ${at(win)} is the safest by default: <code class='inl'>bestDanger</code> starts at <code class='inl'>Infinity</code> precisely so that the first zero always beats it. Its danger is <b>${win.d}</b>${win.d === 0 ? ", because every neighbour is off the grid or itself a 0, and a 0 adds nothing" : ""}. There is no special case for a single candidate — it just has nothing to lose to.`;
  const nb = D4.filter(([dr, dc]) => inBounds(grid, win.r + dr, win.c + dc)).length;
  if (nb < 4)
    return `<b>${at(win)}</b> wins with <b>${win.d}</b> and it has only <b>${nb}</b> neighbour${nb === 1 ? "" : "s"} on the grid. "Ignore out-of-bounds" means a missing neighbour adds nothing — the same as a 0 — so a corner or edge spot simply has fewer terms to pay for. That advantage is real, not a bug: it is why the first official case is won by an edge cell.`;
  return `<b>${at(win)}</b> is an interior spot with all four neighbours, and it still wins with <b>${win.d}</b>: being in the middle costs nothing by itself, only the neighbours' numbers do, and here they are the smallest total on the board. A neighbour that is itself a 0 contributes nothing, which is how a spot beside other landing spots can be the safest.`;
}

// ── STEP — scan, gather four reads, keep the lowest ─────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">findLandingSpot</span>(<span class="tok" data-t="arg">matrix</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">best = <span class="k">null</span>, bestDanger = <span class="nu">Infinity</span></span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="r">r = <span class="nu">0</span>; r &lt; matrix.length</span>; r++) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="c">c = <span class="nu">0</span>; c &lt; matrix[r].length</span>; c++) {`,
  },
  {
    ln: 5,
    html: `      <span class="k">if</span> (<span class="tok" data-t="skip">matrix[r][c] !== <span class="nu">0</span></span>) <span class="k">continue</span>;`,
  },
  {
    ln: 6,
    html: `      <span class="k">let</span> <span class="tok" data-t="danger">danger = <span class="nu">0</span></span>;`,
  },
  {
    ln: 7,
    html: `      <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="dir">[dr, dc] <span class="k">of</span> [[-<span class="nu">1</span>, <span class="nu">0</span>], [<span class="nu">1</span>, <span class="nu">0</span>], [<span class="nu">0</span>, -<span class="nu">1</span>], [<span class="nu">0</span>, <span class="nu">1</span>]]</span>) {`,
  },
  {
    ln: 8,
    html: `        danger += <span class="tok" data-t="read">matrix[r + dr]?.[c + dc] ?? <span class="nu">0</span></span>;`,
  },
  { ln: 9, html: `      }` },
  {
    ln: 10,
    html: `      <span class="k">if</span> (<span class="tok" data-t="cmp">danger &lt; bestDanger</span>) { bestDanger = danger; best = [r, c]; }`,
  },
  { ln: 11, html: `    }` },
  { ln: 12, html: `  }` },
  {
    ln: 13,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">best</span>;`,
  },
  { ln: 14, html: `}` },
];

function trace(caseIndex: number) {
  const k = Math.max(1, Math.min(CASES.length, Math.trunc(caseIndex)));
  const matrix = CASES[k - 1]!.grid;
  const R = matrix.length,
    C = matrix[0]!.length;
  const steps: DbgStep[] = [];

  // Live state. A name appears in the panel only while it is in scope, so each is
  // set when its line runs and cleared when its block ends.
  let bestSpot: string | null = null,
    bestDanger: number | null = null,
    r: number | undefined,
    c: number | undefined,
    danger: number | undefined,
    dir: string | undefined,
    reads: string[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    const vars: Record<string, unknown> = {};
    if (line >= 2) {
      vars["best"] = bestSpot ?? "null";
      vars["bestDanger"] = bestDanger ?? "Infinity";
    }
    if (r !== undefined) vars["r"] = r;
    if (c !== undefined) vars["c"] = c;
    if (danger !== undefined) vars["danger"] = danger;
    if (dir !== undefined) vars["dir"] = dir;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `findLandingSpot(${R}×${C} matrix)`,
          vars,
          changed: x.changed ?? [],
          structs: [
            { label: "matrix", items: matrix.map((row) => `[${row.join(", ")}]`) },
            ...(danger !== undefined
              ? [{ label: "neighbours read", items: reads, newest: true }]
              : []),
          ],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `A <b>${R}×${C}</b> matrix. Every <b>0</b> is a place to land and every other number is a hazard, so the work is: score each 0 by the hazards touching it, and keep the lowest. There is no order to exploit — each zero is scored on its own, which is why this is a plain scan.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>bestDanger</code> starts at <b>Infinity</b>, not 0. That is deliberate: the first zero found must beat the starting value whatever its score, and a score of 0 is a perfectly good score (a zero ringed by zeros). Start at 0 and a strict <code class='inl'>&lt;</code> could never accept it.`,
    { focus: "init", changed: ["best", "bestDanger"] },
  );

  for (r = 0; r < R; r++) {
    S(3, `Row <b>${r}</b>.`, { focus: "r", changed: ["r"] });
    for (c = 0; c < C; c++) {
      const v = matrix[r]![c]!;
      if (v !== 0) {
        S(
          5,
          `<b>[${r}, ${c}]</b> holds <b>${v}</b>, not 0 — a hazard, not a place to land, so <code class='inl'>continue</code>. It is not ignored, though: it will be <i>read</i> as a neighbour by whichever zeros sit beside it.`,
          { focus: "skip", changed: ["c"], eval: { expr: `${v} !== 0`, val: true } },
        );
        continue;
      }
      S(5, `<b>[${r}, ${c}]</b> is a <b>0</b>: a candidate. It falls through to be scored.`, {
        focus: "skip",
        changed: ["c"],
        eval: { expr: `0 !== 0`, val: false },
      });

      danger = 0;
      reads = [];
      S(
        6,
        `Fresh <code class='inl'>danger</code> for this spot. It is declared <i>inside</i> the cell, so each zero is scored from nothing and one spot's total can never leak into the next.`,
        { focus: "danger", changed: ["danger"] },
      );

      for (const [i, [dr, dc]] of D4.entries()) {
        dir = DIR_NAME[i];
        const nr = r + dr,
          nc = c + dc;
        const inside = inBounds(matrix, nr, nc);
        const n = matrix[nr]?.[nc] ?? 0;
        danger = danger + n;
        reads.push(String(n));
        S(
          8,
          inside
            ? `Read <b>${dir}</b>, <b>[${nr}, ${nc}]</b>: <b>${n}</b>${n === 0 ? " — a 0 neighbour is a landing spot, not a hazard, and adds nothing" : ""}. <code class='inl'>danger</code> is now <b>${danger}</b>.`
            : `<b>${dir}</b> is off the grid. <code class='inl'>matrix[${nr}]?.[${nc}]</code> is <code class='inl'>undefined</code> and <code class='inl'>?? 0</code> turns it into 0, so a missing neighbour adds nothing. That is "ignore out-of-bounds" in one operator — and it means an edge spot has fewer terms to pay for.`,
          { focus: "read", changed: ["dir", "danger"] },
        );
      }
      dir = undefined;

      const wins = bestDanger === null || danger < bestDanger;
      const before = bestDanger;
      if (wins) {
        bestDanger = danger;
        bestSpot = `[${r}, ${c}]`;
      }
      S(
        10,
        wins
          ? before === null
            ? `<code class='inl'>${danger} &lt; Infinity</code> is true: the first zero scored is always the best so far, because there is nothing to compare it with. <b>best = [${r}, ${c}]</b>, <b>bestDanger = ${danger}</b>.`
            : `<code class='inl'>${danger} &lt; ${before}</code> is true: this spot is safer than the previous best. <b>best = [${r}, ${c}]</b> at <b>${danger}</b>. Strict <code class='inl'>&lt;</code> means an equal score would <i>not</i> replace it.`
          : `<code class='inl'>${danger} &lt; ${bestDanger}</code> is false: ${danger === bestDanger ? `a tie, and the strict comparison keeps the earlier spot` : `this spot is more dangerous than <b>${bestSpot}</b>`}, so <code class='inl'>best</code> stays.`,
        {
          focus: "cmp",
          changed: wins ? ["best", "bestDanger"] : [],
          eval: { expr: `${danger} < ${before ?? "Infinity"}`, val: wins },
        },
      );
      danger = undefined;
      reads = [];
    }
    c = undefined;
  }
  r = undefined;

  S(
    13,
    bestSpot
      ? `Both loops are done, every zero has been scored, and <b>${bestSpot}</b> held the lowest total at <b>${bestDanger}</b>. Return it.`
      : `Both loops finished without ever finding a 0, so <code class='inl'>best</code> is still its starting <code class='inl'>null</code>. The statement promises this never happens.`,
    {
      focus: "ret",
      done: true,
      result: bestSpot ?? "null",
      ret: { value: bestSpot ?? "null" },
    },
  );
  return steps;
}

export default {
  n: 58,
  id: "landing-spot",
  title: "Space Week Day 4: Landing Spot",
  dates: ["2025-10-07"],
  statement: `Given a matrix of digits <code class="inl">0–9</code>, find the safest landing spot for a rover. Each <code class="inl">0</code> is a potential landing spot; any other number is too dangerous to land on, and the higher the number, the more dangerous. The <b>safest</b> spot is the <code class="inl">0</code> whose surrounding cells — <b>up to 4 neighbours, ignoring diagonals</b> — have the lowest <b>total</b> danger. Out-of-bounds neighbours are ignored, so corners and edges just have fewer. Return its <code class="inl">[row, col]</code>. <span class="rule">There is always exactly one safest spot. Example: <code class="inl">findLandingSpot([[1, 0], [2, 0]])</code> → <b>[0, 1]</b> — the two zeros are at <code class="inl">[0, 1]</code> and <code class="inl">[1, 1]</code>; the first has neighbours <code class="inl">1</code> and <code class="inl">0</code> (total 1), the second has <code class="inl">2</code> and <code class="inl">0</code> (total 2), so the first is safer.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(rows · cols) — 4 reads per zero",
      approach: `Score every <b>0</b> by the same four reads and keep the lowest. There is no search to speed up and no order to exploit, so the work is a scan with a fixed-size inner loop — and the problem is really about how each phrase in the statement is <i>read</i>. Three readings go wrong, and the demo shows each as a red row. <b>"Total danger" is a sum</b>: count the dangerous neighbours instead and one 9 stops outweighing a 1 and a 2 (ours: <b>sum, not count</b>). <b>"Ignore diagonals" means four neighbours</b>: read eight and the answer moves — the official cases 2–4 catch it, and so does ours. <b>"Ignore out-of-bounds" means a missing neighbour adds 0</b>, so a corner or edge spot has fewer terms to pay for; that is the rule working, and it is why an edge cell wins the first official case. The code writes the bounds check as <code class='inl'>matrix[r + dr]?.[c + dc] ?? 0</code>: both a missing row and a missing column fall out as <code class='inl'>undefined</code>, which <code class='inl'>?? 0</code> turns into nothing added. Start <code class='inl'>bestDanger</code> at <code class='inl'>Infinity</code> so the first zero always wins its comparison, and keep strict <code class='inl'>&lt;</code> so a tie (which the statement rules out) would keep the earlier spot.`,
      code: `// Score every 0 by the sum of its four neighbours; keep the lowest.
function findLandingSpot(matrix: number[][]): number[] | null {
  let best: number[] | null = null;
  let bestDanger = Infinity;                       // so the first zero always wins
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] !== 0) continue;            // only a 0 can be landed on
      let danger = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        danger += matrix[r + dr]?.[c + dc] ?? 0;   // off the grid adds nothing
      }
      if (danger < bestDanger) { bestDanger = danger; best = [r, c]; }
    }
  }
  return best;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `The scan one cell at a time, with each variable appearing in the panel only while it is in scope: <code class='inl'>r</code> and <code class='inl'>c</code> while their loops run, <code class='inl'>danger</code> and <code class='inl'>dir</code> only inside one zero's scoring, and a "neighbours read" strip that fills in as the four reads happen. Start on <b>case 1</b>, the shortest, to watch an edge zero read an off-grid neighbour as 0; <b>case 2</b> has an interior winner reading all four; <b>case 3</b> shows zeros beside zeros; <b>case 4</b> is the 4×4 with the full set of rejections. Cases 5–7 are ours: <b>diagonals</b>, <b>sum, not count</b>, and the one-cell <b>[[0]]</b>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 1,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1–${CASES.length}: ${CASES.map((cs, i) => `${i + 1} ${cs.label}`).join(" · ")}`,
          },
        }),
    },
  ],
} satisfies Challenge;
