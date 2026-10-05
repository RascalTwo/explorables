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

import type { HTTPRequest, Page } from "puppeteer-core";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const deferred = (): { promise: Promise<void>; release: () => void } => {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { promise, release };
};
export type LogEvent = [cardId: string, ts: number, rating: 1 | 2 | 3 | 4];
export const AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4;
export const daysAgo = (d: number): number => Date.now() - d * 86_400_000;

/** The sync server: what it holds per "code|deck", and what it was sent. */
export interface Server {
  logs: Record<string, LogEvent[]>;
  down: boolean;
  /** sync requests wait for this before they are answered */ gate: Promise<void> | null;
  posts: { code: string; deckId: string; events: LogEvent[] }[];
}
/** What the assistant's model answers to a spoken command. */
export interface Plan {
  intent: string;
  tags?: string[];
  mode?: string;
}
export interface Model {
  availability: "available" | "downloadable" | "unavailable" | "absent";
  plans: Record<string, Plan>;
}

// What the fakes below leave on the page's window, for the tests to read and drive from inside `page.evaluate`.
/** A speech session as the fake presents it: an EventTarget, as Chrome's is, that the tests dispatch results and errors on. */
interface FakeRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  abort(): void;
}
/** One utterance's alternatives, as continuous recognition lists them. */
type Utterance = { transcript: string }[] & { isFinal: boolean };
declare global {
  interface Window {
    __sr?: FakeRecognition;
    __srBuilt?: number;
    __srStarts?: number;
    __srAborts?: number;
    __heard: Utterance[];
    __blob?: Blob;
    __prompts: string[];
    __plans: Record<string, Plan>;
  }
}

const SYNC = "https://hgvsjhchqskii5lqrhfp64hqom0dqhwb.lambda-url.us-east-1.on.aws/";
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";
const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/u, ""));

// ts-fsrs, bundled once per test file: the page imports it from esm.sh.
let fsrs: Promise<string> | undefined;
const bundleFsrs = async (): Promise<string> => {
  const built = await Bun.build({
    entrypoints: [Bun.resolveSync("ts-fsrs", SKILL)],
    format: "esm",
    target: "browser",
  });
  return built.outputs[0]!.text();
};

type VizPage = Page & { errors: string[] };
export type RecallPage = VizPage & { server: Server; model: Model; requests: string[] };

export interface Options {
  /** the review log the browser already holds for the demo deck */
  log?: LogEvent[];
  /** what the sync server already holds, for this code, for the demo deck */
  remote?: LogEvent[];
  code?: string;
  down?: boolean;
  /** Chrome has no speech recognition */
  noSpeech?: boolean;
  /** a speech session that opens but never hears anything (wrong input device) */
  noAudio?: boolean;
  model?: Partial<Model>;
  hash?: string;
  width?: number;
  height?: number;
}

const isLogEvent = (v: unknown): v is LogEvent =>
  Array.isArray(v) &&
  v.length === 3 &&
  typeof v[0] === "string" &&
  typeof v[1] === "number" &&
  typeof v[2] === "number";
/** A JSON value that must be a review log. */
const asLog = (v: unknown): LogEvent[] => {
  if (Array.isArray(v) && v.every(isLogEvent)) return v;
  throw new TypeError("not a review log");
};
const isPost = (v: unknown): v is Server["posts"][number] =>
  typeof v === "object" &&
  v !== null &&
  "code" in v &&
  typeof v.code === "string" &&
  "deckId" in v &&
  typeof v.deckId === "string" &&
  "events" in v &&
  Array.isArray(v.events);

export async function open(o: Options = {}): Promise<RecallPage> {
  const code = o.code ?? "0123456789abcdef0123456789abcdef";
  const server: Server = {
    logs: o.remote ? { [`${code}|demo`]: o.remote } : {},
    down: !!o.down,
    gate: null,
    posts: [],
  };
  const model: Model = { availability: "absent", plans: {}, ...o.model };
  const requests: string[] = [];
  fsrs ??= bundleFsrs();
  const src = await fsrs;

  const serve = async (req: HTTPRequest): Promise<void> => {
    if (req.isInterceptResolutionHandled()) return;
    const u = new URL(req.url());
    requests.push(`${req.method()} ${u.origin}${u.pathname}`);
    if (u.hostname === "esm.sh" && u.pathname.startsWith("/ts-fsrs")) {
      await req.respond({
        status: 200,
        contentType: "text/javascript",
        headers: { "access-control-allow-origin": "*" },
        body: src,
      });
      return;
    }
    if (req.url().startsWith(SYNC)) {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST",
      };
      if (req.method() === "OPTIONS") {
        await req.respond({ status: 204, headers: cors });
        return;
      }
      await server.gate;
      if (server.down) {
        await req.respond({ status: 503, headers: cors, contentType: "text/plain", body: "down" });
        return;
      }
      // oxlint-disable-next-line typescript/no-deprecated -- fetchPostData() asks the browser over CDP and may come back empty for an intercepted request; postData() is what the interception event itself carried
      const body: unknown = JSON.parse(req.postData() ?? "null");
      if (!isPost(body)) {
        await req.respond({
          status: 400,
          headers: cors,
          contentType: "text/plain",
          body: "bad request",
        });
        return;
      }
      server.posts.push(body);
      const key = `${body.code}|${body.deckId}`,
        held = (server.logs[key] ??= []);
      const has = new Set(held.map((e) => e.join("|")));
      for (const e of body.events) if (!has.has(e.join("|"))) held.push(e);
      await req.respond({
        status: 200,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify({ events: held }),
      });
      return;
    }
    if (u.origin !== BASE.origin) {
      await req.abort("blockedbyclient");
      return;
    }
    if (u.pathname.includes("/_log/")) {
      await req.respond({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await req.continue();
  };

  const page = await viz.open(o.hash ?? `s=${code}`, {
    width: o.width,
    height: o.height,
    before: async (p: Page) => {
      // The dev server's feedback pill floats over the page's top-right buttons; it is the server's overlay, not the page's.
      await p.evaluateOnNewDocument(() => {
        addEventListener("DOMContentLoaded", () =>
          document.head.append(
            Object.assign(document.createElement("style"), {
              textContent: "#viz-feedback { display: none !important; }",
            }),
          ),
        );
      });
      await p.evaluateOnNewDocument((log) => {
        // the log the browser already holds: set once, so a reload keeps what the page wrote since
        if (log && !localStorage.getItem("recall:demo:log"))
          localStorage.setItem("recall:demo:log", JSON.stringify(log));
        // an in-memory clipboard
        let held = "";
        Object.defineProperty(navigator, "clipboard", {
          value: {
            // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-ins for the clipboard API's promise-returning methods: nothing in them waits
            writeText: async (t: string) => {
              held = t;
            },
            // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-ins for the clipboard API's promise-returning methods: nothing in them waits
            readText: async () => held,
          },
        });
        // downloads: keep the blob the page built, so a test can read the export
        const make = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (b: Blob | MediaSource) => {
          if (b instanceof Blob) window.__blob = b;
          return make(b);
        };
      }, o.log ?? null);
      await p.evaluateOnNewDocument(
        (noSpeech, noAudio) => {
          // a speech session that reports results cumulatively, like continuous recognition
          window.__heard = [];
          // Chrome ships the real one under both names, and the page prefers the unprefixed: replace or remove both
          Reflect.deleteProperty(window, "SpeechRecognition");
          Reflect.deleteProperty(window, "webkitSpeechRecognition");
          if (!noSpeech) {
            class Fake extends EventTarget implements FakeRecognition {
              public continuous = false;
              public interimResults = false;
              public lang = "";
              public listening = false;
              public constructor() {
                super();
                window.__sr = this;
                window.__srBuilt = (window.__srBuilt ?? 0) + 1;
              }
              public start(): void {
                this.listening = true;
                window.__srStarts = (window.__srStarts ?? 0) + 1;
                if (!noAudio)
                  setTimeout(() => {
                    this.dispatchEvent(new Event("audiostart"));
                  }, 0);
              }
              public abort(): void {
                this.listening = false;
                window.__srAborts = (window.__srAborts ?? 0) + 1;
              }
            }
            Reflect.set(window, "SpeechRecognition", Fake);
            Reflect.set(window, "webkitSpeechRecognition", Fake);
          }
        },
        !!o.noSpeech,
        !!o.noAudio,
      );
      await p.evaluateOnNewDocument((m) => {
        window.__prompts = [];
        // Chrome ships the real Prompt API; the test decides what the page sees
        Reflect.deleteProperty(window, "LanguageModel");
        if (m.availability === "absent") return;
        Reflect.set(window, "LanguageModel", {
          // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-in for the Prompt API's promise-returning availability(): nothing in it waits
          availability: async () => m.availability,
          // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-in for the Prompt API's promise-returning create(): nothing in it waits
          create: async (opts: {
            monitor?: (m: {
              addEventListener: (type: string, cb: (e: { loaded: number }) => void) => void;
            }) => void;
            // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-in for the Prompt API's promise-returning create(): nothing in it waits
          }) => {
            for (const pct of [0.5, 1])
              opts.monitor?.({
                addEventListener: (_: string, cb: (e: { loaded: number }) => void) => {
                  cb({ loaded: pct });
                },
              });
            return {
              // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-in for the Prompt API's promise-returning prompt(): nothing in it waits
              prompt: async (
                input: string,
                po: { responseConstraint: { properties: { tags: { items: { enum: string[] } } } } },
                // oxlint-disable-next-line eslint/require-await, typescript/require-await -- stand-in for the Prompt API's promise-returning prompt(): nothing in it waits
              ) => {
                window.__prompts.push(input);
                const plan = window.__plans[input.toLowerCase()] ?? { intent: "unknown" };
                const allowed = po.responseConstraint.properties.tags.items.enum;
                for (const t of plan.tags ?? [])
                  if (!allowed.includes(t))
                    throw new Error(`tag "${t}" is outside the schema's enum`);
                return JSON.stringify(plan);
              },
            };
          },
        });
      }, model);
      await p.evaluateOnNewDocument((plans) => {
        window.__plans = plans;
      }, model.plans);

      await p.setRequestInterception(true);
      p.on("request", (req) => {
        serve(req).catch((e: unknown) => console.error(e));
      });
    },
  });
  return Object.assign(page, { server, model, requests });
}

// ---- driving the page --------------------------------------------------------------------------------

export const clean = (s: string | null | undefined): string =>
  (s ?? "").replaceAll(/\s+/gu, " ").trim();
export const text = async (page: Page, sel: string): Promise<string> => {
  const found = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return found;
};

/** The page has loaded the demo deck and shown a card. */
export const ready = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => !!document.querySelector("#front .prompt") && !!document.querySelector("#buckets button"),
    { timeout: 15_000 },
  );
};

/** What the card in front of the user says. */
export const prompt = async (page: Page): Promise<string> => {
  const said = await text(page, "#front .prompt");
  return said;
};
export const status = async (page: Page): Promise<string> => {
  const line = await text(page, "#status");
  return line;
};
export const verdict = async (page: Page): Promise<{ text: string; kind: string }> => ({
  text: await text(page, "#verdict"),
  kind: await page.$eval("#verdict", (e) => e.className.replace("verdict", "").trim()),
});
/** The rating buttons, and which one is suggested. */
export const ratings = async (page: Page): Promise<(readonly [string | null, boolean])[]> => {
  const rows = await page.$$eval("#rating button", (bs) =>
    bs.map((b) => [b.textContent, b.getAttribute("aria-pressed") === "true"] as const),
  );
  return rows;
};

/** Type an answer and press Enter. */
export async function answer(page: Page, said: string): Promise<void> {
  await page.type("#answer", said);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("#back")!.classList.contains("hidden"));
}
/** Grade the revealed card with the button of that name, and wait for the next card (or the end). */
export async function grade(page: Page, label: "Again" | "Hard" | "Good" | "Easy"): Promise<void> {
  const before = await text(page, "#front");
  await page.evaluate(
    (l) =>
      [...document.querySelectorAll<HTMLButtonElement>("#rating button")]
        .find((b) => b.textContent === l)!
        .click(),
    label,
  );
  await page.waitForFunction(
    (b) => document.querySelector("#front")!.textContent.replaceAll(/\s+/gu, " ").trim() !== b,
    {},
    before,
  );
}
/** The log the page holds for the demo deck, as saved in the browser. */
export const savedLog = async (page: Page, deck = "demo"): Promise<LogEvent[]> =>
  asLog(
    JSON.parse(await page.evaluate((d) => localStorage.getItem(`recall:${d}:log`) ?? "[]", deck)),
  );

/** A bucket row in "How well do you know this deck?": its label and card count. */
export const buckets = async (page: Page): Promise<Record<string, number>> => {
  const rows = await page.$$eval("#buckets > button", (bs) =>
    Object.fromEntries(
      bs.map((b): [string, number] => [
        b.textContent ?? "",
        Number(b.nextElementSibling!.nextElementSibling!.textContent),
      ]),
    ),
  );
  return rows;
};

// ---- speech and the model ----------------------------------------------------------------------------

/** The user speaks. Continuous recognition hands the page every result of the session so far, so each call adds one. */
export const hear = async (page: Page, said: string, isFinal = true): Promise<void> => {
  await page.evaluate(
    (s, f) => {
      window.__heard.push(Object.assign([{ transcript: s }], { isFinal: f }));
      window.__sr!.dispatchEvent(
        Object.assign(new Event("result"), { results: [...window.__heard] }),
      );
    },
    said,
    isFinal,
  );
};
/** Chrome reports to the page: `type` is the speech session's event ("error", "end"), `props` what it carries. */
export const recognitionEvent = async (
  page: Page,
  type: string,
  props: object = {},
): Promise<void> => {
  await page.evaluate(
    (t, p) => {
      window.__sr!.dispatchEvent(Object.assign(new Event(t), p));
    },
    type,
    props,
  );
};
export async function micOn(page: Page): Promise<void> {
  await page.click("#mic");
  await page.waitForFunction(
    () => !!window.__sr && document.querySelector("#mic")!.getAttribute("aria-pressed") === "true",
  );
}
export const heard = async (page: Page): Promise<string> => {
  const said = await text(page, "#heard");
  return said;
};

// ---- decks -------------------------------------------------------------------------------------------

export interface DeckFile {
  id: string;
  name: string;
  templates: object[];
  notes: object[];
  defaultTags?: string[];
}
/** Write a deck to disk and hand it to the file picker, as the user does. */
export async function loadDeckFile(
  page: Page,
  deck: DeckFile,
  name = "people.json",
): Promise<void> {
  const file = writeJson(name, deck);
  const input = await page.$("input#file");
  await input!.uploadFile(file);
  await page.waitForFunction(
    (n) => document.querySelector("#recents")!.textContent.includes(n),
    {},
    deck.name,
  );
}
export function writeJson(name: string, value: unknown): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "recall-")), name);
  writeFileSync(file, JSON.stringify(value));
  return file;
}

/** A deck of people: a name-to-photo-less template, tags for the assistant, one note that lacks the field the template requires. */
export const PEOPLE: DeckFile = {
  id: "people",
  name: "People",
  templates: [
    {
      id: "who",
      name: "Who",
      front: '<div class="prompt">Who is {{role}}?</div>',
      back: '<div class="answer">{{name}}</div>',
      answerField: "name",
      requires: ["role", "name"],
    },
  ],
  notes: [
    {
      id: "p1",
      weight: 1,
      tags: ["alumni"],
      fields: { role: "the founder", name: "Ada Lovelace" },
    },
    {
      id: "p2",
      weight: 3,
      tags: ["staff", "loc:iowa"],
      fields: { role: "the <b>CTO</b>", name: "Grace Hopper" },
    },
    { id: "p3", weight: 2, tags: ["staff"], fields: { role: "the designer", name: "Alan Turing" } },
    { id: "p4", weight: 5, tags: ["alumni", "loc:iowa"], fields: { name: "Nobody Special" } },
  ],
};
