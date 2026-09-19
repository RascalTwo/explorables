// Live backend for the K8s operator key-vendor viz. Drives BOTH operators on the
// kind-keyvendor cluster (kubectl) + queries the live LiteLLM gateway (curl/fetch).
// Runs with full local privileges but only binds to 127.0.0.1; secrets are redacted
// before they reach the browser. Module state is recreated per request — re-derive.
// Point at a local PoC checkout; unset means the live-data panel stays empty.
const POC = process.env.KEYVENDOR_POC ?? "";
const LITELLM = "http://localhost:4000";
const CTX = "kind-keyvendor";

const ENGINES: Record<string, { ns: string; alias: string; cr: string; crName: string; tag: string }> = {
  ansible: { ns: "keyvendor-ansible", alias: "email-classification-service-aop-prod", cr: "platform/operators/examples/email-classification-service-ansible.yaml", crName: "email-classification-service", tag: "ansible-operator" },
  java: { ns: "keyvendor-java", alias: "email-classification-service-jop-prod", cr: "platform/operators/examples/email-classification-service-java.yaml", crName: "email-classification-service", tag: "java-operator" },
};

async function sh(cmd: string[], cwd = POC): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env } });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  const code = await p.exited;
  return { code, out: out.trim(), err: err.trim() };
}
const k = (args: string[]) => sh(["kubectl", "--context", CTX, ...args]);

function masterKey(): string {
  const env = require("fs").readFileSync(`${POC}/.env`, "utf8");
  const m = env.match(/^LITELLM_MASTER_KEY=(.*)$/m);
  return m ? m[1].trim() : "";
}
async function gw(path: string, init: any = {}): Promise<any> {
  const r = await fetch(`${LITELLM}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${masterKey()}`, "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(6000),
  });
  const t = await r.text();
  return t ? JSON.parse(t) : {};
}
async function liveKey(alias: string, tag: string): Promise<any | null> {
  try {
    const j = await gw(`/key/list?return_full_object=true&size=100`);
    return (j.keys || []).find((x: any) => x.key_alias === alias && (x.metadata || {}).managed_by === tag) || null;
  } catch { return null; }
}

async function engineState(engine: string) {
  const e = ENGINES[engine];
  // CR (spec + status) — may be absent (deleted)
  const crRes = await k(["-n", e.ns, "get", "litellmkey", e.crName, "-o", "json"]);
  let cr: any = null;
  if (crRes.code === 0) { try { cr = JSON.parse(crRes.out); } catch {} }
  // live LiteLLM key
  const live = await liveKey(e.alias, e.tag);
  // namespaced Secret (redact the sk- value to a prefix)
  const secRes = await k(["-n", e.ns, "get", "secret", `litellmkey-${e.crName}`, "-o", "json"]);
  let secret: any = null;
  if (secRes.code === 0) {
    try {
      const s = JSON.parse(secRes.out);
      const raw = s.data?.secret_value ? Buffer.from(s.data.secret_value, "base64").toString("utf8") : "";
      secret = {
        name: s.metadata.name,
        valuePrefix: raw ? raw.slice(0, 10) + "…" : null,
        ownerRefs: (s.metadata.ownerReferences || []).length,
        labels: s.metadata.labels || {},
      };
    } catch {}
  }
  const spec = cr?.spec || null;
  const status = cr?.status || null;
  const liveBudget = live ? live.max_budget : null;
  const specBudget = spec ? spec.maxBudget : null;
  const drift = live && spec && liveBudget !== specBudget; // out-of-band budget mismatch
  return {
    engine, ns: e.ns, alias: e.alias, tag: e.tag,
    crPresent: !!cr,
    terminating: !!cr?.metadata?.deletionTimestamp,
    spec, status,
    live: live ? {
      keyVersion: (live.metadata || {}).key_version,
      maxBudget: live.max_budget, blocked: !!live.blocked,
      models: live.models, tpm: live.tpm_limit, rpm: live.rpm_limit,
      env: (live.metadata || {}).environment, owner: (live.metadata || {}).owner,
    } : null,
    secret, drift,
  };
}

async function fullState() {
  const [pf, ansible, java] = await Promise.all([preflight(), engineState("ansible"), engineState("java")]);
  return { preflight: pf, engines: { ansible, java }, ts: Date.now() };
}

async function preflight() {
  const checks: { name: string; ok: boolean }[] = [];
  const nodes = await k(["get", "nodes", "-o", "name"]);
  checks.push({ name: "kind cluster", ok: nodes.code === 0 });
  let gwOk = false;
  try { gwOk = (await fetch(`${LITELLM}/health/readiness`, { signal: AbortSignal.timeout(3000) })).ok; } catch {}
  checks.push({ name: "LiteLLM gateway :4000", ok: gwOk });
  const aOp = await k(["-n", "keyvendor-ansible", "get", "deploy", "litellmkey-operator", "-o", "name"]);
  checks.push({ name: "ansible operator", ok: aOp.code === 0 });
  const jOp = await k(["-n", "keyvendor-java", "get", "deploy", "litellmkey-java-operator", "-o", "name"]);
  checks.push({ name: "java operator", ok: jOp.code === 0 });
  return { ok: checks.every((c) => c.ok), checks };
}

// ---- actions (POST). Each returns {ok, msg}; the frontend re-polls /state. ----
function qp(req: Request, name: string) { return new URL(req.url).searchParams.get(name) || ""; }

async function apply(engine: string) {
  const r = await k(["apply", "-f", `${POC}/${ENGINES[engine].cr}`]);
  return { ok: r.code === 0, msg: r.code === 0 ? "CR applied" : r.err };
}
async function patchSpec(engine: string, patch: object) {
  const e = ENGINES[engine];
  const r = await k(["-n", e.ns, "patch", "litellmkey", e.crName, "--type=merge", "-p", JSON.stringify({ spec: patch })]);
  return { ok: r.code === 0, msg: r.code === 0 ? "patched" : r.err };
}
async function rotate(engine: string) {
  const e = ENGINES[engine];
  const cur = await k(["-n", e.ns, "get", "litellmkey", e.crName, "-o", "jsonpath={.spec.keyVersion}"]);
  const next = (parseInt(cur.out || "1", 10) || 1) + 1;
  return { ...(await patchSpec(engine, { keyVersion: next })), msg: `keyVersion → ${next}` };
}
async function tamper(engine: string) {
  const e = ENGINES[engine];
  const live = await liveKey(e.alias, e.tag);
  if (!live) return { ok: false, msg: "no live key to tamper" };
  await gw(`/key/update`, { method: "POST", body: JSON.stringify({ key: live.token, max_budget: 999 }) });
  return { ok: true, msg: "out-of-band budget=999 — watch it self-heal" };
}
async function del(engine: string, policy: string) {
  const e = ENGINES[engine];
  await patchSpec(engine, { deletePolicy: policy });
  const r = await k(["-n", e.ns, "delete", "litellmkey", e.crName, "--wait=false"]);
  return { ok: r.code === 0, msg: r.code === 0 ? `delete (${policy}) — finalizer running` : r.err };
}

// ---- CONSUMER pattern: a pod mounts the operator's Secret as an env var, then
// uses it to actually call LiteLLM. Proves the vend→Secret→app→working-call loop.
async function kApply(yaml: string): Promise<number> {
  const p = Bun.spawn(["kubectl", "--context", CTX, "apply", "-f", "-"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  p.stdin.write(yaml); p.stdin.end();
  await new Response(p.stdout).text(); await new Response(p.stderr).text();
  return await p.exited;
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
  const w = await k(["-n", ns, "wait", "--for=condition=Ready", `pod/${CONSUMER_POD}`, "--timeout=60s"]);
  return w.code === 0;
}
async function consume(engine: string) {
  const e = ENGINES[engine];
  if (!(await ensureConsumerPod(e.ns))) return { ok: false, msg: "consumer pod not ready (is the Secret present? apply the CR first)" };
  // (a) what the pod sees: redacted key from the mounted env var
  const env = await k(["-n", e.ns, "exec", CONSUMER_POD, "--", "sh", "-c", 'echo "${LLM_KEY%"${LLM_KEY#??????}"}|${#LLM_KEY}"']);
  const [envPreview, length] = (env.out || "|").split("|");
  // (b) the pod calls LiteLLM WITH that key — on-topic email classification
  const body = JSON.stringify({ model: "nemo-guarded", messages: [{ role: "user", content: "Classify this customer email in one short sentence: Hello, I have not received my refund for order 8842. Please advise." }], max_tokens: 400 });
  const call = await k(["-n", e.ns, "exec", CONSUMER_POD, "--", "sh", "-c",
    `curl -s -m 120 -X POST "$GW/v1/chat/completions" -H "Authorization: Bearer $LLM_KEY" -H "Content-Type: application/json" -d '${body}'`]);
  let answer = "(no response)";
  try { const j = JSON.parse(call.out); const m = j.choices?.[0]?.message || {}; answer = m.content || m.reasoning_content || "(empty)"; } catch { answer = call.err || call.out || "(call failed)"; }
  // (c) provenance: this exact key is a registered LiteLLM identity; a bogus one isn't
  let registered: any = null, bogus404 = false;
  try {
    const key = Buffer.from((await k(["-n", e.ns, "get", "secret", "litellmkey-email-classification-service", "-o", "jsonpath={.data.secret_value}"])).out, "base64").toString("utf8");
    const info = await gw(`/key/info?key=${key}`);
    const i = info.info || info;
    registered = { alias: i.key_alias, owner: (i.metadata || {}).owner, version: (i.metadata || {}).key_version };
    const r = await fetch(`${LITELLM}/key/info?key=sk-totally-bogus-99999`, { headers: { Authorization: `Bearer ${masterKey()}` }, signal: AbortSignal.timeout(5000) });
    bogus404 = r.status === 404;
  } catch {}
  return { ok: true, envPreview: (envPreview || "sk-…") + "…", length: parseInt(length || "0", 10), model: "nemo-guarded", answer: answer.slice(0, 280), registered, bogus404 };
}

export default {
  "/state": async () => Response.json(await fullState()),
  "/preflight": async () => Response.json(await preflight()),
  "/apply": async (req: Request) => Response.json(await apply(qp(req, "engine"))),
  "/budget": async (req: Request) => Response.json(await patchSpec(qp(req, "engine"), { maxBudget: parseInt(qp(req, "value") || "5", 10) })),
  "/rotate": async (req: Request) => Response.json(await rotate(qp(req, "engine"))),
  "/tamper": async (req: Request) => Response.json(await tamper(qp(req, "engine"))),
  "/autorotate": async (req: Request) => {
    const on = qp(req, "on") === "1";
    return Response.json(await patchSpec(qp(req, "engine"), { rotationIntervalSeconds: on ? 60 : null }));
  },
  "/delete": async (req: Request) => Response.json(await del(qp(req, "engine"), qp(req, "policy") || "softDisable")),
  "/consume": async (req: Request) => Response.json(await consume(qp(req, "engine"))),
};
