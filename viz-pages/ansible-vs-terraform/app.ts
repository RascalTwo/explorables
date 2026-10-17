import { arrowMarkers, saveHash, loadHash } from "@viz/kit";

/* ───────────── QUADRANT ───────────── */
(function () {
  const svg = document.querySelector("#quad")!;
  const W = 560,
    H = 440,
    m = { l: 62, r: 24, t: 30, b: 54 };
  const x0 = m.l,
    x1 = W - m.r,
    y0 = m.t,
    y1 = H - m.b;
  const px = (p: number) => x0 + p * (x1 - x0); // 0=provisioning … 1=configuration
  const py = (p: number) => y1 - p * (y1 - y0); // 0=procedural(bottom) … 1=declarative(top)
  let s = arrowMarkers();
  // quadrant backdrop
  s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#11161d" stroke="var(--border)" rx="8"/>`;
  s += `<line x1="${px(0.5)}" y1="${y0}" x2="${px(0.5)}" y2="${y1}" stroke="var(--border)" stroke-dasharray="4 4"/>`;
  s += `<line x1="${x0}" y1="${py(0.5)}" x2="${x1}" y2="${py(0.5)}" stroke="var(--border)" stroke-dasharray="4 4"/>`;
  // axis labels
  s += `<text x="${px(0.5)}" y="${y0 - 12}" fill="var(--muted)" font-size="11" text-anchor="middle">▲ Declarative (describe end-state)</text>`;
  s += `<text x="${px(0.5)}" y="${y1 + 34}" fill="var(--muted)" font-size="11" text-anchor="middle">▼ Procedural (run ordered steps)</text>`;
  s += `<text x="${x0 - 10}" y="${py(0.5)}" fill="var(--muted)" font-size="11" text-anchor="middle" transform="rotate(-90 ${x0 - 44} ${py(0.5)})" style="transform-box:fill-box">◀ Provisioning infra</text>`;
  s += `<text transform="rotate(-90 ${x1 + 14} ${py(0.5)})" x="${x1 + 14}" y="${py(0.5)}" fill="var(--muted)" font-size="11" text-anchor="middle">Config management ▶</text>`;

  const pts = [
    { n: "Terraform", x: 0.16, y: 0.92, c: "var(--tf)", big: true },
    { n: "Ansible", x: 0.74, y: 0.34, c: "var(--ans)", big: true },
    { n: "CloudFormation", x: 0.1, y: 0.84, c: "#6e7681" },
    { n: "Pulumi", x: 0.26, y: 0.8, c: "#6e7681" },
    { n: "Kubernetes", x: 0.4, y: 0.95, c: "#6e7681" },
    { n: "Packer", x: 0.5, y: 0.5, c: "#6e7681" },
    { n: "Puppet", x: 0.8, y: 0.66, c: "#6e7681" },
    { n: "Chef", x: 0.86, y: 0.4, c: "#6e7681" },
    { n: "cloud-init", x: 0.66, y: 0.16, c: "#6e7681" },
  ];
  for (const p of pts) {
    const cx = px(p.x),
      cy = py(p.y),
      r = p.big ? 9 : 5;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.c}" ${p.big ? 'stroke="#fff" stroke-width="1.5"' : 'opacity="0.85"'}/>`;
    const anchor = p.x > 0.6 ? "end" : "start";
    const dx = p.x > 0.6 ? -(r + 6) : r + 6;
    s += `<text x="${cx + dx}" y="${cy + 4}" fill="${p.big ? p.c : "var(--muted)"}" font-size="${p.big ? 13 : 11}" font-weight="${p.big ? 700 : 400}" text-anchor="${anchor}">${p.n}</text>`;
  }
  svg.innerHTML = s;
})();

/* ───────────── MATRIX ───────────── */
const MATRIX = [
  [
    "Primary job",
    "Provision &amp; tear down infrastructure",
    "Configure machines &amp; deploy apps",
  ],
  ["Paradigm", "Declarative — desired end-state", "Procedural — ordered, idempotent tasks"],
  [
    "State",
    "Tracks a <b>state file</b> (system of record)",
    "Stateless — inspects real state each run",
  ],
  ["Language", "HCL (purpose-built DSL)", "YAML playbooks + Jinja2 templating"],
  [
    "Agent model",
    "Agentless — calls provider <b>APIs</b>",
    "Agentless — <b>SSH</b>/WinRM + Python",
  ],
  [
    "Idempotency",
    "Built-in &amp; automatic",
    "Per-module; <code>shell</code>/<code>command</code> are on you",
  ],
  ["Dependency order", "Auto-computed dependency graph", "Top-to-bottom; you order tasks"],
  [
    "Teardown",
    "<b>First-class</b> — <code>destroy</code> reverses everything",
    "Weak — no record of what to remove",
  ],
  [
    "Drift detection",
    "Strong — <code>plan</code> diffs against real infra",
    "Re-run to re-converge; no diff view",
  ],
  [
    "Infra mutability",
    "Leans <b>immutable</b> (replace)",
    "Leans <b>mutable</b> (change in place)",
  ],
  [
    "Sweet spot",
    "Day-0 cloud build-out, multi-cloud, SaaS",
    "Day-1+ config, app deploy, patching, ad-hoc",
  ],
];
document.querySelector("#matrix-body")!.innerHTML = MATRIX.map(
  (r) =>
    `<tr><th class="dim">${r[0]}</th><td class="tfcell">${r[1]}</td><td class="anscell">${r[2]}</td></tr>`,
).join("");

/* ───────────── PROS / CONS ───────────── */
const li = (cls: string, b: string, rest: string) =>
  `<li class="${cls}"><b>${b}</b> <span>${rest}</span></li>`;
document.querySelector("#tf-pros")!.innerHTML = (
  [
    [
      "Declarative + plan preview",
      "— <code>terraform plan</code> shows exactly what changes before you apply.",
    ],
    ["State = system of record", "knows what it owns, detects drift, tears down cleanly."],
    [
      "Enormous provider ecosystem",
      "one workflow for AWS, Azure, GCP, k8s, and 100s of SaaS APIs.",
    ],
    ["Reproducible environments", "spin up identical staging/ephemeral envs from the same code."],
    ["Auto dependency graph", "figures out create order &amp; parallelism for you."],
  ] satisfies [string, string][]
)
  .map((p) => li("pro", p[0], p[1]))
  .join("");
document.querySelector("#tf-cons")!.innerHTML = (
  [
    [
      "The state file is a liability",
      "locking, drift, secrets-in-state, remote-backend ops overhead.",
    ],
    ["Bad at in-VM configuration", "provisioners are an escape hatch, not a strategy."],
    ["HCL hits a ceiling", "loops/conditionals/dynamic blocks get awkward for real logic."],
    ["Out-of-band changes bite", "someone clicks in the console and your plan fights reality."],
    ["Licensing churn", "HashiCorp’s 2023 BSL move spawned the OpenTofu fork."],
  ] satisfies [string, string][]
)
  .map((p) => li("con", p[0], p[1]))
  .join("");
document.querySelector("#ans-pros")!.innerHTML = (
  [
    ["Agentless &amp; low-friction", "just SSH + Python; nothing to install on targets."],
    [
      "Great procedural orchestration",
      "rolling deploys, ordered multi-host workflows, ad-hoc fixes.",
    ],
    ["Readable YAML, gentle ramp", "ops folks productive fast; huge module/collection library."],
    ["Configures anything reachable", "servers, containers, network gear, on-prem bare metal."],
    ["No state to corrupt", "re-run to converge; nothing to lock or back up."],
  ] satisfies [string, string][]
)
  .map((p) => li("pro", p[0], p[1]))
  .join("");
document.querySelector("#ans-cons")!.innerHTML = (
  [
    ["No system of record", "doesn’t know what it manages; no clean teardown."],
    [
      "Idempotency is your job",
      "raw <code>shell</code>/<code>command</code> tasks can run twice with side effects.",
    ],
    ["Slower at fleet scale", "SSH fan-out; needs forks/pipelining/Mitogen to keep up."],
    ["Weak drift visibility", "no <code>plan</code>-style diff; you run and hope it converges."],
    [
      "Scales into YAML spaghetti",
      "complex logic in Jinja2/YAML fights you without strict role discipline.",
    ],
  ] satisfies [string, string][]
)
  .map((p) => li("con", p[0], p[1]))
  .join("");

/* ───────────── EXCELS / FAILS ───────────── */
const efRow = (good: number, txt: string) =>
  `<div class="row"><div class="ico ${good ? "win" : "lose"}">${good ? "✓" : "✕"}</div><div>${txt}</div></div>`;
document.querySelector("#tf-ef")!.innerHTML = (
  [
    [1, "Standing up cloud infra from scratch &amp; multi-cloud build-outs"],
    [1, "Ephemeral / reproducible environments and clean <code>destroy</code>"],
    [1, "Managing API-driven SaaS objects as code (DNS, repos, monitors)"],
    [0, "Installing packages or templating config <em>inside</em> a running VM"],
    [0, 'Ordered operational workflows ("do A, wait, then B on each host")'],
    [0, "Anything stateful that has no clean API to diff against"],
  ] satisfies [number, string][]
)
  .map((r) => efRow(r[0], r[1]))
  .join("");
document.querySelector("#ans-ef")!.innerHTML = (
  [
    [1, "Configuring OS/app state on machines that already exist"],
    [1, "App deployment, rolling restarts, fleet patching, ad-hoc remediation"],
    [1, "On-prem / bare-metal / network devices with poor or no APIs"],
    [0, "Owning cloud lifecycle &amp; tearing infra back down reliably"],
    [0, "Detecting drift on cloud resources without re-running everything"],
    [0, "Being the authoritative record of what infrastructure exists"],
  ] satisfies [number, string][]
)
  .map((r) => efRow(r[0], r[1]))
  .join("");

/* ───────────── COMBO PIPELINE ───────────── */
(function () {
  const svg = document.querySelector("#combo")!;
  const node = (x: number, w: number, fill: string, stroke: string) => ({
    x,
    y: 54,
    w,
    h: 72,
    fill,
    stroke,
  });
  const A = node(20, 250, "rgba(163,113,247,.12)", "var(--tf)");
  const B = node(330, 200, "#11161d", "var(--border)");
  const C = node(600, 250, "rgba(248,81,73,.12)", "var(--ans)");
  const D = node(890, 170, "rgba(63,185,80,.12)", "var(--both)");
  let s = arrowMarkers();
  type Box = ReturnType<typeof node>;
  const draw = (nd: Box, title: string, sub: string, tc: string) => {
    s += `<rect x="${nd.x}" y="${nd.y}" width="${nd.w}" height="${nd.h}" rx="11" fill="${nd.fill}" stroke="${nd.stroke}" stroke-width="1.6"/>`;
    s += `<text x="${nd.x + nd.w / 2}" y="${nd.y + 30}" text-anchor="middle" fill="${tc}" font-size="15" font-weight="700">${title}</text>`;
    s += `<text x="${nd.x + nd.w / 2}" y="${nd.y + 51}" text-anchor="middle" fill="var(--muted)" font-size="11.5">${sub}</text>`;
  };
  const arrow = (a: Box, b: Box, label: string) => {
    const x1 = a.x + a.w,
      x2 = b.x,
      ym = a.y + a.h / 2;
    s += `<line x1="${x1 + 4}" y1="${ym}" x2="${x2 - 8}" y2="${ym}" stroke="var(--muted)" stroke-width="2" marker-end="url(#ah)"/>`;
    s += `<text x="${(x1 + x2) / 2}" y="${ym - 12}" text-anchor="middle" fill="var(--muted)" font-size="10.5" font-style="italic">${label}</text>`;
  };
  draw(A, "Terraform", "provision: VPC · VMs · DB · DNS", "var(--tf)");
  draw(B, "Infra exists", "IPs · hostnames · inventory", "var(--text)");
  draw(C, "Ansible", "configure · deploy app · restart", "var(--ans)");
  draw(D, "Running system", "served &amp; maintained", "var(--both)");
  arrow(A, B, "outputs");
  arrow(B, C, "inventory");
  arrow(C, D, "converged");
  svg.innerHTML = s;
})();

/* ───────────── THE DELETE TEST ───────────── */
(function () {
  let trimmed = false;
  const tf = [
    ["", 'resource "aws_instance"      "web"  {…}'],
    ["", 'resource "aws_route53_record" "dns" {…}'],
    ["db", 'resource "aws_db_instance"   "main" {…}'],
  ];
  const ans = [
    ["", "- name: web server"],
    ["", "  package:   { name: nginx, state: present }"],
    ["", "- name: dns record"],
    ["", "  route53:   { record: app.example.com }"],
    ["db", "- name: database"],
    ["db", "  rds_instance: { id: app-db, state: present }"],
  ];
  const code = (lines: string[][]) =>
    lines
      .map((l) => {
        const db = l[0] === "db";
        if (db && trimmed) return `<span class="removed">${l[1]}</span>`;
        return `<span class="ln${db ? " dbln" : ""}">${l[1]}</span>`;
      })
      .join("\n");
  function render() {
    document.querySelector("#tf-code")!.innerHTML = code(tf);
    document.querySelector("#ans-code")!.innerHTML = code(ans);
    document.querySelector("#dtoggle")!.textContent = trimmed
      ? "↺ Restore the database line"
      : "✂ Remove the database line";
    document.querySelector("#tf-out")!.innerHTML = trimmed
      ? `<div class="cmd">$ terraform apply</div><div class="warnline">- aws_db_instance.main will be destroyed</div><div class="plan">Plan: 0 add · 0 change · <b class="bad">1 destroy</b></div><div class="say bad">→ The real database is deleted.</div>`
      : `<div class="cmd">$ terraform apply</div><div class="plan">Plan: 0 add · 0 change · 0 destroy</div><div class="say ok">→ state ledger tracks web · dns · main ✓</div>`;
    document.querySelector("#ans-out")!.innerHTML = trimmed
      ? `<div class="cmd">$ ansible-playbook site.yml</div><div class="plan">ok=2 &nbsp; changed=0 &nbsp; <span style="color:var(--muted)">(no db task to run)</span></div><div class="say warn">→ The database created last run is still up — orphaned, untracked, forever.</div>`
      : `<div class="cmd">$ ansible-playbook site.yml</div><div class="plan">ok=3 &nbsp; changed=3</div><div class="say ok">→ web · dns · db all converged ✓</div>`;
    document.querySelector("#dpunch")!.innerHTML = trimmed
      ? `<b>Same edit, opposite outcome.</b> Terraform <b class="tf">remembered it owned that database</b> (its state file maps <code>aws_db_instance.main</code> → a real instance ID) so dropping the line means <em>destroy</em>. Ansible has <b class="ans">no memory</b> it ever ran that task — un-declaring it simply does nothing. That ledger is the headwater of <em>every</em> other difference: drift detection, clean teardown, and closed-world authority ("this config is the complete truth; reap anything extra") vs. additive assertions ("make these things true; stay silent about all else"). It's also why deleting a line in Terraform is scary and deleting one in Ansible is harmless.`
      : `Right now they look identical: three things declared, three things running. The gap only appears on the <b>second run</b> — press the button and remove the database.`;
  }
  document.querySelector("#dtoggle")!.addEventListener("click", () => {
    trimmed = !trimmed;
    render();
  });
  render();
})();

/* ───────────── TWO PLANES ───────────── */
(function () {
  const svg = document.querySelector("#planes")!;
  let s = arrowMarkers();
  s += `<defs><marker id="ah-tf" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--tf)"/></marker></defs>`;
  // lanes
  s += `<rect x="150" y="20" width="900" height="104" rx="10" fill="rgba(163,113,247,.06)" stroke="var(--tf-dim)"/>`;
  s += `<rect x="150" y="190" width="900" height="104" rx="10" fill="rgba(248,81,73,.06)" stroke="var(--ans-dim)"/>`;
  s += `<text x="166" y="40" fill="var(--muted)" font-size="11" font-family="ui-monospace,monospace">CONTROL PLANE · cloud provider management API</text>`;
  s += `<text x="166" y="210" fill="var(--muted)" font-size="11" font-family="ui-monospace,monospace">OS / DATA PLANE · SSH into the booted machine</text>`;
  const actor = (x: number, y: number, t: string, c: string) => {
    s += `<rect x="${x}" y="${y}" width="118" height="46" rx="9" fill="var(--panel-2)" stroke="${c}" stroke-width="1.6"/><text x="${x + 59}" y="${y + 28}" text-anchor="middle" fill="${c}" font-size="13" font-weight="700">${t}</text>`;
  };
  actor(14, 50, "Terraform", "var(--tf)");
  actor(14, 220, "Ansible", "var(--ans)");
  const obj = (x: number, y: number, w: number, t: string) => {
    s += `<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="var(--panel)" stroke="var(--border)"/><text x="${x + w / 2}" y="${y + 28}" text-anchor="middle" fill="var(--text)" font-size="12">${t}</text>`;
  };
  obj(210, 50, 120, "VPC / net");
  obj(470, 50, 120, "VM");
  obj(770, 50, 150, "Managed DB");
  obj(415, 220, 110, "nginx");
  obj(560, 220, 150, "app + config");
  // actor → lane arrows
  s += `<line x1="132" y1="73" x2="206" y2="73" stroke="var(--tf)" stroke-width="2" marker-end="url(#ah-tf)"/>`;
  s += `<line x1="132" y1="243" x2="411" y2="243" stroke="var(--ans)" stroke-width="2" marker-end="url(#ah-danger)"/>`;
  // VM bridges down to the OS plane
  s += `<line x1="530" y1="96" x2="530" y2="190" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  s += `<text x="540" y="148" fill="var(--muted)" font-size="10.5" font-style="italic">same box, once booted</text>`;
  // the gap caption
  s += `<text x="600" y="170" text-anchor="middle" fill="var(--warn)" font-size="11.5">▲ the API can't reach inside the OS &nbsp;·&nbsp; ▼ SSH can't conjure the box</text>`;
  svg.innerHTML = s;
})();

/* ───────────── THE MIRROR IMAGE (inverse delete test) ───────────── */
(function () {
  const COLS = 42,
    ROWS = 11,
    declared = new Set([4 * COLS + 11, 6 * COLS + 24, 8 * COLS + 33]);
  let mode: string | undefined = "ans";
  const svg = document.querySelector("#invgrid")!;
  function render() {
    const x0 = 22,
      y0 = 20,
      dx = (1000 - 44) / (COLS - 1),
      dy = (232 - 52) / (ROWS - 1);
    let s = "";
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c,
          cx = (x0 + c * dx).toFixed(1),
          cy = (y0 + r * dy).toFixed(1);
        if (declared.has(i))
          s += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="var(--good)" stroke="#fff" stroke-width="1.2"/>`;
        else
          s += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${mode === "tf" ? "var(--danger)" : "#2b3138"}" ${mode === "tf" ? 'opacity="0.85"' : ""}/>`;
      }
    svg.innerHTML = s;
    document.querySelectorAll<HTMLButtonElement>("#invseg button").forEach((b) => {
      b.classList.toggle("on", b.dataset["v"] === mode);
    });
    document.querySelector<HTMLElement>("#gi-rest")!.style.background =
      mode === "tf" ? "var(--danger)" : "#2b3138";
    document.querySelector("#gi-rest-label")!.textContent =
      mode === "tf" ? "marked for destruction (~thousands)" : "everything else — untouched";
    document.querySelector("#invpunch")!.innerHTML =
      mode === "tf"
        ? `<b style="color:var(--danger)">💥 Terraform's plan: keep 3, destroy everything else it "manages."</b> Closed-world authority means <em>anything it owns but you didn't declare gets reaped</em> — every package, file, user, and cron job you never enumerated. The very property that <b class="tf">correctly destroyed your database</b> two sections up would now strip the machine bare. To use it safely here you'd have to declare all ~10,000 things exhaustively, forever — or watch each <code>plan</code> propose deleting the ones you forgot.`
        : `<b style="color:var(--good)">✓ Ansible's run: configure 3, leave the rest untouched.</b> Open-world / additive — it asserts <em>only</em> what you wrote and stays silent about everything else. That's exactly what you want inside a real OS, where you can neither enumerate nor want to own every file. The "weakness" from the delete test — no teardown, no memory — is the <em>same</em> property that makes Ansible <b>safe to point at a server you didn't build</b>. Strength and weakness are the same trait seen from two jobs.`;
  }
  document.querySelectorAll<HTMLButtonElement>("#invseg button").forEach((b) => {
    b.addEventListener("click", () => {
      mode = b.dataset["v"];
      render();
    });
  });
  render();
})();

/* ───────────── DECISION WIZARD ───────────── */
const TREE: Record<string, { q: string; yes: string; no: string }> = {
  q1: {
    q: "Is the task to <b>create or destroy</b> infrastructure resources — VMs, networks, managed databases, DNS, IAM, or SaaS objects?",
    yes: "q2",
    no: "q3",
  },
  q2: {
    q: "On those resources, do you <b>also</b> need to configure software inside them, deploy an app, or run ordered operational steps?",
    yes: "BOTH",
    no: "TF",
  },
  q3: {
    q: "Is the task to <b>configure, deploy to, or patch</b> machines that <b>already exist</b>?",
    yes: "ANS",
    no: "q4",
  },
  q4: {
    q: "Is it about managing <b>API-driven resource state</b> (a SaaS/cloud object) with reliable teardown &amp; drift detection?",
    yes: "TF",
    no: "OTHER",
  },
};
const RESULT: Record<string, { badge: string; cls: string; text: string }> = {
  TF: {
    badge: "Terraform",
    cls: "tf",
    text: "Declarative provisioning with a state file is exactly its lane — describe the end-state and let it diff, create, and tear down.",
  },
  ANS: {
    badge: "Ansible",
    cls: "ans",
    text: "Configuring &amp; deploying onto existing machines, idempotently and over SSH, is its home turf — no state file needed.",
  },
  BOTH: {
    badge: "Both",
    cls: "both",
    text: "The canonical combo: Terraform provisions the infra, then hands hostnames to Ansible to configure and deploy. Don’t force one tool across the line.",
  },
  OTHER: {
    badge: "Probably neither",
    cls: "",
    text: "Sounds like image baking, first-boot, or container orchestration. Look at Packer, cloud-init, or Kubernetes before bending Terraform or Ansible to fit.",
  },
};
// which decision nodes each result path can flow through (for flowchart highlight)
type WizState = { node: string; trail: { node: string; ans: "yes" | "no" }[] };
let wizState: WizState = loadHash<{ wiz: WizState }>().wiz ?? { node: "q1", trail: [] };

function renderWiz() {
  const el = document.querySelector("#wiz")!;
  const st = wizState;
  if (RESULT[st.node]) {
    const r = RESULT[st.node]!;
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
        <button class="opt" data-a="yes">Yes</button>
        <button class="opt" data-a="no">No</button>
      </div>
      <div class="controls"><button id="back" ${st.trail.length > 0 ? "" : 'style="visibility:hidden"'}>‹ Back</button><button id="restart">Start over</button></div>
      <div class="breadcrumbs">${crumbs()}</div>`;
    el.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) => {
      b.addEventListener("click", () => {
        const ans = b.dataset["a"];
        if (ans !== "yes" && ans !== "no") return;
        st.trail.push({ node: st.node, ans });
        st.node = TREE[st.node]![ans];
        persist();
      });
    });
  }
  const back = el.querySelector<HTMLButtonElement>("#back");
  if (back)
    back.addEventListener("click", () => {
      if (st.trail.length > 0) {
        st.node = st.trail.pop()!.node;
        persist();
      }
    });
  el.querySelector<HTMLButtonElement>("#restart")!.addEventListener("click", () => {
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
      .map(
        (t) =>
          `<span class="${t.ans === "yes" ? "y" : "n"}">${t.node.toUpperCase()}:${t.ans === "yes" ? "Y" : "N"}</span>`,
      )
      .join(" → ")
  );
}
function persist() {
  saveHash({ wiz: wizState });
  renderWiz();
}

/* ───────────── MERMAID FLOWCHART (with live path highlight) ───────────── */
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
    fontSize: "13px",
    fontFamily: "ui-monospace, monospace",
  },
});

function flowSource() {
  // active node set from wizard trail + current node
  const active = new Set(wizState.trail.map((t) => t.node));
  if (TREE[wizState.node] || RESULT[wizState.node]) active.add(wizState.node);
  const isA = (id: string) => (active.has(id) ? `:::active` : ``);
  return `flowchart TD
  START([What are you trying to do?]) --> q1
  q1{{Create or destroy<br/>infra resources?<br/><i>VMs · networks · DBs · DNS · SaaS</i>}}${isA("q1")}
  q1 -->|Yes| q2
  q1 -->|No| q3
  q2{{Also configure inside them<br/>or run ordered<br/>deploy steps?}}${isA("q2")}
  q2 -->|Yes| BOTH
  q2 -->|No| TF
  q3{{Configure / deploy / patch<br/>machines that<br/>already exist?}}${isA("q3")}
  q3 -->|Yes| ANS
  q3 -->|No| q4
  q4{{Manage API-driven SaaS<br/>state with clean<br/>teardown &amp; drift?}}${isA("q4")}
  q4 -->|Yes| TF
  q4 -->|No| OTHER
  TF[Terraform]${isA("TF")}
  ANS[Ansible]${isA("ANS")}
  BOTH[/Use BOTH:<br/>Terraform provisions<br/>Ansible configures/]${isA("BOTH")}
  OTHER[Neither — try Packer,<br/>cloud-init or Kubernetes]${isA("OTHER")}
  classDef active fill:#1f6f3d,stroke:#3fb950,stroke-width:2px,color:#fff;
  style TF fill:#3a2a5c,stroke:#a371f7,color:#fff
  style ANS fill:#5a2420,stroke:#f85149,color:#fff
  style BOTH fill:#173d24,stroke:#3fb950,color:#fff`;
}
let flowN = 0;
async function renderFlow() {
  const host = document.querySelector("#flow")!;
  const { svg } = await mermaid.render("flowsvg" + flowN++, flowSource());
  host.innerHTML = svg;
}

renderWiz();
