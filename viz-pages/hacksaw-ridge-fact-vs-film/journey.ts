// ===== The journey: synchronized map + dual-lane timeline =====
import { geoEquirectangular, geoPath, geoInterpolate } from "https://esm.sh/d3-geo@3";
import { esc } from "@viz/kit";

// dx/dy = label offset from the dot (in BASE coords — scaled up by the camera zoom, so
// the tight US cluster fans out once we're zoomed in). US labels sit LEFT of their dots,
// Pacific labels to the RIGHT, each with a leader line.
type LocId = "dc" | "lynchburg" | "fortjackson" | "piedmont" | "okinawa" | "guam" | "leyte";
type Verdict = "true" | "dram" | "inv" | "cut";
type Life = {
  when: string;
  y: number;
  loc: LocId;
  v: Verdict;
  title: string;
  real: string;
  film: string | null;
  fy?: number;
};

const LOC: Record<
  LocId,
  { name: string; c: [number, number]; dx: number; dy: number; anc: "start" | "end" }
> = {
  dc: { name: "Washington, D.C.", c: [-77.04, 38.9], dx: -7, dy: -15, anc: "end" },
  lynchburg: { name: "Lynchburg, VA", c: [-79.14, 37.41], dx: -7, dy: -6, anc: "end" },
  fortjackson: { name: "Fort Jackson, SC", c: [-80.94, 34.0], dx: -7, dy: 3, anc: "end" },
  piedmont: { name: "Piedmont, AL", c: [-85.61, 33.93], dx: -7, dy: 12, anc: "end" },
  okinawa: { name: "Okinawa", c: [127.72, 26.16], dx: 6, dy: -2, anc: "start" },
  guam: { name: "Guam", c: [144.79, 13.44], dx: 6, dy: 3, anc: "start" },
  leyte: { name: "Leyte", c: [124.9, 10.8], dx: 6, dy: 10, anc: "start" },
};
const ROUTE: LocId[] = ["lynchburg", "fortjackson", "guam", "leyte", "okinawa", "dc", "piedmont"];

// v: true=film matches · dram=embellished · inv=invented · cut=omitted by film
const LIFE: Life[] = [
  {
    when: "Feb 1919",
    y: 1919.1,
    loc: "lynchburg",
    v: "true",
    title: "Born in Lynchburg, Virginia",
    real: "Born Feb 7, 1919 into a devout Seventh-day Adventist family.",
    film: "The film opens on his Virginia boyhood.",
  },
  {
    when: "c. 1930",
    y: 1930,
    loc: "lynchburg",
    v: "dram",
    title: "A childhood vow against killing",
    real: "A violent home and a framed Ten Commandments print of Cain slaying Abel fix his refusal to ever take a life.",
    film: "Dramatized as a brick fight with his brother and wrestling a pistol from his drunken father.",
  },
  {
    when: "c. 1941",
    y: 1941,
    loc: "lynchburg",
    v: "inv",
    title: "He meets Dorothy",
    real: "He meets Dorothy Schutte at church — she isn't a nurse yet.",
    film: "Invents a hospital meet-cute: he saves a man with a belt tourniquet and courts a nurse.",
  },
  {
    when: "Apr 1942",
    y: 1942.25,
    loc: "lynchburg",
    v: "true",
    title: "Enlists as an unarmed medic",
    real: "Enlists Apr 1, 1942 as a 1-A-O noncombatant; refuses to carry a weapon.",
    film: "Enlists to serve without killing, over his father's objections.",
  },
  {
    when: "Aug 1942",
    y: 1942.63,
    loc: "lynchburg",
    v: "inv",
    title: "Marries Dorothy",
    real: "Marries Dorothy on Aug 17, 1942 — BEFORE his combat training and deployment.",
    film: "Moves the wedding much later and nearly has him miss it while jailed.",
    fy: 1944.0,
  },
  {
    when: "1942–44",
    y: 1943,
    loc: "fortjackson",
    v: "dram",
    title: "Training & refusing the rifle",
    real: "At Fort Jackson he's harassed for refusing weapons and keeping the Sabbath — but there's no record of a night beating.",
    film: "Adds a savage barracks beating and collective punishment of his unit.",
  },
  {
    when: "1944 (film)",
    y: 1944,
    loc: "fortjackson",
    v: "inv",
    title: "The court-martial",
    real: "He was never actually court-martialed; a church official quietly defused a threatened discharge.",
    film: "Stages a full court-martial dissolved by his father arriving with a general's letter.",
    fy: 1944.25,
  },
  {
    when: "Jul 1944",
    y: 1944.5,
    loc: "guam",
    v: "cut",
    title: "Guam — first Bronze Star",
    real: "Earns a Bronze Star for valor treating the wounded under fire on Guam.",
    film: null,
  },
  {
    when: "Oct 1944",
    y: 1944.9,
    loc: "leyte",
    v: "cut",
    title: "Leyte — second Bronze Star",
    real: "A second Bronze Star on Leyte — and he catches the tuberculosis that will later cost him a lung.",
    film: null,
  },
  {
    when: "5 May 1945",
    y: 1945.34,
    loc: "okinawa",
    v: "true",
    title: "Hacksaw Ridge",
    real: "Lowers ~75 wounded men down the Maeda Escarpment, praying 'Lord, help me get one more.'",
    film: "The film's centerpiece — and its most faithful stretch.",
  },
  {
    when: "21 May 1945",
    y: 1945.39,
    loc: "okinawa",
    v: "dram",
    title: "Wounded four times",
    real: "A grenade shreds his legs; hours later a sniper shatters his arm. He splints it with a rifle stock and crawls 300 yards.",
    film: "Compresses it into a single triumphant stretcher descent, weeks earlier.",
    fy: 1945.34,
  },
  {
    when: "12 Oct 1945",
    y: 1945.78,
    loc: "dc",
    v: "true",
    title: "Medal of Honor",
    real: "President Truman awards the Medal of Honor — the first ever to a conscientious objector.",
    film: "Shown with real archival footage in the closing coda.",
  },
  {
    when: "1946–51",
    y: 1948,
    loc: "piedmont",
    v: "cut",
    title: "Years lost to tuberculosis",
    real: "TB costs him a lung and five ribs; ~5½ years hospitalized, rated 90% disabled.",
    film: null,
  },
  {
    when: "1976",
    y: 1976,
    loc: "piedmont",
    v: "cut",
    title: "He goes deaf",
    real: "Treatment drugs leave him completely deaf (a cochlear implant restores some hearing in 1988).",
    film: null,
  },
  {
    when: "23 Mar 2006",
    y: 2006.22,
    loc: "piedmont",
    v: "cut",
    title: "Dies at 87",
    real: "Desmond Doss dies March 23, 2006 in Piedmont, Alabama; buried at Chattanooga National Cemetery.",
    film: null,
  },
];
const VLAB: Record<Verdict, string> = {
  true: "Film matches",
  dram: "Dramatized",
  inv: "Invented",
  cut: "Left out",
};

const NS = "http://www.w3.org/2000/svg";
const el = (n: string, a: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  return e;
};

// ---- piecewise date → fraction (war years 1942–45 expanded) ----
function dateFrac(y: number): number {
  const seg: [number, number][] = [
    [1919, 0.02],
    [1941, 0.15],
    [1946, 0.84],
    [2006, 0.98],
  ];
  for (let k = 0; k < seg.length - 1; k++) {
    const [a, fa] = seg[k]!,
      [b, fb] = seg[k + 1]!;
    if (y <= b || k === seg.length - 2) {
      const t = Math.max(0, Math.min(1, (y - a) / (b - a)));
      return fa + (fb - fa) * t;
    }
  }
  return 0; // unreachable: the last segment always returns
}

let idx = 0,
  playing: ReturnType<typeof setInterval> | null = null;
const jmap = document.querySelector("#jmap")!;
const jtl = document.querySelector("#jtl")!;
const jcap = document.querySelector("#jcap")!;
const jrange = document.querySelector<HTMLInputElement>("#jrange")!;

// ================= MAP (with a panning "camera") =================
const MW = 960,
  MH = 360,
  K = 2.4,
  CX = MW / 2,
  CY = MH * 0.46; // K = zoom; the active loc parks at (CX,CY)
const proj = geoEquirectangular().rotate([-180, 0]);
const ptsFC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: ROUTE.map((id) => ({
    type: "Feature",
    properties: null,
    geometry: { type: "Point", coordinates: LOC[id].c },
  })),
};
proj.fitExtent(
  [
    [128, 34],
    [MW - 150, MH - 46],
  ],
  ptsFC,
);
const path = geoPath(proj);

let arcPaths: SVGElement[] = []; // bright route segments (one per ROUTE hop)
const dotEls: Partial<Record<LocId, SVGElement>> = {};
let pulse: SVGElement, cam: SVGElement;

const isLand = (v: unknown): v is GeoJSON.FeatureCollection =>
  typeof v === "object" &&
  v !== null &&
  "type" in v &&
  v.type === "FeatureCollection" &&
  "features" in v &&
  Array.isArray(v.features);
function drawMap() {
  let land: GeoJSON.FeatureCollection | null = null;
  try {
    const parsed: unknown = JSON.parse(document.querySelector("#land-data")!.textContent);
    if (isLand(parsed)) land = parsed;
  } catch {
    land = null;
  }
  jmap.innerHTML = "";
  cam = el("g", { id: "jcam" }); // everything geographic lives here so it pans/zooms as one
  if (land) {
    for (const f of land.features) {
      const d = path(f);
      if (d) cam.append(el("path", { d, class: "land" }));
    }
  }
  // route: faint base + bright (toggled) per hop
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const a = LOC[ROUTE[i]!].c,
      b = LOC[ROUTE[i + 1]!].c,
      ip = geoInterpolate(a, b);
    const coords = [];
    for (let t = 0; t <= 1.0001; t += 0.04) coords.push(ip(t));
    const d = path({ type: "LineString", coordinates: coords })!;
    cam.append(el("path", { d, class: "jroute" }));
    const bright = el("path", { d, class: "jroute" });
    cam.append(bright);
    arcPaths.push(bright);
  }
  // dots + labels + leaders (leader first, so the dot sits on top). Offsets are BASE units,
  // scaled up by the camera zoom — so the tight US cluster fans apart once we're zoomed in.
  for (const id of ROUTE) {
    const [x, y] = proj(LOC[id].c)!,
      L = LOC[id];
    const lx = x + L.dx,
      ly = y + L.dy;
    cam.append(
      el("line", {
        x1: x,
        y1: y,
        x2: lx + (L.anc === "end" ? 2 : -2),
        y2: ly - 2,
        class: "jleader",
      }),
    );
    const t = el("text", { x: lx, y: ly, class: "jlabel", "text-anchor": L.anc });
    t.textContent = L.name;
    cam.append(t);
    const dot = el("circle", { cx: x, cy: y, r: 2.7, class: "jdot", "data-loc": id });
    dot.addEventListener("click", () => select(LIFE.findIndex((e) => e.loc === id)));
    cam.append(dot);
    dotEls[id] = dot;
  }
  jmap.append(cam);
  // overlay: the pulse sits at screen centre — the camera always parks the active loc there
  const ov = el("g");
  pulse = el("circle", { class: "jpulse", cx: CX, cy: CY, r: 9 });
  ov.append(pulse);
  jmap.append(ov);
}

// ================= TIMELINE =================
const TW = 960,
  ML = 86,
  MR = 26,
  RY = 58,
  FY = 132;
function plotX(y: number) {
  return ML + dateFrac(y) * (TW - ML - MR);
}
let tlDots: { rd: SVGElement; fd: SVGElement; e: Life }[] = [],
  activeRing: SVGElement;

function drawTimeline() {
  jtl.innerHTML = "";
  // lane labels + rails
  for (const [lab, ly, col] of [
    ["REALITY", RY, "var(--accent)"],
    ["THE FILM", FY, "var(--film)"],
  ] as const) {
    jtl.append(el("line", { x1: ML, y1: ly, x2: TW - MR, y2: ly, class: "tl-lane" }));
    const t = el("text", { x: 12, y: ly + 4, class: "tl-lanelab", fill: col });
    t.textContent = lab;
    jtl.append(t);
  }
  // axis ticks
  const TICKS: Record<string, string> = {
    1919: "1919",
    1942: "’42",
    1943: "’43",
    1944: "’44",
    1945: "’45",
    1976: "1976",
    2006: "2006",
  };
  for (const yr in TICKS) {
    const x = plotX(+yr);
    jtl.append(el("line", { x1: x, y1: RY - 14, x2: x, y2: FY + 14, class: "tl-grid" }));
    const t = el("text", { x, y: FY + 30, class: "tl-axis", "text-anchor": "middle" });
    t.textContent = TICKS[yr]!;
    jtl.append(t);
  }
  const note = el("text", {
    x: TW - MR,
    y: 14,
    class: "tl-axis",
    "text-anchor": "end",
    "font-size": 9,
    opacity: 0.7,
  });
  note.textContent = "1942–45 stretched · connectors = film moved the date";
  jtl.append(note);

  activeRing = el("circle", { class: "tl-active-ring", r: 9, cx: -99, cy: -99 }); // placeholder, appended last

  LIFE.forEach((e, i) => {
    const rx = plotX(e.y);
    // connector when the film relocates the event in time
    if (e.film && e.fy !== undefined && Math.abs(e.fy - e.y) > 0.05) {
      jtl.append(el("line", { x1: rx, y1: RY, x2: plotX(e.fy), y2: FY, class: "tl-conn" }));
    }
    // reality dot
    const rd = el("circle", { cx: rx, cy: RY, r: 6, class: "tl-dot", "data-v": e.v, "data-i": i });
    rd.addEventListener("click", () => select(i));
    jtl.append(rd);
    // film side: dot if present, else a hollow "omitted" ring on the film lane
    let fd;
    if (e.film) {
      fd = el("circle", {
        cx: plotX(e.fy ?? e.y),
        cy: FY,
        r: 6,
        class: "tl-dot",
        "data-v": e.v,
        "data-i": i,
      });
    } else {
      fd = el("circle", { cx: rx, cy: FY, r: 5, class: "tl-cut", "data-i": i });
    }
    fd.addEventListener("click", () => select(i));
    jtl.append(fd);
    tlDots.push({ rd, fd, e });
  });
  jtl.append(activeRing);
}

// ================= SELECT / SYNC =================
function select(i: number) {
  if (i < 0 || i >= LIFE.length) return;
  idx = i;
  const e = LIFE[i]!;
  // map: reveal route up to furthest ROUTE index reached so far; pulse active loc
  const reached = Math.max(...LIFE.slice(0, i + 1).map((x) => ROUTE.indexOf(x.loc)));
  arcPaths.forEach((p, k) => {
    p.classList.toggle("on", k < reached);
  });
  for (const id of ROUTE) {
    const ri = ROUTE.indexOf(id);
    const dot = dotEls[id]!;
    dot.classList.toggle("visited", ri <= reached);
    dot.classList.toggle("active", id === e.loc);
    dot.setAttribute("r", id === e.loc ? "4" : "2.7");
  }
  // camera: park the active location at screen centre; the CSS transition animates the fly-to
  const [fx, fy] = proj(LOC[e.loc].c)!;
  cam.setAttribute("transform", `translate(${CX - fx * K},${CY - fy * K}) scale(${K})`);
  // timeline highlight
  tlDots.forEach((d, k) => {
    const on = k === i;
    d.rd.classList.toggle("active", on);
    d.rd.setAttribute("r", on ? "7.5" : "6");
    if (d.fd.classList.contains("tl-dot")) {
      d.fd.classList.toggle("active", on);
      d.fd.setAttribute("r", on ? "7.5" : "6");
    }
  });
  const ax = plotX(e.y);
  activeRing.setAttribute("cx", String(ax));
  activeRing.setAttribute("cy", String(RY));
  activeRing.setAttribute("opacity", "1");
  // caption
  const filmHtml = e.film
    ? `<div class="jc film"><h5>On screen</h5><p>${esc(e.film)}</p></div>`
    : `<div class="jc none">Not in the film.</div>`;
  jcap.innerHTML = `
    <div class="jcap-head"><span class="jwhen">${esc(e.when)}</span><span class="jtitle">${esc(e.title)}</span>
      <span class="verdict" data-v="${e.v}">${VLAB[e.v]}</span></div>
    <div class="jcap-split ${e.film ? "" : "single"}">
      ${filmHtml}
      <div class="jc real"><h5>Reality</h5><p>${esc(e.real)}</p></div>
    </div>`;
  jrange.value = String(i);
  document.querySelector("#jcount")!.textContent = `${i + 1} / ${LIFE.length}`;
}

// ---- controls ----
function step(d: number) {
  select(Math.max(0, Math.min(LIFE.length - 1, idx + d)));
}
document.querySelector(".jctrl")!.addEventListener("click", (ev) => {
  const b = ev.target instanceof Element ? ev.target.closest("button") : null;
  if (!b) return;
  if (b.dataset["j"] === "prev") {
    stop();
    step(-1);
  } else if (b.dataset["j"] === "next") {
    stop();
    step(1);
  } else if (b.dataset["j"] === "play") togglePlay();
});
jrange.addEventListener("input", () => {
  stop();
  select(+jrange.value);
});
function togglePlay() {
  if (playing) stop();
  else play();
}
function play() {
  const btn = document.querySelector("#jplay")!;
  btn.textContent = "❚❚ Pause";
  if (idx >= LIFE.length - 1) select(0);
  playing = setInterval(() => {
    if (idx >= LIFE.length - 1) {
      stop();
      return;
    }
    step(1);
  }, 1900);
}
function stop() {
  if (playing) {
    clearInterval(playing);
    playing = null;
  }
  document.querySelector("#jplay")!.textContent = "▶ Play";
}

jrange.max = String(LIFE.length - 1);
drawMap();
drawTimeline();
select(0);
