// Bucket Fill 3's model: the board cases, the region graph, and the two solvers (one seed vs any blob, any colour).
// Split out of 365-bucket-fill-3.ts so the page, the step-throughs and the solvers each read on their own.
// The strategy write-up is in the header of 365-bucket-fill-3.ts.

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
export const PALETTE = ["R", "G", "B", "Y", "O", "P", "C"];
export const COLOR: Record<string, string> = {
  R: "#f85149",
  G: "#3fb950",
  B: "#58a6ff",
  Y: "#d29922",
  O: "#ff9f45",
  P: "#bc8cff",
  C: "#39c5cf",
};
export const MAXR = 5,
  MAXC = 4; // the official maximum board; the search is exponential

// Provenance: cases 1–6 are freeCodeCamp's OFFICIAL six, verbatim and in the
// published order. Cases 7 and 8 are INVENTED and both load-bearing:
//   7 "pinwheel"   — THE case that justifies this module over #363. Paint the Y
//     plus "R" and it swallows all four corners at once, then one coat of "B":
//     2 clicks. If every click had to be the target it would cost 5, one per
//     region. Engineered for exactly that gap, not found by luck.
//   8 "two flanks" — the only case where the two approaches disagree (one seed 3,
//     free 2). It is also the only case with WORK LEFT TO DO whose target colour
//     is already on the board, so its floor starts one below the colour count.
//     (Case 2 also holds its target, but that board is finished before it starts.)
export const CASES = [
  {
    label: "one region",
    grid: [
      ["B", "B"],
      ["B", "B"],
    ],
    target: "R",
  }, // official 1 → 1
  {
    label: "already done",
    grid: [
      ["G", "G", "G"],
      ["G", "G", "G"],
      ["G", "G", "G"],
    ],
    target: "G",
  }, // official 2 → 0
  {
    label: "two Y patches",
    grid: [
      ["P", "P", "Y"],
      ["Y", "P", "Y"],
      ["Y", "P", "P"],
    ],
    target: "O",
  }, // official 3 → 2
  {
    label: "mosaic",
    grid: [
      ["G", "Y", "C", "C"],
      ["Y", "Y", "Y", "B"],
      ["C", "Y", "B", "B"],
      ["C", "B", "B", "C"],
    ],
    target: "R",
  }, // official 4 → 4
  {
    label: "columns",
    grid: [
      ["G", "G", "O", "O"],
      ["G", "Y", "B", "Y"],
      ["B", "Y", "B", "Y"],
      ["B", "Y", "B", "Y"],
      ["G", "G", "G", "G"],
    ],
    target: "P",
  }, // official 5 → 5
  {
    label: "bands",
    grid: [
      ["R", "G", "R", "G"],
      ["R", "G", "R", "G"],
      ["B", "B", "B", "B"],
      ["B", "B", "B", "B"],
      ["R", "G", "R", "G"],
    ],
    target: "Y",
  }, // official 6 → 3
  {
    label: "pinwheel",
    grid: [
      ["R", "Y", "R"],
      ["Y", "Y", "Y"],
      ["R", "Y", "R"],
    ],
    target: "B",
  }, // INVENTED → 2 (vs 5 target-only)
  {
    label: "two flanks",
    grid: [
      ["B", "B", "B"],
      ["G", "B", "R"],
      ["G", "B", "R"],
    ],
    target: "B",
  }, // INVENTED → 2 free / 3 one-seed
];

// ── The region graph ────────────────────────────────────────────────────────
// Every click repaints a whole same-colour blob, so a single cell is never the
// unit of anything. Collapse the grid once into connected same-colour components
// and the rest of the module — both searches, both step-throughs, the picture on
// screen — works on a graph of at most a couple of dozen nodes.
export interface Reg {
  R: number;
  C: number;
  n: number;
  id: number[][];
  color: string[];
  cells: [number, number][][];
  adj: number[][];
}
export interface PlanStep {
  region?: number;
  blob?: number[];
  color: string;
}
// oxlint-disable-next-line eslint/complexity -- one flat step-by-step trace/render function; splitting it would scatter the instrumented-line numbering the debugger panel follows
export function regionize(grid: string[][]): Reg {
  const R = grid.length,
    C = grid[0]!.length;
  const id: number[][] = grid.map((row) => row.map(() => -1));
  const color: string[] = [],
    cells: [number, number][][] = [];
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (id[r]![c] !== -1) continue;
      const k = color.length;
      color.push(grid[r]![c]!);
      cells.push([]);
      const stack: [number, number][] = [[r, c]];
      id[r]![c] = k;
      while (stack.length > 0) {
        const [a, b] = stack.pop()!;
        cells[k]!.push([a, b]);
        for (const [dr, dc] of DIRS) {
          const na = a + dr!,
            nb = b + dc!;
          // oxlint-disable-next-line eslint/max-depth -- neighbour scan inside the nested grid loops, matching the displayed solution; flattening would diverge from the CODE listing
          if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
          // oxlint-disable-next-line eslint/max-depth -- neighbour scan inside the nested grid loops, matching the displayed solution; flattening would diverge from the CODE listing
          if (id[na]![nb] === -1 && grid[na]![nb] === grid[a]![b]) {
            id[na]![nb] = k;
            stack.push([na, nb]);
          }
        }
      }
    }
  const n = color.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      for (const [dr, dc] of DIRS) {
        const na = r + dr!,
          nb = c + dc!;
        if (na < 0 || na >= R || nb < 0 || nb >= C) continue;
        const u = id[r]![c]!,
          v = id[na]![nb]!;
        if (u !== v && !adj[u]!.includes(v)) adj[u]!.push(v);
      }
  return { R, C, n, id, color, cells, adj };
}

// Blobs of a state: connected runs of equal colour in the region graph. Regions
// only ever merge (a click paints a whole blob), so the original regions stay
// atomic forever and a plain colour array is a complete description of the board.
export function blobsOf(reg: Reg, s: string[]): number[][] {
  const seen = Array.from({ length: reg.n }, (): boolean => false),
    out: number[][] = [];
  for (let i = 0; i < reg.n; i++) {
    if (seen[i]) continue;
    const stack = [i],
      group = [i];
    seen[i] = true;
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of reg.adj[u!]!)
        if (!seen[v] && s[v] === s[u!]) {
          seen[v] = true;
          stack.push(v);
          group.push(v);
        }
    }
    out.push(group);
  }
  return out;
}

// The admissible floor. A click paints ONE blob ONE colour, so it can retire at
// most one colour from the board; the finished board holds exactly the target.
export const floorOf = (s: string[], target: string): number => {
  const set = new Set(s);
  return set.size - (set.has(target) ? 1 : 0);
};

// ── OPT — any blob, any colour, iterative deepening ─────────────────────────
// Returns the minimum click count plus the plan and the states searched.
export function solveFree(
  reg: Reg,
  target: string,
): { min: number; plan: PlanStep[]; nodes: number } {
  let nodes = 0;
  const dead = new Map<string, number>();
  const search = (s: string[], left: number, path: PlanStep[]): PlanStep[] | null => {
    nodes++;
    const need = floorOf(s, target);
    if (need === 0) return path;
    if (need > left) return null;
    const key = s.join("");
    if ((dead.get(key) ?? -1) >= left) return null;
    dead.set(key, left);
    for (const blob of blobsOf(reg, s)) {
      const cur = s[blob[0]!];
      const options = new Set([target]);
      for (const i of blob) for (const v of reg.adj[i]!) if (s[v] !== cur) options.add(s[v]!);
      for (const c of options) {
        if (c === cur) continue;
        const next = s.slice();
        for (const i of blob) next[i] = c;
        const hit = search(next, left - 1, [...path, { region: blob[0]!, blob, color: c }]);
        if (hit) return hit;
      }
    }
    return null;
  };
  for (let budget = floorOf(reg.color, target); budget <= reg.n + 1; budget++) {
    dead.clear();
    const plan = search(reg.color, budget, []);
    if (plan) return { min: plan.length, plan, nodes };
  }
  return { min: -1, plan: [], nodes };
}

// ── BRUTE — "Drag one blob around", #329's model scaled up ──────────────────
// Pick a region and never click anywhere else: every click repaints the whole
// grown blob, which is the only thing that ever changes colour. Its own floor is
// the same idea as the optimum's, aimed outward — one click can retire at most
// one colour from OUTSIDE the blob, plus a last coat if the target is not among
// them. Without it a 20-region board costs 12.5M states; with it, ~2,000.
const seedFloor = (reg: Reg, blob: Set<number>, cur: string, target: string) => {
  const rest = new Set<string>();
  for (let i = 0; i < reg.n; i++) if (!blob.has(i)) rest.add(reg.color[i]!);
  if (rest.size === 0) return cur === target ? 0 : 1;
  return rest.size + (rest.has(target) ? 0 : 1);
};

export function solveSeed(
  reg: Reg,
  target: string,
): { min: number; seed: number; plan: PlanStep[]; nodes: number } {
  let nodes = 0;
  if (reg.color.every((c: string) => c === target)) return { min: 0, seed: 0, plan: [], nodes };
  const absorb = (blob: Set<number>, c: string) => {
    const out = new Set<number>(blob),
      stack = [...blob];
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of reg.adj[u!]!)
        if (!out.has(v) && reg.color[v] === c) {
          out.add(v);
          stack.push(v);
        }
    }
    return out;
  };
  const grow = (
    blob: Set<number>,
    cur: string,
    left: number,
    path: PlanStep[],
  ): PlanStep[] | null => {
    nodes++;
    const need = seedFloor(reg, blob, cur, target);
    if (need === 0) return path;
    if (need > left) return null;
    const options = new Set([target]);
    for (const i of blob) for (const v of reg.adj[i]!) if (!blob.has(v)) options.add(reg.color[v]!);
    for (const c of options) {
      if (c === cur) continue;
      const grown = absorb(blob, c);
      const hit = grow(grown, c, left - 1, [...path, { color: c, blob: [...grown] }]);
      if (hit) return hit;
    }
    return null;
  };
  for (let limit = 1; limit <= reg.n + 1; limit++)
    for (let seed = 0; seed < reg.n; seed++) {
      const plan = grow(new Set([seed]), reg.color[seed]!, limit, []);
      if (plan) return { min: limit, seed, plan, nodes };
    }
  return { min: -1, seed: 0, plan: [], nodes };
}

// #363's rule as a yardstick, and it needs no search at all: if every click must
// paint the target, a click can only ever convert one original region (target
// blobs merge, but merging never saves a click), so the cost is exactly the
// number of regions that are not already the target.
export const targetOnlyCost = (reg: Reg, target: string): number =>
  reg.color.filter((c: string) => c !== target).length;

export const swatch = (c: string): string =>
  `<span class="b3-dot" style="background:${COLOR[c]}"></span><b>"${c}"</b>`;
