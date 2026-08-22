// EXECUTABLE DOCUMENTATION — the recipes an agent follows to change a plan.
//
// These are not examples of code that works. They are code that is RUN: the
// interaction suite forks a scratch plan on every verify run, applies each recipe
// to it, saves through the real `/save`, reloads it from disk and checks the
// result. A recipe that stops working fails the build.
//
// AGENTS.md points HERE rather than copying the code out, and that is the whole
// design: a second copy in prose is the thing that rots, and no file format fixes
// that — a stale OpenAPI document passes CI just as happily as a stale paragraph.
// The only documentation that cannot drift is documentation that runs.
//
// Written against the DEMO fixture's ids — `lease`, `permits`, `plumbing`,
// `health` — because that plan ships inside index.html, so it is the one example
// every reader already has and no private client data appears here.

/** A day number for an ISO date, in the plan's own coordinates. Every day-number
 *  field (`notBefore`, `actualStart`, `actualEnd`) counts from `doc.start`. */
export const day = (doc: any, iso: string) =>
  (Date.parse(iso + "T00:00:00Z") - Date.parse(doc.start + "T00:00:00Z")) / 864e5;

export type Recipe = {
  /** What a person would say in the room. */
  name: string;
  /** The edit. Mutates the document in place; the caller saves it. */
  run: (doc: any) => void;
  /** Read back from disk after the save. Returns an error string, or null. */
  check: (doc: any) => string | null;
};

export const RECIPES: Recipe[] = [
  {
    name: `add a dependency — "the health inspection can't happen until the plumbing is in"`,
    run: doc => { doc.tasks.find((t: any) => t.id === "health").deps.push("plumbing"); },
    check: doc => doc.tasks.find((t: any) => t.id === "health").deps.includes("plumbing")
      ? null : "the dependency did not survive the save",
  },
  {
    name: `change a duration — "that'll take three weeks, not two"`,
    // DAYS. `dur` is not weeks, and has not been since schema 4.
    run: doc => { doc.tasks.find((t: any) => t.id === "plumbing").dur = 21; },
    check: doc => doc.tasks.find((t: any) => t.id === "plumbing").dur === 21
      ? null : "the duration did not survive the save",
  },
  {
    name: "add a task",
    // Every channel is REQUIRED and every value is an id from that channel's list,
    // not free text. `/save` rejects a dangling reference rather than inventing it.
    run: doc => {
      doc.tasks.push({ id: "signage", label: "Shopfront signage", lane: "BUILD",
        border: "work", fill: "estimate", shape: doc.shapes[0].id, color: ["front"],
        dur: 4, deps: ["permits"], ms: "soft" });
    },
    check: doc => doc.tasks.some((t: any) => t.id === "signage")
      ? null : "the new task is not in the plan",
  },
  {
    name: `constrain a start — "that can't begin before September"`,
    // A CONSTRAINT, NOT A POSITION. It is an input to the scheduler, so it
    // survives every reflow; a dragged x-coordinate would not.
    run: doc => { doc.tasks.find((t: any) => t.id === "hire").notBefore = day(doc, "2026-09-01"); },
    check: doc => doc.tasks.find((t: any) => t.id === "hire").notBefore === day(doc, "2026-09-01")
      ? null : "the start constraint did not survive the save",
  },
  {
    name: "mark a task started, then finished",
    // Two dates, no status field: both present means done, and the bar becomes how
    // long it really took rather than how long it was meant to.
    run: doc => {
      Object.assign(doc.tasks.find((t: any) => t.id === "lease"),
        { actualStart: 0, actualEnd: 7 });
    },
    check: doc => {
      const t = doc.tasks.find((x: any) => x.id === "lease");
      return t.actualStart === 0 && t.actualEnd === 7 ? null : "the actuals did not survive the save";
    },
  },
  {
    name: "reorder within a lane",
    // Position in `tasks` IS the queue order — the scheduler breaks ties by array
    // order, so moving an element is the whole edit.
    run: doc => {
      const i = doc.tasks.findIndex((t: any) => t.id === "ovens");
      doc.tasks.splice(i - 1, 0, doc.tasks.splice(i, 1)[0]);
    },
    check: doc => {
      const o = doc.tasks.findIndex((t: any) => t.id === "ovens");
      const c = doc.tasks.findIndex((t: any) => t.id === "counters");
      return o < c ? null : `ovens (${o}) did not move above counters (${c})`;
    },
  },
  {
    name: "remove a task, and everything that pointed at it",
    // The second line is not optional: `/save` refuses a plan whose deps name a
    // task that is not there, which is the check catching a real mistake rather
    // than a hypothetical one.
    run: doc => {
      doc.tasks = doc.tasks.filter((t: any) => t.id !== "demo");
      for (const t of doc.tasks) t.deps = t.deps.filter((d: string) => d !== "demo");
    },
    check: doc => doc.tasks.some((t: any) => t.id === "demo") ? "the task is still there"
      : doc.tasks.some((t: any) => t.deps.includes("demo")) ? "a dependency still points at it"
      : null,
  },
];
