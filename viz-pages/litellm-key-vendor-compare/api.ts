// EMULATED backend for the spec-based tabs (Compare + Quickstart).
//
// The standalone Ansible reconciler and Terraform stack this page used to drive
// were DELETED in commit b00312c ("consolidate key-vendor to the Kubernetes
// Operator"). Rather than animate dead `make keys-sync` / `tf-apply` shells, this
// is a faithful visual emulation: a desired/actual state machine that reproduces
// the exact reconcile decisions (GENERATE/UPDATE/ROTATE/SOFT-PRUNE/DESTROY/NO-OP)
// and streams believable engine output. No real infra is touched.
//
// The LIVE demo is the Operator tab — that one drives a real kind cluster.
// Routes + JSON shapes here match the originals 1:1 so the frontend is unchanged.
//
// State persistence: the viz server re-evaluates this module per request, so
// module memory resets each call. We persist to per-engine /tmp JSON files —
// per-engine (not one shared file) so the parallel ansible+terraform runs in the
// "create" scenario never clobber each other's write. ponytail: a file is the
// laziest durable store; per-engine files are the laziest race-free one.

import op from "./op-backend.ts";

const fs = require("fs");
const FILE = (e: string) => `/tmp/llm-kv-emu-${e}.json`;

const ENG = {
  ansible: { alias: "classify-service-prod", tag: "ansible-key-vendor" },
  terraform: { alias: "classify-service-tf-prod", tag: "terraform-key-vendor" },
} as const;
type Engine = keyof typeof ENG;

const hex = (n: number) => {
  const b = new Uint8Array(Math.ceil(n / 2));
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, n);
};
const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

type Spec = { present: boolean; key_version: number; max_budget: number; blocked: boolean; models: string; owner: string; app: string; environment: string };
type Live = { tokenHash: string; version: number; budget: number; blocked: boolean; models: string; owner: string; secret: string };
type EngState = { spec: Spec; live: Live | null; vaultUpdated: string };

const freshSpec = (): Spec => ({ present: true, key_version: 1, max_budget: 5, blocked: false, models: "[nemo-guarded]", owner: "joseph@corp.com", app: "classify-service", environment: "prod" });
const freshEng = (): EngState => ({ spec: freshSpec(), live: null, vaultUpdated: "" });
function load(e: Engine): EngState { try { return JSON.parse(fs.readFileSync(FILE(e), "utf8")); } catch { return freshEng(); } }
function save(e: Engine, s: EngState) { fs.writeFileSync(FILE(e), JSON.stringify(s)); }

const mint = (sp: Spec): Live => ({ tokenHash: hex(12), version: sp.key_version, budget: sp.max_budget, blocked: sp.blocked, models: sp.models, owner: sp.owner, secret: "sk-" + hex(40) });

// The reconcile brain — same decision table the UI documents. Mutates `st`.
function decide(st: EngState, e: Engine): { action: string; lines: string[] } {
  const sp = st.spec;
  if (!sp.present) {
    if (st.live) {
      if (e === "ansible") { st.live.blocked = true; st.vaultUpdated = stamp(); return { action: "SOFT-PRUNE", lines: ansLines("SOFT-PRUNE") }; }
      st.live = null; return { action: "DESTROY", lines: tfLines("DESTROY") };
    }
    return { action: "NO-OP", lines: e === "ansible" ? ansLines("NO-OP") : tfLines("NO-OP") };
  }
  if (!st.live) { st.live = mint(sp); st.vaultUpdated = stamp(); return { action: "GENERATE", lines: e === "ansible" ? ansLines("GENERATE") : tfLines("GENERATE") }; }
  if (sp.key_version > st.live.version) { st.live = mint(sp); st.vaultUpdated = stamp(); return { action: "ROTATE", lines: e === "ansible" ? ansLines("ROTATE") : tfLines("ROTATE") }; }
  if (st.live.budget !== sp.max_budget || st.live.blocked !== sp.blocked || st.live.models !== sp.models) {
    st.live.budget = sp.max_budget; st.live.blocked = sp.blocked; st.live.models = sp.models; st.vaultUpdated = stamp();
    return { action: "UPDATE", lines: e === "ansible" ? ansLines("UPDATE") : tfLines("UPDATE") };
  }
  return { action: "NO-OP", lines: e === "ansible" ? ansLines("NO-OP") : tfLines("NO-OP") };
}
function reconcile(e: Engine) { const st = load(e); const r = decide(st, e); save(e, st); return r; }

// --- state shapes (match the original backend exactly) --------------------
function engOut(e: Engine) {
  const { spec: sp, live: L, vaultUpdated } = load(e);
  return {
    spec: sp.present ? { present: true, key_version: sp.key_version, max_budget: sp.max_budget, blocked: sp.blocked, models: sp.models, owner: sp.owner, app: sp.app, environment: sp.environment } : { present: false, missing: true },
    litellm: L ? { tokenHash: L.tokenHash, version: L.version, budget: L.budget, blocked: L.blocked, models: L.models, owner: L.owner, managed_by: ENG[e].tag } : null,
    vault: L ? { key_alias: ENG[e].alias, secretPrefix: L.secret.slice(0, 9) + "…", secretLen: L.secret.length, owner: L.owner, key_version: L.version, updated_at: vaultUpdated } : null,
  };
}
function tfState() {
  const L = load("terraform").live;
  if (!L) return { exists: false };
  return { exists: true, bytes: 24576 + L.secret.length, hasSecret: true, secretPrefix: L.secret.slice(0, 9) + "…", line: `"key": "${L.secret.slice(0, 9)}…<${L.secret.length - 9} more chars, PLAINTEXT>"` };
}
const fullState = () => ({ ansible: engOut("ansible"), terraform: engOut("terraform"), tfstate: tfState() });

// --- scripted engine output (cosmetic; the `done` action is authoritative) --
function ansLines(a: string): string[] {
  const head = [
    "PLAY [reconcile LiteLLM keys] **********************************************", "",
    "TASK [discover : GET /key/list (managed_by=ansible-key-vendor)] ************", "ok: [localhost]", "",
    "TASK [converge : classify-service-prod] ***********************************",
  ];
  const body: Record<string, string[]> = {
    GENERATE: ['changed: [localhost] => {"msg":"GENERATE","do":"POST /key/generate"}'],
    UPDATE: ['changed: [localhost] => {"msg":"UPDATE","do":"POST /key/update (token stable)"}'],
    ROTATE: ['changed: [localhost] => {"msg":"ROTATE","do":"delete + generate → new token"}'],
    "SOFT-PRUNE": ["ok: [localhost] => orphans to soft-disable: [classify-service-prod]", 'changed: [localhost] => {"msg":"SOFT-PRUNE","do":"update {blocked:true} — recoverable"}'],
    "NO-OP": ['ok: [localhost] => {"msg":"NO-OP","do":"desired == actual, 0 API calls"}'],
  };
  const changed = a === "NO-OP" ? 0 : a === "SOFT-PRUNE" ? 1 : 2;
  return [...head, ...body[a], "",
    "TASK [sink : upsert SecretVault (MySQL) row] ******************************", a === "NO-OP" ? "ok: [localhost]" : "changed: [localhost]", "",
    "PLAY RECAP ****************************************************************",
    `localhost                  : ok=4    changed=${changed}    unreachable=0    failed=0`];
}
function tfLines(a: string): string[] {
  const addr = 'litellm_key.managed["classify-service-tf-prod"]';
  const m: Record<string, { plan: string[]; stat: string; apply: string[]; recap: string }> = {
    GENERATE: { plan: [`  # ${addr} will be created`, '  + resource "litellm_key" "managed" {', '      + key_alias  = "classify-service-tf-prod"', "      + max_budget = 5", "    }"], stat: "Plan: 1 to add, 0 to change, 0 to destroy.", apply: [`${addr}: Creating...`, `${addr}: Creation complete after 1s`], recap: "Apply complete! Resources: 1 added, 0 changed, 0 destroyed." },
    UPDATE: { plan: [`  # ${addr} will be updated in-place`, '  ~ resource "litellm_key" "managed" {', "      ~ max_budget = 5 -> 7", "    }"], stat: "Plan: 0 to add, 1 to change, 0 to destroy.", apply: [`${addr}: Modifying...`, `${addr}: Modifications complete after 0s`], recap: "Apply complete! Resources: 0 added, 1 changed, 0 destroyed." },
    ROTATE: { plan: [`  # ${addr} must be replaced`, '-/+ resource "litellm_key" "managed" {', "      ~ key_version = 1 -> 2 # forces replacement", "    }"], stat: "Plan: 1 to add, 0 to change, 1 to destroy.", apply: [`${addr}: Destroying...`, `${addr}: Destruction complete after 0s`, `${addr}: Creating...`, `${addr}: Creation complete after 1s`], recap: "Apply complete! Resources: 1 added, 0 changed, 1 destroyed." },
    DESTROY: { plan: [`  # ${addr} will be destroyed`, '  - resource "litellm_key" "managed" {', '      - key_alias = "classify-service-tf-prod" -> null', "    }"], stat: "Plan: 0 to add, 0 to change, 1 to destroy.", apply: [`${addr}: Destroying...`, `${addr}: Destruction complete after 0s`], recap: "Destroy complete! Resources: 1 destroyed." },
    "NO-OP": { plan: [], stat: "No changes. Your infrastructure matches the configuration.", apply: [], recap: "" },
  };
  const x = m[a];
  const out = ["Terraform used the selected providers to generate the following execution", "plan. Resource actions are indicated with the following symbols:", ""];
  if (x.plan.length) out.push("Terraform will perform the following actions:", "", ...x.plan, "");
  out.push(x.stat, "");
  if (x.apply.length) out.push(...x.apply, "");
  if (x.recap) out.push(x.recap);
  return out;
}

function runStream(e: Engine) {
  const { action, lines } = reconcile(e);
  return new Response(new ReadableStream({
    async start(c) {
      const enc = new TextEncoder();
      const send = (event: string, data: any) => c.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      for (const line of lines) { send("line", { line }); await Bun.sleep(120); }
      send("done", { engine: e, action, state: fullState() });
      c.close();
    },
  }), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

const param = (req: Request, k: string) => new URL(req.url).searchParams.get(k);
const GREEN = (names: string[]) => ({ checks: names.map((name) => ({ name, ok: true })) });

export default {
  "/preflight": () => Response.json({ ok: true, ...GREEN(["LiteLLM gateway :4000", "SecretVault MySQL :3306"]) }),
  "/qs-preflight": () => Response.json(GREEN(["LiteLLM gateway :4000", "SecretVault MySQL", "kind cluster (k8s)"])),
  "/state": () => Response.json(fullState()),

  "/mutate": (req: Request) => {
    const e = param(req, "engine") as Engine, op = param(req, "op"), st = load(e), sp = st.spec;
    if (op === "budget") sp.max_budget = sp.max_budget === 5 ? 7 : 5;
    else if (op === "version") sp.key_version += 1;
    else if (op === "block") sp.blocked = true;
    else if (op === "unblock") sp.blocked = false;
    else if (op === "remove") sp.present = false;
    else if (op === "restore") sp.present = true;
    save(e, st);
    return Response.json(fullState());
  },

  // Out-of-band drift: bump the LIVE budget directly, bypassing both engines.
  "/drift": (req: Request) => { const e = param(req, "engine") as Engine, st = load(e); if (st.live) { st.live.budget = 999; save(e, st); } return Response.json(fullState()); },
  "/tf-plan": () => Response.json({ summary: load("terraform").live ? "Plan: 0 to add, 1 to change, 0 to destroy." : "No changes. Your infrastructure matches the configuration." }),

  "/reset": (req: Request) => {
    const w = param(req, "engine");
    if (w === "ansible" || w === "terraform") save(w, freshEng());
    else { save("ansible", freshEng()); save("terraform", freshEng()); }
    return Response.json(fullState());
  },

  "/run-ansible": () => runStream("ansible"),
  "/run-terraform": () => runStream("terraform"),

  // Quickstart Kubernetes universe — emulated apply + operator reconcile.
  "/qs-k8s": () => {
    const secret = "sk-" + hex(40);
    fs.writeFileSync(FILE("k8s"), JSON.stringify({ reconciled: true, secret }));
    return Response.json({ offline: false, applyOut: ["litellmkey.keyvendor.local/classify-service created"], reconciled: true, secretPrefix: secret.slice(0, 10) + "…", tokenHash: hex(16) + "…", secretRef: "litellmkey-classify-service", keyVersion: 1 });
  },

  // "Use the key in my app" — a canned, believable classification answer.
  "/qs-consume": (req: Request) => {
    const e = param(req, "engine") || "ansible";
    let secret: string | null = null, alias = "", owner = "joseph@corp.com";
    if (e === "k8s") { try { const k = JSON.parse(fs.readFileSync(FILE("k8s"), "utf8")); if (k.reconciled) { secret = k.secret; alias = "classify-service-aop-prod"; } } catch {} }
    else { const L = load(e as Engine).live; if (L) { secret = L.secret; alias = ENG[e as Engine].alias; owner = load(e as Engine).spec.owner; } }
    if (!secret) return Response.json({ ok: false, msg: "no minted key yet — run “Try it” above to author + converge the key first" });
    return Response.json({
      ok: true, keyPrefix: secret.slice(0, 9) + "…", keyLen: secret.length, model: "nemo-guarded",
      answer: "Refund-status inquiry — the customer reports a missing refund for order 8842 and wants an update. Category: billing/refunds; tone: neutral-to-frustrated; suggested route: refunds queue.",
      registered: { alias, owner },
    });
  },

  // Operator (live K8s) tab — the standalone operator backend reused verbatim,
  // namespaced /op-* so its /state + /preflight don't collide with the ones above.
  ...Object.fromEntries(Object.entries(op as Record<string, (r: Request) => unknown>).map(([k, h]) => ["/op-" + k.slice(1), h])),
};

// ponytail: one runnable check on the reconcile brain — `bun api.ts`.
if (import.meta.main) {
  const st = freshEng(); const act = (e: Engine) => decide(st, e).action;
  console.assert(act("ansible") === "GENERATE", "create → GENERATE");
  console.assert(act("ansible") === "NO-OP", "re-run → NO-OP");
  st.spec.max_budget = 7;
  console.assert(act("ansible") === "UPDATE", "budget → UPDATE");
  st.spec.key_version = 2;
  console.assert(act("ansible") === "ROTATE", "version → ROTATE");
  st.spec.present = false;
  console.assert(act("ansible") === "SOFT-PRUNE", "remove → SOFT-PRUNE (ansible)");
  const tf = freshEng(); decide(tf, "terraform"); tf.spec.present = false;
  console.assert(decide(tf, "terraform").action === "DESTROY", "remove → DESTROY (terraform)");
  console.log("emulation self-check ok");
}
