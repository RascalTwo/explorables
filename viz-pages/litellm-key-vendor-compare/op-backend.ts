import type { Handlers } from "@viz/kit/api.js";
import { z } from "@viz/kit/zod.js";
import type { OpApi } from "./contract.ts";
import { readFileSync } from "node:fs";

// Live backend for the K8s operator key-vendor viz. Drives BOTH operators on the
// kind-keyvendor cluster (kubectl) + queries the live LiteLLM gateway (curl/fetch).
// Runs with full local privileges but only binds to 127.0.0.1; secrets are redacted
// before they reach the browser. Module state is recreated per request — re-derive.
// Point at a local PoC checkout; unset means the live-data panel stays empty.
const POC = process.env.KEYVENDOR_POC ?? "";
const LITELLM = "http://localhost:4000";
const CTX = "kind-keyvendor";

const ENGINES: Record<
  string,
  { ns: string; alias: string; cr: string; crName: string; tag: string }
> = {
  ansible: {
    ns: "keyvendor-ansible",
    alias: "email-classification-service-aop-prod",
    cr: "platform/operators/examples/email-classification-service-ansible.yaml",
    crName: "email-classification-service",
    tag: "ansible-operator",
  },
  java: {
    ns: "keyvendor-java",
    alias: "email-classification-service-jop-prod",
    cr: "platform/operators/examples/email-classification-service-java.yaml",
    crName: "email-classification-service",
    tag: "java-operator",
  },
};

async function sh(cmd: string[], cwd = POC): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env } });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  const code = await p.exited;
  return { code, out: out.trim(), err: err.trim() };
}
async function k(args: string[]) {
  const r = await sh(["kubectl", "--context", CTX, ...args]);
  return r;
}

/** The engine's config; an unknown name throws (as the bare lookup always did, on its first field read). */
function eng(name: string) {
  const e = ENGINES[name];
  if (!e) throw new TypeError(`unknown engine: ${name}`);
  return e;
}

function masterKey(): string {
  const env = readFileSync(`${POC}/.env`, "utf8");
  const m = env.match(/^LITELLM_MASTER_KEY=(.*)$/mu);
  return m?.[1]?.trim() ?? "";
}
// What the two upstream servers answer, only the fields read below. kubectl's objects are forwarded to
// the page (spec, status), so those are passthrough objects; everything LiteLLM says may be null or absent.
const Str = z.string().nullish(),
  Num = z.number().nullish();
const Cr = z.object({
  metadata: z.object({ deletionTimestamp: z.unknown() }).nullish(),
  spec: z
    .object({
      keyAlias: z.string(),
      keyVersion: z.number(),
      maxBudget: z.number(),
      models: z.array(z.string()).optional(),
      deletePolicy: z.string().optional(),
      blocked: z.boolean().optional(),
      rotationIntervalSeconds: z.number().optional(),
    })
    .passthrough()
    .nullish(),
  status: z
    .object({
      lastRotated: z.string().optional(),
      observedKeyVersion: z.unknown(),
      tokenHash: z.string().optional(),
      secretRef: z.string().optional(),
    })
    .passthrough()
    .nullish(),
});
const K8sSecret = z.object({
  data: z.object({ secret_value: Str }).nullish(),
  metadata: z.object({
    name: z.string(),
    ownerReferences: z.array(z.unknown()).nullish(),
    labels: z.record(z.string(), z.string()).nullish(),
  }),
});
const LiveKeyRow = z.object({
  token: Str,
  key_alias: Str,
  max_budget: Num,
  blocked: z.boolean().nullish(),
  models: z.array(z.string()).nullish(),
  tpm_limit: Num,
  rpm_limit: Num,
  metadata: z.object({ managed_by: Str, key_version: Num, environment: Str, owner: Str }).nullish(),
});
const KeyList = z.object({ keys: z.array(z.unknown()).nullish() });
const KeyInfo = z.object({
  key_alias: Str,
  metadata: z.object({ owner: Str, key_version: z.unknown() }).nullish(),
});
const KeyInfoReply = KeyInfo.extend({ info: KeyInfo.nullish() });
const ChatReply = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: Str, reasoning_content: Str }).nullish() }))
    .nullish(),
});

async function gw<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { method?: string; body?: string } = {},
): Promise<T> {
  const r = await fetch(`${LITELLM}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${masterKey()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  const t = await r.text();
  return schema.parse(t ? JSON.parse(t) : {});
}
/** The managed key with this alias, or null. A row that is not shaped like a key cannot be ours, so it is skipped. */
async function liveKey(alias: string, tag: string) {
  try {
    const j = await gw(`/key/list?return_full_object=true&size=100`, KeyList);
    for (const x of j.keys ?? []) {
      const row = LiveKeyRow.safeParse(x);
      if (row.success && row.data.key_alias === alias && row.data.metadata?.managed_by === tag)
        return row.data;
    }
    return null;
  } catch {
    return null; /* gateway down or a bad reply: no live key */
  }
}

/** The CR (spec + status), or null when it is absent (deleted) or not shaped like one. */
async function readCr(e: ReturnType<typeof eng>) {
  const crRes = await k(["-n", e.ns, "get", "litellmkey", e.crName, "-o", "json"]);
  if (crRes.code !== 0) return null;
  try {
    return Cr.parse(JSON.parse(crRes.out));
  } catch {
    return null; /* unparsable kubectl output: treat as absent */
  }
}
/** The namespaced Secret, with the sk- value redacted to a prefix. */
async function readSecret(e: ReturnType<typeof eng>) {
  const secRes = await k(["-n", e.ns, "get", "secret", `litellmkey-${e.crName}`, "-o", "json"]);
  if (secRes.code !== 0) return null;
  try {
    const s = K8sSecret.parse(JSON.parse(secRes.out));
    const raw = s.data?.secret_value
      ? Buffer.from(s.data.secret_value, "base64").toString("utf8")
      : "";
    return {
      name: s.metadata.name,
      valuePrefix: raw ? raw.slice(0, 10) + "…" : null,
      ownerRefs: (s.metadata.ownerReferences ?? []).length,
      labels: s.metadata.labels ?? {},
    };
  } catch {
    return null; /* unparsable kubectl output: treat as absent */
  }
}

async function engineState(engine: string) {
  const e = eng(engine);
  const cr = await readCr(e);
  const live = await liveKey(e.alias, e.tag);
  const secret = await readSecret(e);
  const spec = cr?.spec ?? null;
  const status = cr?.status ?? null;
  const liveBudget = live ? live.max_budget : null;
  const specBudget = spec ? spec.maxBudget : null;
  const drift = live && spec && liveBudget !== specBudget; // out-of-band budget mismatch
  return {
    engine,
    ns: e.ns,
    alias: e.alias,
    tag: e.tag,
    crPresent: !!cr,
    terminating: !!cr?.metadata?.deletionTimestamp,
    spec,
    status,
    live: live
      ? {
          keyVersion: live.metadata?.key_version,
          maxBudget: live.max_budget,
          blocked: !!live.blocked,
          models: live.models,
          tpm: live.tpm_limit,
          rpm: live.rpm_limit,
          env: live.metadata?.environment,
          owner: live.metadata?.owner,
        }
      : null,
    secret,
    drift,
  };
}

async function fullState() {
  const [pf, ansible, java] = await Promise.all([
    preflight(),
    engineState("ansible"),
    engineState("java"),
  ]);
  return { preflight: pf, engines: { ansible, java }, ts: Date.now() };
}

async function preflight() {
  const checks: { name: string; ok: boolean }[] = [];
  const nodes = await k(["get", "nodes", "-o", "name"]);
  checks.push({ name: "kind cluster", ok: nodes.code === 0 });
  let gwOk = false;
  try {
    gwOk = (await fetch(`${LITELLM}/health/readiness`, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    /* unreachable gateway: reported as not ok */
  }
  checks.push({ name: "LiteLLM gateway :4000", ok: gwOk });
  const aOp = await k([
    "-n",
    "keyvendor-ansible",
    "get",
    "deploy",
    "litellmkey-operator",
    "-o",
    "name",
  ]);
  checks.push({ name: "ansible operator", ok: aOp.code === 0 });
  const jOp = await k([
    "-n",
    "keyvendor-java",
    "get",
    "deploy",
    "litellmkey-java-operator",
    "-o",
    "name",
  ]);
  checks.push({ name: "java operator", ok: jOp.code === 0 });
  return { ok: checks.every((c) => c.ok), checks };
}

// ---- actions (POST). Each returns {ok, msg}; the frontend re-polls /state. ----
function qp(req: Request, name: string) {
  return new URL(req.url).searchParams.get(name) ?? "";
}

async function apply(engine: string) {
  const r = await k(["apply", "-f", `${POC}/${eng(engine).cr}`]);
  return { ok: r.code === 0, msg: r.code === 0 ? "CR applied" : r.err };
}
async function patchSpec(engine: string, patch: object) {
  const e = eng(engine);
  const r = await k([
    "-n",
    e.ns,
    "patch",
    "litellmkey",
    e.crName,
    "--type=merge",
    "-p",
    JSON.stringify({ spec: patch }),
  ]);
  return { ok: r.code === 0, msg: r.code === 0 ? "patched" : r.err };
}
async function rotate(engine: string) {
  const e = eng(engine);
  const cur = await k([
    "-n",
    e.ns,
    "get",
    "litellmkey",
    e.crName,
    "-o",
    "jsonpath={.spec.keyVersion}",
  ]);
  const next = (Math.trunc(Number(cur.out || "1")) || 1) + 1;
  return { ...(await patchSpec(engine, { keyVersion: next })), msg: `keyVersion → ${next}` };
}
async function tamper(engine: string) {
  const e = eng(engine);
  const live = await liveKey(e.alias, e.tag);
  if (!live) return { ok: false, msg: "no live key to tamper" };
  await gw(`/key/update`, z.unknown(), {
    method: "POST",
    body: JSON.stringify({ key: live.token, max_budget: 999 }),
  });
  return { ok: true, msg: "out-of-band budget=999 — watch it self-heal" };
}
async function del(engine: string, policy: string) {
  const e = eng(engine);
  await patchSpec(engine, { deletePolicy: policy });
  const r = await k(["-n", e.ns, "delete", "litellmkey", e.crName, "--wait=false"]);
  return { ok: r.code === 0, msg: r.code === 0 ? `delete (${policy}) — finalizer running` : r.err };
}

// ---- CONSUMER pattern: a pod mounts the operator's Secret as an env var, then
// uses it to actually call LiteLLM. Proves the vend→Secret→app→working-call loop.
async function kApply(yaml: string): Promise<number> {
  const p = Bun.spawn(["kubectl", "--context", CTX, "apply", "-f", "-"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  await p.stdin.write(yaml);
  await p.stdin.end();
  await new Response(p.stdout).text();
  await new Response(p.stderr).text();
  return p.exited;
}
const CONSUMER_POD = "key-consumer";
async function ensureConsumerPod(ns: string): Promise<boolean> {
  const phase = await k(["-n", ns, "get", "pod", CONSUMER_POD, "-o", "jsonpath={.status.phase}"]);
  if (phase.code === 0 && phase.out === "Running") return true;
  if (phase.code === 0 && phase.out) await k(["-n", ns, "delete", "pod", CONSUMER_POD, "--now"]); // Completed/Failed → recreate
  await kApply(`apiVersion: v1
kind: Pod
metadata: { name: ${CONSUMER_POD}, namespace: ${ns}, labels: { app: key-consumer } }
spec:
  restartPolicy: Never
  containers:
    - name: app
      image: curlimages/curl:8.11.1
      command: ["sleep", "900"]
      env:
        - name: LLM_KEY
          valueFrom: { secretKeyRef: { name: litellmkey-email-classification-service, key: secret_value } }
        - name: GW
          value: http://host.containers.internal:4000
`);
  const w = await k([
    "-n",
    ns,
    "wait",
    "--for=condition=Ready",
    `pod/${CONSUMER_POD}`,
    "--timeout=60s",
  ]);
  return w.code === 0;
}
async function consume(engine: string) {
  const e = eng(engine);
  if (!(await ensureConsumerPod(e.ns)))
    return {
      ok: false as const,
      msg: "consumer pod not ready (is the Secret present? apply the CR first)",
    };
  // (a) what the pod sees: redacted key from the mounted env var
  const env = await k([
    "-n",
    e.ns,
    "exec",
    CONSUMER_POD,
    "--",
    "sh",
    "-c",
    'echo "${LLM_KEY%"${LLM_KEY#??????}"}|${#LLM_KEY}"',
  ]);
  const [envPreview = "", length = ""] = (env.out || "|").split("|");
  // (b) the pod calls LiteLLM WITH that key — on-topic email classification
  const body = JSON.stringify({
    model: "nemo-guarded",
    messages: [
      {
        role: "user",
        content:
          "Classify this customer email in one short sentence: Hello, I have not received my refund for order 8842. Please advise.",
      },
    ],
    max_tokens: 400,
  });
  const call = await k([
    "-n",
    e.ns,
    "exec",
    CONSUMER_POD,
    "--",
    "sh",
    "-c",
    `curl -s -m 120 -X POST "$GW/v1/chat/completions" -H "Authorization: Bearer $LLM_KEY" -H "Content-Type: application/json" -d '${body}'`,
  ]);
  let answer = "(no response)";
  try {
    const j = ChatReply.parse(JSON.parse(call.out));
    const m = j.choices?.[0]?.message;
    answer = [m?.content, m?.reasoning_content].find(Boolean) ?? "(empty)";
  } catch {
    answer = call.err || call.out || "(call failed)";
  }
  // (c) provenance: this exact key is a registered LiteLLM identity; a bogus one isn't
  let registered: {
      alias: string | null | undefined;
      owner: string | null | undefined;
      version: unknown;
    } | null = null,
    bogus404 = false;
  try {
    const key = Buffer.from(
      (
        await k([
          "-n",
          e.ns,
          "get",
          "secret",
          "litellmkey-email-classification-service",
          "-o",
          "jsonpath={.data.secret_value}",
        ])
      ).out,
      "base64",
    ).toString("utf8");
    const info = await gw(`/key/info?key=${key}`, KeyInfoReply);
    const i = info.info ?? info;
    registered = { alias: i.key_alias, owner: i.metadata?.owner, version: i.metadata?.key_version };
    const r = await fetch(`${LITELLM}/key/info?key=sk-totally-bogus-99999`, {
      headers: { Authorization: `Bearer ${masterKey()}` },
      signal: AbortSignal.timeout(5000),
    });
    bogus404 = r.status === 404;
  } catch {
    /* provenance is best-effort: leave registered/bogus404 as they are */
  }
  return {
    ok: true as const,
    envPreview: (envPreview || "sk-…") + "…",
    length: Math.trunc(Number(length || "0")),
    model: "nemo-guarded",
    answer: answer.slice(0, 280),
    registered,
    bogus404,
  };
}

export default {
  "/state": async () => {
    const r = await fullState();
    return r;
  },
  "/preflight": async () => {
    const r = await preflight();
    return r;
  },
  "/apply": async (req) => {
    const r = await apply(qp(req, "engine"));
    return r;
  },
  "/budget": async (req) => {
    const r = await patchSpec(qp(req, "engine"), {
      maxBudget: Math.trunc(Number(qp(req, "value") || "5")),
    });
    return r;
  },
  "/rotate": async (req) => {
    const r = await rotate(qp(req, "engine"));
    return r;
  },
  "/tamper": async (req) => {
    const r = await tamper(qp(req, "engine"));
    return r;
  },
  "/autorotate": async (req) => {
    const on = qp(req, "on") === "1";
    const r = await patchSpec(qp(req, "engine"), { rotationIntervalSeconds: on ? 60 : null });
    return r;
  },
  "/delete": async (req) => {
    const r = await del(qp(req, "engine"), qp(req, "policy") || "softDisable");
    return r;
  },
  "/consume": async (req) => {
    const r = await consume(qp(req, "engine"));
    return r;
  },
} satisfies Handlers<OpApi>;
