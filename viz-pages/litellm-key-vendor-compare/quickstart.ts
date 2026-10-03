// ===== Quickstart tab — the individual developer's-eye view, per universe =====
import { arrowMarkers, connect, type Box } from "/_kit/viz.js";
import { api } from "/_kit/api.js";
import type { Routes } from "./contract.js";

const { get } = api<Routes>();
const $ = (s: string, r: ParentNode = document) => r.querySelector(s) as HTMLElement;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as Record<string, string>)[c]!);

type Pair = [string, string];
interface Universe {
  tl: string; dot: string; ask: string;
  flow: { spec: Pair; eng: Pair; store: Pair; app: Pair };
  authFile: string; authLead: string; authCode: string;
  cmd: string; cmdAnn: string; result: string[];
  consumeFile: string; consumeLead: string; consumeCode: string; uniq: string;
}
interface QsEngine { litellm?: { tokenHash?: string; version?: number; budget?: number }; vault?: { secretPrefix?: string; secretLen?: number } }
interface QsData {
  offline?: boolean; applyOut?: string[]; reconciled?: boolean;
  secretRef?: string; tokenHash?: string; keyVersion?: number; secretPrefix?: string;
  state?: { tfstate?: { hasSecret?: boolean } } & Record<string, QsEngine | undefined>;
}

const U: Record<string, Universe> = {
  ansible: {
    tl: "stateless reconcile", dot: "#bd0000",
    ask: 'Your app <b>classify-service</b> needs to call the LLM gateway, so it needs a scoped LiteLLM key (a budget + a model allowlist, owned + audited). In the <b>Ansible</b> universe, here is the <em>entire</em> ask of you:',
    flow: { spec: ["keys/*.yml", "git · desired"], eng: ["reconcile", "make keys-sync"], store: ["SecretVault", "MySQL row"], app: ["your app", "reads the secret"] },
    authFile: "ansible/keys/classify-service-prod.yml",
    authLead: "Drop one YAML file in the keys folder and open a PR. A lint gate (keys-lint.sh — the CODEOWNERS stand-in) rejects any spec missing owner/team, so an unowned key never merges.",
    authCode: `key_alias:       classify-service-prod   # unique identity (LiteLLM enforces)
team_id:         your-team
owner:           you@example.com          # required — ownership / audit
app:             classify-service
environment:     prod
key_version:     1                        # bump this to rotate
models:          [nemo-guarded]           # the allowlist
max_budget:      5
budget_duration: 30d
tpm_limit:       200000
rpm_limit:       60`,
    cmd: "make keys-sync", cmdAnn: "lints, then converges every spec → LiteLLM + SecretVault (idempotent)",
    result: ["Key minted in LiteLLM via <code>/key/generate</code>", "Secret written to a <b>SecretVault</b> (MySQL) row your app reads", "<b>No state file</b> — actual state re-read from <code>/key/list</code> every run"],
    consumeFile: "your app (bash)",
    consumeLead: "Your app fetches the secret from SecretVault (or an injected env var) and calls the gateway with it. When the key rotates, nothing app-side changes — it just re-reads.",
    consumeCode: `# your app reads its key from SecretVault (or an injected env var)
LLM_KEY=$(vault-get classify-service-prod)

curl -s "$GATEWAY/v1/chat/completions" \\
  -H "Authorization: Bearer $LLM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"nemo-guarded","messages":[{"role":"user","content":"Classify this email…"}]}'`,
    uniq: 'Stateless converge loop — <em>"the system is the state."</em> There is no tfstate to secure; the secret lives only in LiteLLM + the SecretVault row. Remove the spec and the key <b>soft-disables</b> (recoverable), it is not destroyed.',
  },
  terraform: {
    tl: "desired in HCL · actual in tfstate", dot: "#7B42BC",
    ask: 'Same app, same need: a scoped LiteLLM key for <b>classify-service</b>. In the <b>Terraform</b> universe the ask of you is <em>almost identical</em> — same YAML schema, a different folder and engine:',
    flow: { spec: ["keys/*.yml", "→ tfstate"], eng: ["terraform", "make tf-apply"], store: ["SecretVault + tfstate", "secret in plaintext ⚠"], app: ["your app", "reads the secret"] },
    authFile: "terraform/keys/classify-service-tf.yml",
    authLead: "The exact same key spec — only the folder differs. The gate here is server-side: terraform validate + variable validation + a plan you review before apply.",
    authCode: `key_alias:       classify-service-tf-prod   # same schema as Ansible
team_id:         your-team
owner:           you@example.com             # required — ownership / audit
app:             classify-service
environment:     prod
key_version:     1                           # bump to rotate (destroy + create)
models:          [nemo-guarded]
max_budget:      5
budget_duration: 30d
tpm_limit:       200000
rpm_limit:       60`,
    cmd: "make tf-apply", cmdAnn: "fmt + validate + plan, then converges terraform/keys/*.yml → LiteLLM + SecretVault",
    result: ["Key minted in LiteLLM (the <code>litellm_key</code> resource)", "Secret in SecretVault <b>and</b> in <code>terraform.tfstate</code> — in plaintext ⚠", "Removal means <code>destroy</code> — there is no soft-disable"],
    consumeFile: "your app (bash)",
    consumeLead: "Identical to the Ansible universe app-side — the consumer never knows which engine vended the key. It reads the secret and calls the gateway.",
    consumeCode: `# your app reads its key from SecretVault (or an injected env var)
LLM_KEY=$(vault-get classify-service-tf-prod)

curl -s "$GATEWAY/v1/chat/completions" \\
  -H "Authorization: Bearer $LLM_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"nemo-guarded","messages":[{"role":"user","content":"Classify this email…"}]}'`,
    uniq: 'The <b>state file is the trade-off.</b> You get plan/preview and a dependency graph for free — but the minted secret lands in <code>terraform.tfstate</code> in plaintext, so the mitigation is encrypted remote state, and removing a key hard-destroys it.',
  },
  k8s: {
    tl: "always-on operator", dot: "#326CE5",
    ask: 'Same app, same need — but now the gateway lives in Kubernetes. In the <b>Kubernetes</b> universe you author a native object and an <b>always-on operator</b> does the rest, forever:',
    flow: { spec: ["LiteLLMKey CR", "etcd object"], eng: ["operator", "reconcile loop"], store: ["K8s Secret", "namespaced"], app: ["your pod", "mounts the Secret"] },
    authFile: "classify-service.yaml  (kubectl)",
    authLead: "You write a LiteLLMKey custom resource. The CRD's required: list is the gate — the API server rejects an unowned key at apply time, for every client, with no webhook.",
    authCode: `apiVersion: keyvendor.local/v1alpha1
kind: LiteLLMKey
metadata:
  name: classify-service
  namespace: keyvendor-ansible
spec:
  keyAlias: classify-service-aop-prod
  owner: you@example.com        # required — server-side gate (CRD)
  teamId: your-team
  app: classify-service
  environment: prod
  keyVersion: 1                 # bump to rotate
  models: [nemo-guarded]
  maxBudget: 5
  deletePolicy: softDisable     # what 'kubectl delete' does`,
    cmd: "kubectl apply -f classify-service.yaml", cmdAnn: "the operator reconciles the CR → mints the key → writes the Secret, and never stops",
    result: ["Operator reconciles the CR → mints the key in LiteLLM", "Secret materialized as a <b>namespaced K8s Secret</b> your pod mounts", "<b>Always-on</b>: self-heals out-of-band drift, can auto-rotate on a clock"],
    consumeFile: "your pod (env mount)",
    consumeLead: "Your pod mounts the operator-managed Secret as an env var via secretKeyRef — no app code touches the secret directly. The key is just there in the environment.",
    consumeCode: `# your pod mounts the operator-managed Secret as an env var
env:
  - name: LLM_KEY
    valueFrom:
      secretKeyRef:
        name: litellmkey-classify-service
        key: secret_value

# then, inside the pod:
curl -s "$GW/v1/chat/completions" \\
  -H "Authorization: Bearer $LLM_KEY" \\
  -d '{"model":"nemo-guarded","messages":[{"role":"user","content":"Classify this email…"}]}'`,
    uniq: '<b>Always-on, not one-shot.</b> One apply and the operator never stops reconciling — tamper a key out-of-band and it self-heals on the next resync, with no human and no re-run; set rotationIntervalSeconds and the token rotates on a clock with <em>no spec change</em>. A one-shot apply (Terraform / Ansible-cron) cannot do that.',
  },
};

// ---- the flow pipeline (geometry once; only labels vary per universe) ----
const GEO: Record<string, Box> = {
  you:   { x: 8,   y: 43, w: 116, h: 46 },
  spec:  { x: 168, y: 43, w: 150, h: 46 },
  eng:   { x: 362, y: 43, w: 150, h: 46 },
  llm:   { x: 556, y: 8,  w: 168, h: 46 },
  store: { x: 556, y: 78, w: 168, h: 46 },
  app:   { x: 772, y: 43, w: 200, h: 46 },
};
const EDGES: Pair[] = [["you","spec"],["spec","eng"],["eng","llm"],["eng","store"],["llm","app"],["store","app"]];
const nodeSVG = (id: string, t: string, s: string) => {
  const n = GEO[id]!;
  return `<g class="node" id="qn-${id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9"/>
    <text class="t" x="${n.x + 12}" y="${n.y + n.h / 2 - 2}">${esc(t)}</text>
    <text class="s" x="${n.x + 12}" y="${n.y + n.h / 2 + 14}">${esc(s)}</text></g>`;
};
function drawFlow(u: Universe) {
  const L: Record<string, Pair> = { you: ["You", "author + PR"], spec: u.flow.spec, eng: u.flow.eng, llm: ["LiteLLM", "virtual key"], store: u.flow.store, app: u.flow.app };
  $("#qs-flow").innerHTML = arrowMarkers()
    + EDGES.map(([a, b]) => `<path class="edge" d="${connect(GEO[a]!, GEO[b]!)}" marker-end="url(#ah-accent)"/>`).join("")
    + Object.keys(GEO).map(id => nodeSVG(id, L[id]![0], L[id]![1])).join("");
}
function lightFlow(on: boolean) {
  Object.keys(GEO).forEach(id => $("#qn-" + id)?.classList.toggle("lit", on));
  document.querySelectorAll("#qs-flow path.edge").forEach(e => e.classList.toggle("lit", on));
}

// ---- step cards ----
const codeBlock = (fname: string, code: string) =>
  `<div class="code"><span class="fname">${esc(fname)}</span><button class="cp">copy</button><pre>${esc(code)}</pre></div>`;
function stepsHTML(u: Universe) {
  return `
  <div class="step"><h3><span class="num">1</span> Author the spec</h3>
    <p class="lead">${u.authLead}</p>
    <div class="body">${codeBlock(u.authFile, u.authCode)}</div></div>

  <div class="step"><h3><span class="num">2</span> Run one command</h3>
    <p class="lead">That is the whole interface — one command (or CI runs it for you on merge).</p>
    <div class="body"><div class="cmd"><code>$ ${esc(u.cmd)}</code><span class="ann">${u.cmdAnn}</span>
      <button class="try" data-act="run">▶ Try it (runs for real)</button></div>
      <pre class="out" hidden></pre></div></div>

  <div class="step"><h3><span class="num">3</span> What you get back</h3>
    <p class="lead">Where your key ends up — and who holds the secret.</p>
    <div class="body"><ul style="margin:0;padding-left:18px;line-height:1.75;font-size:13.5px;">${u.result.map(r => `<li>${r}</li>`).join("")}</ul>
      <div class="resultcard empty" id="qs-result">run “Try it” above to mint the key and see it live →</div></div></div>

  <div class="step"><h3><span class="num">4</span> Use the key in your app</h3>
    <p class="lead">${u.consumeLead}</p>
    <div class="body">${codeBlock(u.consumeFile, u.consumeCode)}
      <div style="margin-top:11px;"><button class="try use" data-act="use">📥 Use the key (real call to the gateway)</button></div>
      <div class="answer" hidden><div class="al">MODEL ANSWER — via the vended key</div><div class="at"></div><div class="prov"></div></div></div></div>`;
}

// ---- live runs ----
function fillResult(key: string, data: QsData | null) {
  const el = $("#qs-result");
  if (!data) return;
  let rows: [string, unknown][];
  if (key === "k8s") {
    rows = data.reconciled
      ? [["Secret", data.secretRef || "—"], ["token (sha256)", data.tokenHash || "—"], ["keyVersion", data.keyVersion ?? "—"], ["secret_value", data.secretPrefix || "—"]]
      : [["status", "CR applied — operator not reconciling (deploy it: make op-deploy)"]];
  } else {
    const st: QsEngine = (data.state || {} as Record<string, QsEngine | undefined>)[key] || {}, l = st.litellm || {}, v = st.vault || {};
    rows = [["LiteLLM token", l.tokenHash ? l.tokenHash + "…" : "—"], ["key_version", l.version ?? "—"], ["budget", "$" + (l.budget ?? "—")],
      ["SecretVault secret", v.secretPrefix ? `${v.secretPrefix} (${v.secretLen} chars)` : "—"]];
    if (key === "terraform") rows.push(["in tfstate", (data.state!.tfstate || {}).hasSecret ? "⚠ yes — plaintext" : "no"]);
  }
  el.className = "resultcard";
  el.innerHTML = rows.map(([k, v]) => `<span class="k">${k}</span><span class="v">${esc(String(v))}</span>`).join("");
}
function runSSE(key: string, out: HTMLElement, done: (d: QsData | null) => void) {
  out.hidden = false; out.textContent = ""; lightFlow(true);
  const es = new EventSource("api/run-" + key);
  es.addEventListener("line", ev => { out.textContent += JSON.parse(ev.data).line + "\n"; out.scrollTop = out.scrollHeight; });
  es.addEventListener("done", ev => { es.close(); lightFlow(false); done(JSON.parse(ev.data)); });
  es.onerror = () => { es.close(); lightFlow(false); out.textContent += "\n[stream error]"; done(null); };
}
async function runK8s(out: HTMLElement, done: (d: QsData | null) => void) {
  out.hidden = false; out.textContent = "$ kubectl apply -f classify-service.yaml\n…applying + waiting for the operator to reconcile…\n"; lightFlow(true);
  try {
    const j: QsData = await get("/qs-k8s");
    lightFlow(false);
    if (j.offline) { out.textContent += "\n[kind cluster offline] start it:  make op-cluster-up && make op-deploy && make op-apply"; return done(null); }
    out.textContent = "$ kubectl apply -f classify-service.yaml\n" + (j.applyOut || []).join("\n") + "\n"
      + (j.reconciled ? "✓ operator reconciled → namespaced Secret materialized" : "… operator not reconciling yet (is it deployed?  make op-deploy)");
    done(j);
  } catch (e) { lightFlow(false); out.textContent += "\n[error] " + e; done(null); }
}
async function useKey(key: string, ansEl: HTMLElement, btn: HTMLButtonElement) {
  ansEl.hidden = false; btn.disabled = true; const old = btn.textContent; btn.textContent = "⏳ calling…";
  ansEl.querySelector(".at")!.textContent = "…"; ansEl.querySelector(".prov")!.innerHTML = "";
  try {
    const j = await get("/qs-consume", { query: { engine: key } });
    if (!j.ok) ansEl.querySelector(".at")!.textContent = "✗ " + j.msg;
    else {
      ansEl.querySelector(".at")!.textContent = j.answer;
      ansEl.querySelector(".prov")!.innerHTML = j.registered
        ? `✓ key <code>${esc(j.keyPrefix)}</code> (${j.keyLen} chars) is a registered LiteLLM identity — alias <code>${esc(j.registered.alias)}</code>, owner <code>${esc(j.registered.owner)}</code>`
        : "";
    }
  } catch (e) { ansEl.querySelector(".at")!.textContent = "✗ " + e; }
  btn.disabled = false; btn.textContent = old;
}

// ---- render + wire ----
let CLUSTER_OK = true, current = "ansible";
function renderUniverse(key: string) {
  current = key;
  document.querySelectorAll<HTMLElement>(".uni-pill").forEach(p => p.classList.toggle("active", p.dataset["u"] === key));
  const u = U[key]!;
  $("#qs-ask").innerHTML = u.ask + (key === "k8s" && !CLUSTER_OK ? `<div class="offline-note">⚠ kind cluster is offline — “Try it” will show how to start it. The walkthrough is still accurate.</div>` : "");
  drawFlow(u);
  $("#qs-steps").innerHTML = stepsHTML(u);
  $("#qs-uniq").innerHTML = "<b>What's unique here — </b>" + u.uniq;
  const steps = $("#qs-steps");
  steps.querySelector<HTMLButtonElement>('[data-act="run"]')!.onclick = ev => {
    (ev.target as HTMLButtonElement).disabled = true;
    const out = steps.querySelector<HTMLElement>("pre.out")!;
    const done = (d: QsData | null) => { (ev.target as HTMLButtonElement).disabled = false; fillResult(key, d); };
    key === "k8s" ? runK8s(out, done) : runSSE(key, out, done);
  };
  steps.querySelector<HTMLButtonElement>('[data-act="use"]')!.onclick = ev => useKey(key, steps.querySelector<HTMLElement>(".answer")!, ev.target as HTMLButtonElement);
}

document.querySelectorAll<HTMLElement>(".modetab").forEach(b => b.onclick = () => {
  document.querySelectorAll(".modetab").forEach(x => x.classList.toggle("active", x === b));
  $("#mode-compare").hidden = b.dataset["mode"] !== "compare";
  $("#mode-quickstart").hidden = b.dataset["mode"] !== "quickstart";
  $("#mode-operator").hidden = b.dataset["mode"] !== "operator";
  // Start the operator's live polling on first open (it hits the kind cluster) — same
  // lazy intent the iframe had, now in-page.
  if (b.dataset["mode"] === "operator") window.__startOperator?.();
});
$("#uni-pills").innerHTML = Object.entries(U).map(([id, u]) =>
  `<button class="uni-pill" data-u="${id}"><span class="dot" style="background:${u.dot}"></span>${id === "k8s" ? "Kubernetes" : id[0]!.toUpperCase() + id.slice(1)} <span class="tl">${u.tl}</span></button>`).join("");
document.querySelectorAll<HTMLElement>(".uni-pill").forEach(p => p.onclick = () => renderUniverse(p.dataset["u"]!));
document.addEventListener("click", e => {
  const cp = (e.target as Element).closest(".cp"); if (!cp) return;
  navigator.clipboard.writeText(cp.parentElement!.querySelector("pre")!.textContent!)
    .then(() => { cp.textContent = "copied!"; setTimeout(() => cp.textContent = "copy", 1200); });
});
get("/qs-preflight").then(p => {
  CLUSTER_OK = (p.checks.find(c => /cluster/.test(c.name)) || {}).ok ?? false;
  if (current === "k8s") renderUniverse("k8s");
}).catch(() => {});
renderUniverse("ansible");
