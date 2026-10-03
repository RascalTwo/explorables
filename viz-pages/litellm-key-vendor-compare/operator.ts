// ===== Operator tab — logic from the former standalone page. Own module scope, so
// its $ / esc / etc. don't collide with the scripts above. Backend lives at /op-*.
// Polling is gated behind window.__startOperator (fired when the tab is first opened)
// so the cluster isn't hit until you look. =====
import { api } from "/_kit/api.js";
import type { OpEngine, OpLive, OpSecret, OpSpec, OpState, OpStatus, Routes } from "./contract.js";

const { post, get } = api<Routes>();
const $ = (s: string, r: ParentNode=document) => r.querySelector(s) as HTMLElement;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"} as Record<string, string>)[c]!);
const prevDrift: Record<string, boolean | null | undefined> = { ansible: false, java: false };
const ENGINES = ["ansible", "java"] as const;

declare global {
  interface Window {
    A: typeof act;
    USE: typeof USE;
    __startOperator?: () => void;
  }
}

function toast(msg: string, bad=false) {
  const t = $("#toast") as HTMLElement & { _t?: number }; t.textContent = msg; t.style.borderColor = bad ? "var(--danger)" : "var(--accent)";
  t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2600);
}
async function act(path: string, label: string) {
  try {
    const r = await fetch(`api/op-${path}`, { method: "POST" });
    const j: { ok: boolean; msg?: string } = await r.json();
    toast(`${label}: ${j.msg || (j.ok ? "ok" : "failed")}`, !j.ok);
  } catch (e) { toast(`${label}: ${e}`, true); }
  setTimeout(poll, 400);
}

function row(k: string, v: unknown, cls="") { return `<div class="row"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`; }
function specCard(s: OpSpec | null | undefined) {
  if (!s) return `<div class="card"><h3>LiteLLMKey CR · spec</h3><div class="absent">no CR — apply to create</div></div>`;
  return `<div class="card"><h3>LiteLLMKey CR · spec (etcd)</h3>
    ${row("keyAlias", esc(s.keyAlias))}${row("keyVersion", s.keyVersion)}${row("maxBudget", "$"+s.maxBudget)}
    ${row("models", esc((s.models||[]).join(",")))}${row("deletePolicy", esc(s.deletePolicy||"softDisable"))}
    ${row("blocked", s.blocked ? "true":"false")}${row("rotationIntervalSeconds", s.rotationIntervalSeconds ?? "—")}</div>`;
}
function liveCard(l: OpLive | null | undefined, drift: boolean | null | undefined) {
  if (!l) return `<div class="card"><h3>Live LiteLLM key</h3><div class="absent">no live key</div></div>`;
  const badge = drift ? `<span class="badge warn">DRIFT</span>` : (l.blocked ? `<span class="badge blk">BLOCKED</span>` : `<span class="badge ok">IN SYNC</span>`);
  return `<div class="card ${drift?"drift":""}"><h3>Live LiteLLM key ${badge}</h3>
    ${row("key_version", l.keyVersion)}${row("max_budget", "$"+l.maxBudget, "budget")}
    ${row("blocked", l.blocked ? "true":"false")}${row("environment", esc(l.env))}
    ${row("tpm / rpm", `${l.tpm ?? "—"} / ${l.rpm ?? "—"}`)}</div>`;
}
function secretCard(s: OpSecret | null | undefined) {
  if (!s) return `<div class="card"><h3>Namespaced Secret</h3><div class="absent">no Secret</div></div>`;
  return `<div class="card"><h3>Namespaced K8s Secret</h3>
    ${row("name", esc(s.name))}${row("secret_value", esc(s.valuePrefix||"—"))}
    ${row("ownerRefs", s.ownerRefs + (s.ownerRefs===0 ? " (none — finalizer-managed)" : ""))}</div>`;
}
function statusCard(st: OpStatus | null | undefined) {
  if (!st) return `<div class="card"><h3>CR · status</h3><div class="absent">—</div></div>`;
  const lr = st.lastRotated ? new Date(parseInt(st.lastRotated,10)*1000).toLocaleTimeString() : "—";
  return `<div class="card"><h3>CR · status (operator-written)</h3>
    ${row("observedKeyVersion", esc(st.observedKeyVersion))}${row("tokenHash", esc((st.tokenHash||"").slice(0,16)+"…"))}
    ${row("secretRef", esc(st.secretRef||"—"))}${row("lastRotated", lr)}</div>`;
}
function buttons(e: string, st: OpEngine) {
  const auto = st.spec && st.spec.rotationIntervalSeconds;
  return [
    `<button onclick="A('apply?engine=${e}','Apply')">Apply / Re-apply</button>`,
    `<button onclick="A('budget?engine=${e}&value=10','Budget→$10')">Budget $10</button>`,
    `<button onclick="A('rotate?engine=${e}','Rotate')">Rotate (v+1)</button>`,
    `<button class="warn" onclick="A('tamper?engine=${e}','Tamper')">Tamper budget</button>`,
    `<button class="${auto?"on":""}" onclick="A('autorotate?engine=${e}&on=${auto?0:1}','Auto-rotate ${auto?"off":"on"}')">Auto-rotate ${auto?"ON":"off"}</button>`,
    `<button onclick="A('delete?engine=${e}&policy=softDisable','Del soft')">Del soft</button>`,
    `<button class="danger" onclick="A('delete?engine=${e}&policy=hardDelete','Del hard')">Del hard</button>`,
  ].join("");
}

function render(state: OpState) {
  const pf = state.preflight;
  $("#pf").innerHTML = pf.checks.map(c => `<span class="chk"><span class="dot ${c.ok?"g":"r"}"></span>${esc(c.name)}</span>`).join("");
  let anyHeal = false, anyAuto = false, anyFinal = false;
  for (const e of ENGINES) {
    const s = state.engines[e];
    $(`#body-${e}`).innerHTML = specCard(s.spec) + liveCard(s.live, s.drift) + secretCard(s.secret) + statusCard(s.status);
    $(`#acts-${e}`).innerHTML = buttons(e, s);
    if (prevDrift[e] && !s.drift && s.live) { const c = $(`#body-${e} .card:nth-child(2)`); if (c) { c.classList.add("healed"); setTimeout(()=>c.classList.remove("healed"), 1700); } toast(`${e}: drift HEALED by reconciler`); }
    prevDrift[e] = s.drift;
    if (s.drift) anyHeal = true;
    if (s.spec && s.spec.rotationIntervalSeconds) anyAuto = true;
    if (s.status && s.status.tokenHash) anyFinal = true;
    const p = $(`#pulse-${e}`); if (s.crPresent) { p.classList.add("beat"); setTimeout(()=>p.classList.remove("beat"), 350); }
  }
  const a = state.engines.ansible, setT = (id: string, v: string) => { const el = $("#" + id); if (el) el.textContent = v; };
  if (a.spec) setT("map-cr-ver", `keyVersion: ${a.spec.keyVersion}`);
  if (a.secret) setT("map-secret-name", a.secret.name);
  setT("map-live", a.live ? `${a.secret?.valuePrefix || "sk-…"}  ·  v${a.live.keyVersion}` : "— no live key (apply the CR)");
  $("#anatomy")?.classList.toggle("drift", !!a.drift);

  $("#cap-reconcile").classList.toggle("lit", state.engines.ansible.crPresent || state.engines.java.crPresent);
  $("#cap-heal").classList.toggle("lit", anyHeal);
  $("#cap-rotate").classList.toggle("lit", anyAuto);
  $("#cap-final").classList.toggle("lit", anyFinal);
}

window.A = act;

function consumerShell(e: string) {
  return `<div class="card consumer">
    <h3>📥 a consumer app uses this key</h3>
    <div class="flow-mini">
      <span class="node pod">app pod</span><span class="arrow">— LLM_KEY →</span>
      <span class="node gw">LiteLLM</span><span class="arrow">— answer →</span><span class="node brain">🧠</span>
    </div>
    <div class="csteps"><div class="cstep dim">click below: a pod mounts this Secret as <span class="mono">$LLM_KEY</span> and calls the gateway with it</div></div>
    <button onclick="USE('${e}')">▶ Use the key (call LiteLLM from a pod)</button>
  </div>`;
}
function cstep(n: string, lbl: string, detail: string) { return `<div class="cstep"><span class="n">${n}</span><span class="lbl">${lbl}</span> — ${detail}</div>`; }
function typewriter(el: HTMLElement | null, text: string, i = 0) {
  if (!el) return;
  el.textContent = text.slice(0, i);
  if (i < text.length) setTimeout(() => typewriter(el, text, i + 1), 16);
  else el.parentElement!.classList.add("done");
}
async function USE(e: string) {
  const card = document.querySelector(`#consume-${e} .consumer`)!;
  const steps = card.querySelector(".csteps")!, btn = card.querySelector("button")!;
  btn.disabled = true; btn.textContent = "⏳ calling…";
  card.querySelectorAll(".arrow").forEach(a => a.classList.add("flowing"));
  steps.innerHTML = `<div class="cstep run">⏳ ensuring the consumer pod, mounting the Secret, then POST /v1/chat/completions…</div>`;
  try {
    const j = await post("/op-consume", { query: { engine: e } });
    if (!j.ok) { steps.innerHTML = `<div class="cstep bad">✗ ${esc(j.msg || "failed")}</div>`; }
    else {
      steps.innerHTML =
        cstep("1", "pod sees the key", `<span class="mono">LLM_KEY=${esc(j.envPreview)}</span> <span class="dim">(len ${j.length} — from the Secret, not the pod spec)</span>`) +
        cstep("2", "pod → POST /v1/chat/completions", `<span class="mono">model: ${esc(j.model)}</span>`) +
        `<div class="answer-box"><div class="al">MODEL ANSWER (from inside the pod, using the vended key)</div><div class="atext" id="atext-${e}"></div></div>` +
        (j.registered ? `<div class="prov">✓ genuinely <b>registered</b> key — alias <span class="mono">${esc(j.registered.alias)}</span>, owner <span class="mono">${esc(j.registered.owner)}</span>${j.bogus404 ? ` · a bogus key → <span class="mono">404</span>` : ""}</div>` : "");
      typewriter(document.getElementById(`atext-${e}`), j.answer);
    }
  } catch (err) { steps.innerHTML = `<div class="cstep bad">✗ ${esc(err)}</div>`; }
  card.querySelectorAll(".arrow").forEach(a => a.classList.remove("flowing"));
  btn.disabled = false; btn.textContent = "▶ Use the key again";
}
window.USE = USE;
for (const e of ENGINES) document.querySelector(`#consume-${e}`)!.innerHTML = consumerShell(e);

async function poll() {
  try { render(await get("/op-state")); } catch (e) { /* gateway/cluster down */ }
}
let __opStarted = false;
window.__startOperator = () => { if (__opStarted) return; __opStarted = true; poll(); setInterval(poll, 2500); };
