// Shared by the key-vendor page's tests. The page and browser come from `viz.open()`; this adds a WORKING
// FAKE of the page's own backend (api.ts), so no test can touch /tmp state files, kubectl or a LiteLLM gateway.
//
// The fake keeps the two spec-based engines (Ansible, Terraform) and the two operators in memory and honours
// contract.ts, route for route:
//   /state /mutate /drift /reset /tf-plan /run-*   the emulated engines, with the reconcile decision table the page documents
//   /qs-*                                            the quickstart's preflight, kubernetes apply and "use the key"
//   /op-*                                            the operators' cards, and the seven things a person can do to them
// so a test asserts on the EFFECT of a click (a token changed, a budget drifted), not on a call.
//
//   const page = await open();          // fresh world: no key anywhere
//   await page.click('[data-s="create"]'); await idle(page);
//   page.world.eng.ansible.live         // → what the fake now holds
//   page.world.gate = deferred();       // hold the engine streams until the test releases them

import type { HTTPRequest, Page } from "puppeteer-core";
import type {
  Check,
  EngineState,
  OpAck,
  OpConsume,
  OpEngine,
  OpEngineName,
  OpLive,
  OpSecret,
  OpSpec,
  OpStatus,
  OpState,
  QsConsume,
  QsK8s,
  Routes,
  State,
  TfState,
} from "../contract.ts";

// ---- the world ---------------------------------------------------------------------------------------

type Eng = "ansible" | "terraform";
type Action = "GENERATE" | "UPDATE" | "ROTATE" | "SOFT-PRUNE" | "DESTROY" | "NO-OP";
interface LiveKey {
  tokenHash: string;
  version: number;
  budget: number;
  blocked: boolean;
  secret: string;
}
interface EngWorld {
  spec: { present: boolean; key_version: number; max_budget: number; blocked: boolean };
  live: LiveKey | null;
  unreachable: boolean;
}
interface OpWorld {
  cr: OpSpec | null;
  live: OpLive | null;
  secret: OpSecret | null;
  status: OpStatus | null;
  token: number;
}
export interface Deferred {
  promise: Promise<void>;
  release(): void;
}
export const deferred = (): Deferred => {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { promise, release };
};

export interface World {
  eng: Record<Eng, EngWorld>;
  op: Record<OpEngineName, OpWorld>;
  /** what the preflight checks report */
  checks: Check[];
  qsChecks: Check[];
  opChecks: Check[];
  /** the kubernetes quickstart: an unreachable cluster, an operator that is not deployed, or a minted secret */
  k8s: { offline: boolean; reconciled: boolean; minted: boolean };
  /** the engine streams wait for this before answering; `streamsFail` makes them fail outright */
  gate: Deferred | null;
  streamsFail: boolean;
  /** routes that answer 503 (the upstream is down), and routes held back until the test releases them */
  down: string[];
  hold: Record<string, Deferred>;
  /** the state file exists but holds no key secret */
  tfNoSecret: boolean;
  /** every api/ call the page made, as "METHOD /route?query" */
  calls: string[];
  mint: number;
}

const freshEng = (): EngWorld => ({
  spec: { present: true, key_version: 1, max_budget: 5, blocked: false },
  live: null,
  unreachable: false,
});
const freshOp = (): OpWorld => ({ cr: null, live: null, secret: null, status: null, token: 0 });

export const fixture = (): World => ({
  eng: { ansible: freshEng(), terraform: freshEng() },
  op: { ansible: freshOp(), java: freshOp() },
  checks: [
    { name: "LiteLLM gateway :4000", ok: true },
    { name: "SecretVault MySQL :3306", ok: false },
  ],
  qsChecks: [
    { name: "LiteLLM gateway :4000", ok: true },
    { name: "kind cluster (k8s)", ok: true },
  ],
  opChecks: [
    { name: "kind cluster", ok: true },
    { name: "operators deployed", ok: false },
  ],
  k8s: { offline: false, reconciled: true, minted: false },
  gate: null,
  streamsFail: false,
  down: [],
  hold: {},
  tfNoSecret: false,
  calls: [],
  mint: 0,
});

// ---- the emulated engines ----------------------------------------------------------------------------

const TAG: Record<Eng, string> = {
  ansible: "ansible-key-vendor",
  terraform: "terraform-key-vendor",
};
const ALIAS: Record<Eng, string> = {
  ansible: "classify-service-prod",
  terraform: "classify-service-tf-prod",
};

/** A key as the gateway mints it: a fresh token and a fresh 43-char secret each time. */
function mintKey(w: World, e: Eng): LiveKey {
  const n = ++w.mint,
    sp = w.eng[e].spec;
  return {
    tokenHash: `tok${String(n).padStart(9, "0")}`,
    version: sp.key_version,
    budget: sp.max_budget,
    blocked: sp.blocked,
    secret: `sk-m${n}`.padEnd(43, "a"),
  };
}

/** The reconcile decision table, as the page's contrast panel documents it. */
function decide(w: World, e: Eng): { action: Action; lines: string[] } {
  const st = w.eng[e],
    sp = st.spec;
  const done = (action: Action) => ({ action, lines: [`${e}: ${action}`] });
  if (!sp.present) {
    if (!st.live) return done("NO-OP");
    if (e === "ansible") {
      st.live.blocked = true;
      return done("SOFT-PRUNE");
    }
    st.live = null;
    return done("DESTROY");
  }
  if (!st.live) {
    st.live = mintKey(w, e);
    return done("GENERATE");
  }
  if (sp.key_version > st.live.version) {
    st.live = mintKey(w, e);
    return done("ROTATE");
  }
  if (st.live.budget !== sp.max_budget || st.live.blocked !== sp.blocked) {
    st.live.budget = sp.max_budget;
    st.live.blocked = sp.blocked;
    return done("UPDATE");
  }
  return done("NO-OP");
}

function engineState(w: World, e: Eng): EngineState {
  const { spec: sp, live: L, unreachable } = w.eng[e];
  const owner = "joseph@corp.com",
    models = "[nemo-guarded]";
  return {
    spec: sp.present
      ? {
          present: true,
          key_version: sp.key_version,
          max_budget: sp.max_budget,
          blocked: sp.blocked,
          models,
          owner,
          app: "classify-service",
          environment: "prod",
        }
      : { present: false, missing: true },
    litellm: unreachable
      ? {
          error: true,
          tokenHash: "",
          version: 0,
          budget: 0,
          blocked: false,
          models,
          owner,
          managed_by: TAG[e],
        }
      : L
        ? {
            tokenHash: L.tokenHash,
            version: L.version,
            budget: L.budget,
            blocked: L.blocked,
            models,
            owner,
            managed_by: TAG[e],
          }
        : null,
    vault: unreachable
      ? {
          error: true,
          key_alias: "",
          secretPrefix: "",
          secretLen: 0,
          owner,
          key_version: 0,
          updated_at: "",
        }
      : L
        ? {
            key_alias: ALIAS[e],
            secretPrefix: L.secret.slice(0, 9) + "…",
            secretLen: L.secret.length,
            owner,
            key_version: L.version,
            updated_at: "2026-09-28 10:00:00",
          }
        : null,
  };
}
function tfState(w: World): TfState {
  const L = w.eng.terraform.live;
  if (L && w.tfNoSecret) return { exists: true, hasSecret: false };
  return L
    ? {
        exists: true,
        bytes: 24576 + L.secret.length,
        hasSecret: true,
        secretPrefix: L.secret.slice(0, 9) + "…",
        line: `"key": "${L.secret.slice(0, 9)}…<${L.secret.length - 9} more chars, PLAINTEXT>"`,
      }
    : { exists: false };
}
const fullState = (w: World): State => ({
  ansible: engineState(w, "ansible"),
  terraform: engineState(w, "terraform"),
  tfstate: tfState(w),
});

/** What "Try it" shows for the spec-based universes. The page reads `state[engine]` off the `done` event. */
const sse = (events: [string, unknown][]) =>
  events.map(([ev, data]) => `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`).join("");

// ---- the operators -----------------------------------------------------------------------------------

const OPS = {
  ansible: {
    ns: "keyvendor-ansible",
    alias: "email-classification-service-aop-prod",
    tag: "ansible-operator",
  },
  java: {
    ns: "keyvendor-java",
    alias: "email-classification-service-jop-prod",
    tag: "java-operator",
  },
} as const;
const newToken = (o: OpWorld) => {
  o.token += 1;
  return `opt${String(o.token).padStart(3, "0")}abcdef0123456789xyz`;
};

function opEngine(name: OpEngineName, o: OpWorld): OpEngine {
  const drift = !!o.cr && !!o.live && o.live.maxBudget !== o.cr.maxBudget;
  return {
    engine: name,
    ns: OPS[name].ns,
    alias: OPS[name].alias,
    tag: OPS[name].tag,
    terminating: false,
    spec: o.cr && { ...o.cr },
    live: o.live && { ...o.live },
    secret: o.secret && { ...o.secret },
    status: o.status && { ...o.status },
    drift,
    crPresent: !!o.cr,
  };
}
const opState = (w: World): OpState => ({
  preflight: { ok: w.opChecks.every((c) => c.ok), checks: w.opChecks },
  engines: { ansible: opEngine("ansible", w.op.ansible), java: opEngine("java", w.op.java) },
  ts: 0,
});

/** The operator's resync: it reverts whatever was changed on the live key behind the spec's back. */
export function heal(w: World, name: OpEngineName): void {
  const o = w.op[name];
  if (o.cr && o.live) o.live.maxBudget = o.cr.maxBudget;
}

/** Make the spec and the live key agree, minting a new token when the key version moved. */
function reconcileOp(name: OpEngineName, o: OpWorld) {
  const cr = o.cr!,
    keyVersionMoved = !o.live || o.live.keyVersion !== cr.keyVersion;
  o.live = {
    keyVersion: cr.keyVersion,
    maxBudget: cr.maxBudget,
    blocked: false,
    env: "prod",
    tpm: 200000,
    rpm: 60,
  };
  o.secret ??= { name: `litellmkey-${name}`, valuePrefix: "sk-op1…", ownerRefs: 0 };
  if (keyVersionMoved || !o.status)
    o.status = {
      lastRotated: "1790000000",
      observedKeyVersion: cr.keyVersion,
      tokenHash: newToken(o),
      secretRef: o.secret.name,
    };
  else o.status = { ...o.status, observedKeyVersion: cr.keyVersion };
  o.secret.valuePrefix = `sk-op${o.token}…`;
}

const ack = (msg: string): OpAck => ({ ok: true, msg });
type Q = Record<string, string>;
/** The engine a request names; an unknown one is a bug in the test, so it throws. */
function asEng(v: string | undefined): Eng {
  if (v === "ansible" || v === "terraform") return v;
  throw new TypeError(`no such engine: ${String(v)}`);
}
function asOpEngine(v: string | undefined): OpEngineName {
  if (v === "ansible" || v === "java") return v;
  throw new TypeError(`no such operator: ${String(v)}`);
}
function opAction(w: World, route: string, q: Q): OpAck {
  const name = asOpEngine(q["engine"]),
    o = w.op[name];
  if (route === "/op-apply") {
    o.cr ??= {
      keyAlias: OPS[name].alias,
      keyVersion: 1,
      maxBudget: 5,
      models: ["nemo-guarded"],
      deletePolicy: "softDisable",
    };
    o.cr.blocked = false;
    reconcileOp(name, o);
    return ack("applied");
  }
  if (!o.cr) return { ok: false, msg: "no CR to change" };
  if (route === "/op-budget") {
    o.cr.maxBudget = Number(q["value"]);
    reconcileOp(name, o);
    return ack(`budget → ${q["value"]}`);
  }
  if (route === "/op-rotate") {
    o.cr.keyVersion += 1;
    reconcileOp(name, o);
    return ack(`keyVersion → ${o.cr.keyVersion}`);
  }
  if (route === "/op-tamper") {
    o.live!.maxBudget = 999;
    return ack("live budget → 999");
  }
  if (route === "/op-autorotate") {
    o.cr.rotationIntervalSeconds = q["on"] === "1" ? 30 : undefined;
    return ack(q["on"] === "1" ? "auto-rotate on" : "auto-rotate off");
  }
  if (route === "/op-delete") {
    if (q["policy"] === "hardDelete")
      Object.assign(o, { cr: null, live: null, secret: null, status: null });
    else {
      o.live = { ...o.live!, blocked: true };
      Object.assign(o, { cr: null, status: null });
    }
    return ack(`deleted (${q["policy"]})`);
  }
  return { ok: false, msg: `no stand-in for ${route}` };
}

// ---- routing -----------------------------------------------------------------------------------------

type Handlers = { [R in keyof Routes]?: (q: Q, w: World) => Routes[R]["reply"] };
const handlers: Handlers = {
  "/preflight": (_, w) => ({ ok: true as const, checks: w.checks }),
  "/qs-preflight": (_, w) => ({ checks: w.qsChecks }),
  "/state": (_, w) => fullState(w),
  "/mutate": (q, w) => {
    const sp = w.eng[asEng(q["engine"])].spec,
      op = q["op"];
    if (op === "budget") sp.max_budget = sp.max_budget === 5 ? 7 : 5;
    else if (op === "version") sp.key_version += 1;
    else if (op === "block") sp.blocked = true;
    else if (op === "remove") sp.present = false;
    else if (op === "restore") sp.present = true;
    return fullState(w);
  },
  "/drift": (q, w) => {
    const L = w.eng[asEng(q["engine"])].live;
    if (L) L.budget = 999;
    return fullState(w);
  },
  "/tf-plan": (_, w) => ({
    summary: w.eng.terraform.live
      ? "Plan: 0 to add, 1 to change, 0 to destroy."
      : "No changes. Your infrastructure matches the configuration.",
  }),
  "/reset": (_, w) => {
    w.eng.ansible = freshEng();
    w.eng.terraform = freshEng();
    return fullState(w);
  },
  "/qs-k8s": (_, w): QsK8s => {
    if (w.k8s.offline)
      return {
        offline: true,
        applyOut: [],
        reconciled: false,
        secretPrefix: "",
        tokenHash: "",
        secretRef: "",
        keyVersion: 0,
      };
    w.k8s.minted = w.k8s.reconciled;
    return {
      offline: false,
      applyOut: ["litellmkey.keyvendor.local/classify-service created"],
      reconciled: w.k8s.reconciled,
      secretPrefix: "sk-k8s0001…",
      tokenHash: "k8stoken0123456789…",
      secretRef: "litellmkey-classify-service",
      keyVersion: 1,
    };
  },
  "/qs-consume": (q, w): QsConsume => {
    const e = q["engine"] ?? "ansible";
    const eng = e === "k8s" ? null : asEng(e);
    const alias = eng === null ? "classify-service-aop-prod" : ALIAS[eng];
    const L =
      eng === null
        ? w.k8s.minted
          ? { secret: "sk-k8s0001".padEnd(43, "a") }
          : null
        : w.eng[eng].live;
    if (!L)
      return {
        ok: false,
        msg: "no minted key yet — run “Try it” above to author + converge the key first",
      };
    return {
      ok: true,
      keyPrefix: L.secret.slice(0, 9) + "…",
      keyLen: L.secret.length,
      model: "nemo-guarded",
      answer: "Refund-status inquiry, route to the refunds queue.",
      registered: { alias, owner: "joseph@corp.com" },
    };
  },
  "/op-state": (_, w) => opState(w),
  "/op-preflight": (_, w) => opState(w).preflight,
  "/op-consume": (q, w): OpConsume => {
    const o = w.op[asOpEngine(q["engine"])];
    if (!o.live) return { ok: false, msg: "no live key to consume: apply the CR first" };
    return {
      ok: true,
      envPreview: o.secret!.valuePrefix ?? "",
      length: 43,
      model: "nemo-guarded",
      answer: "Billing question, refunds queue.",
      registered: {
        alias: OPS[asOpEngine(q["engine"])].alias,
        owner: "joseph@corp.com",
        version: o.live.keyVersion,
      },
      bogus404: true,
    };
  },
};
for (const r of [
  "/op-apply",
  "/op-budget",
  "/op-rotate",
  "/op-tamper",
  "/op-autorotate",
  "/op-delete",
] as const)
  handlers[r] = (q, w) => opAction(w, r, q);

// The two EventSource routes: the engine reconciles when the stream is opened, and streams what it did.
async function stream(w: World, e: Eng) {
  if (w.streamsFail) return { status: 500, body: "the engine fell over" };
  await w.gate?.promise;
  const { action, lines } = decide(w, e);
  return {
    status: 200,
    body: sse([
      ...lines.map((line) => ["line", { line }] as [string, unknown]),
      ["done", { engine: e, action, state: fullState(w) }],
    ]),
  };
}

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/u, ""));
const unhandled = (e: unknown) => {
  // oxlint-disable-next-line no-void -- deliberate: an unhandled rejection is how a stray API call or a handler bug fails the run
  void Promise.reject(e instanceof Error ? e : new Error(String(e)));
};
const strayFails = (msg: string) => {
  unhandled(new Error(msg));
};

type VizPage = Page & { errors: string[] };
export type KVPage = VizPage & { world: World };
const isRoute = (r: string): r is keyof Routes => Object.hasOwn(handlers, r);

/** The page over the in-memory world. `world` changes it before the page first loads. */
export async function open(
  o: { world?: (w: World) => void; width?: number; height?: number } = {},
): Promise<KVPage> {
  const world = fixture();
  o.world?.(world);
  const serve = async (req: HTTPRequest): Promise<void> => {
    if (req.isInterceptResolutionHandled()) return;
    const u = new URL(req.url());
    if (u.origin !== BASE.origin) {
      await req.abort("blockedbyclient");
      return;
    }
    const route = u.pathname.match(/\/api(\/[^/]+)$/u)?.[1];
    if (route) {
      world.calls.push(`${req.method()} ${route}${u.search}`);
      const q = Object.fromEntries(u.searchParams);
      await world.hold[route]?.promise;
      if (world.down.includes(route)) {
        await req.respond({ status: 503, contentType: "text/plain", body: "upstream unreachable" });
        return;
      }
      if (route === "/run-ansible" || route === "/run-terraform") {
        const r = await stream(world, route === "/run-ansible" ? "ansible" : "terraform");
        await req.respond({ status: r.status, contentType: "text/event-stream", body: r.body });
        return;
      }
      const h = isRoute(route) ? handlers[route] : undefined;
      if (!h) {
        strayFails(`STRAY API CALL: ${req.method()} ${route} has no stand-in`);
        await req.respond({ status: 501, body: "no stand-in" });
        return;
      }
      await req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(h(q, world)),
      });
      return;
    }
    // the server's feedback widget reads this page's own feedback log
    if (u.pathname.includes("/_log/")) {
      await req.respond({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await req.continue();
  };
  const page: VizPage = await viz.open(undefined, {
    width: o.width,
    height: o.height,
    before: async (p: Page) => {
      // The dev server's feedback pill floats over the page's buttons; it is the server's overlay, not the page's.
      await p.evaluateOnNewDocument(() =>
        addEventListener("DOMContentLoaded", () =>
          document.head.append(
            Object.assign(document.createElement("style"), {
              textContent: "#viz-feedback { display: none !important; }",
            }),
          ),
        ),
      );
      await p.setRequestInterception(true);
      p.on("request", (req: HTTPRequest) => {
        serve(req).catch(unhandled);
      });
    },
  });
  return Object.assign(page, { world });
}

// ---- reading what the user sees ----------------------------------------------------------------------

/** The compare tab has drawn both engines' cards (the boot has read /preflight and /state). */
export async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      !!document.querySelector("#ans-spec .key") &&
      !!document.querySelector("#tf-spec .key") &&
      !!document.querySelector("#tfstate-box .lbl"),
    { timeout: 15_000 },
  );
}

/** A card as the user reads it: label → value ("token" → "tok000000001…"). */
export async function card(page: Page, sel: string): Promise<Record<string, string>> {
  const r = await page.$$eval(`${sel} .key`, (ks) =>
    Object.fromEntries(
      ks.map((k) => [
        k.textContent.replaceAll(/\s+/gu, " ").trim(),
        k.nextElementSibling!.textContent.replaceAll(/\s+/gu, " ").trim(),
      ]),
    ),
  );
  return r;
}

export async function text(page: Page, sel: string): Promise<string> {
  const r = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return r;
}

/** Click a scenario and wait for both engines to finish: the buttons are enabled again. */
export async function scenario(page: Page, key: string): Promise<void> {
  await page.click(`#scenbar [data-s="${key}"]`);
  await idle(page);
}
export async function idle(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLButtonElement>("#scenbar button")].every(
        (b) => !b.disabled,
      ),
    { timeout: 15_000 },
  );
}

export async function badges(page: Page): Promise<string[][]> {
  const r = await page.$$eval("#badges .badge", (bs) =>
    bs.map((b) => [
      b.className.replace("badge", "").trim(),
      b.textContent.replaceAll(/\s+/gu, " ").trim(),
    ]),
  );
  return r;
}
