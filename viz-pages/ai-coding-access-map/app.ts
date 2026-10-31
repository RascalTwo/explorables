import { arrowMarkers, labelBox, $, $$, esc, saveHash, loadHash, type Box } from "@viz/kit";
import { BANDS, COLS, PAY, WORK_CUTOFF, type Band, type Plan, type Surface } from "./taxonomy.js";
import { PLANS } from "./plans.js";
import { S } from "./surfaces.js";

interface Placed {
  p: Plan;
  x: number;
  y: number;
  r: number;
  side?: number;
}
interface Hash {
  owned: string[];
  mode: string;
  budget: number;
}

/* ═══ STATE ══════════════════════════════════════════════════════════════ */
const DEFAULT: Hash = { owned: [], mode: "personal", budget: 220 };
const loaded = Object.assign({}, DEFAULT, loadHash<Hash>());
const state = { ...loaded, owned: new Set(loaded.owned || []) };

const planById = (id: string) => PLANS.find((p) => p.id === id);
const bandIndex = (id: string) => BANDS.findIndex((b) => b.id === id);
const owns = (id: string) => state.owned.has(id);

// A band is off-limits when you're at work and it sits past the cutoff. Everything
// downstream — dimming, counting, the "you just lost N tools" line — reads this.
const bandBlocked = (bid: string) => state.mode === "work" && bandIndex(bid) >= WORK_CUTOFF;
// Over budget is about the SLIDER, not about what you own; you can always still
// click an unaffordable plan, it just isn't suggested to you.
const overBudget = (p: Plan) => state.budget < 220 && p.price > state.budget;
const planMuted = (p: Plan) => bandBlocked(p.band) || overBudget(p);

/* A surface is open if you hold ANY of its reqs — and, where one exists, the extra
   gate too. `also` is deliberately a single id rather than a second OR-list: the only
   real cases are "your admin has to switch it on", and a general AND-of-ORs solver
   would be machinery for one shape of fact. */
// `owns` is "you clicked it"; `usable` is "and it still counts". They diverge the
// moment you switch to At work: a plan in a blocked band stays visibly yours — dropping
// it silently would hide the very trade-off this page is about — but it stops paying
// for anything, and so does every tool that only lives in a blocked band.
const usable = (id: string) => {
  const p = planById(id);
  return !!p && state.owned.has(id) && !bandBlocked(p.band);
};
function unlockedBy(s: Surface): string[] {
  if (bandBlocked(s.band)) return [];
  if (s.also && !usable(s.also)) return [];
  return s.reqs.filter(usable);
}
const isOpen = (s: Surface) => unlockedBy(s).length > 0;

/* ═══ GEOMETRY ═══════════════════════════════════════════════════════════
   One width for both charts so the band rails line up down the page — the shared
   y-axis is the whole conceit, and it only reads if it's literally the same axis. */
const W = 1900,
  RAIL = 268,
  PLOT_X = RAIL + 26,
  PLOT_W = W - PLOT_X - 30;

/* Price → x. sqrt, not linear: two thirds of the market sits between $0 and $25,
   and a linear axis crushes all of it into the left eighth while $200 outliers get
   the rest of the page. sqrt keeps the crowded end legible without a log scale's
   "what does $0 even mean" problem — sqrt(0) is honestly 0. */
const PMAX = 220;
const px = (p: number) => PLOT_X + PLOT_W * Math.sqrt(Math.min(p, PMAX) / PMAX);
const TICKS = [0, 10, 20, 30, 50, 80, 120, 200];

// Dot area tracks how many tools the plan opens, so "expensive but unlocks little"
// is visible as a small dot far to the right without anyone reading a number.
const planReach = (p: Plan) => S.filter((s) => s.reqs.includes(p.id)).length;
const rOf = (p: Plan) => 4.5 + Math.sqrt(planReach(p)) * 2.1;

/* Beeswarm: within a band, walk plans left-to-right and drop each into the first
   vertical slot where it doesn't touch a dot already placed. Cheap O(n²) — n is ~50
   per band at worst and this runs once per redraw.
   ponytail: naive collision scan; swap for a quadtree if the plan list ever passes ~300. */
function swarm(plans: Plan[]): Placed[] {
  const placed: Placed[] = [];
  plans
    .toSorted((a, b) => a.price - b.price || planReach(b) - planReach(a))
    .forEach((p) => {
      const x = px(p.price),
        r = rOf(p);
      let row = 0;
      // rows alternate 0, +1, -1, +2, -2 … so a cluster grows around the lane's centre
      // instead of hanging off the bottom of it.
      for (;;) {
        const y = row === 0 ? 0 : (row % 2 ? Math.ceil(row / 2) : -row / 2) * 21;
        // Gap is 12, not the 3 that mere non-overlap needs: dots packed to touching leave no
        // room for anyone's label, and a labelled dot one row down beats a tight row of
        // anonymous circles. The cheapest place to buy label space is the layout.
        if (!placed.some((q) => Math.abs(q.y - y) < 19 && Math.abs(q.x - x) < q.r + r + 12)) {
          placed.push({ p, x, y, r });
          break;
        }
        row++;
        if (row > 40) {
          placed.push({ p, x, y, r });
          break;
        } // never spin forever
      }
    });
  return placed;
}

/* Label placement is separate from dot placement, and re-run on every draw, because it
   depends on what you own and dot positions do not. (Dots must NOT move when you buy
   something — a chart that reshuffles under the click you just made is unreadable.)
   Greedy, in priority order: what you own gets first claim on the space, then the
   plans that unlock the most. Right side preferred, left as a fallback, no label as a
   last resort — and an unlabelled dot still has its hover title, so nothing is lost. */
function assignLabels(placed: Placed[]) {
  const taken: { x0: number; x1: number; y: number }[] = [];
  placed
    .toSorted((a, b) => +owns(b.p.id) - +owns(a.p.id) || b.r - a.r)
    .forEach((d) => {
      const w = (d.p.short || d.p.name).length * 6.4 + 12;
      const fits = (dir: number) => {
        const x0 = dir > 0 ? d.x + d.r + 4 : d.x - d.r - 4 - w;
        const x1 = x0 + w;
        const hitsDot = placed.some(
          (q) => q !== d && Math.abs(q.y - d.y) < 12 && q.x + q.r > x0 && q.x - q.r < x1,
        );
        const hitsLabel = taken.some((t) => Math.abs(t.y - d.y) < 12 && t.x1 > x0 && t.x0 < x1);
        return !hitsDot && !hitsLabel && { x0, x1, y: d.y };
      };
      const spot = fits(1) || fits(-1);
      d.side = spot ? (spot.x0 > d.x ? 1 : -1) : 0;
      // Deliberately NOT forcing a label for owned plans that find no room. Two adjacent
      // owned dots ($8 and $10) then print their names straight through each other, which
      // is worse than one dot going unnamed — and unnamed here still means ringed in white,
      // named in the receipt, named in the drawer, and named on hover.
      if (spot) taken.push(spot);
    });
}

// Lay the swarm out first, then size each band lane to the swarm it actually got.
// Fixed lane heights were what left the old map half a screen of dead space.
const SWARM: Record<string, Placed[]> = {},
  MKT_LANE: Record<string, { y: number; h: number; mid: number }> = {};
let _my = 58;
BANDS.forEach((b) => {
  const sw = (SWARM[b.id] = swarm(PLANS.filter((p) => p.band === b.id)));
  const spread = sw.length > 0 ? Math.max(...sw.map((d) => Math.abs(d.y) + d.r)) : 12;
  const h = Math.max(88, spread * 2 + 30);
  MKT_LANE[b.id] = { y: _my, h, mid: _my + h / 2 };
  _my += h + 8;
});
const MKT_H = _my + 10;

/* Grid lanes reuse RAIL / PLOT_X / PLOT_W verbatim so band n starts at the same
   left edge in both charts. Two charts that merely look similar would break the
   "height means trust, everywhere on this page" promise the header makes. */
const COL_W = PLOT_W / COLS.length,
  NODE_H = 50,
  NODE_GAP = 8,
  LANE_TOP = 14,
  LANE_BOT = 12;
const cellOf = (bid: string, cid: string) => S.filter((s) => s.band === bid && s.col === cid);

const GRID_LANE: Record<string, { y: number; h: number }> = {},
  NODES = new Map<string, Box>();
let _gy = 56;
BANDS.forEach((b) => {
  const rows = Math.max(1, ...COLS.map((c) => cellOf(b.id, c.id).length));
  // 88 is the rail's own text height (number + name + wrapped description); a lane with
  // one box in it is shorter than its own label otherwise.
  const h = Math.max(88, LANE_TOP + rows * (NODE_H + NODE_GAP) - NODE_GAP + LANE_BOT);
  GRID_LANE[b.id] = { y: _gy, h };
  COLS.forEach((c, ci) =>
    cellOf(b.id, c.id).forEach((s, i) => {
      NODES.set(s.id, {
        x: PLOT_X + ci * COL_W + 5,
        y: _gy + LANE_TOP + i * (NODE_H + NODE_GAP),
        w: COL_W - 14,
        h: NODE_H,
      });
    }),
  );
  _gy += h + 8;
});
const GRID_H = _gy + 10;

/* ═══ RENDER ═════════════════════════════════════════════════════════════ */
const mkt = $<SVGSVGElement>("#market")!,
  grid = $<SVGSVGElement>("#grid")!;
let selected: { kind: "plan" | "surface"; id: string } | null = null; // {kind:"plan"|"surface", id}

// The band rail is identical in both charts, so it's one function. It also carries
// the per-chart count, which is the only part that differs.
function railParts(lane: Record<string, { y: number; h: number }>, countFor: (b: Band) => string) {
  return BANDS.flatMap((b, i) => {
    const { y, h } = lane[b.id]!,
      off = bandBlocked(b.id);
    return [
      `<rect x="14" y="${y}" width="${W - 44}" height="${h}" rx="11"
         fill="var(--panel)" stroke="var(--border)" opacity="${off ? 0.35 : 1}"/>`,
      `<rect x="14" y="${y}" width="4" height="${h}" rx="2"
         fill="${off ? "var(--border)" : "var(--accent)"}" opacity="${off ? 0.5 : 1 - i * 0.15}"/>`,
      `<text class="bandnum" x="30" y="${y + 19}" opacity="${off ? 0.4 : 1}">BAND ${i + 1}${off ? " · BLOCKED AT WORK" : ""}</text>`,
      // Count rides the top line, right-aligned. It used to sit at the lane's bottom edge,
      // which collided with the wrapped description in any lane short enough to have both.
      `<text class="bandnum" x="${RAIL - 14}" y="${y + 19}" text-anchor="end"
         fill="var(--muted)" opacity="${off ? 0.4 : 1}">${countFor(b)}</text>`,
      `<text class="bandname" x="30" y="${y + 38}" opacity="${off ? 0.4 : 1}">${esc(b.name)}</text>`,
      labelBox(
        { x: 28, y: y + 45, w: RAIL - 42, h: h - 52 },
        `<div style="font:10.5px/1.35 var(--sans);color:var(--faint);opacity:${off ? 0.5 : 1}">${esc(b.sub)}</div>`,
      ),
    ];
  });
}

function drawMarket() {
  const parts: string[] = [];

  // price axis — drawn first so dots sit on top of the gridlines
  TICKS.forEach((t) => {
    parts.push(
      `<line class="gridline" x1="${px(t)}" y1="46" x2="${px(t)}" y2="${MKT_H - 16}"
                  opacity=".5" stroke-dasharray="2 4"/>`,
      `<text class="axlab" x="${px(t)}" y="38" text-anchor="middle">${t === 0 ? "free" : "$" + t}</text>`,
    );
  });
  // Title sits over the rail, not over the plot: at x=PLOT_X it lands directly above the
  // "free" tick and the two read as one smudged string.
  parts.push(
    `<text class="axtitle" x="14" y="38">DOLLARS PER MONTH →</text>`,
    ...railParts(MKT_LANE, (b) => {
      const n = PLANS.filter((p) => p.band === b.id).length;
      const mine = PLANS.filter((p) => p.band === b.id && owns(p.id)).length;
      return `${n} plans${mine ? ` · ${mine} yours` : ""}`;
    }),
  );

  const labels: string[] = []; // painted after every circle, so no dot can cover a name
  BANDS.forEach((b) => {
    const lane = MKT_LANE[b.id]!;
    assignLabels(SWARM[b.id]!);
    SWARM[b.id]!.forEach((d) => {
      const p = d.p,
        muted = planMuted(p),
        mine = owns(p.id);
      const cy = lane.mid + d.y;
      parts.push(`<g class="plan ${mine ? "owned" : ""}" data-viz-id="${p.id}" data-kind="plan"
          data-label="${esc(p.vendor + " " + p.name + " — $" + p.price + "/mo")}" data-id="${p.id}">
        <title>${esc(`${p.vendor} ${p.name} — ${priceLabel(p, true)} · opens ${planReach(p)} tools`)}</title>
        <circle cx="${d.x}" cy="${cy}" r="${d.r}" fill="${PAY[p.pay].color}"
          opacity="${muted ? 0.16 : mine ? 1 : 0.62}"
          stroke="${mine ? "var(--text)" : "none"}" stroke-width="${mine ? 2.2 : 0}"/>
      </g>`);
      // Only label what you own or what's big enough to matter — labelling 50 dots
      // turns the swarm into a wall of 10px text and hides the shape it exists to show.
      // Label anything that fits. The size gate this replaced hid the entire free column —
      // eleven unlabelled dots at $0, which is the first thing a beginner looks for.
      if (!muted && d.side)
        labels.push(`<text class="plan" x="${d.x + d.side * (d.r + 4)}" y="${cy + 3.5}"
            text-anchor="${d.side > 0 ? "start" : "end"}"
            fill="${mine ? "var(--text)" : "var(--muted)"}" font-weight="${mine ? 600 : 400}"
            pointer-events="none">${esc(p.short || p.name)}</text>`);
    });
  });
  parts.push(...labels);

  mkt.setAttribute("viewBox", `0 0 ${W} ${MKT_H}`);
  mkt.innerHTML = parts.join("");
}

function drawGrid() {
  const parts = [arrowMarkers({})];
  COLS.forEach((c, i) => {
    parts.push(
      `<text class="colhead" x="${PLOT_X + i * COL_W + 5}" y="24">${esc(c.name.toUpperCase())}</text>`,
      `<text class="colsub"  x="${PLOT_X + i * COL_W + 5}" y="41">${esc(c.sub)}</text>`,
    );
  });

  parts.push(
    ...railParts(GRID_LANE, (b) => {
      const all = S.filter((s) => s.band === b.id);
      return `${all.filter(isOpen).length} of ${all.length} unlocked`;
    }),
  );

  S.forEach((s) => {
    const n = NODES.get(s.id)!,
      open = isOpen(s),
      blocked = bandBlocked(s.band);
    const col = open ? PAY[planById(unlockedBy(s)[0]!)!.pay].color : "var(--border)";
    const op = blocked ? 0.18 : open ? 1 : 0.45;
    parts.push(`<g class="node ${open ? "" : "locked"}" data-viz-id="${s.id}" data-kind="surface"
        data-label="${esc(s.name)}" data-id="${s.id}">
      <title>${esc(s.vendor + " · " + s.name)}</title>
      <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"
        fill="${open ? "var(--panel-2)" : "transparent"}" stroke="${col}"
        stroke-width="${open ? 1.7 : 1}" opacity="${op}"
        stroke-dasharray="${s.verified === false ? "2 3" : ""}"/>
      ${labelBox(n, `<div class="n-title">${esc(s.name)}</div><div class="n-how">${esc(s.how)}</div>`, "nodelabel")}
    </g>`);
  });

  grid.setAttribute("viewBox", `0 0 ${W} ${GRID_H}`);
  grid.innerHTML = parts.join("");
}

/* ═══ READOUTS ═══════════════════════════════════════════════════════════ */
function receipt() {
  const mine = [...state.owned].map(planById).filter((p): p is Plan => Boolean(p));
  const spend = mine.filter((p) => !bandBlocked(p.band)).reduce((a, p) => a + p.price, 0);
  const open = S.filter(isOpen).length;
  $("#r-spend")!.textContent = "$" + spend;
  $("#r-got")!.textContent = String(open);
  $("#r-all")!.textContent = String(S.filter((s) => !bandBlocked(s.band)).length);

  const blocked = mine.filter((p) => bandBlocked(p.band));
  // The honest version of the "at work" story. Most of this market turns out to hold real
  // certifications, so the count barely moves — what actually goes is the cheap band and
  // self-hosting. Saying "most of the market disappears" would have been a nicer headline
  // and a false one, so the copy reports the counts it computes.
  const survive = PLANS.filter((p) => !bandBlocked(p.band)).length;
  const cheapestOpen = Math.min(
    ...PLANS.filter((p) => !bandBlocked(p.band) && p.price > 0).map((p) => p.price),
  );
  $("#s1sub")!.innerHTML =
    state.mode === "work"
      ? `<b>${survive} of ${PLANS.length}</b> plans survive a corporate security review — less of a cull
       than people expect, because most of this field really does hold SOC 2 and ISO 27001.
       What you actually lose is the <b>cheap band</b> — the Chinese labs that undercut everyone on
       price — and the option to <b>run a model on your own machine</b>. The cheapest paid plan still
       open to you is $${cheapestOpen}.${blocked.length > 0 ? ` <b>${blocked.length}</b> plan${blocked.length > 1 ? "s" : ""} you'd picked just stopped counting.` : ""}`
      : `Every dot is one thing you can actually buy. <b>Left–right is price</b>, <b>up–down is how far
       you'd trust the vendor</b>, colour is <b>how</b> you pay, and a dot's size is how many tools it
       opens. Click one to add it to your stack.`;

  $("#s2sub")!.innerHTML = open
    ? `Lit boxes are yours. Colour matches the plan that pays for each one, so a box in a colour
       you didn't expect is a tool you're getting from a subscription you bought for something else.`
    : `Nothing is unlocked yet — pick a plan above. <b>Every box here is a real thing you can sit
       down and use</b>; the columns are just where it runs.`;
}

const legendItem = (color: string, label: string, dash?: boolean) =>
  `<span class="legend-item"><span class="swatch" style="background:${dash ? "transparent" : color};
     ${dash ? `border:1px dashed ${color}` : ""}"></span>${label}</span>`;
$("#legend-pay")!.innerHTML =
  Object.entries(PAY)
    .map(([, v]) => legendItem(v.color, v.name))
    .join("") +
  legendItem("var(--text)", "in your stack (ringed)") +
  legendItem("var(--muted)", "unverified gating", true);

/* Verified 2026-09-06. Each of these is a thing a beginner will read somewhere and act on,
   and each is now false — the failure mode is following a recommendation to a product that
   merged, retired its free tier, or no longer prices the way the article says. */
const STALE: [string, string][] = [
  [
    "Roo Code is archived",
    "The repository was shut down on 15 May 2026 and its own README now points people at Cline. The lineage runs Cline → Roo Code → Kilo Code; Kilo Code is the live continuation, Cline is independently healthy, Roo Code is a dead end.",
  ],
  [
    "Windsurf is Devin now",
    "Cognition bought Windsurf and merged the price ladders — windsurf.com redirects to devin.ai. Before that it was Codeium. Any guide comparing Codeium, Windsurf and Devin as three products is describing one.",
  ],
  [
    "Cursor belongs to SpaceX",
    "The $60bn all-stock acquisition closed on 14 August 2026, and xAI became SpaceXAI in February. The products are unchanged and Cursor's certifications are all still live — but the owner is not who the reviews say it is.",
  ],
  [
    "Devin no longer prices in ACUs",
    "There is no ACU and no “Core” plan on the live page. Every article quoting $2.25 per ACU describes a scheme that no longer exists.",
  ],
  [
    "Amp is not Sourcegraph any more",
    "Amp spun out as its own company in December 2025. Sourcegraph's own Cody still exists but is enterprise-only at roughly $16k and up — Amp is a different vendor, not an upgrade path.",
  ],
  [
    "Tabnine was acquired by Tricentis",
    "July 2026. Its own security page currently 404s, so the compliance posture it is famous for should be treated as unverified until the new parent re-attests.",
  ],
  [
    "Continue.dev was acquired by Cursor",
    "September 2026, and therefore transitively by SpaceX. The Apache-2.0 code still works; recent commits retire the login flow, which reads like a wind-down.",
  ],
  [
    "Goose moved to the Linux Foundation",
    "Block donated the trademark, repos and governance to the Agentic AI Foundation in December 2025. “Backed by Block” is dated framing and the repo has moved.",
  ],
  [
    "Qwen Code's free CLI quota ended",
    "It stopped on 15 April 2026. Guides still list it as a free way in; you now need a Coding Plan or a paid key.",
  ],
  [
    "Gemini CLI was replaced",
    "Since June 2026 free, AI Pro and AI Ultra users get Antigravity's closed-source binary instead. Only Code Assist and paid API keys kept the open-source CLI.",
  ],
  [
    "Cody's free and Pro tiers are gone",
    "Discontinued July 2025. Sourcegraph's pricing page now shows Enterprise only.",
  ],
  [
    "Mistral Code is called Mistral Vibe",
    "And it has no standalone price — it rides a Le Chat subscription or your own API key.",
  ],
];
$("#stale")!.innerHTML = STALE.map(
  ([h, b]) => `<div class="card"><h4>${esc(h)}</h4><p>${esc(b)}</p></div>`,
).join("");

$("#foot")!.innerHTML =
  `<b>How to read the height.</b> Band 1 is what a large company's security review clears today —
   certifications, a no-training-on-your-code contract, SSO and admin controls. Each band down
   trades one of those away for price or novelty. Band 5 has no vendor at all: open-source tools you
   point at a key you already own, or a model running on your own machine.
   <br><b>Dotted border</b> = a gate I could not pin to a primary source; treat as unverified.
   Prices are monthly, in USD, at the individual rate. This whole area moves fast — check the
   linked page before you spend anything.`;

/* ═══ DRAWER ═════════════════════════════════════════════════════════════ */
const src = (u: string) =>
  `<a href="${u}" target="_blank" rel="noreferrer">${new URL(u).hostname.replace(/^www\./u, "")}</a>`;
// $0 on the axis means "no monthly fee", which for a metered plan is not the same as free.
const priceLabel = (p: Plan, short?: boolean) =>
  p.price
    ? `$${p.price}${short ? "/mo" : "/month"}`
    : p.pay === "token"
      ? short
        ? "per token"
        : "no monthly fee — billed per token used"
      : "free";

function drawer() {
  const d = $("#drawer")!;
  if (!selected) {
    d.innerHTML = `<h3>Click anything for the details</h3>
      <div class="dr-sub">A dot tells you what it costs, how the billing works, and everything it
      opens. A box tells you what the tool is, how you launch it, and which plans pay for it.</div>`;
    return;
  }
  if (selected.kind === "plan") {
    const p = planById(selected.id)!,
      opens = S.filter((s) => s.reqs.includes(p.id));
    d.innerHTML = `<h3 style="color:${PAY[p.pay].color}">${esc(p.vendor)} — ${esc(p.name)}</h3>
      <div class="dr-sub">${priceLabel(p)} ·
        ${esc(BANDS[bandIndex(p.band)]!.name)} ·
        <b class="${owns(p.id) ? "ok" : "no"}">${owns(p.id) ? "in your stack — click the dot again to drop it" : "not in your stack"}</b></div>
      <dl class="dr-grid">
        <dt>How you pay</dt><dd><b>${PAY[p.pay].name}.</b> ${esc(PAY[p.pay].blurb)}</dd>
        ${p.limit ? `<dt>What you get</dt><dd>${esc(p.limit)}</dd>` : ""}
        <dt>Opens ${opens.length} tool${opens.length === 1 ? "" : "s"}</dt>
        <dd>${opens.map((s) => `<span class="${isOpen(s) ? "ok" : ""}">${esc(s.name)}</span>`).join(" · ") || "—"}</dd>
        ${p.note ? `<dt>Worth knowing</dt><dd>${p.note}</dd>` : ""}
        <dt>Source</dt><dd>${src(p.doc)}</dd>
      </dl>`;
  } else {
    const s = S.find((x) => x.id === selected!.id)!,
      hits = unlockedBy(s);
    d.innerHTML = `<h3>${esc(s.name)}</h3>
      <div class="dr-sub">${esc(s.vendor)} · ${esc(COLS.find((c) => c.id === s.col)!.name)} ·
        <b class="${hits.length > 0 ? "ok" : "no"}">${hits.length > 0 ? "unlocked by what you own" : "locked"}</b></div>
      <dl class="dr-grid">
        <dt>What it is</dt><dd>${s.what}</dd>
        <dt>How you start it</dt><dd><code>${esc(s.how)}</code></dd>
        <dt>Paid for by</dt><dd>${s.reqs
          .map((id) => {
            const p = planById(id);
            if (!p) return "";
            return `<div class="req"><span class="mk ${owns(id) ? "ok" : "no"}">${owns(id) ? "●" : "○"}</span>
            <span class="${owns(id) ? "" : "no"}">${esc(p.vendor)} ${esc(p.name)} —
            ${priceLabel(p, true)}</span></div>`;
          })
          .join("")}${
          s.also
            ? `<div class="req"><span class="mk ${owns(s.also) ? "ok" : "no"}">${owns(s.also) ? "●" : "○"}</span>
          <span class="${owns(s.also) ? "" : "no"}"><i>and</i> ${esc(planById(s.also)!.name)}</span></div>`
            : ""
        }</dd>
        ${s.note ? `<dt>Worth knowing</dt><dd>${s.note}</dd>` : ""}
        <dt>Source</dt><dd>${src(s.doc)}</dd>
      </dl>`;
  }
}

/* ═══ INTERACTION ════════════════════════════════════════════════════════ */
function redraw() {
  drawMarket();
  drawGrid();
  receipt();
  drawer();
}
function persist() {
  saveHash({ owned: [...state.owned], mode: state.mode, budget: state.budget });
}

// One click on a dot both buys it and explains it. Splitting those into "select, then
// press Add" is one more step in front of the only thing this page asks you to do.
mkt.addEventListener("click", (e) => {
  const g = e.target instanceof Element ? e.target.closest<SVGGElement>(".plan[data-id]") : null;
  if (!g) return;
  const p = planById(g.dataset["id"]!)!;
  if (state.owned.has(p.id)) state.owned.delete(p.id);
  else {
    // Ladders are radio, not checkbox: nobody pays for Pro and Max at the same time.
    if (p.ladder)
      PLANS.filter((q) => q.ladder === p.ladder).forEach((q) => {
        state.owned.delete(q.id);
      });
    state.owned.add(p.id);
  }
  selected = { kind: "plan", id: p.id };
  persist();
  redraw();
});

grid.addEventListener("click", (e) => {
  const g = e.target instanceof Element ? e.target.closest<SVGGElement>(".node[data-id]") : null;
  if (!g) return;
  selected =
    selected && selected.id === g.dataset["id"] ? null : { kind: "surface", id: g.dataset["id"]! };
  drawer();
  drawGrid();
});

$("#mode")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (!b) return;
  state.mode = b.dataset["mode"]!;
  $$("#mode button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  persist();
  redraw();
});

const budget = $<HTMLInputElement>("#budget")!;
budget.addEventListener("input", () => {
  state.budget = +budget.value;
  $("#budgetval")!.textContent = state.budget >= 220 ? "any" : "$" + state.budget + "/mo";
  persist();
  drawMarket();
});

/* Presets. A page about what to buy that requires you to already know what to buy has
   failed at its one job — and an empty grid of greyed boxes is the exact fault I set out
   to fix. Each one is a real, defensible starting stack, not a recommendation. */
const PRESETS = [
  {
    label: "everything free",
    buy: PLANS.filter((p) => p.price === 0 && p.pay === "free" && p.id !== "gh-admin").map(
      (p) => p.id,
    ),
    why: "Every plan that costs nothing and asks for no card. It opens more distinct tools than any $20 stack on this page — because what $20 actually buys is usage, not access. Expect to hit a wall by mid-morning.",
  },
  {
    label: "widest $20",
    buy: ["gh-pro", "chatgpt-go"],
    why: "$18 for two wallets. Copilot Pro is the only $10 subscription reaching four vendors' frontier models; ChatGPT Go adds OpenAI's own ladder. Fewer boxes lit than the free stack, but you can actually work all day.",
  },
  {
    label: "one vendor, all in",
    buy: ["claude-pro"],
    why: "The common solo answer — pick one vendor you like and buy their $20 tier.",
  },
  {
    label: "my company pays",
    buy: ["gh-business", "gh-admin"],
    why: "A Copilot Business seat with the agent policy actually switched on.",
  },
];
$("#presets")!.innerHTML = PRESETS.map(
  (x, i) => `<button data-preset="${i}" title="${esc(x.why)}">${esc(x.label)}</button>`,
).join("");
$("#presets")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (!b) return;
  const pre = PRESETS[+b.dataset["preset"]!]!;
  state.owned = new Set(pre.buy);
  selected = null;
  persist();
  redraw();
  $("#drawer")!.innerHTML = `<h3>${esc(pre.label)}</h3><div class="dr-sub">${esc(pre.why)}</div>`;
});

$("#clear")!.addEventListener("click", () => {
  state.owned.clear();
  selected = null;
  persist();
  redraw();
});

/* ═══ INIT ═══════════════════════════════════════════════════════════════ */
$$("#mode button").forEach((b) =>
  b.setAttribute("aria-pressed", String(b.dataset["mode"] === state.mode)),
);
budget.value = String(state.budget);
$("#budgetval")!.textContent = state.budget >= 220 ? "any" : "$" + state.budget + "/mo";
redraw();
