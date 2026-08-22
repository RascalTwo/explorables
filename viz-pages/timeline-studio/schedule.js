// The scheduler and the migration ladder, in ONE place that both the page and the
// backend import.
//
// They lived only in index.html, which meant the two questions that matter most
// about a plan — "what does it land on" and "is this document current" — could
// only be answered by a browser. Anything else editing a plan (see AGENTS.md)
// could write a perfectly valid document and had no way to ask what it cost. The
// alternative was a second copy on the server, and a second copy of THIS file is
// the worst possible place to have one: `sched()` is the part of the tool that
// must be exactly right, because a chart that computes the wrong date tells a
// room something confidently false.
//
// `cal` is a required argument here, not a defaulted one. index.html keeps its
// `let CAL` and wraps each of these to restore the default its ~50 call sites
// rely on; a module has no page to read a global off, and making the caller say
// which calendar it means is the honest shape anyway.
//
// Plain .js, no TypeScript syntax: Bun imports it from api.ts and the browser
// imports it from index.html, and the static export inlines relative imports
// (viz/inline.ts), so the published single-file page carries it too.

export const DAY = 864e5;

// HOW LONG A TASK OCCUPIES THE CALENDAR, asked rather than assumed.
//
// `end = start + dur` was written out at eight sites, which was correct only
// while a duration and a calendar span were the same quantity. They are about to
// stop being: a duration is an amount of WORK and a span is an amount of TIME,
// and the moment a plan has non-working days in it the second is longer than the
// first. Every site that needs the end of a task goes through here, so there is
// one place to teach and no site that can be forgotten.
//
// A WORKING CALENDAR answers one question — does work happen on this day — out
// of two facts. `workweek` is a 7-slot mask indexed the way `getUTCDay()` counts
// (0 = Sunday), and `holidays` is a flat list of dates nobody works whatever the
// weekday says. One predicate, so no caller has to know there were two.
//
// The all-on calendar is not a special case in the code, it is the configuration
// a plan has when it has said nothing: a document with no `workweek` reads as
// this, and every duration in it keeps exactly the meaning it already had.
export const CAL_ALL = { isWorking: () => true, perWeek: 7, allOn: true };

// Day numbers, not dates: everything downstream of `dayOf` counts from the plan's
// own origin, so the calendar has to as well. `dow0` is the weekday that day 0
// lands on, which is the only thing a mask needs to line up with real weekdays.
export function makeCal(mask, offDays, dow0) {
  const per = mask.reduce((a, b) => a + (b ? 1 : 0), 0);
  // A week with no working days makes spanOf walk forever — a hang, not an error.
  // The editor refuses to build one; this is the backstop for a hand-edited file.
  if (!per) return CAL_ALL;
  const off = new Set(offDays.map(d => Math.floor(d)));
  return {
    isWorking: d => {
      const n = Math.floor(d);
      return !!mask[(((dow0 + n) % 7) + 7) % 7] && !off.has(n);
    },
    perWeek: per,
    allOn: per === 7 && !off.size,
  };
}

// TODAY is the real current date, NOT week 0. Those were the same thing while
// `start` was hardcoded to the day the plan was written; once the start date is
// editable they come apart, and a chart that labels its own left edge "today"
// while the date says otherwise is worse than one with no marker at all.
// The document's own working calendar. Holidays are stored as DATES because that
// is what anyone types and what survives moving the plan's start; they convert to
// day numbers here, at the one boundary that needs it, like every other date.
export function calOf(d) {
  if (!d) return CAL_ALL;
  // DAY NUMBERS FROM *THIS* DOCUMENT'S ORIGIN. This reached for the open plan's
  // `dayOf` before it moved here, which converted another document's holidays
  // against the wrong start date — invisible while the two always matched, and
  // wrong the moment the comparison lens or an archived version scheduled
  // something that had moved its start.
  const origin = Date.parse(d.start + "T00:00:00Z");
  const dayOf = iso => (Date.parse(iso + "T00:00:00Z") - origin) / DAY;
  return makeCal(d.workweek || [1, 1, 1, 1, 1, 1, 1],
                 (d.holidays || []).map(iso => dayOf(iso)),
                 new Date(d.start + "T00:00:00Z").getUTCDay());
}

// WHAT DAY IS IT, in the one place both sides can read. The page needs this to
// draw its TODAY line and the scheduler needs it to refuse a forecast that
// begins in the past; two definitions of "what day is it" is exactly the kind of
// duplicate this module exists to stop.
//
// LOCAL calendar date, deliberately, then read as UTC like every other date
// here. `new Date().toISOString()` would roll over to tomorrow at 7pm Central,
// and a chart that advances its today line five hours early is wrong in the
// evening for everybody who looks at it in the evening.
export const todayISO = () => { const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10); };

// Today as a day number in THIS document's origin, which is the only unit
// `sched` speaks. Negative when the plan has not started yet, and that is the
// case that makes the floor below safe: a plan dated next month floors against a
// negative number, which `Math.max` discards, so it schedules exactly as it did.
export const todayOf = d => d && d.start
  ? (Date.parse(todayISO() + "T00:00:00Z") - Date.parse(d.start + "T00:00:00Z")) / DAY
  : -Infinity;

// HOW LONG A TASK OCCUPIES THE CALENDAR. `dur` is an amount of WORK, and this
// walks forward handing that work to the days that will take it. A day it cannot
// use costs time and consumes nothing, which is the whole difference between the
// two units.
//
// Fractions survive: a remainder lands INSIDE the final working day rather than
// rounding up to it, which is what keeps `dur: 0.5` meaning half a day of work
// instead of a whole one. The reference plan carries a fractional duration on
// purpose and this is the function that has to keep it honest.
export function spanOf(t, start, cal) {
  // A FACT BEATS A WALK. Once we know when a task really finished, the calendar
  // has no say in how long it took — the observed span is the answer, and `dur`
  // stays in the document as the estimate that turned out to be wrong, which is
  // worth keeping and is no longer what drives the bar.
  //
  // BOTH dates, not either. With only a start, the task is in progress and the
  // estimate is still the best thing anyone has, so the walk below runs from the
  // real start — which is the honest reading, not a special case.
  // STRICTLY LATER, because a finish at or before its start is not a fact about
  // anything. The inspector refuses that pair, but a hand-edited file or a
  // half-applied paste can hold one, and taking it at face value returns a
  // NEGATIVE span: the bar clamps to its 8px minimum while `endOf` lands before
  // the task began, so a dependent gets scheduled before its predecessor
  // started. Falling through to the estimate degrades to what an in-progress
  // task already does — we know when it began, we have nothing usable for the
  // end — and `auditSchedule` says so out loud rather than leaving it to be
  // noticed. Same posture as `colorsOf()` tolerating a pre-v2 string.
  if (t.actualStart != null && t.actualEnd != null && t.actualEnd > t.actualStart)
    return t.actualEnd - t.actualStart;
  let need = t.dur;
  if (!(need > 0)) return 0;
  let d = Math.floor(start), pos = start, guard = 0;
  while (need > 1e-9) {
    if (++guard > 1e5) break;                    // cannot happen: makeCal refuses an empty week
    if (cal.isWorking(d)) {
      const avail = (d + 1) - pos;               // working time left in this day
      if (avail >= need - 1e-9) return (pos + need) - start;
      need -= avail;
    }
    d += 1; pos = d;
  }
  return pos - start;
}

export function endOf(t, start, cal) { return start + spanOf(t, start, cal); }

// A task cannot BEGIN on a day nobody works — the bar's left edge would mark a
// date on which nothing happens. Note it moves a whole day and leaves a start
// that is already mid-working-day alone, so on an all-on calendar it is the
// identity and every existing plan schedules exactly as it did.
export function snapFwd(d, cal) {
  let x = Math.floor(d), guard = 0;
  if (cal.isWorking(x)) return d;
  while (!cal.isWorking(x)) { x += 1; if (++guard > 3660) return d; }
  return x;
}

// ---------------------------------------------------------------------------
// SCHEDULER.
//
// This is the load-bearing part of the tool and the only part that must be
// exactly right: a chart that computes the wrong date tells a room something
// confidently false, which is worse than having no chart. It began as a port of
// a Python model that produced the original static charts; that script is not in
// this repo and is no longer the reference. `selftest()` at the bottom schedules
// a hardcoded reference plan and shouts in the page if its answer drifts.
//
// Semantics worth preserving deliberately:
//  - Every lane is a SINGLE serial queue (capacity 1). That is the constraint
//    the whole plan turns on -- servers are built one at a time -- so it is not
//    a simplification, it is the model.
//  - Ties break by task order in the file (`est < best-1e-9`, strictly less), so
//    the array order in the JSON is meaningful. Do not sort tasks for display
//    before scheduling; render order is derived from the result instead.
// ---------------------------------------------------------------------------
// LANE CAPACITY: how many things a team can have in flight at once. Defaults to
// 1, which is what every lane was hardcoded to before — a team as a single serial
// queue. `cap: 2` on a lane means two tasks can run side by side, and the
// scheduler puts each new task in whichever of that lane's slots frees up first.
//
// This is the resource half of resource-constrained scheduling. Without it the
// only way to say "the server team could do two at a time" was to not model the
// team at all, which also throws away the queueing that makes the chart honest.
//
// `lanes` is a parameter rather than read off `doc` so the self-test can schedule
// its reference plan without the loaded document's capacities leaking into it.
//
// START CONSTRAINTS: an optional `notBefore` (week number, same units and same
// origin as everything else) is a floor on when a task may start — MS Project
// calls it Start No Earlier Than, the scheduling literature calls it a release
// date. It is an INPUT to the scheduler, exactly like a dependency, which is the
// whole reason it exists in this shape: a dragged x-coordinate would have to be
// stored, and a stored coordinate does not survive a reflow. A constraint does.
// Every reschedule honours it for free, and it participates in the critical
// path, in float and in milestone pass/fail without another line anywhere.
//
// It can only ever push a task LATER, never earlier, so it cannot make a plan
// unschedulable — that is why SNET is the benign member of the constraint
// family, and why the ALAP shift in renderInner() needs no changes: the shift is
// non-negative, so a bar can never render to the left of its own constraint.
//
// TODAY IS A FLOOR ON EVERY FORECAST, and it is the term that was missing for as
// long as this file has existed. Without it `sched` answers "earliest feasible
// start" from day 0 and day 0 never moves, so a task with no predecessors keeps
// claiming the plan's start date however long ago that was — nine of them were
// claiming three days of progress nobody had recorded, and every dependent
// inherited the head start, which made the finish date and every milestone chip
// optimistic by the same three days. The plan was not a forecast, it was a
// forecast AS OF the day it was written, presented as current.
//
// A forecast that has not started cannot have started in the past. That is the
// whole rule. Work that really did begin is seeded above and never reaches this
// loop, so a fact is never moved by the clock — only a guess is, and a guess
// about the past is not a guess, it is a lie the chart tells a room.
//
// A PARAMETER, defaulting to no floor at all, for the same reason `lanes` and
// `cal` are parameters: the self-test schedules hardcoded reference plans whose
// answers must not change because a day passed. A wall clock reaching into this
// function implicitly is how a test starts failing overnight for no reason.
export function sched(tasks, lanes, cal, today = -Infinity) {
  const by = Object.fromEntries(tasks.map(t => [t.id, t]));
  const capOf = l => Math.max(1, Math.floor((lanes.find(x => x.id === l) || {}).cap || 1));
  const ids = [...new Set(tasks.map(t => t.lane))];
  const start = {}, slots = Object.fromEntries(ids.map(l => [l, Array(capOf(l)).fill(0)]));
  // WHO is in each slot, not just until when. "That lane is busy" answers the
  // question one level short of useful: the next thing anyone asks is "busy with
  // WHAT", and the queue is the one bottleneck with no arrow on the chart
  // pointing at its cause. Tracked here because this is the only place it is
  // known — a lane's occupant leaves no trace in `start`.
  const owner = Object.fromEntries(ids.map(l => [l, Array(capOf(l)).fill(null)]));
  // Declared up here rather than beside the loop because the seeding pass below
  // also answers "why is it there", and answering for only the tasks the LOOP
  // placed is how a started task ends up explaining nothing at all.
  const why = {}, whyGap = {}, whyWho = {};
  // SEEDED, NOT SOLVED FOR. An actual start is a stronger input than every other
  // one here: `notBefore` is a floor and appears below as one term in a
  // `Math.max`, so a dependency or a busy lane can push a task past it. This
  // says EXACTLY HERE, and it overrides the dependency arithmetic and the lane
  // queue rather than joining them — there is nothing to solve for, so the loop
  // never considers these tasks at all.
  //
  // AND IT IS NOT SNAPPED. `snapFwd` exists because a forecast cannot begin on a
  // day nobody works; work that really did start on a Saturday did, and moving
  // it to the Monday would be inventing a date. Forecasts get snapped, facts do
  // not.
  //
  // The lane still fills up, because the team was still busy. `Math.max` rather
  // than assignment: two pinned tasks can share a slot the capacity says holds
  // one, and the second must not pull the lane's busy-until backwards.
  for (const x of tasks) {
    if (x.actualStart == null) continue;
    start[x.id] = x.actualStart;
    // A FACT IS ITS OWN REASON. These tasks never enter the loop, so without this
    // they have no entry at all and the inspector says nothing about them — which
    // is exactly what it did for the two dev servers the moment someone recorded
    // when they really started.
    why[x.id] = "actual";
    const k = slots[x.lane].indexOf(Math.min(...slots[x.lane]));
    const end_ = endOf(x, x.actualStart, cal);
    // Only when it actually extends the slot: `Math.max` can keep the earlier
    // value, and the occupant is then still whoever set that.
    if (end_ > slots[x.lane][k]) { slots[x.lane][k] = end_; owner[x.lane][k] = x.id; }
  }
  // WHY LIVES ON THE RESULT, NOT IN A GLOBAL, and that was not a tidiness choice.
  // `sched` runs for the live document, for an archived version behind the
  // comparison, and three times in the self-test against a hardcoded reference
  // plan; with a global, last writer wins — and selftest() runs at boot AFTER the
  // first render, so the first task anyone clicked was explained using the
  // reference plan's queue. Hanging it off the returned map makes the answer and
  // the schedule it describes the same object, impossible to get out of step.
  let guard = tasks.length + 1;
  while (Object.keys(start).length < tasks.length) {
    if (guard-- < 0) throw new Error("dependency cycle");
    let best = null;
    for (const x of tasks) {
      if (x.id in start) continue;
      if (x.deps.some(d => !(d in start))) continue;
      const dep = Math.max(0, ...x.deps.map(d => endOf(by[d], start[d], cal)));
      // SNAP INSIDE `est`, NOT AFTER THE WINNER IS PICKED. The loop's contract is
      // the earliest FEASIBLE start, and a non-working day is not feasible — so
      // choosing on the unsnapped number chooses on a date the task cannot have,
      // and lets a Saturday candidate beat a Sunday one on a difference that
      // disappears the moment both land on Monday.
      const lane = Math.min(...slots[x.lane]);
      const raw = Math.max(dep, x.notBefore || 0, lane, today);
      const est = snapFwd(raw, cal);
      if (!best || est < best[0] - 1e-9)
        best = [est, x, dep, lane, raw, owner[x.lane][slots[x.lane].indexOf(lane)]];
    }
    if (!best) throw new Error("dependency cycle");
    const [est, x, dep_, lane_, raw_, who_] = best;
    start[x.id] = est;
    // WHY IT LANDED THERE, recorded rather than reconstructed. Every input to the
    // decision is in hand at exactly this line and nowhere else afterwards, so
    // working it out again later would mean a second copy of the lane simulation
    // — the one thing `start` cannot be reverse-engineered into, because a queue
    // position leaves no trace in the document. Three values, once per task.
    //
    // Ties resolve to the FIRST of dependency / constraint / queue, because that
    // is the order a person asks: "what am I waiting on" before "is my team
    // busy". The per-dependency slack below shows a tie for what it is anyway —
    // more than one chip reading zero.
    //
    // `today` sorts LAST, below even the queue, because it is the weakest thing
    // that can hold a task: it names the absence of a cause rather than a cause.
    // A task whose dependency happens to end today is held by that dependency
    // and should say so — "today" is the answer only when nothing in the plan
    // wanted this task later and the calendar alone moved it. It is also the one
    // reason that would otherwise report as `free`, which is the same lie in a
    // smaller place: "nothing is holding me, and I began three days ago".
    why[x.id] = raw_ < 1e-9 ? "free"
      : dep_ >= raw_ - 1e-9 ? "deps"
      : (x.notBefore || 0) >= raw_ - 1e-9 ? "notBefore"
      : lane_ >= raw_ - 1e-9 ? "lane" : "today";
    // Snapping can push a task past the constraint that chose it — onto the next
    // working day — which is the case that otherwise reads as "nothing is holding
    // me and I am still late".
    if (est > raw_ + 1e-9) whyGap[x.id] = est - raw_;
    if (why[x.id] === "lane" && who_) whyWho[x.id] = who_;
    const k = slots[x.lane].indexOf(Math.min(...slots[x.lane]));
    slots[x.lane][k] = endOf(x, est, cal);
    owner[x.lane][k] = x.id;
  }
  // Non-enumerable so `start` stays a plain id -> day map to everything that
  // reads it, which is everything.
  Object.defineProperty(start, "why", { value: why });
  Object.defineProperty(start, "whyGap", { value: whyGap });
  Object.defineProperty(start, "whyWho", { value: whyWho });
  return start;
}

// `cal` for the same reason `lanes` is a parameter, and it was missed once: this
// took the DEFAULT calendar while the reference plan was being measured, so with a
// five-day plan loaded the all-on reference finished at 8 instead of 6 and the
// self-test failed on a plan that was correct. Every function the reference plan
// touches has to be told which calendar to use, or the check measures whatever
// document happens to be open.
export const finishOf = (tasks, st, cal) => Math.max(...tasks.map(t => endOf(t, st[t.id], cal)));

// Everything a task waits on, out to `max` hops. The direct `deps` list is a
// poor answer to "what has to happen before this can start" — a QA task can name
// three prerequisites and actually sit on top of nine, because each of those
// three drags its own chain along. Walk it iteratively rather than recursively:
// a cycle would otherwise blow the stack before sched() got the chance to
// report it properly.
//
// BREADTH-FIRST, ONE LEVEL PER TURN, and what comes back is a Map of task id ->
// HOP COUNT rather than a bare set. Two reasons, and the second is the load-
// bearing one:
//
//   1. A depth-first walk reaches a node by whatever path it happened to take
//      first, which is not the shortest one — so "stop at 2" would keep or drop
//      a task depending on the order `deps` was typed in. Level order gives every
//      task its MINIMUM hop count, the only reading of "two hops away" a person
//      will accept.
//   2. The arrows need to know how far out each END of an edge is, not merely
//      that both ends are somewhere in the chain. See drawArrows.
//
// The focus itself is in the map at 0. That is not a quirk to work around — it is
// what lets an edge INTO the focus come out at level 1.
export function hopsUp(tasks, tid, max = Infinity) {
  const by = Object.fromEntries(tasks.map(t => [t.id, t]));
  const seen = new Map([[tid, 0]]);
  let front = [tid];
  for (let d = 1; d <= max && front.length; d++) {
    const next = [];
    for (const x of front) for (const p of (by[x]?.deps || []))
      if (!seen.has(p)) { seen.set(p, d); next.push(p); }   // also what stops a cycle looping
    front = next;
  }
  return seen;
}

// ---- MIGRATIONS -----------------------------------------------------------
// A document format outlives every assumption you had when you wrote it, and the
// documents here are not all in one place: some are files on a disk, some are in
// a browser someone may not open for a year, some are in a file a colleague kept.
// So migration is a property of LOADING a document, wherever it came from — not
// a thing the browser store does.
//
// This is deliberately not Flyway. Flyway solves a shared mutable database with
// concurrent writers, partial application and rollback. This is one user's
// document. What that needs is a version integer and an ordered list of pure
// functions, applied in sequence.
//
// THE LOOP CHAINS, AND THAT IS THE POINT: a doc from ten versions ago walks every
// rung of the ladder in order and arrives current. Never renumber, never edit a
// shipped migration, only append — an old doc in someone's browser is depending
// on the exact ladder that existed when it was written.
export const SCHEMA = 4;

export const MIGRATIONS = [
  null,
  // v1 -> v2: `task.color` became a LIST. A task can touch two systems — a
  // shared server belongs to both applications on it — and the v1 workaround was
  // to invent a combined value, which does not scale past a couple of systems and
  // is invisible to a filter for either half of it.
  //
  // Widening rather than renaming: the field keeps its name and every v1 value
  // becomes a one-element list, so a plan that never needed this is unchanged in
  // meaning and every read site sees one shape. A null colour becomes [], which
  // is a real state ("no system"), not an error.
  //
  // What this CANNOT do is unpick a combined value — "Rates API & MOAuth" is one
  // opaque id, and nothing in the document says it means two others. That is an
  // edit, not a migration: tick both real colours on the affected tasks, then
  // delete the combined value, which now removes itself from a task's list
  // instead of replacing the whole thing.
  d => ({ ...d, tasks: (d.tasks || []).map(t => ({ ...t,
    color: t.color == null ? [] : Array.isArray(t.color) ? t.color : [t.color] })) }),

  // v2 -> v3: UNASSIGNED STOPS BEING A STATE. Every task points at a real value in
  // every channel; colour alone keeps `[]`, because a task can genuinely touch no
  // system and `[]` is the honest bottom of a LIST rather than a missing answer.
  //
  // The incoherence this ends: `border` was nullable AND had a value styled
  // "none" (two ways to say one thing), `fill` was nullable and silently DRAWN as
  // fills[0] while being counted as none of them, `shape` was nullable with an
  // explicit "—", and `lane` could not be null at all. Four channels, four rules.
  //
  // THE RULE HERE IS "PRESERVE APPEARANCE", NOT "ASSIGN THE FIRST VALUE", and the
  // difference is not academic. In every plan in this repo three tasks carry no
  // border and `borders[0]` is "dev" — assigning the first value would have grown
  // them a dotted rim they never had and moved dev's legend count from 10 to 13.
  // A migration that relabels data is worse than the incoherence it removes.
  //
  // A DEFAULT IS DESIGNATED ONLY WHERE ONE WAS ACTUALLY NEEDED — that is, only
  // where this migration had somewhere to put an unassigned task. A plan that
  // already answers every channel on every task has no "not applicable" value,
  // and inventing one would put a meaningless entry in its legend.
  d => {
    const out = { ...d, tasks: (d.tasks || []).map(t => ({ ...t })) };
    const defaults = { ...(out.defaults || {}) };
    const mint = (pre, list, extra) => { let n = 1, v;
      do { v = pre + n++; } while (list.some(x => x.id === v));
      return { id:v, label:"—", ...extra }; };
    const stray = (field, list) =>
      out.tasks.filter(t => t[field] == null || !list.some(x => x.id === t[field]));

    // LANES. Already total everywhere — a task with no lane has no row to sit in —
    // so this only catches a hand-edited file. No default is designated: "which
    // queue is this in" is not a question a plan can decline to answer.
    out.lanes = [...(out.lanes || [])];
    if (!out.lanes.length) out.lanes.push(mint("t", out.lanes, { label:"Everything", cap:1 }));
    for (const t of stray("lane", out.lanes)) t.lane = out.lanes[0].id;

    // BORDERS. A null border drew NO RIM, and a value styled "none" draws exactly
    // that — so the target is that value: reused if the plan has one, created if
    // it does not. This is the channel the "preserve appearance" rule was written
    // for.
    out.borders = [...(out.borders || [])];
    const strayB = stray("border", out.borders);
    if (strayB.length) {
      let na = out.borders.find(x => x.style === "none");
      if (!na) { na = mint("b", out.borders, { style:"none" }); out.borders.push(na); }
      for (const t of strayB) t.border = na.id;
      defaults.borders = na.id;
    }
    if (!out.borders.length) out.borders.push(mint("b", out.borders, { style:"none" }));

    // FILLS. A DIFFERENT RULE, because a null fill did not draw as nothing:
    // `fillDef` fell back to fills[0], so an unassigned task was DRAWN as the
    // first value while being COUNTED as none of them. That fallback is the
    // silent misinformation this rung exists to end, so the honest target is the
    // value it was already being drawn as — and no default is designated, because
    // "how sure are we about this estimate" always applies. A plan that wants a
    // not-applicable fill can add one and it becomes deletable-to like any other.
    out.fills = [...(out.fills || [])];
    if (!out.fills.length) out.fills.push(mint("f", out.fills, { label:"unset", pattern:"solid" }));
    for (const t of stray("fill", out.fills)) t.fill = out.fills[0].id;

    // SHAPES. The channel is opt-in and simply absent from every plan written
    // before it existed, where a null shape drew as "soft". One value styled soft
    // reproduces that for the whole plan — and at one value it draws no legend
    // group and no inspector control, so a plan that never wanted shapes still
    // looks and reads exactly as it did.
    out.shapes = [...(out.shapes || [])];
    const strayS = stray("shape", out.shapes);
    if (strayS.length) {
      let na = out.shapes.find(x => (x.shape || "soft") === "soft");
      if (!na) { na = mint("s", out.shapes, { shape:"soft" }); out.shapes.push(na); }
      for (const t of strayS) t.shape = na.id;
      defaults.shapes = na.id;
    }
    if (!out.shapes.length) out.shapes.push(mint("s", out.shapes, { shape:"soft" }));

    out.defaults = defaults;
    return out;
  },

  // v3 -> v4: THE BASE UNIT BECOMES DAYS. Multiply every duration and every start
  // constraint by seven and the plan is unchanged — LOSSLESSLY, which is the good
  // news about doing it this way round. Half-weeks were the finest thing the old
  // unit could express and 0.5 * 7 = 3.5, which is exact in binary (any n/2 is),
  // so no plan loses a hair of precision on the way through. Every existing plan
  // comes out MORE precise than it went in, and nudging the odd 3.5 to a whole 4
  // is an edit someone can make later, by hand, on purpose.
  //
  // WHAT IS NOT TOUCHED: `start` and every milestone `date` are ISO strings, so
  // they were never in the base unit. `sprint.weeks` stays weeks, because a
  // sprint IS a number of weeks — it converts at the one place that renders it.
  d => ({ ...d, tasks: (d.tasks || []).map(t => ({ ...t,
    dur: (t.dur || 0) * 7,
    ...(t.notBefore == null ? {} : { notBefore: t.notBefore * 7 }) })) }),
];

// Pure and parameterised so the self-test can drive it with a synthetic ladder.
// Testing the migrator matters more than testing any one migration: the
// migrations are trivial, the sequencing is what silently ruins data.
export function applyMigrations(d, ladder = MIGRATIONS, target = SCHEMA) {
  // An unstamped doc is v1, not v0. Every plan written before versioning existed
  // is structurally a v1 — treating them as v0 would demand a v0->v1 migration
  // that does nothing, which is a rung that exists only to be tripped over.
  let v = d.schemaVersion ?? 1;
  if (v > target) throw new Error(`this plan was written by a newer version (v${v} > v${target})`);
  while (v < target) {
    const step = ladder[v];
    if (!step) throw new Error(`no migration from v${v} — cannot upgrade this plan`);
    d = step(d);
    v++;
  }
  d.schemaVersion = target;
  return d;
}

// ---- THE WHOLE ANSWER FOR ONE DOCUMENT -------------------------------------
// What `/verdict` returns and what the chart's milestone chips say, from the same
// arithmetic — so an agent asking "what does this land on" cannot be told
// something the room is not being told.
//
// Migrated on the way in, exactly like every load path in the browser: a document
// that arrives at an older schema is answered for, not rejected.
export function verdict(raw) {
  const d = applyMigrations(structuredClone(raw));
  const cal = calOf(d);
  // The same floor the chart applies. An agent asking "what does this land on"
  // and the room reading the milestone chips have to get one answer, and a
  // wire that skipped the floor would hand the agent the stale, cheerful one.
  const st = sched(d.tasks, d.lanes, cal, todayOf(d));
  const origin = Date.parse(d.start + "T00:00:00Z");
  // THE DAY WORK STOPPED, not the exclusive boundary after it — the same reading
  // `fmtEnd` gives the chart. Reporting the boundary would put every finish one
  // day later than the chip beside it.
  const iso = n => new Date(origin + (Math.ceil(n - 1e-9) - 1) * DAY).toISOString().slice(0, 10);
  const dayOf = s => (Date.parse(s + "T00:00:00Z") - origin) / DAY;
  const msOf = t => t.ms || (d.milestones[0] || {}).id;

  const milestones = (d.milestones || []).map(m => {
    // A milestone is not met until every task assigned to it AND everything those
    // tasks wait on is done. Reporting only the assigned tasks would flatter it.
    const own = d.tasks.filter(t => msOf(t) === m.id);
    if (!own.length) return { id: m.id, label: m.label, date: m.date, tasks: 0, finish: null, met: null };
    const all = new Set(own.map(t => t.id));
    for (const t of own) for (const a of hopsUp(d.tasks, t.id).keys()) all.add(a);
    const by = Object.fromEntries(d.tasks.map(t => [t.id, t]));
    const f = Math.max(...[...all].map(id => by[id] ? endOf(by[id], st[id], cal) : 0));
    const due = dayOf(m.date);
    // TWO COUNTS, TWO NAMES. `tasks` is what the chart's chip says — the tasks
    // ASSIGNED to this milestone — and `waitsOn` is the closure the date is
    // actually computed over. Reporting the closure as "tasks" made this endpoint
    // disagree with the chip beside it (9 against 4) while both were right about
    // different things, which is the one failure this whole module exists to
    // avoid.
    return { id: m.id, label: m.label, date: m.date,
             tasks: own.length, waitsOn: all.size,
             finish: iso(f), met: f <= due + 1e-9, byDays: Math.round(f - due) };
  });
  return { tasks: d.tasks.length, start: d.start,
           finish: iso(finishOf(d.tasks, st, cal)), milestones };
}

// ---------------------------------------------------------------------------
// QUEUE ORDER IS A SCHEDULING INPUT, AND NOTHING WAS CHECKING IT.
//
// A lane is a serial queue and ties break by position in `tasks`, so the array
// order IS the order that team works in — `README.md` says so about the ↑/↓
// controls. What it could not say was WHICH row to move. This answers that.
//
// It was written because the real plan had a 32-day error in it that nobody
// could see: two 10-day F5 tasks with no dependents sat in front of the pair the
// entire QA chain was waiting on. The same mistake had been found once before,
// by hand, in a different lane. It hides because a lane grouped tidily by
// service is exactly what puts the wrong one first.
//
// IT SUGGESTS. IT NEVER APPLIES. That is not timidity, it is the measured
// finding: run to convergence on a real plan and the machine will bury a
// de-risking spike at position 21 to save two days on a task that gates nothing.
// The objective function knows finish dates. It does not know that a spike
// exists to answer a question EARLY, or that one milestone is a legal deadline
// and another is a preference. A human has to see the move before it happens.
//
// COST is O(lane²) schedules per lane. The closures below are hoisted out of
// that loop because they depend on dependencies and milestone assignment, which
// reordering cannot change — computing them inside made this ~40x slower for
// identical answers.
function msClosures(tasks, milestones) {
  const fallback = (milestones[0] || {}).id;
  const out = [];
  for (const m of milestones) {
    const own = tasks.filter(t => (t.ms || fallback) === m.id);
    if (!own.length) continue;
    const all = new Set(own.map(t => t.id));
    for (const t of own) for (const a of hopsUp(tasks, t.id).keys()) all.add(a);
    out.push({ id: m.id, label: m.label, ids: [...all] });
  }
  return out;
}

function scoreOf(tasks, lanes, cal, closures, today) {
  const st = sched(tasks, lanes, cal, today);
  const by = Object.fromEntries(tasks.map(t => [t.id, t]));
  const ms = {};
  for (const c of closures)
    ms[c.id] = Math.max(...c.ids.map(id => by[id] ? endOf(by[id], st[id], cal) : 0));
  return { finish: finishOf(tasks, st, cal), ms };
}

// Returns the BEST single move for each task that has one, sorted by the biggest
// improvement it makes, in days. Every entry is measured independently against
// the CURRENT order — applying one invalidates the rest, which is why the caller
// re-runs after each apply rather than working down the list.
export function suggestReorders(raw, opts = {}) {
  const d = applyMigrations(structuredClone(raw));
  const cal = calOf(d), lanes = d.lanes || [];
  const maxLane = opts.maxLane ?? 40;
  const closures = msClosures(d.tasks, d.milestones || []);
  // Measured against the plan the chart is showing, floor included. Scoring a
  // reorder without it prices a move by how much it would have helped on the
  // day the plan was written — and it flatters every suggestion, because work
  // the floor has already pinned to today cannot be pulled any further left.
  const today = todayOf(d);
  const base = scoreOf(d.tasks, lanes, cal, closures, today);
  const byId = Object.fromEntries(d.tasks.map(t => [t.id, t]));
  const round = n => Math.round(n * 1e6) / 1e6;
  const suggestions = [], skipped = [];

  for (const lane of lanes) {
    const slots = d.tasks.map((t, i) => (t.lane === lane.id ? i : -1)).filter(i => i >= 0);
    if (slots.length < 2) continue;
    // A guard, not a policy: the cost is quadratic and a lane this long is a
    // different problem. Reported rather than silently dropped — a suggester
    // that quietly skips half the plan reads as "nothing to improve".
    if (slots.length > maxLane) { skipped.push({ lane: lane.id, tasks: slots.length }); continue; }
    const ids = slots.map(i => d.tasks[i].id);
    for (let from = 0; from < ids.length; from++) {
      let best = null;
      for (let to = 0; to < ids.length; to++) {
        if (to === from) continue;
        const o = ids.slice();
        o.splice(to, 0, o.splice(from, 1)[0]);
        const tasks = d.tasks.slice();
        o.forEach((id, k) => { tasks[slots[k]] = byId[id]; });
        const s = scoreOf(tasks, lanes, cal, closures, today);
        const gains = { finish: round(base.finish - s.finish) };
        for (const c of closures) gains[c.id] = round(base.ms[c.id] - s.ms[c.id]);
        const gain = Math.max(...Object.values(gains));
        const cost = Math.min(...Object.values(gains));
        if (gain > 1e-9 && (!best || gain > best.gain)) {
          best = { lane: lane.id, id: ids[from], label: byId[ids[from]].label,
                   from, to, after: to > 0 ? o[to - 1] : null, gain, gains,
                   // A move can buy one milestone and cost another. Surfacing
                   // only the gain is how a suggester talks someone into a trade
                   // they would not have taken.
                   worsens: cost < -1e-9 };
        }
      }
      if (best) suggestions.push(best);
    }
  }
  suggestions.sort((a, b) => b.gain - a.gain);
  return { base: { finish: base.finish, ms: base.ms },
           suggestions: suggestions.slice(0, opts.limit ?? 20), skipped };
}

// ---------------------------------------------------------------------------
// WHICH TEAM GOES ON TOP. Lane order is the one thing on this chart with no rule
// at all: it is whatever order the lanes were typed in, and every plan here grew
// its lanes one meeting at a time.
//
// THE LAW: a lane sits ABOVE the lanes that wait on it, as far as the
// dependencies allow. Read top to bottom and the work flows downward.
//
// It cannot always be satisfied, and that is why this is a search rather than a
// topological sort. Lane graphs have cycles that task graphs cannot -- QA waits
// on a server AND a server build waits on QA passing, both true, both in the real
// plan -- so some arrows must point up. This minimises the WEIGHT of those: count
// every task-level dependency that crosses lanes, and order the lanes so the
// fewest of them run backwards.
//
// Measured on the plan it was written for: the typed-in order left 25 of 84
// crossing dependencies pointing up. Sorting by when work STARTS made it WORSE
// (34), by centre of mass worse (29), by when work ENDS better (18). This gets 7.
//
// TIES ARE BROKEN BY STAYING PUT. Four orders tied at the optimum on that plan,
// so the second key is total displacement from the order you already have: the
// button never shuffles a lane it had no reason to move, and running it twice
// changes nothing the second time.
export function laneOrder(raw) {
  const d = applyMigrations(structuredClone(raw));
  const lanes = (d.lanes || []).map(l => l.id);
  const by = Object.fromEntries(d.tasks.map(t => [t.id, t]));

  const w = new Map();
  for (const t of d.tasks) for (const dep of t.deps || []) {
    const a = by[dep] && by[dep].lane, b = t.lane;
    if (!a || !b || a === b) continue;
    const k = a + " " + b;
    w.set(k, (w.get(k) || 0) + 1);
  }
  const E = [...w].map(([k, n]) => { const [a, b] = k.split(" "); return { a, b, n }; });
  const total = E.reduce((s, e) => s + e.n, 0);
  const home = Object.fromEntries(lanes.map((l, i) => [l, i]));
  const cost = o => {
    const p = Object.fromEntries(o.map((l, i) => [l, i]));
    return E.reduce((s, e) => s + (p[e.a] > p[e.b] ? e.n : 0), 0);
  };
  const drift = o => o.reduce((s, l, i) => s + Math.abs(i - home[l]), 0);
  const better = (a, b) => (a.c !== b.c ? a.c < b.c : a.d < b.d);

  let best = { o: lanes.slice(), c: cost(lanes), d: 0 };
  // EXACT BELOW NINE LANES, which is every plan anyone has built with this and a
  // long way past it. 8! is 40320 orders costed against a handful of edges --
  // milliseconds -- and an exact answer needs no explaining. Above that, the same
  // insertion hill-climb `suggestReorders` uses, started from the current order,
  // so it stays deterministic and can never be worse than what you already had.
  if (lanes.length <= 8) {
    const walk = (rest, cur) => {
      if (!rest.length) {
        const cand = { o: cur, c: cost(cur), d: drift(cur) };
        if (better(cand, best)) best = cand;
        return;
      }
      for (let i = 0; i < rest.length; i++)
        walk(rest.slice(0, i).concat(rest.slice(i + 1)), cur.concat(rest[i]));
    };
    walk(lanes, []);
  } else {
    for (let pass = 0; pass < 8; pass++) {
      let moved = false;
      for (let from = 0; from < best.o.length; from++)
        for (let to = 0; to < best.o.length; to++) {
          if (from === to) continue;
          const o = best.o.slice();
          o.splice(to, 0, o.splice(from, 1)[0]);
          const cand = { o, c: cost(o), d: drift(o) };
          if (better(cand, best)) { best = cand; moved = true; }
        }
      if (!moved) break;
    }
  }
  return { order: best.o, backward: best.c, total,
           was: cost(lanes), changed: best.o.join() !== lanes.join() };
}
