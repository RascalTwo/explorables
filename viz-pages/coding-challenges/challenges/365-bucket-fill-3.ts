// #365 · The Last Challenge: Bucket Fill 3 — any colour is legal, so one seed is not enough.
//
// Third and last of the bucket-fill series, and the last daily challenge:
//   • #329 Bucket Fill    — flood ONE region from a seed. One click, no counting.
//   • #363 Bucket Fill 2  — fewest clicks to make the whole board the target,
//                           where every click must paint the TARGET colour.
//   • #365 (here)         — same goal, but a click may paint ANY colour, so other
//                           colours become intermediate steps.
// That one relaxed clause is the whole difficulty. With the colour forced, a
// click can only ever grow the target blob outward, so expansion is greedy and
// the answer is one click per non-target region. Once any colour is allowed, the
// COLOUR of each click is a free variable: painting the middle of #363's board
// "Y" can swallow two Y patches at once and pay for itself. Nothing decides that
// locally, so the answer stops being a formula and becomes a shortest-sequence
// search over the region graph.
//
// Same input, two strategies. Both deepen shortest-first and both prune with an
// admissible floor (a click retires at most one colour, so at least that many
// clicks remain); the difference is WHERE you are allowed to click:
//   • BRUTE — "Drag one blob around": pick a seed and never click anywhere else,
//     #329's mental model scaled up. Every click repaints the WHOLE grown blob, so
//     the only way to reach an outlying region is to drag the blob out to it,
//     recolouring everything already inside on the way.
//   • OPT   — click ANY blob with ANY colour, so the optimum can paint an
//     outlying region directly instead of dragging one blob across the board.
// Flip the Approach toggle on case 8 "two flanks" to see 3 clicks vs 2 on
// identical input — the optimum paints the two outliers directly instead of
// dragging one blob around.
//
// CAVEAT (verified in node, same shape as 320-blood-bank): the one-seed strategy
// passes ALL SIX of freeCodeCamp's official tests. The official set never
// separates the two — the only inputs where they disagree are ours. So "worse"
// here means worse in general, not wrong by the grader.
//
// Day 365 of the daily coding challenge, published 2026-08-10, exactly a year
// after #1 "Vowel Balance". freeCodeCamp kept the feature and made it loop.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge } from "./lib/shared.js";
import {
  CASES,
  COLOR,
  MAXC,
  MAXR,
  PALETTE,
  blobsOf,
  regionize,
  solveFree,
  solveSeed,
  swatch,
  targetOnlyCost,
} from "./lib/bucket-fill-3-model.js";
import type { PlanStep, Reg } from "./lib/bucket-fill-3-model.js";
import {
  CASES_FREE,
  CASES_SEED,
  SRC_FREE,
  SRC_SEED,
  traceFree,
  traceSeed,
} from "./lib/bucket-fill-3-trace.js";

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .b3-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
    .b3-row .lab { font:600 12px var(--sans); color:var(--muted); }
    .b3-sw { width:26px; height:26px; border-radius:7px; border:2px solid var(--border); cursor:pointer;
             display:flex; align-items:center; justify-content:center; font:800 12px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b3-sw:hover { transform:scale(1.12); }
    .b3-sw.on { border-color:#fff; box-shadow:0 0 0 2px var(--accent); }
    .b3-main { display:flex; gap:22px; align-items:flex-start; flex-wrap:wrap; margin:6px 0 12px; }
    .b3-grid { display:grid; gap:5px; width:max-content; }
    .b3-cell { width:40px; height:40px; border-radius:8px; border:2px solid rgba(0,0,0,.28); cursor:pointer;
               display:flex; align-items:center; justify-content:center; font:800 15px var(--mono); color:#0a0e14; transition:transform .1s; }
    .b3-cell:hover { transform:scale(1.08); border-color:#fff; }
    .b3-cell.seed { box-shadow:0 0 0 3px #fff, 0 0 12px 2px var(--accent); z-index:2; }
    .b3-cell.hit { animation:b3pop .4s cubic-bezier(.2,1.4,.4,1); }
    @keyframes b3pop { 0%{ transform:scale(.4); } 100%{ transform:scale(1); } }
    .b3-graph { border:1px solid var(--border); border-radius:10px; background:#0a0e14; padding:4px; }
    .b3-graph text { font:800 10px var(--mono); fill:#0a0e14; }
    .b3-cap { font:600 10.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
    .b3-info { font:13px var(--mono); color:var(--text); background:#0a0e14; border:1px solid var(--border);
               border-radius:8px; padding:9px 12px; max-width:520px; line-height:1.6; }
    .b3-info b { color:var(--accent); }
    .b3-rungs { max-width:520px; }
    .b3-dot { display:inline-block; width:11px; height:11px; border-radius:3px; vertical-align:-1px; margin-right:4px; border:1px solid rgba(0,0,0,.35); }
  `,
    ),
  );
}

// Region-graph picture: nodes sit at their region's centroid so the graph reads
// as an X-ray of the board, then relax apart so two centroids never overlap.
function graphSVG(reg: Reg, state: string[], opts: { seed?: number | undefined } = {}) {
  const step = 40,
    pad = 22;
  const w = pad * 2 + (reg.C - 1) * step,
    h = pad * 2 + (reg.R - 1) * step;
  const pos = reg.cells.map((cs): [number, number] => {
    const y = cs.reduce((a, p) => a + p[0], 0) / cs.length,
      x = cs.reduce((a, p) => a + p[1], 0) / cs.length;
    return [pad + x * step, pad + y * step];
  });
  const rad = reg.cells.map((cs) => Math.min(17, 8 + 3.4 * Math.sqrt(cs.length)));
  for (let it = 0; it < 60; it++)
    for (let i = 0; i < reg.n; i++)
      for (let j = i + 1; j < reg.n; j++) {
        let dx = pos[j]![0] - pos[i]![0],
          dy = pos[j]![1] - pos[i]![1];
        let d = Math.hypot(dx, dy) || 0.01;
        const want = rad[i]! + rad[j]! + 5;
        if (d >= want) continue;
        if (d < 0.05) {
          dx = i % 2 ? 1 : -1;
          dy = j % 2 ? 1 : -1;
          d = Math.hypot(dx, dy);
        }
        const push = (want - d) / 2;
        pos[i]![0] -= (dx / d) * push;
        pos[i]![1] -= (dy / d) * push;
        pos[j]![0] += (dx / d) * push;
        pos[j]![1] += (dy / d) * push;
      }
  const bx = 6;
  const minX = Math.min(...pos.map((p: number[], i) => p[0]! - rad[i]!)) - bx,
    maxX = Math.max(...pos.map((p, i) => p[0] + rad[i]!)) + bx;
  const minY = Math.min(...pos.map((p: number[], i) => p[1]! - rad[i]!)) - bx,
    maxY = Math.max(...pos.map((p, i) => p[1] + rad[i]!)) + bx;
  const vw = Math.max(maxX - minX, w),
    vh = Math.max(maxY - minY, h);
  let out = `<svg class="b3-graph" viewBox="${minX} ${minY} ${vw} ${vh}" width="${Math.min(230, vw * 1.1)}" height="${Math.min(260, vh * 1.1)}">`;
  for (let u = 0; u < reg.n; u++)
    for (const v of reg.adj[u]!)
      if (v > u)
        out += `<line x1="${pos[u]![0]}" y1="${pos[u]![1]}" x2="${pos[v]![0]}" y2="${pos[v]![1]}" stroke="${state[u] === state[v] ? "#8b949e" : "#30363d"}" stroke-width="${state[u] === state[v] ? 2.4 : 1.3}"/>`;
  for (let i = 0; i < reg.n; i++)
    out +=
      `<circle cx="${pos[i]![0]}" cy="${pos[i]![1]}" r="${rad[i]}" fill="${COLOR[state[i]!] ?? "#30363d"}" stroke="${opts.seed === i ? "#fff" : "rgba(0,0,0,.4)"}" stroke-width="${opts.seed === i ? 3 : 1.5}"/>` +
      `<text x="${pos[i]![0]}" y="${pos[i]![1] + 3.5}" text-anchor="middle">${i + 1}</text>`;
  return out + `</svg>`;
}

interface InfoCtx {
  mode: string;
  playing: boolean;
  solved: boolean;
  clicks: number;
  target: string;
  only: number;
  free: ReturnType<typeof solveFree>;
  seed: ReturnType<typeof solveSeed>;
  reg: Reg;
}

// The sentence under the board: what the player has done, or what each strategy found.
function infoHtml({ mode, playing, solved, clicks, target, only, free, seed, reg }: InfoCtx) {
  if (playing)
    return solved
      ? `<b>${clicks}</b> click${clicks === 1 ? "" : "s"} — the minimum is <b>${free.min}</b>. ` +
          (clicks === free.min ? `That is optimal. ` : `${clicks - free.min} over par. `) +
          `Painting only ${swatch(target)} would have cost <b>${only}</b>. Hit <b>↺ restart</b> to try again.`
      : `Pick a <b>brush</b> colour, then click any cell — the whole blob under it takes that colour. ` +
          `Get every cell to ${swatch(target)}. You are on click <b>${clicks}</b>; the minimum is <b>${free.min}</b>.`;
  if (mode === "seed")
    return seed.min === 0
      ? `Every region already holds ${swatch(target)} — <b>0</b> clicks, and the search never starts.`
      : `Best single seed: <b>region ${seed.seed + 1}</b> (ringed), finishing in <b>${seed.min}</b> click${seed.min === 1 ? "" : "s"} after searching <b>${seed.nodes}</b> blob states. ` +
          (seed.min > free.min
            ? `The true minimum is <b>${free.min}</b> — dragging one blob around costs ${seed.min - free.min} extra click${seed.min - free.min === 1 ? "" : "s"} here, because the cheap move is to paint an outlying region <i>directly</i>.`
            : `Here that ties the true minimum of <b>${free.min}</b> — this strategy is not wrong, it is just not always optimal.`) +
          ` <span class="muted">Pick a brush and click a cell to redraw the board.</span>`;
  return free.min === 0
    ? `Every region already holds ${swatch(target)} — <b>0</b> clicks. The floor is <code class="inl">1 − 1 = 0</code>, so iterative deepening returns before it searches anything.`
    : `Minimum <b>${free.min}</b> click${free.min === 1 ? "" : "s"} over <b>${reg.n}</b> region${reg.n === 1 ? "" : "s"}, found after <b>${free.nodes}</b> state${free.nodes === 1 ? "" : "s"}. ` +
        `Painting only ${swatch(target)} — #363's rule — would cost <b>${only}</b>, one click per non-target region` +
        (only > free.min
          ? `; the <b>${only - free.min}</b> saved click${only - free.min === 1 ? "" : "s"} are what the intermediate colours buy. `
          : `, which happens to tie here. `) +
        (seed.min > free.min
          ? `Dragging <i>one</i> blob around — the other tab — costs <b>${seed.min}</b>: the cheap move here is to paint an outlying region <b>directly</b> rather than drag one blob out to it.`
          : `One seed would also manage <b>${seed.min}</b> on this board.`) +
        ` <span class="muted">Pick a brush and click a cell to redraw the board, or switch to <b>▶ play</b>.</span>`;
}

// The ladder under the board: the plan a strategy found, one rung per click.
function planRungs(mode: string, reg: Reg, plan: PlanStep[]) {
  const rows = [el("div", "b3-cap", mode === "seed" ? "the one-seed run" : "an optimal plan")];
  let live = reg.color.slice();
  plan.forEach((p, i: number) => {
    const before = live.slice();
    const grew = (p.blob ?? []).filter((k) => before[k] !== p.color).length;
    (p.blob ?? []).forEach((k) => {
      live[k] = p.color;
    });
    const where = mode === "seed" ? `repaint the blob` : `click region ${p.region! + 1}`;
    rows.push(
      el(
        "div",
        "rung",
        `<span>${i + 1}. ${where} → ${swatch(p.color)}</span><span class="v">${grew} region${grew === 1 ? "" : "s"} now that colour</span>`,
      ),
    );
  });
  return rows;
}

// The badge row above the info text: clicks for the chosen strategy, the work it took, and the yardsticks.
function resultHtml(
  mode: string,
  free: ReturnType<typeof solveFree>,
  seed: ReturnType<typeof solveSeed>,
  only: number,
) {
  const shown = mode === "seed" ? seed.min : free.min;
  const work = mode === "seed" ? seed.nodes : free.nodes;
  return (
    `<span class="badge ${mode === "seed" && seed.min > free.min ? "no" : "ok"}">${shown} click${shown === 1 ? "" : "s"}</span>` +
    `<span class="opcount ${work > 400 ? "hot" : "cool"}"><span class="n">${work}</span> states searched</span>` +
    `<span class="tag">true minimum ${free.min}</span>` +
    `<span class="tag">one seed ${seed.min}</span>` +
    `<span class="tag">#363 rule (target only) ${only}</span>`
  );
}

// The clickable colour grid. `seedAt` is the region to ring (-1 for none); `lastHit` flashes the blob just painted.
function boardGrid(
  reg: Reg,
  view: string[],
  {
    seedAt,
    lastHit,
    onCell,
  }: { seedAt: number; lastHit: number[]; onCell: (r: number, c: number) => void },
) {
  const g = el("div", "b3-grid");
  g.style.gridTemplateColumns = `repeat(${reg.C}, 40px)`;
  for (let r = 0; r < reg.R; r++)
    for (let c = 0; c < reg.C; c++) {
      const k = reg.id[r]![c]!,
        v = view[k]!;
      const cell = el(
        "div",
        "b3-cell" + (seedAt === k ? " seed" : "") + (lastHit.includes(k) ? " hit" : ""),
        v,
      );
      cell.style.background = COLOR[v] ?? "var(--panel-2)";
      cell.addEventListener("click", () => onCell(r, c));
      g.append(cell);
    }
  return g;
}

// The last solve, keyed by board and target.
interface SolveCache {
  key: string | null;
  free?: ReturnType<typeof solveFree>;
  seed?: ReturnType<typeof solveSeed>;
  only?: number;
}

// ── The board demo, shared by both approaches ───────────────────────────────
// mode "seed": solve with the one-seed strategy and show which seed won.
// mode "free": solve optimally, and offer a PLAY mode where your own clicks race
// the computed minimum — losing to the optimum is the fastest way to feel why
// the colour choice matters.
function mountBoard(mode: string) {
  return function mount(host: HTMLElement) {
    ensureStyle();
    let ci = 7; // both open on "two flanks", the case where the approaches split
    let grid = CASES[ci]!.grid.map((r) => r.slice());
    let target = CASES[ci]!.target;
    let brush = "Y";
    let playing = false;
    let state: string[] | null = null,
      clicks = 0,
      lastHit: number[] = [];

    const presetRow = el("div", "b3-row");
    presetRow.append(el("span", "lab", "case"));
    const chips = CASES.map((cs, i) => {
      const c = el("button", "chip" + (i === ci ? " on" : ""), cs.label);
      c.addEventListener("click", () => {
        ci = i;
        grid = cs.grid.map((r) => [...r]);
        target = cs.target;
        playing = false;
        chips.forEach((x, xi) => {
          x.classList.toggle("on", xi === i);
        });
        draw();
      });
      presetRow.append(c);
      return c;
    });

    const tgtRow = el("div", "b3-row");
    tgtRow.append(el("span", "lab", "target colour"));
    const tsw = PALETTE.map((v) => {
      const s = el("div", "b3-sw", v);
      s.style.background = COLOR[v]!;
      s.addEventListener("click", () => {
        target = v;
        playing = false;
        draw();
      });
      tgtRow.append(s);
      return s;
    });

    const brushRow = el("div", "b3-row");
    brushRow.append(el("span", "lab", "brush"));
    const bsw = PALETTE.map((v) => {
      const s = el("div", "b3-sw", v);
      s.style.background = COLOR[v]!;
      s.addEventListener("click", () => {
        brush = v;
        draw();
      });
      brushRow.append(s);
      return s;
    });

    const sizeRow = el("div", "b3-row");
    sizeRow.append(el("span", "lab", "board"));
    const mkSize = (txt: string, fn: () => void) => {
      const b = el("button", "chip", txt);
      b.addEventListener("click", () => {
        fn();
        playing = false;
        draw();
      });
      sizeRow.append(b);
      return b;
    };
    mkSize("− row", () => {
      if (grid.length > 2) grid.pop();
    });
    mkSize("+ row", () => {
      if (grid.length < MAXR) grid.push(grid.at(-1)!.map((c) => c));
    });
    mkSize("− col", () => {
      if (grid[0]!.length > 2)
        grid.forEach((r) => {
          r.pop();
        });
    });
    mkSize("+ col", () => {
      if (grid[0]!.length < MAXC)
        grid.forEach((r) => {
          r.push(r.at(-1)!);
        });
    });
    sizeRow.append(
      el(
        "span",
        "lab",
        `max ${MAXR}×${MAXC} — freeCodeCamp's largest board, and about as far as an exponential search stays quick; paint 20 different regions and it really does take a second`,
      ),
    );

    let playRow = null,
      playBtn: HTMLButtonElement | null = null,
      resetBtn = null;
    if (mode === "free") {
      playRow = el("div", "b3-row");
      playRow.append(el("span", "lab", "mode"));
      playBtn = el("button", "chip", "✎ editing — click to play");
      resetBtn = el("button", "chip", "↺ restart");
      playBtn.addEventListener("click", () => {
        playing = !playing;
        if (playing) {
          state = null;
          clicks = 0;
        }
        draw();
      });
      resetBtn.addEventListener("click", () => {
        state = null;
        clicks = 0;
        draw();
      });
      playRow.append(playBtn, resetBtn);
    }

    const main = el("div", "b3-main");
    const gridBox = el("div"),
      graphBox = el("div");
    main.append(gridBox, graphBox);
    const resLine = el("div", "result-line");
    const info = el("div", "b3-info");
    const rungs = el("div", "ladder b3-rungs");
    host.append(presetRow, tgtRow, brushRow, sizeRow);
    if (playRow) host.append(playRow);
    host.append(main, resLine, info, rungs);

    function cellClick(r: number, c: number) {
      const reg = regionize(grid);
      if (!playing) {
        grid[r]![c] = brush;
        draw();
        return;
      }
      state ??= reg.color.slice();
      const k = reg.id[r]![c]!;
      if (state[k] === brush) {
        lastHit = [];
        draw({
          nudge: `That blob is already ${swatch(brush)} — a click that changes nothing still would not count, so pick another colour.`,
        });
        return;
      }
      const blob = blobsOf(reg, state).find((b) => b.includes(k));
      blob!.forEach((i) => {
        state![i] = brush;
      });
      clicks++;
      lastHit = blob!;
      draw();
    }

    // Both searches are exponential in the worst case, and draw() runs on every
    // swatch and toggle. Re-solve only when the board or the target actually
    // changed, so picking a brush colour never re-runs a search.
    let cache: SolveCache = { key: null };
    function draw(x: { nudge?: string | undefined } = {}) {
      const reg = regionize(grid);
      const view = playing && state ? state : reg.color;
      const key = grid.map((r) => r.join("")).join("/") + "|" + target;
      if (cache.key !== key)
        cache = {
          key,
          free: solveFree(reg, target),
          seed: solveSeed(reg, target),
          only: targetOnlyCost(reg, target),
        };
      const free = cache.free!,
        seed = cache.seed!,
        only = cache.only!;
      tsw.forEach((s, i) => {
        s.classList.toggle("on", PALETTE[i] === target);
      });
      bsw.forEach((s, i) => {
        s.classList.toggle("on", PALETTE[i] === brush);
      });
      if (playBtn) {
        playBtn.textContent = playing ? "▶ playing — click to edit" : "✎ editing — click to play";
        playBtn.classList.toggle("on", playing);
      }

      gridBox.innerHTML = "";
      gridBox.append(el("div", "b3-cap", "board"));
      gridBox.append(
        boardGrid(reg, view, {
          seedAt: !playing && mode === "seed" && seed.min > 0 ? seed.seed : -1,
          lastHit,
          onCell: cellClick,
        }),
      );

      graphBox.innerHTML =
        `<div class="b3-cap">region graph · ${reg.n} node${reg.n === 1 ? "" : "s"}</div>` +
        graphSVG(reg, view, { seed: !playing && mode === "seed" && seed.min > 0 ? seed.seed : -1 });

      const solved = view.every((c: string) => c === target);
      resLine.innerHTML = resultHtml(mode, free, seed, only);

      info.innerHTML =
        x.nudge ?? infoHtml({ mode, playing, solved, clicks, target, only, free, seed, reg });

      rungs.innerHTML = "";
      const plan = mode === "seed" ? seed.plan : free.plan;
      if (!playing && plan.length > 0) {
        rungs.append(...planRungs(mode, reg, plan));
      }
      lastHit = [];
    }

    draw();
  };
}

export default {
  n: 365,
  id: "bucketfill3",
  title: "The Last Challenge: Bucket Fill 3",
  dates: ["2026-08-10"],
  statement: `Given a 2D grid of single-letter colour strings and a target colour, return the <b>minimum number of flood-fill clicks</b> needed to make the entire grid that colour. A click recolours the clicked cell and its whole 4-connected region of matching cells — and a click may paint <b>any</b> colour, not only the target, so other colours are legal intermediate steps.
  <span class="rule">Example: <code class="inl">bucketFill([["P","P","Y"],["Y","P","Y"],["Y","P","P"]], "O")</code> → <code class="inl">2</code>. Paint the P snake <code class="inl">"Y"</code> and it swallows <i>both</i> Y patches at once; then one coat of <code class="inl">"O"</code>. Painting <code class="inl">"O"</code> every time — the rule in #363 — would cost 3.</span>
  <span class="rule">This is day 365, the last new daily coding challenge freeCodeCamp published: the run opened with #1 "Vowel Balance" on 2025-08-11 and closed exactly a year later on 2026-08-10. The feature was not retired — a later change made the dailies year-agnostic, so they now replay from the start.</span>`,
  variants: [
    {
      name: "Drag one blob around",
      tone: "brute",
      cost: "one seed · colours^d",
      approach: `The obvious way to scale <b>#329 Bucket Fill</b> up: pick a region, then <b>never click anywhere else</b>. Every click repaints the whole grown blob and swallows each neighbour holding that colour, so the blob only ever grows outward — the same picture as a flood fill, with a click counter on it. Try each seed, shortest run first, and take the first that finishes. It is a legitimate strategy returning a legitimate count, and it <b>passes every official test</b>. It just is not always the <i>minimum</i>: on case 8 <b>two flanks</b> it drags one blob around for 3 clicks where painting the two outliers directly costs 2. Edit the board or flip the Approach toggle to see the gap.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Collapse the board into regions — connected same-colour components.
  const id: number[][] = grid.map((row) => row.map(() => -1));
  const color: string[] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (id[r][c] !== -1) continue;
    const k = color.length; color.push(grid[r][c]);
    const stack: number[][] = [[r, c]]; id[r][c] = k;
    while (stack.length) {
      const [a, b] = stack.pop()!;
      for (const [dr, dc] of dirs) {
        const na = a + dr, nb = b + dc;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        if (id[na][nb] === -1 && grid[na][nb] === grid[a][b]) { id[na][nb] = k; stack.push([na, nb]); }
      }
    }
  }
  const n = color.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
    const na = r + dr, nb = c + dc;
    if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
    const u = id[r][c], v = id[na][nb];
    if (u !== v && !adj[u].includes(v)) adj[u].push(v);
  }
  if (color.every((c) => c === targetColor)) return 0;

  // Clicks still owed: one click absorbs ONE colour class from outside the blob,
  // and if the target is not out there the run still needs a final coat.
  const floor = (blob: Set<number>, cur: string): number => {
    const rest = new Set<string>();
    for (let i = 0; i < n; i++) if (!blob.has(i)) rest.add(color[i]);
    if (rest.size === 0) return cur === targetColor ? 0 : 1;
    return rest.size + (rest.has(targetColor) ? 0 : 1);
  };

  // One click paints the WHOLE blob, swallowing every neighbour of that colour.
  const absorb = (blob: Set<number>, c: string): Set<number> => {
    const out = new Set(blob), stack = [...blob];
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj[u]) if (!out.has(v) && color[v] === c) { out.add(v); stack.push(v); }
    }
    return out;
  };

  // Can this seed finish within \`left\` clicks?
  const grow = (blob: Set<number>, cur: string, left: number): boolean => {
    const need = floor(blob, cur);
    if (need === 0) return true;                 // blob is the board, in the target
    if (need > left) return false;               // this run cannot pay for itself
    const options = new Set<string>([targetColor]);
    for (const i of blob) for (const v of adj[i]) if (!blob.has(v)) options.add(color[v]);
    for (const c of options) {
      if (c === cur) continue;
      if (grow(absorb(blob, c), c, left - 1)) return true;
    }
    return false;
  };

  for (let limit = 1; ; limit++)              // shortest run first
    for (let seed = 0; seed < n; seed++)      // every region gets a turn
      if (grow(new Set([seed]), color[seed], limit)) return limit;
}`,
      mount: mountBoard("seed"),
    },
    {
      name: "Step: drag one blob around",
      tone: "brute",
      cost: "the blob, growing",
      approach: `The one-seed run traced. The <b>blob</b> struct is the only thing that moves: it starts as a single region and each click repaints <i>all</i> of it, swallowing every neighbour that holds the chosen colour. Watch the frames stack up and pop — a colour that leads nowhere inside the budget unwinds and the caller tries the next one. Case 4 <b>two flanks</b> is the one that loses: no seed can finish in 2, so the answer comes back 3. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC_SEED,
          trace: traceSeed,
          input: {
            label: "case =",
            value: 4,
            min: 1,
            max: CASES_SEED.length,
            presets: CASES_SEED.map((_, i) => i + 1),
            hint: `1–${CASES_SEED.length}: pick a scenario`,
          },
        }),
    },
    {
      name: "Any blob, any colour",
      tone: "opt",
      cost: "IDDFS + colour floor",
      approach: `Drop the seed. Any blob may be clicked, with any colour, so the state is just "what colour is each region now" and the answer is the shortest path from the start colouring to the all-target one. Two things make that searchable: <b>iterative deepening</b> — try 1 click, then 2, so the first success is provably the minimum — and an <b>admissible floor</b>: a click paints one blob one colour, so it retires at most one colour from the board, and any position needing more colours retired than it has clicks left is abandoned untried. Switch to <b>▶ play</b> and try to match the number yourself; the readout also prints what #363's always-paint-the-target rule would have cost.`,
      code: `function bucketFill(grid: string[][], targetColor: string): number {
  const R = grid.length, C = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 1. Collapse the board into regions — a click repaints a whole region, so a
  //    single cell is never the unit of anything.
  const id: number[][] = grid.map((row) => row.map(() => -1));
  const color: string[] = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (id[r][c] !== -1) continue;
    const k = color.length; color.push(grid[r][c]);
    const stack: number[][] = [[r, c]]; id[r][c] = k;
    while (stack.length) {
      const [a, b] = stack.pop()!;
      for (const [dr, dc] of dirs) {
        const na = a + dr, nb = b + dc;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        if (id[na][nb] === -1 && grid[na][nb] === grid[a][b]) { id[na][nb] = k; stack.push([na, nb]); }
      }
    }
  }
  const n = color.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
    const na = r + dr, nb = c + dc;
    if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
    const u = id[r][c], v = id[na][nb];
    if (u !== v && !adj[u].includes(v)) adj[u].push(v);
  }

  // 2. Admissible floor: one click paints one blob one colour, so it retires at
  //    most one colour. A finished board holds exactly the target.
  const floor = (s: string[]): number => {
    const set = new Set(s);
    return set.size - (set.has(targetColor) ? 1 : 0);
  };

  // Blobs of a state: connected runs of equal colour in the region graph.
  const blobsOf = (s: string[]): number[][] => {
    const seen = new Array(n).fill(false), out: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (seen[i]) continue;
      const stack = [i], group = [i]; seen[i] = true;
      while (stack.length) {
        const u = stack.pop()!;
        for (const v of adj[u]) if (!seen[v] && s[v] === s[u]) { seen[v] = true; stack.push(v); group.push(v); }
      }
      out.push(group);
    }
    return out;
  };

  // 3. Depth-limited search. Refutations are memoised: many click orders reach
  //    the same colouring, and re-refuting one is pure waste.
  const dead = new Map<string, number>();
  const search = (s: string[], left: number): boolean => {
    const need = floor(s);
    if (need === 0) return true;                    // every region is the target
    if (need > left) return false;                  // the floor kills the branch
    const key = s.join("");
    if ((dead.get(key) ?? -1) >= left) return false;
    dead.set(key, left);
    for (const blob of blobsOf(s)) {                // ANY blob may be clicked
      const cur = s[blob[0]];
      const options = new Set<string>([targetColor]);
      for (const i of blob) for (const v of adj[i]) if (s[v] !== cur) options.add(s[v]);
      for (const c of options) {                    // with ANY colour
        if (c === cur) continue;
        const next = s.slice();
        for (const i of blob) next[i] = c;
        if (search(next, left - 1)) return true;
      }
    }
    return false;
  };

  // 4. Iterative deepening, starting at the floor: the first depth that works
  //    is the minimum, not merely a plan that happens to work.
  for (let budget = floor(color); ; budget++) {
    dead.clear();
    if (search(color, budget)) return budget;
  }
}`,
      mount: mountBoard("free"),
    },
    {
      name: "Step: free search",
      tone: "opt",
      cost: "the floor, pruning",
      approach: `The optimal search traced. Each live <code class='inl'>search</code> call is a frame carrying its own colouring <b>s</b> and its remaining budget, so a refuted branch visibly pops off. Two lines do the work: line 8 abandons any position whose <b>need</b> exceeds the clicks left — untried, no moves generated — and line 17 raises the budget only after the whole shallower tree is refuted, which is what makes the answer a minimum. Case 1 <b>already done</b> returns before searching anything; case 3 <b>two flanks</b> shows the optimum clicking two <i>different</i> regions. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC_FREE,
          trace: traceFree,
          input: {
            label: "case =",
            value: 3,
            min: 1,
            max: CASES_FREE.length,
            presets: CASES_FREE.map((_, i) => i + 1),
            hint: `1–${CASES_FREE.length}: pick a scenario`,
          },
        }),
    },
  ],
} satisfies Challenge;
