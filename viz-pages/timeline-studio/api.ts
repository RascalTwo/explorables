// Backend for timeline-studio: load and save timeline models as JSON files in
// ./models. Nothing else — the scheduler lives in the browser so edits reflow
// with no round-trip, which is the entire point of the tool.
//
// No secrets pass through here. The models hold task names, durations and
// dependencies for an internal delivery plan.

import { readdir, readFile, writeFile, unlink, mkdir, rm } from "node:fs/promises";
import path from "node:path";
// THE SAME SCHEDULER THE PAGE RUNS, not a copy of it. `sched()` is the one part
// of this tool that must be exactly right, so a second implementation here would
// be the worst possible place to keep one — the failure mode is the backend and
// the chart quietly disagreeing about a date, which is precisely what the chart
// exists to prevent.
//
// IMPORTED PER CALL, WITH A CACHE BUST, and that is not superstition. The dev
// server re-imports THIS file on every request so edits are picked up without a
// restart — but only this file: a static `import ... from "./schedule.js"`
// resolves to the same specifier every time and Bun serves the cached module. So
// editing the scheduler updated the page (a separate fetch) and left the backend
// running the old one, silently, which is the divergence this module was created
// to make impossible. A re-parse of 500 lines per call costs nothing on a
// localhost tool; being quietly wrong about a date costs a meeting.
const scheduler = () => import("./schedule.js?t=" + Date.now());

// THE PLANS DO NOT LIVE IN THE REPO. They are a client's delivery schedule —
// real team names, real infrastructure, real dates — and this viz is headed for
// a public repo, where a data directory is one `git add -f` away from being on
// the open internet. So the store is a location, not a checked-in folder:
//
//   TIMELINE_DATA_DIR, if set          — point it anywhere
//   otherwise ./data                   — gitignored, and on this machine a
//                                        symlink to a directory outside the repo
//
// `data` rather than the old `models`: the name says "your stuff", not "part of
// the program", which is the distinction that got this wrong in the first place.
const DIR = process.env.TIMELINE_DATA_DIR || path.join(import.meta.dir, "data");

// Model ids become filenames, so they are restricted rather than sanitised.
// A save is a file write from a browser on localhost; an id of "../../etc/x"
// should fail loudly instead of being quietly rewritten into something else.
const okId = (id: unknown): id is string =>
  typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/i.test(id);

// HISTORY IS A SIDECAR, NOT A FIELD ON THE DOC. In the doc it would make every
// plan permanently "unsaved" (the tool decides that by comparing the document
// against a string of the last save), send the migration ladder walking through
// nested old documents, and rewrite the whole archive on every save. A directory
// per plan costs none of that.
//
// Plain, uncompressed JSON, because the promise at the top of this file is plans
// you can diff and back up, and a compressed archive beside them quietly takes
// that back to save disk nobody is short of. The BROWSER store is the one with a
// real ceiling, and it compresses on its own side.
const HDIR = (id: string) => path.join(DIR, ".history", id);
const HFILE = (id: string, n: number) => path.join(HDIR(id), String(n).padStart(4, "0") + ".json");

// Oldest first. Every doc makes the trip because the panel shows each version's
// finish date, and only the browser's scheduler can compute that.
// ponytail: reads the whole archive on every panel open. Fine at ~16KB a version
// for the low hundreds; if it ever isn't, keep the metadata in its own file and
// fetch docs on demand.
async function history(id: string) {
  let files: string[];
  try { files = (await readdir(HDIR(id))).filter((f) => f.endsWith(".json")).sort(); }
  catch { return [] as any[]; }
  return Promise.all(files.map(async (f) => ({
    n: +f.slice(0, -5),
    ...JSON.parse(await readFile(path.join(HDIR(id), f), "utf8")),
  })));
}

// WHAT A PROGRAM GETS WRONG AND THE BROWSER CANNOT. Every editor in index.html
// keeps these invariants by construction — a channel value is chosen from a list,
// a dependency is chosen by clicking a bar. Something writing JSON has no such
// rails, and without this check the failure takes the worst shape available: the
// POST succeeds, the file is written, and the plan breaks at RENDER — in a
// browser, in a meeting, with no clue pointing back at the write that did it.
//
// Every rule here was run against every document in the store, all eight archived
// versions and the demo fixture before being switched on, so it rejects nothing
// the tool itself produces. `/histput` is deliberately NOT gated: an imported
// archive legitimately holds documents at older schemas, which is the entire
// reason the migration ladder exists.
//
// It does NOT check for dependency cycles. That would mean a second copy of the
// scheduler living on this side of the wire, and `sched()` already refuses them
// loudly the moment the plan is opened.
function invalid(doc: any): string | null {
  if (doc.schemaVersion !== 4)
    return `schemaVersion must be 4 — got ${JSON.stringify(doc.schemaVersion)}. `
      + `Older documents are upgraded when the browser opens them; write current ones.`;
  const pool = (k: string) => new Set((doc[k] || []).map((x: any) => x && x.id));
  const lanes = pool("lanes"), borders = pool("borders"), fills = pool("fills");
  const shapes = pool("shapes"), colors = pool("colors"), miles = pool("milestones");
  const ids = new Set<string>();
  for (const t of doc.tasks) {
    if (!t || typeof t.id !== "string" || !t.id) return "every task needs a non-empty string id";
    if (ids.has(t.id)) return `two tasks share the id ${JSON.stringify(t.id)}`;
    ids.add(t.id);
  }
  for (const t of doc.tasks) {
    const at = (m: string) => `task ${JSON.stringify(t.id)}: ${m}`;
    if (typeof t.label !== "string") return at("label must be a string");
    if (typeof t.dur !== "number" || !(t.dur > 0))
      return at(`dur must be a positive number of DAYS — got ${JSON.stringify(t.dur)}`);
    if (!Array.isArray(t.deps)) return at("deps must be an array of task ids");
    if (!Array.isArray(t.color)) return at("color must be an ARRAY of colour ids (a task can touch two systems)");
    if (!lanes.has(t.lane)) return at(`lane ${JSON.stringify(t.lane)} is not one of doc.lanes`);
    if (!borders.has(t.border)) return at(`border ${JSON.stringify(t.border)} is not one of doc.borders`);
    if (!fills.has(t.fill)) return at(`fill ${JSON.stringify(t.fill)} is not one of doc.fills`);
    if (!shapes.has(t.shape)) return at(`shape ${JSON.stringify(t.shape)} is not one of doc.shapes`);
    if (t.ms != null && !miles.has(t.ms)) return at(`ms ${JSON.stringify(t.ms)} is not one of doc.milestones`);
    for (const c of t.color) if (!colors.has(c)) return at(`colour ${JSON.stringify(c)} is not one of doc.colors`);
    for (const d of t.deps) {
      if (d === t.id) return at("depends on itself");
      if (!ids.has(d)) return at(`depends on ${JSON.stringify(d)}, which is not a task in this plan`);
    }
  }
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default {
  "/list": async () => {
    const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
    // Title comes from inside the file so the picker reads like prose rather
    // than like filenames. Cheap: these are a few KB each.
    const models = await Promise.all(files.map(async (f) => {
      const id = f.replace(/\.json$/, "");
      try {
        const doc = JSON.parse(await readFile(path.join(DIR, f), "utf8"));
        return { id, title: doc.title ?? id, tasks: doc.tasks?.length ?? 0, order: doc.order ?? 99 };
      } catch { return { id, title: id + "  (unreadable)", tasks: 0, order: 99 }; }
    }));
    // `order` not filename: the picker's first entry is what opens, and that
    // should be the live plan rather than whatever sorts first.
    models.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return json({ models });
  },

  "/load": async (req: Request) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!okId(id)) return json({ error: "bad id" }, 400);
    try {
      return json(JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")));
    } catch (e) {
      return json({ error: String(e) }, 404);
    }
  },

  // Creating plans without being able to remove them is a one-way door, and the
  // interaction test forks a plan on every run — without this it would litter
  // the models directory a file at a time.
  "/delete": async (req: Request) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const { id } = await req.json();
    if (!okId(id)) return json({ error: "bad id" }, 400);
    const files = (await readdir(DIR)).filter((f) => f.endsWith(".json"));
    if (files.length <= 1) return json({ error: "keep at least one plan" }, 400);
    try { await unlink(path.join(DIR, `${id}.json`)); }
    catch (e) { return json({ error: String(e) }, 404); }
    // The archive goes with the plan. An orphaned .history/<id>/ no UI can reach
    // is not a safety net, it is litter — and the interaction suite forks and
    // deletes a plan on every run, so it would accumulate a directory per run.
    await rm(HDIR(id), { recursive: true, force: true });
    return json({ ok: true, id });
  },

  "/save": async (req: Request) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const { id, doc, note } = await req.json();
    if (!okId(id)) return json({ error: "bad id" }, 400);
    if (!doc || !Array.isArray(doc.tasks)) return json({ error: "doc.tasks missing" }, 400);
    const wrong = invalid(doc);
    if (wrong) return json({ error: wrong }, 400);
    await writeFile(path.join(DIR, `${id}.json`), JSON.stringify(doc, null, 1));

    // THE SNAPSHOT IS WHAT YOU JUST SAVED, not what it replaced. Archiving the
    // outgoing document instead would leave the newest saved state missing from
    // its own history until the save after it, and would hang the note you just
    // typed — which describes the change you just made — on the version before
    // the change. This way the newest entry and the file on disk are the same
    // thing, and the panel's top row is "now".
    const past = await history(id);
    const last = past[past.length - 1];
    // Saving twice with nothing changed in between should not put two identical
    // rows in the log. Both sides are serialised by the same client, so key order
    // is stable and string equality is the same notion of "changed" the unsaved-
    // changes indicator already uses.
    const snapshot = !last || JSON.stringify(last.doc) !== JSON.stringify(doc);
    if (snapshot) {
      await mkdir(HDIR(id), { recursive: true });
      await writeFile(HFILE(id, (last ? last.n : 0) + 1),
        JSON.stringify({ at: new Date().toISOString(), note: note || "", doc }, null, 1));
    }
    return json({ ok: true, id, tasks: doc.tasks.length, snapshot });
  },

  // WHAT DOES THIS PLAN LAND ON. Structural validation proves a document is
  // well-formed, never that it says what its author meant — and until this
  // existed, the only way to find out was to open a browser, which is a poor
  // answer for anything driving this over HTTP (see AGENTS.md).
  //
  // GET, and it takes a document rather than only an id: the useful question is
  // "what WOULD this cost", asked before the save rather than after it. `?id=`
  // reads what is stored; POST a `doc` to price an edit you have not committed.
  "/verdict": async (req: Request) => {
    let doc: any;
    if (req.method === "POST") {
      doc = (await req.json()).doc;
    } else {
      const id = new URL(req.url).searchParams.get("id");
      if (!okId(id)) return json({ error: "bad id" }, 400);
      try { doc = JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")); }
      catch (e) { return json({ error: String(e) }, 404); }
    }
    if (!doc || !Array.isArray(doc.tasks)) return json({ error: "doc.tasks missing" }, 400);
    // A cycle throws out of sched() rather than returning a wrong answer, which
    // is the behaviour worth preserving across the wire too.
    try { return json((await scheduler()).verdict(doc)); }
    catch (e) { return json({ error: (e as Error).message }, 400); }
  },

  // WHICH ROW TO MOVE. `/verdict` says what the plan lands on; this says what it
  // would land on if the queues were in a better order — the one scheduling input
  // that leaves no trace in the document and no arrow on the chart.
  //
  // Same shape as `/verdict` on purpose: GET an id, or POST a document you have
  // not saved, so an agent can price a reorder before committing to it. Both go
  // through the same `suggestReorders`, which is in schedule.js next to the
  // scheduler it calls — a second implementation on this side of the wire is the
  // thing that module exists to prevent.
  "/reorder": async (req: Request) => {
    let doc: any;
    const u = new URL(req.url);
    if (req.method === "POST") {
      doc = (await req.json()).doc;
    } else {
      const id = u.searchParams.get("id");
      if (!okId(id)) return json({ error: "bad id" }, 400);
      try { doc = JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")); }
      catch (e) { return json({ error: String(e) }, 404); }
    }
    if (!doc || !Array.isArray(doc.tasks)) return json({ error: "doc.tasks missing" }, 400);
    const num = (k: string, d: number) => {
      const v = Number(u.searchParams.get(k));
      return Number.isFinite(v) && v > 0 ? v : d;
    };
    try {
      const S = await scheduler();
      // BOTH AXES OF ORDER FROM ONE CALL. Within a lane, which row to move; across
      // lanes, which team goes on top. An agent cannot press the Sort button, and
      // AGENTS.md tells it not to drive the UI, so the law has to be reachable
      // here or it may as well not exist for half the tool's callers.
      return json({ ...S.suggestReorders(doc,
                      { limit: num("limit", 20), maxLane: num("maxLane", 40) }),
                    lanes: S.laneOrder(doc) });
    } catch (e) { return json({ error: (e as Error).message }, 400); }
  },

  "/history": async (req: Request) => {
    const u = new URL(req.url);
    const id = u.searchParams.get("id");
    if (!okId(id)) return json({ error: "bad id" }, 400);
    const versions = await history(id);
    // `meta=1` drops the documents. The panel needs them — it schedules each
    // version to show what it landed on — but the top bar only wants the newest
    // note and its date, and dragging the whole archive across for one line is
    // the reason the ceiling note above this exists.
    return json({ versions: u.searchParams.get("meta")
      ? versions.map(({ doc, ...meta }: any) => meta) : versions });
  },

  // The note is the ONLY mutable part of an entry. The snapshot itself is frozen:
  // an archive you can edit is not an archive.
  "/histnote": async (req: Request) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const { id, n, note } = await req.json();
    if (!okId(id) || !Number.isInteger(n) || n < 1) return json({ error: "bad id or n" }, 400);
    try {
      const e = JSON.parse(await readFile(HFILE(id, n), "utf8"));
      e.note = String(note ?? "");
      await writeFile(HFILE(id, n), JSON.stringify(e, null, 1));
    } catch (e) { return json({ error: String(e) }, 404); }
    return json({ ok: true });
  },

  // Import only — it replaces a plan's whole archive, which is right when the
  // archive arrived in one file and wrong every other time. Save appends.
  "/histput": async (req: Request) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const { id, versions } = await req.json();
    if (!okId(id)) return json({ error: "bad id" }, 400);
    if (!Array.isArray(versions)) return json({ error: "versions missing" }, 400);
    await rm(HDIR(id), { recursive: true, force: true });
    await mkdir(HDIR(id), { recursive: true });
    await Promise.all(versions.map((v: any, i: number) =>
      writeFile(HFILE(id, i + 1),
        // `approx` rides along, or a round trip through export/import quietly
        // promotes a reconstructed date to a recorded one — which is the exact
        // claim the ≈ exists to avoid making.
        JSON.stringify({ at: v.at ?? "", approx: !!v.approx, note: v.note ?? "", doc: v.doc },
          null, 1))));
    return json({ ok: true, id, versions: versions.length });
  },
};
