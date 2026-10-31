// #75 · Hidden Treasure — a non-water dive is a hit; the last one if no other "O" remains.
// The grid holds exactly one treasure, so "is any of it still unfound?" is a question about the
// whole map, not about the dive cell's neighbours:
//   map[r][c] === "-"                    -> "Empty"
//   a part is hit and "O" cells remain   -> "Found"
//   a part is hit and no "O" remains     -> "Recovered"
// "A part is hit" includes an "X": official case 4 dives on an already-found X with an O left and
// expects "Found". So the count is of "O" cells other than the dive cell itself.
// Two shortcuts go wrong:
//   - Looking only at the four neighbours of the dive cell calls it "Recovered" when the
//     remaining "O" is further along the treasure. The official set never separates them (its
//     treasures are 2 or 3 cells long), so case 7 is ours: a bar 5 long, dived at one end.
//   - Treating only "O" as a hit sends the X dive of official case 4 to "Empty".
// ONE approach, deliberately. A flood fill from the dive cell, or a running count of "O" kept
// between dives, is the same scan respelled for a map this small and nothing you could watch
// differs (CONTRIBUTING Tier 3 §1-§3). Click a cell to dive there; in edit mode a click cycles it.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

type Grid = string[][];
interface Case {
  grid: Grid;
  at: [number, number];
  exp?: string; // official expected answer; undefined for ours
}

// Cases 1-6 are freeCodeCamp's six assertions in the grader's order. 7 is ours.
//   7 - a 1x5 bar of treasure dived at one end: the last "O" is four cells away, so a
//     neighbours-only check says "Recovered" where the answer is "Found".
const CASES: Case[] = [
  {
    grid: [
      ["-", "X"],
      ["-", "X"],
      ["-", "O"],
    ],
    at: [2, 1],
    exp: "Recovered",
  },
  {
    grid: [
      ["-", "X"],
      ["-", "X"],
      ["-", "O"],
    ],
    at: [2, 0],
    exp: "Empty",
  },
  {
    grid: [
      ["-", "X"],
      ["-", "O"],
      ["-", "O"],
    ],
    at: [1, 1],
    exp: "Found",
  },
  {
    grid: [
      ["-", "-", "-"],
      ["X", "O", "X"],
      ["-", "-", "-"],
    ],
    at: [1, 2],
    exp: "Found",
  },
  {
    grid: [
      ["-", "-", "-"],
      ["-", "-", "-"],
      ["O", "X", "X"],
    ],
    at: [2, 0],
    exp: "Recovered",
  },
  {
    grid: [
      ["-", "-", "-"],
      ["-", "-", "-"],
      ["O", "X", "X"],
    ],
    at: [1, 2],
    exp: "Empty",
  },
  { grid: [["O", "O", "O", "O", "O"]], at: [0, 0] },
];
const OFFICIAL = 6; // CASES[0..5] are freeCodeCamp's; the rest are ours.

const dive = (map: Grid, [r, c]: [number, number]) => {
  if (map[r]?.[c] === "-") return "Empty";
  const others = map.flat().filter((v) => v === "O").length - (map[r]![c] === "O" ? 1 : 0);
  return others > 0 ? "Found" : "Recovered";
};
const oCells = (map: Grid) =>
  map.flatMap((row, r) => row.flatMap((v, c) => (v === "O" ? [`[${r},${c}]`] : [])));
const clone = (g: Grid) => g.map((row) => [...row]);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .ht-wrap { display:flex; flex-direction:column; gap:12px; }
    .ht-grid { display:inline-grid; gap:4px; }
    .ht-c { width:38px; height:38px; display:flex; align-items:center; justify-content:center; font:15px var(--mono); border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); cursor:pointer; padding:0; }
    .ht-c.O { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 16%, transparent); color:var(--accent); }
    .ht-c.X { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, transparent); color:var(--good); }
    .ht-c.at { outline:2px solid var(--warn); outline-offset:1px; }
    .ht-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); align-self:flex-start; }
    .ht-r.hot { border-color:var(--danger); color:var(--danger); }
    .ht-r b { color:var(--text); }
    .ht-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let map = clone(CASES[0]!.grid);
  let at: [number, number] = [...CASES[0]!.at];
  let edit = false;

  const pre = el("div", "controls");
  CASES.forEach((cs, i) => {
    const b = el("button", "chip", `${i + 1}`);
    b.title = i < OFFICIAL ? `official freeCodeCamp case: ${cs.exp}` : "ours";
    b.addEventListener("click", () => {
      map = clone(cs.grid);
      at = [...cs.at];
      render();
    });
    pre.append(b);
  });
  const mode = el("button", "chip", "dive mode");
  mode.addEventListener("click", () => {
    edit = !edit;
    mode.textContent = edit ? "edit mode: click cycles - O X" : "dive mode";
    render();
  });
  const ctl = el("div", "controls");
  ctl.append(mode, el("span", "ctl-label", "dive mode: click a cell to dive there"));

  const out = el("div");
  host.append(pre, ctl, out);
  render();

  function render() {
    out.innerHTML = "";
    const result = dive(map, at);
    const idx = CASES.findIndex(
      (cs) =>
        cs.at[0] === at[0] && cs.at[1] === at[1] && JSON.stringify(cs.grid) === JSON.stringify(map),
    );
    const want = idx >= 0 && idx < OFFICIAL ? CASES[idx]!.exp : undefined;
    const wrap = el("div", "ht-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `dive(map, [${at.join(",")}]) → "${result}"`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected "${esc(want)}"`));
    wrap.append(line);

    const g = el("div", "ht-grid");
    g.style.gridTemplateColumns = `repeat(${map[0]!.length}, auto)`;
    map.forEach((row, r) =>
      row.forEach((v, c) => {
        const b = el(
          "button",
          `ht-c ${v === "-" ? "" : v}${r === at[0] && c === at[1] ? " at" : ""}`,
          esc(v),
        );
        b.title = `[${r}, ${c}]`;
        b.addEventListener("click", () => {
          if (edit) map[r]![c] = v === "-" ? "O" : v === "O" ? "X" : "-";
          else at = [r, c];
          render();
        });
        g.append(b);
      }),
    );
    wrap.append(g);

    // The neighbours-only shortcut, scored on the same map.
    const [r, c] = at;
    const near = [map[r - 1]?.[c], map[r + 1]?.[c], map[r]?.[c - 1], map[r]?.[c + 1]].some(
      (v) => v === "O",
    );
    const wrong = map[r]?.[c] === "-" ? "Empty" : near ? "Found" : "Recovered";
    const hot = wrong !== result;
    wrap.append(
      el(
        "div",
        `ht-r${hot ? " hot" : ""}`,
        `neighbours only <b>${wrong}</b>${hot ? " ✗" : ""} · all-map count <b>${result}</b>`,
      ),
    );
    wrap.append(el("div", "note", noteFor(map, at)));
    out.append(wrap);
  }
}

// What did THIS dive exercise?
function noteFor(map: Grid, [r, c]: [number, number]) {
  const cell = map[r]?.[c];
  const left = oCells(map);
  if (cell === "-")
    return `Cell <b>[${r},${c}]</b> is open water, so the answer is <b>Empty</b> before anything is counted. The treasure's state is irrelevant to a miss.`;
  const others = left.length - (cell === "O" ? 1 : 0);
  const what =
    cell === "O"
      ? `an <b>O</b>, an unfound part, and the map holds ${left.length} of them (${left.join(" ")})`
      : `an <b>X</b>, a part already found. It still counts as treasure (official case 4 dives on one and expects Found), and the map holds ${left.length} <b>O</b>${left.length === 1 ? "" : "s"}${left.length > 0 ? ` (${left.join(" ")})` : ""}`;
  if (others === 0)
    return `<b>[${r},${c}]</b> is ${what}. No unfound part is left besides this cell: <b>Recovered</b>.`;
  return `<b>[${r},${c}]</b> is ${what}. ${others} unfound ${others === 1 ? "part remains" : "parts remain"} elsewhere, so <b>Found</b>. The remaining part need not touch the dive cell: only a count of the whole map sees it.`;
}

// ── STEP — hit test, count, decide ───────────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">dive</span>(<span class="tok" data-t="arg">map, [r, c]</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">if</span> (<span class="tok" data-t="hit">map[r][c] === <span class="st">"-"</span></span>) <span class="k">return</span> <span class="st">"Empty"</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> others = <span class="tok" data-t="others">map.<span class="fn">flat</span>().<span class="fn">filter</span>(v =&gt; v === <span class="st">"O"</span>).length - (map[r][c] === <span class="st">"O"</span> ? 1 : 0)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">others &gt; 0 ? <span class="st">"Found"</span> : <span class="st">"Recovered"</span></span>;`,
  },
  { ln: 5, html: `}` },
];

function trace(idx: number) {
  const cs = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const map = cs.grid;
  const [r, c] = cs.at;
  const cell = map[r]![c]!;
  const os = oCells(map);
  const others = os.length - (cell === "O" ? 1 : 0);
  const result = dive(map, cs.at);
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      ret?: boolean;
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { r, c };
    if (line >= 3 && cell !== "-") vars["others"] = others;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? `"${result}"` : undefined,
      frames: [
        {
          title: `dive(map, [${r}, ${c}])`,
          vars,
          changed: x.changed ?? [],
          structs: [
            { label: "map", items: map.map((row) => row.join(" ")) },
            ...(line >= 3 && cell !== "-" ? [{ label: 'every "O"', items: os }] : []),
          ],
          ret: x.done ? { value: `"${result}"` } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `A ${map.length}x${map[0]!.length} map and a dive at <b>[${r}, ${c}]</b>. The map holds exactly one treasure of several cells, some already found (<b>X</b>), some not (<b>O</b>); water is <b>-</b>. The answer depends on that one cell first, then on the rest of the map.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>map[${r}][${c}]</code> is <b>"${cell}"</b>, so the test <code class='inl'>=== "-"</code> is ${cell === "-"}. ${
      cell === "-"
        ? "Open water: nothing is here, return Empty at once."
        : cell === "O"
          ? "An unfound part of the treasure is hit; the early return is skipped."
          : "A part already found earlier. It is still treasure, so the dive is not Empty (official case 4 dives on an X and expects Found); the early return is skipped."
    }`,
    {
      focus: "hit",
      eval: { expr: `map[${r}][${c}] === "-"`, val: cell === "-" },
      done: cell === "-",
    },
  );
  if (cell === "-") return steps;
  S(
    3,
    `Flatten the map and count every <b>O</b>: ${os.length}${os.length > 0 ? ` (${os.join(" ")})` : ""}. ${
      cell === "O"
        ? `The dive cell is one of them, so <b>${os.length} - 1 = ${others}</b> unfound parts would remain.`
        : `The dive cell is an X, not among them, so nothing is subtracted: <b>${others}</b> unfound ${others === 1 ? "part remains" : "parts remain"}.`
    } The count is over the <i>whole map</i>, not the dive cell's neighbours, because the rest of the treasure can be several cells away.`,
    { focus: "others", changed: ["others"] },
  );
  S(
    4,
    `<code class='inl'>${others} &gt; 0</code> is ${others > 0}: ${
      others > 0
        ? "treasure is still hidden, so <b>Found</b>"
        : "no unfound part is left, so <b>Recovered</b>"
    }. The map is never changed; the function only reports.`,
    {
      focus: "ret",
      eval: { expr: `${others} > 0`, val: others > 0 },
      done: true,
    },
  );
  return steps;
}

export default {
  n: 75,
  id: "hidden-treasure",
  title: "Hidden Treasure",
  dates: ["2025-10-24"],
  statement: `Given a 2D array representing a map of the ocean floor that includes a hidden treasure, and an array with the coordinates (<code class="inl">[row, column]</code>) for the next dive of your treasure search, return <code class="inl">"Empty"</code>, <code class="inl">"Found"</code>, or <code class="inl">"Recovered"</code>. The map holds exactly one unrecovered treasure, which occupies multiple cells. Each cell is <code class="inl">"-"</code> (no treasure), <code class="inl">"O"</code> (a part not yet found) or <code class="inl">"X"</code> (a part already found). No treasure at the dive location: <code class="inl">"Empty"</code>. Treasure found, but another part is still unfound: <code class="inl">"Found"</code>. The last unfound part: <code class="inl">"Recovered"</code>. <span class="rule">Example: <code class="inl">dive([["-","X"],["-","X"],["-","O"]], [2, 1])</code> → <code class="inl">"Recovered"</code>, because the dive found the last unfound part.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(rows x cols)",
      approach: `Only <code class='inl'>"-"</code> is a miss: both <code class='inl'>"O"</code> and <code class='inl'>"X"</code> are treasure, so a dive on an already-found part is not <b>Empty</b> (official case 4 does exactly that and expects Found). Past the miss test, the question is whether any <i>other</i> <code class='inl'>"O"</code> is left, a count over the <b>whole map</b>: flatten, count the <code class='inl'>"O"</code>s, and subtract one if the dive cell is itself an <code class='inl'>"O"</code>. Zero left is <b>Recovered</b>, otherwise <b>Found</b>. The tempting shortcut is to look only at the dive cell's four neighbours, which says Recovered whenever the remaining part is further along the treasure; the red line under the grid scores it on the same dive. The official treasures are only 2 or 3 cells long, so the shortcut passes them; case <b>7</b> (ours) is a bar of five dived at one end. Click a cell to dive there, or switch to edit mode and click cells to draw your own map. Cases 1 to 6 are freeCodeCamp's.`,
      code: `// Hit test on the dive cell, then a count of unfound parts over the whole map.
function dive(map: string[][], [r, c]: [number, number]): string {
  if (map[r][c] === "-") return "Empty";              // open water
  const unfound = map.flat().filter((v) => v === "O").length;
  const others = unfound - (map[r][c] === "O" ? 1 : 0); // an "O" dive cell doesn't count
  return others > 0 ? "Found" : "Recovered";
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Four lines. Line 2 decides <b>Empty</b> alone, so on a miss the trace ends there and <code class='inl'>others</code> never appears; on a hit, line 3 counts the whole map and line 4 compares. Cases <b>2</b> and <b>6</b> are misses; <b>1</b> and <b>5</b> hit the last <b>O</b> (Recovered); <b>3</b> leaves one behind (Found), and <b>4</b> dives on an <b>X</b> with an <b>O</b> elsewhere (Found), the one case where line 3 subtracts nothing. Case <b>7</b> (ours) has four <b>O</b>s left in a row. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${CASES.length - OFFICIAL} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
