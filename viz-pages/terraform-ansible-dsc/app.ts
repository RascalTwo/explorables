import { arrowMarkers, saveHash, loadHash } from "@viz/kit";

type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number; fill: string; stroke: string };
type WizState = { node: string; trail: { node: string }[] };

/* ───────────── PLANE / QUADRANT ───────────── */
(function () {
  const svg = document.querySelector("#quad")!;
  const W = 620,
    H = 470,
    m = { l: 66, r: 26, t: 34, b: 56 };
  const x0 = m.l,
    x1 = W - m.r,
    y0 = m.t,
    y1 = H - m.b;
  const px = (p: number) => x0 + p * (x1 - x0); // 0=provisioning … 1=configuration
  const py = (p: number) => y1 - p * (y1 - y0); // 0=procedural(bottom) … 1=declarative(top)
  let s = arrowMarkers();
  // backdrop + quadrant tints
  s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#11161d" stroke="var(--border)" rx="8"/>`;
  s += `<rect x="${x0}" y="${y0}" width="${px(0.5) - x0}" height="${py(0.5) - y0}" fill="rgba(163,113,247,.05)"/>`; // TL Terraform
  s += `<rect x="${px(0.5)}" y="${y0}" width="${x1 - px(0.5)}" height="${py(0.5) - y0}" fill="rgba(77,159,255,.05)"/>`; // TR DSC
  s += `<rect x="${px(0.5)}" y="${py(0.5)}" width="${x1 - px(0.5)}" height="${y1 - py(0.5)}" fill="rgba(248,81,73,.05)"/>`; // BR Ansible
  s += `<line x1="${px(0.5)}" y1="${y0}" x2="${px(0.5)}" y2="${y1}" stroke="var(--border)" stroke-dasharray="4 4"/>`;
  s += `<line x1="${x0}" y1="${py(0.5)}" x2="${x1}" y2="${py(0.5)}" stroke="var(--border)" stroke-dasharray="4 4"/>`;
  // quadrant micro-captions
  const qc = (x: number, y: number, t: string) =>
    `<text x="${x}" y="${y}" fill="#4a525c" font-size="10" text-anchor="middle" font-style="italic">${t}</text>`;
  s += qc(px(0.25), py(0.5) - 8, "provision + declarative");
  s += qc(px(0.75), py(0.5) - 8, "configure + declarative");
  s += qc(px(0.75), py(0.5) + 16, "configure + procedural");
  s += qc(px(0.25), py(0.5) + 16, "provision + procedural → scripts");
  // axis labels
  s += `<text x="${px(0.5)}" y="${y0 - 14}" fill="var(--muted)" font-size="11" text-anchor="middle">▲ Declarative — describe the end-state</text>`;
  s += `<text x="${px(0.5)}" y="${y1 + 36}" fill="var(--muted)" font-size="11" text-anchor="middle">▼ Procedural — run ordered steps</text>`;
  s += `<text transform="rotate(-90 ${x0 - 46} ${py(0.5)})" x="${x0 - 46}" y="${py(0.5)}" fill="var(--muted)" font-size="11" text-anchor="middle">◀ Provision infrastructure</text>`;
  s += `<text transform="rotate(-90 ${x1 + 16} ${py(0.5)})" x="${x1 + 16}" y="${py(0.5)}" fill="var(--muted)" font-size="11" text-anchor="middle">Configure the machine ▶</text>`;

  const pts: { n: string; x: number; y: number; c: string; big?: boolean }[] = [
    { n: "Terraform", x: 0.15, y: 0.9, c: "var(--tf)", big: true },
    { n: "DSC", x: 0.85, y: 0.85, c: "var(--dsc)", big: true },
    { n: "Ansible", x: 0.82, y: 0.26, c: "var(--ans)", big: true },
    { n: "CloudFormation", x: 0.09, y: 0.82, c: "#6e7681" },
    { n: "Pulumi", x: 0.25, y: 0.78, c: "#6e7681" },
    { n: "Kubernetes", x: 0.4, y: 0.95, c: "#6e7681" },
    { n: "Packer", x: 0.46, y: 0.48, c: "#6e7681" },
    { n: "Puppet", x: 0.72, y: 0.72, c: "#6e7681" },
    { n: "Chef", x: 0.9, y: 0.44, c: "#6e7681" },
    { n: "cloud-init", x: 0.6, y: 0.3, c: "#6e7681" },
    { n: "shell / CLI glue", x: 0.2, y: 0.12, c: "#6e7681" },
  ];
  // dashed "spanning triangle" between the three primaries + shared-trait edge labels
  const P = (n: string) => {
    const p = pts.find((q) => q.n === n)!;
    return { x: px(p.x), y: py(p.y) };
  };
  const TF = P("Terraform"),
    DS = P("DSC"),
    AN = P("Ansible");
  s += `<path d="M${TF.x},${TF.y} L${DS.x},${DS.y} L${AN.x},${AN.y} Z" fill="none" stroke="#39424d" stroke-dasharray="3 5" stroke-width="1.3"/>`;
  const edge = (a: Pt, b: Pt, t: string, dy = 0) =>
    `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 + dy}" fill="#7d8590" font-size="9.5" text-anchor="middle" font-style="italic">${t}</text>`;
  s += edge(TF, DS, "both declarative", -5);
  s += edge(DS, AN, "both configure · stateless", 0);
  s += `<text x="${(TF.x + AN.x) / 2 - 6}" y="${(TF.y + AN.y) / 2}" fill="#7d8590" font-size="9.5" text-anchor="middle" font-style="italic" transform="rotate(-32 ${(TF.x + AN.x) / 2 - 6} ${(TF.y + AN.y) / 2})">the classic debate</text>`;
  // markers
  for (const p of pts) {
    const cx = px(p.x),
      cy = py(p.y),
      r = p.big ? 9 : 5;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.c}" ${p.big ? 'stroke="#fff" stroke-width="1.5"' : 'opacity="0.8"'}/>`;
    const anchor = p.x > 0.55 ? "end" : "start";
    const dx = p.x > 0.55 ? -(r + 6) : r + 6;
    s += `<text x="${cx + dx}" y="${cy + 4}" fill="${p.big ? p.c : "var(--muted)"}" font-size="${p.big ? 13 : 10.5}" font-weight="${p.big ? 700 : 400}" text-anchor="${anchor}">${p.n}</text>`;
  }
  svg.innerHTML = s;
})();

/* ───────────── MIDDLE CHILD — trait inheritance ───────────── */
(function () {
  const svg = document.querySelector("#inherit")!;
  let s = arrowMarkers();
  const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string) => ({
    x,
    y,
    w,
    h,
    fill,
    stroke,
  });
  const TF = box(30, 120, 220, 100, "rgba(163,113,247,.12)", "var(--tf)");
  const AN = box(870, 120, 220, 100, "rgba(248,81,73,.12)", "var(--ans)");
  const DS = box(430, 90, 260, 160, "rgba(77,159,255,.14)", "var(--dsc)");
  const drawBox = (b: Box, title: string, sub: string, tc: string, tsz = 16) => {
    s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="${b.fill}" stroke="${b.stroke}" stroke-width="1.8"/>`;
    s += `<text x="${b.x + b.w / 2}" y="${b.y + 34}" text-anchor="middle" fill="${tc}" font-size="${tsz}" font-weight="700">${title}</text>`;
    if (sub)
      s += `<text x="${b.x + b.w / 2}" y="${b.y + 56}" text-anchor="middle" fill="var(--muted)" font-size="11.5">${sub}</text>`;
  };
  drawBox(TF, "Terraform", "declarative desired-state", "var(--tf)");
  drawBox(AN, "Ansible", "config plane · stateless", "var(--ans)");
  drawBox(DS, "PowerShell DSC", "", "var(--dsc)", 19);
  s += `<text x="${DS.x + DS.w / 2}" y="${DS.y + 92}" text-anchor="middle" fill="var(--text)" font-size="12">the recombination</text>`;
  s += `<text x="${DS.x + DS.w / 2}" y="${DS.y + 124}" text-anchor="middle" fill="var(--dsc)" font-size="12.5" font-weight="600">declarative + on the config plane</text>`;
  s += `<text x="${DS.x + DS.w / 2}" y="${DS.y + 144}" text-anchor="middle" fill="var(--muted)" font-size="11">own trait: Get / Test / Set per resource</text>`;
  // arrows TF -> DS and AN -> DS, curved over the top
  s += `<path d="M${TF.x + TF.w},${TF.y + 30} C ${TF.x + TF.w + 70},${TF.y} ${DS.x - 70},${DS.y + 10} ${DS.x},${DS.y + 40}" fill="none" stroke="var(--tf)" stroke-width="1.8" marker-end="url(#ah)"/>`;
  s += `<path d="M${AN.x},${AN.y + 30} C ${AN.x - 70},${AN.y} ${DS.x + DS.w + 70},${DS.y + 10} ${DS.x + DS.w},${DS.y + 40}" fill="none" stroke="var(--ans)" stroke-width="1.8" marker-end="url(#ah-danger)"/>`;
  // inherited-trait chips
  const chip = (x: number, y: number, w: number, t: string, c: string) => {
    s += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="7" fill="var(--panel-2)" stroke="${c}"/><text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" fill="${c}" font-size="11">${t}</text>`;
  };
  chip(70, 268, 300, "inherits: declare end-state · drift-aware", "var(--tf)");
  chip(750, 268, 300, "inherits: stateless · additive · no ledger", "var(--ans)");
  svg.innerHTML = s;
})();

/* ───────────── MATRIX ───────────── */
const MATRIX: [string, string, string, string][] = [
  [
    "Primary job",
    "Provision &amp; tear down infrastructure",
    "Bring a node/resource to a declared end-state",
    "Configure machines, deploy apps, orchestrate",
  ],
  [
    "Plane",
    "Control plane — cloud/SaaS APIs",
    "Config plane — local to the node/resource",
    "Config plane — into the machine over SSH",
  ],
  [
    "Paradigm",
    "Declarative — desired end-state",
    "Declarative — desired end-state",
    "Procedural — ordered idempotent tasks",
  ],
  [
    "Idempotency",
    "Provider diffs vs state — automatic",
    "<b>Intrinsic</b> — every resource has Get/Test/Set",
    "Per-module; raw <code>shell</code> is on you",
  ],
  [
    "System of record",
    "<b>State file</b> (authoritative ledger)",
    "Stateless — the config <em>is</em> the desired state",
    "Stateless — inspects real state each run",
  ],
  [
    "Drift detection",
    "Strong — <code>plan</code> diffs vs state",
    "Strong — <code>Test</code> per resource, on demand",
    "None — re-run to re-converge",
  ],
  [
    "Drift correction",
    "Manual <code>apply</code>",
    "On-demand <code>set</code>; v1–v2 LCM auto-corrected",
    "Manual re-run",
  ],
  [
    "Teardown",
    "<b>First-class</b> — <code>destroy</code> reaps",
    "Weak — <code>Ensure=Absent</code> per resource",
    "Weak — no record of what to remove",
  ],
  [
    "World model",
    "Closed-world — owns all it declared",
    "Open-world / additive",
    "Open-world / additive",
  ],
  [
    "Language",
    "HCL (purpose-built DSL)",
    "PowerShell classes; v3 config in YAML/JSON",
    "YAML playbooks + Jinja2",
  ],
  [
    "Execution",
    "Agentless — calls provider APIs",
    "v3: standalone <code>dsc</code> CLI, no agent/service",
    "Agentless — push over SSH/WinRM",
  ],
  [
    "Platform reach",
    "Any cloud/SaaS with a provider",
    "Windows-first; <b>v3 cross-platform</b>",
    "Any *nix/Windows/network gear",
  ],
  [
    "Authoring unit",
    "Provider (Go)",
    "DSC Resource (PowerShell class)",
    "Module / collection (Python)",
  ],
  [
    "Sweet spot",
    "Day-0 cloud build-out, multi-cloud, SaaS",
    "Continuous node config &amp; compliance",
    "Day-1+ config, deploy, patch, ad-hoc ops",
  ],
];
document.querySelector("#matrix-body")!.innerHTML = MATRIX.map(
  (r) =>
    `<tr><th class="dim">${r[0]}</th><td class="tfcell">${r[1]}</td><td class="dsccell">${r[2]}</td><td class="anscell">${r[3]}</td></tr>`,
).join("");

/* ───────────── STATE & DRIFT SPECTRUM ───────────── */
(function () {
  const svg = document.querySelector("#spectrum")!;
  let s = "";
  const L = 110,
    R = 1010;
  const track = (y: number, label: string, leftT: string, rightT: string) => {
    s += `<text x="${L}" y="${y - 26}" fill="var(--text)" font-size="13" font-weight="600">${label}</text>`;
    s += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="var(--border)" stroke-width="2"/>`;
    s += `<circle cx="${L}" cy="${y}" r="4" fill="var(--good)"/><circle cx="${R}" cy="${y}" r="4" fill="var(--danger)"/>`;
    s += `<text x="${L}" y="${y + 22}" fill="var(--muted)" font-size="11" text-anchor="start">${leftT}</text>`;
    s += `<text x="${R}" y="${y + 22}" fill="var(--muted)" font-size="11" text-anchor="end">${rightT}</text>`;
  };
  const chip = (cx: number, y: number, t: string, c: string) => {
    const w = t.length * 7.6 + 22;
    s += `<rect x="${cx - w / 2}" y="${y - 16}" width="${w}" height="30" rx="8" fill="var(--panel-2)" stroke="${c}" stroke-width="1.6"/><text x="${cx}" y="${y + 4}" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="700">${t}</text>`;
  };
  const at = (f: number) => L + f * (R - L);
  // Track 1 — state ledger
  track(72, "Axis 1 · Keeps a central state ledger?", "Yes — authoritative", "None");
  chip(at(0.06), 72, "Terraform", "var(--tf)");
  chip(at(0.78), 72, "DSC", "var(--dsc)");
  chip(at(0.96), 72, "Ansible", "var(--ans)");
  // Track 2 — drift on demand
  track(192, "Axis 2 · Can it report drift on demand?", "Yes", "No");
  chip(at(0.06), 192, "Terraform", "var(--tf)");
  chip(at(0.22), 192, "DSC", "var(--dsc)");
  chip(at(0.95), 192, "Ansible", "var(--ans)");
  // connector spotlighting DSC's split
  s += `<line x1="${at(0.78)}" y1="88" x2="${at(0.22)}" y2="176" stroke="var(--dsc)" stroke-dasharray="3 4" stroke-width="1.3" opacity="0.75"/>`;
  s += `<text x="${at(0.5)}" y="140" fill="var(--dsc)" font-size="11" text-anchor="middle" font-style="italic">DSC: no ledger, yet still drift-aware</text>`;
  svg.innerHTML = s;
})();

/* ───────────── PROS / CONS ───────────── */
const li = (cls: string, b: string, rest: string) =>
  `<li class="${cls}"><b>${b}</b> <span>${rest}</span></li>`;
document.querySelector("#tf-pros")!.innerHTML = [
  ["Plan preview", "— <code>terraform plan</code> shows exactly what changes before apply."],
  ["State = system of record", "knows what it owns, detects drift, tears down cleanly."],
  ["Enormous provider ecosystem", "one workflow for AWS, Azure, GCP, k8s, 100s of SaaS."],
  ["Reproducible environments", "identical staging/ephemeral envs from the same code."],
]
  .map((p) => li("pro", p[0]!, p[1]!))
  .join("");
document.querySelector("#tf-cons")!.innerHTML = [
  ["State file is a liability", "locking, drift, secrets-in-state, backend ops overhead."],
  ["Bad at in-machine config", "provisioners are an escape hatch, not a strategy."],
  ["HCL hits a ceiling", "real logic (loops/conditionals) gets awkward."],
  ["Licensing churn", "the 2023 BSL move spawned the OpenTofu fork."],
]
  .map((p) => li("con", p[0]!, p[1]!))
  .join("");
document.querySelector("#dsc-pros")!.innerHTML = [
  ["Declarative + intrinsic idempotency", "Get/Test/Set is enforced by the resource contract."],
  [
    "Drift-aware without a state file",
    "<code>Test</code> reports compliance; no ledger to protect.",
  ],
  ["v3 is lean &amp; cross-platform", "one <code>dsc</code> binary, no agent/service, JSON/YAML."],
  ["Reuses existing PS resources", "huge base of class-based resources still works."],
]
  .map((p) => li("pro", p[0]!, p[1]!))
  .join("");
document.querySelector("#dsc-cons")!.innerHTML = [
  ["Weak teardown", 'no ledger → no "reap everything I didn\'t declare."'],
  ["Smaller ecosystem", "fewer resources than TF providers / Ansible modules."],
  ["Version confusion", "v1–v2 (MOF/LCM) vs v3 are almost different tools."],
  ["You own the schedule", "v3 has no agent loop — CI/cron drives drift checks."],
]
  .map((p) => li("con", p[0]!, p[1]!))
  .join("");
document.querySelector("#ans-pros")!.innerHTML = [
  ["Agentless &amp; low-friction", "just SSH + Python; nothing to install on targets."],
  ["Great procedural orchestration", "rolling deploys, ordered workflows, ad-hoc fixes."],
  ["Readable YAML, gentle ramp", "ops folks productive fast; huge module library."],
  ["Configures anything reachable", "servers, containers, network gear, bare metal."],
]
  .map((p) => li("pro", p[0]!, p[1]!))
  .join("");
document.querySelector("#ans-cons")!.innerHTML = [
  ["No system of record", "doesn't know what it manages; no clean teardown."],
  ["Idempotency is your job", "raw <code>shell</code> tasks can run twice with side effects."],
  ["Weak drift visibility", "no <code>plan</code>-style diff; run and hope it converges."],
  ["Scales into YAML spaghetti", "complex logic fights you without role discipline."],
]
  .map((p) => li("con", p[0]!, p[1]!))
  .join("");

/* ───────────── COMBO PIPELINE ───────────── */
(function () {
  const svg = document.querySelector("#combo")!;
  let s = arrowMarkers();
  const node = (x: number, y: number, w: number, h: number, fill: string, stroke: string) => ({
    x,
    y,
    w,
    h,
    fill,
    stroke,
  });
  const A = node(24, 84, 240, 64, "rgba(163,113,247,.12)", "var(--tf)");
  const B = node(320, 84, 180, 64, "#11161d", "var(--border)");
  const draw = (nd: Box, title: string, sub: string, tc: string) => {
    s += `<rect x="${nd.x}" y="${nd.y}" width="${nd.w}" height="${nd.h}" rx="11" fill="${nd.fill}" stroke="${nd.stroke}" stroke-width="1.6"/>`;
    s += `<text x="${nd.x + nd.w / 2}" y="${nd.y + 28}" text-anchor="middle" fill="${tc}" font-size="14.5" font-weight="700">${title}</text>`;
    s += `<text x="${nd.x + nd.w / 2}" y="${nd.y + 48}" text-anchor="middle" fill="var(--muted)" font-size="11">${sub}</text>`;
  };
  const arrow = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    c = "var(--muted)",
  ) => {
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" marker-end="url(#ah)"/>`;
    if (label)
      s += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 9}" text-anchor="middle" fill="var(--muted)" font-size="10.5" font-style="italic">${label}</text>`;
  };
  draw(A, "Terraform", "provision: infra · VMs · DNS", "var(--tf)");
  draw(B, "Infra exists", "IPs · hostnames", "var(--text)");
  arrow(A.x + A.w + 4, 116, B.x - 8, 116, "outputs");
  // configure phase — a bracket splitting into DSC / Ansible
  s += `<text x="700" y="34" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="600">CONFIGURE PHASE — pick a style</text>`;
  s += `<rect x="560" y="46" width="540" height="150" rx="12" fill="none" stroke="var(--border)" stroke-dasharray="5 5"/>`;
  const DS = node(590, 66, 220, 54, "rgba(77,159,255,.12)", "var(--dsc)");
  const AN = node(590, 132, 220, 54, "rgba(248,81,73,.12)", "var(--ans)");
  draw(DS, "PowerShell DSC", "declarative · Test/Set each resource", "var(--dsc)");
  draw(AN, "Ansible", "procedural · ordered · orchestrate", "var(--ans)");
  const O = node(870, 84, 210, 64, "rgba(63,185,80,.12)", "var(--both)");
  draw(O, "Running system", "served &amp; kept to spec", "var(--both)");
  arrow(B.x + B.w + 4, 116, DS.x - 8, 93, "", "var(--dsc)");
  arrow(B.x + B.w + 4, 116, AN.x - 8, 159, "", "var(--ans)");
  s += `<text x="540" y="120" text-anchor="middle" fill="var(--muted)" font-size="10.5" font-style="italic">or</text>`;
  arrow(DS.x + DS.w + 4, 93, O.x - 8, 108, "", "var(--dsc)");
  arrow(AN.x + AN.w + 4, 159, O.x - 8, 124, "", "var(--ans)");
  svg.innerHTML = s;
})();

/* ───────────── DECISION WIZARD ───────────── */
const TREE: Record<string, { q: string; options: { l: string; to: string }[] }> = {
  q1: {
    q: "Are you <b>creating or destroying</b> infrastructure resources — VMs, networks, managed DBs, DNS, IAM, or SaaS objects?",
    options: [
      { l: "Yes", to: "q2" },
      { l: "No", to: "q3" },
    ],
  },
  q2: {
    q: "On those resources, do you <b>also</b> need to configure software inside them, deploy an app, or run ordered steps?",
    options: [
      { l: "Yes", to: "COMBO" },
      { l: "No", to: "TF" },
    ],
  },
  q3: {
    q: "Are you configuring <b>machines or resources that already exist</b> — files, services, packages, registry, app/object state?",
    options: [
      { l: "Yes", to: "q4" },
      { l: "No — it's something else", to: "OTHER" },
    ],
  },
  q4: {
    q: "How do you want to express the work?",
    options: [
      {
        l: "Declaratively — describe each resource's end-state; let the tool Test &amp; fix only what drifted",
        to: "DSC",
      },
      {
        l: 'Procedurally — ordered steps, multi-host orchestration, "do X on these 50 hosts now"',
        to: "ANS",
      },
    ],
  },
};
const RESULT: Record<string, { badge: string; cls: string; text: string }> = {
  TF: {
    badge: "Terraform",
    cls: "tf",
    text: "Declarative provisioning with a state file is exactly its lane — describe the end-state and let it diff, create, and tear down.",
  },
  DSC: {
    badge: "PowerShell DSC",
    cls: "dsc",
    text: "Declarative desired-state on the config plane, with self-testing resources and drift-checking but no state file to protect — its home turf, especially for Windows/cross-platform node config and continuous compliance.",
  },
  ANS: {
    badge: "Ansible",
    cls: "ans",
    text: "Procedural config, deployment, and orchestration onto existing machines over SSH is its home turf — no state file, great for ordered workflows and ad-hoc ops.",
  },
  COMBO: {
    badge: "Both — provision then configure",
    cls: "both",
    text: "The canonical combo: Terraform provisions the infra, then hands hostnames to DSC or Ansible to configure. Don't force one tool across the line.",
  },
  OTHER: {
    badge: "Probably none of these",
    cls: "",
    text: "Sounds like image baking, first-boot, or container orchestration. Look at Packer, cloud-init, or Kubernetes before bending these tools to fit.",
  },
};
let wizState: WizState = loadHash<{ wiz: WizState }>().wiz ?? { node: "q1", trail: [] };

function renderWiz() {
  const el = document.querySelector("#wiz")!;
  const st = wizState;
  const r = RESULT[st.node];
  if (r) {
    el.innerHTML = `<div class="qn">Recommendation</div>
      <div class="result">
        <div class="badge ${r.cls}">${r.badge}</div>
        <p>${r.text}</p>
      </div>
      <div class="controls"><button id="back">‹ Back</button><button id="restart">Start over</button></div>
      <div class="breadcrumbs">${crumbs()}</div>`;
  } else {
    const node = TREE[st.node]!;
    el.innerHTML = `<div class="qn">Question</div>
      <div class="q">${node.q}</div>
      <div class="opts">
        ${node.options.map((o, i) => `<button class="opt" data-i="${i}">${o.l}</button>`).join("")}
      </div>
      <div class="controls"><button id="back" ${st.trail.length > 0 ? "" : 'style="visibility:hidden"'}>‹ Back</button><button id="restart">Start over</button></div>
      <div class="breadcrumbs">${crumbs()}</div>`;
    el.querySelectorAll<HTMLElement>(".opt").forEach((b) => {
      b.addEventListener("click", () => {
        const i = +b.dataset["i"]!;
        st.trail.push({ node: st.node });
        st.node = TREE[st.node]!.options[i]!.to;
        persist();
      });
    });
  }
  const back = el.querySelector<HTMLElement>("#back");
  if (back)
    back.addEventListener("click", () => {
      if (st.trail.length > 0) {
        st.node = st.trail.pop()!.node;
        persist();
      }
    });
  el.querySelector<HTMLElement>("#restart")!.addEventListener("click", () => {
    wizState = { node: "q1", trail: [] };
    persist();
  });
  renderFlow().catch(console.error);
}
function crumbs() {
  if (wizState.trail.length === 0) return "Path: —";
  return (
    "Path: " +
    wizState.trail
      .map((t) => `<span style="color:var(--good)">${t.node.toUpperCase()}</span>`)
      .join(" → ") +
    (RESULT[wizState.node]
      ? ` → <b style="color:var(--text)">${RESULT[wizState.node]!.badge}</b>`
      : "")
  );
}
function persist() {
  saveHash({ wiz: wizState });
  renderWiz();
}

/* ───────────── MERMAID FLOWCHART ───────────── */
import mermaid from "https://esm.sh/mermaid@11";
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    background: "#161b22",
    primaryColor: "#21262d",
    primaryTextColor: "#e6edf3",
    primaryBorderColor: "#30363d",
    lineColor: "#8b949e",
    fontSize: "12px",
    fontFamily: "ui-monospace, monospace",
  },
});
function flowSource() {
  const active = new Set(wizState.trail.map((t) => t.node));
  if (TREE[wizState.node] || RESULT[wizState.node]) active.add(wizState.node);
  const isA = (id: string) => (active.has(id) ? `:::active` : ``);
  return `flowchart TD
  START([What are you trying to do?]) --> q1
  q1{{Create or destroy<br/>infra resources?<br/><i>VMs · nets · DBs · DNS · SaaS</i>}}${isA("q1")}
  q1 -->|Yes| q2
  q1 -->|No| q3
  q2{{Also configure inside them<br/>or run ordered<br/>deploy steps?}}${isA("q2")}
  q2 -->|Yes| COMBO
  q2 -->|No| TF
  q3{{Configure machines/resources<br/>that already exist?}}${isA("q3")}
  q3 -->|Yes| q4
  q3 -->|No| OTHER
  q4{{Declarative desired-state<br/>or procedural steps?}}${isA("q4")}
  q4 -->|Declarative| DSC
  q4 -->|Procedural| ANS
  TF[Terraform]${isA("TF")}
  DSC[PowerShell DSC]${isA("DSC")}
  ANS[Ansible]${isA("ANS")}
  COMBO[/Provision then configure:<br/>Terraform + DSC or Ansible/]${isA("COMBO")}
  OTHER[None — try Packer,<br/>cloud-init or Kubernetes]${isA("OTHER")}
  classDef active fill:#1f6f3d,stroke:#3fb950,stroke-width:2px,color:#fff;
  style TF fill:#3a2a5c,stroke:#a371f7,color:#fff
  style DSC fill:#1c3a5e,stroke:#4d9fff,color:#fff
  style ANS fill:#5a2420,stroke:#f85149,color:#fff
  style COMBO fill:#173d24,stroke:#3fb950,color:#fff`;
}
let flowN = 0;
async function renderFlow() {
  const host = document.querySelector("#flow")!;
  const { svg } = await mermaid.render("flowsvg" + flowN++, flowSource());
  host.innerHTML = svg;
}

renderWiz();
