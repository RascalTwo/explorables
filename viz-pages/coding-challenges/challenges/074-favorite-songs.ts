// #74 · Favorite Songs — sort by plays, descending, and keep the first two titles.
// The only decision is the comparator: `(a, b) => b.plays - a.plays` puts the biggest first.
// Shortcuts that fail, each on a specific input:
//   - .sort() with no comparator compares the objects as "[object Object]" strings, which are all
//     equal, so the list stays in input order and the first two songs come back. Official case 1
//     (3, 1, 2) and case 3 (42, 99, 75) both catch it.
//   - a - b sorts ascending, so slice(0, 2) returns the two LEAST played songs.
//   - playlist.sort(...) sorts the caller's array in place; [...playlist] works on a copy.
//     NO official assertion looks at the input afterwards, so the grader cannot tell the two apart.
//     That one is ours to explain, not the grader's.
// The statement never says what a tie does. Array.prototype.sort is stable (ES2019), so equal
// plays keep playlist order: the earlier song ranks first. That is our choice, flagged in the demo.
// ONE approach, deliberately. A single pass that tracks the best two is the same answer with a
// different loop, and at playlist sizes you can type the gap is not something you could watch
// (CONTRIBUTING Tier 3 §1-§3). Click case 4 for the tie, and edit a play count to re-rank live.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

type Song = { title: string; plays: number };

// The 3 official freeCodeCamp cases in the grader's order, then two of ours.
//   4 - ours. A tie for second place: the stable sort keeps the earlier song, a rule the
//     statement leaves unsaid and the grader never tests.
//   5 - ours. Exactly two songs, in the wrong order: the "take two" step has nothing to
//     discard and the sort alone decides the answer.
const CASES: Song[][] = [
  [
    { title: "Sync or Swim", plays: 3 },
    { title: "Byte Me", plays: 1 },
    { title: "Earbud Blues", plays: 2 },
  ],
  [
    { title: "Skip Track", plays: 98 },
    { title: "99 Downloads", plays: 99 },
    { title: "Clickwheel Love", plays: 100 },
  ],
  [
    { title: "Song A", plays: 42 },
    { title: "Song B", plays: 99 },
    { title: "Song C", plays: 75 },
  ],
  [
    { title: "Shuffle", plays: 5 },
    { title: "Hold Button", plays: 9 },
    { title: "Dock Connector", plays: 9 },
    { title: "Scroll Wheel", plays: 1 },
  ],
  [
    { title: "Low Battery", plays: 1 },
    { title: "Full Charge", plays: 2 },
  ],
];
const OFFICIAL = 3; // CASES[0..2] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<number, string[]> = {
  0: ["Sync or Swim", "Earbud Blues"],
  1: ["Clickwheel Love", "99 Downloads"],
  2: ["Song B", "Song C"],
};

const clone = (c: Song[]) => c.map((s) => ({ ...s }));
// The real solution, run on a copy so the demo can compare it with the wrong ones.
const rank = (p: Song[]) => p.toSorted((a, b) => b.plays - a.plays);
const favorite = (p: Song[]) =>
  rank(p)
    .slice(0, 2)
    .map((s) => s.title);
const fmt = (a: string[]) => "[" + a.map((t) => `"${t}"`).join(", ") + "]";

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .fs-wrap { display:flex; flex-direction:column; gap:12px; }
    .fs-row { display:grid; grid-template-columns:22px 150px 1fr 64px 26px; gap:8px; align-items:center; font:12px var(--mono); }
    .fs-rk { color:var(--muted); text-align:right; }
    .fs-bar { height:14px; border-radius:4px; background:var(--panel-2); border:1px solid var(--border); overflow:hidden; }
    .fs-bar i { display:block; height:100%; background:var(--muted); opacity:.55; }
    .fs-row.top .fs-bar i { background:var(--good); opacity:1; }
    .fs-row.top .fs-t { color:var(--good); font-weight:700; }
    .fs-row input[type=number] { width:64px; }
    .fs-x { cursor:pointer; color:var(--muted); background:none; border:0; font:14px var(--mono); }
    .fs-cmp { display:flex; flex-wrap:wrap; gap:6px; }
    .fs-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .fs-r b { color:var(--text); }
    .fs-r.hot { border-color:var(--danger); color:var(--danger); }
    .fs-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let list = clone(CASES[0]!);
  let caseIdx: number | null = 0;
  let seq = 0;

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", `${i + 1}`);
    b.title = (i < OFFICIAL ? "official freeCodeCamp case" : "ours") + `, ${c.length} songs`;
    b.addEventListener("click", () => {
      list = clone(c);
      caseIdx = i;
      render();
    });
    pre.append(b);
  });
  const add = el("button", "chip", "+ song");
  add.addEventListener("click", () => {
    list.push({ title: `Track ${++seq}`, plays: 0 });
    caseIdx = null;
    render();
  });
  pre.append(add);

  const out = el("div");
  host.append(pre, out);
  render();

  function render() {
    out.replaceChildren();
    const wrap = el("div", "fs-wrap");
    const ranked = rank(list);
    const result = favorite(list);
    const want = caseIdx === null ? undefined : EXPECTED[caseIdx];
    const ok = want === undefined || fmt(want) === fmt(result);

    const line = el("div", "result-line");
    line.append(
      el("span", `badge ${ok ? "ok" : "no"}`, `favoriteSongs(...) → ${esc(fmt(result))}`),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected ${esc(fmt(want))}`));
    wrap.append(line);

    // Ranked list: bar length is plays, the two kept rows are green. Plays are editable.
    const max = Math.max(1, ...list.map((s) => s.plays));
    ranked.forEach((s, r) => {
      const row = el("div", `fs-row${r < 2 ? " top" : ""}`);
      const inp = el("input");
      inp.type = "number";
      inp.min = "0";
      inp.value = String(s.plays);
      inp.addEventListener("change", () => {
        s.plays = Math.max(0, Math.floor(Number(inp.value)) || 0);
        caseIdx = null;
        render();
      });
      const x = el("button", "fs-x", "×");
      x.title = "remove song";
      x.addEventListener("click", () => {
        list.splice(list.indexOf(s), 1);
        caseIdx = null;
        render();
      });
      const bar = el("div", "fs-bar", `<i style="width:${(s.plays / max) * 100}%"></i>`);
      row.append(el("span", "fs-rk", `#${r + 1}`), el("span", "fs-t", esc(s.title)), bar, inp, x);
      wrap.append(row);
    });

    // The wrong readings, scored on the same list.
    const noCmp = list.slice(0, 2).map((s) => s.title);
    const asc = list
      .toSorted((a, b) => a.plays - b.plays)
      .slice(0, 2)
      .map((s) => s.title);
    const cmp = el("div", "fs-cmp");
    (
      [
        ["sort() no comparator", noCmp],
        ["a - b (ascending)", asc],
      ] as [string, string[]][]
    ).forEach(([name, v]) => {
      const bad = fmt(v) !== fmt(result);
      cmp.append(
        el("div", `fs-r${bad ? " hot" : ""}`, `${name} <b>${esc(fmt(v))}</b>${bad ? " ✗" : ""}`),
      );
    });
    wrap.append(cmp);

    wrap.append(el("div", "note", noteFor(ranked)));
    out.append(wrap);
  }
}

// What did THIS list exercise?
function noteFor(ranked: Song[]) {
  if (ranked.length < 2)
    return `Fewer than two songs: <code class='inl'>slice(0, 2)</code> just returns what exists. The statement promises a playlist big enough, so this is outside the contract, but it does not crash.`;
  const [a, b, c] = [ranked[0]!, ranked[1]!, ranked[2]];
  if (c !== undefined && b.plays === c.plays)
    return `Songs <b>${esc(b.title)}</b> and <b>${esc(c.title)}</b> tie at ${b.plays}. The statement does not say who wins; because <code class='inl'>sort</code> is stable, the one earlier in the playlist ranks first. That is our reading, not the grader's.`;
  if (a.plays === b.plays)
    return `The top two tie at ${a.plays}. Stable sort keeps playlist order between them, so the earlier song is listed first.`;
  if (ranked.length === 2)
    return `Only two songs, so <code class='inl'>slice(0, 2)</code> discards nothing: the comparator alone decides the order.`;
  return `The comparator <code class='inl'>b.plays - a.plays</code> is positive when <b>b</b> is more played, which moves b ahead of a: biggest first. <code class='inl'>slice(0, 2)</code> then keeps the top two, and <code class='inl'>map</code> drops the play counts. Flip the subtraction and the red row shows the two <i>least</i> played instead.`;
}

// ── STEP — copy, sort, slice, map ────────────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">favoriteSongs</span>(<span class="tok" data-t="arg">playlist</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> ranked = <span class="tok" data-t="ranked">[...playlist].<span class="fn">sort</span>((a, b) => b.plays - a.plays)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> top = <span class="tok" data-t="top">ranked.<span class="fn">slice</span>(0, 2)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">top.<span class="fn">map</span>((s) => s.title)</span>;`,
  },
  { ln: 5, html: `}` },
];

const label = (s: Song) => `${s.title} (${s.plays})`;

function trace(idx: number) {
  const k = Math.max(1, Math.min(CASES.length, Math.floor(idx) || 1)) - 1;
  const playlist = CASES[k]!;
  const ranked = rank(playlist);
  const top = ranked.slice(0, 2);
  const titles = top.map((s) => s.title);
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = {};
    const structs: { label: string; items: unknown[]; newest?: boolean }[] = [
      { label: "playlist", items: playlist.map(label) },
    ];
    if (line >= 2) {
      vars["ranked"] = fmt(ranked.map((s) => s.title)); // `const ranked` is line 2
      structs.push({ label: "ranked", items: ranked.map(label) });
    }
    if (line >= 3) {
      vars["top"] = fmt(top.map((s) => s.title)); // `const top` is line 3
      structs.push({ label: "top", items: top.map(label) });
    }
    steps.push({
      line,
      note,
      focus: x.focus ?? null,
      frames: [
        {
          title: "favoriteSongs(playlist)",
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.ret ?? null,
        },
      ],
      done: x.done,
      result: x.result,
    });
  };

  S(
    1,
    `Called with <b>${playlist.length}</b> songs${k < OFFICIAL ? ` (official case ${k + 1})` : ` (our case ${k + 1})`}. Each has a <code class='inl'>title</code> and a <code class='inl'>plays</code> count, and the answer needs only titles.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>[...playlist]</code> copies first, because <code class='inl'>sort</code> reorders in place and would rearrange the caller's list. The comparator <code class='inl'>b.plays - a.plays</code> is positive when b is more played, so b moves ahead: most played first. Order is now <b>${esc(ranked.map(label).join(", "))}</b>.${
      ranked.some((s, i) => i > 0 && s.plays === ranked[i - 1]!.plays)
        ? ` Equal counts keep playlist order because the sort is stable.`
        : ""
    }`,
    { focus: "ranked", changed: ["ranked"] },
  );
  S(
    3,
    ranked.length <= 2
      ? `<code class='inl'>slice(0, 2)</code> asks for two songs and the list has ${ranked.length}, so nothing is dropped.`
      : `<code class='inl'>slice(0, 2)</code> keeps indices 0 and 1 and drops the other ${ranked.length - 2}. Because the list is already ranked, the first two <i>are</i> the two most played.`,
    { focus: "top", changed: ["top"] },
  );
  S(
    4,
    `<b>Return ${esc(fmt(titles))}.</b> <code class='inl'>map</code> keeps just the titles, in rank order, so the most played song is first as the statement asks.`,
    { focus: "ret", done: true, result: fmt(titles), ret: { value: fmt(titles) } },
  );

  return steps;
}

export default {
  n: 74,
  id: "favorite-songs",
  title: "Favorite Songs",
  dates: ["2025-10-23"],
  statement: `Given an array of song objects representing your iPod playlist, return an array with the titles of the two most played songs, with the most played song first. Each object has a <code class="inl">"title"</code> property (string) and a <code class="inl">"plays"</code> property (integer). <span class="rule">Example: <code class="inl">favoriteSongs([{"title": "Sync or Swim", "plays": 3}, {"title": "Byte Me", "plays": 1}, {"title": "Earbud Blues", "plays": 2}])</code> → <code class="inl">["Sync or Swim", "Earbud Blues"]</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n log n)",
      approach: `Rank the whole playlist, then keep the front. <code class='inl'>sort((a, b) => b.plays - a.plays)</code> orders most played first, <code class='inl'>slice(0, 2)</code> keeps two, <code class='inl'>map</code> turns them into titles. Two traps. <b>Comparator direction</b>: <code class='inl'>a - b</code> is ascending and returns the two <i>least</i> played; a bare <code class='inl'>sort()</code> compares objects as the same string and changes nothing. The official cases catch both. <b>Mutation</b>: sorting <code class='inl'>playlist</code> directly reorders the caller's array, and <b>no official assertion looks</b>, so the copy <code class='inl'>[...playlist]</code> is our habit rather than the grader's demand. Ties are unspecified; a stable sort keeps playlist order (case 4 is ours). The demo ranks the list with bars, lets you edit any play count, add or remove songs, and scores the two wrong comparators in red on the same list.`,
      code: `// Copy, rank most played first, keep two, return titles.
type Song = { title: string; plays: number };

function favoriteSongs(playlist: Song[]): string[] {
  const ranked = [...playlist].sort((a, b) => b.plays - a.plays); // copy: sort is in place
  const top = ranked.slice(0, 2);
  return top.map((s) => s.title);
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Four lines, with <code class='inl'>ranked</code> and <code class='inl'>top</code> appearing only once their lines have run, next to the original <code class='inl'>playlist</code> so you can see it is left alone. Cases <b>1-3</b> are the official ones: case 2 has the most played song <i>last</i>, so the comparator does real work. Case <b>4</b> (ours) has a tie for first place: watch line 2 keep playlist order. Case <b>5</b> (ours) has just two songs, so line 3 drops nothing. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, rest ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
