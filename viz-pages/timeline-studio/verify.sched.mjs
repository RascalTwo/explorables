// SCHEDULER HARNESS — runs the REAL functions out of index.html, in node.
//
//   node verify.sched.mjs            (from this directory)
//
// It EXTRACTS the declarations by name from the page's module script and
// evaluates them; it does not copy them. A copy is a second implementation that
// passes while the real one rots, which is the failure mode this file exists to
// avoid — the scheduler is the one thing in this tool that must not break, and a
// green test measuring a stale duplicate is worse than no test.
//
// It is the FAST loop for anything in `sched()`, `spanOf()` and
// `auditSchedule()`. What it cannot see is the render layer, because there is no
// DOM here — and it cannot see a calendar leaking from the loaded document into
// a fixture either, because in here every calendar is whatever the caller passed.
// Both of those need `verify.interactions.ts` in a browser.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as S from "./schedule.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "index.html"), "utf8");

// The page has two <script>s and only one of them is code. Anchor on the module
// one rather than the first match, or the demo plan's JSON gets parsed as source.
const BODY = SRC.slice(SRC.indexOf('<script type="module">'));

// WHERE A TOP-LEVEL DECLARATION ENDS. A line-based guess is wrong here — these
// functions carry comment blocks, template literals with `${}` in them, and
// regexes — so this walks characters with just enough of a tokenizer to know
// when a brace is a brace. Depth back to zero and then a `;` (or the closing `}`
// of a function statement) is the end.
function endOfDecl(s, i, isFn) {
  let depth = 0;
  const tpl = [];                       // template-literal nesting, one slot per `${`
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    // The literal part of a template is checked FIRST, because in there a `//`
    // is two slashes and an apostrophe is an apostrophe. Only `${` and the
    // closing tick mean anything.
    if (tpl.length && depth === tpl[tpl.length - 1]) {
      if (c === "\\") { i += 2; continue; }
      if (c === "$" && n === "{") { depth++; i += 2; continue; }
      if (c === "`") { tpl.pop(); i++; continue; }
      i++; continue;
    }
    if (c === "/" && n === "/") { i = s.indexOf("\n", i); if (i < 0) return s.length; continue; }
    if (c === "/" && n === "*") { i = s.indexOf("*/", i) + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < s.length && s[i] !== c) i += s[i] === "\\" ? 2 : 1;
      i++; continue;
    }
    if (c === "`") { tpl.push(depth); i++; continue; }
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (tpl.length && depth === tpl[tpl.length - 1] && c === "}") { i++; continue; }
      if (depth === 0 && isFn && c === "}") return i + 1;
    } else if (c === ";" && depth === 0) return i + 1;
    i++;
  }
  throw new Error("unterminated declaration");
}

// Only column-0 matches count, because that is what "top-level" means in this
// file and a same-named local would otherwise win.
function declOf(name) {
  const re = new RegExp(`^(?:function|const|let)\\s+${name}\\b`, "m");
  const m = re.exec(BODY);
  if (!m) throw new Error(`index.html has no top-level \`${name}\` — has it been renamed?`);
  return BODY.slice(m.index, endOfDecl(BODY, m.index, m[0].startsWith("function")));
}

// `doc` is the loaded document and there is none here. Both `sched()` and
// `auditSchedule()` only reach for it as a DEFAULT argument, and every call in
// this file passes lanes explicitly — which is exactly why those parameters
// exist.
// WHAT MOVED OUT IS IMPORTED, NOT EXTRACTED. `4e25888` moved the scheduler into
// schedule.js and this harness kept looking for it in the page, so it threw on
// `CAL_ALL` before running a single check — green-by-never-running, which is the
// one failure worse than a red suite. Anything that is a real module export is
// now imported below and injected; extraction is only for what still lives ONLY
// in the page. The page's own wrappers are still extracted, so the `cal = CAL`
// defaults ~50 call sites rely on are still the ones under test.
const NAMES = [
  "CAL", "spanOf", "endOf", "snapFwd", "workDaysIn",
  // The `sched` wrapper defaults `today` to `todayD()`, so its chain has to
  // resolve even though every fixture call below opts out with `-Infinity`. A
  // fixture is a dated record with a known answer, not a forecast: floor one
  // against the real clock and the suite starts failing overnight, on nothing.
  "d0", "dayOf", "todayD",
  "sched", "finishOf", "auditSchedule",
  "REFERENCE", "REFERENCE_FINISH",
  "REFERENCE_WW_CAL", "REFERENCE_WW", "REFERENCE_WW_STARTS", "REFERENCE_WW_FINISH",
  "REFERENCE_HOL_CAL", "REFERENCE_HOL", "REFERENCE_HOL_SPAN",
  "REFERENCE_ACT_CAL", "REFERENCE_ACT", "REFERENCE_ACT_STARTS", "REFERENCE_ACT_FINISH",
  // The graph lens's layout. Pure arithmetic over tasks, so it belongs in the
  // fast loop — and the browser fixture is twelve tasks in a near-straight line,
  // which cannot tangle no matter how the ordering is broken.
  "COL_GAP", "depthsOf", "layoutOf", "countCrossings",
];
// `doc` is a real binding here rather than a stub: `layoutOf` reads `doc.lanes`
// and `doc.tasks` for its tie-breaks, so a test sets it before calling.
// The page imports these under `_`-prefixed names and wraps them; the wrappers
// are what NAMES extracts, so the originals have to be in scope under exactly
// those names for the wrappers to resolve.
const INJECT = {
  DAY: S.DAY, CAL_ALL: S.CAL_ALL, makeCal: S.makeCal, calOf: S.calOf,
  _spanOf: S.spanOf, _endOf: S.endOf, _snapFwd: S.snapFwd,
  _sched: S.sched, _finishOf: S.finishOf, _hopsUp: S.hopsUp,
  todayISO: S.todayISO,
};
const src = "let doc = null; const setDoc = d => { doc = d; };\n" + NAMES.map(declOf).join("\n\n")
  + `\nreturn { ${NAMES.join(", ")}, CAL_ALL, makeCal, setDoc };`;
const M = new Function(...Object.keys(INJECT), src)(...Object.values(INJECT));

// ---------------------------------------------------------------------------
let fails = 0, checks = 0;
const ok = (cond, what) => { checks++; if (!cond) { fails++; console.log("  FAIL  " + what); } };
const near = (got, want, what) =>
  ok(Math.abs(got - want) < 1e-9, `${what}: got ${got}, expected ${want}`);
const silent = (bad, what) =>
  ok(bad.length === 0, `${what}: audit said ${JSON.stringify(bad)}`);
const group = name => console.log("• " + name);

// ---- the fixtures the page already asserts on every load -------------------
// Duplicated here on purpose: the page's selftest() runs in a browser, and this
// is the loop you can run in a second. Same fixtures, same expected numbers,
// pulled from the same source.
group("REFERENCE — serial lanes, gating, tie-break, a fraction, a losing pin");
{
  const st = M.sched(M.REFERENCE, [], M.CAL_ALL, -Infinity);
  near(M.finishOf(M.REFERENCE, st, M.CAL_ALL), M.REFERENCE_FINISH, "finish");
  silent(M.auditSchedule(M.REFERENCE, st, [], M.CAL_ALL), "REFERENCE");
}

group("REFERENCE_WW — a five-day week, weekends inside tasks, a snap tie-break");
{
  const st = M.sched(M.REFERENCE_WW, [], M.REFERENCE_WW_CAL, -Infinity);
  for (const [id, want] of Object.entries(M.REFERENCE_WW_STARTS)) near(st[id], want, `${id} starts`);
  near(M.finishOf(M.REFERENCE_WW, st, M.REFERENCE_WW_CAL), M.REFERENCE_WW_FINISH, "finish");
  silent(M.auditSchedule(M.REFERENCE_WW, st, [], M.REFERENCE_WW_CAL), "REFERENCE_WW");
}

group("REFERENCE_HOL — a day off on a working weekday");
near(M.spanOf(M.REFERENCE_HOL[0], 0, M.REFERENCE_HOL_CAL), M.REFERENCE_HOL_SPAN, "span");

group("REFERENCE_ACT — a fact beats the calendar, and the audit stays quiet");
{
  const A = M.REFERENCE_ACT, S = M.REFERENCE_ACT_STARTS, C = M.REFERENCE_ACT_CAL;
  const by = Object.fromEntries(A.map(t => [t.id, t]));
  // The scheduler must ARRIVE at the hand-written record, not near it.
  const st = M.sched(A, [], C, -Infinity);
  for (const [id, want] of Object.entries(S)) near(st[id], want, `${id} starts`);
  near(M.finishOf(A, st, C), M.REFERENCE_ACT_FINISH, "finish");
  silent(M.auditSchedule(A, st, [], C), "REFERENCE_ACT");

  // AND THE FIXTURE REALLY IS ILLEGAL, which is the half that stops the silence
  // above being an assertion that cannot fail. One probe per rule.
  const bare = A.map(({ actualStart, actualEnd, ...t }) => t);
  const loud = M.auditSchedule(bare, S, [], C);
  for (const [rule, re] of [["dependency", /waits on/], ["non-working day", /not a working day/]])
    ok(loud.some(m => re.test(m)), `without the actuals the audit should still catch ${rule}: ${JSON.stringify(loud)}`);
  // The other two rules cannot be shown that way, because a span stripped back
  // to `dur` holds `dur` working days by construction — they only exist once
  // `spanOf` reads an actual end. So they are shown against the real fixture.
  for (const id of ["a2", "a4", "a5"])
    ok(Math.abs(M.workDaysIn(S[id], M.spanOf(by[id], S[id], C), C) - by[id].dur) > 1e-6,
       `${id}'s observed span should NOT hold its ${by[id].dur}-day estimate`);
  ok(S.a6 < M.endOf(by.a5, S.a5, C) - 1e-9 && by.a5.lane === by.a6.lane,
     "a5 and a6 should overlap in a lane the capacity says holds one");
  // The branch itself: three calendar days, not the four the estimate walks to.
  near(M.spanOf(by.a4, S.a4, C), 3, "a4's observed span");
  near(M.spanOf(bare.find(t => t.id === "a4"), S.a4, C), 4, "a4's ESTIMATED span, for contrast");
}

// ---- the floor ------------------------------------------------------------
// `today` is passed as a literal, never read off the clock, so this fixture has
// one answer forever. That is the whole reason `sched` takes it as an argument.
group("today floors a forecast, and never touches a fact");
{
  const T = [
    { id: "never", lane: "L", dur: 2, deps: [] },                  // nobody started it
    { id: "began", lane: "M", dur: 2, deps: [], actualStart: 0 },  // really began at day 0
    { id: "after", lane: "N", dur: 1, deps: ["began"] },           // waits on something past
  ];
  const st = S.sched(T, [], S.CAL_ALL, 5);
  near(st.never, 5, "an unstarted task cannot claim to have begun three days ago");
  ok(st.why.never === "today", `and it says why rather than "nothing": got ${st.why.never}`);
  near(st.began, 0, "a recorded start is a fact, and a fact is not moved by the clock");
  ok(st.why.began === "actual", `a fact stays its own reason: got ${st.why.began}`);
  near(st.after, 5, "a dependent of work that ended in the past lands on today, not behind it");

  // THE FALSIFIER, and the case that makes the floor safe rather than merely
  // stricter: on a plan that has not started yet `today` is NEGATIVE, and a
  // negative floor must change nothing at all. If this drifts, every plan dated
  // next month quietly reschedules against a day it has never reached.
  const soon = S.sched(T, [], S.CAL_ALL, -3);
  near(soon.never, 0, "a plan dated in the future schedules exactly as it always did");
  ok(soon.why.never === "free", `and keeps the reason it had: got ${soon.why.never}`);
}

group("a hand-edited file whose finish precedes its start");
{
  const C = M.REFERENCE_ACT_CAL;
  // Nothing in the UI can write this pair; a text editor can. Taking it at face
  // value returns a negative span, which puts a task's end before its own start
  // and lets a dependent be scheduled before its predecessor began.
  const bad = { id: "x1", lane: "X", dur: 3, deps: [], actualStart: 7, actualEnd: 2 };
  const good = { id: "x2", lane: "X", dur: 3, deps: [] };
  near(M.spanOf(bad, 7, C), M.spanOf(good, 7, C), "a reversed pair falls back to the estimate");
  ok(M.endOf(bad, 7, C) > 7, `endOf must not land before the start, got ${M.endOf(bad, 7, C)}`);
  // And it is REPORTED. This is the one check that is not skipped for work that
  // has happened, because it is a question about the file rather than the plan.
  const said = M.auditSchedule([bad], { x1: 7 }, [], C);
  ok(said.some(m => /finished 2 but started 7/.test(m)),
     `the audit should name an impossible pair of dates, said ${JSON.stringify(said)}`);
  // The equal case is the same non-fact and takes the same path.
  near(M.spanOf({ ...bad, actualEnd: 7 }, 7, C), M.spanOf(good, 7, C), "an instantaneous pair too");
}

group("the graph layout untangles a deliberately tangled plan");
{
  // SIX COLUMNS OF SIX, wired so the obvious ordering is the worst one: every
  // task in a column depends on the one in the REVERSED position of the previous
  // column, so declaration order guarantees a full crossing bundle at every step.
  // Plus a long edge from the first column to the last, which is the case the
  // dummy nodes exist for — nothing in the four columns between knows it is there
  // unless it is broken into pieces.
  const W = 6, D = 6, tasks = [];
  for (let d = 0; d < D; d++)
    for (let i = 0; i < W; i++)
      tasks.push({ id: `c${d}r${i}`, lane: "L", dur: 1,
                   deps: d === 0 ? [] : [`c${d - 1}r${W - 1 - i}`] });
  for (let i = 0; i < W; i++) tasks[i].deps = [];
  tasks[tasks.length - 1].deps = [...tasks[tasks.length - 1].deps, "c0r0"];
  M.setDoc({ lanes: [{ id: "L" }], tasks });

  const edgesOf = ts => ts.flatMap(t => (t.deps || []).map(d => ({ data: { source: d, target: t.id } })));
  const edges = edgesOf(tasks);

  // The naive layout this replaced: column by depth, declaration order down each
  // column, nothing reordered and long edges invisible.
  const depth = M.depthsOf(tasks);
  const naive = {}, seen = {};
  for (const t of tasks) {
    const d = depth[t.id];
    seen[d] = (seen[d] || 0);
    naive[t.id] = { x: d * M.COL_GAP, y: seen[d]++ * 62 };
  }
  const before = M.countCrossings(edges, naive);
  const after = M.countCrossings(edges, M.layoutOf(tasks, "").pos);
  ok(before > 30, `the fixture should be genuinely tangled to begin with, got ${before}`);
  ok(after * 4 < before, `the layout should untangle it: ${before} crossings -> ${after}`);
  console.log(`    ${before} crossings laid out naively, ${after} after ordering`);
  // And the long edge really is broken up, which is the mechanism under test.
  const out = M.layoutOf(tasks, "");
  const long = out.chains["c0r0>" + tasks[tasks.length - 1].id];
  ok(long && long.length > 2, `a ${D - 1}-column edge should be routed through bends, got ${JSON.stringify(long)}`);
  // AND THE BENDS LINE UP. Crossing counts say nothing about this — the ordering
  // can be perfect while the coordinate stage leaves a long edge as a staircase —
  // so the thing that stage exists for is asserted directly: a chain of bends all
  // pulling to the same height is what turns five diagonals into one straight
  // line. Half a row of drift is the tolerance; a staircase is several.
  if (long && long.length > 2) {
    const ys = long.slice(1, -1).map(id => out.pos[id].y);
    const spread = Math.max(...ys) - Math.min(...ys);
    ok(spread < 31, `a routed edge should come out straight, its bends span ${Math.round(spread)}px`);
  }
  M.setDoc(null);
}

// ---- suggestReorders: the queue-order checker -------------------------------
// A LOCAL FIXTURE, not one lifted from the page, because this function lives only
// in schedule.js and is imported here rather than extracted. Two lanes: `T` is
// serial and holds a task nothing waits on (`idle`) in front of one that gates
// the other lane (`gate`). That is the exact shape that cost the real plan 32
// days, shrunk to something you can check by hand.
const ORDER_DOC = {
  schemaVersion: 4, title: "order", start: "2026-01-05",
  workweek: [1, 1, 1, 1, 1, 1, 1], holidays: [],
  lanes: [{ id: "T" }, { id: "U" }],
  colors: [{ id: "c", label: "c", color: "#fff" }],
  borders: [{ id: "b", label: "b", style: "none" }],
  fills: [{ id: "f", label: "f", pattern: "solid" }],
  shapes: [{ id: "s", label: "s", shape: "soft" }],
  milestones: [{ id: "m", label: "m", date: "2026-01-10" }],
  tasks: [
    { id: "idle", lane: "T", dur: 5, deps: [], ms: "m", label: "idle", color: ["c"], border: "b", fill: "f", shape: "s" },
    { id: "gate", lane: "T", dur: 5, deps: [], ms: "m", label: "gate", color: ["c"], border: "b", fill: "f", shape: "s" },
    { id: "waiter", lane: "U", dur: 1, deps: ["gate"], ms: "m", label: "waiter", color: ["c"], border: "b", fill: "f", shape: "s" },
  ],
};
const reordered = (doc, lane, from, to) => {
  const slots = doc.tasks.map((t, i) => (t.lane === lane ? i : -1)).filter(i => i >= 0);
  const ids = slots.map(i => doc.tasks[i].id);
  ids.splice(to, 0, ids.splice(from, 1)[0]);
  const by = Object.fromEntries(doc.tasks.map(t => [t.id, t]));
  const tasks = doc.tasks.slice();
  ids.forEach((id, k) => { tasks[slots[k]] = by[id]; });
  return { ...doc, tasks };
};
// THE SAME FLOOR `suggestReorders` SCORES WITH. This is the falsifier for the
// promised-vs-delivered check, so it has to be the identical computation —
// measuring an unfloored schedule against a floored promise compares two
// different plans and the agreement it reports would be a coincidence.
const finishDay = doc => {
  const cal = S.calOf(doc);
  const st = S.sched(doc.tasks, doc.lanes, cal, S.todayOf(doc));
  return S.finishOf(doc.tasks, st, cal);
};

group("suggestReorders — finds the idle-task-in-front-of-a-gate shape");
{
  const r = S.suggestReorders(ORDER_DOC);
  const top = r.suggestions[0];
  ok(!!top, "it should find at least one move");
  ok(top && top.lane === "T" && top.id === "idle",
     `the move should be idle out of the front of T, got ${top && top.lane + "/" + top.id}`);

  // THE FALSIFIER, and the only check here that really matters: a suggester that
  // reports a number it cannot deliver is worse than no suggester. Apply the move
  // it named and the plan must actually improve by exactly what it promised.
  const after = reordered(ORDER_DOC, top.lane, top.from, top.to);
  near(finishDay(ORDER_DOC) - finishDay(after), top.gains.finish,
       "promised finish gain vs the gain actually delivered by applying it");
  ok(top.gains.finish > 0, `the fixture should be genuinely improvable, got ${top.gains.finish}`);
  console.log(`    promised ${top.gain}d, delivered ${finishDay(ORDER_DOC) - finishDay(after)}d`);
}

group("suggestReorders — silent on a plan already in the right order");
{
  const best = reordered(ORDER_DOC, "T", 0, 1);          // gate first, idle behind
  const r = S.suggestReorders(best);
  ok(r.suggestions.length === 0,
     `an optimal queue should yield nothing, got ${JSON.stringify(r.suggestions.map(x => x.id))}`);
}

group("suggestReorders — surfaces a move that helps a MILESTONE but not the finish");
{
  // `late` is assigned to no milestone and finishes last either way, so the plan
  // finish cannot move; only the milestone can. A suggester ranking on finish
  // alone would report nothing here — which is exactly how the real plan's
  // 17-day CAB move nearly went unseen.
  const doc = structuredClone(ORDER_DOC);
  doc.milestones.push({ id: "z", label: "z", date: "2026-03-01" });
  // ITS OWN LANE, and that is the point of the fixture rather than an accident:
  // parked in `U` it queues behind `waiter`, so reordering `T` moves it too and
  // the finish changes — which is a different test from the one intended. The
  // finish has to be genuinely immovable for "milestone only" to mean anything.
  doc.lanes.push({ id: "V" });
  doc.tasks.push({ id: "late", lane: "V", dur: 40, deps: [], ms: "z", label: "late",
                   color: ["c"], border: "b", fill: "f", shape: "s" });
  const r = S.suggestReorders(doc);
  const top = r.suggestions[0];
  ok(!!top, "it should still find the move");
  ok(top && top.gains.finish === 0 && top.gains.m > 0,
     `finish should not move while milestone m does, got ${JSON.stringify(top && top.gains)}`);
}

group("suggestReorders — a lane past the guard is reported, not silently dropped");
{
  const doc = structuredClone(ORDER_DOC);
  const r = S.suggestReorders(doc, { maxLane: 1 });
  ok(r.skipped.some(x => x.lane === "T"),
     `lane T is over the cap and should be named in skipped, got ${JSON.stringify(r.skipped)}`);
  ok(r.suggestions.length === 0, "and nothing should be suggested from a skipped lane");
}

// ---- laneOrder: which team goes on top -------------------------------------
const LANE_TASK = (id, lane, deps) => ({ id, lane, dur: 1, deps, label: id,
  color: ["c"], border: "b", fill: "f", shape: "s", ms: "m" });
const LANE_DOC = (laneIds, tasks) => ({
  schemaVersion: 4, title: "lanes", start: "2026-01-05",
  workweek: [1, 1, 1, 1, 1, 1, 1], holidays: [],
  lanes: laneIds.map(id => ({ id })),
  colors: [{ id: "c", label: "c", color: "#fff" }],
  borders: [{ id: "b", label: "b", style: "none" }],
  fills: [{ id: "f", label: "f", pattern: "solid" }],
  shapes: [{ id: "s", label: "s", shape: "soft" }],
  milestones: [{ id: "m", label: "m", date: "2026-03-01" }],
  tasks,
});
// THE ORACLE. laneOrder searches; this enumerates. For a fixture this small the
// two must agree exactly, and if the search is ever replaced by something
// cleverer this is what says whether it still finds the floor.
const bruteLaneCost = doc => {
  const by = Object.fromEntries(doc.tasks.map(t => [t.id, t]));
  const w = new Map();
  for (const t of doc.tasks) for (const d of t.deps) {
    const a = by[d].lane, b = t.lane;
    if (a !== b) w.set(a + " " + b, (w.get(a + " " + b) || 0) + 1);
  }
  const E = [...w].map(([k, n]) => { const [a, b] = k.split(" "); return { a, b, n }; });
  const ids = doc.lanes.map(l => l.id);
  let best = Infinity;
  const walk = (rest, cur) => {
    if (!rest.length) {
      const p = Object.fromEntries(cur.map((l, i) => [l, i]));
      best = Math.min(best, E.reduce((s, e) => s + (p[e.a] > p[e.b] ? e.n : 0), 0));
      return;
    }
    for (let i = 0; i < rest.length; i++) walk(rest.slice(0, i).concat(rest.slice(i + 1)), cur.concat(rest[i]));
  };
  walk(ids, []);
  return best;
};

group("laneOrder — a clean flow sorts upstream to the top, and no arrow points up");
{
  // Deliberately typed in backwards: C, B, A for a flow A -> B -> C.
  const doc = LANE_DOC(["C", "B", "A"], [
    LANE_TASK("a1", "A", []), LANE_TASK("b1", "B", ["a1"]), LANE_TASK("c1", "C", ["b1"]),
  ]);
  const r = S.laneOrder(doc);
  ok(r.order.join() === "A,B,C", `expected A,B,C got ${r.order.join()}`);
  near(r.backward, 0, "a graph with no cycle should need no backward arrow");
  ok(r.was > 0, `the fixture should start wrong, it started at ${r.was}`);
}

group("laneOrder — a cycle cannot reach zero, so it minimises instead of throwing");
{
  // A -> B and B -> A, both real. One of them must point up whatever you do.
  const doc = LANE_DOC(["A", "B"], [
    LANE_TASK("a1", "A", []), LANE_TASK("b1", "B", ["a1"]),
    LANE_TASK("a2", "A", ["b1"]),
  ]);
  const r = S.laneOrder(doc);
  ok(r.backward >= 1, "a two-lane cycle must leave at least one arrow pointing up");
  near(r.backward, bruteLaneCost(doc), "search vs brute force on a cyclic graph");
}

group("laneOrder — agrees with brute force on a tangled six-lane graph");
{
  const doc = LANE_DOC(["F", "E", "D", "C", "B", "A"], [
    LANE_TASK("a1", "A", []),            LANE_TASK("b1", "B", ["a1"]),
    LANE_TASK("c1", "C", ["b1", "a1"]),  LANE_TASK("d1", "D", ["c1"]),
    LANE_TASK("e1", "E", ["d1", "b1"]),  LANE_TASK("f1", "F", ["e1", "c1"]),
    LANE_TASK("b2", "B", ["f1"]),        // the back edge that makes it cyclic
    LANE_TASK("c2", "C", ["e1"]),
  ]);
  const r = S.laneOrder(doc);
  near(r.backward, bruteLaneCost(doc), "search vs brute force on six tangled lanes");
  ok(r.backward < r.was, `it should improve on the typed order (${r.was} -> ${r.backward})`);
  console.log(`    six lanes: ${r.was} backward -> ${r.backward} (floor ${bruteLaneCost(doc)})`);
}

group("laneOrder — idempotent, and ties are broken by staying put");
{
  const doc = LANE_DOC(["C", "B", "A"], [
    LANE_TASK("a1", "A", []), LANE_TASK("b1", "B", ["a1"]), LANE_TASK("c1", "C", ["b1"]),
  ]);
  const once = S.laneOrder(doc);
  const settled = { ...doc, lanes: once.order.map(id => ({ id })) };
  const twice = S.laneOrder(settled);
  ok(!twice.changed, `running it on its own output should change nothing, got ${twice.order.join()}`);

  // Two lanes with NOTHING between them must not be shuffled: every order costs
  // the same, so the displacement tie-break has to be what decides, or the button
  // reshuffles unrelated teams every time it is pressed.
  const loose = LANE_DOC(["X", "Y"], [LANE_TASK("x1", "X", []), LANE_TASK("y1", "Y", [])]);
  const lr = S.laneOrder(loose);
  ok(!lr.changed && lr.order.join() === "X,Y",
     `unconnected lanes should stay put, got ${lr.order.join()} changed=${lr.changed}`);
  near(lr.total, 0, "no dependency crosses a lane here");
}

// ---------------------------------------------------------------------------
console.log(fails ? `\n${fails} of ${checks} checks FAILED` : `\nok — ${checks} checks`);
process.exit(fails ? 1 : 0);
