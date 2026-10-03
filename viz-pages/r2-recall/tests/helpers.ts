// Shared by the r2-recall tests. The page and browser come from `viz.open()`; this adds stand-ins for everything
// the page reaches outside itself for, so no test touches the network, the microphone or the real sync server:
//
//   ts-fsrs      the scheduler, from esm.sh: answered with the REAL library, bundled locally from the skill's node_modules
//   sync server  the Lambda the page posts its review log to: a WORKING FAKE that keeps each (code, deck) log as a
//                union of events, as the real one does ("the server keys an event by its own content")
//   speech       Chrome's SpeechRecognition: a fake whose `hear()` delivers results the way a continuous session
//                does, cumulatively (see `hear`)
//   the model    Chrome's built-in LanguageModel: a fake that answers a spoken command from a table the test gives it,
//                and refuses a tag outside the schema's enum, as the real one is constrained to
//   clipboard    an in-memory one (a headless browser has no system clipboard to grant)
//
//   const page = await open({ log: [["d3::q-a", daysAgo(30), 3]] });   // the demo deck, one card reviewed 30 days ago
//   await page.type("#answer", "This browser"); await page.keyboard.press("Enter");

import type { Page } from "puppeteer-core";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const deferred = () => { let release!: () => void; const promise = new Promise<void>((r) => { release = r; }); return { promise, release }; };
export type LogEvent = [cardId: string, ts: number, rating: 1 | 2 | 3 | 4];
export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;
export const daysAgo = (d: number) => Date.now() - d * 86_400_000;

/** The sync server: what it holds per "code|deck", and what it was sent. */
export interface Server { logs: Record<string, LogEvent[]>; down: boolean; /** sync requests wait for this before they are answered */ gate: Promise<void> | null; posts: { code: string; deckId: string; events: LogEvent[] }[] }
export interface Model { availability: "available" | "downloadable" | "unavailable" | "absent"; plans: Record<string, object> }

const SYNC = "https://hgvsjhchqskii5lqrhfp64hqom0dqhwb.lambda-url.us-east-1.on.aws/";
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";
const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));

// ts-fsrs, bundled once per test file: the page imports it from esm.sh.
let fsrs: Promise<string> | undefined;
const fsrsSource = () => fsrs ??= Bun.build({ entrypoints: [Bun.resolveSync("ts-fsrs", SKILL)], format: "esm", target: "browser" }).then((r) => r.outputs[0]!.text());

export type RecallPage = Page & { errors: string[]; server: Server; model: Model; requests: string[] };

export interface Options {
  /** the review log the browser already holds for the demo deck */
  log?: LogEvent[];
  /** what the sync server already holds, for this code, for the demo deck */
  remote?: LogEvent[]; code?: string; down?: boolean;
  /** Chrome has no speech recognition */
  noSpeech?: boolean;
  /** a speech session that opens but never hears anything (wrong input device) */
  noAudio?: boolean;
  model?: Partial<Model>;
  hash?: string; width?: number; height?: number;
}

export async function open(o: Options = {}): Promise<RecallPage> {
  const code = o.code ?? "0123456789abcdef0123456789abcdef";
  const server: Server = { logs: o.remote ? { [`${code}|demo`]: o.remote } : {}, down: !!o.down, gate: null, posts: [] };
  const model: Model = { availability: "absent", plans: {}, ...o.model };
  const requests: string[] = [];
  const src = await fsrsSource();
  const page = await viz.open(o.hash ?? `s=${code}`, {
    width: o.width, height: o.height,
    before: async (p) => {
      // The dev server's feedback pill floats over the page's top-right buttons; it is the server's overlay, not the page's.
      await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
        document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; }" }))));
      await p.evaluateOnNewDocument((log) => {
        // the log the browser already holds: set once, so a reload keeps what the page wrote since
        if (log && !localStorage.getItem("recall:demo:log")) localStorage.setItem("recall:demo:log", JSON.stringify(log));
        // an in-memory clipboard
        let held = "";
        Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t: string) => { held = t; }, readText: async () => held } });
        // downloads: keep the blob the page built, so a test can read the export
        const make = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (b: Blob | MediaSource) => { (window as any).__blob = b; return make(b); };
      }, o.log ?? null);
      await p.evaluateOnNewDocument((noSpeech, noAudio) => {
        // a speech session that reports results cumulatively, like continuous recognition
        const w = window as any;
        w.__heard = [];
        // Chrome ships the real one under both names, and the page prefers the unprefixed: replace or remove both
        delete w.SpeechRecognition; delete w.webkitSpeechRecognition;
        if (!noSpeech) {
          const Fake = class {
            continuous = false; interimResults = false; lang = ""; onaudiostart: any = null; onresult: any = null; onerror: any = null; onend: any = null;
            constructor() { w.__sr = this; w.__srBuilt = (w.__srBuilt ?? 0) + 1; }
            start() { w.__srStarts = (w.__srStarts ?? 0) + 1; if (!noAudio) setTimeout(() => this.onaudiostart?.(), 0); }
            abort() { w.__srAborts = (w.__srAborts ?? 0) + 1; }
          };
          w.SpeechRecognition = w.webkitSpeechRecognition = Fake;
        }
      }, !!o.noSpeech, !!o.noAudio);
      await p.evaluateOnNewDocument((m) => {
        const w = window as any;
        w.__prompts = [];
        // Chrome ships the real Prompt API; the test decides what the page sees
        delete w.LanguageModel;
        if (m.availability === "absent") return;
        w.LanguageModel = {
          availability: async () => m.availability,
          create: async (opts: any) => {
            for (const pct of [0.5, 1]) opts.monitor?.({ addEventListener: (_: string, cb: (e: { loaded: number }) => void) => cb({ loaded: pct }) });
            return {
              prompt: async (input: string, po: { responseConstraint: any }) => {
                w.__prompts.push(input);
                const plan = w.__plans[input.toLowerCase()] ?? { intent: "unknown" };
                const allowed: string[] = po.responseConstraint.properties.tags.items.enum;
                for (const t of plan.tags ?? []) if (!allowed.includes(t)) throw new Error(`tag "${t}" is outside the schema's enum`);
                return JSON.stringify(plan);
              },
            };
          },
        };
      }, model);
      await p.evaluateOnNewDocument((plans) => { (window as any).__plans = plans; }, model.plans);

      await p.setRequestInterception(true);
      p.on("request", async (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const u = new URL(req.url());
        requests.push(`${req.method()} ${u.origin}${u.pathname}`);
        if (u.hostname === "esm.sh" && u.pathname.startsWith("/ts-fsrs")) return req.respond({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: src });
        if (req.url().startsWith(SYNC)) {
          const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST" };
          if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: cors });
          await server.gate;
          if (server.down) return req.respond({ status: 503, headers: cors, contentType: "text/plain", body: "down" });
          const body = JSON.parse(req.postData()!) as { code: string; deckId: string; events: LogEvent[] };
          server.posts.push(body);
          const key = `${body.code}|${body.deckId}`, held = server.logs[key] ??= [];
          const has = new Set(held.map((e) => e.join("|")));
          for (const e of body.events) if (!has.has(e.join("|"))) held.push(e);
          return req.respond({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ events: held }) });
        }
        if (u.origin !== BASE.origin) return req.abort("blockedbyclient");
        if (/\/_log\//.test(u.pathname)) return req.respond({ status: 200, contentType: "application/json", body: "[]" });
        return req.continue();
      });
    },
  });
  return Object.assign(page, { server, model, requests }) as RecallPage;
}

// ---- driving the page --------------------------------------------------------------------------------

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
export const text = (page: Page, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());

/** The page has loaded the demo deck and shown a card. */
export const ready = (page: Page) => page.waitForFunction(() => !!document.querySelector("#front .prompt") && !!document.querySelector("#buckets button"), { timeout: 15_000 });

/** What the card in front of the user says. */
export const prompt = (page: Page) => text(page, "#front .prompt");
export const status = (page: Page) => text(page, "#status");
export const verdict = async (page: Page) => ({ text: await text(page, "#verdict"), kind: await page.$eval("#verdict", (e) => e.className.replace("verdict", "").trim()) });
/** The rating buttons, and which one is suggested. */
export const ratings = (page: Page) => page.$$eval("#rating button", (bs) => bs.map((b) => [b.textContent, b.getAttribute("aria-pressed") === "true"] as const));

/** Type an answer and press Enter. */
export async function answer(page: Page, said: string) {
  await page.type("#answer", said);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("#back")!.classList.contains("hidden"));
}
/** Grade the revealed card with the button of that name, and wait for the next card (or the end). */
export async function grade(page: Page, label: "Again" | "Hard" | "Good" | "Easy") {
  const before = await text(page, "#front");
  await page.evaluate((l) => [...document.querySelectorAll<HTMLButtonElement>("#rating button")].find((b) => b.textContent === l)!.click(), label);
  await page.waitForFunction((b) => document.querySelector("#front")!.textContent!.replace(/\s+/g, " ").trim() !== b, {}, before);
}
/** The log the page holds for the demo deck, as saved in the browser. */
export const savedLog = (page: Page, deck = "demo"): Promise<LogEvent[]> => page.evaluate((d) => JSON.parse(localStorage.getItem(`recall:${d}:log`) ?? "[]"), deck);

/** A bucket row in "How well do you know this deck?": its label and card count. */
export const buckets = (page: Page) => page.$$eval("#buckets > button", (bs) => Object.fromEntries(bs.map((b) => [b.textContent!, Number(b.nextElementSibling!.nextElementSibling!.textContent)])));

// ---- speech and the model ----------------------------------------------------------------------------

/** The user speaks. Continuous recognition hands the page every result of the session so far, so each call adds one. */
export const hear = (page: Page, said: string, isFinal = true) => page.evaluate((s, f) => {
  const w = window as any;
  w.__heard.push(Object.assign([{ transcript: s }], { isFinal: f }));
  w.__sr.onresult({ results: [...w.__heard] });
}, said, isFinal);
export async function micOn(page: Page) {
  await page.click("#mic");
  await page.waitForFunction(() => (window as any).__sr && document.querySelector("#mic")!.getAttribute("aria-pressed") === "true");
}
export const heard = (page: Page) => text(page, "#heard");

// ---- decks -------------------------------------------------------------------------------------------

export interface DeckFile { id: string; name: string; templates: object[]; notes: object[]; defaultTags?: string[] }
/** Write a deck to disk and hand it to the file picker, as the user does. */
export async function loadDeckFile(page: Page, deck: DeckFile, name = "people.json") {
  const dir = mkdtempSync(join(tmpdir(), "recall-"));
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(deck));
  const input = await page.$("input#file");
  await input!.uploadFile(path);
  await page.waitForFunction((n) => document.querySelector("#recents")!.textContent!.includes(n), {}, deck.name);
}
export function writeJson(name: string, value: unknown) {
  const path = join(mkdtempSync(join(tmpdir(), "recall-")), name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

/** A deck of people: a name-to-photo-less template, tags for the assistant, one note that lacks the field the template requires. */
export const PEOPLE: DeckFile = {
  id: "people", name: "People",
  templates: [{ id: "who", name: "Who", front: "<div class=\"prompt\">Who is {{role}}?</div>", back: "<div class=\"answer\">{{name}}</div>", answerField: "name", requires: ["role", "name"] }],
  notes: [
    { id: "p1", weight: 1, tags: ["alumni"], fields: { role: "the founder", name: "Ada Lovelace" } },
    { id: "p2", weight: 3, tags: ["staff", "loc:iowa"], fields: { role: "the <b>CTO</b>", name: "Grace Hopper" } },
    { id: "p3", weight: 2, tags: ["staff"], fields: { role: "the designer", name: "Alan Turing" } },
    { id: "p4", weight: 5, tags: ["alumni", "loc:iowa"], fields: { name: "Nobody Special" } },
  ],
};
export { clean };
