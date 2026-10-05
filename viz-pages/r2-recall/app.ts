import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "https://esm.sh/ts-fsrs@5.4.1";

interface Template {
  id: string;
  name: string;
  front: string;
  back: string;
  answerField: string;
  requires: string[];
}
interface Note {
  id: string;
  weight?: number;
  tags?: string[];
  fields: Record<string, string>;
}
interface Deck {
  id: string;
  name: string;
  templates: Template[];
  notes: Note[];
  defaultTags?: string[];
  __file?: string;
}
interface CardItem {
  id: string;
  note: Note;
  tpl: Template;
  weight: number;
}
type LogEvent = [cardId: string, ts: number, rating: Grade];
interface Recent {
  id: string;
  name: string;
  file: string | null;
  at: number;
}
interface Plan {
  intent: string;
  tags?: string[];
  mode?: string;
}
interface LanguageModelSession {
  prompt(input: string, opts?: { responseConstraint?: object }): Promise<string>;
}
declare const LanguageModel: {
  availability(): Promise<string>;
  create(opts: {
    monitor?: (m: {
      addEventListener(type: string, cb: (e: { loaded?: number }) => void): void;
    }) => void;
    initialPrompts?: { role: string; content: string }[];
  }): Promise<LanguageModelSession>;
};
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  addEventListener(type: "audiostart" | "end", cb: () => void): void;
  addEventListener(type: "result", cb: (e: SpeechRecognitionEvent) => void): void;
  addEventListener(type: "error", cb: (e: SpeechRecognitionErrorEvent) => void): void;
  start(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const $ = (s: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(s);
  if (!el) throw new Error(`missing element ${s}`);
  return el;
};
const $input = (s: string): HTMLInputElement => {
  const el = $(s);
  if (!(el instanceof HTMLInputElement)) throw new TypeError(`${s} is not an input`);
  return el;
};
/** Start async work nobody waits on; a failure is reported rather than lost. */
const fire = (work: Promise<unknown>): void => {
  work.catch((e: unknown) => console.error(e));
};
/** What a thrown value is called, for the page's one-line error messages. */
const errName = (e: unknown): string => (e instanceof Error ? e.name : "Error");
const errMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// JSON from storage, the network and files is `unknown` until a guard has looked at it.
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");
const isTemplate = (v: unknown): v is Template =>
  isObj(v) &&
  ["id", "name", "front", "back", "answerField"].every((k) => typeof v[k] === "string") &&
  isStrArr(v["requires"]);
const isNote = (v: unknown): v is Note =>
  isObj(v) &&
  typeof v["id"] === "string" &&
  isObj(v["fields"]) &&
  (v["weight"] === undefined || typeof v["weight"] === "number") &&
  (v["tags"] === undefined || isStrArr(v["tags"]));
const isDeck = (v: unknown): v is Deck =>
  isObj(v) &&
  typeof v["id"] === "string" &&
  typeof v["name"] === "string" &&
  Array.isArray(v["templates"]) &&
  v["templates"].every(isTemplate) &&
  Array.isArray(v["notes"]) &&
  v["notes"].every(isNote) &&
  (v["defaultTags"] === undefined || isStrArr(v["defaultTags"]));
const isLogEvent = (v: unknown): v is LogEvent =>
  Array.isArray(v) &&
  v.length === 3 &&
  typeof v[0] === "string" &&
  typeof v[1] === "number" &&
  typeof v[2] === "number";
/** The review events under `key` of a JSON value (an array itself when `key` is omitted); anything malformed is dropped. */
const eventsAt = (body: unknown, key?: string): LogEvent[] => {
  const list = key === undefined ? body : isObj(body) ? body[key] : undefined;
  return Array.isArray(list) ? list.filter(isLogEvent) : [];
};
const isRecent = (v: unknown): v is Recent =>
  isObj(v) &&
  typeof v["id"] === "string" &&
  typeof v["name"] === "string" &&
  (v["file"] === null || typeof v["file"] === "string") &&
  typeof v["at"] === "number";
const readRecents = (): Recent[] => {
  const list: unknown = JSON.parse(localStorage.getItem("recall:recents") ?? "[]");
  return Array.isArray(list) ? list.filter(isRecent) : [];
};
const toPlan = (v: unknown): Plan => {
  if (!isObj(v) || typeof v["intent"] !== "string") return { intent: "unknown" };
  const plan: Plan = { intent: v["intent"] };
  if (isStrArr(v["tags"])) plan.tags = v["tags"];
  if (typeof v["mode"] === "string") plan.mode = v["mode"];
  return plan;
};
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

// ─── deck ────────────────────────────────────────────────────────────────────
// No real deck ships with this page — you bring your own JSON. This demo exists
// so a first-time visitor has something to press, and doubles as the format spec.
const DEMO: Deck = {
  id: "demo",
  name: "Demo — the deck format itself",
  templates: [
    {
      id: "q-a",
      name: "Question → Answer",
      front: `<div class="prompt">{{q}}</div>`,
      back: `<div class="answer">{{a}}</div><div class="hooks">{{why}}</div>`,
      answerField: "a",
      requires: ["q", "a"],
    },
  ],
  notes: [
    {
      id: "d1",
      weight: 5,
      tags: ["demo"],
      fields: {
        q: "What holds the data in this format?",
        a: "Structured fields",
        why: "Not a rendered blob — fields are what make cards generatable.",
      },
    },
    {
      id: "d2",
      weight: 4,
      tags: ["demo"],
      fields: {
        q: "What is a card, exactly?",
        a: "A note times a template",
        why: "One note can emit many cards; each keeps its own schedule.",
      },
    },
    {
      id: "d3",
      weight: 3,
      tags: ["demo"],
      fields: {
        q: "Where does my progress live?",
        a: "This browser",
        why: "An append-only log in localStorage. Export it — browsers evict storage.",
      },
    },
    {
      id: "d4",
      weight: 2,
      tags: ["demo"],
      fields: {
        q: "Which scheduler decides the intervals?",
        a: "FSRS",
        why: "The same algorithm Anki ships. Two numbers per card: stability and difficulty.",
      },
    },
    {
      id: "d5",
      weight: 1,
      tags: ["demo"],
      fields: {
        q: "How is a spoken answer graded?",
        a: "Nearest match",
        why: "Ranked against every answer in the deck, so a near-miss name loses to the real one.",
      },
    },
  ],
};

let deck: Deck,
  cards: CardItem[],
  current: CardItem | null,
  revealed = false;

/** A card is a (note × template) pair. A template whose `requires` names a field
 *  the note lacks emits nothing — that is how photo-less people keep text cards. */
const buildCards = (d: Deck): CardItem[] =>
  d.notes.flatMap((note) =>
    d.templates
      .filter((t) => t.requires.every((f) => note.fields[f]))
      .map((t) => ({ id: `${note.id}::${t.id}`, note, tpl: t, weight: note.weight ?? 1 })),
  );

const esc = (s: unknown) =>
  String(s).replaceAll(
    /[&<>"']/gu,
    (c) =>
      (
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<
          string,
          string
        >
      )[c]!,
  );

/** Templates are HTML authored by the deck (trusted); field values are escaped,
 *  since a deck you were handed is not. */
const render = (tplStr: string, fields: Record<string, string>) =>
  tplStr.replaceAll(/\{\{(\w+)\}\}/gu, (_: string, f: string) => esc(fields[f] ?? ""));

// ─── progress: an append-only log, replayed ──────────────────────────────────
// Immutable events mean merging two devices later is concatenation, not conflict
// resolution — and they are what an FSRS parameter optimiser trains on.
const logKey = () => `recall:${deck.id}:log`;
let log: LogEvent[] = [];

const loadLog = () => {
  try {
    log = eventsAt(JSON.parse(localStorage.getItem(logKey()) ?? "[]"));
  } catch {
    log = [];
  }
};
const saveLog = () => localStorage.setItem(logKey(), JSON.stringify(log));

/** Fold the log into current FSRS state per card. */
function replay() {
  const byCard = new Map<string, FsrsCard>();
  for (const [cardId, ts, rating] of log) {
    const prev: FsrsCard = byCard.get(cardId) ?? createEmptyCard(new Date(ts));
    byCard.set(cardId, scheduler.next(prev, new Date(ts), rating).card);
  }
  return byCard;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function introducedToday() {
  const first = new Map<string, number>();
  for (const [cardId, ts] of log) if (!first.has(cardId)) first.set(cardId, ts);
  return [...first.values()].filter((ts) => ts >= startOfToday()).length;
}

/** Due cards first (most overdue leads), then unseen by weight. */
function pickNext() {
  const state = replay();
  const now = Date.now();
  const due = cards
    .filter((c) => state.has(c.id) && state.get(c.id)!.due.getTime() <= now)
    .toSorted((a, b) => +state.get(a.id)!.due - +state.get(b.id)!.due);
  if (due.length > 0) return due[0];

  const fresh = cards.filter((c) => !state.has(c.id)).toSorted((a, b) => b.weight - a.weight);
  return fresh[0] ?? null;
}

// ─── answer matching: a closed set, not open transcription ───────────────────
// General speech recognition mangles names. Picking the nearest of N known
// answers is a much easier problem, so that is the one we solve.
// NFD first so "Renée" decomposes to "e" + a combining mark, which the ASCII
// filter then drops — otherwise the accented letter is dropped whole.
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[^a-z0-9 ]/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

function distance(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let corner = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, corner + (a[i - 1] === b[j - 1] ? 0 : 1));
      corner = t;
    }
  }
  return prev[b.length]!;
}

/**
 * Correct iff `want` is the NEAREST of every answer in the deck — not merely
 * within some threshold of it. Thresholding alone is wrong in both directions:
 * it passed "Molly Vincent" for "Matt Vincent" (two different people) while
 * rejecting "ock rem sod" for "Akrem Saed" (what a recogniser actually returns).
 * Ranking a closed set fixes both — measured 0 false positives over all 139×138
 * name pairs, where thresholding gave 2.
 */
function judge(said: string, want: string, candidates: string[]) {
  const a = norm(said);
  if (!a) return false;
  let best: string | null = null,
    bestD = Infinity;
  for (const c of candidates) {
    const d = distance(a, norm(c));
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  // Still bounded, so pure gibberish loses instead of snapping to a winner.
  return best === want && bestD <= Math.max(3, Math.ceil(norm(want).length * 0.5));
}

/** Every answer this template can have — the closed set to rank against. */
let candidates: string[] = [];
const answersFor = (tpl: Template) => [
  ...new Set(
    cards
      .filter((c) => c.tpl.id === tpl.id)
      .flatMap((c) => {
        const a = c.note.fields[tpl.answerField];
        return a ? [a] : [];
      }),
  ),
];

// ─── review loop ─────────────────────────────────────────────────────────────
function show(card: CardItem) {
  current = card;
  revealed = false;
  candidates = answersFor(card.tpl);
  resetSpeech();
  $("#front").innerHTML = render(card.tpl.front, card.note.fields);
  $("#back").innerHTML = render(card.tpl.back, card.note.fields);
  $("#back").classList.add("hidden");
  $("#verdict").textContent = "";
  $("#verdict").className = "verdict";
  $input("#answer").value = "";
  $("#heard").textContent = "";
  $("#rating").innerHTML = "";
  $("#answer").classList.remove("hidden");
  $("#answer").focus();
  hint();
  refreshStatus();
}

function reveal(said: string) {
  if (revealed) return;
  revealed = true;
  const want = current!.note.fields[current!.tpl.answerField] ?? "";
  const right = judge(said, want, candidates);
  $("#back").classList.remove("hidden");
  $("#answer").classList.add("hidden");
  if (said.trim()) {
    $("#verdict").textContent = right ? "✓ correct" : `✗ you said “${said.trim()}”`;
    $("#verdict").className = `verdict ${right ? "right" : "wrong"}`;
  }
  // Auto-graded, but never silently — every rating stays one click (or word) away.
  const suggest = right ? Rating.Good : Rating.Again;
  for (const [label, r] of [
    ["Again", Rating.Again],
    ["Hard", Rating.Hard],
    ["Good", Rating.Good],
    ["Easy", Rating.Easy],
  ] satisfies [string, Grade][]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset["vizId"] = `rate-${label.toLowerCase()}`;
    b.dataset["label"] = `Grade this card ${label}`;
    if (r === suggest) b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => grade(r));
    $("#rating").append(b);
  }
  hint();
}

function grade(rating: Grade) {
  log.push([current!.id, Date.now(), rating]);
  saveLog();
  syncSoon();
  drawBuckets();
  const next = pickNext();
  if (next) show(next);
  else done();
}

function done() {
  current = null;
  $("#front").innerHTML = `<div class="prompt">Nothing due 🎉</div>
    <div class="sub">Every card in this deck is seen and none is due yet. Come back when one is,
      or widen the deck \u2014 try saying "recall, show everyone".</div>`;
  $("#back").classList.add("hidden");
  $("#answer").classList.add("hidden");
  $("#rating").innerHTML = "";
  $("#verdict").textContent = "";
  refreshStatus();
}

function refreshStatus() {
  const state = replay();
  const now = Date.now();
  const due = cards.filter((c) => state.has(c.id) && state.get(c.id)!.due.getTime() <= now).length;
  const seen = state.size;
  $("#status").textContent =
    `${cards.length} cards · ${seen} seen · ${due} due now · ${introducedToday()} new today`;
}

// ─── retention overview ──────────────────────────────────────────────────────
const BUCKETS: [string, (s: FsrsCard | undefined) => unknown][] = [
  ["never seen", (s) => !s],
  ["learning", (s) => s && s.state !== State.Review],
  ["< 1 day", (s) => s!.scheduled_days < 1],
  ["1–7 days", (s) => s!.scheduled_days < 7],
  ["1–4 weeks", (s) => s!.scheduled_days < 30],
  ["1–6 months", (s) => s!.scheduled_days < 180],
  ["6 months +", () => true],
];

function bucketOf(state: FsrsCard | undefined) {
  for (let i = 0; i < BUCKETS.length; i++) if (BUCKETS[i]![1](state)) return i;
  return BUCKETS.length - 1;
}

function drawBuckets() {
  const state = replay();
  const groups = BUCKETS.map((): CardItem[] => []);
  for (const c of cards) groups[bucketOf(state.get(c.id))]!.push(c);
  const max = Math.max(1, ...groups.map((g) => g.length));

  $("#buckets").innerHTML = "";
  BUCKETS.forEach(([label], i) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      $("#peek").textContent =
        groups[i]!.length > 0
          ? groups[i]!.map((c) => c.note.fields[c.tpl.answerField] ?? c.id).join(" · ")
          : "(empty)";
    });
    const bar = document.createElement("div");
    bar.className = "bucket-bar";
    bar.style.width = `${(groups[i]!.length / max) * 100}%`;
    bar.dataset["vizId"] = `bucket-${i}`;
    bar.dataset["label"] = `${groups[i]!.length} cards ${label}`;
    const n = document.createElement("span");
    n.textContent = String(groups[i]!.length);
    $("#buckets").append(btn, bar, n);
  });
}

/** Says what to do right now — the answer differs by mode and by whether the
 *  card is face-up, and guessing wrong is exactly what made this confusing. */
function hint() {
  const listening = micOn; // intent, not the recognition object — it restarts constantly
  if (!current) {
    $("#hint").innerHTML = "";
    return;
  }
  $("#hint").innerHTML = !revealed
    ? listening
      ? "Say the answer, then <kbd>lock it in</kbd>. Take your time \u2014 pausing does nothing. Stuck? Say <kbd>I don't know</kbd>."
      : "Type it and press <kbd>Enter</kbd>, or press <kbd>Enter</kbd> alone to give up."
    : listening
      ? "Now say <kbd>Again</kbd>, <kbd>Hard</kbd>, <kbd>Good</kbd> or <kbd>Easy</kbd>."
      : "How hard was that? Pick one \u2014 the highlighted button is the suggestion.";
}

// ─── voice ───────────────────────────────────────────────────────────────────
const COMMANDS: Record<string, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};
const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const DEAF = "Mic is open but hearing nothing — check your input device, or just type.";
// You commit deliberately. Silence used to commit for you, which punished
// thinking: pause to remember a name and it graded you as wrong.
const COMMIT = /\b(lock it in|lock in|submit|that'?s my answer)\b/iu;
const GIVEUP = /\b(i don'?t know|no idea|dunno|skip|pass)\b/iu;

let rec: SpeechRecognition | null = null;
// Intent, tracked apart from `rec`: Chrome ends a session on its own after a
// stretch of silence even with continuous = true, so `rec` ending does not mean
// you stopped wanting the mic on.
let micOn = false;
let startedAt = 0,
  gotAudio = false,
  stillborn = 0;
// Continuous recognition accumulates results for the whole session, so each
// card reads a window of them. `inFlightEnd` is one past the utterance being
// spoken right now — resetting to it discards that utterance whole. Rebasing
// onto its index instead would re-read the words that caused the reset ("lock
// it in", "good"), which is how they bled into the next card.
let speechFrom = 0,
  inFlightEnd = 0;
const resetSpeech = () => {
  speechFrom = inFlightEnd;
};

function setMic(on: boolean) {
  micOn = on;
  $("#mic").textContent = on ? "\u{1F399} Listening — click to stop" : "\u{1F399} Answer by voice";
  $("#mic").setAttribute("aria-pressed", String(on));
  hint();
}

function micFailed(msg: string) {
  setMic(false);
  try {
    rec?.abort();
  } catch {
    /* the session is already gone */
  }
  rec = null;
  $("#heard").textContent = msg;
}

function handleSpeech(said: string, settled: boolean) {
  // Addressing the assistant, not the card. Commands end on silence rather than
  // a commit phrase, because you do not pause mid-command the way you pause
  // mid-answer — that asymmetry is the whole reason answers need "lock it in".
  const wake = said.match(WAKE);
  if (wake) {
    const utterance = said.slice(wake.index! + wake[0].length).trim();
    $("#heard").textContent = `\u201C${said.trim()}\u201D`;
    if (settled && utterance) {
      resetSpeech();
      $("#heard").textContent = "";
      fire(command(utterance));
    }
    return;
  }
  if (!current) return;

  if (!revealed) {
    // Everything before the commit phrase is the answer, so you can ramble,
    // correct yourself, and only then commit. Nothing fires until you do.
    const hit = said.match(COMMIT);
    const spoken = hit ? said.slice(0, hit.index) : said;
    $("#heard").textContent = spoken.trim() ? `\u201C${spoken.trim()}\u201D` : "";
    if (GIVEUP.test(spoken)) {
      resetSpeech();
      return reveal("");
    }
    if (hit) {
      resetSpeech();
      return reveal(spoken);
    }
    return;
  }
  $("#heard").textContent = said.trim() ? `\u201C${said.trim()}\u201D` : "";
  const word = norm(said)
    .split(" ")
    .toReversed()
    .find((w) => w in COMMANDS);
  if (word) {
    resetSpeech();
    grade(COMMANDS[word]!);
  }
}

function build() {
  // One instance, reused across restarts. Building a fresh one per restart is
  // what let a failure compound into hundreds of thousands of sessions.
  const r = new SR!();
  r.continuous = true; // keep listening; no push-to-talk
  r.interimResults = true; // act on partials, mid-sentence
  r.lang = "en-US";
  // Chrome 139+ can recognise on-device, so audio never reaches a server.
  try {
    if ("processLocally" in r) r.processLocally = true;
  } catch {
    /* not supported: recognise remotely as before */
  }

  r.addEventListener("audiostart", () => {
    gotAudio = true;
    stillborn = 0;
    if ($("#heard").textContent === DEAF) $("#heard").textContent = "";
  });
  r.addEventListener("result", (e) => {
    // A restarted session starts its list over, stranding the old offset.
    if (speechFrom > e.results.length) speechFrom = 0;
    inFlightEnd = e.results.length;
    const chunk = [...e.results].slice(speechFrom);
    handleSpeech(
      chunk.map((x) => x[0]!.transcript).join(" "),
      chunk.some((x) => x.isFinal),
    );
  });
  r.addEventListener("error", (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return; // routine; onend restarts
    micFailed(
      e.error === "not-allowed"
        ? "Microphone blocked — allow it in the address bar, then click again."
        : `Microphone error: ${e.error}`,
    );
  });
  r.addEventListener("end", () => {
    if (!micOn) return;
    // A session that dies before the mic ever opened is a failure, not a
    // silence timeout. Restarting it immediately turns one failure into
    // thousands per second — a flickering recording indicator and no audio.
    if (Date.now() - startedAt < 500 && !gotAudio && ++stillborn >= 4) {
      micFailed(
        "Speech recognition keeps stopping before the mic opens. Type your answer instead.",
      );
      return;
    }
    setTimeout(() => {
      if (micOn) listen();
    }, 500);
  });
  return r;
}

function listen() {
  rec ??= build();
  startedAt = Date.now();
  gotAudio = false;
  // A session can stay open while no audio ever arrives — wrong input device,
  // muted hardware. Silence then looks identical to "listening, working fine",
  // which is exactly the failure that made this feel broken.
  setTimeout(() => {
    if (micOn && !gotAudio) $("#heard").textContent = DEAF;
  }, 4000);
  try {
    rec.start();
  } catch (e) {
    if (errName(e) !== "InvalidStateError") micFailed(`Could not start the mic: ${errName(e)}`);
  }
}

function toggleMic() {
  if (micOn) {
    setMic(false);
    try {
      rec?.abort();
    } catch {
      /* the session is already gone */
    }
    rec = null;
    if ($("#heard").textContent === DEAF) $("#heard").textContent = "";
    return;
  }
  if (!SR) {
    $("#heard").textContent = "This browser has no Web Speech API — Chrome does.";
    return;
  }
  stillborn = 0;
  setMic(true);
  listen();
}

// ─── sync: your history follows the code, not the device ─────────────────────
// A bearer capability, exactly like a private-tldraw room id: whoever holds the
// code is you. No account, no email, no password to lose. It lives in the URL
// FRAGMENT so it never reaches a server log or a Referer header — the endpoint
// gets it in a POST body instead.
//
// Decks deliberately do NOT sync. A deck is other people's names and faces;
// guarding that with a shared link is not good enough, and doing it properly
// would need the identity provider this whole design avoids. Load the file once
// per device; your history is already there when you do.
const SYNC_URL = "https://hgvsjhchqskii5lqrhfp64hqom0dqhwb.lambda-url.us-east-1.on.aws/";

function syncCode() {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("s");
  if (fromHash && /^[0-9a-f]{32}$/u.test(fromHash)) {
    localStorage.setItem("recall:code", fromHash);
    return fromHash;
  }
  let code = localStorage.getItem("recall:code");
  if (!code) {
    code = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem("recall:code", code);
  }
  // Put it back in the bar so bookmarking the page bookmarks the identity.
  history.replaceState(null, "", `#s=${code}`);
  return code;
}

const syncSays = (m: string) => {
  $("#sync").textContent = m;
};
let syncTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Push what is new, take back the union. Re-pushing is safe — the server keys an
 * event by its own content — so the high-water mark can be sloppy without ever
 * losing a review.
 */
async function syncNow() {
  if (!deck) return;
  const asked = deck;
  const mark = Number(localStorage.getItem(`recall:${asked.id}:synced`) ?? 0);
  const fresh = log.filter((e) => e[1] > mark);
  syncSays("syncing…");
  try {
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: syncCode(), deckId: asked.id, events: fresh }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = eventsAt(await res.json(), "events");

    // The learner may have switched decks while this was in flight: file the answer under the deck it was asked for.
    const sameDeck = asked.id === deck.id;
    const mine: LogEvent[] = sameDeck
      ? log
      : eventsAt(JSON.parse(localStorage.getItem(`recall:${asked.id}:log`) ?? "[]"));
    const seen = new Set(mine.map((e) => e.join("|")));
    let added = 0;
    for (const e of events)
      if (!seen.has(e.join("|"))) {
        mine.push(e);
        added++;
      }
    if (added) {
      mine.sort((a, b) => a[1] - b[1]);
      localStorage.setItem(`recall:${asked.id}:log`, JSON.stringify(mine));
      if (sameDeck) applyFilter();
    }
    let newest = 0;
    for (const e of mine) newest = Math.max(newest, e[1]);
    localStorage.setItem(`recall:${asked.id}:synced`, String(newest));
    syncSays(
      added
        ? `synced — pulled ${added} review${added === 1 ? "" : "s"} from another device`
        : "synced",
    );
  } catch (e) {
    // Never fatal. The log on this device is the source of truth; the server is
    // a convenience, and losing it must not cost you a study session.
    syncSays(`offline — reviews are saved here and will sync later (${errMessage(e)})`);
    // "Later" has to mean something. Without a retry, a session that goes offline
    // and comes back pushes nothing until you happen to grade again or reload —
    // and if the browser evicts storage first (Safari does, after 7 days) those
    // reviews are gone with it.
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => fire(syncNow()), 30000);
  }
}

/** Grading fires this; a burst of cards should cost one request, not twenty. */
function syncSoon() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => fire(syncNow()), 4000);
}

// ─── recents: what you have studied, and which file it came from ─────────────
// A page cannot reopen a file it was handed, so this is a reminder, not a link:
// it tells you which file to pick again on a machine that has your history but
// not your deck.
function remember(fileName: string | null | undefined) {
  const key = "recall:recents";
  const list = readRecents().filter((r) => r.id !== deck.id);
  list.unshift({ id: deck.id, name: deck.name, file: fileName ?? null, at: Date.now() });
  localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
  drawRecents();
}

function drawRecents() {
  const list = readRecents();
  $("#recents").innerHTML =
    list.length > 0
      ? "Studied before: " +
        list
          .map((r) => `${esc(r.name)}${r.file ? ` <span class="dim">(${esc(r.file)})</span>` : ""}`)
          .join(" · ")
      : "";
}

// ─── assistant: Chrome's built-in on-device model ────────────────────────────
// Gemini Nano via the Prompt API. No key, no server, no page-side download —
// Chrome supplies the model, so this stays a static shareable page. Absent
// browser support the app simply has no assistant; nothing else changes.
const WAKE = /\b(recall|rachel|recon)\b[,\s]*/iu; // homophones the recogniser hands back
let assistantSession: LanguageModelSession | null = null;

const says = (msg: string) => {
  $("#says").textContent = msg;
};
const nCards = (n: number) => `${n} card${n === 1 ? "" : "s"}`;

/**
 * Deliberately narrow: filter and stats only. Grading and revealing already have
 * deterministic keyword paths, and handing them to the model bought nothing while
 * costing correctness — with "grade" in the enum, "what is the capital of France"
 * came back as grade/good, i.e. an off-hand remark silently scoring your card.
 * Removing the intents it did not need removed the failure mode outright.
 *
 * Tags are an enum of the deck's real tags, so the model picks from a closed
 * vocabulary instead of inventing one — the same bet the answer matcher makes.
 */
const intentSchema = () => ({
  type: "object",
  properties: {
    intent: { type: "string", enum: ["filter", "stats", "unknown"] },
    tags: { type: "array", items: { type: "string", enum: deckTags() } },
    mode: { type: "string", enum: ["only", "except"] },
  },
  required: ["intent"],
});

// Few-shots earn their place: without the first two the model inverted "skip the
// alumni" into every-tag-but-alumni, which would have hidden the whole deck and
// kept exactly what you asked it to drop.
const SHOTS = [
  { role: "user", content: "skip the alumni" },
  { role: "assistant", content: '{"intent":"filter","tags":["alumni"],"mode":"except"}' },
  { role: "user", content: "only the Iowa folks" },
  { role: "assistant", content: '{"intent":"filter","tags":["loc:iowa"],"mode":"only"}' },
  { role: "user", content: "show everyone" },
  { role: "assistant", content: '{"intent":"filter","tags":[]}' },
  { role: "user", content: "how many have I done" },
  { role: "assistant", content: '{"intent":"stats"}' },
  { role: "user", content: "what year did the Titanic sink" },
  { role: "assistant", content: '{"intent":"unknown"}' },
];

async function assistant() {
  if (assistantSession) return assistantSession;
  if (!("LanguageModel" in self)) {
    says("This browser has no built-in model — Chrome 148+ does.");
    return null;
  }
  const state = await LanguageModel.availability();
  if (state === "unavailable") {
    says("Chrome's built-in model is unavailable on this device.");
    return null;
  }
  says(
    state === "available"
      ? "Waking the on-device model…"
      : "Fetching Chrome's on-device model, one time…",
  );
  try {
    assistantSession = await LanguageModel.create({
      monitor: (m) =>
        m.addEventListener("downloadprogress", (e) =>
          says(`Fetching Chrome's on-device model… ${Math.round((e.loaded ?? 0) * 100)}%`),
        ),
      initialPrompts: [
        {
          role: "system",
          content:
            `You route short spoken commands for a flashcard app studying "${deck.name}".` +
            ` Available tags: ${deckTags().join(", ")}.` +
            ` "filter" narrows which cards are studied. List ONLY the tags the user actually named — never the others.` +
            ` mode "only" keeps cards with those tags; mode "except" hides them. Empty tags clears the filter.` +
            ` "stats" reports study progress. Use "unknown" for anything else, including general questions.`,
        },
        ...SHOTS,
      ],
    });
  } catch (e) {
    says(`Could not start the on-device model: ${errName(e)}`);
    return null;
  }
  says("");
  return assistantSession;
}

async function command(utterance: string) {
  const session = await assistant();
  if (!session) return;
  says(`\u201C${utterance}\u201D …`);
  let plan: Plan;
  try {
    plan = toPlan(
      JSON.parse(await session.prompt(utterance, { responseConstraint: intentSchema() })),
    );
  } catch (e) {
    says(`Could not read that: ${errName(e)}`);
    return;
  }
  if (plan.intent === "stats") {
    const seen = replay().size;
    return says(`${seen} of ${nCards(cards.length)} seen, ${introducedToday()} new today.`);
  }
  if (plan.intent === "filter") {
    const tags = plan.tags ?? [];
    filter = tags.length > 0 ? { tags, mode: plan.mode ?? "only" } : null;
    applyFilter();
    return says(
      tags.length > 0
        ? `${plan.mode === "except" ? "Hiding" : "Showing only"} ${tags.join(", ")} — ${nCards(cards.length)}.`
        : `Studying the whole deck — ${nCards(cards.length)}.`,
    );
  }
  says("Didn't catch a command in that.");
}

// ─── deck loading and filtering ──────────────────────────────────────────────
let allCards: CardItem[] = []; // every card the deck can produce
let filter: { tags: string[]; mode: string } | null = null; // { tags: [...], mode: "only" | "except" }

/** Every tag in the deck — the vocabulary the assistant is allowed to filter by. */
const deckTags = () => [...new Set(deck.notes.flatMap((n) => n.tags ?? []))].toSorted();

function applyFilter() {
  const t = filter?.tags ?? [];
  cards =
    t.length === 0
      ? allCards
      : allCards.filter((c) => {
          const hit = t.some((tag) => c.note.tags?.includes(tag));
          return filter!.mode === "except" ? !hit : hit;
        });
  if (cards.length === 0) cards = allCards; // never strand the user with an empty deck

  // Notes no template could satisfy still exist — they are just unreviewable.
  // Say so, rather than letting those people silently vanish from the deck.
  const live = new Set(cards.map((c) => c.note.id));
  const cardless = deck.notes.filter((n) => !live.has(n.id) && inFilter(n));
  const label = (n: Note) => Object.values(n.fields)[0] ?? n.id;
  $("#gaps").textContent =
    cardless.length > 0
      ? `${cardless.length} in this deck produce no card — a field some template requires is missing: ${cardless.map(label).join(", ")}`
      : "";

  drawBuckets();
  const next = pickNext();
  if (next) show(next);
  else done();
}

function inFilter(note: Note) {
  const t = filter?.tags ?? [];
  if (t.length === 0) return true;
  const hit = t.some((tag) => note.tags?.includes(tag));
  return filter!.mode === "except" ? !hit : hit;
}

// ─── wiring ──────────────────────────────────────────────────────────────────
async function loadDeck(source: string | Deck) {
  if (typeof source === "string") {
    const fetched: unknown = await (await fetch(source)).json();
    if (!isDeck(fetched)) throw new TypeError(`${source} is not a deck`);
    deck = fetched;
  } else deck = source;
  allCards = buildCards(deck);
  filter = deck.defaultTags?.length ? { tags: deck.defaultTags, mode: "only" } : null;
  assistantSession = null; // a new deck means a new tag vocabulary
  loadLog();
  applyFilter();
  remember(typeof source === "string" ? null : source.__file);
  fire(syncNow());
}

$("#answer").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (revealed) grade(Rating.Good);
  else reveal($input("#answer").value);
});
$("#mic").addEventListener("click", toggleMic);
$("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ v: 1, deckId: deck.id, log })], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `recall-${deck.id}-progress.json`;
  a.click();
});
addEventListener("online", () => fire(syncNow()));
addEventListener("visibilitychange", () => {
  if (!document.hidden) fire(syncNow());
});

$("#mylink").addEventListener("click", () => {
  fire(
    navigator.clipboard
      .writeText(`${location.origin}${location.pathname}#s=${syncCode()}`)
      .then(() => syncSays("copied — this link carries your history, so keep it to yourself")),
  );
});
$("#applink").addEventListener("click", () => {
  fire(
    navigator.clipboard
      .writeText(`${location.origin}${location.pathname}`)
      .then(() => syncSays("copied the plain app link — no history attached")),
  );
});
$("#importBtn").addEventListener("click", () => $("#import").click());

async function importLog() {
  const f = $input("#import").files?.[0];
  if (!f) return;
  const incoming: unknown = JSON.parse(await f.text());
  // Events are immutable, so merging is dedupe-and-sort. No conflicts to resolve.
  const seen = new Set(log.map((x) => x.join("|")));
  for (const ev of eventsAt(incoming, "log")) if (!seen.has(ev.join("|"))) log.push(ev);
  log.sort((a, b) => a[1] - b[1]);
  saveLog();
  drawBuckets();
  refreshStatus();
}
$("#import").addEventListener("change", () => {
  fire(importLog());
});

async function openDeckFile() {
  const f = $input("#file").files?.[0];
  if (!f) return;
  const parsed: unknown = JSON.parse(await f.text());
  if (!isDeck(parsed)) throw new TypeError(`${f.name} is not a deck`);
  // __file is for the recents hint only; it is never persisted to the deck.
  await loadDeck({ ...parsed, __file: f.name });
}
$("#file").addEventListener("change", () => {
  fire(openDeckFile());
});
$("#demoBtn").addEventListener("click", () => {
  fire(loadDeck(DEMO));
});

fire(loadDeck(DEMO));
