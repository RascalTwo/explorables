export {};
type Level = "full" | "partial" | "scripted" | "manual" | "none";
type SurfaceKey = "azure" | "entra" | "m365" | "guest";
interface Tool {
  name: string;
  kind: string;
  rank: string;
  tag: string;
  loser?: boolean;
  diff?: boolean;
  badge?: "winner" | "loser" | "diff";
  cov: Record<SurfaceKey, Level>;
  verdict: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
}

const LEVELS: Record<Level, { label: string; note: string }> = {
  full: { label: "Full", note: "First-class — the engine does the work" },
  partial: { label: "Partial", note: "Works, but narrow / incomplete coverage" },
  scripted: { label: "Scripted", note: "Reachable — but you write the idempotency yourself" },
  manual: { label: "Manual", note: "By hand only — clicking, not code" },
  none: { label: "Can't", note: "Out of reach for this tool" },
};

const SURFACES: { key: SurfaceKey; group: string; t: string; d: string; ex: string }[] = [
  {
    key: "azure",
    group: "day1",
    t: "Azure resources",
    d: "ARM control plane",
    ex: "VMs · storage · networking · app svc",
  },
  {
    key: "entra",
    group: "day1",
    t: "Entra ID / identity",
    d: "Microsoft Graph",
    ex: "users · groups · app regs",
  },
  {
    key: "m365",
    group: "day1",
    t: "M365 · Purview · Exchange",
    d: "data-plane admin APIs",
    ex: "DLP · compliance · Teams policy",
  },
  {
    key: "guest",
    group: "day2",
    t: "Inside the VM",
    d: "guest OS + app config",
    ex: "packages · services · app deploy",
  },
];

const TOOLS: Tool[] = [
  {
    name: "ClickOps (the portal)",
    kind: "point & click",
    loser: true,
    rank: "✗",
    tag: "not code",
    badge: "loser",
    cov: { azure: "manual", entra: "manual", m365: "manual", guest: "manual" },
    verdict:
      "The loser by construction. Fine to <span class='em'>explore</span> — poison to <span class='em'>ship</span>. Nothing is repeatable, reviewable, or recoverable.",
    specs: {
      Style: "Imperative, by hand",
      State: "Your memory",
      Scope: "Everything (one click at a time)",
      Effort: "Zero up front, infinite later",
    },
    pros: ["Zero setup", "Discoverable / great for learning", "Fine for a one-off poke"],
    cons: [
      "Not repeatable",
      "No version control or review",
      "Drifts silently",
      "Doesn't scale past one human",
    ],
  },
  {
    name: "Bicep / ARM",
    kind: "declarative · Azure-native",
    rank: "01",
    tag: "Azure only",
    cov: { azure: "full", entra: "partial", m365: "none", guest: "none" },
    verdict:
      "<span class='em'>Best for pure-Azure resources.</span> No state file (ARM is the state), day-one coverage of new Azure features, and it's just nicer ARM JSON.",
    specs: {
      Style: "Declarative (Day 1)",
      State: "None — ARM holds it",
      Scope: "Azure control plane",
      Effort: "Low — no backend to run",
    },
    pros: [
      "No state file to manage",
      "First-party, day-one Azure features",
      "Clean vs raw ARM JSON",
      "Free idempotency",
    ],
    cons: [
      "Azure-only, single cloud",
      "No data-plane reach",
      "Entra: Graph ext is GA but narrow (7 types, no CA)",
      "Makes the VM, can't configure inside it",
    ],
  },
  {
    name: "Terraform",
    kind: "declarative · multi-cloud",
    rank: "02",
    tag: "widest declarative reach",
    badge: "winner",
    cov: { azure: "full", entra: "full", m365: "partial", guest: "none" },
    verdict:
      "<span class='em'>Best when you're multi-cloud</span> or need resources <em>and</em> identity in one tool — <code>azurerm</code> + <code>azuread</code> cover both.",
    specs: {
      Style: "Declarative (Day 1)",
      State: "tfstate — you run a backend",
      Scope: "Azure + Entra + ~everything",
      Effort: "Medium — state + provider versions",
    },
    pros: [
      "Multi-cloud, one language",
      "azuread reaches identity",
      "Huge module ecosystem",
      "Mature plan / apply / destroy",
    ],
    cons: [
      "State file to store, lock, protect",
      "azurerm can lag Azure's API",
      "Thin on M365 / Purview",
      "Guest-OS config is an anti-pattern here",
    ],
  },
  {
    name: "Idempotent PowerShell / CLI",
    kind: "imperative, written to converge",
    rank: "03",
    tag: "reaches everything",
    badge: "winner",
    cov: { azure: "scripted", entra: "scripted", m365: "scripted", guest: "scripted" },
    verdict:
      "<span class='em'>The escape hatch.</span> When Bicep and Terraform tap out — DLP, Purview, Exchange, Teams — this is the <em>only</em> door. Write the check-then-act scripts once; they reach 100% of the surface.",
    specs: {
      Style: "Imperative, hand-made idempotent",
      State: "None — you write the convergence",
      Scope: "Everything: Az · Graph · Exchange/S&C",
      Effort: "High — you build what the engines give free",
    },
    pros: [
      "Reaches the entire surface",
      "Only option for M365 / Purview / Exchange",
      "Guest config too (DSC / remoting)",
      "Just an authenticated API call underneath",
    ],
    cons: [
      "You hand-roll idempotency",
      "No state engine or drift-correction",
      "No plan / preview",
      "Most code to own",
    ],
  },
  {
    name: "Ansible",
    kind: "config management · agentless YAML",
    rank: "≠",
    diff: true,
    tag: "different game: Day 2",
    badge: "diff",
    cov: { azure: "partial", entra: "partial", m365: "scripted", guest: "full" },
    verdict:
      "<span class='em'>Not a rival — a different layer.</span> It owns the one thing the others can't touch: configuring the guest OS + apps <em>inside</em> your VMs, and keeping them that way. Real rivals: Puppet / Chef / PowerShell DSC — not Bicep.",
    specs: {
      Style: "Idempotent playbooks (Day 2)",
      State: "None — idempotent modules",
      Scope: "In-VM config (+ can provision, subpar)",
      Effort: "Medium — pays off only if you have VMs",
    },
    pros: [
      "Owns Day-2 in-VM config — uniquely",
      "Agentless, one tool for a whole fleet",
      "azcollection is Microsoft-maintained",
      "Can also orchestrate your PowerShell",
    ],
    cons: [
      "Provisioning is redundant vs TF/Bicep",
      "No native M365 / Purview reach",
      "In-VM config isn't Azure-specific",
      "Zero value if you're all-PaaS + M365",
    ],
  },
];

// ---- render matrix ----
const mx = document.querySelector("#matrix")!;
// row 0: group headers
mx.insertAdjacentHTML("beforeend", `<div></div>`);
mx.insertAdjacentHTML(
  "beforeend",
  `<div class="mx-group g1" style="grid-column: span 3"><span class="tag">DAY 1</span> Provision — the cloud surface</div>`,
);
mx.insertAdjacentHTML("beforeend", `<div class="mx-spacer"></div>`);
mx.insertAdjacentHTML(
  "beforeend",
  `<div class="mx-group g2"><span class="tag">DAY 2</span> Configure — inside</div>`,
);
// row 1: column headers
mx.insertAdjacentHTML("beforeend", `<div></div>`);
for (const s of SURFACES) {
  if (s.key === "guest") mx.insertAdjacentHTML("beforeend", `<div class="mx-spacer"></div>`);
  mx.insertAdjacentHTML(
    "beforeend",
    `<div class="mx-colhead ${s.group === "day2" ? "day2" : ""}"><div class="t">${s.t}</div><div class="d">${s.d}</div><div class="ex">${s.ex}</div></div>`,
  );
}
// tool rows
for (const tool of TOOLS) {
  const cls = tool.loser ? "loser" : tool.diff ? "diff" : "";
  mx.insertAdjacentHTML(
    "beforeend",
    `<div class="mx-rowhead ${cls}"><div class="t">${tool.name}</div><div class="k">${tool.kind}</div></div>`,
  );
  for (const s of SURFACES) {
    if (s.key === "guest") mx.insertAdjacentHTML("beforeend", `<div class="mx-spacer"></div>`);
    const lv = tool.cov[s.key];
    mx.insertAdjacentHTML(
      "beforeend",
      `<div class="cell lvl-${lv} ${s.group === "day2" ? "day2" : ""}" data-viz-id="cell-${tool.rank}-${s.key}" data-label="${tool.name} × ${s.t}">
         <div class="lvl"><span class="dot"></span>${LEVELS[lv].label}</div>
         <div class="note">${LEVELS[lv].note}</div>
       </div>`,
    );
  }
}

// ---- legend ----
document.querySelector("#legend")!.innerHTML =
  `<div class="legend">` +
  Object.entries(LEVELS)
    .map(
      ([k, v]) => `<span class="legend-item"><span class="swatch sw-${k}"></span>${v.label}</span>`,
    )
    .join("") +
  `</div>`;

// ---- decision flow ----
const FLOW = [
  {
    cls: "f-azure",
    q: "Provisioning…",
    w: "Azure resources — VMs, storage, networking",
    a: "<span class='arw'>→</span> <b>Bicep</b> if you're all-in on Azure. <b>Terraform</b> if you're multi-cloud or want it in the same repo as everything else.",
  },
  {
    cls: "f-entra",
    q: "Provisioning…",
    w: "Identity — users, groups, app registrations",
    a: "<span class='arw'>→</span> <b>Terraform <code>azuread</code></b>, or <b>Microsoft.Graph PowerShell</b>. (Bicep's Graph ext is GA but narrow — 7 types, no Conditional Access.)",
  },
  {
    cls: "f-m365",
    q: "Provisioning…",
    w: "M365 — DLP, compliance, Exchange, Teams",
    a: "<span class='arw'>→</span> <b>Idempotent PowerShell</b> over the admin modules. There is no Bicep resource for a DLP rule — the cmdlet <em>is</em> the API.",
  },
  {
    cls: "f-guest",
    q: "Configuring…",
    w: "Inside the VMs — OS, packages, app deploy, patching",
    a: "<span class='arw'>→</span> <b>Ansible</b> (or Puppet / Chef / DSC). The only layer Bicep/Terraform can't reach — and <em>moot</em> if you run no VMs.",
  },
  {
    cls: "f-explore",
    q: "Just…",
    w: "Poking around once to learn",
    a: "<span class='arw'>→</span> <b>ClickOps</b> is genuinely fine here — just never let it become how you <em>ship</em>.",
  },
];
document.querySelector("#flow")!.innerHTML = FLOW.map(
  (f) =>
    `<div class="card flowcard ${f.cls}"><div class="q">${f.q}</div><div class="w">${f.w}</div><div class="a">${f.a}</div></div>`,
).join("");

// ---- tool cards ----
document.querySelector("#cards")!.innerHTML = TOOLS.map(
  (t) => `
  <div class="card tool ${t.loser ? "loser" : ""} ${t.diff ? "diff" : ""}" data-viz-id="tool-${t.rank}" data-label="${t.name}">
    ${t.badge === "winner" ? `<div class="badge winner">PICK ME</div>` : ""}
    ${t.badge === "loser" ? `<div class="badge loser">DON'T SHIP IT</div>` : ""}
    ${t.badge === "diff" ? `<div class="badge diff">DIFFERENT GAME</div>` : ""}
    <div class="top"><span class="rank">${t.rank}</span><h3>${t.name}</h3><span class="tag">${t.tag}</span></div>
    <div class="verdict">${t.verdict}</div>
    <dl class="specs">
      ${Object.entries(t.specs)
        .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
        .join("")}
    </dl>
    <div class="pc">
      <ul class="pros">${t.pros.map((p) => `<li>${p}</li>`).join("")}</ul>
      <ul class="cons">${t.cons.map((c) => `<li>${c}</li>`).join("")}</ul>
    </div>
  </div>`,
).join("");
