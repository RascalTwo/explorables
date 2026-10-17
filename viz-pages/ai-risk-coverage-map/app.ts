import { $ } from "@viz/kit";

/* ---------------- data ---------------- */
type FwId = "n100" | "owasp" | "n600";
type Fam = "sec" | "truth" | "content" | "ops";
type BucketId = "guardrails" | "arch" | "supply" | "data" | "gateway" | "gov";
type Cov = "full" | "partial";
interface Placed {
  want: number;
  cy: number;
  y: number;
  h: number;
}
interface Framework extends Placed {
  id: FwId;
  label: string;
  sub: string;
  tag: string;
}
interface Risk {
  id: number;
  fam: Fam;
  name: string;
  src: FwId[];
  y: number;
  h: number;
  cy: number;
}
interface Bucket extends Placed {
  id: BucketId;
  label: string;
  sub: string;
  beacon?: boolean;
}

const FRAMEWORKS: Framework[] = [
  {
    id: "n100",
    label: "NIST AI 100-2",
    sub: "4 adversarial attack classes",
    tag: "n100",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "owasp",
    label: "OWASP LLM Top 10",
    sub: "10 app-risk items",
    tag: "O",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "n600",
    label: "NIST AI 600-1",
    sub: "12 GenAI harm categories",
    tag: "n600",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
];

const FAMS: Record<Fam, { label: string }> = {
  sec: { label: "Security & adversarial" },
  truth: { label: "Truth & quality" },
  content: { label: "Content & societal harms" },
  ops: { label: "Operational & sustainability" },
};

const RISKS: Risk[] = [
  {
    id: 1,
    fam: "sec",
    name: "Prompt injection & adversarial inputs",
    src: ["owasp", "n600", "n100"],
    y: 0,
    h: 0,
    cy: 0,
  },
  {
    id: 2,
    fam: "sec",
    name: "Data & model poisoning",
    src: ["owasp", "n600", "n100"],
    y: 0,
    h: 0,
    cy: 0,
  },
  {
    id: 3,
    fam: "sec",
    name: "Sensitive info disclosure & privacy",
    src: ["owasp", "n600", "n100"],
    y: 0,
    h: 0,
    cy: 0,
  },
  {
    id: 4,
    fam: "sec",
    name: "Supply chain & component integrity",
    src: ["owasp", "n600"],
    y: 0,
    h: 0,
    cy: 0,
  },
  { id: 5, fam: "sec", name: "Improper output handling", src: ["owasp"], y: 0, h: 0, cy: 0 },
  { id: 6, fam: "sec", name: "Excessive agency", src: ["owasp"], y: 0, h: 0, cy: 0 },
  {
    id: 7,
    fam: "sec",
    name: "Vector & embedding (RAG) weaknesses",
    src: ["owasp"],
    y: 0,
    h: 0,
    cy: 0,
  },
  {
    id: 8,
    fam: "truth",
    name: "Misinformation & confabulation",
    src: ["owasp", "n600"],
    y: 0,
    h: 0,
    cy: 0,
  },
  { id: 9, fam: "truth", name: "Information integrity", src: ["n600"], y: 0, h: 0, cy: 0 },
  {
    id: 10,
    fam: "content",
    name: "Harmful / toxic content generation",
    src: ["n600"],
    y: 0,
    h: 0,
    cy: 0,
  },
  {
    id: 11,
    fam: "content",
    name: "Harmful bias & homogenization",
    src: ["n600"],
    y: 0,
    h: 0,
    cy: 0,
  },
  { id: 12, fam: "content", name: "Human–AI configuration", src: ["n600"], y: 0, h: 0, cy: 0 },
  { id: 13, fam: "content", name: "Intellectual property", src: ["n600"], y: 0, h: 0, cy: 0 },
  { id: 14, fam: "ops", name: "Unbounded consumption", src: ["owasp"], y: 0, h: 0, cy: 0 },
  { id: 15, fam: "ops", name: "Environmental impact", src: ["n600"], y: 0, h: 0, cy: 0 },
];

const BUCKETS: Bucket[] = [
  {
    id: "guardrails",
    label: "🛡️ Guardrails",
    sub: "runtime input/output enforcement",
    beacon: true,
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "arch",
    label: "🏗️ Architecture & access",
    sub: "least privilege · isolation · HITL",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "supply",
    label: "🔗 Supply chain & provenance",
    sub: "vetting · SBOM · signing · CVE",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "data",
    label: "🔐 Data governance & privacy",
    sub: "minimization · DLP · lineage",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "gateway",
    label: "📊 AI gateway & ops",
    sub: "rate · cost · quotas (LiteLLM)",
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
  {
    id: "gov",
    label: "🏛️ Governance & human factors",
    sub: 'the "responsible AI" program',
    want: 0,
    cy: 0,
    y: 0,
    h: 0,
  },
];

// risk -> bucket coverage. s: 'full' (✅ primary) | 'partial' (◐ supporting)
const COVER = (
  [
    [1, "guardrails", "full"],
    [1, "arch", "full"],
    [2, "supply", "full"],
    [2, "data", "partial"],
    [3, "guardrails", "full"],
    [3, "data", "full"],
    [4, "supply", "full"],
    [5, "arch", "full"],
    [5, "guardrails", "partial"],
    [6, "arch", "full"],
    [7, "arch", "full"],
    [8, "guardrails", "partial"],
    [9, "gov", "full"],
    [9, "guardrails", "partial"],
    [10, "guardrails", "full"],
    [11, "data", "partial"],
    [12, "gov", "full"],
    [13, "gov", "full"],
    [13, "guardrails", "partial"],
    [14, "gateway", "full"],
    [15, "gateway", "full"],
  ] satisfies [number, BucketId, Cov][]
).map(([r, b, s]) => ({ r, b, s }));

const GAP_RISKS = RISKS.filter((r) => !COVER.some((c) => c.r === r.id && c.s === "full")).map(
  (r) => r.id,
);

/* colors */
const css = getComputedStyle(document.documentElement);
const V = (n: string) => css.getPropertyValue(n).trim();
const FW_COLOR: Record<FwId, string> = { owasp: "#e3b341", n600: "#39c5bb", n100: "#bc8cff" };
const BK_COLOR: Record<BucketId, string> = {
  guardrails: V("--accent"),
  arch: V("--good"),
  supply: "#e3b341",
  data: "#39c5bb",
  gateway: "#bc8cff",
  gov: V("--danger"),
};

/* ---------------- geometry ---------------- */
const W = 1560;
const COLX = { fw: 40, fwW: 226, rk: 606, rkW: 346, bk: 1224, bkW: 296 };
const TOP = 150,
  riskH = 50,
  gap = 11,
  famGap = 22;

// lay out risks top->bottom with family gaps
let y = TOP,
  prevFam: Fam | null = null;
for (const r of RISKS) {
  if (prevFam && r.fam !== prevFam) y += famGap;
  r.y = y;
  r.h = riskH;
  r.cy = y + riskH / 2;
  y += riskH + gap;
  prevFam = r.fam;
}
const riskBottom = y - gap;

// place a column of nodes near desired centers, clamped to avoid overlap
function layoutCol(items: Placed[], nodeH: number, minY: number, maxY: number) {
  items.sort((a, b) => a.want - b.want);
  const minGap = nodeH + 16;
  for (let i = 0; i < items.length; i++) {
    items[i]!.cy = items[i]!.want;
    if (i > 0) items[i]!.cy = Math.max(items[i]!.cy, items[i - 1]!.cy + minGap);
  }
  // shift up if overflowing bottom
  const over = items.at(-1)!.cy - (maxY - nodeH / 2);
  if (over > 0) for (const it of items) it.cy -= over;
  for (const it of items) {
    it.cy = Math.max(it.cy, minY + nodeH / 2);
    it.y = it.cy - nodeH / 2;
    it.h = nodeH;
  }
}

const centroid = (ids: number[]) =>
  ids.reduce((s, id) => s + RISKS.find((r) => r.id === id)!.cy, 0) / ids.length;

const fwH = 76;
FRAMEWORKS.forEach((f) => {
  f.want = centroid(RISKS.filter((r) => r.src.includes(f.id)).map((r) => r.id));
});
layoutCol(FRAMEWORKS, fwH, TOP, riskBottom);

const bkH = 72;
BUCKETS.forEach((b) => {
  const ids = COVER.filter((c) => c.b === b.id).map((c) => c.r);
  b.want = ids.length > 0 ? centroid(ids) : (TOP + riskBottom) / 2;
});
layoutCol(BUCKETS, bkH, TOP, riskBottom);

const evalY = riskBottom + 40,
  evalH = 60;
const H = evalY + evalH + 30;

/* ---------------- render ---------------- */
const svg = $<SVGSVGElement>("#map")!;
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.max(60, (x2 - x1) * 0.42);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};

let s = "";

// column headers
s += `<text class="colhead" x="${COLX.fw}" y="${TOP - 36}">Industry frameworks</text>`;
s += `<text class="colhead" x="${COLX.rk}" y="${TOP - 36}">15 consolidated risks</text>`;
s += `<text class="colhead" x="${COLX.bk}" y="${TOP - 36}">Mitigation buckets</text>`;

// family side-labels (rotated, left of risk column)
const famSeen = new Map<Fam, Risk>();
for (const r of RISKS) if (!famSeen.has(r.fam)) famSeen.set(r.fam, r);
for (const fam of famSeen.keys()) {
  const members = RISKS.filter((r) => r.fam === fam);
  const midY = (members[0]!.y + members.at(-1)!.y + members.at(-1)!.h) / 2;
  s += `<text class="famband" transform="translate(${COLX.rk - 12},${midY}) rotate(-90)" text-anchor="middle">${FAMS[fam].label}</text>`;
}

// --- edges: framework -> risk (provenance) ---
let edges = "";
for (const r of RISKS) {
  for (const fid of r.src) {
    const f = FRAMEWORKS.find((x) => x.id === fid)!;
    edges += `<path class="edge src f-${fid} r-${r.id}" data-f="${fid}" data-r="${r.id}"
      d="${bezier(COLX.fw + COLX.fwW, f.cy, COLX.rk, r.cy)}" stroke="${FW_COLOR[fid]}"/>`;
  }
}
// --- edges: risk -> bucket (coverage) ---
for (const c of COVER) {
  const r = RISKS.find((x) => x.id === c.r)!;
  const b = BUCKETS.find((x) => x.id === c.b)!;
  const cls = `edge cover b-${c.b} r-${c.r} ${c.s === "partial" ? "partial" : ""} ${c.b === "guardrails" ? "gr" : ""}`;
  edges += `<path class="${cls}" data-b="${c.b}" data-r="${c.r}" data-s="${c.s}"
    d="${bezier(COLX.rk + COLX.rkW, r.cy, COLX.bk, b.cy)}" stroke="${BK_COLOR[c.b]}"/>`;
}
s += `<g id="edges">${edges}</g>`;

// helper to emit a node group with a foreignObject body
function nodeGroup({
  cls,
  x,
  w,
  node,
  color,
  html,
  accent,
}: {
  cls: string;
  x: number;
  w: number;
  node: Placed & { id: string | number };
  color: string;
  html: string;
  accent?: boolean | undefined;
}) {
  return `<g class="node ${cls}" data-id="${node.id}">
    <rect class="box" x="${x}" y="${node.y}" width="${w}" height="${node.h}" rx="11"
      fill="var(--panel)" stroke="${color}" stroke-width="${accent ? 2.4 : 1.4}"/>
    <foreignObject x="${x}" y="${node.y}" width="${w}" height="${node.h}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="nbody">${html}</div>
    </foreignObject>
  </g>`;
}

// framework nodes
let nodes = "";
for (const f of FRAMEWORKS) {
  nodes += nodeGroup({
    cls: "fw",
    x: COLX.fw,
    w: COLX.fwW,
    node: f,
    color: FW_COLOR[f.id],
    html: `<b style="color:${FW_COLOR[f.id]}">${f.label}</b><div class="s">${f.sub}</div>`,
  });
}

// risk nodes
const tagLabel: Record<FwId, string> = { owasp: "O", n600: "600", n100: "100" };
for (const r of RISKS) {
  const isGap = GAP_RISKS.includes(r.id);
  const tags = r.src
    .map((sid) => `<span class="pt ${sid === "owasp" ? "O" : sid}">${tagLabel[sid]}</span>`)
    .join("");
  const famColor = { sec: V("--danger"), truth: V("--accent"), content: "#bc8cff", ops: "#39c5bb" }[
    r.fam
  ];
  const html =
    `<div class="num" style="background:${famColor}">${r.id}</div>` +
    `<b>${r.name}</b><div class="provtags">${tags}</div>` +
    (isGap ? `<div class="gapbadge">no primary</div>` : "");
  nodes += `<g class="node rk" data-id="${r.id}">
    <rect class="box" x="${COLX.rk}" y="${r.y}" width="${COLX.rkW}" height="${r.h}" rx="10"
      fill="var(--panel)" stroke="${isGap ? V("--warn") : "var(--border)"}" stroke-width="${isGap ? 1.8 : 1.2}"
      ${isGap ? 'stroke-dasharray="6 4"' : ""}/>
    <foreignObject x="${COLX.rk}" y="${r.y}" width="${COLX.rkW}" height="${r.h}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="nbody" style="position:relative">${html}</div>
    </foreignObject>
  </g>`;
}

// bucket nodes
for (const b of BUCKETS) {
  const nFull = COVER.filter((c) => c.b === b.id && c.s === "full").length;
  const nPart = COVER.filter((c) => c.b === b.id && c.s === "partial").length;
  const cnt = `<span class="cnt">${nFull} primary${nPart ? ` · ${nPart} supporting` : ""}</span>`;
  nodes += nodeGroup({
    cls: "bk" + (b.beacon ? " beacon" : ""),
    x: COLX.bk,
    w: COLX.bkW,
    node: b,
    color: BK_COLOR[b.id],
    accent: b.beacon,
    html: `<b style="color:${BK_COLOR[b.id]}">${b.label}</b><div class="s">${b.sub}</div>${cnt}`,
  });
}

// beacon glow ring behind guardrails
const gr = BUCKETS.find((b) => b.id === "guardrails")!;
const beacon = `<rect x="${COLX.bk - 6}" y="${gr.y - 6}" width="${COLX.bkW + 12}" height="${gr.h + 12}" rx="14"
     fill="none" stroke="${V("--accent")}" stroke-width="2" opacity="0">
     <animate attributeName="opacity" values="0.55;0.05;0.55" dur="2.6s" repeatCount="indefinite"/>
     <animate attributeName="stroke-width" values="2;7;2" dur="2.6s" repeatCount="indefinite"/>
   </rect>
   <text class="beaconlabel" x="${COLX.bk + COLX.bkW / 2}" y="${gr.y - 12}" text-anchor="middle">THE BEACON</text>`;

// evaluation foundation bar spanning the full width
const evalX = COLX.fw,
  evalRight = COLX.bk + COLX.bkW;
const evalBar = `<rect x="${evalX}" y="${evalY}" width="${evalRight - evalX}" height="${evalH}" rx="12"
    fill="var(--panel-2)" stroke="${V("--good")}" stroke-width="1.4" stroke-dasharray="2 4"/>
  <foreignObject x="${evalX}" y="${evalY}" width="${evalRight - evalX}" height="${evalH}">
    <div xmlns="http://www.w3.org/1999/xhtml" class="nbody" style="text-align:center;align-items:center">
      <b style="color:var(--good);font-size:14px">🧪 Evaluation — the assurance layer</b>
      <div class="s" style="font-size:11.5px">Doesn't reduce risk; <b style="color:var(--text)">verifies the controls work</b> &amp; catches regressions. Cuts across all six buckets — NIST RMF <i>Measure</i>.</div>
    </div>
  </foreignObject>`;

s += `<g id="beacon">${beacon}</g><g id="nodes">${nodes}</g><g id="evalbar">${evalBar}</g>`;
svg.innerHTML = s;

/* ---------------- interactivity ---------------- */
const allEdges = [...svg.querySelectorAll<SVGElement>(".edge")];
const allNodes = [...svg.querySelectorAll<SVGElement>(".node")];

function clearFocus() {
  svg.classList.remove("focusing");
  allEdges.forEach((e) => e.classList.remove("on"));
  allNodes.forEach((n) => n.classList.remove("dim"));
}

function focusRisk(id: number) {
  svg.classList.add("focusing");
  const partners = new Set<string>();
  allEdges.forEach((e) => {
    const on = Number(e.dataset["r"]) === id;
    e.classList.toggle("on", on);
    if (on) {
      if (e.dataset["f"]) partners.add("fw:" + e.dataset["f"]);
      if (e.dataset["b"]) partners.add("bk:" + e.dataset["b"]);
    }
  });
  allNodes.forEach((n) => {
    const keep =
      (n.classList.contains("rk") && Number(n.dataset["id"]) === id) ||
      (n.classList.contains("fw") && partners.has("fw:" + n.dataset["id"])) ||
      (n.classList.contains("bk") && partners.has("bk:" + n.dataset["id"]));
    n.classList.toggle("dim", !keep);
  });
}

function focusFramework(fid: string) {
  svg.classList.add("focusing");
  const risks = new Set<number>();
  allEdges.forEach((e) => {
    const on = e.dataset["f"] === fid;
    e.classList.toggle("on", on);
    if (on) risks.add(+e.dataset["r"]!);
  });
  allNodes.forEach((n) => {
    const keep =
      (n.classList.contains("fw") && n.dataset["id"] === fid) ||
      (n.classList.contains("rk") && risks.has(+n.dataset["id"]!));
    n.classList.toggle("dim", !keep);
  });
}

function focusBucket(bid: string) {
  svg.classList.add("focusing");
  const risks = new Set<number>();
  allEdges.forEach((e) => {
    const on = e.dataset["b"] === bid;
    e.classList.toggle("on", on);
    if (on) risks.add(+e.dataset["r"]!);
  });
  allNodes.forEach((n) => {
    const keep =
      (n.classList.contains("bk") && n.dataset["id"] === bid) ||
      (n.classList.contains("rk") && risks.has(+n.dataset["id"]!));
    n.classList.toggle("dim", !keep);
  });
}

// wire hovers
svg
  .querySelectorAll<SVGElement>(".node.rk")
  .forEach((n) => n.addEventListener("mouseenter", () => focusRisk(+n.dataset["id"]!)));
svg
  .querySelectorAll<SVGElement>(".node.fw")
  .forEach((n) => n.addEventListener("mouseenter", () => focusFramework(n.dataset["id"]!)));
svg
  .querySelectorAll<SVGElement>(".node.bk")
  .forEach((n) => n.addEventListener("mouseenter", () => focusBucket(n.dataset["id"]!)));
svg.querySelectorAll(".node").forEach((n) => n.addEventListener("mouseleave", restoreDefault));

/* default / toolbar modes */
const btnBeacon = $("#btn-beacon")!,
  btnGaps = $("#btn-gaps")!,
  btnClear = $("#btn-clear")!;
type Mode = "beacon" | "gaps" | "clear";
let mode: Mode = "beacon";

function setMode(m: Mode) {
  mode = m;
  [btnBeacon, btnGaps, btnClear].forEach((b) => b.classList.remove("active"));
  ({ beacon: btnBeacon, gaps: btnGaps, clear: btnClear })[m].classList.add("active");
  restoreDefault();
}

function restoreDefault() {
  clearFocus();
  if (mode === "beacon") {
    svg.classList.add("beacon-on");
  } else {
    svg.classList.remove("beacon-on");
  }
  if (mode === "gaps") {
    svg.classList.add("focusing");
    GAP_RISKS.forEach((id) => {
      allEdges.forEach((e) => {
        if (Number(e.dataset["r"]) === id) e.classList.add("on");
      });
    });
    allNodes.forEach((n) => {
      const keep =
        (n.classList.contains("rk") && GAP_RISKS.includes(+n.dataset["id"]!)) ||
        (n.classList.contains("bk") &&
          [...allEdges].some(
            (e) => e.classList.contains("on") && e.dataset["b"] === n.dataset["id"],
          ));
      n.classList.toggle("dim", !keep);
    });
  }
}

btnBeacon.addEventListener("click", () => setMode("beacon"));
btnGaps.addEventListener("click", () => setMode("gaps"));
btnClear.addEventListener("click", () => setMode("clear"));

restoreDefault();
