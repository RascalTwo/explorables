import { arrowMarkers, labelBox, saveHash, loadHash, $, esc } from "@viz/kit";

// ---- content -------------------------------------------------------------
type Tone = "good" | "accent" | "warn" | "danger";
interface Link {
  href: string;
  label: string;
}
interface Callout {
  tone: Tone;
  title: string;
  body: string;
  link?: Link;
}
interface Branch {
  id: string;
  ic: string;
  short: string;
  persona: string;
  tone: Tone;
  badge: string;
  how: string;
  granted: string;
  tag?: string;
  tf: string | null;
  handoff?: Link;
  callout?: Callout;
}

const TONE: Record<Tone, string> = {
  good: "var(--good)",
  accent: "var(--accent)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};
const JOURNEY = "../terraform-change-journey/";
const stepLink = (n: number) => JOURNEY + "#%7B%22step%22%3A" + n + "%7D"; // {"step":n}

const BRANCHES: Branch[] = [
  {
    id: "explore",
    ic: "🔍",
    short: "Explore Dev to learn the system",
    persona: "Developers & engineers",
    tone: "good",
    badge: "Read-only · Dev only",
    how: "You can be given a low, <b>read-only</b> role in a <b>lower environment (dev)</b> to click around and understand how things are wired. That access is never handed out in the console — the <b>user and the role are both declared in Terraform</b>, peer-reviewed, and applied by CI. Scoped to dev, read-only.",
    granted:
      "IaC — a pingone_user plus a read-only role assignment, scoped to the dev environment.",
    tag: "pattern",
    tf: `# The user is declared in code too — never created by hand in the console.
resource "pingone_user" "jane_dev" {
  environment_id = pingone_environment.dev.id
  username       = "jane.dev"
  email          = "jane.dev@bank.example"
  population_id  = pingone_population.engineers.id
}

# …then a read-only role, scoped to dev only.
resource "pingone_user_role_assignment" "jane_dev_readonly" {
  user_id              = pingone_user.jane_dev.id
  role_id              = data.pingone_role.identity_data_read_only.id  # read-only
  scope_environment_id = pingone_environment.dev.id                    # DEV only
}`,
  },
  {
    id: "change",
    ic: "🛠️",
    short: "Change PingOne configuration",
    persona: "Engineers making a real change",
    tone: "accent",
    badge: "No console write — code only",
    how: "Nobody edits PingOne in the admin console. You change a file in Terraform, open a merge request, it's reviewed, and <b>CI — which holds the credentials — applies it after merge</b>. Humans hold Git + review rights; the pipeline holds the keys. A custom role even strips <code style='font-family:var(--mono)'>admin_terraform_state</code>, so engineers can't read or apply state — <b>only CI can</b>. There's no access to grant here and no Terraform to write for <i>you</i> — the change <i>is</i> the Terraform.",
    granted:
      "Not a Ping grant at all — Git write + PR approval. The pipeline is the only thing with management credentials.",
    tf: null,
    handoff: { href: stepLink(1), label: "See “The journey of a change” — edit → MR → CI applies" },
    callout: {
      tone: "accent",
      title: "What about prod? What about CAB?",
      body: "Same path — there's no special console access for production either. The prod apply waits behind a <b>manual gate</b> with a named allowlist and <b>CAB approval</b>. That's not a separate story; it's the rest of this one.",
      link: { href: stepLink(8), label: "See the prod gate & CAB approval →" },
    },
  },
  {
    id: "logs",
    ic: "📊",
    short: "Read audit / sign-on / event logs",
    persona: "Security · InfoSec · Cyber · Audit",
    tone: "warn",
    badge: "Read it in the SIEM, not the console",
    how: "<b>Don't read events in PingOne.</b> All admin, sign-on, and audit events are <b>streamed out to LogRhythm</b> (via Cribl) alongside GitLab audit events — that's where you consume them. If a console seat is genuinely needed for something the stream can't cover, even that is just a user + a read-only role assignment, declared in IaC like everything else.",
    granted: "Events stream to LogRhythm. If a login is truly needed, a read-only role via IaC.",
    tag: "pattern",
    tf: `# If a console seat is truly needed, it's declared like anything else:
resource "pingone_user" "sam_auditor" {
  environment_id = pingone_environment.dev.id
  username       = "sam.auditor"
  email          = "sam.auditor@bank.example"
  population_id  = pingone_population.security.id
}

resource "pingone_user_role_assignment" "sam_auditor_readonly" {
  user_id              = pingone_user.sam_auditor.id
  role_id              = data.pingone_role.identity_data_read_only.id  # read-only
  scope_environment_id = pingone_environment.dev.id
}

# But really: events are streamed to LogRhythm (via Cribl).
# Consume them in the SIEM — that's what it's for.`,
  },
  {
    id: "breakglass",
    ic: "🚨",
    short: "Emergency — something is on fire",
    persona: "The one true exception",
    tone: "danger",
    badge: "Break-glass · org admin",
    how: "There is exactly <b>one</b> human-owned, high-privilege account: the Organization admin. <b>No Terraform.</b> It lives in <b>CyberArk</b> as a break-glass credential — in a genuine emergency you check out the organization admin account, do what's needed, and every use is logged. It's the deliberate exception that proves the rule: <b>everything else is code.</b>",
    granted:
      "Human-owned org-admin account, vaulted in CyberArk, emergency checkout only — never in Terraform.",
    tf: null,
    callout: {
      tone: "danger",
      title: "🔐 In CyberArk — not Terraform",
      body: "Check out the <b>Organization admin</b> account → do what's needed → every action is logged &amp; alerted. The only human-owned credential, used only when something is on fire.",
    },
  },
];

// ---- decision tree (SVG, horizontal) -------------------------------------
const root = { x: 350, y: 16, w: 300, h: 72 };
const rb = { x: root.x + root.w / 2, y: root.y + root.h }; // root bottom-center
const BX = [17, 263, 509, 755];
const nodes = BRANCHES.map((b, i) => ({ ...b, x: BX[i]!, y: 168, w: 228, h: 96 }));

type Node = (typeof nodes)[number];

function nodeLabel(n: Node) {
  return labelBox(
    { x: n.x, y: n.y, w: n.w, h: n.h },
    `<div class="nlabel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;
            height:${n.h}px;text-align:center;gap:5px;padding:0 12px">
       <span class="ic">${n.ic}</span>
       <span class="tt">${esc(n.short)}</span>
       <span class="pp">${esc(n.persona)}</span>
     </div>`,
  );
}

function renderTree(sel: string) {
  const edges = nodes
    .map((n) => {
      const c = TONE[n.tone],
        bx = n.x + n.w / 2;
      return `<path d="M ${rb.x} ${rb.y} C ${rb.x} 128 ${bx} 128 ${bx} ${n.y}" fill="none"
              stroke="${c}" stroke-width="1.8" opacity="${n.id === sel ? 0.95 : 0.4}"
              marker-end="url(#ah-${n.tone})"/>`;
    })
    .join("");

  const rootG = `<g class="root node">
       <rect x="${root.x}" y="${root.y}" width="${root.w}" height="${root.h}" rx="10"
             fill="var(--panel-2)" stroke="var(--border)"/>
       ${labelBox(
         { x: root.x, y: root.y, w: root.w, h: root.h },
         `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:${root.h}px">
            <div style="font-size:12.5px;color:var(--muted)">I want to access PingOne</div>
            <div style="font-weight:700;font-size:18px;margin-top:3px">…in order to:</div>
          </div>`,
       )}
     </g>`;

  const branchG = nodes
    .map((n) => {
      const c = TONE[n.tone],
        seld = n.id === sel;
      return `<g class="node ${seld ? "sel" : ""}" data-id="${n.id}">
       <rect class="box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11"
             fill="var(--panel)" stroke="${c}" stroke-opacity="${seld ? 1 : 0.45}"/>
       <path d="M ${n.x + 14} ${n.y} h ${n.w - 28}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
       ${nodeLabel(n)}
     </g>`;
    })
    .join("");

  $("#tree")!.innerHTML = `<defs>${arrowMarkers()}</defs>${edges}${rootG}${branchG}`;
  $("#tree")!
    .querySelectorAll<SVGGElement>(".node[data-id]")
    .forEach((g) => g.addEventListener("click", () => select(g.dataset["id"]!)));
}

// ---- detail panel --------------------------------------------------------
function tfHighlight(src: string) {
  return src
    .split("\n")
    .map((line) => {
      if (/^\s*#/u.test(line)) return `<span class="c">${esc(line)}</span>`;
      let h = esc(line);
      h = h.replace(/(#.*)$/u, '<span class="c">$1</span>'); // trailing comment
      h = h.replaceAll(/(&quot;[^&]*?&quot;)/gu, '<span class="s">$1</span>'); // strings
      h = h.replaceAll(/\b(resource|data|variable|module)\b/gu, '<span class="k">$1</span>');
      return h;
    })
    .join("\n");
}

function calloutHTML(c: Callout) {
  return `<div class="callout ${c.tone}">
     <h4>${c.title}</h4>
     <p>${c.body}</p>
     ${c.link ? `<a class="clink" href="${c.link.href}">${esc(c.link.label)}</a>` : ""}
   </div>`;
}

function renderDetail(b: Branch) {
  const tf = b.tf
    ? `<div class="tfwrap">
         <div class="tfbar"><span class="ttl">terraform</span><span class="tag ${b.tag}">${b.tag}</span></div>
         <pre class="tf">${tfHighlight(b.tf)}</pre>
       </div>`
    : "";
  const handoff = b.handoff
    ? `<a class="handoff" href="${b.handoff.href}"><span>${esc(b.handoff.label)}</span><span class="arr">→</span></a>`
    : "";
  const callout = b.callout ? calloutHTML(b.callout) : "";
  const side = tf + handoff + callout;

  $("#detail")!.innerHTML = `<div class="dhead">
       <h2>${b.ic} ${esc(b.short)}</h2>
       <span class="badge ${b.tone}">${esc(b.badge)}</span>
       <span class="eyebrow">${esc(b.persona)}</span>
     </div>
     <div class="dwrap ${side ? "" : "single"}">
       <div class="dtext">
         <p class="how">${b.how}</p>
         <div class="granted"><b>How it's granted:</b> ${esc(b.granted)}</div>
       </div>
       ${side ? `<div class="dside">${side}</div>` : ""}
     </div>`;
}

// ---- state ---------------------------------------------------------------
function select(id: string) {
  const b = BRANCHES.find((x) => x.id === id) ?? BRANCHES[0]!;
  saveHash({ sel: b.id });
  renderTree(b.id);
  renderDetail(b);
}

select(loadHash<{ sel?: string }>().sel ?? "explore");
