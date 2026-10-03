import { $, saveHash, loadHash } from "/_kit/viz.js";

type Id = "A" | "B" | "Bp" | "C" | "Cp";
type MarkKind = "yes" | "no" | "partial";
type Mark = [MarkKind, string];
type Row = { name: string; sub: string } & Record<Id, Mark>;

const IDS: Id[] = ["A","B","Bp","C","Cp"];
const NAME: Record<Id, string> = { A:"Custom Image", B:"Raw OSS Image", Bp:"OSS + Parity", C:"NVIDIA Microservice", Cp:"Microservice + Parity" };
const SHORT: Record<Id, string> = { A:"Custom", B:"Raw OSS", Bp:"OSS+", C:"Microservice", Cp:"Micro+" };

const contenders: { id: Id; name: string; tag: string; plain: string; analogy: string; tech: string; bullets: string[] }[] = [
  { id:"A", name:"Custom Image", tag:"baseline · prior pick",
    plain:"A purpose-built container we assembled ourselves with every part already inside.",
    analogy:"A <b>fully-stocked meal kit</b> — recipe plus every ingredient in the box.",
    tech:"<code>nemoguardrails 0.22.0</code> + Presidio + <code>en_core_web_lg</code> + OTel, baked into a 2 GB image.",
    bullets:["PII masking: built in","Tracing: rich","Pinned + lean (2 GB)"] },
  { id:"B", name:"Raw OSS Image", tag:"open-source, as-shipped",
    plain:"The official open-source image, used exactly as published — nothing added.",
    analogy:"The <b>recipe card alone</b>. Authentic, but you supply the missing ingredients.",
    tech:"Built from <code>NVIDIA-NeMo/Guardrails</code> main (<code>0.23.0.dev0</code>). No spaCy model, no OTel. 21.6 GB.",
    bullets:["PII masking: missing a piece → crashes","Tracing: none","One install step from parity"] },
  { id:"Bp", name:"OSS + Parity", tag:"raw OSS + 4 lines",
    plain:"The raw OSS image with the two missing parts added back — the personal-data model and the tracing wiring.",
    analogy:"The recipe card, but you <b>bought the two missing ingredients</b>. Now it's the meal kit.",
    tech:"<code>FROM nemo-raw</code> + spaCy model + OTel stack. Behaviourally = Custom Image; floats on <code>0.23.0.dev0</code>, 23 GB.",
    bullets:["PII masking: added → works","Tracing: added → rich","= Custom Image; floats, 23 GB (→3 GB lean)"] },
  { id:"C", name:"NVIDIA Microservice", tag:"the productized box",
    plain:"NVIDIA's polished, productized container with extra management features built in.",
    analogy:"A <b>restaurant appliance</b> — built for premium ingredients (GPU classifiers) we didn't have.",
    tech:"<code>nvcr.io/.../guardrails:25.12</code>, amd64-only, distroless. PII = a GPU NIM, not Presidio.",
    bullets:["PII masking: not included (uses a GPU model)","Tracing: rich + joins inbound trace (set OTEL_SDK_DISABLED=False)","amd64-only → needed emulation"] },
  { id:"Cp", name:"Microservice + Parity", tag:"microservice + Presidio · shipped",
    plain:"The microservice with Presidio bolted on — same parity idea as OSS. It reaches full behavioral parity; only structural traits hold it back. Real-world deploy is via NVIDIA's NIM Operator.",
    analogy:"Bolting a CPU spice rack onto the restaurant appliance. It works fully — but you're fighting the appliance to do it.",
    tech:"<code>FROM guardrails:25.12</code> + Presidio + spaCy (NVIDIA's documented custom-deps build). Deployed via NIM Operator <code>spec.image</code>. 5/5, rich traces, LLM rails, AND full end-to-end correlated tracing (set <code>OTEL_SDK_DISABLED=False</code> — the wrapper defaults it True). Only remaining item: config API → ClusterIP + gateway auth you add.",
    bullets:["Behaviorally = Custom (5/5, rich traces, LLM rails, correlated tracing)","Deploy via NIM Operator + custom <code>spec.image</code> (NVIDIA-supported)","Only remaining item: config API #4 (ClusterIP + gateway auth)"] },
];

const caps: Row[] = [
  { name:"Guardrail engine", sub:"the core decision logic", A:["yes",""],B:["yes",""],Bp:["yes",""],C:["yes",""],Cp:["yes",""] },
  { name:"Custom rules load & fire", sub:"jailbreak + banned-claim checks", A:["yes","both fire"],B:["partial","jailbreak fires; banned-claim never reached"],Bp:["yes","both fire"],C:["partial","jailbreak fires; rest blocked by PII crash"],Cp:["yes","both fire (output runs)"] },
  { name:"Personal-data masking", sub:"detect + redact SSN / card / phone", A:["yes","built in"],B:["no","spaCy model missing → crashes"],Bp:["yes","model added back"],C:["no","GPU NIM by default; CPU Presidio = Micro+"],Cp:["yes","Presidio bolted on"] },
  { name:"Tracing to the dashboard", sub:"see what each rule did, in Phoenix", A:["yes","rich, nested detail"],B:["no","dark — exporter present but not wired"],Bp:["yes","added back, rich"],C:["yes","rich; joins inbound trace (OTEL_SDK_DISABLED=False)"],Cp:["yes","rich; joins inbound trace (OTEL_SDK_DISABLED=False)"] },
];

const gates: Row[] = [
  { name:"PII masking works", sub:"does personal data get redacted?", A:["yes",""],B:["no","spaCy model missing (Presidio present)"],Bp:["yes","model added"],C:["no","Presidio detector absent"],Cp:["yes","Presidio added (verified)"] },
  { name:"Custom actions fire", sub:"do the jailbreak + banned-claim rules run?", A:["yes","both"],B:["partial","jailbreak only (rest blocked by PII crash)"],Bp:["yes","both"],C:["partial","jailbreak only (rest blocked by PII crash)"],Cp:["yes","both — output runs"] },
  { name:"Fail-closed contract", sub:"speaks the format our gateway expects?", A:["yes",""],B:["yes","OSS format"],Bp:["yes","OSS format"],C:["yes","activated_rails via /checks"],Cp:["yes","activated_rails via /checks"] },
  { name:"No open config API", sub:"no unauthenticated 'change the rules' endpoint", A:["yes",""],B:["yes",""],Bp:["yes",""],C:["no","unauth config API — front with ingress"],Cp:["partial","mitigated: loopback-only bind locally (LAN refuses, verified); ClusterIP + gateway auth in prod. API still unauth to whoever can reach it"] },
];

const DRAFT = { tracing:3, determinism:3, llm:2, integration:2, ops:2, build:1, repro:1 };
type DimKey = keyof typeof DRAFT;
const dims: ({ key: DimKey; name: string; lo: string; hi: string; tie?: boolean } & Record<Id, number>)[] = [
  { key:"tracing", name:"Dashboard tracing", lo:"0 = nothing shows up", hi:"3 = rich nested detail", A:3,B:0,Bp:3,C:3,Cp:3 },
  { key:"determinism", name:"Determinism (5 runs)", lo:"0 = flaky", hi:"3 = identical every run", A:3,B:3,Bp:3,C:3,Cp:3, tie:true },
  { key:"llm", name:"LLM-judged rules work", lo:"0 = broken", hi:"3 = all fire correctly", A:3,B:0,Bp:3,C:0,Cp:3 },
  { key:"integration", name:"Integration effort", lo:"0 = rewrite the gateway", hi:"3 = drop-in", A:3,B:3,Bp:3,C:2,Cp:2 },
  { key:"ops", name:"Ops weight", lo:"0 = needs GPU/DB/extra svcs", hi:"3 = single container", A:2,B:2,Bp:2,C:0,Cp:0 },
  { key:"build", name:"Build / maintain effort", lo:"0 = bespoke recipe", hi:"3 = pull-and-run", A:1,B:1,Bp:1,C:2,Cp:1 },
  { key:"repro", name:"Version reproducibility", lo:"0 = floats on latest", hi:"3 = pinned + locked", A:3,B:1,Bp:1,C:3,Cp:3 },
];
const dimColor = (i: number)=>`var(--c${(i%6)+1})`;

$("#ccards")!.innerHTML = contenders.map(c=>`
  <div class="card cc ${c.id}">
    <div class="badge">${c.tag} ${c.id==="Cp"?'<span class="pill win">SHIPPED</span>':c.id==="A"?'<span class="pill tie">prior pick</span>':c.id==="Bp"?'<span class="pill tie">TIES A</span>':''}<span class="tech-only" style="opacity:.6"> · ${c.id}</span></div>
    <h3 class="h${c.id}">${c.name}</h3>
    <div class="tagline">${c.plain}</div>
    <div class="analogy">${c.analogy}</div>
    <ul>${c.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>
    <div class="tech-only" style="margin-top:10px;color:var(--muted)"><span class="techtag">TECH</span>${c.tech}</div>
  </div>`).join("");

const recipes: { id: Id; kind: string; size: string; code: string }[] = [
  { id:"A", kind:"One Dockerfile we wrote → <code>docker build</code>", size:"≈ 2 GB",
    code:`<span class="cmt"># Containerfile (ours) — install exactly what's needed</span>
FROM python:3.11-slim
RUN pip install <span class="hl">nemoguardrails[tracing,server]==0.22.0</span> \\
      langchain-openai <span class="hl">presidio-analyzer presidio-anonymizer</span> \\
      opentelemetry-distro opentelemetry-exporter-otlp …
RUN <span class="hl">python -m spacy download en_core_web_lg</span>
CMD ["opentelemetry-instrument","nemoguardrails","server", …]` },
  { id:"B", kind:"No file of ours → clone <i>their</i> repo, build <i>their</i> Dockerfile", size:"≈ 21.6 GB",
    code:`git clone https://github.com/NVIDIA-NeMo/Guardrails
docker build -t nemo-raw ./Guardrails
<span class="cmt"># their Dockerfile runs: poetry install --all-extras</span>
<span class="cmt"># → pulls torch + streamlit (huge), but NO spaCy model,</span>
<span class="cmt">#   NO OTel exporter — the two gaps</span>` },
  { id:"Bp", kind:"A short Dockerfile layered on top of B → <code>docker build</code>", size:"≈ 23 GB → 3.3 GB lean",
    code:`FROM <span class="base">nemo-raw:oss-head</span>   <span class="cmt"># ← the Raw OSS image</span>
RUN <span class="add">python -m spacy download en_core_web_lg</span>
RUN <span class="add">pip install opentelemetry-distro opentelemetry-exporter-otlp \\
      opentelemetry-instrumentation-fastapi openinference-…</span>
ENTRYPOINT ["<span class="add">opentelemetry-instrument</span>","nemoguardrails"]` },
  { id:"C", kind:"No Dockerfile at all → <code>docker pull</code> + run with config", size:"≈ 1 GB image",
    code:`docker pull <span class="hl">nvcr.io/nvidia/nemo-microservices/guardrails:25.12</span>
docker run -p 7331:7331 \\
  -v ./config-store:/config-store \\
  -e CONFIG_STORE_PATH=/config-store \\
  -e DEFAULT_CONFIG_ID=main -e DEFAULT_LLM_PROVIDER=openai` },
  { id:"Cp", kind:"A Dockerfile on the microservice → but it fights back", size:"≈ 1.x GB",
    code:`FROM <span class="base">nvcr.io/.../guardrails:25.12</span>
<span class="cmt"># distroless strips pip → must bootstrap it first:</span>
RUN ["/app/.venv/bin/python","-m","<span class="add">ensurepip</span>","--upgrade"]
RUN ["/app/.venv/bin/python","-m","pip","install","<span class="add">presidio-analyzer</span>","presidio-anonymizer"]
RUN ["/app/.venv/bin/python","-m","spacy","download","en_core_web_lg"]
<span class="cmt"># → PII masks. But these 4 lines only buy the IMAGE / behavioral parity —</span>
<span class="cmt"># wiring it in still needs a hook change (call /checks, read</span>
<span class="cmt"># guardrails_data…stop, send model=judge-backend) + a mandatory ingress</span>
<span class="cmt"># that allowlists only /checks+health (closes the gate-#4 kill-switch).</span>` },
];
$("#recipecards")!.innerHTML = recipes.map(r=>`
  <div class="card recipe ${r.id}">
    <div class="rt h${r.id}">${NAME[r.id]}</div>
    <div class="rk">${r.kind}</div>
    <pre>${r.code}</pre>
    <div class="sz">image size: <b>${r.size}</b></div>
  </div>`).join("");

const MK: Record<MarkKind, [string, string]> = { yes:["yes","✓"], no:["no","✗"], partial:["partial","◑"] };
const markCell = (v: Mark)=>`<div class="mark ${MK[v[0]][0]}">${MK[v[0]][1]}</div>${v[1]?`<div class="cellnote">${v[1]}</div>`:""}`;
const headRow = (first: string)=>`<thead><tr><th>${first}</th>${IDS.map(id=>`<th class="AB h${id}">${NAME[id]}</th>`).join("")}</tr></thead>`;
const bodyRows = (rows: Row[])=>`<tbody>${rows.map(r=>`<tr>
    <td><div class="capname">${r.name}</div><div class="capsub">${r.sub}</div></td>
    ${IDS.map(id=>`<td class="col">${markCell(r[id])}</td>`).join("")}
  </tr>`).join("")}</tbody>`;

$("#captable")!.innerHTML = headRow("Part inside the package") + bodyRows(caps);
$("#gatestable")!.innerHTML = headRow("Gate (must-have)") + bodyRows(gates);

$("#rubricpanel")!.innerHTML = `
  <div style="display:flex;align-items:center;gap:10px;padding:2px 4px 10px;border-bottom:2px solid var(--bd);margin-bottom:4px">
    <span style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Dimension · how it's scored 0–3</span>
    <span class="scores" style="margin-left:auto">${IDS.map(id=>`<span class="sc sc${id}" style="min-width:auto;padding:1px 7px;font-size:10.5px">${SHORT[id]}</span>`).join("")}</span>
  </div>` + dims.map((d,i)=>`
  <div style="padding:11px 4px;border-bottom:${i<dims.length-1?'1px solid var(--bd)':'none'}">
    <div style="display:flex;align-items:baseline;gap:10px">
      <span style="width:10px;height:10px;border-radius:3px;background:${dimColor(i)};display:inline-block"></span>
      <b style="font-size:14px">${d.name}</b>
      ${d.tie?'<span class="pill" style="background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)">4-way tie</span>':''}
      <span class="scores" style="margin-left:auto">${IDS.map(id=>`<span class="sc sc${id}">${d[id]}</span>`).join("")}</span>
    </div>
    <div class="rubric"><span class="lo">${d.lo}</span><span class="hi">${d.hi}</span></div>
  </div>`).join("");

const cases: [string, string][] = [
  ["Benign email","should pass clean"],
  ["Email w/ SSN + card","should mask"],
  ["Prompt-injection","should block"],
  ["Banned claim in reply","should block"],
  ["Personal data in reply","should mask"],
];
const PR: Record<Id, number[]> = { A:[5,5,5,5,5], B:[0,0,5,0,0], Bp:[5,5,5,5,5], C:[0,0,5,0,0], Cp:[5,5,5,5,5] };
$("#passgrid")!.innerHTML = `
  <thead><tr><th class="row">Test case</th>${IDS.map(id=>`<th class="h${id}">${SHORT[id]}</th>`).join("")}</tr></thead>
  <tbody>${cases.map((c,i)=>`<tr>
    <td class="row"><b>${c[0]}</b> &nbsp;<span style="color:var(--muted);font-size:12px">${c[1]}</span></td>
    ${IDS.map(id=>{const v=PR[id][i]; return `<td><span class="cell ${v===5?'pass':'fail'}">${v}/5</span></td>`}).join("")}
  </tr>`).join("")}</tbody>`;
$("#passgrid")!.insertAdjacentHTML("afterend", `<div style="font-size:11.5px;color:var(--muted);margin-top:8px"><b class="hCp">Microservice + Parity now passes all 5</b> — it runs both input and output rails, and its LLM-judged self-check works once the gateway is taught the model name it sends (<code>main</code>). So it's <b>behaviorally equivalent</b> to the Custom Image; what holds it back is structural (different API #3, live config endpoint #4) + ops, not the guardrails.</div>`);

let weights = { ...DRAFT };
const saved = loadHash<{ w: string; tech: string }>();
if (saved.w) { try { weights = { ...DRAFT, ...JSON.parse(saved.w) }; } catch {} }
if (saved.tech === "1") document.body.classList.add("tech");
$<HTMLInputElement>("#techToggle")!.checked = document.body.classList.contains("tech");
$("#audlabel")!.textContent = $<HTMLInputElement>("#techToggle")!.checked ? "Technical detail" : "Plain language";

function renderSliders(){
  $("#dimsliders")!.innerHTML = dims.map((d,i)=>`
    <div class="dimrow">
      <div class="top">
        <span style="width:9px;height:9px;border-radius:2px;background:${dimColor(i)};display:inline-block"></span>
        <span class="dname">${d.name}</span>
        <span class="wlab">weight <b id="wl-${d.key}">${weights[d.key]}</b></span>
      </div>
      <input type="range" min="0" max="3" step="1" value="${weights[d.key]}" data-k="${d.key}">
    </div>`).join("");
  $("#dimsliders")!.querySelectorAll<HTMLInputElement>("input[type=range]").forEach(inp=>{
    inp.addEventListener("input", e=>{
      const t = e.target as HTMLInputElement;
      weights[t.dataset["k"] as DimKey] = +t.value;
      $(`#wl-${t.dataset["k"]}`)!.textContent = t.value;
      persist(); renderBars();
    });
  });
}
function totals(){
  const t={} as Record<Id, number>, max=dims.reduce((s,d)=>s+weights[d.key]*3,0);
  IDS.forEach(id=>{ t[id]=dims.reduce((s,d)=>s+weights[d.key]*d[id],0); });
  return { t, max };
}
function renderBars(){
  const { t, max } = totals();
  const denom = max||1;
  $("#bars")!.innerHTML = IDS.map(id=>{
    const segs = dims.map((d,i)=>{ const c=weights[d.key]*d[id]; return c>0?`<div class="seg" style="width:${c/denom*100}%;background:${dimColor(i)}" title="${d.name}: ${c}"></div>`:""; }).join("");
    return `<div class="bar">
      <div class="blab"><span class="who h${id}">${NAME[id]}</span>
        <span class="tot h${id}">${t[id]}<span style="font-size:12px;color:var(--muted);font-weight:500"> / ${max}</span></span></div>
      <div class="track ${t[id]===0?'empty':''}">${segs}</div></div>`;
  }).join("");
  const order = [...IDS].sort((a,b)=>t[b]-t[a]);
  const lead=order[0]!, second=order[1]!, gap=t[lead]-t[second];
  $("#winbanner")!.innerHTML = `Under these weights, the <b class="h${lead}">${NAME[lead]}</b> leads on raw score with <b>${t[lead]}/${max}</b> — ${gap>0?`${gap} ahead of the ${SHORT[second]}`:`tied with the ${SHORT[second]}`}. <b>What we shipped: we migrated to <span class="hCp">${NAME.Cp}</span></b> — least custom code we own, full behavioral parity with the Custom Image, and its one open endpoint (config API #4) is network-gated to not-applicable. A fit call, not a score call.`;
  $("#barlegend")!.innerHTML = dims.map((d,i)=>`<span><span class="sw" style="background:${dimColor(i)}"></span>${d.name}</span>`).join("");
}
function persist(){ saveHash({ w: JSON.stringify(weights), tech: document.body.classList.contains("tech")?"1":"0" }); }

$("#resetw")!.addEventListener("click",()=>{ weights={...DRAFT}; renderSliders(); renderBars(); persist(); });
$<HTMLInputElement>("#techToggle")!.addEventListener("change", e=>{
  const t = e.target as HTMLInputElement;
  document.body.classList.toggle("tech", t.checked);
  $("#audlabel")!.textContent = t.checked ? "Technical detail" : "Plain language";
  persist();
});

renderSliders(); renderBars();
