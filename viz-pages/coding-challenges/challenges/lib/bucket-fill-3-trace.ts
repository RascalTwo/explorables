// Bucket Fill 3's two step-throughs for the shared debugger: free search (opt) and drag one blob around (brute).
// Split out of 365-bucket-fill-3.ts; the page wires these into mountDebugger.
import type { DbgStep, DbgStruct, DbgFrame } from "./shared.js";
import { CASES, regionize, blobsOf, floorOf, swatch } from "./bucket-fill-3-model.js";

// ── STEP: free search — the iterative deepening, line by line ───────────────
// Five short cases. The frames ARE the recursion: each live search() call is a
// frame carrying its own board state `s` and its remaining budget, so a failed
// branch visibly pops back off. Cases picked so no trace runs long: case 1 never
// enters the search at all, case 2 finishes on the first click.
export const CASES_FREE = [CASES[1], CASES[0], CASES[7], CASES[6], CASES[2]];

export const SRC_FREE = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> { color, adj } = <span class="fn">collapseToRegions</span>(<span class="tok" data-t="reg">grid</span>);  <span class="cm">// regions, never cells</span>`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="floor">floor</span> = s =&gt; distinct(s).size - (s has target ? 1 : 0);`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> <span class="tok" data-t="dead">dead</span> = <span class="k">new</span> Map();                     <span class="cm">// colourings already refuted</span>`,
  },
  {
    ln: 5,
    html: `  <span class="k">function</span> <span class="fn">search</span>(s, left) {              <span class="cm">// finish within left clicks?</span>`,
  },
  {
    ln: 6,
    html: `    <span class="k">const</span> <span class="tok" data-t="need">need</span> = <span class="fn">floor</span>(s);             <span class="cm">// clicks this colouring owes</span>`,
  },
  {
    ln: 7,
    html: `    <span class="k">if</span> (<span class="tok" data-t="win">need === 0</span>) <span class="k">return</span> <span class="k">true</span>;          <span class="cm">// every region is the target</span>`,
  },
  {
    ln: 8,
    html: `    <span class="k">if</span> (<span class="tok" data-t="prune">need &gt; left</span>) <span class="k">return</span> <span class="k">false</span>;       <span class="cm">// no budget can reach it</span>`,
  },
  {
    ln: 9,
    html: `    <span class="k">if</span> (<span class="tok" data-t="memo">dead.<span class="fn">get</span>(key(s)) &gt;= left</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  { ln: 10, html: `    dead.<span class="fn">set</span>(key(s), left);` },
  {
    ln: 11,
    html: `    <span class="k">for</span> (<span class="k">const</span> blob <span class="k">of</span> <span class="tok" data-t="blobs">blobsOf(s)</span>)         <span class="cm">// ANY blob may be clicked</span>`,
  },
  {
    ln: 12,
    html: `      <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> <span class="tok" data-t="cols">coloursTouching(blob)</span>) <span class="cm">// with ANY colour</span>`,
  },
  {
    ln: 13,
    html: `        <span class="k">if</span> (<span class="fn">search</span>(<span class="fn">paint</span>(s, blob, c), left - 1)) <span class="k">return</span> <span class="k">true</span>;`,
  },
  { ln: 14, html: `    <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 15, html: `  }` },
  { ln: 16, html: `` },
  {
    ln: 17,
    html: `  <span class="k">for</span> (<span class="k">let</span> budget = <span class="tok" data-t="budget">floor(color)</span>; ; budget++)  <span class="cm">// shortest answer first</span>`,
  },
  {
    ln: 18,
    html: `    <span class="k">if</span> (<span class="fn">search</span>(color, budget)) <span class="k">return</span> budget;`,
  },
  { ln: 19, html: `}` },
];

interface SearchFrame {
  s: string[];
  left: number;
  pick?: string;
  changed?: string[];
  fresh?: boolean;
  ret?: { value: unknown };
}
interface FreeSnapOpts {
  note?: string | undefined;
  focus?: string | undefined;
  eval?: { expr: string; val: boolean } | undefined;
  done?: boolean | undefined;
  result?: string | undefined;
  ret?: { value: number } | { value: number | null } | undefined;
  changed?: string[] | undefined;
}
type FreeSnap = (line: number, o?: FreeSnapOpts) => void;

// Lines 1–4 of the free search: the case, the region graph, the floor and the map of refuted
// colourings. Returns the floor of the starting colouring, which is where deepening begins.
function openFree(
  snap: FreeSnap,
  idx: number,
  cs: NonNullable<(typeof CASES_FREE)[number]>,
  reg: ReturnType<typeof regionize>,
) {
  const target = cs.target;
  snap(1, {
    note: `<b>Case ${idx + 1}: ${cs.label} · target "${target}".</b> A ${reg.R}×${reg.C} board. The question is the fewest clicks, and a click may paint <i>any</i> colour — so this is a shortest-sequence search, not a formula.`,
    focus: "tc",
  });
  snap(2, {
    note: `Collapse the board into <b>${reg.n}</b> connected same-colour region${reg.n === 1 ? "" : "s"}. A click repaints a whole region at once, so a single cell was never the unit of anything — the search runs on this graph, and <b>color</b> holds one entry per node.`,
    focus: "reg",
  });
  const f0 = floorOf(reg.color, target);
  snap(3, {
    note: `The <b>floor</b> is a function, not a number: one click paints one blob one colour, so it can retire at most <b>one colour</b> from whatever board it is handed. On the starting colouring, ${new Set(reg.color).size} colour${new Set(reg.color).size === 1 ? "" : "s"} are present${reg.color.includes(target) ? ` and one of them is already "${target}"` : ` and "${target}" is not among them`}, so no plan is shorter than <b>${f0}</b>.`,
    focus: "floor",
  });
  snap(4, {
    note: `A map of <b>refuted colourings</b>. Different click orders land on the same board, and re-proving that a board is hopeless is the single biggest waste in a search like this.`,
    focus: "dead",
  });
  return f0;
}

export function traceFree(caseIndex: number): DbgStep[] {
  const idx = Math.max(0, Math.min(CASES_FREE.length - 1, Math.trunc(caseIndex) - 1));
  const cs = CASES_FREE[idx]!;
  const reg = regionize(cs.grid),
    target = cs.target;
  const steps: DbgStep[] = [];
  const stack: SearchFrame[] = []; // live search() frames, bottom → top
  const live: Record<string, unknown> = {}; // vars of the outer bucketFill frame
  const fmt = (s: string[]) => s.map((c, i: number) => `${i + 1}·${c}`);
  const snap = (line: number, o: FreeSnapOpts = {}) => {
    const vars: Record<string, unknown> = {};
    for (const k in live) vars[k] = live[k];
    const structs: DbgStruct[] = [];
    if (line >= 2) structs.push({ label: "color", items: fmt(reg.color) });
    const frames: DbgFrame[] = [
      {
        title: `bucketFill(grid, "${target}")`,
        vars,
        changed: o.changed ?? [],
        structs,
        ret: o.ret,
      },
    ];
    stack.forEach((f) => {
      frames.push({
        title: `search(s, left = ${f.left})`,
        vars: { left: f.left, need: floorOf(f.s, target), ...(f.pick ? { c: f.pick } : {}) },
        changed: f.changed ?? [],
        structs: [{ label: "s", items: fmt(f.s), newest: !!f.fresh }],
        ret: f.ret,
      });
    });
    steps.push({
      line,
      note: o.note!,
      focus: o.focus,
      eval: o.eval,
      done: o.done,
      result: o.result,
      frames,
    });
  };

  const f0 = openFree(snap, idx, cs, reg);

  if (f0 === 0) {
    snap(17, {
      note: `Iterative deepening starts at the floor, and the floor is <b>0</b> — every region already holds "${target}".`,
      focus: "budget",
    });
    snap(7, {
      note: `<code class="inl">search(color, 0)</code> computes <b>need = 0</b> and the win test fires straight away. <b>Return 0.</b> Nothing is searched; the answer was in the colouring all along.`,
      focus: "win",
      eval: { expr: `need === 0`, val: true },
      done: true,
      result: "0",
      ret: { value: 0 },
    });
    return steps;
  }

  let answer = null;
  for (let budget = f0; budget <= reg.n + 1 && answer === null; budget++) {
    live["budget"] = budget;
    snap(17, {
      note:
        budget === f0
          ? `Try the floor first: can it be done in <b>${budget}</b> click${budget === 1 ? "" : "s"}? Deepening one level at a time is what makes the first success the <i>minimum</i> rather than merely a plan.`
          : `Depth <b>${budget - 1}</b> was refuted, so raise the budget to <b>${budget}</b> and search again. Re-searching the shallow part is cheap next to the risk of returning a non-minimal answer.`,
      focus: "budget",
      changed: ["budget"],
    });

    const dead = new Map<string, number>();
    const search = (s: string[], left: number): boolean => {
      const fr: SearchFrame = { s, left };
      stack.push(fr);
      const need = floorOf(s, target);
      if (need === 0) {
        snap(7, {
          note: `Every region is "${target}" — this branch is a finished board, so the whole chain of calls above it succeeds.`,
          focus: "win",
          eval: { expr: `need === 0`, val: true },
        });
        fr.ret = { value: true };
        snap(7, {
          note: `Unwind: <code class="inl">search</code> returns <b>true</b>.`,
          focus: "win",
        });
        stack.pop();
        return true;
      }
      snap(7, {
        note: `Not finished — <b>${new Set(s).size}</b> colour${new Set(s).size === 1 ? "" : "s"} still on the board, so the win test fails.`,
        focus: "win",
        eval: { expr: `need === 0`, val: false },
      });
      if (need > left) {
        snap(8, {
          note: `The floor says <b>${need}</b> more click${need === 1 ? "" : "s"} are needed and only <b>${left}</b> remain — abandon the branch <i>without</i> generating a single move. This prune is why an exponential search stays instant on boards this size.`,
          focus: "prune",
          eval: { expr: `need = ${need} > left = ${left}`, val: true },
        });
        fr.ret = { value: false };
        snap(8, { note: `Unwind: this branch cannot pay for itself.`, focus: "prune" });
        stack.pop();
        return false;
      }
      snap(8, {
        note: `Floor <b>${need}</b> fits inside the remaining budget <b>${left}</b>, so the branch is still worth exploring.`,
        focus: "prune",
        eval: { expr: `need = ${need} > left = ${left}`, val: false },
      });
      const key = s.join("");
      const stale = (dead.get(key) ?? -1) >= left;
      snap(9, {
        note: stale
          ? `This exact colouring was already refuted with at least <b>${left}</b> clicks in hand, so it cannot suddenly work now — drop it. Different click orders reach the same board, which is why the map earns its keep.`
          : `First time this colouring has been reached with <b>${left}</b> clicks in hand, so it still has to be tried.`,
        focus: "memo",
        eval: { expr: `dead.get(key) >= ${left}`, val: stale },
      });
      if (stale) {
        fr.ret = { value: false };
        stack.pop();
        return false;
      }
      dead.set(key, left);
      const blobs = blobsOf(reg, s);
      snap(11, {
        note: `The board is <b>${blobs.length}</b> blob${blobs.length === 1 ? "" : "s"} right now. <b>Every one of them is clickable</b> — that is the freedom #363 does not have, and it is why a greedy rule cannot decide the next move.`,
        focus: "blobs",
      });
      for (const blob of blobs) {
        const cur = s[blob[0]!];
        const options = new Set([target]);
        for (const i of blob) for (const v of reg.adj[i]!) if (s[v] !== cur) options.add(s[v]!);
        options.delete(cur!);
        snap(12, {
          note: `Blob {${blob.map((i) => i + 1).join(",")}} is "${cur}". Worth trying: ${[...options].map((c) => `"${c}"`).join(", ")} — every colour that touches it (each swallows a different set of neighbours) plus the target, which is the only useful colour that need not touch anything.`,
          focus: "cols",
        });
        for (const c of options) {
          const next = s.slice();
          for (const i of blob) next[i] = c;
          const gained = next.filter((v: string, i) => v === c && s[i] !== c).length - blob.length;
          fr.pick = `"${c}"`;
          fr.changed = ["c"];
          snap(13, {
            note: `Paint blob {${blob.map((i) => i + 1).join(",")}} ${swatch(c)}${gained > 0 ? ` — it merges with <b>${gained}</b> neighbouring region${gained === 1 ? "" : "s"} of that colour, for free` : ` — nothing merges, but it may set up the next click`}. Recurse with one click less.`,
            focus: "cols",
          });
          fr.changed = [];
          if (search(next, left - 1)) {
            fr.ret = { value: true };
            snap(13, {
              note: `The recursive call succeeded, so this click is part of a plan of length <b>${budget}</b>. Return <b>true</b> straight up the stack.`,
              focus: "cols",
            });
            stack.pop();
            return true;
          }
        }
        delete fr.pick;
      }
      snap(14, {
        note: `Every blob × every colour failed inside the budget — this position needs more clicks than it has. Return <b>false</b> and let the caller try its next colour.`,
        focus: "prune",
      });
      fr.ret = { value: false };
      stack.pop();
      return false;
    };

    if (search(reg.color, budget)) answer = budget;
    else
      snap(18, {
        note: `<code class="inl">search</code> came back false: <b>${budget}</b> click${budget === 1 ? "" : "s"} is provably not enough. Loop round and allow one more.`,
        focus: "budget",
        eval: { expr: `search(color, ${budget})`, val: false },
      });
  }

  snap(18, {
    note: `The first budget that succeeded is <b>${answer}</b>, and every smaller one was refuted — so <b>${answer}</b> is the minimum, not just a plan that works.`,
    focus: "budget",
    done: true,
    result: String(answer),
    ret: { value: answer },
  });
  return steps;
}

// ── STEP: drag one blob around — #329's model scaled up, line by line ───────
// The brute side traced. `blob` is the only thing that ever changes: it starts as
// one region and each click repaints all of it, so the frontier is whatever the
// blob currently touches. Four short cases; case 4 is the one where this loses.
export const CASES_SEED = [CASES[0], CASES[1], CASES[2], CASES[7]];

export const SRC_SEED = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">bucketFill</span>(grid, <span class="tok" data-t="tc">targetColor</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> { color, adj } = <span class="fn">collapseToRegions</span>(<span class="tok" data-t="reg">grid</span>);`,
  },
  {
    ln: 3,
    html: `  <span class="k">if</span> (<span class="tok" data-t="guard">color.every(c =&gt; c === targetColor)</span>) <span class="k">return</span> 0;`,
  },
  { ln: 4, html: `` },
  {
    ln: 5,
    html: `  <span class="k">const</span> <span class="tok" data-t="floor">floor</span> = (blob, cur) =&gt; {        <span class="cm">// clicks still owed</span>`,
  },
  {
    ln: 6,
    html: `    <span class="k">const</span> rest = <span class="fn">coloursOutside</span>(blob);   <span class="cm">// one click retires one</span>`,
  },
  {
    ln: 7,
    html: `    <span class="k">if</span> (rest.size === 0) <span class="k">return</span> cur === targetColor ? 0 : 1;`,
  },
  {
    ln: 8,
    html: `    <span class="k">return</span> rest.size + (rest.<span class="fn">has</span>(targetColor) ? 0 : 1);`,
  },
  { ln: 9, html: `  };` },
  { ln: 10, html: `` },
  {
    ln: 11,
    html: `  <span class="k">function</span> <span class="fn">grow</span>(blob, cur, left) {        <span class="cm">// ONE blob, forever</span>`,
  },
  {
    ln: 12,
    html: `    <span class="k">if</span> (<span class="tok" data-t="win">floor(blob, cur) === 0</span>) <span class="k">return</span> <span class="k">true</span>;`,
  },
  {
    ln: 13,
    html: `    <span class="k">if</span> (<span class="tok" data-t="prune">floor(blob, cur) &gt; left</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  {
    ln: 14,
    html: `    <span class="k">for</span> (<span class="k">const</span> c <span class="k">of</span> <span class="tok" data-t="touch">coloursTouching(blob)</span>)  <span class="cm">// one colour per click</span>`,
  },
  {
    ln: 15,
    html: `      <span class="k">if</span> (<span class="fn">grow</span>(<span class="tok" data-t="absorb">absorb(blob, c)</span>, c, left - 1)) <span class="k">return</span> <span class="k">true</span>;`,
  },
  { ln: 16, html: `    <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 17, html: `  }` },
  { ln: 18, html: `` },
  {
    ln: 19,
    html: `  <span class="k">for</span> (<span class="k">let</span> limit = 1; ; limit++)          <span class="cm">// shortest run first</span>`,
  },
  {
    ln: 20,
    html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="seed">seed</span> = 0; seed &lt; color.length; seed++)`,
  },
  {
    ln: 21,
    html: `      <span class="k">if</span> (<span class="fn">grow</span>(<span class="k">new</span> Set([seed]), color[seed], limit)) <span class="k">return</span> limit;`,
  },
  { ln: 22, html: `}` },
];

export function traceSeed(caseIndex: number): DbgStep[] {
  const idx = Math.max(0, Math.min(CASES_SEED.length - 1, Math.trunc(caseIndex) - 1));
  const cs = CASES_SEED[idx]!;
  const reg = regionize(cs.grid),
    target = cs.target;
  const steps: DbgStep[] = [];
  const stack: {
    blob: number[];
    cur: string;
    left: number;
    changed?: string[];
    fresh?: boolean;
    ret?: { value: unknown };
  }[] = [];
  const live: Record<string, unknown> = {};
  const fmt = (s: string[]) => s.map((c, i: number) => `${i + 1}·${c}`);
  const snap = (line: number, o: FreeSnapOpts = {}) => {
    const vars: Record<string, unknown> = {};
    for (const k in live) vars[k] = live[k];
    const structs: DbgStruct[] = [];
    if (line >= 2) structs.push({ label: "color", items: fmt(reg.color) });
    const frames: DbgFrame[] = [
      {
        title: `bucketFill(grid, "${target}")`,
        vars,
        changed: o.changed ?? [],
        structs,
        ret: o.ret,
      },
    ];
    stack.forEach((f) => {
      frames.push({
        title: `grow(blob, "${f.cur}", left = ${f.left})`,
        vars: { cur: `"${f.cur}"`, left: f.left },
        changed: f.changed ?? [],
        structs: [
          { label: "blob", items: f.blob.map((i: number) => `${i + 1}`), newest: !!f.fresh },
        ],
        ret: f.ret,
      });
    });
    steps.push({
      line,
      note: o.note!,
      focus: o.focus,
      eval: o.eval,
      done: o.done,
      result: o.result,
      frames,
    });
  };

  snap(1, {
    note: `<b>Case ${idx + 1}: ${cs.label} · target "${target}".</b> The one-seed strategy: pick a region and never click anywhere else, exactly what #329's flood fill does — only now we count the clicks.`,
    focus: "tc",
  });
  snap(2, {
    note: `Collapse to <b>${reg.n}</b> region${reg.n === 1 ? "" : "s"}, one entry each in <b>color</b>. Regions outside the blob never change colour under this strategy, so the original colouring stays valid for the whole run.`,
    focus: "reg",
  });

  const done = reg.color.every((c) => c === target);
  snap(3, {
    note: `Is every region already "${target}"?`,
    focus: "guard",
    eval: { expr: `color.every(c => c === "${target}")`, val: done },
  });
  if (done) {
    snap(3, {
      note: `Yes — the board is finished, so no click is needed. <b>Return 0.</b>`,
      focus: "guard",
      done: true,
      result: "0",
      ret: { value: 0 },
    });
    return steps;
  }

  const absorb = (blob: number[], c: string) => {
    const out = new Set<number>(blob),
      st = [...blob];
    while (st.length > 0) {
      const u = st.pop();
      for (const v of reg.adj[u!]!)
        if (!out.has(v) && reg.color[v] === c) {
          out.add(v);
          st.push(v);
        }
    }
    return [...out].toSorted((a, b) => a - b);
  };
  const owed = (blob: number[], cur: string) => {
    const rest = new Set<string>();
    for (let i = 0; i < reg.n; i++) if (!blob.includes(i)) rest.add(reg.color[i]!);
    if (rest.size === 0) return { need: cur === target ? 0 : 1, rest };
    return { need: rest.size + (rest.has(target) ? 0 : 1), rest };
  };

  snap(5, {
    note: `Before searching, a way to give up early. Every click absorbs <b>one</b> colour class from outside the blob, so the clicks still owed are at least the number of distinct colours out there — plus a final coat if "${target}" is not one of them.`,
    focus: "floor",
  });

  let answer = null;
  for (let limit = 1; limit <= reg.n + 1 && answer === null; limit++) {
    live["limit"] = limit;
    snap(19, {
      note:
        limit === 1
          ? `Try runs of length <b>1</b> first, then 2, then 3 — ascending, so the first seed that finishes gives the shortest run this strategy can manage.`
          : `No seed finished in <b>${limit - 1}</b>. Allow <b>${limit}</b> and start over from seed 1.`,
      changed: ["limit"],
    });

    for (let seed = 0; seed < reg.n && answer === null; seed++) {
      live["seed"] = seed + 1;
      snap(20, {
        note: `Seed on <b>region ${seed + 1}</b> ("${reg.color[seed]}"). Which region you start from matters — the blob can only ever eat outward from here, so a badly-placed seed pays for it every click.`,
        focus: "seed",
        changed: ["seed"],
      });

      const grow = (blob: number[], cur: string, left: number): boolean => {
        const fr: (typeof stack)[number] = { blob, cur, left };
        stack.push(fr);
        const { need, rest } = owed(blob, cur);
        if (need === 0) {
          snap(12, {
            note: `Nothing left outside the blob and it is already "${target}" — the board is finished, with <b>${left}</b> click${left === 1 ? "" : "s"} to spare.`,
            focus: "win",
            eval: { expr: `floor(blob, cur) === 0`, val: true },
          });
          fr.ret = { value: true };
          snap(12, {
            note: `Unwind: <code class="inl">grow</code> returns <b>true</b>.`,
            focus: "win",
          });
          stack.pop();
          return true;
        }
        snap(12, {
          note: `Not finished: ${rest.size > 0 ? `<b>${rest.size}</b> colour${rest.size === 1 ? "" : "s"} still outside the blob (${[...rest].map((c) => `"${c}"`).join(", ")})` : `the blob is the whole board but holds "${cur}", not "${target}"`}.`,
          focus: "win",
          eval: { expr: `floor(blob, cur) === 0`, val: false },
        });
        if (need > left) {
          snap(13, {
            note: `<b>${need}</b> click${need === 1 ? "" : "s"} still owed against <b>${left}</b> left — this run is refuted without trying anything. The floor is what keeps a 20-region board from costing millions of states.`,
            focus: "prune",
            eval: { expr: `floor = ${need} > left = ${left}`, val: true },
          });
          fr.ret = { value: false };
          stack.pop();
          return false;
        }
        snap(13, {
          note: `<b>${need}</b> owed, <b>${left}</b> left — still affordable, so keep going.`,
          focus: "prune",
          eval: { expr: `floor = ${need} > left = ${left}`, val: false },
        });
        const options = new Set([target]);
        for (const i of blob)
          for (const v of reg.adj[i]!) if (!blob.includes(v)) options.add(reg.color[v]!);
        options.delete(cur);
        snap(14, {
          note: `Colours worth trying from here: ${[...options].map((c) => `"${c}"`).join(", ")}. <b>One click can take only one of them</b> — the whole blob becomes that colour and eats every neighbour holding it, so the blob's frontier decides the branching.`,
          focus: "touch",
        });
        for (const c of options) {
          const grown = absorb(blob, c);
          fr.changed = ["cur"];
          snap(15, {
            note: `Repaint the <i>entire</i> blob ${swatch(c)}: it grows from <b>${blob.length}</b> to <b>${grown.length}</b> region${grown.length === 1 ? "" : "s"}. Note what this costs — the regions already inside the blob are recoloured too, and that is the price of never clicking anywhere else.`,
            focus: "absorb",
          });
          fr.changed = [];
          if (grow(grown, c, left - 1)) {
            fr.ret = { value: true };
            snap(15, {
              note: `The rest of the run worked out. Return <b>true</b>.`,
              focus: "absorb",
            });
            stack.pop();
            return true;
          }
        }
        snap(16, {
          note: `Every colour the blob touches led nowhere inside the budget. Return <b>false</b> and let the caller try its next colour.`,
        });
        fr.ret = { value: false };
        stack.pop();
        return false;
      };

      if (grow([seed], reg.color[seed]!, limit)) answer = limit;
    }
  }

  snap(21, {
    note: `Seed <b>${String(live["seed"])}</b> finished in <b>${answer}</b> click${answer === 1 ? "" : "s"}, and no shorter run existed for any seed. <b>Return ${answer}.</b> This is the best <i>one-seed</i> run — the free search may still beat it.`,
    done: true,
    result: String(answer),
    ret: { value: answer },
  });
  return steps;
}
