import { arrowMarkers, connect, type Box } from "/_kit/viz.js";
import { api } from "/_kit/api.js";
import type { Routes, State, EngineState, TfState } from "./contract.js";
import { iconGroup } from "./icons.js";

const { get } = api<Routes>();

// ---- per-column pipeline diagrams --------------------------------------
interface FlowNode extends Box { t: string; s: string; icon?: string; state?: boolean }
type Edge = [string, string];
const ANS: Record<string, FlowNode> = {
  spec:  { x: 12,  y: 78,  w: 132, h: 54, t: "keys/*.yml", s: "git · desired", icon: "git" },
  eng:   { x: 174, y: 72,  w: 132, h: 66, t: "reconcile", s: "converge loop", icon: "ansible" },
  llm:   { x: 336, y: 22,  w: 132, h: 54, t: "LiteLLM", s: "/key/*", icon: "🚅" },
  vault: { x: 336, y: 134, w: 132, h: 54, t: "SecretVault", s: "MySQL", icon: "mysql" },
};
const ANS_E: Edge[] = [["spec","eng"],["eng","llm"],["eng","vault"]];
const TF: Record<string, FlowNode> = {
  spec:  { x: 12,  y: 70,  w: 132, h: 54, t: "keys/*.yml", s: "git · desired", icon: "git" },
  eng:   { x: 174, y: 64,  w: 132, h: 60, t: "terraform", s: "plan / apply", icon: "terraform" },
  llm:   { x: 336, y: 18,  w: 132, h: 50, t: "LiteLLM", s: "/key/*", icon: "🚅" },
  vault: { x: 336, y: 150, w: 132, h: 50, t: "SecretVault", s: "MySQL", icon: "mysql" },
  state: { x: 174, y: 150, w: 132, h: 50, t: "tfstate", s: "sk- in plaintext", state: true },
};
const TF_E: Edge[] = [["spec","eng"],["eng","llm"],["eng","vault"],["eng","state"]];

function drawFlow(svgId: string, N: Record<string, FlowNode>, EDGES: Edge[]) {
  const node = (id: string) => {
    const n = N[id]!;
    const iy = n.y + n.h / 2 - 12;
    const icon = n.state ? `<text x="${n.x + 14}" y="${n.y + n.h / 2 + 7}" font-size="18">🗒️</text>`
      : n.icon === "🚅" ? `<text x="${n.x + 13}" y="${n.y + n.h / 2 + 9}" font-size="23">🚅</text>`
      : iconGroup(n.icon!, n.x + 14, iy, 24);
    const tx = n.x + 48;
    return `<g class="node ${n.state ? "state" : ""}" id="${svgId}-${id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9"/>
      ${icon}
      <text class="t" x="${tx}" y="${n.y + n.h / 2 - 2}">${n.t}</text>
      <text class="s" x="${tx}" y="${n.y + n.h / 2 + 14}">${n.s}</text></g>`;
  };
  const edge = ([a, b]: Edge, i: number) => `<path class="edge" id="${svgId}-e${i}" d="${connect(N[a]!, N[b]!)}" marker-end="url(#ah)"/>`;
  document.getElementById(svgId)!.innerHTML =
    arrowMarkers() + EDGES.map(edge).join("") + Object.keys(N).map(node).join("");
}
function pipeActive(svgId: string, N: Record<string, FlowNode>, EDGES: Edge[], on: boolean) {
  ["eng","llm","vault","state"].forEach(id => { if (N[id]) document.getElementById(`${svgId}-${id}`)?.classList.toggle("active", on); });
  EDGES.forEach((_, i) => document.getElementById(`${svgId}-e${i}`)?.classList.toggle("active", on));
}
drawFlow("flow-ans", ANS, ANS_E);
drawFlow("flow-tf", TF, TF_E);

// ---- the contrast table, per scenario ----------------------------------
const DIFF: Record<string, { t: string; d: boolean; a: string; f: string }> = {
  create:  { t: "Create from a clean slate", d: false,
    a: "<b>GENERATE</b> — alias not found → <code>/key/generate</code>. Secret written to the SecretVault row.",
    f: "<b>GENERATE</b> — <code>litellm_key</code> created. Secret written to SecretVault <i>and</i> into <code>terraform.tfstate</code> in plaintext." },
  norun:   { t: "Re-run with no spec change (idempotency)", d: false,
    a: "<b>NO-OP</b> — re-reads live <code>/key/list</code>, makes zero API calls.",
    f: "<b>NO-OP</b> — refresh compares reality to <code>tfstate</code>: <code>0 to change</code>." },
  update:  { t: "Change the budget", d: false,
    a: "<b>UPDATE</b> in place — <code>/key/update</code>, token stays the same. Update ≠ rotation.",
    f: "<b>UPDATE</b> in place (<code>~</code>) — id/token stable. Phase 0: no field on this provider is force-new." },
  rotate:  { t: "Bump key_version (rotation)", d: false,
    a: "delete + generate → <b>new token</b>. No grace window (Enterprise-only).",
    f: "<b>REPLACE</b> (<code>-/+</code>) via <code>terraform_data</code> + <code>replace_triggered_by</code> → new token. No grace either." },
  remove:  { t: "Remove the spec from git", d: true,
    a: "<b>SOFT-PRUNE</b> → <code>blocked:true</code>. The key is <b>recoverable</b> — restore the spec to reactivate.",
    f: "<b>HARD DESTROY</b> → <code>/key/delete</code>. The key is <b>gone</b>. Terraform has no soft-disable; removal = destroy." },
  restore: { t: "Restore the spec", d: true,
    a: "Reactivate in place — <code>blocked:false</code>, <b>same token</b>.",
    f: "Re-create from scratch — a <b>brand-new token</b> (the old one was destroyed)." },
  block:   { t: "Soft-disable the Terraform way (blocked=true)", d: true,
    a: "n/a — the reconciler only disables via the prune step (remove the spec).",
    f: "<b>in-place</b> update, key <b>retained</b> but blocked. Shows removal ≠ disable: model it as an attribute." },
  drift:   { t: "Out-of-band change (drift)", d: true,
    a: "Re-reads live state every run, so it simply <b>overwrites</b> the drift on the next sync.",
    f: "<code>plan</code> sees state ≠ reality and wants to <b>revert</b> it (budget 999 → 5). Out-of-band delete → wants to re-create." },
};
function setDiff(key: string) {
  const el = document.getElementById("diff")!, d = DIFF[key];
  el.classList.toggle("diverge", !!d?.d);
  document.getElementById("difftitle")!.textContent = d ? d.t : "The contrast";
  if (d) { document.getElementById("diff-ans")!.innerHTML = d.a; document.getElementById("diff-tf")!.innerHTML = d.f; }
  document.getElementById("diff-vs")!.textContent = d?.d ? "≠" : "VS";
}

// ---- state rendering ----------------------------------------------------
let prev: Record<string, string> = {};
function kv(rows: [string, unknown, string][]) { return rows.map(([k, v, id]) => `<span class="key">${k}</span><span class="val" data-f="${id}">${v}</span>`).join(""); }
function pill(v: unknown) { return v ? `<span class="pill yes">true</span>` : `<span class="pill no">false</span>`; }
function renderEngine(e: string, st: EngineState) {
  const s = st.spec, l = st.litellm, v = st.vault;
  document.getElementById(`${e}-spec`)!.innerHTML = s.missing
    ? kv([["status", `<span class="pill absent">removed</span>`, `${e}_sp_x`]])
    : kv([["version", s.key_version, `${e}_sp_v`], ["budget", "$" + s.max_budget, `${e}_sp_b`], ["blocked", pill(s.blocked), `${e}_sp_k`], ["models", s.models, `${e}_sp_m`]]);
  document.getElementById(`${e}-llm`)!.innerHTML = l?.error
    ? kv([["⚠", "unreachable", `${e}_l_x`]])
    : !l || !l.tokenHash
    ? kv([["status", `<span class="pill absent">no key</span>`, `${e}_l_x`]])
    : kv([["token", l.tokenHash + "…", `${e}_l_t`], ["version", l.version, `${e}_l_v`], ["budget", "$" + l.budget, `${e}_l_b`], ["blocked", pill(l.blocked), `${e}_l_k`]]);
  document.getElementById(`${e}-vault`)!.innerHTML = v?.error
    ? kv([["⚠", "unreachable", `${e}_v_x`]])
    : !v || !v.key_alias
    ? kv([["status", `<span class="pill absent">no row</span>`, `${e}_v_x`]])
    : kv([["secret", v.secretPrefix + ` (${v.secretLen} chars)`, `${e}_v_s`], ["version", v.key_version, `${e}_v_v`], ["updated", v.updated_at, `${e}_v_u`]]);
}
function renderTfState(ts: TfState | undefined) {
  const box = document.getElementById("tfstate-box")!;
  if (!ts || !ts.exists) { box.className = "statebox none"; box.innerHTML = `<span class="lbl">state file</span>No <code>terraform.tfstate</code> yet — run a scenario.`; return; }
  if (ts.hasSecret) {
    box.className = "statebox has";
    box.innerHTML = `<span class="lbl">⚠ secret in terraform.tfstate (${ts.bytes} bytes)</span><code>${ts.line}</code><div style="color:var(--muted);margin-top:6px;font-size:11.5px;"><code>sensitive=true</code> only redacts CLI output — the value is in the file. Mitigation lives at the backend (encrypted remote state), not the attribute.</div>`;
  } else {
    box.className = "statebox none"; box.innerHTML = `<span class="lbl">state file</span><code>tfstate</code> exists but holds no key secret right now.`;
  }
}
function render(state: State, flash: boolean) {
  renderEngine("ans", state.ansible);
  renderEngine("tf", state.terraform);
  renderTfState(state.tfstate);
  if (flash) document.querySelectorAll<HTMLElement>("[data-f]").forEach(el => { const id = el.dataset["f"]!; if (prev[id] !== undefined && prev[id] !== el.innerHTML) el.classList.add("flash"); });
  prev = {}; document.querySelectorAll<HTMLElement>("[data-f]").forEach(el => prev[el.dataset["f"]!] = el.innerHTML);
}

// ---- run plumbing -------------------------------------------------------
const termA = document.getElementById("term-ans")!, termT = document.getElementById("term-tf")!;
const setBtns = (d: boolean) => document.querySelectorAll<HTMLButtonElement>("#scenbar button").forEach(b => b.disabled = d);
function append(term: HTMLElement, line: string) { term.textContent += line + "\n"; term.scrollTop = term.scrollHeight; }

function runEngine(engine: string): Promise<string> {
  const term = engine === "ansible" ? termA : termT;
  const svg = engine === "ansible" ? "flow-ans" : "flow-tf";
  const N = engine === "ansible" ? ANS : TF, E = engine === "ansible" ? ANS_E : TF_E;
  return new Promise((resolve) => {
    term.textContent = ""; pipeActive(svg, N, E, true);
    const es = new EventSource(engine === "ansible" ? "api/run-ansible" : "api/run-terraform");
    es.addEventListener("line", (ev) => append(term, JSON.parse(ev.data).line));
    es.addEventListener("done", (ev) => { const { action, state } = JSON.parse(ev.data); es.close(); pipeActive(svg, N, E, false); render(state, true); resolve(action); });
    es.onerror = () => { es.close(); pipeActive(svg, N, E, false); append(term, "[stream error]"); resolve("ERROR"); };
  });
}

const SCEN: Record<string, { diff: string; before: () => Promise<State>; run: string[]; note?: { ansible?: string; terraform?: string }; special?: string }> = {
  create:  { diff: "create",  before: () => get("/reset"), run: ["ansible", "terraform"] },
  norun:   { diff: "norun",   before: () => get("/state"), run: ["ansible", "terraform"] },
  update:  { diff: "update",  before: async () => { await get("/mutate", { query: { engine: "ansible", op: "budget" } }); return get("/mutate", { query: { engine: "terraform", op: "budget" } }); }, run: ["ansible", "terraform"] },
  rotate:  { diff: "rotate",  before: async () => { await get("/mutate", { query: { engine: "ansible", op: "version" } }); return get("/mutate", { query: { engine: "terraform", op: "version" } }); }, run: ["ansible", "terraform"] },
  remove:  { diff: "remove",  before: async () => { await get("/mutate", { query: { engine: "ansible", op: "remove" } }); return get("/mutate", { query: { engine: "terraform", op: "remove" } }); }, run: ["ansible", "terraform"] },
  restore: { diff: "restore", before: async () => { await get("/mutate", { query: { engine: "ansible", op: "restore" } }); return get("/mutate", { query: { engine: "terraform", op: "restore" } }); }, run: ["ansible", "terraform"] },
  block:   { diff: "block",   before: () => get("/mutate", { query: { engine: "terraform", op: "block" } }), run: ["terraform"], note: { ansible: "n/a — Ansible disables via the prune step (remove the spec)." } },
  drift:   { diff: "drift",   before: async () => { await get("/drift", { query: { engine: "ansible" } }); return get("/drift", { query: { engine: "terraform" } }); }, run: [], special: "drift" },
};

async function runScenario(key: string) {
  const sc = SCEN[key]!; setDiff(sc.diff);
  termA.textContent = sc.note?.ansible || "(idle)"; termT.textContent = sc.note?.terraform || "(idle)";
  render(await sc.before(), true);
  if (sc.special === "drift") {
    append(termA, "drift injected on the live key (budget → 999).\nthe reconciler re-reads live state every run — next sync just overwrites it.");
    append(termT, "drift injected on the live key (budget → 999).\nrunning `terraform plan` …");
    const { summary } = await get("/tf-plan");
    append(termT, summary + "\n→ state ≠ reality: plan wants to revert the out-of-band change.");
    return;
  }
  await Promise.all(sc.run.map(runEngine));
}

document.getElementById("scenbar")!.addEventListener("click", async (e) => {
  const btn = (e.target as Element).closest<HTMLElement>("button[data-s]"); if (!btn) return;
  setBtns(true); try { await runScenario(btn.dataset["s"]!); } finally { setBtns(false); }
});

// ---- boot ---------------------------------------------------------------
(async () => {
  const pf = await get("/preflight").catch(() => ({ checks: [] }));
  document.getElementById("badges")!.innerHTML = (pf.checks || []).map(c => `<span class="badge ${c.ok ? "ok" : "bad"}">${c.ok ? "●" : "○"} ${c.name}</span>`).join("");
  render(await get("/state"), false);
})();
