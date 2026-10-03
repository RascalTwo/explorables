type PillarId = "deliver" | "secure" | "scale" | "connect" | "observe" | "neutral";
type StatusId = "strategic" | "established" | "harvest" | "neutral";
interface Product { id: string; name: string; pillar: PillarId; status: StatusId; zone: string; star?: boolean; role: string; desc: string; where: string; points: string[]; src?: string }
interface Zone { id: string; name: string; desc: string; foot: string; kind?: string; neutral?: boolean }

const PILLARS: Record<PillarId, { label: string; color: string; blurb: string }> = {
  deliver:  { label: "Deliver AI",        color: "var(--deliver)", blurb: "Move data fast, feed the GPUs, optimize utilization across hybrid multicloud." },
  secure:   { label: "Secure AI",         color: "var(--secure)",  blurb: "Runtime protection for AI models, apps, and agents — policy enforcement at the inference layer." },
  scale:    { label: "Scale AI",          color: "var(--scale)",   blurb: "Traffic management & load balancing for inference at scale — the 'AI factory'." },
  connect:  { label: "Connect AI",        color: "var(--connect)", blurb: "Distributed orchestration & connectivity across clouds, on‑prem, and edge." },
  observe:  { label: "Observe & Operate",  color: "var(--observe)", blurb: "Visibility and operations across the whole ADSP estate." },
  neutral:  { label: "Not an F5 product",  color: "var(--neutral)", blurb: "The models / inference engines themselves — F5 sits around this, not inside it." },
};
const STATUS_LABEL: Record<StatusId, string> = {
  strategic:  "Strategic — F5 is actively investing here in 2026",
  established: "Established platform capability — long‑standing, stable",
  harvest:    "Harvest mode — still sold & patched, but superseded; not where F5 points new customers",
  neutral:    "Third‑party — shown for context",
};

// Each product. zone = which pipeline column (or 'agents' / 'observe' lane).
const PRODUCTS: Product[] = [
  // ---- Public edge / DMZ ----
  { id:"bigip-edge", name:"BIG‑IP", pillar:"scale", status:"established", zone:"edge",
    role:"Public ingress, TLS, L4–L7 load balancing.",
    desc:"The classic F5 ADC — hardware or virtual. In an AI design it fronts the public‑facing tier (e.g. a customer chatbot's DMZ), terminating TLS and load‑balancing into the app/API layer.",
    where:"Sits at the very front, between the internet and the AI application tier.",
    points:["Decades‑old, battle‑tested ADC platform","Not AI‑specific — but the AI app's traffic still needs an ADC","Pairs with BIG‑IP Zero Trust Access for identity‑aware ingress"] },
  { id:"xc", name:"F5 Distributed Cloud (XC)", pillar:"connect", status:"established", zone:"edge",
    role:"SaaS‑delivered edge: WAF, DDoS, API security, multicloud networking.",
    desc:"F5's SaaS edge platform. For AI apps it provides the public WAF/DDoS shield and can also stitch multicloud connectivity between where the app lives and where the models run.",
    where:"Public edge, in front of the AI app — and laterally across clouds.",
    points:["Distributed Cloud WAF & DDoS protect the public surface","API discovery & schema enforcement on AI APIs","Doubles as the 'Connect AI' multicloud fabric"] },
  { id:"ai-waf", name:"AI‑Powered WAF (risk scoring)", pillar:"secure", status:"strategic", zone:"edge",
    role:"ML risk scoring on web/API traffic.",
    desc:"F5's WAF augmented with machine‑learning risk scoring — announced at AppWorld 2026. Scores incoming requests for likelihood of being malicious, including AI‑powered attack patterns, before they reach the AI app.",
    where:"Inline at the public edge / API tier.",
    points:["Announced AppWorld 2026 as part of the ADSP refresh","'AI‑powered attacks need AI‑powered defense' framing","Complements (doesn't replace) signature‑based WAF rules"] },
  { id:"bot", name:"F5 Bot Defense / Agentic Bot Defense", pillar:"secure", status:"strategic", zone:"edge",
    role:"Stops automated abuse; tells good AI agents from bad bots.",
    desc:"Bot management at the edge. The 2026 'Agentic Bot Defense' extension is built to distinguish sanctioned AI agents (your own, partners') from malicious automation hitting your AI endpoints.",
    where:"Edge, inline with the public AI surface; also relevant on the agentic plane.",
    points:["Agentic Bot Defense announced AppWorld 2026","Recognizes legitimate agent traffic instead of blanket‑blocking automation","Feeds the same telemetry pipeline as the rest of ADSP"] },

  // ---- App & API tier ----
  { id:"api-gw", name:"F5 API Gateway", pillar:"scale", status:"established", zone:"api",
    role:"Manage & secure API traffic.",
    desc:"F5's long‑standing API gateway capability, re‑positioned for the fact that 'an AI app' is mostly a pile of API calls — to model providers, vector stores, tools, downstream agents. Routing, rate limiting, auth, schema.",
    where:"Between the AI application and everything it calls (models, tools, data services).",
    points:["Not new — but newly central to the AI story","Handles the 'east‑west' API sprawl of a RAG/agent app","Distinct from the deprecated F5 AI Gateway product"] },
  { id:"api-sec", name:"F5 API Security", pillar:"secure", status:"established", zone:"api",
    role:"Discover & protect AI APIs; stop abuse and data exposure.",
    desc:"Continuous API discovery (including shadow APIs), schema enforcement, and abuse/data‑leak protection — applied to the APIs an AI app exposes and consumes.",
    where:"Wraps the API tier; integrates with Distributed Cloud and BIG‑IP.",
    points:["AI apps multiply API surface — discovery matters","Enforces request/response schemas on AI endpoints","Detects sensitive‑data exfiltration via API responses"] },
  { id:"nginx", name:"NGINX (NGINX One / NGINX Plus)", pillar:"connect", status:"established", zone:"api",
    role:"Kubernetes ingress & app delivery — the data‑plane workhorse.",
    desc:"F5 acquired NGINX in 2019. For self‑hosted AI apps, NGINX is the in‑cluster reverse proxy / ingress doing the actual request handling. 'NGINX One' is the unified management console for the NGINX fleet.",
    where:"Inside the Kubernetes cluster running the AI app — ingress and service‑to‑service.",
    points:["The de‑facto data plane for containerized AI workloads","NGINX One = single management console across NGINX instances","Foundation that NGINX Gateway Fabric and the MCP protections build on"] },
  { id:"ngf", name:"NGINX Gateway Fabric", pillar:"connect", status:"strategic", zone:"api",
    role:"K8s‑native Gateway API impl — F5's in‑cluster LLM data plane.",
    desc:"NGINX's implementation of the Kubernetes Gateway API. With the Gateway API Inference Extension it becomes F5's answer for routing LLM/inference traffic inside a cluster — and it's a certified solution for Red Hat OpenShift.",
    where:"In‑cluster routing layer in front of model‑serving pods.",
    points:["Certified for Red Hat OpenShift (late 2025)","Implements Gateway API + Inference Extension","Part of F5's 'you don't need a separate AI gateway' positioning"] },

  // ---- AI Security runtime (inline, in front of models) ----
  { id:"guardrails", name:"F5 AI Guardrails", pillar:"secure", status:"strategic", zone:"aisec", star:true,
    role:"★ The flagship AI security product — runtime prompt/response inspection.",
    desc:"Came from F5's CalypsoAI acquisition ($180M, closed Sept 2025; was 'Inference Defend'). Deploys as a proxy directly in front of AI models. Intercepts prompts before they reach the model, analyzes outputs before they return to users. The 'AI Runtime Protection' pillar of the June‑2026 F5 AI Security Platform.",
    where:"Inline, between the AI app and the model — the 'front door' of every LLM interaction. Self‑hosted on EKS / AKS / GKE / Red Hat OpenShift (certified Operator), or via F5 SaaS.",
    points:["Blocks jailbreaks & prompt‑injection attempts (F5 cites ~98.2% efficacy)","Scans outputs for sensitive‑data patterns (PII, secrets)","Enforces compliance — GDPR, EU AI Act","Integrated with Google Cloud Agent Gateway (May 2026)","This is the slot the deprecated F5 AI Gateway used to occupy"],
    src:'F5 blog "completes acquisition of CalypsoAI, introduces F5 AI Guardrails and F5 AI Red Team"; F5 /products/ai-guardrails; F5 AI Security Platform press release (Jun 22, 2026); F5 blog "AI Guardrails integration with Google Cloud Agent Gateway".' },
  { id:"ai-gateway", name:"F5 AI Gateway", pillar:"secure", status:"harvest", zone:"aisec",
    role:"⚠ The 2024 standalone LLM proxy — functionally succeeded by AI Guardrails.",
    desc:"Launched Nov 2024: a Kubernetes/Helm proxy with a Core (routing, forwarding, logging) plus pluggable Processors (Prompt Guard, Content Guard, Topic Detect Labs). Still a purchasable SKU (Base + per‑API‑call Add‑On), still patched at the entitlement/TLS level (~v1.3) — but every customer‑facing signal points away from it.",
    where:"Would sit exactly where AI Guardrails now sits — inline in front of the models. That overlap is the point.",
    points:["Docs URL aigateway.clouddocs.f5.com 301‑redirects to a marketing page — and as of mid‑2026 the changelog sub‑page redirects too","'Introducing F5 AI Gateway' DevCentral article is archived","Absent from Q1 & Q2 FY26 earnings calls and from AppWorld 2026","Absent again from the Jun‑2026 F5 AI Security Platform launch that consolidated F5's whole AI‑security lineup","Not named on F5's /ai, /products/ai-guardrails, or campaign pages","Original Processors superseded by the CalypsoAI runtime","Verdict: don't build on it in 2026 — use AI Guardrails"],
    src:'F5 docs redirect (aigateway.clouddocs.f5.com → /solutions/ai-delivery-and-security); F5 AI Security Platform press release (Jun 22, 2026); F5 Q1 & Q2 FY26 earnings transcripts — all omit AI Gateway.' },
  { id:"red-team", name:"F5 AI Red Team", pillar:"secure", status:"strategic", zone:"aisec",
    role:"Continuous automated adversarial testing of AI systems.",
    desc:"Also from the CalypsoAI lineage. Continuously attacks your AI systems — jailbreaks, prompt attacks, data‑exfil attempts — and produces explainable results proving (or disproving) resilience. Runs offline / in CI alongside the runtime.",
    where:"Not in the request path — a testing harness pointed at the model/app, feeding findings to AI Guardrails policy.",
    points:["Explainable results, not just a pass/fail score","Runs pre‑deployment and continuously in production","Findings flow into AI Remediate → Guardrails"] },
  { id:"remediate", name:"F5 AI Remediate", pillar:"secure", status:"strategic", zone:"aisec",
    role:"Closes the loop: Red Team findings → Guardrails policy.",
    desc:"Announced at AppWorld 2026. Turns the vulnerabilities AI Red Team finds into enforceable AI Guardrails policies — automating the 'now actually fix it' step between testing and runtime enforcement.",
    where:"Control‑plane glue between AI Red Team (testing) and AI Guardrails (runtime).",
    points:["Announced AppWorld 2026","Automates test‑finding → runtime‑policy","Part of the 'integrated AI runtime protection' story"] },

  // ---- Inference / model serving ----
  { id:"lb-ai", name:"Load Balancing for AI", pillar:"scale", status:"strategic", zone:"infer",
    role:"'AI factory' load balancing — distribute inference across GPUs.",
    desc:"F5's positioning for spreading inference traffic across GPU nodes and clusters — keeping expensive accelerators utilized and tail latency in check. Marketed as 'AI factory load balancing.'",
    where:"Between the app/API tier and the pool of model‑serving instances.",
    points:["Treats a GPU fleet like a server farm to balance across","Latency‑ and utilization‑aware steering","Often realized via BIG‑IP / rSeries / DPU‑accelerated data paths"] },
  { id:"rseries", name:"BIG‑IP rSeries / VELOS", pillar:"scale", status:"established", zone:"infer",
    role:"High‑throughput hardware platforms for inference traffic at scale.",
    desc:"F5's modern hardware/chassis line. In AI designs these are positioned as the muscle for moving inference traffic at high line rates near the model factory.",
    where:"Data‑center fabric in front of GPU clusters.",
    points:["Hardware ADCs / chassis — successor to legacy VIPRION","Re‑pitched for AI‑scale throughput","Hosts the load‑balancing‑for‑AI function"] },
  { id:"dpu", name:"BIG‑IP + NVIDIA BlueField DPU", pillar:"scale", status:"strategic", zone:"infer",
    role:"DPU‑accelerated data path — NVIDIA partnership.",
    desc:"F5 offloads traffic processing onto NVIDIA BlueField DPUs sitting in the AI servers, part of the NVIDIA Cloud Partner reference architecture for securing inference at scale — line‑rate security/steering without burning host CPU.",
    where:"On the NICs/DPUs of the GPU servers themselves — the closest F5 gets to the metal.",
    points:["NVIDIA Cloud Partner reference architecture","Offloads from host CPU → DPU","Also accelerates the data‑ingest path (overlaps 'Deliver AI')"] },
  { id:"bigip21", name:"BIG‑IP v21.1", pillar:"scale", status:"strategic", zone:"infer",
    role:"2026 release: post‑quantum crypto + AI security incl. MCP Protocol Protection.",
    desc:"The early‑2026 BIG‑IP release. Adds post‑quantum cryptography, BIG‑IP Zero Trust Access, and — relevant to AI — MCP Protocol Protection: parsing/controlling Model Context Protocol traffic at the BIG‑IP data plane.",
    where:"Anywhere BIG‑IP sits — but the MCP feature targets the agentic plane.",
    points:["GA early 2026 (AppWorld 2026 cohort)","Post‑quantum crypto + Zero Trust Access","MCP Protocol Protection ties it to the agent lane above"] },

  // ---- Model factory (NOT F5) ----
  { id:"models", name:"LLMs & inference engines", pillar:"neutral", status:"neutral", zone:"factory",
    role:"The models themselves — not an F5 product.",
    desc:"Anthropic / OpenAI / Azure AI Foundry APIs, or self‑hosted Llama / Mistral via vLLM, NVIDIA NIM, Triton, etc. F5's whole story is that it sits around this box — securing, steering, observing the traffic into and out of it — not replacing it.",
    where:"The center of gravity everything else orbits.",
    points:["F5 AI Gateway / AI Guardrails proxy traffic to whichever backend you pick","F5 explicitly supports multi‑provider (Anthropic, ChatGPT, Ollama, Azure AI)","This box is yours / the model vendor's — F5 doesn't build models"] },

  // ---- Data ingest ----
  { id:"data-delivery", name:"F5 data delivery (S3‑compatible ingest acceleration)", pillar:"deliver", status:"strategic", zone:"data",
    role:"Accelerate data ingest so GPUs aren't starved.",
    desc:"F5's 'Deliver AI' building block: speed up data movement from S3‑compatible object storage into training/inference, and move data efficiently for distributed inference across hybrid multicloud.",
    where:"Between object storage / data lakes and the model factory — feeding it.",
    points:["S3‑compatible storage acceleration","Targets GPU utilization (idle GPUs = wasted money)","Spans hybrid multicloud data movement"] },

  // ---- AGENTS LANE ----
  { id:"nginx-mcp", name:"NGINX MCP Protocol Protection", pillar:"connect", status:"strategic", zone:"agents",
    role:"Parse & control Model Context Protocol traffic at the NGINX data plane.",
    desc:"Announced AppWorld 2026. NGINX gains awareness of MCP — giving DevOps/SRE/platform teams visibility and control over sanctioned and shadow AI‑agent activity. F5's framing: you get this 'without requiring a separate AI gateway.'",
    where:"In‑path wherever NGINX sits — specifically watching agent‑to‑agent / agent‑to‑tool MCP calls.",
    points:["Announced AppWorld 2026","Sees both sanctioned and shadow agent traffic","The 'without a separate AI gateway' line that signals AI Gateway's de‑emphasis"] },
  { id:"bigip-mcp", name:"BIG‑IP v21.1 MCP Protection", pillar:"scale", status:"strategic", zone:"agents",
    role:"MCP awareness at the BIG‑IP data plane.",
    desc:"The MCP Protocol Protection feature shipped in BIG‑IP v21.1 — agentic AI patterns with BIG‑IP v21 + MCP + OpenShift are a documented F5 reference design.",
    where:"BIG‑IP positions on the agentic plane in addition to its classic ADC roles.",
    points:["Same MCP capability, BIG‑IP side","Reference design: BIG‑IP v21 + MCP + OpenShift","Complements the NGINX MCP protections"] },
  { id:"bot-agent", name:"Agentic Bot Defense", pillar:"secure", status:"strategic", zone:"agents",
    role:"Distinguish sanctioned AI agents from malicious automation.",
    desc:"The agent‑facing face of F5 Bot Defense — built so legitimate AI agents (yours, partners') aren't swept up with malicious bots hitting your AI endpoints.",
    where:"Edge + agentic plane.",
    points:["Announced AppWorld 2026","Recognizes legitimate agent identities","Shares telemetry with the rest of ADSP"] },

  // ---- OBSERVABILITY BAND ----
  { id:"insight", name:"F5 Insight for ADSP", pillar:"observe", status:"strategic", zone:"observe",
    role:"New (2026) observability layer across the F5 platform.",
    desc:"Announced at AppWorld 2026. A telemetry/observability layer spanning the ADSP estate — delivery and security signals, including for AI workloads — so ops teams have one place to watch traffic, threats, and AI activity.",
    where:"Above everything — collects from edge, API tier, AI security runtime, inference fabric, and the agentic plane.",
    points:["Announced AppWorld 2026","Cross‑platform telemetry for ADSP","NB: proprietary attribute schema — needs an OTel remap shim to feed Arize Phoenix / OpenInference tooling"] },
  { id:"surepath", name:"SurePath AI (AI Discovery)", pillar:"secure", status:"strategic", zone:"observe",
    role:"Network‑based discovery of every AI app & agent — including shadow AI.",
    desc:"F5's second AI‑security acquisition (announced June 22, 2026, alongside the F5 AI Security Platform). Network‑based passive detection plus intent classification — finds sanctioned and unsanctioned (shadow) AI usage across the enterprise without per‑app integration. Becomes the 'AI Discovery' pillar of the F5 AI Security Platform.",
    where:"Spans the whole estate at the network layer — feeds discovery into Governance / Runtime Protection (AI Guardrails).",
    points:["Acquired June 22, 2026 (second AI‑security buy after CalypsoAI)","Network‑based passive detection — no application integration required","Surfaces shadow AI, not just sanctioned apps","The 'AI Discovery' pillar of the F5 AI Security Platform"],
    src:'F5 AI Security Platform press release (Jun 22, 2026); GeekWire / SecurityBrief coverage of the SurePath AI acquisition.' },
];

const ZONES: Zone[] = [
  { id:"clients", name:"Users & Clients", desc:"Browsers, apps, partner systems, autonomous agents calling in.", foot:"External" , kind:"plain"},
  { id:"edge",    name:"Public Edge / DMZ", desc:"The internet‑facing perimeter of the AI app.", foot:"" },
  { id:"api",     name:"AI App & API Tier", desc:"The application, and the API sprawl it consumes (models, tools, data).", foot:"" },
  { id:"aisec",   name:"AI Security Runtime", desc:"Inline policy enforcement on prompts & responses — the 'front door' of the model.", foot:"Inline proxy" },
  { id:"infer",   name:"Inference / Serving Fabric", desc:"Steering & balancing traffic across GPU‑backed model instances.", foot:"" },
  { id:"factory", name:"Model 'AI Factory'", desc:"The LLMs / inference engines themselves.", foot:"Not F5", neutral:true },
  { id:"data",    name:"Data Ingest", desc:"Object storage & data lakes feeding training / RAG / inference.", foot:"Feeds the factory →←" },
];

// ---- render ----
function chipEl(p: Product) {
  const b = document.createElement("button");
  b.className = `chip s-${p.status} ${p.status==="harvest"?"harvest":""} ${p.pillar==="neutral"?"neutral-chip":""} ${(p.zone==="agents"||p.zone==="observe")?"lane-chip":""}`;
  b.style.borderLeftColor = PILLARS[p.pillar].color;
  b.innerHTML = `<span class="status-dot"></span>
    <span class="c-name">${p.star?'<span class="star">★</span>':''}${escapeHtml(p.name)}</span>
    <span class="c-role">${escapeHtml(p.role)}</span>`;
  b.addEventListener("click", () => openDrawer(p));
  return b;
}
function escapeHtml(s: string){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"} as Record<string, string>)[c]!);}

const pipelineEl = document.getElementById("pipeline")!;
ZONES.forEach((z, i) => {
  if (i>0) {
    const a = document.createElement("div");
    a.className = "arrow " + (z.id==="data" ? "back" : "fwd");
    pipelineEl.appendChild(a);
  }
  const zoneDiv = document.createElement("div");
  zoneDiv.className = "zone";
  const card = document.createElement("div");
  card.className = "zone-card" + (z.neutral?" neutral":"");
  card.innerHTML = `<div class="zone-hd"><div class="z-name">${escapeHtml(z.name)}</div><div class="z-desc">${escapeHtml(z.desc)}</div></div>`;
  const body = document.createElement("div");
  body.className = "zone-body";
  PRODUCTS.filter(p=>p.zone===z.id).forEach(p=>body.appendChild(chipEl(p)));
  if (z.id==="clients") {
    body.innerHTML = `<div style="font-size:11px;color:var(--faint);line-height:1.5;padding:6px 2px">No F5 product here — but note <b style="color:var(--muted)">autonomous agents are clients too</b>. That's why F5 pushes MCP visibility onto the edge.</div>`;
  }
  card.appendChild(body);
  if (z.foot) card.innerHTML += `<div class="zone-foot">${escapeHtml(z.foot)}</div>`;
  zoneDiv.appendChild(card);
  pipelineEl.appendChild(zoneDiv);
});

PRODUCTS.filter(p=>p.zone==="agents").forEach(p=>document.getElementById("agentChips")!.appendChild(chipEl(p)));
PRODUCTS.filter(p=>p.zone==="observe").forEach(p=>document.getElementById("observeChips")!.appendChild(chipEl(p)));

// ---- drawer ----
const scrim = document.getElementById("scrim")!, drawer = document.getElementById("drawer")!;
function openDrawer(p: Product) {
  document.getElementById("dPillar")!.textContent = PILLARS[p.pillar].label;
  document.getElementById("dPillar")!.style.color = PILLARS[p.pillar].color;
  document.getElementById("dName")!.textContent = p.name;
  const badges = document.getElementById("dBadges")!;
  badges.innerHTML = `<span class="badge ${p.status}">${STATUS_LABEL[p.status]}</span>`;
  const body = document.getElementById("dBody")!;
  body.innerHTML = `
    <h5>Pillar</h5><p>${escapeHtml(PILLARS[p.pillar].label)} — ${escapeHtml(PILLARS[p.pillar].blurb)}</p>
    <h5>What it is</h5><p>${escapeHtml(p.desc)}</p>
    <h5>Where it sits</h5><p class="where">${escapeHtml(p.where)}</p>
    <h5>Notes</h5><ul>${p.points.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
    ${p.src?`<h5>Source</h5><p class="src">${escapeHtml(p.src)}</p>`:""}
  `;
  scrim.classList.add("open"); drawer.classList.add("open");
}
function closeDrawer(){ scrim.classList.remove("open"); drawer.classList.remove("open"); }
scrim.addEventListener("click", closeDrawer);
document.getElementById("closeb")!.addEventListener("click", closeDrawer);
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeDrawer(); });

// ---- harvest highlight toggle ----
const tBtn = document.getElementById("toggleHarvest")!;
tBtn.addEventListener("click", ()=>{
  document.body.classList.toggle("dim-nonharvest");
  tBtn.classList.toggle("active", document.body.classList.contains("dim-nonharvest"));
});
