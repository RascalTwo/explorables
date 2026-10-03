import { arrowMarkers, labelBox, saveHash, loadHash, $ } from "/_kit/viz.js";

// ---- actors / lifelines -------------------------------------------------
const TOP = 64, LANE_W = 150, LANE_H = 44;
const lanes = [
  { id: "member", label: "Organization · client_id+secret", x: 80,  color: "var(--c1)" },
  { id: "gw",     label: "API Gateway",                      x: 290, color: "var(--c3)" },
  { id: "ping",   label: "PingOne (Auth Server)",            x: 500, color: "var(--accent)" },
  { id: "api",    label: "Data API",                         x: 690, color: "var(--good)" },
];
const L = Object.fromEntries(lanes.map(l => [l.id, l.x]));

// ---- the steps ----------------------------------------------------------
type TokenKey = "member" | "actor" | "deleg";
interface Arrow { from: string; to: string; label: string; color: string; self?: boolean; dashed?: boolean; y?: number }
interface Step {
  tag: string; title: string; body: string;
  arrow: Arrow | null; glow: string[]; live: TokenKey[]; focus: TokenKey | null; ping: string | null;
  cached?: boolean; summary?: boolean;
}
// `arrow.y` is assigned programmatically below so steps can be reordered safely.
const steps: Step[] = [
  { tag: "Setup", title: "Four parties, one organization request",
    body: "An <code>organization's</code> system wants data from a downstream <code>API</code> (a generic <code>Data API</code> here), but only ever talks to the <code>gateway</code>. There's no individual end user — the whole organization authenticates as a single client. The gateway must call the API <em>on the organization's behalf</em> — that's the on-behalf-of problem.",
    arrow: null, glow: [], live: [], focus: null, ping: null },

  { tag: "Step 1 · Authn", title: "The organization authenticates with PingOne",
    body: "The organization authenticates using its <strong>client_id + client_secret</strong> (<code>client_credentials</code> grant). PingOne issues a token whose <code>sub</code> is the <strong>organization's client itself</strong> — no human user. <code>aud = the gateway</code>; it is <strong>not</strong> valid at the Data API.",
    arrow: { from: "member", to: "ping", label: "POST /as/token · client_credentials (org creds)", color: "accent" },
    glow: ["member", "ping"], live: ["member"], focus: "member", ping: "authn-cc" },

  { tag: "Step 2 · Inbound", title: "The org calls the gateway with that token",
    body: "The organization hits the gateway carrying <code>Bearer &lt;org_token&gt;</code>. The gateway must validate it before doing anything — and it can't just forward it downstream, because its <code>aud</code> is the gateway, not the Data API.",
    arrow: { from: "member", to: "gw", label: "GET /data · Bearer org_token", color: "c1" },
    glow: ["member", "gw"], live: ["member"], focus: "member", ping: null },

  { tag: "Step 3 · Validate", title: "The gateway fetches PingOne's JWKS to verify the token",
    body: "To trust the org token, the gateway needs PingOne's public signing keys. On the first request it does <code>GET /as/jwks</code>; the keys are <strong>cached</strong> thereafter. It then checks the <strong>signature</strong> and <strong>issuer</strong> <em>locally</em> — no introspection call.",
    arrow: { from: "gw", to: "ping", label: "GET /as/jwks · signing keys (cache miss → fetch)", color: "warn" },
    glow: ["gw", "ping"], live: ["member"], focus: "member", ping: "jwks" },

  { tag: "Step 4 · Actor", title: "The gateway gets its OWN token (actor_token)",
    body: "PingOne won't mint a delegated token unless the caller proves who <em>it</em> is. So the gateway does its own <code>client_credentials</code> grant to get an <strong>actor_token</strong> — \"I am api-gateway.\"",
    arrow: { from: "gw", to: "ping", label: "POST /as/token · client_credentials → actor_token", color: "c3" },
    glow: ["gw", "ping"], live: ["member", "actor"], focus: "actor", ping: "actor-cc" },

  { tag: "Step 5 · Exchange", title: "The token exchange request",
    body: "The gateway POSTs <code>grant_type = …:token-exchange</code> with <strong>both</strong> tokens: <code>subject_token</code> (the organization) + <code>actor_token</code> (itself), plus <code>audience = data-api</code> and the requested <code>scope</code>.",
    arrow: { from: "gw", to: "ping", label: "POST /as/token · token-exchange (subject + actor)", color: "danger" },
    glow: ["gw", "ping"], live: ["member", "actor"], focus: "actor", ping: "exchange" },

  { tag: "Step 6 · Mint", title: "PingOne mints the delegated token",
    body: "PingOne natively builds the new token: <code>sub</code> stays the <strong>organization</strong>, <code>act</code> records the <strong>gateway</strong> (the on-behalf-of fact), <code>aud</code> becomes the <strong>Data API</strong>. This is the RFC 8693 <code>act</code> claim Ping does natively (Okta needs an inline-hook hack).",
    arrow: { from: "ping", to: "gw", label: "← delegated token (sub=org, act=gateway, aud=data-api)", color: "good" },
    glow: ["ping", "gw"], live: ["member", "actor", "deleg"], focus: "deleg", ping: "exchange" },

  { tag: "Step 7 · Downstream", title: "The gateway calls the Data API with the new token",
    body: "Now the gateway forwards a token the Data API will actually accept: its <code>aud</code> <em>is</em> the Data API. A leaked Data-API token can't be replayed against the gateway, and vice-versa.",
    arrow: { from: "gw", to: "api", label: "GET /data · Bearer delegated_token", color: "good" },
    glow: ["gw", "api"], live: ["member", "actor", "deleg"], focus: "deleg", ping: null },

  { tag: "Step 8 · Validate", title: "Data API validates — all checks local",
    body: "The Data API verifies the delegated token with the <strong>same cached JWKS</strong> (no new Ping call): <code>signature</code> ✓, <code>iss</code> ✓, <code>aud = data-api</code> ✓, <code>scope</code> ✓. Then it reads the <code>act</code> claim — \"org 1111, via api-gateway\" — giving a full audit trail of who acted.",
    arrow: { from: "api", to: "api", self: true, label: "verify: sig (cached JWKS) · iss · aud · scope · act", color: "warn", dashed: true },
    glow: ["api"], live: ["member", "actor", "deleg"], focus: "deleg", ping: "jwks", cached: true },

  { tag: "Step 9 · Accept", title: "Data API serves the organization's data",
    body: "Validation passed, so the Data API serves the organization's data. The <code>act</code> claim is logged for audit. The Data API never saw the organization's original token — only a purpose-built, audience-restricted one minted <em>for it</em>.",
    arrow: { from: "api", to: "gw", label: "← 200 OK · organization's data", color: "good" },
    glow: ["api", "gw"], live: ["member", "actor", "deleg"], focus: "deleg", ping: null },

  { tag: "Done", title: "Response flows back to the organization",
    body: "The organization got its data. Across the whole flow, PingOne was called exactly four times — org authn, the JWKS fetch, the actor-token grant, and the exchange — and every token was verified against those cached keys. That's on-behalf-of for an organization's client identity, validated end to end.",
    arrow: { from: "gw", to: "member", label: "← 200 OK", color: "c1" },
    glow: ["gw", "member"], live: ["member", "actor", "deleg"], focus: "deleg", ping: null },

  { tag: "Recap", title: "On-behalf-of, end to end",
    body: "<code>sub</code> stayed the organization (<strong>1111</strong>); a new <code>act</code> claim records the <strong>gateway</strong> as the actor; <code>aud</code> flipped from the gateway to the <strong>Data API</strong>. Four PingOne calls (highlighted right); the JWKS was fetched once and reused. No introspection — signature, issuer, audience, scope and <code>act</code> are all checked in-process.",
    arrow: null, glow: [], live: ["member", "actor", "deleg"], focus: null, ping: null, summary: true },
];

// ---- lay out arrow y-positions ------------------------------------------
const ABASE = 152, AGAP = 52;
let an = 0;
for (const s of steps) { if (s.arrow) { s.arrow.y = ABASE + an * AGAP; an++; } }
const BOT = ABASE + (an - 1) * AGAP + 34;

// ---- build static SVG ---------------------------------------------------
const svg = $<SVGSVGElement>("#seq")!;
const colorVar = (c: string) => `var(--${c})`;
// The kit takes a {id: fill} map; this array yields markers keyed "0".."5" (kept as-is).
let h = arrowMarkers(["accent","good","warn","c1","c3","danger"] as unknown as Record<string, string>);

// lifelines + actor heads
for (const lane of lanes) {
  h += `<g>
    <circle class="actor-glow" id="glow-${lane.id}" cx="${lane.x}" cy="${TOP - 8}" r="30" fill="${lane.color}" opacity="0" style="filter:blur(10px)"/>
    <line class="lifeline" x1="${lane.x}" y1="${TOP + LANE_H/2}" x2="${lane.x}" y2="${BOT}"/>
  </g>`;
}
// lane header boxes (drawn after lines so they sit on top)
for (const lane of lanes) {
  const bx = lane.x - LANE_W/2;
  h += `<g class="lane-box">
    <rect x="${bx}" y="${TOP - LANE_H/2}" width="${LANE_W}" height="${LANE_H}" rx="8" stroke="${lane.color}"/>
    ${labelBox({x:bx, y:TOP - LANE_H/2, w:LANE_W, h:LANE_H},
      `<div style="font:700 12px var(--sans);color:${lane.color};text-align:center;line-height:1.15">${lane.label}</div>`)}
  </g>`;
}

// message arrows
steps.forEach((s, i) => {
  const a = s.arrow;
  if (!a) return;
  const col = colorVar(a.color);
  const cls = `msg-line${a.dashed ? " dashed" : ""}`;
  if (a.self) {
    // self-loop bulging left of the lifeline; label sits in the open space to its left
    const x = L[a.from]!, y = a.y!, ext = 34, drop = 17;
    h += `<g data-arrow="${i}">
      <path class="${cls}" id="arr-${i}" d="M ${x} ${y} h -${ext} v ${drop} h ${ext}" stroke="${col}" marker-end="url(#ah-${a.color})"/>
      <g class="msg-label" id="lab-${i}">
        ${labelBox({x: x - ext - 372, y: y - 37, w: 360, h: 32},
          `<div style="font:600 10.5px var(--mono);color:var(--text);text-align:right;line-height:1.18">${a.label}</div>`)}
      </g>
    </g>`;
  } else {
    const x1 = L[a.from]!, x2 = L[a.to]!, y = a.y!;
    const labW = 330, labX = (Math.min(x1,x2)+Math.max(x1,x2))/2 - labW/2;
    h += `<g data-arrow="${i}">
      <path class="${cls}" id="arr-${i}" d="M ${x1} ${y} L ${x2} ${y}" stroke="${col}" marker-end="url(#ah-${a.color})"/>
      <g class="msg-label" id="lab-${i}">
        ${labelBox({x:labX, y:y-37, w:labW, h:32},
          `<div style="font:600 10.5px var(--mono);color:var(--text);text-align:center;line-height:1.18;white-space:normal">${a.label}</div>`)}
      </g>
    </g>`;
  }
});
svg.innerHTML = h;

// ---- render a step ------------------------------------------------------
let cur = loadHash<{ step: number }>().step ?? 0;
let timer: ReturnType<typeof setInterval> | null = null;
const narr = $("#narr")!, bar = $("#bar")!, stepcount = $("#stepcount")!;

function render() {
  const s = steps[cur]!;
  narr.innerHTML = `<div class="tag">${s.tag}</div><h2>${s.title}</h2><p>${s.body}</p>`;
  bar.style.width = `${(cur/(steps.length-1))*100}%`;
  stepcount.textContent = `${cur} / ${steps.length-1}`;

  steps.forEach((_st, i) => {
    const line = svg.querySelector(`#arr-${i}`);
    const lab = svg.querySelector<SVGGElement>(`#lab-${i}`);
    if (!line) return;
    line.classList.toggle("active", i === cur);
    line.classList.toggle("done", i < cur);
    if (lab) lab.style.opacity = String((i <= cur) ? 1 : 0.16);
  });

  svg.classList.toggle("summary", !!s.summary);

  for (const lane of lanes) {
    svg.querySelector(`#glow-${lane.id}`)?.classList.toggle("on", s.glow.includes(lane.id));
  }

  const map: Record<TokenKey, string> = { member: "tok-member", actor: "tok-actor", deleg: "tok-deleg" };
  for (const [key, id] of Object.entries(map) as [TokenKey, string][]) {
    const el = document.getElementById(id)!;
    el.classList.toggle("live", s.live.includes(key));
    el.classList.toggle("focus", s.focus === key);
  }

  // PingOne call ledger: a row is "live" once any step up to now used it; "active" on the current step.
  const usedRows = new Set(steps.slice(0, cur + 1).map(st => st.ping).filter(Boolean));
  for (const row of document.querySelectorAll<HTMLElement>(".lrow")) {
    const id = row.dataset["row"] ?? "";
    row.classList.toggle("live", usedRows.has(id));
    row.classList.toggle("active", s.ping === id);
    // "cached hit" badge only when re-using the JWKS (step 8), not on the first fetch
    row.classList.toggle("cached", id === "jwks" && !!s.cached);
  }

  $<HTMLButtonElement>("#prev")!.disabled = cur === 0;
  $<HTMLButtonElement>("#next")!.disabled = cur === steps.length - 1;
  saveHash({ step: cur });
}

function go(n: number) { cur = Math.max(0, Math.min(steps.length-1, n)); render(); }
function stopPlay() { if (timer) { clearInterval(timer); timer = null; $("#play")!.textContent = "▶ Play"; } }
function play(): void {
  if (timer) return stopPlay();
  if (cur === steps.length-1) cur = 0;
  $("#play")!.textContent = "⏸ Pause";
  timer = setInterval(() => {
    if (cur >= steps.length-1) return stopPlay();
    go(cur+1);
  }, 2100);
}

$("#next")!.onclick = () => { stopPlay(); go(cur+1); };
$("#prev")!.onclick = () => { stopPlay(); go(cur-1); };
$("#reset")!.onclick = () => { stopPlay(); go(0); };
$("#play")!.onclick = play;
addEventListener("keydown", e => {
  if (e.key === "ArrowRight") { stopPlay(); go(cur+1); }
  else if (e.key === "ArrowLeft") { stopPlay(); go(cur-1); }
  else if (e.key === " ") { e.preventDefault(); play(); }
});

render();
